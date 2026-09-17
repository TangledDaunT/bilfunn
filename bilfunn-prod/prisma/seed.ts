import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  await prisma.config.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  await prisma.seoPolicy.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  console.log(
    "Configuration initialized. Provision administrators separately with MFA.",
  );
}
main()
  .catch(() => {
    console.error("Seed failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
