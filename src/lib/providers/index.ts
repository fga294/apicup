import { eq } from "drizzle-orm";

import { db } from "@/db";
import { appSettings } from "@/db/schema";

import { footballDataProvider } from "./footballData";
import type { MatchDataProvider } from "./types";

/**
 * Manual mode: fixtures and results are administered directly in the
 * database via the admin panel, so sync has nothing to fetch.
 */
const manualProvider: MatchDataProvider = {
  name: "manual",
  async fetchMatches() {
    return [];
  },
};

const providers: Record<string, MatchDataProvider> = {
  "football-data": footballDataProvider,
  manual: manualProvider,
};

export async function getActiveProvider(): Promise<MatchDataProvider> {
  const row = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "match_provider"),
  });
  return providers[row?.value ?? "football-data"] ?? footballDataProvider;
}
