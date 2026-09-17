"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

/** GA4 loads only after consent, and never before. */
export default function Analytics({
  ga4,
  nonce,
}: {
  ga4?: string;
  nonce?: string;
}) {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        const c = JSON.parse(localStorage.getItem("bf_consent") || "null");
        setOk(Boolean(c?.analytics));
      } catch {
        setOk(false);
      }
    };
    read();
    window.addEventListener("bf:consent", read);
    return () => window.removeEventListener("bf:consent", read);
  }, []);

  if (!ga4 || !ok) return null;
  return (
    <>
      <Script
        nonce={nonce}
        src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`}
        strategy="afterInteractive"
      />
      <Script nonce={nonce} id="ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga4}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}
