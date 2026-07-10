(function initDrumWaveformRenderer(globalScope) {
  const DEFAULT_WIDTH = 720;
  const DEFAULT_LANE_HEIGHT = 78;
  const DEFAULT_LANE_GAP = 10;
  const DEFAULT_WINDOW_SECONDS = 1.5;
  const DEFAULT_SAMPLE_RATE = 44100;
  const CANVAS_ATTRIBUTE = "data-drum-waveform-canvas";

  const DEFAULT_COLORS = {
    background: "#101820",
    laneBackground: "#16232c",
    laneBorder: "#314653",
    grid: "rgba(233, 224, 205, 0.12)",
    zeroLine: "rgba(233, 224, 205, 0.2)",
    before: "rgba(206, 219, 218, 0.32)",
    after: "rgba(96, 218, 181, 0.88)",
    reference: "#f6c860",
    transient: "#7ec8ff",
    manual: "#ff9f69",
    text: "#f7efe0",
    mutedText: "rgba(247, 239, 224, 0.68)",
    badgeBackground: "rgba(246, 200, 96, 0.18)",
    badgeBorder: "rgba(246, 200, 96, 0.7)",
    badgeText: "#fff6dc",
    error: "#ff7a7a",
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function toFiniteNumber(value, fallback) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
  }

  function mergeOptions(options) {
    return {
      ...options,
      colors: { ...DEFAULT_COLORS, ...(options?.colors || {}) },
    };
  }

  function isCanvasLike(value) {
    return value && typeof value.getContext === "function";
  }

  function getDocument() {
    return globalScope && globalScope.document ? globalScope.document : null;
  }

  function resolveCanvas(containerOrCanvas, options) {
    if (isCanvasLike(containerOrCanvas)) {
      return { canvas: containerOrCanvas, container: null, created: false };
    }

    const documentRef = getDocument();
    if (
      !documentRef ||
      !containerOrCanvas ||
      typeof containerOrCanvas.appendChild !== "function"
    ) {
      return {
        canvas: null,
        container: containerOrCanvas || null,
        created: false,
      };
    }

    const selector = `canvas[${CANVAS_ATTRIBUTE}="true"]`;
    const existingCanvas =
      typeof containerOrCanvas.querySelector === "function"
        ? containerOrCanvas.querySelector(selector)
        : null;

    if (existingCanvas && isCanvasLike(existingCanvas)) {
      return {
        canvas: existingCanvas,
        container: containerOrCanvas,
        created: false,
      };
    }

    if (options.createCanvas === false) {
      return { canvas: null, container: containerOrCanvas, created: false };
    }

    const canvas = documentRef.createElement("canvas");
    canvas.setAttribute(CANVAS_ATTRIBUTE, "true");
    if (options.canvasClassName) {
      canvas.className = options.canvasClassName;
    }
    if (canvas.style) {
      canvas.style.display = "block";
      canvas.style.width = "100%";
      canvas.style.maxWidth = "100%";
    }
    containerOrCanvas.appendChild(canvas);

    return { canvas, container: containerOrCanvas, created: true };
  }

  function getTargetWidth(canvas, container, options) {
    if (Number.isFinite(options.width) && options.width > 0) {
      return Math.round(options.width);
    }
    const containerWidth = container?.clientWidth || 0;
    const canvasWidth = canvas?.clientWidth || 0;
    const attributeWidth = canvas?.width || 0;
    return Math.round(
      containerWidth || canvasWidth || attributeWidth || DEFAULT_WIDTH
    );
  }

  function setupCanvas(canvas, width, height, options) {
    const context =
      canvas && typeof canvas.getContext === "function"
        ? canvas.getContext("2d")
        : null;
    if (!context) {
      return { context: null, pixelRatio: 1 };
    }

    const pixelRatio = clamp(
      toFiniteNumber(options.pixelRatio, globalScope?.devicePixelRatio || 1),
      1,
      3
    );

    canvas.width = Math.max(1, Math.round(width * pixelRatio));
    canvas.height = Math.max(1, Math.round(height * pixelRatio));
    if (canvas.style) {
      canvas.style.width = Number.isFinite(options.width)
        ? `${width}px`
        : "100%";
      canvas.style.maxWidth = Number.isFinite(options.width) ? "none" : "100%";
      canvas.style.height = `${height}px`;
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    return { context, pixelRatio };
  }

  function normalizeState(state, options) {
    const source = state || {};
    const tracks = Array.isArray(source)
      ? source
      : Array.isArray(source.tracks)
        ? source.tracks
        : Array.isArray(source.lanes)
          ? source.lanes
          : [];

    const sampleRate = toFiniteNumber(
      source.sampleRate || options.sampleRate,
      DEFAULT_SAMPLE_RATE
    );
    const referenceEvent = normalizeReferenceEvent(
      source.referenceEvent || source.reference || options.referenceEvent,
      sampleRate
    );
    const correlations = Array.isArray(source.correlations)
      ? source.correlations
      : [];
    const lanes = tracks.map((track, index) =>
      normalizeTrack(track, index, sampleRate, referenceEvent, correlations)
    );
    const referenceLane =
      lanes.find(
        (lane) => lane.role === "overhead" || lane.family === "overhead"
      ) || lanes[0] || null;

    return {
      sampleRate,
      referenceEvent,
      lanes: lanes.map((lane) => ({
        ...lane,
        isReference: lane.id === referenceLane?.id,
        referenceSamples: referenceLane?.beforeSamples || null,
      })),
    };
  }

  function normalizeReferenceEvent(referenceEvent, sampleRate) {
    const source = referenceEvent || {};
    const sample =
      source.sample !== undefined
        ? toFiniteNumber(source.sample, null)
        : source.sampleIndex !== undefined
          ? toFiniteNumber(source.sampleIndex, null)
          : source.ms !== undefined
            ? Math.round((toFiniteNumber(source.ms, 0) / 1000) * sampleRate)
            : null;

    return {
      sample: Number.isFinite(sample) ? sample : null,
      ms:
        source.ms !== undefined
          ? toFiniteNumber(source.ms, null)
          : Number.isFinite(sample)
            ? (sample / sampleRate) * 1000
            : null,
      label: source.label || source.source || "Reference",
    };
  }

  function normalizeTrack(
    track,
    index,
    fallbackSampleRate,
    referenceEvent,
    correlations
  ) {
    const source = track || {};
    const sampleRate = toFiniteNumber(source.sampleRate, fallbackSampleRate);
    const channelData = getTrackSamples(source);
    const explicitAfterSamples =
      source.afterSamples ||
      source.alignedSamples ||
      source.shiftedSamples ||
      null;
    const beforeSamples =
      source.beforeSamples || source.originalSamples || channelData;
    const afterSamples = explicitAfterSamples || channelData;
    const offsetSamples = toFiniteNumber(source.offsetSamples, 0);
    const offsetMs =
      source.offsetMs !== undefined
        ? toFiniteNumber(source.offsetMs, (offsetSamples / sampleRate) * 1000)
        : (offsetSamples / sampleRate) * 1000;
    const manualTransientSample = sampleValue(source.manualTransientSample);
    const transientSample = sampleValue(
      source.transientSample ?? source.detectedTransientSample
    );
    const referenceSample = sampleValue(
      source.referenceSample ??
        source.referenceEventSample ??
        referenceEvent.sample
    );
    const errorMessage = getTrackError(source);
    const matchingCorrelation = findCorrelationForTrack(source, correlations);

    return {
      id: source.id || source.trackId || `track-${index + 1}`,
      index,
      fileName:
        source.fileName || source.name || source.label || `Track ${index + 1}`,
      role: source.role || source.family || "Track",
      family: source.family || source.role || "unknown",
      sampleRate,
      duration: toFiniteNumber(
        source.duration,
        getDuration(beforeSamples, sampleRate)
      ),
      beforeSamples,
      afterSamples,
      hasExplicitAfterSamples: Boolean(explicitAfterSamples),
      offsetSamples,
      offsetMs,
      referenceSample,
      transientSample,
      manualTransientSample,
      confidence: normalizeConfidence(
        source.confidence || source.correlation || matchingCorrelation
      ),
      errorMessage,
      isEmpty: !beforeSamples || beforeSamples.length === 0,
    };
  }

  function sampleValue(value) {
    if (value === null || value === undefined || value === "") return null;
    const numericValue = toFiniteNumber(value, null);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  function getDuration(samples, sampleRate) {
    if (!samples || !samples.length || !sampleRate) return 0;
    return samples.length / sampleRate;
  }

  function getTrackError(track) {
    const error = track.decodeError || track.error || track.errorMessage;
    if (typeof error === "string") return error;
    if (error && typeof error.message === "string") return error.message;
    if (track.status === "error") return "Audio could not be decoded.";
    return "";
  }

  function normalizeConfidence(confidence) {
    if (!confidence) return "";
    if (typeof confidence === "string") return confidence;
    if (confidence.label && Number.isFinite(confidence.value)) {
      const value = Number(confidence.value);
      return `${confidence.label} · ${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
    }
    if (confidence.label) return confidence.label;
    if (confidence.warning) return confidence.warning;
    if (Number.isFinite(confidence.value)) return confidence.value.toFixed(2);
    return "";
  }

  function findCorrelationForTrack(track, correlations) {
    if (!track || !track.id) return null;
    if (track.role === "overhead" || track.family === "overhead") return null;
    const directMatch = correlations.find((correlation) => {
      return Array.isArray(correlation?.trackIds)
        ? correlation.trackIds[0] === track.id
        : correlation?.trackId === track.id || correlation?.id === track.id;
    });
    if (directMatch) return directMatch;
    return correlations.find((correlation) => {
      if (!correlation) return false;
      if (Array.isArray(correlation.trackIds)) {
        return correlation.trackIds.includes(track.id);
      }
      return correlation.trackId === track.id || correlation.id === track.id;
    });
  }

  function getTrackSamples(track) {
    if (!track) return null;

    const candidates = [
      track.samples,
      track.channelData,
      track.waveform,
      track.peaks,
      track.data,
    ];

    for (const candidate of candidates) {
      const normalized = normalizeSamples(candidate);
      if (normalized) return normalized;
    }

    if (
      track.audioBuffer &&
      typeof track.audioBuffer.getChannelData === "function"
    ) {
      return mixAudioBufferForDisplay(track.audioBuffer);
    }

    if (Array.isArray(track.channels)) {
      return mixChannelsForDisplay(track.channels);
    }

    return null;
  }

  function normalizeSamples(candidate) {
    if (!candidate) return null;
    if (typeof candidate.length !== "number") return null;
    if (candidate.length === 0) return null;

    if (typeof candidate[0] === "number") {
      return candidate;
    }

    if (candidate[0] && typeof candidate[0].length === "number") {
      return mixChannelsForDisplay(candidate);
    }

    return null;
  }

  function mixAudioBufferForDisplay(audioBuffer) {
    const channelCount = toFiniteNumber(audioBuffer.numberOfChannels, 0);
    if (!channelCount) return null;
    const channels = [];
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      channels.push(audioBuffer.getChannelData(channelIndex));
    }
    return mixChannelsForDisplay(channels);
  }

  function mixChannelsForDisplay(channels) {
    const usableChannels = (channels || []).filter(
      (channel) =>
        channel && typeof channel.length === "number" && channel.length > 0
    );
    if (usableChannels.length === 0) return null;
    if (usableChannels.length === 1) return usableChannels[0];

    const length = usableChannels.reduce(
      (minimumLength, channel) => Math.min(minimumLength, channel.length),
      usableChannels[0].length
    );
    const mixed = new Float32Array(length);

    for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
      let strongest = 0;
      for (const channel of usableChannels) {
        const value = toFiniteNumber(channel[sampleIndex], 0);
        if (Math.abs(value) > Math.abs(strongest)) strongest = value;
      }
      mixed[sampleIndex] = strongest;
    }

    return mixed;
  }

  function createViewport(lane, options) {
    const samples = lane.beforeSamples || lane.afterSamples;
    const sampleRate = lane.sampleRate || DEFAULT_SAMPLE_RATE;
    const sampleLength = samples?.length || Math.max(1, Math.round(sampleRate));
    const requestedWindowSamples = toFiniteNumber(options.windowSamples, 0);
    const windowSeconds = toFiniteNumber(
      options.windowSeconds,
      DEFAULT_WINDOW_SECONDS
    );
    const windowSamples = clamp(
      Math.round(requestedWindowSamples || windowSeconds * sampleRate),
      1,
      sampleLength
    );
    const focusSample = sampleValue(
      options.focusSample ??
        lane.manualTransientSample ??
        lane.transientSample ??
        lane.referenceSample
    );
    const positionRatio = toFiniteNumber(options.positionRatio, null);
    const maxStart = Math.max(0, sampleLength - windowSamples);
    const startSample =
      options.startSample !== undefined
        ? toFiniteNumber(options.startSample, 0)
        : Number.isFinite(positionRatio)
          ? clamp(positionRatio, 0, 1) * maxStart
        : Number.isFinite(focusSample)
          ? focusSample - windowSamples * 0.08
          : 0;
    const clampedStart = clamp(
      Math.round(startSample),
      0,
      Math.max(0, sampleLength - 1)
    );
    const clampedEnd = clamp(
      clampedStart + windowSamples,
      clampedStart + 1,
      sampleLength
    );

    return { startSample: clampedStart, endSample: clampedEnd, sampleLength };
  }

  function renderDrumAlignmentWaveforms(
    containerOrCanvas,
    state,
    options = {}
  ) {
    const mergedOptions = mergeOptions(options);
    const normalized = normalizeState(state, mergedOptions);
    const { canvas, container, created } = resolveCanvas(
      containerOrCanvas,
      mergedOptions
    );

    if (!canvas) {
      return {
        rendered: false,
        reason: "No canvas or browser container is available.",
        lanes: normalized.lanes,
        canvas: null,
      };
    }

    const width = getTargetWidth(canvas, container, mergedOptions);
    const laneHeight = toFiniteNumber(
      mergedOptions.laneHeight,
      DEFAULT_LANE_HEIGHT
    );
    const laneGap = toFiniteNumber(mergedOptions.laneGap, DEFAULT_LANE_GAP);
    const padding = toFiniteNumber(mergedOptions.padding, 12);
    const laneCount = Math.max(1, normalized.lanes.length);
    const height = Math.round(
      toFiniteNumber(
        mergedOptions.height,
        padding * 2 + laneCount * laneHeight + (laneCount - 1) * laneGap
      )
    );
    const { context, pixelRatio } = setupCanvas(
      canvas,
      width,
      height,
      mergedOptions
    );

    if (!context) {
      return {
        rendered: false,
        reason: "The canvas does not expose a 2D rendering context.",
        lanes: normalized.lanes,
        canvas,
      };
    }

    drawCanvasBackground(context, width, height, mergedOptions.colors);

    const renderedLanes = normalized.lanes.length
      ? normalized.lanes.map((lane, index) => {
          const y = padding + index * (laneHeight + laneGap);
          return drawLane(
            context,
            lane,
            { x: padding, y, width: width - padding * 2, height: laneHeight },
            mergedOptions
          );
        })
      : [
          drawEmptyState(
            context,
            {
              x: padding,
              y: padding,
              width: width - padding * 2,
              height: laneHeight,
            },
            mergedOptions
          ),
        ];

    return {
      rendered: true,
      canvas,
      created,
      width,
      height,
      pixelRatio,
      lanes: renderedLanes,
    };
  }

  function drawCanvasBackground(context, width, height, colors) {
    context.fillStyle = colors.background;
    context.fillRect(0, 0, width, height);
  }

  function drawEmptyState(context, rect, options) {
    drawLaneFrame(context, rect, options.colors);
    drawText(
      context,
      "Load drum tracks to draw waveform lanes.",
      rect.x + 14,
      rect.y + rect.height / 2 + 4,
      {
        color: options.colors.mutedText,
        font: "13px system-ui, sans-serif",
      }
    );
    return { id: "empty", label: "No tracks", rect, markers: {}, badge: null };
  }

  function drawLane(context, lane, rect, options) {
    const colors = options.colors;
    const contentRect = {
      x: rect.x + 12,
      y: rect.y + 32,
      width: rect.width - 24,
      height: rect.height - 64,
    };
    const viewport = createViewport(lane, options);
    const markerPositions = {};

    drawLaneFrame(context, rect, colors);
    drawLaneLabels(context, lane, rect, options);
    drawGrid(context, contentRect, colors, viewport, lane.sampleRate);

    if (lane.errorMessage) {
      drawLaneMessage(context, lane.errorMessage, contentRect, colors.error);
    } else if (lane.isEmpty) {
      drawLaneMessage(
        context,
        "No waveform data available.",
        contentRect,
        colors.mutedText
      );
    } else {
      const beforeCommands = createWaveformPath(
        lane.beforeSamples,
        contentRect,
        {
          ...viewport,
          normalize: options.normalize !== false,
          sampleShift: 0,
        }
      );
      const afterShift = lane.hasExplicitAfterSamples
        ? toFiniteNumber(options.afterSampleShift, 0)
        : lane.offsetSamples;
      const afterCommands = createWaveformPath(lane.afterSamples, contentRect, {
        ...viewport,
        normalize: options.normalize !== false,
        sampleShift: afterShift,
        comparisonSamples: lane.isReference ? null : lane.referenceSamples,
        comparisonShift: 0,
      });

      strokePathCommands(context, beforeCommands, colors.before, 1.5);
      if (!lane.isReference && lane.referenceSamples) {
        const referenceCommands = createWaveformPath(
          lane.referenceSamples,
          contentRect,
          {
            ...viewport,
            normalize: options.normalize !== false,
            sampleShift: 0,
          }
        );
        context.save();
        context.globalAlpha = 0.56;
        strokePathCommands(context, referenceCommands, colors.reference, 1.35);
        context.restore();
      }
      if (options.phaseColors && !lane.isReference && lane.referenceSamples) {
        strokePhasePathCommands(context, afterCommands, 2.35);
      } else if (options.rainbowAmplitude) {
        strokeRainbowPathCommands(context, afterCommands, 2.2);
      } else {
        strokePathCommands(context, afterCommands, colors.after, 2.4);
      }
    }

    if (Number.isFinite(lane.referenceSample)) {
      markerPositions.reference = drawMarker(
        context,
        lane.referenceSample,
        contentRect,
        viewport,
        {
          color: colors.reference,
          label: "Reference",
          labelOffsetY: 10,
        }
      );
    }

    if (Number.isFinite(lane.transientSample)) {
      markerPositions.detected = drawMarker(
        context,
        lane.transientSample,
        contentRect,
        viewport,
        {
          color: colors.transient,
          label: lane.manualTransientSample !== null ? "Detected" : "Transient",
          dashed: lane.manualTransientSample !== null,
          labelOffsetY: 22,
        }
      );
    }

    if (Number.isFinite(lane.manualTransientSample)) {
      markerPositions.manual = drawMarker(
        context,
        lane.manualTransientSample,
        contentRect,
        viewport,
        {
          color: colors.manual,
          label: "Manual",
          labelOffsetY: 34,
        }
      );
    }

    const badge = drawOffsetBadge(context, lane, rect, colors);

    return {
      id: lane.id,
      label: lane.fileName,
      role: lane.role,
      family: lane.family,
      rect,
      waveformRect: contentRect,
      viewport,
      markers: markerPositions,
      badge,
      error: lane.errorMessage || null,
    };
  }

  function drawLaneFrame(context, rect, colors) {
    context.fillStyle = colors.laneBackground;
    roundedRect(context, rect.x, rect.y, rect.width, rect.height, 7);
    context.fill();
    context.strokeStyle = colors.laneBorder;
    context.lineWidth = 1;
    context.stroke();
  }

  function drawLaneLabels(context, lane, rect, options) {
    const colors = options.colors;
    const roleLabel = lane.role ? `${lane.role}` : "Track";
    const fileLabel = lane.fileName || lane.id;
    const confidenceLabel = lane.confidence || "";

    drawText(
      context,
      truncateText(context, roleLabel, 110),
      rect.x + 12,
      rect.y + 18,
      {
        color: colors.text,
        font: "700 12px system-ui, sans-serif",
      }
    );
    drawText(
      context,
      truncateText(context, fileLabel, Math.max(80, rect.width * 0.45)),
      rect.x + 124,
      rect.y + 18,
      {
        color: colors.mutedText,
        font: "12px system-ui, sans-serif",
      }
    );
    if (confidenceLabel) {
      const maxWidth = Math.max(60, rect.width * 0.28);
      const text = truncateText(context, confidenceLabel, maxWidth);
      const textWidth = context.measureText(text).width;
      drawText(
        context,
        text,
        rect.x + rect.width - textWidth - 12,
        rect.y + 18,
        {
          color: colors.mutedText,
          font: "12px system-ui, sans-serif",
        }
      );
    }
  }

  function drawGrid(context, rect, colors, viewport, sampleRate) {
    const centerY = rect.y + rect.height / 2;
    context.strokeStyle = colors.zeroLine;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(rect.x, centerY);
    context.lineTo(rect.x + rect.width, centerY);
    context.stroke();

    context.strokeStyle = colors.grid;
    context.beginPath();
    for (let step = 1; step < 8; step += 1) {
      const x = rect.x + (rect.width * step) / 8;
      context.moveTo(x, rect.y);
      context.lineTo(x, rect.y + rect.height);
    }
    context.stroke();

    if (!viewport || !sampleRate) return;
    const visibleSamples = viewport.endSample - viewport.startSample;
    for (let step = 0; step <= 8; step += 2) {
      const x = rect.x + (rect.width * step) / 8;
      const sample = viewport.startSample + (visibleSamples * step) / 8;
      const milliseconds = (sample / sampleRate) * 1000;
      drawText(context, `${milliseconds.toFixed(1)} ms`, x + 4, rect.y + rect.height - 5, {
        color: colors.mutedText,
        font: "10px ui-monospace, SFMono-Regular, Menlo, monospace",
      });
    }
  }

  function drawLaneMessage(context, message, rect, color) {
    drawText(
      context,
      truncateText(context, message, rect.width - 20),
      rect.x + 10,
      rect.y + rect.height / 2 + 4,
      {
        color,
        font: "12px system-ui, sans-serif",
      }
    );
  }

  function createWaveformPath(samples, rect, options = {}) {
    const commands = [];
    if (
      !samples ||
      !samples.length ||
      !rect ||
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return commands;
    }

    const startSample = clamp(
      Math.round(toFiniteNumber(options.startSample, 0)),
      0,
      samples.length - 1
    );
    const endSample = clamp(
      Math.round(toFiniteNumber(options.endSample, samples.length)),
      startSample + 1,
      samples.length
    );
    const visibleSamples = Math.max(1, endSample - startSample);
    const sampleShift = Math.round(toFiniteNumber(options.sampleShift, 0));
    const columnCount = Math.max(1, Math.round(rect.width));
    const peak =
      options.normalize === false
        ? 1
        : getPeak(samples, startSample, endSample, sampleShift);
    const comparisonSamples = options.comparisonSamples;
    const comparisonShift = Math.round(
      toFiniteNumber(options.comparisonShift, 0)
    );
    const comparisonPeak =
      comparisonSamples && comparisonSamples.length
        ? options.normalize === false
          ? 1
          : getPeak(
              comparisonSamples,
              startSample,
              endSample,
              comparisonShift
            )
        : 1;
    const centerY = rect.y + rect.height / 2;
    const amplitudeScale = (rect.height / 2) * 0.92;

    for (let column = 0; column < columnCount; column += 1) {
      const displayStart =
        startSample + (column / columnCount) * visibleSamples;
      const displayEnd =
        startSample + ((column + 1) / columnCount) * visibleSamples;
      const sourceStart = clamp(
        Math.floor(displayStart - sampleShift),
        0,
        samples.length - 1
      );
      const sourceEnd = clamp(
        Math.ceil(displayEnd - sampleShift),
        sourceStart + 1,
        samples.length
      );
      let minValue = 0;
      let maxValue = 0;
      let phaseProduct = 0;
      let phaseLeftSquares = 0;
      let phaseRightSquares = 0;

      for (
        let sampleIndex = sourceStart;
        sampleIndex < sourceEnd;
        sampleIndex += 1
      ) {
        const value = clamp(
          toFiniteNumber(samples[sampleIndex], 0) / peak,
          -1,
          1
        );
        if (value < minValue) minValue = value;
        if (value > maxValue) maxValue = value;
      }

      if (comparisonSamples && comparisonSamples.length) {
        const phaseStart = Math.floor(displayStart);
        const phaseEnd = Math.max(phaseStart + 1, Math.ceil(displayEnd));
        for (
          let displaySample = phaseStart;
          displaySample < phaseEnd;
          displaySample += 1
        ) {
          const sourceIndex = displaySample - sampleShift;
          const comparisonIndex = displaySample - comparisonShift;
          if (
            sourceIndex < 0 ||
            sourceIndex >= samples.length ||
            comparisonIndex < 0 ||
            comparisonIndex >= comparisonSamples.length
          ) {
            continue;
          }
          const left = toFiniteNumber(samples[sourceIndex], 0) / peak;
          const right =
            toFiniteNumber(comparisonSamples[comparisonIndex], 0) /
            comparisonPeak;
          phaseProduct += left * right;
          phaseLeftSquares += left * left;
          phaseRightSquares += right * right;
        }
      }

      const x = rect.x + column + 0.5;
      const yMin = centerY - maxValue * amplitudeScale;
      const yMax = centerY - minValue * amplitudeScale;
      const intensity = Math.max(Math.abs(minValue), Math.abs(maxValue));
      const phaseDenominator = Math.sqrt(
        phaseLeftSquares * phaseRightSquares
      );
      const phase = phaseDenominator
        ? clamp(phaseProduct / phaseDenominator, -1, 1)
        : 0;
      commands.push({ type: "moveTo", x, y: yMin, intensity, phase });
      commands.push({ type: "lineTo", x, y: yMax, intensity, phase });
    }

    return commands;
  }

  function getPeak(samples, startSample, endSample, sampleShift) {
    let peak = 0;
    const shiftedStart = clamp(
      startSample - sampleShift,
      0,
      samples.length - 1
    );
    const shiftedEnd = clamp(
      endSample - sampleShift,
      shiftedStart + 1,
      samples.length
    );
    for (
      let sampleIndex = shiftedStart;
      sampleIndex < shiftedEnd;
      sampleIndex += 1
    ) {
      peak = Math.max(peak, Math.abs(toFiniteNumber(samples[sampleIndex], 0)));
    }
    return peak || 1;
  }

  function strokePathCommands(context, commands, color, lineWidth) {
    if (!commands.length) return;
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.beginPath();
    for (const command of commands) {
      if (command.type === "moveTo") {
        context.moveTo(command.x, command.y);
      } else if (command.type === "lineTo") {
        context.lineTo(command.x, command.y);
      }
    }
    context.stroke();
  }

  function strokeRainbowPathCommands(context, commands, lineWidth) {
    if (!commands.length) return;
    const bucketCount = 20;
    const buckets = Array.from({ length: bucketCount }, () => []);

    for (let index = 0; index < commands.length - 1; index += 2) {
      const move = commands[index];
      const line = commands[index + 1];
      const intensity = clamp(
        Math.max(
          toFiniteNumber(move?.intensity, 0),
          toFiniteNumber(line?.intensity, 0)
        ),
        0,
        1
      );
      const bucketIndex = Math.min(
        bucketCount - 1,
        Math.floor(intensity * bucketCount)
      );
      buckets[bucketIndex].push(move, line);
    }

    context.save();
    buckets.forEach((bucket, bucketIndex) => {
      if (!bucket.length) return;
      const intensity = (bucketIndex + 0.5) / bucketCount;
      const hue = Math.round(270 * (1 - intensity));
      const lightness = Math.round(55 + intensity * 18);
      context.strokeStyle = `hsl(${hue} 92% ${lightness}%)`;
      context.lineWidth = lineWidth + intensity * 1.3;
      context.shadowColor = `hsla(${hue} 96% 68% / ${0.2 + intensity * 0.58})`;
      context.shadowBlur = intensity > 0.7 ? 8 + intensity * 8 : 2;
      context.beginPath();
      bucket.forEach((command) => {
        if (command.type === "moveTo") {
          context.moveTo(command.x, command.y);
        } else if (command.type === "lineTo") {
          context.lineTo(command.x, command.y);
        }
      });
      context.stroke();
    });
    context.restore();
  }

  function strokePhasePathCommands(context, commands, lineWidth) {
    if (!commands.length) return;
    const phaseBucketCount = 24;
    const buckets = Array.from(
      { length: phaseBucketCount + 1 },
      () => []
    );

    for (let index = 0; index < commands.length - 1; index += 2) {
      const move = commands[index];
      const line = commands[index + 1];
      const intensity = clamp(
        Math.max(
          toFiniteNumber(move?.intensity, 0),
          toFiniteNumber(line?.intensity, 0)
        ),
        0,
        1
      );
      const phase = clamp(
        (toFiniteNumber(move?.phase, 0) + toFiniteNumber(line?.phase, 0)) / 2,
        -1,
        1
      );
      const bucketIndex =
        intensity < 0.015
          ? 0
          : 1 +
            Math.min(
              phaseBucketCount - 1,
              Math.floor(((phase + 1) / 2) * phaseBucketCount)
            );
      buckets[bucketIndex].push(move, line);
    }

    context.save();
    buckets.forEach((bucket, bucketIndex) => {
      if (!bucket.length) return;
      if (bucketIndex === 0) {
        context.strokeStyle = "rgba(114, 92, 255, 0.52)";
        context.shadowColor = "rgba(114, 92, 255, 0.28)";
        context.shadowBlur = 2;
        context.lineWidth = lineWidth;
      } else {
        const normalized = (bucketIndex - 0.5) / phaseBucketCount;
        const phase = normalized * 2 - 1;
        const hue = Math.round(60 + phase * 60);
        context.strokeStyle = `hsl(${hue} 100% 58%)`;
        context.shadowColor = `hsl(${hue} 100% 52%)`;
        context.shadowBlur = 10 + Math.abs(phase) * 6;
        context.lineWidth = lineWidth + Math.abs(phase) * 1.25;
      }
      context.beginPath();
      bucket.forEach((command) => {
        if (command.type === "moveTo") {
          context.moveTo(command.x, command.y);
        } else if (command.type === "lineTo") {
          context.lineTo(command.x, command.y);
        }
      });
      context.stroke();
    });
    context.restore();
  }

  function drawMarker(context, sample, rect, viewport, options) {
    const x = sampleToX(sample, rect, viewport);
    if (x < rect.x || x > rect.x + rect.width) {
      return { sample, x, visible: false, label: options.label };
    }

    context.save();
    if (options.dashed) context.setLineDash([4, 4]);
    context.strokeStyle = options.color;
    context.lineWidth = options.label === "Transient" || options.label === "Detected" ? 3 : 2;
    context.shadowColor = options.color;
    context.shadowBlur = options.label === "Transient" || options.label === "Detected" ? 10 : 4;
    context.beginPath();
    context.moveTo(x, rect.y - 2);
    context.lineTo(x, rect.y + rect.height + 2);
    context.stroke();
    context.shadowBlur = 0;
    context.fillStyle = options.color;
    context.beginPath();
    context.arc(x, rect.y + 2, options.label === "Transient" || options.label === "Detected" ? 4 : 3, 0, Math.PI * 2);
    context.fill();
    context.restore();

    drawText(
      context,
      options.label,
      x + 5,
      rect.y + toFiniteNumber(options.labelOffsetY, 10),
      {
      color: options.color,
      font: "10px system-ui, sans-serif",
      }
    );

    return { sample, x, visible: true, label: options.label };
  }

  function sampleToX(sample, rect, viewport) {
    const visibleSamples = Math.max(
      1,
      viewport.endSample - viewport.startSample
    );
    return (
      rect.x + ((sample - viewport.startSample) / visibleSamples) * rect.width
    );
  }

  function drawOffsetBadge(context, lane, rect, colors) {
    const label = formatOffset(lane.offsetSamples, lane.offsetMs);
    const textWidth = context.measureText(label).width;
    const width = clamp(textWidth + 20, 86, Math.max(86, rect.width - 24));
    const height = 20;
    const x = rect.x + rect.width - width - 12;
    const y = rect.y + rect.height - height - 8;

    context.fillStyle = colors.badgeBackground;
    roundedRect(context, x, y, width, height, 6);
    context.fill();
    context.strokeStyle = colors.badgeBorder;
    context.lineWidth = 1;
    context.stroke();
    drawText(
      context,
      truncateText(context, label, width - 12),
      x + 10,
      y + 14,
      {
        color: colors.badgeText,
        font: "700 11px system-ui, sans-serif",
      }
    );

    return { x, y, width, height, label };
  }

  function formatOffset(offsetSamples, offsetMs) {
    const sampleSign = offsetSamples > 0 ? "+" : "";
    const msSign = offsetMs > 0 ? "+" : "";
    return `${msSign}${offsetMs.toFixed(2)} ms / ${sampleSign}${Math.round(offsetSamples)} smp`;
  }

  function drawText(context, text, x, y, options) {
    context.fillStyle = options.color;
    context.font = options.font;
    context.textBaseline = "alphabetic";
    context.fillText(text, x, y);
  }

  function truncateText(context, text, maxWidth) {
    const value = String(text || "");
    if (!maxWidth || context.measureText(value).width <= maxWidth) return value;
    let truncated = value;
    while (
      truncated.length > 1 &&
      context.measureText(`${truncated}...`).width > maxWidth
    ) {
      truncated = truncated.slice(0, -1);
    }
    return `${truncated}...`;
  }

  function roundedRect(context, x, y, width, height, radius) {
    const safeRadius = clamp(radius, 0, Math.min(width, height) / 2);
    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.lineTo(x + width - safeRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    context.lineTo(x + width, y + height - safeRadius);
    context.quadraticCurveTo(
      x + width,
      y + height,
      x + width - safeRadius,
      y + height
    );
    context.lineTo(x + safeRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    context.lineTo(x, y + safeRadius);
    context.quadraticCurveTo(x, y, x + safeRadius, y);
    context.closePath();
  }

  function clearDrumAlignmentWaveforms(containerOrCanvas, options = {}) {
    const mergedOptions = mergeOptions(options);
    const { canvas, container } = resolveCanvas(containerOrCanvas, {
      ...mergedOptions,
      createCanvas: false,
    });

    if (
      container &&
      options.removeCanvas &&
      typeof container.querySelectorAll === "function"
    ) {
      const canvases = container.querySelectorAll(
        `canvas[${CANVAS_ATTRIBUTE}="true"]`
      );
      canvases.forEach((ownedCanvas) => ownedCanvas.remove());
      return { cleared: true, removed: canvases.length };
    }

    if (!canvas) {
      return {
        cleared: false,
        reason: "No canvas or browser container is available.",
      };
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return {
        cleared: false,
        reason: "The canvas does not expose a 2D rendering context.",
      };
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    return { cleared: true, canvas };
  }

  const api = {
    renderDrumAlignmentWaveforms,
    clearDrumAlignmentWaveforms,
    createWaveformPath,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;

  globalScope.DrumWaveformRenderer = api;
  globalScope.renderDrumAlignmentWaveforms = renderDrumAlignmentWaveforms;
  globalScope.clearDrumAlignmentWaveforms = clearDrumAlignmentWaveforms;
  globalScope.createWaveformPath = createWaveformPath;
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
      ? window
      : {}
);
