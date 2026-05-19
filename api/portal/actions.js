const { ensureRuntimeEnv } = require("../../lib/env/runtime");
const { requireUser } = require("../../lib/auth/supabase-auth");
const {
  methodNotAllowed,
  readJsonBody,
  sendJson,
} = require("../../lib/http/json");
const recordsDefault = require("../../lib/db/studio-records");
const { sendStudioEmail } = require("../../lib/email/resend");
const {
  validateBalancePaymentRequest,
} = require("../../lib/portal/balance-payment-validator");
const { _private: paypalOrderHelpers } = require("../create-paypal-order");

ensureRuntimeEnv();

function createPortalActionsHandler(dependencies = {}) {
  const requireUserImpl = dependencies.requireUserImpl || requireUser;
  const records = dependencies.records || recordsDefault;
  const sendEmail = dependencies.sendEmail || sendStudioEmail;
  const env = dependencies.env || process.env;
  const fetchImpl = dependencies.fetchImpl || globalThis.fetch;

  return async function portalActionsHandler(req, res) {
    let user;
    try {
      user = await requireUserImpl(req);
    } catch (error) {
      return sendJson(res, error.statusCode || 400, {
        error: error.message || "Invalid request",
      });
    }

    const action = getQueryValue(req, "action") || "projects";
    if (action === "projects")
      return handleProjects({ req, res, records, user });
    if (action === "file-links")
      return handleFileLinks({ req, res, records, sendEmail, user });
    if (action === "revisions")
      return handleRevisions({ req, res, records, sendEmail, env, user });
    if (action === "approvals")
      return handleApprovals({ req, res, records, sendEmail, env, user });
    if (action === "accept-quote")
      return handleAcceptQuote({ req, res, records, env, user, fetchImpl });
    if (action === "pay-balance")
      return handleBalancePayment({ req, res, records, env, user, fetchImpl });
    return sendJson(res, 404, { error: "Portal action not found." });
  };
}

async function handleProjects({ req, res, records, user }) {
  if (req.method !== "GET") return methodNotAllowed(res);
  try {
    const email = records.normalizeEmail
      ? records.normalizeEmail(user.email)
      : recordsDefault.normalizeEmail(user.email);
    const customers = await records.supabaseRequest("/customers", {
      query: { email: `eq.${email}`, select: "id,email" },
    });
    if (!customers[0]) return sendJson(res, 200, { projects: [] });
    const projects = await records.supabaseRequest("/projects", {
      query: {
        customer_id: `eq.${customers[0].id}`,
        select:
          "id,project_code,project_type,status,artist_name,project_title,drive_upload_folder_url,final_delivery_url,balance_due,amount_paid,final_delivery_locked,included_revisions,used_revisions,extra_revisions_allowed,active_quote_id",
        order: "created_at.desc",
      },
    });

    const quoteIds = projects
      .map((project) => project.active_quote_id)
      .filter(Boolean);
    let quotes = [];
    let quoteLineItems = [];
    if (quoteIds.length > 0) {
      if (
        records.listQuotesForCustomer &&
        records.listQuoteLineItemsForQuotes
      ) {
        const allQuotes = await records.listQuotesForCustomer(customers[0].id, {
          limit: "100",
        });
        quotes = allQuotes.filter((quote) => quoteIds.includes(quote.id));
        quoteLineItems = await records.listQuoteLineItemsForQuotes(quoteIds);
      } else {
        quotes = await records.supabaseRequest("/quotes", {
          query: {
            id: `in.(${quoteIds.join(",")})`,
            customer_id: `eq.${customers[0].id}`,
            select: "*",
          },
        });
        quoteLineItems = await records.supabaseRequest("/quote_line_items", {
          query: {
            quote_id: `in.(${quoteIds.join(",")})`,
            select: "*",
            order: "created_at.asc",
          },
        });
      }
    }

    const quoteById = new Map(quotes.map((quote) => [quote.id, quote]));
    const quoteItemsByQuoteId = quoteLineItems.reduce((acc, item) => {
      const key = item.quote_id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    const projectsWithQuotes = projects.map((project) => {
      const activeQuote = project.active_quote_id
        ? quoteById.get(project.active_quote_id)
        : null;
      if (!activeQuote) return project;
      return {
        ...project,
        active_quote: {
          ...activeQuote,
          line_items: quoteItemsByQuoteId[activeQuote.id] || [],
        },
      };
    });

    return sendJson(res, 200, { projects: projectsWithQuotes });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      error: error.statusCode ? error.message : "Unable to load projects.",
    });
  }
}

