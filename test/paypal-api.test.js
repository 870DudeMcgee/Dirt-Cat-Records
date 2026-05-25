const test = require("node:test");
const assert = require("node:assert/strict");
const createOrderRoute = require("../lib/api/create-paypal-order");
const captureRoute = require("../lib/api/capture-paypal-order");
const checkoutConfigRoute = require("../lib/api/checkout-config");
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
    selectedAddOns: [],
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
    selectedAddOns: [{ addOnId: "extraStems", quantity: 1 }],
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

  assert.equal(paypalPayload.purchase_units[0].amount.value, "318.20");
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
  const originalFreeCode = process.env.FRIENDS_FREE_CHECKOUT_CODE;
  const originalBypass = process.env.ALLOW_LOCAL_ADMIN_BYPASS;
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  const originalSupabasePublicKey = process.env.SUPABASE_PUBLIC_KEY;
  const originalSiteUrl = process.env.SITE_URL;
  const originalPaypalEnv = process.env.PAYPAL_ENV;
  const originalWebhookId = process.env.PAYPAL_WEBHOOK_ID;
  const originalFromEmail = process.env.RESEND_FROM_EMAIL;
  const originalReplyTo = process.env.RESEND_REPLY_TO_EMAIL;
  const originalAdminEmail = process.env.ADMIN_EMAIL;
  const originalDriveFolderId = process.env.GOOGLE_DRIVE_PROJECTS_FOLDER_ID;
  try {
    process.env.PAYPAL_CLIENT_ID = "public-client-id";
    process.env.PAYPAL_CLIENT_SECRET = "server-secret";
    process.env.FRIENDS_FREE_CHECKOUT_CODE = "FRIENDS2026";
    process.env.ALLOW_LOCAL_ADMIN_BYPASS = "1";
    process.env.SITE_URL = "http://localhost:3000";
    process.env.PAYPAL_ENV = "sandbox";
    process.env.PAYPAL_WEBHOOK_ID = "5AP132285X728093B";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_PUBLIC_KEY = "public-key";
    process.env.RESEND_FROM_EMAIL =
      "Dirt Cat Records <studio@dirtcatrecords.com>";
    process.env.RESEND_REPLY_TO_EMAIL = "studio@dirtcatrecords.com";
    process.env.ADMIN_EMAIL = "870joshmclean@gmail.com";
    process.env.GOOGLE_DRIVE_PROJECTS_FOLDER_ID =
      "1dOrK3U5gNqMjMdPDvH-Vgd1oMTtxGXar";

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
      publicAppOrigin: "http://localhost:3000",
      supabaseUrl: "https://project.supabase.co",
      supabasePublicKey: "public-key",
      runtimeFingerprint: {
        siteUrl: {
          present: true,
          origin: "http://localhost:3000",
          host: "localhost:3000",
          protocol: "http",
        },
        paypalEnv: "sandbox",
        paypalClientId: {
          present: true,
          prefix: "publ",
          suffix: "t-id",
          length: 16,
        },
        paypalWebhookId: {
          present: true,
          prefix: "5AP1",
          suffix: "093B",
          length: 17,
        },
        supabaseUrl: {
          present: true,
          origin: "https://project.supabase.co",
          host: "project.supabase.co",
          protocol: "https",
        },
        supabaseProjectRef: "project",
        resendFrom: {
          present: true,
          masked: "s***@dirtcatrecords.com",
          domain: "dirtcatrecords.com",
        },
        resendReplyTo: {
          present: true,
          masked: "s***@dirtcatrecords.com",
          domain: "dirtcatrecords.com",
        },
        adminEmail: {
          present: true,
          masked: "8***@gmail.com",
          domain: "gmail.com",
        },
        googleDriveProjectsFolderId: {
          present: true,
          prefix: "1dOr",
          suffix: "GXar",
          length: 33,
        },
      },
    });
    assert.equal(
      JSON.stringify(response.body).includes("server-secret"),
      false
    );
    assert.equal(JSON.stringify(response.body).includes("FRIENDS2026"), false);
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

    if (originalFreeCode === undefined) {
      delete process.env.FRIENDS_FREE_CHECKOUT_CODE;
    } else {
      process.env.FRIENDS_FREE_CHECKOUT_CODE = originalFreeCode;
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

    if (originalSiteUrl === undefined) {
      delete process.env.SITE_URL;
    } else {
      process.env.SITE_URL = originalSiteUrl;
    }

    if (originalPaypalEnv === undefined) {
      delete process.env.PAYPAL_ENV;
    } else {
      process.env.PAYPAL_ENV = originalPaypalEnv;
    }

    if (originalWebhookId === undefined) {
      delete process.env.PAYPAL_WEBHOOK_ID;
    } else {
      process.env.PAYPAL_WEBHOOK_ID = originalWebhookId;
    }

    if (originalFromEmail === undefined) {
      delete process.env.RESEND_FROM_EMAIL;
    } else {
      process.env.RESEND_FROM_EMAIL = originalFromEmail;
    }

    if (originalReplyTo === undefined) {
      delete process.env.RESEND_REPLY_TO_EMAIL;
    } else {
      process.env.RESEND_REPLY_TO_EMAIL = originalReplyTo;
    }

    if (originalAdminEmail === undefined) {
      delete process.env.ADMIN_EMAIL;
    } else {
      process.env.ADMIN_EMAIL = originalAdminEmail;
    }

    if (originalDriveFolderId === undefined) {
      delete process.env.GOOGLE_DRIVE_PROJECTS_FOLDER_ID;
    } else {
      process.env.GOOGLE_DRIVE_PROJECTS_FOLDER_ID = originalDriveFolderId;
    }
  }
});

