// 牛：準備タイムに、外で草を食べている牛を牛舎へ戻す（やってもやらなくてもいいおまけ）
// 近づくとついてくる。牛舎に入ると中でおとなしく待つ。全員戻すと Qビットのごほうび
import * as THREE from 'three';
import { groundAt, isWalkable, FIELDS, fieldRectDist, BARN } from './world.js';
import { toonify } from './toon.js';

const BARN_ROT = 0.35; // world.js で牛舎を置いた向き
const STALL_X = [-2.7, -1.3, 3.1, 1.2]; // 牛舎の中の立ち位置（トラクターを避ける）
const rotY = (x, z, a) => ({ x: x * Math.cos(a) + z * Math.sin(a), z: -x * Math.sin(a) + z * Math.cos(a) });
const barnPoint = (lx, lz) => { const r = rotY(lx, lz, BARN_ROT); return new THREE.Vector3(BARN.x + r.x, 0, BARN.z + r.z); };

// F1（黒毛）の牛。黄色い耳標つき
function buildCow() {
  const g = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: '#1c1a19', roughness: 0.8 });
  const muzzle = new THREE.MeshStandardMaterial({ color: '#4a3a36', roughness: 0.7 });
  const hoof = new THREE.MeshStandardMaterial({ color: '#2e2a26', roughness: 0.6 });
  const tag = new THREE.MeshStandardMaterial({ color: '#f2c62e', roughness: 0.5 });
  const horn = new THREE.MeshStandardMaterial({ color: '#d8ccb0', roughness: 0.5 });
  const box = (w, h, d, m, x, y, z, parent = g) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); parent.add(b); return b; };
  // 胴体（丸みを出すため 2 段）
  const body = box(0.9, 0.85, 1.9, black, 0, 1.15, 0);
  body.scale.set(1, 1, 1);
  box(0.8, 0.25, 1.7, black, 0, 1.62, 0);
  // 頭
  const head = new THREE.Group(); head.position.set(0, 1.35, 1.05); g.add(head);
  box(0.5, 0.5, 0.6, black, 0, 0, 0.25, head);
  box(0.42, 0.3, 0.2, muzzle, 0, -0.12, 0.6, head);
  for (const sx of [-1, 1]) {
    box(0.22, 0.1, 0.14, black, sx * 0.34, 0.12, 0.12, head);
    box(0.05, 0.12, 0.1, tag, sx * 0.42, 0.04, 0.16, head); // 耳標
    const h = box(0.06, 0.06, 0.16, horn, sx * 0.2, 0.28, 0.12, head); h.rotation.z = sx * 0.6;
  }
  // 脚
  const legs = [];
  for (const [x, z] of [[-0.3, 0.7], [0.3, 0.7], [-0.3, -0.7], [0.3, -0.7]]) {
    const leg = new THREE.Group(); leg.position.set(x, 0.85, z); g.add(leg);
    box(0.2, 0.75, 0.22, black, 0, -0.38, 0, leg);
    box(0.21, 0.12, 0.23, hoof, 0, -0.8, 0, leg);
    legs.push(leg);
  }
  // しっぽ
  const tail = box(0.06, 0.7, 0.06, black, 0, 1.25, -0.97); tail.rotation.x = 0.25;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  toonify(g);
  g.userData = { head, legs, tail };
  return g;
}

// 牛舎の非常用発電機（停電のサブミッション用）
function buildGenerator() {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: '#e0b020', roughness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.6 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.8), body); b.position.y = 0.6; g.add(b);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.9), dark); frame.position.y = 1.04; g.add(frame);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.05), dark); panel.position.set(0.25, 0.65, 0.42); g.add(panel);
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 12), dark); w.rotation.x = Math.PI / 2; w.position.set(sx * 0.45, 0.18, 0.42); g.add(w); }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshStandardMaterial({ color: '#550000', emissive: '#ff2a1a', emissiveIntensity: 0 }));
  lamp.position.set(-0.3, 0.75, 0.42); g.add(lamp);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.lamp = lamp;
  return g;
}

