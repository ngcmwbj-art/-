// 画像ファイルを使わずに、質感（色・凹凸・ツヤ）をその場で描いて作る
import * as THREE from 'three';

let S = 512; // 画質に合わせて変える
export function setTextureSize(n) { S = n; }

// ---------- なめらかなノイズ ----------
const P = new Uint8Array(512);
(() => {
  const p = [];
  for (let i = 0; i < 256; i++) p.push(i);
  let s = 1337;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
})();
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
function grad(h, x, y) { const u = h & 1 ? x : -x, v = h & 2 ? y : -y; return (h & 4 ? u * 2 : u) + v; }
// 周期 per でつながる（タイルにしてもつなぎ目が出ない）
export function noise(x, y, per = 256) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const X0 = ((xi % per) + per) % per, Y0 = ((yi % per) + per) % per;
  const X1 = (X0 + 1) % per, Y1 = (Y0 + 1) % per;
  const a = P[P[X0 & 255] + (Y0 & 255)], b = P[P[X1 & 255] + (Y0 & 255)];
  const c = P[P[X0 & 255] + (Y1 & 255)], d = P[P[X1 & 255] + (Y1 & 255)];
  const u = fade(xf), v = fade(yf);
  const x1 = grad(a, xf, yf) + u * (grad(b, xf - 1, yf) - grad(a, xf, yf));
  const x2 = grad(c, xf, yf - 1) + u * (grad(d, xf - 1, yf - 1) - grad(c, xf, yf - 1));
  return (x1 + v * (x2 - x1)) * 0.5 + 0.5;
}
export function fbm(x, y, oct = 5, per = 8) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let o = 0; o < oct; o++) { s += a * noise(x * f, y * f, per * f); n += a; a *= 0.5; f *= 2; }
  return s / n;
}

// ---------- 道具 ----------
function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function tex(c, srgb = true, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}
// 高さ（0..1 の配列）から凹凸マップを作る
function normalFromHeight(h, w, hh, strength) {
  const c = canvas(w, hh);
  const x = c.getContext('2d');
  const img = x.createImageData(w, hh);
  const at = (i, j) => h[((j + hh) % hh) * w + ((i + w) % w)];
  for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) {
    const dx = (at(i + 1, j) - at(i - 1, j)) * strength;
    const dy = (at(i, j + 1) - at(i, j - 1)) * strength;
    const l = Math.hypot(dx, dy, 1);
    const k = (j * w + i) * 4;
    img.data[k] = (-dx / l * 0.5 + 0.5) * 255;
    img.data[k + 1] = (dy / l * 0.5 + 0.5) * 255;
    img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255;
    img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return tex(c, false);
}
function fromField(w, h, fn) {
  const c = canvas(w, h);
  const x = c.getContext('2d');
  const img = x.createImageData(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const [r, g, b, a = 255] = fn(i / w, j / h, i, j);
    const k = (j * w + i) * 4;
    img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = a;
  }
  x.putImageData(img, 0, 0);
  return c;
}
const mix = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

const cache = {};
function once(key, fn) { if (!cache[key]) cache[key] = fn(); return cache[key]; }

// ---------- 土 ----------
export const dirt = () => once('dirt', () => {
  const w = S, h = S;
  const H = new Float32Array(w * h);
  const c = fromField(w, h, (u, v, i, j) => {
    const n = fbm(u * 8, v * 8, 6, 8);
    const pebbles = Math.pow(clamp01(noise(u * 64, v * 64, 64) * 1.6 - 0.75), 2) * 2.5;
    const clod = fbm(u * 24 + 7, v * 24, 3, 24);
    const ht = n * 0.6 + clod * 0.3 + pebbles * 0.4;
    H[j * w + i] = ht;
    const wet = clamp01((fbm(u * 3 + 3, v * 3, 3, 3) - 0.55) * 4);
    const l = mix(0.85, 1.1, n) * mix(1, 0.62, wet) * (1 + pebbles * 0.35);
    return [mix(118, 70, wet) * l, mix(88, 52, wet) * l, mix(60, 36, wet) * l];
  });
  const rough = fromField(w / 2, h / 2, (u, v) => {
    const wet = clamp01((fbm(u * 3 + 3, v * 3, 3, 3) - 0.55) * 4);
    const r = mix(0.95, 0.45, wet) * 255;
    return [r, r, r];
  });
  return { map: tex(c), normal: normalFromHeight(H, w, h, 6), rough: tex(rough, false) };
});

