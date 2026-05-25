const test = require("node:test");
const assert = require("node:assert/strict");
const {
  renderExactLedLadder,
  renderParameterCard,
  renderPresetSummary,
  createCopyText,
  copyRecallText,
  renderPrintSheet,
  renderHardwareFaceplate,
  renderRecallCards,
} = require("../brick-lane-lab");
const { ENIGMA_PARAMETERS, getGeneratedPreset } = require("../brick-lane-data");

test("renderExactLedLadder renders every exact rung label in order", () => {
  const html = renderExactLedLadder({
    id: "detector",
    color: "magenta",
    scale: [
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
    selected: ["2", "3", "4"],
  });

  for (const label of [
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
  ]) {
    assert.match(html, new RegExp(`>${label}(?:\\s+|<)`));
  }
  assert.equal((html.match(/class="brick-lane-rung/g) || []).length, 12);
  assert.equal((html.match(/brick-lane-rung is-on/g) || []).length, 3);
  assert.match(html, />GR</);
});

test("renderParameterCard keeps full recall-critical parameter names", () => {
  const html = renderParameterCard({
    ...ENIGMA_PARAMETERS.sidechainHighFrequencyEmphasis,
    selected: ["2", "3", "4"],
  });

  assert.match(html, /Sidechain High Frequency Emphasis\/De-emphasis/);
  assert.match(html, /Enigma Left/);
  assert.doesNotMatch(html, />HF</);
});

test("renderPresetSummary includes mode, target gain reduction, and front-panel recall", () => {
  const preset = getGeneratedPreset();
  const html = renderPresetSummary(preset);

  assert.match(html, /Tame: Safe Vocal Catcher/);
  assert.match(html, /3-6 dB/);
  assert.match(html, /Attack/);
  assert.match(html, /Release/);
  assert.match(html, /STRESS/);
});

test("preset summary explains hardware mode with plain-language compressor family", () => {
  const preset = getGeneratedPreset();
  const html = renderPresetSummary({ ...preset, mode: "Tame" });

  assert.match(html, /TAME/i);
  assert.match(html, /Clean\/Transparent/);
  assert.match(html, /Saturation/);
  assert.doesNotMatch(html, /Stress:/);
});

test("parameter cards show hardware labels and plain-language meanings", () => {
  const html = renderParameterCard({
    ...ENIGMA_PARAMETERS.stressTypeDiodeClipping,
    selected: ["1.0"],
  });

  assert.match(html, /Stress Character \/ Diode Clipping/);
  assert.match(html, /Saturation character/);
  assert.match(html, /Chooses the flavor of drive or clipping/);
});

test("createCopyText contains full parameter names and selected rung labels", () => {
  const preset = getGeneratedPreset();
  const text = createCopyText(preset);

  assert.match(text, /Sidechain High Frequency Emphasis\/De-emphasis/);
  assert.match(text, /Enigma Left/);
  assert.match(text, /15/);
});

test("copy recall text includes Enigma guide labels for users", () => {
  const preset = getGeneratedPreset();
  const text = createCopyText({ ...preset, mode: "Glue" });

  assert.match(text, /GLUE - VCA/i);
  assert.match(text, /STRESS hardware control = Saturation/i);
  assert.match(text, /Compression ratio/);
});

test("copyRecallText handles denied clipboard permission without throwing", async () => {
  const result = await copyRecallText("Brick Lane recall", {
    navigator: {
      clipboard: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    },
  });

  assert.equal(result, false);
});

test("renderPrintSheet includes all Enigma parameters with exact ladders", () => {
  const preset = getGeneratedPreset();
  const html = renderPrintSheet(preset);

  for (const parameter of Object.values(preset.parameters)) {
    const escapedLabel = parameter.label.replace(/&/g, "&amp;");
    assert.match(
      html,
      new RegExp(escapedLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    );
  }
  assert.equal((html.match(/class="brick-lane-rung/g) || []).length, 14 * 12);
  assert.match(html, /Brick Lane 500 - Generated Preset Cheat Sheet/);
  assert.match(html, /Front-panel starting points/);
});

test("renderHardwareFaceplate matches physical front-panel anatomy", () => {
  const { getGeneratedPreset } = require("../brick-lane-data");
  const preset = getGeneratedPreset();
  const html = renderHardwareFaceplate(preset, {
    frontPanelValues: preset.frontPanelValues,
  });

  for (const label of ["INPUT", "THRESHOLD", "ATTACK", "RELEASE", "OUTPUT"]) {
    assert.match(html, new RegExp(`>${label}<`));
  }
  assert.equal((html.match(/brick-lane-main-knob/g) || []).length, 5);
  assert.equal((html.match(/brick-lane-stress-knob/g) || []).length, 1);
  assert.match(html, /data-meter-id="sig"/);
  assert.match(html, /data-meter-id="gr"/);
  assert.match(html, />VELVET</);
  assert.match(html, />POLISH</);
  assert.match(html, />optosync</i);
  assert.match(html, />IN</);
});

test("physical faceplate does not contain UI-only controls", () => {
  const { getGeneratedPreset } = require("../brick-lane-data");
  const html = renderHardwareFaceplate(getGeneratedPreset(), {});

  assert.doesNotMatch(html, /<select/i);
  assert.doesNotMatch(html, /Monitor:/);
  assert.doesNotMatch(html, /Generated Preset/);
  assert.doesNotMatch(html, /brick-lane-tab-btn/);
});

test("physical faceplate stays SIG/GR-only for non-VU monitor selection", () => {
  const preset = getGeneratedPreset();
  const vuHtml = renderHardwareFaceplate(preset, { monitorParam: "VU" });
  const enigmaHtml = renderHardwareFaceplate(preset, {
    monitorParam: "attackWeighting",
  });

  assert.equal(enigmaHtml, vuHtml);
  assert.match(enigmaHtml, /data-meter-id="sig"/);
  assert.match(enigmaHtml, /data-meter-id="gr"/);
});

test("recall cards mark the selected non-faceplate monitor parameter", () => {
  const preset = getGeneratedPreset();
  const html = renderRecallCards(preset, {
    activeTab: "primary",
    monitorParam: "attackWeighting",
  });

  assert.match(html, /id="brick-lane-monitor-select"/);
  assert.match(html, /value="attackWeighting" selected/);
  assert.match(
    html,
    /brick-lane-parameter-card is-monitored"[^>]*data-parameter-id="attackWeighting"/
  );
});

test("recall cards include and mark an off-tab monitored parameter", () => {
  const preset = getGeneratedPreset();
  const html = renderRecallCards(preset, {
    activeTab: "primary",
    monitorParam: "diodeHardness",
  });

  assert.match(html, /data-parameter-id="diodeHardness"/);
  assert.match(
    html,
    /brick-lane-parameter-card is-monitored"[^>]*data-parameter-id="diodeHardness"/
  );
});

test("simulation meter animation is not gated by monitor selection", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(
    path.join(__dirname, "..", "brick-lane-lab.js"),
    "utf8"
  );

  assert.doesNotMatch(source, /state\.monitorParam\s*===\s*"VU"/);
});
