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

  // ── Drag ────────────────────────────────────────────
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
