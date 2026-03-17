/**
 * app.js — Pet Gallery UTN (v2)
 * Carousel, voting, results, lightbox, hero stats
 */

'use strict';

const STORAGE_KEY   = 'petgallery_votes';
const AUTOPLAY_DELAY = 5000;

let images       = [];
let current      = 0;
let autoplayTimer = null;
let votes        = loadVotes();

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    const res = await fetch('/images.json');
    if (!res.ok) throw new Error();
    images = await res.json();
  } catch { images = []; }

  buildCarousel();
  buildVotingGrid();
  renderResults();
  updateHeroStats();
  initLightbox();
  registerSW();
}

// ═══════════════════════════════════════════════════
// HERO STATS
// ═══════════════════════════════════════════════════
function updateHeroStats() {
  const el = document.getElementById('statPhotos');
  const ev = document.getElementById('statVotes');
  if (el) el.textContent = images.length;
  if (ev) ev.textContent = countTotalVotes();
}

function countTotalVotes() {
  let total = 0;
  for (const fn of images) {
    const v = votes[fn] || {};
    total += (v.adorable || 0) + (v.graciosa || 0);
  }
  return total;
}

// ═══════════════════════════════════════════════════
// CAROUSEL
// ═══════════════════════════════════════════════════
function buildCarousel() {
  const track = document.getElementById('carouselTrack');
  const dots  = document.getElementById('carouselDots');
  const empty = document.getElementById('carouselEmpty');
  const prev  = document.getElementById('carouselPrev');
  const next  = document.getElementById('carouselNext');

  if (images.length === 0) {
    empty.hidden = false;
    prev.hidden  = true;
    next.hidden  = true;
    return;
  }

  images.forEach((filename, i) => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-label', `Foto ${i + 1} de ${images.length}`);
    slide.title = 'Clic para ver completa';

    const img = document.createElement('img');
    img.src      = `/fotos/${filename}`;
    img.alt      = `Mascota ${i + 1}`;
    img.loading  = i === 0 ? 'eager' : 'lazy';
    img.decoding = 'async';

    const hint = document.createElement('div');
    hint.className   = 'carousel-hint';
    hint.textContent = '🔍 Ver completa';

    const label = document.createElement('div');
    label.className   = 'carousel-slide-label';
    label.textContent = formatFilename(filename);

    slide.appendChild(img);
    slide.appendChild(hint);
    slide.appendChild(label);
    track.appendChild(slide);

    // Click → lightbox
    slide.addEventListener('click', () => openLightbox(filename));

    // Dot
    const dot = document.createElement('button');
    dot.className = `carousel-dot${i === 0 ? ' active' : ''}`;
    dot.setAttribute('aria-label', `Ir a foto ${i + 1}`);
    dot.addEventListener('click', e => { e.stopPropagation(); goTo(i); resetAutoplay(); });
    dots.appendChild(dot);
  });

  prev.addEventListener('click', () => { goTo(current - 1); resetAutoplay(); });
  next.addEventListener('click', () => { goTo(current + 1); resetAutoplay(); });

  document.addEventListener('keydown', e => {
    if (document.getElementById('lightbox') && !document.getElementById('lightbox').hidden) return;
    if (e.key === 'ArrowLeft')  { goTo(current - 1); resetAutoplay(); }
    if (e.key === 'ArrowRight') { goTo(current + 1); resetAutoplay(); }
  });

  const container = document.querySelector('.carousel-track-container');
  let touchStartX = 0;
  container.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  container.addEventListener('touchend',   e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { goTo(current + Math.sign(diff)); resetAutoplay(); }
  });
  container.addEventListener('mouseenter', () => clearTimeout(autoplayTimer));
  container.addEventListener('mouseleave', () => startAutoplay());

  startAutoplay();
}

function goTo(index) {
  current = ((index % images.length) + images.length) % images.length;
  document.getElementById('carouselTrack').style.transform = `translateX(-${current * 100}%)`;
  document.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === current));
}

function startAutoplay() {
  if (images.length < 2) return;
  autoplayTimer = setTimeout(() => { goTo(current + 1); startAutoplay(); }, AUTOPLAY_DELAY);
}

function resetAutoplay() { clearTimeout(autoplayTimer); startAutoplay(); }

