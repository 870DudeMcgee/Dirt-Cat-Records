# Setup Wizard And Test Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Josh-only setup wizard with simulation and sandbox test modes, readable run reports, safe cleanup, and a reusable business-template runner.

**Architecture:** Add small backend modules under `lib/automation/` for business config, run reports, setup checks, test runners, and cleanup. Expose those modules through admin-only Vercel Functions under `api/admin/`, then add a static `admin.html`/`admin.js` wizard that consumes the reports.

**Tech Stack:** Static HTML/CSS/vanilla JS, Vercel Functions, Node CommonJS, Supabase REST, Google Drive REST, Resend REST, PayPal webhook parsing helpers, Node built-in test runner.

---

## Scope Check

This plan implements the setup wizard and test mode system only. It does not implement the full admin operations dashboard, quotes, final delivery, cron follow-ups, or multi-business SaaS accounts. The design is template-ready, but this deployment remains single-business and Josh-only.

## File Structure

- Modify: `supabase/schema.sql` - add `automation_test_runs` table and related grants/RLS posture.
- Modify: `package.json` - include new JS files in `check:js`.
- Modify: `style.css` - setup wizard and report styles.
- Create: `lib/automation/business-config.js` - redacted reusable business/provider configuration.
- Create: `lib/automation/test-report.js` - report builder, status aggregation, artifact tracking.
- Create: `lib/automation/setup-checks.js` - environment and provider readiness checks.
- Create: `lib/automation/test-mode-runner.js` - simulation and sandbox run orchestration.
- Create: `lib/automation/test-cleanup.js` - cleanup by `test_run_id`.
- Modify: `lib/db/studio-records.js` - add test-run persistence helpers.
- Create: `api/admin/setup.js` - admin-only setup status endpoint.
- Create: `api/admin/test-runs.js` - admin-only run/list/detail endpoint.
- Create: `api/admin/cleanup-test-run.js` - admin-only cleanup endpoint.
- Create: `admin.html` - Josh-only setup wizard shell.
- Create: `admin.js` - admin auth, setup checks, run actions, cleanup actions.
- Create tests:
  - `test/business-config.test.js`
  - `test/test-report.test.js`
  - `test/setup-checks.test.js`
  - `test/test-mode-runner.test.js`
  - `test/test-cleanup.test.js`
  - `test/admin-setup-api.test.js`
  - `test/admin-test-runs-api.test.js`

## Environment Variables

The wizard reads existing environment variables and adds no required secrets for simulation mode.

Optional test-specific variables:

```text
TEST_CUSTOMER_EMAIL
TEST_BUSINESS_NAME
TEST_EMAIL_RECIPIENT
```

If these are absent, sandbox mode should default to `ADMIN_EMAIL` for test emails and a generated customer alias only when the configured email provider can safely send to it.

---

## Task 1: Add Test Run Schema And Persistence

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `lib/db/studio-records.js`
- Test: `test/studio-records.test.js`

- [ ] **Step 1: Write failing persistence tests**

Append to `test/studio-records.test.js`:

```js
const {
  createAutomationTestRun,
  updateAutomationTestRun,
  getAutomationTestRun,
} = require('../lib/db/studio-records');

test('createAutomationTestRun stores a redacted report shell', async () => {
  const calls = [];
  const run = await createAutomationTestRun({
    id: 'test-run-1',
    mode: 'simulation',
    status: 'running',
    businessName: 'Dirt Cat Records',
    report: { steps: [] },
  }, {
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), body: JSON.parse(options.body) });
      return jsonResponse([{ id: 'test-run-1', mode: 'simulation', status: 'running' }]);
    },
  });

  assert.equal(run.id, 'test-run-1');
  assert.match(calls[0].url, /\/automation_test_runs\?select=/);
  assert.equal(calls[0].body.business_name, 'Dirt Cat Records');
  assert.deepEqual(calls[0].body.report, { steps: [] });
});

test('updateAutomationTestRun patches report and cleanup status', async () => {
  const calls = [];
  await updateAutomationTestRun('test-run-1', {
    status: 'passed',
    cleanupStatus: 'pending',
    report: { steps: [{ key: 'simulation', status: 'passed' }] },
    finishedAt: '2026-05-17T12:00:00.000Z',
  }, {
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), body: JSON.parse(options.body) });
      return jsonResponse([{ id: 'test-run-1', status: 'passed' }]);
    },
  });

  assert.match(calls[0].url, /id=eq\.test-run-1/);
  assert.equal(calls[0].body.cleanup_status, 'pending');
  assert.equal(calls[0].body.finished_at, '2026-05-17T12:00:00.000Z');
});

test('getAutomationTestRun returns null when run does not exist', async () => {
  const run = await getAutomationTestRun('missing-run', {
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async () => jsonResponse([]),
  });

  assert.equal(run, null);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/studio-records.test.js
```

Expected: FAIL because the three helper functions are not exported.

- [ ] **Step 3: Add schema**

Append to `supabase/schema.sql` near the operations tables:

```sql
create table if not exists public.automation_test_runs (
  id text primary key,
  mode text not null,
  status text not null,
  business_name text not null,
  report jsonb not null default '{}'::jsonb,
  cleanup_status text not null default 'not_requested',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_test_runs_mode_check check (mode in ('simulation', 'sandbox')),
  constraint automation_test_runs_status_check check (status in ('running', 'passed', 'failed', 'cleaned')),
  constraint automation_test_runs_cleanup_status_check check (cleanup_status in ('not_requested', 'pending', 'cleaned', 'failed'))
);

alter table public.automation_test_runs enable row level security;

grant all on public.automation_test_runs to service_role;
```

- [ ] **Step 4: Add record helpers**

In `lib/db/studio-records.js`, add:

```js
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
```

Export all three functions from `module.exports`.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- test/studio-records.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/schema.sql lib/db/studio-records.js test/studio-records.test.js
git commit -m "feat: persist automation test runs"
```

---

## Task 2: Add Business Config Helper

**Files:**
- Create: `lib/automation/business-config.js`
- Create: `test/business-config.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

