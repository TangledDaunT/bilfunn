import { env } from "@/lib/env";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import {
  publicHtml,
  publicError,
  escapeHtml as e,
  searchForm,
} from "@/lib/public-html";
import {
  publicationEnabled,
  publicSources,
  policy,
} from "@/lib/vehicle/public-store";
export async function GET(req: Request) {
  const after = new URL(req.url).searchParams.get("after") || "";
  if (after && !/^[A-ZÆØÅ0-9]{2,7}$/.test(after))
    return publicError(null, "/kjoretoy");
  try {
    const rules = publicationEnabled() ? await policy() : null;
    const rows = rules
      ? await prisma.publicVehicle.findMany({
          where: {
            source: { in: publicSources() },
            fetchedAt: {
              gt: new Date(
                Date.now() - env.svv.retentionHours * 3600000 + 60000,
              ),
            },
            eligible: true,
            policyVersion: rules.version,
            suppressed: false,
            gone: false,
            expiresAt: { gt: new Date(Date.now() + 60_000) },
            ...(after ? { plate: { gt: after } } : {}),
          },
          orderBy: { plate: "asc" },
          take: 101,
          select: { plate: true },
        })
      : [];
    return publicHtml({
      title: "Kjøretøyregister | Skiltnummeret.no",
      description:
        "Utforsk tilgjengelige kjøretøyopplysninger etter registreringsnummer.",
      path: after
        ? `/kjoretoy?after=${encodeURIComponent(after)}`
        : "/kjoretoy",
      index: rows.length > 0,
      ttl: 60,
      tags: ["vehicles"],
      body: `<h1>Kjøretøyregister</h1>${searchForm}<ul class="links">${rows
        .slice(0, 100)
        .map(
          (r) =>
            `<li><a href="/${encodeURIComponent(r.plate)}">${e(r.plate)}</a></li>`,
        )
        .join(
          "",
        )}</ul>${rows.length > 100 ? `<a href="/kjoretoy?after=${encodeURIComponent(rows[99].plate)}">Neste side</a>` : ""}`,
    });
  } catch (error) {
    return publicError(error, "/kjoretoy");
  }
}
