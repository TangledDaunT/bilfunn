import fs from "node:fs";
import https from "node:https";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawnSync, spawn } from "node:child_process";
const mode = process.argv[2] || "test";
const blankKeys = Object.fromEntries(
  [...fs.readFileSync(".env.example", "utf8").matchAll(/^([A-Z0-9_]+)=/gm)].map(
    (m) => [m[1], ""],
  ),
);
const httpPort = Number(process.env.TEST_HTTP_PORT || 3100);
const httpsPort = Number(process.env.TEST_HTTPS_PORT || 3101);
const prod = process.env.PRODUCTION_E2E === "1";
const env = {
  ...process.env,
  ...blankKeys,
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ||
    "postgresql://sk_test@127.0.0.1:55473/sk_test?connection_limit=10&pool_timeout=5",
  DIRECT_URL:
    process.env.TEST_DIRECT_URL ||
    "postgresql://sk_test@127.0.0.1:55473/sk_test",
  SESSION_SECRET: "test-only-session-secret-00000000000000000000000",
  DATA_ENCRYPTION_KEY: "a".repeat(64),
  CRON_SECRET: "test-only-cron-secret-00000000000000000000000000",
  NEXT_PUBLIC_BASE_URL: prod
    ? `https://localhost:${httpsPort}`
    : `http://localhost:${httpPort}`,
  LOCAL_VEHICLE_PREVIEW:
    mode === "serve" && !prod && process.env.LOCAL_VEHICLE_PREVIEW === "true"
      ? "true"
      : "false",
  SVV_API_KEY:
    mode === "serve" && !prod && process.env.LOCAL_VEHICLE_PREVIEW === "true"
      ? process.env.LOCAL_SVV_API_KEY || ""
      : "",
  VEHICLE_PROVIDER: "disabled",
  VEHICLE_PROVIDER_VALIDATED: "false",
  VEHICLE_STORAGE_PERMITTED: "false",
  VEHICLE_PUBLICATION_PERMITTED: "false",
  PAYMENTS_MODE: "disabled",
  UPSTASH_REDIS_REST_URL: prod ? "https://127.0.0.1:1" : "",
  UPSTASH_REDIS_REST_TOKEN: prod ? "unreachable-test-transport" : "",
  RESEND_API_KEY: "",
  QSTASH_TOKEN: "",
  OWNER_DATA_ENABLED: "false",
};
function run(command, args, extra = {}) {
  const r = spawnSync(command, args, {
    env: { ...env, ...extra },
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status || 1);
}
if (mode === "migrate") run("npx", ["prisma", "migrate", "deploy"]);
else if (mode === "test") {
  run("npm", ["test"]);
  run("npm", ["run", "test:integration"]);
} else if (mode === "restore") {
  const pg = process.env.TEST_PG_BIN || "/opt/homebrew/opt/postgresql@15/bin";
  if (!env.DIRECT_URL.includes("127.0.0.1:55473/sk_test"))
    throw new Error(
      "Restore rehearsal is restricted to the isolated local test cluster",
    );
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sk-restore-"));
  const dbName = `sk_test_restore_${Date.now()}`;
  const destination = new URL(env.DIRECT_URL);
  destination.pathname = `/${dbName}`;
  run(`${pg}/pg_dump`, [
    "--format=custom",
    "--no-owner",
    "--no-acl",
    "--file",
    `${dir}/snapshot.dump`,
    "--dbname",
    env.DIRECT_URL,
  ]);
  fs.chmodSync(`${dir}/snapshot.dump`, 0o600);
  run(`${pg}/createdb`, [
    "--host",
    "127.0.0.1",
    "--port",
    "55473",
    "--username",
    "sk_test",
    dbName,
  ]);
  run(`${pg}/pg_restore`, [
    "--exit-on-error",
    "--no-owner",
    "--no-acl",
    "--dbname",
    destination.toString(),
    `${dir}/snapshot.dump`,
  ]);
  const tables = [
    "User",
    "Checkout",
    "Subscription",
    "Payment",
    "Session",
    "PublicVehicle",
    "Outbox",
    "_prisma_migrations",
  ];
  for (const table of tables) {
    const sql = `SELECT count(*) FROM "${table}"`;
    const original = spawnSync(`${pg}/psql`, [env.DIRECT_URL, "-Atc", sql], {
      env,
      encoding: "utf8",
    });
    const restored = spawnSync(
      `${pg}/psql`,
      [destination.toString(), "-Atc", sql],
      { env, encoding: "utf8" },
    );
    if (
      original.status !== 0 ||
      restored.status !== 0 ||
      original.stdout !== restored.stdout
    )
      throw new Error(`Restore mismatch: ${table}`);
  }
  run(`${pg}/psql`, [
    destination.toString(),
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `DO $$ BEGIN IF (SELECT last_value FROM receipt_number_seq) < (SELECT COALESCE(MAX(substring("receiptNumber" from '[0-9]+')::bigint),0) FROM "Payment") THEN RAISE EXCEPTION 'Receipt sequence behind ledger'; END IF; END $$;`,
  ]);
  console.log(
    "Backup restoration verified: table counts, migrations, constraints and receipt sequence. Isolated restored database retained for inspection.",
  );
} else if (mode === "build") run("npm", ["run", "build"]);
else if (mode === "serve") {
  if (prod) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sk-local-tls-"));
    run("openssl", [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      `${dir}/key.pem`,
      "-out",
      `${dir}/cert.pem`,
      "-subj",
      "/CN=localhost",
      "-days",
      "1",
    ]);
    https
      .createServer(
        {
          key: fs.readFileSync(`${dir}/key.pem`),
          cert: fs.readFileSync(`${dir}/cert.pem`),
        },
        (req, res) => {
          const upstream = http.request(
            {
              hostname: "127.0.0.1",
              port: httpPort,
              path: req.url,
              method: req.method,
              headers: req.headers,
            },
            (r) => {
              res.writeHead(r.statusCode, r.headers);
              r.pipe(res);
            },
          );
          upstream.on("error", () => {
            res.writeHead(503);
            res.end();
          });
          req.pipe(upstream);
        },
      )
      .listen(httpsPort, "127.0.0.1");
  }
  const child = spawn(
    "npx",
    prod
      ? ["next", "start", "-p", String(httpPort), "-H", "127.0.0.1"]
      : ["next", "dev", "--webpack", "-p", String(httpPort), "-H", "127.0.0.1"],
    { env, stdio: "inherit" },
  );
  process.on("SIGTERM", () => child.kill("SIGTERM"));
  process.on("SIGINT", () => child.kill("SIGINT"));
  child.on("exit", (code) => process.exit(code || 0));
} else if (mode === "e2e") run("npm", ["run", "test:e2e"]);
else {
  console.error("Unknown test mode");
  process.exit(1);
}
