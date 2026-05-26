# Logic Auto Bounce Preferences Dialogue Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the passive "Logic Auto Bounce" workbench section on `studio-tools.html` into a fully interactive Preferences Setup Dialogue with preset saving and JSON recipe export.

**Architecture:**

1. Build the HTML UI layout inside `#logic-auto-bounce-workbench`.
2. Add styled CSS classes for the preset toolbar, toggle cards, tracks table, and code blocks in `style.css`.
3. Implement client-side state management, `localStorage` saving, dynamic JSON compilation, and blob-based file downloading in a modular new script `logic-auto-bounce.js`.
4. Cover with unit tests in `test/project-support-page.test.js` and visual regression tests.

**Tech Stack:** Static HTML, Vanilla CSS, Vanilla JavaScript, LocalStorage, Blob downloads, Node test runner.

---

### Task 1: Test Coverage for the Setup Dialogue

**Files:**

- Modify: `test/project-support-page.test.js`

**Step 1: Write the failing test**
Add a test case verifying the presence of the preferences setup dialogue container, selectors, toggles, sidechain table, and the new script link.

```javascript
test("studio tools page hosts the Logic Auto Bounce preferences dialogue", () => {
  const html = readFileSync(join(root, "studio-tools.html"), "utf8");

  // Verify elements exist
  assert.match(html, /id="logic-bounce-preferences"/);
  assert.match(html, /id="bounce-preset-selector"/);
  assert.match(html, /id="toggle-inserts-active"/);
  assert.match(html, /id="toggle-instruments-active"/);
  assert.match(html, /id="toggle-master-active"/);
  assert.match(html, /class="bounce-tracks-table"/);
  assert.match(html, /id="bounce-recipe-preview"/);
  assert.match(html, /id="btn-copy-recipe"/);
  assert.match(html, /id="btn-download-recipe"/);
  assert.match(html, /src="logic-auto-bounce\.js"/);
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/project-support-page.test.js`
Expected: FAIL with missing dialogue element assertions.

**Step 3: Commit**

```bash
git add test/project-support-page.test.js
git commit -m "test: add assertions for Logic Auto Bounce preferences dialogue"
```

---

### Task 2: Build the HTML Layout in `studio-tools.html`

**Files:**

- Modify: `studio-tools.html`

