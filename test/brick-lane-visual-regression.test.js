const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright");

function startServer() {
  const child = spawn(process.execPath, [
    "-e",
    "require('http').createServer((req,res)=>{const fs=require('fs');const path=require('path');const file=req.url.split('?')[0] === '/' ? '/studio-tools.html' : req.url.split('?')[0];const full=path.join(process.cwd(), file);fs.readFile(full,(err,data)=>{if(err){res.statusCode=404;res.end('not found');return;}res.end(data);});}).listen(4174)",
  ], { cwd: process.cwd(), stdio: "ignore" });
  return child;
}

test("Brick Lane hardware keeps tall 500-series proportions", async () => {
  const server = startServer();
  try {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
    await page.goto("http://127.0.0.1:4174/studio-tools.html#brick-lane-sonic-lab", { waitUntil: "networkidle" });

    const hardware = await page.locator(".brick-lane-hardware").boundingBox();
    const mainKnobs = await page.locator(".brick-lane-main-knob").count();
    const stressKnobs = await page.locator(".brick-lane-stress-knob").count();
    const selectsInHardware = await page.locator(".brick-lane-hardware select").count();
    const meters = await page.locator(".brick-lane-physical-meter").count();

    assert.ok(hardware, "hardware faceplate should render");
    
    // Validate that the hardware keeps tall 500-series proportions (> 2.5)
    assert.ok(hardware.height / hardware.width > 2.5, `expected tall module ratio, got ${hardware.height / hardware.width}`);
    
    assert.equal(mainKnobs, 5);
    assert.equal(stressKnobs, 1);
    assert.equal(meters, 2);
    assert.equal(selectsInHardware, 0);

    await browser.close();
  } finally {
    server.kill();
  }
});
