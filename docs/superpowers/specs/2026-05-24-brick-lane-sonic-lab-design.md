# Brick Lane Sonic Lab Design

Date: 2026-05-24
Project: Dirt Cat Records interactive Brick Lane 500 preset generator
Status: Approved starting direction before implementation planning

## Skill Routing

- Requested process skill: `brainstorming`
- Purpose: define the product shape, visual direction, recall accuracy requirements, and export behavior before implementation.
- Next-step skill after review: `writing-plans`

This document is a design/spec artifact, not an implementation plan. It captures the approved starting point for the interface and data model so implementation can proceed without losing the hardware-accuracy requirements.

## Product Summary

Build an interactive **Brick Lane Sonic Lab** for the Dirt Cat Records website. The tool helps users generate Brick Lane 500 compressor starting points from practical sonic goals and source context.

The live web tool should feel like a compact, premium VST/plugin interface in the Dirt Cat Records visual system: dark glassmorphism, subtle neon accents, tactile controls, and exact Brick Lane-style recall visuals. It should not feel like a generic calculator, preset list, or flat dashboard.

The printable/exported output is separate from the live interface. It should read like a hardware cheat sheet or worksheet that users can save, print, or keep with a session.

## Approved Starting Direction

The approved starting point is the V7 direction from the brainstorming mockups:

- Compact glass/plugin interface.
- Use-case and archetype browser.
- Drawn hardware-inspired faceplate rather than a rough photo overlay.
- Exact Brick Lane-style LED ladder components.
- Generated preset panel with full parameter names and exact LED ladders.
- Separate printable cheat sheet export.
- Data-driven rendering from one canonical Brick Lane parameter map.

Earlier photo-overlay directions were rejected because rough image mapping made the interface feel hacked together. A future production photo can still be useful as visual reference, but the interactive recall surface should be built as UI so it remains exact, scalable, and responsive.

## Primary Use Cases

The first build should support two tabs/use cases:

1. **Tracking Vocal**
   - Designed for safe or characterful vocal tracking decisions.
   - Inputs include vocal style, source brightness, dynamics, desired sound, risk tolerance, and target gain reduction.
   - Initial archetypes include Safe Vocal Catcher, Smooth Expensive Vocal, Modern Controlled Vocal, and Character Vocal Print.

2. **Mix Bus**
   - Designed for bus compression decisions while mixing.
   - Inputs include genre/energy, low-end dominance, transient importance, desired bus effect, stereo safety, parallel use, and target gain reduction.
   - Initial archetypes include Invisible Mix Glue, Thick Analog Bus, Punch-Preserving Bus, Modern Finished Bus, and Aggressive Energy Bus.

The interface should be structured so additional use cases can be added later: Mastering, Drum Bus, Parallel Compression, Stereo Imaging Enhancement, Saturation/Color, Loudness/Density, Transparent Control, Aggressive Character, Acoustic Instruments, Bass, EDM/Modern Loudness, Vintage Analog Feel, Cinematic/Documentary Narration, and Tracking While Recording.

## Interface Layout

The live interface should use a three-zone layout on desktop:

1. **Left browser**
   - Use-case list.
   - Archetype/preset family selector.
   - Source/context inputs.

2. **Center hardware surface**
   - Drawn Brick Lane-inspired faceplate.
   - Front-panel knobs and switches.
   - Exact Enigma left/right LED ladder readouts.
   - Compromise controls nearby or beneath the faceplate.

3. **Right generated preset panel**
   - Generated preset name.
   - Mode and purpose.
   - Important Enigma parameters using exact ladder visuals.
   - Front-panel starting points.
   - Short “why” and adjustment guidance.
   - Export actions.

Mobile can stack these sections, but recall-critical visuals must remain legible and exact.

## Visual Direction

The tool should match `https://www.dirtcatrecords.com` styling:

- Dark glassmorphism panels.
- Translucent surfaces with restrained glow.
- Dirt Cat neon color energy, but not arcade/cheesy.
- Rounded corners consistent with the site, generally 8-14px.
- Text hierarchy that feels like a serious studio tool.
- Color reserved mainly for Brick Lane/Enigma state and Dirt Cat accents.

The interface should feel like a software compressor/plugin built for a studio website, not like a brutalist dashboard or a decorative toy.

## Hardware Accuracy Requirements

