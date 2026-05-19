const test = require("node:test");
const assert = require("node:assert/strict");
const {
  defaultProviders,
  runSetupChecks,
} = require("../lib/automation/setup-checks");

test("runSetupChecks reports missing env without exposing secrets", async () => {
  const report = await runSetupChecks({
    env: { ADMIN_EMAIL: "josh@example.com" },
    providers: {
      database: {
        check: async () => ({ status: "skipped", detail: "not configured" }),
      },
      storage: {
        check: async () => ({ status: "skipped", detail: "not configured" }),
      },
      email: {
        check: async () => ({ status: "skipped", detail: "not configured" }),
      },
      payments: {
        check: async () => ({ status: "skipped", detail: "not configured" }),
      },
      portal: {
        check: async () => ({ status: "skipped", detail: "not configured" }),
      },
    },
  });

  assert.equal(report.overallStatus, "failed");
  assert.equal(
    report.sections.database.requiredEnv.SUPABASE_URL.present,
    false
  );
  assert.equal(
    report.sections.database.requiredEnv.SUPABASE_SERVICE_ROLE_KEY.value,
    undefined
  );
});

test("runSetupChecks includes provider check results", async () => {
  const report = await runSetupChecks({
    env: {
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
      SUPABASE_PUBLIC_KEY: "public-key",
      GOOGLE_CLIENT_ID: "google-id",
      GOOGLE_CLIENT_SECRET: "google-secret",
      GOOGLE_REFRESH_TOKEN: "refresh-token",
      GOOGLE_DRIVE_PROJECTS_FOLDER_ID: "folder-id",
      RESEND_API_KEY: "resend-key",
      RESEND_FROM_EMAIL: "Dirt Cat <studio@example.com>",
      PAYPAL_CLIENT_ID: "paypal-id",
      PAYPAL_CLIENT_SECRET: "paypal-secret",
      PAYPAL_WEBHOOK_ID: "webhook-id",
      ADMIN_EMAIL: "josh@example.com",
    },
    providers: allPassingProviders(),
  });

  assert.equal(report.overallStatus, "passed");
  assert.equal(report.sections.storage.provider.status, "passed");
});

test("defaultProviders storage check fails when drive access probe fails", async () => {
  const env = {
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
    SUPABASE_PUBLIC_KEY: "public-key",
    GOOGLE_CLIENT_ID: "google-id",
    GOOGLE_CLIENT_SECRET: "google-secret",
    GOOGLE_REFRESH_TOKEN: "refresh-token",
    GOOGLE_DRIVE_PROJECTS_FOLDER_ID: "folder-id",
    RESEND_API_KEY: "resend-key",
    RESEND_FROM_EMAIL: "Dirt Cat <studio@example.com>",
    PAYPAL_CLIENT_ID: "paypal-id",
    PAYPAL_CLIENT_SECRET: "paypal-secret",
    PAYPAL_WEBHOOK_ID: "webhook-id",
    ADMIN_EMAIL: "josh@example.com",
  };
  const providers = {
    ...defaultProviders({
      env,
      drive: {
        verifyDriveAccess: async () => {
          throw new Error(
            "Unable to access Google Drive projects folder: File not found: ."
          );
        },
      },
    }),
    database: {
      check: async () => ({ status: "passed", detail: "database ready" }),
    },
  };

  const report = await runSetupChecks({ env, providers });
  assert.equal(report.overallStatus, "failed");
  assert.equal(report.sections.storage.status, "failed");
  assert.equal(report.sections.storage.provider.status, "failed");
  assert.equal(
    report.sections.storage.provider.error,
    "Unable to access Google Drive projects folder: File not found: ."
  );
});

function allPassingProviders() {
  return {
    database: {
      check: async () => ({ status: "passed", detail: "database ready" }),
    },
    storage: {
      check: async () => ({ status: "passed", detail: "drive ready" }),
    },
    email: { check: async () => ({ status: "passed", detail: "email ready" }) },
    payments: {
      check: async () => ({ status: "passed", detail: "payments ready" }),
    },
    portal: {
      check: async () => ({ status: "passed", detail: "portal ready" }),
    },
  };
}
