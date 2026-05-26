# Drum Alignment Workbench V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` with `dispatching-parallel-agents`. Dispatch independent workstreams in parallel only after the shared interface contract is accepted. Integrate serially through review gates.

**Goal:** Build the first operational browser-only Drum Alignment Workbench on top of the existing Studio Tools live workbench.

**Design Spec:** `docs/superpowers/specs/2026-05-26-drum-alignment-workbench-v1-design.md`

**Architecture:** Static browser app hosted from `studio-tools.html`. Audio stays local. Testable alignment logic lives in `lib/lab/drum-alignment-engine.js`; browser-only orchestration lives in `drum-alignment.js`; rendering lives in `lib/lab/drum-waveform-renderer.js`. No new Vercel Functions.

**Tech Stack:** Static HTML/CSS/JS, browser Web Audio API, Canvas, Node built-in test runner.

---

## Preflight

- [ ] Confirm current branch and worktree with `git status -sb` and `git log -1 --oneline --decorate`.
- [ ] Decide whether to continue from `wip/studio-tools-live-workspace` or create a clean worktree/branch from `origin/main`.
- [ ] Preserve unrelated dirty changes before implementation. Current known unrelated/local changes may include `package.json`, `package-lock.json`, `test/project-support-page.test.js`, and Logic Auto Bounce planning docs.
- [ ] Read the design spec before dispatching agents.
- [ ] Do not add a new API route.

## Shared Interface Contract

Create the engine contract before parallel work begins. The exact internals may evolve, but the public surface should stay stable enough for UI, renderer, and tests.

Proposed module: `lib/lab/drum-alignment-engine.js`

```js
function classifyTrackName(fileName) {}
function recommendReference(tracks) {}
function buildOverheadEventReference(overheadTracks, options) {}
function detectTransient(channelData, options) {}
function calculateAlignment({ tracks, reference, sampleRate }) {}
function calculateCorrelation(a, b, options) {}
function createAlignmentReport(result) {}
```

Core result shape:

```js
{
  tracks: [
    {
      id,
      fileName,
      role,
      family,
      sampleRate,
      duration,
      transientSample,
      manualTransientSample,
      offsetSamples,
      offsetMs,
      confidence,
    },
  ],
  recommendedReference: {
    type,
    trackIds,
    label,
    reason,
  },
  referenceEvent: {
    sample,
    ms,
    source,
  },
  correlations: [
    {
      id,
      trackIds,
      family,
      value,
      label,
      warning,
    },
  ],
  reportText,
}
```

## Parallel Workstreams

### Agent 1: Engine And DSP Contract

**Files:**

- Add: `lib/lab/drum-alignment-engine.js`
- Add: `test/drum-alignment-engine.test.js`

**Scope:**

- Track role classification, including toms.
- Overhead reference recommendation.
- Internal overhead event envelope from stereo/dual overhead energy.
- Basic transient detection over synthetic arrays.
- Offset calculation in samples and milliseconds.
- Correlation calculation and confidence labels.
- Copyable report generation.

**Acceptance:**

- Tests cover kick, snare, tom, overhead, room, and unknown filename classification.
- Tests prove overheads are recommended when present.
- Tests prove direct close-mic-to-overhead offset calculation.
- Tests prove correlation labels for positive, ambiguous, and negative relationships.
- No browser APIs are required by this module.

### Agent 2: Browser Workflow Controller

**Files:**

- Add: `drum-alignment.js`
- Modify: `studio-tools.html`
- Modify: `package.json`

**Scope:**

- Add Drum Alignment operational UI inside the existing `drum-alignment-workbench` section.
- Add file input and drag/drop area.
- Decode files with Web Audio API.
- Maintain track state, roles, reference selection, and manual markers.
- Call the engine and renderer.
- Copy report to clipboard.
- Add `drum-alignment.js` and new modules to `check:js`.

**Acceptance:**

- UI works without backend calls.
- Users can choose or override reference.
- Users can relabel tracks.
- Report copy path is wired with a visible success/failure state.

### Agent 3: Waveform Renderer

**Files:**

- Add: `lib/lab/drum-waveform-renderer.js`
- Add focused renderer tests only if DOM/canvas seams are testable without fragile mocks.

**Scope:**

- Draw compact waveform lanes on canvas.
- Show before waveform as dim layer and after waveform as bright layer.
- Show reference event marker.
- Show detected/manual transient marker.
- Show offset badges and confidence state hooks.
- Resize/redraw safely.

**Acceptance:**

