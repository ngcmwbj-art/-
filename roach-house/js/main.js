// 起動・描画・画面の表示
import * as THREE from 'three';
import { buildWorld, ROWS, TABLES, DOOR, TRUCK, rowAt, WIND_LANES, SAFE_SPOTS, PLANT_FRUITS } from './world.js';
import * as FEATURES from './features.js';
import { Game, DIFFS, STAGES, MAX_NYMPHS, HAZ_NAMES } from './game.js';
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
  world.setShadow(ecoOnNow() ? Math.min(LEVELS[lvl].shadow, 1024) : LEVELS[lvl].shadow);
  ui.feed(`画質「${LEVELS[lvl].label}」に`, '画', 'info');
});
autoQ.auto = qualityPref === 'auto';
function applyQuality(pref) {
  qualityPref = pref;
  store.set('quality', pref);
  autoQ.auto = pref === 'auto';
  const lvl = pref === 'auto' ? (isTouchDevice ? 'medium' : 'high') : pref;
  fx.setLevel(lvl);
  world.setShadow(ecoOnNow() ? Math.min(LEVELS[lvl].shadow, 1024) : LEVELS[lvl].shadow);
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
let voiceOn = store.get('voice', true);
let hintsOn = store.get('hints', true);
$('optSound').checked = soundOn;
$('optHints').checked = hintsOn;
sfx.setMuted(!soundOn);

// 小さなお知らせは画面の端に、丸い印つきでまとめる（大事なものだけ真ん中）
const MINOR = [
  [/仲間がやられた/, '仲', 'bad'], [/卵がかえ|仲間が生まれ|仲間が.*匹ふえ/, '卵', 'good'], [/仲間に指示/, '指', 'info'],
  [/産卵|卵を産/, '卵', 'good'], [/助け出した/, '助', 'good'], [/段ボール|軍手から|軍手にもぐ/, '隠', 'good'],
  [/いたずら成功/, '★', 'good'], [/検品が終わった|煙が晴れ/, '済', 'info'], [/ホイホイを運ぶぞ/, '運', 'good'], [/^(ついてこい|まかせた|おとり)！/, '指', 'info'],
  [/箱を(置いた|落とした)|かごを放り出した/, '箱', 'good'], [/排水溝/, '溝', 'good'], [/カブトムシ/, '虫', 'good'],
];
function feed(text, glyph, kind) {
  const box = $('feed');
  const el = document.createElement('div');
  el.className = `feed-item ${kind || ''}`;
  el.innerHTML = `<i>${glyph}</i><span></span>`;
  el.lastChild.textContent = text;
  box.appendChild(el);
  while (box.children.length > 3) box.removeChild(box.firstChild);
  setTimeout(() => el.classList.add('out'), 3000);
  setTimeout(() => el.remove(), 4100);
}
const ui = {
  feed,
  radio(text) { feed(text.replace(/^ラジオ「/, '').replace(/」$/, ''), '♪', 'radio'); sfx.radioNews && sfx.radioNews(); },
  toast(text, kind) {
    const m = MINOR.find(([re]) => re.test(text));
    if (m) { feed(text, m[1], m[2]); return; }
    const box = $('toasts');
    const el = document.createElement('div');
    el.className = `toast ${kind || ''}`;
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 2) box.removeChild(box.firstChild);
    setTimeout(() => el.classList.add('out'), 2400);
    setTimeout(() => el.remove(), 3100);
  },
  // 農場主の声（スマホ・パソコンの読み上げ。低めの声で。新しいセリフが来たら前のは止める）
  speak(text) {
    if (!voiceOn || !soundOn || !('speechSynthesis' in window) || (screen !== 'play' && screen !== 'over')) return;
    try {
      const S = window.speechSynthesis;
      S.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[！？]/g, '。'));
      u.lang = 'ja-JP'; u.rate = 1.05; u.pitch = 0.6; u.volume = 0.9;
      const v = S.getVoices().find((x) => /ja/i.test(x.lang));
      if (v) u.voice = v;
      S.speak(u);
    } catch (_) { /* 読み上げが使えない機種は字だけ */ }
  },
  hurtLevel: 0,
  hurt(k) { this.hurtLevel = Math.min(1, this.hurtLevel + k * 0.6 + 0.1); },
  // 勝ったとき：空っぽの出荷トラックがしょんぼり出発（4秒ほど見せてから結果）
  gameOver(res) {
    if (res.win && !game.tutorial && !game.tour) {
      camState.ending = { t: 0 };
      // しょんぼりしたクラクション「プッ…プー…」
      setTimeout(() => { sfx.tone(330, 0.18, 'square', 0.06); sfx.tone(262, 0.6, 'square', 0.06, -40, 0.25); }, 900);
      setTimeout(() => {
        // 遅い機種でも、結果の前に必ずトラックの写真を撮る
        const E = camState.ending;
        if (E && !E.snapped) { E.snapped = true; game.snapRequests.push({ type: 'truck', text: '空っぽのトラックが、しょんぼり出発', t: game.elapsed, bubble: 'もう限界だ…' }); setTimeout(() => showResult(res), 250); }
        else showResult(res);
      }, 4200);
    }
    else setTimeout(() => showResult(res), 1400);
  },
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
  b.textContent = ok ? `おまけ：田んぼ道${records.runBest ? `　ベスト ${records.runBest.toFixed(1)}秒` : ''}` : 'おまけ：田んぼ道（出荷ジャックで遊べる）';
  // 夕方の農道：夜明けのコースを1回逃げきると遊べる
  const b2 = $('btnRunDusk');
  b2.hidden = !ok;
  const ok2 = (records.runClears || 0) >= 1;
  b2.disabled = !ok2;
  b2.textContent = ok2 ? `おまけ：夕方の農道${records.runBestDusk ? `　ベスト ${records.runBestDusk.toFixed(1)}秒` : ''}` : 'おまけ：夕方の農道（田んぼ道を逃げきると遊べる）';
}
let runCourse = 'dawn';
let runFromJack = null; // 出荷ジャックから来たとき：もどる先のゲームの状態
function startRun(course, fromJack = false) {
  sfx.heaterStop && sfx.heaterStop();
  runCourse = course === 'dusk' ? 'dusk' : 'dawn';
  runFromJack = fromJack ? { state: game.state } : null;
  sfx.unlock();
  endTourUi();
  sfx.stopRadio();
  world.setNight(false);
  renderer.toneMappingExposure = 0.95;
  world.group.visible = false;
  if (game.root) game.root.visible = false;
  if (!runFromJack) game.state = 'title';
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
  // おみやげ：にげきると仲間がふえる（かけら10個以上で2匹）
  const gift = res.win ? (res.bits >= 10 ? 2 : 1) : 0;
  if (!runFromJack && gift) records.souvenir = Math.max(records.souvenir || 0, gift);
  runGift = gift;
  store.set('records', records);
  $('btnRunBack').hidden = !runFromJack;
  $('btnRunAgain').hidden = !!runFromJack;
  $('btnRunTitle').hidden = !!runFromJack;
  $('runTitle').textContent = res.win ? 'にげきった！' : 'つかまった…';
  $('runTitle').className = `rtitle ${res.win ? 'win' : 'lose'}`;
  $('runText').textContent = res.win ? `${res.time.toFixed(1)}秒　かけら ${res.bits}` : `ゴールまで あと${Math.round(230 - res.dist)}m`;
  if (gift) best = `おみやげ：${runFromJack ? '' : '次のステージで'}仲間 +${gift}` + (best ? '　' + best : '');
  $('runNews').innerHTML = best ? `<span class="new">${best}</span>` : '';
  setScreen('runover');
}
$('btnRun').addEventListener('click', () => startRun('dawn'));
$('btnRunDusk').addEventListener('click', () => startRun('dusk'));
$('btnRunAgain').addEventListener('click', () => { endRun(); startRun(runCourse); });
$('btnRunTitle').addEventListener('click', () => { endRun(); toTitle(); });
let runGift = 0;
// 出荷ジャックから田んぼ道へ行ったあと、ハウスにもどる（おみやげの仲間つき）
$('btnRunBack').addEventListener('click', () => {
  const back = runFromJack;
  endRun();
  runFromJack = null;
  if (!back) { toTitle(); return; }
  game.state = back.state;
  sfx.startRadio();
  world.setNight(!!game.diff.night);
  renderer.toneMappingExposure = game.diff.night ? 1.5 : 0.95;
  if (runGift) game.giveSouvenir(runGift);
  runGift = 0;
  camState.init = true;
  setScreen('play');
});
// 出荷ジャック成功のあと：田んぼ道へにげるか、ハウスにもどるか（選ぶ間はゲームを止める）
let jackOfferOn = false;
let humT = 0;
// 農場主の機嫌：hum＝鼻歌、grumble＝ぶつぶつ、null＝だまる
function farmerMood(f) {
  if (!f || f.hidden || f.speechT > 0) return null;
  if (f.state === 'WORK' && (f.anger || 0) >= 2) return 'grumble';
  if (f.state === 'WORK' && f.susp < 15 && f.phase !== 'radio') return 'hum';
  return null;
}
function offerJack() { jackOfferOn = true; $('jackOffer').hidden = false; }
function closeJack() { jackOfferOn = false; $('jackOffer').hidden = true; }
$('btnJackRun').addEventListener('click', () => { closeJack(); startRun('dawn', true); });
$('btnJackStay').addEventListener('click', () => { closeJack(); });
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
  // 今日のお題：お題1つ＋週のチャレンジは1本の棒だけ
  const wNeed = WEEK_GOALS.reduce((a2, gl) => a2 + gl.need, 0);
  const wHave = WEEK_GOALS.reduce((a2, gl) => a2 + Math.min(gl.need, wk.prog[gl.id] || 0), 0);
  const o = orders[0];
  const ok = o && done.includes(o.id);
  $('orderCard').innerHTML = `${sn ? `<p class="season-note">${SEASON_LABEL[sn]}のかざり（期間限定の帽子）</p>` : ''}<h3>今日のお題</h3>` +
    `<p class="odai ${ok ? 'done' : ''}">${ok ? '✓ ' : ''}${o ? o.text : ''}</p>` +
    `<div class="week1"><span>週</span><span class="wbar"><i style="width:${(wHave / wNeed * 100).toFixed(0)}%"></i></span>${wk.done ? '<b class="ok">✓</b>' : ''}</div>`;
}
renderOrders();
renderRunBtn();
$('optTutor').checked = !store.get('tutorialDone', false);

