# Studio Automation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the hybrid Dirt Cat Records operations system: Supabase workflow state, Google Drive project folders, Resend transactional emails, PayPal-backed quotes/balances, customer magic-link portal, and Josh-only admin dashboard.

**Architecture:** Keep the existing static-site plus Vercel Functions deployment model. Add focused CommonJS modules under `lib/` for Supabase persistence, Google Drive, Resend, auth, and project automation. Add static portal/admin pages that call server endpoints; privileged work stays server-side.

**Tech Stack:** Static HTML/CSS/vanilla JS, Vercel Functions, Node CommonJS, Supabase Postgres/Auth REST APIs, Google Drive REST API, Resend REST API, PayPal REST API, Node built-in test runner.

---

## Scope Check

The approved spec is a full operations system. Implement it in seven phases. Each phase should leave the app in a working, testable state.

Do not migrate to a framework during this plan. Do not introduce npm runtime dependencies unless a task explicitly revises this plan after a concrete blocker.

## File Structure

Create or modify these files:

- Modify: `supabase/schema.sql` - expanded tables, constraints, indexes, RLS posture.
- Modify: `package.json` - extend `check:js` with new files.
- Modify: `api/webhooks/paypal.js` - call paid-project automation after confirmed payment.
- Modify: `api/create-paypal-order.js` - support quote and balance payment metadata.
- Modify: `api/capture-paypal-order.js` - preserve current normal checkout behavior and allow balance capture.
- Modify: `lib/db/supabase-orders.js` - keep compatibility; delegate shared REST helpers where useful.
- Create: `lib/http/json.js` - shared JSON body parsing and response helpers.
- Create: `lib/auth/supabase-auth.js` - server-side user lookup, admin check, customer access checks.
- Create: `lib/db/studio-records.js` - customer, lead, project, quote, payment, event, file, note, email, follow-up persistence.
- Create: `lib/email/resend.js` - email sender and template catalog.
- Create: `lib/google/drive.js` - Google OAuth refresh, folder creation, sharing, Drive URL formatting.
- Create: `lib/automation/studio-workflow.js` - orchestration for free reviews, paid projects, quotes, delivery, revisions, follow-ups.
- Create: `api/public/config.js` - expose safe public config for browser auth.
- Create: `api/public/free-review.js` - free mix review intake endpoint.
- Create: `api/portal/projects.js` - authenticated customer project list/detail endpoint.
- Create: `api/portal/file-links.js` - customer external link submission.
- Create: `api/portal/revisions.js` - customer revision request endpoint.
- Create: `api/portal/approvals.js` - customer final approval endpoint.
- Create: `api/portal/pay-balance.js` - start balance payment.
- Create: `api/portal/accept-quote.js` - accept quote/start payment.
- Create: `api/admin/overview.js` - admin dashboard summary data.
- Create: `api/admin/projects.js` - admin project list/detail/status actions.
- Create: `api/admin/quotes.js` - quote create/send endpoints.
- Create: `api/admin/delivery.js` - final link/delivery actions.
- Create: `api/admin/retry.js` - retry Drive/email automation.
- Create: `api/cron/followups.js` - protected scheduled follow-up runner.
- Create: `portal.html`, `portal.js` - customer portal shell.
- Create: `admin.html`, `admin.js` - Josh-only admin dashboard shell.
- Modify: `index.html` - replace `mailto:` free-review form with API-backed submission.
- Modify: `style.css` - portal, admin, and form status styles.
- Create tests under `test/` for each new library and API route.

## Environment Variables

Add these server-side variables in Vercel:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_PUBLIC_KEY
SUPABASE_JWT_SECRET
ADMIN_EMAIL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
GOOGLE_DRIVE_PROJECTS_FOLDER_ID
RESEND_API_KEY
RESEND_FROM_EMAIL
RESEND_REPLY_TO_EMAIL
CRON_SECRET
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
PAYPAL_ENV
PAYPAL_WEBHOOK_ID
```

Only `SUPABASE_URL` and `SUPABASE_PUBLIC_KEY` may be returned to browser code.

---

## Task 1: Expand Supabase Schema

**Files:**
- Modify: `supabase/schema.sql`
- Test: manual SQL review in Supabase SQL editor before applying to production

- [ ] **Step 1: Add table definitions**

Append schema for the operations system after the existing tables. Keep existing `customers`, `orders`, and `project_files` compatible.

```sql
alter table public.customers
  add column if not exists name text,
  add column if not exists auth_user_id uuid unique;

alter table public.orders
  add column if not exists project_id uuid,
  add column if not exists paypal_order_id text,
  add column if not exists payment_mode text not null default 'full',
  add column if not exists amount_due_now numeric(10, 2),
  add column if not exists remaining_balance numeric(10, 2) not null default 0,
  add column if not exists order_summary jsonb not null default '{}'::jsonb;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_code text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  lead_id uuid,
  active_quote_id uuid,
  project_type text not null,
  status text not null,
  artist_name text,
  project_title text,
  service_id text,
  song_count integer not null default 1,
  included_revisions integer not null default 1,
  used_revisions integer not null default 0,
  extra_revisions_allowed integer not null default 0,
  total_amount numeric(10, 2) not null default 0,
  amount_paid numeric(10, 2) not null default 0,
  balance_due numeric(10, 2) not null default 0,
  final_delivery_locked boolean not null default true,
  drive_project_folder_id text,
  drive_project_folder_url text,
  drive_upload_folder_id text,
  drive_upload_folder_url text,
  drive_finals_folder_id text,
  drive_finals_folder_url text,
  final_delivery_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_project_type_check check (project_type in ('free_review', 'paid')),
  constraint projects_status_check check (status in (
    'lead_new',
    'awaiting_files',
    'files_submitted',
    'reviewing',
    'quoted',
    'quote_sent',
    'quote_accepted',
    'paid',
    'mixing',
    'revision_requested',
    'revision_in_progress',
    'finals_ready',
    'balance_due',
    'delivered',
    'approved',
    'completed',
    'closed'
  )),
  constraint projects_song_count_check check (song_count >= 1),
  constraint projects_revision_counts_check check (
    included_revisions >= 0
    and used_revisions >= 0
    and extra_revisions_allowed >= 0
  ),
  constraint projects_amounts_check check (
    total_amount >= 0
    and amount_paid >= 0
    and balance_due >= 0
  )
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  source text not null default 'free_review',
  status text not null default 'new',
  artist_name text,
  project_title text,
  email text not null,
  message text,
  reference_links jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_status_check check (status in ('new', 'awaiting_files', 'reviewed', 'quoted', 'converted', 'closed'))
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  quote_id uuid,
  paypal_order_id text,
  paypal_capture_id text not null unique,
  payment_purpose text not null,
  status text not null,
  amount numeric(10, 2) not null,
  currency text not null default 'USD',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint payments_purpose_check check (payment_purpose in ('checkout', 'quote', 'balance')),
  constraint payments_status_check check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  constraint payments_amount_check check (amount >= 0)
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  status text not null default 'draft',
  base_service_id text not null,
  song_count integer not null default 1,
  catalog_total_cents integer not null,
  adjustment_cents integer not null default 0,
  final_total_cents integer not null,
  payment_mode text not null default 'full',
  deposit_cents integer not null default 0,
  balance_cents integer not null default 0,
  notes text,
  expires_at timestamptz not null,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotes_status_check check (status in ('draft', 'sent', 'viewed', 'accepted', 'expired', 'cancelled')),
  constraint quotes_payment_mode_check check (payment_mode in ('full', 'deposit')),
  constraint quotes_song_count_check check (song_count >= 1)
);

create table if not exists public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  item_type text not null,
  item_id text,
  label text not null,
  quantity integer not null default 1,
  unit_cents integer not null,
  total_cents integer not null,
  created_at timestamptz not null default now(),
  constraint quote_line_items_type_check check (item_type in ('service', 'add_on', 'adjustment')),
  constraint quote_line_items_quantity_check check (quantity >= 1)
);

create table if not exists public.project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_type text not null,
  actor_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint project_events_actor_type_check check (actor_type in ('system', 'customer', 'admin', 'paypal', 'drive', 'resend'))
);

create table if not exists public.revision_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  status text not null default 'requested',
  notes text not null,
  reference_links jsonb not null default '[]'::jsonb,
  is_extra_revision boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint revision_requests_status_check check (status in ('requested', 'in_progress', 'resolved', 'cancelled'))
);

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  email_type text not null,
  recipient text not null,
  status text not null,
  resend_message_id text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint email_events_status_check check (status in ('sent', 'failed', 'skipped'))
);

