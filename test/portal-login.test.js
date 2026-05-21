const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const {
  formatMagicLinkRateLimitMessage,
  getPortalActionSuccessMessage,
  getMagicLinkCooldownRemainingMs,
  getStoredMagicLinkCooldownRemainingMs,
  isMagicLinkRateLimitMessage,
  readMagicLinkCooldownUntil,
} = require("../portal");

const root = join(__dirname, "..");

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

test("portal status remains visible after the login panel is hidden", () => {
  const html = readFileSync(join(root, "portal.html"), "utf8");
  const loginIndex = html.indexOf('id="portal-login"');
  const loginCloseIndex = html.indexOf("</section>", loginIndex);
  const statusIndex = html.indexOf('id="portal-status"');
  const projectsIndex = html.indexOf('id="portal-projects"');

  assert.ok(statusIndex > loginCloseIndex);
  assert.ok(statusIndex < projectsIndex);
  assert.match(html, /portal-status-message/);
});

test("portal action helpers use customer-facing success language", () => {
  assert.equal(
    getPortalActionSuccessMessage("revision"),
    "Revision request received. Josh has your notes and this project is queued for a revision pass."
  );
  assert.equal(
    getPortalActionSuccessMessage("approval"),
    "Final approved. Josh can close this project out now."
  );
});
