import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Route protection (Next 16 "proxy" convention, formerly middleware): the
// edge-safe authConfig's `authorized` callback decides who gets where.
export default auth;

export const config = {
  // Everything except Next.js internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|webp)$).*)"],
};
