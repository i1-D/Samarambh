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
    duration: 1.2,
    stagger: 0.07,
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
    duration: 2.6,
    ease: 'power1.inOut',
    onUpdate() {
      counterEl.textContent = Math.round(counterObj.val);
    },
  });

  // Exit: left slides left, right slides right — after ≥3s AND video loaded
  const heroVideo = document.querySelector('.hero-video-bg video');
  let videoReady = heroVideo ? heroVideo.readyState >= 4 : true;
  let timerDone  = false;

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
            nav?.classList.remove('hero-nav--hidden');
            nav?.classList.remove('nav--dark');
          });
        });
      },
    });
  }

  function tryExit() {
    if (videoReady && timerDone) exitLoader();
  }

  if (heroVideo) {
    heroVideo.addEventListener('canplaythrough', () => {
      videoReady = true;
      tryExit();
    }, { once: true });
  }

  setTimeout(() => {
    timerDone = true;
    tryExit();
  }, 3000);


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
          nav.classList.remove('hero-nav--hidden');
          nav.classList.remove('nav--dark');
          getNavLogo()?.classList.add('nav-logo--hidden');
        }
      },
      onLeave: () => {
        getNav()?.classList.remove('hero-nav--hidden');
        getNavLogo()?.classList.remove('nav-logo--hidden');
      },
      onLeaveBack: () => {
        getNav()?.classList.remove('hero-nav--hidden');
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
      // Always show at page top in light mode — even during refresh seek events
      nav.classList.remove('hero-nav--hidden');
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
      nav.classList.add('hero-nav--hidden');
    } else if (scroll < lastScroll) {
      nav.classList.remove('hero-nav--hidden');
    }
    lastScroll = scroll;
  });



  // ─── 4. Venues Showcase — Pinned Scroll + Slide-from-Top ──
  // TideScape "Service - Room" reference:
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
      opacity: 0, y: direction < 0 ? -20 : 20,
      duration: 0.35, ease: 'power2.in', overwrite: true,
      onComplete: () => gsap.set(outSlide, { y: 0 }),
    });

    // ── Outgoing image — fade out; incoming slides over it
    gsap.to(outImg, {
      opacity: 0, duration: 0.45, ease: 'power2.in', overwrite: true,
      onComplete: () => {
        outImg.classList.remove('is-active');
        gsap.set(outImg, { y: 0 }); // reset y so backward scroll reuses it correctly
      },
    });

    // ── Incoming slide (left panel) ────────────────────
    inSlide.classList.add('is-active');
    gsap.fromTo(inSlide,
      { opacity: 0, y: direction < 0 ? 28 : -28 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', overwrite: true, delay: 0.12 }
    );

    // Staggered text reveal
    gsap.fromTo(inSlide.querySelectorAll(venueTextSelectors),
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power3.out', overwrite: true, delay: 0.18 }
    );

    // ── Incoming image — slides from top (forward) or bottom (backward)
    inImg.classList.add('is-active');
    gsap.set(inImg, { zIndex: 1 }); // float above outgoing during slide
    gsap.fromTo(inImg,
      { y: fromY, opacity: 1 },
      {
        y: '0%', opacity: 1,
        duration: 0.9, ease: 'power3.out', overwrite: true,
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
    // the section scrolls into view — the TideScape "slide from top" feel.
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
    ScrollTrigger.create({
      trigger: venuesSection,
      start: 'top top',
      end: () => `+=${window.innerHeight * 2}`,
      pin: '.venues-sticky',
      pinSpacing: true,
      onUpdate: (self) => {
        progressFill.style.height = `${self.progress * 100}%`;

        const idx = Math.min(
          Math.floor(self.progress * totalVenues),
          totalVenues - 1
        );
        switchVenue(idx);
      },
    });
  }


  // ─── 5. Per-venue image sliders ──────────────────────
  // Pagination bars are siblings of .venue-main-img (not children) so they
  // sit at z-index:20 above all GSAP-animated layers and always receive clicks.
  const SLIDE_DURATION = 5000;
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
        void dot.offsetWidth; // reflow — restarts CSS fill animation
        dot.classList.add('is-active');
      }

      function goTo(idx) {
        slides[state.current].classList.remove('is-active');
        state.current = (idx + slides.length) % slides.length;
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

      const btn = e.target.closest('.venue-slider-btn');
      const dot = e.target.closest('.venue-slider-dot');

      if (btn) {
        const delta = btn.classList.contains('venue-slider-btn--prev') ? -1 : 1;
        state.goTo(state.current + delta);
        state.startTimer();
      } else if (dot) {
        const dotEls = [...pagination.querySelectorAll('.venue-slider-dot')];
        const idx    = dotEls.indexOf(dot);
        if (idx !== -1) { state.goTo(idx); state.startTimer(); }
      }
    });
  }


  // ─── 6. Moments Sections — Gallery-Style Pinned Scroll ──
  // Same pattern as gallery.js: section pins to viewport,
  // image grid scrubs upward, centered title stays fixed.
  document.querySelectorAll('.moments-scroll-section').forEach(section => {
    const grid = section.querySelector('.gp-pin-grid');
    if (!grid) return;

    const tl = gsap.timeline({ paused: true });
    tl.to(grid, {
      y: () => -(grid.scrollHeight - window.innerHeight),
      ease: 'none',
    });

    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${grid.scrollHeight - window.innerHeight}`,
      pin: true,
      scrub: 1,
      animation: tl,
      invalidateOnRefresh: true,
    });
  });


  // ─── Experience Section — 4 discrete reveal stops ────
  const expSection = document.querySelector('.experience-section');
  if (expSection) {
    const line1  = expSection.querySelector('.exp-line--1');
    const line2  = expSection.querySelector('.exp-line--2');
    const cvTop  = expSection.querySelector('.exp-cover--top');
    const cvBot  = expSection.querySelector('.exp-cover--bottom');
    const cvLeft = expSection.querySelector('.exp-cover--left');
    const cvRt   = expSection.querySelector('.exp-cover--right');

    const STATES = [
      { h: 50,   w: 50   },  // 0: fully covered, text in place
      { h: 45,   w: 45   },  // 1: small crack — text nudges slightly
      { h: 37.5, w: 37.5 },  // 2: ~25% visible
      { h: 12.5, w: 12.5 },  // 3: ~75% visible
      { h: 0,    w: 0    },  // 4: 100% revealed
    ];
    const TOTAL = 4;
    let stopIdx    = 0;
    let isAnimating = false;
    let expActive   = false;
    let expST;

    function goTo(idx) {
      if (isAnimating || idx === stopIdx) return;
      const prev = stopIdx;
      stopIdx = idx;
      isAnimating = true;

      const s = STATES[idx];
      const tl = gsap.timeline({
        defaults: { duration: 0.85, ease: 'power3.inOut' },
        onComplete: () => { isAnimating = false; },
      });

      tl.to([cvTop, cvBot], { height: `${s.h}%` }, 0)
        .to([cvLeft, cvRt],  { width:  `${s.w}%` }, 0);

      // Stop 0→1: slight nudge — panels "push" text a little
      if (prev === 0 && idx === 1) {
        tl.to(line1, { y: -40, ease: 'power2.out', duration: 0.5 }, 0)
          .to(line2, { y:  40, ease: 'power2.out', duration: 0.5 }, 0);
      }
      // Stop 1→2: complete fade out from nudged position
      if (prev === 1 && idx === 2) {
        tl.to([line1, line2], { opacity: 0, ease: 'power2.in', duration: 0.45 }, 0);
      }
      // Back 2→1: restore nudged position (visible, shifted)
      if (prev >= 2 && idx === 1) {
        tl.to([line1, line2], { opacity: 1, ease: 'power2.out', duration: 0.4 }, 0);
      }
      // Back to 0: text fully returns to origin
      if (prev > 0 && idx === 0) {
        tl.to(line1, { y: 0, opacity: 1, ease: 'power3.out', duration: 0.55 }, 0)
          .to(line2, { y: 0, opacity: 1, ease: 'power3.out', duration: 0.55 }, 0);
      }
    }

    expST = ScrollTrigger.create({
      trigger: expSection,
      start: 'top top',
      end: () => `+=${window.innerHeight * (TOTAL + 1)}`,  // 5×vh: 4 stops + release space
      pin: true,
      pinSpacing: true,
      invalidateOnRefresh: true,
      onEnter:     () => { expActive = true;  },
      onLeave:     () => { expActive = false; },
      onEnterBack: () => { expActive = true;  },
      onLeaveBack: () => { expActive = false; goTo(0); },
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

      goTo(next);

      // Sync underlying scroll to this stop's proportional position.
      // Section is pinned so this causes no visible scroll movement.
      const syncPos = expST.start + (next / (TOTAL + 1)) * (expST.end - expST.start);
      lenis.scrollTo(syncPos, { immediate: true });

      wheelCooldown = true;
      setTimeout(() => { wheelCooldown = false; }, 950);
    }, { passive: false });
  }


  // ─── 6. Services — Scroll-Triggered Card Reveal ──────
  const svcCards = gsap.utils.toArray('.svc-card');
  if (svcCards.length) {
    gsap.set(svcCards[0], { zIndex: 3 });
    gsap.set(svcCards[1], { opacity: 0, y: -480, zIndex: 2 });
    gsap.set(svcCards[2], { opacity: 0, y: -480, zIndex: 1 });

    svcCards.slice(1).forEach(card => {
      gsap.to(card, {
        opacity: 1,
        y: 0,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: card,
          start: 'top 20%',
          end: 'top 100%',
          scrub: 2,
          invalidateOnRefresh: true,
        },
      });
    });
  }


  // ─── 7. Text Reveal with GSAP ScrollTrigger ──────────
  // Replaces IntersectionObserver (unreliable with Lenis).
  // GSAP ScrollTrigger integrates properly via
  // lenis.on('scroll', ScrollTrigger.update).

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

  // Light: services section
  ScrollTrigger.create({
    trigger: '.services-section',
    start: 'top top',
    onEnter:     () => getNav()?.classList.remove('nav--dark'),
    onLeaveBack: () => getNav()?.classList.add('nav--dark'),
  });

  // Dark: gallery and beyond (find-us, reviews, faq, footer)
  ScrollTrigger.create({
    trigger: '.gallery-section',
    start: 'top top',
    onEnter:     () => getNav()?.classList.add('nav--dark'),
    onLeaveBack: () => getNav()?.classList.remove('nav--dark'),
  });



  // ─── Reviews — pin section, scrub cards upward ────────
  const rvSection = document.querySelector('.rv-section');
  if (rvSection) {
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
  const faqSection = document.querySelector('.faq-section');
  if (faqSection) {
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

  // ─── Social section — autoplay one video at a time (infinite loop + drag) ───
  (function initSocial() {
    const track = document.querySelector('.social-track');
    if (!track) return;

    const realCards = Array.from(track.querySelectorAll('.social-card'));
    const realCount = realCards.length; // 8

    // Prepend clones — fills left side so card 0 can be centered
    const preFrag = document.createDocumentFragment();
    realCards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.setAttribute('data-clone', 'pre');
      preFrag.appendChild(clone);
    });
    track.insertBefore(preFrag, track.firstChild);

    // Append clones — fills right side for seamless forward loop
    realCards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.setAttribute('data-clone', 'post');
      track.appendChild(clone);
    });

    // Layout: [pre 0-7] [real 8-15] [post 16-23]
    const allCards = Array.from(track.querySelectorAll('.social-card'));
    const allVideos = allCards.map(c => c.querySelector('video'));
    const totalCount = allCards.length; // 24
    let activeIndex = realCount; // start at real card 0 (domIndex 8)

    function getCardWidth() {
      return allCards[0].offsetWidth;
    }

    function getStepWidth() {
      if (allCards.length < 2) return allCards[0].offsetWidth + 32;
      return allCards[1].offsetLeft - allCards[0].offsetLeft;
    }

    function getOffset(index) {
      const wrapW = track.parentElement.offsetWidth;
      const cardW = getCardWidth();
      const step = getStepWidth();
      return (wrapW / 2) - (cardW / 2) - index * step;
    }

    function getCurrentTranslateX() {
      return new DOMMatrix(getComputedStyle(track).transform).m41;
    }

    // playAt — activate and play a card with NO sliding
    function playAt(domIndex) {
      activeIndex = domIndex;
      allCards.forEach((c, i) => c.classList.toggle('is-active', i === activeIndex));
      allVideos.forEach((v, i) => {
        if (i === activeIndex) {
          v.currentTime = 0;
          v.play().catch(() => {});
        } else {
          v.pause();
          v.currentTime = 0;
        }
      });
    }

    // goTo — slide to center a card then play it (auto-advance + drag snap only)
    function goTo(rawIndex) {
      let domIndex = ((rawIndex % totalCount) + totalCount) % totalCount;

      // Post-clones exhausted → snap to real set equivalent
      if (activeIndex >= realCount * 2 && domIndex < realCount) {
        track.style.transition = 'none';
        domIndex = domIndex + realCount;
        track.style.transform = `translateX(${getOffset(domIndex)}px)`;
        requestAnimationFrame(() => { track.style.transition = ''; });
      }
      // Pre-clones exhausted (dragged left past card 0) → snap to real set equivalent
      else if (activeIndex < realCount && domIndex >= realCount * 2) {
        track.style.transition = 'none';
        domIndex = domIndex - realCount;
        track.style.transform = `translateX(${getOffset(domIndex)}px)`;
        requestAnimationFrame(() => { track.style.transition = ''; });
      }

      playAt(domIndex);
      track.style.transform = `translateX(${getOffset(activeIndex)}px)`;
    }

    // ── Drag ──────────────────────────────────────────
    let dragStartX = 0;
    let dragStartOffset = 0;
    let isDragging = false;
    let didDrag = false;

    function onDragStart(clientX) {
      isDragging = true;
      didDrag = false;
      dragStartX = clientX;
      dragStartOffset = getCurrentTranslateX();
      track.style.transition = 'none';
    }

    function onDragMove(clientX) {
      if (!isDragging) return;
      const delta = clientX - dragStartX;
      if (Math.abs(delta) > 5) didDrag = true;
      track.style.transform = `translateX(${dragStartOffset + delta}px)`;
    }

    function onDragEnd() {
      if (!isDragging) return;
      isDragging = false;
      track.style.transition = '';
      const wrapW = track.parentElement.offsetWidth;
      const cardW = getCardWidth();
      const step = getStepWidth();
      const currentOffset = getCurrentTranslateX();
      const nearestIndex = Math.round(((wrapW / 2) - (cardW / 2) - currentOffset) / step);
      goTo(Math.max(0, Math.min(totalCount - 1, nearestIndex)));
    }

    track.addEventListener('mousedown', e => onDragStart(e.clientX));
    document.addEventListener('mousemove', e => { if (isDragging) onDragMove(e.clientX); });
    document.addEventListener('mouseup', () => onDragEnd());

    track.addEventListener('touchstart', e => onDragStart(e.touches[0].clientX), { passive: true });
    track.addEventListener('touchmove', e => {
      if (!isDragging) return;
      if (Math.abs(e.touches[0].clientX - dragStartX) > 10) e.preventDefault();
      onDragMove(e.touches[0].clientX);
    }, { passive: false });
    track.addEventListener('touchend', () => onDragEnd());

    // Click — play in place, no sliding
    allCards.forEach((card, i) => {
      card.addEventListener('click', () => {
        if (didDrag) { didDrag = false; return; }
        playAt(i);
      });
    });

    // Auto-advance on video end — slides to center next card
    allVideos.forEach((v, i) => v.addEventListener('ended', () => goTo(i + 1)));

    // Init — position at real card 0 (domIndex 8), no transition flash
    track.style.transition = 'none';
    track.style.transform = `translateX(${getOffset(realCount)}px)`;
    requestAnimationFrame(() => {
      track.style.transition = '';
      goTo(realCount);
    });

    window.addEventListener('resize', () => {
      track.style.transition = 'none';
      track.style.transform = `translateX(${getOffset(activeIndex)}px)`;
      requestAnimationFrame(() => { track.style.transition = ''; });
    });
  })();

  // Safety refresh — all pin spacers now in DOM; force recalculation of all trigger positions
  ScrollTrigger.refresh();

});
