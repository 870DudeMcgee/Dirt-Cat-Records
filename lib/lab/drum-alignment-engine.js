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
    if (/^(kick|snare|overhead)[- ]/.test(normalized))
      return normalized.split(/[- ]/)[0];
    if (normalized === "rack-tom" || normalized === "floor-tom") return "tom";
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
      events: findEvents(envelope, sampleRate),
      sampleRate,
      confidence: event.confidence,
    };
  }

  function findEvents(envelope, sampleRate) {
    if (!envelope.length) return [];
    let maximum = 0;
    for (const value of envelope) maximum = Math.max(maximum, value);
    if (maximum < 0.00001) return [];
    const threshold = Math.max(0.00001, maximum * 0.24);
    // One acoustic hit can ring into several local peaks; keep a 15 ms refractory window.
    const spacing = Math.max(1, Math.round(sampleRate * 0.015));
    const events = [];
    for (let i = 1; i < envelope.length - 1; i += 1) {
      if (
        envelope[i] < threshold ||
        envelope[i] < envelope[i - 1] ||
        envelope[i] <= envelope[i + 1]
      )
        continue;
      const previous = events[events.length - 1];
      if (previous && i - previous.sample < spacing) {
        if (envelope[i] > previous.value)
          events[events.length - 1] = { sample: i, value: envelope[i] };
      } else events.push({ sample: i, value: envelope[i] });
    }
    return events;
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
    if (length < 4) {
      return {
        value: null,
        label: "Unverified",
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
    const value =
      denominator > 1e-12 ? roundTo(numerator / denominator, 3) : null;
    if (value === null)
      return {
        value: null,
        label: "Unverified",
        warning: "Flat or silent window.",
      };
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

  function pearson(left, right) {
    if (left.length < 4 || right.length !== left.length) return null;
    let la = 0,
      lb = 0;
    for (let i = 0; i < left.length; i += 1) {
      la += left[i];
      lb += right[i];
    }
    la /= left.length;
    lb /= left.length;
    let cross = 0,
      aa = 0,
      bb = 0;
    for (let i = 0; i < left.length; i += 1) {
      const x = left[i] - la,
        y = right[i] - lb;
      cross += x * y;
      aa += x * x;
      bb += y * y;
    }
    return aa > 1e-12 && bb > 1e-12
      ? roundTo(cross / Math.sqrt(aa * bb), 3)
      : null;
  }

  function measurePair(a, b, alignedA, alignedB, eventSeconds) {
    const rate = a.sampleRate;
    const windowSeconds = 0.012;
    const invalid = {
      envelope: null,
      signed: null,
      label: "Unverified",
      windowMs: 12,
    };
    if (
      !Number.isFinite(eventSeconds) ||
      rate !== b.sampleRate ||
      !Number.isFinite(alignedA.offsetSamples) ||
      !Number.isFinite(alignedB.offsetSamples)
    )
      return invalid;
    const envelopeA = getTrackEnvelope(a),
      envelopeB = getTrackEnvelope(b);
    const signedA = buildSignedSignalFromChannels(getChannels(a));
    const signedB = buildSignedSignalFromChannels(getChannels(b));
    const count = Math.max(4, Math.round(rate * windowSeconds));
    const start = Math.round((eventSeconds - 0.002) * rate);
    const ea = [],
      eb = [],
      sa = [],
      sb = [];
    for (let i = 0; i < count; i += 1) {
      const ai = start + i - alignedA.offsetSamples;
      const bi = start + i - alignedB.offsetSamples;
      if (ai < 0 || bi < 0 || ai >= envelopeA.length || bi >= envelopeB.length)
        continue;
      ea.push(envelopeA[ai]);
      eb.push(envelopeB[bi]);
      sa.push(signedA[ai]);
      sb.push(signedB[bi]);
    }
    const envelope = pearson(ea, eb);
    const signed = pearson(sa, sb);
    return {
      envelope,
      signed,
      windowMs: 12,
      label: signed === null ? "Unverified" : labelCorrelation(signed),
    };
  }

  function calculateAlignment({
    tracks = [],
    reference = null,
    sampleRate = 44100,
  } = {}) {
    const normalizedTracks = tracks.map(classifyTrack);
    const recommendedReference = recommendReference(normalizedTracks);
    const activeReference = reference?.trackIds?.length
      ? reference
      : recommendedReference;
    const referenceIds = activeReference.trackIds;
    const referenceTracks = normalizedTracks.filter((track) =>
      referenceIds.includes(track.id)
    );
    const rates = normalizedTracks.map(
      (track) => Number(track.sampleRate) || Number(sampleRate) || 44100
    );
    const commonRate = rates[0] || Number(sampleRate) || 44100;
    const rateMismatch = rates.some((rate) => rate !== commonRate);
    // ponytail: mixed-rate sessions stay unverified until the analysis uses time-domain resampling.
    const referenceEnvelope = rateMismatch
      ? new Float32Array(0)
      : buildEnergyEnvelopeFromChannels(
          referenceTracks.flatMap((track) => getChannels(track))
        );
    const referenceEvents = findEvents(referenceEnvelope, commonRate);
    const firstEvent = referenceEvents[0];
    const referenceEvent = {
      sample: firstEvent?.sample ?? null,
      ms: firstEvent
        ? roundTo((firstEvent.sample / commonRate) * 1000, 3)
        : null,
      source:
        activeReference.type === "overheads"
          ? "overhead-energy-envelope"
          : "selected-reference-energy-envelope",
      events: referenceEvents.map((event) => ({
        sample: event.sample,
        ms: roundTo((event.sample / commonRate) * 1000, 3),
      })),
      trackIds: referenceIds,
    };
    const alignedTracks = normalizedTracks.map((track, index) => {
      const rate = rates[index];
      const envelope = getTrackEnvelope(track);
      const events = findEvents(envelope, rate);
      const strongest = events.reduce(
        (best, event) => (!best || event.value > best.value ? event : best),
        null
      );
      const detectedTransientSample = strongest?.sample ?? null;
      const manualTransientSample = Number.isFinite(track.manualTransientSample)
        ? Math.floor(track.manualTransientSample)
        : null;
      const transientSample =
        manualTransientSample ??
        (Number.isFinite(track.transientSample)
          ? Math.floor(track.transientSample)
          : detectedTransientSample);
      const isReferenceTrack = referenceIds.includes(track.id);
      const stationary =
        isReferenceTrack ||
        (activeReference.type === "overheads" && track.family === "overhead");
      let matched = null,
        ambiguous = false;
      if (!stationary && !rateMismatch && Number.isFinite(transientSample)) {
        const explicitMarker =
          manualTransientSample !== null ||
          Number.isFinite(track.transientSample);
        if (!explicitMarker) {
          const plausibleReferences = new Set();
          for (const event of events) {
            for (const referenceHit of referenceEvents) {
              if (
                Math.abs(
                  event.sample / rate - referenceHit.sample / commonRate
                ) <= 0.03
              )
                plausibleReferences.add(referenceHit.sample);
            }
          }
          ambiguous = plausibleReferences.size > 1;
        }
        const time = transientSample / rate;
        const nearby = referenceEvents
          .map((event) => ({
            event,
            distance: Math.abs(event.sample / commonRate - time),
          }))
          .filter((candidate) => candidate.distance <= 0.03)
          .sort((a, b) => a.distance - b.distance);
        if (
          nearby.length > 1 &&
          Math.abs(nearby[0].distance - nearby[1].distance) < 0.001
        )
          ambiguous = true;
        if (!ambiguous) matched = nearby[0]?.event || null;
      }
      const offsetSamples = stationary
        ? 0
        : matched && !ambiguous
          ? Math.round(
              (matched.sample / commonRate - transientSample / rate) * rate
            )
          : null;
      return {
        id: track.id,
        fileName: track.fileName,
        family: track.family,
        role: track.role,
        sampleRate: rate,
        duration: Number(track.duration) || envelope.length / rate,
        transientSample,
        detectedTransientSample,
        manualTransientSample,
        referenceSample: matched?.sample ?? null,
        referenceMs: matched
          ? roundTo((matched.sample / commonRate) * 1000, 3)
          : null,
        offsetSamples,
        offsetMs:
          offsetSamples === null
            ? null
            : roundTo((offsetSamples / rate) * 1000, 3),
        confidence:
          offsetSamples === null
            ? "Unverified"
            : manualTransientSample === null
              ? "Auto"
              : "Manual",
        reason: rateMismatch
          ? "Mixed sample rates; alignment unverified."
          : transientSample === null
            ? "No usable transient detected."
            : ambiguous
              ? "Multiple plausible reference hits; choose a manual marker."
              : !stationary && !matched
                ? "No corresponding reference event within 30 ms."
                : "",
      };
    });
    const byId = new Map(alignedTracks.map((track) => [track.id, track]));
    const correlations = alignedTracks.map((track) => {
      const source = normalizedTracks.find(
        (candidate) => candidate.id === track.id
      );
      const role = track.role || "";
      let partner = normalizedTracks.find(
        (candidate) =>
          candidate.id !== track.id &&
          ((role === "kick-in" && candidate.role === "kick-out") ||
            (role === "kick-out" && candidate.role === "kick-in") ||
            (role === "snare-top" && candidate.role === "snare-bottom") ||
            (role === "snare-bottom" && candidate.role === "snare-top") ||
            (role === "overhead-left" && candidate.role === "overhead-right") ||
            (role === "overhead-right" && candidate.role === "overhead-left"))
      );
      if (!partner)
        partner =
          referenceTracks.find((candidate) => candidate.id !== track.id) ||
          null;
      const pairTrack = partner && byId.get(partner.id);
      const eventSeconds =
        track.referenceMs !== null
          ? track.referenceMs / 1000
          : track.transientSample !== null
            ? track.transientSample / track.sampleRate
            : null;
      const scores =
        partner && pairTrack
          ? measurePair(source, partner, track, pairTrack, eventSeconds)
          : { envelope: null, signed: null, label: "Unverified", windowMs: 12 };
      return {
        id: `${track.id}-pair`,
        trackId: track.id,
        trackIds: partner ? [track.id, partner.id] : [track.id],
        pairNames: partner
          ? [track.fileName, partner.fileName]
          : [track.fileName],
        family: track.family,
        eventMs: eventSeconds === null ? null : roundTo(eventSeconds * 1000, 3),
        ...scores,
        value: scores.signed,
        warning:
          track.reason ||
          (scores.signed === null || scores.envelope === null
            ? "Insufficient or flat pair window."
            : ""),
      };
    });
    const result = {
      tracks: alignedTracks,
      recommendedReference: activeReference,
      referenceEvent,
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
    const lines = [
      "Dirt Cat Drum Alignment Report",
      `Reference: ${result?.recommendedReference?.label || "No reference"}`,
      "Offsets (move negative earlier, positive later):",
    ];
    for (const track of result?.tracks || []) {
      const family = FAMILY_LABELS[track.family] || "Other";
      const offset = Number.isFinite(track.offsetSamples)
        ? `${formatSignedInteger(track.offsetSamples)} samples (${formatSignedMs(track.offsetMs)} ms)`
        : "unverified";
      lines.push(
        `- ${track.fileName} [${family}]: ${offset}; transient ${track.transientSample ?? "n/a"} samples${track.manualTransientSample !== null ? "; manual marker" : ""}${track.referenceMs !== null ? `; matched reference event ${track.referenceMs.toFixed(3)} ms` : ""}${track.reason ? `; ${track.reason}` : ""}`
      );
    }
    lines.push(
      "",
      "Correlation: timing envelope similarity and signed waveform correlation (not a phase angle)."
    );
    for (const score of result?.correlations || []) {
      const fmt = (value) => (value === null ? "unverified" : value.toFixed(3));
      lines.push(
        `- ${score.pairNames.join(" vs ")}; event ${score.eventMs === null ? "n/a" : score.eventMs.toFixed(3) + " ms"}, after shifts, 12 ms window: envelope ${fmt(score.envelope)}, signed ${fmt(score.signed)}; ${score.label}${score.warning ? "; " + score.warning : ""}`
      );
    }
    const text = lines.join("\n") + "\n";
    if (result && typeof result === "object") result.reportText = text;
    return text;
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
