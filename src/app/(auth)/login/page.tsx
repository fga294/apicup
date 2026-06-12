"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white/10 p-6 shadow-xl backdrop-blur"
    >
      <label className="block text-sm font-medium text-purple-100">
        Username
        <input
          name="username"
          autoComplete="username"
          required
          className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-purple-300 outline-none focus:border-amber-400"
        />
      </label>
      <label className="mt-4 block text-sm font-medium text-purple-100">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white outline-none focus:border-amber-400"
        />
      </label>
      {state.error && (
        <p className="mt-3 text-sm text-rose-300" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-lg bg-amber-400 py-2 font-bold text-amber-950 transition hover:bg-amber-300 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="mt-4 text-center text-sm text-purple-200">
        New here?{" "}
        <Link href="/register" className="font-semibold text-amber-300 hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-purple-400">
        Forgot your password? Ask an admin for a reset code.
      </p>
    </form>
  );
}
