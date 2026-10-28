// 穴は、だれかの ごちそうさま（03_ch3_index、events/ch3/tsumeta.ts）の 地図の 絵：海水浴場の 物（段階2、12:01）。
//
//   prop_tm_kai      監視台の まわりの 貝がら（opts.k：ana 小さな まんまるの 穴の ある 白い 二枚貝・kake ふちの 欠けた 貝。平ら）。
//   prop_tm_tsumeta  波打ちぎわの 丸い 巻貝の 殻（ツメタガイ。中は からっぽ。ぬれて ぴかぴか）。
//   prop_tm_chawan   その そばの 砂の お茶わん（砂茶碗：お茶わんを ふせた ような 砂の 輪。平ら。かくし）。
// どれも 生き物は 入って いない。

import { PixelCanvas } from '../../engine/pixel';
import { registerProp } from './registry';
import { outline } from './kit';
import type { PropArt } from './types';

const SHELL = '#F4F1E8';
const SHELL_DK = '#D8CFC0';
const SHELL_RIB = '#C8BCA8';
const HOLE = '#5A4A3A';

registerProp('prop_tm_kai', (opts) => {
  const k = String(opts?.k ?? 'ana');
  const W = 10;
  const H = 7;
  const p = new PixelCanvas(W, H);
  // a small white fan of a bivalve, its ribs, the hinge at the top
  p.ellipse(5, 4, 4, 2, SHELL);
  p.hline(3, 7, 2, SHELL);
  p.set(5, 1, SHELL_DK);
  p.set(3, 4, SHELL_RIB);
  p.set(7, 4, SHELL_RIB);
  p.hline(3, 7, 6, SHELL_RIB);
  if (k === 'ana') {
    // the one small round hole
    p.set(5, 3, HOLE);
  } else {
    // the edge chipped away (a ragged notch at the rim, no hole)
    p.set(8, 4, 0);
    p.set(8, 5, 0);
    p.set(7, 6, 0);
    p.set(7, 5, SHELL_RIB);
  }
  outline(p, { soft: true });
  const img = p.toCanvas();
  return { ox: 3, oy: 8, w: W, h: H, foot: 14, flat: true, img: () => img } satisfies PropArt;
});

registerProp('prop_tm_tsumeta', () => {
  const W = 10;
  const H = 8;
  const p = new PixelCanvas(W, H);
  // a round, smooth moon-snail shell lying on the wet sand: the low spire, the big last whorl, the glint
  p.ellipse(5, 4, 4, 3, '#B89A7A');
  p.ellipse(4, 4, 3, 2, '#CDB090');
  p.ring(5, 4, 2, 1, '#9A7C5E');
  p.set(5, 4, '#8A6C50');
  p.set(3, 2, '#FFF6E8');
  p.set(4, 2, '#F4E4D0');
  // the opening underneath (empty), a dark crescent at the bottom right
  p.hline(6, 8, 7, '#6A5440');
  outline(p, { soft: true });
  const img = p.toCanvas();
  return { ox: 3, oy: 8, w: W, h: H, foot: 14, flat: true, img: () => img } satisfies PropArt;
});

registerProp('prop_tm_chawan', () => {
  const W = 14;
  const H = 7;
  const p = new PixelCanvas(W, H);
  // a ring of sand set hard, like a bowl turned over (only its rim shows above the sand)
  p.ellipse(7, 4, 6, 2, '#B8A47C');
  p.ellipse(7, 4, 4, 1, '#D8C69C');
  p.hline(3, 10, 2, '#CDB88E');
  p.set(2, 4, '#A89468');
  p.set(12, 4, '#A89468');
  const img = p.toCanvas();
  return { ox: 1, oy: 8, w: W, h: H, foot: 14, flat: true, img: () => img } satisfies PropArt;
});
