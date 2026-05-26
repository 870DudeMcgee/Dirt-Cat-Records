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
  USE_AREAS,
  SOURCES,
  PRESETS,
  DEFAULT_CONTROL_VALUES,
  getPresetsForUseArea,
  getPresetsGroupedBySource,
  getPresetById,
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

test("Brick Lane preset browser exposes workflow areas, sources, and one preset list", () => {
  assert.deepEqual(
    USE_AREAS.map((area) => area.id),
    ["tracking", "mixing", "bus-master"]
  );

  assert.ok(
    SOURCES.some(
      (source) =>
        source.id === "vocals" &&
        source.useAreaId === "tracking" &&
        source.label === "Vocals"
    )
  );
  assert.ok(
    SOURCES.some(
      (source) =>
        source.id === "mix-bus" &&
        source.useAreaId === "bus-master" &&
        source.label === "Mix Bus"
    )
  );

  assert.ok(PRESETS.length >= 26);
  assert.equal(getPresetById("safe-vocal-catcher").useAreaId, "tracking");
  assert.equal(getPresetById("safe-vocal-catcher").sourceId, "vocals");
  assert.equal(getPresetById("vocal-de-esser").useAreaId, "mixing");
  assert.equal(getPresetById("vocal-de-esser").sourceId, "vocals");
  assert.equal(getPresetById("invisible-mix-glue").useAreaId, "bus-master");
  assert.equal(getPresetById("invisible-mix-glue").sourceId, "mix-bus");

  for (const preset of PRESETS) {
    assert.ok(
      USE_AREAS.some((area) => area.id === preset.useAreaId),
      `${preset.id} should reference a valid use area`
    );
    assert.ok(
      SOURCES.some(
        (source) =>
          source.id === preset.sourceId && source.useAreaId === preset.useAreaId
      ),
      `${preset.id} should reference a valid source in its use area`
    );
    assert.ok(Array.isArray(preset.tags), `${preset.id} should have tags`);
    assert.ok(
      preset.tags.length > 0,
      `${preset.id} should have at least one tag`
    );
    assert.ok(preset.summary, `${preset.id} should have a summary`);
    assert.ok(preset.selected, `${preset.id} should have Enigma selections`);
    assert.deepEqual(Object.keys(preset.controls), [
      "punchSmooth",
      "cleanColor",
      "controlOpen",
      "safeExciting",
      "glueLoud",
      "stableWide",
    ]);
  }
});

test("Brick Lane preset model exports reusable default control values", () => {
  assert.deepEqual(DEFAULT_CONTROL_VALUES, {
    punchSmooth: 58,
    cleanColor: 32,
    controlOpen: 76,
    safeExciting: 64,
    glueLoud: 44,
    stableWide: 38,
  });
});

