const CHECKOUT_SERVICES = {
  mix: {
    id: 'mix',
    label: 'Mix Only',
    priceCents: 14900,
    description: 'Full stereo mix with Dirt Cat analog character and modern translation.',
  },
  master: {
    id: 'master',
    label: 'Master Only',
    priceCents: 7900,
    description: 'Final loudness, polish, and translation for an already-finished mix.',
  },
  mixMaster: {
    id: 'mixMaster',
    label: 'Mix + Master',
    priceCents: 19900,
    description: 'Complete mix plus release-ready master for one song.',
  },
  customDeposit: {
    id: 'customDeposit',
    label: 'Custom Project Deposit',
    priceCents: 25000,
    description: 'Deposit for quoted EPs, albums, or custom production work.',
    depositOnly: true,
  },
};

const CHECKOUT_ADDONS = {
  extraRevision: {
    id: 'extraRevision',
    label: 'Extra Revision',
    priceCents: 3500,
    billing: 'perSong',
    description: 'Add one more revision round to each song.',
  },
  lightVocalEditing: {
    id: 'lightVocalEditing',
    label: 'Light Vocal Tuning / Editing',
    priceCents: 5000,
    billing: 'perSong',
    description: 'Light cleanup, timing, or pitch support before the mix.',
  },
  cleanRadioEdit: {
    id: 'cleanRadioEdit',
    label: 'Clean / Radio Edit',
    priceCents: 3500,
    billing: 'perSong',
    description: 'Alternate clean edit for release or broadcast needs.',
  },
  instrumentalAcapella: {
    id: 'instrumentalAcapella',
    label: 'Instrumental / Acapella Export',
    priceCents: 2500,
    billing: 'perSong',
    description: 'Extra instrumental or acapella deliverable.',
  },
  extraStems: {
    id: 'extraStems',
    label: 'Extra Stems Pack',
    priceCents: 2500,
    billing: 'perSong',
    description: 'Additional stem batch beyond the included deliverables.',
  },
  rushDelivery: {
    id: 'rushDelivery',
    label: 'Rush Delivery',
    priceCents: 7500,
    billing: 'perProject',
    description: 'Prioritized scheduling when timing matters.',
  },
  consultation: {
    id: 'consultation',
    label: 'Consultation Call',
    priceCents: 4000,
    billing: 'perProject',
    description: 'Focused call before or during the project.',
  },
};

const checkoutState = {
  baseServiceId: 'mix',
  songCount: 1,
  selectedAddOns: [],
  paymentMode: 'full',
};

let checkoutConfigPromise = null;

