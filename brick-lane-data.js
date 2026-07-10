(function initBrickLaneData(globalScope) {
  const COMMON_LED_SCALE = [
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
  ];

  const BRICK_LANE_COLORS = {
    red: "#ff3a3a",
    yellow: "#ffd549",
    magenta: "#f52ee6",
    cyan: "#5ee7ff",
    white: "#ffffff",
    blue: "#5073ff",
    green: "#31dc78",
  };

  const FRONT_PANEL_REFERENCE = {
    mainKnobs: [
      { id: "input", label: "INPUT", unit: "dB", low: "-20", high: "20" },
      {
        id: "threshold",
        label: "THRESHOLD",
        unit: "",
        low: "MIN",
        high: "MAX",
      },
      { id: "attack", label: "ATTACK", unit: "", low: "SLOW", high: "FAST" },
      { id: "release", label: "RELEASE", unit: "", low: "SLOW", high: "FAST" },
      {
        id: "output",
        label: "OUTPUT",
        unit: "dB",
        center: "0",
        low: "-20",
        high: "20",
      },
    ],
    stressKnob: { id: "stress", label: "STRESS", low: "OFF", high: "MAX" },
    meters: {
      sig: {
        id: "sig",
        label: "SIG",
        color: "magenta",
        scale: [
          "24",
          "21",
          "18",
          "15",
          "12",
          "6",
          "0",
          "-6",
          "-12",
          "-18",
          "-24",
          "-30",
        ],
      },
      gr: {
        id: "gr",
        label: "GR",
        color: "cyan",
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
      },
    },
    modeLabels: ["VELVET", "FLOAT", "SMASH", "TAME", "GLUE", "POLISH"],
    scfFrequencies: ["OFF", "60 Hz", "100 Hz", "200 Hz"],
    lowerSections: ["momentary", "optosync", "link-jack", "in"],
  };

  const ENIGMA_DEMYSTIFIER = {
    modes: {
      VELVET: {
        hardwareLabel: "VELVET",
        family: "Vari-Mu",
        summary:
          "Rounded, weighty compression that feels slow, forgiving, and tube-like.",
        saturation: "Soft harmonic thickening.",
      },
      FLOAT: {
        hardwareLabel: "FLOAT",
        family: "Optical",
        summary: "Smooth leveling with gentle movement and less obvious grab.",
        saturation: "Airy, low-grain color.",
      },
      SMASH: {
        hardwareLabel: "SMASH",
        family: "FET",
        summary:
          "Fast, forward compression for aggressive transient control and attitude.",
        saturation: "Edgy, transient-forward drive.",
      },
      TAME: {
        hardwareLabel: "TAME",
        family: "Clean/Transparent",
        summary: "Controlled dynamics with minimal obvious color.",
        saturation: "Least colored saturation path.",
      },
      GLUE: {
        hardwareLabel: "GLUE",
        family: "VCA",
        summary:
          "Bus-style compression that pulls parts together and stabilizes movement.",
        saturation: "Cohesive, mix-bus density.",
      },
      POLISH: {
        hardwareLabel: "POLISH",
        family: "Limiter/Clipper",
        summary:
          "Finishing compression for density, level, and controlled peak shape.",
        saturation: "Bright limiting and clipping-style finish.",
      },
    },
    saturation: {
      hardwareLabel: "STRESS",
      userLabel: "Saturation",
      summary:
        "The hardware calls this STRESS; the tool explains it as Saturation because it changes harmonic drive and clipping behavior inside each mode.",
    },
    parameters: {
      stressTypeDiodeClipping: {
        hardwareLabel: "Stress Character / Diode Clipping",
        userLabel: "Saturation character",
        plainMeaning:
          "Chooses the flavor of drive or clipping that the Saturation control leans into.",
      },
      diodeHardness: {
        hardwareLabel: "Diode Hardness",
        userLabel: "Saturation hardness",
        plainMeaning:
          "Controls how soft or abrupt the saturation edge feels when driven.",
      },
      stressCrossoverPhase: {
        hardwareLabel: "Stress Crossover & Phase",
        userLabel: "Saturation crossover and phase",
        plainMeaning:
          "Changes where saturation energy shifts across the spectrum and how parallel paths line up.",
      },
      sidechainHighFrequencyEmphasis: {
        hardwareLabel: "Sidechain High Frequency Emphasis/De-emphasis",
        userLabel: "High-frequency sidechain response",
        plainMeaning:
          "Controls whether bright material makes the compressor react more or less.",
      },
      detector: {
        hardwareLabel: "Detector Mode Selection",
        userLabel: "Detector blend",
        plainMeaning:
          "Chooses whether the compressor reacts more like peak catching, RMS leveling, or a blend.",
      },
      crestFactorShaping: {
        hardwareLabel: "Crest Factor Shaping",
        userLabel: "Peak-to-body balance",
        plainMeaning:
          "Changes how much transient peaks matter compared with the body of the sound.",
      },
      stereoMonoSidechainLinking: {
        hardwareLabel: "Stereo/Mono Sidechain Linking",
        userLabel: "Stereo linking",
        plainMeaning:
          "Controls whether left and right channels compress together or independently.",
      },
      ratio: {
        hardwareLabel: "Ratio Setting Curve",
        userLabel: "Compression ratio",
        plainMeaning:
          "Sets how firmly the compressor pushes back once signal crosses the threshold.",
      },
      knee: {
        hardwareLabel: "Knee Width",
        userLabel: "Compression onset",
        plainMeaning:
          "Controls whether gain reduction starts abruptly or eases in smoothly.",
      },
      attackWeighting: {
        hardwareLabel: "Attack Weighting Shape",
        userLabel: "Attack behavior",
        plainMeaning:
          "Changes how quickly the compressor grabs transients and overshoots.",
      },
      releaseWeighting: {
        hardwareLabel: "Release Weighting Behavior",
        userLabel: "Release behavior",
        plainMeaning:
          "Changes how the compressor recovers after gain reduction.",
      },
      hold: {
        hardwareLabel: "Hold Timing",
        userLabel: "Gain-reduction hold",
        plainMeaning:
          "Keeps compression engaged briefly before release begins.",
      },
      lookahead: {
        hardwareLabel: "Lookahead Time",
        userLabel: "Transient pre-catch",
        plainMeaning: "Lets the detector react ahead of very fast peaks.",
      },
      ledBrightness: {
        hardwareLabel: "LED Brightness Level",
        userLabel: "LED brightness",
        plainMeaning:
          "Changes display brightness; it does not change compression tone.",
      },
    },
  };

  const CONTROL_DEFINITIONS = [
    {
      id: "punchSmooth",
      label: "Punch",
      oppositeLabel: "Smoothness",
      color: "yellow",
      defaultValue: 58,
    },
    {
      id: "cleanColor",
      label: "Clean",
      oppositeLabel: "Colored",
      color: "red",
      defaultValue: 32,
    },
    {
      id: "controlOpen",
      label: "Control",
      oppositeLabel: "Openness",
      color: "cyan",
      defaultValue: 76,
    },
    {
      id: "safeExciting",
      label: "Safe Tracking",
      oppositeLabel: "Exciting Tracking",
      color: "white",
      defaultValue: 64,
    },
    {
      id: "glueLoud",
      label: "Glue",
      oppositeLabel: "Loudness",
      color: "blue",
      defaultValue: 44,
    },
    {
      id: "stableWide",
      label: "Stable Stereo",
      oppositeLabel: "Wide Movement",
      color: "magenta",
      defaultValue: 38,
    },
  ];

  const DEFAULT_CONTROL_VALUES = Object.fromEntries(
    CONTROL_DEFINITIONS.map((control) => [control.id, control.defaultValue])
  );

  function evidence({ source = "manual", type, reference, note }) {
    return { source, type, reference, note };
  }

  function parameter({
    id,
    label,
    side,
    color,
    description,
    behavior = "stepped-scale",
    displayScale = COMMON_LED_SCALE,
    scale,
    settings,
    interpretation,
    valueTables,
    displayNote,
    evidence: evidenceEntries = [],
  }) {
    const resolvedScale = displayScale || scale || COMMON_LED_SCALE;
    const result = {
      id,
      label,
      side,
      color,
      scale: resolvedScale,
      displayScale: resolvedScale,
      behavior,
      description,
      evidence: evidenceEntries,
    };
    if (settings) result.settings = settings;
    if (interpretation) result.interpretation = interpretation;
    if (valueTables) result.valueTables = valueTables;
    if (displayNote) result.displayNote = displayNote;
    return result;
  }

  const MANUAL_REFERENCES = {
    enigmaOverview: "Brick Lane 500 user guide, Enigma overview",
    enigmaLeft: "Brick Lane 500 user guide, Enigma Left parameter section",
    enigmaRight: "Brick Lane 500 user guide, Enigma Right parameter section",
    detector: "Brick Lane 500 user guide, Detector Mode Selection section",
    attackRelease:
      "Brick Lane 500 user guide, Attack and Release weighting tables",
    ledBrightness: "Brick Lane 500 user guide, LED Brightness Level section",
  };

  const ENIGMA_PARAMETERS = {
    stressTypeDiodeClipping: parameter({
      id: "stressTypeDiodeClipping",
      label: "Stress Character / Diode Clipping",
      side: "Enigma Left",
      color: "red",
      behavior: "pattern-settings",
      description:
        "Changes character of the saturation (Velvet, Float, Smash, Tame, Glue, Polish clippers, or Series clippers).",
      evidence: [
        evidence({
          type: "manual-stated",
          reference: MANUAL_REFERENCES.enigmaLeft,
          note: "Manual describes stress/diode clipping behavior by mode or clipping family.",
        }),
      ],
      settings: [
        {
          id: "velvet",
          label: "Velvet (Vari-Mu)",
          meaning: "Soft harmonic thickening.",
          ledPattern: ["0.5"],
        },
        {
          id: "float",
          label: "Float (Optical)",
          meaning: "Airy, low-grain color.",
          ledPattern: ["0.5", "1.0"],
        },
        {
          id: "smash",
          label: "Smash (FET)",
          meaning: "Edgy, transient-forward drive.",
          ledPattern: ["0.5", "1.0", "1.5"],
        },
        {
          id: "tame",
          label: "Tame (Clean/Transparent)",
          meaning: "Least colored saturation path.",
          ledPattern: ["0.5", "1.0", "1.5", "2"],
        },
        {
          id: "glue",
          label: "Glue (VCA)",
          meaning: "Cohesive, mix-bus density.",
          ledPattern: ["0.5", "1.0", "1.5", "2", "3"],
        },
        {
          id: "polish-white",
          label: "Polish White (Limiter/Clipper)",
          meaning: "Bright limiting / clipping style finish.",
          ledPattern: ["0.5", "1.0", "1.5", "2", "3", "4"],
        },
        {
          id: "polish-blue",
          label: "Polish Blue (Limiter/Clipper)",
          meaning: "Alternative bright limiting / clipping style finish.",
          ledPattern: ["0.5", "1.0", "1.5", "2", "3", "4", "5"],
        },
        {
          id: "series-clip-1",
          label: "Series Clip 1",
          meaning: "First series clipper configuration.",
          ledPattern: ["0.5", "1.0", "1.5", "2", "3", "4", "5", "6"],
        },
        {
          id: "series-clip-2",
          label: "Series Clip 2",
          meaning: "Second series clipper configuration.",
          ledPattern: ["0.5", "1.0", "1.5", "2", "3", "4", "5", "6", "8"],
        },
        {
          id: "series-clip-3",
          label: "Series Clip 3",
          meaning: "Third series clipper configuration.",
          ledPattern: ["0.5", "1.0", "1.5", "2", "3", "4", "5", "6", "8", "10"],
        },
        {
          id: "series-clip-4",
          label: "Series Clip 4",
          meaning: "Fourth series clipper configuration.",
          ledPattern: ["0.5", "1.0", "1.5", "2", "3", "4", "5", "6", "8", "10", "12"],
        },
        {
          id: "series-clip-5",
          label: "Series Clip 5",
          meaning: "Fifth series clipper configuration.",
          ledPattern: ["0.5", "1.0", "1.5", "2", "3", "4", "5", "6", "8", "10", "12", "15"],
        },
      ],
    }),
    diodeHardness: parameter({
      id: "diodeHardness",
      label: "Diode Hardness",
      side: "Enigma Left",
      color: "yellow",
      behavior: "stepped-scale",
      description:
        "Changes the hardness of the saturation diode clipping curve.",
      interpretation: "relative-led-position",
      displayNote:
        "The guide describes relative diode hardness; the printed GR numbers identify LED positions, not hardness units.",
      evidence: [
        evidence({
          type: "manual-stated",
          reference: MANUAL_REFERENCES.enigmaLeft,
          note: "Manual describes diode hardness as a hardness amount.",
        }),
      ],
    }),
    stressCrossoverPhase: parameter({
      id: "stressCrossoverPhase",
      label: "Stress Crossover & Phase",
      side: "Enigma Left",
      color: "blue",
      behavior: "pattern-settings",
      description:
        "Influences frequency-dependent phase changes when saturation is engaged; critical for parallel compression.",
      evidence: [
        evidence({
          type: "manual-stated",
          reference: MANUAL_REFERENCES.enigmaLeft,
          note: "Manual describes crossover and phase behavior.",
        }),
      ],
      settings: [
        {
          id: "frequency-linear",
          label: "Frequency response more linear",
          meaning: "Prioritizes a more linear STRESS frequency response than phase response.",
          ledPattern: ["5"],
        },
        {
          id: "phase-linear-low-parallel",
          label: "Phase response more linear",
          meaning: "Best documented starting point for parallel compression with STRESS on low frequencies.",
          ledPattern: ["4", "5"],
        },
        {
          id: "frequency-linear-inverted",
          label: "Frequency-linear response, phase inverted",
          meaning: "Inverts the STRESS phase of the frequency-linear example.",
          ledPattern: ["4", "5", "6"],
        },
        {
          id: "phase-linear-inverted",
          label: "Phase-linear response, phase inverted",
          meaning: "Inverts the STRESS phase of the phase-linear example.",
          ledPattern: ["3", "4", "5", "6"],
        },
      ],
    }),
    sidechainHighFrequencyEmphasis: parameter({
      id: "sidechainHighFrequencyEmphasis",
      label: "Sidechain High Frequency Emphasis/De-emphasis",
      side: "Enigma Left",
      color: "magenta",
      behavior: "pattern-settings",
      description:
        "Adjusts high-frequency emphasis on the sidechain filter detector.",
      evidence: [
        evidence({
          type: "manual-stated",
          reference: MANUAL_REFERENCES.enigmaLeft,
          note: "Manual describes sidechain high-frequency emphasis/de-emphasis behavior.",
        }),
      ],
      settings: [
        {
          id: "flat",
          label: "Flat",
          meaning: "No high-frequency emphasis or de-emphasis.",
          ledPattern: ["2"],
        },
        {
          id: "compress-highs-less",
          label: "High frequencies compressed less",
          meaning: "De-emphasizes high frequencies in the detector path.",
          ledPattern: ["2", "3", "4", "5", "6", "8", "10", "12", "15"],
        },
        {
          id: "compress-highs-more",
          label: "High frequencies compressed more",
          meaning: "Emphasizes high frequencies in the detector path.",
          ledPattern: ["0.5", "1.0", "1.5", "2"],
        },
      ],
    }),
    detector: parameter({
      id: "detector",
      label: "Detector Mode Selection",
      side: "Enigma Left",
      color: "cyan",
      behavior: "pattern-settings",
      description:
        "Selects detector behavior from Peak, RMS, Slow RMS, and supported combinations.",
      evidence: [
        evidence({
          type: "manual-stated",
          reference: MANUAL_REFERENCES.detector,
          note: "Manual identifies detector behavior as named detector modes/components rather than twelve independent rung names.",
        }),
        evidence({
          type: "manual-derived",
          reference: MANUAL_REFERENCES.detector,
          note: "LED display communicates selected detector components as patterns across the shared 12-position display.",
        }),
      ],
      settings: [
        {
          id: "peak",
          label: "Peak",
          meaning: "Fast peak-catching detector behavior.",
          ledPattern: ["0.5"],
        },
        {
          id: "rms",
          label: "RMS",
          meaning: "Leveling detector behavior that follows signal body.",
          ledPattern: ["1.5"],
        },
        {
          id: "slow-rms",
          label: "Slow RMS",
          meaning: "Slower detector behavior for phrase or program movement.",
          ledPattern: ["3"],
        },
        {
          id: "peak-rms",
          label: "Peak + RMS",
          meaning: "Combines fast peak capture with RMS body tracking.",
          ledPattern: ["0.5", "1.5"],
        },
        {
          id: "peak-slow-rms",
          label: "Peak + Slow RMS",
          meaning: "Combines peak catching with slower program movement.",
          ledPattern: ["0.5", "3"],
        },
        {
          id: "rms-slow-rms",
          label: "RMS + Slow RMS",
          meaning: "Combines body tracking with slower program movement.",
          ledPattern: ["1.5", "3"],
        },
        {
          id: "peak-rms-slow",
          label: "Peak + RMS + Slow RMS",
          meaning:
            "Combines peak catching, body tracking, and slower program movement.",
          ledPattern: ["0.5", "1.5", "3"],
        },
        {
          id: "peak-rms-variable",
          label: "Peak + RMS · RMS pot variable",
          meaning:
            "Attack and release weighting set the RMS detector as a multiple of the Peak detector timing.",
          ledPattern: ["0.5", "1.5", "15"],
          timingModel: "variable",
        },
        {
          id: "peak-rms-slow-variable",
          label: "Peak + RMS + Slow RMS · RMS pot variable",
          meaning:
            "Triple detection with RMS timing derived as a multiple of the Peak detector timing.",
          ledPattern: ["0.5", "1.5", "3", "15"],
          timingModel: "variable",
        },
      ],
    }),
    crestFactorShaping: parameter({
      id: "crestFactorShaping",
      label: "Crest Factor Shaping",
      side: "Enigma Left",
      color: "green",
      behavior: "stepped-scale",
      description:
        "Influences slower detectors in multi-detector modes, adjusting Peak-to-RMS compression thresholds.",
      interpretation: "cumulative-relative",
      displayNote:
        "More lit LEDs give the slower detectors more influence. This control only matters in multi-detector modes.",
      evidence: [
        evidence({
          type: "manual-derived",
          reference: MANUAL_REFERENCES.enigmaLeft,
          note: "Manual describes crest-factor shaping across detector behavior.",
        }),
      ],
    }),
    stereoMonoSidechainLinking: parameter({
      id: "stereoMonoSidechainLinking",
      label: "Stereo/Mono Sidechain Linking",
      side: "Enigma Left",
      color: "white",
      behavior: "stepped-scale",
      description:
        "Sets the parent-to-child sidechain linking percentage or dual mono isolation.",
      interpretation: "relative-led-position",
      displayNote:
        "The exact linking topology is documented in the Stereo Operation and Optosync section of the guide.",
      evidence: [
        evidence({
          type: "manual-stated",
          reference: MANUAL_REFERENCES.enigmaLeft,
          note: "Manual describes stereo/mono sidechain linking percentage or behavior.",
        }),
      ],
    }),
    ratio: parameter({
      id: "ratio",
      label: "Ratio Setting Curve",
      side: "Enigma Right",
      color: "blue",
      behavior: "stepped-scale",
      description:
        "Sets advanced analogue compression curves and ratio options up to brickwall limiting.",
      interpretation: "approximate-ratio",
      displayNote:
        "The blue LED approximately matches the printed GR number; all LEDs lit indicates ∞:1.",
      evidence: [
        evidence({
          type: "manual-stated",
          reference: MANUAL_REFERENCES.enigmaRight,
          note: "Manual describes ratio curve behavior.",
        }),
      ],
    }),
    knee: parameter({
      id: "knee",
      label: "Knee Width",
      side: "Enigma Right",
      color: "cyan",
      behavior: "stepped-scale",
      description:
        "Selects hardness of the compression threshold transition (Hardest to Softest knee).",
      interpretation: "relative-led-position",
      displayNote:
        "The guide documents the direction: top LED is hardest, bottom LED is soft, and all LEDs is softest.",
      evidence: [
        evidence({
          type: "manual-stated",
          reference: MANUAL_REFERENCES.enigmaRight,
          note: "Manual describes knee width.",
        }),
      ],
    }),
    attackWeighting: parameter({
      id: "attackWeighting",
      label: "Attack Weighting Shape",
      side: "Enigma Right",
      color: "red",
      behavior: "stepped-scale",
      description:
        "Modifies attack timing reactions based on threshold overshoot or multi-stage detector speeds.",
      interpretation: "detector-dependent-table",
      valueTables: {
        single: ["4.0x", "2.0x", "1.0x (mid)", "0.66x", "0.56x", "0.3136x", "0.175x", "0.0983x", "0.055x", "0.03x", "0.017x", "0.009x"],
        variable: ["300x", "200x", "150x", "120x", "100x", "75x", "50x", "40x", "30x", "25x", "20x", "15x"],
        rmsFixed: ["35 ms", "30 ms", "25 ms", "20 ms", "15 ms", "10 ms", "5 ms", "2.5 ms", "2 ms", "1.5 ms", "1 ms", "500 µs"],
        slowRmsFixed: ["1200 ms", "800 ms", "600 ms", "400 ms", "320 ms", "240 ms", "200 ms", "160 ms", "120 ms", "90 ms", "60 ms", "45 ms"],
      },
      displayNote:
        "The same red LED position means a different value in single, fixed multi-detector, and RMS-pot-variable modes.",
      evidence: [
        evidence({
          type: "manual-stated",
          reference: MANUAL_REFERENCES.attackRelease,
          note: "Manual includes attack weighting table/examples.",
        }),
      ],
    }),
    releaseWeighting: parameter({
      id: "releaseWeighting",
      label: "Release Weighting Behavior",
      side: "Enigma Right",
      color: "white",
      behavior: "stepped-scale",
      description:
        "Modifies adaptive envelope recovery speed and program-dependent release timing.",
      interpretation: "detector-dependent-table",
      valueTables: {
        single: ["4.0x", "2.0x", "1.0x (mid)", "0.66x", "0.56x", "0.3136x", "0.175x", "0.0983x", "0.055x", "0.03x", "0.017x", "0.009x"],
        variable: ["5.0x", "4.636x", "4.272x", "3.909x", "3.545x", "3.181x", "2.818x", "2.454x", "2.090x", "1.727x", "1.363x", "1.0x"],
        rmsFixed: ["1000 ms", "850 ms", "700 ms", "600 ms", "500 ms", "350 ms", "250 ms", "200 ms", "150 ms", "100 ms", "75 ms", "50 ms"],
        slowRmsFixed: ["5000 ms", "4000 ms", "3000 ms", "2000 ms", "1000 ms", "750 ms", "500 ms", "250 ms", "150 ms", "100 ms", "75 ms", "50 ms"],
      },
      displayNote:
        "The same white LED position means a different value in single, fixed multi-detector, and RMS-pot-variable modes.",
      evidence: [
        evidence({
          type: "manual-stated",
          reference: MANUAL_REFERENCES.attackRelease,
          note: "Manual includes release weighting table/examples.",
        }),
      ],
    }),
    hold: parameter({
      id: "hold",
      label: "Hold Timing",
      side: "Enigma Right",
      color: "green",
      behavior: "stepped-scale",
      description:
        "Sets duration the gain reduction is held (in ms) before release to prevent low-frequency wave distortion.",
      interpretation: "relative-led-position",
      displayNote:
        "The guide documents relative hold length, not an exact millisecond table: more LEDs means a longer hold.",
      evidence: [
        evidence({
          type: "manual-stated",
          reference: MANUAL_REFERENCES.enigmaRight,
          note: "Manual describes hold timing.",
        }),
      ],
    }),
    lookahead: parameter({
      id: "lookahead",
      label: "Lookahead Time",
      side: "Enigma Right",
      color: "yellow",
      behavior: "stepped-scale",
      description:
        "Buffers sidechain timing with negative group delay filter arrays to preemptively clamp fast transients.",
      interpretation: "lookahead-relative",
      displayNote:
        "The guide documents relative analogue lookahead: top LED is off, lower positions add more, and the 10 mark is the shown maximum example.",
      evidence: [
        evidence({
          type: "manual-stated",
          reference: MANUAL_REFERENCES.enigmaRight,
          note: "Manual describes lookahead time.",
        }),
      ],
    }),
    ledBrightness: parameter({
      id: "ledBrightness",
      label: "LED Brightness Level",
      side: "Enigma Right",
      color: "magenta",
      behavior: "stepped-scale",
      description:
        "Calibrates the brightness settings for all front-panel LEDs.",
      interpretation: "relative-led-position",
      displayNote:
        "Display-only setting; it does not change compression tone or timing.",
      evidence: [
        evidence({
          type: "manual-stated",
          reference: MANUAL_REFERENCES.ledBrightness,
          note: "Manual describes LED brightness as a direct display brightness level; no extra translation is needed.",
        }),
      ],
    }),
  };

  const PARAMETER_ORDER = [
    "stressTypeDiodeClipping",
    "diodeHardness",
    "stressCrossoverPhase",
    "sidechainHighFrequencyEmphasis",
    "detector",
    "crestFactorShaping",
    "stereoMonoSidechainLinking",
    "ratio",
    "knee",
    "attackWeighting",
    "releaseWeighting",
    "hold",
    "lookahead",
    "ledBrightness",
  ];

  const USE_AREAS = [
    {
      id: "tracking",
      label: "Tracking",
      description:
        "Capture-safe starting points for recording through the Brick Lane.",
    },
    {
      id: "mixing",
      label: "Mixing",
      description:
        "Source-specific mixing starts for leveling, tone, and problem control.",
    },
    {
      id: "bus-master",
      label: "Bus / Master",
      description:
        "Mix bus, stem bus, parallel bus, and mastering/finishing starts.",
    },
  ];

  const SOURCES = [
    { id: "vocals", useAreaId: "tracking", label: "Vocals" },
    { id: "bass", useAreaId: "tracking", label: "Bass" },
    { id: "guitar", useAreaId: "tracking", label: "Guitar" },
    { id: "drums", useAreaId: "tracking", label: "Drums" },
    { id: "keys-synths", useAreaId: "tracking", label: "Keys / Synths" },
    { id: "vocals", useAreaId: "mixing", label: "Vocals" },
    { id: "bass", useAreaId: "mixing", label: "Bass" },
    { id: "drums", useAreaId: "mixing", label: "Drums" },
    { id: "guitar", useAreaId: "mixing", label: "Guitar" },
    { id: "keys-synths", useAreaId: "mixing", label: "Keys / Synths" },
    { id: "full-mix-repair", useAreaId: "mixing", label: "Full Mix Repair" },
    { id: "mix-bus", useAreaId: "bus-master", label: "Mix Bus" },
    { id: "drum-bus", useAreaId: "bus-master", label: "Drum Bus" },
    { id: "vocal-bus", useAreaId: "bus-master", label: "Vocal Bus" },
    { id: "parallel-bus", useAreaId: "bus-master", label: "Parallel Bus" },
    { id: "mastering", useAreaId: "bus-master", label: "Mastering" },
  ];

  const PRESET_PLACEMENT = {
    "safe-vocal-catcher": {
      useAreaId: "tracking",
      sourceId: "vocals",
      intent: "starting-point",
      tags: ["vocal", "tracking", "safe", "peak-control"],
    },
    "smooth-expensive-vocal": {
      useAreaId: "tracking",
      sourceId: "vocals",
      intent: "starting-point",
      tags: ["vocal", "tracking", "smooth", "color"],
    },
    "modern-controlled-vocal": {
      useAreaId: "tracking",
      sourceId: "vocals",
      intent: "starting-point",
      tags: ["vocal", "tracking", "control", "modern"],
    },
    "character-vocal-print": {
      useAreaId: "tracking",
      sourceId: "vocals",
      intent: "starting-point",
      tags: ["vocal", "tracking", "color", "print"],
    },
    "invisible-mix-glue": {
      useAreaId: "bus-master",
      sourceId: "mix-bus",
      intent: "starting-point",
      tags: ["mix-bus", "glue", "transparent"],
    },
    "thick-analog-bus": {
      useAreaId: "bus-master",
      sourceId: "mix-bus",
      intent: "starting-point",
      tags: ["mix-bus", "analog", "thick"],
    },
    "punch-preserving-bus": {
      useAreaId: "bus-master",
      sourceId: "mix-bus",
      intent: "starting-point",
      tags: ["mix-bus", "punch", "low-end"],
    },
    "modern-finished-bus": {
      useAreaId: "bus-master",
      sourceId: "mix-bus",
      intent: "starting-point",
      tags: ["mix-bus", "finish", "modern"],
    },
    "aggressive-energy-bus": {
      useAreaId: "bus-master",
      sourceId: "mix-bus",
      intent: "starting-point",
      tags: ["mix-bus", "energy", "color"],
    },
  };

  const PRESETS = [
    {
      id: "safe-vocal-catcher",
      useCaseId: "tracking-vocal",
      label: "Safe Vocal Catcher",
      mode: "Tame",
      targetGainReduction: "3-6 dB",
      summary:
        "Clean peak control with enough RMS leveling to keep the phrase stable while tracking.",
      why: [
        "Peak catches sudden vocal blasts.",
        "RMS follows the body of the voice.",
        "Slow RMS keeps phrase-level movement stable.",
        "HF sidechain de-emphasis keeps sibilance from pulling the whole vocal down.",
      ],
      selected: {
        stressTypeDiodeClipping: { settingId: "float" },
        diodeHardness: { value: "2" },
        sidechainHighFrequencyEmphasis: { settingId: "compress-highs-more" },
        detector: { settingId: "peak-rms-slow" },
        stereoMonoSidechainLinking: { value: "1.0" },
        stressCrossoverPhase: { settingId: "phase-linear-low-parallel" },
        crestFactorShaping: { value: "1.0" },
        ratio: { value: "3" },
        knee: { value: "1.5" },
        attackWeighting: { value: "2" },
        releaseWeighting: { value: "3" },
        hold: { value: "1.0" },
        lookahead: { value: "1.5" },
        ledBrightness: { value: "4" },
      },
      frontPanelValues: {
        input: 50,
        threshold: 48,
        attack: 42,
        release: 52,
        output: 50,
        stress: 28,
        scf: "100 Hz",
        link: "STEREO",
      },
      frontPanel: {
        input: "0 dB",
        threshold: "Set for 3-6 dB GR on peaks",
        attack: "10-11 o'clock",
        release: "12 o'clock",
        output: "Unity",
        stress: "1-2 LEDs",
        scf: "100 Hz",
      },
    },
    {
      id: "smooth-expensive-vocal",
      useCaseId: "tracking-vocal",
      label: "Smooth Expensive Vocal",
      mode: "Velvet",
      targetGainReduction: "3-6 dB",
      summary:
        "Softer knee, slower movement, and gentle color for a polished vocal print.",
      why: [
        "Velvet favors a smoother feel.",
        "Softer knee keeps the compression less obvious.",
        "Moderate saturation adds tone without turning the track gritty.",
      ],
      selected: {
        stressTypeDiodeClipping: { settingId: "smash" },
        diodeHardness: { value: "1.0" },
        sidechainHighFrequencyEmphasis: { settingId: "compress-highs-more" },
        detector: { settingId: "peak-rms" },
        stereoMonoSidechainLinking: { value: "1.0" },
        stressCrossoverPhase: { settingId: "frequency-linear-inverted" },
        crestFactorShaping: { value: "1.5" },
        ratio: { value: "2" },
        knee: { value: "3" },
        attackWeighting: { value: "3" },
        releaseWeighting: { value: "4" },
        hold: { value: "1.0" },
        lookahead: { value: "1.0" },
        ledBrightness: { value: "4" },
      },
      frontPanelValues: {
        input: 50,
        threshold: 54,
        attack: 48,
        release: 56,
        output: 50,
        stress: 38,
        scf: "100 Hz",
        link: "STEREO",
      },
      frontPanel: {
        input: "0 dB",
        threshold: "Set for 3-6 dB GR",
        attack: "11-12 o'clock",
        release: "12-1 o'clock",
        output: "Unity",
        stress: "2-3 LEDs",
        scf: "60 Hz or 100 Hz",
      },
    },
    {
      id: "modern-controlled-vocal",
      useCaseId: "tracking-vocal",
      label: "Modern Controlled Vocal",
      mode: "Tame",
      targetGainReduction: "4-7 dB",
      summary:
        "Peak-aware vocal control for uneven modern performances without losing intelligibility.",
      why: [
        "Higher control and lookahead keep loud syllables contained.",
        "HF de-emphasis prevents sibilance from dominating gain reduction.",
        "Moderate ratio keeps the print controlled but still workable.",
      ],
      selected: {
        stressTypeDiodeClipping: { settingId: "float" },
        diodeHardness: { value: "1.5" },
        sidechainHighFrequencyEmphasis: { settingId: "compress-highs-more" },
        detector: { settingId: "rms" },
        stereoMonoSidechainLinking: { value: "1.0" },
        stressCrossoverPhase: { settingId: "frequency-linear" },
        crestFactorShaping: { value: "1.5" },
        ratio: { value: "4" },
        knee: { value: "1.5" },
        attackWeighting: { value: "2" },
        releaseWeighting: { value: "3" },
        hold: { value: "1.5" },
        lookahead: { value: "3" },
        ledBrightness: { value: "4" },
      },
      frontPanelValues: {
        input: 50,
        threshold: 42,
        attack: 35,
        release: 52,
        output: 50,
        stress: 22,
        scf: "100 Hz",
        link: "STEREO",
      },
      frontPanel: {
        input: "0 dB",
        threshold: "Set for 4-7 dB GR on loud phrases",
        attack: "10 o'clock",
        release: "12 o'clock",
        output: "Unity",
        stress: "1 LED",
        scf: "100 Hz",
      },
    },
    {
      id: "character-vocal-print",
      useCaseId: "tracking-vocal",
      label: "Character Vocal Print",
      mode: "Float",
      targetGainReduction: "3-6 dB",
      summary:
        "A more committed vocal print with audible tone, weight, and movement.",
      why: [
        "Float keeps the vocal energetic.",
        "Higher saturation and harder diode behavior print more color.",
        "Moderate lookahead print more tone useful while tracking.",
      ],
      selected: {
        stressTypeDiodeClipping: { settingId: "glue" },
        diodeHardness: { value: "4" },
        sidechainHighFrequencyEmphasis: { settingId: "compress-highs-more" },
        detector: { settingId: "rms" },
        stereoMonoSidechainLinking: { value: "0.5" },
        stressCrossoverPhase: { settingId: "frequency-linear" },
        crestFactorShaping: { value: "2" },
        ratio: { value: "3" },
        knee: { value: "1.5" },
        attackWeighting: { value: "1.5" },
        releaseWeighting: { value: "2" },
        hold: { value: "1.0" },
        lookahead: { value: "1.0" },
        ledBrightness: { value: "4" },
      },
      frontPanelValues: {
        input: 50,
        threshold: 50,
        attack: 42,
        release: 48,
        output: 50,
        stress: 45,
        scf: "60 Hz",
        link: "STEREO",
      },
      frontPanel: {
        input: "0 dB",
        threshold: "Set for 3-6 dB GR",
        attack: "10-11 o'clock",
        release: "11-12 o'clock",
        output: "Unity",
        stress: "3-5 LEDs",
        scf: "60 Hz",
      },
    },
    {
      id: "invisible-mix-glue",
      useCaseId: "mix-bus",
      label: "Invisible Mix Glue",
      mode: "Glue",
      targetGainReduction: "0.5-2 dB",
      summary: "Stable stereo bus control with soft glue and low coloration.",
      why: [
        "Glue mode keeps the stereo bus cohesive.",
        "Low saturation avoids obvious tone shift.",
        "Conservative ratio and knee preserve mix movement.",
      ],
      selected: {
        stressTypeDiodeClipping: { settingId: "velvet" },
        diodeHardness: { value: "1.0" },
        sidechainHighFrequencyEmphasis: { settingId: "flat" },
        detector: { settingId: "rms" },
        stereoMonoSidechainLinking: { value: "1.5" },
        stressCrossoverPhase: { settingId: "frequency-linear" },
        crestFactorShaping: { value: "1.0" },
        ratio: { value: "1.5" },
        knee: { value: "2" },
        attackWeighting: { value: "3" },
        releaseWeighting: { value: "4" },
        hold: { value: "1.0" },
        lookahead: { value: "0.5" },
        ledBrightness: { value: "4" },
      },
      frontPanelValues: {
        input: 50,
        threshold: 60,
        attack: 55,
        release: 62,
        output: 50,
        stress: 15,
        scf: "200 Hz",
        link: "STEREO",
      },
      frontPanel: {
        input: "0 dB",
        threshold: "Set for 0.5-2 dB GR",
        attack: "11-1 o'clock",
        release: "12-2 o'clock",
        output: "Unity",
        stress: "Off to 1 LED",
        scf: "100 Hz or 200 Hz",
      },
    },
    {
      id: "thick-analog-bus",
      useCaseId: "mix-bus",
      label: "Thick Analog Bus",
      mode: "Velvet",
      targetGainReduction: "1-2 dB",
      summary:
        "A warmer bus start with more density and a little transformer/tube-like attitude.",
      why: [
        "Velvet leans into smoother color.",
        "Moderate saturation adds thickness.",
        "Slower movement preserves groove.",
      ],
      selected: {
        stressTypeDiodeClipping: { settingId: "tame" },
        diodeHardness: { value: "1.5" },
        sidechainHighFrequencyEmphasis: { settingId: "compress-highs-less" },
        detector: { settingId: "peak-rms" },
        stereoMonoSidechainLinking: { value: "1.0" },
        stressCrossoverPhase: { settingId: "frequency-linear-inverted" },
        crestFactorShaping: { value: "2" },
        ratio: { value: "2" },
        knee: { value: "3" },
        attackWeighting: { value: "4" },
        releaseWeighting: { value: "4" },
        hold: { value: "1.0" },
        lookahead: { value: "0.5" },
        ledBrightness: { value: "4" },
      },
      frontPanelValues: {
        input: 50,
        threshold: 55,
        attack: 52,
        release: 56,
        output: 50,
        stress: 36,
        scf: "100 Hz",
        link: "STEREO",
      },
      frontPanel: {
        input: "0 dB",
        threshold: "Set for 1-2 dB GR",
        attack: "12 o'clock",
        release: "12-1 o'clock",
        output: "Unity",
        stress: "2-4 LEDs",
        scf: "100 Hz",
      },
    },
    {
      id: "punch-preserving-bus",
      useCaseId: "mix-bus",
      label: "Punch-Preserving Bus",
      mode: "Glue",
      targetGainReduction: "1-2 dB",
      summary:
        "Bus glue that lets drums and transients stay forward instead of folding down.",
      why: [
        "Slower attack weighting leaves transient shape intact.",
        "Sidechain filtering keeps low-end hits from over-driving the detector.",
        "Moderate crest shaping adds control without flattening punch.",
      ],
      selected: {
        stressTypeDiodeClipping: { settingId: "float" },
        diodeHardness: { value: "1.0" },
        sidechainHighFrequencyEmphasis: { settingId: "compress-highs-less" },
        detector: { settingId: "rms" },
        stereoMonoSidechainLinking: { value: "1.5" },
        stressCrossoverPhase: { settingId: "phase-linear-low-parallel" },
        crestFactorShaping: { value: "1.5" },
        ratio: { value: "2" },
        knee: { value: "1.5" },
        attackWeighting: { value: "5" },
        releaseWeighting: { value: "3" },
        hold: { value: "1.5" },
        lookahead: { value: "0.5" },
        ledBrightness: { value: "4" },
      },
      frontPanelValues: {
        input: 50,
        threshold: 52,
        attack: 68,
        release: 52,
        output: 50,
        stress: 28,
        scf: "200 Hz",
        link: "STEREO",
      },
      frontPanel: {
        input: "0 dB",
        threshold: "Set for 1-2 dB GR",
        attack: "1-2 o'clock",
        release: "11-1 o'clock",
        output: "Unity",
        stress: "1-2 LEDs",
        scf: "100 Hz or 200 Hz",
      },
    },
    {
      id: "modern-finished-bus",
      useCaseId: "mix-bus",
      label: "Modern Finished Bus",
      mode: "Polish Blue",
      targetGainReduction: "0.5-1.5 dB",
      summary:
        "A light finishing start for loudness-ready mixes without heavy bus movement.",
      why: [
        "Polish Blue keeps the compressor in a peak-finishing role.",
        "Lookahead adds clean control.",
        "Low saturation keeps the mix from changing tone too much.",
      ],
      selected: {
        stressTypeDiodeClipping: { settingId: "velvet" },
        diodeHardness: { value: "1.0" },
        sidechainHighFrequencyEmphasis: { settingId: "flat" },
        detector: { settingId: "rms" },
        stereoMonoSidechainLinking: { value: "1.5" },
        stressCrossoverPhase: { settingId: "frequency-linear" },
        crestFactorShaping: { value: "1.0" },
        ratio: { value: "3" },
        knee: { value: "2" },
        attackWeighting: { value: "1.5" },
        releaseWeighting: { value: "3" },
        hold: { value: "1.0" },
        lookahead: { value: "4" },
        ledBrightness: { value: "4" },
      },
      frontPanelValues: {
        input: 50,
        threshold: 62,
        attack: 45,
        release: 52,
        output: 50,
        stress: 15,
        scf: "100 Hz",
        link: "STEREO",
      },
      frontPanel: {
        input: "0 dB",
        threshold: "Set for 0.5-1.5 dB GR",
        attack: "10-11 o'clock",
        release: "12 o'clock",
        output: "Unity",
        stress: "Off to 1 LED",
        scf: "100 Hz",
      },
    },
    {
      id: "aggressive-energy-bus",
      useCaseId: "mix-bus",
      label: "Aggressive Energy Bus",
      mode: "Smash",
      targetGainReduction: "2-4 dB",
      summary:
        "A character bus start for obvious energy, movement, and attitude.",
      why: [
        "Smash mode makes the compression part of the sound.",
        "Higher saturation and firmer diode behavior add attitude.",
        "Peak-aware settings keep impact controlled.",
      ],
      selected: {
        stressTypeDiodeClipping: { settingId: "polish-white" },
        diodeHardness: { value: "5" },
        sidechainHighFrequencyEmphasis: { settingId: "compress-highs-less" },
        detector: { settingId: "rms" },
        stereoMonoSidechainLinking: { value: "1.0" },
        stressCrossoverPhase: { settingId: "phase-linear-low-parallel" },
        crestFactorShaping: { value: "4" },
        ratio: { value: "5" },
        knee: { value: "1.0" },
        attackWeighting: { value: "2" },
        releaseWeighting: { value: "2" },
        hold: { value: "1.5" },
        lookahead: { value: "1.0" },
        ledBrightness: { value: "4" },
      },
      frontPanelValues: {
        input: 50,
        threshold: 38,
        attack: 38,
        release: 42,
        output: 50,
        stress: 58,
        scf: "100 Hz",
        link: "STEREO",
      },
      frontPanel: {
        input: "0 dB",
        threshold: "Set for 2-4 dB GR",
        attack: "10-11 o'clock",
        release: "10-12 o'clock",
        output: "Unity",
        stress: "4-7 LEDs",
        scf: "100 Hz",
      },
    },
  ].map((preset) => ({
    ...preset,
    ...PRESET_PLACEMENT[preset.id],
    controls: { ...DEFAULT_CONTROL_VALUES },
    context: {
      vocalStyle: "rap-singing",
      brightness: "sibilant",
      dynamics: "uneven",
      targetGainReduction: "3-6 dB",
    },
  }));

  const DEFAULT_STATE = {
    useAreaId: "tracking",
    presetId: "safe-vocal-catcher",
    controls: { ...DEFAULT_CONTROL_VALUES },
    context: {
      vocalStyle: "rap-singing",
      brightness: "sibilant",
      dynamics: "uneven",
      targetGainReduction: "3-6 dB",
    },
  };

  const PRESET_BASES = {
    "vocal-de-esser": "safe-vocal-catcher",
    "vocal-leveler": "modern-controlled-vocal",
    "harsh-vocal-smoother": "modern-controlled-vocal",
    "dull-vocal-forward": "character-vocal-print",
    "bass-di-leveler": "safe-vocal-catcher",
    "bass-color-print": "character-vocal-print",
    "guitar-di-safety": "safe-vocal-catcher",
    "guitar-cab-print": "character-vocal-print",
    "kick-snare-safety": "modern-controlled-vocal",
    "room-mic-control": "character-vocal-print",
    "bass-leveler": "punch-preserving-bus",
    "low-end-bloom-control": "punch-preserving-bus",
    "pick-attack-control": "modern-controlled-vocal",
    "drum-crush": "aggressive-energy-bus",
    "kick-weight-control": "punch-preserving-bus",
    "snare-crack": "aggressive-energy-bus",
    "room-pump": "aggressive-energy-bus",
    "guitar-cab-tamer": "modern-controlled-vocal",
    "harsh-guitar-smoother": "modern-controlled-vocal",
    "rhythm-guitar-glue": "punch-preserving-bus",
    "low-end-pumping-mix": "punch-preserving-bus",
    "flat-lifeless-mix": "aggressive-energy-bus",
    "harsh-bright-mix": "modern-finished-bus",
    "drum-bus-glue": "punch-preserving-bus",
    "parallel-drum-smash": "aggressive-energy-bus",
    "vocal-bus-polish": "modern-finished-bus",
    "gentle-master-control": "invisible-mix-glue",
    "loudness-prep": "modern-finished-bus",
  };

  function cloneSelectionMap(baseSelections = {}, overrideSelections = {}) {
    return Object.fromEntries(
      Object.entries({ ...baseSelections, ...overrideSelections }).map(
        ([id, selection]) => [
          id,
          selection &&
          typeof selection === "object" &&
          !Array.isArray(selection)
            ? { ...selection }
            : selection,
        ]
      )
    );
  }

  function createPresetFromBase(basePreset, overrides) {
    return {
      ...basePreset,
      ...overrides,
      selected: cloneSelectionMap(basePreset.selected, overrides.selected),
      controls: {
        ...(basePreset.controls || DEFAULT_CONTROL_VALUES),
        ...(overrides.controls || {}),
      },
      context: { ...(basePreset.context || {}), ...(overrides.context || {}) },
      frontPanelValues: {
        ...basePreset.frontPanelValues,
        ...(overrides.frontPanelValues || {}),
      },
      frontPanel: { ...basePreset.frontPanel, ...(overrides.frontPanel || {}) },
      tags: [...(overrides.tags || basePreset.tags || [])],
      why: [...(overrides.why || basePreset.why || [])],
    };
  }

  const basePresetById = Object.fromEntries(
    PRESETS.map((preset) => [preset.id, preset])
  );

  PRESETS.push(
    createPresetFromBase(basePresetById[PRESET_BASES["vocal-de-esser"]], {
      id: "vocal-de-esser",
      useAreaId: "mixing",
      sourceId: "vocals",
      label: "Vocal De-Esser",
      intent: "problem-solving",
      tags: ["vocal", "de-ess", "bright", "control"],
      summary: "Controls sharp sibilance without darkening the whole vocal.",
      targetGainReduction: "2-5 dB",
      context: {
        vocalStyle: "lead vocal",
        brightness: "sibilant",
        dynamics: "uneven",
        targetGainReduction: "2-5 dB",
      },
      controls: { ...DEFAULT_CONTROL_VALUES },
    })
  );

  const USE_AREA_ID_BY_LABEL = {
    Tracking: "tracking",
    Mixing: "mixing",
    "Bus / Master": "bus-master",
  };

  const ADDITIONAL_PRESETS = [
    [
      "vocal-leveler",
      "Mixing",
      "vocals",
      "Vocal Leveler",
      "Smooths phrase-to-phrase level movement while keeping articulation intact.",
    ],
    [
      "harsh-vocal-smoother",
      "Mixing",
      "vocals",
      "Harsh Vocal Smoother",
      "Controls bright vocal edges without pulling the vocal backward.",
    ],
    [
      "dull-vocal-forward",
      "Mixing",
      "vocals",
      "Dull Vocal Forward",
      "Adds density and forward motion to a vocal that feels buried.",
    ],
    [
      "bass-di-leveler",
      "Tracking",
      "bass",
      "Bass DI Leveler",
      "Prints controlled bass DI level without over-committing color.",
    ],
    [
      "bass-color-print",
      "Tracking",
      "bass",
      "Bass Color Print",
      "Adds harmonic confidence while tracking bass through the Brick Lane.",
    ],
    [
      "guitar-di-safety",
      "Tracking",
      "guitar",
      "Guitar DI Safety",
      "Keeps guitar DI peaks contained before amp or cab processing.",
    ],
    [
      "guitar-cab-print",
      "Tracking",
      "guitar",
      "Guitar Cab Print",
      "Prints guitar cabinet attitude with moderate compression movement.",
    ],
    [
      "kick-snare-safety",
      "Tracking",
      "drums",
      "Kick/Snare Safety",
      "Catches close-mic drum peaks without flattening the transient.",
    ],
    [
      "room-mic-control",
      "Tracking",
      "drums",
      "Room Mic Control",
      "Controls room mic swings while keeping the room lively.",
    ],
    [
      "bass-leveler",
      "Mixing",
      "bass",
      "Bass Leveler",
      "Stabilizes bass sustain while preserving the note front.",
    ],
    [
      "low-end-bloom-control",
      "Mixing",
      "bass",
      "Low-End Bloom Control",
      "Controls swollen low-end notes before they push the mix around.",
    ],
    [
      "pick-attack-control",
      "Mixing",
      "bass",
      "Pick Attack Control",
      "Catches aggressive bass pick noise without dulling the low end.",
    ],
    [
      "drum-crush",
      "Mixing",
      "drums",
      "Drum Crush",
      "Adds obvious drum attitude and compression movement.",
    ],
    [
      "kick-weight-control",
      "Mixing",
      "drums",
      "Kick Weight Control",
      "Controls kick low-end weight without making the detector pump.",
    ],
    [
      "snare-crack",
      "Mixing",
      "drums",
      "Snare Crack",
      "Brings snare impact forward with controlled transient edge.",
    ],
    [
      "room-pump",
      "Mixing",
      "drums",
      "Room Pump",
      "Emphasizes room movement for energetic drum ambience.",
    ],
    [
      "guitar-cab-tamer",
      "Mixing",
      "guitar",
      "Guitar Cab Tamer",
      "Smooths cabinet bite and upper-mid shove.",
    ],
    [
      "harsh-guitar-smoother",
      "Mixing",
      "guitar",
      "Harsh Guitar Smoother",
      "Controls bright guitar harshness while keeping rhythm detail.",
    ],
    [
      "rhythm-guitar-glue",
      "Mixing",
      "guitar",
      "Rhythm Guitar Glue",
      "Adds cohesion to layered rhythm guitars.",
    ],
    [
      "low-end-pumping-mix",
      "Bus / Master",
      "mix-bus",
      "Low-End Pumping Mix",
      "Keeps kick and bass from over-driving bus compression.",
    ],
    [
      "flat-lifeless-mix",
      "Bus / Master",
      "mix-bus",
      "Flat Lifeless Mix",
      "Adds movement, harmonic attitude, and level confidence.",
    ],
    [
      "harsh-bright-mix",
      "Bus / Master",
      "mix-bus",
      "Harsh Bright Mix",
      "Finishes a bright mix while reducing high-frequency overreaction.",
    ],
    [
      "drum-bus-glue",
      "Bus / Master",
      "drum-bus",
      "Drum Bus Glue",
      "Pulls the drum kit together while preserving impact.",
    ],
    [
      "parallel-drum-smash",
      "Bus / Master",
      "parallel-bus",
      "Parallel Drum Smash",
      "Creates an aggressive crushed blend for parallel drum energy.",
    ],
    [
      "vocal-bus-polish",
      "Bus / Master",
      "vocal-bus",
      "Vocal Bus Polish",
      "Adds smooth vocal-bus control after individual vocal processing.",
    ],
    [
      "gentle-master-control",
      "Bus / Master",
      "mastering",
      "Gentle Master Control",
      "Applies light master control without obvious mix movement.",
    ],
    [
      "loudness-prep",
      "Bus / Master",
      "mastering",
      "Loudness Prep",
      "Sets up a louder master path with clean peak-aware control.",
    ],
  ];

  PRESETS.push(
    ...ADDITIONAL_PRESETS.map(([id, useAreaLabel, sourceId, label, summary]) =>
      createPresetFromBase(basePresetById[PRESET_BASES[id]], {
        id,
        useAreaId: USE_AREA_ID_BY_LABEL[useAreaLabel],
        sourceId,
        label,
        intent: "problem-solving",
        tags: [sourceId, ...id.split("-").filter((part) => part !== sourceId)],
        summary,
        context: {
          vocalStyle: sourceId === "vocals" ? "lead vocal" : sourceId,
          brightness: "balanced",
          dynamics: "uneven",
          targetGainReduction:
            basePresetById[PRESET_BASES[id]].targetGainReduction,
        },
        controls: { ...DEFAULT_CONTROL_VALUES },
      })
    )
  );

  function cloneParameterWithSelection(parameterDefinition, selected) {
    return {
      ...parameterDefinition,
      selection:
        selected && typeof selected === "object" && !Array.isArray(selected)
          ? { ...selected }
          : {},
      selected: [],
    };
  }

  function clampPercent(value, fallback = 50) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return fallback;
    return Math.min(100, Math.max(0, numericValue));
  }

  function controlValue(controls, id) {
    return clampPercent(controls?.[id], DEFAULT_STATE.controls[id] ?? 50);
  }

  function weightedScore(parts) {
    const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
    if (!totalWeight) return 50;
    return parts.reduce(
      (sum, part) =>
        sum + clampPercent(part.value) * (part.weight / totalWeight),
      0
    );
  }

  function thresholdPick(score, thresholds) {
    const normalizedScore = clampPercent(score);
    const match = thresholds.find((entry) => normalizedScore < entry.below);
    return match ? match.value : thresholds[thresholds.length - 1].value;
  }

  function hasCustomCompressionControls(controls = {}) {
    return Object.keys(DEFAULT_STATE.controls).some((id) => {
      if (controls[id] === undefined) return false;
      return controlValue(controls, id) !== DEFAULT_STATE.controls[id];
    });
  }

  function deriveCompressionIntent(controls = {}) {
    const smooth = controlValue(controls, "punchSmooth");
    const color = controlValue(controls, "cleanColor");
    const open = controlValue(controls, "controlOpen");
    const exciting = controlValue(controls, "safeExciting");
    const loud = controlValue(controls, "glueLoud");
    const movement = controlValue(controls, "stableWide");
    const punch = 100 - smooth;
    const clean = 100 - color;
    const control = 100 - open;
    const safe = 100 - exciting;
    const glue = 100 - loud;
    const stable = 100 - movement;

    return {
      punch,
      color,
      control,
      safe,
      glue,
      stable,
      smooth,
      clean,
      open,
      exciting,
      loud,
      movement,
      peakNeed: weightedScore([
        { value: punch, weight: 0.4 },
        { value: control, weight: 0.3 },
        { value: exciting, weight: 0.2 },
        { value: movement, weight: 0.1 },
      ]),
      bodyNeed: weightedScore([
        { value: smooth, weight: 0.35 },
        { value: glue, weight: 0.35 },
        { value: safe, weight: 0.2 },
        { value: clean, weight: 0.1 },
      ]),
      intensity: weightedScore([
        { value: control, weight: 0.33 },
        { value: color, weight: 0.22 },
        { value: exciting, weight: 0.22 },
        { value: loud, weight: 0.13 },
        { value: punch, weight: 0.1 },
      ]),
      transparent: weightedScore([
        { value: clean, weight: 0.4 },
        { value: open, weight: 0.3 },
        { value: safe, weight: 0.2 },
        { value: glue, weight: 0.1 },
      ]),
    };
  }

  function blendPanelValue(baseValue, desiredValue, predictiveWeight = 0.68) {
    const base = clampPercent(baseValue, 50);
    const desired = clampPercent(desiredValue, base);
    return Math.round(base * (1 - predictiveWeight) + desired * predictiveWeight);
  }

  function deriveHardwareMode(intent) {
    if (intent.loud >= 76 && intent.control >= 58) return "Polish White";
    if (intent.color >= 76 || (intent.exciting >= 74 && intent.control >= 62)) {
      return "Smash";
    }
    if (intent.glue >= 68 && intent.stable >= 56) return "Glue";
    if (intent.smooth >= 66 && intent.color >= 38) return "Velvet";
    if (intent.open >= 68 && intent.clean >= 64) return "Float";
    return "Tame";
  }

  function deriveSidechainFilter(intent, preset = {}) {
    const sourceId = preset.sourceId || "";
    const useAreaId = preset.useAreaId || DEFAULT_STATE.useAreaId;

    if (sourceId === "drums" || sourceId === "drum-bus") {
      return intent.punch >= 34 || intent.control >= 42 ? "200 Hz" : "100 Hz";
    }
    if (sourceId === "bass") return intent.punch >= 58 ? "100 Hz" : "60 Hz";
    if (sourceId === "mix-bus" || sourceId === "mastering") {
      if (intent.clean >= 74 && intent.glue < 58) return "OFF";
      return intent.glue >= 48 ? "100 Hz" : "60 Hz";
    }
    if (sourceId === "parallel-bus") return "200 Hz";
    if (sourceId === "vocals" || sourceId === "vocal-bus") return "100 Hz";
    if (useAreaId === "tracking") return intent.safe >= 68 ? "100 Hz" : "60 Hz";
    return preset.frontPanelValues?.scf || "100 Hz";
  }

  function deriveLinkTopology(preset = {}) {
    const stereoSources = new Set([
      "keys-synths",
      "full-mix-repair",
      "mix-bus",
      "drum-bus",
      "vocal-bus",
      "parallel-bus",
      "mastering",
    ]);
    const explicitLayout = String(preset.context?.channelLayout || "").toUpperCase();

    return preset.isStereo === true ||
      explicitLayout === "STEREO" ||
      preset.useAreaId === "bus-master" ||
      stereoSources.has(preset.sourceId)
      ? "STEREO"
      : "MONO";
  }

  function deriveFrontPanelFromControls(controls = {}, preset = {}) {
    const intent = deriveCompressionIntent(controls);
    const base = preset.frontPanelValues || {};
    const desiredInput =
      50 + (intent.color - 50) * 0.34 + (intent.exciting - 50) * 0.16;
    const desiredThreshold =
      52 + (intent.open - intent.control) * 0.22 - (intent.loud - 50) * 0.1;
    const desiredAttack = weightedScore([
      { value: intent.punch, weight: 0.48 },
      { value: intent.control, weight: 0.25 },
      { value: intent.exciting, weight: 0.17 },
      { value: intent.loud, weight: 0.1 },
    ]);
    const desiredRelease = weightedScore([
      { value: intent.punch, weight: 0.23 },
      { value: intent.movement, weight: 0.27 },
      { value: intent.exciting, weight: 0.22 },
      { value: intent.loud, weight: 0.18 },
      { value: 100 - intent.glue, weight: 0.1 },
    ]);
    const desiredStress = weightedScore([
      { value: intent.color, weight: 0.58 },
      { value: intent.exciting, weight: 0.22 },
      { value: intent.loud, weight: 0.2 },
    ]);
    const threshold = blendPanelValue(base.threshold, desiredThreshold, 0.72);
    const outputCompensation = Math.max(0, (52 - threshold) * 0.38);

    return {
      input: blendPanelValue(base.input, desiredInput, 0.64),
      threshold,
      attack: blendPanelValue(base.attack, desiredAttack, 0.74),
      release: blendPanelValue(base.release, desiredRelease, 0.74),
      output: clampPercent(
        Math.round((base.output ?? 50) + outputCompensation),
        50
      ),
      stress: blendPanelValue(base.stress, desiredStress, 0.78),
      scf: deriveSidechainFilter(intent, preset),
      mode: deriveHardwareMode(intent),
      link: deriveLinkTopology(preset),
      optosync: base.optosync || "PARENT",
      in: base.in === false ? false : true,
    };
  }

  function clockPosition(value) {
    const minutes =
      Math.round((7.5 * 60 + clampPercent(value) * 5.4) / 15) * 15;
    const hours = Math.floor(minutes / 60) % 12 || 12;
    const mins = minutes % 60;
    return `${hours}:${String(mins).padStart(2, "0")}`;
  }

  function frontPanelTextFromValues(values, targetGainReduction) {
    const db = (value) => Math.round(-20 + clampPercent(value) * 0.4);
    return {
      input: `${db(values.input)} dB`,
      threshold: `Set for ${targetGainReduction || "the target gain reduction"}`,
      attack: `${clockPosition(values.attack)} (${Math.round(values.attack)}% fast in ${values.mode || "this mode"})`,
      release: `${clockPosition(values.release)} (${Math.round(values.release)}% fast in ${values.mode || "this mode"})`,
      output: `${db(values.output)} dB starting makeup`,
      stress: `${(clampPercent(values.stress) / 10).toFixed(1)} / 10`,
      scf: values.scf,
    };
  }

  function deriveDetectorSelection(intent) {
    if (intent.peakNeed >= 70 && intent.bodyNeed >= 55) {
      return { settingId: "peak-rms-slow" };
    }
    if (intent.peakNeed >= 62) return { settingId: "peak-rms" };
    if (intent.bodyNeed >= 70) return { settingId: "rms-slow-rms" };
    if (intent.bodyNeed >= 58) return { settingId: "rms" };
    if (intent.peakNeed >= 48) return { settingId: "peak" };
    return { settingId: "slow-rms" };
  }

  function deriveSidechainSelection(intent, useAreaId) {
    if (useAreaId === "tracking") {
      if (intent.safe >= 76 && intent.clean >= 62) {
        return { settingId: "compress-highs-more" };
      }
      if (intent.safe >= 62) return { settingId: "de-ess-mid" };
      if (intent.color >= 72 || intent.exciting >= 68) {
        return { settingId: "sc-emp-hard" };
      }
      if (intent.color >= 54) return { settingId: "compress-highs-more" };
      return { settingId: "compress-highs-less" };
    }

    if (intent.loud >= 76 || intent.exciting >= 76) {
      return { settingId: "sc-de-emp-mid" };
    }
    if (intent.punch >= 72) return { settingId: "compress-highs-less" };
    if (intent.color >= 70) return { settingId: "compress-highs-more" };
    return { settingId: "flat" };
  }

  function deriveCompressionSelectionsFromControls(
    controls = {},
    useAreaId = DEFAULT_STATE.useAreaId
  ) {
    const intent = deriveCompressionIntent(controls);
    const ratioScore = weightedScore([
      { value: intent.control, weight: 0.42 },
      { value: intent.color, weight: 0.22 },
      { value: intent.exciting, weight: 0.18 },
      { value: intent.loud, weight: 0.12 },
      { value: intent.punch, weight: 0.06 },
    ]);
    const releaseScore = intent.bodyNeed;
    const attackClampScore = weightedScore([
      { value: intent.control, weight: 0.4 },
      { value: intent.exciting, weight: 0.25 },
      { value: intent.color, weight: 0.15 },
      { value: intent.smooth, weight: 0.2 },
    ]);
    const crestScore = weightedScore([
      { value: intent.peakNeed, weight: 0.45 },
      { value: intent.bodyNeed, weight: 0.25 },
      { value: intent.intensity, weight: 0.3 },
    ]);
    const kneeScore = 100 - intent.intensity;
    const holdScore = weightedScore([
      { value: intent.bodyNeed, weight: 0.42 },
      { value: intent.safe, weight: 0.35 },
      { value: intent.glue, weight: 0.23 },
    ]);
    const lookaheadScore = weightedScore([
      { value: intent.control, weight: 0.45 },
      { value: intent.exciting, weight: 0.28 },
      { value: intent.loud, weight: 0.17 },
      { value: intent.punch, weight: 0.1 },
    ]);

    return {
      stressTypeDiodeClipping: {
        settingId:
          intent.color >= 82
            ? "polish-white"
            : intent.color >= 66
              ? "glue"
              : intent.color >= 44
                ? "smash"
                : intent.clean >= 78
                  ? "float"
                  : "velvet",
      },
      diodeHardness: {
        value: thresholdPick(intent.color, [
          { below: 18, value: "0.5" },
          { below: 32, value: "1.0" },
          { below: 48, value: "1.5" },
          { below: 64, value: "2" },
          { below: 78, value: "3" },
          { below: 90, value: "5" },
          { below: 101, value: "6" },
        ]),
      },
      stressCrossoverPhase: {
        settingId:
          intent.stable >= 72
            ? "linear-freq"
            : intent.movement >= 72
              ? "crossover-b"
              : intent.color >= 65
                ? "crossover-a"
                : "low-freq-par",
      },
      sidechainHighFrequencyEmphasis: deriveSidechainSelection(
        intent,
        useAreaId
      ),
      detector: deriveDetectorSelection(intent),
      crestFactorShaping: {
        value: thresholdPick(crestScore, [
          { below: 22, value: "0.5" },
          { below: 38, value: "1.0" },
          { below: 54, value: "1.5" },
          { below: 68, value: "2" },
          { below: 80, value: "3" },
          { below: 90, value: "4" },
          { below: 101, value: "5" },
        ]),
      },
      stereoMonoSidechainLinking: {
        value: thresholdPick(intent.stable, [
          { below: 22, value: "0.5" },
          { below: 45, value: "1.0" },
          { below: 70, value: "1.5" },
          { below: 88, value: "2" },
          { below: 101, value: "3" },
        ]),
      },
      ratio: {
        value: thresholdPick(ratioScore, [
          { below: 14, value: "1.0" },
          { below: 28, value: "1.5" },
          { below: 42, value: "2" },
          { below: 58, value: "3" },
          { below: 70, value: "4" },
          { below: 82, value: "6" },
          { below: 101, value: "8" },
        ]),
      },
      knee: {
        value: thresholdPick(kneeScore, [
          { below: 18, value: "0.5" },
          { below: 34, value: "1.0" },
          { below: 50, value: "1.5" },
          { below: 66, value: "2" },
          { below: 82, value: "3" },
          { below: 94, value: "4" },
          { below: 101, value: "5" },
        ]),
      },
      attackWeighting: {
        value: thresholdPick(attackClampScore, [
          { below: 25, value: "6" },
          { below: 40, value: "5" },
          { below: 55, value: "4" },
          { below: 70, value: "3" },
          { below: 84, value: "2" },
          { below: 101, value: "1.5" },
        ]),
      },
      releaseWeighting: {
        value: thresholdPick(releaseScore, [
          { below: 18, value: "1.5" },
          { below: 32, value: "2" },
          { below: 48, value: "3" },
          { below: 64, value: "4" },
          { below: 80, value: "5" },
          { below: 101, value: "6" },
        ]),
      },
      hold: {
        value: thresholdPick(holdScore, [
          { below: 28, value: "0.5" },
          { below: 54, value: "1.0" },
          { below: 76, value: "1.5" },
          { below: 90, value: "2" },
          { below: 101, value: "3" },
        ]),
      },
      lookahead: {
        value: thresholdPick(lookaheadScore, [
          { below: 25, value: "0.5" },
          { below: 48, value: "1.0" },
          { below: 66, value: "1.5" },
          { below: 80, value: "3" },
          { below: 92, value: "4" },
          { below: 101, value: "5" },
        ]),
      },
      ledBrightness: { value: "4" },
    };
  }

  function getUseAreaById(useAreaId) {
    return USE_AREAS.find((area) => area.id === useAreaId) || null;
  }

  function getSourceById(useAreaId, sourceId) {
    return (
      SOURCES.find(
        (source) => source.useAreaId === useAreaId && source.id === sourceId
      ) || null
    );
  }

  function getPresetById(presetId) {
    return PRESETS.find((preset) => preset.id === presetId) || null;
  }

  function getPresetsForUseArea(useAreaId) {
    return PRESETS.filter((preset) => preset.useAreaId === useAreaId);
  }

  function getPresetsGroupedBySource(useAreaId) {
    return SOURCES.filter((source) => source.useAreaId === useAreaId)
      .map((source) => ({
        source,
        presets: PRESETS.filter(
          (preset) =>
            preset.useAreaId === useAreaId && preset.sourceId === source.id
        ),
      }))
      .filter((group) => group.presets.length > 0);
  }

  function getFirstPresetForUseArea(useAreaId) {
    return getPresetsForUseArea(useAreaId)[0] || PRESETS[0];
  }

  function getGeneratedPreset(state = DEFAULT_STATE) {
    const requestedUseAreaId = state.useAreaId || DEFAULT_STATE.useAreaId;
    const preset =
      getPresetById(state.presetId) ||
      getFirstPresetForUseArea(requestedUseAreaId) ||
      PRESETS[0];
    const useArea = getUseAreaById(preset.useAreaId);
    const source = getSourceById(preset.useAreaId, preset.sourceId);

    const generatedControls = {
      ...DEFAULT_CONTROL_VALUES,
      ...(preset.controls || {}),
      ...(state.controls || {}),
    };
    const generatedContext = {
      ...(preset.context || {}),
      ...(state.context || {}),
    };

    const hasCustomControls = hasCustomCompressionControls(state.controls);
    const predictiveSelections = hasCustomControls
      ? deriveCompressionSelectionsFromControls(
          generatedControls,
          preset.useAreaId
        )
      : {};
    const predictiveFrontPanel = hasCustomControls
      ? deriveFrontPanelFromControls(generatedControls, preset)
      : {
          ...(preset.frontPanelValues || {}),
          scf: deriveSidechainFilter(
            deriveCompressionIntent(generatedControls),
            preset
          ),
          mode: preset.frontPanelValues?.mode || preset.mode,
          link: deriveLinkTopology(preset),
          optosync: preset.frontPanelValues?.optosync || "PARENT",
          in: preset.frontPanelValues?.in === false ? false : true,
        };
    const generatedFrontPanelValues = {
      ...predictiveFrontPanel,
      ...(state.frontPanelOverrides || {}),
    };
    const selected = {
      ...cloneSelectionMap(preset.selected, predictiveSelections),
      ...cloneSelectionMap({}, state.parameterSelections || {}),
    };

    const parameters = Object.fromEntries(
      Object.entries(ENIGMA_PARAMETERS).map(([id, definition]) => [
        id,
        cloneParameterWithSelection(definition, selected[id]),
      ])
    );
    const isModified = Boolean(
      state.modified ||
      hasCustomCompressionControls(state.controls) ||
      Object.keys(state.parameterSelections || {}).length > 0
    );

    return {
      ...preset,
      mode: generatedFrontPanelValues.mode || preset.mode,
      useAreaLabel: useArea ? useArea.label : preset.useAreaId,
      sourceLabel: source ? source.label : preset.sourceId,
      isModified,
      selected,
      controls: generatedControls,
      context: generatedContext,
      frontPanelValues: generatedFrontPanelValues,
      frontPanel: {
        ...(preset.frontPanel || {}),
        ...frontPanelTextFromValues(
          generatedFrontPanelValues,
          preset.targetGainReduction
        ),
      },
      tags: [...(preset.tags || [])],
      why: [...(preset.why || [])],
      parameters,
      parameterOrder: [...PARAMETER_ORDER],
    };
  }

  const api = {
    COMMON_LED_SCALE,
    BRICK_LANE_COLORS,
    FRONT_PANEL_REFERENCE,
    ENIGMA_DEMYSTIFIER,
    CONTROL_DEFINITIONS,
    DEFAULT_CONTROL_VALUES,
    ENIGMA_PARAMETERS,
    PARAMETER_ORDER,
    USE_AREAS,
    SOURCES,
    PRESETS,
    DEFAULT_STATE,
    getUseAreaById,
    getSourceById,
    getPresetById,
    getPresetsForUseArea,
    getPresetsGroupedBySource,
    getFirstPresetForUseArea,
    deriveCompressionSelectionsFromControls,
    deriveFrontPanelFromControls,
    getGeneratedPreset,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.BrickLaneData = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
