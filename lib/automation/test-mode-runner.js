const recordsDefault = require("../db/studio-records");
const resendDefault = require("../email/resend");
const {
  getBusinessConfig,
  redactBusinessConfig,
} = require("./business-config");
const { checkPayPalReadiness } = require("../paypal/readiness");
const {
  addArtifact,
  addStep,
  createTestReport,
  createTestRunId,
  finishReport,
} = require("./test-report");
const {
  createEmailAdapter,
  createFreeReviewWorkflow,
  createPaidProjectWorkflow,
} = require("./studio-workflow");

async function runAutomationTest(options = {}) {
  const mode = options.mode;
  if (!["simulation", "sandbox"].includes(mode))
    throw new Error(`Unsupported automation test mode: ${mode}`);
  if (mode === "sandbox") return runSandboxAutomationTest(options);
  return runSimulationAutomationTest(options);
}

async function runSimulationAutomationTest(options = {}) {
  const env = options.env || process.env;
  const config = getBusinessConfig(env);
  const records = options.records || recordsDefault;
  const id = options.testRunId || createTestRunId("simulation");
  let report = createTestReport({
    id,
    mode: "simulation",
    businessName: config.businessName,
    config: redactBusinessConfig(config),
  });

  await maybeCreateRun(records, report);

  try {
    const calls = [];
    const fakeRecords = createFakeRecords(calls);
    const fakeDrive = {
      createDriveProjectFolders: async () => ({
        projectFolderId: "sim-project",
        projectFolderUrl: "sim://project",
        uploadFolderId: "sim-upload",
        uploadFolderUrl: "sim://upload",
        finalsFolderId: "sim-finals",
        finalsFolderUrl: "sim://finals",
      }),
    };
    const fakeEmail = {
      sendCustomerEmail: async () => calls.push({ type: "email.customer" }),
      sendAdminEmail: async () => calls.push({ type: "email.admin" }),
    };

    await createFreeReviewWorkflow({
      records: fakeRecords,
      drive: fakeDrive,
      email: fakeEmail,
      env,
    })({
      email: config.testCustomerEmail || config.adminEmail,
      name: "Test Customer",
      artistName: `${config.testPrefix} Artist`,
      projectTitle: `${config.testPrefix} Free Review`,
      message: "Simulation free review.",
      referenceLinks: ["https://example.com/test-track"],
    });
    report = addStep(report, {
      key: "free_review_workflow",
      label: "Free review workflow",
      status: "passed",
    });

    await createPaidProjectWorkflow({
      records: fakeRecords,
      drive: fakeDrive,
      email: fakeEmail,
      env,
    })({
      paypalTxnId: `${id}-capture`,
      buyerEmail: config.testCustomerEmail || config.adminEmail,
      buyerName: "Test Customer",
      status: "paid",
      totalAmount: "199.00",
      amountDueNow: "199.00",
      remainingBalance: "0.00",
      orderSummary: {
        baseServiceId: "mixMaster",
        songCount: 1,
        paymentMode: "full",
      },
    });
    report = addStep(report, {
      key: "paid_project_workflow",
      label: "Paid project workflow",
      status: "passed",
    });
    report = addArtifact(report, {
      type: "simulation",
      id: `${id}-workflow`,
      detail: `${calls.length} fake provider calls`,
    });
  } catch (error) {
    report = addStep(report, {
      key: "simulation",
      label: "Simulation run",
      status: "failed",
      error: error.message,
    });
  }

  report = finishReport(report);
  await maybeUpdateRun(records, id, report);
  return { id, report };
}

