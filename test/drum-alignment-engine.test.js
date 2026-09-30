const test = require("node:test");
const assert = require("node:assert/strict");
const {
  classifyTrackName,
  recommendReference,
  buildOverheadEventReference,
  detectTransient,
  calculateAlignment,
  calculateCorrelation,
  createAlignmentReport,
} = require("../lib/lab/drum-alignment-engine");

function impulse(length, sample, amplitude = 1) {
  const data = new Float32Array(length);
  data[sample] = amplitude;
  return data;
}

test("classifies messy drum filenames into practical roles", () => {
  const examples = [
    ["01_KICK-IN_take-3.wav", "kick"],
    ["drums/Snare Bottom PRINT.aif", "snare"],
    ["Rack Tom 2.edit.flac", "tom"],
    ["FLOOR-TOM-large.wav", "tom"],
    ["OH L - kit image.wav", "overhead"],
    ["Overheads_STEREO bounced.wav", "overhead"],
    ["Crush Room mono.wav", "room"],
    ["Ride spot mic.wav", "other"],
  ];

  for (const [fileName, family] of examples) {
    assert.equal(classifyTrackName(fileName).family, family, fileName);
  }
});

test("recommends overheads as the default reference when present", () => {
  const tracks = [
    { id: "kick", fileName: "Kick In.wav" },
    { id: "oh-l", fileName: "OH L.wav" },
    { id: "oh-r", fileName: "OH R.wav" },
    { id: "room", fileName: "Mono Room.wav" },
  ];

  const reference = recommendReference(tracks);

  assert.equal(reference.type, "overheads");
  assert.deepEqual(reference.trackIds, ["oh-l", "oh-r"]);
  assert.match(reference.reason, /overhead/i);
});

test("builds an overhead event reference from energy instead of naive stereo replacement", () => {
  const left = impulse(256, 96, 1);
  const right = impulse(256, 96, -1);

  const reference = buildOverheadEventReference([
    {
      id: "oh-stereo",
      fileName: "OH Stereo.wav",
      sampleRate: 48000,
      channelData: [left, right],
    },
  ]);

  assert.equal(reference.sample, 96);
  assert.equal(reference.envelope[96] > 0.9, true);
  assert.equal(left[96] + right[96], 0);
});

test("detects transients in signed sample arrays", () => {
  const data = impulse(512, 220, -0.85);
  data[40] = 0.02;

  const transient = detectTransient(data);

  assert.equal(transient.sample, 220);
  assert.equal(transient.value, 0.85);
});

test("calculates direct close-mic offsets against the overhead event", () => {
  const result = calculateAlignment({
    sampleRate: 48000,
    tracks: [
      {
        id: "oh-l",
        fileName: "OH L.wav",
        sampleRate: 48000,
        channelData: impulse(512, 100, 0.8),
      },
      {
        id: "oh-r",
        fileName: "OH R.wav",
        sampleRate: 48000,
        channelData: impulse(512, 100, -0.8),
      },
      {
        id: "kick-in",
        fileName: "Kick In.wav",
        sampleRate: 48000,
        channelData: impulse(512, 150, 1),
      },
      {
        id: "snare-top",
        fileName: "Snare Top.wav",
        sampleRate: 48000,
        channelData: impulse(512, 80, 1),
      },
    ],
  });

  const kick = result.tracks.find((track) => track.id === "kick-in");
  const snare = result.tracks.find((track) => track.id === "snare-top");
  const overhead = result.tracks.find((track) => track.id === "oh-l");

  assert.equal(result.referenceEvent.sample, 100);
  assert.equal(kick.offsetSamples, -50);
  assert.equal(kick.offsetMs, -1.042);
  assert.equal(snare.offsetSamples, 20);
  assert.equal(snare.offsetMs, 0.417);
  assert.equal(overhead.offsetSamples, 0);
});

test("labels correlation with humble phase-confidence language", () => {
  const positive = calculateCorrelation([1, 0.5, -0.5, -1], [1, 0.5, -0.5, -1]);
  const ambiguous = calculateCorrelation([1, 0, -1, 0], [0, 1, 0, -1]);
  const negative = calculateCorrelation([1, 0.5, -0.5, -1], [-1, -0.5, 0.5, 1]);

  assert.equal(positive.label, "Strong");
  assert.equal(ambiguous.label, "Check by ear");
  assert.equal(negative.label, "Likely polarity/phase issue");
});

test("creates a copyable alignment report with offsets and correlation labels", () => {
  const result = calculateAlignment({
    sampleRate: 48000,
    tracks: [
      {
        id: "oh",
        fileName: "Overheads.wav",
        sampleRate: 48000,
        channelData: [impulse(256, 64, 1), impulse(256, 64, -1)],
      },
      {
        id: "floor",
        fileName: "Floor Tom.wav",
        sampleRate: 48000,
        channelData: impulse(256, 88, 1),
      },
    ],
  });

  const report = createAlignmentReport(result);

  assert.match(report, /Dirt Cat Drum Alignment Report/);
  assert.match(report, /Reference: Overheads/);
  assert.match(report, /Floor Tom\.wav/);
  assert.match(report, /-24 samples/);
  assert.match(report, /Correlation:/);
  assert.equal(result.reportText, report);
});

