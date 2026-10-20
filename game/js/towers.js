// 量子デバイス（タワー）：観測塔・量子アンプ・トンネル避雷塔
import * as THREE from 'three';
import { toonify } from './toon.js';
import { buildBox } from './quantum.js';
import { heightAt, groundAt, isWalkable, FIELDS, fieldRectDist } from './world.js';

export const TOWER_TYPES = [
  { id: 'amp', key: '1', name: 'スピーカー', short: '自動で撃つ・青虫に2倍', cost: 50, radius: 24, color: '#ff8a3d', good: 'mushi',
    desc: '音楽に合わせて、範囲に入った雑魚や竜巻へ自動で音波を撃つ。青虫には 2 倍効く（弱点）' },
  { id: 'observer', key: '2', name: '観測ライト', short: '正体を暴き・カラスを落とす', cost: 40, radius: 34, color: '#b48cff', good: 'karasu',
    desc: '範囲の紫の竜巻を観測して正体を暴く。見つめ続けた敵は量子ゼノン効果で動きが鈍る。カラスは光を嫌って落ちていく（弱点）' },
  { id: 'rod', key: '3', name: '避雷針', short: '雷を防ぐ・つむじ風を消す', cost: 50, radius: 30, color: '#6fe3ff', good: 'tsumuji',
    desc: '範囲に落ちる雷を吸い取って Qビットに変える。つむじ風は近づくと一瞬で消える（弱点）。大きな竜巻はトンネル効果で東の沖へ飛ばす' },
  { id: 'box', key: '4', name: 'シュレディンガーの箱', short: '開けるまで中身は重ね合わせ', cost: 30, radius: 3, color: '#c9b8ff',
    desc: '台風が過ぎたら自動で開く。半分の確率で黄金キャベツ（+120Q）、半分は空っぽ。開けるまで中身は決まらない' },
];

const MAT = {
  dark: new THREE.MeshStandardMaterial({ color: '#25282d', metalness: 0.8, roughness: 0.35 }),
  steel: new THREE.MeshStandardMaterial({ color: '#c8ccd2', metalness: 1, roughness: 0.18 }),
  amp: new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.75 }),
  grill: new THREE.MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.9 }),
  gold: new THREE.MeshStandardMaterial({ color: '#d8b46a', metalness: 1, roughness: 0.3 }),
};
const glow = (c, i = 3) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i });

function rangeRing(radius, color) {
  const geo = new THREE.RingGeometry(radius - 0.35, radius, 96).rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, fog: false }));
  m.position.y = 0.4;
  return m;
}

function buildObserver(def) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2, 0.8, 6), MAT.dark);
  base.position.y = 0.4; g.add(base);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 9, 8), MAT.steel);
  mast.position.y = 5; g.add(mast);
  const eye = new THREE.Group(); eye.position.y = 10; g.add(eye);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 16), new THREE.MeshPhysicalMaterial({ color: '#202030', roughness: 0.05, metalness: 0.2, clearcoat: 1 }));
  eye.add(ball);
  const iris = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), glow(def.color, 5));
  iris.position.z = 1.08; eye.add(iris);
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.06, 8, 48), glow(def.color, 3));
  const ring2 = ring1.clone(); ring2.rotation.x = Math.PI / 2;
  g.add(ring1, ring2); ring1.position.y = ring2.position.y = 10;
  // 観測ビーム
  const beam = new THREE.Mesh(new THREE.ConeGeometry(4, 30, 24, 1, true).translate(0, -15, 0).rotateX(-Math.PI / 2 - 0.5),
    new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  eye.add(beam);
  g.userData = { spin: eye, rings: [ring1, ring2] };
  return g;
}

function buildAmp(def) {
  const g = new THREE.Group();
  const cab = (y, h) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(3.2, h, 1.8), MAT.amp);
    c.position.y = y; g.add(c);
    return c;
  };
  cab(1.5, 3); cab(4.3, 2.6);
  const head = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.0, 1.9), MAT.amp);
  head.position.y = 6.1; g.add(head);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.5, 0.05), MAT.gold);
  panel.position.set(0, 6.1, 0.96); g.add(panel);
  const cones = [];
  const cm = glow(def.color, 0.6);
  for (const [x, y] of [[-0.75, 0.85], [0.75, 0.85], [-0.75, 2.15], [0.75, 2.15], [-0.75, 3.75], [0.75, 3.75], [-0.75, 4.95], [0.75, 4.95]]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 24), cm);
    rim.position.set(x, y, 0.92); g.add(rim);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.25, 24, 1, true), MAT.grill);
    cone.rotation.x = -Math.PI / 2; cone.position.set(x, y, 0.85); g.add(cone);
    cones.push(cone);
  }
  for (let i = 0; i < 4; i++) {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 12).rotateX(Math.PI / 2), MAT.gold);
    k.position.set(-1.1 + i * 0.4, 6.1, 1.0); g.add(k);
  }
  g.userData = { cones, glow: cm };
  return g;
}

