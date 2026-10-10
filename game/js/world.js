// 銚子の台地：地形・畑・防風林・母屋・ビニールハウス・犬吠埼灯台・海
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, lerp, smoothstep, fbm, vnoise, mulberry32, GLSL_NOISE } from './util.js';
import { buildHouse, buildKeiTruck, buildBarn, buildGreenhouse, buildLighthouse } from './buildings.js';

// キャベツ畑（u: 列方向, v: 畝方向）。台地いっぱいにパッチワーク状に並べる（下で生成）
export const FIELDS = [];
const FIELD_W = 40, FIELD_D = 26, FIELD_COLS = 14, FIELD_ROWS = 10, FIELD_COUNT = 30;

// 海岸線（中心からの陸地半径）
export function landRadius(th) {
  return 228 + 34 * Math.sin(th * 3 + 1.3) + 18 * Math.sin(th * 5 + 0.4) + 10 * Math.sin(th * 9 + 2.0);
}
const GLSL_LAND = /* glsl */ `
float landRadius(float th){ return 228. + 34.*sin(th*3.+1.3) + 18.*sin(th*5.+.4) + 10.*sin(th*9.+2.); }
`;

export function rawHeight(x, z) {
  const r = Math.hypot(x, z), th = Math.atan2(z, x);
  const inside = landRadius(th) - r;
  const plateau = 17 + fbm(x * 0.007 + 3.1, z * 0.007 - 1.7, 5) * 12 + fbm(x * 0.04, z * 0.04, 3) * 1.2;
  const seabed = -14 + Math.max(inside, -300) * 0.05;
  const t = smoothstep(-3, 9, inside) * 0.85 + smoothstep(-3, 24, inside) * 0.15;
  return lerp(seabed, plateau, t * t * (3 - 2 * t));
}


export function fieldLocal(f, x, z) {
  const dx = x - f.x, dz = z - f.z;
  return { u: dx * f.cos + dz * f.sin, v: -dx * f.sin + dz * f.cos };
}
export function fieldWorld(f, u, v) {
  return { x: f.x + u * f.cos - v * f.sin, z: f.z + u * f.sin + v * f.cos };
}
export function fieldRectDist(f, x, z) {
  const { u, v } = fieldLocal(f, x, z);
  const ox = Math.max(0, Math.abs(u) - f.w / 2), oz = Math.max(0, Math.abs(v) - f.d / 2);
  return Math.hypot(ox, oz);
}

const lhTh = -0.55, lhR = landRadius(lhTh) - 17;
export const LIGHTHOUSE = { x: Math.cos(lhTh) * lhR, z: Math.sin(lhTh) * lhR };
export const HOUSE = { x: -18, z: -42 };
export const GREENHOUSE = { x: 32, z: -40 };
export const BARN = { x: -40, z: -34 };
export const SPAWN = { x: 6, z: -22 };

const FLATS = [
  { ...LIGHTHOUSE, r: 9 },
  { ...HOUSE, r: 14 },
  { ...GREENHOUSE, r: 12 },
  { ...BARN, r: 8 },
];
for (const f of FLATS) f.h = rawHeight(f.x, f.z) + 0.1;

