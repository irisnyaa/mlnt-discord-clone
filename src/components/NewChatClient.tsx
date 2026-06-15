"use client";

import { useOptimistic } from "react";
import { Composer } from "@/components/Composer";
import { MessageList, type ClientUser } from "@/components/ChatClient";

type NewChatClientProps = {
  currentUser: ClientUser;
  action: (formData: FormData) => void | Promise<void>;
};

type OptimisticMessage = {
  id: string;
  authorName: string;
  authorImage: string | null;
  role: "user";
  content: string;
  createdAt: string;
};

export function NewChatClient({ currentUser, action }: NewChatClientProps) {
  const [messages, addOptimistic] = useOptimistic<OptimisticMessage[], string>([], (_state, content) => [
    {
      id: `pending-${Date.now()}`,
      authorName: currentUser.name,
      authorImage: currentUser.image,
      role: "user" as const,
      content,
      createdAt: new Date().toISOString(),
    },
  ]);

  return (
    <>
      {messages.length ? <MessageList messages={messages} /> : <section className="messages"><div className="empty">send a message to start</div></section>}
      <Composer
        placeholder="Message #new-chat"
        action={action}
        disabledAfterSubmit
        onOptimistic={addOptimistic}
      />
    </>
  );
}
