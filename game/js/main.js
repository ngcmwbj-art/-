// がんばれマサトくん！ ― メインループと進行管理
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { buildWorld, heightAt, groundAt, coastX, BOUNDS } from './world.js';
import { Weather } from './weather.js';
import { Cabbages } from './cabbages.js';
import { Player } from './player.js';
import { Threats } from './threats.js';
import { Towers, TOWER_TYPES } from './towers.js';
import { FX } from './fx.js';
import { GameAudio } from './audio.js';
import { HUD } from './hud.js';
import { clamp, rand } from './util.js';
import { IS_TOUCH, setupTouch, updateTouch } from './touch.js';
import { toonify, addOutline } from './toon.js';
import { MEMOS, BLESSINGS } from './quantum.js';
import { saveGame, loadSave, clearSave, loadRecords, saveRecords } from './save.js';
import { Cows } from './cows.js';
import { CARDS, drawCards } from './cards.js';
import { loadSettings, saveSettings, bindSettingsPanel } from './settings.js';

const QUALITY = {
  low: { low: true, fps: 30, cabNear: 12, cabMid: 35, pr: 1, shadow: 0, grass: 6000, trees: 0.5, rain: 3000, bloom: false, msaa: 0 },
  mid: { fps: 60, cabNear: 35, cabMid: 110, pr: 1, shadow: 1024, grass: 18000, trees: 0.8, rain: 6000, bloom: true, msaa: 0 },
  high: { fps: 60, cabNear: 45, cabMid: 140, pr: Math.min(devicePixelRatio, 1.5), shadow: 2048, grass: 45000, trees: 1, rain: 10000, bloom: true, msaa: 4 },
  ultra: { cabNear: 70, cabMid: 180, pr: Math.min(devicePixelRatio, 2), shadow: 4096, grass: 90000, trees: 1.3, rain: 16000, bloom: true, msaa: 4 },
};

