const test = require("node:test");
const assert = require("node:assert/strict");
const createOrderRoute = require("../api/create-paypal-order");
const captureRoute = require("../api/capture-paypal-order");
const checkoutConfigRoute = require("../api/checkout-config");
const { calculateOrder } = require("../lib/checkout/pricing");

const { createPaypalOrderHandler } = createOrderRoute;
const { createPaypalCaptureHandler } = captureRoute;
const {
  buildOrderMetadata,
  createPaypalOrder,
  normalizeQuotePaymentInput,
  parseOrderMetadata,
  readJsonBody,
} = createOrderRoute._private;

test("PayPal metadata stays compact and round-trips into server pricing input", () => {
  const orderSummary = calculateOrder({
    baseServiceId: "mixMaster",
    songCount: 10,
    selectedAddOns: [
      { addOnId: "extraRevision", quantity: 2 },
      { addOnId: "lightVocalEditing", quantity: 1 },
      { addOnId: "cleanRadioEdit", quantity: 1 },
      { addOnId: "instrumentalAcapella", quantity: 1 },
      { addOnId: "extraStems", quantity: 3 },
      { addOnId: "rushDelivery", quantity: 1 },
      { addOnId: "consultation", quantity: 1 },
    ],
    paymentMode: "deposit",
  });

  const metadata = buildOrderMetadata(orderSummary);
  assert.ok(metadata.length <= 127);
  assert.deepEqual(parseOrderMetadata(metadata), {
    baseServiceId: "mixMaster",
    songCount: "10",
    selectedAddOns: [
      { addOnId: "extraRevision", quantity: "2" },
      { addOnId: "lightVocalEditing", quantity: "1" },
      { addOnId: "cleanRadioEdit", quantity: "1" },
      { addOnId: "instrumentalAcapella", quantity: "1" },
      { addOnId: "extraStems", quantity: "3" },
      { addOnId: "rushDelivery", quantity: "1" },
      { addOnId: "consultation", quantity: "1" },
    ],
    paymentMode: "deposit",
  });
});

test("PayPal quote metadata round-trips with quote identifiers", () => {
  const metadata = buildOrderMetadata({
    paymentPurpose: "quote",
    projectId: "project-1",
    quoteId: "quote-1",
    amountCents: 22500,
    totalCents: 45000,
  });

  assert.deepEqual(parseOrderMetadata(metadata), {
    paymentPurpose: "quote",
    projectId: "project-1",
    quoteId: "quote-1",
    amountCents: 22500,
    totalCents: 45000,
  });
});

test("PayPal balance metadata round-trips with project identifier", () => {
  const metadata = buildOrderMetadata({
    paymentPurpose: "balance",
    projectId: "project-1",
    amountCents: 22500,
    totalCents: 22500,
  });

  assert.deepEqual(parseOrderMetadata(metadata), {
    paymentPurpose: "balance",
    projectId: "project-1",
    amountCents: 22500,
    totalCents: 22500,
  });
});

test("normalize quote payment input validates quote checkout payload", () => {
  const normalized = normalizeQuotePaymentInput({
    paymentPurpose: "quote",
    projectId: "project-1",
    quoteId: "quote-1",
    amountCents: 22500,
  });

  assert.equal(normalized.paymentPurpose, "quote");
  assert.equal(normalized.amountDueNowCents, 22500);
  assert.throws(
    () =>
      normalizeQuotePaymentInput({
        paymentPurpose: "quote",
        projectId: "",
        quoteId: "quote-1",
        amountCents: 22500,
      }),
    /Quote payment requires/
  );
});

test("PayPal capture derives checkout summary from server-created metadata", () => {
  const orderSummary = calculateOrder({
    baseServiceId: "mixMaster",
    songCount: 5,
    selectedAddOns: [{ addOnId: "rushDelivery", quantity: 1 }],
    paymentMode: "deposit",
  });

  const paypalOrder = {
    purchase_units: [
      {
        custom_id: buildOrderMetadata(orderSummary),
      },
    ],
  };

  const restored =
    captureRoute._private.getOrderSummaryFromPayPalOrder(paypalOrder);
  assert.equal(restored.amountDueNowCents, orderSummary.amountDueNowCents);
  assert.equal(restored.totalCents, orderSummary.totalCents);
});

