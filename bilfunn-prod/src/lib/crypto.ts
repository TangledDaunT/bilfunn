import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { env } from "./env";

export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
export const hashIp = (ip: string) => sha256(`${ip}|${env.sessionSecret}`).slice(0, 32);
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const randomCode = () => String(randomInt(100000, 1000000));

export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function clientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}
