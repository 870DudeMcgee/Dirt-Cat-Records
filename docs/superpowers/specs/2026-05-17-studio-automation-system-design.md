# Dirt Cat Records Studio Automation System Design

Date: 2026-05-17
Project: Dirt Cat Records hybrid customer portal, admin dashboard, Google Drive automation, and Resend notifications
Status: Approved direction; ready for user review before implementation planning

## 1. Goal

Build a hybrid studio operations system that makes Dirt Cat Records easy for customers and low-friction for Josh to run.

The system should automate the work around a project without hiding the human parts of mixing and review. Customers should get clear next steps, project status, upload instructions, quotes, revision actions, and final delivery links. Josh should get a private dashboard that shows what needs attention, creates quotes, opens Drive folders, changes project status, and sends delivery/follow-up emails.

## 2. Product Direction

Use Supabase as the workflow brain, Google Drive as the audio file cabinet, Resend as the transactional email system, PayPal as the payment provider, and Vercel Functions as the secure server-side automation layer.

The customer experience is hybrid:

- email remains the primary communication channel
- portal access is available through magic links when customers need to upload, review status, accept quotes, request revisions, approve finals, or pay balances
- no customer passwords are required
- customers can upload through a shared Google Drive folder when possible
- customers can always submit external file links as a fallback

The admin experience is private:

- only Josh's configured admin email can access admin views
- admin tools are focused on actual studio work: leads, quotes, projects, statuses, files, payments, revisions, notes, and delivery
- no multi-admin/team management is required for v1

## 3. Current State

The current project already includes:

- static marketing pages
- package checkout UI
- PayPal API checkout via Vercel Functions
- PayPal webhook handling
- Supabase writes for paid customers and orders
- a `customers`, `orders`, and `project_files` Supabase schema
- tests around checkout pricing, PayPal APIs, PayPal webhooks, and Supabase order persistence

The current project does not yet include:

- real free mix review intake persistence
- customer portal
- admin dashboard
- Supabase Auth magic links
- Google Drive folder automation
- Resend transactional emails
- custom quote workflow
- scheduled follow-up jobs
- project lifecycle automation beyond paid order persistence

## 4. Scope

### In scope for the studio automation system

- Supabase Auth magic-link login for customers
- admin-only access gated by Josh's email
- database expansion for leads, projects, payments, quotes, revisions, events, notes, emails, follow-ups, and Drive references
- real free mix review form submission into Supabase
- lightweight portal account/project creation for free mix review leads
- automatic Google Drive folder creation for free review and paid projects
- Drive upload folder sharing with customer email when possible
- external file link submission fallback
- Resend transactional emails for customer and admin notifications
- custom quote creation from the admin dashboard
- quote acceptance and PayPal payment flow
- conversion of free review projects into paid projects after accepted quote/payment
- order-to-project automation for normal checkout purchases
- deposit balance tracking and final delivery lock
- one included revision request per paid project
- admin ability to allow extra revisions manually
- final delivery link handling
- scheduled follow-up jobs for stale leads, missing files, pending quotes, balances, and approvals
- a private admin dashboard for Josh
- a customer portal for status, files, quotes, revisions, approvals, balances, and delivery

### Out of scope for v1

- full in-browser audio file storage in Supabase Storage
- replacing Google Drive with custom file hosting
- multi-admin/team permissions
- live chat or built-in messaging threads
- advanced invoice/accounting sync
- subscriptions
- customer password accounts
- deep Google Drive file-content syncing or automatic audio analysis
- public customer-facing project galleries
- SMS automation
- native mobile app

## 5. System Architecture

### Supabase

Supabase stores structured state:

- customers
- leads
- orders
- payments
- projects
- project files and external links
- Google Drive folder IDs and URLs
- quotes and quote line items
- revision requests
- project events
- admin notes
- email event records
- follow-up job records

Supabase Auth handles magic-link access. Customer access is scoped to records connected to the authenticated customer's email/user ID. Admin access is allowed only when the authenticated email matches the configured admin email.

### Google Drive

Google Drive stores working files and deliverables:

- client uploads
- reference tracks
- rough mixes
- working files
- final WAV/MP3 deliverables
- project-specific notes or exported documents when useful

The app creates a project folder and subfolders through the Google Drive API. The upload folder is shared with the customer email when possible. If Drive sharing fails or the customer cannot use the shared folder, the portal still accepts external links.

### Resend

Resend sends transactional emails:

- free review confirmation
- paid project confirmation
- upload instructions
- quote sent
- quote reminder
- payment confirmation
- files received
- status update
- revision requested admin notification
- finals ready
- balance due
- final delivery
- approval reminder
- weekly/admin summary

