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
  const rows = await supabaseRequest('/customers', {
    method: 'POST',
    query: { on_conflict: 'email', select: 'id,email,name,auth_user_id' },
    prefer: 'resolution=merge-duplicates,return=representation',
    body: { email, name: input.name || null },
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

function buildProjectCode(sequenceNumber) {
  const numeric = Number(sequenceNumber);
  if (!Number.isInteger(numeric) || numeric < 1) throw new Error('Project sequence must be a positive integer.');
  return `DCR-${String(numeric).padStart(6, '0')}`;
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
  try {
    return await response.json();
  } catch (_error) {
    const text = await response.text();
    return text ? { message: text } : {};
  }
}

module.exports = {
  buildProjectCode,
  createProjectEvent,
  getSupabaseConfig,
  normalizeEmail,
  requireValue,
  supabaseRequest,
  upsertCustomer,
};
