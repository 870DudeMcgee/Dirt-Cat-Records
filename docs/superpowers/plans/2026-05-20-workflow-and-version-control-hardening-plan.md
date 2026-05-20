# Workflow And Version Control Hardening Plan

> **For agentic workers:** use this plan before any more shared preview or production verification work. Keep one task in progress at a time. Update `docs/execution-log.md`, `README.md`, `docs/roadmap.md`, and `docs/agent-handoff.md` at each checkpoint.

**Goal:** stop losing time to deployment/source-of-truth ambiguity by making it cheap to answer four questions at any moment:

1. What code is in the current worktree?
2. What commit is the shared preview alias serving?
3. What commit is production serving?
4. Which doc owns the current next action versus historical evidence?

**Why this plan exists:** the repo already has anti-drift rules, but the current workflow still allows a shared environment to point at a deployment that is not obviously tied to a pushed commit. That breaks operator trust, slows debugging, and causes doc updates to chase moving targets.

**Primary failure modes seen in this repo:**

- local dirty-worktree preview deploys can be shared before the code is pushed;
- the stable preview alias can drift away from the deployment actually used for browser testing;
- `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, and older plan docs can all accumulate status prose about the same moving state;
- `main` is functioning as both the integration branch and an active scratch workspace;
- there is no durable deployment ledger that maps git SHA, Vercel deployment URL, alias target, and test purpose.

**Non-goals:** this plan does not replace the existing Stage 7 and PayPal deepening work. It creates a safer operating workflow so that work can proceed without repeating the same ambiguity.

Related durable review: `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`

---

## Immediate Operating Rules

These rules should be followed immediately, even before the plan is fully implemented.

1. Do not use a dirty local Vercel deploy as the shared preview alias.
2. Do not treat the shared preview alias as trustworthy until its target deployment and git SHA are explicitly checked from Vercel and git.
3. Do not use `main` as the long-lived scratch branch for unresolved work.
4. Do not update multiple editable docs with the same ephemeral fact.
5. Do not deploy to production from a worktree whose changes are not committed and pushed.

---

## Target Workflow Contract

When this plan is complete, the repo should operate under this contract:

- `main` is the integration branch, not the scratchpad.
- active implementation happens on a named branch or git worktree.
- shared preview only points at a pushed commit with a known SHA.
- production only points at a pushed commit with a known SHA.
- a single deployment ledger records branch, SHA, deployment URL, alias target, environment, and test purpose.
- `README.md` owns operator workflow only.
- `docs/roadmap.md` owns staged status and active delivery slice only.
- `docs/agent-handoff.md` owns current next action only.
- `docs/execution-log.md` owns append-only evidence only.

---

## Acceptance Criteria

- A worker can determine the exact git SHA behind the shared preview alias in under two minutes without reading multiple docs.
- A worker can determine whether preview came from a dirty local deploy or a pushed commit in under two minutes.
- No shared preview alias changes happen without an append-only ledger entry.
- No production deploy happens without a recorded SHA and verification checkpoint.
- `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, and `docs/execution-log.md` each have a narrow documented purpose and no overlapping status prose.
- New work starts from a named branch or worktree, not from a long-lived dirty `main` session.
- The repo documents one standard path for: start work, validate locally, publish preview, repoint shared alias if needed, verify, and ship production.

---

## Task 0: Freeze The Risky Paths

**Files:**

- Modify: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`

- [x] **Step 1: Add temporary workflow freeze rules**

Document that until the rest of this plan lands:

- shared preview alias must point only at a pushed commit;
- local dirty-worktree deploys are diagnostic only and must not be used as the team-facing preview target;
- production deploys must come from pushed code only.

- [x] **Step 2: Narrow the current next action**

Update `docs/agent-handoff.md` so the immediate next action is adopting this workflow plan before more shared preview/prod verification work.

**Verification:**

```bash
git diff --check
```

---

## Task 1: Add Branch And Worktree Discipline

**Files:**

- Modify: `README.md`, `docs/agent-handoff.md`
- Add: `docs/workflow.md`

- [x] **Step 1: Define the branch roles**

Document these branch roles:

- `main`: integration and release branch;
- `wip/<topic>` or `fix/<topic>`: active implementation branches;
- optional git worktree checkout per task when isolation matters.

- [x] **Step 2: Add the standard start-work flow**

Document one standard sequence:

1. `git status -sb`
2. `git log -1 --oneline --decorate`
3. create/switch to task branch
4. create worktree if needed
5. only then start implementation

- [x] **Step 3: Stop normalizing dirty `main`**

Update docs so a dirty `main` is treated as a recovery situation, not normal operating state.

**Verification:**

```bash
git diff --check
```

---

## Task 2: Add A Deployment Ledger And Provenance Rules

**Files:**

- Add: `docs/deployment-ledger.md`
- Add: `scripts/record-deployment.js`
- Modify: `README.md`, `docs/agent-handoff.md`, `package.json`

- [x] **Step 1: Create one append-only deployment ledger**

Record one line per shared preview or production deployment with:

- date/time
- environment
- git branch
- git SHA
- whether the worktree was clean
- deployment URL
- alias target
- purpose
- verifier

- [x] **Step 2: Add a helper to capture deployment provenance**

Add a script that reads git state plus operator-supplied deployment fields and appends a normalized ledger row.

- [x] **Step 3: Require ledger entries for shared preview and production**

Document that if a deployment matters beyond personal debugging, it must be recorded in the ledger.

**Verification:**

```bash
node --check scripts/record-deployment.js
git diff --check
```

---

## Task 3: Separate Diagnostic Preview From Shared Preview

**Files:**

- Modify: `README.md`, `docs/deployment-preflight.md`, `docs/agent-handoff.md`, `docs/workflow.md`

- [x] **Step 1: Define two preview classes**

Document the difference between:

- diagnostic preview: ad hoc, can be local CLI driven, not trustworthy for shared sign-off;
- shared preview: team-facing, ledgered, tied to a pushed SHA, eligible for alias use.

- [x] **Step 2: Define alias rules**

Document that the stable preview alias can only point to the current shared preview deployment, never to an untracked diagnostic deploy.

- [x] **Step 3: Add the retest contract**

Before any external retest, the operator must confirm:

- current shared preview deployment
- alias target
- git SHA for that deployment

**Verification:**

```bash
git diff --check
```

---

## Task 4: Reduce Doc Overlap To One Owner Per Question

**Files:**

- Modify: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/execution-trail.md`, `docs/workflow.md`