// 畑の配置：52m × 40m の区画に 1 枚ずつ。海岸・母屋まわりを避け、中心に近い順に 30 枚
(() => {
  const rng = mulberry32(2024);
  const cands = [];
  for (let gx = -5; gx <= 5; gx++) for (let gz = -6; gz <= 6; gz++) {
    const x = gx * 52 + (gx || gz ? (rng() - 0.5) * 4 : 0), z = gz * 40 + (gx || gz ? (rng() - 0.5) * 4 : 0);
    const rot = gx || gz ? (rng() - 0.5) * 0.16 : 0;
    const f = { x, z, w: FIELD_W, d: FIELD_D, rot, cols: FIELD_COLS, rows: FIELD_ROWS, cos: Math.cos(rot), sin: Math.sin(rot) };
    // 四隅がすべて海岸線から 30m 以上内側
    let ok = true;
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const p = fieldWorld(f, su * FIELD_W / 2, sv * FIELD_D / 2);
      if (landRadius(Math.atan2(p.z, p.x)) - Math.hypot(p.x, p.z) < 30) ok = false;
    }
    if (!ok) continue;
    if (FLATS.some((fl) => fieldRectDist(f, fl.x, fl.z) < fl.r + 6)) continue;
    if (fieldRectDist(f, SPAWN.x, SPAWN.z) < 4) continue;
    cands.push(f);
  }
  cands.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
  cands.slice(0, FIELD_COUNT).forEach((f, i) => {
    f.id = String(i + 1);
    f.name = i === 0 ? '母屋の畑' : `第${i + 1}畑`;
    f.h = rawHeight(f.x, f.z) + 0.2;
    f.reach = Math.hypot(FIELD_W, FIELD_D) / 2 + 17;
    FIELDS.push(f);
  });
})();

export function heightAt(x, z) {
  let h = rawHeight(x, z);
  // いちばん近い畑だけで平らにする（隣の畑どうしで段差が崩れないように）
  let best = null, bd = 14;
  for (const f of FIELDS) {
    const dx = x - f.x, dz = z - f.z;
    if (dx * dx + dz * dz > f.reach * f.reach) continue;
    const d = Math.max(0, fieldRectDist(f, x, z) - 3);
    if (d < bd) { bd = d; best = f; }
  }
  if (best) h = lerp(best.h, h, smoothstep(0, 14, bd));
  for (const f of FLATS) {
    const d = Math.hypot(x - f.x, z - f.z);
    if (d < f.r + 10) h = lerp(f.h, h, smoothstep(f.r, f.r + 10, d));
  }
  return h;
}

// 地形メッシュの三角形と完全に一致する高さ（接地・カメラ用）
const TER = { SIZE: 720, SEG: 300, grid: null };
export function groundAt(x, z) {
  const g = TER.grid;
  if (!g) return heightAt(x, z);
  const N = TER.SEG, step = TER.SIZE / N;
  const gx = (x + TER.SIZE / 2) / step, gz = (z + TER.SIZE / 2) / step;
  if (gx < 0 || gz < 0 || gx >= N || gz >= N) return heightAt(x, z);
  const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
  const W = N + 1;
  const ha = g[iz * W + ix], hb = g[(iz + 1) * W + ix], hc = g[(iz + 1) * W + ix + 1], hd = g[iz * W + ix + 1];
  if (fx + fz <= 1) return ha + (hd - ha) * fx + (hb - ha) * fz;
  return hc + (hb - hc) * (1 - fx) + (hd - hc) * (1 - fz);
}

export function isWalkable(x, z) {
  return heightAt(x, z) > 1.2;
}

