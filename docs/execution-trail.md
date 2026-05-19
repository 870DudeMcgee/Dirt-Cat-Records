# Execution Trail Protocol

This protocol is required for all implementation work so there is a clear trail of:

- what will be done;
- what has been done;
- what still needs to be done.

## Step Loop (Required)

For each implementation step, run this loop in order.

1. Pre-step context check.
2. Step intent capture.
3. Single bounded implementation.
4. Post-step validation and context re-check.
5. Next-step delta capture.

Do not start a new step until the current step is logged in `docs/execution-log.md`.

## Pre-Step Context Check

Confirm both plan and codebase context before touching code.

Plan check:

1. Identify the roadmap stage/sub-task in `docs/roadmap.md`.
2. Confirm applicable constraints in `CONTEXT.md` and relevant ADR files.
3. Confirm current focus in `docs/agent-handoff.md`.

Codebase check:

1. `git status -sb`
2. `git log -1 --oneline --decorate`
3. Read target files and nearest tests for the step.

## Post-Step Validation Check

Run the narrowest useful validation first, then broader checks as needed.

Minimum expectations:

1. Targeted tests for touched behavior.
2. `npm run check:js` when JS files changed.
3. `git diff --check` before finalizing the step.

When preparing to ship a slice, also run:

1. `npm run deploy:preflight`
2. Confirm `.husky/pre-push` is still present so `git push` enforces the same preflight automatically.

## Credential Sanity Gate (Required Before Commit And Push)

Before any commit/push that is meant to be runtime-ready, run this gate:

1. Compare `.env.local` and target Vercel env values against `.env.example`.
2. Confirm `GOOGLE_DRIVE_PROJECTS_FOLDER_ID` is the raw folder id only, not the full Google Drive URL.
3. Start local runtime with `npx vercel dev`.
4. Run:

```bash
curl -sS "http://localhost:3000/api/admin/setup-wizard?action=setup"
```

5. If `setup.sections.storage.status` is `failed`, stop and fix credentials before committing/pushing as ready.
6. If the step touches provider workflows, run the relevant simulation/sandbox validation before pushing.
7. Do not bypass the Husky `pre-push` preflight unless you intentionally want a non-deployable push.

## Required Log Record Format

Append one entry per step to `docs/execution-log.md` using this exact structure:

```md
## Step N - <short title>

Date/Time:
Owner:
Roadmap link:

### Will Be Done

- <single bounded implementation objective>

### Context Check (Before)

- Plan docs reviewed: <files>
- Codebase state: <git status summary>
- Target files/tests: <files>

### Done

- <concrete changes completed>

### Context Check (After)

- Validation run: <commands + result>
- Codebase delta summary: <files changed>

### Needs To Be Done Next

- <next immediate bounded step>
- <risks/blockers if any>
```

## Scope Discipline

- One step should map to one coherent behavior slice.
- If scope expands, close and log the current step first, then open a new step.
- If validation fails, keep working the same step until it is either fixed or explicitly blocked.