create table if not exists public.followup_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  followup_type text not null,
  status text not null default 'pending',
  scheduled_for timestamptz not null,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  constraint followup_jobs_status_check check (status in ('pending', 'sent', 'skipped', 'failed'))
);

create index if not exists customers_auth_user_id_idx on public.customers(auth_user_id);
create index if not exists projects_customer_id_idx on public.projects(customer_id);
create index if not exists projects_status_idx on public.projects(status);
create index if not exists leads_customer_id_idx on public.leads(customer_id);
create index if not exists payments_project_id_idx on public.payments(project_id);
create index if not exists quotes_project_id_idx on public.quotes(project_id);
create index if not exists project_events_project_id_idx on public.project_events(project_id);
create index if not exists email_events_project_id_type_idx on public.email_events(project_id, email_type);
create unique index if not exists followup_jobs_unique_pending_idx
  on public.followup_jobs(project_id, followup_type, status)
  where status = 'pending';
```

- [ ] **Step 2: Add foreign keys after tables exist**

Append these relationship fixes after all table creation statements.

```sql
alter table public.orders
  drop constraint if exists orders_project_id_fkey,
  add constraint orders_project_id_fkey
    foreign key (project_id) references public.projects(id) on delete set null;

alter table public.projects
  drop constraint if exists projects_lead_id_fkey,
  add constraint projects_lead_id_fkey
    foreign key (lead_id) references public.leads(id) on delete set null;

alter table public.projects
  drop constraint if exists projects_active_quote_id_fkey,
  add constraint projects_active_quote_id_fkey
    foreign key (active_quote_id) references public.quotes(id) on delete set null;

alter table public.payments
  drop constraint if exists payments_quote_id_fkey,
  add constraint payments_quote_id_fkey
    foreign key (quote_id) references public.quotes(id) on delete set null;
```

- [ ] **Step 3: Enable RLS and service role grants**

Append the new tables to the existing RLS/grant section.

```sql
alter table public.leads enable row level security;
alter table public.projects enable row level security;
alter table public.payments enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_line_items enable row level security;
alter table public.project_events enable row level security;
alter table public.revision_requests enable row level security;
alter table public.admin_notes enable row level security;
alter table public.email_events enable row level security;
alter table public.followup_jobs enable row level security;

revoke all on table public.leads from anon, authenticated;
revoke all on table public.projects from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.quotes from anon, authenticated;
revoke all on table public.quote_line_items from anon, authenticated;
revoke all on table public.project_events from anon, authenticated;
revoke all on table public.revision_requests from anon, authenticated;
revoke all on table public.admin_notes from anon, authenticated;
revoke all on table public.email_events from anon, authenticated;
revoke all on table public.followup_jobs from anon, authenticated;

grant select, insert, update, delete on table public.leads to service_role;
grant select, insert, update, delete on table public.projects to service_role;
grant select, insert, update, delete on table public.payments to service_role;
grant select, insert, update, delete on table public.quotes to service_role;
grant select, insert, update, delete on table public.quote_line_items to service_role;
grant select, insert, update, delete on table public.project_events to service_role;
grant select, insert, update, delete on table public.revision_requests to service_role;
grant select, insert, update, delete on table public.admin_notes to service_role;
grant select, insert, update, delete on table public.email_events to service_role;
grant select, insert, update, delete on table public.followup_jobs to service_role;
```

- [ ] **Step 4: Review SQL manually**

Run:

```bash
rg -n "create table|alter table|constraint|TODO|TBD" supabase/schema.sql
```

Expected: new tables and constraints are visible; no `TODO` or `TBD`.

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: expand studio automation schema"
```

---

## Task 2: Add Shared JSON And Supabase Record Helpers

**Files:**
- Create: `lib/http/json.js`
- Create: `lib/db/studio-records.js`
- Modify: `lib/db/supabase-orders.js`
- Test: `test/studio-records.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write tests for shared record helpers**

Create `test/studio-records.test.js`.

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildProjectCode,
  normalizeEmail,
  upsertCustomer,
  createProjectEvent,
} = require('../lib/db/studio-records');

test('normalizeEmail lowercases and validates customer email', () => {
  assert.equal(normalizeEmail(' Buyer@Example.COM '), 'buyer@example.com');
  assert.equal(normalizeEmail('not-an-email'), null);
});

test('buildProjectCode pads numeric ids for customer-facing project codes', () => {
  assert.equal(buildProjectCode(123), 'DCR-000123');
});

test('upsertCustomer posts by email conflict and returns the customer', async () => {
  const calls = [];
  const customer = await upsertCustomer({
    email: 'Buyer@Example.com',
    name: 'Buyer Name',
  }, {
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), body: JSON.parse(options.body) });
      return jsonResponse([{ id: 'customer-1', email: 'buyer@example.com' }]);
    },
  });

  assert.equal(customer.id, 'customer-1');
  assert.match(calls[0].url, /\/customers\?on_conflict=email&select=/);
  assert.equal(calls[0].body.email, 'buyer@example.com');
  assert.equal(calls[0].body.name, 'Buyer Name');
});

test('createProjectEvent stores timeline event metadata', async () => {
  const calls = [];
  await createProjectEvent({
    projectId: 'project-1',
    eventType: 'status_changed',
    actorType: 'system',
    message: 'Project moved to awaiting files.',
    metadata: { status: 'awaiting_files' },
  }, {
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), body: JSON.parse(options.body) });
      return jsonResponse([{ id: 'event-1' }]);
    },
  });

  assert.match(calls[0].url, /\/project_events\?select=/);
  assert.equal(calls[0].body.actor_type, 'system');
  assert.equal(calls[0].body.metadata.status, 'awaiting_files');
});

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; },
    async text() { return JSON.stringify(body); },
  };
}
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- test/studio-records.test.js
```

Expected: FAIL because `lib/db/studio-records.js` does not exist.

- [ ] **Step 3: Create shared JSON helpers**

Create `lib/http/json.js`.

```js
const DEFAULT_MAX_JSON_BODY_BYTES = 32 * 1024;

async function readJsonBody(req, options = {}) {
  const maxBytes = options.maxBytes || DEFAULT_MAX_JSON_BODY_BYTES;
  const contentLength = Number(req.headers?.['content-length']);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw createHttpError(413, 'Request payload is too large');
  }

  if (typeof req.body === 'string') return parseJson(req.body);
  if (Buffer.isBuffer(req.body)) return parseJson(req.body.toString('utf8'));
  if (req.body && typeof req.body === 'object') return req.body;

  const chunks = [];
  let bytesRead = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytesRead += buffer.length;
    if (bytesRead > maxBytes) throw createHttpError(413, 'Request payload is too large');
    chunks.push(buffer);
  }

  return parseJson(Buffer.concat(chunks).toString('utf8'));
}

function parseJson(rawBody) {
  if (!rawBody) return {};
  try {
    return JSON.parse(rawBody);
  } catch (_error) {
    throw createHttpError(400, 'Invalid JSON payload');
  }
}

function sendJson(res, status, body) {
  if (typeof res.setHeader === 'function') res.setHeader('Content-Type', 'application/json');
  return res.status(status).json(body);
}

function methodNotAllowed(res) {
  return sendJson(res, 405, { error: 'Method not allowed' });
}

function createHttpError(statusCode, publicMessage) {
  const error = new Error(publicMessage);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  return error;
}

module.exports = {
  DEFAULT_MAX_JSON_BODY_BYTES,
  createHttpError,
  methodNotAllowed,
  readJsonBody,
  sendJson,
};
```

- [ ] **Step 4: Create `studio-records` helper**

Create `lib/db/studio-records.js` with these exports. Keep existing `supabase-orders.js` working.

```js
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
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- test/studio-records.test.js
```

Expected: PASS.

- [ ] **Step 6: Extend `check:js`**

Modify `package.json` to include new files:

```json
"check:js": "node --check spells.js && node --check checkout.js && node --check success.js && node --check api/create-paypal-order.js && node --check api/capture-paypal-order.js && node --check api/checkout-config.js && node --check api/webhooks/paypal.js && node --check lib/checkout/pricing.js && node --check lib/paypal/webhook.js && node --check lib/db/supabase-orders.js && node --check lib/http/json.js && node --check lib/db/studio-records.js"
```

- [ ] **Step 7: Run full checks**

