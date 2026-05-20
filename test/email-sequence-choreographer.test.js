const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildProjectIntakeEmailSequence,
  buildFollowUpReminderEmail,
  sendEmailSequence,
} = require("../lib/email/email-sequence-choreographer");

test("buildProjectIntakeEmailSequence owns free-review email order", () => {
  const sequence = buildProjectIntakeEmailSequence({
    kind: "free_review",
    customer: {
      email: "buyer@example.com",
      name: "Buyer",
    },
    project: {
      id: "project-1",
      drive_upload_folder_url: "https://drive.test/upload",
    },
    adminEmail: "josh@example.com",
    portalUrl: "https://dirtcat.test/portal.html",
  });

  assert.deepEqual(
    sequence.map((message) => message.emailType),
    ["free_review_received", "upload_instructions", "admin_notification"]
  );
  assert.equal(sequence[0].to, "buyer@example.com");
  assert.equal(sequence[1].data.uploadFolderUrl, "https://drive.test/upload");
  assert.equal(sequence[2].to, "josh@example.com");
  assert.equal(sequence[2].data.subject, "New free mix review");
});

test("sendEmailSequence sends in order and logs sequence metadata", async () => {
  const calls = [];
  const result = await sendEmailSequence({
    records: {
      createEmailEvent: async (event) => {
        calls.push({ type: "emailEvent", event });
      },
    },
    sendEmail: async (message) => {
      calls.push({ type: "send", message });
      return { id: `resend-${calls.length}` };
    },
    sequenceName: "paid_project_created",
    messages: [
      {
        to: "buyer@example.com",
        emailType: "payment_received",
        customerId: "customer-1",
        projectId: "project-1",
        data: { portalUrl: "https://dirtcat.test/portal.html" },
      },
      {
        to: "buyer@example.com",
        emailType: "upload_instructions",
        customerId: "customer-1",
        projectId: "project-1",
        data: {
          portalUrl: "https://dirtcat.test/portal.html",
          uploadFolderUrl: "https://drive.test/upload",
        },
      },
    ],
  });

  assert.equal(result.sent.length, 2);
  assert.deepEqual(
    calls.filter((call) => call.type === "send").map((call) => call.message.emailType),
    ["payment_received", "upload_instructions"]
  );
  assert.equal(
    calls.filter((call) => call.type === "send")[1].message.emailType,
    "upload_instructions"
  );
  assert.equal(
    calls.find((call) => call.type === "emailEvent").event.metadata.sequenceName,
    "paid_project_created"
  );
});

test("sendEmailSequence records failures and can throw after logging", async () => {
  const calls = [];

  await assert.rejects(
    () =>
      sendEmailSequence({
        records: {
          createEmailEvent: async (event) => {
            calls.push({ type: "emailEvent", event });
          },
        },
        sendEmail: async () => {
          throw new Error("Resend is down");
        },
        throwOnFailure: true,
        messages: [
          {
            to: "buyer@example.com",
            emailType: "quote_sent",
            customerId: "customer-1",
            projectId: "project-1",
            metadata: { quoteId: "quote-1" },
          },
        ],
      }),
    /Resend is down/
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].event.status, "failed");
  assert.equal(calls[0].event.emailType, "quote_sent");
  assert.equal(calls[0].event.metadata.quoteId, "quote-1");
});

test("buildFollowUpReminderEmail keeps reminder content separate from transport", () => {
  const message = buildFollowUpReminderEmail(
    {
      followup_type: "balance_due",
      project_id: "project-1",
    },
    {
      id: "project-1",
      project_code: "DCR-000001",
    },
    {
      portalUrl: "https://dirtcat.test/portal.html?project=project-1",
    }
  );

  assert.equal(message.emailType, "admin_notification");
  assert.equal(message.eventEmailType, "followup_balance_due");
  assert.match(message.data.subject, /balance due/i);
  assert.match(message.data.text, /project=project-1/);
});
