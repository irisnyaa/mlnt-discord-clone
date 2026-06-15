import Link from "next/link";
import { deleteChatAction, newChatAction } from "@/app/actions";
import type { ChatRow } from "@/lib/db";

function Initial({ name }: { name?: string | null }) {
  return <div className="avatar">{(name || "?").slice(0, 1).toUpperCase()}</div>;
}

export function Sidebar({ chats, activeId }: { chats: ChatRow[]; activeId?: string }) {
  return (
    <aside className="sidebar" id="chat-list">
      <div className="brand">
        <span>mlnt</span>
        <small>chat</small>
        <a className="mobile-close" href="#">×</a>
      </div>
      <nav className="chat-list">
        {chats.map(chat => (
          <div key={chat.id} className={`chat-row ${activeId === chat.id ? "active" : ""}`}>
            <Link href={`/chats/${chat.id}`} className="chat-link">
              {chat.creatorImage ? <img className="avatar" src={chat.creatorImage} alt="" /> : <Initial name={chat.creatorName} />}
              <div className="chat-meta">
                <div className="chat-title">{chat.title}</div>
                <div className="chat-by">{chat.creatorName || "friend"}</div>
              </div>
            </Link>
            <form action={deleteChatAction}>
              <input type="hidden" name="chatId" value={chat.id} />
              <button className="delete-chat" title="delete chat" type="submit">×</button>
            </form>
          </div>
        ))}
      </nav>
      <form className="new-chat" action={newChatAction}>
        <button className="btn full" type="submit">New chat</button>
      </form>
    </aside>
  );
}
