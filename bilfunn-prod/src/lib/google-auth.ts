import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { env } from "./env";
import { HttpError } from "./http";
export const googleConfigured = () =>
  Boolean(env.google.clientId && env.google.clientSecret);
export const googleRedirect = () => `${env.baseUrl}/api/auth/google/callback`;
export const oauthCookie =
  process.env.NODE_ENV === "production" ? "__Host-sk_oauth" : "sk_oauth";
/** Permit only supported same-site post-login destinations, excluding protocol-relative and escaped redirects. */
export function safeLoginNext(value: string | null | undefined) {
  return value &&
    /^\/(?:konto|kasse|admin)(?:[/?]|$)/.test(value) &&
    !/[\\\r\n]/.test(value)
    ? value
    : "/konto";
}
const keys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
  { timeoutDuration: 5000 },
);
export function googleIdentity(payload: JWTPayload, nonce: string) {
  if (
    payload.nonce !== nonce ||
    !payload.sub ||
    payload.sub.length > 255 ||
    payload.email_verified !== true ||
    typeof payload.email !== "string" ||
    payload.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)
  )
    throw new HttpError(401, "invalid_google_identity");
  return { subject: payload.sub, email: payload.email.trim().toLowerCase() };
}
export async function exchangeGoogleCode(
  code: string,
  verifier: string,
  nonce: string,
) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      redirect_uri: googleRedirect(),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  if (!response.ok) throw new HttpError(401, "google_exchange_failed");
  const data = await response.json();
  if (typeof data.id_token !== "string" || data.id_token.length > 16384)
    throw new HttpError(401, "invalid_google_token");
  const { payload } = await jwtVerify(data.id_token, keys, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: env.google.clientId,
    algorithms: ["RS256"],
    requiredClaims: ["exp", "iat", "sub", "iss", "aud"],
    maxTokenAge: "10m",
  });
  return googleIdentity(payload, nonce);
}
