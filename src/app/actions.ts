import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { addMessage, createChat, getChat, listMessages } from "@/lib/db";
import { generateReply } from "@/lib/llm";

const chatSchema = z.object({ title: z.string().trim().min(1).max(80) });
const messageSchema = z.object({ chatId: z.string().min(1), content: z.string().trim().min(1).max(4000) });

export async function createChatAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const parsed = chatSchema.parse({ title: formData.get("title") });
  const id = randomUUID();
  createChat({ id, title: parsed.title, creatorId: user.id });
  redirect(`/chats/${id}`);
}

export async function sendMessageAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const parsed = messageSchema.parse({ chatId: formData.get("chatId"), content: formData.get("content") });
  const chat = getChat(parsed.chatId);
  if (!chat) throw new Error("chat not found");

  const before = listMessages(parsed.chatId);
  addMessage({ id: randomUUID(), chatId: parsed.chatId, authorId: user.id, role: "user", content: parsed.content });

  try {
    const reply = await generateReply(before, parsed.content);
    addMessage({ id: randomUUID(), chatId: parsed.chatId, role: "assistant", content: reply });
  } catch {
    addMessage({ id: randomUUID(), chatId: parsed.chatId, role: "assistant", content: "brb" });
  }

  revalidatePath(`/chats/${parsed.chatId}`);
}
