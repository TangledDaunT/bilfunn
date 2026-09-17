import { scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, expectedHex, extra] = encoded.split("$");
  if (
    algorithm !== "scrypt" ||
    extra !== undefined ||
    !/^[A-Za-z0-9_-]{22,}$/.test(salt || "") ||
    !/^[a-f0-9]{128}$/i.test(expectedHex || "")
  )
    return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return timingSafeEqual(actual, expected);
}