async function handleFileLinks({ req, res, records, sendEmail, user }) {
  if (req.method !== "POST") return methodNotAllowed(res);
  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, error.statusCode || 400, {
      error: error.message || "Invalid request",
    });
  }

  const url = normalizeHttpUrl(body.url);
  const projectId =
    typeof body.projectId === "string" ? body.projectId.trim() : "";
  if (!projectId || !url)
    return sendJson(res, 400, {
      error: "Project id and valid link are required.",
    });

  try {
    const { customer, project } = await getOwnedProject({
      records,
      user,
      projectId,
    });
    const file = await records.createProjectFile({
      projectId: project.id,
      orderId: project.order_id,
      uploadLink: url,
      status: "submitted",
    });
    await records.updateProject(project.id, { status: "files_submitted" });
    await records.createProjectEvent({
      projectId: project.id,
      eventType: "files_submitted",
      actorType: "customer",
      message: "Customer submitted an external file link.",
      metadata: { fileId: file.id, url },
    });
    await sendAndLog({
      records,
      sendEmail,
      customer,
      emailType: "files_received",
      data: {},
    });
    return sendJson(res, 200, { ok: true, file });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      error: error.statusCode ? error.message : "Unable to submit file link.",
    });
  }
}

async function handleRevisions({ req, res, records, sendEmail, env, user }) {
  if (req.method !== "POST") return methodNotAllowed(res);
  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, error.statusCode || 400, {
      error: error.message || "Invalid request",
    });
  }

  const projectId =
    typeof body.projectId === "string" ? body.projectId.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (!projectId || !notes)
    return sendJson(res, 400, {
      error: "Project id and revision notes are required.",
    });

  try {
    const customer = await records.getCustomerByEmail(user.email);
    if (!customer) return sendJson(res, 404, { error: "Customer not found." });
    const project = await records.getProjectForCustomer(projectId, customer.id);
    if (!project) return sendJson(res, 404, { error: "Project not found." });
    const allowed =
      Number(project.included_revisions || 0) +
      Number(project.extra_revisions_allowed || 0);
    const used = Number(project.used_revisions || 0);
    if (used >= allowed)
      return sendJson(res, 409, {
        error: "No revision requests remain for this project.",
      });

    const revision = await records.createRevisionRequest({
      projectId: project.id,
      customerId: customer.id,
      notes,
      isExtraRevision: used >= Number(project.included_revisions || 0),
    });
    await records.updateProject(project.id, {
      status: "revision_requested",
      used_revisions: used + 1,
    });
    await records.createProjectEvent({
      projectId: project.id,
      eventType: "revision_requested",
      actorType: "customer",
      message: "Customer requested a revision.",
      metadata: { revisionId: revision.id },
    });
    await sendAndLogAdminNotification({
      records,
      sendEmail,
      env,
      project,
      customer,
      subject: "Revision requested",
      text: `${customer.email} requested a revision for ${project.project_code || project.id}.`,
    });
    return sendJson(res, 200, { ok: true, revision });
  } catch (_error) {
    return sendJson(res, 500, { error: "Unable to request revision." });
  }
}

