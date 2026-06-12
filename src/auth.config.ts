import type { NextAuthConfig } from "next-auth";

// Edge-safe configuration: no database, no bcrypt. Imported by middleware.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const publicPaths = ["/login", "/register", "/tv", "/api/auth", "/api/sync"];
      if (publicPaths.some((p) => pathname.startsWith(p))) return true;
      if (!auth?.user) return false;
      if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
        return auth.user.role === "admin";
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.userId = user.userId;
        token.role = user.role;
        token.isAi = user.isAi;
      }
      return token;
    },
    session({ session, token }) {
      session.user.userId = token.userId;
      session.user.role = token.role;
      session.user.isAi = token.isAi;
      return session;
    },
  },
  providers: [], // filled in by src/auth.ts; middleware never needs them
} satisfies NextAuthConfig;
