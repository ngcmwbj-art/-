// 大写し「畝の 断面」（第2章 裏の ネギ畑、events/ch2/negi.ts NegiPanel）を HD-2D で（2026-11-23 依頼主
// 「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：畝を 横に 切った 断面 —— 寄せた 土の 山（段で 高く・低く なる：state.lv）、
// その 切り口に ネギ 1本（根・土の 下の 白い 葉鞘・光の 当たる うす緑・分かれ目から 扇に 開く 葉）、下の 土。
// 2D の 平たい 絵の かわりに、切り口から 奥へ 畝が つづき（フィールドの ネギ畑の 畝 prop_nh_negi が 並ぶ）、
// となりの 畝、杉の 林、夜明け前の 空。目もり・分かれ目の 点線・字は 2D の まま 上に。
// 切り口は 2D の 絵と 同じ 面（パネルの px：ネギの 中心 x 128、地面の 行 96、1段 6px）に 置く。

import * as THREE from 'three';
import { mix } from '../../engine/pixel';
import { NH_FORK, NH_LEAF, NH_LEAF_DK, NH_LEAF_LT, NH_PALE, NH_SOIL, NH_SOIL_DK, NH_SOIL_LT, NH_WHITE, NH_WHITE_SH } from '../../art/props/negi_art';
import { registerPanel3d, type Kit } from '../panel3d';
import { CH2_NIGHT, hGround, nightSky, paint, propImg, sugiWall, swap } from './_kit_c';
import { Rng } from '../../engine/rng';

const CX = 128;
const BASE = 96;
const STEP = 6;
const D = 4;
const FORK_Y = BASE - NH_FORK * STEP;

/** 切り口の 土（断面：粒・塊・湿りの むら。塊は 上が 明るく 下に 影）。 */
function cutSoil(): HTMLCanvasElement {
  return paint('nh:cut2', 64, 64, (p) => {
    const rng = new Rng(41);
    const WET = '#2E211B';
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        // 湿りの むら（ゆるい 波）
        const wet = Math.sin(x * 0.21 + Math.sin(y * 0.17) * 2) * Math.sin(y * 0.13 + x * 0.05) > 0.35;
        const n = rng.next();
        const base = wet ? mix(NH_SOIL, WET, 0.55) : NH_SOIL;
        p.set(x, y, n < 0.1 ? NH_SOIL_DK : n > 0.95 ? NH_SOIL_LT : n > 0.88 ? mix(base, NH_SOIL_LT, 0.4) : base);
      }
    // 土の 塊（丸い かたまり：上の ふちが 明るく、下に 影）
    for (let i = 0; i < 26; i++) {
      const cx = Math.floor(rng.next() * 64);
      const cy = Math.floor(rng.next() * 64);
      const r = 1 + Math.floor(rng.next() * 3);
      for (let y = -r; y <= r; y++)
        for (let x = -r - 1; x <= r + 1; x++) {
          if ((x * x) / ((r + 1) * (r + 1)) + (y * y) / (r * r) > 1) continue;
          const px = (cx + x + 64) % 64;
          const py = (cy + y + 64) % 64;
          p.set(px, py, y < -r / 2 ? NH_SOIL_LT : y > r / 2 ? NH_SOIL_DK : mix(NH_SOIL, NH_SOIL_LT, 0.35));
        }
      p.set((cx + 64) % 64, (cy + r + 1) % 64, '#1A1210');
    }
    // 小石と わらくず
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(rng.next() * 63);
      const y = Math.floor(rng.next() * 63);
      p.set(x, y, '#8A8478');
      p.set(x + 1, y, '#6A665E');
    }
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(rng.next() * 60);
      const y = Math.floor(rng.next() * 63);
      p.hline(x, x + 2 + (i % 2), y, '#9A8458');
    }
  });
}
/** 下の 土（地面の 下：もっと 暗く、しめって いる）。 */
function deepSoil(): HTMLCanvasElement {
  return paint('nh:deep2', 64, 64, (p) => {
    const rng = new Rng(43);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const n = rng.next();
        const wet = Math.sin(x * 0.19 + y * 0.07) * Math.sin(y * 0.23) > 0.3;
        p.set(x, y, n < 0.15 ? '#1A1210' : n > 0.94 ? NH_SOIL : wet ? '#1E1612' : NH_SOIL_DK);
      }
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(rng.next() * 62);
      const y = Math.floor(rng.next() * 62);
      p.set(x, y, NH_SOIL);
      p.set(x + 1, y, NH_SOIL_LT);
      p.set(x, y + 1, '#120C0A');
    }
  });
}

