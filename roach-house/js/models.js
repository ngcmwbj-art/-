// キャラクターと小物の見た目（基本形状と、その場で描いた質感で組み立て）
import * as THREE from 'three';
import { CRATE } from './world.js';
import { paprikaVariants, paprikaStem, paprikaMaterial, paprikaStemMaterial, PAPRIKA_COLORS } from './paprika.js';
import { rand } from './util.js';
import { regLo } from './lod.js';
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
// 省エネ用のあらい丸（ゴキブリの体・脚の節など）
regLo(SPH_Z, (() => { const g = new THREE.SphereGeometry(1, 12, 9); g.rotateX(Math.PI / 2); return g; })());

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
// 羽の色の着せかえ（自分のゴキブリだけ）
export const WING_COLORS = {
  normal: { label: 'ノーマル', color: 0xffffff },
  black: { label: '黒光り', color: 0x3a3a40 },
  gold: { label: 'こがね', color: 0xffd36a },
  paprika: { label: 'パプリカ赤', color: 0xff5a45 },
  leaf: { label: '若葉', color: 0x9cff8a },
};
// 羽のもよう（色とは別に選べる）
export const WING_PATTERNS = {
  none: { label: 'なし' },
  dots: { label: '水玉' },
  stripes: { label: 'しま' },
  stars: { label: '星' },
};
function patternTexture(base, pat) {
  const src = base.image;
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  const w = c.width, h = c.height;
  x.fillStyle = 'rgba(255, 238, 190, 0.85)';
  x.strokeStyle = 'rgba(255, 238, 190, 0.85)';
  if (pat === 'dots') {
    for (let j = 0; j < 9; j++) for (let i = 0; i < 4; i++) {
      x.beginPath(); x.arc((i + 0.5 + (j % 2) * 0.5) * w / 4, (j + 0.5) * h / 9, w * 0.07, 0, Math.PI * 2); x.fill();
    }
  } else if (pat === 'stripes') {
    x.lineWidth = h / 22;
    for (let j = 1; j < 10; j++) { x.beginPath(); x.moveTo(0, j * h / 10); x.lineTo(w, j * h / 10 + h * 0.03); x.stroke(); }
  } else if (pat === 'stars') {
    const star = (cx, cy, r) => {
      x.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      x.closePath(); x.fill();
    };
    x.fillStyle = 'rgba(255, 214, 90, 0.95)';
    for (let j = 0; j < 6; j++) for (let i = 0; i < 3; i++) star((i + 0.5 + (j % 2) * 0.4) * w / 3, (j + 0.5) * h / 6, w * 0.11);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = base.colorSpace; t.wrapS = base.wrapS; t.wrapT = base.wrapT; t.anisotropy = base.anisotropy;
  return t;
}
const wingCache = {};
function wingMat(key, pat = 'none') {
  const M = roachMats();
  const noColor = !key || key === 'normal' || !WING_COLORS[key];
  const noPat = !pat || pat === 'none' || !WING_PATTERNS[pat];
  if (noColor && noPat) return M.wing;
  const ck = `${noColor ? 'normal' : key}|${noPat ? 'none' : pat}`;
  if (!wingCache[ck]) {
    const mt = M.wing.clone();
    if (!noColor) mt.color.setHex(WING_COLORS[key].color);
    if (!noPat && M.wing.map && M.wing.map.image) mt.map = patternTexture(M.wing.map, pat);
    wingCache[ck] = mt;
  }
  return wingCache[ck];
}
export function makeRoach(nymph = false, wingKey = 'normal', pattern = 'none') {
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
  const shell = [];
  if (!nymph) {
    for (const s of [-1, 1]) {
      const w = mesh(SPH_Z, wingMat(wingKey, pattern));
      shell.push(w);
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
    // 仲間（幼虫）は数が多くなるので、触角の節を少なくして軽くする
    const nSeg = nymph ? 3 : 7;
    for (let i = 0; i < nSeg; i++) {
      const sg = new THREE.Group();
      if (i > 0) sg.position.z = 0.075 * (7 / nSeg);
      const m = mesh(antGeo, M.leg, false);
      m.scale.set(1 - i * 0.07 * (7 / nSeg), 1 - i * 0.07 * (7 / nSeg), 7 / nSeg);
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
      for (let i = 0; i < (nymph ? 0 : 4); i++) {
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
  return { root, body, legs, antennae, nymph, wings, shadow, palps, shell };
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
  // パーマ頭：小さな巻き毛のかたまりを頭にびっしり並べる（ところどころ白髪）
  {
    const curlGeo = new THREE.IcosahedronGeometry(1, 1);
    const curlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0.05 });
    const pts = [];
    const N = 560;
    for (let i = 0; i < N; i++) {
      // 球の上にまんべんなく点を置く
      const y = 1 - (i + 0.5) / N * 2;
      const r = Math.sqrt(1 - y * y);
      const a = i * 2.39996;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const theta = Math.acos(y); // 頭のてっぺんからの角度
      const front = z > 0.25 && Math.abs(x) < 0.85;
      if (front && theta > 0.78) continue;            // 額から下は顔
      if (!front && theta > 1.62) continue;           // 襟足まで
      if (Math.abs(x) > 0.82 && theta > 1.25 && z > -0.2) continue; // 耳のまわりはあける
      pts.push([x, y, z]);
    }
    const curls = new THREE.InstancedMesh(curlGeo, curlMat, pts.length);
    const d = new THREE.Object3D();
    const c = new THREE.Color();
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    pts.forEach(([x, y, z], i) => {
      const puff = 1.08 + rnd() * 0.08 + (y > 0.3 ? 0.06 : 0); // 上ほどふくらむ
      d.position.set(x * 0.47 * puff, 0.64 + y * 0.55 * puff, z * 0.5 * puff);
      d.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
      d.scale.setScalar(0.06 + rnd() * 0.03);
      d.updateMatrix();
      curls.setMatrixAt(i, d.matrix);
      c.setHex(rnd() < 0.1 ? 0x5e5853 : rnd() < 0.5 ? 0x231e1a : 0x332b25);
      curls.setColorAt(i, c);
    });
    curls.castShadow = true;
    headG.add(curls);
    // もみあげ
    // 長いもみあげ：パーマの巻き毛を、髪から耳の前を通ってあごの近くまでつなげて並べる
    const sbPts = [];
    for (const s of [-1, 1]) {
      for (let k = 0; k <= 9; k++) {
        const t = k / 9;
        const y = 0.8 - t * 0.5;
        const x = s * (0.455 - t * 0.075);
        const z = 0.04 + t * 0.12;
        sbPts.push([x, y, z, 0.058 - t * 0.012]);
        sbPts.push([x - s * 0.01, y - 0.025, z + 0.06, 0.05 - t * 0.012]);
        sbPts.push([x + s * 0.012, y - 0.012, z + 0.03, 0.054 - t * 0.012]);
        sbPts.push([x - s * 0.018, y - 0.04, z + 0.1, 0.044 - t * 0.01]);
      }
    }
    const sb = new THREE.InstancedMesh(curlGeo, curlMat, sbPts.length);
    sbPts.forEach(([x, y, z, sc], i) => {
      d.position.set(x, y, z);
      d.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
      d.scale.setScalar(sc);
      d.updateMatrix();
      sb.setMatrixAt(i, d.matrix);
      sb.setColorAt(i, c.setHex(rnd() < 0.5 ? 0x231e1a : 0x332b25));
    });
    headG.add(sb);
  }
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
  // 怒ったときの汗と、パニックの目回し（今の丸い形にそろえた、かんたんな形）
  const sweatMat = new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, roughness: 0.05, transmission: 0.3, transparent: true, opacity: 0.85, clearcoat: 1 });
  const sweat = [];
  for (const [x, y] of [[-0.36, 0.22], [0.38, 0.12], [0.3, 0.3]]) {
    const d = mesh(SPH_LO, sweatMat, false);
    d.scale.set(0.035, 0.055, 0.03);
    d.position.set(x, y, -0.02);
    d.visible = false;
    d.userData.y0 = y;
    face.add(d);
    sweat.push(d);
  }
  const dizzyMat = new THREE.MeshBasicMaterial({ color: 0x2a1c14 });
  const dizzy = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(s * 0.17, 0.07, 0.05);
    for (let k = 0; k < 2; k++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03 + k * 0.03, 0.008, 4, 16, Math.PI * 1.6), dizzyMat);
      ring.rotation.z = k * 2;
      g.add(ring);
    }
    g.visible = false;
    face.add(g);
    dizzy.push(g);
  }
  headG.add(face);
  root.add(headG);
  // 首のタオル
  const towel = mesh(new THREE.TorusGeometry(0.4, 0.12, 10, 24), M.towel);
  towel.rotation.x = Math.PI / 2;
  towel.position.y = 4.35;
  const tail = mesh(new THREE.BoxGeometry(0.22, 0.6, 0.06), M.towel);
  tail.position.set(0.22, 4.0, 0.42);
  tail.rotation.z = 0.15;
  root.add(towel, tail);

  return { root, legs, arms, headG, face, eyes, mouth, can, sweat, dizzy, skin: M.skin, skin0: M.skin.color.clone() };
}

