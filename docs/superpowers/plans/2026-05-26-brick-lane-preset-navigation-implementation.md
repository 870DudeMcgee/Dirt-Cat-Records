# Brick Lane Preset Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Brick Lane Sonic Lab archetype/problem-preset split with one workflow-and-source grouped preset browser.

**Architecture:** Keep the existing static HTML/CSS/JS shape. Move preset selection to a single `PRESETS` model in `brick-lane-data.js`, update `lib/lab/state-machine.js` to track `useAreaId + presetId`, and update `brick-lane-lab.js` to render workflow tabs plus source-grouped preset rows. Keep the Enigma resolver and exact LED rendering unchanged.

**Tech Stack:** Static browser JavaScript, CommonJS exports for Node tests, CSS in `style.css`, Node built-in test runner, existing Playwright visual regression.

---

## File Structure

- Modify `brick-lane-data.js`
  - Replace user-facing `USE_CASES`, `ARCHETYPES`, and `PROBLEM_PRESETS` with `USE_AREAS`, `SOURCES`, and `PRESETS`.
  - Add lookup helpers: `getUseAreaById`, `getSourceById`, `getPresetsForUseArea`, `getPresetsGroupedBySource`, `getPresetById`, `getFirstPresetForUseArea`.
  - Keep `getGeneratedPreset` as the single preset-to-recall entry point.
- Modify `lib/lab/state-machine.js`
  - Replace `useCaseId`, `archetypeId`, and `problemPresetId` state with `useAreaId` and `presetId`.
  - Add `SET_USE_AREA` and `SET_PRESET`.
  - Mark preset output as modified when controls, front-panel values, or parameter selections change.
- Modify `brick-lane-lab.js`
  - Replace `renderUseCases`, `renderArchetypes`, and `renderProblemPresets` with `renderUseAreas` and `renderPresetBrowser`.
  - Update click handlers to dispatch `SET_USE_AREA` and `SET_PRESET`.
  - Update summary, copy, and print text to include workflow/source path and modified label.
- Modify `style.css`
  - Replace problem-card styling with source-section and preset-row styling.
  - Preserve compact dark plugin aesthetic and keep rows dense enough for the larger preset set.
- Modify tests:
  - `test/brick-lane-data.test.js`
  - `test/lab-state-machine.test.js`
  - `test/brick-lane-lab-render.test.js`
  - Existing resolver tests should continue to pass without resolver edits.

---

### Task 1: Data Model Tests For Use Areas, Sources, And Presets

**Files:**
- Modify: `test/brick-lane-data.test.js`
- Modify: `brick-lane-data.js`

- [ ] **Step 1: Replace legacy browser-model tests with failing preset-model tests**

In `test/brick-lane-data.test.js`, replace the imports for `USE_CASES`, `ARCHETYPES`, and `PROBLEM_PRESETS` with `USE_AREAS`, `SOURCES`, `PRESETS`, `getPresetsForUseArea`, `getPresetsGroupedBySource`, and `getPresetById`.

Use this test block to replace `first build exposes Tracking Vocal and Mix Bus use cases` and `problem presets model common source problems as real preset state`:

```js
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
          source.id === preset.sourceId &&
          source.useAreaId === preset.useAreaId
      ),
      `${preset.id} should reference a valid source in its use area`
    );
    assert.ok(Array.isArray(preset.tags), `${preset.id} should have tags`);
    assert.ok(preset.tags.length > 0, `${preset.id} should have at least one tag`);
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
    mixingGroups.find((group) => group.source.id === "vocals").presets.map(
      (preset) => preset.id
    ),
    [
      "vocal-de-esser",
      "vocal-leveler",
      "harsh-vocal-smoother",
      "dull-vocal-forward",
    ]
  );

  const busGroups = getPresetsGroupedBySource("bus-master");
  assert.deepEqual(
    busGroups.find((group) => group.source.id === "mix-bus").presets.map(
      (preset) => preset.id
    ),
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
```

- [ ] **Step 2: Run the focused data test and verify it fails**

Run:

```bash
node --test test/brick-lane-data.test.js
```

Expected: FAIL with missing `USE_AREAS`, `SOURCES`, `PRESETS`, or helper exports.

- [ ] **Step 3: Add the new use-area and source definitions**

In `brick-lane-data.js`, replace the current `USE_CASES` constant with:

