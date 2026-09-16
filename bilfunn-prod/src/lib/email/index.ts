import { Resend } from "resend";
import { prisma } from "../db";
import { env } from "../env";
import { renderEmail, type EmailType } from "./templates";

const resend = env.email.resendKey ? new Resend(env.email.resendKey) : null;

/**
 * Every transactional email is written to EmailLog first, then sent. Without
 * RESEND_API_KEY the log is the delivery: the admin console shows exactly what
 * would have been sent, so the flow is testable before DNS is verified.
 */
export async function sendEmail(
  type: EmailType,
  to: string,
  ctx: Record<string, unknown> = {},
  userId?: string | null
) {
  const { subject, html, text } = renderEmail(type, ctx);
  const log = await prisma.emailLog.create({
    data: { to, type, subject, body: html, userId: userId ?? null, provider: resend ? "resend" : "console" },
  });

  if (!resend) {
    if (process.env.NODE_ENV !== "production") console.info(`[email:${type}] → ${to}: ${subject}`);
    return log;
  }

  try {
    await resend.emails.send({ from: env.email.from, to, subject, html, text });
    await prisma.emailLog.update({ where: { id: log.id }, data: { sentAt: new Date() } });
  } catch (err: any) {
    await prisma.emailLog.update({ where: { id: log.id }, data: { error: String(err?.message ?? err) } });
  }
  return log;
}