// ---------------- 収穫コンテナ ----------------
export const VEG_COLORS = [PAPRIKA_COLORS.red, PAPRIKA_COLORS.yellow, PAPRIKA_COLORS.orange];
export const VEG_COLOR_NAMES = ['赤', '黄', '橙'];
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
const flyGeo = new THREE.SphereGeometry(0.03, 6, 5);
const flyWGeo = new THREE.PlaneGeometry(0.06, 0.03);

export function makeCrate(i, colorIndex = i) {
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

  // 中身：1箱に1色（出荷用は色をそろえる）。下に8個、上に3個を重ねて、向きはばらばら
  const vegs = [];
  const mats = new Map();
  const variants = paprikaVariants();
  const stemGeo = paprikaStem();
  const hex = VEG_COLORS[colorIndex % VEG_COLORS.length];
  mats.set(hex, { mat: paprikaMaterial(hex), base: new THREE.Color(hex) });
  const spots = [];
  for (let ix = 0; ix < 4; ix++) for (let iz = 0; iz < 2; iz++) spots.push([-0.52 + ix * 0.35, h - 0.2, -0.22 + iz * 0.44]);
  for (const x of [-0.35, 0, 0.35]) spots.push([x, h - 0.05, (rand() - 0.5) * 0.2]);
  for (const [x, y, z] of spots) {
    const geo = variants[Math.floor(rand() * variants.length)];
    const v = new THREE.Group();
    const m = mesh(geo, mats.get(hex).mat);
    m.userData.ownMaterial = true;
    const st = mesh(stemGeo, paprikaStemMaterial(), false);
    st.position.y = geo.userData.stemOffset;
    v.add(m, st);
    v.scale.setScalar(0.19 + rand() * 0.025);
    v.position.set(x + (rand() - 0.5) * 0.05, y + rand() * 0.04, z);
    // 立っている物・横に倒れている物・逆さの物
    const pose = rand();
    if (pose < 0.45) v.rotation.set(rand() * 0.4 - 0.2, rand() * 6.28, rand() * 0.4 - 0.2);
    else if (pose < 0.85) v.rotation.set(Math.PI / 2 + rand() * 0.5 - 0.25, rand() * 6.28, 0, 'YXZ');
    else v.rotation.set(Math.PI - 0.3 + rand() * 0.6, rand() * 6.28, 0, 'YXZ');
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
  // 第19回：かじられるほど、箱に穴が増える（3段階。絵を切りかえるだけで軽い）
  const holes = [];
  const HM = crateHoleMat();
  const hspots = [
    [[0.3, 0.32, d / 2 + 0.006, 0, 0.07], [-0.5, 0.18, -d / 2 - 0.006, Math.PI, 0.06]],
    [[-0.15, 0.2, d / 2 + 0.006, 0, 0.09], [w / 2 + 0.006, 0.3, 0.1, Math.PI / 2, 0.08], [0.2, 0.36, -d / 2 - 0.006, Math.PI, 0.08]],
    [[0.55, 0.14, d / 2 + 0.006, 0, 0.11], [-w / 2 - 0.006, 0.2, -0.12, -Math.PI / 2, 0.1], [-0.25, 0.3, -d / 2 - 0.006, Math.PI, 0.12], [0.62, 0.36, d / 2 + 0.006, 0, 0.06]],
  ];
  for (const set of hspots) {
    const hg = new THREE.Group();
    for (const [x, y, z, ry, r] of set) {
      const m = new THREE.Mesh(crateHoleGeo(), HM);
      m.position.set(x, y, z); m.rotation.y = ry; m.scale.set(r, r * 0.8, 1);
      hg.add(m);
    }
    hg.visible = false;
    g.add(hg);
    holes.push(hg);
  }
  return { group: g, vegs, mats: [...mats.values()], flies, holes };
}
let _holeGeo = null, _holeMat = null, _stampMat = null, _goldMat = null;
function crateHoleGeo() {
  if (!_holeGeo) {
    // ぎざぎざの穴（かじったあと）
    const sh = new THREE.Shape();
    const n = 9;
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * Math.PI * 2, rr = k % 2 ? 0.75 : 1;
      if (k === 0) sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    _holeGeo = new THREE.ShapeGeometry(sh);
  }
  return _holeGeo;
}
function crateHoleMat() {
  if (!_holeMat) _holeMat = new THREE.MeshBasicMaterial({ color: 0x140c06, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
  return _holeMat;
}
// 第20回：出荷ジャックで虫入りになった箱に、赤い「返品」のはんこ
export function addReturnStamp(m) {
  if (m.stamp) return;
  if (!_stampMat) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const x = c.getContext('2d');
    x.translate(64, 64); x.rotate(-0.25);
    x.strokeStyle = '#d42020'; x.lineWidth = 9; x.beginPath(); x.arc(0, 0, 52, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 42, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#d42020'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('返品', 0, 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    _stampMat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  }
  const g = new THREE.Group();
  for (const s of [1, -1]) {
    const q = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), _stampMat);
    q.position.set(0.2 * s, CRATE.h * 0.5, s * (CRATE.d / 2 + 0.012));
    q.rotation.y = s > 0 ? 0 : Math.PI;
    g.add(q);
  }
  m.group.add(g);
  m.stamp = g;
}
// 第20回：まれに「金のパプリカ」の箱（上の段の真ん中を金色に）
export function makeGoldCrate(m) {
  if (!_goldMat) _goldMat = new THREE.MeshStandardMaterial({ color: 0xffcc33, metalness: 0.85, roughness: 0.25, emissive: 0x6a4a00, emissiveIntensity: 0.6 });
  const v = m.vegs[m.vegs.length - 2];
  if (!v) return;
  v.children[0].material = _goldMat;
  v.userData.gold = true;
  m.gold = v;
}

export function setCrateRot(m, k) {
  // 穴は残り75%・50%・25%で1段ずつ
  if (m.holes) for (let i = 0; i < m.holes.length; i++) { const on = k > 0.25 + i * 0.25; if (m.holes[i].visible !== on) m.holes[i].visible = on; }
  for (const v of m.mats) {
    v.mat.color.copy(v.base).lerp(ROT, k);
    v.mat.roughness = 0.22 + k * 0.6;
    v.mat.clearcoat = 1 - k * 0.9;
  }
  for (const v of m.vegs) {
    if (v.userData.s0 === undefined) v.userData.s0 = v.scale.x;
    const b = v.userData.s0;
    v.scale.set(b * (1 - k * 0.2), b * (1 - k * 0.35), b * (1 - k * 0.2));
  }
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
// ---------------- 毒エサ（黒い丸い容器） ----------------
let BM = null;
export function makeBait() {
  if (!BM) {
    BM = {
      body: new THREE.MeshPhysicalMaterial({ color: 0x1b1b1d, roughness: 0.35, clearcoat: 0.6 }),
      label: new THREE.MeshStandardMaterial({ color: 0xf2c31b, roughness: 0.5 }),
      hole: new THREE.MeshBasicMaterial({ color: 0x000000 }),
      paste: new THREE.MeshStandardMaterial({ color: 0xd9c08a, roughness: 0.8 }),
      bodyGeo: new THREE.CylinderGeometry(0.36, 0.4, 0.1, 28),
      labelGeo: new THREE.CylinderGeometry(0.16, 0.16, 0.012, 20),
      holeGeo: new THREE.BoxGeometry(0.14, 0.07, 0.03),
    };
  }
  const g = new THREE.Group();
  const b = mesh(BM.bodyGeo, BM.body);
  b.position.y = 0.05;
  b.receiveShadow = true;
  const l = mesh(BM.labelGeo, BM.label, false);
  l.position.y = 0.106;
  g.add(b, l);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    const h = mesh(BM.holeGeo, BM.hole, false);
    h.position.set(Math.cos(a) * 0.39, 0.04, Math.sin(a) * 0.39);
    h.rotation.y = -a;
    const p = mesh(BM.holeGeo, BM.paste, false);
    p.scale.set(0.6, 0.6, 0.5);
    p.position.set(Math.cos(a) * 0.37, 0.03, Math.sin(a) * 0.37);
    p.rotation.y = -a;
    g.add(h, p);
  }
  return g;
}

// ---------------- けむり玉の缶 ----------------
export function makeFogger() {
  const g = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.8, 20), new THREE.MeshPhysicalMaterial({ color: 0xeeeeee, roughness: 0.3, metalness: 0.5, clearcoat: 0.8 }));
  body.position.y = 0.4;
  const band = mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.3, 20), new THREE.MeshStandardMaterial({ color: 0xc8312b, roughness: 0.5 }), false);
  band.position.y = 0.45;
  const cap = mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.12, 20), new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8, roughness: 0.3 }));
  cap.position.y = 0.86;
  g.add(body, band, cap);
  g.traverse((o) => { if (o.isMesh) { o.userData.ownMaterial = true; o.userData.ownGeometry = true; } });
  return g;
}

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

