const { randomInt } = require("node:crypto");
const { getPublicAppOrigin } = require("../env/public-origin");
const { calculateOrder } = require("../checkout/pricing");
const followUpOrchestrator = require("../automation/follow-up-orchestrator");
const projectEvents = require("../automation/project-event-schema");
const {
  buildQuoteCreatedProjectPatch,
  buildQuoteSentTransition,
} = require("../automation/quote-lifecycle");
const {
  buildFinalDeliveryEmail,
  buildQuoteSentEmail,
  sendEmailSequence,
} = require("../email/email-sequence-choreographer");

function getSupabaseConfig(env = process.env) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  return { supabaseUrl: supabaseUrl.replace(/\/$/, ""), supabaseKey };
}

async function supabaseRequest(path, options = {}) {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig(options.env);
  const fetchImpl = options.fetchImpl || fetch;
  const url = new URL(`${supabaseUrl}/rest/v1${path}`);
  Object.entries(options.query || {}).forEach(([key, value]) =>
    url.searchParams.set(key, value)
  );

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    Prefer: options.prefer || "return=representation",
  };

  const response = await fetchImpl(url, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const body = await parseResponseBody(response);
  if (!response.ok)
    throw new Error(
      `Supabase request failed: ${response.status} ${body.message || JSON.stringify(body)}`
    );
  return Array.isArray(body) ? body : [body];
}

async function upsertCustomer(input, options = {}) {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("A valid customer email is required.");
  const body = { email };
  if (input.name && typeof input.name === "string" && input.name.trim()) {
    body.name = input.name.trim();
  }
  const rows = await supabaseRequest("/customers", {
    method: "POST",
    query: { on_conflict: "email", select: "id,email,name,auth_user_id" },
    prefer: "resolution=merge-duplicates,return=representation",
    body,
    ...options,
  });
  if (!rows[0]?.id) throw new Error("Supabase did not return a customer id.");
  return rows[0];
}

async function getCustomerByEmail(email, options = {}) {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("A valid customer email is required.");
  const rows = await supabaseRequest("/customers", {
    query: { email: `eq.${normalized}`, select: "id,email,name,auth_user_id" },
    ...options,
  });
  return rows[0] || null;
}

async function createProjectEvent(event, options = {}) {
  const normalized = projectEvents.normalizeProjectEvent(event);
  const rows = await supabaseRequest("/project_events", {
    method: "POST",
    query: { select: "id,project_id,event_type" },
    body: {
      project_id: normalized.projectId,
      event_type: normalized.eventType,
      actor_type: normalized.actorType,
      message: normalized.message,
      metadata: normalized.metadata,
    },
    ...options,
  });
  return rows[0];
}

async function createLead(input, options = {}) {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("A valid lead email is required.");
  const rows = await supabaseRequest("/leads", {
    method: "POST",
    query: { select: "id,customer_id,status" },
    body: {
      customer_id: requireValue(input.customerId, "customer id"),
      email,
      artist_name: input.artistName || null,
      project_title: input.projectTitle || null,
      message: input.message || null,
      reference_links: input.referenceLinks || [],
      status: "new",
    },
    ...options,
  });
  return rows[0];
}

async function createProject(input, options = {}) {
  const body = {
    customer_id: requireValue(input.customerId, "customer id"),
    order_id: input.orderId || null,
    lead_id: input.leadId || null,
    project_type: requireValue(input.projectType, "project type"),
    status: requireValue(input.status, "project status"),
    artist_name: input.artistName || null,
    project_title: input.projectTitle || null,
    service_id: input.serviceId || null,
    song_count: input.songCount || 1,
    total_amount: normalizeAmount(input.totalAmount || 0),
    amount_paid: normalizeAmount(input.amountPaid || 0),
    balance_due: normalizeAmount(input.balanceDue || 0),
    included_revisions: normalizeRevisionCount(input.includedRevisions, 1),
    used_revisions: normalizeRevisionCount(input.usedRevisions, 0),
    extra_revisions_allowed: normalizeRevisionCount(
      input.extraRevisionsAllowed,
      0
    ),
    final_delivery_locked: input.finalDeliveryLocked !== false,
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const rows = await supabaseRequest("/projects", {
        method: "POST",
        query: { select: "*" },
        body: {
          ...body,
          project_code: buildProjectCode(randomInt(1, 1000000)),
        },
        ...options,
      });
      return rows[0];
    } catch (error) {
      if (
        !/projects_project_code|duplicate key|unique/i.test(
          error.message || ""
        ) ||
        attempt === 2
      )
        throw error;
    }
  }
  throw new Error("Unable to create a unique project code.");
}

async function updateProject(projectId, patch, options = {}) {
  const rows = await supabaseRequest("/projects", {
    method: "PATCH",
    query: { id: `eq.${requireValue(projectId, "project id")}`, select: "*" },
    body: patch,
    ...options,
  });
  return rows[0];
}

async function getProjectForCustomer(projectId, customerId, options = {}) {
  const rows = await supabaseRequest("/projects", {
    query: {
      id: `eq.${requireValue(projectId, "project id")}`,
      customer_id: `eq.${requireValue(customerId, "customer id")}`,
      select: "*",
    },
    ...options,
  });
  return rows[0] || null;
}

async function createProjectFile(input, options = {}) {
  const rows = await supabaseRequest("/project_files", {
    method: "POST",
    query: { select: "id,project_id,upload_link,status" },
    body: {
      project_id: requireValue(input.projectId, "project id"),
      order_id: input.orderId || null,
      upload_link: requireValue(input.uploadLink, "upload link"),
      status: input.status || "submitted",
    },
    ...options,
  });
  return rows[0];
}

async function createRevisionRequest(input, options = {}) {
  const rows = await supabaseRequest("/revision_requests", {
    method: "POST",
    query: { select: "id,project_id,status" },
    body: {
      project_id: requireValue(input.projectId, "project id"),
      customer_id: requireValue(input.customerId, "customer id"),
      notes: requireValue(input.notes, "revision notes"),
      reference_links: input.referenceLinks || [],
      is_extra_revision: Boolean(input.isExtraRevision),
    },
    ...options,
  });
  return rows[0];
}

