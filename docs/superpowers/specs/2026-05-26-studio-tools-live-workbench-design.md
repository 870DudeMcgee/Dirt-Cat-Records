# Studio Tools Live Workbench Design

Date: 2026-05-26
Project: Dirt Cat Records live site
Status: Approved direction, ready for implementation planning

## Problem

The Drum Alignment and Logic Auto Bounce work needs to be easy to continue from work without relying on scattered Vercel preview URLs. The previous preview-heavy workflow made it hard to know which version was current, where the latest work lived, and what to open next.

## Goals

- Provide one stable live-site entry point for ongoing studio-tool work.
- Make GitHub the source of truth for editing and continuation.
- Keep the live site useful as a dashboard, not as the full development environment.
- Keep Logic Auto Bounce separated from the marketing/site repo because the actual Logic automation belongs in the local macOS app repository.
- Make the next task obvious for each tool.
- Avoid creating new Vercel Function routes or deployment complexity.

## Non-Goals

- Do not host the Logic automation runtime in the website.
- Do not add authenticated editing, databases, or a CMS.
- Do not depend on random preview URLs as the main workflow.
- Do not expose incomplete internal automation as a customer-facing product.

## Chosen Approach

Use the existing `studio-tools.html` page as a stable live workbench. The page will continue to show Brick Lane Sonic Lab, but it will also turn the Drum Alignment and Logic Auto Bounce cards into active workbench sections instead of passive "Coming Next" placeholders.

The workbench is intentionally lightweight: status, current branch/repo, current task, source links, and handoff notes. From work, the operator opens the same live URL, clicks the relevant GitHub link, and continues from the indicated branch/file.

## Alternatives Considered

### Multiple Vercel Preview Links

This is flexible for short-term testing, but it repeats the tracking problem. It is not the main workflow.

### Separate Hidden Preview Site

This creates a cleaner preview target, but it still adds another URL and another deployment state to remember.

### Put Logic Auto Bounce Fully On The Website

This crosses the wrong boundary. Logic automation requires local macOS Accessibility control and a separate app repo. The website should point to the work, status, docs, and future download, not run the exporter.

## Architecture

- `studio-tools.html` remains the public stable route.
- Static HTML/CSS/JS only; no new API route.
- The workbench content is safe to ship on the live site because it contains no secrets and no executable local automation.
- Each tool section owns:
  - status;
  - current branch or repo;
  - current task;
  - important docs;
  - GitHub/open-source links;
  - short operating notes.

## Tool Sections

### Drum Alignment

The first implementation should create a visible workbench section that names Drum Alignment as an active studio-tool track. It should make clear whether the current state is planning, prototype, or implementation. It should include a next-task block that can be updated without touching deeper infrastructure.

### Logic Auto Bounce

The first implementation should link to the separate `dirtcat-stem-exporter` repository/workstream and summarize the current live-Logic proof milestone:

- prove real Logic readiness;
- capture or diagnose macOS Accessibility state;
- produce one or two local bounce files;
- assemble a local manifest/package;
- keep Drive upload and packaging gated behind local proof.

The website should not imply that full auto bounce is already live.

## Data Flow

The data flow is manual and GitHub-centered:

1. Operator opens the stable live Studio Tools page.
2. Operator chooses Drum Alignment or Logic Auto Bounce.
3. Page shows the current branch/repo/file/task.
4. Operator opens GitHub from the page and continues work.
5. Updates are committed to the relevant repo and deployed through the normal site workflow.

## Error Handling

Because this is static content, failures are mostly broken links or stale status. The page should use clear plain-language labels so stale content is easy to spot, such as "Current Branch" and "Current Task".

If a GitHub link is not final yet, the implementation should prefer linking to the known repository root or local planning document surfaced through the site repo, rather than inventing a preview-only path.

## Testing

- Run `npm run check:js`.
- Run `npm run deploy:preflight` before pushing for a shared/live deployment.
- Manually open `studio-tools.html` locally and verify:
  - Brick Lane still renders;
  - Drum Alignment and Logic Auto Bounce sections are visible;
  - all links are intentional;
  - mobile layout does not overlap.

## Deployment Workflow

Use one branch for the site work:

`wip/studio-tools-live-workspace`

After implementation:

1. Run deployment preflight.
2. Push the branch to GitHub.
3. Use a single review target.
4. Merge to `main` only when the live-workbench page is correct.
5. Use the stable live URL as the ongoing remote-work entry point.

## Open Decision

The implementation plan should decide whether the workbench lives directly inside `studio-tools.html` or whether `studio-tools.html` links to a separate `studio-workbench.html`. The recommended first choice is to keep it in `studio-tools.html` because that URL already exists in site navigation and already names the two requested tools.
