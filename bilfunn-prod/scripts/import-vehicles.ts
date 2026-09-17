import { loadEnvConfig } from "@next/env";
import fs from "node:fs/promises";
loadEnvConfig(process.cwd());
async function main() {
  if (
    !process.argv[2] ||
    !process.env.IMPORT_TOKEN ||
    !process.env.NEXT_PUBLIC_BASE_URL
  )
    throw new Error();
  const plates = (await fs.readFile(process.argv[2], "utf8"))
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (plates.some((p) => !/^[A-ZÆØÅ0-9]{2,7}$/.test(p))) throw new Error();
  for (let offset = 0; offset < plates.length; offset += 500) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.IMPORT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plates: plates.slice(offset, offset + 500) }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error();
    if (offset + 500 < plates.length)
      await new Promise((resolve) => setTimeout(resolve, 6500));
  }
  console.log(`Accepted ${plates.length} registrations for verified lookup.`);
}
main().catch(() => {
  console.error(
    "Import failed. Check credentials, authorized input and service status. Rerunning is safe.",
  );
  process.exitCode = 1;
});
