import PlateSearch from "@/components/PlateSearch";
export const metadata = { title: "Slik virker det" };

const STEPS: Array<[string, string]> = [
  ["Søk på registreringsnummeret", "Skriv inn skiltet på forsiden. Vi normaliserer mellomrom og små bokstaver automatisk."],
  ["Bekreft kjøretøyet", "Du ser merke, modell, årsmodell og farge gratis, så du vet at du har funnet riktig bil."],
  ["Betal 3 kr", "Vipps eller bankkort. Kontoen opprettes automatisk – ingen registrering på forhånd."],
  ["Les rapporten", "Teknisk informasjon, EU-kontroll, registrering og tilgjengelige eieropplysninger vises umiddelbart."],
];

export default function HowPage() {
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
