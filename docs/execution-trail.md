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
