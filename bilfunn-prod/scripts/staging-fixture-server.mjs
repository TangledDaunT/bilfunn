// Deploy only behind staging HTTPS. This server has no route to a real provider.
import http from "node:http";
import fs from "node:fs";
if (process.env.STAGING_MODE !== "true" || !process.env.FIXTURE_FILE)
  throw new Error("Explicit staging fixtures required");
const records = new Map(
  JSON.parse(fs.readFileSync(process.env.FIXTURE_FILE, "utf8")).map((r) => [
    r.plate,
    r,
  ]),
);
http
  .createServer(async (req, res) => {
    const record = records.get(
      new URL(req.url, "http://localhost").searchParams.get("plate"),
    );
    const delay = Math.min(
      10000,
      Math.max(0, Number(process.env.FIXTURE_DELAY_MS) || 0),
    );
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    const status =
      process.env.FIXTURE_FAILURE === "true" ? 503 : record ? 200 : 404;
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(
      JSON.stringify(status === 200 ? record : { error: "synthetic_failure" }),
    );
  })
  .listen(Number(process.env.PORT) || 8081, "0.0.0.0");
