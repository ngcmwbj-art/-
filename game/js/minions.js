// 台風の前ぶれに押し寄せる雑魚キャラ：青虫（森から這ってくる）・カラス（空から急降下）
import * as THREE from 'three';
import { groundAt, BOUNDS } from './world.js';
import { rand } from './util.js';
import { toToon } from './toon.js';

const MAT = {
  mushi: new THREE.MeshStandardMaterial({ color: '#7cc04a', roughness: 0.6 }),
  mushiBelly: new THREE.MeshStandardMaterial({ color: '#c9e67a', roughness: 0.6 }),
  dot: new THREE.MeshStandardMaterial({ color: '#f2d24a', roughness: 0.5 }),
  eye: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.3 }),
  white: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 }),
  crow: new THREE.MeshStandardMaterial({ color: '#1d1f26', roughness: 0.45 }),
  crowWing: new THREE.MeshStandardMaterial({ color: '#2a2d38', roughness: 0.5, side: THREE.DoubleSide }),
  beak: new THREE.MeshStandardMaterial({ color: '#3b3a36', roughness: 0.4 }),
  boar: new THREE.MeshStandardMaterial({ color: '#5a4030', roughness: 0.85 }),
  boarDark: new THREE.MeshStandardMaterial({ color: '#2e2219', roughness: 0.9 }),
  snout: new THREE.MeshStandardMaterial({ color: '#a8786a', roughness: 0.6 }),
  tusk: new THREE.MeshStandardMaterial({ color: '#f2ead8', roughness: 0.4 }),
};
for (const k in MAT) MAT[k] = toToon(MAT[k]);
const sphere = new THREE.SphereGeometry(1, 16, 12);

function buildMushi() {
  const g = new THREE.Group();
  const segs = [];
  for (let i = 0; i < 6; i++) {
    const r = 0.26 - i * 0.02;
    const s = new THREE.Group();
    const body = new THREE.Mesh(sphere, MAT.mushi);
    body.scale.setScalar(r);
    s.add(body);
    const belly = new THREE.Mesh(sphere, MAT.mushiBelly);
    belly.scale.set(r * 0.85, r * 0.5, r * 0.85); belly.position.y = -r * 0.45;
    s.add(belly);
    // 背中の黄色い点々
    for (const sx of [-1, 1]) { const d = new THREE.Mesh(sphere, MAT.dot); d.scale.setScalar(r * 0.18); d.position.set(sx * r * 0.55, r * 0.6, 0); s.add(d); }
    s.position.z = -i * 0.36;
    g.add(s);
    segs.push(s);
  }
  // 顔：大きな目と触角
  const head = segs[0];
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(sphere, MAT.white); w.scale.setScalar(0.09); w.position.set(sx * 0.11, 0.1, 0.2); head.add(w);
    const e = new THREE.Mesh(sphere, MAT.eye); e.scale.setScalar(0.05); e.position.set(sx * 0.11, 0.1, 0.27); head.add(e);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 5), MAT.eye);
    ant.position.set(sx * 0.08, 0.3, 0.08); ant.rotation.z = -sx * 0.4; head.add(ant);
  }
  g.scale.setScalar(1.6);
  g.userData.segs = segs;
  return g;
}

function buildCrow() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(sphere, MAT.crow); body.scale.set(0.22, 0.2, 0.42); g.add(body);
  const head = new THREE.Mesh(sphere, MAT.crow); head.scale.setScalar(0.15); head.position.set(0, 0.12, 0.38); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 8), MAT.beak); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.1, 0.58); g.add(beak);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(sphere, MAT.white); e.scale.setScalar(0.03); e.position.set(sx * 0.09, 0.17, 0.48); g.add(e); }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.3), MAT.crowWing); tail.position.set(0, 0.02, -0.5); g.add(tail);
  const wings = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * 0.15, 0.08, 0);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.03, 0.42), MAT.crowWing);
    wing.position.x = sx * 0.43; pivot.add(wing);
    g.add(pivot); wings.push(pivot);
  }
  g.scale.setScalar(1.5);
  g.userData.wings = wings;
  return g;
}

