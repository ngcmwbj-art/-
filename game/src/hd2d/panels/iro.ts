// 大写し「漬物の 色」（第2章 集会所の 机、events/ch2/iro.ts AwasePanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：集会所の 机の 上に 小皿 3枚（白、ふちに 青い 線）。ナスの 漬物（皮の 紫、
// 切り口は 淡い 黄緑）・みょうが（うす桃色、すじは 濃い 桃色）・梅干し（赤、しわ）。上から ランプの
// 暖かい 光。段階1（トマトの 灯り）は ナスの 皿に 橙の 光。札の 欄・札・皿の 名前は 2D の まま 上に 乗る。
//
// 皿は 2D の 皿の 中心（Kit.ground）に 置く：札の 欄が 皿の すぐ 下に 来る 並びは 2D と 同じ。
// 机は 分校の 床の 板の 模様（h_schoolwood）を 濃く、奥は しっくいの 壁。

import * as THREE from 'three';
import { mix, PixelCanvas } from '../../engine/pixel';
import { fillWall, wallPlaster } from '../../art/props/bkit';
import { registerPanel3d, type Kit } from '../panel3d';
import { grain, hGroundImg, lamp, once, paint, ramp, ROOM_LAMP, soft } from './_kit_b';

const W = 214;
const H = 112;
/** 2D の 皿の 中心（絵の 左上からの px）。 */
const PLATES: [number, number][] = [
  [36, 30],
  [108, 30],
  [180, 30],
];

/** 皿の 上（上から 見た 円）：白い 釉、ふちの 青い 二重線と 小さな 波の 模様、くぼみの 陰、光の 映り、貫入。 */
function plateTop(): HTMLCanvasElement {
  return once('irplate2', () => {
    const p = new PixelCanvas(64, 64);
    const GLAZE = ['#B8B2A6', '#CCC6BA', '#DCD6CA', '#E8E4DC', '#F2EEE6', '#FAF8F2', '#FFFFFF'];
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const dx = x - 31.5;
        const dy = y - 31.5;
        const r = Math.hypot(dx, dy);
        if (r > 31) continue;
        // ふち（もり上がり）は 左上が 光る、見込み（まん中）は 少し くぼんで 陰
        let l = 0.6;
        if (r > 25) l = 0.62 - (dx + dy) / 31 * 0.22;
        else if (r > 20) l = 0.5 + (dx + dy) / 25 * 0.12;
        else l = 0.58 - r * 0.004;
        l += (grain(x, y, 700) - 0.5) * 0.05;
        let c = ramp(GLAZE, l);
        if (Math.abs(r - 28.5) < 0.6 || Math.abs(r - 26.5) < 0.5) c = '#3A5A9A';
        // 二重線の あいだの 小さな 波（染付）
        if (r > 26.9 && r < 28.1 && (Math.round(Math.atan2(dy, dx) * 14) & 1) === 0) c = '#6A8AC8';
        // 見込みの 細い 圏線
        if (Math.abs(r - 15) < 0.5) c = '#8AA2D0';
        // 光の 映り（左上の ふち）
        if (r > 24 && r < 30 && dx < -8 && dy < -8 && Math.abs(dx - dy) < 4) c = '#FFFFFF';
        // 貫入（細い ひび）
        if (grain(x >> 1, y >> 1, 701) < 0.02) c = mix(c, '#9A9488', 0.4);
        p.set(x, y, c);
      }
    return p.toCanvas();
  });
}

/** 皿の 中身（上から）：ナスの 輪切り（皮の 紫の つや、切り口の 種の 輪）、漬け汁。orange：トマトの 灯りの 橙の ふち。 */
function nasuTop(orange: boolean): HTMLCanvasElement {
  return once(`irnasu2:${orange}`, () => {
    const p = new PixelCanvas(64, 64);
    // 漬け汁の うすい 紫の たまり
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) if (Math.hypot(x - 32, y - 33) < 16 + soft(x, y, 4, 710) * 4) p.set(x, y, '#C8A8C8');
    for (const [dx, dy] of [[-12, 1], [-4, -5], [5, 3], [13, -3], [-2, 10]]) {
      const cx = 32 + dx;
      const cy = 32 + dy;
      for (let y = -7; y <= 7; y++)
        for (let x = -7; x <= 7; x++) {
          const r = Math.hypot(x, y * 1.05);
          if (r > (orange ? 7.2 : 6.4)) continue;
          let c: string;
          if (r > 6.4) c = '#F28A3A';
          else if (r > 5.2) c = ramp(['#2A1238', '#3E1A52', '#5E2A7A', '#7A3E98', '#A070C0'], 0.5 - (x + y) / 14 + (r > 5.8 ? -0.2 : 0.1));
          else {
            c = ramp(['#A8A070', '#C8C890', '#D8D8A8', '#E8E4C0'], 0.6 - r * 0.06 + (grain(cx + x, cy + y, 711) - 0.5) * 0.3);
            // 種の 輪
            if (Math.abs(r - 3) < 0.6 && grain(cx + x, cy + y, 712) < 0.6) c = '#8A7A48';
            // 皮の 色が しみた ふち
            if (r > 4.6) c = '#B890A8';
          }
          p.set(cx + x, cy + y, c);
        }
      p.set(cx - 4, cy - 4, '#E0C8F0');
    }
    return p.toCanvas();
  });
}

