const test = require("node:test");
const assert = require("node:assert/strict");
const { createPortalActionsHandler } = require("../lib/api/portal/actions");

test("portal balance endpoint validates project id", async () => {
  const handler = createPortalActionsHandler({
    requireUserImpl: async () => ({ email: "buyer@example.com" }),
    records: {
      getCustomerByEmail: async () => ({ id: "customer-1" }),
    },
  });
  const res = response();

  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/portal/actions?action=pay-balance",
      body: {},
    },
    res
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "projectId is required.");
});

test("portal balance endpoint creates paypal order for remaining balance", async () => {
  const calls = [];
  const handler = createPortalActionsHandler({
    requireUserImpl: async () => ({ email: "buyer@example.com" }),
    records: {
      getCustomerByEmail: async () => ({
        id: "customer-1",
        email: "buyer@example.com",
      }),
      getProjectForCustomer: async () => ({
        id: "project-1",
        project_code: "DCR-000123",
        balance_due: "225.00",
        status: "balance_due",
      }),
      createProjectEvent: async (event) => calls.push({ type: "event", event }),
    },
    fetchImpl: async (url) => {
      if (String(url).endsWith("/v1/oauth2/token"))
        return jsonResponse({ access_token: "token" });
      if (String(url).includes("/v2/checkout/orders")) {
        return jsonResponse({
          id: "ORDER-123",
          links: [
            { rel: "approve", href: "https://paypal.test/approve/ORDER-123" },
          ],
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    },
    env: {
      PAYPAL_CLIENT_ID: "client-id",
      PAYPAL_CLIENT_SECRET: "client-secret",
      PAYPAL_ENV: "sandbox",
    },
  });

  const res = response();
  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/portal/actions?action=pay-balance",
      body: { projectId: "project-1" },
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.paypalOrderId, "ORDER-123");
  assert.equal(res.body.approvalUrl, "https://paypal.test/approve/ORDER-123");
  assert.equal(calls[0].event.eventType, "balance_checkout_started");
});

function response() {
  return {
    statusCode: 0,
    body: null,
    setHeader() {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}
