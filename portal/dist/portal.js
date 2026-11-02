/* ゲーム一覧ポータルの動き：絞り込み・検索、プレビュー動画の遅延読み込みと再生、スプリングの出現アニメーション
   ばね（スプリング）の動きは build.mjs が物理計算して下の SPRINGS に書き込む */
(() => {
  'use strict';
  const SPRINGS = {"frame":{"duration":859,"easing":"linear(0.0002, 0.0325, 0.1076, 0.2102, 0.3276, 0.4427, 0.5619, 0.6727, 0.7714, 0.8561, 0.9259, 0.9812, 1.0228, 1.0507, 1.07, 1.0805, 1.0839, 1.0819, 1.0761, 1.0678, 1.0581, 1.0485, 1.0384, 1.029, 1.0205, 1.0132, 1.0071, 1.0023, 0.9986, 0.9961, 0.9943, 0.9933, 0.993, 0.9931, 0.9935, 0.9942, 0.995, 0.9958, 0.9966, 0.9974, 0.9982, 0.9988, 0.9993, 0.9997, 1.0001, 1.0003, 1.0005, 1.0005, 1)","fallback":"cubic-bezier(.34, 1.42, .52, 1)","overshoot":8.4},"content":{"duration":817,"easing":"linear(0.0001, 0.0215, 0.0708, 0.1388, 0.2177, 0.3019, 0.3868, 0.4695, 0.5475, 0.6196, 0.6848, 0.7429, 0.7937, 0.8375, 0.8748, 0.9061, 0.9319, 0.9529, 0.9697, 0.9829, 0.993, 1.0005, 1.0059, 1.0096, 1.012, 1.0132, 1.0137, 1.0136, 1.013, 1.0121, 1.0111, 1.0099, 1.0088, 1.0076, 1.0065, 1.0055, 1.0046, 1.0038, 1.003, 1.0024, 1.0019, 1.0014, 1.001, 1.0007, 1.0005, 1.0003, 1.0001, 1, 1)","fallback":"cubic-bezier(.34, 1.42, .52, 1)","overshoot":1.4}};
  const root = document.querySelector('[data-game-portal]');
  if (!root) return;
  document.documentElement.classList.add('gp-js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const cards = [...root.querySelectorAll('.gp-card')];
  const input = root.querySelector('.gp-search input');
  const chips = [...root.querySelectorAll('.gp-chip')];
  const count = root.querySelector('.gp-count');
  const empty = root.querySelector('.gp-empty');
  const supportsLinear = CSS.supports('animation-timing-function', 'linear(0, 1)');
  const ease = (s) => (supportsLinear ? s.easing : s.fallback);

  /* ── 出現：枠をばねで持ち上げ、少し遅れて映像、さらに遅れて文字を1行ずつ ── */
  function reveal(card, order) {
    card.classList.remove('gp-pending');
    card.dataset.revealed = '1';
    revealIO.unobserve(card);
    if (reduce.matches || !card.animate) return;
    const d0 = Math.min(order, 8) * 70;
    const F = SPRINGS.frame, C = SPRINGS.content;
    card.animate([{ transform: 'translateY(34px) scale(.94)' }, { transform: 'none' }], { duration: F.duration, delay: d0, easing: ease(F), fill: 'backwards' });
    card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: d0, easing: 'ease-out', fill: 'backwards' });
    const media = card.querySelector('.gp-media > :is(img, video)');
    if (media) media.animate([{ transform: 'scale(1.14)' }, { transform: 'none' }], { duration: C.duration, delay: d0 + 90, easing: ease(C), fill: 'backwards' });
    [...card.querySelectorAll('.gp-body > *')].forEach((el, j) => {
      const dl = d0 + 170 + j * 45;
      el.animate([{ transform: 'translateY(14px)' }, { transform: 'none' }], { duration: C.duration, delay: dl, easing: ease(C), fill: 'backwards' });
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: dl, easing: 'ease-out', fill: 'backwards' });
    });
  }
  // 画面に入ったものから順に出す
  let queue = [], flushTimer = 0;
  const revealIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting && !e.target.dataset.revealed) { queue.push(e.target); revealIO.unobserve(e.target); }
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => { queue.sort((a, b) => cards.indexOf(a) - cards.indexOf(b)).forEach((c, i) => reveal(c, i)); queue = []; }, 16);
  }, { rootMargin: '0px 0px -6% 0px' });
  cards.forEach((c) => { c.classList.add('gp-pending'); revealIO.observe(c); });

  /* ── プレビュー動画：近づいたら読み込んで再生、離れたら止める ── */
  const canPlayWebm = !!document.createElement('video').canPlayType('video/webm; codecs="vp9"');
  function load(video) {
    if (video.dataset.loaded) return;
    video.dataset.loaded = '1';
    const src = canPlayWebm ? video.dataset.webm : video.dataset.mp4;
    video.src = src;
    video.addEventListener('playing', () => video.classList.add('is-playing'));
    video.addEventListener('error', () => { if (video.src.endsWith('.webm')) video.src = video.dataset.mp4; }, { once: true });
  }
  const userPaused = new WeakSet();
  function play(video) {
    load(video);
    if (userPaused.has(video) || reduce.matches) return;
    const p = video.play();
    if (p && p.catch) p.catch(() => {}); // 省電力モードなどで止められたら静止画のまま
    setToggle(video, true);
  }
  function pause(video) { video.pause(); setToggle(video, false); }
  function setToggle(video, on) {
    const b = video.closest('.gp-media').querySelector('.gp-play-toggle');
    if (b) { b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'プレビューを止める' : 'プレビューを再生'); }
  }
  const videoIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target;
      if (e.isIntersecting && e.intersectionRatio > 0.35) play(v); else if (!e.isIntersecting || e.intersectionRatio < 0.1) pause(v);
    }
  }, { threshold: [0, 0.1, 0.35, 0.6] });
  root.querySelectorAll('.gp-media video').forEach((v) => videoIO.observe(v));
  root.querySelectorAll('.gp-play-toggle').forEach((b) => b.addEventListener('click', () => {
    const v = b.closest('.gp-media').querySelector('video');
    if (b.getAttribute('aria-pressed') === 'true') { userPaused.add(v); pause(v); }
    else { userPaused.delete(v); load(v); v.play().catch(() => {}); setToggle(v, true); }
  }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) root.querySelectorAll('.gp-media video').forEach((v) => v.pause());
  });

  /* ── 絞り込み・検索 ── */
  const norm = (s) => s.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  let genre = 'all';
  function apply() {
    const q = norm(input.value.trim());
    let n = 0, order = 0;
    for (const c of cards) {
      const okGenre = genre === 'all' || c.dataset.genre === genre;
      const okText = !q || norm(c.dataset.search).includes(q);
      const show = okGenre && okText;
      const was = !c.hidden;
      c.hidden = !show;
      if (show) { n++; if (!was) reveal(c, order++); }
    }
    count.textContent = `${n}本を表示中`;
    empty.hidden = n > 0;
  }
  chips.forEach((chip) => chip.addEventListener('click', () => {
    genre = chip.dataset.genre;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    apply();
  }));
  input.addEventListener('input', apply);
  root.querySelector('.gp-reset')?.addEventListener('click', () => {
    input.value = ''; genre = 'all';
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.genre === 'all')));
    apply(); input.focus();
  });
})();
