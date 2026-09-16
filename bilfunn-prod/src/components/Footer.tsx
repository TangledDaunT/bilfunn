import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="cols">
        <div>
          <h4>Om Bilfunn</h4>
          <p style={{ maxWidth: "34ch" }}>
            Bilfunn gir privatpersoner enkel tilgang til kjøretøyopplysninger i Norge.
          </p>
          <p className="tiny" style={{ color: "#92a8c7" }}>
            Bilfunn AS · Org.nr 000 000 000
            <br />
            Storgata 1, 0155 Oslo
          </p>
        </div>
        <div>
          <h4>Sider</h4>
          <ul>
            <li><Link href="/">Søk på skilt</Link></li>
            <li><Link href="/hvordan">Slik virker det</Link></li>
            <li><Link href="/priser">Priser</Link></li>
            <li><Link href="/faq">Spørsmål og svar</Link></li>
            <li><Link href="/om-oss">Om oss</Link></li>
          </ul>
        </div>
        <div>
          <h4>Juridisk</h4>
          <ul>
            <li><Link href="/vilkar">Vilkår</Link></li>
            <li><Link href="/personvern">Personvern</Link></li>
            <li><Link href="/cookies">Informasjonskapsler</Link></li>
            <li><Link href="/angrerett">Angrerett og refusjon</Link></li>
            <li><Link href="/datakilder">Om datakildene</Link></li>
          </ul>
        </div>
        <div>
          <h4>Kundeservice</h4>
          <ul>
            <li><Link href="/kontakt">Send oss en melding</Link></li>
            <li><Link href="/konto">Si opp abonnementet</Link></li>
            <li><a href="mailto:support@bilfunn.no">support@bilfunn.no</a></li>
          </ul>
        </div>
      </div>
      <p className="legal">
        Bilfunn er ikke eid, drevet eller godkjent av Statens vegvesen eller andre offentlige myndigheter.
        Kjøretøyopplysninger hentes fra tilgjengelige kilder og kan være ufullstendige eller utdaterte. Tjenesten skal
        ikke brukes til kartlegging, trakassering, markedsføring eller andre formål som strider mot
        personvernregelverket.
      </p>
      <p className="legal" style={{ borderTop: 0, paddingTop: 4 }}>
        © {new Date().getFullYear()} Bilfunn AS. Alle rettigheter forbeholdt.
      </p>
    </footer>
  );
}