async function upsertPaymentAndOrder(input, options = {}) {
  const customer = requireValue(input.customer, "customer");
  const payment = requireValue(input.payment, "payment");
  const totalAmount = normalizeAmount(payment.totalAmount);
  const paymentAmount = normalizeAmount(
    payment.amountDueNow || payment.totalAmount
  );
  const orderRows = await supabaseRequest("/orders", {
    method: "POST",
    query: {
      on_conflict: "paypal_txn_id",
      select: "id,customer_id,project_id,paypal_txn_id,status,total_amount",
    },
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      customer_id: customer.id,
      paypal_txn_id: requireValue(payment.paypalTxnId, "PayPal transaction id"),
      paypal_order_id: payment.paypalOrderId || null,
      status: payment.status || "paid",
      total_amount: totalAmount,
      payment_mode: payment.orderSummary?.paymentMode || "full",
      amount_due_now: paymentAmount,
      remaining_balance: normalizeAmount(payment.remainingBalance || 0),
      order_summary: payment.orderSummary || {},
    },
    ...options,
  });
  const order = orderRows[0];
  if (!order?.id) throw new Error("Supabase did not return an order id.");

  const paymentRows = await supabaseRequest("/payments", {
    method: "POST",
    query: {
      on_conflict: "paypal_capture_id",
      select: "id,project_id,order_id,paypal_capture_id,status,amount",
    },
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      customer_id: customer.id,
      order_id: order.id,
      paypal_order_id: payment.paypalOrderId || null,
      paypal_capture_id: requireValue(
        payment.paypalTxnId,
        "PayPal transaction id"
      ),
      payment_purpose: payment.paymentPurpose || "checkout",
      status: payment.status || "paid",
      amount: paymentAmount,
      currency: payment.currency || "USD",
      raw_payload: payment.rawPayload || {},
    },
    ...options,
  });
  const paymentRecord = paymentRows[0];
  if (!paymentRecord?.id)
    throw new Error("Supabase did not return a payment id.");
  return { order, payment: paymentRecord };
}

async function getProjectById(projectId, options = {}) {
  const rows = await supabaseRequest("/projects", {
    query: { id: `eq.${requireValue(projectId, "project id")}`, select: "*" },
    ...options,
  });
  return rows[0] || null;
}

async function getProjectByOrderId(orderId, options = {}) {
  const rows = await supabaseRequest("/projects", {
    query: {
      order_id: `eq.${requireValue(orderId, "order id")}`,
      select: "*",
      limit: "1",
    },
    ...options,
  });
  return rows[0] || null;
}

async function getQuoteById(quoteId, options = {}) {
  const rows = await supabaseRequest("/quotes", {
    query: {
      id: `eq.${requireValue(quoteId, "quote id")}`,
      select: "*",
      limit: "1",
    },
    ...options,
  });
  return rows[0] || null;
}

async function getQuoteForProjectCustomer(
  { quoteId, projectId, customerId },
  options = {}
) {
  const rows = await supabaseRequest("/quotes", {
    query: {
      id: `eq.${requireValue(quoteId, "quote id")}`,
      project_id: `eq.${requireValue(projectId, "project id")}`,
      customer_id: `eq.${requireValue(customerId, "customer id")}`,
      select: "*",
      limit: "1",
    },
    ...options,
  });
  return rows[0] || null;
}

async function updateQuote(quoteId, patch, options = {}) {
  const rows = await supabaseRequest("/quotes", {
    method: "PATCH",
    query: { id: `eq.${requireValue(quoteId, "quote id")}`, select: "*" },
    body: patch,
    ...options,
  });
  return rows[0] || null;
}

async function listQuotesForCustomer(customerId, options = {}) {
  return supabaseRequest("/quotes", {
    query: {
      customer_id: `eq.${requireValue(customerId, "customer id")}`,
      select: "*",
      order: "created_at.desc",
      limit: options.limit || "50",
    },
    ...options,
  });
}

async function listQuoteLineItemsForQuotes(quoteIds, options = {}) {
  if (!Array.isArray(quoteIds) || quoteIds.length === 0) return [];
  const normalized = quoteIds.filter(Boolean);
  if (normalized.length === 0) return [];
  return supabaseRequest("/quote_line_items", {
    query: {
      quote_id: `in.(${normalized.join(",")})`,
      select: "*",
      order: "created_at.asc",
    },
    ...options,
  });
}

async function linkOrderPaymentToProject(
  { orderId, paymentId, projectId },
  options = {}
) {
  if (orderId) {
    await supabaseRequest("/orders", {
      method: "PATCH",
      query: { id: `eq.${orderId}`, select: "id,project_id" },
      body: { project_id: projectId },
      ...options,
    });
  }
  if (paymentId) {
    await supabaseRequest("/payments", {
      method: "PATCH",
      query: { id: `eq.${paymentId}`, select: "id,project_id" },
      body: { project_id: projectId },
      ...options,
    });
  }
}

async function createEmailEvent(event, options = {}) {
  const rows = await supabaseRequest("/email_events", {
    method: "POST",
    query: { select: "id,email_type,status" },
    body: {
      project_id: event.projectId || null,
      customer_id: event.customerId || null,
      email_type: requireValue(event.emailType, "email type"),
      recipient: requireValue(event.recipient, "email recipient"),
      status: requireValue(event.status, "email status"),
      resend_message_id: event.resendMessageId || null,
      error_message: event.errorMessage || null,
      metadata: event.metadata || {},
    },
    ...options,
  });
  return rows[0];
}

async function createAutomationTestRun(input, options = {}) {
  const rows = await supabaseRequest("/automation_test_runs", {
    method: "POST",
    query: { select: "*" },
    body: {
      id: requireValue(input.id, "test run id"),
      mode: requireValue(input.mode, "test run mode"),
      status: requireValue(input.status, "test run status"),
      business_name: requireValue(input.businessName, "business name"),
      report: input.report || {},
      cleanup_status: input.cleanupStatus || "not_requested",
      started_at: input.startedAt || new Date().toISOString(),
      finished_at: input.finishedAt || null,
    },
    ...options,
  });
  return rows[0];
}

async function updateAutomationTestRun(testRunId, patch, options = {}) {
  const body = {};
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.report !== undefined) body.report = patch.report;
  if (patch.cleanupStatus !== undefined)
    body.cleanup_status = patch.cleanupStatus;
  if (patch.finishedAt !== undefined) body.finished_at = patch.finishedAt;
  body.updated_at = new Date().toISOString();

  const rows = await supabaseRequest("/automation_test_runs", {
    method: "PATCH",
    query: { id: `eq.${requireValue(testRunId, "test run id")}`, select: "*" },
    body,
    ...options,
  });
  return rows[0];
}

async function getAutomationTestRun(testRunId, options = {}) {
  const rows = await supabaseRequest("/automation_test_runs", {
    query: {
      id: `eq.${requireValue(testRunId, "test run id")}`,
      select: "*",
      limit: "1",
    },
    ...options,
  });
  return rows[0] || null;
}

