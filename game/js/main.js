// がんばれマサトくん！ ― メインループと進行管理
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { buildWorld, landRadius } from './world.js';
import { Weather } from './weather.js';
import { Cabbages } from './cabbages.js';
import { Player } from './player.js';
import { Threats } from './threats.js';
import { Towers, TOWER_TYPES } from './towers.js';
import { FX } from './fx.js';
import { GameAudio } from './audio.js';
import { HUD } from './hud.js';
import { clamp, rand } from './util.js';

const QUALITY = {
  low: { pr: 0.75, shadow: 0, grass: 0, trees: 0.5, rain: 3000, bloom: false, msaa: 0 },
  mid: { pr: 1, shadow: 1024, grass: 18000, trees: 0.8, rain: 6000, bloom: true, msaa: 0 },
  high: { pr: Math.min(devicePixelRatio, 1.5), shadow: 2048, grass: 45000, trees: 1, rain: 10000, bloom: true, msaa: 4 },
  ultra: { pr: Math.min(devicePixelRatio, 2), shadow: 4096, grass: 90000, trees: 1.3, rain: 16000, bloom: true, msaa: 4 },
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
      col = mix(col, col*vec3(1.06,1.,.9), (1.-uStorm)*.55);
      col = (col - .5)*(1.04 + uStorm*.12) + .5;
      col += uFlash*vec3(.75,.8,1.)*.6;
      col = mix(col, col*vec3(1.12,.9,1.25) + vec3(.03,0.,.07), uSolo*.55);
      col *= 1. - r*uVig*(1. + uStorm*.5);
      float g = fract(sin(dot(vUv*(uTime+1.), vec2(12.9898,78.233)))*43758.5453);
      col += (g - .5)*.03;
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
    this.cabbages = new Cabbages(this.scene);
    this.fx = new FX(this.scene);
    this.player = new Player(this.scene, this.camera);
    this.towers = new Towers(this);
    this.threats = new Threats(this);
    this.threats.towers = this.towers;
    this.cabbages.onLost = () => this.audio.lost();

    // ポストプロセス
    const rt = new THREE.WebGLRenderTarget(innerWidth * Q.pr, innerHeight * Q.pr, { type: THREE.HalfFloatType, samples: Q.msaa });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.setPixelRatio(Q.pr);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (Q.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.45, 0.55, 0.92);
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
    this.spawn = { groups: 0, debris: 0, strike: 0, nextGroup: 0 };
    this.input = { f: false, b: false, l: false, r: false, sprint: false, jump: false };
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
          const t = TOWER_TYPES[+e.code.slice(-1) - 1];
          this.buildSel = this.buildSel === t.id ? null : t.id;
          if (!this.buildSel) this.towers.hidePreview();
          break;
        }
        case 'Enter': if (this.phase === 'prep') this.phaseT = Math.max(this.phaseT, this.prepLength() - 0.5); break;
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
    this.lockPointer();
    this.hud.toast('台風が来る前に、量子デバイスを畑のまわりに建てよう', 'q');
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
    this.player.model.strum();
    this.score.chords++;
    const p = this.player.pos.clone();
    const f = this.player.forward();
    const dmg = just ? 46 : 22;
    const res = this.threats.blast(p, just ? 17 : 13, dmg, { cone: new THREE.Vector2(f.x, f.z), inner: 9 });
    this.fx.ring(p, just ? '#ffd36a' : '#ff8a3d', just ? 17 : 13, 0.45, 0.7);
    if (just) {
      this.score.just++;
      this.hud.judge('JUST!', 'just');
      this.addSolo(res.hits ? 9 : 4);
      this.cabbages.heal(p.x, p.z, 10, 6);
      if (this.threats.tryReflect(p)) { /* 反射成功 */ }
    } else {
      this.hud.judge(b.frac < 0.5 ? 'LATE' : 'EARLY', 'miss');
    }
    if (res.unobserved && !res.hits) this.hud.toast('未観測の竜巻には干渉できない！［F］で観測しよう', 'bad');
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
  prepLength() { return this.wave === 0 ? 50 : 30; }
  waveLabel() {
    const w = WAVES[Math.min(this.wave, WAVES.length - 1)];
    return `${w.name}（${w.cls}）  ${Math.min(this.wave + 1, WAVES.length)} / ${WAVES.length}`;
  }
  phaseLabel() {
    return { prep: '準備：量子デバイスを建てよう', storm: '台風接近中 ― キャベツを守り抜け！', clear: '台風一過', result: '収穫', gameover: '全滅', title: '' }[this.phase];
  }
  timerLabel() {
    if (this.phase === 'prep') return `上陸まで ${Math.ceil(this.prepLength() - this.phaseT)} 秒  ［Enter］で迎え撃つ`;
    if (this.phase === 'storm') {
      const real = this.threats.activeReal + (WAVES[this.wave].groups - this.spawn.groups);
      return `残りの竜巻（実体） ${real}`;
    }
    return '';
  }

  startStorm() {
    const w = WAVES[this.wave];
    this.phase = 'storm';
    this.phaseT = 0;
    this.spawn = { groups: 0, debris: 3, strike: 6, nextGroup: 2 };
    const a = rand(-1.2, 0.6); // 海側（東〜南）から
    this.stormAngle = a;
    this.weather.typhoonCenter.set(Math.cos(a) * 1500, Math.sin(a) * 1500);
    this.weather.windDir.set(-Math.cos(a), -Math.sin(a)).normalize();
    this.weather.setStorm(w.peak);
    this.threats.dmgMul = 1 + this.wave * 0.08;
    this.hud.toast(`${w.name}が銚子に接近！ 最大風速 ${w.wind} m/s`, 'bad');
    this.audio.thunder(0.5);
  }

  endStorm() {
    this.phase = 'clear';
    this.phaseT = 0;
    this.weather.setStorm(0);
    this.threats.clearAll();
    const bonus = 30 + Math.floor(this.cabbages.alive / this.cabbages.total * 50);
    this.addQ(bonus);
    this.hud.toast(`${WAVES[this.wave].name}が通過した！ 生き残ったキャベツ ${this.cabbages.alive} 玉  +${bonus}Q`, 'good');
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
      if (this.wave === 0) this.tutorial();
      if (this.phaseT >= this.prepLength()) this.startStorm();
    } else if (this.phase === 'storm') {
      const w = WAVES[this.wave];
      const sp = this.spawn;
      this.q += dt * 0.6;
      if (this.phaseT > 6 && Math.random() < dt * 0.12 * w.peak) { this.weather.distantFlash(); this.audio.thunder(rand(0.8, 2), 0.35); }
      if (sp.groups < w.groups && this.phaseT >= sp.nextGroup) {
        this.threats.spawnGroup(this.wave, this.stormAngle);
        sp.groups++;
        sp.nextGroup = this.phaseT + rand(12, 20) - this.wave * 1.5;
        if (sp.groups === 1) this.hud.toast('竜巻が発生！ 紫に揺らぐのは「重ね合わせ状態」― どれが本物かは観測するまでわからない', 'q');
      }
      sp.debris -= dt;
      if (sp.debris <= 0 && this.phaseT > 8) { this.threats.spawnDebris(); sp.debris = w.debris * rand(0.7, 1.3); }
      sp.strike -= dt;
      if (sp.strike <= 0 && this.phaseT > 10) { this.threats.spawnStrike(); sp.strike = w.strike * rand(0.7, 1.3); }
      if (sp.groups >= w.groups && this.threats.activeReal === 0 && this.phaseT > 40) this.endStorm();
      if (this.phaseT > 200) this.endStorm();
    } else if (this.phase === 'clear') {
      if (this.phaseT > 8) {
        this.wave++;
        if (this.wave >= WAVES.length) { this.wave = WAVES.length - 1; this.finish(true); return; }
        this.phase = 'prep';
        this.phaseT = 0;
        this.hud.toast(`次は ${WAVES[this.wave].name}（${WAVES[this.wave].cls}）。備えよう`, 'q');
      }
    }
    if ((this.phase === 'storm' || this.phase === 'clear') && this.cabbages.alive < this.cabbages.total * 0.3) this.finish(false);
  }

  tutorial() {
    const steps = [
      [1, '［WASD］移動 ［Shift］ダッシュ ［Space］ジャンプ ［マウス］視点'],
      [7, '［1］観測塔 ［2］量子アンプ ［3］トンネル避雷塔 を選んで［E］で建設'],
      [15, '［左クリック］ギター！ 画面下の拍に合わせると JUST で威力2倍'],
      [23, '［F / 右クリック］観測パルス：重ね合わせの竜巻を収束させる'],
      [31, '［R］量子テレポート ［Q］ソロゲージ満タンで量子ギターソロ'],
      [39, '準備ができたら［Enter］で台風を迎え撃とう。［H］で操作一覧'],
    ];
    while (this.tutorialStep < steps.length && this.phaseT >= steps[this.tutorialStep][0]) {
      this.hud.toast(steps[this.tutorialStep][1], 'tip');
      this.tutorialStep++;
    }
  }

  // ---------- フレーム ----------
  frame() {
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

    w.update(rawDt, t, this.camera, this.player.pos);
    this.windU.uTime.value = t;
    this.windU.uWind.value = w.storm * 1.4;
    this.world.update(rawDt, t, w);
    this.cabbages.update(dt, t, w.storm);
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
    if (this.bloom) this.bloom.strength = 0.4 + w.flash * 0.8 + (this.player.soloOn ? 0.25 : 0);

    if (this.phase !== 'title') this.hud.update(this);
    this.composer.render();
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
const guess = /Mobi|Android/i.test(navigator.userAgent) ? 'low' : 'high';
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
