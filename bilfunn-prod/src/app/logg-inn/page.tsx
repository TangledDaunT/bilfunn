import { googleConfigured, safeLoginNext } from "@/lib/google-auth";
import { getCurrentUser } from "@/lib/session";
import LoginForm from "./LoginForm";
import { pageMetadata } from "@/lib/seo";
import { demoLoginConfigured } from "@/lib/env";
export const metadata = pageMetadata(
  "Logg inn",
  "Logg inn på Skiltnummeret.no for å administrere tilgang og abonnement.",
  "/logg-inn",
  false,
);
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams: input,
}: {
  searchParams: Promise<{ token?: string; next?: string; error?: string }>;
}) {
  const searchParams = await input;
  const next = safeLoginNext(searchParams.next);
  const user = await getCurrentUser();
  const messages: Record<string, string> = {
    google_unavailable:
      "Google-innlogging er ikke tilgjengelig ennå. Bruk e-post.",
    google_failed:
      "Google-innlogging kunne ikke fullføres. Prøv igjen eller bruk e-post.",
    google_cancelled:
      "Google-innlogging ble avbrutt. Du kan prøve igjen eller bruke e-post.",
    link_required:
      "Logg inn på den eksisterende kontoen med e-post først. Åpne deretter innloggingssiden og velg Koble til Google.",
  };
  return (
    <div className="wrap" style={{ paddingTop: 28, maxWidth: 480 }}>
      <div className="card">
        <h1 style={{ fontSize: "1.45rem" }}>Logg inn</h1>
        <p className="muted small">
          {searchParams.token
            ? "Bekreft innlogging med engangslenken din."
            : "Vi sender en engangskode til e-postadressen din. Ingen passord å huske."}
        </p>
        {searchParams.error && messages[searchParams.error] && (
          <p role="alert" className="note">
            {messages[searchParams.error]}
          </p>
        )}
        {!searchParams.token && (
          <div className="google-login">
            {googleConfigured() ? (
              <a
                className="google-button"
                href={`/api/auth/google/start?next=${encodeURIComponent(next)}`}
              >
                {user ? "Koble til Google" : "Fortsett med Google"}
              </a>
            ) : (
              <p className="muted small">
                Google-innlogging er ikke tilgjengelig ennå. Bruk e-post
                nedenfor.
              </p>
            )}
            {user && googleConfigured() && (
              <p className="small muted">
                Koble Google med samme e-postadresse til kontoen din. Krever
                nylig innlogging.
              </p>
            )}
            <p className="login-divider">eller med e-post</p>
          </div>
        )}
        <LoginForm
          token={searchParams.token}
          next={next}
          passwordLogin={demoLoginConfigured()}
        />
      </div>
    </div>
  );
}
