"use client";
import { useState } from "react";
import { questions } from "@/lib/design";
export default function DesignFaq({
  filters = false,
  limit = 10,
}: {
  filters?: boolean;
  limit?: number;
}) {
  const [category, setCategory] = useState("Alle");
  return (
    <>
      <div className="faq-tabs" aria-label="Filtrer spørsmål">
        {filters &&
          [
            "Alle",
            "Generelt",
            "Betaling og abonnement",
            "Data og personvern",
            "Konto",
          ].map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
      </div>
      <div className="design-faq">
        {questions
          .slice(0, limit)
          .filter((q) => category === "Alle" || q[2] === category)
          .map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
      </div>
    </>
  );
}