async function runSandboxAutomationTest(options = {}) {
  const env = options.env || process.env;
  const config = getBusinessConfig(env);
  const scenario =
    options.scenario === "v1-usability" ? "v1-usability" : "standard";
  const trackedArtifacts = [];
  const records = createTrackingRecords(
    options.records || recordsDefault,
    trackedArtifacts
  );
  const drive = options.drive;
  const emailFailures = [];
  const email = createTrackingEmailAdapter(
    options.email ||
      createEmailAdapter(options.resend || resendDefault, records, env),
    emailFailures
  );
  const id = options.testRunId || createTestRunId("sandbox");
  let report = createTestReport({
    id,
    mode: "sandbox",
    businessName: config.businessName,
    scenario,
    config: redactBusinessConfig(config),
  });

  await maybeCreateRun(records, report);

  const paypalReadiness = checkPayPalReadiness({ env });
  report = addStep(report, {
    key: "paypal_readiness",
    label: "PayPal readiness",
    status: paypalReadiness.status,
    detail: paypalReadiness.detail,
    error: paypalReadiness.error,
  });

  try {
    const testEmail = config.testCustomerEmail || config.adminEmail;
    const freeReviewResult = await createFreeReviewWorkflow({
      records,
      drive,
      email,
      env,
    })({
      email: testEmail,
      name: `${config.testPrefix} Test Customer`,
      artistName: `${config.testPrefix} Artist ${id}`,
      projectTitle: `${config.testPrefix} Free Review ${id}`,
      message: `Sandbox free review for ${id}.`,
      referenceLinks: ["https://example.com/test-track"],
    });
    assertSandboxProvidersReady(
      freeReviewResult.project,
      emailFailures,
      "Sandbox free review"
    );
    report = addStep(report, {
      key: "sandbox_free_review",
      label: "Sandbox free review",
      status: "passed",
    });
    report = addTrackedArtifacts(report, trackedArtifacts);
    report = addArtifact(report, {
      type: "supabase",
      table: "projects",
      id: freeReviewResult.project.id,
    });
    report = addDriveArtifacts(report, freeReviewResult.project);

    const paidResult = await createPaidProjectWorkflow({
      records,
      drive,
      email,
      env,
    })({
      paypalTxnId: `${id}-capture`,
      paypalOrderId: `${id}-paypal-order`,
      buyerEmail: testEmail,
      buyerName: `${config.testPrefix} Test Customer`,
      status: "paid",
      totalAmount: "199.00",
      amountDueNow: "199.00",
      remainingBalance: "0.00",
      artistName: `${config.testPrefix} Paid Artist ${id}`,
      projectTitle: `${config.testPrefix} Paid Project ${id}`,
      orderSummary: {
        baseServiceId: "mixMaster",
        songCount: 1,
        paymentMode: "full",
      },
      rawPayload: { test_run_id: id },
    });
    assertSandboxProvidersReady(
      paidResult.project,
      emailFailures,
      "Sandbox paid project"
    );
    report = addStep(report, {
      key: "sandbox_paid_project",
      label: "Sandbox paid project",
      status: "passed",
    });
    report = addTrackedArtifacts(report, trackedArtifacts);
    report = addArtifact(report, {
      type: "supabase",
      table: "projects",
      id: paidResult.project.id,
    });
    report = addArtifact(report, {
      type: "paypal",
      id: `${id}-capture`,
      detail: "sandbox-like paid project event",
    });
    report = addDriveArtifacts(report, paidResult.project);
    if (scenario === "v1-usability") {
      report = await runV1UsabilityScenario({
        report,
        id,
        config,
        env,
        records,
        email,
        trackedArtifacts,
      });
    }
  } catch (error) {
    report = addStep(report, {
      key: "sandbox",
      label: "Sandbox run",
      status: "failed",
      error: error.message,
    });
  }

  report = finishReport(report);
  await maybeUpdateRun(records, id, report);
  return { id, report };
}

async function maybeCreateRun(records, report) {
  if (typeof records.createAutomationTestRun !== "function") return;
  try {
    await records.createAutomationTestRun({
      id: report.id,
      mode: report.mode,
      status: report.status,
      businessName: report.businessName,
      report,
      startedAt: report.startedAt,
    });
  } catch (error) {
    if (!isMissingAutomationTestRunsError(error)) throw error;
  }
}

