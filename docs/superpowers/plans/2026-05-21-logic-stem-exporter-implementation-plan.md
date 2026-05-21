# Logic Stem Exporter Implementation Plan

> **For agentic workers:** REQUIRED PROCESS SKILLS: use `using-superpowers` before starting implementation, then use `executing-plans` while executing this plan. Keep one task in progress at a time. This plan is for a future separate desktop-app repository, not for the active Dirt Cat Records Stage 7 launch-hardening slice.

**Goal:** build a separate macOS desktop app that exports Logic Pro stems through iterative solo plus master-bus bounce, packages the results predictably, and later uploads them to Google Drive, while keeping the architecture open for future DAW drivers.

**Target repository:** `/Users/jewelbait/Desktop/dirtcat-stem-exporter`

**Current web repo relationship:** this Dirt Cat Records repo only stores the planning artifact and future website integration pointers. Do not add the desktop app runtime, Electron build output, Python worker, or Google Drive desktop OAuth code to this web repo.

**Design source:** `docs/superpowers/specs/2026-05-21-logic-stem-exporter-deep-modules.md`

---

## Scope

### In Scope For V1

- Native Apple Silicon macOS beta first.
- Logic Pro 11+ and macOS 14 Sonoma+ as the initial support floor.
- Electron + React/TypeScript desktop shell.
- Python/PyObjC `LogicDriver` worker for macOS Accessibility automation.
- DAW-neutral contracts: `DAWDriver`, `DriverCapabilities`, `ProjectGraph`, `StemRecipe`, `ExportPlan`, `ExportManifest`, `SessionReadiness`, and `DiagnosticBundle`.
- Iterative solo plus standard master-bus bounce.
- Required Dirt Cat Exporter Logic Screen Set and session hygiene checks.
- Selector registry, redacted AX snapshots, polling-based waits, deterministic save-dialog paths, and diagnostic bundles.
- Manual Assist Mode as a first-class fallback.
- Local package output even when upload fails.
- Google Drive resumable uploads with retry/backoff and user-visible progress after local export is proven.

### Out Of Scope For V1

- Ableton, Pro Tools, Studio One, Cubase/Nuendo, FL Studio, or a generic plugin system.
- Full `.logicx` parsing.
- Automated sidechain rerouting or MIDI Bounce in Place before Mutation Safety is proven.
- Cloud-only exports.
- Paid Pro activation before beta export reliability is proven.
- Dirt Cat website download funnel changes before Stage 7 launch-hardening is closed.

---

## Acceptance Criteria

- The first checkpoint exports 1-2 stems from one Screen Set-ready Logic fixture with AX polling, save-dialog injection, file-ready detection, manifest output, and diagnostic failure output.
- The second checkpoint exports 8-10 stems from one Screen Set-ready fixture using iterative master bounce.
- The Python worker is shaped as `LogicDriver`, the first `DAWDriver` implementation, not as the permanent owner of all export policy.
- The TypeScript/Electron side becomes the long-term owner of orchestration, file watching, package assembly, Drive OAuth/upload orchestration, secure token storage, IPC supervision, and app updates.
- Shared JSON schemas validate the TypeScript and Python contract in both runtimes.
- No arbitrary fixed sleeps drive Logic. Short settle intervals are allowed only inside polling loops that wait on specific AX element existence, state, and readiness.
- Cross-architecture execution is blocked before AX traversal. Do not let x86/Rosetta Python automate native ARM64 Logic.
- Every automated mutation has an explicit safety posture: no mutation, reversible mutation, destructive mutation requiring consent, or Manual Assist.
- Local export success is independent from Google Drive upload success.
- The future multi-DAW path is protected by DAW-neutral names and driver capabilities, without implementing non-Logic drivers in V1.

---

## Proposed Repository Structure

Create this structure in `/Users/jewelbait/Desktop/dirtcat-stem-exporter` during Task 0:

