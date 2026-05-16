# PayPal Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a professional Vercel-hosted PayPal checkout flow with service selection, add-ons, secure server-side pricing, payment capture, and post-payment intake.

**Architecture:** Keep the current static site intact and add focused checkout pages plus Vercel Functions. The browser renders the service builder and PayPal buttons, but all trusted pricing, discount, deposit, order creation, and payment capture logic lives in server-side modules used by the API routes.

**Tech Stack:** Static HTML/CSS/JS, Node.js Vercel Functions, PayPal JavaScript SDK, PayPal Orders API, Node built-in test runner.

---

## File Structure

- Create `package.json`: npm scripts for unit tests and local Vercel development.
- Create `vercel.json`: Vercel routing/build configuration for static pages and Node API routes.
- Create `lib/checkout/pricing.js`: canonical service catalog, add-ons, discount tiers, validation, and price calculation.
- Create `test/pricing.test.js`: unit tests for checkout pricing and validation.
- Create `api/create-paypal-order.js`: Vercel Function to create PayPal orders from validated checkout selections.
- Create `api/capture-paypal-order.js`: Vercel Function to capture approved PayPal orders.
- Create `api/checkout-config.js`: Vercel Function that exposes only non-secret checkout config to the browser.
- Create `checkout.html`: guided service builder and PayPal checkout page.
- Create `checkout.js`: frontend checkout state, rendering, client-side estimate, and PayPal button integration.
- Create `success.html`: post-payment confirmation and intake page.
- Create `success.js`: reads validated order summary from session storage and handles intake form fallback.
- Modify `index.html`: add nav/CTA links to `checkout.html`, replace old PayPal `webscr` form.
- Modify `style.css`: add checkout and intake page styling using the current Dirt Cat visual language.
- Modify `README.md`: document local dev, Vercel env vars, and PayPal setup.

## Environment Variables

Required in Vercel:

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_ENV` with value `sandbox` or `live`

Frontend must receive the client ID through a non-secret endpoint or server-injected config. The client secret must never be exposed to the browser.

## Task 1: Add Project Scripts and Vercel Shape

**Files:**
- Create: `package.json`
- Create: `vercel.json`
- Modify: `README.md`

- [ ] **Step 1: Create package scripts**

Create `package.json`:

```json
{
  "name": "dirt-cat-records",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "test": "node --test",
    "check:js": "node --check spells.js && node --check checkout.js && node --check success.js && node --check api/create-paypal-order.js && node --check api/capture-paypal-order.js && node --check lib/checkout/pricing.js",
    "dev": "vercel dev"
  },
  "devDependencies": {}
}
```

- [ ] **Step 2: Add Vercel config**

Create `vercel.json`:

```json
{
  "version": 2
}
```

- [ ] **Step 3: Document local setup**

Append this section to `README.md`:

```markdown
## Checkout Development

The checkout flow uses static pages plus Vercel Functions.

Required Vercel environment variables:

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_ENV` set to `sandbox` or `live`

Local checks:

```bash
npm test
npm run check:js
```

Local Vercel runtime:

```bash
npm run dev
```
```

- [ ] **Step 4: Verify scripts parse**

Run:

```bash
npm test
```

Expected: `0` tests initially or no test files found once tests are added in Task 2.

- [ ] **Step 5: Commit**

```bash
git add package.json vercel.json README.md
git commit -m "chore: add Vercel checkout project structure"
```

## Task 2: Build Server-Side Pricing Module

**Files:**
- Create: `lib/checkout/pricing.js`
- Create: `test/pricing.test.js`

- [ ] **Step 1: Write pricing tests**

