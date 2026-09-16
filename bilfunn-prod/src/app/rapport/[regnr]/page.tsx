import Link from "next/link";
import { redirect } from "next/navigation";
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
export const metadata = { robots: { index: false, follow: false } };

const Row = ({ label, value }: { label: string; value: React.ReactNode }) =>
  value === null || value === undefined || value === "" ? null : (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );

export default async function ReportPage({ params }: { params: { regnr: string } }) {
  const plate = normalizePlate(params.regnr);
  if (!isValidPlate(plate)) redirect("/");

  const cfg = await getConfig();
  const user = await getCurrentUser();
  const sub = user?.subscriptions?.[0] ?? null;

  if (!user || !hasAccess(sub, cfg.cancelKeepsAccess)) {
    return (
      <div className="wrap" style={{ paddingTop: 28 }}>
        <div className="card">
          <h1 style={{ fontSize: "1.4rem" }}>Tilgangen er ikke aktiv</h1>
          <p className="muted">
            Abonnementet ditt gir ikke tilgang akkurat nå. Start et nytt søk, eller gå til Min side for å fornye.
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

  const result = await lookupVehicle(plate);
  if (!result.ok) {
    return (
      <div className="wrap" style={{ paddingTop: 28 }}>
        <div className="note bad">
          Kjøretøyregisteret svarer ikke akkurat nå, og oppslaget er ikke trukket fra kvoten din. Prøv igjen om et
          øyeblikk.
        </div>
      </div>
    );
  }

  const counted = await consumeSearch(user.id, sub!, plate);
  await prisma.search.create({
    data: { plate, result: "FOUND", latencyMs: result.latencyMs, userId: user.id, counted },
  });
  await track("report_viewed", { plate }, { userId: user.id });

  const v = result.vehicle;
  const allowance = await searchAllowance(user.id, await prisma.subscription.findUnique({ where: { id: sub!.id } }));
  const inspectionOverdue = v.nextInspection ? new Date(v.nextInspection).getTime() < Date.now() : false;
  const km = (n?: number | null, unit = "") => (n === null || n === undefined ? null : `${n}${unit}`);

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div className="steps">
        <span>1. Søk</span> <span>›</span> <span>2. Kjøretøy</span> <span>›</span> <span>3. Betaling</span>{" "}
        <span>›</span> <span className="on">4. Rapport</span>
      </div>

      <div className="card">
        <div className="rowsplit">
          <div>
            <h1 style={{ fontSize: "1.6rem", marginBottom: 2 }}>
              {[v.make, v.model].filter(Boolean).join(" ") || "Kjøretøy"}
            </h1>
            <p className="muted" style={{ margin: 0 }}>
              {[v.year, v.bodyType, v.fuel, v.color].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <PlateTag plate={plate} />
            <div className="tiny" style={{ marginTop: 6 }}>
              Oppslag {formatDate(v.fetchedAt, "nb-NO", true)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          {v.registrationStatus && (
            <span className={`tag ${v.registrationStatus === "Registrert" ? "ok" : "bad"}`}>
              {v.registrationStatus}
            </span>
          )}
          {v.nextInspection && (
            <span className={`tag ${inspectionOverdue ? "bad" : "ok"}`}>
              {inspectionOverdue ? "EU-kontroll forfalt" : "EU-kontroll i orden"}
            </span>
          )}
          {v.imported && <span className="tag warn">Importert</span>}
          {v.simulated && <span className="tag warn">Simulerte data</span>}
        </div>
      </div>

      {v.owner ? (
        <div className="card">
          <h2>Eieropplysninger</h2>
          <dl className="spec">
            <Row label="Nåværende eier" value={v.owner.name} />
            <Row label="Eiertype" value={v.owner.type === "COMPANY" ? "Foretak" : "Privatperson"} />
            <Row
              label="Registrert adresse"
              value={[v.owner.address, [v.owner.postalCode, v.owner.city].filter(Boolean).join(" ")]
                .filter(Boolean)
                .join(", ")}
            />
            <Row label="Eier siden" value={v.owner.ownedSince ? formatDate(v.owner.ownedSince) : null} />
            <Row label="Antall eiere" value={v.owner.ownerCount} />
          </dl>
          <p className="tiny" style={{ margin: "12px 0 0" }}>
            Eieropplysninger vises kun der de er tilgjengelige fra kilden og lovlig kan vises. Opplysningene skal ikke
            brukes til markedsføring, kartlegging eller kontakt i strid med personvernregelverket.
          </p>
        </div>
      ) : (
        <div className="card">
          <h2>Eieropplysninger</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Eieropplysninger er ikke tilgjengelige for dette kjøretøyet. Statens vegvesens åpne API leverer ikke
            eierdata; visning krever en egen avtale som ikke er aktiv for denne installasjonen.
          </p>
        </div>
      )}

      <div className="grid g2" style={{ marginTop: 14 }}>
        <div className="card">
          <h2>Teknisk</h2>
          <dl className="spec">
            <Row label="Understellsnummer" value={v.vin} />
            <Row label="Drivstoff" value={v.fuel} />
            <Row label="Girkasse" value={v.gearbox} />
            <Row
              label="Effekt"
              value={v.powerKw ? `${v.powerKw} kW (${Math.round(v.powerKw * 1.36)} hk)` : null}
            />
            <Row label="Slagvolum" value={km(v.displacementCc, " cm³")} />
            <Row label="CO₂" value={km(v.co2, " g/km")} />
            <Row label="Utslippsklasse" value={v.euroClass} />
            <Row label="Egenvekt" value={km(v.kerbWeightKg, " kg")} />
            <Row label="Totalvekt" value={km(v.maxWeightKg, " kg")} />
            <Row label="Tilhengervekt m/brems" value={km(v.towingKg, " kg")} />
            <Row
              label="Lengde / bredde / høyde"
              value={v.lengthMm ? `${v.lengthMm} / ${v.widthMm ?? "–"} / ${v.heightMm ?? "–"} mm` : null}
            />
            <Row label="Seter" value={v.seats} />
            <Row label="Dører" value={v.doors} />
            <Row label="Aksler" value={v.axles} />
            <Row label="Dekkdimensjon" value={v.tyreDimension} />
          </dl>
        </div>

        <div>
          <div className="card">
            <h2>EU-kontroll</h2>
            <dl className="spec">
              <Row label="Sist godkjent" value={v.lastInspection ? formatDate(v.lastInspection) : null} />
              <Row label="Neste frist" value={v.nextInspection ? formatDate(v.nextInspection) : null} />
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
            {!v.nextInspection && <p className="muted small">Ingen kontrollfrist registrert for dette kjøretøyet.</p>}
          </div>
          <div className="card">
            <h2>Registrering</h2>
            <dl className="spec">
              <Row label="Status" value={v.registrationStatus} />
              <Row label="Kjøretøygruppe" value={v.vehicleGroup} />
              <Row label="Først registrert" value={v.firstRegistered ? formatDate(v.firstRegistered) : null} />
              <Row
                label="Først registrert i Norge"
                value={v.firstRegisteredNorway ? formatDate(v.firstRegisteredNorway) : null}
              />
              <Row label="Importert" value={v.imported ? "Ja" : "Nei"} />
            </dl>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="rowsplit">
          <div>
            <strong>Søk brukt i denne perioden:</strong>{" "}
            <span className="mono-num">
              {allowance.used} / {allowance.limit}
            </span>
            <div className="tiny">Gjentatte oppslag på samme skilt innen 24 timer teller ikke.</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="noprint">
            <PrintButton />
            <Link className="btn sm" href="/">
              Nytt søk
            </Link>
          </div>
        </div>
      </div>

      <p className="tiny" style={{ marginTop: 14, maxWidth: "80ch" }}>
        Opplysningene er hentet fra {v.source === "SVV" ? "Statens vegvesens åpne API for kjøretøyopplysninger" : "en simulert kilde"} på
        oppslagstidspunktet og kan avvike fra gjeldende registerdata. Bilfunn er ikke tilknyttet Statens vegvesen.
      </p>
    </div>
  );
}
