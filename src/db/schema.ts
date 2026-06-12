import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["participant", "admin"]);

// Knockout stages only — the competition starts at the Round of 32.
// Values mirror football-data.org v4 stage codes so the provider adapter
// can pass them through without translation.
export const stageEnum = pgEnum("stage", [
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
]);

// Mirrors football-data.org v4 match statuses.
export const matchStatusEnum = pgEnum("match_status", [
  "SCHEDULED",
  "TIMED",
  "IN_PLAY",
  "PAUSED",
  "FINISHED",
  "SUSPENDED",
  "POSTPONED",
  "CANCELLED",
  "AWARDED",
]);

export const providerEnum = pgEnum("provider", ["football-data", "manual"]);

export const resetStatusEnum = pgEnum("reset_status", [
  "pending",
  "issued",
  "used",
  "expired",
]);

export const achievementTypeEnum = pgEnum("achievement_type", ["ai_slayer"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // Stored lowercase; uniqueness is case-insensitive by construction.
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("participant"),
  isAi: boolean("is_ai").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const matches = pgTable(
  "matches",
  {
    id: serial("id").primaryKey(),
    provider: providerEnum("provider").notNull(),
    providerMatchId: text("provider_match_id").notNull(),
    stage: stageEnum("stage").notNull(),
    // Nullable: knockout pairings are unknown until the previous round ends.
    homeTeam: text("home_team"),
    awayTeam: text("away_team"),
    homeTeamCode: text("home_team_code"),
    awayTeamCode: text("away_team_code"),
    homeCrestUrl: text("home_crest_url"),
    awayCrestUrl: text("away_crest_url"),
    kickoffUtc: timestamp("kickoff_utc", { withTimezone: true }).notNull(),
    status: matchStatusEnum("status").notNull().default("SCHEDULED"),
    // 90-minute result — the only result the competition scores against.
    homeScore90: integer("home_score_90"),
    awayScore90: integer("away_score_90"),
    // When true, an admin has corrected this row and sync must not overwrite it.
    resultLocked: boolean("result_locked").notNull().default(false),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("matches_provider_match_uq").on(t.provider, t.providerMatchId)],
);

export const predictions = pgTable(
  "predictions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
    points: integer("points"),
    scoredAt: timestamp("scored_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("predictions_user_match_uq").on(t.userId, t.matchId)],
);

export const leaderboardSnapshots = pgTable("leaderboard_snapshots", {
  id: serial("id").primaryKey(),
  takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
  reason: text("reason").notNull(),
});

export const snapshotEntries = pgTable(
  "snapshot_entries",
  {
    snapshotId: integer("snapshot_id")
      .notNull()
      .references(() => leaderboardSnapshots.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    rank: integer("rank").notNull(),
    points: integer("points").notNull(),
  },
  (t) => [primaryKey({ columns: [t.snapshotId, t.userId] })],
);

export const achievements = pgTable(
  "achievements",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    type: achievementTypeEnum("type").notNull(),
    stage: stageEnum("stage").notNull(),
    awardedAt: timestamp("awarded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("achievements_user_type_stage_uq").on(t.userId, t.type, t.stage)],
);

export const passwordResetRequests = pgTable("password_reset_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  // Hash of the one-time code; null while the request is pending issuance.
  codeHash: text("code_hash"),
  status: resetStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