// ---------- テクスチャ生成 ----------
function makeDetailTexture() {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d'), img = g.createImageData(S, S);
  // 周期的なバリューノイズでタイル継ぎ目をなくす
  const pnoise = (x, y, P) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const h = (a, b) => (vnoise(((a % P) + P) % P * 17.13 + 0.5, ((b % P) + P) % P * 31.71 + 0.5) + 1) / 2;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(h(ix, iy), h(ix + 1, iy), ux), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), ux), uy) * 2 - 1;
  };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let n = 0;
    for (let o = 0; o < 4; o++) {
      const P = 8 << o;
      n += pnoise(x / S * P, y / S * P, P) * 0.6 / (o + 1);
    }
    const v = clamp(232 + n * 40 + (Math.random() - 0.5) * 10, 0, 255);
    const i = (y * S + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function makeFurrowTexture(f) {
  const W = 512, H = 512, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#3f2a1c'; g.fillRect(0, 0, W, H);
  const totalD = f.d + 4;
  for (let r = 0; r < f.rows; r++) {
    const v = -f.d / 2 + f.d * (r + 0.5) / f.rows;
    const cy = (v + totalD / 2) / totalD * H;
    const bh = H / totalD * 2.4;
    const grad = g.createLinearGradient(0, cy - bh, 0, cy + bh);
    grad.addColorStop(0, 'rgba(90,62,40,0)');
    grad.addColorStop(0.5, 'rgba(112,80,52,1)');
    grad.addColorStop(1, 'rgba(90,62,40,0)');
    g.fillStyle = grad; g.fillRect(0, cy - bh, W, bh * 2);
  }
  for (let i = 0; i < 9000; i++) {
    const s = Math.random();
    g.fillStyle = s < 0.5 ? 'rgba(30,20,12,0.35)' : 'rgba(150,120,90,0.25)';
    g.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---------- 地形 ----------
function buildTerrain() {
  const { SIZE, SEG } = TER;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  const grid = new Float32Array((SEG + 1) * (SEG + 1));
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cGrassDark = new THREE.Color('#3d6e2a'), cGrass1 = new THREE.Color('#5f9a34'), cGrass2 = new THREE.Color('#9cbf45'), cDry = new THREE.Color('#c2bb62');
  const cSoil = new THREE.Color('#6a4a30'), cSand = new THREE.Color('#e3d3a4'), cWetSand = new THREE.Color('#a8956e');
  const cRock1 = new THREE.Color('#9a7b5a'), cRock2 = new THREE.Color('#c9ad85'), cSea = new THREE.Color('#3f6f78');
  const col = new THREE.Color(), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    grid[i] = h;
    const sx = heightAt(x + 1.5, z) - heightAt(x - 1.5, z), sz = heightAt(x, z + 1.5) - heightAt(x, z - 1.5);
    const slope = Math.hypot(sx, sz) / 3;
    const n = fbm(x * 0.02, z * 0.02, 3);
    col.copy(cGrass1).lerp(cGrass2, clamp(n * 0.9 + 0.5, 0, 1));
    col.lerp(cDry, smoothstep(0.25, 0.6, fbm(x * 0.006 + 9, z * 0.006, 3)) * 0.6);
    // 草原の濃淡（BotW のような大きな色ムラ）と斜面の陰り
    col.lerp(cGrassDark, smoothstep(-0.05, 0.35, fbm(x * 0.012 - 4, z * 0.012 + 7, 3)) * 0.55);
    col.multiplyScalar(1 - smoothstep(0.15, 0.6, slope) * 0.25);
    // 屏風ヶ浦の地層
    const strata = 0.5 + 0.5 * Math.sin(h * 2.2 + vnoise(x * 0.05, z * 0.05) * 1.5);
    tmp.copy(cRock1).lerp(cRock2, strata);
    col.lerp(tmp, smoothstep(0.55, 0.95, slope));
    if (h < 3.5) col.lerp(cSand, smoothstep(3.5, 1.5, h));
    if (h < 0.8) col.lerp(cWetSand, smoothstep(0.8, -0.5, h));
    if (h < -3) col.lerp(cSea, smoothstep(-3, -10, h));
    for (const f of FIELDS) {
      const d = fieldRectDist(f, x, z);
      if (d < 4) col.lerp(cSoil, smoothstep(4, 1, d));
    }
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  TER.grid = grid;
  const detail = makeDetailTexture();
  detail.repeat.set(90, 90);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: detail, roughness: 0.96, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

function buildFieldPlanes(group) {
  const furrow = makeFurrowTexture(FIELDS[0]);
  const geo = new THREE.PlaneGeometry(FIELD_W + 4, FIELD_D + 4);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ map: furrow, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  for (const f of FIELDS) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(f.x, f.h + 0.02, f.z);
    m.rotation.y = -f.rot;
    m.receiveShadow = true;
    group.add(m);
  }
}

// ---------- 草（GPU で風に揺れるインスタンス） ----------
function buildGrass(count, windU) {
  if (!count) return null;
  const blades = [];
  const rng = mulberry32(7);
  for (let b = 0; b < 5; b++) {
    const w = 0.07 + rng() * 0.05, h = 0.55 + rng() * 0.45;
    const g = new THREE.PlaneGeometry(w, h, 1, 3);
    g.translate(0, h / 2, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / h;
      p.setX(i, p.getX(i) * (1 - y * 0.85));
      p.setZ(i, p.getZ(i) + y * y * 0.12);
    }
    g.rotateY(rng() * Math.PI);
    g.translate((rng() - 0.5) * 0.35, 0, (rng() - 0.5) * 0.35);
    blades.push(g);
  }
  const geo = mergeGeometries(blades);
  const p = geo.attributes.position, cols = new Float32Array(p.count * 3), nor = geo.attributes.normal;
  const base = new THREE.Color('#3f7a26'), tip = new THREE.Color('#cfe07a'), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = clamp(p.getY(i) / 0.9, 0, 1);
    c.copy(base).lerp(tip, y);
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    nor.setXYZ(i, 0, 1, 0);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));

  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, windU);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uWind; uniform vec2 uWindDir;')
      .replace('#include <project_vertex>', /* glsl */`
        vec4 mvPosition = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
          vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
        #else
          vec2 ip = vec2(0.);
        #endif
        float hgt = clamp(position.y, 0., 1.2);
        float wv = sin(uTime*2.1 + ip.x*0.17 + ip.y*0.13)*0.5+0.5;
        float gust = sin(uTime*0.7 - dot(ip, uWindDir)*0.04)*0.5+0.5;
        float bend = (0.12 + uWind*(0.5+1.1*gust)) * (0.55+0.45*wv);
        mvPosition.xz += uWindDir * bend * hgt * hgt;
        mvPosition.y -= bend * 0.35 * hgt * hgt;
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`);
  };

  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
  const color = new THREE.Color();
  let n = 0, guard = 0;
  while (n < count && guard++ < count * 8) {
    let x, z;
    if (rng() < 0.55) {
      const f = FIELDS[Math.floor(rng() * FIELDS.length)];
      const a = rng() * Math.PI * 2, r = 20 + Math.sqrt(rng()) * 50;
      x = f.x + Math.cos(a) * r; z = f.z + Math.sin(a) * r;
    } else {
      x = (rng() - 0.5) * 420; z = (rng() - 0.5) * 420;
    }
    const inside = landRadius(Math.atan2(z, x)) - Math.hypot(x, z);
    if (inside < 24) continue;
    if (FIELDS.some((f) => fieldRectDist(f, x, z) < 2.5)) continue;
    if (FLATS.some((f) => Math.hypot(x - f.x, z - f.z) < f.r - 2)) continue;
    const y = heightAt(x, z);
    const sc = 0.7 + rng() * 0.8;
    q.setFromAxisAngle(v.set(0, 1, 0), rng() * Math.PI * 2);
    m.compose(v.set(x, y - 0.05, z), q, s.set(sc, sc * (0.8 + rng() * 0.5), sc));
    mesh.setMatrixAt(n, m);
    color.setHSL(0.2 + rng() * 0.06, 0.4 + rng() * 0.2, 0.42 + rng() * 0.16);
    mesh.setColorAt(n, color);
    n++;
  }
  mesh.count = n;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

