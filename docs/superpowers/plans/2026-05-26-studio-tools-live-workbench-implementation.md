# Studio Tools Live Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing Studio Tools page into the stable live workbench for Drum Alignment and Logic Auto Bounce work.

**Architecture:** Keep the workbench static and hosted from `studio-tools.html`, alongside the existing Brick Lane Sonic Lab. Add semantic sections that expose status, source-of-truth links, current tasks, and workflow notes without adding APIs, auth, or preview-specific routing.

**Tech Stack:** Static HTML, existing `style.css`, Node's built-in test runner, existing deployment preflight.

---

## File Structure

- Modify `test/project-support-page.test.js`: extend the existing Studio Tools page test so it fails until the page exposes live workbench sections, stable workflow language, and GitHub-oriented status blocks.
- Modify `studio-tools.html`: replace the passive Drum Alignment and Logic Auto Bounce placeholder cards with active workbench cards and add two static workbench sections below Brick Lane Sonic Lab.
- Modify `style.css`: add responsive workbench section, panel, status, link, and task styling that reuses the existing Brick Lane/Studio Tools visual system.

## Task 1: Add Static Workbench Coverage

**Files:**
- Modify: `test/project-support-page.test.js`

- [ ] **Step 1: Write the failing test assertions**

Update the existing `studio tools page hosts the Brick Lane lab and future tool slots` test to require active workbench content:

```js
test("studio tools page hosts the Brick Lane lab and live workbench", () => {
  const html = readFileSync(join(root, "studio-tools.html"), "utf8");

  assert.match(html, /<title>Studio Tools \| Dirt Cat Records<\/title>/);
  assert.match(html, /<h1>Studio Tools<\/h1>/);
  assert.match(html, /Brick Lane Sonic Lab/);
  assert.match(html, /Drum Alignment/);
  assert.match(html, /Logic Auto Bounce/);
  assert.match(html, /id="drum-alignment-workbench"/);
  assert.match(html, /id="logic-auto-bounce-workbench"/);
  assert.match(html, /One stable live URL/);
  assert.match(html, /Current Branch/);
  assert.match(html, /wip\/studio-tools-live-workspace/);
  assert.match(html, /dirtcat-stem-exporter/);
  assert.match(html, /Live Logic proof/);
  assert.match(html, /brick-lane-data\.js/);
  assert.match(html, /brick-lane-lab\.js/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
node --test test/project-support-page.test.js
```

Expected: FAIL with an assertion for `id="drum-alignment-workbench"` because the workbench sections do not exist yet.

## Task 2: Build The Static Workbench Sections

**Files:**
- Modify: `studio-tools.html`
- Modify: `style.css`

- [ ] **Step 1: Update the Studio Tools rack**

In `studio-tools.html`, change the Drum Alignment and Logic Auto Bounce cards from queued placeholders to active workbench links:

```html
<article class="studio-tool-card is-workbench">
  <p>Workbench</p>
  <h2>Drum Alignment</h2>
  <span>Alignment notes, task state, and GitHub handoff</span>
  <a href="#drum-alignment-workbench">Open Workbench</a>
</article>
<article class="studio-tool-card is-workbench">
  <p>Workbench</p>
  <h2>Logic Auto Bounce</h2>
  <span>Live Logic proof track and exporter repo handoff</span>
  <a href="#logic-auto-bounce-workbench">Open Workbench</a>
</article>
```

- [ ] **Step 2: Add Drum Alignment workbench section**

Add this section after the Brick Lane active tool section and before the print sheet:

```html
<section
  id="drum-alignment-workbench"
  class="studio-workbench-section"
  aria-label="Drum Alignment Workbench"
>
  <div class="studio-tools-tool-heading">
    <p class="brick-lane-kicker">Live Workbench</p>
    <h2>Drum Alignment</h2>
    <p>
      One stable live URL for alignment planning, status, and the next GitHub task.
    </p>
  </div>
  <div class="studio-workbench-grid">
    <article class="studio-workbench-panel">
      <span class="studio-workbench-label">Status</span>
      <h3>Planning Track</h3>
      <p>
        This is the remote starting point for the drum alignment tool. Keep the
        implementation work in GitHub and use this page to remember what to open next.
      </p>
    </article>
    <article class="studio-workbench-panel">
      <span class="studio-workbench-label">Current Branch</span>
      <h3>wip/studio-tools-live-workspace</h3>
      <p>
        Site-side workbench updates live on this branch until the stable live page is merged.
      </p>
      <a href="https://github.com/870DudeMcgee/Dirt-Cat-Records/tree/wip/studio-tools-live-workspace">Open Site Branch</a>
    </article>
    <article class="studio-workbench-panel studio-workbench-task">
      <span class="studio-workbench-label">Current Task</span>
      <h3>Define the alignment workflow</h3>
      <p>
        Capture the exact drum-editing decisions this helper should support before adding
        deeper UI or analysis logic.
      </p>
    </article>
  </div>
</section>
```

- [ ] **Step 3: Add Logic Auto Bounce workbench section**

Add this section after Drum Alignment:

