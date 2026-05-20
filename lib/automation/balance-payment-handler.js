const {
  buildBalancePaymentTransition,
} = require("./project-payment-transition");
const { balancePaymentReceived } = require("./project-event-schema");

async function handleBalancePayment({
  records,
  recorder,
  orderPayment,
  input,
}) {
  if (!input.projectId)
    throw new Error("Balance payment is missing a project id.");
  if (!records.getProjectById)
    throw new Error("Balance payment requires project lookup support.");

  const project = await records.getProjectById(input.projectId);
  if (!project)
    throw new Error("Balance payment referenced an unknown project.");

  const transition = buildBalancePaymentTransition({ project, input });

  const updatedProject = await recorder.updateProject(
    project.id,
    transition.projectPatch
  );

  await recorder.createProjectEvent(
    balancePaymentReceived({
      projectId: project.id,
      orderId: orderPayment.order.id,
      paymentId: orderPayment.payment.id,
      amountPaid: transition.paymentAmount.toFixed(2),
    })
  );

  await recorder.linkOrderPaymentToProject({
    orderId: orderPayment.order.id,
    paymentId: orderPayment.payment.id,
    projectId: project.id,
  });

  return updatedProject;
}

module.exports = {
  handleBalancePayment,
};
