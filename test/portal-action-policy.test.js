const test = require("node:test");
const assert = require("node:assert/strict");
const {
  evaluatePortalAction,
  getAllowedPortalActions,
  getPortalActionPolicy,
} = require("../lib/portal/action-policy");

test("policy allows balance payment only when balance is due in payable statuses", () => {
  assert.deepEqual(
    evaluatePortalAction("pay-balance", {
      status: "balance_due",
      balance_due: "125.50",
    }),
    {
      action: "pay-balance",
      visible: true,
      allowed: true,
      reason: "allowed",
      statusCode: 200,
      error: null,
      amountCents: 12550,
    }
  );

  assert.equal(
    evaluatePortalAction("pay-balance", {
      status: "mixing",
      balance_due: "125.50",
    }).allowed,
    false
  );
});

test("policy allows final approval only for unlocked delivered finals", () => {
  assert.deepEqual(
    evaluatePortalAction("approve-final", {
      status: "delivered",
      final_delivery_url: "https://drive.test/final",
      final_delivery_locked: false,
    }),
    {
      action: "approve-final",
      visible: true,
      allowed: true,
      reason: "allowed",
      statusCode: 200,
      error: null,
    }
  );

  const lockedDecision = evaluatePortalAction("approve-final", {
    status: "delivered",
    final_delivery_url: "https://drive.test/final",
    final_delivery_locked: true,
  });
  assert.equal(lockedDecision.allowed, false);
  assert.equal(lockedDecision.reason, "final_delivery_not_ready");
});

test("policy returns stable action list for visible portal actions", () => {
  const project = {
    status: "finals_ready",
    balance_due: "0.00",
    final_delivery_url: "https://drive.test/final",
    final_delivery_locked: false,
  };

  assert.deepEqual(getAllowedPortalActions(project), ["approve-final"]);
  assert.deepEqual(
    getPortalActionPolicy(project).map((decision) => [
      decision.action,
      decision.allowed,
    ]),
    [
      ["pay-balance", false],
      ["approve-final", true],
    ]
  );
});
