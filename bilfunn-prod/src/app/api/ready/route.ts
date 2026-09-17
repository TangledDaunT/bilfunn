export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { securityConfigurationErrors } from "@/lib/env";
export async function GET() {
  try {
    if (securityConfigurationErrors().length) throw new Error();
    await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      redis ? redis.ping() : Promise.reject(),
    ]);
    return Response.json(
      { status: "ready" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store", "Retry-After": "30" },
      },
    );
  }
}
