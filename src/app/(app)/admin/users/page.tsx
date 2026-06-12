import { asc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { predictions, users } from "@/db/schema";
import { LocalKickoff } from "@/components/LocalKickoff";

import { ResetCodeButton } from "../AdminForms";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();
  if (session?.user.role !== "admin") redirect("/");

  const rows = await db
    .select({
      user: users,
      predictionCount: sql<number>`count(${predictions.id})::int`,
    })
    .from(users)
    .leftJoin(predictions, eq(predictions.userId, users.id))
    .groupBy(users.id)
    .orderBy(asc(users.username));

  return (
    <div>
      <h1 className="font-display text-4xl uppercase tracking-wide">
        Users <span className="text-gold-400">& reset codes</span>
      </h1>
      <p className="mt-1 text-sm text-chalk-dim">
        Issue a one-time code, hand it to the participant in person or by chat, and
        point them at <span className="font-mono text-chalk">/reset</span>. Codes
        expire after 24 hours and die on first use.
      </p>

      <ul className="mt-6 space-y-2">
        {rows.map(({ user, predictionCount }) => (
          <li
            key={user.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-chalk/8 bg-pitch-900/70 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-semibold">
                {user.displayName}
                <span className="ml-2 font-mono text-xs text-chalk-dim">
                  @{user.username}
                </span>
                {user.role === "admin" && (
                  <span className="ml-2 rounded border border-gold-400/40 px-1.5 py-px font-mono text-[10px] font-bold text-gold-300">
                    ADMIN
                  </span>
                )}
                {user.isAi && (
                  <span className="ml-2 rounded border border-skyx-400/40 px-1.5 py-px font-mono text-[10px] font-bold text-skyx-300">
                    AI
                  </span>
                )}
              </p>
              <p className="font-mono text-xs text-chalk-dim">
                joined <LocalKickoff kickoffIso={user.createdAt.toISOString()} /> ·{" "}
                {predictionCount} prediction{predictionCount === 1 ? "" : "s"}
              </p>
            </div>
            <div className="ml-auto">{!user.isAi && <ResetCodeButton userId={user.id} />}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
