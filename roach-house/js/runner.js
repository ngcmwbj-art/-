// おまけステージ「にげろ！田んぼ道」：出荷トラックの荷台から飛びおりて、夜明けの田んぼ道を走って逃げる
// 操作は左右とダッシュだけ。うしろから農場主の軽トラが追ってくる。となりのハウスにとびこめばゴール
import * as THREE from 'three';
import { makeRoach, animateRoach, makeHat, disposeObject } from './models.js';
import * as TX from './textures.js';

const L = 230;          // ゴールまでの長さ
const HALF = 1.7;       // 道の半分の幅（ゴキブリが動ける所）
const BASE = 5.2, DASH = 7.8;
// 夕方の農道：ため池の橋（道がせまい）と、道の半分をふさぐコンバイン
const BRIDGE = { x0: 108, x1: 126, half: 0.95 };
const COMBINE = { x: 172, len: 6.5 };

export class Runner {
  constructor({ scene, camera, sfx, ui }) {
    this.scene = scene; this.camera = camera; this.sfx = sfx; this.ui = ui;
    this.active = false;
    this.root = null;
  }

  // ---------- 景色（はじめて遊ぶときに1回だけ作る） ----------
  build() {
    const g = new THREE.Group();
    this.root = g;
    const dirt = TX.dirt ? TX.dirt() : null;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(L + 40, 4.6), new THREE.MeshStandardMaterial({ color: 0x9a8064, roughness: 1, map: dirt && dirt.map ? dirt.map : null }));
    if (road.material.map) { road.material.map = road.material.map.clone(); road.material.map.repeat.set(60, 1.2); road.material.map.needsUpdate = true; }
    road.rotation.x = -Math.PI / 2; road.position.set(L / 2, 0, 0); road.receiveShadow = true;
    g.add(road);
    // わだち
    for (const z of [-0.9, 0.9]) {
      const rut = new THREE.Mesh(new THREE.PlaneGeometry(L + 40, 0.35), new THREE.MeshStandardMaterial({ color: 0x7a6248, roughness: 1 }));
      rut.rotation.x = -Math.PI / 2; rut.position.set(L / 2, 0.004, z);
      g.add(rut);
    }
    // あぜの草と、田んぼの水と苗
    for (const s of [-1, 1]) {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(L + 40, 0.25, 0.9), new THREE.MeshStandardMaterial({ color: 0x5f8f3a, roughness: 1 }));
      bank.position.set(L / 2, 0.1, s * 2.75); bank.receiveShadow = true;
      const water = new THREE.Mesh(new THREE.PlaneGeometry(L + 40, 30), new THREE.MeshStandardMaterial({ color: 0x5d7d86, roughness: 0.08, metalness: 0.35 }));
      water.rotation.x = -Math.PI / 2; water.position.set(L / 2, -0.12, s * 18.2);
      g.add(bank, water);
    }
    const n = 2400;
    const sprouts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 0.55, 4), new THREE.MeshStandardMaterial({ color: 0x6fae3c, roughness: 0.8 }), n);
    const d = new THREE.Object3D();
    let k = 0;
    for (let i = 0; k < n && i < 1000; i++) for (const s of [-1, 1]) {
      for (let j = 0; j < 3 && k < n; j++) {
        d.position.set(-10 + i * 0.95 + (j % 2) * 0.4, 0.12, s * (4.2 + j * 1.1 + (i % 3) * 0.35));
        d.rotation.set((Math.sin(i * 7 + j) * 0.15), 0, Math.cos(i * 3 + j) * 0.15);
        d.updateMatrix(); sprouts.setMatrixAt(k++, d.matrix);
      }
    }
    sprouts.count = k;
    g.add(sprouts);
    // 電柱と、遠くの山
    const pole = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.9 });
    for (let x = 0; x < L + 30; x += 22) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 6, 8), pole);
      p.position.set(x, 3, -3.6); p.castShadow = true;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.4), pole);
      arm.position.set(x, 5.6, -3.6);
      g.add(p, arm);
    }
    const mtn = new THREE.MeshStandardMaterial({ color: 0x4e6a78, roughness: 1 });
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(24 + (i % 3) * 8, 14 + (i % 2) * 8, 6), mtn);
      m.position.set(i * 34 - 20, 4, (i % 2 ? -1 : 1) * (60 + (i % 3) * 12));
      g.add(m);
    }
    // ゴールのハウス（となりのパプリカハウス）
    const house = new THREE.Group();
    const film = new THREE.MeshStandardMaterial({ color: 0xeaf2f0, transparent: true, opacity: 0.45, roughness: 0.2, side: THREE.DoubleSide });
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 12, 20, 1, true, 0, Math.PI), film);
    hull.rotation.z = Math.PI / 2; hull.rotation.y = Math.PI / 2; hull.position.set(6, 0, 0);
    const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.2), new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: 0.85 }));
    doorGlow.rotation.y = -Math.PI / 2; doorGlow.position.set(0.05, 1.6, 0);
    const plants = new THREE.Mesh(new THREE.BoxGeometry(10, 2.2, 6), new THREE.MeshStandardMaterial({ color: 0x3f7a2e, roughness: 1 }));
    plants.position.set(6.5, 1.1, 0);
    house.add(hull, doorGlow, plants);
    house.position.set(L, 0, 0);
    g.add(house);
    // 追ってくる軽トラ（白い車体・荷台・ライト）と運転席の農場主
    const truck = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xf3f3ee, roughness: 0.35, metalness: 0.2 });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 1.8), white); cab.position.set(0.9, 1.25, 0); cab.castShadow = true;
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.8), white); bed.position.set(-0.9, 0.75, 0); bed.castShadow = true;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.7), new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.1, metalness: 0.6 }));
    glass.rotation.y = Math.PI / 2; glass.position.set(1.61, 1.55, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.9 }));
    head.position.set(1.2, 1.6, 0.35);
    const lights = [];
    for (const s of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
      l.rotation.y = Math.PI / 2; l.position.set(1.61, 0.85, s * 0.6);
      truck.add(l); lights.push(l);
    }
    const dark = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.7 });
    for (const [x, z] of [[1, 0.85], [1, -0.85], [-1.2, 0.85], [-1.2, -0.85]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16), dark);
      w.rotation.x = Math.PI / 2; w.position.set(x, 0.4, z);
      truck.add(w);
    }
    const beam = new THREE.SpotLight(0xfff1c8, 40, 22, 0.5, 0.5, 1.2);
    beam.position.set(1.7, 0.9, 0); beam.target.position.set(10, 0, 0);
    truck.add(cab, bed, glass, head, beam, beam.target);
    g.add(truck);
    this.truck = truck;
    // うしろ見：軽トラのライトが道を照らし、ゴキブリの影が前へ長くのびる（近づくほど強く）
    const gc = document.createElement('canvas'); gc.width = 64; gc.height = 256;
    const gx = gc.getContext('2d');
    const gr = gx.createLinearGradient(0, 256, 0, 0);
    gr.addColorStop(0, 'rgba(255,244,200,0.9)'); gr.addColorStop(1, 'rgba(255,244,200,0)');
    gx.fillStyle = gr; gx.fillRect(0, 0, 64, 256);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    gl.rotation.x = -Math.PI / 2; gl.rotation.z = -Math.PI / 2; gl.position.y = 0.02;
    g.add(gl);
    this.glow = gl;
    const shadowC = document.createElement('canvas'); shadowC.width = 32; shadowC.height = 128;
    const sx = shadowC.getContext('2d');
    const sg = sx.createLinearGradient(0, 128, 0, 0);
    sg.addColorStop(0, 'rgba(0,0,0,0.75)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    sx.fillStyle = sg; sx.beginPath(); sx.ellipse(16, 64, 14, 64, 0, 0, Math.PI * 2); sx.fill();
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowC), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.rotation.z = -Math.PI / 2; sh.position.y = 0.03;
    g.add(sh);
    this.longShadow = sh;
    // ゴールまでの目じるしの旗
    for (let x = 50; x < L; x += 50) {
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshBasicMaterial({ color: 0xe0412b, side: THREE.DoubleSide }));
      fl.position.set(x, 1.6, 2.4);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 5), pole);
      st.position.set(x - 0.3, 0.9, 2.4);
      g.add(fl, st);
    }
    // 夕方のコース用：空の色（大きな丸天井）・ため池の橋・コンバイン
    const sc = document.createElement('canvas'); sc.width = 4; sc.height = 256;
    const sx2 = sc.getContext('2d');
    const sgr = sx2.createLinearGradient(0, 0, 0, 256);
    sgr.addColorStop(0, '#2c2f63'); sgr.addColorStop(0.45, '#c8607a'); sgr.addColorStop(0.62, '#f29a4a'); sgr.addColorStop(0.75, '#f8d08a'); sgr.addColorStop(1, '#6a4a3a');
    sx2.fillStyle = sgr; sx2.fillRect(0, 0, 4, 256);
    const skyT = new THREE.CanvasTexture(sc); skyT.colorSpace = THREE.SRGBColorSpace;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(260, 24, 16), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false, depthWrite: false }));
    dome.position.set(L / 2, 0, 0);
    const sunset = new THREE.DirectionalLight(0xffa060, 1.6);
    sunset.position.set(L + 60, 25, -40);
    sunset.target.position.set(L / 2, 0, 0);
    const pond = new THREE.Mesh(new THREE.PlaneGeometry(BRIDGE.x1 - BRIDGE.x0 + 10, 40), new THREE.MeshStandardMaterial({ color: 0x3c5a68, roughness: 0.05, metalness: 0.5 }));
    pond.rotation.x = -Math.PI / 2; pond.position.set((BRIDGE.x0 + BRIDGE.x1) / 2, -0.05, 0);
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a5534, roughness: 0.9 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(BRIDGE.x1 - BRIDGE.x0, 0.2, BRIDGE.half * 2 + 0.4), wood);
    deck.position.set((BRIDGE.x0 + BRIDGE.x1) / 2, 0.0, 0); deck.receiveShadow = true;
    const bridge = new THREE.Group();
    bridge.add(pond, deck);
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(BRIDGE.x1 - BRIDGE.x0, 0.08, 0.08), wood);
      rail.position.set((BRIDGE.x0 + BRIDGE.x1) / 2, 0.7, s * (BRIDGE.half + 0.2));
      bridge.add(rail);
      for (let x = BRIDGE.x0; x <= BRIDGE.x1; x += 2) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), wood);
        post.position.set(x, 0.37, s * (BRIDGE.half + 0.2));
        bridge.add(post);
      }
    }
    const comb = new THREE.Group();
    const red = new THREE.MeshStandardMaterial({ color: 0xc8241a, roughness: 0.45, metalness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(COMBINE.len, 2.2, 2.0), red); body.position.set(0, 1.5, -1.0); body.castShadow = true;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), new THREE.MeshStandardMaterial({ color: 0x9fc0d0, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.7 }));
    cabin.position.set(-1.6, 3.2, -1.0);
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.4, 12, 1, false), new THREE.MeshStandardMaterial({ color: 0xf2c31b, roughness: 0.5 }));
    reel.rotation.x = Math.PI / 2; reel.position.set(-COMBINE.len / 2 - 0.4, 0.8, -1.0);
    const tread = new THREE.Mesh(new THREE.BoxGeometry(COMBINE.len, 0.7, 2.1), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 }));
    tread.position.set(0, 0.35, -1.0);
    comb.add(body, cabin, reel, tread);
    comb.position.set(COMBINE.x, 0, 0);
    this.reel = reel;
    this.dusk = new THREE.Group();
    this.dusk.add(dome, sunset, sunset.target, bridge, comb);
    this.dusk.visible = false;
    g.add(this.dusk);
    g.visible = false;
    this.scene.add(g);
    this.items = new THREE.Group();
    g.add(this.items);
  }

  // ---------- じゃまものと、拾うもの ----------
  layout(seed) {
    for (const o of [...this.items.children]) { this.items.remove(o); disposeObject(o); }
    let s = seed || 1;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    this.obs = [];
    const add = (kind, x, z, extra = {}) => {
      let m;
      if (kind === 'puddle') {
        m = new THREE.Mesh(new THREE.CircleGeometry(0.75, 20), new THREE.MeshStandardMaterial({ color: 0x48606c, roughness: 0.05, metalness: 0.4 }));
        m.rotation.x = -Math.PI / 2; m.scale.set(1.5, 1, 1); m.position.set(x, 0.01, z);
      } else if (kind === 'stone') {
        m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), new THREE.MeshStandardMaterial({ color: 0x8c8a84, roughness: 0.9 }));
        m.scale.set(1.2, 0.7, 1); m.position.set(x, 0.18, z); m.castShadow = true;
      } else if (kind === 'frog') {
        m = new THREE.Group();
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: 0x5fae3a, roughness: 0.5 }));
        body.scale.set(1.1, 0.7, 1);
        for (const e of [-1, 1]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshStandardMaterial({ color: 0x111111 }));
          eye.position.set(0.12, 0.12, e * 0.09); body.add(eye);
        }
        m.add(body); m.position.set(x, 0.15, z);
      } else {
        const cols = [0xc0170d, 0xf2b705, 0xec5f0a];
        m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshStandardMaterial({ color: cols[Math.floor(r() * 3)], roughness: 0.3, emissive: 0x331100, emissiveIntensity: 0.3 }));
        m.scale.set(1, 0.8, 1); m.position.set(x, 0.2, z);
      }
      this.items.add(m);
      this.obs.push({ kind, x, z, m, hit: false, ...extra });
    };
    for (let x = 18; x < L - 8; x += 5.5 + r() * 4) {
      if (this.course === 'dusk' && ((x > BRIDGE.x0 - 4 && x < BRIDGE.x1 + 3) || Math.abs(x - COMBINE.x) < COMBINE.len)) continue;
      const t = r();
      const z = (r() * 2 - 1) * (HALF - 0.3);
      if (t < 0.32) add('puddle', x, z);
      else if (t < 0.58) add('stone', x, z);
      else if (t < 0.72) add('frog', x, z, { dir: r() < 0.5 ? 1 : -1, hop: r() * 2 });
      // パプリカのかけらは、じゃまもののよこに置く（取りにいくかの判断）
      if (r() < 0.75) add('bit', x + 1.5 + r() * 1.5, Math.max(-HALF + 0.2, Math.min(HALF - 0.2, -z * 0.8 + (r() - 0.5))));
    }
  }

  start(opts = {}) {
    if (!this.root) this.build();
    this.course = opts.course === 'dusk' ? 'dusk' : 'dawn';
    this.dusk.visible = this.course === 'dusk';
    this.layout((opts.seed || 20261105) + (this.course === 'dusk' ? 77 : 0));
    this.opts = opts;
    if (this.roach) { this.root.remove(this.roach.root); }
    this.roach = makeRoach(false, opts.wing || 'normal', opts.pattern || 'none');
    if (opts.hat && opts.hat !== 'none') { const h = makeHat(opts.hat); h.position.set(0, 0.13, 0.24); h.rotation.x = -0.2; h.scale.setScalar(1.5); this.roach.body.add(h); }
    this.roach.root.rotation.y = Math.PI / 2; // +x の方向へ走る
    this.root.add(this.roach.root);
    this.root.visible = true;
    Object.assign(this, { active: true, x: 0, z: 0, vz: 0, speed: 0, stam: 100, slowT: 0, stunT: 0, bits: 0, t: 0, count: 3, truckX: -10, done: null, phase: 0, shoutT: 0 });
    this.truck.position.set(this.truckX, 0, 0);
    this.sfx.startEngine && this.sfx.startEngine();
  }

  stop() {
    this.active = false;
    if (this.root) this.root.visible = false;
    this.sfx.stopEngine && this.sfx.stopEngine();
  }

  // ---------- 毎フレーム ----------
  update(dt, inp) {
    if (!this.active) return;
    const cam = this.camera;
    // 3・2・1 の合図
    if (this.count > 0) {
      const before = Math.ceil(this.count);
      this.count -= dt;
      if (Math.ceil(this.count) !== before && this.count > 0) this.sfx.click();
      if (this.count <= 0) { this.sfx.nice(); this.ui.say('待てコラァ！ 逃がすかよ！'); }
    } else if (!this.done) {
      this.t += dt;
      const dash = (inp.dash || inp.actionHeld) && this.stam > 5;
      this.stam = Math.max(0, Math.min(100, this.stam + (dash ? -32 : 14) * dt));
      let target = dash ? DASH : BASE;
      if (this.slowT > 0) { this.slowT -= dt; target *= 0.5; }
      if (this.stunT > 0) { this.stunT -= dt; target = 0; }
      this.speed += (target - this.speed) * Math.min(1, dt * 4);
      // 左右（カメラはいつも走る向きの後ろなので、スティックの左右がそのまま左右）
      const side = -(inp.mx || 0);
      this.vz += (side * 3.4 - this.vz) * Math.min(1, dt * 10);
      // ため池の橋の上は道がせまい
      const half = this.course === 'dusk' && this.x > BRIDGE.x0 && this.x < BRIDGE.x1 ? BRIDGE.half : HALF;
      this.z = Math.max(-half, Math.min(half, this.z + this.vz * dt));
      this.x += this.speed * dt;
      // 道の左半分をふさぐコンバイン：ぶつかるとつまずいて、右へはじかれる
      if (this.course === 'dusk' && Math.abs(this.x - COMBINE.x) < COMBINE.len / 2 + 0.3 && this.z < 0.15 && this.stunT <= 0) {
        this.stunT = 0.6; this.z = 0.5; this.x -= 0.6;
        this.sfx.thud(); this.ui.feed('コンバインにぶつかった！ 右へよけよう', '！', 'bad');
      }
      // 軽トラ：だんだん速くなる
      const tv = Math.min(5.9, 4.5 + this.t * 0.03);
      this.truckX += tv * dt;
      // ぶつかり・拾う
      for (const o of this.obs) {
        if (o.hit) continue;
        if (o.kind === 'frog') {
          o.hop -= dt;
          if (o.hop <= 0) { o.hop = 1.6; o.z += o.dir * 0.9; if (Math.abs(o.z) > HALF) { o.dir *= -1; o.z = Math.sign(o.z) * HALF; } }
          o.m.position.z += (o.z - o.m.position.z) * Math.min(1, dt * 8);
          o.m.position.y = 0.15 + Math.max(0, Math.sin((1.6 - o.hop) * Math.PI / 0.4)) * 0.3 * (o.hop > 1.2 ? 1 : 0);
        }
        const dx = o.x - this.x, dz = o.m.position.z - this.z;
        if (Math.abs(dx) > 0.6 || Math.abs(dz) > (o.kind === 'puddle' ? 1.0 : 0.5)) continue;
        o.hit = true;
        if (o.kind === 'bit') { this.bits++; this.stam = Math.min(100, this.stam + 25); o.m.visible = false; this.sfx.nice(); }
        else if (o.kind === 'puddle') { this.slowT = 0.9; this.sfx.thud(); this.ui.feed('水たまり！ 足がおそくなった', '水', 'bad'); }
        else { this.stunT = 0.45; this.sfx.thump ? this.sfx.thump() : this.sfx.thud(); this.ui.feed(o.kind === 'frog' ? 'カエルにぶつかった！' : '石につまずいた！', '！', 'bad'); }
      }
      // 勝ち負け
      const gap = this.x - (this.truckX + 1.7);
      this.shoutT -= dt;
      if (gap < 4 && this.shoutT <= 0) { this.shoutT = 4; this.ui.say(pickOne(['もうちょいだ…つかまえてやる！', 'どけどけぇ！', 'このゴキブリが！'])); }
      if (gap < 0.4) this.finish(false);
      else if (this.x >= L) this.finish(true);
      this.sfx.updateEngine && this.sfx.updateEngine(Math.max(0, 1 - gap / 14));
    } else {
      // ゴールのあと：ハウスに入っていく／つかまったら止まる
      this.doneT += dt;
      if (this.done === 'win') this.x += 3 * dt;
      else this.truckX += Math.max(0, 2 - this.doneT) * dt;
    }
    // 見た目
    this.phase += this.speed * dt * 6;
    const m = this.roach;
    m.root.position.set(this.x, 0, this.z);
    m.root.rotation.y = Math.PI / 2 - this.vz * 0.12;
    animateRoach(m, this.phase, this.speed > 0.3 ? 1 : 0, this.t, false);
    m.body.rotation.z = this.stunT > 0 ? Math.sin(this.t * 40) * 0.2 : 0;
    this.truck.position.set(this.truckX, Math.sin(this.t * 18) * 0.02, this.z * 0.3);
    if (this.reel) this.reel.rotation.y += dt * 3;
    // ライトの光（軽トラの前からゴキブリの足もとまで）と、前へのびる影
    const gapNow = this.x - (this.truckX + 1.7);
    const k = Math.max(0, Math.min(1, 1 - gapNow / 12));
    const len = Math.max(0.5, gapNow + 2.5);
    this.glow.scale.set(len, 2.6, 1);
    this.glow.position.set(this.truckX + 1.7 + len / 2, 0.02, this.z * 0.3);
    this.glow.material.opacity = 0.15 + k * 0.75;
    const sl = 0.4 + k * 3.2;
    this.longShadow.scale.set(sl, 0.42, 1);
    this.longShadow.position.set(this.x + sl / 2 + 0.1, 0.03, this.z);
    this.longShadow.material.opacity = 0.2 + k * 0.7;
    // カメラ：ゴキブリのうしろ少し上から、行く先を見る
    const gap = this.x - (this.truckX + 1.7);
    const shake = gap < 4 ? (4 - gap) * 0.02 : 0;
    // 軽トラが近づくとカメラを上げて、うしろにせまる軽トラも見えるように（荷台にめりこまない高さ）
    const near = Math.max(0, Math.min(4, 6 - gap));
    const up = near * 0.6;
    cam.position.set(this.x - 5.2 + near * 0.45, 2.5 + up + (Math.random() - 0.5) * shake, this.z * 0.6 + (Math.random() - 0.5) * shake);
    cam.lookAt(this.x + 3.5, 0.2, this.z * 0.5);
    this.gap = gap;
  }

  finish(win) {
    this.done = win ? 'win' : 'lose';
    this.doneT = 0;
    if (win) { this.sfx.win(); this.ui.say('くそぉ…となりのハウスに逃げこまれた！'); } else { this.sfx.lose(); this.ui.say('つかまえたぞ！ 今日もおれの勝ちだな'); }
    this.sfx.stopEngine && this.sfx.stopEngine();
    this.result = { win, time: this.t, bits: this.bits, dist: Math.min(L, this.x), course: this.course };
    setTimeout(() => this.ui.runOver && this.ui.runOver(this.result), 1300);
  }

  get progress() { return Math.max(0, Math.min(1, this.x / L)); }
  get truckProgress() { return Math.max(0, Math.min(1, (this.truckX + 1.7) / L)); }
}
function pickOne(a) { return a[Math.floor(Math.random() * a.length)]; }
