# Brick Lane Hardware-Accurate Visuals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the Brick Lane Sonic Lab so the central hardware visual matches the Cranborne Audio Brick Lane 500 front-panel anatomy and the tool accurately guides users through the Enigma menu using plain-language compressor and saturation terminology.

**Architecture:** Keep the existing static HTML/CSS/JS architecture and current preset-generation data. Add a small, explicit front-panel reference model that drives one accurate faceplate renderer, plus a canonical Enigma demystifier map that preserves hardware recall names while exposing plain-language meanings. Move non-physical controls such as the Enigma monitor selector, signal simulation, and recall tabs outside the hardware faceplate. Use tests for DOM anatomy, glossary labels, and Playwright screenshots for visual QA against official product references.

**Tech Stack:** Plain HTML, CSS, JavaScript, Node `node:test`, Playwright, existing static site and `npm run check:js`.

---

## Reference Baseline

Use these references as the visual contract:

- Official product page: `https://www.cranborne-audio.com/bricklane500`
- Official product front image discovered on that page: `https://www.cranborne-audio.com/hubfs/Brick%20Lane%20500%20Front%20JPEG%20Trimmed.jpeg`
- Official line art discovered on that page: `https://www.cranborne-audio.com/hs-fs/hubfs/Brick%20Lane%20500_Line%20Art-01-1.jpg?width=2000&height=2000&name=Brick%20Lane%20500_Line%20Art-01-1.jpg`
- Official guide supplied by the user: `https://4191221.hs-sites.com/hubfs/Cranborne_Audio_Brick_Lane_500_User_Guide-1.pdf?hsCtaAttrib=197014140716&hsLang=en`
- User video references: `https://www.youtube.com/watch?v=jGBbKE5YDPU` and `https://www.youtube.com/watch?v=0dbLWwkQRVg&t=1s`

Observed current mismatch from `/tmp/brick-lane-current-desktop.png`:

- Current faceplate is too wide and plugin-like; real unit is a tall, narrow 500-series module.
- Current faceplate embeds a `select` dropdown; real unit has no dropdown.
- Current faceplate presents two symmetric Enigma parameter meters; real unit has physical SIG and GR meter stacks near the top.
- Current lower-right hardware area omits the optosync/input jack/switch anatomy and compresses SCF/MODE into generic switches.
- Current CSS has duplicated interactive-upgrade blocks and too many faceplate styles layered on top of each other.
- Current UI exposes many hardware/Enigma names without translating them into practical compressor behavior.
- `STRESS` should remain on the drawn hardware, but user guidance should call it `Saturation`.
- Mode guidance must map the hardware names to familiar compressor families:
  - `VELVET` -> `Vari-Mu`
  - `FLOAT` -> `Optical`
  - `SMASH` -> `FET`
  - `TAME` -> `Clean/Transparent`
  - `GLUE` -> `VCA`
  - `POLISH` -> `Limiter/Clipper`

## File Structure

- Modify `brick-lane-data.js`: add a `FRONT_PANEL_REFERENCE` object for physical labels, meter scales, mode labels, switch labels, and region order. Do not move preset generation or existing archetype data.
- Modify `brick-lane-data.js`: add an `ENIGMA_DEMYSTIFIER` object for mode family names, saturation language, and parameter plain-language labels.
- Modify `brick-lane-lab.js`: split the faceplate renderer into small physical sub-renderers and remove UI-only controls from the hardware markup.
- Modify `brick-lane-lab.js`: show hardware names and plain-language meanings together in the recall panel, copy text, and print sheet.
- Modify `style.css`: replace the current `.brick-lane-hardware*` rules with a single measured faceplate system scoped to `.brick-lane-lab-page`; remove duplicate interactive-upgrade blocks.
- Modify `test/brick-lane-data.test.js`: assert the physical front-panel reference model.
- Modify `test/brick-lane-data.test.js`: assert the demystifier mappings for modes, saturation, and key Enigma parameters.
- Modify `test/brick-lane-lab-render.test.js`: assert the rendered faceplate anatomy, absence of non-hardware UI inside the hardware surface, and visible plain-language Enigma guidance.
- Create `test/brick-lane-visual-regression.test.js`: Playwright smoke test for desktop/mobile dimensions and critical element bounding boxes.
- Create `docs/brick-lane-reference-audit.md`: document source references, target front-panel anatomy, and remaining unverified Enigma mapping risks.

## Task 1: Document the Hardware Reference Contract

**Files:**
- Create: `docs/brick-lane-reference-audit.md`

- [ ] **Step 1: Add the reference audit**

Create `docs/brick-lane-reference-audit.md` with this content:

```markdown
# Brick Lane 500 Reference Audit

Date: 2026-05-25

## Source References

- Official Cranborne product page: https://www.cranborne-audio.com/bricklane500
- Official front image: https://www.cranborne-audio.com/hubfs/Brick%20Lane%20500%20Front%20JPEG%20Trimmed.jpeg
- Official line art: https://www.cranborne-audio.com/hs-fs/hubfs/Brick%20Lane%20500_Line%20Art-01-1.jpg?width=2000&height=2000&name=Brick%20Lane%20500_Line%20Art-01-1.jpg
- Official user guide: https://4191221.hs-sites.com/hubfs/Cranborne_Audio_Brick_Lane_500_User_Guide-1.pdf?hsCtaAttrib=197014140716&hsLang=en
- User video refs: https://www.youtube.com/watch?v=jGBbKE5YDPU and https://www.youtube.com/watch?v=0dbLWwkQRVg&t=1s

## Physical Faceplate Anatomy To Match

- Tall 500-series module, approximately 1:3.5 visual proportion when cropped to the black faceplate plus gray rack ears.
- Top gray metal rack ear with round screw hole and multicolor diagonal stripe band.
- Black central faceplate with rounded corners.
- Top branding reads `BRICK LANE` with `modal compressor` below.
- Left control column contains five large knobs in order: `INPUT`, `THRESHOLD`, `ATTACK`, `RELEASE`, `OUTPUT`.
- Input and output knobs include `dB`, `-20`, `20`, and output has `0` above the control.
- Threshold uses `MIN` and `MAX`; Attack and Release use `SLOW` and `FAST`.
- Top-right meter area has two vertical LED stacks:
  - SIG scale on the left uses `24, 21, 18, 15, 12, 6, 0, -6, -12, -18, -24`.
  - GR scale on the right uses `0.5, 1.0, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15`.
  - SIG accent is magenta/pink; GR accent is cyan/blue.
- Smaller `STRESS` knob sits to the right of the main knob column, below the meters, with `OFF` and `MAX`.
- Six mode LEDs sit below Stress in order: `VELVET`, `FLOAT`, `SMASH`, `TAME`, `GLUE`, `POLISH`.
- Lower-right hardware has `SCF`, `MODE`, `optosync`, frequency marks `60Hz`, `100Hz`, `200Hz`, a linked-pair switch/jack region, and a lower `IN` switch/jack region.

## UI Boundaries

- The physical faceplate must not contain dropdowns, tabs, explanatory cards, signal-generator canvases, or broad Enigma parameter labels.
- Enigma recall selection and monitoring belongs in the right recall panel, not inside the hardware drawing.
- The faceplate may show current physical state only: knob positions, meter illumination, selected mode, SCF frequency, stereo/mono mode, optosync state, and in/bypass state.
- User guidance must preserve exact hardware recall names while translating them into understandable choices.
- The hardware label `STRESS` must be explained as `Saturation` everywhere outside the physical faceplate.
- Mode guidance must expose `VELVET - Vari-Mu`, `FLOAT - Optical`, `SMASH - FET`, `TAME - Clean/Transparent`, `GLUE - VCA`, and `POLISH - Limiter/Clipper`.

## Known Open Risks

- Enigma internal rung behavior still needs guide-by-guide verification. Keep those as data-only changes and mark unverified entries in `brick-lane-data.js` if source evidence is not clear.
- Do not ship official Cranborne imagery as product art unless permission is confirmed. Use official images as implementation reference and QA evidence; keep the shipped faceplate code-drawn.
```

