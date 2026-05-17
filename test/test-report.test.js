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
