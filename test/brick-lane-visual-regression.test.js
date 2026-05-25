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
    await page.goto(
      "http://127.0.0.1:4174/studio-tools.html#brick-lane-sonic-lab",
      { waitUntil: "networkidle" }
    );

    const hardware = await page.locator(".brick-lane-hardware").boundingBox();
    const topRackEar = await page
      .locator(".brick-lane-rack-ear-top")
      .boundingBox();
    const bottomRackEar = await page
      .locator(".brick-lane-rack-ear-bottom")
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
    const lowerTitles = await page
      .locator(".brick-lane-lower-section .brick-lane-mini-title")
      .evaluateAll((titles) =>
        titles.map((title) => ({
          text: title.textContent.trim(),
          textTransform: window.getComputedStyle(title).textTransform,
        }))
      );
    const topScrewContent = await page
      .locator(".brick-lane-rack-ear-top")
      .evaluate((ear) => window.getComputedStyle(ear, "::before").content);

    assert.ok(hardware, "hardware faceplate should render");
    assert.ok(topRackEar, "top rack ear should render");
    assert.ok(bottomRackEar, "bottom rack ear should render");
    assert.ok(panelBody, "hardware panel body should render");
    assert.ok(firstMainKnob, "first main knob should render");
    assert.ok(lastMainKnob, "last main knob should render");
    assert.ok(stressKnobBox, "stress knob should render");

    // Validate that the hardware keeps tall 500-series proportions (> 2.5)
    assert.ok(
      hardware.height / hardware.width > 2.5,
      `expected tall module ratio, got ${hardware.height / hardware.width}`
    );

    assert.equal(mainKnobs, 5);
    assert.equal(stressKnobs, 1);
    assert.equal(meters, 2);
    assert.equal(selectsInHardware, 0);
    assert.deepEqual(
      lowerTitles.map((title) => title.text),
      ["SCF", "MODE", "optosync", "IN"]
    );
    assert.notEqual(
      lowerTitles[2].textTransform,
      "uppercase",
      "optosync label should keep physical lowercase casing"
    );
    assert.ok(
      topRackEar.height >= 18,
      "top rack ear should be visible like the real 500-series faceplate"
    );
    assert.ok(
      bottomRackEar.height >= 14,
      "bottom rack ear should be visible like the real 500-series faceplate"
    );
    assert.notEqual(
      topScrewContent,
      "none",
      "top rack ear should include a visible screw hole"
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
      panelBody.height < hardware.height * 0.82,
      "faceplate body should not contain a large blank vertical gap"
    );

    const detectorText = await page
      .locator('[data-parameter-id="detector"]')
      .innerText({ timeoutMs: 5000 });
    assert.match(detectorText, /Peak \+ RMS \+ Slow RMS/);
    assert.doesNotMatch(
      detectorText,
      /Triple RMS Hyb|Dual RMS Hybrid|Peak\+RMS Var/
    );

    await page.setViewportSize({ width: 390, height: 1000 });
    await page.goto(
      "http://127.0.0.1:4174/studio-tools.html#brick-lane-sonic-lab",
      { waitUntil: "networkidle" }
    );

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
  } finally {
    if (browser) {
      await browser.close();
    }
    server.kill();
  }
});
