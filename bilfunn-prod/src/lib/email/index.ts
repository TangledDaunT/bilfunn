import { prisma } from "../db";
import { env, emailConfigured } from "../env";
import { enqueue } from "../jobs";
import { renderEmail, type EmailType } from "./templates";
import { randomUUID } from "crypto";
import { HttpError } from "../http";
export async function sendEmail(
  type: EmailType,
  to: string,
  ctx: Record<string, unknown> = {},
  userId?: string | null,
  key?: string,
) {
  if (!emailConfigured()) throw new HttpError(503, "email_unavailable");
  const job = await enqueue(
    "email",
    {
      type,
      to,
      ctx,
      userId,
      expiresAt: type === "login_code" ? Date.now() + 600_000 : null,
    },
    key || randomUUID(),
  );
  await (await import("../wake-worker")).wakeWorker();
  return job;
}
export async function deliverEmail(
  data: {
    type: EmailType;
    to: string;
    ctx: Record<string, unknown>;
    userId?: string;
    expiresAt?: number;
  },
  key: string,
) {
  if (data.expiresAt && data.expiresAt <= Date.now()) return;
  if (
    data.userId &&
    !(await prisma.user.findFirst({
      where: { id: data.userId, deletedAt: null },
    }))
  )
    return;
  if (!emailConfigured()) throw new Error("Email disabled");
  const { subject, html, text } = renderEmail(data.type, data.ctx);
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.email.resendKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    body: JSON.stringify({
      from: env.email.from,
      to: [data.to],
      subject,
      html,
      text,
    }),
    signal: AbortSignal.timeout(8000),
    redirect: "error",
    cache: "no-store",
  });
  if (!result.ok) throw new Error("Email provider rejected delivery");
  // Authentication secrets and rendered message bodies never enter the audit log.
  await prisma.emailLog.create({
    data: {
      to: data.type === "login_code" ? "[redacted]" : data.to,
      type: data.type,
      subject,
      body: "[not retained]",
      userId: data.userId ?? null,
      provider: "resend",
      sentAt: new Date(),
    },
  });
}
