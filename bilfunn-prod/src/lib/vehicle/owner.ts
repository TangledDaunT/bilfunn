import { env } from "../env";
import { maskinportenToken } from "./maskinporten";
import { mapSvv } from "./svv";
import type { LookupResult } from "./types";
// Enable only after contract and field mapping have been validated against the selected service.
export async function lookupOwnerVehicle(plate: string): Promise<LookupResult> {
  const started = Date.now();
  try {
    const url = new URL(env.owner.baseUrl);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".vegvesen.no"))
      throw new Error("Invalid provider host");
    url.searchParams.set("kjennemerke", plate);
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${await maskinportenToken()}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
      redirect: "error",
    });
    if (res.status === 404)
      return {
        ok: false,
        code: "NOT_FOUND",
        status: 404,
        latencyMs: Date.now() - started,
      };
    if (!res.ok) throw new Error("Provider unavailable");
    const raw = await res.json();
    // Reject unknown response contracts instead of publishing a guessed mapping.
    if (!Array.isArray(raw.kjoretoydataListe))
      throw new Error("Provider mapping requires validation");
    if (!raw.kjoretoydataListe.length)
      return {
        ok: false,
        code: "NOT_FOUND",
        status: 404,
        latencyMs: Date.now() - started,
      };
    const vehicle = mapSvv(plate, raw.kjoretoydataListe[0]);
    vehicle.source = "OWNER_API";
    // Personal data is intentionally excluded until an independently verified owner mapper exists.
    vehicle.owner = null;
    return { ok: true, vehicle, latencyMs: Date.now() - started };
  } catch {
    return {
      ok: false,
      code: "PROVIDER_ERROR",
      status: 503,
      latencyMs: Date.now() - started,
    };
  }
}