- [ ] **Step 2: Commit**

Run:

```bash
git add docs/brick-lane-reference-audit.md
git commit -m "docs: define Brick Lane hardware reference contract"
```

Expected: commit only the new audit document.

## Task 2: Add a Physical Front-Panel Reference Model

**Files:**
- Modify: `brick-lane-data.js`
- Modify: `test/brick-lane-data.test.js`

- [ ] **Step 1: Write failing tests**

Append to `test/brick-lane-data.test.js`:

```js
test("front panel reference captures physical Brick Lane 500 anatomy", () => {
  const { FRONT_PANEL_REFERENCE } = require("../brick-lane-data");

  assert.deepEqual(FRONT_PANEL_REFERENCE.mainKnobs.map((knob) => knob.id), [
    "input",
    "threshold",
    "attack",
    "release",
    "output",
  ]);
  assert.equal(FRONT_PANEL_REFERENCE.stressKnob.id, "stress");
  assert.deepEqual(FRONT_PANEL_REFERENCE.modeLabels, [
    "VELVET",
    "FLOAT",
    "SMASH",
    "TAME",
    "GLUE",
    "POLISH",
  ]);
  assert.deepEqual(FRONT_PANEL_REFERENCE.meters.sig.scale, [
    "24",
    "21",
    "18",
    "15",
    "12",
    "6",
    "0",
    "-6",
    "-12",
    "-18",
    "-24",
  ]);
  assert.deepEqual(FRONT_PANEL_REFERENCE.meters.gr.scale, [
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
  assert.deepEqual(FRONT_PANEL_REFERENCE.scfFrequencies, [
    "60Hz",
    "100Hz",
    "200Hz",
  ]);
  assert.deepEqual(FRONT_PANEL_REFERENCE.lowerSections, [
    "scf",
    "mode",
    "optosync",
    "in",
  ]);
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node --test test/brick-lane-data.test.js
```

Expected: FAIL with `FRONT_PANEL_REFERENCE` undefined.

- [ ] **Step 3: Implement the reference model**

Add this near the top-level data constants in `brick-lane-data.js`:

```js
  const FRONT_PANEL_REFERENCE = {
    mainKnobs: [
      { id: "input", label: "INPUT", unit: "dB", low: "-20", high: "20" },
      { id: "threshold", label: "THRESHOLD", unit: "", low: "MIN", high: "MAX" },
      { id: "attack", label: "ATTACK", unit: "", low: "SLOW", high: "FAST" },
      { id: "release", label: "RELEASE", unit: "", low: "SLOW", high: "FAST" },
      { id: "output", label: "OUTPUT", unit: "dB", center: "0", low: "-20", high: "20" },
    ],
    stressKnob: { id: "stress", label: "STRESS", low: "OFF", high: "MAX" },
    meters: {
      sig: {
        id: "sig",
        label: "SIG",
        color: "magenta",
        scale: ["24", "21", "18", "15", "12", "6", "0", "-6", "-12", "-18", "-24"],
      },
      gr: {
        id: "gr",
        label: "GR",
        color: "cyan",
        scale: ["0.5", "1.0", "1.5", "2", "3", "4", "5", "6", "8", "10", "12", "15"],
      },
    },
    modeLabels: ["VELVET", "FLOAT", "SMASH", "TAME", "GLUE", "POLISH"],
    scfFrequencies: ["60Hz", "100Hz", "200Hz"],
    lowerSections: ["scf", "mode", "optosync", "in"],
  };
```

Add `FRONT_PANEL_REFERENCE` to the exported `api` object at the bottom of `brick-lane-data.js`.

- [ ] **Step 4: Run the passing test**

Run:

```bash
node --test test/brick-lane-data.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add brick-lane-data.js test/brick-lane-data.test.js
git commit -m "feat: add Brick Lane physical panel reference data"
```

## Task 2A: Add Enigma Demystifier Data

**Files:**
- Modify: `brick-lane-data.js`
- Modify: `test/brick-lane-data.test.js`

- [ ] **Step 1: Write failing demystifier tests**

Append to `test/brick-lane-data.test.js`:

```js
test("Enigma demystifier maps hardware mode names to familiar compressor families", () => {
  const { ENIGMA_DEMYSTIFIER } = require("../brick-lane-data");

  assert.equal(ENIGMA_DEMYSTIFIER.modes.VELVET.family, "Vari-Mu");
  assert.equal(ENIGMA_DEMYSTIFIER.modes.FLOAT.family, "Optical");
  assert.equal(ENIGMA_DEMYSTIFIER.modes.SMASH.family, "FET");
  assert.equal(ENIGMA_DEMYSTIFIER.modes.TAME.family, "Clean/Transparent");
  assert.equal(ENIGMA_DEMYSTIFIER.modes.GLUE.family, "VCA");
  assert.equal(ENIGMA_DEMYSTIFIER.modes.POLISH.family, "Limiter/Clipper");
});

test("Enigma demystifier presents Stress as Saturation outside the faceplate", () => {
  const { ENIGMA_DEMYSTIFIER } = require("../brick-lane-data");

  assert.equal(ENIGMA_DEMYSTIFIER.saturation.hardwareLabel, "STRESS");
  assert.equal(ENIGMA_DEMYSTIFIER.saturation.userLabel, "Saturation");
  assert.match(
    ENIGMA_DEMYSTIFIER.parameters.stressTypeDiodeClipping.userLabel,
    /Saturation character/
  );
  assert.match(
    ENIGMA_DEMYSTIFIER.parameters.diodeHardness.userLabel,
    /Saturation hardness/
  );
});

test("Enigma demystifier keeps recall-critical hardware labels available", () => {
  const { ENIGMA_DEMYSTIFIER } = require("../brick-lane-data");

  assert.equal(
    ENIGMA_DEMYSTIFIER.parameters.sidechainHighFrequencyEmphasis.hardwareLabel,
    "Sidechain High Frequency Emphasis/De-emphasis"
  );
  assert.equal(
    ENIGMA_DEMYSTIFIER.parameters.ratio.userLabel,
    "Compression ratio"
  );
  assert.equal(
    ENIGMA_DEMYSTIFIER.parameters.detector.userLabel,
    "Detector blend"
  );
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node --test test/brick-lane-data.test.js
```

