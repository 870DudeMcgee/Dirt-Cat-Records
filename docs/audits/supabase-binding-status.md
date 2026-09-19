# Supabase Binding & Inactive-Status Audit — Dirt Cat Records

- Task: `gh-ai-cli-project-22` (candidate `cand-dirtcat-supabase-inactive-recovery`)
- Workspace: local `870DudeMcgee/Dirt-Cat-Records` checkout (`/Users/josh/Desktop/Dirt-Cat-Records-seo`); this audit is authored in the task worktree on branch `task/gh-ai-cli-project-22-a1`, whose only local ref (`git show-ref`) is that branch, which was created at the base revision below.
- Revision inspected: `873a4a6a03c1dffba843a52953aa1a79b1129520` — "Clean up canonical navigation and public page search previews" (committed 2026-09-06 16:21:34 -0500); 351 commits reachable from it (`git rev-list --count HEAD`).
- Audit performed: 2026-09-19 ~17:45 UTC; every claim below was re-verified 2026-09-19 17:57 UTC (probes reproduced identical results) and again at 18:08 UTC during the repair pass (all conclusions reproduced; only the transient Vercel anycast addresses in §3 had rotated, as reflected below) — read-only throughout. No repository configuration, working-tree state, or remote (Supabase/Vercel) state was modified; every remote probe was a DNS lookup or unauthenticated HTTPS `GET`.

## 1. Configured Supabase project reference and its source

