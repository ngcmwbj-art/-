// 上の 柵ぞいの 見回り（02_ch2_index #99、52 4.9）の 絵。
//
//   ・柵の 上の 物（map_hoshi_sakuzoi の 電気柵 行6。efence の 線は 地面から 3px と 6px、支柱は 32px ごと）：
//     クズの つる（森から のびて 下の 線に 巻きつく。刈った あとは 根もとの 切り株と しおれた 葉）、
//     杉の 枝（2段の 線に のる）、掘られた 土（下の 線の 下の くぼみ。直した あとは ならした 土と 細かい 足の あと）、
//     内側の 畦草（行7 の 畦から 北へ 倒れて 下の 線に さわる。刈った あとは 短い 株）。
//   ・支柱の 番号札（1〜8、マサルの 字）、区間の スイッチの 箱（入／切）。
//   ・森の 目（シカ・タヌキ）：ササの 奥の 顔の 影と 目の 光。こわく しない（耳と 顔の 形で 動物と わかる）。
//   ・大写し「畦」の 草と 豆（豆は ashiato_art の bean）。

import { PixelCanvas, mix } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { h01 } from '../tiles/noise';
import { registerProp, staticProp } from './registry';
import { standProp } from './hoshi_kit';
import { bean } from './ashiato_art';

const cache = new Map<string, HTMLCanvasElement>();
function cached(key: string, build: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) cache.set(key, (c = build()));
  return c;
}

const KUZU = { lt: P.leafLt, base: P.leafYoung, dk: P.leaf, sh: P.leafShade, vine: mix(P.brassOld, P.wood, 0.5), wilt: mix(P.brassOld, P.leafShade, 0.45) };
const SOIL = { lt: mix(P.woodLt, P.wood, 0.4), base: P.wood, dk: P.woodDark, deep: mix(P.woodDark, P.ink, 0.5) };

/** A kudzu leaf: three broad lobes (5×4 round), lit from the top left. */
function kuzuLeaf(p: PixelCanvas, cx: number, cy: number, seed: number): void {
  const lobe = (x: number, y: number) => {
    p.rect(x - 1, y - 1, 3, 3, KUZU.base);
    p.set(x - 1, y - 1, KUZU.lt);
    p.set(x, y - 1, h01(x, y, seed) < 0.5 ? KUZU.lt : KUZU.base);
    p.set(x + 1, y + 1, KUZU.dk);
    p.set(x, y + 1, KUZU.dk);
  };
  lobe(cx, cy - 2);
  lobe(cx - 2, cy + 1);
  lobe(cx + 2, cy + 1);
  p.set(cx, cy, KUZU.sh);
}

// ---------------------------------------------------------------- クズの つる（柵の 上）

/**
 * 28×24, the fence's foot on the canvas's row h−1 (prop at the fence tile, base 13):
 * the lower wire at row h−4, the upper at h−7. cut：根もとの 切り株と、しおれた 葉が 2〜3枚（地面に）。
 */
registerProp('prop_saku_kuzu', (opts) => {
  const v = Number(opts.v ?? 0);
  const cut = !!opts.cut;
  const W = 28;
  const H = cut ? 8 : 24;
  return standProp(
    W,
    H,
    (p) => {
      if (cut) {
        // the stumps by the fence's foot (forest side) and the wilted leaves lying
        p.vline(6, H - 5, H - 2, KUZU.vine);
        p.vline(15, H - 4, H - 2, KUZU.vine);
        p.set(6, H - 6, KUZU.lt);
        p.set(15, H - 5, KUZU.lt);
        for (const [x, y] of [[10, H - 3], [20, H - 2], [3, H - 2]] as [number, number][]) {
          p.rect(x - 1, y - 1, 3, 2, KUZU.wilt);
          p.set(x + 1, y, mix(KUZU.wilt, P.ink, 0.3));
        }
        return;
      }
      const lw = H - 4;
      const uw = H - 7;
      // the vines: down from the forest (top left), along the lower wire, twisting round it
      const vine = (x0: number, y0: number, x1: number, y1: number) => p.line(x0, y0, x1, y1, KUZU.vine);
      vine(4 + v, 0, 8, uw);
      vine(8, uw, 10, lw);
      for (let x = 10; x < W - 2; x++) {
        // the twist: over and under the wire every 3 px
        const k = (x + v) % 6;
        p.set(x, lw + (k < 3 ? -1 : 1), KUZU.vine);
        if (k === 0 || k === 3) p.set(x, lw, KUZU.vine);
      }
      vine(16, 2, 18, uw);
      vine(18, uw, 20, uw + 1);
      for (let x = 18; x < 25; x++) p.set(x, uw + ((x + v) % 4 < 2 ? -1 : 1), KUZU.vine);
      // a tendril curling at the end
      p.set(W - 2, lw - 2, KUZU.lt);
      p.set(W - 3, lw - 3, KUZU.lt);
      // the leaves: a heap at the top (still in the wood's edge), more along the wire
      const leaves: [number, number][] = [
        [5, 4], [10, 3], [3, 9], [14, 7], [19, 4], [8, 12], [22, 10], [13, uw - 2], [24, lw - 3], [17, lw - 3], [6, lw - 4],
      ];
      leaves.forEach(([x, y], i) => kuzuLeaf(p, x + ((i + v) % 2), y, 70 + i + v * 13));
    },
    { cx: 8, base: 13, foot: 12, soft: true },
  );
});

