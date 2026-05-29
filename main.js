/* ═══════════════════════════════════════════════════════
   SAMARAMBH — Main JavaScript
   Animations: Lenis (smooth scroll) + GSAP + ScrollTrigger
   ═══════════════════════════════════════════════════════ */

import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

document.addEventListener('DOMContentLoaded', () => {

  // ─── 0. Loader ───────────────────────────────────────
  const lenis = new Lenis({
    duration: 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.9,
  });
  lenis.stop();

  // SVG path draw animation — immediately
  const loaderPaths = document.querySelectorAll('.loader-logo path');
  loaderPaths.forEach(path => {
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
  });

  gsap.to(loaderPaths, {
    strokeDashoffset: 0,
    duration: 0.9,
    stagger: 0.05,
    ease: 'power2.inOut',
    onComplete() {
      gsap.to(loaderPaths, {
        fill: 'white',
        stroke: 'transparent',
        duration: 0.4,
        stagger: 0.04,
      });
    },
  });

  // Counter 0 → 100
  const counterEl = document.getElementById('loader-count');
  const counterObj = { val: 0 };
  gsap.to(counterObj, {
    val: 100,
    duration: 2.0,
    ease: 'power1.inOut',
    onUpdate() {
      counterEl.textContent = Math.round(counterObj.val);
    },
  });

  // Exit: left slides left, right slides right — after timer only (poster covers video gap)
  function exitLoader() {
    gsap.to('.loader-content', { opacity: 0, duration: 0.3, ease: 'power2.in' });
    gsap.to('.loader-left',  { x: '-100%', duration: 0.9, ease: 'power3.inOut', delay: 0.15 });
    gsap.to('.loader-right', {
      x: '100%', duration: 0.9, ease: 'power3.inOut', delay: 0.15,
      onComplete() {
        document.getElementById('loader').style.display = 'none';
        lenis.start();
        document.fonts.ready.then(() => {
          ScrollTrigger.refresh();
          requestAnimationFrame(() => {
            const nav = getNav();
            // On mobile the bar lives at the bottom — keep it hidden while hero is in view
            if (window.innerWidth > 600) nav?.classList.remove('hero-nav--hidden');
            // Set initial nav mode based on current scroll position (handles mid-page reloads)
            const heroSection = document.querySelector('.hero-section');
            const heroBottom = heroSection ? heroSection.getBoundingClientRect().bottom : 0;
            if (heroBottom <= 0) {
              nav?.classList.add('nav--dark');
            } else {
              nav?.classList.remove('nav--dark');
            }
          });
        });
      },
    });
  }

  setTimeout(exitLoader, 2000);


  // ─── 1. GSAP Plugin Registration ────────────────────
  gsap.registerPlugin(ScrollTrigger);


  // ─── 2. Lenis — connect to GSAP ticker ──────────────
  // Connect Lenis to GSAP ticker
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // ─── Nav lazy getter — nav is injected async by components.js ───
  // querySelector at DOMContentLoaded returns null; look it up on first use.
  let _navEl = null;
  const getNav = () => _navEl || (_navEl = document.querySelector('.hero-nav'));

  let _navLogoEl = null;
  const getNavLogo = () => _navLogoEl || (_navLogoEl = document.querySelector('.nav-logo'));

  // Smooth-scroll nav anchor links via Lenis (delegated — nav may not exist yet)
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('.hero-nav a[href^="#"]');
    if (!anchor) return;
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) lenis.scrollTo(target, { offset: 0 });
  });

  // ─── Hamburger menu (mobile) — delegated, nav injected async ──
  let _drawerEl = null;
  const getDrawer = () => _drawerEl || (_drawerEl = document.querySelector('.nav-drawer'));

  function openDrawer() {
    const nav    = getNav();
    const drawer = getDrawer();
    if (!nav || !drawer) return;
    nav.classList.add('nav--open');
    drawer.classList.add('is-open');
    nav.querySelector('.nav-hamburger')?.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    lenis.stop();
  }

  function closeDrawer() {
    const nav    = getNav();
    const drawer = getDrawer();
    if (!nav || !drawer) return;
    nav.classList.remove('nav--open');
    drawer.classList.remove('is-open');
    nav.querySelector('.nav-hamburger')?.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    lenis.start();
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('.nav-hamburger')) {
      const nav = getNav();
      if (nav?.classList.contains('nav--open')) closeDrawer();
      else openDrawer();
      return;
    }
    if (e.target.closest('.nav-drawer a')) {
      closeDrawer();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });


  // ─── 3. Hero section — pin + scrub track upward ──────
  const heroSection = document.querySelector('.hero-section');
  let heroST;
  if (heroSection) {
    const heroTrack = heroSection.querySelector('.hero-track');
    const heroTl = gsap.timeline({ paused: true });
    heroTl.to(heroTrack, {
      y: () => -(heroTrack.scrollHeight - heroSection.offsetHeight),
      ease: 'none',
    });

    heroST = ScrollTrigger.create({
      trigger: heroSection,
      start: 'top top',
      end: () => `+=${heroTrack.scrollHeight - heroSection.offsetHeight}`,
      pin: true,
      scrub: 1,
      animation: heroTl,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const nav = getNav();
        if (!nav) return;
        if (self.progress > 0) {
          nav.classList.add('hero-nav--hidden');
        } else {
          // At progress=0 hero is fully visible — keep nav hidden on mobile (bar is at bottom)
          if (window.innerWidth > 600) nav.classList.remove('hero-nav--hidden');
          nav.classList.remove('nav--dark');
          getNavLogo()?.classList.add('nav-logo--hidden');
        }
      },
      onLeave: () => {
        getNav()?.classList.remove('hero-nav--hidden');
        getNavLogo()?.classList.remove('nav-logo--hidden');
      },
      onLeaveBack: () => {
        // Scrolled back into hero — hide the bottom bar on mobile
        if (window.innerWidth > 600) getNav()?.classList.remove('hero-nav--hidden');
        else getNav()?.classList.add('hero-nav--hidden');
        getNavLogo()?.classList.add('nav-logo--hidden');
      },
    });
  }

  // ─── Nav hide on scroll down, show on scroll up ───
  let lastScroll = 0;
  lenis.on('scroll', ({ scroll }) => {
    const nav = getNav();
    if (!nav) return;

    if (scroll < 10) {
      // Always show at page top in light mode — even during refresh seek events.
      // On mobile the nav is at the bottom — keep it hidden while hero is in view.
      if (window.innerWidth > 600) nav.classList.remove('hero-nav--hidden');
      nav.classList.remove('nav--dark');
      getNavLogo()?.classList.add('nav-logo--hidden');
      lastScroll = scroll;
      return;
    }

    if (heroST && heroST.isActive) {
      // Hero zone: onUpdate handles hide/show
      lastScroll = scroll;
      return;
    }

    if (scroll > lastScroll) {
      if (window.innerWidth > 600) nav.classList.add('hero-nav--hidden');
    } else if (scroll < lastScroll) {
      nav.classList.remove('hero-nav--hidden');
    }
    lastScroll = scroll;
  });



  // ─── 4. Venues Showcase — Pinned Scroll + Slide-from-Top ──
  // • Section entrance: first image slides DOWN from above (y:-100%→0), scrubbed
  // • Pinned for 2× extra viewport height (3 venue steps total)
  // • Venue switch forward: incoming image slides from top, outgoing fades
  // • Venue switch backward: incoming image slides from bottom, outgoing fades
  // • Left progress line fills top→bottom across the full scroll

  const venuesSection  = document.querySelector('.venues-section');
  const venueSlides    = document.querySelectorAll('.venue-slide');
  const venueMainImgs  = document.querySelectorAll('.venue-main-img');
  const progressFill   = document.querySelector('.venues-progress-fill');
  const totalVenues    = venueSlides.length; // 3
  let currentVenueIdx  = 0;

  const venueTextSelectors = '.venue-slide-title, .venue-slide-desc, .venue-slide-secondary-img, .venue-slide-stats, .venue-slide-features';

  function switchVenue(idx) {
    if (idx === currentVenueIdx) return;

    const direction = idx > currentVenueIdx ? -1 : 1; // -1=forward(from top), 1=backward(from bottom)
    const fromY     = direction < 0 ? '-100%' : '100%';

    const outSlide = venueSlides[currentVenueIdx];
    const outImg   = venueMainImgs[currentVenueIdx];
    const inSlide  = venueSlides[idx];
    const inImg    = venueMainImgs[idx];

    // ── Outgoing slide (left panel) ────────────────────
    outSlide.classList.remove('is-active');
    gsap.to(outSlide, {
      opacity: 0, y: direction < 0 ? -12 : 12,
      duration: 0.2, ease: 'power2.in', overwrite: true,
      onComplete: () => gsap.set(outSlide, { y: 0 }),
    });

    // ── Outgoing image — fade out; incoming slides over it
    gsap.to(outImg, {
      opacity: 0, duration: 0.25, ease: 'power2.in', overwrite: true,
      onComplete: () => {
        outImg.classList.remove('is-active');
        gsap.set(outImg, { y: 0 }); // reset y so backward scroll reuses it correctly
      },
    });

    // ── Incoming slide (left panel) ────────────────────
    inSlide.classList.add('is-active');
    gsap.fromTo(inSlide,
      { opacity: 0, y: direction < 0 ? 16 : -16 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out', overwrite: true, delay: 0.05 }
    );

    // Staggered text reveal
    gsap.fromTo(inSlide.querySelectorAll(venueTextSelectors),
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: 'power3.out', overwrite: true, delay: 0.08 }
    );

    // ── Incoming image — slides from top (forward) or bottom (backward)
    inImg.classList.add('is-active');
    gsap.set(inImg, { zIndex: 1 }); // float above outgoing during slide
    gsap.fromTo(inImg,
      { y: fromY, opacity: 1 },
      {
        y: '0%', opacity: 1,
        duration: 0.55, ease: 'power3.out', overwrite: true,
        onComplete: () => {
          gsap.set(inImg,  { zIndex: 0 });
          gsap.set(outImg, { y: 0 }); // safety reset
        },
      }
    );

    currentVenueIdx = idx;
    if (window._venueSliderReset) window._venueSliderReset(idx);
  }

  if (venuesSection) {
    // ── 4a. Entrance: info panel slides up ─────────────
    gsap.fromTo('.venues-info-panel',
      { y: 60, opacity: 0 },
      {
        y: 0, opacity: 1, ease: 'none',
        scrollTrigger: {
          trigger: venuesSection,
          start: 'top 85%',
          end: 'top top',
          scrub: 1,
        },
      }
    );

    // ── 4b. Entrance: progress line fades in ───────────
    gsap.fromTo('.venues-progress-line',
      { opacity: 0 },
      {
        opacity: 1, ease: 'none',
        scrollTrigger: {
          trigger: venuesSection,
          start: 'top 85%',
          end: 'top 40%',
          scrub: 1,
        },
      }
    );

    // ── 4c. Entrance: first image slides from top ──────
    // Starts above the overflow:hidden container, scrubs down to y:0 as
    gsap.set(venueMainImgs[0], { y: '-100%', opacity: 1 });
    gsap.to(venueMainImgs[0], {
      y: '0%', ease: 'none',
      scrollTrigger: {
        trigger: venuesSection,
        start: 'top 90%',
        end: 'top top',
        scrub: 1,
      },
    });

    // ── 4d. Initialise first slide visible ─────────────
    venueSlides[0].classList.add('is-active');
    venueMainImgs[0].classList.add('is-active');
    gsap.set(venueSlides[0], { opacity: 1, y: 0 });
    // venueMainImgs[0] y is owned by the entrance scrub above — do not override

    // ── 4e. Pin + progress bar + venue switching ───────
    let _lastVenueIdx = -1;
    const venueST = ScrollTrigger.create({
      trigger: venuesSection,
      start: 'top top',
      end: () => `+=${window.innerHeight * (totalVenues - 1)}`,
      pin: '.venues-sticky',
      pinSpacing: true,
      onUpdate: (self) => {
        progressFill.style.transform = window.innerWidth <= 768
          ? `scaleX(${self.progress})`
          : `scaleY(${self.progress})`;

        const idx = Math.min(
          Math.floor(self.progress * totalVenues),
          totalVenues - 1
        );
        if (idx !== _lastVenueIdx) {
          _lastVenueIdx = idx;
          switchVenue(idx);
        }
      },
    });

    // ── 4f. One-scroll-per-venue via lenis.scrollTo ──────
    // GSAP snap conflicts with Lenis — both try to own window.scrollY
    // simultaneously, causing visible reverse scroll. Instead, intercept
    // wheel events while pinned and drive scroll exclusively through Lenis.
    let _venueWheelLocked = false;

    window.addEventListener('wheel', (e) => {
      if (!venueST) return;
      const progress = venueST.progress;
      // Not in the pinned zone
      if (progress <= 0 && e.deltaY < 0) return;
      if (progress >= 1 && e.deltaY > 0) return;
      if (progress < 0 || progress > 1) return;

      // Check scroll position is actually within the pinned range
      const scrollY = window.scrollY;
      if (scrollY < venueST.start - 20 || scrollY > venueST.end + 20) return;

      const targetIdx = e.deltaY > 0
        ? Math.min(currentVenueIdx + 1, totalVenues - 1)
        : Math.max(currentVenueIdx - 1, 0);

      if (targetIdx === currentVenueIdx) return;
      if (_venueWheelLocked) { e.preventDefault(); return; }

      e.preventDefault();
      _venueWheelLocked = true;

      const sectionTop = venuesSection.getBoundingClientRect().top + window.scrollY;
      const targetScroll = sectionTop + (targetIdx / (totalVenues - 1)) * window.innerHeight * (totalVenues - 1);

      lenis.scrollTo(targetScroll, {
        duration: 0.7,
        easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        onComplete: () => { _venueWheelLocked = false; },
      });
    }, { passive: false });
  }


  // ─── 5. Per-venue image sliders ──────────────────────
  // Pagination bars are siblings of .venue-main-img (not children) so they
  // sit at z-index:20 above all GSAP-animated layers and always receive clicks.
  const SLIDE_DURATION = 3000;
  const sliderPanel = document.querySelector('.venues-main-img-panel');

  if (sliderPanel) {
    const venueImgEls   = [...sliderPanel.querySelectorAll('.venue-main-img')];
    const paginationEls = [...sliderPanel.querySelectorAll('.venue-slider-pagination')];
    const sliderStates  = [];

    venueImgEls.forEach((venueImg, venueIdx) => {
      const slides = venueImg.querySelectorAll('.venue-slider-slide');
      const dots   = paginationEls[venueIdx]
                       ? paginationEls[venueIdx].querySelectorAll('.venue-slider-dot')
                       : [];
      if (!slides.length) return;

      const state = { current: 0, timer: null };

      function activateDot(dot) {
        [...dots].forEach(d => d.classList.remove('is-active'));
        dot.classList.remove('is-active');
        requestAnimationFrame(() => dot.classList.add('is-active'));
      }

      function goTo(idx) {
        const outSlide = slides[state.current];
        outSlide.classList.remove('is-active');
        outSlide.classList.add('is-prev');
        setTimeout(() => {
          outSlide.style.transition = 'none';
          void outSlide.offsetWidth; // force reflow so browser commits transition:none before class change
          outSlide.classList.remove('is-prev');
          requestAnimationFrame(() => requestAnimationFrame(() => { outSlide.style.transition = ''; }));
        }, 650);

        state.current = (idx + slides.length) % slides.length;
        slides[state.current].classList.remove('is-prev');
        slides[state.current].classList.add('is-active');
        if (dots[state.current]) activateDot(dots[state.current]);
      }

      function startTimer() {
        clearInterval(state.timer);
        state.timer = setInterval(() => goTo(state.current + 1), SLIDE_DURATION);
      }

      function stopTimer() {
        clearInterval(state.timer);
        state.timer = null;
      }

      function reset() {
        stopTimer();
        goTo(0);
        startTimer();
      }

      state.goTo       = goTo;
      state.startTimer = startTimer;
      state.stopTimer  = stopTimer;
      state.reset      = reset;
      sliderStates[venueIdx] = state;

      // Only venue 0 starts immediately — others triggered by switchVenue
      if (venueIdx === 0) {
        if (dots[0]) activateDot(dots[0]);
        startTimer();
      }
    });

    // Called by switchVenue() on every venue change
    window._venueSliderReset = (idx) => {
      sliderStates.forEach((s, i) => { if (i !== idx) s.stopTimer(); });
      if (sliderStates[idx]) sliderStates[idx].reset();
      paginationEls.forEach((p, i) => p.classList.toggle('is-visible', i === idx));
    };

    // Delegated click on panel — pagination bars are direct children so
    // events bubble up without passing through any GSAP-managed element
    sliderPanel.addEventListener('click', (e) => {
      const pagination = e.target.closest('.venue-slider-pagination');
      if (!pagination) return;
      const venueIdx = parseInt(pagination.dataset.venue, 10);
      const state    = sliderStates[venueIdx];
      if (!state) return;

      const dot = e.target.closest('.venue-slider-dot');

      if (dot) {
        const dotEls = [...pagination.querySelectorAll('.venue-slider-dot')];
        const idx    = dotEls.indexOf(dot);
        if (idx !== -1) { state.goTo(idx); state.startTimer(); }
      }
    });
  }


  // ─── 6. Moments Sections — Gallery-Style Pinned Scroll ──
  // Section pins to viewport, image grid scrubs upward, title stays fixed at top.
  // Desktop only — mobile uses a plain 2-col CSS grid (no pinning needed, and
  // pinSpacing spacers on mobile shift the DOM positions of Find Us / Gallery,
  // causing scroll jumps near those sections).
  if (window.innerWidth > 900) {
    document.querySelectorAll('.moments-scroll-section').forEach(section => {
      const grid = section.querySelector('.gp-pin-grid');
      if (!grid) return;

      const getScrollDist = () => grid.scrollHeight - (window.visualViewport?.height ?? window.innerHeight);

      const tl = gsap.timeline({ paused: true });
      tl.to(grid, {
        y: () => -getScrollDist(),
        ease: 'none',
      });

      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => `+=${getScrollDist()}`,
        pin: true,
        pinSpacing: true,
        scrub: true,
        animation: tl,
        invalidateOnRefresh: true,
        onRefresh(self) {
          // If grid is shorter than viewport, kill this trigger to avoid phantom spacing
          if (getScrollDist() <= 0) self.kill();
        },
      });
    });
  }

  // iOS address bar show/hide fires visualViewport.resize, not window.resize,
  // so window.resize-based invalidateOnRefresh misses it — refresh manually.
  // Debounced so mid-scroll address-bar transitions don't trigger rapid recalculations.
  if (window.visualViewport) {
    let _vpRefreshTimer;
    window.visualViewport.addEventListener('resize', () => {
      clearTimeout(_vpRefreshTimer);
      _vpRefreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150);
    });
  }


  // ─── Experience Section — 3 discrete reveal stops ────
  // Desktop (>900px): wheel-driven. Mobile (≤900px): touch-driven.
  const expSection = document.querySelector('.experience-section');
  if (expSection && window.innerWidth > 900) {
    const expVideo = expSection.querySelector('video');
    const line1  = expSection.querySelector('.exp-line--1');
    const line2  = expSection.querySelector('.exp-line--2');
    const cvTop  = expSection.querySelector('.exp-cover--top');
    const cvBot  = expSection.querySelector('.exp-cover--bottom');
    const cvLeft = expSection.querySelector('.exp-cover--left');
    const cvRt   = expSection.querySelector('.exp-cover--right');

    const STATES = [
      { h: 50,    w: 50    },   // 0: fully covered
      { h: 43.00, w: 43.75 },   // 1: 15% revealed
      { h: 26.67, w: 29.17 },   // 2: 50% revealed
      { h: 3.333, w: 0 },       // 3: 100% revealed — left/right fully open, top/bottom at padding edge
    ];
    const TOTAL = 3;
    let stopIdx    = 0;
    let isAnimating = false;
    let expActive   = false;
    let expST;

    // Lerp state for cover panels — velocity-driven dynamic lerp
    const LERP_MIN = 0.14;       // lerp factor at slowest scroll
    const LERP_MAX = 0.32;       // lerp factor at fastest scroll
    const SETTLE_THRESHOLD = 0.015;  // % — stop ticking when this close to target
    let curH = 50, curW = 50;    // current interpolated values
    let tgtH = 50, tgtW = 50;   // target values from STATES
    let velocity = 0;            // accumulated scroll velocity, decays each frame
    let lerpTicker = null;

    // When set, text y/opacity is driven frame-by-frame in sync with cover lerp
    let textSync = null;

    function startLerp() {
      if (lerpTicker) return;
      lerpTicker = gsap.ticker.add(() => {
        velocity *= 0.80; // decay each frame — natural momentum trail-off
        const dynamicLerp = LERP_MIN + velocity * (LERP_MAX - LERP_MIN);
        curH += (tgtH - curH) * dynamicLerp;
        curW += (tgtW - curW) * dynamicLerp;

        gsap.set([cvTop, cvBot], { height: `${curH}%` });
        gsap.set([cvLeft, cvRt],  { width:  `${curW}%` });

        // Drive text in lockstep with cover position
        if (textSync) {
          const range = textSync.startH - textSync.endH;
          const progress = range === 0 ? 1 : Math.min(1, (textSync.startH - curH) / range);
          const t = progress * progress * progress; // power3 curve — slow start, progressive
          gsap.set(line1, {
            y: textSync.y1start + (textSync.y1end - textSync.y1start) * t,
            opacity: 1 - t,
          });
          gsap.set(line2, {
            y: textSync.y2start + (textSync.y2end - textSync.y2start) * t,
            opacity: 1 - t,
          });
          if (progress >= 1) {
            gsap.set([line1, line2], { visibility: 'hidden' });
            textSync = null;
          }
        }

        const doneH = Math.abs(tgtH - curH) < SETTLE_THRESHOLD;
        const doneW = Math.abs(tgtW - curW) < SETTLE_THRESHOLD;
        if (doneH && doneW) {
          // Snap to exact target and stop ticking
          gsap.set([cvTop, cvBot], { height: `${tgtH}%` });
          gsap.set([cvLeft, cvRt],  { width:  `${tgtW}%` });
          curH = tgtH; curW = tgtW;
          gsap.ticker.remove(lerpTicker);
          lerpTicker = null;
          isAnimating = false;
        }
      });
    }

    function goTo(idx) {
      if (isAnimating || idx === stopIdx) return;
      const prev = stopIdx;
      stopIdx = idx;
      isAnimating = true;

      const s = STATES[idx];
      tgtH = s.h;
      tgtW = s.w;
      startLerp();

      // Text animations via GSAP (unchanged, discrete)
      // Stop 0→1: slight nudge — progressive ease matches cover lerp ramp
      if (prev === 0 && idx === 1) {
        gsap.to(line1, { y: -40, ease: 'power3.inOut', duration: 0.55 });
        gsap.to(line2, { y:  40, ease: 'power3.inOut', duration: 0.55 });
      }
      // Stop 1→2: drive text in sync with cover lerp
      // endH is snapshotted so progress is unaffected by later tgtH changes (stops 3/4)
      if (prev === 1 && idx === 2) {
        textSync = { startH: curH, endH: tgtH, y1start: -40, y1end: -110, y2start: 40, y2end: 110 };
      }
      // Stop 3/4: guarantee text is hidden regardless of textSync state
      if (idx >= 3) {
        textSync = null;
        gsap.set([line1, line2], { opacity: 0, visibility: 'hidden' });
      }
      // Back 2→1: cancel any active sync, slide back to nudged positions
      if (prev >= 2 && idx === 1) {
        textSync = null;
        gsap.set([line1, line2], { visibility: 'visible' });
        gsap.to(line1, { y: -40, opacity: 1, ease: 'expo.out', duration: 0.35 });
        gsap.to(line2, { y:  40, opacity: 1, ease: 'expo.out', duration: 0.35 });
      }
      // Back to 0: full reset — progressive ease back to origin
      if (prev > 0 && idx === 0) {
        gsap.set([line1, line2], { visibility: 'visible' });
        gsap.to(line1, { y: 0, opacity: 1, ease: 'power3.inOut', duration: 0.5 });
        gsap.to(line2, { y: 0, opacity: 1, ease: 'power3.inOut', duration: 0.5 });
      }
    }

    expST = ScrollTrigger.create({
      trigger: expSection,
      start: 'top top',
      end: () => `+=${window.innerHeight * (TOTAL + 1)}`,  // 5×vh: 4 stops + release space
      pin: true,
      pinSpacing: true,
      invalidateOnRefresh: true,
      onEnter:     () => { expActive = true;  expVideo?.play(); },
      onLeave:     () => { expActive = false; expVideo?.pause(); },
      onEnterBack: () => { expActive = true;  expVideo?.play(); },
      onLeaveBack: () => {
        expActive = false;
        expVideo?.pause();
        // Hard-reset covers instantly when scrolling back above section
        if (lerpTicker) { gsap.ticker.remove(lerpTicker); lerpTicker = null; }
        curH = 50; curW = 50; tgtH = 50; tgtW = 50;
        gsap.set([cvTop, cvBot], { height: '50%' });
        gsap.set([cvLeft, cvRt],  { width:  '50%' });
        gsap.set([line1, line2], { y: 0, opacity: 1, visibility: 'visible' });
        stopIdx = 0; isAnimating = false;
      },
    });

    // One wheel gesture = one step, magnitude ignored.
    // Avoids GSAP snap vs Lenis scroll-position conflicts.
    let wheelCooldown = false;

    window.addEventListener('wheel', (e) => {
      if (!expActive) return;

      const dir  = e.deltaY > 0 ? 1 : -1;
      const next = stopIdx + dir;

      // Backward past start — let Lenis naturally scroll above the section
      if (next < 0) return;

      // Forward past stop 4 — controlled single-scroll exit to prevent momentum overshoot
      if (next > TOTAL) {
        e.preventDefault();
        if (!wheelCooldown) {
          lenis.scrollTo(expST.end + 10, { duration: 0.4 });
          wheelCooldown = true;
          setTimeout(() => { wheelCooldown = false; }, 500);
        }
        return;
      }

      e.preventDefault();
      if (isAnimating || wheelCooldown) return;

      velocity = Math.min(1.0, velocity + Math.abs(e.deltaY) * 0.006);
      goTo(next);

      // Sync underlying scroll to this stop's proportional position.
      // Section is pinned so this causes no visible scroll movement.
      const syncPos = expST.start + (next / (TOTAL + 1)) * (expST.end - expST.start);
      lenis.scrollTo(syncPos, { immediate: true });

      wheelCooldown = true;
      setTimeout(() => { wheelCooldown = false; }, 550);
    }, { passive: false });

  } else if (expSection) {
    // ─── Experience Section — Mobile (≤900px) ─────────
    const expVideo = expSection.querySelector('video');
    const line1  = expSection.querySelector('.exp-line--1');
    const line2  = expSection.querySelector('.exp-line--2');
    const cvTop  = expSection.querySelector('.exp-cover--top');
    const cvBot  = expSection.querySelector('.exp-cover--bottom');
    const cvLeft = expSection.querySelector('.exp-cover--left');
    const cvRt   = expSection.querySelector('.exp-cover--right');

    const STATES = [
      { h: 50,    w: 50    },   // 0: fully covered
      { h: 43.00, w: 43.75 },   // 1: 15% revealed
      { h: 26.67, w: 29.17 },   // 2: 50% revealed
      { h: 3.333, w: 0 },       // 3: 100% revealed — left/right fully open, top/bottom at padding edge
    ];
    const TOTAL = 3;
    let stopIdx     = 0;
    let isAnimating = false;
    let expActive   = false;
    let expST;

    const LERP_MIN = 0.14;
    const LERP_MAX = 0.32;
    const SETTLE_THRESHOLD = 0.015;
    let curH = 50, curW = 50;
    let tgtH = 50, tgtW = 50;
    let velocity = 0;
    let lerpTicker = null;
    let textSync = null;

    function startLerpM() {
      if (lerpTicker) return;
      lerpTicker = gsap.ticker.add(() => {
        velocity *= 0.80;
        const dynamicLerp = LERP_MIN + velocity * (LERP_MAX - LERP_MIN);
        curH += (tgtH - curH) * dynamicLerp;
        curW += (tgtW - curW) * dynamicLerp;

        gsap.set([cvTop, cvBot], { height: `${curH}%` });
        gsap.set([cvLeft, cvRt],  { width:  `${curW}%` });

        if (textSync) {
          const range    = textSync.startH - textSync.endH;
          const progress = range === 0 ? 1 : Math.min(1, (textSync.startH - curH) / range);
          const t        = progress * progress * progress;
          gsap.set(line1, { y: textSync.y1start + (textSync.y1end - textSync.y1start) * t, opacity: 1 - t });
          gsap.set(line2, { y: textSync.y2start + (textSync.y2end - textSync.y2start) * t, opacity: 1 - t });
          if (progress >= 1) {
            gsap.set([line1, line2], { visibility: 'hidden' });
            textSync = null;
          }
        }

        const doneH = Math.abs(tgtH - curH) < SETTLE_THRESHOLD;
        const doneW = Math.abs(tgtW - curW) < SETTLE_THRESHOLD;
        if (doneH && doneW) {
          gsap.set([cvTop, cvBot], { height: `${tgtH}%` });
          gsap.set([cvLeft, cvRt],  { width:  `${tgtW}%` });
          curH = tgtH; curW = tgtW;
          gsap.ticker.remove(lerpTicker);
          lerpTicker = null;
          isAnimating = false;
        }
      });
    }

    function goToM(idx) {
      if (isAnimating || idx === stopIdx) return;
      const prev = stopIdx;
      stopIdx = idx;
      isAnimating = true;
      tgtH = STATES[idx].h;
      tgtW = STATES[idx].w;
      startLerpM();

      if (prev === 0 && idx === 1) {
        gsap.to(line1, { y: -40, ease: 'power3.inOut', duration: 0.55 });
        gsap.to(line2, { y:  40, ease: 'power3.inOut', duration: 0.55 });
      }
      if (prev === 1 && idx === 2) {
        textSync = { startH: curH, endH: tgtH, y1start: -40, y1end: -110, y2start: 40, y2end: 110 };
      }
      if (idx >= 3) {
        textSync = null;
        gsap.set([line1, line2], { opacity: 0, visibility: 'hidden' });
      }
      if (prev >= 2 && idx === 1) {
        textSync = null;
        gsap.set([line1, line2], { visibility: 'visible' });
        gsap.to(line1, { y: -40, opacity: 1, ease: 'expo.out', duration: 0.35 });
        gsap.to(line2, { y:  40, opacity: 1, ease: 'expo.out', duration: 0.35 });
      }
      if (prev > 0 && idx === 0) {
        gsap.set([line1, line2], { visibility: 'visible' });
        gsap.to(line1, { y: 0, opacity: 1, ease: 'power3.inOut', duration: 0.5 });
        gsap.to(line2, { y: 0, opacity: 1, ease: 'power3.inOut', duration: 0.5 });
      }
    }

    expST = ScrollTrigger.create({
      trigger: expSection,
      start: 'top top',
      end: () => `+=${window.innerHeight * (TOTAL + 1)}`,
      pin: true,
      pinSpacing: true,
      invalidateOnRefresh: true,
      onEnter:     () => { expActive = true;  expVideo?.play(); },
      onLeave:     () => { expActive = false; expVideo?.pause(); },
      onEnterBack: () => { expActive = true;  expVideo?.play(); },
      onLeaveBack: () => {
        expActive = false;
        expVideo?.pause();
        if (lerpTicker) { gsap.ticker.remove(lerpTicker); lerpTicker = null; }
        curH = 50; curW = 50; tgtH = 50; tgtW = 50;
        gsap.set([cvTop, cvBot], { height: '50%' });
        gsap.set([cvLeft, cvRt],  { width:  '50%' });
        gsap.set([line1, line2], { y: 0, opacity: 1, visibility: 'visible' });
        stopIdx = 0; isAnimating = false;
      },
    });

    // Touch: one swipe = one step. Minimum 40px vertical movement required.
    // touchmove must be passive:false to call preventDefault (blocks native scroll
    // during pinned swipes). touchstart/end can stay passive for performance.
    const SWIPE_THRESHOLD = 40;
    let touchStartY   = null;
    let touchCooldown = false;

    expSection.addEventListener('touchstart', (e) => {
      if (!expActive) return;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    expSection.addEventListener('touchmove', (e) => {
      if (!expActive || touchStartY === null) return;
      e.preventDefault();
    }, { passive: false });

    expSection.addEventListener('touchend', (e) => {
      if (!expActive || touchStartY === null) return;
      const dy = touchStartY - e.changedTouches[0].clientY; // positive = swipe up
      touchStartY = null;
      if (Math.abs(dy) < SWIPE_THRESHOLD) return;

      const dir  = dy > 0 ? 1 : -1;
      const next = stopIdx + dir;

      if (next < 0) return;

      if (next > TOTAL) {
        if (!touchCooldown) {
          expActive = false;
          lenis.scrollTo(expST.end + 1, { immediate: true });
          touchCooldown = true;
          setTimeout(() => { touchCooldown = false; }, 500);
        }
        return;
      }

      if (isAnimating || touchCooldown) return;

      velocity = 0.5;
      goToM(next);

      touchCooldown = true;
      setTimeout(() => { touchCooldown = false; }, 550);
    }, { passive: true });

    let wheelCooldownM = false;

    window.addEventListener('wheel', (e) => {
      if (!expActive) return;

      const dir  = e.deltaY > 0 ? 1 : -1;
      const next = stopIdx + dir;

      if (next < 0) return;

      if (next > TOTAL) {
        e.preventDefault();
        if (!wheelCooldownM) {
          lenis.scrollTo(expST.end + 10, { duration: 0.4 });
          wheelCooldownM = true;
          setTimeout(() => { wheelCooldownM = false; }, 500);
        }
        return;
      }

      e.preventDefault();
      if (isAnimating || wheelCooldownM) return;

      velocity = Math.min(1.0, velocity + Math.abs(e.deltaY) * 0.006);
      goToM(next);

      wheelCooldownM = true;
      setTimeout(() => { wheelCooldownM = false; }, 550);
    }, { passive: false });
  }


  // ─── 6. Services — Pin section, scrub cards upward ──────
  if (window.innerWidth > 900) {
    const svcSection = document.querySelector('.svc-section');
    if (svcSection) {
      const svcWrap = svcSection.querySelector('.svc-cards-wrap');
      const svcHeading = svcSection.querySelector('.svc-heading');

      const svcTl = gsap.timeline({ paused: true });
      svcTl.to(svcWrap, {
        y: () => -(svcWrap.scrollHeight - (svcSection.offsetHeight - svcHeading.offsetHeight)),
        ease: 'none',
      });

      ScrollTrigger.create({
        trigger: svcSection,
        start: 'top top',
        end: () => `+=${svcWrap.scrollHeight - (svcSection.offsetHeight - svcHeading.offsetHeight)}`,
        pin: true,
        scrub: 1,
        animation: svcTl,
        invalidateOnRefresh: true,
      });
    }
  }


  // ─── 7a. Word-split DOM prep ─────────────────────────
  // DOM mutation must happen early so layout is correct when pins are set up.
  function splitWords(el) {
    if (el.dataset.wordsSplit) return;
    el.dataset.wordsSplit = '1';
    const rawHTML = el.innerHTML.replace(/&#10;/g, '<br>');
    el.innerHTML = rawHTML.replace(
      /([^\s<>]+)/g,
      '<div class="word-line"><span class="word">$1</span></div>'
    );
  }

  gsap.utils.toArray('.reveal-words').forEach(el => splitWords(el));

  // ─── 7. Text Reveal with GSAP ScrollTrigger ──────────
  // Replaces IntersectionObserver (unreliable with Lenis).
  // GSAP ScrollTrigger integrates properly via
  // lenis.on('scroll', ScrollTrigger.update).

  if (window.innerWidth > 600) {
    gsap.utils.toArray('.reveal-text').forEach(el => {
      gsap.fromTo(el,
        { clipPath: 'inset(0 100% 0 0)' },
        {
          clipPath: 'inset(0 0% 0 0)',
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none',
          }
        }
      );
    });
  }

  gsap.utils.toArray('.reveal-fade, .reveal-fade-delay').forEach(el => {
    gsap.fromTo(el,
      { opacity: 0, y: 24 },
      {
        opacity: 1, y: 0,
        duration: 0.9,
        delay: el.classList.contains('reveal-fade-delay') ? 0.2 : 0,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        }
      }
    );
  });


  // ─── 7. Scroll Button ────────────────────────────────
  // Static element — no rotation animation per Figma spec.


  // ─── Nav dark/light mode by section ─────────────────

  // Dark text: hero unpins → entering cream bg venues section
  ScrollTrigger.create({
    trigger: '.venues-section',
    start: 'top top',
    onEnter:      () => getNav()?.classList.add('nav--dark'),
    onEnterBack:  () => getNav()?.classList.remove('nav--dark'),
  });

  // Venues section has cream bg → nav--dark stays active (inherited from above).
  // Moments wrapper also has cream bg → nav--dark stays.
  // Experience section also has cream bg initially — keep nav dark.
  ScrollTrigger.create({
    trigger: '.experience-section',
    start: 'top top',
    onEnter:     () => getNav()?.classList.add('nav--dark'),
    onEnterBack: () => getNav()?.classList.add('nav--dark'),
  });

  // Services and reviews — light-bg sections needing dark nav.
  // Each trigger explicitly adds nav--dark on both enter directions so
  // scrolling back up through these sections never reverts to light text.
  ['.svc-section', '.rv-section'].forEach(sel => {
    ScrollTrigger.create({
      trigger: sel,
      start: 'top top',
      onEnter:     () => getNav()?.classList.add('nav--dark'),
      onLeaveBack: () => getNav()?.classList.add('nav--dark'),
    });
  });

  // Gallery and beyond — keep dark nav; do NOT remove on leave-back because
  // reviews/services above also need dark nav (handled above).
  ScrollTrigger.create({
    trigger: '.gallery-section',
    start: 'top top',
    onEnter:     () => getNav()?.classList.add('nav--dark'),
    onLeaveBack: () => getNav()?.classList.add('nav--dark'),
  });



  // ─── Reviews — pin section, scrub cards upward ────────
  // On mobile (≤900px) CSS stacks to column with height:auto; skip pinning.
  const rvSection = document.querySelector('.rv-section');
  if (rvSection && window.innerWidth > 900) {
    const rvTrack = rvSection.querySelector('.rv-track');

    const rvTl = gsap.timeline({ paused: true });
    rvTl.to(rvTrack, {
      y: () => -(rvTrack.scrollHeight - rvSection.offsetHeight),
      ease: 'none',
    });

    ScrollTrigger.create({
      trigger: rvSection,
      start: 'top top',
      end: () => `+=${rvTrack.scrollHeight - rvSection.offsetHeight}`,
      pin: true,
      scrub: 1,
      animation: rvTl,
      invalidateOnRefresh: true,
    });
  }

  // ─── FAQ — pin section, scrub track upward ───────────
  // On mobile (≤900px) CSS stacks to column with height:auto; skip pinning.
  const faqSection = document.querySelector('.faq-section');
  if (faqSection && window.innerWidth > 900) {
    const faqTrack = faqSection.querySelector('.faq-track');

    const faqTl = gsap.timeline({ paused: true });
    faqTl.to(faqTrack, {
      y: () => -(faqTrack.scrollHeight - faqSection.offsetHeight),
      ease: 'none',
    });

    ScrollTrigger.create({
      trigger: faqSection,
      start: 'top top',
      end: () => `+=${faqTrack.scrollHeight - faqSection.offsetHeight}`,
      pin: true,
      scrub: 1,
      animation: faqTl,
      invalidateOnRefresh: true,
    });
  }

  // ─── Social section — parallax columns ──────────────
  const socialSection = document.querySelector('.social-section');
  if (socialSection) {
    const cols = socialSection.querySelectorAll('.social-col');
    const isMobile = window.innerWidth <= 900;

    if (!isMobile) {
      // Desktop: cols 1,3,5 scroll slowly; cols 2,4 scroll fast
      gsap.to([cols[0], cols[2], cols[4]], {
        y: -60,
        ease: 'none',
        scrollTrigger: {
          trigger: socialSection,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.5,
        },
      });
      gsap.to([cols[1], cols[3]], {
        y: -180,
        ease: 'none',
        scrollTrigger: {
          trigger: socialSection,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.5,
        },
      });
    } else {
      // Mobile: cols 2&3 are hidden; col 1 and 5 scroll slowly, col 4 scrolls fast
      gsap.to([cols[0], cols[4]], {
        y: -50,
        ease: 'none',
        scrollTrigger: {
          trigger: socialSection,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.5,
        },
      });
      gsap.to(cols[3], {
        y: -120,
        ease: 'none',
        scrollTrigger: {
          trigger: socialSection,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.5,
        },
      });
    }
  }

  // ─── Reviews — Swiper slider on mobile ───────────────
  // Initialized on 'load' so the Swiper CDN script (non-module) is guaranteed to have run.
  if (window.innerWidth <= 900) {
    const initReviewSwiper = () => {
      if (typeof Swiper !== 'undefined') {
        new Swiper('.rv-swiper', {
          slidesPerView: 1.2,
          spaceBetween: 16,
          grabCursor: true,
          touchStartPreventDefault: false,
          touchAngle: 30,
          threshold: 10,
        });
      }
    };
    if (document.readyState === 'complete') {
      initReviewSwiper();
    } else {
      window.addEventListener('load', initReviewSwiper, { once: true });
    }
  }

  // ─── Mobile bottom nav — hide over hero & footer ───
  // On mobile the nav floats at the bottom. Hide it when the hero or footer is in view.
  if (window.innerWidth <= 600) {
    // Hide immediately on load — hero is in view at page top.
    getNav()?.classList.add('hero-nav--hidden');

    // Footer is injected async by components.js — wait for load to query it.
    window.addEventListener('load', () => {
      const footerEl = document.querySelector('.site-footer');
      if (!footerEl) return;
      ScrollTrigger.create({
        trigger: footerEl,
        start: 'top bottom',
        onEnter:     () => getNav()?.classList.add('hero-nav--hidden'),
        onLeaveBack: () => getNav()?.classList.remove('hero-nav--hidden'),
      });
    }, { once: true });
  }

  // ─── Footer reveal — async-injected, must wait for load ─
  window.addEventListener('load', () => {
    const footerInner = document.querySelector('.footer-inner');
    if (!footerInner) return;

    footerInner.querySelectorAll('.footer-heading-line').forEach(el => splitWords(el));

    const star         = footerInner.querySelector('.footer-decoration-star');
    const lines        = footerInner.querySelectorAll('.footer-decoration-line');
    const headingWords = footerInner.querySelectorAll('.footer-heading-line .word');
    const cta          = footerInner.querySelector('.footer-cta');

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: footerInner,
        start: 'top 75%',
        toggleActions: 'play none none none',
      },
      defaults: { ease: 'power3.out' },
    });

    tl.fromTo(star,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
    );
    tl.fromTo(lines,
      { scaleX: 0 },
      { scaleX: 1, duration: 0.5, transformOrigin: 'center center' },
      '-=0.1'
    );
    tl.addLabel('heading', '-=0.1');
    tl.fromTo(headingWords,
      { y: '100%' },
      { y: '0%', duration: 0.45, stagger: 0.025 },
      'heading'
    );
    tl.fromTo(cta,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4 },
      '-=0.1'
    );

  }, { once: true });

  // ─── 7b. Heading block reveal (.reveal-heading) ──────
  // Registered here — after all pin spacers — so scroll positions are accurate.
  gsap.utils.toArray('.reveal-heading').forEach(el => {
    const triggerEl = el.querySelector('h2') || el;
    gsap.fromTo(el,
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: triggerEl,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );
  });

  // ─── 7c. Word slide-up (.reveal-words) ───────────────
  gsap.utils.toArray('.reveal-words').forEach(el => {
    const words = el.querySelectorAll('.word');
    if (!words.length) return;
    gsap.fromTo(words,
      { y: '100%' },
      {
        y: '0%',
        duration: 0.75,
        ease: 'power3.out',
        stagger: 0.04,
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );
  });

  // ─── Floating Contact Button — hide during hero and footer ───────────────
  const floatingBtn = document.querySelector('.floating-contact-btn');
  if (floatingBtn) {
    floatingBtn.classList.add('floating-contact-btn--hidden');

    let cachedFooter = null;

    lenis.on('scroll', () => {
      const inHero = heroST && heroST.isActive;

      if (!cachedFooter) cachedFooter = document.querySelector('.site-footer');
      const footerRect = cachedFooter ? cachedFooter.getBoundingClientRect() : null;
      const inFooter = footerRect && footerRect.top < window.innerHeight;

      floatingBtn.classList.toggle('floating-contact-btn--hidden', inHero || inFooter);
    });
  }

  // Safety refresh — all pin spacers now in DOM; force recalculation of all trigger positions
  ScrollTrigger.refresh();

});
