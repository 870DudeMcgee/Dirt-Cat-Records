(function initBrickLaneLab(globalScope) {
  const data =
    globalScope.BrickLaneData ||
    (typeof require === "function" ? require("./brick-lane-data") : null);

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
      osc.frequency.exponentialRampToValueAtTime(freq / 2, audioCtx.currentTime + 0.05);
      
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.06);
    } catch (e) {
      // Fallback if browser blocks audio
    }
  }

  const RUNG_LABELS = {
    stressTypeDiodeClipping: {
      "0.5": "Velvet",
      "1.0": "Float",
      "1.5": "Smash",
      "2": "Tame",
      "3": "Glue",
      "4": "Polish White",
      "5": "Polish Blue",
      "6": "Series Clip 1",
      "8": "Series Clip 2",
      "10": "Series Clip 3",
      "12": "Series Clip 4",
      "15": "Series Clip 5"
    },
    diodeHardness: {
      "0.5": "Ultra Soft",
      "1.0": "Very Soft",
      "1.5": "Soft",
      "2": "Med-Soft",
      "3": "Medium",
      "4": "Med-Hard",
      "5": "Hard",
      "6": "Very Hard",
      "8": "Ultra Hard",
      "10": "Extreme",
      "12": "Brutal",
      "15": "Hardest"
    },
    stressCrossoverPhase: {
      "0.5": "Linear Phase",
      "1.0": "Linear Freq",
      "1.5": "Low-Freq Par",
      "2": "Inverted Phase",
      "3": "Crossover A",
      "4": "Crossover B",
      "5": "Crossover C",
      "6": "Crossover D",
      "8": "Phase 45°",
      "10": "Phase 90°",
      "12": "Phase 135°",
      "15": "Phase Inverted"
    },
    sidechainHighFrequencyEmphasis: {
      "0.5": "Flat (Bypass)",
      "1.0": "SC De-emp Soft",
      "1.5": "SC De-emp Mid",
      "2": "SC De-emp Hard",
      "3": "SC De-emp Ext",
      "4": "SC Emp Soft",
      "5": "SC Emp Mid",
      "6": "SC Emp Hard",
      "8": "SC Emp Ext",
      "10": "De-ess Soft",
      "12": "De-ess Mid",
      "15": "De-ess Hard"
    },
    detector: {
      "0.5": "Peak",
      "1.0": "RMS Fixed",
      "1.5": "RMS Variable",
      "2": "Peak+RMS Fixed",
      "3": "Slow RMS",
      "4": "Peak+Slow RMS",
      "5": "RMS+Slow RMS",
      "6": "Peak+RMS+Slow",
      "8": "Peak+RMS Var",
      "10": "Triple Var",
      "12": "Dual RMS Hybrid",
      "15": "Triple RMS Hyb"
    },
    crestFactorShaping: {
      "0.5": "Peak Dominant",
      "1.0": "Peak Favored",
      "1.5": "Peak Heavy",
      "2": "Equal Balance",
      "3": "RMS Heavy",
      "4": "RMS Favored",
      "5": "RMS Dominant",
      "6": "Slow RMS Fav",
      "8": "Slow RMS Dom",
      "10": "Auto Crest Sft",
      "12": "Auto Crest Med",
      "15": "Auto Crest Hrd"
    },
    stereoMonoSidechainLinking: {
      "0.5": "Dual Mono (0%)",
      "1.0": "Linked 10%",
      "1.5": "Linked 20%",
      "2": "Linked 30%",
      "3": "Linked 40%",
      "4": "Linked 50%",
      "5": "Linked 60%",
      "6": "Linked 70%",
      "8": "Linked 80%",
      "10": "Linked 90%",
      "12": "Stereo (100%)",
      "15": "Hybrid Linking"
    },
    ratio: {
      "0.5": "1.5:1",
      "1.0": "2:1",
      "1.5": "3:1",
      "2": "4:1",
      "3": "6:1",
      "4": "8:1",
      "5": "10:1",
      "6": "12:1",
      "8": "20:1",
      "10": "50:1",
      "12": "100:1 (Limit)",
      "15": "Brickwall (∞:1)"
    },
    knee: {
      "0.5": "Hardest (0dB)",
      "1.0": "Very Hard (2dB)",
      "1.5": "Hard (4dB)",
      "2": "Med-Hard (6dB)",
      "3": "Medium (9dB)",
      "4": "Med-Soft (12dB)",
      "5": "Soft (15dB)",
      "6": "Very Soft (18dB)",
      "8": "Softest (24dB)",
      "10": "Over-Knee Prog",
      "12": "Dual Knee Soft",
      "15": "Hybrid Prog"
    },
    attackWeighting: {
      "0.5": "4.0x / 300x",
      "1.0": "2.0x / 200x",
      "1.5": "1.0x / 150x",
      "2": "0.66x / 120x",
      "3": "0.56x / 100x",
      "4": "0.31x / 75x",
      "5": "0.17x / 50x",
      "6": "0.09x / 40x",
      "8": "0.05x / 30x",
      "10": "0.03x / 25x",
      "12": "0.01x / 20x",
      "15": "0.009x / 15x"
    },
    releaseWeighting: {
      "0.5": "4.0x / 5.0x",
      "1.0": "2.0x / 4.6x",
      "1.5": "1.0x / 4.2x",
      "2": "0.66x / 3.9x",
      "3": "0.56x / 3.5x",
      "4": "0.31x / 3.1x",
      "5": "0.17x / 2.8x",
      "6": "0.09x / 2.4x",
      "8": "0.05x / 2.0x",
      "10": "0.03x / 1.7x",
      "12": "0.01x / 1.3x",
      "15": "0.009x / 1.0x"
    },
    hold: {
      "0.5": "Bypass (0ms)",
      "1.0": "Hold 2ms",
      "1.5": "Hold 5ms",
      "2": "Hold 10ms",
      "3": "Hold 20ms",
      "4": "Hold 35ms",
      "5": "Hold 50ms",
      "6": "Hold 75ms",
      "8": "Hold 100ms",
      "10": "Hold 150ms",
      "12": "Hold 200ms",
      "15": "Hold 300ms"
    },
    lookahead: {
      "0.5": "Bypass (0ms)",
      "1.0": "Look 0.25ms",
      "1.5": "Look 0.50ms",
      "2": "Look 0.75ms",
      "3": "Look 1.0ms",
      "4": "Look 1.25ms",
      "5": "Look 1.5ms",
      "6": "Look 1.75ms",
      "8": "Look 2.0ms",
      "10": "Look 2.5ms",
      "12": "Look 3.0ms",
      "15": "Look 4.0ms"
    },
    ledBrightness: {
      "0.5": "Brightness 5%",
      "1.0": "Brightness 10%",
      "1.5": "Brightness 20%",
      "2": "Brightness 30%",
      "3": "Brightness 40%",
      "4": "Brightness 50%",
      "5": "Brightness 60%",
      "6": "Brightness 70%",
      "8": "Brightness 80%",
      "10": "Brightness 90%",
      "12": "Brightness 95%",
      "15": "Brightness 100%"
    }
  };

  function renderExactLedLadder({ color, scale, selected, id, visualScale }) {
    const selectedSet = new Set(selected || []);
    const ledColor = data.BRICK_LANE_COLORS[color] || color;

    // Determine the maximum selected value for standard parameters to light them as a bar
    let maxSelectedVal = -1;
    if (id !== "detector" && selected && selected.length > 0) {
      maxSelectedVal = Math.max(...selected.map(v => parseFloat(v)));
    }

    const rungs = scale
      .map((label, index) => {
        let isOn = "";
        if (id === "detector") {
          // Separated dot/hybrid display for the multi-detector parameter
          isOn = selectedSet.has(label) ? " is-on" : "";
        } else {
          // Contiguous bar display for all other 13 standard parameters
          const valNum = parseFloat(label);
          if (maxSelectedVal >= 0 && valNum <= maxSelectedVal) {
            isOn = " is-on";
          }
        }
        const descText = (RUNG_LABELS[id] && RUNG_LABELS[id][label]) ? ` <span class="brick-lane-led-desc">— ${escapeHtml(RUNG_LABELS[id][label])}</span>` : "";
        const visualLabel = visualScale ? visualScale[index] : label;
        return `<span class="brick-lane-rung${isOn}" data-val="${escapeHtml(label)}" aria-hidden="true"></span><span class="brick-lane-led-label">${escapeHtml(visualLabel)}${descText}</span>`;
      })
      .join("");

    return `<div class="brick-lane-led-housing" style="--brick-lane-led:${escapeHtml(ledColor)}"><div class="brick-lane-led-ladder">${rungs}<span class="brick-lane-gr-tag">GR</span><span></span></div></div>`;
  }

  function renderParameterCard(parameter) {
    const ledColor = data.BRICK_LANE_COLORS[parameter.color] || parameter.color;
    return `<article class="brick-lane-parameter-card" style="--brick-lane-led:${escapeHtml(ledColor)}">
      <h3>${escapeHtml(parameter.label)}</h3>
      <p>${escapeHtml(parameter.side)}. ${escapeHtml(parameter.description || "")}</p>
      ${renderExactLedLadder(parameter)}
    </article>`;
  }

  function renderPresetSummary(preset) {
    const frontPanel = preset.frontPanel;
    return `<section class="brick-lane-summary-card">
      <p class="brick-lane-kicker">Generated Preset</p>
      <h2>${escapeHtml(preset.mode)}: ${escapeHtml(preset.label)}</h2>
      <p>${escapeHtml(preset.summary)}</p>
      <dl class="brick-lane-front-panel">
        <div><dt>Target GR</dt><dd>${escapeHtml(preset.targetGainReduction)}</dd></div>
        <div><dt>Attack</dt><dd>${escapeHtml(frontPanel.attack)}</dd></div>
        <div><dt>Release</dt><dd>${escapeHtml(frontPanel.release)}</dd></div>
        <div><dt>STRESS</dt><dd>${escapeHtml(frontPanel.stress)}</dd></div>
        <div><dt>SCF</dt><dd>${escapeHtml(frontPanel.scf)}</dd></div>
        <div><dt>Threshold</dt><dd>${escapeHtml(frontPanel.threshold)}</dd></div>
      </dl>
    </section>`;
  }

  function createCopyText(preset) {
    const lines = [
      `Brick Lane Sonic Lab - ${preset.mode}: ${preset.label}`,
      `Target GR: ${preset.targetGainReduction}`,
      `Input: ${preset.frontPanel.input}`,
      `Threshold: ${preset.frontPanel.threshold}`,
      `Attack: ${preset.frontPanel.attack}`,
      `Release: ${preset.frontPanel.release}`,
      `Output: ${preset.frontPanel.output}`,
      `STRESS: ${preset.frontPanel.stress}`,
      `SCF: ${preset.frontPanel.scf}`,
      "",
      "Enigma Parameters:",
    ];

    for (const parameterId of preset.parameterOrder) {
      const parameter = preset.parameters[parameterId];
      lines.push(
        `${parameter.label} (${parameter.side}, ${parameter.color}): ${parameter.selected.join(", ")}`
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
          <div><dt>STRESS</dt><dd>${escapeHtml(preset.frontPanel.stress)}</dd></div>
          <div><dt>SCF</dt><dd>${escapeHtml(preset.frontPanel.scf)}</dd></div>
        </dl>
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

  function renderHardwareKnob({ label, value, low, high, param }) {
    let valString = "";
    if (param === "input" || param === "output") {
      const db = ((Number(value) / 100) * 40 - 20).toFixed(1);
      valString = (db >= 0 ? "+" : "") + db + " dB";
    } else if (param === "threshold") {
      const db = ((Number(value) / 100) * 40 - 40).toFixed(1);
      valString = db + " dB";
    } else if (param === "attack") {
      const ms = Math.round(1 + (Number(value) / 100) * 99);
      valString = ms + " ms";
    } else if (param === "release") {
      const ms = Math.round(10 + (Number(value) / 100) * 990);
      valString = ms + " ms";
    } else if (param === "stress") {
      const units = ((Number(value) / 100) * 10).toFixed(1);
      valString = units;
    }

    return `<div class="brick-lane-knob-container">
      <div class="brick-lane-knob-header">
        <span class="brick-lane-knob-name">${escapeHtml(label)}</span>
        <span class="brick-lane-knob-readout" id="readout-fp-${param}">${valString}</span>
      </div>
      <div class="brick-lane-big-knob" data-param="${param}" data-val="${value}" style="--brick-lane-knob-angle:${knobAngle(value)}deg"></div>
      <div class="brick-lane-scale-row"><span>${escapeHtml(low)}</span><span>${escapeHtml(high)}</span></div>
      <div class="brick-lane-tooltip" id="tooltip-fp-${param}">${valString}</div>
    </div>`;
  }

  function renderModeList(activeMode) {
    const modes = [
      "Velvet",
      "Float",
      "Smash",
      "Tame",
      "Glue",
      "Polish White",
      "Polish Blue",
    ];
    return `<div class="brick-lane-mode-list">${modes
      .map((mode) => {
        const activeClass =
          activeMode === mode ||
          (activeMode === "Polish" && mode === "Polish Blue")
            ? " is-active"
            : "";
        return `<span class="brick-lane-mode-dot${activeClass}">${escapeHtml(mode)}</span>`;
      })
      .join("")}</div>`;
  }

  function renderFaceplate(preset, state) {
    const fp = state.frontPanelValues || preset.frontPanelValues || {
      input: 50,
      threshold: 48,
      attack: 42,
      release: 52,
      output: 50,
      stress: 28,
      scf: "100 Hz",
      link: "STEREO"
    };

    // Deep Enigma Parameter Monitoring Display coloring & rungs logic
    let leftParameter;
    let rightParameter;

    const monitorParam = state.monitorParam || "VU";
    if (monitorParam === "VU") {
      leftParameter = {
        id: "sigMeter",
        label: "Signal Level",
        side: "SIG",
        color: "red",
        scale: data.COMMON_LED_SCALE,
        visualScale: ["24", "21", "18", "15", "12", "9", "6", "3", "0", "-6", "-12", "-24"],
        selected: []
      };
      rightParameter = {
        id: "grMeter",
        label: "Gain Reduction",
        side: "GR",
        color: "cyan",
        scale: data.COMMON_LED_SCALE,
        visualScale: ["0.5", "1.0", "1.5", "2", "3", "4", "5", "6", "8", "10", "12", "15"],
        selected: []
      };
    } else {
      const selectedParam = preset.parameters[monitorParam];
      if (selectedParam) {
        if (selectedParam.side === "Enigma Left") {
          leftParameter = { ...selectedParam };
          // Turn right meter off
          rightParameter = { ...preset.parameters.ratio, selected: [] };
          rightParameter.color = "rgba(255,255,255,0.06)";
        } else {
          rightParameter = { ...selectedParam };
          // Turn left meter off
          leftParameter = { ...preset.parameters.sidechainHighFrequencyEmphasis, selected: [] };
          leftParameter.color = "rgba(255,255,255,0.06)";
        }
      } else {
        leftParameter = { ...preset.parameters.sidechainHighFrequencyEmphasis };
        rightParameter = { ...preset.parameters.ratio };
      }
    }

    return `<div class="brick-lane-hardware">
      <div class="brick-lane-stripe"></div>
      <div class="brick-lane-brand-row" style="align-items: center; margin-bottom: 0.75rem;">
        <div>
          <div class="brick-lane-brand">BRICK LANE</div>
          <div class="brick-lane-source-tile" style="margin-top:.2rem; font-size: 8px; padding: 2px 4px; display: inline-block;">modal compressor</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
          <div class="brick-lane-mode-label" id="brick-lane-hw-mode" style="font-size: 9px; font-weight: 800;">Mode: ${escapeHtml(preset.mode)}</div>
          <select id="brick-lane-monitor-select" class="brick-lane-select" aria-label="Parameter Monitor">
            <option value="VU">Monitor: VU (GR Mode)</option>
            <optgroup label="Left Enigma Parameters">
              <option value="stressTypeDiodeClipping" ${monitorParam === "stressTypeDiodeClipping" ? "selected" : ""}>Stress Diode (Red)</option>
              <option value="diodeHardness" ${monitorParam === "diodeHardness" ? "selected" : ""}>Diode Hardness (Yellow)</option>
              <option value="sidechainHighFrequencyEmphasis" ${monitorParam === "sidechainHighFrequencyEmphasis" ? "selected" : ""}>Sidechain HF (Magenta)</option>
              <option value="detector" ${monitorParam === "detector" ? "selected" : ""}>Detector Curve (Cyan)</option>
              <option value="stereoMonoSidechainLinking" ${monitorParam === "stereoMonoSidechainLinking" ? "selected" : ""}>Sidechain Link (White)</option>
              <option value="stressCrossoverPhase" ${monitorParam === "stressCrossoverPhase" ? "selected" : ""}>Stress Phase (Blue)</option>
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
        </div>
      </div>
      <div class="brick-lane-hardware-grid">
        <div class="brick-lane-knob-stack">
          ${renderHardwareKnob({ label: "INPUT", value: fp.input, low: "-20", high: "20", param: "input" })}
          ${renderHardwareKnob({ label: "THRESHOLD", value: fp.threshold, low: "MIN", high: "MAX", param: "threshold" })}
          ${renderHardwareKnob({ label: "ATTACK", value: fp.attack, low: "SLOW", high: "FAST", param: "attack" })}
          ${renderHardwareKnob({ label: "RELEASE", value: fp.release, low: "SLOW", high: "FAST", param: "release" })}
          ${renderHardwareKnob({ label: "OUTPUT", value: fp.output, low: "-20", high: "20", param: "output" })}
        </div>
        <div>
          <div class="brick-lane-hardware-ladders">
            <div>
              <div class="brick-lane-mini-title">${escapeHtml(leftParameter.side)}</div>
              ${renderExactLedLadder(leftParameter)}
            </div>
            <div>
              <div class="brick-lane-mini-title">${escapeHtml(rightParameter.side)}</div>
              ${renderExactLedLadder(rightParameter)}
            </div>
          </div>
          <div style="margin-top:.8rem; display: flex; flex-direction: column; align-items: center;">
            ${renderHardwareKnob({ label: "STRESS", value: fp.stress, low: "OFF", high: "MAX", param: "stress" })}
            ${renderModeList(preset.mode)}
          </div>
          <div class="brick-lane-hardware-ladders" style="margin-top:.8rem">
            <div>
              <div class="brick-lane-mini-title">SCF</div>
              <div class="brick-lane-toggle-box ${fp.scf === "120Hz" || fp.scf === "100 Hz" || fp.scf === "60 Hz or 100 Hz" ? "is-on" : ""}" data-param="scf">
                <span class="brick-lane-toggle-handle"></span>
              </div>
              <div class="brick-lane-toggle-label" style="font-size: 8px; text-align: center; color: #fff; margin-top: 3px;">${escapeHtml(fp.scf)}</div>
            </div>
            <div>
              <div class="brick-lane-mini-title">MODE</div>
              <div class="brick-lane-toggle-box ${fp.link === "MONO" ? "is-on" : ""}" data-param="link">
                <span class="brick-lane-toggle-handle"></span>
              </div>
              <div class="brick-lane-toggle-label" style="font-size: 8px; text-align: center; color: #fff; margin-top: 3px;">${escapeHtml(fp.link || "STEREO")}</div>
            </div>
          </div>
        </div>
      </div>
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

  // Upgraded Tabbed Recall Card category filtering
  function renderRecallCards(preset, state) {
    const activeTab = state.activeTab || "primary";

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
      parameterIds = [
        "knee",
        "hold",
        "lookahead",
        "ledBrightness",
      ];
    } else if (activeTab === "all") {
      parameterIds = preset.parameterOrder;
    }

    const cardsHtml = `<div class="brick-lane-cards-grid ${activeTab === "all" ? "is-dense" : ""}">
      ${parameterIds.map(id => renderParameterCard(preset.parameters[id])).join("")}
    </div>`;

    return tabsHtml + cardsHtml;
  }

  function cloneDefaultState() {
    return {
      ...data.DEFAULT_STATE,
      controls: { ...data.DEFAULT_STATE.controls },
      context: { ...data.DEFAULT_STATE.context },
      frontPanelValues: {
        input: 50,
        threshold: 48,
        attack: 42,
        release: 52,
        output: 50,
        stress: 28,
        scf: "100 Hz",
        link: "STEREO"
      },
      activeTab: "primary",
      monitorParam: "VU"
    };
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

    let state = cloneDefaultState();

    function setUseCase(useCaseId) {
      const firstArchetype = data.getArchetypesForUseCase(useCaseId)[0];
      state = {
        ...state,
        useCaseId,
        archetypeId: firstArchetype ? firstArchetype.id : state.archetypeId,
      };
      if (firstArchetype && firstArchetype.frontPanelValues) {
        state.frontPanelValues = { ...firstArchetype.frontPanelValues };
      }
      render();
    }

    function render() {
      const preset = data.getGeneratedPreset(state);
      nodes.useCases.innerHTML = renderUseCases(state);
      nodes.archetypes.innerHTML = renderArchetypes(state);
      nodes.context.innerHTML = renderContext(preset);
      nodes.faceplate.innerHTML = renderFaceplate(preset, state);
      nodes.controls.innerHTML = renderControls(state);
      nodes.summary.innerHTML = renderPresetSummary(preset);
      nodes.parameters.innerHTML = renderRecallCards(preset, state);
    }

    // Dynamic click handler for category sub-nav tabs AND click-to-paint LED segments
    nodes.parameters.addEventListener("click", (event) => {
      const tabBtn = event.target.closest(".brick-lane-tab-btn");
      if (tabBtn) {
        state.activeTab = tabBtn.dataset.tab;
        render();
        playShortClick(700, 0.08);
        return;
      }

      const rung = event.target.closest(".brick-lane-rung");
      if (!rung) return;
      rung.classList.toggle("is-on");
      playShortClick(400, 0.05);
    });

    // Faceplate Event listeners for mechanical switches AND parameter select dropdown monitoring
    nodes.faceplate.addEventListener("click", (event) => {
      const toggle = event.target.closest(".brick-lane-toggle-box");
      if (!toggle) return;
      
      const param = toggle.dataset.param;
      const isOn = toggle.classList.toggle("is-on");
      
      playShortClick(180, 0.15);
      playShortClick(90, 0.08);
      
      if (param === "scf") {
        state.frontPanelValues.scf = isOn ? "120Hz" : "60Hz";
      } else if (param === "link") {
        state.frontPanelValues.link = isOn ? "MONO" : "STEREO";
      }
      render();
    });

    nodes.faceplate.addEventListener("change", (event) => {
      const select = event.target.closest("#brick-lane-monitor-select");
      if (!select) return;
      state.monitorParam = select.value;
      render();
      playShortClick(800, 0.1);
    });

    // Circular Radial Draggable Dials (Faceplate Knobs)
    nodes.faceplate.addEventListener("mousedown", dragStartKnob);
    nodes.faceplate.addEventListener("touchstart", dragStartKnob, { passive: false });
    
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
        const clientY = moveEvent.type === "touchmove" ? moveEvent.touches[0].clientY : moveEvent.clientY;
        const deltaY = startY - clientY;
        
        let newVal = startVal + (deltaY * 0.45);
        if (newVal < 0) newVal = 0;
        if (newVal > 100) newVal = 100;
        
        knob.dataset.val = newVal;
        knob.style.setProperty("--brick-lane-knob-angle", `${Math.round(-135 + (newVal / 100) * 270)}deg`);
        
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
        
        state.frontPanelValues[param] = Number(knob.dataset.val);
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
    nodes.controls.addEventListener("touchstart", dragStartDial, { passive: false });
    
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
        const clientY = moveEvent.type === "touchmove" ? moveEvent.touches[0].clientY : moveEvent.clientY;
        const deltaY = startY - clientY;
        
        let newVal = startVal + (deltaY * 0.45);
        if (newVal < 0) newVal = 0;
        if (newVal > 100) newVal = 100;
        
        input.value = newVal;
        label.style.setProperty("--brick-lane-value", `${newVal}%`);
        label.style.setProperty("--brick-lane-angle", `${Math.round(-135 + (newVal / 100) * 270)}deg`);
      }
      
      function dragEndDial() {
        document.removeEventListener("mousemove", dragMoveDial);
        document.removeEventListener("mouseup", dragEndDial);
        document.removeEventListener("touchmove", dragMoveDial);
        document.removeEventListener("touchend", dragEndDial);
        
        state.controls[controlId] = Number(input.value);
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
    let canvasWidth = canvas.width = canvas.offsetWidth || 190;
    let canvasHeight = canvas.height = canvas.offsetHeight || 50;
    
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
        } catch(e){}
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
        
        ctx.strokeStyle = state.useCaseId === "mix-bus" ? "var(--brick-lane-blue)" : "var(--brick-lane-cyan)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        let amplitude = 8 + Math.sin(phase * 0.02) * 3;
        let thresholdVal = state.frontPanelValues.threshold;
        let inputVal = state.frontPanelValues.input;
        
        let signal = Math.sin(phase * 0.1) * 0.6 + Math.sin(phase * 0.03) * 0.3 + (Math.random() - 0.5) * 0.08;
        let rawDB = (signal * 15) + (inputVal - 50) * 0.4;
        let threshDB = (thresholdVal - 50) * 0.4;
        
        let gr = 0;
        if (rawDB > threshDB) {
          gr = (rawDB - threshDB) * 0.6;
        }
        
        simulatedGainReductionLeft = simulatedGainReductionLeft * 0.85 + gr * 0.15;
        simulatedGainReductionRight = simulatedGainReductionRight * 0.9 + gr * 0.1;
        
        for (let x = 0; x < canvasWidth; x++) {
          let y = canvasHeight / 2 + Math.sin(x * 0.06 + phase) * amplitude * (1 - (gr * 0.05));
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        // Render faceplate Enigma VU meters only if monitorParam is VU
        if (state.monitorParam === "VU") {
          animatePanelMetersRealtime(simulatedGainReductionLeft, simulatedGainReductionRight);
        }
        
        phase += 0.25;
        animationFrameId = requestAnimationFrame(renderScope);
      }
      
      renderScope();
    }
    
    function animatePanelMetersRealtime(grLeft, grRight) {
      const leftMeterRungs = document.querySelectorAll(".brick-lane-hardware .brick-lane-led-housing:nth-of-type(1) .brick-lane-rung");
      const rightMeterRungs = document.querySelectorAll(".brick-lane-hardware .brick-lane-led-housing:nth-of-type(2) .brick-lane-rung");
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
      
      const archetypeId = button.dataset.archetypeId;
      const matchingArch = data.ARCHETYPES.find(arch => arch.id === archetypeId);
      
      state = { ...state, archetypeId };
      if (matchingArch && matchingArch.frontPanelValues) {
        state.frontPanelValues = { ...matchingArch.frontPanelValues };
      }
      render();
    });

    nodes.controls.addEventListener("input", (event) => {
      const input = event.target.closest("[data-control-id]");
      if (!input) return;
      state = {
        ...state,
        controls: {
          ...state.controls,
          [input.dataset.controlId]: Number(input.value),
        },
      };
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
    renderFaceplate,
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
