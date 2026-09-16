import LegalPage from "@/components/Legal";
export const metadata = { title: "Vilkår for bruk" };

export default function Terms() {
  return (
    <LegalPage
      title="Vilkår for bruk"
      sections={[
        ["1. Om tjenesten", <p key="a">Bilfunn AS (org.nr 000 000 000) leverer oppslag på norske kjøretøy mot betaling. Tjenesten er uavhengig og drives ikke av offentlig myndighet.</p>],
        ["2. Abonnement og pris", <p key="b">Første betaling er 3 kr og gir tilgang i 3 dager (72 timer) fra betalingstidspunktet. Deretter fornyes abonnementet automatisk til 249 kr per måned inntil det sies opp. Introduksjonstilbudet gjelder én gang per kunde og per betalingsmåte.</p>],
        ["3. Oppsigelse", <p key="c">Du kan si opp når som helst på Min side. Oppsigelsen stopper alle framtidige trekk umiddelbart. Tilgangen varer ut perioden du allerede har betalt for. Det er ingen oppsigelsestid og ingen gebyrer.</p>],
        ["4. Bruk av opplysningene", <p key="d">Opplysningene er til personlig, ikke-kommersiell bruk. Du kan ikke bruke tjenesten til markedsføring, systematisk innsamling, videresalg, kartlegging av enkeltpersoner, trakassering eller automatisert nedlasting. Kontoer kan sperres ved mistanke om misbruk.</p>],
        ["5. Søkegrenser", <p key="e">Inntil 10 oppslag i introduksjonsperioden og 50 per måned. Gjentatte oppslag på samme kjennemerke innen 24 timer teller ikke. Grensene kan justeres for å beskytte tjenesten mot misbruk.</p>],
        ["6. Nøyaktighet", <p key="f">Vi viderefører opplysninger fra eksterne kilder og kan ikke garantere at de til enhver tid er korrekte eller fullstendige. Tjenesten erstatter ikke offisielle registerutskrifter.</p>],
        ["7. Ansvar", <p key="g">Vårt ansvar er begrenset til beløpet du har betalt de siste tolv månedene, med mindre annet følger av ufravikelig lovgivning.</p>],
        ["8. Tvister", <p key="h">Norsk rett gjelder. Forbrukere kan klage til Forbrukertilsynet eller Forbrukerklageutvalget.</p>],
      ]}
    />
  );
}
