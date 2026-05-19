const METADATA_VERSION = "v1";

const SERVICE_METADATA_CODES = Object.freeze({
  mix: "m",
  master: "t",
  mixMaster: "mm",
  customDeposit: "cd",
});

const SERVICE_IDS_BY_METADATA_CODE = Object.freeze(
  Object.fromEntries(
    Object.entries(SERVICE_METADATA_CODES).map(([id, code]) => [code, id])
  )
);

const ADD_ON_METADATA_CODES = Object.freeze({
  extraRevision: "r",
  lightVocalEditing: "v",
  cleanRadioEdit: "c",
  instrumentalAcapella: "i",
  extraStems: "s",
  rushDelivery: "u",
  consultation: "k",
});

const ADD_ON_IDS_BY_METADATA_CODE = Object.freeze(
  Object.fromEntries(
    Object.entries(ADD_ON_METADATA_CODES).map(([id, code]) => [code, id])
  )
);

const PAYMENT_MODE_METADATA_CODES = Object.freeze({
  full: "f",
  deposit: "d",
});

const PAYMENT_MODES_BY_METADATA_CODE = Object.freeze(
  Object.fromEntries(
    Object.entries(PAYMENT_MODE_METADATA_CODES).map(([id, code]) => [code, id])
  )
);

const V2_METADATA_PAYMENT_CODES = Object.freeze({
  quote: "q",
  balance: "b",
});

const V2_PAYMENT_PURPOSE_BY_CODE = Object.freeze(
  Object.fromEntries(
    Object.entries(V2_METADATA_PAYMENT_CODES).map(([key, value]) => [
      value,
      key,
    ])
  )
);

function buildOrderMetadata(orderSummary) {
  if (
    orderSummary &&
    (orderSummary.paymentPurpose === "quote" ||
      orderSummary.paymentPurpose === "balance")
  ) {
    return buildV2OrderMetadata(orderSummary);
  }

  const serviceCode = SERVICE_METADATA_CODES[orderSummary.baseServiceId];
  const paymentCode = PAYMENT_MODE_METADATA_CODES[orderSummary.paymentMode];
  const addOnCodes = orderSummary.addOnLineItems
    .map((item) => `${ADD_ON_METADATA_CODES[item.id]}.${item.quantity}`)
    .join(",");

  if (
    !serviceCode ||
    !paymentCode ||
    orderSummary.addOnLineItems.some((item) => !ADD_ON_METADATA_CODES[item.id])
  ) {
    throw createMetadataError("Checkout metadata could not be created", 500);
  }

  const metadata = [
    METADATA_VERSION,
    serviceCode,
    orderSummary.songCount,
    paymentCode,
    addOnCodes,
  ].join(";");

  if (metadata.length > 127) {
    throw createMetadataError("Checkout metadata is too large", 500);
  }

  return metadata;
}

function parseOrderMetadata(metadata) {
  if (typeof metadata !== "string" || metadata.length > 127) {
    throw createMetadataError("PayPal order metadata is invalid.", 409);
  }

  const parts = metadata.split(";");
  if (parts.length !== 5) {
    throw createMetadataError("PayPal order metadata is invalid.", 409);
  }

  if (parts[0] === "v2") {
    return parseV2OrderMetadata(parts);
  }

  const [version, serviceCode, songCount, paymentCode, addOnCodes] = parts;
  if (version !== METADATA_VERSION) {
    throw createMetadataError("PayPal order metadata is invalid.", 409);
  }

  const baseServiceId = SERVICE_IDS_BY_METADATA_CODE[serviceCode];
  const paymentMode = PAYMENT_MODES_BY_METADATA_CODE[paymentCode];
  if (!baseServiceId || !paymentMode) {
    throw createMetadataError("PayPal order metadata is invalid.", 409);
  }

  const selectedAddOns = addOnCodes
    ? addOnCodes.split(",").map((entry) => {
        const [addOnCode, quantity] = entry.split(".");
        const addOnId = ADD_ON_IDS_BY_METADATA_CODE[addOnCode];
        if (!addOnId) {
          throw createMetadataError("PayPal order metadata is invalid.", 409);
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

function buildV2OrderMetadata(orderSummary) {
  const purposeCode = V2_METADATA_PAYMENT_CODES[orderSummary.paymentPurpose];
  const projectId = String(orderSummary.projectId || "").trim();
  const quoteId = String(orderSummary.quoteId || "").trim();
  const amountCents = Number(orderSummary.amountCents);
  const totalCents = Number(orderSummary.totalCents || amountCents);
  const amountSummary = `${amountCents}.${totalCents}`;

  if (
    !purposeCode ||
    !projectId ||
    !Number.isInteger(amountCents) ||
    amountCents < 1 ||
    !Number.isInteger(totalCents) ||
    totalCents < amountCents
  ) {
    throw createMetadataError(
      `${titleCase(orderSummary.paymentPurpose)} metadata could not be created`,
      500
    );
  }

  const metadata = [
    "v2",
    purposeCode,
    projectId,
    orderSummary.paymentPurpose === "quote" ? quoteId : amountSummary,
    orderSummary.paymentPurpose === "quote" ? amountSummary : "",
  ].join(";");

  if (orderSummary.paymentPurpose === "quote" && !quoteId) {
    throw createMetadataError("Quote metadata could not be created", 500);
  }

  if (metadata.length > 127) {
    throw createMetadataError("Checkout metadata is too large", 500);
  }

  return metadata;
}

function parseV2OrderMetadata(parts) {
  const purpose = V2_PAYMENT_PURPOSE_BY_CODE[parts[1]];
  if (!purpose)
    throw createMetadataError("PayPal order metadata is invalid.", 409);

  const projectId = parts[2];
  const quoteId = purpose === "quote" ? parts[3] : null;
  const amountSummaryRaw = purpose === "quote" ? parts[4] : parts[3];
  const [amountCentsRaw, totalCentsRaw] = String(amountSummaryRaw || "").split(
    "."
  );
  const amountCents = Number(amountCentsRaw);
  const totalCents = Number(totalCentsRaw || amountCentsRaw);

  if (
    !projectId ||
    !Number.isInteger(amountCents) ||
    amountCents < 1 ||
    !Number.isInteger(totalCents) ||
    totalCents < amountCents
  ) {
    throw createMetadataError("PayPal order metadata is invalid.", 409);
  }

  if (purpose === "quote") {
    if (!quoteId)
      throw createMetadataError("PayPal order metadata is invalid.", 409);
    return {
      paymentPurpose: "quote",
      projectId,
      quoteId,
      amountCents,
      totalCents,
    };
  }

  return {
    paymentPurpose: "balance",
    projectId,
    amountCents,
    totalCents,
  };
}

function titleCase(value) {
  return String(value || "").replace(/\b\w/g, (char) => char.toUpperCase());
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
