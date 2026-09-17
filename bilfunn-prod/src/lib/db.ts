import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Bound acquisition and individual queries, including calls outside transactions.
// Keep deployment credentials and pooler selection in DATABASE_URL.
function boundedDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  const url = new URL(raw);
  for (const [key, maximum] of Object.entries({
    connect_timeout: 5,
    pool_timeout: 5,
    socket_timeout: 10,
  })) {
    const configured = Number(url.searchParams.get(key));
    if (!Number.isFinite(configured) || configured <= 0 || configured > maximum)
      url.searchParams.set(key, String(maximum));
  }
  // Cancel work inside PostgreSQL too; a socket deadline alone can leave the
  // connection occupied until the server finishes its query.
  const options = url.searchParams.get("options") || "";
  url.searchParams.set(
    "options",
    [
      options,
      !/\bstatement_timeout\b/.test(options) ? "-c statement_timeout=9000" : "",
      // Prisma DateTime fields use UTC timestamps without a timezone. SQL NOW()
      // and database defaults must use that same timezone, including local tests.
      "-c timezone=UTC",
    ]
      .filter(Boolean)
      .join(" "),
  );
  return url.toString();
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [],
    datasourceUrl: boundedDatabaseUrl(),
    transactionOptions: { maxWait: 2000, timeout: 5000 },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