All sent emails are logged to Supabase as `email_events` so the admin dashboard can show communication history and avoid duplicate automated sends.

### PayPal

PayPal remains the payment processor:

- normal checkout purchases
- quote acceptance payments
- remaining balance payments
- webhook-confirmed payment status

Server-side code remains responsible for calculating/validating pricing. Browser-provided prices are never trusted.

### Vercel Functions

Vercel Functions provide secure backend endpoints for:

- form submissions
- authenticated portal actions
- admin actions
- PayPal order creation/capture
- PayPal webhooks
- Google Drive API calls
- Resend email sends
- scheduled follow-up processing

Secrets stay in server-side environment variables only.

## 6. Google Drive Folder Design

Every project gets a predictable Drive structure:

```text
Dirt Cat Records Projects/
  2026/
    DCR-000123 - Artist Name - Project Title/
      01 Client Uploads/
      02 References/
      03 Working/
      04 Finals/
      05 Admin Notes/
```

Folder naming rules:

- use a generated project code such as `DCR-000123`
- include a cleaned artist name and project title when available
- avoid customer email addresses in folder names
- store each Drive folder ID and web URL in Supabase
- parent folders are reused if they already exist

Drive sharing rules:

- share `01 Client Uploads` with the customer email when possible
- keep `03 Working`, `04 Finals`, and `05 Admin Notes` private by default
- final delivery uses a specific final link selected or pasted by Josh
- if sharing fails, mark the Drive automation event as failed and keep the project usable through external link submission

## 7. Customer Portal

Customers access the portal through Supabase magic links. No password setup is required.

Portal capabilities for free review projects:

- view review status
- see upload instructions
- open the shared Drive upload folder if available
- submit external links
- view quote/recommendation when Josh sends one
- accept and pay a custom quote

Portal capabilities for paid projects:

- view project status
- view what Josh needs next
- open shared upload folder if available
- submit external links
- view payment status
- pay remaining balance when applicable
- request one included revision
- approve final delivery
- access final delivery link when unlocked

Customer portal restrictions:

- customers only see projects tied to their customer record
- customers cannot see admin notes
- customers cannot change pricing
- customers cannot unlock final delivery on deposit projects until balance is paid
- customers cannot submit more than the included revision unless Josh allows an extra revision

## 8. Admin Dashboard

Admin access is restricted to Josh's configured email.

Dashboard views:

- inbox: new leads, new paid projects, files submitted, revisions requested, balances due, stale items
- leads: free reviews and unconverted customers
- quotes: drafts, sent, viewed, accepted, expired
- projects: all active projects with status, customer, service, Drive link, balance, and next action
- project detail: timeline, files, links, notes, quote/order/payment history, revision state, emails sent
- follow-ups: pending/sent/skipped reminder jobs

Admin actions:

- open Drive project folder
- open client upload folder
- mark lead/project status
- add private notes
- create custom quote
- send quote
- manually resend customer emails
- allow extra revision
- add final delivery link
- mark finals ready
- trigger final delivery email when payment rules allow it
- close or archive project

The dashboard should prioritize operational clarity over decoration. It should be dense, scannable, and fast to use.

## 9. Free Mix Review Flow

1. Customer submits the free mix review form.
2. Server validates the submission.
3. Supabase creates or updates the customer by email.
4. Supabase creates a lead record.
5. Supabase creates a lightweight project with type `free_review`.
6. Google Drive project folders are created.
7. `01 Client Uploads` is shared with the customer's email when possible.
8. Customer receives a confirmation email with magic-link/portal instructions.
9. Josh receives an admin notification.
10. Project status starts as `awaiting_files`.
11. Customer submits files through Drive or external links.
12. Project status changes to `files_submitted`.
13. Josh reviews, adds notes, and creates a custom quote/recommendation.
14. Customer accepts and pays the quote.
15. The same project converts to a paid project.

This avoids disconnected records and creates a customer account relationship before the first purchase.

## 10. Paid Checkout Flow

1. Customer completes normal package checkout.
2. PayPal confirms/captures payment.
3. Server validates the payment and order metadata.
4. Supabase creates or updates the customer.
5. Supabase creates or updates the order/payment record.
6. Supabase creates a project if one does not already exist for the order.
7. Google Drive project folders are created.
8. `01 Client Uploads` is shared with the customer email when possible.
9. Customer receives payment confirmation and upload instructions.
10. Josh receives a new paid project notification.
11. Success page shows next steps and portal access.

