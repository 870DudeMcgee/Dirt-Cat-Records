const test = require("node:test");
const assert = require("node:assert/strict");

function response() {
  return {
    statusCode: 0,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end(body) {
      this.body = body ? JSON.parse(body) : undefined;
      return this;
    },
  };
}

test("public gateway dispatches to checkout config handler", async () => {
  process.env.PAYPAL_CLIENT_ID = "paypal-client";
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_PUBLIC_KEY = "public-key";

  const handler = require("../api/public");
  const res = response();

  await handler({ method: "GET", url: "/api/public?route=checkout-config", headers: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.paypalClientId, "paypal-client");
  assert.equal(res.body.supabasePublicKey, "public-key");
});

test("studio gateway dispatches to admin handlers", async () => {
  const handler = require("../api/studio");
  const res = response();

  await handler({ method: "GET", url: "/api/studio?route=admin-overview", headers: {} }, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: "Authentication required." });
});