// ---------------- ハウスのネコ（くわしい形は cat.js） ----------------
export { makeCat } from './cat.js';

// ---------------- JAの検品員（緑の帽子とベスト、バインダー） ----------------
export function makeInspector() {
  const root = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xe0b08a, roughness: 0.6 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.8 });
  const vest = new THREE.MeshStandardMaterial({ color: 0x2e8b3e, roughness: 0.7 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x3b3f46, roughness: 0.8 });
  const shoe = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.5 });
  const legs = [];
  for (const s of [-1, 1]) {
    const L = new THREE.Group();
    L.position.set(s * 0.28, 2.2, 0);
    const g = new THREE.CylinderGeometry(0.22, 0.2, 2.1, 10);
    g.translate(0, -1.05, 0);
    L.add(mesh(g, pants));
    const sh = mesh(new THREE.BoxGeometry(0.34, 0.18, 0.62), shoe);
    sh.position.set(0, -2.12, 0.12);
    L.add(sh);
    root.add(L);
    legs.push(L);
  }
  const torso = mesh(new THREE.CylinderGeometry(0.6, 0.52, 1.9, 14), shirt);
  torso.scale.z = 0.7;
  torso.position.y = 3.15;
  const vestM = mesh(new THREE.CylinderGeometry(0.63, 0.55, 1.5, 14, 1, true), vest);
  vestM.scale.z = 0.72;
  vestM.position.y = 3.3;
  root.add(torso, vestM);
  const head = mesh(SPH, skin);
  head.scale.set(0.42, 0.5, 0.45);
  head.position.y = 4.65;
  const cap = mesh(new THREE.SphereGeometry(0.46, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), vest);
  cap.position.y = 4.85;
  const visor = mesh(new THREE.BoxGeometry(0.6, 0.04, 0.35), vest);
  visor.position.set(0, 4.86, 0.5);
  root.add(head, cap, visor);
  for (const s of [-1, 1]) {
    const e = mesh(SPH_LO, new THREE.MeshBasicMaterial({ color: 0x111111 }), false);
    e.scale.set(0.05, 0.06, 0.03);
    e.position.set(s * 0.15, 4.72, 0.42);
    root.add(e);
  }
  const arms = [];
  for (const s of [-1, 1]) {
    const A = new THREE.Group();
    A.position.set(s * 0.72, 3.95, 0);
    const g = new THREE.CylinderGeometry(0.17, 0.14, 1.7, 8);
    g.translate(0, -0.85, 0);
    A.add(mesh(g, shirt));
    root.add(A);
    arms.push(A);
  }
  // バインダー
  const board = mesh(new THREE.BoxGeometry(0.5, 0.65, 0.04), new THREE.MeshStandardMaterial({ color: 0x8a5a2b }));
  board.position.set(0.2, -1.5, 0.35);
  board.rotation.x = -0.9;
  arms[0].add(board);
  arms[0].rotation.x = -0.8;
  root.traverse((o) => { if (o.isMesh) { o.userData.ownMaterial = true; o.userData.ownGeometry = true; } });
  return { root, legs, arms };
}

