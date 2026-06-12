import { z } from "zod";

// Participants sign in with their email address; it is stored (lowercased)
// in the users.username column. Format is enforced at registration only, so
// pre-existing non-email accounts (admin, the AI) can still authenticate.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(80, "Email is too long")
  .pipe(z.email("Enter a valid email address"));

export const registerSchema = z.object({
  email: emailSchema,
  displayName: z.string().trim().min(1, "Display name is required").max(40),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const predictionSchema = z.object({
  matchId: z.coerce.number().int().positive(),
  homeScore: z.coerce.number().int().min(0).max(20),
  awayScore: z.coerce.number().int().min(0).max(20),
});