// ---------- 黒松の防風林 ----------
function buildTrees(scale) {
  const rng = mulberry32(42);
  const trunk = new THREE.CylinderGeometry(0.2, 0.38, 8.4, 7);
  trunk.translate(0, 4.2, 0);
  // 黒松らしい、横に張り出した葉の塊（パッド）を積み重ねる
  const pads = [];
  const prng = mulberry32(9);
  const padDefs = [[0, 8.6, 0, 1.5], [1.6, 7.2, 0.4, 1.7], [-1.5, 6.6, -0.6, 1.6], [0.4, 5.6, 1.6, 1.5], [-0.6, 5.0, -1.4, 1.4], [2.2, 5.3, -1.0, 1.3], [-2.0, 7.6, 0.9, 1.3]];
  for (const [px, py, pz, pr] of padDefs) {
    let g = new THREE.IcosahedronGeometry(pr, 2);
    g.deleteAttribute('normal'); g.deleteAttribute('uv');
    g = mergeVertices(g);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = vnoise(x * 2.1 + px * 3, z * 2.1 + y * 1.7 + pz * 3) * 0.35;
      p.setXYZ(i, x * (1.35 + n) + px, y * (0.5 + n * 0.3) + py, z * (1.35 + n) + pz);
    }
    pads.push(g);
  }
  const fol = mergeGeometries(pads);
  fol.computeVertexNormals();
  const fp = fol.attributes.position, fn = fol.attributes.normal, fc = new Float32Array(fp.count * 3);
  const cTop = new THREE.Color('#6fa44a'), cUnder = new THREE.Color('#2a4a2e'), cc = new THREE.Color();
  for (let i = 0; i < fp.count; i++) {
    cc.copy(cUnder).lerp(cTop, THREE.MathUtils.clamp(fn.getY(i) * 0.6 + 0.45 + prng() * 0.1, 0, 1));
    fc.set([cc.r, cc.g, cc.b], i * 3);
  }
  fol.setAttribute('color', new THREE.BufferAttribute(fc, 3));
  // 枝
  const branches = [trunk];
  for (const [px, py, pz] of padDefs.slice(1)) {
    const b = new THREE.CylinderGeometry(0.06, 0.12, Math.hypot(px, pz) + 0.2, 5);
    b.translate(0, (Math.hypot(px, pz) + 0.2) / 2, 0);
    b.rotateZ(-Math.PI / 2 + 0.25);
    b.rotateY(-Math.atan2(pz, px));
    b.translate(0, py - 0.5, 0);
    branches.push(b);
  }
  const trunkGeo = mergeGeometries(branches.map((g) => (g.index ? g.toNonIndexed() : g)));
  const spots = [];
  // 畑の北側に防風林
  FIELDS.forEach((f, fi) => {
    if (fi % 3 !== 0) return; // 防風林は一部の畑だけ（区画のすき間に一列）
    for (let u = -f.w / 2 - 4; u <= f.w / 2 + 4; u += 3.6 + rng() * 1.5) {
      const w = fieldWorld(f, u, f.d / 2 + 6.5 + rng() * 1);
      spots.push([w.x, w.z, 0.75 + rng() * 0.3]);
    }
  });
  let guard = 0;
  while (spots.length < 320 * scale && guard++ < 6000) {
    const x = (rng() - 0.5) * 460, z = (rng() - 0.5) * 460;
    const inside = landRadius(Math.atan2(z, x)) - Math.hypot(x, z);
    if (inside < 26) continue;
    if (FIELDS.some((f) => fieldRectDist(f, x, z) < 14)) continue;
    if (FLATS.some((f) => Math.hypot(x - f.x, z - f.z) < f.r + 6)) continue;
    if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 12) continue;
    // 群生させる
    if (vnoise(x * 0.02, z * 0.02) < -0.05) continue;
    spots.push([x, z, 0.8 + rng() * 0.7]);
  }
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#4a3526', roughness: 0.95 });
  const folMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const tm = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length);
  const fm = new THREE.InstancedMesh(fol, folMat, spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const c = new THREE.Color();
  spots.forEach(([x, z, sc], i) => {
    q.setFromEuler(new THREE.Euler((rng() - 0.5) * 0.12, rng() * 6.28, (rng() - 0.5) * 0.12));
    m.compose(v.set(x, heightAt(x, z) - 0.2, z), q, s.set(sc, sc * (0.9 + rng() * 0.3), sc));
    tm.setMatrixAt(i, m); fm.setMatrixAt(i, m);
    c.setHSL(0.22 + rng() * 0.08, 0.25, 0.8 + rng() * 0.25);
    fm.setColorAt(i, c);
  });
  for (const mesh of [tm, fm]) { mesh.castShadow = true; mesh.receiveShadow = true; }
  return [tm, fm];
}

