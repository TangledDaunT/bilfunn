import type { LookupResult, Vehicle } from "./types";

/**
 * Deterministic stand-in used only when SVV_API_KEY is absent, so the product can
 * be demonstrated and tested end to end before credentials exist. Every response
 * is clearly flagged `simulated: true` and the UI shows a banner. Never reachable
 * in production once the key is set.
 */
const MAKES: Array<[string, string[]]> = [
  ["TOYOTA", ["RAV4", "Yaris", "Corolla Touring Sports", "Hilux"]],
  ["VOLKSWAGEN", ["Golf", "Passat Variant", "ID.4", "Tiguan"]],
  ["VOLVO", ["V70", "XC60", "V60", "XC40"]],
  ["TESLA", ["Model 3", "Model Y"]],
  ["SKODA", ["Octavia Combi", "Superb", "Enyaq iV"]],
  ["AUDI", ["A4 Avant", "Q5", "e-tron"]],
  ["BMW", ["320d Touring", "i3", "X1"]],
  ["NISSAN", ["Leaf", "Qashqai"]],
  ["HYUNDAI", ["Kona electric", "Ioniq 5", "Tucson"]],
  ["MERCEDES-BENZ", ["C 220 d", "E 300 de", "GLC"]],
];
const COLORS = ["Sort", "Hvit", "Grå", "Sølv", "Blå", "Rød", "Mørk grønn"];
const FUELS = ["Diesel", "Bensin", "Elektrisk", "Hybrid", "Ladbar hybrid"];
const BODIES = ["Stasjonsvogn", "Personbil", "Flerbruksbil", "Kombinert bil"];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
const pick = <T,>(a: T[], n: number) => a[n % a.length];
const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function lookupSimulated(plate: string): Promise<LookupResult> {
  const started = Date.now();
  await new Promise((r) => setTimeout(r, 180 + Math.random() * 320));
  const h = hash(plate);
  const latencyMs = Date.now() - started;
  if (h % 41 === 0) return { ok: false, code: "PROVIDER_ERROR", status: 503, latencyMs };
  if (h % 17 === 0) return { ok: false, code: "NOT_FOUND", status: 404, latencyMs };

  const [make, models] = pick(MAKES, h);
  const fuel = pick(FUELS, h >> 5);
  const ev = fuel === "Elektrisk";
  const year = 2006 + ((h >> 7) % 19);
  const firstReg = new Date(Date.UTC(year, (h >> 11) % 12, 1 + ((h >> 13) % 27)));
  const lastInsp = new Date(Date.now() - ((h >> 4) % 900) * 86400000);
  const nextInsp = new Date(lastInsp.getTime() + 730 * 86400000);
  const weight = 1150 + (h % 900);

  const vehicle: Vehicle = {
    plate,
    make,
    model: pick(models, h >> 3),
    year,
    bodyType: pick(BODIES, h >> 15),
    color: pick(COLORS, h >> 9),
    vin: "SIM" + String(h).padStart(14, "0").slice(0, 14),
    fuel,
    gearbox: ev ? "Automat (1-trinn)" : (h >> 6) % 2 ? "Manuell" : "Automat",
    powerKw: ev ? 100 + (h % 220) : 66 + (h % 160),
    displacementCc: ev ? null : 1200 + (h % 1800),
    co2: ev ? 0 : 95 + (h % 120),
    euroClass: ev ? null : "Euro " + (4 + ((h >> 8) % 3)),
    kerbWeightKg: weight,
    maxWeightKg: weight + 480 + (h % 200),
    towingKg: 700 + (h % 1100),
    lengthMm: 4100 + (h % 900),
    widthMm: 1730 + (h % 180),
    heightMm: 1420 + (h % 300),
    seats: 5,
    doors: 5,
    axles: 2,
    tyreDimension: `${195 + (h % 5) * 10}/${45 + (h % 4) * 5}R${16 + (h % 3)}`,
    lastInspection: iso(lastInsp),
    nextInspection: iso(nextInsp),
    registrationStatus: (h >> 29) % 9 === 0 ? "Avregistrert" : "Registrert",
    firstRegistered: iso(firstReg),
    firstRegisteredNorway: iso(firstReg),
    imported: (h >> 25) % 5 === 0,
    vehicleGroup: "Personbil",
    owner: null,
    source: "SIMULATED",
    fetchedAt: new Date().toISOString(),
    simulated: true,
  };
  return { ok: true, vehicle, latencyMs };
}
