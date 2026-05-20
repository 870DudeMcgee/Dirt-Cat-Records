const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canApproveFinal,
  canPayBalance,
  getAllowedPortalActions,
} = require("../lib/portal/action-rules");
const { evaluatePortalAction } = require("../lib/portal/action-policy");

test("canPayBalance allows only finals-ready or balance-due projects with balance", () => {
  assert.equal(
    canPayBalance({ status: "balance_due", balance_due: "50.00" }),
    true
  );
  assert.equal(
    canPayBalance({ status: "finals_ready", balance_due: "50.00" }),
    true
  );
  assert.equal(
    canPayBalance({ status: "mixing", balance_due: "50.00" }),
    false
  );
  assert.equal(
    canPayBalance({ status: "balance_due", balance_due: "0.00" }),
    false
  );
});

test("canApproveFinal requires unlocked final delivery for allowed statuses", () => {
  assert.equal(
    canApproveFinal({
      status: "delivered",
      final_delivery_url: "https://drive.test/final",
      final_delivery_locked: false,
    }),
    true
  );
  assert.equal(
    canApproveFinal({
      status: "delivered",
      final_delivery_url: "https://drive.test/final",
      final_delivery_locked: true,
    }),
    false
  );
  assert.equal(
    canApproveFinal({
      status: "mixing",
      final_delivery_url: "https://drive.test/final",
      final_delivery_locked: false,
    }),
    false
  );
});

test("getAllowedPortalActions returns active action names", () => {
  const actions = getAllowedPortalActions({
    status: "finals_ready",
    balance_due: "0.00",
    final_delivery_url: "https://drive.test/final",
    final_delivery_locked: false,
  });

  assert.deepEqual(actions, ["approve-final"]);
});

test("action rules remain a visibility adapter over action policy", () => {
  const project = {
    status: "finals_ready",
    balance_due: "99.00",
    final_delivery_url: "https://drive.test/final",
    final_delivery_locked: false,
  };

  assert.equal(
    canPayBalance(project),
    evaluatePortalAction("pay-balance", project).visible
  );
  assert.equal(
    canApproveFinal(project),
    evaluatePortalAction("approve-final", project).visible
  );
});
