const assert = require('node:assert/strict');
const test = require('node:test');
const { buildPortalProjectView, renderEmptyProjects, renderProjectCard } = require('../portal-view');

test('portal project card shows upload next step and hides final approval while awaiting files', () => {
  const project = buildPortalProjectView({
    id: 'project-1',
    project_title: 'First Song',
    status: 'awaiting_files',
    drive_upload_folder_url: 'https://drive.google.com/upload',
    included_revisions: 2,
    used_revisions: 0,
  });
  const html = renderProjectCard(project);

  assert.equal(project.statusLabel, 'Waiting For Files');
  assert.match(html, /Upload your stems, rough mix, and references/);
  assert.match(html, /Open Upload Folder/);
  assert.match(html, /2 revisions remaining/);
  assert.equal(html.includes('portal-approve-button'), false);
});

test('portal project card shows balance lock and suppresses delivery actions when balance remains', () => {
  const project = buildPortalProjectView({
    id: 'project-2',
    project_title: 'Deposit Song',
    status: 'finals_ready',
    balance_due: '99.50',
    final_delivery_locked: true,
    final_delivery_url: 'https://drive.google.com/finals',
    included_revisions: 1,
    used_revisions: 1,
  });
  const html = renderProjectCard(project);

  assert.match(html, /Balance Due/);
  assert.match(html, /\$99\.50/);
  assert.match(html, /Final files are ready but locked until the remaining balance is paid/);
  assert.equal(html.includes('Open Final Files'), false);
  assert.equal(html.includes('portal-approve-button'), false);
  assert.equal(html.includes('portal-revision-form'), false);
  assert.match(html, /No included revisions remain/);
});

test('portal project card shows final delivery and approval only when unlocked', () => {
  const project = buildPortalProjectView({
    id: 'project-3',
    project_title: 'Final Song',
    status: 'delivered',
    final_delivery_locked: false,
    final_delivery_url: 'https://drive.google.com/finals',
    included_revisions: 2,
    used_revisions: 1,
  });
  const html = renderProjectCard(project);

  assert.match(html, /Open Final Files/);
  assert.match(html, /portal-approve-button/);
  assert.match(html, /1 revision remaining/);
  assert.match(html, /portal-revision-form/);
  assert.equal(html.includes('portal-link-form'), false);
});

test('empty portal projects state gives a useful next step', () => {
  const html = renderEmptyProjects();

  assert.match(html, /No projects found for this email/);
  assert.match(html, /If you just paid/);
});

test('portal project card renders active quote details and accept action', () => {
  const project = buildPortalProjectView({
    id: 'project-4',
    project_title: 'Quoted Song',
    status: 'quote_sent',
    active_quote: {
      id: 'quote-1',
      status: 'sent',
      final_total_cents: 45000,
      payment_mode: 'full',
      expires_at: '2026-06-01T00:00:00.000Z',
      line_items: [],
    },
    included_revisions: 1,
    used_revisions: 0,
  });
  const html = renderProjectCard(project);

  assert.match(html, /Quote/);
  assert.match(html, /\$450\.00/);
  assert.match(html, /Status: Sent/);
  assert.match(html, /Accept Quote & Pay/);
});