```js
  const USE_AREAS = [
    {
      id: "tracking",
      label: "Tracking",
      description:
        "Capture-safe starting points for recording through the Brick Lane.",
    },
    {
      id: "mixing",
      label: "Mixing",
      description:
        "Source-specific mixing starts for leveling, tone, and problem control.",
    },
    {
      id: "bus-master",
      label: "Bus / Master",
      description:
        "Mix bus, stem bus, parallel bus, and mastering/finishing starts.",
    },
  ];

  const SOURCES = [
    { id: "vocals", useAreaId: "tracking", label: "Vocals" },
    { id: "bass", useAreaId: "tracking", label: "Bass" },
    { id: "guitar", useAreaId: "tracking", label: "Guitar" },
    { id: "drums", useAreaId: "tracking", label: "Drums" },
    { id: "keys-synths", useAreaId: "tracking", label: "Keys / Synths" },
    { id: "vocals", useAreaId: "mixing", label: "Vocals" },
    { id: "bass", useAreaId: "mixing", label: "Bass" },
    { id: "drums", useAreaId: "mixing", label: "Drums" },
    { id: "guitar", useAreaId: "mixing", label: "Guitar" },
    { id: "keys-synths", useAreaId: "mixing", label: "Keys / Synths" },
    { id: "full-mix-repair", useAreaId: "mixing", label: "Full Mix Repair" },
    { id: "mix-bus", useAreaId: "bus-master", label: "Mix Bus" },
    { id: "drum-bus", useAreaId: "bus-master", label: "Drum Bus" },
    { id: "vocal-bus", useAreaId: "bus-master", label: "Vocal Bus" },
    { id: "parallel-bus", useAreaId: "bus-master", label: "Parallel Bus" },
    { id: "mastering", useAreaId: "bus-master", label: "Mastering" },
  ];
```

- [ ] **Step 4: Convert the existing arrays into one `PRESETS` array**

Rename `ARCHETYPES` to `PRESETS` and add these fields to every existing object:

```js
      useAreaId: "tracking",
      sourceId: "vocals",
      intent: "starting-point",
      tags: ["vocal", "tracking", "safe"],
      controls: { ...DEFAULT_CONTROL_VALUES },
      context: {
        vocalStyle: "rap-singing",
        brightness: "sibilant",
        dynamics: "uneven",
        targetGainReduction: "3-6 dB",
      },
```

Use these exact placements and tags:

```js
  const PRESET_PLACEMENT = {
    "safe-vocal-catcher": {
      useAreaId: "tracking",
      sourceId: "vocals",
      intent: "starting-point",
      tags: ["vocal", "tracking", "safe", "peak-control"],
    },
    "smooth-expensive-vocal": {
      useAreaId: "tracking",
      sourceId: "vocals",
      intent: "starting-point",
      tags: ["vocal", "tracking", "smooth", "color"],
    },
    "modern-controlled-vocal": {
      useAreaId: "tracking",
      sourceId: "vocals",
      intent: "starting-point",
      tags: ["vocal", "tracking", "control", "modern"],
    },
    "character-vocal-print": {
      useAreaId: "tracking",
      sourceId: "vocals",
      intent: "starting-point",
      tags: ["vocal", "tracking", "color", "print"],
    },
    "invisible-mix-glue": {
      useAreaId: "bus-master",
      sourceId: "mix-bus",
      intent: "starting-point",
      tags: ["mix-bus", "glue", "transparent"],
    },
    "thick-analog-bus": {
      useAreaId: "bus-master",
      sourceId: "mix-bus",
      intent: "starting-point",
      tags: ["mix-bus", "analog", "thick"],
    },
    "punch-preserving-bus": {
      useAreaId: "bus-master",
      sourceId: "mix-bus",
      intent: "starting-point",
      tags: ["mix-bus", "punch", "low-end"],
    },
    "modern-finished-bus": {
      useAreaId: "bus-master",
      sourceId: "mix-bus",
      intent: "starting-point",
      tags: ["mix-bus", "finish", "modern"],
    },
    "aggressive-energy-bus": {
      useAreaId: "bus-master",
      sourceId: "mix-bus",
      intent: "starting-point",
      tags: ["mix-bus", "energy", "color"],
    },
  };
```

Before `PRESETS`, extract the existing default control object so it can be reused before `DEFAULT_STATE` is declared:

```js
  const DEFAULT_CONTROL_VALUES = Object.fromEntries(
    CONTROL_DEFINITIONS.map((control) => [control.id, control.defaultValue])
  );
```

- [ ] **Step 5: Add migrated problem presets and new source presets**

Append migrated and new presets to `PRESETS`. Use the existing selected/front-panel values from the closest current preset to avoid unverified Brick Lane behavior changes. Use these exact ids, labels, placements, and base presets:

```js
  const PRESET_BASES = {
    "vocal-de-esser": "safe-vocal-catcher",
    "vocal-leveler": "modern-controlled-vocal",
    "harsh-vocal-smoother": "modern-controlled-vocal",
    "dull-vocal-forward": "character-vocal-print",
    "bass-di-leveler": "safe-vocal-catcher",
    "bass-color-print": "character-vocal-print",
    "guitar-di-safety": "safe-vocal-catcher",
    "guitar-cab-print": "character-vocal-print",
    "kick-snare-safety": "modern-controlled-vocal",
    "room-mic-control": "character-vocal-print",
    "bass-leveler": "punch-preserving-bus",
    "low-end-bloom-control": "punch-preserving-bus",
    "pick-attack-control": "modern-controlled-vocal",
    "drum-crush": "aggressive-energy-bus",
    "kick-weight-control": "punch-preserving-bus",
    "snare-crack": "aggressive-energy-bus",
    "room-pump": "aggressive-energy-bus",
    "guitar-cab-tamer": "modern-controlled-vocal",
    "harsh-guitar-smoother": "modern-controlled-vocal",
    "rhythm-guitar-glue": "punch-preserving-bus",
    "low-end-pumping-mix": "punch-preserving-bus",
    "flat-lifeless-mix": "aggressive-energy-bus",
    "harsh-bright-mix": "modern-finished-bus",
    "drum-bus-glue": "punch-preserving-bus",
    "parallel-drum-smash": "aggressive-energy-bus",
    "vocal-bus-polish": "modern-finished-bus",
    "gentle-master-control": "invisible-mix-glue",
    "loudness-prep": "modern-finished-bus",
  };
```

