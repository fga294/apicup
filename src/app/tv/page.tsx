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
  return <TvApp initial={data} />;
}
