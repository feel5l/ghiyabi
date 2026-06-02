import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(__dirname, "../..");
export const GHIYABI_DIR = path.join(REPO_ROOT, "artifacts/ghiyabi");
export const ENV_EXAMPLE = path.join(GHIYABI_DIR, ".env.example");
export const ENV_LOCAL = path.join(GHIYABI_DIR, ".env");
export const NETLIFY_TOML = path.join(REPO_ROOT, "netlify.toml");

const MESSAGES = {
  en: {
    errPrefix: "Error:",
    warnPrefix: "Warning:",
    okPrefix: "OK:",
    missingEnvFile: "Local .env not found. Copy .env.example and fill values:",
    missingKey: "Missing or empty in .env:",
    placeholderValue: "Placeholder value still set for:",
    netlifyCliMissing:
      "Netlify CLI not found. Install: npm install -g netlify-cli",
    netlifyEnvListFailed:
      "Could not read Netlify env vars. Recovery: netlify login && netlify link",
    netlifyMissingKeys: "Netlify site is missing variables:",
    fixEnvHint: "Run: pnpm run fix:env",
    recoveryHint: "Recovery: {cmd}",
    detectPublish: "Detected publish directory:",
    noFramework: "No known framework config found in repository root.",
  },
  ar: {
    errPrefix: "خطأ:",
    warnPrefix: "تحذير:",
    okPrefix: "تم:",
    missingEnvFile: "ملف .env المحلي غير موجود. انسخ .env.example واملأ القيم:",
    missingKey: "مفقود أو فارغ في .env:",
    placeholderValue: "قيمة افتراضية ما زالت مضبوطة لـ:",
    netlifyCliMissing: "Netlify CLI غير مثبت. ثبّت: npm install -g netlify-cli",
    netlifyEnvListFailed:
      "تعذّر قراءة متغيرات Netlify. الحل: netlify login && netlify link",
    netlifyMissingKeys: "موقع Netlify يفتقد المتغيرات:",
    fixEnvHint: "نفّذ: pnpm run fix:env",
    recoveryHint: "الحل: {cmd}",
    detectPublish: "مجلد النشر المكتشف:",
    noFramework: "لم يُعثر على إعداد إطار عمل معروف في جذر المستودع.",
  },
};

export function t(key, vars = {}) {
  const lang = (process.env.LANG || "en").toLowerCase().startsWith("ar")
    ? "ar"
    : "en";
  const message = MESSAGES[lang][key] ?? MESSAGES.en[key] ?? key;
  return String(message).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

export function green(text) {
  return useColor ? `\x1b[32m${text}\x1b[0m` : text;
}

export function red(text) {
  return useColor ? `\x1b[31m${text}\x1b[0m` : text;
}

export function yellow(text) {
  return useColor ? `\x1b[33m${text}\x1b[0m` : text;
}

export function cyan(text) {
  return useColor ? `\x1b[36m${text}\x1b[0m` : text;
}

/** Plain-text status for screen readers / no-color terminals */
export function status(level, label) {
  if (level === true || level === "ok") return `[OK] ${label}`;
  if (level === "warn") return `[WARN] ${label}`;
  return `[ERR] ${label}`;
}

export function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return null;
  const vars = {};
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    vars[key] = value;
  }
  return vars;
}

export function parseExampleKeys(filePath) {
  if (!existsSync(filePath)) return [];
  const keys = [];
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    keys.push(trimmed.slice(0, eq).trim());
  }
  return keys;
}

const PLACEHOLDER_PATTERNS = [
  /^your-/i,
  /^https:\/\/your-project/i,
  /-here$/i,
  /example\.com/i,
];

export function isPlaceholder(value) {
  if (!value) return true;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value));
}

export function renderProgress(percent, label) {
  const width = 20;
  const filled = Math.round((percent / 100) * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  const line = `[${bar}] ${String(percent).padStart(3)}% - ${label}`;
  process.stdout.write(`\r${cyan(line)}`);
  if (percent >= 100) process.stdout.write("\n");
}
