const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getInitialState,
  labStateReducer,
  mapCompressionPointToControls,
} = require("../lib/lab/state-machine");

test("state machine returns complete initial preset browser state", () => {
  const state = getInitialState();
  assert.equal(state.useAreaId, "tracking");
  assert.equal(state.presetId, "safe-vocal-catcher");
  assert.ok(state.controls);
  assert.ok(state.context);
  assert.ok(state.frontPanelValues);
  assert.deepEqual(state.parameterSelections, {});
  assert.equal(state.activeTab, "primary");
  assert.equal(state.monitorParam, "VU");
  assert.equal(state.modified, false);
});

test("state machine handles INIT action", () => {
  const state = labStateReducer(undefined, { type: "INIT" });
  assert.equal(state.useAreaId, "tracking");
  assert.equal(state.presetId, "safe-vocal-catcher");
});

test("state machine handles SET_USE_AREA action", () => {
  const initialState = getInitialState();
  const nextState = labStateReducer(initialState, {
    type: "SET_USE_AREA",
    payload: { useAreaId: "bus-master" },
  });

  assert.equal(nextState.useAreaId, "bus-master");
  assert.equal(nextState.presetId, "invisible-mix-glue");
  assert.equal(nextState.modified, false);
  assert.notEqual(nextState.frontPanelValues, initialState.frontPanelValues);
});

test("state machine handles SET_PRESET action", () => {
  const initialState = getInitialState();
  const nextState = labStateReducer(initialState, {
    type: "SET_PRESET",
    payload: { presetId: "character-vocal-print" },
  });

  assert.equal(nextState.useAreaId, "tracking");
  assert.equal(nextState.presetId, "character-vocal-print");
  assert.equal(nextState.modified, false);
  assert.equal(nextState.frontPanelValues.stress, 45);
});

test("state machine selects a migrated problem-solving preset as a normal preset", () => {
  const initialState = getInitialState();
  const nextState = labStateReducer(initialState, {
    type: "SET_PRESET",
    payload: { presetId: "vocal-de-esser" },
  });

  assert.equal(nextState.useAreaId, "mixing");
  assert.equal(nextState.presetId, "vocal-de-esser");
  assert.equal(nextState.context.brightness, "sibilant");
  assert.equal(nextState.context.targetGainReduction, "2-5 dB");
  assert.deepEqual(nextState.parameterSelections, {});
  assert.equal(nextState.activeTab, "primary");
  assert.equal(nextState.monitorParam, "VU");
  assert.equal(nextState.modified, false);
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

test("state machine marks selected preset modified after user edits", () => {
  const initialState = getInitialState();

  const controlState = labStateReducer(initialState, {
    type: "UPDATE_CONTROL",
    payload: { controlId: "punchSmooth", value: 85 },
  });
  assert.equal(controlState.modified, true);

  const frontPanelState = labStateReducer(initialState, {
    type: "UPDATE_FRONT_PANEL",
    payload: { param: "threshold", value: 64 },
  });
  assert.equal(frontPanelState.modified, true);

  const parameterState = labStateReducer(initialState, {
    type: "SET_PARAMETER_SELECTION",
    payload: { parameterId: "ratio", selection: { value: "4" } },
  });
  assert.equal(parameterState.modified, true);
});
