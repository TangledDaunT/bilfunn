import { loadEnvConfig } from "@next/env";
import fs from "node:fs/promises";
import { randomBytes, createHash } from "node:crypto";
loadEnvConfig(process.cwd());
async function main() {
  const output = process.argv[2],
    count = Number(process.argv[3] || 1000);
  if (
    process.env.STAGING_MODE !== "true" ||
    process.env.CONFIRM_STAGING !== "yes" ||
    !output ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 500000
  )
    throw new Error();
  const database = new URL(process.env.DATABASE_URL || "");
  if (
    !process.env.STAGING_DATABASE_HOST ||
    database.hostname !== process.env.STAGING_DATABASE_HOST
  )
    throw new Error();
  const { prisma } = await import("../src/lib/db");
  const outputFile = await fs.open(output, "wx", 0o600),
    providerFile = await fs.open(`${output}.provider.json`, "wx", 0o600);
  await outputFile.write("[\n");
  await providerFile.write("[\n");
  const policy = await prisma.seoPolicy.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  for (let i = 0; i < count; i++) {
    const plate = `T${String(i).padStart(6, "0")}`,
      token = randomBytes(32).toString("base64url"),
      now = new Date();
    const user = await prisma.user.upsert({
      where: { email: `load-${i}@staging.invalid` },
      update: {},
      create: { email: `load-${i}@staging.invalid`, emailVerifiedAt: now },
    });
    await prisma.session.create({
      data: {
        id: createHash("sha256").update(token).digest("hex"),
        userId: user.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    const data = {
      plate,
      make: "Synthetic",
      model: "Fixture",
      vehicleType: "Test",
      color: "Blue",
      fuel: "Electric",
      firstRegistered: "2020-01-01",
      firstRegisteredNorway: null,
      lastInspection: null,
      nextInspection: null,
      registrationStatus: "Synthetic",
    };
    const record = {
      data,
      source: "STAGING",
      fetchedAt: now,
      changedAt: now,
      expiresAt: new Date(Date.now() + 86400000),
      refreshAfter: new Date(Date.now() + 23 * 3600000),
      eligible: true,
      policyVersion: policy.version,
      refreshStatus: "OK",
    };
    await prisma.publicVehicle.upsert({
      where: { plate },
      update: record,
      create: { plate, ...record },
    });
    await outputFile.write(
      `${i ? ",\n" : ""}${JSON.stringify({ plate, cookie: `__Host-sk_session=${token}` })}`,
    );
    await providerFile.write(`${i ? ",\n" : ""}${JSON.stringify(data)}`);
  }
  await outputFile.write("\n]\n");
  await providerFile.write("\n]\n");
  await outputFile.close();
  await providerFile.close();
  await prisma.$disconnect();
  console.log(
    "Private staging load and upstream fixture files created. Protect them and expire staging sessions after testing.",
  );
}
main().catch(() => {
  console.error(
    "Fixture creation failed. Check staging guards, isolated database, count and unused output paths.",
  );
  process.exitCode = 1;
});
