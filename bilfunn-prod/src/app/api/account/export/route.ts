export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireRecentUser } from "@/lib/session";
import { endpoint, HttpError } from "@/lib/http";
import { enforceRateLimit as rateLimit } from "@/lib/rateLimit";
export const GET = endpoint(async (req) => {
  const user = await requireRecentUser();
  if (!(await rateLimit(`export:${user.id}`, 20, 3600_000)).ok)
    throw new HttpError(429, "too_many_exports");
  const query = new URL(req.url).searchParams;
  const cursor = query.get("cursor") || undefined;
  const section = query.get("section") || "searches";
  if (
    !/^(searches|payments|subscriptions|emails)$/.test(section) ||
    (cursor && !/^[a-zA-Z0-9_-]{1,100}$/.test(cursor))
  )
    throw new HttpError(400, "invalid_cursor");
  const options = {
    where: { userId: user.id, ...(cursor ? { id: { gt: cursor } } : {}) },
    orderBy: { id: "asc" as const },
    take: 501,
  };
  const rows =
    section === "payments"
      ? await prisma.payment.findMany(options)
      : section === "subscriptions"
        ? await prisma.subscription.findMany(options)
        : section === "emails"
          ? await prisma.emailLog.findMany({
              ...options,
              select: { id: true, type: true, subject: true, createdAt: true },
            })
          : await prisma.search.findMany(options);
  return Response.json(
    {
      account: { email: user.email, createdAt: user.createdAt },
      section,
      rows: rows.slice(0, 500),
      nextCursor: rows.length > 500 ? rows[499].id : null,
      sections: ["searches", "payments", "subscriptions", "emails"],
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": 'attachment; filename="skiltnummeret-data.json"',
      },
    },
  );
});
