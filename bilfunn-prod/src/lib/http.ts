import { NextResponse } from "next/server";
import type { ZodType } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    public retryAfter?: number,
  ) {
    super(code);
  }
}
/** Bound both streamed body size and waiting time before parsing; do not trust Content-Length alone. */
export async function readBody(
  req: Request,
  maxBytes = 16_384,
): Promise<string> {
  if (Number(req.headers.get("content-length")) > maxBytes)
    throw new HttpError(413, "payload_too_large");
  const reader = req.body?.getReader();
  if (!reader) return "";
  let length = 0;
  const chunks: Uint8Array[] = [];
  let timedOut = false;
  const deadline = setTimeout(() => {
    timedOut = true;
    void reader.cancel().catch(() => {});
  }, 10_000);
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (timedOut) throw new HttpError(408, "request_timeout");
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "payload_too_large");
      }
      chunks.push(value);
    }
  } finally {
    clearTimeout(deadline);
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}
export async function jsonBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<T> {
  if (req.headers.get("content-type")?.split(";")[0] !== "application/json")
    throw new HttpError(415, "json_required");
  let data: unknown;
  try {
    data = JSON.parse(await readBody(req));
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, "invalid_json");
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new HttpError(400, "invalid_input");
  return parsed.data;
}
/** Convert expected HTTP failures and unexpected dependency failures into private, non-sensitive JSON responses. */
export function endpoint(handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 503;
      if (status >= 500)
        console.error(
          JSON.stringify({ event: "endpoint_unavailable", status }),
        );
      return NextResponse.json(
        { error: e instanceof HttpError ? e.code : "temporarily_unavailable" },
        {
          status,
          headers: {
            "Cache-Control": "private, no-store",
            ...(status >= 500 ? { "Retry-After": "30" } : {}),
            ...(e instanceof HttpError && e.retryAfter !== undefined
              ? { "Retry-After": String(e.retryAfter) }
              : {}),
          },
        },
      );
    }
  };
}
