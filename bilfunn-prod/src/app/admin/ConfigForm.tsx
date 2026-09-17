"use client";
import { clientRequest, retryMessage } from "@/lib/client-request";

import { useState } from "react";

const NUMERIC: Array<[string, string]> = [
  ["introPriceOre", "Introduksjonspris (øre)"],
  ["renewalPriceOre", "Månedspris (øre)"],
  ["introDays", "Introduksjonsdager"],
  ["introSearchLimit", "Søk i introperioden"],
  ["monthlySearchLimit", "Søk per måned"],
  ["graceDays", "Nådedager ved mislykket betaling"],
  ["ipSearchesPerHour", "Søk per IP per time"],
  ["reminderHours", "Påminnelse (timer før fornyelse)"],
];

export default function ConfigForm({ config }: { config: any }) {
  const [form, setForm] = useState(config);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const payload: any = {
        duplicatesCount: form.duplicatesCount,
        cancelKeepsAccess: form.cancelKeepsAccess,
      };
      NUMERIC.forEach(([k]) => (payload[k] = Number(form[k])));
      const res = await clientRequest("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setBusy(false);
      setMsg(
        res.ok
          ? "Innstillingene er lagret."
          : res.status === 429
            ? retryMessage(res)
            : "Kunne ikke lagre. Kontroller verdiene.",
      );
    } catch {
      setMsg(
        "Lagringen ble ikke bekreftet. Last siden på nytt for å kontrollere verdiene.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>Kommersielle regler</h3>
      <p className="muted small">
        Reglene ligger i databasen, ikke i koden. Endringer gjelder for nye
        perioder og påvirker ikke allerede betalte perioder.
      </p>
      {msg && (
        <div className="note ok" style={{ marginBottom: 12 }}>
          {msg}
        </div>
      )}
      <div className="grid g2" style={{ gap: "0 16px" }}>
        {NUMERIC.map(([k, label]) => (
          <div className="field" key={k}>
            <label className="f" htmlFor={k}>
              {label}
            </label>
            <input
              className="input"
              id={k}
              inputMode="numeric"
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <label className="check" style={{ marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={form.duplicatesCount}
          onChange={(e) =>
            setForm({ ...form, duplicatesCount: e.target.checked })
          }
        />
        <span>Gjentatte søk på samme skilt teller mot grensen</span>
      </label>
      <label className="check" style={{ marginBottom: 14 }}>
        <input
          type="checkbox"
          checked={form.cancelKeepsAccess}
          onChange={(e) =>
            setForm({ ...form, cancelKeepsAccess: e.target.checked })
          }
        />
        <span>Ved oppsigelse beholdes tilgangen ut betalt periode</span>
      </label>
      <button className="btn sm" onClick={save} disabled={busy}>
        {busy ? <span className="spinner" /> : null} Lagre innstillinger
      </button>
    </div>
  );
}
