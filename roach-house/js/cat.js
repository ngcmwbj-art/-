// ハウスのネコ（茶トラ・首に赤い首輪と金の鈴）
// 体の形は球をけずって作り、毛の色（しま模様・白いおなか）は頂点ごとに塗る。
// 毛のふわふわは「毛の殻」（少しずつ外へふくらませた半透明の重ね）で表す。
import * as THREE from 'three';
import { noise } from './textures.js';

const ORANGE = new THREE.Color(0xe08f45);
const STRIPE = new THREE.Color(0x9a4f1e);
const DEEP = new THREE.Color(0x7a3a14);
const WHITE = new THREE.Color(0xf6efe2);
const CREAM = new THREE.Color(0xf0c58e);

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const n3 = (x, y, z) => noise(x * 3.1 + z * 1.7 + 11, y * 3.3 - z * 2.1 + 7, 256);

// ---------- 毛の模様（ネコの体の座標で決める） ----------
function furColor(part, x, y, z, out) {
  const wob = (n3(x, y, z) - 0.5) * 0.9;
  let white = 0, stripe = 0, dark = 0;
  if (part === 'torso') {
    white = sm(0.5, 0.36, y + wob * 0.06) + sm(0.3, 0.55, z) * sm(0.72, 0.5, y) * sm(0.2, 0.08, Math.abs(x));
    // 背中から脇へ流れる縦じま
    const s = Math.sin(z * 17 + Math.abs(x) * 3 + wob * 2.4 + y * 2);
    stripe = sm(0.25, 0.75, s) * sm(0.5, 0.7, y);
    dark = sm(0.86, 0.98, y) * 0.6 * sm(0.5, 0.2, Math.abs(x) * 3);
  } else if (part === 'head') {
    // 口もと・あご・ほおの下は白、額に「M」のしま
    white = sm(0.0, -0.1, y + wob * 0.03) * sm(0.05, 0.2, z) + sm(-0.08, -0.16, y);
    const fz = sm(0.08, 0.2, z);
    const m = Math.sin(x * 38 + Math.abs(x) * 6) * fz * sm(0.07, 0.16, y);
    stripe = sm(0.35, 0.85, m) + sm(0.4, 0.8, Math.sin(Math.atan2(y, Math.abs(x)) * 7 + wob * 2)) * sm(0.17, 0.24, Math.abs(x)) * 0.8;
  } else if (part === 'leg') {
    white = sm(0.2, 0.08, y + wob * 0.02);
    stripe = sm(0.3, 0.8, Math.sin(y * 26 + wob * 2)) * sm(0.12, 0.25, y);
  } else if (part === 'haunch') {
    white = sm(0.42, 0.3, y);
    stripe = sm(0.2, 0.8, Math.sin(Math.atan2(y - 0.6, z + 0.35) * 6 + wob * 2.5)) * sm(0.4, 0.55, y);
  } else if (part === 'tail') {
    // しっぽは輪のしま、先は濃い
    stripe = sm(0.1, 0.7, Math.sin(y * 22 + wob));
    dark = sm(0.75, 1, y) * 0.8;
  } else if (part === 'ear') {
    stripe = sm(0.6, 1.0, y) * 0.5;
  }
  out.copy(ORANGE).lerp(CREAM, sm(0.4, 0.7, n3(x * 2, y * 2, z * 2)) * 0.25);
  out.lerp(STRIPE, Math.min(1, stripe) * 0.85);
  out.lerp(DEEP, Math.min(1, dark));
  out.lerp(WHITE, Math.min(1, white));
  return out;
}

function paint(geo, part, ox = 0, oy = 0, oz = 0) {
  const p = geo.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    furColor(part, p.getX(i) + ox, p.getY(i) + oy, p.getZ(i) + oz, col);
    c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

// 球をけずって形を作る（fn は点を受けとって書きかえる）
function sculpt(geo, fn) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); fn(v); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals();
  return geo;
}

