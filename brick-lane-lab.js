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
        ? resolver.resolveParameterSelection(parameter, selected, {
            detectorSettingId: options.detectorSettingId,
          })
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
    const displayNote =
      resolved.displayNote || parameter.displayNote
        ? `<p class="brick-lane-parameter-note">${escapeHtml(resolved.displayNote || parameter.displayNote)}</p>`
        : "";

    return `<article class="brick-lane-parameter-card${monitoredClass}" data-parameter-id="${escapeHtml(parameter.id)}" style="--brick-lane-led:${escapeHtml(ledColor)}">
      <h3>${escapeHtml(parameter.label)}</h3>
      ${plainLabel}
      ${resolvedLabel}
      <p>${escapeHtml(parameter.side)}. ${escapeHtml(parameter.description || "")}</p>
      ${plainMeaning}
      ${displayNote}
      ${renderExactLedLadder({
        ...parameter,
        displayScale: resolved.displayScale,
        activeLedValues: resolved.activeLedValues,
        exactSelected: Boolean(options.selectedOverride),
      })}
    </article>`;
  }

  function presetDisplayLabel(preset) {
    return `${preset.label}${preset.isModified ? " Modified" : ""}`;
  }

  function presetPathLabel(preset) {
    return `${preset.useAreaLabel || preset.useAreaId} / ${preset.sourceLabel || preset.sourceId}`;
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
      <p class="brick-lane-preset-path">${escapeHtml(presetPathLabel(preset))}</p>
      <h2>${escapeHtml(preset.mode)}: ${escapeHtml(presetDisplayLabel(preset))}</h2>
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

  function getResolvedParameter(parameter, preset) {
    try {
      return resolver
        ? resolver.resolveParameterSelection(
            parameter,
            parameter.selection || parameter.selected,
            {
              detectorSettingId:
                preset?.parameters?.detector?.selection?.settingId ||
                preset?.parameters?.detector?.selected?.settingId,
            }
          )
        : null;
    } catch (_error) {
      return null;
    }
  }

  function createCopyText(preset) {
    const saturation = data.ENIGMA_DEMYSTIFIER.saturation;
    const lines = [
      `Brick Lane Sonic Lab - ${presetPathLabel(preset)} - ${preset.mode}: ${presetDisplayLabel(preset)}`,
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

      const resolved = getResolvedParameter(parameter, preset);
      const settingLabel = resolved
        ? resolved.label
        : Array.isArray(parameter.selected)
          ? parameter.selected.join(", ")
          : "Setting unavailable";
      const ledValues = resolved?.activeLedValues?.length
        ? ` [LED: ${resolved.activeLedValues.join(", ")}]`
        : "";

      lines.push(
        `${label} (${parameter.side}, ${parameter.color}): ${settingLabel}${ledValues}`
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
      .map((parameterId) =>
        renderParameterCard(preset.parameters[parameterId], {
          detectorSettingId:
            preset.parameters.detector.selection?.settingId ||
            preset.parameters.detector.selected?.settingId,
        })
      )
      .join("");
    const whyItems = Array.isArray(preset.why)
      ? preset.why.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")
      : "";

    return `<article class="brick-lane-print-document">
      <header class="brick-lane-print-header">
        <div>
          <h2>Brick Lane 500 - Generated Preset Cheat Sheet</h2>
          <p>${escapeHtml(preset.mode)}: ${escapeHtml(presetDisplayLabel(preset))}</p>
          <p>${escapeHtml(presetPathLabel(preset))}</p>
          ${modeGuide ? `<p class="brick-lane-mode-family">${escapeHtml(modeLabel)}</p>` : ""}
        </div>
        <div class="brick-lane-print-meta">
          <strong>Target GR:</strong> ${escapeHtml(preset.targetGainReduction)}<br>
          <strong>Path:</strong> ${escapeHtml(presetPathLabel(preset))}
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

  function renderUseAreas(state) {
    return data.USE_AREAS.map((useArea) => {
      const selected = useArea.id === state.useAreaId ? " selected" : "";
      return `<option value="${escapeHtml(useArea.id)}"${selected}>${escapeHtml(useArea.label)}</option>`;
    }).join("");
  }

  function renderPresetBrowser(state = {}) {
    const useAreaId = state.useAreaId || data.DEFAULT_STATE.useAreaId;
    const groups = data.getPresetsGroupedBySource(useAreaId);

    return groups
      .map((group) => {
        const options = group.presets
          .map((preset) => {
            const selected = preset.id === state.presetId ? " selected" : "";
            return `<option value="${escapeHtml(preset.id)}"${selected}>${escapeHtml(preset.label)}</option>`;
          })
          .join("");

        return `<optgroup label="${escapeHtml(group.source.label)}">${options}</optgroup>`;
      })
      .join("");
  }

  function renderSelectionContext(preset) {
    return `<strong>${escapeHtml(presetPathLabel(preset))}</strong><span>${escapeHtml(preset.summary)}</span>`;
  }

  function knobAngle(value) {
    return Math.round(-135 + (Number(value) / 100) * 270);
  }

  function snapToPanelDetent(value) {
    return Math.round(normalizePanelValue(value) / 2.5) * 2.5;
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
      valString = `${Math.round(normalizedValue)}% FAST`;
    } else if (param === "release") {
      valString = `${Math.round(normalizedValue)}% FAST`;
    } else if (param === "stress") {
      const units = ((normalizedValue / 100) * 10).toFixed(1);
      valString = units;
    }
    return valString;
  }

  function renderPhysicalKnob(knob, value, className = "brick-lane-main-knob") {
    const normalizedValue = snapToPanelDetent(value);
    const param = knob.id;
    const valString = formatPanelReadout(param, normalizedValue);
    const detent = Math.round(normalizedValue / 2.5) + 1;

    return `<div class="brick-lane-knob-container ${escapeHtml(className)}">
      <div class="brick-lane-knob-header">
        <span class="brick-lane-knob-name">${escapeHtml(knob.label)}</span>
        <span class="brick-lane-knob-readout" id="readout-fp-${param}">${valString}</span>
      </div>
      <div class="brick-lane-big-knob" data-param="${escapeHtml(param)}" data-val="${normalizedValue}" style="--brick-lane-knob-angle:${knobAngle(normalizedValue)}deg" role="slider" tabindex="0" aria-label="${escapeHtml(knob.label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${normalizedValue}" aria-valuetext="${escapeHtml(valString)}"><span class="brick-lane-knob-cap" aria-hidden="true"></span></div>
      <div class="brick-lane-scale-row"><span>${escapeHtml(knob.low || "")}</span>${knob.center ? `<span>${escapeHtml(knob.center)}</span>` : ""}<span>${escapeHtml(knob.high || "")}</span></div>
      <div class="brick-lane-precision-readout"><span>STEP ${detent}/41</span><strong>${escapeHtml(valString)}</strong></div>
      <div class="brick-lane-tooltip" id="tooltip-fp-${param}">${valString}</div>
    </div>`;
  }

  function deriveCompressionPoint(controls = {}) {
    const getValue = (id, fallback = 50) =>
      normalizePanelValue(controls[id], fallback);
    return {
      x: Math.round(
        (getValue("punchSmooth") +
          getValue("controlOpen") +
          getValue("stableWide")) /
          3
      ),
      y: Math.round(
        (getValue("cleanColor") +
          (100 - getValue("safeExciting")) +
          getValue("stableWide")) /
          3
      ),
    };
  }

  function renderPhysicalMeter(meter, activeScale = []) {
    const activeValues = new Set(activeScale.map(String));
    const ledColor = data.BRICK_LANE_COLORS[meter.color] || meter.color;
    const rungs = meter.scale
      .map((label, index) => {
        const activeClass = activeValues.has(String(label)) ? " is-on" : "";
        const row = index + 1;
        return `<span class="brick-lane-rung${activeClass}" data-val="${escapeHtml(label)}" style="grid-row:${row}" aria-hidden="true"></span><span class="brick-lane-led-label" style="grid-row:${row}">${escapeHtml(label)}</span>`;
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
    const optosyncValue = fp.optosync || "PARENT";
    const isIn = fp.in !== false;
    const isStereoLinked = fp.link === "STEREO";
    const scfOptions = data.FRONT_PANEL_REFERENCE.scfFrequencies
      .filter((frequency) => frequency !== "OFF")
      .map((frequency) => {
        const activeClass = frequency === scfValue ? " is-active" : "";
        const number = frequency.replace(/\s*Hz$/i, "");
        return `<span class="brick-lane-scf-option${activeClass}"><i aria-hidden="true"></i><b>${escapeHtml(number)}</b><small>Hz</small></span>`;
      })
      .join("");
    return `<div class="brick-lane-lower-hardware">
      <div class="brick-lane-momentary-section">
        <div class="brick-lane-cycle-controls" aria-label="SCF and compression mode switches">
          <div class="brick-lane-cycle-control">
            <span>SCF</span>
            <button type="button" class="brick-lane-hardware-switch brick-lane-cycle-switch" data-param="scf" aria-label="Cycle SCF" title="Cycle sidechain high-pass filter">
              <span class="brick-lane-switch-toggle" aria-hidden="true"></span>
            </button>
          </div>
          <div class="brick-lane-cycle-control">
            <span>MODE</span>
            <button type="button" class="brick-lane-hardware-switch brick-lane-cycle-switch" data-param="mode" aria-label="Cycle compression mode" title="Cycle compression mode">
              <span class="brick-lane-switch-toggle" aria-hidden="true"></span>
            </button>
          </div>
        </div>
        <div class="brick-lane-scf-options" aria-label="SCF ${escapeHtml(scfValue)}">${scfOptions}</div>
      </div>
      <div class="brick-lane-optosync-section">
        <div class="brick-lane-optosync-title">optosync</div>
        <button type="button" class="brick-lane-hardware-switch ${optosyncValue === "CHILD" ? "is-right" : "is-left"}" data-param="optosync" aria-label="Optosync ${escapeHtml(optosyncValue)}" aria-pressed="${optosyncValue === "CHILD"}" title="Switch Optosync between parent and child">
          <span class="brick-lane-switch-toggle" aria-hidden="true"></span>
        </button>
        <div class="brick-lane-switch-end-labels"><span>Parent</span><span>Child</span></div>
      </div>
      <div class="brick-lane-link-jack${isStereoLinked ? " is-linked" : ""}" aria-label="${isStereoLinked ? "Stereo sync link active" : "Stereo sync link inactive"}" data-link-state="${isStereoLinked ? "stereo" : "mono"}">
        <span aria-hidden="true"></span>
        <small>${isStereoLinked ? "SYNC LINKED" : "SYNC LINK"}</small>
      </div>
      <div class="brick-lane-in-section">
        <span class="brick-lane-in-led${isIn ? " is-on" : ""}" aria-hidden="true"></span>
        <button type="button" class="brick-lane-hardware-switch ${isIn ? "is-right" : "is-left"}" data-param="in" aria-label="${isIn ? "In" : "Bypassed"}" aria-pressed="${isIn}" title="Toggle Brick Lane in or bypassed">
          <span class="brick-lane-switch-toggle" aria-hidden="true"></span>
        </button>
        <div class="brick-lane-in-label">IN</div>
      </div>
    </div>`;
  }

  function renderHardwareFaceplate(preset, state = {}) {
    const fp = preset.frontPanelValues || {
        input: 50,
        threshold: 48,
        attack: 42,
        release: 52,
        output: 50,
        stress: 28,
        scf: "100 Hz",
        link: "MONO",
        mode: preset.mode,
        optosync: "PARENT",
        in: true,
      };
    const reference = data.FRONT_PANEL_REFERENCE;
    const hardwareMode = fp.mode || preset.mode;

    return `<div class="brick-lane-hardware" aria-label="Brick Lane 500 front panel">
      <div class="brick-lane-faceplate-core">
      <span class="brick-lane-panel-screw brick-lane-panel-screw-top" aria-hidden="true"></span>
      <div class="brick-lane-stripe"></div>
      <div class="brick-lane-panel-body">
        <div class="brick-lane-main-controls">
          ${reference.mainKnobs
            .map((knob) => renderPhysicalKnob(knob, fp[knob.id]))
            .join("")}
        </div>
        <div class="brick-lane-right-controls">
          <div class="brick-lane-brand-lockup">
            <div class="brick-lane-brand">BRICK LANE</div>
            <div class="brick-lane-model-label">modal compressor</div>
          </div>
          <div class="brick-lane-meter-pair">
            ${renderPhysicalMeter(reference.meters.sig)}
            ${renderPhysicalMeter(reference.meters.gr)}
          </div>
          ${renderPhysicalKnob(reference.stressKnob, fp.stress, "brick-lane-stress-knob")}
          ${renderPhysicalModeList(hardwareMode)}
          ${renderLowerHardware(fp)}
        </div>
      </div>
      <footer class="brick-lane-footer-brand">CRANBORNE AUDIO</footer>
      <span class="brick-lane-panel-screw brick-lane-panel-screw-bottom" aria-hidden="true"></span>
      </div>
    </div>`;
  }

  function renderControls(state) {
    const point = deriveCompressionPoint(state.controls);
    const readouts = data.CONTROL_DEFINITIONS.map((control) => {
      const value = state.controls[control.id] ?? control.defaultValue;
      const ledColor = data.BRICK_LANE_COLORS[control.color];
      const normalizedValue = normalizePanelValue(value, control.defaultValue);
      return `<label class="brick-lane-field-axis" style="--brick-lane-led:${escapeHtml(ledColor)};--brick-lane-value:${normalizedValue}%">
        <span class="brick-lane-axis-label">${escapeHtml(control.label)}</span>
        <span class="brick-lane-axis-track" aria-hidden="true"><span></span></span>
        <span class="brick-lane-axis-opposite">${escapeHtml(control.oppositeLabel)}</span>
        <input type="range" min="0" max="100" value="${normalizedValue}" data-control-id="${escapeHtml(control.id)}" aria-label="${escapeHtml(control.label)} to ${escapeHtml(control.oppositeLabel)}">
      </label>`;
    }).join("");

    return `<section class="brick-lane-compression-field" style="--brick-lane-point-x:${point.x}%;--brick-lane-point-y:${point.y}%">
      <div class="brick-lane-field-map" data-compression-field role="slider" tabindex="0" aria-label="Compression balance" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${point.x}" aria-valuetext="Compression balance ${point.x} by ${point.y}">
        <span class="brick-lane-field-label is-clean">Clean</span>
        <span class="brick-lane-field-label is-punch">Punch</span>
        <span class="brick-lane-field-label is-smooth">Smooth</span>
        <span class="brick-lane-field-label is-dynamic">Dynamic</span>
        <span class="brick-lane-field-blob" aria-hidden="true"></span>
        <span class="brick-lane-field-point" data-compression-point aria-hidden="true"></span>
      </div>
      <div class="brick-lane-field-readouts">
        ${readouts}
      </div>
    </section>`;
  }

  function renderMonitorSelect(state) {
    const monitorParam =
      state.monitorParam && state.monitorParam !== "VU"
        ? state.monitorParam
        : "detector";
    return `<label class="brick-lane-monitor-control">
      <span>Inspect parameter</span>
      <select id="brick-lane-monitor-select" class="brick-lane-select" aria-label="Inspect Enigma parameter">
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
    </label>`;
  }

  function renderRecallCards(preset, state) {
    const monitorParam =
      state.monitorParam && state.monitorParam !== "VU"
        ? state.monitorParam
        : "detector";
    const detectorSettingId =
      preset.parameters.detector.selection?.settingId ||
      preset.parameters.detector.selected?.settingId;

    function renderParameterRows(side) {
      return preset.parameterOrder
        .filter((id) => preset.parameters[id].side === side)
        .map((id) => {
          const parameter = preset.parameters[id];
          const selected = state.parameterSelections?.[id] ||
            parameter.selection || parameter.selected;
          let resolvedLabel = "Setting unavailable";
          try {
            resolvedLabel = resolver.resolveParameterSelection(
              parameter,
              selected,
              { detectorSettingId }
            ).label;
          } catch (_error) {
            // Keep the unavailable label for invalid or incomplete selections.
          }
          const activeClass = id === monitorParam ? " is-active" : "";
          const guide = getParameterGuide(id);
          return `<button type="button" class="brick-lane-enigma-row${activeClass}" data-enigma-parameter="${escapeHtml(id)}" style="--brick-lane-led:${escapeHtml(data.BRICK_LANE_COLORS[parameter.color] || parameter.color)}">
            <span class="brick-lane-enigma-dot" aria-hidden="true"></span>
            <span class="brick-lane-enigma-row-copy">
              <strong>${escapeHtml(guide?.userLabel || parameter.label)}</strong>
              <small>${escapeHtml(parameter.label)}</small>
            </span>
            <span class="brick-lane-enigma-row-value">${escapeHtml(resolvedLabel)}</span>
          </button>`;
        })
        .join("");
    }

    const selectedParameter = preset.parameters[monitorParam];
    const detail = renderParameterCard(selectedParameter, {
      isMonitored: true,
      selectedOverride: state.parameterSelections?.[monitorParam],
      detectorSettingId,
    });

    return `<div class="brick-lane-enigma-toolbar">
      <div>
        <p class="brick-lane-kicker">Complete preset map</p>
        <h3>Fourteen parameters, one at a time</h3>
      </div>
      ${renderMonitorSelect({ ...state, monitorParam })}
    </div>
    <div class="brick-lane-enigma-layout">
      <div class="brick-lane-enigma-index">
        <section><h4>Enigma Left · long-press left</h4>${renderParameterRows("Enigma Left")}</section>
        <section><h4>Enigma Right · long-press right</h4>${renderParameterRows("Enigma Right")}</section>
      </div>
      <div class="brick-lane-enigma-detail">${detail}</div>
    </div>`;
  }

  function initDom() {
    const root = document.querySelector(".brick-lane-lab-page");
    if (!root) return;

    const nodes = {
      useAreas: document.getElementById("brick-lane-use-cases"),
      presetBrowser: document.getElementById("brick-lane-archetypes"),
      context: document.getElementById("brick-lane-context"),
      faceplate: document.getElementById("brick-lane-faceplate"),
      controls: document.getElementById("brick-lane-controls"),
      summary: document.getElementById("brick-lane-preset-summary"),
      parameters: document.getElementById("brick-lane-parameters"),
      copy: document.getElementById("brick-lane-copy"),
      copyInline: document.getElementById("brick-lane-copy-inline"),
      print: document.getElementById("brick-lane-print"),
      printInline: document.getElementById("brick-lane-print-inline"),
      printSheet: document.getElementById("brick-lane-print-sheet"),
      progressButtons: [...document.querySelectorAll("[data-brick-lane-step]")],
      stages: [...document.querySelectorAll("[data-brick-lane-stage]")],
    };

    let state = stateMachine.getInitialState();
    let activeWorkflowStep = "setup";

    function setWorkflowStep(step, { scroll = true } = {}) {
      if (!nodes.stages.some((stage) => stage.dataset.brickLaneStage === step)) {
        return;
      }
      activeWorkflowStep = step;
      for (const stage of nodes.stages) {
        const isActive = stage.dataset.brickLaneStage === step;
        stage.hidden = !isActive;
        stage.classList.toggle("is-active", isActive);
      }
      for (const button of nodes.progressButtons) {
        const isActive = button.dataset.brickLaneStep === step;
        button.classList.toggle("is-active", isActive);
        if (isActive) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      }
      if (scroll) {
        document.getElementById("brick-lane-sonic-lab")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }

    function renderGeneratedPanels(renderState) {
      const preset = data.getGeneratedPreset(renderState);
      nodes.summary.innerHTML = renderPresetSummary(preset);
      nodes.parameters.innerHTML = renderRecallCards(preset, renderState);
      return preset;
    }

    function render() {
      const preset = renderGeneratedPanels(state);
      nodes.useAreas.innerHTML = renderUseAreas(state);
      nodes.presetBrowser.innerHTML = renderPresetBrowser(state);
      nodes.context.innerHTML = renderSelectionContext(preset);
      nodes.faceplate.innerHTML = renderHardwareFaceplate(preset, state);
      nodes.controls.innerHTML = renderControls(state);
    }

    // Dynamic click handler for category sub-nav tabs AND click-to-paint LED segments
    nodes.parameters.addEventListener("click", (event) => {
      const parameterButton = event.target.closest("[data-enigma-parameter]");
      if (parameterButton) {
        state = stateMachine.labStateReducer(state, {
          type: "SET_MONITOR_PARAM",
          payload: { param: parameterButton.dataset.enigmaParameter },
        });
        render();
        playShortClick(760, 0.07);
        return;
      }

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
      const parameterId = card?.dataset.parameterId;
      const preset = data.getGeneratedPreset(state);
      const parameter = preset.parameters[parameterId];

      if (parameter?.behavior === "pattern-settings") {
        return;
      }

      state = stateMachine.labStateReducer(state, {
        type: "TOGGLE_PARAMETER_RUNG",
        payload: { parameterId, value: rung.dataset.val },
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

    // Faceplate event listeners for the real momentary, Optosync, and IN switches.
    nodes.faceplate.addEventListener("click", (event) => {
      const hardwareSwitch = event.target.closest("button[data-param]");
      if (!hardwareSwitch) return;

      let param = hardwareSwitch.dataset.param;
      let value;
      const preset = data.getGeneratedPreset(state);
      const fp = preset.frontPanelValues;

      playShortClick(180, 0.15);
      playShortClick(90, 0.08);

      if (param === "mode") {
        const modes = [
          "Velvet",
          "Float",
          "Smash",
          "Tame",
          "Glue",
          "Polish White",
        ];
        const currentIndex = Math.max(
          0,
          modes.findIndex(
            (mode) => normalizeModeKey(mode) === normalizeModeKey(fp.mode)
          )
        );
        value = modes[(currentIndex + 1) % modes.length];
      } else if (param === "scf") {
        const frequencies = data.FRONT_PANEL_REFERENCE.scfFrequencies;
        const currentIndex = Math.max(0, frequencies.indexOf(fp.scf));
        value = frequencies[(currentIndex + 1) % frequencies.length];
      } else if (param === "optosync") {
        value = fp.optosync === "CHILD" ? "PARENT" : "CHILD";
      } else if (param === "in") {
        value = fp.in === false;
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
        newVal = snapToPanelDetent(newVal);

        knob.dataset.val = newVal;
        knob.style.setProperty(
          "--brick-lane-knob-angle",
          `${Math.round(-135 + (newVal / 100) * 270)}deg`
        );

        const valString = formatPanelReadout(param, newVal);

        const readout = container.querySelector(".brick-lane-knob-readout");
        if (readout) readout.textContent = valString;
        const tooltip = container.querySelector(".brick-lane-tooltip");
        if (tooltip) tooltip.textContent = valString;
        knob.setAttribute("aria-valuenow", String(Math.round(newVal)));
        knob.setAttribute("aria-valuetext", valString);
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

    // Draggable compression field
    nodes.controls.addEventListener("mousedown", dragStartCompressionField);
    nodes.controls.addEventListener("touchstart", dragStartCompressionField, {
      passive: false,
    });
    nodes.controls.addEventListener("keydown", (event) => {
      const field = event.target.closest("[data-compression-field]");
      if (!field) return;
      const step = event.shiftKey ? 10 : 4;
      const currentPoint = deriveCompressionPoint(state.controls);
      let nextPoint = { ...currentPoint };

      if (event.key === "ArrowLeft") nextPoint.x -= step;
      else if (event.key === "ArrowRight") nextPoint.x += step;
      else if (event.key === "ArrowUp") nextPoint.y -= step;
      else if (event.key === "ArrowDown") nextPoint.y += step;
      else return;

      event.preventDefault();
      state = stateMachine.labStateReducer(state, {
        type: "UPDATE_COMPRESSION_POINT",
        payload: nextPoint,
      });
      render();
      playShortClick(520, 0.04);
    });

    function getCompressionPointFromEvent(event, field) {
      const rect = field.getBoundingClientRect();
      const source = event.touches ? event.touches[0] : event;
      const x = normalizePanelValue(
        ((source.clientX - rect.left) / rect.width) * 100
      );
      const y = normalizePanelValue(
        ((source.clientY - rect.top) / rect.height) * 100
      );
      return { x, y };
    }

    function updateCompressionFieldDom(field, point) {
      const fieldRoot = field.closest(".brick-lane-compression-field");
      if (!fieldRoot) return;
      const controls = stateMachine.mapCompressionPointToControls(point);
      fieldRoot.style.setProperty("--brick-lane-point-x", `${point.x}%`);
      fieldRoot.style.setProperty("--brick-lane-point-y", `${point.y}%`);
      field.setAttribute("aria-valuenow", String(Math.round(point.x)));
      field.setAttribute(
        "aria-valuetext",
        `Compression balance ${Math.round(point.x)} by ${Math.round(point.y)}`
      );

      for (const [controlId, value] of Object.entries(controls)) {
        const input = fieldRoot.querySelector(`[data-control-id="${controlId}"]`);
        const axis = input?.closest(".brick-lane-field-axis");
        if (!input || !axis) continue;
        input.value = value;
        axis.style.setProperty("--brick-lane-value", `${value}%`);
      }

      const livePreset = renderGeneratedPanels({
        ...state,
        controls,
      });
      nodes.faceplate.innerHTML = renderHardwareFaceplate(livePreset, {
        ...state,
        controls,
      });
    }

    function dragStartCompressionField(e) {
      const field = e.target.closest("[data-compression-field]");
      if (!field) return;
      e.preventDefault();

      let latestPoint = getCompressionPointFromEvent(e, field);
      updateCompressionFieldDom(field, latestPoint);

      function dragMoveCompressionField(moveEvent) {
        moveEvent.preventDefault();
        latestPoint = getCompressionPointFromEvent(moveEvent, field);
        updateCompressionFieldDom(field, latestPoint);
      }

      function dragEndCompressionField() {
        document.removeEventListener("mousemove", dragMoveCompressionField);
        document.removeEventListener("mouseup", dragEndCompressionField);
        document.removeEventListener("touchmove", dragMoveCompressionField);
        document.removeEventListener("touchend", dragEndCompressionField);

        state = stateMachine.labStateReducer(state, {
          type: "UPDATE_COMPRESSION_POINT",
          payload: latestPoint,
        });
        render();
      }

      document.addEventListener("mousemove", dragMoveCompressionField);
      document.addEventListener("mouseup", dragEndCompressionField);
      document.addEventListener("touchmove", dragMoveCompressionField, {
        passive: false,
      });
      document.addEventListener("touchend", dragEndCompressionField);

      playShortClick(600, 0.03);
    }

    nodes.useAreas.addEventListener("change", (event) => {
      const useAreaId = event.target.value;
      if (!useAreaId) return;

      state = stateMachine.labStateReducer(state, {
        type: "SET_USE_AREA",
        payload: { useAreaId },
      });
      render();
    });

    nodes.presetBrowser.addEventListener("change", (event) => {
      const presetId = event.target.value;
      if (!presetId) return;

      state = stateMachine.labStateReducer(state, {
        type: "SET_PRESET",
        payload: { presetId },
      });
      render();
      playShortClick(660, 0.07);
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

    root.addEventListener("click", (event) => {
      const workflowButton = event.target.closest(
        "[data-brick-lane-step], [data-brick-lane-next], [data-brick-lane-back]"
      );
      if (!workflowButton) return;
      const step =
        workflowButton.dataset.brickLaneStep ||
        workflowButton.dataset.brickLaneNext ||
        workflowButton.dataset.brickLaneBack;
      setWorkflowStep(step);
    });

    async function handleCopy(button) {
      const preset = data.getGeneratedPreset(state);
      const text = createCopyText(preset);
      const copied = await copyRecallText(text);
      const originalLabel = button.textContent;
      button.textContent = copied ? "Copied" : "Copy unavailable";
      window.setTimeout(() => {
        button.textContent = originalLabel;
      }, 1400);
    }

    nodes.copy.addEventListener("click", () => handleCopy(nodes.copy));
    nodes.copyInline?.addEventListener("click", () =>
      handleCopy(nodes.copyInline)
    );

    function handlePrint() {
      const preset = data.getGeneratedPreset(state);
      nodes.printSheet.innerHTML = renderPrintSheet(preset);
      nodes.printSheet.hidden = false;
      window.requestAnimationFrame(() => window.print());
    }

    nodes.print.addEventListener("click", handlePrint);
    nodes.printInline?.addEventListener("click", handlePrint);

    render();
    setWorkflowStep(activeWorkflowStep, { scroll: false });
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
    renderUseAreas,
    renderPresetBrowser,
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
