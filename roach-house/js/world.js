// パプリカハウスの間取りと見た目（夜明けの温室）
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { rand, randRange, inRect } from './util.js';
import * as TX from './textures.js';

// ハウスの中で動ける範囲（壁の内側）
export const BOUNDS = { minX: -21.6, maxX: 21.6, minZ: -13.6, maxZ: 13.6 };

// パプリカの畝（葉の下はゴキブリの隠れ場所）
export const ROWS = [-10, -5, 0, 5, 10].map((z) => ({
  z, x0: -18, x1: 3, hw: 0.9,
  minX: -18, maxX: 3, minZ: z - 0.9, maxZ: z + 0.9,
}));

// 出荷作業台（上に収穫コンテナ。台の下も隠れ場所）
export const TABLE_TOP = 2.2;
export const TABLES = [
  { x: 13, z: -8 }, { x: 13, z: -1 }, { x: 13, z: 6 },
].map((t) => ({
  ...t, w: 9, d: 2.4, top: TABLE_TOP,
  minX: t.x - 4.5, maxX: t.x + 4.5, minZ: t.z - 1.2, maxZ: t.z + 1.2,
}));

export const CRATE = { w: 1.5, d: 1.0, h: 0.7 };

// コンテナの置き場所：台の上 12 箱 ＋ 床の上 4 箱
export const CRATE_SPOTS = [];
TABLES.forEach((t, ti) => {
  for (const dx of [-3.3, -1.1, 1.1, 3.3]) CRATE_SPOTS.push({ x: t.x + dx, z: t.z, table: ti });
});
for (const p of [[5, -12.4], [5, 12.4], [-8, -12.5], [-8, 12.5]]) CRATE_SPOTS.push({ x: p[0], z: p[1], table: -1 });

export const DOOR = { x: 20.5, z: 11 };
export const TRUCK = { x: 27.2, z: 11 };
export const PLAYER_START = { x: -16, z: 0 };
export const FARMER_START = { x: 19, z: 9.5 };

export const PATROL_POINTS = [
  [-12, -7.5], [-4, -7.5], [-12, -2.5], [0, -2.5], [-8, 2.5], [-15, 7.5],
  [-2, 7.5], [-12, 12.5], [-19.5, 0], [4.5, 0], [-19.5, -10], [4.5, 9],
].map(([x, z]) => ({ x, z }));

export const INITIAL_TRAPS = [
  { x: -6, z: -7.4, r: 0.2 }, { x: 1, z: 2.6, r: 1.4 }, { x: 6.5, z: -4.4, r: 0.1 },
  { x: 8.6, z: 9.6, r: 1.2 }, { x: -13, z: 7.6, r: 0.4 },
];

export function rowAt(x, z, pad = 0.15) {
  for (const r of ROWS) if (inRect(x, z, r, pad)) return r;
  return null;
}
export function tableAt(x, z, pad = 0) {
  for (let i = 0; i < TABLES.length; i++) if (inRect(x, z, TABLES[i], pad)) return i;
  return -1;
}

// 夜明けの太陽の向き（東の低い位置から差しこむ）
export const SUN_DIR = new THREE.Vector3(0.74, 0.34, -0.58).normalize();

// 葉がそよぐ時間（シェーダーと共有）
const windUniform = { value: 0 };
function addWind(mat, amount) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windUniform;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float sw = sin(uTime * 1.5 + ip.x * 0.7 + ip.z * 0.5) * 0.6 + sin(uTime * 3.3 + ip.x * 2.3 + ip.y) * 0.25;
          transformed.y += sw * ${amount.toFixed(3)} * max(position.x, 0.0);
          transformed.z += sw * ${(amount * 0.5).toFixed(3)} * max(position.x, 0.0);
        #endif`);
  };
  mat.customProgramCacheKey = () => `wind${amount}`;
}

