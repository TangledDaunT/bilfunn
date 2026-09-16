"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginForm({ token }: { token?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) router.replace("/konto");
      else setError("Lenken er brukt eller utløpt. Be om en ny kode.");
    })();
  }, [token, router]);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    if (!res.ok) return setError("Kunne ikke sende kode. Prøv igjen om litt.");
    setStage("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    setBusy(false);
    if (!res.ok) return setError("Koden er feil eller utløpt.");
    router.push("/konto");
    router.refresh();
  }

  return (
    <>
      {error && (
        <div className="note bad" style={{ marginBottom: 14 }} role="alert">
          {error}
        </div>
      )}
      {stage === "email" ? (
        <form onSubmit={requestCode} noValidate>
          <div className="field">
            <label className="f" htmlFor="email">
              E-postadresse
            </label>
            <input
              className="input"
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="navn@eksempel.no"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button className="btn block" disabled={busy}>
            {busy ? <span className="spinner" /> : null} Send kode
          </button>
        </form>
      ) : (
        <form onSubmit={verify} noValidate>
          <p className="small muted">
            Vi har sendt en kode til <strong>{email}</strong>, hvis det finnes en konto med denne adressen.
          </p>
          <div className="field">
            <label className="f" htmlFor="code">
              Engangskode
            </label>
            <input
              className="input"
              id="code"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              style={{ letterSpacing: ".4em", fontSize: "1.3rem", textAlign: "center" }}
              required
            />
          </div>
          <button className="btn block" disabled={busy}>
            {busy ? <span className="spinner" /> : null} Logg inn
          </button>
          <p className="tiny center" style={{ marginTop: 10 }}>
            <button type="button" className="linkbtn" onClick={() => setStage("email")}>
              Bruk en annen e-postadresse
            </button>
          </p>
        </form>
      )}
    </>
  );
}
