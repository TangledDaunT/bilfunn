"use client";

import { useState } from "react";
import { normalizePlate, isValidPlate, prettyPlate } from "@/lib/plate";
import { Search } from "./icons";

export default function PlateSearch({
  autoFocus = false,
  cta = "Finn eier",
}: {
  autoFocus?: boolean;
  cta?: string;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onChange(raw: string) {
    const p = normalizePlate(raw);
    setValue(/^[A-ZÆØÅ]{2}\d+$/.test(p) ? prettyPlate(p) : p);
    if (error) setError(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const plate = normalizePlate(value);
    if (!plate) return setError("Skriv inn et registreringsnummer.");
    if (!isValidPlate(plate))
      return setError(
        "Ugyldig format. Norske skilt har to bokstaver og fem sifre, for eksempel AB 12345.",
      );
    setBusy(true);
    window.location.assign(`/${plate}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label className="f" htmlFor="plate">
        Registreringsnummer
      </label>
      <div className={`plate${error ? " err" : ""}`}>
        <span className="eu" aria-hidden>
          <span className="stars">
            ★★★
            <br />
            ★&nbsp;&nbsp;★
            <br />
            ★★★
          </span>
          <span className="n">N</span>
        </span>
        <input
          id="plate"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="AB 12345"
          maxLength={9}
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "plate-error" : undefined}
        />
      </div>
      {error && (
        <span className="error" id="plate-error" role="alert">
          {error}
        </span>
      )}
      <button
        className="btn block lg"
        type="submit"
        disabled={busy}
        style={{ marginTop: 12 }}
      >
        {busy ? <span className="spinner" /> : <Search />} {cta}
      </button>
    </form>
  );
}