test("create order route starts no-charge checkout without calling PayPal", async () => {
  let workflowInput;
  const handler = createPaypalOrderHandler({
    getEnv: () => ({ FRIENDS_FREE_CHECKOUT_CODE: "FRIENDS2026" }),
    fetch: async () => {
      throw new Error("PayPal fetch should not run for no-charge checkout");
    },
    paidProjectWorkflow: async (input) => {
      workflowInput = input;
      return {
        project: { id: "project-free-1", status: "awaiting_files" },
        order: { id: "order-free-1" },
        payment: { id: "payment-free-1" },
      };
    },
    idFactory: () => "free-route-123",
  });
  const response = createMockResponse();

  await handler(
    {
      method: "POST",
      body: {
        paymentMethod: "no_charge",
        discountCode: " friends2026 ",
        baseServiceId: "mix",
        songCount: 1,
        selectedAddOns: [],
        paymentMode: "full",
        customer: {
          name: "Buyer Friend",
          email: "friend@example.com",
          projectName: "Friend Project",
          songTitle: "Song One",
        },
      },
    },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.noChargeCheckout, true);
  assert.equal(response.body.projectId, "project-free-1");
  assert.equal(response.body.orderSummary.noChargeCheckout, true);
  assert.equal(response.body.orderSummary.amountDueNowCents, 0);
  assert.equal(workflowInput.paypalTxnId, "NOCHARGE-free-route-123");
  assert.equal(workflowInput.amountDueNow, "0.00");
  assert.equal(workflowInput.remainingBalance, "0.00");
});

test("create order route rejects invalid no-charge code with generic message", async () => {
  const handler = createPaypalOrderHandler({
    getEnv: () => ({ FRIENDS_FREE_CHECKOUT_CODE: "FRIENDS2026" }),
    fetch: async () => {
      throw new Error("PayPal fetch should not run for invalid no-charge code");
    },
    paidProjectWorkflow: async () => {
      throw new Error("workflow should not run for invalid no-charge code");
    },
  });
  const response = createMockResponse();

  await handler(
    {
      method: "POST",
      body: {
        paymentMethod: "no_charge",
        discountCode: "wrong",
        baseServiceId: "mix",
        songCount: 1,
        selectedAddOns: [],
        paymentMode: "full",
        customer: {
          name: "Buyer Friend",
          email: "friend@example.com",
          projectName: "Friend Project",
          songTitle: "Song One",
        },
      },
    },
    response
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: "Discount code is not valid." });
});

test("create order route hides no-charge payload validation after valid code", async () => {
  let fetchCalled = false;
  let workflowCalled = false;
  const handler = createPaypalOrderHandler({
    getEnv: () => ({ FRIENDS_FREE_CHECKOUT_CODE: "FRIENDS2026" }),
    fetch: async () => {
      fetchCalled = true;
      throw new Error(
        "PayPal fetch should not run for invalid no-charge payload"
      );
    },
    paidProjectWorkflow: async () => {
      workflowCalled = true;
      throw new Error("workflow should not run for invalid no-charge payload");
    },
  });
  const response = createMockResponse();

  await handler(
    {
      method: "POST",
      body: {
        paymentMethod: "no_charge",
        discountCode: "friends2026",
        baseServiceId: "mix",
        songCount: 1,
        selectedAddOns: [],
        paymentMode: "full",
        customer: {
          name: "Buyer Friend",
          email: "not-an-email",
          projectName: "Friend Project",
          songTitle: "Song One",
        },
      },
    },
    response
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: "Discount code is not valid." });
  assert.equal(fetchCalled, false);
  assert.equal(workflowCalled, false);
});

test("create order route hides workflow public messages for no-charge failures", async () => {
  const handler = createPaypalOrderHandler({
    getEnv: () => ({ FRIENDS_FREE_CHECKOUT_CODE: "FRIENDS2026" }),
    fetch: async () => {
      throw new Error("PayPal fetch should not run for no-charge checkout");
    },
    paidProjectWorkflow: async () => {
      const error = new Error("internal workflow detail");
      error.statusCode = 503;
      error.publicMessage = "Customer-visible workflow detail";
      throw error;
    },
    idFactory: () => "free-route-456",
  });
  const response = createMockResponse();

  await handler(
    {
      method: "POST",
      body: {
        paymentMethod: "no_charge",
        discountCode: "friends2026",
        baseServiceId: "mix",
        songCount: 1,
        selectedAddOns: [],
        paymentMode: "full",
        customer: {
          name: "Buyer Friend",
          email: "friend@example.com",
          projectName: "Friend Project",
          songTitle: "Song One",
        },
      },
    },
    response
  );

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, {
    error: "Unable to start no-charge checkout.",
  });
});

test("checkout config includes public auth config for browser clients", () => {
  const originalClientId = process.env.PAYPAL_CLIENT_ID;
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  const originalSupabasePublicKey = process.env.SUPABASE_PUBLIC_KEY;
  const originalSiteUrl = process.env.SITE_URL;
  try {
    process.env.PAYPAL_CLIENT_ID = "public-client-id";
    process.env.SITE_URL = "http://localhost:3000";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_PUBLIC_KEY = "public-key";

    const response = createMockResponse();
    checkoutConfigRoute(
      { method: "GET", headers: { host: "localhost:3000" } },
      response
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.paypalClientId, "public-client-id");
    assert.equal(response.body.publicAppOrigin, "http://localhost:3000");
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
    if (originalSiteUrl === undefined) {
      delete process.env.SITE_URL;
    } else {
      process.env.SITE_URL = originalSiteUrl;
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
