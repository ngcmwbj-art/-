// キャラクターと小物の見た目（すべて three.js の基本形状で組み立て）
import * as THREE from 'three';
import { CRATE } from './world.js';
import { rand } from './util.js';

const SPH = new THREE.SphereGeometry(1, 16, 12);
const SPH_LO = new THREE.SphereGeometry(1, 8, 6);

function mesh(geo, mat, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow;
  return m;
}

// ---------------- ゴキブリ ----------------
export function makeRoach(nymph = false) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const shell = new THREE.MeshStandardMaterial({ color: nymph ? 0x9a5e2a : 0x4a230c, roughness: 0.25, metalness: 0.25 });
  const shell2 = new THREE.MeshStandardMaterial({ color: nymph ? 0xb98048 : 0x7a4018, roughness: 0.3, metalness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x20110a, roughness: 0.55 });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const black = new THREE.MeshBasicMaterial({ color: 0x000000 });

  const abd = mesh(SPH, shell);
  abd.scale.set(0.16, 0.075, 0.27);
  abd.position.set(0, 0.1, -0.07);
  body.add(abd);
  if (!nymph) {
    const seam = mesh(new THREE.BoxGeometry(0.008, 0.012, 0.4), dark, false);
    seam.position.set(0, 0.174, -0.08);
    body.add(seam);
  } else {
    for (let i = 0; i < 3; i++) {
      const band = mesh(new THREE.TorusGeometry(1, 0.06, 4, 16), dark, false);
      band.scale.set(0.15, 0.07, 1);
      band.position.set(0, 0.1, -0.2 + i * 0.09);
      body.add(band);
    }
  }
  const pron = mesh(SPH, shell2);
  pron.scale.set(0.13, 0.05, 0.085);
  pron.position.set(0, 0.11, 0.17);
  body.add(pron);
  const head = mesh(SPH, dark);
  head.scale.set(0.06, 0.045, 0.05);
  head.position.set(0, 0.075, 0.25);
  body.add(head);
  for (const s of [-1, 1]) {
    const e = mesh(SPH_LO, white, false);
    e.scale.setScalar(0.024);
    e.position.set(s * 0.036, 0.1, 0.272);
    const p = mesh(SPH_LO, black, false);
    p.scale.setScalar(0.013);
    p.position.set(s * 0.04, 0.104, 0.292);
    body.add(e, p);
  }

  // 触角
  const antGeo = new THREE.CylinderGeometry(0.004, 0.007, 0.26, 4);
  antGeo.rotateX(Math.PI / 2);
  antGeo.translate(0, 0, 0.13);
  const antennae = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(s * 0.025, 0.09, 0.29);
    const seg = mesh(antGeo, dark, false);
    const tip = new THREE.Group();
    tip.position.z = 0.26;
    tip.add(mesh(antGeo, dark, false));
    a.add(seg, tip);
    body.add(a);
    antennae.push({ g: a, tip, s });
  }

  // 脚（三脚歩行）
  const femGeo = new THREE.CylinderGeometry(0.011, 0.015, 0.13, 4);
  femGeo.rotateZ(Math.PI / 2);
  femGeo.translate(0.065, 0, 0);
  const tibGeo = new THREE.CylinderGeometry(0.006, 0.01, 0.17, 4);
  tibGeo.rotateZ(Math.PI / 2);
  tibGeo.translate(0.085, 0, 0);
  const legs = [];
  const zs = [0.13, 0.02, -0.1];
  const bases = [0.65, 0.05, -0.7];
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      // g：付け根の位置と前後の振り / mir：左右反転 / lift：上下の持ち上げ
      const g = new THREE.Group();
      g.position.set(s * 0.07, 0.08, zs[k]);
      const mir = new THREE.Group();
      mir.scale.x = s;
      const lift = new THREE.Group();
      lift.add(mesh(femGeo, dark, false));
      const knee = new THREE.Group();
      knee.position.x = 0.13;
      knee.rotation.z = -1.0;
      knee.add(mesh(tibGeo, dark, false));
      lift.add(knee);
      mir.add(lift);
      g.add(mir);
      body.add(g);
      const tripod = (k === 1) === (s < 0);
      legs.push({ g, lift, s, base: bases[k], tripod });
    }
  }
  // 尾毛
  for (const s of [-1, 1]) {
    const c = mesh(new THREE.ConeGeometry(0.01, 0.07, 4), dark, false);
    c.rotation.x = -Math.PI / 2 - 0.2;
    c.rotation.z = s * 0.3;
    c.position.set(s * 0.03, 0.1, -0.35);
    body.add(c);
  }
  // はね（飛ぶときだけ見せる）
  const wings = new THREE.Group();
  wings.visible = false;
  if (!nymph) {
    const wm = new THREE.MeshStandardMaterial({ color: 0x8a5a2e, transparent: true, opacity: 0.75, roughness: 0.3, side: THREE.DoubleSide, depthWrite: false });
    const wg = new THREE.PlaneGeometry(0.16, 0.4);
    wg.translate(0.08, 0, -0.18);
    wg.rotateX(-Math.PI / 2);
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(wg, wm);
      w.position.set(0, 0.17, 0.08);
      w.scale.x = s;
      w.userData.s = s;
      wings.add(w);
    }
  }
  body.add(wings);
  return { root, body, legs, antennae, shell, nymph, wings };
}

