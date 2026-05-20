const {
  getPayPalBaseUrl,
  getPayPalEnvironmentConfig,
} = require("./environment-config");

function createPayPalClient({
  env = process.env,
  fetchImpl = fetch,
  mapErrorToHttp = true,
} = {}) {
  const paypalConfig = getPayPalEnvironmentConfig(env);
  const { clientId, clientSecret, baseUrl } = paypalConfig;

  if (!paypalConfig.credentialsPresent) {
    throw createHttpError(500, "PayPal checkout is not configured");
  }
  if (typeof fetchImpl !== "function") {
    throw createHttpError(500, "Fetch API is not available");
  }

  return {
    baseUrl,

    async getAccessToken() {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
        "base64"
      );
      const response = await fetchImpl(`${baseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      const data = await readPayPalJsonResponse(
        response,
        "Unable to authenticate with PayPal",
        { mapErrorToHttp }
      );
      if (!data.access_token) {
        throw createHttpError(502, "PayPal access token response was invalid");
      }
      return data.access_token;
    },

    async post(path, payload) {
      const accessToken = await this.getAccessToken();
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      });
      return readPayPalJsonResponse(response, "PayPal API request failed", {
        mapErrorToHttp,
      });
    },

    async get(path) {
      const accessToken = await this.getAccessToken();
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Prefer: "return=representation",
        },
      });
      return readPayPalJsonResponse(response, "PayPal API request failed", {
        mapErrorToHttp,
      });
    },
  };
}

async function readPayPalJsonResponse(response, publicMessage, options = {}) {
  let data;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    if (!options.mapErrorToHttp) {
      throw new Error(
        `${response.status} ${data?.message || data?.error_description || data?.error || JSON.stringify(data)}`
      );
    }
    const error = createHttpError(502, publicMessage);
    error.paypalStatus = response.status;
    error.paypalResponse = data;
    throw error;
  }

  return data;
}

function createHttpError(statusCode, publicMessage) {
  const error = new Error(publicMessage);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  return error;
}

module.exports = {
  createPayPalClient,
  getPayPalBaseUrl,
  readPayPalJsonResponse,
};
