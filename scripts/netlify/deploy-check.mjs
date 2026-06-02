#!/usr/bin/env node
import { existsSync, readFileSync } from "fs";
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import {
  REPO_ROOT,
  NETLIFY_TOML,
  t,
  green,
  red,
  yellow,
  cyan,
  status,
  renderProgress,
} from "./lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const validateOnly =
  process.argv.includes("--validate-only") ||
  process.argv.includes("--dry-run");
const dryRun = process.argv.includes("--dry-run");

const steps = [
  { name: "Detect publish directory", weight: 10 },
  { name: "Validate environment variables", weight: 25 },
  { name: "Check netlify.toml", weight: 15 },
  { name: "Verify security headers", weight: 20 },
  { name: "Run production build", weight: 30 },
];

let progress = 0;
const results = [];

function runStep(label, fn) {
  return fn();
}

function readPublishFromToml() {
  if (!existsSync(NETLIFY_TOML)) return null;
  const content = readFileSync(NETLIFY_TOML, "utf8");
  const m = content.match(/^\s*publish\s*=\s*["']([^"']+)["']/m);
  return m?.[1] ?? null;
}

function checkSecurityHeaders() {
  if (!existsSync(NETLIFY_TOML)) return { ok: false, detail: "netlify.toml missing" };
  const content = readFileSync(NETLIFY_TOML, "utf8");
  const hasHeaders = content.includes("[[headers]]");
  if (hasHeaders) return { ok: true, detail: "[[headers]] block present" };
  return {
    ok: false,
    detail:
      "netlify.toml missing [[headers]] block; define root [[headers]] with required security headers",
  };
}

console.log(cyan(dryRun ? "Netlify deploy dry-run" : "Netlify pre-deploy checks"));
console.log("");

// Step 1: publish directory
progress += steps[0].weight;
renderProgress(progress, steps[0].name);

const detect = spawnSync("node", [path.join(__dirname, "detect-publish.mjs")], {
  encoding: "utf8",
  cwd: REPO_ROOT,
});
const detectedPublish = detect.stdout?.trim().split("\n").pop()?.trim();
const tomlPublish = readPublishFromToml();
const publishOk =
  detect.status === 0 &&
  detectedPublish &&
  (!tomlPublish || detectedPublish === tomlPublish);

results.push({
  label: "Publish directory",
  ok: publishOk,
  detail: publishOk
    ? `${detectedPublish}${tomlPublish ? " (matches netlify.toml)" : ""}`
    : `detected=${detectedPublish ?? "?"} toml=${tomlPublish ?? "?"}`,
});

// Step 2: env
progress += steps[1].weight;
renderProgress(progress, steps[1].name);

const envArgs = ["node", path.join(__dirname, "validate-env.mjs")];
if (validateOnly) envArgs.push("--local-only");

const envCheck = spawnSync(envArgs[0], envArgs.slice(1), {
  encoding: "utf8",
  cwd: REPO_ROOT,
  stdio: ["ignore", "pipe", "pipe"],
});
const envOk = envCheck.status === 0;
results.push({
  label: "Environment",
  ok: envOk,
  detail: envOk ? "Local .env OK" : (envCheck.stderr || envCheck.stdout || "").trim().split("\n")[0],
});

// Step 3: netlify.toml
progress += steps[2].weight;
renderProgress(progress, steps[2].name);

const tomlOk = existsSync(NETLIFY_TOML);
results.push({
  label: "netlify.toml",
  ok: tomlOk,
  detail: tomlOk ? NETLIFY_TOML : "Missing root netlify.toml",
});

// Step 4: headers
progress += steps[3].weight;
renderProgress(progress, steps[3].name);

const headers = checkSecurityHeaders();
results.push({
  label: "Security headers",
  ok: headers.ok,
  warn: headers.warn,
  detail: headers.detail,
});

// Step 5: build
progress += steps[4].weight;
renderProgress(progress, steps[4].name);

let buildOk = true;
let buildDetail = dryRun || validateOnly ? "Skipped (dry-run / validate-only)" : "";

if (!validateOnly && !dryRun) {
  const start = Date.now();
  const build = spawnSync("pnpm", ["--filter", "@workspace/ghiyabi", "run", "build"], {
    encoding: "utf8",
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  buildOk = build.status === 0;
  const secs = ((Date.now() - start) / 1000).toFixed(1);
  buildDetail = buildOk ? `success (${secs}s)` : `failed (${secs}s)`;
} else {
  const buildProbe = spawnSync(
    "pnpm",
    ["--filter", "@workspace/ghiyabi", "run", "typecheck"],
    { encoding: "utf8", cwd: REPO_ROOT, stdio: ["ignore", "pipe", "pipe"] },
  );
  if (buildProbe.status !== 0) {
    buildOk = false;
    buildDetail = "Typecheck failed (run pnpm run build locally)";
  }
}

results.push({ label: "Build", ok: buildOk, detail: buildDetail });

renderProgress(100, "Complete");
console.log("");

for (const r of results) {
  const prefix = r.ok ? (r.warn ? yellow("[WARN]") : green("[OK]")) : red("[ERR]");
  console.log(`${prefix} ${r.label}: ${r.detail}`);
}

const allOk = results.every((r) => r.ok);
if (allOk) {
  console.log("");
  console.log(green(status(true, validateOnly ? "Validation passed" : "Ready to deploy")));
  if (validateOnly) {
    console.log(cyan("Next: pnpm run deploy:production"));
  }
} else {
  console.log("");
  console.error(red(`${t("errPrefix")} Pre-deploy checks failed.`));
  const failedStep = results.find((r) => !r.ok)?.label;
  const recoveryByStep = {
    Environment: "pnpm run fix:env",
    "Publish directory": "pnpm run detect:publish",
    "netlify.toml": "create root netlify.toml",
    "Security headers": "add [[headers]] in netlify.toml",
    Build: "pnpm --filter @workspace/ghiyabi run build",
  };
  const cmd = recoveryByStep[failedStep] ?? "pnpm run deploy:validate";
  console.error(yellow(t("recoveryHint", { cmd })));
  process.exit(1);
}

if (dryRun) {
  console.log("");
  console.log(cyan("Dry-run complete — no deployment was performed."));
}