/** みょうが（立てた つぼみ：うす桃色、濃い 桃色の すじ、重なる 苞）・梅干し（しわ、赤じその かけら）の 横からの 絵。 */
function myogaImg(): HTMLCanvasElement {
  return once('irmyoga2', () =>
    paint(10, 14, (g) => {
      const PINK = ['#B83A5A', '#E0567A', '#F07A98', '#F59AB0', '#FAC0CC', '#FFE0E6'];
      for (let y = 1; y < 14; y++) {
        const w = Math.round(Math.sin((y / 14) * Math.PI * 0.9 + 0.3) * 4);
        for (let x = 5 - w; x < 5 + w; x++) {
          const u = (x - (5 - w)) / Math.max(1, 2 * w);
          let c = ramp(PINK, 0.75 - u * 0.6 + (y > 10 ? 0.1 : 0));
          // 苞の 重なり（ななめの すじ）
          if ((x + y * 2) % 7 === 0) c = PINK[1];
          if (y > 9 && x === 5) c = '#F4F0D8';
          g.px(x, y, c);
        }
      }
      g.rect(4, 0, 2, 1, '#9A3A5A');
    }),
  );
}
function umeImg(): HTMLCanvasElement {
  return once('irume2', () => {
    const p = new PixelCanvas(11, 10);
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < 11; x++) {
        const r = Math.hypot(x - 5, (y - 5) * 1.1);
        if (r > 5) continue;
        let l = 0.6 - (x + y - 10) * 0.05 - r * 0.04;
        // しわ（くぼみの 線）
        if (soft(x, y, 1.6, 720 + y) > 0.62) l -= 0.25;
        p.set(x, y, ramp(['#5A0E18', '#7A1620', '#A0202C', '#C02C34', '#D8443E', '#F07A6A'], l));
      }
    p.set(3, 2, '#FFC0B0');
    p.set(4, 2, '#FF9A8A');
    p.set(7, 7, '#4A1A3A');
    p.set(8, 6, '#6A2A48');
    return p.toCanvas();
  });
}

function tableImg(): HTMLCanvasElement {
  return once('irtable', () => {
    const src = hGroundImg('h_schoolwood', 64, 64);
    return paint(64, 64, (g) => {
      g.ctx.drawImage(src, 0, 0);
      // 机の 濃い 茶（2D の #4A3A2E に 寄せる）
      g.rect(0, 0, 64, 64, '#3A2618', 0.55);
    });
  });
}

function wallImg(): HTMLCanvasElement {
  return once('irwall', () => {
    const p = new PixelCanvas(240, 40);
    fillWall(p, 0, 0, 240, 40, wallPlaster('#C8BCA0', 4));
    p.hline(0, 239, 39, '#5A4632');
    p.rect(0, 36, 240, 3, '#6A5038');
    return p.toCanvas();
  });
}

registerPanel3d('iro', {
  cam: { fov: 24, pitch: 42, pos: [0, 6.2, 0], near: 0.5, far: 80 },
  light: ROOM_LAMP,
  fog: null,
  shadow: { x: 0, z: -6.5, hw: 5, hd: 4 },
  grade: () => null,
  focus: 0.35,
  tilt: 0.6,
  build(k: Kit, s) {
    // 机（奥の はしは 2D の 濃い 帯の 所）と 奥の 壁
    const back = k.ground(W / 2, 5, 0)!;
    k.tiled(tableImg(), -14, 14, back.z, 2, 0, 28);
    k.box(-14, 14, -0.25, 0, back.z, back.z + 0.25, {});
    const wl = wallImg();
    k.quad(wl, [-14, 0, back.z - 0.4], [14, 0, back.z - 0.4], [14, 4.6, back.z - 0.4], [-14, 4.6, back.z - 0.4]);
    // 皿 3枚と 中身
    const top = k.tex(plateTop());
    const side = k.material(k.tex(once('irside', () => paint(64, 4, (g) => {
      g.rect(0, 0, 64, 4, '#D8D4CC');
      g.rect(0, 1, 64, 1, '#4A6AAA');
      g.rect(0, 3, 64, 1, '#A8A29A');
    }))));
    const plate = k.material(top);
    PLATES.forEach(([x, y], i) => {
      const at = k.ground(x, y, 0)!;
      const d = at.distanceTo(k.camera.position);
      const r = 26 * k.pxAt(d);
      const g = k.own(new THREE.CylinderGeometry(r, r * 0.8, r * 0.16, 28));
      const m = new THREE.Mesh(g, [side, plate, side]);
      m.position.set(at.x, r * 0.08, at.z);
      m.castShadow = true;
      m.receiveShadow = true;
      k.scene.add(m);
      const fy = r * 0.16 + 0.005;
      if (i === 0) {
        const f = k.own(new THREE.PlaneGeometry(r * 2, r * 2));
        f.rotateX(-Math.PI / 2);
        const nm = new THREE.Mesh(f, k.material(k.tex(nasuTop(!!s.orange))));
        nm.position.set(at.x, fy, at.z);
        nm.receiveShadow = true;
        k.scene.add(nm);
      } else {
        const px = k.pxAt(d) * (i === 1 ? 1.0 : 0.75);
        const img = i === 1 ? myogaImg() : umeImg();
        for (const [dx, dz] of i === 1 ? [[-9, 0], [-1, -3], [8, 2]] : [[-8, 1], [1, -3], [9, 2]])
          k.stand(img, new THREE.Vector3(at.x + dx * px, fy, at.z + dz * px), { px, depth: i === 1 ? 4 : 7 });
      }
    });
    // 天井の ランプ（2D の 暖かい 輪の 中心の 上）と、段階1 の トマトの 灯り（ナスの 皿）
    const c = k.ground(106, 30, 0)!;
    lamp(k, '#ffe0c0', 22, new THREE.Vector3(c.x, 3.4, c.z + 0.5), 0, 2);
    if (s.orange) {
      const n = k.ground(PLATES[0][0], 26, 0)!;
      lamp(k, '#f28a3a', 2.2, new THREE.Vector3(n.x, 1.2, n.z + 0.6), 0, 2);
    }
  },
});