async function handleApprovals({ req, res, records, sendEmail, env, user }) {
  if (req.method !== "POST") return methodNotAllowed(res);
  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, error.statusCode || 400, {
      error: error.message || "Invalid request",
    });
  }

  const projectId =
    typeof body.projectId === "string" ? body.projectId.trim() : "";
  if (!projectId)
    return sendJson(res, 400, { error: "Project id is required." });

  try {
    const customer = await records.getCustomerByEmail(user.email);
    if (!customer) return sendJson(res, 404, { error: "Customer not found." });
    const project = await records.getProjectForCustomer(projectId, customer.id);
    if (!project) return sendJson(res, 404, { error: "Project not found." });
    const deliverableVisible =
      project.status === "delivered" ||
      (project.status === "finals_ready" &&
        project.final_delivery_locked === false);
    if (!deliverableVisible)
      return sendJson(res, 409, {
        error: "Final delivery is not ready for approval.",
      });

    const updatedProject = await records.updateProject(project.id, {
      status: "approved",
    });
    await records.createProjectEvent({
      projectId: project.id,
      eventType: "final_approved",
      actorType: "customer",
      message: "Customer approved the final delivery.",
      metadata: {},
    });
    await sendAndLogAdminNotification({
      records,
      sendEmail,
      env,
      project,
      customer,
      subject: "Final approved",
      text: `${customer.email} approved final delivery for ${project.project_code || project.id}.`,
    });
    return sendJson(res, 200, { ok: true, project: updatedProject });
  } catch (_error) {
    return sendJson(res, 500, { error: "Unable to approve final delivery." });
  }
}

async function handleAcceptQuote({ req, res, records, env, user, fetchImpl }) {
  if (req.method !== "POST") return methodNotAllowed(res);

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, error.statusCode || 400, {
      error: error.message || "Invalid request body.",
    });
  }

  const projectId =
    typeof body.projectId === "string" ? body.projectId.trim() : "";
  const quoteId = typeof body.quoteId === "string" ? body.quoteId.trim() : "";
  if (!projectId)
    return sendJson(res, 400, { error: "projectId is required." });
  if (!quoteId) return sendJson(res, 400, { error: "quoteId is required." });

  try {
    const customer = await records.getCustomerByEmail(user.email);
    if (!customer) return sendJson(res, 404, { error: "Customer not found." });

    const project = await records.getProjectForCustomer(projectId, customer.id);
    if (!project) return sendJson(res, 404, { error: "Project not found." });

    const quote = records.getQuoteForProjectCustomer
      ? await records.getQuoteForProjectCustomer({
          quoteId,
          projectId,
          customerId: customer.id,
        })
      : await records.getQuoteById(quoteId);
    if (!quote) return sendJson(res, 404, { error: "Quote not found." });

    if (["accepted", "expired", "cancelled"].includes(quote.status)) {
      return sendJson(res, 409, {
        error: "Quote is not payable in its current status.",
      });
    }

    const now = new Date().toISOString();
    if (quote.status === "sent" || quote.status === "draft") {
      await records.updateQuote(quote.id, {
        status: "viewed",
        viewed_at: now,
      });
    }

    const amountDueNowCents =
      quote.payment_mode === "deposit"
        ? Number(quote.deposit_cents || 0)
        : Number(quote.final_total_cents || 0);
    const paypalClient = paypalOrderHelpers.getPaypalClient(env, fetchImpl);
    const paypalOrder = await paypalOrderHelpers.createPaypalOrder(
      paypalClient,
      {
        paymentPurpose: "quote",
        quoteId: quote.id,
        projectId: project.id,
        amountCents: amountDueNowCents,
        totalCents: Number(quote.final_total_cents || amountDueNowCents),
        amountDueNowCents,
      }
    );

    await records.createProjectEvent({
      projectId: project.id,
      eventType: "quote_checkout_started",
      actorType: "customer",
      message: "Customer started quote checkout.",
      metadata: {
        quoteId: quote.id,
        paypalOrderId: paypalOrder.id,
      },
    });

    const approvalUrl = Array.isArray(paypalOrder.links)
      ? paypalOrder.links.find((link) => link && link.rel === "approve")
          ?.href || null
      : null;

    return sendJson(res, 200, {
      ok: true,
      paypalOrderId: paypalOrder.id,
      approvalUrl,
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      error: error.statusCode
        ? error.message
        : "Unable to start quote checkout.",
    });
  }
}

