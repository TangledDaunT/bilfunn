import { createHash, createHmac } from "crypto";
import { safeEqual } from "../crypto";
export function verifyVipps(
  raw: string,
  headers: Headers,
  url: string,
  secret: string,
  now = Date.now(),
) {
  if (!secret) return false;
  const date = headers.get("x-ms-date") || "";
  const timestamp = Date.parse(date);
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > 5 * 60_000)
    return false;
  const hash = createHash("sha256").update(raw).digest("base64");
  if (!safeEqual(hash, headers.get("x-ms-content-sha256") || "")) return false;
  const target = new URL(url);
  const signed = `POST\n${target.pathname}${target.search}\n${date};${target.host};${hash}`;
  // Vipps' documented secret is used as the string key, not base64-decoded.
  const signature = createHmac("sha256", secret)
    .update(signed)
    .digest("base64");
  return safeEqual(
    `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`,
    headers.get("authorization") || "",
  );
}
