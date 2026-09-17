export const dynamic = "force-dynamic";
import { z } from "zod";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";
import { enqueue } from "@/lib/jobs";
import { endpoint, jsonBody, HttpError } from "@/lib/http";
import { enforceRateLimit as rateLimit } from "@/lib/rateLimit";
export const POST = endpoint(async (req) => {
  const secret = process.env.IMPORT_TOKEN || "";
  if (
    secret.length < 32 ||
    !safeEqual(req.headers.get("authorization") || "", `Bearer ${secret}`)
  )
    throw new HttpError(401, "unauthorized");
  if (!env.svv.persist || !env.svv.validated)
    throw new HttpError(503, "storage_not_enabled");
  if (!(await rateLimit("authorized-import", 10, 60000)).ok)
    throw new HttpError(429, "import_throttled");
  const { plates } = await jsonBody(
    req,
    z
      .object({
        plates: z
          .array(z.string().regex(/^[A-ZÆØÅ0-9]{2,7}$/))
          .min(1)
          .max(500),
      })
      .strict(),
  );
  for (const plate of new Set(plates))
    await enqueue(
      "vehicle-refresh",
      { plate },
      `import:${plate}:${Math.floor(Date.now() / 86400_000)}`,
    );
  return Response.json({ accepted: new Set(plates).size }, { status: 202 });
});
