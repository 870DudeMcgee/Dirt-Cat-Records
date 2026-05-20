const test = require("node:test");
const assert = require("node:assert/strict");
const { createPaypalWebhookHandler } = require("../api/webhooks/paypal");

test("paypal webhook route rejects invalid signatures", async () => {
  let workflowCalled = false;
  const handler = createPaypalWebhookHandler({
    verifySignature: async () => false,
    runPaidProjectWorkflow: async () => {
      workflowCalled = true;
    },
  });
  const res = createResponse();

  await handler({ method: "POST", headers: {}, body: { id: "WH-EVENT" } }, res);

  assert.equal(res.statusCode, 401);
  assert.equal(workflowCalled, false);
});

test("paypal webhook route can verify signatures through the configured verifier seam", async () => {
  const calls = [];
  const handler = createPaypalWebhookHandler({
    env: {
      PAYPAL_CLIENT_ID: "client-id",
      PAYPAL_CLIENT_SECRET: "client-secret",
      PAYPAL_ENV: "sandbox",
      PAYPAL_WEBHOOK_ID: "WEBHOOK-123",
    },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      if (String(url).endsWith("/v1/oauth2/token")) {
        return jsonResponse({ access_token: "token-1" });
      }
      if (String(url).endsWith("/v1/notifications/verify-webhook-signature")) {
        return jsonResponse({ verification_status: "SUCCESS" });
      }
      throw new Error(`Unexpected URL: ${url}`);
    },
    parseEvent: async () => null,
  });
  const res = createResponse();

  await handler(
    {
      method: "POST",
      headers: {
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-cert-url": "https://api.sandbox.paypal.com/cert.pem",
        "paypal-transmission-id": "transmission-123",
        "paypal-transmission-sig": "sig-123",
        "paypal-transmission-time": "2026-05-16T12:00:00Z",
      },
      body: { id: "WH-EVENT" },
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, ignored: true });
  assert.equal(calls.length, 2);
  assert.equal(JSON.parse(calls[1].options.body).webhook_id, "WEBHOOK-123");
});

test("paypal webhook route runs paid project automation for completed payment events", async () => {
  const workflowInputs = [];
  const handler = createPaypalWebhookHandler({
    verifySignature: async () => true,
    runPaidProjectWorkflow: async (record) => {
      workflowInputs.push(record);
      return { project: { id: "project-123" } };
    },
  });
  const res = createResponse();

  await handler(
    {
      method: "POST",
      headers: {},
      body: {
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "CAPTURE-123",
          status: "COMPLETED",
          payer: { email_address: "buyer@example.com" },
          amount: { value: "149.00", currency_code: "USD" },
        },
      },
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(workflowInputs[0].paypalTxnId, "CAPTURE-123");
  assert.deepEqual(res.body, {
    ok: true,
    ignored: false,
    projectId: "project-123",
  });
});

test("paypal webhook route awaits injected event parser before running workflow", async () => {
  let workflowInput;
  const handler = createPaypalWebhookHandler({
    verifySignature: async () => true,
    parseEvent: async () => ({
      paypalTxnId: "CAPTURE-123",
      buyerEmail: "buyer@example.com",
      status: "paid",
      totalAmount: "199.00",
      orderSummary: {
        baseServiceId: "mixMaster",
        songCount: 1,
        paymentMode: "full",
      },
    }),
    runPaidProjectWorkflow: async (input) => {
      workflowInput = input;
      return { project: { id: "project-123" } };
    },
  });
  const res = createResponse();

  await handler(
    {
      method: "POST",
      headers: {},
      body: { event_type: "CHECKOUT.ORDER.COMPLETED" },
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.projectId, "project-123");
  assert.equal(workflowInput.buyerEmail, "buyer@example.com");
});

test("paypal webhook route treats server configuration errors as internal failures", async () => {
  const logs = [];
  const handler = createPaypalWebhookHandler({
    verifySignature: async () => {
      const error = new Error("PAYPAL_WEBHOOK_ID is required.");
      error.headers = { authorization: "Bearer secret-token" };
      error.webhookEvent = { payer: { email_address: "buyer@example.com" } };
      error.diagnostics = {
        paypalEnv: "live",
        clientIdPrefix: "AcileA",
        clientSecretPresent: true,
      };
      throw error;
    },
    logError: (...args) => logs.push(args),
  });
  const res = createResponse();

  await handler({ method: "POST", headers: {}, body: { id: "WH-EVENT" } }, res);

  assert.equal(res.statusCode, 500);
  assert.equal(logs.length, 1);
  assert.deepEqual(logs[0][1], {
    name: "Error",
    message: "PAYPAL_WEBHOOK_ID is required.",
    diagnostics: {
      paypalEnv: "live",
      clientIdPrefix: "AcileA",
      clientSecretPresent: true,
    },
  });
});

test("paypal webhook route rejects oversized string bodies", async () => {
  const handler = createPaypalWebhookHandler();
  const res = createResponse();
  const oversizedBody = JSON.stringify({ data: "x".repeat(65 * 1024) });

  await handler({ method: "POST", headers: {}, body: oversizedBody }, res);

  assert.equal(res.statusCode, 413);
  assert.deepEqual(res.body, { error: "Webhook payload is too large" });
});

test("paypal webhook route rejects oversized content-length before reading stream", async () => {
  const handler = createPaypalWebhookHandler();
  const res = createResponse();

  await handler(
    {
      method: "POST",
      headers: { "content-length": String(65 * 1024) },
      async *[Symbol.asyncIterator]() {
        throw new Error("stream should not be read");
      },
    },
    res
  );

  assert.equal(res.statusCode, 413);
  assert.deepEqual(res.body, { error: "Webhook payload is too large" });
});

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
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
