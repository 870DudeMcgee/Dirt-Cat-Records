const fs = require("node:fs");
const path = require("node:path");

const templatePath = path.join(process.cwd(), ".env.example");
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(
    "Usage: node scripts/check-env-parity.js <env-file> [--profile local|preview|production]"
  );
  process.exit(1);
}

const envFilePath = path.resolve(process.cwd(), args[0]);
const profile = readOptionValue(args, "--profile") || "local";
const allowedProfiles = new Set(["local", "preview", "production"]);

if (!allowedProfiles.has(profile)) {
  console.error(
    `Unknown profile \"${profile}\". Expected one of: local, preview, production.`
  );
  process.exit(1);
}

if (!fs.existsSync(templatePath)) {
  console.error("Missing .env.example. Cannot audit environment parity.");
  process.exit(1);
}

if (!fs.existsSync(envFilePath)) {
  console.error(
    `Missing env file: ${path.relative(process.cwd(), envFilePath)}`
  );
  process.exit(1);
}

const templateKeys = readEnvFile(templatePath);
const targetEnv = readEnvFile(envFilePath);
const optionalKeys = new Set([
  "ALLOW_LOCAL_ADMIN_BYPASS",
  "GOOGLE_OAUTH_SCOPE",
  "SUPABASE_SECRET_KEY",
  "TEST_BUSINESS_NAME",
  "TEST_CUSTOMER_EMAIL",
  "TEST_DRIVE_FOLDER_PREFIX",
  "TEST_EMAIL_RECIPIENT",
  "TEST_SUBJECT_PREFIX",
]);
const requiredKeys = [...templateKeys.keys()].filter(
  (key) => !optionalKeys.has(key)
);
const missingKeys = requiredKeys.filter(
  (key) => !hasNonEmptyValue(targetEnv.get(key))
);
const warnings = [];
const failures = [];

if (profile === "local") {
  if (targetEnv.has("SITE_URL") && !isLocalSiteUrl(targetEnv.get("SITE_URL"))) {
    warnings.push("SITE_URL should point at localhost for the local profile.");
  }

  if (
    targetEnv.has("PAYPAL_ENV") &&
    targetEnv.get("PAYPAL_ENV") !== "sandbox"
  ) {
    warnings.push(
      "PAYPAL_ENV should usually be 'sandbox' for the local profile."
    );
  }
}

if (profile === "preview" && targetEnv.get("PAYPAL_ENV") !== "sandbox") {
  failures.push("PAYPAL_ENV must be 'sandbox' for the preview profile.");
}

if (profile === "production" && targetEnv.get("PAYPAL_ENV") !== "live") {
  failures.push("PAYPAL_ENV must be 'live' for the production profile.");
}

if (missingKeys.length > 0) {
  failures.unshift(`Missing required keys: ${missingKeys.join(", ")}`);
}

if (failures.length > 0) {
  console.error(
    `Env parity failed for ${profile}: ${path.relative(process.cwd(), envFilePath)}`
  );
  failures.forEach((message) => console.error(`- ${message}`));
  warnings.forEach((message) => console.error(`- Warning: ${message}`));
  process.exit(1);
}

console.log(
  `Env parity OK for ${profile}: ${path.relative(process.cwd(), envFilePath)}`
);

if (warnings.length > 0) {
  warnings.forEach((message) => console.log(`- Warning: ${message}`));
}

console.log(`- Required keys checked: ${requiredKeys.length}`);
console.log(`- Optional keys ignored: ${optionalKeys.size}`);

function readOptionValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1) return null;
  return argv[index + 1] || null;
}

function readEnvFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const env = new Map();

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;

    const key = trimmed
      .slice(0, separatorIndex)
      .replace(/^export\s+/, "")
      .trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!key) return;
    env.set(key, stripWrappingQuotes(value));
  });

  return env;
}

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function hasNonEmptyValue(value) {
  return typeof value === "string" && value.length > 0;
}

function isLocalSiteUrl(value) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value);
}
