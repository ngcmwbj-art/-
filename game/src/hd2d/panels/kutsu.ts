// 大写し「長靴」（第2章 分校の 昇降口の 外、events/ch2/kutsu.ts KuPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：
//   kutsu_pick  夜の 昇降口の 外。軒の 下の 板壁、校庭の 土、6足の 長靴（1足ずつ 2本、右が 少し 奥）。
//               選んで いる 足は 少し 持ち上がり、すんだ 足は うすく。トマトの 灯りが 下から。
//               矢印・名札・ふった 数は 2D の まま 上に 乗る。
//   kutsu_furu  逆さに 持った 長靴 1本（底を しゅんの 両手で）。ふると 底を 支点に 口が ゆれる（2D の 傾きと
//               同じ 量だけ 回す）。地面と 灯り。口の 暗い 所・出てくる 生き物・右の 列は 2D の まま 上に 乗る。
// 長靴の 絵は 2D と 同じ 描き方（kutsu.ts drawBoot）を 立てて 押し出す。

import * as THREE from 'three';
import { mix, PixelCanvas } from '../../engine/pixel';
import { fillWall, wallSiding } from '../../art/props/bkit';
import { BOOT_H } from '../../events/ch2/kutsu';
import { KU_BOOT_COLOR } from '../../art/props/kutsu_art';
import { registerPanel3d, type Kit } from '../panel3d';
import { fade, grain, hGroundImg, lamp, NIGHT_LAMP, once, paint, ramp, soft } from './_kit_b';

const W = 360;
const H = 128;
const D = 14;

/** 1足ずつの 使いこみ（泥・すり減り 0..1）：区長・ぴょん夫人・まつ先生・タケじい・シゲじい・スギばあ。 */
const WEAR = [0.55, 0.2, 0.3, 0.95, 0.75, 0.5];

/**
 * 本物の ゴム長靴 1本（s 倍、up：逆さ）。2D の drawBoot と 同じ 外形（幅 15 マス、x = -6 の はしが 絵の 左、
 * 高さ 21 マス）を、ドット単位で 描き込む：底の ギザギザ、丸い つま先、かかと、足首の くびれ、筒の ゴムの つや、
 * 口の 折り返し（色の ちがう 帯と ぬい目）、泥はね と すり減り（1足ずつ ちがう）。
 */
function bootImg(i: number, s: number, up: boolean): HTMLCanvasElement {
  return once(`kuboot2:${i}:${s}:${up}`, () => {
    const w = 15 * s;
    const h = BOOT_H * s;
    const p = new PixelCanvas(w, h);
    const base = KU_BOOT_COLOR[i];
    const pal = [mix(base, '#000000', 0.7), mix(base, '#000000', 0.5), mix(base, '#000000', 0.3), mix(base, '#000000', 0.12), base, mix(base, '#ffffff', 0.15), mix(base, '#ffffff', 0.32), mix(base, '#ffffff', 0.55)];
    const wear = WEAR[i];
    const seed = 500 + i * 17;
    // 立てた 向きの 外形：行（上 0 … 下 h-1）ごとの 左右（ドット）
    const U = s;
    const X = (u: number) => (u + 6) * U;
    const top = 0;
    const cuffH = Math.round(1.6 * U);
    const soleY = h - U;
    const footY = h - 4 * U;
    const ankleY = h - 7 * U;
    for (let y = 0; y < h; y++) {
      let x0 = X(-5);
      let x1 = X(5);
      if (y < cuffH) {
        // 口の 折り返し：少し 広い
        x0 = X(-6);
        x1 = X(6);
      } else if (y >= ankleY && y < footY) {
        // 足首の くびれ（前側が へこむ）
        const k = Math.sin(((y - ankleY) / (footY - ankleY)) * Math.PI);
        x1 = X(5) - Math.round(k * 0.8 * U);
      } else if (y >= footY) {
        // 足：つま先が 前へ（右）、丸く
        const t = (y - footY) / (soleY - footY);
        const toe = X(9) - Math.round((1 - Math.sqrt(Math.max(0, 1 - (1 - t) ** 2 * 1.2))) * 3 * U);
        x1 = Math.max(X(5), toe);
        x0 = X(-5) - (y >= soleY - U ? Math.round(0.3 * U) : 0);
      }
      for (let x = x0; x < x1; x++) {
        // （足の 前は 甲：筒の 陰影の まま 前へ のばし、つま先の 先だけ 暗く）
        const u = Math.min(0.75, (x - x0) / Math.max(1, X(5) - x0));
        let l: number;
        if (y >= soleY) {
          // 底：黒い ゴム、下の ふちが ギザギザ
          const tooth = (Math.floor(x / Math.max(1, Math.round(U * 0.8))) & 1) === 0;
          if (y === h - 1 && !tooth) continue;
          p.set(x, y, grain(x, y, seed) < 0.15 ? '#2A2A30' : '#141418');
          continue;
        }
        if (y < cuffH) {
          // 折り返し：明るめの 帯、下に 影の 線、ぬい目
          l = 0.62 - u * 0.3 + (y === 0 ? 0.25 : 0);
          if (y === cuffH - 1) l = 0.18;
          if (y === Math.round(cuffH / 2) && x % 2 === 0) l += 0.2;
        } else {
          // 筒・足：円い ゴムの 陰影、左の つや（縦の 白い 帯）
          const gloss = Math.exp(-(((u - 0.22) / 0.07) ** 2));
          l = 0.6 - u * 0.48 + gloss * 0.35 + (soft(x, y, 6, seed) - 0.5) * 0.08;
          if (x === x0) l -= 0.12;
          if (x === x1 - 1) l = 0.12;
          // 足の 上の すじ（甲の 線）と かかとの 補強
          if (y === footY && x > X(4)) l -= 0.2;
          if (y > footY + U && x < X(-3)) l -= 0.08;
        }
        let c = ramp(pal, l);
        // すり減り（つま先・かかと・ふち）：色が 抜けて 灰色っぽい
        const worn = (y > footY && (x > X(7) || x < X(-4))) || y < 2;
        if (worn && soft(x, y, 3, seed + 3) < wear * 0.7) c = mix(c, '#9A9488', 0.35);
        // 泥はね：下ほど 多い（使いこみで 量が ちがう）
        const lowK = Math.max(0, (y - h * 0.45) / (h * 0.55));
        const mud = soft(x, y, 3.5, seed + 5);
        if (mud > 1 - lowK * wear * 0.65) c = grain(x, y, seed + 6) < 0.5 ? '#6A5440' : '#8A7458';
        else if (grain(x, y, seed + 7) < lowK * wear * 0.06) c = '#7A644C';
        p.set(x, y, c);
      }
    }
    // 立てた 時：口の 中（暗い だ円）
    for (let x = X(-5) + 1; x < X(5) - 1; x++) p.set(x, top, '#0E0C10');
    const c = p.toCanvas();
    if (!up) return c;
    // 逆さ（底が 上）
    return paint(w, h, (g) => {
      g.ctx.save();
      g.ctx.translate(0, h);
      g.ctx.scale(1, -1);
      g.ctx.drawImage(c, 0, 0);
      g.ctx.restore();
    });
  });
}

