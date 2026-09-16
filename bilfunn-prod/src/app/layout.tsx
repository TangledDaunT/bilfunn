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
  title: { default: "Bilfunn – Hvem eier bilen?", template: "%s | Bilfunn" },
  description:
    "Søk opp et norsk registreringsnummer og få tilgang til kjøretøy- og eieropplysninger. 3 kr for 3 dager, deretter 249 kr/mnd. Si opp når du vil.",
  openGraph: { type: "website", locale: "nb_NO", siteName: "Bilfunn" },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <body>
        {await Header()}
        <main>{children}</main>
        <Footer />
        <CookieBar />
        <Analytics ga4={env.analytics.ga4} />
        <StructuredData />
      </body>
    </html>
  );
}
