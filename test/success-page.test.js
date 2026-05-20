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