Create `test/business-config.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getBusinessConfig,
  redactBusinessConfig,
} = require('../lib/automation/business-config');

test('getBusinessConfig builds template-ready Dirt Cat defaults', () => {
  const config = getBusinessConfig({
    ADMIN_EMAIL: 'josh@example.com',
    SITE_URL: 'https://dirtcatrecords.com',
    RESEND_REPLY_TO_EMAIL: 'studio@example.com',
  });

  assert.equal(config.businessName, 'Dirt Cat Records');
  assert.equal(config.adminEmail, 'josh@example.com');
  assert.equal(config.siteUrl, 'https://dirtcatrecords.com');
  assert.equal(config.testPrefix, '[TEST]');
  assert.equal(config.driveFolderPrefix, 'TEST');
  assert.deepEqual(config.providers, {
    database: 'supabase',
    storage: 'google_drive',
    email: 'resend',
    payments: 'paypal',
    auth: 'supabase_magic_link',
  });
});

test('redactBusinessConfig exposes presence but not secrets', () => {
  const redacted = redactBusinessConfig(getBusinessConfig({
    ADMIN_EMAIL: 'josh@example.com',
    SITE_URL: 'https://dirtcatrecords.com',
    SUPABASE_SERVICE_ROLE_KEY: 'service-secret',
    PAYPAL_CLIENT_SECRET: 'paypal-secret',
  }));

  assert.equal(redacted.secrets.SUPABASE_SERVICE_ROLE_KEY.present, true);
  assert.equal(redacted.secrets.SUPABASE_SERVICE_ROLE_KEY.value, undefined);
  assert.equal(redacted.secrets.PAYPAL_CLIENT_SECRET.present, true);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/business-config.test.js
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement helper**

Create `lib/automation/business-config.js`:

```js
const SECRET_KEYS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REFRESH_TOKEN',
  'RESEND_API_KEY',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_WEBHOOK_ID',
];

function getBusinessConfig(env = process.env) {
  return {
    businessName: env.TEST_BUSINESS_NAME || 'Dirt Cat Records',
    adminEmail: env.ADMIN_EMAIL || null,
    siteUrl: (env.SITE_URL || 'https://dirtcatrecords.com').replace(/\/$/, ''),
    replyToEmail: env.RESEND_REPLY_TO_EMAIL || env.ADMIN_EMAIL || null,
    testEmailRecipient: env.TEST_EMAIL_RECIPIENT || env.ADMIN_EMAIL || null,
    testCustomerEmail: env.TEST_CUSTOMER_EMAIL || env.ADMIN_EMAIL || null,
    testPrefix: env.TEST_SUBJECT_PREFIX || '[TEST]',
    driveFolderPrefix: env.TEST_DRIVE_FOLDER_PREFIX || 'TEST',
    providers: {
      database: 'supabase',
      storage: 'google_drive',
      email: 'resend',
      payments: 'paypal',
      auth: 'supabase_magic_link',
    },
    env,
  };
}

function redactBusinessConfig(config) {
  const env = config.env || {};
  return {
    businessName: config.businessName,
    adminEmail: config.adminEmail,
    siteUrl: config.siteUrl,
    replyToEmail: config.replyToEmail,
    testEmailRecipient: config.testEmailRecipient,
    testCustomerEmail: config.testCustomerEmail,
    testPrefix: config.testPrefix,
    driveFolderPrefix: config.driveFolderPrefix,
    providers: config.providers,
    secrets: Object.fromEntries(SECRET_KEYS.map((key) => [key, { present: Boolean(env[key]) }])),
  };
}

module.exports = {
  getBusinessConfig,
  redactBusinessConfig,
};
```

- [ ] **Step 4: Update syntax check**

Add `node --check lib/automation/business-config.js` to `package.json` `check:js`.

- [ ] **Step 5: Run checks**

Run:

```bash
npm test -- test/business-config.test.js
npm run check:js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/automation/business-config.js test/business-config.test.js package.json
git commit -m "feat: add business setup config"
```

---

## Task 3: Add Test Report Builder

**Files:**
- Create: `lib/automation/test-report.js`
- Create: `test/test-report.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

Create `test/test-report.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createTestRunId,
  createTestReport,
  addStep,
  addArtifact,
  finishReport,
} = require('../lib/automation/test-report');

test('createTestRunId creates traceable run ids', () => {
  assert.match(createTestRunId('simulation'), /^simulation-\d{8}T\d{6}-[a-z0-9]{6}$/);
});

test('test report aggregates failed steps and artifacts', () => {
  let report = createTestReport({
    id: 'simulation-20260517T120000-abc123',
    mode: 'simulation',
    businessName: 'Dirt Cat Records',
    config: { businessName: 'Dirt Cat Records' },
  });

  report = addStep(report, { key: 'database', label: 'Database', status: 'passed' });
  report = addStep(report, { key: 'email', label: 'Email', status: 'failed', error: 'RESEND_API_KEY missing' });
  report = addArtifact(report, { type: 'supabase', table: 'projects', id: 'project-1' });
  report = finishReport(report);

  assert.equal(report.status, 'failed');
  assert.equal(report.errors[0], 'RESEND_API_KEY missing');
  assert.equal(report.createdRecords[0].id, 'project-1');
  assert.ok(report.finishedAt);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/test-report.test.js
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement report builder**

Create `lib/automation/test-report.js`:

```js
const { randomBytes } = require('node:crypto');

function createTestRunId(mode, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '');
  return `${mode}-${stamp}-${randomBytes(3).toString('hex')}`;
}

function createTestReport({ id, mode, businessName, config }) {
  const startedAt = new Date().toISOString();
  return {
    id,
    mode,
    status: 'running',
    businessName,
    startedAt,
    finishedAt: null,
    config,
    steps: [],
    createdRecords: [],
    createdDriveFolders: [],
    sentEmails: [],
    paypalEvents: [],
    warnings: [],
    errors: [],
    cleanupStatus: 'not_requested',
  };
}

function addStep(report, step) {
  const next = cloneReport(report);
  next.steps.push({
    key: step.key,
    label: step.label,
    status: step.status,
    detail: step.detail || null,
    error: step.error || null,
  });
  if (step.status === 'failed' && step.error) next.errors.push(step.error);
  if (step.warning) next.warnings.push(step.warning);
  return next;
}

