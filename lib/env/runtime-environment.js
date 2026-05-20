function getRuntimeEnvironment(env = process.env) {
  const vercelEnv = normalizeRuntimeName(env.VERCEL_ENV);
  const name = vercelEnv || inferLocalRuntimeName(env);

  return {
    name,
    isDevelopment: name === "development",
    isPreview: name === "preview",
    isProduction: name === "production",
  };
}

function getExpectedPayPalEnvironment(env = process.env) {
  return getRuntimeEnvironment(env).isProduction ? "live" : "sandbox";
}

function getPayPalRuntimeInvariant(env = process.env) {
  const runtimeEnvironment = getRuntimeEnvironment(env);
  const expectedPayPalEnv = getExpectedPayPalEnvironment(env);
  const actualPayPalEnv =
    String(env.PAYPAL_ENV || "")
      .trim()
      .toLowerCase() || "sandbox";

  return {
    key: "paypal_environment_matches_runtime",
    status: actualPayPalEnv === expectedPayPalEnv ? "passed" : "failed",
    runtimeEnvironment: runtimeEnvironment.name,
    expectedPayPalEnv,
    actualPayPalEnv,
  };
}

function normalizeRuntimeName(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return ["development", "preview", "production"].includes(normalized)
    ? normalized
    : null;
}

function inferLocalRuntimeName(env) {
  return String(env.NODE_ENV || "")
    .trim()
    .toLowerCase() === "production"
    ? "production"
    : "development";
}

module.exports = {
  getExpectedPayPalEnvironment,
  getPayPalRuntimeInvariant,
  getRuntimeEnvironment,
};
