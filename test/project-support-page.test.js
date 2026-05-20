const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");

const root = join(__dirname, "..");

test("project support page provides a dedicated paid-customer support form", () => {
  const html = readFileSync(join(root, "support.html"), "utf8");

  assert.match(html, /Project Support/);
  assert.match(html, /project-support-form/);
  assert.match(html, /portal access or magic link/i);
  assert.match(html, /support\.js/);
  assert.equal(html.includes("free mix review"), false);
});
