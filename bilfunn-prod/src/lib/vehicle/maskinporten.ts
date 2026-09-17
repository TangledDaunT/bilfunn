import { SignJWT, importPKCS8 } from "jose";
import { randomUUID } from "crypto";
import { env } from "../env";
let cached: { value: string; until: number } | null = null;
let inFlight: Promise<string> | null = null;
export async function maskinportenToken(): Promise<string> {
  if (cached && cached.until > Date.now() + 60_000) return cached.value;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const o = env.owner;
    if (
      !["https://maskinporten.no/", "https://test.maskinporten.no/"].includes(
        o.issuer,
      ) ||
      !o.clientId ||
      !o.privateKey ||
      !o.scope ||
      !o.keyId
    )
      throw new Error("Maskinporten configuration incomplete");
    const assertion = await new SignJWT({ scope: o.scope })
      .setProtectedHeader({ alg: "RS256", kid: o.keyId })
      .setIssuer(o.clientId)
      .setAudience(o.issuer)
      .setIssuedAt()
      .setExpirationTime("60s")
      .setJti(randomUUID())
      .sign(await importPKCS8(o.privateKey, "RS256"));
    const res = await fetch(`${o.issuer}token`, {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
      redirect: "error",
    });
    if (!res.ok) throw new Error("Maskinporten authentication failed");
    const body = await res.json();
    if (typeof body.access_token !== "string")
      throw new Error("Invalid token response");
    cached = {
      value: body.access_token,
      until: Date.now() + Math.min(Number(body.expires_in) || 60, 3600) * 1000,
    };
    return cached.value;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
