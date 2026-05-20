const recordsDefault = require("../db/studio-records");
const { sendStudioEmail } = require("../email/resend");
const {
  buildFollowUpReminderEmail,
  buildProjectPortalUrl,
  sendEmailSequence,
} = require("../email/email-sequence-choreographer");
const projectEvents = require("./project-event-schema");

async function dispatchPendingFollowUps(options = {}) {
  const records = options.records || recordsDefault;
  const env = options.env || process.env;
  const sendEmailImpl = options.sendEmailImpl || sendStudioEmail;

  const jobs = await records.listPendingFollowUpJobs({
    env,
    now: options.now,
    limit: options.limit,
  });

  const sent = [];
  const skipped = [];
  const failed = [];

  for (const job of jobs) {
    const result = await dispatchOneJob(job, { records, env, sendEmailImpl });
    if (result.outcome === "sent") sent.push(result);
    if (result.outcome === "skipped") skipped.push(result);
    if (result.outcome === "failed") failed.push(result);
  }

  return {
    processedAt: new Date().toISOString(),
    scannedCount: jobs.length,
    sent,
    skipped,
    failed,
  };
}

async function dispatchOneJob(job, options) {
  const records = options.records;
  const env = options.env;
  const sendEmailImpl = options.sendEmailImpl;
  const project = job.projects || {};
  const customer = job.customers || {};
  const recipient = customer.email || "";

  if (!recipient) {
    await records.updateFollowUpJobStatus(
      job.id,
      {
        status: "skipped",
        processedAt: new Date().toISOString(),
        errorMessage: "Missing customer email.",
      },
      { env }
    );

    await logFollowUpProjectEvent(
      records,
      projectEvents.followUpDispatchSkipped({
        projectId: job.project_id,
        followUpJobId: job.id,
        followUpType: job.followup_type,
        reason: "missing customer email",
      }),
      env
    );

    return {
      outcome: "skipped",
      jobId: job.id,
      projectId: job.project_id,
      reminderType: job.followup_type,
      reason: "missing_customer_email",
    };
  }

  const emailMessage = buildFollowUpReminderEmail(job, project, {
    to: recipient,
    env,
  });
  const sequenceResult = await sendEmailSequence({
    records,
    sendEmail: sendEmailImpl,
    messages: [emailMessage],
    sequenceName: "follow_up",
    env,
  });

  if (sequenceResult.sent.length > 0) {
    const response = sequenceResult.sent[0].response;

    await records.updateFollowUpJobStatus(
      job.id,
      {
        status: "sent",
        processedAt: new Date().toISOString(),
        errorMessage: null,
      },
      { env }
    );

    await logFollowUpProjectEvent(
      records,
      projectEvents.followUpDispatched({
        projectId: job.project_id,
        followUpJobId: job.id,
        followUpType: job.followup_type,
        recipient,
      }),
      env
    );

    return {
      outcome: "sent",
      jobId: job.id,
      projectId: job.project_id,
      reminderType: job.followup_type,
      recipient,
    };
  }

  const failure = sequenceResult.failed[0];

  await records.updateFollowUpJobStatus(
    job.id,
    {
      status: "failed",
      processedAt: new Date().toISOString(),
      errorMessage: failure?.reason || "Unable to send follow-up email.",
    },
    { env }
  );

  await logFollowUpProjectEvent(
    records,
    projectEvents.followUpDispatchFailed({
      projectId: job.project_id,
      followUpJobId: job.id,
      followUpType: job.followup_type,
      error: failure?.error || new Error("Unable to send follow-up email."),
    }),
    env
  );

  return {
    outcome: "failed",
    jobId: job.id,
    projectId: job.project_id,
    reminderType: job.followup_type,
    reason: failure?.reason || "Unable to send follow-up email.",
  };
}

function buildFollowUpEmail(job, project, env = process.env) {
  return buildFollowUpReminderEmail(job, project, { env }).data;
}

function buildPortalUrl(projectId, env = process.env) {
  return buildProjectPortalUrl(projectId, env);
}

async function logFollowUpProjectEvent(records, event, env) {
  try {
    await records.createProjectEvent(event, { env });
  } catch (_error) {
    // Non-blocking event logging.
  }
}

module.exports = {
  dispatchPendingFollowUps,
  _private: {
    buildFollowUpEmail,
    buildPortalUrl,
  },
};
