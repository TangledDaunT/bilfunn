import { env } from "../env";
import { lookupSvv } from "./svv";
import { lookupSimulated } from "./simulated";
import { lookupOwner } from "./owner";
import { isValidPlate, normalizePlate } from "../plate";
import type { LookupResult, Vehicle } from "./types";

export type { Vehicle, LookupResult } from "./types";

/**
 * The single entry point for vehicle data.
 *
 * Caching: none. Provider terms and the fact that a registration number is itself
 * personal data under Norwegian law both point the same way — we fetch per request
 * and keep nothing. If the contracted provider explicitly permits caching, add it
 * here and nowhere else.
 */
export async function lookupVehicle(rawPlate: string): Promise<LookupResult> {
  const plate = normalizePlate(rawPlate);
  if (!isValidPlate(plate)) return { ok: false, code: "INVALID_PLATE", status: 400, latencyMs: 0 };

  const result = env.svv.key ? await lookupSvv(plate) : await lookupSimulated(plate);
  if (!result.ok) return result;

  // Owner data is a separate, agreement-gated call; absent until contracted.
  const owner = await lookupOwner(plate);
  if (owner) result.vehicle.owner = owner;
  return result;
}

/** The subset shown before payment: enough to confirm the right car, nothing more. */
export function freePreview(v: Vehicle) {
  return {
    plate: v.plate,
    make: v.make,
    model: v.model,
    year: v.year,
    bodyType: v.bodyType,
    color: v.color,
    simulated: v.simulated,
  };
}