| Source (at `873a4a6`) | Value | Nature |
| --- | --- | --- |
| `.env.example` line 16 | `SUPABASE_URL=https://ossprdfycpdvewpxtsfw.supabase.co` → project ref **`ossprdfycpdvewpxtsfw`** | The only remote Supabase project reference in the tracked tree at this revision. |
| `supabase/config.toml` line 5 | `project_id = "DirtCatRecords"` | Supabase CLI local-development project identifier; not a hosted-project ref. |
| `lib/automation/setup-checks.js` (`SECTION_ENV.database` lines 5–9 / `.portal` line 18), `scripts/check-env-parity.js` lines 41–58 | Require `SUPABASE_URL`, `SUPABASE_PUBLIC_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; the parity script derives required names from the `.env.example` template keys minus its `optionalKeys` set, where line 48 lists the legacy alias `SUPABASE_SECRET_KEY` as optional | Runtime env var names; values are injected by the deployment platform, not stored in the repo. |
| `docs/operator-guide.md` lines 260, 319 | `SUPABASE_URL`: Supabase project URL | Operator documentation of the same binding. |

Source lineage: the `.env.example` reference was introduced by commit `ac6eeb391cb0f7c48ab1bf8c7905987a46683fb4` ("feat: add paypal webhook order tracking", 2026-05-16 19:06:44 -0500) and is unchanged at `873a4a6`. A sweep of **all** locally reachable history (`git log --all -p -S ".supabase.co"`, 20 commits) contains exactly four distinct `*.supabase.co` hosts ever written — `ossprdfycpdvewpxtsfw`, `project`, `dcr`, `scoped` — and `ossprdfycpdvewpxtsfw` is the only 20-character Supabase-ref-shaped token that has ever appeared (`grep -oE "https://[a-z0-9]{20}\.supabase\.co" | sort -u` on that diff stream). In the tracked tree at `873a4a6`, `git grep -hoE "https://[a-z0-9-]+\.supabase\.co"` yields exactly four hosts: `ossprdfycpdvewpxtsfw` (1 occurrence — `.env.example:16`, the real binding) plus mocks `project.supabase.co` (49), `dcr.supabase.co` (6) and `scoped.supabase.co` (2), which live only in `test/` fixtures and two `docs/superpowers/plans/2026-05-17-*.md` examples.

Local sources checked and found **absent** (so they cannot contribute a competing reference): no `.env`, no `.env.local`, no `supabase/.temp/project-ref` (Supabase CLI link state), no `~/.supabase` directory, no `.vercel/` project-link directory, and no `supabase` CLI on `PATH` in this environment.

## 2. Comparison with the currently connected inactive project — result: MATCH

The task candidate identifies the currently connected Supabase project as inactive. In this environment the project the application binds to is defined solely by `SUPABASE_URL` (repository template `.env.example`; runtime value injected per deployment).

- **Configured reference:** `ossprdfycpdvewpxtsfw` (from `.env.example:16` at `873a4a6`, matching the local workspace's current `.env.example:16` on the descendant `codex/seo-indexing-cleanup` branch).
- **Currently connected reference:** `ossprdfycpdvewpxtsfw` — it is the only Supabase project reference discoverable in local configuration or history, and §3's probe confirms that endpoint, and no other candidate endpoint, is the binding target's current (failed) address.
- **Verdict: MATCH (non-divergent binding).** There is no evidence of a stale or second configured reference pointing at a different project; the inactive project is the one and only project the repository is bound to.

Exact missing evidence (items that would strengthen, but cannot reverse, this verdict and were not obtainable under this task's permissions):
1. The hosted platform's authoritative status string for `ossprdfycpdvewpxtsfw` (Supabase dashboard / Management API `state`, e.g. `INACTIVE`/`PAUSED`, plus pause/resume timestamps). Unobtainable here: the Supabase CLI is not installed and no access token exists locally.
2. The live Vercel production/preview environment value of `SUPABASE_URL`. Unobtainable here: no `.vercel/` link exists in the workspace and Vercel CLI queries are outside this task's allowed command set (and would consult remote state).
3. Whether the project was paused (recoverable via restore) or deleted (requires reprovision from `supabase/schema.sql` + data backup). Distinguishing evidence lives only in Supabase platform metadata.

## 3. Current status / reachability metadata (read-only probes, 2026-09-19 ~17:45 UTC)

Probes executed with `python3` (`socket.getaddrinfo`, `urllib.request`) — DNS lookups and unauthenticated HTTPS GETs only; nothing mutating:

| Probe | Result |
| --- | --- |
| DNS `ossprdfycpdvewpxtsfw.supabase.co` | **FAILED** — `socket.gaierror [Errno 8] nodename nor servname provided, or not known` (no address records) |
| HTTPS `GET https://ossprdfycpdvewpxtsfw.supabase.co/rest/v1/` | **FAILED** — same name-resolution error (no TCP/TLS to project endpoint) |
| HTTPS `GET https://ossprdfycpdvewpxtsfw.supabase.co/auth/v1/settings` | **FAILED** — same |
| Control DNS `supabase.co` | OK → `76.76.21.21`; control `GET https://supabase.co` → HTTP 200 |
| Control DNS `www.dirtcatrecords.com` | OK → Vercel anycast addresses, which rotate between resolutions (`66.33.60.129`, `76.76.21.22` at first probe; `66.33.60.35`, `76.76.21.123` at the 18:08 UTC re-probe); control `GET https://www.dirtcatrecords.com` → HTTP 200 on both probes |

Interpretation: the failure is specific to the project subdomain — not a local network or DNS problem. The Supabase project endpoint for `ossprdfycpdvewpxtsfw` is currently unreachable/unresolved, which is consistent with the reported **inactive** status; meanwhile the Vercel-served public site remains reachable.

## 4. Service-continuity metadata (as available locally, without changing remote state)

