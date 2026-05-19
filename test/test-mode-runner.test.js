const test = require("node:test");
const assert = require("node:assert/strict");
const { runAutomationTest } = require("../lib/automation/test-mode-runner");

test("runAutomationTest simulation uses fake providers and creates no external artifacts", async () => {
  const persisted = [];
  const result = await runAutomationTest({
    mode: "simulation",
    env: {
      ADMIN_EMAIL: "josh@example.com",
      SITE_URL: "https://dirtcatrecords.com",
    },
    records: {
      createAutomationTestRun: async (input) => {
        persisted.push({ type: "create", input });
        return input;
      },
      updateAutomationTestRun: async (_id, patch) => {
        persisted.push({ type: "update", patch });
        return patch;
      },
    },
  });

  assert.equal(result.report.mode, "simulation");
  assert.equal(result.report.status, "passed");
  assert.equal(result.report.createdDriveFolders.length, 0);
  assert.ok(
    result.report.steps.some((step) => step.key === "free_review_workflow")
  );
  assert.ok(
    result.report.steps.some((step) => step.key === "paid_project_workflow")
  );
  assert.equal(persisted[0].input.mode, "simulation");
});

test("runAutomationTest rejects unsupported modes", async () => {
  await assert.rejects(
    () => runAutomationTest({ mode: "live" }),
    /Unsupported automation test mode/
  );
});

test("runAutomationTest tolerates missing test run storage during first-time setup", async () => {
  const result = await runAutomationTest({
    mode: "simulation",
    env: {
      ADMIN_EMAIL: "josh@example.com",
      SITE_URL: "https://dirtcatrecords.com",
    },
    records: {
      createAutomationTestRun: async () => {
        throw new Error(
          "Supabase request failed: 404 Could not find the table 'public.automation_test_runs' in the schema cache"
        );
      },
      updateAutomationTestRun: async () => {
        throw new Error(
          "Supabase request failed: 404 Could not find the table 'public.automation_test_runs' in the schema cache"
        );
      },
    },
  });

  assert.equal(result.report.status, "passed");
});

test("runAutomationTest sandbox creates marked artifacts through real adapters", async () => {
  const calls = [];
  const result = await runAutomationTest({
    mode: "sandbox",
    testRunId: "sandbox-20260517T120000-abc123",
    env: {
      ADMIN_EMAIL: "josh@example.com",
      TEST_CUSTOMER_EMAIL: "test@example.com",
      SITE_URL: "https://dirtcatrecords.com",
    },
    records: sandboxRecords(calls),
    drive: {
      createDriveProjectFolders: async (input) => {
        calls.push({ type: "drive", input });
        return {
          projectFolderId: "drive-project",
          projectFolderUrl: "https://drive.test/project",
          uploadFolderId: "drive-upload",
          uploadFolderUrl: "https://drive.test/upload",
          finalsFolderId: "drive-finals",
          finalsFolderUrl: "https://drive.test/finals",
        };
      },
    },
    email: {
      sendCustomerEmail: async (to, emailType) =>
        calls.push({ type: "email.customer", to, emailType }),
      sendAdminEmail: async (subject) =>
        calls.push({ type: "email.admin", subject }),
    },
  });

  assert.equal(result.report.mode, "sandbox");
  assert.equal(result.report.status, "passed");
  assert.ok(
    result.report.createdRecords.some((record) => record.table === "projects")
  );
  assert.ok(
    result.report.createdDriveFolders.some(
      (folder) => folder.id === "drive-project"
    )
  );
  assert.equal(
    calls
      .find((call) => call.type === "drive")
      .input.artistName.includes("[TEST]"),
    true
  );
});

test("runAutomationTest sandbox fails when provider adapters fail silently", async () => {
  const result = await runAutomationTest({
    mode: "sandbox",
    testRunId: "sandbox-20260517T120000-failed1",
    env: {
      ADMIN_EMAIL: "josh@example.com",
      TEST_CUSTOMER_EMAIL: "test@example.com",
    },
    records: sandboxRecords([]),
    drive: {
      createDriveProjectFolders: async () => {
        throw new Error("Drive failed");
      },
    },
    email: {
      sendCustomerEmail: async () => ({ failed: true, error: "Email failed" }),
      sendAdminEmail: async () => ({ failed: true, error: "Email failed" }),
    },
  });

  assert.equal(result.report.status, "failed");
  assert.match(result.report.errors[0], /Drive folders|Email failed/);
});

