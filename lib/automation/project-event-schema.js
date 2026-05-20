const PROJECT_EVENT_TYPES = Object.freeze({
  FREE_REVIEW_CREATED: "free_review_created",
  PAID_PROJECT_CREATED: "paid_project_created",
  QUOTE_ACCEPTED: "quote_accepted",
  BALANCE_PAYMENT_RECEIVED: "balance_payment_received",
  FILES_SUBMITTED: "files_submitted",
  REVISION_REQUESTED: "revision_requested",
  FINAL_APPROVED: "final_approved",
  QUOTE_CHECKOUT_STARTED: "quote_checkout_started",
  BALANCE_CHECKOUT_STARTED: "balance_checkout_started",
  DRIVE_SHARE_SKIPPED: "drive_share_skipped",
  DRIVE_FAILED: "drive_failed",
  FOLLOWUP_JOB_ENQUEUED: "followup_job_enqueued",
  FOLLOWUP_JOB_DUPLICATE_SKIPPED: "followup_job_duplicate_skipped",
  FOLLOWUP_JOB_ENQUEUE_FAILED: "followup_job_enqueue_failed",
  FOLLOWUP_DISPATCHED: "followup_dispatched",
  FOLLOWUP_DISPATCH_SKIPPED: "followup_dispatch_skipped",
  FOLLOWUP_DISPATCH_FAILED: "followup_dispatch_failed",
  ADMIN_STATUS_UPDATED: "admin_status_updated",
  ADMIN_NOTE_ADDED: "admin_note_added",
  ADMIN_DELIVERY_UPDATED: "admin_delivery_updated",
  FINAL_DELIVERY_UNLOCKED: "final_delivery_unlocked",
  ADMIN_EXTRA_REVISION_ALLOWED: "admin_extra_revision_allowed",
  ADMIN_QUOTE_CREATED: "admin_quote_created",
  ADMIN_QUOTE_SENT: "admin_quote_sent",
});

const PROJECT_EVENT_ACTORS = Object.freeze({
  ADMIN: "admin",
  CUSTOMER: "customer",
  DRIVE: "drive",
  PAYPAL: "paypal",
  SYSTEM: "system",
});

function buildProjectEvent({
  projectId,
  eventType,
  actorType,
  message,
  metadata = {},
}) {
  return {
    projectId: requireValue(projectId, "project id"),
    eventType: requireValue(eventType, "event type"),
    actorType: requireValue(actorType, "actor type"),
    message: requireValue(message, "event message"),
    metadata: metadata && typeof metadata === "object" ? metadata : {},
  };
}

function normalizeProjectEvent(event = {}) {
  return buildProjectEvent({
    projectId: event.projectId || event.project_id,
    eventType: event.eventType || event.event_type,
    actorType: event.actorType || event.actor_type,
    message: event.message,
    metadata: event.metadata || {},
  });
}

function freeReviewCreated({ projectId, leadId }) {
  return buildProjectEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.FREE_REVIEW_CREATED,
    actorType: PROJECT_EVENT_ACTORS.SYSTEM,
    message: "Free review project created.",
    metadata: { leadId },
  });
}

function paidProjectCreated({ projectId, orderId, paymentId }) {
  return buildProjectEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.PAID_PROJECT_CREATED,
    actorType: PROJECT_EVENT_ACTORS.PAYPAL,
    message: "Paid project created after payment confirmation.",
    metadata: {
      paymentPurpose: "checkout",
      orderId,
      paymentId,
    },
  });
}

function quoteAccepted({ projectId, quoteId, orderId, paymentId }) {
  return buildProjectEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.QUOTE_ACCEPTED,
    actorType: PROJECT_EVENT_ACTORS.PAYPAL,
    message: "Quote payment completed and project converted to paid.",
    metadata: {
      paymentPurpose: "quote",
      quoteId,
      orderId,
      paymentId,
    },
  });
}

function balancePaymentReceived({ projectId, orderId, paymentId, amountPaid }) {
  return buildProjectEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.BALANCE_PAYMENT_RECEIVED,
    actorType: PROJECT_EVENT_ACTORS.PAYPAL,
    message: "Balance payment completed and project financials were updated.",
    metadata: {
      paymentPurpose: "balance",
      orderId,
      paymentId,
      amountPaid,
    },
  });
}