// ---------------- いたずら・隠れ場所の小物 ----------------
// 農場主のお弁当（ふた付きの弁当箱と、包みのふろしき）
export function makeBento() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.42), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.35 }));
  box.position.y = 0.08; box.castShadow = true; box.receiveShadow = true;
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.02, 0.38), new THREE.MeshStandardMaterial({ color: 0xb0302a, roughness: 0.4 }));
  rim.position.y = 0.165;
  const rice = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.34), new THREE.MeshStandardMaterial({ color: 0xf6f3ea, roughness: 0.8 }));
  rice.position.set(-0.13, 0.17, 0);
  const ume = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc0202a, roughness: 0.5 }));
  ume.position.set(-0.13, 0.195, 0);
  const egg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.1), new THREE.MeshStandardMaterial({ color: 0xf2c94a, roughness: 0.6 }));
  egg.position.set(0.12, 0.18, -0.08);
  const sausage = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.08, 4, 8), new THREE.MeshStandardMaterial({ color: 0xc8452e, roughness: 0.5 }));
  sausage.rotation.z = Math.PI / 2; sausage.position.set(0.13, 0.18, 0.08);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.03, 0.44), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.35 }));
  lid.position.set(0.05, 0.02, 0.38); lid.rotation.y = 0.35; lid.castShadow = true;
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshStandardMaterial({ color: 0x3a6fb0, roughness: 0.9, side: THREE.DoubleSide }));
  cloth.rotation.x = -Math.PI / 2; cloth.rotation.z = 0.6; cloth.position.y = 0.004; cloth.receiveShadow = true;
  g.add(cloth, box, rim, rice, ume, egg, sausage, lid);
  g.userData.food = [egg, sausage, ume];
  g.traverse((o) => { if (o.isMesh) { o.userData.ownMaterial = true; o.userData.ownGeometry = true; } });
  return g;
}