Create a local helper near the preset data:

```js
  function createPresetFromBase(basePreset, overrides) {
    return {
      ...basePreset,
      ...overrides,
      selected: { ...basePreset.selected, ...(overrides.selected || {}) },
      controls: { ...DEFAULT_CONTROL_VALUES, ...(overrides.controls || {}) },
      context: { ...(basePreset.context || {}), ...(overrides.context || {}) },
      frontPanelValues: {
        ...basePreset.frontPanelValues,
        ...(overrides.frontPanelValues || {}),
      },
      frontPanel: { ...basePreset.frontPanel, ...(overrides.frontPanel || {}) },
      tags: [...overrides.tags],
      why: [...(overrides.why || basePreset.why || [])],
    };
  }
```

Use this pattern for each new preset:

```js
  const basePresetById = Object.fromEntries(
    PRESETS.map((preset) => [preset.id, preset])
  );

  PRESETS.push(
    createPresetFromBase(basePresetById[PRESET_BASES["vocal-de-esser"]], {
      id: "vocal-de-esser",
      useAreaId: "mixing",
      sourceId: "vocals",
      label: "Vocal De-Esser",
      intent: "problem-solving",
      tags: ["vocal", "de-ess", "bright", "control"],
      summary: "Controls sharp sibilance without darkening the whole vocal.",
      targetGainReduction: "2-5 dB",
      context: {
        vocalStyle: "lead vocal",
        brightness: "sibilant",
        dynamics: "uneven",
        targetGainReduction: "2-5 dB",
      },
      controls: { ...DEFAULT_CONTROL_VALUES },
    })
  );
```

Add the remaining presets with these summaries:

```js
[
  ["vocal-leveler", "Mixing", "vocals", "Vocal Leveler", "Smooths phrase-to-phrase level movement while keeping articulation intact."],
  ["harsh-vocal-smoother", "Mixing", "vocals", "Harsh Vocal Smoother", "Controls bright vocal edges without pulling the vocal backward."],
  ["dull-vocal-forward", "Mixing", "vocals", "Dull Vocal Forward", "Adds density and forward motion to a vocal that feels buried."],
  ["bass-di-leveler", "Tracking", "bass", "Bass DI Leveler", "Prints controlled bass DI level without over-committing color."],
  ["bass-color-print", "Tracking", "bass", "Bass Color Print", "Adds harmonic confidence while tracking bass through the Brick Lane."],
  ["guitar-di-safety", "Tracking", "guitar", "Guitar DI Safety", "Keeps guitar DI peaks contained before amp or cab processing."],
  ["guitar-cab-print", "Tracking", "guitar", "Guitar Cab Print", "Prints guitar cabinet attitude with moderate compression movement."],
  ["kick-snare-safety", "Tracking", "drums", "Kick/Snare Safety", "Catches close-mic drum peaks without flattening the transient."],
  ["room-mic-control", "Tracking", "drums", "Room Mic Control", "Controls room mic swings while keeping the room lively."],
  ["bass-leveler", "Mixing", "bass", "Bass Leveler", "Stabilizes bass sustain while preserving the note front."],
  ["low-end-bloom-control", "Mixing", "bass", "Low-End Bloom Control", "Controls swollen low-end notes before they push the mix around."],
  ["pick-attack-control", "Mixing", "bass", "Pick Attack Control", "Catches aggressive bass pick noise without dulling the low end."],
  ["drum-crush", "Mixing", "drums", "Drum Crush", "Adds obvious drum attitude and compression movement."],
  ["kick-weight-control", "Mixing", "drums", "Kick Weight Control", "Controls kick low-end weight without making the detector pump."],
  ["snare-crack", "Mixing", "drums", "Snare Crack", "Brings snare impact forward with controlled transient edge."],
  ["room-pump", "Mixing", "drums", "Room Pump", "Emphasizes room movement for energetic drum ambience."],
  ["guitar-cab-tamer", "Mixing", "guitar", "Guitar Cab Tamer", "Smooths cabinet bite and upper-mid shove."],
  ["harsh-guitar-smoother", "Mixing", "guitar", "Harsh Guitar Smoother", "Controls bright guitar harshness while keeping rhythm detail."],
  ["rhythm-guitar-glue", "Mixing", "guitar", "Rhythm Guitar Glue", "Adds cohesion to layered rhythm guitars."],
  ["low-end-pumping-mix", "Bus / Master", "mix-bus", "Low-End Pumping Mix", "Keeps kick and bass from over-driving bus compression."],
  ["flat-lifeless-mix", "Bus / Master", "mix-bus", "Flat Lifeless Mix", "Adds movement, harmonic attitude, and level confidence."],
  ["harsh-bright-mix", "Bus / Master", "mix-bus", "Harsh Bright Mix", "Finishes a bright mix while reducing high-frequency overreaction."],
  ["drum-bus-glue", "Bus / Master", "drum-bus", "Drum Bus Glue", "Pulls the drum kit together while preserving impact."],
  ["parallel-drum-smash", "Bus / Master", "parallel-bus", "Parallel Drum Smash", "Creates an aggressive crushed blend for parallel drum energy."],
  ["vocal-bus-polish", "Bus / Master", "vocal-bus", "Vocal Bus Polish", "Adds smooth vocal-bus control after individual vocal processing."],
  ["gentle-master-control", "Bus / Master", "mastering", "Gentle Master Control", "Applies light master control without obvious mix movement."],
  ["loudness-prep", "Bus / Master", "mastering", "Loudness Prep", "Sets up a louder master path with clean peak-aware control."]
]
```

