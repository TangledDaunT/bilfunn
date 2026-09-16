import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/db";
import { formatDate, formatOre } from "@/lib/money";
import { Check } from "@/components/icons";
import { normalizePlate } from "@/lib/plate";

export const dynamic = "force-dynamic";
export const metadata = { title: "Betaling bekreftet", robots: { index: false } };

export default async function ReceiptPage({ searchParams }: { searchParams: { nr?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/logg-inn");
  const cfg = await getConfig();
  const sub = user.subscriptions[0];
  const payment = await prisma.payment.findFirst({
    where: { userId: user.id, status: "SUCCEEDED" },
    orderBy: { createdAt: "desc" },
  });
  const plate = normalizePlate(searchParams.nr || "");

  return (
    <div className="wrap" style={{ paddingTop: 28, maxWidth: 560 }}>
      <div className="card center">
        <span className="tag ok" style={{ fontSize: ".92rem", padding: "6px 13px" }}>
          <Check /> Betaling gjennomført
        </span>
        <h1 style={{ fontSize: "1.55rem", marginTop: 14 }}>Tilgangen er aktivert</h1>
        <p className="muted">
          Vi har belastet {formatOre(payment?.amountOre ?? cfg.introPriceOre)} og sendt kvittering til {user.email}.
        </p>
        <div className="note" style={{ textAlign: "left", margin: "18px 0" }}>
          <div className="rowsplit">
            <span>Kvitteringsnummer</span>
            <strong>{payment?.receiptNumber ?? "–"}</strong>
          </div>
          {sub && (
            <>
              <div className="rowsplit" style={{ marginTop: 6 }}>
                <span>Tilgang til og med</span>
                <strong>{formatDate(sub.periodEnd, "nb-NO", true)}</strong>
              </div>
              <div className="rowsplit" style={{ marginTop: 6 }}>
                <span>Neste trekk</span>
                <strong>
                  {formatOre(cfg.renewalPriceOre)} · {formatDate(sub.periodEnd)}
                </strong>
              </div>
            </>
          )}
        </div>
        {plate ? (
          <Link className="btn block lg" href={`/rapport/${plate}`}>
            Se kjøretøyrapporten
          </Link>
        ) : (
          <Link className="btn block lg" href="/">
            Gjør et søk
          </Link>
        )}
        <p style={{ marginTop: 14 }}>
          <Link href="/konto">Administrer abonnementet på Min side</Link>
        </p>
      </div>
    </div>
  );
}
