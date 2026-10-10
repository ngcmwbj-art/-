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

export class Minion {
  constructor(sys, type, wave) {
    this.sys = sys; this.type = type;
    this.alive = true;
    this.hp = this.maxHp = type === 'mushi' ? 30 + wave * 10 : 22 + wave * 8;
    this.speed = type === 'mushi' ? 2.6 + wave * 0.2 : 8 + wave * 0.5;
    this.target = -1; this.retarget = 0; this.t = Math.random() * 10; this.hit = 0;
    this.obj = type === 'mushi' ? buildMushi() : buildCrow();
    // 青虫はまわりの森の縁から、カラスは空の遠くから現れる
    if (type === 'mushi') {
      const side = Math.floor(Math.random() * 3);
      let x, z;
      if (side === 0) { x = BOUNDS.xMin + 10; z = rand(-130, 130); }
      else { z = (side === 1 ? BOUNDS.zMin + 10 : BOUNDS.zMax - 10); x = rand(-140, 110); }
      this.pos = new THREE.Vector3(x, groundAt(x, z), z);
    } else {
      const a = Math.random() * Math.PI * 2;
      this.pos = new THREE.Vector3(Math.cos(a) * 170, 24, Math.sin(a) * 150);
    }
    this.obj.position.copy(this.pos);
    sys.scene.add(this.obj);
  }

  update(dt) {
    const sys = this.sys, cab = sys.cabbages;
    this.t += dt;
    this.hit = Math.max(0, this.hit - dt * 5);
    this.retarget -= dt;
    if (this.target < 0 || cab.state[this.target] || this.retarget <= 0) {
      this.target = cab.nearestAlive(this.pos.x + rand(-20, 20), this.pos.z + rand(-20, 20));
      this.retarget = 8;
    }
    if (this.target < 0) return;
    const c = cab.list[this.target];
    const dx = c.x - this.pos.x, dz = c.z - this.pos.z, d = Math.hypot(dx, dz);
    const spd = this.speed * (sys.slow ? 0.35 : 1);
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

  damage(n) {
    this.hp -= n; this.hit = 1;
    if (this.hp <= 0 && this.alive) { this.remove(); return true; }
    return false;
  }

  remove() {
    this.alive = false;
    this.sys.scene.remove(this.obj);
  }
}
