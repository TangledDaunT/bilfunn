export const dynamic = "force-dynamic";
import {
  publicHtml,
  publicError,
  escapeHtml as e,
  searchForm,
  breadcrumb,
} from "@/lib/public-html";
import { publicRecord } from "@/lib/vehicle/public-store";
import { PublicData } from "@/lib/vehicle/public-model";
import { normalizePlate, isValidPlate } from "@/lib/plate";
import { topics, article, articles } from "@/lib/editorial";
import { HttpError } from "@/lib/http";
import { env } from "@/lib/env";
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
          .join("")}</nav><a href="/kjoretoy">Utforsk kjøretøy</a>`,
      });
    }
    const plate = normalizePlate(slug);
    if (!isValidPlate(plate)) throw new HttpError(404, "invalid_plate");
    if (plate !== slug)
      return new Response(null, {
        status: 308,
        headers: {
          Location: new URL(
            `/${encodeURIComponent(plate)}`,
            env.baseUrl,
          ).toString(),
          "Cache-Control": "no-store",
        },
      });
    const { localPreviewEnabled, localVehiclePreview } =
      await import("@/lib/vehicle/local-preview");
    if (localPreviewEnabled(req)) return localVehiclePreview(plate);
    const row = await publicRecord(plate, req.headers);
    const v = PublicData.parse(row.data);
    const title = `${plate} – ${[v.make, v.model].filter(Boolean).join(" ") || "Kjøretøy"} | Skiltnummeret.no`;
    const description = `${plate}: ${[v.make, v.model, v.fuel, v.color].filter(Boolean).join(", ")}. Se tilgjengelige kjøretøyopplysninger og kontrollfrister.`;
    const labels: Record<string, string> = {
      make: "Merke",
      model: "Modell",
      vehicleType: "Kjøretøytype",
      color: "Farge",
      fuel: "Drivstoff",
      firstRegistered: "Først registrert",
      firstRegisteredNorway: "Først registrert i Norge",
      lastInspection: "Sist EU-godkjent",
      nextInspection: "Neste kontrollfrist",
      registrationStatus: "Registreringsstatus",
    };
    const pages = await articles("pages");
    if (row.expiresAt.getTime() <= Date.now())
      throw new HttpError(503, "fresh_data_unavailable");
    return publicHtml({
      title,
      description,
      path,
      index: row.eligible,
      ttl: Math.min(300, (row.expiresAt.getTime() - Date.now()) / 1000),
      tags: [`vehicle:${plate}`, "vehicles"],
      schema: [
        breadcrumb(plate, path),
        {
          "@type": "Vehicle",
          name: [plate, v.make, v.model].filter(Boolean).join(" "),
          url: `${env.baseUrl}${path}`,
          ...(v.make ? { brand: { "@type": "Brand", name: v.make } } : {}),
          ...(v.model ? { model: v.model } : {}),
          ...(v.color ? { color: v.color } : {}),
          ...(v.fuel ? { fuelType: v.fuel } : {}),
          ...(v.firstRegistered
            ? { dateVehicleFirstRegistered: v.firstRegistered }
            : {}),
        },
      ],
      body: `<nav aria-label="Brødsmuler"><a href="/">Forside</a><a href="/kjoretoy">Kjøretøy</a><span>${e(plate)}</span></nav><h1>${e(plate)} – ${e([v.make, v.model].filter(Boolean).join(" "))}</h1><section class="card"><dl>${Object.entries(
        labels,
      )
        .filter(([key]) => v[key as keyof typeof v])
        .map(
          ([key, label]) =>
            `<dt>${label}</dt><dd>${e(v[key as keyof typeof v])}</dd>`,
        )
        .join(
          "",
        )}</dl><p class="muted">Sist hentet fra datakilden: <time datetime="${row.fetchedAt.toISOString()}">${row.fetchedAt.toISOString().slice(0, 10)}</time></p></section><p class="note">Eieropplysninger: not available in this data source</p><a class="cta" href="/kasse?nr=${encodeURIComponent(plate)}">Se tilgang til full rapport</a>${searchForm}<h2>Relaterte tjenester</h2><ul class="links"><li><a href="/priser">Priser og tilgang</a></li>${pages.map((p) => `<li><a href="${p.path}">${e(p.title)}</a></li>`).join("")}</ul>`,
    });
  } catch (error) {
    return publicError(error, path);
  }
}
