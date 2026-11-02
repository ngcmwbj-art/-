// キャラクターと小物の見た目（基本形状と、その場で描いた質感で組み立て）
import * as THREE from 'three';
import { CRATE, paprikaGeometry } from './world.js';
import { rand } from './util.js';
import * as TX from './textures.js';

const SPH = new THREE.SphereGeometry(1, 24, 16);
const SPH_LO = new THREE.SphereGeometry(1, 10, 8);

function mesh(geo, mat, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow;
  return m;
}
// 体の軸が前後（z）を向いた球（UV の縦方向が前後になる）
const SPH_Z = (() => { const g = new THREE.SphereGeometry(1, 28, 20); g.rotateX(Math.PI / 2); return g; })();

// 共有の素材（毎回作るとメモリを食うので使い回す）
let RM = null;
function roachMats() {
  if (RM) return RM;
  const A = TX.roachAbdomen(), Wg = TX.roachWing();
  const chitin = (color, extra = {}) => new THREE.MeshPhysicalMaterial({
    color, roughness: 0.45, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.12, envMapIntensity: 0.3, ...extra,
  });
  RM = {
    abd: chitin(0xffffff, { map: A.map, normalMap: A.normal, normalScale: new THREE.Vector2(0.8, 0.8) }),
    abdN: chitin(0xd9a070, { map: A.map, normalMap: A.normal, normalScale: new THREE.Vector2(1, 1) }),
    wing: chitin(0xffffff, { map: Wg.map, normalMap: Wg.normal, roughness: 0.36, clearcoatRoughness: 0.1 }),
    pron: chitin(0xffffff, { map: TX.roachPronotum() }),
    pronN: chitin(0xe8b080, { map: TX.roachPronotum() }),
    dark: chitin(0x2a140a, { roughness: 0.45 }),
    leg: chitin(0x5a2c12, { roughness: 0.5, clearcoat: 0.6 }),
    eye: new THREE.MeshPhysicalMaterial({ color: 0x0b0806, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.02 }),
    spine: new THREE.MeshStandardMaterial({ color: 0x3a1c0c, roughness: 0.6 }),
    shadow: new THREE.MeshBasicMaterial({ map: TX.blobShadow(), transparent: true, depthWrite: false, opacity: 0.85 }),
    wingOpen: new THREE.MeshPhysicalMaterial({ color: 0xc89060, transparent: true, opacity: 0.55, roughness: 0.25, side: THREE.DoubleSide, depthWrite: false, clearcoat: 0.6 }),
  };
  return RM;
}
const G = {};
function geoOnce(k, fn) { if (!G[k]) G[k] = fn(); return G[k]; }