async function listAutomationTestRuns(options = {}) {
  return supabaseRequest("/automation_test_runs", {
    query: {
      select: "*",
      order: "started_at.desc",
      limit: options.limit || "20",
    },
    ...options,
  });
}

async function getAdminOverview(options = {}) {
  const queryOptions = {
    env: options.env,
    fetchImpl: options.fetchImpl,
  };
  const [leads, projects, revisions, events] = await Promise.all([
    supabaseRequest("/leads", {
      query: {
        select:
          "id,status,email,artist_name,project_title,source,created_at,updated_at",
        order: "created_at.desc",
        limit: options.leadLimit || "50",
      },
      ...queryOptions,
    }),
    supabaseRequest("/projects", {
      query: {
        select:
          "id,project_code,project_type,status,artist_name,project_title,balance_due,amount_paid,total_amount,drive_project_folder_url,drive_upload_folder_url,drive_finals_folder_url,final_delivery_url,created_at,updated_at",
        order: "updated_at.desc",
        limit: options.projectLimit || "100",
      },
      ...queryOptions,
    }),
    supabaseRequest("/revision_requests", {
      query: {
        select:
          "id,project_id,status,notes,is_extra_revision,created_at,resolved_at,projects(project_code,project_title,artist_name,status)",
        order: "created_at.desc",
        limit: options.revisionLimit || "50",
      },
      ...queryOptions,
    }),
    supabaseRequest("/project_events", {
      query: {
        select:
          "id,project_id,event_type,actor_type,message,metadata,created_at",
        order: "created_at.desc",
        limit: options.eventLimit || "20",
      },
      ...queryOptions,
    }),
  ]);

  return buildAdminOverview({ leads, projects, revisions, events });
}

async function getFollowUpCandidates(options = {}) {
  const queryOptions = {
    env: options.env,
    fetchImpl: options.fetchImpl,
  };

  const projects = await supabaseRequest("/projects", {
    query: {
      select:
        "id,project_code,customer_id,status,balance_due,final_delivery_locked,created_at,updated_at",
      status:
        "in.(awaiting_files,quote_sent,finals_ready,balance_due,delivered)",
      order: "updated_at.asc",
      limit: options.projectLimit || "250",
    },
    ...queryOptions,
  });

  return followUpOrchestrator.selectFollowUpCandidates(projects, {
    now: options.now,
    missingFilesDays: options.missingFilesDays,
    pendingQuoteDays: options.pendingQuoteDays,
    balanceDueDays: options.balanceDueDays,
    finalApprovalDays: options.finalApprovalDays,
  });
}

async function queueFollowUpJobs(candidates, options = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { queued: [], skipped: [], failed: [] };
  }

  const queryOptions = {
    env: options.env,
    fetchImpl: options.fetchImpl,
  };
  const scheduledFor = options.scheduledFor || new Date().toISOString();
  const queued = [];
  const skipped = [];
  const failed = [];

  for (const candidate of candidates) {
    const intent = followUpOrchestrator.buildFollowUpJobIntent(candidate, {
      scheduledFor,
    });

    if (!intent.ok) {
      skipped.push(intent.skipped);
      continue;
    }

    try {
      const rows = await supabaseRequest("/followup_jobs", {
        method: "POST",
        query: { select: "id,project_id,followup_type,status,scheduled_for" },
        body: intent.body,
        ...queryOptions,
      });

      const job = rows[0] || null;
      queued.push(followUpOrchestrator.buildQueuedResult(job, intent));

      await logFollowUpEvent(
        projectEvents.followUpJobEnqueued({
          projectId: intent.projectId,
          followUpType: intent.followUpType,
          scheduledFor,
          jobId: job?.id || null,
        }),
        queryOptions
      );
    } catch (error) {
      if (followUpOrchestrator.isDuplicatePendingError(error)) {
        skipped.push(followUpOrchestrator.buildDuplicateSkippedResult(intent));
        await logFollowUpEvent(
          projectEvents.followUpJobDuplicateSkipped({
            projectId: intent.projectId,
            followUpType: intent.followUpType,
          }),
          queryOptions
        );
        continue;
      }

      failed.push(followUpOrchestrator.buildEnqueueFailedResult(intent, error));
      await logFollowUpEvent(
        projectEvents.followUpJobEnqueueFailed({
          projectId: intent.projectId,
          followUpType: intent.followUpType,
          error,
        }),
        queryOptions
      );
    }
  }

  return { queued, skipped, failed };
}

async function listPendingFollowUpJobs(options = {}) {
  const queryOptions = {
    env: options.env,
    fetchImpl: options.fetchImpl,
  };
  const nowIso = options.now || new Date().toISOString();

  return supabaseRequest("/followup_jobs", {
    query: {
      status: "eq.pending",
      scheduled_for: `lte.${nowIso}`,
      select:
        "id,project_id,customer_id,followup_type,status,scheduled_for,projects!followup_jobs_project_id_fkey(id,project_code,project_title,status,balance_due,final_delivery_locked,final_delivery_url),customers(id,email,name)",
      order: "scheduled_for.asc",
      limit: options.limit || "50",
    },
    ...queryOptions,
  });
}

async function updateFollowUpJobStatus(jobId, patch, options = {}) {
  const body = {};
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.processedAt !== undefined) body.processed_at = patch.processedAt;
  if (patch.errorMessage !== undefined) body.error_message = patch.errorMessage;

  const rows = await supabaseRequest("/followup_jobs", {
    method: "PATCH",
    query: {
      id: `eq.${requireValue(jobId, "follow-up job id")}`,
      select: "id,project_id,followup_type,status,processed_at,error_message",
    },
    body,
    ...options,
  });
  return rows[0] || null;
}

async function logFollowUpEvent(event, queryOptions) {
  try {
    await createProjectEvent(event, queryOptions);
  } catch (_error) {
    // Follow-up queue outcomes should not fail because event logging failed.
  }
}