// ═══════════════════════════════════════════════════
// LIGHTBOX
// ═══════════════════════════════════════════════════
function initLightbox() {
  const lb      = document.getElementById('lightbox');
  const closeBtn = document.getElementById('lightboxClose');
  const backdrop = document.getElementById('lightboxBackdrop');

  closeBtn.addEventListener('click',   closeLightbox);
  backdrop.addEventListener('click',   closeLightbox);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !lb.hidden) closeLightbox();
    if (e.key === 'ArrowLeft'  && !lb.hidden) lightboxNav(-1);
    if (e.key === 'ArrowRight' && !lb.hidden) lightboxNav(1);
  });
}

function openLightbox(filename) {
  const lb      = document.getElementById('lightbox');
  const img     = document.getElementById('lightboxImg');
  const caption = document.getElementById('lightboxCaption');

  img.src         = `/fotos/${filename}`;
  img.alt         = formatFilename(filename);
  caption.textContent = formatFilename(filename);
  lb.dataset.file = filename;
  lb.hidden       = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.hidden = true;
  document.body.style.overflow = '';
}

function lightboxNav(dir) {
  const lb  = document.getElementById('lightbox');
  const cur = images.indexOf(lb.dataset.file);
  if (cur === -1) return;
  const next = ((cur + dir) + images.length) % images.length;
  openLightbox(images[next]);
}

// ═══════════════════════════════════════════════════
// VOTING GRID
// ═══════════════════════════════════════════════════
function buildVotingGrid() {
  const grid  = document.getElementById('votingGrid');
  const empty = document.getElementById('votingEmpty');

  if (images.length === 0) { empty.hidden = false; return; }

  const maxVotes = getMaxVotes();

  images.forEach((filename, idx) => {
    const v    = votes[filename] || { adorable: 0, graciosa: 0 };
    const card = buildVoteCard(filename, v, maxVotes, idx);
    grid.appendChild(card);
  });
}

function buildVoteCard(filename, v, maxVotes, idx) {
  const card = document.createElement('article');
  card.className    = 'vote-card';
  card.dataset.file = filename;
  card.style.animationDelay = `${idx * 60}ms`;

  // Image
  const imgWrap = document.createElement('div');
  imgWrap.className = 'vote-card-image';

  const img = document.createElement('img');
  img.src     = `/fotos/${filename}`;
  img.alt     = formatFilename(filename);
  img.loading = 'lazy';
  imgWrap.appendChild(img);

  const hint = document.createElement('div');
  hint.className   = 'vote-card-image-hint';
  hint.textContent = '🔍 Ver completa';
  imgWrap.appendChild(hint);

  imgWrap.addEventListener('click', () => openLightbox(filename));

  // Body
  const body = document.createElement('div');
  body.className = 'vote-card-body';

  const name = document.createElement('div');
  name.className   = 'vote-card-name';
  name.textContent = formatFilename(filename);

  const btnRow = document.createElement('div');
  btnRow.className = 'vote-buttons';
  btnRow.appendChild(createVoteBtn('adorable', v.adorable, filename));
  btnRow.appendChild(createVoteBtn('graciosa', v.graciosa, filename));

  const bars = buildBarRows(v, maxVotes);

  body.append(name, btnRow, bars);
  card.append(imgWrap, body);
  return card;
}

function createVoteBtn(category, count, filename) {
  const btn = document.createElement('button');
  btn.className = `vote-btn vote-btn--${category}`;

  const emoji = document.createElement('span');
  emoji.textContent = category === 'adorable' ? '🥰' : '😂';

  const label = document.createElement('span');
  label.textContent = category === 'adorable' ? 'Adorable' : 'Graciosa';

  const badge = document.createElement('span');
  badge.className   = 'vote-count';
  badge.textContent = count;

  btn.append(emoji, label, badge);
  btn.addEventListener('click', e => { triggerRipple(btn); castVote(filename, category); });
  return btn;
}

function buildBarRows(v, maxVotes) {
  const wrap = document.createElement('div');
  wrap.className = 'vote-bars';

  ['adorable', 'graciosa'].forEach(cat => {
    const count = v[cat] || 0;
    const pct   = maxVotes > 0 ? (count / maxVotes) * 100 : 0;

    const row   = document.createElement('div');
    row.className = 'vote-bar-row';

    const lbl = document.createElement('span');
    lbl.className   = 'vote-bar-label';
    lbl.textContent = cat === 'adorable' ? '🥰 adorable' : '😂 graciosa';

    const track = document.createElement('div');
    track.className = 'vote-bar-track';

    const fill = document.createElement('div');
    fill.className = `vote-bar-fill vote-bar-fill--${cat}`;
    requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = `${pct}%`; }));

    const num = document.createElement('span');
    num.className   = 'vote-bar-num';
    num.textContent = count;

    track.appendChild(fill);
    row.append(lbl, track, num);
    wrap.appendChild(row);
  });

  return wrap;
}

