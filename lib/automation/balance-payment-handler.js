const { getPostPaymentStatus, shouldLockDelivery } = require("./delivery-lock");

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

  const paymentAmount = Number(input.amountDueNow || input.totalAmount || 0);
  const currentAmountPaid = Number(project.amount_paid || 0);
  const currentBalanceDue = Number(project.balance_due || 0);
  const totalAmount = Number(
    project.total_amount ||
      currentAmountPaid + currentBalanceDue ||
      paymentAmount
  );

  const amountPaid = Math.max(0, currentAmountPaid + paymentAmount);
  const balanceDue = Math.max(0, currentBalanceDue - paymentAmount);

  const updatedProject = await recorder.updateProject(project.id, {
    amount_paid: amountPaid.toFixed(2),
    total_amount: totalAmount.toFixed(2),
    balance_due: balanceDue.toFixed(2),
    final_delivery_locked: shouldLockDelivery(balanceDue),
    status: getPostPaymentStatus({
      balanceDue,
      finalDeliveryUrl: project.final_delivery_url,
    }),
  });

  await recorder.createProjectEvent({
    projectId: project.id,
    eventType: "balance_payment_received",
    actorType: "paypal",
    message: "Balance payment completed and project financials were updated.",
    metadata: {
      paymentPurpose: "balance",
      orderId: orderPayment.order.id,
      paymentId: orderPayment.payment.id,
      amountPaid: paymentAmount.toFixed(2),
    },
  });

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
