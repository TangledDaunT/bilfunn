import Link from "next/link";
import { redirect } from "next/navigation";
import CheckoutForm from "./CheckoutForm";
import { getConfig } from "@/lib/config";
import { formatOre } from "@/lib/money";
import { normalizePlate, isValidPlate, prettyPlate } from "@/lib/plate";
import { getCurrentUser } from "@/lib/session";
import { availableMethods } from "@/lib/payments";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fullfør tilgang", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: { nr?: string } }) {
  const plate = normalizePlate(searchParams.nr || "");
  if (!isValidPlate(plate)) redirect("/");
  const cfg = await getConfig();
  const user = await getCurrentUser();
  const methods = availableMethods();

  return (
    <div className="wrap" style={{ paddingTop: 24, maxWidth: 620 }}>
      <div className="steps">
        <span>1. Søk</span> <span>›</span> <span>2. Kjøretøy</span> <span>›</span>{" "}
        <span className="on">3. Betaling</span> <span>›</span> <span>4. Rapport</span>
      </div>

      <div className="card">
        <h1 style={{ fontSize: "1.45rem" }}>Fullfør tilgang</h1>
        <p className="muted small">
          Kontoen din opprettes automatisk med e-postadressen du oppgir. Ingen passord er nødvendig.
        </p>

        <div className="note" style={{ margin: "16px 0" }}>
          <div className="rowsplit">
            <span>Kjøretøy</span>
            <strong>{prettyPlate(plate)}</strong>
          </div>
          <div className="rowsplit" style={{ marginTop: 6 }}>
            <span>Belastes i dag</span>
            <strong style={{ fontSize: "1.1rem" }}>{formatOre(cfg.introPriceOre)}</strong>
          </div>
          <div className="rowsplit" style={{ marginTop: 6 }}>
            <span>Etter {cfg.introDays} dager</span>
            <strong>{formatOre(cfg.renewalPriceOre)}/mnd</strong>
          </div>
        </div>

        <CheckoutForm
          plate={plate}
          email={user?.email ?? ""}
          methods={methods}
          introLabel={formatOre(cfg.introPriceOre)}
          renewalLabel={formatOre(cfg.renewalPriceOre)}
          introDays={cfg.introDays}
        />

        <p className="tiny" style={{ marginTop: 16, borderTop: "1px solid var(--line-2)", paddingTop: 12 }}>
          Betalingen håndteres av betalingsleverandøren. Kortopplysninger lagres aldri hos Bilfunn. Se{" "}
          <Link href="/vilkar">vilkårene</Link> og <Link href="/angrerett">angreretten</Link>.
        </p>
      </div>
    </div>
  );
}