function filesSubmitted({ projectId, fileId, url }) {
  return buildProjectEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.FILES_SUBMITTED,
    actorType: PROJECT_EVENT_ACTORS.CUSTOMER,
    message: "Customer submitted an external file link.",
    metadata: { fileId, url },
  });
}

function revisionRequested({ projectId, revisionId }) {
  return buildProjectEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.REVISION_REQUESTED,
    actorType: PROJECT_EVENT_ACTORS.CUSTOMER,
    message: "Customer requested a revision.",
    metadata: { revisionId },
  });
}

function finalApproved({ projectId }) {
  return buildProjectEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.FINAL_APPROVED,
    actorType: PROJECT_EVENT_ACTORS.CUSTOMER,
    message: "Customer approved the final delivery.",
    metadata: {},
  });
}

function quoteCheckoutStarted({ projectId, quoteId, paypalOrderId }) {
  return buildProjectEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.QUOTE_CHECKOUT_STARTED,
    actorType: PROJECT_EVENT_ACTORS.CUSTOMER,
    message: "Customer started quote checkout.",
    metadata: { quoteId, paypalOrderId },
  });
}

function balanceCheckoutStarted({ projectId, paypalOrderId, balanceCents }) {
  return buildProjectEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.BALANCE_CHECKOUT_STARTED,
    actorType: PROJECT_EVENT_ACTORS.CUSTOMER,
    message: "Customer started balance checkout.",
    metadata: {
      paymentPurpose: "balance",
      paypalOrderId,
      balanceCents,
    },
  });
}

function driveShareSkipped({ projectId, reason, customerEmail }) {
  return buildProjectEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.DRIVE_SHARE_SKIPPED,
    actorType: PROJECT_EVENT_ACTORS.DRIVE,
    message: `Drive upload folder created but customer sharing was skipped: ${reason}`,
    metadata: { customerEmail },
  });
}

function driveFailed({ projectId, error }) {
  return buildProjectEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.DRIVE_FAILED,
    actorType: PROJECT_EVENT_ACTORS.DRIVE,
    message: `Drive automation failed: ${getErrorMessage(error)}`,
    metadata: {},
  });
}

function followUpJobEnqueued({ projectId, followUpType, scheduledFor, jobId }) {
  return buildFollowUpJobEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.FOLLOWUP_JOB_ENQUEUED,
    message: `Queued ${followUpType} follow-up job.`,
    followUpType,
    metadata: { scheduledFor, jobId: jobId || null },
  });
}

function followUpJobDuplicateSkipped({ projectId, followUpType }) {
  return buildFollowUpJobEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.FOLLOWUP_JOB_DUPLICATE_SKIPPED,
    message: `Skipped duplicate pending ${followUpType} follow-up job.`,
    followUpType,
  });
}

function followUpJobEnqueueFailed({ projectId, followUpType, error }) {
  return buildFollowUpJobEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.FOLLOWUP_JOB_ENQUEUE_FAILED,
    message: `Failed to queue ${followUpType} follow-up job.`,
    followUpType,
    metadata: { error: getErrorMessage(error) },
  });
}

function followUpDispatched({
  projectId,
  followUpJobId,
  followUpType,
  recipient,
}) {
  return buildFollowUpDispatchEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.FOLLOWUP_DISPATCHED,
    message: `Dispatched ${followUpType} follow-up reminder.`,
    followUpJobId,
    followUpType,
    metadata: { recipient },
  });
}

function followUpDispatchSkipped({
  projectId,
  followUpJobId,
  followUpType,
  reason,
}) {
  return buildFollowUpDispatchEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.FOLLOWUP_DISPATCH_SKIPPED,
    message: `Skipped ${followUpType} follow-up dispatch (${reason}).`,
    followUpJobId,
    followUpType,
  });
}

function followUpDispatchFailed({
  projectId,
  followUpJobId,
  followUpType,
  error,
}) {
  return buildFollowUpDispatchEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.FOLLOWUP_DISPATCH_FAILED,
    message: `Failed ${followUpType} follow-up dispatch.`,
    followUpJobId,
    followUpType,
    metadata: { error: getErrorMessage(error) },
  });
}

function adminStatusUpdated({ projectId, fromStatus, toStatus, adminEmail }) {
  return buildProjectEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.ADMIN_STATUS_UPDATED,
    actorType: PROJECT_EVENT_ACTORS.ADMIN,
    message: `Project status changed from ${titleCase(fromStatus)} to ${titleCase(toStatus)}.`,
    metadata: { fromStatus, toStatus, adminEmail: adminEmail || "" },
  });
}

