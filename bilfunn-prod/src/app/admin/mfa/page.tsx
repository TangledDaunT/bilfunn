import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import MfaForm from "./MfaForm";
export const metadata = {
  title: "Bekreft administratorinnlogging",
  description: "Sikker bekreftelse av administratorinnlogging.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/logg-inn?next=/admin/mfa");
  return (
    <div className="wrap">
      <h1>Bekreft administratorinnlogging</h1>
      {user.mfaSecret ? (
        <MfaForm />
      ) : (
        <p>
          Tofaktor må klargjøres med administratorverktøyet før tilgang gis.
        </p>
      )}
    </div>
  );
}
