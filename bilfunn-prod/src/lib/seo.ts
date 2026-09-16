import type { Metadata } from "next";

const siteName = "Bilfunn";

export function pageMetadata(
  title: string,
  description: string,
  path: string,
  index = true
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { title, description, type: "website", siteName, locale: "nb_NO", url: path },
  };
}
