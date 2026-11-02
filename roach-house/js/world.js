// パプリカハウスの間取りと見た目
import * as THREE from 'three';
import { rand, randRange, inRect } from './util.js';

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

// ---------- 見た目 ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildWorld(scene, q) {
  const g = new THREE.Group();
  scene.add(g);

  // 空と光
  scene.background = new THREE.Color(0xbfe0f5);
  scene.fog = new THREE.Fog(0xcfe6f2, 45, 110);
  const hemi = new THREE.HemisphereLight(0xeef7ff, 0x6b5537, 1.25);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.3);
  sun.position.set(-14, 30, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(q.shadow, q.shadow);
  const sc = sun.shadow.camera;
  sc.left = -27; sc.right = 27; sc.top = 20; sc.bottom = -20; sc.near = 5; sc.far = 80;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);

  // 外の地面（草）
  const grassTex = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = '#7fae55'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      x.fillStyle = `hsl(${85 + Math.random() * 30},${35 + Math.random() * 20}%,${30 + Math.random() * 22}%)`;
      x.fillRect(Math.random() * w, Math.random() * h, 2, 3);
    }
  });
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(40, 40);
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshLambertMaterial({ map: grassTex }));
  outside.rotation.x = -Math.PI / 2;
  outside.position.y = -0.02;
  outside.receiveShadow = true;
  g.add(outside);

  // ハウスの床（土）
  const dirtTex = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#8b6a48'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const l = 22 + Math.random() * 26;
      x.fillStyle = `hsl(28,${28 + Math.random() * 18}%,${l}%)`;
      const s = Math.random() * 3 + 1;
      x.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
  });
  dirtTex.wrapS = dirtTex.wrapT = THREE.RepeatWrapping;
  dirtTex.repeat.set(10, 6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(44, 28), new THREE.MeshLambertMaterial({ map: dirtTex }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);

  // 出荷場のコンクリート
  const conc = new THREE.Mesh(new THREE.PlaneGeometry(17, 28), new THREE.MeshLambertMaterial({ color: 0xb9b4aa }));
  conc.rotation.x = -Math.PI / 2;
  conc.position.set(13.5, 0.006, 0);
  conc.receiveShadow = true;
  g.add(conc);

  // 黒マルチ（畝）
  const mulchMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.35, metalness: 0.1 });
  for (const r of ROWS) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(r.x1 - r.x0 + 0.6, 0.12, r.hw * 2 + 0.3), mulchMat);
    m.position.set((r.x0 + r.x1) / 2, 0.06, r.z);
    m.receiveShadow = true;
    g.add(m);
  }

  buildPlants(g);
  buildHouse(g);
  buildTables(g);
  buildTruck(g);

  return { group: g, sun };
}

