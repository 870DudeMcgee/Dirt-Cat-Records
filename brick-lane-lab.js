(function initBrickLaneLab(globalScope) {
  const data =
    globalScope.BrickLaneData ||
    (typeof require === "function" ? require("./brick-lane-data") : null);

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderExactLedLadder({ color, scale, selected }) {
    const selectedSet = new Set(selected || []);
    const ledColor = data.BRICK_LANE_COLORS[color] || color;
    const rungs = scale
      .map((label) => {
        const isOn = selectedSet.has(label) ? " is-on" : "";
        return `<span class="brick-lane-rung${isOn}" aria-hidden="true"></span><span class="brick-lane-led-label">${escapeHtml(label)}</span>`;
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

  function renderHardwareKnob({ label, value, low, high }) {
    return `<div>
      <div class="brick-lane-knob-name">${escapeHtml(label)}</div>
      <div class="brick-lane-big-knob" style="--brick-lane-knob-angle:${knobAngle(value)}deg"></div>
      <div class="brick-lane-scale-row"><span>${escapeHtml(low)}</span><span>${escapeHtml(high)}</span></div>
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

  function renderFaceplate(preset) {
    const leftParameter = preset.parameters.sidechainHighFrequencyEmphasis;
    const rightParameter = preset.parameters.ratio;
    return `<div class="brick-lane-hardware">
      <div class="brick-lane-stripe"></div>
      <div class="brick-lane-brand-row">
        <div>
          <div class="brick-lane-brand">BRICK LANE</div>
          <div class="brick-lane-source-tile" style="margin-top:.25rem">modal compressor</div>
        </div>
        <div class="brick-lane-mode-label">${escapeHtml(preset.mode)}</div>
      </div>
      <div class="brick-lane-hardware-grid">
        <div class="brick-lane-knob-stack">
          ${renderHardwareKnob({ label: "INPUT", value: 50, low: "-20", high: "20" })}
          ${renderHardwareKnob({ label: "THRESHOLD", value: 48, low: "MIN", high: "MAX" })}
          ${renderHardwareKnob({ label: "ATTACK", value: 42, low: "SLOW", high: "FAST" })}
          ${renderHardwareKnob({ label: "RELEASE", value: 52, low: "SLOW", high: "FAST" })}
          ${renderHardwareKnob({ label: "OUTPUT", value: 50, low: "-20", high: "20" })}
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
          <div style="margin-top:.8rem">
            ${renderHardwareKnob({ label: "STRESS", value: 28, low: "OFF", high: "MAX" })}
            ${renderModeList(preset.mode)}
          </div>
          <div class="brick-lane-hardware-ladders" style="margin-top:.8rem">
            <div>
              <div class="brick-lane-mini-title">SCF</div>
              <div class="brick-lane-source-tile">${escapeHtml(preset.frontPanel.scf)}</div>
            </div>
            <div>
              <div class="brick-lane-mini-title">MODE</div>
              <div class="brick-lane-source-tile">${escapeHtml(preset.mode)}</div>
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

  function renderImportantParameterCards(preset) {
    const importantIds = [
      "sidechainHighFrequencyEmphasis",
      "detector",
      "ratio",
      "attackWeighting",
      "releaseWeighting",
      "crestFactorShaping",
    ];
    return importantIds
      .map((parameterId) => renderParameterCard(preset.parameters[parameterId]))
      .join("");
  }

  function cloneDefaultState() {
    return {
      ...data.DEFAULT_STATE,
      controls: { ...data.DEFAULT_STATE.controls },
      context: { ...data.DEFAULT_STATE.context },
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
      render();
    }

    function render() {
      const preset = data.getGeneratedPreset(state);
      nodes.useCases.innerHTML = renderUseCases(state);
      nodes.archetypes.innerHTML = renderArchetypes(state);
      nodes.context.innerHTML = renderContext(preset);
      nodes.faceplate.innerHTML = renderFaceplate(preset);
      nodes.controls.innerHTML = renderControls(state);
      nodes.summary.innerHTML = renderPresetSummary(preset);
      nodes.parameters.innerHTML = renderImportantParameterCards(preset);
    }

    nodes.useCases.addEventListener("click", (event) => {
      const button = event.target.closest("[data-use-case-id]");
      if (button) setUseCase(button.dataset.useCaseId);
    });

    nodes.archetypes.addEventListener("click", (event) => {
      const button = event.target.closest("[data-archetype-id]");
      if (!button) return;
      state = { ...state, archetypeId: button.dataset.archetypeId };
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
      if (navigator.clipboard) await navigator.clipboard.writeText(text);
      nodes.copy.textContent = "Copied";
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
    renderPrintSheet,
    renderFaceplate,
    renderControls,
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
