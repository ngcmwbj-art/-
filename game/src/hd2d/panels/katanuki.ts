// 大写し「型ぬき」（第1章 駄菓子屋 ひのや、ui/katanuki_game.ts KatanukiGame）を HD-2D で。
//
// 型ぬきの 板そのものが 遊びの 中身なので、板の 絵（線・針・ひび・しめり）は 2D の まま。その 下を 3D に：
// 真上から 見た 駄菓子屋の 古い 木の 台（板目・角の すり切れ）に、厚みの ある 型ぬきの 板（上の 面は 2D と
// 同じ 板の 絵、ふちは 砂糖菓子の 断面の 色）が のって、本当の 影を 落とす。板の 上の 面は 2D と 同じ px。
// 右の 列（型の 名前・しめりの めもり）と グソっ君の 1行は 紙の まま。

import * as THREE from 'three';
import { PixelCanvas, mix } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { P } from '../../art/tiles/palette';
import { BOARD_H, BOARD_W, katanukiBoardArt } from '../../ui/katanuki_game';
import { registerPanel3d } from '../panel3d';
import { lamp, once } from './_kit_a';

/** 古い 木の 台（板目、ところどころ 黒ずみ）。 */
function tableImg(): HTMLCanvasElement {
  return once('kt:table', () => {
    const p = new PixelCanvas(64, 64);
    const rng = new Rng(61);
    for (let y = 0; y < 64; y++) {
      const plank = Math.floor(y / 16);
      for (let x = 0; x < 64; x++) {
        const grain = Math.sin(y * 1.7 + plank * 2 + Math.sin(x / 9 + plank) * 1.2);
        let c = grain > 0.55 ? P.woodLt : grain < -0.6 ? mix(P.wood, P.woodDark, 0.5) : mix(P.wood, P.woodLt, 0.45);
        if (y % 16 === 15) c = P.woodDark;
        if (rng.next() > 0.985) c = mix(c, '#3A2A22', 0.6);
        p.set(x, y, c);
      }
    }
    return p.toCanvas();
  });
}

function edgeImg(): HTMLCanvasElement {
  return once('kt:edge', () => {
    const p = new PixelCanvas(16, 4);
    p.fill('#E8B7B3');
    p.hline(0, 15, 0, '#FBE3DC');
    p.hline(0, 15, 3, '#B97E80');
    return p.toCanvas();
  });
}

registerPanel3d('katanuki', {
  cam: { fov: 30, pitch: 90, pos: [0, 8, 0], near: 0.5, far: 40 },
  light: { sun: '#fff0dc', sky: '#f0e8dc', ground: '#b8a890', fog: '#3a3028', sunI: 1.5, hemiI: 1.9, el: 62, az: 210 },
  fog: null,
  // 板の 色は 2D と 同じに（フィールドの 夕方の 仕上げを かけない）
  grade: () => null,
  shadow: { x: 0, z: 0, hw: 5, hd: 4 },
  focus: 0.5,
  tilt: 0.25,
  build(k) {
    k.tiled(tableImg(), -10, 10, -10, 10, 0, Math.round(1 / k.pxAt(8)));
    // 板：上の 面は パネルの 板の 四角（左上 8,6）に ぴったり
    const th = 0.18;
    const a = k.ground(8, 6, th)!;
    const b = k.ground(8 + BOARD_W, 6 + BOARD_H, th)!;
    k.box(a.x, b.x, 0, th, a.z, b.z, { top: katanukiBoardArt(), front: edgeImg(), left: edgeImg(), right: edgeImg(), back: edgeImg() });
    lamp(k, new THREE.Vector3(-2.5, 4, -2), { color: '#ffe8c8', i: 1.2, dist: 14, decay: 1 });
  },
});