- [ ] **Step 6: Add preset lookup helpers and update exports**

Add these helpers below `deriveCompressionSelectionsFromControls`:

```js
  function getUseAreaById(useAreaId) {
    return USE_AREAS.find((area) => area.id === useAreaId) || null;
  }

  function getSourceById(useAreaId, sourceId) {
    return (
      SOURCES.find(
        (source) => source.useAreaId === useAreaId && source.id === sourceId
      ) || null
    );
  }

  function getPresetById(presetId) {
    return PRESETS.find((preset) => preset.id === presetId) || null;
  }

  function getPresetsForUseArea(useAreaId) {
    return PRESETS.filter((preset) => preset.useAreaId === useAreaId);
  }

  function getPresetsGroupedBySource(useAreaId) {
    return SOURCES.filter((source) => source.useAreaId === useAreaId)
      .map((source) => ({
        source,
        presets: PRESETS.filter(
          (preset) =>
            preset.useAreaId === useAreaId && preset.sourceId === source.id
        ),
      }))
      .filter((group) => group.presets.length > 0);
  }

  function getFirstPresetForUseArea(useAreaId) {
    return getPresetsForUseArea(useAreaId)[0] || PRESETS[0];
  }
```

Update the API export object:

```js
    USE_AREAS,
    SOURCES,
    PRESETS,
    DEFAULT_STATE,
    getUseAreaById,
    getSourceById,
    getPresetById,
    getPresetsForUseArea,
    getPresetsGroupedBySource,
    getFirstPresetForUseArea,
    deriveCompressionSelectionsFromControls,
    getGeneratedPreset,
```

- [ ] **Step 7: Run the focused data test and verify it passes**

Run:

```bash
node --test test/brick-lane-data.test.js
```

Expected: PASS for the new preset-browser model tests. Remaining failures in the same file identify old `useCaseId` or `archetypeId` expectations and are handled in Task 2.

- [ ] **Step 8: Commit the data model**

```bash
git add brick-lane-data.js test/brick-lane-data.test.js
git commit -m "feat: add Brick Lane unified preset model"
```

---

### Task 2: Generated Preset Resolution From `presetId`

**Files:**
- Modify: `test/brick-lane-data.test.js`
- Modify: `test/brick-lane-resolver.test.js`
- Modify: `brick-lane-data.js`

- [ ] **Step 1: Update generated-preset tests to use `useAreaId + presetId`**

In `test/brick-lane-data.test.js`, replace state objects like:

```js
{
  useCaseId: "tracking-vocal",
  archetypeId: "safe-vocal-catcher",
}
```

with:

```js
{
  useAreaId: "tracking",
  presetId: "safe-vocal-catcher",
}
```

Add this regression test:

```js
test("generated preset includes workflow and source metadata", () => {
  const preset = getGeneratedPreset({
    useAreaId: "mixing",
    presetId: "vocal-de-esser",
  });

  assert.equal(preset.id, "vocal-de-esser");
  assert.equal(preset.useAreaId, "mixing");
  assert.equal(preset.sourceId, "vocals");
  assert.equal(preset.useAreaLabel, "Mixing");
  assert.equal(preset.sourceLabel, "Vocals");
  assert.equal(preset.label, "Vocal De-Esser");
  assert.ok(preset.tags.includes("de-ess"));
});
```

- [ ] **Step 2: Run focused tests and verify they fail on old state shape**

Run:

```bash
node --test test/brick-lane-data.test.js test/brick-lane-resolver.test.js
```

Expected: FAIL where `getGeneratedPreset` still looks for `useCaseId` and `archetypeId`.

- [ ] **Step 3: Update `DEFAULT_STATE`**

In `brick-lane-data.js`, replace the current `DEFAULT_STATE` with:

```js
  const DEFAULT_STATE = {
    useAreaId: "tracking",
    presetId: "safe-vocal-catcher",
    controls: { ...DEFAULT_CONTROL_VALUES },
    context: {
      vocalStyle: "rap-singing",
      brightness: "sibilant",
      dynamics: "uneven",
      targetGainReduction: "3-6 dB",
    },
  };
```

- [ ] **Step 4: Update `deriveSidechainSelection` to use new area ids**

Change the tracking branch from `tracking-vocal` to `tracking`:

