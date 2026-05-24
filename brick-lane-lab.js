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

  const api = {
    escapeHtml,
    renderExactLedLadder,
    renderParameterCard,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.BrickLaneLab = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
