# Logic Stem Exporter Deep Modules Brainstorm

Date: 2026-05-21
Project: Dirt Cat Records Logic stem exporter desktop app
Status: Brainstormed direction with feasibility refinements before implementation planning

## Skill Routing

- Requested process skill: `brainstorming`
- Required workflow skill: `using-superpowers`
- Mapped implementation skill for the next step after approval: `writing-plans`

This document is intentionally a design/spec artifact, not an implementation plan. Once the module shape is approved, write a separate executable plan with file paths, tasks, tests, rollback notes, and verification commands.

## 2026-05-21 Refinement Summary

The current best-case direction changed after reviewing Logic Pro's real constraints and the user's comfort level with Rust.

- The app is technically possible, but Logic Pro has no stable internal API for this job. The automation path is macOS Accessibility control of Logic's UI.
- The core export method should be iterative solo plus standard master-bus bounce, not `Export All Tracks as Audio Files`. Iterative master bounce is the path that can preserve master processing, complex AUX routing, multi-output drums, and sidechain-dependent behavior.
- Full `.logicx` parsing is not a V1 path. Logic project packages include opaque binary project data; use Accessibility Inspector, `atomacos`, and PyObjC-driven UI discovery first, with user-assisted discovery where the UI tree is incomplete.
- The easiest developer stack for this project is now Electron + React/TypeScript + Python, not Tauri/Rust. Rust is elegant for file I/O but creates avoidable friction for this developer workflow. Python with PyObjC is the fastest route to macOS Accessibility automation.
- A specific Logic Screen Set and documented session hygiene prerequisites are part of V1, not optional polish.
- Sidechain rerouting and MIDI Bounce in Place need a Mutation Safety layer before they become automated features.
- The desktop app should live in a separate repository named `dirtcat-stem-exporter`, linked from this web repo when the download funnel is ready.
- Risk posture: Python harness first, separate repo, free-first launch, strong diagnostics, Mutation Safety, and a required Screen Set are green/low-risk choices. UI automation fragility, packaging/notarization, large uploads, and Apple Silicon architecture mismatches are the risks to attack first.
- Scope posture: the 16-module map is the long-term architecture map, not the V1 build shape. The first 7-10 weeks should aggressively collapse policy into a small Core Export Engine until the iterative master-bounce loop is proven end to end.
- Multi-DAW posture: V1 stays Logic-only, but the Core Export Engine, schemas, naming/package manifest, Drive sync, diagnostics, lead funnel, and Mutation Safety should stay DAW-agnostic enough for future drivers. Do not build Ableton, Pro Tools, or other DAW support before Logic proves the business value.

## Problem Statement

Logic Pro users lose time and consistency when exporting stems manually. The hard work is not just clicking Bounce repeatedly. A useful product has to understand track intent, preserve sidechain-dependent behavior, print MIDI instruments when needed, name files predictably, package outputs, upload them to Google Drive, and guide users through macOS permissions without turning the workflow into a support burden.

The product should also serve Dirt Cat Records as a premium lead generator: the free version solves a real studio problem, captures qualified emails, and makes sending files to Dirt Cat feel easier than manual prep.

## Goals

- Export pro-quality stems from Logic Pro with less manual setup.
- Make presets and custom stem recipes reliable enough for repeat use.
- Preserve musically important routing such as sidechains, AUX effects, MIDI instruments, multi-output instruments, reverb tails, and master processing choices.
- Produce deterministic folder structures and file names that are ready for remote mixing.
- Upload or hand off export packages to Google Drive.
- Build a trustworthy macOS desktop experience with clear permission onboarding, progress, logs, and recovery.
- Connect the app to dirtcatrecords.com as a free/freemium acquisition channel.

## Constraints

- Logic Pro does not expose a stable full automation API for this workflow, so the first risky seam is macOS Accessibility automation.
- macOS Accessibility, screen state, Logic version, language/localization, and user project layout can all change the automation surface.
- Electron increases package size, but it keeps the app in React/TypeScript and avoids Rust as a required skill. Packaging Python plus PyObjC still needs a dedicated packaging spike.
- Google Drive upload must not block the core export path; users need a local package even if upload fails.
- The existing Dirt Cat web repo is currently in Stage 7 launch hardening, so this app should stay a separate product track until the live provider workflow is closed.
- Multi-output MIDI drums and AUX-based routing require session hygiene: visible tracks/AUXes, expanded stacks, a known Logic Screen Set, and user confirmation before destructive temporary changes.
- Logic Pro 11+ and macOS 14 Sonoma+ are the recommended V1 support floor. If the beta needs more reach, reassess macOS 13 Ventura support separately.
- V1 beta should target native Apple Silicon first. Do not run the Python worker under Rosetta when controlling native ARM64 Logic Pro, because cross-architecture process inspection can drop or hide AXUIElement nodes.

## Non-Goals For V1

- Replacing Logic's audio engine.
- Full DAW session repair or mix validation.
- Supporting Ableton, Pro Tools, Studio One, or FL Studio in the first release.
- Abstracting every DAW behavior before the Logic harness proves the export loop.
- In-app audio editing, waveform editing, or mastering.
- Cloud-only exports with no local fallback.
- Team accounts, marketplace templates, or complex subscriptions in the MVP.

## Product Options Compared

### Option A: Python CLI First, Desktop Shell Second

Build a standalone Python automation harness first, then wrap it with a desktop shell once the core export loop is proven.

Pros:

- Directly attacks the riskiest seam first.
- Gives fast iteration on Logic UI traversal, bounce dialogs, file completion, sidechain strategies, and MIDI printing.
- Produces a reusable automation worker for the eventual app.
- Makes beta testing easier with verbose logs before polishing UX.