function addArtifact(report, artifact) {
  const next = cloneReport(report);
  if (artifact.type === 'drive') next.createdDriveFolders.push(artifact);
  else if (artifact.type === 'email') next.sentEmails.push(artifact);
  else if (artifact.type === 'paypal') next.paypalEvents.push(artifact);
  else next.createdRecords.push(artifact);
  return next;
}

function finishReport(report) {
  const next = cloneReport(report);
  next.finishedAt = new Date().toISOString();
  next.status = next.steps.some((step) => step.status === 'failed') ? 'failed' : 'passed';
  return next;
}

function markCleanup(report, cleanupStatus) {
  const next = cloneReport(report);
  next.cleanupStatus = cleanupStatus;
  if (cleanupStatus === 'cleaned') next.status = 'cleaned';
  return next;
}

function cloneReport(report) {
  return JSON.parse(JSON.stringify(report));
}

module.exports = {
  addArtifact,
  addStep,
  createTestReport,
  createTestRunId,
  finishReport,
  markCleanup,
};
```

- [ ] **Step 4: Update syntax check**

Add `node --check lib/automation/test-report.js` to `package.json`.

- [ ] **Step 5: Run checks**

Run:

```bash
npm test -- test/test-report.test.js
npm run check:js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/automation/test-report.js test/test-report.test.js package.json
git commit -m "feat: add automation test reports"
```

---

## Task 4: Add Setup Readiness Checks

**Files:**
- Create: `lib/automation/setup-checks.js`
- Create: `test/setup-checks.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

Create `test/setup-checks.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  runSetupChecks,
} = require('../lib/automation/setup-checks');

test('runSetupChecks reports missing env without exposing secrets', async () => {
  const report = await runSetupChecks({
    env: { ADMIN_EMAIL: 'josh@example.com' },
    providers: {
      database: { check: async () => ({ status: 'skipped', detail: 'not configured' }) },
      storage: { check: async () => ({ status: 'skipped', detail: 'not configured' }) },
      email: { check: async () => ({ status: 'skipped', detail: 'not configured' }) },
      payments: { check: async () => ({ status: 'skipped', detail: 'not configured' }) },
      portal: { check: async () => ({ status: 'skipped', detail: 'not configured' }) },
    },
  });

  assert.equal(report.overallStatus, 'failed');
  assert.equal(report.sections.database.requiredEnv.SUPABASE_URL.present, false);
  assert.equal(report.sections.database.requiredEnv.SUPABASE_SERVICE_ROLE_KEY.value, undefined);
});

test('runSetupChecks includes provider check results', async () => {
  const report = await runSetupChecks({
    env: {
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      SUPABASE_PUBLIC_KEY: 'public-key',
      GOOGLE_CLIENT_ID: 'google-id',
      GOOGLE_CLIENT_SECRET: 'google-secret',
      GOOGLE_REFRESH_TOKEN: 'refresh-token',
      GOOGLE_DRIVE_PROJECTS_FOLDER_ID: 'folder-id',
      RESEND_API_KEY: 'resend-key',
      RESEND_FROM_EMAIL: 'Dirt Cat <studio@example.com>',
      PAYPAL_CLIENT_ID: 'paypal-id',
      PAYPAL_CLIENT_SECRET: 'paypal-secret',
      PAYPAL_WEBHOOK_ID: 'webhook-id',
      ADMIN_EMAIL: 'josh@example.com',
    },
    providers: allPassingProviders(),
  });

  assert.equal(report.overallStatus, 'passed');
  assert.equal(report.sections.storage.provider.status, 'passed');
});

function allPassingProviders() {
  return {
    database: { check: async () => ({ status: 'passed', detail: 'database ready' }) },
    storage: { check: async () => ({ status: 'passed', detail: 'drive ready' }) },
    email: { check: async () => ({ status: 'passed', detail: 'email ready' }) },
    payments: { check: async () => ({ status: 'passed', detail: 'payments ready' }) },
    portal: { check: async () => ({ status: 'passed', detail: 'portal ready' }) },
  };
}
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/setup-checks.test.js
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement setup checks**

Create `lib/automation/setup-checks.js` with:

```js
const SECTION_ENV = {
  database: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_PUBLIC_KEY'],
  storage: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_DRIVE_PROJECTS_FOLDER_ID'],
  email: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'RESEND_REPLY_TO_EMAIL'],
  payments: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID'],
  portal: ['SUPABASE_URL', 'SUPABASE_PUBLIC_KEY', 'ADMIN_EMAIL'],
};

async function runSetupChecks({ env = process.env, providers = defaultProviders() } = {}) {
  const sections = {};
  for (const [section, keys] of Object.entries(SECTION_ENV)) {
    const requiredEnv = Object.fromEntries(keys.map((key) => [key, { present: Boolean(env[key]) }]));
    const envReady = Object.values(requiredEnv).every((item) => item.present);
    const provider = await runProviderCheck(providers[section]);
    sections[section] = {
      status: envReady && provider.status !== 'failed' ? provider.status : 'failed',
      requiredEnv,
      provider,
    };
  }
  const overallStatus = Object.values(sections).every((section) => section.status === 'passed' || section.status === 'skipped')
    ? 'passed'
    : 'failed';
  return { overallStatus, sections };
}

async function runProviderCheck(provider) {
  if (!provider || typeof provider.check !== 'function') return { status: 'skipped', detail: 'No provider check configured.' };
  try {
    return await provider.check();
  } catch (error) {
    return { status: 'failed', error: error.message };
  }
}

function defaultProviders() {
  return {
    database: { check: async () => ({ status: 'skipped', detail: 'Database live check is run by sandbox mode.' }) },
    storage: { check: async () => ({ status: 'skipped', detail: 'Drive live check is run by sandbox mode.' }) },
    email: { check: async () => ({ status: 'skipped', detail: 'Email live check is run by sandbox mode.' }) },
    payments: { check: async () => ({ status: 'skipped', detail: 'Payment live check is run by sandbox mode.' }) },
    portal: { check: async () => ({ status: 'skipped', detail: 'Portal live check is run by sandbox mode.' }) },
  };
}

