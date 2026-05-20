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

function readPaidOrderContext() {
  try {
    const data = JSON.parse(sessionStorage.getItem("dirtCatPaidOrder") || "{}");
    const summary = data.orderSummary || {};
    const customer = data.customer || {};

    return {
      name: customer.name || "",
      email: customer.email || "",
      projectName: customer.projectName || customer.songTitle || "",
      serviceLabel: summary.baseServiceLabel || "",
      paymentMode: summary.paymentMode || "",
      amountPaidLabel: summary.amountDueNowCents
        ? formatMoney(summary.amountDueNowCents)
        : "",
      paypalOrderId: data.paypalOrderId || "",
    };
  } catch (_error) {
    return {
      name: "",
      email: "",
      projectName: "",
      serviceLabel: "",
      paymentMode: "",
      amountPaidLabel: "",
      paypalOrderId: "",
    };
  }
}

function setIfEmpty(id, value) {
  const element = document.getElementById(id);
  if (!element || !value || element.value.trim()) return;
  element.value = value;
}

function setValue(id, value) {
  const element = document.getElementById(id);
  if (!element) return;
  element.value = value || "";
}

function renderSupportContext(context) {
  const container = document.getElementById("support-context-summary");
  if (!container) return;

  container.replaceChildren();

  const visibleRows = [
    ["Project", context.projectName],
    ["Service", context.serviceLabel],
    ["Paid now", context.amountPaidLabel],
    [
      "Payment mode",
      context.paymentMode === "deposit"
        ? "50% deposit"
        : context.paymentMode === "full"
          ? "Full payment"
          : "",
    ],
    ["PayPal order", context.paypalOrderId],
    ["Email", context.email],
  ].filter(([, value]) => value);

  if (!visibleRows.length) {
    const message = document.createElement("p");
    message.className = "support-context-empty";
    message.textContent =
      "No recent paid-order snapshot was found in this browser, but you can still send a support request manually.";
    container.replaceChildren(message);
    return;
  }

  visibleRows.forEach(([label, value]) =>
    appendSummaryRow(container, label, value)
  );
}

function applySupportContext(context) {
  setIfEmpty("support-name", context.name);
  setIfEmpty("support-email", context.email);
  setIfEmpty("support-project-name", context.projectName);
  setValue("support-service-label", context.serviceLabel);
  setValue("support-amount-paid-label", context.amountPaidLabel);
  setValue("support-payment-mode", context.paymentMode);
  setValue("support-order-id", context.paypalOrderId);

  const orderField = document.getElementById("support-order-field");
  if (orderField) {
    orderField.hidden = !context.paypalOrderId;
  }

  renderSupportContext(context);
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch (_error) {
    return {};
  }
}

function initProjectSupportForm() {
  const form = document.getElementById("project-support-form");
  const status = document.getElementById("project-support-status");
  if (!form || !status) return;

  const submitButton = form.querySelector('button[type="submit"]');
  const supportContext = readPaidOrderContext();
  applySupportContext(supportContext);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "Sending...";
    if (submitButton) submitButton.disabled = true;

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/public/project-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await parseJsonResponse(response);
      if (!response.ok) {
        throw new Error(
          body.error || "Unable to send project support request."
        );
      }

      form.reset();
      applySupportContext(supportContext);
      status.textContent =
        "Support request sent. Josh will follow up by email as soon as he can.";
    } catch (error) {
      status.textContent =
        error.message || "Unable to send project support request.";
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", initProjectSupportForm);
