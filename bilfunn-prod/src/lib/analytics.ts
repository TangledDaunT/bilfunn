import { prisma } from "./db";

/**
 * Server-side event log. Client analytics (GA4/GTM) only fire with consent; this
 * log is first-party operational data and never contains owner names, addresses
 * or card details.
 */
export async function track(
  name: string,
  props: Record<string, unknown> = {},
  meta: { userId?: string | null; sessionId?: string | null } = {},
) {
  try {
    await prisma.event.create({
      data: {
        name,
        props: Object.fromEntries(
          Object.entries(props).filter(
            ([k, v]) =>
              ["provider", "method", "amountOre", "source", "code"].includes(
                k,
              ) &&
              (typeof v === "number" ||
                (typeof v === "string" && v.length <= 50)),
          ),
        ) as any,
        userId: meta.userId ?? null,
        sessionId: meta.sessionId ?? null,
      },
    });
  } catch {
    // analytics must never break a request
  }
}
