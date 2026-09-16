import LoginForm from "./LoginForm";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("Logg inn", "Logg inn på Bilfunn for å administrere tilgang og abonnement.", "/logg-inn", false);
export const dynamic = "force-dynamic";

export default function LoginPage({ searchParams }: { searchParams: { token?: string } }) {
  return (
    <div className="wrap" style={{ paddingTop: 28, maxWidth: 480 }}>
      <div className="card">
        <h1 style={{ fontSize: "1.45rem" }}>Logg inn</h1>
        <p className="muted small">Vi sender en engangskode til e-postadressen din. Ingen passord å huske.</p>
        <LoginForm token={searchParams.token} />
      </div>
    </div>
  );
}
