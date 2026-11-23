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
import { PixelCanvas } from '../../engine/pixel';
import { fillWall, wallPlaster } from '../../art/props/bkit';
import { registerPanel3d, type Kit } from '../panel3d';
import { hGroundImg, lamp, once, paint, ROOM_LAMP } from './_kit_b';

const W = 214;
const H = 112;
/** 2D の 皿の 中心（絵の 左上からの px）。 */
const PLATES: [number, number][] = [
  [36, 30],
  [108, 30],
  [180, 30],
];

/** 皿の 上（上から 見た 円）：白、ふちに 青い 線、まん中が 少し くぼむ。 */
function plateTop(): HTMLCanvasElement {
  return once('irplate', () => {
    const p = new PixelCanvas(48, 48);
    p.circle(24, 24, 23, '#E8E4DC');
    p.ring(24, 24, 21, 21, '#5A7AB8');
    p.circle(24, 24, 18, '#F8F4EC');
    p.circle(24, 24, 14, '#ECE6DA');
    return p.toCanvas();
  });
}

/** 皿の 中身（上から）：ナスの 輪切り（皮の 紫、切り口）。orange：トマトの 灯りの 橙の ふち。 */
function nasuTop(orange: boolean): HTMLCanvasElement {
  return once(`irnasu:${orange}`, () => {
    const p = new PixelCanvas(48, 48);
    for (const [dx, dy] of [[-10, 1], [-3, -4], [4, 2], [11, -2], [-2, 8]]) {
      if (orange) p.circle(24 + dx, 24 + dy, 6, '#F28A3A');
      p.circle(24 + dx, 24 + dy, 5, '#5E2A7A');
      p.circle(24 + dx, 24 + dy, 3, '#C8C890');
      p.set(23 + dx, 21 + dy, '#8A5AA8');
    }
    return p.toCanvas();
  });
}

/** みょうが（立てた つぼみ）・梅干し（丸）の 横からの 絵。 */
function myogaImg(): HTMLCanvasElement {
  return once('irmyoga', () =>
    paint(8, 10, (g) => {
      g.rect(2, 1, 4, 8, '#F59AB0');
      g.rect(1, 3, 6, 5, '#F59AB0');
      g.rect(4, 1, 1, 8, '#E0567A');
      g.px(2, 2, '#FFD8E0');
      g.rect(3, 0, 2, 1, '#E0567A');
    }),
  );
}
function umeImg(): HTMLCanvasElement {
  return once('irume', () =>
    paint(9, 8, (g) => {
      g.circle(4, 4, 4, '#B8242E');
      g.circle(4, 4, 3, '#D83A3A');
      g.px(3, 2, '#FFB0A0');
      g.px(5, 5, '#8A1A24');
      g.px(2, 5, '#A82230');
    }),
  );
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
    const side = k.material(null, { tint: '#D8D4CC' });
    const plate = k.material(top);
    PLATES.forEach(([x, y], i) => {
      const at = k.ground(x, y, 0)!;
      const d = at.distanceTo(k.camera.position);
      const r = 25 * k.pxAt(d);
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
        const px = k.pxAt(d) * (i === 1 ? 1.3 : 0.85);
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
