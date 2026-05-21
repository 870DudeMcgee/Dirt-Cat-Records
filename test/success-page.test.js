const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const { join } = require("node:path");

const root = join(__dirname, "..");

test("paid success page uses portal-first intake instead of mailto form", () => {
  const html = readFileSync(join(root, "success.html"), "utf8");

  assert.equal(html.includes("mailto:"), false);
  assert.equal(html.includes('id="intake-form"'), false);
  assert.equal(html.includes("index.html#mix-review"), false);
  assert.match(html, /support\.html/);
  assert.match(html, /portal\.html/);
  assert.match(html, /project portal/i);
  assert.match(html, /watch your email/i);
});

test("success page exposes stable anchors for no-charge completion copy", () => {
  const html = readFileSync(join(root, "success.html"), "utf8");

  assert.match(html, /id="success-kicker"/);
  assert.match(html, /id="success-title"/);
  assert.match(html, /id="success-copy"/);
  assert.match(html, /id="success-step-payment"/);
  assert.match(html, /id="paid-summary"/);
});
