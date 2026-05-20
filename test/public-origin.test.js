const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getPublicAppOrigin,
  getVercelDeploymentOrigin,
  normalizeHostOrigin,
} = require("../lib/env/public-origin");

test("getPublicAppOrigin uses current Vercel preview deployment origin", () => {
  assert.equal(
    getPublicAppOrigin({
      SITE_URL: "https://www.dirtcatrecords.com",
      VERCEL_ENV: "preview",
      VERCEL_URL: "dirt-cat-records-preview-123.vercel.app",
    }),
    "https://dirt-cat-records-preview-123.vercel.app"
  );
});

test("getPublicAppOrigin falls back to SITE_URL outside preview", () => {
  assert.equal(
    getPublicAppOrigin({
      SITE_URL: "https://www.dirtcatrecords.com",
      VERCEL_ENV: "production",
      VERCEL_URL: "dirt-cat-records-preview-123.vercel.app",
    }),
    "https://www.dirtcatrecords.com"
  );
});

test("getVercelDeploymentOrigin ignores missing preview deployment values", () => {
  assert.equal(getVercelDeploymentOrigin({ VERCEL_ENV: "preview" }), "");
});

test("normalizeHostOrigin accepts bare hosts and full urls", () => {
  assert.equal(
    normalizeHostOrigin("dirt-cat-records-preview-123.vercel.app"),
    "https://dirt-cat-records-preview-123.vercel.app"
  );
  assert.equal(
    normalizeHostOrigin("https://www.dirtcatrecords.com/portal.html"),
    "https://www.dirtcatrecords.com"
  );
});