// 農場主のラジオ（ステージ3から、作業場の床に置く）
export function makeRadio() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.24), new THREE.MeshStandardMaterial({ color: 0xb8362c, roughness: 0.45 }));
  body.position.y = 0.21; body.castShadow = true; body.receiveShadow = true;
  const grille = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), new THREE.MeshStandardMaterial({ color: 0x2b2522, roughness: 0.8 }));
  grille.position.set(-0.17, 0.21, 0.121);
  const dial = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.01), new THREE.MeshStandardMaterial({ color: 0xf1e6c8, roughness: 0.5, emissive: 0x332a10 }));
  dial.position.set(0.17, 0.25, 0.122);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 }));
  knob.rotation.x = Math.PI / 2; knob.position.set(0.17, 0.12, 0.13);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 6, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.4 }));
  handle.position.set(0, 0.42, 0);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 6), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.3 }));
  ant.position.set(0.3, 0.7, -0.05); ant.rotation.z = -0.35;
  g.add(body, grille, dial, knob, handle, ant);
  g.userData.dial = dial;
  g.traverse((o) => { if (o.isMesh) { o.userData.ownMaterial = true; o.userData.ownGeometry = true; } });
  return g;
}

// 出入り口のそばにぬいである、農場主の替えの長靴
export function makeBoots() {
  const g = new THREE.Group();
  const rub = new THREE.MeshStandardMaterial({ color: 0x24402c, roughness: 0.55 });
  const sole = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  for (const sx of [-0.2, 0.22]) {
    const b = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.85, 14, 1, true), rub);
    shaft.position.y = 0.5; shaft.castShadow = true;
    const inner = new THREE.Mesh(new THREE.CircleGeometry(0.15, 14), new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 1 }));
    inner.rotation.x = -Math.PI / 2; inner.position.y = 0.9;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.48), rub);
    foot.position.set(0, 0.1, 0.12); foot.castShadow = true;
    const so = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.04, 0.5), sole);
    so.position.set(0, 0.02, 0.12);
    b.add(shaft, inner, foot, so);
    b.position.x = sx; b.rotation.y = sx * 0.4;
    g.add(b);
  }
  g.traverse((o) => { if (o.isMesh) { o.userData.ownMaterial = true; o.userData.ownGeometry = true; } });
  return g;
}

// 落ちている軍手（白に、手のひらの赤いゴム）
export function makeGlove() {
  const g = new THREE.Group();
  // 白い床にとけこまないよう、使いこんだ灰色の軍手に
  const knit = new THREE.MeshStandardMaterial({ color: 0x8d8a82, roughness: 1, map: TX.knit().map, normalMap: TX.knit().normal });
  const rubber = new THREE.MeshStandardMaterial({ color: 0xc8342a, roughness: 0.6 });
  const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.34, 6, 14), knit);
  palm.scale.set(1, 0.32, 1); palm.rotation.x = Math.PI / 2; palm.position.y = 0.075;
  const palmR = new THREE.Mesh(new THREE.CapsuleGeometry(0.205, 0.3, 6, 14), rubber);
  palmR.scale.set(1, 0.12, 1); palmR.rotation.x = Math.PI / 2; palmR.position.y = 0.012;
  g.add(palm, palmR);
  const fingers = [[-0.16, 0.42, 0.3], [-0.055, 0.47, 0.06], [0.055, 0.46, -0.04], [0.16, 0.4, -0.2], [0.27, 0.05, -0.9]];
  for (const [x, z, a] of fingers) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.2, 4, 10), knit);
    f.scale.set(1, 1, 0.6); f.rotation.set(Math.PI / 2, 0, a); f.position.set(x, 0.05, z);
    f.castShadow = true;
    g.add(f);
  }
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.16, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x4a7bc8, roughness: 0.9, side: THREE.DoubleSide }));
  cuff.rotation.x = Math.PI / 2; cuff.scale.set(1, 1, 0.35); cuff.position.set(0, 0.07, -0.38);
  g.add(cuff);
  palm.castShadow = true;
  g.traverse((o) => { if (o.isMesh) { o.userData.ownMaterial = true; o.userData.ownGeometry = true; } });
  return g;
}

// 段ボール箱（底のない箱。ゴキブリがかぶって歩く）
export function makeBox() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xe0c08a, roughness: 0.9, map: TX.cardboard(), side: THREE.DoubleSide });
  const W = 0.95, H = 0.48, D = 0.72, t = 0.02;
  const parts = [
    [W, H, t, 0, H / 2, D / 2], [W, H, t, 0, H / 2, -D / 2],
    [t, H, D, W / 2, H / 2, 0], [t, H, D, -W / 2, H / 2, 0],
    [W, t, D, 0, H, 0],
  ];
  for (const [w, h, d, x, y, z] of parts) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  }
  // ふたの折り返しと、のぞき穴
  for (const s of [-1, 1]) {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(W, t, D * 0.5), mat);
    flap.position.set(0, H + 0.01, s * (D / 2 + D * 0.22)); flap.rotation.x = s * 0.5;
    g.add(flap);
  }
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.07), new THREE.MeshBasicMaterial({ color: 0x120a04 }));
  hole.position.set(0, H * 0.62, D / 2 + 0.012);
  g.add(hole);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.005, D + 0.02), new THREE.MeshStandardMaterial({ color: 0xd8c08a, roughness: 0.4 }));
  tape.position.y = H + 0.012;
  g.add(tape);
  g.traverse((o) => { if (o.isMesh) { o.userData.ownMaterial = true; o.userData.ownGeometry = true; } });
  return g;
}