- [ ] **Step 1: Write the doc ownership table**

Define one table that answers:

- where current workflow rules live;
- where current next action lives;
- where stage status lives;
- where historical evidence lives;
- where deployment provenance lives.

- [ ] **Step 2: Remove duplicate status prose**

Trim recurring state prose from docs that do not own it.

- [ ] **Step 3: Add editing rules**

Document simple rules such as:

- never copy a preview URL into more than one editable doc;
- never copy git SHA/status into durable prose except the deployment ledger;
- never let `docs/agent-handoff.md` become a changelog.

**Verification:**

```bash
git diff --check
```

---

## Task 5: Add Version-Control And Release Gates

**Files:**

- Modify: `.husky/pre-push`, `package.json`, `README.md`, `docs/workflow.md`
- Add: `scripts/check-workflow-state.js`

- [ ] **Step 1: Add a workflow-state checker**

The checker should fail when:

- trying to run a shared-release command from a dirty worktree;
- trying to publish shared preview or production from `main` with uncommitted changes;
- required source-of-truth docs are missing from the slice when workflow behavior changed.

- [ ] **Step 2: Add explicit shared-preview and production commands**

Define commands such as:

- `npm run preview:shared`
- `npm run deploy:production:guarded`

These commands should run provenance checks before deployment and remind the operator to record ledger entries.

- [ ] **Step 3: Keep personal diagnostic deploys explicit**

Define a clearly named command for ad hoc preview deploys so operators understand that it is not the shared preview path.

**Verification:**

```bash
node --check scripts/check-workflow-state.js
npm run check:js
git diff --check
```

---

## Task 6: Add Build Provenance To Runtime Surfaces

**Files:**

- Add: `lib/env/build-info.js`
- Modify: `api/checkout-config.js`, `api/admin/setup-wizard.js`, tests under `test/`

- [ ] **Step 1: Expose build provenance safely**

Expose non-secret provenance fields where available:

- branch
- git SHA
- deployment URL
- Vercel environment

- [ ] **Step 2: Reuse it in preview diagnostics**

Put the same provenance object on public and admin diagnostic surfaces so an operator can compare browser-visible runtime against git and Vercel.

- [ ] **Step 3: Add focused tests**

Verify provenance is present when available and absent safely when not.

**Verification:**

```bash
node --test test/public-origin.test.js test/admin-setup-api.test.js
npm run check:js
git diff --check
```

---

## Task 7: Rehearse The Full Workflow Once

**Files:**

- Modify after rehearsal: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/deployment-ledger.md`

- [ ] **Step 1: Run one full shared-preview rehearsal**

Use a small non-provider change and execute the full workflow:

- branch/worktree start
- focused validation
- pushed commit
- shared preview deployment
- alias confirmation
- ledger entry
- doc sync

- [ ] **Step 2: Run one guarded production rehearsal or dry run**

Use the documented production path up to the final confirmation boundary.

- [ ] **Step 3: Remove temporary freeze language that is replaced by real gates**

Once the gates exist and the rehearsal passes, remove temporary stopgap wording and keep only the durable workflow contract.

**Verification:**

```bash
npm run deploy:preflight
git diff --check
```

---

## Rollback And Safety Notes

- If this plan becomes too large for one slice, implement Tasks 0 through 3 first. They directly address the current wasted time.
- Do not couple this workflow plan to unrelated product changes.
- Do not add new Vercel Functions casually while implementing this plan because the repo is operating at the Hobby limit.
- If there is a tradeoff between richer prose and stronger automation, prefer the automation.

## Recommended Execution Order

1. Task 0: freeze risky paths now.
2. Task 1: branch/worktree discipline.
3. Task 2: deployment ledger.
4. Task 3: diagnostic vs shared preview separation.
5. Task 4: doc ownership cleanup.
6. Task 5: version-control and release gates.
7. Task 6: build provenance on runtime surfaces.
8. Task 7: rehearse the full workflow.

## Expected Outcome

After this plan lands, the repo should no longer depend on memory or cross-referencing multiple stale docs to know what is running where. Shared preview and production should both have an explicit provenance chain: branch -> commit -> deployment -> alias -> verification record.
