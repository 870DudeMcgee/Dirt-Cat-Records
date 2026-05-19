const test = require("node:test");
const assert = require("node:assert/strict");
const {
  selectFollowUpForProject,
  selectFollowUps,
} = require("../lib/automation/follow-up-selector");

const NOW = new Date("2026-05-19T12:00:00.000Z");

test("selectFollowUpForProject returns missing files reminder for stale awaiting_files", () => {
  const selection = selectFollowUpForProject(
    {
      id: "project-1",
      customer_id: "customer-1",
      status: "awaiting_files",
      updated_at: "2026-05-15T10:00:00.000Z",
    },
    { now: NOW }
  );

  assert.equal(selection.reminderType, "missing_files");
  assert.equal(selection.status, "awaiting_files");
  assert.equal(selection.staleDays, 4);
});

test("selectFollowUpForProject returns pending quote reminder for stale quote_sent", () => {
  const selection = selectFollowUpForProject(
    {
      id: "project-2",
      customer_id: "customer-2",
      status: "quote_sent",
      updated_at: "2026-05-16T12:00:00.000Z",
    },
    { now: NOW }
  );

  assert.equal(selection.reminderType, "pending_quote");
  assert.equal(selection.staleDays, 3);
});

test("selectFollowUpForProject returns balance due reminder when locked balance remains", () => {
  const selection = selectFollowUpForProject(
    {
      id: "project-3",
      customer_id: "customer-3",
      status: "balance_due",
      balance_due: 180,
      updated_at: "2026-05-16T11:00:00.000Z",
    },
    { now: NOW }
  );

  assert.equal(selection.reminderType, "balance_due");
});

test("selectFollowUpForProject returns final approval reminder for stale delivered unlocked projects", () => {
  const selection = selectFollowUpForProject(
    {
      id: "project-4",
      customer_id: "customer-4",
      status: "delivered",
      final_delivery_locked: false,
      updated_at: "2026-05-10T11:00:00.000Z",
    },
    { now: NOW }
  );

  assert.equal(selection.reminderType, "final_approval");
});

test("selectFollowUpForProject returns null when project is not stale enough", () => {
  const selection = selectFollowUpForProject(
    {
      id: "project-5",
      customer_id: "customer-5",
      status: "awaiting_files",
      updated_at: "2026-05-18T12:00:00.000Z",
    },
    { now: NOW }
  );

  assert.equal(selection, null);
});

test("selectFollowUps filters out non-candidates", () => {
  const selections = selectFollowUps(
    [
      {
        id: "project-1",
        customer_id: "customer-1",
        status: "awaiting_files",
        updated_at: "2026-05-15T10:00:00.000Z",
      },
      {
        id: "project-2",
        customer_id: "customer-2",
        status: "approved",
        updated_at: "2026-05-10T10:00:00.000Z",
      },
    ],
    { now: NOW }
  );

  assert.equal(selections.length, 1);
  assert.equal(selections[0].projectId, "project-1");
});
