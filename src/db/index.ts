import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import {
  drizzle as drizzlePg,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";

import * as schema from "./schema";

const url = process.env.DATABASE_URL!;

// Neon's HTTP driver only talks to Neon's proxy; local/dev Postgres needs TCP.
// Both expose the same PgDatabase API, so we present one type to callers.
// Constraint this imposes: neon-http has no db.transaction() — sync/scoring
// code must stay idempotent instead of relying on transactions.
export const db: NodePgDatabase<typeof schema> = url.includes("neon.tech")
  ? (drizzleNeon(neon(url), { schema }) as unknown as NodePgDatabase<typeof schema>)
  : drizzlePg(url, { schema });