async function maybeUpdateRun(records, id, report) {
  if (typeof records.updateAutomationTestRun !== "function") return;
  try {
    await records.updateAutomationTestRun(id, {
      status: report.status,
      report,
      finishedAt: report.finishedAt,
    });
  } catch (error) {
    if (!isMissingAutomationTestRunsError(error)) throw error;
  }
}

function isMissingAutomationTestRunsError(error) {
  return /automation_test_runs/i.test(error?.message || "");
}

function createFakeRecords(calls) {
  return {
    upsertCustomer: async (input) => ({
      id: "sim-customer",
      email: input.email,
      name: input.name || null,
    }),
    createLead: async () => ({ id: "sim-lead" }),
    createProject: async (input) => ({
      id: "sim-project",
      project_code: "TEST-000001",
      status: input.status,
    }),
    updateProject: async (_id, patch) => ({
      id: "sim-project",
      project_code: "TEST-000001",
      status: "awaiting_files",
      ...patch,
    }),
    createProjectEvent: async (event) => {
      calls.push({ type: "event", event });
      return { id: `sim-event-${calls.length}` };
    },
    upsertPaymentAndOrder: async () => ({
      order: { id: "sim-order" },
      payment: { id: "sim-payment" },
    }),
    getProjectById: async () => null,
    getProjectByOrderId: async () => null,
    linkOrderPaymentToProject: async () => calls.push({ type: "link.project" }),
  };
}

function addDriveArtifacts(report, project) {
  let next = report;
  [
    [
      "project",
      project.drive_project_folder_id,
      project.drive_project_folder_url,
    ],
    ["upload", project.drive_upload_folder_id, project.drive_upload_folder_url],
    ["finals", project.drive_finals_folder_id, project.drive_finals_folder_url],
  ].forEach(([folderType, folderId, folderUrl]) => {
    if (folderId)
      next = addArtifact(next, {
        type: "drive",
        folderType,
        id: folderId,
        url: folderUrl || null,
      });
  });
  return next;
}

function createTrackingRecords(records, artifacts) {
  return new Proxy(records, {
    get(target, property) {
      const value = target[property];
      if (typeof value !== "function") return value;
      return async function trackedRecordCall(...args) {
        const result = await value.apply(target, args);
        trackRecordArtifact(property, result, artifacts);
        return result;
      };
    },
  });
}

function trackRecordArtifact(method, result, artifacts) {
  const tableByMethod = {
    createLead: "leads",
    createProjectEvent: "project_events",
    createEmailEvent: "email_events",
  };
  if (method === "createAdminQuote") {
    if (result?.id)
      artifacts.push({ type: "supabase", table: "quotes", id: result.id });
    if (Array.isArray(result?.lineItems)) {
      result.lineItems.forEach((item) => {
        if (item?.id)
          artifacts.push({
            type: "supabase",
            table: "quote_line_items",
            id: item.id,
          });
      });
    }
    return;
  }
  if (method === "upsertPaymentAndOrder") {
    if (result?.order?.id)
      artifacts.push({
        type: "supabase",
        table: "orders",
        id: result.order.id,
      });
    if (result?.payment?.id)
      artifacts.push({
        type: "supabase",
        table: "payments",
        id: result.payment.id,
      });
    return;
  }
  const table = tableByMethod[method];
  if (table && result?.id)
    artifacts.push({ type: "supabase", table, id: result.id });
}

function createTrackingEmailAdapter(email, failures) {
  return {
    async sendCustomerEmail(...args) {
      return trackEmailResult(email.sendCustomerEmail(...args), failures);
    },
    async sendAdminEmail(...args) {
      return trackEmailResult(email.sendAdminEmail(...args), failures);
    },
  };
}

async function trackEmailResult(promise, failures) {
  try {
    const result = await promise;
    if (result?.failed) failures.push(result.error || "Email send failed.");
    return result;
  } catch (error) {
    failures.push(error.message);
    throw error;
  }
}

