import { lookupSvv } from "./svv";
import { publicHtml, escapeHtml as e, searchForm } from "../public-html";
let inFlight = false;
let requests = 0;
let lastRequest = 0;
export function localPreviewEnabled(req: Request) {
  return (
    process.env.NODE_ENV === "development" &&
    !process.env.VERCEL &&
    process.env.LOCAL_VEHICLE_PREVIEW === "true" &&
    ["localhost:3100", "127.0.0.1:3100"].includes(req.headers.get("host") || "")
  );
}
export async function localVehiclePreview(plate: string) {
  const render = (status: number, body: string) => {
    const response = publicHtml({
      title: `${plate} - Lokal kjøretøytest`,
      description: "Privat lokal test av tekniske kjøretøydata",
      path: `/${plate}`,
      index: false,
      ttl: 0,
      status,
      body: `<p class="note">Lokal API-test. Ingen betaling. Opplysninger lagres ikke eller publiseres.</p>${body}${searchForm}`,
    });
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  };
  if (inFlight || requests >= 20 || Date.now() - lastRequest < 2000)
    return render(
      429,
      "<h1>Testgrensen er nådd</h1><p>Vent litt mellom søk. Maksimalt 20 oppslag per oppstart.</p>",
    );
  inFlight = true;
  requests++;
  lastRequest = Date.now();
  try {
    const result = await lookupSvv(plate);
    if (!result.ok) {
      const text =
        result.code === "NOT_FOUND"
          ? "Kjøretøyet ble ikke funnet hos Statens vegvesen. Kontroller registreringsnummeret."
          : result.code === "UNAUTHORIZED"
            ? "API-nøkkelen ble ikke godkjent for denne tjenesten."
            : "Statens vegvesen er midlertidig utilgjengelig. Prøv igjen senere.";
      return render(
        result.code === "NOT_FOUND" ? 404 : 503,
        `<h1>${e(text)}</h1>`,
      );
    }
    const v = result.vehicle;
    const labels: Record<string, string> = {
      plate: "Registreringsnummer",
      make: "Merke",
      model: "Modell",
      year: "Registreringsår",
      bodyType: "Karosseri",
      color: "Farge",
      vin: "Understellsnummer",
      fuel: "Drivstoff",
      gearbox: "Girkasse",
      powerKw: "Effekt (kW)",
      displacementCc: "Slagvolum (cm³)",
      co2: "CO₂ (g/km)",
      euroClass: "Utslippsklasse",
      kerbWeightKg: "Egenvekt (kg)",
      maxWeightKg: "Totalvekt (kg)",
      towingKg: "Tilhengervekt (kg)",
      lengthMm: "Lengde (mm)",
      widthMm: "Bredde (mm)",
      heightMm: "Høyde (mm)",
      seats: "Seter",
      doors: "Dører",
      axles: "Aksler",
      tyreDimension: "Dekkdimensjon",
      lastInspection: "Sist EU-godkjent",
      nextInspection: "Neste kontrollfrist",
      inspectionOverdue: "Kontrollfrist utløpt",
      registrationStatus: "Registreringsstatus",
      firstRegistered: "Først registrert",
      firstRegisteredNorway: "Først registrert i Norge",
      imported: "Importert",
      vehicleGroup: "Kjøretøygruppe",
      fetchedAt: "Hentet fra kilden",
    };
    const rows = Object.entries(labels)
      .map(([key, label]) => {
        const value = v[key as keyof typeof v];
        return `<dt>${e(label)}</dt><dd>${e(value == null ? "Ikke oppgitt" : typeof value === "boolean" ? (value ? "Ja" : "Nei") : value)}</dd>`;
      })
      .join("");
    return render(
      200,
      `<h1>${e([v.make, v.model].filter(Boolean).join(" ") || plate)}</h1><section class="card"><dl>${rows}</dl></section><p>Eieropplysninger: not available in this data source</p><p>Viser feltene som er koblet til rapporten. Komplett teknisk respons kan undersøkes i <a href="http://127.0.0.1:3102/">API-testverktøyet</a>.</p>`,
    );
  } finally {
    inFlight = false;
  }
}
