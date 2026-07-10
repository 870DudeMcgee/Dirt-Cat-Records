(function initBrickLaneResolver(globalScope) {
  function getDisplayScale(parameter) {
    return parameter.displayScale || parameter.scale || [];
  }

  function normalizeSelection(selection) {
    if (
      selection &&
      typeof selection === "object" &&
      !Array.isArray(selection)
    ) {
      return selection;
    }
    if (Array.isArray(selection)) {
      return { legacyValues: selection.map(String) };
    }
    if (selection === undefined || selection === null) {
      return {};
    }
    return { value: String(selection) };
  }

  function detectorTableKey(detectorSettingId) {
    const id = String(detectorSettingId || "");
    if (id.endsWith("-variable")) return "variable";
    if (["peak", "rms", "slow-rms"].includes(id)) return "single";
    if (id === "peak-slow-rms") return "slowRmsFixed";
    return "rmsFixed";
  }

  function interpretSteppedValue(parameter, value, displayScale, context = {}) {
    const position = displayScale.indexOf(value);
    const ledPosition = `LED ${value}`;

    if (parameter.interpretation === "detector-dependent-table") {
      const tableKey = detectorTableKey(context.detectorSettingId);
      const table = parameter.valueTables?.[tableKey] || [];
      const interpreted = table[position];
      const contextLabels = {
        single: "single detector",
        variable: "RMS pot variable",
        rmsFixed: "fixed RMS detector",
        slowRmsFixed: "fixed Slow RMS detector",
      };
      return {
        label: interpreted
          ? `${interpreted} · ${contextLabels[tableKey]}`
          : ledPosition,
        interpretation: interpreted || "",
        contextLabel: contextLabels[tableKey],
      };
    }

    if (parameter.interpretation === "approximate-ratio") {
      return {
        label: `${value}:1 (approx.)`,
        interpretation: `${value}:1`,
        contextLabel: "Ratio display reuses the GR scale",
      };
    }

    if (parameter.interpretation === "lookahead-relative") {
      const relative = value === "0.5" ? "Off" : value === "10" ? "Most lookahead example" : "Relative lookahead amount";
      return {
        label: `${relative} · ${ledPosition}`,
        interpretation: relative,
        contextLabel: "Analogue lookahead",
      };
    }

    if (parameter.interpretation === "cumulative-relative") {
      return {
        label: `${position + 1} LEDs lit`,
        interpretation: "Relative amount",
        contextLabel: "More LEDs increases the amount",
      };
    }

    return {
      label: `${ledPosition} · relative setting`,
      interpretation: "Relative setting",
      contextLabel: "Printed GR numbers identify LED positions",
    };
  }

  function resolveParameterSelection(parameter, selection, context = {}) {
    if (!parameter) {
      throw new Error("Missing Enigma parameter definition.");
    }

    const normalized = normalizeSelection(selection);
    const behavior = parameter.behavior || "legacy-rungs";
    const displayScale = getDisplayScale(parameter);

    if (behavior === "pattern-settings") {
      let settingId = normalized.settingId;
      if (!settingId && normalized.legacyValues) {
        let match = (parameter.settings || []).find(
          (candidate) =>
            candidate.ledPattern.length === normalized.legacyValues.length &&
            candidate.ledPattern.every(
              (v, i) => v === normalized.legacyValues[i]
            )
        );
        if (!match && normalized.legacyValues.length === 1) {
          match = (parameter.settings || []).find(
            (candidate) =>
              candidate.ledPattern[candidate.ledPattern.length - 1] ===
              normalized.legacyValues[0]
          );
        }
        if (match) {
          settingId = match.id;
        }
      }
      const setting = (parameter.settings || []).find(
        (candidate) => candidate.id === settingId
      );
      if (!setting) {
        throw new Error(
          `Unknown setting ID "${settingId}" for ${parameter.label}`
        );
      }
      return {
        parameterId: parameter.id,
        label: setting.label,
        meaning: setting.meaning || "",
        behavior,
        color: parameter.color,
        side: parameter.side,
        hardwareLabel: parameter.label,
        displayScale,
        activeLedValues: [...setting.ledPattern],
        selected: { settingId: setting.id },
        timingModel: setting.timingModel || "fixed",
      };
    }

    if (behavior === "stepped-scale") {
      let value =
        normalized.value !== undefined ? String(normalized.value) : undefined;
      if (
        value === undefined &&
        normalized.legacyValues &&
        normalized.legacyValues.length > 0
      ) {
        value = String(normalized.legacyValues[0]);
      }
      if (!displayScale.includes(value)) {
        throw new Error(
          `Invalid stepped value "${value}" for ${parameter.label}`
        );
      }
      const interpreted = interpretSteppedValue(
        parameter,
        value,
        displayScale,
        context
      );
      const activeLedValues =
        parameter.interpretation === "cumulative-relative"
          ? displayScale.slice(0, displayScale.indexOf(value) + 1)
          : [value];
      return {
        parameterId: parameter.id,
        label: interpreted.label,
        meaning: parameter.meaning || parameter.description || "",
        behavior,
        color: parameter.color,
        side: parameter.side,
        hardwareLabel: parameter.label,
        displayScale,
        activeLedValues,
        selected: { value },
        interpretation: interpreted.interpretation,
        contextLabel: interpreted.contextLabel,
        displayNote: parameter.displayNote || "",
      };
    }

    const legacyValues = normalized.legacyValues || [];
    return {
      parameterId: parameter.id,
      label: legacyValues.join(", "),
      meaning: parameter.description || "",
      behavior,
      color: parameter.color,
      side: parameter.side,
      hardwareLabel: parameter.label,
      displayScale,
      activeLedValues: legacyValues,
      selected: { legacyValues },
    };
  }

  function validateEvidence(parameter) {
    const evidence = parameter.evidence || [];
    if (!Array.isArray(evidence) || evidence.length === 0) {
      return [`${parameter.id} is missing evidence metadata.`];
    }
    return evidence.flatMap((entry, index) => {
      const errors = [];
      if (!entry.source)
        errors.push(`${parameter.id} evidence ${index} missing source.`);
      if (!entry.type)
        errors.push(`${parameter.id} evidence ${index} missing type.`);
      if (!entry.reference)
        errors.push(`${parameter.id} evidence ${index} missing reference.`);
      if (!entry.note)
        errors.push(`${parameter.id} evidence ${index} missing note.`);
      return errors;
    });
  }

  function validateEnigmaParameterMap(parameters) {
    const errors = [];
    const entries = Object.values(parameters || {});

    for (const parameter of entries) {
      if (!parameter.id) errors.push("Parameter missing id.");
      if (!parameter.label) errors.push(`${parameter.id} missing label.`);
      if (!parameter.side) errors.push(`${parameter.id} missing side.`);
      if (!parameter.color) errors.push(`${parameter.id} missing color.`);
      if (!parameter.behavior) errors.push(`${parameter.id} missing behavior.`);
      if (getDisplayScale(parameter).length === 0) {
        errors.push(`${parameter.id} missing display scale.`);
      }
      errors.push(...validateEvidence(parameter));

      if (parameter.behavior === "pattern-settings") {
        if (
          !Array.isArray(parameter.settings) ||
          parameter.settings.length === 0
        ) {
          errors.push(`${parameter.id} missing pattern settings.`);
        } else {
          for (const setting of parameter.settings) {
            if (!setting.id)
              errors.push(`${parameter.id} has setting without id.`);
            if (!setting.label)
              errors.push(`${parameter.id}.${setting.id} missing label.`);
            if (
              !Array.isArray(setting.ledPattern) ||
              setting.ledPattern.length === 0
            ) {
              errors.push(`${parameter.id}.${setting.id} missing LED pattern.`);
            }
          }
        }
      }
    }

    return { errors, parameterCount: entries.length };
  }

  function resolvePresetEnigmaSelections(preset) {
    const resolved = {};
    const detectorSelection =
      preset.parameters?.detector?.selection ||
      preset.parameters?.detector?.selected ||
      {};
    const context = { detectorSettingId: detectorSelection.settingId };
    for (const parameterId of preset.parameterOrder || []) {
      const parameter = preset.parameters[parameterId];
      const selected = parameter.selection || parameter.selected;
      resolved[parameterId] = resolveParameterSelection(
        parameter,
        selected,
        context
      );
    }
    return resolved;
  }

  const api = {
    resolveParameterSelection,
    resolvePresetEnigmaSelections,
    validateEnigmaParameterMap,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.BrickLaneResolver = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
