import { EmoteImportClient } from "@/components/EmoteImportClient";
import { Sidebar } from "@/components/Sidebar";
import { requireUser } from "@/lib/auth";
import { listChats } from "@/lib/db";

export default async function EmotesPage() {
  await requireUser();
  const chats = listChats();
  return (
    <div className="app">
      <Sidebar chats={chats} />
      <main className="main">
        <header className="topbar">
          <a className="mobile-chat-toggle" href="#chat-list">☰</a>
          <span className="hash">#</span>
          <div>
            <div className="top-title">emotes</div>
            <div className="top-sub">import packs</div>
          </div>
        </header>
        <section className="messages import-page">
          <EmoteImportClient />
        </section>
      </main>
    </div>
  );
}
