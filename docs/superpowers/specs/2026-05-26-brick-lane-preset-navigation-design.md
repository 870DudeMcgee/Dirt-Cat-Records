# Brick Lane Preset Navigation Design

Project: Dirt Cat Records Studio Tools / Brick Lane Sonic Lab
Date: 2026-05-26

## Goal

Redesign the Brick Lane Sonic Lab preset browser so presets are organized by workflow stage, source, and tags instead of separate archetype and problem-preset lists.

The current GUI exposes both archetypes and problem presets. That creates redundant choices because both are preset starting points. The new model should present one clear preset list, keep vocal tracking presets under Tracking, move de-essing and other mix problem-solving presets under Mixing, and make room for bass, drums, guitar cab, and bus/master presets without cluttering the interface.

## Decisions

- Use three top-level workflow tabs: Tracking, Mixing, and Bus / Master.
- Use source-first grouping inside each workflow area.
- Treat de-essing as a Mixing preset, not a Tracking preset.
- Replace the user-facing archetype/problem-preset split with one canonical preset browser.
- Keep the hardware faceplate, compression field, Enigma recall cards, copy, and print flows as the preset detail/refinement area after a preset is selected.

## Information Architecture

### Tracking

Tracking is for recording through the Brick Lane. Presets should be lower-risk and capture-safe, with optional color when the user wants to commit a sound on the way in.

Initial source groups:

- Vocals
- Bass
- Guitar
- Drums
- Keys / Synths

Initial presets:

- Vocals: Safe Vocal Catcher, Smooth Expensive Vocal, Modern Controlled Vocal, Character Vocal Print
- Bass: Bass DI Leveler, Bass Color Print
- Guitar: Guitar DI Safety, Guitar Cab Print
- Drums: Kick/Snare Safety, Room Mic Control

### Mixing

Mixing is for inserted channel or subgroup processing after recording. This is where source-specific problem-solving presets live.

Initial source groups:

- Vocals
- Bass
- Drums
- Guitar
- Keys / Synths
- Full Mix Repair

Initial presets:

- Vocals: Vocal De-Esser, Vocal Leveler, Harsh Vocal Smoother, Dull Vocal Forward
- Bass: Bass Leveler, Low-End Bloom Control, Pick Attack Control
- Drums: Drum Crush, Kick Weight Control, Snare Crack, Room Pump
- Guitar: Guitar Cab Tamer, Harsh Guitar Smoother, Rhythm Guitar Glue

### Bus / Master

Bus / Master is for mix bus, stem bus, parallel bus, and mastering/finishing moves.

Initial source groups:

- Mix Bus
- Drum Bus
- Vocal Bus
- Parallel Bus
- Mastering

Initial presets:

- Mix Bus: Invisible Mix Glue, Thick Analog Bus, Punch-Preserving Bus, Modern Finished Bus, Aggressive Energy Bus
- Mix Bus: Low-End Pumping Mix, Flat Lifeless Mix, Harsh Bright Mix
- Drum Bus: Drum Bus Glue, Parallel Drum Smash
- Vocal Bus: Vocal Bus Polish
- Mastering: Gentle Master Control, Loudness Prep

## GUI Behavior

The left preset browser should use a compact hierarchy:

1. Workflow tabs: Tracking, Mixing, Bus / Master.
2. Source sections for the selected workflow area.
3. Preset rows inside each source section.

Each preset row should show:

- Preset name.
- One short purpose line.
- Small tags such as vocal, bass, de-ess, bright, safe, color, parallel, glue, or low-end.
- Active state when selected.

The selected preset should drive the same central and right-side detail UI that exists today:

- Hardware faceplate.
- Compression field and trade-off controls.
- Generated preset summary.
- Enigma recall cards.
- Copy and print output.

The generated preset summary should identify the chosen workflow and source, for example:

```text
Mixing / Vocals
Vocal De-Esser
```

If the user changes the compression field, front-panel controls, or individual Enigma recall values, the generated preset summary and copied recall text should append "Modified" to the selected preset name. The browser should not create a second modified preset category.

## Data Model