Expected: FAIL with `ENIGMA_DEMYSTIFIER` undefined.

- [ ] **Step 3: Implement the demystifier data**

Add this top-level constant in `brick-lane-data.js` after `FRONT_PANEL_REFERENCE`:

```js
  const ENIGMA_DEMYSTIFIER = {
    modes: {
      VELVET: {
        hardwareLabel: "VELVET",
        family: "Vari-Mu",
        summary: "Rounded, weighty compression that feels slow, forgiving, and tube-like.",
        saturation: "Soft harmonic thickening.",
      },
      FLOAT: {
        hardwareLabel: "FLOAT",
        family: "Optical",
        summary: "Smooth leveling with gentle movement and less obvious grab.",
        saturation: "Airy, low-grain color.",
      },
      SMASH: {
        hardwareLabel: "SMASH",
        family: "FET",
        summary: "Fast, forward compression for aggressive transient control and attitude.",
        saturation: "Edgy, transient-forward drive.",
      },
      TAME: {
        hardwareLabel: "TAME",
        family: "Clean/Transparent",
        summary: "Controlled dynamics with minimal obvious color.",
        saturation: "Least colored saturation path.",
      },
      GLUE: {
        hardwareLabel: "GLUE",
        family: "VCA",
        summary: "Bus-style compression that pulls parts together and stabilizes movement.",
        saturation: "Cohesive, mix-bus density.",
      },
      POLISH: {
        hardwareLabel: "POLISH",
        family: "Limiter/Clipper",
        summary: "Finishing compression for density, level, and controlled peak shape.",
        saturation: "Bright limiting and clipping-style finish.",
      },
    },
    saturation: {
      hardwareLabel: "STRESS",
      userLabel: "Saturation",
      summary:
        "The hardware calls this STRESS; the tool explains it as Saturation because it changes harmonic drive and clipping behavior inside each mode.",
    },
    parameters: {
      stressTypeDiodeClipping: {
        hardwareLabel: "Stress Character / Diode Clipping",
        userLabel: "Saturation character",
        plainMeaning:
          "Chooses the flavor of drive or clipping that the Saturation control leans into.",
      },
      diodeHardness: {
        hardwareLabel: "Diode Hardness",
        userLabel: "Saturation hardness",
        plainMeaning:
          "Controls how soft or abrupt the saturation edge feels when driven.",
      },
      stressCrossoverPhase: {
        hardwareLabel: "Stress Crossover & Phase",
        userLabel: "Saturation crossover and phase",
        plainMeaning:
          "Changes where saturation energy shifts across the spectrum and how parallel paths line up.",
      },
      sidechainHighFrequencyEmphasis: {
        hardwareLabel: "Sidechain High Frequency Emphasis/De-emphasis",
        userLabel: "High-frequency sidechain response",
        plainMeaning:
          "Controls whether bright material makes the compressor react more or less.",
      },
      detector: {
        hardwareLabel: "Detector Mode Selection",
        userLabel: "Detector blend",
        plainMeaning:
          "Chooses whether the compressor reacts more like peak catching, RMS leveling, or a blend.",
      },
      crestFactorShaping: {
        hardwareLabel: "Crest Factor Shaping",
        userLabel: "Peak-to-body balance",
        plainMeaning:
          "Changes how much transient peaks matter compared with the body of the sound.",
      },
      stereoMonoSidechainLinking: {
        hardwareLabel: "Stereo/Mono Sidechain Linking",
        userLabel: "Stereo linking",
        plainMeaning:
          "Controls whether left and right channels compress together or independently.",
      },
      ratio: {
        hardwareLabel: "Ratio Setting Curve",
        userLabel: "Compression ratio",
        plainMeaning:
          "Sets how firmly the compressor pushes back once signal crosses the threshold.",
      },
      knee: {
        hardwareLabel: "Knee Width",
        userLabel: "Compression onset",
        plainMeaning:
          "Controls whether gain reduction starts abruptly or eases in smoothly.",
      },
      attackWeighting: {
        hardwareLabel: "Attack Weighting Shape",
        userLabel: "Attack behavior",
        plainMeaning:
          "Changes how quickly the compressor grabs transients and overshoots.",
      },
      releaseWeighting: {
        hardwareLabel: "Release Weighting Behavior",
        userLabel: "Release behavior",
        plainMeaning:
          "Changes how the compressor recovers after gain reduction.",
      },
      hold: {
        hardwareLabel: "Hold Timing",
        userLabel: "Gain-reduction hold",
        plainMeaning:
          "Keeps compression engaged briefly before release begins.",
      },
      lookahead: {
        hardwareLabel: "Lookahead Time",
        userLabel: "Transient pre-catch",
        plainMeaning:
          "Lets the detector react ahead of very fast peaks.",
      },
      ledBrightness: {
        hardwareLabel: "LED Brightness Level",
        userLabel: "LED brightness",
        plainMeaning:
          "Changes display brightness; it does not change compression tone.",
      },
    },
  };
```

Add `ENIGMA_DEMYSTIFIER` to the exported `api` object.

- [ ] **Step 4: Run passing data tests**

Run:

```bash
node --test test/brick-lane-data.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add brick-lane-data.js test/brick-lane-data.test.js
git commit -m "feat: add Enigma plain-language guide"
```

## Task 3: Replace the Faceplate Markup With Physical Anatomy

**Files:**
- Modify: `brick-lane-lab.js`
- Modify: `test/brick-lane-lab-render.test.js`

- [ ] **Step 1: Write failing faceplate anatomy tests**

Append to `test/brick-lane-lab-render.test.js`:

