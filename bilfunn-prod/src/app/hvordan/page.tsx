import { getConfig } from "@/lib/config";
import { formatOre } from "@/lib/money";
import PlateSearch from "@/components/PlateSearch";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Slik virker det",
  "Slik søker du på et norsk registreringsnummer og får en kjøretøyrapport.",
  "/hvordan",
);

export const dynamic = "force-dynamic";
export default async function HowPage() {
  const cfg = await getConfig();
  const STEPS: Array<[string, string]> = [
    [
      "Søk på registreringsnummeret",
      "Skriv inn skiltet på forsiden. Vi normaliserer mellomrom og små bokstaver automatisk.",
    ],
    [
      "Bekreft kjøretøyet",
      "Du ser merke, modell, årsmodell og farge gratis, så du vet at du har funnet riktig bil.",
    ],
    [
      `Bekreft innlogging og betal ${formatOre(cfg.introPriceOre)}`,
      `Velg en tilgjengelig betalingsmåte. Introduksjonen varer i ${cfg.introDays} dager, deretter fornyes abonnementet til ${formatOre(cfg.renewalPriceOre)} per måned.`,
    ],
    [
      "Les rapporten",
      "Rapporten viser tilgjengelig teknisk informasjon, EU-kontroll og registrering. Eieropplysninger: not available in this data source.",
    ],
  ];

  return (
    <div className="wrap" style={{ paddingTop: 28 }}>
      <h1>Slik virker det</h1>
      <p className="muted" style={{ maxWidth: "60ch" }}>
        Fire steg fra skilt til rapport. Det tar under et minutt.
      </p>
      <div className="grid" style={{ marginTop: 18 }}>
        {STEPS.map(([h, p], i) => (
          <div className="card" key={h}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div
                style={{
                  flex: "none",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--cta)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </div>
              <div>
                <h3 style={{ margin: "2px 0 4px" }}>{h}</h3>
                <p className="muted small" style={{ margin: 0 }}>
                  {p}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 14, maxWidth: 420 }}>
        <PlateSearch />
      </div>
    </div>
  );
}
