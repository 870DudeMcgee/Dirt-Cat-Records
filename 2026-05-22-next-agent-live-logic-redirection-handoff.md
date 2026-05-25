# Next-Agent Handoff: Live Logic Redirection

Use this as the prompt for the next agent.

```text
Continue in `/Users/josh/Desktop/dirtcat-stem-exporter`.

Current branch:
- `wip/task-0-repo-boundary`

Primary objective:
- Redirect the project from packaging/UI/upload-adjacent work toward the first real Logic Pro proof:
  prepared Logic session -> real Accessibility readiness posture -> redacted/live Logic snapshot or diagnostic -> ProjectGraph -> Manual Assist 1-2 real bounced stems -> local package + manifest -> diagnostics.

Important context:
- The repo has a solid local-first skeleton, but it is not yet a usable beta.
- The current slice labels are ahead of product evidence.
- Slices 6 and 7 currently produce fixture-driven automation plans, not live Logic automation.
- Slice 8 is a fakeable desktop-orchestrator boundary, not a real Electron UI.
- Slice 9 keeps Drive upload correctly post-export, but upload was added before live local Logic export was proven.
- The next meaningful milestone is live Logic proof, not the old Slice 10 Beta Packaging Spike.

Read first:
1. `docs/superpowers/plans/2026-05-22-live-logic-redirection-plan.md`
2. `docs/superpowers/specs/2026-05-21-local-first-slice-design.md`
3. `workers/logic-driver/src/logic_driver/readiness.py`
4. `workers/logic-driver/src/logic_driver/cli.py`
5. `workers/logic-driver/src/logic_driver/discovery.py`
6. `packages/core/src/export-engine/manual-assist-export-loop.ts`
7. `packages/core/src/package-manifest/`

Current verification baseline from the previous assessment:
- `npm run check:contracts` passes
- `npm run check:types` passes
- `.venv/bin/python -m pytest workers/logic-driver/tests -q` passes with 15 tests
- `npm run test:core` passes with 25 tests

Start with:
```bash
git status -sb
sed -n '1,220p' docs/superpowers/plans/2026-05-22-live-logic-redirection-plan.md
sed -n '1,240p' docs/superpowers/specs/2026-05-21-local-first-slice-design.md
```

Expected `git status -sb` currently includes the same pre-existing untracked scaffold files plus the new redirection plan/handoff documents:
```text
## wip/task-0-repo-boundary
?? .gitignore
?? ARCHITECTURE.md
?? SPEC.md
?? apps/
?? docs/beta-test-plan.md
?? docs/packaging-spike.md
?? docs/session-hygiene.md
?? docs/superpowers/plans/2026-05-22-live-logic-redirection-plan.md
?? docs/superpowers/plans/2026-05-22-next-agent-live-logic-redirection-handoff.md
?? docs/troubleshooting.md
?? fixtures/
?? packages/core/src/contracts/.gitkeep
?? packages/core/src/drive-upload/.gitkeep
?? packages/core/src/export-engine/.gitkeep
?? packages/core/src/mutation-safety/.gitkeep
?? tsconfig.json
?? workers/logic-driver/README.md
?? workers/logic-driver/src/logic_driver/__init__.py
```

Critical guardrails:
- Do not make Drive upload part of export success.
- Do not introduce Vercel, hosted API, license checks, website callbacks, or network calls into readiness/discovery/export success.
- Do not grow the Electron app before the live Logic harness proves the export path.
- Do not choose `py2app`, PyInstaller, or embedded Python before PyObjC/ApplicationServices imports and Accessibility behavior are proven locally.
- Do not automate destructive Logic mutations.
- Keep Manual Assist as the fallback for ambiguous Logic state.
- Keep pre-existing untracked Task 0 scaffold separate unless explicitly asked to clean it up.
- Do not accidentally add unrelated untracked files to implementation commits.

Recommended next action:
- Execute Task 1 from `docs/superpowers/plans/2026-05-22-live-logic-redirection-plan.md`.
- Task 1 updates only status docs:
  - `README.md`
  - `docs/beta-test-plan.md`
- Commit that as:
  - `docs: redirect next milestone to live Logic proof`

Then continue with Task 2:
- Add a fakeable macOS Accessibility probe boundary:
  - `workers/logic-driver/src/logic_driver/macos_accessibility.py`
  - `workers/logic-driver/tests/test_macos_accessibility.py`
  - optional `macos` dependency group in `workers/logic-driver/pyproject.toml`
- Use TDD:
  1. write failing tests;
  2. run the focused failing test;
  3. implement the smallest boundary;
  4. rerun focused tests;
  5. commit.

Implementation order:
1. Task 1: Reclassify roadmap checkpoint.
2. Task 2: Add live macOS Accessibility probe boundary.
3. Task 3: Wire probe into readiness without breaking fixture tests.
4. Task 4: Add redacted AX snapshot harness.
5. Task 5: Prove Manual Assist against real bounce files.
6. Task 6: Run the first manual live Logic proof.
7. Task 7: Decide whether packaging spike is unblocked.

Important implementation notes:
- `workers/logic-driver/src/logic_driver/readiness.py` currently returns unknown Accessibility posture in `current_accessibility_probe()`. That is intentional old behavior and should be replaced only through a fakeable probe boundary.
- `workers/logic-driver/pyproject.toml` currently has only `jsonschema` and `pytest`. Add PyObjC/ApplicationServices under an optional dependency group, not as a hard base dependency.
- `apps/desktop/package.json` still only prints `Desktop shell begins after Logic harness proof.` Keep it that way unless the user explicitly asks for UI work.
- The new live proof may require user participation in Logic Pro. If so, make the code/harness ready, then clearly tell the user what exact Logic action is needed.

Verification after each implementation task:
```bash
npm run check:contracts
npm run check:types
.venv/bin/python -m pytest workers/logic-driver/tests -q
npm run test:core
git diff --check
```

Dependency scan after worker/export changes:
```bash
rg -n "Vercel|fetch\\(|https?://|AppleScript|sleep\\(" workers/logic-driver/src workers/logic-driver/tests packages/core --glob '!**/.venv/**'
```

Expected scan posture:
- No Vercel/network/upload dependency in export, readiness, discovery, Manual Assist, automation, or orchestrator paths.
- No arbitrary sleeps.
- Any `ApplicationServices` reference should be isolated to `workers/logic-driver/src/logic_driver/macos_accessibility.py`.

Definition of success for this redirected phase:
- README and beta docs accurately state the current checkpoint.
- Packaging is gated on live Logic proof.
- Worker has a fakeable native Accessibility boundary.
- Worker can check or prompt Accessibility posture on macOS.
- Project has either a redacted live AX snapshot or a diagnostic explaining why live snapshot is blocked.
- One or two real Logic bounce files can be confirmed and assembled into a local package manifest.

Only after that should the project resume the old Slice 10 Beta Packaging Spike.
```