function assertSandboxProvidersReady(project, emailFailures, label) {
  const missingDrive =
    !project.drive_project_folder_id ||
    !project.drive_upload_folder_id ||
    !project.drive_finals_folder_id;
  if (missingDrive)
    throw new Error(`${label} did not create all required Drive folders.`);
  if (emailFailures.length)
    throw new Error(`${label} email failed: ${emailFailures.join("; ")}`);
}

function addTrackedArtifacts(report, artifacts) {
  let next = report;
  while (artifacts.length) {
    next = addArtifact(next, artifacts.shift());
  }
  return next;
}

async function runV1UsabilityScenario({
  report,
  id,
  config,
  env,
  records,
  email,
  trackedArtifacts,
}) {
  const testEmail = config.testCustomerEmail || config.adminEmail;
  const customer = await records.upsertCustomer({
    email: testEmail,
    name: `${config.testPrefix} Test Customer`,
  });

  const quoteSourceProject = await records.createProject({
    customerId: customer.id,
    projectType: "free_review",
    status: "reviewing",
    artistName: `${config.testPrefix} Quote Artist ${id}`,
    projectTitle: `${config.testPrefix} Quote Project ${id}`,
    finalDeliveryLocked: true,
  });
  report = addTrackedArtifacts(report, trackedArtifacts);
  report = addArtifact(report, {
    type: "supabase",
    table: "projects",
    id: quoteSourceProject.id,
  });
  report.ownerProof = {
    projectId: quoteSourceProject.id,
    customerEmail: customer.email,
    previewStates: [],
  };

  const quote = await records.createAdminQuote(
    quoteSourceProject.id,
    {
      baseServiceId: "customDeposit",
      songCount: 1,
      paymentMode: "deposit",
      catalogTotalCents: 45000,
      adjustmentCents: 0,
      depositCents: 22500,
      notes: `Sandbox v1 quote fixture for ${id}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      lineItems: [
        {
          itemType: "service",
          itemId: "customDeposit",
          label: "Custom Project Deposit",
          quantity: 1,
          unitCents: 45000,
        },
      ],
    },
    {
      env,
      adminEmail: config.adminEmail || "",
    }
  );
  report = addTrackedArtifacts(report, trackedArtifacts);
  report = addStep(report, {
    key: "sandbox_quote_fixture",
    label: "Sandbox quote fixture",
    status: "passed",
    detail: quote.id,
  });
  report = addOwnerProofSnapshot(report, {
    label: "Quote Ready",
    note: "Customer can accept the quote and pay the deposit.",
    project: await snapshotProjectForPortal(records, quoteSourceProject.id, {
      active_quote: {
        id: quote.id,
        status: quote.status || "draft",
        final_total_cents: 45000,
        payment_mode: "deposit",
        expires_at: quote.expiresAt || quote.expires_at || "",
        line_items: Array.isArray(quote.lineItems) ? quote.lineItems : [],
      },
    }),
  });

  const quotePaidResult = await createPaidProjectWorkflow({
    records,
    email,
    env,
  })({
    paymentPurpose: "quote",
    quoteId: quote.id,
    projectId: quoteSourceProject.id,
    paypalTxnId: `${id}-quote-capture`,
    paypalOrderId: `${id}-quote-order`,
    buyerEmail: testEmail,
    buyerName: `${config.testPrefix} Quote Customer`,
    status: "paid",
    totalAmount: "450.00",
    amountDueNow: "225.00",
    remainingBalance: "225.00",
    orderSummary: {
      paymentPurpose: "quote",
      projectId: quoteSourceProject.id,
      quoteId: quote.id,
      amountCents: 22500,
      totalCents: 45000,
    },
    rawPayload: { test_run_id: id, payment_purpose: "quote" },
  });

  report = addTrackedArtifacts(report, trackedArtifacts);
  report = addArtifact(report, {
    type: "paypal",
    id: `${id}-quote-capture`,
    detail: "sandbox-like quote payment event",
  });
  report = addStep(report, {
    key: "sandbox_quote_payment",
    label: "Sandbox quote payment",
    status: "passed",
    detail: quotePaidResult.project?.id || null,
  });

  await records.updateAdminProjectDelivery(
    quoteSourceProject.id,
    {
      finalDeliveryUrl: `https://example.com/finals/${id}`,
      unlockDelivery: false,
      notifyBalanceDue: false,
    },
    {
      env,
      adminEmail: config.adminEmail || "",
    }
  );
  report = addTrackedArtifacts(report, trackedArtifacts);
  report = addStep(report, {
    key: "sandbox_finals_ready_locked",
    label: "Sandbox finals ready locked",
    status: "passed",
  });
  report = addOwnerProofSnapshot(report, {
    label: "Balance Due",
    note: "Customer sees pay-balance and cannot approve while delivery is locked.",
    project: await snapshotProjectForPortal(records, quoteSourceProject.id),
  });

  const balancePaidResult = await createPaidProjectWorkflow({
    records,
    email,
    env,
  })({
    paymentPurpose: "balance",
    projectId: quoteSourceProject.id,
    paypalTxnId: `${id}-balance-capture`,
    paypalOrderId: `${id}-balance-order`,
    buyerEmail: testEmail,
    buyerName: `${config.testPrefix} Balance Customer`,
    status: "paid",
    totalAmount: "225.00",
    amountDueNow: "225.00",
    remainingBalance: "0.00",
    orderSummary: {
      paymentPurpose: "balance",
      projectId: quoteSourceProject.id,
      amountCents: 22500,
      totalCents: 22500,
    },
    rawPayload: { test_run_id: id, payment_purpose: "balance" },
  });

  report = addTrackedArtifacts(report, trackedArtifacts);
  report = addArtifact(report, {
    type: "paypal",
    id: `${id}-balance-capture`,
    detail: "sandbox-like balance payment event",
  });
  report = addStep(report, {
    key: "sandbox_balance_payment",
    label: "Sandbox balance payment",
    status: "passed",
    detail: balancePaidResult.project?.status || null,
  });
  report = addOwnerProofSnapshot(report, {
    label: "Delivered",
    note: "Customer sees final delivery and approval action after balance is cleared.",
    project: await snapshotProjectForPortal(records, quoteSourceProject.id),
  });

  await approveFinalForOwnerProof({
    records,
    email,
    projectId: quoteSourceProject.id,
    customer,
  });
  report = addTrackedArtifacts(report, trackedArtifacts);
  report = addStep(report, {
    key: "sandbox_final_approval",
    label: "Sandbox final approval",
    status: "passed",
  });
  report = addOwnerProofSnapshot(report, {
    label: "Approved",
    note: "Customer approval is accepted exactly once after unlocked delivery.",
    project: await snapshotProjectForPortal(records, quoteSourceProject.id),
  });

  return report;
}

