import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/matches", label: "Matches" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/heatmap", label: "Heatmap" },
  { href: "/stats", label: "Stats" },
  { href: "/profile", label: "Profile" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-indigo-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
            <span className="text-2xl">🥇</span>
            <span>The API Cup</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-purple-200">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-amber-300">
                {item.label}
              </Link>
            ))}
            {session.user.role === "admin" && (
              <Link href="/admin" className="text-amber-300 hover:text-amber-200">
                Admin
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-purple-300 sm:inline">
              {session.user.name}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="rounded-lg border border-white/20 px-3 py-1 text-purple-200 transition hover:border-amber-300 hover:text-amber-300">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
