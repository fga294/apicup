import { NextResponse } from "next/server";

import { getTvData } from "@/lib/stats";
import { syncIfStale } from "@/lib/sync";

export const dynamic = "force-dynamic";

/**
 * Public read-only feed for Office TV mode. The TV polling this endpoint is
 * also what keeps match data fresh during games (lazy sync).
 */
export async function GET() {
  await syncIfStale();
  const data = await getTvData();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
