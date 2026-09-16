import Link from "next/link";
import { getCurrentUser, isAdminEmail } from "@/lib/session";
import { integrationStatus } from "@/lib/env";

export default async function Header() {
  const user = await getCurrentUser().catch(() => null);
  const status = integrationStatus();
  return (
    <>
      {status.vehicleApi === "simulated" && (
        <div className="simbanner">
          Demomodus: kjøretøydata er simulert. Legg inn <code>SVV_API_KEY</code> for å hente ekte data fra Statens
          vegvesen.
        </div>
      )}
      <header className="site-header">
        <div className="bar">
          <Link className="brand" href="/">
            <span className="brandmark" aria-hidden>
              <i>N</i>
              <b>BF</b>
            </span>
            Bilfunn
          </Link>
          <nav>
            <Link href="/priser">Priser</Link>
            <Link href="/faq">Spørsmål</Link>
            <Link href="/kontakt">Kontakt</Link>
            {user ? <Link href="/konto">Min side</Link> : <Link href="/logg-inn">Logg inn</Link>}
            {user && isAdminEmail(user.email) && <Link href="/admin">Admin</Link>}
          </nav>
        </div>
      </header>
    </>
  );
}
