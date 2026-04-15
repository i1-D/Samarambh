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

// ─── Venue accordion ────────────────────────────────────
(function initAccordion() {
  const rows = document.querySelectorAll('.vl-row');
  let activeRow = null;

  rows.forEach(row => {
    const header = row.querySelector('.vl-row__header');
    const body   = row.querySelector('.vl-row__body');

    // Set initial state — collapsed
    gsap.set(body, { height: 0, overflow: 'hidden' });

    header.addEventListener('click', () => {
      const isOpen = row.dataset.open === 'true';

      // Close the currently open row first (accordion: one at a time)
      if (activeRow && activeRow !== row) {
        closeRow(activeRow);
      }

      if (isOpen) {
        closeRow(row);
        activeRow = null;
      } else {
        openRow(row);
        activeRow = row;
      }
    });
  });

  function openRow(row) {
    const body = row.querySelector('.vl-row__body');
    row.dataset.open = 'true';
    row.querySelector('.vl-row__header').setAttribute('aria-expanded', 'true');
    body.hidden = false;
    body.classList.add('is-open');

    gsap.to(body, {
      height: 'auto',
      duration: 0.6,
      ease: 'power3.inOut',
      onComplete: () => ScrollTrigger.refresh(),
    });
  }

  function closeRow(row) {
    const body = row.querySelector('.vl-row__body');
    row.dataset.open = 'false';
    row.querySelector('.vl-row__header').setAttribute('aria-expanded', 'false');
    body.classList.remove('is-open');

    gsap.to(body, {
      height: 0,
      duration: 0.45,
      ease: 'power3.inOut',
      onComplete: () => {
        body.hidden = true;
        ScrollTrigger.refresh();
      },
    });
  }
})();

// ─── Lightbox ───────────────────────────────────────────
(function initLightbox() {
  const lb        = document.getElementById('lb');
  if (!lb) return;

  const lbImg     = lb.querySelector('.lb__img');
  const lbClose   = lb.querySelector('.lb__close');
  const lbPrev    = lb.querySelector('.lb__nav--prev');
  const lbNext    = lb.querySelector('.lb__nav--next');
  const lbCounter = lb.querySelector('.lb__counter');

  let currentImages = [];
  let currentIndex  = 0;

  function getVenueBodyImages(venueId) {
    const row = document.querySelector(`.vl-row[data-venue="${venueId}"]`);
    if (!row) return [];
    return Array.from(row.querySelectorAll('.vl-row__body .vl-img-wrap img'))
      .map(img => ({ src: img.src, alt: img.alt }));
  }

  function openLightbox(venueId, idx) {
    currentImages = getVenueBodyImages(venueId);
    if (!currentImages.length) return;
    currentIndex = Math.max(0, Math.min(idx, currentImages.length - 1));
    lb.hidden = false;
    lenis.stop();
    // Show without fade-out on first open
    lbImg.src = currentImages[currentIndex].src;
    lbImg.alt = currentImages[currentIndex].alt;
    lbCounter.textContent = `${currentIndex + 1} / ${currentImages.length}`;
  }

  function closeLightbox() {
    lb.hidden = true;
    lenis.start();
  }

  function showImage(idx) {
    lbImg.classList.add('is-fading');
    setTimeout(() => {
      lbImg.src = currentImages[idx].src;
      lbImg.alt = currentImages[idx].alt;
      lbImg.classList.remove('is-fading');
      lbCounter.textContent = `${idx + 1} / ${currentImages.length}`;
      currentIndex = idx;
    }, 200);
  }

  function prev() {
    showImage((currentIndex - 1 + currentImages.length) % currentImages.length);
  }

  function next() {
    showImage((currentIndex + 1) % currentImages.length);
  }

  // Delegate image clicks from anywhere in the venue list
  document.addEventListener('click', e => {
    const wrap = e.target.closest('.vl-img-wrap');
    if (!wrap) return;

    const img = wrap.querySelector('img');
    if (!img) return;

    const row = wrap.closest('.vl-row');
    if (!row) return;

    const venueId = row.dataset.venue;
    const idx = parseInt(img.dataset.idx ?? '0', 10);
    openLightbox(venueId, idx);
  });

  lbClose.addEventListener('click', closeLightbox);
  lb.querySelector('.lb__backdrop').addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', prev);
  lbNext.addEventListener('click', next);

  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  prev();
    if (e.key === 'ArrowRight') next();
  });
})();