Create `test/pricing.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateOrder,
  SERVICES,
  ADD_ONS,
} = require('../lib/checkout/pricing');

test('catalog exposes approved base services', () => {
  assert.equal(SERVICES.mix.priceCents, 14900);
  assert.equal(SERVICES.master.priceCents, 7900);
  assert.equal(SERVICES.mixMaster.priceCents, 19900);
});

test('catalog exposes approved add-ons', () => {
  assert.equal(ADD_ONS.extraRevision.priceCents, 3500);
  assert.equal(ADD_ONS.lightVocalEditing.priceCents, 5000);
  assert.equal(ADD_ONS.cleanRadioEdit.priceCents, 3500);
  assert.equal(ADD_ONS.instrumentalAcapella.priceCents, 2500);
  assert.equal(ADD_ONS.extraStems.priceCents, 2500);
  assert.equal(ADD_ONS.rushDelivery.priceCents, 7500);
  assert.equal(ADD_ONS.consultation.priceCents, 4000);
});

test('one song mix only has no discount', () => {
  const order = calculateOrder({
    baseServiceId: 'mix',
    songCount: 1,
    selectedAddOns: [],
    paymentMode: 'full',
  });

  assert.equal(order.serviceSubtotalCents, 14900);
  assert.equal(order.discountPercent, 0);
  assert.equal(order.discountCents, 0);
  assert.equal(order.totalCents, 14900);
  assert.equal(order.amountDueNowCents, 14900);
});

test('two song mix only receives 10 percent discount', () => {
  const order = calculateOrder({
    baseServiceId: 'mix',
    songCount: 2,
    selectedAddOns: [],
    paymentMode: 'full',
  });

  assert.equal(order.serviceSubtotalCents, 29800);
  assert.equal(order.discountPercent, 10);
  assert.equal(order.discountCents, 2980);
  assert.equal(order.totalCents, 26820);
});

test('five song mix master receives 20 percent discount', () => {
  const order = calculateOrder({
    baseServiceId: 'mixMaster',
    songCount: 5,
    selectedAddOns: [],
    paymentMode: 'full',
  });

  assert.equal(order.serviceSubtotalCents, 99500);
  assert.equal(order.discountPercent, 20);
  assert.equal(order.discountCents, 19900);
  assert.equal(order.totalCents, 79600);
});

test('ten song master receives 30 percent discount', () => {
  const order = calculateOrder({
    baseServiceId: 'master',
    songCount: 10,
    selectedAddOns: [],
    paymentMode: 'full',
  });

  assert.equal(order.serviceSubtotalCents, 79000);
  assert.equal(order.discountPercent, 30);
  assert.equal(order.discountCents, 23700);
  assert.equal(order.totalCents, 55300);
});

test('add-ons are not discounted and may be per song or per project', () => {
  const order = calculateOrder({
    baseServiceId: 'mix',
    songCount: 2,
    selectedAddOns: [
      { addOnId: 'extraRevision', quantity: 1 },
      { addOnId: 'rushDelivery', quantity: 1 },
    ],
    paymentMode: 'full',
  });

  assert.equal(order.discountCents, 2980);
  assert.equal(order.addOnSubtotalCents, 14500);
  assert.equal(order.totalCents, 41320);
});

test('deposit is rejected below 500 dollars', () => {
  assert.throws(() => calculateOrder({
    baseServiceId: 'mix',
    songCount: 2,
    selectedAddOns: [],
    paymentMode: 'deposit',
  }), /Deposit is not available/);
});

test('deposit is 50 percent for eligible totals', () => {
  const order = calculateOrder({
    baseServiceId: 'mixMaster',
    songCount: 3,
    selectedAddOns: [{ addOnId: 'rushDelivery', quantity: 1 }],
    paymentMode: 'deposit',
  });

  assert.equal(order.totalCents, 61230);
  assert.equal(order.amountDueNowCents, 30615);
  assert.equal(order.remainingBalanceCents, 30615);
});

test('invalid service, song count, add-on, and quantity are rejected', () => {
  assert.throws(() => calculateOrder({
    baseServiceId: 'fake',
    songCount: 1,
    selectedAddOns: [],
    paymentMode: 'full',
  }), /Unknown base service/);

  assert.throws(() => calculateOrder({
    baseServiceId: 'mix',
    songCount: 0,
    selectedAddOns: [],
    paymentMode: 'full',
  }), /Song count must be/);

  assert.throws(() => calculateOrder({
    baseServiceId: 'mix',
    songCount: 1,
    selectedAddOns: [{ addOnId: 'fake', quantity: 1 }],
    paymentMode: 'full',
  }), /Unknown add-on/);

  assert.throws(() => calculateOrder({
    baseServiceId: 'mix',
    songCount: 1,
    selectedAddOns: [{ addOnId: 'extraRevision', quantity: 0 }],
    paymentMode: 'full',
  }), /Add-on quantity must be/);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test
```

Expected: FAIL because `lib/checkout/pricing.js` does not exist yet.

- [ ] **Step 3: Implement pricing module**

Create `lib/checkout/pricing.js`:

