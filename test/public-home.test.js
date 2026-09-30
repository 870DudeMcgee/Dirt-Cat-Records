const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");

const root = join(__dirname, "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const css = readFileSync(join(root, "public-home.css"), "utf8");
const script = readFileSync(join(root, "public-home.js"), "utf8");

test("homepage redesign stays on the scoped public-home layer", () => {
  assert.match(html, /class="public-home"/);
  assert.match(html, /href="public-home\.css"/);
  assert.match(html, /src="public-home\.js"/);
  assert.equal(html.includes("style.css"), false);
  assert.equal(html.includes("logic-auto-bounce.css"), false);
  assert.doesNotMatch(css, /brick-lane|drum-align|logic-bounce/);
});

test("hero keeps the songs-sound-better-here lockup over a living room", () => {
  assert.match(html, /id="hero-container"/);
  assert.match(html, /prototypes\/home\/media\/room\.jpg/);
  assert.match(html, /data-hero-loop/);
  assert.match(html, /class="public-home-still"/);
  assert.match(html, /hero-alive\.mp4/);
  assert.match(html, /<source\s/);
  assert.match(
    html,
    /<span>Songs<\/span>\s*<span>Sound<\/span>\s*<span>Better<\/span>\s*<em>Here<\/em>/
  );
  assert.equal(html.includes("Different possible"), false);
  assert.equal(html.includes("hero-scribble"), false);
  const listenAt = html.indexOf("Listen to the difference");
  const bookAt = html.indexOf("Book a session");
  assert.ok(listenAt > 0 && bookAt > listenAt);
  assert.match(script, /function prepareHeroLoop/);
  assert.match(script, /prefers-reduced-motion/);
  assert.match(script, /is-live/);
});

test("homepage is a Dirt Cat scene sequence and Corey stays one proof chapter", () => {
  assert.match(html, /id="listen"/);
  assert.match(html, /id="work"/);
  assert.match(html, /id="after"/);
  assert.match(html, /id="room"/);
  assert.match(html, /data-side="source"/);
  assert.match(html, /data-side="print"/);
  assert.match(html, /data-hold/);
  assert.match(html, /Dirt Cat print/);
  assert.match(html, /data-playhead/);
  assert.match(html, /data-reel/);
  assert.equal(html.includes("waveform"), false);
  assert.equal(html.includes("public-home-service-list"), false);
  assert.equal(html.includes("bento"), false);
  const heroAt = html.indexOf('id="hero-container"');
  const workAt = html.indexOf('id="work"');
  const compareAt = html.indexOf("data-compare");
  const evidenceAt = html.indexOf("public-home-evidence");
  const kitAt = html.indexOf("prototypes/corey-bench/media/kit.jpg");
  const closeAt = html.indexOf("prototypes/corey-bench/media/close-mic.jpg");
  const ladderAt = html.indexOf("prototypes/corey-bench/media/ladder.jpg");
  const afterAt = html.indexOf('id="after"');
  const roomAt = html.indexOf('id="room"');
  const inviteAt = html.indexOf("Send me what you have");
  assert.ok(heroAt > 0 && workAt > heroAt && compareAt > workAt);
  assert.ok(evidenceAt > compareAt);
  assert.ok(kitAt > evidenceAt && closeAt > kitAt && ladderAt > closeAt);
  assert.ok(afterAt > ladderAt && roomAt > afterAt && inviteAt > roomAt);
  assert.match(script, /function setHearing/);
  assert.match(script, /function fadeToHearing/);
  assert.match(script, /function initReels/);
  assert.match(script, /setPointerCapture/);
  assert.match(script, /data-enter-listen|public-home:listen/);
  const setHearing = script.slice(
    script.indexOf("function setHearing"),
    script.indexOf("function stopNodes")
  );
  assert.equal(setHearing.includes("startNodes"), false);
});

test("existing customer and studio pages do not load the public-home layer", () => {
  [
    "checkout.html",
    "portal.html",
    "support.html",
    "admin.html",
    "studio-tools.html",
    "brick-lane-lab.html",
    "drum-alignment.html",
    "logic-auto-bounce.html",
  ].forEach((page) => {
    const pageHtml = readFileSync(join(root, page), "utf8");
    assert.equal(pageHtml.includes("public-home.css"), false, page);
    assert.equal(pageHtml.includes("public-home.js"), false, page);
  });
});
