(function initLogicAutoBounce() {
  "use strict";

  const STORAGE_KEY = "dirtcat_logic_bounce_plans_v3";
  const EXAMPLE_TRACKS = [
    "Kick In",
    "Kick Out",
    "Snare Top",
    "Bass DI",
    "Guitar L",
    "Guitar R",
    "Lead Vocal",
    "BGV Stack",
  ];

  const DEFAULT_PRESETS = {
    "mix-handoff": {
      id: "mix-handoff",
      label: "Mix handoff",
      delivery: "all-tracks",
      format: "WAV",
      bitDepth: "24",
      sampleRate: "project",
      range: "project-end",
      normalize: "off",
      includePlugins: true,
      includeAutomation: true,
      includeTail: true,
      tracks: ["Kick In", "Snare Top", "Bass DI", "Lead Vocal", "Mix FX"],
    },
    "mastering-stereo": {
      id: "mastering-stereo",
      label: "Mastering stereo file",
      delivery: "stereo",
      format: "WAV",
      bitDepth: "24",
      sampleRate: "project",
      range: "entire-project",
      normalize: "off",
      includePlugins: true,
      includeAutomation: true,
      includeTail: true,
      tracks: ["Final Mix"],
    },
    "archive-tracks": {
      id: "archive-tracks",
      label: "Full project archive",
      delivery: "all-tracks",
      format: "WAV",
      bitDepth: "24",
      sampleRate: "project",
      range: "project-end",
      normalize: "off",
      includePlugins: true,
      includeAutomation: true,
      includeTail: true,
      tracks: EXAMPLE_TRACKS,
    },
  };

  const WORKFLOWS = {
    stereo: {
      path: "File > Bounce > Project or Section…",
      explanation:
        "One mono, stereo, or surround file from the active output channel strip.",
      warning:
        "Use Realtime in Logic for external MIDI, live inputs, or DSP-based hardware.",
    },
    "all-tracks": {
      path: "File > Export > All Tracks as Audio Files…",
      explanation:
        "One file per audio, software-instrument, and Drummer track in the project.",
      warning:
        "Aux returns and sidechain-dependent sounds may need a separate print.",
    },
    "selected-tracks": {
      path: "Select tracks > File > Export > Tracks as Audio Files…",
      explanation:
        "A focused stem or overdub handoff from the tracks you select in Logic.",
      warning:
        "Check the selected tracks and print any critical sidechain or aux relationship separately.",
    },
  };

  const RANGE_OPTIONS = {
    stereo: [
      ["entire-project", "Entire project"],
      ["cycle", "Cycle range"],
    ],
    tracks: [
      ["project-end", "Extend to project end"],
      ["cycle", "Cycle range"],
      ["trim-silence", "Trim silence at file end"],
    ],
  };

  const nodes = {
    preset: document.getElementById("bounce-preset-selector"),
    modified: document.getElementById("preset-modified-badge"),
    newPreset: document.getElementById("btn-new-preset"),
    savePreset: document.getElementById("btn-save-preset"),
    deletePreset: document.getElementById("btn-delete-preset"),
    delivery: Array.from(document.querySelectorAll('input[name="delivery"]')),
    stepButtons: Array.from(document.querySelectorAll("[data-step-button]")),
    steps: Array.from(document.querySelectorAll("[data-step]")),
    format: document.getElementById("bounce-format"),
    bitDepth: document.getElementById("bounce-bit-depth"),
    sampleRate: document.getElementById("bounce-sample-rate"),
    range: document.getElementById("bounce-range"),
    normalize: document.getElementById("bounce-normalize"),
    includePlugins: document.getElementById("toggle-inserts-active"),
    includeAutomation: document.getElementById("toggle-volume-pan-active"),
    includeTail: document.getElementById("toggle-audio-tail"),
    audioTailRow: document.getElementById("audio-tail-row"),
    ditherNote: document.getElementById("dither-note"),
    settingsSummary: document.getElementById("settings-summary"),
    path: document.getElementById("logic-menu-path"),
    explanation: document.getElementById("logic-path-explanation"),
    warning: document.getElementById("logic-warning"),
    trackInput: document.getElementById("bounce-track-input"),
    importTracks: document.getElementById("btn-import-tracks"),
    loadExample: document.getElementById("btn-load-example"),
    tracksList: document.getElementById("bounce-tracks-list"),
    trackSummary: document.getElementById("bounce-track-summary"),
    review: document.getElementById("bounce-result-preview"),
    preflightChecks: Array.from(
      document.querySelectorAll("#preflight-checks input")
    ),
    preflightProgress: document.getElementById("preflight-progress"),
    preflightFill: document.getElementById("preflight-meter-fill"),
    continueFiles: document.getElementById("btn-continue-files"),
    continueReview: document.getElementById("btn-continue-review"),
    backButtons: Array.from(document.querySelectorAll("[data-go-back]")),
    copy: document.getElementById("btn-copy-recipe"),
    download: document.getElementById("btn-download-recipe"),
    status: document.getElementById("bounce-status"),
    demo: document.getElementById("bounce-demo-button"),
  };

  if (!nodes.preset) return;

  let presets = loadPresets();
  let activePresetId = "mix-handoff";
  let tracks = [];
  let modified = false;
  let activeStep = "deliverable";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function loadPresets() {
    try {
      return {
        ...clone(DEFAULT_PRESETS),
        ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
      };
    } catch (_error) {
      return clone(DEFAULT_PRESETS);
    }
  }

  function persistPresets() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch (_error) {
      setStatus(
        "This browser blocked preset storage. Your current plan still works."
      );
    }
  }

  function getDelivery() {
    return nodes.delivery.find((input) => input.checked)?.value || "all-tracks";
  }

  function setDelivery(value) {
    nodes.delivery.forEach((input) => {
      input.checked = input.value === value;
    });
  }

  function setRangeOptions(delivery, requestedValue) {
    const options =
      delivery === "stereo" ? RANGE_OPTIONS.stereo : RANGE_OPTIONS.tracks;
    nodes.range.innerHTML = options
      .map(([value, label]) => `<option value="${value}">${label}</option>`)
      .join("");
    nodes.range.value = options.some(([value]) => value === requestedValue)
      ? requestedValue
      : options[0][0];
  }

  function renderPresetOptions() {
    nodes.preset.innerHTML = Object.values(presets)
      .map(
        (preset) =>
          `<option value="${escapeHtml(preset.id)}">${escapeHtml(preset.label)}</option>`
      )
      .join("");
    nodes.preset.value = activePresetId;
  }

  function loadPreset(id) {
    const preset = presets[id];
    if (!preset) return;
    activePresetId = id;
    setDelivery(preset.delivery);
    nodes.format.value = preset.format;
    nodes.bitDepth.value = preset.bitDepth;
    nodes.sampleRate.value = preset.sampleRate;
    nodes.normalize.value = preset.normalize;
    nodes.includePlugins.checked = preset.includePlugins;
    nodes.includeAutomation.checked = preset.includeAutomation;
    nodes.includeTail.checked = preset.includeTail;
    tracks = Array.isArray(preset.tracks) ? [...preset.tracks] : [];
    nodes.trackInput.value = "";
    setRangeOptions(preset.delivery, preset.range);
    nodes.preset.value = id;
    setModified(false);
    renderAll();
  }

  function snapshotPlan() {
    return {
      id: activePresetId,
      label: presets[activePresetId]?.label || "Custom plan",
      delivery: getDelivery(),
      format: nodes.format.value,
      bitDepth: nodes.bitDepth.value,
      sampleRate: nodes.sampleRate.value,
      range: nodes.range.value,
      normalize: nodes.normalize.value,
      includePlugins: nodes.includePlugins.checked,
      includeAutomation: nodes.includeAutomation.checked,
      includeTail: nodes.includeTail.checked,
      tracks: [...tracks],
    };
  }

  function setModified(value) {
    modified = value;
    nodes.modified.hidden = !value;
  }

  function markModified() {
    setModified(true);
    renderAll();
  }

  function extension() {
    return nodes.format.value === "AIFF" ? "aif" : "wav";
  }

  function rateLabel() {
    return nodes.sampleRate.value === "project"
      ? "Project rate"
      : `${Number(nodes.sampleRate.value) / 1000} kHz`;
  }

  function outputTracks() {
    return getDelivery() === "stereo" ? [tracks[0] || "Final Mix"] : tracks;
  }

  function renderWorkflow() {
    const workflow = WORKFLOWS[getDelivery()];
    nodes.path.textContent = workflow.path;
    nodes.explanation.textContent = workflow.explanation;
    nodes.warning.textContent = workflow.warning;
    nodes.audioTailRow.hidden = getDelivery() !== "stereo";
    nodes.settingsSummary.textContent = `${nodes.bitDepth.value}-bit · ${rateLabel()}`;
    nodes.ditherNote.hidden = nodes.bitDepth.value !== "16";
  }

  function renderTrackList() {
    const listedTracks = outputTracks();
    nodes.trackSummary.textContent = `${listedTracks.length} planned ${listedTracks.length === 1 ? "file" : "files"}`;
    nodes.tracksList.innerHTML = listedTracks.length
      ? listedTracks
          .map(
            (track, index) => `<tr>
              <td>${escapeHtml(track)}</td>
              <td>${escapeHtml(track.replace(/[\\/:*?"<>|]+/g, "-").trim())}.${extension()}</td>
              <td>Ready</td>
              <td><button type="button" data-remove-track="${index}" aria-label="Remove ${escapeHtml(track)}">Remove</button></td>
            </tr>`
          )
          .join("")
      : '<tr><td colspan="4">Add track names to build the plan.</td></tr>';
  }

  function renderReview() {
    const workflow = WORKFLOWS[getDelivery()];
    const files = outputTracks();
    nodes.review.innerHTML = [
      [
        "Deliverable",
        getDelivery() === "stereo"
          ? "Stereo mix"
          : getDelivery() === "all-tracks"
            ? "All individual tracks"
            : "Selected tracks",
      ],
      [
        "Render",
        `${nodes.format.value} · ${nodes.bitDepth.value}-bit · ${rateLabel()}`,
      ],
      [
        "Files",
        `${files.length} ${files.length === 1 ? "file" : "files"} planned`,
      ],
      ["Logic path", workflow.path],
      [
        "Processing",
        `${nodes.includePlugins.checked ? "Plug-ins" : "Dry tracks"} · ${nodes.includeAutomation.checked ? "Automation" : "Static levels"}`,
      ],
      [
        "Range",
        nodes.range.options[nodes.range.selectedIndex]?.textContent ||
          "Project end",
      ],
    ]
      .map(
        ([label, value]) =>
          `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`
      )
      .join("");
  }

  function renderPreflight() {
    const checked = nodes.preflightChecks.filter(
      (input) => input.checked
    ).length;
    const total = nodes.preflightChecks.length;
    nodes.preflightProgress.textContent = `${checked} of ${total} checked`;
    nodes.preflightFill.style.width = `${(checked / total) * 100}%`;
  }

  function setStep(step, shouldScroll = true) {
    activeStep = step;
    nodes.steps.forEach((section) => {
      section.hidden = section.dataset.step !== step;
    });
    nodes.stepButtons.forEach((button) => {
      const selected = button.dataset.stepButton === step;
      if (selected) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    if (shouldScroll) {
      document
        .getElementById("logic-auto-bounce-workbench")
        .scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderAll() {
    renderWorkflow();
    renderTrackList();
    renderReview();
    renderPreflight();
  }

  function normalizeTracks(text) {
    const seen = new Set();
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => {
        const key = line.toLowerCase();
        if (!line || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function importTracks() {
    const imported = normalizeTracks(nodes.trackInput.value);
    if (!imported.length) {
      setStatus("Paste at least one track name to build the file list.");
      nodes.trackInput.focus();
      return;
    }
    tracks = imported;
    nodes.trackInput.value = "";
    setStatus(
      `Imported ${tracks.length} ${tracks.length === 1 ? "track" : "tracks"}.`
    );
    markModified();
  }

  function removeTrack(index) {
    tracks.splice(index, 1);
    setStatus("Removed that track from the plan.");
    markModified();
  }

  function createPreset() {
    const label = window.prompt("Name this bounce plan:");
    if (!label || !label.trim()) return;
    const base =
      label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || `plan-${Date.now()}`;
    let id = base;
    let suffix = 2;
    while (presets[id]) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    presets[id] = { ...snapshotPlan(), id, label: label.trim() };
    activePresetId = id;
    persistPresets();
    renderPresetOptions();
    loadPreset(id);
    setStatus(`Saved “${label.trim()}” as a new plan.`);
  }

  function savePreset() {
    const label = presets[activePresetId].label;
    presets[activePresetId] = { ...snapshotPlan(), id: activePresetId, label };
    persistPresets();
    setModified(false);
    setStatus(`Saved changes to “${label}”.`);
  }

  function deletePreset() {
    if (DEFAULT_PRESETS[activePresetId]) {
      setStatus("Built-in presets cannot be deleted.");
      return;
    }
    const label = presets[activePresetId].label;
    if (!window.confirm(`Delete the saved plan “${label}”?`)) return;
    delete presets[activePresetId];
    activePresetId = "mix-handoff";
    persistPresets();
    renderPresetOptions();
    loadPreset(activePresetId);
    setStatus(`Deleted “${label}”.`);
  }

  function buildChecklist() {
    const plan = snapshotPlan();
    const files = outputTracks();
    const range =
      nodes.range.options[nodes.range.selectedIndex]?.textContent ||
      "Project end";
    return [
      "DIRT CAT RECORDS · LOGIC AUTO BOUNCE PLAN",
      "",
      `Plan: ${plan.label}${modified ? " (edited)" : ""}`,
      `Logic command: ${WORKFLOWS[plan.delivery].path}`,
      `Format: ${plan.format} · ${plan.bitDepth}-bit · ${rateLabel()}`,
      `Range: ${range}`,
      `Plug-ins: ${plan.includePlugins ? "Included" : "Bypassed"}`,
      `Automation: ${plan.includeAutomation ? "Rendered" : "Not rendered"}`,
      plan.delivery === "stereo"
        ? `Audio tail: ${plan.includeTail ? "Included" : "Not included"}`
        : "",
      "",
      "PLANNED FILES",
      ...files.map((track) => `• ${track}.${extension()}`),
      "",
      "PREFLIGHT",
      "□ Save a new project version.",
      "□ Confirm project end or cycle range leaves room for tails.",
      "□ Review sidechains, aux returns, and bus stems.",
      "□ Use Realtime for external MIDI, live inputs, or DSP hardware.",
      "",
      `NOTE: ${WORKFLOWS[plan.delivery].warning}`,
      "This plan does not control Logic Pro or inspect the open project. Verify the Logic export dialog before rendering.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function copyChecklist() {
    const text = buildChecklist();
    try {
      await navigator.clipboard.writeText(text);
    } catch (_error) {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setStatus("Logic checklist copied to the clipboard.");
  }

  function downloadPlan() {
    const blob = new Blob([buildChecklist()], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(presets[activePresetId]?.label || "logic-bounce-plan").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("Downloaded the session plan.");
  }

  function setStatus(message) {
    nodes.status.textContent = message;
  }

  function loadDemo() {
    setDelivery("all-tracks");
    setRangeOptions("all-tracks", "project-end");
    nodes.format.value = "WAV";
    nodes.bitDepth.value = "24";
    nodes.sampleRate.value = "project";
    nodes.normalize.value = "off";
    nodes.includePlugins.checked = true;
    nodes.includeAutomation.checked = true;
    tracks = [...EXAMPLE_TRACKS];
    nodes.preflightChecks.forEach((input, index) => {
      input.checked = index < 2;
    });
    setStatus(
      "Demo loaded: eight full-length 24-bit track files ready to review."
    );
    markModified();
  }

  function bindEvents() {
    nodes.preset.addEventListener("change", () =>
      loadPreset(nodes.preset.value)
    );
    nodes.newPreset.addEventListener("click", createPreset);
    nodes.savePreset.addEventListener("click", savePreset);
    nodes.deletePreset.addEventListener("click", deletePreset);
    nodes.delivery.forEach((input) =>
      input.addEventListener("change", () => {
        setRangeOptions(
          getDelivery(),
          getDelivery() === "stereo" ? "entire-project" : "project-end"
        );
        markModified();
      })
    );
    [
      nodes.format,
      nodes.bitDepth,
      nodes.sampleRate,
      nodes.range,
      nodes.normalize,
      nodes.includePlugins,
      nodes.includeAutomation,
      nodes.includeTail,
    ].forEach((input) => input.addEventListener("change", markModified));
    nodes.importTracks.addEventListener("click", importTracks);
    nodes.loadExample.addEventListener("click", () => {
      nodes.trackInput.value = EXAMPLE_TRACKS.join("\n");
      importTracks();
    });
    nodes.tracksList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-track]");
      if (button) removeTrack(Number(button.dataset.removeTrack));
    });
    nodes.preflightChecks.forEach((input) =>
      input.addEventListener("change", renderPreflight)
    );
    nodes.stepButtons.forEach((button) =>
      button.addEventListener("click", () => setStep(button.dataset.stepButton))
    );
    nodes.continueFiles.addEventListener("click", () => setStep("files"));
    nodes.continueReview.addEventListener("click", () => setStep("review"));
    nodes.backButtons.forEach((button) =>
      button.addEventListener("click", () => setStep(button.dataset.goBack))
    );
    nodes.copy.addEventListener("click", copyChecklist);
    nodes.download.addEventListener("click", downloadPlan);
    nodes.demo.addEventListener("click", loadDemo);
  }

  renderPresetOptions();
  bindEvents();
  loadPreset(activePresetId);
  setStep(activeStep, false);

  window.LogicBouncePlannerTest = {
    buildChecklist,
    getPlan: snapshotPlan,
    setStep,
  };
})();