// ---------- 世界を組み立てる ----------
export function buildWorld(scene, renderer, q) {
  const g = new THREE.Group();
  scene.add(g);

  // 空（物理的な空の色）と、映りこみ用の環境
  const sky = new Sky();
  sky.scale.setScalar(280);
  const su = sky.material.uniforms;
  su.turbidity.value = 6.5;
  su.rayleigh.value = 2.2;
  su.mieCoefficient.value = 0.006;
  su.mieDirectionalG.value = 0.86;
  su.sunPosition.value.copy(SUN_DIR).multiplyScalar(100);
  scene.add(sky);
  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const sky2 = new Sky();
  sky2.scale.setScalar(100);
  for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) sky2.material.uniforms[k].value = su[k].value;
  sky2.material.uniforms.sunPosition.value.copy(SUN_DIR).multiplyScalar(100);
  envScene.add(sky2);
  const groundEnv = new THREE.Mesh(new THREE.CircleGeometry(90, 24), new THREE.MeshBasicMaterial({ color: 0x4a3a28 }));
  groundEnv.rotation.x = -Math.PI / 2;
  groundEnv.position.y = -2;
  envScene.add(groundEnv);
  scene.environment = pm.fromScene(envScene, 0.02).texture;
  scene.environmentIntensity = 0.55;
  pm.dispose();
  scene.fog = new THREE.FogExp2(0xe6d2b6, 0.0055);

  // 光：低い朝日 ＋ 空からのやわらかい光
  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x5a4330, 0.75);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc98f, 3.4);
  sun.position.copy(SUN_DIR).multiplyScalar(45);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(q.shadow, q.shadow);
  const sc = sun.shadow.camera;
  sc.left = -30; sc.right = 30; sc.top = 24; sc.bottom = -24; sc.near = 5; sc.far = 110;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  // 温室の中で光が回りこむぶんの補助光（影なし）
  const bounce = new THREE.DirectionalLight(0xffe2c0, 0.35);
  bounce.position.set(-10, 8, 12);
  scene.add(bounce);

  buildGround(g);
  buildPlants(g);
  buildHouse(g);
  buildTables(g);
  buildProps(g);
  buildTruck(g);
  buildOutside(g);
  const shafts = q.shafts ? buildShafts(g) : null;
  const dust = buildDust(g, q.dust);

  return {
    group: g, sun,
    setShadow(size) {
      if (sun.shadow.mapSize.x === size) return;
      sun.shadow.mapSize.set(size, size);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    },
    update(t, cam) {
      windUniform.value = t;
      if (shafts) shafts.forEach((s, i) => { s.material.opacity = s.userData.base * (0.75 + 0.25 * Math.sin(t * 0.4 + i * 1.7)); });
      if (dust) dust.update(t, cam);
    },
  };
}