test("runAutomationTest sandbox v1-usability exercises quote and balance payment paths", async () => {
  const calls = [];
  const result = await runAutomationTest({
    mode: "sandbox",
    scenario: "v1-usability",
    testRunId: "sandbox-20260519T120000-v1flow",
    env: {
      ADMIN_EMAIL: "josh@example.com",
      TEST_CUSTOMER_EMAIL: "test@example.com",
      SITE_URL: "https://dirtcatrecords.com",
    },
    records: sandboxV1Records(calls),
    drive: {
      createDriveProjectFolders: async () => ({
        projectFolderId: "drive-project",
        projectFolderUrl: "https://drive.test/project",
        uploadFolderId: "drive-upload",
        uploadFolderUrl: "https://drive.test/upload",
        finalsFolderId: "drive-finals",
        finalsFolderUrl: "https://drive.test/finals",
      }),
    },
    email: {
      sendCustomerEmail: async () => ({ id: "email-id" }),
      sendAdminEmail: async (subject, text) => {
        calls.push({ type: "email.admin", subject, text });
        return { id: "admin-email-id" };
      },
    },
  });

  assert.equal(result.report.scenario, "v1-usability");
  assert.ok(
    result.report.steps.some(
      (step) => step.key === "sandbox_quote_fixture" && step.status === "passed"
    )
  );
  assert.ok(
    result.report.steps.some(
      (step) => step.key === "sandbox_quote_payment" && step.status === "passed"
    )
  );
  assert.ok(
    result.report.steps.some(
      (step) =>
        step.key === "sandbox_finals_ready_locked" && step.status === "passed"
    )
  );
  assert.ok(
    result.report.steps.some(
      (step) =>
        step.key === "sandbox_balance_payment" && step.status === "passed"
    )
  );
  assert.ok(
    result.report.steps.some(
      (step) =>
        step.key === "sandbox_final_approval" && step.status === "passed"
    )
  );
  assert.ok(
    result.report.paypalEvents.some(
      (event) => event.id === "sandbox-20260519T120000-v1flow-quote-capture"
    )
  );
  assert.ok(
    result.report.paypalEvents.some(
      (event) => event.id === "sandbox-20260519T120000-v1flow-balance-capture"
    )
  );
  assert.equal(result.report.ownerProof.projectId, "project-3");
  assert.equal(result.report.ownerProof.customerEmail, "test@example.com");
  assert.deepEqual(
    result.report.ownerProof.previewStates.map((state) => state.label),
    ["Quote Ready", "Balance Due", "Delivered", "Approved"]
  );
  assert.equal(
    result.report.ownerProof.previewStates[1].project.status,
    "balance_due"
  );
  assert.equal(
    result.report.ownerProof.previewStates[2].project.status,
    "delivered"
  );
  assert.equal(
    result.report.ownerProof.previewStates[3].project.status,
    "approved"
  );
  assert.ok(
    calls.some(
      (call) => call.type === "delivery.update" && call.patch.finalDeliveryUrl
    )
  );
  assert.ok(
    calls.some(
      (call) =>
        call.type === "event" && call.event.eventType === "final_approved"
    )
  );
  assert.ok(
    calls.some(
      (call) =>
        call.type === "email.admin" && /Final approved/.test(call.subject)
    )
  );
  assert.equal(
    calls.filter(
      (call) =>
        call.type === "payment" && call.input.payment.paymentPurpose === "quote"
    ).length >= 1,
    true
  );
  assert.equal(
    calls.filter(
      (call) =>
        call.type === "payment" &&
        call.input.payment.paymentPurpose === "balance"
    ).length >= 1,
    true
  );
});

