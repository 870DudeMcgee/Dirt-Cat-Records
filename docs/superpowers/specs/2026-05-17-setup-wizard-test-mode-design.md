# Setup Wizard And Test Mode Design

## Goal

Build a streamlined owner-facing setup and testing experience for the Dirt Cat Records automation system, while keeping the core structure reusable as a template for other businesses.

The owner should not need to remember the full manual checklist for Supabase, Google Drive, Resend, PayPal, portal auth, customer actions, and cleanup. The system should guide them step by step, run automated checks, produce a readable report, and keep test data clearly separated from real customer data.

## Product Direction

The feature will live primarily inside the Josh-only admin dashboard as a guided **Setup** section. It should feel like a step-by-step wizard, not a developer checklist.

The implementation should be hybrid:

- A friendly admin UI for the business owner.
- Reusable backend services and test runners behind the UI.
- Optional scriptable/testable units so future template projects can verify the same automation without relying only on manual browser clicks.

The first visible version can use Dirt Cat Records wording, but the core configuration and runner should avoid hardcoding Dirt Cat-specific assumptions.

## Wizard Sections

### 1. Business Profile

The wizard collects or displays the current business-level configuration:

- Business name.
- Admin email.
- Public site URL.
- Support/reply-to email.
- Test subject prefix, defaulting to `[TEST]`.
- Test Drive folder prefix, defaulting to `TEST`.

For Dirt Cat Records, these values can initially come from environment variables and static config. The underlying shape should be reusable:

```js
{
  businessName: 'Dirt Cat Records',
  adminEmail: process.env.ADMIN_EMAIL,
  siteUrl: process.env.SITE_URL,
  testPrefix: '[TEST]',
  driveFolderPrefix: 'TEST',
  providers: {
    database: 'supabase',
    storage: 'google_drive',
    email: 'resend',
    payments: 'paypal',
    auth: 'supabase_magic_link',
  },
}
```

### 2. Database

The wizard verifies Supabase readiness:

- `SUPABASE_URL` exists.
- Server-side service role key exists.
- Public key exists for browser auth.
- Required operations tables exist.
- Required columns for test markers and metadata exist or the system has a compatible fallback.
- Basic insert/read/update checks can run in test mode.

The UI should show clear pass/fail status per check. It should not expose secrets.

### 3. Storage

The wizard verifies Google Drive readiness:

- Google OAuth credentials exist.
- Refresh token exists.
- Root projects folder id exists.
- Root folder is reachable.
- A test folder can be created.
- Upload/finals subfolders can be created.
- Upload folder sharing can be attempted with a test customer email.
- Test folders can be cleaned up.

Failures should explain whether the issue is missing config, auth failure, folder permission failure, or sharing failure.

### 4. Email

The wizard verifies Resend readiness:

- API key exists.
- From email exists.
- Reply-to email exists.
- Test email can be sent to admin or an explicitly configured test recipient.
- Email event logging works.

All test emails must include the configured test prefix in the subject.

### 5. Payments

The wizard verifies PayPal readiness:

- Sandbox/live mode is visible.
- Client id exists.
- Client secret exists server-side.
- Webhook id exists.
- Webhook route can parse a completed payment event.
- Paid project workflow can be run from a sandbox-like completed event.

The first implementation does not need to force a live PayPal browser checkout inside the wizard. It should support a practical sandbox validation path that proves the webhook and paid-project automation can process a completed sandbox-style event safely.

### 6. Portal

The wizard verifies customer portal readiness:

- Public Supabase config endpoint works.
- Magic link auth configuration is present.
- Customer project lookup works for a test customer.
- External link submission works.
- Revision request works.
- Final approval action works.

Portal checks should run against test projects only.

### 7. Automation Test

The wizard exposes the operational test actions:

- Run simulation.
- Run sandbox end-to-end.
- View report.
- Clean up test data.

Each run should be presented as a readable step report, not raw JSON.

## Test Modes

### Simulation Mode

Simulation mode is the fast confidence check. It should avoid real external side effects where possible.

It verifies:

- Business config can be loaded.
- Supabase helper boundaries can be exercised safely.
- Free review workflow runs with fake Drive and fake Resend adapters.
- Paid project workflow runs with fake Drive, fake Resend, and sandbox-like PayPal input.
- Portal actions work against a test project.
- Expected project events, email events, and workflow outputs are produced.

Simulation mode must not create persistent external artifacts. It should use fake provider adapters and mocked Supabase request layers so it can run quickly and repeatedly without cleanup. Any Supabase behavior that requires real persistence belongs in sandbox mode.