// ---------- コンクリート ----------
export const concrete = () => once('concrete', () => {
  const w = S, h = S;
  const H = new Float32Array(w * h);
  const c = fromField(w, h, (u, v, i, j) => {
    const n = fbm(u * 6, v * 6, 6, 6);
    const fine = noise(u * 128, v * 128, 128);
    const stain = clamp01((fbm(u * 2 + 9, v * 2, 4, 2) - 0.5) * 3);
    const crack = Math.abs(fbm(u * 4 + 1, v * 4 + 5, 4, 4) - 0.5) < 0.0035 ? 1 : 0;
    H[j * w + i] = n * 0.5 + fine * 0.15 - crack * 0.25;
    const l = (150 + n * 50 + fine * 18) * (1 - stain * 0.25) * (1 - crack * 0.22);
    return [l * 1.0, l * 0.98, l * 0.93];
  });
  return { map: tex(c), normal: normalFromHeight(H, w, h, 3) };
});

// ---------- 黒マルチ（しわのあるビニール） ----------
export const mulch = () => once('mulch', () => {
  const w = S / 2, h = S / 2;
  const H = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const u = i / w, v = j / h;
    H[j * w + i] = Math.abs(noise(u * 6, v * 20, 6) - 0.5) * 2 + fbm(u * 10, v * 10, 3, 10) * 0.4;
  }
  return { normal: normalFromHeight(H, w, h, 4) };
});

// ---------- 葉 ----------
export const leaf = () => once('leaf', () => {
  const w = 256, h = 128;
  const H = new Float32Array(w * h);
  const c = fromField(w, h, (u, v, i, j) => {
    const cy = Math.abs(v - 0.5) * 2; // 中央の葉脈からの距離
    const mid = Math.exp(-Math.pow(cy * 30, 2));
    const side = Math.pow(Math.abs(Math.sin((u * 9 - cy * 2.2) * Math.PI)), 40) * (1 - cy) * 0.8;
    const n = fbm(u * 6, v * 3, 4, 6);
    H[j * w + i] = 1 - mid * 0.8 - side * 0.4 + n * 0.2;
    const tone = mix(0.85, 1.12, n) * (1 - cy * 0.15);
    const r = mix(52, 140, mid + side * 0.6) * tone;
    const g = mix(110, 170, mid + side * 0.6) * tone;
    const b = mix(36, 80, mid + side * 0.6) * tone;
    return [r, g, b];
  });
  return { map: tex(c, true, false), normal: normalFromHeight(H, w, h, 2.5) };
});

// ---------- 収穫コンテナ（すき間のある樹脂の壁） ----------
export const crateWall = () => once('crate', () => {
  const w = 256, h = 128;
  const H = new Float32Array(w * h);
  const alpha = fromField(w, h, (u, v, i, j) => {
    const sx = (u * 7) % 1, sy = v;
    const slot = sx > 0.18 && sx < 0.82 && sy > 0.3 && sy < 0.75;
    const handle = u > 0.36 && u < 0.64 && v > 0.08 && v < 0.2;
    const hole = slot || handle;
    const rim = v < 0.06 || v > 0.94 ? 1 : 0;
    H[j * w + i] = hole ? 0 : 0.6 + rim * 0.4 + noise(u * 50, v * 25, 50) * 0.05;
    const a = hole ? 0 : 255;
    return [a, a, a];
  });
  const map = fromField(w, h, (u, v) => {
    const n = noise(u * 80, v * 40, 80);
    const l = 225 + n * 30;
    return [l, l, l];
  });
  return { alpha: tex(alpha, false, false), map: tex(map, true, false), normal: normalFromHeight(H, w, h, 4) };
});

// コンテナのラベル
export const crateLabel = () => once('crateLabel', () => {
  const c = canvas(256, 128);
  const x = c.getContext('2d');
  x.fillStyle = '#fbf7ec'; x.fillRect(0, 0, 256, 128);
  x.strokeStyle = '#c22b1d'; x.lineWidth = 6; x.strokeRect(6, 6, 244, 116);
  x.fillStyle = '#c22b1d';
  x.font = 'bold 44px "Hiragino Sans","Yu Gothic",sans-serif';
  x.textAlign = 'center';
  x.fillText('パプリカ', 128, 62);
  x.fillStyle = '#333';
  x.font = 'bold 26px "Hiragino Sans","Yu Gothic",sans-serif';
  x.fillText('秀・L　5kg', 128, 104);
  return tex(c, true, false);
});

