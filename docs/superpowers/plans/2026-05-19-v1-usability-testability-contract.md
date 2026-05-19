# Dirt Cat Records V1 Usability And Testability Contract

Date: 2026-05-19
Status: In progress with one-click owner proof flow implemented locally

## Why This Exists

The current implementation has grown quickly, but the operator experience is still too hard to validate end-to-end. This contract defines the smallest usable and testable V1 so the owner can personally run the complete admin and customer workflow with dummy data.

## V1 Scope

In scope:

1. Deposit/quote payment intake through PayPal and webhook processing.
2. Portal rendering of next actions by project state.
3. Admin project controls for status, notes, finals-ready, delivery lock/unlock, and optional balance-due email.
4. Balance payment flow that unlocks final delivery after full payment.
5. Final approval flow from customer portal once delivery is unlocked.
6. Deterministic local/sandbox validation path using dummy data.

Out of scope for this slice:

1. Stage 6 reminder automation (cron follow-ups).
2. New product surfaces not required for the workflows above.
3. Additional role models or multi-admin permissions.

## Desired Behavior

1. Customer always sees one clear next step in portal language.
2. Customer never sees state-invalid actions.
3. Admin cannot bypass delivery lock rules accidentally.
4. Duplicate webhook/retry actions remain idempotent and safe.
5. Owner can run a single checklist and confirm pass/fail without guessing.

## Canonical V1 Workflows

### Workflow A: Paid Intake To Active Project

1. Customer completes checkout or quote payment.
2. Webhook parses payment purpose and routes to correct workflow handler.
3. Project is created/updated with expected status and timeline event.
4. Customer receives portal/email next-step guidance.

### Workflow B: Finals Ready With Balance Lock

1. Admin sets final delivery URL and keeps delivery locked if balance remains.
2. Admin can send finals-ready balance-due email.
3. Portal shows balance due action and hides final approval while locked.

### Workflow C: Balance Payment Unlock

1. Customer initiates balance payment from portal.
2. Webhook applies payment to existing project.
3. Delivery unlocks only when remaining balance reaches zero.
4. Portal reveals final delivery and approval action.

### Workflow D: Final Approval

1. Customer approves final delivery in portal.
2. Approval action is accepted only for unlocked, eligible projects.
3. Timeline/event log reflects approval exactly once.

## Dummy Data Test Harness Requirements

V1 is not done until all items below exist and are documented:

1. A repeatable way to create demo customer + project records without manual DB editing.
2. A repeatable way to simulate each payment purpose (checkout, quote, balance).
3. A repeatable way to force project into finals-ready locked state for balance testing.
4. A single scripted checklist that exercises both admin and customer surfaces.
5. A reset/cleanup path that removes dummy artifacts between runs.
6. A one-click owner trigger that runs the scenario and shows both admin and customer-facing states without session switching.

## Acceptance Checklist (Owner-Run)

1. Start local runtime and confirm setup checks pass in admin.
2. Create dummy project in a known state.
3. Open admin project detail and verify status/financial fields are coherent.
4. Open customer portal for same project and verify expected next action.
5. Mark finals ready from admin with balance due notification enabled.
6. Verify portal shows pay-balance action and hides approval while locked.
7. Execute dummy/sandbox balance payment and process webhook.
8. Verify delivery unlock state and final delivery visibility in portal.
9. Approve final from portal and verify event log.
10. Run automated tests and syntax checks.

Pass criteria:

1. All checklist steps succeed with no manual data patching.
2. Automated suite passes.
3. Any failure reproduces with clear logs and stable repro steps.

## New-Agent Execution Plan

The next agent should execute this in four isolated tasks, one subagent per task:

1. Task 1: Audit current test/dummy-data paths and identify missing seams.
2. Task 2: Implement a deterministic dummy-data setup path for owner-driven E2E checks.
3. Task 3: Implement cleanup/reset path and document the exact commands.
4. Task 4: Add/adjust integration tests and publish a final owner checklist.

Each task must stop at a review gate before moving to the next task.

## Skills To Use In The Next Session

Use these exact skills from the confirmed installed roots:

1. /Users/jewelbait/.claude/skills/productivity/handoff/SKILL.md
2. /Users/jewelbait/.claude/skills/engineering/improve-codebase-architecture/SKILL.md
3. /Users/jewelbait/.claude/skills/engineering/grill-with-docs/SKILL.md
4. /Users/jewelbait/.claude/skills/engineering/tdd/SKILL.md

Optional process skill if available in that agent runtime:

1. /Users/jewelbait/.agents/skills/using-superpowers/SKILL.md
2. /Users/jewelbait/.agents/skills/subagent-driven-development/SKILL.md

## Hard Guardrail For The Next Agent

If the requested skill path cannot be found:

1. Stop immediately.
2. Ask the user to confirm skill root and exact path.
3. Do not continue coding until resolved.
