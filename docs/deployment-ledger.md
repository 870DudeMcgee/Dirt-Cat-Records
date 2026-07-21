# Deployment Ledger

This file is append-only. Record every shared preview and production deployment that matters beyond personal debugging.

Use `npm run record:deployment -- --env <preview|production> --url <deployment-url> --alias <alias-or-none> --purpose <test-purpose> --verifier <name>`.

| Timestamp (UTC)          | Environment | Branch | SHA     | Worktree | Deployment URL                                                          | Alias Target                                                               | Purpose                                  | Verifier       |
| ------------------------ | ----------- | ------ | ------- | -------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------- | -------------- |
| 2026-05-20T19:56:29.616Z | preview     | main   | ae958f9 | clean    | https://dirt-cat-records-k038629yi-dirt-cat-records-projects.vercel.app | https://dirt-cat-records-870dudemcgee-dirt-cat-records-projects.vercel.app | portal and webhook verification baseline | GitHub Copilot |
| 2026-05-26T13:07:37.975Z | production | main | 8de3e2d1f73a57bcd0e80eda419da0bb22bd3ed6 | dirty | https://www.dirtcatrecords.com/studio-tools.html | www.dirtcatrecords.com | studio-tools-live-workbench | Codex |
| 2026-07-21T14:59:59.455Z | production | main | fac51ff1b982e879b47614d668150a6b3e158023 | clean | https://dirt-cat-records-a3rrswni0-dirt-cat-records-projects.vercel.app | https://www.dirtcatrecords.com | google-search-console-and-ga4-foundation | Codex |
