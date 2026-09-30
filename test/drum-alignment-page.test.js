const test = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { readFile } = require("node:fs");
const { extname, join } = require("node:path");
const { chromium } = require("playwright");

const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
]);

function startServer() {
  const server = createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const pathname = decodeURIComponent(url.pathname);
    const relativePath =
      pathname === "/" ? "studio-tools.html" : pathname.replace(/^\/+/, "");
    const fullPath = join(process.cwd(), relativePath);

    readFile(fullPath, (error, data) => {
      if (error) {
        response.writeHead(404, {
          "content-type": "text/plain; charset=utf-8",
        });
        response.end("not found");
        return;
      }

      response.writeHead(200, {
        "content-type":
          CONTENT_TYPES.get(extname(fullPath)) || "application/octet-stream",
      });
      response.end(data);
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve({
        origin: `http://127.0.0.1:${server.address().port}`,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            let settled = false;
            const settle = (error) => {
              if (settled) return;
              settled = true;
              if (error) {
                closeReject(error);
                return;
              }
              closeResolve();
            };

            server.close((error) => {
              settle(error);
            });

            if (typeof server.closeAllConnections === "function") {
              server.closeAllConnections();
            }
            if (typeof server.closeIdleConnections === "function") {
              server.closeIdleConnections();
            }
            setTimeout(settle, 100);
          }),
      });
    });
  });
}

function impulse(length, sample, amplitude = 1) {
  return Array.from({ length }, (_, index) =>
    index === sample ? amplitude : 0
  );
}

test("page presents compact local import and an empty shared scope", async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await page.goto(server.origin + "/drum-alignment.html");
    assert.equal(await page.locator("h1").innerText(), "Drum Alignment");
    assert.equal(await page.locator("#drum-alignment-files").count(), 1);
    assert.ok(await page.locator("#drum-reference-selector").isVisible());
    assert.ok(await page.locator("#drum-analyze-button").isVisible());
    assert.match(
      await page.locator("#drum-alignment-status").innerText(),
      /Audio stays in this browser/
    );
    assert.equal(
      await page.locator(".drum-align-report").evaluate((node) => node.open),
      false
    );
    assert.equal(await page.locator("#drum-ruler").count(), 1);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("real calculations populate lanes and inspector; manual marker and reset recalculate", async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await page.goto(server.origin + "/drum-alignment.html?testHarness=1");
    await page.waitForFunction(() => window.DrumAlignmentWorkbenchTest);
    const burst = (at, invert = false) => {
      const data = Array(400).fill(0);
      [0.2, 0.8, -0.6, 0.4, -0.2].forEach((value, index) => {
        data[at + index] = value * (invert ? -1 : 1);
      });
      return data;
    };
    const oh = Array(400).fill(0);
    for (const at of [45, 145, 245])
      [0.2, 0.8, -0.6, 0.4, -0.2].forEach((value, index) => {
        oh[at + index] = value;
      });
    await page.evaluate(
      (tracks) => window.DrumAlignmentWorkbenchTest.loadTracks(tracks),
      [
        { id: "oh-l", fileName: "OH L.wav", sampleRate: 1000, channelData: oh },
        { id: "oh-r", fileName: "OH R.wav", sampleRate: 1000, channelData: oh },
        {
          id: "top",
          fileName: "Snare Top.wav",
          sampleRate: 1000,
          channelData: burst(141),
        },
        {
          id: "bottom",
          fileName: "Snare Bottom.wav",
          sampleRate: 1000,
          channelData: burst(143, true),
        },
        {
          id: "tom",
          fileName: "Rack Tom.wav",
          sampleRate: 1000,
          channelData: burst(239),
        },
      ]
    );
    await page.locator("#drum-analyze-button").click();
    assert.equal(await page.locator(".drum-scope-track").count(), 5);
    await page.locator('[data-select-track="tom"]').click();
    assert.equal(
      await page.locator("#drum-selected-name").innerText(),
      "Rack Tom"
    );
    assert.match(
      await page.locator("#drum-report-panel").textContent(),
      /Rack Tom\.wav \[Tom\]/
    );
    await page.locator('[data-select-track="bottom"]').click();
    assert.match(
      await page.locator("#drum-pair-name").innerText(),
      /Snare Bottom.wav.*Snare Top.wav/
    );
    assert.match(
      await page.locator("#drum-correlation-panel").innerText(),
      /Timing envelope similarity/
    );
    assert.match(
      await page.locator("#drum-correlation-panel").innerText(),
      /Signed waveform correlation/
    );
    const scores = await page.evaluate(() =>
      window.DrumAlignmentWorkbenchTest.getState().result.correlations.find(
        (score) => score.trackId === "bottom"
      )
    );
    assert.ok(scores.envelope > 0.9);
    assert.ok(scores.signed < -0.9);
    assert.equal(await page.locator(".drum-scope-wave canvas").count(), 5);
    const dimensions = await page
      .locator(".drum-scope-wave canvas")
      .first()
      .evaluate((canvas) => [canvas.width, canvas.clientWidth]);
    assert.ok(dimensions[0] >= dimensions[1] * 2);
    await page.locator("#drum-track-details summary").click();
    await page.locator("#drum-selected-sample").fill("140");
    await page.locator("#drum-selected-sample").dispatchEvent("change");
    assert.match(
      await page.locator("#drum-report-panel").textContent(),
      /manual marker/
    );
    await page.locator("#drum-reset-auto").click();
    assert.equal(
      await page.locator("#drum-selected-sample").inputValue(),
      "144"
    );
    await page.locator("#drum-scope-zoom").selectOption("detail");
    assert.ok((await page.locator("#drum-ruler").getByText(/ms/).count()) > 0);
  } finally {
    await browser.close();
    await server.close();
  }
});
