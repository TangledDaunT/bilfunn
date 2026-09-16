import LegalPage from "@/components/Legal";
export const metadata = { title: "Om datakildene" };

export default function Sources() {
  return (
    <LegalPage
      title="Om datakildene"
      sections={[
        ["Tekniske kjøretøyopplysninger", <p key="a">Hentes fra Statens vegvesens åpne API for kjøretøyopplysninger (enkeltoppslag). Kilden inneholder ikke eieropplysninger.</p>],
        ["Eieropplysninger", <p key="b">Krever en egen avtale om utlevering av kjøretøyopplysninger med eierinformasjon, eller tilsvarende rettigheter gjennom en kommersiell leverandør. Der avtalen ikke er på plass, vises ingen eierdata.</p>],
        ["Uavhengighet", <p key="c">Bilfunn er ikke eid, drevet, sponset eller godkjent av Statens vegvesen. Vi bruker ikke deres logo, navn eller design, og opptrer aldri på vegne av offentlig myndighet.</p>],
        ["Feil i opplysningene", <p key="d">Registerdata kan være forsinket eller feil. Offisielle endringer må meldes til registereieren, men si gjerne fra slik at vi kan ta det opp med leverandøren.</p>],
        ["Skjermede opplysninger", <p key="e">Enkelte eiere har lovbestemt skjerming. For disse kjøretøyene vises ikke eieropplysninger, uavhengig av abonnement.</p>],
      ]}
    />
  );
}