Run:

```bash
npm test
npm run check:js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add package.json lib/http/json.js lib/db/studio-records.js test/studio-records.test.js
git commit -m "feat: add studio record helpers"
```

---

## Task 3: Add Google Drive Automation Helper

**Files:**
- Create: `lib/google/drive.js`
- Test: `test/google-drive.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write Drive helper tests**

Create `test/google-drive.test.js`.

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildProjectFolderName,
  createDriveProjectFolders,
  getDriveConfig,
} = require('../lib/google/drive');

test('buildProjectFolderName removes unsafe separators', () => {
  assert.equal(
    buildProjectFolderName({ projectCode: 'DCR-000123', artistName: 'Dude/McGee', projectTitle: 'First: Song' }),
    'DCR-000123 - Dude McGee - First Song',
  );
});

test('getDriveConfig requires server credentials', () => {
  assert.throws(() => getDriveConfig({}), /Google Drive automation is not configured/);
});

test('createDriveProjectFolders creates project subfolders and shares upload folder', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method, body: options.body ? JSON.parse(options.body) : null });
    if (String(url).includes('/oauth2/')) return jsonResponse({ access_token: 'access-token' });
    if (String(url).includes('/permissions')) return jsonResponse({ id: 'permission-1' });
    return jsonResponse({ id: `folder-${calls.length}`, webViewLink: `https://drive.test/folder-${calls.length}` });
  };

  const result = await createDriveProjectFolders({
    projectCode: 'DCR-000123',
    artistName: 'Dude McGee',
    projectTitle: 'Song One',
    customerEmail: 'buyer@example.com',
  }, {
    fetchImpl,
    env: driveEnv(),
  });

  assert.equal(result.projectFolderId, 'folder-2');
  assert.equal(result.uploadFolderUrl, 'https://drive.test/folder-3');
  assert.ok(calls.some((call) => call.url.includes('/permissions')));
});

function driveEnv() {
  return {
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    GOOGLE_REFRESH_TOKEN: 'refresh-token',
    GOOGLE_DRIVE_PROJECTS_FOLDER_ID: 'parent-folder',
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; },
    async text() { return JSON.stringify(body); },
  };
}
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- test/google-drive.test.js
```

Expected: FAIL because `lib/google/drive.js` does not exist.

- [ ] **Step 3: Implement Drive helper**

Create `lib/google/drive.js`.

```js
const DRIVE_API_BASE_URL = 'https://www.googleapis.com/drive/v3';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SUBFOLDERS = Object.freeze([
  '01 Client Uploads',
  '02 References',
  '03 Working',
  '04 Finals',
  '05 Admin Notes',
]);

function getDriveConfig(env = process.env) {
  const config = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    refreshToken: env.GOOGLE_REFRESH_TOKEN,
    projectsFolderId: env.GOOGLE_DRIVE_PROJECTS_FOLDER_ID,
  };
  if (!config.clientId || !config.clientSecret || !config.refreshToken || !config.projectsFolderId) {
    throw new Error('Google Drive automation is not configured.');
  }
  return config;
}

async function createDriveProjectFolders(project, options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || fetch;
  const config = getDriveConfig(env);
  const accessToken = await getAccessToken(config, fetchImpl);

  const projectFolder = await createFolder({
    accessToken,
    fetchImpl,
    name: buildProjectFolderName(project),
    parentId: config.projectsFolderId,
  });

  const subfolders = {};
  for (const name of SUBFOLDERS) {
    subfolders[name] = await createFolder({
      accessToken,
      fetchImpl,
      name,
      parentId: projectFolder.id,
    });
  }

  if (project.customerEmail) {
    await shareFolderWithEmail({
      accessToken,
      fetchImpl,
      folderId: subfolders['01 Client Uploads'].id,
      email: project.customerEmail,
    });
  }

  return {
    projectFolderId: projectFolder.id,
    projectFolderUrl: projectFolder.webViewLink,
    uploadFolderId: subfolders['01 Client Uploads'].id,
    uploadFolderUrl: subfolders['01 Client Uploads'].webViewLink,
    finalsFolderId: subfolders['04 Finals'].id,
    finalsFolderUrl: subfolders['04 Finals'].webViewLink,
  };
}

async function getAccessToken(config, fetchImpl) {
  const response = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });
  const body = await readJson(response);
  if (!response.ok || !body.access_token) throw new Error(`Unable to refresh Google access token: ${body.error || response.status}`);
  return body.access_token;
}