Cons:

- Less visually exciting early.
- Some product decisions will wait until the automation behavior is known.
- Packaging constraints are discovered later unless a thin packaging spike is included.

### Option B: Desktop App First With Stubbed Automation

Build the React desktop UI, onboarding, presets, licensing, and Drive flow first, then connect automation later.

Pros:

- Quickly clarifies product UX and brand direction.
- Easier to demo on the website.
- Useful for validating lead capture and Google Drive OAuth early.

Cons:

- Can create false confidence before Logic automation is proven.
- The UI may encode assumptions that the automation cannot reliably support.
- Highest-risk technical work is delayed.

### Option C: Manual Assist Mode First

Ship a guided checklist app that names folders, prompts the user through each bounce, watches files, and uploads the result.

Pros:

- Lowest automation risk.
- Good fallback mode even after full automation exists.
- Can launch earlier as a free utility.

Cons:

- Saves less time than the core vision.
- Less differentiated.
- Does not fully prove smart sidechain or MIDI printing automation.

### Option D: Deeper Logic Integration Research

Research whether plugin-style or Logic-specific extension points can avoid some UI automation.

Pros:

- Could feel more native if a viable integration point exists.
- May reduce some UI automation fragility.

Cons:

- Higher research uncertainty.
- Distribution, signing, and DAW compatibility become harder.
- Risks building around undocumented or constrained surfaces.

### Option E: Electron Plus Python Worker

Use Electron for the desktop shell, React/TypeScript for the UI, Node for app IPC/process supervision, file/package orchestration, and Google Drive upload, with Python/PyObjC focused on Logic automation and raw bounce execution.

Pros:

- Easiest stack for this developer workflow.
- Strong AI-assisted coding support for TypeScript and Python.
- PyObjC gives direct access to macOS Accessibility without Rust FFI friction.
- Electron packaging is well-trodden, and app size is acceptable for audio users.
- The Python worker can start as a CLI harness before any UI exists.

Cons:

- Larger app bundle than Tauri.
- Python packaging and notarization still require real release engineering.
- Electron must be disciplined so the app does not become a heavy, leaky desktop shell.

## Recommended Direction

Use Option A for sequencing, Option E for the app stack, and Option C as a deliberate fallback mode.

Start with a Python command-line proof harness that owns Logic discovery, stem planning, iterative solo/master-bus bounce automation, sidechain handling, MIDI printing, and completion detection. Keep the harness shaped like a future Electron worker protocol from day one. Add a small packaging spike during Phase 0 so PyObjC, embedded-Python choices, code signing, and notarization do not surprise the project later.

Once the harness can export a representative Logic project reliably, build the Electron/React app around the already-proven Python worker. Manual Assist Mode should remain available in the app because it gives users a recovery path when Logic, macOS permissions, or unusual sessions defeat automation.

## V1 Compression Rule

The deep-module list below names future ownership boundaries. Do not implement all of them as separate packages/classes/modules during the first prototype.

For the first working prototype, collapse the core into four practical components:

1. **LogicDriver Worker**: the first `DAWDriver` implementation, written in Python/PyObjC for AX traversal, Screen Set checks, selected-track discovery, solo/master-bounce execution, save-dialog entry, and low-level run diagnostics.
2. **Core Export Engine**: DAW-neutral export recipe, simple stem list, iterative bounce plan, Mutation Safety decisions, and run state. This can initially live in Python while the harness is CLI-only, then move policy that is not Logic-specific into TypeScript once Electron is introduced.
3. **Desktop Orchestrator**: Electron main process for IPC, process supervision, local file watching, package assembly, Drive OAuth/upload orchestration, secure token storage, and app updates.
4. **Renderer UI**: React screens for onboarding, setup checks, project metadata, basic presets, progress, logs, and final package links.

Do not split Module 5 through Module 10 into separate implementation modules until the narrow loop exports 8-10 stems reliably from fixture projects. The formal implementation plan should start with the smallest end-to-end flow: one fixture project, one Screen Set, basic selected-track discovery, iterative master bounce, deterministic naming, file-ready detection, and manifest output.

## Multi-DAW Extension Strategy

Multi-DAW support is a valid long-term direction, but it should be treated as an expansion strategy after the Logic product proves demand and reliability.

Why this foundation can support it:

- Stem Recipe, Naming And Package Manifest, Google Drive Sync, Diagnostics, App Identity/Lead Funnel, Mutation Safety, and the future Core Export Engine are mostly DAW-agnostic.
- The separation between UI driver and Core Export Engine gives future DAWs a place to plug in without rewriting product/business features.
- Shared JSON contracts such as `ProjectGraph`, `ExportPlan`, and `ExportManifest` can normalize DAW differences at the boundary.
- Session hygiene can become a per-DAW profile rather than one hardcoded Logic workflow.

What must stay DAW-specific:

- UI automation, scripting, or SDK control.
- Project discovery and routing graph extraction.
- Solo/mute/bounce execution details.
- Sidechain and multi-output instrument handling.
- Session-prep requirements such as Screen Sets, templates, or project view layouts.

Abstraction boundaries to preserve now:

- `CoreExportEngine` must depend on a `DAWDriver` contract, not directly on Logic selectors, Logic menu names, or PyObjC types.
- `ProjectGraph` should have a DAW-neutral core plus namespaced driver extensions, for example `extensions.logic`, `extensions.ableton`, or `extensions.proTools`.
- `DriverCapabilities` should describe what a driver can actually do: selected-track discovery, full routing graph discovery, bounce execution, MIDI printing, sidechain detection, mutation rollback, and manual-assist-only fallbacks.
- `SessionReadiness` should be driver-specific under the hood but normalized for the UI: blocker code, severity, message, remediation, and whether export can continue manually.
- `MutationSafety` should express generic concepts such as checkpoint, reversible mutation, destructive mutation, restore strategy, and user consent. Logic's Save As temp copy is only one implementation.

Schema posture:

- Keep `ProjectGraph`, `ExportPlan`, `ExportManifest`, `StemRecipe`, `SessionReadiness`, `DriverCapabilities`, and `DiagnosticBundle` DAW-neutral.
- Allow driver-specific extension objects rather than forcing every DAW into Logic's track/AUX/bus vocabulary.
- Prefer capability checks over DAW-name checks. The Core Export Engine should ask "can this driver print MIDI safely?" rather than "is this Logic?"

Future driver interface, introduced only after V1 Logic success:

```text
DAWDriver
  getDriverInfo() -> DriverInfo
  getCapabilities() -> DriverCapabilities
  discoverProject() -> ProjectGraph
  validateSessionReadiness() -> ReadinessReport
  prepareExportSession(plan) -> MutationPlan | ManualAssistPlan
  executeBounce(job) -> BounceEventStream
  restoreSession(runId) -> RestoreReport
  captureDiagnostics(runId) -> DiagnosticBundle
```

Likely driver paths:

| DAW           | Likely automation approach                             | Difficulty  | Notes                                            |
| ------------- | ------------------------------------------------------ | ----------- | ------------------------------------------------ |
| Logic Pro     | macOS Accessibility via PyObjC/atomacos                | High        | V1 target; no stable internal API                |
| Ableton Live  | Max for Live, OSC, scripts, and limited UI automation  | Medium      | Best V2 candidate for electronic/indie producers |
| Pro Tools     | Avid surfaces/SDK constraints plus UI automation       | High        | High demand, very different workflow             |
| Studio One    | Scripting/API support plus project conventions         | Medium      | Potentially approachable after Ableton           |
| Cubase/Nuendo | Steinberg ecosystem, scripting/remote-control options  | Medium-High | Strong MIDI/routing depth, more research needed  |
| FL Studio     | Python scripting and Windows-heavy automation concerns | Medium      | Likely later because V1 is macOS-first           |

Recommended expansion sequence:

1. V1: Logic Pro only. Prove value, onboarding, package quality, and beta support loop.
2. V2: Ableton Live if customer demand supports it, because it has stronger scripting surfaces and a large producer audience.
3. V3+: Pro Tools for professional studio demand, then Studio One/Cubase/FL Studio as research supports them.

Anti-corner rule: do not name the product or contracts in a way that permanently implies Logic-only behavior. Internally use `DAWDriver`, `DriverCapabilities`, `ProjectGraph`, `ExportPlan`, `ExportManifest`, `StemRecipe`, and `SessionReadiness` language. Externally, market the first release clearly as `Dirt Cat Stem Exporter for Logic Pro` or `Starting with Logic Pro`.

Implementation rule: do not build a generic plugin system in V1. Build the Logic harness with DAW-neutral contracts and names, then extract the `DAWDriver` boundary only after the first Logic driver proves the loop.

## Deep-Module Rules

- A Module earns its place only if it hides meaningful complexity behind a smaller Interface.
- The Interface is the test surface.
- UI components should display state and collect intent, not decide export rules.
- Logic UI automation should execute plans, not invent product policy.
- File naming, sidechain strategy, MIDI printing, upload behavior, licensing, and recovery should each have one owner.
- Adapters may be thin. Core Modules should be deep.

## Target Architecture

```text
React UI
  -> Electron main process
    -> Core Export Orchestrator
      -> local filesystem watcher and package manager
      -> Google Drive API adapter
      -> licensing/lead-capture adapter
      -> DAWDriver process adapter
        -> LogicDriver Python worker
          -> Logic automation via PyObjC / atomacos
          -> raw bounce execution diagnostics

CLI harness phase:
  Python LogicDriver temporarily hosts the Core Export Engine
  -> emits DAW-neutral events/manifests for later Electron migration

Core policy Modules:
  DAW driver -> Project graph -> Stem recipe -> Export plan -> Bounce run -> Package manifest
```

### Tech Ownership

- React/TypeScript owns screens, forms, progress display, onboarding, and user-visible settings.
- Electron main owns the app command boundary, local IPC, Python worker lifecycle, menu integration, secure token storage bridge, and update hooks.
- Python/PyObjC owns macOS Accessibility interaction with Logic and low-level export execution for V1.
- Electron/Node owns file watching, package assembly, Google Drive OAuth/upload orchestration, secure token storage, IPC supervision, and update behavior once the desktop shell exists.
- During the CLI-only harness phase, Python may temporarily write manifests and do file-ready checks, but that ownership should migrate to Electron/Node once the desktop shell exists.
- Shared JSON schemas own the contract between the React UI, Electron main process, and Python worker. Keep TypeScript and Python models in parity with contract tests.
- The first Python worker is specifically a `LogicDriver`, not the permanent shape of all DAW automation. Future DAWs should implement the same driver contract with their own automation strategy.

## V1 Core Modules

Keep the main implementation plan focused on Modules 1-4 plus the compressed Core Export Engine described above. Modules 5-15 are long-term architecture notes and should not become separate implementation units until the narrow harness is proven.

### Module 1: App Identity And Lead Funnel

Responsibility: Define the product edition, account/email capture state, Dirt Cat handoff options, download attribution, and free/pro boundaries.

