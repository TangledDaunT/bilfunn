import { prisma } from "./db";
import { enqueue } from "./jobs";
import { policy } from "./vehicle/public-store";
import { eligible, PublicData } from "./vehicle/public-model";
export async function reindex(after: string, version: number) {
  const p = await policy();
  if (version !== p.version) return;
  const rows = await prisma.publicVehicle.findMany({
    where: { plate: { gt: after } },
    orderBy: { plate: "asc" },
    take: 500,
  });
  for (const row of rows) {
    const parsed = PublicData.safeParse(row.data);
    const index =
      !row.suppressed &&
      !row.gone &&
      row.expiresAt > new Date() &&
      parsed.success &&
      eligible(parsed.data, p);
    await prisma.publicVehicle.updateMany({
      where: {
        plate: row.plate,
        policyVersion: { lt: version },
        suppressed: row.suppressed,
        gone: row.gone,
        fetchedAt: row.fetchedAt,
      },
      data: { policyVersion: version, eligible: index },
    });
  }
  if (rows.length === 500)
    await enqueue(
      "seo-reindex",
      { after: rows[499].plate, version },
      `seo:${version}:${rows[499].plate}`,
    );
}
