"use client";
import { clientRequest, retryMessage } from "@/lib/client-request";
import { useRouter } from "next/navigation";
import { useState } from "react";
export default function LoginForm({
  token,
  next = "/konto",
  passwordLogin = false,
}: {
  token?: string;
  next?: string;
  passwordLogin?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const verify = sent || Boolean(token);
      const passwordAttempt = usePassword && !token;
      const res = await clientRequest(
        `/api/auth/${passwordAttempt ? "password" : verify ? "verify" : "request"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            token
              ? { token }
              : passwordAttempt
                ? { email, password }
                : verify
                  ? { email, code }
                  : { email },
          ),
        },
      );
      if (!res.ok) {
        setError(
          res.status === 429
            ? retryMessage(res)
            : res.status >= 500
              ? "Innlogging er midlertidig utilgjengelig. Prøv igjen om litt."
              : passwordAttempt && res.status === 401
                ? "E-postadressen eller passordet er feil."
                : verify && res.status === 401
                  ? "Koden eller lenken er utløpt, brukt eller ugyldig. Be om en ny kode."
                : "Kunne ikke fullføre. Kontroller opplysningene eller be om ny kode.",
        );
        return;
      }
      if (verify || passwordAttempt) {
        router.replace(next);
        router.refresh();
      } else setSent(true);
    } catch {
      setError("Nettverksfeil. Prøv igjen.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      {error && <p role="alert">{error}</p>}
      {!token && (
        <>
          <label className="f" htmlFor="email">
            E-postadresse
          </label>
          <input
            className="input"
            id="email"
            type="email"
            required
            maxLength={254}
            value={email}
            disabled={sent}
            onChange={(e) => setEmail(e.target.value)}
          />
          {usePassword && (
            <>
              <label className="f" htmlFor="password">
                Passord
              </label>
              <input
                className="input"
                id="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={16}
                maxLength={256}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </>
          )}
          {sent && (
            <>
              <p>Vi har sendt en engangskode dersom adressen kan brukes.</p>
              <label className="f" htmlFor="code">
                Engangskode
              </label>
              <input
                className="input"
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </>
          )}
        </>
      )}
      <button className="btn block" disabled={busy}>
        {busy
          ? "Vennligst vent…"
            : sent || token || usePassword
            ? "Bekreft innlogging"
            : "Send kode"}
      </button>
      {!token && !sent && passwordLogin && (
        <button
          type="button"
          className="linkbtn"
          onClick={() => {
            setUsePassword((value) => !value);
            setPassword("");
            setError("");
          }}
        >
          {usePassword ? "Bruk engangskode" : "Logg inn med passord"}
        </button>
      )}
      {token && (
        <a
          className="linkbtn"
          href={`/logg-inn?next=${encodeURIComponent(next)}`}
        >
          Be om ny kode
        </a>
      )}
      {sent && (
        <button
          type="button"
          className="linkbtn"
          onClick={() => {
            setSent(false);
            setCode("");
          }}
        >
          Be om ny kode
        </button>
      )}
    </form>
  );
}
