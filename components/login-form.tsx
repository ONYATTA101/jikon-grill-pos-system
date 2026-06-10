"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { LockKeyhole, Utensils } from "lucide-react";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitLogin(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: username, password })
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string; start?: string };

    setLoading(false);

    if (!response.ok || !result.start) {
      setError(result.error || "Sign in failed.");
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    window.location.href = next || result.start;
  }

  return (
    <>
      <section className="rounded-md border border-zinc-200 bg-white/95 p-6 shadow-lift backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-md bg-charcoal-900 text-sm font-black text-white">JG</span>
          <div>
            <h2 className="text-2xl font-black tracking-normal">Sign in</h2>
            <p className="text-sm font-medium text-zinc-500">Use a staff account to open the correct workspace.</p>
          </div>
        </div>

        <form className="mt-8 space-y-4" onSubmit={submitLogin}>
          <label className="block text-sm font-bold text-zinc-800">
            Username or email
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-ember-600"
              required
            />
          </label>
          <label className="block text-sm font-bold text-zinc-800">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-ember-600"
              required
            />
          </label>

          {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ember-600 text-sm font-bold text-white shadow-lg shadow-ember-600/20 transition hover:bg-ember-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Utensils className="h-4 w-4" aria-hidden="true" />
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="flex gap-2">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <p className="text-sm font-medium leading-6 text-amber-900">Use the staff credentials assigned by the restaurant manager.</p>
          </div>
        </div>
      </section>
    </>
  );
}
