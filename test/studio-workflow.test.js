const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createFreeReviewWorkflow,
  createPaidProjectWorkflow,
} = require("../lib/automation/studio-workflow");

test("createFreeReviewWorkflow creates records then tries Drive and email", async () => {
  const calls = [];
  const workflow = createFreeReviewWorkflow({
    records: fakeRecords(calls),
    drive: fakeDrive(calls),
    email: fakeEmail(calls),
    env: { ADMIN_EMAIL: "josh@example.com" },
  });

  const result = await workflow({
    email: "Buyer@Example.com",
    name: "Buyer",
    artistName: "Dude McGee",
    projectTitle: "Song One",
    message: "Please review this mix.",
  });

  assert.equal(result.customer.email, "buyer@example.com");
  assert.equal(result.project.status, "awaiting_files");
  assert.ok(calls.some((call) => call.type === "drive.create"));
  assert.ok(calls.some((call) => call.type === "email.customer"));
  assert.ok(calls.some((call) => call.type === "email.admin"));
});

test("createPaidProjectWorkflow leaves project usable when Drive fails", async () => {
  const calls = [];
  const workflow = createPaidProjectWorkflow({
    records: fakeRecords(calls),
    drive: {
      createDriveProjectFolders: async () => {
        throw new Error("Drive failed");
      },
    },
    email: fakeEmail(calls),
    env: { ADMIN_EMAIL: "josh@example.com" },
  });

  const result = await workflow({
    paypalTxnId: "CAPTURE-1",
    buyerEmail: "buyer@example.com",
    totalAmount: "199.00",
    orderSummary: {
      baseServiceId: "mixMaster",
      songCount: 1,
      paymentMode: "full",
    },
  });

  assert.equal(result.project.status, "awaiting_files");
  assert.ok(
    calls.some(
      (call) =>
        call.type === "event" && call.message.match(/Drive automation failed/)
    )
  );
});

test("createPaidProjectWorkflow keeps Drive links when customer sharing is skipped", async () => {
  const calls = [];
  const workflow = createPaidProjectWorkflow({
    records: fakeRecords(calls),
    drive: {
      createDriveProjectFolders: async () => ({
        projectFolderId: "folder-project",
        projectFolderUrl: "https://drive.test/project",
        uploadFolderId: "folder-upload",
        uploadFolderUrl: "https://drive.test/upload",
        finalsFolderId: "folder-finals",
        finalsFolderUrl: "https://drive.test/finals",
        uploadFolderShareSkippedReason:
          "Sorry, you cannot share with sb-test@personal.example.com because they do not have a Google Account.",
      }),
    },
    email: fakeEmail(calls),
    env: { ADMIN_EMAIL: "josh@example.com" },
  });

  const result = await workflow({
    paypalTxnId: "CAPTURE-1",
    buyerEmail: "sb-test@personal.example.com",
    totalAmount: "199.00",
    orderSummary: {
      baseServiceId: "mixMaster",
      songCount: 1,
      paymentMode: "full",
    },
  });

  assert.equal(
    result.project.drive_upload_folder_url,
    "https://drive.test/upload"
  );
  assert.ok(
    calls.some(
      (call) =>
        call.type === "event" &&
        call.message.match(/customer sharing was skipped/i)
    )
  );
  assert.ok(
    calls.some(
      (call) =>
        call.type === "email.customer" &&
        call.emailType === "upload_instructions" &&
        call.data.uploadFolderUrl === "https://drive.test/upload"
    )
  );
});

test("createPaidProjectWorkflow uses preview deployment origin for customer portal links", async () => {
  const calls = [];
  const workflow = createPaidProjectWorkflow({
    records: fakeRecords(calls),
    drive: fakeDrive(calls),
    email: fakeEmail(calls),
    env: {
      ADMIN_EMAIL: "josh@example.com",
      SITE_URL: "https://www.dirtcatrecords.com",
      VERCEL_ENV: "preview",
      VERCEL_URL: "dirt-cat-records-preview-123.vercel.app",
    },
  });

  await workflow({
    paypalTxnId: "CAPTURE-1",
    buyerEmail: "buyer@example.com",
    totalAmount: "199.00",
    orderSummary: {
      baseServiceId: "mixMaster",
      songCount: 1,
      paymentMode: "full",
    },
  });

  const customerEmails = calls.filter((call) => call.type === "email.customer");
  assert.equal(customerEmails.length >= 2, true);
  assert.equal(
    customerEmails.every((call) =>
      String(call.data.portalUrl || "").startsWith(
        "https://dirt-cat-records-preview-123.vercel.app/portal.html"
      )
    ),
    true
  );
});

