import { Prisma, type PublicVehicle } from "@prisma/client";
import { prisma } from "../db";
import { env } from "../env";
import { redis } from "../redis";
import { enqueue } from "../jobs";
import {
  PublicData,
  publicFields,
  eligible,
  defaultPolicy,
} from "./public-model";
import { lookupVehicle } from "./index";
import { randomUUID } from "crypto";
import { HttpError } from "../http";
import { enforceRateLimit as rateLimit } from "../rateLimit";
import { clientIp, hashIp } from "../crypto";
export const publicationEnabled = () =>
  env.svv.persist &&
  env.svv.publish &&
  env.svv.validated &&
  env.svv.retentionHours > 0;
export async function policy() {
  return (
    (await prisma.seoPolicy.findUnique({ where: { id: "default" } })) ??
    defaultPolicy
  );
}
export async function refreshVehicle(plate: string, background = true) {
  if (!env.svv.persist || !env.svv.validated || env.svv.retentionHours <= 0)
    throw new HttpError(503, "storage_not_enabled");
  const old = await prisma.publicVehicle.findUnique({ where: { plate } });
  if (old?.suppressed || old?.gone) return old;
  const result = await lookupVehicle(plate, background);
  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      if (old)
        await prisma.publicVehicle.update({
          where: { plate },
          data: {
            eligible: false,
            expiresAt: new Date(),
            data: {},
            refreshStatus: "NOT_FOUND",
            refreshAfter: new Date(Date.now() + 86400_000),
          },
        });
      await redis?.set(`vehicle:missing:${plate}`, true, { ex: 3600 });
      await (
        await import("../public-cache")
      ).purgePublic([`vehicle:${plate}`, "vehicles"]);
      throw new HttpError(404, "vehicle_not_found");
    }
    if (old)
      await prisma.publicVehicle.update({
        where: { plate },
        data: {
          refreshStatus: "ERROR",
          refreshAfter: new Date(Date.now() + 3600_000),
        },
      });
    throw new HttpError(503, "provider_unavailable");
  }
  if (
    result.vehicle.simulated &&
    !(
      process.env.STAGING_MODE === "true" &&
      env.svv.provider === "staging-fixture" &&
      result.vehicle.source === "STAGING"
    )
  )
    throw new HttpError(503, "simulated_data_not_publishable");
  const data = publicFields(result.vehicle);
  const rules = await policy();
  const fetchedAt = new Date(result.vehicle.fetchedAt);
  const previous = old?.data as Record<string, unknown> | undefined;
  const same =
    old &&
    previous &&
    Object.entries(data).every(([key, value]) => previous[key] === value);
  const expiresAt = new Date(
    fetchedAt.getTime() + env.svv.retentionHours * 3600_000,
  );
  const next = {
    data: data as Prisma.InputJsonValue,
    source: result.vehicle.source,
    fetchedAt,
    changedAt: same ? old.changedAt : fetchedAt,
    expiresAt,
    refreshAfter: new Date(
      fetchedAt.getTime() + Math.min(24, env.svv.retentionHours / 2) * 3600_000,
    ),
    eligible: eligible(data, rules),
    policyVersion: rules.version,
    refreshStatus: "OK",
  };
  // Recheck suppression under the same lock used by the admin operation.
  const row = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`vehicle:${plate}`}))`;
    const latest = await tx.publicVehicle.findUnique({ where: { plate } });
    if (latest?.suppressed || latest?.gone) return latest;
    return tx.publicVehicle.upsert({
      where: { plate },
      create: { plate, ...next },
      update: next,
    });
  });
  await redis?.del(`vehicle:missing:${plate}`);
  await (
    await import("../public-cache")
  ).purgePublic([`vehicle:${plate}`, "vehicles"]);
  return row;
}
export const publicSources = () =>
  process.env.STAGING_MODE === "true"
    ? ["SVV", "OWNER_API", "STAGING"]
    : ["SVV", "OWNER_API"];
const pending = new Map<string, Promise<PublicVehicle | null>>();
/** Resolve an approved public snapshot without session access; expiry, suppression and publication policy remain authoritative. */
export async function publicRecord(
  plate: string,
  requestHeaders?: Headers,
): Promise<PublicVehicle> {
  if (!publicationEnabled())
    throw new HttpError(503, "publication_not_enabled");
  let row = await prisma.publicVehicle.findUnique({ where: { plate } });
  if (row)
    row = {
      ...row,
      expiresAt: new Date(
        Math.min(
          row.expiresAt.getTime(),
          row.fetchedAt.getTime() + env.svv.retentionHours * 3600000,
        ),
      ),
    };
  if (row?.gone) throw new HttpError(410, "removed");
  if (row?.suppressed || row?.refreshStatus === "NOT_FOUND")
    throw new HttpError(404, "vehicle_not_found");
  if (!row || row.expiresAt.getTime() <= Date.now()) {
    if (await redis?.get(`vehicle:missing:${plate}`))
      throw new HttpError(404, "vehicle_not_found");
    if (
      requestHeaders &&
      !(
        await rateLimit(
          `discovery:${hashIp(clientIp(requestHeaders))}`,
          30,
          300_000,
        )
      ).ok
    )
      throw new HttpError(429, "lookup_throttled");
    const token = randomUUID();
    if (
      redis &&
      !(await redis.set(`vehicle:lock:${plate}`, token, { nx: true, ex: 15 }))
    )
      throw new HttpError(503, "lookup_pending");
    try {
      if (!pending.has(plate))
        pending.set(
          plate,
          refreshVehicle(plate, false).finally(() => pending.delete(plate)),
        );
      row = await pending.get(plate)!;
    } finally {
      await redis?.eval(
        "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0",
        [`vehicle:lock:${plate}`],
        [token],
      );
    }
  }
  if (!row || row.expiresAt.getTime() <= Date.now())
    throw new HttpError(503, "fresh_data_unavailable");
  if (row.suppressed) throw new HttpError(404, "vehicle_not_found");
  if (row.gone) throw new HttpError(410, "removed");
  if (row.refreshAfter.getTime() <= Date.now())
    await enqueue(
      "vehicle-refresh",
      { plate },
      `refresh:${plate}:${row.fetchedAt.toISOString()}`,
    );
  if (!publicSources().includes(row.source))
    throw new HttpError(503, "unverified_public_source");
  const rules = await policy();
  if (row.policyVersion !== rules.version)
    row = {
      ...row,
      eligible: eligible(PublicData.parse(row.data), rules),
      policyVersion: rules.version,
    };
  return row;
}
