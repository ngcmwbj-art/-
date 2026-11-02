// パプリカの実（本物に近い形・へた・ツヤ）
// ・角ばった釣鐘形で、3〜4つのふくらみ（室）と、その間の深いみぞ
// ・上は肩が張って、へたのまわりが深くくぼむ
// ・下はふくらみごとに小さな「足」が出て、まん中が少しへこむ
// ・太く曲がった緑の軸と、星形にひろがるがく。軸の切り口は明るい黄緑
// ・表面はロウを引いたような強いツヤ。みぞは少し暗く、ほんの少しのでこぼこ
import * as THREE from 'three';
import { fbm, noise } from './textures.js';

// 小さな決まった乱数（形のちがいを毎回同じにする）
function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 同じ位置にある頂点の向きをそろえて、つなぎ目の光り方の段差をなくす
function smoothSeams(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const map = new Map();
  const key = (i) => `${Math.round(p.getX(i) * 1e4)},${Math.round(p.getY(i) * 1e4)},${Math.round(p.getZ(i) * 1e4)}`;
  for (let i = 0; i < p.count; i++) {
    const k = key(i);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(i);
  }
  const v = new THREE.Vector3();
  for (const list of map.values()) {
    if (list.length < 2) continue;
    v.set(0, 0, 0);
    for (const i of list) v.x += n.getX(i), v.y += n.getY(i), v.z += n.getZ(i);
    v.normalize();
    for (const i of list) n.setXYZ(i, v.x, v.y, v.z);
  }
  n.needsUpdate = true;
}

// 実の形。高さはおよそ -1〜+1（へたの付け根は y = TOP）
export const TOP = 0.6;
export function paprikaBody({ lobes = 4, seg = 32, tall = 1.08, seed = 1 } = {}) {
  const rnd = mulberry(seed * 7919);
  const ph = rnd() * Math.PI * 2;
  // ふくらみごとの大きさのちがい（一周でなめらかにつながる形で）
  const p1 = rnd() * 6.28, p2 = rnd() * 6.28, nOff = rnd() * 50;
  const lean = (rnd() - 0.5) * 0.12;
  const geo = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.8));
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  let topY = -9;
  for (let i = 0; i < p.count; i++) {
    const x0 = p.getX(i), y0 = p.getY(i), z0 = p.getZ(i);
    const th = Math.atan2(z0, x0);
    const phi = Math.acos(Math.max(-1, Math.min(1, y0)));
    const s = Math.sin(phi), c = Math.cos(phi);
    // まっすぐな側面（球より箱に近い）
    let R = Math.pow(s, 0.5);
    let Y = Math.sign(c) * Math.pow(Math.abs(c), 0.72);
    // ふくらみとみぞ
    const a = (lobes * (th + ph)) / 2;
    const amp = 1 + 0.07 * Math.sin(th + p1) + 0.04 * Math.sin(2 * th + p2);
    const lobe = Math.pow(Math.abs(Math.cos(a)), 0.65) * amp;
    const crease = 1 - Math.pow(Math.abs(Math.cos(a)), 0.65);
    R *= 0.79 + 0.21 * lobe;
    // 釣鐘：肩が少し広い
    R *= 0.92 + 0.1 * (Y * 0.5 + 0.5);
    // 表面のゆるいでこぼこ
    R *= 1 + (noise(Math.cos(th) * 1.6 + nOff, Math.sin(th) * 1.6 + phi * 2.2, 64) - 0.5) * 0.06;
    // 上：肩からへたに向かって深くくぼむ
    if (Y > 0) {
      const inner = Math.pow(Math.max(0, 1 - R / 0.92), 1.8);
      Y -= 0.46 * inner * Y;
      Y -= 0.07 * crease * Y;
    }
    // 下：ふくらみごとの足と、まん中のへこみ
    if (Y < 0) {
      const d = -Y;
      Y -= 0.1 * lobe * Math.pow(d, 3) * R;
      Y += 0.2 * Math.pow(Math.max(0, 1 - R / 0.75), 2) * Math.pow(d, 2);
    }
    Y *= tall;
    const x = R * Math.cos(th) + lean * Y, z = R * Math.sin(th);
    p.setXYZ(i, x, Y, z);
    if (phi < 1e-6) topY = Math.max(topY, Y);
    // みぞとへたのまわりは少し暗く
    const shade = (0.8 + 0.2 * lobe) * (Y > 0.4 ? 0.88 + 0.12 * Math.min(1, R) : 1);
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = shade;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  smoothSeams(geo);
  // へたを置く高さ（くぼみの底）と、そこへ動かす量
  geo.userData.top = topY;
  geo.userData.stemOffset = topY - (TOP * 1.06 - 0.06) + 0.02;
  return geo;
}