Deep Interface:

- `getEditionCapabilities(licenseState)`
- `recordLeadCapture(email, source, appVersion)`
- `buildDirtCatHandoff(exportPackage, customerProfile)`

Owns: free vs Pro entitlement rules, download source attribution, email capture consent, direct-to-Dirt-Cat upload intent, and links back to the Dirt Cat web funnel.

V1 tier recommendation:

- Free: unlimited local export runs, up to 16 automated stems per run, Manual Assist Mode without stem-count cap, local package output, fixed basic presets, 2-3 naming templates, and manual Google Drive upload.
- Pro: smart sidechain auto-treatment, full MIDI Print automation, custom recipe saving, direct-to-Dirt-Cat upload plus notification, batch/multi-project export, and priority templates.

Basic presets for V1 Free:

- Full Selected Tracks
- Drums Only
- Dirt Cat Mix Prep Basic

Launch recommendation: make V1 public free-first with mandatory email capture and an in-app Pro upgrade path prepared but not monetized until beta reliability is proven.

Should not own: Logic automation, local export file naming, or Drive upload mechanics.

### Module 2: Desktop App Shell

Responsibility: Keep the app usable, native-feeling, and recoverable.

Deep Interface:

- `startExportSession(request)`
- `pauseOrCancelSession(sessionId)`
- `openExportPackage(sessionId)`
- `openDiagnosticBundle(sessionId)`

Owns: app window flow, progress dashboard state, onboarding progression, Electron-to-Python command routing, and user-facing error states.

Should not own: stem eligibility rules, sidechain strategy, or Drive retry policy.

### Module 3: Permission And Environment Readiness

Responsibility: Prove the machine is ready before the export starts.

Deep Interface:

- `runReadinessCheck()`
- `explainReadinessBlocker(blockerCode)`
- `watchPermissionState()`

Owns: Accessibility permission status, Automation permission status, Logic process detection, recommended Logic screen set checks, macOS version capture, Logic version capture, and known incompatibility warnings.

Should not own: export planning, bouncing, or licensing.

### Module 4: Logic UI Automation Driver

Responsibility: Provide a narrow, resilient adapter over macOS Accessibility and Logic menu/dialog operations.

Deep Interface:

- `discoverLogicUiTree()`
- `selectTrack(trackRef)`
- `setSoloState(trackRef, soloState)`
- `invokeBounce(command)`
- `fillSaveDialog(filePath)`
- `waitForLogicIdle(timeout)`

Owns: PyObjC calls, accessibility selectors, UI tree traversal, menu command execution, save dialog interaction, selector fallback order, and raw UI snapshots for diagnostics.

V1 discovery notes:

- Start with Accessibility Inspector and `atomacos` for rapid prototyping.
- Do not attempt full `.logicx` project parsing in V1.
- Add recursive stack expansion before project modeling so collapsed Track Stacks and Folder Stacks are visible in the AX tree.
- Prefer flexible matching against labels/roles/relationships over brittle element indexes.
- Do not drive Logic automation with arbitrary fixed `sleep` timing. A short settle interval can be used only with a polling loop that waits for expected AX elements, roles, values, and enabled states before every click, keystroke, or dialog action.
- Capture timing diagnostics for each wait condition so slow sessions and missing elements can be distinguished.
- Verify the Python worker process architecture matches Logic's architecture before attempting AX traversal.
- Build a selector registry as one of the first harness deliverables. Each UI operation should name its selector intent, primary match rule, fallback chain, and diagnostic snapshot path so Logic updates can be repaired locally instead of scattered through automation code.

Should not own: which stems to export, final filenames, or whether a sidechain should be preserved.

## Appendix: Long-Term Architecture Modules

The remaining Modules describe where complexity should eventually live. Treat them as extraction targets after fixture exports are reliable, not as scaffolding requirements for the first prototype.

### Future Module: DAW Driver Contract

Responsibility: Provide a stable boundary between DAW-specific automation and the DAW-agnostic Core Export Engine.

Deep Interface:

- `discoverProject()`
- `validateSessionReadiness()`
- `prepareExportSession(plan)`
- `executeBounce(job)`
- `restoreSession(runId)`
- `captureDiagnostics(runId)`

Owns: normalized driver contract, capability reporting, DAW/version identification, driver-specific readiness blockers, and event stream shape.

Should not own: product tiers, Google Drive upload, Dirt Cat handoff, final package naming policy, or renderer UI.

V1 note: do not extract this as a separate abstraction until the Logic harness works. Use the names and schemas now so the future seam is not blocked, but avoid a heavy plugin system before there is one working driver.

### Module 5: Logic Project Model

Responsibility: Convert messy Logic UI state into a normalized project graph.

Deep Interface:

- `inspectOpenProject()`
- `normalizeTracks(rawUiTree)`
- `buildRoutingGraph(tracks, auxes, sends)`
- `classifyProjectCapabilities(projectGraph)`

Owns: tracks, stacks, AUXes, buses, sends, outputs, audio vs MIDI vs software instrument classification, multi-output instrument shape, track groupings, color hints, tag hints, and project metadata discovered from Logic.

Should not own: preset definitions, bounce execution, or upload packaging.

### Module 6: Stem Recipe And Preset Engine

Responsibility: Turn user intent into a deterministic list of stems.

Deep Interface:

- `resolvePreset(presetId, projectGraph)`
- `buildCustomRecipe(userSelections, projectGraph)`
- `validateStemRecipe(recipe, projectGraph)`

