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
  await enforceRateLimit(`admin-seo:${admin.id}`, 30, 60_000);
  const body = await jsonBody(
    req,
    z
      .object({
        additionalFields: z.number().int().min(2).max(6),
        requireMakeModel: z.boolean(),
        requireRegistrationDate: z.boolean(),
      })
      .strict(),
  );
  const policy = await prisma.$transaction(async (tx) => {
    const p = await tx.seoPolicy.upsert({
      where: { id: "default" },
      create: { ...body, version: 2 },
      update: { ...body, version: { increment: 1 } },
    });
    await enqueue(
      "seo-reindex",
      { after: "", version: p.version },
      `seo:${p.version}:start`,
      tx,
    );
    await enqueue(
      "cache-purge",
      { tags: ["vehicles"] },
      `purge-policy:${p.version}`,
      tx,
    );
    await tx.adminAudit.create({
      data: { actor: admin.id, action: "seo.policy", detail: body },
    });
    return p;
  });
  await purgePublic(["vehicles"]);
  return Response.json(
    { ok: true, version: policy.version, reindexing: true },
    { status: 202 },
  );
});
