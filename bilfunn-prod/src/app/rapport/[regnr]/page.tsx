import Link from "next/link";
import { headers } from "next/headers";
import { clientIp, hashIp } from "@/lib/crypto";
import { rateLimit } from "@/lib/rateLimit";
import { notFound, redirect } from "next/navigation";
import { PlateTag } from "@/components/Plate";
import { lookupVehicle } from "@/lib/vehicle";
import { normalizePlate, isValidPlate } from "@/lib/plate";
import { getCurrentUser } from "@/lib/session";
import { getConfig } from "@/lib/config";
import { hasAccess, consumeSearch, searchAllowance } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { track } from "@/lib/analytics";
import { formatDate } from "@/lib/money";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Kjøretøyrapport",
  description: "Skiltnummeret.no kjøretøyrapport.",
  robots: { index: false, follow: false },
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) =>
  value === null || value === undefined || value === "" ? null : (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );

export default async function ReportPage({
  params: input,
}: {
  params: Promise<{ regnr: string }>;
}) {
  const params = await input;
  const plate = normalizePlate(params.regnr);
  if (!isValidPlate(plate)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/logg-inn?next=${encodeURIComponent(`/rapport/${plate}`)}`);
  const cfg = await getConfig();
  const sub = user?.subscriptions?.[0] ?? null;

  if (!user || !hasAccess(sub, cfg.cancelKeepsAccess)) {
    return (
      <div className="wrap" style={{ paddingTop: 28 }}>
        <div className="card">
          <h1 style={{ fontSize: "1.4rem" }}>Tilgangen er ikke aktiv</h1>
          <p>Eieropplysninger: not available in this data source</p>
          <p className="muted">
            Abonnementet ditt gir ikke tilgang akkurat nå. Start et nytt søk,
            eller gå til Min side for å fornye.
          </p>
          <Link className="btn" href="/">
            Nytt søk
          </Link>{" "}
          <Link className="btn ghost" href="/konto">
            Min side
          </Link>
        </div>
      </div>
    );
  }

  const ipLimit = await rateLimit(
    `report:${hashIp(clientIp(await headers()))}`,
    cfg.ipSearchesPerHour,
    3600_000,
  );
  if (!ipLimit.ok)
    return (
      <div className="wrap">
        <h1>For mange søk</h1>
        <p role="alert">
          Vent{" "}
          {Math.max(
            1,
            Math.ceil((ipLimit.resetAt.getTime() - Date.now()) / 1000),
          )}{" "}
          sekunder før du søker igjen.
        </p>
        <Link href="/konto">Min side</Link>
      </div>
    );

  const allowanceBefore = await searchAllowance(user.id, sub);
  const repeated =
    !cfg.duplicatesCount &&
    (await prisma.search.findFirst({
      where: {
        userId: user.id,
        plate,
        counted: true,
        createdAt: {
          gte: new Date(
            Math.max(sub!.periodStart.getTime(), Date.now() - 86400_000),
          ),
        },
      },
      select: { id: true },
    }));
  if (allowanceBefore.left <= 0 && !repeated)
    return (
      <div className="wrap">
        <h1>Søkegrensen er nådd</h1>
        <Link href="/konto">Min side</Link>
      </div>
    );
  const result = await lookupVehicle(plate);
  if (!result.ok) {
    if (result.code === "NOT_FOUND") notFound();
    return (
      <div className="wrap" style={{ paddingTop: 28 }}>
        <div className="note bad">
          Kjøretøyregisteret svarer ikke akkurat nå, og oppslaget er ikke
          trukket fra kvoten din. Prøv igjen om et øyeblikk.
        </div>
      </div>
    );
  }

  try {
    await consumeSearch(user.id, sub!, plate);
  } catch {
    return (
      <div className="wrap">
        <h1>Oppslaget kunne ikke fullføres</h1>
        <Link href="/konto">Kontroller tilgangen din</Link>
      </div>
    );
  }
  await track("report_viewed", { plate }, { userId: user.id });

  const v = result.vehicle;
  const allowance = await searchAllowance(
    user.id,
    await prisma.subscription.findUnique({ where: { id: sub!.id } }),
  );
  const inspectionOverdue = v.nextInspection
    ? new Date(v.nextInspection).getTime() < Date.now()
    : false;
  const km = (n?: number | null, unit = "") =>
    n === null || n === undefined ? null : `${n}${unit}`;

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div className="steps">
        <span>1. Søk</span> <span>›</span> <span>2. Kjøretøy</span>{" "}
        <span>›</span> <span>3. Betaling</span> <span>›</span>{" "}
        <span className="on">4. Rapport</span>
      </div>

      <div className="card">
        <div className="rowsplit">
          <div>
            <h1 style={{ fontSize: "1.6rem", marginBottom: 2 }}>
              {[v.make, v.model].filter(Boolean).join(" ") || "Kjøretøy"}
            </h1>
            <p className="muted" style={{ margin: 0 }}>
              {[v.year, v.bodyType, v.fuel, v.color]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <PlateTag plate={plate} />
            <div className="tiny" style={{ marginTop: 6 }}>
              Oppslag {formatDate(v.fetchedAt, "nb-NO", true)}
            </div>
          </div>
        </div>
        <div
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}
        >
          {v.registrationStatus && (
            <span
              className={`tag ${v.registrationStatus === "Registrert" ? "ok" : "bad"}`}
            >
              {v.registrationStatus}
            </span>
          )}
          {v.nextInspection && (
            <span className={`tag ${inspectionOverdue ? "bad" : "ok"}`}>
              {inspectionOverdue
                ? "EU-kontroll forfalt"
                : "EU-kontroll i orden"}
            </span>
          )}
          {v.imported && <span className="tag warn">Importert</span>}
          {v.simulated && <span className="tag warn">Simulerte data</span>}
        </div>
      </div>

      <p className="note">
        Eieropplysninger: not available in this data source
      </p>

      <div className="card">
        <h2>Identity &amp; registration</h2>
        <dl className="spec">
          <Row label="Registreringsnummer" value={v.plate} />
          <Row label="Merke" value={v.make} />
          <Row label="Modell" value={v.model} />
          <Row label="Understellsnummer" value={v.vin} />
          <Row label="Farge" value={v.color} />
          <Row label="Karosseri" value={v.bodyType} />
          <Row label="Status" value={v.registrationStatus} />
          <Row label="Kjøretøygruppe" value={v.vehicleGroup} />
          <Row
            label="Først registrert"
            value={v.firstRegistered ? formatDate(v.firstRegistered) : null}
          />
          <Row
            label="Først registrert i Norge"
            value={
              v.firstRegisteredNorway
                ? formatDate(v.firstRegisteredNorway)
                : null
            }
          />
          <Row label="Importert" value={v.imported ? "Ja" : "Nei"} />
        </dl>
      </div>

      <div className="grid g2" style={{ marginTop: 14 }}>
        <div className="card">
          <h2>Technical specification</h2>
          <dl className="spec">
            <Row label="Drivstoff" value={v.fuel} />
            <Row label="Girkasse" value={v.gearbox} />
            <Row
              label="Effekt"
              value={
                v.powerKw
                  ? `${v.powerKw} kW (${Math.round(v.powerKw * 1.36)} hk)`
                  : null
              }
            />
            <Row label="Slagvolum" value={km(v.displacementCc, " cm³")} />
            <Row label="CO₂" value={km(v.co2, " g/km")} />
            <Row label="Egenvekt" value={km(v.kerbWeightKg, " kg")} />
            <Row label="Totalvekt" value={km(v.maxWeightKg, " kg")} />
            <Row label="Tilhengervekt m/brems" value={km(v.towingKg, " kg")} />
            <Row
              label="Lengde / bredde / høyde"
              value={
                v.lengthMm
                  ? `${v.lengthMm} / ${v.widthMm ?? "–"} / ${v.heightMm ?? "–"} mm`
                  : null
              }
            />
            <Row label="Seter" value={v.seats} />
            <Row label="Dører" value={v.doors} />
            <Row label="Aksler" value={v.axles} />
            <Row label="Dekkdimensjon" value={v.tyreDimension} />
          </dl>
        </div>

        <div>
          <div className="card">
            <h2>EU inspection</h2>
            <dl className="spec">
              <Row
                label="Sist godkjent"
                value={v.lastInspection ? formatDate(v.lastInspection) : null}
              />
              <Row
                label="Neste frist"
                value={v.nextInspection ? formatDate(v.nextInspection) : null}
              />
              <Row
                label="Status"
                value={
                  v.nextInspection ? (
                    <span className={`tag ${inspectionOverdue ? "bad" : "ok"}`}>
                      {inspectionOverdue ? "Forfalt" : "Gyldig"}
                    </span>
                  ) : null
                }
              />
            </dl>
            {!v.nextInspection && (
              <p className="muted small">
                Ingen kontrollfrist registrert for dette kjøretøyet.
              </p>
            )}
          </div>
        </div>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <h2>Approval &amp; compliance</h2>
        <dl className="spec">
          <Row label="Utslippsklasse" value={v.euroClass} />
        </dl>
        {!v.euroClass && (
          <p className="muted">
            Ingen godkjenningsopplysninger tilgjengelige i rapporten.
          </p>
        )}
      </section>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="rowsplit">
          <div>
            <strong>Søk brukt i denne perioden:</strong>{" "}
            <span className="mono-num">
              {allowance.used} / {allowance.limit}
            </span>
            <div className="tiny">
              Gjentatte oppslag på samme skilt innen 24 timer teller ikke.
            </div>
          </div>
          <div
            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
            className="noprint"
          >
            <PrintButton />
            <Link className="btn sm" href="/">
              Nytt søk
            </Link>
          </div>
        </div>
      </div>

      <p className="tiny" style={{ marginTop: 14, maxWidth: "80ch" }}>
        Opplysningene er hentet fra{" "}
        {v.source === "SIMULATED" ? "en simulert kilde" : "Statens vegvesen"} på
        oppslagstidspunktet og kan avvike fra gjeldende registerdata.
        Skiltnummeret.no er ikke tilknyttet Statens vegvesen.
      </p>
    </div>
  );
}