**Step 1: Add the Preferences Dialogue structure**
Replace the static `Logic Auto Bounce` workbench details (lines 170-200) inside `#logic-auto-bounce-workbench` with the full preferences form layout:

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
      Customize your bounce presets, configure track sidechains, and export your
      1-click execution recipe.
    </p>
  </div>

  <div
    id="logic-bounce-preferences"
    class="studio-workbench-grid bounce-preference-shell"
  >
    <!-- Preset Toolbar -->
    <div class="bounce-panel-full bounce-preset-toolbar">
      <label for="bounce-preset-selector">Active Export Preset:</label>
      <select id="bounce-preset-selector">
        <option value="mix-prep-dry">Mix Prep (Dry)</option>
        <option value="vocal-stems-wet">Vocal Stems (Wet)</option>
        <option value="mastering-pre-bounce">Mastering Pre-Bounce</option>
        <option value="custom">-- Custom Presets --</option>
      </select>
      <button type="button" id="btn-new-preset" class="btn-secondary">
        New
      </button>
      <button type="button" id="btn-save-preset" class="btn-primary">
        Save
      </button>
      <button type="button" id="btn-delete-preset" class="btn-danger">
        Delete
      </button>
      <span id="preset-modified-badge" class="badge-modified" hidden
        >Modified</span
      >
    </div>

    <!-- Group 1: Bounce & Audio Settings -->
    <div class="studio-workbench-panel bounce-settings-card">
      <span class="studio-workbench-label">Bounce Settings</span>
      <h3>Audio Specifications</h3>

      <div class="form-row">
        <label>Format</label>
        <span class="static-value-label">WAV</span>
      </div>

      <div class="form-row">
        <label for="bounce-bit-depth">Bit Depth</label>
        <select id="bounce-bit-depth">
          <option value="16">16-bit</option>
          <option value="24" selected>24-bit</option>
        </select>
      </div>

      <div class="form-row">
        <label for="bounce-sample-rate">Sample Rate</label>
        <select id="bounce-sample-rate">
          <option value="44100">44.1 kHz</option>
          <option value="48000" selected>48 kHz</option>
        </select>
      </div>

      <div class="form-row">
        <label for="bounce-range">Bounce Range</label>
        <select id="bounce-range">
          <option value="entire-project">Entire Project</option>
          <option value="cycle-range">Cycle Range</option>
          <option value="selected-regions">Selected Regions</option>
        </select>
      </div>
    </div>

    <!-- Group 2: Option C Granular Plugin & Automation Toggles -->
    <div class="studio-workbench-panel plugin-toggles-card">
      <span class="studio-workbench-label">Plugin & Track Control</span>
      <h3>Option C Toggles</h3>

      <div class="switch-row">
        <label class="switch-container">
          <input type="checkbox" id="toggle-inserts-active" checked />
          <span class="neon-slider"></span>
        </label>
        <span class="switch-label">Insert Effects Active</span>
      </div>

      <div class="switch-row">
        <label class="switch-container">
          <input type="checkbox" id="toggle-instruments-active" checked />
          <span class="neon-slider"></span>
        </label>
        <span class="switch-label">Software Instruments Active</span>
      </div>

      <div class="switch-row">
        <label class="switch-container">
          <input type="checkbox" id="toggle-master-active" />
          <span class="neon-slider"></span>
        </label>
        <span class="switch-label">Master Bus Effects Active</span>
      </div>

      <div class="switch-row">
        <label class="switch-container">
          <input type="checkbox" id="toggle-volume-pan-active" checked />
          <span class="neon-slider"></span>
        </label>
        <span class="switch-label">Apply Volume/Pan Automation</span>
      </div>

      <div class="switch-row">
        <label class="switch-container">
          <input type="checkbox" id="toggle-print-fx" />
          <span class="neon-slider"></span>
        </label>
        <span class="switch-label">Print FX Returns (Auxes)</span>
      </div>

      <div class="switch-row">
        <label class="switch-container">
          <input type="checkbox" id="toggle-print-subgroups" />
          <span class="neon-slider"></span>
        </label>
        <span class="switch-label">Print Subgroups (Buses)</span>
      </div>
    </div>

    <!-- Group 3: Discovered Tracks Simulated Table -->
    <div class="studio-workbench-panel bounce-panel-full track-table-card">
      <span class="studio-workbench-label">Discovered Session Tracks</span>
      <h3>Sidechain & Track Mappings</h3>
      <div class="table-wrapper">
        <table class="bounce-tracks-table">
          <thead>
            <tr>
              <th>Track Name</th>
              <th>Type</th>
              <th>Sidechain Input</th>
              <th>Sidechain Policy</th>
            </tr>
          </thead>
          <tbody id="bounce-tracks-body">
            <!-- Discovered tracks will be populated dynamically -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- Group 4: JSON Recipe Generation & Download -->
    <div class="studio-workbench-panel bounce-panel-full recipe-preview-card">
      <span class="studio-workbench-label">1-Click Exporter Recipe</span>
      <h3>Generated Config JSON</h3>
      <pre><code id="bounce-recipe-preview"></code></pre>
      <div class="recipe-actions">
        <button type="button" id="btn-copy-recipe" class="btn-secondary">
          Copy to Clipboard
        </button>
        <button type="button" id="btn-download-recipe" class="btn-primary">
          Download Recipe
        </button>
      </div>
    </div>
  </div>
</section>
```

Add the script tag before the closing `</body>`:

```html
<script src="logic-auto-bounce.js"></script>
```

**Step 2: Commit**

```bash
git add studio-tools.html
git commit -m "feat: add HTML structures for Logic Auto Bounce dialogue"
```

---

### Task 3: Apply Visual Styling in `style.css`

**Files:**

- Modify: `style.css`

**Step 1: Add preferences layouts and custom slide switch styles**
Add the styled classes near the existing Studio Workbench styling:

```css
/* Preferences layout */
.bounce-panel-full {
  grid-column: span 3;
}