Owns: Full Multitrack, Drums Only, MIDI Synths Printed, Dirt Cat Mix Prep, custom stem selections, naming template variables required by a recipe, and free/pro limits passed in as edition capabilities.

Should not own: accessibility clicks, file writes, or Google Drive upload.

### Module 7: Sidechain And Routing Strategy

Responsibility: Decide how each stem should preserve or intentionally remove sidechain-dependent behavior.

Deep Interface:

- `analyzeSidechains(projectGraph)`
- `planSidechainTreatment(stemTarget, projectGraph, userPolicy)`
- `buildRoutingMutations(strategy)`

Owns: sidechain trigger detection where possible, user tagging for ambiguous sidechains, trigger rerouting to No Output, send/AUX preservation policy, master processing inclusion/exclusion policy, and warnings when a stem cannot be automated safely.

Should not own: direct PyObjC interaction, filename templates, or Drive upload.

### Module 8: MIDI Print Strategy

Responsibility: Decide when and how virtual instruments become audio before stem export.

Deep Interface:

- `findPrintableMidiTracks(projectGraph)`
- `planMidiPrints(recipe, projectGraph)`
- `verifyPrintedAudio(printResult)`

Owns: Bounce in Place policy, multi-output MIDI handling, software instrument edge cases, printed-track naming, mapping printed tracks back to original tracks, and cleanup policy for temporary printed tracks.

Should not own: final export package structure, Drive upload, or app licensing.

### Cross-Cutting Module: Mutation Safety And Session Checkpointing

Responsibility: Prevent temporary routing and MIDI-print operations from damaging the user's original Logic session.

Deep Interface:

- `prepareSafeSessionCopy(projectRef)`
- `recordPreMutationSnapshot(projectGraph)`
- `approveMutationPlan(mutationPlan, userConsent)`
- `restoreOrExplainMutationState(runId)`

Owns: Save As temp export-copy policy, pre-mutation warnings, sidechain routing checkpoints, Bounce in Place checkpoints, crash recovery instructions, mutation audit logs, and hard blocks when the app cannot verify a safe rollback path.

Should not own: deciding which sidechain or MIDI strategy is musically correct, raw UI clicks, or final package naming.

Rule: sidechain rerouting and Bounce in Place automation cannot run against the user's original `.logicx` project unless the user explicitly overrides the safety guard. The default path is a temporary export copy.

### Module 9: Export Plan Compiler

Responsibility: Compile project graph, recipe, sidechain strategy, MIDI print strategy, naming rules, and edition capabilities into an executable plan.

Deep Interface:

- `compileExportPlan(input)`
- `validateExportPlan(plan)`
- `estimateExportRun(plan)`

Owns: dependency order between MIDI print, routing mutations, solo states, and bounce jobs; export job list; warnings; required user confirmations; plan determinism; replayability; and resumable checkpoint boundaries.

Should not own: direct UI operations, actual file watching, or OAuth.

### Module 10: Bounce Orchestrator

Responsibility: Execute the export plan as a resumable state machine.

Deep Interface:

- `runExportPlan(plan, executionContext)`
- `resumeExportSession(sessionId)`
- `cancelExportSession(sessionId)`
- `summarizeRun(sessionId)`

Owns: state machine for each export step, solo/mute/routing mutation sequencing, bounce command sequencing, timeout and retry policy, safe cancellation, and user-assist prompts when automation cannot continue.

Should not own: stem recipe rules, raw PyObjC selectors, or Drive OAuth.

### Module 11: Export Watcher And Audio Verification

Responsibility: Decide when an export file is complete and credible.

Deep Interface:

- `watchExpectedFiles(manifest)`
- `verifyExportedStem(filePath, expectedStem)`
- `buildExportEvidence(sessionId)`

Owns: file completion detection, partial file handling, WAV/AIFF metadata checks, duration tolerance checks, silence/near-silence warning thresholds, checksums, and manifest evidence.

Should not own: creating the recipe, uploading files, or UI screenshots.

### Module 12: Naming And Package Manifest

Responsibility: Produce structured, collision-safe output names and folders.

Deep Interface:

- `renderFileName(template, stemContext)`
- `buildPackageManifest(exportRun)`
- `validatePackageManifest(manifest)`

Owns: `ProjectName_Stems/YYYY-MM-DD` folder rules, categories such as Drums/Bass/Guitars/Vocals/Synths/FX/Full Mix, filename sanitization, duplicate prevention, manifest JSON, and optional zip structure.

Naming template requirements:

- Support user-defined variables early, including `[Project]`, `[Date]`, `[StemCategory]`, `[TrackName]`, `[Version]`, `[Tempo]`, `[Printed]`, and `[Mode]`.
- Validate templates before export so illegal path characters and empty rendered segments fail early.
- Resolve collisions with deterministic incremental suffixes first, then timestamp suffixes only when a rerun would otherwise overwrite evidence.
- Store the exact rendered name and original Logic track label in the package manifest.

Should not own: bounce execution, project discovery, or OAuth upload.

### Module 13: Google Drive Sync

Responsibility: Upload a completed package without making upload reliability a blocker for local export success.

Deep Interface:

- `connectDriveAccount()`
- `selectDriveDestination()`
- `uploadPackage(manifest, destination)`
- `resumeUpload(uploadSessionId)`

Owns: official Google Drive API integration, Drive folder selection, upload sessions, retries, upload manifests, direct-to-Dirt-Cat destination handling, sharing links, and user-facing upload evidence.

V1 upload rule: do not bundle `rclone`. Use the Google Drive REST API directly to avoid extra signing/notarization risk from a third-party binary inside the app bundle.

