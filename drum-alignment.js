(function initDrumAlignmentWorkbench(globalScope) {
  const engine = globalScope.DrumAlignmentEngine;
  const waveform = globalScope.DrumWaveformRenderer;
  const roles = [
    ["overhead-left", "OH L"],
    ["overhead-right", "OH R"],
    ["overhead", "Overhead"],
    ["kick-in", "Kick In"],
    ["kick-out", "Kick Out"],
    ["kick", "Kick"],
    ["snare-top", "Snare Top"],
    ["snare-bottom", "Snare Bottom"],
    ["snare", "Snare"],
    ["rack-tom", "Rack Tom"],
    ["floor-tom", "Floor Tom"],
    ["tom", "Tom"],
    ["room", "Room"],
    ["other", "Other"],
  ];
  const state = {
    tracks: [],
    result: null,
    recommendation: null,
    referenceValue: "auto",
    selectedId: null,
    scopeZoom: "transient",
    report: "",
    errors: [],
    context: null,
  };
  const $ = (id) => document.getElementById(id);
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char]
    );
  const family = (role) =>
    role.startsWith("overhead")
      ? "overhead"
      : role.startsWith("kick")
        ? "kick"
        : role.startsWith("snare")
          ? "snare"
          : role.endsWith("-tom") || role === "tom"
            ? "tom"
            : role === "room"
              ? "room"
              : "other";
  const selected = () =>
    state.tracks.find((track) => track.id === state.selectedId);
  const aligned = (id) => state.result?.tracks.find((track) => track.id === id);
  const pair = (id) =>
    state.result?.correlations.find((score) => score.trackId === id);
  const status = (text) => {
    $("drum-alignment-status").textContent = text;
  };
  const numeric = (value) =>
    value === null || value === undefined
      ? "Unverified"
      : (value < 0 ? "−" : "+") + Math.abs(value).toFixed(3);
  const option = (value, label, current) =>
    `<option value="${escape(value)}"${value === current ? " selected" : ""}>${escape(label)}</option>`;
  function infer(name) {
    const detail = engine?.classifyTrackName(name);
    return detail?.role || "other";
  }
  function reference() {
    const recommendation = engine?.recommendReference(state.tracks);
    if (state.referenceValue === "auto") return recommendation;
    if (state.referenceValue.startsWith("group:")) {
      const group = state.referenceValue.slice(6);
      return {
        type: "group",
        trackIds: state.tracks
          .filter((track) => track.family === group)
          .map((track) => track.id),
        label: group === "overhead" ? "Overhead group" : "Room group",
      };
    }
    const id = state.referenceValue.slice(6);
    const track = state.tracks.find((item) => item.id === id);
    return track
      ? { type: "track", trackIds: [id], label: track.fileName }
      : recommendation;
  }
  function renderReference() {
    state.recommendation = engine?.recommendReference(state.tracks);
    const choices = [
      option(
        "auto",
        state.recommendation
          ? `Recommended: ${state.recommendation.label}`
          : "Recommended reference",
        state.referenceValue
      ),
    ];
    for (const group of ["overhead", "room"]) {
      if (state.tracks.some((track) => track.family === group))
        choices.push(
          option(
            `group:${group}`,
            `${group === "overhead" ? "Overhead" : "Room"} group`,
            state.referenceValue
          )
        );
    }
    for (const track of state.tracks)
      choices.push(
        option(`track:${track.id}`, track.fileName, state.referenceValue)
      );
    $("drum-reference-selector").innerHTML = choices.join("");
  }
  function eventSeconds() {
    const item = aligned(state.selectedId);
    const track = selected();
    return item?.referenceMs !== null && Number.isFinite(item?.referenceMs)
      ? item.referenceMs / 1000
      : item?.transientSample !== null && Number.isFinite(item?.transientSample)
        ? item.transientSample / item.sampleRate
        : state.result?.referenceEvent?.ms !== null &&
            Number.isFinite(state.result?.referenceEvent?.ms)
          ? state.result.referenceEvent.ms / 1000
          : track?.manualTransientSample !== null &&
              Number.isFinite(track?.manualTransientSample)
            ? track.manualTransientSample / track.sampleRate
            : 0;
  }
  function viewport() {
    const duration = Math.max(
      0.1,
      ...state.tracks.map((track) => track.duration || 0)
    );
    if (state.scopeZoom === "overview") return { start: 0, end: duration };
    const width = state.scopeZoom === "detail" ? 0.02 : 0.1;
    const center = eventSeconds();
    const start = Math.max(0, center - width / 2);
    return { start, end: start + width };
  }
  function renderRuler(view) {
    const width = view.end - view.start;
    const step =
      width <= 0.025
        ? 0.005
        : width <= 0.12
          ? 0.02
          : Math.max(0.05, Math.ceil((width / 0.2) * 20) / 1000);
    let marks = "";
    for (
      let seconds = Math.ceil(view.start / step) * step;
      seconds <= view.end + 1e-9;
      seconds += step
    ) {
      const left = ((seconds - view.start) / width) * 100;
      marks += `<span style="left:${left.toFixed(3)}%">${Math.round(seconds * 1000)} ms</span>`;
    }
    $("drum-ruler").innerHTML =
      `<span>TRACK</span><div class="drum-ruler-axis">${marks}</div><span>OFFSET</span>`;
  }
  function renderLanes() {
    $("drum-lane-count").textContent =
      `${state.tracks.length} lanes · shared time axis`;
    const view = viewport();
    renderRuler(view);
    const mount = $("drum-waveform-mount");
    if (!state.tracks.length) {
      mount.innerHTML =
        '<div class="drum-align-empty">Waveforms appear after local files are decoded.</div>';
      return;
    }
    mount.innerHTML = state.tracks
      .map((track) => {
        const result = aligned(track.id);
        const offset = result?.offsetMs;
        const role =
          roles.find(([value]) => value === track.role)?.[1] || track.role;
        return `<div class="drum-scope-track${state.selectedId === track.id ? " selected" : ""}" data-drum-track-id="${escape(track.id)}">
        <button class="drum-scope-label" type="button" data-select-track="${escape(track.id)}" title="${escape(track.fileName)}">
          <span class="drum-scope-code">${escape(
            role
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
          )}</span>
          <span><strong>${escape(role)}</strong><small>${escape(track.fileName)}</small></span>
        </button>
        <div class="drum-scope-wave" data-wave-id="${escape(track.id)}" role="button" tabindex="0" aria-label="Select ${escape(track.fileName)}; drag to edit transient marker"><canvas></canvas></div>
        <div class="drum-scope-offset">${offset === null || offset === undefined ? "Unverified" : `${offset >= 0 ? "+" : ""}${offset.toFixed(3)} ms`}<small>${result?.offsetSamples === null || result?.offsetSamples === undefined ? "" : `${result.offsetSamples >= 0 ? "+" : ""}${result.offsetSamples} samples`}</small></div>
      </div>`;
      })
      .join("");
    for (const element of mount.querySelectorAll("[data-wave-id]")) {
      const track = state.tracks.find(
        (item) => item.id === element.dataset.waveId
      );
      const result = aligned(track.id) || {};
      waveform?.drawSignedLane(
        element.querySelector("canvas"),
        { ...track, ...result, channelData: track.channelData },
        view,
        {
          referenceSeconds:
            result.referenceMs === null
              ? null
              : Number.isFinite(result.referenceMs)
                ? result.referenceMs / 1000
                : null,
        }
      );
    }
  }
  function renderInspector() {
    const track = selected();
    $("drum-selected-name").textContent = track
      ? roles.find(([value]) => value === track.role)?.[1] || track.role
      : "Choose a track";
    const score = track && pair(track.id);
    $("drum-pair-name").textContent = score
      ? score.pairNames.join(" ↔ ")
      : "Choose a lane to inspect its pair";
    $("drum-correlation-panel").innerHTML = score
      ? `<div class="drum-align-metric"><span>Timing envelope similarity</span><strong>${numeric(score.envelope)}</strong><small>Matched hit shape · higher is more similar</small></div>
       <div class="drum-align-metric"><span>Signed waveform correlation</span><strong class="${score.signed < 0 ? "negative" : ""}">${numeric(score.signed)}</strong><small>−1 opposing · +1 similar; not a phase angle</small></div>`
      : '<div class="drum-align-metric">Analyze tracks to see measured pair readings.</div>';
    const details = $("drum-track-list");
    if (!track) {
      details.innerHTML = "<p>No track selected.</p>";
      return;
    }
    const result = aligned(track.id);
    details.innerHTML = `<article class="drum-align-track-card" data-drum-track-id="${escape(track.id)}">
      <div class="drum-align-track-identity"><strong>${escape(track.fileName)}</strong><span>${escape(track.channelsLabel)} · ${track.sampleRate} Hz · ${track.duration.toFixed(3)} s</span></div>
      <div class="drum-align-track-field"><label for="drum-selected-role">Role</label><select id="drum-selected-role" data-drum-role>${roles.map(([value, label]) => option(value, label, track.role)).join("")}</select></div>
      <div class="drum-align-track-field"><label for="drum-selected-sample">Marker sample</label><input id="drum-selected-sample" data-drum-manual-transient type="number" min="0" max="${track.channelData[0]?.length - 1 || 0}" step="1" placeholder="Auto" value="${track.manualTransientSample ?? result?.transientSample ?? ""}"></div>
      <button id="drum-reset-auto" type="button">Reset Auto</button>
      <output class="drum-align-track-offset">${result?.offsetSamples === null ? "Unverified" : `${result?.offsetSamples ?? 0} samples / ${result?.offsetMs?.toFixed(3) ?? "0.000"} ms`}</output>
      <p>${score ? `Pair: ${escape(score.pairNames.join(" vs "))}; event ${score.eventMs ?? "n/a"} ms; after stated shifts; ${score.windowMs} ms window. ${escape(score.warning || score.label)}` : "Run analysis for pair and event details."}</p>
    </article>`;
  }
  function render() {
    renderReference();
    renderLanes();
    renderInspector();
    $("drum-report-panel").textContent =
      state.report || "Run analysis to generate a DAW-ready report.";
    if (state.errors.length) {
      const list = document.createElement("div");
      list.className = "drum-align-errors";
      list.innerHTML = state.errors
        .map((error) => `<p>${escape(error)}</p>`)
        .join("");
      $("drum-alignment-status").after(list);
      document.querySelectorAll(".drum-align-errors").forEach((node) => {
        if (node !== list) node.remove();
      });
    } else
      document
        .querySelectorAll(".drum-align-errors")
        .forEach((node) => node.remove());
  }
  function toEngine(track) {
    return {
      id: track.id,
      fileName: track.fileName,
      role: track.role,
      family: track.family,
      sampleRate: track.sampleRate,
      duration: track.duration,
      channelData: track.channelData,
      manualTransientSample: track.manualTransientSample,
    };
  }
  function analyze() {
    if (!state.tracks.length) {
      status("Load local drum audio files before analysis.");
      return;
    }
    state.result = engine.calculateAlignment({
      tracks: state.tracks.map(toEngine),
      reference: reference(),
    });
    state.report = state.result.reportText;
    render();
    status("Analysis complete. Offsets and report are ready.");
    return state.result;
  }
  async function decode(file, index) {
    if (!state.context)
      state.context = new (
        globalScope.AudioContext || globalScope.webkitAudioContext
      )();
    const buffer = await file.arrayBuffer();
    const audio = await state.context.decodeAudioData(buffer.slice(0));
    const channels = Array.from(
      { length: audio.numberOfChannels },
      (_, channel) => audio.getChannelData(channel)
    );
    const inferred = infer(file.name);
    const basic = {
      fileName: file.name,
      sampleRate: audio.sampleRate,
      duration: audio.duration,
      manualTransientSample: null,
    };
    if (inferred.startsWith("overhead") && channels.length === 2) {
      return channels.map((data, side) => ({
        ...basic,
        id: `drum-track-${Date.now()}-${index}-${side}`,
        role: side ? "overhead-right" : "overhead-left",
        family: "overhead",
        fileName: `${file.name} · ${side ? "R" : "L"}`,
        channelData: [data],
        channelsLabel: side ? "right channel" : "left channel",
      }));
    }
    return [
      {
        ...basic,
        id: `drum-track-${Date.now()}-${index}`,
        role: inferred,
        family: family(inferred),
        channelData: channels,
        channelsLabel:
          channels.length === 1 ? "mono" : `${channels.length} channels`,
      },
    ];
  }
  async function loadFiles(files) {
    const accepted = Array.from(files || []).filter(
      (file) =>
        /^audio\//.test(file.type) ||
        /\.(wav|aif|aiff|flac|m4a|mp3|ogg)$/i.test(file.name)
    );
    if (!accepted.length) {
      status("Choose local audio files to start alignment.");
      return;
    }
    status(`Decoding ${accepted.length} local audio file(s)...`);
    const settled = await Promise.allSettled(accepted.map(decode));
    state.tracks = settled.flatMap((item) =>
      item.status === "fulfilled" ? item.value : []
    );
    state.errors = settled.flatMap((item, index) =>
      item.status === "rejected"
        ? [
            `${accepted[index].name}: ${item.reason?.message || "decode failed"}`,
          ]
        : []
    );
    state.referenceValue = "auto";
    state.result = null;
    state.report = "";
    state.selectedId = state.tracks[0]?.id || null;
    render();
    status(
      `Decoded ${state.tracks.length} local track lane(s).${state.errors.length ? ` ${state.errors.length} file(s) could not be decoded; choose files again to retry.` : ""}`
    );
  }
  function editMarker(track, value) {
    track.manualTransientSample =
      value === ""
        ? null
        : Math.max(
            0,
            Math.min(
              track.channelData[0]?.length - 1 || 0,
              Math.round(Number(value))
            )
          );
    analyze();
  }
  function bind() {
    $("drum-alignment-files").addEventListener("change", (event) =>
      loadFiles(event.target.files)
    );
    const drop = $("drum-alignment-dropzone");
    drop.addEventListener("dragover", (event) => {
      event.preventDefault();
      drop.classList.add("is-dragging");
    });
    drop.addEventListener("dragleave", () =>
      drop.classList.remove("is-dragging")
    );
    drop.addEventListener("drop", (event) => {
      event.preventDefault();
      drop.classList.remove("is-dragging");
      loadFiles(event.dataTransfer.files);
    });
    drop.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        $("drum-alignment-files").click();
      }
    });
    $("drum-reference-selector").addEventListener("change", (event) => {
      state.referenceValue = event.target.value;
      analyze();
    });
    $("drum-scope-zoom").addEventListener("change", (event) => {
      state.scopeZoom = event.target.value;
      renderLanes();
    });
    $("drum-analyze-button").addEventListener("click", analyze);
    $("drum-copy-report-button").addEventListener("click", async () => {
      if (!state.report) {
        status("Run analysis before copying a report.");
        return;
      }
      try {
        await navigator.clipboard.writeText(state.report);
        status("Alignment report copied to the clipboard.");
      } catch {
        status("Clipboard copy failed. Select the report text manually.");
        $("drum-alignment-app").querySelector(".drum-align-report").open = true;
      }
    });
    $("drum-track-list").addEventListener("change", (event) => {
      const track = selected();
      if (!track) return;
      if (event.target.matches("[data-drum-role]")) {
        track.role = event.target.value;
        track.family = family(track.role);
        analyze();
      }
      if (event.target.matches("[data-drum-manual-transient]"))
        editMarker(track, event.target.value);
    });
    $("drum-track-list").addEventListener("click", (event) => {
      if (event.target.id === "drum-reset-auto") {
        const track = selected();
        track.manualTransientSample = null;
        analyze();
      }
    });
    const mount = $("drum-waveform-mount");
    mount.addEventListener("click", (event) => {
      const id = event.target.closest("[data-select-track]")?.dataset
        .selectTrack;
      if (id) {
        state.selectedId = id;
        renderLanes();
        renderInspector();
      }
    });
    mount.addEventListener("keydown", (event) => {
      const id = event.target.closest("[data-wave-id]")?.dataset.waveId;
      if (id && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        state.selectedId = id;
        renderLanes();
        renderInspector();
      }
    });
    let dragging = null;
    mount.addEventListener("pointerdown", (event) => {
      const wave = event.target.closest("[data-wave-id]");
      if (!wave) return;
      const track = state.tracks.find(
        (item) => item.id === wave.dataset.waveId
      );
      state.selectedId = track.id;
      dragging = { track, wave, view: viewport() };
      updatePointer(event);
    });
    const updatePointer = (event) => {
      if (!dragging) return;
      const rect = dragging.wave.getBoundingClientRect(),
        view = dragging.view;
      const ratio = Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width)
      );
      dragging.track.manualTransientSample = Math.round(
        (view.start + ratio * (view.end - view.start)) *
          dragging.track.sampleRate
      );
      const canvas = dragging.wave.querySelector("canvas");
      waveform?.drawSignedLane(
        canvas,
        {
          ...dragging.track,
          ...aligned(dragging.track.id),
          manualTransientSample: dragging.track.manualTransientSample,
          transientSample: dragging.track.manualTransientSample,
        },
        view
      );
    };
    document.addEventListener("pointermove", updatePointer);
    const finish = () => {
      if (dragging) {
        dragging = null;
        analyze();
      }
    };
    document.addEventListener("pointerup", finish);
    document.addEventListener("pointercancel", finish);
    let frame;
    globalScope.addEventListener("resize", () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(renderLanes);
    });
  }
  function testHarness() {
    if (!new URLSearchParams(location.search).has("testHarness")) return;
    globalScope.DrumAlignmentWorkbenchTest = {
      loadTracks(items) {
        state.tracks = items.map((item, index) => {
          const data = item.channelData || item.channels || item.samples || [];
          const channels =
            typeof data[0] === "number"
              ? [Float32Array.from(data)]
              : Array.from(data, (channel) => Float32Array.from(channel));
          const role = item.role || infer(item.fileName);
          return {
            id: item.id || `test-${index}`,
            fileName: item.fileName,
            sampleRate: item.sampleRate || 44100,
            channelData: channels,
            duration:
              item.duration || channels[0].length / (item.sampleRate || 44100),
            role,
            family: item.family || family(role),
            channelsLabel:
              channels.length === 1 ? "mono" : `${channels.length} channels`,
            manualTransientSample: item.manualTransientSample ?? null,
          };
        });
        state.selectedId = state.tracks[0]?.id || null;
        state.result = null;
        state.report = "";
        state.referenceValue = "auto";
        render();
        status(`Loaded ${state.tracks.length} synthetic track(s).`);
        return {
          trackCount: state.tracks.length,
          recommendation: state.recommendation,
        };
      },
      analyze,
      getState: () => ({
        trackCount: state.tracks.length,
        result: state.result,
        recommendation: state.recommendation,
        reportText: state.report,
      }),
    };
  }
  function init() {
    if (!$("drum-alignment-workbench")) return;
    bind();
    testHarness();
    render();
    status("Ready. Audio stays in this browser.");
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof globalThis !== "undefined" ? globalThis : window);