```js
  function deriveSidechainSelection(intent, useAreaId) {
    if (useAreaId === "tracking") {
      if (intent.safe >= 76 && intent.clean >= 62) {
        return { settingId: "de-ess-hard" };
      }
      if (intent.safe >= 62) return { settingId: "de-ess-mid" };
      if (intent.color >= 72 || intent.exciting >= 68) {
        return { settingId: "sc-emp-hard" };
      }
      if (intent.color >= 54) return { settingId: "sc-emp-soft" };
      return { settingId: "sc-de-emp-soft" };
    }
```

- [ ] **Step 5: Update `getGeneratedPreset`**

Replace the current archetype lookup with:

```js
  function getGeneratedPreset(state = DEFAULT_STATE) {
    const requestedUseAreaId = state.useAreaId || DEFAULT_STATE.useAreaId;
    const preset =
      getPresetById(state.presetId) ||
      getFirstPresetForUseArea(requestedUseAreaId) ||
      PRESETS[0];
    const useArea = getUseAreaById(preset.useAreaId);
    const source = getSourceById(preset.useAreaId, preset.sourceId);

    const predictiveSelections = hasCustomCompressionControls(state.controls)
      ? deriveCompressionSelectionsFromControls(
          state.controls,
          preset.useAreaId
        )
      : {};
    const selected = {
      ...preset.selected,
      ...predictiveSelections,
      ...(state.parameterSelections || {}),
    };

    const parameters = Object.fromEntries(
      Object.entries(ENIGMA_PARAMETERS).map(([id, definition]) => [
        id,
        cloneParameterWithSelection(definition, selected[id]),
      ])
    );

    const isModified = Boolean(
      state.modified ||
        hasCustomCompressionControls(state.controls) ||
        Object.keys(state.parameterSelections || {}).length > 0
    );

    return {
      ...preset,
      useAreaLabel: useArea ? useArea.label : preset.useAreaId,
      sourceLabel: source ? source.label : preset.sourceId,
      isModified,
      controls: { ...DEFAULT_CONTROL_VALUES, ...(state.controls || {}) },
      context: { ...(preset.context || {}), ...(state.context || {}) },
      parameters,
      parameterOrder: [...PARAMETER_ORDER],
    };
  }
```

- [ ] **Step 6: Run focused data and resolver tests**

Run:

```bash
node --test test/brick-lane-data.test.js test/brick-lane-resolver.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit generated preset changes**

```bash
git add brick-lane-data.js test/brick-lane-data.test.js test/brick-lane-resolver.test.js
git commit -m "feat: resolve Brick Lane presets by preset id"
```

---

### Task 3: State Machine Migration

**Files:**
- Modify: `test/lab-state-machine.test.js`
- Modify: `lib/lab/state-machine.js`

- [ ] **Step 1: Replace old state-machine tests with new state shape tests**

In `test/lab-state-machine.test.js`, update the initial tests to:

```js
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
```

Replace `SET_USE_CASE`, `SET_ARCHETYPE`, and `APPLY_PROBLEM_PRESET` tests with:

```js
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
```

Add this modification test:

```js
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
```

- [ ] **Step 2: Run state-machine tests and verify they fail**

Run:

```bash
node --test test/lab-state-machine.test.js
```

Expected: FAIL with missing `useAreaId`, `presetId`, `SET_USE_AREA`, or `SET_PRESET`.

- [ ] **Step 3: Update state initialization and preset lookup**

In `lib/lab/state-machine.js`, replace initial state mapping and finder helpers with:

```js
    return {
      useAreaId: defaultDataState.useAreaId,
      presetId: defaultDataState.presetId,
      controls: { ...defaultDataState.controls },
      context: { ...defaultDataState.context },
      frontPanelValues: {
        input: 50,
        threshold: 48,
        attack: 42,
        release: 52,
        output: 50,
        stress: 28,
        scf: "100 Hz",
        link: "STEREO",
      },
      parameterSelections: {},
      activeTab: "primary",
      monitorParam: "VU",
      modified: false,
    };
```

```js
  function findPreset(presetId) {
    if (!data || typeof data.getPresetById !== "function") return null;
    return data.getPresetById(presetId);
  }

  function stateFromPreset(state, preset) {
    return {
      ...state,
      useAreaId: preset.useAreaId,
      presetId: preset.id,
      controls: { ...preset.controls },
      context: { ...preset.context },
      frontPanelValues: preset.frontPanelValues
        ? { ...preset.frontPanelValues }
        : { ...state.frontPanelValues },
      parameterSelections: {},
      activeTab: "primary",
      monitorParam: "VU",
      modified: false,
    };
  }
```

- [ ] **Step 4: Replace reducer cases**

Replace `SET_USE_CASE`, `SET_ARCHETYPE`, and `APPLY_PROBLEM_PRESET` with:

```js
      case "SET_USE_AREA": {
        const { useAreaId } = action.payload;
        if (!useAreaId) return state;

        const preset =
          data && typeof data.getFirstPresetForUseArea === "function"
            ? data.getFirstPresetForUseArea(useAreaId)
            : null;
        if (!preset) return state;

        return stateFromPreset(state, preset);
      }

      case "SET_PRESET": {
        const { presetId } = action.payload;
        if (!presetId) return state;

        const preset = findPreset(presetId);
        if (!preset) return state;

        return stateFromPreset(state, preset);
      }
