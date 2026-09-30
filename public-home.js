(function () {
  prepareHeroLoop();
  initReels();

  const compare = document.querySelector("[data-compare]");
  const story = document.querySelector(".public-home-story");
  if (compare) initCompare(compare, story);
  initReviewForm();
  initListenEntry();

  function prepareHeroLoop() {
    const video = document.querySelector("[data-hero-loop]");
    if (!video) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const source = video.querySelector("source");
    const hasSource = Boolean(
      video.getAttribute("src") || (source && source.getAttribute("src"))
    );
    if (reduce || !hasSource) return;
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.playbackRate = 0.72;
    video.addEventListener(
      "playing",
      function () {
        video.classList.add("is-live");
      },
      { once: true }
    );
    const attempt = video.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(function () {
        video.classList.remove("is-live");
      });
    }
  }

  function initReels() {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const videos = Array.from(document.querySelectorAll("[data-scene-video]"));
    videos.forEach(function (video) {
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.playbackRate = 0.7;
      video.addEventListener("playing", function () {
        video.classList.add("is-live");
      });
    });
    if (reduce) return;

    const reels = Array.from(document.querySelectorAll("[data-reel]"));
    if (reels.length) document.documentElement.classList.add("reel-live");

    let ticking = false;

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function syncVideo(video, active) {
      if (!video) return;
      if (active) {
        if (video.paused) {
          const attempt = video.play();
          if (attempt && typeof attempt.catch === "function") {
            attempt.catch(function () {
              video.classList.remove("is-live");
            });
          }
        }
        return;
      }
      if (!video.paused) video.pause();
    }

    function paint() {
      ticking = false;
      const vh = window.innerHeight || 1;
      reels.forEach(function (reel) {
        const plates = Array.from(reel.querySelectorAll("[data-plate]"));
        const count = plates.length;
        if (!count) return;
        const rect = reel.getBoundingClientRect();
        const span = Math.max(1, reel.offsetHeight - vh);
        const progress = clamp(-rect.top / span, 0, 1);
        const cursor = progress * (count - 1);
        let lead = 0;
        let leadFade = -1;
        plates.forEach(function (plate, index) {
          const fade = clamp(1 - Math.abs(cursor - index), 0, 1);
          if (fade > leadFade) {
            leadFade = fade;
            lead = index;
          }
          plate.style.opacity = String(fade);
          plate.style.zIndex = String(Math.round(fade * 10) + 1);
          plate.style.setProperty("--focus", fade.toFixed(3));
        });
        plates.forEach(function (plate, index) {
          const on = index === lead && parseFloat(plate.style.opacity) > 0.35;
          plate.setAttribute("aria-hidden", on ? "false" : "true");
        });
      });

      const nodes = videos.concat(
        Array.from(document.querySelectorAll("[data-hero-loop]"))
      );
      nodes.forEach(function (video) {
        const rect = video.getBoundingClientRect();
        const near = rect.bottom > -80 && rect.top < vh + 80;
        const plate = video.closest("[data-plate]");
        const plateOn = !plate || parseFloat(plate.style.opacity || "1") > 0.08;
        syncVideo(video, near && plateOn);
      });
    }

    function requestPaint() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(paint);
    }

    window.addEventListener("scroll", requestPaint, { passive: true });
    window.addEventListener("resize", requestPaint);
    paint();
  }

  function initListenEntry() {
    const enter = document.querySelector("[data-enter-listen]");
    const passage = document.getElementById("listen");
    if (!enter || !passage) return;
    enter.addEventListener("click", function (event) {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      event.preventDefault();
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      passage.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
      if (window.history && window.history.pushState) {
        window.history.pushState(null, "", "#listen");
      }
      document.dispatchEvent(new CustomEvent("public-home:listen"));
    });
  }

  function initCompare(compareEl, storyEl) {
    const playButton = compareEl.querySelector("[data-play]");
    const timeEl = compareEl.querySelector("[data-time]");
    const lengthEl = compareEl.querySelector("[data-length]");
    const hearingEl = compareEl.querySelector("[data-hearing]");
    const statusEl = compareEl.querySelector("[data-status]");
    const playheadInput = compareEl.querySelector("[data-playhead]");
    const holdButton = compareEl.querySelector("[data-hold]");
    const stateEl = compareEl.querySelector("[data-state]");
    const hintEl = compareEl.querySelector("[data-hold-hint]");
    const sideButtons = Array.from(compareEl.querySelectorAll("[data-side]"));

    const candidates = {
      source: [
        "prototypes/home/audio/you-got-me-source.mp3",
        "prototypes/home/audio/you-got-me-source.wav",
        "prototypes/corey-bench/audio/you-got-me-source.mp3",
        "prototypes/corey-bench/audio/you-got-me-source.wav",
      ],
      print: [
        "prototypes/home/audio/you-got-me-print.mp3",
        "prototypes/home/audio/you-got-me-print.wav",
        "prototypes/corey-bench/audio/you-got-me-print.mp3",
        "prototypes/corey-bench/audio/you-got-me-print.wav",
      ],
    };

    let hearing = "print";
    let latched = "print";
    let holding = false;
    let playing = false;
    let offset = 0;
    let startedAt = 0;
    let frame = 0;
    let dragging = false;
    let mode = "clock";
    let duration = 0;
    let announced = "";
    let ctx = null;
    let sourceBuffer = null;
    let printBuffer = null;
    let sourceNode = null;
    let printNode = null;
    let sourceGain = null;
    let printGain = null;

    function formatTime(seconds) {
      const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
      const minutes = Math.floor(safe / 60);
      const rest = Math.floor(safe % 60)
        .toString()
        .padStart(2, "0");
      return minutes + ":" + rest;
    }

    function elapsed() {
      if (!playing) return offset;
      return offset + (performance.now() - startedAt) / 1000;
    }

    function playhead() {
      const raw = Math.max(0, elapsed());
      if (mode === "audio" && duration > 0) return raw % duration;
      return raw;
    }

    function render() {
      const seconds = playhead();
      timeEl.textContent = formatTime(seconds);
      if (mode === "audio" && playheadInput && !dragging) {
        playheadInput.value = String(seconds);
      }
      sideButtons.forEach(function (button) {
        const active = button.getAttribute("data-side") === hearing;
        button.setAttribute("aria-pressed", String(active));
      });
      playButton.textContent = playing ? "Pause" : "Play";
      playButton.setAttribute("aria-pressed", String(playing));
      compareEl.setAttribute("data-hearing", hearing);
      if (storyEl) storyEl.setAttribute("data-hearing", hearing);
      if (stateEl)
        stateEl.textContent =
          hearing === "source" ? "Source" : "Dirt Cat print";
      if (hintEl) {
        hintEl.textContent = holding
          ? "Release for the Dirt Cat print"
          : "Hold for the source";
      }
      if (holdButton) holdButton.setAttribute("aria-pressed", String(holding));
      const label = hearing === "source" ? "the source" : "the Dirt Cat print";
      const nextAnnouncement = (playing ? "Hearing " : "Ready for ") + label;
      if (nextAnnouncement !== announced) {
        hearingEl.textContent = nextAnnouncement;
        announced = nextAnnouncement;
      }
    }

    function fadeToHearing() {
      if (mode !== "audio" || !ctx || !sourceGain || !printGain) return;
      const now = ctx.currentTime;
      const fade = 0.03;
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

    function setHearing(next) {
      if (next !== "source" && next !== "print") return;
      if (next === hearing) return;
      hearing = next;
      fadeToHearing();
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
      const from =
        duration > 0 ? ((fromSeconds % duration) + duration) % duration : 0;
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
      if (playing) frame = window.requestAnimationFrame(tick);
    }

    function pause() {
      offset = playhead();
      playing = false;
      window.cancelAnimationFrame(frame);
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
        if (ctx.state === "suspended") ctx.resume();
        startNodes(offset);
      }
      tick();
    }

    function seek(nextSeconds) {
      const next = Math.max(0, Number(nextSeconds) || 0);
      offset = mode === "audio" && duration > 0 ? next % duration : next;
      if (playing) {
        startedAt = performance.now();
        if (mode === "audio") startNodes(offset);
      }
      render();
    }

    function beginHold(event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      holding = true;
      try {
        holdButton.setPointerCapture(event.pointerId);
      } catch (_error) {
        /* The press still counts. */
      }
      setHearing("source");
      render();
    }

    function endHold() {
      if (!holding) return;
      holding = false;
      latched = "print";
      setHearing("print");
      render();
    }

    async function fetchBuffer(urls) {
      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const data = await response.arrayBuffer();
          if (!ctx) ctx = new AudioContext();
          return await ctx.decodeAudioData(data.slice(0));
        } catch (_error) {
          /* Try the next candidate. */
        }
      }
      return null;
    }

    async function loadPair() {
      statusEl.textContent =
        "The passage is not loaded yet. Switching still keeps this playhead.";
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
      duration = printBuffer.duration;
      lengthEl.textContent = formatTime(duration);
      playheadInput.disabled = false;
      playheadInput.max = String(duration);
      statusEl.textContent = "";
      render();
    }

    playButton.addEventListener("click", play);
    sideButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        holding = false;
        latched = button.getAttribute("data-side");
        setHearing(latched);
        render();
      });
    });
    if (holdButton) {
      holdButton.addEventListener("pointerdown", beginHold);
      holdButton.addEventListener("pointerup", endHold);
      holdButton.addEventListener("pointercancel", endHold);
      holdButton.addEventListener("contextmenu", function (event) {
        event.preventDefault();
      });
      holdButton.addEventListener("keydown", function (event) {
        if (event.repeat) return;
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        holding = true;
        setHearing("source");
        render();
      });
      holdButton.addEventListener("keyup", function (event) {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        endHold();
      });
      holdButton.addEventListener("blur", endHold);
    }
    window.addEventListener("blur", endHold);
    playheadInput.addEventListener("pointerdown", function () {
      dragging = true;
    });
    playheadInput.addEventListener("pointerup", function () {
      dragging = false;
    });
    playheadInput.addEventListener("input", function () {
      seek(playheadInput.value);
    });
    document.addEventListener("public-home:listen", function () {
      if (!playing) play();
    });

    render();
    loadPair();
  }

  function initReviewForm() {
    const form = document.querySelector("#mix-review-form");
    const formStatus = document.querySelector("#mix-review-status");
    if (!form || !formStatus) return;
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const data = new FormData(form);
      const track = String(data.get("trackLink") || "").trim();
      const payload = {
        name: data.get("name"),
        email: data.get("email"),
        artistName: data.get("artistName"),
        projectTitle: data.get("projectTitle"),
        message: data.get("message"),
        website: data.get("website") || "",
        referenceLinks: track ? [track] : [],
      };
      const submitButton = form.querySelector("[type='submit']");
      submitButton.disabled = true;
      formStatus.textContent = "Sending.";
      try {
        const response = await fetch("/api/public/free-review", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await response.json().catch(function () {
          return {};
        });
        if (!response.ok) {
          formStatus.textContent = body.error || "That did not send.";
          return;
        }
        form.reset();
        formStatus.textContent = "Got it. Josh will listen and write back.";
      } catch (_error) {
        formStatus.textContent = "That did not send. Try again in a moment.";
      } finally {
        submitButton.disabled = false;
      }
    });
  }
})();