```js
test("renderHardwareFaceplate matches physical front-panel anatomy", () => {
  const { renderHardwareFaceplate } = require("../brick-lane-lab");
  const { getGeneratedPreset } = require("../brick-lane-data");
  const preset = getGeneratedPreset();
  const html = renderHardwareFaceplate(preset, {
    frontPanelValues: preset.frontPanelValues,
  });

  for (const label of ["INPUT", "THRESHOLD", "ATTACK", "RELEASE", "OUTPUT"]) {
    assert.match(html, new RegExp(`>${label}<`));
  }
  assert.equal((html.match(/brick-lane-main-knob/g) || []).length, 5);
  assert.equal((html.match(/brick-lane-stress-knob/g) || []).length, 1);
  assert.match(html, /data-meter-id="sig"/);
  assert.match(html, /data-meter-id="gr"/);
  assert.match(html, />VELVET</);
  assert.match(html, />POLISH</);
  assert.match(html, />optosync</i);
  assert.match(html, />IN</);
});

test("physical faceplate does not contain UI-only controls", () => {
  const { renderHardwareFaceplate } = require("../brick-lane-lab");
  const { getGeneratedPreset } = require("../brick-lane-data");
  const html = renderHardwareFaceplate(getGeneratedPreset(), {});

  assert.doesNotMatch(html, /<select/i);
  assert.doesNotMatch(html, /Monitor:/);
  assert.doesNotMatch(html, /Generated Preset/);
  assert.doesNotMatch(html, /brick-lane-tab-btn/);
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node --test test/brick-lane-lab-render.test.js
```

Expected: FAIL because `renderHardwareFaceplate` is not exported and/or current markup contains a dropdown.

- [ ] **Step 3: Implement physical sub-renderers**

In `brick-lane-lab.js`, keep `knobAngle(value)` and add these helpers above the current faceplate renderer:

```js
  function normalizePanelValue(value, fallback = 50) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.min(100, number));
  }

  function renderPhysicalKnob(knob, value, className = "brick-lane-main-knob") {
    const safeValue = normalizePanelValue(value);
    const center = knob.center
      ? `<span class="brick-lane-knob-center">${escapeHtml(knob.center)}</span>`
      : "";
    return `<div class="brick-lane-physical-knob ${className}" data-param="${escapeHtml(knob.id)}">
      <div class="brick-lane-physical-label">
        <span>${escapeHtml(knob.label)}</span>
        ${knob.unit ? `<small>${escapeHtml(knob.unit)}</small>` : ""}
      </div>
      <div class="brick-lane-knob-scale" aria-hidden="true">${center}</div>
      <div class="brick-lane-big-knob" data-param="${escapeHtml(knob.id)}" data-val="${safeValue}" style="--brick-lane-knob-angle:${knobAngle(safeValue)}deg"></div>
      <div class="brick-lane-scale-row"><span>${escapeHtml(knob.low)}</span><span>${escapeHtml(knob.high)}</span></div>
      <div class="brick-lane-tooltip" id="tooltip-fp-${escapeHtml(knob.id)}">${safeValue}</div>
    </div>`;
  }

  function renderPhysicalMeter(meter, activeScale = []) {
    const active = new Set(activeScale.map(String));
    const ledColor = data.BRICK_LANE_COLORS[meter.color] || meter.color;
    return `<div class="brick-lane-physical-meter" data-meter-id="${escapeHtml(meter.id)}" style="--brick-lane-led:${escapeHtml(ledColor)}">
      <div class="brick-lane-meter-scale">
        ${meter.scale
          .map((label) => `<span>${escapeHtml(label)}</span>`)
          .join("")}
      </div>
      <div class="brick-lane-meter-leds">
        ${meter.scale
          .map((label) => `<span class="brick-lane-meter-led${active.has(label) ? " is-on" : ""}" data-val="${escapeHtml(label)}"></span>`)
          .join("")}
      </div>
      <strong>${escapeHtml(meter.label)}</strong>
    </div>`;
  }

  function renderPhysicalModeList(activeMode) {
    return `<div class="brick-lane-physical-modes">
      ${data.FRONT_PANEL_REFERENCE.modeLabels
        .map((mode) => `<span class="brick-lane-physical-mode${mode.toLowerCase() === String(activeMode || "").toLowerCase() ? " is-active" : ""}"><i></i>${escapeHtml(mode)}</span>`)
        .join("")}
    </div>`;
  }

  function renderLowerHardware(fp) {
    const scf = fp.scf || "100 Hz";
    const link = fp.link || "STEREO";
    return `<div class="brick-lane-lower-hardware">
      <div class="brick-lane-scf-block">
        <strong>SCF</strong>
        <div class="brick-lane-frequency-row">
          ${data.FRONT_PANEL_REFERENCE.scfFrequencies
            .map((freq) => `<span class="${String(scf).replace(" ", "") === freq ? "is-active" : ""}">${escapeHtml(freq)}</span>`)
            .join("")}
        </div>
      </div>
      <div class="brick-lane-mode-switch-block">
        <strong>MODE</strong>
        <span>${escapeHtml(link)}</span>
      </div>
      <div class="brick-lane-optosync-block">
        <strong>optosync</strong>
        <span class="brick-lane-jack"></span>
        <span class="brick-lane-switch-post"></span>
      </div>
      <div class="brick-lane-input-switch-block">
        <strong>IN</strong>
        <span class="brick-lane-jack"></span>
        <span class="brick-lane-switch-post"></span>
      </div>
    </div>`;
  }
```

- [ ] **Step 4: Replace `renderHardwareFaceplate`**

Rename the existing `renderHardware(preset, state)` function to `renderHardwareFaceplate(preset, state)` if needed, and replace its returned markup with:

```js
  function renderHardwareFaceplate(preset, state = {}) {
    const fp = state.frontPanelValues || preset.frontPanelValues || {};
    const reference = data.FRONT_PANEL_REFERENCE;
    const sigActive = fp.signalMeter || ["0", "-6", "-12", "-18", "-24"];
    const grActive = fp.gainReductionMeter || preset.parameters.ratio.selected || [];

    return `<div class="brick-lane-hardware" aria-label="Brick Lane 500 front panel">
      <div class="brick-lane-rack-ear is-top"><span></span></div>
      <div class="brick-lane-faceplate-core">
        <div class="brick-lane-stripe"></div>
        <div class="brick-lane-brand-lockup">
          <strong>BRICK LANE</strong>
          <span>modal compressor</span>
        </div>
        <div class="brick-lane-panel-body">
          <div class="brick-lane-main-controls">
            ${reference.mainKnobs
              .map((knob) => renderPhysicalKnob(knob, fp[knob.id]))
              .join("")}
          </div>
          <div class="brick-lane-right-controls">
            <div class="brick-lane-meter-pair">
              ${renderPhysicalMeter(reference.meters.sig, sigActive)}
              ${renderPhysicalMeter(reference.meters.gr, grActive)}
            </div>
            ${renderPhysicalKnob(reference.stressKnob, fp.stress, "brick-lane-stress-knob")}
            ${renderPhysicalModeList(preset.mode)}
            ${renderLowerHardware(fp)}
          </div>
        </div>
        <div class="brick-lane-footer-brand">CRANBORNE AUDIO</div>
      </div>
      <div class="brick-lane-rack-ear is-bottom"><span></span></div>
    </div>`;
  }
```

