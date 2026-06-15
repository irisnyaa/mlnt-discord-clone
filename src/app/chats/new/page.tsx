import { startChatAction } from "@/app/actions";
import { Composer } from "@/components/Composer";
import { Sidebar } from "@/components/Sidebar";
import { requireUser } from "@/lib/auth";
import { listChats } from "@/lib/db";

export default async function NewChatPage() {
  await requireUser();
  const chats = listChats();
  return (
    <div className="app">
      <Sidebar chats={chats} />
      <main className="main">
        <header className="topbar">
          <span className="hash">#</span>
          <div>
            <div className="top-title">new chat</div>
            <div className="top-sub">start typing</div>
          </div>
        </header>
        <section className="messages">
          <div className="empty">send a message to start</div>
        </section>
        <Composer placeholder="Message #new-chat" action={startChatAction} />
      </main>
    </div>
  );
}
