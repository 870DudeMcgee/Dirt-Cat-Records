(function initDrumAlignmentWorkbench(globalScope) {
  const engine = globalScope.DrumAlignmentEngine || null;
  const waveformRenderer = globalScope.DrumWaveformRenderer || null;

  const ROLE_OPTIONS = [
    { value: "overhead", label: "Overhead" },
    { value: "kick", label: "Kick" },
    { value: "snare", label: "Snare" },
    { value: "tom", label: "Tom" },
    { value: "room", label: "Room" },
    { value: "hat", label: "Hi-hat" },
    { value: "ride", label: "Ride" },
    { value: "percussion", label: "Percussion" },
    { value: "unknown", label: "Unknown" },
  ];

  const state = {
    audioContext: null,
    tracks: [],
    referenceValue: "auto",
    recommendation: null,
    result: null,
    lastReportText: "",
    booted: false,
    demoRun: 0,
    demoRunning: false,
    waveformWindowSeconds: 0.75,
    waveformPositionRatio: null,
    waveformFitFullTrack: false,
    waveformRenderFrame: null,
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDuration(seconds) {
    const value = Number(seconds);
    if (!Number.isFinite(value)) return "--";
    return `${value.toFixed(2)}s`;
  }

  function formatOffset(track) {
    if (!track) return "Pending";
    const offsetSamples = Number(track.offsetSamples || 0);
    const offsetMs = Number(track.offsetMs || 0);
    if (!Number.isFinite(offsetSamples) || !Number.isFinite(offsetMs)) {
      return "Pending";
    }
    return `${offsetSamples >= 0 ? "+" : ""}${offsetSamples} samples / ${offsetMs >= 0 ? "+" : ""}${offsetMs.toFixed(2)} ms`;
  }

  function getFamilyForRole(role) {
    if (["overhead", "kick", "snare", "tom", "room"].includes(role)) {
      return role;
    }
    return "other";
  }

  function normalizeRoleForWorkbench(role, family) {
    const roleValues = ROLE_OPTIONS.map((option) => option.value);
    if (roleValues.includes(role)) return role;
    if (roleValues.includes(family)) return family;
    return "unknown";
  }

  function inferRoleLocally(fileName) {
    const name = String(fileName || "").toLowerCase();
    if (/\b(oh|overhead|cymbal)s?\b/.test(name)) return "overhead";
    if (/\bkick|bd\b|bass drum/.test(name)) return "kick";
    if (/\bsnare|sn\b/.test(name)) return "snare";
    if (/\btom|rack|floor/.test(name)) return "tom";
    if (/\broom|crush|ambience|ambient/.test(name)) return "room";
    if (/\bhat|hihat|hi-hat/.test(name)) return "hat";
    if (/\bride\b/.test(name)) return "ride";
    if (/perc|shaker|tamb/.test(name)) return "percussion";
    return "unknown";
  }

  function normalizeClassification(fileName) {
    if (engine && typeof engine.classifyTrackName === "function") {
      try {
        const classification = engine.classifyTrackName(fileName);
        if (typeof classification === "string") {
          return {
            role: classification,
            family: getFamilyForRole(classification),
          };
        }
        if (classification && typeof classification === "object") {
          const family =
            classification.family || getFamilyForRole(classification.role);
          const role = normalizeRoleForWorkbench(classification.role, family);
          return {
            role,
            family: family === "other" ? getFamilyForRole(role) : family,
          };
        }
      } catch (_error) {
        // Fall through to local filename inference.
      }
    }

    const role = inferRoleLocally(fileName);
    return { role, family: getFamilyForRole(role) };
  }

  function getAudioContext() {
    if (state.audioContext) return state.audioContext;
    const AudioContextConstructor =
      globalScope.AudioContext || globalScope.webkitAudioContext;
    if (!AudioContextConstructor) {
      throw new Error("This browser does not support Web Audio decoding.");
    }
    state.audioContext = new AudioContextConstructor();
    return state.audioContext;
  }

  function getTrackChannelData(audioBuffer) {
    return Array.from({ length: audioBuffer.numberOfChannels }, (_, index) =>
      audioBuffer.getChannelData(index)
    );
  }

  function toEngineTrack(track) {
    return {
      id: track.id,
      fileName: track.fileName,
      role: track.role,
      family: track.family,
      sampleRate: track.sampleRate,
      duration: track.duration,
      channelData: track.channelData,
      channels: track.channelData,
      audioBuffer: track.audioBuffer,
      transientSample: track.transientSample,
      manualTransientSample: track.manualTransientSample,
    };
  }

  function getDecodedTrackResult(track, result) {
    return (result?.tracks || []).find(
      (candidate) => candidate.id === track.id
    );
  }

  function getRecommendedReference(tracks) {
    if (engine && typeof engine.recommendReference === "function") {
      try {
        const recommendation = engine.recommendReference(
          tracks.map(toEngineTrack)
        );
        if (recommendation) return recommendation;
      } catch (_error) {
        // Local fallback keeps the UI useful if the engine is missing or strict.
      }
    }

    const overheadTracks = tracks.filter((track) => track.role === "overhead");
    if (overheadTracks.length > 0) {
      return {
        type: "group",
        trackIds: overheadTracks.map((track) => track.id),
        label:
          overheadTracks.length === 1
            ? `Overhead: ${overheadTracks[0].fileName}`
            : `Overheads (${overheadTracks.length})`,
        reason: "Overheads usually hold the kit image and timing reference.",
      };
    }

    const firstTrack = tracks[0];
    return firstTrack
      ? {
          type: "track",
          trackIds: [firstTrack.id],
          label: firstTrack.fileName,
          reason:
            "No overheads detected, so the first loaded track is selected.",
        }
      : null;
  }

  function getReferenceFromValue(value) {
    if (value === "auto") {
      return state.recommendation || getRecommendedReference(state.tracks);
    }

    if (value.startsWith("group:")) {
      const family = value.slice("group:".length);
      const trackIds = state.tracks
        .filter((track) => track.role === family || track.family === family)
        .map((track) => track.id);
      return {
        type: "group",
        trackIds,
        label: `${family.charAt(0).toUpperCase()}${family.slice(1)} group`,
        reason: "Manual reference override.",
      };
    }

    if (value.startsWith("track:")) {
      const trackId = value.slice("track:".length);
      const track = state.tracks.find((candidate) => candidate.id === trackId);
      return track
        ? {
            type: "track",
            trackIds: [track.id],
            label: track.fileName,
            reason: "Manual reference override.",
          }
        : null;
    }

    return null;
  }

  function setStatus(nodes, message) {
    if (nodes.status) nodes.status.textContent = message;
  }

  function setDemoControls(nodes, isRunning) {
    [nodes.demoButton, nodes.demoButtonInline].forEach((button) => {
      if (!button) return;
      if (!button.dataset.defaultLabel) {
        button.dataset.defaultLabel = button.textContent.trim();
      }
      button.disabled = isRunning;
      button.textContent = isRunning
        ? "Running demo…"
        : button.dataset.defaultLabel;
    });
    nodes.root?.setAttribute("aria-busy", String(isRunning));
  }

  function revealDemo(nodes, target = nodes.root) {
    if (!target || typeof target.scrollIntoView !== "function") return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderReferenceSelector(nodes) {
    if (!nodes.referenceSelector) return;
    const previousValue = state.referenceValue;
    const hasOverheads = state.tracks.some(
      (track) => track.role === "overhead"
    );
    const hasRooms = state.tracks.some((track) => track.role === "room");
    const recommendation = state.recommendation;

    const options = [
      `<option value="auto">Recommended${recommendation?.label ? `: ${escapeHtml(recommendation.label)}` : ""}</option>`,
    ];

    if (hasOverheads) {
      options.push('<option value="group:overhead">Overhead group</option>');
    }
    if (hasRooms) {
      options.push('<option value="group:room">Room group</option>');
    }

    state.tracks.forEach((track) => {
      options.push(
        `<option value="track:${escapeHtml(track.id)}">${escapeHtml(track.fileName)}</option>`
      );
    });

    nodes.referenceSelector.innerHTML = options.join("");
    const validValues = Array.from(nodes.referenceSelector.options).map(
      (option) => option.value
    );
    state.referenceValue = validValues.includes(previousValue)
      ? previousValue
      : "auto";
    nodes.referenceSelector.value = state.referenceValue;
  }

  function renderTrackList(nodes) {
    if (!nodes.trackList) return;
    if (state.tracks.length === 0) {
      nodes.trackList.innerHTML =
        '<article class="drum-align-empty"><p>No drum audio files loaded yet.</p></article>';
      return;
    }

    nodes.trackList.innerHTML = state.tracks
      .map((track) => {
        const resultTrack = getDecodedTrackResult(track, state.result) || track;
        const manualValue =
          track.manualTransientSample === null ||
          track.manualTransientSample === undefined
            ? ""
            : track.manualTransientSample;
        const options = ROLE_OPTIONS.map(
          (option) =>
            `<option value="${option.value}" ${track.role === option.value ? "selected" : ""}>${option.label}</option>`
        ).join("");

        return `<article class="drum-align-track-card" data-drum-track-id="${escapeHtml(track.id)}">
          <span class="studio-workbench-label">${escapeHtml(track.fileName)}</span>
          <h4>${escapeHtml(track.role)} / ${escapeHtml(track.family)}</h4>
          <p>${escapeHtml(track.channelsLabel)} | ${track.sampleRate} Hz | ${formatDuration(track.duration)}</p>
          <label for="drum-role-${escapeHtml(track.id)}">Role</label>
          <select id="drum-role-${escapeHtml(track.id)}" data-drum-role>
            ${options}
          </select>
          <label for="drum-manual-${escapeHtml(track.id)}">Manual transient sample</label>
          <input id="drum-manual-${escapeHtml(track.id)}" data-drum-manual-transient type="number" min="0" step="1" inputmode="numeric" placeholder="Auto" value="${escapeHtml(manualValue)}" />
          <p>${escapeHtml(formatOffset(resultTrack))}</p>
        </article>`;
      })
      .join("");
  }

  function renderCorrelationPanel(nodes) {
    if (!nodes.correlationPanel) return;
    const correlations = state.result?.correlations || [];
    if (correlations.length === 0) {
      nodes.correlationPanel.innerHTML =
        '<p class="drum-align-phase-empty">Analyze to compare each close mic with the reference.</p>';
      if (nodes.phaseSummary) {
        nodes.phaseSummary.textContent = "Waiting for analysis";
      }
      return;
    }

    const validValues = correlations
      .map((correlation) => Number(correlation.value))
      .filter(Number.isFinite);
    const weakestValue = validValues.length ? Math.min(...validValues) : null;
    const weakestLabel =
      weakestValue >= 0.82
        ? "Strong"
        : weakestValue >= 0.55
          ? "Check"
          : "Needs attention";
    if (nodes.phaseSummary) {
      nodes.phaseSummary.textContent = Number.isFinite(weakestValue)
        ? `${weakestLabel} · weakest ${weakestValue >= 0 ? "+" : ""}${weakestValue.toFixed(2)}`
        : "Check by ear";
    }

    nodes.correlationPanel.innerHTML = correlations
      .map((correlation) => {
        const value = Number(correlation.value);
        const valueLabel = Number.isFinite(value)
          ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}`
          : "--";
        const meterFill = Number.isFinite(value)
          ? Math.max(0, Math.min(100, ((value + 1) / 2) * 100))
          : 50;
        const confidence =
          value >= 0.82 ? "strong" : value >= 0.55 ? "check" : "issue";
        const pairLabel = (correlation.trackIds || []).join(" vs ");
        return `<article class="drum-align-meter" data-confidence="${confidence}" title="${escapeHtml(pairLabel)}${correlation.warning ? ` · ${escapeHtml(correlation.warning)}` : ""}">
          <div class="drum-align-meter-label">
            <span>${escapeHtml(correlation.family || "Phase")}</span>
            <strong>${escapeHtml(correlation.label || "Check by ear")}</strong>
          </div>
          <output aria-label="Correlation ${escapeHtml(valueLabel)}">${escapeHtml(valueLabel)}</output>
          <div class="drum-align-meter-bar" role="meter" aria-valuemin="-1" aria-valuemax="1" aria-valuenow="${Number.isFinite(value) ? value : 0}" style="--phase-fill: ${meterFill.toFixed(1)}%"></div>
        </article>`;
      })
      .join("");
  }

  function createFallbackReport(result, reference) {
    const lines = [
      "Dirt Cat Records Drum Alignment Report",
      `Reference: ${reference?.label || "Not selected"}`,
      "",
    ];

    (result?.tracks || state.tracks).forEach((track) => {
      lines.push(
        `${track.fileName}: ${track.role || "unknown"} | ${formatOffset(track)}`
      );
    });

    return lines.join("\n");
  }

  function resolveReportText(result, reference) {
    if (result?.reportText) return result.reportText;
    if (engine && typeof engine.createAlignmentReport === "function") {
      try {
        return engine.createAlignmentReport(result);
      } catch (_error) {
        return createFallbackReport(result, reference);
      }
    }
    return createFallbackReport(result, reference);
  }

  function renderReport(nodes) {
    if (!nodes.reportPanel) return;
    if (!state.result) {
      nodes.reportPanel.innerHTML = `<div class="drum-align-report-empty">
        <strong>No report yet</strong>
        <span>Run analysis to generate a DAW-ready report.</span>
      </div>`;
      return;
    }

    const tracks = state.result.tracks || [];
    const correlations = state.result.correlations || [];
    const reference =
      state.result.recommendedReference ||
      getReferenceFromValue(state.referenceValue);
    const referenceEvent = state.result.referenceEvent || {};
    const formatSigned = (value, digits = 0) => {
      const numericValue = Number(value) || 0;
      return `${numericValue > 0 ? "+" : ""}${numericValue.toFixed(digits)}`;
    };
    const trackNames = new Map(
      tracks.map((track) => [track.id, track.fileName || track.id])
    );

    const offsetRows = tracks
      .map((track) => {
        const offsetSamples = Number(track.offsetSamples) || 0;
        const moveLabel =
          offsetSamples < 0
            ? "Move earlier"
            : offsetSamples > 0
              ? "Move later"
              : "Reference / no move";
        const moveTone =
          offsetSamples === 0 ? "reference" : offsetSamples < 0 ? "earlier" : "later";
        return `<article class="drum-report-track-row" data-move="${moveTone}">
          <div class="drum-report-track-name">
            <strong>${escapeHtml(track.fileName || track.id)}</strong>
            <span>${escapeHtml(track.role || track.family || "Unknown")} · transient ${escapeHtml(track.transientSample)} smp</span>
          </div>
          <span class="drum-report-move">${moveLabel}</span>
          <output>${formatSigned(offsetSamples)} <small>smp</small></output>
          <output>${formatSigned(track.offsetMs, 2)} <small>ms</small></output>
        </article>`;
      })
      .join("");

    const phaseRows = correlations.length
      ? correlations
          .map((correlation) => {
            const value = Number(correlation.value);
            const tone =
              value >= 0.7 ? "strong" : value >= 0.35 ? "usable" : value >= -0.25 ? "check" : "issue";
            const pair = (correlation.trackIds || [])
              .map((trackId) => trackNames.get(trackId) || trackId)
              .join(" ↔ ");
            return `<article class="drum-report-phase-row" data-tone="${tone}">
              <div>
                <strong>${escapeHtml(correlation.family || "Phase")}</strong>
                <span>${escapeHtml(pair)}</span>
              </div>
              <span class="drum-report-phase-badge">${escapeHtml(correlation.label || "Check by ear")}</span>
              <output>${Number.isFinite(value) && value >= 0 ? "+" : ""}${Number.isFinite(value) ? value.toFixed(3) : "--"}</output>
              ${correlation.warning ? `<p>${escapeHtml(correlation.warning)}</p>` : ""}
            </article>`;
          })
          .join("")
      : '<p class="drum-report-no-phase">No phase-confidence relationships were available for this session.</p>';

    nodes.reportPanel.innerHTML = `<div class="drum-report-summary">
      <article>
        <span>Reference</span>
        <strong>${escapeHtml(reference?.label || "Not selected")}</strong>
      </article>
      <article>
        <span>Reference event</span>
        <strong>${escapeHtml(referenceEvent.sample)} smp</strong>
        <small>${Number.isFinite(Number(referenceEvent.ms)) ? `${Number(referenceEvent.ms).toFixed(2)} ms` : "Time unavailable"}</small>
      </article>
      <article>
        <span>Session</span>
        <strong>${tracks.length} track${tracks.length === 1 ? "" : "s"}</strong>
        <small>${correlations.length} phase check${correlations.length === 1 ? "" : "s"}</small>
      </article>
    </div>
    <section class="drum-report-section">
      <header><h4>Track moves</h4><span>Apply these offsets from the original position</span></header>
      <div class="drum-report-track-list">${offsetRows}</div>
    </section>
    <section class="drum-report-section">
      <header><h4>Phase confidence</h4><span>Verify ambiguous relationships by ear</span></header>
      <div class="drum-report-phase-list">${phaseRows}</div>
    </section>`;
  }

  function syncWaveformControls(nodes) {
    if (!nodes.waveformWindow || !nodes.waveformPosition) return;
    const hasTracks = state.tracks.length > 0;
    const duration = hasTracks
      ? Math.max(...state.tracks.map((track) => Number(track.duration) || 0))
      : 0;
    nodes.waveformWindow.value = String(state.waveformWindowSeconds);
    nodes.waveformPosition.disabled =
      !hasTracks || state.waveformFitFullTrack;
    nodes.waveformFirstHit.disabled = !hasTracks;
    nodes.waveformFitTrack.disabled = !hasTracks;
    nodes.waveformFitTrack.classList.toggle(
      "is-active",
      hasTracks && state.waveformFitFullTrack
    );
    nodes.waveformPosition.value = String(
      Math.round((state.waveformPositionRatio || 0) * 1000)
    );

    if (!nodes.waveformPositionOutput) return;
    if (hasTracks && state.waveformFitFullTrack) {
      nodes.waveformPositionOutput.textContent = `Full track · ${duration.toFixed(2)}s`;
      return;
    }
    if (!hasTracks || state.waveformPositionRatio === null) {
      nodes.waveformPositionOutput.textContent = hasTracks
        ? "First hit · per track"
        : "Load tracks to navigate";
      return;
    }

    const maxStart = Math.max(0, duration - state.waveformWindowSeconds);
    const start = maxStart * state.waveformPositionRatio;
    const end = Math.min(duration, start + state.waveformWindowSeconds);
    nodes.waveformPositionOutput.textContent = `${start.toFixed(2)}s – ${end.toFixed(2)}s`;
  }

  function scheduleWaveformRender(nodes) {
    if (state.waveformRenderFrame !== null) return;
    const schedule = globalScope.requestAnimationFrame || globalScope.setTimeout;
    state.waveformRenderFrame = schedule.call(globalScope, () => {
      state.waveformRenderFrame = null;
      renderWaveforms(nodes);
    });
  }

  function renderWaveforms(nodes) {
    console.log("[drum-alignment] renderWaveforms starting, has waveformRenderer:", !!waveformRenderer, "tracks:", state.tracks.length);
    if (!nodes.waveformMount) {
      console.log("[drum-alignment] no waveformMount node");
      return;
    }
    nodes.waveformMount.innerHTML = "";

    // Skip waveform rendering if there are no tracks yet
    // (prevents hang during initialization)
    if (state.tracks.length === 0) {
      console.log("[drum-alignment] no tracks, rendering empty state");
      nodes.waveformMount.innerHTML =
        '<article class="drum-align-empty"><p>Waveforms appear after local files are decoded.</p></article>';
      return;
    }

    if (waveformRenderer) {
      console.log("[drum-alignment] waveformRenderer exists, has tracks:", state.tracks.length);
      // Skip rendering if testHarness is active to avoid rendering hangs in tests
      const shouldSkipRender = new URLSearchParams(location?.search || "").has("testHarness");
      if (shouldSkipRender) {
        console.log("[drum-alignment] in test mode, skipping waveform render");
        nodes.waveformMount.innerHTML =
          '<article class="drum-align-empty"><p>Waveform rendering skipped during test.</p></article>';
        return;
      }

      const tracks = state.tracks.map((track) => {
        const resultTrack = getDecodedTrackResult(track, state.result) || {};
        return {
          ...toEngineTrack(track),
          ...resultTrack,
          channelData: track.channelData,
          channels: track.channelData,
          audioBuffer: track.audioBuffer,
        };
      });
      const renderState = {
        tracks,
        sampleRate: state.tracks[0]?.sampleRate,
        referenceEvent: state.result?.referenceEvent,
        correlations: state.result?.correlations || [],
      };
      const isCompactViewport = Number(globalScope.innerWidth || 0) <= 760;
      const maximumDuration = Math.max(
        ...state.tracks.map((track) => Number(track.duration) || 0)
      );
      const renderWindowSeconds = state.waveformFitFullTrack
        ? maximumDuration
        : state.waveformWindowSeconds;
      const renderPositionRatio = state.waveformFitFullTrack
        ? 0
        : state.waveformPositionRatio;
      const renderWidth = state.waveformFitFullTrack
        ? Math.max(320, nodes.waveformMount.clientWidth)
        : isCompactViewport
          ? 1400
          : 2000;

      try {
        if (
          typeof waveformRenderer.renderDrumAlignmentWaveforms === "function"
        ) {
          const result = waveformRenderer.renderDrumAlignmentWaveforms(
            nodes.waveformMount,
            renderState,
            {
              width: renderWidth,
              windowSeconds: renderWindowSeconds,
              positionRatio: renderPositionRatio,
              laneHeight: isCompactViewport ? 144 : 184,
              laneGap: isCompactViewport ? 12 : 16,
              padding: 16,
              pixelRatio: 2,
              rainbowAmplitude: true,
              phaseColors: true,
            }
          );
          if (!result?.rendered) {
            nodes.waveformMount.innerHTML =
              '<article class="drum-align-empty"><p>The waveform preview could not be drawn here. Your alignment report is still ready below.</p></article>';
          }
          return;
        }
        if (typeof waveformRenderer.renderAlignmentWaveforms === "function") {
          console.log("[drum-alignment] calling renderAlignmentWaveforms");
          waveformRenderer.renderAlignmentWaveforms({
            mount: nodes.waveformMount,
            ...renderState,
            reference: getReferenceFromValue(state.referenceValue),
          });
          console.log("[drum-alignment] renderAlignmentWaveforms returned");
          return;
        }
        if (typeof waveformRenderer.renderWaveforms === "function") {
          console.log("[drum-alignment] calling renderWaveforms");
          waveformRenderer.renderWaveforms({
            mount: nodes.waveformMount,
            ...renderState,
            reference: getReferenceFromValue(state.referenceValue),
          });
          console.log("[drum-alignment] renderWaveforms returned");
          return;
        }
        if (typeof waveformRenderer.render === "function") {
          console.log("[drum-alignment] calling render on waveformRenderer");
          waveformRenderer.render({
            mount: nodes.waveformMount,
            ...renderState,
            reference: getReferenceFromValue(state.referenceValue),
          });
          console.log("[drum-alignment] render on waveformRenderer returned");
          return;
        }
        console.log("[drum-alignment] no matching renderer method found");
      } catch (_error) {
        console.log("[drum-alignment] renderWaveforms error:", _error.message);
        nodes.waveformMount.innerHTML =
          '<p class="studio-workbench-label">Waveform renderer could not draw this session.</p>';
        return;
      }
    }

    console.log("[drum-alignment] no waveformRenderer, fallback rendering");
    nodes.waveformMount.innerHTML = state.tracks
      .map((track) => {
        const resultTrack = getDecodedTrackResult(track, state.result) || track;
        return `<article class="drum-align-empty">
          <span class="studio-workbench-label">Waveform lane</span>
          <h3>${escapeHtml(track.fileName)}</h3>
          <p>Renderer pending. ${escapeHtml(formatOffset(resultTrack))}</p>
        </article>`;
      })
      .join("");
    console.log("[drum-alignment] renderWaveforms complete");
  }

  function render(nodes) {
    console.log("[drum-alignment] render starting");
    state.recommendation = getRecommendedReference(state.tracks);
    console.log("[drum-alignment] renderReferenceSelector");
    renderReferenceSelector(nodes);
    console.log("[drum-alignment] renderTrackList");
    renderTrackList(nodes);
    console.log("[drum-alignment] renderCorrelationPanel");
    renderCorrelationPanel(nodes);
    console.log("[drum-alignment] renderReport");
    renderReport(nodes);
    syncWaveformControls(nodes);
    console.log("[drum-alignment] renderWaveforms");
    renderWaveforms(nodes);
    console.log("[drum-alignment] render complete");
  }

  function createDemoSignal(
    length,
    events,
    shift = 0,
    amplitude = 1,
    profile = "overhead",
    channelPhase = 0
  ) {
    const signal = new Float32Array(length);
    const sampleRate = 48000;
    const decaySeconds =
      profile === "kick"
        ? 0.48
        : profile === "snare"
          ? 0.34
          : profile === "tom"
            ? 0.72
            : 0.9;
    const decaySamples = Math.round(decaySeconds * sampleRate);
    events.forEach((event, eventIndex) => {
      const center = event + shift;
      const tailLength = Math.min(
        length - center,
        Math.round(decaySamples * 2.6)
      );
      for (let offset = -48; offset < tailLength; offset += 1) {
        const index = center + offset;
        if (index < 0 || index >= length) continue;
        const attack = offset < 0 ? Math.exp(offset / 11) : 1;
        const time = Math.max(0, offset) / sampleRate;
        const transientClick = offset === 0 ? 3.8 : 0;
        const deterministicNoise =
          Math.sin(offset * 0.811 + eventIndex * 0.7 + channelPhase) * 0.56 +
          Math.sin(offset * 1.731 + eventIndex * 1.3 + channelPhase) * 0.31 +
          Math.sin(offset * 2.417 + channelPhase) * 0.13;
        let body = 0;

        if (profile === "kick") {
          const sweepPhase =
            Math.PI *
            2 *
            (52 * time + 58 * 0.045 * (1 - Math.exp(-time / 0.045)));
          body =
            Math.sin(sweepPhase + channelPhase) *
              1.45 *
              Math.exp(-time / 0.3) +
            deterministicNoise * 0.72 * Math.exp(-time / 0.012);
        } else if (profile === "snare") {
          body =
            deterministicNoise * 1.32 * Math.exp(-time / 0.105) +
            Math.sin(Math.PI * 2 * 188 * time + channelPhase) *
              0.5 *
              Math.exp(-time / 0.24) +
            Math.sin(Math.PI * 2 * 1120 * time) *
              0.22 *
              Math.exp(-time / 0.18);
        } else if (profile === "tom") {
          const sweepPhase =
            Math.PI *
            2 *
            (88 * time + 62 * 0.07 * (1 - Math.exp(-time / 0.07)));
          body =
            Math.sin(sweepPhase + channelPhase) *
              1.35 *
              Math.exp(-time / 0.52) +
            deterministicNoise * 0.32 * Math.exp(-time / 0.03);
        } else {
          const roomTime = Math.max(0, time - 0.018);
          body =
            deterministicNoise * 0.82 * Math.exp(-time / 0.32) +
            Math.sin(Math.PI * 2 * 104 * time + channelPhase) *
              0.54 *
              Math.exp(-time / 0.48) +
            Math.sin(Math.PI * 2 * 2380 * roomTime + channelPhase) *
              0.24 *
              Math.exp(-roomTime / 0.58);
        }

        const attackBurst =
          offset > 0
            ? deterministicNoise * 2.15 * Math.exp(-offset / 92)
            : 0;
        signal[index] +=
          amplitude * attack * (transientClick + attackBurst + body);
      }
    });
    return signal;
  }

  function createDemoTracks() {
    const length = 96000;
    const sampleRate = 48000;
    const events = [4800];
    return [
      {
        id: "demo-oh",
        fileName: "OH Stereo · kit image.wav",
        sampleRate,
        channelData: [
          createDemoSignal(length, events, 0, 0.82, "overhead", 0),
          createDemoSignal(length, events, 4, 0.72, "overhead", 0.17),
        ],
      },
      {
        id: "demo-kick",
        fileName: "Kick In · close mic.wav",
        sampleRate,
        channelData: createDemoSignal(length, events, 188, 0.92, "kick"),
      },
      {
        id: "demo-snare",
        fileName: "Snare Top · close mic.wav",
        sampleRate,
        channelData: createDemoSignal(length, events, 124, 0.76, "snare"),
      },
      {
        id: "demo-floor-tom",
        fileName: "Floor Tom · close mic.wav",
        sampleRate,
        channelData: createDemoSignal(length, events, 256, 0.7, "tom"),
      },
    ];
  }

  function delay(milliseconds) {
    return new Promise((resolve) => globalScope.setTimeout(resolve, milliseconds));
  }

  async function runDemo(nodes) {
    if (state.demoRunning) return;
    const demoRun = ++state.demoRun;
    state.demoRunning = true;
    setDemoControls(nodes, true);
    nodes.root.classList.add("is-demo-active");
    revealDemo(nodes);

    try {
      setStatus(nodes, "Demo 1/4 · Loading a sample drum session locally...");
      state.tracks = createDemoTracks().map(createHarnessTrack);
      state.result = null;
      state.lastReportText = "";
      state.referenceValue = "auto";
      state.waveformPositionRatio = null;
      state.waveformFitFullTrack = false;
      render(nodes);

      await delay(650);
      if (demoRun !== state.demoRun) return;
      setStatus(nodes, "Demo 2/4 · Overheads detected and selected as the kit image reference.");
      await delay(650);
      if (demoRun !== state.demoRun) return;
      setStatus(nodes, "Demo 3/4 · Detecting transients and comparing close mics...");
      await analyze(nodes);
      if (demoRun !== state.demoRun) return;
      setStatus(nodes, "Demo 4/4 · Done. Review the bright aligned waveforms, confidence checks, and DAW report.");
      revealDemo(nodes, nodes.waveformStage);
    } catch (error) {
      setStatus(nodes, `Demo could not finish: ${error.message || error}`);
    } finally {
      if (demoRun === state.demoRun) {
        state.demoRunning = false;
        setDemoControls(nodes, false);
      }
    }
  }

  async function decodeFile(file, index) {
    const audioContext = getAudioContext();
    const buffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(buffer.slice(0));
    const classification = normalizeClassification(file.name);
    const channelData = getTrackChannelData(audioBuffer);

    return {
      id: `drum-track-${Date.now()}-${index}`,
      fileName: file.name,
      file,
      audioBuffer,
      channelData,
      sampleRate: audioBuffer.sampleRate,
      duration: audioBuffer.duration,
      role: classification.role,
      family: classification.family,
      channelsLabel:
        audioBuffer.numberOfChannels === 1
          ? "mono"
          : `${audioBuffer.numberOfChannels} channels`,
      transientSample: null,
      manualTransientSample: null,
    };
  }

  async function handleFiles(files, nodes) {
    const audioFiles = Array.from(files || []).filter(isAudioFile);

    if (audioFiles.length === 0) {
      setStatus(nodes, "Choose local audio files to start alignment.");
      return;
    }

    setStatus(nodes, `Decoding ${audioFiles.length} local audio file(s)...`);
    const results = await Promise.allSettled(audioFiles.map(decodeFile));
    const decodedTracks = [];
    const failures = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        decodedTracks.push(result.value);
      } else {
        failures.push(
          `${audioFiles[index].name}: ${result.reason?.message || "decode failed"}`
        );
      }
    });

    state.tracks = decodedTracks;
    state.result = null;
    state.lastReportText = "";
    state.referenceValue = "auto";
    state.waveformPositionRatio = null;
    state.waveformFitFullTrack = false;
    render(nodes);

    if (decodedTracks.length === 0) {
      setStatus(nodes, `No files decoded. ${failures.join(" ")}`.trim());
      return;
    }

    const statusParts = [`Decoded ${decodedTracks.length} local file(s).`];
    if (failures.length > 0) {
      statusParts.push(`${failures.length} file(s) could not be decoded.`);
    }
    const recommendation = state.recommendation;
    if (recommendation?.label) {
      statusParts.push(`Recommended reference: ${recommendation.label}.`);
    }
    setStatus(nodes, statusParts.join(" "));
  }

  function isAudioFile(file) {
    if (String(file?.type || "").startsWith("audio/")) return true;
    return /\.(aif|aiff|flac|m4a|mp3|ogg|wav)$/i.test(file?.name || "");
  }

  function shouldInstallTestHarness() {
    try {
      return new URLSearchParams(globalScope.location?.search || "").has(
        "testHarness"
      );
    } catch (_error) {
      return false;
    }
  }

  function normalizeHarnessChannelData(input) {
    if (!input || typeof input.length !== "number") return [];
    if (input.length === 0) return [];
    if (typeof input[0] === "number") return [Float32Array.from(input)];
    return Array.from(input)
      .filter((channel) => channel && typeof channel.length === "number")
      .map((channel) => Float32Array.from(channel));
  }

  function createHarnessTrack(input, index) {
    const fileName = input.fileName || input.name || `Synthetic ${index + 1}.wav`;
    const classification = normalizeClassification(fileName);
    const channelData = normalizeHarnessChannelData(
      input.channelData || input.channels || input.samples || input.data
    );
    const sampleRate = Number(input.sampleRate) || 44100;
    const duration =
      Number(input.duration) || (channelData[0]?.length || 0) / sampleRate;
    return {
      id: input.id || `drum-harness-track-${index + 1}`,
      fileName,
      file: null,
      audioBuffer: null,
      channelData,
      sampleRate,
      duration,
      role: input.role || classification.role,
      family: input.family || classification.family,
      channelsLabel:
        channelData.length === 1 ? "mono" : `${channelData.length} channels`,
      transientSample: Number.isFinite(input.transientSample)
        ? Math.max(0, Math.round(input.transientSample))
        : null,
      manualTransientSample: Number.isFinite(input.manualTransientSample)
        ? Math.max(0, Math.round(input.manualTransientSample))
        : null,
    };
  }

  function installTestHarness(nodes) {
    console.log("[drum-alignment] installTestHarness called, testHarness param present:", shouldInstallTestHarness());
    if (!shouldInstallTestHarness()) return;
    console.log("[drum-alignment] installing test harness...");
    globalScope.DrumAlignmentWorkbenchTest = {
      loadTracks(tracks) {
        state.tracks = (tracks || []).map(createHarnessTrack);
        state.result = null;
        state.lastReportText = "";
        state.referenceValue = "auto";
        state.waveformPositionRatio = null;
        state.waveformFitFullTrack = false;
        render(nodes);
        const recommendation = state.recommendation;
        const statusParts = [`Loaded ${state.tracks.length} synthetic track(s).`];
        if (recommendation?.label) {
          statusParts.push(`Recommended reference: ${recommendation.label}.`);
        }
        setStatus(nodes, statusParts.join(" "));
        return {
          trackCount: state.tracks.length,
          recommendation,
        };
      },
      analyze: () => analyze(nodes),
      getState() {
        return {
          trackCount: state.tracks.length,
          recommendation: state.recommendation,
          result: state.result,
          reportText: state.lastReportText,
          status: nodes.status?.textContent || "",
        };
      },
    };
  }

  async function analyze(nodes) {
    if (state.tracks.length === 0) {
      setStatus(nodes, "Load local drum audio files before analysis.");
      return;
    }
    if (!engine || typeof engine.calculateAlignment !== "function") {
      state.result = {
        tracks: state.tracks.map(toEngineTrack),
        correlations: [],
      };
      const reference = getReferenceFromValue(state.referenceValue);
      state.lastReportText = createFallbackReport(state.result, reference);
      render(nodes);
      setStatus(
        nodes,
        "Files are decoded locally. Alignment engine is not loaded in this workspace yet."
      );
      return;
    }

    const sampleRate = state.tracks[0]?.sampleRate || 44100;
    const reference = getReferenceFromValue(state.referenceValue);
    setStatus(nodes, "Analyzing transients and correlation locally...");

    try {
      state.result = await Promise.resolve(
        engine.calculateAlignment({
          tracks: state.tracks.map(toEngineTrack),
          reference,
          sampleRate,
        })
      );
      state.lastReportText = resolveReportText(state.result, reference);
      render(nodes);
      setStatus(nodes, "Analysis complete. Offsets and report are ready.");
    } catch (error) {
      setStatus(nodes, `Analysis failed: ${error.message || error}`);
    }
  }

  async function copyReport(nodes) {
    const reportText =
      state.lastReportText || nodes.reportPanel?.textContent || "";
    if (!reportText.trim()) {
      setStatus(nodes, "Run analysis before copying a report.");
      return;
    }

    try {
      await navigator.clipboard.writeText(reportText);
      setStatus(nodes, "Alignment report copied to the clipboard.");
    } catch (_error) {
      setStatus(
        nodes,
        "Clipboard copy failed. Select the report text manually."
      );
    }
  }

  function bindEvents(nodes) {
    nodes.fileInput.addEventListener("change", (event) => {
      handleFiles(event.target.files, nodes);
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      nodes.dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        nodes.dropzone.classList.add("is-dragging");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      nodes.dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        nodes.dropzone.classList.remove("is-dragging");
      });
    });

    nodes.dropzone.addEventListener("drop", (event) => {
      handleFiles(event.dataTransfer.files, nodes);
    });

    nodes.dropzone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        nodes.fileInput.click();
      }
    });

    nodes.referenceSelector.addEventListener("change", (event) => {
      state.referenceValue = event.target.value;
      state.result = null;
      state.lastReportText = "";
      render(nodes);
      setStatus(
        nodes,
        "Reference override updated. Run analysis to refresh offsets."
      );
    });

    nodes.trackList.addEventListener("change", (event) => {
      const trackCard = event.target.closest("[data-drum-track-id]");
      if (!trackCard) return;
      const track = state.tracks.find(
        (candidate) => candidate.id === trackCard.dataset.drumTrackId
      );
      if (!track) return;

      if (event.target.matches("[data-drum-role]")) {
        track.role = event.target.value;
        track.family = getFamilyForRole(track.role);
      }
      if (event.target.matches("[data-drum-manual-transient]")) {
        const numericValue = Number(event.target.value);
        track.manualTransientSample = Number.isFinite(numericValue)
          ? Math.max(0, Math.round(numericValue))
          : null;
      }

      state.result = null;
      state.lastReportText = "";
      render(nodes);
      setStatus(nodes, "Track edit saved. Run analysis to refresh offsets.");
    });

    nodes.analyzeButton.addEventListener("click", () => analyze(nodes));
    nodes.copyButton.addEventListener("click", () => copyReport(nodes));
    nodes.copyButtonInline?.addEventListener("click", () => copyReport(nodes));

    nodes.waveformFirstHit.addEventListener("click", () => {
      state.waveformFitFullTrack = false;
      state.waveformPositionRatio = null;
      syncWaveformControls(nodes);
      renderWaveforms(nodes);
      setStatus(nodes, "Waveforms focused on each track's first detected hit.");
    });

    nodes.waveformFitTrack.addEventListener("click", () => {
      state.waveformFitFullTrack = true;
      state.waveformPositionRatio = 0;
      syncWaveformControls(nodes);
      renderWaveforms(nodes);
      setStatus(nodes, "Waveforms fitted to the full track. Use Focus first hit for detailed inspection.");
    });

    nodes.waveformWindow.addEventListener("change", (event) => {
      state.waveformFitFullTrack = false;
      const value = Number(event.target.value);
      state.waveformWindowSeconds = Number.isFinite(value)
        ? Math.max(0.05, value)
        : 0.75;
      syncWaveformControls(nodes);
      renderWaveforms(nodes);
      setStatus(
        nodes,
        `Waveform ADSR window set to ${Math.round(state.waveformWindowSeconds * 1000)} ms.`
      );
    });

    nodes.waveformPosition.addEventListener("input", (event) => {
      state.waveformFitFullTrack = false;
      state.waveformPositionRatio = Math.max(
        0,
        Math.min(1, Number(event.target.value) / 1000)
      );
      syncWaveformControls(nodes);
      scheduleWaveformRender(nodes);
    });

    [nodes.demoButton, nodes.demoButtonInline].forEach((button) => {
      button?.addEventListener("click", () => {
        runDemo(nodes);
      });
    });
  }

  function init() {
    if (state.booted) return;
    const root = document.getElementById("drum-alignment-workbench");
    if (!root) return;

    const nodes = {
      root,
      fileInput: document.getElementById("drum-alignment-files"),
      dropzone: document.getElementById("drum-alignment-dropzone"),
      trackList: document.getElementById("drum-track-list"),
      referenceSelector: document.getElementById("drum-reference-selector"),
      analyzeButton: document.getElementById("drum-analyze-button"),
      copyButton: document.getElementById("drum-copy-report-button"),
      copyButtonInline: document.getElementById("drum-copy-report-inline"),
      demoButton: document.getElementById("drum-demo-button"),
      demoButtonInline: document.getElementById("drum-demo-button-inline"),
      waveformMount: document.getElementById("drum-waveform-mount"),
      waveformStage: document.querySelector(".drum-align-waveform-stage"),
      waveformFirstHit: document.getElementById("drum-waveform-first-hit"),
      waveformFitTrack: document.getElementById("drum-waveform-fit-track"),
      waveformWindow: document.getElementById("drum-waveform-window"),
      waveformPosition: document.getElementById("drum-waveform-position"),
      waveformPositionOutput: document.getElementById(
        "drum-waveform-position-output"
      ),
      correlationPanel: document.getElementById("drum-correlation-panel"),
      phaseSummary: document.getElementById("drum-phase-summary"),
      reportPanel: document.getElementById("drum-report-panel"),
      status: document.getElementById("drum-alignment-status"),
    };

    const missingNode = [
      "root",
      "fileInput",
      "dropzone",
      "trackList",
      "referenceSelector",
      "analyzeButton",
      "copyButton",
      "waveformMount",
      "waveformFirstHit",
      "waveformFitTrack",
      "waveformWindow",
      "waveformPosition",
      "waveformPositionOutput",
      "correlationPanel",
      "reportPanel",
      "status",
    ].find((key) => !nodes[key]);
    console.log("[drum-alignment] missing node:", missingNode);
    if (missingNode) return;

    state.booted = true;
    console.log("[drum-alignment] calling bindEvents");
    bindEvents(nodes);
    console.log("[drum-alignment] bindEvents complete, calling render");
    render(nodes);
    console.log("[drum-alignment] render complete, calling setStatus");
    setStatus(
      nodes,
      "Ready. Audio stays in this browser; no upload or backend analysis is used."
    );
    console.log("[drum-alignment] calling installTestHarness");
    installTestHarness(nodes);
    console.log("[drum-alignment] init complete");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