Update the render call in `render()` from the old hardware function name to:

```js
nodes.faceplate.innerHTML = renderHardwareFaceplate(preset, state);
```

Export `renderHardwareFaceplate` in the `api` object.

- [ ] **Step 5: Move monitor selection out of the physical faceplate**

If the monitor selection is still useful, render it above the recall cards in `renderRecallCards()`:

```js
const monitorHtml = `<div class="brick-lane-monitor-tools">
  <label for="brick-lane-monitor-select">Enigma monitor</label>
  <select id="brick-lane-monitor-select" class="brick-lane-select" aria-label="Parameter Monitor">
    <option value="VU">Physical SIG/GR meters</option>
    ${preset.parameterOrder
      .map((id) => `<option value="${escapeHtml(id)}" ${state.monitorParam === id ? "selected" : ""}>${escapeHtml(preset.parameters[id].label)}</option>`)
      .join("")}
  </select>
</div>`;
```

Return `monitorHtml + tabsHtml + cardsHtml` from `renderRecallCards()`.

- [ ] **Step 6: Run tests**

Run:

```bash
node --test test/brick-lane-lab-render.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add brick-lane-lab.js test/brick-lane-lab-render.test.js
git commit -m "feat: render hardware-accurate Brick Lane faceplate anatomy"
```

## Task 3A: Render Plain-Language Enigma Guidance

**Files:**
- Modify: `brick-lane-lab.js`
- Modify: `test/brick-lane-lab-render.test.js`

- [ ] **Step 1: Write failing render tests for demystifier copy**

Append to `test/brick-lane-lab-render.test.js`:

```js
test("preset summary explains hardware mode with plain-language compressor family", () => {
  const preset = getGeneratedPreset();
  const html = renderPresetSummary({ ...preset, mode: "Tame" });

  assert.match(html, /TAME/i);
  assert.match(html, /Clean\/Transparent/);
  assert.match(html, /Saturation/);
  assert.doesNotMatch(html, /Stress:/);
});

test("parameter cards show hardware labels and plain-language meanings", () => {
  const html = renderParameterCard({
    ...ENIGMA_PARAMETERS.stressTypeDiodeClipping,
    selected: ["1.0"],
  });

  assert.match(html, /Stress Character \/ Diode Clipping/);
  assert.match(html, /Saturation character/);
  assert.match(html, /Chooses the flavor of drive or clipping/);
});

test("copy recall text includes Enigma guide labels for users", () => {
  const preset = getGeneratedPreset();
  const text = createCopyText({ ...preset, mode: "Glue" });

  assert.match(text, /GLUE - VCA/i);
  assert.match(text, /STRESS hardware control = Saturation/i);
  assert.match(text, /Compression ratio/);
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node --test test/brick-lane-lab-render.test.js
```

Expected: FAIL because render helpers do not yet use `ENIGMA_DEMYSTIFIER`.

- [ ] **Step 3: Add guide lookup helpers**

Add these helpers near the render helpers in `brick-lane-lab.js`:

```js
  function normalizeModeKey(mode) {
    return String(mode || "").trim().toUpperCase();
  }

  function getModeGuide(mode) {
    return data.ENIGMA_DEMYSTIFIER.modes[normalizeModeKey(mode)] || null;
  }

  function getParameterGuide(parameterId) {
    return data.ENIGMA_DEMYSTIFIER.parameters[parameterId] || null;
  }

  function formatModeLabel(mode) {
    const guide = getModeGuide(mode);
    if (!guide) return String(mode || "");
    return `${guide.hardwareLabel} - ${guide.family}`;
  }
```

- [ ] **Step 4: Update summary rendering**

In `renderPresetSummary(preset)`, replace mode-only display with the guided label:

```js
const modeGuide = getModeGuide(preset.mode);
const modeLabel = formatModeLabel(preset.mode);
const saturationSummary = data.ENIGMA_DEMYSTIFIER.saturation.summary;
```

Ensure the summary card includes:

```html
<p class="brick-lane-mode-family">TAME - Clean/Transparent</p>
<p class="brick-lane-saturation-note">The hardware calls this STRESS; the tool explains it as Saturation...</p>
```

Use escaped dynamic values:

```js
${modeGuide ? `<p class="brick-lane-mode-family">${escapeHtml(modeLabel)}</p>` : ""}
<p class="brick-lane-saturation-note">${escapeHtml(saturationSummary)}</p>
```

- [ ] **Step 5: Update parameter card rendering**

In `renderParameterCard(parameter)`, get the guide and render the user label above the hardware description:

```js
const guide = getParameterGuide(parameter.id);
```

Inside the card markup, include:

```js
${guide ? `<p class="brick-lane-plain-label">${escapeHtml(guide.userLabel)}</p>` : ""}
${guide ? `<p class="brick-lane-plain-meaning">${escapeHtml(guide.plainMeaning)}</p>` : ""}
```

Keep the exact hardware label in the heading:

```js
<h3>${escapeHtml(parameter.label)}</h3>
```

- [ ] **Step 6: Update copy text**

In `createCopyText(preset)`, include mode and saturation translations before parameter lines:

```js
const modeLabel = formatModeLabel(preset.mode);
const saturation = data.ENIGMA_DEMYSTIFIER.saturation;
```

Add lines:

```js
`Mode: ${modeLabel}`,
`${saturation.hardwareLabel} hardware control = ${saturation.userLabel}`,
```

For each parameter, include the plain label when available:

```js
const guide = getParameterGuide(parameter.id);
const label = guide
  ? `${parameter.label} / ${guide.userLabel}`
  : parameter.label;
```

- [ ] **Step 7: Add compact guidance CSS**

Add to `style.css` near the Brick Lane recall card styles:

```css
.brick-lane-mode-family,
.brick-lane-plain-label,
.brick-lane-saturation-note,
.brick-lane-plain-meaning {
  letter-spacing: 0;
}

.brick-lane-mode-family,
.brick-lane-plain-label {
  color: var(--brick-lane-cyan);
  font-size: 0.78rem;
  font-weight: 900;
}

.brick-lane-saturation-note,
.brick-lane-plain-meaning {
  color: var(--brick-lane-muted);
  font-size: 0.72rem;
  line-height: 1.35;
}
```

- [ ] **Step 8: Run tests**

Run:

```bash
node --test test/brick-lane-lab-render.test.js
npm run check:js
git diff --check
```

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```bash
git add brick-lane-lab.js style.css test/brick-lane-lab-render.test.js
git commit -m "feat: explain Enigma modes and saturation"
```

## Task 4: Rebuild Faceplate CSS Around Real Module Proportions

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Remove duplicated hardware style blocks**

Edit `style.css` and remove the second duplicated `BRICK LANE SONIC LAB INTERACTIVE UPGRADES` block. Keep one definition for:

