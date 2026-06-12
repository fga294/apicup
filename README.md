# 🥇 The API Cup — Artificial Prediction Intelligence

> Can humans outperform the machines?

An internal IT-department prediction competition for the FIFA World Cup 2026
knockout stage. Participants predict match scores, earn points, and compete
against each other — and against **MQ-Chat: ModelOpus 4.8**, an AI contestant
whose picks are generated externally and entered by an admin under the same
rules as everyone else.

## How scoring works

Scores are judged against the **90-minute result** (extra time and penalties
are ignored, so draw predictions are valid in knockout games):

| Outcome | Points |
| --- | --- |
| Exact scoreline | **10** |
| Correct result (win/draw/loss), wrong score | **5** |
| Wrong result | **0** |

Predictions lock **exactly one hour before kickoff** and can never be edited
or deleted — for humans and AI alike.

## Stack

- **Next.js 16** (App Router, TypeScript) on **Vercel**
- **Neon Postgres** via **Drizzle ORM** (local dev runs Docker Postgres)
- **Auth.js v5** credentials auth (email + password, bcrypt, JWT — no email
  sending; password resets are admin-issued one-time codes)
- **Tailwind CSS v4** + **Motion** — "Copa Carnaval" broadcast design system
- **Vitest** for the scoring engine, provider mapping, and cutoff rules
- Match data: **football-data.org v4** behind a provider abstraction with
  manual admin entry as the fallback

## Key routes

| Route | What it is |
| --- | --- |
| `/` | Personal dashboard |
| `/matches` | Fixtures by stage, prediction forms, countdowns |
| `/leaderboard` | The centerpiece — podium, movement, badges |
| `/heatmap` | Live crowd sentiment per match |
| `/stats` | Tournament statistics dashboard |
| `/tv` | **Office TV mode** — six rotating full-screen panels, no login |
| `/admin` | Sync controls, users & reset codes, AI picks, manual fallback |
| `/reset` | Redeem an admin-issued password reset code |

## Local development

```bash
npm install
docker run -d --name apicup-pg -e POSTGRES_PASSWORD=apicup \
  -e POSTGRES_DB=apicup -p 54320:5432 postgres:17-alpine

# .env.local needs: DATABASE_URL, AUTH_SECRET, CRON_SECRET, FOOTBALL_DATA_TOKEN
npm run db:migrate     # apply schema
npm run db:seed        # admin account + AI contestant
npm run db:simulate    # optional: fake mid-tournament data for UI work
npm run dev
```

`npm test` runs the Vitest suite. `npm run db:studio` opens Drizzle Studio.

## How match data flows

1. `/api/sync` (bearer `CRON_SECRET` or admin session) pulls fixtures and
   results from the active provider and upserts them idempotently.
2. Newly finished matches are scored, a leaderboard snapshot is taken
   (snapshots power the ▲▼ movement indicators), and AI Slayer badges are
   awarded for completed stages.
3. Sync triggers, in order of importance:
   - **Lazy staleness check** — leaderboard/TV pages re-sync when data is
     older than 3 minutes; the office TV keeps results live during matches.
   - **GitHub Actions** every 30 minutes (`.github/workflows/sync.yml`).
   - **Vercel cron** daily backstop (`vercel.json`).
4. Admin result overrides set `result_locked`, which sync never overwrites.

## Achievements

- 🤖 **AI Slayer** — out-score the AI in a completed stage (tracked per stage).
- ⭐ **Golden Predictor** — best exact-prediction rate; shown on the
  leaderboard, profile, and TV mode.

The AI competes in the rankings but is not eligible for prizes.