async function getAdminProjectDetail(projectId, options = {}) {
  const id = requireValue(projectId, "project id");
  const queryOptions = {
    env: options.env,
    fetchImpl: options.fetchImpl,
  };
  const projects = await supabaseRequest("/projects", {
    query: {
      id: `eq.${id}`,
      select: "*,customers(id,email,name)",
      limit: "1",
    },
    ...queryOptions,
  });
  const project = projects[0];
  if (!project) return null;

  const fileQuery = project.order_id
    ? {
        or: `(project_id.eq.${id},order_id.eq.${project.order_id})`,
        select: "*",
        order: "created_at.desc",
      }
    : { project_id: `eq.${id}`, select: "*", order: "created_at.desc" };

  const [files, revisions, payments, events, emailEvents, adminNotes] =
    await Promise.all([
      supabaseRequest("/project_files", {
        query: fileQuery,
        ...queryOptions,
      }),
      supabaseRequest("/revision_requests", {
        query: {
          project_id: `eq.${id}`,
          select: "*",
          order: "created_at.desc",
        },
        ...queryOptions,
      }),
      supabaseRequest("/payments", {
        query: {
          project_id: `eq.${id}`,
          select: "*",
          order: "created_at.desc",
        },
        ...queryOptions,
      }),
      supabaseRequest("/project_events", {
        query: {
          project_id: `eq.${id}`,
          select: "*",
          order: "created_at.desc",
        },
        ...queryOptions,
      }),
      supabaseRequest("/email_events", {
        query: {
          project_id: `eq.${id}`,
          select: "*",
          order: "created_at.desc",
        },
        ...queryOptions,
      }),
      supabaseRequest("/admin_notes", {
        query: {
          project_id: `eq.${id}`,
          select: "*",
          order: "created_at.desc",
        },
        ...queryOptions,
      }),
    ]);

  return buildAdminProjectDetail({
    project,
    files,
    revisions,
    payments,
    events,
    emailEvents,
    adminNotes,
  });
}

async function updateAdminProjectStatus(projectId, status, options = {}) {
  const id = requireValue(projectId, "project id");
  const nextStatus = requireValue(status, "status");
  if (!ADMIN_PROJECT_STATUSES.has(nextStatus)) {
    const error = new Error("Unsupported project status.");
    error.statusCode = 400;
    throw error;
  }

  const queryOptions = {
    env: options.env,
    fetchImpl: options.fetchImpl,
  };

  const project = await getProjectById(id, queryOptions);
  if (!project) return null;

  if (project.status !== nextStatus) {
    await updateProject(id, { status: nextStatus }, queryOptions);
    await createProjectEvent(
      projectEvents.adminStatusUpdated({
        projectId: id,
        fromStatus: project.status,
        toStatus: nextStatus,
        adminEmail: options.adminEmail,
      }),
      queryOptions
    );
  }

  return getAdminProjectDetail(id, queryOptions);
}

async function addAdminProjectNote(projectId, note, options = {}) {
  const id = requireValue(projectId, "project id");
  const noteText = typeof note === "string" ? note.trim() : "";
  if (!noteText) {
    const error = new Error("admin note is required.");
    error.statusCode = 400;
    throw error;
  }

  const queryOptions = {
    env: options.env,
    fetchImpl: options.fetchImpl,
  };

  const project = await getProjectById(id, queryOptions);
  if (!project) return null;

  await supabaseRequest("/admin_notes", {
    method: "POST",
    query: { select: "*" },
    body: {
      project_id: id,
      note: noteText,
    },
    ...queryOptions,
  });

  await createProjectEvent(
    projectEvents.adminNoteAdded({
      projectId: id,
      adminEmail: options.adminEmail,
    }),
    queryOptions
  );

  return getAdminProjectDetail(id, queryOptions);
}

async function updateAdminProjectDelivery(
  projectId,
  update = {},
  options = {}
) {
  const id = requireValue(projectId, "project id");
  const finalDeliveryUrl = normalizeOptionalHttpUrl(update.finalDeliveryUrl);
  const unlockDelivery = Boolean(update.unlockDelivery);
  const notifyBalanceDue = Boolean(update.notifyBalanceDue);
  if (!finalDeliveryUrl && !unlockDelivery) {
    const error = new Error("A valid final delivery URL is required.");
    error.statusCode = 400;
    throw error;
  }

  const queryOptions = {
    env: options.env,
    fetchImpl: options.fetchImpl,
  };

  const project = await getProjectById(id, queryOptions);
  if (!project) return null;

  const deliveryUrl = finalDeliveryUrl || project.final_delivery_url || "";
  if (!deliveryUrl) {
    const error = new Error("A valid final delivery URL is required.");
    error.statusCode = 400;
    throw error;
  }

  const balanceDue = Number(project.balance_due || 0);
  if (unlockDelivery && balanceDue > 0) {
    const error = new Error(
      "Cannot unlock final delivery while balance remains."
    );
    error.statusCode = 409;
    throw error;
  }

  const shouldUnlock = unlockDelivery;
  const nextStatus = shouldUnlock
    ? "delivered"
    : balanceDue > 0
      ? "balance_due"
      : "finals_ready";
  const patch = {
    final_delivery_url: deliveryUrl,
    final_delivery_locked: shouldUnlock ? false : true,
    status: nextStatus,
  };
  await updateProject(id, patch, queryOptions);

  await createProjectEvent(
    projectEvents.adminDeliveryUpdated({
      projectId: id,
      adminEmail: options.adminEmail,
      finalDeliveryUrl: deliveryUrl,
      unlocked: shouldUnlock,
      notifiedBalanceDue: notifyBalanceDue,
    }),
    queryOptions
  );

  if (!shouldUnlock && notifyBalanceDue && balanceDue > 0) {
    const sendEmail = options.sendEmailImpl || getSendStudioEmail();
    const customer = project.customers || {};
    if (customer.email) {
      await sendEmailSequence({
        records: { createEmailEvent },
        sendEmail,
        messages: [
          buildFinalDeliveryEmail({
            kind: "balance_due",
            to: customer.email,
            projectId: id,
            customerId: customer.id || project.customer_id || null,
            portalUrl: buildPortalUrl(options.env),
            finalDeliveryUrl: deliveryUrl,
            balanceDue,
          }),
        ],
        sequenceName: "admin_delivery_update",
        env: options.env,
        fetchImpl: options.fetchImpl,
      });
    }
  }

  if (shouldUnlock) {
    const sendEmail = options.sendEmailImpl || getSendStudioEmail();
    const customer = project.customers || {};
    if (customer.email) {
      await sendEmailSequence({
        records: { createEmailEvent },
        sendEmail,
        messages: [
          buildFinalDeliveryEmail({
            kind: "unlocked",
            to: customer.email,
            projectId: id,
            customerId: customer.id || project.customer_id || null,
            portalUrl: buildPortalUrl(options.env),
            finalDeliveryUrl: deliveryUrl,
          }),
        ],
        sequenceName: "admin_delivery_update",
        env: options.env,
        fetchImpl: options.fetchImpl,
      });
    }
  }

  return getAdminProjectDetail(id, queryOptions);
}

