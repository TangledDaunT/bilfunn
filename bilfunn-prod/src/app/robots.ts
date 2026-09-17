export const dynamic = "force-dynamic";
import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  if (process.env.STAGING_MODE === "true")
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/konto",
          "/admin",
          "/rapport/",
          "/kasse",
          "/kvittering",
        ],
      },
    ],
    sitemap: `${env.baseUrl}/sitemap.xml`,
  };
}
