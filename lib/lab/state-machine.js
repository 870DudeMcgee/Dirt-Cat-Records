(function initStateMachine(globalScope) {
  const data =
    globalScope.BrickLaneData ||
    (typeof require === "function" ? require("../../brick-lane-data") : null);

  function getInitialState() {
    const defaultDataState = data
      ? data.DEFAULT_STATE
      : {
          useAreaId: "tracking",
          presetId: "safe-vocal-catcher",
          controls: {
            punchSmooth: 58,
            cleanColor: 32,
            controlOpen: 76,
            safeExciting: 64,
            glueLoud: 44,
            stableWide: 38,
          },
          context: {
            vocalStyle: "rap-singing",
            brightness: "sibilant",
            dynamics: "uneven",
            targetGainReduction: "3-6 dB",
          },
        };
    const defaultPreset =
      data && typeof data.getPresetById === "function"
        ? data.getPresetById(defaultDataState.presetId)
        : null;
    const defaultFrontPanelValues = defaultPreset?.frontPanelValues || {
      input: 50,
      threshold: 48,
      attack: 42,
      release: 52,
      output: 50,
      stress: 28,
      scf: "100 Hz",
      link: "STEREO",
    };

    return {
      useAreaId: defaultDataState.useAreaId,
      presetId: defaultDataState.presetId,
      controls: { ...defaultDataState.controls },
      context: { ...defaultDataState.context },
      frontPanelValues: { ...defaultFrontPanelValues },
      parameterSelections: {},
      activeTab: "primary",
      monitorParam: "VU",
      modified: false,
    };
  }

  function clampPercent(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return 50;
    return Math.min(100, Math.max(0, numericValue));
  }

  function blendedPercent(...parts) {
    const total = parts.reduce((sum, part) => sum + part.weight, 0);
    if (!total) return 50;
    return Math.round(
      parts.reduce(
        (sum, part) => sum + clampPercent(part.value) * part.weight,
        0
      ) / total
    );
  }

  function mapCompressionPointToControls(point) {
    const x = clampPercent(point?.x);
    const y = clampPercent(point?.y);
    const top = 100 - y;
    const left = 100 - x;

    return {
      punchSmooth: blendedPercent(
        { value: x, weight: 0.75 },
        { value: top, weight: 0.25 }
      ),
      cleanColor: blendedPercent(
        { value: y, weight: 0.85 },
        { value: left, weight: 0.15 }
      ),
      controlOpen: blendedPercent(
        { value: x, weight: 0.65 },
        { value: top, weight: 0.35 }
      ),
      safeExciting: blendedPercent(
        { value: top, weight: 0.75 },
        { value: x, weight: 0.25 }
      ),
      glueLoud: blendedPercent(
        { value: left, weight: 0.6 },
        { value: top, weight: 0.4 }
      ),
      stableWide: blendedPercent(
        { value: x, weight: 0.7 },
        { value: y, weight: 0.3 }
      ),
    };
  }

  function findPreset(presetId) {
    if (!data || typeof data.getPresetById !== "function") return null;
    return data.getPresetById(presetId);
  }

  function stateFromPreset(state, preset) {
    return {
      ...state,
      useAreaId: preset.useAreaId,
      presetId: preset.id,
      controls: { ...preset.controls },
      context: { ...preset.context },
      frontPanelValues: preset.frontPanelValues
        ? { ...preset.frontPanelValues }
        : { ...state.frontPanelValues },
      parameterSelections: {},
      activeTab: "primary",
      monitorParam: "VU",
      modified: false,
    };
  }

  function labStateReducer(state, action) {
    if (!state) {
      return getInitialState();
    }

    switch (action.type) {
      case "INIT": {
        return getInitialState();
      }

      case "SET_USE_AREA": {
        const { useAreaId } = action.payload;
        if (!useAreaId) return state;

        let preset = null;
        if (data && typeof data.getPresetsForUseArea === "function") {
          preset = data.getPresetsForUseArea(useAreaId)[0] || null;
        } else if (
          data &&
          typeof data.getFirstPresetForUseArea === "function"
        ) {
          const firstPreset = data.getFirstPresetForUseArea(useAreaId);
          preset = firstPreset?.useAreaId === useAreaId ? firstPreset : null;
        }
        if (!preset) return state;

        return stateFromPreset(state, preset);
      }

      case "SET_PRESET": {
        const { presetId } = action.payload;
        if (!presetId) return state;

        const preset = findPreset(presetId);
        if (!preset) return state;

        return stateFromPreset(state, preset);
      }

      case "UPDATE_CONTROL": {
        const { controlId, value } = action.payload;
        if (controlId === undefined || value === undefined) return state;

        return {
          ...state,
          modified: true,
          controls: {
            ...state.controls,
            [controlId]: Number(value),
          },
        };
      }

      case "UPDATE_COMPRESSION_POINT": {
        const { x, y } = action.payload || {};

        return {
          ...state,
          modified: true,
          controls: mapCompressionPointToControls({ x, y }),
        };
      }

      case "UPDATE_FRONT_PANEL": {
        const { param, value } = action.payload;
        if (param === undefined || value === undefined) return state;

        return {
          ...state,
          modified: true,
          frontPanelValues: {
            ...state.frontPanelValues,
            [param]: value,
          },
        };
      }

      case "SET_ACTIVE_TAB": {
        const { tab } = action.payload;
        if (!tab) return state;

        return {
          ...state,
          activeTab: tab,
        };
      }

      case "SET_MONITOR_PARAM": {
        const { param } = action.payload;
        if (!param) return state;

        return {
          ...state,
          monitorParam: param,
        };
      }

      case "SET_PARAMETER_SELECTION": {
        const { parameterId, selection } = action.payload;
        if (!parameterId || !selection || typeof selection !== "object")
          return state;

        return {
          ...state,
          modified: true,
          parameterSelections: {
            ...(state.parameterSelections || {}),
            [parameterId]: { ...selection },
          },
        };
      }

      case "TOGGLE_PARAMETER_RUNG": {
        const { parameterId, value } = action.payload;
        if (!parameterId || value === undefined) return state;

        const currentValues =
          state.parameterSelections?.[parameterId]?.legacyValues || [];
        const normalizedValue = String(value);
        const nextValues = currentValues.includes(normalizedValue)
          ? currentValues.filter((item) => item !== normalizedValue)
          : [...currentValues, normalizedValue];

        return {
          ...state,
          modified: true,
          parameterSelections: {
            ...(state.parameterSelections || {}),
            [parameterId]: { legacyValues: nextValues },
          },
        };
      }

      case "UPDATE_CONTEXT": {
        const { key, value } = action.payload;
        if (key === undefined || value === undefined) return state;

        return {
          ...state,
          modified: true,
          context: {
            ...state.context,
            [key]: value,
          },
        };
      }

      default:
        return state;
    }
  }

  const api = {
    getInitialState,
    labStateReducer,
    mapCompressionPointToControls,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.BrickLaneLabStateMachine = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