const WAVES = [
  // trait：台風ごとの個性（形は同じ。速さ・分身の数・雷の多さだけを変える）
  { name: '台風1号', cls: '強い台風', peak: 0.6, groups: 2, debris: 3.6, strike: 6.5, wind: 33, trait: 'ふつうの台風' },
  { name: '台風2号', cls: '非常に強い台風', peak: 0.72, groups: 3, debris: 3.0, strike: 5.2, wind: 44, trait: '足が速い。イノシシも出る', bossSpeed: 1.4 },
  { name: '台風3号', cls: '非常に強い台風', peak: 0.82, groups: 4, debris: 2.4, strike: 4.2, wind: 50, trait: '分身が多い。体力が半分になると反対側へ回り込む', ghosts: 2, phase2: true },
  { name: '台風4号', cls: '猛烈な台風', peak: 0.92, groups: 5, debris: 1.9, strike: 3.4, wind: 58, trait: '雷がとても多い。イノシシも出る', strikeMul: 0.55 },
  { name: '台風5号「量子嵐」', cls: '観測史上最大', peak: 1.0, groups: 6, debris: 1.5, strike: 2.6, wind: 72, trait: '速い・分身が多い・雷も多い・回り込む', bossSpeed: 1.25, ghosts: 2, strikeMul: 0.7, phase2: true },
];

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uStorm: { value: 0 }, uFlash: { value: 0 },
    uVig: { value: 0.9 }, uCA: { value: 0.002 }, uSolo: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uStorm, uFlash, uVig, uCA, uSolo; varying vec2 vUv;
    void main(){
      vec2 d = vUv - .5; float r = dot(d,d);
      float ca = uCA*(.4 + r*3.) + uSolo*.004;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + d*ca).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - d*ca).b;
      float l = dot(col, vec3(.299,.587,.114));
      col = mix(col, mix(vec3(l), col, .72)*vec3(.93,1.,1.07), uStorm*.65);
      col = mix(col, col*vec3(1.04,1.,.94), (1.-uStorm)*.5);
      // 晴れの日は彩度を少し上げて絵本のような色に
      float l2 = dot(col, vec3(.299,.587,.114));
      col = mix(vec3(l2), col, 1. + (1.-uStorm)*.22);
      col = (col - .5)*(1.04 + uStorm*.12) + .5;
      col += uFlash*vec3(.75,.8,1.)*.6;
      col = mix(col, col*vec3(1.12,.9,1.25) + vec3(.03,0.,.07), uSolo*.55);
      col *= 1. - r*uVig*(1. + uStorm*.5);
      float g = fract(sin(dot(vUv*(uTime+1.), vec2(12.9898,78.233)))*43758.5453);
      col += (g - .5)*.012;
      gl_FragColor = vec4(clamp(col,0.,1.), 1.);
    }`,
};

class Game {
  constructor(qualityKey) {
    const Q = this.Q = QUALITY[qualityKey] || QUALITY.high;
    const canvas = document.getElementById('game');
    const renderer = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !Q.bloom, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Q.pr);
    renderer.setSize(innerWidth, innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = Q.shadow > 0;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 5000);
    this.windU = { uTime: { value: 0 }, uWind: { value: 0 }, uWindDir: { value: new THREE.Vector2(-0.8, -0.6) } };

    this.audio = new GameAudio();
    this.hud = new HUD();
    this.weather = new Weather(this.scene, renderer, Q);
    this.windU.uWindDir.value = this.weather.windDir;
    this.world = buildWorld(this.scene, Q, this.windU);
    this.cabbages = new Cabbages(this.scene, Q);
    this.fx = new FX(this.scene);
    this.player = new Player(this.scene, this.camera);
    this.towers = new Towers(this);
    this.threats = new Threats(this);
    this.threats.towers = this.towers;
    this.cabbages.onLost = () => {
      this.audio.lost();
      // キャベツがやられたら画面の端を赤く。まとめてやられたらマサトが叫ぶ
      this.hud.hurt();
      this.lostRecent = (this.lostRecent || []).filter((t) => this.time - t < 3);
      this.lostRecent.push(this.time);
      if (this.lostRecent.length >= 25) this.say('やべえ、畑が！');
    };
    // BotW 風のトゥーン表現に置き換え、マサトに輪郭線
    addOutline(this.player.model.root);
    toonify(this.scene);
    this.cows = new Cows(this);

    // ポストプロセス
    const rt = new THREE.WebGLRenderTarget(innerWidth * Q.pr, innerHeight * Q.pr, { type: THREE.HalfFloatType, samples: Q.msaa });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.setPixelRatio(Q.pr);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (Q.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.35, 0.7, 0.82);
      this.composer.addPass(this.bloom);
    }
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);

    // 状態
    this.q = 150;
    this.solo = 0;
    this.soloT = 0;
    this.wave = 0;
    this.phase = 'title';
    this.phaseT = 0;
    this.buildSel = null;
    this.cd = { teleport: 0, observe: 0, chord: 0, kekkai: 0 };
    this.spots = [];
    this.memoSeen = new Set(); this.blessing = null; this.prayT = 0; this.prayed = false;
    this.cowLog = { storms: 0, allHome: 0, outageFail: 0 };
    this.cards = new Set(); this.hitstop = 0; this.killStreak = 0; this.lastKillAt = -9;
    this.settings = loadSettings();
    this.lastBeat = -1;
    this.score = { just: 0, chords: 0 };
    this.combo = 0; this.maxCombo = 0; this.lastJustBeat = -99; this.fovKick = 0;
    this.mission = null; this.missionIdx = -1;
    this.spawn = { groups: 0, debris: 0, strike: 0, nextGroup: 0 };
    this.input = { f: false, b: false, l: false, r: false, sprint: false, jump: false, ax: 0, az: 0 };
    this.time = 0;
    this.tutorialStep = 0;
    this.paused = true;

    this.bindInput();
    bindSettingsPanel(this);
    this.hud.onOpenMap = () => this.toggleMap(true);
    this.hud.audio = this.audio;
    addEventListener('resize', () => this.resize());
    this.clock = new THREE.Clock();
    renderer.setAnimationLoop(() => this.frame());
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setSize(innerWidth, innerHeight);
  }

  // ---------- 入力 ----------
  bindInput() {
    const canvas = this.renderer.domElement;
    const keymap = { KeyW: 'f', KeyS: 'b', KeyA: 'l', KeyD: 'r', ArrowUp: 'f', ArrowDown: 'b', ArrowLeft: 'l', ArrowRight: 'r', ShiftLeft: 'sprint', ShiftRight: 'sprint' };
    addEventListener('keydown', (e) => {
      if (keymap[e.code]) this.input[keymap[e.code]] = true;
      if (this.paused) return;
      switch (e.code) {
        case 'Space': this.input.jump = true; e.preventDefault(); break;
        case 'KeyR': this.doTeleport(); break;
        case 'KeyF': this.doObserve(); break;
        case 'KeyQ': this.doSolo(); break;
        case 'KeyG': this.doKekkai(); break;
        case 'KeyE': this.doBuild(); break;
        case 'KeyX': this.buildSel = null; this.towers.hidePreview(); break;
        case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': {
          this.selectTower(TOWER_TYPES[+e.code.slice(-1) - 1].id);
          break;
        }
        case 'Enter': this.skipPrep(); break;
        case 'Tab': e.preventDefault(); this.toggleMap(); break;
        case 'KeyO': this.toggleSettings(!this.settingsOpen); break;
        case 'KeyH': document.getElementById('help').classList.toggle('show'); break;
        case 'KeyM': this.settings.bgm = !this.settings.bgm; saveSettings(this.settings); this.settingsSync?.(); this.applyAudio(); this.hud.toast(this.settings.bgm ? 'BGM オン' : 'BGM オフ'); break;
      }
    });
    addEventListener('keyup', (e) => { if (keymap[e.code]) this.input[keymap[e.code]] = false; });
    addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === canvas) this.player.look(e.movementX, e.movementY);
    });
    canvas.addEventListener('mousedown', (e) => {
      if (document.pointerLockElement !== canvas) { this.lockPointer(); return; }
      if (e.button === 0) { if (!this.pickHarvest(innerWidth / 2, innerHeight / 2)) this.doChord(); }
      if (e.button === 2) this.doObserve();
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === canvas;
      if (!locked && this.phase !== 'title' && this.phase !== 'result' && this.phase !== 'gameover') this.setPaused(true);
    });
    document.getElementById('resume').addEventListener('click', () => this.lockPointer());
  }

  lockPointer() {
    if (IS_TOUCH) { this.setPaused(false); return; }
    const c = this.renderer.domElement;
    const p = c.requestPointerLock && c.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
    this.setPaused(false);
  }

  setPaused(v) {
    if (this.phase === 'title') return;
    this.paused = v;
    document.getElementById('pause').classList.toggle('show', v && this.phase !== 'result' && this.phase !== 'gameover');
  }

  // opts.resume：保存データから再開 ／ opts.wave：台風を選んで始める（0 始まり）
  start(opts = {}) {
    this.audio.init();
    this.applyAudio();
    document.getElementById('title').classList.add('hide');
    document.getElementById('hud').classList.add('show');
    this.phase = 'prep';
    this.phaseT = 0;
    this.paused = false;
    this.makePlan();
    if (IS_TOUCH) {
      setupTouch(this);
      // 全画面にできる端末では全画面に（できなくても続行）
      try { const p = document.documentElement.requestFullscreen?.(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* 非対応 */ }
    }
    this.lockPointer();
    const r = opts.resume;
    if (r) {
      // つづきから：台風の番号・Qビット・キャベツ・タワーを戻す
      this.wave = r.wave; this.q = r.q; this.solo = r.solo || 0;
      this.score.chords = r.chords || 0;
      Object.assign(this.threats.stats, r.stats || {});
      (r.memo || []).forEach((k) => this.memoSeen.add(k));
      (r.cards || []).forEach((k) => this.cards.add(k));
      if (r.cowLog) this.cowLog = r.cowLog;
      this.harvestYen = r.harvestYen || 0;
      this.cabbages.restore(r.cab);
      this.cabbages.setGrowth(this.wave);
      for (const t of r.towers || []) { const tw = this.towers.build(t.id, new THREE.Vector3(t.x, t.y, t.z)); tw.age = 5; }
      this.makePlan();
      // 前回までのあらすじ（3 行）
      const cardNames = [...this.cards].map((id) => CARDS.find((c) => c.id === id)?.name).filter(Boolean);
      this.hud.banner('前回までのあらすじ', [
        `${this.waveName()}の準備タイムから再開（全 ${WAVES.length} 台風）`,
        `キャベツ ${this.cabbages.alive.toLocaleString()} / ${this.cabbages.total.toLocaleString()} 玉・タワー ${this.towers.list.length} 基`,
        cardNames.length ? `量子カード：${cardNames.join('・')}` : '量子カード：まだなし',
      ].join('<br>'), 6000);
    } else if (opts.wave > 0) {
      // 台風を選んで始める：途中の台風から（そのぶん Qビットを多めに）
      this.wave = Math.min(WAVES.length - 1, opts.wave);
      this.q = 150 + this.wave * 150;
      this.cabbages.setGrowth(this.wave);
      this.makePlan();
      this.hud.banner(`${this.waveName()}から開始`, `Qビット ${this.q} でスタート。タワーを建てて備えよう`);
    } else {
      clearSave();
      this.startTutorial();
    }
    this.cows.reset(this.wave > 0);
    this.applyUnlocks();
    if (this.wave > 0) { setTimeout(() => this.showNews(), 2500); this.evTimer = setTimeout(() => this.prepEvent(), 9000); }
  }

  // ---------- アクション ----------
  addQ(n, pos) {
    this.q += n;
    if (pos) this.hud.floater(`+${n}Q`, pos, this.camera);
    this.audio.qGain();
  }
  addSolo(n) {
    const before = this.solo;
    this.solo = Math.min(100, this.solo + n * (this.cards.has('solo') ? 1.5 : 1));
    if (before < 100 && this.solo >= 100) this.hud.toast('量子ギターソロ 準備完了！［Q］', 'good');
  }

  doChord() {
    if (this.cd.chord > 0 || this.phase === 'result' || this.phase === 'gameover') return;
    this.cd.chord = 0.22;
    const b0 = this.threats.boss;
    this.audio.chord(true, !!(b0 && b0.vulnUntil > this.time));
    this.score.chords++;
    // 続けて弾くほどアクションが派手に（8 連続ごとにギターを掲げる）
    this.streak = this.time - (this.lastStrumAt || -9) < 1.4 ? (this.streak || 0) + 1 : 1;
    this.lastStrumAt = this.time;
    const kind = this.streak % 8 === 0 ? 'raise' : this.streak % 2 ? 'windmill' : 'jump';
    this.player.model.strum(kind);
    const p = this.player.pos.clone();
    let f = this.player.forward();
    const reach = 16 * (this.cards.has('reach') ? 1.4 : 1);
    // 照準アシスト：前方（やさしいモードは全方向）の一番近い敵へ体ごと向けて撃つ
    if (this.settings.aim) {
      const tgt = this.aimTarget(p, f, reach + 6);
      if (tgt) {
        f = new THREE.Vector3(tgt.pos.x - p.x, 0, tgt.pos.z - p.z).normalize();
        this.player.facing = Math.atan2(f.x, f.z);
      }
    }
    const dmg = 34 * (this.blessing === 'hado' ? 1.3 : 1) * (this.cards.has('loud') ? 1.3 : 1) * (this.diff() === 0 ? 1.25 : 1);
    const res = this.threats.blast(p, reach, dmg, { cone: new THREE.Vector2(f.x, f.z), inner: 9, push: 4, from: p });
    const gpos = p.clone().add(new THREE.Vector3(0, 1.3, 0));
    this.fx.ring(p, '#ffd36a', reach, 0.45, 0.7);
    this.fx.soundWave(p, f, '#ffd36a', reach, 3);
    this.fx.notes(gpos, 4, undefined, 1.1, f);
    this.fovKick = kind === 'raise' ? 0.9 : 0.35;
    this.player.shake = Math.max(this.player.shake, kind === 'raise' ? 0.45 : 0.2);
    this.addSolo(res.hits ? 7 : 2);
    this.cabbages.heal(p.x, p.z, 10, 4);
    this.threats.tryReflect(p);
    if (kind === 'raise') {
      this.fx.beam(p, '#ffd36a', 30, 1.6, 0.8, 0.6);
      this.fx.notes(gpos.clone().add(new THREE.Vector3(0, 1, 0)), 10, undefined, 1.8);
    }
    this.mission?.onStrum?.();
    if (res.unobserved && !res.hits) this.hud.toast('紫の竜巻（幻かも）には効かない！［F］観測で正体を暴こう', 'bad');
  }

  // 台風の強さ：0 やさしい／1 ふつう／2 強い／3 猛烈
  diff() { return this.settings.diff ?? 1; }
  diffMul() { return [{ dmg: 0.6, hp: 1, pay: 1 }, { dmg: 1, hp: 1, pay: 1 }, { dmg: 1.3, hp: 1.3, pay: 1.2 }, { dmg: 1.6, hp: 1.7, pay: 1.5 }][this.diff()]; }

  aimTarget(p, f, range) {
    const cosLim = this.diff() === 0 ? -1 : Math.cos(1.2);
    let best = null, bd = range * range;
    const consider = (e) => {
      const dx = e.pos.x - p.x, dz = e.pos.z - p.z, d2 = dx * dx + dz * dz;
      if (d2 > bd || d2 < 0.01) return;
      if ((dx * f.x + dz * f.z) / Math.sqrt(d2) < cosLim) return;
      bd = d2; best = e;
    };
    for (const m of this.threats.minions) if (m.alive) consider(m);
    for (const t of this.threats.tornados) if (t.alive && t.group.collapsed && !t.group.practice) consider(t);
    return best;
  }

  doObserve() {
    if (this.cd.observe > 0) { this.audio.denied(); return; }
    if (this.q < 8) { this.audio.denied(); this.hud.toast('Qビットが足りない（観測には 8Q）', 'bad'); return; }
    this.q -= 8;
    this.cd.observe = 4;
    const p = this.player.pos.clone().add(new THREE.Vector3(0, 1.5, 0));
    this.fx.sphere(p, '#b48cff', 48, 1.0);
    this.audio.observe();
    const n = this.threats.measure(p, 48, 'observe');
    if (this.cards.has('thunder')) {
      // 観測の雷：正体の見えた敵に雷
      let k = 0;
      for (const e of [...this.threats.minions, ...this.threats.tornados]) {
        if (!e.alive || (e.group && !e.group.collapsed) || k >= 6) continue;
        if (Math.hypot(e.pos.x - p.x, e.pos.z - p.z) > 48) continue;
        k++;
        this.fx.beam(e.pos, '#ffe66a', 40, 0.6, 0.35, 1.5);
        this.threats.hitEnemy(e, 40);
      }
      if (k) { this.weather.flash = Math.max(this.weather.flash || 0, 0.5); this.audio.thunder(0.1, 0.4); }
    }
    if (!n) this.hud.toast('観測範囲（48m）に重ね合わせ状態の竜巻はなかった');
  }

  doTeleport() {
    if (this.wave === 0) return; // 最初の台風では使わない（覚えることを減らす）
    if (this.cd.teleport > 0) { this.audio.denied(); return; }
    const from = this.player.teleport(24);
    if (!from) return;
    this.cd.teleport = this.blessing === 'en' ? 1.5 : 3;
    this.memo('tunnel');
    this.fx.beam(from, '#6fe3ff', 6, 1.2, 0.5);
    this.fx.burst(from.clone().add(new THREE.Vector3(0, 1, 0)), '#6fe3ff', 40, 6, 0.6, 0.25, 0);
    this.fx.beam(this.player.pos, '#6fe3ff', 6, 1.2, 0.6);
    this.audio.teleport();
    if (this.cards.has('warpwave')) { this.threats.blast(this.player.pos.clone(), 9, 30, { push: 5, from: this.player.pos.clone() }); this.fx.ring(this.player.pos, '#6fe3ff', 9, 0.5, 0.8); }
  }

  // 結界（不確定性原理）：周りの敵の位置を縛る。ほどけた瞬間、どこへ飛ぶかわからない
  doKekkai() {
    if (this.wave === 0) return; // 最初の台風では使わない（覚えることを減らす）
    if (this.phase === 'result' || this.phase === 'gameover') return;
    if (this.cd.kekkai > 0) { this.audio.denied(); return; }
    if (this.q < 20) { this.audio.denied(); this.hud.toast('Qビットが足りない（結界には 20Q）', 'bad'); return; }
    this.q -= 20;
    this.cd.kekkai = this.blessing === 'en' ? 6 : 12;
    const p = this.player.pos.clone();
    const strong = this.cards.has('bind');
    const n = this.threats.bind(p, strong ? 24 : 18, strong ? 4 : 2.5);
    this.fx.ring(p, '#ffe9a8', 18, 0.9, 1.4);
    this.fx.ring(p, '#ffffff', 14, 0.6, 1.0);
    this.fx.beam(p, '#ffe9a8', 10, 18, 0.6, 0.15);
    this.player.model.strum('raise');
    this.audio.observe();
    this.player.shake = 0.3;
    this.hud.toast(n ? `結界！ ${n} 体の位置を縛った ― 解けると不確定な方向へ飛ぶ` : '結界を張った（範囲 18m に敵はいなかった）', n ? 'q' : '');
    this.memo('uncertainty');
  }

  // 量子メモ：初めて起きた量子現象を、本当の物理とゲームでの扱いで説明する
  memo(key) {
    if (this.memoSeen.has(key) || !MEMOS[key] || this.phase === 'title') return;
    this.memoSeen.add(key);
    this.hud.memo(MEMOS[key]);
  }

  // 量子の祠：準備タイムに手を合わせると、次の台風のあいだ御利益が宿る
  updateShrine(dt) {
    const sh = this.world.shrine;
    if (!sh) return;
    const ud = sh.userData;
    ud.orb.material.emissiveIntensity = 1.6 + Math.sin(this.time * 2) * 0.6;
    ud.ring.material.opacity = this.phase === 'prep' && !this.prayed ? 0.45 + Math.sin(this.time * 3) * 0.25 : 0.12;
    if (this.phase !== 'prep' || this.mission || this.prayed || this.paused || this.wave === 0) { this.prayT = 0; return; }
    const pp = ud.prayWorld;
    const d = Math.hypot(this.player.pos.x - pp.x, this.player.pos.z - pp.z);
    if (d > 3.2) { this.prayT = 0; return; }
    if (this.prayT === 0) this.hud.toast('祠の前で手を合わせている…（そのまま 2 秒）', 'q');
    this.prayT += dt;
    if (this.prayT < 2) return;
    this.prayed = true;
    const b = BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)];
    this.blessing = b.id;
    this.blessingName = b.name;
    this.fx.beam(pp, '#c9b8ff', 60, 3, 1.6, 0.3);
    this.fx.sphere(pp.clone().add(new THREE.Vector3(0, 1.5, 0)), '#c9b8ff', 14, 1.2);
    this.fx.burst(pp.clone().add(new THREE.Vector3(0, 2, 0)), '#ffe9a8', 60, 8, 1.2, 0.3, 3);
    this.audio.fanfare();
    this.say('お願いします…！ キャベツを守らせてください', true);
    this.hud.banner(`御利益「${b.name}」`, `${b.text}（次の台風のあいだ）`);
    this.memo('shrine');
  }

  // 台風一過：シュレディンガーの箱を開ける
  openBoxes() {
    const boxes = this.towers.list.filter((t) => t.id === 'box');
    if (!boxes.length) return;
    let gold = 0;
    for (const b of boxes) {
      const p = b.pos.clone().add(new THREE.Vector3(0, 1.5, 0));
      if (Math.random() < 0.5) {
        gold++;
        this.fx.burst(p, '#ffd36a', 50, 10, 1.2, 0.35, 4);
        this.fx.beam(b.pos, '#ffd36a', 30, 2, 1.2);
        this.hud.floater('黄金キャベツ +120Q', p, this.camera, '#ffd36a');
      } else {
        this.fx.burst(p, '#8a8a99', 20, 5, 0.8, 0.3, 1);
        this.hud.floater('からっぽ…', p, this.camera, '#b0b0c0');
      }
      this.towers.remove(b);
    }
    if (gold) this.addQ(gold * 120);
    this.hud.toast(`シュレディンガーの箱を開けた：${boxes.length} 箱中 ${gold} 箱が黄金キャベツ`, gold ? 'good' : '');
    this.memo('schrodinger');
  }

  doSolo() {
    if (this.wave === 0) return; // 最初の台風では使わない（覚えることを減らす）
    if (this.solo < 100 || this.soloT > 0) return;
    this.solo = 0;
    this.soloT = 4.5;
    this.player.soloOn = true;
    this.threats.slow = true;
    this.hud.toast('量子ギターソロ！！ 時間がゆがむ…', 'good');
    const p = this.player.pos.clone();
    this.fx.beam(p, '#ffd36a', 120, 2.2, 4.5, 0.35);
    this.fx.sphere(p.clone().add(new THREE.Vector3(0, 2, 0)), '#ffd36a', 90, 1.1);
    this.threats.measure(p, 90, 'solo');
  }

  // タワーを選ぶと、何をするものか・どう置くかを表示
  selectTower(id) {
    if (this.wave === 0) { this.hud.toast('タワーは台風1号を乗り切ると使えるようになる'); return; }
    this.buildSel = this.buildSel === id ? null : id;
    if (!this.buildSel) { this.towers.hidePreview(); return; }
    const def = this.towers.def(id);
    this.hud.toast(`${def.name}：${def.desc}`, 'tip');
    this.hud.toast(IS_TOUCH ? '目の前に出る緑の輪が守備範囲。「ここに建てる」で設置' : '目の前に出る緑の輪が守備範囲。［E］で設置／［X］でやめる', 'tip');
  }

  doBuild() {
    if (!this.buildSel) return;
    const def = this.towers.def(this.buildSel);
    const pos = this.player.aimPoint(7);
    const spot = (this.spots || []).find((sp) => Math.hypot(sp.pos.x - pos.x, sp.pos.z - pos.z) < 6);
    const cost = spot ? Math.floor(def.cost * 0.9) : def.cost;
    if (this.q < cost) { this.hud.toast(`Qビットが足りない（${def.name}：${cost}Q）`, 'bad'); return; }
    if (!this.towers.canPlace(pos)) { this.hud.toast('ここには建てられない', 'bad'); return; }
    this.q -= cost;
    if (spot) { this.scene.remove(spot.ring); this.spots = this.spots.filter((x) => x !== spot); this.hud.toast(`おすすめ設置ポイント：1 割引き（${cost}Q）`, 'good'); }
    this.towers.build(this.buildSel, pos);
    this.audio.build();
    this.hud.toast(`${def.name}を建てた`, 'q');
  }

  // ---------- 進行 ----------
  // 次の台風の予報（上陸地点と敵の内訳）を準備タイムの最初に決めておく
  makePlan() {
    const wv = this.wave;
    const a = rand(-0.6, 0.6);
    const z0 = Math.max(-110, Math.min(110, Math.sin(a) * 150 + rand(-30, 30)));
    // 最初の台風は練習を兼ねて、弱い雑魚が少しだけ
    // イノシシは台風2号と4号だけ（大ボスの第2形態がある台風3号・5号とは重ねない）
    const counts = wv === 0 ? { mushi: 5, karasu: 2, tsumuji: 0, pair: 0, inoshishi: 0 } : { mushi: 6 + wv * 3, karasu: 3 + wv * 2, tsumuji: 2 + wv, pair: 1 + wv, inoshishi: wv === 1 ? 2 : wv === 3 ? 3 : 0, chou: wv >= 2 ? (wv === 4 ? 4 : 3) : 0 };
    this.plan = { angle: a, z0, counts, ghosts: 2 + Math.floor(wv / 2) + (WAVES[Math.min(wv, WAVES.length - 1)].ghosts || 0) };
    // 上陸予想地点の赤い柱
    if (this.landMarker) this.scene.remove(this.landMarker);
    const g = new THREE.Group();
    const x = coastX(z0) - 6;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 70, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: '#ff5a4a', transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beam.position.y = 35; g.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(8, 9.5, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#ff5a4a', transparent: true, opacity: 0.7, depthWrite: false, fog: false }));
    ring.position.y = 0.4; g.add(ring);
    g.position.set(x, heightAt(x, z0), z0);
    this.scene.add(g);
    this.landMarker = g;
    this.plan.landing = g.position.clone();
    this.makeGate();
    this.makeSpots();
  }

  // おすすめ設置ポイント：台風2号・3号の準備タイムだけ、最大 2 か所に平たい緑の輪。そこに建てると 1 割引き
  makeSpots() {
    this.clearSpots();
    if (this.wave !== 1 && this.wave !== 2) return;
    const g = this.plan.gate, L = this.plan.landing;
    const cands = [
      { x: g.x + g.in.x * 42, z: g.z + g.in.y * 42, why: `雑魚の来る${g.name}の入り口` },
      { x: L.x - 26, z: L.z, why: 'ボスの上陸地点の手前' },
    ];
    for (const c of cands) {
      let pos = null;
      for (let k = 0; k < 12 && !pos; k++) {
        const p = new THREE.Vector3(c.x + (k ? rand(-8, 8) : 0), 0, c.z + (k ? rand(-8, 8) : 0));
        p.y = heightAt(p.x, p.z);
        if (this.towers.canPlace(p)) pos = p;
      }
      if (!pos) continue;
      const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 4, 40).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: '#7dffb0', transparent: true, opacity: 0.7, depthWrite: false, fog: false }));
      ring.position.copy(pos).add(new THREE.Vector3(0, 0.35, 0));
      this.scene.add(ring);
      this.spots.push({ pos, ring, why: c.why });
    }
    if (this.spots.length) this.hud.toast('緑の輪は「おすすめ設置ポイント」：そこに建てると 1 割引き（地図にも出ている）', 'tip');
  }
  clearSpots() { for (const sp of this.spots || []) this.scene.remove(sp.ring); this.spots = []; }

  // 雑魚の来る方角（東西南北のどれか一方）。その辺の幅 60m の「門」からザーッと押し寄せる
  makeGate() {
    const dirs = [
      { key: 'north', name: '北', in: [0, 1] }, { key: 'south', name: '南', in: [0, -1] },
      { key: 'west', name: '西', in: [1, 0] }, { key: 'east', name: '東（海）', in: [-1, 0] },
    ];
    const d = dirs[Math.floor(Math.random() * dirs.length)];
    let x, z;
    if (d.key === 'north') { x = rand(-90, 70); z = BOUNDS.zMin + 14; }
    else if (d.key === 'south') { x = rand(-90, 70); z = BOUNDS.zMax - 14; }
    else if (d.key === 'west') { x = BOUNDS.xMin + 14; z = rand(-90, 90); }
    else { z = rand(-90, 90); x = coastX(z) - 8; }
    const gate = { key: d.key, name: d.name, x, z, in: new THREE.Vector2(d.in[0], d.in[1]), along: new THREE.Vector2(-d.in[1], d.in[0]), width: 60 };
    this.plan.gate = gate;
    // 目印：オレンジの光の幕と、内向きの矢印
    if (this.gateMarker) this.scene.remove(this.gateMarker);
    const g = new THREE.Group();
    const yaw = Math.atan2(gate.in.x, gate.in.y);
    const wallMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { uT: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform float uT; varying vec2 vUv; void main(){ float a=(1.-vUv.y)*(0.35+0.25*sin(vUv.x*40.-uT*4.))*smoothstep(0.,.08,vUv.x)*smoothstep(1.,.92,vUv.x); gl_FragColor=vec4(vec3(1.,.55,.15)*a,a); }',
    });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(gate.width, 18), wallMat);
    wall.position.y = 9; wall.rotation.y = yaw; g.add(wall);
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(-2.2, 0); arrowShape.lineTo(2.2, 0); arrowShape.lineTo(2.2, 7); arrowShape.lineTo(5, 7); arrowShape.lineTo(0, 13); arrowShape.lineTo(-5, 7); arrowShape.lineTo(-2.2, 7); arrowShape.closePath();
    const arrowMat = new THREE.MeshBasicMaterial({ color: '#ff9a3a', transparent: true, opacity: 0.75, depthWrite: false, fog: false, side: THREE.DoubleSide });
    for (const off of [-18, 0, 18]) {
      const ar = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape).rotateX(-Math.PI / 2).rotateY(Math.PI), arrowMat);
      const ax = x + gate.along.x * off + gate.in.x * 4, az = z + gate.along.y * off + gate.in.y * 4;
      ar.position.set(ax - x, groundAt(ax, az) + 0.5 - groundAt(x, z), az - z);
      ar.rotation.y = yaw; g.add(ar);
    }
    g.position.set(x, groundAt(x, z), z);
    g.userData.wallMat = wallMat;
    this.scene.add(g);
    this.gateMarker = g;
  }

  clearGateMarker() { if (this.gateMarker) { this.scene.remove(this.gateMarker); this.gateMarker = null; } }

  clearLandMarker() { if (this.landMarker) { this.scene.remove(this.landMarker); this.landMarker = null; } }

  // 準備タイムのやることリスト
  prepChecklist() {
    const p = this.plan;
    if (!p) return;
    const left = Math.max(0, Math.ceil(this.prepLength() - this.phaseT));
    const gp = new THREE.Vector3(p.gate.x, 0, p.gate.z);
    const amp = this.towers.list.some((t) => t.id === 'amp' && (t.pos.distanceTo(p.landing) < 60 || Math.hypot(t.pos.x - gp.x, t.pos.z - gp.z) < 60));
    const lost = this.cabbages.lostCount();
    const T = IS_TOUCH;
    // 大事な順。終わったものは消し、残りの上から 3 つだけ見せる（1 つ目を太字）
    const all = [
      ['amp', amp, `${p.gate.name}の矢印か赤い柱の近くにスピーカーを建てる`],
      ['replant', lost === 0, `やられたキャベツを植え直す（跡地を歩くだけ）残り ${lost} 玉`],
      ...(this.cows.active || this.cows.home ? [['cows', this.cows.home >= this.cows.count, `牛を牛舎へ戻す（近づくとついてくる）${this.cows.home} / ${this.cows.count}`]] : []),
      ['pray', this.prayed, '量子の祠で手を合わせる（紫の輪に 2 秒）'],
      ['go', false, T ? `準備ができたら上のボタンで迎え撃つ（+${left * 2}Q）` : `準備ができたら［Enter］で迎え撃つ（+${left * 2}Q）`],
    ];
    // 1 つ終わるたびにチャイム（画面の繰り上がりと対）
    this.prepDone ||= new Set();
    for (const [k, done] of all) if (done && !this.prepDone.has(k)) { this.prepDone.add(k); if (this.phaseT > 1) this.audio.cue('step'); }
    const items = all.filter(([, done]) => !done).slice(0, 3).map(([, , text], i) => [false, i === 0 ? `<b>${text}</b>` : text]);
    const c = p.counts;
    const n = c.mushi + c.karasu + c.tsumuji + c.pair * 2 + (c.inoshishi || 0) + (c.chou || 0);
    // コツや注意は 1 つだけ（大事な順：モンシロチョウ → イノシシ → 弱点）
    const tip = c.chou ? 'モンシロチョウの光る卵は早めに割ろう' : c.inoshishi ? 'イノシシが止まって土煙を上げたら、結界［G］で止めよう' : this.weaknessTip();
    this.hud.prep(`準備タイム ― ${this.waveName()}まで <b>${left}</b> 秒`,
      `${tip ? `<span class="tip">${tip}</span>` : ''}雑魚 ${n} 匹が<span class="hl">${p.gate.name}</span>から → 大ボス（分身 ${p.ghosts} 体）　くわしくは地図の進路図で`, items);
  }

  skipPrep() {
    if (this.phase !== 'prep') return;
    clearTimeout(this.tutorialTimer);
    if (this.mission) { this.clearMarker(); this.threats.clearAll(); this.mission = null; this.hud.objective(null); this.phaseT = this.prepLength() - 20; return; }
    // 早く迎え撃つほどボーナス
    const left = Math.floor(this.prepLength() - this.phaseT);
    if (left > 1) { this.addQ(left * 2); this.hud.toast(`早めに迎え撃つ！ ボーナス +${left * 2}Q`, 'good'); }
    this.phaseT = Math.max(this.phaseT, this.prepLength() - 0.5);
  }

  prepLength() { return this.wave === 0 ? 30 : 40; }
  waveName() { return WAVES[Math.min(this.wave, WAVES.length - 1)].name.replace(/「.*」/, ''); }

  waveLabel() {
    const w = WAVES[Math.min(this.wave, WAVES.length - 1)];
    return `${w.name}（${w.cls}）  ${Math.min(this.wave + 1, WAVES.length)} / ${WAVES.length}`;
  }
  phaseLabel() {
    return { prep: this.mission ? '練習中：操作を覚えよう' : '準備タイム：次の台風に備えよう', storm: '台風接近中 ― キャベツを守り抜け！', clear: '台風一過', result: '収穫', gameover: '全滅', title: '' }[this.phase];
  }
  minionsLeft() { return this.spawn.pool.reduce((n, t) => n + (t === 'pair' ? 2 : 1), 0) + this.threats.minionsAlive; }

  timerLabel() {
    if (this.phase === 'prep') return `上陸まで ${Math.ceil(this.prepLength() - this.phaseT)} 秒  ［Enter］で迎え撃つ`;
    if (this.phase === 'storm') return this.spawn.boss ? '大ボス戦' : `前ぶれの雑魚 残り ${this.minionsLeft()}`;
    return '';
  }

  startStorm() {
    const w = WAVES[this.wave];
    this.phase = 'storm';
    this.phaseT = 0;
    // 前ぶれの雑魚（青虫・カラス・つむじ風）を倒すと、大ボス（台風の目）が現れる
    if (!this.plan) this.makePlan();
    const c = this.plan.counts;
    const pool = [];
    for (let i = 0; i < c.mushi; i++) pool.push('mushi');
    for (let i = 0; i < c.karasu; i++) pool.push('karasu');
    for (let i = 0; i < c.tsumuji; i++) pool.push('tsumuji');
    for (let i = 0; i < (c.pair || 0); i++) pool.push('pair');
    for (let i = 0; i < (c.inoshishi || 0); i++) pool.push('inoshishi');
    for (let i = 0; i < (c.chou || 0); i++) pool.push('chou');
    this.threats.eggCount = 0; this.threats.oyabunDone = false; this.threats.mushiCount = 0;
    pool.sort(() => Math.random() - 0.5);
    this.spawn = { pool, total: pool.length, next: 1.5, boss: false, debris: 6, strike: 14 };
    // 停電のサブミッション：台風2号から、10 回に 7 回くらい
    this.outage = this.wave > 0 && Math.random() < 0.7 ? { at: rand(18, 34), state: 'wait' } : null;
    this.eye = this.wave > 0 ? { state: 'wait' } : null;
    this.threats.minionKills = 0;
    const a = this.plan.angle; // 予報どおり東の海から
    this.stormAngle = a;
    this.threats.landZ = this.plan.z0;
    this.threats.gate = this.plan.gate;
    this.clearSpots();
    clearTimeout(this.evTimer); this.clearPrepEvent();
    if (this.wave > 0) { this.cowLog.storms++; if (this.cows.home >= this.cows.count) this.cowLog.allHome++; }
    this.cows.shelterAll();
    this.clearGateMarker();
    this.clearLandMarker();
    this.weather.typhoonCenter.set(Math.cos(a) * 1500, Math.sin(a) * 1500);
    this.weather.windDir.set(-Math.cos(a), -Math.sin(a)).normalize();
    this.weather.setStorm(w.peak * 0.7);
    this.threats.dmgMul = (1 + this.wave * 0.08) * (this.blessing === 'kekkai' ? 0.7 : 1) * (this.cards.has('tough') ? 0.8 : 1) * this.diffMul().dmg;
    this.threats.hpMul = this.diffMul().hp;
    this.say('来たな…キャベツには指一本触れさせねえ！', true);
    this.hud.banner(`台風${this.typhoonName()} 接近！`, `雑魚 ${this.minionsLeft()} 匹が${this.plan.gate.name}からザーッと押し寄せる！${this.blessing ? `（御利益「${this.blessingName}」が宿っている）` : ''}`);
    this.audio.thunder(0.5);
  }

  spawnBoss() {
    const w = WAVES[this.wave];
    this.spawn.boss = true;
    this.spawn.bossAt = this.phaseT;
    this.threats.extraGhosts = w.ghosts || 0;
    const g = this.threats.spawnBoss(this.wave, this.stormAngle);
    this.threats.extraGhosts = 0;
    if (w.bossSpeed) g.speed *= w.bossSpeed;
    this.say('でけぇ…！ でも負けねえ！', true);
    if (this.blessing === 'senrigan') { this.threats.collapse(g, 'senrigan'); this.hud.toast('千里眼！ 大ボスの正体が最初から見えている', 'good'); }
    this.weather.setStorm(w.peak);
    this.hud.banner(`大ボス出現！`, `「${w.name}の目」が上陸！ 紫に揺れる分身から本物を観測して倒せ`);
    this.audio.thunder(0.2);
    this.player.shake = 0.8;
  }

  endStorm() {
    this.phase = 'clear';
    this.phaseT = 0;
    this.weather.setStorm(0);
    this.threats.clearAll();
    this.harvest = null; this.harvestDone = 0;
    if (this.outage && this.outage.state === 'on') this.endOutage(false);
    if (this.cows.generator) { const l = this.cows.generator.userData.lamp; l.material.emissiveIntensity = 0; }
    this.openBoxes();
    this.blessing = null; this.blessingName = null; this.prayed = false;
    const bonus = 30 + Math.floor(this.cabbages.alive / this.cabbages.total * 50);
    this.addQ(bonus);
    this.say('ふぅ…守り切ったぜ', true);
    if (this.eyeSeen) { this.eyeSeen = false; this.memo('eye'); }
    this.hud.banner('台風一過！', `台風${this.typhoonName()}から キャベツ ${this.cabbages.alive.toLocaleString()} 玉を守り抜いた（出荷見込み ${this.yen(this.sales())}）  +${bonus}Q`);
    // 見渡しカメラ：2 秒だけ空へ上がって、育った畑全体を見渡す（タップで飛ばせる）
    this.overview = { t: 0, dur: 2.4 };
    this.audio.fanfare();
  }

  // 収穫タイム：台風のあと 10 秒だけ、マサトの近くに光る金のキャベツが 10 個。タップ（PC はクリック）か、近くを歩くと収穫
  startHarvest() {
    const cab = this.cabbages, p = this.player.pos;
    const near = [];
    for (let i = 0; i < cab.total; i++) {
      if (cab.state[i]) continue;
      const c = cab.list[i], d = Math.hypot(c.x - p.x, c.z - p.z);
      if (d > 4 && d < 30) near.push([d + Math.random() * 12, i]);
    }
    near.sort((a, b) => a[0] - b[0]);
    const picks = near.slice(0, 10).map(([, i]) => i);
    if (!picks.length) { this.harvestDone = this.phaseT; return; }
    const goldMat = new THREE.MeshStandardMaterial({ color: '#ffd84a', emissive: '#ffb020', emissiveIntensity: 1.4, roughness: 0.3, metalness: 0.4 });
    const geo = new THREE.IcosahedronGeometry(0.55, 1);
    const items = picks.map((i) => {
      const c = cab.list[i];
      const g = new THREE.Group();
      const ball = new THREE.Mesh(geo, goldMat); ball.position.y = 0.55; g.add(ball);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 8, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: '#ffe066', transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      beam.position.y = 4; g.add(beam);
      g.position.set(c.x, c.y, c.z);
      this.scene.add(g);
      return { g, ball, pos: new THREE.Vector3(c.x, c.y + 0.6, c.z), got: false, t: Math.random() * 6 };
    });
    this.harvest = { left: 10, items, got: 0 };
    this.say('台風のあとは収穫だ！ 光ってるやつを取るぞ', true);
    this.audio.qGain();
  }
  updateHarvest(dt) {
    const h = this.harvest;
    h.left -= dt;
    for (const it of h.items) {
      if (it.got) {
        it.vy -= 25 * dt; it.g.position.y += it.vy * dt; it.g.rotation.y += dt * 12;
        if (it.g.position.y < it.pos.y - 3) it.g.visible = false;
        continue;
      }
      it.t += dt;
      it.ball.position.y = 0.55 + Math.abs(Math.sin(it.t * 3)) * 0.25;
      it.ball.rotation.y += dt * 2;
      if (Math.hypot(this.player.pos.x - it.pos.x, this.player.pos.z - it.pos.z) < 2.2) this.collectHarvest(it);
    }
    const T = IS_TOUCH ? 'タップ' : '照準を合わせてクリック／近くを歩く';
    this.hud.objective(`収穫タイム！ 光る金のキャベツを${T}（${h.got} / ${h.items.length}） 残り <b>${Math.ceil(Math.max(0, h.left))}</b> 秒`, '', true);
    if (h.left <= 0 || h.got === h.items.length) this.endHarvest();
  }
  // 画面の座標 (x, y) の近くにある金のキャベツを収穫（当たりは大きめ：半径 80px）
  pickHarvest(x, y) {
    const h = this.harvest;
    if (!h || this.paused) return false;
    let best = null, bd = 80 * 80;
    const v = new THREE.Vector3();
    for (const it of h.items) {
      if (it.got) continue;
      v.copy(it.pos).project(this.camera);
      if (v.z > 1) continue;
      const sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight;
      const d2 = (sx - x) ** 2 + (sy - y) ** 2;
      if (d2 < bd) { bd = d2; best = it; }
    }
    if (!best) return false;
    this.collectHarvest(best);
    return true;
  }
  collectHarvest(it) {
    const h = this.harvest;
    it.got = true; it.vy = 9; h.got++;
    this.audio.pop();
    this.fx.burst(it.pos.clone(), '#ffd84a', 24, 6, 0.6, 0.35, 3);
    this.hud.floater('ポンッ！ +1,500円', it.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), this.camera, '#ffd84a');
    this.harvestYen = (this.harvestYen || 0) + 1500;
    this.q += 10;
  }
  endHarvest() {
    const h = this.harvest;
    for (const it of h.items) this.scene.remove(it.g);
    this.harvest = null;
    this.harvestDone = this.phaseT;
    this.hud.objective(null);
    this.hud.toast(`収穫タイム：金のキャベツ ${h.got} 個（+${(h.got * 1500).toLocaleString()} 円）`, h.got ? 'good' : '');
    if (h.got === h.items.length) this.say('全部取ったぜ！', true);
  }

  // 準備タイムの小さな出来事（4 回に 3 回くらい。マサトの吹き出しで知らせる）
  prepEvent() {
    this.clearPrepEvent();
    if (this.phase !== 'prep' || this.wave === 0 || Math.random() > 0.75) return;
    const list = ['rainbow', 'loose', 'calf', 'seeds', 'snack'];
    const ev = list[Math.floor(Math.random() * list.length)];
    this.prepEv = ev;
    if (ev === 'rainbow') {
      this.rainbow = this.makeRainbow();
      this.say('おっ、虹だ！ なんかいいことありそう', true);
      this.hud.toast('虹が出た：この準備タイムは Qビットのたまる速さが 2 倍', 'tip');
    } else if (ev === 'loose') {
      if (!this.cows.scatter()) return;
      this.say('あっ、1頭柵から出てる！ 連れ戻さねえと', true);
      this.hud.toast('柵から牛が出ている：地図の黄色い点', 'tip');
    } else if (ev === 'calf') {
      this.cows.addCalf();
      this.say('こないだ来た素牛がそわそわしてる。一緒に牛舎に入れてやるか', true);
      this.hud.toast('来たばかりの素牛：4 頭とも牛舎へ戻すと +80Q', 'tip');
    } else if (ev === 'seeds') {
      this.freeSeeds = 150;
      this.say('近所のばあちゃんが苗をくれた！ ありがてえ', true);
      this.hud.toast('苗をもらった：植え直し 150 玉ぶんが無料', 'tip');
    } else if (ev === 'snack') {
      this.solo = 100;
      this.say('差し入れのぬれ煎餅！ 元気出たぜ', true);
      this.hud.toast('差し入れ：ソロゲージが満タンに', 'tip');
    }
  }
  clearPrepEvent() {
    this.prepEv = null; this.freeSeeds = 0;
    if (this.rainbow) { this.scene.remove(this.rainbow); this.rainbow = null; }
  }
  // 海の上にかかる虹（半透明の帯を 7 色重ねるだけの軽いもの）
  makeRainbow() {
    const g = new THREE.Group();
    const cols = ['#ff4a4a', '#ff9a3a', '#ffe14a', '#5ad65a', '#4ab0ff', '#4a5aff', '#a04aff'];
    cols.forEach((c, i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(260 - i * 7, 3.2, 4, 48, Math.PI),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.32, depthWrite: false, fog: false }));
      g.add(m);
    });
    g.position.set(coastX(0) + 160, -40, 0);
    g.rotation.y = Math.PI / 2;
    this.scene.add(g);
    return g;
  }

  // 停電：台風で牛舎の電気が止まり、換気扇と給水ポンプが止まる。45 秒以内に発電機を動かす
  updateOutage(dt) {
    const o = this.outage;
    if (!o || o.state === 'done') return;
    const gen = this.cows.genPos, lamp = this.cows.generator.userData.lamp;
    if (o.state === 'wait') {
      if (this.phaseT < o.at) return;
      o.state = 'on'; o.left = 45; o.hold = 0;
      this.outageBeam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 50, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      this.outageBeam.position.set(gen.x, gen.y + 25, gen.z);
      this.scene.add(this.outageBeam);
      this.audio.warn?.();
      this.hud.banner('牛舎が停電！', '換気扇と給水ポンプが止まった。45 秒以内に牛舎わきの発電機（黄色い光）を動かそう');
      this.say('まずい、牛舎の電気が落ちた！', true);
      return;
    }
    o.left -= dt;
    lamp.material.emissiveIntensity = (Math.sin(this.time * 10) > 0 ? 3 : 0.3);
    const d = Math.hypot(this.player.pos.x - gen.x, this.player.pos.z - gen.z);
    if (d < 3.2) {
      if (o.hold === 0) this.hud.toast('発電機を始動中…（そのまま 2 秒）', 'q');
      o.hold += dt;
      if (o.hold >= 2) this.endOutage(true);
    } else o.hold = 0;
    if (o.state === 'on' && o.left <= 0) this.endOutage(false);
  }
  endOutage(ok) {
    const o = this.outage;
    o.state = 'done';
    if (this.outageBeam) { this.scene.remove(this.outageBeam); this.outageBeam = null; }
    const lamp = this.cows.generator.userData.lamp;
    lamp.material.color.set(ok ? '#0a5a0a' : '#550000');
    lamp.material.emissive.set(ok ? '#3aff4a' : '#ff2a1a');
    lamp.material.emissiveIntensity = ok ? 2 : 0;
    if (ok) {
      this.addQ(40, this.cows.genPos.clone().add(new THREE.Vector3(0, 2, 0)));
      this.fx.burst(this.cows.genPos.clone().add(new THREE.Vector3(0, 1.2, 0)), '#ffe066', 30, 6, 0.8, 0.3, 2);
      this.say('よし、換気扇が回った！ 頼むぞ', true);
      this.hud.toast('発電機が動いた：牛舎の換気と給水が戻った +40Q', 'good');
    } else {
      this.cowLog.outageFail++;
      this.say('間に合わなかった…牛たち、暑かったよな', true);
      this.hud.toast('停電が長引いて、牛たちが少しバテてしまった（出荷リザルトの「牛の様子」に響く）', 'bad');
    }
  }
  outageText() {
    const o = this.outage;
    return o && o.state === 'on' ? `　<b>牛舎が停電！</b> 発電機へ 残り ${Math.ceil(o.left)} 秒` : '';
  }

  // 台風の目：ボス戦の途中で 10 秒だけ風がやむ（晴れ間）→ 反対向きの強い風（吹き返し）で雑魚が飛ばされる
  // 空は描き直さず、嵐の強さを下げて暗い雲を薄くするだけ
  updateEye(dt, w) {
    const e = this.eye, sp = this.spawn, b = this.threats.boss;
    if (!e || e.state === 'done' || !sp.boss || !b) return;
    if (e.state === 'wait') {
      if (this.phaseT - sp.bossAt < 22 || sp.phase2T > 0) return;
      e.state = 'calm'; e.left = 10; e.speed = b.speed; b.speed *= 0.5;
      this.weather.setStorm(w.peak * 0.18);
      this.say('静かになった…いや、目に入っただけだ', true);
      this.hud.toast('台風の目に入った：風がやんだ。まだ終わっていない！ 吹き返しに注意', 'tip');
      return;
    }
    if (e.state === 'calm') {
      e.left -= dt;
      if (e.left > 0) return;
      // 吹き返し
      e.state = 'done';
      b.speed = e.speed;
      this.weather.setStorm(Math.min(1, w.peak * 1.15));
      this.weather.windDir.multiplyScalar(-1);
      const wd = this.weather.windDir;
      for (const m of this.threats.minions) {
        if (!m.alive || m.type === 'egg') continue;
        m.pos.x += wd.x * 8; m.pos.z += wd.y * 8; m.retarget = 0;
        this.fx.burst(m.pos.clone().add(new THREE.Vector3(0, 1, 0)), '#cfd6dc', 8, 5, 0.5, 0.3, 1);
      }
      this.player.shake = 0.8;
      this.audio.thunder(0, 0.5);
      this.hud.banner('吹き返し！', '台風の目が通り過ぎて、反対向きの強い風。雑魚も吹き飛ばされた');
      this.say('来た、吹き返しだ！', true);
      this.eyeSeen = true;
    }
  }
  eyeText() {
    const e = this.eye;
    return e && e.state === 'calm' ? `台風の目に入った ― まだ終わっていない！ 吹き返しまで <b>${Math.ceil(e.left)}</b> 秒` : '';
  }

  // 大ボスの第2形態：体力が半分になると、量子トンネルで反対側（西の山すそ）へ回り込む
  // 回り込んだ先に赤い柱で予告し、3 秒止まってから再び畑へ
  updatePhase2(dt) {
    const sp = this.spawn, b = this.threats.boss;
    if (!b) return;
    const real = b.members.find((m) => m.real && m.alive);
    if (!sp.phase2 && b.collapsed && real && real.hp < real.maxHp * 0.5) {
      sp.phase2 = true; sp.phase2T = 3; sp.bossSpeed = b.speed; b.speed = 0;
      const dz = Math.max(-100, Math.min(100, -real.pos.z * 0.8));
      const dest = new THREE.Vector3(BOUNDS.xMin + 40, 0, dz);
      for (const m of b.members) {
        if (!m.alive) continue;
        this.fx.beam(m.pos.clone(), '#ff5a4a', 80, 10, 0.8);
        m.pos.set(dest.x + (m.pos.x - real.pos.x) * 0.5, 0, dest.z + (m.pos.z - real.pos.z) * 0.5);
        m.pos.y = Math.max(heightAt(m.pos.x, m.pos.z), 0);
        m.obj.position.copy(m.pos); m.retarget = 0;
      }
      this.fx.beam(dest.clone().setY(heightAt(dest.x, dest.z)), '#ff5a4a', 90, 12, 3.2, 1.2);
      this.audio.thunder(0, 0.6); this.player.shake = 0.6;
      this.hud.banner('台風の目が回り込んだ！', '量子トンネルで反対側（西の山すそ）へ。赤い光の柱から畑へ戻ってくる');
      this.say('うそだろ、反対側から！？', true);
      this.memo('tunnel');
    }
    if (sp.phase2T > 0) {
      sp.phase2T -= dt;
      if (sp.phase2T <= 0) b.speed = sp.bossSpeed;
    }
  }

  // 出荷：キャベツ 1 玉 150 円で計算
  sales() { return Math.round((this.cabbages.alive * 150 + (this.harvestYen || 0)) * this.diffMul().pay); }
  yen(n) { return n.toLocaleString() + ' 円'; }
  // 牛の様子（台風のたびに牛舎へ戻せたか・停電を直せたかで変わる。出荷はしない）
  cowCondition() {
    const L = this.cowLog;
    if (L.outageFail >= 2) return { text: '停電が続いて少しバテ気味。ゆっくり休ませよう', gain: 0.75 };
    if (L.outageFail === 1) return { text: '停電で少し落ち着かなかったけど元気', gain: 0.85 };
    if (L.storms && L.allHome / L.storms >= 0.8) return { text: '食い込み良好・毛づやもいい', gain: 0.95 };
    return { text: '元気。台風のときに牛舎へ入れてあげると、もっと落ち着く', gain: 0.9 };
  }

  finish(win) {
    this.phase = win ? 'result' : 'gameover';
    if (win) clearSave();
    this.paused = true;
    document.exitPointerLock && document.exitPointerLock();
    const cab = this.cabbages, st = this.threats.stats;
    const ratio = cab.alive / cab.total;
    const rank = !win ? '—' : ratio >= 0.9 ? 'S' : ratio >= 0.75 ? 'A' : ratio >= 0.55 ? 'B' : 'C';
    const score = cab.alive * 1000 + this.score.chords * 5 + st.tornados * 500 + st.reflected * 300 + st.absorbed * 100;
    const el = document.getElementById('result');
    el.querySelector('h2').textContent = win ? '出荷だ！ キャベツを守り抜いた！' : 'キャベツ畑が壊滅してしまった…';
    el.querySelector('.rank').textContent = rank;
    // 出荷リザルト：売上と前回比、牛の様子
    const sales = win ? this.sales() : 0;
    const rec = loadRecords();
    const prev = rec.lastSales;
    const diff = prev != null && win ? sales - prev : null;
    if (win) { rec.cleared = true; rec.lastSales = sales; rec.bestSales = Math.max(rec.bestSales || 0, sales); saveRecords(rec); }
    const cow = this.cowCondition();
    el.querySelector('.stats').innerHTML = `
      <li class="ship"><span>キャベツの売上（1玉 150 円${this.harvestYen ? '＋金のキャベツ' : ''}${this.diffMul().pay > 1 ? `・台風の強さボーナス ×${this.diffMul().pay}` : ''}）</span><b>${win ? this.yen(sales) : '出荷できず'}</b></li>
      ${this.harvestYen && win ? `<li><span>うち 収穫タイムの金のキャベツ</span><b>${this.yen(this.harvestYen)}</b></li>` : ''}
      ${diff != null ? `<li class="ship"><span>前回とくらべて</span><b class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '+' : '−'}${this.yen(Math.abs(diff))}</b></li>` : ''}
      ${rec.bestSales ? `<li><span>これまでの最高売上</span><b>${this.yen(rec.bestSales)}</b></li>` : ''}
      <li class="cow"><span>牛の様子</span><b>${cow.text}<small>1日の増体 +${cow.gain.toFixed(2)}kg</small></b></li>
      <li><span>守り抜いたキャベツ</span><b>${cab.alive} / ${cab.total} 玉</b></li>
      <li><span>到達した台風</span><b>${Math.min(this.wave + 1, WAVES.length)} / ${WAVES.length}</b></li>
      <li><span>戦った台風</span><b>${Array.from({ length: Math.min(this.wave + 1, WAVES.length) }, (_, i) => this.typhoonName(i)).join('・')}</b></li>
      <li><span>消滅させた竜巻</span><b>${st.tornados}</b></li>
      <li><span>波動関数の収束</span><b>${st.collapsed} 回</b></li>
      <li><span>弾いた回数</span><b>${this.score.chords}</b></li>
      <li><span>弾き返した雷 / 吸収した雷</span><b>${st.reflected} / ${st.absorbed}</b></li>
      <li class="total"><span>スコア</span><b>${score.toLocaleString()}</b></li>`;
    document.getElementById('retry').textContent = win ? 'もう一度遊ぶ' : '別の世界線でやり直す';
    // 多世界解釈：負けても別の世界線がある
    const mw = MEMOS.manyworlds;
    el.querySelector('.worlds').innerHTML = win ? '' : `<b>${mw.title}</b>${mw.physics}<br><span>${mw.game}</span><em>― ${mw.lore}</em>`;
    el.classList.add('show');
    document.getElementById('hud').classList.remove('show');
    if (win) this.audio.fanfare();
  }

  updatePhase(dt) {
    this.phaseT += dt;
    if (this.phase === 'prep') {
      this.q += dt * 1.5 * (this.cards.has('income') ? 2 : 1) * (this.prepEv === 'rainbow' ? 2 : 1);
      if (this.mission) { this.updateMission(); this.phaseT = Math.min(this.phaseT, this.prepLength() - 5); }
      if (this.phaseT >= this.prepLength()) this.startStorm();
    } else if (this.phase === 'storm') {
      const w = WAVES[this.wave];
      const sp = this.spawn;
      this.q += dt * 0.6 * (this.cards.has('income') ? 2 : 1);
      if (this.phaseT > 6 && Math.random() < dt * 0.12 * w.peak) { this.weather.distantFlash(); this.audio.thunder(rand(0.8, 2), 0.35); }
      // 雑魚を少しずつ送り込む
      sp.next -= dt;
      if (sp.pool.length && sp.next <= 0) {
        const type = sp.pool.pop();
        this.threats.spawnMinion(type, this.wave);
        sp.next = rand(0.2, 0.5); // 一方からザーッと
        if (sp.pool.length === sp.total - 1) this.hud.toast(`雑魚が${this.plan.gate.name}からやってきた！ 近づいてギターで倒そう（スピーカーも自動で撃つ）`, 'q');
      }
      // 雑魚を全部倒すか 80 秒たったら大ボス
      if (!sp.boss && ((!sp.pool.length && this.threats.minionsAlive === 0) || this.phaseT > 80)) this.spawnBoss();
      if (sp.boss) {
        sp.debris -= dt;
        if (sp.debris <= 0) { this.threats.spawnDebris(); sp.debris = w.debris * rand(0.7, 1.3); }
      }
      sp.strike -= dt;
      if (sp.strike <= 0 && this.phaseT > 15) { this.threats.spawnStrike(); sp.strike = w.strike * (w.strikeMul || 1) * rand(0.8, 1.5); }
      if (sp.boss && w.phase2) this.updatePhase2(dt);
      this.updateOutage(dt);
      this.updateEye(dt, w);
      if (sp.boss && !this.threats.bossAlive) this.endStorm();
      if (this.phaseT > 260) this.endStorm();
    } else if (this.phase === 'clear') {
      // 台風一過 → 収穫タイム（10 秒）→ 量子カード の順に一本の流れで
      if (this.phaseT > 2.6 && !this.harvest && !this.harvestDone) this.startHarvest();
      if (this.harvest) this.updateHarvest(dt);
      if (this.harvestDone && !this.choosing && this.phaseT > this.harvestDone + 1.5) {
        if (this.wave + 1 >= WAVES.length) { this.finish(true); return; }
        this.offerCards();
      }
    }
    if ((this.phase === 'storm' || this.phase === 'clear') && this.cabbages.alive < this.cabbages.total * 0.3) this.finish(false);
  }

  // 敵を倒した瞬間：ほんの一瞬止める（ヒットストップ）・Qの光の粒・連続撃破
  onKill(e, pos) {
    const big = e.group && e.group.boss;
    this.hitstop = Math.max(this.hitstop, big ? 0 : 0.045);
    // 大ボス撃破：0.6 秒だけスローにしてカメラを寄せる
    if (big) { this.slowmo = 0.6; this.fovKick = 1.6; this.player.shake = 0.9; this.fx.sphere(e.pos.clone().add(new THREE.Vector3(0, 6, 0)), '#ffffff', 40, 0.9); }
    this.fx.absorb(pos, this.player.pos, big ? '#ffd36a' : '#b48cff', big ? 14 : 5);
    this.killStreak = this.time - this.lastKillAt < 2.2 ? this.killStreak + 1 : 1;
    this.lastKillAt = this.time;
    const n = this.killStreak;
    if (n === 3 || n === 5 || n === 8 || n === 12 || n === 20 || (n > 20 && n % 10 === 0)) {
      this.hud.streak(n);
      if (n >= 5) this.say(n >= 12 ? 'まだまだァ！！' : 'まだまだァ！');
    }
  }

  // マサトの吹き出し（force でなければ 6 秒に 1 回まで）
  say(text, force = false) {
    if (!force && this.time - (this.saidAt || -99) < 6) return;
    this.saidAt = this.time;
    this.hud.say(text);
  }

  // 台風情報ニュース：準備タイムの始めに、今回の台風の特徴を伝える（タップで閉じる）
  showNews() {
    if (!this.plan || this.wave === 0) return;
    const w = WAVES[this.wave], p = this.plan;
    const land = p.z0 < -40 ? '灯台の近くの浜' : p.z0 > 40 ? '南の浜' : '畑の東の浜';
    this.hud.news(`${this.waveName()}「${this.typhoonName()}」（${w.cls}）が接近中`, [`今回の特徴：${w.trait}`, `雑魚は${p.gate.name}から押し寄せる見込み／大ボスの上陸予想：${land}`]);
  }

  // 音の設定（BGM のオン・オフ、全体の音量）
  applyAudio() {
    const a = this.audio, s = this.settings;
    a.musicOn = !!s.bgm;
    if (a.ready && a.master) a.master.gain.setTargetAtTime(s.vol, a.ctx.currentTime, 0.05);
  }

  toggleSettings(v) {
    this.settingsOpen = v;
    document.getElementById('settings').classList.toggle('show', v);
  }

  // 台風一過：量子カードを 3 枚から 1 枚選ぶ（選んでいる間は時間が止まる）
  offerCards() {
    const picks = drawCards(this.cards);
    if (!picks.length) { this.nextPrep(); return; }
    this.choosing = true;
    this.paused = true;
    const el = document.getElementById('cards');
    el.querySelector('.list').innerHTML = picks.map((c) => `<button class="qcard" data-id="${c.id}"><i>${c.mark}</i><b>${c.name}</b><span>${c.text}</span></button>`).join('');
    el.classList.add('show');
    this.say('どれにすっかな…');
    el.querySelectorAll('.qcard').forEach((b) => b.addEventListener('click', () => {
      this.cards.add(b.dataset.id);
      el.classList.remove('show');
      this.choosing = false;
      this.paused = false;
      const c = CARDS.find((x) => x.id === b.dataset.id);
      this.hud.toast(`量子カード「${c.name}」：${c.text}`, 'good');
      this.nextPrep();
    }, { once: true }));
  }

  nextPrep() {
    {
      {
        this.wave++;
        this.cabbages.setGrowth(this.wave);
        this.phase = 'prep';
        this.hud.prepFolded = false; this.hud.prepTouched = false;
        this.prepDone = new Set();
        this.phaseT = 0;
        this.makePlan();
        this.cows.reset(true);
        this.applyUnlocks();
        if (this.weaknessTip()) this.hud.toast(`今回のコツ：${this.weaknessTip()}`, 'tip');
        if (saveGame(this)) this.hud.toast('自動保存しました（閉じても、ここから「つづきから」で再開できます）');
        this.hud.banner('準備タイム', `${this.waveName()}が来る前に、畑を立て直してタワーで備えよう`);
        this.showNews();
        this.say('次の台風まで、準備しとくか');
        clearTimeout(this.evTimer);
        this.evTimer = setTimeout(() => this.prepEvent(), 9000);
      }
    }
  }

  // 見渡しカメラ：いつものカメラから畑の上空へ上がって戻る（影や描く範囲は増やさない）
  updateOverview(dt) {
    const o = this.overview;
    o.t += dt;
    const k = Math.sin(Math.min(1, o.t / o.dur) * Math.PI); // 0 → 1 → 0
    const e = k * k * (3 - 2 * k);
    const from = this.camera.position.clone();
    // 畑のまん中の南の上空から、畑全体を見下ろす（高さは先に上げて木にぶつからないように）
    const top = new THREE.Vector3(10, 140, 150);
    this.camera.position.lerpVectors(from, top, e);
    this.camera.position.y = from.y + (top.y - from.y) * Math.min(1, e * 1.6);
    const look = new THREE.Vector3(this.player.pos.x, this.player.pos.y + 1.5, this.player.pos.z).lerp(new THREE.Vector3(5, 0, -15), Math.min(1, e * 1.4));
    this.camera.lookAt(look);
    if (o.t >= o.dur) this.overview = null;
  }

  // 台風の名前（本物の台風と同じく、日本が出したアジア名から。台風の個性に合わせて）
  typhoonName(w = this.wave) { return ['コイヌ', 'ハト', 'トカゲ', 'ヤマネコ', 'クジラ'][Math.min(w, 4)]; }

  // 敵ごとの弱点：台風ごとに 1 つずつ紹介する
  weaknessTip() {
    return ['', 'スピーカーは青虫に 2 倍効く', '観測ライトの光でカラスが落ちる', '避雷針に近づいたつむじ風は一瞬で消える', '弱点：青虫→スピーカー／カラス→観測ライト／つむじ風→避雷針'][Math.min(this.wave, 4)];
  }
  noteWeakness(e) {
    if (this.weakShown) return;
    this.weakShown = true;
    this.hud.toast('弱点を突いた！ タワーごとに得意な敵がいる（タワー欄に書いてある）', 'good');
  }

  // 大きな地図：見るだけ。開いている間は時間を止め、3D の描画も止める（発熱対策）
  toggleMap(v = !this.mapOpen) {
    if (this.phase === 'title' || this.phase === 'result' || this.phase === 'gameover') v = false;
    this.mapOpen = v;
    document.getElementById('bigmap').classList.toggle('show', v);
    if (v) this.hud.drawMap(this, true);
  }

  // ---------- 最初の台風で、実戦の中で覚える ----------
  // 最初に教えるのは「歩く・ギター・観測」だけ。タワー・テレポ・結界・ソロ・祠は台風2号の準備から
  startTutorial() {
    const g = this.plan.gate;
    const p = new THREE.Vector3(g.x + g.in.x * 45, 0, g.z + g.in.y * 45);
    this.setMarker(p);
    this.tut = { stage: 'move' };
    this.hud.banner('がんばれマサトくん！', `台風の前ぶれの雑魚が${g.name}からやってくる！`);
    setTimeout(() => this.say('よっしゃ、やるか！', true), 3000);
  }

  // いま覚えることだけを、画面上の一言と光るボタンで案内する
  updateTutorial() {
    const tu = this.tut;
    if (!tu) return;
    // 台風が過ぎたら（または台風1号以外なら）案内はおしまい
    if (this.wave > 0 || (this.phase !== 'prep' && this.phase !== 'storm')) {
      this.tut = null;
      document.querySelectorAll('.glow-hint').forEach((e) => e.classList.remove('glow-hint'));
      this._glowKey = '';
      return;
    }
    const T = IS_TOUCH, g = this.plan?.gate;
    let text = '', glow = [];
    if (tu.stage === 'move') {
      if (this.phase !== 'prep') tu.stage = 'strum';
      else {
        text = T ? `左半分をなぞって歩こう → 光る柱へ（雑魚は${g.name}から来る）` : `WASD で歩こう → 光る柱へ（雑魚は${g.name}から来る）`;
        glow = T ? ['stick-hint'] : [];
        if (this.marker) this.marker.rotation.y += 0.02;
        if (this.marker && this.player.pos.distanceTo(this.marker.position) < 6) {
          this.clearMarker();
          this.hud.toast('いい位置！ 雑魚が来るのを待ちかまえよう', 'good');
          this.phaseT = Math.max(this.phaseT, this.prepLength() - 5);
          tu.stage = 'wait';
        }
      }
    }
    if (tu.stage === 'wait') {
      if (this.phase === 'storm') tu.stage = 'strum';
      else text = 'もうすぐ雑魚が来る…！';
    }
    if (tu.stage === 'strum') {
      this.clearMarker();
      text = T ? '「ギター」ボタンで音波！ 雑魚の方を向いて撃とう' : 'クリックでギターの音波！ 雑魚の方を向いて撃とう';
      glow = ['tb-guitar'];
      if (this.threats.minionKills >= 3) { tu.stage = 'minions'; this.hud.toast('その調子！ 残りの雑魚も倒そう', 'good'); }
    }
    if (tu.stage === 'minions') {
      if (this.spawn.boss) tu.stage = 'observe';
      else text = `前ぶれの雑魚 残り <b>${this.minionsLeft()}</b> 匹`;
    }
    if (tu.stage === 'observe') {
      const b = this.threats.boss;
      if (b && b.collapsed) tu.stage = 'finish';
      else { text = T ? '紫の分身のどれかが本物。近づいて「観測」ボタン！' : '紫の分身のどれかが本物。近づいて［F］で観測！'; glow = ['tb-observe', 'cd-f']; }
    }
    if (tu.stage === 'finish') {
      if (!this.spawn.boss || !this.threats.bossAlive) { this.tut = null; glow = []; }
      else { text = '本物が見えた！ ギターで倒そう'; glow = ['tb-guitar']; }
    }
    if (text) this.hud.objective(text, '', true);
    const key = glow.join(',');
    if (key !== this._glowKey) {
      document.querySelectorAll('.glow-hint').forEach((e) => e.classList.remove('glow-hint'));
      glow.forEach((id) => document.getElementById(id)?.classList.add('glow-hint'));
      this._glowKey = key;
    }
  }

  // 最初の台風では、まだ使わないボタン・欄を隠す
  applyUnlocks() {
    const early = this.wave === 0;
    const was = document.body.classList.contains('early');
    document.body.classList.toggle('early', early);
    if (was && !early) {
      this.hud.banner('新しくできること', 'タワー建設・テレポ・結界・ソロが使えるようになった！ 祠にもお参りできる');
      ['hotbar', 'tb-teleport', 'tb-kekkai', 'cd-r', 'cd-g'].forEach((id) => document.getElementById(id)?.classList.add('glow-hint'));
      setTimeout(() => { document.querySelectorAll('.glow-hint').forEach((e) => e.classList.remove('glow-hint')); this._glowKey = ''; }, 6000);
    }
  }

  // ---------- 体験しながら覚えるチュートリアル（旧：文字の練習ミッション。今は使っていない） ----------
  missions() {
    const T = IS_TOUCH;
    const p0 = () => this.player.pos.clone();
    return [
      {
        text: T ? '光る柱まで走ろう（左側をなぞって移動）' : '光る柱まで走ろう（WASD で移動、マウスで向き）',
        start: () => { const f = this.player.forward(); const p = p0().addScaledVector(f, 18); this.setMarker(p); },
        done: () => this.marker && this.player.pos.distanceTo(this.marker.position) < 4,
      },
      {
        text: T ? '「ギター」ボタンで弾いてみよう！ 前に音波が飛ぶ（3回）' : 'クリックでギターを弾いてみよう！ 前に音波が飛ぶ（3回）',
        start: () => { this.clearMarker(); this.mJust = 0; },
        onStrum: () => { this.mJust++; },
        done: () => this.mJust >= 3,
        progress: () => `${Math.min(3, this.mJust)} / 3`,
      },
      {
        text: '練習用の竜巻が出た！ 近づいてギターで吹き飛ばそう',
        start: () => { this.practice = this.threats.spawnPractice(this.player.pos, this.player.forward(), false); },
        done: () => this.practice && !this.practice.members.some((t) => t.alive),
      },
      {
        text: T ? '紫に揺れる竜巻は「重ね合わせ」。本物はひとつだけ！ 近くで「観測」して本物を倒そう' : '紫に揺れる竜巻は「重ね合わせ」。本物はひとつだけ！ 近くで［F］観測して本物を倒そう',
        start: () => { this.q = Math.max(this.q, 60); this.practice = this.threats.spawnPractice(this.player.pos, this.player.forward(), true); },
        done: () => this.practice && !this.practice.members.some((t) => t.alive),
      },
      {
        text: T ? '最後に、左のタワー欄から「スピーカー」を選んで建てよう（近づく敵を自動で撃つ）' : '最後に［1］で「スピーカー」を選び、［E］で建てよう（近づく敵を自動で撃つ）',
        start: () => { this.q = Math.max(this.q, 120); this.mTowers = this.towers.list.length; },
        done: () => this.towers.list.length > this.mTowers,
      },
    ];
  }

  setMission(i) {
    const list = this.missions();
    this.missionIdx = i;
    this.mission = list[i] || null;
    if (!this.mission) {
      this.hud.objective(null);
      this.hud.banner('準備完了！', '台風がやってくる。竜巻を全部吹き飛ばして、キャベツを守り抜け！');
      this.phaseT = this.prepLength() - 25;
      return;
    }
    this.mission.start?.();
    this.hud.mission(i + 1, list.length, this.mission.text);
    this.audio.build();
  }

  setMarker(p) {
    this.clearMarker();
    const g = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 40, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: '#7dffb0', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beam.position.y = 20; g.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.2, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#7dffb0', transparent: true, opacity: 0.8, depthWrite: false, fog: false }));
    ring.position.y = 0.3; g.add(ring);
    p.y = this.player.pos.y;
    g.position.copy(p);
    g.position.y = heightAt(p.x, p.z);
    this.scene.add(g);
    this.marker = g;
  }
  clearMarker() { if (this.marker) { this.scene.remove(this.marker); this.marker = null; } }

  updateMission() {
    if (!this.mission) return;
    if (this.marker) this.marker.rotation.y += 0.02;
    if (this.mission.progress) this.hud.missionProgress(this.mission.progress());
    if (this.mission.done()) {
      this.hud.toast('ミッションクリア！', 'good');
      this.fx.notes(this.player.pos.clone().add(new THREE.Vector3(0, 2, 0)), 12, undefined, 1.2);
      this.setMission(this.missionIdx + 1);
    }
  }

  // ---------- フレーム ----------
  frame() {
    // フレームレートの上限（iPad などの 120Hz 画面で無駄に描きすぎて熱くならないように）
    if (this.Q.fps) {
      const now = performance.now();
      if (now - (this.lastFrameAt || 0) < 1000 / this.Q.fps - 3) return;
      this.lastFrameAt = now;
    }
    if (this.mapOpen || this.settingsOpen) { this.clock.getDelta(); return; }
    const rawDt = Math.min(this.clock.getDelta(), 0.05);
    let dt = this.paused ? 0 : rawDt;
    if (this.hitstop > 0) { this.hitstop -= rawDt; dt *= 0.08; }
    if (this.slowmo > 0) { this.slowmo -= rawDt; dt *= 0.2; }
    this.time += rawDt;
    const t = this.time;

    if (!this.paused && this.phase !== 'title') {
      this.updatePhase(dt);
      for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt);
      this.updateShrine(dt);
      this.cows.update(dt);

      // ソロ中
      if (this.soloT > 0) {
        this.soloT -= dt;
        this.soloAcc = (this.soloAcc || 0) + dt;
        if (this.soloAcc > 0.12) {
          this.soloAcc = 0;
          this.audio.soloNote(Math.floor(Math.random() * 11));
          this.threats.blast(this.player.pos, 42, 22);
          this.fx.ring(this.player.pos, '#ffd36a', 42, 0.4, 0.9);
        }
        if (this.soloT <= 0) { this.player.soloOn = false; this.threats.slow = false; }
      }

      // 拍
      const b = this.audio.beatInfo();
      if (b.idx !== this.lastBeat) { this.lastBeat = b.idx; this.towers.onBeat(b.idx); }

      // タワー設置プレビュー
      if (this.buildSel) {
        const pos = this.player.aimPoint(7);
        this.towers.showPreview(this.buildSel, pos, this.towers.canPlace(pos) && this.q >= this.towers.def(this.buildSel).cost);
      }
    }

    const w = this.weather;
    const windVec = new THREE.Vector2(w.windDir.x, w.windDir.y).multiplyScalar(Math.max(0, w.windSpeed - 20) * 0.12);
    if (this.phase !== 'title') this.player.update(dt, t, this.paused ? {} : this.input, windVec);
    else this.titleCamera(t);
    if (this.camOverride) this.camOverride(this.camera); // 撮影・デバッグ用
    if (this.overview) this.updateOverview(rawDt);

    w.update(rawDt, t, this.camera, this.player.pos);
    this.windU.uTime.value = t;
    if (this.gateMarker) this.gateMarker.userData.wallMat.uniforms.uT.value = t;
    for (const sp of this.spots) sp.ring.material.opacity = 0.45 + Math.sin(t * 3) * 0.25;
    this.windU.uWind.value = w.storm * 1.4;
    this.world.update(rawDt, t, w);
    this.cabbages.update(dt, t, w.storm, this.camera);
    this.threats.update(dt, t);
    this.towers.update(dt, t);
    this.fx.update(dt);
    this.audio.schedule();
    this.audio.setWeather(w.storm, w.windSpeed);

    const gu = this.grade.uniforms;
    gu.uTime.value = t % 100;
    gu.uStorm.value = w.storm;
    gu.uFlash.value = w.flash;
    gu.uSolo.value = this.player.soloOn ? 1 : Math.max(0, gu.uSolo.value - rawDt * 2);
    // 弾いた瞬間にカメラをぐっと寄せる
    if (!(this.slowmo > 0)) this.fovKick = Math.max(0, this.fovKick - rawDt * 3.5);
    const fov = 62 - this.fovKick * 9 + (this.player.soloOn ? -6 : 0);
    if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    if (this.tut) this.updateTutorial();
    else if (this.phase === 'storm') {
      const sub = `キャベツ ${this.cabbages.alive} 玉（${Math.ceil(this.cabbages.total * 0.3)} 玉を切ると負け）`;
      // 大ボス戦は画面上の体力バーが目印になるので、目的パネルは出さない
      const ot = this.outageText(), et = this.eyeText();
      if (this.spawn.boss) this.hud.objective(et || (ot ? ot.trim() : null), '', true);
      else this.hud.objective(`前ぶれの雑魚 残り <b>${this.minionsLeft()}</b> 匹${ot}`, sub, true);
    } else if (this.phase === 'prep' && !this.mission) {
      // スマホ・iPad はやることリストを 8 秒で自動的にたたむ（タップで開ける）
      if (IS_TOUCH && !this.hud.prepTouched && this.phaseT > 8) this.hud.prepFolded = true;
      this.prepChecklist();
      // やられたキャベツの跡地を歩くと植え直す（1玉 1Q）
      if (!this.paused && (this.q >= 1 || this.cards.has('replant') || this.freeSeeds > 0)) {
        const free = this.cards.has('replant');
        const seeds = this.freeSeeds || 0;
        const n = this.cabbages.replantNear(this.player.pos.x, this.player.pos.z, 3.2, free ? 9999 : Math.floor(this.q) + seeds);
        if (n) { if (!free) { const fromSeeds = Math.min(seeds, n); this.freeSeeds = seeds - fromSeeds; this.q -= n - fromSeeds; } this.replantFx = (this.replantFx || 0) + n; }
        if (this.replantFx >= 5) { this.hud.floater(`植え直し ×${this.replantFx}`, this.player.pos.clone().add(new THREE.Vector3(0, 2.5, 0)), this.camera, '#9fe05a'); this.replantFx = 0; }
      }
    }
    if (this.bloom) this.bloom.strength = 0.3 + w.flash * 0.8 + (this.player.soloOn ? 0.25 : 0);

    // 戦況で盛り上がる音楽と、画面の上下の合図（消音でも分かるように）
    {
      let stage = 0;
      const b = this.threats.boss;
      if (this.phase === 'storm' && this.spawn.boss && b && this.threats.bossAlive) {
        const real = b.members.find((m) => m.real && m.alive);
        stage = b.collapsed && real && real.hp < real.maxHp * 0.3 ? 2 : 1;
      }
      if (stage !== this.musicStage) {
        this.musicStage = stage;
        this.audio.stage = stage;
        this.hud.battleStage(stage);
        if (stage === 2) this.say('あと少し！ 押し切るぞ！', true);
      }
    }
    if (this.phase !== 'title') { this.hud.updateSpeech(this);
      this.hud.update(this); if (IS_TOUCH) updateTouch(this); }
    // 低画質は仕上げ処理（ブルーム・色調補正）を省いて直接描く
    if (this.Q.low) this.renderer.render(this.scene, this.camera);
    else this.composer.render();
  }

  titleCamera(t) {
    const a = t * 0.05 - 0.6;
    const r = 70;
    this.camera.position.set(Math.cos(a) * r + 10, 32, Math.sin(a) * r - 20);
    this.camera.lookAt(10, 14, -10);
    this.player.model.update(0.016, t, 0, false, false, false);
    this.player.model.root.position.copy(this.player.pos);
  }
}

// ---------- 起動 ----------
let game = null;
const qualitySel = document.getElementById('quality');
const guess = IS_TOUCH || /Mobi|Android/i.test(navigator.userAgent) ? 'low' : 'high';
qualitySel.value = guess;

function boot(q) {
  document.getElementById('loading').classList.add('show');
  setTimeout(() => {
    try {
      game = new Game(q);
      window.__game = game;
      document.getElementById('loading').classList.remove('show');
      document.getElementById('start').disabled = false;
      document.getElementById('continue').disabled = false;
    } catch (e) {
      console.error(e);
      document.getElementById('loading').textContent = 'WebGL の初期化に失敗しました：' + e.message;
    }
  }, 30);
}
if (location.hash && QUALITY[location.hash.slice(1)]) qualitySel.value = location.hash.slice(1);
boot(qualitySel.value);
qualitySel.addEventListener('change', () => {
  // 画質変更はリロードで反映
  location.hash = qualitySel.value;
  location.reload();
});
document.getElementById('start').addEventListener('click', () => game && game.start({ wave: +document.getElementById('startwave').value }));
// つづきから
const saved = loadSave();
const contBtn = document.getElementById('continue');
if (saved) {
  const d = new Date(saved.savedAt);
  contBtn.hidden = false;
  contBtn.innerHTML = `つづきから<small>${WAVES[Math.min(saved.wave, WAVES.length - 1)].name}の準備タイム（${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} 保存）</small>`;
  contBtn.addEventListener('click', () => game && game.start({ resume: saved }));
}
// 台風の強さ：強い・猛烈は一度クリアしてから
{
  const cleared = !!loadRecords().cleared;
  document.querySelectorAll('.diff-sel').forEach((sel) => {
    [2, 3].forEach((v) => { const o = sel.querySelector(`option[value="${v}"]`); o.disabled = !cleared; if (!cleared) o.textContent = o.textContent.replace(/（.*）/, '') + '（クリア後）'; });
  });
  const td = document.getElementById('title-diff');
  const syncTitle = () => { if (game) td.value = String(game.settings.diff ?? 1); };
  td.addEventListener('change', () => { if (!game) return; game.settings.diff = +td.value; saveSettings(game.settings); game.settingsSync?.(); });
  setInterval(syncTitle, 1000); setTimeout(syncTitle, 200);
}
document.getElementById('open-settings').addEventListener('click', () => game && game.toggleSettings(true));
document.getElementById('pause-settings').addEventListener('click', (e) => { e.stopPropagation(); game && game.toggleSettings(true); });
addEventListener('pointerdown', () => { if (game && game.overview) game.overview = null; }, true);
document.getElementById('minimap').addEventListener('pointerdown', (e) => { e.stopPropagation(); game && game.toggleMap(true); });
document.getElementById('bigmap').addEventListener('pointerdown', (e) => { e.stopPropagation(); game && game.toggleMap(false); });
document.getElementById('retry').addEventListener('click', () => location.reload());
