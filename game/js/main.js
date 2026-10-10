// がんばれマサトくん！ ― メインループと進行管理
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { buildWorld, heightAt, coastX } from './world.js';
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

const QUALITY = {
  low: { low: true, fps: 30, cabNear: 12, cabMid: 35, pr: 1, shadow: 0, grass: 6000, trees: 0.5, rain: 3000, bloom: false, msaa: 0 },
  mid: { fps: 60, cabNear: 35, cabMid: 110, pr: 1, shadow: 1024, grass: 18000, trees: 0.8, rain: 6000, bloom: true, msaa: 0 },
  high: { fps: 60, cabNear: 45, cabMid: 140, pr: Math.min(devicePixelRatio, 1.5), shadow: 2048, grass: 45000, trees: 1, rain: 10000, bloom: true, msaa: 4 },
  ultra: { cabNear: 70, cabMid: 180, pr: Math.min(devicePixelRatio, 2), shadow: 4096, grass: 90000, trees: 1.3, rain: 16000, bloom: true, msaa: 4 },
};

const WAVES = [
  { name: '台風1号', cls: '強い台風', peak: 0.6, groups: 2, debris: 3.6, strike: 6.5, wind: 33 },
  { name: '台風2号', cls: '非常に強い台風', peak: 0.72, groups: 3, debris: 3.0, strike: 5.2, wind: 44 },
  { name: '台風3号', cls: '非常に強い台風', peak: 0.82, groups: 4, debris: 2.4, strike: 4.2, wind: 50 },
  { name: '台風4号', cls: '猛烈な台風', peak: 0.92, groups: 5, debris: 1.9, strike: 3.4, wind: 58 },
  { name: '台風5号「量子嵐」', cls: '観測史上最大', peak: 1.0, groups: 6, debris: 1.5, strike: 2.6, wind: 72 },
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
    this.cabbages.onLost = () => this.audio.lost();
    // BotW 風のトゥーン表現に置き換え、マサトに輪郭線
    addOutline(this.player.model.root);
    toonify(this.scene);

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
    this.cd = { teleport: 0, observe: 0, chord: 0 };
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
        case 'KeyE': this.doBuild(); break;
        case 'KeyX': this.buildSel = null; this.towers.hidePreview(); break;
        case 'Digit1': case 'Digit2': case 'Digit3': {
          this.selectTower(TOWER_TYPES[+e.code.slice(-1) - 1].id);
          break;
        }
        case 'Enter': this.skipPrep(); break;
        case 'KeyH': document.getElementById('help').classList.toggle('show'); break;
        case 'KeyM': this.audio.musicOn = !this.audio.musicOn; this.hud.toast(this.audio.musicOn ? 'BGM オン' : 'BGM オフ'); break;
      }
    });
    addEventListener('keyup', (e) => { if (keymap[e.code]) this.input[keymap[e.code]] = false; });
    addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === canvas) this.player.look(e.movementX, e.movementY);
    });
    canvas.addEventListener('mousedown', (e) => {
      if (document.pointerLockElement !== canvas) { this.lockPointer(); return; }
      if (e.button === 0) this.doChord();
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

  start() {
    this.audio.init();
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
    this.hud.banner('がんばれマサトくん！', '台風から畑のキャベツを守れ！ まずは操作を覚えよう');
    this.tutorialTimer = setTimeout(() => { if (this.phase === 'prep' && this.wave === 0) this.setMission(0); }, 2600);
  }

  // ---------- アクション ----------
  addQ(n, pos) {
    this.q += n;
    if (pos) this.hud.floater(`+${n}Q`, pos, this.camera);
    this.audio.qGain();
  }
  addSolo(n) {
    const before = this.solo;
    this.solo = Math.min(100, this.solo + n);
    if (before < 100 && this.solo >= 100) this.hud.toast('量子ギターソロ 準備完了！［Q］', 'good');
  }

  doChord() {
    if (this.cd.chord > 0 || this.phase === 'result' || this.phase === 'gameover') return;
    this.cd.chord = 0.18;
    const b = this.audio.beatInfo();
    const just = b.offset < 0.11;
    this.audio.chord(just);
    this.score.chords++;
    // コンボ：拍に合わせて続けて弾くほど伸びる（2拍以上あくか外すと途切れる）
    if (just) {
      this.combo = b.idx - this.lastJustBeat <= 2 ? this.combo + 1 : 1;
      this.lastJustBeat = b.idx;
    } else {
      this.combo = 0;
    }
    const mult = 1 + Math.min(this.combo, 20) * 0.1;
    // 演奏アクション：外すと小さく、JUST で大きく、10コンボごとにギターを掲げる
    let kind = 'small';
    if (just) kind = this.combo % 10 === 0 ? 'raise' : this.combo >= 3 && this.combo % 2 ? 'jump' : 'windmill';
    this.player.model.strum(kind);
    const p = this.player.pos.clone();
    const f = this.player.forward();
    const dmg = (just ? 46 : 22) * mult;
    const reach = just ? 17 + Math.min(this.combo, 20) * 0.3 : 13;
    const res = this.threats.blast(p, reach, dmg, { cone: new THREE.Vector2(f.x, f.z), inner: 9, push: just ? 5 : 2, from: p });
    const gpos = p.clone().add(new THREE.Vector3(0, 1.3, 0));
    this.fx.ring(p, just ? '#ffd36a' : '#ff8a3d', reach, 0.45, 0.7);
    this.fx.soundWave(p, f, just ? '#ffd36a' : '#ff9a5a', reach, just ? 3 : 1);
    this.fx.notes(gpos, just ? 4 + Math.min(Math.floor(this.combo / 3), 4) : 2, undefined, just ? 1.2 : 0.7, f);
    if (just) {
      this.score.just++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.hud.judge(this.combo >= 2 ? `JUST! ×${this.combo}` : 'JUST!', 'just');
      this.hud.combo(this.combo, mult);
      this.fovKick = kind === 'raise' ? 1 : 0.55;
      this.player.shake = Math.max(this.player.shake, kind === 'raise' ? 0.5 : 0.28);
      this.addSolo(res.hits ? 9 : 4);
      this.cabbages.heal(p.x, p.z, 10, 6);
      this.threats.tryReflect(p);
      if (kind === 'raise') {
        this.fx.beam(p, '#ffd36a', 30, 1.6, 0.8, 0.6);
        this.fx.notes(gpos.clone().add(new THREE.Vector3(0, 1, 0)), 10, undefined, 1.8);
        this.hud.toast(`${this.combo} コンボ！ 会場（畑）が沸いている！`, 'good');
      }
      this.mission?.onJust?.();
    } else {
      this.hud.judge(b.frac < 0.5 ? 'おそい…' : 'はやい…', 'miss');
      this.hud.combo(0, 1);
    }
    if (res.unobserved && !res.hits) this.hud.toast('紫の竜巻（幻かも）には効かない！［F］観測で正体を暴こう', 'bad');
  }

  doObserve() {
    if (this.cd.observe > 0) return;
    if (this.q < 8) { this.hud.toast('Qビットが足りない（観測には 8Q）', 'bad'); return; }
    this.q -= 8;
    this.cd.observe = 4;
    const p = this.player.pos.clone().add(new THREE.Vector3(0, 1.5, 0));
    this.fx.sphere(p, '#b48cff', 48, 1.0);
    this.audio.observe();
    const n = this.threats.measure(p, 48, 'observe');
    if (!n) this.hud.toast('観測範囲（48m）に重ね合わせ状態の竜巻はなかった');
  }

  doTeleport() {
    if (this.cd.teleport > 0) return;
    const from = this.player.teleport(24);
    if (!from) return;
    this.cd.teleport = 3;
    this.fx.beam(from, '#6fe3ff', 6, 1.2, 0.5);
    this.fx.burst(from.clone().add(new THREE.Vector3(0, 1, 0)), '#6fe3ff', 40, 6, 0.6, 0.25, 0);
    this.fx.beam(this.player.pos, '#6fe3ff', 6, 1.2, 0.6);
    this.audio.teleport();
  }

  doSolo() {
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
    if (this.q < def.cost) { this.hud.toast(`Qビットが足りない（${def.name}：${def.cost}Q）`, 'bad'); return; }
    if (!this.towers.canPlace(pos)) { this.hud.toast('ここには建てられない', 'bad'); return; }
    this.q -= def.cost;
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
    const counts = { mushi: 6 + wv * 3, karasu: 3 + wv * 2, tsumuji: 2 + wv };
    this.plan = { angle: a, z0, counts, ghosts: 2 + Math.floor(wv / 2) };
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
  }

  clearLandMarker() { if (this.landMarker) { this.scene.remove(this.landMarker); this.landMarker = null; } }

  // 準備タイムのやることリスト
  prepChecklist() {
    const p = this.plan;
    if (!p) return;
    const left = Math.max(0, Math.ceil(this.prepLength() - this.phaseT));
    const amp = this.towers.list.some((t) => t.id === 'amp' && t.pos.distanceTo(p.landing) < 60);
    const lost = this.cabbages.lostCount();
    const T = IS_TOUCH;
    const items = [
      [amp, '赤い柱（上陸予想地点）の近くにスピーカーを建てる'],
      [lost === 0, lost ? `やられたキャベツを植え直す（跡地を歩くだけ・1玉 1Q）残り ${lost} 玉` : 'キャベツ畑は無傷'],
      [false, T ? `準備ができたら上のボタンで迎え撃つ（今なら +${left * 2}Q）` : `準備ができたら［Enter］で迎え撃つ（今なら +${left * 2}Q）`],
    ];
    const c = p.counts;
    this.hud.prep(`準備タイム ― ${this.waveName()}まで <b>${left}</b> 秒`,
      `予報：雑魚 ${c.mushi + c.karasu + c.tsumuji} 匹（青虫 ${c.mushi}・カラス ${c.karasu}・つむじ風 ${c.tsumuji}）→ 大ボス（分身 ${p.ghosts} 体）`, items);
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

  prepLength() { return this.wave === 0 ? 60 : 40; }
  waveName() { return WAVES[Math.min(this.wave, WAVES.length - 1)].name.replace(/「.*」/, ''); }

  waveLabel() {
    const w = WAVES[Math.min(this.wave, WAVES.length - 1)];
    return `${w.name}（${w.cls}）  ${Math.min(this.wave + 1, WAVES.length)} / ${WAVES.length}`;
  }
  phaseLabel() {
    return { prep: this.mission ? '練習中：操作を覚えよう' : '準備タイム：次の台風に備えよう', storm: '台風接近中 ― キャベツを守り抜け！', clear: '台風一過', result: '収穫', gameover: '全滅', title: '' }[this.phase];
  }
  minionsLeft() { return this.spawn.pool.length + this.threats.minionsAlive; }

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
    pool.sort(() => Math.random() - 0.5);
    this.spawn = { pool, total: pool.length, next: 1.5, boss: false, debris: 6, strike: 14 };
    this.threats.minionKills = 0;
    const a = this.plan.angle; // 予報どおり東の海から
    this.stormAngle = a;
    this.threats.landZ = this.plan.z0;
    this.clearLandMarker();
    this.weather.typhoonCenter.set(Math.cos(a) * 1500, Math.sin(a) * 1500);
    this.weather.windDir.set(-Math.cos(a), -Math.sin(a)).normalize();
    this.weather.setStorm(w.peak * 0.7);
    this.threats.dmgMul = 1 + this.wave * 0.08;
    this.hud.banner(`${w.name} 接近！`, `まずは前ぶれの雑魚 ${pool.length} 匹が畑を狙ってくる！`);
    this.audio.thunder(0.5);
  }

  spawnBoss() {
    const w = WAVES[this.wave];
    this.spawn.boss = true;
    this.threats.spawnBoss(this.wave, this.stormAngle);
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
    const bonus = 30 + Math.floor(this.cabbages.alive / this.cabbages.total * 50);
    this.addQ(bonus);
    this.hud.banner('台風一過！', `キャベツ ${this.cabbages.alive} 玉を守り抜いた  +${bonus}Q`);
    this.audio.fanfare();
  }

  finish(win) {
    this.phase = win ? 'result' : 'gameover';
    this.paused = true;
    document.exitPointerLock && document.exitPointerLock();
    const cab = this.cabbages, st = this.threats.stats;
    const ratio = cab.alive / cab.total;
    const rank = !win ? '—' : ratio >= 0.9 ? 'S' : ratio >= 0.75 ? 'A' : ratio >= 0.55 ? 'B' : 'C';
    const score = cab.alive * 1000 + this.score.just * 50 + st.tornados * 500 + st.reflected * 300 + st.absorbed * 100;
    const el = document.getElementById('result');
    el.querySelector('h2').textContent = win ? '収穫だ！ キャベツを守り抜いた！' : 'キャベツ畑が壊滅してしまった…';
    el.querySelector('.rank').textContent = rank;
    el.querySelector('.stats').innerHTML = `
      <li><span>守り抜いたキャベツ</span><b>${cab.alive} / ${cab.total} 玉</b></li>
      <li><span>到達した台風</span><b>${Math.min(this.wave + 1, WAVES.length)} / ${WAVES.length}</b></li>
      <li><span>消滅させた竜巻</span><b>${st.tornados}</b></li>
      <li><span>波動関数の収束</span><b>${st.collapsed} 回</b></li>
      <li><span>JUST 判定</span><b>${this.score.just} / ${this.score.chords}</b></li>
      <li><span>弾き返した雷 / 吸収した雷</span><b>${st.reflected} / ${st.absorbed}</b></li>
      <li class="total"><span>スコア</span><b>${score.toLocaleString()}</b></li>`;
    el.classList.add('show');
    document.getElementById('hud').classList.remove('show');
    if (win) this.audio.fanfare();
  }

  updatePhase(dt) {
    this.phaseT += dt;
    if (this.phase === 'prep') {
      this.q += dt * 1.5;
      if (this.mission) { this.updateMission(); this.phaseT = Math.min(this.phaseT, this.prepLength() - 5); }
      if (this.phaseT >= this.prepLength()) this.startStorm();
    } else if (this.phase === 'storm') {
      const w = WAVES[this.wave];
      const sp = this.spawn;
      this.q += dt * 0.6;
      if (this.phaseT > 6 && Math.random() < dt * 0.12 * w.peak) { this.weather.distantFlash(); this.audio.thunder(rand(0.8, 2), 0.35); }
      // 雑魚を少しずつ送り込む
      sp.next -= dt;
      if (sp.pool.length && sp.next <= 0) {
        const type = sp.pool.pop();
        this.threats.spawnMinion(type, this.wave);
        sp.next = Math.max(0.5, 2.2 - this.wave * 0.3) * rand(0.6, 1.3);
        if (sp.pool.length === sp.total - 1) this.hud.toast('雑魚がやってきた！ 近づいてギターで倒そう（スピーカーも自動で撃つ）', 'q');
      }
      // 雑魚を全部倒すか 80 秒たったら大ボス
      if (!sp.boss && ((!sp.pool.length && this.threats.minionsAlive === 0) || this.phaseT > 80)) this.spawnBoss();
      if (sp.boss) {
        sp.debris -= dt;
        if (sp.debris <= 0) { this.threats.spawnDebris(); sp.debris = w.debris * rand(0.7, 1.3); }
      }
      sp.strike -= dt;
      if (sp.strike <= 0 && this.phaseT > 15) { this.threats.spawnStrike(); sp.strike = w.strike * rand(0.8, 1.5); }
      if (sp.boss && !this.threats.bossAlive) this.endStorm();
      if (this.phaseT > 260) this.endStorm();
    } else if (this.phase === 'clear') {
      if (this.phaseT > 8) {
        this.wave++;
        if (this.wave >= WAVES.length) { this.wave = WAVES.length - 1; this.finish(true); return; }
        this.phase = 'prep';
        this.phaseT = 0;
        this.makePlan();
        this.hud.banner('準備タイム', `${this.waveName()}が来る前に、畑を立て直してタワーで備えよう`);
      }
    }
    if ((this.phase === 'storm' || this.phase === 'clear') && this.cabbages.alive < this.cabbages.total * 0.3) this.finish(false);
  }

  // ---------- 体験しながら覚えるチュートリアル ----------
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
        text: T ? 'ギターボタンが光った瞬間に押そう！ JUST を3回' : '下のレーンの音符が輪に重なる瞬間にクリック！ JUST を3回',
        start: () => { this.clearMarker(); this.mJust = 0; },
        onJust: () => { this.mJust++; },
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
    const rawDt = Math.min(this.clock.getDelta(), 0.05);
    const dt = this.paused ? 0 : rawDt;
    this.time += rawDt;
    const t = this.time;

    if (!this.paused && this.phase !== 'title') {
      this.updatePhase(dt);
      for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt);

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

    w.update(rawDt, t, this.camera, this.player.pos);
    this.windU.uTime.value = t;
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
    // JUST の瞬間にカメラをぐっと寄せる
    this.fovKick = Math.max(0, this.fovKick - rawDt * 3.5);
    const fov = 62 - this.fovKick * 9 + (this.player.soloOn ? -6 : 0);
    if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    if (this.phase === 'storm') {
      const sub = `キャベツ ${this.cabbages.alive} 玉（${Math.ceil(this.cabbages.total * 0.3)} 玉を切ると負け）`;
      if (this.spawn.boss) this.hud.objective(`大ボス「${WAVES[this.wave].name}の目」を倒せ！`, sub);
      else this.hud.objective(`前ぶれの雑魚を倒せ！ 残り <b>${this.minionsLeft()}</b> 匹`, sub);
    } else if (this.phase === 'prep' && !this.mission) {
      this.prepChecklist();
      // やられたキャベツの跡地を歩くと植え直す（1玉 1Q）
      if (!this.paused && this.q >= 1) {
        const n = this.cabbages.replantNear(this.player.pos.x, this.player.pos.z, 3.2, Math.floor(this.q));
        if (n) { this.q -= n; this.replantFx = (this.replantFx || 0) + n; }
        if (this.replantFx >= 5) { this.hud.floater(`植え直し ×${this.replantFx}`, this.player.pos.clone().add(new THREE.Vector3(0, 2.5, 0)), this.camera, '#9fe05a'); this.replantFx = 0; }
      }
    }
    if (this.bloom) this.bloom.strength = 0.3 + w.flash * 0.8 + (this.player.soloOn ? 0.25 : 0);

    if (this.phase !== 'title') { this.hud.update(this); if (IS_TOUCH) updateTouch(this); }
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
document.getElementById('start').addEventListener('click', () => game && game.start());
document.getElementById('retry').addEventListener('click', () => location.reload());
