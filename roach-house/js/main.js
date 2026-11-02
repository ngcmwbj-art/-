// 起動・描画・画面の表示
import * as THREE from 'three';
import { buildWorld, ROWS, TABLES, DOOR, rowAt } from './world.js';
import { Game, DIFFS, MAX_NYMPHS } from './game.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { clamp, damp, inRect } from './util.js';
import { FX, AutoQuality, LEVELS } from './fx.js';
import { setTextureSize } from './textures.js';

const $ = (id) => document.getElementById(id);

// ---------- 予期しないエラーを画面に出す（不具合報告用） ----------
function showError(msg) {
  const el = $('err');
  if (!el) return;
  el.hidden = false;
  el.textContent = `エラーが起きました。画面を再読み込みしてください。\n${msg}`;
}
window.addEventListener('error', (e) => showError(e.message || String(e)));
window.addEventListener('unhandledrejection', (e) => showError(String(e.reason)));

const store = {
  get(k, d) { try { const v = localStorage.getItem(`roachhouse.${k}`); return v === null ? d : JSON.parse(v); } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem(`roachhouse.${k}`, JSON.stringify(v)); } catch (_) { /* 保存できなくても遊べる */ } },
};

const isTouchDevice = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
// 画質：自動（PC=高・スマホ=中から始めて、重ければ下げる）／高／中／低
// テスト用：?q=high|medium|low で画質を固定（保存はしない）
const urlQ = (() => { try { return new URLSearchParams(location.search).get('q'); } catch (_) { return null; } })();
let qualityPref = ['high', 'medium', 'low'].includes(urlQ) ? urlQ : store.get('quality', 'auto');
if (!['auto', 'high', 'medium', 'low'].includes(qualityPref)) qualityPref = 'auto';
const startLevel = qualityPref === 'auto' ? (isTouchDevice ? 'medium' : 'high') : qualityPref;
setTextureSize(LEVELS[startLevel].tex);

// ---------- three.js ----------
const canvas = $('c');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  showError('この端末では 3D 表示（WebGL）が使えません。');
  throw e;
}
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.03, 400);
const L0 = LEVELS[startLevel];
const world = buildWorld(scene, renderer, { shadow: L0.shadow, dust: L0.dust, shafts: L0.shafts, leaves: L0.leaves });
const fx = new FX(renderer, scene, camera);
fx.setLevel(startLevel);
const autoQ = new AutoQuality(fx, (lvl, fps) => {
  world.setShadow(LEVELS[lvl].shadow);
  ui.toast(`動きをなめらかにするため画質を「${LEVELS[lvl].label}」にしました（${Math.round(fps)}fps）`, 'info');
});
autoQ.auto = qualityPref === 'auto';
function applyQuality(pref) {
  qualityPref = pref;
  store.set('quality', pref);
  autoQ.auto = pref === 'auto';
  const lvl = pref === 'auto' ? (isTouchDevice ? 'medium' : 'high') : pref;
  fx.setLevel(lvl);
  world.setShadow(LEVELS[lvl].shadow);
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  fx.setSize(w, h);
  camera.aspect = w / Math.max(1, h);
  camera.fov = w < h ? 72 : 60;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- 入力・音・UI ----------
const sfx = new Sfx();
const input = new Input(canvas, $('touch'));
let soundOn = store.get('sound', true);
let hintsOn = store.get('hints', true);
$('optSound').checked = soundOn;
$('optHints').checked = hintsOn;
sfx.setMuted(!soundOn);

const ui = {
  toast(text, kind) {
    const box = $('toasts');
    const el = document.createElement('div');
    el.className = `toast ${kind || ''}`;
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3100);
  },
  hurtLevel: 0,
  hurt(k) { this.hurtLevel = Math.min(1, this.hurtLevel + k * 0.6 + 0.1); },
  gameOver(res) { setTimeout(() => showResult(res), 1400); },
};

