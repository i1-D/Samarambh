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
  const heroVideo = document.querySelector('.hero-video');
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
        ScrollTrigger.refresh();
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

  // Smooth-scroll nav anchor links via Lenis
  document.querySelectorAll('.hero-nav a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) lenis.scrollTo(target, { offset: 0 });
    });
  });


  // ─── 3. Intro Video Shrink (tenutacentoporte.it style) ──────
  // Video starts fullscreen: GSAP pins .intro-title-block (100vh)
  // so its position:absolute child covers the full viewport.
  // Scrubs from full-viewport → 350×197px centered over 150vh of scroll.
  // Headlines fade in above/below as video shrinks.

  // Center axis is fixed via left:50% + xPercent:-50 from the start.
  // Only width/height/top/yPercent animate — horizontal center never shifts.
  gsap.set('.intro-video-wrap', {
    position: 'absolute',
    top: 0,
    left: '50%',
    xPercent: -50,
    width: '100vw',
    height: '100%',
    borderRadius: 0,
  });

  gsap.set(['.intro-top', '.intro-bottom'], { opacity: 0 });
  gsap.set('.nav-logo', { opacity: 0 });

  const introVideoTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.intro-title-block',
      start: 'top top',
      end: '+=150vh',
      pin: true,
      scrub: 1.5,
      anticipatePin: 1,
    }
  });

  introVideoTl
    .to('.intro-video-wrap', {
      width: 500,
      height: 300,
      top: '50%',
      yPercent: -50,
      borderRadius: 12,
      ease: 'none',
      duration: 1,
    }, 0)
    .to('.intro-logo', { opacity: 0, ease: 'none', duration: 0.1 }, 0)
    .to('.intro-social-proof', { opacity: 0, ease: 'none', duration: 0.25 }, 0)
    .to('.intro-top',    { opacity: 1, ease: 'none', duration: 0.4 }, 0.45)
    .to('.intro-bottom', { opacity: 1, ease: 'none', duration: 0.4 }, 0.5)
    .to('.nav-logo',     { opacity: 1, ease: 'none', duration: 0.3 }, 0.8);



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


  // ─── 5. Moments Sections — Pinned Timeline ───────────
  // aupalevodka.com home_sections reference:
  // the moments wrapper is pinned for 3× viewport height.
  // A GSAP timeline drives cross-fades between the three
  // panels (Wedding → Celebrations → All Moments) and
  // animates the floating photo cards based on progress.

  // Initial states — hide celebrations & all-moments
  gsap.set('.celebrations-section', { opacity: 0 });
  gsap.set('.all-moments-section',  { opacity: 0 });
  gsap.set('.wedding-section',      { opacity: 1 });

  // Photo cards start off-screen (shifted down, invisible)
  gsap.set('.wedding-photo',       { y: 100, opacity: 0 });
  gsap.set('.celebrations-photo',  { y: 100, opacity: 0 });
  gsap.set('.moments-card',        { y: 80,  opacity: 0 });

  // Watermark text starts at rest
  gsap.set('.moments-watermark', { x: 0 });

  // Text lines start hidden below
  gsap.set('.wedding-section .text-line-inner',      { y: '101%' });
  gsap.set('.celebrations-section .text-line-inner', { y: '101%' });

  const momentsTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.moments-wrapper',
      start: 'top top',
      end: () => `+=${3 * window.innerHeight}`,
      scrub: 1.5,
      pin: true,
    }
  });

  momentsTl
    // Phase 1: Wedding photos animate into position
    .to('.wedding-photo', {
      y: 0, opacity: 1,
      duration: 0.8, stagger: 0.3,
      ease: 'power2.out',
    }, 0)
    // Watermark parallax drift in wedding section
    .to('.wedding-section .moments-watermark:nth-child(1)', { x: '-8vw', duration: 2 }, 0)
    .to('.wedding-section .moments-watermark:nth-child(2)', { x: '8vw',  duration: 2 }, 0)
    .to('.wedding-section .moments-watermark:nth-child(3)', { x: '-5vw', duration: 2 }, 0)

    // Phase 2: Fade out Wedding, fade in Celebrations
    .to('.wedding-section',      { opacity: 0, duration: 0.5 }, 1.6)
    .to('.celebrations-section', { opacity: 1, duration: 0.5 }, 1.6)
    .to('.celebrations-photo', {
      y: 0, opacity: 1,
      duration: 0.8, stagger: 0.2,
      ease: 'power2.out',
    }, 1.8)
    // Watermark drift in celebrations
    .to('.celebrations-section .moments-watermark:nth-child(1)', { x: '-8vw', duration: 2 }, 1.6)
    .to('.celebrations-section .moments-watermark:nth-child(2)', { x: '8vw',  duration: 2 }, 1.6)
    .to('.celebrations-section .moments-watermark:nth-child(3)', { x: '-5vw', duration: 2 }, 1.6)

    // Phase 3: Fade out Celebrations, fade in All Moments
    .to('.celebrations-section', { opacity: 0, duration: 0.5 }, 3.2)
    .to('.all-moments-section',  { opacity: 1, duration: 0.5 }, 3.2)
    .to('.moments-card', {
      y: 0, opacity: 1,
      duration: 0.8, stagger: 0.12,
      ease: 'power2.out',
    }, 3.4)

    // Wedding text enters (phase 1)
    .to('.wedding-section .text-line-inner', {
      y: '0%', duration: 0.5, stagger: 0.12, ease: 'power3.out',
    }, 0.2)

    // Wedding text exits upward (before fade-out at 1.6)
    .to('.wedding-section .text-line-inner', {
      y: '-101%', duration: 0.4, stagger: 0.08, ease: 'power2.in',
    }, 1.1)

    // Celebrations text enters (phase 2, alongside section fade-in)
    .to('.celebrations-section .text-line-inner', {
      y: '0%', duration: 0.5, stagger: 0.12, ease: 'power3.out',
    }, 1.8)

    // Celebrations text exits upward (before fade-out at 3.2)
    .to('.celebrations-section .text-line-inner', {
      y: '-101%', duration: 0.4, stagger: 0.08, ease: 'power2.in',
    }, 2.8);


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


  // ─── 8. (Intro headline/video handled by introVideoTl above) ──




  // ─── Nav dark/light mode by section ─────────────────
  const nav = document.querySelector('.hero-nav');

  // Dark text: intro video collapses → entering cream bg
  ScrollTrigger.create({
    trigger: '.intro-title-block',
    start: 'top top',
    end: '+=100vh',
    onLeave:      () => nav.classList.add('nav--dark'),
    onEnterBack:  () => nav.classList.remove('nav--dark'),
  });

  // Venues section has cream bg → nav--dark stays active (inherited from above).
  // Moments wrapper also has cream bg → nav--dark stays.
  // No triggers needed until services section.

  // Light: services section
  ScrollTrigger.create({
    trigger: '.services-section',
    start: 'top top',
    onEnter:     () => nav.classList.remove('nav--dark'),
    onLeaveBack: () => nav.classList.add('nav--dark'),
  });

  // Dark: gallery and beyond (find-us, reviews, faq, footer)
  ScrollTrigger.create({
    trigger: '.gallery-section',
    start: 'top top',
    onEnter:     () => nav.classList.add('nav--dark'),
    onLeaveBack: () => nav.classList.remove('nav--dark'),
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

});