// ---------- 毛の質感（細い毛すじ） ----------
let FUR = null;
function furTex() {
  if (FUR) return FUR;
  const w = 256, h = 256;
  const H = new Float32Array(w * h);
  const A = new Uint8ClampedArray(w * h * 4);
  // 短い毛すじをたくさん描く（毛並みは v 方向）
  let s = 9;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 5200; k++) {
    const x0 = r() * w, y0 = r() * h, len = 4 + r() * 9, lean = (r() - 0.5) * 0.5, b = 0.5 + r() * 0.5;
    for (let t = 0; t < len; t++) {
      const x = Math.floor(x0 + lean * t + w) % w, y = Math.floor(y0 + t) % h;
      const v = b * (1 - t / len * 0.6);
      H[y * w + x] = Math.max(H[y * w + x], v);
    }
  }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), img = g.createImageData(w, h);
  const at = (i, j) => H[((j + h) % h) * w + ((i + w) % w)];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = (at(i + 1, j) - at(i - 1, j)) * 2.2, dy = (at(i, j + 1) - at(i, j - 1)) * 2.2;
    const l = Math.hypot(dx, dy, 1), k = (j * w + i) * 4;
    img.data[k] = (-dx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
    const a = H[j * w + i];
    A[k] = A[k + 1] = A[k + 2] = a * 255; A[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const normal = new THREE.CanvasTexture(c);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping; normal.repeat.set(5, 5);
  const c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
  c2.getContext('2d').putImageData(new ImageData(A, w, h), 0, 0);
  const strands = new THREE.CanvasTexture(c2);
  strands.wrapS = strands.wrapT = THREE.RepeatWrapping; strands.repeat.set(10, 10);
  FUR = { normal, strands };
  return FUR;
}

// 目（虹彩と、縦に細いひとみ・光の点）
let EYE = null;
function eyeTex() {
  if (EYE) return EYE;
  const n = 128, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(n / 2, n / 2, 4, n / 2, n / 2, n / 2);
  gr.addColorStop(0, '#d8e85a'); gr.addColorStop(0.55, '#a9c93a'); gr.addColorStop(0.9, '#6f8f1f'); gr.addColorStop(1, '#2a3510');
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  for (let k = 0; k < 90; k++) { // 虹彩のすじ
    const a = k / 90 * Math.PI * 2;
    g.strokeStyle = `rgba(${k % 2 ? '255,240,150' : '60,80,10'},0.18)`;
    g.beginPath(); g.moveTo(n / 2 + Math.cos(a) * 10, n / 2 + Math.sin(a) * 10); g.lineTo(n / 2 + Math.cos(a) * 60, n / 2 + Math.sin(a) * 60); g.stroke();
  }
  g.fillStyle = '#050505';
  g.beginPath(); g.ellipse(n / 2, n / 2, 7, 44, 0, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  EYE = t;
  return t;
}

// 毛の殻：同じ形を少しずつ外へふくらませ、毛すじの所だけ残す
const SHELLS = 4;
function shellMats() {
  const F = furTex();
  const mats = [];
  for (let k = 1; k <= SHELLS; k++) {
    const f = k / SHELLS;
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, alphaMap: F.strands, alphaTest: 0.35 + f * 0.45, transparent: false, alphaToCoverage: true });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed += objectNormal * ${(0.004 + f * 0.012).toFixed(4)};
        transformed.y -= ${(f * f * 0.003).toFixed(4)};`);
      // 根もとは少し暗く、毛先は明るく
      sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= ${(0.9 + f * 0.06).toFixed(3)};`);
    };
    m.customProgramCacheKey = () => 'catShell' + k;
    mats.push(m);
  }
  return mats;
}