module.exports = {
  runSetupChecks,
};
```

- [ ] **Step 4: Update syntax check**

Add `node --check lib/automation/setup-checks.js` to `package.json`.

- [ ] **Step 5: Run checks**

Run:

```bash
npm test -- test/setup-checks.test.js
npm run check:js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/automation/setup-checks.js test/setup-checks.test.js package.json
git commit -m "feat: add setup readiness checks"
```

---

## Task 5: Add Simulation Test Runner

**Files:**
- Create: `lib/automation/test-mode-runner.js`
- Create: `test/test-mode-runner.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing simulation tests**

Create `test/test-mode-runner.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  runAutomationTest,
} = require('../lib/automation/test-mode-runner');

test('runAutomationTest simulation uses fake providers and creates no external artifacts', async () => {
  const persisted = [];
  const result = await runAutomationTest({
    mode: 'simulation',
    env: { ADMIN_EMAIL: 'josh@example.com', SITE_URL: 'https://dirtcatrecords.com' },
    records: {
      createAutomationTestRun: async (input) => { persisted.push({ type: 'create', input }); return input; },
      updateAutomationTestRun: async (_id, patch) => { persisted.push({ type: 'update', patch }); return patch; },
    },
  });

  assert.equal(result.report.mode, 'simulation');
  assert.equal(result.report.status, 'passed');
  assert.equal(result.report.createdDriveFolders.length, 0);
  assert.ok(result.report.steps.some((step) => step.key === 'free_review_workflow'));
  assert.ok(result.report.steps.some((step) => step.key === 'paid_project_workflow'));
  assert.equal(persisted[0].input.mode, 'simulation');
});

test('runAutomationTest rejects unsupported modes', async () => {
  await assert.rejects(() => runAutomationTest({ mode: 'live' }), /Unsupported automation test mode/);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/test-mode-runner.test.js
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement simulation runner**

Create `lib/automation/test-mode-runner.js`:

```js
const recordsDefault = require('../db/studio-records');
const { getBusinessConfig, redactBusinessConfig } = require('./business-config');
const {
  addArtifact,
  addStep,
  createTestReport,
  createTestRunId,
  finishReport,
} = require('./test-report');
const {
  createFreeReviewWorkflow,
  createPaidProjectWorkflow,
} = require('./studio-workflow');

async function runAutomationTest(options = {}) {
  const mode = options.mode;
  if (!['simulation', 'sandbox'].includes(mode)) throw new Error(`Unsupported automation test mode: ${mode}`);
  if (mode === 'sandbox') return runSandboxAutomationTest(options);
  return runSimulationAutomationTest(options);
}

async function runSimulationAutomationTest(options = {}) {
  const env = options.env || process.env;
  const config = getBusinessConfig(env);
  const records = options.records || recordsDefault;
  const id = options.testRunId || createTestRunId('simulation');
  let report = createTestReport({
    id,
    mode: 'simulation',
    businessName: config.businessName,
    config: redactBusinessConfig(config),
  });

  await maybeCreateRun(records, report);

  try {
    const calls = [];
    const fakeRecords = createFakeRecords(calls);
    const fakeDrive = { createDriveProjectFolders: async () => ({ projectFolderId: 'sim-project', projectFolderUrl: 'sim://project', uploadFolderId: 'sim-upload', uploadFolderUrl: 'sim://upload', finalsFolderId: 'sim-finals', finalsFolderUrl: 'sim://finals' }) };
    const fakeEmail = { sendCustomerEmail: async () => calls.push({ type: 'email.customer' }), sendAdminEmail: async () => calls.push({ type: 'email.admin' }) };

    await createFreeReviewWorkflow({ records: fakeRecords, drive: fakeDrive, email: fakeEmail, env })({
      email: config.testCustomerEmail || config.adminEmail,
      name: 'Test Customer',
      artistName: `${config.testPrefix} Artist`,
      projectTitle: `${config.testPrefix} Free Review`,
      message: 'Simulation free review.',
      referenceLinks: ['https://example.com/test-track'],
    });
    report = addStep(report, { key: 'free_review_workflow', label: 'Free review workflow', status: 'passed' });

    await createPaidProjectWorkflow({ records: fakeRecords, drive: fakeDrive, email: fakeEmail, env })({
      paypalTxnId: `${id}-capture`,
      buyerEmail: config.testCustomerEmail || config.adminEmail,
      buyerName: 'Test Customer',
      status: 'paid',
      totalAmount: '199.00',
      amountDueNow: '199.00',
      remainingBalance: '0.00',
      orderSummary: { baseServiceId: 'mixMaster', songCount: 1, paymentMode: 'full' },
    });
    report = addStep(report, { key: 'paid_project_workflow', label: 'Paid project workflow', status: 'passed' });
    report = addArtifact(report, { type: 'simulation', id: `${id}-workflow`, detail: `${calls.length} fake provider calls` });
  } catch (error) {
    report = addStep(report, { key: 'simulation', label: 'Simulation run', status: 'failed', error: error.message });
  }

  report = finishReport(report);
  await maybeUpdateRun(records, id, report);
  return { id, report };
}

async function runSandboxAutomationTest() {
  throw new Error('Sandbox automation test requires Task 6.');
}

async function maybeCreateRun(records, report) {
  if (typeof records.createAutomationTestRun !== 'function') return;
  await records.createAutomationTestRun({
    id: report.id,
    mode: report.mode,
    status: report.status,
    businessName: report.businessName,
    report,
    startedAt: report.startedAt,
  });
}

async function maybeUpdateRun(records, id, report) {
  if (typeof records.updateAutomationTestRun !== 'function') return;
  await records.updateAutomationTestRun(id, {
    status: report.status,
    report,
    finishedAt: report.finishedAt,
  });
}

function createFakeRecords(calls) {
  return {
    upsertCustomer: async (input) => ({ id: 'sim-customer', email: input.email, name: input.name || null }),
    createLead: async () => ({ id: 'sim-lead' }),
    createProject: async (input) => ({ id: 'sim-project', project_code: 'TEST-000001', status: input.status }),
    updateProject: async (_id, patch) => ({ id: 'sim-project', project_code: 'TEST-000001', status: 'awaiting_files', ...patch }),
    createProjectEvent: async (event) => { calls.push({ type: 'event', event }); return { id: `sim-event-${calls.length}` }; },
    upsertPaymentAndOrder: async () => ({ order: { id: 'sim-order' }, payment: { id: 'sim-payment' } }),
    getProjectById: async () => null,
    getProjectByOrderId: async () => null,
    linkOrderPaymentToProject: async () => calls.push({ type: 'link.project' }),
  };
}