function buildRod(def) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 0.6, 12), MAT.dark);
  base.position.y = 0.3; g.add(base);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, 14, 12), MAT.steel);
  rod.position.y = 7.2; g.add(rod);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 12), glow(def.color, 4));
  tip.position.y = 14.4; g.add(tip);
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1.1 - i * 0.2, 0.05, 8, 48), glow(def.color, 3));
    r.position.y = 4 + i * 3.5; g.add(r); rings.push(r);
  }
  g.userData = { rings, tip };
  return g;
}

const BUILDERS = { observer: buildObserver, amp: buildAmp, rod: buildRod, box: () => buildBox() };

export class Towers {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.list = [];
    this.preview = null;
    this.previewType = null;
  }

  def(id) { return TOWER_TYPES.find((t) => t.id === id); }

  canPlace(pos) {
    if (!isWalkable(pos.x, pos.z)) return false;
    // 畑の上にも建てられる（畑地がひと続きなので）
    return !this.list.some((t) => t.pos.distanceTo(pos) < 5);
  }

  showPreview(id, pos, ok) {
    if (this.previewType !== id) {
      this.hidePreview();
      if (!id) return;
      const def = this.def(id);
      const g = BUILDERS[id](def);
      g.traverse((o) => {
        if (o.isMesh) { o.material = new THREE.MeshBasicMaterial({ color: '#7dffb0', transparent: true, opacity: 0.35, depthWrite: false }); }
      });
      g.add(rangeRing(def.radius, def.color));
      this.preview = g; this.previewType = id;
      this.scene.add(g);
    }
    if (!this.preview) return;
    this.preview.position.copy(pos);
    const c = ok ? '#7dffb0' : '#ff6a6a';
    this.preview.traverse((o) => { if (o.isMesh && o.material.isMeshBasicMaterial && o.geometry.type !== 'RingGeometry') o.material.color.set(c); });
  }

  hidePreview() {
    if (this.preview) this.scene.remove(this.preview);
    this.preview = null; this.previewType = null;
  }

  build(id, pos) {
    const def = this.def(id);
    const mesh = BUILDERS[id](def);
    mesh.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    toonify(mesh);
    const ring = rangeRing(def.radius, def.color);
    ring.material.opacity = 0.18;
    mesh.add(ring);
    mesh.position.copy(pos);
    mesh.scale.setScalar(0.01);
    this.scene.add(mesh);
    const t = { id, def, mesh, pos: pos.clone(), top: pos.clone().add(new THREE.Vector3(0, id === 'rod' ? 14.4 : 10, 0)), age: 0, cd: 0 };
    this.list.push(t);
    this.game.fx.beam(pos, def.color, 40, 3, 0.8);
    this.game.fx.ring(pos, def.color, def.radius, 0.9, 0.6);
    return t;
  }

  remove(t) {
    this.scene.remove(t.mesh);
    this.list = this.list.filter((x) => x !== t);
  }

  findRod(pos) {
    let best = null, bd = Infinity;
    for (const t of this.list) {
      if (t.id !== 'rod') continue;
      const d = Math.hypot(t.pos.x - pos.x, t.pos.z - pos.z);
      if (d < t.def.radius && d < bd) { bd = d; best = t; }
    }
    return best;
  }

  onBeat(beat) {
    const th = this.game.threats;
    for (const t of this.list) {
      if (t.id !== 'amp' || t.age < 1) continue;
      // いちばん近い敵へ音波を撃つ（拍ごと）
      const e = th.nearestTarget(t.pos, t.def.radius);
      if (!e) continue;
      const from = t.pos.clone().add(new THREE.Vector3(0, 2.5, 0));
      const dir = e.pos.clone().sub(t.pos).setY(0);
      const dist = dir.length();
      dir.normalize();
      this.game.fx.soundWave(t.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), dir, t.def.color, dist, 2);
      this.game.fx.notes(from, 2, ['#ff8a3d', '#ffd36a'], 0.6, dir);
      const weak = e.type === 'mushi';
      th.hitEnemy(e, (14 + this.game.wave * 3) * (weak ? 2 : 1) * (this.game.cards.has('amp') ? 1.5 : 1), false, weak ? t.def.color : null);
      t.pulse = 1;
      this.game.audio.ampHit();
    }
  }

  update(dt, t) {
    const th = this.game.threats;
    for (const tw of this.list) {
      tw.age += dt;
      const s = Math.min(1, tw.age * 2.5);
      const e = 1 + Math.sin(s * Math.PI) * 0.15 * (1 - s);
      tw.mesh.scale.setScalar(s * e || 0.01);
      tw.cd -= dt;
      const ud = tw.mesh.userData;
      if (tw.id === 'observer') {
        ud.spin.rotation.y = t * 0.9;
        ud.rings[0].rotation.x = t * 1.3; ud.rings[1].rotation.y = t * 1.7;
        if (tw.age > 1) {
          th.measure(tw.pos, tw.def.radius, 'tower');
          // 量子ゼノン効果：見つめ続けた敵の動きを鈍らせる
          const r2 = tw.def.radius * tw.def.radius;
          let slowed = false;
          for (const e of [...th.tornados, ...th.minions]) {
            if (!e.alive) continue;
            if ((e.pos.x - tw.pos.x) ** 2 + (e.pos.z - tw.pos.z) ** 2 < r2) { e.zenoT = 0.25; slowed = true; }
          }
          if (slowed) this.game.memo('zeno');
          // 弱点：カラスは観測ライトの光で落ちる（0.5 秒ごと）
          if (tw.cd <= 0) {
            tw.cd = 0.5;
            for (const m of th.minions) {
              if (!m.alive || m.type !== 'karasu') continue;
              if ((m.pos.x - tw.pos.x) ** 2 + (m.pos.z - tw.pos.z) ** 2 < r2) th.hitEnemy(m, 14 + this.game.wave * 3, false, tw.def.color);
            }
          }
        }
      } else if (tw.id === 'amp') {
        tw.pulse = Math.max(0, (tw.pulse || 0) - dt * 5);
        ud.cones.forEach((c) => { c.position.z = 0.85 + tw.pulse * 0.12; });
        ud.glow.emissiveIntensity = 0.6 + tw.pulse * 6;
      } else if (tw.id === 'box') {
        for (const m of ud.ghosts) m.material.opacity = 0.35 + Math.sin(t * 3 + tw.pos.x) * 0.25;
      } else if (tw.id === 'rod') {
        ud.rings.forEach((r, i) => { r.rotation.x = t * (1 + i * 0.6); r.rotation.y = t * (1.4 - i * 0.3); r.position.y = 4 + i * 3.5 + Math.sin(t * 2 + i) * 0.4; });
        ud.tip.material.emissiveIntensity = 3 + Math.sin(t * 8) * 1.5;
        // 弱点：つむじ風は避雷針に近づくと一瞬で消える
        for (const tor of th.tornados) {
          if (!tor.alive || !tor.group.mini) continue;
          if (Math.hypot(tor.pos.x - tw.pos.x, tor.pos.z - tw.pos.z) < 14) {
            this.game.fx.beam(tor.pos, '#6fe3ff', 30, 4, 0.5);
            th.hitEnemy(tor, tor.hp + 1, false, tw.def.color);
          }
        }
        // トンネル効果：近づいた竜巻を沖へ
        if (tw.cd <= 0) {
          for (const tor of th.tornados) {
            if (!tor.alive) continue;
            if (Math.hypot(tor.pos.x - tw.pos.x, tor.pos.z - tw.pos.z) < 13 && tor.tunnelCd <= 0) {
              const from = tor.pos.clone();
              const dir = new THREE.Vector2(1, 0); // 東の海へ飛ばす
              tor.pos.x += dir.x * 85; tor.pos.z += dir.y * 85;
              tor.pos.y = Math.max(heightAt(tor.pos.x, tor.pos.z), 0);
              tor.obj.position.copy(tor.pos);
              tor.tunnelCd = 4; tor.retarget = 0;
              this.game.fx.beam(from, '#6fe3ff', 50, 9, 0.7);
              this.game.fx.beam(tor.pos, '#6fe3ff', 50, 9, 0.9);
              this.game.audio.teleport();
              this.game.hud.toast('トンネル効果！竜巻が障壁をすり抜けて沖へ飛んだ', 'q');
              this.game.memo('tunnel');
              tw.cd = 7;
              break;
            }
          }
        }
      }
    }
  }
}
