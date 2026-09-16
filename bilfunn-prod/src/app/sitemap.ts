import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/priser", "/faq", "/hvordan", "/om-oss", "/kontakt", "/vilkar", "/personvern", "/cookies", "/angrerett", "/datakilder"];
  return paths.map((p) => ({
    url: `${env.baseUrl}${p}`,
    lastModified: new Date(),
    changeFrequency: p === "" ? "daily" : "monthly",
    priority: p === "" ? 1 : 0.6,
  }));
}
