import Link from "next/link";
import { createChatAction } from "@/app/actions";
import type { ChatRow } from "@/lib/db";

function Initial({ name }: { name?: string | null }) {
  return <div className="avatar">{(name || "?").slice(0, 1).toUpperCase()}</div>;
}

export function Sidebar({ chats, activeId }: { chats: ChatRow[]; activeId?: string }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span>mlnt</span>
        <small>chat</small>
      </div>
      <nav className="chat-list">
        {chats.map(chat => (
          <Link key={chat.id} href={`/chats/${chat.id}`} className={`chat-link ${activeId === chat.id ? "active" : ""}`}>
            {chat.creatorImage ? <img className="avatar" src={chat.creatorImage} alt="" /> : <Initial name={chat.creatorName} />}
            <div className="chat-meta">
              <div className="chat-title">{chat.title}</div>
              <div className="chat-by">{chat.creatorName || "friend"}</div>
            </div>
          </Link>
        ))}
      </nav>
      <form className="new-chat" action={createChatAction}>
        <input name="title" placeholder="new chat" maxLength={80} required />
        <button className="btn" type="submit">+</button>
      </form>
    </aside>
  );
}
