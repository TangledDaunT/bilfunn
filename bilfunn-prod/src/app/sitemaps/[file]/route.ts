export const dynamic = "force-dynamic";
import { vehicleSitemap } from "@/lib/sitemaps";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const file = (await params).file;
  const match = /^vehicles-(0|[1-9][0-9]{0,5})\.xml$/.exec(file);
  if (!match) return new Response(null, { status: 404 });
  try {
    return await vehicleSitemap(Number(match[1]));
  } catch {
    return new Response(null, {
      status: 503,
      headers: { "Retry-After": "30", "Cache-Control": "no-store" },
    });
  }
}