function buildGround(g) {
  const D = TX.dirt();
  for (const k of ['map', 'normal', 'rough']) D[k].repeat.set(11, 7);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(44, 28), new THREE.MeshStandardMaterial({
    map: D.map, normalMap: D.normal, roughnessMap: D.rough, roughness: 1, normalScale: new THREE.Vector2(0.6, 0.6),
  }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);

  const C = TX.concrete();
  C.map.repeat.set(3, 5); C.normal.repeat.set(3, 5);
  const conc = new THREE.Mesh(new THREE.PlaneGeometry(17, 28), new THREE.MeshStandardMaterial({
    map: C.map, normalMap: C.normal, roughness: 0.82, normalScale: new THREE.Vector2(0.6, 0.6),
  }));
  conc.rotation.x = -Math.PI / 2;
  conc.position.set(13.5, 0.006, 0);
  conc.receiveShadow = true;
  g.add(conc);
  // 水たまり（朝日を映す）
  const puddleMat = new THREE.MeshStandardMaterial({ color: 0x1d1a16, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.75 });
  for (const [x, z, s] of [[8.2, -4.6, 1.2], [16.5, 2.6, 0.9], [-19.6, 4, 1.1], [6.5, 8.6, 0.8]]) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(1, 28), puddleMat);
    p.rotation.x = -Math.PI / 2;
    p.scale.set(s * 1.4, s, 1);
    p.position.set(x, 0.012, z);
    p.receiveShadow = true;
    g.add(p);
  }

  // 黒マルチ（しわのあるビニール）と点滴チューブ
  const M = TX.mulch();
  M.normal.repeat.set(28, 3);
  const mulchMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.32, metalness: 0.05, normalMap: M.normal, normalScale: new THREE.Vector2(0.3, 0.3) });
  const tubeMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.25 });
  for (const r of ROWS) {
    const len = r.x1 - r.x0 + 0.6;
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(len, 0.16, r.hw * 2 + 0.3, 1, 1, 1), mulchMat);
    ridge.position.set((r.x0 + r.x1) / 2, 0.08, r.z);
    ridge.receiveShadow = true;
    g.add(ridge);
    for (const dz of [-0.35, 0.35]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 8), tubeMat);
      tube.rotation.z = Math.PI / 2;
      tube.position.set((r.x0 + r.x1) / 2, 0.19, r.z + dz);
      tube.castShadow = true;
      g.add(tube);
    }
  }
}

// パプリカの実の形（4つのでこぼこ・上下のくぼみ）
export function paprikaGeometry(seg = 20) {
  const geo = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.8));
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const rxz = Math.hypot(x, z);
    const th = Math.atan2(z, x);
    const lobe = 1 + 0.1 * Math.cos(4 * th) * (1 - Math.abs(y) * 0.4);
    x *= lobe; z *= lobe;
    y *= 1.12;
    if (y > 0.75) y -= 0.32 * (1 - rxz);
    if (y < -0.8) y += 0.22 * (1 - rxz) * (0.6 + 0.4 * Math.cos(4 * th));
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

