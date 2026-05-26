# Deployment Ledger

This file is append-only. Record every shared preview and production deployment that matters beyond personal debugging.

Use `npm run record:deployment -- --env <preview|production> --url <deployment-url> --alias <alias-or-none> --purpose <test-purpose> --verifier <name>`.

| Timestamp (UTC)          | Environment | Branch | SHA     | Worktree | Deployment URL                                                          | Alias Target                                                               | Purpose                                  | Verifier       |
| ------------------------ | ----------- | ------ | ------- | -------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------- | -------------- |
| 2026-05-20T19:56:29.616Z | preview     | main   | ae958f9 | clean    | https://dirt-cat-records-k038629yi-dirt-cat-records-projects.vercel.app | https://dirt-cat-records-870dudemcgee-dirt-cat-records-projects.vercel.app | portal and webhook verification baseline | GitHub Copilot |
| 2026-05-26T13:07:37.975Z | production | main | 8de3e2d1f73a57bcd0e80eda419da0bb22bd3ed6 | dirty | https://www.dirtcatrecords.com/studio-tools.html | www.dirtcatrecords.com | studio-tools-live-workbench | Codex |
