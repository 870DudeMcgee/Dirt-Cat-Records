const { ensureRuntimeEnv } = require("../env/runtime");
const { getPublicAppOrigin } = require("../env/public-origin");
const { buildRuntimeFingerprint } = require("../env/runtime-fingerprint");
const { isLocalAdminBypassAllowed } = require("../auth/supabase-auth");
const { sendJson } = require("../http/json");

ensureRuntimeEnv();

function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const checkoutConfig = buildCheckoutConfig(process.env, req);
  if (
    !checkoutConfig.paypalClientId ||
    !checkoutConfig.supabaseUrl ||
    !checkoutConfig.supabasePublicKey
  ) {
    return sendJson(res, 500, {
      error: "Public checkout config is not configured",
    });
  }

  return sendJson(res, 200, checkoutConfig);
}

function buildCheckoutConfig(env = process.env, req = null) {
  return {
    paypalClientId: env.PAYPAL_CLIENT_ID || "",
    currency: "USD",
    localTestCheckoutEnabled: req ? isLocalAdminBypassAllowed(req, env) : false,
    publicAppOrigin: getPublicAppOrigin(env),
    supabaseUrl: env.SUPABASE_URL || "",
    supabasePublicKey: env.SUPABASE_PUBLIC_KEY || "",
    runtimeFingerprint: buildRuntimeFingerprint(env),
  };
}

module.exports = handler;
module.exports.buildCheckoutConfig = buildCheckoutConfig;