- Renderer has a small public interface callable by `drum-alignment.js`.
- Renderer tolerates empty tracks and decode failures.
- Renderer does not own alignment math.

### Agent 4: Visual System And Responsive Layout

**Files:**

- Modify: `style.css`

**Scope:**

- Drum Alignment file intake surface.
- Track role/reference controls.
- Waveform lane layout.
- Before/after overlay styling.
- Correlation meter styling.
- Dense desktop layout and practical mobile fallback.
- Keep visual language aligned with Studio Tools without making the workbench feel like a marketing landing page.

**Acceptance:**

- Text does not overflow controls.
- Waveform lanes have stable dimensions.
- Mobile layout stacks controls and lanes without overlap.
- No new decorative page-card nesting.

### Agent 5: QA And Integration Review

**Files:**

- Modify/add tests as needed.
- Update docs only if implementation changes the plan.

**Scope:**

- Add or update static page tests.
- Run focused engine tests.
- Run `npm run check:js`.
- Run `npm test`.
- Run `git diff --check`.
- Manually inspect `studio-tools.html` locally.
- Verify no new Vercel Function entrypoint exists.
- Verify uploaded audio does not leave the browser.

**Acceptance:**

- All relevant checks pass or blockers are documented with exact failures.

## Integration Order

1. Land the shared engine contract and tests.
2. Integrate renderer against synthetic track data.
3. Integrate browser controller with decoded files and engine results.
4. Apply CSS after real markup is present.
5. Add static page coverage.
6. Run focused checks.
7. Run full checks.

## Build Slices

### Slice 1: Skeleton And Contract

- [ ] Add engine module with classification/reference/report stubs and tests.
- [ ] Add Drum Alignment operational shell in `studio-tools.html`.
- [ ] Add `drum-alignment.js` boot guard that does nothing when the section is absent.
- [ ] Add script tags and `check:js` entries.

### Slice 2: Track Classification And Intake

- [ ] Load local files.
- [ ] Decode supported audio files.
- [ ] Show track list with inferred roles.
- [ ] Allow manual role edits.
- [ ] Show per-file decode errors without failing the full session.

### Slice 3: Overhead Reference Strategy

- [ ] Recommend overheads when detected.
- [ ] Build internal overhead event envelope from energy.
- [ ] Let user override reference.
- [ ] Show clear labels distinguishing stereo overhead image from internal timing reference.

### Slice 4: Transient Alignment

- [ ] Detect close-mic transients.
- [ ] Compare each close mic directly to the overhead event reference.
- [ ] Calculate sample and millisecond offsets.
- [ ] Display offset table.

### Slice 5: Waveform Before/After

- [ ] Render all waveform lanes.
- [ ] Show before layer and after layer.
- [ ] Show reference event and transient markers.
- [ ] Make movement obvious without hiding the original timing.

### Slice 6: Manual Marker Correction

- [ ] Allow marker click/drag or numeric correction.
- [ ] Recalculate offsets after manual correction.
- [ ] Mark manual corrections distinctly in the report.

### Slice 7: Correlation Meters

- [ ] Compute correlation around selected event windows.
- [ ] Show family/pair correlation labels.
- [ ] Include warnings for ambiguous or likely polarity/phase issues.

### Slice 8: Report, Polish, And Verification

- [ ] Copy report to clipboard.
- [ ] Refine empty/error states.
- [ ] Verify mobile and desktop layouts.
- [ ] Run full automated checks.

## Verification Commands

```bash
node --test test/drum-alignment-engine.test.js
node --test test/project-support-page.test.js
npm run check:js
npm test
git diff --check
```

## Manual QA

- Load a set containing overheads, kick, snare, and toms.
- Confirm overheads are recommended.
- Override the reference and confirm offsets update.
- Confirm each close mic compares directly against the overhead event reference.
- Confirm before/after movement is visually obvious.
- Correct a marker manually and confirm report changes.
- Confirm correlation labels appear and remain humble.
- Confirm no network request is made for uploaded audio.

## Deferred Work

- Spectral phase alignment.
- Audio export.
- Session persistence.
- Public client-facing launch copy.
- Backend storage or analysis.

## Rollback

Because V1 is static browser code, rollback is straightforward:

1. Remove `drum-alignment.js` and new `lib/lab` modules.
2. Revert the Drum Alignment operational section in `studio-tools.html` to the static workbench.
3. Remove CSS additions and new tests.
4. Remove `check:js` entries.

No database, API, or provider rollback should be needed.
