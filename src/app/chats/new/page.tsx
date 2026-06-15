import { startChatAction } from "@/app/actions";
import { NewChatClient } from "@/components/NewChatClient";
import { Sidebar } from "@/components/Sidebar";
import { requireUser } from "@/lib/auth";
import { listChats } from "@/lib/db";

export default async function NewChatPage() {
  const user = await requireUser();
  const chats = listChats();
  return (
    <div className="app">
      <Sidebar chats={chats} />
      <main className="main">
        <header className="topbar">
          <a className="mobile-chat-toggle" href="#chat-list">☰</a>
          <span className="hash">#</span>
          <div>
            <div className="top-title">new chat</div>
            <div className="top-sub">start typing</div>
          </div>
        </header>
        <NewChatClient currentUser={{ name: user.name, image: user.image }} action={startChatAction} />
      </main>
    </div>
  );
}
