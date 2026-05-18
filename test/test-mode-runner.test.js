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

test('runAutomationTest tolerates missing test run storage during first-time setup', async () => {
  const result = await runAutomationTest({
    mode: 'simulation',
    env: { ADMIN_EMAIL: 'josh@example.com', SITE_URL: 'https://dirtcatrecords.com' },
    records: {
      createAutomationTestRun: async () => {
        throw new Error("Supabase request failed: 404 Could not find the table 'public.automation_test_runs' in the schema cache");
      },
      updateAutomationTestRun: async () => {
        throw new Error("Supabase request failed: 404 Could not find the table 'public.automation_test_runs' in the schema cache");
      },
    },
  });

  assert.equal(result.report.status, 'passed');
});

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

test('runAutomationTest sandbox fails when provider adapters fail silently', async () => {
  const result = await runAutomationTest({
    mode: 'sandbox',
    testRunId: 'sandbox-20260517T120000-failed1',
    env: {
      ADMIN_EMAIL: 'josh@example.com',
      TEST_CUSTOMER_EMAIL: 'test@example.com',
    },
    records: sandboxRecords([]),
    drive: {
      createDriveProjectFolders: async () => {
        throw new Error('Drive failed');
      },
    },
    email: {
      sendCustomerEmail: async () => ({ failed: true, error: 'Email failed' }),
      sendAdminEmail: async () => ({ failed: true, error: 'Email failed' }),
    },
  });

  assert.equal(result.report.status, 'failed');
  assert.match(result.report.errors[0], /Drive folders|Email failed/);
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