function leafGeometry() {
  const geo = new THREE.PlaneGeometry(1, 0.46, 8, 4);
  geo.translate(0.5, 0, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const wf = Math.pow(Math.sin(Math.PI * Math.pow(x, 0.75)), 0.9) * (x < 0.06 ? x / 0.06 : 1);
    const ny = y * wf;
    const z = -Math.abs(ny) * 0.55 - x * x * 0.22;
    p.setXYZ(i, x, ny, z);
  }
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function buildPlants(g) {
  const plants = [];
  for (const r of ROWS) {
    for (let x = r.x0 + 0.6; x <= r.x1 - 0.4; x += 1.3) {
      plants.push({ x: x + randRange(-0.12, 0.12), z: r.z + randRange(-0.15, 0.15) });
    }
  }
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  // 茎：1株を2本仕立てにして、それぞれひもで吊る
  const stemGeo = new THREE.CylinderGeometry(0.035, 0.07, 1, 6);
  stemGeo.translate(0, 0.5, 0);
  const stems = new THREE.InstancedMesh(stemGeo, new THREE.MeshStandardMaterial({ color: 0x4d7a2c, roughness: 0.7 }), plants.length * 3);
  const strGeo = new THREE.CylinderGeometry(0.01, 0.01, 1, 3);
  strGeo.translate(0, 0.5, 0);
  const strings = new THREE.InstancedMesh(strGeo, new THREE.MeshStandardMaterial({ color: 0xe9e4d4, roughness: 0.9 }), plants.length * 2);
  const tips = [];
  let si = 0, ti = 0;
  for (const p of plants) {
    dummy.position.set(p.x, 0.16, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1.2, 1); dummy.updateMatrix();
    stems.setMatrixAt(si++, dummy.matrix);
    for (const s of [-1, 1]) {
      const tilt = 0.13 * s;
      dummy.position.set(p.x, 1.3, p.z);
      dummy.rotation.set(tilt, 0, randRange(-0.05, 0.05));
      dummy.scale.set(0.85, 3.4, 0.85);
      dummy.updateMatrix();
      stems.setMatrixAt(si++, dummy.matrix);
      const tip = new THREE.Vector3(0, 3.4, 0).applyEuler(dummy.rotation).add(dummy.position);
      tips.push({ base: dummy.position.clone(), tip, s, p });
      dummy.position.copy(tip); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 7.6 - tip.y, 1); dummy.updateMatrix();
      strings.setMatrixAt(ti++, dummy.matrix);
    }
  }
  stems.castShadow = true;
  g.add(stems, strings);

  // 葉
  const L = TX.leaf();
  const leafMat = new THREE.MeshStandardMaterial({ map: L.map, normalMap: L.normal, side: THREE.DoubleSide, roughness: 0.62, color: 0xffffff });
  addWind(leafMat, 0.06);
  const PER = 13;
  const leaves = new THREE.InstancedMesh(leafGeometry(), leafMat, tips.length * PER);
  let k = 0;
  for (const st of tips) {
    for (let j = 0; j < PER; j++) {
      const t = 0.1 + (j / PER) * 0.95;
      const pos = st.base.clone().lerp(st.tip, t);
      const a = j * 2.4 + rand() * 0.8 + st.s;
      dummy.position.copy(pos);
      dummy.rotation.set(0, a, 0);
      dummy.rotateZ(randRange(0.05, 0.55));
      const s = randRange(0.9, 1.45) * (1.1 - t * 0.35);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      leaves.setMatrixAt(k, dummy.matrix);
      col.setHSL(0.27 + rand() * 0.05, 0.45 + rand() * 0.2, 0.42 + rand() * 0.16);
      leaves.setColorAt(k, col);
      k++;
    }
  }
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  g.add(leaves);

  // 実
  const fruitMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 });
  const fruitList = [];
  for (const st of tips) {
    const n = rand() < 0.6 ? 2 : 1;
    for (let j = 0; j < n; j++) {
      const t = randRange(0.12, 0.55);
      const pos = st.base.clone().lerp(st.tip, t);
      const a = rand() * Math.PI * 2;
      fruitList.push({ x: pos.x + Math.cos(a) * 0.22, y: pos.y - 0.25, z: pos.z + Math.sin(a) * 0.22 });
    }
  }
  const fruits = new THREE.InstancedMesh(paprikaGeometry(18), fruitMat, fruitList.length);
  const fcols = [0xc81d12, 0xf0b90f, 0xe9670f, 0xc81d12, 0x3c7a22];
  const calyx = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.12, 0.1, 6), new THREE.MeshStandardMaterial({ color: 0x3e6a22, roughness: 0.6 }), fruitList.length);
  fruitList.forEach((f, i) => {
    const s = randRange(0.2, 0.27);
    dummy.position.set(f.x, f.y, f.z); dummy.rotation.set(randRange(-0.15, 0.15), rand() * 6, randRange(-0.15, 0.15)); dummy.scale.setScalar(s); dummy.updateMatrix();
    fruits.setMatrixAt(i, dummy.matrix);
    fruits.setColorAt(i, col.setHex(fcols[Math.floor(rand() * fcols.length)]));
    dummy.position.y += s * 0.98; dummy.scale.setScalar(1); dummy.updateMatrix();
    calyx.setMatrixAt(i, dummy.matrix);
  });
  fruits.castShadow = true;
  g.add(fruits, calyx);

  // 上の誘引ワイヤーと黄色い粘着シート（本物の温室にある虫取り）
  const wireMat = new THREE.MeshStandardMaterial({ color: 0xaab0b5, metalness: 0.8, roughness: 0.4 });
  const cardMat = new THREE.MeshStandardMaterial({ map: TX.stickyCard(), side: THREE.DoubleSide, roughness: 0.4 });
  for (const r of ROWS) {
    for (const dz of [-0.45, 0.45]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, r.x1 - r.x0 + 2, 4), wireMat);
      w.rotation.z = Math.PI / 2;
      w.position.set((r.x0 + r.x1) / 2, 7.6, r.z + dz);
      g.add(w);
    }
    for (let i = 0; i < 3; i++) {
      const x = r.x0 + 3 + i * 7 + rand() * 2;
      const card = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.75), cardMat);
      card.position.set(x, 4.3, r.z + 0.05);
      card.rotation.y = randRange(-0.4, 0.4);
      card.castShadow = true;
      g.add(card);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 3.0, 3), wireMat);
      s.position.set(x, 6.1, r.z + 0.05);
      g.add(s);
    }
  }
}

