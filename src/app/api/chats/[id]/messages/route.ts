import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { addMessage, getChat, listMessages, updateMessageContent, upsertUser } from "@/lib/db";
import { streamReply } from "@/lib/llm";

const encoder = new TextEncoder();
const line = (obj: unknown) => encoder.encode(`${JSON.stringify(obj)}\n`);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("unauthorized", { status: 401 });
  const { id } = await params;
  if (!getChat(id)) return new Response("not found", { status: 404 });
  return NextResponse.json({ messages: listMessages(id) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) return new Response("unauthorized", { status: 401 });
  upsertUser({ id: user.id, name: user.name, image: user.image });

  const { id: chatId } = await params;
  const chat = getChat(chatId);
  if (!chat) return new Response("not found", { status: 404 });

  const { content } = await req.json();
  const text = String(content ?? "").trim();
  if (!text) return new Response("empty", { status: 400 });

  const before = listMessages(chatId);
  const userMessageId = randomUUID();
  const assistantMessageId = randomUUID();
  addMessage({ id: userMessageId, chatId, authorId: user.id, role: "user", content: text });
  addMessage({ id: assistantMessageId, chatId, role: "assistant", content: "" });

  const stream = new ReadableStream({
    async start(controller) {
      let reply = "";
      let lastDbWrite = 0;
      controller.enqueue(line({ type: "ack", userMessageId, assistantMessageId }));
      try {
        for await (const chunk of streamReply(before, text)) {
          reply += chunk;
          controller.enqueue(line({ type: "delta", assistantMessageId, content: chunk }));
          const now = Date.now();
          if (now - lastDbWrite > 250) {
            updateMessageContent(assistantMessageId, reply);
            lastDbWrite = now;
          }
        }
        reply = reply.trim() || "...";
      } catch {
        reply = "brb";
        controller.enqueue(line({ type: "delta", assistantMessageId, content: reply }));
      }
      updateMessageContent(assistantMessageId, reply);
      controller.enqueue(line({ type: "done", userMessageId, assistantMessageId }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