/**
 * 葉鞘（軟白部）の まわりの 絵（円柱に 巻く：横 = 1周、縦 = 下から 上、2 ドット = パネル 1px）。
 * 土の 下 は 白（縦の すじ、うすい 皮の 重なり、根もとは 少し 黄ばむ）、土の 線から 上へ うす緑 → 分かれ目で 緑。
 */
function sheathTex(soil: number): HTMLCanvasElement {
  const h = (BASE - FORK_Y) * 2;
  return paint(`nh:sheath2:${soil}`, 32, h, (p) => {
    const rng = new Rng(soil + 3);
    const soilT = (BASE - soil) * 2; // 下から の 行
    for (let yy = 0; yy < h; yy++) {
      const fromBottom = h - 1 - yy;
      // 白 → うす緑（土の 線から 8 ドットで）→ 緑（分かれ目の 近く）
      const over = (fromBottom - soilT) / 8;
      const toFork = fromBottom / h;
      let c: string = NH_WHITE;
      if (over > 0) c = mix(NH_WHITE, NH_PALE, Math.min(1, over));
      if (over > 1) c = mix(NH_PALE, NH_LEAF, Math.max(0, Math.min(1, (toFork - 0.72) / 0.28)) * Math.min(1, (over - 1) / 3));
      // 根もとの 少し 黄ばんだ 古い 皮
      if (fromBottom < 6) c = mix(c, '#E4D8B0', 0.5);
      for (let x = 0; x < 32; x++) {
        let q = c;
        // 縦の すじ（4 ドットごと、すこし ゆらぐ）
        if ((x + Math.floor(fromBottom / 23)) % 4 === 0) q = mix(c, over > 0 ? NH_LEAF : NH_WHITE_SH, 0.35);
        else if (rng.next() < 0.04) q = mix(c, '#FFFFFF', 0.6);
        p.set(x, yy, q);
      }
    }
    // うすい 皮の 重なり（斜めに 切れた 外の 皮の ふち）：土の 下に 3枚
    for (const [x0, y0, len] of [[3, soilT - 10, 14], [17, soilT - 30, 12], [10, soilT - 52, 16]] as const) {
      for (let i = 0; i < len; i++) {
        const xx = (x0 + i) % 32;
        const yy = h - 1 - Math.max(0, y0 + Math.round(i * 0.35));
        if (yy < 0 || yy >= h) continue;
        p.set(xx, yy, NH_WHITE_SH);
        if (yy + 1 < h) p.set(xx, yy + 1, mix(NH_WHITE_SH, '#B8B49C', 0.5));
      }
    }
  });
}

/** 葉の 絵（筒の まわり：長さ方向の すじ、白い 粉〈ブルーム〉の 明るい すじ）。 */
function leafTex(): HTMLCanvasElement {
  return paint('nh:leaf2', 32, 8, (p) => {
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 32; x++) {
        const c = y === 2 ? NH_LEAF_LT : y === 3 ? mix(NH_LEAF_LT, '#B8D8C0', 0.4) : y >= 6 ? NH_LEAF_DK : NH_LEAF;
        p.set(x, y, (x * 5 + y) % 11 === 0 ? mix(c, NH_LEAF_DK, 0.3) : c);
      }
  });
}

/** 根（白い ひげ根の 束）の 絵。 */
function rootTex(): HTMLCanvasElement {
  return paint('nh:root2', 8, 4, (p) => {
    p.fill('#E8E0C8');
    p.hline(0, 7, 0, '#F8F4E8');
    p.hline(0, 7, 3, '#BEB498');
  });
}

