export const dynamic = "force-dynamic";
import { articles } from "@/lib/editorial";
import { publicHtml, escapeHtml as e } from "@/lib/public-html";
export async function GET() {
  const posts = await articles("blogg");
  return publicHtml({
    title: "Blogg | Skiltnummeret.no",
    description: "Artikler om kjøretøy og registreringsnummer.",
    path: "/blogg",
    index: posts.length > 0,
    body: `<h1>Blogg</h1><ul>${posts.map((p) => `<li><a href="${p.path}">${e(p.title)}</a></li>`).join("")}</ul>`,
  });
}