const game = new Game({ scene, sfx, ui });
window.__rh = { game, input, THREE, scene, camera, renderer, fx, world };

// ---------- 画面切りかえ ----------
let screen = 'title';
function setScreen(s) {
  screen = s;
  $('title').hidden = s !== 'title';
  $('pause').hidden = s !== 'pause';
  $('result').hidden = s !== 'result';
  $('hud').hidden = !(s === 'play' || s === 'pause' || s === 'over');
  updateTouchVisibility();
}
function updateTouchVisibility() {
  const touch = input.touchMode || isTouchDevice;
  document.body.classList.toggle('touch', !!touch);
  $('touch').hidden = !(touch && screen === 'play');
}

let lastDiff = 'normal';
function startGame(diff) {
  sfx.unlock();
  sfx.startAmbience();
  lastDiff = diff;
  game.start(diff);
  hints.reset();
  camState.yaw = game.camYaw;
  camState.pitch = 0.36;
  camState.init = true;
  $('target').textContent = game.diff.target;
  const pips = $('pips');
  pips.innerHTML = '';
  for (let i = 0; i < game.diff.target; i++) pips.appendChild(Object.assign(document.createElement('span'), { className: 'pip' }));
  $('toasts').innerHTML = '';
  setScreen('play');
  updateCmdButtons();
}

function calmScreen() {
  ui.hurtLevel = 0;
  $('dmg').style.opacity = '0';
  sfx.setTension(0);
}
function pauseGame() {
  if (screen !== 'play') return;
  calmScreen();
  setScreen('pause');
  $('pauseTip').textContent = pick(TIPS);
}
function resumeGame() {
  if (screen !== 'pause') return;
  sfx.unlock();
  setScreen('play');
}
function toTitle() {
  calmScreen();
  game.state = 'title';
  setScreen('title');
  renderBest();
}

