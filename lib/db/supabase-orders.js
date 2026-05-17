const {
  getSupabaseConfig,
  normalizeEmail,
  requireValue,
  supabaseRequest,
} = require('./studio-records');

async function upsertPaidOrder(record, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const env = options.env || process.env;
  const buyerEmail = normalizeEmail(record.buyerEmail);
  if (!buyerEmail) throw new Error('A valid buyer email is required.');

  const customerRows = await supabaseRequest('/customers', {
    method: 'POST',
    query: { on_conflict: 'email', select: 'id,email' },
    prefer: 'resolution=merge-duplicates,return=representation',
    body: { email: buyerEmail },
    fetchImpl,
    env,
  });
  const customer = customerRows[0];
  if (!customer?.id) throw new Error('Supabase did not return a customer id.');

  const orderRows = await supabaseRequest('/orders', {
    method: 'POST',
    query: { on_conflict: 'paypal_txn_id', select: 'id,customer_id,paypal_txn_id,status,total_amount' },
    prefer: 'resolution=merge-duplicates,return=representation',
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

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('A valid total amount is required.');
  return amount.toFixed(2);
}

module.exports = { getSupabaseConfig, supabaseRequest, upsertPaidOrder };