```js
const SERVICES = Object.freeze({
  mix: Object.freeze({
    id: 'mix',
    label: 'Mix Only',
    priceCents: 14900,
    description: 'A full stereo mix with Dirt Cat analog character and modern translation.',
  }),
  master: Object.freeze({
    id: 'master',
    label: 'Master Only',
    priceCents: 7900,
    description: 'Final loudness, polish, and translation for an already-finished mix.',
  }),
  mixMaster: Object.freeze({
    id: 'mixMaster',
    label: 'Mix + Master',
    priceCents: 19900,
    description: 'Complete mix plus release-ready master for one song.',
  }),
  customDeposit: Object.freeze({
    id: 'customDeposit',
    label: 'Custom Project Deposit',
    priceCents: 25000,
    description: 'A deposit for scoped projects, EPs, albums, or custom production work.',
    depositOnly: true,
    discountEligible: false,
  }),
});

const ADD_ONS = Object.freeze({
  extraRevision: Object.freeze({
    id: 'extraRevision',
    label: 'Extra Revision',
    priceCents: 3500,
    billing: 'perSong',
  }),
  lightVocalEditing: Object.freeze({
    id: 'lightVocalEditing',
    label: 'Light Vocal Tuning / Editing',
    priceCents: 5000,
    billing: 'perSong',
  }),
  cleanRadioEdit: Object.freeze({
    id: 'cleanRadioEdit',
    label: 'Clean / Radio Edit',
    priceCents: 3500,
    billing: 'perSong',
  }),
  instrumentalAcapella: Object.freeze({
    id: 'instrumentalAcapella',
    label: 'Instrumental / Acapella Export',
    priceCents: 2500,
    billing: 'perSong',
  }),
  extraStems: Object.freeze({
    id: 'extraStems',
    label: 'Extra Stems Pack',
    priceCents: 2500,
    billing: 'perSong',
  }),
  rushDelivery: Object.freeze({
    id: 'rushDelivery',
    label: 'Rush Delivery',
    priceCents: 7500,
    billing: 'perProject',
  }),
  consultation: Object.freeze({
    id: 'consultation',
    label: 'Consultation Call',
    priceCents: 4000,
    billing: 'perProject',
  }),
});

function getDiscountPercent(songCount) {
  if (songCount >= 10) return 30;
  if (songCount >= 5) return 20;
  if (songCount >= 2) return 10;
  return 0;
}

function normalizeSongCount(songCount) {
  const parsed = Number(songCount);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    throw new Error('Song count must be an integer between 1 and 50.');
  }
  return parsed;
}

function normalizeAddOns(selectedAddOns = []) {
  if (!Array.isArray(selectedAddOns)) {
    throw new Error('Selected add-ons must be an array.');
  }

  return selectedAddOns.map((entry) => {
    const addOn = ADD_ONS[entry.addOnId];
    if (!addOn) {
      throw new Error(`Unknown add-on: ${entry.addOnId}`);
    }

    const quantity = Number(entry.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      throw new Error('Add-on quantity must be an integer between 1 and 50.');
    }

    return { addOn, quantity };
  });
}

function calculateOrder(input) {
  const service = SERVICES[input.baseServiceId];
  if (!service) {
    throw new Error(`Unknown base service: ${input.baseServiceId}`);
  }

  const songCount = normalizeSongCount(input.songCount);
  const paymentMode = input.paymentMode || 'full';
  if (!['full', 'deposit'].includes(paymentMode)) {
    throw new Error('Payment mode must be full or deposit.');
  }

  const normalizedAddOns = normalizeAddOns(input.selectedAddOns);
  const discountEligible = service.discountEligible !== false && !service.depositOnly;
  const discountPercent = discountEligible ? getDiscountPercent(songCount) : 0;
  const serviceSubtotalCents = service.priceCents * songCount;
  const discountCents = Math.round(serviceSubtotalCents * (discountPercent / 100));
  const discountedServiceSubtotalCents = serviceSubtotalCents - discountCents;

  const addOnLineItems = normalizedAddOns.map(({ addOn, quantity }) => {
    const billedUnits = addOn.billing === 'perSong' ? songCount * quantity : quantity;
    const totalCents = addOn.priceCents * billedUnits;
    return {
      id: addOn.id,
      label: addOn.label,
      billing: addOn.billing,
      quantity,
      billedUnits,
      unitPriceCents: addOn.priceCents,
      totalCents,
    };
  });

  const addOnSubtotalCents = addOnLineItems.reduce((sum, item) => sum + item.totalCents, 0);
  const totalCents = discountedServiceSubtotalCents + addOnSubtotalCents;
  const depositAllowed = totalCents >= 50000 || songCount >= 5 || service.depositOnly;

  if (paymentMode === 'deposit' && !depositAllowed) {
    throw new Error('Deposit is not available for this order.');
  }

  const amountDueNowCents = paymentMode === 'deposit'
    ? Math.round(totalCents * 0.5)
    : totalCents;
  const remainingBalanceCents = totalCents - amountDueNowCents;

  return {
    baseServiceId: service.id,
    baseServiceLabel: service.label,
    songCount,
    serviceSubtotalCents,
    discountEligible,
    discountPercent,
    discountCents,
    discountedServiceSubtotalCents,
    addOnLineItems,
    addOnSubtotalCents,
    totalCents,
    depositAllowed,
    paymentMode,
    amountDueNowCents,
    remainingBalanceCents,
  };
}

function centsToDollars(cents) {
  return (cents / 100).toFixed(2);
}

module.exports = {
  SERVICES,
  ADD_ONS,
  calculateOrder,
  centsToDollars,
  getDiscountPercent,
};
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test
```

Expected: PASS all pricing tests.

- [ ] **Step 5: Commit**

```bash
git add lib/checkout/pricing.js test/pricing.test.js package.json
git commit -m "feat: add checkout pricing rules"
```

## Task 3: Add PayPal API Routes

**Files:**
- Create: `api/create-paypal-order.js`
- Create: `api/capture-paypal-order.js`
- Create: `api/checkout-config.js`
- Modify: `test/pricing.test.js`

- [ ] **Step 1: Add tests for amount formatting helper**

Append to `test/pricing.test.js`:

```js
const { centsToDollars } = require('../lib/checkout/pricing');

test('centsToDollars formats PayPal amounts', () => {
  assert.equal(centsToDollars(14900), '149.00');
  assert.equal(centsToDollars(30615), '306.15');
});
```

- [ ] **Step 2: Run tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Implement PayPal create order route**

Create `api/create-paypal-order.js`:

```js
const { calculateOrder, centsToDollars } = require('../lib/checkout/pricing');

const PAYPAL_BASE_URLS = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString('utf8');
  return body ? JSON.parse(body) : {};
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function getPayPalBaseUrl() {
  const env = process.env.PAYPAL_ENV || 'sandbox';
  return PAYPAL_BASE_URLS[env] || PAYPAL_BASE_URLS.sandbox;
}

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials are not configured.');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Unable to authenticate with PayPal.');
  }

  const data = await response.json();
  return data.access_token;
}

function buildPayPalOrderPayload(orderSummary, customer = {}) {
  return {
    intent: 'CAPTURE',
    purchase_units: [
      {
        description: `Dirt Cat Records - ${orderSummary.baseServiceLabel}`,
        custom_id: JSON.stringify({
          baseServiceId: orderSummary.baseServiceId,
          songCount: orderSummary.songCount,
          paymentMode: orderSummary.paymentMode,
        }),
        amount: {
          currency_code: 'USD',
          value: centsToDollars(orderSummary.amountDueNowCents),
        },
      },
    ],
    application_context: {
      brand_name: 'Dirt Cat Records',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW',
    },
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const body = await readJson(req);
    const orderSummary = calculateOrder(body);
    const accessToken = await getAccessToken();
    const paypalPayload = buildPayPalOrderPayload(orderSummary, body.customer);

    const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paypalPayload),
    });

    const paypalOrder = await response.json();
    if (!response.ok) {
      return sendJson(res, response.status, { error: 'PayPal order creation failed.', details: paypalOrder });
    }

    return sendJson(res, 200, {
      id: paypalOrder.id,
      orderSummary,
    });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
};

module.exports._private = {
  buildPayPalOrderPayload,
  getPayPalBaseUrl,
};
```