- **Public site:** live. `https://www.dirtcatrecords.com` returned HTTP 200 during the probe. Served by Vercel; `vercel.json` routes `/api/*` to the `api/public` and `api/studio` functions.
- **Deployment continuity records:** `docs/deployment-ledger.md` — most recent recorded production deployment `2026-07-21T14:59:59Z` at rev `fac51ff…` aliased to `https://www.dirtcatrecords.com` (Vercel project slug pattern `dirt-cat-records-projects`).
- **Surfaces that degrade while the project is unreachable** (each reads `SUPABASE_URL` at runtime): customer portal auth (magic-link OTP) and actions; admin overview/projects/quotes/setup-wizard; checkout config (which hands `supabaseUrl` + public key to browsers); free-review and project-support submissions; PayPal capture/webhook order records; the follow-ups cron. `docs/execution-log.md` (e.g. lines 668–676, 1099–1100) records that production environment variables, including the `SUPABASE_*` names, were provisioned and queried successfully during earlier operational checks.
- **What Supabase holds:** customer auth identities (`/auth/v1/user`, `/auth/v1/admin/users`) and all studio records via `/rest/v1` — the 14 public tables defined in `supabase/schema.sql`: `customers, orders, project_files, projects, leads, payments, quotes, quote_line_items, project_events, revision_requests, admin_notes, email_events, automation_test_runs, followup_jobs` (plus the service-role model; README lines 86, 185–187).
- **What Supabase does *not* hold:** delivered audio/file storage — the automation "storage" section binds to Google Drive (`lib/automation/setup-checks.js` `SECTION_ENV.storage`); no Supabase-storage bucket references exist anywhere in the tree.
- **Rebinding requirements:** any restored or replacement project must be re-expressed as the values for `SUPABASE_URL`, `SUPABASE_PUBLIC_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (+ alias `SUPABASE_SECRET_KEY`) in the Vercel environment, and `.env.example:16` updated in-repo; the client-side pages take the URL through the checkout-config endpoint, so no HTML constant needs editing. Local dev (`npm run dev:stack` → `npx supabase start`) and `supabase/schema.sql` provide a reprovision path for schema; **no repository-side data backup or PITR artifact exists** — historical row data can only come from the Supabase platform (§2 missing evidence).
- **`supabase/config.toml` network restrictions:** `enabled = false` with default open CIDRs, so a network-restriction change is not a plausible cause of unreachability.

## 5. Repository paths that depend on the matched project

Consumers of `SUPABASE_URL` / Supabase endpoints, all relative to `873a4a6`:

| Path | Dependency |
| --- | --- |
| `.env.example` (line 16) | Defines the project reference (only literal in tree) |
| `lib/db/supabase-orders.js`, `lib/db/studio-records.js`, `lib/db/authorized-records.js` | REST read/write of the 14 tables via `/rest/v1` |
| `lib/auth/supabase-auth.js` (→ `/auth/v1/user`), `lib/auth/supabase-admin.js` (→ `/auth/v1/admin/users`) | Customer and admin authentication |
| `lib/api/checkout-config.js` (line 34) | Publishes `supabaseUrl` to browser clients |
| `lib/automation/setup-checks.js`, `lib/env/runtime-fingerprint.js` | Validate/derive `SUPABASE_PROJECT_REF` from the URL |
| `scripts/check-env-parity.js` | `SUPABASE_*` env-name parity checks |
| `portal.js` (lines 1–71), `admin.js` (lines 2–74) | Browser clients: `window.supabase.createClient(config.supabaseUrl, …)` |
| `portal.html:52`, `admin.html:140` | Load `@supabase/supabase-js@2` CDN bundle |
| `api/cron/follow-ups.js`, `lib/api/portal/actions.js`, `lib/api/admin/overview.js`, `lib/api/admin/projects.js`, `lib/api/admin/quotes.js`, `lib/api/admin/setup-wizard.js`, `lib/api/public/free-review.js`, `lib/api/public/project-support.js` | Function entrypoints that reach the project through the modules above |
| `supabase/config.toml`, `supabase/schema.sql`, `supabase/.gitignore` | Local CLI/schema assets for the bound database |
| `package.json` | `supabase` devDependency (`^2.101.0`) and `dev:stack` script |
| `README.md`, `docs/operator-guide.md`, `docs/execution-log.md` | Documentation of the binding and its operational history |
| `test/` (10 files, e.g. `test/supabase-orders.test.js`) | Depend on Supabase-shaped interfaces but only mock placeholder hosts — unaffected by project inactivity |

## 6. Conclusion

The repository revision `873a4a6` binds to exactly one Supabase project, ref **`ossprdfycpdvewpxtsfw`** (source: `.env.example:16`, lineage commit `ac6eeb3`), and that reference **matches** the currently connected (inactive) project — there is no competing or stale binding in configuration or history. As of the 2026-09-19 probes the project endpoint no longer resolves (DNS + HTTPS failure) while control hosts succeed, corroborating the inactive status; the authoritative platform status string and the live Vercel env value remain the exact evidence gaps recorded in §2. Public-site continuity is intact; all authenticated/administrative data surfaces listed in §5 are dependent on restoring or reprovisioning that project. No remote state was changed by this audit.