module.exports = {
  runAutomationTest,
  runSimulationAutomationTest,
};
```

- [ ] **Step 4: Update syntax check**

Add `node --check lib/automation/test-mode-runner.js` to `package.json`.

- [ ] **Step 5: Run checks**

Run:

```bash
npm test -- test/test-mode-runner.test.js test/studio-workflow.test.js
npm run check:js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/automation/test-mode-runner.js test/test-mode-runner.test.js package.json
git commit -m "feat: add simulation automation test runner"
```

---

## Task 6: Add Sandbox Test Runner

**Files:**
- Modify: `lib/automation/test-mode-runner.js`
- Modify: `test/test-mode-runner.test.js`

- [ ] **Step 1: Write failing sandbox tests**

Append to `test/test-mode-runner.test.js`:

```js
test('runAutomationTest sandbox creates marked artifacts through real adapters', async () => {
  const calls = [];
  const result = await runAutomationTest({
    mode: 'sandbox',
    testRunId: 'sandbox-20260517T120000-abc123',
    env: {
      ADMIN_EMAIL: 'josh@example.com',
      TEST_CUSTOMER_EMAIL: 'test@example.com',
      SITE_URL: 'https://dirtcatrecords.com',
    },
    records: sandboxRecords(calls),
    drive: {
      createDriveProjectFolders: async (input) => {
        calls.push({ type: 'drive', input });
        return {
          projectFolderId: 'drive-project',
          projectFolderUrl: 'https://drive.test/project',
          uploadFolderId: 'drive-upload',
          uploadFolderUrl: 'https://drive.test/upload',
          finalsFolderId: 'drive-finals',
          finalsFolderUrl: 'https://drive.test/finals',
        };
      },
    },
    email: {
      sendCustomerEmail: async (to, emailType) => calls.push({ type: 'email.customer', to, emailType }),
      sendAdminEmail: async (subject) => calls.push({ type: 'email.admin', subject }),
    },
  });

  assert.equal(result.report.mode, 'sandbox');
  assert.equal(result.report.status, 'passed');
  assert.ok(result.report.createdRecords.some((record) => record.table === 'projects'));
  assert.ok(result.report.createdDriveFolders.some((folder) => folder.id === 'drive-project'));
  assert.equal(calls.find((call) => call.type === 'drive').input.artistName.includes('[TEST]'), true);
});

function sandboxRecords(calls) {
  return {
    createAutomationTestRun: async (input) => input,
    updateAutomationTestRun: async (_id, patch) => patch,
    upsertCustomer: async (input) => ({ id: 'customer-1', email: input.email, name: input.name }),
    createLead: async () => ({ id: 'lead-1' }),
    createProject: async (input) => {
      calls.push({ type: 'project', input });
      return { id: `project-${calls.filter((call) => call.type === 'project').length}`, project_code: 'TEST-000001', status: input.status };
    },
    updateProject: async (id, patch) => ({ id, project_code: 'TEST-000001', status: 'awaiting_files', ...patch }),
    createProjectEvent: async (event) => { calls.push({ type: 'event', event }); return { id: 'event-1' }; },
    upsertPaymentAndOrder: async () => ({ order: { id: 'order-1' }, payment: { id: 'payment-1' } }),
    getProjectById: async () => null,
    getProjectByOrderId: async () => null,
    linkOrderPaymentToProject: async () => {},
  };
}
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/test-mode-runner.test.js
```

Expected: FAIL with `Sandbox automation test requires Task 6.`

- [ ] **Step 3: Implement sandbox runner**

In `lib/automation/test-mode-runner.js`, implement `runSandboxAutomationTest(options)`:

```js
async function runSandboxAutomationTest(options = {}) {
  const env = options.env || process.env;
  const config = getBusinessConfig(env);
  const records = options.records || recordsDefault;
  const drive = options.drive;
  const email = options.email;
  const id = options.testRunId || createTestRunId('sandbox');
  let report = createTestReport({
    id,
    mode: 'sandbox',
    businessName: config.businessName,
    config: redactBusinessConfig(config),
  });

  await maybeCreateRun(records, report);

  try {
    const testEmail = config.testCustomerEmail || config.adminEmail;
    const freeReviewResult = await createFreeReviewWorkflow({ records, drive, email, env })({
      email: testEmail,
      name: `${config.testPrefix} Test Customer`,
      artistName: `${config.testPrefix} Artist ${id}`,
      projectTitle: `${config.testPrefix} Free Review ${id}`,
      message: `Sandbox free review for ${id}.`,
      referenceLinks: ['https://example.com/test-track'],
    });
    report = addStep(report, { key: 'sandbox_free_review', label: 'Sandbox free review', status: 'passed' });
    report = addArtifact(report, { type: 'supabase', table: 'projects', id: freeReviewResult.project.id });
    report = addDriveArtifacts(report, freeReviewResult.project);

    const paidResult = await createPaidProjectWorkflow({ records, drive, email, env })({
      paypalTxnId: `${id}-capture`,
      paypalOrderId: `${id}-paypal-order`,
      buyerEmail: testEmail,
      buyerName: `${config.testPrefix} Test Customer`,
      status: 'paid',
      totalAmount: '199.00',
      amountDueNow: '199.00',
      remainingBalance: '0.00',
      artistName: `${config.testPrefix} Paid Artist ${id}`,
      projectTitle: `${config.testPrefix} Paid Project ${id}`,
      orderSummary: { baseServiceId: 'mixMaster', songCount: 1, paymentMode: 'full' },
      rawPayload: { test_run_id: id },
    });
    report = addStep(report, { key: 'sandbox_paid_project', label: 'Sandbox paid project', status: 'passed' });
    report = addArtifact(report, { type: 'supabase', table: 'projects', id: paidResult.project.id });
    report = addArtifact(report, { type: 'paypal', id: `${id}-capture`, detail: 'sandbox-like paid project event' });
    report = addDriveArtifacts(report, paidResult.project);
  } catch (error) {
    report = addStep(report, { key: 'sandbox', label: 'Sandbox run', status: 'failed', error: error.message });
  }

  report = finishReport(report);
  await maybeUpdateRun(records, id, report);
  return { id, report };
}