test("PayPal capture rejects invalid metadata and mismatched currency amounts", () => {
  assert.throws(
    () =>
      captureRoute._private.getOrderSummaryFromPayPalOrder({
        purchase_units: [{ custom_id: "bad" }],
      }),
    /metadata is invalid/
  );

  assert.throws(
    () =>
      captureRoute._private.getOrderSummaryFromPayPalOrder({
        purchase_units: [{ custom_id: "v1;m;1;f;;extra" }],
      }),
    /metadata is invalid/
  );

  assert.equal(
    captureRoute._private.capturedAmountMatches(
      {
        purchase_units: [
          {
            payments: {
              captures: [{ amount: { currency_code: "EUR", value: "199.00" } }],
            },
          },
        ],
      },
      19900
    ),
    false
  );
});

test("PayPal capture accepts a completed capture even when order status lags", async () => {
  const orderSummary = calculateOrder({
    baseServiceId: "mix",
    songCount: 1,
    selectedAddOns: [],
    paymentMode: "full",
  });

  const handler = createPaypalCaptureHandler({
    getEnv: () => ({
      PAYPAL_CLIENT_ID: "client-id",
      PAYPAL_CLIENT_SECRET: "client-secret",
      PAYPAL_ENV: "sandbox",
    }),
    fetch: async (url) => {
      if (String(url).endsWith("/v1/oauth2/token")) {
        return {
          ok: true,
          async json() {
            return { access_token: "token-1" };
          },
        };
      }

      return {
        ok: true,
        async json() {
          if (String(url).includes("/v2/checkout/orders/ORDER-123/capture")) {
            return {
              id: "ORDER-123",
              status: "APPROVED",
              purchase_units: [
                {
                  payments: {
                    captures: [
                      {
                        id: "CAPTURE-123",
                        status: "COMPLETED",
                        amount: {
                          currency_code: "USD",
                          value: "149.00",
                        },
                      },
                    ],
                  },
                },
              ],
            };
          }

          return {
            id: "ORDER-123",
            status: "APPROVED",
            purchase_units: [
              {
                custom_id: buildOrderMetadata(orderSummary),
                payments: {
                  captures: [],
                },
              },
            ],
          };
        },
      };
    },
  });
  const response = createMockResponse();

  await handler(
    {
      method: "POST",
      body: { orderId: "ORDER-123" },
    },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "APPROVED");
  assert.equal(response.body.orderSummary.amountDueNowCents, 14900);
});

test("PayPal capture falls back to capture-response metadata when order read omits custom_id", async () => {
  const orderSummary = calculateOrder({
    baseServiceId: "mix",
    songCount: 1,
    selectedAddOns: [],
    paymentMode: "full",
  });

  const handler = createPaypalCaptureHandler({
    getEnv: () => ({
      PAYPAL_CLIENT_ID: "client-id",
      PAYPAL_CLIENT_SECRET: "client-secret",
      PAYPAL_ENV: "sandbox",
    }),
    fetch: async (url) => {
      if (String(url).endsWith("/v1/oauth2/token")) {
        return {
          ok: true,
          async json() {
            return { access_token: "token-1" };
          },
        };
      }

      if (String(url).includes("/v2/checkout/orders/ORDER-456/capture")) {
        return {
          ok: true,
          async json() {
            return {
              id: "ORDER-456",
              status: "COMPLETED",
              purchase_units: [
                {
                  custom_id: buildOrderMetadata(orderSummary),
                  payments: {
                    captures: [
                      {
                        id: "CAPTURE-456",
                        status: "COMPLETED",
                        amount: {
                          currency_code: "USD",
                          value: "149.00",
                        },
                      },
                    ],
                  },
                },
              ],
            };
          },
        };
      }

      return {
        ok: true,
        async json() {
          return {
            id: "ORDER-456",
            status: "APPROVED",
            purchase_units: [
              {
                payments: {
                  captures: [],
                },
              },
            ],
          };
        },
      };
    },
  });
  const response = createMockResponse();

  await handler(
    {
      method: "POST",
      body: { orderId: "ORDER-456" },
    },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "COMPLETED");
  assert.equal(response.body.orderSummary.amountDueNowCents, 14900);
});

test("PayPal order payload uses server-calculated amount and compact metadata", async () => {
  const orderSummary = calculateOrder({
    baseServiceId: "mix",
    songCount: 2,
    selectedAddOns: [{ addOnId: "rushDelivery", quantity: 1 }],
    paymentMode: "full",
  });
  let paypalPayload;
  const paypalClient = {
    async post(_path, payload) {
      paypalPayload = payload;
      return { id: "ORDER-123" };
    },
  };

  await createPaypalOrder(paypalClient, orderSummary);

  assert.equal(paypalPayload.purchase_units[0].amount.value, "343.20");
  assert.equal(paypalPayload.purchase_units[0].amount.currency_code, "USD");
  assert.equal(typeof paypalPayload.purchase_units[0].custom_id, "string");
  assert.ok(paypalPayload.purchase_units[0].custom_id.length <= 127);
});

