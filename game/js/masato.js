// 主人公マサト：実在の人物らしい頭身・顔のパーツ・毛束のマッシュヘア・指のある手・細部まで作ったギター
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lerp, vnoise } from './util.js';

const M = {
  skin: new THREE.MeshStandardMaterial({ color: '#d29a74', roughness: 0.6 }),
  skinShade: new THREE.MeshStandardMaterial({ color: '#c98a68', roughness: 0.7 }),
  lip: new THREE.MeshStandardMaterial({ color: '#b86a5e', roughness: 0.5 }),
  mouth: new THREE.MeshStandardMaterial({ color: '#3d1714', roughness: 0.8 }),
  teeth: new THREE.MeshStandardMaterial({ color: '#f4efe4', roughness: 0.3 }),
  toothLine: new THREE.MeshStandardMaterial({ color: '#d9cfc0', roughness: 0.5 }),
  eyeWhite: new THREE.MeshStandardMaterial({ color: '#f3efe9', roughness: 0.2 }),
  iris: new THREE.MeshStandardMaterial({ color: '#4a2e1a', roughness: 0.2 }),
  pupil: new THREE.MeshStandardMaterial({ color: '#0d0907', roughness: 0.2 }),
  catch: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1 }),
  lash: new THREE.MeshStandardMaterial({ color: '#2a1a12', roughness: 0.6 }),
  brow: new THREE.MeshStandardMaterial({ color: '#4a3220', roughness: 0.8 }),
  hair: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }),
  hairCap: new THREE.MeshStandardMaterial({ color: '#b98d4c', roughness: 0.6 }),
  shirt: new THREE.MeshStandardMaterial({ color: '#1d1d21', roughness: 0.95 }),
  shirtRib: new THREE.MeshStandardMaterial({ color: '#141417', roughness: 0.95 }),
  sleeve: new THREE.MeshStandardMaterial({ color: '#1d1d21', roughness: 0.95, side: THREE.DoubleSide }),
  jeans: new THREE.MeshStandardMaterial({ color: '#34476a', roughness: 0.9 }),
  jeansDark: new THREE.MeshStandardMaterial({ color: '#253350', roughness: 0.9 }),
  belt: new THREE.MeshStandardMaterial({ color: '#3a2618', roughness: 0.6 }),
  buckle: new THREE.MeshStandardMaterial({ color: '#c9b07a', metalness: 0.9, roughness: 0.3 }),
  sole: new THREE.MeshStandardMaterial({ color: '#efece6', roughness: 0.8 }),
  shoe: new THREE.MeshStandardMaterial({ color: '#2a3140', roughness: 0.7 }),
  strap: new THREE.MeshStandardMaterial({ color: '#a38b66', roughness: 0.85 }),
  guitar: new THREE.MeshPhysicalMaterial({ color: '#b51f2c', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 }),
  guard: new THREE.MeshStandardMaterial({ color: '#f1ede4', roughness: 0.4 }),
  neck: new THREE.MeshStandardMaterial({ color: '#c08a4e', roughness: 0.5 }),
  board: new THREE.MeshStandardMaterial({ color: '#3a2216', roughness: 0.6 }),
  metal: new THREE.MeshStandardMaterial({ color: '#d7d9dc', metalness: 1, roughness: 0.25 }),
  black: new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.4 }),
  qglow: new THREE.MeshStandardMaterial({ color: '#8ff6ff', emissive: '#40e8ff', emissiveIntensity: 3 }),
};

M.skin.userData.soft = true;
M.skinShade.userData.soft = true;

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  if (parent) parent.add(m);
  return m;
}
function cap(r, len, mat, parent, x, y, z, seg = 12) {
  return mesh(new THREE.CapsuleGeometry(r, len, 6, seg), mat, parent, x, y, z);
}

// ---------- 頭部：単位球を人の頭の形に彫る ----------
const HEAD_S = V(0.106, 0.124, 0.114);
function sculpt(n) {
  const b = (c, s, a) => a * Math.exp(-n.distanceToSquared(c) / (s * s));
  let r = 1;
  for (const sx of [-1, 1]) {
    r += b(V(sx * 0.6, -0.08, 0.76), 0.26, 0.07);    // 頬骨
    r += b(V(sx * 0.48, -0.36, 0.78), 0.26, 0.05);   // 笑って持ち上がった頬
    r -= b(V(sx * 0.33, 0.1, 0.93), 0.17, 0.05);     // 眼窩のくぼみ
    r += b(V(sx * 0.35, 0.3, 0.9), 0.18, 0.04);      // 眉弓
    r += b(V(sx * 0.66, -0.6, 0.4), 0.3, 0.06);      // しっかりしたえら
    r -= b(V(sx * 0.93, 0.22, 0.1), 0.25, 0.03);     // こめかみ
  }
  r += b(V(0, -0.12, 0.99), 0.2, 0.045);  // 鼻の付け根の高まり
  r += b(V(0, -0.82, 0.55), 0.28, 0.06);  // あご先
  r -= b(V(0, -0.55, 0.85), 0.14, 0.015); // 下唇の下のくぼみ
  r += b(V(0, 0.55, -0.6), 0.6, 0.05);    // 後頭部のふくらみ
  const p = n.clone().multiplyScalar(r);
  if (n.y < 0) { const k = Math.pow(-n.y, 1.5); p.x *= 1 - 0.15 * k; p.z *= 1 - 0.06 * k; }
  if (n.z > 0) p.z *= 1 - 0.1 * n.z * n.z;
  return p.multiply(HEAD_S);
}
function buildHeadGeo() {
  const g = new THREE.SphereGeometry(1, 80, 60);
  const p = g.attributes.position, n = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    n.fromBufferAttribute(p, i).normalize();
    const q = sculpt(n);
    p.setXYZ(i, q.x, q.y, q.z);
  }
  g.computeVertexNormals();
  return g;
}

