import { pageMetadata } from "@/lib/seo";
import DesignFaq from "@/components/DesignFaq";
import DesignCta from "@/components/DesignCta";
export const metadata = pageMetadata(
  "Spørsmål og svar",
  "Finn svar om priser, abonnement og kjøretøyopplysninger.",
  "/faq",
);
export default function FaqPage() {
  return (
    <div className="design-page">
      <div className="design-container">
        <div className="page-intro">
          <p className="eyebrow">Spørsmål og svar</p>
          <h1>Litt mindre usikkerhet.</h1>
          <p>
            Her finner du svar om tjenesten, abonnementet og opplysningene du
            får se.
          </p>
        </div>
        <DesignFaq filters />
      </div>
      <DesignCta />
    </div>
  );
}
