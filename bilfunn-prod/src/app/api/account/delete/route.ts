import { enforceRateLimit } from "@/lib/rateLimit";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { destroySession, requireRecentUser } from "@/lib/session";
import { enqueue } from "@/lib/jobs";
import { endpoint } from "@/lib/http";
export const POST = endpoint(async () => {
  const user = await requireRecentUser();
  await enforceRateLimit(`delete:${user.id}`, 5, 60_000);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
    const subs = await tx.subscription.findMany({
      where: {
        userId: user.id,
        status: { in: ["ACTIVE", "TRIALING", "PAST_DUE", "CANCELED"] },
      },
    });
    for (const sub of subs) {
      await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: "CANCELED",
          canceledAt: new Date(),
          cancelPending: true,
          cancelReason: "account_deleted",
        },
      });
      await enqueue(
        "cancel",
        { subscriptionId: sub.id },
        `cancel:${sub.id}`,
        tx,
      );
    }
    await tx.search.deleteMany({ where: { userId: user.id } });
    await tx.loginToken.deleteMany({ where: { userId: user.id } });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.emailLog.updateMany({
      where: { userId: user.id },
      data: { userId: null, to: "[deleted]", body: "[deleted]", error: null },
    });
    await tx.ticket.deleteMany({ where: { email: user.email } });
    await tx.outbox.updateMany({
      where: { kind: "email", userId: user.id },
      data: { payload: {}, status: "DONE", completedAt: new Date() },
    });
    await tx.event.deleteMany({ where: { userId: user.id } });
    await tx.user.update({
      where: { id: user.id },
      data: {
        email: `deleted+${user.id}@skiltnummeret.invalid`,
        deletedAt: new Date(),
        emailVerifiedAt: null,
        mfaSecret: null,
        role: "CUSTOMER",
      },
    });
  });
  await destroySession();
  return Response.json(
    { ok: true, cancellationProcessing: true },
    { status: 202 },
  );
});