function buildPlants(g) {
  const plants = [];
  for (const r of ROWS) {
    for (let x = r.x0 + 0.6; x <= r.x1 - 0.4; x += 1.3) {
      plants.push({ x: x + randRange(-0.15, 0.15), z: r.z + randRange(-0.25, 0.25) });
    }
  }
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  const stemGeo = new THREE.CylinderGeometry(0.05, 0.08, 4.2, 5);
  const stems = new THREE.InstancedMesh(stemGeo, new THREE.MeshLambertMaterial({ color: 0x4f7a2a }), plants.length);
  const strGeo = new THREE.CylinderGeometry(0.012, 0.012, 3, 3);
  const strings = new THREE.InstancedMesh(strGeo, new THREE.MeshBasicMaterial({ color: 0xe8e8e0 }), plants.length);
  plants.forEach((p, i) => {
    dummy.position.set(p.x, 2.1, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
    stems.setMatrixAt(i, dummy.matrix);
    dummy.position.set(p.x, 5.6, p.z); dummy.updateMatrix();
    strings.setMatrixAt(i, dummy.matrix);
  });
  stems.castShadow = true;
  g.add(stems, strings);

  const LEAVES = 11;
  const leafGeo = new THREE.IcosahedronGeometry(0.5, 0);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), plants.length * LEAVES);
  let k = 0;
  for (const p of plants) {
    for (let j = 0; j < LEAVES; j++) {
      const y = 1.55 + rand() * 2.7;
      const a = rand() * Math.PI * 2;
      const rr = 0.25 + rand() * 0.55;
      dummy.position.set(p.x + Math.cos(a) * rr, y, p.z + Math.sin(a) * rr * 0.9);
      dummy.rotation.set(rand() * 0.8 - 0.4, rand() * 6.28, rand() * 0.8 - 0.4);
      const s = 0.75 + rand() * 0.6;
      dummy.scale.set(s * 1.25, s * 0.42, s);
      dummy.updateMatrix();
      leaves.setMatrixAt(k, dummy.matrix);
      col.setHSL(0.26 + rand() * 0.06, 0.5 + rand() * 0.2, 0.26 + rand() * 0.12);
      leaves.setColorAt(k, col);
      k++;
    }
  }
  leaves.castShadow = true;
  g.add(leaves);

  const FR = 3;
  const fruitGeo = new THREE.SphereGeometry(0.3, 10, 8);
  const fruits = new THREE.InstancedMesh(fruitGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.05 }), plants.length * FR);
  const fcols = [0xd8241a, 0xf2c31b, 0xf07a14, 0xd8241a];
  k = 0;
  for (const p of plants) {
    for (let j = 0; j < FR; j++) {
      const a = rand() * Math.PI * 2;
      dummy.position.set(p.x + Math.cos(a) * 0.32, 1.7 + rand() * 1.6, p.z + Math.sin(a) * 0.32);
      dummy.rotation.set(0, rand() * 6, 0);
      dummy.scale.set(1, 1.2, 1);
      dummy.updateMatrix();
      fruits.setMatrixAt(k, dummy.matrix);
      fruits.setColorAt(k, col.setHex(fcols[Math.floor(rand() * fcols.length)]));
      k++;
    }
  }
  fruits.castShadow = true;
  g.add(fruits);
}

function buildHouse(g) {
  const glass = new THREE.MeshStandardMaterial({
    color: 0xeaf6ff, transparent: true, opacity: 0.16, roughness: 0.1, metalness: 0,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const frame = new THREE.MeshLambertMaterial({ color: 0xf2f2ee });
  const WALL_H = 5, RISE = 6;

  // 横の壁
  for (const z of [-14, 14]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(44, WALL_H), glass);
    w.position.set(0, WALL_H / 2, z);
    g.add(w);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(44, 0.12, 0.12), frame);
    rail.position.set(0, WALL_H, z);
    g.add(rail);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(44, 0.3, 0.14), frame);
    sill.position.set(0, 0.15, z);
    g.add(sill);
  }
  // 屋根（アーチ）
  g.add(makeArchRoof(glass, WALL_H, RISE));

  // 骨組み（アーチ）
  const hoopPts = [];
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * Math.PI;
    hoopPts.push(new THREE.Vector3(0, WALL_H + Math.sin(a) * RISE, -Math.cos(a) * 14));
  }
  const hoopCurve = new THREE.CatmullRomCurve3(hoopPts);
  const hoopGeo = new THREE.TubeGeometry(hoopCurve, 24, 0.07, 5, false);
  const postGeo = new THREE.BoxGeometry(0.14, WALL_H, 0.14);
  for (let x = -22; x <= 22; x += 4) {
    const h = new THREE.Mesh(hoopGeo, frame);
    h.position.x = x;
    g.add(h);
    for (const z of [-14, 14]) {
      const p = new THREE.Mesh(postGeo, frame);
      p.position.set(x, WALL_H / 2, z);
      p.castShadow = true;
      g.add(p);
    }
  }
  // 棟の梁
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(44, 0.12, 0.12), frame);
  ridge.position.set(0, WALL_H + RISE, 0);
  g.add(ridge);

  // 妻面（東西の壁）。東側には出入口の穴
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
      // 東の壁を外から見たときの座標：x' = -z
      hole.moveTo(-13, 0.01); hole.lineTo(-9, 0.01); hole.lineTo(-9, 4.6); hole.lineTo(-13, 4.6); hole.lineTo(-13, 0.01);
      s.holes.push(hole);
    }
    const wall = new THREE.Mesh(new THREE.ShapeGeometry(s), glass);
    wall.rotation.y = side === 1 ? Math.PI / 2 : -Math.PI / 2;
    wall.position.x = 22 * side;
    g.add(wall);
  }
  // 出入口の枠
  const doorFrame = new THREE.Group();
  for (const z of [9, 13]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.7, 0.2), frame);
    p.position.set(22, 2.35, z);
    doorFrame.add(p);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 4.2), frame);
  top.position.set(22, 4.7, 11);
  doorFrame.add(top);
  g.add(doorFrame);

  // 換気扇
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.4, 16), new THREE.MeshLambertMaterial({ color: 0x9aa3a8 }));
  fan.rotation.z = Math.PI / 2;
  fan.position.set(-21.85, 3.2, -6);
  g.add(fan);
}