function castVote(filename, category) {
  if (!votes[filename]) votes[filename] = { adorable: 0, graciosa: 0 };
  votes[filename][category]++;
  saveVotes();
  refreshAllCards();
  renderResults();
  updateHeroStats();
  showToast(category === 'adorable' ? '🥰 ¡Votaste por Adorable!' : '😂 ¡Votaste por Graciosa!');
}

function refreshAllCards() {
  const max = getMaxVotes();
  document.querySelectorAll('.vote-card').forEach(card => {
    const fn = card.dataset.file;
    const v  = votes[fn] || { adorable: 0, graciosa: 0 };

    // Update badges
    card.querySelectorAll('.vote-btn').forEach(btn => {
      const cat   = btn.classList.contains('vote-btn--adorable') ? 'adorable' : 'graciosa';
      const badge = btn.querySelector('.vote-count');
      if (badge) badge.textContent = v[cat] || 0;
    });

    // Update bars
    const rows = card.querySelectorAll('.vote-bar-row');
    rows.forEach((row, i) => {
      const cat   = i === 0 ? 'adorable' : 'graciosa';
      const count = v[cat] || 0;
      const pct   = max > 0 ? (count / max) * 100 : 0;
      const fill  = row.querySelector('.vote-bar-fill');
      const num   = row.querySelector('.vote-bar-num');
      if (fill) fill.style.width = `${pct}%`;
      if (num)  num.textContent  = count;
    });
  });
}

// ═══════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════
function renderResults() {
  renderCategory('adorable', document.getElementById('resultAdorableContent'));
  renderCategory('graciosa', document.getElementById('resultGraciosaContent'));
}

function renderCategory(category, container) {
  if (!container) return;
  container.innerHTML = '';

  const ranked = images
    .map(f => ({ filename: f, count: (votes[f] || {})[category] || 0 }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count);

  if (ranked.length === 0) {
    const el = document.createElement('div');
    el.className = 'result-empty';
    el.innerHTML = `<span class="result-empty-icon">🗳️</span>
      <p>Todavía no hay votos aquí.</p>
      <p style="font-size:.78rem;opacity:.65">¡Andá a votar!</p>`;
    container.appendChild(el);
    return;
  }

  const winner = ranked[0];
  const crown  = category === 'adorable' ? '👑' : '🤣';

  const wrap = document.createElement('div');
  wrap.className = 'winner-card';

  const imgWrap = document.createElement('div');
  imgWrap.className = 'winner-image-wrap';
  imgWrap.style.cursor = 'zoom-in';
  imgWrap.addEventListener('click', () => openLightbox(winner.filename));

  const img = document.createElement('img');
  img.src     = `/fotos/${winner.filename}`;
  img.alt     = `Ganadora más ${category}`;
  img.loading = 'lazy';

  const crownEl = document.createElement('span');
  crownEl.className   = 'winner-crown';
  crownEl.textContent = crown;

  imgWrap.append(img, crownEl);

  const info = document.createElement('div');
  info.className = 'winner-info';

  const nameEl = document.createElement('div');
  nameEl.className   = 'winner-name';
  nameEl.textContent = formatFilename(winner.filename);

  const votesEl = document.createElement('div');
  votesEl.className   = 'winner-votes';
  votesEl.textContent = `${winner.count} voto${winner.count !== 1 ? 's' : ''}`;

  info.append(nameEl, votesEl);
  wrap.append(imgWrap, info);
  container.appendChild(wrap);
}

// ═══════════════════════════════════════════════════
// localStorage
// ═══════════════════════════════════════════════════
function loadVotes() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveVotes() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(votes)); }
  catch { console.warn('localStorage no disponible.'); }
}
function getMaxVotes() {
  let max = 0;
  for (const fn of images) {
    const v = votes[fn] || {};
    max = Math.max(max, v.adorable || 0, v.graciosa || 0);
  }
  return max;
}

// ═══════════════════════════════════════════════════
// UI helpers
// ═══════════════════════════════════════════════════
function formatFilename(filename) {
  return filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
}

let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function triggerRipple(btn) {
  btn.classList.remove('ripple');
  void btn.offsetWidth;
  btn.classList.add('ripple');
}

// ═══════════════════════════════════════════════════
// Service Worker
// ═══════════════════════════════════════════════════
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(() => console.log('🐾 SW registered'))
      .catch(err => console.warn('SW error:', err));
  }
}
