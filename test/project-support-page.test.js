const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");

const root = join(__dirname, "..");

test("project support page provides a dedicated paid-customer support form", () => {
  const html = readFileSync(join(root, "support.html"), "utf8");

  assert.match(html, /Project Support/);
  assert.match(html, /checkout-page support-page/);
  assert.match(html, /checkout-layout support-layout/);
  assert.match(html, /checkout-panel support-panel/);
  assert.match(html, /checkout-summary support-summary/);
  assert.match(html, /project-support-form/);
  assert.match(html, /portal access or magic link/i);
  assert.match(html, /support\.js/);
  assert.equal(html.includes("free mix review"), false);
});
test("primary pages expose visible portal and support navigation links", () => {
  const pageNames = [
    "index.html",
    "checkout.html",
    "portal.html",
    "success.html",
    "support.html",
    "admin.html",
    "studio-tools.html",
  ];

  pageNames.forEach((pageName) => {
    const html = readFileSync(join(root, pageName), "utf8");

    assert.match(html, /href="support\.html"/);
    assert.match(html, /href="portal\.html"/);
    assert.match(html, /href="studio-tools\.html"/);
  });
});

test("primary pages load the shared responsive navigation script", () => {
  const pageNames = [
    "index.html",
    "checkout.html",
    "portal.html",
    "success.html",
    "support.html",
    "admin.html",
    "studio-tools.html",
  ];

  pageNames.forEach((pageName) => {
    const html = readFileSync(join(root, pageName), "utf8");

    assert.match(html, /<script src="nav\.js"><\/script>/);
  });
});

test("studio tools page hosts the Brick Lane lab and live workbench", () => {
  const html = readFileSync(join(root, "studio-tools.html"), "utf8");

  assert.match(html, /<title>Studio Tools \| Dirt Cat Records<\/title>/);
  assert.match(html, /<h1>Studio Tools<\/h1>/);
  assert.match(html, /Brick Lane Sonic Lab/);
  assert.match(html, /Drum Alignment/);
  assert.match(html, /Logic Auto Bounce/);
  assert.match(html, /id="drum-alignment-workbench"/);
  assert.match(html, /id="logic-auto-bounce-workbench"/);
  assert.match(html, /One stable live URL/);
  assert.match(html, /Current Branch/);
  assert.match(html, /wip\/studio-tools-live-workspace/);
  assert.match(html, /dirtcat-stem-exporter/);
  assert.match(html, /Live Logic proof/);
  assert.match(html, /brick-lane-data\.js/);
  assert.match(html, /brick-lane-lab\.js/);
});

test("legacy Brick Lane lab URL points to Studio Tools", () => {
  const html = readFileSync(join(root, "brick-lane-lab.html"), "utf8");

  assert.match(html, /url=studio-tools\.html#brick-lane-sonic-lab/);
  assert.match(html, /href="studio-tools\.html#brick-lane-sonic-lab"/);
});

test("responsive navigation styling supports a hamburger menu", () => {
  const css = readFileSync(join(root, "style.css"), "utf8");
  const script = readFileSync(join(root, "nav.js"), "utf8");

  assert.match(css, /\.nav-toggle\s*{/);
  assert.match(css, /#main-nav\.nav-ready\s*{[\s\S]*background: transparent;/);
  assert.match(css, /#main-nav\.nav-ready \.nav-toggle/);
  assert.match(css, /#main-nav\.nav-ready\.nav-open ul/);
  assert.match(css, /#main-nav\.nav-ready ul\s*{[\s\S]*left: 0\.75rem;/);
  assert.match(css, /#main-nav\.nav-ready ul\s*{[\s\S]*right: auto;/);
  assert.match(css, /#main-nav\.nav-ready ul\s*{[\s\S]*width: min\(236px/);
  assert.match(
    css,
    /#main-nav\.nav-ready ul\s*{[\s\S]*grid-template-columns: 1fr;/
  );
  assert.match(css, /#main-nav\.nav-ready ul::before/);
  assert.match(css, /#main-nav\.nav-ready a\s*{[\s\S]*border: 0;/);
  assert.match(css, /#main-nav\.nav-ready a\s*{[\s\S]*font-size: 0\.76rem;/);
  assert.match(css, /#main-nav\.nav-ready a::before/);
  assert.match(css, /#main-nav\.nav-ready a::after/);
  assert.match(css, /scrollbar-width: none;/);
  assert.match(css, /#main-nav\.nav-ready ul::-webkit-scrollbar/);
  assert.match(css, /env\(safe-area-inset-top, 0px\)/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(script, /aria-expanded/);
  assert.match(script, /aria-controls/);
  assert.match(script, /Escape/);
});

test("support navigation uses the standard nav link styling", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const css = readFileSync(join(root, "style.css"), "utf8");

  assert.match(html, /<a href="support\.html">Support<\/a>/);
  assert.equal(css.includes("nav-support-link"), false);
});

test("homepage hero has a dedicated phone layout", () => {
  const css = readFileSync(join(root, "style.css"), "utf8");

  assert.match(
    css,
    /@media \(max-width: 768px\)\s*{[\s\S]*#hero-container\s*{[\s\S]*min-height: 100svh;/
  );
  assert.match(
    css,
    /@media \(max-width: 768px\)\s*{[\s\S]*#hero-container\s*{[\s\S]*justify-content: flex-start;/
  );
  assert.match(
    css,
    /@media \(max-width: 768px\)\s*{[\s\S]*#main-logo\s*{[\s\S]*position: relative;/
  );
  assert.match(
    css,
    /@media \(max-width: 768px\)\s*{[\s\S]*#main-logo\s*{[\s\S]*width: min\(168px, 50vw\);/
  );
  assert.match(
    css,
    /@media \(max-width: 768px\)\s*{[\s\S]*#hero-heading\s*{[\s\S]*font-size: clamp\(2\.08rem, 9\.4vw, 2\.42rem\);/
  );
  assert.match(
    css,
    /@media \(max-width: 768px\)\s*{[\s\S]*\.hero-actions \.btn\s*{[\s\S]*width: 100%;/
  );
  assert.match(css, /@keyframes mobileLogoPulse/);
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

test("support form styling keeps fields and actions shrink-safe", () => {
  const css = readFileSync(join(root, "style.css"), "utf8");

  assert.match(css, /\.support-form\s*{[\s\S]*display: grid;/);
  assert.match(css, /\.support-form\s*{[\s\S]*min-width: 0;/);
  assert.match(css, /\.support-form\s*{[\s\S]*padding: clamp/);
  assert.match(css, /\.support-layout\s*{[\s\S]*minmax\(0, 780px\)/);
  assert.match(css, /\.support-panel\s*{[\s\S]*padding: clamp/);
  assert.match(css, /\.support-summary\s*{[\s\S]*position: relative;/);
  assert.match(css, /\.support-field\s*{[\s\S]*width: 100%;/);
  assert.match(css, /\.support-field\s*{[\s\S]*min-width: 0;/);
  assert.match(
    css,
    /\.support-field input,\s*\n\.support-field textarea,\s*\n\.support-field select\s*{[\s\S]*justify-self: stretch;/
  );
  assert.match(
    css,
    /\.support-actions\s*{[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/
  );
  assert.match(css, /\.support-actions \.btn\s*{[\s\S]*min-width: 0;/);
  assert.match(
    css,
    /@media \(max-width: 680px\)\s*{[\s\S]*\.support-actions\s*{[\s\S]*grid-template-columns: 1fr;/
  );
});