// ---------------- ゴキブリ ----------------
export function makeRoach(nymph = false) {
  const M = roachMats();
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // 足もとの影（地面に置く）
  const shadow = new THREE.Mesh(geoOnce('blob', () => { const g = new THREE.PlaneGeometry(0.5, 0.75); g.rotateX(-Math.PI / 2); return g; }), M.shadow);
  shadow.position.y = 0.006;
  shadow.renderOrder = 1;
  root.add(shadow);

  // 腹
  const abd = mesh(SPH_Z, nymph ? M.abdN : M.abd);
  abd.scale.set(0.155, 0.068, 0.27);
  abd.position.set(0, 0.1, -0.08);
  body.add(abd);
  // 前の翅（成虫だけ）：左右2枚が背中をおおう
  if (!nymph) {
    for (const s of [-1, 1]) {
      const w = mesh(SPH_Z, M.wing);
      w.scale.set(0.088, 0.03, 0.285);
      w.position.set(s * 0.043, 0.148, -0.085);
      w.rotation.set(0.04, s * 0.03, s * -0.12);
      body.add(w);
    }
  } else {
    // 幼虫は節の見える背中
    for (let i = 0; i < 5; i++) {
      const seg = mesh(SPH_Z, M.abdN);
      const k = 1 - Math.abs(i - 1.5) * 0.12;
      seg.scale.set(0.15 * k, 0.04, 0.06);
      seg.position.set(0, 0.135 - i * 0.004, 0.03 - i * 0.055);
      body.add(seg);
    }
  }
  // 前胸（盾のような板）
  const pron = mesh(SPH_Z, nymph ? M.pronN : M.pron);
  pron.scale.set(0.135, 0.045, 0.1);
  pron.position.set(0, 0.12, 0.17);
  pron.rotation.x = -0.08;
  body.add(pron);
  // 頭（前胸の下に半分かくれる）
  const head = mesh(SPH, M.dark);
  head.scale.set(0.062, 0.05, 0.055);
  head.position.set(0, 0.08, 0.255);
  head.rotation.x = 0.5;
  body.add(head);
  for (const s of [-1, 1]) {
    const e = mesh(SPH_LO, M.eye, false);
    e.scale.set(0.022, 0.032, 0.018);
    e.position.set(s * 0.045, 0.092, 0.262);
    e.rotation.z = s * 0.4;
    body.add(e);
  }
  // 小あご：食べるときに動く
  const palps = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Group();
    p.position.set(s * 0.02, 0.05, 0.29);
    p.userData.s = s;
    p.add(mesh(geoOnce('palp', () => { const g = new THREE.CylinderGeometry(0.005, 0.007, 0.06, 4); g.translate(0, -0.03, 0); return g; }), M.leg, false));
    p.rotation.x = 0.6;
    body.add(p);
    palps.push(p);
  }

  // 触角：細い節をつないで、むちのようにしなる
  const antGeo = geoOnce('ant', () => { const g = new THREE.CylinderGeometry(0.0035, 0.0055, 0.075, 4); g.rotateX(Math.PI / 2); g.translate(0, 0, 0.0375); return g; });
  const antennae = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(s * 0.028, 0.098, 0.29);
    let parent = a;
    const segs = [];
    for (let i = 0; i < 7; i++) {
      const sg = new THREE.Group();
      if (i > 0) sg.position.z = 0.075;
      const m = mesh(antGeo, M.leg, false);
      m.scale.setScalar(1 - i * 0.07);
      sg.add(m);
      parent.add(sg);
      segs.push(sg);
      parent = sg;
    }
    body.add(a);
    antennae.push({ g: a, segs, s, tip: segs[segs.length - 1] });
  }

  // 脚：付け根・もも・すね（とげ付き）・ふ節
  const coxaGeo = geoOnce('coxa', () => { const g = new THREE.SphereGeometry(1, 8, 6); g.scale(0.035, 0.022, 0.03); return g; });
  const femGeo = geoOnce('fem', () => { const g = new THREE.CylinderGeometry(0.012, 0.017, 0.12, 6); g.rotateZ(Math.PI / 2); g.translate(0.06, 0, 0); g.scale(1, 0.75, 1.3); return g; });
  const tibGeo = geoOnce('tib', () => { const g = new THREE.CylinderGeometry(0.007, 0.011, 0.15, 5); g.rotateZ(Math.PI / 2); g.translate(0.075, 0, 0); return g; });
  const tarGeo = geoOnce('tar', () => { const g = new THREE.CylinderGeometry(0.004, 0.006, 0.09, 4); g.rotateZ(Math.PI / 2); g.translate(0.045, 0, 0); return g; });
  const spineGeo = geoOnce('spine', () => { const g = new THREE.ConeGeometry(0.004, 0.03, 3); g.translate(0, 0.015, 0); return g; });
  const legs = [];
  const zs = [0.15, 0.04, -0.08];
  const bases = [0.7, 0.05, -0.75];
  const lens = [0.85, 1, 1.25];
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const g = new THREE.Group();
      g.position.set(s * 0.06, 0.08, zs[k]);
      const mir = new THREE.Group();
      mir.scale.set(s * lens[k], 1, lens[k]);
      const lift = new THREE.Group();
      lift.add(mesh(coxaGeo, M.leg, false));
      lift.add(mesh(femGeo, M.leg, false));
      const knee = new THREE.Group();
      knee.position.x = 0.12;
      knee.rotation.z = -1.2;
      knee.add(mesh(tibGeo, M.leg, false));
      for (let i = 0; i < 4; i++) {
        const sp = mesh(spineGeo, M.spine, false);
        sp.position.set(0.03 + i * 0.03, 0, 0);
        sp.rotation.z = -0.9;
        sp.rotation.x = (i % 2 ? 1 : -1) * 0.5;
        knee.add(sp);
      }
      const ankle = new THREE.Group();
      ankle.position.x = 0.15;
      ankle.rotation.z = 0.55;
      ankle.add(mesh(tarGeo, M.dark, false));
      knee.add(ankle);
      lift.add(knee);
      mir.add(lift);
      g.add(mir);
      body.add(g);
      const tripod = (k === 1) === (s < 0);
      legs.push({ g, lift, knee, s, base: bases[k], tripod });
    }
  }
  // 尾毛
  for (const s of [-1, 1]) {
    const c = mesh(geoOnce('cerc', () => new THREE.ConeGeometry(0.012, 0.08, 5)), M.leg, false);
    c.rotation.x = -Math.PI / 2 - 0.15;
    c.rotation.z = s * 0.35;
    c.position.set(s * 0.032, 0.1, -0.37);
    body.add(c);
  }
  // 後ろの翅（飛ぶときだけ広げる）
  const wings = new THREE.Group();
  wings.visible = false;
  if (!nymph) {
    const wg = geoOnce('wingOpen', () => { const g = new THREE.CircleGeometry(0.25, 16, 0, Math.PI); g.scale(0.7, 1.2, 1); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 2); g.translate(0, 0, -0.05); return g; });
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(wg, M.wingOpen);
      w.position.set(0, 0.17, 0.08);
      w.scale.x = s;
      w.userData.s = s;
      wings.add(w);
    }
  }
  body.add(wings);
  return { root, body, legs, antennae, nymph, wings, shadow, palps };
}

