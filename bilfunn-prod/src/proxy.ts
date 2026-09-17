import { NextResponse, type NextRequest } from "next/server";
import { env } from "./lib/env";
const exempt = /^\/api\/(webhooks\/|jobs(?:\/|$)|cron\/|import$)/;
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    !exempt.test(path)
  ) {
    const origin = request.headers.get("origin");
    const expected = env.baseUrl;
    if (
      !expected ||
      origin !== expected ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
    if (Number(request.headers.get("content-length")) > 16384)
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }
  // Public route handlers produce complete HTML + matching hash CSP and status before responding.
  const publicRoute =
    /^\/(?:[A-ZÆØÅ0-9]{2,7}|kjoretoy(?:\/.*)?|blogg(?:\/.*)?|sitemap.*|robots\.txt|hvem-eier-bilen|registreringsnummer|regnr|regnummer|skiltnummer|bilnummer|bilskilt|bilregister|kjoretoyopplysninger|bilinfo|heftelser|eieropplysninger)$/.test(
      path,
    );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-nonce");
  requestHeaders.delete("content-security-policy");
  if (
    path === "/" ||
    path.startsWith("/api/vehicle/") ||
    path.startsWith("/sitemaps/") ||
    publicRoute
  )
    return NextResponse.next({ request: { headers: requestHeaders } });
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    ...(process.env.NODE_ENV === "production"
      ? ["upgrade-insecure-requests"]
      : []),
  ].join("; ");
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  if (
    path.startsWith("/api/") ||
    /^\/(konto|admin|rapport|kasse|kvittering|logg-inn)/.test(path)
  )
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|public.css|design.css|design/|fonts/|bilfunn-mark.svg).*)",
    },
  ],
};
