(function initStateMachine(globalScope) {
  const data =
    globalScope.BrickLaneData ||
    (typeof require === "function" ? require("../../brick-lane-data") : null);

  function getInitialState() {
    const defaultDataState = data
      ? data.DEFAULT_STATE
      : {
          useCaseId: "tracking-vocal",
          archetypeId: "safe-vocal-catcher",
          problemPresetId: "sibilant-uneven-vocal",
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

    return {
      useCaseId: defaultDataState.useCaseId,
      archetypeId: defaultDataState.archetypeId,
      problemPresetId: defaultDataState.problemPresetId || null,
      controls: { ...defaultDataState.controls },
      context: { ...defaultDataState.context },
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
      parameterSelections: {},
      activeTab: "primary",
      monitorParam: "VU",
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

  function findArchetype(archetypeId) {
    if (!data || !Array.isArray(data.ARCHETYPES)) return null;
    return data.ARCHETYPES.find((arch) => arch.id === archetypeId) || null;
  }

  function findProblemPreset(problemPresetId) {
    if (!data || !Array.isArray(data.PROBLEM_PRESETS)) return null;
    return (
      data.PROBLEM_PRESETS.find((preset) => preset.id === problemPresetId) ||
      null
    );
  }

  function labStateReducer(state, action) {
    if (!state) {
      return getInitialState();
    }

    switch (action.type) {
      case "INIT": {
        return getInitialState();
      }

      case "SET_USE_CASE": {
        const { useCaseId } = action.payload;
        if (!useCaseId) return state;

        let firstArchetype = null;
        if (data && typeof data.getArchetypesForUseCase === "function") {
          const archetypes = data.getArchetypesForUseCase(useCaseId);
          firstArchetype = archetypes[0] || null;
        }

        const nextState = {
          ...state,
          useCaseId,
          archetypeId: firstArchetype ? firstArchetype.id : state.archetypeId,
          problemPresetId: null,
          frontPanelValues: { ...state.frontPanelValues },
          parameterSelections: {},
        };

        if (firstArchetype && firstArchetype.frontPanelValues) {
          nextState.frontPanelValues = { ...firstArchetype.frontPanelValues };
        }

        return nextState;
      }

      case "SET_ARCHETYPE": {
        const { archetypeId } = action.payload;
        if (!archetypeId) return state;

        const matchingArch = findArchetype(archetypeId);

        const nextState = {
          ...state,
          archetypeId,
          problemPresetId: null,
          frontPanelValues: { ...state.frontPanelValues },
          parameterSelections: {},
        };

        if (matchingArch && matchingArch.frontPanelValues) {
          nextState.frontPanelValues = { ...matchingArch.frontPanelValues };
        }

        return nextState;
      }

      case "APPLY_PROBLEM_PRESET": {
        const { problemPresetId } = action.payload || {};
        const problemPreset = findProblemPreset(problemPresetId);
        if (!problemPreset) return state;

        const matchingArch = findArchetype(problemPreset.archetypeId);

        return {
          ...state,
          useCaseId: problemPreset.useCaseId,
          archetypeId: problemPreset.archetypeId,
          problemPresetId: problemPreset.id,
          controls: { ...problemPreset.controls },
          context: { ...problemPreset.context },
          frontPanelValues: matchingArch?.frontPanelValues
            ? { ...matchingArch.frontPanelValues }
            : { ...state.frontPanelValues },
          parameterSelections: {},
          activeTab: "primary",
          monitorParam: "VU",
        };
      }

      case "UPDATE_CONTROL": {
        const { controlId, value } = action.payload;
        if (controlId === undefined || value === undefined) return state;

        return {
          ...state,
          problemPresetId: null,
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
          problemPresetId: null,
          controls: mapCompressionPointToControls({ x, y }),
        };
      }

      case "UPDATE_FRONT_PANEL": {
        const { param, value } = action.payload;
        if (param === undefined || value === undefined) return state;

        return {
          ...state,
          problemPresetId: null,
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
          problemPresetId: null,
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
          problemPresetId: null,
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
          problemPresetId: null,
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