export class Cows {
  constructor(game) {
    this.game = game;
    this.list = [];
    // 発電機は牛舎の右わき
    this.genPos = barnPoint(5.6, 1.5);
    this.genPos.y = groundAt(this.genPos.x, this.genPos.z);
    this.generator = buildGenerator();
    this.generator.position.copy(this.genPos);
    this.generator.rotation.y = BARN_ROT;
    game.scene.add(this.generator);
    // 牛舎の前、畑にかからない草地を放牧場に
    this.pasture = this.findPasture();
    // 4 頭目は「来たばかりの素牛」（小さめ。準備タイムの出来事のときだけ出る）
    for (let i = 0; i < 4; i++) {
      const obj = buildCow();
      if (i === 3) obj.scale.setScalar(0.78);
      game.scene.add(obj);
      this.list.push({ obj, pos: new THREE.Vector3(), yaw: Math.random() * 6.28, state: 'graze', t: Math.random() * 10, target: null, slot: i });
    }
    this.home = 0;
    this.reset(false);
  }

  findPasture() {
    const tries = [[-20, 16], [-24, 10], [-14, 22], [-28, 0], [-30, 16], [-10, 26]];
    for (const [ox, oz] of tries) {
      const x = BARN.x + ox, z = BARN.z + oz;
      let ok = true;
      for (let a = 0; a < 6.28; a += 0.8) {
        const px = x + Math.cos(a) * 8, pz = z + Math.sin(a) * 8;
        if (!isWalkable(px, pz) || FIELDS.some((f) => fieldRectDist(f, px, pz) < 2)) { ok = false; break; }
      }
      if (ok) return new THREE.Vector3(x, 0, z);
    }
    return barnPoint(0, 14);
  }

  // 準備タイムの始めに外へ出す（visible=false なら隠す）
  reset(visible = true, extra = false) {
    this.home = 0; this.rewarded = false;
    this.count = extra ? 4 : 3;
    this.list.forEach((c, i) => {
      const inPlay = i < this.count;
      const a = i * 2.1 + Math.random();
      c.pos.set(this.pasture.x + Math.cos(a) * 5, 0, this.pasture.z + Math.sin(a) * 5);
      c.pos.y = groundAt(c.pos.x, c.pos.z);
      c.state = 'graze'; c.target = null;
      c.obj.visible = visible && inPlay;
      c.obj.position.copy(c.pos);
    });
    this.active = visible;
  }

  // 準備タイムの出来事：柵から出た牛（1 頭だけ遠くへ）
  scatter() {
    const c = this.list[0];
    for (let k = 0; k < 20; k++) {
      const a = Math.random() * 6.28, r = 32 + Math.random() * 14;
      const x = this.pasture.x + Math.cos(a) * r, z = this.pasture.z + Math.sin(a) * r;
      if (!isWalkable(x, z) || FIELDS.some((f) => fieldRectDist(f, x, z) < 1)) continue;
      c.pos.set(x, groundAt(x, z), z); c.obj.position.copy(c.pos); c.target = null;
      return c.pos.clone();
    }
    return null;
  }

  // 素牛を加える（今の準備タイムだけ）
  addCalf() {
    const c = this.list[3];
    this.count = 4;
    c.state = 'graze'; c.target = null;
    c.pos.set(this.pasture.x + 3, 0, this.pasture.z - 3); c.pos.y = groundAt(c.pos.x, c.pos.z);
    c.obj.position.copy(c.pos); c.obj.visible = this.active;
  }

  // 台風が来たら、残っている牛は自分で牛舎へ戻る（ごほうびはなし）
  shelterAll() {
    this.list.forEach((c) => { if (c.obj.visible && c.state !== 'home') { c.state = 'home'; const p = barnPoint(STALL_X[c.slot], 0.3); c.pos.copy(p); c.pos.y = groundAt(p.x, p.z) + 0.2; c.obj.position.copy(c.pos); } });
    this.active = false;
  }

