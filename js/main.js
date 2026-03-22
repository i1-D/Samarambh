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
    .to('.intro-bottom', { opacity: 1, ease: 'none', duration: 0.4 }, 0.5);



  // ─── 4. Hero Shrink Effect (if hero section present) ─────
  // tenutacentoporte.it style: hero is position:fixed and
  // shrinks inward as user scrolls through hero-spacer,
  // revealing intro content behind the shrinking card.
  const heroFixed = document.querySelector('.hero-fixed');

  gsap.to('.hero-inner', {
    margin: '48px',
    borderRadius: '24px',
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero-spacer',
      start: 'top top',
      end: 'bottom top',
      scrub: 1.2,
      onLeave: () => {
        heroFixed.classList.add('is-done');
        gsap.set(heroFixed, { position: 'absolute', top: 0 });
      },
      onEnterBack: () => {
        heroFixed.classList.remove('is-done');
        gsap.set(heroFixed, { position: 'fixed', top: 0 });
      },
    }
  });


  // ─── 4. Lawn Sections — Stacked Panel Effect ────────
  // tenutacentoporte.it rooms/suites reference:
  // each lawn panel pins at the top; the next slides up
  // from below and takes over, creating a stacking reveal.
  const lawns = gsap.utils.toArray('.lawn-section');

  lawns.forEach((lawn, i) => {
    // Pin each section
    ScrollTrigger.create({
      trigger: lawn,
      start: 'top top',
      pin: true,
      pinSpacing: false,
      end: () => `+=${lawn.offsetHeight}`,
    });

    // Snap outgoing panel to fixed 80% brightness when next section scrolls over it
    if (i < lawns.length - 1) {
      gsap.to(lawn, {
        duration: 0,
        scrollTrigger: {
          trigger: lawn,
          start: 'top top',
          toggleActions: 'play none none reverse',
        }
      });
    }
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
    }, 3.4);


  // ─── 6. Text Reveal with GSAP ScrollTrigger ──────────
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

});
