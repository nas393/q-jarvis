"use client";

import { useState } from "react";
import bcrypt from "bcryptjs";

export default function PasswordHashSetupPage() {
  const [password, setPassword] = useState("");
  const [hash, setHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setError("");
    setHash("");
    setCopied(false);
    if (password.length < 14) {
      setError("Use your existing password. It must be at least 14 characters.");
      return;
    }
    setBusy(true);
    try {
      const result = await bcrypt.hash(password, 12);
      setHash(result);
      setPassword("");
    } catch {
      setError("Could not generate the hash. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyHash() {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
    } catch {
      setError("Clipboard access was blocked. Press and hold the hash to copy it.");
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card" style={{ width: "min(100%, 560px)" }}>
        <div className="brand-mark">Q<span>.</span></div>
        <p className="eyebrow">LOCAL PASSWORD SETUP</p>
        <h1>Generate your login hash</h1>
        <p className="muted">Enter your existing Q JARVIS password. This page generates the bcrypt hash inside your browser; the password is not submitted to the server or saved.</p>
        <div className="login-form">
          <label>Existing Q JARVIS password
            <input type="password" autoComplete="off" value={password} onChange={event => setPassword(event.target.value)} />
          </label>
          <button type="button" disabled={busy || !password} onClick={generate}>{busy ? "Generating…" : "Generate bcrypt hash"}</button>
          {error && <p className="form-error" role="alert">{error}</p>}
          {hash && <>
            <label>Generated hash — copy this into Vercel OWNER_PASSWORD_HASH
              <textarea readOnly value={hash} rows={4} onFocus={event => event.currentTarget.select()} style={{ width: "100%", resize: "vertical" }} />
            </label>
            <button type="button" onClick={copyHash}>{copied ? "Copied" : "Copy hash"}</button>
            <p className="muted">Next: replace OWNER_PASSWORD_HASH in Vercel with this complete value, then redeploy Preview.</p>
          </>}
        </div>
        <p className="login-foot">BCRYPT COST 12 <span>•</span> BROWSER ONLY</p>
      </section>
    </main>
  );
}
