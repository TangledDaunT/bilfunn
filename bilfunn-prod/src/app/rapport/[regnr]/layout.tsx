import { notFound } from "next/navigation";
import { isValidPlate, normalizePlate } from "@/lib/plate";

// Validate before this segment's loading boundary can start streaming a 200.
export default async function ReportLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ regnr: string }>;
}) {
  if (!isValidPlate(normalizePlate((await params).regnr))) notFound();
  return children;
}
