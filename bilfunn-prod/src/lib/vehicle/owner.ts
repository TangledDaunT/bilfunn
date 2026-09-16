import { env } from "../env";
import type { VehicleOwner } from "./types";

/**
 * Owner information.
 *
 * The open Statens vegvesen API deliberately returns no owner data. Owner fields
 * come from either:
 *   a) "Tekniske kjøretøyopplysninger med eierinformasjon" — requires a signed
 *      agreement with Statens vegvesen, an organisation number and authenticated
 *      access (test access is requested separately from production), or
 *   b) a commercial reseller with the equivalent rights.
 *
 * Until that is in place, OWNER_DATA_ENABLED stays false and the paid report
 * simply renders without the owner block. Do not enable it without written
 * confirmation of which fields may be displayed commercially.
 *
 * Wire your provider's response into `mapOwner` and nothing else changes.
 */
export async function lookupOwner(plate: string): Promise<VehicleOwner | null> {
  if (!env.owner.enabled || !env.owner.key || !env.owner.baseUrl) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${env.owner.baseUrl}?kjennemerke=${encodeURIComponent(plate)}`, {
      headers: { Authorization: `Bearer ${env.owner.key}`, Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return mapOwner(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Adjust to the contracted provider's payload once credentials exist.
export function mapOwner(raw: any): VehicleOwner | null {
  const eier = raw?.eierskap?.eier ?? raw?.owner ?? null;
  if (!eier) return null;
  const person = eier?.person;
  const org = eier?.enhet ?? eier?.organisasjon;
  const adresse = eier?.adresse ?? person?.adresse ?? org?.adresse ?? {};
  return {
    name:
      org?.navn ??
      [person?.fornavn, person?.mellomnavn, person?.etternavn].filter(Boolean).join(" ") ??
      null,
    type: org ? "COMPANY" : "PERSON",
    address: adresse?.adresselinje1 ?? adresse?.gateadresse ?? null,
    postalCode: adresse?.postnummer ?? null,
    city: adresse?.poststed ?? null,
    ownedSince: raw?.eierskap?.fomTidspunkt ?? null,
    ownerCount: raw?.antallEiere ?? null,
    history: raw?.eierhistorikk ?? undefined,
  };
}