### Sandbox End-To-End Mode

Sandbox mode is the full dress rehearsal. It uses real integration systems configured for testing.

It verifies:

- Supabase creates real marked test records.
- Google Drive creates real test folders.
- Upload and finals folders are created.
- Upload folder sharing is attempted with the test customer email.
- Resend sends `[TEST]` emails to the configured recipient.
- PayPal sandbox-style payment data can trigger the paid project workflow.
- The customer portal can load and mutate the test project.

Sandbox mode must never use live customer emails unless the admin intentionally enters that email as the test recipient.

## Test Run Tracking

Every test run receives a unique `test_run_id`.

The runner should record:

- Test run id.
- Mode: `simulation` or `sandbox`.
- Status: `running`, `passed`, `failed`, or `cleaned`.
- Started timestamp.
- Finished timestamp.
- Business config snapshot with secrets redacted.
- Step results.
- Created Supabase records.
- Created Google Drive folder ids.
- Sent email ids or simulated email events.
- PayPal event ids or simulated payment references.
- Warnings.
- Errors.
- Cleanup status.

Where database schema allows, test-created records should carry the `test_run_id` in metadata. Where a table does not have metadata, the run should log the created row id in the test report so cleanup can target only known test artifacts.

## Test Data Marking

Test mode must make test artifacts obvious.

Supabase:

- Project titles should include a test prefix.
- Project events should include the `test_run_id`.
- Email events should include the `test_run_id` when metadata is available.

Google Drive:

- Test project folders should be named with a clear prefix, such as `TEST - 2026-05-17 - Dirt Cat Demo`.

Email:

- Test email subjects must begin with `[TEST]`.

Portal:

- Test projects should visually read as test projects in the admin report. The customer-facing portal does not need a special banner for the first version.

## Cleanup

Cleanup is explicit, not automatic.

The admin can review the run report first, then press **Clean Up Test Data**.

Cleanup must:

- Refuse to act unless a `test_run_id` is present.
- Only target artifacts associated with that run.
- Delete Google Drive test folders when possible.
- Mark Supabase test projects/leads/payments/events as cleaned, closed, or archived when deletion would be risky due to relationships.
- Log cleanup failures clearly.
- Never delete non-test data.

Cleanup does not need to recall or delete sent emails. It should mark email events as test artifacts and report which emails were sent.

## Admin UI Behavior

The Setup section should show:

- Overall readiness status.
- Per-section status.
- Last run summary.
- Buttons for simulation, sandbox run, and cleanup.
- A step-by-step report with clear success/failure labels.

The UI should prioritize actionability:

- Missing configuration should say which environment variable is missing.
- Provider failures should identify the provider and operation.
- Partial failures should show what succeeded before the failure.
- Cleanup failures should show exactly which artifact could not be cleaned up.

## Security And Access

Only the configured admin email can access setup and test-mode endpoints.

The browser must never receive service role keys, client secrets, refresh tokens, or Resend API keys.

The admin UI can display whether a secret is present, but not the secret value.

Test endpoints must require the same admin authorization as the rest of the admin dashboard. If an endpoint runs external side effects, it must reject unauthenticated and non-admin requests before doing any work.

## Template Reuse

The reusable layer should be business-agnostic:

- `businessConfig` defines branding and provider choices.
- Provider adapters expose a common check/run/cleanup surface.
- The test runner coordinates steps and reports results.
- The Dirt Cat UI consumes the generic report and labels it for the current business.

This allows the same pattern to be reused for other businesses that need:

- Customer intake.
- Paid checkout or deposit flow.
- File collection.
- Email notifications.
- Portal actions.
- Admin-only operational testing.

## Out Of Scope For First Version

The first version does not need:

- A generic no-code template marketplace.
- Multiple business accounts in the same deployment.
- Live PayPal payment creation inside the wizard.
- Automatic destructive cleanup after every run.
- Real-time streaming logs.
- Custom visual wizard theming per business.

These can be added after the first wizard and runner are working reliably.

## Success Criteria

The feature is successful when:

- Josh can open the admin setup wizard and see whether the system is ready.
- Josh can run a simulation test without touching real external systems.
- Josh can run a sandbox test that creates clearly marked test artifacts across Supabase, Drive, Resend, and the paid-project workflow.
- Josh can review a human-readable run report.
- Josh can clean up the test run without risking real customer data.
- The core runner is generic enough to reuse for another business template.
