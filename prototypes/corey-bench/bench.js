(function () {
  const photo = document.getElementById("session-photo");
  const caption = document.getElementById("session-caption");
  const holdButton = document.querySelector("[data-hold]");
  const playButton = document.querySelector("[data-play]");
  const timeEl = document.querySelector("[data-time]");
  const hearingEl = document.querySelector("[data-hearing]");
  const statusEl = document.querySelector("[data-status]");
  const sourceLabel = document.querySelector("[data-label='source']");
  const printLabel = document.querySelector("[data-label='print']");

  const frames = {
    ladder: {
      src: "media/ladder.jpg",
      alt: "A stereo pair of microphones hung from a wooden stepladder over a drum kit in a living room.",
      caption: "Looking up the ladder at the overhead pair.",
    },
    kit: {
      src: "media/kit.jpg",
      alt: "A drum kit in a carpeted living room, with worn heads, tape on the drums, and microphones around the kit.",
      caption: "The kit in the room, heads worn, damping already on the drums.",
    },
    close: {
      src: "media/close-mic.jpg",
      alt: "A Sennheiser e604 clipped to a drum rim above a worn head with green tape on it.",
      caption: "A close mic on the rim, and tape on a worn head.",
    },
  };

  const candidates = {
    source: ["audio/you-got-me-source.wav", "audio/you-got-me-source.mp3"],
    print: ["audio/you-got-me-print.wav", "audio/you-got-me-print.mp3"],
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

  function formatTime(seconds) {
    const safe = Math.max(0, seconds);
    const minutes = Math.floor(safe / 60);
    const rest = (safe - minutes * 60).toFixed(1).padStart(4, "0");
    return minutes + ":" + rest;
  }

  function playhead() {
    if (!playing) return offset;
    return offset + (performance.now() - startedAt) / 1000;
  }

  function render() {
    const seconds = playhead();
    timeEl.textContent = formatTime(seconds);
    const name = hearing === "source" ? "Source" : "Dirt Cat print";
    hearingEl.textContent = (playing ? "Hearing " : "Ready for ") + name;
    sourceLabel.classList.toggle("is-sounding", hearing === "source");
    printLabel.classList.toggle("is-sounding", hearing === "print");
    holdButton.classList.toggle("is-held", hearing === "source");
    holdButton.setAttribute("aria-pressed", String(hearing === "source"));
    playButton.textContent = playing ? "Pause" : "Play";
    playButton.setAttribute("aria-pressed", String(playing));
  }

  function setHearing(next) {
    if (next !== "source" && next !== "print") return;
    if (next === hearing) return;
    hearing = next;
    if (mode === "audio" && ctx && sourceGain && printGain) {
      const now = ctx.currentTime;
      const fade = 0.02;
      const sourceLevel = hearing === "source" ? 1 : 0;
      const printLevel = hearing === "print" ? 1 : 0;
      sourceGain.gain.cancelScheduledValues(now);
      printGain.gain.cancelScheduledValues(now);
      sourceGain.gain.setValueAtTime(sourceGain.gain.value, now);
      printGain.gain.setValueAtTime(printGain.gain.value, now);
      sourceGain.gain.linearRampToValueAtTime(sourceLevel, now + fade);
      printGain.gain.linearRampToValueAtTime(printLevel, now + fade);
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
    if (mode !== "audio" || !ctx) return;
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

  function holdOn(event) {
    setHearing("source");
    if (event.pointerId == null || !holdButton.setPointerCapture) return;
    try {
      holdButton.setPointerCapture(event.pointerId);
    } catch (_error) {
      /* A synthetic pointer cannot be captured. The hold state is already set. */
    }
  }

  function holdOff() {
    setHearing("print");
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
      "Stand-in clock. Put you-got-me-source and you-got-me-print, wav or mp3, in the audio folder.";
    try {
      sourceBuffer = await fetchBuffer(candidates.source);
      printBuffer = await fetchBuffer(candidates.print);
    } catch (_error) {
      sourceBuffer = null;
      printBuffer = null;
    }
    if (!sourceBuffer || !printBuffer) {
      mode = "clock";
      if (ctx && ctx.state !== "closed") {
        /* keep the context only if a later play needs it */
      }
      return;
    }
    const drift = Math.abs(sourceBuffer.duration - printBuffer.duration);
    if (drift > 0.35) {
      mode = "clock";
      statusEl.textContent =
        "Both files are present, and their lengths differ by " +
        drift.toFixed(2) +
        "s. The switch stays on the stand-in clock until the passage is the same length.";
      sourceBuffer = null;
      printBuffer = null;
      return;
    }
    mode = "audio";
    statusEl.textContent =
      "Pair loaded. Confirm the files are level-matched before treating the switch as proof.";
  }

  document.querySelectorAll("[data-frame]").forEach(function (button) {
    button.addEventListener("click", function () {
      const frame = frames[button.getAttribute("data-frame")];
      photo.src = frame.src;
      photo.alt = frame.alt;
      caption.textContent = frame.caption;
      document.querySelectorAll("[data-frame]").forEach(function (other) {
        other.setAttribute("aria-pressed", String(other === button));
      });
    });
  });

  playButton.addEventListener("click", play);
  holdButton.addEventListener("pointerdown", function (event) {
    event.preventDefault();
    holdOn(event);
  });
  holdButton.addEventListener("pointerup", holdOff);
  holdButton.addEventListener("pointercancel", holdOff);
  holdButton.addEventListener("lostpointercapture", holdOff);
  holdButton.addEventListener("keydown", function (event) {
    if (event.repeat) return;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setHearing("source");
    }
  });
  holdButton.addEventListener("keyup", function (event) {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setHearing("print");
    }
  });

  render();
  loadPair();
})();
