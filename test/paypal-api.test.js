const test = require('node:test');
const assert = require('node:assert/strict');
const createOrderRoute = require('../api/create-paypal-order');
const captureRoute = require('../api/capture-paypal-order');
const { calculateOrder } = require('../lib/checkout/pricing');

const {
  buildOrderMetadata,
  parseOrderMetadata,
} = createOrderRoute._private;

test('PayPal metadata stays compact and round-trips into server pricing input', () => {
  const orderSummary = calculateOrder({
    baseServiceId: 'mixMaster',
    songCount: 10,
    selectedAddOns: [
      { addOnId: 'extraRevision', quantity: 2 },
      { addOnId: 'lightVocalEditing', quantity: 1 },
      { addOnId: 'cleanRadioEdit', quantity: 1 },
      { addOnId: 'instrumentalAcapella', quantity: 1 },
      { addOnId: 'extraStems', quantity: 3 },
      { addOnId: 'rushDelivery', quantity: 1 },
      { addOnId: 'consultation', quantity: 1 },
    ],
    paymentMode: 'deposit',
  });

  const metadata = buildOrderMetadata(orderSummary);
  assert.ok(metadata.length <= 127);
  assert.deepEqual(parseOrderMetadata(metadata), {
    baseServiceId: 'mixMaster',
    songCount: '10',
    selectedAddOns: [
      { addOnId: 'extraRevision', quantity: '2' },
      { addOnId: 'lightVocalEditing', quantity: '1' },
      { addOnId: 'cleanRadioEdit', quantity: '1' },
      { addOnId: 'instrumentalAcapella', quantity: '1' },
      { addOnId: 'extraStems', quantity: '3' },
      { addOnId: 'rushDelivery', quantity: '1' },
      { addOnId: 'consultation', quantity: '1' },
    ],
    paymentMode: 'deposit',
  });
});

test('PayPal capture derives checkout summary from server-created metadata', () => {
  const orderSummary = calculateOrder({
    baseServiceId: 'mixMaster',
    songCount: 5,
    selectedAddOns: [{ addOnId: 'rushDelivery', quantity: 1 }],
    paymentMode: 'deposit',
  });

  const paypalOrder = {
    purchase_units: [
      {
        custom_id: buildOrderMetadata(orderSummary),
      },
    ],
  };

  const restored = captureRoute._private.getOrderSummaryFromPayPalOrder(paypalOrder);
  assert.equal(restored.amountDueNowCents, orderSummary.amountDueNowCents);
  assert.equal(restored.totalCents, orderSummary.totalCents);
});

test('PayPal capture rejects invalid metadata and mismatched currency amounts', () => {
  assert.throws(() => captureRoute._private.getOrderSummaryFromPayPalOrder({
    purchase_units: [{ custom_id: 'bad' }],
  }), /metadata is invalid/);

  assert.equal(captureRoute._private.capturedAmountMatches({
    purchase_units: [
      {
        payments: {
          captures: [
            { amount: { currency_code: 'EUR', value: '199.00' } },
          ],
        },
      },
    ],
  }, 19900), false);
});
