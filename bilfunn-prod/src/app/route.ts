import { homepage } from "@/lib/design";
export const dynamic = "force-dynamic";
import { publicHtml, escapeHtml } from "@/lib/public-html";
import { articles } from "@/lib/editorial";
export async function GET() {
  const pages = await articles("pages");
  return publicHtml({
    title: "Kjøretøyopplysninger | Skiltnummeret.no",
    description:
      "Søk etter norske kjøretøy med registreringsnummer. Se tilgjengelige tekniske opplysninger.",
    path: "/",
    body:
      homepage +
      (pages.length
        ? `<section class="design-container"><h2>Utforsk</h2><ul class="links">${pages.map((p) => `<li><a href="${p.path}">${escapeHtml(p.title)}</a></li>`).join("")}</ul></section>`
        : ""),
  });
}