Large-upload rule: use resumable/chunked upload flows for multi-GB packages. Do not rely on single-request uploads for stem archives.

Reliability rule: resumable uploads need retry/backoff, user-visible progress, cancel/resume controls, and clear failure states. Silent multi-GB upload failures are not acceptable.

Dirt Cat handoff rule: keep V1 direct-to-Dirt-Cat on a dedicated shared Google Drive destination plus webhook/email notification. If a future version moves to S3 or another object store, use multipart upload rather than a single pre-signed `PUT` request.

Should not own: file naming rules, Logic automation, or entitlement policy except capabilities passed in from Module 1.

### Module 14: Diagnostics, Logging, And Test Harness

Responsibility: Make automation failures debuggable without exposing private project content by default.

Deep Interface:

- `recordAutomationEvent(event)`
- `captureDiagnosticBundle(sessionId, privacyMode)`
- `runFixtureProjectScenario(scenarioId)`

Owns: structured logs, UI tree snapshots, redaction policy, fixture project scenarios, replayable export plans, and support bundle creation.

Should not own: product pricing, Drive upload implementation, or UI layout.

### Module 15: Distribution, Updates, And Trust

Responsibility: Make the app installable, updateable, and trustworthy for musicians.

Deep Interface:

- `checkForUpdates()`
- `verifyWorkerIntegrity()`
- `reportInstalledVersion()`

Owns: signing and notarization workflow, Electron updates, Python worker bundling constraints, update channel selection, crash reporting consent, and app version compatibility notices.

Packaging rule: do not assume PyInstaller is the release packaging path. PyInstaller sidecars inside Electron can trigger hardened-runtime, library-unpacking, and notarization problems on macOS. Phase 0 must compare `py2app`, an embedded standalone Python framework, and PyInstaller before committing to packaging.

Architecture rule: ship a native ARM64 beta first. Universal builds can come later only after the worker, Electron app, and Logic process architecture checks are proven.

Should not own: export rules, lead capture policy, or Drive folder naming.

## Dependency Order

1. Permission And Environment Readiness
2. Logic UI Automation Driver
3. Logic Project Model
4. Stem Recipe And Preset Engine
5. Sidechain And Routing Strategy
6. MIDI Print Strategy
7. Mutation Safety And Session Checkpointing
8. Export Plan Compiler
9. Bounce Orchestrator
10. Export Watcher And Audio Verification
11. Naming And Package Manifest
12. Google Drive Sync
13. Desktop App Shell
14. App Identity And Lead Funnel
15. Diagnostics, Logging, And Test Harness
16. Distribution, Updates, And Trust

This is not the user-facing build order. It is the dependency order for making the core reliable. The UI can be prototyped in parallel after the automation harness has a stable worker-shaped API.

## Revised Phases

### Phase 0: Product And Research Spike, 1 week

- Choose the MVP presets and free/pro limits.
- Build or collect 3 representative Logic fixture projects.
- Confirm macOS, Logic Pro, and language/localization assumptions.
- Define the JSON contract between Electron and the Python worker.
- Run a small packaging spike for Python plus PyObjC.

Milestone: The team knows whether the recommended stack can be shipped without packaging surprises.

### Phase 1: Core Automation Harness, 7 to 10 weeks

- Build the Python CLI harness around Modules 3 through 11.
- Build the selector registry before broad project modeling so every AX action is named, testable, and diagnosable from the first bounce.
- Prove UI tree traversal, project graph discovery, solo/bounce, save dialog injection, file completion, MIDI printing, and sidechain treatment.
- Keep logs and fixture-project evidence from every run.
- Include Manual Assist Mode when automation cannot complete a step.

Milestone: A command-line tool exports a full set of stems from a representative Logic project and produces a manifest.

Reality adjustment: for a solo or part-time developer, expect Phase 1 to take 7-10 weeks if it includes real-world project variance. The initial checkpoint should be narrower: export 1-2 stems from one fixture project with polling, save-dialog injection, file-ready detection, and manifest output. Only then expand to 8-10 stems before adding smart sidechain or MIDI print automation.

### Phase 2: Desktop MVP, 9 to 13 weeks

- Build Electron + React around the Python worker contract.
- Add onboarding, permission checks, presets, custom selection, naming templates, progress logs, local package output, and Drive destination selection.
- Add free/pro gating only after the export path works locally.
- Keep direct-to-Dirt-Cat upload as a beta feature if Drive sync is stable.

Milestone: Closed beta users can export stems locally and upload a package to Drive.

Reality adjustment: expect Phase 2 to take 9-13 weeks if it includes production-quality onboarding, packaging, notarization, Drive resumable uploads, and beta support loops.

### Phase 3: Marketing Integration And Polish, 4 to 6 weeks

- Add the website download funnel and email capture.
- Add branded onboarding, public demo video, support bundle flow, and clear privacy copy.
- Add analytics only with explicit, privacy-first consent.
- Add public docs for Logic prep and troubleshooting.

Milestone: Public launch page on dirtcatrecords.com with a stable downloadable app.

### Phase 4: Monetization And Expansion, ongoing

- Add Pro upgrade flow, advanced presets, batch workflows, template sharing, and priority support.
- Consider Ableton only after Logic's automation surface has mature diagnostics and support processes.

Milestone: The app supports lead generation, paid upgrades, and repeatable maintenance for macOS and Logic updates.

## Research Questions To Close Early

