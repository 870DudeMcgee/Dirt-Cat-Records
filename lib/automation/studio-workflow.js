const driveDefault = require("../google/drive");
const resendDefault = require("../email/resend");
const recordsDefault = require("../db/studio-records");
const {
  buildPortalUrl,
  buildProjectIntakeEmailSequence,
  sendEmailSequence,
} = require("../email/email-sequence-choreographer");
const { routePaymentPurpose } = require("../paypal/payment-router");
const projectEvents = require("./project-event-schema");
const {
  buildCheckoutProjectTransition,
  buildQuotePaymentTransition,
} = require("./project-payment-transition");
const { createWorkflowRecorder } = require("./workflow-recorder");
const { handleBalancePayment } = require("./balance-payment-handler");

function createFreeReviewWorkflow(dependencies = {}) {
  const records = dependencies.records || recordsDefault;
  const drive = dependencies.drive || driveDefault;
  const email =
    dependencies.email ||
    createEmailAdapter(
      dependencies.resend || resendDefault,
      records,
      dependencies.env
    );
  const env = dependencies.env || process.env;

  return async function freeReviewWorkflow(input) {
    const customer = await records.upsertCustomer({
      email: input.email,
      name: input.name,
    });
    const lead = await records.createLead({
      customerId: customer.id,
      email: customer.email,
      artistName: input.artistName,
      projectTitle: input.projectTitle,
      message: input.message,
      referenceLinks: input.referenceLinks || [],
    });
    let project = await records.createProject({
      customerId: customer.id,
      leadId: lead.id,
      projectType: "free_review",
      status: "awaiting_files",
      artistName: input.artistName,
      projectTitle: input.projectTitle,
    });

    await records.createProjectEvent(
      projectEvents.freeReviewCreated({
        projectId: project.id,
        leadId: lead.id,
      })
    );

    project = await attachDriveFolders({
      records,
      drive,
      project,
      customer,
      input,
    });
    await sendSequenceWithAdapter(
      email,
      buildProjectIntakeEmailSequence({
        kind: "free_review",
        customer,
        project,
        adminEmail: env.ADMIN_EMAIL,
        portalUrl: buildPortalUrl(env),
      }),
      { sequenceName: "free_review_created" }
    );

    return { customer, lead, project };
  };
}

function createPaidProjectWorkflow(dependencies = {}) {
  const records = dependencies.records || recordsDefault;
  const drive = dependencies.drive || driveDefault;
  const email =
    dependencies.email ||
    createEmailAdapter(
      dependencies.resend || resendDefault,
      records,
      dependencies.env
    );
  const env = dependencies.env || process.env;

  return async function paidProjectWorkflow(input) {
    const customer = await records.upsertCustomer({
      email: input.buyerEmail,
      name: input.buyerName,
    });
    const orderPayment = await records.upsertPaymentAndOrder({
      customer,
      payment: input,
    });
    const recorder = createWorkflowRecorder(records);

    const paymentResult = await routePaymentPurpose(input.paymentPurpose, {
      quote: async () => {
        if (!input.quoteId || !input.projectId) return null;
        return handleQuotePayment({
          records,
          recorder,
          orderPayment,
          input,
        });
      },
      balance: async () =>
        handleBalancePayment({
          records,
          recorder,
          orderPayment,
          input,
        }),
      checkout: async () => null,
    });

    if (paymentResult) {
      return {
        customer,
        order: orderPayment.order,
        payment: orderPayment.payment,
        project: paymentResult,
      };
    }

    const existingProject = await findExistingPaidProject(
      records,
      orderPayment
    );
    if (existingProject) {
      return {
        customer,
        order: orderPayment.order,
        payment: orderPayment.payment,
        project: existingProject,
      };
    }

    let project;
    try {
      project = await records.createProject({
        ...buildCheckoutProjectTransition({
          customerId: customer.id,
          orderId: orderPayment.order.id,
          input,
        }),
      });
    } catch (error) {
      const projectCreatedConcurrently =
        /projects_order_id|duplicate key|unique/i.test(error.message || "")
          ? await findExistingPaidProject(records, orderPayment)
          : null;
      if (!projectCreatedConcurrently) throw error;
      return {
        customer,
        order: orderPayment.order,
        payment: orderPayment.payment,
        project: projectCreatedConcurrently,
      };
    }

    await recorder.createProjectEvent(
      projectEvents.paidProjectCreated({
        projectId: project.id,
        orderId: orderPayment.order.id,
        paymentId: orderPayment.payment.id,
      })
    );
    await recorder.linkOrderPaymentToProject({
      orderId: orderPayment.order.id,
      paymentId: orderPayment.payment.id,
      projectId: project.id,
    });

    project = await attachDriveFolders({
      records,
      drive,
      project,
      customer,
      input,
    });
    await sendSequenceWithAdapter(
      email,
      buildProjectIntakeEmailSequence({
        kind: "paid_project",
        customer,
        project,
        adminEmail: env.ADMIN_EMAIL,
        portalUrl: buildPortalUrl(env),
      }),
      { sequenceName: "paid_project_created" }
    );

    return {
      customer,
      order: orderPayment.order,
      payment: orderPayment.payment,
      project,
    };
  };
}