// ゴキブリの帽子（自分だけ）
export function makeHat(key) {
  const g = new THREE.Group();
  if (key === 'perm') {
    const m = new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.8 });
    const geo = new THREE.SphereGeometry(0.03, 8, 6);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 * 2.3, r = 0.03 + (i % 9) * 0.006;
      const c = new THREE.Mesh(geo, m);
      c.position.set(Math.cos(a) * r, 0.02 + (i % 3) * 0.012, Math.sin(a) * r * 0.9);
      g.add(c);
    }
  } else if (key === 'straw') {
    const m = new THREE.MeshStandardMaterial({ color: 0xe2c27a, roughness: 0.9, map: TX.straw().map });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.008, 24), m);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.06, 18), m);
    crown.position.y = 0.032;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.016, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xb0302a }));
    band.position.y = 0.012;
    g.add(brim, crown, band);
  } else if (key === 'jacap') {
    const m = new THREE.MeshStandardMaterial({ color: 0x2e8b3e, roughness: 0.7 });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.006, 0.07), m);
    visor.position.set(0, 0.004, 0.075);
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    badge.position.set(0, 0.035, 0.058); badge.rotation.x = -0.5;
    g.add(cap, visor, badge);
  } else if (key === 'santa') {
    const red = new THREE.MeshStandardMaterial({ color: 0xc8202a, roughness: 0.7 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf8f6f0, roughness: 0.9 });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.13, 16), red);
    cone.position.set(0, 0.06, -0.01); cone.rotation.x = -0.35;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.016, 8, 20), white);
    rim.rotation.x = Math.PI / 2;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), white);
    ball.position.set(0, 0.12, -0.045);
    g.add(cone, rim, ball);
  } else if (key === 'mochi') {
    const mo = makeKagamiMochi(0.32);
    mo.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    g.add(mo);
  } else if (key === 'towel') {
    const m = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.9 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.014, 6, 20), m);
    band.rotation.x = Math.PI / 2;
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), m);
    knot.position.set(0.045, 0.01, 0.035);
    g.add(band, knot);
  }
  g.traverse((o) => { if (o.isMesh) { o.userData.ownMaterial = true; o.userData.ownGeometry = true; o.castShadow = true; } });
  return g;
}

// 床の排水溝（丸い鉄のふた）
export function makeDrain() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x6d7175, metalness: 0.8, roughness: 0.45 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 6, 28), metal);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.02;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.4, 28), new THREE.MeshBasicMaterial({ color: 0x0c0a08 }));
  hole.rotation.x = -Math.PI / 2; hole.position.y = 0.008;
  g.add(ring, hole);
  for (let i = -3; i <= 3; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, Math.sqrt(Math.max(0.01, 0.16 - (i * 0.11) ** 2)) * 2), metal);
    bar.position.set(i * 0.11, 0.02, 0);
    g.add(bar);
  }
  g.traverse((o) => { if (o.isMesh) { o.userData.ownMaterial = true; o.userData.ownGeometry = true; o.receiveShadow = true; } });
  return g;
}

// 季節のかざり
export function makeXmasTree() {
  const g = new THREE.Group();
  const green = new THREE.MeshStandardMaterial({ color: 0x1f5a2c, roughness: 0.8 });
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.05 - i * 0.22, 1.1, 14), green);
    c.position.y = 0.9 + i * 0.6; c.castShadow = true;
    g.add(c);
  }
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.5, 10), new THREE.MeshStandardMaterial({ color: 0x5a3a1e }));
  trunk.position.y = 0.25;
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.4, 14), new THREE.MeshStandardMaterial({ color: 0xb0302a, roughness: 0.5 }));
  pot.position.y = 0.2;
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), new THREE.MeshStandardMaterial({ color: 0xffd34a, emissive: 0xffb000, emissiveIntensity: 0.8, metalness: 0.6 }));
  star.position.y = 3.25;
  g.add(trunk, pot, star);
  const cols = [0xd8342a, 0xf2c31b, 0x3a7bd5, 0xf5f5f5];
  for (let i = 0; i < 22; i++) {
    const y = 0.7 + Math.random() * 2.2, r = (1 - (y - 0.4) / 2.9) * 0.95 + 0.05, a = Math.random() * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: cols[i % 4], metalness: 0.5, roughness: 0.25, emissive: cols[i % 4], emissiveIntensity: 0.25 }));
    b.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    g.add(b);
  }
  g.traverse((o) => { if (o.isMesh) { o.userData.ownMaterial = true; o.userData.ownGeometry = true; } });
  return g;
}
export function makeKadomatsu() {
  const g = new THREE.Group();
  const bamboo = new THREE.MeshStandardMaterial({ color: 0x4f8a3a, roughness: 0.5 });
  const cut = new THREE.MeshStandardMaterial({ color: 0xd8e2b0 });
  [[0, 1.5], [0.18, 1.2], [-0.18, 1.0]].forEach(([x, h]) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, h, 12), bamboo);
    b.position.set(x, h / 2 + 0.3, x * 0.4);
    const top = new THREE.Mesh(new THREE.CircleGeometry(0.09, 12), cut);
    top.position.set(x, h + 0.31, x * 0.4); top.rotation.x = -Math.PI / 2 + 0.6;
    b.castShadow = true;
    g.add(b, top);
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.6, 16), new THREE.MeshStandardMaterial({ color: 0xc9a46b, roughness: 0.9, map: TX.straw().map }));
  base.position.y = 0.3;
  const pine = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshStandardMaterial({ color: 0x2e5a2a, roughness: 0.9 }));
  pine.scale.set(1.2, 0.6, 1.2); pine.position.y = 0.68;
  g.add(base, pine);
  g.traverse((o) => { if (o.isMesh) { o.userData.ownMaterial = true; o.userData.ownGeometry = true; } });
  return g;
}
export function makeKagamiMochi(scale = 1) {
  const g = new THREE.Group();
  const mochi = new THREE.MeshStandardMaterial({ color: 0xfbf8f0, roughness: 0.6 });
  const low = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), mochi); low.scale.set(1, 0.45, 1); low.position.y = 0.1;
  const up = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 12), mochi); up.scale.set(1, 0.5, 1); up.position.y = 0.22;
  const orange = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf08a1a, roughness: 0.5 }));
  orange.position.y = 0.33;
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: 0x2e7a2e }));
  leaf.scale.set(1.4, 0.3, 0.7); leaf.position.set(0.04, 0.4, 0);
  g.add(low, up, orange, leaf);
  g.scale.setScalar(scale);
  g.traverse((o) => { if (o.isMesh) { o.userData.ownMaterial = true; o.userData.ownGeometry = true; o.castShadow = true; } });
  return g;
}