```html
<section
  id="logic-auto-bounce-workbench"
  class="studio-workbench-section"
  aria-label="Logic Auto Bounce Workbench"
>
  <div class="studio-tools-tool-heading">
    <p class="brick-lane-kicker">Live Workbench</p>
    <h2>Logic Auto Bounce</h2>
    <p>
      One stable live URL for the exporter milestone, repo handoff, and next live Logic proof.
    </p>
  </div>
  <div class="studio-workbench-grid">
    <article class="studio-workbench-panel">
      <span class="studio-workbench-label">Source Repo</span>
      <h3>dirtcat-stem-exporter</h3>
      <p>
        The actual Logic automation belongs in the separate macOS app repo, not inside this website.
      </p>
      <a href="https://github.com/870DudeMcgee/dirtcat-stem-exporter">Open Exporter Repo</a>
    </article>
    <article class="studio-workbench-panel">
      <span class="studio-workbench-label">Current Milestone</span>
      <h3>Live Logic proof</h3>
      <p>
        Prove real Accessibility readiness, capture or diagnose the Logic UI state, confirm
        one or two real bounce files, and assemble a local manifest before packaging or Drive upload.
      </p>
    </article>
    <article class="studio-workbench-panel studio-workbench-task">
      <span class="studio-workbench-label">Current Task</span>
      <h3>Continue the local proof branch</h3>
      <p>
        Start from the live-Logic redirection notes and keep export success local-first.
      </p>
    </article>
  </div>
</section>
```

- [ ] **Step 4: Add CSS for workbench layout**

Add the CSS near the existing Studio Tools styles:

```css
.studio-tool-card.is-workbench {
  border-color: rgba(255, 213, 73, 0.42);
  background:
    linear-gradient(135deg, rgba(255, 213, 73, 0.12), transparent),
    rgba(255, 255, 255, 0.07);
}

.studio-tool-card a,
.studio-workbench-panel a {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 34px;
  margin-top: 0.75rem;
  padding: 0.42rem 0.68rem;
  border: 1px solid rgba(94, 231, 255, 0.36);
  border-radius: 8px;
  color: var(--brick-lane-cyan);
  font-size: 0.78rem;
  font-weight: 900;
  text-decoration: none;
}

.studio-workbench-section {
  margin-top: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  background: rgba(2, 2, 5, 0.52);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
}

.studio-workbench-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
  padding: 0.8rem;
}

.studio-workbench-panel {
  min-width: 0;
  padding: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), transparent 30%),
    rgba(8, 9, 16, 0.72);
}

.studio-workbench-label {
  color: var(--brick-lane-yellow);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.studio-workbench-panel h3 {
  margin: 0.25rem 0 0.4rem;
  color: var(--brick-lane-text);
  font-size: 1rem;
  letter-spacing: 0;
}

.studio-workbench-panel p {
  margin: 0;
  color: var(--brick-lane-muted);
  font-size: 0.86rem;
  line-height: 1.5;
}

.studio-workbench-task {
  border-color: rgba(94, 231, 255, 0.28);
}
```

- [ ] **Step 5: Add responsive workbench CSS**

Inside the existing `@media (max-width: 900px)` block, add:

```css
.studio-workbench-grid {
  grid-template-columns: 1fr;
}
```

- [ ] **Step 6: Run focused test to verify it passes**

Run:

```bash
node --test test/project-support-page.test.js
```

Expected: PASS.

## Task 3: Verify, Commit, And Prepare Push

**Files:**
- Modified: `test/project-support-page.test.js`
- Modified: `studio-tools.html`
- Modified: `style.css`
- Added: `docs/superpowers/plans/2026-05-26-studio-tools-live-workbench-implementation.md`

- [ ] **Step 1: Run syntax checks**

Run:

```bash
npm run check:js
```

Expected: PASS.

- [ ] **Step 2: Run deployment preflight**

Run:

```bash
npm run deploy:preflight
```

Expected: PASS.

- [ ] **Step 3: Check diff scope**

Run:

```bash
git status -sb
git diff -- studio-tools.html style.css test/project-support-page.test.js docs/superpowers/plans/2026-05-26-studio-tools-live-workbench-implementation.md
```

Expected: only the workbench plan, test, HTML, and CSS changes are staged or unstaged. Existing untracked `.github/` and `.superpowers/` files remain untouched.

- [ ] **Step 4: Commit workbench implementation**

Run:

```bash
git add studio-tools.html style.css test/project-support-page.test.js docs/superpowers/plans/2026-05-26-studio-tools-live-workbench-implementation.md
git commit -m "feat: add studio tools live workbench"
```

Expected: commit succeeds on `wip/studio-tools-live-workspace`.

- [ ] **Step 5: Push branch**

Run:

```bash
git push -u origin wip/studio-tools-live-workspace
```

Expected: branch is available on GitHub for remote continuation and review.

## Self-Review

- Spec coverage: the plan implements the stable Studio Tools workbench, GitHub source-of-truth links, current task blocks, Logic exporter separation, and static-only deployment constraint.
- Placeholder scan: no `TBD`, `TODO`, `FIXME`, or incomplete instruction remains.
- Type consistency: no new JS types or runtime functions are introduced; IDs and class names match between test, HTML, and CSS.
