const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createPaidProjectWorkflow,
} = require("../lib/automation/studio-workflow");
const { parseCompletedPaymentEvent } = require("../lib/paypal/webhook");
const { buildOrderMetadata } = require("../lib/paypal/order-metadata");

test("balance payment webhook payload updates project to delivered when fully paid", async () => {
  const events = [];
  const workflow = createPaidProjectWorkflow({
    records: {
      upsertCustomer: async ({ email }) => ({ id: "customer-1", email }),
      upsertPaymentAndOrder: async () => ({
        order: { id: "order-1" },
        payment: { id: "payment-1" },
      }),
      getProjectById: async () => ({
        id: "project-1",
        amount_paid: 150,
        balance_due: 150,
        total_amount: 300,
        final_delivery_url: "https://drive.test/final.zip",
      }),
      updateProject: async (_id, patch) => ({ id: "project-1", ...patch }),
      createProjectEvent: async (event) => {
        events.push(event);
        return { id: "evt-1" };
      },
      linkOrderPaymentToProject: async () => ({}),
    },
    drive: { createDriveProjectFolders: async () => ({}) },
    email: {
      sendCustomerEmail: async () => ({}),
      sendAdminEmail: async () => ({}),
    },
  });

  const metadata = buildOrderMetadata({
    paymentPurpose: "balance",
    projectId: "project-1",
    amountCents: 15000,
    totalCents: 15000,
  });

  const payment = parseCompletedPaymentEvent({
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: {
      id: "CAPTURE-BALANCE-1",
      status: "COMPLETED",
      email_address: "buyer@example.com",
      amount: { value: "150.00", currency_code: "USD" },
      supplementary_data: { related_ids: { order_id: "ORDER-BALANCE-1" } },
      custom_id: metadata,
    },
  });

  const result = await workflow(payment);

  assert.equal(result.project.status, "delivered");
  assert.equal(result.project.balance_due, "0.00");
  assert.equal(result.project.final_delivery_locked, false);
  assert.ok(
    events.some((event) => event.eventType === "balance_payment_received")
  );
  assert.ok(
    events.some(
      (event) => event.metadata && event.metadata.paymentPurpose === "balance"
    )
  );
});
