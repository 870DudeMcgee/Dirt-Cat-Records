const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateBalancePaymentRequest,
} = require("../lib/portal/balance-payment-validator");

test("balance payment validator rejects blank project id", async () => {
  const result = await validateBalancePaymentRequest({
    projectId: " ",
    customerId: "customer-1",
    records: {},
  });

  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 400);
  assert.equal(result.reason, "project_id_required");
});

test("balance payment validator rejects missing project", async () => {
  const result = await validateBalancePaymentRequest({
    projectId: "project-1",
    customerId: "customer-1",
    records: {
      getProjectForCustomer: async () => null,
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 404);
  assert.equal(result.reason, "project_not_found");
});

test("balance payment validator accepts payable balance projects", async () => {
  const result = await validateBalancePaymentRequest({
    projectId: "project-1",
    customerId: "customer-1",
    records: {
      getProjectForCustomer: async () => ({
        id: "project-1",
        status: "balance_due",
        balance_due: "125.00",
      }),
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.project.id, "project-1");
  assert.equal(result.amountCents, 12500);
});
