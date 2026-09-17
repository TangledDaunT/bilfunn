"use client";
import { clientRequest, retryMessage } from "@/lib/client-request";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  plate: string;
  email: string;
  methods: { vipps: boolean; card: boolean; simulated: boolean };
  introLabel: string;
  renewalLabel: string;
  introDays: number;
};

export default function CheckoutForm({
  plate,
  email: initialEmail,
  methods,
  introLabel,
  renewalLabel,
  introDays,
}: Props) {
  const router = useRouter();
  const [email] = useState(initialEmail);
  const [method, setMethod] = useState<"vipps" | "card">(
    methods.vipps ? "vipps" : "card",
  );
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim()))
      next.email = "Skriv inn en gyldig e-postadresse.";
    if (!accepted) next.terms = "Du må godta vilkårene for å fortsette.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const res = await clientRequest("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), method, plate, accepted }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({
          form:
            res.status === 429
              ? retryMessage(res)
              : "Betalingen kunne ikke bekreftes startet. Kontroller Min side før du prøver igjen.",
        });
        setBusy(false);
        return;
      }
      if (data.redirectUrl) window.location.href = data.redirectUrl;
      else router.push(data.next || `/kvittering?nr=${plate}`);
    } catch {
      setErrors({
        form: "Vi fikk ikke bekreftet betalingsstatus. Kontroller Min side før du prøver igjen.",
      });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      {errors.form && (
        <div className="note bad" style={{ marginBottom: 14 }} role="alert">
          {errors.form}
        </div>
      )}

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
          readOnly
        />
        {errors.email && <span className="error">{errors.email}</span>}
        <span className="tiny">Kvittering og innloggingslenke sendes hit.</span>
      </div>

      <label className="f">Betalingsmåte</label>
      <div className="grid g2" style={{ gap: 10, marginBottom: 14 }}>
        {methods.vipps && (
          <label className={`choice${method === "vipps" ? " on" : ""}`}>
            <input
              type="radio"
              name="pm"
              checked={method === "vipps"}
              onChange={() => setMethod("vipps")}
            />
            <span>
              <strong style={{ color: "#ff5b24" }}>Vipps</strong>
              <br />
              <span className="tiny">Bekreft i Vipps-appen</span>
            </span>
          </label>
        )}
        {methods.card && (
          <label className={`choice${method === "card" ? " on" : ""}`}>
            <input
              type="radio"
              name="pm"
              checked={method === "card"}
              onChange={() => setMethod("card")}
            />
            <span>
              <strong>Bankkort</strong>
              <br />
              <span className="tiny">Visa / Mastercard</span>
            </span>
          </label>
        )}
      </div>

      <label className="check" style={{ marginBottom: 14 }}>
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span>
          Jeg godtar vilkårene, samtykker til at tjenesten leveres umiddelbart,
          og bekrefter at abonnementet fornyes automatisk til {renewalLabel} per
          måned etter {introDays} dager inntil jeg sier opp.
        </span>
      </label>
      {errors.terms && (
        <span
          className="error"
          style={{ marginTop: -8, marginBottom: 10, display: "block" }}
        >
          {errors.terms}
        </span>
      )}

      {!methods.card && !methods.vipps && (
        <p role="status">Betaling er midlertidig utilgjengelig.</p>
      )}
      <button
        className="btn block lg"
        type="submit"
        disabled={busy || (!methods.card && !methods.vipps)}
      >
        {busy ? <span className="spinner" /> : null} Betal {introLabel} og lås
        opp
      </button>

      {methods.simulated && (
        <p className="tiny center" style={{ marginTop: 10 }}>
          Demomodus: ingen ekte betaling gjennomføres. Sett{" "}
          <code>PAYMENTS_MODE</code> og leverandørnøkler for å aktivere Vipps
          eller kort.
        </p>
      )}
    </form>
  );
}