.bounce-preset-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem;
  border: 1px solid rgba(255, 213, 73, 0.28);
  border-radius: 8px;
  background: rgba(255, 213, 73, 0.04);
}

.bounce-preset-toolbar select {
  min-height: 34px;
  padding: 0.3rem 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: #080910;
  color: var(--brick-lane-text);
  font-weight: 700;
}

.badge-modified {
  display: inline-block;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  background: var(--brick-lane-yellow);
  color: #000;
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Button variants */
.btn-primary,
.btn-secondary,
.btn-danger {
  min-height: 34px;
  padding: 0.42rem 0.8rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 900;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn-primary {
  background: var(--brick-lane-cyan);
  border-color: rgba(94, 231, 255, 0.5);
  color: #000;
}
.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--brick-lane-text);
}
.btn-danger {
  background: rgba(255, 84, 84, 0.16);
  border-color: rgba(255, 84, 84, 0.4);
  color: #ff8484;
}

/* Formspec rows */
.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.8rem;
}
.form-row label {
  color: var(--brick-lane-muted);
  font-size: 0.86rem;
}
.form-row select {
  min-height: 32px;
  padding: 0.2rem 0.4rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 4px;
  background: #080910;
  color: var(--brick-lane-text);
}
.static-value-label {
  font-weight: 900;
  color: var(--brick-lane-cyan);
}

/* Toggle Switches */
.switch-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 0.8rem;
}
.switch-label {
  color: var(--brick-lane-text);
  font-size: 0.86rem;
}
.switch-container {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 22px;
}
.switch-container input {
  opacity: 0;
  width: 0;
  height: 0;
}
.neon-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 34px;
  transition: 0.2s;
}
.neon-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: var(--brick-lane-muted);
  border-radius: 50%;
  transition: 0.2s;
}
input:checked + .neon-slider {
  background-color: rgba(94, 231, 255, 0.16);
  border-color: rgba(94, 231, 255, 0.6);
}
input:checked + .neon-slider:before {
  transform: translateX(22px);
  background-color: var(--brick-lane-cyan);
  box-shadow: 0 0 8px var(--brick-lane-cyan);
}

/* Tracks Table */
.table-wrapper {
  overflow-x: auto;
  margin-top: 0.5rem;
}
.bounce-tracks-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.bounce-tracks-table th,
.bounce-tracks-table td {
  padding: 0.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.86rem;
}
.bounce-tracks-table th {
  color: var(--brick-lane-muted);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
}
.bounce-tracks-table select {
  min-height: 28px;
  padding: 0.1rem 0.3rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 4px;
  background: #080910;
  color: var(--brick-lane-text);
  font-size: 0.8rem;
}

