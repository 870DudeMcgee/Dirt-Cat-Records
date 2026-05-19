const test = require("node:test");
const assert = require("node:assert/strict");
const { createSetupWizardHandler } = require("../api/admin/setup-wizard");

test("setup endpoint rejects non-admin users", async () => {
  const handler = createSetupWizardHandler({
    requireAdminImpl: async () => {
      const error = new Error("Admin access required.");
      error.statusCode = 403;
      throw error;
    },
  });
  const res = response();

  await handler({ method: "GET", headers: {} }, res);

  assert.equal(res.statusCode, 403);
});

test("setup endpoint returns readiness report for admin", async () => {
  const handler = createSetupWizardHandler({
    requireAdminImpl: async () => ({ email: "josh@example.com" }),
    runSetupChecksImpl: async () => ({ overallStatus: "passed", sections: {} }),
    env: { ADMIN_EMAIL: "josh@example.com" },
  });
  const res = response();

  await handler(
    { method: "GET", headers: {}, url: "/api/admin/setup-wizard?action=setup" },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.setup.overallStatus, "passed");
});

test("test-runs endpoint passes mode scenario and testRunId to automation runner", async () => {
  const calls = [];
  const handler = createSetupWizardHandler({
    requireAdminImpl: async () => ({ email: "josh@example.com" }),
    runAutomationTestImpl: async (input) => {
      calls.push(input);
      return {
        id: input.testRunId,
        report: { mode: input.mode, scenario: input.scenario },
      };
    },
    env: { ADMIN_EMAIL: "josh@example.com" },
  });
  const res = response();

  await handler(
    {
      method: "POST",
      headers: {},
      url: "/api/admin/setup-wizard?action=test-runs",
      body: {
        mode: "sandbox",
        scenario: "v1-usability",
        testRunId: "sandbox-20260519T120000-owner01",
      },
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].mode, "sandbox");
  assert.equal(calls[0].scenario, "v1-usability");
  assert.equal(calls[0].testRunId, "sandbox-20260519T120000-owner01");
});

function response() {
  return {
    statusCode: 0,
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