async function allowAdminExtraRevision(projectId, options = {}) {
  const id = requireValue(projectId, "project id");
  const queryOptions = {
    env: options.env,
    fetchImpl: options.fetchImpl,
  };

  const project = await getProjectById(id, queryOptions);
  if (!project) return null;

  const nextExtraAllowed = Number(project.extra_revisions_allowed || 0) + 1;
  await updateProject(
    id,
    { extra_revisions_allowed: nextExtraAllowed },
    queryOptions
  );
  await createProjectEvent(
    projectEvents.adminExtraRevisionAllowed({
      projectId: id,
      adminEmail: options.adminEmail,
      extraRevisionsAllowed: nextExtraAllowed,
    }),
    queryOptions
  );

  return getAdminProjectDetail(id, queryOptions);
}

async function createAdminQuote(projectId, input = {}, options = {}) {
  const id = requireValue(projectId, "project id");
  const queryOptions = {
    env: options.env,
    fetchImpl: options.fetchImpl,
  };

  const project = await getProjectById(id, queryOptions);
  if (!project) return null;

  const quoteInput = normalizeAdminQuoteInput(input);
  const quoteRows = await supabaseRequest("/quotes", {
    method: "POST",
    query: { select: "*" },
    body: {
      project_id: id,
      customer_id: requireValue(project.customer_id, "customer id"),
      status: "draft",
      base_service_id: quoteInput.baseServiceId,
      song_count: quoteInput.songCount,
      catalog_total_cents: quoteInput.catalogTotalCents,
      adjustment_cents: quoteInput.adjustmentCents,
      final_total_cents: quoteInput.finalTotalCents,
      payment_mode: quoteInput.paymentMode,
      deposit_cents: quoteInput.depositCents,
      balance_cents: quoteInput.balanceCents,
      notes: quoteInput.notes,
      expires_at: quoteInput.expiresAt,
    },
    ...queryOptions,
  });
  const quote = quoteRows[0];

  const lineItems = [];
  for (const item of quoteInput.lineItems) {
    const rows = await supabaseRequest("/quote_line_items", {
      method: "POST",
      query: { select: "*" },
      body: {
        quote_id: quote.id,
        item_type: item.itemType,
        item_id: item.itemId,
        label: item.label,
        quantity: item.quantity,
        unit_cents: item.unitCents,
        total_cents: item.totalCents,
      },
      ...queryOptions,
    });
    lineItems.push(normalizeAdminQuoteLineItem(rows[0] || item));
  }

  await updateProject(id, buildQuoteCreatedProjectPatch(quote), queryOptions);

  await createProjectEvent(
    projectEvents.adminQuoteCreated({
      projectId: id,
      adminEmail: options.adminEmail,
      quoteId: quote.id,
      finalTotalCents: quoteInput.finalTotalCents,
      paymentMode: quoteInput.paymentMode,
    }),
    queryOptions
  );

  return normalizeAdminQuote(quote, lineItems);
}

async function sendAdminQuote(projectId, quoteId, options = {}) {
  const id = requireValue(projectId, "project id");
  const qid = requireValue(quoteId, "quote id");
  const queryOptions = {
    env: options.env,
    fetchImpl: options.fetchImpl,
  };

  const projectRows = await supabaseRequest("/projects", {
    query: {
      id: `eq.${id}`,
      select: "*,customers(id,email,name)",
      limit: "1",
    },
    ...queryOptions,
  });
  const project = projectRows[0];
  if (!project) return null;

  const quoteRows = await supabaseRequest("/quotes", {
    query: {
      id: `eq.${qid}`,
      project_id: `eq.${id}`,
      select: "*",
      limit: "1",
    },
    ...queryOptions,
  });
  const quote = quoteRows[0];
  if (!quote) return null;

  const customer = project.customers || {};
  if (!customer.email) {
    const error = new Error(
      "Project customer email is required to send a quote."
    );
    error.statusCode = 400;
    throw error;
  }

  const sentTransition = buildQuoteSentTransition({ quoteId: qid });
  const sentRows = await supabaseRequest("/quotes", {
    method: "PATCH",
    query: { id: `eq.${qid}`, select: "*" },
    body: sentTransition.quotePatch,
    ...queryOptions,
  });
  const sentQuote = sentRows[0] || quote;

  await updateProject(id, sentTransition.projectPatch, queryOptions);

  const quoteUrl = buildQuoteUrl(id, qid, options.env);
  const totalLabel = formatCentsToDollars(
    sentQuote.final_total_cents !== undefined
      ? sentQuote.final_total_cents
      : quote.final_total_cents || 0
  );

  const sendEmail = options.sendEmailImpl || getSendStudioEmail();
  await sendEmailSequence({
    records: { createEmailEvent },
    sendEmail,
    messages: [
      buildQuoteSentEmail({
        to: customer.email,
        projectId: id,
        customerId: customer.id || project.customer_id || null,
        quoteId: qid,
        quoteUrl,
        totalLabel,
      }),
    ],
    sequenceName: "quote_sent",
    env: options.env,
    fetchImpl: options.fetchImpl,
    throwOnFailure: true,
  });

  await createProjectEvent(
    projectEvents.adminQuoteSent({
      projectId: id,
      adminEmail: options.adminEmail,
      quoteId: qid,
      totalLabel,
    }),
    queryOptions
  );

  return normalizeAdminQuote(sentQuote);
}

function buildAdminProjectDetail(input = {}) {
  const project = input.project || {};
  const customer = project.customers || project.customer || {};
  const normalizedProject = normalizeAdminProject(project);
  const includedRevisions = Number(project.included_revisions || 0);
  const usedRevisions = Number(project.used_revisions || 0);
  const extraRevisionsAllowed = Number(project.extra_revisions_allowed || 0);

  return {
    project: {
      ...normalizedProject,
      serviceId: project.service_id || "",
      songCount: Number(project.song_count || 1),
      includedRevisions,
      usedRevisions,
      extraRevisionsAllowed,
      finalDeliveryLocked: project.final_delivery_locked !== false,
    },
    customer: {
      id: String(customer.id || project.customer_id || ""),
      email: customer.email || "",
      name: customer.name || "",
    },
    financial: {
      totalAmount: Number(project.total_amount || 0),
      totalAmountLabel: formatDollars(project.total_amount || 0),
      amountPaid: Number(project.amount_paid || 0),
      amountPaidLabel: formatDollars(project.amount_paid || 0),
      balanceDue: Number(project.balance_due || 0),
      balanceDueLabel: formatDollars(project.balance_due || 0),
    },
    driveLinks: {
      project: project.drive_project_folder_url || "",
      upload: project.drive_upload_folder_url || "",
      finals: project.drive_finals_folder_url || "",
      finalDelivery: project.final_delivery_url || "",
    },
    files: (input.files || []).map(normalizeAdminFile),
    revisions: {
      included: includedRevisions,
      used: usedRevisions,
      extraAllowed: extraRevisionsAllowed,
      remaining: Math.max(
        0,
        includedRevisions + extraRevisionsAllowed - usedRevisions
      ),
      items: (input.revisions || []).map(normalizeAdminRevision),
    },
    payments: (input.payments || []).map(normalizeAdminPayment),
    timeline: (input.events || []).map(normalizeAdminEvent),
    emailEvents: (input.emailEvents || []).map(normalizeAdminEmailEvent),
    adminNotes: (input.adminNotes || []).map(normalizeAdminNote),
  };
}

