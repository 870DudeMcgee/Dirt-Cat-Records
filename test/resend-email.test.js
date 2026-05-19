const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildEmail,
  getResendConfig,
  sendStudioEmail,
  verifyResendSender,
} = require("../lib/email/resend");

test("buildEmail creates one-action upload instructions email", () => {
  const email = buildEmail("upload_instructions", {
    customerName: "Buyer",
    portalUrl: "https://dirtcat.test/portal.html",
    uploadFolderUrl: "https://drive.test/upload",
  });
  assert.equal(email.subject, "Send your project files to Dirt Cat Records");
  assert.match(email.text, /https:\/\/drive.test\/upload/);
});

test("getResendConfig requires server credentials", () => {
  assert.throws(() => getResendConfig({}), /Resend is not configured/);
});

test("getResendConfig falls back to ADMIN_EMAIL for reply-to", () => {
  const config = getResendConfig({
    RESEND_API_KEY: "resend-key",
    RESEND_FROM_EMAIL: "Dirt Cat Records <studio@example.com>",
    ADMIN_EMAIL: "josh@example.com",
  });

  assert.equal(config.replyTo, "josh@example.com");
});

test("sendStudioEmail posts to Resend API", async () => {
  const calls = [];
  const result = await sendStudioEmail(
    {
      to: "buyer@example.com",
      emailType: "free_review_received",
      data: {
        customerName: "Buyer",
        portalUrl: "https://dirtcat.test/portal.html",
      },
    },
    {
      env: resendEnv(),
      fetchImpl: async (url, options) => {
        calls.push({ url: String(url), body: JSON.parse(options.body) });
        return jsonResponse({ id: "email-123" });
      },
    }
  );

  assert.equal(result.id, "email-123");
  assert.equal(calls[0].body.from, "Dirt Cat Records <studio@example.com>");
  assert.equal(calls[0].body.reply_to, "josh@example.com");
});

test("verifyResendSender accepts a custom sender domain", async () => {
  const result = await verifyResendSender({ env: resendEnv() });

  assert.equal(result.status, "skipped");
  assert.match(result.detail, /example.com/);
  assert.match(result.detail, /send and receive/);
});

test("verifyResendSender rejects a public inbox sender domain", async () => {
  await assert.rejects(
    () =>
      verifyResendSender({
        env: {
          ...resendEnv(),
          RESEND_FROM_EMAIL: "Dirt Cat Records <studio@gmail.com>",
        },
      }),
    /send and receive configured; public inbox domains like gmail\.com are not valid senders/
  );
});

function resendEnv() {
  return {
    RESEND_API_KEY: "resend-key",
    RESEND_FROM_EMAIL: "Dirt Cat Records <studio@example.com>",
    RESEND_REPLY_TO_EMAIL: "josh@example.com",
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}