// イノシシ：畑に一直線に突進して、キャベツを列ごと踏む
function buildBoar() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(sphere, MAT.boar); body.scale.set(0.55, 0.5, 0.95); body.position.y = 0.75; g.add(body);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 1.3), MAT.boarDark); ridge.position.set(0, 1.22, -0.05); g.add(ridge);
  const head = new THREE.Group(); head.position.set(0, 0.78, 0.85); g.add(head);
  const skull = new THREE.Mesh(sphere, MAT.boar); skull.scale.set(0.36, 0.34, 0.42); head.add(skull);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.3, 10), MAT.snout); snout.rotation.x = Math.PI / 2; snout.position.set(0, -0.06, 0.42); head.add(snout);
  for (const sx of [-1, 1]) {
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.24, 6), MAT.tusk); tusk.position.set(sx * 0.14, -0.08, 0.4); tusk.rotation.set(-0.5, 0, sx * 0.4); head.add(tusk);
    const e = new THREE.Mesh(sphere, MAT.eye); e.scale.setScalar(0.04); e.position.set(sx * 0.16, 0.1, 0.3); head.add(e);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 4), MAT.boarDark); ear.position.set(sx * 0.2, 0.3, 0.05); head.add(ear);
  }
  const legs = [];
  for (const [x, z] of [[-0.28, 0.5], [0.28, 0.5], [-0.28, -0.5], [0.28, -0.5]]) {
    const leg = new THREE.Group(); leg.position.set(x, 0.55, z); g.add(leg);
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.16), MAT.boarDark); l.position.y = -0.27; leg.add(l);
    legs.push(leg);
  }
  g.userData = { legs, head };
  return g;
}

export class Minion {
  constructor(sys, type, wave) {
    this.sys = sys; this.type = type;
    this.alive = true;
    this.hp = this.maxHp = type === 'mushi' ? 30 + wave * 10 : type === 'inoshishi' ? 70 + wave * 15 : 22 + wave * 8;
    this.speed = type === 'mushi' ? 2.6 + wave * 0.2 : type === 'inoshishi' ? 3.5 : 8 + wave * 0.5;
    this.target = -1; this.retarget = 0; this.t = Math.random() * 10; this.hit = 0;
    this.obj = type === 'mushi' ? buildMushi() : type === 'inoshishi' ? buildBoar() : buildCrow();
    this.mode = 'walk'; this.cool = 2;
    // 予報で決めた方角（東西南北の一方）からザーッと押し寄せる。カラスはその方角の空から
    if (type === 'mushi' || type === 'inoshishi') {
      this.pos = sys.gatePoint(0);
      this.pos.y = groundAt(this.pos.x, this.pos.z);
    } else {
      this.pos = sys.gatePoint(30);
      this.pos.y = 24;
    }
    this.obj.position.copy(this.pos);
    sys.scene.add(this.obj);
  }

