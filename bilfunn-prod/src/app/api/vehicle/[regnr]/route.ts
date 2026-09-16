import { NextResponse } from "next/server";
import { lookupVehicle, freePreview } from "@/lib/vehicle";
import { normalizePlate } from "@/lib/plate";
import { getCurrentUser } from "@/lib/session";
import { getConfig } from "@/lib/config";
import { hasAccess } from "@/lib/billing";
import { rateLimit } from "@/lib/rateLimit";
import { clientIp, hashIp } from "@/lib/crypto";

export const runtime = "nodejs";

/**
 * JSON lookup used by the client where needed. Paid fields are stripped unless
 * the caller has an active subscription — the paywall is enforced here, on the
 * server, not in the component that renders it.
 */
export async function GET(req: Request, { params }: { params: { regnr: string } }) {
  const cfg = await getConfig();
  const ip = clientIp(req.headers);
  const limit = await rateLimit(`api:vehicle:${hashIp(ip)}`, cfg.ipSearchesPerHour, 3600_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "3600" } });
  }

  const plate = normalizePlate(params.regnr);
  const result = await lookupVehicle(plate);
  if (!result.ok) return NextResponse.json({ error: result.code }, { status: result.status });

  const user = await getCurrentUser();
  const access = hasAccess(user?.subscriptions?.[0] ?? null, cfg.cancelKeepsAccess);
  return NextResponse.json(access ? result.vehicle : freePreview(result.vehicle), {
    headers: { "Cache-Control": "no-store" },
  });
}
