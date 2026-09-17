export const dynamic = "force-dynamic";
import { publicRecord } from "@/lib/vehicle/public-store";
import { PublicData } from "@/lib/vehicle/public-model";
import { normalizePlate, isValidPlate } from "@/lib/plate";
import { HttpError } from "@/lib/http";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ regnr: string }> },
) {
  try {
    const plate = normalizePlate((await params).regnr);
    if (!isValidPlate(plate)) throw new HttpError(400, "invalid_plate");
    const row = await publicRecord(plate, _req.headers);
    return Response.json(PublicData.parse(row.data), {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Vercel-CDN-Cache-Control": `public, s-maxage=${Math.max(0, Math.min(60, Math.floor((row.expiresAt.getTime() - Date.now()) / 1000)))}`,
        "Vercel-Cache-Tag": `vehicle:${plate},vehicles`,
      },
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof HttpError ? e.code : "unavailable" },
      {
        status: e instanceof HttpError ? e.status : 503,
        headers: { "Cache-Control": "no-store", ...(e instanceof HttpError && e.retryAfter ? { "Retry-After": String(e.retryAfter) } : {}) },
      },
    );
  }
}
