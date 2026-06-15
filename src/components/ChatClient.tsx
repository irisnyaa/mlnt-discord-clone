"use client";

import { useEffect, useRef, useState } from "react";
import { Composer } from "@/components/Composer";
import { renderMessageHtmlClient, type ClientEmote } from "@/lib/emotes-client";

export type ClientUser = { name: string; image: string | null };

type Message = {
  id: string;
  authorName: string | null;
  authorImage: string | null;
  role: "user" | "assistant";
  content: string;
  html?: string;
  createdAt: string;
};

type ChatClientProps = {
  chatId: string;
  title: string;
  messages: Message[];
  currentUser: ClientUser;
  emotes: ClientEmote[];
};

async function readNdjson(res: Response, onEvent: (event: any) => void) {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const parseLine = (line: string) => {
    if (!line.trim()) return;
    onEvent(JSON.parse(line));
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) parseLine(line);
  }
  buffer += decoder.decode();
  if (buffer.trim()) parseLine(buffer);
}

function messageOnlyEmotes(content: string) {
  const stripped = content.replace(/(<a?:[A-Za-z0-9_]{2,32}:\d{5,}>|:[A-Za-z0-9_-]+\/[A-Za-z0-9_]{2,32}:|:[A-Za-z0-9_]{2,32}:|\s+)/g, "");
  return stripped.length === 0;
}

function Avatar({ src, name, bot }: { src?: string | null; name?: string | null; bot?: boolean }) {
  if (bot) return <img className="avatar" src="/bot-avatar.png" alt="" />;
  if (src) return <img className="avatar" src={src} alt="" />;
  return <div className="avatar">{(name || "?").slice(0, 1).toUpperCase()}</div>;
}

export function MessageList({ messages, emotes }: { messages: Message[]; emotes: ClientEmote[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <section className="messages">
      {messages.map(message => {
        const isBot = message.role === "assistant";
        const name = isBot ? "mlntcan🤖d" : (message.authorName || "friend");
        return (
          <article key={message.id} className={`message ${messageOnlyEmotes(message.content) ? "only-emotes" : ""}`}>
            <Avatar src={message.authorImage} name={name} bot={isBot} />
            <div>
              <div>
                <span className="name">{name}</span>
                <span className="time">{new Date(message.createdAt).toLocaleString()}</span>
              </div>
              <div className="bubble" dangerouslySetInnerHTML={{ __html: message.html ?? renderMessageHtmlClient(message.content || "…", emotes) }} />
            </div>
          </article>
        );
      })}
      <div ref={endRef} />
    </section>
  );
}

export function ChatClient({ chatId, title, messages: initialMessages, currentUser, emotes }: ChatClientProps) {
  const [messages, setMessages] = useState(initialMessages);

  async function syncMessages() {
    const res = await fetch(`/api/chats/${chatId}/messages`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.messages)) setMessages(data.messages);
  }

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (!cancelled) await syncMessages();
    };
    const interval = window.setInterval(tick, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [chatId]);

  async function send(content: string) {
    const stamp = Date.now();
    const pendingUserId = `pending-user-${stamp}`;
    const pendingBotId = `pending-bot-${stamp}`;
    const userMessage: Message = {
      id: pendingUserId,
      authorName: currentUser.name,
      authorImage: currentUser.image,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages(state => [...state, userMessage, { id: pendingBotId, authorName: null, authorImage: null, role: "assistant", content: "", createdAt: new Date().toISOString() }]);

    const res = await fetch(`/api/chats/${chatId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      setMessages(state => state.map(m => m.id === pendingBotId ? { ...m, content: "brb" } : m));
      return;
    }
    let assistantId = pendingBotId;
    await readNdjson(res, event => {
      if (event.type === "ack") {
        assistantId = event.assistantMessageId;
        setMessages(state => state.map(m => {
          if (m.id === pendingUserId) return { ...m, id: event.userMessageId };
          if (m.id === pendingBotId) return { ...m, id: event.assistantMessageId };
          return m;
        }));
      }
      if (event.type === "delta") {
        setMessages(state => state.map(m => m.id === assistantId ? { ...m, content: m.content + event.content } : m));
      }
    });
    await syncMessages();
  }

  return (
    <>
      <MessageList messages={messages} emotes={emotes} />
      <Composer placeholder={`Message #${title}`} onSubmitContent={send} />
    </>
  );
}

export { readNdjson };