  update(dt) {
    const sys = this.sys, cab = sys.cabbages;
    this.t += dt;
    // 結界で位置を縛られている間：その場で震える
    if (this.frozen > 0) {
      // 突進の前・最中に結界で止めたら「止めた！」
      if (this.type === 'inoshishi' && (this.mode === 'charge' || this.mode === 'dash')) {
        this.mode = 'rest'; this.cool = 3; this.hideLine();
        sys.hud.floater('突進を止めた！ +10Q', this.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), sys.game.camera, '#ffe9a8');
        sys.game.addQ(10);
      }
      this.frozen -= dt;
      this.obj.position.set(this.pos.x + (Math.random() - 0.5) * 0.15, this.pos.y, this.pos.z + (Math.random() - 0.5) * 0.15);
      if (this.frozen <= 0) sys.fling(this);
      return;
    }
    const zeno = this.zenoT > 0 ? 0.4 : 1;
    this.zenoT = (this.zenoT || 0) - dt;
    this.hit = Math.max(0, this.hit - dt * 5);
    this.retarget -= dt;
    if (this.target < 0 || cab.state[this.target] || this.retarget <= 0) {
      this.target = cab.nearestAlive(this.pos.x + rand(-20, 20), this.pos.z + rand(-20, 20));
      this.retarget = 8;
    }
    if (this.target < 0) return;
    const c = cab.list[this.target];
    const dx = c.x - this.pos.x, dz = c.z - this.pos.z, d = Math.hypot(dx, dz);
    const spd = this.speed * (sys.slow ? 0.35 : 1) * zeno;
    if (this.type === 'inoshishi') { this.updateBoar(dt, c, dx, dz, d, spd); return; }
    if (this.type === 'mushi') {
      if (d > 0.9) {
        this.pos.x += dx / d * spd * dt; this.pos.z += dz / d * spd * dt;
      } else if (cab.damage(this.target, 35 * dt * sys.dmgMul, 'up')) {
        sys.stats.lost++;
      }
      this.pos.y = groundAt(this.pos.x, this.pos.z) + 0.35;
      this.obj.rotation.y = Math.atan2(dx, dz);
      // くねくね這う
      this.obj.userData.segs.forEach((s, i) => {
        s.position.y = Math.max(0, Math.sin(this.t * 9 - i * 0.9)) * 0.12;
        s.position.x = Math.sin(this.t * 4.5 - i * 0.7) * 0.06;
      });
    } else {
      // 上空を飛んできて、近づいたら急降下してつつく
      const ty = d > 12 ? 9 : c.y + 0.9;
      this.pos.y += (ty - this.pos.y) * Math.min(1, dt * 2.5);
      if (d > 0.8) { this.pos.x += dx / d * spd * dt; this.pos.z += dz / d * spd * dt; }
      else if (cab.damage(this.target, 28 * dt * sys.dmgMul, 'up')) sys.stats.lost++;
      this.obj.rotation.set(d > 12 ? 0 : 0.4, Math.atan2(dx, dz), 0);
      const flap = Math.sin(this.t * (d > 0.8 ? 14 : 22)) * 0.7;
      this.obj.userData.wings[0].rotation.z = flap; this.obj.userData.wings[1].rotation.z = -flap;
    }
    this.obj.position.copy(this.pos);
    const s = (this.type === 'mushi' ? 1.6 : 1.5) * (1 + this.hit * 0.25);
    this.obj.scale.setScalar(s);
  }

  // イノシシ：歩く → 止まって力をためる（土煙・予告線・地響き） → 一直線に突進 → ひと休み
  updateBoar(dt, c, dx, dz, d, spd) {
    const sys = this.sys, ud = this.obj.userData, slow = sys.slow ? 0.35 : 1;
    this.cool -= dt;
    let moving = false;
    if (this.mode === 'walk') {
      if (d > 1) { this.pos.x += dx / d * spd * dt; this.pos.z += dz / d * spd * dt; moving = true; }
      this.obj.rotation.y = Math.atan2(dx, dz);
      if (d < 34 && this.cool <= 0) {
        this.mode = 'charge'; this.chargeT = 1.4;
        this.dir = new THREE.Vector2(dx / d, dz / d);
        this.showLine();
        sys.audio.thunder(0, 0.22);
        const pp = sys.game.player.pos;
        if (Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z) < 40) sys.game.player.shake = Math.max(sys.game.player.shake, 0.25);
      }
    } else if (this.mode === 'charge') {
      this.chargeT -= dt * slow;
      this.dustT = (this.dustT || 0) - dt;
      if (this.dustT <= 0) { this.dustT = 0.22; sys.fx.burst(this.pos.clone().add(new THREE.Vector3(0, 0.3, 0)), '#9a8060', 10, 3, 0.6, 0.45, -1); }
      ud.head.rotation.x = 0.3 + Math.sin(this.t * 30) * 0.05;
      if (this.line) this.line.material.opacity = 0.35 + Math.sin(this.t * 14) * 0.25;
      if (this.chargeT <= 0) { this.mode = 'dash'; this.dashLeft = 42; this.hideLine(); }
    } else if (this.mode === 'dash') {
      const step = 20 * slow * (this.zenoT > 0 ? 0.4 : 1) * dt;
      this.pos.x += this.dir.x * step; this.pos.z += this.dir.y * step;
      this.dashLeft -= step; moving = true;
      const k = sys.cabbages.damageRadius(this.pos.x, this.pos.z, 2.0, 1500 * dt * sys.dmgMul, 'up');
      if (k) sys.stats.lost += k;
      ud.head.rotation.x = 0.35;
      const out = this.pos.x < BOUNDS.xMin + 8 || this.pos.z < BOUNDS.zMin + 8 || this.pos.z > BOUNDS.zMax - 8;
      if (this.dashLeft <= 0 || out) { this.mode = 'rest'; this.cool = 2.5; this.retarget = 0; }
    } else {
      ud.head.rotation.x = 0;
      if (this.cool <= 0) this.mode = 'walk';
    }
    this.pos.y = groundAt(this.pos.x, this.pos.z);
    this.obj.position.copy(this.pos);
    if (this.dir && this.mode !== 'walk') this.obj.rotation.y = Math.atan2(this.dir.x, this.dir.y);
    const sw = moving ? Math.sin(this.t * (this.mode === 'dash' ? 26 : 10)) * 0.6 : 0;
    ud.legs.forEach((l, i) => { l.rotation.x = (i === 0 || i === 3 ? sw : -sw); });
    this.obj.scale.setScalar(1.15 * (1 + this.hit * 0.2));
  }
  showLine() {
    this.hideLine();
    const L = 42;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, L).rotateX(-Math.PI / 2).translate(0, 0, L / 2),
      new THREE.MeshBasicMaterial({ color: '#ff5a3a', transparent: true, opacity: 0.5, depthWrite: false, fog: false }));
    m.position.set(this.pos.x, this.pos.y + 0.35, this.pos.z);
    m.rotation.y = Math.atan2(this.dir.x, this.dir.y);
    this.sys.scene.add(m);
    this.line = m;
  }
  hideLine() { if (this.line) { this.sys.scene.remove(this.line); this.line.geometry.dispose(); this.line = null; } }

  damage(n) {
    this.hp -= n; this.hit = 1;
    if (this.hp <= 0 && this.alive) { this.remove(); return true; }
    return false;
  }

  remove() {
    this.alive = false;
    this.hideLine?.();
    this.sys.scene.remove(this.obj);
  }
}