test("createPaidProjectWorkflow returns existing project on webhook retry without side effects", async () => {
  const calls = [];
  const records = fakeRecords(calls);
  records.upsertPaymentAndOrder = async () => ({
    order: { id: "order-1", project_id: "project-existing" },
    payment: { id: "payment-1", project_id: "project-existing" },
  });
  records.getProjectById = async () => ({
    id: "project-existing",
    status: "awaiting_files",
  });
  records.createProject = async () => {
    throw new Error("createProject should not run on retry");
  };
  const workflow = createPaidProjectWorkflow({
    records,
    drive: fakeDrive(calls),
    email: fakeEmail(calls),
    env: { ADMIN_EMAIL: "josh@example.com" },
  });

  const result = await workflow({
    paypalTxnId: "CAPTURE-1",
    buyerEmail: "buyer@example.com",
    totalAmount: "199.00",
    orderSummary: {
      baseServiceId: "mixMaster",
      songCount: 1,
      paymentMode: "full",
    },
  });

  assert.equal(result.project.id, "project-existing");
  assert.equal(
    calls.some((call) => call.type === "drive.create"),
    false
  );
  assert.equal(
    calls.some((call) => call.type === "email.customer"),
    false
  );
});

test("createPaidProjectWorkflow recovers when a concurrent retry already created the project", async () => {
  const calls = [];
  const records = fakeRecords(calls);
  records.createProject = async () => {
    throw new Error(
      'duplicate key value violates unique constraint "projects_order_id_unique_idx"'
    );
  };
  records.getProjectByOrderId = async () => ({
    id: "project-concurrent",
    status: "awaiting_files",
  });
  const workflow = createPaidProjectWorkflow({
    records,
    drive: fakeDrive(calls),
    email: fakeEmail(calls),
    env: { ADMIN_EMAIL: "josh@example.com" },
  });

  const result = await workflow({
    paypalTxnId: "CAPTURE-1",
    buyerEmail: "buyer@example.com",
    totalAmount: "199.00",
    orderSummary: {
      baseServiceId: "mixMaster",
      songCount: 1,
      paymentMode: "full",
    },
  });

  assert.equal(result.project.id, "project-concurrent");
  assert.equal(
    calls.some((call) => call.type === "drive.create"),
    false
  );
});

test("createPaidProjectWorkflow converts quoted projects when quote payment is confirmed", async () => {
  const calls = [];
  const records = fakeRecords(calls);
  records.getQuoteById = async () => ({
    id: "quote-1",
    base_service_id: "mixMaster",
    song_count: 3,
    payment_mode: "deposit",
    balance_cents: 22500,
  });
  records.getProjectById = async () => ({
    id: "project-1",
    status: "quote_sent",
    project_type: "free_review",
  });
  records.updateQuote = async (_quoteId, patch) => {
    calls.push({ type: "quote.patch", patch });
  };

  const workflow = createPaidProjectWorkflow({
    records,
    drive: fakeDrive(calls),
    email: fakeEmail(calls),
    env: { ADMIN_EMAIL: "josh@example.com" },
  });

  const result = await workflow({
    paymentPurpose: "quote",
    quoteId: "quote-1",
    projectId: "project-1",
    paypalTxnId: "CAPTURE-1",
    buyerEmail: "buyer@example.com",
    totalAmount: "450.00",
    amountDueNow: "225.00",
    remainingBalance: "225.00",
  });

  assert.equal(result.project.project_type, "paid");
  assert.equal(result.project.status, "balance_due");
  assert.ok(
    calls.some(
      (call) => call.type === "quote.patch" && call.patch.status === "accepted"
    )
  );
});

