"use client";

import { useActionState } from "react";

import { changePassword, type PasswordState } from "./actions";

const initialState: PasswordState = {};

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);

  return (
    <form action={formAction} className="max-w-sm">
      <label className="block text-sm font-medium text-chalk">
        Current password
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-lg border border-chalk/20 bg-chalk/10 px-3 py-2 text-chalk outline-none focus:border-gold-400"
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
      {state.ok && (
        <p className="mt-3 text-sm text-limey-300" role="status">
          Password updated ✓
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-gold-400 px-4 py-2 text-sm font-bold text-pitch-950 transition hover:bg-gold-300 disabled:opacity-50"
      >
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
