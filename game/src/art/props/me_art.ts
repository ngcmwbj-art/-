// 目が、暗さに なれるまで（げむきか 10-31 の 案5、events/ch3/kurayami.ts）：深海の 展示室の ケースの 前の 面に
// はった 古い 説明板（3枚）。3枚目は 低い 所（子どもの 目の 高さ）に 小さく。寄り道の 間、まだ 読んで いない 板は
// 光の 地図に うすい 青白い 輪（暗さに なれた 目で、板が ぼんやり 見える。会議 10-31：真っ暗に しない）。

import { registerProp } from './registry';
import { standProp } from './hoshi_kit';

registerProp('prop_me_ita', (opts) => {
  const low = Number(opts.v ?? 0) === 2;
  const w = low ? 8 : 12;
  const h = low ? 6 : 8;
  return standProp(
    w,
    h,
    (p) => {
      p.rect(0, 0, w, h, '#9AA2AE');
      p.rect(1, 1, w - 2, h - 2, '#B8BEC6');
      for (let r = 0; r < (low ? 2 : 3); r++) p.hline(2, w - 3 - ((r * 3) % 4), 2 + r * 2, '#6A7280');
    },
    {
      cx: 8,
      // the low one sits a hand above the floor; the others at a grown-up's chest
      base: low ? 15 : 11,
      foot: 16,
      shadow: 0,
      outline: false,
      extra: {
        light: (g, x, y, env) => {
          const v = Number(opts.v ?? 0);
          if (!env.flag('flag_me_on') || env.flag(`flag_me_ita_${v + 1}`)) return;
          const k = 0.5 + 0.5 * Math.sin(env.t / 700 + v);
          const cy = y + (low ? 12 : 8);
          g.alpha(0.18 + 0.12 * k, () => g.circle(x + 8, cy, 13, '#8EA4C4'));
          g.alpha(0.2 + 0.1 * k, () => g.circle(x + 8, cy, 7, '#B8C8E0'));
        },
      },
    },
  );
});
