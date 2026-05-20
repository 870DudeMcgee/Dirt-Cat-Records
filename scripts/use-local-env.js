const fs = require("node:fs");
const path = require("node:path");

const ACTIVE_ENV_FILE = ".env.local";
const TEMPLATE_ENV_FILE = ".env.example";

const PROFILE_CONFIG = Object.freeze({
  preview: {
    fileName: ".env.local.preview",
    parityProfile: "preview",
    expectedPaypalEnv: "sandbox",
  },
  production: {
    fileName: ".env.local.production",
    parityProfile: "production",
    expectedPaypalEnv: "live",
  },
});

function main(argv = process.argv.slice(2)) {
  const [command, profileName] = argv;

  if (command === "init") {
    initProfile(profileName);
    return;
  }

  if (command === "use") {
    activateProfile(profileName);
    return;
  }

  if (command === "status") {
    printStatus();
    return;
  }

  printUsageAndExit();
}

function initProfile(profileName) {
  const profile = getProfileConfig(profileName);
  const profilePath = resolveRepoPath(profile.fileName);
  const templatePath = resolveRepoPath(TEMPLATE_ENV_FILE);

  if (!fs.existsSync(templatePath)) {
    fail(`Missing ${TEMPLATE_ENV_FILE}.`);
  }
  if (fs.existsSync(profilePath)) {
    fail(`${profile.fileName} already exists.`);
  }

  fs.copyFileSync(templatePath, profilePath);
  console.log(`Created ${profile.fileName} from ${TEMPLATE_ENV_FILE}.`);
  console.log(
    `Fill it with ${profileName} values, then run: npm run env:use:${profileName}`
  );
}

function activateProfile(profileName) {
  const profile = getProfileConfig(profileName);
  const profilePath = resolveRepoPath(profile.fileName);
  const activePath = resolveRepoPath(ACTIVE_ENV_FILE);

  if (!fs.existsSync(profilePath)) {
    fail(`Missing ${profile.fileName}. Run: npm run env:init:${profileName}`);
  }

  fs.copyFileSync(profilePath, activePath);

  console.log(`Activated ${profileName} local env profile.`);
  console.log(`- source: ${profile.fileName}`);
  console.log(`- active: ${ACTIVE_ENV_FILE}`);
  console.log(
    `- next check: node scripts/check-env-parity.js ${ACTIVE_ENV_FILE} --profile ${profile.parityProfile}`
  );
}

function printStatus() {
  const activePath = resolveRepoPath(ACTIVE_ENV_FILE);

  if (!fs.existsSync(activePath)) {
    console.log(`${ACTIVE_ENV_FILE} is missing.`);
    console.log("Available profile files:");
    printAvailableProfiles();
    return;
  }

  const activeEnv = readEnvFile(activePath);
  const paypalEnv = activeEnv.PAYPAL_ENV || "(unset)";
  const siteUrl = activeEnv.SITE_URL || "(unset)";
  const matchedProfile = findMatchingProfile(activePath);

  console.log(`Active file: ${ACTIVE_ENV_FILE}`);
  console.log(`- matched profile: ${matchedProfile || "custom/manual"}`);
  console.log(`- PAYPAL_ENV: ${paypalEnv}`);
  console.log(`- SITE_URL: ${siteUrl}`);
  console.log("Available profile files:");
  printAvailableProfiles();
}

function findMatchingProfile(activePath) {
  for (const [profileName, profile] of Object.entries(PROFILE_CONFIG)) {
    const profilePath = resolveRepoPath(profile.fileName);
    if (!fs.existsSync(profilePath)) continue;
    if (filesMatch(activePath, profilePath)) {
      return profileName;
    }
  }
  return null;
}

function printAvailableProfiles() {
  for (const [profileName, profile] of Object.entries(PROFILE_CONFIG)) {
    const exists = fs.existsSync(resolveRepoPath(profile.fileName));
    const suffix = exists
      ? `present (${profile.expectedPaypalEnv})`
      : `missing (${profile.expectedPaypalEnv})`;
    console.log(`- ${profile.fileName}: ${suffix}`);
  }
}

function readEnvFile(filePath) {
  const env = {};
  const content = fs.readFileSync(filePath, "utf8");

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
    env[key] = stripWrappingQuotes(value);
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

function filesMatch(firstPath, secondPath) {
  return (
    fs.readFileSync(firstPath, "utf8") === fs.readFileSync(secondPath, "utf8")
  );
}

function getProfileConfig(profileName) {
  const profile = PROFILE_CONFIG[profileName];
  if (profile) return profile;
  fail(
    `Unknown profile \"${profileName || ""}\". Expected one of: ${Object.keys(
      PROFILE_CONFIG
    ).join(", ")}.`
  );
}

function resolveRepoPath(fileName) {
  return path.join(process.cwd(), fileName);
}

function printUsageAndExit() {
  const usage = [
    "Usage:",
    "  node scripts/use-local-env.js init <preview|production>",
    "  node scripts/use-local-env.js use <preview|production>",
    "  node scripts/use-local-env.js status",
  ].join("\n");
  fail(usage);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

main();