test("preset helpers filter and group presets by source under a workflow area", () => {
  assert.deepEqual(
    getPresetsForUseArea("tracking")
      .filter((preset) => preset.sourceId === "vocals")
      .map((preset) => preset.id),
    [
      "safe-vocal-catcher",
      "smooth-expensive-vocal",
      "modern-controlled-vocal",
      "character-vocal-print",
    ]
  );

  const mixingGroups = getPresetsGroupedBySource("mixing");
  assert.deepEqual(
    mixingGroups
      .find((group) => group.source.id === "vocals")
      .presets.map((preset) => preset.id),
    [
      "vocal-de-esser",
      "vocal-leveler",
      "harsh-vocal-smoother",
      "dull-vocal-forward",
    ]
  );

  const busGroups = getPresetsGroupedBySource("bus-master");
  assert.deepEqual(
    busGroups
      .find((group) => group.source.id === "mix-bus")
      .presets.map((preset) => preset.id),
    [
      "invisible-mix-glue",
      "thick-analog-bus",
      "punch-preserving-bus",
      "modern-finished-bus",
      "aggressive-energy-bus",
      "low-end-pumping-mix",
      "flat-lifeless-mix",
      "harsh-bright-mix",
    ]
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
  assert.deepEqual(preset.parameters.sidechainHighFrequencyEmphasis.selection, {
    settingId: "de-ess-hard",
  });
  assert.deepEqual(preset.parameters.detector.selection, {
    settingId: "peak-rms-slow",
  });
  assert.equal(preset.parameters.ratio.side, "Enigma Right");
});

test("generated preset derives Enigma selections from desired compression controls", () => {
  const smoothSafe = getGeneratedPreset({
    useCaseId: "tracking-vocal",
    archetypeId: "safe-vocal-catcher",
    controls: {
      punchSmooth: 18,
      cleanColor: 12,
      controlOpen: 24,
      safeExciting: 86,
      glueLoud: 78,
      stableWide: 82,
    },
  });

  const punchyControlled = getGeneratedPreset({
    useCaseId: "tracking-vocal",
    archetypeId: "safe-vocal-catcher",
    controls: {
      punchSmooth: 92,
      cleanColor: 84,
      controlOpen: 94,
      safeExciting: 22,
      glueLoud: 24,
      stableWide: 28,
    },
  });

  assert.deepEqual(smoothSafe.parameters.detector.selection, {
    settingId: "rms-slow-rms",
  });
  assert.deepEqual(punchyControlled.parameters.detector.selection, {
    settingId: "peak-rms",
  });
  assert.deepEqual(smoothSafe.parameters.ratio.selection, { value: "1.5" });
  assert.deepEqual(punchyControlled.parameters.ratio.selection, {
    value: "8",
  });
  assert.deepEqual(smoothSafe.parameters.releaseWeighting.selection, {
    value: "6",
  });
  assert.deepEqual(punchyControlled.parameters.releaseWeighting.selection, {
    value: "1.5",
  });
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

  assert.deepEqual(
    FRONT_PANEL_REFERENCE.mainKnobs.map((knob) => knob.id),
    ["input", "threshold", "attack", "release", "output"]
  );
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

test("Enigma parameters declare manual-backed behavior types and evidence", () => {
  const { ENIGMA_PARAMETERS, PARAMETER_ORDER } = require("../brick-lane-data");

  for (const id of PARAMETER_ORDER) {
    const parameter = ENIGMA_PARAMETERS[id];
    assert.ok(parameter.behavior, `${id} missing behavior`);
    assert.ok(
      ["pattern-settings", "stepped-scale"].includes(parameter.behavior),
      `${id} has unsupported behavior ${parameter.behavior}`
    );
    assert.ok(
      Array.isArray(parameter.evidence),
      `${id} missing evidence array`
    );
    assert.ok(parameter.evidence.length > 0, `${id} missing evidence entries`);
  }
});

test("Detector is modeled as settings with LED patterns, not twelve named rungs", () => {
  const { ENIGMA_PARAMETERS } = require("../brick-lane-data");
  const detector = ENIGMA_PARAMETERS.detector;

  assert.equal(detector.behavior, "pattern-settings");
  assert.ok(detector.settings.length < detector.displayScale.length);
  assert.deepEqual(
    detector.settings.find((setting) => setting.id === "peak-rms-slow")
      .ledPattern,
    ["0.5", "1.5", "3"]
  );
});

test("LED Brightness remains a simple stepped scale", () => {
  const { ENIGMA_PARAMETERS } = require("../brick-lane-data");
  const brightness = ENIGMA_PARAMETERS.ledBrightness;

  assert.equal(brightness.behavior, "stepped-scale");
  assert.equal(brightness.settings, undefined);
  assert.deepEqual(brightness.displayScale || brightness.scale, [
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

test("preset Enigma selections use canonical object selections", () => {
  for (const preset of PRESETS) {
    for (const parameterId of PARAMETER_ORDER) {
      const selection = preset.selected[parameterId];
      assert.equal(
        Array.isArray(selection),
        false,
        `${preset.id}.${parameterId} still uses a legacy raw rung array`
      );
      assert.equal(
        typeof selection,
        "object",
        `${preset.id}.${parameterId} selection must be an object`
      );
    }
  }
});
