# Supabase Binding & Inactive-Status Audit — Dirt Cat Records

- Task: `gh-ai-cli-project-22` (candidate `cand-dirtcat-supabase-inactive-recovery`)
- Workspace: local `870DudeMcgee/Dirt-Cat-Records` checkout (`/Users/josh/Desktop/Dirt-Cat-Records-seo`); this audit is authored in the task worktree on branch `task/gh-ai-cli-project-22-a1`, whose only local ref (`git show-ref`) is that branch, which was created at the base revision below.
- Revision inspected: `873a4a6a03c1dffba843a52953aa1a79b1129520` — "Clean up canonical navigation and public page search previews" (committed 2026-09-06 16:21:34 -0500); 351 commits reachable from it (`git rev-list --count HEAD`).
- Audit performed: 2026-09-19 ~17:45 UTC; claims re-verified 2026-09-19 17:57 UTC (probes reproduced identical results) and at 18:08 UTC during the first repair pass (observations reproduced; only the transient Vercel anycast addresses in §3 had rotated, as reflected below). Repair pass 2 (2026-09-19 18:14 UTC) re-ran the same read-only probes — §3 results reproduced exactly (project host still DNS/HTTPS-failed; controls OK; `www.dirtcatrecords.com` resolved to `66.33.60.194`/`76.76.21.93` and served HTTP 200) — and revised the §2 comparison verdict from the previously asserted `MATCH` to **incomplete / not independently provable from the authorized evidence**: the live platform-injected `SUPABASE_URL` value and the authoritative Supabase project identity/state were never observed in this environment, so no authorized evidence proves which project the deployed application currently connects to. That revision is a correction of what the evidence can support, not a new observation. Read-only throughout: no repository configuration, working-tree state, or remote (Supabase/Vercel) state was modified; every remote probe was a DNS lookup or unauthenticated HTTPS `GET`.

## 1. Configured Supabase project reference and its source