```css
.brick-lane-knob-container
.brick-lane-knob-header
.brick-lane-knob-name
.brick-lane-knob-readout
.brick-lane-big-knob
.brick-lane-tooltip
.brick-lane-dial
.brick-lane-toggle-box
.brick-lane-toggle-handle
.brick-lane-select
.brick-lane-tabs
.brick-lane-cards-grid
```

Expected: `rg -n "BRICK LANE SONIC LAB INTERACTIVE UPGRADES" style.css` returns one match or zero matches.

- [ ] **Step 2: Replace `.brick-lane-hardware*` layout rules**

Replace the current `.brick-lane-hardware`, `.brick-lane-stripe`, `.brick-lane-brand-row`, `.brick-lane-hardware-grid`, `.brick-lane-knob-stack`, `.brick-lane-hardware-ladders`, `.brick-lane-mini-title`, and hardware-specific mirrored ladder overrides with this measured model:

```css
.brick-lane-hardware {
  --faceplate-width: clamp(220px, 24vw, 335px);
  --faceplate-black: #111216;
  --faceplate-metal: #5b646b;
  --faceplate-print: #f4f6fb;
  --faceplate-muted: #a9b0ba;
  position: relative;
  width: var(--faceplate-width);
  margin: 0 auto;
  color: var(--faceplate-print);
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}

.brick-lane-rack-ear {
  position: relative;
  height: calc(var(--faceplate-width) * 0.2);
  border-radius: 3px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.22), transparent 35%),
    var(--faceplate-metal);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.15);
}

.brick-lane-rack-ear span {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(var(--faceplate-width) * 0.115);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: #fbfbfb;
  box-shadow:
    inset 0 0 0 7px #3f454b,
    inset 0 0 0 10px rgba(0,0,0,0.22);
}

.brick-lane-faceplate-core {
  position: relative;
  min-height: calc(var(--faceplate-width) * 3.0);
  padding: calc(var(--faceplate-width) * 0.045) calc(var(--faceplate-width) * 0.04) calc(var(--faceplate-width) * 0.04);
  border-radius: 10px;
  background:
    radial-gradient(circle at 32% 18%, rgba(255,255,255,0.1), transparent 20%),
    linear-gradient(90deg, rgba(255,255,255,0.04), transparent 18%, transparent 82%, rgba(255,255,255,0.05)),
    var(--faceplate-black);
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,0.09),
    inset 0 -40px 60px rgba(0,0,0,0.45),
    0 24px 50px rgba(0,0,0,0.5);
}

.brick-lane-stripe {
  height: calc(var(--faceplate-width) * 0.055);
  margin: 0 0 calc(var(--faceplate-width) * 0.02);
  border-radius: 3px;
  background: repeating-linear-gradient(
    -8deg,
    #f52ee6 0 4px,
    #5ee7ff 4px 8px,
    #5073ff 8px 12px,
    #263043 12px 16px
  );
}

.brick-lane-brand-lockup {
  position: absolute;
  top: calc(var(--faceplate-width) * 0.083);
  right: calc(var(--faceplate-width) * 0.045);
  width: 44%;
  padding: 2px 4px;
  border-radius: 3px;
  background: rgba(255,255,255,0.08);
  transform: skewX(-8deg);
}

.brick-lane-brand-lockup strong,
.brick-lane-brand-lockup span {
  display: block;
  transform: skewX(8deg);
}

.brick-lane-brand-lockup strong {
  color: #f6f7ff;
  font-size: calc(var(--faceplate-width) * 0.067);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1;
  text-shadow: 1px 0 #5ee7ff, -1px 0 #f52ee6;
}

.brick-lane-brand-lockup span {
  color: #d7dce5;
  font-size: calc(var(--faceplate-width) * 0.033);
  line-height: 1.05;
}

.brick-lane-panel-body {
  display: grid;
  grid-template-columns: 54% 42%;
  gap: 4%;
  align-items: start;
  padding-top: calc(var(--faceplate-width) * 0.04);
}

.brick-lane-main-controls {
  display: grid;
  gap: calc(var(--faceplate-width) * 0.045);
}

.brick-lane-right-controls {
  display: grid;
  gap: calc(var(--faceplate-width) * 0.03);
  padding-top: calc(var(--faceplate-width) * 0.18);
}

.brick-lane-physical-knob {
  position: relative;
}

.brick-lane-physical-label {
  display: flex;
  align-items: baseline;
  gap: 0.25em;
  margin-bottom: calc(var(--faceplate-width) * 0.012);
  color: var(--faceplate-print);
  font-size: calc(var(--faceplate-width) * 0.052);
  font-weight: 900;
  line-height: 0.92;
  letter-spacing: 0;
}

.brick-lane-physical-label small {
  font-size: 0.72em;
  font-weight: 800;
}

.brick-lane-main-knob .brick-lane-big-knob {
  width: calc(var(--faceplate-width) * 0.36);
  height: calc(var(--faceplate-width) * 0.36);
}

.brick-lane-stress-knob .brick-lane-big-knob {
  width: calc(var(--faceplate-width) * 0.28);
  height: calc(var(--faceplate-width) * 0.28);
}

.brick-lane-scale-row {
  max-width: calc(var(--faceplate-width) * 0.38);
  margin-top: -2px;
  color: var(--faceplate-print);
  font-size: calc(var(--faceplate-width) * 0.04);
  font-weight: 900;
  letter-spacing: 0;
}

.brick-lane-knob-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  color: var(--faceplate-print);
  font-size: calc(var(--faceplate-width) * 0.04);
  font-weight: 900;
}

.brick-lane-meter-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: calc(var(--faceplate-width) * 0.035);
  align-items: start;
}

.brick-lane-physical-meter {
  display: grid;
  grid-template-columns: minmax(16px, 0.55fr) minmax(22px, 1fr);
  gap: 3px;
  align-items: start;
}

.brick-lane-meter-scale,
.brick-lane-meter-leds {
  display: grid;
  grid-auto-rows: calc(var(--faceplate-width) * 0.032);
  gap: calc(var(--faceplate-width) * 0.012);
}

.brick-lane-meter-scale span {
  color: #c8ced8;
  font-size: calc(var(--faceplate-width) * 0.032);
  font-weight: 800;
  line-height: 1;
  text-align: right;
}

.brick-lane-meter-led {
  width: 100%;
  border-radius: 2px;
  background: #25282e;
  box-shadow: inset 0 1px 1px rgba(0,0,0,0.7);
}

.brick-lane-meter-led.is-on {
  background: var(--brick-lane-led);
  box-shadow: 0 0 9px var(--brick-lane-led), inset 0 1px rgba(255,255,255,0.35);
}

.brick-lane-physical-meter strong {
  grid-column: 2;
  justify-self: center;
  padding: 1px 4px;
  border-radius: 2px;
  background: var(--brick-lane-led);
  color: #061014;
  font-size: calc(var(--faceplate-width) * 0.026);
  font-weight: 900;
  line-height: 1;
}

.brick-lane-physical-modes {
  display: grid;
  gap: calc(var(--faceplate-width) * 0.012);
  margin-left: calc(var(--faceplate-width) * 0.025);
}

.brick-lane-physical-mode {
  display: grid;
  grid-template-columns: calc(var(--faceplate-width) * 0.04) 1fr;
  gap: calc(var(--faceplate-width) * 0.018);
  align-items: center;
  color: var(--faceplate-print);
  font-size: calc(var(--faceplate-width) * 0.034);
  font-weight: 900;
  line-height: 1;
}

.brick-lane-physical-mode i {
  width: calc(var(--faceplate-width) * 0.035);
  aspect-ratio: 1;
  border-radius: 50%;
  background: #4f555f;
}

.brick-lane-physical-mode.is-active i {
  background: #5ee7ff;
  box-shadow: 0 0 10px #5ee7ff;
}

.brick-lane-lower-hardware {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: calc(var(--faceplate-width) * 0.035);
  align-items: start;
}

.brick-lane-lower-hardware strong {
  color: var(--faceplate-print);
  font-size: calc(var(--faceplate-width) * 0.035);
  font-weight: 900;
}

.brick-lane-frequency-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  margin-top: 3px;
}

.brick-lane-frequency-row span {
  color: var(--faceplate-print);
  font-size: calc(var(--faceplate-width) * 0.025);
  text-align: center;
}

.brick-lane-frequency-row span::before {
  content: "";
  display: block;
  width: calc(var(--faceplate-width) * 0.03);
  aspect-ratio: 1;
  margin: 0 auto 2px;
  border-radius: 50%;
  background: #5b6068;
}

.brick-lane-frequency-row span.is-active::before {
  background: #5ee7ff;
  box-shadow: 0 0 8px #5ee7ff;
}

.brick-lane-jack {
  display: block;
  width: calc(var(--faceplate-width) * 0.105);
  aspect-ratio: 1;
  margin: 3px auto;
  border-radius: 50%;
  background: radial-gradient(circle, #111 0 35%, #9ba3ad 38% 54%, #111 58%);
}

.brick-lane-switch-post {
  display: block;
  width: calc(var(--faceplate-width) * 0.025);
  height: calc(var(--faceplate-width) * 0.16);
  margin: 0 auto;
  border-radius: 999px;
  background: #d8dce3;
  box-shadow: 0 0 0 3px #30343a;
}

.brick-lane-footer-brand {
  margin-top: calc(var(--faceplate-width) * 0.02);
  color: var(--faceplate-print);
  font-size: calc(var(--faceplate-width) * 0.048);
  font-weight: 900;
  letter-spacing: 0.03em;
  text-align: center;
}
```

