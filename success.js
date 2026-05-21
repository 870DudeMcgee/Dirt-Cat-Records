function formatMoney(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function appendSummaryRow(container, label, value) {
  const row = document.createElement("div");
  const labelElement = document.createElement("span");
  const valueElement = document.createElement("strong");

  labelElement.textContent = label;
  valueElement.textContent = value;
  row.append(labelElement, valueElement);
  container.appendChild(row);
}

function renderNoChargeCopy() {
  const kicker = document.getElementById("success-kicker");
  const title = document.getElementById("success-title");
  const copy = document.getElementById("success-copy");
  const paymentStep = document.getElementById("success-step-payment");

  if (kicker) kicker.textContent = "PROJECT STARTED";
  if (title) title.textContent = "Your Project Is Starting";
  if (copy) {
    copy.textContent =
      "Your no-charge project is in the system. Watch your email for upload instructions and a project portal link.";
  }
  if (paymentStep) {
    paymentStep.textContent =
      "Dirt Cat Records records the no-charge checkout.";
  }
}

function renderPaidSummary() {
  const data = JSON.parse(sessionStorage.getItem("dirtCatPaidOrder") || "{}");
  const summary = data.orderSummary || {};
  const customer = data.customer || {};
  const container = document.getElementById("paid-summary");

  if (summary.noChargeCheckout) {
    renderNoChargeCopy();
  }

  if (!summary.baseServiceLabel) {
    const message = document.createElement("p");
    message.textContent =
      "Order summary is unavailable. Watch your email for portal instructions and keep your PayPal receipt if you need help.";
    container.replaceChildren(message);
    return;
  }

  container.replaceChildren();
  appendSummaryRow(container, "Service", summary.baseServiceLabel);
  appendSummaryRow(container, "Songs", String(summary.songCount));
  appendSummaryRow(
    container,
    "Payment mode",
    summary.noChargeCheckout
      ? "No-charge checkout"
      : summary.paymentMode === "deposit"
        ? "50% deposit"
        : "Full payment"
  );
  appendSummaryRow(
    container,
    "Paid now",
    formatMoney(summary.amountDueNowCents)
  );
  if (summary.noChargeCheckout && Number(summary.originalTotalCents || 0) > 0) {
    appendSummaryRow(
      container,
      "Original value",
      formatMoney(summary.originalTotalCents)
    );
  }
  if (Number(summary.remainingBalanceCents || 0) > 0) {
    appendSummaryRow(
      container,
      "Remaining balance",
      formatMoney(summary.remainingBalanceCents)
    );
  }
  appendSummaryRow(
    container,
    "Project",
    customer.projectName || customer.songTitle || "Not provided"
  );
}

document.addEventListener("DOMContentLoaded", renderPaidSummary);
