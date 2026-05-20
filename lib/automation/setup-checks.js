const { buildRuntimeFingerprint } = require("../env/runtime-fingerprint");
const { checkPayPalReadiness } = require("../paypal/readiness");

const SECTION_ENV = {
  database: [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_PUBLIC_KEY",
  ],
  storage: [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REFRESH_TOKEN",
    "GOOGLE_DRIVE_PROJECTS_FOLDER_ID",
  ],
  email: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
  payments: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_WEBHOOK_ID"],
  portal: ["SUPABASE_URL", "SUPABASE_PUBLIC_KEY", "ADMIN_EMAIL"],
};

async function runSetupChecks({ env = process.env, providers } = {}) {
  const effectiveProviders = providers || defaultProviders({ env });
  const runtimeFingerprint = buildRuntimeFingerprint(env);
  const sections = {};
  for (const [section, keys] of Object.entries(SECTION_ENV)) {
    const requiredEnv = Object.fromEntries(
      keys.map((key) => [key, { present: Boolean(env[key]) }])
    );
    const envReady = Object.values(requiredEnv).every((item) => item.present);
    const provider = await runProviderCheck(effectiveProviders[section]);
    sections[section] = {
      status:
        envReady && provider.status !== "failed" ? provider.status : "failed",
      requiredEnv,
      provider,
    };
  }
  const overallStatus = Object.values(sections).every(
    (section) => section.status === "passed" || section.status === "skipped"
  )
    ? "passed"
    : "failed";
  return { overallStatus, runtimeFingerprint, sections };
}

async function runProviderCheck(provider) {
  if (!provider || typeof provider.check !== "function")
    return { status: "skipped", detail: "No provider check configured." };
  try {
    return await provider.check();
  } catch (error) {
    return { status: "failed", error: error.message };
  }
}

function defaultProviders({
  env = process.env,
  drive = require("../google/drive"),
  resend = require("../email/resend"),
} = {}) {
  return {
    database: {
      check: async () => ({
        status: "skipped",
        detail: "Database live check is run by sandbox mode.",
      }),
    },
    storage: {
      check: async () => {
        await drive.verifyDriveAccess({ env });
        return {
          status: "passed",
          detail: "Drive projects folder is accessible.",
        };
      },
    },
    email: {
      check: async () => resend.verifyResendSender({ env }),
    },
    payments: {
      check: async () => {
        const readiness = checkPayPalReadiness({ env });
        if (readiness.status === "failed") {
          return {
            status: "failed",
            error: readiness.error,
            detail: readiness.detail,
            paypalEnv: readiness.paypalEnv,
            baseUrl: readiness.baseUrl,
          };
        }
        return {
          status: "passed",
          detail: readiness.detail,
          paypalEnv: readiness.paypalEnv,
          baseUrl: readiness.baseUrl,
        };
      },
    },
    portal: {
      check: async () => ({
        status: "skipped",
        detail: "Portal live check is run by sandbox mode.",
      }),
    },
  };
}

module.exports = {
  defaultProviders,
  runSetupChecks,
};
