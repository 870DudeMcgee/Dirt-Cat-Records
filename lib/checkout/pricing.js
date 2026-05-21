const SERVICES = Object.freeze({
  mix: Object.freeze({
    id: "mix",
    label: "Mix Only",
    priceCents: 14900,
    description:
      "A full stereo mix with Dirt Cat analog character and modern translation.",
  }),
  master: Object.freeze({
    id: "master",
    label: "Master Only",
    priceCents: 7900,
    description:
      "Final loudness, polish, and translation for an already-finished mix.",
  }),
  mixMaster: Object.freeze({
    id: "mixMaster",
    label: "Mix + Master",
    priceCents: 19900,
    description: "Complete mix plus release-ready master for one song.",
  }),
  customDeposit: Object.freeze({
    id: "customDeposit",
    label: "Custom Project Deposit",
    priceCents: 25000,
    description:
      "A deposit for scoped projects, EPs, albums, or custom production work.",
    depositOnly: true,
    discountEligible: false,
  }),
});

const ADD_ONS = Object.freeze({
  extraRevision: Object.freeze({
    id: "extraRevision",
    label: "Extra Revision",
    priceCents: 3500,
    billing: "perSong",
  }),
  lightVocalEditing: Object.freeze({
    id: "lightVocalEditing",
    label: "Light Vocal Tuning / Editing",
    priceCents: 5000,
    billing: "perSong",
  }),
  cleanRadioEdit: Object.freeze({
    id: "cleanRadioEdit",
    label: "Clean / Radio Edit",
    priceCents: 3500,
    billing: "perSong",
  }),
  instrumentalAcapella: Object.freeze({
    id: "instrumentalAcapella",
    label: "Instrumental / Acapella Export",
    priceCents: 2500,
    billing: "perSong",
  }),
  extraStems: Object.freeze({
    id: "extraStems",
    label: "Extra Stems Pack",
    priceCents: 2500,
    billing: "perSong",
  }),
});

function getCatalogItem(catalog, id, itemType) {
  if (!Object.prototype.hasOwnProperty.call(catalog, id)) {
    throw new Error(`Unknown ${itemType}: ${id}`);
  }
  return catalog[id];
}

function getDiscountPercent(songCount) {
  if (songCount >= 10) return 30;
  if (songCount >= 5) return 20;
  if (songCount >= 2) return 10;
  return 0;
}

function normalizeSongCount(songCount) {
  const parsed = Number(songCount);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    throw new Error("Song count must be an integer between 1 and 50.");
  }
  return parsed;
}

function normalizeAddOns(selectedAddOns = []) {
  if (!Array.isArray(selectedAddOns)) {
    throw new Error("Selected add-ons must be an array.");
  }

  const seenAddOns = new Set();

  return selectedAddOns.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("Add-on entry must be an object.");
    }

    if (seenAddOns.has(entry.addOnId)) {
      throw new Error(`Duplicate add-on: ${entry.addOnId}`);
    }
    seenAddOns.add(entry.addOnId);

    const addOn = getCatalogItem(ADD_ONS, entry.addOnId, "add-on");

    const quantity = Number(entry.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      throw new Error("Add-on quantity must be an integer between 1 and 50.");
    }

    if (addOn.billing === "perProject" && quantity !== 1) {
      throw new Error("Per-project add-ons must have a quantity of 1.");
    }

    return { addOn, quantity };
  });
}

function calculateOrder(input) {
  const orderInput = input || {};
  const service = getCatalogItem(
    SERVICES,
    orderInput.baseServiceId,
    "base service"
  );

  const songCount = normalizeSongCount(orderInput.songCount);
  if (service.depositOnly && songCount !== 1) {
    throw new Error("Custom project deposit must use a song count of 1.");
  }

  const paymentMode = orderInput.paymentMode || "full";
  if (!["full", "deposit"].includes(paymentMode)) {
    throw new Error("Payment mode must be full or deposit.");
  }

  const normalizedAddOns = normalizeAddOns(orderInput.selectedAddOns);
  if (service.depositOnly && normalizedAddOns.length > 0) {
    throw new Error("Custom project deposit cannot include add-ons.");
  }

  const discountEligible =
    service.discountEligible !== false && !service.depositOnly;
  const discountPercent = discountEligible ? getDiscountPercent(songCount) : 0;
  const serviceSubtotalCents = service.priceCents * songCount;
  const discountCents = Math.round(
    serviceSubtotalCents * (discountPercent / 100)
  );
  const discountedServiceSubtotalCents = serviceSubtotalCents - discountCents;

  const addOnLineItems = normalizedAddOns.map(({ addOn, quantity }) => {
    const billedUnits =
      addOn.billing === "perSong" ? songCount * quantity : quantity;
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

  const addOnSubtotalCents = addOnLineItems.reduce(
    (sum, item) => sum + item.totalCents,
    0
  );
  const totalCents = discountedServiceSubtotalCents + addOnSubtotalCents;
  const depositAllowed =
    totalCents >= 50000 || songCount >= 5 || service.depositOnly;

  if (service.depositOnly && paymentMode !== "full") {
    throw new Error(
      "Custom project deposit is already a deposit and must be paid in full."
    );
  }

  if (paymentMode === "deposit" && !depositAllowed) {
    throw new Error("Deposit is not available for this order.");
  }

  const amountDueNowCents =
    paymentMode === "deposit" ? Math.round(totalCents * 0.5) : totalCents;
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
