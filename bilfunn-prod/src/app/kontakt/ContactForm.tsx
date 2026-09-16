"use client";

import { useState } from "react";

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", email: "", category: "Abonnement og oppsigelse", message: "", website: "" });

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Skriv inn navnet ditt.";
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(form.email)) next.email = "Skriv inn en gyldig e-postadresse.";
    if (form.message.trim().length < 10) next.message = "Skriv litt mer, så kan vi hjelpe deg.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) setSent(true);
    else setErrors({ form: "Meldingen kunne ikke sendes. Prøv igjen om litt." });
  }

  if (sent)
    return (
      <div className="note ok">
        Takk. Meldingen er mottatt, og vi svarer på e-post innen én virkedag.
      </div>
    );

  return (
    <form onSubmit={submit} noValidate>
      {errors.form && <div className="note bad" style={{ marginBottom: 14 }}>{errors.form}</div>}
      <div className="grid g2" style={{ gap: 12 }}>
        <div className="field">
          <label className="f" htmlFor="name">Navn</label>
          <input className="input" id="name" value={form.name} onChange={set("name")} autoComplete="name" />
          {errors.name && <span className="error">{errors.name}</span>}
        </div>
        <div className="field">
          <label className="f" htmlFor="cemail">E-postadresse</label>
          <input className="input" id="cemail" type="email" value={form.email} onChange={set("email")} autoComplete="email" />
          {errors.email && <span className="error">{errors.email}</span>}
        </div>
      </div>
      <div className="field">
        <label className="f" htmlFor="category">Kategori</label>
        <select className="input" id="category" value={form.category} onChange={set("category")}>
          <option>Abonnement og oppsigelse</option>
          <option>Betaling og kvittering</option>
          <option>Feil i kjøretøyopplysninger</option>
          <option>Personvern og sletting</option>
          <option>Annet</option>
        </select>
      </div>
      <div className="field">
        <label className="f" htmlFor="message">Melding</label>
        <textarea className="input" id="message" rows={5} value={form.message} onChange={set("message")} placeholder="Beskriv saken din …" />
        {errors.message && <span className="error">{errors.message}</span>}
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
