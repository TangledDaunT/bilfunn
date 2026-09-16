import { env } from "@/lib/env";

export default function StructuredData() {
  const siteUrl = env.baseUrl;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Bilfunn",
        url: siteUrl,
        logo: `${siteUrl}/bilfunn-mark.svg`,
        email: "support@bilfunn.no",
      },
      {
        "@type": "WebSite",
        name: "Bilfunn",
        url: siteUrl,
        description: "Søk opp norske registreringsnummer og få kjøretøyopplysninger.",
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/kjoretoy/{search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
