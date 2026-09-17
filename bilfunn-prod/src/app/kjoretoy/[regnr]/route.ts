export const dynamic = "force-dynamic";
import { normalizePlate, isValidPlate } from "@/lib/plate";
import { publicError } from "@/lib/public-html";
import { HttpError } from "@/lib/http";
import { env } from "@/lib/env";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ regnr: string }> },
) {
  const plate = normalizePlate((await params).regnr);
  if (!isValidPlate(plate))
    return publicError(new HttpError(404, "invalid_plate"), "/kjoretoy");
  return new Response(null, {
    status: 308,
    headers: {
      Location: new URL(
        `/${encodeURIComponent(plate)}`,
        env.baseUrl,
      ).toString(),
    },
  });
}