function addDriveArtifacts(report, project) {
  let next = report;
  [
    ['project', project.drive_project_folder_id, project.drive_project_folder_url],
    ['upload', project.drive_upload_folder_id, project.drive_upload_folder_url],
    ['finals', project.drive_finals_folder_id, project.drive_finals_folder_url],
  ].forEach(([folderType, folderId, folderUrl]) => {
    if (folderId) next = addArtifact(next, { type: 'drive', folderType, id: folderId, url: folderUrl || null });
  });
  return next;
}
```

- [ ] **Step 4: Run checks**

Run:

```bash
npm test -- test/test-mode-runner.test.js test/studio-workflow.test.js
npm run check:js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/automation/test-mode-runner.js test/test-mode-runner.test.js
git commit -m "feat: add sandbox automation test runner"
```

---

## Task 7: Add Test Cleanup

**Files:**
- Create: `lib/automation/test-cleanup.js`
- Create: `test/test-cleanup.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing cleanup tests**

Create `test/test-cleanup.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  cleanupAutomationTestRun,
} = require('../lib/automation/test-cleanup');

test('cleanupAutomationTestRun refuses missing test_run_id', async () => {
  await assert.rejects(() => cleanupAutomationTestRun({ report: { id: '' } }), /test_run_id is required/);
});

test('cleanupAutomationTestRun deletes drive folders and marks run cleaned', async () => {
  const calls = [];
  const result = await cleanupAutomationTestRun({
    report: {
      id: 'sandbox-20260517T120000-abc123',
      createdDriveFolders: [{ id: 'folder-1' }],
      createdRecords: [{ table: 'projects', id: 'project-1' }],
    },
    records: {
      updateProject: async (id, patch) => calls.push({ type: 'project', id, patch }),
      updateAutomationTestRun: async (id, patch) => calls.push({ type: 'run', id, patch }),
    },
    drive: {
      deleteDriveFolder: async (id) => calls.push({ type: 'drive.delete', id }),
    },
  });

  assert.equal(result.cleanupStatus, 'cleaned');
  assert.deepEqual(calls.find((call) => call.type === 'drive.delete'), { type: 'drive.delete', id: 'folder-1' });
  assert.equal(calls.find((call) => call.type === 'project').patch.status, 'closed');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- test/test-cleanup.test.js
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement cleanup**

Create `lib/automation/test-cleanup.js`:

```js
const recordsDefault = require('../db/studio-records');
const driveDefault = require('../google/drive');
const { markCleanup } = require('./test-report');

async function cleanupAutomationTestRun({ report, records = recordsDefault, drive = driveDefault } = {}) {
  if (!report?.id) throw new Error('test_run_id is required for cleanup.');
  const errors = [];

  for (const folder of report.createdDriveFolders || []) {
    if (!folder.id || typeof drive.deleteDriveFolder !== 'function') continue;
    try {
      await drive.deleteDriveFolder(folder.id);
    } catch (error) {
      errors.push(`Drive folder ${folder.id}: ${error.message}`);
    }
  }

  for (const record of report.createdRecords || []) {
    if (record.table !== 'projects' || !record.id || typeof records.updateProject !== 'function') continue;
    try {
      await records.updateProject(record.id, { status: 'closed', final_delivery_locked: true });
    } catch (error) {
      errors.push(`Project ${record.id}: ${error.message}`);
    }
  }

  const cleanupStatus = errors.length ? 'failed' : 'cleaned';
  const cleanedReport = markCleanup({ ...report, errors: [...(report.errors || []), ...errors] }, cleanupStatus);
  if (typeof records.updateAutomationTestRun === 'function') {
    await records.updateAutomationTestRun(report.id, {
      status: cleanupStatus === 'cleaned' ? 'cleaned' : report.status || 'failed',
      cleanupStatus,
      report: cleanedReport,
    });
  }
  return cleanedReport;
}

module.exports = {
  cleanupAutomationTestRun,
};
```

- [ ] **Step 4: Add Drive delete helper**

Add to `lib/google/drive.js`:

```js
async function deleteDriveFolder(folderId, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const env = options.env || process.env;
  const accessToken = await getGoogleAccessToken({ fetchImpl, env });
  const response = await fetchImpl(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Unable to delete Drive folder: ${response.status}`);
  }
}
```

Export `deleteDriveFolder`.

- [ ] **Step 5: Update syntax check**

Add `node --check lib/automation/test-cleanup.js` to `package.json`.

- [ ] **Step 6: Run checks**

Run:

```bash
npm test -- test/test-cleanup.test.js test/google-drive.test.js
npm run check:js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/automation/test-cleanup.js lib/google/drive.js test/test-cleanup.test.js package.json
git commit -m "feat: add automation test cleanup"
```

---

## Task 8: Add Admin Setup And Test APIs

**Files:**
- Create: `api/admin/setup.js`
- Create: `api/admin/test-runs.js`
- Create: `api/admin/cleanup-test-run.js`
- Create: `test/admin-setup-api.test.js`
- Create: `test/admin-test-runs-api.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing admin setup endpoint tests**

Create `test/admin-setup-api.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSetupHandler } = require('../api/admin/setup');

test('setup endpoint rejects non-admin users', async () => {
  const handler = createSetupHandler({
    requireAdminImpl: async () => {
      const error = new Error('Admin access required.');
      error.statusCode = 403;
      throw error;
    },
  });
  const res = response();

  await handler({ method: 'GET', headers: {} }, res);

  assert.equal(res.statusCode, 403);
});

test('setup endpoint returns readiness report for admin', async () => {
  const handler = createSetupHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
    runSetupChecksImpl: async () => ({ overallStatus: 'passed', sections: {} }),
    env: { ADMIN_EMAIL: 'josh@example.com' },
  });
  const res = response();

  await handler({ method: 'GET', headers: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.setup.overallStatus, 'passed');
});