function formatMoney(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function getDiscountPercent(songCount) {
  if (songCount >= 10) return 30;
  if (songCount >= 5) return 20;
  if (songCount >= 2) return 10;
  return 0;
}

function getSelectedAddOn(addOnId) {
  return checkoutState.selectedAddOns.find((entry) => entry.addOnId === addOnId);
}

function calculateClientEstimate() {
  const service = CHECKOUT_SERVICES[checkoutState.baseServiceId];
  const songCount = service.depositOnly ? 1 : checkoutState.songCount;
  const serviceSubtotalCents = service.priceCents * songCount;
  const discountPercent = service.depositOnly ? 0 : getDiscountPercent(songCount);
  const discountCents = Math.round(serviceSubtotalCents * (discountPercent / 100));
  const discountedServiceSubtotalCents = serviceSubtotalCents - discountCents;
  const selectedAddOns = service.depositOnly ? [] : checkoutState.selectedAddOns;
  const addOnLines = selectedAddOns.map((entry) => {
    const addOn = CHECKOUT_ADDONS[entry.addOnId];
    const billedUnits = addOn.billing === 'perSong' ? songCount * entry.quantity : entry.quantity;

    return {
      id: addOn.id,
      label: addOn.label,
      quantity: entry.quantity,
      billing: addOn.billing,
      billedUnits,
      totalCents: addOn.priceCents * billedUnits,
    };
  });
  const addOnSubtotalCents = addOnLines.reduce((sum, item) => sum + item.totalCents, 0);
  const totalCents = discountedServiceSubtotalCents + addOnSubtotalCents;
  const depositAllowed = !service.depositOnly && (totalCents >= 50000 || songCount >= 5);

  if (!depositAllowed || service.depositOnly) {
    checkoutState.paymentMode = 'full';
  }

  const amountDueNowCents = checkoutState.paymentMode === 'deposit'
    ? Math.round(totalCents * 0.5)
    : totalCents;

  return {
    service,
    songCount,
    serviceSubtotalCents,
    discountPercent,
    discountCents,
    addOnLines,
    addOnSubtotalCents,
    totalCents,
    depositAllowed,
    amountDueNowCents,
    remainingBalanceCents: totalCents - amountDueNowCents,
  };
}

function renderServices() {
  const container = document.getElementById('service-options');
  container.innerHTML = Object.values(CHECKOUT_SERVICES).map((service) => `
    <label class="choice-card${service.id === checkoutState.baseServiceId ? ' is-selected' : ''}">
      <input type="radio" name="baseServiceId" value="${service.id}" ${service.id === checkoutState.baseServiceId ? 'checked' : ''}>
      <span class="choice-card-label">${service.label}</span>
      <strong>${formatMoney(service.priceCents)}${service.depositOnly ? '' : ' / song'}</strong>
      <small>${service.description}</small>
    </label>
  `).join('');
}

function renderAddOns() {
  const container = document.getElementById('addon-options');
  const service = CHECKOUT_SERVICES[checkoutState.baseServiceId];

  if (service.depositOnly) {
    container.innerHTML = '<p class="field-help">Add-ons are scoped separately for custom projects. Use this deposit only after the project is quoted.</p>';
    return;
  }

  container.innerHTML = Object.values(CHECKOUT_ADDONS).map((addOn) => {
    const selected = getSelectedAddOn(addOn.id);
    const billingLabel = addOn.billing === 'perSong' ? 'per song' : 'per project';
    const quantityDisabled = addOn.billing === 'perProject' || !selected ? 'disabled' : '';

    return `
      <div class="addon-row${selected ? ' is-selected' : ''}">
        <label>
          <input type="checkbox" value="${addOn.id}" ${selected ? 'checked' : ''}>
          <span>
            <strong>${addOn.label}</strong>
            <small>${addOn.description}</small>
            <em>${formatMoney(addOn.priceCents)} ${billingLabel}</em>
          </span>
        </label>
        <input class="addon-quantity" type="number" min="1" max="50" value="${selected?.quantity || 1}" data-addon-quantity="${addOn.id}" aria-label="${addOn.label} quantity" ${quantityDisabled}>
      </div>
    `;
  }).join('');
}

function renderSummary() {
  const estimate = calculateClientEstimate();
  const lines = [
    `<div><span>${estimate.service.label} × ${estimate.songCount}</span><strong>${formatMoney(estimate.serviceSubtotalCents)}</strong></div>`,
  ];

  if (estimate.discountCents > 0) {
    lines.push(`<div class="summary-discount"><span>${estimate.discountPercent}% multi-song discount</span><strong>-${formatMoney(estimate.discountCents)}</strong></div>`);
  }

  estimate.addOnLines.forEach((line) => {
    const unitLabel = line.billing === 'perSong'
      ? `${line.quantity} × ${estimate.songCount} song${estimate.songCount === 1 ? '' : 's'}`
      : 'project add-on';
    lines.push(`<div><span>${line.label} <small>${unitLabel}</small></span><strong>${formatMoney(line.totalCents)}</strong></div>`);
  });

  lines.push(`<div class="summary-total"><span>Total</span><strong>${formatMoney(estimate.totalCents)}</strong></div>`);
  lines.push(`<div class="summary-total due-now"><span>Due now</span><strong>${formatMoney(estimate.amountDueNowCents)}</strong></div>`);

  if (estimate.remainingBalanceCents > 0) {
    lines.push(`<div><span>Remaining balance</span><strong>${formatMoney(estimate.remainingBalanceCents)}</strong></div>`);
  }

  document.getElementById('summary-lines').innerHTML = lines.join('');
  document.getElementById('payment-mode').innerHTML = estimate.depositAllowed ? `
    <p class="field-label">Payment option</p>
    <label><input type="radio" name="paymentMode" value="full" ${checkoutState.paymentMode === 'full' ? 'checked' : ''}> Pay in full</label>
    <label><input type="radio" name="paymentMode" value="deposit" ${checkoutState.paymentMode === 'deposit' ? 'checked' : ''}> Pay 50% deposit</label>
  ` : '<p>Full payment is required for this project size. Deposit checkout appears automatically for larger projects.</p>';
}

function setAddOn(addOnId, enabled) {
  checkoutState.selectedAddOns = checkoutState.selectedAddOns.filter((entry) => entry.addOnId !== addOnId);
  if (enabled) {
    checkoutState.selectedAddOns.push({ addOnId, quantity: 1 });
  }
  renderAddOns();
  renderSummary();
}

function setAddOnQuantity(addOnId, quantity) {
  const selected = getSelectedAddOn(addOnId);
  if (!selected) return;
  selected.quantity = Math.max(1, Math.min(50, Number(quantity) || 1));
  renderSummary();
}

function getCustomerPayload() {
  return {
    name: document.getElementById('customer-name').value.trim(),
    email: document.getElementById('customer-email').value.trim(),
    projectName: document.getElementById('project-name').value.trim(),
    songTitle: document.getElementById('song-title').value.trim(),
    referenceLink: document.getElementById('reference-link').value.trim(),
  };
}

function getCheckoutPayload() {
  const service = CHECKOUT_SERVICES[checkoutState.baseServiceId];
  return {
    baseServiceId: checkoutState.baseServiceId,
    songCount: service.depositOnly ? 1 : checkoutState.songCount,
    selectedAddOns: service.depositOnly ? [] : checkoutState.selectedAddOns,
    paymentMode: checkoutState.paymentMode,
    customer: getCustomerPayload(),
  };
}

function buildClientOrderSummary() {
  const estimate = calculateClientEstimate();
  return {
    baseServiceId: estimate.service.id,
    baseServiceLabel: estimate.service.label,
    songCount: estimate.songCount,
    serviceSubtotalCents: estimate.serviceSubtotalCents,
    discountEligible: !estimate.service.depositOnly,
    discountPercent: estimate.discountPercent,
    discountCents: estimate.discountCents,
    discountedServiceSubtotalCents: estimate.serviceSubtotalCents - estimate.discountCents,
    addOnLineItems: estimate.addOnLines.map((line) => ({
      id: line.id,
      label: line.label,
      billing: line.billing,
      quantity: line.quantity,
      billedUnits: line.billedUnits,
      unitPriceCents: line.billedUnits ? Math.round(line.totalCents / line.billedUnits) : 0,
      totalCents: line.totalCents,
    })),
    addOnSubtotalCents: estimate.addOnSubtotalCents,
    totalCents: estimate.totalCents,
    depositAllowed: estimate.depositAllowed,
    paymentMode: checkoutState.paymentMode,
    amountDueNowCents: 0,
    remainingBalanceCents: estimate.totalCents,
    testMode: 'no_charge_local',
  };
}

function normalizeOptionalReferenceLink() {
  const input = document.getElementById('reference-link');
  if (!input) return;
  const value = input.value.trim();
  if (!value || /^[a-z][a-z\d+.-]*:/i.test(value)) return;
  input.value = `https://${value}`;
}

function assertFormReady() {
  const form = document.getElementById('checkout-form');
  const error = document.getElementById('checkout-error');
  normalizeOptionalReferenceLink();
  if (!form.reportValidity()) {
    error.textContent = 'Please complete the required checkout details before payment.';
    throw new Error('Checkout form is incomplete.');
  }
  error.textContent = '';
}

function getCheckoutConfig() {
  if (!checkoutConfigPromise) {
    checkoutConfigPromise = fetch('/api/checkout-config').then(async (response) => {
      const config = await response.json();
      if (!response.ok) {
        throw new Error(config.error || 'Checkout configuration is unavailable.');
      }
      return config;
    });
  }
  return checkoutConfigPromise;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

async function loadPayPalSdk() {
  const config = await getCheckoutConfig();

  const params = new URLSearchParams({
    'client-id': config.paypalClientId,
    currency: config.currency || 'USD',
    intent: 'capture',
  });

  await loadScript(`https://www.paypal.com/sdk/js?${params.toString()}`);
}

async function renderPayPalButtons() {
  const buttonContainer = document.getElementById('paypal-button-container');
  buttonContainer.innerHTML = '<p class="field-help">Loading secure PayPal checkout…</p>';

  await loadPayPalSdk();

  if (!window.paypal) {
    throw new Error('PayPal checkout is not available yet.');
  }

  buttonContainer.innerHTML = '';
  window.paypal.Buttons({
    style: {
      layout: 'vertical',
      shape: 'rect',
      color: 'blue',
      label: 'pay',
    },
    async createOrder() {
      assertFormReady();
      const response = await fetch('/api/create-paypal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getCheckoutPayload()),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to create PayPal order.');
      }
      sessionStorage.setItem('dirtCatPendingOrder', JSON.stringify({
        orderSummary: data.orderSummary,
        customer: getCustomerPayload(),
      }));
      return data.id;
    },
    async onApprove(data) {
      const response = await fetch('/api/capture-paypal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: data.orderID }),
      });
      const capture = await response.json();
      if (!response.ok) {
        throw new Error(capture.error || 'Unable to capture PayPal order.');
      }
      const pending = JSON.parse(sessionStorage.getItem('dirtCatPendingOrder') || '{}');
      sessionStorage.setItem('dirtCatPaidOrder', JSON.stringify({
        ...capture,
        customer: pending.customer || getCustomerPayload(),
      }));
      window.location.href = 'success.html';
    },
    onError(error) {
      document.getElementById('checkout-error').textContent = error.message || 'PayPal checkout failed.';
    },
  }).render('#paypal-button-container');
}