export function animateRoach(m, phase, move, t, eating) {
  const amp = 0.55 * move;
  for (const L of m.legs) {
    const ph = phase + (L.tripod ? 0 : Math.PI);
    const sw = Math.sin(ph) * amp;
    const lift = Math.max(0, Math.cos(ph)) * 0.35 * move;
    L.g.rotation.y = -L.s * (L.base + sw);
    L.lift.rotation.z = 0.35 + lift;
  }
  for (const a of m.antennae) {
    const w = Math.sin(t * (eating ? 14 : 4) + a.s * 1.3) * (eating ? 0.25 : 0.18);
    a.g.rotation.y = a.s * 0.4 + w;
    a.g.rotation.x = -0.3 + Math.sin(t * 3 + a.s) * 0.08 + (eating ? 0.35 : 0);
    a.tip.rotation.x = 0.25 + Math.sin(t * 5 + a.s) * 0.1;
  }
  m.body.position.y = move > 0.05 ? Math.abs(Math.sin(phase)) * 0.008 : 0;
  m.body.rotation.x = eating ? 0.12 + Math.sin(t * 22) * 0.04 : 0;
}

// ---------------- 農場主 ----------------
function plaidTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#2f5d8a'; x.fillRect(0, 0, 64, 64);
  x.fillStyle = 'rgba(200,40,40,0.55)';
  for (let i = 0; i < 64; i += 16) { x.fillRect(i, 0, 5, 64); x.fillRect(0, i, 64, 5); }
  x.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 8; i < 64; i += 16) { x.fillRect(i, 0, 1, 64); x.fillRect(0, i, 64, 1); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

export function makeFarmer() {
  const root = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xe9b98d });
  const shirt = new THREE.MeshLambertMaterial({ map: plaidTex() });
  const pants = new THREE.MeshLambertMaterial({ color: 0x37465e });
  const boots = new THREE.MeshLambertMaterial({ color: 0x2b4a2e });
  const straw = new THREE.MeshLambertMaterial({ color: 0xe6c97f });
  const red = new THREE.MeshLambertMaterial({ color: 0xc8312b });
  const white = new THREE.MeshLambertMaterial({ color: 0xf5f5f0 });
  const black = new THREE.MeshBasicMaterial({ color: 0x111111 });

  const legGeo = new THREE.CylinderGeometry(0.27, 0.24, 1.75, 10);
  legGeo.translate(0, -0.875, 0);
  const bootGeo = new THREE.BoxGeometry(0.52, 0.75, 0.82);
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.32, 2.3, 0);
    leg.add(mesh(legGeo, pants));
    const b = mesh(bootGeo, boots);
    b.position.set(0, -1.93, 0.12);
    leg.add(b);
    root.add(leg);
    legs.push(leg);
  }
  const torso = mesh(new THREE.CylinderGeometry(0.66, 0.58, 2.0, 12), shirt);
  torso.scale.z = 0.72;
  torso.position.y = 3.3;
  root.add(torso);
  const belt = mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.18, 12), new THREE.MeshLambertMaterial({ color: 0x3a2a1a }));
  belt.scale.z = 0.72;
  belt.position.y = 2.4;
  root.add(belt);

  const upGeo = new THREE.CylinderGeometry(0.21, 0.19, 1.0, 8);
  upGeo.translate(0, -0.5, 0);
  const foreGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.9, 8);
  foreGeo.translate(0, -0.45, 0);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.82, 4.15, 0);
    arm.add(mesh(upGeo, shirt));
    const fore = new THREE.Group();
    fore.position.y = -1.0;
    fore.add(mesh(foreGeo, skin));
    const hand = mesh(SPH, skin);
    hand.scale.setScalar(0.19);
    hand.position.y = -0.98;
    fore.add(hand);
    arm.add(fore);
    root.add(arm);
    arms.push({ arm, fore, hand });
  }
  // 殺虫スプレー（右手）
  const can = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.62, 12), red);
  const cap = mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.14, 12), white);
  cap.position.y = 0.38;
  const label = mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.18, 12), new THREE.MeshLambertMaterial({ color: 0xf4d23c }));
  can.add(body, cap, label);
  can.position.set(0, -1.05, 0.12);
  can.rotation.x = 0.3;
  arms[1].fore.add(can);

  // 頭
  const headG = new THREE.Group();
  headG.position.y = 4.4;
  const neck = mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.3, 8), skin);
  neck.position.y = 0.1;
  const head = mesh(SPH, skin);
  head.scale.set(0.5, 0.55, 0.5);
  head.position.y = 0.62;
  headG.add(neck, head);
  const face = new THREE.Group();
  face.position.set(0, 0.62, 0.46);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = mesh(SPH_LO, black, false);
    e.scale.set(0.06, 0.08, 0.04);
    e.position.set(s * 0.17, 0.08, 0);
    const brow = mesh(new THREE.BoxGeometry(0.2, 0.05, 0.04), black, false);
    brow.position.set(s * 0.17, 0.24, 0);
    face.add(e, brow);
    eyes.push({ e, brow, s });
  }
  const mouth = mesh(new THREE.BoxGeometry(0.22, 0.05, 0.04), new THREE.MeshBasicMaterial({ color: 0x7a2a20 }), false);
  mouth.position.set(0, -0.2, 0);
  const nose = mesh(SPH_LO, skin, false);
  nose.scale.set(0.08, 0.09, 0.08);
  nose.position.set(0, 0, 0.04);
  face.add(mouth, nose);
  headG.add(face);
  const brim = mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.05, 24), straw);
  brim.position.y = 1.02;
  const crown = mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.45, 18), straw);
  crown.position.y = 1.26;
  const band = mesh(new THREE.CylinderGeometry(0.53, 0.53, 0.12, 18), red, false);
  band.position.y = 1.1;
  headG.add(brim, crown, band);
  root.add(headG);
  // 首のタオル
  const towel = mesh(new THREE.TorusGeometry(0.42, 0.11, 6, 16), white);
  towel.rotation.x = Math.PI / 2;
  towel.position.y = 4.35;
  root.add(towel);

  return { root, legs, arms, headG, face, eyes, mouth, can };
}

