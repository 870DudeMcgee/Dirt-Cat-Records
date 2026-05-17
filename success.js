function formatMoney(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function appendSummaryRow(container, label, value) {
  const row = document.createElement('div');
  const labelElement = document.createElement('span');
  const valueElement = document.createElement('strong');

  labelElement.textContent = label;
  valueElement.textContent = value;
  row.append(labelElement, valueElement);
  container.appendChild(row);
}

function renderPaidSummary() {
  const data = JSON.parse(sessionStorage.getItem('dirtCatPaidOrder') || '{}');
  const summary = data.orderSummary || {};
  const customer = data.customer || {};
  const container = document.getElementById('paid-summary');

  if (!summary.baseServiceLabel) {
    const message = document.createElement('p');
    message.textContent = 'Order summary is unavailable. Keep your PayPal receipt and email Dirt Cat Records if you need help.';
    container.replaceChildren(message);
    return;
  }

  container.replaceChildren();
  appendSummaryRow(container, 'Service', summary.baseServiceLabel);
  appendSummaryRow(container, 'Songs', String(summary.songCount));
  appendSummaryRow(container, 'Payment mode', summary.paymentMode === 'deposit' ? '50% deposit' : 'Full payment');
  appendSummaryRow(container, 'Paid now', formatMoney(summary.amountDueNowCents));
  appendSummaryRow(container, 'Remaining balance', formatMoney(summary.remainingBalanceCents));
  appendSummaryRow(container, 'Project', customer.projectName || customer.songTitle || 'Not provided');
}

document.addEventListener('DOMContentLoaded', renderPaidSummary);