// ---------- 建物 ----------
// ---------- 岩場・海食柱（銚子の荒々しい海岸） ----------
function rockGeo(seed, detail = 2) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position, cols = new Float32Array(p.count * 3);
  const c = new THREE.Color(), dark = new THREE.Color('#5e5146'), light = new THREE.Color('#a8937a'), moss = new THREE.Color('#6d7d45');
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = vnoise(x * 1.6 + seed, z * 1.6 - seed + y) * 0.28 + vnoise(x * 4 + seed * 2, y * 4 + z * 3) * 0.08;
    const k = 1 + n;
    x *= k; z *= k; y *= k;
    // 上面は平たく、角ばった岩に
    if (y > 0.45) y = 0.45 + (y - 0.45) * 0.35;
    p.setXYZ(i, x, y, z);
    // 地層の縞と、上面のコケ
    c.copy(dark).lerp(light, 0.5 + 0.5 * Math.sin(y * 7 + seed));
    if (y > 0.4) c.lerp(moss, 0.45);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  // 面ごとの法線にして、切り立った岩肌らしく角ばらせる
  g = g.toNonIndexed();
  g.computeVertexNormals();
  return g;
}

function buildRocks(scale) {
  const group = new THREE.Group();
  const rng = mulberry32(77);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const variants = [rockGeo(1.3, 1), rockGeo(4.7, 2), rockGeo(9.1, 1)];
  const lists = variants.map(() => []);
  const tmp = { m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), s: new THREE.Vector3(), v: new THREE.Vector3() };
  const add = (x, y, z, sx, sy, sz, rot) => {
    tmp.e.set((rng() - 0.5) * 0.3, rot, (rng() - 0.5) * 0.3);
    tmp.q.setFromEuler(tmp.e);
    tmp.m.compose(tmp.v.set(x, y, z), tmp.q, tmp.s.set(sx, sy, sz));
    lists[Math.floor(rng() * variants.length)].push(tmp.m.clone());
  };
  // 崖の下と波打ち際に転がる岩
  const N = Math.floor(520 * scale);
  for (let i = 0; i < N; i++) {
    const th = rng() * Math.PI * 2;
    const R = landRadius(th);
    const off = 3 + rng() * 30; // 崖の下〜沖の浅瀬（海側）
    const r = R + off;
    const x = Math.cos(th) * r, z = Math.sin(th) * r;
    const h = heightAt(x, z);
    if (h > 0.3) continue; // 崖の斜面には置かない
    const sc = 1.2 + Math.pow(rng(), 2) * 4.5;
    const y = h > -1.5 ? h + sc * 0.15 : -0.6 + rng() * 0.9; // 浅瀬から顔を出す
    add(x, y, z, sc * (0.8 + rng() * 0.6), sc * (0.6 + rng() * 0.6), sc * (0.8 + rng() * 0.6), rng() * 6.28);
  }
  // 沖に立つ海食柱（屏風ヶ浦・犬吠埼の岩礁のイメージ）
  for (let i = 0; i < 18; i++) {
    const th = rng() * Math.PI * 2;
    const r = landRadius(th) + 25 + rng() * 70;
    const x = Math.cos(th) * r, z = Math.sin(th) * r;
    const hgt = 8 + rng() * 18, w = 4 + rng() * 6;
    add(x, 0, z, w, hgt, w * (0.7 + rng() * 0.5), rng() * 6.28);
    for (let k = 0; k < 3; k++) add(x + (rng() - 0.5) * w * 3, -0.3, z + (rng() - 0.5) * w * 3, w * 0.5, 2 + rng() * 3, w * 0.5, rng() * 6.28);
  }
  // 台地の上にも点々と大岩
  for (let i = 0; i < 40 * scale; i++) {
    const x = (rng() - 0.5) * 400, z = (rng() - 0.5) * 400;
    const inside = landRadius(Math.atan2(z, x)) - Math.hypot(x, z);
    if (inside < 30) continue;
    if (FIELDS.some((f) => fieldRectDist(f, x, z) < 12)) continue;
    if (FLATS.some((f) => Math.hypot(x - f.x, z - f.z) < f.r + 6)) continue;
    if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 15) continue;
    const sc = 1 + rng() * 2.5;
    add(x, heightAt(x, z) + sc * 0.1, z, sc, sc * 0.7, sc, rng() * 6.28);
  }
  variants.forEach((geo, k) => {
    const im = new THREE.InstancedMesh(geo, mat, lists[k].length);
    lists[k].forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = true; im.receiveShadow = true;
    group.add(im);
  });
  return group;
}

