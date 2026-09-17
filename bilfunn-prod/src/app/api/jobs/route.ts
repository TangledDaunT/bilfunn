export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { env } from "@/lib/env";
import { readBody, endpoint, HttpError } from "@/lib/http";
import { processJobs } from "@/lib/jobs";
export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = endpoint(async (req) => {
  if (!env.qstash.currentKey || !env.qstash.nextKey)
    throw new HttpError(503, "worker_not_configured");
  const signature = req.headers.get("upstash-signature");
  if (!signature) throw new HttpError(401, "invalid_signature");
  const raw = await readBody(req);
  const valid = await new Receiver({
    currentSigningKey: env.qstash.currentKey,
    nextSigningKey: env.qstash.nextKey,
  })
    .verify({ signature, body: raw, url: `${env.baseUrl}/api/jobs` })
    .catch(() => false);
  if (!valid) throw new HttpError(401, "invalid_signature");
  const processed = await processJobs(10);
  if (processed) await (await import("@/lib/wake-worker")).wakeWorker();
  return NextResponse.json({ processed });
});
