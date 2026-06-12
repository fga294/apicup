import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    userId: number;
    role: "participant" | "admin";
    isAi: boolean;
  }

  interface Session {
    user: {
      userId: number;
      role: "participant" | "admin";
      isAi: boolean;
    } & DefaultSession["user"];
  }
}

// NextAuthConfig's callback signatures resolve JWT from @auth/core/jwt, and
// module augmentation does not follow next-auth's re-export — augment both.
declare module "next-auth/jwt" {
  interface JWT {
    userId: number;
    role: "participant" | "admin";
    isAi: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId: number;
    role: "participant" | "admin";
    isAi: boolean;
  }
}
