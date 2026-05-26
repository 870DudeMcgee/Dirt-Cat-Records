(function initDrumAlignmentEngine(globalScope) {
  const DRUM_ALIGNMENT_ROLES = {
    KICK: "kick",
    SNARE: "snare",
    TOM: "tom",
    OVERHEAD: "overhead",
    ROOM: "room",
    OTHER: "other",
  };

  const FAMILY_LABELS = {
    kick: "Kick",
    snare: "Snare",
    tom: "Tom",
    overhead: "Overhead",
    room: "Room",
    other: "Other",
  };

  function normalizeFileName(fileName) {
    return String(fileName || "")
      .split(/[\\/]/)
      .pop()
      .replace(/\.[a-z0-9]+$/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function normalizeFamily(value) {
    const normalized = String(value || "").toLowerCase();
    if (
      ["kick", "snare", "tom", "overhead", "room", "other"].includes(normalized)
    ) {
      return normalized;
    }
    if (normalized === "toms") return "tom";
    if (normalized === "overheads" || normalized === "oh") return "overhead";
    if (normalized === "rooms") return "room";
    return "other";
  }

  function classifyTrackName(fileName) {
    const normalized = normalizeFileName(fileName);
    const padded = ` ${normalized} `;

    if (/\b(overheads?|oh|cymbals?)\b/.test(padded)) {
      return {
        family: DRUM_ALIGNMENT_ROLES.OVERHEAD,
        role: /\b(l|left)\b/.test(padded)
          ? "overhead-left"
          : /\b(r|right)\b/.test(padded)
            ? "overhead-right"
            : "overhead",
        label: "Overhead",
      };
    }

    if (/\b(kick|bd)\b/.test(padded)) {
      return {
        family: DRUM_ALIGNMENT_ROLES.KICK,
        role: /\b(in|inside)\b/.test(padded)
          ? "kick-in"
          : /\b(out|outside)\b/.test(padded)
            ? "kick-out"
            : /\b(sub|sample)\b/.test(padded)
              ? "kick-support"
              : "kick",
        label: "Kick",
      };
    }

    if (/\b(snare|sd)\b/.test(padded)) {
      return {
        family: DRUM_ALIGNMENT_ROLES.SNARE,
        role: /\b(top)\b/.test(padded)
          ? "snare-top"
          : /\b(bottom|bot|under)\b/.test(padded)
            ? "snare-bottom"
            : /\b(sample)\b/.test(padded)
              ? "snare-sample"
              : "snare",
        label: "Snare",
      };
    }

    if (/\b(toms?|rack tom|floor tom|floor)\b/.test(padded)) {
      return {
        family: DRUM_ALIGNMENT_ROLES.TOM,
        role: /\bfloor\b/.test(padded)
          ? "floor-tom"
          : /\brack\b/.test(padded)
            ? "rack-tom"
            : "tom",
        label: "Tom",
      };
    }

    if (/\b(rooms?|crush room|mono room)\b/.test(padded)) {
      return {
        family: DRUM_ALIGNMENT_ROLES.ROOM,
        role: /\bcrush\b/.test(padded) ? "crush-room" : "room",
        label: "Room",
      };
    }

    return {
      family: DRUM_ALIGNMENT_ROLES.OTHER,
      role: "other",
      label: "Other",
    };
  }

  function getTrackId(track, index) {
    return String(track?.id || track?.fileName || `track-${index + 1}`);
  }

  function classifyTrack(track, index) {
    const inferred = classifyTrackName(
      track?.fileName || track?.name || getTrackId(track, index)
    );
    const family = normalizeFamily(
      track?.family || track?.role || inferred.family
    );
    return {
      ...track,
      id: getTrackId(track, index),
      fileName: track?.fileName || track?.name || getTrackId(track, index),
      family,
      role: track?.role || inferred.role,
      roleLabel: FAMILY_LABELS[family] || inferred.label,
    };
  }

  function recommendReference(tracks) {
    const normalizedTracks = (tracks || []).map(classifyTrack);
    const overheads = normalizedTracks.filter(
      (track) => track.family === "overhead"
    );
    if (overheads.length > 0) {
      return {
        type: "overheads",
        trackIds: overheads.map((track) => track.id),
        label: `Overheads (${overheads.length} ${overheads.length === 1 ? "track" : "tracks"})`,
        reason: "Overheads are the default kit image reference when detected.",
      };
    }

    const rooms = normalizedTracks.filter((track) => track.family === "room");
    if (rooms.length > 0) {
      return {
        type: "rooms",
        trackIds: rooms.map((track) => track.id),
        label: `Rooms (${rooms.length} ${rooms.length === 1 ? "track" : "tracks"})`,
        reason:
          "No overheads were detected, so room mics are the closest ambient fallback.",
      };
    }

    const firstTrack = normalizedTracks[0];
    return {
      type: firstTrack ? "track" : "none",
      trackIds: firstTrack ? [firstTrack.id] : [],
      label: firstTrack ? firstTrack.fileName : "No reference",
      reason: firstTrack
        ? "No overheads were detected; choose a better reference if the session has one."
        : "No tracks were available for reference detection.",
    };
  }

  function isSampleArray(value) {
    return (
      value &&
      typeof value !== "string" &&
      typeof value.length === "number" &&
      (value.length === 0 || typeof value[0] === "number")
    );
  }

  function getChannels(input) {
    if (!input) return [];
    if (isSampleArray(input)) return [input];

    if (Array.isArray(input)) {
      if (input.length === 0) return [];
      if (typeof input[0] === "number") return [input];
      return input.filter(isSampleArray);
    }

    if (isSampleArray(input.channelData)) return [input.channelData];
    if (Array.isArray(input.channelData))
      return input.channelData.filter(isSampleArray);
    if (isSampleArray(input.channels)) return [input.channels];
    if (Array.isArray(input.channels))
      return input.channels.filter(isSampleArray);
    if (isSampleArray(input.samples)) return [input.samples];
    if (Array.isArray(input.samples))
      return input.samples.filter(isSampleArray);
    if (isSampleArray(input.data)) return [input.data];
    if (Array.isArray(input.data)) return input.data.filter(isSampleArray);

    if (typeof input.getChannelData === "function" && input.numberOfChannels) {
      const channels = [];
      for (
        let channelIndex = 0;
        channelIndex < input.numberOfChannels;
        channelIndex += 1
      ) {
        channels.push(input.getChannelData(channelIndex));
      }
      return channels;
    }

    return [];
  }

  function buildEnergyEnvelopeFromChannels(channels) {
    const validChannels = (channels || []).filter(isSampleArray);
    const length = validChannels.reduce(
      (max, channel) => Math.max(max, channel.length),
      0
    );
    const envelope = new Float32Array(length);

    for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
      let sumSquares = 0;
      let count = 0;
      for (const channel of validChannels) {
        if (sampleIndex >= channel.length) continue;
        const value = Number(channel[sampleIndex]);
        if (!Number.isFinite(value)) continue;
        sumSquares += value * value;
        count += 1;
      }
      envelope[sampleIndex] = count ? Math.sqrt(sumSquares / count) : 0;
    }

    return envelope;
  }

  function buildSignedSignalFromChannels(channels) {
    const validChannels = (channels || []).filter(isSampleArray);
    const length = validChannels.reduce(
      (max, channel) => Math.max(max, channel.length),
      0
    );
    const signal = new Float32Array(length);

    for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
      let sum = 0;
      let count = 0;
      for (const channel of validChannels) {
        if (sampleIndex >= channel.length) continue;
        const value = Number(channel[sampleIndex]);
        if (!Number.isFinite(value)) continue;
        sum += value;
        count += 1;
      }
      signal[sampleIndex] = count ? sum / count : 0;
    }

    return signal;
  }

  function getTrackEnvelope(track) {
    return buildEnergyEnvelopeFromChannels(getChannels(track));
  }

  function clampSample(value, min, max) {
    const numericValue = Math.floor(Number(value));
    if (!Number.isFinite(numericValue)) return min;
    return Math.min(max, Math.max(min, numericValue));
  }

  function roundTo(value, places) {
    const scale = 10 ** places;
    return Math.round((Number(value) + Number.EPSILON) * scale) / scale;
  }

  function detectTransient(channelData, options = {}) {
    const envelope = buildEnergyEnvelopeFromChannels(getChannels(channelData));
    if (envelope.length === 0) {
      return {
        sample: null,
        value: 0,
        threshold: 0,
        confidence: "Check by ear",
      };
    }

    const startSample = clampSample(
      options.startSample || 0,
      0,
      envelope.length - 1
    );
    const endSample = clampSample(
      options.endSample === undefined ? envelope.length : options.endSample,
      startSample + 1,
      envelope.length
    );
    const values = Array.from(envelope.slice(startSample, endSample));
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      values.length;
    const standardDeviation = Math.sqrt(variance);
    const threshold = Math.max(
      Number(options.minThreshold || 0.00001),
      Number(
        options.threshold ||
          mean + standardDeviation * Number(options.thresholdMultiplier || 3)
      )
    );
    const lookaheadSamples = Math.max(
      1,
      Math.floor(Number(options.lookaheadSamples || 64))
    );

    let fallbackSample = startSample;
    let fallbackValue = envelope[startSample];
    for (
      let sampleIndex = startSample;
      sampleIndex < endSample;
      sampleIndex += 1
    ) {
      if (envelope[sampleIndex] > fallbackValue) {
        fallbackSample = sampleIndex;
        fallbackValue = envelope[sampleIndex];
      }
      if (envelope[sampleIndex] < threshold) continue;

      let localPeakSample = sampleIndex;
      let localPeakValue = envelope[sampleIndex];
      const localEnd = Math.min(endSample, sampleIndex + lookaheadSamples);
      for (
        let peakIndex = sampleIndex + 1;
        peakIndex < localEnd;
        peakIndex += 1
      ) {
        if (envelope[peakIndex] > localPeakValue) {
          localPeakSample = peakIndex;
          localPeakValue = envelope[peakIndex];
        }
      }

      return {
        sample: localPeakSample,
        value: roundTo(localPeakValue, 6),
        threshold: roundTo(threshold, 6),
        confidence: "Strong",
      };
    }

    return {
      sample: fallbackSample,
      value: roundTo(fallbackValue, 6),
      threshold: roundTo(threshold, 6),
      confidence:
        fallbackValue > 0 ? "Check by ear" : "Likely polarity/phase issue",
    };
  }

  function buildOverheadEventReference(overheadTracks, options = {}) {
    const tracks = overheadTracks || [];
    const channels = tracks.flatMap((track) => getChannels(track));
    const envelope = buildEnergyEnvelopeFromChannels(channels);
    const event = detectTransient(envelope, options);
    const sampleRate =
      Number(options.sampleRate) ||
      Number(tracks.find((track) => track?.sampleRate)?.sampleRate) ||
      44100;

    return {
      sample: event.sample,
      ms:
        event.sample === null
          ? null
          : roundTo((event.sample / sampleRate) * 1000, 3),
      source: "overhead-energy-envelope",
      trackIds: tracks.map((track, index) => getTrackId(track, index)),
      envelope,
      sampleRate,
      confidence: event.confidence,
    };
  }

  function sliceWindow(values, startSample, windowSamples) {
    const start = clampSample(startSample || 0, 0, values.length);
    const end = clampSample(start + windowSamples, start, values.length);
    return Array.from(values.slice(start, end));
  }

  function labelCorrelation(value) {
    if (value >= 0.7) return "Strong";
    if (value >= 0.35) return "Usable";
    if (value >= -0.25) return "Check by ear";
    return "Likely polarity/phase issue";
  }

  function calculateCorrelation(a, b, options = {}) {
    const aEnvelope = buildSignedSignalFromChannels(getChannels(a));
    const bEnvelope = buildSignedSignalFromChannels(getChannels(b));
    const length = Math.min(aEnvelope.length, bEnvelope.length);
    if (length === 0) {
      return {
        value: 0,
        label: "Check by ear",
        warning: "Not enough audio data to estimate correlation.",
      };
    }

    const startSample = clampSample(options.startSample || 0, 0, length - 1);
    const windowSamples = Math.min(
      Math.max(1, Math.floor(Number(options.windowSamples || length))),
      length - startSample
    );
    const left = sliceWindow(aEnvelope, startSample, windowSamples);
    const right = sliceWindow(bEnvelope, startSample, windowSamples);
    const meanLeft = left.reduce((sum, value) => sum + value, 0) / left.length;
    const meanRight =
      right.reduce((sum, value) => sum + value, 0) / right.length;

    let numerator = 0;
    let leftSquares = 0;
    let rightSquares = 0;
    for (let index = 0; index < left.length; index += 1) {
      const leftValue = left[index] - meanLeft;
      const rightValue = right[index] - meanRight;
      numerator += leftValue * rightValue;
      leftSquares += leftValue * leftValue;
      rightSquares += rightValue * rightValue;
    }

    const denominator = Math.sqrt(leftSquares * rightSquares);
    const value = denominator ? roundTo(numerator / denominator, 3) : 0;
    const label = labelCorrelation(value);
    return {
      value,
      label,
      warning:
        label === "Likely polarity/phase issue"
          ? "Polarity or phase relationship may need a human check."
          : label === "Check by ear"
            ? "Correlation is ambiguous enough to verify by ear."
            : "",
    };
  }

  function shiftEnvelope(envelope, offsetSamples, length) {
    const shifted = new Float32Array(length);
    for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
      const sourceIndex = sampleIndex - offsetSamples;
      if (sourceIndex >= 0 && sourceIndex < envelope.length) {
        shifted[sampleIndex] = envelope[sourceIndex];
      }
    }
    return shifted;
  }

  function resolveReferenceEvent(
    tracks,
    recommendation,
    reference,
    sampleRate
  ) {
    if (reference && Number.isFinite(reference.sample)) {
      return {
        sample: Math.floor(reference.sample),
        ms: roundTo((Math.floor(reference.sample) / sampleRate) * 1000, 3),
        source: reference.source || "provided-reference",
        envelope: reference.envelope || new Float32Array(0),
      };
    }

    const referenceIds = reference?.trackIds || recommendation.trackIds;
    const referenceTracks = tracks.filter((track) =>
      referenceIds.includes(track.id)
    );
    if (referenceTracks.length > 0) {
      const overheadReference = buildOverheadEventReference(referenceTracks, {
        sampleRate,
      });
      return overheadReference;
    }

    return {
      sample: null,
      ms: null,
      source: "none",
      envelope: new Float32Array(0),
    };
  }

  function calculateAlignment({
    tracks = [],
    reference = null,
    sampleRate = 44100,
  } = {}) {
    const normalizedTracks = tracks.map(classifyTrack);
    const recommendedReference = recommendReference(normalizedTracks);
    const effectiveSampleRate =
      Number(sampleRate) ||
      Number(normalizedTracks.find((track) => track.sampleRate)?.sampleRate) ||
      44100;
    const referenceEvent = resolveReferenceEvent(
      normalizedTracks,
      recommendedReference,
      reference,
      effectiveSampleRate
    );
    const referenceIds = reference?.trackIds || recommendedReference.trackIds;

    const alignedTracks = normalizedTracks.map((track) => {
      const detectedTransient = detectTransient(track);
      const manualTransientSample = Number.isFinite(track.manualTransientSample)
        ? Math.floor(track.manualTransientSample)
        : null;
      const transientSample =
        manualTransientSample !== null
          ? manualTransientSample
          : Number.isFinite(track.transientSample)
            ? Math.floor(track.transientSample)
            : detectedTransient.sample;
      const isReferenceTrack =
        referenceIds.includes(track.id) || track.family === "overhead";
      const shouldCalculateOffset =
        !isReferenceTrack &&
        Number.isFinite(referenceEvent.sample) &&
        Number.isFinite(transientSample);
      const offsetSamples = shouldCalculateOffset
        ? referenceEvent.sample - transientSample
        : 0;
      const trackSampleRate = Number(track.sampleRate) || effectiveSampleRate;

      return {
        id: track.id,
        fileName: track.fileName,
        role: track.role,
        family: track.family,
        sampleRate: trackSampleRate,
        duration:
          Number(track.duration) ||
          getTrackEnvelope(track).length / trackSampleRate,
        transientSample,
        detectedTransientSample: detectedTransient.sample,
        manualTransientSample,
        offsetSamples,
        offsetMs: roundTo((offsetSamples / trackSampleRate) * 1000, 3),
        confidence: detectedTransient.confidence,
      };
    });

    const correlations = alignedTracks
      .filter(
        (track) =>
          !referenceIds.includes(track.id) &&
          track.family !== "overhead" &&
          Number.isFinite(track.transientSample) &&
          referenceEvent.envelope &&
          referenceEvent.envelope.length > 0
      )
      .map((track) => {
        const sourceTrack = normalizedTracks.find(
          (candidate) => candidate.id === track.id
        );
        const trackEnvelope = getTrackEnvelope(sourceTrack);
        const shifted = shiftEnvelope(
          trackEnvelope,
          track.offsetSamples,
          referenceEvent.envelope.length
        );
        const windowStart = Math.max(0, referenceEvent.sample - 256);
        const windowSamples = Math.min(
          1024,
          referenceEvent.envelope.length - windowStart
        );
        const correlation = calculateCorrelation(
          shifted,
          referenceEvent.envelope,
          {
            startSample: windowStart,
            windowSamples,
          }
        );
        return {
          id: `${track.id}-to-reference`,
          trackIds: [track.id, ...referenceIds],
          family: track.family,
          value: correlation.value,
          label: correlation.label,
          warning: correlation.warning,
        };
      });

    const result = {
      tracks: alignedTracks,
      recommendedReference,
      referenceEvent: {
        sample: referenceEvent.sample,
        ms: referenceEvent.ms,
        source: referenceEvent.source,
      },
      correlations,
      reportText: "",
    };
    result.reportText = createAlignmentReport(result);
    return result;
  }

  function formatSignedInteger(value) {
    return value > 0 ? `+${value}` : String(value);
  }

  function formatSignedMs(value) {
    return value > 0 ? `+${value.toFixed(3)}` : value.toFixed(3);
  }

  function createAlignmentReport(result) {
    const referenceLabel =
      result?.recommendedReference?.label || "No reference";
    const referenceSample = Number.isFinite(result?.referenceEvent?.sample)
      ? result.referenceEvent.sample
      : "n/a";
    const referenceMs = Number.isFinite(result?.referenceEvent?.ms)
      ? `${result.referenceEvent.ms.toFixed(3)} ms`
      : "n/a";
    const lines = [
      "Dirt Cat Drum Alignment Report",
      `Reference: ${referenceLabel}`,
      `Reference event: ${referenceSample} samples (${referenceMs})`,
      "",
      "Offsets:",
    ];

    for (const track of result?.tracks || []) {
      const family = FAMILY_LABELS[track.family] || "Other";
      const moveText =
        track.offsetSamples === 0
          ? "no move"
          : track.offsetSamples < 0
            ? "move earlier"
            : "move later";
      const manualText =
        Number.isFinite(track.manualTransientSample) &&
        track.manualTransientSample !== null
          ? "; manual marker"
          : "";
      lines.push(
        `- ${track.fileName} [${family}]: ${formatSignedInteger(track.offsetSamples)} samples (${formatSignedMs(track.offsetMs)} ms), ${moveText}; transient ${track.transientSample} samples${manualText}`
      );
    }

    lines.push("", "Correlation:");
    if (result?.correlations?.length) {
      for (const correlation of result.correlations) {
        const warning = correlation.warning ? `; ${correlation.warning}` : "";
        lines.push(
          `- ${correlation.trackIds.join(" vs ")}: ${correlation.label} (${correlation.value.toFixed(3)})${warning}`
        );
      }
    } else {
      lines.push("- No correlation estimate available; check by ear.");
    }

    const reportText = `${lines.join("\n")}\n`;
    if (result && typeof result === "object") {
      result.reportText = reportText;
    }
    return reportText;
  }

  const api = {
    DRUM_ALIGNMENT_ROLES,
    classifyTrackName,
    recommendReference,
    buildOverheadEventReference,
    detectTransient,
    calculateAlignment,
    calculateCorrelation,
    createAlignmentReport,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.DrumAlignmentEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