```

In every user-editing case, replace `problemPresetId: null` with `modified: true`. Apply this to `UPDATE_CONTROL`, `UPDATE_COMPRESSION_POINT`, `UPDATE_FRONT_PANEL`, `SET_PARAMETER_SELECTION`, `TOGGLE_PARAMETER_RUNG`, and `UPDATE_CONTEXT`.

- [ ] **Step 5: Run state-machine tests**

Run:

```bash
node --test test/lab-state-machine.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit the state machine migration**

```bash
git add lib/lab/state-machine.js test/lab-state-machine.test.js
git commit -m "feat: migrate Brick Lane state to preset ids"
```

---

### Task 4: Preset Browser Rendering

**Files:**
- Modify: `test/brick-lane-lab-render.test.js`
- Modify: `brick-lane-lab.js`

- [ ] **Step 1: Replace render imports and tests**

In `test/brick-lane-lab-render.test.js`, replace `renderProblemPresets` import with:

```js
  renderUseAreas,
  renderPresetBrowser,
```

Replace the `renderProblemPresets shows actionable common problems instead of static source tiles` test with:

```js
test("renderUseAreas renders workflow tabs", () => {
  const html = renderUseAreas({ useAreaId: "mixing" });

  assert.match(html, /data-use-area-id="tracking"/);
  assert.match(html, /data-use-area-id="mixing"/);
  assert.match(html, /data-use-area-id="bus-master"/);
  assert.match(html, />Tracking</);
  assert.match(html, />Mixing</);
  assert.match(html, />Bus \/ Master</);
  assert.match(html, /data-use-area-id="mixing"[^>]*is-active|is-active[^>]*data-use-area-id="mixing"/);
});

test("renderPresetBrowser groups presets by source under selected workflow area", () => {
  const html = renderPresetBrowser({
    useAreaId: "mixing",
    presetId: "vocal-de-esser",
  });

  assert.match(html, /brick-lane-source-section/);
  assert.match(html, />Vocals</);
  assert.match(html, />Bass</);
  assert.match(html, />Drums</);
  assert.match(html, />Guitar</);
  assert.match(html, /data-preset-id="vocal-de-esser"/);
  assert.match(html, /Vocal De-Esser/);
  assert.match(html, /Controls sharp sibilance/);
  assert.match(html, /brick-lane-preset-row is-active/);
  assert.match(html, /brick-lane-preset-tag/);
  assert.doesNotMatch(html, /data-problem-preset-id/);
  assert.doesNotMatch(html, /data-archetype-id/);
});
```

- [ ] **Step 2: Run render tests and verify they fail**

Run:

```bash
node --test test/brick-lane-lab-render.test.js
```

Expected: FAIL with missing `renderUseAreas` or `renderPresetBrowser`.

- [ ] **Step 3: Add rendering helpers**

In `brick-lane-lab.js`, replace `renderUseCases`, `renderArchetypes`, and `renderProblemPresets` with:

```js
  function renderUseAreas(state) {
    return data.USE_AREAS.map((useArea) => {
      const activeClass = useArea.id === state.useAreaId ? " is-active" : "";
      return `<button class="brick-lane-option${activeClass}" type="button" data-use-area-id="${escapeHtml(useArea.id)}"><span>${escapeHtml(useArea.label)}</span></button>`;
    }).join("");
  }

  function renderPresetBrowser(state = {}) {
    const useAreaId = state.useAreaId || data.DEFAULT_STATE.useAreaId;
    const groups = data.getPresetsGroupedBySource(useAreaId);

    return groups
      .map((group) => {
        const rows = group.presets
          .map((preset) => {
            const activeClass =
              preset.id === state.presetId ? " is-active" : "";
            const tags = preset.tags
              .map(
                (tag) =>
                  `<span class="brick-lane-preset-tag">${escapeHtml(tag)}</span>`
              )
              .join("");

            return `<button class="brick-lane-preset-row${activeClass}" type="button" data-preset-id="${escapeHtml(preset.id)}">
              <span class="brick-lane-preset-main">
                <span class="brick-lane-preset-label">${escapeHtml(preset.label)}</span>
                <span class="brick-lane-preset-description">${escapeHtml(preset.summary)}</span>
              </span>
              <span class="brick-lane-preset-tags">${tags}</span>
            </button>`;
          })
          .join("");

        return `<section class="brick-lane-source-section">
          <h3>${escapeHtml(group.source.label)}</h3>
          <div class="brick-lane-preset-list">${rows}</div>
        </section>`;
      })
      .join("");
  }
```

- [ ] **Step 4: Update DOM render wiring**

In `initDom`, keep existing node ids for minimal HTML churn:

```js
      useAreas: document.getElementById("brick-lane-use-cases"),
      presetBrowser: document.getElementById("brick-lane-archetypes"),
```

Then update `render()`:

```js
      nodes.useAreas.innerHTML = renderUseAreas(state);
      nodes.presetBrowser.innerHTML = renderPresetBrowser(state);
      nodes.context.innerHTML = "";
```

Replace click handlers:

