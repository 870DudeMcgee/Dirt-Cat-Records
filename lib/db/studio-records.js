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
  const rows = await supabaseRequest('/leads', {
    method: 'POST',
    query: { select: 'id,customer_id,status' },
    body: {
      customer_id: requireValue(input.customerId, 'customer id'),
      email: normalizeEmail(input.email),
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
  const sequence = Date.now() % 1000000;
  const rows = await supabaseRequest('/projects', {
    method: 'POST',
    query: { select: '*' },
    body: {
      project_code: buildProjectCode(sequence || 1),
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
    },
    ...options,
  });
  return rows[0];
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

async function upsertPaymentAndOrder(input, options = {}) {
  const customer = requireValue(input.customer, 'customer');
  const payment = requireValue(input.payment, 'payment');
  const totalAmount = normalizeAmount(payment.totalAmount);
  const orderRows = await supabaseRequest('/orders', {
    method: 'POST',
    query: { on_conflict: 'paypal_txn_id', select: 'id,customer_id,paypal_txn_id,status,total_amount' },
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      customer_id: customer.id,
      paypal_txn_id: requireValue(payment.paypalTxnId, 'PayPal transaction id'),
      paypal_order_id: payment.paypalOrderId || null,
      status: payment.status || 'paid',
      total_amount: totalAmount,
      payment_mode: payment.orderSummary?.paymentMode || 'full',
      amount_due_now: normalizeAmount(payment.amountDueNow || payment.totalAmount),
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
      amount: totalAmount,
      currency: payment.currency || 'USD',
      raw_payload: payment.rawPayload || {},
    },
    ...options,
  });
  const paymentRecord = paymentRows[0];
  if (!paymentRecord?.id) throw new Error('Supabase did not return a payment id.');
  return { order, payment: paymentRecord };
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
  createEmailEvent,
  createLead,
  createProject,
  createProjectEvent,
  getSupabaseConfig,
  normalizeEmail,
  requireValue,
  supabaseRequest,
  updateProject,
  upsertCustomer,
  upsertPaymentAndOrder,
};
