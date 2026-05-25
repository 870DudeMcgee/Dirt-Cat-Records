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
