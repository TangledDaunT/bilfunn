"use client";

export default function Error({ retry }: { error: Error; retry: () => void }) {
  return (
    <div className="wrap" style={{ paddingTop: 30, maxWidth: 520 }}>
      <div className="card">
        <h1 style={{ fontSize: "1.45rem" }}>Noe gikk galt</h1>
        <p className="muted">
          Vi klarte ikke å laste siden. Kontroller betalingsstatus på Min side
          før du forsøker å betale på nytt. Prøv igjen, eller kontakt support
          hvis det gjentar seg.
        </p>
        <button className="btn" onClick={retry}>
          Prøv igjen
        </button>
      </div>
    </div>
  );
}
