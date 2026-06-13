import { headers } from "next/headers";

import { getTvData } from "@/lib/stats";
import { syncIfStale } from "@/lib/sync";

import { TvApp } from "./TvApp";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "The API Cup — Office TV",
};

export default async function TvPage() {
  await syncIfStale();
  const data = await getTvData();

  // Build the join URL from the host the TV is actually viewed on, so the QR
  // works on any domain (preview, production, or the office's own address).
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const loginUrl = `${proto}://${host}/login`;

  return <TvApp initial={data} loginUrl={loginUrl} />;
}
