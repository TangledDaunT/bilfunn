import LegalPage from "@/components/Legal";
export const metadata = { title: "Angrerett og refusjon" };

export default function Withdrawal() {
  return (
    <LegalPage
      title="Angrerett og refusjon"
      sections={[
        ["Digitale tjenester", <p key="a">Tjenesten leveres umiddelbart etter betaling. Ved å bekrefte kjøpet samtykker du til levering før angrefristen utløper, og angreretten faller bort når rapporten er åpnet, jf. angrerettloven § 22 bokstav n.</p>],
        ["Når vi refunderer likevel", <p key="b">Hvis oppslaget ikke ga resultat på grunn av en teknisk feil hos oss, hvis du ble belastet dobbelt, eller hvis abonnementet ble fornyet etter at du hadde sagt opp, refunderer vi hele beløpet.</p>],
        ["Slik ber du om refusjon", <p key="c">Send en melding via kontaktskjemaet med kvitteringsnummeret. Vi behandler saken innen tre virkedager, og refusjonen går tilbake til samme betalingsmåte innen 5–10 dager.</p>],
      ]}
    />
  );
}