- [ ] **Step 4: Implement PayPal capture route**

Create `api/capture-paypal-order.js`:

```js
const PAYPAL_BASE_URLS = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString('utf8');
  return body ? JSON.parse(body) : {};
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function getPayPalBaseUrl() {
  const env = process.env.PAYPAL_ENV || 'sandbox';
  return PAYPAL_BASE_URLS[env] || PAYPAL_BASE_URLS.sandbox;
}

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials are not configured.');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Unable to authenticate with PayPal.');
  }

  const data = await response.json();
  return data.access_token;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const { orderId, orderSummary } = await readJson(req);
    if (!orderId || typeof orderId !== 'string') {
      throw new Error('Missing PayPal order ID.');
    }

    const accessToken = await getAccessToken();
    const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const capture = await response.json();
    if (!response.ok) {
      return sendJson(res, response.status, { error: 'PayPal capture failed.', details: capture });
    }

    if (capture.status !== 'COMPLETED') {
      return sendJson(res, 400, { error: 'PayPal order was not completed.', details: capture });
    }

    return sendJson(res, 200, {
      status: capture.status,
      paypalOrderId: capture.id,
      orderSummary,
    });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
};
```

- [ ] **Step 5: Add checkout config route**

Create `api/checkout-config.js`:

```js
function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  if (!process.env.PAYPAL_CLIENT_ID) {
    return sendJson(res, 500, { error: 'PayPal client ID is not configured.' });
  }

  return sendJson(res, 200, {
    paypalClientId: process.env.PAYPAL_CLIENT_ID,
    currency: 'USD',
  });
};
```

- [ ] **Step 6: Syntax check API routes**

Run:

```bash
npm run check:js
```

Expected: PASS once `checkout.js` and `success.js` exist. If they do not exist yet, temporarily run:

```bash
node --check api/create-paypal-order.js
node --check api/capture-paypal-order.js
node --check api/checkout-config.js
node --check lib/checkout/pricing.js
```

Expected: no syntax errors.

- [ ] **Step 7: Commit**

```bash
git add api/create-paypal-order.js api/capture-paypal-order.js api/checkout-config.js test/pricing.test.js lib/checkout/pricing.js
git commit -m "feat: add PayPal order API routes"
```

## Task 4: Build Checkout Page UI

**Files:**
- Create: `checkout.html`
- Create: `checkout.js`
- Modify: `style.css`
- Modify: `index.html`

- [ ] **Step 1: Create checkout page skeleton**

Create `checkout.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dirt Cat Records | Checkout</title>
  <meta name="description" content="Choose Dirt Cat Records mixing, mastering, and add-ons with a clear checkout breakdown before paying through PayPal." />
  <link rel="icon" type="image/x-icon" href="assets/favicon.ico?v=2" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <nav id="main-nav">
    <ul>
      <li><a href="index.html#hero-container">Home</a></li>
      <li><a href="index.html#listen">Listen</a></li>
      <li><a href="checkout.html">Checkout</a></li>
      <li><a href="index.html#fat-footer">Contact</a></li>
    </ul>
  </nav>

  <main class="checkout-page">
    <section class="checkout-hero">
      <img class="checkout-logo" src="assets/Dirt-Cat-Logo.PNG" alt="Dirt Cat Records logo" />
      <h1>Build Your Mix Project</h1>
      <p>Choose the service, song count, and add-ons. You will see the full breakdown before paying through PayPal.</p>
    </section>

    <section class="checkout-layout" aria-label="Checkout builder">
      <form id="checkout-form" class="checkout-builder">
        <fieldset class="checkout-panel">
          <legend>1. Choose Service</legend>
          <div id="service-options" class="choice-grid"></div>
        </fieldset>

        <fieldset class="checkout-panel">
          <legend>2. Song Count</legend>
          <label class="field-label" for="song-count">Number of songs</label>
          <input id="song-count" name="songCount" type="number" min="1" max="50" value="1" required />
          <p class="field-help">Multi-song discounts apply to mix/master work only.</p>
        </fieldset>

        <fieldset class="checkout-panel">
          <legend>3. Add-Ons</legend>
          <div id="addon-options" class="addon-list"></div>
        </fieldset>

        <fieldset class="checkout-panel">
          <legend>4. Project Details</legend>
          <label class="field-label" for="customer-name">Name</label>
          <input id="customer-name" name="customerName" type="text" autocomplete="name" required />

          <label class="field-label" for="customer-email">Email</label>
          <input id="customer-email" name="customerEmail" type="email" autocomplete="email" required />

          <label class="field-label" for="project-name">Artist / Project Name</label>
          <input id="project-name" name="projectName" type="text" required />

          <label class="field-label" for="song-title">Song or Project Title</label>
          <input id="song-title" name="songTitle" type="text" required />

          <label class="field-label" for="reference-link">Optional Reference Link</label>
          <input id="reference-link" name="referenceLink" type="url" />

          <label class="field-label terms-row">
            <input id="terms-confirmed" name="termsConfirmed" type="checkbox" required />
            <span>I understand the selected deliverables, turnaround, and revision terms.</span>
          </label>
        </fieldset>
      </form>

      <aside class="checkout-summary" aria-live="polite">
        <h2>Project Total</h2>
        <div id="summary-lines"></div>
        <div class="payment-mode" id="payment-mode"></div>
        <p id="checkout-error" class="checkout-error" role="alert"></p>
        <div id="paypal-button-container"></div>
      </aside>
    </section>
  </main>

  <script src="checkout.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create frontend checkout script**

Create `checkout.js`:

```js
const CHECKOUT_SERVICES = {
  mix: { id: 'mix', label: 'Mix Only', priceCents: 14900, description: 'Full stereo mix with analog character and modern translation.' },
  master: { id: 'master', label: 'Master Only', priceCents: 7900, description: 'Final polish and translation for an already-finished mix.' },
  mixMaster: { id: 'mixMaster', label: 'Mix + Master', priceCents: 19900, description: 'Full mix plus release-ready master.' },
  customDeposit: { id: 'customDeposit', label: 'Custom Project Deposit', priceCents: 25000, description: 'Deposit for larger scoped projects.', depositOnly: true },
};