let lastDiff = 's1';
function startGame(diff, opt = {}) {
  closeJack();
  resetTruck();
  sfx.heaterStop && sfx.heaterStop();
  $('heatBadge').hidden = true;
  sfx.unlock();
  sfx.startAmbience();
  sfx.startRadio();
  lastDiff = diff;
  store.set('lastStage', diff);
  refreshDay();
  const tutorial = $('optTutor').checked;
  const assist = !!(records.assist && records.assist[diff]);
  endTourUi();
  const carryWas = records.carry;
  game.start(diff, undefined, { tutorial, easy: !tutorial && $('optEasy').checked, boss: (records.eggs || 0) >= 50, wing: records.wing, hat: records.hat, pattern: records.pattern, assist, season: seasonOf(dayKey), layoutSeed: dailySeed(dayKey) });
  $('optTutor').checked = false;
  if (records.carry) { records.carry = null; store.set('records', records); }
  renderOrderMini();
  $('orderMini').hidden = false;
  const D = game.diff;
  world.setNight(!!D.night);
  renderer.toneMappingExposure = D.night ? 1.5 : 0.95;
  if (!tutorial) {
    ui.toast(`${D.target}箱ダメにしろ！`, 'info');
    // 田んぼ道のおみやげ：次のステージのはじめに仲間がふえる
    if (records.souvenir > 0) { game.giveSouvenir(records.souvenir); records.souvenir = 0; store.set('records', records); }
    // 前のステージで生き残った仲間がついてくる（次のステージをすぐ遊んだとき）
    if (carryWas && carryWas.to === diff && carryWas.n > 0) game.giveSouvenir(carryWas.n, 'carry');
    if ((records.eggs || 0) >= 50 && !records.bossShown) { records.bossShown = true; store.set('records', records); ui.toast('親分ゴキブリが仲間に！', 'good'); }
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
  // ハウスをぐるっと：そのステージの1回目だけ、始めに3秒ほど全体を見せる（おせばとばせる。やり直しでは出さない）
  const introSeen = store.get('introSeen', []);
  if (!tutorial && !introSeen.includes(diff) && !opt.noIntro) {
    introSeen.push(diff); store.set('introSeen', introSeen);
    camState.intro = { t: 0, dur: 3.4 };
    $('introSkip').hidden = false;
    // このステージに出るもの（3つまで）を、ぐるっと見せる間だけ紹介
    $('introHaz').innerHTML = `<b>このステージ</b>${(D.haz || []).map((k) => `<i>${HAZ_NAMES[k]}</i>`).join('')}`;
    $('introHaz').hidden = false;
    document.body.classList.add('intro');
  } else endIntro();
}
function resetTruck() {
  camState.ending = null;
  if (world.truck) { world.truck.position.set(TRUCK.x, 0, TRUCK.z); world.truck.rotation.set(0, 0, 0); }
}
function endIntro() {
  if (!camState.intro && $('introSkip').hidden) return;
  camState.intro = null;
  camState.init = true;
  $('introSkip').hidden = true;
  $('introHaz').hidden = true;
  document.body.classList.remove('intro');
}
$('introSkip').addEventListener('click', (e) => { e.preventDefault(); endIntro(); });
window.addEventListener('keydown', () => { if (camState.intro) endIntro(); });
canvas.addEventListener('pointerdown', () => { if (camState.intro) endIntro(); });

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
  ui.toast('見学モード', 'info');
}
// 見本プレイ：ゴキブリが自分で「かじる→かくれる→ふやす」を12秒ほど見せる（見学モードの仕組みを使う）
let demo = null;
function startDemo() {
  sfx.unlock();
  sfx.startAmbience();
  refreshDay();
  game.start('s1', undefined, { tour: true, wing: records.wing, hat: records.hat, pattern: records.pattern, season: seasonOf(dayKey), layoutSeed: dailySeed(dayKey) });
  world.setNight(false);
  renderer.toneMappingExposure = 0.95;
  const P = game.player;
  const crate = game.crates.filter((c) => c.table < 0).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0];
  demo = { t: 0, crate, laid: false, eat: true };
  document.body.classList.add('tour', 'demo');
  $('orderMini').hidden = true;
  $('toasts').innerHTML = '';
  $('demoBar').hidden = false;
  camState.yaw = game.camYaw; camState.pitch = 0.5; camState.init = true; camState.focus = null;
  setScreen('play');
}
function endDemo() {
  if (!demo) return;
  demo = null;
  document.body.classList.remove('tour', 'demo');
  $('demoBar').hidden = true;
  toTitle();
}
function steerTo(x, z) {
  const P = game.player;
  const ex = x - P.x, ez = z - P.z, n = Math.hypot(ex, ez) || 1;
  if (n < 0.25) { input.mx = 0; input.mz = 0; return true; }
  const fx = Math.sin(game.camYaw), fz = Math.cos(game.camYaw);
  input.mz = (ex * fx + ez * fz) / n; input.mx = (-ex * fz + ez * fx) / n;
  return false;
}
function demoStep(dt) {
  const D = demo, P = game.player;
  D.t += dt;
  input.actionHeld = false; input.dash = false;
  let cap = '';
  if (D.t < 6.5) {
    cap = 'かじる';
    const c = D.crate;
    if (c && game.crateInReach(P) === c) {
      input.mx = 0; input.mz = 0;
      if (P.greed > 72) D.eat = false; else if (P.greed < 25) D.eat = true;
      input.actionHeld = D.eat;
    } else if (c) steerTo(c.x, c.z + (c.z > P.z ? -0.7 : 0.7));
  } else if (D.t < 10.5) {
    cap = 'かくれる';
    // いちばん近い畝（葉の下）へ
    const row = ROWS.slice().sort((a, b) => Math.abs(a.z - P.z) - Math.abs(b.z - P.z))[0];
    steerTo(Math.max(row.x0 + 1, Math.min(row.x1 - 1, P.x)), row.z);
  } else if (D.t < 13.5) {
    cap = 'ふやす';
    input.mx = 0; input.mz = 0;
    if (!D.laid) { D.laid = true; game.nutrition = 100; input.press('egg'); }
  } else { endDemo(); return; }
  setText('demoCap', cap);
}
$('btnDemo').addEventListener('click', () => startDemo());
$('btnDemoEnd').addEventListener('click', (e) => { e.preventDefault(); endDemo(); });
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
  const n = PRANKS.filter((x) => pr[x.id]).length;
  $('orderMini').innerHTML = `いたずら <b>${n}/${PRANKS.length}</b>`;
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
  sfx.pause();
  if ('speechSynthesis' in window) try { window.speechSynthesis.cancel(); } catch (_) { /* 無視 */ }
  $('pauseTip').textContent = pick(TIPS);
}
function resumeGame() {
  if (screen !== 'pause') return;
  sfx.unlock();
  setScreen('play');
}
function toTitle() {
  closeJack();
  resetTruck();
  if ('speechSynthesis' in window) try { window.speechSynthesis.cancel(); } catch (_) { /* 無視 */ }
  sfx.heaterStop && sfx.heaterStop();
  $('heatBadge').hidden = true;
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
  // 技の一覧：覚えた技に★、まだの技は「？」とヒント1行
  const usedT = records.used || {};
  $('bookTechs').innerHTML = FEATURES.TECHS.map((t) => {
    const ok = !!usedT[t.id];
    return `<li class="${ok ? '' : 'locked'}"><b>${ok ? '★ ' + t.name : '？'}</b><small>${t.short}</small></li>`;
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
  if (st) b.textContent = `前回：${st.label}`;
  // きょうの1回：まだクリアしていない次のステージ。全部クリアしたら日替わりで
  const tk = todayStage();
  $('btnToday').textContent = `きょうの1回 ▶ ${DIFFS[tk].label}`;
}
function todayStage() {
  const open = Math.min(STAGES.length, (records.cleared || 0) + 1);
  if ((records.cleared || 0) < STAGES.length) return STAGES[open - 1].key;
  return STAGES[dailySeed(dayKey) % STAGES.length].key;
}
$('btnToday').addEventListener('click', () => startGame(todayStage()));
$('btnLast').addEventListener('click', () => { const k = store.get('lastStage', null); if (k && DIFFS[k]) startGame(k); });
renderLast();
$('btnBookBack').addEventListener('click', () => { setScreen('title'); renderOrders(); });
$('btnSkipTutor').addEventListener('click', (e) => { e.preventDefault(); game.endTutorial(false); store.set('tutorialDone', true); e.currentTarget.blur(); });

const TIPS = [
  '台の下でじっとしていれば、農場主からはほとんど見えません。',
  'がっつきゲージは緑のうちに離すと音が出ません。黄色で止めるのが一番効率がいい食べかたです。',
  '「まかせた」にすると、追われたとき仲間がおとりになってくれます。',
  '農場主がコンテナを運んでいる時に突撃すると、コンテナを床に落とします。',
  '卵は畝の葉の下か台の下に産むと、見つかりにくくなります。',
  'ダメになったコンテナを農場主が見つけると、怒って近くにホイホイを置きます。',
  '殺虫剤は黄色い輪、叩きつぶしは赤い輪が予告です。輪が出たらすぐ離れましょう。',
  '「まかせた」の仲間は少しずつしか食べませんが、何匹もいると大きな戦力です。',
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
      <span>${ok ? `${st.target}箱ダメにする` : `ステージ${st.no - 1}をクリアで遊べる`}</span>
      ${ok ? `<span class="haz">${(st.haz || []).map((k) => `<i>${HAZ_NAMES[k]}</i>`).join('')}</span>` : ''}
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
$('optVoice').checked = voiceOn;
$('optEasy').checked = !!store.get('easy', false);
$('optEasy').addEventListener('change', (e) => store.set('easy', e.target.checked));
$('optVoice').addEventListener('change', (e) => { voiceOn = e.target.checked; store.set('voice', voiceOn); if (!voiceOn && 'speechSynthesis' in window) window.speechSynthesis.cancel(); });
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
// アプリを裏にしたら一時停止して音も止める。もどったら、遊んでいる途中でなければ音を戻す
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { pauseGame(); sfx.pause(); }
  else if (screen !== 'pause' && soundOn) sfx.unlock();
});
window.addEventListener('pointerdown', () => { if (screen !== 'pause') sfx.unlock(); }, { capture: true });

function updateCmdButtons() {
  for (const m of ['search', 'follow']) $(`cmd-${m}`).classList.toggle('on', game.mode === m);
}

function renderBest() { renderStages(); }

// ---------- 結果 ----------
const REASONS = {
  ruined: '出荷はめちゃくちゃだ！',
  shipped: '出荷されすぎた…',
  dead: '仲間がいなくなった…',
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
  $('rGrumble').innerHTML = `<div class="diary-h">${dm}月${dd}日</div>` + dl.map((g) => `<p>${escapeHtml(g)}</p>`).join('');
  // 結果画面は、写真・星・口癖の1行だけ。日記はタップで開く
  $('rCatch').textContent = `農場主「${res.win ? 'もう限界だ…' : '今日もおれの勝ちだな'}」`;
  document.querySelector('.r-diary').open = false;
  // 名場面
  const hl = (res.highlights || []).filter((h) => h.img);
  // 今日の1枚：いちばんの名場面を1枚だけ大きく（ほかは「くわしく」の中）
  // いたずらの写真は候補から外す（第12回）
  const PREF = ['truck', 'stowaway', 'close', 'last'];
  const top = hl.filter((h) => h.type !== 'prank').sort((a, b) => (PREF.indexOf(a.type) < 0 ? 9 : PREF.indexOf(a.type)) - (PREF.indexOf(b.type) < 0 ? 9 : PREF.indexOf(b.type)))[0];
  $('rPhoto').innerHTML = top ? `<img src="${top.img}" alt=""><figcaption>${escapeHtml(top.text)}</figcaption>` : '';
  $('rPhoto').hidden = !top;
  $('rHigh').innerHTML = hl.length ? hl.map((h) => `<figure><img src="${h.img}" alt=""><figcaption>${mm(h.t)}　${escapeHtml(h.text)}</figcaption></figure>`).join('') : '';
  $('rHigh').hidden = !hl.length;
  // 今日の注文・称号・羽の色
  const out = applyResult(records, res, s, orders, dayKey);
  records = out.rec;
  store.set('records', records);
  const ol = orders.map((o) => (out.cleared.includes(o.id) ? `<span class="ok">✓ ${o.text}</span>` : `<span class="ng">・${o.text}</span>`));
  const news = [...out.newTitles.map((t) => `<span class="new">★ 称号「${t.name}」</span>`),
    ...out.newWings.map((k) => `<span class="new">新しい羽の色「${WING_COLORS[k].label}」</span>`)];
  const st3 = out.stars;
  $('rStars').innerHTML = `<div class="big">${st3.each.map((b) => (b ? '★' : '☆')).join('')}</div>`;
  const starRules = STAR_RULES.map((r, i) => `<span class="${st3.each[i] ? 'ok' : 'ng'}">${st3.each[i] ? '★' : '☆'} ${r.text}</span>`).join('　');
  if (out.newBest.time) news.push(`<span class="new">最速クリア！ ${mm(res.elapsed)}</span>`);
  if (out.newBest.shipped) news.push(`<span class="new">出荷の少なさ ベスト！</span>`);
  if (out.unlockedStage) news.unshift(`<span class="new">${STAGES[out.unlockedStage - 1].label}が遊べる！</span>`);
  const cur = DIFFS[res.diff];
  const nxt = cur ? STAGES[cur.no] : null;
  // 生き残った仲間を、次のステージへ連れて行く（8匹まで）
  const carryN = res.win && nxt && !res.easy ? Math.min(8, res.alive || 0) : 0;
  records.carry = carryN > 0 ? { to: nxt.key, n: carryN } : null;
  store.set('records', records);
  if (carryN > 0) news.unshift(`<span class="new">仲間 ${carryN}匹が次のステージへついてくる</span>`);
  $('btnNext').hidden = !(res.win && nxt);
  if (nxt) $('btnNext').textContent = `次へ ▶ ${nxt.label}`;
  // すぐやり直し：負けたら「もう一回」をいちばん大きく、勝ったら「次のステージへ」を先頭に
  const showNext = res.win && nxt;
  $('btnAgain').className = `btn ${showNext ? '' : 'primary big-again'}`;
  $('btnAgain').textContent = res.win ? 'もう一度' : 'もう一回！';
  // おたすけ
  const ab = $('btnAssist');
  const assistOn = !!(records.assist && records.assist[res.diff]);
  ab.hidden = !(out.offerAssist || assistOn);
  ab.textContent = assistOn ? 'おたすけをやめる' : 'おたすけを使う？（農場主がのんびりに）';
  ab.dataset.diff = res.diff;
  ab.dataset.on = assistOn ? '1' : '0';
  if (res.assist) news.push('<span class="was">（おたすけ中のプレイ）</span>');
  if (res.easy) news.unshift('<span class="was">かんたんモード（星・クリアには数えない）</span>');
  // いたずら
  const prs = res.pranks || [];
  const prDone = records.pranks[res.diff] || [];
  const prankLine = (`<b>いたずら</b>　${PRANKS.map((x) => `<span class="${prs.includes(x.id) ? 'ok' : 'ng'}">${prs.includes(x.id) ? '✓' : '・'}${x.text}${!prs.includes(x.id) && prDone.includes(x.id) ? '（前にやった）' : ''}</span>`).join('　')}`);
  if (prs.length) news.push(`<span class="new">いたずら ${prs.length}/${PRANKS.length}</span>`);
  if ((s.revenge || 0) > 0) news.push(`<span class="new">仕返し ${s.revenge}回！</span>`);
  for (const k of out.newPatterns || []) news.push(`<span class="new">新しい羽のもよう「${WING_PATTERNS[k].label}」</span>`);
  if (out.weekNow) news.push('<span class="new">週のチャレンジ達成！</span>');
  if ((s.stowaway || 0) > 0) news.push(`<span class="new">出荷ジャック ${s.stowaway}回！${records.stowaway === s.stowaway ? '　田んぼ道が遊べる！' : ''}</span>`);
  for (const k of out.newHats || []) news.push(`<span class="new">新しい帽子「${HATS[k].label}」</span>`);
  // 結果画面は短く：大事なお知らせだけ上に、ほかは「くわしく」の中へ
  // 上には2つまで。残りは「くわしく」へ
  $('rNews').innerHTML = news.slice(0, 2).join('<br>') + (news.length > 2 ? `<br><span class="was">ほか${news.length - 2}件</span>` : '');
  $('rNews').hidden = !news.length;
  const moreNews = news.slice(2);
  const wkr = out.week;
  const weekLine = wkr ? `<b>週のチャレンジ</b>　${WEEK_GOALS.map((gl) => `${gl.text.replace('合計', '')} ${Math.min(gl.need, wkr.prog[gl.id] || 0)}/${gl.need}`).join('　')}` : '';
  $('rOrders').innerHTML = `${moreNews.length ? moreNews.join('<br>') + '<br>' : ''}<b>星</b>　${starRules}<br><b>今日のお題</b>　${ol.join('　')}<br>${prankLine}${weekLine ? '<br>' + weekLine : ''}`;
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
  // 次の一言は1行だけ：作戦のヒント → まだ試していない技 の順
  $('rTip').textContent = res.advice ? `次は：${res.advice}` : tech ? `まだ試していない技：${tech.short || tech.text}` : '';
  $('rTip').hidden = !$('rTip').textContent;
  $('rTip').classList.toggle('advice', !!res.advice);
  setScreen('result');
}

// ---------- ヒント ----------
const hints = {
  list: [
    { id: 'move', kb: 'WASDで移動・ドラッグで見回す', tc: '左下で移動・右側で見回す', until: (g) => g.elapsed > 8 },
    { id: 'eat', kb: 'Space長押しで食べる。赤になる前に離す', tc: '「食べる」長押し。赤になる前に離す', when: (g) => !!(g.context() && g.context().crate), until: (_, ev) => ev.has('ruin') || ev.has('egg'), max: 9 },
    { id: 'climb', kb: 'ふちでSpace：登る', tc: 'ふちで「登る」', when: (g) => { const c = g.context(); return c && c.text === '登る'; }, until: (_, ev) => ev.has('climb'), max: 7 },
    { id: 'wind', kb: '渦でSpace：風に乗る', tc: '渦で「風に乗る」', when: (g) => { const c = g.context(); return c && c.text === '風に乗る'; }, until: (_, ev) => ev.has('wind'), max: 7 },
    { id: 'bait', kb: '黒い容器は毒エサ', tc: '黒い容器は毒エサ', when: (g) => { const c = g.context(); return c && c.bait; }, max: 6 },
    { id: 'smoke', kb: 'けむり！ 緑の輪へにげろ', tc: 'けむり！ 緑の輪へにげろ', when: (_, ev) => ev.has('fumigate'), max: 9 },
    { id: 'egg', kb: '栄養満タン！ Rで産卵', tc: '栄養満タン！「産卵」', when: (g) => g.nutrition >= 100, until: (_, ev) => ev.has('egg'), max: 9 },
    { id: 'cmd', kb: '仲間だ！ 1 ついてこい／2 まかせた', tc: '仲間だ！ 下のボタンで指示', when: (_, ev) => ev.has('hatch'), max: 7 },
    { id: 'hide', kb: '見つかった！ 葉や台の下へ', tc: '見つかった！ 葉や台の下へ', when: (_, ev) => ev.has('spotted'), max: 5 },
    { id: 'attack', kb: '足もとでF：顔に突撃', tc: '足もとで「突撃」', when: (g) => g.canAttackNow() && g.elapsed > 25, until: (_, ev) => ev.has('panic'), max: 5 },
  ],
  reset() { this.done = new Set(); this.cur = null; this.t = 0; this.events = new Set(); this.seenEvents = new Set(); this.idle = 0; this.lost = null; this.nudge(null); },
  // 今やると良いボタンをそっと光らせる
  nudge(sel) {
    document.querySelectorAll('.tbtn.nudge').forEach((b) => b.classList.remove('nudge'));
    if (sel) { const b = document.querySelector(sel); if (b) b.classList.add('nudge'); }
  },
  update(dt, g) {
    for (const e of g.events) this.seenEvents.add(e);
    const ev = this.seenEvents;
    const el = $('hint');
    if (!hintsOn || g.tutorial) { el.hidden = true; this.nudge(null); return; }
    // 迷ったときのヒント：10秒動かず何もしていないとき、今できることを1つだけ（隠れているときは出さない）
    const p = g.player;
    if (p) {
      // 操作していない（スティックも食べるボタンも）
      const mv = Math.hypot(input.mx || 0, input.mz || 0) + (input.actionHeld ? 1 : 0) + Math.abs(input.camDX || 0) * 0.01;
      const busy = mv > 0.05 || p.eatingCrate || p.eatingFruit || p.greed > 3 || p.st !== 'move' || p.stow || p.box || p.inGlove || p.playDead > 0;
      // 農場主が近い・あやしんでいる間に隠れているなら、じゃましない
      const F = g.farmer;
      const danger = F && (F.state !== 'WORK' || Math.hypot(F.x - p.x, F.z - p.z) < 12);
      const hiding = danger && (g.hideFactor(p) < 0.5 || F.state === 'CHASE' || F.state === 'FUMIGATE');
      this.idle = busy ? 0 : (this.idle || 0) + dt;
      if (this.lost) {
        if (busy || this.idle < 0.1 || this.t > 6) { this.lost = null; this.nudge(null); if (!this.cur) el.hidden = true; }
        else { this.t += dt; return; }
      }
      if (!this.cur && !hiding && this.idle > 10) {
        const touch = document.body.classList.contains('touch');
        let L;
        if (g.nutrition >= 100) L = { t: touch ? '「産卵」しよう' : 'Rで産卵しよう', b: '.t-egg' };
        else if (danger) L = { t: '葉や台の下にかくれよう', b: null };
        else L = { t: touch ? '箱へ行って「食べる」' : '箱へ行ってSpaceで食べる', b: '#tAction' };
        this.lost = L; this.t = 0; this.idle = 0;
        el.textContent = L.t; el.hidden = false;
        this.nudge(L.b);
        return;
      }
    }
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
  if (camState.ending && game.state === 'over') {
    // しょんぼりトラック：うなだれて、ゆっくり走り去る
    const E = camState.ending, T = world.truck;
    E.t += dt;
    const k = Math.max(0, E.t - 0.8);
    const dx = 0.35 * k * k;
    T.position.set(TRUCK.x + dx, 0, TRUCK.z);
    T.rotation.z = -0.05 - Math.sin(E.t * 1.3) * 0.015; // 前のめりにうなだれる
    T.rotation.x = Math.sin(E.t * 9) * 0.01 * Math.min(1, k);
    // 荷台の箱もいっしょに
    if (!E.crates) E.crates = game.crates.filter((c) => c.shipped && !c.rotten).map((c) => ({ c, x: c.model.group.position.x }));
    for (const it of E.crates) it.c.model.group.position.x = it.x + dx;
    // 生き残った仲間が、トラックの後ろをぞろぞろついて走る（8匹まで）
    if (!E.mates) E.mates = game.nymphs.slice(0, 8);
    E.mates.forEach((r, i) => {
      if (!r.model || !r.model.root) return;
      if (r.inGlove || r.box || r.stow) game.leaveHiding(r);
      const lag = 2.6 + i * 0.75 + Math.sin(E.t * 9 + i) * 0.08;
      r.x = TRUCK.x - lag + dx * 0.8; r.z = TRUCK.z + ((i % 3) - 1) * 0.55; r.y = 0; r.surface = -1;
      r.model.root.visible = true;
      r.model.root.position.set(r.x, 0, r.z);
      r.model.root.rotation.set(0, Math.PI / 2, 0); r.h = Math.PI / 2; r.moving = true;
    });
    // 走り出したところを「今日の1枚」に（吹き出しつき）
    if (!E.snapped && E.t > 1.9) { E.snapped = true; game.snapRequests.push({ type: 'truck', text: '空っぽのトラックが、しょんぼり出発', t: game.elapsed, bubble: 'もう限界だ…' }); }
    camera.position.set(TRUCK.x - 4 + dx * 0.4, 3.2, TRUCK.z + 8.5);
    camera.lookAt(TRUCK.x + dx, 1.2, TRUCK.z);
    return;
  }
  if (camState.intro) {
    // ハウスをぐるっと：高い所から全体を回って見せ、最後にゴキブリの所へ
    const I = camState.intro;
    I.t += dt;
    const k = Math.min(1, I.t / I.dur);
    const a = -0.9 + k * 1.5;
    camera.position.set(Math.sin(a) * 30, 20 - k * 3, Math.cos(a) * 26);
    camera.lookAt(2, 0, 0);
    if (k >= 1) endIntro();
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
  // 縦画面では左右が狭いので、少しだけ引く（カメラの動き方はそのまま）
  const portrait = window.innerHeight > window.innerWidth * 1.1;
  let pitch = camState.pitch, dist = 4.6 * Z * (portrait ? 1.22 : 1);
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
  box: 'かぶると見つかりにくい',
  glove: 'もぐると見つからない',
  bento: 'お弁当。かじるといたずら',
  trap: '仲間2匹で運んで、長靴をくっつける',
  drain: '別の排水溝から出られる',
  stow: 'もぐると、出荷先で虫入りに',
  stowIn: 'じっと待てば出荷される',
  sheet: 'さわるとくっつく',
  spider: '巣に近づくとクモが来る',
  boots: '農場主が来たら、おどろかせる',
  radio: '止めると農場主が直しに来る',
};
const firstSeen = store.get('firstSeen', []);
const firstT = {};
let niceShown = false;
function updateHud(dt) {
  const g = game;
  if (!g.player) return;
  const left = g.shipLeft();
  setText('timer', String(left));
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
  // 死んだふりボタンは死んだふりだけ（残りの回数を小さく）
  setText('tDeadN', String(pd ? pd.deadUses || 0 : 0));
  // ナイス！
  if (g.niceT > 0.85 && !niceShown) {
    const el = $('nicePop');
    const nc = g.niceCombo || 0;
    el.textContent = nc >= 3 ? `${nc}連続！` : 'ナイス！';
    el.classList.toggle('combo', nc >= 3);
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
  // たたんでいる間も、怒りの色だけは枠のふちで見せる
  const ak = f.state === 'CHASE' ? 'chase' : String(f.anger || 0);
  if (trPanel.dataset.anger !== ak) trPanel.dataset.anger = ak;
  const p = g.player;
  setW($('hpBar').firstElementChild, p.hp / p.maxHp);
  setW($('nutBar').firstElementChild, g.nutrition / 100);
  $('nutBar').classList.toggle('full', g.nutrition >= 100);
  setText('allies', String(g.nymphs.length));
  const eggs = g.eggs.filter((e) => e.alive).length;
  setText('eggsTxt', eggs ? `　卵 ${eggs}` : '');
  document.querySelector('.cmds').classList.toggle('none', g.nymphs.length === 0 && !g.tutorial);

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
  const label = ctx ? (ctx.urgent ? '連打！' : ctx.text.replace('長押しで', '').replace('台に', '').replace(/（.*）/, '')) : '食べる';
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
    setText('crateLeft', c ? `残り ${Math.max(0, Math.ceil(c.hp))}%` : '');
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
function place(el, s) { el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) translate(-50%, -100%)`; return el; }

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
      // 鼻歌・ぶつぶつは、音を消していても分かるように頭の上に印
      if (!mk && !close && !(f.speechT > 0)) {
        const md = farmerMood(f);
        if (md === 'hum') mk = label('mark note', '♪');
        else if (md === 'grumble') mk = label('mark grr', 'ぶつぶつ');
      }
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
    // 「もぐる」の箱の印：農場主が取りに来る箱を、近くにいるときだけ光らせる（1つだけ）
    {
      const F = g.farmer, c = F && F.crate;
      if (c && (F.phase === 'toCrate' || F.phase === 'pack') && !c.rotten && !c.carried && !c.shipped && !p.stow && Math.hypot(c.x - p.x, c.z - p.z) < 7) {
        const sc = project(c.x, c.baseY + 1.7, c.z);
        if (sc && sc.on) place(label('stow-mark', '<i></i>'), sc);
      }
    }
    // 卵がかえるまでの輪（いっぱいになると生まれる）
    for (const e of g.eggs) {
      if (!e.alive || Math.hypot(e.x - p.x, e.z - p.z) > 10) continue;
      const se = project(e.x, (e.y || 0) + 0.45, e.z);
      if (!se || !se.on) continue;
      const k = Math.min(1, e.t / g.diff.hatch);
      const el = place(label('egg-ring', '<i></i>'), se);
      const v = (Math.round(k * 50) / 50).toFixed(2);
      if (el && el._k !== v) { el._k = v; el.style.setProperty('--k', v); }
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
    el.className = `ripple ${pg.kind === 'bell' ? 'bell' : pg.kind === 'step' ? (pg.hard ? 'hard' : 'soil') : ''}`;
    if (pg.kind === 'bell') el.dataset.t = 'チリン';
    else if (pg.kind === 'step') el.dataset.t = pg.hard ? 'コツ' : 'ザッ';
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
// 右上の札（農場主＋地図）：ふだんはたたむ。押すと開く。たたんでいる間は地図を描かない
const trPanel = $('trPanel');
let mapOpen = !!store.get('mapOpen', false);
function applyMapOpen() { trPanel.classList.toggle('folded', !mapOpen); }
applyMapOpen();
trPanel.addEventListener('click', (e) => { e.preventDefault(); mapOpen = !mapOpen; store.set('mapOpen', mapOpen); applyMapOpen(); sfx.click(); });
function drawMinimap(dt) {
  if (!mapOpen && !touring) return;
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
// 省エネ：スマホが熱くならないよう、1秒に描く回数に上限をつける（遊んでいる間30、止まっている画面はもっと少なく）
let ecoOn = store.get('eco', isTouchDevice);
function ecoOnNow() { return ecoOn; }
let ecoFrame = 0;
function targetFps() {
  if (screen === 'play' || screen === 'run' || screen === 'over' || screen === 'runover') return ecoOn ? 30 : 60;
  if (screen === 'title' || screen === 'book') return ecoOn ? 20 : 60;
  return ecoOn ? 8 : 30; // 一時停止・結果画面
}
function applyEco() {
  fx.maxDpr = ecoOn ? 1.1 : 9;
  // 省エネ：画面全体にかける「光のにじみ」と「色の仕上げ」を切る（いちばん重い所）
  if (fx.eco !== ecoOn) { fx.eco = ecoOn; const lv = fx.level; fx.level = null; fx.setLevel(lv); }
  fx.setDprScale(fx.dprScale);
  if (ecoOn) world.setShadow(Math.min(LEVELS[fx.level].shadow, 1024)); else world.setShadow(LEVELS[fx.level].shadow);
}
$('optEco').checked = ecoOn;
$('optEco').addEventListener('change', (e) => { ecoOn = e.target.checked; store.set('eco', ecoOn); applyEco(); });
applyEco();
function frame(now) {
  requestAnimationFrame(frame);
  // 上限より早いときは、この回は何もしない（少しの誤差は許す）
  if (now - last < 1000 / targetFps() - 3) return;
  let dt = (now - last) / 1000;
  const rawDt = dt;
  last = now;
  if (!(dt > 0)) dt = 0.016;
  dt = Math.min(dt, 0.05);
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 1) { window.__rh.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  try {
    input.poll();
    if (demo && screen === 'play') demoStep(Math.min(0.05, (now - last) / 1000));
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
      game.update(screen === 'play' && !camState.intro && !jackOfferOn ? dt : (game.state === 'over' ? dt : 0), input);
      if (game.mode !== prevMode) updateCmdButtons();
      if (screen === 'play') {
        hints.update(dt, game);
        // 出荷ジャックの気づき：農場主が箱を運ぶのを初めて見たときだけ
        if (game.events.includes('carrystart') && !firstSeen.includes('stowHint') && !game.tutorial && game.farmer && game.player &&
            Math.hypot(game.farmer.x - game.player.x, game.farmer.z - game.player.z) < 16) {
          firstSeen.push('stowHint'); store.set('firstSeen', firstSeen);
          ui.toast('あの箱にもぐれたら…？', 'warn');
        }
        if (game.events.includes('stowaway') && !game.tutorial && game.state === 'play') offerJack();
        if (game.events.includes('heater')) {
          if (!firstSeen.includes('heater')) { firstSeen.push('heater'); store.set('firstSeen', firstSeen); ui.toast('暖房の音で、足音が聞こえにくい！', 'info'); }
          else ui.feed('ゴーッ（暖房）', '暖', 'info');
          $('heatBadge').hidden = false;
        }
        if ($('heatBadge').hidden === false && !game.heaterOn) $('heatBadge').hidden = true;
        // 技をはじめて使ったら「技をおぼえた！」（図鑑の技の一覧に★）
        if (!game.tutorial) {
          const TECH_EV = { panic: 'attack', wind: 'wind', playdead: 'playdead', box: 'box', drain: 'drain', stowaway: 'stow', revenge: 'revenge' };
          for (const ev of game.events) {
            const id = TECH_EV[ev];
            if (!id) continue;
            records.used = records.used || {};
            if (records.used[id]) continue;
            records.used[id] = true;
            store.set('records', records);
            const T = FEATURES.TECHS.find((x) => x.id === id);
            ui.feed(`技をおぼえた！ ${T ? T.name : ''}`, '技', 'good');
            sfx.chime && sfx.chime();
          }
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
    if (screen === 'play' && game.farmer && game.player && !camState.intro) {
      const f = game.farmer, p = game.player;
      // ステージ3からはラジオを作業場の床に置いている（音はそこから）
      const R = game.radioObj;
      const rx = R ? R.x : f.x, rz = R ? R.z : f.z;
      const d = Math.hypot(rx - p.x, rz - p.z);
      const vol = (R && !R.on ? 0 : 1) * (!R && f.hidden ? 0.15 : 1) / (1 + Math.pow(d / 7, 2));
      sfx.updateRadio(vol, game.panOf(rx, rz));
      // 農場主の鼻歌（機嫌がいい）・ぶつぶつ（怒っている）。あやしんでいる間は止まる
      humT -= dt;
      const mood = farmerMood(f);
      if (humT <= 0 && !jackOfferOn) {
        const dv = Math.max(0, 1 - Math.hypot(f.x - p.x, f.z - p.z) / 22);
        if (mood === 'hum') { sfx.hum(dv * 0.9, game.panOf(f.x, f.z)); humT = 0.32; }
        else if (mood === 'grumble') { sfx.grumble(dv * 0.9, game.panOf(f.x, f.z)); humT = 0.18 + Math.random() * 0.25; }
        else humT = 0.3;
      }
    } else sfx.updateRadio(0, 0);
    // 省エネ：影は2回に1回だけ描きなおす
    ecoFrame++;
    renderer.shadowMap.autoUpdate = !ecoOn;
    if (ecoOn && ecoFrame % 3 === 0) renderer.shadowMap.needsUpdate = true; // 影の描きなおしは3回に1回
    fx.render(dt, focusD, tNow);
    // 名場面の写真（描いた直後に小さく撮る）
    if (game.snapRequests && game.snapRequests.length) {
      for (const req of game.snapRequests.splice(0)) {
        const img = snapCanvas(req.bubble);
        const i = game.highlights.findIndex((h) => h.type === req.type);
        const h = { ...req, img };
        if (i >= 0) game.highlights[i] = h; else if (game.highlights.length < 4 || h.type === 'truck') game.highlights.push(h);
      }
    }
    autoQ.sample(dt, screen === 'play', targetFps());
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
function snapCanvas(bubble) {
  try {
    const x = snapC.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const sh = Math.min(H, W * 200 / 320), sw = sh * 320 / 200;
    x.drawImage(canvas, (W - sw) / 2, (H - sh) / 2, sw, sh, 0, 0, 320, 200);
    if (bubble) {
      // 写真の端に、農場主の吹き出し
      x.font = 'bold 15px "Zen Maru Gothic", sans-serif';
      const tw = x.measureText(bubble).width;
      const bx = 320 - tw - 26, by = 12, bw = tw + 16, bh = 28;
      x.fillStyle = '#fffaf0'; x.strokeStyle = '#2a1c12'; x.lineWidth = 2;
      x.beginPath(); x.roundRect ? x.roundRect(bx, by, bw, bh, 10) : x.rect(bx, by, bw, bh); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(bx + 18, by + bh); x.lineTo(bx + 10, by + bh + 10); x.lineTo(bx + 30, by + bh); x.closePath(); x.fill();
      x.fillStyle = '#2a1c12'; x.textBaseline = 'middle'; x.fillText(bubble, bx + 8, by + bh / 2 + 1);
    }
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
// テストからは、ぐるっと見せる場面なしで始める（intro: true で出す）
window.__rh.startGame = (d, o = {}) => startGame(d, { noIntro: !o.intro });
window.__rh.startTour = startTour;
window.__rh.startRun = startRun;
window.__rh.runner = runner;
window.__rh.hints = hints;
Object.assign(window.__rh, { stages: STAGES, plantFruits: PLANT_FRUITS, rows: ROWS, windLanes: WIND_LANES, safeSpots: SAFE_SPOTS, features: FEATURES });
window.__rh.MAX_NYMPHS = MAX_NYMPHS;
window.__rh.DOOR = DOOR;
