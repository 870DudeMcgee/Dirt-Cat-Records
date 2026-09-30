const test = require("node:test");
const assert = require("node:assert/strict");
const { renderDrumAlignmentWaveforms, createWaveformPath } = require("../lib/lab/drum-waveform-renderer.js");

function canvas() {
  const calls = [];
  const context = new Proxy({
    calls,
    measureText: (value) => ({ width: String(value).length * 7 }),
  }, {
    get(target, key) {
      if (key in target) return target[key];
      if (["setTransform", "clearRect", "fillRect", "beginPath", "moveTo", "lineTo", "stroke", "fill", "quadraticCurveTo", "closePath", "fillText", "save", "restore", "setLineDash"].includes(key)) {
        return (...args) => calls.push([key, ...args]);
      }
      return undefined;
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { clientWidth: 600, width: 600, style: {}, getContext: () => context, calls };
}

test("scope shares a real-time viewport across different sample rates and scales at DPR2", () => {
  const target = canvas();
  const samples = (rate) => Float32Array.from({ length: rate }, (_, index) => index % 29 === 0 ? 1 : -0.3);
  const result = renderDrumAlignmentWaveforms(target, {
    sampleRate: 1000,
    referenceEvent: { sample: 500 },
    tracks: [
      { id: "a", sampleRate: 1000, channelData: [samples(1000)], transientSample: 500, duration: 1 },
      { id: "b", sampleRate: 2000, channelData: [samples(2000)], transientSample: 1000, duration: 1 },
    ],
  }, { windowSeconds: 0.02, pixelRatio: 2 });
  assert.equal(result.rendered, true);
  assert.equal(target.width, 1200);
  assert.ok(result.height > 300);
  assert.equal(result.lanes[0].viewport.startSample * 2, result.lanes[1].viewport.startSample);
  assert.equal(result.lanes[0].viewport.endSample * 2, result.lanes[1].viewport.endSample);
  assert.equal(result.lanes[0].markers.detected.x, result.lanes[1].markers.detected.x);
  assert.ok(target.calls.some(([name, value]) => name === "fillText" && String(value).includes("ms")));
});

test("close zoom follows individual signed samples rather than column envelopes", () => {
  const commands = createWaveformPath(Float32Array.from([0, 1, -1, 0]), { x: 0, y: 0, width: 100, height: 80 }, { startSample: 0, endSample: 4, pixelRatio: 2, normalize: false });
  assert.deepEqual(commands.map((command) => command.type), ["moveTo", "lineTo", "lineTo", "lineTo"]);
  assert.ok(commands[1].y < commands[0].y);
  assert.ok(commands[2].y > commands[0].y);
});
