const test = require("node:test");
const assert = require("node:assert/strict");
const { createPortalActionsHandler } = require("../api/portal/actions");

test("portal auth endpoint provisions auth for known customers", async () => {
  let provisionedEmail = null;
  const handler = createPortalActionsHandler({
    records: {
      normalizeEmail: (value) =>
        String(value || "")
          .trim()
          .toLowerCase(),
      getCustomerByEmail: async (email) => ({ id: "customer-1", email }),
    },
    ensureAuthUser: async (email) => {
      provisionedEmail = email;
      return { status: "created" };
    },
  });

  const res = createResponse();
  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/portal/actions?action=auth",
      body: JSON.stringify({ email: " Buyer@Example.com " }),
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(provisionedEmail, "buyer@example.com");
});

test("portal auth endpoint rejects invalid email", async () => {
  const handler = createPortalActionsHandler({
    records: {
      normalizeEmail: () => "",
      getCustomerByEmail: async () => {
        throw new Error("should not run");
      },
    },
    ensureAuthUser: async () => {
      throw new Error("should not run");
    },
  });

  const res = createResponse();
  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/portal/actions?action=auth",
      body: JSON.stringify({ email: "bad" }),
    },
    res
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "A valid email is required.");
});

test("portal auth endpoint rejects unknown customer emails", async () => {
  const handler = createPortalActionsHandler({
    records: {
      normalizeEmail: (value) =>
        String(value || "")
          .trim()
          .toLowerCase(),
      getCustomerByEmail: async () => null,
    },
    ensureAuthUser: async () => {
      throw new Error("should not run");
    },
  });

  const res = createResponse();
  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/portal/actions?action=auth",
      body: JSON.stringify({ email: "buyer@example.com" }),
    },
    res
  );

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, "No portal access found for that email.");
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
