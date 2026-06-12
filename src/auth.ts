import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfig } from "@/auth.config";
import { db } from "@/db";
import { users } from "@/db/schema";

const credentialsSchema = z.object({
  // Emails for participants; the seeded admin/AI identifiers also pass.
  username: z.string().min(1).max(80),
  password: z.string().min(1).max(200),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const username = parsed.data.username.toLowerCase().trim();
        const user = await db.query.users.findFirst({
          where: eq(users.username, username),
        });
        if (!user) return null;
        // The AI contestant's predictions are entered by admins; it never logs in.
        if (user.isAi) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: String(user.id),
          userId: user.id,
          name: user.displayName,
          role: user.role,
          isAi: user.isAi,
        };
      },
    }),
  ],
});