```text
dirtcat-stem-exporter/
  README.md
  SPEC.md
  ARCHITECTURE.md
  package.json
  tsconfig.json
  contracts/
    schemas/
      daw-driver.schema.json
      driver-capabilities.schema.json
      project-graph.schema.json
      stem-recipe.schema.json
      export-plan.schema.json
      export-manifest.schema.json
      session-readiness.schema.json
      diagnostic-bundle.schema.json
    fixtures/
      minimal-project-graph.json
      one-stem-export-plan.json
  apps/
    desktop/
      package.json
      src/
        main/
        renderer/
        preload/
  packages/
    core/
      src/
        contracts/
        export-engine/
        package-manifest/
        mutation-safety/
        drive-upload/
  workers/
    logic-driver/
      pyproject.toml
      README.md
      src/logic_driver/
        __init__.py
        cli.py
        contracts.py
        readiness.py
        selector_registry.py
        ax_snapshot.py
        bounce.py
        diagnostics.py
      tests/
  fixtures/
    logic/
      README.md
  docs/
    session-hygiene.md
    packaging-spike.md
    beta-test-plan.md
    troubleshooting.md
```

---

## Execution Rules

- Start every implementation session by checking `git status -sb` in both repositories.
- Keep the desktop app in `dirtcat-stem-exporter`; only update this web repo when adding documentation links or a future website download funnel.
- Keep one task active at a time.
- Log task completion in the desktop repo once that repo exists.
- Do not implement Ableton or other DAW drivers during V1. Add only contracts, capability checks, and naming that keep that path open.
- Do not let temporary CLI behavior become permanent architecture. Each task that adds temporary Python ownership must include the later TypeScript/Electron migration target.

---

## Task 0: Create The Separate Repo Boundary

**Files in `/Users/jewelbait/Desktop/dirtcat-stem-exporter`:**

- Add: `README.md`, `SPEC.md`, `ARCHITECTURE.md`, `package.json`, `tsconfig.json`, `.gitignore`
- Add directories: `contracts/`, `apps/desktop/`, `packages/core/`, `workers/logic-driver/`, `fixtures/logic/`, `docs/`

- [ ] Create the separate repo folder and initialize git.
- [ ] Copy the V1-focused material from the brainstorm into `SPEC.md`.
- [ ] Copy the long-term modules, multi-DAW strategy, and contract strategy into `ARCHITECTURE.md`.
- [ ] Add `docs/session-hygiene.md` with the Dirt Cat Exporter Screen Set, visible track/AUX requirements, expanded stacks requirement, and plugin-window cleanup requirement.
- [ ] Add `docs/packaging-spike.md` with the comparison targets: `py2app`, embedded Python framework, and PyInstaller.
- [ ] Add root `package.json` scripts for TypeScript contract checks and desktop app development.

**Verification:**

```bash
git status -sb
npm install
npm run check:contracts
git diff --check
```

**Rollback:** delete the new folder before any remote is created, or archive it outside the Desktop if the repo shape is rejected.

---

## Task 1: Define DAW-Neutral Contracts Before Automation

**Files in `/Users/jewelbait/Desktop/dirtcat-stem-exporter`:**

- Add: `contracts/schemas/*.schema.json`
- Add: `contracts/fixtures/minimal-project-graph.json`
- Add: `contracts/fixtures/one-stem-export-plan.json`
- Add: `packages/core/src/contracts/`
- Add: `workers/logic-driver/src/logic_driver/contracts.py`

- [ ] Define `DAWDriver`, `DriverCapabilities`, `ProjectGraph`, `StemRecipe`, `ExportPlan`, `ExportManifest`, `SessionReadiness`, and `DiagnosticBundle` schemas.
- [ ] Model `ProjectGraph` with a DAW-neutral core and namespaced driver extensions such as `extensions.logic`.
- [ ] Add `DriverCapabilities` fields for selected-track discovery, routing graph discovery, bounce execution, MIDI printing, sidechain detection, mutation rollback, and manual-assist-only behavior.
- [ ] Generate or hand-write TypeScript types in `packages/core/src/contracts/`.
- [ ] Add Pydantic models in `workers/logic-driver/src/logic_driver/contracts.py`.
- [ ] Add contract tests that load the same fixture JSON in TypeScript and Python.

**Verification:**

```bash
npm run test:contracts
cd workers/logic-driver && python -m pytest tests/test_contracts.py
git diff --check
```

**Rollback:** remove the generated types/models and keep the JSON schemas as the single source of truth until the contract surface is stable.

---

## Task 2: Build Phase 0 Readiness And Packaging Spikes

**Files in `/Users/jewelbait/Desktop/dirtcat-stem-exporter`:**

