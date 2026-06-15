"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Composer } from "@/components/Composer";
import { MessageList, readNdjson, type ClientUser } from "@/components/ChatClient";

type Message = {
  id: string;
  authorName: string | null;
  authorImage: string | null;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type NewChatClientProps = { currentUser: ClientUser };

export function NewChatClient({ currentUser }: NewChatClientProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);

  async function start(content: string) {
    const botId = `pending-bot-${Date.now()}`;
    setMessages([
      {
        id: `pending-user-${Date.now()}`,
        authorName: currentUser.name,
        authorImage: currentUser.image,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      },
      { id: botId, authorName: null, authorImage: null, role: "assistant", content: "", createdAt: new Date().toISOString() },
    ]);

    const res = await fetch("/api/chats/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      setMessages(state => state.map(m => m.id === botId ? { ...m, content: "brb" } : m));
      return;
    }

    let chatId = "";
    await readNdjson(res, event => {
      if (event.type === "chat") chatId = event.chatId;
      if (event.type === "delta") setMessages(state => state.map(m => m.id === botId ? { ...m, content: m.content + event.content } : m));
      if (event.type === "done") chatId = event.chatId || chatId;
    });
    if (chatId) router.replace(`/chats/${chatId}`);
  }

  return (
    <>
      {messages.length ? <MessageList messages={messages} /> : <section className="messages"><div className="empty">send a message to start</div></section>}
      <Composer placeholder="Message #new-chat" disabledAfterSubmit onSubmitContent={start} />
    </>
  );
}
