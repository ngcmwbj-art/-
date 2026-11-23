// 大写し「砂」（第3章 波に 見せる 城、events/ch3/shiro.ts SunaPanel）を HD-2D で（2026-11-23）。
//   suna_kawaki / suna_doro / suna_shittori  その1：手で 押す 砂を 真上から（海水浴場の 砂の 絵＝c3_sand。
//               しめった・水びたしは ぬれた 色）。まわりに 小さな 貝がら・小石・流木の かけら。水の 膜・泡・
//               手・押した 跡は 遊びの 物なので 2D の まま 上に。
//   suna_hama   その2・波：浜の 横から。12:01 の 空と 海（波：animated）、浜の 砂、波打ちぎわの ぬれた 帯、
//               奥に 監視台と パラソル・浮き輪の 山（フィールドの 海水浴場の 小物）。寄せる 波の 泡・城・バケツ・
//               グソっ君は 2D の まま 上に（波の 時間を 変えない）。

import * as THREE from 'three';
import { mix } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { registerPanel3d, type Kit } from '../panel3d';
import { blob, flat, groundImg, noonSea, noonSky, pix, propImg } from './_kit_f';

/** 絵の 大きさ（SunaPanel の 左：SW × CH）。 */
const W = 202;
const H = 112;
/** 浜と 海の さかい（2D の SHORE）。 */
const SHORE = 44;

/** 海水浴場の 砂（フィールドと 同じ 模様）。wet：しめった（0..1）。 */
function sandImg(wet: number): HTMLCanvasElement {
  const base = groundImg('c3_sand', 64, 64);
  return pix(`sr:sand:${wet}`, 64, 64, (p) => {
    const d = base.getContext('2d')!.getImageData(0, 0, 64, 64).data;
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const i = (y * 64 + x) * 4;
        const c = `#${[d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
        p.set(x, y, wet > 0 ? mix(c, '#A89064', wet) : c);
      }
  });
}

function shellImg(): HTMLCanvasElement {
  return pix('sr:shell', 7, 6, (p) => {
    p.ellipse(3, 3, 3, 2.5, '#F4F1E8');
    p.line(3, 1, 1, 5, '#D8CFC0');
    p.line(3, 1, 5, 5, '#D8CFC0');
    p.rect(2, 0, 3, 1, '#E8DCC8');
  });
}
function pebbleImg(c: string): HTMLCanvasElement {
  return pix(`sr:peb:${c}`, 6, 4, (p) => {
    p.ellipse(3, 2, 2.6, 1.6, c);
    p.hline(2, 3, 1, mix(c, '#FFFFFF', 0.35));
  });
}
function twigImg(): HTMLCanvasElement {
  return pix('sr:twig', 16, 4, (p) => {
    p.line(0, 2, 15, 1, '#8A6444');
    p.line(1, 3, 14, 2, '#6A4A30');
    p.set(9, 0, '#8A6444');
  });
}

/** まわりの 小物（手の 押す 所の まん中は あける）。 */
function scatter(k: Kit, wet: boolean): void {
  const rng = new Rng(wet ? 515 : 513);
  const px = k.pxAt(8);
  const items = [shellImg(), pebbleImg('#8A8A90'), pebbleImg('#A89C88'), shellImg(), twigImg()];
  for (let i = 0; i < 9; i++) {
    let x = rng.next() * W;
    const y = rng.next() * H;
    if (x > 50 && x < 150) x = x < 100 ? 10 + rng.next() * 30 : 162 + rng.next() * 30;
    const at = k.ground(x, y, 0);
    if (!at) continue;
    flat(k, items[i % items.length], at, { px, depth: 2, flip: i % 2 === 1 });
  }
}

const press = (kind: 'kawaki' | 'doro' | 'shittori') =>
  registerPanel3d(`suna_${kind}`, {
    cam: { fov: 30, pitch: 90, pos: [0, 8, 0], far: 100 },
    light: 'noon',
    fog: null,
    shadow: { x: 0, z: 0, hw: 4, hd: 3 },
    focus: 0.5,
    tilt: 0.4,
    build(k) {
      const wet = kind === 'kawaki' ? 0 : kind === 'doro' ? 0.6 : 0.42;
      k.tiled(sandImg(wet), -10, 10, -6, 6, 0, 16);
      scatter(k, kind !== 'kawaki');
    },
  });
press('kawaki');
press('doro');
press('shittori');

registerPanel3d('suna_hama', {
  // 水平線が 2D と 同じ 22px、浜の さかいが 44px
  cam: { fov: 24, pitch: 7.3, pos: [0, 1.6, 0], far: 3000 },
  light: 'noon',
  fog: [200, 3000],
  shadow: { x: 0, z: -9, hw: 8, hd: 7 },
  focus: 0.78,
  tilt: 1.0,
  animated: true,
  fps: 20,
  build(k) {
    k.sky(noonSky());
    const shore = k.ground(W / 2, SHORE, 0)!;
    const zs = shore.z;
    k.bag.sea = k.tiled(noonSea(true), -3000, 3000, -3000, zs + 0.01, -0.02, 7);
    // 浜：波打ちぎわの ぬれた 帯、その 手前の しめった 砂、乾いた 砂
    k.tiled(sandImg(0.5), -40, 40, zs, zs + 1.2, 0, 16);
    k.tiled(sandImg(0.25), -40, 40, zs + 1.2, zs + 3.5, 0, 16);
    k.tiled(sandImg(0.12), -40, 40, zs + 3.5, 2, 0, 16);
    // 奥の 浜の 小物（城と グソっ君の 後ろは あける）
    const put = (id: string, px: number, opts: Record<string, unknown> = {}, scale = 1) => {
      const img = propImg(id, opts, 2);
      const at = k.ground(px, SHORE + 2, 0);
      if (!img || !at) return;
      at.z -= 0.4;
      k.stand(img, at, { px: k.pxAt(-at.z) * scale, depth: 6 });
      blob(k, at.x, 0, at.z, (img.width / 16) * 0.9, 0.4, 0.22);
    };
    put('prop_c3_parasol', 18);
    put('prop_c3_ukiwa_yama', 64);
    put('prop_c3_kanshidai', 186, {}, 0.6);
    // 遠くの 防波堤（左の 奥）
    const conc = groundImg('c3_bouhatei', 64, 16);
    const a = k.atDepth(-10, 22, -160);
    const b = k.atDepth(60, 22, -160);
    if (a && b) k.box(a.x, b.x, -0.5, 1.6, -164, -160, { front: conc, top: conc });
  },
  update(k, t) {
    const sea = k.bag.sea as THREE.Mesh | undefined;
    const map = sea && (sea.material as THREE.MeshLambertMaterial).map;
    if (map) {
      map.offset.y = (t / 8000) % 1;
      map.offset.x = Math.sin(t / 2400) * 0.01;
    }
  },
});
