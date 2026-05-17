/*
  =========================================
  DIRTCAT RECORDS: ANIME.JS DESIGN SPELLS
  =========================================
  This file handles the high-end interaction and motion logic.
*/

document.addEventListener('DOMContentLoaded', () => {

  // =========================================
  // SPELL 1: THE HERO TERMINAL DECODE
  // =========================================
  const heroHeading = document.getElementById('hero-heading');
  if (heroHeading) {
    // Split the text into words and letters for tight granular control
    const text = heroHeading.innerText;
    heroHeading.innerHTML = '';
    
    // Wrap each letter in a span
    const words = text.split(' ');
    words.forEach((word, wordIndex) => {
      const wordSpan = document.createElement('span');
      wordSpan.style.display = 'inline-block';
      wordSpan.style.whiteSpace = 'nowrap';
      
      const letters = word.split('');
      letters.forEach(letter => {
        const letterSpan = document.createElement('span');
        letterSpan.classList.add('hero-letter');
        letterSpan.innerText = letter;
        wordSpan.appendChild(letterSpan);
      });
      
      heroHeading.appendChild(wordSpan);
      
      // Add a space after the word unless it's the last word
      if (wordIndex < words.length - 1) {
        const space = document.createElement('span');
        space.innerHTML = '&nbsp;';
        heroHeading.appendChild(space);
      }
    });

    // Animate the letters in a sweeping staggered terminal effect
    anime.timeline({ loop: false })
      .add({
        targets: '.hero-letter',
        translateY: [-20, 0],
        opacity: [0, 1],
        easing: "spring(1, 80, 10, 0)", // Expensive physics-based bounce
        duration: 1200,
        delay: (el, i) => 30 * i // Staggered drop
      });
  }


  // =========================================
  // SPELL 2: STAGGERED BENTO REVEALS
  // =========================================
  const revealContainer = (containerId, animate = true) => {
    const targets = document.querySelectorAll(`#${containerId} .card`);
    if (!targets.length) return;

    if (!animate) {
      targets.forEach((card) => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });
      return;
    }

    anime({
      targets,
      translateY: [50, 0],
      opacity: [0, 1],
      easing: 'spring(1, 80, 10, 0)',
      delay: anime.stagger(150),
      duration: 1000,
      complete: () => {
        targets.forEach((card) => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        });
      }
    });
  };

  const hideContainerCards = (container) => {
    container.querySelectorAll('.card').forEach((card) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(50px)';
    });
  };

  const isInViewport = (element) => {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
  };

  // Helper to create an observer for a specific grid container
  const createBentoObserver = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (isInViewport(container)) {
      revealContainer(containerId, true);
      return;
    }

    hideContainerCards(container);

    const observer = new IntersectionObserver((entries, obs) => {
      const isVisible = entries.some(entry => entry.isIntersecting);
      if (isVisible) {
        revealContainer(containerId, true);
        obs.disconnect();
      }
    }, { threshold: 0.05 });

    observer.observe(container);
  };

  createBentoObserver('card-container');
  createBentoObserver('process-grid');
  createBentoObserver('faq-grid');
  createBentoObserver('fat-footer');

  // =========================================
  // SPELL 3: SINGLE-CARD LISTEN PLAYER
  // =========================================
  const listenPlayer = document.querySelector('.listen-player');
  const listenArt = document.getElementById('listen-art');
  const listenAudio = document.getElementById('listen-audio');
  const listenTitle = document.getElementById('listen-title');
  const listenNote = document.getElementById('listen-note');
  const listenPrev = document.getElementById('listen-prev');
  const listenNext = document.getElementById('listen-next');
  const listenDots = document.getElementById('listen-dots');

  const listenTracks = [
    {
      title: 'Dude McGee – Digital Dream',
      src: 'assets/Digital Dream .wav',
      note: 'Wide, polished, and balanced without losing the personality of the track.',
      art: 'assets/Dude-McGee-AlbumCover.PNG',
      alt: 'Album artwork for Dude McGee – Digital Dream'
    },
    {
      title: 'Dude McGee – Slow Swing',
      src: 'assets/SlowSwing.wav',
      note: 'Controlled low end, stronger pocket, and a more focused sense of space.',
      art: 'assets/Dude-McGee-AlbumCover.PNG',
      alt: 'Album artwork for Dude McGee – Slow Swing'
    },
    {
      title: 'Dude McGee – Smells Like June',
      src: 'assets/Smells Like June.wav',
      note: 'A cleaner presentation with enough edge to keep the performance alive.',
      art: 'assets/Dude-McGee-AlbumCover.PNG',
      alt: 'Album artwork for Dude McGee – Smells Like June'
    }
  ];

  if (listenPlayer && listenArt && listenAudio && listenTitle && listenNote && listenPrev && listenNext && listenDots) {
    let currentTrack = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    const renderTrack = (nextTrack) => {
      const wasPlaying = !listenAudio.paused;
      const track = listenTracks[nextTrack];
      currentTrack = nextTrack;

      listenArt.src = track.art;
      listenArt.alt = track.alt;
      listenTitle.textContent = track.title;
      listenNote.textContent = track.note;
      listenAudio.src = track.src;
      listenAudio.load();

      Array.from(listenDots.children).forEach((dot, index) => {
        dot.classList.toggle('is-active', index === currentTrack);
        dot.setAttribute('aria-current', index === currentTrack ? 'true' : 'false');
      });

      anime({
        targets: listenPlayer,
        scale: [0.985, 1],
        opacity: [0.76, 1],
        easing: 'easeOutQuad',
        duration: 260
      });

      if (wasPlaying) {
        listenAudio.play().catch(() => {});
      }
    };

    const moveTrack = (direction) => {
      const nextTrack = (currentTrack + direction + listenTracks.length) % listenTracks.length;
      renderTrack(nextTrack);
    };

    listenTracks.forEach((track, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'listen-dot';
      dot.setAttribute('aria-label', `Play ${track.title}`);
      dot.addEventListener('click', () => renderTrack(index));
      listenDots.appendChild(dot);
    });

    listenPrev.addEventListener('click', () => moveTrack(-1));
    listenNext.addEventListener('click', () => moveTrack(1));

    listenPlayer.addEventListener('touchstart', (event) => {
      touchStartX = event.changedTouches[0].screenX;
      touchStartY = event.changedTouches[0].screenY;
    }, { passive: true });

    listenPlayer.addEventListener('touchend', (event) => {
      const touchEndX = event.changedTouches[0].screenX;
      const touchEndY = event.changedTouches[0].screenY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY)) return;
      moveTrack(deltaX < 0 ? 1 : -1);
    }, { passive: true });

    renderTrack(currentTrack);
  }


  // =========================================
  // SPELL 4: TRUE REAL-TIME SPECTRUM ANALYZER
  // =========================================
  const listenSection = document.getElementById('listen');
  const audioElements = document.querySelectorAll('.track audio');
  
  if (listenSection && audioElements.length > 0) {
    // 1. Inject a container for the EQ bars
    const eqContainer = document.createElement('div');
    eqContainer.style.position = 'absolute';
    eqContainer.style.bottom = '0';
    eqContainer.style.left = '0';
    eqContainer.style.width = '100%';
    eqContainer.style.height = '100%';
    eqContainer.style.zIndex = '-1';
    eqContainer.style.display = 'flex';
    eqContainer.style.alignItems = 'flex-end';
    eqContainer.style.justifyContent = 'space-between';
    eqContainer.style.opacity = '0.4';
    eqContainer.style.pointerEvents = 'none';
    
    listenSection.insertBefore(eqContainer, listenSection.firstChild);

    // 2. Create the vertical EQ bars
    const numBars = 45;
    const bars = [];
    for (let i = 0; i < numBars; i++) {
      const bar = document.createElement('div');
      bar.style.width = '1.8%';
      bar.style.height = '10px';
      bar.style.background = 'linear-gradient(to top, #8a2be2, #ff00ff)';
      bar.style.borderRadius = '4px 4px 0 0';
      bar.style.boxShadow = '0 0 10px #ff00ff';
      bar.style.transition = 'height 0.05s ease'; // Smooth the live data jitter
      eqContainer.appendChild(bar);
      bars.push(bar);
    }

    // 3. Idle Animation (Anime.js)
    let eqAnimation = anime({
      targets: bars,
      height: () => anime.random(5, 35) + '%',
      easing: 'easeInOutQuad',
      duration: 800,
      delay: anime.stagger(40, {from: 'center'}),
      loop: true,
      direction: 'alternate'
    });

    // 4. Web Audio API Setup
    let audioCtx;
    let analyser;
    let dataArray;
    let isLive = false;
    let reqFrame;

    const setupAudio = () => {
      if (audioCtx) return; // Already setup
      
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser();
      
      audioElements.forEach(el => {
        const source = audioCtx.createMediaElementSource(el);
        source.connect(analyser);
      });
      analyser.connect(audioCtx.destination);
      
      analyser.fftSize = 128; // gives 64 bins
      const bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    };

    const renderFrame = () => {
      if (!isLive) return;
      reqFrame = requestAnimationFrame(renderFrame);
      
      analyser.getByteFrequencyData(dataArray);
      
      // Map the first 45 bins to our 45 bars
      for (let i = 0; i < numBars; i++) {
        // dataArray[i] is 0-255. Map it to a percentage 5% to 100%
        let val = dataArray[i];
        let percent = (val / 255) * 100;
        if (percent < 5) percent = 5; // Minimum height
        
        bars[i].style.height = percent + '%';
      }
    };

    // 5. Event Listeners
    audioElements.forEach(audioElement => {
      audioElement.addEventListener('play', () => {
        // Pause other audio elements to prevent overlapping sound
        audioElements.forEach(otherEl => {
          if (otherEl !== audioElement && !otherEl.paused) {
            otherEl.pause();
          }
        });

        eqAnimation.pause(); // Kill the idle anime.js animation
        
        // Remove inline heights set by anime.js so we can control them cleanly
        bars.forEach(bar => bar.style.height = '5%');

        setupAudio();
        
        // AudioContext might be in a suspended state (browser policy), so resume it
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        if (!isLive) {
          isLive = true;
          renderFrame();
        }
      });

      audioElement.addEventListener('pause', () => {
        const anyPlaying = Array.from(audioElements).some(el => !el.paused);
        if (!anyPlaying) {
          isLive = false;
          cancelAnimationFrame(reqFrame);
          
          // Restart the idle animation
          eqAnimation = anime({
            targets: bars,
            height: () => anime.random(5, 35) + '%',
            easing: 'easeInOutQuad',
            duration: 800,
            delay: anime.stagger(40, {from: 'center'}),
            loop: true,
            direction: 'alternate'
          });
        }
      });
    });
  }

  function initMixReviewForm() {
    const form = document.getElementById('mix-review-form');
    const status = document.getElementById('mix-review-status');
    if (!form || !status) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      status.textContent = 'Sending...';
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      const trackLink = payload.trackLink ? String(payload.trackLink).trim() : '';
      if (trackLink) payload.referenceLinks = [trackLink];
      delete payload.trackLink;

      try {
        const response = await fetch('/api/public/free-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to submit free review.');
        form.reset();
        status.textContent = 'Got it. Check your email for your project portal and upload instructions.';
      } catch (error) {
        status.textContent = error.message || 'Unable to submit free review.';
      }
    });
  }

  initMixReviewForm();

});
