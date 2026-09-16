import { prisma } from "./db";
import { env } from "./env";

export type AppConfig = Awaited<ReturnType<typeof getConfig>>;

let cached: { at: number; value: any } | null = null;
const TTL = 30_000;

export async function getConfig() {
  if (cached && Date.now() - cached.at < TTL) return cached.value;
  const row = await prisma.config.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      introPriceOre: env.defaults.introPriceOre,
      renewalPriceOre: env.defaults.renewalPriceOre,
      introDays: env.defaults.introDays,
      ownerDataEnabled: env.owner.enabled,
    },
  });
  cached = { at: Date.now(), value: row };
  return row;
}

export function invalidateConfig() {
  cached = null;
}