// ---------- 海（ゲルストナー波） ----------
function buildOcean() {
  const geo = new THREE.PlaneGeometry(2600, 2600, 360, 360);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uAmp: { value: 0.4 }, uStorm: { value: 0 },
      uDeep: { value: new THREE.Color('#0b2f3a') }, uShallow: { value: new THREE.Color('#2e7f7a') },
      uSky: { value: new THREE.Color('#b9c8d6') }, uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color('#ffd9a0') }, uFogColor: { value: new THREE.Color() }, uFogDensity: { value: 0.002 },
    },
    vertexShader: /* glsl */`
      uniform float uTime, uAmp;
      varying vec3 vWorld; varying vec3 vN; varying float vCrest;
      vec3 gerstner(vec2 p, vec2 dir, float steep, float wl, inout vec3 tg, inout vec3 bn){
        float k = 6.28318/wl; float c = sqrt(9.8/k); vec2 d = normalize(dir);
        float f = k*(dot(d,p) - c*uTime); float a = steep/k;
        tg += vec3(-d.x*d.x*steep*sin(f), d.x*steep*cos(f), -d.x*d.y*steep*sin(f));
        bn += vec3(-d.x*d.y*steep*sin(f), d.y*steep*cos(f), -d.y*d.y*steep*sin(f));
        return vec3(d.x*a*cos(f), a*sin(f), d.y*a*cos(f));
      }
      void main(){
        vec4 wp = modelMatrix*vec4(position,1.);
        vec2 xz = wp.xz;
        vec3 tg = vec3(1,0,0), bn = vec3(0,0,1), o = vec3(0);
        o += gerstner(xz, vec2(-1., -.35), .17*uAmp, 64., tg, bn);
        o += gerstner(xz, vec2(-.7, -.8), .13*uAmp, 33., tg, bn);
        o += gerstner(xz, vec2(-.2, -1.), .10*uAmp, 19., tg, bn);
        o += gerstner(xz, vec2(-1., .5), .08*uAmp, 11., tg, bn);
        wp.xyz += o;
        vN = normalize(cross(bn, tg));
        vCrest = o.y / max(uAmp*3.2, .3);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix*viewMatrix*wp;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uStorm, uFogDensity;
      uniform vec3 uDeep, uShallow, uSky, uSunDir, uSunColor, uFogColor;
      varying vec3 vWorld; varying vec3 vN; varying float vCrest;
      ${GLSL_NOISE}
      ${GLSL_LAND}
      void main(){
        vec2 p = vWorld.xz;
        float e = .6;
        vec2 q1 = p*.09 + vec2(uTime*.35, uTime*.2), q2 = p*.21 - vec2(uTime*.25, -uTime*.31);
        float n0 = fbm(q1) + .5*fbm(q2);
        float nx = fbm(q1+vec2(e*.09,0.)) + .5*fbm(q2+vec2(e*.21,0.));
        float nz = fbm(q1+vec2(0.,e*.09)) + .5*fbm(q2+vec2(0.,e*.21));
        vec3 N = normalize(vN + vec3(n0-nx, 0., n0-nz)*(1.6+uStorm*1.4));
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = .03 + .97*pow(1.-max(dot(N,V),0.), 5.);
        float r = length(p); float inside = landRadius(atan(p.y, p.x)) - r;
        float shore = smoothstep(-70., 0., inside);
        vec3 water = mix(uDeep, uShallow, clamp(vCrest*.35 + .25 + shore*.45, 0., 1.));
        vec3 R = reflect(-V, N);
        vec3 refl = mix(uSky*.65, uSky*1.05, smoothstep(-.1, .6, R.y));
        vec3 col = mix(water, refl, fres);
        vec3 H = normalize(uSunDir + V);
        col += uSunColor * pow(max(dot(N,H),0.), 260.) * 6. * (1.-uStorm*.9);
        col += uSunColor * pow(max(dot(N,H),0.), 24.) * .12 * (1.-uStorm);
        float fn = fbm(p*.35 + uTime*.4);
        float crest = smoothstep(.45, .9, vCrest + (fn-.5)*.4) * (.15 + .85*uStorm) * .8;
        float shoreFoam = smoothstep(-16., -4., inside) * (1. - smoothstep(-1., 4., inside)) * smoothstep(.55, .8, fn + .3*sin(inside*.7 - uTime*2.2)) * (.5 + .5*uStorm);
        col = mix(col, vec3(.92,.94,.95), clamp(crest + shoreFoam, 0., .9));
        float d = length(vWorld - cameraPosition);
        float fog = 1. - exp(-uFogDensity*uFogDensity*d*d);
        col = mix(col, uFogColor, fog);
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0;
  mesh.frustumCulled = false;
  return mesh;
}

export function buildWorld(scene, Q, windU) {
  const group = new THREE.Group();
  scene.add(group);
  const terrain = buildTerrain();
  group.add(terrain);
  buildFieldPlanes(group);
  const grass = buildGrass(Q.grass, windU);
  if (grass) group.add(grass);
  for (const t of buildTrees(Q.trees)) group.add(t);
  const place = (obj, p, rotY = 0) => { obj.position.set(p.x, heightAt(p.x, p.z), p.z); obj.rotation.y = rotY; group.add(obj); return obj; };
  const house = place(buildHouse(), HOUSE);
  place(buildKeiTruck(), { x: HOUSE.x + 10, z: HOUSE.z + 9 }, 0.5);
  place(buildBarn(), BARN, 0.35);
  place(buildGreenhouse(), GREENHOUSE, 0.2);
  const lighthouse = place(buildLighthouse(), LIGHTHOUSE, Math.atan2(LIGHTHOUSE.x, LIGHTHOUSE.z) + Math.PI);
  group.add(buildRocks(Q.trees));
  const ocean = buildOcean();
  group.add(ocean);

  return {
    group, ocean, terrain,
    update(dt, t, w) {
      const u = ocean.material.uniforms;
      u.uTime.value = t;
      u.uAmp.value = lerp(0.38, 1.35, w.storm);
      u.uStorm.value = w.storm;
      u.uSky.value.copy(w.skyColor);
      u.uSunDir.value.copy(w.sunDir);
      u.uFogColor.value.copy(w.fogColor);
      u.uFogDensity.value = w.fogDensity;
      u.uDeep.value.set('#1d6f9c').lerp(new THREE.Color('#1c2a2c'), w.storm);
      u.uShallow.value.set('#4fd0c8').lerp(new THREE.Color('#4a5f58'), w.storm);
      lighthouse.userData.beam.rotation.y = t * 0.8;
      lighthouse.userData.beamMat.uniforms.uStrength.value = lerp(0.12, 0.65, w.storm);
      house.userData.windowMat.emissiveIntensity = lerp(0.2, 2.2, w.storm);
      house.userData.shojiMat.emissiveIntensity = lerp(0, 0.9, w.storm);
    },
  };
}