// ---------------------------------------------------------------- 杉の 枝（2段の 線に のる）

registerProp('prop_saku_eda', () =>
  standProp(
    40,
    20,
    (p) => {
      const H = 20;
      const lw = H - 4;
      const uw = H - 7;
      // the stick: from the ground on the forest side (left) up over both wires, its tip past them
      const stem = (x0: number, y0: number, x1: number, y1: number) => {
        p.line(x0, y0, x1, y1, P.woodDark);
        p.line(x0, y0 - 1, x1, y1 - 1, P.wood);
      };
      stem(2, H - 2, 14, lw);
      stem(14, lw, 26, uw - 1);
      stem(26, uw - 1, 37, uw - 4);
      // cedar sprays: short dark-green needles in fans along the stick
      const spray = (x: number, y: number, n: number, seed: number) => {
        for (let i = 0; i < n; i++) {
          const dx = i - (n >> 1);
          const yy = y - 2 - (Math.abs(dx) < 2 ? 1 : 0);
          p.line(x + dx, yy, x + dx * 2, yy - 2, h01(x + i, y, seed) < 0.5 ? P.leafShade : mix(P.leafShade, P.ink, 0.3));
          p.set(x + dx * 2, yy - 2, P.leafDeep);
        }
      };
      spray(9, lw + 2, 5, 1);
      spray(19, lw - 1, 5, 2);
      spray(28, uw - 1, 4, 3);
      spray(34, uw - 3, 3, 4);
      // a few dry brown needles (the branch fell some time ago)
      p.set(23, uw - 4, P.brassOld);
      p.set(31, uw - 6, P.brassOld);
    },
    { cx: 8, base: 13, foot: 12, soft: true },
  ),
);

// ---------------------------------------------------------------- 掘られた 土（下の 線の 下）

/**
 * 24×10, lying at the fence's foot: the hollow a boar's snout dug under the
 * lower wire (dark inside, clods thrown to the forest side, snout scrapes).
 * fixed：土を 寄せて ならした あと（少し 色の ちがう 土と、細かい 足の 点が 2列に たくさん）。
 */
registerProp('prop_saku_hole', (opts) => {
  const fixed = !!opts.fixed;
  const p = new PixelCanvas(24, 10);
  if (fixed) {
    p.ellipse(12, 5, 10, 3, SOIL.lt);
    p.ellipse(12, 5, 8, 2, mix(SOIL.lt, SOIL.base, 0.4));
    // グソっ君's many feet: two rows of tiny dots, again and again
    for (let i = 0; i < 9; i++) {
      p.set(4 + i * 2, 4, SOIL.dk);
      p.set(5 + i * 2, 6, SOIL.dk);
    }
  } else {
    // the clods thrown north (up), the hollow under the wire, its dark bottom
    for (const [x, y] of [[3, 1], [7, 0], [16, 1], [20, 2], [11, 0]] as [number, number][]) {
      p.rect(x, y, 2, 2, SOIL.base);
      p.set(x, y, SOIL.lt);
    }
    p.ellipse(12, 6, 9, 3, SOIL.dk);
    p.ellipse(12, 6, 7, 2, SOIL.deep);
    p.hline(5, 19, 3, SOIL.lt);
    // snout scrapes along the rim
    p.line(4, 7, 8, 5, SOIL.lt);
    p.line(15, 5, 19, 7, SOIL.lt);
  }
  // world: the canvas's top at the tile's row 8 → its middle under the fence's foot (row 12)
  return staticProp(p.toCanvas(), -4, 7, 7);
});

// ---------------------------------------------------------------- 内側の 畦草（行7 の 畦 → 下の 線へ）

/**
 * 20×24 at the ridge's tile (row 7, base 13): tall grass blades leaning north
 * up to the lower wire (world y = row 6 + 9 px: 19 px above this foot). cut：短い 株。
 */
