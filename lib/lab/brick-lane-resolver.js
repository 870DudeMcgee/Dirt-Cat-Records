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

  function resolveParameterSelection(parameter, selection) {
    if (!parameter) {
      throw new Error("Missing Enigma parameter definition.");
    }

    const normalized = normalizeSelection(selection);
    const behavior = parameter.behavior || "legacy-rungs";
    const displayScale = getDisplayScale(parameter);

    if (behavior === "pattern-settings") {
      const settingId = normalized.settingId;
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
      };
    }

    if (behavior === "stepped-scale") {
      const value = String(normalized.value);
      if (!displayScale.includes(value)) {
        throw new Error(
          `Invalid stepped value "${value}" for ${parameter.label}`
        );
      }
      return {
        parameterId: parameter.id,
        label: value,
        meaning: parameter.meaning || parameter.description || "",
        behavior,
        color: parameter.color,
        side: parameter.side,
        hardwareLabel: parameter.label,
        displayScale,
        activeLedValues: [value],
        selected: { value },
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
    for (const parameterId of preset.parameterOrder || []) {
      const parameter = preset.parameters[parameterId];
      const selected = parameter.selection || parameter.selected;
      resolved[parameterId] = resolveParameterSelection(parameter, selected);
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
