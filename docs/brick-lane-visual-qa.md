# Brick Lane Visual QA

Date: 2026-05-25

## Screenshots

- Desktop: [brick-lane-qa-desktop.png](brick-lane-qa-desktop.png)
- Mobile: [brick-lane-qa-mobile.png](brick-lane-qa-mobile.png)

## Reference Comparison

- Official front image: https://www.cranborne-audio.com/hubfs/Brick%20Lane%20500%20Front%20JPEG%20Trimmed.jpeg

## Checked Points

- Tall 500-series module ratio is preserved.
- Top and bottom gray rack ears include centered screw holes.
- Five large left-column knobs render in physical order: Input, Threshold, Attack, Release, Output.
- Smaller Stress knob renders to the right below the SIG/GR meter pair.
- SIG and GR meters render as two physical meter stacks at the top-right, with exact LED label counts and scales.
- Mode LEDs render in order: Velvet, Float, Smash, Tame, Glue, Polish.
- SCF, MODE, optosync, and IN lower-right regions are present with physical casing preserved.
- No dropdown, tab, generated-preset copy, or signal-generator canvas appears inside the hardware faceplate.
- Recall panel translates hardware mode names into compressor families: Velvet/Vari-Mu, Float/Optical, Smash/FET, Tame/Clean-Transparent, Glue/VCA, Polish/Limiter-Clipper.
- Recall guidance explains the hardware `STRESS` control as `Saturation`.
- Mobile screenshot keeps labels readable and faceplate uncropped.

## Automated Coverage

- `test/brick-lane-visual-regression.test.js` checks desktop physical geometry: tall aspect ratio, five main knobs, one Stress knob, paired top-right SIG/GR meters, visible rack ears/screw hole, lower section labels, exact LED scale labels, and no UI-only controls inside the faceplate.
- The same test switches to a 390px mobile viewport and verifies the faceplate fits inside the viewport and knob labels remain inside the clipped faceplate core.
- Render/data tests continue to guard `FRONT_PANEL_REFERENCE` anatomy and faceplate markup.

## Remaining Deviations

- Shipped faceplate is code-drawn, not the official Cranborne photo, to avoid shipping product imagery without explicit permission.
- Internal Enigma rung behavior remains a data verification task against the official guide.

## Manual Accuracy Follow-Up

- Detector Mode Selection now renders valid detector settings with LED patterns rather than twelve invented rung names.
- Recall panel text is driven by canonical Brick Lane data and resolver output.
- Front-panel hardware remains SIG/GR-only and does not show Enigma parameter monitors as physical meters.
