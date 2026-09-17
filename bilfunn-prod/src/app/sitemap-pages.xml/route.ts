export const dynamic = "force-dynamic";
import { editorialSitemap } from "@/lib/sitemaps";
import { endpoint } from "@/lib/http";
export const GET = endpoint(async () => editorialSitemap());
