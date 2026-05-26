const test = require("node:test");
const assert = require("node:assert/strict");
const {
  renderExactLedLadder,
  renderParameterCard,
  renderPresetSummary,
  createCopyText,
  copyRecallText,
  renderPrintSheet,
  renderHardwareFaceplate,
  renderRecallCards,
  renderControls,
  renderProblemPresets,
} = require("../brick-lane-lab");
const { ENIGMA_PARAMETERS, getGeneratedPreset } = require("../brick-lane-data");

test("renderExactLedLadder renders every exact rung label in order", () => {
  const html = renderExactLedLadder({
    id: "detector",
    color: "magenta",
    scale: [
      "0.5",
      "1.0",
      "1.5",
      "2",
      "3",
      "4",
      "5",
      "6",
      "8",
      "10",
      "12",
      "15",
    ],
    selected: ["2", "3", "4"],
  });

  for (const label of [
    "0.5",
    "1.0",
    "1.5",
    "2",
    "3",
    "4",
    "5",
    "6",
    "8",
    "10",
    "12",
    "15",
  ]) {
    assert.match(html, new RegExp(`>${label}(?:\\s+|<)`));
  }
  assert.equal((html.match(/class="brick-lane-rung/g) || []).length, 12);
  assert.equal((html.match(/brick-lane-rung is-on/g) || []).length, 3);
  assert.match(html, />GR</);
});

test("renderParameterCard keeps full recall-critical parameter names", () => {
  const html = renderParameterCard({
    ...ENIGMA_PARAMETERS.sidechainHighFrequencyEmphasis,
    selected: ["2", "3", "4"],
  });

  assert.match(html, /Sidechain High Frequency Emphasis\/De-emphasis/);
  assert.match(html, /Enigma Left/);
  assert.doesNotMatch(html, />HF</);
});

test("renderPresetSummary includes mode, target gain reduction, and front-panel recall", () => {
  const preset = getGeneratedPreset();
  const html = renderPresetSummary(preset);

  assert.match(html, /Tame: Safe Vocal Catcher/);
  assert.match(html, /3-6 dB/);
  assert.match(html, /Attack/);
  assert.match(html, /Release/);
  assert.match(html, /STRESS/);
});

test("preset summary explains hardware mode with plain-language compressor family", () => {
  const preset = getGeneratedPreset();
  const html = renderPresetSummary({ ...preset, mode: "Tame" });

  assert.match(html, /TAME/i);
  assert.match(html, /Clean\/Transparent/);
  assert.match(html, /Saturation/);
  assert.doesNotMatch(html, /Stress:/);
});

test("parameter cards show hardware labels and plain-language meanings", () => {
  const html = renderParameterCard({
    ...ENIGMA_PARAMETERS.stressTypeDiodeClipping,
    selected: ["1.0"],
  });

  assert.match(html, /Stress Character \/ Diode Clipping/);
  assert.match(html, /Saturation character/);
  assert.match(html, /Float \(Optical\)/);
  assert.match(html, /Airy, low-grain color\./);
});

test("stress character card demystifies mode-family names and meanings based on selection", () => {
  const htmlTame = renderParameterCard({
    ...ENIGMA_PARAMETERS.stressTypeDiodeClipping,
    selected: ["2"],
  });
  assert.match(htmlTame, /Tame \(Clean\/Transparent\)/);
  assert.match(htmlTame, /Least colored saturation path\./);

  const htmlVelvet = renderParameterCard({
    ...ENIGMA_PARAMETERS.stressTypeDiodeClipping,
    selected: ["0.5"],
  });
  assert.match(htmlVelvet, /Velvet \(Vari-Mu\)/);
  assert.match(htmlVelvet, /Soft harmonic thickening\./);
});

test("createCopyText contains full parameter names and selected rung labels", () => {
  const preset = getGeneratedPreset();
  const text = createCopyText(preset);

  assert.match(text, /Sidechain High Frequency Emphasis\/De-emphasis/);
  assert.match(text, /Enigma Left/);
  assert.match(text, /15/);
});

test("copy recall text includes Enigma guide labels for users", () => {
  const preset = getGeneratedPreset();
  const text = createCopyText({ ...preset, mode: "Glue" });

  assert.match(text, /GLUE - VCA/i);
  assert.match(text, /STRESS hardware control = Saturation/i);
  assert.match(text, /Compression ratio/);
});

test("copy recall why text uses saturation language outside hardware labels", () => {
  const preset = getGeneratedPreset({
    archetypeId: "modern-finished-bus",
  });
  const text = createCopyText(preset);

  assert.match(
    text,
    /Low saturation keeps the mix from changing tone too much/i
  );
  assert.doesNotMatch(text, /\bLow stress\b/i);
});

test("polish color variants use the shared Polish mode guide", () => {
  const preset = { ...getGeneratedPreset(), mode: "Polish Blue" };
  const html = renderPresetSummary(preset);
  const text = createCopyText(preset);

  assert.match(html, /POLISH - Limiter\/Clipper/i);
  assert.match(text, /POLISH - Limiter\/Clipper/i);
});

test("physical faceplate lights shared POLISH mode for polish color variants", () => {
  const preset = { ...getGeneratedPreset(), mode: "Polish Blue" };
  const html = renderHardwareFaceplate(preset, {
    frontPanelValues: preset.frontPanelValues,
  });

  assert.match(html, /class="brick-lane-mode-dot is-active">POLISH<\/span>/);
  assert.match(html, /id="brick-lane-hw-mode">POLISH<\/div>/);
  assert.doesNotMatch(html, /id="brick-lane-hw-mode">Polish Blue<\/div>/);
  assert.doesNotMatch(html, /Limiter\/Clipper|Saturation/);
});

test("copyRecallText handles denied clipboard permission without throwing", async () => {
  const result = await copyRecallText("Brick Lane recall", {
    navigator: {
      clipboard: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    },
  });

  assert.equal(result, false);
});

test("renderPrintSheet includes all Enigma parameters with exact ladders", () => {
  const preset = getGeneratedPreset();
  const html = renderPrintSheet(preset);

  for (const parameter of Object.values(preset.parameters)) {
    const escapedLabel = parameter.label.replace(/&/g, "&amp;");
    assert.match(
      html,
      new RegExp(escapedLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    );
  }
  assert.equal((html.match(/class="brick-lane-rung/g) || []).length, 14 * 12);
  assert.match(html, /Brick Lane 500 - Generated Preset Cheat Sheet/);
  assert.match(html, /Front-panel starting points/);
});

test("renderPrintSheet carries plain-language mode and saturation guidance", () => {
  const preset = { ...getGeneratedPreset(), mode: "Glue" };
  const html = renderPrintSheet(preset);

  assert.match(html, /GLUE - VCA/i);
  assert.match(html, /Saturation \(STRESS\)/);
  assert.match(html, /The hardware calls this STRESS/i);
});

test("renderPrintSheet why text avoids lowercase stress wording", () => {
  const preset = getGeneratedPreset({
    archetypeId: "aggressive-energy-bus",
  });
  const html = renderPrintSheet(preset);

  assert.match(
    html,
    /Higher saturation and firmer diode behavior add attitude/i
  );
  assert.doesNotMatch(html, /\bHigher stress\b/i);
});

test("renderHardwareFaceplate matches physical front-panel anatomy", () => {
  const { getGeneratedPreset } = require("../brick-lane-data");
  const preset = getGeneratedPreset();
  const html = renderHardwareFaceplate(preset, {
    frontPanelValues: preset.frontPanelValues,
  });

  for (const label of ["INPUT", "THRESHOLD", "ATTACK", "RELEASE", "OUTPUT"]) {
    assert.match(html, new RegExp(`>${label}<`));
  }
  assert.equal((html.match(/brick-lane-main-knob/g) || []).length, 5);
  assert.equal((html.match(/brick-lane-stress-knob/g) || []).length, 1);
  assert.match(html, /data-meter-id="sig"/);
  assert.match(html, /data-meter-id="gr"/);
  assert.match(html, />VELVET</);
  assert.match(html, />POLISH</);
  assert.match(html, />optosync</i);
  assert.match(html, />IN</);
});

test("renderControls replaces six separate knob cards with one compression field", () => {
  const html = renderControls({
    controls: {
      punchSmooth: 58,
      cleanColor: 32,
      controlOpen: 76,
      safeExciting: 64,
      glueLoud: 44,
      stableWide: 38,
    },
  });

  assert.match(html, /brick-lane-compression-field/);
  assert.match(html, /data-compression-point/);
  assert.equal((html.match(/data-control-id=/g) || []).length, 6);
  assert.equal((html.match(/class="brick-lane-control"/g) || []).length, 0);
  assert.doesNotMatch(html, /brick-lane-dial/);
});

test("renderProblemPresets shows actionable common problems instead of static source tiles", () => {
  const html = renderProblemPresets({
    problemPresetId: "sibilant-uneven-vocal",
  });

  assert.match(html, /data-problem-preset-id="sibilant-uneven-vocal"/);
  assert.match(html, /Sibilant Uneven Vocal/);
  assert.match(html, /Low-End Pumping Mix/);
  assert.match(html, /class="brick-lane-problem-card is-active"/);
  assert.doesNotMatch(html, /brick-lane-source-tile/);
  assert.doesNotMatch(html, /Signal Generator/i);
});

test("physical faceplate does not contain UI-only controls", () => {
  const { getGeneratedPreset } = require("../brick-lane-data");
  const html = renderHardwareFaceplate(getGeneratedPreset(), {});

  assert.doesNotMatch(html, /<select/i);
  assert.doesNotMatch(html, /Monitor:/);
  assert.doesNotMatch(html, /Generated Preset/);
  assert.doesNotMatch(html, /brick-lane-tab-btn/);
});

test("physical faceplate stays SIG/GR-only for non-VU monitor selection", () => {
  const preset = getGeneratedPreset();
  const vuHtml = renderHardwareFaceplate(preset, { monitorParam: "VU" });
  const enigmaHtml = renderHardwareFaceplate(preset, {
    monitorParam: "attackWeighting",
  });

  assert.equal(enigmaHtml, vuHtml);
  assert.match(enigmaHtml, /data-meter-id="sig"/);
  assert.match(enigmaHtml, /data-meter-id="gr"/);
});

test("recall cards mark the selected non-faceplate monitor parameter", () => {
  const preset = getGeneratedPreset();
  const html = renderRecallCards(preset, {
    activeTab: "primary",
    monitorParam: "attackWeighting",
  });

  assert.match(html, /id="brick-lane-monitor-select"/);
  assert.match(html, /value="attackWeighting" selected/);
  assert.match(
    html,
    /brick-lane-parameter-card is-monitored"[^>]*data-parameter-id="attackWeighting"/
  );
});

test("recall monitor labels use saturation language for stress parameters", () => {
  const preset = getGeneratedPreset();
  const html = renderRecallCards(preset, {
    activeTab: "tone",
    monitorParam: "stressTypeDiodeClipping",
  });

  assert.match(html, /Saturation character \(Red\)/);
  assert.match(html, /Saturation hardness \(Yellow\)/);
  assert.match(html, /Saturation crossover and phase \(Blue\)/);
  assert.doesNotMatch(html, /Stress Diode|Stress Phase/);
});

test("recall cards include and mark an off-tab monitored parameter", () => {
  const preset = getGeneratedPreset();
  const html = renderRecallCards(preset, {
    activeTab: "primary",
    monitorParam: "diodeHardness",
  });

  assert.match(html, /data-parameter-id="diodeHardness"/);
  assert.match(
    html,
    /brick-lane-parameter-card is-monitored"[^>]*data-parameter-id="diodeHardness"/
  );
});

test("recall cards render state-owned rung selections exactly", () => {
  const preset = getGeneratedPreset();
  const html = renderRecallCards(preset, {
    activeTab: "primary",
    monitorParam: "VU",
    parameterSelections: {
      ratio: ["8"],
    },
  });

  const ratioCard = html.match(
    /<article[^>]*data-parameter-id="ratio"[\s\S]*?<\/article>/
  )[0];
  assert.equal((ratioCard.match(/brick-lane-rung is-on/g) || []).length, 1);
  assert.match(
    ratioCard,
    /data-val="8" aria-hidden="true"><\/span><span class="brick-lane-led-label">8/
  );
});

test("render module does not inject signal generator UI", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(
    path.join(__dirname, "..", "brick-lane-lab.js"),
    "utf8"
  );

  assert.doesNotMatch(source, /brick-lane-sim/);
  assert.doesNotMatch(source, /Signal Generator/i);
  assert.doesNotMatch(source, /brick-lane-scope/);
});

test("detector card renders valid setting name and exact LED pattern", () => {
  const preset = getGeneratedPreset({
    useCaseId: "tracking-vocal",
    archetypeId: "safe-vocal-catcher",
  });
  const html = renderParameterCard(preset.parameters.detector);

  assert.match(html, /Detector Mode Selection/);
  assert.match(html, /Peak \+ RMS \+ Slow RMS/);
  assert.equal((html.match(/brick-lane-rung is-on/g) || []).length, 3);
  assert.match(
    html,
    /data-val="0.5" aria-hidden="true"><\/span><span class="brick-lane-led-label">0.5/
  );
  assert.match(
    html,
    /data-val="1.5" aria-hidden="true"><\/span><span class="brick-lane-led-label">1.5/
  );
  assert.match(
    html,
    /data-val="3" aria-hidden="true"><\/span><span class="brick-lane-led-label">3/
  );
  assert.doesNotMatch(html, /Triple RMS Hyb|Dual RMS Hybrid/);
});

test("render module does not own Enigma rung labels", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(
    path.join(__dirname, "..", "brick-lane-lab.js"),
    "utf8"
  );

  assert.doesNotMatch(source, /const RUNG_LABELS/);
  assert.doesNotMatch(source, /Triple RMS Hyb|Dual RMS Hybrid|Brutal|Hardest/);
});

test("copy text uses resolved detector setting label instead of raw rungs", () => {
  const preset = getGeneratedPreset();
  const text = createCopyText(preset);

  assert.match(
    text,
    /Detector Mode Selection \/ Detector blend .*Peak \+ RMS \+ Slow RMS/
  );
  assert.doesNotMatch(
    text,
    /Detector Mode Selection \/ Detector blend \(Enigma Left, cyan\): 0\.5, 1\.5, 3$/m
  );
});

test("print sheet uses resolved detector setting label", () => {
  const preset = getGeneratedPreset();
  const html = renderPrintSheet(preset);

  assert.match(html, /Peak \+ RMS \+ Slow RMS/);
  assert.doesNotMatch(html, /Triple RMS Hyb|Dual RMS Hybrid/);
});