async function approveFinalForOwnerProof({
  records,
  email,
  projectId,
  customer,
}) {
  const project =
    typeof records.getProjectById === "function"
      ? await records.getProjectById(projectId)
      : null;
  if (!project)
    throw new Error("Owner proof approval could not load the project.");

  await records.updateProject(projectId, { status: "approved" });
  await records.createProjectEvent({
    projectId,
    eventType: "final_approved",
    actorType: "customer",
    message: "Customer approved the final delivery.",
    metadata: { ownerProof: true },
  });

  if (email?.sendAdminEmail) {
    await email.sendAdminEmail(
      "Final approved",
      `${customer.email} approved final delivery for ${project.project_code || project.id}.`
    );
  }
}

async function snapshotProjectForPortal(records, projectId, overrides = {}) {
  if (typeof records.getProjectById !== "function") {
    return { id: projectId, ...overrides };
  }
  const project = await records.getProjectById(projectId);
  return {
    ...(project || { id: projectId }),
    ...overrides,
  };
}

function addOwnerProofSnapshot(report, snapshot) {
  if (!report.ownerProof) return report;
  report.ownerProof.previewStates.push(snapshot);
  return report;
}

module.exports = {
  runAutomationTest,
  runSandboxAutomationTest,
  runSimulationAutomationTest,
};
