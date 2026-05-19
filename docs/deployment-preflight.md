# Deployment Preflight

## Issue

Vercel Hobby allows no more than 12 Serverless Functions per deployment. This repository previously exceeded that limit and failed deploys even though local build checks passed.

## Current Rule

The repo must stay at or below 12 deployable functions under `api/` for Hobby deployments.

## Workflow

1. Every `git push` runs `npm run deploy:preflight` through `.husky/pre-push`.
2. If the function count is over 12, merge adjacent routes or remove a nonessential endpoint.
3. Re-run the preflight command until it passes.
4. Deploy only after the preflight is green.

## Credential And Provider Gate

Do this before any commit/push intended to be runtime-ready or deployable:

1. Compare local and Vercel environment variables against `.env.example`.
2. Confirm `GOOGLE_DRIVE_PROJECTS_FOLDER_ID` is the raw folder id only, not a full `drive.google.com` URL.
3. Run local runtime and setup checks:

```bash
npx vercel dev
curl -sS "http://localhost:3000/api/admin/setup-wizard?action=setup"
```

4. If `storage` fails with `File not found`, fix the Drive folder id or folder permissions before pushing.
5. Keep `TEST_CUSTOMER_EMAIL` and `TEST_EMAIL_RECIPIENT` pointed at your own inbox during sandbox/provider validation.

## Current Consolidation

- The browser config endpoints were consolidated so admin and portal pages read public config from `api/checkout-config.js` instead of a separate `api/public/config.js` function.
- Portal quote checkout and balance checkout now run through `api/portal/actions.js` instead of separate one-purpose function files.

## Notes

- `api/checkout-config.js` exposes only public, non-secret browser config.
- The preflight command also runs the full test suite, JS syntax checks, and `git diff --check` so a failed deploy is caught earlier.
- The Husky hook means a normal push now fails locally before Vercel can receive an over-limit deployment.