/** ネギ 1本（円柱の 葉鞘・筒の 葉・ひげ根）を 立てる。c = 根もとの 中心（切り口の 面）。 */
function leek(k: Kit, c: THREE.Vector3, u: number): void {
  const r = 4 * u;
  const z = c.z + r * 1.1;
  const top = k.atDepth(CX, FORK_Y, -D)!.y;
  // 葉：分かれ目から 扇に（2D と 同じ 向き・長さ）。中ほどで 太く、先は 少し 垂れて 細い
  const leaves: [number, number, number][] = [[-36, -34, -0.06], [-16, -44, 0.05], [6, -48, -0.03], [24, -40, 0.06], [38, -26, -0.05]];
  const lt = k.tex(leafTex(), true);
  lt.repeat.set(3, 1);
  leaves.forEach(([dx, dh, dz], i) => {
    const P = (t: number, droop: number) => new THREE.Vector3(c.x + dx * u * t, top - dh * u * (t * (2 - t)) * 0.95 - droop * u, z + dz * t);
    const pts = [P(0, 0), P(0.25, 0), P(0.55, 0), P(0.8, 1), P(0.95, 4 + (i % 2) * 2), P(1.05, 9 + (i % 3) * 2)];
    const curve = new THREE.CatmullRomCurve3(pts);
    const g = k.own(new THREE.TubeGeometry(curve, 28, 1.9 * u, 7, false));
    // 先へ 細く（tube の 輪を 長さに そって しぼる）
    const pos = g.attributes.position as THREE.BufferAttribute;
    const segs = 28;
    const ring = 8;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const kk = t < 0.15 ? 0.85 + t : 1 - Math.max(0, (t - 0.55) / 0.45) * 0.75;
      const ctr = curve.getPointAt(t);
      for (let j = 0; j < ring; j++) {
        const idx = s * ring + j;
        if (idx >= pos.count) continue;
        const v = new THREE.Vector3().fromBufferAttribute(pos, idx).sub(ctr).multiplyScalar(kk).add(ctr);
        pos.setXYZ(idx, v.x, v.y, v.z);
      }
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, k.material(lt));
    m.castShadow = true;
    k.scene.add(m);
  });
  // ひげ根の 束（白く 細い 根が 何本も、ちぢれて 下へ）
  const rng = new Rng(77);
  const rm = k.material(k.tex(rootTex(), true));
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI - Math.PI / 2 + (rng.next() - 0.5) * 0.3;
    const len = (8 + rng.next() * 7) * u;
    const pts: THREE.Vector3[] = [];
    for (let t = 0; t <= 1.001; t += 0.25) {
      const wob = Math.sin(t * 9 + i) * 0.6 * u;
      pts.push(new THREE.Vector3(c.x + (Math.sin(a) * len * t * 0.8 + wob) + (rng.next() - 0.5) * 2 * u * (t > 0 ? 1 : 0.3), c.y - 0.3 * u - Math.cos(a * 0.6) * len * t, z + (rng.next() - 0.5) * 2 * u));
    }
    const g = k.own(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, (0.32 + rng.next() * 0.18) * u, 4, false));
    k.scene.add(new THREE.Mesh(g, rm));
  }
  k.bag.leek = { r, z, top };
}

/** 寄せた 土の 山（断面の 形を 奥へ 押し出す）：半分の 幅 hw、高さ hh（単位）。 */
function mound(k: Kit, hw: number, hh: number, y0: number, len: number): THREE.Mesh {
  const s = new THREE.Shape();
  const n = 24;
  s.moveTo(-hw - 0.02, y0 - 0.02);
  for (let i = 0; i <= n; i++) {
    const x = -hw + (2 * hw * i) / n;
    const t = Math.abs(x) / hw;
    s.lineTo(x, y0 + hh * (1 - t * t));
  }
  s.lineTo(hw + 0.02, y0 - 0.02);
  const g = k.own(new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, steps: 1 }));
  g.translate(0, 0, -len);
  const cap = k.tex(cutSoil(), true);
  const side = k.tex(hGround('h_tilled', 32, 32), true);
  // (ExtrudeGeometry の uv は 単位：1 単位に 絵 1枚 → 細かく くり返す)
  cap.repeat.set(3, 3);
  side.repeat.set(3, 3);
  const m = new THREE.Mesh(g, [k.material(cap), k.material(side)]);
  m.castShadow = true;
  m.receiveShadow = true;
  k.scene.add(m);
  return m;
}

