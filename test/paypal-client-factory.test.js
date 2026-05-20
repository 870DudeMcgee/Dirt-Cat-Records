const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createPayPalClient,
  getPayPalBaseUrl,
} = require("../lib/paypal/client-factory");

test("getPayPalBaseUrl resolves sandbox and live endpoints", () => {
  assert.equal(getPayPalBaseUrl("sandbox"), "https://api-m.sandbox.paypal.com");
  assert.equal(getPayPalBaseUrl("live"), "https://api-m.paypal.com");
  assert.equal(getPayPalBaseUrl(undefined), "https://api-m.sandbox.paypal.com");
});

test("createPayPalClient gets access token and posts JSON payload", async () => {
  const requests = [];
  const client = createPayPalClient({
    env: {
      PAYPAL_CLIENT_ID: "client-id",
      PAYPAL_CLIENT_SECRET: "client-secret",
      PAYPAL_ENV: "sandbox",
    },
    fetchImpl: async (url, options) => {
      requests.push({ url: String(url), options });
      if (String(url).endsWith("/v1/oauth2/token")) {
        return {
          ok: true,
          async json() {
            return { access_token: "token-1" };
          },
        };
      }
      return {
        ok: true,
        async json() {
          return { id: "ORDER-1" };
        },
      };
    },
  });

  const result = await client.post("/v2/checkout/orders", {
    intent: "CAPTURE",
  });

  assert.equal(result.id, "ORDER-1");
  assert.equal(requests.length, 2);
  assert.match(requests[0].url, /\/v1\/oauth2\/token$/);
  assert.match(requests[1].url, /\/v2\/checkout\/orders$/);
  assert.equal(requests[1].options.headers.Prefer, "return=representation");
});

test("createPayPalClient gets access token and performs GET requests", async () => {
  const requests = [];
  const client = createPayPalClient({
    env: {
      PAYPAL_CLIENT_ID: "client-id",
      PAYPAL_CLIENT_SECRET: "client-secret",
      PAYPAL_ENV: "sandbox",
    },
    fetchImpl: async (url, options) => {
      requests.push({ url: String(url), options });
      if (String(url).endsWith("/v1/oauth2/token")) {
        return {
          ok: true,
          async json() {
            return { access_token: "token-1" };
          },
        };
      }
      return {
        ok: true,
        async json() {
          return { id: "ORDER-1", status: "APPROVED" };
        },
      };
    },
  });

  const result = await client.get("/v2/checkout/orders/ORDER-1");

  assert.equal(result.id, "ORDER-1");
  assert.equal(requests.length, 2);
  assert.match(requests[0].url, /\/v1\/oauth2\/token$/);
  assert.match(requests[1].url, /\/v2\/checkout\/orders\/ORDER-1$/);
  assert.equal(requests[1].options.method, "GET");
  assert.equal(requests[1].options.headers.Prefer, "return=representation");
});
