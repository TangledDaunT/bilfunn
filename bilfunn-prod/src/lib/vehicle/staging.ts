import { PublicData } from "./public-model";
import type { LookupResult } from "./types";
export async function lookupStaging(plate: string): Promise<LookupResult> {
  if (process.env.STAGING_MODE !== "true")
    return { ok: false, code: "PROVIDER_ERROR", status: 503, latencyMs: 0 };
  const started = Date.now();
  try {
    const url = new URL(process.env.STAGING_VEHICLE_FIXTURE_URL || "");
    if (
      url.protocol !== "https:" ||
      url.hostname !== process.env.STAGING_FIXTURE_HOST
    )
      throw new Error("Invalid staging transport");
    url.searchParams.set("plate", plate);
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 404)
      return {
        ok: false,
        code: "NOT_FOUND",
        status: 404,
        latencyMs: Date.now() - started,
      };
    if (!response.ok) throw new Error("Fixture provider unavailable");
    const data = PublicData.parse(await response.json());
    if (data.plate !== plate) throw new Error("Fixture mismatch");
    return {
      ok: true,
      vehicle: {
        ...data,
        vehicleGroup: data.vehicleType,
        source: "STAGING",
        fetchedAt: new Date().toISOString(),
        simulated: true,
      },
      latencyMs: Date.now() - started,
    };
  } catch {
    return {
      ok: false,
      code: "PROVIDER_ERROR",
      status: 503,
      latencyMs: Date.now() - started,
    };
  }
}
