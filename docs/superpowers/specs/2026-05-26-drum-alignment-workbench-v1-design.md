# Drum Alignment Workbench V1 Design

Date: 2026-05-26
Project: Dirt Cat Records Studio Tools
Status: Approved design direction, ready for implementation planning

## Problem

Multi-mic drum recordings often arrive with close mics, overheads, rooms, and toms captured at different physical distances. The timing relationship can make the kit feel smaller, less centered, or phasey before any mix decision happens. The first tool should help align close mics toward the overhead image while keeping the user in control when automatic detection is wrong.

## Goal

Build a browser-only Drum Alignment Workbench that loads local drum audio files, recommends overheads as the reference, compares each close mic directly to an internal overhead event reference, shows before/after waveform movement, reports DAW-ready offsets, and provides correlation confidence for drum mic relationships.

The first version is for internal Dirt Cat use. It should be polished enough to later become user-facing after real sessions prove the workflow.

## Core Promise

Load drum files, choose or accept the overhead reference, see every close mic against the kit image, move with confidence, and copy exact DAW-ready offsets.

## Goals

- Keep all audio local in the browser.
- Support kick, snare, toms, overheads, rooms, and unknown tracks.
- Treat toms as first-class tracks, not generic extras.
- Recommend overheads as the default reference when detected.
- Allow the user to override the reference with any track or group.
- Preserve stereo overheads as the visual kit image.
- Use an internal overhead event envelope as the timing reference.
- Compare each close mic directly to the overhead timing reference because every mic has a different distance relationship to the overheads.
- Show before/after waveform movement with a clear overlay.
- Show offsets in milliseconds and samples.
- Allow manual transient marker correction.
- Show correlation/phase confidence for relevant drum relationships.
- Produce a copyable alignment report.

## Non-Goals

- Do not upload, store, or transmit audio files.
- Do not add a Vercel Function or backend audio service.
- Do not export shifted audio files in V1.
- Do not claim spectral phase alignment is solved.
- Do not make the public user-facing promise until internal sessions prove the tool.
- Do not move overheads by default; close mics move toward the overhead image unless the user explicitly chooses another reference.

## Track Families

The tool should infer track families from filenames and let the user override every role.

- Overheads: `OH L`, `OH R`, `Overheads`, `OH Stereo`, `Cymbals`
- Kick: `Kick In`, `Kick Out`, `Kick Sub`, `Kick Sample`
- Snare: `Snare Top`, `Snare Bottom`, `Snare Sample`
- Toms: `Rack Tom 1`, `Rack Tom 2`, `Floor Tom`, `Tom 1`, `Tom 2`, `Tom 3`, extra toms
- Rooms: `Room L`, `Room R`, `Mono Room`, `Crush Room`
- Other: hats, ride, percussion, unknown names

## Reference Strategy

The tool has three reference concepts:

1. **Stereo overhead visual reference**: preserve the left/right overheads as the kit image the user evaluates by eye and ear.
2. **Internal overhead timing reference**: derive a mono-like event envelope from overhead transient energy. This should not be a naive public mono sum that replaces the stereo image. Prefer energy-based combination, such as absolute/RMS/max channel energy, to avoid simple cancellation problems.
3. **User-selected override**: let any track or group become the reference for unusual sessions or specific editing choices.

Default behavior:

1. Detect overhead tracks.
2. Recommend overheads as the reference.
3. Build an internal overhead event envelope for timing analysis.
4. Compare each close mic directly against the overhead event reference.
5. Keep overheads visually stereo so the user does not lose the image context.

## Primary Workflow

1. User opens `drum-alignment.html` from the Studio Tools launcher.
2. User loads local audio files with a file picker or drag-and-drop.
3. Tool decodes audio in the browser with Web Audio APIs.
4. Tool classifies tracks into families and displays editable role selectors.
5. Tool recommends overheads as the reference when detected.
6. User accepts or overrides the reference.
7. Tool detects likely transients and overhead event timing.
8. Tool renders waveform lanes with before/after overlay movement.
9. User corrects markers manually where needed.
10. Tool recalculates offsets and correlation confidence.
11. User copies an alignment report for DAW work.

## Waveform View

Use overlay mode as the default comparison view.

Each lane should show:

- original waveform as a dim before layer;
- aligned waveform as a bright after layer;
- reference event marker;
- detected or manually corrected transient marker;
- offset badge in milliseconds and samples;
- role label and filename;
- confidence/correlation state.

The first useful view should focus on the early transient window while still providing enough context to understand the track. Later versions can add overview/zoom controls.

## Correlation Strategy

Correlation should answer: after this timing move, does the relationship look healthier or does it need human attention?

V1 should support correlation or phase-confidence labels for relevant relationships:

- Kick In vs Kick Out
- Snare Top vs Snare Bottom
- Tom mics vs the overhead event around the tom hit
- OH L vs OH R
- Close mic vs overhead timing reference around the selected event

Suggested labels:

- `Strong`
- `Usable`
- `Check by ear`
- `Likely polarity/phase issue`

Avoid absolute good/bad language because bleed, room tone, cymbals, and mic placement can make correlation ambiguous.

## V1 Success Criteria

- Multiple local files can be loaded and decoded.
- Files are classified into drum families, including toms.
- Users can manually relabel roles.
- Overheads are recommended as the default reference when present.
- The user can override the reference.
- The internal overhead event reference is computed without replacing the stereo visual context.
- Every close mic can be compared directly against that overhead timing reference.
- Before/after movement is visually obvious.
- Offsets are shown in milliseconds and samples.
- Manual transient marker edits update offsets.
- Correlation/phase confidence is visible for important drum relationships.
- The report can be copied.
- No audio leaves the browser.

## Future Work

- Audio playback and before/after loop audition.
- Export shifted audio files.
- Session save/load.
- More robust event matching per drum family.
- Spectral phase alignment.
- Frequency-band phase display.
- Polarity flip preview.
- All-pass or spectral delay recommendations.
- Client-facing readiness score integration.

## Risks

- A naive mono overhead sum can hide or cancel transient information. Use an energy envelope for timing and keep stereo overheads visible.
- Automatic transient detection can grab bleed, clicks, count-offs, or the wrong drum. Manual markers are part of V1, not an optional polish item.
- Toms may need event-specific windows because the first transient in the file may not be the tom hit.
- Browser decoding support varies by format. The UI should present decode failures as recoverable per-file issues.
- A tool that looks too authoritative can encourage bad edits. Keep labels practical and humble.

## North-Star Checklist

Every feature should answer yes to at least one of these questions:

- Does this help align close mics to the overhead image?
- Does it make waveform movement visually obvious?
- Does it preserve user control when auto-detection is wrong?
- Does it produce DAW-useful numbers?
- Does it keep audio private and local?
- Does it avoid pretending spectral phase is solved before it is?
- Would this be trustworthy on a messy real client drum session?