// ---------------- 収穫コンテナ ----------------
const VEG_COLORS = [0xd8241a, 0xf2c31b, 0xf07a14, 0xd8241a, 0x3d8f2a];
const ROT = new THREE.Color(0x4b3a1c);
const vegGeo = new THREE.SphereGeometry(0.21, 10, 8);
const stemGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.1, 5);
const flyGeo = new THREE.SphereGeometry(0.035, 5, 4);
const flyMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
const CRATE_COLORS = [0xe8742a, 0x3f8f4f, 0x3a6fc4];

export function makeCrate(i) {
  const g = new THREE.Group();
  const cm = new THREE.MeshLambertMaterial({ color: CRATE_COLORS[i % 3] });
  const { w, d, h } = CRATE;
  const parts = [
    [w, 0.06, d, 0, 0.03, 0],
    [w, h, 0.06, 0, h / 2, d / 2 - 0.03], [w, h, 0.06, 0, h / 2, -d / 2 + 0.03],
    [0.06, h, d, w / 2 - 0.03, h / 2, 0], [0.06, h, d, -w / 2 + 0.03, h / 2, 0],
  ];
  for (const [a, b, c, x, y, z] of parts) {
    const m = mesh(new THREE.BoxGeometry(a, b, c), cm);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    g.add(m);
  }
  const vegs = [];
  const mats = new Map();
  const stemMat = new THREE.MeshLambertMaterial({ color: 0x3c6b1f });
  for (let ix = 0; ix < 4; ix++) for (let iz = 0; iz < 2; iz++) {
    const hex = VEG_COLORS[Math.floor(rand() * VEG_COLORS.length)];
    if (!mats.has(hex)) mats.set(hex, { mat: new THREE.MeshStandardMaterial({ color: hex, roughness: 0.28, metalness: 0.05 }), base: new THREE.Color(hex) });
    const v = new THREE.Group();
    const m = mesh(vegGeo, mats.get(hex).mat);
    m.scale.set(1, 1.15, 1);
    const st = mesh(stemGeo, stemMat, false);
    st.position.y = 0.25;
    v.add(m, st);
    v.position.set(-0.52 + ix * 0.35 + (rand() - 0.5) * 0.06, h - 0.12 + rand() * 0.06, -0.22 + iz * 0.44);
    v.rotation.set(rand() * 0.5, rand() * 6, rand() * 0.5);
    g.add(v);
    vegs.push(v);
  }
  const flies = new THREE.Group();
  flies.visible = false;
  for (let k = 0; k < 5; k++) flies.add(new THREE.Mesh(flyGeo, flyMat));
  g.add(flies);
  return { group: g, vegs, mats: [...mats.values()], flies, stemMat };
}

