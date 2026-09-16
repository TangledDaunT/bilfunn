import Link from "next/link";
import { getConfig } from "@/lib/config";
import { formatOre } from "@/lib/money";
import { Check } from "@/components/icons";

export const metadata = { title: "Priser" };
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const cfg = await getConfig();
  return (
    <div className="wrap" style={{ paddingTop: 28 }}>
      <h1>Priser</h1>
      <p className="muted" style={{ maxWidth: "62ch" }}>
        Én pris, ingen skjulte tillegg. Du ser alltid hva du betaler og når neste trekk skjer.
      </p>
      <div className="grid g2" style={{ marginTop: 18 }}>
        <div className="pricebox">
          <div className="top">
            <div className="amt">{formatOre(cfg.introPriceOre)}</div>
            <div style={{ opacity: 0.92 }}>første {cfg.introDays} dager</div>
          </div>
          <div className="body">
            <ul className="terms-list">
              <li><Check /><span>Inntil {cfg.introSearchLimit} oppslag</span></li>
              <li><Check /><span>Full rapport på hvert kjøretøy</span></li>
              <li><Check /><span>Går automatisk over til månedsabonnement</span></li>
            </ul>
            <Link className="btn block" href="/" style={{ marginTop: 14 }}>
              Start søk
            </Link>
          </div>
        </div>
        <div className="card">
          <h2 style={{ marginBottom: 4 }}>
            {formatOre(cfg.renewalPriceOre)}
            <span className="muted" style={{ fontSize: "1rem", fontWeight: 400 }}>/mnd</span>
          </h2>
          <p className="muted small">Fra dag {cfg.introDays + 1}, inntil du sier opp.</p>
          <ul className="terms-list">
            <li><Check /><span>{cfg.monthlySearchLimit} oppslag per måned</span></li>
            <li><Check /><span>Søkehistorikk og kvitteringer</span></li>
            <li><Check /><span>Oppsigelse på Min side, uten oppsigelsestid</span></li>
            <li><Check /><span>E-postvarsel før hver fornyelse</span></li>
          </ul>
        </div>
      </div>
      <div className="note" style={{ marginTop: 16 }}>
        Alle priser inkluderer 25 % merverdiavgift. Betaling med Vipps eller bankkort. Trekket vises som «BILFUNN» på
        kontoutskriften.
      </div>
    </div>
  );
}
