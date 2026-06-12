CREATE TYPE "public"."achievement_type" AS ENUM('ai_slayer');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED', 'FINISHED', 'SUSPENDED', 'POSTPONED', 'CANCELLED', 'AWARDED');--> statement-breakpoint
CREATE TYPE "public"."provider" AS ENUM('football-data', 'manual');--> statement-breakpoint
CREATE TYPE "public"."reset_status" AS ENUM('pending', 'issued', 'used', 'expired');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('participant', 'admin');--> statement-breakpoint
CREATE TYPE "public"."stage" AS ENUM('LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL');--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "achievement_type" NOT NULL,
	"stage" "stage" NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" "provider" NOT NULL,
	"provider_match_id" text NOT NULL,
	"stage" "stage" NOT NULL,
	"home_team" text,
	"away_team" text,
	"home_team_code" text,
	"away_team_code" text,
	"home_crest_url" text,
	"away_crest_url" text,
	"kickoff_utc" timestamp with time zone NOT NULL,
	"status" "match_status" DEFAULT 'SCHEDULED' NOT NULL,
	"home_score_90" integer,
	"away_score_90" integer,
	"result_locked" boolean DEFAULT false NOT NULL,
	"last_synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "password_reset_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"code_hash" text,
	"status" "reset_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"match_id" integer NOT NULL,
	"home_score" integer NOT NULL,
	"away_score" integer NOT NULL,
	"points" integer,
	"scored_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshot_entries" (
	"snapshot_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"rank" integer NOT NULL,
	"points" integer NOT NULL,
	CONSTRAINT "snapshot_entries_snapshot_id_user_id_pk" PRIMARY KEY("snapshot_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'participant' NOT NULL,
	"is_ai" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_requests" ADD CONSTRAINT "password_reset_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot_entries" ADD CONSTRAINT "snapshot_entries_snapshot_id_leaderboard_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."leaderboard_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot_entries" ADD CONSTRAINT "snapshot_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "achievements_user_type_stage_uq" ON "achievements" USING btree ("user_id","type","stage");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_provider_match_uq" ON "matches" USING btree ("provider","provider_match_id");--> statement-breakpoint
CREATE UNIQUE INDEX "predictions_user_match_uq" ON "predictions" USING btree ("user_id","match_id");