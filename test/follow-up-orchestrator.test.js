const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildDuplicateSkippedResult,
  buildEnqueueFailedResult,
  buildFollowUpJobIntent,
  buildQueuedResult,
  isDuplicatePendingError,
  runFollowUpPipeline,
  selectFollowUpCandidates,
} = require("../lib/automation/follow-up-orchestrator");

const NOW = "2026-05-20T12:00:00.000Z";

test("selectFollowUpCandidates delegates project staleness decisions", () => {
  const candidates = selectFollowUpCandidates(
    [
      {
        id: "project-1",
        customer_id: "customer-1",
        status: "awaiting_files",
        updated_at: "2026-05-16T12:00:00.000Z",
      },
    ],
    { now: NOW }
  );

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].reminderType, "missing_files");
});

test("buildFollowUpJobIntent creates a persistence-ready job body", () => {
  assert.deepEqual(
    buildFollowUpJobIntent(
      {
        projectId: "project-1",
        customerId: "customer-1",
        reminderType: "balance_due",
      },
      { scheduledFor: NOW }
    ),
    {
      ok: true,
      projectId: "project-1",
      customerId: "customer-1",
      followUpType: "balance_due",
      scheduledFor: NOW,
      body: {
        project_id: "project-1",
        customer_id: "customer-1",
        followup_type: "balance_due",
        status: "pending",
        scheduled_for: NOW,
      },
    }
  );
});

test("buildFollowUpJobIntent classifies incomplete candidates", () => {
  assert.deepEqual(buildFollowUpJobIntent({ projectId: "project-1" }), {
    ok: false,
    skipped: {
      projectId: "project-1",
      reminderType: null,
      reason: "missing_required_fields",
    },
  });
});

test("queue result builders standardize duplicate and failure outcomes", () => {
  const intent = buildFollowUpJobIntent(
    {
      projectId: "project-1",
      customerId: "customer-1",
      reminderType: "pending_quote",
    },
    { scheduledFor: NOW }
  );

  assert.deepEqual(
    buildQueuedResult({ id: "job-1", status: "pending" }, intent),
    {
      jobId: "job-1",
      projectId: "project-1",
      reminderType: "pending_quote",
      status: "pending",
    }
  );
  assert.deepEqual(buildDuplicateSkippedResult(intent), {
    projectId: "project-1",
    reminderType: "pending_quote",
    reason: "duplicate_pending",
  });
  assert.deepEqual(
    buildEnqueueFailedResult(intent, new Error("network down")),
    {
      projectId: "project-1",
      reminderType: "pending_quote",
      reason: "enqueue_failed",
      error: "network down",
    }
  );
  assert.equal(
    isDuplicatePendingError(
      new Error('duplicate key violates "followup_jobs_unique_pending_idx"')
    ),
    true
  );
});

test("runFollowUpPipeline returns dry-run candidate payload", async () => {
  const result = await runFollowUpPipeline({
    records: {
      getFollowUpCandidates: async (options) => {
        assert.equal(options.now, NOW);
        return [{ projectId: "project-1", reminderType: "missing_files" }];
      },
    },
    now: NOW,
  });

  assert.equal(result.dryRun, true);
  assert.equal(result.count, 1);
  assert.equal(result.candidates[0].reminderType, "missing_files");
});

test("runFollowUpPipeline queues and optionally dispatches", async () => {
  const calls = [];
  const records = {
    getFollowUpCandidates: async () => [
      {
        projectId: "project-1",
        customerId: "customer-1",
        reminderType: "missing_files",
      },
    ],
    queueFollowUpJobs: async (candidates, options) => {
      calls.push({ type: "queue", candidates, options });
      return { queued: [{ jobId: "job-1" }], skipped: [], failed: [] };
    },
  };

  const result = await runFollowUpPipeline({
    records,
    env: { SITE_URL: "https://dirtcatrecords.com" },
    dryRun: false,
    dispatch: true,
    dispatchPendingFollowUps: async (input) => {
      calls.push({ type: "dispatch", input });
      return {
        scannedCount: 1,
        sent: [{ jobId: "job-1" }],
        skipped: [],
        failed: [],
      };
    },
  });

  assert.equal(result.dryRun, false);
  assert.equal(result.queueResults.queued.length, 1);
  assert.equal(result.dispatchResults.sent.length, 1);
  assert.equal(calls[0].type, "queue");
  assert.equal(calls[1].type, "dispatch");
});