// 助っ人のカブトムシ（つやのある黒茶色・大きな角）
export function makeBeetle() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const shell = new THREE.MeshPhysicalMaterial({ color: 0x2a1408, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x120804, roughness: 0.5 });
  const elytra = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(s * 0.005, 0.13, -0.02);
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14, 0, Math.PI), shell);
    m.scale.set(0.11, 0.1, 0.24);
    m.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    m.position.x = s * 0.0;
    m.castShadow = true;
    e.add(m);
    body.add(e);
    elytra.push(e);
  }
  const under = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), dark);
  under.scale.set(0.11, 0.07, 0.23); under.position.set(0, 0.1, -0.02);
  const pron = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), shell);
  pron.scale.set(0.1, 0.08, 0.09); pron.position.set(0, 0.13, 0.2); pron.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), dark);
  head.scale.set(0.055, 0.045, 0.05); head.position.set(0, 0.1, 0.29);
  // 角：根もとから上へそり、先が二またに
  const hornPts = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; hornPts.push(new THREE.Vector3(0, 0.1 + t * t * 0.22, 0.3 + t * 0.2)); }
  const horn = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hornPts), 16, 0.018, 8), shell);
  for (const s of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.07, 8), shell);
    tip.position.set(s * 0.025, 0.33, 0.51); tip.rotation.set(0.6, 0, s * 0.5);
    body.add(tip);
  }
  const horn2 = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 8), shell);
  horn2.position.set(0, 0.2, 0.25); horn2.rotation.x = 0.9;
  body.add(under, pron, head, horn, horn2);
  // 透明な後ろばね（飛ぶときだけ）
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xd8c8a0, transparent: true, opacity: 0.45, side: THREE.DoubleSide, roughness: 0.3 });
  const wings = new THREE.Group();
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.12), wingMat);
    w.position.set(s * 0.17, 0.2, -0.02); w.rotation.x = -Math.PI / 2;
    w.userData.s = s;
    wings.add(w);
  }
  wings.visible = false;
  body.add(wings);
  const legs = [];
  for (const z of [0.16, 0.02, -0.12]) for (const s of [-1, 1]) {
    const L = new THREE.Group();
    L.position.set(s * 0.09, 0.08, z);
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.16, 6), dark);
    a.position.set(s * 0.06, -0.03, 0); a.rotation.z = s * 1.1;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.007, 0.14, 6), dark);
    b.position.set(s * 0.14, -0.07, 0); b.rotation.z = s * -0.4;
    L.add(a, b);
    body.add(L);
    legs.push(L);
  }
  root.traverse((o) => { if (o.isMesh) { o.userData.ownMaterial = true; o.userData.ownGeometry = true; } });
  return { root, body, elytra, wings, legs };
}

// 株の上の黄色い粘着シート（触ると動けなくなる）
export function makeSheet() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshStandardMaterial({ map: TX.stickyCard(), roughness: 0.25, metalness: 0.05, color: 0xfff2a0, emissive: 0x3a3000, emissiveIntensity: 0.6 }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  g.add(m);
  // 本物のハウスのように、細い棒につるした黄色いカード（葉の上から見える目印）
  const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.1, 5), new THREE.MeshStandardMaterial({ color: 0x8a8a80, metalness: 0.5 }));
  stake.position.set(0.3, 0.55, 0);
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.46), new THREE.MeshStandardMaterial({ map: TX.stickyCard(), side: THREE.DoubleSide, color: 0xfff2a0, emissive: 0x6a5a00, emissiveIntensity: 0.7, roughness: 0.3 }));
  card.position.set(0.3, 0.95, 0);
  g.add(stake, card);
  g.userData.card = card;
  g.traverse((o) => { if (o.isMesh) { o.userData.ownMaterial = true; o.userData.ownGeometry = true; } });
  return g;
}

