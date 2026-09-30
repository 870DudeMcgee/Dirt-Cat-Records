(function () {
  const holdButton = document.querySelector("[data-hold]");
  const timeEl = document.querySelector("[data-time]");
  const lengthEl = document.querySelector("[data-length]");
  const hearingEl = document.querySelector("[data-hearing]");
  const statusEl = document.querySelector("[data-status]");
  const sourceLine = document.querySelector("[data-source-line]");
  const printLine = document.querySelector("[data-print-line]");
  const player = document.querySelector(".compare");

  const heights = [
    18, 28, 16, 40, 24, 52, 34, 22, 64, 30, 48, 20, 70, 38, 26, 58, 44, 18, 76,
    36, 62, 28, 84, 46, 32, 68, 22, 50,
  ];

  document.querySelectorAll("[data-wave]").forEach(function (wave) {
    heights.forEach(function (height, index) {
      const bar = document.createElement("span");
      bar.style.setProperty("--h", height + "%");
      bar.style.setProperty("--d", (index % 8) * 0.07 + "s");
      wave.appendChild(bar);
    });
  });

  const candidates = {
    source: [
      "audio/you-got-me-source.mp3",
      "audio/you-got-me-source.wav",
      "../corey-bench/audio/you-got-me-source.mp3",
      "../corey-bench/audio/you-got-me-source.wav",
    ],
    print: [
      "audio/you-got-me-print.mp3",
      "audio/you-got-me-print.wav",
      "../corey-bench/audio/you-got-me-print.mp3",
      "../corey-bench/audio/you-got-me-print.wav",
    ],
  };

  let hearing = "print";
  let playing = false;
  let offset = 0;
  let startedAt = 0;
  let raf = 0;
  let mode = "clock";
  let ctx = null;
  let sourceBuffer = null;
  let printBuffer = null;
  let sourceNode = null;
  let printNode = null;
  let sourceGain = null;
  let printGain = null;
  let downAt = 0;
  let holdArmed = false;
  let holdTimer = 0;

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "–:––";
    const safe = Math.max(0, seconds);
    const minutes = Math.floor(safe / 60);
    const rest = Math.floor(safe - minutes * 60)
      .toString()
      .padStart(2, "0");
    return minutes + ":" + rest;
  }

  function playhead() {
    if (!playing) return offset;
    return offset + (performance.now() - startedAt) / 1000;
  }

  function render() {
    timeEl.textContent = formatTime(playhead());
    const onSource = hearing === "source";
    sourceLine.classList.toggle("is-active", onSource);
    printLine.classList.toggle("is-active", !onSource);
    holdButton.classList.toggle("is-held", onSource);
    player.classList.toggle("is-source", onSource);
    player.classList.toggle("is-playing", playing);
    holdButton.setAttribute("aria-pressed", String(onSource));
    const side = onSource ? "the source" : "the Dirt Cat mix";
    hearingEl.textContent = (playing ? "Hearing " : "Ready for ") + side;
  }

  function setHearing(next) {
    if (next !== "source" && next !== "print") return;
    if (next === hearing) return;
    hearing = next;
    if (mode === "audio" && ctx && sourceGain && printGain) {
      const now = ctx.currentTime;
      const fade = 0.02;
      sourceGain.gain.cancelScheduledValues(now);
      printGain.gain.cancelScheduledValues(now);
      sourceGain.gain.setValueAtTime(sourceGain.gain.value, now);
      printGain.gain.setValueAtTime(printGain.gain.value, now);
      sourceGain.gain.linearRampToValueAtTime(
        hearing === "source" ? 1 : 0,
        now + fade
      );
      printGain.gain.linearRampToValueAtTime(
        hearing === "print" ? 1 : 0,
        now + fade
      );
    }
    render();
  }

  function stopNodes() {
    [sourceNode, printNode].forEach(function (node) {
      if (!node) return;
      try {
        node.onended = null;
        node.stop();
      } catch (_error) {
        /* already stopped */
      }
      node.disconnect();
    });
    sourceNode = null;
    printNode = null;
    sourceGain = null;
    printGain = null;
  }

  function startNodes(fromSeconds) {
    if (mode !== "audio" || !ctx || !sourceBuffer || !printBuffer) return;
    stopNodes();
    const from = Math.max(0, fromSeconds % sourceBuffer.duration);
    sourceGain = ctx.createGain();
    printGain = ctx.createGain();
    sourceGain.gain.value = hearing === "source" ? 1 : 0;
    printGain.gain.value = hearing === "print" ? 1 : 0;
    sourceGain.connect(ctx.destination);
    printGain.connect(ctx.destination);
    sourceNode = ctx.createBufferSource();
    printNode = ctx.createBufferSource();
    sourceNode.buffer = sourceBuffer;
    printNode.buffer = printBuffer;
    sourceNode.loop = true;
    printNode.loop = true;
    sourceNode.connect(sourceGain);
    printNode.connect(printGain);
    const when = ctx.currentTime;
    sourceNode.start(when, from);
    printNode.start(when, from);
  }

  function tick() {
    render();
    if (playing) raf = window.setTimeout(tick, 100);
  }

  function pause() {
    offset = playhead();
    playing = false;
    clearTimeout(raf);
    stopNodes();
    render();
  }

  function play() {
    if (playing) {
      pause();
      return;
    }
    offset = playhead();
    startedAt = performance.now();
    playing = true;
    if (mode === "audio") {
      if (!ctx) ctx = new AudioContext();
      ctx.resume();
      startNodes(offset);
    }
    tick();
  }

  function beginHold() {
    clearTimeout(holdTimer);
    downAt = performance.now();
    holdArmed = false;
    holdTimer = window.setTimeout(function () {
      holdArmed = true;
      setHearing("source");
      if (!playing) {
        play();
      }
    }, 160);
  }

  function endHold() {
    if (!downAt && !holdArmed) return;
    clearTimeout(holdTimer);
    const wasHold = holdArmed;
    const wasDown = downAt;
    downAt = 0;
    holdArmed = false;
    if (wasHold) setHearing("print");
    else if (wasDown) play();
  }

  async function fetchBuffer(urls) {
    for (const url of urls) {
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.arrayBuffer();
      if (!ctx) ctx = new AudioContext();
      return ctx.decodeAudioData(data.slice(0));
    }
    return null;
  }

  async function loadPair() {
    statusEl.textContent =
      "You Got Me audio is not here yet. Hold still switches the side, and the clock keeps its place.";
    try {
      sourceBuffer = await fetchBuffer(candidates.source);
      printBuffer = await fetchBuffer(candidates.print);
    } catch (_error) {
      sourceBuffer = null;
      printBuffer = null;
    }
    if (!sourceBuffer || !printBuffer) {
      mode = "clock";
      render();
      return;
    }
    const drift = Math.abs(sourceBuffer.duration - printBuffer.duration);
    if (drift > 0.35) {
      mode = "clock";
      sourceBuffer = null;
      printBuffer = null;
      statusEl.textContent =
        "Both files are here, and their lengths differ by " +
        drift.toFixed(2) +
        "s. The switch stays on the clock until the passage matches.";
      render();
      return;
    }
    mode = "audio";
    lengthEl.textContent = formatTime(printBuffer.duration);
    statusEl.textContent =
      "Pair loaded. Level-match the files before treating the switch as proof.";
    render();
  }

  holdButton.addEventListener("pointerdown", function (event) {
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    holdButton.focus();
    beginHold();
    if (!holdButton.setPointerCapture) return;
    try {
      holdButton.setPointerCapture(event.pointerId);
    } catch (_error) {
      /* A synthetic pointer cannot be captured. The hold still arms. */
    }
  });
  holdButton.addEventListener("pointerup", endHold);
  holdButton.addEventListener("pointercancel", endHold);
  holdButton.addEventListener("lostpointercapture", endHold);
  holdButton.addEventListener("contextmenu", function (event) {
    event.preventDefault();
  });
  holdButton.addEventListener("keydown", function (event) {
    if (event.repeat) return;
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    beginHold();
  });
  holdButton.addEventListener("keyup", function (event) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    endHold();
  });
  holdButton.addEventListener("blur", endHold);

  render();
  loadPair();
})();
