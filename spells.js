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
  const cards = document.querySelectorAll('.card');
  
  // Set initial invisible state for cards
  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(50px)';
  });

  // Helper to create an observer for a specific grid container
  const createBentoObserver = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const observer = new IntersectionObserver((entries, obs) => {
      const isVisible = entries.some(entry => entry.isIntersecting);
      if (isVisible) {
        anime({
          targets: `#${containerId} .card`,
          translateY: [50, 0],
          opacity: [0, 1],
          easing: 'spring(1, 80, 10, 0)',
          delay: anime.stagger(150), // Each card drops 150ms after the last
          duration: 1000
        });
        obs.disconnect();
      }
    }, { threshold: 0.1 });

    observer.observe(container);
  };

  createBentoObserver('card-container');
  createBentoObserver('fat-footer');


  // =========================================
  // SPELL 3: TRUE REAL-TIME SPECTRUM ANALYZER
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

});
