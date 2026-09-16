import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/db";
import { hasAccess, searchAllowance } from "@/lib/billing";
import { formatDate, formatOre } from "@/lib/money";
import AccountActions from "./AccountActions";

export const dynamic = "force-dynamic";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("Min side", "Administrer Bilfunn-abonnementet, kvitteringer og søkehistorikk.", "/konto", false);

const STATUS_LABEL: Record<string, string> = {
  TRIALING: "Introduksjonsperiode",
  ACTIVE: "Aktivt",
  PAST_DUE: "Betaling mislyktes",
  CANCELED: "Sagt opp",
  EXPIRED: "Utløpt",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/logg-inn");

  const cfg = await getConfig();
  const sub = user.subscriptions[0] ?? null;
  const access = hasAccess(sub, cfg.cancelKeepsAccess);
  const allowance = await searchAllowance(user.id, sub);
  const [payments, searches] = await Promise.all([
    prisma.payment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.search.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 25 }),
  ]);

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div className="rowsplit" style={{ marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: "1.55rem", margin: 0 }}>Min side</h1>
          <p className="muted small" style={{ margin: 0 }}>
            {user.email}
          </p>
        </div>
        <Link className="btn sm" href="/">
          Nytt søk
        </Link>
      </div>

      {sub?.status === "PAST_DUE" && (
        <div className="note bad" style={{ marginBottom: 14 }}>
          Siste betaling mislyktes. {sub.nextRetryAt && <>Vi prøver igjen {formatDate(sub.nextRetryAt)}. </>}
          Oppdater betalingsmåten for å beholde tilgangen
          {sub.graceUntil && <> til {formatDate(sub.graceUntil)}</>}.
        </div>
      )}
      {sub?.status === "CANCELED" && (
        <div className="note warn" style={{ marginBottom: 14 }}>
          Abonnementet er sagt opp. Du har tilgang til {formatDate(sub.periodEnd, "nb-NO", true)}, og det blir ingen
          flere trekk.
        </div>
      )}

      <div className="card">
        <div className="rowsplit">
          <h2 style={{ margin: 0 }}>Abonnement</h2>
          <span className={`tag ${sub?.status === "PAST_DUE" ? "bad" : access ? "ok" : ""}`}>
            {sub ? STATUS_LABEL[sub.status] : "Ingen"}
          </span>
        </div>
        <dl className="spec" style={{ marginTop: 12 }}>
          <dt>Tilgang</dt>
          <dd>
            {access ? <span className="tag ok">Aktiv</span> : <span className="tag bad">Ikke aktiv</span>}
          </dd>
          <dt>Pris</dt>
          <dd>
            {sub?.status === "TRIALING"
              ? `${formatOre(cfg.introPriceOre)} → ${formatOre(cfg.renewalPriceOre)}/mnd`
              : `${formatOre(cfg.renewalPriceOre)}/mnd`}
          </dd>
          <dt>{sub?.status === "CANCELED" ? "Tilgang til" : "Neste trekk"}</dt>
          <dd>{sub ? formatDate(sub.periodEnd, "nb-NO", true) : "–"}</dd>
          <dt>Betalingsmåte</dt>
          <dd>
            {sub?.paymentBrand === "vipps" ? "Vipps" : "Kort"}
            {sub?.paymentLast4 ? ` ••••${sub.paymentLast4}` : ""}
          </dd>
          <dt>Søk brukt</dt>
          <dd className="mono-num">
            {allowance.used} / {allowance.limit}
          </dd>
          <dt>Kunde siden</dt>
          <dd>{formatDate(user.createdAt)}</dd>
        </dl>
        <AccountActions status={sub?.status ?? null} />
      </div>

      <div className="card">
        <h2>Kvitteringer</h2>
        {payments.length ? (
          <div className="scrollx">
            <table className="data">
              <thead>
                <tr>
                  <th>Dato</th>
                  <th>Kvittering</th>
                  <th>Beskrivelse</th>
                  <th>Beløp</th>
                  <th>Herav mva.</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.createdAt)}</td>
                    <td>{p.receiptNumber}</td>
                    <td>{p.kind === "INTRO" ? "Introduksjonstilgang" : "Månedsabonnement"}</td>
                    <td className="mono-num">{formatOre(p.amountOre)}</td>
                    <td className="mono-num">{formatOre(p.vatOre)}</td>
                    <td>
                      {p.status === "SUCCEEDED" ? (
                        <span className="tag ok">Betalt</span>
                      ) : p.status === "FAILED" ? (
                        <span className="tag bad">Mislyktes</span>
                      ) : (
                        <span className="tag">Venter</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted small">Ingen betalinger ennå.</p>
        )}
      </div>

      <div className="card">
        <h2>Søkehistorikk</h2>
        {searches.length ? (
          <div className="scrollx">
            <table className="data">
              <thead>
                <tr>
                  <th>Tidspunkt</th>
                  <th>Skilt</th>
                  <th>Resultat</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {searches.map((s) => (
                  <tr key={s.id}>
                    <td>{formatDate(s.createdAt, "nb-NO", true)}</td>
                    <td>{s.plate}</td>
                    <td>
                      {s.result === "FOUND" ? <span className="tag ok">Treff</span> : <span className="tag">Ingen treff</span>}
                    </td>
                    <td>{s.result === "FOUND" && <Link href={`/rapport/${s.plate}`}>Åpne</Link>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted small">Ingen søk registrert.</p>
        )}
      </div>

      <div className="card">
        <h2>Konto og personvern</h2>
        <p className="muted small">
          Du kan laste ned opplysningene vi har om deg, eller be om sletting. Sletting fjerner konto, søkehistorikk og
          kontaktopplysninger. Betalingskvitteringer beholdes i regnskapet så lenge bokføringsloven krever.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a className="btn sm ghost" href="/api/account/export">
            Last ned mine data
          </a>
          <AccountActions status={sub?.status ?? null} onlyDelete />
        </div>
      </div>
    </div>
  );
}
