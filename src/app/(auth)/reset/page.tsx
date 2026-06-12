"use client";

import Link from "next/link";
import { useActionState } from "react";

import { redeemResetCode, type ResetState } from "./actions";

const initialState: ResetState = {};

export default function ResetPage() {
  const [state, formAction, pending] = useActionState(redeemResetCode, initialState);

  if (state.ok) {
    return (
      <div className="rounded-2xl bg-chalk/10 p-6 text-center shadow-xl backdrop-blur">
        <p className="text-3xl">✅</p>
        <p className="mt-2 font-semibold text-chalk">Password updated</p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-lg bg-gold-400 px-4 py-2 font-bold text-pitch-950 transition hover:bg-gold-300"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-2xl bg-chalk/10 p-6 shadow-xl backdrop-blur">
      <p className="text-sm text-chalk-dim">
        Got a reset code from an admin? Use it here. Codes expire after 24 hours.
      </p>
      <label className="mt-4 block text-sm font-medium text-chalk">
        Username
        <input
          name="username"
          autoComplete="username"
          required
          className="mt-1 w-full rounded-lg border border-chalk/20 bg-chalk/10 px-3 py-2 text-chalk outline-none focus:border-gold-400"
        />
      </label>
      <label className="mt-4 block text-sm font-medium text-chalk">
        Reset code
        <input
          name="code"
          required
          autoComplete="one-time-code"
          className="mt-1 w-full rounded-lg border border-chalk/20 bg-chalk/10 px-3 py-2 font-mono text-chalk outline-none focus:border-gold-400"
        />
      </label>
      <label className="mt-4 block text-sm font-medium text-chalk">
        New password
        <input
          name="newPassword"
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
        {pending ? "Resetting…" : "Reset password"}
      </button>
      <p className="mt-4 text-center text-sm text-chalk-dim">
        <Link href="/login" className="font-semibold text-gold-300 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
