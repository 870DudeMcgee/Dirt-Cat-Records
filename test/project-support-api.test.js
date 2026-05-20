const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createProjectSupportHandler,
} = require("../api/public/project-support");

test("project support endpoint validates and emails admin with payment context", async () => {
  let sentMessage = null;
  const handler = createProjectSupportHandler({
    rateStore: new Map(),
    env: { ADMIN_EMAIL: "josh@example.com" },
    sendEmail: async (message) => {
      sentMessage = message;
      return { id: "email-1" };
    },
  });

  const res = createResponse();
  await handler(
    {
      method: "POST",
      headers: {},
      body: JSON.stringify({
        name: "Buyer",
        email: "buyer@example.com",
        projectName: "Midnight Tape",
        issueType: "portal_access",
        message: "I did not receive my portal link yet.",
        paypalOrderId: "ORDER-123",
        serviceLabel: "Mix + Master",
        amountPaidLabel: "$199.00",
        paymentMode: "full",
      }),
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(sentMessage.to, "josh@example.com");
  assert.equal(sentMessage.emailType, "admin_notification");
  assert.match(sentMessage.data.subject, /Project support:/);
  assert.match(sentMessage.data.subject, /Midnight Tape/);
  assert.match(sentMessage.data.text, /portal link/);
  assert.match(sentMessage.data.text, /ORDER-123/);
  assert.match(sentMessage.data.text, /Mix \+ Master/);
});

test("project support endpoint rejects invalid email", async () => {
  const handler = createProjectSupportHandler({
    rateStore: new Map(),
    env: { ADMIN_EMAIL: "josh@example.com" },
    sendEmail: async () => {
      throw new Error("should not run");
    },
  });

  const res = createResponse();
  await handler(
    {
      method: "POST",
      headers: {},
      body: JSON.stringify({
        issueType: "portal_access",
        message: "hello",
        email: "bad",
      }),
    },
    res
  );

  assert.equal(res.statusCode, 400);
});

test("project support endpoint rejects unsupported issue types", async () => {
  const handler = createProjectSupportHandler({
    rateStore: new Map(),
    env: { ADMIN_EMAIL: "josh@example.com" },
    sendEmail: async () => {
      throw new Error("should not run");
    },
  });

  const res = createResponse();
  await handler(
    {
      method: "POST",
      headers: {},
      body: JSON.stringify({
        email: "buyer@example.com",
        issueType: "sales",
        message: "hello",
      }),
    },
    res
  );

  assert.equal(res.statusCode, 400);
});

test("project support endpoint rejects honeypot submissions", async () => {
  const handler = createProjectSupportHandler({
    rateStore: new Map(),
    env: { ADMIN_EMAIL: "josh@example.com" },
    sendEmail: async () => {
      throw new Error("should not run");
    },
  });

  const res = createResponse();
  await handler(
    {
      method: "POST",
      headers: {},
      body: JSON.stringify({
        email: "buyer@example.com",
        issueType: "portal_access",
        message: "hello",
        website: "bot",
      }),
    },
    res
  );

  assert.equal(res.statusCode, 400);
});

test("project support endpoint rate limits repeat submissions", async () => {
  let sendCount = 0;
  const handler = createProjectSupportHandler({
    rateStore: new Map(),
    rateLimitMs: 1000,
    now: () => 1000,
    env: { ADMIN_EMAIL: "josh@example.com" },
    sendEmail: async () => {
      sendCount += 1;
      return { id: "email-1" };
    },
  });

  const first = createResponse();
  const second = createResponse();
  const request = {
    method: "POST",
    headers: { "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify({
      email: "buyer@example.com",
      issueType: "portal_access",
      message: "hello",
    }),
  };

  await handler(request, first);
  await handler(request, second);

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 429);
  assert.equal(sendCount, 1);
});

function createResponse() {
  return {
    statusCode: 0,
    body: null,
    setHeader() {},
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}
