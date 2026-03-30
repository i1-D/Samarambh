import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

// ─── Register GSAP Plugins ──────────────────────────────
gsap.registerPlugin(ScrollTrigger);

// ─── Lenis Smooth Scroll ────────────────────────────────
const lenis = new Lenis();
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// ─── Hero entrance (fires on load) ─────────────────────
gsap.from('.gp-hero__title, .gp-hero__desc, .gp-hero__badge', {
  opacity: 0,
  y: 30,
  duration: 0.8,
  stagger: 0.12,
  ease: 'power3.out',
  delay: 0.3,
});

// ─── Pinned venue sections ──────────────────────────────
// Each section pins to the viewport; the image grid scrubs upward
// revealing all 4 rows while the title stays centered.
document.querySelectorAll('.gp-pin-section').forEach(section => {
  const grid = section.querySelector('.gp-pin-grid');

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
