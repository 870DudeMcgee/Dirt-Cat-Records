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
  assert.equal(report.runtimeFingerprint.adminEmail.masked, "j***@example.com");
  assert.equal(report.runtimeFingerprint.paypalClientId.present, false);
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
  assert.equal(report.runtimeFingerprint.paypalEnv, null);
  assert.equal(report.runtimeFingerprint.supabaseProjectRef, "project");
  assert.equal(report.runtimeFingerprint.resendFrom.masked, "s***@example.com");
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
      resend: {
        verifyResendSender: async () => ({
          status: "passed",
          detail: "email ready",
        }),
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

test("defaultProviders email check fails when Resend sender verification fails", async () => {
  const env = {
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
    SUPABASE_PUBLIC_KEY: "public-key",
    GOOGLE_CLIENT_ID: "google-id",
    GOOGLE_CLIENT_SECRET: "google-secret",
    GOOGLE_REFRESH_TOKEN: "refresh-token",
    GOOGLE_DRIVE_PROJECTS_FOLDER_ID: "folder-id",
    RESEND_API_KEY: "resend-key",
    RESEND_FROM_EMAIL: "Dirt Cat Records <studio@gmail.com>",
    PAYPAL_CLIENT_ID: "paypal-id",
    PAYPAL_CLIENT_SECRET: "paypal-secret",
    PAYPAL_WEBHOOK_ID: "webhook-id",
    ADMIN_EMAIL: "josh@example.com",
  };
  const providers = {
    ...defaultProviders({
      env,
      drive: {
        verifyDriveAccess: async () => undefined,
      },
      resend: {
        verifyResendSender: async () => {
          throw new Error(
            "Resend sender domain gmail.com is not configured in Resend."
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
  assert.equal(report.sections.email.status, "failed");
  assert.equal(report.sections.email.provider.status, "failed");
  assert.equal(
    report.sections.email.provider.error,
    "Resend sender domain gmail.com is not configured in Resend."
  );
});

test("defaultProviders payments check reports normalized PayPal readiness detail", async () => {
  const providers = defaultProviders({
    env: {
      VERCEL_ENV: "production",
      PAYPAL_ENV: "live",
      PAYPAL_CLIENT_ID: "paypal-id",
      PAYPAL_CLIENT_SECRET: "paypal-secret",
      PAYPAL_WEBHOOK_ID: "webhook-id",
    },
    drive: {
      verifyDriveAccess: async () => undefined,
    },
    resend: {
      verifyResendSender: async () => ({
        status: "passed",
        detail: "email ready",
      }),
    },
  });

  const result = await providers.payments.check();

  assert.equal(result.status, "passed");
  assert.match(result.detail, /PayPal live config is ready/);
  assert.match(result.detail, /https:\/\/api-m\.paypal\.com/);
});

test("defaultProviders payments check fails when PayPal readiness is missing", async () => {
  const providers = defaultProviders({
    env: { PAYPAL_ENV: "sandbox" },
    drive: {
      verifyDriveAccess: async () => undefined,
    },
    resend: {
      verifyResendSender: async () => ({
        status: "passed",
        detail: "email ready",
      }),
    },
  });

  const result = await providers.payments.check();

  assert.equal(result.status, "failed");
  assert.match(result.error, /PAYPAL_CLIENT_ID/);
  assert.equal(result.paypalEnv, "sandbox");
});

test("defaultProviders payments check fails when PayPal env conflicts with runtime lifecycle", async () => {
  const providers = defaultProviders({
    env: {
      VERCEL_ENV: "production",
      PAYPAL_ENV: "sandbox",
      PAYPAL_CLIENT_ID: "paypal-id",
      PAYPAL_CLIENT_SECRET: "paypal-secret",
      PAYPAL_WEBHOOK_ID: "webhook-id",
    },
    drive: {
      verifyDriveAccess: async () => undefined,
    },
    resend: {
      verifyResendSender: async () => ({
        status: "passed",
        detail: "email ready",
      }),
    },
  });

  const result = await providers.payments.check();

  assert.equal(result.status, "failed");
  assert.match(result.error, /PAYPAL_ENV must be live for production runtime/);
  assert.equal(result.paypalEnv, "sandbox");
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
