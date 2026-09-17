export const dynamic = "force-dynamic";
import {
  publicHtml,
  publicError,
  escapeHtml as e,
  searchForm,
  breadcrumb,
} from "@/lib/public-html";
import { normalizePlate, isValidPlate } from "@/lib/plate";
import { topics, article } from "@/lib/editorial";
import { HttpError } from "@/lib/http";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";
export const runtime = "nodejs";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const path = `/${encodeURIComponent(slug)}`;
  try {
    if ((topics as readonly string[]).includes(slug)) {
      const page = await article(slug, "pages");
      if (!page) throw new HttpError(404, "unpublished");
      const related = await Promise.all(
        page.related.map((s) => article(s, "pages")),
      );
      return publicHtml({
        title: `${page.title} | Skiltnummeret.no`,
        description: page.description,
        path,
        schema: [breadcrumb(page.title, path)],
        body: `<h1>${e(page.title)}</h1>${searchForm}<article>${page.html}</article><nav>${related
          .filter(Boolean)
          .map((p) => `<a href="${p!.path}">${e(p!.title)}</a>`)
          .join("")}</nav>`,
      });
    }
    const plate = normalizePlate(slug);
    if (!isValidPlate(plate)) throw new HttpError(404, "invalid_plate");
    const user = await getCurrentUser();
    const destination = `/rapport/${encodeURIComponent(plate)}`;
    return new Response(null, {
      status: 303,
      headers: {
        Location: new URL(
          user
            ? destination
            : `/logg-inn?next=${encodeURIComponent(destination)}`,
          env.baseUrl,
        ).toString(),
        "Cache-Control": "private, no-store",
        "Vercel-CDN-Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    return publicError(error, path);
  }
}
