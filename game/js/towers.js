// 量子デバイス（タワー）：観測塔・量子アンプ・トンネル避雷塔
import * as THREE from 'three';
import { toonify } from './toon.js';
import { heightAt, groundAt, isWalkable, FIELDS, fieldRectDist } from './world.js';

export const TOWER_TYPES = [
  { id: 'observer', key: '1', name: '観測塔', cost: 40, radius: 34, color: '#b48cff',
    desc: '範囲内の竜巻を常時観測。実体なら収束、幻なら消滅させる' },
  { id: 'amp', key: '2', name: '量子アンプ', cost: 60, radius: 22, color: '#ff8a3d',
    desc: '2拍ごとにパワーコードの衝撃波。収束済みの竜巻と飛来物を攻撃' },
  { id: 'rod', key: '3', name: 'トンネル避雷塔', cost: 50, radius: 30, color: '#6fe3ff',
    desc: '範囲の落雷を吸収してQビットに変換。接近した竜巻をトンネル効果で沖へ飛ばす' },
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

const BUILDERS = { observer: buildObserver, amp: buildAmp, rod: buildRod };

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
    if (FIELDS.some((f) => fieldRectDist(f, pos.x, pos.z) < 0.5)) return false;
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
      if (t.id === 'amp' && beat % 2 === 0 && t.age > 1) {
        const res = th.blast(t.pos, t.def.radius, 16, {});
        this.game.fx.ring(t.pos, t.def.color, t.def.radius, 0.45, 0.7);
        t.pulse = 1;
        if (res.hits) this.game.audio.ampHit();
      }
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
        if (tw.age > 1) th.measure(tw.pos, tw.def.radius, 'tower');
      } else if (tw.id === 'amp') {
        tw.pulse = Math.max(0, (tw.pulse || 0) - dt * 5);
        ud.cones.forEach((c) => { c.position.z = 0.85 + tw.pulse * 0.12; });
        ud.glow.emissiveIntensity = 0.6 + tw.pulse * 6;
      } else if (tw.id === 'rod') {
        ud.rings.forEach((r, i) => { r.rotation.x = t * (1 + i * 0.6); r.rotation.y = t * (1.4 - i * 0.3); r.position.y = 4 + i * 3.5 + Math.sin(t * 2 + i) * 0.4; });
        ud.tip.material.emissiveIntensity = 3 + Math.sin(t * 8) * 1.5;
        // トンネル効果：近づいた竜巻を沖へ
        if (tw.cd <= 0) {
          for (const tor of th.tornados) {
            if (!tor.alive) continue;
            if (Math.hypot(tor.pos.x - tw.pos.x, tor.pos.z - tw.pos.z) < 13 && tor.tunnelCd <= 0) {
              const from = tor.pos.clone();
              const dir = new THREE.Vector2(tor.pos.x, tor.pos.z).normalize();
              tor.pos.x += dir.x * 85; tor.pos.z += dir.y * 85;
              tor.pos.y = Math.max(heightAt(tor.pos.x, tor.pos.z), 0);
              tor.obj.position.copy(tor.pos);
              tor.tunnelCd = 4; tor.retarget = 0;
              this.game.fx.beam(from, '#6fe3ff', 50, 9, 0.7);
              this.game.fx.beam(tor.pos, '#6fe3ff', 50, 9, 0.9);
              this.game.audio.teleport();
              this.game.hud.toast('トンネル効果！竜巻が障壁をすり抜けて沖へ飛んだ', 'q');
              tw.cd = 7;
              break;
            }
          }
        }
      }
    }
  }
}
