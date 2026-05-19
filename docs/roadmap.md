# Dirt Cat Records Roadmap

This document tracks the staged work needed to turn the current site, checkout, portal, and automation foundation into a reliable studio operations system.

For current handoff context, see [`docs/agent-handoff.md`](agent-handoff.md).

## Stage 0: Stabilize The Source Of Truth

Goal: make the repo clean, understandable, and hard to misuse.

- [x] Expand setup documentation in `README.md`.
- [x] Expand `.env.example` so it matches the app's real runtime requirements.
- [x] Expand `.gitignore` for local, OS, and dependency noise.
- [x] Decide how to handle the large audio assets currently committed under `assets/`: keep the current WAV files for now, then replace the site previews with MP3 versions later.
- [ ] Confirm a fresh clone can be configured from docs.
- [x] Run `npm test`.
- [x] Run `npm run check:js`.

## Stage 1: Replace The Manual Paid Intake Flow

Goal: after payment, customers should follow the automated portal/email workflow instead of a `mailto:` intake form.

- [x] Update `success.html` to confirm payment and point users to portal/email instructions.
- [x] Update `success.js` to show the paid order summary without implying manual intake is the primary workflow.
- [x] Keep webhook-created projects, Drive folders, and upload-instruction emails as the source of truth.
- [x] Add or update tests for the paid success flow where practical.

## Stage 2: Make The Customer Portal Feel Real

Goal: customers should see clear next steps and only the actions that apply to the current project state.

- [x] Add status labels and next-step copy.
- [x] Hide final approval until final delivery is ready.
- [x] Show revision availability and used/included revision counts.
- [x] Show balance due and delivery-lock state.
- [x] Add a useful empty state when no projects are found.
- [x] Improve portal action error handling.

## Stage 3: Build Josh's Operational Admin Dashboard

Goal: manage real studio work from one private dashboard.

- [x] Add admin overview data for leads, awaiting files, active projects, revisions, finals, balances, and recent activity.
- [x] Add project detail view with customer info, timeline, Drive links, files, revisions, payments, and email events.
- [x] Add admin status update action.
- [x] Add admin notes.
- [x] Add final delivery URL and unlock actions.
- [x] Add extra revision allowance action.
- [x] Keep setup/sandbox tools available as a setup section.

## Stage 4: Custom Quote Workflow

Goal: convert free reviews and custom projects into paid work without manual payment handling.

- [x] Add `api/admin/quotes.js` for creating and sending quotes.
- [x] Add quote persistence helpers in `lib/db/studio-records.js`.
- [x] Build quote line items from catalog pricing plus manual adjustments.
- [x] Send quote emails through Resend.
- [x] Show quote cards in the customer portal.
- [x] Add `api/portal/accept-quote.js`.
- [x] Extend PayPal metadata and webhook handling for quote payments.
- [x] Mark accepted quotes and converted projects correctly after PayPal confirmation.

## Stage 5: Balance Payments And Delivery Locks

Goal: make deposits and final delivery safe and clear.

- [ ] Add balance payment endpoint.
- [ ] Add portal balance payment action.
- [ ] Extend PayPal webhook handling for balance payments.
- [ ] Keep final files locked until the balance is paid.
- [ ] Let admin mark finals ready and send balance-due email.
- [ ] Unlock final files after full payment.

## Stage 6: Follow-Ups

Goal: reduce stale leads, missing files, pending quotes, unpaid balances, and unapproved finals.

- [ ] Add follow-up selector logic.
- [ ] Add protected Vercel cron route.
- [ ] Add reminders for missing files.
- [ ] Add reminders for pending quotes.
- [ ] Add reminders for balance due.
- [ ] Add reminders for final approval.
- [ ] Prevent duplicate pending follow-up jobs.
- [ ] Log every follow-up attempt.

## Stage 7: Live Launch Hardening

Goal: verify the complete production story before relying on it for real clients.

- [ ] Run the admin sandbox test against real providers.
- [ ] Verify PayPal sandbox checkout and webhook.
- [ ] Verify Supabase magic link redirects on the production domain.
- [ ] Verify Resend sender domain, reply-to, and deliverability.
- [ ] Verify Google Drive folder creation and sharing permissions.
- [ ] Verify Vercel environment variables are set for production.
- [ ] Document the launch checklist in `README.md`.