export function animateRoach(m, phase, move, t, eating) {
  const amp = 0.55 * move;
  for (const L of m.legs) {
    const ph = phase + (L.tripod ? 0 : Math.PI);
    const sw = Math.sin(ph) * amp;
    const lift = Math.max(0, Math.cos(ph)) * 0.4 * move;
    L.g.rotation.y = -L.s * (L.base + sw);
    L.lift.rotation.z = 0.45 + lift;
    L.knee.rotation.z = -1.2 - lift * 0.4;
  }
  for (const a of m.antennae) {
    const speed = eating ? 12 : 3.5;
    a.g.rotation.y = a.s * 0.45 + Math.sin(t * speed * 0.6 + a.s * 1.3) * (eating ? 0.25 : 0.15);
    a.g.rotation.x = -0.35 + (eating ? 0.45 : 0) + Math.sin(t * 2.7 + a.s) * 0.06;
    for (let i = 1; i < a.segs.length; i++) {
      const sg = a.segs[i];
      sg.rotation.y = a.s * 0.05 + Math.sin(t * speed + i * 0.7 + a.s) * 0.06;
      sg.rotation.x = 0.07 + Math.sin(t * speed * 0.8 + i * 0.9) * 0.04;
    }
  }
  for (const p of m.palps) p.rotation.x = 0.6 + (eating ? Math.sin(t * 24 + p.userData.s) * 0.35 : 0);
  m.body.position.y = move > 0.05 ? Math.abs(Math.sin(phase)) * 0.006 : 0;
  m.body.rotation.x = eating ? 0.12 + Math.sin(t * 22) * 0.03 : 0;
  m.body.rotation.y = move > 0.05 ? Math.sin(phase) * 0.03 : 0;
}

