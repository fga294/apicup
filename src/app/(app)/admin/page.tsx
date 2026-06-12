import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { appSettings, matches, predictions, users } from "@/db/schema";
import { LocalKickoff } from "@/components/LocalKickoff";

import { ProviderForm, SyncNowButton } from "./AdminForms";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user.role !== "admin") redirect("/");

  const [providerRow, lastSyncRow, [counts]] = await Promise.all([
    db.query.appSettings.findFirst({ where: eq(appSettings.key, "match_provider") }),
    db.query.appSettings.findFirst({ where: eq(appSettings.key, "last_sync_at") }),
    db
      .select({
        users: sql<number>`(select count(*) from ${users})::int`,
        matches: sql<number>`(select count(*) from ${matches})::int`,
        finished: sql<number>`(select count(*) from ${matches} where status = 'FINISHED')::int`,
        predictions: sql<number>`(select count(*) from ${predictions})::int`,
      })
      .from(sql`(select 1) as one`),
  ]);

  const sections = [
    { href: "/admin/users", title: "Users & reset codes", desc: "Browse accounts, issue one-time password reset codes." },
    { href: "/admin/ai", title: "AI predictions", desc: "Enter MQ-Chat's picks before each cutoff." },
    { href: "/admin/matches", title: "Matches & results", desc: "Manual fixtures and result overrides (provider fallback)." },
  ];

  return (
    <div>
      <h1 className="font-display text-4xl uppercase tracking-wide">
        Admin <span className="text-gold-400">panel</span>
      </h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-2xl border border-chalk/10 bg-pitch-900/70 p-5 transition hover:border-gold-400/50"
          >
            <h2 className="font-bold text-gold-300">{s.title}</h2>
            <p className="mt-1 text-sm text-chalk-dim">{s.desc}</p>
          </Link>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-chalk/10 bg-pitch-900/70 p-5">
        <h2 className="font-display text-xl uppercase tracking-wide text-gold-300">
          Match data
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
          <div>
            <p className="text-xs text-chalk-dim">Active provider</p>
            <div className="mt-1">
              <ProviderForm current={providerRow?.value ?? "football-data"} />
            </div>
          </div>
          <div>
            <p className="text-xs text-chalk-dim">Last sync</p>
            <p className="mt-1 font-mono">
              {lastSyncRow ? <LocalKickoff kickoffIso={lastSyncRow.value} /> : "never"}
            </p>
          </div>
          <div>
            <p className="text-xs text-chalk-dim">Trigger</p>
            <div className="mt-1">
              <SyncNowButton />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Users", counts.users],
          ["Matches", counts.matches],
          ["Finished", counts.finished],
          ["Predictions", counts.predictions],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-chalk/10 bg-pitch-900/70 p-4 text-center">
            <p className="font-display text-3xl tabular-nums">{value}</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-chalk-dim">
              {label}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
