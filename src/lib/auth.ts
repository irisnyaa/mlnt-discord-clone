import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { upsertUser } from "@/lib/db";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) redirect("/api/auth/signin");
  upsertUser({ id: user.id, name: user.name, image: user.image });
  return { id: user.id, name: user.name ?? "friend", image: user.image ?? null };
}
