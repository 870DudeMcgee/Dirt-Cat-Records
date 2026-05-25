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

        let matchingArch = null;
        if (data && Array.isArray(data.ARCHETYPES)) {
          matchingArch = data.ARCHETYPES.find(
            (arch) => arch.id === archetypeId
          );
        }

        const nextState = {
          ...state,
          archetypeId,
          frontPanelValues: { ...state.frontPanelValues },
          parameterSelections: {},
        };

        if (matchingArch && matchingArch.frontPanelValues) {
          nextState.frontPanelValues = { ...matchingArch.frontPanelValues };
        }

        return nextState;
      }

      case "UPDATE_CONTROL": {
        const { controlId, value } = action.payload;
        if (controlId === undefined || value === undefined) return state;

        return {
          ...state,
          controls: {
            ...state.controls,
            [controlId]: Number(value),
          },
        };
      }

      case "UPDATE_FRONT_PANEL": {
        const { param, value } = action.payload;
        if (param === undefined || value === undefined) return state;

        return {
          ...state,
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
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.BrickLaneLabStateMachine = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