This sequence happens automatically after payment. There is no manual approval step before folder creation or customer email.

## 11. Custom Quote Flow

Josh creates custom quotes from the admin dashboard.

Quote pricing rules:

- base quote starts from the service catalog
- song count drives normal catalog pricing
- add-ons use catalog pricing
- system calculates normal price
- Josh may apply a manual discount or manual adjustment
- quote shows original catalog price, adjustment, final price, payment mode, expiration date, and notes
- server validates the final quote at payment time

Quote states:

- `draft`
- `sent`
- `viewed`
- `accepted`
- `expired`
- `cancelled`

Customer flow:

1. Customer receives quote email.
2. Customer opens quote through portal magic-link flow.
3. Customer reviews service, notes, price, deposit/full-payment rules, and expiration.
4. Customer accepts quote.
5. PayPal payment starts.
6. PayPal webhook confirms payment.
7. Quote becomes `accepted`.
8. Project converts to or continues as a paid project.

## 12. Payment And Deposit Rules

Normal catalog payment rules remain:

- orders under `$500`: full payment required
- orders `$500+`: customer may choose full payment or 50% deposit
- 5+ song projects: deposit option is shown automatically
- backend decides whether deposit is allowed

Delivery lock rules:

- full-payment projects can be delivered when Josh marks finals ready
- deposit projects can reach `finals_ready`, but final customer access remains locked while balance is due
- customer sees balance due and payment call-to-action in portal
- balance payment confirmation unlocks final delivery
- final delivery email sends only after payment rules allow delivery

## 13. Revision Rules

Paid projects include one revision request through the portal.

Revision behavior:

- customer can request one included revision after finals are ready/delivered
- request captures notes and optional external reference links
- project status changes to `revision_requested`
- Josh receives an admin notification
- customer cannot request another included revision after the included revision is used
- Josh can manually allow extra revisions from admin
- extra revision allowance is stored on the project or revision record
- customer can approve final delivery instead of requesting a revision

## 14. Follow-Up Automation

Scheduled follow-ups should run through a server-side scheduled function and log outcomes.

Included v1 follow-ups:

- free review submitted but no files/link after 24 hours: customer reminder
- quote sent but not accepted after 3 days: quote reminder
- paid order but no files after 2 days: upload reminder
- deposit project with finals ready and balance due: balance reminder
- final delivered but not approved after 5 days: approval reminder
- daily admin summary for items needing attention

Follow-up safety rules:

- no duplicate reminder of the same type for the same project inside the configured interval
- no customer follow-up after project is closed/cancelled
- no quote reminder after quote is accepted, expired, or cancelled
- no balance reminder after balance is paid
- every attempted send creates an `email_events` or follow-up log record

## 15. Status Model

Project statuses:

```text
lead_new
awaiting_files
files_submitted
reviewing
quoted
quote_sent
quote_accepted
paid
mixing
revision_requested
revision_in_progress
finals_ready
balance_due
delivered
approved
completed
closed
```

Status expectations:

- `awaiting_files`: customer needs to upload or submit links
- `files_submitted`: customer has provided material and Josh needs to review
- `quoted` / `quote_sent`: Josh has prepared or sent a custom quote
- `paid`: payment is confirmed and project can move into production
- `mixing`: Josh is actively working
- `finals_ready`: finals exist but may be locked by balance rules
- `delivered`: customer has access to final delivery
- `approved`: customer approved the final
- `completed`: admin has closed the completed project
- `closed`: lead/project ended without active work

Every status change should create a `project_events` timeline record.

## 16. Data Model

Tables to add or expand:

- `customers`: customer identity, email, name, auth user link, timestamps
- `leads`: free review intake, interest, source, status, linked customer/project
- `orders`: PayPal order and catalog checkout summary
- `payments`: PayPal capture/payment records, amount, currency, payment purpose
- `projects`: core project record, status, type, customer, order, quote, Drive folder references, balance state
- `project_events`: timeline of status changes and automation events
- `project_files`: submitted links, Drive folder references, final links, file categories
- `quotes`: custom quote header, status, pricing totals, expiration, notes
- `quote_line_items`: service/add-on/adjustment rows for a quote
- `revision_requests`: customer revision requests and allowance state
- `admin_notes`: private notes visible only to Josh
- `email_events`: Resend message tracking and dedupe history
- `followup_jobs`: scheduled reminders and processing state

Security expectations:

- exposed tables have row level security enabled
- customers can only access their own records
- admin-only tables/actions are restricted to Josh's configured admin email
- service role keys are used only in server-side code
- Google and Resend credentials are never exposed to browser JavaScript
- browser actions call server endpoints instead of writing privileged fields directly

