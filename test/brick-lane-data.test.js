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
  PARAMETER_ORDER,
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
    "15",
  ]);
  assert.deepEqual(preset.parameters.detector.selected, ["0.5", "1.5", "3"]);
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

test("front panel reference captures physical Brick Lane 500 anatomy", () => {
  const { FRONT_PANEL_REFERENCE } = require("../brick-lane-data");

  assert.deepEqual(FRONT_PANEL_REFERENCE.mainKnobs.map((knob) => knob.id), [
    "input",
    "threshold",
    "attack",
    "release",
    "output",
  ]);
  assert.equal(FRONT_PANEL_REFERENCE.stressKnob.id, "stress");
  assert.deepEqual(FRONT_PANEL_REFERENCE.modeLabels, [
    "VELVET",
    "FLOAT",
    "SMASH",
    "TAME",
    "GLUE",
    "POLISH",
  ]);
  assert.deepEqual(FRONT_PANEL_REFERENCE.meters.sig.scale, [
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
  ]);
  assert.deepEqual(FRONT_PANEL_REFERENCE.meters.gr.scale, [
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
  assert.deepEqual(FRONT_PANEL_REFERENCE.scfFrequencies, [
    "60Hz",
    "100Hz",
    "200Hz",
  ]);
  assert.deepEqual(FRONT_PANEL_REFERENCE.lowerSections, [
    "scf",
    "mode",
    "optosync",
    "in",
  ]);
});

test("Enigma demystifier maps hardware mode names to familiar compressor families", () => {
  const { ENIGMA_DEMYSTIFIER } = require("../brick-lane-data");

  assert.equal(ENIGMA_DEMYSTIFIER.modes.VELVET.family, "Vari-Mu");
  assert.equal(ENIGMA_DEMYSTIFIER.modes.FLOAT.family, "Optical");
  assert.equal(ENIGMA_DEMYSTIFIER.modes.SMASH.family, "FET");
  assert.equal(ENIGMA_DEMYSTIFIER.modes.TAME.family, "Clean/Transparent");
  assert.equal(ENIGMA_DEMYSTIFIER.modes.GLUE.family, "VCA");
  assert.equal(ENIGMA_DEMYSTIFIER.modes.POLISH.family, "Limiter/Clipper");
});

test("Enigma demystifier presents Stress as Saturation outside the faceplate", () => {
  const { ENIGMA_DEMYSTIFIER } = require("../brick-lane-data");

  assert.equal(ENIGMA_DEMYSTIFIER.saturation.hardwareLabel, "STRESS");
  assert.equal(ENIGMA_DEMYSTIFIER.saturation.userLabel, "Saturation");
  assert.match(
    ENIGMA_DEMYSTIFIER.parameters.stressTypeDiodeClipping.userLabel,
    /Saturation character/
  );
  assert.match(
    ENIGMA_DEMYSTIFIER.parameters.diodeHardness.userLabel,
    /Saturation hardness/
  );
});

test("Enigma demystifier keeps recall-critical hardware labels available", () => {
  const { ENIGMA_DEMYSTIFIER } = require("../brick-lane-data");

  assert.equal(
    ENIGMA_DEMYSTIFIER.parameters.sidechainHighFrequencyEmphasis.hardwareLabel,
    "Sidechain High Frequency Emphasis/De-emphasis"
  );
  assert.equal(
    ENIGMA_DEMYSTIFIER.parameters.ratio.userLabel,
    "Compression ratio"
  );
  assert.equal(
    ENIGMA_DEMYSTIFIER.parameters.detector.userLabel,
    "Detector blend"
  );
});

test("Enigma demystifier hardware labels stay aligned with canonical parameters", () => {
  const { ENIGMA_DEMYSTIFIER } = require("../brick-lane-data");

  assert.deepEqual(Object.keys(ENIGMA_DEMYSTIFIER.parameters), PARAMETER_ORDER);

  for (const id of PARAMETER_ORDER) {
    assert.equal(
      ENIGMA_DEMYSTIFIER.parameters[id].hardwareLabel,
      ENIGMA_PARAMETERS[id].label
    );
  }
});