function makeArchRoof(mat, wallH, rise) {
  const segs = 24;
  const pos = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI;
    const y = wallH + Math.sin(a) * rise, z = -Math.cos(a) * 14;
    pos.push(-22, y, z, 22, y, z);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

function buildTables(g) {
  const topMat = new THREE.MeshLambertMaterial({ color: 0xc9a36b });
  const legMat = new THREE.MeshLambertMaterial({ color: 0x8d9499 });
  for (const t of TABLES) {
    const top = new THREE.Mesh(new THREE.BoxGeometry(t.w, 0.14, t.d), topMat);
    top.position.set(t.x, t.top - 0.07, t.z);
    top.castShadow = true; top.receiveShadow = true;
    g.add(top);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, t.top - 0.14, 0.14), legMat);
      leg.position.set(t.x + sx * (t.w / 2 - 0.15), (t.top - 0.14) / 2, t.z + sz * (t.d / 2 - 0.15));
      leg.castShadow = true;
      g.add(leg);
    }
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(t.w - 0.4, 0.05, 0.12), legMat);
    shelf.position.set(t.x, 0.5, t.z - t.d / 2 + 0.15);
    g.add(shelf);
  }
  // 段ボールの山（飾り）
  const box = new THREE.MeshLambertMaterial({ color: 0xb98a55 });
  for (const [x, z, h] of [[20, -12.5, 0], [20, -12.5, 1], [18.6, -12.6, 0], [20.2, -10.8, 0]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1, 1.3), box);
    b.position.set(x, 0.5 + h, z);
    b.castShadow = true; b.receiveShadow = true;
    g.add(b);
  }
}

function buildTruck(g) {
  const white = new THREE.MeshLambertMaterial({ color: 0xf4f4f2 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const glassM = new THREE.MeshLambertMaterial({ color: 0x4b6a80 });
  const t = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.3, 2.6), white);
  cab.position.set(2.6, 1.55, 0);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 2.2), glassM);
  win.position.set(3.52, 2.1, 0);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 2.6), white);
  bed.position.set(0, 1.12, 0);
  t.add(cab, win, bed);
  for (const z of [-1.3, 1.3]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.45, 0.08), white);
    rail.position.set(0, 1.45, z);
    t.add(rail);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 2.6), white);
  tail.position.set(-1.8, 1.45, 0);
  t.add(tail);
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 14);
  wheelGeo.rotateX(Math.PI / 2);
  for (const x of [-1, 2.6]) for (const z of [-1.2, 1.2]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.position.set(x, 0.5, z);
    t.add(w);
  }
  t.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  t.position.set(TRUCK.x, 0, TRUCK.z);
  g.add(t);
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
