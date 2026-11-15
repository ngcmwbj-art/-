/*
 * coverflow.js — ジャケットが横一列に立体で並んで流れる画面の部品
 *
 * 昔の音楽プレーヤーを横向きにしたときの、あの「ジャケットをめくって探す」画面です。
 * ほかのライブラリは使いません。動きは requestAnimationFrame と transform だけで作り、
 * 画面に出すジャケットは中央のまわりの数枚だけにして、アルバムが 1000 枚あっても軽く動くようにしています。
 *
 * 使い方:
 *   import { createCoverFlow } from './coverflow.js';
 *   const cf = createCoverFlow(rootEl, { getArtUrl, getAlbumTracks, onPlayTrack, getNowPlayingId });
 *   cf.setAlbums(albums);
 *   cf.show({ focusKey });
 *
 * スタイルは css/coverflow.css に入っています（読みこまれていなければ、この部品が自分で読みこみます）。
 */

// ───────── 見た目を決める数字（ジャケットの一辺を 1 としたときの割合） ─────────
const ANGLE = 70;            // 横のジャケットのかたむき（度）
const SIZE_RATIO = 0.55;     // ジャケットの一辺 ÷ 画面の高さ
const CENTER_Y = 0.42;       // ジャケットの中心の高さ（画面の高さに対する割合）
const PERSPECTIVE = 4.0;     // 遠近の強さ（小さいほど強い）
const GAP = 0.90;            // 中央 → となりの1枚目までの横のずれ
const STEP = 0.275;          // 横に重なって並ぶジャケットどうしの間かく
const DEPTH = 1.5;           // 横のジャケットを奥に下げる量
const DRAG_UNIT = 0.36;      // 指をこれだけ動かすと1枚ぶん流れる
const MIN_SIDE = 5;          // 中央の左右に置く枚数（少なくとも）
const MAX_SIDE = 10;         // 中央の左右に置く枚数（多くても）

// ───────── 動きを決める数字 ─────────
const TAP_SLOP = 8;          // これより動いたら「タップ」ではなく「ドラッグ」
const FLING_TAU = 0.38;      // はじいたあとの伸び（秒）。大きいほど遠くまで流れる
const FLING_TAU_REDUCED = 0.12;
const MAX_SPEED = 160;       // 流れる速さの上限（枚/秒）
const FAST_SPEED = 16;       // これより速く流れているあいだは、画像を取りに行かない
const FLIP_MS = 520;         // 裏返しにかける時間
const FLIP_MS_REDUCED = 160;
const WHEEL_UNIT = 100;      // ホイールをこれだけ回すと1枚ぶん

const NO_TITLE = 'アルバム名なし';
const NO_TRACK_TITLE = '名前のない曲';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const now = () => performance.now();

