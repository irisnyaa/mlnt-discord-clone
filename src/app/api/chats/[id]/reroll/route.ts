import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getChat, listMessages, updateMessageContent } from "@/lib/db";
import { streamReply } from "@/lib/llm";

const encoder = new TextEncoder();
const line = (obj: unknown) => encoder.encode(`${JSON.stringify(obj)}\n`);

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("unauthorized", { status: 401 });

  const { id: chatId } = await params;
  if (!getChat(chatId)) return new Response("not found", { status: 404 });

  const messages = listMessages(chatId);
  let assistantIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      assistantIndex = i;
      break;
    }
  }
  if (assistantIndex < 0) return new Response("no assistant message to reroll", { status: 400 });

  let userIndex = -1;
  for (let i = assistantIndex - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      userIndex = i;
      break;
    }
  }
  if (userIndex < 0) return new Response("no user message to reroll from", { status: 400 });

  const assistant = messages[assistantIndex];
  const user = messages[userIndex];
  const context = messages.slice(0, userIndex);
  updateMessageContent(assistant.id, "");

  const stream = new ReadableStream({
    async start(controller) {
      let reply = "";
      let lastDbWrite = 0;
      controller.enqueue(line({ type: "ack", assistantMessageId: assistant.id }));
      try {
        for await (const chunk of streamReply(context, user.content)) {
          reply += chunk;
          controller.enqueue(line({ type: "replace", assistantMessageId: assistant.id, content: reply }));
          const now = Date.now();
          if (now - lastDbWrite > 250) {
            updateMessageContent(assistant.id, reply);
            lastDbWrite = now;
          }
        }
        reply = reply.trim() || "...";
      } catch {
        reply = "brb";
        controller.enqueue(line({ type: "replace", assistantMessageId: assistant.id, content: reply }));
      }
      updateMessageContent(assistant.id, reply);
      controller.enqueue(line({ type: "done", assistantMessageId: assistant.id }));
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