// 顔の陰影を手描きしたテクスチャ（球の UV に合わせて描く）
function faceTexture() {
  const W = 1024, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  // 単位方向ベクトル → キャンバス座標
  const at = (x, y, z) => {
    const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l;
    let phi = Math.atan2(z, -x); if (phi < 0) phi += Math.PI * 2;
    return [phi / (Math.PI * 2) * W, Math.acos(y) / Math.PI * H];
  };
  const blob = (x, y, z, rx, ry, color) => {
    const [cx, cy] = at(x, y, z);
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 1);
    gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.translate(cx, cy); g.scale(rx * W / 6.283, ry * H / 3.1416);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore();
  };
  const stroke = (pts, w, color) => {
    g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath();
    pts.forEach((p, i) => { const [x, y] = at(...p); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
  };
  g.fillStyle = '#d29a74'; g.fillRect(0, 0, W, H);
  // 日焼けした肌のムラ
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${150 + Math.random() * 60},${90 + Math.random() * 40},60,0.05)`; g.fillRect(Math.random() * W, Math.random() * H, 3, 3); }
  blob(0, 0.35, 0.94, 0.5, 0.25, 'rgba(240,195,160,.55)');      // 額のハイライト
  blob(0, -0.05, 1, 0.12, 0.3, 'rgba(245,200,165,.55)');        // 鼻筋のハイライト
  for (const sx of [-1, 1]) {
    blob(sx * 0.5, -0.3, 0.8, 0.32, 0.22, 'rgba(214,120,96,.45)'); // 頬の赤み
    blob(sx * 0.33, 0.12, 0.93, 0.2, 0.13, 'rgba(120,70,50,.45)'); // 目のまわりの影
    blob(sx * 0.85, -0.3, 0.4, 0.35, 0.5, 'rgba(150,95,70,.35)');  // 横顔の陰
    // ほうれい線（笑顔で深くなる）
    stroke([[sx * 0.2, -0.2, 0.97], [sx * 0.29, -0.33, 0.92], [sx * 0.33, -0.46, 0.87], [sx * 0.31, -0.55, 0.83]], 3, 'rgba(110,70,55,.28)');
    // 目尻の笑いじわ
    for (const k of [0, 1]) stroke([[sx * 0.52, 0.08 - k * 0.07, 0.83], [sx * 0.6, 0.06 - k * 0.1, 0.78]], 2, 'rgba(130,75,55,.4)');
  }
  // あごと口まわりのうっすらした髭
  for (let i = 0; i < 1600; i++) {
    const t = Math.random(), a = (Math.random() - 0.5) * 1.3;
    const y = -0.42 - t * 0.5, x = Math.sin(a) * (0.55 - t * 0.2), z = Math.cos(a);
    const [px, py] = at(x, y, z);
    g.fillStyle = 'rgba(70,55,45,.13)'; g.fillRect(px, py, 1.6, 1.6);
  }
  blob(0, -0.85, 0.5, 0.45, 0.25, 'rgba(140,90,68,.4)'); // あご下の陰
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// 生え際（前は眉の上、横は耳の上、後ろは襟足）
const hairline = (nz) => (nz > 0 ? lerp(-0.08, 0.52, Math.pow(nz, 1.6)) : lerp(-0.08, -0.62, -nz));

function buildHair() {
  // 地肌を隠す土台
  const base = new THREE.SphereGeometry(1, 56, 40).toNonIndexed();
  const bp = base.attributes.position, keep = [];
  const n = new THREE.Vector3();
  for (let i = 0; i < bp.count; i += 3) {
    let ok = true;
    for (let k = 0; k < 3; k++) { n.fromBufferAttribute(bp, i + k).normalize(); if (n.y < hairline(n.z) - 0.04) ok = false; }
    if (!ok) continue;
    for (let k = 0; k < 3; k++) {
      n.fromBufferAttribute(bp, i + k).normalize();
      const q = sculpt(n).multiplyScalar(1.05);
      keep.push(q.x, q.y, q.z);
    }
  }
  const capGeo = new THREE.BufferGeometry();
  capGeo.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
  capGeo.computeVertexNormals();

  // 毛束：つむじから生え際へ頭の丸みに沿って流し、毛先はマッシュらしく内側へ
  const strands = [];
  const root = new THREE.Color('#6e4c26'), tip = new THREE.Color('#e8c886'), mid = new THREE.Color('#c99a55');
  const crown = V(0, 1, -0.25).normalize();
  const N = 150;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + vnoise(i * 0.7, 3) * 0.05;
    const layer = i % 3;
    const dir = V(Math.sin(a), 0, Math.cos(a));
    const endY = hairline(dir.z) - 0.06 - layer * 0.03 + vnoise(i * 1.3, 7) * 0.03;
    const end = V(dir.x * Math.sqrt(1 - endY * endY), endY, dir.z * Math.sqrt(1 - endY * endY)).normalize();
    const pts = [];
    const S = 9;
    for (let s = 0; s <= S; s++) {
      const t = s / S;
      const d = crown.clone().lerp(end, t).normalize();
      // 下へいくほど膨らみ、毛先で少し内に入る
      const front = Math.max(0, dir.z);
      const puff = 1.06 + layer * 0.01 + Math.sin(t * Math.PI * 0.9) * 0.05 * (1 - 0.7 * front) + (t > 0.85 ? -(t - 0.85) * (0.25 + 0.3 * front) : 0);
      pts.push(sculpt(d).multiplyScalar(puff));
    }
    // 前髪は眉にかかるよう少し垂らす
    if (dir.z > 0.3) { const last = pts[pts.length - 1].clone(); last.y -= 0.012 * dir.z; last.z += 0.004; pts.push(last); }
    const curve = new THREE.CatmullRomCurve3(pts);
    const rad = 0.0075 + (i % 5) * 0.0012;
    const tg = new THREE.TubeGeometry(curve, 14, rad, 5, false);
    const uv = tg.attributes.uv, c = new Float32Array(uv.count * 3), col = new THREE.Color();
    const pp = tg.attributes.position;
    for (let k = 0; k < uv.count; k++) {
      const u = uv.getX(k);
      col.copy(root).lerp(mid, Math.min(1, u * 2.2)).lerp(tip, Math.max(0, u - 0.45) / 0.55);
      if (layer === 2) col.multiplyScalar(0.9);
      c.set([col.r, col.g, col.b], k * 3);
      // 毛先を細く
      const taper = u > 0.8 ? 1 - (u - 0.8) * 3 : 1;
      if (taper < 1) {
        const ci = Math.min(Math.round(u * 14), 14);
        const center = curve.getPoint(ci / 14);
        const v = new THREE.Vector3().fromBufferAttribute(pp, k).sub(center).multiplyScalar(Math.max(0.3, taper)).add(center);
        pp.setXYZ(k, v.x, v.y, v.z);
      }
    }
    tg.setAttribute('color', new THREE.BufferAttribute(c, 3));
    tg.deleteAttribute('uv');
    strands.push(tg);
  }
  const strandGeo = mergeGeometries(strands);
  strandGeo.computeVertexNormals();
  return { capGeo, strandGeo };
}

function bendOnFace(geo, k) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - p.getX(i) * p.getX(i) * k);
  geo.computeVertexNormals();
  return geo;
}

function buildHead(head) {
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTexture(), roughness: 0.6 });
  faceMat.userData.soft = true;
  const skull = mesh(buildHeadGeo(), faceMat, head);
  // 顔の表面に貼り付けるためのレイキャスト
  skull.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const surf = (x, y) => {
    ray.set(V(x, y, 1), V(0, 0, -1));
    const h = ray.intersectObject(skull, false)[0];
    return h ? h.point.z : 0.1;
  };
  const stick = (obj, x, y, off = 0) => { obj.position.set(x, y, surf(x, y) + off); head.add(obj); return obj; };

  // 首
  cap(0.056, 0.07, M.skin, head, 0, -0.13, -0.014);

  // 目：開いた笑い目。黒目・瞳孔・キャッチライト・まつ毛のライン・二重の線
  for (const sx of [-1, 1]) {
    const ex = sx * 0.037, ey = 0.011;
    const eye = new THREE.Group();
    stick(eye, ex, ey, -0.0115);
    eye.rotation.y = sx * 0.12;
    mesh(new THREE.SphereGeometry(0.0155, 24, 16), M.eyeWhite, eye);
    const iris = mesh(new THREE.SphereGeometry(0.0078, 18, 12), M.iris, eye, -sx * 0.0012, -0.0005, 0.0128);
    iris.scale.set(1, 1, 0.42);
    mesh(new THREE.SphereGeometry(0.0038, 12, 8), M.pupil, eye, -sx * 0.0012, -0.0005, 0.0152).scale.set(1, 1, 0.3);
    mesh(new THREE.SphereGeometry(0.0016, 8, 6), M.catch, eye, -sx * 0.0012 + 0.0025, 0.0028, 0.0158);
    const LID = 0.0172, UA = Math.PI * 0.36, UR = 0.1;
    const upper = mesh(new THREE.SphereGeometry(LID, 24, 12, 0, Math.PI * 2, 0, UA), M.skin, eye);
    upper.rotation.x = UR;
    // まつ毛のライン（上まぶたの縁）
    const lash = mesh(new THREE.TorusGeometry(LID * Math.sin(UA), 0.0011, 5, 32), M.lash, eye);
    lash.rotation.x = Math.PI / 2 + UR;
    lash.position.set(0, LID * Math.cos(UA) * Math.cos(UR), LID * Math.cos(UA) * Math.sin(UR));
    // 二重の線
    const crease = mesh(new THREE.TorusGeometry(LID * Math.sin(UA * 0.8) * 1.04, 0.0006, 4, 32, Math.PI), M.skinShade, eye);
    crease.rotation.x = Math.PI / 2 + UR + 0.2 - Math.PI / 2 + Math.PI / 2;
    crease.position.set(0, LID * Math.cos(UA * 0.8) * 1.02, 0.002);
    const lower = mesh(new THREE.SphereGeometry(0.0168, 24, 10, 0, Math.PI * 2, Math.PI * 0.68, Math.PI * 0.32), M.skin, eye);
    lower.rotation.x = -0.12;
    // 眉：くっきりした濃いめの直線眉
    const brow = new THREE.Mesh(bendOnFace(new THREE.BoxGeometry(0.046, 0.0085, 0.006, 10, 1, 1), 2.5), M.brow);
    const bp = brow.geometry.attributes.position;
    for (let i = 0; i < bp.count; i++) { const x = bp.getX(i) * sx; bp.setY(i, bp.getY(i) * (1.1 - (x + 0.023) / 0.046 * 0.45) + (x > 0.01 ? -(x - 0.01) * 0.25 : 0)); }
    brow.rotation.z = sx * -0.05;
    stick(brow, sx * 0.041, 0.04, 0.0025);
  }

  // 鼻：通った鼻筋・丸い鼻先・小鼻・鼻の穴
  const nose = new THREE.Group();
  stick(nose, 0, -0.02, -0.007);
  mesh(new THREE.SphereGeometry(0.0145, 18, 14), M.skin, nose, 0, -0.006, 0.0135).scale.set(1.05, 0.9, 1);
  const bridge = cap(0.0078, 0.034, M.skin, nose, 0, 0.018, 0.006);
  bridge.rotation.x = -0.32;
  for (const sx of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.0095, 14, 10), M.skin, nose, sx * 0.0145, -0.012, 0.0055);
    const hole = mesh(new THREE.SphereGeometry(0.0038, 10, 8), M.mouth, nose, sx * 0.0072, -0.0195, 0.0115);
    hole.scale.set(1.35, 0.55, 1);
  }

  // 口：口角を上げ、上の歯を見せる自信のある笑顔
  // 各頂点を顔の表面に沿わせる（唇まわりの凹凸に埋もれないように）
  const conform = (geo, cx, cy, off) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + cx, y = p.getY(i) + cy;
      p.setXYZ(i, x, y, surf(x, y) + off);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const smileShape = (w, cornerY, top, bottom) => {
    const s = new THREE.Shape();
    s.moveTo(-w, cornerY);
    s.bezierCurveTo(-w * 0.5, top, w * 0.5, top, w, cornerY);
    s.bezierCurveTo(w * 0.55, -bottom, -w * 0.55, -bottom, -w, cornerY);
    return s;
  };
  const MY = -0.058;
  mesh(conform(new THREE.ShapeGeometry(smileShape(0.051, 0.012, 0.009, 0.03), 28), 0, MY, 0.0012), M.lip, head);
  mesh(conform(new THREE.ShapeGeometry(smileShape(0.046, 0.011, 0.005, 0.024), 28), 0, MY, 0.0021), M.mouth, head);
  const teeth = new THREE.Shape();
  teeth.moveTo(-0.04, 0.0105);
  teeth.bezierCurveTo(-0.02, 0.0062, 0.02, 0.0062, 0.04, 0.0105);
  teeth.bezierCurveTo(0.026, -0.0075, -0.026, -0.0075, -0.04, 0.0105);
  mesh(conform(new THREE.ShapeGeometry(teeth, 24), 0, MY, 0.0029), M.teeth, head);
  // 歯の境目をうっすら
  for (let i = -2; i <= 2; i++) {
    const x = i * 0.0115;
    mesh(conform(new THREE.PlaneGeometry(0.0006, 0.007), x, MY + 0.002, 0.0031), M.toothLine, head);
  }

  // 耳
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(sx * 0.104, -0.005, -0.008);
    ear.rotation.y = sx * 0.35;
    mesh(new THREE.SphereGeometry(0.026, 16, 12), M.skin, ear).scale.set(0.35, 1.25, 0.85);
    mesh(new THREE.SphereGeometry(0.016, 12, 10), M.skinShade, ear, sx * 0.004, 0.002, 0.002).scale.set(0.3, 1.2, 0.7);
    head.add(ear);
  }

  // 髪
  const { capGeo, strandGeo } = buildHair();
  mesh(capGeo, M.hairCap, head);
  mesh(strandGeo, M.hair, head).userData.noOutline = true;
}

// ---------- 手：手のひら＋4本の指＋親指 ----------
function buildHand(side, curl = 0.6) {
  const h = new THREE.Group();
  mesh(new THREE.SphereGeometry(1, 16, 12), M.skin, h, 0, -0.035, 0).scale.set(0.038, 0.045, 0.02);
  for (let f = 0; f < 4; f++) {
    const fg = new THREE.Group();
    fg.position.set((f - 1.5) * 0.017, -0.075, 0.002);
    fg.rotation.x = curl * (0.7 + f * 0.08);
    cap(0.0082 - f * 0.0005, 0.034 - Math.abs(f - 1.3) * 0.005, M.skin, fg, 0, -0.018, 0, 6);
    h.add(fg);
  }
  const th = new THREE.Group();
  th.position.set(side * 0.03, -0.03, 0.012);
  th.rotation.set(0.5, 0, side * 0.7);
  cap(0.0095, 0.03, M.skin, th, 0, -0.016, 0, 6);
  h.add(th);
  return h;
}

// ---------- ギター（ダブルカッタウェイ） ----------
function buildGuitar() {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(0, -0.24);
  s.bezierCurveTo(0.22, -0.24, 0.26, -0.05, 0.17, 0.04);
  s.bezierCurveTo(0.24, 0.12, 0.2, 0.26, 0.12, 0.27);
  s.bezierCurveTo(0.08, 0.2, 0.05, 0.15, 0.0, 0.15);
  s.bezierCurveTo(-0.05, 0.15, -0.08, 0.22, -0.11, 0.3);
  s.bezierCurveTo(-0.2, 0.28, -0.24, 0.12, -0.17, 0.04);
  s.bezierCurveTo(-0.26, -0.05, -0.22, -0.24, 0, -0.24);
  mesh(new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.01, bevelSegments: 4, curveSegments: 32 }), M.guitar, g, 0, 0, -0.03);
  // ピックガード
  const pg = new THREE.Shape();
  pg.moveTo(-0.05, 0.13); pg.bezierCurveTo(0.08, 0.14, 0.16, 0.0, 0.12, -0.12); pg.bezierCurveTo(0.06, -0.18, -0.02, -0.12, -0.04, -0.04); pg.lineTo(-0.05, 0.13);
  mesh(new THREE.ShapeGeometry(pg, 16), M.guard, g, 0, 0, 0.0185);
  // ネック・指板・フレット・ポジションマーク
  mesh(new THREE.BoxGeometry(0.052, 0.64, 0.024), M.neck, g, 0, 0.47, 0.0);
  mesh(new THREE.BoxGeometry(0.05, 0.6, 0.006), M.board, g, 0, 0.47, 0.015);
  for (let f = 0; f < 18; f++) {
    const y = 0.77 - 0.6 * (1 - Math.pow(2, -f / 12)) * 1.45;
    mesh(new THREE.BoxGeometry(0.05, 0.0025, 0.004), M.metal, g, 0, y, 0.019);
    if ([3, 5, 7, 9, 12, 15, 17].includes(f)) mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.002, 8).rotateX(Math.PI / 2), M.guard, g, 0, y + 0.012, 0.019);
  }
  mesh(new THREE.BoxGeometry(0.05, 0.006, 0.008), M.guard, g, 0, 0.775, 0.017);
  // ヘッドとペグ
  const head = new THREE.Group(); head.position.y = 0.86; head.rotation.x = -0.12; g.add(head);
  mesh(new THREE.BoxGeometry(0.08, 0.17, 0.016), M.black, head);
  for (let i = 0; i < 6; i++) {
    const sx = i < 3 ? -1 : 1, y = -0.05 + (i % 3) * 0.05;
    mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 8).rotateX(Math.PI / 2), M.metal, head, sx * 0.025, y, -0.018);
    mesh(new THREE.BoxGeometry(0.02, 0.008, 0.012), M.metal, head, sx * 0.05, y, -0.026);
  }
  // ピックアップ・ブリッジ・テールピース・ノブ・スイッチ
  for (const y of [0.06, -0.04]) {
    mesh(new THREE.BoxGeometry(0.072, 0.03, 0.012), M.black, g, 0, y, 0.022);
    for (let k = 0; k < 6; k++) mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.004, 6).rotateX(Math.PI / 2), M.metal, g, -0.025 + k * 0.01, y, 0.029);
  }
  mesh(new THREE.BoxGeometry(0.075, 0.012, 0.012), M.metal, g, 0, -0.1, 0.022);
  mesh(new THREE.BoxGeometry(0.085, 0.014, 0.01), M.metal, g, 0, -0.14, 0.021);
  for (const [x, y] of [[0.1, -0.1], [0.14, -0.06], [0.1, -0.15], [0.15, -0.12]]) mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.014, 14).rotateX(Math.PI / 2), M.black, g, x, y, 0.025);
  mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.02, 6).rotateX(Math.PI / 2.4), M.metal, g, -0.13, 0.18, 0.028);
  // 弦（ブリッジ→ナット）
  for (let k = 0; k < 6; k++) {
    const x0 = -0.02 + k * 0.008, x1 = -0.017 + k * 0.0068;
    const len = 0.775 + 0.1;
    const str = mesh(new THREE.CylinderGeometry(0.0006 + (5 - k) * 0.00012, 0.0006 + (5 - k) * 0.00012, len, 4), M.metal, g, (x0 + x1) / 2, (0.775 - 0.1) / 2, 0.026);
    str.rotation.z = Math.atan2(x0 - x1, len);
  }
  // 量子ピックアップ（発光リング）
  const q = mesh(new THREE.TorusGeometry(0.03, 0.007, 8, 24), M.qglow, g, -0.12, -0.12, 0.025);
  g.userData.q = q;
  return g;
}

export function createMasato() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const hips = new THREE.Group();
  hips.position.y = 0.94;
  body.add(hips);

  // 胴体：旋盤状のシルエットで胸・腹・肩をつくる（がっしり体型）
  const torso = new THREE.Group();
  hips.add(torso);
  const prof = [[0.0, -0.02], [0.168, -0.02], [0.18, 0.05], [0.192, 0.14], [0.196, 0.24], [0.2, 0.33], [0.195, 0.41], [0.17, 0.47], [0.12, 0.52], [0.065, 0.545], [0.0, 0.55]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const tg = new THREE.LatheGeometry(prof, 40);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i);
    const a = Math.atan2(z, x);
    // Tシャツのしわ（腰回りに横じわ、脇に縦じわ）
    const w = Math.sin(y * 70 + a * 2) * 0.0035 * Math.max(0, 1 - y / 0.25) + Math.sin(a * 9 + y * 6) * 0.002;
    const k = 1 + w / Math.max(0.05, Math.hypot(x, z));
    tp.setXYZ(i, x * 1.22 * k, y, z * 0.8 * k + (z > 0 ? 0.012 * Math.sin(Math.min(1, y / 0.3) * Math.PI) : 0));
  }
  tg.computeVertexNormals();
  mesh(tg, M.shirt, torso);
  // 裾
  const hem = mesh(new THREE.TorusGeometry(0.168, 0.008, 6, 40), M.shirtRib, torso, 0, -0.02, 0);
  hem.rotation.x = Math.PI / 2; hem.scale.set(1.22, 0.8, 1);
  // 襟（リブ）
  const collar = mesh(new THREE.TorusGeometry(0.068, 0.011, 8, 28), M.shirtRib, torso, 0, 0.535, 0.006);
  collar.rotation.x = Math.PI / 2 - 0.25; collar.scale.set(1.1, 0.95, 1);
  // ジーンズの腰回りとベルト
  const pel = new THREE.LatheGeometry([[0, -0.15], [0.15, -0.15], [0.172, -0.06], [0.17, 0.0], [0, 0.0]].map(([r, y]) => new THREE.Vector2(r, y)), 32);
  pel.scale(1.18, 1, 0.84);
  mesh(pel, M.jeans, torso);
  const belt = mesh(new THREE.TorusGeometry(0.168, 0.014, 6, 40), M.belt, torso, 0, -0.025, 0);
  belt.rotation.x = Math.PI / 2; belt.scale.set(1.2, 0.83, 0.7);
  mesh(new THREE.BoxGeometry(0.04, 0.03, 0.01), M.buckle, torso, 0, -0.025, 0.142);

  // 斜め掛けのストラップ（左肩→右腰）
  const strapGeo = new THREE.TorusGeometry(0.255, 0.007, 4, 48);
  strapGeo.scale(1, 0.84, 3.2);
  const strap = mesh(strapGeo, M.strap, torso, -0.01, 0.27, 0.0);
  strap.rotation.order = 'ZYX';
  strap.rotation.set(Math.PI / 2, 0, 0.85);

  // 頭
  const head = new THREE.Group();
  head.position.y = 0.71;
  torso.add(head);
  buildHead(head);

  // 腕
  function arm(side) {
    const sh = new THREE.Group();
    sh.position.set(side * 0.215, 0.455, -0.005);
    torso.add(sh);
    mesh(new THREE.SphereGeometry(0.07, 16, 12), M.shirt, sh).scale.set(1, 0.9, 0.95);
    mesh(new THREE.CylinderGeometry(0.068, 0.078, 0.17, 18, 2, true), M.sleeve, sh, side * 0.008, -0.085, 0);
    cap(0.05, 0.19, M.skin, sh, 0, -0.15, 0, 14);
    const el = new THREE.Group();
    el.position.y = -0.285;
    sh.add(el);
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.034, 0.24, 14), M.skin);
    fore.position.y = -0.12; fore.castShadow = true; el.add(fore);
    mesh(new THREE.SphereGeometry(0.046, 12, 10), M.skin, el);
    const hand = buildHand(side);
    hand.position.y = -0.245;
    el.add(hand);
    return { sh, el };
  }
  const armL = arm(1), armR = arm(-1);

  // 脚
  function leg(side) {
    const hp = new THREE.Group();
    hp.position.set(side * 0.095, -0.09, 0);
    hips.add(hp);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.066, 0.42, 16), M.jeans);
    thigh.position.y = -0.2; thigh.castShadow = true; hp.add(thigh);
    // 縫い目
    mesh(new THREE.BoxGeometry(0.003, 0.4, 0.004), M.jeansDark, hp, side * 0.078, -0.2, 0);
    const kn = new THREE.Group();
    kn.position.y = -0.41;
    hp.add(kn);
    mesh(new THREE.SphereGeometry(0.066, 14, 10), M.jeans, kn);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.07, 0.4, 16), M.jeans);
    shin.position.y = -0.2; shin.castShadow = true; kn.add(shin);
    // スニーカー：ソール＋アッパー＋つま先＋靴ひも
    const shoe = new THREE.Group();
    shoe.position.set(0, -0.43, 0.045);
    kn.add(shoe);
    const sole = mesh(new THREE.CapsuleGeometry(0.048, 0.17, 4, 12), M.sole, shoe, 0, -0.03, 0);
    sole.rotation.x = Math.PI / 2; sole.scale.set(1.05, 1, 0.42);
    const up = mesh(new THREE.CapsuleGeometry(0.044, 0.14, 4, 12), M.shoe, shoe, 0, 0.0, -0.005);
    up.rotation.x = Math.PI / 2; up.scale.set(1, 1, 0.75);
    mesh(new THREE.SphereGeometry(0.044, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.sole, shoe, 0, -0.012, 0.085).scale.set(1, 0.55, 0.9);
    for (let k = 0; k < 4; k++) mesh(new THREE.BoxGeometry(0.04, 0.004, 0.006), M.sole, shoe, 0, 0.03 - k * 0.003, 0.0 + k * 0.022);
    return { hp, kn };
  }
  const legL = leg(1), legR = leg(-1);

  const guitar = buildGuitar();
  guitar.position.set(-0.03, 0.1, 0.235);
  guitar.rotation.set(0.05, 0, -1.05);
  torso.add(guitar);

  root.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });

  // ギター用のピボット（ギターを頭上に掲げる・背中で回す演出用）
  let walk = 0, strum = 0, strumSide = 1, solo = 0;
  // 派手な演奏アクション：small / windmill（腕を一回転）/ jump（跳び弾き）/ raise（ギターを掲げる）
  const act = { type: null, t: 0, dur: 0.4 };
  const DUR = { small: 0.3, windmill: 0.42, jump: 0.55, raise: 0.9 };
  const base = { gpos: guitar.position.clone(), grot: guitar.rotation.clone() };
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  return {
    root, guitar, head,
    get acting() { return act.type; },
    strum(kind = 'small') { strum = 1; strumSide *= -1; act.type = kind; act.t = 0; act.dur = DUR[kind] || 0.3; },
    // speedN: 0..1（歩き→走り）, air: 空中か
    update(dt, t, speedN, air, soloOn, stunned) {
      walk += dt * (4 + speedN * 7) * (speedN > 0.02 ? 1 : 0);
      strum = Math.max(0, strum - dt * 4.5);
      solo = lerp(solo, soloOn ? 1 : 0, 1 - Math.exp(-8 * dt));
      const sw = Math.sin(walk) * (0.25 + speedN * 0.55) * Math.min(1, speedN * 4);
      const breathe = Math.sin(t * 2.2) * 0.008;

      body.position.y = Math.abs(Math.cos(walk)) * 0.05 * Math.min(1, speedN * 3) + breathe;
      body.rotation.set(0, 0, 0);
      torso.rotation.x = speedN * 0.16 + (stunned ? Math.sin(t * 20) * 0.1 : 0);
      torso.rotation.y = Math.sin(walk) * 0.08 * speedN;
      torso.rotation.z = 0;
      head.rotation.y = -torso.rotation.y + Math.sin(t * 0.7) * 0.06 * (1 - speedN);
      head.rotation.x = -torso.rotation.x * 0.5 + strum * 0.1;

      legL.hp.rotation.set(air ? -0.7 : sw, 0, 0);
      legR.hp.rotation.set(air ? -0.3 : -sw, 0, 0);
      legL.kn.rotation.x = air ? 1.1 : Math.max(0, -Math.sin(walk + 1.2)) * (0.3 + speedN * 0.8);
      legR.kn.rotation.x = air ? 0.6 : Math.max(0, Math.sin(walk + 1.2)) * (0.3 + speedN * 0.8);

      // 基本の構え：左手はネック、右手はストローク
      const play = Math.max(strum, solo, 0.35);
      armL.sh.rotation.set(lerp(-sw, -1.0, play), 0, lerp(0.1, 0.5, play));
      armL.el.rotation.set(lerp(-0.3, -1.3, play), 0, 0);
      const stroke = strum * Math.sin(strum * Math.PI) * strumSide;
      armR.sh.rotation.set(lerp(sw, -0.5, play) + stroke * 0.7, 0, lerp(-0.1, -0.25, play));
      armR.el.rotation.set(lerp(-0.3, -1.2, play) + stroke * 0.5, 0, 0);
      guitar.position.copy(base.gpos);
      guitar.rotation.copy(base.grot);
      guitar.rotation.z += strum * 0.08;

      // ---- 派手なアクション ----
      if (act.type) {
        act.t += dt;
        const k = Math.min(1, act.t / act.dur);
        const arc = Math.sin(k * Math.PI);
        if (act.type === 'windmill') {
          // 右腕を大きく一回転させて振り下ろす（ピート・タウンゼント風）
          armR.sh.rotation.set(-0.5 - ease(k) * Math.PI * 2, 0, -0.35 - arc * 0.5);
          armR.el.rotation.set(-0.15, 0, 0);
          torso.rotation.x -= arc * 0.25;
          torso.rotation.z = arc * 0.18;
          head.rotation.x -= arc * 0.35;
          body.position.y += arc * 0.06;
          legL.hp.rotation.z = arc * 0.35; legR.hp.rotation.z = -arc * 0.35;
        } else if (act.type === 'jump') {
          // 跳び上がって脚を開き、着地で深く沈む
          const up = Math.sin(Math.min(1, k / 0.8) * Math.PI);
          body.position.y += up * 0.75 - (k > 0.85 ? (1 - k) * 0.6 : 0);
          legL.hp.rotation.set(-0.9 * up, 0, 0.55 * up);
          legR.hp.rotation.set(0.5 * up, 0, -0.55 * up);
          legL.kn.rotation.x = 1.5 * up; legR.kn.rotation.x = 1.2 * up;
          torso.rotation.x -= up * 0.45;
          head.rotation.x -= up * 0.55;
          armR.sh.rotation.set(-0.5 - up * 2.6, 0, -0.3 - up * 0.6);
          armR.el.rotation.set(-0.2, 0, 0);
          guitar.rotation.z += up * 0.5;
          guitar.position.y += up * 0.08;
        } else if (act.type === 'raise') {
          // ギターを頭上に高々と掲げ、体を反らせる
          const h = ease(Math.min(1, k * 2.2)) * (k < 0.8 ? 1 : (1 - k) / 0.2);
          guitar.position.set(base.gpos.x, base.gpos.y + h * 0.75, base.gpos.z + h * 0.05);
          guitar.rotation.set(base.grot.x - h * 0.3, base.grot.y, base.grot.z + h * 1.0);
          armL.sh.rotation.set(-1.0 - h * 1.9, 0, 0.5 - h * 0.2);
          armL.el.rotation.set(-1.3 + h * 1.0, 0, 0);
          armR.sh.rotation.set(-0.5 - h * 2.2, 0, -0.25 - h * 0.3);
          armR.el.rotation.set(-1.2 + h * 0.9, 0, 0);
          torso.rotation.x -= h * 0.4;
          head.rotation.x -= h * 0.7;
          legL.hp.rotation.z = h * 0.3; legR.hp.rotation.z = -h * 0.3;
        } else {
          // 小さなストローク＋ヘッドバン
          head.rotation.x += arc * 0.45;
          torso.rotation.x += arc * 0.12;
        }
        if (k >= 1) act.type = null;
      }

      // ソロ：のけぞって高速で弾きまくる
      if (solo > 0.01) {
        torso.rotation.x -= solo * 0.5;
        head.rotation.x -= solo * 0.6 - Math.sin(t * 16) * 0.25 * solo;
        armR.sh.rotation.x += Math.sin(t * 40) * 0.3 * solo;
        armR.el.rotation.x += Math.sin(t * 40 + 1) * 0.3 * solo;
        legL.hp.rotation.z = Math.max(legL.hp.rotation.z, solo * 0.4);
        legR.hp.rotation.z = Math.min(legR.hp.rotation.z, -solo * 0.4);
        legL.kn.rotation.x = Math.max(legL.kn.rotation.x, solo * 0.5);
        legR.kn.rotation.x = Math.max(legR.kn.rotation.x, solo * 0.5);
        body.position.y -= solo * 0.12;
      }

      guitar.userData.q.material.emissiveIntensity = 2 + strum * 10 + solo * 12 + (act.type ? 6 : 0);
    },
  };
}