// 天敵のクモ（ジョロウグモのような黄色いしま）と、白く光る巣
// 巣は通路から見えるよう、さいばい槽のふちに縦に張る（太い糸で、葉の中でも分かるように）
export function makeSpider() {
  const root = new THREE.Group();
  const web = new THREE.Group();
  const silk = new THREE.MeshBasicMaterial({ color: 0xf6faff, transparent: true, opacity: 0.9 });
  const R = 0.62, CY = 0.7;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, R, 4), silk);
    sp.position.set(Math.cos(a) * R / 2, CY + Math.sin(a) * R / 2, 0);
    sp.rotation.z = a - Math.PI / 2;
    web.add(sp);
  }
  for (let k = 1; k <= 4; k++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry((k / 4) * R, 0.011, 4, 24), silk);
    ring.position.y = CY;
    web.add(ring);
  }
  // 巣をささえる糸（さいばい槽のふちから）
  for (const s of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, CY, 4), silk);
    t.position.set(s * R * 0.7, CY / 2, 0);
    web.add(t);
  }
  const glow = new THREE.Mesh(new THREE.CircleGeometry(R * 1.05, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }));
  glow.position.y = CY;
  web.add(glow);
  root.add(web);
  // ぶら下がる糸（クモが降りてくるとき）
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1, 4), silk);
  thread.visible = false;
  root.add(thread);
  const body = new THREE.Group();
  body.scale.setScalar(2.6);
  body.position.y = CY;
  root.add(body);
  const black = new THREE.MeshStandardMaterial({ color: 0x15120e, roughness: 0.4 });
  const yel = new THREE.MeshStandardMaterial({ color: 0xf0c22a, roughness: 0.45, emissive: 0x3a2a00, emissiveIntensity: 0.4 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc8241a, roughness: 0.5 });
  const abd = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), yel);
  abd.scale.set(0.07, 0.06, 0.12); abd.position.set(0, 0.06, -0.1); abd.castShadow = true;
  for (let i = 0; i < 3; i++) {
    const st = new THREE.Mesh(new THREE.TorusGeometry(0.058 - i * 0.01, 0.01, 4, 16), black);
    st.rotation.y = Math.PI / 2; st.position.set(0, 0.06, -0.05 - i * 0.055); st.scale.set(1, 0.9, 1);
    body.add(st);
  }
  const spot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), red);
  spot.position.set(0, 0.03, -0.2);
  const ceph = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), black);
  ceph.position.set(0, 0.05, 0.03);
  body.add(abd, ceph, spot);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff3020 }));
    eye.position.set(s * 0.014, 0.075, 0.07);
    body.add(eye);
  }
  const legs = [];
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const L = new THREE.Group();
    L.position.set(s * 0.03, 0.05, 0.05 - i * 0.025);
    L.rotation.y = s * (0.5 - i * 0.35) + (s > 0 ? 0 : Math.PI);
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.17, 5), black);
    a.rotation.z = -1.0; a.position.set(0.07, 0.04, 0);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.004, 0.2, 5), yel);
    b.rotation.z = 0.55; b.position.set(0.19, 0.015, 0);
    L.add(a, b);
    body.add(L);
    legs.push(L);
  }
  root.traverse((o) => { if (o.isMesh) { o.userData.ownMaterial = true; o.userData.ownGeometry = true; } });
  return { root, body, web, legs, thread, glow, webY: CY };
}

// 害虫駆除の業者（白い防護服・マスク・背中のタンクとノズル）
export function makeExterminator() {
  const m = makeInspector();
  const white = new THREE.MeshStandardMaterial({ color: 0xf1f1ee, roughness: 0.85 });
  m.root.traverse((o) => {
    if (o.isMesh && o.material && o.material.color) {
      const c = o.material.color.getHex();
      if (c === 0xf2f2ee || c === 0x2e8b3e || c === 0x3b3f46) o.material = white;
    }
  });
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), white);
  hood.scale.set(1, 1.05, 1); hood.position.y = 4.7;
  const mask = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.2), new THREE.MeshStandardMaterial({ color: 0x23262a, roughness: 0.5 }));
  mask.position.set(0, 4.55, 0.42);
  const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.08), new THREE.MeshStandardMaterial({ color: 0x9fd0e8, roughness: 0.1, metalness: 0.3 }));
  goggles.position.set(0, 4.78, 0.44);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.1, 14), new THREE.MeshStandardMaterial({ color: 0xd8342a, roughness: 0.4, metalness: 0.3 }));
  tank.position.set(0, 3.4, -0.62);
  const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7 }));
  wand.rotation.x = 1.2; wand.position.set(0.7, 3.0, 0.6);
  m.root.add(hood, mask, goggles, tank, wand);
  m.root.traverse((o) => { if (o.isMesh) { o.userData.ownMaterial = true; o.userData.ownGeometry = true; o.castShadow = true; } });
  return m;
}

// 第20回：長く生き残るほど、背中がつやつやに（k：0〜1。見た目だけ）
export function setRoachGloss(m, k) {
  if (!m.shell || !m.shell.length) return;
  if (!m.glossMat) { m.glossMat = m.shell[0].material.clone(); for (const w of m.shell) w.material = m.glossMat; m.glossBase = m.glossMat.roughness; }
  const G = m.glossMat;
  G.roughness = m.glossBase * (1 - 0.8 * k);
  G.clearcoat = 1;
  G.clearcoatRoughness = 0.1 * (1 - k) + 0.02;
  if (G.emissive) { G.emissive.setRGB(0.35 * k, 0.22 * k, 0.05 * k); G.emissiveIntensity = 0.5 * k; }
  if (G.sheen !== undefined) G.sheen = k;
}

// 第21回：味方のネズミ（ときどき走りぬけて、農場主の気をそらす）
export function makeRat() {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0x8a8278, roughness: 0.9 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xe8a0a0, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), fur);
  body.scale.set(0.22, 0.17, 0.36); body.position.y = 0.18; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), fur);
  head.scale.set(0.13, 0.12, 0.17); head.position.set(0, 0.2, 0.38); g.add(head);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), pink); nose.position.set(0, 0.2, 0.55); g.add(nose);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), pink); ear.position.set(s * 0.09, 0.32, 0.33); ear.rotation.y = s * 0.3; g.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), dark); eye.position.set(s * 0.06, 0.25, 0.48); g.add(eye);
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.6, 6), pink);
  tail.rotation.x = Math.PI / 2 - 0.25; tail.position.set(0, 0.12, -0.6); g.add(tail);
  g.userData.tail = tail; g.userData.body = body;
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
