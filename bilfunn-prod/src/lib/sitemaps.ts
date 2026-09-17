import { prisma } from "./db";
import { env } from "./env";
import { articles } from "./editorial";
import {
  policy,
  publicationEnabled,
  publicSources,
} from "./vehicle/public-store";
import { escapeHtml } from "./public-html";
export const xml = (s: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?>${s}`, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Vercel-CDN-Cache-Control": "public, s-maxage=60, must-revalidate",
      "Vercel-Cache-Tag": "vehicles,editorial",
    },
  });
export const loc = (path: string) =>
  escapeHtml(new URL(path, env.baseUrl).toString());
export async function sitemapIndex() {
  const p = publicationEnabled() ? await policy() : null;
  const shards = p
    ? await prisma.$queryRaw<
        Array<{ shard: number }>
      >`SELECT DISTINCT FLOOR(("catalogId" - 1) / 10000.0)::int AS shard FROM "PublicVehicle" WHERE ("source" IN ('SVV','OWNER_API') OR (${process.env.STAGING_MODE === "true"} AND "source"='STAGING')) AND "eligible"=true AND "policyVersion"=${p.version} AND "suppressed"=false AND "gone"=false AND "expiresAt">NOW()+INTERVAL '60 seconds' AND "fetchedAt">NOW()-(${env.svv.retentionHours} * INTERVAL '1 hour')+INTERVAL '60 seconds' ORDER BY shard`
    : [];
  return xml(
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${loc("/sitemap-pages.xml")}</loc></sitemap>${shards.map((s) => `<sitemap><loc>${loc(`/sitemaps/vehicles-${s.shard}.xml`)}</loc></sitemap>`).join("")}</sitemapindex>`,
  );
}
export async function editorialSitemap() {
  const entries = [...(await articles("pages")), ...(await articles("blogg"))];
  const base = [
    "/",
    "/priser",
    "/faq",
    "/hvordan",
    "/om-oss",
    "/kontakt",
    "/vilkar",
    "/personvern",
    "/cookies",
    "/angrerett",
    "/datakilder",
  ];
  return xml(
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${base.map((p) => `<url><loc>${loc(p)}</loc></url>`).join("")}${entries.map((p) => `<url><loc>${loc(p.path)}</loc><lastmod>${p.updated}</lastmod></url>`).join("")}</urlset>`,
  );
}
export async function vehicleSitemap(shard: number) {
  if (!publicationEnabled())
    return xml('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>');
  const p = await policy();
  const rows = await prisma.publicVehicle.findMany({
    where: {
      catalogId: { gte: shard * 10000 + 1, lte: (shard + 1) * 10000 },
      source: { in: publicSources() },
      fetchedAt: {
        gt: new Date(Date.now() - env.svv.retentionHours * 3600000 + 60000),
      },
      eligible: true,
      policyVersion: p.version,
      suppressed: false,
      gone: false,
      expiresAt: { gt: new Date(Date.now() + 60_000) },
    },
    take: 10000,
    orderBy: { catalogId: "asc" },
    select: { plate: true, changedAt: true },
  });
  return xml(
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows.map((r) => `<url><loc>${loc(`/${encodeURIComponent(r.plate)}`)}</loc><lastmod>${r.changedAt.toISOString()}</lastmod></url>`).join("")}</urlset>`,
  );
}
