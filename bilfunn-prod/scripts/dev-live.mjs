// Opt-in loopback-only development. Only the SVV key is passed to the isolated app.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { realpathSync } from "node:fs";
import { spawn } from "node:child_process";
if (process.env.NODE_ENV === "production" || process.env.VERCEL)
  throw new Error("Local development only");
const require = createRequire(import.meta.url);
const root = resolve(
  dirname(realpathSync(fileURLToPath(import.meta.url))),
  "..",
);
require("@next/env").loadEnvConfig(root);
if (!process.env.SVV_API_KEY) throw new Error("Missing SVV_API_KEY");
const child = spawn(
  process.execPath,
  [resolve(root, "scripts/test-local.mjs"), "serve"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      LOCAL_VEHICLE_PREVIEW: "true",
      LOCAL_SVV_API_KEY: process.env.SVV_API_KEY,
    },
  },
);
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
child.on("exit", (code) => process.exit(code || 0));
