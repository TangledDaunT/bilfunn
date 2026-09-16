import Link from "next/link";
import { FAQ_ITEMS } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Spørsmål og svar", "Finn svar på vanlige spørsmål om Bilfunn, søk og abonnement.", "/faq");

export default function FaqPage() {
  return (
    <div className="wrap" style={{ paddingTop: 28 }}>
      <h1>Spørsmål og svar</h1>
      <div className="card faq">
        {FAQ_ITEMS.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <div className="ans">{a}</div>
          </details>
        ))}
      </div>
      <div className="card">
        <div className="rowsplit">
          <span>Fant du ikke svaret?</span>
          <Link className="btn sm" href="/kontakt">
            Kontakt kundeservice
          </Link>
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ_ITEMS.map(([q, a]) => ({
              "@type": "Question",
              name: q,
              acceptedAnswer: { "@type": "Answer", text: a },
            })),
          }),
        }}
      />
    </div>
  );
}
