import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { addMessage, createChat, deleteChat, getChat, listMessages, updateChatTitle } from "@/lib/db";
import { generateReply, generateTitle } from "@/lib/llm";

const messageSchema = z.object({ chatId: z.string().min(1), content: z.string().trim().min(1).max(4000) });
const firstMessageSchema = z.object({ content: z.string().trim().min(1).max(4000) });
const deleteSchema = z.object({ chatId: z.string().min(1) });

export async function newChatAction() {
  "use server";
  redirect("/chats/new");
}

export async function startChatAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const parsed = firstMessageSchema.parse({ content: formData.get("content") });
  const chatId = randomUUID();
  createChat({ id: chatId, title: "new chat", creatorId: user.id });
  addMessage({ id: randomUUID(), chatId, authorId: user.id, role: "user", content: parsed.content });

  let reply = "brb";
  try {
    reply = await generateReply([], parsed.content);
  } catch {}
  addMessage({ id: randomUUID(), chatId, role: "assistant", content: reply });

  try {
    updateChatTitle(chatId, await generateTitle(parsed.content, reply));
  } catch {}

  redirect(`/chats/${chatId}`);
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

export async function deleteChatAction(formData: FormData) {
  "use server";
  await requireUser();
  const parsed = deleteSchema.parse({ chatId: formData.get("chatId") });
  deleteChat(parsed.chatId);
  revalidatePath("/");
  redirect("/");
}