function buildHouse(g) {
  const film = new THREE.MeshPhysicalMaterial({
    color: 0xf4fbff, transparent: true, opacity: 0.1, roughness: 0.08, metalness: 0,
    side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.6, alphaMap: TX.condensation(),
  });
  film.alphaMap.repeat.set(10, 3);
  const steel = new THREE.MeshStandardMaterial({ color: 0xc7ccd1, metalness: 0.85, roughness: 0.32 });
  const WALL_H = 5, RISE = 6;

  for (const z of [-14, 14]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(44, WALL_H), film);
    w.position.set(0, WALL_H / 2, z);
    g.add(w);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(44, 0.12, 0.12), steel);
    rail.position.set(0, WALL_H, z);
    g.add(rail);
    // 巻き上げ式の換気（まるめたビニール）
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 44, 12), new THREE.MeshStandardMaterial({ color: 0xe8f0f0, roughness: 0.3, transparent: true, opacity: 0.85 }));
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 1.7, z * 0.995);
    roll.castShadow = true;
    g.add(roll);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(44, 0.35, 0.18), new THREE.MeshStandardMaterial({ color: 0x8a8f94, roughness: 0.8 }));
    sill.position.set(0, 0.17, z);
    g.add(sill);
  }
  g.add(makeArchRoof(film, WALL_H, RISE));

  const hoopPts = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI;
    hoopPts.push(new THREE.Vector3(0, WALL_H + Math.sin(a) * RISE, -Math.cos(a) * 14));
  }
  const hoopGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hoopPts), 40, 0.07, 6, false);
  const postGeo = new THREE.CylinderGeometry(0.08, 0.08, WALL_H, 8);
  for (let x = -22; x <= 22; x += 4) {
    const h = new THREE.Mesh(hoopGeo, steel);
    h.position.x = x;
    h.castShadow = true;
    g.add(h);
    for (const z of [-14, 14]) {
      const p = new THREE.Mesh(postGeo, steel);
      p.position.set(x, WALL_H / 2, z);
      p.castShadow = true;
      g.add(p);
    }
    // 横の梁（タイバー）
    const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 28, 6), steel);
    tie.rotation.x = Math.PI / 2;
    tie.position.set(x, 8.6, 0);
    tie.castShadow = true;
    g.add(tie);
  }
  for (const z of [0, -7, 7]) {
    const purlin = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 44, 6), steel);
    purlin.rotation.z = Math.PI / 2;
    const a = Math.acos(z / -14 || 0);
    purlin.position.set(0, WALL_H + Math.sin(Math.acos(-z / 14)) * RISE, z);
    purlin.castShadow = true;
    g.add(purlin);
    void a;
  }

  for (const side of [-1, 1]) {
    const s = new THREE.Shape();
    s.moveTo(-14, 0); s.lineTo(14, 0); s.lineTo(14, WALL_H);
    for (let i = 1; i < 20; i++) {
      const a = (i / 20) * Math.PI;
      s.lineTo(Math.cos(a) * 14, WALL_H + Math.sin(a) * RISE);
    }
    s.lineTo(-14, WALL_H); s.lineTo(-14, 0);
    if (side === 1) {
      const hole = new THREE.Path();
      hole.moveTo(-13, 0.01); hole.lineTo(-9, 0.01); hole.lineTo(-9, 4.6); hole.lineTo(-13, 4.6); hole.lineTo(-13, 0.01);
      s.holes.push(hole);
    }
    const wall = new THREE.Mesh(new THREE.ShapeGeometry(s), film);
    wall.rotation.y = side === 1 ? Math.PI / 2 : -Math.PI / 2;
    wall.position.x = 22 * side;
    g.add(wall);
  }
  for (const z of [9, 13]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.7, 0.2), steel);
    p.position.set(22, 2.35, z);
    g.add(p);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 4.2), steel);
  top.position.set(22, 4.7, 11);
  g.add(top);
  // 引き戸のレール
  const railD = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 9), steel);
  railD.position.set(22.1, 4.8, 9);
  g.add(railD);

  // 換気扇
  const fanG = new THREE.Group();
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.45, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x9aa3a8, metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide }));
  housing.rotation.z = Math.PI / 2;
  fanG.add(housing);
  const grill = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.03, 6, 24), steel);
  grill.rotation.y = Math.PI / 2;
  fanG.add(grill);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.28), steel);
    blade.position.y = 0.45;
    const b = new THREE.Group();
    b.rotation.x = (i / 4) * Math.PI * 2;
    b.add(blade);
    fanG.add(b);
  }
  fanG.position.set(-21.85, 3.2, -6);
  g.add(fanG);
}

