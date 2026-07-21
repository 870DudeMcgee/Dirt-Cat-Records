const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");

const root = join(__dirname, "..");

test("homepage exposes a visible, clearly labeled Dude McGee artist link without JavaScript", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const socialCard = html.match(
    /<div class="([^"]*social-card[^"]*)">([\s\S]*?)<\/div>\s*<\/div>/
  );

  assert.ok(socialCard, "homepage should include the Hear More social card");
  assert.doesNotMatch(
    socialCard[1],
    /\bspell-hidden\b/,
    "the artist-link card must not depend on animation JavaScript to become visible"
  );
  assert.match(
    socialCard[2],
    /href="https:\/\/www\.dudemcgee\.com\/"[\s\S]*?>[\s\S]*?Dude McGee — Artist Website ↗[\s\S]*?<\/a>/
  );
});