test("matches snare and later tom to their own overhead hits and exposes inverted signed pair", () => {
  const burst = (at, invert = false) => {
    const data = new Float32Array(400);
    [0.2, 0.8, -0.6, 0.4, -0.2].forEach((value, index) => {
      data[at + index] = value * (invert ? -1 : 1);
    });
    return data;
  };
  const oh = new Float32Array(400);
  for (const at of [45, 145, 245]) oh.set(burst(at).slice(at, at + 5), at);
  const result = calculateAlignment({
    sampleRate: 1000,
    tracks: [
      { id: "oh-l", fileName: "OH L.wav", sampleRate: 1000, channelData: oh },
      { id: "oh-r", fileName: "OH R.wav", sampleRate: 1000, channelData: oh },
      {
        id: "kick",
        fileName: "Kick In.wav",
        sampleRate: 1000,
        channelData: burst(42),
      },
      {
        id: "top",
        fileName: "Snare Top.wav",
        sampleRate: 1000,
        channelData: burst(141),
      },
      {
        id: "bottom",
        fileName: "Snare Bottom.wav",
        sampleRate: 1000,
        channelData: burst(143, true),
      },
      {
        id: "tom",
        fileName: "Rack Tom.wav",
        sampleRate: 1000,
        channelData: burst(239),
      },
    ],
  });
  assert.equal(
    result.tracks.find((track) => track.id === "top").offsetSamples,
    4
  );
  assert.equal(
    result.tracks.find((track) => track.id === "bottom").offsetSamples,
    2
  );
  assert.equal(
    result.tracks.find((track) => track.id === "tom").offsetSamples,
    6
  );
  assert.equal(
    result.tracks.find((track) => track.id === "tom").referenceMs,
    246
  );
  const pair = result.correlations.find((score) => score.trackId === "bottom");
  assert.deepEqual(pair.pairNames, ["Snare Bottom.wav", "Snare Top.wav"]);
  assert.ok(pair.envelope > 0.9, JSON.stringify(pair));
  assert.ok(pair.signed < -0.9, JSON.stringify(pair));
});

test("silent and mixed-rate tracks remain unverified", () => {
  const result = calculateAlignment({
    tracks: [
      {
        id: "oh",
        fileName: "OH.wav",
        sampleRate: 1000,
        channelData: impulse(400, 100),
      },
      {
        id: "silent",
        fileName: "Snare Top.wav",
        sampleRate: 1000,
        channelData: new Float32Array(400),
      },
      {
        id: "other-rate",
        fileName: "Tom.wav",
        sampleRate: 2000,
        channelData: impulse(800, 200),
      },
    ],
  });
  assert.equal(
    result.tracks.find((track) => track.id === "other-rate").offsetSamples,
    null
  );
  assert.equal(
    result.correlations.find((score) => score.trackId === "silent").signed,
    null
  );
});

test("ambiguous early bleed does not claim a tom alignment until the later hit is selected", () => {
  const hit = (samples, index, value) => {
    samples[index] = value;
    samples[index + 1] = value * 0.7;
    samples[index + 2] = -value * 0.4;
  };
  const oh = new Float32Array(600);
  hit(oh, 50, 1);
  hit(oh, 250, 0.6);
  const tom = new Float32Array(600);
  hit(tom, 50, 0.9);
  hit(tom, 255, 0.45);
  const tracks = [
    { id: "oh-l", fileName: "OH L.wav", sampleRate: 1000, channelData: oh },
    { id: "oh-r", fileName: "OH R.wav", sampleRate: 1000, channelData: oh },
    {
      id: "tom",
      fileName: "Floor Tom.wav",
      sampleRate: 1000,
      channelData: tom,
    },
  ];
  const automatic = calculateAlignment({ sampleRate: 1000, tracks });
  const automaticTom = automatic.tracks.find((track) => track.id === "tom");
  const automaticScore = automatic.correlations.find(
    (score) => score.trackId === "tom"
  );
  assert.equal(automaticTom.offsetSamples, null);
  assert.equal(automaticTom.referenceMs, null);
  assert.match(automaticTom.reason, /Multiple plausible reference hits/);
  assert.equal(automaticScore.envelope, null);
  assert.equal(automaticScore.signed, null);
  assert.match(automatic.reportText, /Floor Tom.wav \[Tom\]: unverified/);

  const corrected = calculateAlignment({
    sampleRate: 1000,
    tracks: [
      tracks[0],
      tracks[1],
      { ...tracks[2], manualTransientSample: 255 },
    ],
  });
  const correctedTom = corrected.tracks.find((track) => track.id === "tom");
  assert.equal(correctedTom.referenceMs, 250);
  assert.equal(correctedTom.offsetSamples, -5);
  assert.equal(correctedTom.offsetMs, -5);
  assert.match(
    corrected.reportText,
    /Floor Tom.wav \[Tom\]: -5 samples \(-5.000 ms\).*manual marker/
  );
});
