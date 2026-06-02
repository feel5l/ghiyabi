#!/usr/bin/env node
import { existsSync } from "fs";
import { spawnSync } from "child_process";
import {
  ENV_EXAMPLE,
  ENV_LOCAL,
  parseEnvFile,
  parseExampleKeys,
  isPlaceholder,
  t,
  green,
  red,
  yellow,
  status,
} from "./lib.mjs";

function hasNetlifyCli() {
  const r = spawnSync("netlify", ["--version"], { encoding: "utf8" });
  return r.status === 0;
}

function fetchNetlifyEnv() {
  const json = spawnSync("netlify", ["env:list", "--json"], {
    encoding: "utf8",
    cwd: process.cwd(),
  });
  if (json.status !== 0) return { ok: false, vars: null, error: json.stderr || json.stdout };
  try {
    const data = JSON.parse(json.stdout || "{}");
    const vars = {};
    for (const [key, meta] of Object.entries(data)) {
      if (meta && typeof meta === "object" && "values" in meta) {
        vars[key] = meta.values?.production ?? meta.values?.all ?? "";
      } else if (typeof meta === "string") {
        vars[key] = meta;
      }
    }
    return { ok: true, vars };
  } catch {
    return { ok: false, vars: null, error: json.stdout };
  }
}

const requiredKeys = parseExampleKeys(ENV_EXAMPLE);
if (requiredKeys.length === 0) {
  console.error(red(`${t("errPrefix")} ${ENV_EXAMPLE} not found or has no keys.`));
  process.exit(1);
}

let failed = false;

if (!existsSync(ENV_LOCAL)) {
  console.error(red(`${t("errPrefix")} ${t("missingEnvFile")}`));
  console.error(`  cp artifacts/ghiyabi/.env.example artifacts/ghiyabi/.env`);
  failed = true;
} else {
  const local = parseEnvFile(ENV_LOCAL);
  for (const key of requiredKeys) {
    const value = local?.[key];
    if (!value) {
      console.error(red(`${t("errPrefix")} ${t("missingKey")} ${key}`));
      failed = true;
    } else if (isPlaceholder(value)) {
      console.error(
        yellow(`${t("warnPrefix")} ${t("placeholderValue")} ${key}`),
      );
      failed = true;
    }
  }
  if (!failed) {
    console.log(
      green(status(true, `Local .env has ${requiredKeys.length} required variable(s)`)),
    );
  }
}

const skipNetlify = process.argv.includes("--local-only");
if (!skipNetlify) {
  if (!hasNetlifyCli()) {
    console.warn(yellow(`${t("warnPrefix")} ${t("netlifyCliMissing")}`));
    console.warn(`  ${t("fixEnvHint")}`);
  } else {
    const netlify = fetchNetlifyEnv();
    if (!netlify.ok) {
      console.warn(yellow(`${t("warnPrefix")} ${t("netlifyEnvListFailed")}`));
      if (netlify.error) {
        console.warn(netlify.error.trim().split("\n")[0]);
      }
      console.warn(`  ${t("fixEnvHint")}`);
    } else {
      const missingOnNetlify = requiredKeys.filter(
        (k) => !netlify.vars?.[k] || isPlaceholder(String(netlify.vars[k])),
      );
      if (missingOnNetlify.length > 0) {
        console.error(
          red(`${t("errPrefix")} ${t("netlifyMissingKeys")} ${missingOnNetlify.join(", ")}`),
        );
        console.error(`  ${t("fixEnvHint")}`);
        failed = true;
      } else {
        console.log(
          green(
            status(
              true,
              `Netlify env parity OK (${requiredKeys.length} variable(s))`,
            ),
          ),
        );
      }
    }
  }
}

process.exit(failed ? 1 : 0);
