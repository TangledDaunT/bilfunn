import { createHash } from "crypto";
import { designHeader, designFooter, plateForm } from "./design";
import { env } from "./env";
import { HttpError } from "./http";
import { sessionNavigation } from "./session-navigation";
export const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ]!,
  );
export const searchForm = plateForm("regnr");
export function publicHtml(options: {
  title: string;
  description: string;
  path: string;
  body: string;
  index?: boolean;
  schema?: unknown[];
  status?: number;
  ttl?: number;
  tags?: string[];
  retryAfter?: number;
}) {
  const canonical = new URL(options.path, env.baseUrl).toString();
  const data = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: "Skiltnummeret.no", url: env.baseUrl },
      { "@type": "WebSite", name: "Skiltnummeret.no", url: env.baseUrl },
      ...(options.schema ?? []),
    ],
  }).replace(/</g, "\\u003c");
  const hash = createHash("sha256").update(data).digest("base64");
  const sessionHash = createHash("sha256").update(sessionNavigation).digest("base64");
  const robots =
    process.env.STAGING_MODE === "true" || options.index === false
      ? "noindex, follow"
      : "index, follow";
  const html = `<!doctype html><html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(options.title)}</title><meta name="description" content="${escapeHtml(options.description)}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta name="robots" content="${robots}"><meta property="og:title" content="${escapeHtml(options.title)}"><meta property="og:description" content="${escapeHtml(options.description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:type" content="website"><meta property="og:locale" content="nb_NO"><meta property="og:image" content="${escapeHtml(new URL("/opengraph-image", env.baseUrl).toString())}"><link rel="icon" href="/bilfunn-mark.svg" type="image/svg+xml"><link rel="preload" href="/fonts/subset-3.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/fonts/subset-1.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/fonts/fonts.css"><link rel="stylesheet" href="/public.css"><link rel="stylesheet" href="/design.css"><script type="application/ld+json">${data}</script></head><body><a class="skip" href="#main">Hopp til innhold</a>${designHeader}<main id="main" class="${options.path === "/" ? "design-root" : ""}">${options.body}</main>${designFooter}</body></html>`;
  const status = options.status ?? 200;
  const ttl = status === 200 ? Math.max(0, Math.floor(options.ttl ?? 300)) : 0;
  return new Response(html.replace("</body>", `<script>${sessionNavigation}</script></body>`), {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Vercel-CDN-Cache-Control": ttl
        ? `public, s-maxage=${ttl}, must-revalidate`
        : "no-store",
      "CDN-Cache-Control": "no-store",
      "Vercel-Cache-Tag": (options.tags ?? ["editorial"]).join(","),
      "Content-Security-Policy": `default-src 'none'; script-src 'sha256-${hash}' 'sha256-${sessionHash}'; connect-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'`,
      "X-Content-Type-Options": "nosniff",
      ...(options.retryAfter
        ? { "Retry-After": String(options.retryAfter) }
        : status === 503
          ? { "Retry-After": "30" }
          : {}),
    },
  });
}
export function publicError(error: unknown, path: string) {
  const status = error instanceof HttpError ? error.status : 503;
  return publicHtml({
    title:
      status === 404 || status === 410
        ? "Siden finnes ikke | Skiltnummeret.no"
        : "Midlertidig utilgjengelig | Skiltnummeret.no",
    description: "Søk etter kjøretøyopplysninger.",
    path,
    index: false,
    status,
    retryAfter: error instanceof HttpError ? error.retryAfter : undefined,
    body: `<h1>${status === 404 || status === 410 ? "Siden finnes ikke" : "Opplysningene er midlertidig utilgjengelige"}</h1><p>${status === 429 && error instanceof HttpError && error.retryAfter ? `For mange forsøk. Vent ${error.retryAfter} sekunder før du prøver igjen.` : `Prøv et nytt søk${status === 503 ? " om litt" : ""}.`}</p>${searchForm}`,
  });
}
export function breadcrumb(name: string, path: string) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: env.baseUrl },
      { "@type": "ListItem", position: 2, name, item: `${env.baseUrl}${path}` },
    ],
  };
}
