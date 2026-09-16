// One normalised vehicle model. Every provider adapter maps into this shape, so
// swapping or adding a data source never touches the UI.
export type VehicleOwner = {
  name?: string | null;
  type?: "PERSON" | "COMPANY" | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  ownedSince?: string | null;
  ownerCount?: number | null;
  history?: Array<{ name: string; type: "PERSON" | "COMPANY"; from: string; to?: string | null }>;
};

export type Vehicle = {
  plate: string;
  // free preview
  make?: string | null;
  model?: string | null;
  year?: number | null;
  bodyType?: string | null;
  color?: string | null;
  // paid — technical
  vin?: string | null;
  fuel?: string | null;
  gearbox?: string | null;
  powerKw?: number | null;
  displacementCc?: number | null;
  co2?: number | null;
  euroClass?: string | null;
  kerbWeightKg?: number | null;
  maxWeightKg?: number | null;
  towingKg?: number | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  seats?: number | null;
  doors?: number | null;
  axles?: number | null;
  tyreDimension?: string | null;
  // inspection + registration
  lastInspection?: string | null;
  nextInspection?: string | null;
  registrationStatus?: string | null;
  firstRegistered?: string | null;
  firstRegisteredNorway?: string | null;
  imported?: boolean | null;
  vehicleGroup?: string | null;
  // owner — only populated when the owner agreement is live
  owner?: VehicleOwner | null;
  // provenance
  source: "SVV" | "OWNER_API" | "SIMULATED";
  fetchedAt: string;
  simulated: boolean;
};

export type LookupResult =
  | { ok: true; vehicle: Vehicle; latencyMs: number }
  | { ok: false; code: "NOT_FOUND" | "PROVIDER_ERROR" | "INVALID_PLATE" | "UNAUTHORIZED"; status: number; latencyMs: number; message?: string };
