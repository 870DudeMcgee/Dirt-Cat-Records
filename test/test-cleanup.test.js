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
