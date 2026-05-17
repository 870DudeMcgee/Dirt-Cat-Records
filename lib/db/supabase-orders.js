function getSupabaseConfig(env = process.env) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }
  return { supabaseUrl: supabaseUrl.replace(/\/$/, ''), supabaseKey };
}

async function upsertPaidOrder(record, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const env = options.env || process.env;
  const buyerEmail = normalizeEmail(record.buyerEmail);
  if (!buyerEmail) throw new Error('A valid buyer email is required.');

  const customerRows = await supabaseRequest('/customers', {
    method: 'POST',
    query: { on_conflict: 'email', select: 'id,email' },
    body: { email: buyerEmail },
    fetchImpl,
    env,
  });
  const customer = customerRows[0];
  if (!customer?.id) throw new Error('Supabase did not return a customer id.');

  const orderRows = await supabaseRequest('/orders', {
    method: 'POST',
    query: { on_conflict: 'paypal_txn_id', select: 'id,customer_id,paypal_txn_id,status,total_amount' },
    body: {
      customer_id: customer.id,
      paypal_txn_id: requireValue(record.paypalTxnId, 'PayPal transaction id'),
      status: record.status || 'paid',
      total_amount: normalizeAmount(record.totalAmount),
    },
    fetchImpl,
    env,
  });
  const order = orderRows[0];
  if (!order?.id) throw new Error('Supabase did not return an order id.');
  return { customer, order };
}

async function supabaseRequest(path, options) {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig(options.env);
  const url = new URL(`${supabaseUrl}/rest/v1${path}`);
  Object.entries(options.query || {}).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await options.fetchImpl(url, {
    method: options.method,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(options.body),
  });
  const body = await parseResponseBody(response);
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status} ${body.message || JSON.stringify(body)}`);
  return Array.isArray(body) ? body : [body];
}

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('A valid total amount is required.');
  return amount.toFixed(2);
}

function requireValue(value, label) {
  if (!value || typeof value !== 'string') throw new Error(`${label} is required.`);
  return value;
}

async function parseResponseBody(response) {
  try {
    return await response.json();
  } catch (_error) {
    const text = await response.text();
    return text ? { message: text } : {};
  }
}

module.exports = { getSupabaseConfig, supabaseRequest, upsertPaidOrder };
