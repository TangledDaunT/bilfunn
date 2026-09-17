import { headers } from "next/headers";
import { env } from "@/lib/env";

export default async function StructuredData() {
  const siteUrl = env.baseUrl;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Skiltnummeret.no",
        url: siteUrl,
        logo: `${siteUrl}/bilfunn-mark.svg`,
        email: "support@skiltnummeret.no",
      },
      {
        "@type": "WebSite",
        name: "Skiltnummeret.no",
        url: siteUrl,
        description:
          "Søk opp norske registreringsnummer og få kjøretøyopplysninger.",
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/kjoretoy/{search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <script
      nonce={(await headers()).get("x-nonce") ?? undefined}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