Replace `ARCHETYPES` and `PROBLEM_PRESETS` as user-facing concepts with one canonical `PRESETS` collection.

Suggested shape:

```js
{
  id: "vocal-de-esser",
  useAreaId: "mixing",
  sourceId: "vocals",
  label: "Vocal De-Esser",
  intent: "problem-solving",
  tags: ["vocal", "de-ess", "bright", "control"],
  summary: "Controls sharp sibilance without darkening the whole vocal.",
  mode: "Tame",
  targetGainReduction: "2-5 dB",
  selected: {},
  controls: {},
  context: {},
  frontPanelValues: {},
  frontPanel: {},
  why: []
}
```

Add `USE_AREAS`:

- tracking
- mixing
- bus-master

Add source definitions scoped by use area. A source can appear under more than one area, but its placement should be explicit so the browser can render stable sections without inference.

State should move from:

```text
useCaseId + archetypeId + problemPresetId
```

to:

```text
useAreaId + presetId
```

The Enigma parameter resolver and exact LED recall model should remain unchanged. This redesign changes how presets are selected and organized, not how Brick Lane settings are interpreted.

## Migration

Existing archetypes become normal presets:

- Safe Vocal Catcher -> Tracking / Vocals
- Smooth Expensive Vocal -> Tracking / Vocals
- Modern Controlled Vocal -> Tracking / Vocals
- Character Vocal Print -> Tracking / Vocals
- Invisible Mix Glue -> Bus / Master / Mix Bus
- Thick Analog Bus -> Bus / Master / Mix Bus
- Punch-Preserving Bus -> Bus / Master / Mix Bus
- Modern Finished Bus -> Bus / Master / Mix Bus
- Aggressive Energy Bus -> Bus / Master / Mix Bus

Existing problem presets become normal presets:

- Sibilant Uneven Vocal -> Mixing / Vocals, renamed Vocal De-Esser
- Dull Buried Vocal -> Mixing / Vocals
- Peaky Aggressive Vocal -> Mixing / Vocals
- Low-End Pumping Mix -> Bus / Master / Mix Bus
- Flat Lifeless Mix -> Bus / Master / Mix Bus
- Harsh Bright Mix -> Bus / Master / Mix Bus

The migration should preserve existing setting data where it is musically useful. Naming can be refined during implementation, but source placement should follow this spec.

## Component Boundaries

The implementation should keep clear boundaries:

- Data module: use areas, sources, presets, preset lookup helpers, and generated preset construction.
- State machine: selected use area, selected preset, modified controls, modified front-panel values, modified parameter selections, active recall tab, and monitor parameter.
- UI renderer: preset browser rendering, selected preset summary, hardware, compression field, and recall cards.
- Resolver: unchanged manual-backed Brick Lane parameter resolution.

Avoid adding another parallel preset concept. If a future preset needs to represent a problem, source, style, or goal, express that through `intent`, `sourceId`, and `tags` on the same preset object.

## Testing

Add or update focused tests for:

- Initial state selects Tracking / Vocals / Safe Vocal Catcher.
- Use-area switching selects the first preset in that area.
- Preset selection updates use area, source, controls, context, front-panel values, and Enigma selections.
- Migrated presets preserve their existing generated recall behavior.
- No user-facing UI render path depends on separate archetype and problem-preset lists.
- Browser rendering groups presets by source under the selected workflow area.
- Copy and print output use the selected preset label and workflow/source path.

Run existing Brick Lane data, resolver, state-machine, and visual regression tests after implementation.

## Out Of Scope

- Reworking the Brick Lane manual-backed Enigma resolver.
- Changing exact LED ladder behavior.
- Adding search.
- Adding user-saved custom presets.
- Building every possible source category beyond the initial starting set.

## Acceptance Criteria

- The Brick Lane GUI has one preset browser, not separate archetype and problem-preset lists.
- Tracking vocal presets remain under Tracking / Vocals.
- De-essing and other vocal repair presets live under Mixing / Vocals.
- Existing mix bus presets live under Bus / Master / Mix Bus.
- The layout has clear room for bass, drums, guitar cab, and other future presets.
- Existing copy, print, hardware, compression field, and recall card workflows still work from the selected preset.
