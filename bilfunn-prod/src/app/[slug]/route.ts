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
import { publicRecord, publicationEnabled } from "@/lib/vehicle/public-store";
import { PublicData } from "@/lib/vehicle/public-model";
import { formatDate } from "@/lib/money";
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
    if (slug !== plate)
      return new Response(null, {
        status: 308,
        headers: { Location: `/${encodeURIComponent(plate)}` },
      });
    if (!publicationEnabled())
      throw new HttpError(503, "publication_not_enabled");
    const record = await publicRecord(plate, req.headers);
    const data = PublicData.parse(record.data);
    const displayDate = (value: string | null) =>
      value ? formatDate(value) : null;
    const rows = [
      ["Registreringsnummer", data.plate],
      ["Merke", data.make],
      ["Modell", data.model],
      ["Kjøretøytype", data.vehicleType],
      ["Farge", data.color],
      ["Drivstoff", data.fuel],
      ["Først registrert", displayDate(data.firstRegistered)],
      ["Først registrert i Norge", displayDate(data.firstRegisteredNorway)],
      ["Sist EU-kontroll", displayDate(data.lastInspection)],
      ["Neste EU-kontroll", displayDate(data.nextInspection)],
      ["Registreringsstatus", data.registrationStatus],
    ]
      .filter(([, value]) => value)
      .map(
        ([label, value]) =>
          `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`,
      )
      .join("");
    const title = `${data.plate} – ${[data.make, data.model].filter(Boolean).join(" ") || "Kjøretøyopplysninger"} | Skiltnummeret.no`;
    const description = `Se tilgjengelige tekniske kjøretøyopplysninger for ${data.plate}. Oppdatert ${formatDate(record.fetchedAt)}.`;
    return publicHtml({
      title,
      description,
      path,
      index: record.eligible,
      ttl: 300,
      tags: [`vehicle:${plate}`, "vehicles"],
      schema: [breadcrumb(data.plate, path)],
      body: `${searchForm}<div class="wrap"><p class="eyebrow">Kjøretøyopplysninger</p><h1>${e([data.make, data.model].filter(Boolean).join(" ") || data.plate)}</h1><p class="muted">Registreringsnummer: <strong>${e(data.plate)}</strong></p><section class="card"><h2>Tekniske opplysninger</h2><dl class="spec">${rows}</dl><p class="tiny">Oppdatert ${e(formatDate(record.fetchedAt))}</p></section><section class="card"><h2>Eieropplysninger</h2><p>Eieropplysninger er persondata og blir aldri vist på offentlige sider. Denne funksjonen aktiveres først når en godkjent datakilde, avtale og betalt tilgang er konfigurert.</p><a class="btn ghost" href="/datakilder">Les om datakilder</a></section><nav aria-label="Relaterte sider"><a href="/kjoretoy">Kjøretøyregister</a> · <a href="/priser">Priser</a> · <a href="/datakilder">Datakilder</a></nav></div>`,
    });
  } catch (error) {
    return publicError(error, path);
  }
}