| Source (at `873a4a6`) | Value | Nature |
| --- | --- | --- |
| `.env.example` line 16 | `SUPABASE_URL=https://ossprdfycpdvewpxtsfw.supabase.co` → project ref **`ossprdfycpdvewpxtsfw`** | The only remote Supabase project reference in the tracked tree at this revision. |
| `supabase/config.toml` line 5 | `project_id = "DirtCatRecords"` | Supabase CLI local-development project identifier; not a hosted-project ref. |
| `lib/automation/setup-checks.js` (`SECTION_ENV.database` lines 5–9 / `.portal` line 18), `scripts/check-env-parity.js` lines 41–58 | Require `SUPABASE_URL`, `SUPABASE_PUBLIC_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; the parity script derives required names from the `.env.example` template keys minus its `optionalKeys` set, where line 48 lists the legacy alias `SUPABASE_SECRET_KEY` as optional | Runtime env var names; values are injected by the deployment platform, not stored in the repo. |
| `docs/operator-guide.md` lines 260, 319 | `SUPABASE_URL`: Supabase project URL | Operator documentation of the same binding. |

Source lineage: the `.env.example` reference was introduced by commit `ac6eeb391cb0f7c48ab1bf8c7905987a46683fb4` ("feat: add paypal webhook order tracking", 2026-05-16 19:06:44 -0500) and is unchanged at `873a4a6`. A sweep of **all** locally reachable history (`git log --all -p -S ".supabase.co"`, 20 commits) contains exactly four distinct `*.supabase.co` hosts ever written — `ossprdfycpdvewpxtsfw`, `project`, `dcr`, `scoped` — and `ossprdfycpdvewpxtsfw` is the only 20-character Supabase-ref-shaped token that has ever appeared (`grep -oE "https://[a-z0-9]{20}\.supabase\.co" | sort -u` on that diff stream). In the tracked tree at `873a4a6`, `git grep -hoE "https://[a-z0-9-]+\.supabase\.co"` yields exactly four hosts: `ossprdfycpdvewpxtsfw` (1 occurrence — `.env.example:16`, the real binding) plus mocks `project.supabase.co` (49), `dcr.supabase.co` (6) and `scoped.supabase.co` (2), which live only in `test/` fixtures and two `docs/superpowers/plans/2026-05-17-*.md` examples.

Local sources checked and found **absent** (so they cannot contribute a competing reference): no `.env`, no `.env.local`, no `supabase/.temp/project-ref` (Supabase CLI link state), no `~/.supabase` directory, no `.vercel/` project-link directory, and no `supabase` CLI on `PATH` in this environment.

## 2. Comparison with the currently connected inactive project — result: INCOMPLETE (not independently provable from the authorized evidence)

The task candidate identifies the currently connected Supabase project as inactive. The project the *deployed application currently connects to* is determined at runtime by the live, platform-injected `SUPABASE_URL` value; the repository carries only a **template** of that value (§1). These are distinct facts, and only the live value is authoritative for "currently connected." Neither the live value nor the hosted platform's project identity/state is observable under this task's permissions, so the comparison **cannot be completed as proven** from local evidence alone.

- **Configured reference:** `ossprdfycpdvewpxtsfw` — from `.env.example:16` at `873a4a6` (same literal at the local workspace's current `.env.example:16` on the descendant `codex/seo-indexing-cleanup` branch, HEAD `905d029`, re-read read-only 2026-09-19 18:14 UTC). It is the only Supabase project reference discoverable in local configuration or history.
- **Currently connected reference:** **not determined from the authorized evidence.** §3 shows the configured reference's endpoint currently fails to resolve — consistent with a project reported inactive — but a repository template plus a DNS failure for its host does not prove which project the deployed application currently uses. The live value could equal this reference or differ from it; if it differs, any assumed identity fails.
- **Verdict: comparison INCOMPLETE.** What the authorized evidence does support is the weaker statement: no second or stale reference competes *within the repository* (the one real binding literal in config/history is `ossprdfycpdvewpxtsfw`), and its endpoint's unreachability does not contradict the reported inactive status. A match between configured and currently connected references is **neither established nor refuted** here. The exact evidence that is missing — the comparison cannot be completed without it, and any of it could confirm *or overturn* a match verdict — is:
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

Interpretation: the failure is specific to the project subdomain — not a local network or DNS problem. The Supabase project endpoint for `ossprdfycpdvewpxtsfw` is currently unreachable/unresolved, which is consistent with the reported **inactive** status; meanwhile the Vercel-served public site remains reachable. Scope of these probes: they target the *configured template* host from `.env.example`, so they characterize that host's reachability only. They cannot observe which project reference the deployed application is *currently* connected to — that is §2 missing evidence item 2 — so they corroborate, but do not prove, identity between the configured and currently connected references.

## 4. Service-continuity metadata (as available locally, without changing remote state)

- **Public site:** live. `https://www.dirtcatrecords.com` returned HTTP 200 during the probe. Served by Vercel; `vercel.json` routes `/api/*` to the `api/public` and `api/studio` functions.
- **Deployment continuity records:** `docs/deployment-ledger.md` — most recent recorded production deployment `2026-07-21T14:59:59Z` at rev `fac51ff…` aliased to `https://www.dirtcatrecords.com` (Vercel project slug pattern `dirt-cat-records-projects`).
- **Surfaces that degrade while the project is unreachable** (each reads `SUPABASE_URL` at runtime): customer portal auth (magic-link OTP) and actions; admin overview/projects/quotes/setup-wizard; checkout config (which hands `supabaseUrl` + public key to browsers); free-review and project-support submissions; PayPal capture/webhook order records; the follow-ups cron. `docs/execution-log.md` (e.g. lines 668–676, 1099–1100) records that production environment variables, including the `SUPABASE_*` names, were provisioned and queried successfully during earlier operational checks.
- **What Supabase holds:** customer auth identities (`/auth/v1/user`, `/auth/v1/admin/users`) and all studio records via `/rest/v1` — the 14 public tables defined in `supabase/schema.sql`: `customers, orders, project_files, projects, leads, payments, quotes, quote_line_items, project_events, revision_requests, admin_notes, email_events, automation_test_runs, followup_jobs` (plus the service-role model; README lines 86, 185–187).
- **What Supabase does *not* hold:** delivered audio/file storage — the automation "storage" section binds to Google Drive (`lib/automation/setup-checks.js` `SECTION_ENV.storage`); no Supabase-storage bucket references exist anywhere in the tree.
- **Rebinding requirements:** any restored or replacement project must be re-expressed as the values for `SUPABASE_URL`, `SUPABASE_PUBLIC_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (+ alias `SUPABASE_SECRET_KEY`) in the Vercel environment, and `.env.example:16` updated in-repo; the client-side pages take the URL through the checkout-config endpoint, so no HTML constant needs editing. Local dev (`npm run dev:stack` → `npx supabase start`) and `supabase/schema.sql` provide a reprovision path for schema; **no repository-side data backup or PITR artifact exists** — historical row data can only come from the Supabase platform (§2 missing evidence).
- **`supabase/config.toml` network restrictions:** `enabled = false` with default open CIDRs, so a network-restriction change is not a plausible cause of unreachability.

## 5. Repository paths that depend on the configured project reference

Consumers of `SUPABASE_URL` / Supabase endpoints, all relative to `873a4a6` (whichever project the live value resolves to at runtime — see §2):

| Path | Dependency |
| --- | --- |
| `.env.example` (line 16) | Defines the configured project reference (only real ref literal in the tree; §1's other hosts are test/doc mocks) |
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

The repository revision `873a4a6` is configured to bind to exactly one Supabase project — ref **`ossprdfycpdvewpxtsfw`** (source: `.env.example:16`, lineage commit `ac6eeb3`), with no competing or stale reference anywhere in configuration or locally reachable history. The required comparison against the **currently connected** inactive project is **incomplete: a match is neither proven nor refuted by the authorized evidence**, because the live platform-injected `SUPABASE_URL` value and the authoritative Supabase project identity/state are both unobtainable in this environment (§2 missing evidence items 1–2), and no local source observes either. The authorized evidence is *consistent with* a match — the only configured reference is the one probed, its endpoint now fails DNS/HTTPS while control hosts succeed — but consistency is not proof: if the deployed application's live value differs from the template reference, that identity would not hold. Closing the verdict requires the Supabase-platform status string and the live Vercel environment value (owner/platform-side evidence, outside this task's permissions). Public-site continuity is intact (HTTP 200 at every 2026-09-19 probe); all authenticated/administrative data surfaces listed in §5 depend on restoring or reprovisioning whichever project the deployment actually connects to. No remote state was changed by this audit.
