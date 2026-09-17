import { enforceRateLimit } from "@/lib/rateLimit";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/db";
import { endpoint, jsonBody, HttpError } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { purgePublic } from "@/lib/public-cache";
export const POST = endpoint(async (req) => {
  const admin = await requireAdmin();
  if (!admin) throw new HttpError(403, "admin_mfa_required");
  await enforceRateLimit(`admin-vehicles:${admin.id}`, 30, 60_000);
  const { plate, action } = await jsonBody(
    req,
    z
      .object({
        plate: z.string().regex(/^[A-ZÆØÅ0-9]{2,7}$/),
        action: z.enum(["suppress", "remove"]),
      })
      .strict(),
  );
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`vehicle:${plate}`}))`;
    await tx.publicVehicle.upsert({
      where: { plate },
      create: {
        plate,
        source: "SUPPRESSION",
        data: {},
        fetchedAt: new Date(),
        changedAt: new Date(),
        expiresAt: new Date(),
        refreshAfter: new Date(),
        suppressed: true,
        gone: action === "remove",
      },
      update: {
        suppressed: true,
        gone: action === "remove",
        eligible: false,
        data: {},
      },
    });
    await enqueue(
      "cache-purge",
      { tags: [`vehicle:${plate}`, "vehicles"] },
      `suppress:${plate}`,
      tx,
    );
    await tx.adminAudit.create({
      data: { actor: admin.id, action: `vehicle.${action}`, target: plate },
    });
  });
  await purgePublic([`vehicle:${plate}`, "vehicles"]);
  return Response.json({ ok: true });
});
