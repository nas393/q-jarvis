"use client";

import { FormEvent, useState } from "react";

export default function LoginForm({ initialError = "" }: { initialError?: string }) {
  const [passkey, setPasskey] = useState("");
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
        body: JSON.stringify({ passkey }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Access denied. Check your passkey and try again.");
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
        <h1>Welcome back</h1>
        <form className="login-form" method="post" action="/api/auth/login" onSubmit={submit}>
          <label>Passkey
            <input type="password" name="passkey" autoComplete="current-password" required maxLength={256} autoFocus value={passkey} onChange={event => setPasskey(event.target.value)} />
          </label>
          {error && <p className="form-error" role="alert" aria-live="polite">{error}</p>}
          <button type="submit" disabled={busy || !passkey}>{busy ? "Unlocking…" : "Enter"}</button>
        </form>
      </section>
    </main>
  );
}