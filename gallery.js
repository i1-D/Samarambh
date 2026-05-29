import gsap from 'gsap';
import Lenis from 'lenis';

// ─── Lenis Smooth Scroll ────────────────────────────────
const lenis = new Lenis({
  duration: 0.9,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(500, 33);

// ─── Hamburger / drawer ─────────────────────────────────
(function initHamburger() {
  let _nav = null, _drawer = null;
  const getNav    = () => _nav    || (_nav    = document.querySelector('.hero-nav'));
  const getDrawer = () => _drawer || (_drawer = document.querySelector('.nav-drawer'));

  function openDrawer() {
    const nav = getNav(), drawer = getDrawer();
    if (!nav || !drawer) return;
    nav.classList.add('nav--open');
    drawer.classList.add('is-open');
    nav.querySelector('.nav-hamburger')?.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    lenis.stop();
  }

  function closeDrawer() {
    const nav = getNav(), drawer = getDrawer();
    if (!nav || !drawer) return;
    nav.classList.remove('nav--open');
    drawer.classList.remove('is-open');
    nav.querySelector('.nav-hamburger')?.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    lenis.start();
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('.nav-hamburger')) {
      getNav()?.classList.contains('nav--open') ? closeDrawer() : openDrawer();
      return;
    }
    if (e.target.closest('.nav-drawer a')) closeDrawer();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });
})();

// ─── Hide nav when footer is in view ───────────────────
(function initNavFooterHide() {
  const observer = new IntersectionObserver(
    ([entry]) => {
      const nav = document.querySelector('.hero-nav');
      if (!nav) return;
      nav.classList.toggle('hero-nav--hidden', entry.isIntersecting);
    },
    { threshold: 0 }
  );

  // Footer is injected async by components.js — wait for it
  const poll = setInterval(() => {
    const footer = document.querySelector('.site-footer');
    if (footer) {
      observer.observe(footer);
      clearInterval(poll);
    }
  }, 100);
})();

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

    header.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); header.click(); }
    });

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
      },
    });
  }
})();

// ─── Lightbox ───────────────────────────────────────────
(function initLightbox() {
  const lb         = document.getElementById('lb');
  if (!lb) return;

  const lbImg      = lb.querySelector('.lb__img');
  const lbClose    = lb.querySelector('.lb__close');
  const lbPrev     = lb.querySelector('.lb__nav--prev');
  const lbNext     = lb.querySelector('.lb__nav--next');
  const lbCounter  = lb.querySelector('.lb__counter');
  const lbStage    = lb.querySelector('.lb__stage');
  const lbBackdrop = lb.querySelector('.lb__backdrop');

  let currentImages = [];
  let currentIndex  = 0;
  let openTl  = null;
  let closeTl = null;

  function getVenueBodyImages(venueId) {
    const row = document.querySelector(`.vl-row[data-venue="${venueId}"]`);
    if (!row) return [];
    return Array.from(row.querySelectorAll('.vl-img-wrap img'))
      .map(img => ({ src: img.src, alt: img.alt }));
  }

  function openLightbox(venueId, idx) {
    currentImages = getVenueBodyImages(venueId);
    if (!currentImages.length) return;
    currentIndex = Math.max(0, Math.min(idx, currentImages.length - 1));

    lbImg.src = currentImages[currentIndex].src;
    lbImg.alt = currentImages[currentIndex].alt;
    lbCounter.textContent = `${currentIndex + 1} / ${currentImages.length}`;

    lb.hidden = false;
    lenis.stop();

    if (closeTl) closeTl.kill();
    gsap.set(lbImg, { x: 0, y: 0, opacity: 1 });

    openTl = gsap.timeline()
      .fromTo(lbBackdrop,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: 'power2.out' }, 0)
      .fromTo(lbStage,
        { clipPath: 'inset(100% 0 0 0)' },
        { clipPath: 'inset(0% 0 0 0)', duration: 0.55, ease: 'power3.out' }, 0.05)
      .fromTo(lbImg,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }, 0.2)
      .fromTo([lbClose, lbPrev, lbNext, lbCounter],
        { opacity: 0 },
        { opacity: 1, duration: 0.25, ease: 'power2.out' }, 0.45);
  }

  function closeLightbox() {
    if (openTl) openTl.kill();

    closeTl = gsap.timeline({
      onComplete: () => {
        lb.hidden = true;
        lenis.start();
      },
    })
      .to(lbImg,
        { y: 30, opacity: 0, duration: 0.3, ease: 'power2.in' }, 0)
      .to([lbClose, lbPrev, lbNext, lbCounter],
        { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0)
      .to(lbStage,
        { clipPath: 'inset(100% 0 0 0)', duration: 0.45, ease: 'power3.in' }, 0.1)
      .to(lbBackdrop,
        { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0.2);
  }

  function showImage(idx, dir = 1) {
    const exitX  = dir * -80;
    const enterX = dir * 80;

    gsap.to(lbImg, {
      x: exitX,
      opacity: 0,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => {
        lbImg.src = currentImages[idx].src;
        lbImg.alt = currentImages[idx].alt;
        lbCounter.textContent = `${idx + 1} / ${currentImages.length}`;
        currentIndex = idx;

        gsap.fromTo(lbImg,
          { x: enterX, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
        );
      },
    });
  }

  function prev() {
    showImage((currentIndex - 1 + currentImages.length) % currentImages.length, -1);
  }

  function next() {
    showImage((currentIndex + 1) % currentImages.length, 1);
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
    if (e.key === 'Escape')    closeLightbox();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });
})();
