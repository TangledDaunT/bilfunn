export const dynamic = "force-dynamic";
import { sitemapIndex } from "@/lib/sitemaps";
import { endpoint } from "@/lib/http";
export const GET = endpoint(async () => sitemapIndex());
