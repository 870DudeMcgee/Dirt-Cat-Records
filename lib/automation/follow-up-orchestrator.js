const { selectFollowUps } = require("./follow-up-selector");

function selectFollowUpCandidates(projects, options = {}) {
  return selectFollowUps(projects, options);
}

function buildFollowUpJobIntent(candidate = {}, options = {}) {
  const projectId = candidate.projectId || null;
  const customerId = candidate.customerId || null;
  const followUpType = candidate.reminderType || null;
  const scheduledFor = options.scheduledFor || new Date().toISOString();

  if (!projectId || !customerId || !followUpType) {
    return {
      ok: false,
      skipped: {
        projectId,
        reminderType: followUpType,
        reason: "missing_required_fields",
      },
    };
  }

  return {
    ok: true,
    projectId,
    customerId,
    followUpType,
    scheduledFor,
    body: {
      project_id: projectId,
      customer_id: customerId,
      followup_type: followUpType,
      status: "pending",
      scheduled_for: scheduledFor,
    },
  };
}

function buildQueuedResult(job, intent) {
  return {
    jobId: job?.id || null,
    projectId: intent.projectId,
    reminderType: intent.followUpType,
    status: job?.status || "pending",
  };
}

function buildDuplicateSkippedResult(intent) {
  return {
    projectId: intent.projectId,
    reminderType: intent.followUpType,
    reason: "duplicate_pending",
  };
}

function buildEnqueueFailedResult(intent, error) {
  return {
    projectId: intent.projectId,
    reminderType: intent.followUpType,
    reason: "enqueue_failed",
    error: error.message,
  };
}

function isDuplicatePendingError(error) {
  return /followup_jobs_unique_pending|duplicate key|unique/i.test(
    error?.message || ""
  );
}

async function runFollowUpPipeline(options = {}) {
  const records = requireValue(options.records, "records");
  const env = options.env || process.env;
  const generatedAt = new Date().toISOString();
  const candidates = await records.getFollowUpCandidates({
    env,
    now: options.now,
    missingFilesDays: options.missingFilesDays,
    pendingQuoteDays: options.pendingQuoteDays,
    balanceDueDays: options.balanceDueDays,
    finalApprovalDays: options.finalApprovalDays,
  });

  if (options.dryRun !== false) {
    return {
      generatedAt,
      dryRun: true,
      count: candidates.length,
      candidates,
    };
  }

  const queueResults = await records.queueFollowUpJobs(candidates, {
    env,
    scheduledFor: options.scheduledFor,
  });
  let dispatchResults = null;
  if (options.dispatch === true) {
    const dispatchPendingFollowUps = requireValue(
      options.dispatchPendingFollowUps,
      "dispatchPendingFollowUps"
    );
    dispatchResults = await dispatchPendingFollowUps({
      records,
      env,
      now: options.now,
      limit: options.dispatchLimit,
    });
  }

  return {
    generatedAt,
    dryRun: false,
    count: candidates.length,
    candidates,
    queueResults,
    dispatchResults,
  };
}

function requireValue(value, label) {
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

module.exports = {
  buildDuplicateSkippedResult,
  buildEnqueueFailedResult,
  buildFollowUpJobIntent,
  buildQueuedResult,
  isDuplicatePendingError,
  runFollowUpPipeline,
  selectFollowUpCandidates,
};
