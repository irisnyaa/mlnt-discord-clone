import { notFound } from "next/navigation";
import { ChatClient } from "@/components/ChatClient";
import { Sidebar } from "@/components/Sidebar";
import { requireUser } from "@/lib/auth";
import { getChat, listChats, listMessages } from "@/lib/db";
import { renderMessageHtml } from "@/lib/emotes";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [chats, chat, messages] = [listChats(), getChat(id), listMessages(id)];
  if (!chat) notFound();

  return (
    <div className="app">
      <Sidebar chats={chats} activeId={id} />
      <main className="main">
        <header className="topbar">
          <a className="mobile-chat-toggle" href="#chat-list">☰</a>
          <span className="hash">#</span>
          <div>
            <div className="top-title">{chat.title}</div>
            <div className="top-sub">{chat.creatorName || "friend"}</div>
          </div>
        </header>
        <ChatClient
          chatId={id}
          title={chat.title}
          messages={messages.map(message => ({ ...message, html: renderMessageHtml(message.content) }))}
          currentUser={{ name: user.name, image: user.image }}
        />
      </main>
    </div>
  );
}