const TIPS = [
  '台の下でじっとしていれば、農場主からはほとんど見えません。',
  'がっつきゲージは緑のうちに離すと音が出ません。黄色で止めるのが一番効率がいい食べかたです。',
  '「囮」の仲間が追われている間に、反対側のコンテナを狙いましょう。',
  '農場主がコンテナを運んでいる時に突撃すると、コンテナを床に落とします。',
  '卵は畝の葉の下か台の下に産むと、見つかりにくくなります。',
  'ダメになったコンテナを農場主が見つけると、怒って近くにホイホイを置きます。',
  '殺虫剤は黄色い輪、叩きつぶしは赤い輪が予告です。輪が出たらすぐ離れましょう。',
  '「探索」の仲間は少しずつしか食べませんが、何匹もいると大きな戦力です。',
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

document.querySelectorAll('[data-diff]').forEach((b) => b.addEventListener('click', () => startGame(b.dataset.diff)));
$('btnResume').addEventListener('click', resumeGame);
$('btnRetry').addEventListener('click', () => startGame(lastDiff));
$('btnTitle').addEventListener('click', toTitle);
$('btnAgain').addEventListener('click', () => startGame(lastDiff));
$('btnTitle2').addEventListener('click', toTitle);
$('pauseBtn').addEventListener('click', pauseGame);
$('optSound').addEventListener('change', (e) => { soundOn = e.target.checked; store.set('sound', soundOn); sfx.setMuted(!soundOn); });
$('optQuality').value = qualityPref;
$('optQuality').addEventListener('change', (e) => applyQuality(e.target.value));
$('optHints').addEventListener('change', (e) => { hintsOn = e.target.checked; store.set('hints', hintsOn); });
document.querySelectorAll('[data-cmd]').forEach((b) => b.addEventListener('click', (e) => {
  e.preventDefault();
  if (screen !== 'play') return;
  game.setMode(b.dataset.cmd);
  updateCmdButtons();
  b.blur();
}));
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
window.addEventListener('pointerdown', () => sfx.unlock(), { capture: true });

function updateCmdButtons() {
  for (const m of ['search', 'decoy', 'follow']) $(`cmd-${m}`).classList.toggle('on', game.mode === m);
}

function renderBest() {
  const best = store.get('best', {});
  for (const k of Object.keys(DIFFS)) {
    const b = best[k];
    $(`best-${k}`).textContent = b ? `最高 ${b.rank}・${b.score}点` : '';
  }
}
renderBest();

// ---------- 結果 ----------
const REASONS = {
  ruined: '目標の数のコンテナをダメにした。今日の出荷はめちゃくちゃだ！',
  time: 'トラックが出発してしまった。パプリカは無事に市場へ…',
  shipped: '出荷が進みすぎて、もう目標に届かない。',
  dead: '仲間も卵もいなくなってしまった…',
};
function showResult(res) {
  if (game.state !== 'over' || game.result !== res) return;
  calmScreen();
  $('rTitle').textContent = res.win ? '作戦成功！' : '作戦失敗…';
  $('rTitle').className = `rtitle ${res.win ? 'win' : 'lose'}`;
  $('rReason').textContent = REASONS[res.reason] || '';
  $('rRank').textContent = res.rank;
  $('rScore').textContent = res.score;
  const best = store.get('best', {});
  const prev = best[res.diff];
  if (!prev || res.score > prev.score) {
    best[res.diff] = { score: res.score, rank: res.rank };
    store.set('best', best);
    $('rBest').textContent = prev ? `自己ベスト更新！（前回 ${prev.score}）` : '初記録！';
  } else $('rBest').textContent = `自己ベスト ${prev.score}`;
  const s = res.stats;
  const mm = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const rows = [
    ['ダメにした箱', `${s.ruined} 箱`], ['出荷された箱', `${s.shipped} 箱`],
    ['残り時間', mm(res.time)], ['産んだ卵', `${s.eggs} 個`],
    ['生まれた仲間', `${s.born} 匹`], ['生き残った仲間', `${res.alive} 匹`],
    ['突撃した回数', `${s.attacks} 回`], ['見つかった回数', `${s.chased} 回`],
  ];
  $('rStats').innerHTML = rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
  $('rTip').textContent = res.win ? (res.rank === 'S' ? '完璧な作戦でした。むずかしいにも挑戦してみよう。' : `ヒント：${pick(TIPS)}`) : `ヒント：${pick(TIPS)}`;
  setScreen('result');
}

// ---------- ヒント ----------
const hints = {
  list: [
    { id: 'move', kb: 'WASDで移動、マウスをドラッグ（またはQ/E）で視点を回せます。まずは右の方にある野菜コンテナを目指そう', tc: '左下をなぞって移動、右側をなぞって視点を回せます。まずは野菜コンテナを目指そう', until: (g) => g.elapsed > 9 },
    { id: 'map', kb: '右上の地図の緑の四角がまだ食べられるコンテナ。赤い点が農場主、扇形が視界です', tc: '右上の地図の緑の四角がコンテナ。赤い点が農場主、扇形が視界です', until: (g) => g.elapsed > 18 },
    { id: 'eat', kb: 'コンテナのそばでスペースを長押しすると食べる。がっつきゲージが赤になる前に離そう！', tc: 'コンテナのそばで「食べる」を長押し。がっつきゲージが赤になる前に離そう！', when: (g) => !!(g.context() && g.context().crate), until: (_, ev) => ev.has('ruin') || ev.has('egg'), max: 12 },
    { id: 'climb', kb: '台の上のコンテナへは、台のふちでスペースを押すと登れます', tc: '台の上のコンテナへは、台のふちで「登る」を押すと登れます', when: (g) => { const c = g.context(); return c && c.text === '台に登る'; }, until: (_, ev) => ev.has('climb'), max: 9 },
    { id: 'egg', kb: '栄養が満タン！ Rで卵を産もう。葉の下や台の下なら見つかりにくい', tc: '栄養が満タン！「産卵」で卵を産もう。葉の下や台の下なら見つかりにくい', when: (g) => g.nutrition >= 100, until: (_, ev) => ev.has('egg'), max: 12 },
    { id: 'cmd', kb: '仲間が生まれた！ 1：探索　2：囮　3：集合 で指示を出せます', tc: '仲間が生まれた！ 右の「探索・囮・集合」で指示を出せます', when: (_, ev) => ev.has('hatch'), max: 10 },
    { id: 'hide', kb: '見つかった！ 葉の下や台の下に逃げこんで、じっとしていよう', tc: '見つかった！ 葉の下や台の下に逃げこんで、じっとしていよう', when: (_, ev) => ev.has('spotted'), max: 7 },
    { id: 'attack', kb: '農場主の足もと！ Fで顔に突撃するとパニックにできる', tc: '農場主の足もと！「突撃」で顔に飛びつくとパニックにできる', when: (g) => g.canAttackNow() && g.elapsed > 25, until: (_, ev) => ev.has('panic'), max: 6 },
  ],
  reset() { this.done = new Set(); this.cur = null; this.t = 0; this.events = new Set(); this.seenEvents = new Set(); },
  update(dt, g) {
    for (const e of g.events) this.seenEvents.add(e);
    const ev = this.seenEvents;
    const el = $('hint');
    if (!hintsOn) { el.hidden = true; return; }
    if (this.cur) {
      this.t += dt;
      const h = this.cur;
      if ((h.until && h.until(g, ev)) || this.t > (h.max || 14)) { this.done.add(h.id); this.cur = null; el.hidden = true; }
      return;
    }
    for (const h of this.list) {
      if (this.done.has(h.id)) continue;
      if (h.when && !h.when(g, ev)) continue;
      if (!h.when && h.until && h.until(g, ev)) { this.done.add(h.id); continue; }
      this.cur = h; this.t = 0;
      el.textContent = (document.body.classList.contains('touch') ? h.tc : h.kb);
      el.hidden = false;
      break;
    }
  },
};
hints.reset();

// ---------- カメラ ----------
const camState = { yaw: 0, pitch: 0.36, dist: 3.3, pos: new THREE.Vector3(), look: new THREE.Vector3(), init: true };
window.__rh.cam = camState;
function updateCamera(dt) {
  if (game.state === 'title' || !game.player) {
    // タイトル：人の目の高さで通路をゆっくり進む（写真のような眺め）
    const t = performance.now() / 1000;
    const k = (t * 0.035) % 1;
    const x = 4.5 - k * 20;
    camera.position.set(x, 4.3 + Math.sin(t * 0.3) * 0.15, -2.5 + Math.sin(t * 0.17) * 0.3);
    camera.lookAt(x - 8, 3.4, -2.5 + Math.sin(t * 0.11) * 0.6);
    return;
  }
  const info = game.camInfo();
  if (screen === 'play') {
    camState.yaw -= input.camDX * 0.0065 + input.keyRot * 2.2 * dt;
    camState.pitch = clamp(camState.pitch + input.camDY * 0.004, 0.08, 1.15);
  }
  game.camYaw = camState.yaw;
  let pitch = camState.pitch, dist = 3.3;
  if (info.underTable) { pitch = Math.min(pitch, 0.2); dist = 2.4; }
  else if (info.underRow) { pitch = Math.min(pitch, 0.24); dist = 1.7; }
  if (info.flying) { dist = 4.5; pitch = 0.25; }
  if (game.state === 'over') { camState.yaw += dt * 0.25; dist = 5; pitch = 0.5; }
  camState.dist = damp(camState.dist, dist, 5, dt);
  const fx = Math.sin(camState.yaw), fz = Math.cos(camState.yaw);
  const ty = info.y + 0.22;
  const d = camState.dist;
  let cx = info.x - fx * Math.cos(pitch) * d;
  let cz = info.z - fz * Math.cos(pitch) * d;
  let cy = ty + Math.sin(pitch) * d;
  // 株の中にカメラが入らないよう、近づけるか葉の下まで下げる
  if (!info.underRow) {
    let dd = d;
    while (dd > 0.9 && rowAt(cx, cz, 0.35) && cy > 0.75) {
      dd -= 0.15;
      cx = info.x - fx * Math.cos(pitch) * dd;
      cz = info.z - fz * Math.cos(pitch) * dd;
      cy = ty + Math.sin(pitch) * dd;
    }
    if (rowAt(cx, cz, 0.35) && cy > 0.75) cy = 0.7;
  }
  cx = clamp(cx, -21.75, 21.75);
  cz = clamp(cz, -13.75, 13.75);
  // 台の板にめりこまない
  for (const T of TABLES) {
    if (inRect(cx, cz, T, 0.15) && cy > T.top - 0.35 && cy < T.top + 0.3) cy = info.y >= T.top - 0.1 ? T.top + 0.3 : T.top - 0.35;
  }
  cy = Math.max(0.12, cy);
  const target = new THREE.Vector3(cx, cy, cz);
  if (camState.init) { camState.pos.copy(target); camState.look.set(info.x, ty, info.z); camState.init = false; }
  const k = 1 - Math.exp(-12 * dt);
  camState.pos.lerp(target, k);
  camState.look.lerp(new THREE.Vector3(info.x, ty, info.z), 1 - Math.exp(-18 * dt));
  camera.position.copy(camState.pos);
  if (game.shake > 0) {
    const s = game.shake * 0.06;
    camera.position.x += (Math.random() - 0.5) * s;
    camera.position.y += (Math.random() - 0.5) * s;
  }
  camera.lookAt(camState.look);
}

// ---------- HUD ----------
const fmt = (t) => { t = Math.max(0, Math.ceil(t)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const F_TEXT = { WORK: ['…', '作業中'], INVESTIGATE: ['?', 'あやしんでいる'], CHASE: ['!', '追いかけてくる！'], PANIC: ['@', 'パニック中'] };
const cache = {};
function setText(id, v) { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } }
function setW(el, k) { const v = `${Math.round(clamp(k, 0, 1) * 1000) / 10}%`; if (el.style.width !== v) el.style.width = v; }

function updateHud(dt) {
  const g = game;
  if (!g.player) return;
  setText('timer', fmt(g.time));
  $('timerCard').classList.toggle('low', g.time < 60);
  setText('ruined', String(g.ruined));
  setText('shipped', String(g.shipped));
  const pips = $('pips').children;
  for (let i = 0; i < pips.length; i++) pips[i].classList.toggle('on', i < g.ruined);
  const f = g.farmer;
  const [ic, tx] = F_TEXT[f.state] || F_TEXT.WORK;
  if ($('fstate').dataset.s !== f.state) $('fstate').dataset.s = f.state;
  setText('ficon', ic);
  setText('ftext', tx);
  setW($('susp'), f.susp / 100);
  setText('anger', '●'.repeat(f.anger) + '○'.repeat(3 - f.anger));
  const p = g.player;
  setW($('hpBar').firstElementChild, p.hp / p.maxHp);
  setW($('nutBar').firstElementChild, g.nutrition / 100);
  $('nutBar').classList.toggle('full', g.nutrition >= 100);
  setText('allies', String(g.nymphs.length));
  const eggs = g.eggs.filter((e) => e.alive).length;
  setText('eggsTxt', eggs ? `（卵 ${eggs}）` : '');
  setText('atkTxt', g.attackCD > 0 ? `${Math.ceil(g.attackCD)}秒` : 'OK');

  const ctx = g.context();
  const pr = $('prompt');
  const touch = document.body.classList.contains('touch');
  if (ctx && screen === 'play') {
    const key = touch ? '' : 'Space';
    const html = `${key ? `<kbd>${key}</kbd>` : ''}${ctx.text}`;
    if (cache.prompt !== html) { cache.prompt = html; pr.innerHTML = html; }
    pr.hidden = false;
    pr.classList.toggle('urgent', !!ctx.urgent);
  } else pr.hidden = true;
  const tA = $('tAction');
  const label = ctx ? (ctx.urgent ? '連打！' : ctx.text.replace('長押しで', '').replace('台に', '')) : '食べる';
  if (tA.textContent !== label) tA.textContent = label;
  tA.classList.toggle('off', !ctx);
  document.querySelector('.t-attack').classList.toggle('ready', g.canAttackNow());
  document.querySelector('.t-attack').classList.toggle('off', g.attackCD > 0);
  document.querySelector('.t-egg').classList.toggle('ready', g.nutrition >= 100);
  document.querySelector('.t-egg').classList.toggle('off', g.nutrition < 100);

  const gr = $('greed');
  if (p.eatingCrate || p.greed > 3) {
    gr.hidden = false;
    setW(gr.querySelector('i'), p.greed / 100);
    gr.classList.toggle('hot', p.greed > 65);
    gr.classList.toggle('max', p.greed > 88);
    const c = p.eatingCrate;
    setText('crateLeft', c ? `このコンテナ 残り ${Math.max(0, Math.ceil(c.hp))}%` : '');
  } else gr.hidden = true;
  const st = $('struggle');
  if (p.st === 'stuck') { st.hidden = false; setW(st.querySelector('i'), p.struggle / 100); } else st.hidden = true;

  ui.hurtLevel = Math.max(0, ui.hurtLevel - dt * 1.4);
  $('dmg').style.opacity = String(Math.max(ui.hurtLevel, p.hp / p.maxHp < 0.3 ? 0.25 + Math.sin(performance.now() / 200) * 0.1 : 0));
  sfx.setTension(f.state === 'CHASE' ? 1 : f.state === 'INVESTIGATE' ? 0.45 : 0);
}

// ---------- 頭の上の表示（吹き出し・鮮度） ----------
const labelsEl = $('labels');
const pool = [];
let used = 0;
function label(cls, html) {
  let el = pool[used];
  if (!el) { el = document.createElement('div'); labelsEl.appendChild(el); pool.push(el); }
  used++;
  if (el.className !== `lbl ${cls}`) el.className = `lbl ${cls}`;
  if (el._html !== html) { el.innerHTML = html; el._html = html; }
  el.style.display = '';
  return el;
}
const v3 = new THREE.Vector3();
function project(x, y, z) {
  v3.set(x, y, z).project(camera);
  if (v3.z > 1 || v3.z < -1) return null;
  return { x: (v3.x * 0.5 + 0.5) * window.innerWidth, y: (-v3.y * 0.5 + 0.5) * window.innerHeight, on: Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05 };
}
function place(el, s) { el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) translate(-50%, -100%)`; }

function updateLabels() {
  used = 0;
  const g = game;
  if (g.farmer && g.player && screen !== 'title') {
    const f = g.farmer;
    const s = project(f.x, 6.6, f.z);
    if (s && s.on) {
      if (f.speechT > 0 && f.speech) place(label('speech', escapeHtml(f.speech)), s);
      else if (f.state === 'INVESTIGATE') place(label('mark q', '?'), s);
      else if (f.state === 'CHASE') place(label('mark x', '!'), s);
    }
    const p = g.player;
    for (const c of g.crates) {
      if (c.rotten || c.shipped || c.carried) continue;
      const d = Math.hypot(c.x - p.x, c.z - p.z);
      if (d > 9 || c.hp >= 99.5) continue;
      const s2 = project(c.x, c.baseY + 1.25, c.z);
      if (s2 && s2.on) place(label('fresh', `<i style="width:${Math.max(0, c.hp).toFixed(0)}%"></i>`), s2);
    }
    for (const r of g.roaches) {
      if (!r.alive || r.isPlayer || r.st !== 'stuck') continue;
      const s3 = project(r.x, r.y + 0.6, r.z);
      if (s3 && s3.on) place(label('help', 'たすけて！'), s3);
    }
  }
  for (let i = used; i < pool.length; i++) if (pool[i].style.display !== 'none') pool[i].style.display = 'none';
}
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- 地図 ----------
const mm = $('minimap');
const mctx = mm.getContext('2d');
const MW = mm.width, MH = mm.height;
const mx = (x) => ((x + 22) / 44) * MW;
const mz = (z) => ((z + 14) / 28) * MH;
const base = document.createElement('canvas');
base.width = MW; base.height = MH;
(() => {
  const b = base.getContext('2d');
  b.fillStyle = 'rgba(40,28,18,0.85)';
  b.fillRect(0, 0, MW, MH);
  b.fillStyle = 'rgba(160,150,135,0.35)';
  b.fillRect(mx(5), 0, mx(22) - mx(5), MH);
  b.fillStyle = 'rgba(80,140,55,0.75)';
  for (const r of ROWS) b.fillRect(mx(r.minX), mz(r.minZ), mx(r.maxX) - mx(r.minX), mz(r.maxZ) - mz(r.minZ));
  b.fillStyle = 'rgba(201,163,107,0.6)';
  for (const t of TABLES) b.fillRect(mx(t.minX), mz(t.minZ), mx(t.maxX) - mx(t.minX), mz(t.maxZ) - mz(t.minZ));
  b.fillStyle = '#f6ecd9';
  b.fillRect(MW - 4, mz(9), 4, mz(13) - mz(9));
  b.strokeStyle = 'rgba(246,236,217,0.4)';
  b.lineWidth = 2;
  b.strokeRect(1, 1, MW - 2, MH - 2);
})();
let mmT = 0;
function drawMinimap(dt) {
  mmT -= dt;
  if (mmT > 0) return;
  mmT = 0.08;
  const g = game;
  if (!g.farmer) return;
  mctx.drawImage(base, 0, 0);
  const sx = MW / 44;
  for (const c of g.crates) {
    if (c.shipped || c.carried) continue;
    mctx.fillStyle = c.rotten ? '#5a4524' : c.hp < 100 ? '#c8e86a' : '#7be04e';
    mctx.fillRect(mx(c.x) - 6, mz(c.z) - 4, 12, 8);
    if (c.rotten) { mctx.strokeStyle = '#000'; mctx.lineWidth = 1.5; mctx.strokeRect(mx(c.x) - 6, mz(c.z) - 4, 12, 8); }
  }
  mctx.strokeStyle = '#ffd23c';
  mctx.lineWidth = 2;
  for (const t of g.traps) {
    const x = mx(t.x), y = mz(t.z);
    mctx.beginPath(); mctx.moveTo(x - 4, y - 4); mctx.lineTo(x + 4, y + 4); mctx.moveTo(x + 4, y - 4); mctx.lineTo(x - 4, y + 4); mctx.stroke();
  }
  for (const c of g.clouds) { mctx.fillStyle = 'rgba(220,245,200,0.5)'; mctx.beginPath(); mctx.arc(mx(c.x), mz(c.z), c.r * sx, 0, 6.29); mctx.fill(); }
  const f = g.farmer;
  const fx = mx(f.x), fy = mz(f.z);
  const fv = f.view !== undefined ? f.view : f.h;
  const a = Math.atan2(Math.cos(fv), Math.sin(fv));
  if (f.state !== 'PANIC') {
    mctx.fillStyle = f.state === 'CHASE' ? 'rgba(255,75,58,0.35)' : f.state === 'INVESTIGATE' ? 'rgba(255,190,60,0.3)' : 'rgba(255,255,255,0.18)';
    mctx.beginPath(); mctx.moveTo(fx, fy); mctx.arc(fx, fy, f.coneRange * sx, a - 0.78, a + 0.78); mctx.closePath(); mctx.fill();
  }
  mctx.fillStyle = '#ff4b3a';
  mctx.beginPath(); mctx.arc(fx, fy, 6, 0, 6.29); mctx.fill();
  mctx.strokeStyle = '#fff'; mctx.lineWidth = 1.5; mctx.stroke();
  for (const e of g.eggs) if (e.alive) { mctx.fillStyle = '#c98a4a'; mctx.beginPath(); mctx.arc(mx(e.x), mz(e.z), 3, 0, 6.29); mctx.fill(); }
  for (const r of g.roaches) {
    if (!r.alive || r.isPlayer) continue;
    mctx.fillStyle = r.st === 'stuck' ? '#ff4b3a' : '#f0a050';
    mctx.beginPath(); mctx.arc(mx(r.x), mz(r.z), 3, 0, 6.29); mctx.fill();
  }
  const p = g.player;
  if (p && p.alive) {
    const px = mx(p.x), py = mz(p.z), ph = Math.atan2(Math.cos(p.h), Math.sin(p.h));
    mctx.fillStyle = '#ffe14d';
    mctx.beginPath();
    mctx.moveTo(px + Math.cos(ph) * 8, py + Math.sin(ph) * 8);
    mctx.lineTo(px + Math.cos(ph + 2.5) * 6, py + Math.sin(ph + 2.5) * 6);
    mctx.lineTo(px + Math.cos(ph - 2.5) * 6, py + Math.sin(ph - 2.5) * 6);
    mctx.closePath(); mctx.fill();
    mctx.strokeStyle = '#160f0a'; mctx.lineWidth = 1.5; mctx.stroke();
  }
}

// ---------- ループ ----------
let last = performance.now();
let fpsAcc = 0, fpsN = 0;
window.__rh.fps = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (!(dt > 0)) dt = 0.016;
  dt = Math.min(dt, 0.05);
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 1) { window.__rh.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  try {
    input.poll();
    if (input.consume('mute')) { soundOn = !soundOn; $('optSound').checked = soundOn; sfx.setMuted(!soundOn); store.set('sound', soundOn); ui.toast(soundOn ? '音：オン' : '音：オフ', 'info'); }
    if (input.consume('pause')) { if (screen === 'play') pauseGame(); else if (screen === 'pause') resumeGame(); }
    updateTouchVisibility();
    if (screen === 'play' || screen === 'result' || screen === 'title') {
      const prevMode = game.mode;
      game.update(screen === 'play' ? dt : (game.state === 'over' ? dt : 0), input);
      if (game.mode !== prevMode) updateCmdButtons();
      if (screen === 'play') {
        hints.update(dt, game);
        game.events.length = 0;
        if (game.state === 'over') setScreen('over');
      }
    }
    if (screen === 'over' && game.state === 'over') game.update(dt, input);
    updateCamera(dt);
    if (screen !== 'title') { updateHud(dt); drawMinimap(dt); }
    updateLabels();
    const tNow = now / 1000;
    world.update(tNow, camera);
    let focusD = 24;
    if (game.player && game.state !== 'title') focusD = camera.position.distanceTo(new THREE.Vector3(game.player.x, game.player.y + 0.15, game.player.z));
    fx.render(dt, focusD, tNow);
    autoQ.sample(dt, screen === 'play');
  } catch (e) {
    showError(e && e.stack ? e.stack : String(e));
    throw e;
  } finally {
    input.endFrame();
  }
}
setScreen('title');
requestAnimationFrame(frame);

// テスト用：描画せずに時間を進める
window.__rh.sim = (seconds, step = 1 / 30, bot) => {
  const n = Math.round(seconds / step);
  for (let i = 0; i < n && game.state === 'play'; i++) {
    input.poll();
    if (bot) bot(game, input, i);
    game.update(step, input);
    game.events.length = 0;
    input.endFrame();
  }
  return game.sanity();
};
window.__rh.startGame = startGame;
window.__rh.MAX_NYMPHS = MAX_NYMPHS;
window.__rh.DOOR = DOOR;
