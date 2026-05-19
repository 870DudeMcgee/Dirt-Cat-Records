const METADATA_VERSION = 'v1';

const SERVICE_METADATA_CODES = Object.freeze({
  mix: 'm',
  master: 't',
  mixMaster: 'mm',
  customDeposit: 'cd',
});

const SERVICE_IDS_BY_METADATA_CODE = Object.freeze(
  Object.fromEntries(Object.entries(SERVICE_METADATA_CODES).map(([id, code]) => [code, id])),
);

const ADD_ON_METADATA_CODES = Object.freeze({
  extraRevision: 'r',
  lightVocalEditing: 'v',
  cleanRadioEdit: 'c',
  instrumentalAcapella: 'i',
  extraStems: 's',
  rushDelivery: 'u',
  consultation: 'k',
});

const ADD_ON_IDS_BY_METADATA_CODE = Object.freeze(
  Object.fromEntries(Object.entries(ADD_ON_METADATA_CODES).map(([id, code]) => [code, id])),
);

const PAYMENT_MODE_METADATA_CODES = Object.freeze({
  full: 'f',
  deposit: 'd',
});

const PAYMENT_MODES_BY_METADATA_CODE = Object.freeze(
  Object.fromEntries(Object.entries(PAYMENT_MODE_METADATA_CODES).map(([id, code]) => [code, id])),
);

function buildOrderMetadata(orderSummary) {
  if (orderSummary && orderSummary.paymentPurpose === 'quote') {
    const quoteId = String(orderSummary.quoteId || '').trim();
    const projectId = String(orderSummary.projectId || '').trim();
    const amountCents = Number(orderSummary.amountCents);
    const totalCents = Number(orderSummary.totalCents || amountCents);
    if (!quoteId || !projectId || !Number.isInteger(amountCents) || amountCents < 1 || !Number.isInteger(totalCents) || totalCents < amountCents) {
      throw createMetadataError('Quote metadata could not be created', 500);
    }
    const metadata = ['v2', 'q', projectId, quoteId, `${amountCents}.${totalCents}`].join(';');
    if (metadata.length > 127) {
      throw createMetadataError('Checkout metadata is too large', 500);
    }
    return metadata;
  }

  const serviceCode = SERVICE_METADATA_CODES[orderSummary.baseServiceId];
  const paymentCode = PAYMENT_MODE_METADATA_CODES[orderSummary.paymentMode];
  const addOnCodes = orderSummary.addOnLineItems
    .map((item) => `${ADD_ON_METADATA_CODES[item.id]}.${item.quantity}`)
    .join(',');

  if (!serviceCode || !paymentCode || orderSummary.addOnLineItems.some((item) => !ADD_ON_METADATA_CODES[item.id])) {
    throw createMetadataError('Checkout metadata could not be created', 500);
  }

  const metadata = [
    METADATA_VERSION,
    serviceCode,
    orderSummary.songCount,
    paymentCode,
    addOnCodes,
  ].join(';');

  if (metadata.length > 127) {
    throw createMetadataError('Checkout metadata is too large', 500);
  }

  return metadata;
}

function parseOrderMetadata(metadata) {
  if (typeof metadata !== 'string' || metadata.length > 127) {
    throw createMetadataError('PayPal order metadata is invalid.', 409);
  }

  const parts = metadata.split(';');
  if (parts.length !== 5) {
    throw createMetadataError('PayPal order metadata is invalid.', 409);
  }

  if (parts[0] === 'v2' && parts[1] === 'q') {
    const [, , projectId, quoteId, amountSummaryRaw] = parts;
    const [amountCentsRaw, totalCentsRaw] = String(amountSummaryRaw || '').split('.');
    const amountCents = Number(amountCentsRaw);
    const totalCents = Number(totalCentsRaw || amountCentsRaw);
    if (!projectId || !quoteId || !Number.isInteger(amountCents) || amountCents < 1 || !Number.isInteger(totalCents) || totalCents < amountCents) {
      throw createMetadataError('PayPal order metadata is invalid.', 409);
    }
    return {
      paymentPurpose: 'quote',
      projectId,
      quoteId,
      amountCents,
      totalCents,
    };
  }

  const [version, serviceCode, songCount, paymentCode, addOnCodes] = parts;
  if (version !== METADATA_VERSION) {
    throw createMetadataError('PayPal order metadata is invalid.', 409);
  }

  const baseServiceId = SERVICE_IDS_BY_METADATA_CODE[serviceCode];
  const paymentMode = PAYMENT_MODES_BY_METADATA_CODE[paymentCode];
  if (!baseServiceId || !paymentMode) {
    throw createMetadataError('PayPal order metadata is invalid.', 409);
  }

  const selectedAddOns = addOnCodes
    ? addOnCodes.split(',').map((entry) => {
      const [addOnCode, quantity] = entry.split('.');
      const addOnId = ADD_ON_IDS_BY_METADATA_CODE[addOnCode];
      if (!addOnId) {
        throw createMetadataError('PayPal order metadata is invalid.', 409);
      }
      return { addOnId, quantity };
    })
    : [];

  return {
    baseServiceId,
    songCount,
    selectedAddOns,
    paymentMode,
  };
}

function createMetadataError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicMessage = message;
  return error;
}

module.exports = {
  buildOrderMetadata,
  parseOrderMetadata,
};