// ---------------- 農場主 ----------------
let FM = null;
function farmerMats() {
  if (FM) return FM;
  const P = TX.plaid(), D = TX.denim(), K = TX.knit(), T = TX.towel(), S = TX.straw();
  FM = {
    skin: new THREE.MeshPhysicalMaterial({ color: 0xd9a27a, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color(0xff9a7a), sheenRoughness: 0.6 }),
    shirt: new THREE.MeshStandardMaterial({ map: P.map, normalMap: P.normal, roughness: 0.85 }),
    pants: new THREE.MeshStandardMaterial({ map: D.map, normalMap: D.normal, roughness: 0.9 }),
    boots: new THREE.MeshPhysicalMaterial({ color: 0x24402a, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    sole: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 }),
    glove: new THREE.MeshStandardMaterial({ map: K.map, normalMap: K.normal, roughness: 1 }),
    cuff: new THREE.MeshStandardMaterial({ color: 0x2c5fb0, roughness: 0.9 }),
    straw: new THREE.MeshStandardMaterial({ map: S.map, normalMap: S.normal, roughness: 0.85, side: THREE.DoubleSide }),
    ribbon: new THREE.MeshStandardMaterial({ color: 0x9e1f1a, roughness: 0.7 }),
    towel: new THREE.MeshStandardMaterial({ map: T.map, normalMap: T.normal, roughness: 1 }),
    belt: new THREE.MeshStandardMaterial({ color: 0x3a2716, roughness: 0.55 }),
    buckle: new THREE.MeshStandardMaterial({ color: 0xc9b37a, metalness: 1, roughness: 0.3 }),
    eyeW: new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.2 }),
    iris: new THREE.MeshPhysicalMaterial({ color: 0x2a1a10, roughness: 0.05, clearcoat: 1 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.8 }),
    lip: new THREE.MeshStandardMaterial({ color: 0x9a5546, roughness: 0.6 }),
    can: new THREE.MeshPhysicalMaterial({ map: TX.sprayLabel(), roughness: 0.25, metalness: 0.4, clearcoat: 1 }),
    metal: new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 1, roughness: 0.2 }),
    cap: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.35 }),
    button: new THREE.MeshStandardMaterial({ color: 0xece6d6, roughness: 0.3 }),
  };
  return FM;
}

