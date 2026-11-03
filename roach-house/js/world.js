// パプリカハウスの間取りと見た目（夜明けの温室）
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { rand, randRange, inRect } from './util.js';
import * as TX from './textures.js';
import { paprikaVariants, paprikaStem, paprikaMaterial, paprikaStemMaterial, PAPRIKA_COLORS } from './paprika.js';

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
// カメラからゴキブリまでの距離（これより手前の葉だけを透かす）
const fadeUniform = { value: 2.0 };
export function setNearFade(d) { fadeUniform.value = Math.max(0.6, d); }
// 株の素材に「そよぎ」と「カメラに近い所を細かく抜いて透かす」を足す
function patchPlantMat(mat, amount = 0, fade = true) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windUniform;
    sh.uniforms.uFade = fadeUniform;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vNearDist;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float sw = sin(uTime * 1.5 + ip.x * 0.7 + ip.z * 0.5) * 0.6 + sin(uTime * 3.3 + ip.x * 2.3 + ip.y) * 0.25;
          transformed.y += sw * ${amount.toFixed(3)} * max(position.x, 0.0);
          transformed.z += sw * ${(amount * 0.5).toFixed(3)} * max(position.x, 0.0);
        #endif`)
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vNearDist = -mvPosition.z;');
    if (fade) {
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vNearDist;\nuniform float uFade;')
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          float nf = smoothstep(uFade * 0.72, uFade * 0.92, vNearDist);
          float hh = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
          if (hh > nf) discard;`);
    }
  };
  mat.customProgramCacheKey = () => `plant${amount}${fade}`;
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
  buildPlants(g, q);
  buildHouse(g);
  buildTables(g);
  buildProps(g);
  buildTruck(g);
  buildOutside(g);
  const shafts = q.shafts ? buildShafts(g) : null;
  const dust = buildDust(g, q.dust);
  const wind = buildWindLanes(g);
  buildVents(g);

  // 夜（ステージ6）：月明かりと作業灯だけ
  const lamps = [];
  for (const [x, z] of [[20.2, 9.2], [13, 2.4]]) {
    const L = new THREE.PointLight(0xffc27a, 0, 14, 1.6);
    L.position.set(x, 5.6, z);
    g.add(L);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe0a8 }));
    bulb.position.copy(L.position);
    bulb.visible = false;
    g.add(bulb);
    lamps.push({ L, bulb });
  }
  const day = { bg: scene.background, fogColor: scene.fog.color.clone(), fogDensity: scene.fog.density, env: scene.environmentIntensity, hemi: hemi.intensity, sun: sun.intensity, sunColor: sun.color.clone(), bounce: bounce.intensity };
  let isNight = false;
  return {
    group: g, sun,
    setNearFade,
    get night() { return isNight; },
    setNight(on) {
      if (on === isNight) return;
      isNight = on;
      sky.visible = !on;
      scene.background = on ? new THREE.Color(0x070b16) : day.bg;
      scene.fog.color.copy(on ? new THREE.Color(0x0a0e18) : day.fogColor);
      scene.environmentIntensity = on ? 0.12 : day.env;
      hemi.intensity = on ? 0.18 : day.hemi;
      sun.intensity = on ? 0.55 : day.sun;
      sun.color.copy(on ? new THREE.Color(0x8fa6ff) : day.sunColor);
      bounce.intensity = on ? 0 : day.bounce;
      if (shafts) shafts.forEach((m) => { m.visible = !on; });
      if (dust) dust.pts.visible = !on;
      for (const l of lamps) { l.L.intensity = on ? 30 : 0; l.bulb.visible = on; }
    },
    setShadow(size) {
      if (sun.shadow.mapSize.x === size) return;
      sun.shadow.mapSize.set(size, size);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    },
    update(t, cam) {
      windUniform.value = t;
      if (shafts) shafts.forEach((s, i) => { s.material.opacity = s.userData.base * (0.75 + 0.25 * Math.sin(t * 0.4 + i * 1.7)); });
      if (dust) dust.update(t, cam);
      wind.update(t);
    },
  };
}

// ---------- 床・さいばい槽・暖房パイプ ----------
// 本物のパプリカハウス：白い防草シートの床、腰の高さの白いさいばい槽（下はすき間）、
// 通路には温水の暖房パイプ。作業場はコンクリート
export const TROUGH = { top: 1.4, bottom: 0.9, w: 1.1 };
// 歩ける高い面：作業台（0〜2）と、さいばい槽の上（3〜7）
export const TROUGH_TOP = 1.48;
export const SURFACES = [
  ...TABLES,
  ...ROWS.map((r) => ({ x: (r.x0 + r.x1) / 2, z: r.z, top: TROUGH_TOP, trough: true, minX: r.x0 - 0.2, maxX: r.x1 + 0.2, minZ: r.z - 0.55, maxZ: r.z + 0.55 })),
];
// 株になっている実（かじると落ちる）
export const PLANT_FRUITS = [];
// 新しいゲームの始めに、落ちた実を株に戻す
export function resetPlantFruits() {
  const touched = new Set();
  for (const f of PLANT_FRUITS) {
    f.hp = 25;
    if (f.alive) continue;
    f.alive = true;
    f.mesh.setMatrixAt(f.idx, f.m0);
    if (f.stemMesh && f.sm0) f.stemMesh.setMatrixAt(f.stemIdx, f.sm0);
    touched.add(f.mesh); if (f.stemMesh) touched.add(f.stemMesh);
  }
  for (const m of touched) m.instanceMatrix.needsUpdate = true;
}
export function dropPlantFruit(f) {
  const m = new THREE.Matrix4().makeScale(0, 0, 0);
  f.alive = false;
  f.mesh.setMatrixAt(f.idx, m);
  f.mesh.instanceMatrix.needsUpdate = true;
  if (f.stemMesh) { f.stemMesh.setMatrixAt(f.stemIdx, m); f.stemMesh.instanceMatrix.needsUpdate = true; }
}
// 循環扇の風の道（入口の渦に入って「風に乗る」→ 出口まで飛ぶ）
export const WIND_LANES = [
  { x0: -15, x1: 3.6, z: -2.5 },
  { x0: -7, x1: 8.6, z: 2.5 },
  { x0: -15, x1: 3.6, z: 7.5 },
];
// けむり玉の煙から逃げられる場所（出入り口と、西の壁の換気口）
export const SAFE_SPOTS = [
  { x: 21.1, z: 11, r: 1.7, label: '出入り口' },
  { x: -21.1, z: -2.5, r: 1.3, label: '換気口' },
  { x: -21.1, z: 7.5, r: 1.3, label: '換気口' },
];
export const EAVE = 6.5;
const SPAN_RISE = 1.9;
// 4連棟。谷（柱の列）は z = -7, 0, 7。株の列の中には柱を立てない
const SPANS = [-10.5, -3.5, 3.5, 10.5];
const SPAN_HALF = 3.5;
const GUTTERS = [-7, 0, 7];

function buildGround(g) {
  const GS = TX.groundSheet();
  GS.map.repeat.set(9, 10); GS.normal.repeat.set(9, 10);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 28), new THREE.MeshStandardMaterial({
    map: GS.map, normalMap: GS.normal, roughness: 0.85, normalScale: new THREE.Vector2(0.4, 0.4),
  }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(-9, 0, 0);
  floor.receiveShadow = true;
  g.add(floor);

  const C = TX.concrete();
  C.map.repeat.set(3, 5); C.normal.repeat.set(3, 5);
  const conc = new THREE.Mesh(new THREE.PlaneGeometry(18, 28), new THREE.MeshStandardMaterial({
    map: C.map, normalMap: C.normal, roughness: 0.82, normalScale: new THREE.Vector2(0.5, 0.5),
  }));
  conc.rotation.x = -Math.PI / 2;
  conc.position.set(13, 0.006, 0);
  conc.receiveShadow = true;
  g.add(conc);
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshStandardMaterial({ color: 0x3a3229, roughness: 0.04, transparent: true, opacity: 0.3, depthWrite: false }));
  puddle.rotation.x = -Math.PI / 2;
  puddle.scale.set(1.3, 0.8, 1);
  puddle.position.set(5.2, 0.013, 2.5);
  g.add(puddle);

  // さいばい槽（白い発泡の箱を脚で持ち上げる。上に培地と点滴チューブ）
  const F = TX.foam();
  F.map.repeat.set(12, 1); F.normal.repeat.set(12, 1);
  const foamMat = new THREE.MeshStandardMaterial({ map: F.map, normalMap: F.normal, roughness: 0.8 });
  const slabMat = new THREE.MeshStandardMaterial({ color: 0xe9e6dc, roughness: 0.55 });
  const tubeMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.3 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x5b6066, metalness: 0.7, roughness: 0.45 });
  const legGeo = new THREE.CylinderGeometry(0.035, 0.035, TROUGH.bottom, 6);
  const legPos = [];
  for (const r of ROWS) {
    const len = r.x1 - r.x0 + 0.6, cx = (r.x0 + r.x1) / 2;
    const h = TROUGH.top - TROUGH.bottom;
    const box = new THREE.Mesh(new THREE.BoxGeometry(len, h, TROUGH.w), foamMat);
    box.position.set(cx, TROUGH.bottom + h / 2, r.z);
    box.castShadow = true; box.receiveShadow = true;
    g.add(box);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(len - 0.2, 0.08, TROUGH.w - 0.3), slabMat);
    slab.position.set(cx, TROUGH.top + 0.04, r.z);
    slab.receiveShadow = true;
    g.add(slab);
    for (const dz of [-0.3, 0.3]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 6), tubeMat);
      tube.rotation.z = Math.PI / 2;
      tube.position.set(cx, TROUGH.top + 0.1, r.z + dz);
      g.add(tube);
    }
    for (let x = r.x0 - 0.1; x <= r.x1 + 0.2; x += 1.8) for (const dz of [-0.45, 0.45]) legPos.push([x, r.z + dz]);
  }
  const legs = new THREE.InstancedMesh(legGeo, legMat, legPos.length);
  const d = new THREE.Object3D();
  legPos.forEach(([x, z], i) => { d.position.set(x, TROUGH.bottom / 2, z); d.updateMatrix(); legs.setMatrixAt(i, d.matrix); });
  legs.castShadow = true;
  g.add(legs);

  // 暖房パイプ（通路の床ぎわに2本ずつ）
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0xd7dadc, metalness: 0.9, roughness: 0.3 });
  const aisles = [-12.6, -7.5, -2.5, 2.5, 7.5, 12.6];
  for (const z of aisles) for (const dz of [-0.4, 0.4]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 21.6, 10), pipeMat);
    p.rotation.z = Math.PI / 2;
    p.position.set(-7.5, 0.16, z + dz);
    p.castShadow = true;
    g.add(p);
  }
}

function leafGeometry() {
  const geo = new THREE.PlaneGeometry(1, 0.5, 5, 2);
  geo.translate(0.5, 0, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const wf = Math.pow(Math.sin(Math.PI * Math.pow(x, 0.75)), 0.9) * (x < 0.06 ? x / 0.06 : 1);
    const ny = y * wf;
    p.setXYZ(i, x, ny, -Math.abs(ny) * 0.45 - x * x * 0.3);
  }
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

// ---------- パプリカの株（人の背より高く、葉が壁のように茂る） ----------
function buildPlants(g, q) {
  const dense = q.plants || 1;
  const stems = [];
  for (const r of ROWS) {
    for (const side of [-1, 1]) {
      for (let x = r.x0 + 0.3; x <= r.x1 - 0.2; x += 0.65 / dense) {
        // V字仕立て：株ごとに2本の茎を、それぞれのひもに沿わせて外側へ少し傾ける
        for (const k of [-1, 1]) {
          const bx = x + k * 0.1 + randRange(-0.05, 0.05), bz = r.z + side * 0.3;
          const top = new THREE.Vector3(bx + k * 0.15, randRange(5.6, 6.1), bz + side * randRange(0.25, 0.55));
          stems.push({ base: new THREE.Vector3(bx, TROUGH.top + 0.05, bz), top, side });
        }
      }
    }
  }
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  const up = new THREE.Vector3(0, 1, 0);
  const stemGeo = new THREE.CylinderGeometry(0.016, 0.03, 1, 5);
  stemGeo.translate(0, 0.5, 0);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x35571c, roughness: 0.7 });
  patchPlantMat(stemMat, 0);
  const stemMesh = new THREE.InstancedMesh(stemGeo, stemMat, stems.length);
  const strGeo = new THREE.CylinderGeometry(0.011, 0.011, 1, 3);
  strGeo.translate(0, 0.5, 0);
  const strMat = new THREE.MeshBasicMaterial({ color: 0xf2efe4 });
  patchPlantMat(strMat, 0);
  const strMesh = new THREE.InstancedMesh(strGeo, strMat, stems.length);
  const place = (mesh, i, a, b, r = 1) => {
    const dir = b.clone().sub(a);
    dummy.position.copy(a);
    dummy.quaternion.setFromUnitVectors(up, dir.clone().normalize());
    dummy.scale.set(r, dir.length(), r);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  };
  stems.forEach((s, i) => {
    place(stemMesh, i, s.base, s.top);
    place(strMesh, i, s.base.clone().add(new THREE.Vector3(0.03, 0, 0)), new THREE.Vector3(s.top.x + 0.03, 6.3, s.top.z));
  });
  stemMesh.castShadow = true;
  g.add(stemMesh, strMesh);

  // 葉
  const L = TX.leaf();
  const leafMat = new THREE.MeshStandardMaterial({ map: L.map, normalMap: L.normal, side: THREE.DoubleSide, roughness: 0.55, color: 0xffffff });
  patchPlantMat(leafMat, 0.05);
  const PER = q.leaves || 14;
  const leaves = new THREE.InstancedMesh(leafGeometry(), leafMat, stems.length * PER);
  let k = 0;
  for (const s of stems) {
    for (let j = 0; j < PER; j++) {
      const t = 0.04 + (j / PER) * 0.98;
      const pos = s.base.clone().lerp(s.top, t);
      dummy.position.copy(pos);
      dummy.quaternion.identity();
      dummy.position.x += randRange(-0.12, 0.12);
      dummy.position.z += randRange(-0.12, 0.12);
      dummy.rotation.set(0, j * 2.39 + rand() * 1.2, 0);
      dummy.rotateZ(randRange(-0.45, 0.75));
      dummy.rotateX(randRange(-0.5, 0.5));
      const sc = randRange(0.5, 0.85) * (1.05 - t * 0.3);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      leaves.setMatrixAt(k, dummy.matrix);
      col.setHSL(0.26 + rand() * 0.05, 0.48 + rand() * 0.2, 0.26 + rand() * 0.16);
      leaves.setColorAt(k, col);
      k++;
    }
  }
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  g.add(leaves);

  // 実：茎の下〜中ほどにぶら下がる。多くはまだ緑で、ところどころ赤・橙・黄
  const fruitList = [];
  for (const s of stems) {
    const n = rand() < 0.55 ? 1 : rand() < 0.5 ? 2 : 0;
    for (let j = 0; j < n; j++) {
      const t = randRange(0.04, 0.5);
      const pos = s.base.clone().lerp(s.top, t);
      const a = rand() * Math.PI * 2;
      fruitList.push({ x: pos.x + Math.cos(a) * 0.2, y: pos.y - 0.22, z: pos.z + Math.sin(a) * 0.2, v: Math.floor(rand() * 4) });
    }
  }
  const PC = PAPRIKA_COLORS;
  const palette = [PC.green, PC.green, PC.green, PC.green, PC.red, PC.red, PC.orange, PC.yellow, PC.turning, PC.yellow];
  const variants = paprikaVariants(20);
  const fruitMat = paprikaMaterial();
  patchPlantMat(fruitMat, 0);
  const pStemGeo = paprikaStem();
  const fStems = new THREE.InstancedMesh(pStemGeo, paprikaStemMaterial(), fruitList.length);
  let fi = 0;
  variants.forEach((geo, vi) => {
    const list = fruitList.filter((f) => f.v === vi);
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geo, fruitMat, list.length);
    list.forEach((f, i) => {
      const s = randRange(0.19, 0.25);
      dummy.position.set(f.x, f.y, f.z);
      dummy.quaternion.identity();
      dummy.rotation.set(randRange(-0.2, 0.2), rand() * 6.28, randRange(-0.2, 0.2));
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      const m0 = dummy.matrix.clone();
      const hex = palette[Math.floor(rand() * palette.length)];
      im.setColorAt(i, col.setHex(hex));
      PLANT_FRUITS.push({ x: f.x, y: f.y, z: f.z, s, mesh: im, idx: i, stemMesh: fStems, stemIdx: fi, hex, geo, alive: true, hp: 25, m0 });
      dummy.translateY(geo.userData.stemOffset * s);
      dummy.updateMatrix();
      PLANT_FRUITS[PLANT_FRUITS.length - 1].sm0 = dummy.matrix.clone();
      fStems.setMatrixAt(fi++, dummy.matrix);
    });
    im.castShadow = true;
    im.receiveShadow = true;
    g.add(im);
  });
  fStems.count = fi;
  for (const f of PLANT_FRUITS) if (f.stemMesh === undefined) f.stemMesh = fStems;
  fStems.castShadow = true;
  g.add(fStems);

  // 誘引ワイヤーと、葉の上に並ぶ黄色・青の粘着シート
  const wireMat = new THREE.MeshStandardMaterial({ color: 0xaab0b5, metalness: 0.8, roughness: 0.4 });
  const cards = { y: [], b: [] };
  for (const r of ROWS) {
    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, r.x1 - r.x0 + 1, 4), wireMat);
      w.rotation.z = Math.PI / 2;
      w.position.set((r.x0 + r.x1) / 2, 6.3, r.z + side * 0.5);
      g.add(w);
    }
    let n = 0;
    for (let x = r.x0 + 0.8; x < r.x1; x += 1.6) cards[n++ % 3 === 2 ? 'b' : 'y'].push([x + randRange(-0.2, 0.2), randRange(5.5, 6.0), r.z + randRange(-0.15, 0.15), randRange(-0.5, 0.5)]);
  }
  const cardGeo = new THREE.PlaneGeometry(0.4, 0.62);
  for (const [key, tx] of [['y', TX.stickyCard()], ['b', TX.stickyCardBlue()]]) {
    const im = new THREE.InstancedMesh(cardGeo, new THREE.MeshStandardMaterial({ map: tx, side: THREE.DoubleSide, roughness: 0.4 }), cards[key].length);
    cards[key].forEach(([x, y, z, ry], i) => { dummy.position.set(x, y, z); dummy.quaternion.identity(); dummy.rotation.set(0, ry, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    im.castShadow = true;
    g.add(im);
  }
}

// ---------- 連棟ハウス（白い鉄骨のトラス・カーテン・循環扇） ----------
function buildHouse(g) {
  const film = new THREE.MeshPhysicalMaterial({
    color: 0xf4fbff, transparent: true, opacity: 0.1, roughness: 0.08, metalness: 0,
    side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.4, alphaMap: TX.condensation(),
  });
  film.alphaMap.repeat.set(10, 3);
  const steel = new THREE.MeshStandardMaterial({ color: 0xeef0f0, metalness: 0.55, roughness: 0.35 });

  // 横の壁と、巻き上げ換気
  for (const z of [-14, 14]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(44, EAVE), film);
    w.position.set(0, EAVE / 2, z);
    g.add(w);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 44, 12), new THREE.MeshStandardMaterial({ color: 0xe8f0f0, roughness: 0.3, transparent: true, opacity: 0.85 }));
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 1.8, z * 0.995);
    roll.castShadow = true;
    g.add(roll);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(44, 0.35, 0.18), new THREE.MeshStandardMaterial({ color: 0x8a8f94, roughness: 0.8 }));
    sill.position.set(0, 0.17, z);
    g.add(sill);
  }
  // 3連のアーチ屋根
  for (const zc of SPANS) g.add(makeArchRoof(film, zc, SPAN_HALF));

  // 柱（外壁と、棟と棟の間の谷）
  const colGeo = new THREE.BoxGeometry(0.14, EAVE, 0.14);
  const colZ = [-14, ...GUTTERS, 14];
  const colPos = [];
  for (let x = -22; x <= 22; x += 4) for (const z of colZ) if (!rowAt(x, z, 0.8) && tableAt(x, z, 0.4) < 0) colPos.push([x, z]);
  const cols = new THREE.InstancedMesh(colGeo, steel, colPos.length);
  const d = new THREE.Object3D();
  colPos.forEach(([x, z], i) => { d.position.set(x, EAVE / 2, z); d.quaternion.identity(); d.scale.setScalar(1); d.updateMatrix(); cols.setMatrixAt(i, d.matrix); });
  cols.castShadow = true;
  g.add(cols);
  // 谷の雨どい
  for (const z of GUTTERS) {
    const gut = new THREE.Mesh(new THREE.BoxGeometry(44, 0.22, 0.36), steel);
    gut.position.set(0, EAVE + 0.05, z);
    gut.castShadow = true;
    g.add(gut);
  }
  // トラス（上下の弦材と、ジグザグの斜材）＋アーチの骨
  const chord = new THREE.BoxGeometry(0.08, 0.08, 28);
  const webs = [];
  const arches = [];
  for (let x = -22; x <= 22; x += 4) {
    for (const y of [EAVE, EAVE - 0.7]) {
      const c = new THREE.Mesh(chord, steel);
      c.position.set(x, y, 0);
      c.castShadow = true;
      g.add(c);
    }
    for (let z = -14; z < 14 - 0.01; z += 0.7) webs.push([x, z]);
    for (const zc of SPANS) arches.push([x, zc]);
  }
  const webGeo = new THREE.BoxGeometry(0.04, 0.99, 0.04);
  const webMesh = new THREE.InstancedMesh(webGeo, steel, webs.length);
  webs.forEach(([x, z], i) => {
    d.position.set(x, EAVE - 0.35, z + 0.35);
    d.quaternion.identity();
    d.rotation.set((Math.round((z + 14) / 0.7) % 2 ? 1 : -1) * 0.785, 0, 0);
    d.scale.setScalar(1);
    d.updateMatrix();
    webMesh.setMatrixAt(i, d.matrix);
  });
  g.add(webMesh);
  const hoopPts = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI;
    hoopPts.push(new THREE.Vector3(0, EAVE + Math.sin(a) * SPAN_RISE, -Math.cos(a) * SPAN_HALF));
  }
  const hoopGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hoopPts), 24, 0.05, 5, false);
  const hoops = new THREE.InstancedMesh(hoopGeo, steel, arches.length * 2);
  let hi = 0;
  for (const [x, zc] of arches) for (const dx of [0, 2]) { d.position.set(x + dx, 0, zc); d.rotation.set(0, 0, 0); d.updateMatrix(); if (x + dx <= 22) hoops.setMatrixAt(hi++, d.matrix); }
  hoops.count = hi;
  hoops.castShadow = true;
  g.add(hoops);
  // 棟と母屋（長手方向の細い材）
  for (const zc of SPANS) for (const [dz, dy] of [[0, SPAN_RISE], [-1.8, SPAN_RISE * 0.86], [1.8, SPAN_RISE * 0.86]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 44, 6), steel);
    p.rotation.z = Math.PI / 2;
    p.position.set(0, EAVE + dy, zc + dz);
    g.add(p);
  }
  // 保温カーテン（たたまれた白い布が梁にそって並ぶ）
  const curtainMat = new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.9, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
  for (const zc of SPANS) for (const dz of [-1.4, 1.4]) {
    const cu = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 44, 10), curtainMat);
    cu.rotation.z = Math.PI / 2;
    cu.scale.set(1, 1, 0.55);
    cu.position.set(0, EAVE - 0.05, zc + dz);
    cu.castShadow = true;
    g.add(cu);
  }
  // 循環扇（梁からつり下げ）
  for (const [x, z] of [[-16.2, -2.5], [-8.2, 2.5], [-16.2, 7.5], [2, -7.5], [-6, -12.5], [10, -2.5]]) {
    const f = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 24), new THREE.MeshStandardMaterial({ color: 0xdfe3e6, metalness: 0.5, roughness: 0.4 }));
    ring.rotation.y = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0x9aa3a8, metalness: 0.6, roughness: 0.4 }));
    hub.rotation.z = Math.PI / 2;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 4), steel);
    rod.position.y = 0.6;
    f.add(ring, hub, rod);
    f.position.set(x, EAVE - 1.3, z);
    f.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.add(f);
  }

  // 妻面（東西の壁）。3つのアーチ形。東側には出入口
  for (const side of [-1, 1]) {
    const s = new THREE.Shape();
    s.moveTo(-14, 0); s.lineTo(14, 0); s.lineTo(14, EAVE);
    for (const zc of SPANS) {
      for (let i = 1; i <= 16; i++) {
        const a = (i / 16) * Math.PI;
        s.lineTo(-zc + Math.cos(a) * SPAN_HALF, EAVE + Math.sin(a) * SPAN_RISE);
      }
    }
    s.lineTo(-14, 0);
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
  // 換気扇（西の壁）
  const fanG = new THREE.Group();
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.45, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x9aa3a8, metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide }));
  housing.rotation.z = Math.PI / 2;
  fanG.add(housing);
  const grill = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.03, 6, 24), steel);
  grill.rotation.y = Math.PI / 2;
  fanG.add(grill);
  fanG.position.set(-21.85, 3.6, -2.4);
  g.add(fanG);
}

function makeArchRoof(mat, zc, half) {
  const segs = 20;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI;
    const y = EAVE + Math.sin(a) * SPAN_RISE, z = zc - Math.cos(a) * half;
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
  const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ color: 0x1f3a22, roughness: 1, flatShading: true }), 140);
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
      list.push(m);
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
    pts,
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

// 風の道：入口に渦、道に沿って流れる風の筋
function buildWindLanes(g) {
  const swirlMat = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const streakMat = new THREE.MeshBasicMaterial({ map: TX.softBeam(), color: 0xd8f1ff, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const swirls = [], streaks = [];
  for (const L of WIND_LANES) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 32), swirlMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(L.x0, 0.03, L.z);
    g.add(ring);
    for (let k = 0; k < 3; k++) {
      const sp = new THREE.Mesh(new THREE.TorusGeometry(0.35 + k * 0.12, 0.012, 4, 24, Math.PI * 1.3), swirlMat);
      sp.rotation.x = Math.PI / 2;
      sp.position.set(L.x0, 0.3 + k * 0.45, L.z);
      sp.userData.k = k;
      g.add(sp);
      swirls.push(sp);
    }
    for (let k = 0; k < 4; k++) {
      const st = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.25), streakMat);
      st.rotation.set(0, 0, Math.PI / 2);
      st.rotateY(Math.PI / 2);
      st.userData = { L, off: k / 4, y: 2.8 + (k % 2) * 0.6 };
      g.add(st);
      streaks.push(st);
    }
  }
  return {
    update(t) {
      for (const sp of swirls) sp.rotation.z = t * (2.5 + sp.userData.k);
      for (const st of streaks) {
        const { L, off, y } = st.userData;
        const k = (t * 0.25 + off) % 1;
        st.position.set(L.x0 + (L.x1 - L.x0) * k, y + Math.sin(t + off * 6) * 0.15, L.z);
        st.material.opacity = 0.22;
      }
    },
  };
}

// 西の壁の換気口（けむり玉のときの逃げ場）
function buildVents(g) {
  const frame = new THREE.MeshStandardMaterial({ color: 0x8c949a, metalness: 0.6, roughness: 0.4 });
  const slat = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.6 });
  for (const s of SAFE_SPOTS) {
    if (s.x > 0) continue;
    const v = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 1.2), frame);
    v.add(box);
    for (let i = 0; i < 4; i++) {
      const sl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 1.05), slat);
      sl.position.y = -0.24 + i * 0.16;
      sl.rotation.z = 0.5;
      v.add(sl);
    }
    v.position.set(-21.95, 0.4, s.z);
    g.add(v);
  }
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
