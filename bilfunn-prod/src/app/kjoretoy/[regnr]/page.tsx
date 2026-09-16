import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { PlateTag } from "@/components/Plate";
import PlateSearch from "@/components/PlateSearch";
import UnlockButton from "./UnlockButton";
import { Check, Lock } from "@/components/icons";
import { lookupVehicle } from "@/lib/vehicle";
import { normalizePlate, isValidPlate, prettyPlate } from "@/lib/plate";
import { getConfig } from "@/lib/config";
import { formatOre } from "@/lib/money";
import { getCurrentUser } from "@/lib/session";
import { hasAccess, consumeSearch, searchAllowance } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { track } from "@/lib/analytics";
import { rateLimit } from "@/lib/rateLimit";
import { clientIp, hashIp } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { regnr: string } }) {
  const plate = normalizePlate(params.regnr);
  return {
    title: `${prettyPlate(plate)} – kjøretøyopplysninger`,
    description: `Se kjøretøy- og eieropplysninger for ${prettyPlate(plate)}.`,
    robots: { index: false, follow: false },
  };
}

export default async function VehiclePage({ params }: { params: { regnr: string } }) {
  const plate = normalizePlate(params.regnr);
  if (!isValidPlate(plate)) notFound();

  const cfg = await getConfig();
  const user = await getCurrentUser();
  const sub = user?.subscriptions?.[0] ?? null;
  const access = hasAccess(sub, cfg.cancelKeepsAccess);
  const ip = clientIp(headers());

  // Abuse control before the upstream call, so a scraper never reaches the API.
  const limited = await rateLimit(`search:ip:${hashIp(ip)}`, cfg.ipSearchesPerHour, 3600_000);
  if (!limited.ok) {
    await prisma.search.create({
      data: { plate, result: "RATE_LIMITED", userId: user?.id ?? null, ipHash: hashIp(ip) },
    });
    return (
      <div className="wrap" style={{ paddingTop: 28 }}>
        <div className="card">
          <h1 style={{ fontSize: "1.4rem" }}>For mange søk</h1>
          <p className="muted">
            Det er gjort mange søk fra denne tilkoblingen den siste timen. Vent litt før du prøver igjen.
          </p>
        </div>
      </div>
    );
  }

  if (access && sub) {
    const allowance = await searchAllowance(user!.id, sub);
    if (allowance.left <= 0) {
      return (
        <div className="wrap" style={{ paddingTop: 28 }}>
          <div className="card">
            <h1 style={{ fontSize: "1.4rem" }}>Søkegrensen er nådd</h1>
            <p className="muted">
              Du har brukt {allowance.used} av {allowance.limit} oppslag i denne perioden. Grensen nullstilles ved neste
              fornyelse.
            </p>
            <Link className="btn" href="/konto">
              Gå til Min side
            </Link>
          </div>
        </div>
      );
    }
    redirect(`/rapport/${plate}`);
  }

  const result = await lookupVehicle(plate);
  await prisma.search.create({
    data: {
      plate,
      result: result.ok ? "FOUND" : result.code,
      latencyMs: result.latencyMs,
      userId: user?.id ?? null,
      ipHash: hashIp(ip),
      counted: false,
    },
  });

  if (!result.ok) {
    await track("vehicle_not_found", { plate, code: result.code }, { userId: user?.id });
    const notFoundCase = result.code === "NOT_FOUND";
    return (
      <div className="wrap" style={{ paddingTop: 28 }}>
        <div className="card">
          <h1 style={{ fontSize: "1.45rem" }}>
            {notFoundCase ? "Ingen treff" : "Datakilden er utilgjengelig"}
          </h1>
          <p className="muted">
            {notFoundCase
              ? "Vi fant ingen kjøretøy med dette registreringsnummeret. Kontroller nummeret og prøv igjen."
              : "Kjøretøyregisteret svarer ikke akkurat nå. Prøv igjen om et øyeblikk – du er ikke belastet."}
          </p>
          <div style={{ maxWidth: 380, marginTop: 16 }}>
            <PlateSearch />
          </div>
          {notFoundCase && (
            <p className="tiny" style={{ marginTop: 14 }}>
              Avregistrerte kjøretøy, mopeder og enkelte tilhengere kan mangle i kilden.
            </p>
          )}
        </div>
      </div>
    );
  }

  const v = result.vehicle;
  await track("paywall_viewed", { plate }, { userId: user?.id });

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div className="steps">
        <span>1. Søk</span> <span>›</span> <span className="on">2. Kjøretøy</span> <span>›</span>{" "}
        <span>3. Betaling</span> <span>›</span> <span>4. Rapport</span>
      </div>

      <div className="card">
        <div className="rowsplit" style={{ alignItems: "flex-start" }}>
          <div>
            <span className="tag ok">
              <Check /> Kjøretøy funnet
            </span>
            <h1 style={{ fontSize: "1.55rem", margin: "10px 0 4px" }}>
              {[v.make, v.model].filter(Boolean).join(" ") || "Kjøretøy"}
            </h1>
            <p className="muted" style={{ margin: 0 }}>
              {[v.year, v.bodyType, v.color].filter(Boolean).join(" · ")}
            </p>
          </div>
          <PlateTag plate={plate} />
        </div>
        <p className="tiny" style={{ margin: "14px 0 0" }}>
          Gratis forhåndsvisning — kontroller at dette er riktig kjøretøy før du låser opp.
        </p>
      </div>

      <div className="card locked" style={{ marginTop: 14 }}>
        <h2>Låst informasjon</h2>
        <div className="blur" aria-hidden>
          <dl className="spec">
            <dt>Eier</dt>
            <dd>Kari Nordmann</dd>
            <dt>Adresse</dt>
            <dd>Storgata 14, 0155 Oslo</dd>
            <dt>Eier siden</dt>
            <dd>12. mars 2021</dd>
            <dt>Understellsnummer</dt>
            <dd>YV1XXXXXXXXXXXXXX</dd>
            <dt>Neste EU-kontroll</dt>
            <dd>30. november 2026</dd>
          </dl>
        </div>
        <div className="lockover">
          <div className="center" style={{ padding: "0 12px" }}>
            <span className="tag">
              <Lock /> Låst
            </span>
            <p className="small muted" style={{ margin: "10px auto 0", maxWidth: "36ch" }}>
              {cfg.ownerDataEnabled
                ? "Eieropplysninger, teknisk detalj, EU-kontroll og registreringshistorikk vises etter betaling."
                : "Teknisk detalj, EU-kontroll, registreringshistorikk og understellsnummer vises etter betaling."}
            </p>
          </div>
        </div>
      </div>

      <div className="pricebox" style={{ marginTop: 14 }}>
        <div className="top">
          <div className="amt">{formatOre(cfg.introPriceOre)}</div>
          <div style={{ opacity: 0.92 }}>for {cfg.introDays} dagers tilgang</div>
        </div>
        <div className="body">
          <ul className="terms-list">
            <li>
              <Check />
              <span>
                Du belastes <b>{formatOre(cfg.introPriceOre)}</b> i dag.
              </span>
            </li>
            <li>
              <Check />
              <span>
                Tilgangen varer i <b>{cfg.introDays} dager</b> ({cfg.introDays * 24} timer) og inkluderer inntil{" "}
                {cfg.introSearchLimit} oppslag.
              </span>
            </li>
            <li>
              <Check />
              <span>
                Deretter fornyes abonnementet automatisk til <b>{formatOre(cfg.renewalPriceOre)} per måned</b> inntil du
                sier opp.
              </span>
            </li>
            <li>
              <Check />
              <span>Du kan si opp når som helst på Min side. Vi varsler deg på e-post før første fornyelse.</span>
            </li>
          </ul>
          <UnlockButton plate={plate} label={`Lås opp for ${formatOre(cfg.introPriceOre)}`} />
          <p className="tiny center" style={{ margin: "10px 0 0" }}>
            Ved å fortsette godtar du <Link href="/vilkar">vilkårene</Link> og{" "}
            <Link href="/personvern">personvernerklæringen</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
