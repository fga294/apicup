import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { runSync } from "@/lib/sync";

export const dynamic = "force-dynamic";

async function authorized(request: Request): Promise<boolean> {
  const bearer = request.headers.get("authorization");
  if (bearer === `Bearer ${process.env.CRON_SECRET}`) return true;
  // Allow the admin panel's "Sync now" button.
  const session = await auth();
  return session?.user.role === "admin";
}

export async function POST(request: Request) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runSync();
    return NextResponse.json(result);
  } catch (err) {
    console.error("sync failed:", err);
    return NextResponse.json({ error: "sync failed" }, { status: 502 });
  }
}

// Vercel cron and simple pingers use GET.
export const GET = POST;
