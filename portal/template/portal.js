/* ゲーム一覧ポータルの動き：絞り込み・検索、プレビュー動画の遅延読み込みと再生、スプリングの出現アニメーション
   ばね（スプリング）の動きは build.mjs が物理計算して下の SPRINGS に書き込む */
(() => {
  'use strict';
  /*SPRINGS*/
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
    card.dataset.revealed = '1';
    revealIO?.unobserve(card);
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
  // カードは最初から見える状態にしておく（画面に入ったかの検知が届かない表示でも、何も見えなくならないように）。
  // 最初の画面にあるものはすぐ、下にあるものは画面に入ったときに動かす。検知が使えなければ動かさずにそのまま
  const inView = (c) => { const r = c.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  let queue = [], flushTimer = 0;
  const revealIO = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting && !e.target.dataset.revealed) { queue.push(e.target); revealIO.unobserve(e.target); }
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => { queue.sort((a, b) => cards.indexOf(a) - cards.indexOf(b)).forEach((c, i) => reveal(c, i)); queue = []; }, 16);
  }, { rootMargin: '0px 0px -6% 0px' }) : null;
  cards.filter(inView).forEach((c, i) => reveal(c, i));
  if (revealIO) cards.filter((c) => !c.dataset.revealed).forEach((c) => revealIO.observe(c));

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
  let mood = 'all';
  function apply() {
    const q = norm(input.value.trim());
    let n = 0, order = 0;
    for (const c of cards) {
      const okGenre = mood === 'all' || c.dataset.moods.split(' ').includes(mood);
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
    mood = chip.dataset.mood;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    apply();
  }));
  input.addEventListener('input', apply);
  /* ── ゲームごとの直接リンク（…#game-keitora）：開いたらそのカードまで動かして、少しの間だけ目立たせる ── */
  function goToHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    const card = id && document.getElementById(id);
    if (!card || !card.classList.contains('gp-card')) return;
    if (card.hidden) { input.value = ''; mood = 'all'; chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.mood === 'all'))); apply(); }
    card.scrollIntoView({ block: 'center', behavior: reduce.matches ? 'auto' : 'smooth' });
    card.classList.add('gp-target');
    setTimeout(() => card.classList.remove('gp-target'), 2600);
  }
  addEventListener('hashchange', goToHash);
  if (location.hash) setTimeout(goToHash, 60);

  root.querySelector('.gp-reset')?.addEventListener('click', () => {
    input.value = ''; mood = 'all';
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.mood === 'all')));
    apply(); input.focus();
  });
})();
