"use client";
export default function PrintButton() {
  return (
    <button className="btn sm ghost" onClick={() => window.print()}>
      Skriv ut / lagre som PDF
    </button>
  );
}
