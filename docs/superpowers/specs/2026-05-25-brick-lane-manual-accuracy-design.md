# Brick Lane Manual Accuracy Design

Date: 2026-05-25
Project: Dirt Cat Records Studio Tools / Brick Lane Sonic Lab
Status: Approved design direction before implementation planning

## Skill Routing

- Requested process skill: `superpowers:brainstorming`
- Purpose: design a durable fix for Brick Lane 500 Enigma LED bar accuracy against the Cranborne Brick Lane manual and supporting video references.
- Next-step skill after user review: `superpowers:writing-plans`

This document is a design/spec artifact, not an implementation plan. It defines the accuracy model, architecture, audit workflow, UI behavior, tests, and rollout boundaries for fixing the Brick Lane tool.

## Problem

The current Brick Lane Sonic Lab can look internally consistent while still being wrong to the manual. The main issue is not only label spelling. The current implementation treats the 12 printed LED positions as twelve named settings for most Enigma parameters. That is inaccurate for parameters such as Detector Mode Selection, where the manual describes a smaller set of meaningful detector behaviors and the LED display communicates those behaviors through patterns across the 12-position display.

This makes the tool unreliable for actual recall and dialing decisions. A user needs the tool to match the intent of the Cranborne Brick Lane manual as closely as possible, including cases where the manual provides enough information to logically derive display behavior rather than listing every outcome in a complete table.

## Approved Direction

Use an evidence-gated data rewrite.

The fix should rebuild the canonical Brick Lane data around manual-backed settings, LED display patterns, and internal source proof. The user interface should remain clean and practical. Source notes, derivation rationale, and verification status belong in internal data, docs, and tests, not in visible UI badges or citations.

Rejected approaches:

- **Patch current labels:** too shallow; it leaves the false one-label-per-rung model in place.
- **Full hardware simulator:** too broad for this fix; it could delay the accuracy work by modeling button navigation, memory behavior, and hardware interaction details the site user does not need to dial in a sound.

## Accuracy Model

The canonical data model must support two Enigma parameter behaviors:

1. **`stepped-scale`**
   - Use when each visible LED position directly represents an obvious scalar value or manual-stated step.
   - The renderer may show a simple selected position or contiguous bar only when that behavior matches the manual.
   - No extra user-facing translation is needed when the manual meaning is already obvious.

2. **`pattern-settings`**
   - Use when the user-facing setting is a named behavior and the LED display is a pattern.
   - Detector Mode Selection is the reference case: it has fewer real settings than 12, and each valid detector setting lights a specific pattern on the 12-position display.
   - The data model should store valid setting IDs, display names, practical meaning, and exact LED patterns.

Every parameter entry should carry internal evidence metadata:

- Manual section or page reference.
- Manual-stated facts.
- Manual-derived conclusion where the manual requires logical deduction.
- Source type: `manual-stated`, `manual-derived`, or `video-confirmed`.
- Derivation rationale where needed.
- Verification status.

The live UI should show only clean setting names, exact hardware labels, exact LED states, and concise practical meanings that help dial a sound.

## Architecture

All Enigma truth should live in `brick-lane-data.js`. Rendering code should render the canonical data model and should not define manual meanings.

The hard-coded `RUNG_LABELS` table in `brick-lane-lab.js` should be removed or replaced by data-driven rendering from `brick-lane-data.js`.

Conceptual shape:

```js
{
  id: "detector",
  label: "Detector Mode Selection",
  side: "Enigma Left",
  color: "cyan",
  displayScale: ["0.5", "1.0", "1.5", "2", "3", "4", "5", "6", "8", "10", "12", "15"],
  behavior: "pattern-settings",
  settings: [
    {
      id: "peak",
      label: "Peak",
      ledPattern: ["0.5"],
      meaning: "Fast peak-catching detector behavior.",
      evidence: [
        {
          source: "manual",
          type: "manual-stated",
          reference: "Detector Mode Selection section",
          note: "Manual identifies Peak as a detector behavior."
        }
      ]
    },
    {
      id: "peak-rms-slow",
      label: "Peak + RMS + Slow RMS",
      ledPattern: ["0.5", "1.5", "3"],
      meaning: "Combined detector response.",
      evidence: [
        {
          source: "manual",
          type: "manual-derived",
          reference: "Detector Mode Selection section",
          note: "Derived from manual detector components and LED pattern behavior."
        }
      ]
    }
  ]
}
```

Preset data should stop storing ambiguous raw rung arrays where possible:

- For `pattern-settings`, presets should store selected setting IDs.
- For `stepped-scale`, presets can store scalar step values.
- Resolver helpers should convert selected setting IDs or scalar values into rendered LED states, copy text, and print-sheet output.

The same resolver output should drive:

- Live parameter cards.
- Copy recall text.
- Printable cheat sheet.
- Tests.