const CHECKOUT_ADDONS = {
  extraRevision: { id: 'extraRevision', label: 'Extra Revision', priceCents: 3500, billing: 'perSong' },
  lightVocalEditing: { id: 'lightVocalEditing', label: 'Light Vocal Tuning / Editing', priceCents: 5000, billing: 'perSong' },
  cleanRadioEdit: { id: 'cleanRadioEdit', label: 'Clean / Radio Edit', priceCents: 3500, billing: 'perSong' },
  instrumentalAcapella: { id: 'instrumentalAcapella', label: 'Instrumental / Acapella Export', priceCents: 2500, billing: 'perSong' },
  extraStems: { id: 'extraStems', label: 'Extra Stems Pack', priceCents: 2500, billing: 'perSong' },
  rushDelivery: { id: 'rushDelivery', label: 'Rush Delivery', priceCents: 7500, billing: 'perProject' },
  consultation: { id: 'consultation', label: 'Consultation Call', priceCents: 4000, billing: 'perProject' },
};

const checkoutState = {
  baseServiceId: 'mix',
  songCount: 1,
  selectedAddOns: [],
  paymentMode: 'full',
};

function formatMoney(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function getDiscountPercent(songCount) {
  if (songCount >= 10) return 30;
  if (songCount >= 5) return 20;
  if (songCount >= 2) return 10;
  return 0;
}

function calculateClientEstimate() {
  const service = CHECKOUT_SERVICES[checkoutState.baseServiceId];
  const songCount = checkoutState.songCount;
  const serviceSubtotalCents = service.priceCents * songCount;
  const discountPercent = service.depositOnly ? 0 : getDiscountPercent(songCount);
  const discountCents = Math.round(serviceSubtotalCents * (discountPercent / 100));
  const discountedServiceSubtotalCents = serviceSubtotalCents - discountCents;
  const addOnLines = checkoutState.selectedAddOns.map((entry) => {
    const addOn = CHECKOUT_ADDONS[entry.addOnId];
    const billedUnits = addOn.billing === 'perSong' ? songCount * entry.quantity : entry.quantity;
    return {
      label: addOn.label,
      totalCents: addOn.priceCents * billedUnits,
      billing: addOn.billing,
      quantity: entry.quantity,
    };
  });
  const addOnSubtotalCents = addOnLines.reduce((sum, item) => sum + item.totalCents, 0);
  const totalCents = discountedServiceSubtotalCents + addOnSubtotalCents;
  const depositAllowed = totalCents >= 50000 || songCount >= 5 || service.depositOnly;
  if (!depositAllowed) checkoutState.paymentMode = 'full';
  const amountDueNowCents = checkoutState.paymentMode === 'deposit' ? Math.round(totalCents * 0.5) : totalCents;
  return { service, serviceSubtotalCents, discountPercent, discountCents, addOnLines, addOnSubtotalCents, totalCents, depositAllowed, amountDueNowCents };
}

function getSelectedAddOn(addOnId) {
  return checkoutState.selectedAddOns.find((entry) => entry.addOnId === addOnId);
}

function setAddOn(addOnId, enabled) {
  checkoutState.selectedAddOns = checkoutState.selectedAddOns.filter((entry) => entry.addOnId !== addOnId);
  if (enabled) checkoutState.selectedAddOns.push({ addOnId, quantity: 1 });
  renderSummary();
}

function renderServices() {
  const container = document.getElementById('service-options');
  container.innerHTML = Object.values(CHECKOUT_SERVICES).map((service) => `
    <label class="choice-card">
      <input type="radio" name="baseServiceId" value="${service.id}" ${service.id === checkoutState.baseServiceId ? 'checked' : ''}>
      <strong>${service.label}</strong>
      <span>${formatMoney(service.priceCents)}${service.depositOnly ? '' : ' / song'}</span>
      <small>${service.description}</small>
    </label>
  `).join('');
}

function renderAddOns() {
  const container = document.getElementById('addon-options');
  container.innerHTML = Object.values(CHECKOUT_ADDONS).map((addOn) => `
    <label class="addon-row">
      <input type="checkbox" value="${addOn.id}" ${getSelectedAddOn(addOn.id) ? 'checked' : ''}>
      <span>
        <strong>${addOn.label}</strong>
        <small>${formatMoney(addOn.priceCents)} ${addOn.billing === 'perSong' ? 'per song' : 'per project'}</small>
      </span>
    </label>
  `).join('');
}

function renderSummary() {
  const estimate = calculateClientEstimate();
  const lines = [
    `<div><span>${estimate.service.label} x ${checkoutState.songCount}</span><strong>${formatMoney(estimate.serviceSubtotalCents)}</strong></div>`,
  ];
  if (estimate.discountCents > 0) {
    lines.push(`<div><span>${estimate.discountPercent}% multi-song discount</span><strong>-${formatMoney(estimate.discountCents)}</strong></div>`);
  }
  estimate.addOnLines.forEach((line) => {
    lines.push(`<div><span>${line.label}</span><strong>${formatMoney(line.totalCents)}</strong></div>`);
  });
  lines.push(`<div class="summary-total"><span>Total</span><strong>${formatMoney(estimate.totalCents)}</strong></div>`);
  lines.push(`<div class="summary-total due-now"><span>Due now</span><strong>${formatMoney(estimate.amountDueNowCents)}</strong></div>`);
  document.getElementById('summary-lines').innerHTML = lines.join('');

  document.getElementById('payment-mode').innerHTML = estimate.depositAllowed ? `
    <label><input type="radio" name="paymentMode" value="full" ${checkoutState.paymentMode === 'full' ? 'checked' : ''}> Pay in full</label>
    <label><input type="radio" name="paymentMode" value="deposit" ${checkoutState.paymentMode === 'deposit' ? 'checked' : ''}> Pay 50% deposit</label>
  ` : '<p>Full payment is required for this project size.</p>';
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

function wireEvents() {
  document.getElementById('service-options').addEventListener('change', (event) => {
    checkoutState.baseServiceId = event.target.value;
    renderSummary();
  });
  document.getElementById('song-count').addEventListener('input', (event) => {
    checkoutState.songCount = Math.max(1, Math.min(50, Number(event.target.value) || 1));
    renderSummary();
  });
  document.getElementById('addon-options').addEventListener('change', (event) => {
    setAddOn(event.target.value, event.target.checked);
  });
  document.getElementById('payment-mode').addEventListener('change', (event) => {
    checkoutState.paymentMode = event.target.value;
    renderSummary();
  });
}

function bootstrapCheckout() {
  renderServices();
  renderAddOns();
  renderSummary();
  wireEvents();
}

document.addEventListener('DOMContentLoaded', bootstrapCheckout);
```

- [ ] **Step 3: Add checkout CSS**

Append to `style.css`:

```css
.checkout-page {
  min-height: 100vh;
  padding: 7rem 2vw 4rem;
  position: relative;
  z-index: 1;
}

.checkout-hero {
  max-width: 900px;
  margin: 0 auto 3rem;
  text-align: center;
}

.checkout-logo {
  max-width: 180px;
  filter: drop-shadow(0 0 15px magenta) drop-shadow(0 0 28px darkmagenta);
}

.checkout-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
  align-items: start;
}

.checkout-builder,
.checkout-summary {
  background: rgba(20, 20, 25, 0.48);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(107, 217, 255, 0.18);
  border-radius: 20px;
  box-shadow: 0 16px 42px rgba(0,0,0,0.7), 0 0 24px rgba(138,43,226,0.24);
}

.checkout-builder {
  padding: 1.5rem;
}

.checkout-panel {
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  margin: 0 0 1rem;
  padding: 1.25rem;
}

.checkout-panel legend {
  padding: 0 0.5rem;
  font-weight: 900;
  color: #fff;
}

.choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.choice-card,
.addon-row {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid rgba(107,217,255,0.18);
  border-radius: 14px;
  background: rgba(0,0,0,0.3);
  cursor: pointer;
}

.choice-card {
  flex-direction: column;
}

.choice-card:has(input:checked),
.addon-row:has(input:checked) {
  border-color: rgba(255,0,255,0.58);
  box-shadow: 0 0 18px rgba(255,0,255,0.22);
}

.field-label {
  display: block;
  margin: 0.75rem 0 0.35rem;
  font-weight: 800;
}

.field-help {
  margin: 0.5rem 0 0;
  color: rgba(225,232,248,0.72);
}

.terms-row {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
}

.checkout-summary {
  position: sticky;
  top: 90px;
  padding: 1.5rem;
}

#summary-lines > div,
.payment-mode label {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.summary-total {
  font-size: 1.1rem;
}

.due-now strong {
  color: #6bd9ff;
  text-shadow: 0 0 14px rgba(107,217,255,0.6);
}

.checkout-error {
  color: #ff9adf;
  min-height: 1.4rem;
}

@media (max-width: 900px) {
  .checkout-layout,
  .choice-grid {
    grid-template-columns: 1fr;
  }

  .checkout-summary {
    position: static;
  }
}
```

- [ ] **Step 4: Link checkout from homepage**

Modify `index.html`:

```html
<li><a href="checkout.html">Checkout</a></li>
```

Replace the old PayPal form button in the starter package card with:

```html
<a href="checkout.html" class="btn btn-primary">Build Your Project</a>
```

- [ ] **Step 5: Syntax check frontend script**

Run:

```bash
node --check checkout.js
```

Expected: no syntax errors.

- [ ] **Step 6: Commit**

```bash
git add checkout.html checkout.js style.css index.html
git commit -m "feat: add checkout builder page"
```

## Task 5: Integrate PayPal Buttons

**Files:**
- Modify: `checkout.html`
- Modify: `checkout.js`
- Modify: `api/create-paypal-order.js`
- Modify: `api/capture-paypal-order.js`

- [ ] **Step 1: Add PayPal SDK mount point**

Modify `checkout.html` before `checkout.js` so the SDK is loaded dynamically by `checkout.js` after reading `/api/checkout-config`:

```html
<script src="checkout.js"></script>
```

- [ ] **Step 2: Add PayPal button rendering**

Append to `checkout.js`:

```js
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
  const response = await fetch('/api/checkout-config');
  const config = await response.json();
  if (!response.ok) {
    throw new Error(config.error || 'Checkout configuration is unavailable.');
  }

  const params = new URLSearchParams({
    'client-id': config.paypalClientId,
    currency: config.currency || 'USD',
  });

  await loadScript(`https://www.paypal.com/sdk/js?${params.toString()}`);
}

function getCheckoutPayload() {
  return {
    baseServiceId: checkoutState.baseServiceId,
    songCount: checkoutState.songCount,
    selectedAddOns: checkoutState.selectedAddOns,
    paymentMode: checkoutState.paymentMode,
    customer: getCustomerPayload(),
  };
}

function assertFormReady() {
  const form = document.getElementById('checkout-form');
  const error = document.getElementById('checkout-error');
  if (!form.reportValidity()) {
    error.textContent = 'Please complete the required checkout details before payment.';
    throw new Error('Checkout form is incomplete.');
  }
  error.textContent = '';
}

async function renderPayPalButtons() {
  await loadPayPalSdk();

  if (!window.paypal) {
    document.getElementById('checkout-error').textContent = 'PayPal checkout is not available yet.';
    return;
  }

  window.paypal.Buttons({
    async createOrder() {
      assertFormReady();
      const response = await fetch('/api/create-paypal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getCheckoutPayload()),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create PayPal order.');
      sessionStorage.setItem('dirtCatPendingOrder', JSON.stringify(data.orderSummary));
      return data.id;
    },
    async onApprove(data) {
      const pendingSummary = JSON.parse(sessionStorage.getItem('dirtCatPendingOrder') || '{}');
      const response = await fetch('/api/capture-paypal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: data.orderID, orderSummary: pendingSummary }),
      });
      const capture = await response.json();
      if (!response.ok) throw new Error(capture.error || 'Unable to capture PayPal order.');
      sessionStorage.setItem('dirtCatPaidOrder', JSON.stringify(capture));
      window.location.href = 'success.html';
    },
    onError(error) {
      document.getElementById('checkout-error').textContent = error.message || 'PayPal checkout failed.';
    },
  }).render('#paypal-button-container');
}
```

Modify `bootstrapCheckout()`:

```js
async function bootstrapCheckout() {
  renderServices();
  renderAddOns();
  renderSummary();
  wireEvents();
  try {
    await renderPayPalButtons();
  } catch (error) {
    document.getElementById('checkout-error').textContent = error.message;
  }
}
```

- [ ] **Step 3: Keep API amount metadata minimal**

Verify `api/create-paypal-order.js` sends only the final amount due now to PayPal and server-calculated metadata. Do not send frontend price values.

- [ ] **Step 4: Syntax checks**

Run:

```bash
npm run check:js
```

Expected: no syntax errors.

- [ ] **Step 5: Commit**

```bash
git add checkout.html checkout.js api/create-paypal-order.js api/capture-paypal-order.js
git commit -m "feat: connect checkout page to PayPal"
```

## Task 6: Build Success and Intake Page

**Files:**
- Create: `success.html`
- Create: `success.js`
- Modify: `style.css`

- [ ] **Step 1: Create success page**

Create `success.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dirt Cat Records | Project Intake</title>
  <link rel="icon" type="image/x-icon" href="assets/favicon.ico?v=2" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <nav id="main-nav">
    <ul>
      <li><a href="index.html#hero-container">Home</a></li>
      <li><a href="checkout.html">Checkout</a></li>
      <li><a href="index.html#fat-footer">Contact</a></li>
    </ul>
  </nav>

  <main class="checkout-page">
    <section class="checkout-hero">
      <img class="checkout-logo" src="assets/Dirt-Cat-Logo.PNG" alt="Dirt Cat Records logo" />
      <h1>Payment Received</h1>
      <p>Send your project links and notes so the mix can start cleanly.</p>
    </section>

    <section class="checkout-layout">
      <form id="intake-form" class="checkout-builder" action="mailto:870joshmclean@gmail.com?subject=Paid%20Project%20Intake" method="post" enctype="text/plain">
        <fieldset class="checkout-panel">
          <legend>Project Links</legend>
          <label class="field-label" for="stem-link">Stem Delivery Link</label>
          <input id="stem-link" name="Stem Link" type="url" required />

          <label class="field-label" for="rough-link">Rough Mix Link</label>
          <input id="rough-link" name="Rough Mix Link" type="url" required />

          <label class="field-label" for="reference-tracks">Reference Tracks</label>
          <textarea id="reference-tracks" name="Reference Tracks" rows="4"></textarea>

          <label class="field-label" for="deadline">Target Deadline</label>
          <input id="deadline" name="Deadline" type="text" />

          <label class="field-label" for="mix-notes">Mix Notes</label>
          <textarea id="mix-notes" name="Mix Notes" rows="7" required></textarea>
        </fieldset>

        <button type="submit" class="btn btn-primary">Send Project Intake</button>
      </form>

      <aside class="checkout-summary">
        <h2>Your Order</h2>
        <div id="paid-summary"></div>
        <p class="field-help">If this form fails, email these links and notes to 870joshmclean@gmail.com.</p>
      </aside>
    </section>
  </main>

  <script src="success.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create success script**