function makeArchRoof(mat, wallH, rise) {
  const segs = 28;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI;
    const y = wallH + Math.sin(a) * rise, z = -Math.cos(a) * 14;
    pos.push(-22, y, z, 22, y, z);
    uv.push(0, i / segs, 1, i / segs);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

function buildTables(g) {
  const W = TX.plywood();
  W.map.repeat.set(1, 1);
  const topMat = new THREE.MeshStandardMaterial({ map: W.map, normalMap: W.normal, roughness: 0.7 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0xb8bec3, metalness: 0.85, roughness: 0.35 });
  for (const t of TABLES) {
    const top = new THREE.Mesh(new THREE.BoxGeometry(t.w, 0.14, t.d), topMat);
    top.position.set(t.x, t.top - 0.07, t.z);
    top.castShadow = true; top.receiveShadow = true;
    g.add(top);
    const apron = new THREE.Mesh(new THREE.BoxGeometry(t.w - 0.2, 0.2, t.d - 0.2), legMat);
    apron.position.set(t.x, t.top - 0.24, t.z);
    apron.castShadow = true;
    g.add(apron);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, t.top - 0.14, 10), legMat);
      leg.position.set(t.x + sx * (t.w / 2 - 0.18), (t.top - 0.14) / 2, t.z + sz * (t.d / 2 - 0.18));
      leg.castShadow = true;
      g.add(leg);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 10), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 }));
      foot.position.set(leg.position.x, 0.025, leg.position.z);
      g.add(foot);
    }
    for (const sz of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, t.w - 0.4, 8), legMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(t.x, 0.45, t.z + sz * (t.d / 2 - 0.18));
      g.add(bar);
    }
  }
}

