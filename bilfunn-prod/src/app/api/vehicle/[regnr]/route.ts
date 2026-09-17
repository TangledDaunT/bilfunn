export const dynamic = "force-dynamic";
import { getCurrentUser } from "@/lib/session";
import { lookupVehicle, freePreview } from "@/lib/vehicle";
import { normalizePlate, isValidPlate } from "@/lib/plate";
import { HttpError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rateLimit";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ regnr: string }> },
) {
  const headers = {
    "Cache-Control": "private, no-store",
    "Vercel-CDN-Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
  };
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "authentication_required");
    const plate = normalizePlate((await params).regnr);
    if (!isValidPlate(plate)) throw new HttpError(400, "invalid_plate");
    await enforceRateLimit(`preview:${user.id}`, 20, 3600_000);
    const result = await lookupVehicle(plate);
    if (!result.ok)
      throw new HttpError(result.code === "NOT_FOUND" ? 404 : 503, result.code);
    return Response.json(freePreview(result.vehicle), { headers });
  } catch (error) {
    return Response.json(
      { error: error instanceof HttpError ? error.code : "unavailable" },
      {
        status: error instanceof HttpError ? error.status : 503,
        headers,
      },
    );
  }
}