## 17. Email Catalog

Customer emails:

- free review received
- upload instructions
- file submission received
- quote sent
- quote reminder
- payment received
- project started
- finals ready but balance due
- final delivery unlocked
- revision request received
- approval reminder

Admin emails:

- new free review lead
- new paid project
- files submitted
- quote accepted
- revision requested
- balance paid
- final approved
- daily attention summary

Email copy should be short, direct, and operational. Each message should include one clear next action.

## 18. Error Handling

Drive automation failures:

- keep project creation successful if Drive folder creation or sharing fails
- log the failure as a project event
- show admin warning on project detail
- allow Josh to retry Drive folder creation/sharing from admin
- keep external link submission available to customers

Email failures:

- log the failed email event
- do not roll back successful payment/project creation
- show admin warning
- allow manual resend from admin

Payment failures:

- do not mark quotes accepted or projects paid until PayPal confirms payment
- keep quote/order pending when payment is abandoned
- show customer a clear retry path

Auth failures:

- do not reveal whether an email belongs to an existing customer in public login responses
- magic-link redirects return customers to the intended portal route after login

## 19. Testing Requirements

Automated tests should cover:

- free review submission creates customer, lead, project, and expected events
- paid PayPal webhook creates order, payment, project, and Drive/email jobs
- quote pricing uses catalog values plus manual adjustment
- quote acceptance creates the correct PayPal order metadata
- deposit projects do not unlock final delivery until balance is paid
- full-payment projects can unlock final delivery when finals are ready
- one included revision is enforced
- admin can allow an extra revision
- customer cannot access another customer's project
- non-admin customer cannot access admin endpoints
- follow-up jobs do not duplicate reminders
- Drive failure does not break project creation
- Resend failure is logged and can be retried

Manual verification should cover:

- customer magic-link login
- admin magic-link login
- free review customer journey
- paid checkout customer journey
- custom quote journey
- Drive folder creation and sharing
- final delivery lock/unlock behavior
- mobile portal readability
- admin dashboard project management workflow

## 20. Phased Delivery

### Phase 1: Foundation

- expand Supabase schema
- add Supabase Auth magic-link configuration
- add server-side authorization helpers
- add Resend email helper and email event logging
- add Google Drive API helper and project folder creation

### Phase 2: Free Review Automation

- replace `mailto:` form with server-backed submission
- create customer, lead, and free review project
- create/share Drive upload folder
- send customer/admin emails
- add basic portal view for free review status and external links

### Phase 3: Paid Project Automation

- extend PayPal webhook flow to create full project records
- create/share Drive folders after payment
- send upload instructions and admin notifications
- show portal next steps after checkout

### Phase 4: Admin Dashboard

- add admin-only dashboard
- manage leads, projects, statuses, files, notes, Drive links, and emails
- add manual retry/resend tools

### Phase 5: Custom Quotes

- create quote builder using catalog pricing plus manual adjustment
- send quote emails
- build customer quote acceptance/payment flow
- convert free review projects into paid projects

### Phase 6: Delivery, Revisions, And Balances

- add final delivery link workflow
- enforce deposit delivery lock
- add balance payment flow
- add one included revision and admin extra revision allowance
- add approval/completion flow

### Phase 7: Follow-Ups And Reporting

- add scheduled reminder processing
- add daily admin summary
- add duplicate-send protection
- add basic operational reporting

## 21. Success Criteria

The system is successful when:

- a free review can become a paid project without re-entering customer information
- paid orders automatically create project records, Drive folders, and customer/admin emails
- customers always know what to do next
- customers can submit files through shared Drive folders or external links
- Josh can manage active work from one dashboard
- custom quotes can be created, sent, accepted, and paid
- deposit projects cannot receive final delivery before balance payment
- one included revision is enforced without manual tracking
- reminders run without duplicate spam
- automation failures are visible and recoverable

## 22. Implementation Defaults

The implementation plan should use these defaults unless a concrete technical blocker appears during implementation:

- Google Drive automation uses OAuth against Josh's Google account and stores the refresh/client credentials in server-side environment variables.
- Portal and admin dashboard are built within the existing static-site/Vercel Functions structure instead of migrating the whole project to a new framework.
- Scheduled jobs use Vercel Cron hitting protected Vercel Function endpoints.
- Resend sender and reply-to are configured through server-side environment variables: `RESEND_FROM_EMAIL` and `RESEND_REPLY_TO_EMAIL`.

All defaults keep secrets server-side and preserve the existing deployment model.
