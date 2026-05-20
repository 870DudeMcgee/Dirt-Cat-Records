const { createPayPalClient } = require("./client-factory");
const {
  getPayPalBaseUrl,
  getPayPalEnvironmentConfig,
} = require("./environment-config");

function createPayPalWebhookVerifier({
  env = process.env,
  fetchImpl = fetch,
  paypalConfig = getPayPalEnvironmentConfig(env),
} = {}) {
  validatePayPalWebhookVerifierInputs(paypalConfig);

  return {
    async verifySignature({ headers, webhookEvent }) {
      const client = createPayPalClient({
        env,
        fetchImpl,
        mapErrorToHttp: false,
      });
      const accessToken = await client.getAccessToken();
      const response = await fetchImpl(
        `${paypalConfig.baseUrl}/v1/notifications/verify-webhook-signature`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            auth_algo: requirePayPalHeader(headers, "PAYPAL-AUTH-ALGO"),
            cert_url: requirePayPalHeader(headers, "PAYPAL-CERT-URL"),
            transmission_id: requirePayPalHeader(
              headers,
              "PAYPAL-TRANSMISSION-ID"
            ),
            transmission_sig: requirePayPalHeader(
              headers,
              "PAYPAL-TRANSMISSION-SIG"
            ),
            transmission_time: requirePayPalHeader(
              headers,
              "PAYPAL-TRANSMISSION-TIME"
            ),
            webhook_id: paypalConfig.webhookId,
            webhook_event: webhookEvent,
          }),
        }
      );

      const body = await parseResponseBody(response);
      if (!response.ok) {
        throw new Error(
          `Unable to verify PayPal webhook signature: ${formatResponseError(response, body)}`
        );
      }
      return body.verification_status === "SUCCESS";
    },
  };
}

function validatePayPalWebhookVerifierInputs(paypalConfig) {
  if (!paypalConfig.webhookIdPresent) {
    throw new Error("PAYPAL_WEBHOOK_ID is required.");
  }

  if (paypalConfig.baseUrl !== getPayPalBaseUrl(paypalConfig.paypalEnv)) {
    throw new Error(
      "PayPal webhook verifier received mismatched environment inputs."
    );
  }
}

function getHeader(headers, name) {
  if (!headers || !name) return undefined;
  const direct = headers[name];
  if (direct !== undefined) return direct;
  const lowerName = name.toLowerCase();
  const key = Object.keys(headers).find(
    (headerName) => headerName.toLowerCase() === lowerName
  );
  return key ? headers[key] : undefined;
}

function requirePayPalHeader(headers, headerName) {
  const value = getHeader(headers, headerName);
  if (!value) throw new Error(`Missing PayPal webhook header: ${headerName}`);
  return value;
}

async function parseResponseBody(response) {
  try {
    return await response.json();
  } catch (_error) {
    const text = await response.text();
    return text ? { message: text } : {};
  }
}

function formatResponseError(response, body) {
  return `${response.status} ${body?.message || body?.error_description || body?.error || JSON.stringify(body)}`;
}

module.exports = {
  createPayPalWebhookVerifier,
};
