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

test('one song mix has no discount', () => {
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

test('two song mix receives 10 percent discount', () => {
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

test('add-ons are not discounted', () => {
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

test('deposit is 50 percent for eligible total', () => {
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

  assert.throws(() => calculateOrder({
    baseServiceId: 'mix',
    songCount: 1,
    selectedAddOns: [],
    paymentMode: 'partial',
  }), /Payment mode must be/);
});
