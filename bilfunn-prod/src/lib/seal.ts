import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { env } from "./env";
function key() {
  if (!/^[a-f0-9]{64}$/i.test(env.encryptionKey))
    throw new Error("DATA_ENCRYPTION_KEY is required");
  return Buffer.from(env.encryptionKey, "hex");
}
export function seal(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
    "base64",
  );
}
export function unseal(value: string) {
  const data = Buffer.from(value, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([
    decipher.update(data.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
}
