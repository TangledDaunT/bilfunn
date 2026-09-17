import type { Config } from "@prisma/client";
import { prisma } from "./db";
import { redis } from "./redis";
export type AppConfig = Config;
/** Read server-owned commercial rules; fail explicitly when seed/configuration is missing instead of inventing prices. */
export async function getConfig(): Promise<Config> {
  const cached = await redis?.get<Config>("app:config");
  if (cached) return cached;
  const row = await prisma.config.findUnique({ where: { id: "default" } });
  if (!row)
    throw new Error("Run database seed before serving application traffic");
  await redis?.set("app:config", row, { ex: 30 });
  return row;
}
export async function invalidateConfig() {
  await redis?.del("app:config");
}
