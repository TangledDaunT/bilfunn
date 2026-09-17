export const dynamic = "force-dynamic";
import { normalizePlate, isValidPlate } from "@/lib/plate";
import { publicError } from "@/lib/public-html";
import { HttpError } from "@/lib/http";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";
export async function GET(req: Request) {
  const plate = normalizePlate(new URL(req.url).searchParams.get("nr") || "");
  if (!isValidPlate(plate))
    return publicError(new HttpError(400, "invalid_plate"), "/sok");
  const destination = `/rapport/${encodeURIComponent(plate)}`;
  const user = await getCurrentUser();
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL(
        user ? destination : `/logg-inn?next=${encodeURIComponent(destination)}`,
        env.baseUrl,
      ).toString(),
      "Cache-Control": "no-store",
    },
  });
}
