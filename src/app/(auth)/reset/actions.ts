"use server";

import bcrypt from "bcryptjs";
import { and, desc, eq, gt } from "drizzle-orm";

import { db } from "@/db";
import { passwordResetRequests, users } from "@/db/schema";
import { rateLimitOk } from "@/lib/rateLimit";

export interface ResetState {
  error?: string;
  ok?: boolean;
}

export async function redeemResetCode(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const username = String(formData.get("username") ?? "").toLowerCase().trim();
  const code = String(formData.get("code") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!(await rateLimitOk("reset", 5, 60_000))) {
    return { error: "Too many attempts — try again in a minute" };
  }
  if (!username || !code) return { error: "Username and reset code are required" };
  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters" };
  }

  // Same generic error for every failure mode — no account enumeration.
  const invalid = { error: "Invalid or expired reset code" };

  const user = await db.query.users.findFirst({ where: eq(users.username, username) });
  if (!user || user.isAi) return invalid;

  const request = await db.query.passwordResetRequests.findFirst({
    where: and(
      eq(passwordResetRequests.userId, user.id),
      eq(passwordResetRequests.status, "issued"),
      gt(passwordResetRequests.expiresAt, new Date()),
    ),
    orderBy: desc(passwordResetRequests.createdAt),
  });
  if (!request?.codeHash || !(await bcrypt.compare(code, request.codeHash))) {
    return invalid;
  }

  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(newPassword, 10) })
    .where(eq(users.id, user.id));
  await db
    .update(passwordResetRequests)
    .set({ status: "used" })
    .where(eq(passwordResetRequests.id, request.id));

  return { ok: true };
}
