const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const measurementId = "G-F27NSF7J12";
const htmlFiles = [
  "admin.html",
  "brick-lane-lab.html",
  "checkout.html",
  "drum-alignment.html",
  "index.html",
  "logic-auto-bounce.html",
  "portal.html",
  "studio-tools.html",
  "success.html",
  "support.html",
];

test("every public HTML surface loads the Dirt Cat Records Google tag once", () => {
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    assert.equal(
      html.match(new RegExp(`gtag/js\\?id=${measurementId}`, "g"))?.length,
      1,
      `${file} should load gtag.js once`
    );
    assert.equal(
      html.match(
        new RegExp(`gtag\\(\\"config\\", \\"${measurementId}\\"\\)`, "g")
      )?.length,
      1,
      `${file} should configure the measurement ID once`
    );
  }
});

test("robots.txt permits crawling and advertises the canonical sitemap", () => {
  const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(
    robots,
    /^Sitemap: https:\/\/www\.dirtcatrecords\.com\/sitemap\.xml$/m
  );
});

test("sitemap contains only canonical indexable pages", () => {
  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    ([, location]) => location
  );

  assert.deepEqual(locations, [
    "https://www.dirtcatrecords.com/",
    "https://www.dirtcatrecords.com/checkout.html",
    "https://www.dirtcatrecords.com/support.html",
    "https://www.dirtcatrecords.com/studio-tools.html",
    "https://www.dirtcatrecords.com/brick-lane-lab.html",
    "https://www.dirtcatrecords.com/drum-alignment.html",
    "https://www.dirtcatrecords.com/logic-auto-bounce.html",
  ]);
  assert.doesNotMatch(sitemap, /admin\.html|portal\.html|success\.html/);
});
