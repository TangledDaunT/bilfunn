import { env } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";
import { endpoint, HttpError } from "@/lib/http";
import { operationalMetrics } from "@/lib/operations";
export const dynamic = "force-dynamic";
export const GET = endpoint(async (req) => {
  if (
    !env.cronSecret ||
    !safeEqual(
      req.headers.get("authorization") || "",
      `Bearer ${env.cronSecret}`,
    )
  )
    throw new HttpError(401, "unauthorized");
  return Response.json(await operationalMetrics(), {
    headers: { "Cache-Control": "private, no-store" },
  });
});