- Can the Logic track list, AUXes, sends, output routing, and selected track state be detected reliably through Accessibility?
- Can the automation reliably expand visible Track Stacks and Folder Stacks before project modeling?
- Can the recommended Logic Screen Set make the AX tree stable enough for beta users?
- Can the app execute Bounce in Place and Bounce Project or Section with deterministic file paths across Logic versions?
- Can sidechain trigger rerouting to No Output preserve compression behavior without audible bleed in common projects?
- Can multi-output MIDI instruments be classified and printed without surprising users?
- Can file completion be detected safely for large WAV/AIFF exports?
- Can a selector registry and UI tree snapshot suite catch Logic UI changes before users do?
- Can TypeScript and Python contract validation prevent IPC drift between Electron and the worker?
- Can Python/PyObjC be bundled inside a signed and notarized Electron app using `py2app` or an embedded Python framework without unacceptable permission issues?
- Can the app reliably detect and block Rosetta/cross-architecture worker execution before AX traversal starts?
- Is the Google Drive REST API reliable enough for large uploads without bundling `rclone`?
- Can Google Drive resumable uploads recover cleanly from network interruption on multi-GB packages?
- What does the free version limit without making the app feel like a crippled demo?
- Can the first Logic implementation keep contracts DAW-neutral enough that Ableton can be added later without renaming the core model?

## Testing And Validation Strategy

V1 needs testing around contracts, fixtures, and UI tree change detection more than traditional unit-test volume.

- Contract tests: define JSON schemas for commands and events exchanged between Electron and Python. Validate them in TypeScript and Python, using Pydantic or equivalent on the Python side and a TypeScript schema validator on the Electron side.
- UI tree snapshots: capture redacted AX tree snapshots for every fixture run. Store stable snapshots for Screen Set-ready projects and compare important selector paths over time.
- Selector registry tests: every selector intent should have a fixture-backed primary rule and at least one fallback expectation.
- Fixture projects: start with simple audio tracks, multi-output MIDI drums prepared with AUXes visible, MIDI synths, grouped vocals, and AUX effects stems.
- Chaos fixtures: include collapsed Track Stacks, renamed tracks, hidden tracks, plugin windows left open, unexpected modal dialogs, long projects, and 80+ track sessions.
- Upload tests: simulate interrupted Google Drive resumable uploads and prove local package success remains independent from upload success.
- Packaging tests: every beta build must prove the Electron app, Python worker, PyObjC imports, code signing, notarization, and architecture checks all work on a clean Apple Silicon Mac.

## Documentation Split Recommendation

When the separate `dirtcat-stem-exporter` repo is created, split this design into smaller docs:

- `SPEC.md`: V1 product scope, supported Logic/macOS versions, free/pro rules, first checkpoint, and user-facing constraints.
- `ARCHITECTURE.md`: long-term modules, `DAWDriver` strategy, schemas, testing strategy, packaging risks, and multi-DAW expansion.
- `docs/session-hygiene.md`: Logic Screen Set, multi-output MIDI prep, visible AUX/stacks requirements, and troubleshooting.
- `docs/implementation-plan.md`: executable tasks and verification commands.

## Competitive Notes From Auto-Bounce

Auto-Bounce validates the product category and exposes the important architectural lesson: professional Logic stem automation should use iterative master-bus bouncing, not the native Export All Tracks path.

What to learn from it:

- Job sets and reusable templates matter.
- Dynamic naming is a core feature, not polish.
- Iterative master-bus bounce preserves complex routing better than bulk track export.
- AUX/effects-only stems and wet/dry variants are premium workflows.
- Cycle range control, including variable start/end behavior, can save export time and produce cleaner files.
- A required or recommended Logic Screen Set is a reasonable tradeoff for stability.

Where Dirt Cat can differentiate:

- Tight Google Drive package delivery.
- Direct-to-Dirt-Cat handoff and notification.
- Simple remote-mixing-oriented presets instead of a broad post-production feature surface.
- Better onboarding for session hygiene and multi-output MIDI drums.
- Free utility value that builds trust before asking for a paid upgrade.

## Acceptance Criteria For The Approved Module Design

- At least two architectural paths were compared before choosing the path.
- The recommended path attacks Logic automation risk before UI polish.
- Each deep Module owns a real policy or complexity cluster.
- The Python automation layer is an adapter/executor, not the owner of product rules.
- The app can fall back to Manual Assist Mode.
- Local export success is independent from Drive upload success.
- The Dirt Cat lead-generation path is explicit but does not compromise the utility of the free app.

## Key Risks And Mitigations

Risk color key:

- Green: low-risk strategic choices that should remain stable.
- Yellow: manageable risks that need first-class design support.
- Orange: serious risks that need early proof and ongoing maintenance budget.
- Red: known traps to avoid or explicitly spike before implementation.

### Green / Low Risk

- Python harness first is the correct sequencing because it attacks the Logic automation seam before UI polish.
- Separate `dirtcat-stem-exporter` repository keeps desktop signing, release, and packaging concerns away from the live Dirt Cat web launch.
- Free-first with email capture is safer than charging during the first reliability-discovery cycle.
- Mutation Safety, required Screen Set, diagnostics bundles, and Manual Assist Mode are essential mitigations, not optional features.
- The Dirt Cat lead-generation path is strategically strong because the free tool is useful on its own and naturally points users toward remote mixing.

### Yellow / Manageable

- UI automation fragility remains the core maintenance risk. Mitigate with a required Screen Set, session hygiene checks, flexible AX matching, polling-based waits, and support bundles.
- Electron plus Python packaging is doable but fiddly on macOS. Mitigate with a Phase 0 packaging spike before building UI depth.
- Electron app size may be 100-200 MB. For audio professionals this is acceptable, but branding and install flow should make the app feel trustworthy.
- Google Drive large uploads are reliable only if resumable uploads, retry windows, and upload manifests are treated as first-class behavior.

