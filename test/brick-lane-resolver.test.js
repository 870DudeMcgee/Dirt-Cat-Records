const test = require("node:test");
const assert = require("node:assert/strict");
const data = require("../brick-lane-data");
const resolver = require("../lib/lab/brick-lane-resolver");

test("validates every Enigma parameter has behavior and evidence", () => {
  const result = resolver.validateEnigmaParameterMap(data.ENIGMA_PARAMETERS);

  assert.deepEqual(result.errors, []);
  assert.equal(result.parameterCount, data.PARAMETER_ORDER.length);
});

test("resolves detector setting IDs into exact LED patterns", () => {
  const resolved = resolver.resolveParameterSelection(
    data.ENIGMA_PARAMETERS.detector,
    { settingId: "peak-rms-slow" }
  );

  assert.equal(resolved.parameterId, "detector");
  assert.equal(resolved.behavior, "pattern-settings");
  assert.equal(resolved.label, "Peak + RMS + Slow RMS");
  assert.deepEqual(resolved.activeLedValues, ["0.5", "1.5", "3"]);
  assert.equal(resolved.displayScale.length, 12);
});

test("resolves stepped-scale values without inventing rung names", () => {
  const resolved = resolver.resolveParameterSelection(
    data.ENIGMA_PARAMETERS.ledBrightness,
    { value: "4" }
  );

  assert.equal(resolved.parameterId, "ledBrightness");
  assert.equal(resolved.behavior, "stepped-scale");
  assert.equal(resolved.label, "4");
  assert.deepEqual(resolved.activeLedValues, ["4"]);
});

test("throws on unknown pattern setting IDs", () => {
  assert.throws(
    () =>
      resolver.resolveParameterSelection(data.ENIGMA_PARAMETERS.detector, {
        settingId: "not-real",
      }),
    /Unknown setting ID "not-real" for Detector Mode Selection/
  );
});

test("throws on stepped value outside display scale", () => {
  assert.throws(
    () =>
      resolver.resolveParameterSelection(data.ENIGMA_PARAMETERS.ledBrightness, {
        value: "99",
      }),
    /Invalid stepped value "99" for LED Brightness Level/
  );
});

test("resolves a generated preset into display-ready Enigma selections", () => {
  const preset = data.getGeneratedPreset({
    useCaseId: "tracking-vocal",
    archetypeId: "safe-vocal-catcher",
  });

  const resolved = resolver.resolvePresetEnigmaSelections(preset);

  assert.equal(resolved.detector.label, "Peak + RMS + Slow RMS");
  assert.deepEqual(resolved.detector.activeLedValues, ["0.5", "1.5", "3"]);
  assert.equal(resolved.ledBrightness.behavior, "stepped-scale");
});
