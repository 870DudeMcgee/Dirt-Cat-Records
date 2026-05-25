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
    scfFrequencies: ["60Hz", "100Hz", "200Hz"],
    lowerSections: ["scf", "mode", "optosync", "in"],
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
          ledPattern: ["1.0"],
        },
        {
          id: "smash",
          label: "Smash (FET)",
          meaning: "Edgy, transient-forward drive.",
          ledPattern: ["1.5"],
        },
        {
          id: "tame",
          label: "Tame (Clean/Transparent)",
          meaning: "Least colored saturation path.",
          ledPattern: ["2"],
        },
        {
          id: "glue",
          label: "Glue (VCA)",
          meaning: "Cohesive, mix-bus density.",
          ledPattern: ["3"],
        },
        {
          id: "polish-white",
          label: "Polish White (Limiter/Clipper)",
          meaning: "Bright limiting / clipping style finish.",
          ledPattern: ["4"],
        },
        {
          id: "polish-blue",
          label: "Polish Blue (Limiter/Clipper)",
          meaning: "Alternative bright limiting / clipping style finish.",
          ledPattern: ["5"],
        },
        {
          id: "series-clip-1",
          label: "Series Clip 1",
          meaning: "First series clipper configuration.",
          ledPattern: ["6"],
        },
        {
          id: "series-clip-2",
          label: "Series Clip 2",
          meaning: "Second series clipper configuration.",
          ledPattern: ["8"],
        },
        {
          id: "series-clip-3",
          label: "Series Clip 3",
          meaning: "Third series clipper configuration.",
          ledPattern: ["10"],
        },
        {
          id: "series-clip-4",
          label: "Series Clip 4",
          meaning: "Fourth series clipper configuration.",
          ledPattern: ["12"],
        },
        {
          id: "series-clip-5",
          label: "Series Clip 5",
          meaning: "Fifth series clipper configuration.",
          ledPattern: ["15"],
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
          id: "linear-phase",
          label: "Linear Phase",
          meaning: "Linear phase parallel alignment.",
          ledPattern: ["0.5"],
        },
        {
          id: "linear-freq",
          label: "Linear Freq",
          meaning: "Linear frequency parallel alignment.",
          ledPattern: ["1.0"],
        },
        {
          id: "low-freq-par",
          label: "Low-Freq Par",
          meaning: "Low frequency parallel emphasis.",
          ledPattern: ["1.5"],
        },
        {
          id: "inverted-phase",
          label: "Inverted Phase",
          meaning: "Inverted phase parallel alignment.",
          ledPattern: ["2"],
        },
        {
          id: "crossover-a",
          label: "Crossover A",
          meaning: "Crossover option A.",
          ledPattern: ["3"],
        },
        {
          id: "crossover-b",
          label: "Crossover B",
          meaning: "Crossover option B.",
          ledPattern: ["4"],
        },
        {
          id: "crossover-c",
          label: "Crossover C",
          meaning: "Crossover option C.",
          ledPattern: ["5"],
        },
        {
          id: "crossover-d",
          label: "Crossover D",
          meaning: "Crossover option D.",
          ledPattern: ["6"],
        },
        {
          id: "phase-45",
          label: "Phase 45°",
          meaning: "Parallel phase offset 45 degrees.",
          ledPattern: ["8"],
        },
        {
          id: "phase-90",
          label: "Phase 90°",
          meaning: "Parallel phase offset 90 degrees.",
          ledPattern: ["10"],
        },
        {
          id: "phase-135",
          label: "Phase 135°",
          meaning: "Parallel phase offset 135 degrees.",
          ledPattern: ["12"],
        },
        {
          id: "phase-inverted",
          label: "Phase Inverted",
          meaning: "Fully inverted parallel phase offset.",
          ledPattern: ["15"],
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
          label: "Flat (Bypass)",
          meaning: "No high frequency sidechain filter modification.",
          ledPattern: ["0.5"],
        },
        {
          id: "sc-de-emp-soft",
          label: "SC De-emp Soft",
          meaning: "Soft high frequency de-emphasis on sidechain.",
          ledPattern: ["1.0"],
        },
        {
          id: "sc-de-emp-mid",
          label: "SC De-emp Mid",
          meaning: "Medium high frequency de-emphasis on sidechain.",
          ledPattern: ["1.5"],
        },
        {
          id: "sc-de-emp-hard",
          label: "SC De-emp Hard",
          meaning: "Hard high frequency de-emphasis on sidechain.",
          ledPattern: ["2"],
        },
        {
          id: "sc-de-emp-ext",
          label: "SC De-emp Ext",
          meaning: "Extreme high frequency de-emphasis on sidechain.",
          ledPattern: ["3"],
        },
        {
          id: "sc-emp-soft",
          label: "SC Emp Soft",
          meaning: "Soft high frequency emphasis on sidechain.",
          ledPattern: ["4"],
        },
        {
          id: "sc-emp-mid",
          label: "SC Emp Mid",
          meaning: "Medium high frequency emphasis on sidechain.",
          ledPattern: ["5"],
        },
        {
          id: "sc-emp-hard",
          label: "SC Emp Hard",
          meaning: "Hard high frequency emphasis on sidechain.",
          ledPattern: ["6"],
        },
        {
          id: "sc-emp-ext",
          label: "SC Emp Ext",
          meaning: "Extreme high frequency emphasis on sidechain.",
          ledPattern: ["8"],
        },
        {
          id: "de-ess-soft",
          label: "De-ess Soft",
          meaning: "Soft sidechain de-essing filter behavior.",
          ledPattern: ["10"],
        },
        {
          id: "de-ess-mid",
          label: "De-ess Mid",
          meaning: "Medium sidechain de-essing filter behavior.",
          ledPattern: ["12"],
        },
        {
          id: "de-ess-hard",
          label: "De-ess Hard",
          meaning: "Hard sidechain de-essing filter behavior.",
          ledPattern: ["15"],
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

  const USE_CASES = [
    {
      id: "tracking-vocal",
      label: "Tracking Vocal",
      description:
        "Generate capture-safe or characterful vocal tracking starts.",
    },
    {
      id: "mix-bus",
      label: "Mix Bus",
      description:
        "Generate stereo bus glue, punch, control, or finishing starts.",
    },
  ];

  const ARCHETYPES = [
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
        sidechainHighFrequencyEmphasis: { settingId: "de-ess-hard" },
        detector: { settingId: "peak-rms-slow" },
        stereoMonoSidechainLinking: { value: "1.0" },
        stressCrossoverPhase: { settingId: "low-freq-par" },
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
        sidechainHighFrequencyEmphasis: { settingId: "sc-emp-soft" },
        detector: { settingId: "peak-rms" },
        stereoMonoSidechainLinking: { value: "1.0" },
        stressCrossoverPhase: { settingId: "inverted-phase" },
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
        sidechainHighFrequencyEmphasis: { settingId: "de-ess-hard" },
        detector: { settingId: "rms" },
        stereoMonoSidechainLinking: { value: "1.0" },
        stressCrossoverPhase: { settingId: "linear-freq" },
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
        sidechainHighFrequencyEmphasis: { settingId: "sc-emp-soft" },
        detector: { settingId: "rms" },
        stereoMonoSidechainLinking: { value: "0.5" },
        stressCrossoverPhase: { settingId: "crossover-a" },
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
        stressCrossoverPhase: { settingId: "linear-freq" },
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
        sidechainHighFrequencyEmphasis: { settingId: "sc-de-emp-soft" },
        detector: { settingId: "peak-rms" },
        stereoMonoSidechainLinking: { value: "1.0" },
        stressCrossoverPhase: { settingId: "inverted-phase" },
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
        sidechainHighFrequencyEmphasis: { settingId: "sc-de-emp-soft" },
        detector: { settingId: "rms" },
        stereoMonoSidechainLinking: { value: "1.5" },
        stressCrossoverPhase: { settingId: "low-freq-par" },
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
        stressCrossoverPhase: { settingId: "linear-freq" },
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
        sidechainHighFrequencyEmphasis: { settingId: "sc-de-emp-soft" },
        detector: { settingId: "rms" },
        stereoMonoSidechainLinking: { value: "1.0" },
        stressCrossoverPhase: { settingId: "crossover-b" },
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
  ];

  const DEFAULT_STATE = {
    useCaseId: "tracking-vocal",
    archetypeId: "safe-vocal-catcher",
    controls: Object.fromEntries(
      CONTROL_DEFINITIONS.map((control) => [control.id, control.defaultValue])
    ),
    context: {
      vocalStyle: "rap-singing",
      brightness: "sibilant",
      dynamics: "uneven",
      targetGainReduction: "3-6 dB",
    },
  };

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

  function getArchetypesForUseCase(useCaseId) {
    return ARCHETYPES.filter((archetype) => archetype.useCaseId === useCaseId);
  }

  function getGeneratedPreset(state = DEFAULT_STATE) {
    const requestedUseCaseId = state.useCaseId || DEFAULT_STATE.useCaseId;
    const archetype =
      ARCHETYPES.find((candidate) => candidate.id === state.archetypeId) ||
      ARCHETYPES.find(
        (candidate) => candidate.useCaseId === requestedUseCaseId
      ) ||
      ARCHETYPES[0];

    const parameters = Object.fromEntries(
      Object.entries(ENIGMA_PARAMETERS).map(([id, definition]) => [
        id,
        cloneParameterWithSelection(definition, archetype.selected[id]),
      ])
    );

    return {
      ...archetype,
      controls: { ...DEFAULT_STATE.controls, ...(state.controls || {}) },
      context: { ...DEFAULT_STATE.context, ...(state.context || {}) },
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
    ENIGMA_PARAMETERS,
    PARAMETER_ORDER,
    USE_CASES,
    ARCHETYPES,
    DEFAULT_STATE,
    getArchetypesForUseCase,
    getGeneratedPreset,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.BrickLaneData = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