function response() {
  return {
    statusCode: 0,
    body: undefined,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}
```

- [ ] **Step 2: Write failing test run endpoint tests**

Create `test/admin-test-runs-api.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestRunsHandler } = require('../api/admin/test-runs');
const { createCleanupTestRunHandler } = require('../api/admin/cleanup-test-run');

test('test-runs endpoint starts simulation runs for admin', async () => {
  const handler = createTestRunsHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
    runAutomationTestImpl: async (input) => ({ id: 'simulation-run', report: { mode: input.mode, status: 'passed' } }),
  });
  const res = response();

  await handler({ method: 'POST', headers: {}, body: JSON.stringify({ mode: 'simulation' }) }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.report.status, 'passed');
});

test('cleanup endpoint cleans a stored test run for admin', async () => {
  const handler = createCleanupTestRunHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
    records: { getAutomationTestRun: async () => ({ report: { id: 'run-1', createdDriveFolders: [], createdRecords: [] } }) },
    cleanupAutomationTestRunImpl: async ({ report }) => ({ ...report, cleanupStatus: 'cleaned' }),
  });
  const res = response();

  await handler({ method: 'POST', headers: {}, body: JSON.stringify({ testRunId: 'run-1' }) }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.report.cleanupStatus, 'cleaned');
});

function response() {
  return {
    statusCode: 0,
    body: undefined,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
npm test -- test/admin-setup-api.test.js test/admin-test-runs-api.test.js
```

Expected: FAIL because endpoints do not exist.

- [ ] **Step 4: Implement setup endpoint**

Create `api/admin/setup.js`:

```js
const { requireAdmin } = require('../../lib/auth/supabase-auth');
const { methodNotAllowed, sendJson } = require('../../lib/http/json');
const { runSetupChecks } = require('../../lib/automation/setup-checks');

function createSetupHandler(dependencies = {}) {
  const requireAdminImpl = dependencies.requireAdminImpl || requireAdmin;
  const runSetupChecksImpl = dependencies.runSetupChecksImpl || runSetupChecks;
  const env = dependencies.env || process.env;

  return async function setupHandler(req, res) {
    if (req.method !== 'GET') return methodNotAllowed(res);
    try {
      await requireAdminImpl(req, { env });
      const setup = await runSetupChecksImpl({ env });
      return sendJson(res, 200, { setup });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, { error: error.statusCode ? error.message : 'Unable to load setup status.' });
    }
  };
}

const handler = createSetupHandler();
module.exports = handler;
module.exports.createSetupHandler = createSetupHandler;
```

- [ ] **Step 5: Implement test run endpoint**

Create `api/admin/test-runs.js`:

```js
const { requireAdmin } = require('../../lib/auth/supabase-auth');
const { methodNotAllowed, readJsonBody, sendJson } = require('../../lib/http/json');
const { runAutomationTest } = require('../../lib/automation/test-mode-runner');

function createTestRunsHandler(dependencies = {}) {
  const requireAdminImpl = dependencies.requireAdminImpl || requireAdmin;
  const runAutomationTestImpl = dependencies.runAutomationTestImpl || runAutomationTest;
  const env = dependencies.env || process.env;

  return async function testRunsHandler(req, res) {
    if (req.method !== 'POST') return methodNotAllowed(res);
    try {
      await requireAdminImpl(req, { env });
      const body = await readJsonBody(req);
      const mode = body.mode === 'sandbox' ? 'sandbox' : 'simulation';
      const result = await runAutomationTestImpl({ mode, env });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, error.statusCode || 500, { error: error.statusCode ? error.message : 'Unable to run automation test.' });
    }
  };
}

const handler = createTestRunsHandler();
module.exports = handler;
module.exports.createTestRunsHandler = createTestRunsHandler;
```

- [ ] **Step 6: Implement cleanup endpoint**

Create `api/admin/cleanup-test-run.js`:

```js
const { requireAdmin } = require('../../lib/auth/supabase-auth');
const { methodNotAllowed, readJsonBody, sendJson } = require('../../lib/http/json');
const recordsDefault = require('../../lib/db/studio-records');
const { cleanupAutomationTestRun } = require('../../lib/automation/test-cleanup');

function createCleanupTestRunHandler(dependencies = {}) {
  const requireAdminImpl = dependencies.requireAdminImpl || requireAdmin;
  const records = dependencies.records || recordsDefault;
  const cleanupAutomationTestRunImpl = dependencies.cleanupAutomationTestRunImpl || cleanupAutomationTestRun;
  const env = dependencies.env || process.env;

  return async function cleanupTestRunHandler(req, res) {
    if (req.method !== 'POST') return methodNotAllowed(res);
    try {
      await requireAdminImpl(req, { env });
      const body = await readJsonBody(req);
      if (!body.testRunId) return sendJson(res, 400, { error: 'testRunId is required.' });
      const run = await records.getAutomationTestRun(body.testRunId);
      if (!run) return sendJson(res, 404, { error: 'Test run not found.' });
      const report = await cleanupAutomationTestRunImpl({ report: run.report, records });
      return sendJson(res, 200, { report });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, { error: error.statusCode ? error.message : 'Unable to clean up test run.' });
    }
  };
}

const handler = createCleanupTestRunHandler();
module.exports = handler;
module.exports.createCleanupTestRunHandler = createCleanupTestRunHandler;
```

- [ ] **Step 7: Update syntax check**

Add these to `package.json` `check:js`:

```bash
node --check api/admin/setup.js
node --check api/admin/test-runs.js
node --check api/admin/cleanup-test-run.js
```

- [ ] **Step 8: Run checks**

Run:

```bash
npm test -- test/admin-setup-api.test.js test/admin-test-runs-api.test.js
npm run check:js
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add api/admin/setup.js api/admin/test-runs.js api/admin/cleanup-test-run.js test/admin-setup-api.test.js test/admin-test-runs-api.test.js package.json
git commit -m "feat: add admin setup test APIs"
```

---

## Task 9: Add Admin Setup Wizard UI

**Files:**
- Create: `admin.html`
- Create: `admin.js`
- Modify: `style.css`
- Modify: `package.json`

- [ ] **Step 1: Create admin HTML shell**

Create `admin.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dirt Cat Records Admin</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="admin-shell">
    <section class="admin-header">
      <div>
        <p class="eyebrow">Owner setup</p>
        <h1>Automation Setup</h1>
      </div>
      <button class="btn btn-secondary" id="admin-refresh" type="button">Refresh</button>
    </section>

    <section class="setup-grid" id="setup-sections" aria-live="polite"></section>

    <section class="setup-actions">
      <button class="btn" id="run-simulation" type="button">Run Simulation</button>
      <button class="btn btn-secondary" id="run-sandbox" type="button">Run Sandbox</button>
      <button class="btn btn-secondary" id="cleanup-run" type="button" disabled>Clean Up Test Data</button>
    </section>

    <section class="setup-report">
      <h2>Latest Report</h2>
      <div id="test-report" class="report-empty">No test run yet.</div>
    </section>
  </main>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="admin.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create admin JS**