async function handleBalancePayment({
  req,
  res,
  records,
  env,
  user,
  fetchImpl,
}) {
  if (req.method !== "POST") return methodNotAllowed(res);

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, error.statusCode || 400, {
      error: error.message || "Invalid request body.",
    });
  }

  const projectId =
    typeof body.projectId === "string" ? body.projectId.trim() : "";
  if (!projectId)
    return sendJson(res, 400, { error: "projectId is required." });

  try {
    const customer = await records.getCustomerByEmail(user.email);
    if (!customer) return sendJson(res, 404, { error: "Customer not found." });

    const validation = await validateBalancePaymentRequest({
      projectId,
      customerId: customer.id,
      records,
    });
    if (!validation.ok) {
      return sendJson(res, validation.statusCode, {
        error: validation.error,
        reason: validation.reason,
      });
    }

    const { project, amountCents } = validation;
    const paypalClient = paypalOrderHelpers.getPaypalClient(env, fetchImpl);
    const paypalOrder = await paypalOrderHelpers.createPaypalOrder(
      paypalClient,
      {
        paymentPurpose: "balance",
        projectId: project.id,
        amountCents,
        totalCents: amountCents,
        amountDueNowCents: amountCents,
      }
    );

    await records.createProjectEvent({
      projectId: project.id,
      eventType: "balance_checkout_started",
      actorType: "customer",
      message: "Customer started balance checkout.",
      metadata: {
        paymentPurpose: "balance",
        paypalOrderId: paypalOrder.id,
        balanceCents: amountCents,
      },
    });

    const approvalUrl = Array.isArray(paypalOrder.links)
      ? paypalOrder.links.find((link) => link && link.rel === "approve")
          ?.href || null
      : null;

    return sendJson(res, 200, {
      ok: true,
      paypalOrderId: paypalOrder.id,
      approvalUrl,
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      error: error.statusCode
        ? error.message
        : "Unable to start balance checkout.",
    });
  }
}

async function getOwnedProject({ records, user, projectId }) {
  const customer = await records.getCustomerByEmail(user.email);
  if (!customer) throw createStatusError(404, "Customer not found.");
  const project = await records.getProjectForCustomer(projectId, customer.id);
  if (!project) throw createStatusError(404, "Project not found.");
  return { customer, project };
}

async function sendAndLog({ records, sendEmail, customer, emailType, data }) {
  try {
    const result = await sendEmail({ to: customer.email, emailType, data });
    if (records.createEmailEvent) {
      await records.createEmailEvent({
        customerId: customer.id,
        emailType,
        recipient: customer.email,
        status: "sent",
        resendMessageId: result.id || null,
      });
    }
  } catch (error) {
    if (records.createEmailEvent) {
      await records.createEmailEvent({
        customerId: customer.id,
        emailType,
        recipient: customer.email,
        status: "failed",
        errorMessage: error.message,
      });
    }
  }
}

async function sendAndLogAdminNotification({
  records,
  sendEmail,
  env,
  project,
  customer,
  subject,
  text,
}) {
  const recipient = env.ADMIN_EMAIL;
  if (!recipient) return;
  try {
    const result = await sendEmail(
      {
        to: recipient,
        emailType: "admin_notification",
        data: { subject, text },
      },
      { env }
    );
    if (records.createEmailEvent) {
      await records.createEmailEvent({
        projectId: project.id,
        customerId: customer.id,
        emailType: "admin_notification",
        recipient,
        status: "sent",
        resendMessageId: result.id || null,
      });
    }
  } catch (error) {
    if (records.createEmailEvent) {
      await records.createEmailEvent({
        projectId: project.id,
        customerId: customer.id,
        emailType: "admin_notification",
        recipient,
        status: "failed",
        errorMessage: error.message,
      });
    }
  }
}

function normalizeHttpUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch (_error) {
    return null;
  }
}

function createStatusError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getQueryValue(req, key) {
  if (req.query && req.query[key])
    return Array.isArray(req.query[key]) ? req.query[key][0] : req.query[key];
  if (!req.url) return null;
  try {
    return new URL(req.url, "http://localhost").searchParams.get(key);
  } catch (_error) {
    return null;
  }
}

const handler = createPortalActionsHandler();
module.exports = handler;
module.exports.createPortalActionsHandler = createPortalActionsHandler;
