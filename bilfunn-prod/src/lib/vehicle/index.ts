import { env } from "../env";
import { lookupSvv } from "./svv";
import { lookupSimulated } from "./simulated";
import { isValidPlate, normalizePlate } from "../plate";
import { takeProviderQuota, providerFailure, providerLease } from "./quota";
import type { LookupResult, Vehicle } from "./types";
export type { Vehicle, LookupResult } from "./types";
/** Validate input and obtain shared provider capacity before lookup; production never falls back to simulated vehicle data. */
export async function lookupVehicle(
  raw: string,
  background = false,
): Promise<LookupResult> {
  const plate = normalizePlate(raw);
  if (!isValidPlate(plate))
    return { ok: false, code: "INVALID_PLATE", status: 400, latencyMs: 0 };
  if (env.svv.provider === "simulated" && process.env.NODE_ENV !== "production")
    return lookupSimulated(plate);
  if (!env.svv.validated || env.svv.provider === "disabled")
    return { ok: false, code: "PROVIDER_ERROR", status: 503, latencyMs: 0 };
  const release = await providerLease(background);
  if (!release)
    return { ok: false, code: "PROVIDER_ERROR", status: 503, latencyMs: 0 };
  try {
    if (!(await takeProviderQuota(background)))
      return { ok: false, code: "PROVIDER_ERROR", status: 503, latencyMs: 0 };
    // The owner service uses a different contract. It is deliberately not sent a standalone API key.
    const result =
      env.svv.provider === "staging-fixture"
        ? await (await import("./staging")).lookupStaging(plate)
        : env.svv.provider === "svv-owner"
          ? await (await import("./owner")).lookupOwnerVehicle(plate)
          : await lookupSvv(plate);
    if (!result.ok && result.code !== "NOT_FOUND") await providerFailure();
    return result;
  } finally {
    await release();
  }
}
/** Return the narrow preview contract; public SEO routes use their separately approved PublicData contract. */
export function freePreview(v: Vehicle) {
  const date = v.firstRegisteredNorway;
  const year =
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(date) &&
    Number.isFinite(Date.parse(date))
      ? date.slice(0, 4)
      : null;
  return {
    plate: v.plate,
    make: v.make ?? null,
    model: v.model ?? null,
    bodyType: v.bodyType ?? null,
    color: v.color ?? null,
    year,
  };
}
