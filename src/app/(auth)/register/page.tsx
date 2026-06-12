"use client";

import Link from "next/link";
import { useActionState } from "react";

import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = {};

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-chalk/10 p-6 shadow-xl backdrop-blur"
    >
      <label className="block text-sm font-medium text-chalk">
        Username
        <input
          name="username"
          autoComplete="username"
          required
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_]+"
          title="Letters, numbers and underscores only"
          className="mt-1 w-full rounded-lg border border-chalk/20 bg-chalk/10 px-3 py-2 text-chalk outline-none focus:border-gold-400"
        />
      </label>
      <label className="mt-4 block text-sm font-medium text-chalk">
        Display name
        <input
          name="displayName"
          required
          maxLength={40}
          placeholder="Shown on the leaderboard"
          className="mt-1 w-full rounded-lg border border-chalk/20 bg-chalk/10 px-3 py-2 text-chalk placeholder-chalk-dim/50 outline-none focus:border-gold-400"
        />
      </label>
      <label className="mt-4 block text-sm font-medium text-chalk">
        Password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1 w-full rounded-lg border border-chalk/20 bg-chalk/10 px-3 py-2 text-chalk outline-none focus:border-gold-400"
        />
      </label>
      {state.error && (
        <p className="mt-3 text-sm text-coral-300" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-lg bg-gold-400 py-2 font-bold text-pitch-950 transition hover:bg-gold-300 disabled:opacity-50"
      >
        {pending ? "Creating account…" : "Join the competition"}
      </button>
      <p className="mt-4 text-center text-sm text-chalk-dim">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-gold-300 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