export function setCrateRot(m, k) {
  for (const v of m.mats) v.mat.color.copy(v.base).lerp(ROT, k);
  for (const v of m.vegs) v.scale.set(1 - k * 0.25, 1 - k * 0.45, 1 - k * 0.25);
}

export function animateFlies(m, t) {
  if (!m.flies.visible) return;
  m.flies.children.forEach((f, i) => {
    const a = t * (2.2 + i * 0.4) + i * 1.7;
    f.position.set(Math.cos(a) * (0.5 + i * 0.07), 1.0 + Math.sin(t * 3 + i) * 0.2, Math.sin(a * 1.3) * 0.45);
  });
}

// ---------------- 粘着わな（ホイホイ） ----------------
let trapTexCache = null;
function trapTex() {
  if (trapTexCache) return trapTexCache;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#f6d64a'; x.fillRect(0, 0, 128, 64);
  x.fillStyle = '#d63a2a'; x.fillRect(0, 0, 128, 14);
  x.fillStyle = '#7b4a1e';
  x.font = 'bold 22px sans-serif';
  x.textAlign = 'center';
  x.fillText('ホイホイ', 64, 46);
  trapTexCache = new THREE.CanvasTexture(c);
  trapTexCache.colorSpace = THREE.SRGBColorSpace;
  return trapTexCache;
}
export function makeTrap() {
  const g = new THREE.Group();
  const base = mesh(new THREE.BoxGeometry(1.3, 0.04, 0.85), new THREE.MeshLambertMaterial({ color: 0xf2efe6 }));
  base.position.y = 0.02;
  base.receiveShadow = true;
  const glue = mesh(new THREE.BoxGeometry(1.1, 0.012, 0.65), new THREE.MeshStandardMaterial({ color: 0xd9b23a, roughness: 0.1, metalness: 0.1 }), false);
  glue.position.y = 0.045;
  g.add(base, glue);
  const roofMat = new THREE.MeshLambertMaterial({ map: trapTex(), side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const r = mesh(new THREE.PlaneGeometry(1.3, 0.56), roofMat);
    r.rotation.order = 'YXZ';
    r.rotation.x = -Math.PI / 2 + s * 0.85;
    if (s > 0) r.rotation.y = Math.PI;
    r.position.set(0, 0.24, s * 0.2);
    g.add(r);
  }
  return g;
}

// ---------------- 卵（卵鞘） ----------------
export function makeEgg() {
  const g = new THREE.Group();
  const geo = new THREE.CapsuleGeometry(0.06, 0.16, 4, 10);
  geo.rotateZ(Math.PI / 2);
  const m = mesh(geo, new THREE.MeshStandardMaterial({ color: 0x5a2c10, roughness: 0.3, metalness: 0.2 }));
  m.scale.set(1, 1.15, 0.85);
  m.position.y = 0.07;
  const keel = mesh(new THREE.BoxGeometry(0.2, 0.02, 0.02), new THREE.MeshStandardMaterial({ color: 0x8a5428 }), false);
  keel.position.y = 0.145;
  g.add(m, keel);
  return g;
}

// ---------------- 殺虫剤の霧 ----------------
export function makeCloud() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xe6f7d2, transparent: true, opacity: 0.28, depthWrite: false });
  const puffs = [];
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Mesh(SPH_LO, mat);
    const a = (i / 9) * Math.PI * 2;
    p.userData.off = new THREE.Vector3(Math.cos(a) * 0.55, 0.2 + rand() * 0.5, Math.sin(a) * 0.55);
    if (i === 0) p.userData.off.set(0, 0.45, 0);
    p.userData.s = 0.55 + rand() * 0.3;
    puffs.push(p);
    g.add(p);
  }
  return { group: g, puffs, mat };
}

// 地面の輪（警告・自分の目印）
export function makeRing(color, inner = 0.8, outer = 1, opacity = 0.6) {
  const geo = new THREE.RingGeometry(inner, outer, 40);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
  m.renderOrder = 2;
  return m;
}

// 農場主の視界（扇形）
export function makeCone(range, half) {
  const geo = new THREE.CircleGeometry(range, 28, -Math.PI / 2 - half, half * 2);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false }));
  m.renderOrder = 1;
  return m;
}