  update(dt) {
    if (!this.list[0].obj.visible) return;
    const game = this.game, pp = game.player.pos;
    const door = barnPoint(0, 5);
    for (const c of this.list) {
      if (!c.obj.visible) continue;
      c.t += dt;
      const ud = c.obj.userData;
      let speed = 0, goal = null;
      if (c.state === 'graze') {
        // ゆっくり歩きながら草を食べる
        if (!c.target || c.pos.distanceTo(c.target) < 0.8) {
          const a = Math.random() * 6.28, r = Math.random() * 7;
          c.target = new THREE.Vector3(this.pasture.x + Math.cos(a) * r, 0, this.pasture.z + Math.sin(a) * r);
          c.pause = 2 + Math.random() * 4;
        }
        if (c.pause > 0) c.pause -= dt; else { goal = c.target; speed = 0.8; }
        if (this.active && Math.hypot(pp.x - c.pos.x, pp.z - c.pos.z) < 3.5) {
          c.state = 'follow';
          game.hud.toast('牛がついてきた！ 牛舎まで連れて帰ろう', 'q');
          game.audio.build();
        }
      } else if (c.state === 'follow') {
        // マサトの少し後ろについて歩く。牛舎の入口に近づいたら中へ
        const d = Math.hypot(pp.x - c.pos.x, pp.z - c.pos.z);
        if (d > 3) { goal = pp; speed = Math.min(7, 2 + d * 0.8); }
        if (Math.hypot(door.x - c.pos.x, door.z - c.pos.z) < 6) {
          c.state = 'enter'; c.target = barnPoint(STALL_X[c.slot], 0.3);
        }
      } else if (c.state === 'enter') {
        goal = c.target; speed = 2.5;
        if (Math.hypot(c.target.x - c.pos.x, c.target.z - c.pos.z) < 0.4) {
          c.state = 'home'; this.home++;
          game.hud.toast(`牛を牛舎に戻した（${this.home} / ${this.count}）`, 'good');
          game.fx.notes(c.pos.clone().add(new THREE.Vector3(0, 2, 0)), 6, ['#ffd36a', '#9fe05a'], 0.8);
          if (this.home === this.count && !this.rewarded) {
            this.rewarded = true;
            game.addQ(80, c.pos.clone().add(new THREE.Vector3(0, 2.5, 0)));
            game.hud.banner('牛がみんな無事！', 'これで台風が来ても安心。ごほうび +80Q');
            game.say?.('よしよし、いい子だ。台風の間はここにいろよ');
          }
        }
      } else if (c.state === 'home') {
        // 牛舎の中で入口の方を向いて待つ
        c.yaw += (Math.atan2(door.x - c.pos.x, door.z - c.pos.z) - c.yaw) * Math.min(1, dt * 2);
      }
      if (goal && speed > 0) {
        const dx = goal.x - c.pos.x, dz = goal.z - c.pos.z, L = Math.hypot(dx, dz);
        if (L > 0.05) {
          const step = Math.min(L, speed * dt);
          c.pos.x += dx / L * step; c.pos.z += dz / L * step;
          let dy = Math.atan2(dx, dz) - c.yaw;
          dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          c.yaw += dy * Math.min(1, dt * 4);
        }
      }
      c.pos.y = groundAt(c.pos.x, c.pos.z) + (c.state === 'home' ? 0.2 : 0);
      c.obj.position.copy(c.pos);
      c.obj.rotation.y = c.yaw;
      // 歩くと脚が動き、止まると頭を下げて草を食べる
      const moving = goal && speed > 0;
      const sw = moving ? Math.sin(c.t * speed * 4) * 0.5 : 0;
      ud.legs.forEach((l, i) => { l.rotation.x = (i === 0 || i === 3 ? sw : -sw); });
      ud.head.rotation.x = moving ? 0 : (c.state === 'graze' ? 0.55 + Math.sin(c.t * 2) * 0.08 : 0);
      ud.tail.rotation.z = Math.sin(c.t * 3) * 0.3;
    }
  }
}
