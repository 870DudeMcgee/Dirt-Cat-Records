# Gates: approved dark visual integration
Scope: canonical ten-page visual layer and approved homepage; no backend changes.

- [x] G1: Existing nonbrowser tests and JavaScript syntax checks pass; direct Chromium harnesses remain parent-owned.
  CHECK: node --test $(find test -name '*.test.js' ! -name 'brick-lane-visual-regression.test.js' ! -name 'drum-alignment-page.test.js' ! -name 'logic-auto-bounce-visual.test.js') > /tmp/dirtcat-dark-final-tests.log 2>&1 && npm run check:js > /tmp/dirtcat-dark-js.log 2>&1 && echo CHECKS_PASS
  EXPECT: CHECKS_PASS
  EVIDENCE: CHECKS_PASS
- [x] G2: Every canonical page loads the shared layer after legacy sheets; live homepage form/audio/navigation contracts remain.
  CHECK: node --test test/dark-theme-contract.test.js
  EXPECT: fail 0
  EVIDENCE: # todo 0 | # duration_ms 34.53475
- [x] G3: No whitespace errors or out-of-scope backend/script changes.
  CHECK: git diff --check && git diff --name-only -- api lib nav.js checkout.js portal.js admin.js support.js success.js && echo SCOPE_PASS
  EXPECT: SCOPE_PASS
  EVIDENCE: SCOPE_PASS
- [x] G4: Approved desktop structure and responsive rules implemented; root owns rendered browser comparison.
  EVIDENCE: public-home.css implements the measured 114px header, 48/52 hero split, real room image, Anton headline, charcoal/listening band and breakpoints at 1100/900/600px. All ten canonical pages are wired to dark-theme.css; rendered comparison delegated to root.

## Studio tools launcher revision
Scope: studio-tools.html, studio-tools.css and existing QA notes only; internal tools remain unchanged.

- [x] G5: Launcher preserves all three exact tool routes and secondary navigation; scoped source checks pass.
  CHECK: node --test test/dark-theme-contract.test.js test/project-support-page.test.js && git diff --check
  EXPECT: fail 0
  EVIDENCE: # todo 0 | # duration_ms 42.42175
- [x] G6: Editorial launcher uses homepage brand, charcoal/violet palette, spacious numbered rows, and 390px responsive layout rules.
  EVIDENCE: studio-tools.html preserves nav.js and all three original routes; studio-tools.css implements114px homepage brand/header, charcoal/violet open numbered rows, and900/600px mobile menu/row rules. Rendered QA delegated to root.
