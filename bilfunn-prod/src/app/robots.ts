import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/konto", "/admin", "/rapport/", "/kjoretoy/", "/kasse", "/kvittering"] }],
    sitemap: `${env.baseUrl}/sitemap.xml`,
  };
}