function renderLocalTestCheckout(config) {
  const container = document.getElementById('test-checkout-container');
  if (!container) return;
  if (!config.localTestCheckoutEnabled) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = '<button type="button" class="btn btn-secondary" id="run-no-charge-test">Run No-Charge Test</button><p class="field-help">Local only. Skips PayPal and verifies the success flow without charging money.</p>';
  document.getElementById('run-no-charge-test')?.addEventListener('click', () => {
    try {
      assertFormReady();
      sessionStorage.setItem('dirtCatPaidOrder', JSON.stringify({
        status: 'TEST_COMPLETED',
        paypalOrderId: 'TEST-NO-CHARGE',
        orderSummary: buildClientOrderSummary(),
        customer: getCustomerPayload(),
      }));
      window.location.href = 'success.html';
    } catch (error) {
      document.getElementById('checkout-error').textContent = error.message || 'Unable to run no-charge test checkout.';
    }
  });
}

function wireEvents() {
  document.getElementById('service-options').addEventListener('change', (event) => {
    if (event.target.name !== 'baseServiceId') return;
    checkoutState.baseServiceId = event.target.value;
    if (CHECKOUT_SERVICES[checkoutState.baseServiceId].depositOnly) {
      checkoutState.songCount = 1;
      checkoutState.selectedAddOns = [];
      document.getElementById('song-count').value = '1';
    }
    renderServices();
    renderAddOns();
    renderSummary();
  });

  document.getElementById('song-count').addEventListener('input', (event) => {
    checkoutState.songCount = Math.max(1, Math.min(50, Number(event.target.value) || 1));
    renderSummary();
  });

  document.getElementById('addon-options').addEventListener('change', (event) => {
    if (event.target.matches('input[type="checkbox"]')) {
      setAddOn(event.target.value, event.target.checked);
    }
    if (event.target.matches('[data-addon-quantity]')) {
      setAddOnQuantity(event.target.dataset.addonQuantity, event.target.value);
    }
  });

  document.getElementById('addon-options').addEventListener('input', (event) => {
    if (event.target.matches('[data-addon-quantity]')) {
      setAddOnQuantity(event.target.dataset.addonQuantity, event.target.value);
    }
  });

  document.getElementById('payment-mode').addEventListener('change', (event) => {
    if (event.target.name !== 'paymentMode') return;
    checkoutState.paymentMode = event.target.value;
    renderSummary();
  });
}

async function bootstrapCheckout() {
  renderServices();
  renderAddOns();
  renderSummary();
  wireEvents();

  try {
    const config = await getCheckoutConfig();
    renderLocalTestCheckout(config);
    await renderPayPalButtons();
  } catch (error) {
    document.getElementById('paypal-button-container').innerHTML = '';
    document.getElementById('checkout-error').textContent = error.message || 'Checkout is unavailable.';
  }
}

document.addEventListener('DOMContentLoaded', bootstrapCheckout);
