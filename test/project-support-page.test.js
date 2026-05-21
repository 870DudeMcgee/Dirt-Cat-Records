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

test("shared form styling keeps checkout and support fields inside panels", () => {
  const css = readFileSync(join(root, "style.css"), "utf8");

  assert.match(
    css,
    /input,\s*\ntextarea,\s*\nselect\s*{[\s\S]*max-width: 100%;/
  );
  assert.match(css, /input,\s*\ntextarea,\s*\nselect\s*{[\s\S]*min-width: 0;/);
  assert.match(
    css,
    /\.checkout-panel,\s*\n\.checkout-summary\s*{[\s\S]*min-width: 0;/
  );
  assert.match(
    css,
    /\.discount-code-row\s*{[\s\S]*minmax\(0, 1fr\) minmax\(88px, auto\)/
  );
  assert.match(css, /\.addon-quantity\s*{[\s\S]*width: 92px;/);
  assert.match(css, /#song-count\s*{\s*max-width: 160px;/);
});
