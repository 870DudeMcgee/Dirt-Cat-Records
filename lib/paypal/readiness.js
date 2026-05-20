const { getPayPalEnvironmentConfig } = require("./environment-config");
const { createPayPalWebhookVerifier } = require("./webhook-verifier");

function checkPayPalReadiness({ env = process.env } = {}) {
  const paypalConfig = getPayPalEnvironmentConfig(env);
  const requiredEnv = buildRequiredEnv(paypalConfig);

  if (!paypalConfig.paypalEnvMatchesRuntime) {
    return buildReadinessResult({
      paypalConfig,
      requiredEnv,
      status: "failed",
      error: `PAYPAL_ENV must be ${paypalConfig.expectedPayPalEnv} for ${paypalConfig.runtimeEnvironment} runtime.`,
    });
  }

  const missing = getMissingEnvKeys(requiredEnv);

  try {
    createPayPalWebhookVerifier({ env, paypalConfig });
  } catch (error) {
    if (!missing.includes("PAYPAL_WEBHOOK_ID")) {
      return buildReadinessResult({
        paypalConfig,
        requiredEnv,
        status: "failed",
        error: error.message,
      });
    }
  }

  if (missing.length > 0) {
    return buildReadinessResult({
      paypalConfig,
      requiredEnv,
      status: "failed",
      error: `Missing PayPal environment variables: ${missing.join(", ")}.`,
    });
  }

  return buildReadinessResult({
    paypalConfig,
    requiredEnv,
    status: "passed",
    detail: `PayPal ${paypalConfig.paypalEnv} config is ready for ${paypalConfig.runtimeEnvironment} runtime at ${paypalConfig.baseUrl}.`,
  });
}

function buildRequiredEnv(paypalConfig) {
  return {
    PAYPAL_CLIENT_ID: { present: paypalConfig.clientIdPresent },
    PAYPAL_CLIENT_SECRET: { present: paypalConfig.clientSecretPresent },
    PAYPAL_WEBHOOK_ID: { present: paypalConfig.webhookIdPresent },
  };
}

function getMissingEnvKeys(requiredEnv) {
  return Object.entries(requiredEnv)
    .filter(([, value]) => !value.present)
    .map(([key]) => key);
}

function buildReadinessResult({
  paypalConfig,
  requiredEnv,
  status,
  detail = null,
  error = null,
}) {
  return {
    status,
    paypalEnv: paypalConfig.paypalEnv,
    runtimeEnvironment: paypalConfig.runtimeEnvironment,
    expectedPayPalEnv: paypalConfig.expectedPayPalEnv,
    baseUrl: paypalConfig.baseUrl,
    requiredEnv,
    detail,
    error,
  };
}

module.exports = {
  checkPayPalReadiness,
};
