import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listChats } from "@/lib/db";
import { Sidebar } from "@/components/Sidebar";

export default async function Home() {
  await requireUser();
  const chats = listChats();
  if (chats[0]) redirect(`/chats/${chats[0].id}`);
  return (
    <div className="app">
      <Sidebar chats={chats} />
      <main className="main">
        <div className="empty">start a chat</div>
      </main>
    </div>
  );
}