function adminNoteAdded({ projectId, adminEmail }) {
  return buildProjectEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.ADMIN_NOTE_ADDED,
    actorType: PROJECT_EVENT_ACTORS.ADMIN,
    message: "Admin note added.",
    metadata: { adminEmail: adminEmail || "" },
  });
}

function adminDeliveryUpdated({
  projectId,
  adminEmail,
  finalDeliveryUrl,
  unlocked,
  notifiedBalanceDue,
}) {
  return buildProjectEvent({
    projectId,
    eventType: unlocked
      ? PROJECT_EVENT_TYPES.FINAL_DELIVERY_UNLOCKED
      : PROJECT_EVENT_TYPES.ADMIN_DELIVERY_UPDATED,
    actorType: PROJECT_EVENT_ACTORS.ADMIN,
    message: unlocked
      ? "Final delivery unlocked for customer access."
      : "Final delivery updated.",
    metadata: {
      adminEmail: adminEmail || "",
      finalDeliveryUrl,
      unlocked,
      notifiedBalanceDue,
    },
  });
}

function adminExtraRevisionAllowed({
  projectId,
  adminEmail,
  extraRevisionsAllowed,
}) {
  return buildProjectEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.ADMIN_EXTRA_REVISION_ALLOWED,
    actorType: PROJECT_EVENT_ACTORS.ADMIN,
    message: "One extra revision was allowed.",
    metadata: {
      adminEmail: adminEmail || "",
      extraRevisionsAllowed,
    },
  });
}

function adminQuoteCreated({
  projectId,
  adminEmail,
  quoteId,
  finalTotalCents,
  paymentMode,
}) {
  return buildProjectEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.ADMIN_QUOTE_CREATED,
    actorType: PROJECT_EVENT_ACTORS.ADMIN,
    message: "Custom quote created.",
    metadata: {
      adminEmail: adminEmail || "",
      quoteId,
      finalTotalCents,
      paymentMode,
    },
  });
}

function adminQuoteSent({ projectId, adminEmail, quoteId, totalLabel }) {
  return buildProjectEvent({
    projectId,
    eventType: PROJECT_EVENT_TYPES.ADMIN_QUOTE_SENT,
    actorType: PROJECT_EVENT_ACTORS.ADMIN,
    message: "Custom quote sent to customer.",
    metadata: {
      adminEmail: adminEmail || "",
      quoteId,
      totalLabel,
    },
  });
}

function buildFollowUpJobEvent({
  projectId,
  eventType,
  message,
  followUpType,
  metadata = {},
}) {
  return buildProjectEvent({
    projectId,
    eventType,
    actorType: PROJECT_EVENT_ACTORS.SYSTEM,
    message,
    metadata: {
      reminderType: followUpType,
      ...metadata,
    },
  });
}

function buildFollowUpDispatchEvent({
  projectId,
  eventType,
  message,
  followUpJobId,
  followUpType,
  metadata = {},
}) {
  return buildProjectEvent({
    projectId,
    eventType,
    actorType: PROJECT_EVENT_ACTORS.SYSTEM,
    message,
    metadata: {
      followUpJobId,
      followUpType,
      ...metadata,
    },
  });
}

function getErrorMessage(error) {
  return error?.message || String(error || "unknown error");
}

function titleCase(value) {
  return String(value || "").replace(/\b\w/g, (char) => char.toUpperCase());
}

function requireValue(value, label) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing ${label}.`);
  }
  return value;
}

module.exports = {
  PROJECT_EVENT_ACTORS,
  PROJECT_EVENT_TYPES,
  adminDeliveryUpdated,
  adminExtraRevisionAllowed,
  adminNoteAdded,
  adminQuoteCreated,
  adminQuoteSent,
  adminStatusUpdated,
  balanceCheckoutStarted,
  balancePaymentReceived,
  buildProjectEvent,
  driveFailed,
  driveShareSkipped,
  filesSubmitted,
  finalApproved,
  followUpDispatched,
  followUpDispatchFailed,
  followUpDispatchSkipped,
  followUpJobDuplicateSkipped,
  followUpJobEnqueueFailed,
  followUpJobEnqueued,
  freeReviewCreated,
  normalizeProjectEvent,
  paidProjectCreated,
  quoteAccepted,
  quoteCheckoutStarted,
  revisionRequested,
};
