const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildBalancePaymentTransition,
  buildCheckoutProjectTransition,
  buildQuotePaymentTransition,
} = require("../lib/automation/project-payment-transition");

test("buildCheckoutProjectTransition locks delivery when checkout leaves a balance", () => {
  const transition = buildCheckoutProjectTransition({
    customerId: "customer-1",
    orderId: "order-1",
    input: {
      artistName: "Dude McGee",
      projectTitle: "Song One",
      totalAmount: "450.00",
      amountDueNow: "225.00",
      remainingBalance: "225.00",
      orderSummary: {
        baseServiceId: "mixMaster",
        songCount: 2,
      },
    },
  });

  assert.equal(transition.status, "awaiting_files");
  assert.equal(transition.projectType, "paid");
  assert.equal(transition.amountPaid, 225);
  assert.equal(transition.balanceDue, 225);
  assert.equal(transition.finalDeliveryLocked, true);
});

test("buildQuotePaymentTransition converts quote projects to balance due", () => {
  const transition = buildQuotePaymentTransition({
    project: {
      id: "project-1",
      service_id: "mix",
      song_count: 1,
    },
    quote: {
      id: "quote-1",
      base_service_id: "mixMaster",
      song_count: 3,
      final_total_cents: 45000,
      balance_cents: 22500,
    },
    input: {
      amountDueNow: "225.00",
      totalAmount: "450.00",
      remainingBalance: "225.00",
    },
  });

  assert.equal(transition.projectPatch.project_type, "paid");
  assert.equal(transition.projectPatch.status, "balance_due");
  assert.equal(transition.projectPatch.final_delivery_locked, true);
  assert.equal(transition.projectPatch.service_id, "mixMaster");
  assert.equal(transition.projectPatch.balance_due, "225.00");
  assert.equal(transition.quotePatch.status, "accepted");
  assert.ok(transition.quotePatch.accepted_at);
});

test("buildBalancePaymentTransition unlocks delivered finals after full payment", () => {
  const transition = buildBalancePaymentTransition({
    project: {
      amount_paid: 225,
      total_amount: 450,
      balance_due: 225,
      final_delivery_url: "https://drive.test/finals/file.zip",
    },
    input: {
      amountDueNow: "225.00",
    },
  });

  assert.equal(transition.paymentAmount, 225);
  assert.deepEqual(transition.projectPatch, {
    amount_paid: "450.00",
    total_amount: "450.00",
    balance_due: "0.00",
    final_delivery_locked: false,
    status: "delivered",
  });
});
