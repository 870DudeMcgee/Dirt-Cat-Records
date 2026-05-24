const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getBusinessConfig,
  redactBusinessConfig,
} = require("../lib/automation/business-config");
const {
  COMMON_LED_SCALE,
  BRICK_LANE_COLORS,
  ENIGMA_PARAMETERS,
  USE_CASES,
  ARCHETYPES,
  getGeneratedPreset,
} = require("../brick-lane-data");

test("common LED scale matches the Brick Lane ladder labels", () => {
  assert.deepEqual(COMMON_LED_SCALE, [
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
  ]);
});

test("critical Enigma parameters preserve exact names, sides, and colors", () => {
  assert.equal(
    ENIGMA_PARAMETERS.sidechainHighFrequencyEmphasis.label,
    "Sidechain High Frequency Emphasis/De-emphasis"
  );
  assert.equal(
    ENIGMA_PARAMETERS.sidechainHighFrequencyEmphasis.side,
    "Enigma Left"
  );
  assert.equal(
    ENIGMA_PARAMETERS.sidechainHighFrequencyEmphasis.color,
    "magenta"
  );
  assert.deepEqual(
    ENIGMA_PARAMETERS.sidechainHighFrequencyEmphasis.scale,
    COMMON_LED_SCALE
  );
  assert.equal(ENIGMA_PARAMETERS.detector.side, "Enigma Left");
  assert.equal(ENIGMA_PARAMETERS.detector.color, "cyan");
  assert.equal(ENIGMA_PARAMETERS.ratio.side, "Enigma Right");
  assert.equal(ENIGMA_PARAMETERS.ratio.color, "blue");
  assert.equal(BRICK_LANE_COLORS.magenta, "#f52ee6");
});

test("first build exposes Tracking Vocal and Mix Bus use cases", () => {
  assert.deepEqual(
    USE_CASES.map((useCase) => useCase.id),
    ["tracking-vocal", "mix-bus"]
  );
  assert.ok(
    ARCHETYPES.some((archetype) => archetype.id === "safe-vocal-catcher")
  );
  assert.ok(
    ARCHETYPES.some((archetype) => archetype.id === "invisible-mix-glue")
  );
});

test("generated preset returns exact selected rung labels", () => {
  const preset = getGeneratedPreset({
    useCaseId: "tracking-vocal",
    archetypeId: "safe-vocal-catcher",
    controls: {
      punchSmooth: 58,
      cleanColor: 32,
      controlOpen: 76,
      safeExciting: 64,
      glueLoud: 44,
      stableWide: 38,
    },
    context: {
      vocalStyle: "rap-singing",
      brightness: "sibilant",
      dynamics: "uneven",
      targetGainReduction: "3-6 dB",
    },
  });

  assert.equal(preset.mode, "Tame");
  assert.equal(preset.targetGainReduction, "3-6 dB");
  assert.deepEqual(preset.parameters.sidechainHighFrequencyEmphasis.selected, [
    "2",
    "3",
    "4",
    "5",
    "6",
    "8",
    "10",
    "12",
    "15",
  ]);
  assert.deepEqual(preset.parameters.detector.selected, ["0.5", "1.0", "1.5"]);
  assert.equal(preset.parameters.ratio.side, "Enigma Right");
});

test("existing business config imports still work beside the new root module", () => {
  const redacted = redactBusinessConfig(
    getBusinessConfig({
      ADMIN_EMAIL: "josh@example.com",
      SITE_URL: "https://dirtcatrecords.com",
    })
  );

  assert.equal(redacted.businessName, "Dirt Cat Records");
});
