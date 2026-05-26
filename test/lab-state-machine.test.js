const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getInitialState,
  labStateReducer,
  mapCompressionPointToControls,
} = require("../lib/lab/state-machine");

test("state machine returns complete initial state", () => {
  const state = getInitialState();
  assert.ok(state.useCaseId);
  assert.ok(state.archetypeId);
  assert.equal(state.problemPresetId, "sibilant-uneven-vocal");
  assert.ok(state.controls);
  assert.ok(state.context);
  assert.ok(state.frontPanelValues);
  assert.deepEqual(state.parameterSelections, {});
  assert.equal(state.activeTab, "primary");
  assert.equal(state.monitorParam, "VU");
});

test("state machine handles INIT action", () => {
  const state = labStateReducer(undefined, { type: "INIT" });
  assert.equal(state.useCaseId, "tracking-vocal");
  assert.equal(state.archetypeId, "safe-vocal-catcher");
});

test("state machine handles SET_USE_CASE action", () => {
  const initialState = getInitialState();
  const nextState = labStateReducer(initialState, {
    type: "SET_USE_CASE",
    payload: { useCaseId: "mix-bus" },
  });

  assert.equal(nextState.useCaseId, "mix-bus");
  assert.equal(nextState.archetypeId, "invisible-mix-glue");
  // verify deep copy of frontPanelValues
  assert.notEqual(nextState.frontPanelValues, initialState.frontPanelValues);
});

test("state machine handles SET_ARCHETYPE action", () => {
  const initialState = getInitialState();
  const nextState = labStateReducer(initialState, {
    type: "SET_ARCHETYPE",
    payload: { archetypeId: "character-vocal-print" },
  });

  assert.equal(nextState.archetypeId, "character-vocal-print");
  assert.equal(nextState.problemPresetId, null);
  assert.equal(nextState.frontPanelValues.stress, 45);
});

test("state machine applies a problem preset to source context and recall settings", () => {
  const initialState = getInitialState();
  const nextState = labStateReducer(initialState, {
    type: "APPLY_PROBLEM_PRESET",
    payload: { problemPresetId: "low-end-pumping-mix" },
  });

  assert.equal(nextState.problemPresetId, "low-end-pumping-mix");
  assert.equal(nextState.useCaseId, "mix-bus");
  assert.equal(nextState.archetypeId, "punch-preserving-bus");
  assert.equal(nextState.context.brightness, "low-end heavy");
  assert.equal(nextState.context.dynamics, "pumping");
  assert.equal(nextState.context.targetGainReduction, "1-2 dB");
  assert.equal(nextState.controls.punchSmooth, 72);
  assert.equal(nextState.frontPanelValues.scf, "200 Hz");
  assert.deepEqual(nextState.parameterSelections, {});
  assert.equal(nextState.activeTab, "primary");
  assert.equal(nextState.monitorParam, "VU");
  assert.notDeepEqual(nextState.controls, initialState.controls);
});

test("state machine handles UPDATE_CONTROL action", () => {
  const initialState = getInitialState();
  const nextState = labStateReducer(initialState, {
    type: "UPDATE_CONTROL",
    payload: { controlId: "punchSmooth", value: 85 },
  });

  assert.equal(nextState.controls.punchSmooth, 85);
  // Verify immutability
  assert.equal(initialState.controls.punchSmooth, 58);
});

test("compression field point update moves all trade-off controls", () => {
  const mapped = mapCompressionPointToControls({ x: 72, y: 28 });

  assert.deepEqual(Object.keys(mapped), [
    "punchSmooth",
    "cleanColor",
    "controlOpen",
    "safeExciting",
    "glueLoud",
    "stableWide",
  ]);

  const initialState = getInitialState();
  const nextState = labStateReducer(initialState, {
    type: "UPDATE_COMPRESSION_POINT",
    payload: { x: 72, y: 28 },
  });

  assert.deepEqual(nextState.controls, mapped);
  assert.notDeepEqual(nextState.controls, initialState.controls);
});

test("state machine handles UPDATE_FRONT_PANEL action", () => {
  const initialState = getInitialState();
  const nextState = labStateReducer(initialState, {
    type: "UPDATE_FRONT_PANEL",
    payload: { param: "input", value: 75 },
  });

  assert.equal(nextState.frontPanelValues.input, 75);
  // Verify immutability
  assert.equal(initialState.frontPanelValues.input, 50);
});

test("state machine handles SET_ACTIVE_TAB action", () => {
  const initialState = getInitialState();
  const nextState = labStateReducer(initialState, {
    type: "SET_ACTIVE_TAB",
    payload: { tab: "tone" },
  });

  assert.equal(nextState.activeTab, "tone");
});

test("state machine handles SET_MONITOR_PARAM action", () => {
  const initialState = getInitialState();
  const nextState = labStateReducer(initialState, {
    type: "SET_MONITOR_PARAM",
    payload: { param: "ratio" },
  });

  assert.equal(nextState.monitorParam, "ratio");
});

test("state machine stores pattern setting selections immutably", () => {
  const initialState = getInitialState();
  const selectedState = labStateReducer(initialState, {
    type: "SET_PARAMETER_SELECTION",
    payload: {
      parameterId: "detector",
      selection: { settingId: "peak-rms" },
    },
  });

  assert.deepEqual(selectedState.parameterSelections.detector, {
    settingId: "peak-rms",
  });
  assert.deepEqual(initialState.parameterSelections, {});
});

test("state machine stores stepped scalar selections immutably", () => {
  const initialState = getInitialState();
  const selectedState = labStateReducer(initialState, {
    type: "SET_PARAMETER_SELECTION",
    payload: {
      parameterId: "ledBrightness",
      selection: { value: "6" },
    },
  });

  assert.deepEqual(selectedState.parameterSelections.ledBrightness, {
    value: "6",
  });
  assert.deepEqual(initialState.parameterSelections, {});
});
