export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { endpoint } from "@/lib/http";
export const POST = endpoint(async () => {
  await destroySession();
  return NextResponse.json({ ok: true });
});
