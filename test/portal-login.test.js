const test = require("node:test");
const assert = require("node:assert/strict");
const {
  formatMagicLinkRateLimitMessage,
  getMagicLinkCooldownRemainingMs,
  getStoredMagicLinkCooldownRemainingMs,
  isMagicLinkRateLimitMessage,
  readMagicLinkCooldownUntil,
} = require("../portal");

test("portal magic-link helpers detect provider rate-limit messages", () => {
  assert.equal(isMagicLinkRateLimitMessage("email rate limit exceeded"), true);
  assert.equal(
    isMagicLinkRateLimitMessage(
      "For security purposes, you can only request this after 60 seconds."
    ),
    true
  );
  assert.equal(isMagicLinkRateLimitMessage("something else went wrong"), false);
});

test("portal magic-link helpers format a friendly cooldown message", () => {
  assert.equal(getMagicLinkCooldownRemainingMs(15_000, 5_000), 10_000);
  assert.equal(getMagicLinkCooldownRemainingMs(5_000, 15_000), 0);
  assert.equal(
    formatMagicLinkRateLimitMessage(42_000),
    "A magic link was already sent recently. Check your email or wait about 42 seconds before trying again."
  );
});

test("portal magic-link helpers clear expired cooldown storage", () => {
  let removedKey = null;
  const storage = {
    getItem() {
      return "1000";
    },
    removeItem(key) {
      removedKey = key;
    },
  };

  assert.equal(readMagicLinkCooldownUntil(storage), 1000);
  assert.equal(getStoredMagicLinkCooldownRemainingMs(2_000, storage), 0);
  assert.equal(typeof removedKey, "string");
});