```js
    nodes.useAreas.addEventListener("click", (event) => {
      const button = event.target.closest("[data-use-area-id]");
      if (!button) return;

      state = stateMachine.labStateReducer(state, {
        type: "SET_USE_AREA",
        payload: { useAreaId: button.dataset.useAreaId },
      });
      render();
    });

    nodes.presetBrowser.addEventListener("click", (event) => {
      const button = event.target.closest("[data-preset-id]");
      if (!button) return;

      state = stateMachine.labStateReducer(state, {
        type: "SET_PRESET",
        payload: { presetId: button.dataset.presetId },
      });
      render();
    });
```

Remove the old `nodes.archetypes` and `nodes.context` click handlers.

- [ ] **Step 5: Update module exports**

At the bottom of `brick-lane-lab.js`, export:

```js
    renderUseAreas,
    renderPresetBrowser,
```

Remove:

```js
    renderUseCases,
    renderArchetypes,
    renderProblemPresets,
```

- [ ] **Step 6: Run render tests**

Run:

```bash
node --test test/brick-lane-lab-render.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit renderer browser changes**

```bash
git add brick-lane-lab.js test/brick-lane-lab-render.test.js
git commit -m "feat: render Brick Lane source-grouped presets"
```

---

### Task 5: Summary, Copy, And Print Metadata

**Files:**
- Modify: `test/brick-lane-lab-render.test.js`
- Modify: `brick-lane-lab.js`

- [ ] **Step 1: Add tests for workflow/source labels and modified output**

Add these tests to `test/brick-lane-lab-render.test.js`:

```js
test("preset summary shows workflow and source path", () => {
  const preset = getGeneratedPreset({
    useAreaId: "mixing",
    presetId: "vocal-de-esser",
  });
  const html = renderPresetSummary(preset);

  assert.match(html, /Mixing \/ Vocals/);
  assert.match(html, /Vocal De-Esser/);
});

test("summary and copy append Modified for edited presets", () => {
  const preset = getGeneratedPreset({
    useAreaId: "mixing",
    presetId: "vocal-de-esser",
    modified: true,
  });
  const html = renderPresetSummary(preset);
  const text = createCopyText(preset);

  assert.match(html, /Vocal De-Esser Modified/);
  assert.match(text, /Brick Lane Sonic Lab - Mixing \/ Vocals - Tame: Vocal De-Esser Modified/);
});

test("print sheet shows workflow and source path", () => {
  const preset = getGeneratedPreset({
    useAreaId: "bus-master",
    presetId: "invisible-mix-glue",
  });
  const html = renderPrintSheet(preset);

  assert.match(html, /Bus \/ Master \/ Mix Bus/);
  assert.doesNotMatch(html, /Use:<\/strong> tracking-vocal/);
});
```

- [ ] **Step 2: Run render tests and verify failure**

Run:

```bash
node --test test/brick-lane-lab-render.test.js
```

Expected: FAIL because summary, copy, and print still use the old label format.

- [ ] **Step 3: Add formatting helpers**

In `brick-lane-lab.js`, add:

```js
  function presetDisplayLabel(preset) {
    return `${preset.label}${preset.isModified ? " Modified" : ""}`;
  }

  function presetPathLabel(preset) {
    return `${preset.useAreaLabel || preset.useAreaId} / ${preset.sourceLabel || preset.sourceId}`;
  }
```

- [ ] **Step 4: Update `renderPresetSummary`**

Change the heading block to:

```js
      <p class="brick-lane-kicker">Generated Preset</p>
      <p class="brick-lane-preset-path">${escapeHtml(presetPathLabel(preset))}</p>
      <h2>${escapeHtml(preset.mode)}: ${escapeHtml(presetDisplayLabel(preset))}</h2>
```

- [ ] **Step 5: Update `createCopyText`**

Change the first line to:

```js
      `Brick Lane Sonic Lab - ${presetPathLabel(preset)} - ${preset.mode}: ${presetDisplayLabel(preset)}`,
```

- [ ] **Step 6: Update `renderPrintSheet`**

Change the print header metadata to:

```js
          <p>${escapeHtml(preset.mode)}: ${escapeHtml(presetDisplayLabel(preset))}</p>
          <p>${escapeHtml(presetPathLabel(preset))}</p>
```

Change the meta field from old use case id to:

```js
          <strong>Path:</strong> ${escapeHtml(presetPathLabel(preset))}
```

- [ ] **Step 7: Run render tests**

Run:

```bash
node --test test/brick-lane-lab-render.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit metadata output changes**

```bash
git add brick-lane-lab.js test/brick-lane-lab-render.test.js
git commit -m "feat: show Brick Lane preset path in outputs"
```

---

### Task 6: CSS For Source Sections And Preset Rows

**Files:**
- Modify: `style.css`
- Modify: `test/brick-lane-lab-render.test.js`

- [ ] **Step 1: Add render test that checks new class names are used**

Add this source inspection test to `test/brick-lane-lab-render.test.js`:

```js
test("render module no longer exposes legacy archetype or problem preset browser attributes", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(
    path.join(__dirname, "..", "brick-lane-lab.js"),
    "utf8"
  );

  assert.doesNotMatch(source, /data-archetype-id/);
  assert.doesNotMatch(source, /data-problem-preset-id/);
  assert.doesNotMatch(source, /renderProblemPresets/);
});
```

