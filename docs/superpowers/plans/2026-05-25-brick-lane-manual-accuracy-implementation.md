# Brick Lane Manual Accuracy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Brick Lane Sonic Lab Enigma data and rendering path so front-panel recall, Enigma LED behavior, generated presets, copy text, and print sheets follow the Cranborne Brick Lane manual's intent instead of a generic one-label-per-rung model.

**Architecture:** Keep the existing static HTML/CSS/JS app, but move all Enigma meanings into canonical data and pure resolver helpers. `brick-lane-data.js` owns manual-backed parameter definitions, behavior type, evidence, settings, and presets; `lib/lab/brick-lane-resolver.js` resolves setting IDs or scalar values into display-ready LED states; `brick-lane-lab.js` only renders resolved data. Add an internal audit document and fixture-style tests so source accuracy is enforced without cluttering the user interface.

**Tech Stack:** Plain JavaScript, UMD/browser-compatible modules, Node `node:test`, Playwright-backed existing visual regression tests, existing `npm run check:js`.

---

## File Structure

- Create `docs/brick-lane-manual-audit.md`
  - Internal source-of-truth audit matrix for manual-stated facts, manual-derived conclusions, video-confirmed notes, and current-app corrections.
- Create `lib/lab/brick-lane-resolver.js`
  - Pure helper module for validating parameters, resolving preset selections, deriving LED patterns, and formatting setting labels.
- Modify `brick-lane-data.js`
  - Add behavior types, evidence metadata, pattern-based settings, stepped-scale rules, and migrate archetype selections from raw rung arrays to setting IDs or scalar values.
- Modify `brick-lane-lab.js`
  - Remove `RUNG_LABELS`; render labels, meanings, and LED states from resolver output.
- Modify `lib/lab/state-machine.js`
  - Rename rung-toggle semantics to setting/step selection semantics while preserving backward-compatible DOM actions during migration.
- Modify `test/brick-lane-data.test.js`
  - Add data contract and source audit alignment tests.
- Create `test/brick-lane-resolver.test.js`
  - Test validation, pattern setting resolution, stepped scale resolution, preset resolution, and runtime fallback.
- Modify `test/brick-lane-lab-render.test.js`
  - Assert render output comes from canonical settings, not local hard-coded rung names.
- Modify `test/lab-state-machine.test.js`
  - Update state interaction tests to setting IDs or scalar step values.
- Modify `test/brick-lane-visual-regression.test.js`
  - Keep existing faceplate assertions and add a small rendered parameter sanity check for pattern-based Detector behavior.
- Modify `docs/brick-lane-reference-audit.md`
  - Link the new manual audit and clarify that Enigma LED behavior is now governed by `docs/brick-lane-manual-audit.md`.

## Task 1: Create The Internal Manual Audit Artifact

**Files:**
- Create: `docs/brick-lane-manual-audit.md`
- Modify: `docs/brick-lane-reference-audit.md`

- [ ] **Step 1: Create the manual audit document**

Add `docs/brick-lane-manual-audit.md` with this initial structure. During this step, transcribe and derive values directly from the official Brick Lane manual and the two supplied videos; do not copy the current app's rung labels as facts.

