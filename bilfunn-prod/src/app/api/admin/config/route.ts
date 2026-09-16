import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { invalidateConfig } from "@/lib/config";

export const runtime = "nodejs";

const Schema = z.object({
  introPriceOre: z.number().int().min(0).max(100000),
  renewalPriceOre: z.number().int().min(0).max(1000000),
  introDays: z.number().int().min(1).max(60),
  introSearchLimit: z.number().int().min(1).max(1000),
  monthlySearchLimit: z.number().int().min(1).max(10000),
  graceDays: z.number().int().min(0).max(60),
  ipSearchesPerHour: z.number().int().min(1).max(1000),
  reminderHours: z.number().int().min(0).max(240),
  duplicatesCount: z.boolean(),
  cancelKeepsAccess: z.boolean(),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const updated = await prisma.config.update({ where: { id: "default" }, data: parsed.data });
  await prisma.adminAudit.create({
    data: { actor: admin.email, action: "config.update", target: "default", detail: parsed.data as any },
  });
  invalidateConfig();
  return NextResponse.json({ ok: true, config: updated });
}
