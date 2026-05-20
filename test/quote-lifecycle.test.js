const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildQuoteAcceptedPatch,
  buildQuoteCreatedProjectPatch,
  buildQuoteSentTransition,
  buildQuoteViewedPatch,
  getQuoteCheckoutIntent,
} = require("../lib/automation/quote-lifecycle");

test("buildQuoteCreatedProjectPatch activates a draft quote on the project", () => {
  assert.deepEqual(buildQuoteCreatedProjectPatch({ id: "quote-1" }), {
    active_quote_id: "quote-1",
    status: "quoted",
  });
});

test("buildQuoteSentTransition marks quote sent and project quote_sent", () => {
  assert.deepEqual(
    buildQuoteSentTransition({
      quoteId: "quote-1",
      now: "2026-05-20T12:00:00.000Z",
    }),
    {
      quotePatch: {
        status: "sent",
        sent_at: "2026-05-20T12:00:00.000Z",
      },
      projectPatch: {
        active_quote_id: "quote-1",
        status: "quote_sent",
      },
    }
  );
});

test("buildQuoteViewedPatch only marks draft or sent quotes viewed", () => {
  assert.deepEqual(
    buildQuoteViewedPatch(
      { status: "sent" },
      { now: "2026-05-20T12:00:00.000Z" }
    ),
    {
      status: "viewed",
      viewed_at: "2026-05-20T12:00:00.000Z",
    }
  );
  assert.equal(buildQuoteViewedPatch({ status: "viewed" }), null);
});

test("getQuoteCheckoutIntent returns deposit or full payment amount", () => {
  assert.deepEqual(
    getQuoteCheckoutIntent({
      status: "sent",
      payment_mode: "deposit",
      deposit_cents: 22500,
      final_total_cents: 45000,
    }),
    {
      amountDueNowCents: 22500,
      totalCents: 45000,
    }
  );

  assert.deepEqual(
    getQuoteCheckoutIntent({
      status: "viewed",
      payment_mode: "full",
      deposit_cents: 0,
      final_total_cents: 45000,
    }),
    {
      amountDueNowCents: 45000,
      totalCents: 45000,
    }
  );
});

test("getQuoteCheckoutIntent rejects terminal quote statuses", () => {
  assert.throws(
    () =>
      getQuoteCheckoutIntent({ status: "accepted", final_total_cents: 45000 }),
    /Quote is not payable/
  );
});

test("buildQuoteAcceptedPatch marks accepted timestamp", () => {
  assert.deepEqual(
    buildQuoteAcceptedPatch({ now: "2026-05-20T12:00:00.000Z" }),
    {
      status: "accepted",
      accepted_at: "2026-05-20T12:00:00.000Z",
    }
  );
});