```markdown
# Brick Lane Manual Accuracy Audit

Date: 2026-05-25
Scope: Brick Lane Sonic Lab front-panel and Enigma LED behavior

## Source Priority

1. Official Cranborne Brick Lane 500 user guide.
2. Supplied video references:
   - https://www.youtube.com/watch?v=0dbLWwkQRVg&t=1s
   - https://www.youtube.com/watch?v=jGBbKE5YDPU
3. Existing local implementation and docs as historical context only.

## Rules For Derived Entries

- `manual-stated` means the manual directly names the value or behavior.
- `manual-derived` means the manual gives enough relationships, examples, table direction, or LED ordering to infer the behavior.
- `video-confirmed` means a supplied video confirms physical LED behavior or navigation.
- User-facing UI must not show evidence labels.
- Pattern-based parameters store real settings and LED patterns; they do not invent one setting per printed LED mark.

## Current App Corrections

| Area | Current Problem | Correct Model |
| --- | --- | --- |
| Detector Mode Selection | Invents twelve one-to-one detector rung names. | Store valid detector settings and render their LED patterns on the 12-position display. |
| Enigma meanings | `brick-lane-lab.js` owns `RUNG_LABELS`. | `brick-lane-data.js` owns meanings; renderers consume resolved settings. |
| Presets | Presets store raw rung arrays that can bypass a valid setting. | Pattern parameters store setting IDs; stepped parameters store scalar steps. |

## Audit Matrix

| Parameter | Side | Color | Behavior | Manual Facts | Derived Conclusion | Valid Settings Or Scalar Rule | Evidence Type |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Stress Character / Diode Clipping | Enigma Left | Red | pattern-settings | Manual describes stress/diode clipping behavior by mode or clipping family. | Use named saturation-character settings with explicit LED patterns from manual examples and LED ordering. | Setting IDs, names, LED patterns. | manual-stated + manual-derived |
| Diode Hardness | Enigma Left | Yellow | stepped-scale | Manual describes diode hardness as a hardness amount. | Treat as a direct stepped hardness amount for this implementation. If the audit proves named pattern behavior, update this row and add setting IDs before Task 3 starts. | Scalar `{ value }` using the shared display scale. | manual-stated |
| Stress Crossover & Phase | Enigma Left | Blue | pattern-settings | Manual describes crossover and phase behavior. | Use named phase/crossover settings with LED patterns. | Setting IDs, names, LED patterns. | manual-stated + manual-derived |
| Sidechain High Frequency Emphasis/De-emphasis | Enigma Left | Magenta | pattern-settings | Manual describes sidechain high-frequency emphasis/de-emphasis behavior. | Use named HF sidechain behavior settings and their LED patterns. | Setting IDs, names, LED patterns. | manual-stated + manual-derived |
| Detector Mode Selection | Enigma Left | Cyan | pattern-settings | Manual describes detector components such as Peak, RMS, and Slow RMS and shows that the display is a pattern. | Valid detector selections are behavior combinations rendered as LED patterns; do not create twelve detector choices. | `peak`, `rms`, `slow-rms`, `peak-rms`, `peak-slow-rms`, `rms-slow-rms`, `peak-rms-slow-rms` where supported by manual. | manual-stated + manual-derived |
| Crest Factor Shaping | Enigma Left | Green | stepped-scale | Manual describes crest-factor shaping across detector behavior. | Treat as a direct stepped shaping amount for this implementation. If the audit proves named pattern behavior, update this row and add setting IDs before Task 3 starts. | Scalar `{ value }` using the shared display scale. | manual-derived |
| Stereo/Mono Sidechain Linking | Enigma Left | White | stepped-scale | Manual describes stereo/mono sidechain linking percentage or behavior. | Use stepped scale for link amount when manual shows percentage-like progression. | Scalar step values or named link modes. | manual-stated |
| Ratio Setting Curve | Enigma Right | Blue | stepped-scale | Manual describes ratio curve behavior. | Use scalar/named ratio curve entries based on manual wording. | Scalar step values or named curve settings. | manual-stated |
| Knee Width | Enigma Right | Cyan | stepped-scale | Manual describes knee width. | Use stepped scale when the manual presents width as progressive. | Scalar step values. | manual-stated |
| Attack Weighting Shape | Enigma Right | Red | stepped-scale | Manual includes attack weighting table/examples. | Use exact manual weighting values and LED order. | Scalar step values with manual table labels. | manual-stated |
| Release Weighting Behavior | Enigma Right | White | stepped-scale | Manual includes release weighting table/examples. | Use exact manual weighting values and LED order. | Scalar step values with manual table labels. | manual-stated |
| Hold Timing | Enigma Right | Green | stepped-scale | Manual describes hold timing. | Use exact hold values if listed; otherwise derive monotonic timing from examples. | Scalar step values. | manual-stated + manual-derived |
| Lookahead Time | Enigma Right | Yellow | stepped-scale | Manual describes lookahead time. | Use exact lookahead values if listed; otherwise derive monotonic timing from examples. | Scalar step values. | manual-stated + manual-derived |
| LED Brightness Level | Enigma Right | Magenta | stepped-scale | Manual describes LED brightness level. | Use simple stepped brightness; no extra translation. | Scalar step values. | manual-stated |

## Preset Recommendation Audit

| Preset | Current Risk | Required Fix |
| --- | --- | --- |
| Safe Vocal Catcher | Uses raw detector rung array. | Select valid detector setting ID that matches intended Peak + RMS + Slow RMS behavior. |
| Smooth Expensive Vocal | Uses raw detector and tone arrays. | Select valid pattern settings and scalar steps backed by manual audit. |
| Modern Controlled Vocal | Uses raw lookahead/ratio/sidechain selections. | Resolve to valid setting IDs or scalar values. |
| Character Vocal Print | Uses raw saturation-related selections. | Resolve to manual-backed saturation character/hardness/crossover choices. |
| Mix Bus presets | Raw arrays may not match manual display behavior. | Migrate all Enigma selections through canonical resolver. |
```

- [ ] **Step 2: Link the new audit from the existing reference audit**

Modify `docs/brick-lane-reference-audit.md` under `Known Open Risks` by replacing the current Enigma-risk bullet:

```markdown
- Enigma internal rung behavior is governed by [brick-lane-manual-audit.md](brick-lane-manual-audit.md). Future changes must update that audit and the source-aligned tests before changing UI labels or preset data.
```

- [ ] **Step 3: Commit the audit scaffold**

Run:

```bash
git add docs/brick-lane-manual-audit.md docs/brick-lane-reference-audit.md
git commit -m "docs: add Brick Lane manual accuracy audit"
```

Expected: commit includes only the two docs files.

## Task 2: Add Resolver Contract Tests First

**Files:**
- Create: `test/brick-lane-resolver.test.js`
- Create: `lib/lab/brick-lane-resolver.js`

- [ ] **Step 1: Write failing resolver tests**

Create `test/brick-lane-resolver.test.js`:

```js
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
```

- [ ] **Step 2: Run the failing resolver tests**

Run:

```bash
node --test test/brick-lane-resolver.test.js
```

Expected: FAIL with `Cannot find module '../lib/lab/brick-lane-resolver'`.

- [ ] **Step 3: Create the resolver module skeleton**

Create `lib/lab/brick-lane-resolver.js`:

```js
(function initBrickLaneResolver(globalScope) {
  function getDisplayScale(parameter) {
    return parameter.displayScale || parameter.scale || [];
  }

  function normalizeSelection(selection) {
    if (selection && typeof selection === "object" && !Array.isArray(selection)) {
      return selection;
    }
    if (Array.isArray(selection)) {
      return { legacyValues: selection.map(String) };
    }
    if (selection === undefined || selection === null) {
      return {};
    }
    return { value: String(selection) };
  }

  function resolveParameterSelection(parameter, selection) {
    if (!parameter) {
      throw new Error("Missing Enigma parameter definition.");
    }

    const normalized = normalizeSelection(selection);
    const behavior = parameter.behavior || "legacy-rungs";
    const displayScale = getDisplayScale(parameter);

    if (behavior === "pattern-settings") {
      const settingId = normalized.settingId;
      const setting = (parameter.settings || []).find(
        (candidate) => candidate.id === settingId
      );
      if (!setting) {
        throw new Error(`Unknown setting ID "${settingId}" for ${parameter.label}`);
      }
      return {
        parameterId: parameter.id,
        label: setting.label,
        meaning: setting.meaning || "",
        behavior,
        color: parameter.color,
        side: parameter.side,
        hardwareLabel: parameter.label,
        displayScale,
        activeLedValues: [...setting.ledPattern],
        selected: { settingId: setting.id },
      };
    }

    if (behavior === "stepped-scale") {
      const value = String(normalized.value);
      if (!displayScale.includes(value)) {
        throw new Error(`Invalid stepped value "${value}" for ${parameter.label}`);
      }
      return {
        parameterId: parameter.id,
        label: value,
        meaning: parameter.meaning || parameter.description || "",
        behavior,
        color: parameter.color,
        side: parameter.side,
        hardwareLabel: parameter.label,
        displayScale,
        activeLedValues: [value],
        selected: { value },
      };
    }

    const legacyValues = normalized.legacyValues || [];
    return {
      parameterId: parameter.id,
      label: legacyValues.join(", "),
      meaning: parameter.description || "",
      behavior,
      color: parameter.color,
      side: parameter.side,
      hardwareLabel: parameter.label,
      displayScale,
      activeLedValues: legacyValues,
      selected: { legacyValues },
    };
  }

  function validateEvidence(parameter) {
    const evidence = parameter.evidence || [];
    if (!Array.isArray(evidence) || evidence.length === 0) {
      return [`${parameter.id} is missing evidence metadata.`];
    }
    return evidence.flatMap((entry, index) => {
      const errors = [];
      if (!entry.source) errors.push(`${parameter.id} evidence ${index} missing source.`);
      if (!entry.type) errors.push(`${parameter.id} evidence ${index} missing type.`);
      if (!entry.reference) errors.push(`${parameter.id} evidence ${index} missing reference.`);
      if (!entry.note) errors.push(`${parameter.id} evidence ${index} missing note.`);
      return errors;
    });
  }

  function validateEnigmaParameterMap(parameters) {
    const errors = [];
    const entries = Object.values(parameters || {});

    for (const parameter of entries) {
      if (!parameter.id) errors.push("Parameter missing id.");
      if (!parameter.label) errors.push(`${parameter.id} missing label.`);
      if (!parameter.side) errors.push(`${parameter.id} missing side.`);
      if (!parameter.color) errors.push(`${parameter.id} missing color.`);
      if (!parameter.behavior) errors.push(`${parameter.id} missing behavior.`);
      if (getDisplayScale(parameter).length === 0) {
        errors.push(`${parameter.id} missing display scale.`);
      }
      errors.push(...validateEvidence(parameter));

      if (parameter.behavior === "pattern-settings") {
        if (!Array.isArray(parameter.settings) || parameter.settings.length === 0) {
          errors.push(`${parameter.id} missing pattern settings.`);
        } else {
          for (const setting of parameter.settings) {
            if (!setting.id) errors.push(`${parameter.id} has setting without id.`);
            if (!setting.label) errors.push(`${parameter.id}.${setting.id} missing label.`);
            if (!Array.isArray(setting.ledPattern) || setting.ledPattern.length === 0) {
              errors.push(`${parameter.id}.${setting.id} missing LED pattern.`);
            }
          }
        }
      }
    }

    return { errors, parameterCount: entries.length };
  }

  function resolvePresetEnigmaSelections(preset) {
    const resolved = {};
    for (const parameterId of preset.parameterOrder || []) {
      const parameter = preset.parameters[parameterId];
      const selected = parameter.selection || parameter.selected;
      resolved[parameterId] = resolveParameterSelection(parameter, selected);
    }
    return resolved;
  }

  const api = {
    resolveParameterSelection,
    resolvePresetEnigmaSelections,
    validateEnigmaParameterMap,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.BrickLaneResolver = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
```

- [ ] **Step 4: Run tests again**

Run:

```bash
node --test test/brick-lane-resolver.test.js
```

Expected: FAIL because `brick-lane-data.js` does not yet define behavior/evidence/settings.

- [ ] **Step 5: Commit resolver skeleton and failing contract tests**

Run:

```bash
git add lib/lab/brick-lane-resolver.js test/brick-lane-resolver.test.js
git commit -m "test: define Brick Lane resolver contract"
```

Expected: commit records resolver contract before data migration.

## Task 3: Migrate Canonical Enigma Data Shape

**Files:**
- Modify: `brick-lane-data.js`
- Modify: `test/brick-lane-data.test.js`

- [ ] **Step 1: Add data contract tests**

Append to `test/brick-lane-data.test.js`:

