// 建物と乗り物：瓦屋根の農家・納屋とトラクター・軽トラ・ビニールハウス・犬吠埼灯台
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- 手続き生成テクスチャ ----------
function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  return t;
}
const noiseDots = (g, w, h, n, colors) => {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[i % colors.length];
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
};

const TEX = {
  // 窯業系サイディング（横張り）
  siding: () => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ece4d2'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      g.fillStyle = 'rgba(120,100,70,.28)'; g.fillRect(0, y, w, 3);
      g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, y + 3, w, 2);
    }
    noiseDots(g, w, h, 1500, ['rgba(150,130,100,.12)', 'rgba(255,255,255,.2)']);
  }),
  // いぶし瓦（桟瓦の波）
  tile: () => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4a5462'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      for (let x = 0; x < w; x += 32) {
        const gr = g.createLinearGradient(x, 0, x + 32, 0);
        gr.addColorStop(0, '#36404c'); gr.addColorStop(0.45, '#6a7686'); gr.addColorStop(0.8, '#4a5462'); gr.addColorStop(1, '#2f3742');
        g.fillStyle = gr; g.fillRect(x, y, 32, 28);
      }
      g.fillStyle = 'rgba(15,20,28,.75)'; g.fillRect(0, y + 28, w, 4);
    }
    noiseDots(g, w, h, 800, ['rgba(255,255,255,.08)', 'rgba(0,0,0,.12)']);
  }),
  // 波板トタン（少し錆びた）
  corrugated: () => canvasTex(256, 256, (g, w, h) => {
    for (let x = 0; x < w; x += 16) {
      const gr = g.createLinearGradient(x, 0, x + 16, 0);
      gr.addColorStop(0, '#7d8288'); gr.addColorStop(0.5, '#b8bdc2'); gr.addColorStop(1, '#6d7278');
      g.fillStyle = gr; g.fillRect(x, 0, 16, h);
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(${140 + Math.random() * 40},${70 + Math.random() * 20},30,${0.15 + Math.random() * 0.25})`;
      const x = Math.random() * w, y = Math.random() * h;
      g.fillRect(x, y, 4 + Math.random() * 10, 10 + Math.random() * 60);
    }
  }),
  // 木の板（縁側・納屋の壁）
  wood: () => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#7a5434'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) {
      g.fillStyle = `hsl(25, 40%, ${26 + Math.random() * 10}%)`; g.fillRect(x + 1, 0, 30, h);
      g.strokeStyle = 'rgba(40,25,12,.35)';
      for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x + 4 + k * 4, 0); g.bezierCurveTo(x + 8 + k * 4, h * 0.3, x + k * 4, h * 0.7, x + 6 + k * 4, h); g.stroke(); }
      g.fillStyle = 'rgba(20,12,6,.6)'; g.fillRect(x, 0, 2, h);
    }
  }),
  // 打ちっぱなしの基礎
  concrete: () => canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#a7a59f'; g.fillRect(0, 0, w, h);
    noiseDots(g, w, h, 1500, ['rgba(80,80,80,.2)', 'rgba(255,255,255,.2)']);
  }),
  // 灯台の白壁（ややくすんだ白）
  whiteWall: () => canvasTex(128, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, h, 0, 0);
    gr.addColorStop(0, '#cfc9bd'); gr.addColorStop(0.2, '#ebe7de'); gr.addColorStop(1, '#f6f3ec');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    noiseDots(g, w, h, 600, ['rgba(120,110,95,.12)']);
  }),
};

const M = {};
function mats() {
  if (M.ready) return M;
  Object.assign(M, {
    ready: true,
    siding: new THREE.MeshStandardMaterial({ map: TEX.siding(), roughness: 0.9 }),
    tile: new THREE.MeshStandardMaterial({ map: TEX.tile(), roughness: 0.6 }),
    tileDark: new THREE.MeshStandardMaterial({ color: '#2f3742', roughness: 0.6 }),
    concrete: new THREE.MeshStandardMaterial({ map: TEX.concrete(), roughness: 1 }),
    wood: new THREE.MeshStandardMaterial({ map: TEX.wood(), roughness: 0.85 }),
    woodDark: new THREE.MeshStandardMaterial({ color: '#4a3020', roughness: 0.8 }),
    alu: new THREE.MeshStandardMaterial({ color: '#c9cdd2', metalness: 0.8, roughness: 0.35 }),
    aluDark: new THREE.MeshStandardMaterial({ color: '#5a5f66', metalness: 0.6, roughness: 0.4 }),
    glass: new THREE.MeshStandardMaterial({ color: '#33475a', emissive: '#ffb75e', emissiveIntensity: 0.2, roughness: 0.1, metalness: 0.3 }),
    shoji: new THREE.MeshStandardMaterial({ color: '#f1ead8', emissive: '#ffcf8a', emissiveIntensity: 0.0, roughness: 0.9 }),
    white: new THREE.MeshStandardMaterial({ color: '#f2f1ec', roughness: 0.6 }),
    black: new THREE.MeshStandardMaterial({ color: '#1b1d20', roughness: 0.5 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#202124', roughness: 0.95 }),
    corrugated: new THREE.MeshStandardMaterial({ map: TEX.corrugated(), roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide }),
    truck: new THREE.MeshStandardMaterial({ color: '#f4f4f1', roughness: 0.35, metalness: 0.2 }),
    tractor: new THREE.MeshStandardMaterial({ color: '#d2322b', roughness: 0.45, metalness: 0.2 }),
    lamp: new THREE.MeshStandardMaterial({ color: '#fff4c8', emissive: '#ffd27a', emissiveIntensity: 1.5 }),
    redLamp: new THREE.MeshStandardMaterial({ color: '#c41e1e', emissive: '#ff3a2a', emissiveIntensity: 0.6 }),
    film: new THREE.MeshStandardMaterial({ color: '#f4f7f4', roughness: 0.3, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }),
    pipe: new THREE.MeshStandardMaterial({ color: '#c3c8cc', metalness: 0.9, roughness: 0.3 }),
    soil: new THREE.MeshStandardMaterial({ color: '#5d4029', roughness: 1 }),
    seedling: new THREE.MeshStandardMaterial({ color: '#6fae46', roughness: 0.8 }),
    lhWhite: new THREE.MeshStandardMaterial({ map: TEX.whiteWall(), roughness: 0.7 }),
    lantern: new THREE.MeshStandardMaterial({ color: '#2b3034', metalness: 0.7, roughness: 0.35 }),
    lensGlass: new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd27a', emissiveIntensity: 2.5, roughness: 0.1, transparent: true, opacity: 0.85 }),
  });
  return M;
}

function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}
function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, parent, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}
function shadowAll(g) {
  g.traverse((o) => { if (o.isMesh) { o.castShadow = !o.material.transparent; o.receiveShadow = true; } });
  return g;
}

// 寄棟屋根（四方に流れる屋根）。UV は瓦の向きに合わせる
function hipRoof(w, d, h, overhang) {
  const W = w / 2 + overhang, D = d / 2 + overhang, r = Math.max(0.01, W - D);
  const P = {
    a: [-W, 0, -D], b: [W, 0, -D], c: [W, 0, D], d: [-W, 0, D],
    e: [-r, h, 0], f: [r, h, 0],
  };
  const pos = [], uv = [];
  const tri = (p, q, s, tq) => {
    for (const [v, t] of [[p, tq[0]], [q, tq[1]], [s, tq[2]]]) { pos.push(...P[v]); uv.push(...t); }
  };
  const S = 0.25; // 瓦テクスチャのスケール
  const slopeD = Math.hypot(D, h), slopeW = Math.hypot(W - r, h);
  // 前後の面（台形）
  tri('d', 'c', 'f', [[0, 0], [2 * W * S, 0], [(W + r) * S, slopeD * S]]);
  tri('d', 'f', 'e', [[0, 0], [(W + r) * S, slopeD * S], [(W - r) * S, slopeD * S]]);
  tri('b', 'a', 'e', [[0, 0], [2 * W * S, 0], [(W + r) * S, slopeD * S]]);
  tri('b', 'e', 'f', [[0, 0], [(W + r) * S, slopeD * S], [(W - r) * S, slopeD * S]]);
  // 左右の面（三角）
  tri('c', 'b', 'f', [[0, 0], [2 * D * S, 0], [D * S, slopeW * S]]);
  tri('a', 'd', 'e', [[0, 0], [2 * D * S, 0], [D * S, slopeW * S]]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return { geo: g, ridge: r, W, D };
}

// アルミサッシの引き違い窓（＋雨戸の戸袋）
function slidingWindow(w, h, opts = {}) {
  const m = mats();
  const g = new THREE.Group();
  const f = 0.06;
  box(w + f * 2, f, 0.12, m.alu, 0, h / 2 + f / 2, 0, g);
  box(w + f * 2, f, 0.16, m.alu, 0, -h / 2 - f / 2, 0.02, g);
  box(f, h, 0.12, m.alu, -w / 2 - f / 2, 0, 0, g);
  box(f, h, 0.12, m.alu, w / 2 + f / 2, 0, 0, g);
  // 障子 2 枚（前後にずらして引き違い）
  for (const [i, dz] of [[-1, 0.02], [1, -0.02]]) {
    const pane = new THREE.Group();
    pane.position.set(i * w / 4, 0, dz);
    box(w / 2, h, 0.03, opts.shoji ? m.shoji : m.glass, 0, 0, 0, pane);
    box(0.035, h, 0.05, m.alu, i * -w / 4 + i * 0.0175, 0, 0, pane);
    if (opts.shoji) for (let k = 1; k < 4; k++) box(w / 2, 0.012, 0.035, m.woodDark, 0, -h / 2 + h * k / 4, 0.002, pane);
    g.add(pane);
  }
  if (opts.shutter) box(w / 2 + 0.1, h + 0.25, 0.2, m.aluDark, (w / 2 + w / 4 + 0.15) * (opts.shutter === 'left' ? -1 : 1), 0.05, 0.05, g);
  return g;
}

// ---------- 母屋：瓦屋根の 2 階建て農家 ----------
export function buildHouse() {
  const m = mats();
  const g = new THREE.Group();
  const W = 10, D = 7.5, H1 = 2.9, H2 = 2.7;
  // 基礎
  const base = box(W + 0.2, 0.5, D + 0.2, m.concrete, 0, 0.25, 0, g);
  base.material = m.concrete;
  // 外壁
  const wallMat = m.siding.clone();
  wallMat.map = m.siding.map.clone(); wallMat.map.repeat.set(W / 2.5, (H1 + H2) / 2.5); wallMat.map.needsUpdate = true;
  box(W, H1 + H2, D, wallMat, 0, 0.5 + (H1 + H2) / 2, 0, g);
  // 1 階と 2 階の間の帯と下屋（げや）の瓦
  const beltY = 0.5 + H1;
  box(W + 0.12, 0.12, D + 0.12, m.woodDark, 0, beltY, 0, g);
  const geya = new THREE.Mesh(new THREE.BoxGeometry(W + 1.0, 0.12, 0.95), m.tile);
  geya.position.set(0, beltY + 0.15, D / 2 + 0.42); geya.rotation.x = 0.32; g.add(geya);
  // 寄棟の大屋根
  const roof = hipRoof(W, D, 2.4, 0.75);
  const tileMat = m.tile.clone(); tileMat.map = m.tile.map;
  const rm = new THREE.Mesh(roof.geo, tileMat);
  rm.position.y = 0.5 + H1 + H2;
  g.add(rm);
  // 棟（むね）と隅棟
  box(roof.ridge * 2 + 0.4, 0.28, 0.32, m.tileDark, 0, rm.position.y + 2.48, 0, g);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const a = new THREE.Vector3(sx * roof.ridge, 2.4, 0), b = new THREE.Vector3(sx * roof.W, 0, sz * roof.D);
      const len = a.distanceTo(b);
      const hip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, len), m.tileDark);
      hip.position.copy(a).add(b).multiplyScalar(0.5); hip.position.y += rm.position.y + 0.08;
      hip.lookAt(new THREE.Vector3(b.x, b.y + rm.position.y + 0.08, b.z));
      g.add(hip);
    }
  }
  // 鬼瓦
  for (const sx of [-1, 1]) cyl(0.25, 0.25, 0.15, m.tileDark, sx * (roof.ridge + 0.25), rm.position.y + 2.55, 0, g, 12).rotation.z = Math.PI / 2;
  // 軒樋
  for (const sz of [-1, 1]) cyl(0.07, 0.07, W + 1.6, m.alu, 0, rm.position.y - 0.05, sz * (roof.D + 0.05), g, 8).rotation.z = Math.PI / 2;
  cyl(0.045, 0.045, H1 + H2 + 0.4, m.alu, W / 2 + 0.25, 0.5 + (H1 + H2) / 2, D / 2 + 0.1, g, 8);
  // テレビアンテナ
  const ant = new THREE.Group();
  ant.position.set(roof.ridge * 0.4, rm.position.y + 2.5, 0);
  cyl(0.03, 0.03, 2.6, m.alu, 0, 1.3, 0, ant, 6);
  for (let i = 0; i < 7; i++) box(0.9 - i * 0.06, 0.02, 0.02, m.alu, 0, 2.2, -0.6 + i * 0.2, ant);
  box(0.02, 0.02, 1.4, m.alu, 0, 2.2, 0, ant);
  g.add(ant);

  // 正面（+z）：玄関・窓
  const front = D / 2 + 0.01;
  // 玄関：引き戸と庇
  const ent = new THREE.Group();
  ent.position.set(-2.8, 0.5, front);
  box(2.0, 2.3, 0.1, m.aluDark, 0, 1.15, 0, ent);
  for (const dx of [-0.5, 0.5]) {
    const door = new THREE.Group(); door.position.set(dx, 1.12, 0.06);
    box(0.95, 2.15, 0.04, m.glass, 0, 0, 0, door);
    for (let k = 1; k < 6; k++) box(0.95, 0.025, 0.05, m.aluDark, 0, -1.07 + k * 0.36, 0.01, door);
    box(0.03, 2.15, 0.05, m.aluDark, 0, 0, 0.01, door);
    ent.add(door);
  }
  const hisashi = box(2.8, 0.1, 1.0, m.aluDark, 0, 2.6, 0.45, ent); hisashi.rotation.x = 0.15;
  box(2.6, 0.18, 1.6, m.concrete, 0, -0.41, 0.8, ent);
  box(1.2, 0.16, 0.6, m.concrete, 0, -0.55, 1.9, ent);
  // 表札と照明
  box(0.12, 0.35, 0.03, m.wood, 1.2, 1.5, 0.02, ent);
  box(0.18, 0.18, 0.12, m.lamp, -1.25, 2.0, 0.06, ent);
  g.add(ent);
  // 1 階の窓（和室：障子）
  const w1 = slidingWindow(2.2, 1.8, { shoji: true, shutter: 'right' }); w1.position.set(1.0, 0.5 + 1.35, front + 0.05); g.add(w1);
  const w2 = slidingWindow(1.4, 1.0, { shutter: 'left' }); w2.position.set(3.9, 0.5 + 1.6, front + 0.05); g.add(w2);
  // 2 階：ベランダと窓
  for (const x of [-2.6, 2.0]) { const w = slidingWindow(1.8, 1.7, { shutter: x < 0 ? 'left' : 'right' }); w.position.set(x, beltY + 1.35, front + 0.05); g.add(w); }
  const bal = new THREE.Group();
  bal.position.set(2.0, beltY + 0.35, front + 0.65);
  box(3.4, 0.1, 1.2, m.aluDark, 0, 0, 0, bal);
  for (let i = 0; i <= 17; i++) box(0.03, 0.9, 0.03, m.alu, -1.7 + i * 0.2, 0.5, 0.58, bal);
  box(3.4, 0.05, 0.06, m.alu, 0, 0.95, 0.58, bal);
  for (const dx of [-1.7, 1.7]) box(0.05, 0.05, 1.2, m.alu, dx, 0.95, 0, bal);
  // 物干し竿と洗濯物
  cyl(0.02, 0.02, 3.2, m.alu, 0, 1.35, 0.2, bal, 6).rotation.z = Math.PI / 2;
  [['#3b6fb6', -1.0], ['#f2f2f2', -0.4], ['#d9534f', 0.3], ['#f2d36b', 0.9]].forEach(([c, x]) => {
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.6, 1, 4), new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.9 }));
    cloth.position.set(x, 1.05, 0.2); bal.add(cloth);
  });
  g.add(bal);
  // 側面の窓
  for (const sx of [-1, 1]) for (const [y, z] of [[1.9, -1.5], [beltY + 1.3, 1.2]]) {
    const w = slidingWindow(1.2, 1.0); w.rotation.y = sx * Math.PI / 2;
    w.position.set(sx * (W / 2 + 0.05), y, z); g.add(w);
  }
  // 背面
  const wb = slidingWindow(1.6, 1.1); wb.rotation.y = Math.PI; wb.position.set(0, 0.5 + 1.6, -front - 0.05); g.add(wb);

  // 縁側（右側の平屋部分）
  const eng = new THREE.Group();
  eng.position.set(W / 2, 0, 0);
  const wing = new THREE.Group();
  box(4, 2.9, 6, wallMat, 2, 0.5 + 1.45, -0.4, wing);
  box(4.2, 0.5, 6.2, m.concrete, 2, 0.25, -0.4, wing);
  const lean = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.14, 7.4), m.tile);
  lean.position.set(2.2, 0.5 + 2.9 + 0.55, -0.4); lean.rotation.z = -0.28; wing.add(lean);
  const deck = box(3.8, 0.12, 1.1, m.wood, 2, 0.85, 3.2, wing);
  deck.material = m.wood;
  for (const x of [0.3, 2, 3.7]) box(0.12, 0.85, 0.12, m.woodDark, x, 0.42, 3.65, wing);
  const ws = slidingWindow(3.2, 1.9, { shoji: true }); ws.position.set(2, 0.5 + 1.25, 2.62); wing.add(ws);
  eng.add(wing);
  g.add(eng);

  // エアコンの室外機
  const ac = new THREE.Group();
  ac.position.set(-W / 2 - 0.45, 0.85, 1.4); ac.rotation.y = -Math.PI / 2;
  box(0.8, 0.6, 0.3, m.white, 0, 0, 0, ac);
  const fan = cyl(0.22, 0.22, 0.02, m.black, -0.12, 0, 0.16, ac, 20); fan.rotation.x = Math.PI / 2;
  for (let k = -4; k <= 4; k++) box(0.46, 0.012, 0.01, m.aluDark, -0.12, k * 0.05, 0.175, ac);
  cyl(0.025, 0.025, 1.6, m.white, 0.3, 0.8, -0.05, ac, 6);
  g.add(ac);
  // プロパンガス
  for (const z of [-2.2, -1.6]) { cyl(0.18, 0.18, 1.3, m.white, -W / 2 - 0.35, 1.15, z, g, 14); cyl(0.12, 0.12, 0.1, m.aluDark, -W / 2 - 0.35, 1.85, z, g, 10); }
  // 植木鉢
  for (const x of [-4.4, -1.4]) { cyl(0.22, 0.16, 0.35, m.woodDark, x, 0.68, front + 0.6, g, 10); const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), m.seedling); b.position.set(x, 1.05, front + 0.6); g.add(b); }

  g.userData.windowMat = m.glass;
  g.userData.shojiMat = m.shoji;
  return shadowAll(g);
}

// ---------- 軽トラ ----------
export function buildKeiTruck() {
  const m = mats();
  const g = new THREE.Group();
  // シャシー
  box(1.45, 0.18, 3.35, m.black, 0, 0.42, 0, g);
  // キャビン（キャブオーバー）
  const cab = new THREE.Group(); cab.position.set(0, 0.5, 1.1); g.add(cab);
  box(1.46, 0.75, 1.2, m.truck, 0, 0.42, 0, cab);
  const top = box(1.4, 0.62, 1.05, m.truck, 0, 1.1, -0.05, cab);
  top.scale.set(1, 1, 1);
  const ws = box(1.28, 0.55, 0.04, m.glass, 0, 1.1, 0.5, cab); ws.rotation.x = -0.12;
  for (const sx of [-1, 1]) {
    box(0.04, 0.48, 0.8, m.glass, sx * 0.71, 1.1, -0.05, cab);
    box(0.06, 0.15, 0.1, m.black, sx * 0.8, 1.0, 0.45, cab); // ミラー
    box(0.22, 0.14, 0.04, m.lamp, sx * 0.5, 0.5, 0.61, cab); // ヘッドライト
    box(0.04, 0.02, 0.2, m.aluDark, sx * 0.74, 0.65, -0.15, cab); // ドアノブ
  }
  box(0.9, 0.18, 0.04, m.black, 0, 0.28, 0.61, cab); // グリル
  box(0.35, 0.1, 0.02, m.white, 0, 0.12, 0.62, cab); // ナンバー
  // 荷台
  const bed = new THREE.Group(); bed.position.set(0, 0.62, -0.7); g.add(bed);
  box(1.45, 0.06, 1.95, m.truck, 0, 0, 0, bed);
  for (const sx of [-1, 1]) box(0.05, 0.3, 1.95, m.truck, sx * 0.71, 0.18, 0, bed);
  box(1.45, 0.3, 0.05, m.truck, 0, 0.18, -0.97, bed);
  box(1.45, 0.7, 0.06, m.aluDark, 0, 0.4, 0.98, bed); // 鳥居（キャブガード）
  for (let k = 0; k < 6; k++) box(1.35, 0.02, 0.02, m.alu, 0, 0.12 + k * 0.12, 1.0, bed);
  for (const sx of [-1, 1]) box(0.16, 0.1, 0.03, m.redLamp, sx * 0.6, 0.0, -0.99, bed);
  // 荷台のコンテナとキャベツ
  for (const [x, z] of [[-0.35, -0.4], [0.35, -0.4], [-0.35, 0.3]]) {
    box(0.6, 0.32, 0.45, new THREE.MeshStandardMaterial({ color: '#2f6fb5', roughness: 0.7 }), x, 0.19, z, bed);
    for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), m.seedling); c.position.set(x - 0.15 + (i % 2) * 0.3, 0.42, z - 0.1 + Math.floor(i / 2) * 0.2); bed.add(c); }
  }
  // タイヤ
  for (const [x, z] of [[-0.62, 1.05], [0.62, 1.05], [-0.62, -1.1], [0.62, -1.1]]) {
    const w = cyl(0.27, 0.27, 0.18, m.rubber, x, 0.27, z, g, 18); w.rotation.z = Math.PI / 2;
    const hub = cyl(0.14, 0.14, 0.19, m.alu, x, 0.27, z, g, 12); hub.rotation.z = Math.PI / 2;
  }
  return shadowAll(g);
}

// ---------- 納屋とトラクター ----------
export function buildBarn() {
  const m = mats();
  const g = new THREE.Group();
  const W = 8, D = 6, H = 3.4;
  box(W + 0.2, 0.2, D + 0.2, m.concrete, 0, 0.1, 0, g);
  const wall = m.corrugated;
  // 背面と側面（前面は開口）
  box(W, H, 0.06, wall, 0, H / 2 + 0.2, -D / 2, g);
  for (const sx of [-1, 1]) box(0.06, H, D, wall, sx * W / 2, H / 2 + 0.2, 0, g);
  // 柱と梁
  for (const x of [-W / 2, -W / 6, W / 6, W / 2]) box(0.16, H, 0.16, m.woodDark, x, H / 2 + 0.2, D / 2, g);
  box(W, 0.2, 0.2, m.woodDark, 0, H + 0.2, D / 2, g);
  // 切妻の波板屋根
  const roofMat = m.corrugated.clone(); roofMat.map = m.corrugated.map.clone(); roofMat.map.repeat.set(4, 1); roofMat.map.needsUpdate = true;
  for (const s of [-1, 1]) {
    const half = D / 2 / Math.cos(0.32) + 0.5;
    const r = box(W + 0.8, 0.05, half, roofMat, 0, H + 0.2 + 0.55, s * (D / 4 + 0.1), g);
    r.rotation.x = s * 0.32;
  }
  // 破風の三角壁
  for (const sz of [-1, 1]) {
    const shp = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, 1.1)]);
    const tri = new THREE.Mesh(new THREE.ShapeGeometry(shp), m.wood);
    tri.position.set(0, H + 0.2, sz * D / 2); g.add(tri);
  }
  // 中の資材
  for (let i = 0; i < 5; i++) box(1.1, 0.3, 0.7, new THREE.MeshStandardMaterial({ color: i % 2 ? '#d9c38a' : '#c4ad74', roughness: 1 }), -W / 2 + 1, 0.35 + i * 0.3, -D / 2 + 0.8, g);
  const tr = buildTractor();
  tr.position.set(1.2, 0.2, 0.2); tr.rotation.y = 0.1;
  g.add(tr);
  return shadowAll(g);
}

function buildTractor() {
  const m = mats();
  const g = new THREE.Group();
  box(0.8, 0.6, 1.6, m.tractor, 0, 0.85, 0.4, g); // ボンネット
  box(0.9, 0.12, 0.9, m.black, 0, 0.75, -0.6, g); // フロア
  box(0.45, 0.12, 0.4, m.black, 0, 1.15, -0.75, g); // シート
  box(0.45, 0.4, 0.08, m.black, 0, 1.35, -0.95, g);
  const st = cyl(0.18, 0.18, 0.03, m.black, 0, 1.45, -0.25, g, 16); st.rotation.x = -0.9;
  cyl(0.06, 0.06, 0.5, m.black, 0.25, 1.35, 1.05, g, 8); // 排気管
  box(0.6, 0.15, 0.06, m.lamp, 0, 0.95, 1.21, g);
  for (const sx of [-1, 1]) {
    const rw = cyl(0.55, 0.55, 0.32, m.rubber, sx * 0.62, 0.55, -0.6, g, 22); rw.rotation.z = Math.PI / 2;
    const rh = cyl(0.3, 0.3, 0.33, m.tractor, sx * 0.62, 0.55, -0.6, g, 14); rh.rotation.z = Math.PI / 2;
    const fw = cyl(0.3, 0.3, 0.2, m.rubber, sx * 0.5, 0.3, 0.95, g, 18); fw.rotation.z = Math.PI / 2;
    const fender = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.36, 18, 1, true, -Math.PI / 2, Math.PI), m.tractor);
    fender.rotation.z = Math.PI / 2; fender.position.set(sx * 0.62, 0.55, -0.6); g.add(fender);
  }
  return g;
}

// ---------- ビニールハウス ----------
export function buildGreenhouse() {
  const m = mats();
  const g = new THREE.Group();
  const L = 18, R = 3.2, H0 = 1.2;
  // フィルム（側面の直立部＋アーチ）
  const arch = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 28, 1, true, -Math.PI / 2, Math.PI), m.film);
  arch.position.y = H0;
  arch.rotation.x = -Math.PI / 2;
  g.add(arch);
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(L, H0), m.film);
    side.rotation.y = Math.PI / 2; side.position.set(sx * R, H0 / 2, 0); g.add(side);
  }
  // 妻面（両端）
  for (const sz of [-1, 1]) {
    const shp = new THREE.Shape();
    shp.moveTo(-R, 0); shp.lineTo(-R, H0); shp.absarc(0, H0, R, Math.PI, 0, true); shp.lineTo(R, 0); shp.lineTo(-R, 0);
    const end = new THREE.Mesh(new THREE.ShapeGeometry(shp, 24), m.film);
    end.position.z = sz * L / 2; g.add(end);
    // 出入口の扉枠
    const df = new THREE.Group(); df.position.z = sz * (L / 2 + 0.02);
    box(0.05, 2.0, 0.05, m.pipe, -0.6, 1.0, 0, df); box(0.05, 2.0, 0.05, m.pipe, 0.6, 1.0, 0, df); box(1.25, 0.05, 0.05, m.pipe, 0, 2.0, 0, df);
    g.add(df);
  }
  // アーチパイプ・直管・妻面の縦柱
  const pipes = [];
  for (let z = -L / 2; z <= L / 2 + 0.01; z += 1.0) {
    const a = new THREE.TorusGeometry(R + 0.02, 0.024, 6, 28, Math.PI);
    a.translate(0, H0, z);
    pipes.push(a);
    for (const sx of [-1, 1]) { const p = new THREE.CylinderGeometry(0.024, 0.024, H0, 6); p.translate(sx * (R + 0.02), H0 / 2, z); pipes.push(p); }
  }
  for (const ang of [0.35, 1.0, Math.PI / 2, Math.PI - 1.0, Math.PI - 0.35]) {
    const p = new THREE.CylinderGeometry(0.022, 0.022, L, 6);
    p.rotateX(Math.PI / 2);
    p.translate(Math.cos(ang) * (R + 0.03), H0 + Math.sin(ang) * (R + 0.03), 0);
    pipes.push(p);
  }
  // 巻き上げ換気の押さえパイプ
  for (const sx of [-1, 1]) { const p = new THREE.CylinderGeometry(0.03, 0.03, L, 6); p.rotateX(Math.PI / 2); p.translate(sx * (R + 0.04), H0, 0); pipes.push(p); }
  g.add(new THREE.Mesh(mergeGeometries(pipes.map((p) => p.toNonIndexed())), m.pipe));
  // 中：畝と苗
  for (const x of [-1.6, 0, 1.6]) {
    box(0.9, 0.25, L - 1.5, m.soil, x, 0.12, 0, g);
    const sd = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.14, 1), m.seedling, 40);
    const mm = new THREE.Matrix4();
    for (let i = 0; i < 40; i++) { mm.makeTranslation(x + (i % 2 ? 0.2 : -0.2), 0.32, -L / 2 + 1 + i * 0.4); sd.setMatrixAt(i, mm); }
    g.add(sd);
  }
  return shadowAll(g);
}

// ---------- 犬吠埼灯台 ----------
export function buildLighthouse() {
  const m = mats();
  const g = new THREE.Group();
  const TH = 27;
  // 白い円筒の塔（わずかに先細り）
  const lhMat = m.lhWhite.clone(); lhMat.map = m.lhWhite.map.clone(); lhMat.map.repeat.set(4, 1); lhMat.map.needsUpdate = true;
  cyl(2.2, 3.2, TH, lhMat, 0, TH / 2, 0, g, 40);
  // 基壇
  cyl(3.8, 4.0, 0.8, m.concrete, 0, 0.4, 0, g, 40);
  // 入口
  const door = new THREE.Group(); door.position.set(0, 0.8, 3.15); door.rotation.x = -0.035;
  box(1.2, 2.2, 0.3, lhMat, 0, 1.1, 0, door);
  box(0.9, 1.9, 0.1, m.woodDark, 0, 1.0, 0.12, door);
  const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 16, 1, false, -Math.PI / 2, Math.PI), lhMat);
  arch.rotation.x = Math.PI / 2; arch.rotation.z = Math.PI / 2; arch.position.set(0, 2.2, 0); door.add(arch);
  g.add(door);
  // 縦に並ぶ小窓
  for (let i = 0; i < 4; i++) {
    const y = 6 + i * 5.2, r = 3.2 - (y / TH) * 1.0;
    const w = box(0.45, 0.9, 0.15, m.black, 0, y, r + 0.02, g);
    box(0.6, 0.12, 0.25, lhMat, 0, y - 0.5, r + 0.05, g);
    w.rotation.x = -0.035;
  }
  // 回廊（ギャラリー）と手すり
  cyl(3.1, 2.6, 0.5, lhMat, 0, TH + 0.2, 0, g, 40);
  const rail = [];
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2;
    const p = new THREE.CylinderGeometry(0.03, 0.03, 1.1, 5); p.translate(Math.cos(a) * 3.0, TH + 1.0, Math.sin(a) * 3.0); rail.push(p);
  }
  for (const y of [TH + 1.5, TH + 1.0]) { const t = new THREE.TorusGeometry(3.0, 0.04, 6, 64); t.rotateX(Math.PI / 2); t.translate(0, y, 0); rail.push(t.toNonIndexed()); }
  g.add(new THREE.Mesh(mergeGeometries(rail.map((p) => (p.index ? p.toNonIndexed() : p))), m.lantern));
  // 灯室：台座・ガラス・格子
  cyl(1.7, 1.8, 1.1, m.lantern, 0, TH + 1.0, 0, g, 24);
  cyl(1.55, 1.55, 2.4, m.lensGlass, 0, TH + 2.75, 0, g, 24);
  const bars = [];
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const p = new THREE.BoxGeometry(0.07, 2.4, 0.07); p.translate(Math.cos(a) * 1.58, TH + 2.75, Math.sin(a) * 1.58); bars.push(p); }
  for (const y of [TH + 1.6, TH + 2.75, TH + 3.9]) { const t = new THREE.TorusGeometry(1.58, 0.045, 6, 32); t.rotateX(Math.PI / 2); t.translate(0, y, 0); bars.push(t.toNonIndexed()); }
  g.add(new THREE.Mesh(mergeGeometries(bars.map((p) => (p.index ? p.toNonIndexed() : p))), m.lantern));
  // ドーム・換気球・避雷針・風見
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.75, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.lantern);
  dome.position.y = TH + 3.95; g.add(dome);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), m.lantern); ball.position.y = TH + 5.85; g.add(ball);
  cyl(0.03, 0.03, 1.6, m.lantern, 0, TH + 6.7, 0, g, 6);
  box(0.6, 0.25, 0.02, m.lantern, 0.3, TH + 6.9, 0, g);
  // 付属舎（霧笛舎風の平屋）
  const an = new THREE.Group(); an.position.set(7.5, 0, -1);
  box(7, 3.4, 5, lhMat, 0, 1.7, 0, an);
  box(7.4, 0.3, 5.4, m.lantern, 0, 3.5, 0, an);
  for (const x of [-2, 0, 2]) { const w = slidingWindow(1.0, 1.2); w.position.set(x, 1.9, 2.52); an.add(w); }
  box(1.0, 2.2, 0.1, m.woodDark, -3.0, 1.1, 2.52, an);
  g.add(an);
  // 柵
  const fence = [];
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; if (Math.abs(a - Math.PI / 2) < 0.3) continue; const p = new THREE.BoxGeometry(0.08, 1.0, 0.08); p.translate(Math.cos(a) * 6, 0.5, Math.sin(a) * 6); fence.push(p); }
  g.add(new THREE.Mesh(mergeGeometries(fence), m.white));

  // 回転する光のビーム
  const beamGeo = new THREE.ConeGeometry(7, 140, 24, 1, true);
  beamGeo.translate(0, -70, 0);
  beamGeo.rotateZ(Math.PI / 2);
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uStrength: { value: 0.4 } },
    vertexShader: 'varying float vL; void main(){ vL = clamp(position.x/140.,0.,1.); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uStrength; varying float vL; void main(){ float a=pow(1.-vL,2.2)*uStrength; gl_FragColor=vec4(vec3(1.,.9,.65)*a,a); }',
  });
  const beam = new THREE.Group();
  const b1 = new THREE.Mesh(beamGeo, beamMat), b2 = new THREE.Mesh(beamGeo, beamMat);
  b2.rotation.y = Math.PI;
  beam.add(b1, b2);
  beam.position.y = TH + 2.75;
  g.add(beam);
  shadowAll(g);
  g.userData.beam = beam; g.userData.beamMat = beamMat;
  return g;
}