Create `success.js`:

```js
function formatMoney(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function renderPaidSummary() {
  const data = JSON.parse(sessionStorage.getItem('dirtCatPaidOrder') || '{}');
  const summary = data.orderSummary || {};
  const container = document.getElementById('paid-summary');

  if (!summary.baseServiceLabel) {
    container.innerHTML = '<p>Order summary is unavailable. Keep your PayPal receipt and email Dirt Cat Records if you need help.</p>';
    return;
  }

  container.innerHTML = `
    <div><span>Service</span><strong>${summary.baseServiceLabel}</strong></div>
    <div><span>Songs</span><strong>${summary.songCount}</strong></div>
    <div><span>Payment mode</span><strong>${summary.paymentMode}</strong></div>
    <div><span>Paid now</span><strong>${formatMoney(summary.amountDueNowCents)}</strong></div>
    <div><span>Remaining balance</span><strong>${formatMoney(summary.remainingBalanceCents)}</strong></div>
  `;
}

document.addEventListener('DOMContentLoaded', renderPaidSummary);
```

- [ ] **Step 3: Add intake CSS**

Append to `style.css`:

```css
#paid-summary > div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
```

- [ ] **Step 4: Syntax check**

Run:

```bash
node --check success.js
npm run check:js
```

Expected: no syntax errors.

