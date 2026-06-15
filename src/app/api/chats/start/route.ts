import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { addMessage, createChat, updateChatTitle, upsertUser } from "@/lib/db";
import { generateTitle, streamReply } from "@/lib/llm";

const encoder = new TextEncoder();
const line = (obj: unknown) => encoder.encode(`${JSON.stringify(obj)}\n`);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) return new Response("unauthorized", { status: 401 });
  upsertUser({ id: user.id, name: user.name, image: user.image });

  const { content } = await req.json();
  const text = String(content ?? "").trim();
  if (!text) return new Response("empty", { status: 400 });

  const chatId = randomUUID();
  createChat({ id: chatId, title: "new chat", creatorId: user.id });
  addMessage({ id: randomUUID(), chatId, authorId: user.id, role: "user", content: text });

  const stream = new ReadableStream({
    async start(controller) {
      let reply = "";
      controller.enqueue(line({ type: "chat", chatId }));
      try {
        for await (const chunk of streamReply([], text)) {
          reply += chunk;
          controller.enqueue(line({ type: "delta", content: chunk }));
        }
        reply = reply.trim() || "...";
      } catch {
        reply = "brb";
        controller.enqueue(line({ type: "delta", content: reply }));
      }
      addMessage({ id: randomUUID(), chatId, role: "assistant", content: reply });

      let title = "new chat";
      try {
        title = await generateTitle(text, reply);
        updateChatTitle(chatId, title);
      } catch {}

      controller.enqueue(line({ type: "done", chatId, title }));
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