registerProp('prop_saku_azekusa', (opts) => {
  const cut = !!opts.cut;
  const v = Number(opts.v ?? 0);
  const H = cut ? 6 : 24;
  return standProp(
    20,
    H,
    (p) => {
      const n = 7;
      for (let i = 0; i < n; i++) {
        const x0 = 3 + i * 2 + ((i + v) % 2);
        if (cut) {
          p.vline(x0, H - 4, H - 1, i % 2 ? P.leafDeep : P.leaf);
          p.set(x0, H - 4, P.leafLt);
          continue;
        }
        // the blades go up and lean north-east / north-west; the tips reach the wire (canvas row 4)
        const lean = ((i + v) % 3) - 1;
        const top = 3 + ((i * 5 + v) % 3);
        let x = x0;
        for (let y = H - 1; y >= top; y--) {
          p.set(x, y, y > H - 6 ? P.leafShade : i % 2 ? P.leafDeep : P.leaf);
          if ((H - y) % 5 === 4) x += lean;
        }
        p.set(x, top, P.leafLt);
        // a seed head on some (畦の イネ科の 草)
        if (i % 3 === 1) {
          p.set(x, top - 1, P.goldPale);
          p.set(x + 1, top, P.brassOld);
        }
      }
    },
    { cx: 8, base: 13, foot: 12, soft: true, outline: !cut },
  );
});

// ---------------------------------------------------------------- 支柱の 番号札

/** 3×5 digits for the plates (1–8). */
const DIGITS: Record<number, string[]> = {
  1: ['.x.', 'xx.', '.x.', '.x.', 'xxx'],
  2: ['xx.', '..x', '.x.', 'x..', 'xxx'],
  3: ['xx.', '..x', '.x.', '..x', 'xx.'],
  4: ['x.x', 'x.x', 'xxx', '..x', '..x'],
  5: ['xxx', 'x..', 'xx.', '..x', 'xx.'],
  6: ['.xx', 'x..', 'xx.', 'x.x', '.x.'],
  7: ['xxx', '..x', '.x.', '.x.', '.x.'],
  8: ['.x.', 'x.x', '.x.', 'x.x', '.x.'],
};

/** A white plate wired to the post (the post at the tile's x 9), the number in marker. */
registerProp('prop_saku_fuda', (opts) => {
  const n = Math.max(1, Math.min(8, Number(opts.n ?? 1)));
  const p = new PixelCanvas(6, 8);
  p.rect(0, 0, 5, 7, P.white);
  p.vline(5, 1, 7, P.concrete);
  p.hline(1, 5, 7, P.concrete);
  DIGITS[n].forEach((row, y) => {
    for (let x = 0; x < 3; x++) if (row[x] === 'x') p.set(1 + x, 1 + y, P.ink);
  });
  // the wire tie on the post
  p.set(0, 2, P.steel);
  // the post's x 9 → the plate just right of it, from 4 px down the post
  return staticProp(p.toCanvas(), 11, 4, 12);
});

// ---------------------------------------------------------------- 区間の スイッチ

/** A grey box on a stake, its lever up (入) or down (切), a small red lamp when on. */
registerProp('prop_saku_switch', (opts) => {
  const on = opts.on !== false && opts.on !== 0;
  return standProp(
    12,
    22,
    (p) => {
      // the stake
      p.rect(5, 8, 2, 14, P.wood);
      p.vline(5, 8, 21, P.woodLt);
      // the box
      p.rect(1, 2, 10, 9, P.steel);
      p.hline(1, 10, 2, P.concreteLt);
      p.vline(10, 3, 10, P.asphalt);
      p.hline(1, 10, 10, P.asphalt);
      // the label strip (黄色: the fence's colour)
      p.rect(2, 3, 5, 2, P.gold);
      // the lever: up = 入, down = 切
      p.rect(7, on ? 3 : 7, 2, 3, P.charcoal);
      p.set(7, on ? 3 : 9, P.ink);
      // the wire out to the fence
      p.line(1, 9, 0, 13, P.charcoal);
    },
    { cx: 8, base: 16, foot: 15 },
  );
});

// ---------------------------------------------------------------- 森の 目

/**
 * The face in the bamboo grass, 24×20, the eyes at (8–9, 9) and (14–15, 9):
 * 'shika' (big ears out to the sides, a long face down to a dark nose, the
 * eyes wide apart, their shine pale green) or 'tanu' (a round head, small
 * round ears, the dark mask across the eyes, a pale muzzle, the shine
 * yellow). Lit a little by the lantern from below (a warm lower edge); the
 * leaves of the ササ cross in front. Never fierce: round eyes, no teeth.
 */