- [ ] **Step 5: Commit**

```bash
git add success.html success.js style.css
git commit -m "feat: add paid project intake page"
```

## Task 7: Security Review and Negative Tests

**Files:**
- Modify: `test/pricing.test.js`
- Modify: `api/create-paypal-order.js`
- Modify: `api/capture-paypal-order.js`
- Modify: `api/checkout-config.js`
- Modify: `README.md`

- [ ] **Step 1: Add tampering tests**

Append to `test/pricing.test.js`:

```js
test('client supplied price fields are ignored by calculator', () => {
  const order = calculateOrder({
    baseServiceId: 'mix',
    songCount: 1,
    selectedAddOns: [],
    paymentMode: 'full',
    totalCents: 1,
    amountDueNowCents: 1,
  });

  assert.equal(order.totalCents, 14900);
  assert.equal(order.amountDueNowCents, 14900);
});
```

- [ ] **Step 2: Run tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Add README security notes**

Append to `README.md`:

```markdown
## Checkout Security Notes

- The browser displays estimated totals only.
- Vercel Functions recalculate all prices from server-side config.
- The PayPal client secret must only be stored in Vercel environment variables.
- Do not place PayPal secrets in `checkout.js`, `index.html`, or any static file.
- Intake uses links instead of file uploads for v1.
```