export function makeFarmer() {
  const M = farmerMats();
  const root = new THREE.Group();

  // 脚（作業ズボン＋長ぐつ）
  const legGeo = new THREE.CylinderGeometry(0.28, 0.23, 1.2, 14);
  legGeo.translate(0, -0.6, 0);
  const bootGeo = new THREE.CylinderGeometry(0.27, 0.25, 0.95, 14);
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.32, 2.3, 0);
    leg.add(mesh(legGeo, M.pants));
    const boot = mesh(bootGeo, M.boots);
    boot.position.y = -1.67;
    const toe = mesh(SPH, M.boots);
    toe.scale.set(0.27, 0.2, 0.42);
    toe.position.set(0, -2.1, 0.16);
    const sole = mesh(new THREE.BoxGeometry(0.56, 0.08, 0.9), M.sole);
    sole.position.set(0, -2.26, 0.1);
    const rim = mesh(new THREE.TorusGeometry(0.27, 0.035, 6, 16), M.boots);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -1.2;
    leg.add(boot, toe, sole, rim);
    root.add(leg);
    legs.push(leg);
  }
  // 胴（ろくろ形でふっくら）
  const prof = [[0.01, 2.2], [0.56, 2.22], [0.62, 2.5], [0.68, 3.0], [0.7, 3.5], [0.72, 3.9], [0.62, 4.2], [0.4, 4.36], [0.2, 4.42]].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = mesh(new THREE.LatheGeometry(prof, 24), M.shirt);
  torso.scale.z = 0.72;
  root.add(torso);
  const belt = mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.17, 24), M.belt);
  belt.scale.z = 0.74;
  belt.position.y = 2.42;
  const buckle = mesh(new THREE.BoxGeometry(0.2, 0.15, 0.04), M.buckle);
  buckle.position.set(0, 2.42, 0.45);
  root.add(belt, buckle);
  for (let i = 0; i < 4; i++) {
    const b = mesh(SPH_LO, M.button, false);
    b.scale.set(0.035, 0.035, 0.015);
    b.position.set(0, 2.75 + i * 0.4, 0.5);
    root.add(b);
  }
  const pocket = mesh(new THREE.BoxGeometry(0.32, 0.34, 0.03), M.shirt);
  pocket.position.set(0.28, 3.75, 0.48);
  pocket.rotation.x = -0.08;
  root.add(pocket);
  const collar = mesh(new THREE.TorusGeometry(0.3, 0.07, 8, 20, Math.PI * 1.4), M.shirt);
  collar.rotation.set(Math.PI / 2, 0, Math.PI * 0.8);
  collar.position.y = 4.36;
  root.add(collar);

  // 腕（そでをまくって軍手）
  const upGeo = new THREE.CylinderGeometry(0.22, 0.19, 1.0, 12);
  upGeo.translate(0, -0.5, 0);
  const foreGeo = new THREE.CylinderGeometry(0.16, 0.13, 0.82, 12);
  foreGeo.translate(0, -0.41, 0);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.84, 4.12, 0);
    const shoulder = mesh(SPH, M.shirt);
    shoulder.scale.setScalar(0.25);
    arm.add(shoulder, mesh(upGeo, M.shirt));
    const roll = mesh(new THREE.TorusGeometry(0.19, 0.06, 8, 16), M.shirt);
    roll.rotation.x = Math.PI / 2;
    roll.position.y = -0.95;
    arm.add(roll);
    const fore = new THREE.Group();
    fore.position.y = -1.0;
    fore.add(mesh(foreGeo, M.skin));
    const cuff = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12), M.cuff);
    cuff.position.y = -0.82;
    const hand = mesh(SPH, M.glove);
    hand.scale.set(0.17, 0.22, 0.13);
    hand.position.y = -1.0;
    const thumb = mesh(SPH_LO, M.glove);
    thumb.scale.set(0.06, 0.12, 0.06);
    thumb.position.set(s * -0.12, -0.95, 0.07);
    thumb.rotation.z = s * 0.6;
    fore.add(cuff, hand, thumb);
    arm.add(fore);
    root.add(arm);
    arms.push({ arm, fore, hand });
  }
  // 殺虫スプレー（右手）
  const can = new THREE.Group();
  const cbody = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.62, 20), M.can);
  const shoulderC = mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.1, 20), M.metal);
  shoulderC.position.y = 0.36;
  const capC = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 12), M.cap);
  capC.position.y = 0.46;
  const nozzle = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6), M.cap);
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.set(0, 0.48, 0.1);
  const bottom = mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.04, 20), M.metal);
  bottom.position.y = -0.33;
  can.add(cbody, shoulderC, capC, nozzle, bottom);
  can.position.set(0, -1.05, 0.12);
  can.rotation.x = 0.3;
  arms[1].fore.add(can);

  // 頭
  const headG = new THREE.Group();
  headG.position.y = 4.4;
  const neck = mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.32, 12), M.skin);
  neck.position.y = 0.12;
  const head = mesh(SPH, M.skin);
  head.scale.set(0.47, 0.55, 0.5);
  head.position.y = 0.64;
  const jaw = mesh(SPH, M.skin);
  jaw.scale.set(0.4, 0.3, 0.42);
  jaw.position.set(0, 0.42, 0.05);
  headG.add(neck, head, jaw);
  for (const s of [-1, 1]) {
    const ear = mesh(SPH_LO, M.skin);
    ear.scale.set(0.07, 0.14, 0.1);
    ear.position.set(s * 0.47, 0.62, 0);
    headG.add(ear);
  }
  const hairBack = mesh(SPH, M.hair);
  hairBack.scale.set(0.48, 0.32, 0.46);
  hairBack.position.set(0, 0.8, -0.1);
  headG.add(hairBack);
  const face = new THREE.Group();
  face.position.set(0, 0.62, 0.44);
  const eyes = [];
  for (const s of [-1, 1]) {
    const eg = new THREE.Group();
    eg.position.set(s * 0.17, 0.07, 0);
    const w = mesh(SPH_LO, M.eyeW, false);
    w.scale.set(0.085, 0.06, 0.04);
    const iris = mesh(SPH_LO, M.iris, false);
    iris.scale.set(0.045, 0.05, 0.02);
    iris.position.z = 0.03;
    eg.add(w, iris);
    const brow = mesh(new THREE.BoxGeometry(0.2, 0.045, 0.05), M.hair, false);
    brow.position.set(s * 0.17, 0.2, 0.01);
    face.add(eg, brow);
    eyes.push({ e: eg, brow, s });
  }
  const nose = mesh(SPH_LO, M.skin, false);
  nose.scale.set(0.08, 0.11, 0.1);
  nose.position.set(0, -0.04, 0.06);
  const mouth = mesh(new THREE.BoxGeometry(0.2, 0.04, 0.04), M.lip, false);
  mouth.position.set(0, -0.22, 0.01);
  face.add(nose, mouth);
  headG.add(face);
  // 麦わら帽子
  const brim = mesh(new THREE.CylinderGeometry(1.05, 1.1, 0.04, 40), M.straw);
  brim.position.y = 1.02;
  const crown = mesh(new THREE.CylinderGeometry(0.44, 0.52, 0.46, 30), M.straw);
  crown.position.y = 1.26;
  const topC = mesh(new THREE.SphereGeometry(0.44, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.straw);
  topC.scale.y = 0.25;
  topC.position.y = 1.49;
  const band = mesh(new THREE.CylinderGeometry(0.53, 0.53, 0.12, 30), M.ribbon, false);
  band.position.y = 1.1;
  headG.add(brim, crown, topC, band);
  root.add(headG);
  // 首のタオル
  const towel = mesh(new THREE.TorusGeometry(0.4, 0.12, 10, 24), M.towel);
  towel.rotation.x = Math.PI / 2;
  towel.position.y = 4.35;
  const tail = mesh(new THREE.BoxGeometry(0.22, 0.6, 0.06), M.towel);
  tail.position.set(0.22, 4.0, 0.42);
  tail.rotation.z = 0.15;
  root.add(towel, tail);

  return { root, legs, arms, headG, face, eyes, mouth, can };
}