### Orange / Watch Closely

- Development time is likely longer than the optimistic phase estimates for a solo/part-time developer. Expect Phase 1 to take 7-10 weeks and Phase 2 to take 9-13 weeks if real-world Logic sessions are in scope.
- Maintenance burden is real. Major Logic Pro and macOS updates can break selectors, Screen Set assumptions, and permissions behavior.
- Post-launch maintenance should be budgeted as recurring product work. Expect selector/permission retesting around major Logic or macOS updates, likely every 12-18 months and sometimes sooner for point releases.
- Auto-Bounce is serious competition. Dirt Cat's differentiation must stay clear: simpler remote-mixing prep, Google Drive delivery, direct-to-Dirt-Cat handoff, and client-friendly onboarding.
- Apple Silicon should be the first-class target. Intel and older macOS support can expand the test matrix too early.
- Over-engineering is a product risk. The long-term module map should not become the first implementation shape.

### Red / Avoid Or Spike First

- Do not rely on PyInstaller without proof. It may fail signing/notarization because of runtime library unpacking and hardened-runtime constraints.
- Do not use arbitrary fixed sleeps for Logic UI timing. Use minimum settle intervals only inside AX polling loops that wait on element existence, state, and readiness.
- Do not use single-request object-store uploads for multi-GB stem packages. If S3 or similar enters the architecture, use multipart upload.
- Do not let an x86/Rosetta Python worker automate native ARM64 Logic Pro. Enforce architecture checks before any AX traversal.
- Do not split the first prototype into all 16 long-term Modules. Prove the Core Export Engine first.

| Risk                                              | Mitigation                                                                                                                       |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Logic UI changes break automation                 | Keep selectors in one Logic UI Automation Driver, record UI snapshots, ship Manual Assist Mode                                   |
| Sidechain behavior is project-specific            | Put detection and policy in one Sidechain Module, require user confirmation for ambiguous cases                                  |
| MIDI printing mutates sessions unexpectedly       | Work from explicit plans, checkpoint before mutation, document cleanup behavior, favor duplicated/temporary tracks when possible |
| Python packaging breaks notarization              | Run packaging spike in Phase 0 and compare `py2app`, embedded Python, and PyInstaller before choosing release packaging          |
| macOS permissions frustrate users                 | Make readiness checks and onboarding a first-class Module                                                                        |
| Drive upload fails after a successful export      | Always produce a local package and resumable upload manifest                                                                     |
| Free/pro gating makes the free app feel unhelpful | Keep the free tier genuinely useful: basic stems, local package, manual upload, and Dirt Cat handoff                             |
| Support burden grows after launch                 | Make diagnostics and privacy-safe support bundles part of MVP, not an afterthought                                               |
| Temporary Logic mutations damage sessions         | Default to Save As temp export copies, require mutation consent, and block risky automation when rollback is uncertain           |
| Cross-architecture AX traversal drops nodes       | Ship native ARM64 first and block Rosetta worker execution against native Logic Pro                                              |
| Abstraction overhead delays prototype             | Collapse Modules 5-10 into a Core Export Engine until the iterative master-bounce loop works end to end                          |

## Recommended First Development Slice

Start with a narrow automation proof called `logic-export-harness` outside the current Dirt Cat web runtime.

First micro-checkpoint:

- confirm Accessibility permission detection
- build the selector registry foundation
- inspect the open Logic project track list
- run one manual stem recipe against a fixture project
- export 1-2 stems through iterative master bounce
- inject deterministic save-dialog paths with AX polling
- verify the output file and write a manifest

Second checkpoint:

- generate a normalized project graph JSON file
- expand from 1-2 stems to 8-10 stems after the first checkpoint is repeatable
- produce `project-graph.json`, `export-plan.json`, exported audio, and `manifest.json`
- prove a failed run creates a diagnostic bundle with logs and a redacted UI snapshot

Strict V1 slice limits:

- no smart sidechain automation yet
- no MIDI Bounce in Place automation yet
- no full custom template engine yet; ship 2-3 fixed naming templates first
- no Drive upload in the first harness checkpoint
- no Electron UI until the CLI harness proves the bounce loop

Definition of done:

- the harness produces `project-graph.json`, `export-plan.json`, exported audio, and `manifest.json`
- a failed run produces a diagnostic bundle with logs and a redacted UI snapshot
- the result is repeatable on at least one fixture Logic project
- the harness exports 8-10 stems from one Screen Set-ready fixture using iterative master bounce

## Open Decisions

- Does the first repo live inside this repository under a new app folder, or as a separate desktop-app repository linked from Dirt Cat docs?
- Decision recommendation: separate repository named `dirtcat-stem-exporter`, linked from the main site.
- Is the first public release free-only, or free plus Pro unlock from day one? Recommendation: free-first public release with Pro upgrade path prepared but not activated until beta reliability is proven.
- Should direct-to-Dirt-Cat upload use the existing Dirt Cat Google Drive workflow, a separate Drive destination, or a temporary upload intake? Recommendation: dedicated shared Drive folder plus webhook/email notification.
- What minimum Logic Pro and macOS versions are supported for v1? Recommendation: Logic Pro 11+ and macOS 14 Sonoma+ for the first beta, with macOS 13 Ventura evaluated only if tester demand justifies it.
- Should the first beta require a specific Logic Screen Set to reduce automation variability? Recommendation: yes; require or strongly enforce a Dirt Cat Exporter Screen Set with an auto-reminder before each automated run.
