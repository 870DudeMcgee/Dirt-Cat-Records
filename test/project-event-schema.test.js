const test = require("node:test");
const assert = require("node:assert/strict");
const {
  balancePaymentReceived,
  buildProjectEvent,
  finalApproved,
  followUpJobEnqueued,
  normalizeProjectEvent,
  quoteCheckoutStarted,
} = require("../lib/automation/project-event-schema");

test("buildProjectEvent normalizes the canonical event shape", () => {
  assert.deepEqual(
    buildProjectEvent({
      projectId: "project-1",
      eventType: "custom_event",
      actorType: "system",
      message: "Something happened.",
      metadata: { ok: true },
    }),
    {
      projectId: "project-1",
      eventType: "custom_event",
      actorType: "system",
      message: "Something happened.",
      metadata: { ok: true },
    }
  );
});

test("normalizeProjectEvent accepts database-style field names", () => {
  assert.deepEqual(
    normalizeProjectEvent({
      project_id: "project-1",
      event_type: "files_submitted",
      actor_type: "customer",
      message: "Customer submitted an external file link.",
      metadata: { fileId: "file-1" },
    }),
    {
      projectId: "project-1",
      eventType: "files_submitted",
      actorType: "customer",
      message: "Customer submitted an external file link.",
      metadata: { fileId: "file-1" },
    }
  );
});

test("payment and portal event builders preserve accepted event contracts", () => {
  assert.deepEqual(
    balancePaymentReceived({
      projectId: "project-1",
      orderId: "order-1",
      paymentId: "payment-1",
      amountPaid: "225.00",
    }),
    {
      projectId: "project-1",
      eventType: "balance_payment_received",
      actorType: "paypal",
      message: "Balance payment completed and project financials were updated.",
      metadata: {
        paymentPurpose: "balance",
        orderId: "order-1",
        paymentId: "payment-1",
        amountPaid: "225.00",
      },
    }
  );

  assert.equal(
    finalApproved({ projectId: "project-1" }).eventType,
    "final_approved"
  );
  assert.equal(
    quoteCheckoutStarted({
      projectId: "project-1",
      quoteId: "quote-1",
      paypalOrderId: "paypal-order-1",
    }).metadata.quoteId,
    "quote-1"
  );
});

test("follow-up event builders keep queue metadata canonical", () => {
  const event = followUpJobEnqueued({
    projectId: "project-1",
    followUpType: "missing_files",
    scheduledFor: "2026-05-20T00:00:00.000Z",
    jobId: "job-1",
  });

  assert.equal(event.eventType, "followup_job_enqueued");
  assert.equal(event.actorType, "system");
  assert.deepEqual(event.metadata, {
    reminderType: "missing_files",
    scheduledFor: "2026-05-20T00:00:00.000Z",
    jobId: "job-1",
  });
});
