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

test('createPaidProjectWorkflow returns existing project on webhook retry without side effects', async () => {
  const calls = [];
  const records = fakeRecords(calls);
  records.upsertPaymentAndOrder = async () => ({
    order: { id: 'order-1', project_id: 'project-existing' },
    payment: { id: 'payment-1', project_id: 'project-existing' },
  });
  records.getProjectById = async () => ({ id: 'project-existing', status: 'awaiting_files' });
  records.createProject = async () => { throw new Error('createProject should not run on retry'); };
  const workflow = createPaidProjectWorkflow({
    records,
    drive: fakeDrive(calls),
    email: fakeEmail(calls),
    env: { ADMIN_EMAIL: 'josh@example.com' },
  });

  const result = await workflow({
    paypalTxnId: 'CAPTURE-1',
    buyerEmail: 'buyer@example.com',
    totalAmount: '199.00',
    orderSummary: { baseServiceId: 'mixMaster', songCount: 1, paymentMode: 'full' },
  });

  assert.equal(result.project.id, 'project-existing');
  assert.equal(calls.some((call) => call.type === 'drive.create'), false);
  assert.equal(calls.some((call) => call.type === 'email.customer'), false);
});

test('default email adapter logs failed email without aborting free review workflow', async () => {
  const calls = [];
  const records = fakeRecords(calls);
  records.createEmailEvent = async (event) => { calls.push({ type: 'email.event', status: event.status }); };
  const workflow = createFreeReviewWorkflow({
    records,
    drive: fakeDrive(calls),
    resend: { sendStudioEmail: async () => { throw new Error('Resend failed'); } },
    email: undefined,
    env: {
      ADMIN_EMAIL: 'josh@example.com',
      RESEND_API_KEY: 'resend-key',
      RESEND_FROM_EMAIL: 'Dirt Cat Records <studio@example.com>',
      RESEND_REPLY_TO_EMAIL: 'josh@example.com',
    },
  });

  const result = await workflow({
    email: 'Buyer@Example.com',
    name: 'Buyer',
    artistName: 'Dude McGee',
    projectTitle: 'Song One',
    message: 'Please review this mix.',
  });

  assert.equal(result.project.status, 'awaiting_files');
  assert.ok(calls.some((call) => call.type === 'email.event' && call.status === 'failed'));
});

function fakeRecords(calls) {
  return {
    upsertCustomer: async (input) => ({ id: 'customer-1', email: input.email.toLowerCase(), name: input.name || null }),
    createLead: async () => ({ id: 'lead-1' }),
    createProject: async (input) => ({ id: 'project-1', status: input.status, project_code: 'DCR-000123' }),
    updateProject: async (_id, patch) => ({ id: 'project-1', status: 'awaiting_files', ...patch }),
    createProjectEvent: async (event) => { calls.push({ type: 'event', message: event.message }); return { id: 'event-1' }; },
    upsertPaymentAndOrder: async () => ({ order: { id: 'order-1' }, payment: { id: 'payment-1' } }),
    getProjectById: async () => null,
    getProjectByOrderId: async () => null,
    linkOrderPaymentToProject: async () => calls.push({ type: 'link.project' }),
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
