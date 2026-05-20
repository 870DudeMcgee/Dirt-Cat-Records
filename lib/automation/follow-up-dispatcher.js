const recordsDefault = require("../db/studio-records");
const { sendStudioEmail } = require("../email/resend");
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

  const emailMessage = buildFollowUpEmail(job, project, env);

  try {
    const response = await sendEmailImpl(
      {
        to: recipient,
        emailType: "admin_notification",
        data: emailMessage,
      },
      { env }
    );

    await safeCreateEmailEvent(
      records,
      {
        projectId: job.project_id,
        customerId: job.customer_id,
        emailType: `followup_${job.followup_type}`,
        recipient,
        status: "sent",
        resendMessageId: response?.id || null,
        metadata: {
          followUpJobId: job.id,
          followUpType: job.followup_type,
        },
      },
      { env }
    );

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
  } catch (error) {
    await safeCreateEmailEvent(
      records,
      {
        projectId: job.project_id,
        customerId: job.customer_id,
        emailType: `followup_${job.followup_type}`,
        recipient,
        status: "failed",
        errorMessage: error.message,
        metadata: {
          followUpJobId: job.id,
          followUpType: job.followup_type,
        },
      },
      { env }
    );

    await records.updateFollowUpJobStatus(
      job.id,
      {
        status: "failed",
        processedAt: new Date().toISOString(),
        errorMessage: error.message,
      },
      { env }
    );

    await logFollowUpProjectEvent(
      records,
      projectEvents.followUpDispatchFailed({
        projectId: job.project_id,
        followUpJobId: job.id,
        followUpType: job.followup_type,
        error,
      }),
      env
    );

    return {
      outcome: "failed",
      jobId: job.id,
      projectId: job.project_id,
      reminderType: job.followup_type,
      reason: error.message,
    };
  }
}

const { getPublicAppOrigin } = require("../env/public-origin");

async function safeCreateEmailEvent(records, event, options) {
  try {
    await records.createEmailEvent(event, options);
  } catch (_error) {
    // Email event logging should not crash the follow-up dispatcher.
  }
}

function buildFollowUpEmail(job, project, env = process.env) {
  const portalUrl = buildPortalUrl(project.id || job.project_id, env);
  const projectLabel =
    project.project_code || project.project_title || "your project";

  const templates = {
    missing_files: {
      subject: `Reminder: upload files for ${projectLabel}`,
      text: `Quick reminder to upload your project files so we can move forward.\n\nPortal: ${portalUrl}`,
    },
    pending_quote: {
      subject: `Reminder: your quote is ready for ${projectLabel}`,
      text: `Your quote is still waiting for review/acceptance.\n\nPortal: ${portalUrl}`,
    },
    balance_due: {
      subject: `Reminder: balance due for ${projectLabel}`,
      text: `Your final files are ready to unlock after the remaining balance is paid.\n\nPortal: ${portalUrl}`,
    },
    final_approval: {
      subject: `Reminder: approve your final delivery for ${projectLabel}`,
      text: `Your final delivery is available. Please approve it in the portal when ready.\n\nPortal: ${portalUrl}`,
    },
  };

  return (
    templates[job.followup_type] || {
      subject: `Project follow-up reminder for ${projectLabel}`,
      text: `Please review your project status in the portal.\n\nPortal: ${portalUrl}`,
    }
  );
}

function buildPortalUrl(projectId, env = process.env) {
  const base = getPublicAppOrigin(env).replace(/\/$/, "");
  const path = `portal.html${projectId ? `?project=${encodeURIComponent(projectId)}` : ""}`;
  return base ? `${base}/${path}` : `/${path}`;
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
    safeCreateEmailEvent,
  },
};
