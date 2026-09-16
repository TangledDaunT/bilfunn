import { env } from "../env";
import type { LookupResult, Vehicle } from "./types";

/**
 * Statens vegvesen — "Kjøretøyopplysninger (tekniske data, enkeltoppslag)".
 *
 *   GET https://www.vegvesen.no/ws/no/vegvesen/kjoretoy/felles/datautlevering
 *       /enkeltoppslag/kjoretoydata?kjennemerke=AB12345
 *   Header: SVV-Authorization: Apikey <key>
 *
 * The response contains NO owner information — that is a separate, agreement-based
 * API (see lib/vehicle/owner.ts). Free key, max 50 000 calls per key per 24h.
 * Docs: https://autosys-kjoretoy-api.atlas.vegvesen.no/api-ui/index-enkeltoppslag.html
 *
 * The response is deeply nested and optional almost everywhere, so every path
 * below is defensive. Set SVV_LOG_RAW=true locally to dump a real payload and
 * verify the mappings against your own key before launch.
 */
const TIMEOUT_MS = 5000;

type Any = Record<string, any>;
const first = <T,>(v: T[] | undefined | null): T | undefined => (Array.isArray(v) ? v[0] : undefined);

export async function lookupSvv(plate: string): Promise<LookupResult> {
  const started = Date.now();
  if (!env.svv.key) {
    return { ok: false, code: "UNAUTHORIZED", status: 401, latencyMs: 0, message: "SVV_API_KEY is not set" };
  }
  const url = `${env.svv.baseUrl}?kjennemerke=${encodeURIComponent(plate)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "SVV-Authorization": `Apikey ${env.svv.key}`, Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    const latencyMs = Date.now() - started;
    if (res.status === 404) return { ok: false, code: "NOT_FOUND", status: 404, latencyMs };
    if (res.status === 401 || res.status === 403)
      return { ok: false, code: "UNAUTHORIZED", status: res.status, latencyMs };
    if (!res.ok) return { ok: false, code: "PROVIDER_ERROR", status: res.status, latencyMs };

    const json = (await res.json()) as Any;
    if (process.env.SVV_LOG_RAW === "true") console.log(JSON.stringify(json, null, 2));

    const record = first<Any>(json?.kjoretoydataListe);
    if (!record) return { ok: false, code: "NOT_FOUND", status: 404, latencyMs };
    return { ok: true, vehicle: mapSvv(plate, record), latencyMs };
  } catch (err: any) {
    const latencyMs = Date.now() - started;
    return {
      ok: false,
      code: "PROVIDER_ERROR",
      status: err?.name === "AbortError" ? 504 : 502,
      latencyMs,
      message: err?.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function mapSvv(plate: string, r: Any): Vehicle {
  const godkjenning = r?.godkjenning ?? {};
  const teknisk = godkjenning?.tekniskGodkjenning ?? {};
  const td: Any = teknisk?.tekniskeData ?? {};
  const generelt: Any = td?.generelt ?? {};
  const motor: Any = first<Any>(td?.motorOgDrivverk?.motor) ?? {};
  const drivstoff: Any = first<Any>(motor?.drivstoff) ?? {};
  const ytelse: Any = first<Any>(motor?.drivstoff?.[0]?.maksNettoEffekt ? motor.drivstoff : []) ?? {};
  const karosseri: Any = td?.karosseriOgLasteplan ?? {};
  const vekter: Any = td?.vekter ?? {};
  const dim: Any = td?.dimensjoner ?? {};
  const miljo: Any = first<Any>(td?.miljodata?.miljoOgdrivstoffGruppe) ?? {};
  const utslipp: Any = first<Any>(miljo?.forbrukOgUtslipp) ?? {};
  const dekk: Any =
    first<Any>(first<Any>(td?.dekkOgFelg?.akselDekkOgFelgKombinasjon)?.akselDekkOgFelg) ?? {};
  const kontroll: Any = r?.periodiskKjoretoyKontroll ?? {};
  const registrering: Any = r?.registrering ?? {};
  const forstegang: Any = r?.forstegangsregistrering ?? {};

  const merke = first<Any>(generelt?.merke)?.merke ?? null;
  const modell = first<string>(generelt?.handelsbetegnelse) ?? null;

  const firstRegNorway =
    forstegang?.registrertForstegangNorgeDato ??
    teknisk?.forstegangsGodkjenning?.forstegangRegistrertDato ??
    null;
  const firstRegAbroad = teknisk?.forstegangsGodkjenning?.gyldigFraDato ?? null;

  const year =
    (firstRegNorway && Number(String(firstRegNorway).slice(0, 4))) ||
    (firstRegAbroad && Number(String(firstRegAbroad).slice(0, 4))) ||
    null;

  return {
    plate,
    make: merke,
    model: modell,
    year,
    bodyType: karosseri?.karosseritype?.kodeNavn ?? generelt?.tekniskKode?.kodeNavn ?? null,
    color: first<Any>(karosseri?.rFarge)?.kodeNavn ?? null,

    vin: r?.kjoretoyId?.understellsnummer ?? null,
    fuel: drivstoff?.drivstoffKode?.kodeNavn ?? null,
    gearbox: td?.motorOgDrivverk?.girkassetype?.kodeNavn ?? null,
    powerKw:
      drivstoff?.maksNettoEffekt ??
      ytelse?.maksNettoEffekt ??
      first<Any>(motor?.motorYtelse)?.maksNettoEffekt ??
      null,
    displacementCc: motor?.slagvolum ?? null,
    co2: utslipp?.co2BlandetKjoring ?? utslipp?.co2 ?? null,
    euroClass: miljo?.euroKlasse?.kodeNavn ?? null,
    kerbWeightKg: vekter?.egenvekt ?? null,
    maxWeightKg: vekter?.tillattTotalvekt ?? vekter?.tekniskTillattTotalvekt ?? null,
    towingKg: vekter?.tillattTilhengervektMedBrems ?? null,
    lengthMm: dim?.lengde ?? null,
    widthMm: dim?.bredde ?? null,
    heightMm: dim?.hoyde ?? null,
    seats: td?.persontall?.sitteplasserTotalt ?? karosseri?.antallSitteplasser ?? null,
    doors: first<number>(karosseri?.antallDorer) ?? null,
    axles: td?.akslinger?.antallAksler ?? null,
    tyreDimension: dekk?.dekkdimensjon ?? null,

    lastInspection: kontroll?.sistGodkjent ?? null,
    nextInspection: kontroll?.kontrollfrist ?? null,
    registrationStatus: registrering?.registreringsstatus?.kodeNavn ?? null,
    firstRegistered: firstRegAbroad ?? firstRegNorway,
    firstRegisteredNorway: firstRegNorway,
    imported: Boolean(firstRegAbroad && firstRegNorway && firstRegAbroad !== firstRegNorway),
    vehicleGroup: godkjenning?.kjoretoyklassifisering?.beskrivelse ?? null,

    owner: null,
    source: "SVV",
    fetchedAt: new Date().toISOString(),
    simulated: false,
  };
}