function sandboxRecords(calls) {
  return {
    createAutomationTestRun: async (input) => input,
    updateAutomationTestRun: async (_id, patch) => patch,
    upsertCustomer: async (input) => ({
      id: "customer-1",
      email: input.email,
      name: input.name,
    }),
    createLead: async () => ({ id: "lead-1" }),
    createProject: async (input) => {
      calls.push({ type: "project", input });
      return {
        id: `project-${calls.filter((call) => call.type === "project").length}`,
        project_code: "TEST-000001",
        status: input.status,
      };
    },
    updateProject: async (id, patch) => ({
      id,
      project_code: "TEST-000001",
      status: "awaiting_files",
      ...patch,
    }),
    createProjectEvent: async (event) => {
      calls.push({ type: "event", event });
      return { id: "event-1" };
    },
    upsertPaymentAndOrder: async () => ({
      order: { id: "order-1" },
      payment: { id: "payment-1" },
    }),
    getProjectById: async () => null,
    getProjectByOrderId: async () => null,
    linkOrderPaymentToProject: async () => {},
  };
}

function sandboxV1Records(calls) {
  const projects = new Map();
  return {
    createAutomationTestRun: async (input) => input,
    updateAutomationTestRun: async (_id, patch) => patch,
    upsertCustomer: async (input) => ({
      id: "customer-1",
      email: input.email,
      name: input.name,
    }),
    createLead: async () => ({ id: "lead-1" }),
    createProject: async (input) => {
      const id = `project-${projects.size + 1}`;
      const project = {
        id,
        project_code: "TEST-000001",
        customer_id: "customer-1",
        project_title: input.projectTitle || "Sandbox Project",
        artist_name: input.artistName || "Sandbox Artist",
        status: input.status,
        amount_paid: Number(input.amountPaid || 0).toFixed(2),
        total_amount: Number(input.totalAmount || 0).toFixed(2),
        balance_due: Number(input.balanceDue || 0).toFixed(2),
        final_delivery_locked: input.finalDeliveryLocked !== false,
        final_delivery_url: null,
      };
      projects.set(id, project);
      return project;
    },
    updateProject: async (id, patch) => {
      const current = projects.get(id) || { id, project_code: "TEST-000001" };
      const next = { ...current, ...patch };
      projects.set(id, next);
      if (patch.final_delivery_url)
        calls.push({ type: "delivery.update", patch });
      return next;
    },
    createProjectEvent: async (event) => {
      calls.push({ type: "event", event });
      return { id: `event-${event.eventType || event.event_type}` };
    },
    createEmailEvent: async () => ({ id: "email-1" }),
    upsertPaymentAndOrder: async (input) => {
      calls.push({ type: "payment", input });
      return {
        order: {
          id: `order-${calls.length}`,
          project_id: input.payment.projectId || null,
        },
        payment: {
          id: `payment-${calls.length}`,
          project_id: input.payment.projectId || null,
        },
      };
    },
    getProjectById: async (id) => projects.get(id) || null,
    getProjectByOrderId: async (orderId) => {
      const found = calls.find(
        (call) =>
          call.type === "payment" &&
          `order-${calls.indexOf(call) + 1}` === orderId
      );
      if (!found?.input?.payment?.projectId) return null;
      return projects.get(found.input.payment.projectId) || null;
    },
    linkOrderPaymentToProject: async () => {},
    createAdminQuote: async (projectId) => {
      calls.push({ type: "quote.create", projectId });
      return {
        id: "quote-1",
        status: "draft",
        expires_at: "2026-06-01T00:00:00.000Z",
        lineItems: [{ id: "qli-1" }],
      };
    },
    getQuoteById: async () => ({
      id: "quote-1",
      project_id: "project-3",
      base_service_id: "customDeposit",
      song_count: 1,
      final_total_cents: 45000,
      balance_cents: 22500,
    }),
    updateQuote: async () => ({ id: "quote-1", status: "accepted" }),
    updateAdminProjectDelivery: async (projectId, patch) => {
      calls.push({ type: "delivery.update", projectId, patch });
      const current = projects.get(projectId) || {};
      const updated = {
        ...current,
        status: "balance_due",
        final_delivery_url:
          patch.finalDeliveryUrl || current.final_delivery_url,
        final_delivery_locked: patch.unlockDelivery ? false : true,
      };
      projects.set(projectId, updated);
      return updated;
    },
    sendAdminEmail: async () => ({ id: "admin-email-1" }),
  };
}