function buildProps(g) {
  // 段ボールの山
  const cb = new THREE.MeshStandardMaterial({ map: TX.cardboard(), roughness: 0.92 });
  const plain = new THREE.MeshStandardMaterial({ color: 0xb48552, roughness: 0.95 });
  const mats = [plain, plain, plain, plain, cb, cb];
  for (const [x, z, h, r] of [[20, -12.5, 0, 0.05], [20, -12.5, 1, -0.08], [18.6, -12.6, 0, 0.1], [20.2, -10.9, 0, -0.04], [18.7, -12.5, 1, 0.2]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1, 1.3), mats);
    b.position.set(x, 0.5 + h, z);
    b.rotation.y = r;
    b.castShadow = true; b.receiveShadow = true;
    g.add(b);
  }
  // 台はかり
  const scaleG = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.7), new THREE.MeshStandardMaterial({ color: 0xe8e8e2, roughness: 0.4 }));
  body.position.y = 0.09;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.03, 0.62), new THREE.MeshStandardMaterial({ color: 0xcfd4d8, metalness: 0.9, roughness: 0.25 }));
  plate.position.y = 0.2;
  const disp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.02), new THREE.MeshStandardMaterial({ color: 0x163018, emissive: 0x2fff6a, emissiveIntensity: 1.6 }));
  disp.position.set(0, 0.11, 0.36);
  scaleG.add(body, plate, disp);
  scaleG.position.set(17.9, TABLE_TOP, -1.5);
  scaleG.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.add(scaleG);
  // ホースリール
  const hose = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 40), new THREE.MeshStandardMaterial({ color: 0x2f8a3a, roughness: 0.35 }));
  for (let i = 0; i < 4; i++) {
    const h = hose.clone();
    h.position.set(-21, 0.62, 9 + i * 0.13);
    g.add(h);
  }
  const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 20), new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.6, roughness: 0.4 }));
  reel.rotation.x = Math.PI / 2;
  reel.position.set(-21, 0.62, 8.85);
  g.add(reel);
  // じょうろ
  const can = new THREE.Group();
  const cm = new THREE.MeshStandardMaterial({ color: 0x2b78c9, roughness: 0.35 });
  const cbody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.6, 16), cm);
  cbody.position.y = 0.3;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.8, 8), cm);
  spout.rotation.z = -0.9; spout.position.set(0.5, 0.5, 0);
  can.add(cbody, spout);
  can.position.set(-20.4, 0, -12.6);
  can.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.add(can);
  // 腰かけ
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.9, 16), new THREE.MeshStandardMaterial({ color: 0xd9452b, roughness: 0.45 }));
  stool.position.set(19.5, 0.45, 3);
  stool.castShadow = true;
  g.add(stool);
}

function buildTruck(g) {
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xf4f4f2, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.15 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x1f2a33, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.7 });
  const t = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.0, 2.6), paint);
  cab.position.set(2.6, 1.6, 0);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.25, 2.5), paint);
  roof.position.set(2.5, 2.7, 0);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 2.3), glassM);
  win.position.set(3.52, 2.15, 0);
  win.rotation.z = -0.12;
  const side = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 2.62), glassM);
  side.position.set(2.5, 2.2, 0);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 2.6), paint);
  bed.position.set(0, 1.12, 0);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 2.6), chrome);
  bumper.position.set(3.55, 0.75, 0);
  t.add(cab, roof, win, side, bed, bumper);
  for (const z of [-0.95, 0.95]) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c8, emissiveIntensity: 2.5 }));
    lamp.rotation.z = Math.PI / 2;
    lamp.position.set(3.52, 1.25, z);
    t.add(lamp);
  }
  for (const z of [-1.3, 1.3]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.45, 0.08), paint);
    rail.position.set(0, 1.45, z);
    t.add(rail);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 2.6), paint);
  tail.position.set(-1.8, 1.45, 0);
  t.add(tail);
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 20);
  wheelGeo.rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.37, 12);
  hubGeo.rotateX(Math.PI / 2);
  for (const x of [-1, 2.6]) for (const z of [-1.2, 1.2]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.position.set(x, 0.5, z);
    const h = new THREE.Mesh(hubGeo, chrome);
    h.position.copy(w.position);
    t.add(w, h);
  }
  t.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  t.position.set(TRUCK.x, 0, TRUCK.z);
  g.add(t);
}