- [ ] **Step 3: Keep Enigma ladder card CSS separate**

Ensure these selectors still target recall cards and print views, not the physical faceplate:

```css
.brick-lane-parameter-card .brick-lane-led-ladder
.brick-lane-print-parameters .brick-lane-led-ladder
.brick-lane-led-housing
.brick-lane-rung
.brick-lane-led-label
```

Expected: physical meters use `.brick-lane-physical-meter`; Enigma recall cards use `.brick-lane-led-ladder`.

- [ ] **Step 4: Run syntax checks**

Run:

```bash
npm run check:js
git diff --check
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add style.css
git commit -m "style: match Brick Lane 500 module proportions"
```

## Task 5: Add Visual Regression Smoke Tests

**Files:**
- Create: `test/brick-lane-visual-regression.test.js`
- Modify: `package.json`

- [ ] **Step 1: Add Playwright visual anatomy test**

Create `test/brick-lane-visual-regression.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright");

function startServer() {
  const child = spawn(process.execPath, [
    "-e",
    "require('http').createServer((req,res)=>{const fs=require('fs');const path=require('path');const file=req.url.split('?')[0] === '/' ? '/studio-tools.html' : req.url.split('?')[0];const full=path.join(process.cwd(), file);fs.readFile(full,(err,data)=>{if(err){res.statusCode=404;res.end('not found');return;}res.end(data);});}).listen(4174)",
  ], { cwd: process.cwd(), stdio: "ignore" });
  return child;
}

test("Brick Lane hardware keeps tall 500-series proportions", async () => {
  const server = startServer();
  try {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
    await page.goto("http://127.0.0.1:4174/studio-tools.html#brick-lane-sonic-lab", { waitUntil: "networkidle" });

    const hardware = await page.locator(".brick-lane-hardware").boundingBox();
    const mainKnobs = await page.locator(".brick-lane-main-knob").count();
    const stressKnobs = await page.locator(".brick-lane-stress-knob").count();
    const selectsInHardware = await page.locator(".brick-lane-hardware select").count();
    const meters = await page.locator(".brick-lane-physical-meter").count();

    assert.ok(hardware, "hardware faceplate should render");
    assert.ok(hardware.height / hardware.width > 3.0, `expected tall module ratio, got ${hardware.height / hardware.width}`);
    assert.equal(mainKnobs, 5);
    assert.equal(stressKnobs, 1);
    assert.equal(meters, 2);
    assert.equal(selectsInHardware, 0);

    await browser.close();
  } finally {
    server.kill();
  }
});
```

- [ ] **Step 2: Add a focused script**

In `package.json`, add:

```json
"test:brick-lane-visual": "node --test test/brick-lane-visual-regression.test.js"
```

Keep the existing scripts unchanged except for the new key.

- [ ] **Step 3: Run failing or passing focused test**

Run:

```bash
npm run test:brick-lane-visual
```

Expected after Tasks 3 and 4: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add package.json test/brick-lane-visual-regression.test.js
git commit -m "test: add Brick Lane faceplate visual anatomy smoke test"
```

## Task 6: Clean the Tool Layout Around the Accurate Faceplate

**Files:**
- Modify: `studio-tools.html`
- Modify: `style.css`
- Modify: `brick-lane-lab.js`

- [ ] **Step 1: Keep the physical faceplate visually dominant**

In `style.css`, update the desktop grid so the center column fits the tall module and avoids crowding:

```css
.brick-lane-grid {
  grid-template-columns: minmax(210px, 0.7fr) minmax(310px, 0.9fr) minmax(420px, 1.35fr);
  align-items: start;
}

.brick-lane-faceplate {
  display: flex;
  flex-direction: column;
  align-items: center;
}
```

- [ ] **Step 2: Move signal generator out of the physical column if it still crowds the module**

If `brick-lane-lab.js` currently appends the signal generator to the source browser or inside the faceplate, keep it under the source/context panel only:

```js
if (nodes.context && !document.getElementById("brick-lane-sim")) {
  nodes.context.insertAdjacentHTML("afterend", renderSignalGeneratorControls());
}
```

Do not append signal generator markup inside `#brick-lane-faceplate`.

