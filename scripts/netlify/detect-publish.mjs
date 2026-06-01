#!/usr/bin/env node
import { existsSync } from "fs";
import path from "path";
import {
  REPO_ROOT,
  GHIYABI_DIR,
  t,
  green,
  status,
} from "./lib.mjs";

/** Framework config → publish directory (relative to repo root) */
const FRAMEWORK_PUBLISH = [
  { config: "artifacts/ghiyabi/vite.config.ts", publish: "artifacts/ghiyabi/dist/public" },
  { config: "vite.config.ts", publish: "dist" },
  { config: "next.config.js", publish: "out" },
  { config: "next.config.mjs", publish: "out" },
  { config: "next.config.ts", publish: "out" },
  { config: "gatsby-config.js", publish: "public" },
  { config: "vue.config.js", publish: "dist" },
];

function detectPublishDir() {
  for (const { config, publish } of FRAMEWORK_PUBLISH) {
    const full = path.join(REPO_ROOT, config);
    if (existsSync(full)) return publish;
  }
  return null;
}

const detected = detectPublishDir();

if (!detected) {
  console.error(status(false, t("noFramework")));
  process.exit(1);
}

console.log(green(status(true, `${t("detectPublish")} ${detected}`)));
console.log(detected);

// Monorepo default: ghiyabi vite app
if (existsSync(path.join(GHIYABI_DIR, "vite.config.ts")) && detected !== "artifacts/ghiyabi/dist/public") {
  console.warn(
    `[WARN] Ghiyabi Vite app expects artifacts/ghiyabi/dist/public (see root netlify.toml)`,
  );
}
