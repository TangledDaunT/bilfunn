import LegalPage from "@/components/Legal";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("Personvernerklæring", "Les hvordan Bilfunn behandler personopplysninger og kjøretøydata.", "/personvern");

export default function Privacy() {
  return (
    <LegalPage
      title="Personvernerklæring"
      sections={[
        ["Behandlingsansvarlig", <p key="a">Bilfunn AS, Storgata 1, 0155 Oslo. personvern@bilfunn.no</p>],
        ["Hvilke opplysninger vi behandler", <p key="b">Om deg som kunde: e-postadresse, betalingsreferanse (aldri fullt kortnummer), abonnementsstatus, kvitteringer, søkehistorikk, hashet IP-adresse og tekniske logger. Om kjøretøy: opplysninger vi henter fra datakilden for å svare på ditt oppslag. Kjøretøydata lagres ikke hos oss etter at rapporten er vist.</p>],
        ["Formål og rettslig grunnlag", <p key="c">Levering av avtalen (GDPR art. 6(1)(b)) for konto, betaling og oppslag. Berettiget interesse (art. 6(1)(f)) for sikkerhet, misbruksforebygging og forbedring. Samtykke (art. 6(1)(a)) for analyse og markedsføring.</p>],
        ["Lagringstid", <p key="d">Søkehistorikk slettes automatisk etter 12 måneder. Konto slettes på forespørsel. Kvitteringer og regnskapsbilag beholdes i fem år etter bokføringsloven. Innloggingskoder slettes innen ett døgn.</p>],
        ["Dine rettigheter", <p key="e">Du kan be om innsyn, retting, sletting, begrensning og dataportabilitet, og trekke tilbake samtykke. Bruk knappene på Min side eller kontakt personvern@bilfunn.no. Du kan klage til Datatilsynet.</p>],
        ["Registrerte kjøretøyeiere", <p key="f">Er du eier og ønsker innsyn i hva som er vist om deg, eller mener visningen er uriktig, kontakt personvern@bilfunn.no. Vi logger hvilke kjennemerker som er slått opp og kan følge opp misbruk.</p>],
        ["Databehandlere", <p key="g">Betalingsleverandør, e-postleverandør, hostingleverandør (Vercel), databaseleverandør og kjøretøydataleverandør. Alle er underlagt databehandleravtale, og data behandles innenfor EU/EØS der det er mulig.</p>],
        ["Hva vi aldri logger", <p key="h">Fullt kortnummer, CVC, eller eierens navn og adresse i analyse- eller applikasjonslogger.</p>],
      ]}
    />
  );
}
