const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const { chromium } = require("playwright");

function startServer() {
  return spawn(
    process.execPath,
    [
      "-e",
      "require('http').createServer((req,res)=>{const fs=require('fs');const path=require('path');const file=req.url.split('?')[0] === '/' ? '/logic-auto-bounce.html' : req.url.split('?')[0];const full=path.join(process.cwd(), file);fs.readFile(full,(err,data)=>{if(err){res.statusCode=404;res.end('not found');return;}res.end(data);});}).listen(4175)",
    ],
    { cwd: process.cwd(), stdio: "ignore" }
  );
}

test("Logic Auto Bounce guides a working plan through deliverable, files, and review", async () => {
  const server = startServer();
  let browser;
  try {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const chromePath =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    browser = await chromium.launch({
      headless: true,
      ...(fs.existsSync(chromePath) ? { executablePath: chromePath } : {}),
    });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1024 },
    });
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto("http://127.0.0.1:4175/logic-auto-bounce.html", {
      waitUntil: "networkidle",
    });
    assert.equal(await page.locator("h1").innerText(), "Logic Auto Bounce");
    assert.match(
      await page.locator(".bounce-page-header").innerText(),
      /Build a clean, repeatable/i
    );
    assert.ok(await page.locator('[data-step="deliverable"]').isVisible());
    assert.equal(await page.locator('[data-step="files"]').isVisible(), false);
    assert.match(
      await page.locator("#logic-menu-path").innerText(),
      /All Tracks as Audio Files/
    );

    const defaultPlan = await page.evaluate(() =>
      window.LogicBouncePlannerTest.getPlan()
    );
    assert.equal(defaultPlan.format, "WAV");
    assert.equal(defaultPlan.bitDepth, "24");
    assert.equal(defaultPlan.sampleRate, "project");

    await page.locator('input[name="delivery"][value="stereo"]').check();
    assert.match(
      await page.locator("#logic-menu-path").innerText(),
      /Project or Section/
    );
    await page.locator("#render-settings summary").click();
    assert.ok(await page.locator("#audio-tail-row").isVisible());
    assert.equal(await page.locator("#bounce-range option").count(), 2);
    await page.locator("#bounce-bit-depth").selectOption("16");
    assert.ok(await page.locator("#dither-note").isVisible());

    await page
      .locator('input[name="delivery"][value="selected-tracks"]')
      .check();
    await page.locator("#btn-continue-files").click();
    assert.ok(await page.locator('[data-step="files"]').isVisible());
    assert.match(
      await page.locator("#logic-warning").innerText(),
      /sidechain/i
    );

    await page
      .locator("#bounce-track-input")
      .fill("Lead Vocal\nBGV Stack\nLead Vocal\n");
    await page.locator("#btn-import-tracks").click();
    assert.equal(await page.locator("#bounce-tracks-list tr").count(), 2);
    assert.match(
      await page.locator("#bounce-track-summary").innerText(),
      /2 planned files/
    );
    await page.getByRole("button", { name: "Remove Lead Vocal" }).click();
    assert.equal(await page.locator("#bounce-tracks-list tr").count(), 1);

    const checklist = await page.evaluate(() =>
      window.LogicBouncePlannerTest.buildChecklist()
    );
    assert.match(checklist, /Tracks as Audio Files/);
    assert.match(checklist, /16-bit/);
    assert.match(checklist, /BGV Stack\.wav/);
    assert.match(checklist, /does not control Logic Pro/i);

    await page.locator("#btn-continue-review").click();
    assert.ok(await page.locator('[data-step="review"]').isVisible());
    assert.match(
      await page.locator("#bounce-result-preview").innerText(),
      /1 file planned/
    );
    await page.locator("#preflight-checks input").first().check();
    assert.match(
      await page.locator("#preflight-progress").innerText(),
      /1 of 4/
    );

    const downloadPromise = page.waitForEvent("download");
    await page.locator("#btn-download-recipe").click();
    assert.match((await downloadPromise).suggestedFilename(), /\.txt$/);
    assert.match(
      await page.locator("#bounce-status").innerText(),
      /Downloaded/i
    );

    await page.locator('[data-step-button="deliverable"]').click();
    await page.locator("#bounce-demo-button").click();
    assert.match(
      await page.locator("#bounce-status").innerText(),
      /Demo loaded/i
    );
    assert.equal(
      await page.evaluate(
        () => window.LogicBouncePlannerTest.getPlan().tracks.length
      ),
      8
    );

    const desktopLayout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    assert.ok(desktopLayout.scrollWidth <= desktopLayout.viewportWidth);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "networkidle" });
    const mobileLayout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    assert.ok(mobileLayout.scrollWidth <= mobileLayout.viewportWidth);
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
});
