/* eslint-disable @next/next/no-img-element -- Original static SVG icons need no image transformation. */
import { getConfig } from "@/lib/config";
import { formatOre } from "@/lib/money";
import { pageMetadata } from "@/lib/seo";
import DesignFaq from "@/components/DesignFaq";
import DesignCta from "@/components/DesignCta";
export const metadata = pageMetadata(
  "Priser",
  "Priser og abonnement for kjøretøyopplysninger.",
  "/priser",
);
export const dynamic = "force-dynamic";
export default async function PricingPage() {
  const cfg = await getConfig();
  return (
    <div className="design-page">
      <div className="design-container">
        <div className="page-intro pricing-intro">
          <p className="eyebrow">Priser og abonnement</p>
          <h1>Vit hva du betaler. Hele veien.</h1>
          <p>
            {formatOre(cfg.introPriceOre)} for {cfg.introDays} dager. Deretter{" "}
            {formatOre(cfg.renewalPriceOre)} per måned med automatisk fornyelse.
            Avbestill når som helst.
          </p>
        </div>
        <section className="pricing-section">
          <p className="eyebrow">Du har full kontroll</p>
          <h2>Enkel og tydelig prising.</h2>
          <p className="muted">En liten start. Ingen overraskelser.</p>
          <div className="pricing-grid">
            <div>
              <p className="eyebrow">De første {cfg.introDays} dagene</p>
              <p className="pricing-number">{formatOre(cfg.introPriceOre)}</p>
              <h3>{cfg.introDays} dagers tilgang</h3>
              <p>
                Utforsk tilgjengelige kjøretøyopplysninger og bli kjent med
                tjenesten. Inntil {cfg.introSearchLimit} oppslag.
              </p>
            </div>
            <div>
              <p className="eyebrow">Fortsett, om du fortsetter</p>
              <p className="pricing-number">
                {formatOre(cfg.renewalPriceOre)}
                <span>/måned</span>
              </p>
              <h3>Fornyes automatisk</h3>
              <p>
                Etter {cfg.introDays} dager fortsetter abonnementet til{" "}
                {formatOre(cfg.renewalPriceOre)} per måned til du avbestiller.
                Inntil {cfg.monthlySearchLimit} oppslag per måned.
              </p>
            </div>
            <div>
              <p className="eyebrow">Alltid på dine premisser</p>
              <p className="pricing-number">
                <img src="/design/894ef.svg" width="32" height="32" alt="" />
              </p>
              <h3>Avbestill når som helst</h3>
              <p>
                Avbestill enkelt fra Min side før neste fornyelse. Ingen
                bindingstid.
              </p>
            </div>
          </div>
        </section>
      </div>
      <section className="pricing-details wash">
        <div className="design-container split">
          <div>
            <h2>Dette er inkludert.</h2>
            <p>
              Alle tilgjengelige kjøretøyopplysninger samlet i en oversiktlig
              rapport.
            </p>
            <ul>
              <li>Tekniske data og grunnleggende kjøretøyinfo</li>
              <li>EU-kontroll og registrering</li>
              <li>Min side med kvitteringer og søkehistorikk</li>
            </ul>
          </div>
          <div>
            <h2>Du bestemmer når du stopper.</h2>
            <p>
              Avbestill fra Min side før neste fornyelse. Se status og
              gjenværende tilgang på kontoen din.
            </p>
            <p>
              Alle priser inkluderer merverdiavgift. Pris og betalingsvilkår
              vises før du bekrefter kjøpet.
            </p>
          </div>
        </div>
      </section>
      <section className="design-section design-container">
        <h2>Spørsmål om abonnementet?</h2>
        <DesignFaq limit={8} />
      </section>
      <DesignCta />
    </div>
  );
}
