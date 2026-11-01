// 型ぬき 番付（01_ch1_index の 変更の 記録 2026-10-13）：ひのやの 奥の 壁、クラス写真の 下に 貼られた
// 『型ぬき 名人 番付』（手書き、先週の 夏まつり）。白い 紙に 朱の 題の 帯、5段の 名前（朱の 点が 段）。
// 書きかえの あとは、横綱の 段か 大関の 段に 新しい 札（うすい 木の 色）が 1枚 ふえる
// （flag_katanuki_rank 1 横綱・2 大関）。『名人』は 札の 上に 朱の 点。壁に 平らに 貼る（flat：
// HD-2D でも 壁の 絵と いっしょに 立つ）。map_hinoya の (2,1) に おく。

import { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { registerProp } from './registry';
import type { PropEnv } from './types';

const W = 11;
const H = 16;

function sheet(rank: number, meijin: boolean): HTMLCanvasElement {
  const p = new PixelCanvas(W, H);
  // the paper: a pin at the top, the edges a little darker, curled at the bottom right
  p.rect(0, 1, W, H - 1, P.paper);
  p.hline(0, W - 1, H - 1, P.paperGrid);
  p.vline(W - 1, 1, H - 1, P.paperGrid);
  p.set(W - 1, H - 1, P.woodDark);
  p.set(Math.floor(W / 2), 0, P.steel);
  // the red title band
  p.rect(1, 2, W - 2, 2, P.verm);
  p.hline(2, W - 3, 2, '#FF6A4D');
  // five ranks: a red dot (the rank), the name in ink
  const rows: number[] = [];
  for (let r = 0; r < 5; r++) rows.push(5 + r * 2);
  const extra = rank === 1 ? 0 : rank === 2 ? 1 : -1;
  rows.forEach((y, r) => {
    const yy = extra >= 0 && r > extra ? y + 1 : y;
    if (yy >= H - 1) return;
    p.set(1, yy, P.verm);
    p.hline(3, 3 + ((r * 3 + 5) % 4) + 3, yy, P.ink);
  });
  if (extra >= 0) {
    // the new slip under its rank (light wood), its name in ink
    const y = rows[extra] + 1;
    p.hline(2, W - 2, y, P.woodLt);
    p.hline(3, 7, y, P.woodDark);
    if (meijin) p.set(W - 2, y, P.verm);
  }
  return p.toCanvas();
}

registerProp('in_hi_banzuke', () => {
  const cache = new Map<string, HTMLCanvasElement>();
  return {
    ox: 3,
    oy: 1,
    w: W,
    h: H,
    foot: 0,
    flat: true,
    img: (env: PropEnv) => {
      const rank = env.flag('flag_katanuki_rank');
      const mj = env.flag('flag_katanuki_meijin') > 0;
      const key = `${rank}:${mj}`;
      let c = cache.get(key);
      if (!c) {
        c = sheet(rank, mj);
        cache.set(key, c);
      }
      return c;
    },
  };
});