Create `admin.js`:

```js
(function () {
  let accessToken = null;
  let latestRunId = null;

  document.addEventListener('DOMContentLoaded', initAdmin);

  async function initAdmin() {
    bindActions();
    accessToken = window.localStorage.getItem('dcr_portal_access_token') || '';
    await loadSetup();
  }

  function bindActions() {
    document.getElementById('admin-refresh')?.addEventListener('click', loadSetup);
    document.getElementById('run-simulation')?.addEventListener('click', () => runTest('simulation'));
    document.getElementById('run-sandbox')?.addEventListener('click', () => runTest('sandbox'));
    document.getElementById('cleanup-run')?.addEventListener('click', cleanupRun);
  }

  async function loadSetup() {
    const data = await api('/api/admin/setup');
    renderSetup(data.setup);
  }

  async function runTest(mode) {
    renderReport({ status: 'running', steps: [{ label: `Running ${mode}`, status: 'running' }] });
    const data = await api('/api/admin/test-runs', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
    latestRunId = data.id;
    document.getElementById('cleanup-run').disabled = !latestRunId;
    renderReport(data.report);
  }

  async function cleanupRun() {
    if (!latestRunId) return;
    const data = await api('/api/admin/cleanup-test-run', {
      method: 'POST',
      body: JSON.stringify({ testRunId: latestRunId }),
    });
    renderReport(data.report);
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers || {}),
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Admin request failed.');
    return body;
  }

  function renderSetup(setup) {
    const container = document.getElementById('setup-sections');
    if (!container) return;
    container.innerHTML = Object.entries(setup.sections || {}).map(([key, section]) => `
      <article class="setup-card setup-card-${section.status}">
        <h2>${escapeHtml(titleCase(key))}</h2>
        <p>${escapeHtml(section.provider?.detail || section.provider?.error || section.status)}</p>
        <dl>
          ${Object.entries(section.requiredEnv || {}).map(([envKey, value]) => `
            <div><dt>${escapeHtml(envKey)}</dt><dd>${value.present ? 'Present' : 'Missing'}</dd></div>
          `).join('')}
        </dl>
      </article>
    `).join('');
  }

  function renderReport(report) {
    const container = document.getElementById('test-report');
    if (!container) return;
    container.innerHTML = `
      <div class="report-status report-status-${escapeHtml(report.status || 'unknown')}">${escapeHtml(report.status || 'unknown')}</div>
      <ol class="report-steps">
        ${(report.steps || []).map((step) => `
          <li class="report-step report-step-${escapeHtml(step.status)}">
            <strong>${escapeHtml(step.label || step.key)}</strong>
            <span>${escapeHtml(step.detail || step.error || step.status)}</span>
          </li>
        `).join('')}
      </ol>
    `;
  }

  function titleCase(value) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }
}());
```

- [ ] **Step 3: Add styles**

Append to `style.css`:

```css
.admin-shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0 56px;
}

.admin-header,
.setup-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.setup-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.setup-card {
  border: 1px solid rgba(24, 24, 24, 0.14);
  border-radius: 8px;
  padding: 16px;
  background: #fff;
}

.setup-card-passed {
  border-color: rgba(36, 112, 77, 0.35);
}

.setup-card-failed {
  border-color: rgba(170, 48, 48, 0.35);
}

.setup-card dl {
  display: grid;
  gap: 8px;
  margin: 14px 0 0;
}

.setup-card dl div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.9rem;
}

.setup-report {
  margin-top: 28px;
}

.report-empty,
.report-step {
  border: 1px solid rgba(24, 24, 24, 0.14);
  border-radius: 8px;
  padding: 12px;
}

.report-status {
  display: inline-flex;
  margin-bottom: 12px;
  font-weight: 700;
  text-transform: capitalize;
}

.report-steps {
  display: grid;
  gap: 10px;
  padding: 0;
  list-style-position: inside;
}

.report-step {
  display: grid;
  gap: 4px;
  background: #fff;
}
```

- [ ] **Step 4: Update syntax check**

Add `node --check admin.js` to `package.json`.

- [ ] **Step 5: Run syntax checks**

Run:

```bash
npm run check:js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add admin.html admin.js style.css package.json
git commit -m "feat: add admin setup wizard UI"
```

---

## Task 10: Final Verification

**Files:**
- All files changed by this plan

- [ ] **Step 1: Run full automated checks**

Run:

```bash
npm test
npm run check:js
```

Expected: PASS.

- [ ] **Step 2: Start local app**

Run:

```bash
npm run dev
```

Expected: Vercel dev server starts and serves `admin.html`.

- [ ] **Step 3: Browser smoke test**

Open:

```text
http://localhost:3000/admin.html
```

Verify:

- The setup page renders.
- Missing auth returns a clear API failure instead of exposing setup data.
- With a valid admin token in local storage, setup cards load.
- Run Simulation returns a readable passed report.
- Cleanup button enables only after a run.

- [ ] **Step 4: Review git diff**

Run:

```bash
git status --short
git log --oneline -10
```

Expected: working tree clean except any intentionally uncommitted local environment files.

- [ ] **Step 5: Final commit only if needed**

If verification required small fixes to files from this plan:

```bash
git add supabase/schema.sql package.json style.css admin.html admin.js lib/automation lib/db/studio-records.js lib/google/drive.js api/admin test
git commit -m "fix: verify setup wizard test mode"
```

Otherwise no commit is needed.
