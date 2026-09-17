import { z } from "zod";
import { prisma } from "@/lib/db";
import { enforceRateLimit as rateLimit } from "@/lib/rateLimit";
import { clientIp, hashIp } from "@/lib/crypto";
import { endpoint, jsonBody, HttpError } from "@/lib/http";
export const POST = endpoint(async (req) => {
  if (
    !(await rateLimit(`contact:${hashIp(clientIp(req.headers))}`, 5, 3600_000))
      .ok
  )
    throw new HttpError(429, "too_many_requests");
  const body = await jsonBody(
    req,
    z
      .object({
        name: z.string().min(1).max(120),
        email: z.string().email().max(254),
        category: z.string().max(80),
        message: z.string().min(10).max(4000),
        website: z.string().max(0).optional(),
      })
      .strict(),
  );
  await prisma.ticket.create({
    data: {
      name: body.name,
      email: body.email.toLowerCase(),
      category: body.category,
      message: body.message,
    },
  });
  return Response.json({ ok: true });
});
