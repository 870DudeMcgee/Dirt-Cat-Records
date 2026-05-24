const test = require("node:test");
const assert = require("node:assert/strict");
const {
  renderExactLedLadder,
  renderParameterCard,
  renderPresetSummary,
  createCopyText,
  copyRecallText,
  renderPrintSheet,
} = require("../brick-lane-lab");
const { ENIGMA_PARAMETERS, getGeneratedPreset } = require("../brick-lane-data");

test("renderExactLedLadder renders every exact rung label in order", () => {
  const html = renderExactLedLadder({
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
    assert.match(html, new RegExp(`>${label}<`));
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

test("createCopyText contains full parameter names and selected rung labels", () => {
  const preset = getGeneratedPreset();
  const text = createCopyText(preset);

  assert.match(text, /Sidechain High Frequency Emphasis\/De-emphasis/);
  assert.match(text, /Enigma Left/);
  assert.match(text, /2, 3, 4, 5, 6, 8, 10, 12, 15/);
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
