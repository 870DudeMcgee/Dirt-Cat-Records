const { getPublicAppOrigin } = require("../env/public-origin");

function buildProjectIntakeEmailSequence(input = {}) {
  const customer = input.customer || {};
  const project = input.project || {};
  const portalUrl = input.portalUrl || buildPortalUrl(input.env);
  const messages = [];

  if (input.kind === "free_review") {
    messages.push({
      to: customer.email,
      emailType: "free_review_received",
      customerId: customer.id || null,
      projectId: project.id || null,
      data: {
        customerName: customer.name,
        portalUrl,
      },
    });
  } else if (input.kind === "paid_project") {
    messages.push({
      to: customer.email,
      emailType: "payment_received",
      customerId: customer.id || null,
      projectId: project.id || null,
      data: { portalUrl },
    });
  } else {
    throw new Error(`Unknown project intake email sequence: ${input.kind}`);
  }

  messages.push({
    to: customer.email,
    emailType: "upload_instructions",
    customerId: customer.id || null,
    projectId: project.id || null,
    data: {
      uploadFolderUrl: project.drive_upload_folder_url,
      portalUrl,
    },
  });

  if (input.adminEmail) {
    messages.push({
      to: input.adminEmail,
      emailType: "admin_notification",
      customerId: customer.id || null,
      projectId: project.id || null,
      data:
        input.kind === "free_review"
          ? {
              subject: "New free mix review",
              text: `New free review from ${customer.email}.`,
            }
          : {
              subject: "New paid project",
              text: `New paid project from ${customer.email}.`,
            },
    });
  }

  return messages;
}

function buildQuoteSentEmail(input = {}) {
  return {
    to: input.to,
    emailType: "quote_sent",
    customerId: input.customerId || null,
    projectId: input.projectId || null,
    data: {
      quoteUrl: input.quoteUrl,
      totalLabel: input.totalLabel,
    },
    metadata: {
      quoteId: input.quoteId,
      quoteUrl: input.quoteUrl,
    },
  };
}

function buildFinalDeliveryEmail(input = {}) {
  if (input.kind === "balance_due") {
    return {
      to: input.to,
      emailType: "finals_ready_balance_due",
      customerId: input.customerId || null,
      projectId: input.projectId || null,
      data: {
        balanceUrl: input.portalUrl,
        portalUrl: input.portalUrl,
      },
      metadata: {
        finalDeliveryUrl: input.finalDeliveryUrl,
        balanceDue: input.balanceDue,
      },
    };
  }

  if (input.kind === "unlocked") {
    return {
      to: input.to,
      emailType: "final_delivery_unlocked",
      customerId: input.customerId || null,
      projectId: input.projectId || null,
      data: {
        finalDeliveryUrl: input.finalDeliveryUrl,
        portalUrl: input.portalUrl,
      },
      metadata: { finalDeliveryUrl: input.finalDeliveryUrl },
    };
  }

  throw new Error(`Unknown final delivery email kind: ${input.kind}`);
}

function buildPortalCustomerEmail(input = {}) {
  return {
    to: input.to,
    emailType: input.emailType,
    customerId: input.customerId || null,
    projectId: input.projectId || null,
    data: input.data || {},
    metadata: input.metadata || undefined,
  };
}

function buildAdminNotificationEmail(input = {}) {
  return {
    to: input.to,
    emailType: "admin_notification",
    customerId: input.customerId || null,
    projectId: input.projectId || null,
    data: {
      subject: input.subject,
      text: input.text,
    },
    metadata: input.metadata || undefined,
  };
}

function buildFollowUpReminderEmail(job = {}, project = {}, input = {}) {
  const portalUrl = input.portalUrl || buildProjectPortalUrl(project.id || job.project_id, input.env);
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
  const data =
    templates[job.followup_type] || {
      subject: `Project follow-up reminder for ${projectLabel}`,
      text: `Please review your project status in the portal.\n\nPortal: ${portalUrl}`,
    };

  return {
    to: input.to,
    emailType: "admin_notification",
    eventEmailType: `followup_${job.followup_type}`,
    customerId: job.customer_id || input.customerId || null,
    projectId: job.project_id || project.id || input.projectId || null,
    data,
    metadata: {
      followUpJobId: job.id,
      followUpType: job.followup_type,
    },
  };
}

async function sendEmailSequence(options = {}) {
  const messages = options.messages || [];
  const sent = [];
  const failed = [];
  let firstFailure = null;

  for (let index = 0; index < messages.length; index += 1) {
    const message = {
      ...messages[index],
      metadata: withSequenceMetadata(
        messages[index].metadata,
        options.sequenceName,
        index
      ),
    };

    try {
      const response = await options.sendEmail(message, {
        env: options.env,
        fetchImpl: options.fetchImpl,
      });
      await createEmailEvent(options.records, buildEmailEvent(message, {
        status: "sent",
        resendMessageId: response?.id || null,
      }), options);
      sent.push({
        to: message.to,
        emailType: message.emailType,
        eventEmailType: message.eventEmailType || message.emailType,
        response,
      });
    } catch (error) {
      if (!firstFailure) firstFailure = error;
      await createEmailEvent(options.records, buildEmailEvent(message, {
        status: "failed",
        errorMessage: error.message,
      }), options);
      failed.push({
        to: message.to,
        emailType: message.emailType,
        eventEmailType: message.eventEmailType || message.emailType,
        error,
        reason: error.message,
      });
      if (options.continueOnFailure === false) break;
    }
  }

  if (firstFailure && options.throwOnFailure) throw firstFailure;
  return { sent, failed };
}

function buildEmailEvent(message, result) {
  return {
    projectId: message.projectId || undefined,
    customerId: message.customerId || undefined,
    emailType: message.eventEmailType || message.emailType,
    recipient: message.to,
    status: result.status,
    resendMessageId: result.resendMessageId || undefined,
    errorMessage: result.errorMessage || undefined,
    metadata: message.metadata || undefined,
  };
}

async function createEmailEvent(records, event, options) {
  if (!records?.createEmailEvent) return;
  try {
    await records.createEmailEvent(event, {
      env: options.env,
      fetchImpl: options.fetchImpl,
    });
  } catch (error) {
    if (options.throwOnLogFailure) throw error;
  }
}

function withSequenceMetadata(metadata, sequenceName, index) {
  const base = metadata ? { ...metadata } : {};
  if (sequenceName) base.sequenceName = sequenceName;
  if (sequenceName) base.sequenceStep = index + 1;
  return Object.keys(base).length ? base : undefined;
}

function buildPortalUrl(env = process.env) {
  const base = getPublicAppOrigin(env).replace(/\/$/, "");
  return base ? `${base}/portal.html` : "/portal.html";
}

function buildProjectPortalUrl(projectId, env = process.env) {
  const base = getPublicAppOrigin(env).replace(/\/$/, "");
  const path = `portal.html${projectId ? `?project=${encodeURIComponent(projectId)}` : ""}`;
  return base ? `${base}/${path}` : `/${path}`;
}

module.exports = {
  buildAdminNotificationEmail,
  buildEmailEvent,
  buildFinalDeliveryEmail,
  buildFollowUpReminderEmail,
  buildPortalCustomerEmail,
  buildPortalUrl,
  buildProjectIntakeEmailSequence,
  buildProjectPortalUrl,
  buildQuoteSentEmail,
  sendEmailSequence,
};
