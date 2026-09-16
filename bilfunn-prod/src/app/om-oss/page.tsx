export const metadata = { title: "Om oss" };

export default function AboutPage() {
  return (
    <div className="wrap" style={{ paddingTop: 28, maxWidth: 680 }}>
      <h1>Om oss</h1>
      <div className="card">
        <p>
          Bilfunn er en norsk tjeneste som gjør det enkelt for privatpersoner å slå opp opplysninger om et kjøretøy –
          før et bruktbilkjøp, etter en parkeringsepisode, eller når man bare lurer.
        </p>
        <p>
          Tekniske kjøretøyopplysninger hentes fra Statens vegvesens åpne API for kjøretøydata. Eieropplysninger krever
          en egen avtale og vises bare når den er på plass. Vi er en uavhengig kommersiell aktør og er ikke eid, drevet
          eller godkjent av Statens vegvesen eller andre myndigheter.
        </p>
        <p>
          Oppslag på personopplysninger krever at vi er tydelige: du skal alltid vite hva du betaler, hvor lenge
          tilgangen varer og hvordan du avslutter.
        </p>
        <dl className="spec">
          <dt>Selskap</dt><dd>Bilfunn AS</dd>
          <dt>Organisasjonsnummer</dt><dd>000 000 000 MVA</dd>
          <dt>Adresse</dt><dd>Storgata 1, 0155 Oslo</dd>
          <dt>Kundeservice</dt><dd>support@bilfunn.no</dd>
          <dt>Personvernansvarlig</dt><dd>personvern@bilfunn.no</dd>
        </dl>
      </div>
    </div>
  );
}