- [ ] **Step 4: Verify no secrets are present**

Run:

```bash
rg -n "PAYPAL_CLIENT_SECRET|client_secret|sk_|secret" .
```

Expected: only documentation and server-side environment variable references appear. No real secret values. `api/checkout-config.js` may expose `PAYPAL_CLIENT_ID` only.

- [ ] **Step 5: Commit**

```bash
git add test/pricing.test.js README.md api/create-paypal-order.js api/capture-paypal-order.js api/checkout-config.js
git commit -m "test: cover checkout price tampering"
```

## Task 8: Local Verification

**Files:**
- No expected source changes unless verification finds bugs.

- [ ] **Step 1: Run all unit tests**

Run:

```bash
npm test
```

Expected: all pricing and validation tests pass.

- [ ] **Step 2: Run syntax checks**

Run:

```bash
npm run check:js
```

Expected: all checked scripts parse.

- [ ] **Step 3: Run local Vercel dev server**

Run:

```bash
npm run dev
```

Expected: Vercel dev server starts and serves static pages plus `/api/*` routes.

- [ ] **Step 4: Manual browser verification**

Open the local Vercel URL and verify:

- `checkout.html` loads
- service selection updates summary
- song count changes discount tier
- add-ons update totals
- deposit option appears at `$500+` or 5+ songs
- deposit option is absent below `$500`
- required form fields block PayPal order creation
- `success.html` renders fallback if no paid order exists

- [ ] **Step 5: Commit verification fixes only if needed**

If bugs are found and fixed:

```bash
git add checkout.html checkout.js success.html success.js style.css api lib test README.md
git commit -m "fix: polish checkout verification issues"
```

## Task 9: Deployment Preparation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document Vercel env setup**

Add deployment notes to `README.md`:

```markdown
## Vercel Deployment Checklist

Set these environment variables in Vercel before testing live checkout:

- `PAYPAL_ENV=sandbox`
- `PAYPAL_CLIENT_ID=<sandbox client id>`
- `PAYPAL_CLIENT_SECRET=<sandbox client secret>`

After sandbox checkout works, switch production variables to live PayPal credentials:

- `PAYPAL_ENV=live`
- `PAYPAL_CLIENT_ID=<live client id>`
- `PAYPAL_CLIENT_SECRET=<live client secret>`
```

- [ ] **Step 2: Commit deployment docs**

```bash
git add README.md
git commit -m "docs: add checkout deployment checklist"
```

- [ ] **Step 3: Push branch**

Run:

```bash
git push origin main
```

Expected: push succeeds and Vercel deploys the updated site.

## Self-Review

Spec coverage:

- Dedicated checkout page: Task 4.
- Service and song count selection: Task 4.
- Add-ons and live breakdown: Task 2 and Task 4.
- PayPal API checkout through Vercel Functions: Task 3 and Task 5.
- Full payment/deposit logic: Task 2.
- Post-payment intake page: Task 6.
- Security validation: Task 2, Task 3, Task 7.
- Deployment docs: Task 9.

Implementation risk notes:

- The PayPal SDK client ID is loaded through `/api/checkout-config`; this endpoint must expose only non-secret public config.
- The capture endpoint returns the browser-provided order summary for v1 display. A stronger follow-up should store order summaries server-side before payment and retrieve them by order ID after capture.
- Rate limiting is documented in the spec but not fully implemented in v1 tasks. If abuse becomes a concern, add a small request throttle or managed protection at Vercel.

Function names and service/add-on IDs are consistent across the plan.
