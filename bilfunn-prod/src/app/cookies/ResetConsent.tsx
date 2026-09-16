"use client";
export default function ResetConsent() {
  return (
    <button
      className="btn sm ghost"
      onClick={() => {
        try {
          localStorage.removeItem("bf_consent");
        } catch {}
        location.reload();
      }}
    >
      Åpne samtykkevalg på nytt
    </button>
  );
}
