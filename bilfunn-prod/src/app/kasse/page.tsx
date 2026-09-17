import Link from "next/link";
import { redirect } from "next/navigation";
import CheckoutForm from "./CheckoutForm";
import { getConfig } from "@/lib/config";
import { formatOre } from "@/lib/money";
import { normalizePlate, isValidPlate, prettyPlate } from "@/lib/plate";
import { getCurrentUser } from "@/lib/session";
import { availableMethods } from "@/lib/payments";

export const dynamic = "force-dynamic";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Fullfør tilgang",
  "Fullfør betalingen for Skiltnummeret.no-tilgang.",
  "/kasse",
  false,
);

export default async function CheckoutPage({
  searchParams: input,
}: {
  searchParams: Promise<{ nr?: string }>;
}) {
  const searchParams = await input;
  const plate = normalizePlate(searchParams.nr || "");
  if (!isValidPlate(plate)) redirect("/");
  const cfg = await getConfig();
  const user = await getCurrentUser();
  if (!user)
    redirect(`/logg-inn?next=${encodeURIComponent(`/kasse?nr=${plate}`)}`);
  const methods = availableMethods();

  return (
    <div className="wrap" style={{ paddingTop: 24, maxWidth: 620 }}>
      <div className="steps">
        <span>1. Søk</span> <span>›</span> <span>2. Kjøretøy</span>{" "}
        <span>›</span> <span className="on">3. Betaling</span> <span>›</span>{" "}
        <span>4. Rapport</span>
      </div>

      <div className="card">
        <h1 style={{ fontSize: "1.45rem" }}>Fullfør tilgang</h1>
        <p className="muted small">
          Du er innlogget med en bekreftet e-postadresse.
        </p>

        <div className="note" style={{ margin: "16px 0" }}>
          <div className="rowsplit">
            <span>Kjøretøy</span>
            <strong>{prettyPlate(plate)}</strong>
          </div>
          <div className="rowsplit" style={{ marginTop: 6 }}>
            <span>Belastes i dag</span>
            <strong style={{ fontSize: "1.1rem" }}>
              {formatOre(cfg.introPriceOre)}
            </strong>
          </div>
          <div className="rowsplit" style={{ marginTop: 6 }}>
            <span>Etter {cfg.introDays} dager</span>
            <strong>{formatOre(cfg.renewalPriceOre)}/mnd</strong>
          </div>
        </div>

        <p className="note">
          Eieropplysninger: not available in this data source
        </p>

        <CheckoutForm
          plate={plate}
          email={user?.email ?? ""}
          methods={methods}
          introLabel={formatOre(cfg.introPriceOre)}
          renewalLabel={formatOre(cfg.renewalPriceOre)}
          introDays={cfg.introDays}
        />

        <p
          className="tiny"
          style={{
            marginTop: 16,
            borderTop: "1px solid var(--line-2)",
            paddingTop: 12,
          }}
        >
          Betalingen håndteres av betalingsleverandøren. Kortopplysninger lagres
          aldri hos Skiltnummeret.no. Se <Link href="/vilkar">vilkårene</Link>{" "}
          og <Link href="/angrerett">angreretten</Link>.
        </p>
      </div>
    </div>
  );
}
