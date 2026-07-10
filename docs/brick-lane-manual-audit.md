# Brick Lane Manual Accuracy Audit

Date: 2026-05-25
Scope: Brick Lane Sonic Lab front-panel and Enigma LED behavior

## 2026-07-10 Re-audit

Baseline: official Cranborne Audio Brick Lane 500 User Guide, Enigma pages 26-37.

Corrections made in the live model:

- The printed `0.5`-`15` markings are treated as GR-ladder positions when an Enigma parameter does not use those numbers as its real unit.
- STRESS character choices now light a cumulative LED count, matching the guide's "1 LED = Velvet" through "7 LEDs = Polish Blue" description.
- Stress Crossover and Phase is limited to the four LED patterns and meanings shown in the guide. Invented angle and generic crossover names were removed.
- Sidechain HF Emphasis/De-emphasis is limited to the three documented example states: flat, high frequencies compressed less, and high frequencies compressed more. Unsupported de-ess strength names were removed.
- Detector includes the two documented RMS-pot-variable patterns in addition to the fixed single, dual, and triple detector patterns.
- Attack and Release Weighting now resolve the same LED position through the correct detector-dependent manual table: single detector, fixed RMS, fixed Slow RMS, or RMS-pot-variable.
- Hold, Lookahead, Diode Hardness, Stereo Linking, Knee, and LED Brightness are labeled as relative LED settings where the guide does not publish a complete numeric unit table.
- The UI now explains DIP switch 6, left/right two-second menu entry, short-press navigation, exit behavior, and stereo-parent restrictions before showing the fourteen-parameter map.

## Implementation Status

- Canonical Enigma data now declares behavior type, evidence, and setting/scalar rules.
- Pattern-based parameters render valid settings as LED patterns.
- Stepped-scale parameters render direct scalar values without unnecessary translation.
- Presets now reference canonical setting IDs or scalar values.
- User-facing UI remains free of source badges and confidence labels.

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
- `internal-only evidence` means source-tracking metadata used for audit and tests, not labels or copy shown in the user-facing UI.
- Supplied videos remain secondary references and only become `video-confirmed` evidence after timestamped behavior is recorded locally.
- User-facing UI must not show evidence labels.
- Pattern-based parameters store real settings and LED patterns; they do not invent one setting per printed LED mark.

## Current App Corrections

| Area                    | Current Problem                                                | Correct Model                                                                           |
| ----------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Detector Mode Selection | Invents twelve one-to-one detector rung names.                 | Store valid detector settings and render their LED patterns on the 12-position display. |
| Enigma meanings         | `brick-lane-lab.js` owns `RUNG_LABELS`.                        | `brick-lane-data.js` owns meanings; renderers consume resolved settings.                |
| Presets                 | Presets store raw rung arrays that can bypass a valid setting. | Pattern parameters store setting IDs; stepped parameters store scalar steps.            |

## Audit Matrix

