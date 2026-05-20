const {
  getExpectedPayPalEnvironment,
  getPayPalRuntimeInvariant,
  getRuntimeEnvironment,
} = require("../env/runtime-environment");

const PAYPAL_BASE_URLS = Object.freeze({
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
});

function normalizePayPalEnvironment(paypalEnv) {
  return String(paypalEnv || "")
    .trim()
    .toLowerCase() === "live"
    ? "live"
    : "sandbox";
}

function getPayPalBaseUrl(paypalEnv) {
  return PAYPAL_BASE_URLS[normalizePayPalEnvironment(paypalEnv)];
}

function getPayPalEnvironmentFromBaseUrl(baseUrl) {
  return baseUrl === PAYPAL_BASE_URLS.live ? "live" : "sandbox";
}

function getPayPalEnvironmentConfig(env = process.env) {
  const paypalEnv = normalizePayPalEnvironment(env.PAYPAL_ENV);
  const runtimeEnvironment = getRuntimeEnvironment(env);
  const expectedPayPalEnv = getExpectedPayPalEnvironment(env);
  const runtimeInvariant = getPayPalRuntimeInvariant(env);
  const clientId = String(env.PAYPAL_CLIENT_ID || "");
  const clientSecret = String(env.PAYPAL_CLIENT_SECRET || "");
  const webhookId = String(env.PAYPAL_WEBHOOK_ID || "");

  return {
    paypalEnv,
    runtimeEnvironment: runtimeEnvironment.name,
    expectedPayPalEnv,
    paypalEnvMatchesRuntime: runtimeInvariant.status === "passed",
    baseUrl: getPayPalBaseUrl(paypalEnv),
    clientId,
    clientSecret,
    webhookId,
    clientIdPresent: clientId.length > 0,
    clientSecretPresent: clientSecret.length > 0,
    credentialsPresent: clientId.length > 0 && clientSecret.length > 0,
    webhookIdPresent: webhookId.length > 0,
  };
}

module.exports = {
  PAYPAL_BASE_URLS,
  getPayPalBaseUrl,
  getPayPalEnvironmentConfig,
  getPayPalEnvironmentFromBaseUrl,
  normalizePayPalEnvironment,
};