// ---------- 布 ----------
function fabric(key, base, draw) {
  return once(key, () => {
    const w = 256, h = 256;
    const c = canvas(w, h);
    const x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    draw(x, w, h);
    // 織り目
    const H = new Float32Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      H[j * w + i] = ((i % 4 < 2) ^ (j % 4 < 2) ? 0.6 : 0.4) + noise(i / 8, j / 8, 32) * 0.3;
    }
    const img = x.getImageData(0, 0, w, h);
    for (let k = 0; k < w * h; k++) {
      const f = 0.9 + H[k] * 0.2;
      img.data[k * 4] *= f; img.data[k * 4 + 1] *= f; img.data[k * 4 + 2] *= f;
    }
    x.putImageData(img, 0, 0);
    return { map: tex(c), normal: normalFromHeight(H, w, h, 1.5) };
  });
}
export const plaid = () => fabric('plaid', '#28507a', (x, w) => {
  x.fillStyle = 'rgba(190,40,36,0.6)';
  for (let i = 0; i < w; i += 64) { x.fillRect(i, 0, 18, w); x.fillRect(0, i, w, 18); }
  x.fillStyle = 'rgba(20,30,50,0.45)';
  for (let i = 32; i < w; i += 64) { x.fillRect(i, 0, 10, w); x.fillRect(0, i, w, 10); }
  x.fillStyle = 'rgba(255,255,255,0.3)';
  for (let i = 9; i < w; i += 64) { x.fillRect(i, 0, 2, w); x.fillRect(0, i, w, 2); }
});
export const denim = () => fabric('denim', '#2f3d55', (x, w) => {
  for (let i = 0; i < 3000; i++) {
    x.fillStyle = `rgba(${150 + Math.random() * 60},${160 + Math.random() * 60},200,0.08)`;
    x.fillRect(Math.random() * w, Math.random() * w, 6, 1);
  }
});
export const knit = () => fabric('knit', '#f1efe8', (x, w) => {
  x.fillStyle = 'rgba(0,0,0,0.05)';
  for (let i = 0; i < w; i += 4) x.fillRect(i, 0, 1, w);
});
export const towel = () => fabric('towel', '#f7f6f2', (x, w) => {
  x.fillStyle = '#3a6fb5';
  x.fillRect(0, 20, w, 14); x.fillRect(0, w - 34, w, 14);
});

// 麦わら帽子の編み目
export const straw = () => once('straw', () => {
  const w = 256, h = 256;
  const H = new Float32Array(w * h);
  const c = fromField(w, h, (u, v, i, j) => {
    const band = (j % 16) / 16;
    const weave = Math.sin(band * Math.PI) * (0.7 + 0.3 * Math.sin((i + (Math.floor(j / 16) % 2) * 8) / 16 * Math.PI * 2));
    const n = noise(u * 60, v * 8, 60);
    H[j * w + i] = weave + n * 0.2;
    const l = 0.75 + weave * 0.3 + n * 0.15;
    return [236 * l, 205 * l, 140 * l];
  });
  return { map: tex(c), normal: normalFromHeight(H, w, h, 3) };
});

// ---------- ゴキブリ ----------
// 腹（節のすじ）
export const roachAbdomen = () => once('roachAbd', () => {
  const w = 128, h = 256;
  const H = new Float32Array(w * h);
  const c = fromField(w, h, (u, v, i, j) => {
    const seg = (v * 9) % 1;
    const ridge = Math.pow(Math.sin(seg * Math.PI), 0.6);
    H[j * w + i] = ridge + noise(u * 30, v * 60, 30) * 0.1;
    const edge = seg > 0.85 ? 0.75 : 1;
    const l = (0.85 + ridge * 0.2) * edge;
    return [120 * l, 62 * l, 26 * l];
  });
  return { map: tex(c, true, false), normal: normalFromHeight(H, w, h, 5) };
});
// 前胸（ふちが明るい）
export const roachPronotum = () => once('roachPro', () => {
  const w = 128;
  const c = fromField(w, w, (u, v) => {
    const dx = (u - 0.5) * 2, dy = (v - 0.5) * 2;
    const r = Math.hypot(dx * 1.0, dy * 1.2);
    const rim = clamp01((r - 0.55) * 4);
    const spot = Math.exp(-Math.pow(Math.hypot(dx * 1.6, dy - 0.1) * 2.2, 2));
    const n = noise(u * 20, v * 20, 20);
    const l = 0.9 + n * 0.2;
    const R = mix(90, 205, rim) * (1 - spot * 0.55) * l;
    const G = mix(44, 150, rim) * (1 - spot * 0.6) * l;
    const B = mix(18, 80, rim) * (1 - spot * 0.6) * l;
    return [R, G, B];
  });
  return tex(c, true, false);
});
// はね（翅脈）
export const roachWing = () => once('roachWing', () => {
  const w = 128, h = 256;
  const H = new Float32Array(w * h);
  const c = fromField(w, h, (u, v, i, j) => {
    const vein = Math.pow(Math.abs(Math.sin((u * 6 + v * 1.5) * Math.PI)), 30) + Math.pow(Math.abs(Math.sin((v * 14) * Math.PI)), 60) * 0.4;
    const n = noise(u * 16, v * 32, 16);
    H[j * w + i] = vein * 0.5 + n * 0.2;
    const edge = clamp01(1 - u * 1.3) * 0.25;
    const l = 0.85 + n * 0.25 + edge;
    return [mix(125, 70, vein) * l, mix(62, 34, vein) * l, mix(22, 14, vein) * l];
  });
  return { map: tex(c, true, false), normal: normalFromHeight(H, w, h, 2) };
});

