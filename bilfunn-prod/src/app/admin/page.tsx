import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getConfig } from "@/lib/config";
import { formatDate, formatOre } from "@/lib/money";
import { integrationStatus } from "@/lib/env";
import ConfigForm from "./ConfigForm";

export const dynamic = "force-dynamic";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("Administrasjon", "Bilfunns interne administrasjon.", "/admin", false);

const TABS = [
  ["oversikt", "Oversikt"],
  ["kunder", "Kunder"],
  ["abonnement", "Abonnement"],
  ["betalinger", "Betalinger"],
  ["sok", "Søk"],
  ["epost", "E-post"],
  ["saker", "Saker"],
  ["hendelser", "Hendelser"],
  ["drift", "Drift"],
  ["innstillinger", "Innstillinger"],
] as const;

export default async function AdminPage({ searchParams }: { searchParams: { t?: string } }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/logg-inn");
  const tab = searchParams.t ?? "oversikt";
  const cfg = await getConfig();

  const content =
    tab === "kunder" ? await Customers() :
    tab === "abonnement" ? await Subscriptions() :
    tab === "betalinger" ? await Payments() :
    tab === "sok" ? await Searches() :
    tab === "epost" ? await Emails() :
    tab === "saker" ? await Tickets() :
    tab === "hendelser" ? await Events() :
    tab === "drift" ? await Ops() :
    tab === "innstillinger" ? <ConfigForm config={JSON.parse(JSON.stringify(cfg))} /> :
    await Overview();

  return (
    <div className="wrap wide" style={{ paddingTop: 24 }}>
      <div className="rowsplit" style={{ marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Administrasjon</h1>
          <p className="tiny" style={{ margin: 0 }}>Innlogget som {admin.email}</p>
        </div>
      </div>
      <div className="steps" style={{ gap: 4 }}>
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin?t=${k}`} className={`btn sm ${tab === k ? "" : "ghost"}`} style={{ padding: "6px 11px" }}>
            {label}
          </Link>
        ))}
      </div>
      {content}
    </div>
  );
}

function Kpi({ v, l }: { v: React.ReactNode; l: string }) {
  return (
    <div className="kpi">
      <div className="v">{v}</div>
      <div className="l">{l}</div>
    </div>
  );
}

async function Overview() {
  const [users, trialing, active, pastDue, canceled, payments, searches, events] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.subscription.count({ where: { status: "TRIALING" } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "PAST_DUE" } }),
    prisma.subscription.count({ where: { status: { in: ["CANCELED", "EXPIRED"] } } }),
    prisma.payment.findMany({ where: { status: "SUCCEEDED" }, select: { amountOre: true, refundedOre: true } }),
    prisma.search.count(),
    prisma.event.groupBy({ by: ["name"], _count: { name: true } }),
  ]);

  const revenue = payments.reduce((a, p) => a + p.amountOre - p.refundedOre, 0);
  const cfg = await getConfig();
  const mrr = active * cfg.renewalPriceOre;
  const count = (n: string) => events.find((e) => e.name === n)?._count.name ?? 0;
  const paywall = count("paywall_viewed");
  const bought = count("checkout_completed");

  const funnel: Array<[string, number]> = [
    ["Betalingsmur vist", paywall],
    ["Kasse startet", count("checkout_started")],
    ["Kjøp fullført", bought],
    ["Rapport vist", count("report_viewed")],
    ["Oppsigelser", count("subscription_canceled")],
  ];

  return (
    <>
      <div className="grid g3" style={{ marginBottom: 14 }}>
        <Kpi v={users} l="Kunder" />
        <Kpi v={trialing + active} l="Aktive abonnement" />
        <Kpi v={formatOre(mrr)} l="MRR" />
        <Kpi v={formatOre(revenue)} l="Omsetning totalt" />
        <Kpi v={paywall ? `${Math.round((bought / paywall) * 100)} %` : "–"} l="Betalingsmur → kjøp" />
        <Kpi v={pastDue} l="Betalingsproblemer" />
        <Kpi v={canceled} l="Oppsagt/utløpt" />
        <Kpi v={searches} l="Søk totalt" />
      </div>
      <div className="card">
        <h3>Trakt</h3>
        <div className="scrollx">
          <table className="data">
            <tbody>
              {funnel.map(([label, n]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td className="mono-num" style={{ width: 70 }}>{n}</td>
                  <td style={{ width: "60%" }}>
                    <div style={{ height: 8, borderRadius: 4, background: "var(--cta)", width: `${Math.min(100, n * 6)}%`, minWidth: 2 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

async function Customers() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { searches: true } } },
  });
  return (
    <div className="card">
      <h3>Kunder</h3>
      <div className="scrollx">
        <table className="data">
          <thead>
            <tr><th>E-post</th><th>Opprettet</th><th>Status</th><th>Periode slutt</th><th>Søk</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{formatDate(u.createdAt)}</td>
                <td>{u.subscriptions[0]?.status ?? "–"}</td>
                <td>{u.subscriptions[0] ? formatDate(u.subscriptions[0].periodEnd) : "–"}</td>
                <td className="mono-num">{u._count.searches}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!users.length && <p className="muted small">Ingen kunder ennå.</p>}
    </div>
  );
}

async function Subscriptions() {
  const subs = await prisma.subscription.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: true } });
  return (
    <div className="card">
      <h3>Abonnement</h3>
      <div className="scrollx">
        <table className="data">
          <thead><tr><th>Kunde</th><th>Status</th><th>Leverandør</th><th>Periode slutt</th><th>Fornyelser</th><th>Søk</th><th>Neste forsøk</th></tr></thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id}>
                <td>{s.user.email}</td><td>{s.status}</td><td>{s.provider}</td>
                <td>{formatDate(s.periodEnd, "nb-NO", true)}</td>
                <td className="mono-num">{s.renewals}</td>
                <td className="mono-num">{s.searchesThisPeriod}</td>
                <td>{s.nextRetryAt ? formatDate(s.nextRetryAt) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function Payments() {
  const payments = await prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: true } });
  return (
    <div className="card">
      <h3>Betalinger</h3>
      <div className="scrollx">
        <table className="data">
          <thead><tr><th>Kvittering</th><th>Dato</th><th>Kunde</th><th>Type</th><th>Beløp</th><th>Leverandør</th><th>Status</th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.receiptNumber}</td><td>{formatDate(p.createdAt, "nb-NO", true)}</td>
                <td>{p.user.email}</td><td>{p.kind}</td>
                <td className="mono-num">{formatOre(p.amountOre)}</td><td>{p.provider}</td>
                <td>{p.status === "SUCCEEDED" ? <span className="tag ok">OK</span> : p.status === "FAILED" ? <span className="tag bad">{p.failureCode ?? "feilet"}</span> : <span className="tag">venter</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function Searches() {
  const searches = await prisma.search.findMany({ orderBy: { createdAt: "desc" }, take: 80, include: { user: true } });
  return (
    <div className="card">
      <h3>Søkelogg</h3>
      <p className="muted small">IP-adresser lagres bare som hash, og kjøretøydata lagres ikke.</p>
      <div className="scrollx">
        <table className="data">
          <thead><tr><th>Tid</th><th>Skilt</th><th>Resultat</th><th>Svartid</th><th>Kunde</th><th>Teller</th></tr></thead>
          <tbody>
            {searches.map((s) => (
              <tr key={s.id}>
                <td>{formatDate(s.createdAt, "nb-NO", true)}</td><td>{s.plate}</td>
                <td>{s.result === "FOUND" ? <span className="tag ok">FOUND</span> : <span className="tag">{s.result}</span>}</td>
                <td className="mono-num">{s.latencyMs} ms</td>
                <td>{s.user?.email ?? "–"}</td><td>{s.counted ? "ja" : "nei"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function Emails() {
  const emails = await prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 40 });
  return (
    <div className="card">
      <h3>Utgående e-post</h3>
      {emails.map((e) => (
        <div key={e.id} style={{ borderBottom: "1px solid var(--line-2)", padding: "10px 0" }}>
          <div className="rowsplit">
            <strong>{e.subject}</strong>
            <span className="tiny">{formatDate(e.createdAt, "nb-NO", true)}</span>
          </div>
          <div className="tiny">
            Til {e.to} · {e.type} · {e.sentAt ? `sendt via ${e.provider}` : e.error ? `feil: ${e.error}` : "kun logget"}
          </div>
        </div>
      ))}
      {!emails.length && <p className="muted small">Ingen e-post sendt ennå.</p>}
    </div>
  );
}

async function Tickets() {
  const tickets = await prisma.ticket.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div className="card">
      <h3>Henvendelser</h3>
      {tickets.map((t) => (
        <div key={t.id} style={{ borderBottom: "1px solid var(--line-2)", padding: "10px 0" }}>
          <div className="rowsplit">
            <strong>{t.name} · {t.email}</strong>
            <span className="tiny">{formatDate(t.createdAt, "nb-NO", true)}</span>
          </div>
          <div className="tiny">{t.category}</div>
          <div className="small muted" style={{ marginTop: 4 }}>{t.message}</div>
        </div>
      ))}
      {!tickets.length && <p className="muted small">Ingen henvendelser.</p>}
    </div>
  );
}

async function Events() {
  const events = await prisma.event.findMany({ orderBy: { createdAt: "desc" }, take: 80 });
  return (
    <div className="card">
      <h3>Hendelseslogg</h3>
      <div className="scrollx">
        <table className="data">
          <thead><tr><th>Tid</th><th>Hendelse</th><th>Data</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>{formatDate(e.createdAt, "nb-NO", true)}</td>
                <td>{e.name}</td>
                <td style={{ whiteSpace: "normal" }}>{JSON.stringify(e.props)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function Ops() {
  const status = integrationStatus();
  const [recent, errors, audit] = await Promise.all([
    prisma.search.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { latencyMs: true, result: true } }),
    prisma.search.count({ where: { result: "PROVIDER_ERROR", createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    prisma.adminAudit.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const avg = recent.length ? Math.round(recent.reduce((a, s) => a + s.latencyMs, 0) / recent.length) : 0;

  return (
    <>
      <div className="grid g3" style={{ marginBottom: 14 }}>
        <Kpi v={status.vehicleApi} l="Kjøretøy-API" />
        <Kpi v={status.ownerApi} l="Eier-API" />
        <Kpi v={status.payments} l="Betaling" />
        <Kpi v={status.email} l="E-post" />
        <Kpi v={`${avg} ms`} l="Snitt svartid (50 siste)" />
        <Kpi v={errors} l="Leverandørfeil siste døgn" />
      </div>
      <div className="card">
        <h3>Integrasjoner</h3>
        <dl className="spec">
          <dt>Kjøretøydata</dt>
          <dd>{status.vehicleApi === "live" ? "Statens vegvesen, enkeltoppslag" : "Simulert – sett SVV_API_KEY"}</dd>
          <dt>Eierdata</dt>
          <dd>{status.ownerApi === "live" ? "Aktiv" : "Krever egen avtale – OWNER_API_KEY er ikke satt"}</dd>
          <dt>Mellomlagring</dt>
          <dd>Av</dd>
          <dt>Tidsavbrudd</dt>
          <dd>5000 ms</dd>
        </dl>
      </div>
      <div className="card">
        <h3>Endringslogg (admin)</h3>
        <div className="scrollx">
          <table className="data">
            <thead><tr><th>Tid</th><th>Bruker</th><th>Handling</th></tr></thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id}><td>{formatDate(a.createdAt, "nb-NO", true)}</td><td>{a.actor}</td><td>{a.action}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {!audit.length && <p className="muted small">Ingen endringer registrert.</p>}
      </div>
    </>
  );
}