```js
test("Enigma parameters declare manual-backed behavior types and evidence", () => {
  const { ENIGMA_PARAMETERS, PARAMETER_ORDER } = require("../brick-lane-data");

  for (const id of PARAMETER_ORDER) {
    const parameter = ENIGMA_PARAMETERS[id];
    assert.ok(parameter.behavior, `${id} missing behavior`);
    assert.ok(
      ["pattern-settings", "stepped-scale"].includes(parameter.behavior),
      `${id} has unsupported behavior ${parameter.behavior}`
    );
    assert.ok(Array.isArray(parameter.evidence), `${id} missing evidence array`);
    assert.ok(parameter.evidence.length > 0, `${id} missing evidence entries`);
  }
});

test("Detector is modeled as settings with LED patterns, not twelve named rungs", () => {
  const { ENIGMA_PARAMETERS } = require("../brick-lane-data");
  const detector = ENIGMA_PARAMETERS.detector;

  assert.equal(detector.behavior, "pattern-settings");
  assert.ok(detector.settings.length < detector.displayScale.length);
  assert.deepEqual(
    detector.settings.find((setting) => setting.id === "peak-rms-slow").ledPattern,
    ["0.5", "1.5", "3"]
  );
});

test("LED Brightness remains a simple stepped scale", () => {
  const { ENIGMA_PARAMETERS } = require("../brick-lane-data");
  const brightness = ENIGMA_PARAMETERS.ledBrightness;

  assert.equal(brightness.behavior, "stepped-scale");
  assert.equal(brightness.settings, undefined);
  assert.deepEqual(brightness.displayScale, [
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
```

- [ ] **Step 2: Run failing data tests**

Run:

```bash
node --test test/brick-lane-data.test.js
```

Expected: FAIL because behavior/evidence/displayScale/settings are missing.

- [ ] **Step 3: Update the `parameter` helper**

In `brick-lane-data.js`, replace the existing `parameter` helper with:

```js
  function evidence({ source = "manual", type, reference, note }) {
    return { source, type, reference, note };
  }

  function parameter({
    id,
    label,
    side,
    color,
    description,
    behavior = "stepped-scale",
    displayScale = COMMON_LED_SCALE,
    scale,
    settings,
    evidence: evidenceEntries = [],
  }) {
    const resolvedScale = displayScale || scale || COMMON_LED_SCALE;
    const result = {
      id,
      label,
      side,
      color,
      scale: resolvedScale,
      displayScale: resolvedScale,
      behavior,
      description,
      evidence: evidenceEntries,
    };
    if (settings) result.settings = settings;
    return result;
  }
```

- [ ] **Step 4: Add manual evidence helper entries**

Near the color map in `brick-lane-data.js`, add:

```js
  const MANUAL_REFERENCES = {
    enigmaOverview: "Brick Lane 500 user guide, Enigma overview",
    enigmaLeft: "Brick Lane 500 user guide, Enigma Left parameter section",
    enigmaRight: "Brick Lane 500 user guide, Enigma Right parameter section",
    detector: "Brick Lane 500 user guide, Detector Mode Selection section",
    attackRelease: "Brick Lane 500 user guide, Attack and Release weighting tables",
    ledBrightness: "Brick Lane 500 user guide, LED Brightness Level section",
  };
```

- [ ] **Step 5: Convert Detector to `pattern-settings`**

Replace only the `detector` parameter definition with:

```js
    detector: parameter({
      id: "detector",
      label: "Detector Mode Selection",
      side: "Enigma Left",
      color: "cyan",
      behavior: "pattern-settings",
      description:
        "Selects detector behavior from Peak, RMS, Slow RMS, and supported combinations.",
      evidence: [
        evidence({
          type: "manual-stated",
          reference: MANUAL_REFERENCES.detector,
          note: "Manual identifies detector behavior as named detector modes/components rather than twelve independent rung names.",
        }),
        evidence({
          type: "manual-derived",
          reference: MANUAL_REFERENCES.detector,
          note: "LED display communicates selected detector components as patterns across the shared 12-position display.",
        }),
      ],
      settings: [
        {
          id: "peak",
          label: "Peak",
          meaning: "Fast peak-catching detector behavior.",
          ledPattern: ["0.5"],
        },
        {
          id: "rms",
          label: "RMS",
          meaning: "Leveling detector behavior that follows signal body.",
          ledPattern: ["1.5"],
        },
        {
          id: "slow-rms",
          label: "Slow RMS",
          meaning: "Slower detector behavior for phrase or program movement.",
          ledPattern: ["3"],
        },
        {
          id: "peak-rms",
          label: "Peak + RMS",
          meaning: "Combines fast peak capture with RMS body tracking.",
          ledPattern: ["0.5", "1.5"],
        },
        {
          id: "peak-slow-rms",
          label: "Peak + Slow RMS",
          meaning: "Combines peak catching with slower program movement.",
          ledPattern: ["0.5", "3"],
        },
        {
          id: "rms-slow-rms",
          label: "RMS + Slow RMS",
          meaning: "Combines body tracking with slower program movement.",
          ledPattern: ["1.5", "3"],
        },
        {
          id: "peak-rms-slow",
          label: "Peak + RMS + Slow RMS",
          meaning: "Combines peak catching, body tracking, and slower program movement.",
          ledPattern: ["0.5", "1.5", "3"],
        },
      ],
    }),
```

- [ ] **Step 6: Add behavior and evidence to the remaining parameters**

For each remaining `ENIGMA_PARAMETERS` entry, add `behavior`, `displayScale`, and `evidence`. Use `pattern-settings` only where the audit document identifies named behaviors with LED patterns; otherwise use `stepped-scale`.

For `ledBrightness`, use this exact definition:

