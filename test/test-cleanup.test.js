const test = require("node:test");
const assert = require("node:assert/strict");
const { cleanupAutomationTestRun } = require("../lib/automation/test-cleanup");

test("cleanupAutomationTestRun refuses missing test_run_id", async () => {
  await assert.rejects(
    () => cleanupAutomationTestRun({ report: { id: "" } }),
    /test_run_id is required/
  );
});

test("cleanupAutomationTestRun deletes drive folders and marks run cleaned", async () => {
  const calls = [];
  const result = await cleanupAutomationTestRun({
    report: {
      id: "sandbox-20260517T120000-abc123",
      createdDriveFolders: [{ id: "folder-1" }],
      createdRecords: [{ table: "projects", id: "project-1" }],
    },
    records: {
      updateProject: async (id, patch) =>
        calls.push({ type: "project", id, patch }),
      updateAutomationTestRun: async (id, patch) =>
        calls.push({ type: "run", id, patch }),
    },
    drive: {
      deleteDriveFolder: async (id) => calls.push({ type: "drive.delete", id }),
    },
  });

  assert.equal(result.cleanupStatus, "cleaned");
  assert.deepEqual(
    calls.find((call) => call.type === "drive.delete"),
    { type: "drive.delete", id: "folder-1" }
  );
  assert.equal(
    calls.find((call) => call.type === "project").patch.status,
    "closed"
  );
});

test("cleanupAutomationTestRun deletes tracked non-project records", async () => {
  const calls = [];
  await cleanupAutomationTestRun({
    report: {
      id: "sandbox-20260517T120000-abc123",
      createdDriveFolders: [],
      createdRecords: [
        { table: "projects", id: "project-1" },
        { table: "orders", id: "order-1" },
        { table: "payments", id: "payment-1" },
        { table: "leads", id: "lead-1" },
      ],
    },
    records: {
      updateProject: async (id, patch) =>
        calls.push({ type: "project", id, patch }),
      deleteStudioRecord: async (table, id) =>
        calls.push({ type: "delete", table, id }),
      updateAutomationTestRun: async () => {},
    },
    drive: {},
  });

  assert.deepEqual(
    calls
      .filter((call) => call.type === "delete")
      .map((call) => `${call.table}:${call.id}`),
    [
      "leads:lead-1",
      "payments:payment-1",
      "orders:order-1",
      "projects:project-1",
    ]
  );
});