export function makeCat() {
  const F = furTex();
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const furM = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.92, normalMap: F.normal, normalScale: new THREE.Vector2(0.6, 0.6),
    sheen: 1, sheenColor: new THREE.Color(0xffd7a8), sheenRoughness: 0.45,
  });
  const shells = shellMats();
  const shellMeshes = [];
  const pink = new THREE.MeshStandardMaterial({ color: 0xe79a9a, roughness: 0.55 });
  const earIn = new THREE.MeshStandardMaterial({ color: 0xf0b3a6, roughness: 0.8, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.6 });
  const eyeM = new THREE.MeshPhysicalMaterial({ map: eyeTex(), roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xf2c31b, metalness: 1, roughness: 0.22 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc8312b, roughness: 0.55 });
  const whiskM = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });

  // 毛のある部品：本体＋毛の殻をまとめて足す
  const furry = (parent, geo, shadow = true, fuzz = true) => {
    const m = new THREE.Mesh(geo, furM);
    m.castShadow = shadow; m.receiveShadow = true;
    parent.add(m);
    if (fuzz) for (const sm2 of shells) { const s = new THREE.Mesh(geo, sm2); s.raycast = () => {}; parent.add(s); shellMeshes.push(s); }
    return m;
  };

  // ---------- 胴：胸は深く、腰は丸く、背中は少しくぼむ ----------
  const torsoG = sculpt(new THREE.SphereGeometry(1, 48, 32), (v) => {
    const z = v.z; // -1 腰 … +1 胸
    const rump = Math.exp(-Math.pow((z + 0.62) / 0.3, 2)), chest = Math.exp(-Math.pow((z - 0.55) / 0.35, 2));
    v.x *= 0.19 * (1 + 0.32 * rump + 0.12 * chest);
    let ry = 0.19 * (1 + 0.1 * rump + 0.35 * chest);
    if (v.y < 0) ry *= 1 - 0.28 * Math.exp(-Math.pow(z / 0.4, 2)); // おなかの引きしまり
    v.y *= ry;
    v.z *= 0.5;
    if (v.y > 0) v.y -= 0.025 * Math.exp(-Math.pow(z / 0.5, 2)); // 背中のくぼみ
    v.y += 0.6 + z * 0.03;
  });
  furry(body, paint(torsoG, 'torso'));
  // 腰の大きなもも（後ろ足の付け根）
  for (const s of [-1, 1]) {
    const hg = sculpt(new THREE.SphereGeometry(1, 24, 18), (v) => { v.x = v.x * 0.07 + s * 0.14; v.y = v.y * 0.15 + 0.55; v.z = v.z * 0.15 - 0.3; });
    furry(body, paint(hg, 'haunch'));
  }
  // 胸の白いふさ毛
  const ruffG = sculpt(new THREE.SphereGeometry(1, 20, 14), (v) => { v.x *= 0.12; v.y = v.y * 0.13 + 0.6; v.z = v.z * 0.08 + 0.38; });
  furry(body, paint(ruffG, 'head', 0, -0.9, 0)); // 頭の下側として塗る＝白

  // ---------- 頭 ----------
  const neck = new THREE.Group();
  neck.position.set(0, 0.7, 0.4);
  body.add(neck);
  const neckG = sculpt(new THREE.SphereGeometry(1, 24, 16), (v) => { v.x *= 0.125; v.y = v.y * 0.15 + 0.06; v.z = v.z * 0.13 + 0.02; });
  neckG.rotateX(0.5);
  furry(neck, paint(neckG, 'torso', 0, 0.72, 0.45));
  const head = new THREE.Group();
  head.position.set(0, 0.2, 0.14);
  head.scale.setScalar(0.85);
  neck.add(head);
  const skullG = sculpt(new THREE.SphereGeometry(1, 36, 28), (v) => {
    const cheek = Math.exp(-Math.pow((v.y + 0.25) / 0.45, 2)) * Math.exp(-Math.pow(v.z / 0.8, 2));
    v.x *= 0.23 * (1 + 0.14 * cheek);
    v.y *= 0.2 * (v.y > 0 ? 0.95 : 1);
    v.z *= 0.21;
    if (v.y > 0.3) v.z -= (v.y - 0.3) * 0.08; // 額をうしろへ
  });
  furry(head, paint(skullG, 'head'), true, false); // 顔は近くで見るので毛の殻なし（ざらつき防止）
  // 口もと（左右のひげ袋とあご）
  for (const s of [-1, 1]) {
    const pg = sculpt(new THREE.SphereGeometry(1, 16, 12), (v) => { v.x = v.x * 0.044 + s * 0.036; v.y = v.y * 0.035 - 0.065; v.z = v.z * 0.04 + 0.185; });
    furry(head, paint(pg, 'head', 0, -0.2, 0), false, false);
  }
  const chinG = sculpt(new THREE.SphereGeometry(1, 14, 10), (v) => { v.x *= 0.045; v.y = v.y * 0.03 - 0.11; v.z = v.z * 0.04 + 0.16; });
  furry(head, paint(chinG, 'head', 0, -0.2, 0), false, false);
  // 鼻（ピンクの逆三角）
  const noseG = new THREE.ConeGeometry(0.02, 0.022, 3);
  noseG.rotateX(Math.PI); noseG.rotateY(Math.PI);
  const nose = new THREE.Mesh(noseG, pink);
  nose.scale.set(1.2, 1, 0.6);
  nose.position.set(0, -0.03, 0.218);
  head.add(nose);
  // 口のすじ
  const mouthG = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -0.042, 0.222), new THREE.Vector3(0, -0.07, 0.224),
    new THREE.Vector3(0, -0.07, 0.224), new THREE.Vector3(-0.028, -0.082, 0.215),
    new THREE.Vector3(0, -0.07, 0.224), new THREE.Vector3(0.028, -0.082, 0.215),
  ]);
  head.add(new THREE.LineSegments(mouthG, new THREE.LineBasicMaterial({ color: 0x5a3020 })));
  // ひげ（少したれた曲線）
  const wp = [];
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) {
    const y0 = -0.06 + k * 0.012, ang = -0.25 + k * 0.12;
    let px = s * 0.06, py = y0, pz = 0.2;
    for (let t = 1; t <= 4; t++) {
      const nx = s * (0.06 + t * 0.07), ny = y0 + Math.sin(ang) * t * 0.05 - t * t * 0.004, nz = 0.19 - t * 0.02;
      wp.push(new THREE.Vector3(px, py, pz), new THREE.Vector3(nx, ny, nz));
      px = nx; py = ny; pz = nz;
    }
  }
  head.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wp), whiskM));
  // 目（アーモンド形）と、まばたき用のまぶた
  const lids = [];
  for (const s of [-1, 1]) {
    const eg = new THREE.SphereGeometry(1, 20, 16);
    const p = eg.attributes.position, uv = eg.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 0.5 + 0.5, p.getY(i) * 0.5 + 0.5);
    const eye = new THREE.Mesh(eg, eyeM);
    eye.scale.set(0.048, 0.04, 0.03);
    eye.position.set(s * 0.095, 0.035, 0.168);
    eye.rotation.set(-0.05, s * 0.38, s * -0.12);
    head.add(eye);
    const lidG = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const lid = new THREE.Mesh(paint(lidG, 'head', 0, 0.15, 0), furM);
    lid.scale.set(0.052, 0.045, 0.034);
    lid.position.copy(eye.position);
    lid.rotation.set(-1.45, s * 0.38, s * -0.12); // 上へめくれた状態＝目を開いている
    head.add(lid);
    lids.push(lid);
  }
  // 耳：外は毛、内はピンク＋白い房毛
  const ears = [];
  for (const s of [-1, 1]) {
    const E = new THREE.Group();
    E.position.set(s * 0.13, 0.15, -0.01);
    E.rotation.set(-0.15, s * 0.35, s * -0.3);
    const og = sculpt(new THREE.ConeGeometry(0.085, 0.17, 12, 3, true), (v) => { v.z *= 0.35; if (v.z > 0) v.z *= 0.2; });
    og.translate(0, 0.085, 0);
    const outer = new THREE.Mesh(paint(og, 'ear'), new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide, sheen: 1, sheenColor: new THREE.Color(0xffd7a8) }));
    outer.castShadow = true;
    const ig = new THREE.ConeGeometry(0.062, 0.13, 10, 1, true, -Math.PI / 2 - 0.9, 1.8);
    ig.translate(0, 0.07, 0.012);
    const inner = new THREE.Mesh(ig, earIn);
    inner.scale.z = 0.35;
    E.add(outer, inner);
    const tp = [];
    for (let k = 0; k < 7; k++) {
      const a = (k / 6 - 0.5) * 0.9;
      tp.push(new THREE.Vector3(Math.sin(a) * 0.02, 0.02 + k * 0.004, 0.018), new THREE.Vector3(Math.sin(a) * 0.05, 0.1, 0.03));
    }
    E.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tp), whiskM));
    head.add(E);
    ears.push(E);
  }
  // 首輪と鈴
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.018, 8, 28), red);
  collar.rotation.x = Math.PI / 2 - 0.55;
  collar.position.set(0, 0.1, 0.08);
  collar.scale.set(1, 1.05, 1);
  neck.add(collar);
  const bellG = new THREE.Group();
  bellG.position.set(0, 0.0, 0.19);
  const bellBody = new THREE.Mesh(new THREE.SphereGeometry(0.036, 20, 14), gold);
  bellBody.castShadow = true;
  const slot = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.0035, 4, 24), dark);
  slot.rotation.x = Math.PI / 2;
  slot.position.y = -0.006;
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.03, 0.012), dark);
  slit.position.set(0, -0.02, 0.029);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.004, 4, 12), gold);
  loop.position.y = 0.04;
  bellG.add(bellBody, slot, slit, loop);
  neck.add(bellG);

  // ---------- 脚：もも＋すね（ひざで曲がる）＋前足の指 ----------
  const legs = [];
  const LEG = [[-0.13, 0.36, false], [0.13, 0.36, false], [-0.15, -0.36, true], [0.15, -0.36, true]];
  for (const [x, z, hind] of LEG) {
    const L = new THREE.Group();
    L.position.set(x * 0.85, hind ? 0.56 : 0.56, z * 0.85);
    const upLen = hind ? 0.26 : 0.27;
    const ug = new THREE.CylinderGeometry(hind ? 0.085 : 0.066, 0.052, upLen, 14, 4, true);
    ug.translate(0, -upLen / 2, 0);
    furry(L, paint(ug, 'leg', 0, 0.5, 0));
    const knee = new THREE.Group();
    knee.position.y = -upLen;
    L.add(knee);
    // ひざ・かかとの丸み（つなぎ目のすき間をふさぐ）
    furry(knee, paint(new THREE.SphereGeometry(0.052, 14, 10), 'leg', 0, 0.3, 0), false);
    const topG = new THREE.SphereGeometry(hind ? 0.085 : 0.066, 14, 10);
    furry(L, paint(topG, 'leg', 0, 0.5, 0), false);
    const loLen = hind ? 0.3 : 0.27;
    const lg = new THREE.CylinderGeometry(0.05, 0.043, loLen, 12, 4, true);
    lg.translate(0, -loLen / 2, 0);
    furry(knee, paint(lg, 'leg', 0, loLen, 0));
    // 足先（丸い足と4本の指のふくらみ）
    const paw = new THREE.Group();
    paw.position.set(0, -loLen, 0.02);
    knee.add(paw);
    furry(paw, paint(new THREE.SphereGeometry(0.044, 12, 8), 'leg', 0, 0.02, 0), false);
    const pg = sculpt(new THREE.SphereGeometry(1, 16, 12), (v) => { v.x *= 0.058; v.y = v.y * 0.035 + 0.01; v.z = v.z * 0.075 + 0.015; if (v.y < 0) v.y *= 0.4; });
    furry(paw, paint(pg, 'leg', 0, 0, 0), true);
    for (let k = 0; k < 4; k++) {
      const tg = new THREE.SphereGeometry(0.022, 10, 8);
      const toe = new THREE.Mesh(paint(tg, 'leg'), furM);
      toe.position.set((k - 1.5) * 0.028, 0.005, 0.07 + (k === 0 || k === 3 ? -0.01 : 0));
      toe.scale.set(1, 0.8, 1.1);
      paw.add(toe);
    }
    if (hind) { L.rotation.x = 0; knee.rotation.x = 0; }
    L.userData = { knee, paw, hind };
    body.add(L);
    legs.push(L);
  }

  // ---------- しっぽ：8つの節で、波打つように動かせる ----------
  const tail = new THREE.Group();
  tail.position.set(0, 0.68, -0.48);
  body.add(tail);
  const segs = [];
  let parent = tail;
  const N = 8, segLen = 0.085;
  for (let k = 0; k < N; k++) {
    const r0 = 0.04 - k * 0.0024, r1 = 0.04 - (k + 1) * 0.0024;
    const g = new THREE.CylinderGeometry(r1, r0, segLen, 12, 2, true);
    g.translate(0, segLen / 2, 0);
    const cap = new THREE.SphereGeometry(r1, 12, 8);
    cap.translate(0, segLen, 0);
    const S = new THREE.Group();
    S.position.y = k === 0 ? 0 : segLen;
    // しっぽ全体の長さに対する位置（0..1）で塗る
    paint(g, 'tail', 0, k / N, 0); paint(cap, 'tail', 0, (k + 1) / N, 0);
    const scaleY = (gg) => { const p = gg.attributes.position; const c = gg.attributes.color; for (let i = 0; i < p.count; i++) { const t = (k + p.getY(i) / segLen) / N; const col = furColor('tail', 0, t, p.getZ(i), new THREE.Color()); c.setXYZ(i, col.r, col.g, col.b); } };
    scaleY(g); scaleY(cap);
    furry(S, g);
    const cm = new THREE.Mesh(cap, furM); S.add(cm);
    parent.add(S);
    segs.push(S);
    parent = S;
  }
  tail.rotation.x = -0.9;

  root.traverse((o) => { if (o.isMesh || o.isLine) { o.userData.ownMaterial = true; o.userData.ownGeometry = true; } });
  // 共有の素材は捨てない（毛の殻・目の質感は使い回す）
  // 遠いときは毛の殻を描かない（絵の量が約5分の1になる）
  let fuzzOn = true;
  const setFuzz = (on) => { if (on === fuzzOn) return; fuzzOn = on; for (const s of shellMeshes) s.visible = on; };
  return { root, body, neck, head, legs, tail, tail2: segs[4], tailSegs: segs, lids, ears, bell: bellG, setFuzz };
}