function buildAdminOverview(input = {}) {
  const leads = Array.isArray(input.leads) ? input.leads : [];
  const projects = Array.isArray(input.projects) ? input.projects : [];
  const revisions = Array.isArray(input.revisions) ? input.revisions : [];
  const events = Array.isArray(input.events) ? input.events : [];

  const newLeads = leads
    .filter((lead) => lead.status === "new")
    .map(normalizeAdminLead);
  const awaitingFiles = projects
    .filter((project) => project.status === "awaiting_files")
    .map(normalizeAdminProject);
  const filesSubmitted = projects
    .filter((project) => project.status === "files_submitted")
    .map(normalizeAdminProject);
  const activeProjects = projects
    .filter((project) => ACTIVE_PROJECT_STATUSES.has(project.status))
    .map(normalizeAdminProject);
  const revisionRequests = revisions
    .filter((revision) => OPEN_REVISION_STATUSES.has(revision.status))
    .map(normalizeAdminRevision);
  const finalsReady = projects
    .filter((project) => project.status === "finals_ready")
    .map(normalizeAdminProject);
  const balancesDue = projects
    .filter(
      (project) =>
        Number(project.balance_due || 0) > 0 &&
        !CLOSED_PROJECT_STATUSES.has(project.status)
    )
    .map(normalizeAdminProject);

  return {
    generatedAt: new Date().toISOString(),
    metrics: [
      { key: "newLeads", label: "New Leads", count: newLeads.length },
      {
        key: "awaitingFiles",
        label: "Awaiting Files",
        count: awaitingFiles.length,
      },
      {
        key: "filesSubmitted",
        label: "Files Submitted",
        count: filesSubmitted.length,
      },
      {
        key: "activeProjects",
        label: "Active Projects",
        count: activeProjects.length,
      },
      {
        key: "revisionRequests",
        label: "Revision Requests",
        count: revisionRequests.length,
      },
      { key: "finalsReady", label: "Finals Ready", count: finalsReady.length },
      { key: "balancesDue", label: "Balances Due", count: balancesDue.length },
    ],
    queues: {
      newLeads,
      awaitingFiles,
      filesSubmitted,
      activeProjects,
      revisionRequests,
      finalsReady,
      balancesDue,
    },
    recentEvents: events.map(normalizeAdminEvent).slice(0, 12),
  };
}

const ACTIVE_PROJECT_STATUSES = new Set([
  "files_submitted",
  "reviewing",
  "quote_accepted",
  "paid",
  "mixing",
  "revision_requested",
  "revision_in_progress",
]);

const OPEN_REVISION_STATUSES = new Set(["requested", "in_progress"]);
const CLOSED_PROJECT_STATUSES = new Set(["approved", "completed", "closed"]);
const ADMIN_PROJECT_STATUSES = new Set([
  "lead_new",
  "awaiting_files",
  "files_submitted",
  "reviewing",
  "quoted",
  "quote_sent",
  "quote_accepted",
  "paid",
  "mixing",
  "revision_requested",
  "revision_in_progress",
  "finals_ready",
  "balance_due",
  "delivered",
  "approved",
  "completed",
  "closed",
]);

function normalizeAdminLead(lead) {
  return {
    id: String(lead.id || ""),
    status: lead.status || "",
    email: lead.email || "",
    artistName: lead.artist_name || "",
    projectTitle: lead.project_title || "",
    source: lead.source || "",
    createdAt: lead.created_at || "",
    updatedAt: lead.updated_at || "",
  };
}

function normalizeAdminProject(project) {
  const balanceDue = Number(project.balance_due || 0);
  return {
    id: String(project.id || ""),
    projectCode: project.project_code || "",
    projectType: project.project_type || "",
    status: project.status || "",
    statusLabel: titleCase(project.status || "active"),
    artistName: project.artist_name || "",
    projectTitle: project.project_title || "",
    title:
      project.project_title ||
      project.artist_name ||
      project.project_code ||
      "Untitled Project",
    balanceDue,
    balanceDueLabel: formatDollars(balanceDue),
    amountPaid: Number(project.amount_paid || 0),
    totalAmount: Number(project.total_amount || 0),
    driveProjectFolderUrl: project.drive_project_folder_url || "",
    driveUploadFolderUrl: project.drive_upload_folder_url || "",
    driveFinalsFolderUrl: project.drive_finals_folder_url || "",
    finalDeliveryUrl: project.final_delivery_url || "",
    createdAt: project.created_at || "",
    updatedAt: project.updated_at || "",
  };
}

function normalizeAdminRevision(revision) {
  const project = revision.projects || revision.project || {};
  return {
    id: String(revision.id || ""),
    projectId: revision.project_id || "",
    status: revision.status || "",
    notes: revision.notes || "",
    isExtraRevision: Boolean(revision.is_extra_revision),
    createdAt: revision.created_at || "",
    resolvedAt: revision.resolved_at || "",
    projectCode: project.project_code || "",
    projectTitle: project.project_title || "",
    artistName: project.artist_name || "",
    projectStatus: project.status || "",
  };
}

function normalizeAdminEvent(event) {
  return {
    id: String(event.id || ""),
    projectId: event.project_id || "",
    eventType: event.event_type || "",
    actorType: event.actor_type || "",
    message: event.message || "",
    metadata: event.metadata || {},
    createdAt: event.created_at || "",
  };
}

function normalizeAdminFile(file) {
  return {
    id: String(file.id || ""),
    projectId: file.project_id || "",
    orderId: file.order_id || "",
    uploadLink: file.upload_link || "",
    version: Number(file.version || 1),
    status: file.status || "",
    statusLabel: titleCase(file.status || "submitted"),
    createdAt: file.created_at || "",
  };
}

function normalizeAdminPayment(payment) {
  return {
    id: String(payment.id || ""),
    projectId: payment.project_id || "",
    orderId: payment.order_id || "",
    quoteId: payment.quote_id || "",
    paypalOrderId: payment.paypal_order_id || "",
    paypalCaptureId: payment.paypal_capture_id || "",
    paymentPurpose: payment.payment_purpose || "",
    status: payment.status || "",
    amount: Number(payment.amount || 0),
    amountLabel: formatDollars(payment.amount || 0),
    currency: payment.currency || "USD",
    createdAt: payment.created_at || "",
  };
}

