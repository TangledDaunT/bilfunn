import LegalPage from "@/components/Legal";
import ResetConsent from "./ResetConsent";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("Informasjonskapsler", "Les hvordan Bilfunn bruker nødvendige informasjonskapsler og samtykke.", "/cookies");

export default function Cookies() {
  return (
    <LegalPage
      title="Informasjonskapsler"
      sections={[
        ["Nødvendige", <p key="a">Holder deg innlogget, husker samtykkevalget og sikrer betalingsflyten. Kan ikke slås av.</p>],
        ["Analyse", <p key="b">Måler hvordan tjenesten brukes, for eksempel hvor mange som fullfører et søk. Settes kun med samtykke.</p>],
        ["Markedsføring", <p key="c">Brukes til annonsemåling hos tredjeparter. Settes kun med samtykke.</p>],
        ["Endre valget ditt", <ResetConsent key="d" />],
      ]}
    />
  );
}