function buildOutside(g) {
  const gt = TX.grass();
  gt.repeat.set(40, 40);
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshStandardMaterial({ map: gt, roughness: 0.95 }));
  outside.rotation.x = -Math.PI / 2;
  outside.position.y = -0.02;
  outside.receiveShadow = true;
  g.add(outside);
  // 砂利道
  const road = new THREE.Mesh(new THREE.PlaneGeometry(9, 60), new THREE.MeshStandardMaterial({ color: 0x8d8478, roughness: 1 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(28, -0.01, 0);
  road.receiveShadow = true;
  g.add(road);
  // 遠くの林
  const treeGeo = new THREE.IcosahedronGeometry(0.5, 1);
  const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ color: 0x2c4a2a, roughness: 1 }), 140);
  const d = new THREE.Object3D();
  for (let i = 0; i < 140; i++) {
    const a = (i / 140) * Math.PI * 2 + rand() * 0.04;
    const r = 95 + rand() * 30;
    const h = 5 + rand() * 6;
    d.position.set(Math.cos(a) * r, h * 0.45, Math.sin(a) * r);
    d.scale.set(5 + rand() * 4, h, 5 + rand() * 4);
    d.rotation.set(0, rand() * 6, 0);
    d.updateMatrix();
    trees.setMatrixAt(i, d.matrix);
  }
  g.add(trees);
  // 隣のハウス
  const film = new THREE.MeshStandardMaterial({ color: 0xe6eef2, transparent: true, opacity: 0.55, roughness: 0.2 });
  for (const z of [-34, 34]) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 40, 20, 1, false, 0, Math.PI), film);
    h.rotation.set(0, 0, Math.PI / 2);
    h.rotation.order = 'ZXY';
    h.scale.set(1, 1, 0.7);
    h.position.set(-4, 3, z);
    g.add(h);
  }
}

// 屋根から差しこむ朝日の筋
function buildShafts(g) {
  const tex = TX.softBeam();
  const list = [];
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(up, SUN_DIR);
  for (let i = 0; i < 9; i++) {
    const base = 0.05 + rand() * 0.05;
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xffd6a0, transparent: true, opacity: base, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    const len = 18, wdt = 1.6 + rand() * 2.2;
    const ground = new THREE.Vector3(randRange(-18, 14), 0, randRange(-12, 12));
    const center = ground.clone().addScaledVector(SUN_DIR, len * 0.42);
    for (let k = 0; k < 2; k++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(wdt, len), mat);
      m.quaternion.copy(q);
      m.rotateY(k * Math.PI / 2 + rand() * 0.4);
      m.position.copy(center);
      m.renderOrder = 3;
      m.userData.base = base;
      g.add(m);
      if (k === 0) list.push(m);
    }
  }
  return list;
}

// 光の中を舞うほこり（カメラのまわりだけに出す）
function buildDust(g, n) {
  if (!n) return null;
  const R = 9;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = randRange(-R, R); pos[i * 3 + 1] = randRange(0.1, 6); pos[i * 3 + 2] = randRange(-R, R);
    seed[i] = rand() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: TX.softDot(), color: 0xffe2b0, size: 0.06, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  g.add(pts);
  const base = new Float32Array(pos);
  return {
    update(t, cam) {
      const cx = cam.position.x, cz = cam.position.z;
      const a = geo.attributes.position.array;
      for (let i = 0; i < n; i++) {
        const s = seed[i];
        let x = base[i * 3] + Math.sin(t * 0.13 + s) * 0.6 + t * 0.05;
        let z = base[i * 3 + 2] + Math.cos(t * 0.11 + s * 1.3) * 0.6;
        x = ((x - cx + R) % (2 * R) + 2 * R) % (2 * R) - R + cx;
        z = ((z - cz + R) % (2 * R) + 2 * R) % (2 * R) - R + cz;
        a[i * 3] = x;
        a[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.2 + s * 2) * 0.3;
        a[i * 3 + 2] = z;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// 出荷済みコンテナを荷台に積む位置
export function truckSlot(i) {
  const layer = Math.floor(i / 4), j = i % 4;
  return {
    x: TRUCK.x - 0.85 + (j % 2) * 1.6,
    y: 1.25 + layer * 0.72,
    z: TRUCK.z - 0.55 + Math.floor(j / 2) * 1.1,
  };
}
