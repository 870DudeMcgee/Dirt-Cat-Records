(function initBrickLaneLab(globalScope) {
  const data =
    globalScope.BrickLaneData ||
    (typeof require === "function" ? require("./brick-lane-data") : null);

  const stateMachine =
    globalScope.BrickLaneLabStateMachine ||
    (typeof require === "function" ? require("./lib/lab/state-machine") : null);

  const resolver =
    globalScope.BrickLaneResolver ||
    (typeof require === "function"
      ? require("./lib/lab/brick-lane-resolver")
      : null);

  let audioCtx = null;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function playShortClick(freq, vol) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        freq / 2,
        audioCtx.currentTime + 0.05
      );

      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx.currentTime + 0.04
      );

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.06);
    } catch (e) {
      // Fallback if browser blocks audio
    }
  }

  function renderExactLedLadder({
    color,
    scale,
    displayScale,
    activeLedValues,
    selected,
    id,
    visualScale,
    exactSelected,
  }) {
    const resolvedScale = displayScale || scale || [];
    const selectedSet = new Set(
      activeLedValues || (selected || []).map(String)
    );
    const ledColor = data.BRICK_LANE_COLORS[color] || color;

    let maxSelectedVal = -1;
    if (
      !activeLedValues &&
      id !== "detector" &&
      selected &&
      selected.length > 0 &&
      !exactSelected
    ) {
      maxSelectedVal = Math.max(...selected.map((value) => parseFloat(value)));
    }

    const rungs = resolvedScale
      .map((label, index) => {
        let isOn = selectedSet.has(label) ? " is-on" : "";
        if (!activeLedValues && maxSelectedVal >= 0) {
          const valNum = parseFloat(label);
          if (valNum <= maxSelectedVal) isOn = " is-on";
        }
        const visualLabel = visualScale ? visualScale[index] : label;
        return `<span class="brick-lane-rung${isOn}" data-val="${escapeHtml(label)}" aria-hidden="true"></span><span class="brick-lane-led-label">${escapeHtml(visualLabel)}</span>`;
      })
      .join("");

    return `<div class="brick-lane-led-housing" style="--brick-lane-led:${escapeHtml(ledColor)}"><div class="brick-lane-led-ladder">${rungs}<span class="brick-lane-gr-tag">GR</span><span></span></div></div>`;
  }

  function normalizeModeKey(mode) {
    const key = String(mode || "")
      .trim()
      .toUpperCase();
    if (key.includes("POLISH")) return "POLISH";
    return key;
  }

  function getModeGuide(mode) {
    return data.ENIGMA_DEMYSTIFIER.modes[normalizeModeKey(mode)] || null;
  }

  function getParameterGuide(parameterId) {
    return data.ENIGMA_DEMYSTIFIER.parameters[parameterId] || null;
  }

  function formatModeLabel(mode) {
    const modeGuide = getModeGuide(mode);
    if (!modeGuide) return String(mode || "");
    return `${modeGuide.hardwareLabel} - ${modeGuide.family}`;
  }

  function renderParameterCard(parameter, options = {}) {
    const selected =
      options.selectedOverride || parameter.selection || parameter.selected;
    let resolved;

    try {
      resolved = resolver
        ? resolver.resolveParameterSelection(parameter, selected)
        : {
            label: Array.isArray(selected) ? selected.join(", ") : "",
            meaning: parameter.description || "",
            activeLedValues: Array.isArray(selected) ? selected : [],
            displayScale: parameter.displayScale || parameter.scale,
            behavior: parameter.behavior || "legacy-rungs",
          };
    } catch (_error) {
      resolved = {
        label: "Setting unavailable",
        meaning:
          "This setting could not be resolved from the Brick Lane data map.",
        activeLedValues: [],
        displayScale: parameter.displayScale || parameter.scale,
        behavior: parameter.behavior || "unresolved",
      };
    }

    const ledColor = data.BRICK_LANE_COLORS[parameter.color] || parameter.color;
    const monitoredClass = options.isMonitored ? " is-monitored" : "";
    const guide = getParameterGuide(parameter.id);
    const plainLabel = guide
      ? `<p class="brick-lane-plain-label">${escapeHtml(guide.userLabel)}</p>`
      : "";
    const plainMeaning = resolved.meaning
      ? `<p class="brick-lane-plain-meaning">${escapeHtml(resolved.meaning)}</p>`
      : guide
        ? `<p class="brick-lane-plain-meaning">${escapeHtml(guide.plainMeaning)}</p>`
        : "";
    const resolvedLabel = resolved.label
      ? `<p class="brick-lane-resolved-setting">${escapeHtml(resolved.label)}</p>`
      : "";

    return `<article class="brick-lane-parameter-card${monitoredClass}" data-parameter-id="${escapeHtml(parameter.id)}" style="--brick-lane-led:${escapeHtml(ledColor)}">
      <h3>${escapeHtml(parameter.label)}</h3>
      ${plainLabel}
      ${resolvedLabel}
      <p>${escapeHtml(parameter.side)}. ${escapeHtml(parameter.description || "")}</p>
      ${plainMeaning}
      ${renderExactLedLadder({
        ...parameter,
        displayScale: resolved.displayScale,
        activeLedValues: resolved.activeLedValues,
        exactSelected: Boolean(options.selectedOverride),
      })}
    </article>`;
  }

  function renderPresetSummary(preset) {
    const frontPanel = preset.frontPanel;
    const modeGuide = getModeGuide(preset.mode);
    const modeLabel = formatModeLabel(preset.mode);
    const saturationSummary = data.ENIGMA_DEMYSTIFIER.saturation.summary;
    const modeFamily = modeGuide
      ? `<p class="brick-lane-mode-family">${escapeHtml(modeLabel)}</p>`
      : "";
    return `<section class="brick-lane-summary-card">
      <p class="brick-lane-kicker">Generated Preset</p>
      <h2>${escapeHtml(preset.mode)}: ${escapeHtml(preset.label)}</h2>
      ${modeFamily}
      <p>${escapeHtml(preset.summary)}</p>
      <p class="brick-lane-saturation-note">${escapeHtml(saturationSummary)}</p>
      <dl class="brick-lane-front-panel">
        <div><dt>Target GR</dt><dd>${escapeHtml(preset.targetGainReduction)}</dd></div>
        <div><dt>Attack</dt><dd>${escapeHtml(frontPanel.attack)}</dd></div>
        <div><dt>Release</dt><dd>${escapeHtml(frontPanel.release)}</dd></div>
        <div><dt>Saturation (STRESS)</dt><dd>${escapeHtml(frontPanel.stress)}</dd></div>
        <div><dt>SCF</dt><dd>${escapeHtml(frontPanel.scf)}</dd></div>
        <div><dt>Threshold</dt><dd>${escapeHtml(frontPanel.threshold)}</dd></div>
      </dl>
    </section>`;
  }

  function createCopyText(preset) {
    const saturation = data.ENIGMA_DEMYSTIFIER.saturation;
    const lines = [
      `Brick Lane Sonic Lab - ${preset.mode}: ${preset.label}`,
      `Mode: ${formatModeLabel(preset.mode)}`,
      `Target GR: ${preset.targetGainReduction}`,
      `Input: ${preset.frontPanel.input}`,
      `Threshold: ${preset.frontPanel.threshold}`,
      `Attack: ${preset.frontPanel.attack}`,
      `Release: ${preset.frontPanel.release}`,
      `Output: ${preset.frontPanel.output}`,
      `${saturation.hardwareLabel} hardware control = ${saturation.userLabel}: ${preset.frontPanel.stress}`,
      `SCF: ${preset.frontPanel.scf}`,
      "",
      "Enigma Parameters:",
    ];

    for (const parameterId of preset.parameterOrder) {
      const parameter = preset.parameters[parameterId];
      const guide = getParameterGuide(parameterId);
      const label = guide
        ? `${parameter.label} / ${guide.userLabel}`
        : parameter.label;
      lines.push(
        `${label} (${parameter.side}, ${parameter.color}): ${parameter.selected.join(", ")}`
      );
    }

    if (Array.isArray(preset.why) && preset.why.length > 0) {
      lines.push("", "Why:");
      for (const reason of preset.why) lines.push(`- ${reason}`);
    }

    return lines.join("\n");
  }

  async function copyRecallText(text, environment = globalScope) {
    const navigatorRef = environment.navigator;
    const documentRef = environment.document;

    try {
      if (navigatorRef && navigatorRef.clipboard) {
        await navigatorRef.clipboard.writeText(text);
        return true;
      }
    } catch (_error) {
      // Fall through when the browser denies Clipboard API access.
    }

    if (!documentRef || typeof documentRef.execCommand !== "function") {
      return false;
    }

    const textarea = documentRef.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    documentRef.body.appendChild(textarea);
    textarea.select();

    try {
      return documentRef.execCommand("copy");
    } catch (_error) {
      return false;
    } finally {
      textarea.remove();
    }
  }

  function renderPrintSheet(preset) {
    const modeGuide = getModeGuide(preset.mode);
    const modeLabel = formatModeLabel(preset.mode);
    const saturation = data.ENIGMA_DEMYSTIFIER.saturation;
    const parameterCards = preset.parameterOrder
      .map((parameterId) => renderParameterCard(preset.parameters[parameterId]))
      .join("");
    const whyItems = Array.isArray(preset.why)
      ? preset.why.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")
      : "";

    return `<article class="brick-lane-print-document">
      <header class="brick-lane-print-header">
        <div>
          <h2>Brick Lane 500 - Generated Preset Cheat Sheet</h2>
          <p>${escapeHtml(preset.mode)}: ${escapeHtml(preset.label)}</p>
          ${modeGuide ? `<p class="brick-lane-mode-family">${escapeHtml(modeLabel)}</p>` : ""}
        </div>
        <div class="brick-lane-print-meta">
          <strong>Target GR:</strong> ${escapeHtml(preset.targetGainReduction)}<br>
          <strong>Use:</strong> ${escapeHtml(preset.useCaseId)}
        </div>
      </header>
      <section class="brick-lane-print-front-panel">
        <h3>Front-panel starting points</h3>
        <dl>
          <div><dt>Input</dt><dd>${escapeHtml(preset.frontPanel.input)}</dd></div>
          <div><dt>Threshold</dt><dd>${escapeHtml(preset.frontPanel.threshold)}</dd></div>
          <div><dt>Attack</dt><dd>${escapeHtml(preset.frontPanel.attack)}</dd></div>
          <div><dt>Release</dt><dd>${escapeHtml(preset.frontPanel.release)}</dd></div>
          <div><dt>Output</dt><dd>${escapeHtml(preset.frontPanel.output)}</dd></div>
          <div><dt>${escapeHtml(saturation.userLabel)} (${escapeHtml(saturation.hardwareLabel)})</dt><dd>${escapeHtml(preset.frontPanel.stress)}</dd></div>
          <div><dt>SCF</dt><dd>${escapeHtml(preset.frontPanel.scf)}</dd></div>
        </dl>
        <p class="brick-lane-saturation-note">${escapeHtml(saturation.summary)}</p>
      </section>
      <section class="brick-lane-print-parameters">
        ${parameterCards}
      </section>
      <section class="brick-lane-print-notes">
        <h3>Why</h3>
        <ul>${whyItems}</ul>
      </section>
    </article>`;
  }

  function renderUseCases(state) {
    return data.USE_CASES.map((useCase) => {
      const activeClass = useCase.id === state.useCaseId ? " is-active" : "";
      return `<button class="brick-lane-option${activeClass}" type="button" data-use-case-id="${escapeHtml(useCase.id)}"><span>${escapeHtml(useCase.label)}</span></button>`;
    }).join("");
  }

  function renderArchetypes(state) {
    return data
      .getArchetypesForUseCase(state.useCaseId)
      .map((archetype) => {
        const activeClass =
          archetype.id === state.archetypeId ? " is-active" : "";
        return `<button class="brick-lane-option${activeClass}" type="button" data-archetype-id="${escapeHtml(archetype.id)}"><span>${escapeHtml(archetype.label)}</span></button>`;
      })
      .join("");
  }

  function renderContext(preset) {
    const contextItems = [
      ["Style", preset.context.vocalStyle || "Genre/energy"],
      ["Brightness", preset.context.brightness || "Balanced"],
      ["Dynamics", preset.context.dynamics || "Controlled"],
      ["Target GR", preset.targetGainReduction],
    ];

    return `<div class="brick-lane-source-grid">${contextItems
      .map(
        ([label, value]) =>
          `<div class="brick-lane-source-tile"><strong>${escapeHtml(label)}:</strong>${escapeHtml(value)}</div>`
      )
      .join("")}</div>`;
  }

  function knobAngle(value) {
    return Math.round(-135 + (Number(value) / 100) * 270);
  }

  function normalizePanelValue(value, fallback = 50) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return fallback;
    return Math.min(100, Math.max(0, numericValue));
  }

  function formatPanelReadout(param, value) {
    let valString = "";
    const normalizedValue = normalizePanelValue(value);
    if (param === "input" || param === "output") {
      const db = ((normalizedValue / 100) * 40 - 20).toFixed(1);
      valString = (db >= 0 ? "+" : "") + db + " dB";
    } else if (param === "threshold") {
      const db = ((normalizedValue / 100) * 40 - 40).toFixed(1);
      valString = db + " dB";
    } else if (param === "attack") {
      const ms = Math.round(1 + (normalizedValue / 100) * 99);
      valString = ms + " ms";
    } else if (param === "release") {
      const ms = Math.round(10 + (normalizedValue / 100) * 990);
      valString = ms + " ms";
    } else if (param === "stress") {
      const units = ((normalizedValue / 100) * 10).toFixed(1);
      valString = units;
    }
    return valString;
  }

  function renderPhysicalKnob(knob, value, className = "brick-lane-main-knob") {
    const normalizedValue = normalizePanelValue(value);
    const param = knob.id;
    const valString = formatPanelReadout(param, normalizedValue);

    return `<div class="brick-lane-knob-container ${escapeHtml(className)}">
      <div class="brick-lane-knob-header">
        <span class="brick-lane-knob-name">${escapeHtml(knob.label)}</span>
        <span class="brick-lane-knob-readout" id="readout-fp-${param}">${valString}</span>
      </div>
      <div class="brick-lane-big-knob" data-param="${escapeHtml(param)}" data-val="${normalizedValue}" style="--brick-lane-knob-angle:${knobAngle(normalizedValue)}deg"></div>
      <div class="brick-lane-scale-row"><span>${escapeHtml(knob.low || "")}</span>${knob.center ? `<span>${escapeHtml(knob.center)}</span>` : ""}<span>${escapeHtml(knob.high || "")}</span></div>
      <div class="brick-lane-tooltip" id="tooltip-fp-${param}">${valString}</div>
    </div>`;
  }

  function renderPhysicalMeter(meter, activeScale = []) {
    const activeValues = new Set(activeScale.map(String));
    const ledColor = data.BRICK_LANE_COLORS[meter.color] || meter.color;
    const rungs = meter.scale
      .map((label) => {
        const activeClass = activeValues.has(String(label)) ? " is-on" : "";
        return `<span class="brick-lane-rung${activeClass}" data-val="${escapeHtml(label)}" aria-hidden="true"></span><span class="brick-lane-led-label">${escapeHtml(label)}</span>`;
      })
      .join("");

    return `<div class="brick-lane-physical-meter" data-meter-id="${escapeHtml(meter.id)}" style="--brick-lane-led:${escapeHtml(ledColor)}">
      <div class="brick-lane-mini-title">${escapeHtml(meter.label)}</div>
      <div class="brick-lane-led-housing"><div class="brick-lane-led-ladder">${rungs}</div></div>
    </div>`;
  }

  function renderPhysicalModeList(activeMode) {
    const normalizedActiveMode = normalizeModeKey(activeMode);
    const modes = data.FRONT_PANEL_REFERENCE.modeLabels;
    return `<div class="brick-lane-mode-list">${modes
      .map((mode) => {
        const activeClass = normalizedActiveMode === mode ? " is-active" : "";
        return `<span class="brick-lane-mode-dot${activeClass}">${escapeHtml(mode)}</span>`;
      })
      .join("")}</div>`;
  }

  function renderLowerHardware(fp) {
    const scfValue = fp.scf || "100 Hz";
    const linkValue = fp.link || "STEREO";
    const scfActive =
      scfValue === "120Hz" ||
      scfValue === "100 Hz" ||
      scfValue === "60 Hz or 100 Hz";
    return `<div class="brick-lane-lower-hardware">
      <div class="brick-lane-lower-section">
        <div class="brick-lane-mini-title">SCF</div>
        <div class="brick-lane-toggle-box ${scfActive ? "is-on" : ""}" data-param="scf">
          <span class="brick-lane-toggle-handle"></span>
        </div>
        <div class="brick-lane-toggle-label">${escapeHtml(scfValue)}</div>
      </div>
      <div class="brick-lane-lower-section">
        <div class="brick-lane-mini-title">MODE</div>
        <div class="brick-lane-toggle-box ${linkValue === "MONO" ? "is-on" : ""}" data-param="link">
          <span class="brick-lane-toggle-handle"></span>
        </div>
        <div class="brick-lane-toggle-label">${escapeHtml(linkValue)}</div>
      </div>
      <div class="brick-lane-lower-section">
        <div class="brick-lane-mini-title">optosync</div>
        <div class="brick-lane-toggle-box is-on" aria-hidden="true">
          <span class="brick-lane-toggle-handle"></span>
        </div>
      </div>
      <div class="brick-lane-lower-section">
        <div class="brick-lane-mini-title">IN</div>
        <div class="brick-lane-toggle-box is-on" aria-hidden="true">
          <span class="brick-lane-toggle-handle"></span>
        </div>
      </div>
    </div>`;
  }

  function renderHardwareFaceplate(preset, state = {}) {
    const fp = state.frontPanelValues ||
      preset.frontPanelValues || {
        input: 50,
        threshold: 48,
        attack: 42,
        release: 52,
        output: 50,
        stress: 28,
        scf: "100 Hz",
        link: "STEREO",
      };
    const reference = data.FRONT_PANEL_REFERENCE;
    const hardwareModeLabel =
      getModeGuide(preset.mode)?.hardwareLabel || normalizeModeKey(preset.mode);

    return `<div class="brick-lane-hardware" aria-label="Brick Lane 500 front panel">
      <div class="brick-lane-rack-ear brick-lane-rack-ear-top" aria-hidden="true"></div>
      <div class="brick-lane-faceplate-core">
      <div class="brick-lane-stripe"></div>
      <div class="brick-lane-brand-lockup">
        <div>
          <div class="brick-lane-brand">BRICK LANE</div>
          <div class="brick-lane-model-label">modal compressor</div>
        </div>
        <div class="brick-lane-mode-label" id="brick-lane-hw-mode">${escapeHtml(hardwareModeLabel)}</div>
      </div>
      <div class="brick-lane-panel-body">
        <div class="brick-lane-main-controls">
          ${reference.mainKnobs
            .map((knob) => renderPhysicalKnob(knob, fp[knob.id]))
            .join("")}
        </div>
        <div class="brick-lane-right-controls">
          <div class="brick-lane-meter-pair">
            ${renderPhysicalMeter(reference.meters.sig)}
            ${renderPhysicalMeter(reference.meters.gr)}
          </div>
          ${renderPhysicalKnob(reference.stressKnob, fp.stress, "brick-lane-stress-knob")}
          ${renderPhysicalModeList(preset.mode)}
          ${renderLowerHardware(fp)}
        </div>
      </div>
      <footer class="brick-lane-footer-brand">CRANBORNE AUDIO</footer>
      </div>
      <div class="brick-lane-rack-ear brick-lane-rack-ear-bottom" aria-hidden="true"></div>
    </div>`;
  }

  function renderControls(state) {
    return data.CONTROL_DEFINITIONS.map((control) => {
      const value = state.controls[control.id] ?? control.defaultValue;
      const ledColor = data.BRICK_LANE_COLORS[control.color];
      return `<label class="brick-lane-control" style="--brick-lane-led:${escapeHtml(ledColor)};--brick-lane-value:${Number(value)}%;--brick-lane-angle:${knobAngle(value)}deg">
        <span>${escapeHtml(control.label)}</span>
        <div class="brick-lane-dial" aria-hidden="true"></div>
        <input type="range" min="0" max="100" value="${Number(value)}" data-control-id="${escapeHtml(control.id)}" aria-label="${escapeHtml(control.label)} to ${escapeHtml(control.oppositeLabel)}">
        <span>${escapeHtml(control.oppositeLabel)}</span>
      </label>`;
    }).join("");
  }

  function renderMonitorSelect(state) {
    const monitorParam = state.monitorParam || "VU";
    return `<div class="brick-lane-monitor-control">
      <select id="brick-lane-monitor-select" class="brick-lane-select" aria-label="Parameter Monitor">
        <option value="VU" ${monitorParam === "VU" ? "selected" : ""}>Monitor: VU (GR Mode)</option>
        <optgroup label="Left Enigma Parameters">
          <option value="stressTypeDiodeClipping" ${monitorParam === "stressTypeDiodeClipping" ? "selected" : ""}>Saturation character (Red)</option>
          <option value="diodeHardness" ${monitorParam === "diodeHardness" ? "selected" : ""}>Saturation hardness (Yellow)</option>
          <option value="sidechainHighFrequencyEmphasis" ${monitorParam === "sidechainHighFrequencyEmphasis" ? "selected" : ""}>Sidechain HF (Magenta)</option>
          <option value="detector" ${monitorParam === "detector" ? "selected" : ""}>Detector Curve (Cyan)</option>
          <option value="stereoMonoSidechainLinking" ${monitorParam === "stereoMonoSidechainLinking" ? "selected" : ""}>Sidechain Link (White)</option>
          <option value="stressCrossoverPhase" ${monitorParam === "stressCrossoverPhase" ? "selected" : ""}>Saturation crossover and phase (Blue)</option>
          <option value="crestFactorShaping" ${monitorParam === "crestFactorShaping" ? "selected" : ""}>Crest Shaping (Green)</option>
        </optgroup>
        <optgroup label="Right Enigma Parameters">
          <option value="ratio" ${monitorParam === "ratio" ? "selected" : ""}>Ratio Curve (Blue)</option>
          <option value="knee" ${monitorParam === "knee" ? "selected" : ""}>Knee Width (Cyan)</option>
          <option value="attackWeighting" ${monitorParam === "attackWeighting" ? "selected" : ""}>Attack Weight (Red)</option>
          <option value="releaseWeighting" ${monitorParam === "releaseWeighting" ? "selected" : ""}>Release Weight (White)</option>
          <option value="hold" ${monitorParam === "hold" ? "selected" : ""}>Hold Timing (Green)</option>
          <option value="lookahead" ${monitorParam === "lookahead" ? "selected" : ""}>Lookahead Time (Yellow)</option>
          <option value="ledBrightness" ${monitorParam === "ledBrightness" ? "selected" : ""}>LED Brightness (Magenta)</option>
        </optgroup>
      </select>
    </div>`;
  }

  // Upgraded Tabbed Recall Card category filtering
  function renderRecallCards(preset, state) {
    const activeTab = state.activeTab || "primary";
    const monitorParam = state.monitorParam || "VU";

    const tabsHtml = `
      <nav class="brick-lane-tabs">
        <button type="button" class="brick-lane-tab-btn ${activeTab === "primary" ? "is-active" : ""}" data-tab="primary">Primary (6)</button>
        <button type="button" class="brick-lane-tab-btn ${activeTab === "tone" ? "is-active" : ""}" data-tab="tone">Tone (4)</button>
        <button type="button" class="brick-lane-tab-btn ${activeTab === "timing" ? "is-active" : ""}" data-tab="timing">Timing (4)</button>
        <button type="button" class="brick-lane-tab-btn ${activeTab === "all" ? "is-active" : ""}" data-tab="all">All (14)</button>
      </nav>
    `;

    let parameterIds = [];
    if (activeTab === "primary") {
      parameterIds = [
        "sidechainHighFrequencyEmphasis",
        "detector",
        "ratio",
        "attackWeighting",
        "releaseWeighting",
        "crestFactorShaping",
      ];
    } else if (activeTab === "tone") {
      parameterIds = [
        "stressTypeDiodeClipping",
        "diodeHardness",
        "stressCrossoverPhase",
        "crestFactorShaping",
      ];
    } else if (activeTab === "timing") {
      parameterIds = ["knee", "hold", "lookahead", "ledBrightness"];
    } else if (activeTab === "all") {
      parameterIds = preset.parameterOrder;
    }

    if (
      monitorParam !== "VU" &&
      preset.parameters[monitorParam] &&
      !parameterIds.includes(monitorParam)
    ) {
      parameterIds = [...parameterIds, monitorParam];
    }

    const cardsHtml = `<div class="brick-lane-cards-grid ${activeTab === "all" ? "is-dense" : ""}">
      ${parameterIds
        .map((id) =>
          renderParameterCard(preset.parameters[id], {
            isMonitored: monitorParam !== "VU" && monitorParam === id,
            selectedOverride: state.parameterSelections?.[id],
          })
        )
        .join("")}
    </div>`;

    return renderMonitorSelect(state) + tabsHtml + cardsHtml;
  }

  function initDom() {
    const root = document.querySelector(".brick-lane-lab-page");
    if (!root) return;

    const nodes = {
      useCases: document.getElementById("brick-lane-use-cases"),
      archetypes: document.getElementById("brick-lane-archetypes"),
      context: document.getElementById("brick-lane-context"),
      faceplate: document.getElementById("brick-lane-faceplate"),
      controls: document.getElementById("brick-lane-controls"),
      summary: document.getElementById("brick-lane-preset-summary"),
      parameters: document.getElementById("brick-lane-parameters"),
      copy: document.getElementById("brick-lane-copy"),
      print: document.getElementById("brick-lane-print"),
      printSheet: document.getElementById("brick-lane-print-sheet"),
    };

    let state = stateMachine.getInitialState();

    function setUseCase(useCaseId) {
      state = stateMachine.labStateReducer(state, {
        type: "SET_USE_CASE",
        payload: { useCaseId },
      });
      render();
    }

    function render() {
      const preset = data.getGeneratedPreset(state);
      nodes.useCases.innerHTML = renderUseCases(state);
      nodes.archetypes.innerHTML = renderArchetypes(state);
      nodes.context.innerHTML = renderContext(preset);
      nodes.faceplate.innerHTML = renderHardwareFaceplate(preset, state);
      nodes.controls.innerHTML = renderControls(state);
      nodes.summary.innerHTML = renderPresetSummary(preset);
      nodes.parameters.innerHTML = renderRecallCards(preset, state);
    }

    // Dynamic click handler for category sub-nav tabs AND click-to-paint LED segments
    nodes.parameters.addEventListener("click", (event) => {
      const tabBtn = event.target.closest(".brick-lane-tab-btn");
      if (tabBtn) {
        state = stateMachine.labStateReducer(state, {
          type: "SET_ACTIVE_TAB",
          payload: { tab: tabBtn.dataset.tab },
        });
        render();
        playShortClick(700, 0.08);
        return;
      }

      const rung = event.target.closest(".brick-lane-rung");
      if (!rung) return;
      const card = rung.closest(".brick-lane-parameter-card");
      state = stateMachine.labStateReducer(state, {
        type: "TOGGLE_PARAMETER_RUNG",
        payload: {
          parameterId: card?.dataset.parameterId,
          value: rung.dataset.val,
        },
      });
      render();
      playShortClick(400, 0.05);
    });

    nodes.parameters.addEventListener("change", (event) => {
      const select = event.target.closest("#brick-lane-monitor-select");
      if (!select) return;
      state = stateMachine.labStateReducer(state, {
        type: "SET_MONITOR_PARAM",
        payload: { param: select.value },
      });
      render();
      playShortClick(800, 0.1);
    });

    // Faceplate Event listeners for mechanical switches
    nodes.faceplate.addEventListener("click", (event) => {
      const toggle = event.target.closest(".brick-lane-toggle-box");
      if (!toggle) return;

      const param = toggle.dataset.param;
      const isOn = toggle.classList.toggle("is-on");

      playShortClick(180, 0.15);
      playShortClick(90, 0.08);

      let value;
      if (param === "scf") {
        value = isOn ? "120Hz" : "60Hz";
      } else if (param === "link") {
        value = isOn ? "MONO" : "STEREO";
      }

      state = stateMachine.labStateReducer(state, {
        type: "UPDATE_FRONT_PANEL",
        payload: { param, value },
      });
      render();
    });

    // Circular Radial Draggable Dials (Faceplate Knobs)
    nodes.faceplate.addEventListener("mousedown", dragStartKnob);
    nodes.faceplate.addEventListener("touchstart", dragStartKnob, {
      passive: false,
    });

    function dragStartKnob(e) {
      const knob = e.target.closest(".brick-lane-big-knob");
      if (!knob) return;
      e.preventDefault();

      const container = knob.closest(".brick-lane-knob-container");
      if (container) container.classList.add("active-dragging");

      let startY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;
      let startVal = Number(knob.dataset.val);
      const param = knob.dataset.param;

      function dragMoveKnob(moveEvent) {
        moveEvent.preventDefault();
        const clientY =
          moveEvent.type === "touchmove"
            ? moveEvent.touches[0].clientY
            : moveEvent.clientY;
        const deltaY = startY - clientY;

        let newVal = startVal + deltaY * 0.45;
        if (newVal < 0) newVal = 0;
        if (newVal > 100) newVal = 100;

        knob.dataset.val = newVal;
        knob.style.setProperty(
          "--brick-lane-knob-angle",
          `${Math.round(-135 + (newVal / 100) * 270)}deg`
        );

        let valString = "";
        if (param === "input" || param === "output") {
          const db = ((newVal / 100) * 40 - 20).toFixed(1);
          valString = (db >= 0 ? "+" : "") + db + " dB";
        } else if (param === "threshold") {
          const db = ((newVal / 100) * 40 - 40).toFixed(1);
          valString = db + " dB";
        } else if (param === "attack") {
          const ms = Math.round(1 + (newVal / 100) * 99);
          valString = ms + " ms";
        } else if (param === "release") {
          const ms = Math.round(10 + (newVal / 100) * 990);
          valString = ms + " ms";
        } else if (param === "stress") {
          const units = ((newVal / 100) * 10).toFixed(1);
          valString = units;
        }

        const readout = container.querySelector(".brick-lane-knob-readout");
        if (readout) readout.textContent = valString;
        const tooltip = container.querySelector(".brick-lane-tooltip");
        if (tooltip) tooltip.textContent = valString;
      }

      function dragEndKnob() {
        if (container) container.classList.remove("active-dragging");
        document.removeEventListener("mousemove", dragMoveKnob);
        document.removeEventListener("mouseup", dragEndKnob);
        document.removeEventListener("touchmove", dragMoveKnob);
        document.removeEventListener("touchend", dragEndKnob);

        state = stateMachine.labStateReducer(state, {
          type: "UPDATE_FRONT_PANEL",
          payload: { param, value: Number(knob.dataset.val) },
        });
        render();
      }

      document.addEventListener("mousemove", dragMoveKnob);
      document.addEventListener("mouseup", dragEndKnob);
      document.addEventListener("touchmove", dragMoveKnob, { passive: false });
      document.addEventListener("touchend", dragEndKnob);

      playShortClick(600, 0.03);
    }

    // Draggable Bottom Dials
    nodes.controls.addEventListener("mousedown", dragStartDial);
    nodes.controls.addEventListener("touchstart", dragStartDial, {
      passive: false,
    });

    function dragStartDial(e) {
      const dial = e.target.closest(".brick-lane-dial");
      if (!dial) return;
      e.preventDefault();

      const label = dial.closest(".brick-lane-control");
      const input = label.querySelector("input[type='range']");
      const controlId = input.dataset.controlId;

      let startY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;
      let startVal = Number(input.value);

      function dragMoveDial(moveEvent) {
        moveEvent.preventDefault();
        const clientY =
          moveEvent.type === "touchmove"
            ? moveEvent.touches[0].clientY
            : moveEvent.clientY;
        const deltaY = startY - clientY;

        let newVal = startVal + deltaY * 0.45;
        if (newVal < 0) newVal = 0;
        if (newVal > 100) newVal = 100;

        input.value = newVal;
        label.style.setProperty("--brick-lane-value", `${newVal}%`);
        label.style.setProperty(
          "--brick-lane-angle",
          `${Math.round(-135 + (newVal / 100) * 270)}deg`
        );
      }

      function dragEndDial() {
        document.removeEventListener("mousemove", dragMoveDial);
        document.removeEventListener("mouseup", dragEndDial);
        document.removeEventListener("touchmove", dragMoveDial);
        document.removeEventListener("touchend", dragEndDial);

        state = stateMachine.labStateReducer(state, {
          type: "UPDATE_CONTROL",
          payload: { controlId, value: Number(input.value) },
        });
        render();
      }

      document.addEventListener("mousemove", dragMoveDial);
      document.addEventListener("mouseup", dragEndDial);
      document.addEventListener("touchmove", dragMoveDial, { passive: false });
      document.addEventListener("touchend", dragEndDial);

      playShortClick(600, 0.03);
    }

    // Dynamic simulation signal generator visualizer scope
    let activeAudioSim = false;
    let animationFrameId = null;
    let simulatedGainReductionLeft = 0;
    let simulatedGainReductionRight = 0;

    // Create and insert simulation button dynamically
    const simButton = document.createElement("button");
    simButton.type = "button";
    simButton.id = "brick-lane-sim";
    simButton.textContent = "▶ SIM SIGNAL";
    nodes.copy.parentNode.insertBefore(simButton, nodes.copy);

    // Create and insert scope dynamically in the sidebar
    const scopeContainer = document.createElement("div");
    scopeContainer.className = "brick-lane-scope-container";
    scopeContainer.innerHTML = `
      <div class="brick-lane-mini-title" style="margin-top: 1rem; color: var(--brick-lane-cyan); text-align: left;">Signal Generator</div>
      <div class="brick-lane-scope-box" style="margin-top: 0.3rem;">
        <canvas id="brick-lane-scope-canvas" style="width: 100%; height: 50px; display: block; background: #040508; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);"></canvas>
      </div>
    `;
    nodes.context.parentNode.appendChild(scopeContainer);

    const canvas = document.getElementById("brick-lane-scope-canvas");
    const ctx = canvas.getContext("2d");
    let canvasWidth = (canvas.width = canvas.offsetWidth || 190);
    let canvasHeight = (canvas.height = canvas.offsetHeight || 50);

    function clearScope() {
      ctx.fillStyle = "#040508";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvasHeight / 2);
      ctx.lineTo(canvasWidth, canvasHeight / 2);
      ctx.stroke();
    }

    clearScope();

    let synthOsc = null;
    let synthGain = null;

    function startAudioHum() {
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === "suspended") {
          audioCtx.resume();
        }
        synthOsc = audioCtx.createOscillator();
        synthOsc.type = "triangle";
        synthOsc.frequency.value = 55;
        synthGain = audioCtx.createGain();
        synthGain.gain.value = 0.012;
        synthOsc.connect(synthGain);
        synthGain.connect(audioCtx.destination);
        synthOsc.start();
      } catch (e) {}
    }

    function stopAudioHum() {
      if (synthOsc) {
        try {
          synthOsc.stop();
        } catch (e) {}
        synthOsc = null;
      }
    }

    simButton.addEventListener("click", () => {
      activeAudioSim = !activeAudioSim;
      if (activeAudioSim) {
        simButton.textContent = "■ STOP SIGNAL";
        simButton.classList.remove("brick-lane-primary");
        root.classList.add("audio-playing");
        startScopeAnimation();
        startAudioHum();
      } else {
        simButton.textContent = "▶ SIM SIGNAL";
        simButton.classList.add("brick-lane-primary");
        root.classList.remove("audio-playing");
        cancelAnimationFrame(animationFrameId);
        stopAudioHum();
        clearScope();
        render();
      }
      playShortClick(600, 0.1);
    });

    function startScopeAnimation() {
      let phase = 0;

      function renderScope() {
        if (!activeAudioSim) return;

        ctx.fillStyle = "rgba(4, 5, 8, 0.25)";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvasHeight / 2);
        ctx.lineTo(canvasWidth, canvasHeight / 2);
        ctx.stroke();

        ctx.strokeStyle =
          state.useCaseId === "mix-bus"
            ? "var(--brick-lane-blue)"
            : "var(--brick-lane-cyan)";
        ctx.lineWidth = 2;
        ctx.beginPath();

        let amplitude = 8 + Math.sin(phase * 0.02) * 3;
        let thresholdVal = state.frontPanelValues.threshold;
        let inputVal = state.frontPanelValues.input;

        let signal =
          Math.sin(phase * 0.1) * 0.6 +
          Math.sin(phase * 0.03) * 0.3 +
          (Math.random() - 0.5) * 0.08;
        let rawDB = signal * 15 + (inputVal - 50) * 0.4;
        let threshDB = (thresholdVal - 50) * 0.4;

        let gr = 0;
        if (rawDB > threshDB) {
          gr = (rawDB - threshDB) * 0.6;
        }

        simulatedGainReductionLeft =
          simulatedGainReductionLeft * 0.85 + gr * 0.15;
        simulatedGainReductionRight =
          simulatedGainReductionRight * 0.9 + gr * 0.1;

        for (let x = 0; x < canvasWidth; x++) {
          let y =
            canvasHeight / 2 +
            Math.sin(x * 0.06 + phase) * amplitude * (1 - gr * 0.05);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        animatePanelMetersRealtime(
          simulatedGainReductionLeft,
          simulatedGainReductionRight
        );

        phase += 0.25;
        animationFrameId = requestAnimationFrame(renderScope);
      }

      renderScope();
    }

    function animatePanelMetersRealtime(grLeft, grRight) {
      const leftMeterRungs = document.querySelectorAll(
        '[data-meter-id="sig"] .brick-lane-rung'
      );
      const rightMeterRungs = document.querySelectorAll(
        '[data-meter-id="gr"] .brick-lane-rung'
      );
      const ladderValues = [0.5, 1.0, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15];

      leftMeterRungs.forEach((rung, index) => {
        const val = ladderValues[index];
        if (grLeft * 1.5 >= val) rung.classList.add("is-on");
        else rung.classList.remove("is-on");
      });

      rightMeterRungs.forEach((rung, index) => {
        const val = ladderValues[index];
        if (grRight * 1.3 >= val) rung.classList.add("is-on");
        else rung.classList.remove("is-on");
      });
    }

    nodes.useCases.addEventListener("click", (event) => {
      const button = event.target.closest("[data-use-case-id]");
      if (button) setUseCase(button.dataset.useCaseId);
    });

    nodes.archetypes.addEventListener("click", (event) => {
      const button = event.target.closest("[data-archetype-id]");
      if (!button) return;

      state = stateMachine.labStateReducer(state, {
        type: "SET_ARCHETYPE",
        payload: { archetypeId: button.dataset.archetypeId },
      });
      render();
    });

    nodes.controls.addEventListener("input", (event) => {
      const input = event.target.closest("[data-control-id]");
      if (!input) return;
      state = stateMachine.labStateReducer(state, {
        type: "UPDATE_CONTROL",
        payload: {
          controlId: input.dataset.controlId,
          value: Number(input.value),
        },
      });
      render();
    });

    nodes.copy.addEventListener("click", async () => {
      const preset = data.getGeneratedPreset(state);
      const text = createCopyText(preset);
      const copied = await copyRecallText(text);
      nodes.copy.textContent = copied ? "Copied" : "Copy unavailable";
      window.setTimeout(() => {
        nodes.copy.textContent = "Copy Recall";
      }, 1400);
    });

    nodes.print.addEventListener("click", () => {
      const preset = data.getGeneratedPreset(state);
      nodes.printSheet.innerHTML = renderPrintSheet(preset);
      nodes.printSheet.hidden = false;
      window.requestAnimationFrame(() => window.print());
    });

    render();
  }

  const api = {
    escapeHtml,
    renderExactLedLadder,
    renderParameterCard,
    renderPresetSummary,
    createCopyText,
    copyRecallText,
    renderPrintSheet,
    renderHardwareFaceplate,
    renderFaceplate: renderHardwareFaceplate,
    renderControls,
    renderRecallCards,
    initDom,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.BrickLaneLab = api;

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initDom);
    } else {
      initDom();
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
