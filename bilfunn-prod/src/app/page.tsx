import Link from "next/link";
import PlateSearch from "@/components/PlateSearch";
import { PlateTag } from "@/components/Plate";
import { Check, Lock } from "@/components/icons";
import { getConfig } from "@/lib/config";
import { formatOre } from "@/lib/money";
import { FAQ_ITEMS } from "@/lib/content";

export const dynamic = "force-dynamic";

const BENEFITS: Array<[string, string]> = [
  ["Eieropplysninger", "Navn og registrert adresse på nåværende eier, der dette er tilgjengelig og lovlig å vise."],
  ["Teknisk informasjon", "Motor, effekt, vekt, mål, drivstoff, utslipp og understellsnummer."],
  ["EU-kontroll", "Siste godkjente kontroll og neste frist, så du ser om bilen er forsinket."],
  ["Registrering", "Registreringsstatus, første gang registrert og om kjøretøyet er importert."],
  ["Eierhistorikk", "Antall eiere og eierskifter tilbake i tid, der historikken finnes."],
  ["Kjøretøydata du kan stole på", "Opplysningene hentes ved hvert oppslag, ikke fra et gammelt mellomlager."],
];

const RECENT = ["EH52540", "BR72978", "ZH43691", "RY11794", "EF26640", "BS85395", "SU98133", "LJ21677", "EB81601", "DR32440", "TV80148", "EN86287"];

export default async function HomePage() {
  const cfg = await getConfig();
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="hero-inner">
            <h1>Hvem eier bilen?</h1>
            <p className="lede">
              Skriv inn et norsk registreringsnummer for å finne eierens navn, adresse og tekniske opplysninger om
              kjøretøyet.
            </p>
            <PlateSearch autoFocus />
            <ul className="assure">
              <li>
                <Check /> <span>Oppdaterte data hentes ved hvert oppslag</span>
              </li>
              <li>
                <Check />{" "}
                <span>
                  {formatOre(cfg.introPriceOre)} for {cfg.introDays} dagers tilgang, deretter{" "}
                  {formatOre(cfg.renewalPriceOre)}/mnd
                </span>
              </li>
              <li>
                <Lock /> <span>Sikker betaling med Vipps eller bankkort</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <div className="wrap section">
        <h2>Dette får abonnenter</h2>
        <p className="muted" style={{ maxWidth: "62ch" }}>
          Abonnementet gir deg oppslag på kjøretøy i Norge – ikke bare ett søk. Hva som vises avhenger av hva
          datakilden har for det enkelte kjøretøyet.
        </p>
        <div className="grid g3" style={{ marginTop: 16 }}>
          {BENEFITS.map(([h, p]) => (
            <div className="card" key={h}>
              <h3>{h}</h3>
              <p className="muted small" style={{ margin: 0 }}>
                {p}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="wrap section">
        <div className="card">
          <div className="rowsplit">
            <div style={{ maxWidth: "50ch" }}>
              <h2 style={{ marginBottom: ".2em" }}>
                {formatOre(cfg.introPriceOre)} nå, {cfg.introDays} dagers tilgang
              </h2>
              <p className="muted" style={{ margin: 0 }}>
                Etter {cfg.introDays} dager fornyes abonnementet automatisk til {formatOre(cfg.renewalPriceOre)} per
                måned. Du kan si opp selv på Min side når som helst – også i introduksjonsperioden.
              </p>
            </div>
            <Link className="btn" href="/priser">
              Se hva som er inkludert
            </Link>
          </div>
        </div>
      </div>

      <div className="wrap section">
        <h2 className="center">Ofte stilte spørsmål</h2>
        <div className="card faq" style={{ marginTop: 14 }}>
          {FAQ_ITEMS.slice(0, 5).map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <div className="ans">{a}</div>
            </details>
          ))}
        </div>
        <p className="center" style={{ marginTop: 12 }}>
          <Link href="/faq">Alle spørsmål og svar</Link>
        </p>
      </div>

      <div className="wrap section center">
        <h2>Nylige søk</h2>
        <p className="muted small">Skilt andre har slått opp. Trykk på et skilt for å se kjøretøyet.</p>
        <div className="plates-cloud" style={{ marginTop: 12 }}>
          {RECENT.map((p) => (
            <Link key={p} href={`/kjoretoy/${p}`}>
              <PlateTag plate={p} />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