async function createFolder({ accessToken, fetchImpl, name, parentId }) {
  const response = await fetchImpl(`${DRIVE_API_BASE_URL}/files?fields=id,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  const body = await readJson(response);
  if (!response.ok || !body.id) throw new Error(`Unable to create Google Drive folder: ${body.error?.message || response.status}`);
  return body;
}

async function shareFolderWithEmail({ accessToken, fetchImpl, folderId, email }) {
  const response = await fetchImpl(`${DRIVE_API_BASE_URL}/files/${encodeURIComponent(folderId)}/permissions?sendNotificationEmail=false`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'user',
      role: 'writer',
      emailAddress: email,
    }),
  });
  const body = await readJson(response);
  if (!response.ok) throw new Error(`Unable to share Google Drive upload folder: ${body.error?.message || response.status}`);
  return body;
}

function buildProjectFolderName(project) {
  return [
    project.projectCode,
    cleanFolderPart(project.artistName || 'Unknown Artist'),
    cleanFolderPart(project.projectTitle || 'Untitled Project'),
  ].filter(Boolean).join(' - ');
}

function cleanFolderPart(value) {
  return String(value || '')
    .replace(/[/:\\?*"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function readJson(response) {
  try {
    return await response.json();
  } catch (_error) {
    return {};
  }
}

module.exports = {
  buildProjectFolderName,
  createDriveProjectFolders,
  getDriveConfig,
};
```

- [ ] **Step 4: Update `check:js`**

Add `node --check lib/google/drive.js` to `package.json`.

- [ ] **Step 5: Run tests and syntax check**

Run:

```bash
npm test -- test/google-drive.test.js
npm run check:js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json lib/google/drive.js test/google-drive.test.js
git commit -m "feat: add google drive folder automation"
```

---

## Task 4: Add Resend Email Helper

**Files:**
- Create: `lib/email/resend.js`
- Test: `test/resend-email.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write email helper tests**

Create `test/resend-email.test.js`.

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildEmail,
  getResendConfig,
  sendStudioEmail,
} = require('../lib/email/resend');

test('buildEmail creates one-action upload instructions email', () => {
  const email = buildEmail('upload_instructions', {
    customerName: 'Buyer',
    portalUrl: 'https://dirtcat.test/portal.html',
    uploadFolderUrl: 'https://drive.test/upload',
  });
  assert.equal(email.subject, 'Send your project files to Dirt Cat Records');
  assert.match(email.text, /https:\/\/drive.test\/upload/);
});

test('getResendConfig requires server credentials', () => {
  assert.throws(() => getResendConfig({}), /Resend is not configured/);
});

test('sendStudioEmail posts to Resend API', async () => {
  const calls = [];
  const result = await sendStudioEmail({
    to: 'buyer@example.com',
    emailType: 'free_review_received',
    data: { customerName: 'Buyer', portalUrl: 'https://dirtcat.test/portal.html' },
  }, {
    env: resendEnv(),
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), body: JSON.parse(options.body) });
      return jsonResponse({ id: 'email-123' });
    },
  });

  assert.equal(result.id, 'email-123');
  assert.equal(calls[0].body.from, 'Dirt Cat Records <studio@example.com>');
  assert.equal(calls[0].body.reply_to, 'josh@example.com');
});

function resendEnv() {
  return {
    RESEND_API_KEY: 'resend-key',
    RESEND_FROM_EMAIL: 'Dirt Cat Records <studio@example.com>',
    RESEND_REPLY_TO_EMAIL: 'josh@example.com',
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; },
    async text() { return JSON.stringify(body); },
  };
}
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- test/resend-email.test.js
```

Expected: FAIL because `lib/email/resend.js` does not exist.

- [ ] **Step 3: Implement Resend helper**

Create `lib/email/resend.js`.

```js
const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

function getResendConfig(env = process.env) {
  const config = {
    apiKey: env.RESEND_API_KEY,
    from: env.RESEND_FROM_EMAIL,
    replyTo: env.RESEND_REPLY_TO_EMAIL,
  };
  if (!config.apiKey || !config.from || !config.replyTo) throw new Error('Resend is not configured.');
  return config;
}

async function sendStudioEmail(message, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const config = getResendConfig(options.env || process.env);
  const email = buildEmail(message.emailType, message.data || {});
  const response = await fetchImpl(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: [message.to],
      reply_to: config.replyTo,
      subject: email.subject,
      text: email.text,
    }),
  });
  const body = await readJson(response);
  if (!response.ok) throw new Error(`Resend email failed: ${body.message || response.status}`);
  return body;
}

function buildEmail(type, data) {
  const templates = {
    free_review_received: {
      subject: 'Your free mix review is started',
      text: `Thanks${nameSuffix(data.customerName)}. Use your portal link to send files and check status:\n\n${data.portalUrl}`,
    },
    upload_instructions: {
      subject: 'Send your project files to Dirt Cat Records',
      text: `Use this Drive upload folder when possible:\n\n${data.uploadFolderUrl || 'Upload folder coming soon.'}\n\nYou can also submit Dropbox, Google Drive, or WeTransfer links from your portal:\n\n${data.portalUrl}`,
    },
    quote_sent: {
      subject: 'Your Dirt Cat Records quote is ready',
      text: `Your custom quote is ready here:\n\n${data.quoteUrl}\n\nQuote total: ${data.totalLabel}`,
    },
    payment_received: {
      subject: 'Payment received',
      text: `Payment received. Your project portal is here:\n\n${data.portalUrl}`,
    },
    files_received: {
      subject: 'Project files received',
      text: 'Your files/links were received. Josh will review them and update your project status.',
    },
    finals_ready_balance_due: {
      subject: 'Your finals are ready - balance due',
      text: `Your finals are ready. Please pay the remaining balance to unlock delivery:\n\n${data.balanceUrl}`,
    },
    final_delivery_unlocked: {
      subject: 'Your final files are ready',
      text: `Your final files are ready here:\n\n${data.finalDeliveryUrl}\n\nYou can approve or request your included revision from the portal:\n\n${data.portalUrl}`,
    },
    admin_notification: {
      subject: data.subject || 'Dirt Cat Records needs attention',
      text: data.text || 'Open the admin dashboard for details.',
    },
  };
  const email = templates[type];
  if (!email) throw new Error(`Unknown email type: ${type}`);
  return email;
}

function nameSuffix(name) {
  return name ? `, ${name}` : '';
}

async function readJson(response) {
  try {
    return await response.json();
  } catch (_error) {
    return {};
  }
}

module.exports = {
  buildEmail,
  getResendConfig,
  sendStudioEmail,
};
```

- [ ] **Step 4: Update `check:js`**

Add `node --check lib/email/resend.js` to `package.json`.

- [ ] **Step 5: Run tests and syntax check**

Run:

```bash
npm test -- test/resend-email.test.js
npm run check:js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json lib/email/resend.js test/resend-email.test.js
git commit -m "feat: add resend email helper"
```

---

## Task 5: Add Studio Workflow Orchestration

**Files:**
- Create: `lib/automation/studio-workflow.js`
- Modify: `lib/db/studio-records.js`
- Test: `test/studio-workflow.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write workflow tests**

Create `test/studio-workflow.test.js`.

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createFreeReviewWorkflow,
  createPaidProjectWorkflow,
} = require('../lib/automation/studio-workflow');

test('createFreeReviewWorkflow creates records then tries Drive and email', async () => {
  const calls = [];
  const workflow = createFreeReviewWorkflow({
    records: fakeRecords(calls),
    drive: fakeDrive(calls),
    email: fakeEmail(calls),
    env: { ADMIN_EMAIL: 'josh@example.com' },
  });

  const result = await workflow({
    email: 'Buyer@Example.com',
    name: 'Buyer',
    artistName: 'Dude McGee',
    projectTitle: 'Song One',
    message: 'Please review this mix.',
  });

  assert.equal(result.customer.email, 'buyer@example.com');
  assert.equal(result.project.status, 'awaiting_files');
  assert.ok(calls.some((call) => call.type === 'drive.create'));
  assert.ok(calls.some((call) => call.type === 'email.customer'));
  assert.ok(calls.some((call) => call.type === 'email.admin'));
});

test('createPaidProjectWorkflow leaves project usable when Drive fails', async () => {
  const calls = [];
  const workflow = createPaidProjectWorkflow({
    records: fakeRecords(calls),
    drive: { createDriveProjectFolders: async () => { throw new Error('Drive failed'); } },
    email: fakeEmail(calls),
    env: { ADMIN_EMAIL: 'josh@example.com' },
  });

  const result = await workflow({
    paypalTxnId: 'CAPTURE-1',
    buyerEmail: 'buyer@example.com',
    totalAmount: '199.00',
    orderSummary: { baseServiceId: 'mixMaster', songCount: 1, paymentMode: 'full' },
  });

  assert.equal(result.project.status, 'awaiting_files');
  assert.ok(calls.some((call) => call.type === 'event' && call.message.match(/Drive automation failed/)));
});

function fakeRecords(calls) {
  return {
    upsertCustomer: async (input) => ({ id: 'customer-1', email: input.email.toLowerCase(), name: input.name || null }),
    createLead: async () => ({ id: 'lead-1' }),
    createProject: async (input) => ({ id: 'project-1', status: input.status, project_code: 'DCR-000123' }),
    updateProject: async (_id, patch) => ({ id: 'project-1', ...patch }),
    createProjectEvent: async (event) => { calls.push({ type: 'event', message: event.message }); return { id: 'event-1' }; },
    upsertPaymentAndOrder: async () => ({ order: { id: 'order-1' }, payment: { id: 'payment-1' } }),
  };
}

function fakeDrive(calls) {
  return {
    createDriveProjectFolders: async () => {
      calls.push({ type: 'drive.create' });
      return {
        projectFolderId: 'folder-project',
        projectFolderUrl: 'https://drive.test/project',
        uploadFolderId: 'folder-upload',
        uploadFolderUrl: 'https://drive.test/upload',
        finalsFolderId: 'folder-finals',
        finalsFolderUrl: 'https://drive.test/finals',
      };
    },
  };
}

function fakeEmail(calls) {
  return {
    sendCustomerEmail: async () => calls.push({ type: 'email.customer' }),
    sendAdminEmail: async () => calls.push({ type: 'email.admin' }),
  };
}
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- test/studio-workflow.test.js
```

Expected: FAIL because `lib/automation/studio-workflow.js` does not exist.

- [ ] **Step 3: Implement workflow orchestration**

Create `lib/automation/studio-workflow.js`.

```js
const driveDefault = require('../google/drive');
const resendDefault = require('../email/resend');
const recordsDefault = require('../db/studio-records');

function createFreeReviewWorkflow(dependencies = {}) {
  const records = dependencies.records || recordsDefault;
  const drive = dependencies.drive || driveDefault;
  const email = dependencies.email || createEmailAdapter(resendDefault, records);
  const env = dependencies.env || process.env;

  return async function freeReviewWorkflow(input) {
    const customer = await records.upsertCustomer({
      email: input.email,
      name: input.name,
    });
    const lead = await records.createLead({
      customerId: customer.id,
      email: customer.email,
      artistName: input.artistName,
      projectTitle: input.projectTitle,
      message: input.message,
      referenceLinks: input.referenceLinks || [],
    });
    let project = await records.createProject({
      customerId: customer.id,
      leadId: lead.id,
      projectType: 'free_review',
      status: 'awaiting_files',
      artistName: input.artistName,
      projectTitle: input.projectTitle,
    });

    await records.createProjectEvent({
      projectId: project.id,
      eventType: 'free_review_created',
      actorType: 'system',
      message: 'Free review project created.',
      metadata: { leadId: lead.id },
    });

    project = await attachDriveFolders({ records, drive, project, customer, input });
    await email.sendCustomerEmail(customer.email, 'free_review_received', {
      customerName: customer.name,
      portalUrl: buildPortalUrl(env),
    });
    await email.sendCustomerEmail(customer.email, 'upload_instructions', {
      uploadFolderUrl: project.drive_upload_folder_url,
      portalUrl: buildPortalUrl(env),
    });
    await email.sendAdminEmail('New free mix review', `New free review from ${customer.email}.`);

    return { customer, lead, project };
  };
}

function createPaidProjectWorkflow(dependencies = {}) {
  const records = dependencies.records || recordsDefault;
  const drive = dependencies.drive || driveDefault;
  const email = dependencies.email || createEmailAdapter(resendDefault, records);
  const env = dependencies.env || process.env;

  return async function paidProjectWorkflow(input) {
    const customer = await records.upsertCustomer({ email: input.buyerEmail, name: input.buyerName });
    const orderPayment = await records.upsertPaymentAndOrder({ customer, payment: input });
    let project = await records.createProject({
      customerId: customer.id,
      orderId: orderPayment.order.id,
      projectType: 'paid',
      status: 'awaiting_files',
      artistName: input.artistName,
      projectTitle: input.projectTitle,
      serviceId: input.orderSummary?.baseServiceId || null,
      songCount: input.orderSummary?.songCount || 1,
      totalAmount: Number(input.totalAmount || 0),
      amountPaid: Number(input.totalAmount || 0),
      balanceDue: Number(input.remainingBalance || 0),
      finalDeliveryLocked: Number(input.remainingBalance || 0) > 0,
    });

    await records.createProjectEvent({
      projectId: project.id,
      eventType: 'paid_project_created',
      actorType: 'paypal',
      message: 'Paid project created after payment confirmation.',
      metadata: { orderId: orderPayment.order.id, paymentId: orderPayment.payment.id },
    });

    project = await attachDriveFolders({ records, drive, project, customer, input });
    await email.sendCustomerEmail(customer.email, 'payment_received', { portalUrl: buildPortalUrl(env) });
    await email.sendCustomerEmail(customer.email, 'upload_instructions', {
      uploadFolderUrl: project.drive_upload_folder_url,
      portalUrl: buildPortalUrl(env),
    });
    await email.sendAdminEmail('New paid project', `New paid project from ${customer.email}.`);

    return { customer, order: orderPayment.order, payment: orderPayment.payment, project };
  };
}

async function attachDriveFolders({ records, drive, project, customer, input }) {
  try {
    const folders = await drive.createDriveProjectFolders({
      projectCode: project.project_code,
      artistName: input.artistName,
      projectTitle: input.projectTitle,
      customerEmail: customer.email,
    });
    return records.updateProject(project.id, {
      drive_project_folder_id: folders.projectFolderId,
      drive_project_folder_url: folders.projectFolderUrl,
      drive_upload_folder_id: folders.uploadFolderId,
      drive_upload_folder_url: folders.uploadFolderUrl,
      drive_finals_folder_id: folders.finalsFolderId,
      drive_finals_folder_url: folders.finalsFolderUrl,
    });
  } catch (error) {
    await records.createProjectEvent({
      projectId: project.id,
      eventType: 'drive_failed',
      actorType: 'drive',
      message: `Drive automation failed: ${error.message}`,
      metadata: {},
    });
    return project;
  }
}

function createEmailAdapter(resend, records) {
  return {
    async sendCustomerEmail(to, emailType, data) {
      return sendAndLogEmail({ resend, records, to, emailType, data });
    },
    async sendAdminEmail(subject, text) {
      return sendAndLogEmail({
        resend,
        records,
        to: process.env.ADMIN_EMAIL,
        emailType: 'admin_notification',
        data: { subject, text },
      });
    },
  };
}

async function sendAndLogEmail({ resend, records, to, emailType, data }) {
  try {
    const result = await resend.sendStudioEmail({ to, emailType, data });
    if (records.createEmailEvent) {
      await records.createEmailEvent({ emailType, recipient: to, status: 'sent', resendMessageId: result.id || null });
    }
    return result;
  } catch (error) {
    if (records.createEmailEvent) {
      await records.createEmailEvent({ emailType, recipient: to, status: 'failed', errorMessage: error.message });
    }
    throw error;
  }
}

function buildPortalUrl(env) {
  return `${(env.SITE_URL || 'https://dirtcatrecords.com').replace(/\/$/, '')}/portal.html`;
}

module.exports = {
  createFreeReviewWorkflow,
  createPaidProjectWorkflow,
};
```

- [ ] **Step 4: Add missing persistence methods**

Extend `lib/db/studio-records.js` with:

```js
async function createLead(input, options = {}) {
  const rows = await supabaseRequest('/leads', {
    method: 'POST',
    query: { select: 'id,customer_id,status' },
    body: {
      customer_id: input.customerId,
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
      customer_id: input.customerId,
      order_id: input.orderId || null,
      lead_id: input.leadId || null,
      project_type: input.projectType,
      status: input.status,
      artist_name: input.artistName || null,
      project_title: input.projectTitle || null,
      service_id: input.serviceId || null,
      song_count: input.songCount || 1,
      total_amount: Number(input.totalAmount || 0).toFixed(2),
      amount_paid: Number(input.amountPaid || 0).toFixed(2),
      balance_due: Number(input.balanceDue || 0).toFixed(2),
      final_delivery_locked: input.finalDeliveryLocked !== false,
    },
    ...options,
  });
  return rows[0];
}

async function updateProject(projectId, patch, options = {}) {
  const rows = await supabaseRequest('/projects', {
    method: 'PATCH',
    query: { id: `eq.${projectId}`, select: '*' },
    body: patch,
    ...options,
  });
  return rows[0];
}
```

Export the new functions.

- [ ] **Step 5: Run workflow tests**

Run:

```bash
npm test -- test/studio-workflow.test.js
```

Expected: PASS.

- [ ] **Step 6: Update `check:js` and run checks**

Add `node --check lib/automation/studio-workflow.js` to `package.json`.

Run:

```bash
npm test
npm run check:js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json lib/automation/studio-workflow.js lib/db/studio-records.js test/studio-workflow.test.js
git commit -m "feat: orchestrate studio workflows"
```

---

## Task 6: Replace Free Review Mailto With Automated Intake

**Files:**
- Create: `api/public/free-review.js`
- Modify: `index.html`
- Modify: `spells.js`
- Test: `test/free-review-api.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write free review API test**

Create `test/free-review-api.test.js`.

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createFreeReviewHandler } = require('../api/public/free-review');

test('free review endpoint validates and starts workflow', async () => {
  const handler = createFreeReviewHandler({
    runWorkflow: async (input) => {
      assert.equal(input.email, 'buyer@example.com');
      return { project: { id: 'project-1' } };
    },
  });

  const res = createResponse();
  await handler({
    method: 'POST',
    headers: {},
    body: JSON.stringify({
      email: 'buyer@example.com',
      name: 'Buyer',
      artistName: 'Dude McGee',
      projectTitle: 'Song One',
      message: 'Please review this mix.',
    }),
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.projectId, 'project-1');
});

test('free review endpoint rejects invalid email', async () => {
  const handler = createFreeReviewHandler({ runWorkflow: async () => { throw new Error('should not run'); } });
  const res = createResponse();
  await handler({ method: 'POST', headers: {}, body: JSON.stringify({ email: 'bad' }) }, res);
  assert.equal(res.statusCode, 400);
});

function createResponse() {
  return {
    statusCode: 0,
    body: null,
    setHeader() {},
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}
```

- [ ] **Step 2: Create API route**

Create `api/public/free-review.js`.

```js
const { methodNotAllowed, readJsonBody, sendJson } = require('../../lib/http/json');
const { normalizeEmail } = require('../../lib/db/studio-records');
const { createFreeReviewWorkflow } = require('../../lib/automation/studio-workflow');

function createFreeReviewHandler(dependencies = {}) {
  const runWorkflow = dependencies.runWorkflow || createFreeReviewWorkflow();

  return async function freeReviewHandler(req, res) {
    if (req.method !== 'POST') return methodNotAllowed(res);

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      return sendJson(res, error.statusCode || 400, { error: error.publicMessage || 'Invalid request' });
    }

    const email = normalizeEmail(body.email);
    if (!email) return sendJson(res, 400, { error: 'A valid email is required.' });
    if (!body.message || typeof body.message !== 'string') return sendJson(res, 400, { error: 'A short message is required.' });

    try {
      const result = await runWorkflow({
        email,
        name: body.name || '',
        artistName: body.artistName || '',
        projectTitle: body.projectTitle || '',
        message: body.message,
        referenceLinks: Array.isArray(body.referenceLinks) ? body.referenceLinks : [],
      });
      return sendJson(res, 200, { ok: true, projectId: result.project.id });
    } catch (error) {
      console.error('Free review submission failed:', { message: error.message });
      return sendJson(res, 500, { error: 'Free review submission failed.' });
    }
  };
}

const handler = createFreeReviewHandler();
module.exports = handler;
module.exports.createFreeReviewHandler = createFreeReviewHandler;
```

- [ ] **Step 3: Run API tests**

Run:

```bash
npm test -- test/free-review-api.test.js
```

Expected: PASS.

- [ ] **Step 4: Change form markup**

In `index.html`, change `#mix-review-form` from `mailto:` to a normal JavaScript-handled form with fields named:

```html
<form id="mix-review-form" class="review-form">
  <input type="email" name="email" placeholder="Email" required>
  <input type="text" name="name" placeholder="Name">
  <input type="text" name="artistName" placeholder="Artist name">
  <input type="text" name="projectTitle" placeholder="Song or project title">
  <textarea name="message" placeholder="What do you want help with?" required></textarea>
  <button class="btn" type="submit">Send Free Mix Review</button>
  <p class="form-status" id="mix-review-status" role="status" aria-live="polite"></p>
</form>
```

- [ ] **Step 5: Add browser submit handler**

In `spells.js`, add:

```js
function initMixReviewForm() {
  const form = document.getElementById('mix-review-form');
  const status = document.getElementById('mix-review-status');
  if (!form || !status) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = 'Sending...';
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/api/public/free-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to submit free review.');
      form.reset();
      status.textContent = 'Got it. Check your email for your project portal and upload instructions.';
    } catch (error) {
      status.textContent = error.message || 'Unable to submit free review.';
    }
  });
}

initMixReviewForm();
```

- [ ] **Step 6: Update `check:js`**

Add `node --check api/public/free-review.js` to `package.json`.

- [ ] **Step 7: Run checks**

Run:

```bash
npm test
npm run check:js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add package.json api/public/free-review.js index.html spells.js test/free-review-api.test.js
git commit -m "feat: automate free mix review intake"
```

---

## Task 7: Add Portal/Auth Foundation

**Files:**
- Create: `api/public/config.js`
- Create: `lib/auth/supabase-auth.js`
- Create: `portal.html`
- Create: `portal.js`
- Test: `test/supabase-auth.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write auth helper tests**

Create `test/supabase-auth.test.js`.

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getBearerToken,
  isAdminEmail,
} = require('../lib/auth/supabase-auth');

test('getBearerToken extracts bearer token', () => {
  assert.equal(getBearerToken({ authorization: 'Bearer abc123' }), 'abc123');
  assert.equal(getBearerToken({ authorization: 'Basic abc123' }), null);
});

test('isAdminEmail compares configured admin email case-insensitively', () => {
  assert.equal(isAdminEmail('Josh@Example.com', { ADMIN_EMAIL: 'josh@example.com' }), true);
  assert.equal(isAdminEmail('buyer@example.com', { ADMIN_EMAIL: 'josh@example.com' }), false);
});
```

- [ ] **Step 2: Implement auth helper**

Create `lib/auth/supabase-auth.js`.

```js
function getBearerToken(headers = {}) {
  const value = headers.authorization || headers.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match ? match[1] : null;
}

function isAdminEmail(email, env = process.env) {
  return Boolean(email && env.ADMIN_EMAIL && email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase());
}

async function getSupabaseUser(accessToken, options = {}) {
  if (!accessToken) return null;
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || fetch;
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLIC_KEY) throw new Error('Supabase public auth is not configured.');
  const response = await fetchImpl(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_PUBLIC_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) return null;
  return response.json();
}

async function requireUser(req, options = {}) {
  const token = getBearerToken(req.headers || {});
  const user = await getSupabaseUser(token, options);
  if (!user?.email) {
    const error = new Error('Authentication required.');
    error.statusCode = 401;
    throw error;
  }
  return user;
}

async function requireAdmin(req, options = {}) {
  const user = await requireUser(req, options);
  if (!isAdminEmail(user.email, options.env || process.env)) {
    const error = new Error('Admin access required.');
    error.statusCode = 403;
    throw error;
  }
  return user;
}

module.exports = {
  getBearerToken,
  getSupabaseUser,
  isAdminEmail,
  requireAdmin,
  requireUser,
};
```

- [ ] **Step 3: Add public config endpoint**

Create `api/public/config.js`.

```js
const { sendJson } = require('../../lib/http/json');

module.exports = function publicConfigHandler(_req, res) {
  return sendJson(res, 200, {
    supabaseUrl: process.env.SUPABASE_URL,
    supabasePublicKey: process.env.SUPABASE_PUBLIC_KEY,
  });
};
```

- [ ] **Step 4: Add portal shell**

Create `portal.html` with a login form and project container. Include Supabase browser client from CDN only on this page.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dirt Cat Records Portal</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="portal-shell">
    <section class="portal-login" id="portal-login">
      <h1>Project Portal</h1>
      <form id="magic-link-form">
        <input type="email" name="email" placeholder="Email" required>
        <button class="btn" type="submit">Send Magic Link</button>
      </form>
      <p id="portal-status" role="status" aria-live="polite"></p>
    </section>
    <section class="portal-projects" id="portal-projects" hidden></section>
  </main>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="portal.js"></script>
</body>
</html>
```

- [ ] **Step 5: Add portal auth JS**

Create `portal.js`.

```js
let supabaseClient;

async function initPortal() {
  const configResponse = await fetch('/api/public/config');
  const config = await configResponse.json();
  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabasePublicKey);

  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    await renderProjects(data.session.access_token);
  }

  const form = document.getElementById('magic-link-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = new FormData(form).get('email');
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    setPortalStatus(error ? error.message : 'Check your email for the magic link.');
  });
}

