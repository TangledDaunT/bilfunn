import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { env } from "./env";

export const sha256 = (v: string) =>
  createHash("sha256").update(v).digest("hex");
export const hashIp = (ip: string) =>
  sha256(`${ip}|${env.sessionSecret}`).slice(0, 32);
export const randomToken = (bytes = 32) =>
  randomBytes(bytes).toString("base64url");
export const randomCode = () => String(randomInt(100000, 1000000));

export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function clientIp(headers: Headers) {
  // Vercel replaces this header at its trusted ingress. Never trust arbitrary X-Forwarded-For.
  if (process.env.VERCEL === "1")
    return (
      headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    );
  return "local";
}
