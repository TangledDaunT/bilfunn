import { execFileSync } from "node:child_process";
import fs from "node:fs";
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const rules = [
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
  /\bsk_live_[A-Za-z0-9]{16,}/,
  /\bwhsec_[A-Za-z0-9]{16,}/,
];
const hits = [];
for (const file of files) {
  if (
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile() ||
    fs.statSync(file).size > 2000000 ||
    file.endsWith("scan-secrets.mjs")
  )
    continue;
  const text = fs.readFileSync(file, "utf8");
  if (rules.some((rule) => rule.test(text))) hits.push(file);
  if (/(?:^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith(".example"))
    hits.push(file);
}
if (hits.length) {
  console.error("Potential secrets in files:", [...new Set(hits)].join(", "));
  process.exit(1);
}
console.log("No matching secrets or tracked environment files found.");