async function renderProjects(accessToken) {
  const response = await fetch('/api/portal/projects', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json();
  if (!response.ok) {
    setPortalStatus(body.error || 'Unable to load projects.');
    return;
  }
  document.getElementById('portal-login').hidden = true;
  const container = document.getElementById('portal-projects');
  container.hidden = false;
  container.innerHTML = body.projects.map(renderProjectCard).join('');
}

function renderProjectCard(project) {
  return `
    <article class="portal-project">
      <h2>${escapeHtml(project.project_title || 'Untitled Project')}</h2>
      <p>Status: ${escapeHtml(project.status)}</p>
      ${project.drive_upload_folder_url ? `<a class="btn" href="${escapeHtml(project.drive_upload_folder_url)}" target="_blank" rel="noreferrer">Open Upload Folder</a>` : ''}
    </article>
  `;
}

function setPortalStatus(message) {
  document.getElementById('portal-status').textContent = message;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
}

initPortal().catch((error) => setPortalStatus(error.message || 'Unable to load portal.'));
```

- [ ] **Step 6: Add portal projects endpoint**

Create `api/portal/projects.js`.

```js
const { requireUser } = require('../../lib/auth/supabase-auth');
const { methodNotAllowed, sendJson } = require('../../lib/http/json');
const { supabaseRequest, normalizeEmail } = require('../../lib/db/studio-records');

module.exports = async function portalProjectsHandler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  try {
    const user = await requireUser(req);
    const email = normalizeEmail(user.email);
    const customers = await supabaseRequest('/customers', {
      query: { email: `eq.${email}`, select: 'id,email' },
    });
    if (!customers[0]) return sendJson(res, 200, { projects: [] });
    const projects = await supabaseRequest('/projects', {
      query: {
        customer_id: `eq.${customers[0].id}`,
        select: 'id,project_code,project_type,status,artist_name,project_title,drive_upload_folder_url,final_delivery_url,balance_due,final_delivery_locked',
        order: 'created_at.desc',
      },
    });
    return sendJson(res, 200, { projects });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.statusCode ? error.message : 'Unable to load projects.' });
  }
};
```

- [ ] **Step 7: Run checks**

Add new files to `check:js`, then run:

```bash
npm test -- test/supabase-auth.test.js
npm run check:js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add package.json api/public/config.js api/portal/projects.js lib/auth/supabase-auth.js portal.html portal.js test/supabase-auth.test.js
git commit -m "feat: add customer portal auth foundation"
```

---

## Task 8: Add Portal Actions

**Files:**
- Create: `api/portal/file-links.js`
- Create: `api/portal/revisions.js`
- Create: `api/portal/approvals.js`
- Modify: `portal.js`
- Test: `test/portal-actions.test.js`

- [ ] **Step 1: Add tests for customer project ownership**

Create `test/portal-actions.test.js` covering:

```js
const test = require('node:test');
const assert = require('node:assert/strict');