// ---------------- 収穫コンテナ ----------------
const VEG_COLORS = [0xc81d12, 0xf0b90f, 0xe9670f, 0xc81d12, 0x3c7a22];
const ROT = new THREE.Color(0x4b3a1c);
const CRATE_COLORS = [0xe46a1f, 0x2f8a46, 0x2f63b8];
let CM = null;
function crateMats() {
  if (CM) return CM;
  const W = TX.crateWall();
  CM = {
    walls: CRATE_COLORS.map((c) => new THREE.MeshStandardMaterial({
      color: c, map: W.map, alphaMap: W.alpha, alphaTest: 0.5, normalMap: W.normal, roughness: 0.55, side: THREE.DoubleSide,
    })),
    base: CRATE_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 })),
    label: new THREE.MeshStandardMaterial({ map: TX.crateLabel(), roughness: 0.6 }),
    stem: new THREE.MeshStandardMaterial({ color: 0x3c6b1f, roughness: 0.6 }),
    fly: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.4 }),
    flyWing: new THREE.MeshBasicMaterial({ color: 0xccddee, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
    wallGeo: new THREE.PlaneGeometry(1, 1),
    bottomGeo: new THREE.BoxGeometry(CRATE.w, 0.05, CRATE.d),
    rimX: new THREE.BoxGeometry(CRATE.w, 0.05, 0.06),
    rimZ: new THREE.BoxGeometry(0.06, 0.05, CRATE.d),
    labelGeo: new THREE.PlaneGeometry(0.42, 0.21),
  };
  return CM;
}
const vegGeo = (() => { const g = paprikaGeometry(16); g.scale(0.2, 0.2, 0.2); return g; })();
const stemGeo = new THREE.CylinderGeometry(0.025, 0.04, 0.12, 6);
const calyxGeo = new THREE.CylinderGeometry(0.03, 0.09, 0.05, 6);
const flyGeo = new THREE.SphereGeometry(0.03, 6, 5);
const flyWGeo = new THREE.PlaneGeometry(0.06, 0.03);