// 形のちがう実を何種類か（4室・3室・縦長・ずんぐり）
let VARIANTS = null;
export function paprikaVariants() {
  if (VARIANTS) return VARIANTS;
  VARIANTS = [
    paprikaBody({ lobes: 4, tall: 1.06, seed: 1 }),
    paprikaBody({ lobes: 4, tall: 1.18, seed: 2 }),
    paprikaBody({ lobes: 3, tall: 1.1, seed: 3 }),
    paprikaBody({ lobes: 4, tall: 0.96, seed: 4 }),
  ];
  return VARIANTS;
}

// へた（がく）と軸。頂点の色で、軸・がく・切り口を塗り分ける
function setColor(geo, r, g, b) {
  const n = geo.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = r; c[i * 3 + 1] = g; c[i * 3 + 2] = b; }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}
function merge(list) {
  const geos = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

let STEM = null;
export function paprikaStem() {
  if (STEM) return STEM;
  const base = TOP * 1.06 - 0.06;
  // がく：くぼみに張りつく星形
  const calyx = new THREE.CylinderGeometry(0.13, 0.38, 0.1, 36, 2);
  {
    const p = calyx.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const th = Math.atan2(z, x);
      const r = Math.hypot(x, z);
      if (y < 0) { // 下のふち：6つのとがり、先が少したれる
        const star = 1 + 0.24 * Math.pow(Math.max(0, Math.cos(6 * th)), 3) - 0.1;
        p.setXYZ(i, (x / (r || 1)) * r * star, y - 0.035 * Math.max(0, Math.cos(6 * th)), (z / (r || 1)) * r * star);
      }
    }
    calyx.computeVertexNormals();
    calyx.translate(0, base + 0.05, 0);
    setColor(calyx, 0.045, 0.12, 0.022);
  }
  // 軸：太く、少し曲がる
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, base + 0.06, 0),
    new THREE.Vector3(0.015, base + 0.26, 0.0),
    new THREE.Vector3(0.09, base + 0.46, 0.02),
    new THREE.Vector3(0.24, base + 0.58, 0.05),
  ]);
  const tube = new THREE.TubeGeometry(curve, 14, 0.1, 12, false);
  setColor(tube, 0.06, 0.16, 0.03);
  // 付け根のふくらみ
  const flare = new THREE.CylinderGeometry(0.1, 0.17, 0.1, 16);
  flare.translate(0, base + 0.1, 0);
  setColor(flare, 0.055, 0.15, 0.028);
  // 切り口
  const tip = new THREE.CircleGeometry(0.099, 12);
  const end = curve.getPoint(1), dir = curve.getTangent(1);
  tip.lookAt(dir);
  tip.translate(end.x, end.y, end.z);
  setColor(tip, 0.42, 0.5, 0.2);
  STEM = merge([calyx, tube, flare, tip]);
  STEM.computeBoundingSphere();
  return STEM;
}

// 皮の細かなでこぼこ（ごく弱く）
let SKIN = null;
export function paprikaSkinNormal() {
  if (SKIN) return SKIN;
  const w = 256, h = 128;
  const H = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const u = i / w, v = j / h;
    H[j * w + i] = fbm(u * 8, v * 4, 4, 8) * 0.7 + noise(u * 64, v * 32, 64) * 0.3;
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  const img = x.createImageData(w, h);
  const at = (i, j) => H[((j + h) % h) * w + ((i + w) % w)];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = (at(i + 1, j) - at(i - 1, j)) * 3, dy = (at(i, j + 1) - at(i, j - 1)) * 3;
    const l = Math.hypot(dx, dy, 1), k = (j * w + i) * 4;
    img.data[k] = (-dx / l * 0.5 + 0.5) * 255;
    img.data[k + 1] = (dy / l * 0.5 + 0.5) * 255;
    img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255;
    img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  SKIN = new THREE.CanvasTexture(c);
  SKIN.wrapS = SKIN.wrapT = THREE.RepeatWrapping;
  return SKIN;
}

// 皮の素材：ロウを引いたような強いツヤ
export function paprikaMaterial(color = 0xffffff) {
  return new THREE.MeshPhysicalMaterial({
    color, vertexColors: true, roughness: 0.22, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.5,
    normalMap: paprikaSkinNormal(), normalScale: new THREE.Vector2(0.12, 0.12),
  });
}
let STEM_MAT = null;
export function paprikaStemMaterial() {
  if (!STEM_MAT) STEM_MAT = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.5, envMapIntensity: 0.6 });
  return STEM_MAT;
}

// 色（熟したもの・途中・未熟）
export const PAPRIKA_COLORS = {
  red: 0xc0170d, yellow: 0xf2b705, orange: 0xec5f0a, green: 0x2f6e1c, turning: 0x7a3a10,
};