test("createPaidProjectWorkflow applies balance payment and unlocks finals when paid in full", async () => {
  const calls = [];
  const records = fakeRecords(calls);
  records.getProjectById = async () => ({
    id: "project-balance-1",
    status: "awaiting_balance_payment",
    amount_paid: 225,
    total_amount: 450,
    balance_due: 225,
    final_delivery_locked: true,
    final_delivery_url: "https://drive.test/finals/file.zip",
  });
  records.createProject = async () => {
    throw new Error("createProject should not be called for balance payments");
  };

  const workflow = createPaidProjectWorkflow({
    records,
    drive: fakeDrive(calls),
    email: fakeEmail(calls),
    env: { ADMIN_EMAIL: "josh@example.com" },
  });

  const result = await workflow({
    paymentPurpose: "balance",
    projectId: "project-balance-1",
    paypalTxnId: "CAPTURE-BAL-1",
    buyerEmail: "buyer@example.com",
    amountDueNow: "225.00",
    totalAmount: "225.00",
  });

  assert.equal(result.project.id, "project-1");
  assert.equal(result.project.status, "delivered");
  assert.equal(result.project.amount_paid, "450.00");
  assert.equal(result.project.balance_due, "0.00");
  assert.equal(result.project.final_delivery_locked, false);
  assert.ok(
    calls.some(
      (call) =>
        call.type === "event" && call.message.match(/Balance payment completed/)
    )
  );
});

test("default email adapter logs failed email without aborting free review workflow", async () => {
  const calls = [];
  const records = fakeRecords(calls);
  records.createEmailEvent = async (event) => {
    calls.push({ type: "email.event", status: event.status });
  };
  const workflow = createFreeReviewWorkflow({
    records,
    drive: fakeDrive(calls),
    resend: {
      sendStudioEmail: async () => {
        throw new Error("Resend failed");
      },
    },
    email: undefined,
    env: {
      ADMIN_EMAIL: "josh@example.com",
      RESEND_API_KEY: "resend-key",
      RESEND_FROM_EMAIL: "Dirt Cat Records <studio@example.com>",
      RESEND_REPLY_TO_EMAIL: "josh@example.com",
    },
  });

  const result = await workflow({
    email: "Buyer@Example.com",
    name: "Buyer",
    artistName: "Dude McGee",
    projectTitle: "Song One",
    message: "Please review this mix.",
  });

  assert.equal(result.project.status, "awaiting_files");
  assert.ok(
    calls.some(
      (call) => call.type === "email.event" && call.status === "failed"
    )
  );
});

function fakeRecords(calls) {
  return {
    upsertCustomer: async (input) => ({
      id: "customer-1",
      email: input.email.toLowerCase(),
      name: input.name || null,
    }),
    createLead: async () => ({ id: "lead-1" }),
    createProject: async (input) => ({
      id: "project-1",
      status: input.status,
      project_code: "DCR-000123",
    }),
    updateProject: async (_id, patch) => ({
      id: "project-1",
      status: "awaiting_files",
      ...patch,
    }),
    createProjectEvent: async (event) => {
      calls.push({ type: "event", message: event.message });
      return { id: "event-1" };
    },
    upsertPaymentAndOrder: async () => ({
      order: { id: "order-1" },
      payment: { id: "payment-1" },
    }),
    getProjectById: async () => null,
    getProjectByOrderId: async () => null,
    linkOrderPaymentToProject: async () => calls.push({ type: "link.project" }),
  };
}

function fakeDrive(calls) {
  return {
    createDriveProjectFolders: async () => {
      calls.push({ type: "drive.create" });
      return {
        projectFolderId: "folder-project",
        projectFolderUrl: "https://drive.test/project",
        uploadFolderId: "folder-upload",
        uploadFolderUrl: "https://drive.test/upload",
        finalsFolderId: "folder-finals",
        finalsFolderUrl: "https://drive.test/finals",
      };
    },
  };
}

function fakeEmail(calls) {
  return {
    sendCustomerEmail: async (_to, emailType, data) =>
      calls.push({ type: "email.customer", emailType, data }),
    sendAdminEmail: async (subject, text) =>
      calls.push({ type: "email.admin", subject, text }),
  };
}