```js
    ledBrightness: parameter({
      id: "ledBrightness",
      label: "LED Brightness Level",
      side: "Enigma Right",
      color: "magenta",
      behavior: "stepped-scale",
      description: "Calibrates the brightness settings for all front-panel LEDs.",
      evidence: [
        evidence({
          type: "manual-stated",
          reference: MANUAL_REFERENCES.ledBrightness,
          note: "Manual describes LED brightness as a direct display brightness level; no extra translation is needed.",
        }),
      ],
    }),
```

- [ ] **Step 7: Migrate archetype detector selections**

In every `ARCHETYPES[*].selected.detector`, replace raw arrays with setting IDs:

```js
detector: { settingId: "peak-rms-slow" }
```

Use these intended migrations unless the audit proves a different setting:

```js
// ["0.5", "1.5", "3"]
{ settingId: "peak-rms-slow" }

// ["0.5", "1.0"] or current Peak + RMS intent
{ settingId: "peak-rms" }

// ["1.5"] or RMS-focused intent
{ settingId: "rms" }

// ["1.0"] or current RMS-like intent
{ settingId: "rms" }
```

- [ ] **Step 8: Migrate LED brightness selections to stepped objects**

In every archetype, replace:

```js
ledBrightness: ["4"]
```

with:

```js
ledBrightness: { value: "4" }
```

- [ ] **Step 9: Preserve temporary legacy selected arrays for non-migrated parameters**

Update `cloneParameterWithSelection` in `brick-lane-data.js`:

```js
  function cloneParameterWithSelection(parameterDefinition, selected) {
    const selection =
      selected && typeof selected === "object" && !Array.isArray(selected)
        ? { ...selected }
        : Array.isArray(selected)
          ? { legacyValues: [...selected.map(String)] }
          : {};

    return {
      ...parameterDefinition,
      selection,
      selected: Array.isArray(selected) ? [...selected] : [],
    };
  }
```

- [ ] **Step 10: Run focused tests**

Run:

```bash
node --test test/brick-lane-data.test.js test/brick-lane-resolver.test.js
```

Expected: PASS for the new data contract, Detector settings, LED brightness stepped scale, and resolver behavior.

- [ ] **Step 11: Commit canonical data migration**

Run:

```bash
git add brick-lane-data.js test/brick-lane-data.test.js
git commit -m "feat: model Brick Lane Enigma parameter behavior"
```

Expected: commit includes data shape and data tests.

## Task 4: Render From Resolved Settings

**Files:**
- Modify: `brick-lane-lab.js`
- Modify: `test/brick-lane-lab-render.test.js`
- Modify: `studio-tools.html`

- [ ] **Step 1: Write failing render tests**

Append to `test/brick-lane-lab-render.test.js`:

```js
test("detector card renders valid setting name and exact LED pattern", () => {
  const preset = getGeneratedPreset({
    useCaseId: "tracking-vocal",
    archetypeId: "safe-vocal-catcher",
  });
  const html = renderParameterCard(preset.parameters.detector);

  assert.match(html, /Detector Mode Selection/);
  assert.match(html, /Peak \+ RMS \+ Slow RMS/);
  assert.equal((html.match(/brick-lane-rung is-on/g) || []).length, 3);
  assert.match(html, /data-val="0.5" aria-hidden="true"><\/span><span class="brick-lane-led-label">0.5/);
  assert.match(html, /data-val="1.5" aria-hidden="true"><\/span><span class="brick-lane-led-label">1.5/);
  assert.match(html, /data-val="3" aria-hidden="true"><\/span><span class="brick-lane-led-label">3/);
  assert.doesNotMatch(html, /Triple RMS Hyb|Dual RMS Hybrid|Peak\+RMS Var/);
});

test("render module does not own Enigma rung labels", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(
    path.join(__dirname, "..", "brick-lane-lab.js"),
    "utf8"
  );

  assert.doesNotMatch(source, /const RUNG_LABELS/);
  assert.doesNotMatch(source, /Triple RMS Hyb|Dual RMS Hybrid|Brutal|Hardest/);
});
```

- [ ] **Step 2: Run failing render tests**

Run:

```bash
node --test test/brick-lane-lab-render.test.js
```

Expected: FAIL because `brick-lane-lab.js` still owns `RUNG_LABELS`.

- [ ] **Step 3: Import resolver in `brick-lane-lab.js`**

At the top of `brick-lane-lab.js`, after the `stateMachine` constant, add:

```js
  const resolver =
    globalScope.BrickLaneResolver ||
    (typeof require === "function" ? require("./lib/lab/brick-lane-resolver") : null);
```

- [ ] **Step 4: Remove `RUNG_LABELS`**

Delete the entire `const RUNG_LABELS = { ... };` block from `brick-lane-lab.js`.

- [ ] **Step 5: Replace `renderExactLedLadder`**

Replace `renderExactLedLadder` with:

```js
  function renderExactLedLadder({
    color,
    scale,
    displayScale,
    activeLedValues,
    selected,
    id,
    visualScale,
    exactSelected,
  }) {
    const resolvedScale = displayScale || scale || [];
    const selectedSet = new Set(
      activeLedValues ||
        (selected || []).map(String)
    );
    const ledColor = data.BRICK_LANE_COLORS[color] || color;

    let maxSelectedVal = -1;
    if (!activeLedValues && id !== "detector" && selected && selected.length > 0 && !exactSelected) {
      maxSelectedVal = Math.max(...selected.map((value) => parseFloat(value)));
    }

    const rungs = resolvedScale
      .map((label, index) => {
        let isOn = selectedSet.has(label) ? " is-on" : "";
        if (!activeLedValues && maxSelectedVal >= 0) {
          const valNum = parseFloat(label);
          if (valNum <= maxSelectedVal) isOn = " is-on";
        }
        const visualLabel = visualScale ? visualScale[index] : label;
        return `<span class="brick-lane-rung${isOn}" data-val="${escapeHtml(label)}" aria-hidden="true"></span><span class="brick-lane-led-label">${escapeHtml(visualLabel)}</span>`;
      })
      .join("");

    return `<div class="brick-lane-led-housing" style="--brick-lane-led:${escapeHtml(ledColor)}"><div class="brick-lane-led-ladder">${rungs}<span class="brick-lane-gr-tag">GR</span><span></span></div></div>`;
  }
```

- [ ] **Step 6: Replace `renderParameterCard`**

Replace `renderParameterCard` with:

```js
  function renderParameterCard(parameter, options = {}) {
    const selected = options.selectedOverride || parameter.selection || parameter.selected;
    let resolved;

    try {
      resolved = resolver
        ? resolver.resolveParameterSelection(parameter, selected)
        : {
            label: Array.isArray(selected) ? selected.join(", ") : "",
            meaning: parameter.description || "",
            activeLedValues: Array.isArray(selected) ? selected : [],
            displayScale: parameter.displayScale || parameter.scale,
            behavior: parameter.behavior || "legacy-rungs",
          };
    } catch (_error) {
      resolved = {
        label: "Setting unavailable",
        meaning: "This setting could not be resolved from the Brick Lane data map.",
        activeLedValues: [],
        displayScale: parameter.displayScale || parameter.scale,
        behavior: parameter.behavior || "unresolved",
      };
    }

    const ledColor = data.BRICK_LANE_COLORS[parameter.color] || parameter.color;
    const monitoredClass = options.isMonitored ? " is-monitored" : "";
    const guide = getParameterGuide(parameter.id);
    const plainLabel = guide
      ? `<p class="brick-lane-plain-label">${escapeHtml(guide.userLabel)}</p>`
      : "";
    const plainMeaning = resolved.meaning
      ? `<p class="brick-lane-plain-meaning">${escapeHtml(resolved.meaning)}</p>`
      : guide
        ? `<p class="brick-lane-plain-meaning">${escapeHtml(guide.plainMeaning)}</p>`
        : "";
    const resolvedLabel = resolved.label
      ? `<p class="brick-lane-resolved-setting">${escapeHtml(resolved.label)}</p>`
      : "";

    return `<article class="brick-lane-parameter-card${monitoredClass}" data-parameter-id="${escapeHtml(parameter.id)}" style="--brick-lane-led:${escapeHtml(ledColor)}">
      <h3>${escapeHtml(parameter.label)}</h3>
      ${plainLabel}
      ${resolvedLabel}
      <p>${escapeHtml(parameter.side)}. ${escapeHtml(parameter.description || "")}</p>
      ${plainMeaning}
      ${renderExactLedLadder({
        ...parameter,
        displayScale: resolved.displayScale,
        activeLedValues: resolved.activeLedValues,
        exactSelected: Boolean(options.selectedOverride),
      })}
    </article>`;
  }
```

- [ ] **Step 7: Load resolver on the page**

In `studio-tools.html`, add resolver script between state machine and lab script:

```html
    <script src="brick-lane-data.js"></script>
    <script src="lib/lab/state-machine.js"></script>
    <script src="lib/lab/brick-lane-resolver.js"></script>
    <script src="brick-lane-lab.js"></script>
```

- [ ] **Step 8: Add minimal CSS for resolved labels**

In `style.css`, add near `.brick-lane-plain-label` styles:

```css
.brick-lane-resolved-setting {
  margin: 0.2rem 0 0.45rem;
  color: var(--brick-lane-led, #5ee7ff);
  font-weight: 700;
  letter-spacing: 0;
}
```

- [ ] **Step 9: Run focused render tests**

Run:

```bash
node --test test/brick-lane-lab-render.test.js
```

Expected: PASS, including Detector exact pattern and no local `RUNG_LABELS`.

- [ ] **Step 10: Commit renderer migration**

Run:

```bash
git add brick-lane-lab.js studio-tools.html style.css test/brick-lane-lab-render.test.js
git commit -m "feat: render Brick Lane Enigma settings from resolver"
```

Expected: commit includes renderer, page script load, styling, and render tests.

## Task 5: Migrate State Machine Selection Semantics

**Files:**
- Modify: `lib/lab/state-machine.js`
- Modify: `test/lab-state-machine.test.js`
- Modify: `brick-lane-lab.js`

- [ ] **Step 1: Write failing state-machine tests**

Replace the test named `"state machine toggles parameter rung selections immutably"` in `test/lab-state-machine.test.js` with:

```js
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
```

- [ ] **Step 2: Run failing state tests**

Run:

```bash
node --test test/lab-state-machine.test.js
```

Expected: FAIL because `SET_PARAMETER_SELECTION` is not implemented.

- [ ] **Step 3: Add `SET_PARAMETER_SELECTION` reducer case**

In `lib/lab/state-machine.js`, replace the `TOGGLE_PARAMETER_RUNG` case with this pair:

```js
      case "SET_PARAMETER_SELECTION": {
        const { parameterId, selection } = action.payload;
        if (!parameterId || !selection || typeof selection !== "object") return state;

        return {
          ...state,
          parameterSelections: {
            ...(state.parameterSelections || {}),
            [parameterId]: { ...selection },
          },
        };
      }

      case "TOGGLE_PARAMETER_RUNG": {
        const { parameterId, value } = action.payload;
        if (!parameterId || value === undefined) return state;

        const currentValues = state.parameterSelections?.[parameterId]?.legacyValues || [];
        const normalizedValue = String(value);
        const nextValues = currentValues.includes(normalizedValue)
          ? currentValues.filter((item) => item !== normalizedValue)
          : [...currentValues, normalizedValue];

        return {
          ...state,
          parameterSelections: {
            ...(state.parameterSelections || {}),
            [parameterId]: { legacyValues: nextValues },
          },
        };
      }
```

- [ ] **Step 4: Update card click behavior for pattern settings**

In `brick-lane-lab.js`, update the rung click handler so it does not fabricate a pattern setting from a single LED click. Replace the body after `const card = ...` with:

```js
      const parameterId = card?.dataset.parameterId;
      const preset = data.getGeneratedPreset(state);
      const parameter = preset.parameters[parameterId];

      if (parameter?.behavior === "pattern-settings") {
        return;
      }

      state = stateMachine.labStateReducer(state, {
        type: "TOGGLE_PARAMETER_RUNG",
        payload: { parameterId, value: rung.dataset.val }
      });
      render();
      playShortClick(400, 0.05);
```

- [ ] **Step 5: Run state and render tests**

Run:

```bash
node --test test/lab-state-machine.test.js test/brick-lane-lab-render.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit state semantics**

Run:

```bash
git add lib/lab/state-machine.js test/lab-state-machine.test.js brick-lane-lab.js
git commit -m "feat: store Brick Lane parameter selections by setting"
```

Expected: commit includes state semantics and UI click guard.

## Task 6: Migrate Copy And Print Output Through Resolver

**Files:**
- Modify: `brick-lane-lab.js`
- Modify: `test/brick-lane-lab-render.test.js`

- [ ] **Step 1: Write failing copy/print tests**

Append to `test/brick-lane-lab-render.test.js`:

```js
test("copy text uses resolved detector setting label instead of raw rungs", () => {
  const preset = getGeneratedPreset();
  const text = createCopyText(preset);

  assert.match(text, /Detector Mode Selection \/ Detector blend .*Peak \+ RMS \+ Slow RMS/);
  assert.doesNotMatch(text, /Detector Mode Selection.*0\.5, 1\.5, 3/);
});

