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
  let currentTracks = [];

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
    if (!presetSelector) return; // Guard for pages without the preferences DOM

    renderPresetDropdown();
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

    // Bind track actions
    const btnAddToggle = document.getElementById("btn-add-track-toggle");
    const btnPasteToggle = document.getElementById("btn-paste-tracks-toggle");
    const btnReset = document.getElementById("btn-reset-tracks");

    const addTrackPanel = document.getElementById("add-track-form-panel");
    const pasteModal = document.getElementById("paste-tracks-modal");

    const btnSubmitAdd = document.getElementById("btn-submit-add-track");
    const btnSubmitPaste = document.getElementById("btn-submit-paste-tracks");
    const btnClosePaste = document.getElementById("btn-close-paste-modal");
    const pasteTextarea = document.getElementById("paste-tracks-textarea");

    if (btnAddToggle) {
      btnAddToggle.addEventListener("click", () => {
        addTrackPanel.hidden = !addTrackPanel.hidden;
      });
    }

    if (btnPasteToggle) {
      btnPasteToggle.addEventListener("click", () => {
        pasteModal.hidden = false;
        if (pasteTextarea) pasteTextarea.focus();
      });
    }

    if (btnClosePaste) {
      btnClosePaste.addEventListener("click", () => {
        pasteModal.hidden = true;
        if (pasteTextarea) pasteTextarea.value = "";
      });
    }

    if (btnSubmitAdd) {
      btnSubmitAdd.addEventListener("click", handleAddSingleTrack);
    }

    if (btnSubmitPaste) {
      btnSubmitPaste.addEventListener("click", () => {
        if (pasteTextarea) {
          handleBatchImport(pasteTextarea.value);
          pasteTextarea.value = "";
        }
        pasteModal.hidden = true;
      });
    }

    if (btnReset) {
      btnReset.addEventListener("click", resetTracksToDefault);
    }
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

    // Load custom tracks if present, otherwise fall back to defaults
    if (p.tracks && Array.isArray(p.tracks)) {
      currentTracks = JSON.parse(JSON.stringify(p.tracks));
    } else {
      currentTracks = JSON.parse(JSON.stringify(DISCOVERED_TRACKS));
    }

    renderTracksTable();
    updateTrackPoliciesForPreset(p);
    updateRecipeJSON();
    refreshSidechainSelectors();
  }

  function updateTrackPoliciesForPreset(preset) {
    selectedTrackPolicies = {};
    currentTracks.forEach((track) => {
      if (track.policy && track.policy !== "none") {
        selectedTrackPolicies[track.name] = track.policy;
      } else if (track.sidechain && track.sidechain !== "none") {
        if (preset.id === "mix-prep-dry") {
          selectedTrackPolicies[track.name] = "bypass-sidechain";
        } else {
          selectedTrackPolicies[track.name] =
            track.defaultPolicy || "preserve-pump";
        }
      } else {
        selectedTrackPolicies[track.name] = "none";
      }
    });
    updateTracksTableDropdowns();
  }

  function renderTracksTable() {
    if (!tracksBody) return;
    tracksBody.innerHTML = "";
    currentTracks.forEach((track) => {
      const tr = document.createElement("tr");

      const tdName = document.createElement("td");
      tdName.textContent = track.name;
      tr.appendChild(tdName);

      const tdType = document.createElement("td");
      tdType.textContent = track.type;
      tr.appendChild(tdType);

      const tdSidechain = document.createElement("td");
      if (track.sidechain && track.sidechain !== "none") {
        tdSidechain.innerHTML = `<span style="color: var(--brick-lane-yellow);">⚡ sidechain from ${track.sidechain}</span>`;
      } else {
        tdSidechain.textContent = "-";
      }
      tr.appendChild(tdSidechain);

      const tdPolicy = document.createElement("td");
      if (track.sidechain && track.sidechain !== "none") {
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

      // Actions Column
      const tdAction = document.createElement("td");
      const btnDelete = document.createElement("button");
      btnDelete.type = "button";
      btnDelete.className = "btn-delete-track";
      btnDelete.innerHTML = "🗑️";
      btnDelete.title = "Delete track";
      btnDelete.addEventListener("click", () => {
        deleteTrack(track.name);
      });
      tdAction.appendChild(btnDelete);
      tr.appendChild(tdAction);

      tracksBody.appendChild(tr);
    });
  }

  function updateTracksTableDropdowns() {
    if (!tracksBody) return;
    const selects = tracksBody.querySelectorAll("select");
    selects.forEach((select) => {
      const trackName = select.dataset.track;
      if (selectedTrackPolicies[trackName]) {
        select.value = selectedTrackPolicies[trackName];
      }
    });
  }

  function refreshSidechainSelectors() {
    const selector = document.getElementById("new-track-sidechain");
    if (!selector) return;

    selector.innerHTML = '<option value="none">No Sidechain</option>';
    currentTracks.forEach((track) => {
      const opt = document.createElement("option");
      opt.value = track.name;
      opt.textContent = track.name;
      selector.appendChild(opt);
    });
  }

  function handleAddSingleTrack() {
    const nameInput = document.getElementById("new-track-name");
    const typeSelect = document.getElementById("new-track-type");
    const sidechainSelect = document.getElementById("new-track-sidechain");

    if (!nameInput || !nameInput.value.trim()) {
      alert("Please enter a track name.");
      return;
    }

    const trackName = nameInput.value.trim();
    if (
      currentTracks.some(
        (t) => t.name.toLowerCase() === trackName.toLowerCase()
      )
    ) {
      alert("A track with this name already exists.");
      return;
    }

    const trackType = typeSelect.value;
    const sidechain = sidechainSelect.value;

    const newTrack = {
      name: trackName,
      type: trackType,
      sidechain: sidechain,
      defaultPolicy: sidechain !== "none" ? "preserve-pump" : "none",
    };

    currentTracks.push(newTrack);
    selectedTrackPolicies[trackName] =
      sidechain !== "none" ? "preserve-pump" : "none";

    nameInput.value = "";
    sidechainSelect.value = "none";

    markModified();
    renderTracksTable();
    updateTracksTableDropdowns();
    refreshSidechainSelectors();
  }

  function handleBatchImport(text) {
    if (!text || !text.trim()) return;

    const lines = text.split("\n");
    let addedCount = 0;

    lines.forEach((line) => {
      const trackName = line.trim();
      if (!trackName) return;

      if (
        currentTracks.some(
          (t) => t.name.toLowerCase() === trackName.toLowerCase()
        )
      ) {
        return;
      }

      let type = "Audio";
      const lower = trackName.toLowerCase();
      if (
        lower.includes("aux") ||
        lower.includes("reverb") ||
        lower.includes("delay") ||
        lower.includes("send") ||
        lower.includes("bus")
      ) {
        type = "Aux";
      } else if (
        lower.includes("synth") ||
        lower.includes("inst") ||
        lower.includes("midi") ||
        lower.includes("piano") ||
        lower.includes("keys")
      ) {
        type = "Software Instrument";
      }

      currentTracks.push({
        name: trackName,
        type: type,
        sidechain: "none",
        defaultPolicy: "none",
      });

      selectedTrackPolicies[trackName] = "none";
      addedCount += 1;
    });

    if (addedCount > 0) {
      markModified();
      renderTracksTable();
      updateTracksTableDropdowns();
      refreshSidechainSelectors();
    }
  }

  function deleteTrack(trackName) {
    currentTracks = currentTracks.filter((t) => t.name !== trackName);

    currentTracks.forEach((t) => {
      if (t.sidechain === trackName) {
        t.sidechain = "none";
        t.defaultPolicy = "none";
      }
    });

    delete selectedTrackPolicies[trackName];

    markModified();
    renderTracksTable();
    updateTracksTableDropdowns();
    refreshSidechainSelectors();
  }

  function resetTracksToDefault() {
    if (
      !confirm(
        "Are you sure you want to reset all tracks to the default session tracks?"
      )
    ) {
      return;
    }
    currentTracks = JSON.parse(JSON.stringify(DISCOVERED_TRACKS));
    selectedTrackPolicies = {};

    markModified();
    renderTracksTable();
    updateTrackPoliciesForPreset(presets[activePresetId]);
    updateRecipeJSON();
    refreshSidechainSelectors();
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
      tracks: JSON.parse(JSON.stringify(currentTracks)),
    };

    activePresetId = id;
    savePresetsToStorage();
    renderPresetDropdown();
    loadActivePreset(activePresetId);
  }

  function saveActivePreset() {
    const p = presets[activePresetId];
    if (!p) return;

    p.bitDepth = bitDepthSelect.value;
    p.sampleRate = sampleRateSelect.value;
    p.range = rangeSelect.value;
    p.toggles = {
      insertsActive: toggleInserts.checked,
      instrumentsActive: toggleInstruments.checked,
      masterBusActive: toggleMaster.checked,
      volumePanActive: toggleVolPan.checked,
      printFxAuxes: togglePrintFx.checked,
      printSubgroups: togglePrintSubgroups.checked,
    };

    p.tracks = currentTracks.map((t) => ({
      ...t,
      policy: selectedTrackPolicies[t.name] || "none",
    }));

    savePresetsToStorage();
    badgeModified.hidden = true;
    updateRecipeJSON();
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
    const trackPoliciesList = currentTracks.map((track) => ({
      trackName: track.name,
      type: track.type,
      sidechain: track.sidechain || "none",
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
    if (recipePreview) {
      recipePreview.textContent = JSON.stringify(recipe, null, 2);
    }
  }

  function copyRecipeToClipboard() {
    if (!recipePreview) return;
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
