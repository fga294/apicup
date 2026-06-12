"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { rateLimitOk } from "@/lib/rateLimit";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!(await rateLimitOk("login", 10, 60_000))) {
    return { error: "Too many attempts — try again in a minute" };
  }
  try {
    await signIn("credentials", {
      username: String(formData.get("username") ?? "").toLowerCase().trim(),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
    return {};
  } catch (error) {
    // signIn signals success by throwing a redirect — let that propagate.
    if (error instanceof AuthError) {
      return { error: "Invalid username or password" };
    }
    throw error;
  }
}
