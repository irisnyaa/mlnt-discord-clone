import { notFound } from "next/navigation";
import { sendMessageAction } from "@/app/actions";
import { Sidebar } from "@/components/Sidebar";
import { requireUser } from "@/lib/auth";
import { getChat, listChats, listMessages } from "@/lib/db";
import { renderMessageHtml } from "@/lib/emotes";

function Avatar({ src, name, bot }: { src?: string | null; name?: string | null; bot?: boolean }) {
  if (src) return <img className="avatar" src={src} alt="" />;
  return <div className="avatar">{bot ? "m" : (name || "?").slice(0, 1).toUpperCase()}</div>;
}

function messageOnlyEmotes(content: string) {
  const stripped = content.replace(/(<a?:[A-Za-z0-9_]{2,32}:\d{5,}>|:[A-Za-z0-9_-]+\/[A-Za-z0-9_]{2,32}:|:[A-Za-z0-9_]{2,32}:|\s+)/g, "");
  return stripped.length === 0;
}

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const [chats, chat, messages] = [listChats(), getChat(id), listMessages(id)];
  if (!chat) notFound();

  return (
    <div className="app">
      <Sidebar chats={chats} activeId={id} />
      <main className="main">
        <header className="topbar">
          <span className="hash">#</span>
          <div>
            <div className="top-title">{chat.title}</div>
            <div className="top-sub">{chat.creatorName || "friend"}</div>
          </div>
        </header>
        <section className="messages">
          {messages.map(message => {
            const isBot = message.role === "assistant";
            const name = isBot ? "mlntcandy" : (message.authorName || "friend");
            return (
              <article key={message.id} className={`message ${messageOnlyEmotes(message.content) ? "only-emotes" : ""}`}>
                <Avatar src={message.authorImage} name={name} bot={isBot} />
                <div>
                  <div>
                    <span className="name">{name}</span>
                    <span className="time">{new Date(message.createdAt + "Z").toLocaleString()}</span>
                  </div>
                  <div className="bubble" dangerouslySetInnerHTML={{ __html: renderMessageHtml(message.content) }} />
                </div>
              </article>
            );
          })}
        </section>
        <form className="composer-wrap" action={sendMessageAction}>
          <input type="hidden" name="chatId" value={id} />
          <div className="composer">
            <textarea name="content" placeholder={`Message #${chat.title}`} required />
            <button className="btn" type="submit">Send</button>
          </div>
        </form>
      </main>
    </div>
  );
}
