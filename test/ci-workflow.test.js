const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("CI installs Playwright Chromium before deploy preflight", () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, "..", ".github", "workflows", "ci.yml"),
    "utf8"
  );
  const installIndex = workflow.indexOf("npx playwright install");
  const preflightIndex = workflow.indexOf("npm run deploy:preflight");

  assert.notEqual(
    installIndex,
    -1,
    "CI must install Playwright browsers for visual regression tests"
  );
  assert.ok(
    installIndex < preflightIndex,
    "Playwright browser install must run before deploy preflight"
  );
  assert.match(workflow, /playwright install[^\n]*chromium/);
});