export function moriMe(kind: 'shika' | 'tanu', blink: boolean): HTMLCanvasElement {
  return cached(`me:${kind}:${blink}`, () => {
    const p = new PixelCanvas(24, 20);
    const shine = kind === 'shika' ? '#D8F0B8' : '#F6E08A';
    if (kind === 'shika') {
      const fur = '#6A5644';
      const furLt = '#8A7058';
      const furDk = '#4A3C32';
      // the ears, out and a little up (their inside pale)
      p.poly([[0, 5], [6, 6], [7, 9], [2, 9]], fur);
      p.poly([[23, 5], [17, 6], [16, 9], [21, 9]], fur);
      p.set(3, 7, '#B89A80');
      p.set(4, 7, '#B89A80');
      p.set(19, 7, '#B89A80');
      p.set(20, 7, '#B89A80');
      // the head, narrowing to the muzzle
      p.rect(7, 4, 10, 8, fur);
      p.hline(8, 15, 4, furLt);
      p.rect(8, 12, 8, 3, fur);
      p.rect(9, 15, 6, 3, furDk);
      p.rect(10, 16, 4, 2, '#2A2420');
      // the pale chin and the forehead's light
      p.hline(10, 13, 14, furLt);
      p.set(11, 5, furLt);
      p.set(12, 5, furLt);
    } else {
      const fur = '#6E6258';
      const furLt = '#9A8C7A';
      // small round ears, a round head
      p.circle(6, 5, 2, fur);
      p.circle(17, 5, 2, fur);
      p.set(6, 5, '#3A3430');
      p.set(17, 5, '#3A3430');
      p.ellipse(12, 11, 8, 7, fur);
      p.hline(7, 16, 5, furLt);
      // the dark mask round the eyes, the pale muzzle and cheeks
      p.rect(5, 8, 14, 4, '#2E2A28');
      p.rect(9, 12, 6, 4, '#C8BCA8');
      p.rect(4, 12, 3, 2, furLt);
      p.rect(17, 12, 3, 2, furLt);
      p.rect(11, 13, 2, 2, '#2A2420');
    }
    if (!blink) {
      p.rect(8, 9, 2, 2, shine);
      p.rect(14, 9, 2, 2, shine);
      p.set(8, 9, '#FFFFF4');
      p.set(14, 9, '#FFFFF4');
    } else {
      p.hline(8, 9, 10, '#2A2420');
      p.hline(14, 15, 10, '#2A2420');
    }
    // the ササ's blades across the lower face
    for (const [x0, y0, x1, y1] of [[0, 19, 6, 13], [5, 19, 9, 15], [16, 19, 21, 14], [21, 19, 23, 16]] as [number, number, number, number][])
      p.line(x0, y0, x1, y1, '#3E5A3A');
    return p.toCanvas();
  });
}

// ---------------------------------------------------------------- 大写し「畦」

/** A clump of narrow-leaved ridge grass (14×26), its tips leaning north to the wire. */
export function azeGrass(seed: number, lit: boolean): HTMLCanvasElement {
  return cached(`azeg:${seed}:${lit}`, () => {
    const p = new PixelCanvas(14, 26);
    const c1 = lit ? P.leaf : mix(P.leafShade, P.ink, 0.35);
    const c2 = lit ? P.leafDeep : mix(P.leafShade, P.ink, 0.5);
    const tip = lit ? P.leafLt : mix(P.leafDeep, P.ink, 0.3);
    for (let i = 0; i < 6; i++) {
      const x0 = 2 + i * 2;
      const lean = ((i + seed) % 3) - 1;
      const top = 1 + ((i * 7 + seed) % 5);
      let x = x0;
      for (let y = 25; y >= top; y--) {
        p.set(x, y, i % 2 ? c2 : c1);
        if ((25 - y) % 6 === 5) x += lean;
      }
      p.set(x, top, tip);
      if ((i + seed) % 3 === 0) p.set(x, top - 1 < 0 ? 0 : top - 1, lit ? P.goldPale : c2);
    }
    return p.toCanvas();
  });
}

/** A soybean plant on the ridge (the trefoil leaves, small pods), 2 plants side by side, 18×16. */
export function azeMame(seed: number): HTMLCanvasElement {
  return cached(`azem:${seed}`, () => {
    const p = new PixelCanvas(18, 16);
    bean(p, 0, 15, false, seed);
    bean(p, 8, 15, false, seed + 3);
    return p.toCanvas();
  });
}

/** The cut stubble (the grass after the snip), 14×6. */
export function azeStubble(seed: number): HTMLCanvasElement {
  return cached(`azes:${seed}`, () => {
    const p = new PixelCanvas(14, 6);
    for (let i = 0; i < 6; i++) {
      const x = 2 + i * 2;
      p.vline(x, 1 + ((i + seed) % 2), 5, i % 2 ? P.leafDeep : P.leaf);
      p.set(x, 1 + ((i + seed) % 2), P.leafLt);
    }
    return p.toCanvas();
  });
}