// ---------- ほか ----------
export const cardboard = () => once('cardboard', () => {
  const c = canvas(256, 256);
  const x = c.getContext('2d');
  x.fillStyle = '#b88b56'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1200; i++) { x.fillStyle = `rgba(80,50,20,${Math.random() * 0.06})`; x.fillRect(Math.random() * 256, Math.random() * 256, 30, 1); }
  x.fillStyle = '#2f5d2a';
  x.font = 'bold 40px "Hiragino Sans","Yu Gothic",sans-serif';
  x.textAlign = 'center';
  x.fillText('パプリカ', 128, 120);
  x.font = 'bold 22px sans-serif';
  x.fillText('PAPRIKA  5kg', 128, 156);
  x.strokeStyle = 'rgba(60,40,20,0.5)'; x.lineWidth = 3; x.strokeRect(20, 70, 216, 110);
  return tex(c, true, false);
});
export const stickyCard = () => once('sticky', () => {
  const c = canvas(64, 128);
  const x = c.getContext('2d');
  x.fillStyle = '#f2d82a'; x.fillRect(0, 0, 64, 128);
  x.strokeStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 128; i += 12) { x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke(); }
  x.fillStyle = '#222';
  for (let i = 0; i < 26; i++) { x.beginPath(); x.arc(Math.random() * 64, Math.random() * 128, 0.8 + Math.random() * 1.6, 0, 6.3); x.fill(); }
  return tex(c, true, false);
});
export const sprayLabel = () => once('spray', () => {
  const c = canvas(256, 128);
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#d12a1f'); g.addColorStop(1, '#8e130c');
  x.fillStyle = g; x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#ffd43b';
  x.font = 'bold 34px "Hiragino Sans","Yu Gothic",sans-serif';
  x.fillText('殺虫スプレー', 22, 58);
  x.fillStyle = '#fff';
  x.font = 'bold 18px sans-serif';
  x.fillText('すばやく効く  450ml', 26, 92);
  return tex(c, true, false);
});
// 光の筋・ほこり用のやわらかい形
export const softBeam = () => once('beam', () => {
  const c = fromField(64, 256, (u, v) => {
    const a = Math.exp(-Math.pow((u - 0.5) * 3.2, 2)) * Math.pow(Math.sin(v * Math.PI), 0.7) * (0.75 + 0.25 * noise(u * 4, v * 8, 4));
    return [255, 255, 255, a * 255];
  });
  return tex(c, false, false);
});
export const softDot = () => once('dot', () => {
  const c = fromField(64, 64, (u, v) => {
    const a = clamp01(1 - Math.hypot(u - 0.5, v - 0.5) * 2);
    return [255, 255, 255, Math.pow(a, 2) * 255];
  });
  return tex(c, false, false);
});
export const blobShadow = () => once('blob', () => {
  const c = fromField(64, 64, (u, v) => {
    const d = Math.hypot((u - 0.5) * 2, (v - 0.5) * 2);
    return [0, 0, 0, Math.pow(clamp01(1 - d), 1.6) * 200];
  });
  return tex(c, false, false);
});
// ビニールの結露
export const condensation = () => once('cond', () => {
  const c = canvas(256, 256);
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) {
    const r = Math.random() * 2.5 + 0.5;
    x.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.5})`;
    x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, r, 0, 6.3); x.fill();
  }
  return tex(c, false);
});

// 合板（作業台の天板）
export const plywood = () => once('plywood', () => {
  const w = S, h = S / 2;
  const H = new Float32Array(w * h);
  const c = fromField(w, h, (u, v, i, j) => {
    const warp = fbm(u * 3, v * 6, 4, 3) * 0.6;
    const ring = Math.abs(Math.sin((v * 22 + warp * 6 + u * 0.8) * Math.PI));
    const fine = noise(u * 120, v * 12, 120);
    const knot = Math.exp(-Math.pow(Math.hypot((u - 0.7) * 6, (v - 0.4) * 10), 2));
    H[j * w + i] = ring * 0.3 + fine * 0.2 - knot * 0.3;
    const l = 0.82 + ring * 0.14 + fine * 0.08 - knot * 0.25;
    return [205 * l, 160 * l, 105 * l];
  });
  return { map: tex(c), normal: normalFromHeight(H, w, h, 1.5) };
});
// 草（外）
export const grass = () => once('grass', () => {
  const c = fromField(256, 256, (u, v) => {
    const n = fbm(u * 8, v * 8, 5, 8), f = noise(u * 90, v * 90, 90);
    const l = 0.75 + n * 0.35 + f * 0.15;
    return [78 * l, 112 * l, 52 * l];
  });
  return tex(c);
});