- [ ] **Step 3: Mobile faceplate sizing**

In the mobile media block, keep the hardware width stable and prevent cropped text:

```css
@media (max-width: 760px) {
  .brick-lane-hardware {
    --faceplate-width: min(82vw, 315px);
  }

  .brick-lane-grid {
    grid-template-columns: 1fr;
  }

  .brick-lane-faceplate {
    overflow: visible;
  }
}
```

- [ ] **Step 4: Run focused checks**

Run:

```bash
node --test test/brick-lane-lab-render.test.js
npm run test:brick-lane-visual
npm run check:js
git diff --check
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add studio-tools.html style.css brick-lane-lab.js
git commit -m "refactor: separate Brick Lane hardware from tool controls"
```

## Task 7: Browser QA and Screenshot Ledger

**Files:**
- Create: `docs/brick-lane-visual-qa.md`

- [ ] **Step 1: Start local server**

Run:

```bash
python3 -m http.server 4173
```

Expected: server available at `http://127.0.0.1:4173/`.

- [ ] **Step 2: Capture screenshots**

In a second terminal, run:

```bash
node - <<'NODE'
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 });
  await desktop.goto('http://127.0.0.1:4173/studio-tools.html#brick-lane-sonic-lab', { waitUntil: 'networkidle' });
  await desktop.screenshot({ path: 'docs/brick-lane-qa-desktop.png', fullPage: true });
  const mobile = await browser.newPage({ viewport: { width: 390, height: 1200 }, deviceScaleFactor: 1 });
  await mobile.goto('http://127.0.0.1:4173/studio-tools.html#brick-lane-sonic-lab', { waitUntil: 'networkidle' });
  await mobile.screenshot({ path: 'docs/brick-lane-qa-mobile.png', fullPage: true });
  await browser.close();
})();
NODE
```

Expected: screenshots written to `docs/brick-lane-qa-desktop.png` and `docs/brick-lane-qa-mobile.png`.

- [ ] **Step 3: Write QA ledger**

Create `docs/brick-lane-visual-qa.md`:

```markdown
# Brick Lane Visual QA

Date: 2026-05-25

## Screenshots

- Desktop: `docs/brick-lane-qa-desktop.png`
- Mobile: `docs/brick-lane-qa-mobile.png`

## Reference Comparison

- Official front image: https://www.cranborne-audio.com/hubfs/Brick%20Lane%20500%20Front%20JPEG%20Trimmed.jpeg

## Checked Points

- Tall 500-series module ratio is preserved.
- Five large left-column knobs render in physical order: Input, Threshold, Attack, Release, Output.
- Smaller Stress knob renders to the right below the SIG/GR meter pair.
- SIG and GR meters render as two physical meter stacks with correct scale families.
- Mode LEDs render in order: Velvet, Float, Smash, Tame, Glue, Polish.
- SCF, Mode, Optosync, and IN lower-right regions are present.
- No dropdown, tab, generated-preset copy, or signal-generator canvas appears inside the hardware faceplate.
- Recall panel translates hardware mode names into compressor families: Velvet/Vari-Mu, Float/Optical, Smash/FET, Tame/Clean-Transparent, Glue/VCA, Polish/Limiter-Clipper.
- Recall guidance explains the hardware `STRESS` control as `Saturation`.
- Mobile screenshot keeps labels readable and faceplate uncropped.

## Remaining Deviations

- Shipped faceplate is code-drawn, not the official Cranborne photo, to avoid shipping product imagery without explicit permission.
- Internal Enigma rung behavior remains a data verification task against the official guide.
```

- [ ] **Step 4: Stop local server**

Stop the `python3 -m http.server 4173` process with `Ctrl-C`.

- [ ] **Step 5: Commit**

Run:

```bash
git add docs/brick-lane-visual-qa.md docs/brick-lane-qa-desktop.png docs/brick-lane-qa-mobile.png
git commit -m "docs: record Brick Lane visual QA"
```

## Task 8: Final Verification

**Files:**
- No new files expected unless verification exposes issues.

- [ ] **Step 1: Run full local checks**

Run:

```bash
npm test
npm run check:js
npm run test:brick-lane-visual
git diff --check
```

Expected: PASS.

- [ ] **Step 2: Inspect worktree**

Run:

```bash
git status --short
```

Expected: clean except for intentionally untracked files the user already had before this plan. Do not add unrelated files such as `2026-05-22-next-agent-live-logic-redirection-handoff.md`.

- [ ] **Step 3: Final visual acceptance checklist**

Open `docs/brick-lane-qa-desktop.png`, `docs/brick-lane-qa-mobile.png`, and the official front image side by side. Confirm:

```text
[ ] Overall module reads as a Brick Lane 500, not a generic plugin.
[ ] Width/height proportions are close to the official front photo.
[ ] Control count and order match the unit.
[ ] Meter count, labels, and scale families match the unit.
[ ] Lower-right SCF/MODE/optosync/IN anatomy is present.
[ ] Enigma recall details are still available in the right panel.
[ ] Mode names include plain-language compressor families.
[ ] STRESS is preserved on the hardware faceplate but explained as Saturation in guidance.
[ ] Parameter cards include hardware labels, plain labels, and meanings.
[ ] No UI-only controls are embedded in the hardware faceplate.
[ ] Mobile layout remains usable and text does not overlap.
```

- [ ] **Step 4: Commit any QA fixes**

If any visual fix is needed, make the smallest CSS/JS change, rerun:

```bash
npm test
npm run check:js
npm run test:brick-lane-visual
git diff --check
```

Then commit:

```bash
git add brick-lane-data.js brick-lane-lab.js style.css test/brick-lane-data.test.js test/brick-lane-lab-render.test.js test/brick-lane-visual-regression.test.js docs/brick-lane-reference-audit.md docs/brick-lane-visual-qa.md docs/brick-lane-qa-desktop.png docs/brick-lane-qa-mobile.png
git commit -m "fix: polish Brick Lane hardware visual accuracy"
```

## Self-Review

- Spec coverage: The plan addresses the user's core issue: visuals must be accurate to the physical unit and useful for navigating the Enigma menu. It preserves the existing generator and recall panel while rebuilding the inaccurate center faceplate and adding plain-language mode/saturation guidance.
- Placeholder scan: No `TBD`, `TODO`, or undefined future work is required for the planned implementation steps.
- Type consistency: `FRONT_PANEL_REFERENCE`, `ENIGMA_DEMYSTIFIER`, `renderHardwareFaceplate`, and the class names used by tests match the implementation snippets.
- Risk: The plan does not attempt to verify every Enigma internal rung behavior from the manual. It does add the required user-facing glossary layer now, while keeping deeper rung verification as data-only follow-up work.
