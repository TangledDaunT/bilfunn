"use client";
import { clientRequest, retryMessage } from "@/lib/client-request";

import { useState } from "react";

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "Abonnement og oppsigelse",
    message: "",
    website: "",
  });

  const set =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Skriv inn navnet ditt.";
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(form.email))
      next.email = "Skriv inn en gyldig e-postadresse.";
    if (form.message.trim().length < 10)
      next.message = "Skriv litt mer, så kan vi hjelpe deg.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const res = await clientRequest("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) setSent(true);
      else
        setErrors({
          form:
            res.status === 429
              ? retryMessage(res)
              : "Meldingen kunne ikke sendes. Prøv igjen om litt.",
        });
    } catch {
      setErrors({
        form: "Nettverksfeil. Meldingen er ikke bekreftet mottatt. Prøv igjen.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <div role="status" className="note ok">
        Takk. Meldingen er mottatt, og vi følger opp på e-post.
      </div>
    );

  return (
    <form onSubmit={submit} noValidate>
      {errors.form && (
        <div role="alert" className="note bad" style={{ marginBottom: 14 }}>
          {errors.form}
        </div>
      )}
      <div className="grid g2" style={{ gap: 12 }}>
        <div className="field">
          <label className="f" htmlFor="name">
            Navn
          </label>
          <input
            className="input"
            id="name"
            maxLength={120}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
            value={form.name}
            onChange={set("name")}
            autoComplete="name"
          />
          {errors.name && (
            <span id="name-error" role="alert" className="error">
              {errors.name}
            </span>
          )}
        </div>
        <div className="field">
          <label className="f" htmlFor="cemail">
            E-postadresse
          </label>
          <input
            className="input"
            id="cemail"
            maxLength={254}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "cemail-error" : undefined}
            type="email"
            value={form.email}
            onChange={set("email")}
            autoComplete="email"
          />
          {errors.email && (
            <span id="cemail-error" role="alert" className="error">
              {errors.email}
            </span>
          )}
        </div>
      </div>
      <div className="field">
        <label className="f" htmlFor="category">
          Kategori
        </label>
        <select
          className="input"
          id="category"
          value={form.category}
          onChange={set("category")}
        >
          <option>Abonnement og oppsigelse</option>
          <option>Betaling og kvittering</option>
          <option>Feil i kjøretøyopplysninger</option>
          <option>Personvern og sletting</option>
          <option>Annet</option>
        </select>
      </div>
      <div className="field">
        <label className="f" htmlFor="message">
          Melding
        </label>
        <textarea
          className="input"
          id="message"
          maxLength={4000}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
          rows={5}
          value={form.message}
          onChange={set("message")}
          placeholder="Beskriv saken din …"
        />
        {errors.message && (
          <span id="message-error" role="alert" className="error">
            {errors.message}
          </span>
        )}
      </div>
      <input
        type="text"
        value={form.website}
        onChange={set("website")}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        style={{ position: "absolute", left: "-9999px" }}
      />
      <button className="btn" disabled={busy}>
        {busy ? <span className="spinner" /> : null} Send melding
      </button>
    </form>
  );
}