function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/** 秒 → 「3:05」のような文字。わからなければ空っぽ */
function formatTime(sec) {
  if (typeof sec !== 'number' || !isFinite(sec) || sec < 0) return '';
  const s = Math.round(sec);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return hh > 0 ? `${hh}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
}

/** 端を越えて引っぱったときの「ゴムのような手ごたえ」。引くほど重くなる */
const BAND_MAX = 1.1;
const band = (x) => (1 - 1 / ((x * 0.55) / BAND_MAX + 1)) * BAND_MAX;
const bandInverse = (y) => (y >= BAND_MAX ? 50 : (BAND_MAX * y) / (0.55 * (BAND_MAX - y)));

/** ゆっくり始まり、ゆっくり終わる（裏返し用） */
const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

/** スタイルシートが読まれていなければ、この部品のとなりの css/coverflow.css を読みこむ */
function ensureCss(el, onReady) {
  const ready = () => getComputedStyle(el).getPropertyValue('--cf-ready').trim() === '1';
  if (ready()) return;
  let link = document.querySelector('link[data-cf-css]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('../css/coverflow.css', import.meta.url).href;
    link.setAttribute('data-cf-css', '1');
    document.head.appendChild(link);
  }
  link.addEventListener('load', () => onReady(), { once: true });
}

/**
 * ジャケットが流れる画面を作る。
 * @param {HTMLElement} rootEl  呼び出し側が用意した全画面の入れもの
 * @param {object} opts  getArtUrl / getAlbumTracks / onPlayTrack / getNowPlayingId
 */
export function createCoverFlow(rootEl, opts) {
  if (!rootEl) throw new Error('createCoverFlow: 入れものの要素がありません');
  const o = opts || {};

  const reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const isReduced = () => !!(reduceQuery && reduceQuery.matches);

  // 床への映りこみの作り方。-webkit-box-reflect が使えればそれ、だめなら上下反転した複製
  const canReflect = typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('-webkit-box-reflect', 'below');
  const reflectMode = o.reflection === 'copy' || o.reflection === 'native' || o.reflection === 'none'
    ? o.reflection
    : (canReflect ? 'native' : 'copy');

  // ───────── 画面の部品を作る ─────────
  const wrap = h('div', `cf-root cf-reflect-${reflectMode}`);
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', 'ジャケットをめくってアルバムをえらぶ画面');

  const flow = h('div', 'cf-flow');            // ジャケットが並ぶところ
  const dim = h('div', 'cf-dim');              // 裏返したとき、まわりを暗くする幕
  flow.appendChild(dim);

  const caption = h('div', 'cf-caption');      // 中央のジャケットの下の文字
  const titleEl = h('div', 'cf-title');
  const artistEl = h('div', 'cf-artist');
  caption.append(titleEl, artistEl);

  const scrim = h('div', 'cf-scrim');          // 裏面の外をタップしたのを受けとる透明な板

  const stage = h('div', 'cf-flipstage');      // 裏面（曲の一覧）を置くところ
  const panel = h('div', 'cf-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', '曲の一覧');
  const head = h('div', 'cf-panel-head');
  const headTitle = h('div', 'cf-panel-title');
  const headArtist = h('div', 'cf-panel-artist');
  head.append(headTitle, headArtist);
  const list = h('ol', 'cf-tracks');
  panel.append(head, list);
  stage.appendChild(panel);

  const info = h('button', 'cf-info');         // 右下の小さな丸い「i」ボタン
  info.type = 'button';
  info.setAttribute('aria-label', '曲の一覧を見る');
  const infoDot = h('span', 'cf-info-dot', 'i');
  infoDot.setAttribute('aria-hidden', 'true');
  info.appendChild(infoDot);

  const emptyMsg = h('div', 'cf-empty-msg', 'アルバムがまだありません');
  const probe = h('div', 'cf-probe');          // ノッチなどのよけ幅を測るための、見えない小さな箱
  const veil = h('div', 'cf-veil');            // 裏返すあいだ、中央の映りこみを消すための黒い板

  wrap.append(flow, caption, scrim, stage, info, emptyMsg, probe);
  rootEl.classList.add('cf-host');
  rootEl.hidden = true;                         // 作った直後は、かくれている
  rootEl.appendChild(wrap);

  // ───────── いまの状態 ─────────
  let albums = [];
  let visible = false;
  let destroyed = false;

  let pos = 0;              // いま中央にある場所（小数。2.5 なら 2 枚目と 3 枚目のあいだ）
  let vel = 0;              // 流れている速さ（枚/秒）
  let anim = null;          // 目的の1枚へ向かう動き { target, A, B, w, t0 }
  let drag = null;          // 指やマウスでつかんでいるあいだの記録
  let rafId = 0;
  let lastTick = 0;
  let lastRenderPos = 0;
  let speed = 0;            // 1コマあたりの動きから出した速さ（画像を取りに行くかの判断用）
  let moving = false;

  // 画面の大きさから決まる数字（layout() で入れる）
  let W = 0, H = 0, S = 0;
  let gapPx = 0, stepPx = 0, depthPx = 0, unit = 80, perSide = 8, yDelta = 0;
  let panelH = 0;

  const live = new Map();   // 画面に置いているジャケット（番号 → 記録）
  let pool = [];            // 使い回し用に取っておく、外したジャケット
  let stash = null;         // 並べなおしのとき、同じアルバムの絵をそのまま使うための一時置き場
  let shownIndex = -1;      // 下の文字に出しているアルバムの番号
  let centerRec = null;
  let needArt = false;      // まだ画像を取りに行っていないジャケットがある

  // 裏返しの状態: front（表）→ opening → back（裏）→ closing → front
  const flip = { state: 'front', index: -1, p: 0 };
  let flipE = 0, flipAng = 0, flipFlat = false, panelShown = false;
  let panelAlbum = null;
  let panelTracks = [];

  let wheelTimer = 0;
  let wheelGoal = null;     // ホイールで向かっている場所（小数）
  let wheelFrom = 0;        // ホイールを回しはじめたときの番号
  let scrimDown = false;
  let resizeObs = null;

  const maxIndex = () => Math.max(0, albums.length - 1);
  const identity = (a) => `${a.key}\u0000${a.artId == null ? '' : a.artId}`;

  function setMoving(flag) {
    if (flag === moving) return;
    moving = flag;
    wrap.setAttribute('data-cf-moving', flag ? '1' : '0');
  }

  // ───────── 大きさを測って、並べ方の数字を決める ─────────
  function layout() {
    const w = wrap.clientWidth;
    const hh = wrap.clientHeight;
    if (!w || !hh) return false;
    W = w; H = hh;

    const cs = getComputedStyle(probe);
    const inT = parseFloat(cs.paddingTop) || 0;
    const inB = parseFloat(cs.paddingBottom) || 0;
    const inSide = Math.max(parseFloat(cs.paddingLeft) || 0, parseFloat(cs.paddingRight) || 0);

    S = Math.round(clamp(Math.min(H * SIZE_RATIO, W * 0.46), 72, 640));
    const coverTop = Math.max(Math.round(H * CENTER_Y - S / 2), Math.round(inT) + 6);
    const persp = Math.round(S * PERSPECTIVE);
    gapPx = S * GAP;
    stepPx = S * STEP;
    depthPx = S * DEPTH;
    unit = clamp(S * DRAG_UNIT, 48, 130);

    // 奥に下がったジャケットは小さく見える。そのぶんを入れて、画面の端まで何枚いるかを数える
    const k = persp / (persp + depthPx);
    perSide = clamp(Math.ceil((W / 2 - gapPx * k) / (stepPx * k)) + 2, MIN_SIDE, MAX_SIDE);

    wrap.style.setProperty('--cf-size', `${S}px`);
    wrap.style.setProperty('--cf-top', `${coverTop}px`);
    const origin = `50% ${coverTop + S / 2}px`;
    flow.style.perspective = `${persp}px`;
    flow.style.perspectiveOrigin = origin;

    // 裏面（曲の一覧）の大きさと場所。画面のまん中に、ほぼいっぱいの高さで置く
    const availW = Math.max(200, W - 2 * inSide - 24);
    let pH = clamp(H - inT - inB - 20, 150, 560);
    const pW = Math.round(Math.min(clamp(pH * 1.3, 300, 600), availW));
    // せまい画面では「i」ボタンと重ならないよう、少し背を低くする
    if ((W - pW) / 2 < 58 + inSide) pH = Math.max(150, Math.min(pH, H - inT - 2 * (inB + 52)));
    panelH = Math.round(pH);
    const pLeft = Math.round((W - pW) / 2);
    const pTop = Math.round(inT + (H - inT - inB - panelH) / 2);
    panel.style.width = `${pW}px`;
    panel.style.height = `${panelH}px`;
    panel.style.left = `${pLeft}px`;
    panel.style.top = `${pTop}px`;
    yDelta = pTop + panelH / 2 - (coverTop + S / 2);
    // 裏面は大きいので、回るときに画面からはみ出しすぎないよう、遠近をひかえめにする
    stage.style.perspective = `${Math.max(persp, Math.round(pW * 2.6))}px`;
    stage.style.perspectiveOrigin = `50% ${pTop + panelH / 2}px`;

    live.forEach((c) => { c.tf = ''; });   // 数字が変わったので、次の描画で全部置きなおす
    return true;
  }

  // ───────── ジャケット1枚ぶんの部品 ─────────
  function makeCover() {
    const el = h('div', 'cf-cover');
    const floor = h('div', 'cf-floor');     // 映りこみの下じき（うしろのジャケットが透けないように）
    const face = h('div', 'cf-face');       // 絵。画像が無いあいだは、灰色の音符の絵が見える
    const img = document.createElement('img');
    img.className = 'cf-img';
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    face.appendChild(img);
    el.append(floor, face);

    let img2 = null;
    if (reflectMode === 'copy') {
      // -webkit-box-reflect が無いブラウザ用: 上下をひっくり返した複製を下に置く
      const refl = h('div', 'cf-refl');
      const rface = h('div', 'cf-face');
      img2 = document.createElement('img');
      img2.className = 'cf-img';
      img2.alt = '';
      img2.decoding = 'async';
      img2.draggable = false;
      rface.appendChild(img2);
      refl.appendChild(rface);
      el.appendChild(refl);
    }
    const shade = h('div', 'cf-shade');     // 画面の端で黒に溶けこませるための板
    el.appendChild(shade);

    const c = { el, img, img2, shade, index: -1, id: '', token: 0, art: false, tf: '', z: -1, sh: 0, hid: false };
    el._cf = c;
    img.addEventListener('load', () => { if (img.getAttribute('src')) el.classList.add('cf-has-art'); });
    img.addEventListener('error', () => { el.classList.remove('cf-has-art'); });
    return c;
  }

  /** ジャケットの絵を外して、まっさらにする（別のアルバム用に使い回す前に） */
  function clearCover(c) {
    c.token++;
    c.art = false;
    c.index = -1;
    c.id = '';
    c.el.classList.remove('cf-has-art', 'cf-center');
    c.img.removeAttribute('src');
    if (c.img2) c.img2.removeAttribute('src');
    if (veil.parentNode === c.el) veil.remove();
    if (c.hid) { c.el.style.visibility = ''; c.hid = false; }
    if (centerRec === c) centerRec = null;
  }

  /** 画面から外して、使い回し用に取っておく */
  function retire(c) {
    clearCover(c);
    c.el.remove();
    c.tf = '';
    if (pool.length < MAX_SIDE * 2 + 4) pool.push(c);
  }

  function releaseAll(keepPool) {
    live.forEach((c) => retire(c));
    live.clear();
    if (stash) { stash.forEach((c) => retire(c)); stash = null; }
    if (!keepPool) pool = [];
    centerRec = null;
    shownIndex = -1;
    needArt = false;
  }

  /** ジャケットの画像を取りに行く（返事が来たとき、もう別のアルバム用になっていたら捨てる） */
  function requestArt(c) {
    c.art = true;
    const album = albums[c.index];
    const token = c.token;
    if (!album || typeof o.getArtUrl !== 'function') return;
    let p;
    try { p = o.getArtUrl(album); } catch (err) { p = null; }
    Promise.resolve(p).then((url) => {
      if (!visible || c.token !== token || !url || typeof url !== 'string') return;
      c.img.src = url;
      if (c.img2) c.img2.src = url;
    }, () => { /* 画像が取れなくても、音符の絵のままでよい */ });
  }

  // ───────── 並べる ─────────
  function place(c, d) {
    const ad = d < 0 ? -d : d;
    const sg = d < 0 ? -1 : 1;
    const t = ad < 1 ? ad : 1;                                   // 0 = 中央、1 = 横向きになりきった
    const x = sg * (ad < 1 ? gapPx * ad : gapPx + (ad - 1) * stepPx);
    const z = -depthPx * t - (ad > 1 ? (ad - 1) * 2 : 0);        // 遠いものほど、ほんの少しずつ奥へ
    const r = -sg * ANGLE * t;
    let zi = 100 - Math.round(ad);                               // 中央に近いほど手前
    let tf;
    let hide = false;

    if (flip.state !== 'front' && c.index === flip.index && !flipFlat) {
      // 裏返しのとちゅう（表が見えている前半）: 回りながら、裏面の大きさへ近づく
      const sc = lerp(1, panelH / S, flipE);
      tf = `translate3d(${x.toFixed(2)}px,${(yDelta * flipE).toFixed(2)}px,${z.toFixed(2)}px) rotateY(${(r + flipAng).toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      zi = 200;
      hide = flipAng >= 90;
    } else {
      tf = `translate3d(${x.toFixed(2)}px,0,${z.toFixed(2)}px) rotateY(${r.toFixed(2)}deg)`;
    }
    if (tf !== c.tf) { c.el.style.transform = tf; c.tf = tf; }
    if (zi !== c.z) { c.el.style.zIndex = String(zi); c.z = zi; }
    if (hide !== c.hid) { c.el.style.visibility = hide ? 'hidden' : ''; c.hid = hide; }

    // とても横長の画面では、いちばん外の数枚を黒に溶かして、出入りが見えないようにする
    let sh = 0;
    if (perSide >= MAX_SIDE && ad > perSide - 2) sh = Math.round(clamp((ad - (perSide - 2)) / 1.5, 0, 1) * 40) / 40;
    if (sh !== c.sh) { c.shade.style.opacity = String(sh); c.sh = sh; }
  }

  function setCaption(i) {
    shownIndex = i;
    const a = albums[i];
    titleEl.textContent = a ? (a.title || NO_TITLE) : '';
    artistEl.textContent = a ? (a.artist || '') : '';
    wrap.setAttribute('data-cf-index', String(i));
    wrap.setAttribute('data-cf-key', a ? String(a.key) : '');
    const rec = live.get(i) || null;
    if (rec !== centerRec) {
      if (centerRec) centerRec.el.classList.remove('cf-center');
      if (rec) rec.el.classList.add('cf-center');
      centerRec = rec;
    }
  }

  /** いまの pos に合わせて、ジャケットを置く・外す・動かす */
  function render() {
    if (!S) return;
    const n = albums.length;
    if (!n) {
      if (live.size || stash) releaseAll(true);
      lastRenderPos = pos;
      return;
    }
    const c0 = clamp(Math.round(pos), 0, n - 1);
    const lo = Math.max(0, c0 - perSide);
    const hi = Math.min(n - 1, c0 + perSide);

    // 1) 範囲の外に出たものを集める → 新しく入ってくる番号に使い回す
    let spare = null;
    live.forEach((c, i) => {
      if (i < lo || i > hi) { (spare || (spare = [])).push(c); live.delete(i); }
    });
    for (let i = lo; i <= hi; i++) {
      if (live.has(i)) continue;
      const a = albums[i];
      const id = identity(a);
      let c = null;
      if (stash && stash.has(id)) {            // 並べなおし前と同じアルバム → 絵はそのまま
        c = stash.get(id);
        stash.delete(id);
        c.el.classList.remove('cf-center');
      } else {
        if (spare && spare.length) { c = spare.pop(); clearCover(c); }
        else { c = pool.pop() || makeCover(); flow.appendChild(c.el); }
        c.id = id;
        needArt = true;
      }
      c.index = i;
      c.tf = '';
      live.set(i, c);
    }
    if (spare) for (let j = 0; j < spare.length; j++) retire(spare[j]);
    if (stash) { stash.forEach((c) => retire(c)); stash = null; }

    // 2) 置く
    live.forEach((c, i) => place(c, i - pos));

    // 3) 画像（ゆっくりのときだけ、中央に近いものから少しずつ）
    if (needArt && speed <= FAST_SPEED) {
      let budget = 6;
      let left = 0;
      for (let kk = 0; kk <= perSide; kk++) {
        for (let s = kk ? -1 : 1; s <= 1; s += 2) {
          const c = live.get(c0 + s * kk);
          if (!c || c.art) continue;
          if (budget > 0) { requestArt(c); budget--; } else left++;
        }
      }
      needArt = left > 0;
    }

    // 4) 下の文字
    if (c0 !== shownIndex || (centerRec ? centerRec.index !== c0 : true)) setCaption(c0);
    lastRenderPos = pos;
  }

  // ───────── 毎コマの処理（動いているあいだだけ回す） ─────────
  function kick() {
    if (!rafId && visible) rafId = requestAnimationFrame(tick);
  }

  function tick() {
    rafId = 0;
    if (!visible) return;
    const t = now();
    const dt = lastTick ? Math.min(t - lastTick, 50) : 16.7;
    lastTick = t;

    let more = false;
    if (anim) more = stepSpring(t) || more;
    if (flip.state === 'opening' || flip.state === 'closing') more = stepFlip(dt) || more;
    speed = (Math.abs(pos - lastRenderPos) / dt) * 1000;
    render();
    if (needArt) more = true;

    if (more) kick();
    else lastTick = 0;
    setMoving(!!(anim || (drag && drag.moved) || flip.state === 'opening' || flip.state === 'closing'));
  }

  // ───────── 目的の1枚へ、なめらかに止まる動き ─────────
  // 「ちょうど行き過ぎない強さのばね」を式で解いたもの。始めの速さを引きつぐので、
  // はじいた勢いのまま流れて、目的の1枚にぴたりと止まる。
  function startSpring(target, v0, w) {
    const A = pos - target;
    anim = { target, A, B: v0 + w * A, w, t0: now() };
    vel = v0;
    setMoving(true);
    kick();
  }

  function stepSpring(t) {
    const a = anim;
    const s = Math.max(0, (t - a.t0) / 1000);
    const e = Math.exp(-a.w * s);
    const x = (a.A + a.B * s) * e;
    const v = (a.B - a.w * (a.A + a.B * s)) * e;
    pos = a.target + x;
    vel = v;
    if (Math.abs(x) < 0.0015 && Math.abs(v) < 0.03) {
      pos = a.target;
      vel = 0;
      anim = null;
      return false;
    }
    return true;
  }

  /** 端を越える行き過ぎが大きくなりすぎないよう、勢いを弱める */
  function tameOvershoot(A, v, w, limit, outDir) {
    const allow = Math.max(limit, outDir * A);
    for (let tries = 0; tries < 80; tries++) {
      const B = v + w * A;
      let peak = 0;
      for (let s = 0; s <= 1.2; s += 0.01) {
        const out = outDir * (A + B * s) * Math.exp(-w * s);
        if (out > peak) peak = out;
      }
      if (peak <= allow + 1e-6) break;
      v *= 0.85;
    }
    return v;
  }

  /** 指を離したとき: 勢い v（枚/秒）のぶんだけ先の1枚を目的にして流す */
  function fling(v) {
    const reduced = isReduced();
    const n = albums.length;
    if (!n) return;
    v = clamp(v, -MAX_SPEED, MAX_SPEED);
    const tau = reduced ? FLING_TAU_REDUCED : FLING_TAU;
    const proj = pos + v * tau;
    const target = clamp(Math.round(proj), 0, n - 1);
    const dist = Math.abs(target - pos);
    let w = reduced ? 16 : clamp(11 - dist * 0.45, 4.2, 11);   // 遠くへ行くときほど、ゆったり
    if (proj < -0.5 || proj > n - 0.5 || pos < 0 || pos > n - 1) {
      // 端に当たる: 少しだけ行き過ぎて、ゴムのように戻る
      w = Math.max(w, 12);
      const outDir = target === 0 && (proj < 0 || pos < 0) ? -1 : 1;   // どちら向きにはみ出すか
      v = tameOvershoot(pos - target, v, w, reduced ? 0.1 : 0.45, outDir);
    }
    startSpring(target, v, w);
  }

  /** 指定の番号へ流す */
  function goTo(index, w) {
    const n = albums.length;
    if (!n) return;
    startSpring(clamp(Math.round(index), 0, n - 1), anim ? vel : 0, w || (isReduced() ? 18 : 10));
  }

  /** いちばん近い1枚に落ちつく */
  function settle() {
    const n = albums.length;
    if (!n) return;
    const target = clamp(Math.round(pos), 0, n - 1);
    if (!anim && Math.abs(pos - target) < 0.0005) { pos = target; return; }
    startSpring(target, anim ? vel : 0, isReduced() ? 18 : 11);
  }

  function stopSpring() {
    anim = null;
    vel = 0;
  }

  // ───────── 指・マウスでの操作 ─────────
  function toRaw(p) {
    const max = maxIndex();
    if (p < 0) return -bandInverse(-p);
    if (p > max) return max + bandInverse(p - max);
    return p;
  }
  function fromRaw(raw) {
    const max = maxIndex();
    if (raw < 0) return -band(-raw);
    if (raw > max) return max + band(raw - max);
    return raw;
  }

  function onPointerDown(e) {
    if (!visible || !e.isPrimary || !albums.length) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (flip.state !== 'front') return;
    if (drag) endDrag(null, true);     // 前のつかみが終わらないまま残っていたら、ここで終わらせる
    const coverEl = e.target && e.target.closest ? e.target.closest('.cf-cover') : null;
    drag = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      raw0: toRaw(pos),
      moved: false,
      wasMoving: !!anim && Math.abs(vel) > 1.5,   // 流れているのを指で止めた → タップあつかいにしない
      carry: anim ? vel : 0,
      t0: now(),
      rec: coverEl ? coverEl._cf : null,
      samples: [],
    };
    stopSpring();
    clearTimeout(wheelTimer);
    wheelGoal = null;
    try { flow.setPointerCapture(e.pointerId); } catch (err) { /* 古いブラウザでは無くてもよい */ }
  }

  function onPointerMove(e) {
    const d = drag;
    if (!d || e.pointerId !== d.id) return;
    let dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.moved) {
      if (dx * dx + dy * dy < TAP_SLOP * TAP_SLOP) return;
      d.moved = true;
      d.x0 = e.clientX;          // ここを起点にする（動き出しでカクッと飛ばないように）
      dx = 0;
      flow.classList.add('cf-grabbing');
      setMoving(true);
    }
    pos = fromRaw(d.raw0 - dx / unit);
    const t = now();
    d.samples.push({ t, p: pos });
    while (d.samples.length > 2 && t - d.samples[0].t > 140) d.samples.shift();
    kick();
  }

  /** 離す直前の速さ（枚/秒）。指を止めてから離したときは 0 */
  function releaseVelocity(d, t) {
    const sm = d.samples;
    if (sm.length < 2) return 0;
    const last = sm[sm.length - 1];
    if (t - last.t > 80) return 0;
    let first = sm[0];
    for (let i = 0; i < sm.length - 1; i++) {
      if (last.t - sm[i].t <= 100) { first = sm[i]; break; }
    }
    const dt = last.t - first.t;
    if (dt < 4) return 0;
    return ((last.p - first.p) / dt) * 1000;
  }

  function endDrag(e, cancelled) {
    const d = drag;
    if (!d || (e && e.pointerId !== d.id)) return;
    drag = null;
    flow.classList.remove('cf-grabbing');
    try { if (flow.hasPointerCapture && flow.hasPointerCapture(d.id)) flow.releasePointerCapture(d.id); } catch (err) { /* 気にしない */ }
    const t = now();
    kick();                       // 何も動かなくても1コマ回して、「止まった」ことを反映する

    if (cancelled) { settle(); return; }

    if (d.moved) {
      let v = releaseVelocity(d, t);
      // 続けて同じ向きにはじいたら、前の勢いを足す（遠くへ速く行ける）
      if (t - d.t0 < 350 && Math.abs(d.carry) > 4 && Math.sign(d.carry) === Math.sign(v)) v += d.carry * 0.9;
      fling(v);
      return;
    }

    // ここからは「タップ」
    if (d.wasMoving) { settle(); return; }   // 流れているのを止めただけ
    const rec = d.rec;
    if (rec && rec.index >= 0 && live.get(rec.index) === rec) {
      const c0 = clamp(Math.round(pos), 0, maxIndex());
      if (rec.index === c0) {
        if (Math.abs(pos - c0) < 0.3) openFlip(); else settle();   // 中央のジャケット → 裏返す
      } else {
        goTo(rec.index);                                            // 横のジャケット → 中央へ
      }
    } else {
      settle();
    }
  }

  const onPointerUp = (e) => endDrag(e, false);
  const onPointerCancel = (e) => endDrag(e, true);
  const onLostCapture = (e) => { if (drag && e.pointerId === drag.id) endDrag(e, true); };

  // ───────── ホイール・トラックパッド ─────────
  function onWheel(e) {
    if (!visible) return;
    if (e.target && e.target.closest && e.target.closest('.cf-tracks')) return;   // 曲の一覧は、ふつうに縦スクロール
    e.preventDefault();
    if (flip.state !== 'front' || drag || !albums.length || e.ctrlKey) return;
    let d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (e.deltaMode === 1) d *= 33; else if (e.deltaMode === 2) d *= 300;
    if (!d) return;
    if (wheelGoal == null) wheelFrom = clamp(Math.round(anim ? anim.target : pos), 0, maxIndex());
    const base = wheelGoal != null ? wheelGoal : (anim ? anim.target : pos);
    wheelGoal = clamp(base + d / WHEEL_UNIT, 0, maxIndex());
    startSpring(wheelGoal, anim ? vel : 0, isReduced() ? 20 : 14);
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {       // 回すのをやめたら、いちばん近い1枚に落ちつく
      const g = wheelGoal;
      wheelGoal = null;
      if (!visible || drag || g == null) return;
      let target = Math.round(g);
      // 1 目もりが小さいマウスでも、回した向きへ 1 枚は進むように
      if (target === wheelFrom && Math.abs(g - wheelFrom) >= 0.03) target = wheelFrom + Math.sign(g - wheelFrom);
      goTo(target, 11);
    }, 140);
  }

  // ───────── キーボード ─────────
  function onKeyDown(e) {
    if (!visible || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''))) return;
    const n = albums.length;
    const front = flip.state === 'front' || flip.state === 'closing';
    const step = (dir) => {
      if (!front || !n || drag) return;
      const base = anim ? anim.target : Math.round(pos);
      goTo(base + dir, isReduced() ? 18 : 11);
    };
    // この画面が出ているあいだは、これらのキーをこの画面だけで使う（下の画面に伝えない）
    const used = () => { e.preventDefault(); e.stopPropagation(); };
    switch (e.key) {
      case 'ArrowLeft': step(-1); used(); break;
      case 'ArrowRight': step(1); used(); break;
      case 'Home': if (front && n && !drag) goTo(0, 7); used(); break;
      case 'End': if (front && n && !drag) goTo(n - 1, 7); used(); break;
      case 'ArrowUp': if (!front) focusTrack(-1); used(); break;
      case 'ArrowDown': if (!front) focusTrack(1); used(); break;
      case 'Enter':
      case ' ':
      case 'Spacebar':
        // ボタンの上の Enter・スペースは、そのボタンにまかせる（下の画面には伝えない）
        if (t && t.closest && t.closest('.cf-root') && /^(BUTTON|A)$/.test(t.tagName || '')) { e.stopPropagation(); return; }
        if (e.key !== 'Enter') return;
        if (front && n && !drag) openFlip();
        used();
        break;
      case 'Escape':
      case 'Esc':
        if (flip.state === 'back' || flip.state === 'opening') { closeFlip(); used(); }
        break;
      default:
    }
  }

  /** 裏面で ↑ ↓ を押したとき: 曲の行を1つずつえらぶ（Enter でその曲を再生） */
  function focusTrack(dir) {
    const btns = list.querySelectorAll('.cf-track');
    if (!btns.length) return;
    const act = document.activeElement;
    let cur = -1;
    if (act && act.classList && act.classList.contains('cf-track')) cur = Number(act.getAttribute('data-cf-i'));
    else {
      const playing = list.querySelector('.cf-playing .cf-track');
      cur = playing ? Number(playing.getAttribute('data-cf-i')) - (dir > 0 ? 1 : -1) : (dir > 0 ? -1 : btns.length);
    }
    const next = clamp(cur + dir, 0, btns.length - 1);
    try { btns[next].focus(); } catch (err) { /* 気にしない */ }
  }

  // ───────── 裏返し ─────────
  function applyFlip() {
    const e = easeInOut(flip.p);
    flipFlat = isReduced();
    flipE = e;
    flipAng = flipFlat ? 0 : 180 * e;
    dim.style.opacity = (0.62 * e).toFixed(3);
    caption.style.opacity = clamp(1 - e * 6, 0, 1).toFixed(3);
    veil.style.opacity = clamp(e * 2.5, 0, 1).toFixed(3);

    let show;
    if (flipFlat) {
      // 動きを減らす設定のとき: 回さずに、ふわっと出す
      show = flip.p > 0;
      panel.style.opacity = e.toFixed(3);
      panel.style.transform = flip.p >= 1 ? '' : `scale(${lerp(0.96, 1, e).toFixed(4)})`;
    } else {
      show = flipAng >= 90;       // ちょうど真横を向いたところで、表と裏を入れかえる
      panel.style.opacity = '';
      if (flip.p >= 1) panel.style.transform = '';
      else if (show) {
        const sb = lerp(S / panelH, 1, e);
        panel.style.transform = `translate3d(0,${(-(1 - e) * yDelta).toFixed(2)}px,0) rotateY(${(flipAng - 180).toFixed(2)}deg) scale(${sb.toFixed(4)})`;
      }
    }
    if (show !== panelShown) { panel.classList.toggle('cf-open', show); panelShown = show; }
  }

  function stepFlip(dt) {
    const dur = isReduced() ? FLIP_MS_REDUCED : FLIP_MS;
    if (flip.state === 'opening') {
      flip.p = Math.min(1, flip.p + dt / dur);
      if (flip.p >= 1) flip.state = 'back';
    } else if (flip.state === 'closing') {
      flip.p = Math.max(0, flip.p - dt / dur);
      if (flip.p <= 0) { endFlip(); return false; }
    }
    applyFlip();
    return flip.state === 'opening' || flip.state === 'closing';
  }

  /** 表にもどりきったあとの片づけ */
  function endFlip() {
    flip.state = 'front';
    flip.p = 0;
    flip.index = -1;
    flipE = 0; flipAng = 0;
    if (panelShown) { panel.classList.remove('cf-open'); panelShown = false; }
    panel.style.transform = '';
    panel.style.opacity = '';
    dim.style.opacity = '';
    caption.style.opacity = '';
    veil.remove();
    list.textContent = '';
    panelAlbum = null;
    panelTracks = [];
    scrimDown = false;
    wrap.classList.remove('cf-flipped');
    wrap.setAttribute('data-cf-flipped', '0');
    info.setAttribute('aria-label', '曲の一覧を見る');
    live.forEach((c) => { c.tf = ''; });
  }

  /** 中央のジャケットを裏返して、曲の一覧を出す */
  function openFlip() {
    const n = albums.length;
    if (!n || !S || !visible) return;
    if (flip.state === 'back' || flip.state === 'opening') return;
    if (flip.state === 'front') {
      const i = clamp(Math.round(anim ? anim.target : pos), 0, n - 1);
      clearTimeout(wheelTimer);
      wheelGoal = null;
      flip.index = i;
      flip.p = 0;
      buildPanel(albums[i]);
      if (Math.abs(pos - i) > 0.001 || anim) startSpring(i, anim ? vel : 0, 14);
      const rec = live.get(i);
      if (rec) rec.el.appendChild(veil);
      wrap.classList.add('cf-flipped');
      wrap.setAttribute('data-cf-flipped', '1');
      info.setAttribute('aria-label', 'ジャケットにもどる');
    }
    flip.state = 'opening';
    setMoving(true);
    kick();
  }

  /** 裏返したジャケットを、表にもどす */
  function closeFlip() {
    if (flip.state !== 'back' && flip.state !== 'opening') return;
    const act = document.activeElement;
    if (act && panel.contains(act) && act.blur) act.blur();   // かくれる行に、えらんだ印を残さない
    flip.state = 'closing';
    setMoving(true);
    kick();
  }

  /** とちゅうでも、すぐ表にもどす（並べなおし・かくすとき） */
  function resetFlip() {
    if (flip.state === 'front') return;
    flip.p = 0;
    applyFlip();
    endFlip();
  }

  // ───────── 裏面（曲の一覧） ─────────
  function buildPanel(album) {
    panelAlbum = album;
    headTitle.textContent = album.title || NO_TITLE;
    headArtist.textContent = album.artist || '';
    let tracks = [];
    try {
      const got = typeof o.getAlbumTracks === 'function' ? o.getAlbumTracks(album) : [];
      if (Array.isArray(got)) tracks = got;
    } catch (err) { tracks = []; }
    panelTracks = tracks;

    list.textContent = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < tracks.length; i++) {
      const tr = tracks[i] || {};
      const li = h('li', 'cf-row');
      const b = h('button', 'cf-track');
      b.type = 'button';
      b.setAttribute('data-cf-i', String(i));
      const num = typeof tr.track === 'number' && isFinite(tr.track) && tr.track > 0 ? Math.floor(tr.track) : i + 1;
      b.append(
        h('span', 'cf-track-no', String(num)),
        h('span', 'cf-track-title', tr.title || NO_TRACK_TITLE),
        h('span', 'cf-track-time', formatTime(tr.duration)),
      );
      li.appendChild(b);
      frag.appendChild(li);
    }
    if (!tracks.length) frag.appendChild(h('li', 'cf-row cf-row-empty', '曲がありません'));
    list.appendChild(frag);
    list.scrollTop = 0;

    // 再生中の曲がこのアルバムにあれば、見えるところまで送っておく
    const at = markPlaying();
    if (at > 3) list.scrollTop = Math.max(0, (at - 2) * 44);
  }

  /** 再生中の曲に印を付ける。印を付けた行の番号を返す（無ければ -1） */
  function markPlaying() {
    if (!panelAlbum) return -1;
    let id = null;
    try { id = typeof o.getNowPlayingId === 'function' ? o.getNowPlayingId() : null; } catch (err) { id = null; }
    let at = -1;
    const rows = list.children;
    for (let i = 0; i < panelTracks.length && i < rows.length; i++) {
      const on = id != null && panelTracks[i] != null && panelTracks[i].id === id;
      rows[i].classList.toggle('cf-playing', on);
      const b = rows[i].firstChild;
      if (b && b.setAttribute) {
        if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      }
      if (on && at < 0) at = i;
    }
    return at;
  }

  function onListClick(e) {
    const b = e.target && e.target.closest ? e.target.closest('.cf-track') : null;
    if (!b || !panelAlbum) return;
    if (flip.state === 'front' || flip.state === 'closing' || flip.p < 0.6) return;   // 裏返りきる前の、まちがいタップをよける
    const i = Number(b.getAttribute('data-cf-i'));
    if (!(i >= 0) || i >= panelTracks.length) return;
    try {
      if (typeof o.onPlayTrack === 'function') o.onPlayTrack(panelAlbum, i);
    } finally {
      markPlaying();
    }
  }

  // ───────── そのほかの入力 ─────────
  function onScrimDown(e) { if (e.isPrimary) scrimDown = true; }
  function onScrimUp() { if (scrimDown) { scrimDown = false; closeFlip(); } }
  function onScrimCancel() { scrimDown = false; }

  function onInfoClick() {
    if (!albums.length) return;
    if (flip.state === 'back' || flip.state === 'opening') closeFlip();
    else if (!drag) openFlip();
  }

  /** ページごとスクロールしたり拡大したりしないように（曲の一覧の中だけは、縦に動かせる） */
  function onTouchMove(e) {
    if (e.target && e.target.closest && e.target.closest('.cf-tracks')) return;
    if (e.cancelable) e.preventDefault();
  }
  const preventDefault = (e) => { e.preventDefault(); };

  function onResize() {
    if (!visible) return;
    if (!layout()) return;
    render();
    if (flip.state !== 'front') applyFlip();
    kick();
  }

  flow.addEventListener('pointerdown', onPointerDown);
  flow.addEventListener('pointermove', onPointerMove);
  flow.addEventListener('pointerup', onPointerUp);
  flow.addEventListener('pointercancel', onPointerCancel);
  flow.addEventListener('lostpointercapture', onLostCapture);
  flow.addEventListener('contextmenu', preventDefault);
  scrim.addEventListener('pointerdown', onScrimDown);
  scrim.addEventListener('pointerup', onScrimUp);
  scrim.addEventListener('pointercancel', onScrimCancel);
  list.addEventListener('click', onListClick);
  panel.addEventListener('touchstart', () => {}, { passive: true });   // iOS で押した色（:active）が出るように
  info.addEventListener('click', onInfoClick);
  wrap.addEventListener('wheel', onWheel, { passive: false });
  wrap.addEventListener('touchmove', onTouchMove, { passive: false });
  wrap.addEventListener('gesturestart', preventDefault);

  ensureCss(wrap, () => { if (visible && !destroyed) onResize(); });

  // ───────── 外から使う関数 ─────────

  /** アルバムを並べなおす。いま中央にあるアルバムが新しい並びにもあれば、それを中央のままにする */
  function setAlbums(next) {
    if (destroyed) return;
    const cur = albums[clamp(Math.round(anim ? anim.target : pos), 0, maxIndex())];
    const curKey = cur ? cur.key : null;
    albums = Array.isArray(next) ? next.slice() : [];
    const n = albums.length;

    if (drag) endDrag(null, true);
    stopSpring();
    clearTimeout(wheelTimer);
    wheelGoal = null;

    const find = (key) => {
      if (key != null) for (let j = 0; j < n; j++) if (albums[j].key === key) return j;
      return -1;
    };
    // 裏返して曲の一覧を見ているアルバムが新しい並びにもあれば、開いたままにする
    let keepFlip = -1;
    if ((flip.state === 'back' || flip.state === 'opening') && panelAlbum) keepFlip = find(panelAlbum.key);
    if (keepFlip < 0) resetFlip();

    const i = keepFlip >= 0 ? keepFlip : find(curKey);
    pos = i >= 0 ? i : clamp(Math.round(pos), 0, Math.max(0, n - 1));

    // 同じアルバム（同じ絵）のジャケットは、絵を外さずにそのまま使う
    if (live.size) {
      stash = stash || new Map();
      live.forEach((c) => {
        if (c.id && !stash.has(c.id)) stash.set(c.id, c); else retire(c);
      });
      live.clear();
    }
    centerRec = null;
    shownIndex = -1;
    wrap.classList.toggle('cf-none', n === 0);
    if (!n) { titleEl.textContent = ''; artistEl.textContent = ''; wrap.setAttribute('data-cf-index', '-1'); wrap.setAttribute('data-cf-key', ''); }

    if (visible) {
      speed = 0;
      if (keepFlip >= 0) flip.index = keepFlip;
      render();
      if (keepFlip >= 0) {
        // 曲の一覧を作りなおす（スクロールの位置はそのまま）
        const top = list.scrollTop;
        buildPanel(albums[keepFlip]);
        list.scrollTop = top;
        const rec = live.get(keepFlip);
        if (rec && veil.parentNode !== rec.el) rec.el.appendChild(veil);
      }
      kick();
    } else if (stash) {
      stash.forEach((c) => retire(c));
      stash = null;
    }
  }

  /** 表示する。focusKey のアルバムを中央に（無ければ前回の位置） */
  function show(arg) {
    if (destroyed) return;
    const focusKey = arg && arg.focusKey != null ? arg.focusKey : null;
    let focusAt = -1;
    if (focusKey != null) {
      for (let j = 0; j < albums.length; j++) if (albums[j].key === focusKey) { focusAt = j; break; }
    }
    if (focusAt >= 0) {
      if (drag) endDrag(null, true);
      resetFlip();
      stopSpring();
      pos = focusAt;
    }

    if (!visible) {
      visible = true;
      rootEl.hidden = false;
      wrap.classList.toggle('cf-none', albums.length === 0);
      document.addEventListener('keydown', onKeyDown, true);
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', onResize);
      if (typeof ResizeObserver === 'function') {
        resizeObs = new ResizeObserver(onResize);
        resizeObs.observe(wrap);
      }
      pos = clamp(Math.round(pos), 0, maxIndex());
      lastTick = 0;
      lastRenderPos = pos;
      setMoving(false);
      wrap.setAttribute('data-cf-flipped', '0');
      layout();
    }
    speed = 0;
    render();
    kick();
  }

  /** かくす。動きと入力を止めて、画像もはなす */
  function hide() {
    if (!visible) { rootEl.hidden = true; return; }
    if (drag) {
      const d = drag;
      drag = null;
      flow.classList.remove('cf-grabbing');
      try { if (flow.hasPointerCapture && flow.hasPointerCapture(d.id)) flow.releasePointerCapture(d.id); } catch (err) { /* 気にしない */ }
    }
    if (anim) pos = anim.target;       // 流れているとちゅうなら、行き先に着いたことにする
    stopSpring();
    pos = clamp(Math.round(pos), 0, maxIndex());
    resetFlip();
    clearTimeout(wheelTimer);
    wheelGoal = null;
    visible = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    lastTick = 0;
    setMoving(false);
    document.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    if (resizeObs) { resizeObs.disconnect(); resizeObs = null; }
    releaseAll(false);                 // ジャケットを全部外して、画像への参照もはなす
    rootEl.hidden = true;
  }

  /** 再生中の曲が変わったときなどに呼ぶ。裏面の「再生中」の印を付けなおす */
  function refresh() {
    if (destroyed || !visible) return;
    if (flip.state !== 'front') markPlaying();
  }

  /** 片づける（もう使わないとき） */
  function destroy() {
    if (destroyed) return;
    hide();
    destroyed = true;
    albums = [];
    wrap.remove();
    rootEl.classList.remove('cf-host');
  }

  return {
    setAlbums,
    show,
    hide,
    isVisible: () => visible,
    refresh,
    destroy,
  };
}