- Add: `workers/logic-driver/src/logic_driver/readiness.py`
- Add: `workers/logic-driver/tests/test_readiness.py`
- Update: `docs/packaging-spike.md`

- [ ] Detect macOS version, CPU architecture, Python architecture, Logic process architecture, Logic version, Accessibility permission, and Automation permission.
- [ ] Block Rosetta/x86 Python controlling native ARM64 Logic before AX traversal.
- [ ] Write the first `SessionReadiness` report using the DAW-neutral schema.
- [ ] Spike `py2app`, embedded Python framework, and PyInstaller with a minimal PyObjC import and document signing/notarization risks.
- [ ] Choose the beta packaging path only after the spike records evidence.

**Verification:**

```bash
cd workers/logic-driver && python -m pytest tests/test_readiness.py
python -m logic_driver.cli readiness --json
git diff --check
```

**Rollback:** keep the readiness report and defer packaging selection if none of the three packaging paths is clean enough.

---

## Task 3: Build Selector Registry And AX Snapshot Foundation

**Files in `/Users/jewelbait/Desktop/dirtcat-stem-exporter`:**

- Add: `workers/logic-driver/src/logic_driver/selector_registry.py`
- Add: `workers/logic-driver/src/logic_driver/ax_snapshot.py`
- Add: `workers/logic-driver/tests/test_selector_registry.py`
- Add: `fixtures/logic/README.md`

- [ ] Create a selector registry where every Logic UI operation names its selector intent, primary match rule, fallback chain, expected role/value/state, and diagnostic snapshot path.
- [ ] Add redacted AX snapshot capture for the open Logic window.
- [ ] Add polling helpers that wait for expected AX elements, enabled states, values, and idle conditions.
- [ ] Prohibit arbitrary fixed sleeps outside polling helpers.
- [ ] Store sample redacted snapshots from the fixture Screen Set.

**Verification:**

```bash
cd workers/logic-driver && python -m pytest tests/test_selector_registry.py
python -m logic_driver.cli snapshot --redacted --out diagnostics/sample-ax-snapshot.json
git diff --check
```

**Rollback:** keep the registry data format, but disable any selector intent that cannot be verified against a redacted snapshot.

---

## Task 4: Implement LogicDriver Session Readiness And Track Discovery

**Files in `/Users/jewelbait/Desktop/dirtcat-stem-exporter`:**

- Add: `workers/logic-driver/src/logic_driver/project_discovery.py`
- Update: `workers/logic-driver/src/logic_driver/readiness.py`
- Add tests: `workers/logic-driver/tests/test_project_discovery.py`

- [ ] Detect whether Logic is open and frontmost enough for automation.
- [ ] Validate the Dirt Cat Exporter Screen Set or return a clear readiness blocker.
- [ ] Expand visible Track Stacks and Folder Stacks where the AX tree allows it.
- [ ] Discover selected tracks and basic track labels into `ProjectGraph`.
- [ ] Preserve Logic-specific details under `ProjectGraph.extensions.logic`.
- [ ] Emit `SessionReadiness` and `ProjectGraph` JSON from the CLI.

**Verification:**

```bash
cd workers/logic-driver && python -m pytest tests/test_project_discovery.py
python -m logic_driver.cli readiness --json
python -m logic_driver.cli discover-project --out diagnostics/project-graph.json
git diff --check
```

**Rollback:** fall back to Manual Assist selected-track entry if AX selected-track discovery is unreliable.

---

## Task 5: Export 1-2 Fixture Stems Reliably

**Files in `/Users/jewelbait/Desktop/dirtcat-stem-exporter`:**

- Add: `workers/logic-driver/src/logic_driver/bounce.py`
- Add: `workers/logic-driver/src/logic_driver/diagnostics.py`
- Add: `workers/logic-driver/tests/test_manifest_writer.py`
- Add: `contracts/fixtures/one-stem-export-plan.json`

- [ ] Compile or load one manual `ExportPlan` for 1-2 selected tracks.
- [ ] Use iterative solo plus standard master-bus bounce.
- [ ] Inject deterministic save-dialog paths through AX polling.
- [ ] Detect file-ready completion without relying on upload or Electron.
- [ ] Write `ExportManifest` with rendered file names, original Logic track labels, file sizes, and checksums.
- [ ] On failure, write a diagnostic bundle with logs, selector history, and redacted AX snapshot.

