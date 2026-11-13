"use client";

import { FormEvent, useState } from "react";

export default function LoginForm({ initialError = "" }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Sign-in failed. Check your credentials and try again.");
        return;
      }
      window.location.assign("/dashboard");
    } catch {
      setError("The authentication service is unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark">Q<span>◆</span></div>
        <p className="eyebrow">PRIVATE OWNER ACCESS</p>
        <h1>Sign in to your workspace</h1>
        <p className="muted">This environment is restricted to its owner. Authenticate to continue.</p>
        <form className="login-form" method="post" action="/api/auth/login" onSubmit={submit}>
          <label>Email address
            <input type="email" name="email" autoComplete="username" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} />
          </label>
          <label>Password
            <input type="password" name="password" autoComplete="current-password" required maxLength={256} value={password} onChange={event => setPassword(event.target.value)} />
          </label>
          {error && <p className="form-error" role="alert" aria-live="polite">{error}</p>}
          <button type="submit" disabled={busy || !email.trim() || !password}>{busy ? "Authenticating…" : "Enter private workspace"}</button>
        </form>
        <p className="login-foot">OWNER-ONLY ACCESS <span>•</span> SECURE SESSION</p>
      </section>
    </main>
  );
}
