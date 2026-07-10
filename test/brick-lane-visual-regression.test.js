const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright");

function startServer() {
  const child = spawn(
    process.execPath,
    [
      "-e",
      "require('http').createServer((req,res)=>{const fs=require('fs');const path=require('path');const file=req.url.split('?')[0] === '/' ? '/studio-tools.html' : req.url.split('?')[0];const full=path.join(process.cwd(), file);fs.readFile(full,(err,data)=>{if(err){res.statusCode=404;res.end('not found');return;}res.end(data);});}).listen(4174)",
    ],
    { cwd: process.cwd(), stdio: "ignore" }
  );
  return child;
}

test("Brick Lane hardware keeps tall 500-series proportions", async () => {
  const server = startServer();
  let browser;
  try {
    await new Promise((resolve) => setTimeout(resolve, 800));
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1200 },
    });
    await page.goto("http://127.0.0.1:4174/brick-lane-lab.html", {
      waitUntil: "networkidle",
    });
    const hardware = await page.locator(".brick-lane-hardware").boundingBox();
    const topScrew = await page
      .locator(".brick-lane-panel-screw-top")
      .boundingBox();
    const bottomScrew = await page
      .locator(".brick-lane-panel-screw-bottom")
      .boundingBox();
    const panelBody = await page
      .locator(".brick-lane-panel-body")
      .boundingBox();
    const firstMainKnob = await page
      .locator(".brick-lane-main-knob")
      .first()
      .boundingBox();
    const lastMainKnob = await page
      .locator(".brick-lane-main-knob")
      .last()
      .boundingBox();
    const stressKnobBox = await page
      .locator(".brick-lane-stress-knob")
      .boundingBox();
    const modeListBox = await page
      .locator(".brick-lane-mode-list")
      .boundingBox();
    const cycleControlsBox = await page
      .locator(".brick-lane-cycle-controls")
      .boundingBox();
    const meterBoxes = await page
      .locator(".brick-lane-physical-meter")
      .evaluateAll((meters) =>
        meters.map((meter) => {
          const rect = meter.getBoundingClientRect();
          return {
            id: meter.dataset.meterId,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          };
        })
      );
    const meterScales = await page
      .locator(".brick-lane-physical-meter")
      .evaluateAll((meters) =>
        meters.map((meter) => ({
          id: meter.dataset.meterId,
          labels: Array.from(
            meter.querySelectorAll(".brick-lane-led-label")
          ).map((label) => label.textContent.trim()),
        }))
      );
    const mainKnobs = await page.locator(".brick-lane-main-knob").count();
    const stressKnobs = await page.locator(".brick-lane-stress-knob").count();
    const selectsInHardware = await page
      .locator(".brick-lane-hardware select")
      .count();
    const meters = await page.locator(".brick-lane-physical-meter").count();
    const cycleSwitches = await page
      .locator(".brick-lane-cycle-switch")
      .count();
    const cycleActions = await page
      .locator(".brick-lane-cycle-switch[data-param]")
      .count();
    const optosyncSwitches = await page
      .locator('.brick-lane-hardware-switch[data-param="optosync"]')
      .count();
    const inSwitches = await page
      .locator('.brick-lane-hardware-switch[data-param="in"]')
      .count();
    const linkJacks = await page.locator(".brick-lane-link-jack").count();
    const scfLabels = await page
      .locator(".brick-lane-scf-option")
      .allTextContents();

    assert.ok(hardware, "hardware faceplate should render");
    assert.ok(topScrew, "top faceplate screw should render");
    assert.ok(bottomScrew, "bottom faceplate screw should render");
    assert.ok(panelBody, "hardware panel body should render");
    assert.ok(firstMainKnob, "first main knob should render");
    assert.ok(lastMainKnob, "last main knob should render");
    assert.ok(stressKnobBox, "stress knob should render");
    assert.ok(modeListBox, "compression mode indicators should render");
    assert.ok(cycleControlsBox, "SCF and MODE switches should render");

    // Validate the narrow single-slot 500-series front-panel proportion.
    assert.ok(
      hardware.height / hardware.width > 3.3,
      `expected tall module ratio, got ${hardware.height / hardware.width}`
    );

    assert.equal(mainKnobs, 5);
    assert.equal(stressKnobs, 1);
    assert.equal(meters, 2);
    assert.equal(selectsInHardware, 0);
    assert.equal(cycleSwitches, 2);
    assert.equal(cycleActions, 2);
    assert.equal(optosyncSwitches, 1);
    assert.equal(inSwitches, 1);
    assert.equal(linkJacks, 1);
    assert.deepEqual(scfLabels, ["60Hz", "100Hz", "200Hz"]);
    assert.ok(topScrew.width >= 18, "top mounting screw should stay visible");
    assert.ok(bottomScrew.width >= 18, "bottom mounting screw should stay visible");
    assert.ok(
      cycleControlsBox.y >= modeListBox.y + modeListBox.height + 8,
      "SCF and MODE switches must not overlap the compression mode indicators"
    );

    const [sigMeter, grMeter] = meterBoxes;
    assert.equal(sigMeter.id, "sig");
    assert.equal(grMeter.id, "gr");
    assert.deepEqual(meterScales, [
      {
        id: "sig",
        labels: [
          "24",
          "21",
          "18",
          "15",
          "12",
          "6",
          "0",
          "-6",
          "-12",
          "-18",
          "-24",
          "-30",
        ],
      },
      {
        id: "gr",
        labels: [
          "0.5",
          "1.0",
          "1.5",
          "2",
          "3",
          "4",
          "5",
          "6",
          "8",
          "10",
          "12",
          "15",
        ],
      },
    ]);
    assert.ok(
      firstMainKnob.width < hardware.width * 0.48,
      `main knob column should stay narrow, got ${firstMainKnob.width}px in ${hardware.width}px faceplate`
    );
    assert.ok(
      sigMeter.x > firstMainKnob.x + firstMainKnob.width * 0.72,
      "SIG meter should sit to the right of the main knob column"
    );
    assert.ok(
      grMeter.x > sigMeter.x,
      "GR meter should sit to the right of SIG meter"
    );
    assert.ok(
      Math.abs(sigMeter.y - grMeter.y) < 8,
      "SIG and GR meters should align at the top of the faceplate"
    );
    assert.ok(
      stressKnobBox.x > firstMainKnob.x + firstMainKnob.width * 0.65,
      "STRESS knob should sit to the right of the main knob column"
    );
    assert.ok(
      stressKnobBox.y > sigMeter.y + sigMeter.height,
      "STRESS knob should sit below the physical meters"
    );
    assert.ok(
      stressKnobBox.y < lastMainKnob.y,
      "STRESS knob should appear before the bottom OUTPUT section"
    );
    assert.ok(
      panelBody.height < hardware.height * 0.91,
      "faceplate body should not contain a large blank vertical gap"
    );

    await page
      .locator("#brick-lane-archetypes")
      .selectOption({ label: "Kick/Snare Safety" });
    assert.equal(
      await page.locator(".brick-lane-scf-options").getAttribute("aria-label"),
      "SCF 200 Hz"
    );
    const attackBeforeFineTune = Number(
      await page.locator('[data-param="attack"]').getAttribute("data-val")
    );
    await page.getByLabel("Punch to Smoothness").fill("5");
    const attackAfterFineTune = Number(
      await page.locator('[data-param="attack"]').getAttribute("data-val")
    );
    assert.notEqual(
      attackAfterFineTune,
      attackBeforeFineTune,
      "fine-tune controls should visibly move the hardware attack knob"
    );
    await page.getByRole("button", { name: "Cycle SCF" }).click();
    assert.equal(
      await page.locator(".brick-lane-scf-options").getAttribute("aria-label"),
      "SCF OFF"
    );
    const modeBeforeCycle = await page
      .locator(".brick-lane-mode-dot.is-active")
      .innerText();
    await page.getByRole("button", { name: "Cycle compression mode" }).click();
    assert.notEqual(
      await page.locator(".brick-lane-mode-dot.is-active").innerText(),
      modeBeforeCycle
    );
    await page.getByRole("button", { name: "Optosync PARENT" }).click();
    assert.equal(
      await page
        .locator('.brick-lane-hardware-switch[data-param="optosync"]')
        .getAttribute("aria-label"),
      "Optosync CHILD"
    );

    const detectorText = await page
      .locator('[data-parameter-id="detector"]')
      .innerText({ timeoutMs: 5000 });
    assert.match(detectorText, /Peak/);
    assert.doesNotMatch(
      detectorText,
      /Triple RMS Hyb|Dual RMS Hybrid|Peak\+RMS Var/
    );

    await page.setViewportSize({ width: 390, height: 1000 });
    await page.goto("http://127.0.0.1:4174/brick-lane-lab.html", {
      waitUntil: "networkidle",
    });
    const mobileHardware = await page
      .locator(".brick-lane-hardware")
      .boundingBox();
    const mobileCore = await page
      .locator(".brick-lane-faceplate-core")
      .boundingBox();
    const mobileFirstLabel = await page
      .locator(".brick-lane-main-knob .brick-lane-knob-name")
      .first()
      .boundingBox();

    assert.ok(mobileHardware, "mobile hardware faceplate should render");
    assert.ok(mobileCore, "mobile faceplate core should render");
    assert.ok(mobileFirstLabel, "mobile main knob label should render");
    assert.ok(
      mobileHardware.x >= 0,
      `mobile faceplate should not clip off the left viewport edge, got x=${mobileHardware.x}`
    );
    assert.ok(
      mobileHardware.x + mobileHardware.width <= 390,
      `mobile faceplate should fit inside the viewport, got right edge ${mobileHardware.x + mobileHardware.width}`
    );
    assert.ok(
      mobileFirstLabel.x >= mobileCore.x,
      `mobile INPUT label should stay inside the clipped faceplate core, got ${mobileFirstLabel.x} < ${mobileCore.x}`
    );
    assert.ok(
      mobileFirstLabel.x >= mobileHardware.x,
      "mobile INPUT label should not be clipped by the faceplate edge"
    );

    const mobileLayout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    assert.ok(
      mobileLayout.scrollWidth <= mobileLayout.viewportWidth,
      `mobile Brick Lane Sonic Lab should not create horizontal overflow, got scrollWidth ${mobileLayout.scrollWidth} for viewport ${mobileLayout.viewportWidth}`
    );
  } finally {
    if (browser) {
      await browser.close();
    }
    server.kill();
  }
});