Hardware recall accuracy is critical. The tool must not approximate the Brick Lane LED displays with generic status widgets.

The generated preset visuals must read exactly like the actual unit/manual:

- Exact number of LED rungs.
- Exact numbering and labels.
- Exact vertical order.
- Exact side/color relationship.
- Exact dark LED housing style.
- Exact selected-rung patterns for each setting.
- No recall-critical abbreviations such as `HF`, `DET`, or `REL` when full hardware parameter names are required.

Different Enigma parameters can have different selected-rung patterns and meanings, but their visuals must be rendered from canonical data rather than hand-built approximations.

## Canonical Parameter Map

Implementation should create one canonical Brick Lane parameter map. This map drives the live tool, generated preset panel, printable cheat sheet, and copied recall text.

Each Enigma parameter entry should include:

- Stable id.
- Full display name.
- Enigma side: Left or Right.
- Hardware color.
- Exact value/rung labels.
- Selected rungs for a generated preset.
- Description of what the setting means.
- Optional warning or adjustment note.

Example shape:

```js
{
  id: "sidechain-high-frequency-emphasis",
  label: "Sidechain High Frequency Emphasis/De-emphasis",
  side: "Enigma Left",
  color: "magenta",
  scale: ["0.5", "1.0", "1.5", "2", "3", "4", "5", "6", "8", "10", "12", "15"],
  selected: ["2", "3", "4", "5", "6", "8", "10", "12", "15"],
  description: "High frequencies will be compressed less."
}
```

The same principle applies to mode, SCF, stereo/mono sidechain linking, detector, ratio, knee, attack weighting, release weighting, lookahead, hold, crest factor shaping, diode behavior, stress behavior, and LED brightness where applicable.

## Generator Model

The generator should start from named archetypes, then apply weighted modifiers from user input and compromise knobs.

Archetypes define the base intent:

- Purpose.
- Mode.
- Detector behavior.
- Ratio range.
- Knee behavior.
- Attack/release behavior.
- Lookahead.
- Sidechain filtering.
- Stress amount/type.
- Stereo behavior.
- Target gain reduction.
- Explanation.

Compromise controls modify the archetype:

- Punch ↔ Smoothness.
- Clean ↔ Colored.
- Control ↔ Openness.
- Safe Tracking ↔ Exciting Tracking.
- Glue ↔ Loudness.
- Stable Stereo ↔ Wide/Independent Movement.

The algorithm should favor explainable rules over opaque math in the first version. Users should understand why a setting was chosen.

## Printable Export

The printable/exported view is separate from the live VST-style interface.

It should be a white worksheet/cheat-sheet style output that users can save or print. It should include:

- Preset name.
- Use case and archetype.
- Front-panel starting points.
- Target gain reduction.
- All relevant Enigma parameter ladders.
- Exact colors and selected rungs.
- Compact “why” and adjustment notes.
- Save PNG, Print/Save PDF, and Copy Settings actions.

The printable sheet should prioritize recall accuracy and legibility over the live tool’s glassmorphism style.

## Non-Goals For First Build

- Do not build every future use case at once.
- Do not create a generic compressor education encyclopedia.
- Do not depend on a rough photo overlay for live hardware recall.
- Do not abbreviate recall-critical parameter names in generated settings.
- Do not hand-build separate LED visuals per preset.
- Do not require user accounts for the first usable version.

## Open Verification Needs

Before implementation or during early implementation, verify the Brick Lane manual/source material for:

- Every Enigma parameter name.
- Exact side assignment.
- Exact color assignment.
- Exact LED/rung labels.
- Exact mode and SCF labels.
- Exact stereo linking options.
- Any cases where a parameter does not use the common 12-rung scale.

The user-provided manual screenshots and the Cranborne Brick Lane 500 user guide should be treated as source material to verify against. If any parameter is uncertain, mark it as unverified in the data map rather than guessing.

## Acceptance Criteria

- The live tool visually matches the Dirt Cat Records glass/neon styling.
- The live tool feels compact and plugin-like.
- The generated preset panel uses exact Brick Lane-style LED ladder visuals.
- The LED ladder component supports exact rung count, labels, selected rungs, color, and side.
- The printable cheat sheet exports or opens a print-ready view.
- Tracking Vocal and Mix Bus are the first supported use cases.
- Preset output includes both settings and concise explanations.
- The source data for parameter visuals is centralized and reusable.