| Parameter                                     | Side         | Color   | Behavior         | Manual Facts                                                                                                  | Derived Conclusion                                                                                                                                                                       | Valid Settings Or Scalar Rule                                                                                          | Evidence Type                  | Source Locator                          |
| --------------------------------------------- | ------------ | ------- | ---------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------- |
| Stress Character / Diode Clipping             | Enigma Left  | Red     | pattern-settings | Manual describes stress/diode clipping behavior by mode or clipping family.                                   | Use named saturation-character settings with explicit LED patterns from manual examples and LED ordering.                                                                                | Setting IDs, names, LED patterns.                                                                                      | manual-stated + manual-derived | Manual: Enigma Left parameter section   |
| Diode Hardness                                | Enigma Left  | Yellow  | stepped-scale    | Manual describes diode hardness as a hardness amount.                                                         | Treat as a direct stepped hardness amount for this implementation. If later source verification proves named pattern behavior, update this row and add setting IDs before Task 3 starts. | Scalar `{ value }` using the shared display scale.                                                                     | manual-stated                  | Manual: Enigma Left parameter section   |
| Stress Crossover & Phase                      | Enigma Left  | Blue    | pattern-settings | Manual describes crossover and phase behavior.                                                                | Use named phase/crossover settings with LED patterns.                                                                                                                                    | Setting IDs, names, LED patterns.                                                                                      | manual-stated + manual-derived | Manual: Enigma Left parameter section   |
| Sidechain High Frequency Emphasis/De-emphasis | Enigma Left  | Magenta | pattern-settings | Manual describes sidechain high-frequency emphasis/de-emphasis behavior.                                      | Use named HF sidechain behavior settings and their LED patterns.                                                                                                                         | Setting IDs, names, LED patterns.                                                                                      | manual-stated + manual-derived | Manual: Enigma Left parameter section   |
| Detector Mode Selection                       | Enigma Left  | Cyan    | pattern-settings | Manual describes detector components such as Peak, RMS, and Slow RMS and shows that the display is a pattern. | Valid detector selections are behavior combinations rendered as LED patterns; do not create twelve detector choices.                                                                     | `peak`, `rms`, `slow-rms`, `peak-rms`, `peak-slow-rms`, `rms-slow-rms`, `peak-rms-slow-rms` where supported by manual. | manual-stated + manual-derived | Manual: Detector Mode Selection section |
| Crest Factor Shaping                          | Enigma Left  | Green   | stepped-scale    | Manual describes crest-factor shaping across detector behavior.                                               | Treat as a direct stepped shaping amount for this implementation. If later source verification proves named pattern behavior, update this row and add setting IDs before Task 3 starts.  | Scalar `{ value }` using the shared display scale.                                                                     | manual-derived                 | Manual: Enigma Left parameter section   |
| Stereo/Mono Sidechain Linking                 | Enigma Left  | White   | stepped-scale    | Manual describes stereo/mono sidechain linking percentage or behavior.                                        | Use stepped scale for link amount when manual shows percentage-like progression.                                                                                                         | Scalar step values or named link modes.                                                                                | manual-stated                  | Manual: Enigma Left parameter section   |
| Ratio Setting Curve                           | Enigma Right | Blue    | stepped-scale    | Manual describes ratio curve behavior.                                                                        | Use scalar/named ratio curve entries based on manual wording.                                                                                                                            | Scalar step values or named curve settings.                                                                            | manual-stated                  | Manual: Enigma Right parameter section  |
| Knee Width                                    | Enigma Right | Cyan    | stepped-scale    | Manual describes knee width.                                                                                  | Use stepped scale when the manual presents width as progressive.                                                                                                                         | Scalar step values.                                                                                                    | manual-stated                  | Manual: Enigma Right parameter section  |
| Attack Weighting Shape                        | Enigma Right | Red     | stepped-scale    | Manual includes attack weighting table/examples.                                                              | Use exact manual weighting values and LED order.                                                                                                                                         | Scalar step values with manual table labels.                                                                           | manual-stated                  | Manual: Attack/Release weighting tables |
| Release Weighting Behavior                    | Enigma Right | White   | stepped-scale    | Manual includes release weighting table/examples.                                                             | Use exact manual weighting values and LED order.                                                                                                                                         | Scalar step values with manual table labels.                                                                           | manual-stated                  | Manual: Attack/Release weighting tables |
| Hold Timing                                   | Enigma Right | Green   | stepped-scale    | Manual describes hold timing.                                                                                 | Use exact hold values if listed; otherwise derive monotonic timing from examples.                                                                                                        | Scalar step values.                                                                                                    | manual-stated + manual-derived | Manual: Enigma Right parameter section  |
| Lookahead Time                                | Enigma Right | Yellow  | stepped-scale    | Manual describes lookahead time.                                                                              | Use exact lookahead values if listed; otherwise derive monotonic timing from examples.                                                                                                   | Scalar step values.                                                                                                    | manual-stated + manual-derived | Manual: Enigma Right parameter section  |
| LED Brightness Level                          | Enigma Right | Magenta | stepped-scale    | Manual describes LED brightness level.                                                                        | Use simple stepped brightness; no extra translation.                                                                                                                                     | Scalar step values.                                                                                                    | manual-stated                  | Manual: LED Brightness Level section    |

## Preset Recommendation Audit

| Preset                  | Current Risk                                      | Required Fix                                                                           |
| ----------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Safe Vocal Catcher      | Uses raw detector rung array.                     | Select valid detector setting ID that matches intended Peak + RMS + Slow RMS behavior. |
| Smooth Expensive Vocal  | Uses raw detector and tone arrays.                | Select valid pattern settings and scalar steps backed by manual audit.                 |
| Modern Controlled Vocal | Uses raw lookahead/ratio/sidechain selections.    | Resolve to valid setting IDs or scalar values.                                         |
| Character Vocal Print   | Uses raw saturation-related selections.           | Resolve to manual-backed saturation character/hardness/crossover choices.              |
| Mix Bus presets         | Raw arrays may not match manual display behavior. | Migrate all Enigma selections through canonical resolver.                              |