/* Recipe Preview JSON */
.recipe-preview-card pre {
  margin: 0.5rem 0;
  padding: 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: #040407;
  overflow-x: auto;
  max-height: 220px;
}
.recipe-preview-card code {
  color: #a5d6ff;
  font-family: monospace;
  font-size: 0.82rem;
}
.recipe-actions {
  display: flex;
  gap: 0.8rem;
  margin-top: 0.8rem;
}
```

Update media query for span spans on smaller viewport:

```css
@media (max-width: 900px) {
  .bounce-panel-full {
    grid-column: 1fr;
  }
}
```

**Step 2: Commit**

```bash
git add style.css
git commit -m "style: add responsive preferences setup dialogue styling"
```

---

### Task 4: Client-Side Logic in `logic-auto-bounce.js`

**Files:**

- Create: `logic-auto-bounce.js`

**Step 1: Write local storage management and JSON compilers**
Create a highly robust client-side script that handles default presets, allows customized additions, populates simulated tracks, and downloads config output:

```javascript
(function () {
  const PRESET_STORAGE_KEY = "dirtcat_bounce_presets";

  // Discovered Logic session mock tracks
  const DISCOVERED_TRACKS = [
    {
      name: "Kick Out",
      type: "Audio",
      sidechain: "none",
      defaultPolicy: "none",
    },
    {
      name: "Snare Top",
      type: "Audio",
      sidechain: "none",
      defaultPolicy: "none",
    },
    {
      name: "Bass Synth",
      type: "Software Instrument",
      sidechain: "Kick Out",
      defaultPolicy: "preserve-pump",
    },
    {
      name: "Lead Vocal",
      type: "Audio",
      sidechain: "none",
      defaultPolicy: "none",
    },
    {
      name: "FX Reverb Aux",
      type: "Aux",
      sidechain: "none",
      defaultPolicy: "none",
    },
  ];

  const DEFAULT_PRESETS = {
    "mix-prep-dry": {
      id: "mix-prep-dry",
      label: "Mix Prep (Dry)",
      bitDepth: "24",
      sampleRate: "48000",
      range: "entire-project",
      toggles: {
        insertsActive: false,
        instrumentsActive: true,
        masterBusActive: false,
        volumePanActive: true,
        printFxAuxes: false,
        printSubgroups: false,
      },
    },
    "vocal-stems-wet": {
      id: "vocal-stems-wet",
      label: "Vocal Stems (Wet)",
      bitDepth: "24",
      sampleRate: "44100",
      range: "entire-project",
      toggles: {
        insertsActive: true,
        instrumentsActive: true,
        masterBusActive: false,
        volumePanActive: true,
        printFxAuxes: true,
        printSubgroups: true,
      },
    },
    "mastering-pre-bounce": {
      id: "mastering-pre-bounce",
      label: "Mastering Pre-Bounce",
      bitDepth: "24",
      sampleRate: "48000",
      range: "cycle-range",
      toggles: {
        insertsActive: true,
        instrumentsActive: true,
        masterBusActive: true,
        volumePanActive: true,
        printFxAuxes: false,
        printSubgroups: false,
      },
    },
  };

  let activePresetId = "mix-prep-dry";
  let presets = loadPresets();
  let selectedTrackPolicies = {};

  // Setup DOM elements
  const presetSelector = document.getElementById("bounce-preset-selector");
  const btnNew = document.getElementById("btn-new-preset");
  const btnSave = document.getElementById("btn-save-preset");
  const btnDelete = document.getElementById("btn-delete-preset");
  const badgeModified = document.getElementById("preset-modified-badge");

  const bitDepthSelect = document.getElementById("bounce-bit-depth");
  const sampleRateSelect = document.getElementById("bounce-sample-rate");
  const rangeSelect = document.getElementById("bounce-range");

  const toggleInserts = document.getElementById("toggle-inserts-active");
  const toggleInstruments = document.getElementById(
    "toggle-instruments-active"
  );
  const toggleMaster = document.getElementById("toggle-master-active");
  const toggleVolPan = document.getElementById("toggle-volume-pan-active");
  const togglePrintFx = document.getElementById("toggle-print-fx");
  const togglePrintSubgroups = document.getElementById(
    "toggle-print-subgroups"
  );

  const tracksBody = document.getElementById("bounce-tracks-body");
  const recipePreview = document.getElementById("bounce-recipe-preview");
  const btnCopy = document.getElementById("btn-copy-recipe");
  const btnDownload = document.getElementById("btn-download-recipe");

  function init() {
    renderPresetDropdown();
    renderTracksTable();
    loadActivePreset(activePresetId);

    // Bind Events
    presetSelector.addEventListener("change", (e) => {
      activePresetId = e.target.value;
      loadActivePreset(activePresetId);
    });

    [bitDepthSelect, sampleRateSelect, rangeSelect].forEach((el) => {
      el.addEventListener("change", markModified);
    });

    [
      toggleInserts,
      toggleInstruments,
      toggleMaster,
      toggleVolPan,
      togglePrintFx,
      togglePrintSubgroups,
    ].forEach((el) => {
      el.addEventListener("change", markModified);
    });

    btnNew.addEventListener("click", createNewPreset);
    btnSave.addEventListener("click", saveActivePreset);
    btnDelete.addEventListener("click", deleteActivePreset);
    btnCopy.addEventListener("click", copyRecipeToClipboard);
    btnDownload.addEventListener("click", downloadRecipeFile);
  }

  function loadPresets() {
    try {
      const stored = localStorage.getItem(PRESET_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PRESETS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Failed to load user presets from local storage", e);
    }
    return { ...DEFAULT_PRESETS };
  }

  function savePresetsToStorage() {
    const userOnly = {};
    Object.keys(presets).forEach((key) => {
      if (!DEFAULT_PRESETS[key]) {
        userOnly[key] = presets[key];
      }
    });
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(userOnly));
  }

  function renderPresetDropdown() {
    presetSelector.innerHTML = "";
    Object.keys(presets).forEach((key) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = presets[key].label;
      presetSelector.appendChild(opt);
    });
    presetSelector.value = activePresetId;
  }

  function loadActivePreset(presetId) {
    const p = presets[presetId];
    if (!p) return;

    bitDepthSelect.value = p.bitDepth;
    sampleRateSelect.value = p.sampleRate;
    rangeSelect.value = p.range;

    toggleInserts.checked = p.toggles.insertsActive;
    toggleInstruments.checked = p.toggles.instrumentsActive;
    toggleMaster.checked = p.toggles.masterBusActive;
    toggleVolPan.checked = p.toggles.volumePanActive;
    togglePrintFx.checked = p.toggles.printFxAuxes;
    togglePrintSubgroups.checked = p.toggles.printSubgroups;

    badgeModified.hidden = true;
    updateTrackPoliciesForPreset(p);
    updateRecipeJSON();
  }

  function updateTrackPoliciesForPreset(preset) {
    selectedTrackPolicies = {};
    DISCOVERED_TRACKS.forEach((track) => {
      if (track.sidechain !== "none") {
        // default based on preset style
        if (preset.id === "mix-prep-dry") {
          selectedTrackPolicies[track.name] = "bypass-sidechain";
        } else {
          selectedTrackPolicies[track.name] = track.defaultPolicy;
        }
      } else {
        selectedTrackPolicies[track.name] = "none";
      }
    });
    updateTracksTableDropdowns();
  }

  function renderTracksTable() {
    tracksBody.innerHTML = "";
    DISCOVERED_TRACKS.forEach((track) => {
      const tr = document.createElement("tr");

      const tdName = document.createElement("td");
      tdName.textContent = track.name;
      tr.appendChild(tdName);

      const tdType = document.createElement("td");
      tdType.textContent = track.type;
      tr.appendChild(tdType);

      const tdSidechain = document.createElement("td");
      if (track.sidechain !== "none") {
        tdSidechain.innerHTML = `<span style="color: var(--brick-lane-yellow);">⚡ sidechain from ${track.sidechain}</span>`;
      } else {
        tdSidechain.textContent = "-";
      }
      tr.appendChild(tdSidechain);

      const tdPolicy = document.createElement("td");
      if (track.sidechain !== "none") {
        const select = document.createElement("select");
        select.dataset.track = track.name;

        const optPreserve = document.createElement("option");
        optPreserve.value = "preserve-pump";
        optPreserve.textContent = "Preserve Pump";
        select.appendChild(optPreserve);

        const optBypass = document.createElement("option");
        optBypass.value = "bypass-sidechain";
        optBypass.textContent = "Bypass Sidechain";
        select.appendChild(optBypass);

        select.addEventListener("change", (e) => {
          selectedTrackPolicies[track.name] = e.target.value;
          markModified();
        });

        tdPolicy.appendChild(select);
      } else {
        tdPolicy.textContent = "N/A";
      }
      tr.appendChild(tdPolicy);

      tracksBody.appendChild(tr);
    });
  }

  function updateTracksTableDropdowns() {
    const selects = tracksBody.querySelectorAll("select");
    selects.forEach((select) => {
      const trackName = select.dataset.track;
      if (selectedTrackPolicies[trackName]) {
        select.value = selectedTrackPolicies[trackName];
      }
    });
  }

  function markModified() {
    badgeModified.hidden = false;
    updateRecipeJSON();
  }

  function createNewPreset() {
    const name = prompt("Enter a name for the new preset:");
    if (!name || !name.trim()) return;

    const id = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    if (presets[id]) {
      alert("A preset with that name already exists!");
      return;
    }

    presets[id] = {
      id: id,
      label: name.trim(),
      bitDepth: bitDepthSelect.value,
      sampleRate: sampleRateSelect.value,
      range: rangeSelect.value,
      toggles: {
        insertsActive: toggleInserts.checked,
        instrumentsActive: toggleInstruments.checked,
        masterBusActive: toggleMaster.checked,
        volumePanActive: toggleVolPan.checked,
        printFxAuxes: togglePrintFx.checked,
        printSubgroups: togglePrintSubgroups.checked,
      },
    };

    activePresetId = id;
    savePresetsToStorage();
    renderPresetDropdown();
    loadActivePreset(activePresetId);
  }

  function saveActivePreset() {
    const p = presets[activePresetId];
    if (!p) return;

    // Check if default presets are attempted to be modified, copy as user customization
    p.bitDepth = bitDepthSelect.value;
    p.sampleRate = sampleRateRateValue();
    p.range = rangeSelect.value;
    p.toggles = {
      insertsActive: toggleInserts.checked,
      instrumentsActive: toggleInstruments.checked,
      masterBusActive: toggleMaster.checked,
      volumePanActive: toggleVolPan.checked,
      printFxAuxes: togglePrintFx.checked,
      printSubgroups: togglePrintSubgroups.checked,
    };

    savePresetsToStorage();
    badgeModified.hidden = true;
    updateRecipeJSON();
  }

  function sampleRateRateValue() {
    return sampleRateSelect.value;
  }

  function deleteActivePreset() {
    if (DEFAULT_PRESETS[activePresetId]) {
      alert("Default templates cannot be deleted.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete the preset "${presets[activePresetId].label}"?`
      )
    ) {
      return;
    }

    delete presets[activePresetId];
    activePresetId = "mix-prep-dry";
    savePresetsToStorage();
    renderPresetDropdown();
    loadActivePreset(activePresetId);
  }

  function compileRecipe() {
    const p = presets[activePresetId];
    const trackPoliciesList = DISCOVERED_TRACKS.map((track) => ({
      trackName: track.name,
      type: track.type,
      sidechain: track.sidechain,
      policy: selectedTrackPolicies[track.name] || "none",
    }));

    return {
      presetId: activePresetId,
      label: p ? p.label : "Custom",
      isModified: !badgeModified.hidden,
      audioSettings: {
        format: "WAV",
        bitDepth: parseInt(bitDepthSelect.value, 10),
        sampleRate: parseInt(sampleRateSelect.value, 10),
        range: rangeSelect.value,
      },
      toggles: {
        insertsActive: toggleInserts.checked,
        instrumentsActive: toggleInstruments.checked,
        masterBusActive: toggleMaster.checked,
        volumePanActive: toggleVolPan.checked,
        printFxAuxes: togglePrintFx.checked,
        printSubgroups: togglePrintSubgroups.checked,
      },
      trackPolicies: trackPoliciesList,
    };
  }

  function updateRecipeJSON() {
    const recipe = compileRecipe();
    recipePreview.textContent = JSON.stringify(recipe, null, 2);
  }

  function copyRecipeToClipboard() {
    const jsonText = recipePreview.textContent;
    navigator.clipboard
      .writeText(jsonText)
      .then(() => {
        const oldText = btnCopy.textContent;
        btnCopy.textContent = "Copied!";
        setTimeout(() => {
          btnCopy.textContent = oldText;
        }, 1500);
      })
      .catch((err) => {
        alert("Failed to copy recipe: " + err);
      });
  }

  function downloadRecipeFile() {
    const recipe = compileRecipe();
    const jsonText = JSON.stringify(recipe, null, 2);
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${activePresetId}-bounce-recipe.json`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Self-execute on DOM load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
```

**Step 2: Commit**

```bash
git add logic-auto-bounce.js
git commit -m "feat: implement preferences manager and JSON download logic"
```

---

### Task 5: Preflight verification

**Files:**

- None (Command line only)

**Step 1: Run complete test suites**
Run:

```bash
npm run check:js
npm test
```

Expected: PASS with 381 passing tests (including the new setup dialogue assertion).

**Step 2: Check git cleanliness**
Run:

```bash
git status -sb
```

Expected: clean branches without any untracked or unrelated files.

**Step 3: Push changes**
Run:

```bash
git push origin wip/studio-tools-live-workspace
```

Expected: Branch pushed successfully.
