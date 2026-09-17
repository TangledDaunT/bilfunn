import { enforceRateLimit } from "@/lib/rateLimit";
import { getCurrentUser } from "@/lib/session";
import { endpoint, HttpError } from "@/lib/http";
export const dynamic = "force-dynamic";
export const GET = endpoint(async () => {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "authentication_required");
  await enforceRateLimit(`session:${user.id}`, 120, 60_000);
  return Response.json(
    { authenticated: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