## Data Audit Workflow

Implementation should begin with an internal audit matrix, not UI tweaks.

The audit matrix should cover every Brick Lane control and Enigma parameter:

- Hardware label.
- Side.
- LED color.
- Display scale.
- Behavior type: `stepped-scale`, `pattern-settings`, or `front-panel-control`.
- Manual-stated facts.
- Manual-derived conclusions.
- Video-confirmed notes when supplied videos clarify physical LED behavior or navigation.
- Final user-facing setting names.
- Final LED pattern per setting or scalar display rule.
- Preset recommendation rule explaining why the selected setting is valid for vocal tracking, mix bus, or another supported use case.

The audit should explicitly document where the current app was wrong. Example:

> Detector currently invents twelve one-to-one rung names. Corrected model has fewer detector settings with multi-LED display patterns.

Source priority:

1. Cranborne Brick Lane 500 manual.
2. User-provided Cranborne/Brick Lane video references:
   - `https://www.youtube.com/watch?v=0dbLWwkQRVg&t=1s`
   - `https://www.youtube.com/watch?v=jGBbKE5YDPU`
3. Existing local docs and implementation notes, only as historical context.

Videos are secondary evidence. They can confirm physical LED behavior, menu navigation, or examples where the manual is terse. Tests should not depend on YouTube availability; video-confirmed facts should be captured as local audit notes and fixtures.

## UI And Rendering Behavior

The user-facing tool should remain uncluttered. Do not add visible citations, source badges, confidence labels, or derivation notes.

Rendering requirements:

- Parameter cards render from resolved canonical settings, not hard-coded rung descriptions.
- Pattern-based parameters show the selected setting name and exact LED pattern.
- Simple stepped parameters show the hardware label, selected value, and LED state without unnecessary translation.
- Copy recall and cheat-sheet output use the same resolved data as the UI.
- Front-panel hardware remains physical-state only: knobs, selected mode, SCF, STRESS, SIG/GR meters, optosync, IN, and link/mono/stereo state.
- The monitor dropdown can remain, but it should select a parameter display and must not imply Enigma parameter displays are physical front-panel meters.

The UI must tolerate manual nuance. If a parameter has three valid settings, render three choices and a 12-position LED display. Do not force twelve setting rows simply because the display scale has twelve positions.

## Testing And Drift Prevention

Current Brick Lane tests mostly validate internal consistency. The fix should add source-aligned tests that lock the implementation to the audit matrix.

Test layers:

- **Data contract tests:** every parameter has side, color, hardware label, behavior type, setting or scalar rule, and evidence metadata.
- **Manual-derived fixture tests:** key manual examples and deductions are encoded as local fixtures, especially Detector, Sidechain High Frequency Emphasis/De-emphasis, Knee, Attack Weighting, Release Weighting, Hold, Lookahead, Stress Crossover, and LED Brightness.
- **Rendering tests:** the LED renderer receives a setting ID or scalar value and produces the exact expected LED positions.
- **Preset tests:** generated presets reference valid setting IDs only; no preset can select an undefined rung pattern.
- **Regression tests:** `brick-lane-lab.js` no longer owns Enigma meanings. It can render, but `brick-lane-data.js` owns meaning.

Tests must fail closed during development:

- Missing behavior type fails.
- Missing evidence entry fails.
- Unknown selected setting ID fails.
- Invalid LED position fails.
- Preset selection that does not resolve to a canonical setting or scalar rule fails.

In the browser, if a missing setting reaches runtime, render a neutral "setting unavailable" fallback rather than inventing a LED state.

## Rollout

This should be one focused accuracy project, not a UI redesign.

Implementation order:

1. Build the audit matrix.
2. Refactor data shape and resolver helpers.
3. Migrate render, copy, and print output to use resolved settings.
4. Migrate presets from raw rung arrays to setting IDs or scalar values.
5. Remove hard-coded rung labels from `brick-lane-lab.js`.
6. Run focused Brick Lane tests, full JS checks, and a browser visual pass on `studio-tools.html`.
7. Update internal docs so future changes start from the audit matrix rather than UI guesses.

Styling should only change where needed to support accurate LED behavior.

## Acceptance Criteria

- The tool represents Enigma parameters according to manual intent, not a generic one-label-per-rung assumption.
- Detector Mode Selection is modeled as valid detector settings with LED patterns, not twelve invented detector choices.
- Parameters with obvious stepped meanings remain simple and are not over-translated.
- Source evidence and derivation notes are internal only.
- Live UI, copy recall, and print sheet resolve from the same canonical data.
- Generated presets reference canonical setting IDs or scalar values only.
- Tests fail when a parameter, setting, evidence entry, or preset selection drifts from the audit matrix.
- The visible user experience remains focused on dialing sounds and recalling hardware settings.