test("JSON body reader rejects oversized string bodies", async () => {
  await assert.rejects(
    () =>
      readJsonBody({
        body: `${"x".repeat(32 * 1024 + 1)}`,
      }),
    /Request body is too large/
  );
});

test("create order route returns 413 for oversized JSON bodies", async () => {
  const handler = createPaypalOrderHandler({
    fetch: async () => {
      throw new Error("fetch should not run");
    },
  });
  const response = createMockResponse();

  await handler(
    {
      method: "POST",
      body: `${"x".repeat(32 * 1024 + 1)}`,
    },
    response
  );

  assert.equal(response.statusCode, 413);
  assert.deepEqual(response.body, { error: "Request body is too large." });
});

test("checkout config exposes client id but never client secret", () => {
  const originalClientId = process.env.PAYPAL_CLIENT_ID;
  const originalSecret = process.env.PAYPAL_CLIENT_SECRET;
  const originalBypass = process.env.ALLOW_LOCAL_ADMIN_BYPASS;
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  const originalSupabasePublicKey = process.env.SUPABASE_PUBLIC_KEY;
  try {
    process.env.PAYPAL_CLIENT_ID = "public-client-id";
    process.env.PAYPAL_CLIENT_SECRET = "server-secret";
    process.env.ALLOW_LOCAL_ADMIN_BYPASS = "1";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_PUBLIC_KEY = "public-key";

    const response = createMockResponse();
    checkoutConfigRoute(
      { method: "GET", headers: { host: "localhost:3000" } },
      response
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      paypalClientId: "public-client-id",
      currency: "USD",
      localTestCheckoutEnabled: true,
      supabaseUrl: "https://project.supabase.co",
      supabasePublicKey: "public-key",
    });
    assert.equal(
      JSON.stringify(response.body).includes("server-secret"),
      false
    );
  } finally {
    if (originalClientId === undefined) {
      delete process.env.PAYPAL_CLIENT_ID;
    } else {
      process.env.PAYPAL_CLIENT_ID = originalClientId;
    }

    if (originalSecret === undefined) {
      delete process.env.PAYPAL_CLIENT_SECRET;
    } else {
      process.env.PAYPAL_CLIENT_SECRET = originalSecret;
    }

    if (originalBypass === undefined) {
      delete process.env.ALLOW_LOCAL_ADMIN_BYPASS;
    } else {
      process.env.ALLOW_LOCAL_ADMIN_BYPASS = originalBypass;
    }

    if (originalSupabaseUrl === undefined) {
      delete process.env.SUPABASE_URL;
    } else {
      process.env.SUPABASE_URL = originalSupabaseUrl;
    }

    if (originalSupabasePublicKey === undefined) {
      delete process.env.SUPABASE_PUBLIC_KEY;
    } else {
      process.env.SUPABASE_PUBLIC_KEY = originalSupabasePublicKey;
    }
  }
});

test("checkout config includes public auth config for browser clients", () => {
  const originalClientId = process.env.PAYPAL_CLIENT_ID;
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  const originalSupabasePublicKey = process.env.SUPABASE_PUBLIC_KEY;
  try {
    process.env.PAYPAL_CLIENT_ID = "public-client-id";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_PUBLIC_KEY = "public-key";

    const response = createMockResponse();
    checkoutConfigRoute(
      { method: "GET", headers: { host: "localhost:3000" } },
      response
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.paypalClientId, "public-client-id");
    assert.equal(response.body.supabaseUrl, "https://project.supabase.co");
    assert.equal(response.body.supabasePublicKey, "public-key");
  } finally {
    if (originalClientId === undefined) {
      delete process.env.PAYPAL_CLIENT_ID;
    } else {
      process.env.PAYPAL_CLIENT_ID = originalClientId;
    }

    if (originalSupabaseUrl === undefined) {
      delete process.env.SUPABASE_URL;
    } else {
      process.env.SUPABASE_URL = originalSupabaseUrl;
    }

    if (originalSupabasePublicKey === undefined) {
      delete process.env.SUPABASE_PUBLIC_KEY;
    } else {
      process.env.SUPABASE_PUBLIC_KEY = originalSupabasePublicKey;
    }
  }
});

function createMockResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}
