# Workflow

This document owns the operator workflow for branch discipline, deployment provenance, preview classes, and alias rules.

## Branch Roles

- `main`: integration and release branch.
- `wip/<topic>`: active implementation branch for planned work.
- `fix/<topic>`: active implementation branch for bug fixes or recovery work.
- optional git worktree: use when task isolation matters, when you need a clean `main` checkout for comparison, or when parallel slices would otherwise fight over one worktree.

## Standard Start-Work Flow

Run this sequence before implementation:

1. `git status -sb`
2. `git log -1 --oneline --decorate`
3. create or switch to the task branch
4. create a task worktree if isolation matters
5. only then start implementation

## Dirty `main` Is Recovery, Not Normal Operation

If `main` is dirty, do not normalize it as the place where new work continues.

Recovery options:

1. commit the intended slice and push it from the right task branch;
2. move the work onto `wip/<topic>` or `fix/<topic>` before continuing;
3. create a task worktree if the current checkout must remain available for comparison.

## Deployment Provenance Rule

If a deployment matters beyond personal debugging, record it in [`docs/deployment-ledger.md`](deployment-ledger.md) with `npm run record:deployment -- --env <preview|production> --url <deployment-url> --alias <alias-or-none> --purpose <test-purpose> --verifier <name>`.

## Preview Classes

- diagnostic preview: ad hoc validation surface, including local CLI-driven deploys; useful for debugging, not trustworthy for shared sign-off;
- shared preview: team-facing preview tied to a pushed SHA, recorded in [`docs/deployment-ledger.md`](deployment-ledger.md), and eligible for the stable preview alias.

## Alias Rules

The stable preview alias can point only at the current shared preview deployment.

Do not point the stable preview alias at:

1. a dirty-worktree deploy;
2. an untracked diagnostic deployment;
3. a deployment whose pushed SHA has not been confirmed.

## Retest Contract

Before any external retest, confirm all three facts:

1. the current shared preview deployment URL;
2. the stable preview alias target;
3. the pushed git SHA for that deployment.
