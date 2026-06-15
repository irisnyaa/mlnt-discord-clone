import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function SignIn() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/");
  return (
    <main className="signin">
      <section className="signin-card">
        <h1>mlnt chat</h1>
        <p>sign in to continue</p>
        <a className="btn" href="/api/auth/signin/discord">Continue with Discord</a>
      </section>
    </main>
  );
}
