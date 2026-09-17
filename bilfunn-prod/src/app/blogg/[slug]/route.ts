export const dynamic = "force-dynamic";
import { article } from "@/lib/editorial";
import {
  publicHtml,
  publicError,
  escapeHtml as e,
  breadcrumb,
} from "@/lib/public-html";
import { HttpError } from "@/lib/http";
import { env } from "@/lib/env";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const post = await article(slug, "blogg");
  if (!post)
    return publicError(new HttpError(404, "unpublished"), `/blogg/${slug}`);
  const related = await Promise.all(
    post.related.map((s) => article(s, "pages")),
  );
  return publicHtml({
    title: `${post.title} | Skiltnummeret.no`,
    description: post.description,
    path: post.path,
    schema: [
      breadcrumb(post.title, post.path),
      {
        "@type": "Article",
        headline: post.title,
        dateModified: post.updated,
        author: { "@type": "Person", name: post.author },
        mainEntityOfPage: `${env.baseUrl}${post.path}`,
      },
    ],
    body: `<nav><a href="/blogg">Blogg</a></nav><h1>${e(post.title)}</h1><p>${e(post.author)} · <time datetime="${post.updated}">${post.updated}</time></p><article>${post.html}</article><nav>${related
      .filter(Boolean)
      .map((p) => `<a href="${p!.path}">${e(p!.title)}</a>`)
      .join("")}</nav>`,
  });
}
