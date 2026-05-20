const SECRET_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "RESEND_API_KEY",
  "PAYPAL_CLIENT_SECRET",
  "PAYPAL_WEBHOOK_ID",
];
const { getRuntimeEnvironment } = require("../env/runtime-environment");

function getBusinessConfig(env = process.env) {
  const runtimeEnvironment = getRuntimeEnvironment(env).name;
  return {
    businessName: env.TEST_BUSINESS_NAME || "Dirt Cat Records",
    runtimeEnvironment,
    adminEmail: env.ADMIN_EMAIL || null,
    siteUrl: (env.SITE_URL || "https://dirtcatrecords.com").replace(/\/$/, ""),
    replyToEmail: env.RESEND_REPLY_TO_EMAIL || env.ADMIN_EMAIL || null,
    testEmailRecipient: env.TEST_EMAIL_RECIPIENT || env.ADMIN_EMAIL || null,
    testCustomerEmail: env.TEST_CUSTOMER_EMAIL || env.ADMIN_EMAIL || null,
    testPrefix: env.TEST_SUBJECT_PREFIX || "[TEST]",
    driveFolderPrefix: env.TEST_DRIVE_FOLDER_PREFIX || "TEST",
    providers: {
      database: "supabase",
      storage: "google_drive",
      email: "resend",
      payments: "paypal",
      auth: "supabase_magic_link",
    },
    env,
  };
}

function redactBusinessConfig(config) {
  const env = config.env || {};
  return {
    businessName: config.businessName,
    runtimeEnvironment: config.runtimeEnvironment,
    adminEmail: config.adminEmail,
    siteUrl: config.siteUrl,
    replyToEmail: config.replyToEmail,
    testEmailRecipient: config.testEmailRecipient,
    testCustomerEmail: config.testCustomerEmail,
    testPrefix: config.testPrefix,
    driveFolderPrefix: config.driveFolderPrefix,
    providers: config.providers,
    secrets: Object.fromEntries(
      SECRET_KEYS.map((key) => [key, { present: Boolean(env[key]) }])
    ),
  };
}

module.exports = {
  getBusinessConfig,
  redactBusinessConfig,
};