function wallImg(): HTMLCanvasElement {
  return once('kuwall2', () => {
    const p = new PixelCanvas(400, 120);
    fillWall(p, 0, 0, 400, 120, wallSiding('#6E665A', 5));
    // 板の よごれ（雨だれ、下の 泥はね）
    for (let y = 0; y < 120; y++)
      for (let x = 0; x < 400; x++) {
        if (soft(x * 3, y * 0.2, 6, 610) > 0.74 && (x + y) % 2 === 0) p.set(x, y, '#5A5448');
        if (y > 104 && grain(x, y, 611) < (y - 104) / 30) p.set(x, y, '#5A4A3A');
      }
    // 昇降口の ガラス戸（アルミの 枠、桟、暗い ガラスに 灯りの 映り）
    for (const x of [150, 196]) {
      p.rect(x, 28, 44, 92, '#8A8E96');
      p.rect(x + 1, 29, 42, 90, '#5A5E66');
      for (const [gy, gh] of [[33, 40], [78, 38]] as const) {
        for (let y = gy; y < gy + gh; y++)
          for (let xx = x + 4; xx < x + 40; xx++) {
            const refl = Math.abs(xx - x - 8 - (y - gy) * 0.4) < 1.2 ? 0.5 : 0;
            p.set(xx, y, ramp(['#0E1220', '#141A2A', '#1E2638', '#3A4458', '#6A7488'], 0.2 + refl + (soft(xx, y, 9, 612) - 0.5) * 0.2));
          }
        p.hline(x + 4, x + 39, gy - 1, '#A8ACB4');
      }
      p.rect(x + 38, 70, 2, 8, '#C8CCD4');
    }
    // 戸の 前の コンクリートの 段
    for (let y = 112; y < 120; y++) for (let x = 140; x < 252; x++) p.set(x, y, ramp(['#5A5A5E', '#6E6E72', '#86868A', '#9A9A9C'], (y === 112 ? 0.9 : 0.5) + (grain(x, y, 613) - 0.5) * 0.3));
    return p.toCanvas();
  });
}

