"use client";

import { useOptimistic } from "react";
import { Composer } from "@/components/Composer";
import { renderMessageHtmlClient } from "@/lib/emotes-client";

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
  action: (formData: FormData) => void | Promise<void>;
};

function messageOnlyEmotes(content: string) {
  const stripped = content.replace(/(<a?:[A-Za-z0-9_]{2,32}:\d{5,}>|:[A-Za-z0-9_-]+\/[A-Za-z0-9_]{2,32}:|:[A-Za-z0-9_]{2,32}:|\s+)/g, "");
  return stripped.length === 0;
}

function Avatar({ src, name, bot }: { src?: string | null; name?: string | null; bot?: boolean }) {
  if (bot) return <img className="avatar" src="/bot-avatar.png" alt="" />;
  if (src) return <img className="avatar" src={src} alt="" />;
  return <div className="avatar">{(name || "?").slice(0, 1).toUpperCase()}</div>;
}

export function ChatClient({ chatId, title, messages, action }: ChatClientProps) {
  const [optimisticMessages, addOptimistic] = useOptimistic(messages, (state, content: string) => [
    ...state,
    {
      id: `pending-${Date.now()}`,
      authorName: "you",
      authorImage: null,
      role: "user" as const,
      content,
      createdAt: new Date().toISOString(),
    },
  ]);

  return (
    <>
      <section className="messages">
        {optimisticMessages.map(message => {
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
                <div className="bubble" dangerouslySetInnerHTML={{ __html: message.html ?? renderMessageHtmlClient(message.content) }} />
              </div>
            </article>
          );
        })}
      </section>
      <Composer
        chatId={chatId}
        placeholder={`Message #${title}`}
        action={async formData => {
          addOptimistic(String(formData.get("content") ?? ""));
          await action(formData);
        }}
      />
    </>
  );
}
