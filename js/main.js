/* ═══════════════════════════════════════════════════════
   SAMARAMBH — Main JavaScript
   Animations: Lenis (smooth scroll) + GSAP + ScrollTrigger
   ═══════════════════════════════════════════════════════ */

import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

document.addEventListener('DOMContentLoaded', () => {

  // ─── 1. GSAP Plugin Registration ────────────────────
  gsap.registerPlugin(ScrollTrigger);


  // ─── 2. Lenis Smooth Scroll ─────────────────────────
  const lenis = new Lenis({
    duration: 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.9,
  });

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
    .to('.intro-video-overlay', { opacity: 0, ease: 'none', duration: 0.1 }, 0)
    .to('.intro-top',    { opacity: 1, ease: 'none', duration: 0.4 }, 0.45)
    .to('.intro-bottom', { opacity: 1, ease: 'none', duration: 0.4 }, 0.5)
    .to('.nav-logo',     { opacity: 1, ease: 'none', duration: 0.3 }, 0.8);



  // ─── 4. Lawn Sections — Stacked Panel Effect ────────
  // tenutacentoporte.it rooms/suites reference:
  // each lawn panel pins at the top; the next slides up
  // from below and takes over, creating a stacking reveal.
  const lawns = gsap.utils.toArray('.lawn-section');

  lawns.forEach((lawn) => {
    // Pin each section
    ScrollTrigger.create({
      trigger: lawn,
      start: 'top top',
      pin: true,
      pinSpacing: false,
      end: () => `+=${lawn.offsetHeight}`,
    });

  });


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


  // ─── 6. Services — Scroll-Driven Tab Switching ───────
  const servicesBgs    = gsap.utils.toArray('.services-bg-slide');
  const servicesTabs   = document.querySelectorAll('.services-tab');
  const servicesPanels = document.querySelectorAll('.services-desc-panel');
  let activeServiceTab = 0;

  function activateServicesTab(index) {
    if (index === activeServiceTab) return;

    servicesBgs[activeServiceTab].classList.remove('is-active');
    servicesBgs[index].classList.add('is-active');

    servicesTabs[activeServiceTab].classList.remove('is-active');
    servicesTabs[index].classList.add('is-active');

    servicesPanels[activeServiceTab].classList.remove('is-active');
    servicesPanels[index].classList.add('is-active');

    // Slide the tab row left so the active tab lands at the leftmost position
    gsap.to('.services-tabs', {
      x: -servicesTabs[index].offsetLeft,
      duration: 0.7,
      ease: 'power3.inOut',
    });

    activeServiceTab = index;
  }

  ScrollTrigger.create({
    trigger: '.services-section',
    start: 'top top',
    end: '+=300vh',
    pin: true,
    onUpdate: (self) => {
      const tab = Math.min(2, Math.floor(self.progress * 3));
      activateServicesTab(tab);
    }
  });


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


  // ─── 9. Gallery — pause on focus/interaction ─────────
  // The gallery auto-scrolls via CSS animation.
  // We pause it when the user interacts (hover handled in CSS).
  // Additionally pause when tab is not visible.
  const galleryTrack = document.querySelector('.gallery-track');
  if (galleryTrack) {
    document.addEventListener('visibilitychange', () => {
      galleryTrack.style.animationPlayState =
        document.hidden ? 'paused' : 'running';
    });
  }


  // ─── 10. Lawn section title reveal ───────────────────
  document.querySelectorAll('.lawn-section').forEach(lawn => {
    gsap.from(lawn.querySelectorAll('.lawn-name, .lawn-capacity'), {
      y: 30,
      opacity: 0,
      duration: 1,
      stagger: 0.15,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: lawn,
        start: 'top 60%',
      }
    });
  });


  // ─── Nav dark/light mode by section ─────────────────
  const nav = document.querySelector('.hero-nav');
  const lawnsAll = gsap.utils.toArray('.lawn-section');

  // Dark: intro video collapses (~100vh into the 150vh pin = ~2/3 collapsed)
  ScrollTrigger.create({
    trigger: '.intro-title-block',
    start: 'top top',
    end: '+=100vh',
    onLeave:      () => nav.classList.add('nav--dark'),
    onEnterBack:  () => nav.classList.remove('nav--dark'),
  });

  // Light: lawn 2 (removes dark; lawn 1 stays dark from intro trigger)
  ScrollTrigger.create({
    trigger: lawnsAll[1],
    start: 'top top',
    onEnter:     () => nav.classList.remove('nav--dark'),
    onLeaveBack: () => nav.classList.add('nav--dark'),
  });

  // Dark: moments (lawn 3 was light, moments needs dark)
  ScrollTrigger.create({
    trigger: '.moments-wrapper',
    start: 'top top',
    onEnter:     () => nav.classList.add('nav--dark'),
    onLeaveBack: () => nav.classList.remove('nav--dark'),
  });

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



  // ─── Reviews Carousel ────────────────────────────────
  const reviewsWrap  = document.querySelector('.reviews-carousel-wrap');
  const reviewsTrack = document.querySelector('.reviews-track');
  const reviewDots   = document.querySelectorAll('.reviews-dot');

  if (reviewsTrack) {
    let activeReview = 0;

    function goToReview(index) {
      const cards = reviewsTrack.children;
      const cardWidth = cards[0].offsetWidth;
      const gap = 32;
      const wrapWidth = reviewsWrap.offsetWidth;
      const offset = index * (cardWidth + gap) - (wrapWidth - cardWidth) / 2;

      reviewsTrack.style.transform = `translateX(${-offset}px)`;

      [...cards].forEach((c, i) => c.classList.toggle('is-active', i === index));
      reviewDots.forEach((d, i) => d.classList.toggle('is-active', i === index));

      activeReview = index;
      updateArrows();
    }

    const prevBtn = document.querySelector('.reviews-arrow--prev');
    const nextBtn = document.querySelector('.reviews-arrow--next');

    function updateArrows() {
      prevBtn.disabled = activeReview === 0;
      nextBtn.disabled = activeReview === reviewDots.length - 1;
    }

    prevBtn.addEventListener('click', () => {
      if (activeReview > 0) goToReview(activeReview - 1);
    });

    nextBtn.addEventListener('click', () => {
      if (activeReview < reviewDots.length - 1) goToReview(activeReview + 1);
    });

    reviewDots.forEach((dot, i) => {
      dot.addEventListener('click', () => goToReview(i));
    });

    goToReview(0);

    window.addEventListener('resize', () => goToReview(activeReview));
  }

});