export function makeCrate(i) {
  const M = crateMats();
  const g = new THREE.Group();
  const ci = i % 3;
  const { w, d, h } = CRATE;
  const t = 0.05;
  const walls = [
    [w, 0, d / 2 - t / 2, 0], [w, 0, -d / 2 + t / 2, 0],
    [d - t * 2, w / 2 - t / 2, 0, Math.PI / 2], [d - t * 2, -w / 2 + t / 2, 0, Math.PI / 2],
  ];
  for (const [a, x, z, ry] of walls) {
    const m = mesh(M.wallGeo, M.walls[ci]);
    m.scale.set(a, h, 1);
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    m.receiveShadow = true;
    g.add(m);
  }
  const bottom = mesh(M.bottomGeo, M.base[ci]);
  bottom.position.y = 0.025;
  bottom.receiveShadow = true;
  g.add(bottom);
  for (const [geo, x, z] of [[M.rimX, 0, d / 2 - 0.03], [M.rimX, 0, -d / 2 + 0.03], [M.rimZ, w / 2 - 0.03, 0], [M.rimZ, -w / 2 + 0.03, 0]]) {
    const r = mesh(geo, M.base[ci]);
    r.position.set(x, h - 0.025, z);
    g.add(r);
  }
  const label = mesh(M.labelGeo, M.label, false);
  label.position.set(-0.4, h * 0.42, d / 2 + 0.004);
  g.add(label);

  const vegs = [];
  const mats = new Map();
  for (let ix = 0; ix < 4; ix++) for (let iz = 0; iz < 2; iz++) {
    const hex = VEG_COLORS[Math.floor(rand() * VEG_COLORS.length)];
    if (!mats.has(hex)) mats.set(hex, { mat: new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.14, envMapIntensity: 0.6 }), base: new THREE.Color(hex) });
    const v = new THREE.Group();
    const m = mesh(vegGeo, mats.get(hex).mat);
    m.userData.ownMaterial = true;
    const st = mesh(stemGeo, M.stem, false);
    st.position.y = 0.24;
    st.rotation.z = 0.3;
    const cx = mesh(calyxGeo, M.stem, false);
    cx.position.y = 0.19;
    v.add(m, st, cx);
    v.position.set(-0.52 + ix * 0.35 + (rand() - 0.5) * 0.06, h - 0.14 + rand() * 0.06, -0.22 + iz * 0.44);
    v.rotation.set(rand() * 0.6 - 0.3, rand() * 6, rand() * 0.6 - 0.3);
    g.add(v);
    vegs.push(v);
  }
  const flies = new THREE.Group();
  flies.visible = false;
  for (let k = 0; k < 6; k++) {
    const f = new THREE.Group();
    f.add(new THREE.Mesh(flyGeo, M.fly));
    for (const s of [-1, 1]) {
      const wgm = new THREE.Mesh(flyWGeo, M.flyWing);
      wgm.position.set(s * 0.04, 0.02, 0);
      wgm.rotation.x = -Math.PI / 2;
      f.add(wgm);
    }
    flies.add(f);
  }
  g.add(flies);
  return { group: g, vegs, mats: [...mats.values()], flies };
}

export function setCrateRot(m, k) {
  for (const v of m.mats) {
    v.mat.color.copy(v.base).lerp(ROT, k);
    v.mat.roughness = 0.3 + k * 0.6;
    v.mat.clearcoat = 1 - k;
  }
  for (const v of m.vegs) v.scale.set(1 - k * 0.25, 1 - k * 0.45, 1 - k * 0.25);
}

export function animateFlies(m, t) {
  if (!m.flies.visible) return;
  m.flies.children.forEach((f, i) => {
    const a = t * (2.2 + i * 0.4) + i * 1.7;
    f.position.set(Math.cos(a) * (0.5 + i * 0.07), 1.0 + Math.sin(t * 3 + i) * 0.2, Math.sin(a * 1.3) * 0.45);
    f.rotation.y = -a;
    f.children[1].rotation.z = Math.sin(t * 90) * 0.6;
    f.children[2].rotation.z = -Math.sin(t * 90) * 0.6;
  });
}

// ---------------- 粘着わな（ホイホイ） ----------------
function trapTex() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#f6d64a'; x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#d63a2a'; x.fillRect(0, 0, 256, 26);
  for (let i = 0; i < 256; i += 32) { x.fillStyle = '#b52a1d'; x.fillRect(i, 0, 14, 26); }
  x.fillStyle = '#7b4a1e';
  x.font = 'bold 44px "Hiragino Sans","Yu Gothic",sans-serif';
  x.textAlign = 'center';
  x.fillText('ホイホイ', 128, 86);
  x.font = 'bold 16px sans-serif';
  x.fillText('ごきぶり用 粘着シート', 128, 114);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