**Verification:**

```bash
cd workers/logic-driver && python -m pytest tests/test_manifest_writer.py
python -m logic_driver.cli run-export --plan ../../contracts/fixtures/one-stem-export-plan.json --out ~/Music/DirtCatStemExporter/test-run-001
git diff --check
```

**Rollback:** disable automated bounce and keep the plan runnable in Manual Assist Mode with deterministic paths and manifest writing.

---

## Task 6: Expand To 8-10 Fixture Stems

**Files in `/Users/jewelbait/Desktop/dirtcat-stem-exporter`:**

- Add: `contracts/fixtures/basic-mix-prep-export-plan.json`
- Update: `workers/logic-driver/src/logic_driver/bounce.py`
- Update: `workers/logic-driver/src/logic_driver/diagnostics.py`
- Add: `docs/beta-test-plan.md`

- [ ] Expand the fixture plan to 8-10 stems using iterative master bounce.
- [ ] Add resumable run checkpoints so a failed bounce can report exactly which stem failed.
- [ ] Add collision-safe naming with deterministic incremental suffixes.
- [ ] Keep smart sidechain automation and MIDI Bounce in Place disabled.
- [ ] Record fixture evidence for a successful run and a deliberately failed run.

**Verification:**

```bash
cd workers/logic-driver && python -m pytest
python -m logic_driver.cli run-export --plan ../../contracts/fixtures/basic-mix-prep-export-plan.json --out ~/Music/DirtCatStemExporter/test-run-002
git diff --check
```

**Rollback:** return to the 1-2 stem checkpoint and mark the unreliable selector or bounce step as Manual Assist only.

---

## Task 7: Move DAW-Neutral Policy Into TypeScript Core

**Files in `/Users/jewelbait/Desktop/dirtcat-stem-exporter`:**

- Add: `packages/core/src/export-engine/`
- Add: `packages/core/src/package-manifest/`
- Add: `packages/core/src/mutation-safety/`
- Add tests: `packages/core/src/**/*.test.ts`
- Update: `workers/logic-driver/src/logic_driver/cli.py`

- [ ] Move export recipe validation, plan validation, naming policy, manifest validation, and Mutation Safety classification into TypeScript.
- [ ] Keep Python focused on `LogicDriver` execution: readiness, AX selectors, bounce commands, raw diagnostics.
- [ ] Make Python consume `ExportPlan` and emit `BounceEventStream` and `DiagnosticBundle`.
- [ ] Add contract tests proving Python and TypeScript still agree on schemas.
- [ ] Remove temporary Python ownership for any policy that now lives in `packages/core`.

**Verification:**

```bash
npm run test:core
npm run test:contracts
cd workers/logic-driver && python -m pytest
git diff --check
```

**Rollback:** keep the CLI harness working with the old Python policy while restoring the last passing TypeScript contract test state.

---

## Task 8: Scaffold Electron After Harness Proof

**Files in `/Users/jewelbait/Desktop/dirtcat-stem-exporter`:**

- Add: `apps/desktop/src/main/`
- Add: `apps/desktop/src/preload/`
- Add: `apps/desktop/src/renderer/`
- Add: `apps/desktop/package.json`

- [ ] Build the Electron main process around the proven worker protocol.
- [ ] Add React onboarding screens for permissions, Screen Set readiness, project discovery, basic preset selection, progress, logs, and final package links.
- [ ] Add IPC supervision for starting, cancelling, and collecting diagnostics from the Python `LogicDriver`.
- [ ] Keep renderer UI display-oriented; do not put export policy in React components.
- [ ] Add secure local storage for non-secret preferences first; defer Google OAuth tokens until Task 9.

**Verification:**

```bash
npm run test:desktop
npm run dev:desktop
npm run check:types
git diff --check
```

**Rollback:** keep the Python harness as the beta test surface while the Electron shell is repaired.

---

## Task 9: Add Package Assembly And Google Drive Upload

**Files in `/Users/jewelbait/Desktop/dirtcat-stem-exporter`:**

- Add: `packages/core/src/drive-upload/`
- Add: `apps/desktop/src/main/drive/`
- Add tests: `packages/core/src/drive-upload/*.test.ts`

