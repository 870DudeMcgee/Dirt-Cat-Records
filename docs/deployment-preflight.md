# Deployment Preflight

## Issue

Vercel Hobby allows no more than 12 Serverless Functions per deployment. This repository previously exceeded that limit and failed deploys even though local build checks passed.

## Current Rule

The repo must stay at or below 12 deployable functions under `api/` for Hobby deployments.

## Workflow

1. Run `npm run deploy:preflight` before shipping.
2. If the function count is over 12, merge adjacent routes or remove a nonessential endpoint.
3. Re-run the preflight command until it passes.
4. Deploy only after the preflight is green.

## Current Consolidation

The browser config endpoints were consolidated so admin and portal pages read public config from `api/checkout-config.js` instead of a separate `api/public/config.js` function.

## Notes

- `api/checkout-config.js` exposes only public, non-secret browser config.
- The preflight command also runs the full test suite, JS syntax checks, and `git diff --check` so a failed deploy is caught earlier.
