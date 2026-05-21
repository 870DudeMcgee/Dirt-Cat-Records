const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const {
  buildPortalProjectView,
  renderEmptyProjects,
  renderProjectCard,
} = require("../portal-view");

const root = join(__dirname, "..");

test("portal project card shows upload next step and hides final approval while awaiting files", () => {
  const project = buildPortalProjectView({
    id: "project-1",
    project_title: "First Song",
    status: "awaiting_files",
    drive_upload_folder_url: "https://drive.google.com/upload",
    included_revisions: 2,
    used_revisions: 0,
  });
  const html = renderProjectCard(project);

  assert.equal(project.statusLabel, "Waiting For Files");
  assert.match(html, /Upload your stems, rough mix, and references/);
  assert.match(html, /Open Upload Folder/);
  assert.match(html, /2 revisions remaining/);
  assert.equal(html.includes("portal-approve-button"), false);
});

test("portal project card shows unlimited revisions for friends comp projects", () => {
  const project = buildPortalProjectView({
    id: "project-free-code",
    project_type: "paid",
    project_title: "Friends Comp Song",
    status: "delivered",
    included_revisions: 1000000,
    used_revisions: 42,
    final_delivery_locked: false,
    final_delivery_url: "https://drive.google.com/finals",
  });
  const html = renderProjectCard(project);

  assert.equal(project.unlimitedRevisions, true);
  assert.equal(project.revisionLabel, "Unlimited revisions included");
  assert.equal(project.canRequestRevision, true);
  assert.match(html, /Unlimited revisions included/);
  assert.match(html, /Unlimited Revisions Active/);
  assert.equal(html.includes("Buy Another Revision"), false);
});

test("portal project card shows balance lock and suppresses delivery actions when balance remains", () => {
  const project = buildPortalProjectView({
    id: "project-2",
    project_title: "Deposit Song",
    status: "finals_ready",
    balance_due: "99.50",
    final_delivery_locked: true,
    final_delivery_url: "https://drive.google.com/finals",
    included_revisions: 1,
    used_revisions: 1,
  });
  const html = renderProjectCard(project);

  assert.match(html, /Balance Due/);
  assert.match(html, /\$99\.50/);
  assert.match(
    html,
    /Final files are ready but locked until the remaining balance is paid/
  );
  assert.equal(html.includes("Open Final Files"), false);
  assert.equal(html.includes("portal-approve-button"), false);
  assert.equal(html.includes("portal-revision-form"), false);
  assert.match(html, /No included revisions remain/);
});

test("portal project card shows final delivery and approval only when unlocked", () => {
  const project = buildPortalProjectView({
    id: "project-3",
    project_title: "Final Song",
    status: "delivered",
    final_delivery_locked: false,
    final_delivery_url: "https://drive.google.com/finals",
    included_revisions: 2,
    used_revisions: 1,
  });
  const html = renderProjectCard(project);

  assert.match(html, /Open Final Files/);
  assert.match(html, /portal-approve-button/);
  assert.match(html, /1 revision remaining/);
  assert.match(html, /portal-revision-form/);
  assert.match(html, /Send one clear pass of notes/);
  assert.match(html, /aria-describedby="portal-revision-help"/);
  assert.equal(html.includes("portal-link-form"), false);
});

test("empty portal projects state gives a useful next step", () => {
  const html = renderEmptyProjects();

  assert.match(html, /No projects found for this email/);
  assert.match(html, /If you just paid/);
});

test("portal project card renders active quote details and accept action", () => {
  const project = buildPortalProjectView({
    id: "project-4",
    project_title: "Quoted Song",
    status: "quote_sent",
    active_quote: {
      id: "quote-1",
      status: "sent",
      final_total_cents: 45000,
      payment_mode: "full",
      expires_at: "2026-06-01T00:00:00.000Z",
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

test("portal project card shows balance payment action when balance is due", () => {
  const project = buildPortalProjectView({
    id: "project-5",
    project_title: "Balance Song",
    status: "balance_due",
    balance_due: "225.00",
    final_delivery_locked: true,
    included_revisions: 1,
    used_revisions: 0,
  });
  const html = renderProjectCard(project);

  assert.match(html, /Balance Due/);
  assert.match(html, /Pay Remaining Balance/);
});

test("portal project card offers paid upsells for paid projects", () => {
  const project = buildPortalProjectView({
    id: "project-upsell",
    project_type: "paid",
    project_code: "DCR-000777",
    project_title: "Upsell Song",
    status: "delivered",
    included_revisions: 1,
    used_revisions: 1,
  });
  const html = renderProjectCard(project);

  assert.match(html, /Keep Building/);
  assert.match(html, /Buy Another Revision/);
  assert.match(html, /Start Another Service/);
  assert.match(html, /support\.html\?issueType=project_status/);
  assert.match(html, /projectCode=DCR-000777/);
});

test("portal project card treats requested revisions as a customer confirmation state", () => {
  const project = buildPortalProjectView({
    id: "project-6",
    project_title: "Revision Song",
    status: "revision_requested",
    drive_upload_folder_url: "https://drive.google.com/upload",
    included_revisions: 1,
    used_revisions: 1,
  });
  const html = renderProjectCard(project);

  assert.equal(project.canSubmitFiles, false);
  assert.match(html, /Your revision request is in Josh&#039;s hands/);
  assert.match(html, /Open Upload Folder/);
  assert.equal(html.includes("portal-link-form"), false);
  assert.equal(html.includes("portal-revision-form"), false);
});

test("portal form controls keep padded inputs inside project cards", () => {
  const css = readFileSync(join(root, "style.css"), "utf8");

  assert.match(css, /html\s*{[\s\S]*box-sizing: border-box;/);
  assert.match(
    css,
    /\*,\s*\n\*::before,\s*\n\*::after\s*{\s*box-sizing: inherit;/
  );
  assert.match(
    css,
    /\.portal-link-form input,\s*\n\.portal-revision-form textarea/
  );
  assert.match(css, /max-width: 100%/);
});