test('portal file link endpoint rejects unauthenticated requests', async () => {
  const { createFileLinksHandler } = require('../api/portal/file-links');
  const handler = createFileLinksHandler({ requireUserImpl: async () => { const error = new Error('Authentication required.'); error.statusCode = 401; throw error; } });
  const res = response();
  await handler({ method: 'POST', headers: {}, body: '{}' }, res);
  assert.equal(res.statusCode, 401);
});

function response() {
  return {
    statusCode: 0,
    body: null,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}
```

- [ ] **Step 2: Implement `api/portal/file-links.js`**

Create an exported factory `createFileLinksHandler`. It must:

- require `POST`
- require authenticated user
- read `projectId`, `url`, and `label`
- verify the project belongs to the authenticated user's customer
- insert a `project_files` row with status `submitted`
- update project status to `files_submitted`
- create a `project_events` row
- send `files_received` email

- [ ] **Step 3: Implement `api/portal/revisions.js`**

The endpoint must:

- require authenticated user
- verify project ownership
- check `used_revisions < included_revisions + extra_revisions_allowed`
- insert `revision_requests`
- increment `used_revisions`
- set project status `revision_requested`
- create event
- send admin notification

- [ ] **Step 4: Implement `api/portal/approvals.js`**

The endpoint must:

- require authenticated user
- verify project ownership
- allow approval only when status is `delivered` or `finals_ready` with `final_delivery_locked = false`
- set project status `approved`
- create event
- send admin notification

- [ ] **Step 5: Extend `portal.js` UI**

For each project card, add:

- external link submission form
- revision request form when eligible
- approve final button when eligible
- balance payment button when `balance_due > 0`
- final link button when unlocked

- [ ] **Step 6: Run checks**

Run:

```bash
npm test -- test/portal-actions.test.js
npm test
npm run check:js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api/portal/file-links.js api/portal/revisions.js api/portal/approvals.js portal.js test/portal-actions.test.js package.json
git commit -m "feat: add portal project actions"
```

---

## Task 9: Extend PayPal Flow Into Paid Project Automation

**Files:**
- Modify: `api/webhooks/paypal.js`
- Modify: `lib/db/supabase-orders.js`
- Modify: `lib/paypal/webhook.js`
- Test: `test/paypal-webhook-route.test.js`
- Test: `test/supabase-orders.test.js`

- [ ] **Step 1: Update webhook route tests**

Extend `test/paypal-webhook-route.test.js` to assert the route calls paid-project automation after a completed PayPal event.

```js
test('webhook runs paid project automation for completed payment', async () => {
  let workflowInput;
  const handler = createPaypalWebhookHandler({
    verifySignature: async () => true,
    parseEvent: async () => ({
      paypalTxnId: 'CAPTURE-123',
      buyerEmail: 'buyer@example.com',
      status: 'paid',
      totalAmount: '199.00',
      orderSummary: { baseServiceId: 'mixMaster', songCount: 1, paymentMode: 'full' },
    }),
    runPaidProjectWorkflow: async (input) => {
      workflowInput = input;
      return { project: { id: 'project-123' } };
    },
  });

  const res = createResponse();
  await handler({ method: 'POST', headers: {}, body: { event_type: 'CHECKOUT.ORDER.COMPLETED' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.projectId, 'project-123');
  assert.equal(workflowInput.buyerEmail, 'buyer@example.com');
});
```

- [ ] **Step 2: Modify webhook handler dependencies**

In `api/webhooks/paypal.js`, replace the direct `upsertPaidOrder` call with `createPaidProjectWorkflow()` default dependency.

Expected handler dependency shape:

```js
const { createPaidProjectWorkflow } = require('../../lib/automation/studio-workflow');

const runPaidProjectWorkflow = dependencies.runPaidProjectWorkflow || createPaidProjectWorkflow();
```

Return:

```js
return res.status(200).json({
  ok: true,
  ignored: false,
  projectId: result.project.id,
});
```

- [ ] **Step 3: Keep `upsertPaidOrder` compatible**

Leave `upsertPaidOrder` export in `lib/db/supabase-orders.js` so existing tests and any current callers continue to work.

- [ ] **Step 4: Run webhook tests**

Run:

```bash
npm test -- test/paypal-webhook-route.test.js test/paypal-webhook.test.js test/supabase-orders.test.js
```

Expected: PASS.

- [ ] **Step 5: Run full checks**

Run:

```bash
npm test
npm run check:js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/webhooks/paypal.js lib/db/supabase-orders.js lib/paypal/webhook.js test/paypal-webhook-route.test.js test/supabase-orders.test.js
git commit -m "feat: create projects from paypal webhooks"
```

---

## Task 10: Add Josh-Only Admin Dashboard Foundation

**Files:**
- Create: `admin.html`
- Create: `admin.js`
- Create: `api/admin/overview.js`
- Create: `api/admin/projects.js`
- Test: `test/admin-api.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write admin access test**

Create `test/admin-api.test.js`.

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdminOverviewHandler } = require('../api/admin/overview');

test('admin overview rejects non-admin user', async () => {
  const handler = createAdminOverviewHandler({
    requireAdminImpl: async () => { const error = new Error('Admin access required.'); error.statusCode = 403; throw error; },
  });
  const res = response();
  await handler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 403);
});

function response() {
  return {
    statusCode: 0,
    body: null,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}
```

- [ ] **Step 2: Implement admin overview endpoint**

Create `api/admin/overview.js` with exported `createAdminOverviewHandler`. It must:

- require `GET`
- require admin
- return counts for projects by status
- return recent leads/projects needing action

- [ ] **Step 3: Implement admin projects endpoint**

Create `api/admin/projects.js` with support for:

- `GET`: list projects with customer, status, Drive URL, balance, next action
- `PATCH`: update status, create event, optionally send status email

- [ ] **Step 4: Add admin page shell**

Create `admin.html` with the same magic-link login pattern as the portal and these admin dashboard containers:

- overview counts
- attention list
- project table
- project detail panel

- [ ] **Step 5: Add admin JS**

Create `admin.js` that:

- uses Supabase magic-link login
- calls `/api/admin/overview`
- renders counts and attention list
- calls `/api/admin/projects`
- renders project rows with Drive/admin actions

- [ ] **Step 6: Run checks**

Run:

```bash
npm test -- test/admin-api.test.js
npm test
npm run check:js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add admin.html admin.js api/admin/overview.js api/admin/projects.js test/admin-api.test.js package.json
git commit -m "feat: add admin dashboard foundation"
```

---

## Task 11: Add Custom Quotes

**Files:**
- Create: `api/admin/quotes.js`
- Create: `api/portal/accept-quote.js`
- Modify: `lib/db/studio-records.js`
- Modify: `lib/automation/studio-workflow.js`
- Modify: `api/create-paypal-order.js`
- Modify: `admin.js`
- Modify: `portal.js`
- Test: `test/quotes.test.js`

- [ ] **Step 1: Write quote pricing tests**

Create `test/quotes.test.js` covering:

- catalog quote with no adjustment
- catalog quote with manual discount
- deposit quote calculates due-now and balance
- expired/cancelled quote cannot be accepted

- [ ] **Step 2: Add quote persistence helpers**

In `lib/db/studio-records.js`, add:

- `createQuote(input, options)`
- `createQuoteLineItems(quoteId, lineItems, options)`
- `getQuoteById(quoteId, options)`
- `updateQuote(quoteId, patch, options)`

- [ ] **Step 3: Add admin quote endpoint**

`api/admin/quotes.js` must:

- require admin
- validate project exists
- use `calculateOrder` for catalog total
- apply `adjustmentCents`
- create quote and line items
- send quote email when requested
- mark project `quote_sent`

- [ ] **Step 4: Add portal quote acceptance**

`api/portal/accept-quote.js` must:

- require customer auth
- verify quote belongs to customer
- reject expired/cancelled/accepted quotes
- create a PayPal order with quote metadata
- return PayPal order id to browser

- [ ] **Step 5: Extend PayPal metadata**

In `api/create-paypal-order.js`, add metadata type support:

```text
v2;quote;<quote_id>
v2;balance;<project_id>
```

Keep existing `v1` normal checkout metadata parsing unchanged.

- [ ] **Step 6: Convert quote payment to paid project**

In webhook/workflow code:

- parse quote payment metadata
- mark quote `accepted`
- update project type to `paid`
- update project status to `paid` or `awaiting_files`
- update total/paid/balance fields
- send payment/upload emails

- [ ] **Step 7: Add admin and portal UI**

Admin:

- quote builder on project detail
- service, song count, add-ons, adjustment, notes, expiration
- send quote button

Portal:

- quote card
- accept/pay button
- expiration messaging

- [ ] **Step 8: Run checks**

Run:

```bash
npm test -- test/quotes.test.js
npm test
npm run check:js
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add api/admin/quotes.js api/portal/accept-quote.js api/create-paypal-order.js admin.js portal.js lib/db/studio-records.js lib/automation/studio-workflow.js test/quotes.test.js package.json
git commit -m "feat: add custom quote workflow"
```

---

## Task 12: Add Balance Payments And Final Delivery Lock

**Files:**
- Create: `api/portal/pay-balance.js`
- Create: `api/admin/delivery.js`
- Modify: `api/create-paypal-order.js`
- Modify: `api/webhooks/paypal.js`
- Modify: `lib/automation/studio-workflow.js`
- Modify: `portal.js`
- Modify: `admin.js`
- Test: `test/delivery-balance.test.js`

- [ ] **Step 1: Write balance/delivery tests**

Create tests covering:

- deposit project with `balance_due > 0` cannot send final delivery
- balance payment marks `balance_due = 0`
- final delivery unlocks and sends email after balance paid
- full-payment project can deliver when finals are ready

- [ ] **Step 2: Add balance payment endpoint**

`api/portal/pay-balance.js` must:

- require customer auth
- verify project belongs to customer
- require `balance_due > 0`
- create PayPal order with `v2;balance;<project_id>` metadata
- return PayPal order id

- [ ] **Step 3: Add delivery admin endpoint**

`api/admin/delivery.js` must:

- require admin
- accept `projectId` and `finalDeliveryUrl`
- set project `finals_ready`
- if balance is zero, set `final_delivery_locked = false`, status `delivered`, and send final delivery email
- if balance is greater than zero, set status `balance_due` and send balance due email

- [ ] **Step 4: Add webhook balance handling**

Webhook handling must:

- parse `v2;balance;<project_id>` metadata
- create payment with purpose `balance`
- update project amount paid
- set `balance_due = 0`
- unlock final delivery when final URL exists
- send final delivery email

- [ ] **Step 5: Add UI**

Admin:

- field to paste final delivery link
- button to mark finals ready
- visible lock/balance state

Portal:

- balance payment button
- locked final notice
- final delivery link when unlocked

- [ ] **Step 6: Run checks**

Run:

```bash
npm test -- test/delivery-balance.test.js
npm test
npm run check:js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api/portal/pay-balance.js api/admin/delivery.js api/create-paypal-order.js api/webhooks/paypal.js lib/automation/studio-workflow.js portal.js admin.js test/delivery-balance.test.js package.json
git commit -m "feat: add balance payments and delivery lock"
```

---

## Task 13: Add Revision Rules

**Files:**
- Modify: `api/portal/revisions.js`
- Modify: `api/admin/projects.js`
- Modify: `admin.js`
- Modify: `portal.js`
- Test: `test/revisions.test.js`

- [ ] **Step 1: Write revision tests**

Create `test/revisions.test.js` covering:

- first included revision succeeds
- second revision fails when no extra revision is allowed
- admin can allow one extra revision
- extra revision succeeds after admin allowance

- [ ] **Step 2: Implement customer revision enforcement**

In `api/portal/revisions.js`:

- calculate `included_revisions + extra_revisions_allowed - used_revisions`
- reject when remaining revisions are `0`
- insert request
- increment `used_revisions`
- set status `revision_requested`

- [ ] **Step 3: Add admin extra revision action**

In `api/admin/projects.js`, support a PATCH action:

```json
{ "action": "allow_extra_revision", "projectId": "..." }
```

This increments `extra_revisions_allowed` and creates a project event.

- [ ] **Step 4: Update UI**

Portal shows remaining revisions. Admin shows used/included/extra revision counts and a button to allow one extra revision.

- [ ] **Step 5: Run checks**

Run:

```bash
npm test -- test/revisions.test.js
npm test
npm run check:js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/portal/revisions.js api/admin/projects.js admin.js portal.js test/revisions.test.js
git commit -m "feat: enforce project revision rules"
```

---

## Task 14: Add Follow-Up Cron Automation

**Files:**
- Create: `api/cron/followups.js`
- Modify: `lib/automation/studio-workflow.js`
- Modify: `vercel.json`
- Test: `test/followups.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write follow-up tests**

Create `test/followups.test.js` covering:

- missing files reminder selection
- quote reminder selection
- balance reminder selection
- approval reminder selection
- duplicate pending reminders are skipped
- request without `CRON_SECRET` is rejected

- [ ] **Step 2: Add follow-up selector and sender**

In `lib/automation/studio-workflow.js`, add:

- `selectDueFollowups(now, records)`
- `runFollowups({ now, records, email })`
- duplicate guard using `email_events` and `followup_jobs`

- [ ] **Step 3: Add protected cron route**

Create `api/cron/followups.js`.

It must:

- require `Authorization: Bearer ${CRON_SECRET}`
- run follow-up processing
- return `{ ok: true, sent, skipped, failed }`

- [ ] **Step 4: Add Vercel Cron**

Modify `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/followups",
      "schedule": "0 14 * * *"
    }
  ]
}
```

If `vercel.json` already has other properties, merge this property without deleting existing configuration.

- [ ] **Step 5: Run checks**

Run:

```bash
npm test -- test/followups.test.js
npm test
npm run check:js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/cron/followups.js lib/automation/studio-workflow.js vercel.json test/followups.test.js package.json
git commit -m "feat: add automated project followups"
```

---

## Task 15: Add Admin Retry And Operational Recovery

**Files:**
- Create: `api/admin/retry.js`
- Modify: `admin.js`
- Modify: `lib/automation/studio-workflow.js`
- Test: `test/admin-retry.test.js`

- [ ] **Step 1: Write retry tests**

Create `test/admin-retry.test.js` covering:

- retry Drive folder creation for a project without Drive IDs
- retry upload folder sharing
- resend last failed email type
- non-admin request rejected

- [ ] **Step 2: Implement retry endpoint**

`api/admin/retry.js` must:

- require admin
- accept action `drive_create`, `drive_share`, or `email_resend`
- create project event for success/failure
- return updated project or email event status

- [ ] **Step 3: Add admin UI retry controls**

In project detail:

- show Drive failure warnings
- show email failure warnings
- provide retry buttons
- update the panel after retry

- [ ] **Step 4: Run checks**

Run:

```bash
npm test -- test/admin-retry.test.js
npm test
npm run check:js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/admin/retry.js admin.js lib/automation/studio-workflow.js test/admin-retry.test.js
git commit -m "feat: add automation retry tools"
```

---

## Task 16: Final Verification

**Files:**
- No planned file changes. Only edit files when verification exposes a concrete defect.

- [ ] **Step 1: Run automated verification**

Run:

```bash
npm test
npm run check:js
```

Expected: PASS.

- [ ] **Step 2: Start local Vercel runtime**

Run:

```bash
npm run dev
```

Expected: Vercel dev server starts and prints a local URL.

- [ ] **Step 3: Browser smoke test**

Open the local URL and verify:

- homepage loads
- free review form submits to API with test/stub env or returns configured error cleanly
- `portal.html` loads
- magic-link form renders
- `admin.html` loads
- non-admin access is rejected by admin API when using a customer token
- checkout page still loads

- [ ] **Step 4: Server route smoke tests**

With real environment variables configured in a safe development environment:

- submit a free review
- confirm Supabase customer/lead/project rows exist
- confirm Drive folder is created
- confirm upload folder sharing is attempted
- confirm Resend email sends
- create a custom quote
- accept quote through PayPal sandbox
- verify project converts to paid
- mark finals ready with balance due and confirm delivery remains locked
- pay balance and confirm delivery unlocks

- [ ] **Step 5: Commit fixes only if needed**

If verification required fixes:

```bash
git add <changed-files>
git commit -m "fix: verify studio automation flow"
```

Expected: no unrelated files included.

---

## Execution Recommendation

Use **Subagent-Driven** execution by phase where possible:

- Foundation tasks can be handled independently: schema, Drive helper, Resend helper, auth helper.
- Portal/admin UI tasks should be handled after API contracts exist.
- PayPal/quote/balance tasks should be reviewed carefully because payment metadata and delivery lock behavior are high-risk.

Review after every committed task. Do not start the next phase until `npm test` and `npm run check:js` pass.
