const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright");

function startServer() {
  const child = spawn(
    process.execPath,
    [
      "-e",
      "require('http').createServer((req,res)=>{const fs=require('fs');const path=require('path');const file=req.url.split('?')[0] === '/' ? '/studio-tools.html' : req.url.split('?')[0];const full=path.join(process.cwd(), file);fs.readFile(full,(err,data)=>{if(err){res.statusCode=404;res.end('not found');return;}res.end(data);});}).listen(4175)",
    ],
    { cwd: process.cwd(), stdio: "ignore" }
  );
  return child;
}

test("Logic Auto Bounce interactive preferences dialogue validation", async () => {
  const server = startServer();
  let browser;
  try {
    await new Promise((resolve) => setTimeout(resolve, 800));
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1200 },
    });

    // 1. Navigate to the workbench
    await page.goto(
      "http://127.0.0.1:4175/studio-tools.html#logic-auto-bounce-workbench",
      { waitUntil: "networkidle" }
    );

    // 2. Verify all UI containers and buttons exist
    const prefDialogue = page.locator("#logic-bounce-preferences");
    await assert.ok(
      await prefDialogue.isVisible(),
      "Preferences dialogue should be visible"
    );

    const presetSelector = page.locator("#bounce-preset-selector");
    const bitDepthSelect = page.locator("#bounce-bit-depth");
    const sampleRateSelect = page.locator("#bounce-sample-rate");
    const recipePreview = page.locator("#bounce-recipe-preview");

    // Verify default active preset is "mix-prep-dry"
    assert.equal(await presetSelector.inputValue(), "mix-prep-dry");
    assert.equal(await bitDepthSelect.inputValue(), "24");
    assert.equal(await sampleRateSelect.inputValue(), "48000");

    let initialJSONText = await recipePreview.innerText();
    let initialRecipe = JSON.parse(initialJSONText);
    assert.equal(initialRecipe.presetId, "mix-prep-dry");
    assert.equal(initialRecipe.audioSettings.sampleRate, 48000);
    assert.equal(initialRecipe.toggles.insertsActive, false);
    assert.equal(initialRecipe.toggles.printFxAuxes, false);

    // 3. Select "Vocal Stems (Wet)" and verify state changes
    await presetSelector.selectOption("vocal-stems-wet");

    // Give state machine a tiny tick to update
    await page.waitForTimeout(100);

    assert.equal(await sampleRateSelect.inputValue(), "44100");

    let wetJSONText = await recipePreview.innerText();
    let wetRecipe = JSON.parse(wetJSONText);
    assert.equal(wetRecipe.presetId, "vocal-stems-wet");
    assert.equal(wetRecipe.audioSettings.sampleRate, 44100);
    assert.equal(wetRecipe.toggles.insertsActive, true);
    assert.equal(wetRecipe.toggles.printFxAuxes, true);
    assert.equal(wetRecipe.isModified, false);

    // 4. Change a granular toggle to verify interactive modification tracking
    await page.locator("#toggle-inserts-active").evaluate((el) => el.click());

    await page.waitForTimeout(100);

    // Modified badge should be visible
    const badgeModified = page.locator("#preset-modified-badge");
    assert.ok(
      await badgeModified.isVisible(),
      "Modified badge should be visible after state edits"
    );

    let modifiedJSONText = await recipePreview.innerText();
    let modifiedRecipe = JSON.parse(modifiedJSONText);
    assert.equal(modifiedRecipe.toggles.insertsActive, false);
    assert.equal(modifiedRecipe.isModified, true);

    // 5. Verify simulated tracks sidechain policy dropdown selections
    // The Bass Synth track is expected to have a sidechain dropdown
    const bassSynthSelect = page.locator('select[data-track="Bass Synth"]');
    assert.ok(
      await bassSynthSelect.isVisible(),
      "Bass Synth sidechain policy dropdown should render"
    );

    // Select Bypass Sidechain
    await bassSynthSelect.selectOption("bypass-sidechain");
    await page.waitForTimeout(100);

    let sidechainJSONText = await recipePreview.innerText();
    let sidechainRecipe = JSON.parse(sidechainJSONText);
    const synthPolicy = sidechainRecipe.trackPolicies.find(
      (t) => t.trackName === "Bass Synth"
    );
    assert.equal(synthPolicy.policy, "bypass-sidechain");

    // 6. Verify clipboard and download actions exist
    const btnCopy = page.locator("#btn-copy-recipe");
    const btnDownload = page.locator("#btn-download-recipe");
    assert.ok(
      await btnCopy.isVisible(),
      "Copy to clipboard button should render"
    );
    assert.ok(
      await btnDownload.isVisible(),
      "Download recipe button should render"
    );

    // 7. Verify no horizontal overflow in mobile layout
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(
      "http://127.0.0.1:4175/studio-tools.html#logic-auto-bounce-workbench",
      { waitUntil: "networkidle" }
    );

    const mobileLayout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));

    assert.ok(
      mobileLayout.scrollWidth <= mobileLayout.viewportWidth,
      `Mobile layout must not create horizontal overflow (scrollWidth=${mobileLayout.scrollWidth}, viewportWidth=${mobileLayout.viewportWidth})`
    );
  } finally {
    if (browser) {
      await browser.close();
    }
    server.kill();
  }
});