test("print sheet uses resolved detector setting label", () => {
  const preset = getGeneratedPreset();
  const html = renderPrintSheet(preset);

  assert.match(html, /Peak \+ RMS \+ Slow RMS/);
  assert.doesNotMatch(html, /Triple RMS Hyb|Dual RMS Hybrid/);
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
node --test test/brick-lane-lab-render.test.js
```

Expected: FAIL because `createCopyText` still joins raw selected values.

- [ ] **Step 3: Add helper for resolved parameter text**

In `brick-lane-lab.js`, add above `createCopyText`:

```js
  function getResolvedParameter(parameter) {
    try {
      return resolver
        ? resolver.resolveParameterSelection(
            parameter,
            parameter.selection || parameter.selected
          )
        : null;
    } catch (_error) {
      return null;
    }
  }
```

- [ ] **Step 4: Update `createCopyText` parameter loop**

Replace the loop body in `createCopyText`:

```js
      lines.push(
        `${label} (${parameter.side}, ${parameter.color}): ${parameter.selected.join(", ")}`
      );
```

with:

```js
      const resolved = getResolvedParameter(parameter);
      const settingLabel = resolved
        ? resolved.label
        : Array.isArray(parameter.selected)
          ? parameter.selected.join(", ")
          : "Setting unavailable";
      const ledValues = resolved?.activeLedValues?.length
        ? ` [LED: ${resolved.activeLedValues.join(", ")}]`
        : "";
      lines.push(
        `${label} (${parameter.side}, ${parameter.color}): ${settingLabel}${ledValues}`
      );
```

- [ ] **Step 5: Run copy/print tests**

Run:

```bash
node --test test/brick-lane-lab-render.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit copy/print migration**

Run:

```bash
git add brick-lane-lab.js test/brick-lane-lab-render.test.js
git commit -m "feat: resolve Brick Lane copy and print settings"
```

Expected: commit includes copy/print resolver usage.

## Task 7: Finish Preset Migration And Remove Legacy Arrays

**Files:**
- Modify: `brick-lane-data.js`
- Modify: `test/brick-lane-data.test.js`
- Modify: `test/brick-lane-resolver.test.js`

- [ ] **Step 1: Add test forbidding legacy selected arrays in presets**

Append to `test/brick-lane-data.test.js`:

```js
test("archetype Enigma selections use canonical object selections", () => {
  const { ARCHETYPES, PARAMETER_ORDER } = require("../brick-lane-data");

  for (const archetype of ARCHETYPES) {
    for (const parameterId of PARAMETER_ORDER) {
      const selection = archetype.selected[parameterId];
      assert.equal(
        Array.isArray(selection),
        false,
        `${archetype.id}.${parameterId} still uses a legacy raw rung array`
      );
      assert.equal(typeof selection, "object", `${archetype.id}.${parameterId} selection must be an object`);
    }
  }
});
```

- [ ] **Step 2: Run failing data tests**

Run:

```bash
node --test test/brick-lane-data.test.js
```

Expected: FAIL for remaining raw arrays.

- [ ] **Step 3: Convert remaining archetype selections**

In every `ARCHETYPES[*].selected`, convert arrays to object selections:

```js
// stepped-scale
ratio: { value: "3" },
knee: { value: "1.5" },
attackWeighting: { value: "2" },
releaseWeighting: { value: "3" },
hold: { value: "1.0" },
lookahead: { value: "1.5" },
ledBrightness: { value: "4" },

// pattern-settings
detector: { settingId: "peak-rms-slow" },
```

For parameters classified as `pattern-settings` in `docs/brick-lane-manual-audit.md`, use setting IDs defined in that parameter's `settings` array. For parameters classified as `stepped-scale`, use `{ value: "<displayScale value>" }`.

- [ ] **Step 4: Simplify `cloneParameterWithSelection`**

After all presets are migrated, replace `cloneParameterWithSelection` with:

```js
  function cloneParameterWithSelection(parameterDefinition, selected) {
    return {
      ...parameterDefinition,
      selection:
        selected && typeof selected === "object" && !Array.isArray(selected)
          ? { ...selected }
          : {},
      selected: [],
    };
  }
```

- [ ] **Step 5: Run full Brick Lane data/resolver tests**

Run:

```bash
node --test test/brick-lane-data.test.js test/brick-lane-resolver.test.js
```

Expected: PASS, and no archetype uses legacy raw arrays.

- [ ] **Step 6: Commit preset migration**

Run:

```bash
git add brick-lane-data.js test/brick-lane-data.test.js test/brick-lane-resolver.test.js
git commit -m "feat: migrate Brick Lane presets to canonical selections"
```

Expected: commit includes complete selection migration.

## Task 8: Browser And Visual Verification

**Files:**
- Modify: `test/brick-lane-visual-regression.test.js`
- No production code expected unless the visual test exposes a real issue.

- [ ] **Step 1: Add visual regression assertion for Detector pattern behavior**

In `test/brick-lane-visual-regression.test.js`, after the existing meter scale assertions, add:

```js
    const detectorText = await page.locator('[data-parameter-id="detector"]').innerText({ timeoutMs: 5000 });
    assert.match(detectorText, /Peak \+ RMS \+ Slow RMS/);
    assert.doesNotMatch(detectorText, /Triple RMS Hyb|Dual RMS Hybrid|Peak\+RMS Var/);
```

- [ ] **Step 2: Run visual regression test**

Run:

```bash
npm run test:brick-lane-visual
```

Expected: PASS. The test should open `studio-tools.html#brick-lane-sonic-lab` and confirm the faceplate remains accurate while the recall panel shows resolved Detector behavior.

- [ ] **Step 3: Run focused Brick Lane tests**

Run:

```bash
node --test test/brick-lane-data.test.js test/brick-lane-resolver.test.js test/brick-lane-lab-render.test.js test/lab-state-machine.test.js
```

Expected: PASS.

- [ ] **Step 4: Run JS checks**

Run:

```bash
npm run check:js
```

Expected: PASS.

- [ ] **Step 5: Commit visual verification**

Run:

```bash
git add test/brick-lane-visual-regression.test.js
git commit -m "test: verify Brick Lane detector display behavior"
```

Expected: commit includes the visual regression update.

## Task 9: Final Documentation And Preflight

**Files:**
- Modify: `docs/brick-lane-manual-audit.md`
- Modify: `docs/brick-lane-visual-qa.md`
- Modify: `docs/execution-log.md`

- [ ] **Step 1: Update manual audit final status**

At the top of `docs/brick-lane-manual-audit.md`, add:

```markdown
## Implementation Status

- Canonical Enigma data now declares behavior type, evidence, and setting/scalar rules.
- Pattern-based parameters render valid settings as LED patterns.
- Stepped-scale parameters render direct scalar values without unnecessary translation.
- Presets now reference canonical setting IDs or scalar values.
- User-facing UI remains free of source badges and confidence labels.
```

- [ ] **Step 2: Update visual QA notes**

Append to `docs/brick-lane-visual-qa.md`:

```markdown
## Manual Accuracy Follow-Up

- Detector Mode Selection now renders valid detector settings with LED patterns rather than twelve invented rung names.
- Recall panel text is driven by canonical Brick Lane data and resolver output.
- Front-panel hardware remains SIG/GR-only and does not show Enigma parameter monitors as physical meters.
```

- [ ] **Step 3: Update execution log**

Append to `docs/execution-log.md`:

```markdown
## 2026-05-25 Brick Lane manual accuracy

- Added internal manual accuracy audit.
- Moved Enigma setting meaning to canonical data and resolver helpers.
- Migrated Detector behavior away from one-label-per-rung modeling.
- Updated render, copy, print, state, and visual tests around resolved settings.
```

- [ ] **Step 4: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Run deployment preflight checks except deploy**

Run:

```bash
npm run check:js
git diff --check
```

Expected: PASS.

- [ ] **Step 6: Final status check**

Run:

```bash
git status --short
```

Expected: only intentional docs/test/source files are modified or untracked.

- [ ] **Step 7: Commit final docs**

Run:

```bash
git add docs/brick-lane-manual-audit.md docs/brick-lane-visual-qa.md docs/execution-log.md
git commit -m "docs: record Brick Lane manual accuracy verification"
```

Expected: commit includes final docs only.