registerPanel3d('negi', {
  cam: { fov: 30, pitch: 0, pos: [0, 0, 0], far: 200 },
  // (主役の ネギの 白と 緑を 正しい 色で：フィールドの 夜の 仕上げは かけず、夜明け前の 青い 空の 光と
  //  しゅんの 頭の トマトの 暖かい 灯りで 見せる)
  light: { sun: '#b8c4ff', sky: '#8a94c8', ground: '#4a4048', fog: '#2a3050', sunI: 0.5, hemiI: 1.3, el: 40, az: 200 },
  grade: () => null,
  fog: [10, 40],
  shadow: { x: 0, z: -8, hw: 8, hd: 8 },
  focus: 0.75,
  tilt: 0.9,
  build(k) {
    k.sky(nightSky(0.45, 0.7));
    const u = k.pxAt(D);
    const c = k.atDepth(CX + 1, BASE, -D)!;
    const y0 = c.y;
    k.bag.u = u;
    k.bag.c = c;
    // 地面（奥の 畑：畝の 間の 耕した 土、まわりの 草）と、切り口の 下の 土
    k.tiled(hGround('h_tilled', 64, 64), -6, 6, -24, -D, y0, 16);
    k.tiled(hGround('h_urayama', 64, 64), -60, 60, -80, -24, y0, 16);
    k.tiled(hGround('h_urayama', 64, 64), -60, -6, -24, -D, y0, 16);
    k.tiled(hGround('h_urayama', 64, 64), 6, 60, -24, -D, y0, 16);
    k.box(-8, 8, y0 - 3, y0, -D - 0.5, -D, { front: deepSoil(), top: deepSoil() });
    // 奥へ つづく 畝の ネギ（フィールドの ネギ畑の 1マスの 絵）と、となりの 畝
    for (const [x, r] of [[c.x, 1], [c.x - 2.9, 0], [c.x + 2.9, 2]] as const) {
      const img = propImg('prop_nh_negi', { r, i: 0 });
      if (!img) continue;
      for (let z = x === c.x ? -D - 1.2 : -D - 0.4; z > -18; z -= 1.1) {
        k.stand(img, new THREE.Vector3(x + Math.sin(z * 3.1) * 0.05, y0, z), { px: 1 / 16 * 1.05, depth: 3, rows: [0, 21] });
      }
    }
    // 杉の 林（畑の 奥）
    k.stand(sugiWall(320, 64), new THREE.Vector3(0, y0, -26), { px: 0.12, depth: 2, cast: false });
    // ネギ（筒の 葉・ひげ根）と、しゅんの 頭の トマトの 灯り（手前の 左上から）
    leek(k, new THREE.Vector3(c.x, y0, -D), u);
    const lamp = new THREE.PointLight('#FFE0B8', 4.5, 6, 1.1);
    lamp.position.set(c.x - 1.0, y0 + 2.2, -D + 2.2);
    k.scene.add(lamp);
  },
  update(k, _t, s) {
    const u = k.bag.u as number;
    const c = k.bag.c as THREE.Vector3;
    const lv = Number(s.lv) || 0;
    const soilRow = Math.round(BASE - lv * STEP);
    // 土の 山（段が 変わると 作り直す）
    const key = String(Math.round(lv * 20) / 20);
    if (k.bag.lvKey !== key) {
      k.bag.lvKey = key;
      const old = k.bag.mound as THREE.Mesh | undefined;
      if (old) k.scene.remove(old);
      const hw = (40 + lv * 4) * u;
      k.bag.mound = mound(k, hw, Math.max(0.001, lv * STEP * u), c.y, 18);
      (k.bag.mound as THREE.Mesh).position.set(c.x, 0, -D);
      k.shadowDirty = true;
    }
    // 葉鞘（土の 下は 白）
    swap(k, 'sheath', String(soilRow), () => {
      const L = k.bag.leek as { r: number; z: number; top: number };
      const h = L.top - c.y;
      // 円柱の 葉鞘（根もとが 少し ふくらみ、上へ 少し 細る）
      const g = k.own(new THREE.CylinderGeometry(L.r * 0.92, L.r * 1.05, h, 16, 1, false));
      const m = new THREE.Mesh(g, k.material(k.tex(sheathTex(soilRow))));
      m.position.set(c.x, c.y + h / 2, L.z);
      m.rotation.y = -0.6;
      m.castShadow = true;
      m.receiveShadow = true;
      k.scene.add(m);
      return m;
    });
  },
});
