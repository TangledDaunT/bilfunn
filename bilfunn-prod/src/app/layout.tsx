/* eslint-disable @next/next/no-css-tags -- Shared stylesheet also serves raw public HTML routes. */
import { headers } from "next/headers";
import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CookieBar from "@/components/CookieBar";
import Analytics from "@/components/Analytics";
import StructuredData from "@/components/StructuredData";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.baseUrl),
  title: {
    default: "Skiltnummeret.no – Kjøretøyopplysninger",
    template: "%s | Skiltnummeret.no",
  },
  description:
    "Søk opp et norsk registreringsnummer og få tilgang til tilgjengelige kjøretøyopplysninger. 3 kr for 3 dager, deretter 249 kr/mnd. Si opp når du vil.",
  openGraph: { type: "website", locale: "nb_NO", siteName: "Skiltnummeret.no" },
  icons: { icon: "/bilfunn-mark.svg" },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nb">
      <head>
        <link rel="preload" href="/fonts/subset-3.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/subset-1.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="stylesheet" href="/fonts/fonts.css" />
        <link rel="stylesheet" href="/design.css" />
      </head>
      <body>
        {await Header()}
        <main>{children}</main>
        <Footer />
        <CookieBar />
        <Analytics
          ga4={env.analytics.ga4}
          nonce={(await headers()).get("x-nonce") ?? undefined}
        />
        <StructuredData />
      </body>
    </html>
  );
}