- [ ] **Step 2: Run render tests**

Run:

```bash
node --test test/brick-lane-lab-render.test.js
```

Expected: PASS if Task 4 removed the old renderer paths.

- [ ] **Step 3: Replace legacy problem-card CSS with preset browser CSS**

In `style.css`, replace `.brick-lane-problem-list`, `.brick-lane-problem-card`, `.brick-lane-problem-label`, `.brick-lane-problem-description`, and `.brick-lane-problem-meta` blocks with:

```css
.brick-lane-source-section {
  display: grid;
  gap: 0.42rem;
  margin-bottom: 0.78rem;
}

.brick-lane-source-section h3 {
  margin: 0.2rem 0 0;
  color: rgba(247, 248, 255, 0.72);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.brick-lane-preset-list {
  display: grid;
  gap: 0.42rem;
}

.brick-lane-preset-row {
  display: grid;
  width: 100%;
  gap: 0.38rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 7px;
  padding: 0.55rem;
  background: rgba(255, 255, 255, 0.055);
  color: var(--brick-lane-muted);
  font-size: 0.74rem;
  text-align: left;
}

.brick-lane-preset-row.is-active {
  border-color: rgba(94, 231, 255, 0.56);
  background:
    linear-gradient(135deg, rgba(94, 231, 255, 0.14), transparent 70%),
    rgba(255, 255, 255, 0.07);
}

.brick-lane-preset-main {
  display: grid;
  gap: 0.18rem;
}

.brick-lane-preset-label {
  color: #fff;
  font-size: 0.78rem;
  font-weight: 900;
}

.brick-lane-preset-description {
  line-height: 1.28;
}

.brick-lane-preset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.24rem;
}

.brick-lane-preset-tag {
  border: 1px solid rgba(94, 231, 255, 0.2);
  border-radius: 999px;
  padding: 0.12rem 0.34rem;
  color: var(--brick-lane-cyan);
  font-size: 0.61rem;
  font-weight: 800;
  line-height: 1.1;
  text-transform: uppercase;
}

.brick-lane-preset-path {
  margin: 0 0 0.2rem;
  color: var(--brick-lane-cyan);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

- [ ] **Step 4: Run syntax and focused tests**

Run:

```bash
npm run check:js
node --test test/brick-lane-lab-render.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit CSS changes**

```bash
git add style.css test/brick-lane-lab-render.test.js
git commit -m "style: polish Brick Lane preset browser"
```

---

### Task 7: Full Verification And Browser Pass

**Files:**
- Modify only if a verification failure points to a regression in files changed above.

- [ ] **Step 1: Run full JavaScript checks**

Run:

```bash
npm run check:js
```

Expected: PASS.

- [ ] **Step 2: Run the full Node test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Run Brick Lane visual regression**

Run:

```bash
npm run test:brick-lane-visual
```

Expected: PASS.

- [ ] **Step 4: Start a local static server for manual browser verification**

Run:

```bash
python3 -m http.server 4173
```

Expected: server reports it is serving on port `4173`.

- [ ] **Step 5: Open the Studio Tools page in the browser**

Use the browser tool to open:

```text
http://localhost:4173/studio-tools.html
```

Verify:

- The Brick Lane Sonic Lab shows `Tracking`, `Mixing`, and `Bus / Master` tabs.
- `Tracking` shows source sections with vocal, bass, guitar, and drum presets.
- `Mixing` shows source sections with `Vocal De-Esser`, bass, drums, and guitar presets.
- `Bus / Master` shows `Invisible Mix Glue` and the migrated full-mix problem presets under `Mix Bus`.
- Selecting a preset updates the hardware faceplate, generated summary, and recall cards.
- Changing the compression field appends `Modified` in the generated preset summary.
- Text does not overlap in the preset browser at desktop width.

- [ ] **Step 6: Stop the local static server**

Stop the server session with `Ctrl-C`.

- [ ] **Step 7: Commit verification notes if a doc is updated**

If verification updates `docs/brick-lane-visual-qa.md`, commit it:

```bash
git add docs/brick-lane-visual-qa.md
git commit -m "docs: record Brick Lane preset browser verification"
```

If no doc is updated, do not create an empty commit.

---

## Self-Review Checklist

- Spec coverage:
  - Workflow tabs are covered by Tasks 1, 3, 4, and 6.
  - Source-first grouping is covered by Tasks 1, 4, and 6.
  - De-essing under Mixing is covered by Tasks 1, 2, 4, and 5.
  - Single preset list replacing archetype/problem browser is covered by Tasks 1, 3, 4, and 6.
  - Existing output flows are covered by Tasks 2, 5, and 7.
- Placeholder scan:
  - The plan contains no incomplete markers and no open-ended implementation placeholders.
- Type consistency:
  - Data uses `useAreaId`, `sourceId`, and `presetId`.
  - State uses `useAreaId`, `presetId`, `modified`, `controls`, `context`, `frontPanelValues`, and `parameterSelections`.
  - UI event attributes use `data-use-area-id` and `data-preset-id`.
