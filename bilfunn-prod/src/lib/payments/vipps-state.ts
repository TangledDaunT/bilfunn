import { z } from "zod";
import type { Checkout, Prisma } from "@prisma/client";
import { applyPaid } from "./events";
import { getConfig } from "../config";
export const VippsCharge = z.object({
  id: z.string(),
  agreementId: z.string(),
  type: z.enum(["INITIAL", "RECURRING", "UNSCHEDULED"]),
  status: z.string(),
  currency: z.literal("NOK"),
  amount: z.number().int().nonnegative(),
  due: z.string().datetime({ offset: true }),
  summary: z.object({
    captured: z.number().int().nonnegative(),
    refunded: z.number().int().nonnegative(),
  }),
  history: z.array(
    z.object({
      occurred: z.string().datetime({ offset: true }),
      event: z.string(),
      success: z.boolean(),
    }),
  ),
});
export async function reconcileVippsCharge(
  tx: Prisma.TransactionClient,
  checkout: Checkout,
  agreementStatus: string,
  input: unknown,
) {
  const charge = VippsCharge.parse(input);
  if (charge.agreementId !== checkout.subscriptionId)
    throw new Error("Agreement mismatch");
  const captured = charge.history.find(
    (e) => e.event === "CAPTURE" && e.success,
  );
  if (
    charge.summary.captured > 0 &&
    ["CHARGED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(charge.status)
  ) {
    if (
      charge.type === "UNSCHEDULED" ||
      !captured ||
      charge.summary.captured !== charge.amount
    )
      throw new Error("Unsupported capture");
    const initial = charge.type === "INITIAL";
    const start = new Date(initial ? captured.occurred : charge.due);
    const end = new Date(start);
    if (initial) end.setUTCDate(end.getUTCDate() + checkout.introDays);
    else {
      const day = end.getUTCDate();
      end.setUTCDate(1);
      end.setUTCMonth(end.getUTCMonth() + 1);
      const last = new Date(
        Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
      ).getUTCDate();
      end.setUTCDate(Math.min(day, last));
    }
    await applyPaid(tx, checkout, {
      id: `${charge.agreementId}:${charge.id}`,
      amount: charge.summary.captured,
      initial,
      start,
      end,
      agreementId: charge.agreementId,
      canceled: ["STOPPED", "EXPIRED"].includes(agreementStatus),
    });
    if (charge.summary.refunded > charge.summary.captured)
      throw new Error("Invalid refund amount");
    await tx.payment.updateMany({
      where: {
        provider: "VIPPS",
        providerPaymentId: `${charge.agreementId}:${charge.id}`,
        refundedOre: { lte: charge.summary.refunded },
      },
      data: {
        refundedOre: charge.summary.refunded,
        ...(charge.summary.refunded === charge.summary.captured
          ? { status: "REFUNDED" }
          : {}),
      },
    });
  } else if (charge.status === "FAILED" && charge.type === "RECURRING") {
    const cfg = await getConfig();
    await tx.subscription.updateMany({
      where: {
        checkoutId: checkout.id,
        canceledAt: null,
        periodEnd: { lte: new Date(charge.due) },
      },
      data: {
        status: "PAST_DUE",
        graceUntil: new Date(
          new Date(charge.due).getTime() + cfg.graceDays * 86400000,
        ),
      },
    });
  }
}