function normalizeAdminEmailEvent(event) {
  return {
    id: String(event.id || ""),
    projectId: event.project_id || "",
    customerId: event.customer_id || "",
    emailType: event.email_type || "",
    recipient: event.recipient || "",
    status: event.status || "",
    resendMessageId: event.resend_message_id || "",
    errorMessage: event.error_message || "",
    metadata: event.metadata || {},
    createdAt: event.created_at || "",
  };
}

function normalizeAdminNote(note) {
  return {
    id: String(note.id || ""),
    projectId: note.project_id || "",
    note: note.note || "",
    createdAt: note.created_at || "",
  };
}

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDollars(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
}

function normalizeOptionalHttpUrl(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") {
    const error = new Error("A valid final delivery URL is required.");
    error.statusCode = 400;
    throw error;
  }
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("invalid");
    return url.toString();
  } catch (_error) {
    const error = new Error("A valid final delivery URL is required.");
    error.statusCode = 400;
    throw error;
  }
}

function buildPortalUrl(env = process.env) {
  const base = getPublicAppOrigin(env).replace(/\/$/, "");
  return base ? `${base}/portal.html` : "/portal.html";
}

function getSendStudioEmail() {
  return require("../email/resend").sendStudioEmail;
}

function normalizeAdminQuoteInput(input = {}) {
  if (
    (!input.lineItems ||
      !Array.isArray(input.lineItems) ||
      input.lineItems.length === 0) &&
    input.baseServiceId
  ) {
    return buildQuoteFromCatalogInput(input);
  }

  const baseServiceId = requireValue(input.baseServiceId, "baseServiceId");
  const songCount = Number(input.songCount || 1);
  if (!Number.isInteger(songCount) || songCount < 1) {
    const error = new Error("songCount must be a positive integer.");
    error.statusCode = 400;
    throw error;
  }

  const paymentMode = input.paymentMode || "full";
  if (!["full", "deposit"].includes(paymentMode)) {
    const error = new Error("paymentMode must be full or deposit.");
    error.statusCode = 400;
    throw error;
  }

  const catalogTotalCents = normalizeCents(
    input.catalogTotalCents,
    "catalogTotalCents"
  );
  const adjustmentCents = normalizeSignedCents(
    input.adjustmentCents || 0,
    "adjustmentCents"
  );
  const finalTotalCents = catalogTotalCents + adjustmentCents;
  if (finalTotalCents < 0) {
    const error = new Error("final quote total cannot be negative.");
    error.statusCode = 400;
    throw error;
  }

  let depositCents = 0;
  let balanceCents = 0;
  if (paymentMode === "deposit") {
    depositCents = normalizeCents(input.depositCents, "depositCents");
    if (depositCents < 1 || depositCents > finalTotalCents) {
      const error = new Error(
        "depositCents must be between 1 and final total."
      );
      error.statusCode = 400;
      throw error;
    }
    balanceCents = finalTotalCents - depositCents;
  }

  const expiresAt = normalizeTimestamp(input.expiresAt, "expiresAt");
  const notes =
    typeof input.notes === "string" && input.notes.trim()
      ? input.notes.trim()
      : null;
  const lineItems = normalizeAdminQuoteLineItems(input.lineItems || []);

  return {
    baseServiceId,
    songCount,
    paymentMode,
    catalogTotalCents,
    adjustmentCents,
    finalTotalCents,
    depositCents,
    balanceCents,
    notes,
    expiresAt,
    lineItems,
  };
}

function buildQuoteFromCatalogInput(input = {}) {
  const orderSummary = calculateOrder({
    baseServiceId: requireValue(input.baseServiceId, "baseServiceId"),
    songCount: input.songCount || 1,
    selectedAddOns: Array.isArray(input.selectedAddOns)
      ? input.selectedAddOns
      : [],
    paymentMode: input.paymentMode || "full",
  });

  const adjustmentCents = normalizeSignedCents(
    input.adjustmentCents || 0,
    "adjustmentCents"
  );
  const catalogTotalCents = Number(orderSummary.totalCents || 0);
  const finalTotalCents = catalogTotalCents + adjustmentCents;
  if (finalTotalCents < 0) {
    const error = new Error("final quote total cannot be negative.");
    error.statusCode = 400;
    throw error;
  }

  let paymentMode = input.paymentMode || orderSummary.paymentMode || "full";
  if (!["full", "deposit"].includes(paymentMode)) {
    const error = new Error("paymentMode must be full or deposit.");
    error.statusCode = 400;
    throw error;
  }

  let depositCents = 0;
  let balanceCents = 0;
  if (paymentMode === "deposit") {
    depositCents =
      input.depositCents === undefined
        ? Math.round(finalTotalCents * 0.5)
        : normalizeCents(input.depositCents, "depositCents");
    if (depositCents < 1 || depositCents > finalTotalCents) {
      const error = new Error(
        "depositCents must be between 1 and final total."
      );
      error.statusCode = 400;
      throw error;
    }
    balanceCents = finalTotalCents - depositCents;
  }

  const lineItems = [
    {
      itemType: "service",
      itemId: orderSummary.baseServiceId,
      label: orderSummary.baseServiceLabel,
      quantity: orderSummary.songCount,
      unitCents: Math.round(
        Number(orderSummary.serviceSubtotalCents || 0) /
          Number(orderSummary.songCount || 1)
      ),
      totalCents: Number(orderSummary.serviceSubtotalCents || 0),
    },
    ...orderSummary.addOnLineItems.map((item) => ({
      itemType: "add_on",
      itemId: item.id,
      label: item.label,
      quantity: item.billedUnits,
      unitCents: item.unitPriceCents,
      totalCents: item.totalCents,
    })),
  ];

  if (adjustmentCents !== 0) {
    lineItems.push({
      itemType: "adjustment",
      itemId: null,
      label:
        typeof input.adjustmentLabel === "string" &&
        input.adjustmentLabel.trim()
          ? input.adjustmentLabel.trim()
          : "Manual adjustment",
      quantity: 1,
      unitCents: adjustmentCents,
      totalCents: adjustmentCents,
    });
  }

  return {
    baseServiceId: orderSummary.baseServiceId,
    songCount: orderSummary.songCount,
    paymentMode,
    catalogTotalCents,
    adjustmentCents,
    finalTotalCents,
    depositCents,
    balanceCents,
    notes:
      typeof input.notes === "string" && input.notes.trim()
        ? input.notes.trim()
        : null,
    expiresAt: normalizeTimestamp(input.expiresAt, "expiresAt"),
    lineItems,
  };
}

function normalizeAdminQuoteLineItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("lineItems are required.");
    error.statusCode = 400;
    throw error;
  }
  return items.map((item, index) => {
    const itemType = requireValue(
      item.itemType,
      `lineItems[${index}].itemType`
    );
    if (!["service", "add_on", "adjustment"].includes(itemType)) {
      const error = new Error(`lineItems[${index}].itemType is invalid.`);
      error.statusCode = 400;
      throw error;
    }
    const label = requireValue(item.label, `lineItems[${index}].label`);
    const quantity = Number(item.quantity || 1);
    if (!Number.isInteger(quantity) || quantity < 1) {
      const error = new Error(
        `lineItems[${index}].quantity must be a positive integer.`
      );
      error.statusCode = 400;
      throw error;
    }
    const unitCents = normalizeSignedCents(
      item.unitCents,
      `lineItems[${index}].unitCents`
    );
    if (itemType !== "adjustment" && unitCents < 0) {
      const error = new Error(
        `lineItems[${index}].unitCents must be non-negative for service/add_on.`
      );
      error.statusCode = 400;
      throw error;
    }
    return {
      itemType,
      itemId: item.itemId || null,
      label: String(label),
      quantity,
      unitCents,
      totalCents: unitCents * quantity,
    };
  });
}

function normalizeAdminQuoteLineItem(item = {}) {
  return {
    id: String(item.id || ""),
    quoteId: item.quote_id || "",
    itemType: item.item_type || item.itemType || "",
    itemId: item.item_id || item.itemId || "",
    label: item.label || "",
    quantity: Number(item.quantity || 1),
    unitCents: Number(
      item.unit_cents !== undefined ? item.unit_cents : item.unitCents || 0
    ),
    totalCents: Number(
      item.total_cents !== undefined ? item.total_cents : item.totalCents || 0
    ),
  };
}

function normalizeAdminQuote(quote = {}, lineItems = []) {
  const finalTotalCents = Number(quote.final_total_cents || 0);
  return {
    id: String(quote.id || ""),
    projectId: quote.project_id || "",
    customerId: quote.customer_id || "",
    status: quote.status || "",
    baseServiceId: quote.base_service_id || "",
    songCount: Number(quote.song_count || 1),
    catalogTotalCents: Number(quote.catalog_total_cents || 0),
    adjustmentCents: Number(quote.adjustment_cents || 0),
    finalTotalCents,
    finalTotalLabel: formatCentsToDollars(finalTotalCents),
    paymentMode: quote.payment_mode || "full",
    depositCents: Number(quote.deposit_cents || 0),
    balanceCents: Number(quote.balance_cents || 0),
    notes: quote.notes || "",
    expiresAt: quote.expires_at || "",
    sentAt: quote.sent_at || "",
    createdAt: quote.created_at || "",
    updatedAt: quote.updated_at || "",
    lineItems,
  };
}

function buildQuoteUrl(projectId, quoteId, env = process.env) {
  const base = getPublicAppOrigin(env).replace(/\/$/, "");
  const path = `portal.html?project=${encodeURIComponent(projectId)}&quote=${encodeURIComponent(quoteId)}`;
  return base ? `${base}/${path}` : `/${path}`;
}

function formatCentsToDollars(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(cents || 0) / 100);
}

function normalizeCents(value, label) {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount < 0) {
    const error = new Error(`${label} must be a non-negative integer.`);
    error.statusCode = 400;
    throw error;
  }
  return amount;
}

function normalizeSignedCents(value, label) {
  const amount = Number(value);
  if (!Number.isInteger(amount)) {
    const error = new Error(`${label} must be an integer.`);
    error.statusCode = 400;
    throw error;
  }
  return amount;
}

function normalizeTimestamp(value, label) {
  const raw = requireValue(value, label);
  const timestamp = new Date(raw);
  if (Number.isNaN(timestamp.getTime())) {
    const error = new Error(`${label} must be a valid timestamp.`);
    error.statusCode = 400;
    throw error;
  }
  return timestamp.toISOString();
}

async function deleteStudioRecord(table, id, options = {}) {
  const allowedTables = new Set([
    "leads",
    "orders",
    "payments",
    "quotes",
    "quote_line_items",
    "project_events",
    "email_events",
    "projects",
  ]);
  if (!allowedTables.has(table))
    throw new Error(`Cleanup cannot delete ${table} records.`);
  await supabaseRequest(`/${table}`, {
    method: "DELETE",
    query: { id: `eq.${requireValue(id, `${table} id`)}` },
    prefer: "return=minimal",
    ...options,
  });
}

function buildProjectCode(sequenceNumber) {
  const numeric = Number(sequenceNumber);
  if (!Number.isInteger(numeric) || numeric < 1)
    throw new Error("Project sequence must be a positive integer.");
  return `DCR-${String(numeric).padStart(6, "0")}`;
}

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0)
    throw new Error("A valid amount is required.");
  return amount.toFixed(2);
}

function normalizeRevisionCount(value, fallback) {
  const count = Number(value ?? fallback);
  if (!Number.isInteger(count) || count < 0) return fallback;
  return count;
}

function normalizeEmail(email) {
  if (!email || typeof email !== "string") return null;
  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function requireValue(value, label) {
  if (value === null || value === undefined || value === "")
    throw new Error(`${label} is required.`);
  return value;
}

async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_error) {
    return { message: text };
  }
}

module.exports = {
  addAdminProjectNote,
  allowAdminExtraRevision,
  createAdminQuote,
  buildAdminProjectDetail,
  buildAdminOverview,
  buildProjectCode,
  createAutomationTestRun,
  createEmailEvent,
  createLead,
  createProject,
  createProjectFile,
  createProjectEvent,
  createRevisionRequest,
  getCustomerByEmail,
  getAutomationTestRun,
  getAdminOverview,
  getAdminProjectDetail,
  getFollowUpCandidates,
  listPendingFollowUpJobs,
  queueFollowUpJobs,
  updateFollowUpJobStatus,
  getProjectById,
  getProjectByOrderId,
  getQuoteById,
  getQuoteForProjectCustomer,
  getProjectForCustomer,
  getSupabaseConfig,
  linkOrderPaymentToProject,
  listAutomationTestRuns,
  normalizeEmail,
  requireValue,
  sendAdminQuote,
  listQuotesForCustomer,
  listQuoteLineItemsForQuotes,
  supabaseRequest,
  deleteStudioRecord,
  updateAdminProjectDelivery,
  updateAdminProjectStatus,
  updateAutomationTestRun,
  updateProject,
  updateQuote,
  upsertCustomer,
  upsertPaymentAndOrder,
};
