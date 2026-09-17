import { loadEnvConfig } from "@next/env";
import fs from "node:fs/promises";
import * as OTPAuth from "otpauth";
loadEnvConfig(process.cwd());
async function main() {
  const [email, output] = process.argv.slice(2);
  if (!email || !output)
    throw new Error(
      "Usage: npm run admin:provision -- email private-output-file",
    );
  const { env } = await import("../src/lib/env");
  if (!env.adminEmails.includes(email.toLowerCase()))
    throw new Error("Email must be explicitly listed in ADMIN_EMAILS");
  const { prisma } = await import("../src/lib/db");
  const { seal } = await import("../src/lib/seal");
  const otp = new OTPAuth.TOTP({
    issuer: "Skiltnummeret.no",
    label: email.toLowerCase(),
    secret: new OTPAuth.Secret({ size: 20 }),
    digits: 6,
    period: 30,
  });
  await fs.writeFile(output, otp.toString() + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      role: "ADMIN",
      mfaSecret: seal(otp.secret.base32),
      mfaLastStep: null,
    },
    create: {
      email: email.toLowerCase(),
      role: "ADMIN",
      mfaSecret: seal(otp.secret.base32),
    },
  });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await prisma.$disconnect();
  console.log(
    "Administrator provisioned. Import the private output into your authenticator, then remove the output file.",
  );
}
main().catch(() => {
  console.error(
    "Provisioning failed. Check arguments, allowlist, database and encryption configuration.",
  );
  process.exitCode = 1;
});
