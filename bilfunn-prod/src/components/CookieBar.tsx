"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "bf_consent";

export default function CookieBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* storage blocked — show nothing rather than break */
    }
  }, []);

  function choose(analytics: boolean) {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ necessary: true, analytics, marketing: analytics, at: Date.now() })
      );
    } catch {}
    setShow(false);
    if (analytics) window.dispatchEvent(new CustomEvent("bf:consent"));
  }

  if (!show) return null;
  return (
    <div className="cookiebar" role="dialog" aria-label="Informasjonskapsler">
      <div className="in">
        <p>
          <strong>Informasjonskapsler.</strong> Vi bruker nødvendige informasjonskapsler for innlogging og betaling.
          Analyse og markedsføring settes bare hvis du samtykker. <Link href="/cookies">Les mer</Link>
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn sm ghost" onClick={() => choose(false)}>
            Kun nødvendige
          </button>
          <button className="btn sm" onClick={() => choose(true)}>
            Godta alle
          </button>
        </div>
      </div>
    </div>
  );
}