let TM = null;
export function makeTrap() {
  if (!TM) {
    TM = {
      base: new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.7 }),
      glue: new THREE.MeshPhysicalMaterial({ color: 0xc9a02a, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0, transparent: true, opacity: 0.92 }),
      roof: new THREE.MeshStandardMaterial({ map: trapTex(), side: THREE.DoubleSide, roughness: 0.55 }),
      baseGeo: new THREE.BoxGeometry(1.3, 0.04, 0.85),
      glueGeo: new THREE.BoxGeometry(1.1, 0.012, 0.65),
      roofGeo: new THREE.PlaneGeometry(1.3, 0.56),
    };
  }
  const g = new THREE.Group();
  const base = mesh(TM.baseGeo, TM.base);
  base.position.y = 0.02;
  base.receiveShadow = true;
  const glue = mesh(TM.glueGeo, TM.glue, false);
  glue.position.y = 0.045;
  g.add(base, glue);
  for (const s of [-1, 1]) {
    const r = mesh(TM.roofGeo, TM.roof);
    r.rotation.order = 'YXZ';
    r.rotation.x = -Math.PI / 2 + s * 0.85;
    if (s > 0) r.rotation.y = Math.PI;
    r.position.set(0, 0.24, s * 0.2);
    g.add(r);
  }
  return g;
}

// ---------------- 卵（卵鞘） ----------------
let EM = null;
export function makeEgg() {
  if (!EM) {
    const geo = new THREE.CapsuleGeometry(0.06, 0.16, 6, 14);
    geo.rotateZ(Math.PI / 2);
    EM = {
      geo,
      mat: new THREE.MeshPhysicalMaterial({ color: 0x5a2c10, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 }),
      keelGeo: new THREE.BoxGeometry(0.2, 0.02, 0.02),
      keel: new THREE.MeshStandardMaterial({ color: 0x8a5428 }),
    };
  }
  const g = new THREE.Group();
  const m = mesh(EM.geo, EM.mat);
  m.scale.set(1, 1.15, 0.85);
  m.position.y = 0.07;
  const keel = mesh(EM.keelGeo, EM.keel, false);
  keel.position.y = 0.145;
  g.add(m, keel);
  return g;
}

// ---------------- 殺虫剤の霧 ----------------
const cloudGeo = new THREE.SphereGeometry(1, 14, 10);
export function makeCloud() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xeaf7dc, transparent: true, opacity: 0.28, depthWrite: false, roughness: 1, emissive: 0x30402a });
  const puffs = [];
  for (let i = 0; i < 11; i++) {
    const p = new THREE.Mesh(cloudGeo, mat);
    if (i === 0) p.userData.ownMaterial = true;
    const a = (i / 11) * Math.PI * 2;
    p.userData.off = new THREE.Vector3(Math.cos(a) * 0.55, 0.2 + rand() * 0.6, Math.sin(a) * 0.55);
    if (i === 0) p.userData.off.set(0, 0.45, 0);
    p.userData.s = 0.5 + rand() * 0.35;
    puffs.push(p);
    g.add(p);
  }
  return { group: g, puffs, mat };
}

// 地面の輪（警告・自分の目印）
const ringGeos = new Map();
export function makeRing(color, inner = 0.8, outer = 1, opacity = 0.6) {
  const key = `${inner}-${outer}`;
  if (!ringGeos.has(key)) { const geo = new THREE.RingGeometry(inner, outer, 48); geo.rotateX(-Math.PI / 2); ringGeos.set(key, geo); }
  const m = new THREE.Mesh(ringGeos.get(key), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  m.renderOrder = 2;
  m.userData.ownMaterial = true;
  return m;
}

// 農場主の視界（扇形）
export function makeCone(range, half) {
  const geo = new THREE.CircleGeometry(range, 32, -Math.PI / 2 - half, half * 2);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false }));
  m.renderOrder = 1;
  m.userData.ownMaterial = true;
  m.userData.ownGeometry = true;
  return m;
}

// 片づけ：その物だけが持つ材質・形を捨てる（共有の物は残す）
export function disposeObject(obj) {
  obj.traverse((o) => {
    if (!o.userData) return;
    if (o.userData.ownMaterial && o.material) o.material.dispose();
    if (o.userData.ownGeometry && o.geometry) o.geometry.dispose();
  });
}
