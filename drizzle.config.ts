import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js, so .env.local is not loaded for us.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (e.g. CI) — rely on the ambient environment.
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
