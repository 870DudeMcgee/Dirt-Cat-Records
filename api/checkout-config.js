const { ensureRuntimeEnv } = require("../lib/env/runtime");
const { isLocalAdminBypassAllowed } = require("../lib/auth/supabase-auth");
const { sendJson } = require("../lib/http/json");

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
    supabaseUrl: env.SUPABASE_URL || "",
    supabasePublicKey: env.SUPABASE_PUBLIC_KEY || "",
  };
}

module.exports = handler;
module.exports.buildCheckoutConfig = buildCheckoutConfig;