async function handleQuotePayment({ records, recorder, orderPayment, input }) {
  const quote = records.getQuoteById
    ? await records.getQuoteById(input.quoteId)
    : null;
  if (!quote) throw new Error("Quote payment referenced an unknown quote.");
  const project = records.getProjectById
    ? await records.getProjectById(input.projectId)
    : null;
  if (!project) throw new Error("Quote payment referenced an unknown project.");

  const transition = buildQuotePaymentTransition({ project, quote, input });

  const updatedProject = await recorder.updateProject(
    project.id,
    transition.projectPatch
  );

  await recorder.updateQuote(quote.id, transition.quotePatch);

  await recorder.createProjectEvent(
    projectEvents.quoteAccepted({
      projectId: project.id,
      quoteId: quote.id,
      orderId: orderPayment.order.id,
      paymentId: orderPayment.payment.id,
    })
  );

  await recorder.linkOrderPaymentToProject({
    orderId: orderPayment.order.id,
    paymentId: orderPayment.payment.id,
    projectId: project.id,
  });

  return updatedProject;
}

async function findExistingPaidProject(records, orderPayment) {
  if (orderPayment.order.project_id && records.getProjectById) {
    return records.getProjectById(orderPayment.order.project_id);
  }
  if (orderPayment.payment.project_id && records.getProjectById) {
    return records.getProjectById(orderPayment.payment.project_id);
  }
  if (records.getProjectByOrderId) {
    return records.getProjectByOrderId(orderPayment.order.id);
  }
  return null;
}

async function attachDriveFolders({
  records,
  drive,
  project,
  customer,
  input,
}) {
  try {
    const folders = await drive.createDriveProjectFolders({
      projectCode: project.project_code,
      artistName: input.artistName,
      projectTitle: input.projectTitle,
      customerEmail: customer.email,
    });
    const updatedProject = await records.updateProject(project.id, {
      drive_project_folder_id: folders.projectFolderId,
      drive_project_folder_url: folders.projectFolderUrl,
      drive_upload_folder_id: folders.uploadFolderId,
      drive_upload_folder_url: folders.uploadFolderUrl,
      drive_finals_folder_id: folders.finalsFolderId,
      drive_finals_folder_url: folders.finalsFolderUrl,
    });

    if (folders.uploadFolderShareSkippedReason) {
      await records.createProjectEvent(
        projectEvents.driveShareSkipped({
          projectId: project.id,
          reason: folders.uploadFolderShareSkippedReason,
          customerEmail: customer.email,
        })
      );
    }

    return updatedProject;
  } catch (error) {
    await records.createProjectEvent(
      projectEvents.driveFailed({ projectId: project.id, error })
    );
    return project;
  }
}

function createEmailAdapter(resend, records, env = process.env) {
  return {
    async sendSequence(messages, options = {}) {
      return sendEmailSequence({
        records,
        sendEmail: (message, sendOptions) =>
          resend.sendStudioEmail(message, sendOptions),
        messages,
        sequenceName: options.sequenceName,
        env,
      });
    },
    async sendCustomerEmail(to, emailType, data) {
      return sendSingleEmailThroughSequence({
        resend,
        records,
        env,
        message: { to, emailType, data },
      });
    },
    async sendAdminEmail(subject, text) {
      return sendSingleEmailThroughSequence({
        resend,
        records,
        env,
        message: {
          to: env.ADMIN_EMAIL,
          emailType: "admin_notification",
          data: { subject, text },
        },
      });
    },
  };
}

async function sendSequenceWithAdapter(email, messages, options = {}) {
  if (email.sendSequence) return email.sendSequence(messages, options);

  for (const message of messages) {
    if (message.emailType === "admin_notification") {
      await email.sendAdminEmail(message.data.subject, message.data.text);
    } else {
      await email.sendCustomerEmail(
        message.to,
        message.emailType,
        message.data
      );
    }
  }
  return { sent: messages, failed: [] };
}

async function sendSingleEmailThroughSequence({ resend, records, env, message }) {
  const result = await sendEmailSequence({
    records,
    sendEmail: (emailMessage, sendOptions) =>
      resend.sendStudioEmail(emailMessage, sendOptions),
    messages: [message],
    env,
  });
  if (result.sent[0]) return result.sent[0].response;
  const failure = result.failed[0];
  return {
    id: null,
    failed: true,
    error: failure?.reason || "Email failed.",
  };
}

module.exports = {
  buildPortalUrl,
  createEmailAdapter,
  createFreeReviewWorkflow,
  createPaidProjectWorkflow,
};