- [ ] Assemble local export packages from `ExportManifest` without requiring upload.
- [ ] Add Google Drive OAuth in Electron main, not in Python.
- [ ] Use official Google Drive resumable uploads.
- [ ] Add retry/backoff, upload manifests, user-visible progress, cancel/resume controls, and clear failure states for multi-GB packages.
- [ ] Keep direct-to-Dirt-Cat upload behind a beta flag until local package export is stable.

**Verification:**

```bash
npm run test:core -- --runInBand
npm run test:desktop
npm run check:types
git diff --check
```

**Rollback:** disable Drive upload and preserve local package output plus manual upload instructions.

---

## Task 10: Beta Onboarding, Manual Assist, And Support Bundles

**Files in `/Users/jewelbait/Desktop/dirtcat-stem-exporter`:**

- Add: `apps/desktop/src/renderer/onboarding/`
- Add: `apps/desktop/src/renderer/manual-assist/`
- Add: `apps/desktop/src/main/diagnostics/`
- Update: `docs/beta-test-plan.md`, `docs/troubleshooting.md`, `docs/session-hygiene.md`

- [ ] Add Manual Assist Mode for readiness blockers, missing selectors, uncertain mutations, and failed bounce automation.
- [ ] Add privacy-safe support bundle export with logs, redacted AX snapshots, contract payloads, and app/Logic/macOS version fingerprints.
- [ ] Add beta onboarding copy for Accessibility permissions, Logic Screen Set, session hygiene, local export path, and Drive upload behavior.
- [ ] Add beta test checklist for clean Apple Silicon Mac install, first export, failed export, large local package, and interrupted upload.

**Verification:**

```bash
npm run test:desktop
npm run check:types
cd workers/logic-driver && python -m pytest
git diff --check
```

**Rollback:** ship the CLI harness to a tiny private tester group before widening desktop beta access.

---

## Task 11: Prepare Dirt Cat Website Integration Only After Beta Proof

**Files in `/Users/jewelbait/Desktop/DirtCatRecords`:**

- Modify later only after approval: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`
- Possible future site files after Stage 7 closes: `index.html`, `style.css`, `nav.js`, a download/support page, and privacy/support docs

- [ ] Confirm Stage 7 launch hardening in the web repo is closed.
- [ ] Confirm the desktop beta can export local packages reliably on a clean Apple Silicon Mac.
- [ ] Add website copy only after the app has a signed/notarized beta artifact or an approved private beta distribution path.
- [ ] Keep the first public funnel free-first with email capture and clear Logic-only positioning.
- [ ] Add direct-to-Dirt-Cat upload copy only after Google Drive resumable uploads and notification behavior are stable.

**Verification:**

```bash
cd /Users/jewelbait/Desktop/DirtCatRecords
npm run deploy:preflight
git diff --check
```

**Rollback:** remove website download CTAs and keep the desktop app private if beta reliability or support load is not ready.

---

## Final Pre-Launch Gate

Run this only after Tasks 0-11 are complete and the desktop repo has a beta artifact.

```bash
cd /Users/jewelbait/Desktop/dirtcat-stem-exporter
npm run test:contracts
npm run test:core
npm run test:desktop
cd workers/logic-driver && python -m pytest
cd ../..
npm run build:desktop
git diff --check
```

Required manual proof:

- Clean Apple Silicon Mac install.
- Accessibility and Automation onboarding succeeds.
- Rosetta/cross-architecture mismatch is blocked before automation.
- 1-2 stem fixture export succeeds.
- 8-10 stem fixture export succeeds.
- Failed selector produces a redacted diagnostic bundle.
- Local package remains available when Drive upload is disabled or interrupted.
- Large Drive upload shows progress and can resume after interruption.

---

## Future Multi-DAW Expansion Gate

Do not start a second DAW driver until these are true:

- The Logic beta has multiple successful real-user exports.
- The support burden from Logic/macOS updates is understood.
- `ProjectGraph` and `DriverCapabilities` have survived at least one Logic selector repair without core-model churn.
- A customer-demand signal justifies the next DAW, with Ableton Live as the preferred V2 candidate.
- The second driver can implement the existing `DAWDriver` contract with extensions instead of renaming the core model.
