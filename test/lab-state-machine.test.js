const test = require("node:test");
const assert = require("node:assert/strict");
const { getInitialState, labStateReducer } = require("../lib/lab/state-machine");

test("state machine returns complete initial state", () => {
  const state = getInitialState();
  assert.ok(state.useCaseId);
  assert.ok(state.archetypeId);
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
    payload: { useCaseId: "mix-bus" }
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
    payload: { archetypeId: "character-vocal-print" }
  });

  assert.equal(nextState.archetypeId, "character-vocal-print");
  assert.equal(nextState.frontPanelValues.stress, 45);
});

test("state machine handles UPDATE_CONTROL action", () => {
  const initialState = getInitialState();
  const nextState = labStateReducer(initialState, {
    type: "UPDATE_CONTROL",
    payload: { controlId: "punchSmooth", value: 85 }
  });

  assert.equal(nextState.controls.punchSmooth, 85);
  // Verify immutability
  assert.equal(initialState.controls.punchSmooth, 58);
});

test("state machine handles UPDATE_FRONT_PANEL action", () => {
  const initialState = getInitialState();
  const nextState = labStateReducer(initialState, {
    type: "UPDATE_FRONT_PANEL",
    payload: { param: "input", value: 75 }
  });

  assert.equal(nextState.frontPanelValues.input, 75);
  // Verify immutability
  assert.equal(initialState.frontPanelValues.input, 50);
});

test("state machine handles SET_ACTIVE_TAB action", () => {
  const initialState = getInitialState();
  const nextState = labStateReducer(initialState, {
    type: "SET_ACTIVE_TAB",
    payload: { tab: "tone" }
  });

  assert.equal(nextState.activeTab, "tone");
});

test("state machine handles SET_MONITOR_PARAM action", () => {
  const initialState = getInitialState();
  const nextState = labStateReducer(initialState, {
    type: "SET_MONITOR_PARAM",
    payload: { param: "ratio" }
  });

  assert.equal(nextState.monitorParam, "ratio");
});

test("state machine toggles parameter rung selections immutably", () => {
  const initialState = getInitialState();
  const selectedState = labStateReducer(initialState, {
    type: "TOGGLE_PARAMETER_RUNG",
    payload: { parameterId: "ratio", value: "4" }
  });

  assert.deepEqual(selectedState.parameterSelections.ratio, ["4"]);
  assert.deepEqual(initialState.parameterSelections, {});

  const clearedState = labStateReducer(selectedState, {
    type: "TOGGLE_PARAMETER_RUNG",
    payload: { parameterId: "ratio", value: "4" }
  });

  assert.deepEqual(clearedState.parameterSelections.ratio, []);
});
