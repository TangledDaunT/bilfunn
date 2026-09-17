/* eslint-disable @next/next/no-img-element -- Original static SVG icons need no image transformation. */
import ContactForm from "./ContactForm";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Kontakt oss",
  "Hjelp med tjenesten, abonnementet eller en rapport.",
  "/kontakt",
);
export default function ContactPage() {
  return (
    <div className="design-page">
      <div className="design-container">
        <div className="page-intro">
          <p className="eyebrow">Vi hjelper deg videre</p>
          <h1>Hva lurer du på?</h1>
          <p>
            Spørsmål om tjenesten, abonnementet eller en rapport? Start her.
          </p>
        </div>
        <div className="contact-grid">
          <div className="contact-help">
            <div>
              <img src="/design/716f3.svg" width="27" height="27" alt="" />
              <h2>Kanskje svaret allerede finnes.</h2>
              <p>
                Vi har samlet svar på vanlige spørsmål om priser, datatilgang og
                kontoen din.
              </p>
              <a className="text-link" href="/faq">
                Se spørsmål og svar →
              </a>
            </div>
            <div>
              <img src="/design/05b06.svg" width="27" height="27" alt="" />
              <h2>Vil du avbestille?</h2>
              <p>Det gjør du enkelt selv fra Min side, uten å kontakte oss.</p>
              <a className="text-link" href="/konto">
                Administrer abonnement →
              </a>
            </div>
          </div>
          <div className="contact-card">
            <h2>Kontakt oss</h2>
            <p className="notice">
              Ikke send passord, betalingsinformasjon eller sensitive
              personopplysninger.
            </p>
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
