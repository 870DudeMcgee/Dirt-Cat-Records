const test = require("node:test");
const assert = require("node:assert/strict");
const {
  renderExactLedLadder,
  renderParameterCard,
} = require("../brick-lane-lab");
const { ENIGMA_PARAMETERS } = require("../brick-lane-data");

test("renderExactLedLadder renders every exact rung label in order", () => {
  const html = renderExactLedLadder({
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
    assert.match(html, new RegExp(`>${label}<`));
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
