"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="wrap" style={{ paddingTop: 30, maxWidth: 520 }}>
      <div className="card">
        <h1 style={{ fontSize: "1.45rem" }}>Noe gikk galt</h1>
        <p className="muted">
          Vi klarte ikke å laste siden. Ingen betaling er gjennomført. Prøv igjen, eller kontakt support hvis det
          gjentar seg.
        </p>
        <button className="btn" onClick={reset}>
          Prøv igjen
        </button>
      </div>
    </div>
  );
}
