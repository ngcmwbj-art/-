// 起動・描画・画面の表示
import * as THREE from 'three';
import { buildWorld, ROWS, TABLES, DOOR, rowAt, WIND_LANES, SAFE_SPOTS, PLANT_FRUITS } from './world.js';
import * as FEATURES from './features.js';
import { Game, DIFFS, STAGES, MAX_NYMPHS } from './game.js';
import { Runner } from './runner.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { clamp, damp, inRect } from './util.js';
import { FX, AutoQuality, LEVELS } from './fx.js';
import { setTextureSize } from './textures.js';
import { WING_COLORS, WING_PATTERNS } from './models.js';
import {
  todayKey, todayLabel, dailySeed, todaysOrders, normalizeRecords, applyResult, TITLES, WING_UNLOCK, ENCYCLOPEDIA, unlockedWings, STAR_RULES,
  HATS, unlockedHats, totalStars, seasonOf, SEASON_LABEL, unusedTech, PATTERN_UNLOCK, unlockedPatterns, WEEK_GOALS, weekKey, weekState,
} from './features.js';
import { PRANKS } from './game.js';

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

// 小さなお知らせは画面の端に、丸い印つきでまとめる（大事なものだけ真ん中）
const MINOR = [
  [/仲間がやられた/, '仲', 'bad'], [/卵がかえ|仲間が生まれ|仲間が.*匹ふえ/, '卵', 'good'], [/仲間に指示/, '指', 'info'],
  [/産卵|卵を産/, '卵', 'good'], [/助け出した/, '助', 'good'], [/段ボール|軍手から|軍手にもぐ/, '隠', 'good'],
  [/いたずら成功/, '★', 'good'], [/検品が終わった|煙が晴れ/, '済', 'info'], [/仲間がホイホイを運/, '運', 'good'],
  [/農場主がコンテナを(床に置いた|落とした)/, '箱', 'good'], [/排水溝/, '溝', 'good'], [/カブトムシ/, '虫', 'good'],
];
function feed(text, glyph, kind) {
  const box = $('feed');
  const el = document.createElement('div');
  el.className = `feed-item ${kind || ''}`;
  el.innerHTML = `<i>${glyph}</i><span></span>`;
  el.lastChild.textContent = text;
  box.appendChild(el);
  while (box.children.length > 4) box.removeChild(box.firstChild);
  setTimeout(() => el.classList.add('out'), 3600);
  setTimeout(() => el.remove(), 4100);
}
const ui = {
  feed,
  radio(text) { feed(text, '♪', 'radio'); sfx.radioNews && sfx.radioNews(); },
  toast(text, kind) {
    const m = MINOR.find(([re]) => re.test(text));
    if (m) { feed(text, m[1], m[2]); return; }
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
// ---------- おまけステージ「にげろ！田んぼ道」 ----------
let runSayT = 0;
const runner = new Runner({ scene, camera, sfx, ui: {
  say(t) { const el = $('runSay'); el.textContent = `農場主「${t}」`; el.hidden = false; runSayT = 2.6; },
  feed,
  runOver(res) { showRunResult(res); },
} });
function runUnlocked() { return (records.stowaway || 0) >= 1; }
function renderRunBtn() {
  const b = $('btnRun');
  const ok = runUnlocked();
  b.disabled = !ok;
  b.textContent = ok ? `おまけ：にげろ！田んぼ道（夜明け）${records.runBest ? `　ベスト ${records.runBest.toFixed(1)}秒` : ''}` : 'おまけ：にげろ！田んぼ道（「かごにもぐって出荷ジャック」を1回成功させると遊べる）';
  // 夕方の農道：夜明けのコースを1回逃げきると遊べる
  const b2 = $('btnRunDusk');
  b2.hidden = !ok;
  const ok2 = (records.runClears || 0) >= 1;
  b2.disabled = !ok2;
  b2.textContent = ok2 ? `おまけ：夕方の農道（ため池の橋とコンバイン）${records.runBestDusk ? `　ベスト ${records.runBestDusk.toFixed(1)}秒` : ''}` : 'おまけ：夕方の農道（夜明けのコースを1回逃げきると遊べる）';
}
let runCourse = 'dawn';
function startRun(course) {
  runCourse = course === 'dusk' ? 'dusk' : 'dawn';
  sfx.unlock();
  endTourUi();
  sfx.stopRadio();
  world.setNight(false);
  renderer.toneMappingExposure = 0.95;
  world.group.visible = false;
  if (game.root) game.root.visible = false;
  game.state = 'title';
  runner.start({ wing: records.wing, pattern: records.pattern, hat: records.hat, seed: dailySeed(dayKey) % 100000 + 7, course: runCourse });
  $('runSay').hidden = true;
  setScreen('run');
}
function endRun() {
  runner.stop();
  world.group.visible = true;
  if (game.root) game.root.visible = true;
}
function showRunResult(res) {
  if (screen !== 'run') return;
  records.runPlays = (records.runPlays || 0) + 1;
  let best = '';
  if (res.win) {
    const bk = res.course === 'dusk' ? 'runBestDusk' : 'runBest';
    const firstDawn = res.course !== 'dusk' && !(records.runClears > 0);
    if (res.course !== 'dusk') records.runClears = (records.runClears || 0) + 1;
    if (!records[bk] || res.time < records[bk]) { best = records[bk] ? `ベスト更新！（前は ${records[bk].toFixed(1)}秒）` : '初クリア！'; records[bk] = Math.round(res.time * 10) / 10; }
    if (firstDawn) best += '　2つ目のコース「夕方の農道」が遊べるようになった！';
  }
  store.set('records', records);
  $('runTitle').textContent = res.win ? 'にげきった！' : 'つかまった…';
  $('runTitle').className = `rtitle ${res.win ? 'win' : 'lose'}`;
  $('runText').textContent = res.win ? `${res.time.toFixed(1)}秒で、となりのハウスへ逃げこんだ。パプリカのかけら ${res.bits} 個` : `ゴールまであと ${Math.round(230 - res.dist)}m。パプリカのかけら ${res.bits} 個。ダッシュはかけらで回復するよ`;
  $('runNews').innerHTML = best ? `<span class="new">${best}</span>` : '';
  setScreen('runover');
}
$('btnRun').addEventListener('click', () => startRun('dawn'));
$('btnRunDusk').addEventListener('click', () => startRun('dusk'));
$('btnRunAgain').addEventListener('click', () => { endRun(); startRun(runCourse); });
$('btnRunTitle').addEventListener('click', () => { endRun(); toTitle(); });
window.__rh = { game, input, THREE, scene, camera, renderer, fx, world };

// ---------- 画面切りかえ ----------
let screen = 'title';
function setScreen(s) {
  screen = s;
  $('title').hidden = s !== 'title';
  $('pause').hidden = s !== 'pause';
  $('result').hidden = s !== 'result';
  $('book').hidden = s !== 'book';
  $('runHud').hidden = s !== 'run';
  $('runResult').hidden = s !== 'runover';
  document.body.classList.toggle('run', s === 'run');
  $('hud').hidden = !(s === 'play' || s === 'pause' || s === 'over');
  updateTouchVisibility();
}
function updateTouchVisibility() {
  const touch = input.touchMode || isTouchDevice;
  document.body.classList.toggle('touch', !!touch);
  $('touch').hidden = !(touch && (screen === 'play' || screen === 'run'));
}

// ---------- 記録・今日の注文 ----------
let records = normalizeRecords(store.get('records', null));
// テスト用：?date=2026-12-24 で日付を変えられる（季節のかざりの確認）
const urlDate = (() => { try { const d = new URLSearchParams(location.search).get('date'); return /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : null; } catch (_) { return null; } })();
let dayKey = urlDate || todayKey();
let orders = todaysOrders(dayKey);
function refreshDay() {
  const k = urlDate || todayKey();
  if (k !== dayKey) { dayKey = k; orders = todaysOrders(dayKey); }
}
function renderOrders() {
  refreshDay();
  const done = records.ordersDone[dayKey] || [];
  const sn = seasonOf(dayKey);
  const [wy, wm, wd] = dayKey.split('-').map(Number);
  const wk = weekState(records, weekKey(new Date(wy, wm - 1, wd)));
  const weekHtml = `<h3>週のチャレンジ${wk.done ? '　<span class="ok">✓達成！</span>' : ''}</h3><ul class="week">${WEEK_GOALS.map((gl) => { const v = Math.min(gl.need, wk.prog[gl.id] || 0); return `<li class="${v >= gl.need ? 'done' : ''}">${gl.text}<span class="wbar"><i style="width:${(v / gl.need * 100).toFixed(0)}%"></i></span><b>${v}/${gl.need}</b></li>`; }).join('')}</ul><p class="week-note">月曜に新しくなる。このスマホ（パソコン）の中だけの記録。やらなくても何も失わない</p>`;
  $('orderCard').innerHTML = `${sn ? `<p class="season-note">${SEASON_LABEL[sn]}の期間中！ ハウスに季節のかざり。1回遊ぶと期間限定の帽子がもらえる</p>` : ''}<h3>今日の注文（${todayLabel()}）</h3><ul>${orders.map((o) => `<li class="${done.includes(o.id) ? 'done' : ''}">${done.includes(o.id) ? '✓ ' : ''}${o.text}</li>`).join('')}</ul>` + weekHtml;
}
renderOrders();
renderRunBtn();
$('optTutor').checked = !store.get('tutorialDone', false);

let lastDiff = 's1';
function startGame(diff) {
  sfx.unlock();
  sfx.startAmbience();
  sfx.startRadio();
  lastDiff = diff;
  store.set('lastStage', diff);
  refreshDay();
  const tutorial = $('optTutor').checked;
  const assist = !!(records.assist && records.assist[diff]);
  endTourUi();
  game.start(diff, undefined, { tutorial, wing: records.wing, hat: records.hat, pattern: records.pattern, assist, season: seasonOf(dayKey), layoutSeed: dailySeed(dayKey) });
  $('optTutor').checked = false;
  renderOrderMini();
  $('orderMini').hidden = false;
  const D = game.diff;
  world.setNight(!!D.night);
  renderer.toneMappingExposure = D.night ? 1.5 : 0.95;
  if (!tutorial) {
    ui.toast(`${D.label}「${D.name}」 コンテナを${D.target}箱ダメにしろ！`, 'info');
    if (D.tip) setTimeout(() => { if (screen === 'play') ui.toast(`ヒント：${D.tip}`, 'info'); }, 1800);
  }
  hints.reset();
  camState.yaw = game.camYaw;
  camState.pitch = 0.42;
  camState.init = true;
  $('target').textContent = game.diff.target;
  const pips = $('pips');
  pips.innerHTML = '';
  for (let i = 0; i < game.diff.target; i++) pips.appendChild(Object.assign(document.createElement('span'), { className: 'pip' }));
  $('toasts').innerHTML = '';
  setScreen('play');
  updateCmdButtons();
}

// ---------- 見学モード：遊ばずにハウスを見て回る（家族に見せる用） ----------
let touring = false;
function startTour() {
  sfx.unlock();
  sfx.startAmbience();
  sfx.startRadio();
  refreshDay();
  touring = true;
  game.start('s1', undefined, { tour: true, wing: records.wing, hat: records.hat, pattern: records.pattern, season: seasonOf(dayKey), layoutSeed: dailySeed(dayKey) });
  world.setNight(false);
  renderer.toneMappingExposure = 0.95;
  document.body.classList.add('tour');
  $('tourBar').hidden = false;
  $('orderMini').hidden = true;
  hints.reset();
  camState.yaw = game.camYaw; camState.pitch = 0.42; camState.init = true; camState.focus = null;
  $('toasts').innerHTML = '';
  setScreen('play');
  ui.toast('見学モード：だれにも見つからない。上のボタンで生き物を近くから見られる', 'info');
}
function endTourUi() {
  touring = false;
  document.body.classList.remove('tour');
  $('tourBar').hidden = true;
  camState.focus = null;
}
// 見る相手：位置と、カメラの距離
function lookTarget(key) {
  const g = game;
  if (key === 'roach') return () => ({ x: g.player.x, y: g.player.y + 0.15, z: g.player.z, d: 1.3 });
  if (key === 'farmer') return () => ({ x: g.farmer.x, y: 3.2, z: g.farmer.z, d: 7.5 });
  if (key === 'cat' && g.cat) return () => ({ x: g.cat.x, y: 0.6, z: g.cat.z, d: 3 });
  const sc = (g.showcase || []).find((o) => o.key === key);
  if (sc) return () => ({ x: sc.obj.position.x, y: sc.h, z: sc.obj.position.z, d: sc.d });
  if (key === 'paprika') {
    const p = g.player;
    let best = null, bd = 1e9;
    for (const f of PLANT_FRUITS) { if (!f.alive) continue; const d = Math.hypot(f.x - p.x, f.z - p.z); if (d < bd) { bd = d; best = f; } }
    if (best) return () => ({ x: best.x, y: best.y, z: best.z, d: 1.1 });
  }
  return null;
}
$('btnTour').addEventListener('click', startTour);
$('btnTourEnd').addEventListener('click', toTitle);
document.querySelectorAll('[data-look]').forEach((b) => b.addEventListener('click', () => {
  const k = b.dataset.look;
  camState.focus = k === 'free' ? null : lookTarget(k);
  if (camState.focus) camState.pitch = Math.max(camState.pitch, 0.35);
  document.querySelectorAll('[data-look]').forEach((x) => x.classList.toggle('on', x === b));
  sfx.click();
  b.blur();
}));

// 今日の注文といたずらリスト（遊んでいる間の小窓）
let miniKey = '';
function renderOrderMini() {
  const pr = game.pranks || {};
  const key = PRANKS.map((x) => (pr[x.id] ? 1 : 0)).join('');
  if (key === miniKey && $('orderMini').innerHTML) return;
  miniKey = key;
  const done = (records.pranks && records.pranks[lastDiff]) || [];
  $('orderMini').innerHTML = `<b>今日の注文</b><br>${orders.map((o) => `・${o.text}`).join('<br>')}` +
    `<br><b>いたずら ${PRANKS.filter((x) => pr[x.id]).length}/${PRANKS.length}</b>　${PRANKS.map((x) => `<span class="${pr[x.id] ? 'ok' : done.includes(x.id) ? 'was' : ''}" title="${x.text}">${pr[x.id] ? '✓' : '・'}${x.short}</span>`).join(' ')}`;
}

// なめらかさを残す（設定に「前回は1秒に○コマ」と出す。スマホ実機での確認用）
const playFps = { t: 0, n: 0, worst: 0 };
function saveFps() {
  if (playFps.t < 10) return;
  const rec = { fps: Math.round(playFps.n / playFps.t), slow: Math.round(1 / Math.max(playFps.worst, 1e-3)), level: fx.level, scale: Math.round((fx.dprScale || 1) * 100), touch: isTouchDevice, at: todayKey() };
  store.set('fpsLast', rec);
  const log = store.get('fpsLog', []);
  log.push(rec);
  while (log.length > 20) log.shift();
  store.set('fpsLog', log);
  playFps.t = 0; playFps.n = 0; playFps.worst = 0;
  showFps();
}
function showFps() {
  const r = store.get('fpsLast', null);
  const LV = { high: '高', medium: '中', low: '低' };
  $('fpsNote').textContent = r ? `前回のなめらかさ：1秒に${r.fps}コマ（いちばん重い所で${r.slow}コマ・画質「${LV[r.level] || r.level}」）${r.fps < 30 ? '　→ 画質「低」がおすすめ' : r.fps >= 50 ? '　→ 快適です' : ''}` : '';
}
showFps();

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
  if (runner.active) endRun();
  saveFps();
  endTourUi();
  calmScreen();
  world.setNight(false);
  renderer.toneMappingExposure = 0.95;
  sfx.stopRadio();
  game.state = 'title';
  setScreen('title');
  renderBest();
  renderOrders();
  renderRunBtn();
  renderLast();
}

// ---------- 図鑑・称号・着せかえ ----------
function renderBook() {
  const unlocked = unlockedWings(records);
  $('bookWings').innerHTML = Object.entries(WING_COLORS).map(([k, w]) => {
    const ok = unlocked.includes(k);
    const hex = '#' + w.color.toString(16).padStart(6, '0');
    const sw = k === 'normal' ? 'linear-gradient(135deg,#7a4018,#3a1a08)' : `linear-gradient(135deg,${hex},#2a1206)`;
    return `<button class="wing ${records.wing === k ? 'on' : ''}" data-wing="${k}" ${ok ? '' : 'disabled'}><span class="sw" style="background:${sw}"></span>${w.label}${ok ? '' : `<small>${WING_UNLOCK[k].desc}</small>`}</button>`;
  }).join('');
  $('bookWings').querySelectorAll('[data-wing]').forEach((b) => b.addEventListener('click', () => {
    records.wing = b.dataset.wing;
    store.set('records', records);
    sfx.click();
    renderBook();
  }));
  const patOk = unlockedPatterns(records);
  $('bookPatterns').innerHTML = Object.entries(WING_PATTERNS).map(([k, p]) => {
    const ok = patOk.includes(k);
    return `<button class="wing ${records.pattern === k ? 'on' : ''}" data-pat="${k}" ${ok ? '' : 'disabled'}><span class="sw pat-${k}"></span>${p.label}${ok ? '' : `<small>${PATTERN_UNLOCK[k].desc}</small>`}</button>`;
  }).join('');
  $('bookPatterns').querySelectorAll('[data-pat]').forEach((b) => b.addEventListener('click', () => {
    records.pattern = b.dataset.pat;
    store.set('records', records);
    sfx.click();
    renderBook();
  }));
  const hatOk = unlockedHats(records);
  const ns = totalStars(records);
  $('bookHats').innerHTML = Object.entries(HATS).map(([k, h]) => {
    const ok = hatOk.includes(k);
    return `<button class="wing ${records.hat === k ? 'on' : ''}" data-hat="${k}" ${ok ? '' : 'disabled'}>${h.label}${ok ? '' : `<small>星 ${h.need} 個（いま ${ns} 個）</small>`}</button>`;
  }).join('');
  $('bookHats').querySelectorAll('[data-hat]').forEach((b) => b.addEventListener('click', () => {
    records.hat = b.dataset.hat;
    store.set('records', records);
    sfx.click();
    renderBook();
  }));
  $('bookTitles').innerHTML = TITLES.map((t) => {
    const ok = records.titles.includes(t.id);
    return `<li class="${ok ? '' : 'locked'}"><b>${ok ? '★ ' : '☆ '}${t.name}</b><small>${t.desc}</small></li>`;
  }).join('');
  $('bookEncy').innerHTML = ENCYCLOPEDIA.map((e) => {
    const ok = records.seen.includes(e.id);
    return `<li class="${ok ? '' : 'locked'}"><b>${ok ? e.name : '？？？'}</b><small>${ok ? e.text : 'まだ出会っていない'}</small></li>`;
  }).join('');
  const r = records;
  const rows = [['遊んだ回数', `${r.games} 回`], ['勝った回数', `${r.wins} 回`], ['ダメにした箱', `${r.ruined} 箱`], ['産んだ卵', `${r.eggs} 個`],
    ['パニックにした', `${r.attacks} 回`], ['ホイホイ脱出', `${r.escapes} 回`], ['ナイス！', `${r.nice} 回`], ['風に乗った', `${r.winds} 回`],
    ['落とした実', `${r.fruits} 個`], ['こなした注文', `${r.orders} 個`]];
  $('bookRec').innerHTML = rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
  const mmb = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  $('bookBest').innerHTML = `<tr><th>ステージ</th><th>星</th><th>最速クリア</th><th>最少出荷</th></tr>` + STAGES.map((st) => {
    const b = records.bests[st.key] || {};
    const n = records.stars[st.key] || 0;
    return `<tr><td>${st.label}</td><td>${'★'.repeat(n)}${'☆'.repeat(3 - n)}</td><td>${b.time ? mmb(b.time) : '－'}</td><td>${b.shipped !== undefined ? b.shipped + '箱' : '－'}</td></tr>`;
  }).join('');
}
$('btnBook').addEventListener('click', () => { renderBook(); setScreen('book'); });
// タブ（タイトル：あそぶ／みる／せってい、図鑑：着せかえ／図鑑・称号／記録）
function setTab(group, attr, paneAttr, key) {
  document.querySelectorAll(`#${group} [${attr}]`).forEach((b) => b.classList.toggle('on', b.getAttribute(attr) === key));
  document.querySelectorAll(`[${paneAttr}]`).forEach((p) => { p.hidden = p.getAttribute(paneAttr) !== key; });
  sfx.click();
}
document.querySelectorAll('#titleTabs [data-tab]').forEach((b) => b.addEventListener('click', () => setTab('titleTabs', 'data-tab', 'data-pane', b.dataset.tab)));
document.querySelectorAll('#bookTabs [data-btab]').forEach((b) => b.addEventListener('click', () => setTab('bookTabs', 'data-btab', 'data-bpane', b.dataset.btab)));
window.__rh.setTab = (k) => setTab('titleTabs', 'data-tab', 'data-pane', k);
// 前回のステージをもう一度（1回おすだけで）
function renderLast() {
  const k = store.get('lastStage', null);
  const st = k && DIFFS[k];
  const b = $('btnLast');
  b.hidden = !st;
  if (st) b.textContent = `前回のステージをもう一度：${st.label}「${st.name}」`;
}
$('btnLast').addEventListener('click', () => { const k = store.get('lastStage', null); if (k && DIFFS[k]) startGame(k); });
renderLast();
$('btnBookBack').addEventListener('click', () => { setScreen('title'); renderOrders(); });
$('btnSkipTutor').addEventListener('click', (e) => { e.preventDefault(); game.endTutorial(false); store.set('tutorialDone', true); e.currentTarget.blur(); });

const TIPS = [
  '台の下でじっとしていれば、農場主からはほとんど見えません。',
  'がっつきゲージは緑のうちに離すと音が出ません。黄色で止めるのが一番効率がいい食べかたです。',
  '「おとり」の仲間が追われている間に、反対側のコンテナを狙いましょう。',
  '農場主がコンテナを運んでいる時に突撃すると、コンテナを床に落とします。',
  '卵は畝の葉の下か台の下に産むと、見つかりにくくなります。',
  'ダメになったコンテナを農場主が見つけると、怒って近くにホイホイを置きます。',
  '殺虫剤は黄色い輪、叩きつぶしは赤い輪が予告です。輪が出たらすぐ離れましょう。',
  '「探索」の仲間は少しずつしか食べませんが、何匹もいると大きな戦力です。',
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// ステージ選び：クリアした次のステージまで遊べる
function renderStages() {
  const best = store.get('best', {});
  const open = Math.min(STAGES.length, (records.cleared || 0) + 1);
  $('stages').innerHTML = STAGES.map((st) => {
    const ok = st.no <= open;
    const b = best[st.key];
    const cleared = st.no <= (records.cleared || 0);
    return `<button class="stage ${st.no === open && !cleared ? 'next' : ''}" data-diff="${st.key}" ${ok ? '' : 'disabled'}>
      <span class="no">${st.label}${cleared ? '　✓クリア' : ''}${records.assist && records.assist[st.key] ? '　<i class="assist-tag">おたすけ中</i>' : ''}</span><b>${ok ? st.name : '？？？'}</b>
      <span class="stars">${'★'.repeat(records.stars[st.key] || 0)}${'☆'.repeat(3 - (records.stars[st.key] || 0))}</span>
      <span>${ok ? `${st.target}箱ダメにする。${st.desc}` : `ステージ${st.no - 1}をクリアすると遊べる`}</span>
      <em>${b ? `最高 ${b.rank}・${b.score}点` : ''}</em></button>`;
  }).join('');
  $('stages').querySelectorAll('[data-diff]').forEach((b) => b.addEventListener('click', () => startGame(b.dataset.diff)));
}
renderStages();
$('btnNext').addEventListener('click', () => {
  const st = DIFFS[lastDiff];
  const nx = STAGES[st ? st.no : 0];
  if (nx) startGame(nx.key);
});
$('btnResume').addEventListener('click', resumeGame);
$('btnRetry').addEventListener('click', () => (touring ? startTour() : startGame(lastDiff)));
$('btnTitle').addEventListener('click', toTitle);
$('btnAgain').addEventListener('click', () => startGame(lastDiff));
$('btnAssist').addEventListener('click', (e) => {
  const b = e.currentTarget, d = b.dataset.diff;
  records.assist = records.assist || {};
  if (b.dataset.on === '1') delete records.assist[d];
  else records.assist[d] = true;
  store.set('records', records);
  sfx.click();
  startGame(d);
});
$('btnTitle2').addEventListener('click', toTitle);
$('pauseBtn').addEventListener('click', pauseGame);
$('optSound').addEventListener('change', (e) => { soundOn = e.target.checked; store.set('sound', soundOn); sfx.setMuted(!soundOn); });
$('optQuality').value = qualityPref;
// 音量と、音の波紋
let rippleOn = store.get('ripple', true);
$('optRipple').checked = rippleOn;
$('optRipple').addEventListener('change', (e) => { rippleOn = e.target.checked; store.set('ripple', rippleOn); });
const vol0 = store.get('volume', 100);
$('optVolume').value = vol0;
sfx.setVolume(vol0 / 100);
$('optVolume').addEventListener('input', (e) => { const v = Number(e.target.value); sfx.setVolume(v / 100); store.set('volume', v); });
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

function renderBest() { renderStages(); }

// ---------- 結果 ----------
const REASONS = {
  ruined: '目標の数のコンテナをダメにした。今日の出荷はめちゃくちゃだ！',
  shipped: '出荷が進みすぎて、もう目標に届かない。今日のパプリカは無事に市場へ…',
  dead: '仲間も卵もいなくなってしまった…',
};
function showResult(res) {
  if (game.state !== 'over' || game.result !== res) return;
  saveFps();
  calmScreen();
  const stR = DIFFS[res.diff];
  $('rTitle').textContent = res.win ? `${stR ? stR.label + ' ' : ''}クリア！` : '作戦失敗…';
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
  // 農場主のぼやき
  // 農場主の日記（今日の出来事を3行）。ぼやきの代わりに
  const [dy, dm, dd] = dayKey.split('-').map(Number);
  const dl = res.diary && res.diary.length ? res.diary : res.grumble;
  $('rGrumble').className = 'grumble diary';
  $('rGrumble').innerHTML = `<div class="diary-h">農場主の日記　${dm}月${dd}日</div>` + dl.map((g) => `<p>${escapeHtml(g)}</p>`).join('');
  // 名場面
  const hl = (res.highlights || []).filter((h) => h.img);
  $('rHigh').innerHTML = hl.length ? hl.map((h) => `<figure><img src="${h.img}" alt=""><figcaption>${mm(h.t)}　${escapeHtml(h.text)}</figcaption></figure>`).join('') : '';
  $('rHigh').hidden = !hl.length;
  // 今日の注文・称号・羽の色
  const out = applyResult(records, res, s, orders, dayKey);
  records = out.rec;
  store.set('records', records);
  const ol = orders.map((o) => (out.cleared.includes(o.id) ? `<span class="ok">✓ ${o.text}</span>` : `<span class="ng">・${o.text}</span>`));
  const news = [...out.newTitles.map((t) => `<span class="new">★ 称号「${t.name}」を手に入れた！</span>`),
    ...out.newWings.map((k) => `<span class="new">羽の色「${WING_COLORS[k].label}」が使えるようになった！（図鑑・着せかえで選べる）</span>`)];
  const st3 = out.stars;
  $('rStars').innerHTML = `<div class="big">${st3.each.map((b) => (b ? '★' : '☆')).join('')}</div>` +
    STAR_RULES.map((r, i) => `<div class="${st3.each[i] ? 'ok' : 'ng'}">${st3.each[i] ? '★' : '☆'} ${r.text}</div>`).join('');
  if (out.newBest.time) news.push(`<span class="new">最速クリアを更新！（${mm(res.elapsed)}）</span>`);
  if (out.newBest.shipped) news.push(`<span class="new">いちばん少ない出荷数を更新！（${s.shipped}箱）</span>`);
  if (out.unlockedStage) news.unshift(`<span class="new">${STAGES[out.unlockedStage - 1].label}「${STAGES[out.unlockedStage - 1].name}」が遊べるようになった！</span>`);
  const cur = DIFFS[res.diff];
  const nxt = cur ? STAGES[cur.no] : null;
  $('btnNext').hidden = !(res.win && nxt);
  if (nxt) $('btnNext').textContent = `次のステージへ（${nxt.label}）`;
  // すぐやり直し：負けたら「もう一回」をいちばん大きく、勝ったら「次のステージへ」を先頭に
  const showNext = res.win && nxt;
  $('btnAgain').className = `btn ${showNext ? '' : 'primary big-again'}`;
  $('btnAgain').textContent = res.win ? 'もう一度' : 'もう一回！';
  // おたすけ
  const ab = $('btnAssist');
  const assistOn = !!(records.assist && records.assist[res.diff]);
  ab.hidden = !(out.offerAssist || assistOn);
  ab.textContent = assistOn ? 'おたすけをやめる（ふつうにもどす）' : `おたすけを使う？（${records.losses[res.diff]}回続けて負けたので、農場主を少しのんびりにできる）`;
  ab.dataset.diff = res.diff;
  ab.dataset.on = assistOn ? '1' : '0';
  if (res.assist) news.push('<span class="was">（おたすけ中のプレイ）</span>');
  // いたずら
  const prs = res.pranks || [];
  const prDone = records.pranks[res.diff] || [];
  const prankLine = (`<b>いたずら</b>　${PRANKS.map((x) => `<span class="${prs.includes(x.id) ? 'ok' : 'ng'}">${prs.includes(x.id) ? '✓' : '・'}${x.text}${!prs.includes(x.id) && prDone.includes(x.id) ? '（前にやった）' : ''}</span>`).join('　')}`);
  if (prs.length) news.push(`<span class="new">いたずら成功 ${prs.length}/${PRANKS.length}</span>`);
  if ((s.revenge || 0) > 0) news.push(`<span class="new">ホイホイの仕返し ${s.revenge} 回成功！</span>`);
  for (const k of out.newPatterns || []) news.push(`<span class="new">羽のもよう「${WING_PATTERNS[k].label}」が使えるようになった！（図鑑・着せかえで選べる）</span>`);
  if (out.weekNow) news.push('<span class="new">週のチャレンジ達成！ おめでとう！</span>');
  if ((s.stowaway || 0) > 0) news.push(`<span class="new">出荷ジャック ${s.stowaway} 回成功！${records.stowaway === s.stowaway ? '　おまけステージ「にげろ！田んぼ道」が遊べるようになった！（タイトル画面）' : ''}</span>`);
  for (const k of out.newHats || []) news.push(`<span class="new">帽子「${HATS[k].label}」が使えるようになった！（図鑑・着せかえで選べる）</span>`);
  // 結果画面は短く：大事なお知らせだけ上に、ほかは「くわしく」の中へ
  $('rNews').innerHTML = news.join('<br>');
  $('rNews').hidden = !news.length;
  const wkr = out.week;
  const weekLine = wkr ? `<b>週のチャレンジ</b>　${WEEK_GOALS.map((gl) => `${gl.text.replace('合計', '')} ${Math.min(gl.need, wkr.prog[gl.id] || 0)}/${gl.need}`).join('　')}` : '';
  $('rOrders').innerHTML = `<b>今日の注文</b><br>${ol.join('<br>')}<br>${prankLine}${weekLine ? '<br>' + weekLine : ''}`;
  $('rMore').open = false;
  const rows = [
    ['ダメにした箱', `${s.ruined} 箱`], ['出荷された箱', `${s.shipped} 箱`],
    ['かかった時間', mm(res.elapsed)], ['産んだ卵', `${s.eggs} 個`],
    ['生まれた仲間', `${s.born} 匹`], ['生き残った仲間', `${res.alive} 匹`],
    ['突撃した回数', `${s.attacks} 回`], ['見つかった回数', `${s.chased} 回`],
    ['ナイス！', `${s.nice} 回`], ['落とした実', `${s.fruits} 個（熟した実 ${s.ripeFruits || 0}）`],
    // 勝ち方の内訳（作戦のふり返り）
    ['自分でダメにした箱', `${s.byPlayer || 0} 箱`], ['仲間がダメにした箱', `${s.byNymph || 0} 箱`],
    ['カブトムシなど', `${s.byOther || 0} 箱`], ['いちばん多かった仲間', `${s.maxNymphs || 0} 匹`],
  ];
  $('rStats').innerHTML = rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
  const tech = unusedTech(records, (DIFFS[res.diff] || {}).no || 1, records.games || 0);
  const tipMain = res.advice ? `次はこうしてみよう：${res.advice}` : (res.win ? '完璧な作戦でした。次のステージにも挑戦してみよう。' : `ヒント：${pick(TIPS)}`);
  $('rTip').textContent = tech ? `${tipMain}\nまだ試していない技：${tech.text}` : tipMain;
  $('rTip').classList.toggle('advice', !!res.advice);
  setScreen('result');
}

// ---------- ヒント ----------
const hints = {
  list: [
    { id: 'move', kb: 'WASDで移動、マウスをドラッグ（またはQ/E）で視点を回せます。野菜コンテナを目指そう', tc: '左下をなぞって移動、右側をなぞって視点を回せます。野菜コンテナを目指そう', until: (g) => g.elapsed > 9 },
    { id: 'map', kb: '右上の地図の緑の四角がまだ食べられるコンテナ。赤い点が農場主、扇形が視界です', tc: '右上の地図の緑の四角がコンテナ。赤い点が農場主、扇形が視界です', until: (g) => g.elapsed > 18 },
    { id: 'eat', kb: 'コンテナのそばでスペースを長押しすると食べる。がっつきゲージが赤になる前に離そう！', tc: 'コンテナのそばで「食べる」を長押し。がっつきゲージが赤になる前に離そう！', when: (g) => !!(g.context() && g.context().crate), until: (_, ev) => ev.has('ruin') || ev.has('egg'), max: 12 },
    { id: 'climb', kb: '台やさいばい槽のふちでスペースを押すと登れます。さいばい槽の上では株の実もかじれる', tc: '台やさいばい槽のふちで「登る」を押すと登れます。さいばい槽の上では株の実もかじれる', when: (g) => { const c = g.context(); return c && c.text === '登る'; }, until: (_, ev) => ev.has('climb'), max: 9 },
    { id: 'wind', kb: '通路の入口の渦！ スペースで風に乗ると、通路の先まで一気に飛べる', tc: '通路の入口の渦！「風に乗る」で通路の先まで一気に飛べる', when: (g) => { const c = g.context(); return c && c.text === '風に乗る'; }, until: (_, ev) => ev.has('wind'), max: 8 },
    { id: 'bait', kb: '黒い丸い容器は毒エサ。食べると栄養は満タンだが、毒で体力が減り続ける。食べるかどうかはあなたしだい', tc: '黒い丸い容器は毒エサ。食べると栄養は満タンだが、毒で体力が減り続ける', when: (g) => { const c = g.context(); return c && c.bait; }, max: 8 },
    { id: 'smoke', kb: 'けむり玉だ！ 緑の輪（出入り口・西の換気口）へ逃げこめ！ 右上の地図の緑の丸が逃げ場', tc: 'けむり玉だ！ 緑の輪（出入り口・換気口）へ逃げこめ！ 地図の緑の丸が逃げ場', when: (_, ev) => ev.has('fumigate'), max: 12 },
    { id: 'egg', kb: '栄養が満タン！ Rで卵を産もう。葉の下や台の下なら見つかりにくい', tc: '栄養が満タン！「産卵」で卵を産もう。葉の下や台の下なら見つかりにくい', when: (g) => g.nutrition >= 100, until: (_, ev) => ev.has('egg'), max: 12 },
    { id: 'cmd', kb: '仲間が生まれた！ 1：探索　2：おとり　3：集合 で指示を出せます', tc: '仲間が生まれた！ 右の「探索・おとり・集合」で指示を出せます', when: (_, ev) => ev.has('hatch'), max: 10 },
    { id: 'hide', kb: '見つかった！ 葉の下や台の下に逃げこんで、じっとしていよう', tc: '見つかった！ 葉の下や台の下に逃げこんで、じっとしていよう', when: (_, ev) => ev.has('spotted'), max: 7 },
    { id: 'attack', kb: '農場主の足もと！ Fで顔に突撃するとパニックにできる', tc: '農場主の足もと！「突撃」で顔に飛びつくとパニックにできる', when: (g) => g.canAttackNow() && g.elapsed > 25, until: (_, ev) => ev.has('panic'), max: 6 },
  ],
  reset() { this.done = new Set(); this.cur = null; this.t = 0; this.events = new Set(); this.seenEvents = new Set(); },
  update(dt, g) {
    for (const e of g.events) this.seenEvents.add(e);
    const ev = this.seenEvents;
    const el = $('hint');
    if (!hintsOn || g.tutorial) { el.hidden = true; return; }
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
const camState = { yaw: 0, pitch: 0.42, dist: 4.6, zoom: 1, pos: new THREE.Vector3(), look: new THREE.Vector3(), init: true, focus: null };
// カメラの距離（設定と、マウスホイール・2本指で変えられる）
camState.zoom = Number(store.get('camZoom', 1)) || 1;
$('optCam').value = String(camState.zoom);
$('optCam').addEventListener('change', (e) => { camState.zoom = Number(e.target.value); store.set('camZoom', camState.zoom); });
canvas.addEventListener('wheel', (e) => {
  if (screen !== 'play') return;
  e.preventDefault();
  camState.zoom = clamp(camState.zoom * (e.deltaY > 0 ? 1.08 : 1 / 1.08), 0.7, 1.8);
  store.set('camZoom', Math.round(camState.zoom * 100) / 100);
}, { passive: false });
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
  let info = game.camInfo();
  if (camState.focus) {
    // 見学モード：選んだ生き物のまわりをゆっくり回る
    const F = camState.focus();
    info = { x: F.x, y: F.y - 0.32, z: F.z, focusDist: F.d };
    if (screen === 'play' && !input.camDX) camState.yaw += dt * 0.18;
  }
  if (screen === 'play') {
    camState.yaw -= input.camDX * 0.0065 + input.keyRot * 2.2 * dt;
    camState.pitch = clamp(camState.pitch + input.camDY * 0.004, 0.08, 1.15);
  }
  game.camYaw = camState.yaw;
  // 周りを見わたせるよう、少し引いて高めから（設定とホイールで調整できる）
  const Z = camState.zoom;
  let pitch = camState.pitch, dist = 4.6 * Z;
  if (info.underTable) { pitch = Math.min(pitch, 0.24); dist = 3.2 * Z; }
  else if (info.onTrough) { dist = 3.4 * Z; pitch = Math.max(pitch, 0.75); }
  else if (info.underRow) { pitch = Math.min(pitch, 0.26); dist = 1.8; } // 株の下：さいばい槽のはしにカメラがかくれないよう近め
  if (info.flying) { dist = 5.5 * Z; pitch = 0.3; }
  if (game.state === 'over') { camState.yaw += dt * 0.25; dist = 5; pitch = 0.5; }
  if (info.focusDist) { dist = info.focusDist; pitch = Math.min(Math.max(camState.pitch, 0.2), 0.9); }
  camState.dist = damp(camState.dist, dist, 5, dt);
  const fx = Math.sin(camState.yaw), fz = Math.cos(camState.yaw);
  const ty = info.y + 0.32;
  const d = camState.dist;
  let cx = info.x - fx * Math.cos(pitch) * d;
  let cz = info.z - fz * Math.cos(pitch) * d;
  let cy = ty + Math.sin(pitch) * d;
  // 株の中にカメラが入らないよう、近づけるか葉の下まで下げる
  if (!info.underRow && !info.onTrough && !info.focusDist) {
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
const F_TEXT = { WORK: ['…', '作業中'], INVESTIGATE: ['?', 'あやしんでいる'], CHASE: ['!', '追いかけてくる！'], PANIC: ['@', 'パニック中'], FUMIGATE: ['煙', 'けむり玉をたいている！'] };
const cache = {};
function setText(id, v) { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } }
function setW(el, k) { const v = `${Math.round(clamp(k, 0, 1) * 1000) / 10}%`; if (el.style.width !== v) el.style.width = v; }

// 初めて近づいたときの一言（一度見たら出さない）
const FIRST_TIPS = {
  box: 'かぶるとゆっくり歩けて、見つかりにくい。もう一度押すと出る',
  glove: '中にもぐると、まず見つからない。いたずらの1つ',
  bento: '農場主のお弁当。長押しでかじると、いたずら成功',
  trap: '仲間2匹と農場主の通り道に運ぶと、長靴がくっつく',
  drain: '中を通って、別の排水溝から出られる。逃げ道にも',
  stow: '死んだふりボタン（Xキー）で、このかごにもぐれる。運ばれて出荷されると、その箱は虫入りでダメに！',
  stowIn: 'じっとしていれば、農場主が出荷まで運んでくれる。長押しで中からかじれるけど、ゆれるとバレる',
  sheet: 'さわるとくっつく。食べるボタンの連打で抜け出せる。よけて通ろう',
  spider: '白く光る巣のそばに近づくと、クモがとびかかってくる',
};
const firstSeen = store.get('firstSeen', []);
const firstT = {};
let niceShown = false;
function updateHud(dt) {
  const g = game;
  if (!g.player) return;
  const left = g.shipLeft();
  setText('timer', `あと${left}箱`);
  $('timerCard').classList.toggle('low', left <= 2);
  // 練習の案内
  const tt = g.tutorialText(document.body.classList.contains('touch'));
  $('tutor').hidden = !tt || screen !== 'play';
  if (tt) setText('tutorText', tt);
  $('orderMini').hidden = screen !== 'play';
  if (screen === 'play') renderOrderMini();
  // 死んだふりのボタン：使っている間は緑、残りの回数
  const pd = g.player;
  const tD = $('tDead');
  tD.classList.toggle('using', !!(pd && pd.playDead > 0));
  tD.classList.toggle('off', !!(pd && (pd.deadUses || 0) <= 0 && !(pd.playDead > 0)));
  const ctxD = g.context();
  document.body.classList.toggle('stowed', !!(pd && pd.stow));
  const dl = pd && pd.stow ? 'かごから<br>出る' : ctxD && ctxD.stow ? 'かごに<br>もぐる' : `死んだ<br>ふり<small>${pd ? pd.deadUses || 0 : 0}</small>`;
  tD.classList.toggle('ready', !!(ctxD && ctxD.stow) || !!(pd && pd.stow));
  if (tD.dataset.l !== dl) { tD.dataset.l = dl; tD.innerHTML = dl; }
  // ナイス！
  if (g.niceT > 0.85 && !niceShown) {
    const el = $('nicePop');
    el.hidden = true; void el.offsetWidth; el.hidden = false;
    niceShown = true;
  } else if (g.niceT <= 0) { niceShown = false; $('nicePop').hidden = true; }
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
  // 初めて近づいたものには、案内の字を一度だけ長くする
  let firstTxt = '';
  if (ctx && ctx.first && !firstSeen.includes(ctx.first) && FIRST_TIPS[ctx.first]) {
    firstTxt = FIRST_TIPS[ctx.first];
    firstT[ctx.first] = (firstT[ctx.first] || 0) + dt;
    if (firstT[ctx.first] > 5) { firstSeen.push(ctx.first); store.set('firstSeen', firstSeen); }
  }
  if (ctx && screen === 'play') {
    const key = touch ? '' : 'Space';
    const html = `${key ? `<kbd>${key}</kbd>` : ''}${ctx.text}${firstTxt ? `<small class="first-tip">${firstTxt}</small>` : ''}`;
    if (cache.prompt !== html) { cache.prompt = html; pr.innerHTML = html; }
    pr.hidden = false;
    pr.classList.toggle('urgent', !!ctx.urgent);
    pr.classList.toggle('first', !!firstTxt);
  } else pr.hidden = true;
  const tA = $('tAction');
  const label = ctx ? (ctx.urgent ? '連打！' : ctx.text.replace('長押しで', '').replace('台に', '')) : '食べる';
  if (tA.textContent !== label) tA.textContent = label;
  tA.classList.toggle('off', !ctx);
  const eatingNow = !!(p.eatingCrate || p.eatingFruit) || p.greed > 3;
  tA.classList.toggle('eating', eatingNow);
  if (eatingNow) {
    tA.style.setProperty('--g', (p.greed / 100).toFixed(3));
    tA.classList.toggle('hot', p.greed > 65);
    tA.classList.toggle('max', p.greed > 88);
  }
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
      // 頭の上の「？」（あやしんでいる）「！」（見つけた）。気づきの度合いで大きく濃く
      let mk = null;
      if (f.state === 'CHASE') mk = label('mark x', '！');
      else if (f.state === 'INVESTIGATE' || (f.state === 'WORK' && f.susp > 18)) {
        const k = Math.min(1, f.susp / 100);
        mk = label(`mark q ${k > 0.6 ? 'hot' : ''}`, '？');
        mk.style.setProperty('--k', k.toFixed(2));
      }
      // 突撃中・すぐそばでは、顔の前にふきだしを出さず、画面の上に字幕として出す（動きが見えるように）
      const pp = g.player;
      const close = pp.st === 'fly' || f.state === 'PANIC' || Math.hypot(pp.x - f.x, pp.z - f.z) < 3.5;
      if (close) mk = null;
      if (f.speechT > 0 && f.speech && !close) {
        place(label('speech', escapeHtml(f.speech)), s);
        if (mk) { const s0 = project(f.x, 8.4, f.z); if (s0 && s0.on) place(mk, s0); }
      } else if (mk) place(mk, s);
    }
    const subOn = !!(f.speechT > 0 && f.speech && (g.player.st === 'fly' || f.state === 'PANIC' || Math.hypot(g.player.x - f.x, g.player.z - f.z) < 3.5));
    const sub = $('subtitle');
    if (subOn) { const t = `農場主「${f.speech}」`; if (sub.textContent !== t) sub.textContent = t; }
    sub.hidden = !subOn || screen !== 'play';
    // クモの名札と、ねらわれたときの「！」
    for (const S of g.spiders || []) {
      const d = Math.hypot(S.x - g.player.x, S.z - g.player.z);
      if (d > 9) continue;
      const sp = project(S.x, 1.75, S.z);
      if (!sp || !sp.on) continue;
      if (S.st === 'aim') place(label('mark x', '！'), sp);
      else place(label('tag-spider', 'クモ'), sp);
    }
    const I = g.inspector;
    if (I && I.m && I.speechT > 0) {
      const si = project(I.x, 5.6, I.z);
      if (si && si.on) place(label('speech', escapeHtml(I.speech)), si);
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
    edgeArrow($('farmerArrow'), f.hidden || screen !== 'play' ? null : { x: f.x, y: 3, z: f.z }, f.state, Math.hypot(f.x - p.x, f.z - p.z));
    const gt = g.guideTarget();
    edgeArrow($('guideArrow'), screen === 'play' ? gt : null, 'guide', 0, true);
  } else {
    $('subtitle').hidden = true;
    $('farmerArrow').hidden = true;
    $('guideArrow').hidden = true;
  }
  for (let i = used; i < pool.length; i++) if (pool[i].style.display !== 'none') pool[i].style.display = 'none';
}
// 画面の外にある物の向きを、画面の端の矢印で出す（always=画面内でも頭上に出す）
const v3b = new THREE.Vector3();
// 足音・鈴の「波紋」：画面の中ならその場所、外なら画面の端に出す
const ripplesEl = $('ripples');
function screenPos(x, y, z) {
  v3b.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
  const behind = v3b.z > 0;
  v3b.applyMatrix4(camera.projectionMatrix);
  let nx = v3b.x, ny = v3b.y;
  if (behind) { nx = -nx; ny = -ny; }
  const inside = !behind && Math.abs(nx) < 0.95 && Math.abs(ny) < 0.95;
  if (!inside) { const k = 1 / Math.max(Math.abs(nx) / 0.9, Math.abs(ny) / 0.85, 1e-3); nx *= k; ny *= k; }
  return { x: (nx * 0.5 + 0.5) * window.innerWidth, y: (-ny * 0.5 + 0.5) * window.innerHeight };
}
function showPings() {
  const list = game.soundPings || [];
  if (!list.length) return;
  const pings = list.splice(0);
  if (!rippleOn || screen !== 'play') return;
  for (const pg of pings.slice(-3)) {
    if (ripplesEl.children.length > 8) ripplesEl.firstChild.remove();
    const sp = screenPos(pg.x, 0.2, pg.z);
    const el = document.createElement('div');
    el.className = `ripple ${pg.kind === 'bell' ? 'bell' : ''}`;
    if (pg.kind === 'bell') el.dataset.t = 'チリン';
    el.style.setProperty('--pos', `translate(${sp.x.toFixed(0)}px, ${sp.y.toFixed(0)}px)`);
    el.style.setProperty('--op', String(Math.min(0.9, 0.25 + pg.v * 0.7)));
    ripplesEl.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }
}
function edgeArrow(el, pos, state, dist, always = false) {
  if (!pos) { el.hidden = true; return; }
  v3b.set(pos.x, pos.y, pos.z).applyMatrix4(camera.matrixWorldInverse);
  const behind = v3b.z > 0;
  v3b.applyMatrix4(camera.projectionMatrix);
  let nx = v3b.x, ny = v3b.y;
  if (behind) { nx = -nx; ny = -ny; }
  const W = window.innerWidth, H = window.innerHeight;
  const inside = !behind && Math.abs(nx) < 0.92 && Math.abs(ny) < 0.85;
  if (inside && !always) { el.hidden = true; return; }
  el.hidden = false;
  if (el.dataset.s !== state) el.dataset.s = state;
  let x, y, ang;
  if (inside) {
    x = (nx * 0.5 + 0.5) * W; y = (-ny * 0.5 + 0.5) * H - 30; ang = Math.PI;
  } else {
    const k = 1 / Math.max(Math.abs(nx) / 0.9, Math.abs(ny) / 0.8, 1e-3);
    nx *= k; ny *= k;
    x = (nx * 0.5 + 0.5) * W; y = (-ny * 0.5 + 0.5) * H;
    ang = Math.atan2(nx, ny);
  }
  const sc = dist ? Math.max(0.7, Math.min(1.4, 14 / Math.max(4, dist))) : 1;
  el.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px) translate(-50%, -50%) rotate(${ang.toFixed(2)}rad) scale(${sc.toFixed(2)})`;
  const lbl = el.querySelector('.ea-lbl');
  if (lbl) lbl.style.transform = `rotate(${(-ang).toFixed(2)}rad)`;
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
  if (g.cat && g.cat.m.root.visible) { mctx.fillStyle = '#ffae4a'; mctx.beginPath(); mctx.arc(mx(g.cat.x), mz(g.cat.z), 4.5, 0, 6.29); mctx.fill(); mctx.strokeStyle = '#000'; mctx.lineWidth = 1; mctx.stroke(); }
  if (g.inspector && g.inspector.m) { mctx.fillStyle = '#3ad65a'; mctx.beginPath(); mctx.arc(mx(g.inspector.x), mz(g.inspector.z), 5.5, 0, 6.29); mctx.fill(); mctx.strokeStyle = '#fff'; mctx.lineWidth = 1.5; mctx.stroke(); }
  // お弁当・軍手・段ボール・排水溝の小さな印（いたずらと隠れ場所）
  if (g.bento && !g.bento.done) { mctx.fillStyle = '#3a6fb0'; mctx.fillRect(mx(g.bento.x) - 4, mz(g.bento.z) - 3, 8, 6); mctx.fillStyle = '#f2c94a'; mctx.fillRect(mx(g.bento.x) - 1.5, mz(g.bento.z) - 1.5, 3, 3); }
  if (g.glove) { mctx.fillStyle = '#9a9a9a'; mctx.beginPath(); mctx.arc(mx(g.glove.x), mz(g.glove.z), 3.5, 0, 6.29); mctx.fill(); mctx.strokeStyle = '#c8342a'; mctx.lineWidth = 1.5; mctx.stroke(); }
  for (const B of g.boxes || []) { mctx.fillStyle = '#c9a26b'; mctx.fillRect(mx(B.x) - 4, mz(B.z) - 3.5, 8, 7); mctx.strokeStyle = '#5a3b1c'; mctx.lineWidth = 1; mctx.strokeRect(mx(B.x) - 4, mz(B.z) - 3.5, 8, 7); }
  for (const Sh of g.sheets || []) { mctx.fillStyle = '#f2d21b'; mctx.fillRect(mx(Sh.x) - 4, mz(Sh.z) - 2.5, 8, 5); }
  for (const Sp of g.spiders || []) { mctx.strokeStyle = 'rgba(255,255,255,0.9)'; mctx.lineWidth = 1; mctx.beginPath(); mctx.arc(mx(Sp.x), mz(Sp.z), 4.5, 0, 6.29); mctx.stroke(); mctx.fillStyle = '#111'; mctx.beginPath(); mctx.arc(mx(Sp.x), mz(Sp.z), 1.8, 0, 6.29); mctx.fill(); }
  if (g.exterm && g.exterm.m) { mctx.fillStyle = '#ffffff'; mctx.beginPath(); mctx.arc(mx(g.exterm.x), mz(g.exterm.z), 4, 0, 6.29); mctx.fill(); mctx.strokeStyle = '#d8342a'; mctx.lineWidth = 1.5; mctx.stroke(); }
  for (const D of g.drains || []) { mctx.strokeStyle = '#cfd6dc'; mctx.lineWidth = 1.5; mctx.beginPath(); mctx.arc(mx(D.x), mz(D.z), 3.5, 0, 6.29); mctx.stroke(); mctx.beginPath(); mctx.moveTo(mx(D.x) - 3, mz(D.z)); mctx.lineTo(mx(D.x) + 3, mz(D.z)); mctx.stroke(); }
  for (const b of g.baits) { if (!b.alive) continue; mctx.fillStyle = '#111'; mctx.beginPath(); mctx.arc(mx(b.x), mz(b.z), 4, 0, 6.29); mctx.fill(); mctx.fillStyle = '#f2c31b'; mctx.beginPath(); mctx.arc(mx(b.x), mz(b.z), 1.6, 0, 6.29); mctx.fill(); }
  mctx.strokeStyle = 'rgba(190,232,255,0.9)'; mctx.lineWidth = 1.5;
  for (const L of WIND_LANES) { mctx.beginPath(); mctx.arc(mx(L.x0), mz(L.z), 4, 0, 6.29); mctx.stroke(); mctx.beginPath(); mctx.setLineDash([3, 3]); mctx.moveTo(mx(L.x0) + 4, mz(L.z)); mctx.lineTo(mx(L.x1), mz(L.z)); mctx.stroke(); mctx.setLineDash([]); }
  if (g.fog && !g.fog.cleared) { mctx.fillStyle = 'rgba(200,200,190,0.45)'; mctx.beginPath(); mctx.arc(mx(g.fog.x), mz(g.fog.z), g.fog.r * sx, 0, 6.29); mctx.fill(); }
  if (g.safeRings && g.safeRings.length) { mctx.strokeStyle = '#6dff7a'; mctx.lineWidth = 2.5; for (const sp of SAFE_SPOTS) { mctx.beginPath(); mctx.arc(mx(sp.x), mz(sp.z), 7, 0, 6.29); mctx.stroke(); } }
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
  const rawDt = dt;
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
    if (screen === 'run' || screen === 'runover') {
      runner.update(dt, input);
      if (screen === 'run') {
        const g2 = runner.gap;
        $('runProg').style.width = `${(runner.progress * 100).toFixed(1)}%`;
        $('runMe').style.left = `${(runner.progress * 100).toFixed(1)}%`;
        $('runTruck').style.left = `${(runner.truckProgress * 100).toFixed(1)}%`;
        $('runGap').textContent = runner.count > 0 ? '' : `軽トラまで ${Math.max(0, g2).toFixed(0)}m`;
        $('runGap').classList.toggle('near', g2 < 4);
        $('runStam').style.width = `${runner.stam.toFixed(0)}%`;
        $('runBits').textContent = runner.bits;
        $('runCount').textContent = runner.count > 0 ? String(Math.ceil(runner.count)) : runner.t < 0.8 ? 'にげろ！' : '';
        $('runHelp').hidden = runner.t > 6;
        runSayT -= dt; if (runSayT <= 0) $('runSay').hidden = true;
        const tA = $('tAction'); if (tA.textContent !== 'ダッシュ') tA.textContent = 'ダッシュ';
      }
      world.update(now / 1000, camera);
      fx.render(dt, 4.2, now / 1000);
      return;
    }
    if (screen === 'play' || screen === 'result' || screen === 'title') {
      const prevMode = game.mode;
      game.update(screen === 'play' ? dt : (game.state === 'over' ? dt : 0), input);
      if (game.mode !== prevMode) updateCmdButtons();
      if (screen === 'play') {
        hints.update(dt, game);
        // 出荷ジャックの気づき：農場主が箱を運ぶのを初めて見たときだけ
        if (game.events.includes('carrystart') && !firstSeen.includes('stowHint') && !game.tutorial && game.farmer && game.player &&
            Math.hypot(game.farmer.x - game.player.x, game.farmer.z - game.player.z) < 16) {
          firstSeen.push('stowHint'); store.set('firstSeen', firstSeen);
          ui.toast('農場主が箱を運んでいく…あの箱にもぐれたら？ 台のコンテナのそばで死んだふりボタン＝「かごにもぐる」。そのまま出荷されると箱は虫入りでダメに！', 'warn');
        }
        game.events.length = 0;
        if (game.state === 'over') setScreen('over');
      }
    }
    if (screen === 'over' && game.state === 'over') game.update(dt, input);
    updateCamera(dt);
    if (screen !== 'title') { updateHud(dt); drawMinimap(dt); }
    updateLabels();
    showPings();
    // わなが見える：自分から6より近い粘着シート・クモの巣のまわりの葉を透かす
    if (game.player && screen === 'play') {
      let best = null, bd = 6;
      for (const o of [...(game.sheets || []), ...(game.spiders || [])]) { const d = Math.hypot(o.x - game.player.x, o.z - game.player.z); if (d < bd) { bd = d; best = o; } }
      if (best) world.setReveal(best.x, 1.48 + (best.sheet ? 0.3 : 0.1), best.z, 1.5); else world.setReveal(0, 0, 0, 0);
      for (const sh of game.sheets || []) { const c = sh.model.userData.card; const near = Math.hypot(sh.x - game.player.x, sh.z - game.player.z) < 6; if (c) c.material.emissiveIntensity = near ? 0.9 + Math.sin(performance.now() / 160) * 0.5 : 0.7; }
    } else world.setReveal(0, 0, 0, 0);
    if (game.cat && game.cat.m.setFuzz) game.cat.m.setFuzz(camera.position.distanceTo(game.cat.m.root.position) < 6);
    const tNow = now / 1000;
    world.update(tNow, camera);
    world.setNearFade(screen === 'title' || !game.player ? 0.6 : camState.dist - 0.3);
    let focusD = 24;
    if (game.player && game.state !== 'title') focusD = camera.position.distanceTo(new THREE.Vector3(game.player.x, game.player.y + 0.15, game.player.z));
    // けむり玉の煙でかすむ
    scene.fog.density = 0.0055 + (screen !== 'title' ? (game.fogLevel || 0) * 0.05 : 0);
    // 農場主のラジオ：近いほど大きく、左右で方向が分かる
    if (screen === 'play' && game.farmer && game.player) {
      const f = game.farmer, p = game.player;
      const d = Math.hypot(f.x - p.x, f.z - p.z);
      const vol = (f.hidden ? 0.15 : 1) / (1 + Math.pow(d / 7, 2));
      sfx.updateRadio(vol, game.panOf(f.x, f.z));
    } else sfx.updateRadio(0, 0);
    fx.render(dt, focusD, tNow);
    // 名場面の写真（描いた直後に小さく撮る）
    if (game.snapRequests && game.snapRequests.length) {
      for (const req of game.snapRequests.splice(0)) {
        const img = snapCanvas();
        const i = game.highlights.findIndex((h) => h.type === req.type);
        const h = { ...req, img };
        if (i >= 0) game.highlights[i] = h; else if (game.highlights.length < 4) game.highlights.push(h);
      }
    }
    autoQ.sample(dt, screen === 'play');
    // なめらかさの記録：遊んでいる間の1秒あたりのコマ数
    if (screen === 'play' && rawDt > 0 && rawDt < 1) { playFps.t += rawDt; playFps.n++; if (rawDt > playFps.worst) playFps.worst = rawDt; }
  } catch (e) {
    showError(e && e.stack ? e.stack : String(e));
    throw e;
  } finally {
    input.endFrame();
  }
}
const snapC = document.createElement('canvas');
snapC.width = 320; snapC.height = 200;
function snapCanvas() {
  try {
    const x = snapC.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const sh = Math.min(H, W * 200 / 320), sw = sh * 320 / 200;
    x.drawImage(canvas, (W - sw) / 2, (H - sh) / 2, sw, sh, 0, 0, 320, 200);
    return snapC.toDataURL('image/jpeg', 0.75);
  } catch (_) { return ''; }
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
window.__rh.startTour = startTour;
window.__rh.startRun = startRun;
window.__rh.runner = runner;
Object.assign(window.__rh, { stages: STAGES, plantFruits: PLANT_FRUITS, rows: ROWS, windLanes: WIND_LANES, safeSpots: SAFE_SPOTS, features: FEATURES });
window.__rh.MAX_NYMPHS = MAX_NYMPHS;
window.__rh.DOOR = DOOR;