/** 夜の 地面・板壁・軒。groundRow：奥行き D で 地面が 来る 絵の 行。 */
function yard(k: Kit, groundRow: number): void {
  const px = k.pxAt(D);
  k.camera.position.y = (groundRow - H / 2) * px;
  k.camera.updateMatrixWorld();
  k.tiled(hGroundImg('h_kotei', 64, 64), -40, 40, -D - 4, -D + 10, 0, 16);
  const z = -D - 3;
  const a = k.atDepth(-40, -10, z)!;
  const b = k.atDepth(W + 40, H, z)!;
  k.quad(wallImg(), [a.x, 0, z], [b.x, 0, z], [b.x, a.y, z], [a.x, a.y, z]);
  // 軒（上の 暗い 帯）
  k.box(a.x, b.x, a.y - 0.3, a.y + 1, z, -D + 1.5, { front: once('kueave', () => paint(8, 8, (g) => g.rect(0, 0, 8, 8, '#2A2420'))) });
}

registerPanel3d('kutsu_pick', {
  cam: { fov: 22, pitch: 0, pos: [0, 0, 0], near: 0.3, far: 120 },
  light: { ...NIGHT_LAMP, hemiI: 1.0, sunI: 0.5 },
  fog: null,
  shadow: { x: 0, z: -D, hw: 10, hd: 5 },
  grade: () => null,
  focus: 0.62,
  tilt: 0.5,
  build(k: Kit) {
    yard(k, H - 30);
    const pairs: THREE.Mesh[][] = [];
    for (let i = 0; i < 6; i++) {
      const cx = 32 + i * 59;
      const img = bootImg(i, 2, false);
      // （絵の 真ん中 = 2D の drawBoot の cx + 3。右の 1本は 地面の 2px 奥）
      const r = k.ground(cx + 10 + 3, H - 30, 0)!;
      const l = k.ground(cx - 6 + 3, H - 28, 0)!;
      pairs.push([k.stand(img, r, { px: k.pxAt(-r.z), depth: 6 }), k.stand(img, l, { px: k.pxAt(-l.z), depth: 6 })]);
    }
    k.bag.pairs = pairs;
    lamp(k, '#ffd0a8', 26, new THREE.Vector3(0, 2.2, -D + 5), 0, 2);
  },
  update(k: Kit, _t, s) {
    const cur = Number(s.cur);
    const done = String(s.done);
    (k.bag.pairs as THREE.Mesh[][]).forEach((pair, i) => {
      pair.forEach((m) => {
        m.position.y = i === cur ? 3 * k.pxAt(-m.position.z) : 0;
        fade(m, done[i] === '1' ? 0.4 : 1);
      });
    });
    k.shadowDirty = true;
  },
});

registerPanel3d('kutsu_furu', {
  cam: { fov: 22, pitch: 0, pos: [0, 0, 0], near: 0.3, far: 120 },
  light: { ...NIGHT_LAMP, hemiI: 1.0, sunI: 0.5 },
  fog: null,
  shadow: { x: 0, z: -D, hw: 8, hd: 6 },
  grade: () => null,
  focus: 0.4,
  tilt: 0.5,
  build(k: Kit, s) {
    yard(k, H - 10);
    const i = Number(s.sel);
    const px = k.pxAt(D);
    // 底（支点）：2D の 長靴の 上の 真ん中（cx + 6 = 絵の 左から 118、y 6）
    if (i >= 0) {
      // （立てた 長靴を さかさに 回して 持つ：底が 上、つま先は 右の まま）
      const img = bootImg(i, 4, false);
      const pivot = new THREE.Group();
      pivot.position.copy(k.atDepth(118, 6, -D)!);
      const m = k.stand(img, new THREE.Vector3(), { px, depth: 7, flip: true });
      m.rotation.z = Math.PI;
      m.position.set((-img.width / 2) * px, 0, 0);
      pivot.add(m);
      k.scene.add(pivot);
      k.bag.pivot = pivot;
      // しゅんの 両手（底を 持つ）
      const hand = once('kuhand', () =>
        paint(9, 11, (g) => {
          g.rect(0, 0, 9, 11, '#F2C8A0');
          g.rect(0, 0, 2, 11, '#C89A7A');
          g.rect(0, 3, 9, 1, '#D8A880');
          g.rect(0, 6, 9, 1, '#D8A880');
        }),
      );
      const cx = 112;
      k.stand(hand, k.atDepth(cx - 20 - 8 + 4.5, 7 + 11, -D + 0.3)!, { px, depth: 4, unlit: true });
      k.stand(hand, k.atDepth(cx + 36 - 1 + 4.5, 7 + 11, -D + 0.3)!, { px, depth: 4, unlit: true, flip: true });
    }
    lamp(k, '#ffd0a8', 20, k.atDepth(112, H - 30, -D + 3.5)!, 0, 2);
  },
  update(k: Kit, _t, s) {
    const pivot = k.bag.pivot as THREE.Group | undefined;
    // （2D の 傾き：口の ほうが 1マス（4px）ごとに sw × 0.9 px ずれる）
    if (pivot) pivot.rotation.z = Math.atan((Number(s.sw) * 0.9) / 4);
    k.shadowDirty = true;
  },
});
