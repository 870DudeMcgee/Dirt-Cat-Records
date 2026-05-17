const { randomInt } = require('node:crypto');

function getSupabaseConfig(env = process.env) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }
  return { supabaseUrl: supabaseUrl.replace(/\/$/, ''), supabaseKey };
}

async function supabaseRequest(path, options = {}) {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig(options.env);
  const fetchImpl = options.fetchImpl || fetch;
  const url = new URL(`${supabaseUrl}/rest/v1${path}`);
  Object.entries(options.query || {}).forEach(([key, value]) => url.searchParams.set(key, value));

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    Prefer: options.prefer || 'return=representation',
  };

  const response = await fetchImpl(url, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const body = await parseResponseBody(response);
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status} ${body.message || JSON.stringify(body)}`);
  return Array.isArray(body) ? body : [body];
}

async function upsertCustomer(input, options = {}) {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error('A valid customer email is required.');
  const body = { email };
  if (input.name && typeof input.name === 'string' && input.name.trim()) {
    body.name = input.name.trim();
  }
  const rows = await supabaseRequest('/customers', {
    method: 'POST',
    query: { on_conflict: 'email', select: 'id,email,name,auth_user_id' },
    prefer: 'resolution=merge-duplicates,return=representation',
    body,
    ...options,
  });
  if (!rows[0]?.id) throw new Error('Supabase did not return a customer id.');
  return rows[0];
}

async function getCustomerByEmail(email, options = {}) {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error('A valid customer email is required.');
  const rows = await supabaseRequest('/customers', {
    query: { email: `eq.${normalized}`, select: 'id,email,name,auth_user_id' },
    ...options,
  });
  return rows[0] || null;
}

async function createProjectEvent(event, options = {}) {
  const rows = await supabaseRequest('/project_events', {
    method: 'POST',
    query: { select: 'id,project_id,event_type' },
    body: {
      project_id: requireValue(event.projectId, 'project id'),
      event_type: requireValue(event.eventType, 'event type'),
      actor_type: requireValue(event.actorType, 'actor type'),
      message: requireValue(event.message, 'event message'),
      metadata: event.metadata || {},
    },
    ...options,
  });
  return rows[0];
}

async function createLead(input, options = {}) {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error('A valid lead email is required.');
  const rows = await supabaseRequest('/leads', {
    method: 'POST',
    query: { select: 'id,customer_id,status' },
    body: {
      customer_id: requireValue(input.customerId, 'customer id'),
      email,
      artist_name: input.artistName || null,
      project_title: input.projectTitle || null,
      message: input.message || null,
      reference_links: input.referenceLinks || [],
      status: 'new',
    },
    ...options,
  });
  return rows[0];
}

async function createProject(input, options = {}) {
  const body = {
    customer_id: requireValue(input.customerId, 'customer id'),
    order_id: input.orderId || null,
    lead_id: input.leadId || null,
    project_type: requireValue(input.projectType, 'project type'),
    status: requireValue(input.status, 'project status'),
    artist_name: input.artistName || null,
    project_title: input.projectTitle || null,
    service_id: input.serviceId || null,
    song_count: input.songCount || 1,
    total_amount: normalizeAmount(input.totalAmount || 0),
    amount_paid: normalizeAmount(input.amountPaid || 0),
    balance_due: normalizeAmount(input.balanceDue || 0),
    final_delivery_locked: input.finalDeliveryLocked !== false,
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const rows = await supabaseRequest('/projects', {
        method: 'POST',
        query: { select: '*' },
        body: { ...body, project_code: buildProjectCode(randomInt(1, 1000000)) },
        ...options,
      });
      return rows[0];
    } catch (error) {
      if (!/projects_project_code|duplicate key|unique/i.test(error.message || '') || attempt === 2) throw error;
    }
  }
  throw new Error('Unable to create a unique project code.');
}

async function updateProject(projectId, patch, options = {}) {
  const rows = await supabaseRequest('/projects', {
    method: 'PATCH',
    query: { id: `eq.${requireValue(projectId, 'project id')}`, select: '*' },
    body: patch,
    ...options,
  });
  return rows[0];
}

async function getProjectForCustomer(projectId, customerId, options = {}) {
  const rows = await supabaseRequest('/projects', {
    query: {
      id: `eq.${requireValue(projectId, 'project id')}`,
      customer_id: `eq.${requireValue(customerId, 'customer id')}`,
      select: '*',
    },
    ...options,
  });
  return rows[0] || null;
}

async function createProjectFile(input, options = {}) {
  const rows = await supabaseRequest('/project_files', {
    method: 'POST',
    query: { select: 'id,project_id,upload_link,status' },
    body: {
      project_id: requireValue(input.projectId, 'project id'),
      order_id: input.orderId || null,
      upload_link: requireValue(input.uploadLink, 'upload link'),
      status: input.status || 'submitted',
    },
    ...options,
  });
  return rows[0];
}

async function createRevisionRequest(input, options = {}) {
  const rows = await supabaseRequest('/revision_requests', {
    method: 'POST',
    query: { select: 'id,project_id,status' },
    body: {
      project_id: requireValue(input.projectId, 'project id'),
      customer_id: requireValue(input.customerId, 'customer id'),
      notes: requireValue(input.notes, 'revision notes'),
      reference_links: input.referenceLinks || [],
      is_extra_revision: Boolean(input.isExtraRevision),
    },
    ...options,
  });
  return rows[0];
}

async function upsertPaymentAndOrder(input, options = {}) {
  const customer = requireValue(input.customer, 'customer');
  const payment = requireValue(input.payment, 'payment');
  const totalAmount = normalizeAmount(payment.totalAmount);
  const paymentAmount = normalizeAmount(payment.amountDueNow || payment.totalAmount);
  const orderRows = await supabaseRequest('/orders', {
    method: 'POST',
    query: { on_conflict: 'paypal_txn_id', select: 'id,customer_id,project_id,paypal_txn_id,status,total_amount' },
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      customer_id: customer.id,
      paypal_txn_id: requireValue(payment.paypalTxnId, 'PayPal transaction id'),
      paypal_order_id: payment.paypalOrderId || null,
      status: payment.status || 'paid',
      total_amount: totalAmount,
      payment_mode: payment.orderSummary?.paymentMode || 'full',
      amount_due_now: paymentAmount,
      remaining_balance: normalizeAmount(payment.remainingBalance || 0),
      order_summary: payment.orderSummary || {},
    },
    ...options,
  });
  const order = orderRows[0];
  if (!order?.id) throw new Error('Supabase did not return an order id.');

  const paymentRows = await supabaseRequest('/payments', {
    method: 'POST',
    query: { on_conflict: 'paypal_capture_id', select: 'id,project_id,order_id,paypal_capture_id,status,amount' },
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      customer_id: customer.id,
      order_id: order.id,
      paypal_order_id: payment.paypalOrderId || null,
      paypal_capture_id: requireValue(payment.paypalTxnId, 'PayPal transaction id'),
      payment_purpose: payment.paymentPurpose || 'checkout',
      status: payment.status || 'paid',
      amount: paymentAmount,
      currency: payment.currency || 'USD',
      raw_payload: payment.rawPayload || {},
    },
    ...options,
  });
  const paymentRecord = paymentRows[0];
  if (!paymentRecord?.id) throw new Error('Supabase did not return a payment id.');
  return { order, payment: paymentRecord };
}

async function getProjectById(projectId, options = {}) {
  const rows = await supabaseRequest('/projects', {
    query: { id: `eq.${requireValue(projectId, 'project id')}`, select: '*' },
    ...options,
  });
  return rows[0] || null;
}

async function getProjectByOrderId(orderId, options = {}) {
  const rows = await supabaseRequest('/projects', {
    query: { order_id: `eq.${requireValue(orderId, 'order id')}`, select: '*', limit: '1' },
    ...options,
  });
  return rows[0] || null;
}

async function linkOrderPaymentToProject({ orderId, paymentId, projectId }, options = {}) {
  if (orderId) {
    await supabaseRequest('/orders', {
      method: 'PATCH',
      query: { id: `eq.${orderId}`, select: 'id,project_id' },
      body: { project_id: projectId },
      ...options,
    });
  }
  if (paymentId) {
    await supabaseRequest('/payments', {
      method: 'PATCH',
      query: { id: `eq.${paymentId}`, select: 'id,project_id' },
      body: { project_id: projectId },
      ...options,
    });
  }
}

async function createEmailEvent(event, options = {}) {
  const rows = await supabaseRequest('/email_events', {
    method: 'POST',
    query: { select: 'id,email_type,status' },
    body: {
      project_id: event.projectId || null,
      customer_id: event.customerId || null,
      email_type: requireValue(event.emailType, 'email type'),
      recipient: requireValue(event.recipient, 'email recipient'),
      status: requireValue(event.status, 'email status'),
      resend_message_id: event.resendMessageId || null,
      error_message: event.errorMessage || null,
      metadata: event.metadata || {},
    },
    ...options,
  });
  return rows[0];
}

async function createAutomationTestRun(input, options = {}) {
  const rows = await supabaseRequest('/automation_test_runs', {
    method: 'POST',
    query: { select: '*' },
    body: {
      id: requireValue(input.id, 'test run id'),
      mode: requireValue(input.mode, 'test run mode'),
      status: requireValue(input.status, 'test run status'),
      business_name: requireValue(input.businessName, 'business name'),
      report: input.report || {},
      cleanup_status: input.cleanupStatus || 'not_requested',
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
  if (patch.cleanupStatus !== undefined) body.cleanup_status = patch.cleanupStatus;
  if (patch.finishedAt !== undefined) body.finished_at = patch.finishedAt;
  body.updated_at = new Date().toISOString();

  const rows = await supabaseRequest('/automation_test_runs', {
    method: 'PATCH',
    query: { id: `eq.${requireValue(testRunId, 'test run id')}`, select: '*' },
    body,
    ...options,
  });
  return rows[0];
}

async function getAutomationTestRun(testRunId, options = {}) {
  const rows = await supabaseRequest('/automation_test_runs', {
    query: { id: `eq.${requireValue(testRunId, 'test run id')}`, select: '*', limit: '1' },
    ...options,
  });
  return rows[0] || null;
}

async function listAutomationTestRuns(options = {}) {
  return supabaseRequest('/automation_test_runs', {
    query: { select: '*', order: 'started_at.desc', limit: options.limit || '20' },
    ...options,
  });
}

async function deleteStudioRecord(table, id, options = {}) {
  const allowedTables = new Set(['leads', 'orders', 'payments', 'project_events', 'email_events']);
  if (!allowedTables.has(table)) throw new Error(`Cleanup cannot delete ${table} records.`);
  await supabaseRequest(`/${table}`, {
    method: 'DELETE',
    query: { id: `eq.${requireValue(id, `${table} id`)}` },
    prefer: 'return=minimal',
    ...options,
  });
}

function buildProjectCode(sequenceNumber) {
  const numeric = Number(sequenceNumber);
  if (!Number.isInteger(numeric) || numeric < 1) throw new Error('Project sequence must be a positive integer.');
  return `DCR-${String(numeric).padStart(6, '0')}`;
}

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('A valid amount is required.');
  return amount.toFixed(2);
}

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function requireValue(value, label) {
  if (value === null || value === undefined || value === '') throw new Error(`${label} is required.`);
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
  getProjectById,
  getProjectByOrderId,
  getProjectForCustomer,
  getSupabaseConfig,
  linkOrderPaymentToProject,
  listAutomationTestRuns,
  normalizeEmail,
  requireValue,
  supabaseRequest,
  deleteStudioRecord,
  updateAutomationTestRun,
  updateProject,
  upsertCustomer,
  upsertPaymentAndOrder,
};
