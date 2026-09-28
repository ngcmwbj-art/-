// 南の列の部屋の絵（2）：シャッターの3軒と公園のトイレ。30_level_art 4.10〜4.13。
//   map_sk_storage  商店会の倉庫（元 クリーニング、シャッター1）
//   map_sk_rest     ひと休み処（元 たばこ屋、シャッター2）
//   map_sk_bait     閉店した つりえさ屋（シャッター3）
//   map_park_toilet 公園のトイレ（明るく、清潔に。こわくしない）

import type { Gfx } from '../../engine/gfx';
import { P } from '../tiles/palette';
import { ihash, valueNoise } from '../tiles/noise';
import { cardboard, notice, prop } from './ifurn';
import { dust, screenPool, warmPool } from './ishell';
import { castRight, dk, finish, lt } from './kit';
import { mkFrames, stand } from './pkit';
import { registerProp } from './registry';
import { fontTextSmall, printLines, tiny } from './text';
import type { PropArt, PropEnv } from './types';
import { box, frameOn, pcv, southShell, wallClock } from './int_south_kit';

const noFoot = { base: 16, contact: 0, shadow: 0 };

// =====================================================================================
// 商店会の倉庫（map_sk_storage, 9×7）: ブロックの壁、元クリーニング屋のレールと料金表、
// 夏まつりの提灯・やぐら・みこし・太鼓、丸めた引退セレモニーの垂れ幕。
// =====================================================================================

southShell({
  id: 'in_sk_shell',
  map: 'map_sk_storage',
  wall: (x, y, fh) => {
    // concrete block, the cleaning shop's aqua tile band left at the foot
    if (y >= fh - 9) return x % 6 === 5 || (y - (fh - 9)) % 6 === 5 ? P.concrete : P.aqua;
    const by = Math.floor(y / 7);
    const bx = Math.floor((x + (by % 2) * 8) / 16);
    if (y % 7 === 6 || (x + (by % 2) * 8) % 16 === 15) return P.steel;
    return ihash(bx, by, 5701) % 5 === 0 ? P.concreteLt : valueNoise(x / 4, y / 4, 5702) > 0.82 ? P.concreteLt : P.concrete;
  },
  trim: P.steel,
  base: P.asphalt,
  baseH: 2,
  section: P.nightShade,
  decor: (p) => {
    // (2–4,0–1) the retirement ceremony banner, rolled and tied, hung on two hooks
    const bx = 30;
    const by = 12;
    p.rect(bx, by, 44, 7, P.white);
    p.hline(bx, bx + 43, by, P.glint);
    p.hline(bx, bx + 43, by + 6, P.concrete);
    p.ellipse(bx + 43, by + 3, 2, 3.5, P.concreteLt);
    p.ring(bx + 43, by + 3, 2, 3.5, P.concrete);
    // the end of the text showing: 『……ナリくん 引退 セレモ……』 (red, cut off by the roll)
    for (let i = 0; i < 6; i++) p.rect(bx + 4 + i * 6, by + 2, 4, 3, i % 3 === 1 ? P.verm : P.red);
    p.vline(bx + 10, by - 3, by, P.steel);
    p.vline(bx + 34, by - 3, by, P.steel);
    p.hline(bx + 20, bx + 22, by, P.gold);
    p.hline(bx + 20, bx + 22, by + 6, P.gold);
    castRight(p, bx, by, 45, 7, 2);
    // (7,0–1) the cleaning shop's price list, faded, 『はっぴ 無料（商店会）』 added in marker
    p.rect(112, 6, 14, 20, P.paper);
    p.rect(112, 6, 14, 3, P.blue);
    printLines(p, 113, 10, 12, 5, P.concrete, 71);
    p.hline(113, 123, 22, P.verm);
    p.hline(113, 119, 24, P.verm);
    castRight(p, 112, 6, 14, 20, 2);
    // a strip of old 『クリーニング』 tape on the floor by the door, dust and a lost button
    p.rect(52, 86, 20, 2, P.concrete);
    p.set(90, 70, P.gold);
    p.set(40, 60, P.steel);
  },
  town: [38, 31],
  bld: [35, 39, 26],
  skin: [P.concreteLt, P.concrete, P.steel],
  roof: 'tin',
  seed: 5801,
  lamps: [{ x: 72, y: 60, rx: 38, ry: 18, col: P.white, tube: 5803, a: 0.12 }],
  spill: P.sky,
  over(g, x, y, env) {
    // dust turning in the light from the wicket door (stops in stage 1)
    dust(g, x + 50, y + 60, 40, 30, -0.3, 7, env.mt, 5805, 0.35);
  },
});

// (1–2,2) the garment rail of the cleaning shop, one bagged happi left on it
registerProp('in_sk_rail', () => {
  const frames = mkFrames(2, 32, 40, (p, k) => {
    // the rail on its wall brackets
    p.hline(1, 30, 2, P.steel);
    p.hline(1, 30, 3, P.asphalt);
    p.vline(2, 0, 4, P.charcoal);
    p.vline(29, 0, 4, P.charcoal);
    // empty hangers
    for (const hx of [5, 9, 25]) {
      p.line(hx, 3, hx - 2, 6, P.steel);
      p.line(hx, 3, hx + 2, 6, P.steel);
    }
    // the happi in its plastic bag (the bag puffs out north-east in stage 2)
    const puff = k ? 2 : 0;
    p.set(16, 4, P.steel);
    p.poly([[11, 6], [21 + puff, 6], [22 + puff, 30], [10, 30]], P.navy);
    p.poly([[11, 6], [14, 6], [13, 30], [10, 30]], P.blue);
    p.rect(12, 12, 9, 2, P.white);
    p.set(16, 16, P.white);
    p.set(17, 17, P.verm);
    for (let y = 6; y < 31; y += 3) p.set(21 + puff, y, P.glint);
    p.line(12, 7, 12, 29, P.aqua);
    p.hline(10, 22 + puff, 30, P.concreteLt);
    // boxes stacked under the rail
    cardboard(p, 2, 30, 12, 10, 3, 7);
    cardboard(p, 18, 32, 12, 8, 3, 8);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 16, base: 16, contact: 0, shadow: 0 });
  a.img = (env: PropEnv) => frames[env.stage === 2 ? 1 : 0];
  return a;
});

// (4–6,2) the lantern boxes and the yagura's poles; a fish balloon tied to them
// bobs (stops in stage 1); the lanterns turn to face north-east in stage 2
registerProp('in_sk_lantern', () => {
  const frames = mkFrames(3, 48, 44, (p, k) => {
    // poles leaning on the wall, bundled with rope
    for (const [x0, x1] of [[4, 8], [7, 10], [40, 44]] as [number, number][]) {
      p.line(x0, 4, x1, 43, P.woodLt);
      p.line(x0 + 1, 4, x1 + 1, 43, P.wood);
    }
    p.hline(5, 11, 20, P.brass);
    // stacked boxes 『提灯』
    cardboard(p, 10, 26, 16, 18, 4, 11);
    cardboard(p, 26, 30, 14, 14, 4, 12);
    cardboard(p, 12, 14, 14, 12, 4, 13);
    fontTextSmall(p, '提', 15, 30, P.verm, 2);
    // the lanterns out of the boxes: one half pulled open (stage 1: stuck like that)
    const ne = k === 2;
    for (const [lx, ly] of [[31, 21], [37, 24]] as [number, number][]) {
      p.ellipse(lx, ly, 3.5, 4.5, P.white);
      for (let j = ly - 3; j <= ly + 3; j += 2) p.hline(lx - 3, lx + 3, j, P.red);
      p.rect(lx - 2, ly - 6, 5, 2, P.charcoal);
      p.rect(lx - 2, ly + 5, 5, 1, P.charcoal);
      if (ne) p.set(lx + 2, ly - 1, P.ink);
      else p.set(lx - 1, ly - 1, P.ink);
    }
    // the fish balloon (金魚の風船) on its string
    const by = k === 1 ? 2 : 3;
    p.line(22, 14, 21, by + 5, P.concrete);
    p.ellipse(21, by + 2, 3, 2.5, P.red);
    p.set(24, by + 2, P.vermLt);
    p.set(25, by + 1, P.vermLt);
    p.set(25, by + 3, P.vermLt);
    p.set(20, by + 1, P.white);
    p.set(19, by + 2, P.ink);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 24, base: 16, contact: 0, shadow: 0 });
  a.img = (env: PropEnv) => (env.stage === 2 ? frames[2] : env.stage === 1 ? frames[0] : frames[Math.floor(env.mt / 900) % 2]);
  return a;
});

// (2–3,4) the children's mikoshi: cardboard and gold paper on two carrying poles
registerProp('in_sk_mikoshi', () =>
  prop(34, 28, (p) => {
    // poles (the names taped along them)
    p.hline(0, 33, 20, P.woodLt);
    p.hline(0, 33, 21, P.wood);
    p.hline(0, 33, 25, P.woodLt);
    p.hline(0, 33, 26, P.wood);
    for (let i = 2; i < 32; i += 4) p.set(i, 20, P.white);
    // the body: a gold box, the roof, a phoenix of yellow paper
    box(p, 9, 10, 16, 12, P.gold);
    p.rect(11, 12, 12, 7, P.brassOld);
    p.rect(13, 13, 8, 5, P.verm);
    p.poly([[6, 10], [17, 2], [28, 10]], P.charcoal);
    p.line(6, 10, 17, 2, P.asphalt);
    p.hline(6, 28, 10, P.gold);
    p.rect(16, 0, 3, 3, P.gold);
    p.set(17, 0, P.goldPale);
    // tassels
    p.vline(7, 11, 14, P.verm);
    p.vline(27, 11, 14, P.verm);
  }, { cx: 16, base: 15, contact: 0, shadow: 0 }),
);

// (6,4) the big drum under a cloth, on its stand
registerProp('in_sk_taiko', () =>
  prop(18, 24, (p) => {
    p.line(3, 23, 7, 14, P.woodDark);
    p.line(14, 23, 10, 14, P.woodDark);
    p.ellipse(9, 10, 8, 8, P.woodDark);
    p.ellipse(9, 10, 7, 7, P.wood);
    p.ellipse(8, 9, 5.5, 6, P.paperGrid);
    for (let a = 0; a < 12; a++) p.set(Math.round(9 + Math.cos(a * 0.52) * 7), Math.round(10 + Math.sin(a * 0.52) * 7), P.brass);
    // the cloth over the top
    p.poly([[2, 3], [16, 1], [17, 8], [3, 9]], P.lilac);
    p.line(2, 3, 16, 1, P.peach);
    p.set(8, 5, P.shade);
  }, { base: 15, contact: 0, shadow: 0 }),
);

// (1,5) the box of festival leftovers 『まつりの あまり ご自由に どうぞ』
registerProp('in_sk_box', () => {
  const frames = mkFrames(2, 16, 18, (p, k) => {
    // cotton-candy sticks, yo-yo rubber bands, (until taken) the kinakobou
    p.line(4, 0, 5, 8, P.woodLt);
    p.line(7, 1, 7, 8, P.woodLt);
    p.set(10, 5, P.red);
    p.set(11, 5, P.gold);
    p.set(12, 6, P.aqua);
    if (!k) {
      p.line(9, 2, 12, 7, P.brass);
      p.set(9, 2, P.goldPale);
    }
    cardboard(p, 1, 6, 14, 12, 3, 17);
    p.rect(3, 10, 10, 5, P.white);
    printLines(p, 4, 11, 8, 2, P.verm, 73, 1);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 8, base: 16, contact: 0, shadow: 0 });
  a.img = (env: PropEnv) => frames[env.flag('flag_hidden_storage') ? 1 : 0];
  return a;
});

// =====================================================================================
// ひと休み処（map_sk_rest, 9×7）: 元 たばこ屋。板の腰壁と白い壁、掲示板、壁の時計、
// まんがの棚、麦茶の冷蔵庫、らくがき帳、長いす、シャッターの内側の たばこの小窓。
// =====================================================================================

southShell({
  id: 'in_sr_shell',
  map: 'map_sk_rest',
  wall: (x, y, fh) => {
    if (y >= fh - 14) return x % 8 === 7 ? P.woodDark : y === fh - 14 ? P.woodLt : valueNoise(Math.floor(x / 8) * 2, y / 5, 5901) > 0.7 ? P.woodLt : P.wood;
    return valueNoise(x / 6, y / 5, 5902) > 0.8 ? P.white : P.paper;
  },
  trim: P.woodLt,
  base: P.woodDark,
  baseH: 2,
  decor: (p) => {
    // (4,0–1) the cork board: radio exercise, the lost dog found, the torn-off corner of a poster
    p.rect(58, 5, 28, 20, P.woodLt);
    p.strokeRect(57, 4, 30, 22, P.wood);
    for (let j = 6; j < 24; j++) for (let i = 59; i < 85; i++) if (ihash(i, j, 5903) % 9 === 0) p.set(i, j, P.brass);
    notice(p, 60, 7, 9, 11, { paper: P.white, ink: P.steel, head: P.leafYoung, seed: 81, tape: false });
    notice(p, 71, 6, 8, 9, { paper: P.paper, ink: P.blue, head: P.gold, seed: 82, tape: false });
    // the poster torn off: only the pinned corners and a strip of it are left
    p.rect(74, 17, 3, 2, P.gold);
    p.set(81, 17, P.verm);
    p.set(81, 22, P.verm);
    p.set(74, 22, P.verm);
    castRight(p, 57, 4, 30, 22, 2);
    // (1,0–1) 『ひと休み処 ご自由に どうぞ』 on a hanging board
    p.rect(18, 6, 26, 8, P.woodLt);
    p.hline(18, 43, 6, P.goldPale);
    fontTextSmall(p, 'ひと休み処', 19, 5, P.woodDark, 2);
    p.vline(22, 2, 6, P.steel);
    p.vline(40, 2, 6, P.steel);
    castRight(p, 18, 6, 26, 8, 2);
  },
  town: [42, 31],
  bld: [39, 43, 26],
  skin: [P.paper, P.paperGrid, P.woodLt],
  roof: 'tin',
  seed: 5911,
  lamps: [{ x: 64, y: 62, rx: 40, ry: 20, col: P.goldPale, a: 0.13 }],
  spill: P.sky,
});

// (5,1) the wall clock
wallClock('in_sr_clock', { r: 5, rim: P.leafShade, face: P.white, ox: 2, oy: -2 });

// (1–2,2) the manga shelf 『ご自由に お読みください』 (vol. 3 missing; the spines lean north-east in stage 2)
registerProp('in_sr_books', () => {
  const frames = mkFrames(2, 32, 40, (p, k) => {
    box(p, 1, 2, 30, 38, P.woodLt);
    for (const y of [4, 16, 28]) p.rect(3, y, 26, 10, P.woodDark);
    const cols = [P.red, P.blue, P.gold, P.leaf, P.crimson, P.aqua, P.navy, P.sun];
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 12; i++) {
        if (row === 0 && i === 2) continue; // vol. 3
        const x = 4 + i * 2;
        const y0 = 5 + row * 12;
        const c = cols[(i + row * 3) % cols.length];
        if (k) p.line(x, y0 + 1, x + 1, y0 + 8, c);
        else p.rect(x, y0 + 1, 1, 8, c);
        p.set(x, y0 + 4, P.white);
      }
    p.rect(9, 30, 14, 5, P.white);
    printLines(p, 10, 31, 12, 2, P.steel, 83, 1);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 16, base: 16, contact: 0, shadow: 0 });
  a.img = (env: PropEnv) => frames[env.stage === 2 ? 1 : 0];
  return a;
});

// (6,2) the small fridge 『麦茶 ご自由に』 and the paper cups
registerProp('in_sr_fridge', () =>
  prop(16, 28, (p) => {
    box(p, 1, 3, 14, 25, P.white);
    p.hline(2, 13, 12, P.concrete);
    p.vline(12, 5, 10, P.steel);
    p.vline(12, 14, 20, P.steel);
    p.rect(3, 15, 7, 6, P.paper);
    p.hline(4, 8, 17, P.woodDark);
    p.hline(4, 7, 19, P.woodDark);
    // cups upside down on top
    for (const cx of [3, 7, 10]) {
      p.rect(cx, 0, 3, 3, P.paper);
      p.set(cx, 0, P.white);
    }
  }, noFoot),
);

// (7,2) the doodle book on a lectern, the pencil on a string; its pages lift in the draught (not in stage 1)
registerProp('in_sr_note', () => {
  const frames = mkFrames(3, 16, 26, (p, k) => {
    p.vline(8, 12, 25, P.woodDark);
    p.hline(4, 12, 25, P.woodDark);
    p.poly([[1, 8], [15, 8], [14, 13], [2, 13]], P.woodLt);
    p.rect(2, 5, 12, 5, P.white);
    p.vline(8, 5, 9, P.concrete);
    printLines(p, 3, 6, 4, 2, P.steel, 85, 1);
    printLines(p, 9, 6, 4, 2, P.steel, 86, 1);
    if (k) p.poly([[8, 5], [13, 5 - k], [13, 8 - k], [8, 9]], P.paper);
    p.line(14, 10, 15, 18, P.charcoal);
    p.set(15, 19, P.gold);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 8, base: 16, contact: 0, shadow: 0 });
  a.img = (env: PropEnv) => (env.stage === 1 ? frames[1] : frames[[0, 1, 2, 1, 0, 0, 0][Math.floor(env.mt / 260) % 7]]);
  return a;
});

// (3–4,4) the long bench (縁台 style), its seat worn in the middle
registerProp('in_sr_bench', () =>
  prop(32, 14, (p) => {
    box(p, 0, 2, 32, 5, P.woodLt);
    for (let x = 5; x < 32; x += 6) p.vline(x, 3, 5, P.wood);
    p.rect(12, 3, 8, 2, P.goldPale);
    p.rect(2, 7, 2, 7, P.woodDark);
    p.rect(28, 7, 2, 7, P.woodDark);
    p.hline(3, 28, 11, P.wood);
  }, { cx: 16, base: 14, contact: 0, shadow: 0 }),
);

// (1–3,5) the old tobacco window from the inside: the display case against
// the shutter, the little sliding window, the coin tray (a 10-yen coin stuck
// in it until taken), the enamel 『たばこ』 sign leaning on the case
registerProp('in_sr_tabako', () => {
  const frames = mkFrames(2, 48, 22, (p, k) => {
    box(p, 0, 8, 48, 14, P.woodDark);
    p.rect(2, 9, 44, 6, P.shadeDeep);
    p.hline(2, 45, 9, P.steel);
    // empty display: faded price tags only
    for (let i = 4; i < 44; i += 6) p.rect(i, 12, 3, 2, P.paper);
    // the sliding window's frame (the shutter behind it)
    p.rect(14, 0, 20, 8, P.concrete);
    for (let j = 1; j < 8; j += 2) p.hline(15, 32, j, P.steel);
    p.vline(24, 0, 7, P.woodDark);
    // the coin tray
    p.rect(20, 6, 8, 3, P.brassOld);
    p.hline(20, 27, 6, P.brass);
    if (!k) {
      p.set(23, 7, P.gold);
      p.set(24, 7, P.brass);
    }
    // the enamel sign, red on white
    box(p, 36, 1, 10, 9, P.white);
    p.rect(37, 2, 8, 7, P.red);
    fontTextSmall(p, 'た', 37, 1, P.white, 2);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 24, base: 16, contact: 0, shadow: 0 });
  a.img = (env: PropEnv) => frames[env.flag('flag_hidden_rest') ? 1 : 0];
  return a;
});

// =====================================================================================
// 閉店した つりえさ屋（map_sk_bait, 9×7）: 青い壁に白いタイルの帯、魚拓、3月のまま
// のカレンダー、えさの冷蔵ケース、釣りざおの棚、メダカの水槽、レジ台と呼びりん。
// 半分上がったシャッターのすきまから、夕日が床に細くさしこむ。
// =====================================================================================

southShell({
  id: 'in_sb_shell',
  map: 'map_sk_bait',
  wall: (x, y, fh) => {
    if (y >= fh - 12) return x % 5 === 4 || (y - (fh - 12)) % 5 === 4 ? P.concrete : P.white;
    if (y === fh - 13) return P.navy;
    return valueNoise(x / 6, y / 5, 6001) > 0.78 ? P.aqua : P.blue;
  },
  trim: P.concreteLt,
  base: P.steel,
  baseH: 2,
  decor: (p) => {
    // (3,1) the calendar left at March, 31 ringed in red
    p.rect(50, 7, 12, 16, P.white);
    p.rect(50, 7, 12, 4, P.leafShade);
    fontTextSmall(p, '3', 54, 6, P.white, 2);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) p.set(51 + i * 2, 13 + j * 2, P.steel);
    p.ring(58.5, 19.5, 1.5, 1.5, P.verm);
    castRight(p, 50, 7, 12, 16, 2);
    // (6,1) the gyotaku: a crucian carp printed in ink on white paper (turned in stage 2 by a prop over it)
    p.rect(98, 6, 16, 12, P.paper);
    p.strokeRect(97, 5, 18, 14, P.woodDark);
    printLines(p, 99, 15, 8, 1, P.verm, 91, 1);
    castRight(p, 97, 5, 18, 14, 2);
    // a faded 『つり情報』 poster
    notice(p, 18, 6, 12, 14, { paper: P.paper, ink: P.blue, head: P.aqua, seed: 93 });
    // the floor: a drain grate and the damp patch round it
    p.rect(70, 72, 10, 4, P.charcoal);
    for (let i = 71; i < 80; i += 2) p.vline(i, 73, 74, P.asphalt);
    for (let y = 68; y < 82; y++)
      for (let x = 62; x < 90; x++) {
        const d = Math.hypot((x - 75) / 14, (y - 74) / 7);
        if (d < 1 && d > 0.5 && (x + y) % 2 === 0) p.set(x, y, P.steel);
      }
  },
  town: [46, 31],
  bld: [46, 50, 26],
  skin: [P.concreteLt, P.concrete, P.steel],
  roof: 'tin',
  seed: 6011,
  lamps: [{ x: 72, y: 56, rx: 30, ry: 14, col: P.white, tube: 6013, a: 0.06 }],
  spill: P.sky,
  spillA: 0.1,
  over(g, x, y, env) {
    // the evening light through the gap under the half-raised shutter: a thin
    // warm band along the south wall, a sliver of it on the floor, dust in it
    // (the dust stops in stage 1; in stage 2 the light bends north-east)
    const s2 = env.stage === 2;
    const n = env.grade.night;
    const a = 0.4 * (1 - n);
    g.rect(x + 40, y + 92, 96, 3, P.sky, a);
    g.rect(x + 42, y + 89, 92, 3, P.sky, a * 0.5);
    if (s2) for (let i = 0; i < 6; i++) g.rect(x + 60 + i * 12, y + 86 - i * 2, 10, 2, P.sky, a * 0.4);
    warmPool(g, x + 88, y + 92, 50, 6, P.sky, a * 0.4);
    dust(g, x + 44, y + 72, 90, 20, 0.2, 8, env.mt, 6015, 0.4 * (1 - n));
  },
});

// (6,1) the gyotaku's fish (drawn over the paper): facing left; north-east in stage 2
registerProp('in_sb_fish', () => {
  const frames = mkFrames(2, 16, 10, (p, k) => {
    if (!k) {
      p.ellipse(8, 5, 6, 3, P.charcoal);
      p.poly([[13, 5], [16, 2], [16, 8]], P.charcoal);
      p.set(4, 4, P.paper);
      for (let i = 5; i < 12; i += 2) p.set(i, 6, P.asphalt);
    } else {
      p.line(3, 8, 12, 2, P.charcoal);
      p.line(3, 9, 12, 3, P.charcoal);
      p.line(4, 8, 11, 4, P.charcoal);
      p.poly([[2, 9], [0, 7], [4, 10]], P.charcoal);
      p.set(11, 2, P.paper);
    }
  });
  return { ox: 0, oy: 6, w: 16, h: 10, foot: 0, flat: true, img: (env: PropEnv) => frames[env.stage === 2 ? 1 : 0] } as PropArt;
});

// (1–2,2) the bait cooler: a glass-lidded chest, the hand-written signs (empty inside)
registerProp('in_sb_case', () =>
  prop(32, 24, (p) => {
    box(p, 0, 8, 32, 16, P.white);
    p.hline(1, 30, 9, P.concreteLt);
    p.rect(2, 10, 28, 6, P.shadeDeep);
    p.line(4, 11, 8, 11, P.glint);
    p.line(18, 12, 22, 12, P.glint);
    p.hline(1, 30, 17, P.steel);
    p.rect(3, 19, 5, 3, P.aqua);
    // the signs on the wall above it 『ミミズ』『ゴカイ』
    p.rect(3, 0, 11, 6, P.paper);
    p.hline(4, 12, 2, P.woodDark);
    p.hline(4, 9, 4, P.woodDark);
    p.rect(17, 0, 11, 6, P.paper);
    p.hline(18, 26, 2, P.woodDark);
    p.hline(18, 23, 4, P.woodDark);
    p.rect(3, 0, 11, 1, P.white);
  }, { cx: 16, base: 16, contact: 0, shadow: 0 }),
);

// (4–5,2) the rod rack: unsold rods leaning, one tagged 『あずかりもの ワイスタ』, a pegboard of floats and lures
registerProp('in_sb_rods', () => {
  const frames = mkFrames(2, 32, 48, (p, k) => {
    // pegboard
    p.rect(1, 2, 30, 22, P.woodLt);
    for (let j = 4; j < 23; j += 3) for (let i = 3; i < 30; i += 3) p.set(i, j, P.wood);
    // floats (ウキ) and lures
    for (const [fx, fy, c] of [[5, 6, P.red], [10, 8, P.gold], [15, 6, P.leafYoung], [20, 9, P.red], [25, 7, P.aqua]] as [number, number, string][]) {
      p.vline(fx, fy, fy + 4, c);
      p.set(fx, fy + 5, P.white);
      p.set(fx, fy - 1, P.steel);
    }
    // the rods (k=1: all tips to the north-east)
    for (let i = 0; i < 7; i++) {
      const x = 3 + i * 4;
      const tip = k ? x + 6 : x - 1 + (i % 3);
      p.line(tip, 0, x, 47, i === 5 ? P.navy : i % 2 ? P.woodDark : P.charcoal);
      p.rect(x - 1, 38, 2, 5, i % 2 ? P.woodLt : P.steel);
    }
    // the name tag on rod 6
    p.rect(22, 30, 5, 4, P.white);
    p.hline(23, 25, 31, P.navy);
    p.hline(1, 30, 47, P.woodDark);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 16, base: 16, contact: 0, shadow: 0 });
  a.img = (env: PropEnv) => frames[env.stage === 2 ? 1 : 0];
  return a;
});

// (7,2) the medaka tank on a stand: five fish swim (stage 1: still, a bubble held mid-water; stage 2: all face north-east)
registerProp('in_sb_tank', () => {
  const frames: HTMLCanvasElement[] = [];
  for (let k = 0; k < 6; k++) {
    const p = pcv(18, 30);
    box(p, 2, 16, 14, 14, P.woodDark);
    p.hline(3, 14, 22, P.wood);
    // the glass tank
    p.rect(1, 2, 16, 14, P.aqua);
    p.rect(2, 4, 14, 11, P.blue);
    p.hline(2, 15, 4, P.aqua);
    p.hline(1, 16, 15, P.leafShade);
    p.set(4, 13, P.leaf);
    p.vline(4, 9, 13, P.leaf);
    p.vline(13, 10, 14, P.leafDeep);
    p.set(1, 2, P.glint);
    p.vline(1, 3, 8, P.glint);
    const fish: [number, number][] = [[4, 6], [9, 8], [12, 6], [7, 11], [11, 12]];
    fish.forEach(([fx, fy], i) => {
      if (k === 5) {
        p.set(fx + 1, fy - 1, P.gold);
        p.set(fx, fy, P.brassOld);
        return;
      }
      const dx = k === 4 ? 0 : Math.round(Math.sin((k + i * 1.7) * 1.3) * 2);
      const dir = k === 4 ? 1 : (k + i) % 2 ? 1 : -1;
      p.set(fx + dx, fy, P.gold);
      p.set(fx + dx - dir, fy, P.brassOld);
    });
    // bubbles
    const by = k === 4 ? 8 : 14 - ((k * 3) % 10);
    p.set(14, by, P.white);
    if (k < 4) p.set(14, Math.max(4, by - 4), P.glint);
    finish(p, { soft: true });
    frames.push(p.toCanvas());
  }
  const a = stand(frames[0], { cx: 8, base: 16, contact: 0, shadow: 0 });
  a.img = (env: PropEnv) => (env.stage === 1 ? frames[4] : env.stage === 2 ? frames[5] : frames[Math.floor(env.t / 280) % 4]);
  return a;
});

// (6–7,4) the register counter: an old cash register, the brass bell 『ご用の方は 鳴らしてください』
registerProp('in_sb_register', () =>
  prop(32, 26, (p) => {
    box(p, 0, 10, 32, 16, P.wood);
    p.hline(1, 30, 11, P.woodLt);
    p.hline(1, 30, 16, P.woodDark);
    for (let x = 4; x < 30; x += 7) p.vline(x, 17, 24, P.woodDark);
    // the register
    box(p, 3, 1, 14, 10, P.steel);
    p.rect(5, 2, 10, 3, P.ink);
    tiny(p, '0', 11, 2, P.leafYoung);
    for (let j = 6; j < 10; j += 2) for (let i = 5; i < 15; i += 2) p.set(i, j, P.concreteLt);
    // the bell and its card
    p.ellipse(23, 8, 2.5, 1.8, P.brass);
    p.set(22, 7, P.goldPale);
    p.set(23, 5, P.brassOld);
    p.rect(26, 5, 5, 5, P.white);
    p.hline(27, 29, 7, P.steel);
  }, { cx: 16, base: 15, contact: 0, shadow: 0 }),
);

// =====================================================================================
// 公園のトイレ（map_park_toilet, 8×6）: 白い小さなタイルと水色の帯。鏡と洗面台、個室の
// 戸が3つ（空きの緑）、換気扇、傘かけ、掃除用具入れ。明るく、清潔に。
// =====================================================================================

southShell({
  id: 'in_wc_shell',
  map: 'map_park_toilet',
  wall: (x, y, fh) => {
    if (y < 9) return valueNoise(x / 6, y / 4, 6101) > 0.82 ? P.white : P.concreteLt;
    if (y === 9 || y === 10) return P.aqua;
    const ty = y - 11;
    if (x % 5 === 4 || ty % 5 === 4) return P.concreteLt;
    return ihash(Math.floor(x / 5), Math.floor(ty / 5), 6102) % 11 === 0 ? P.aqua : P.white;
  },
  trim: P.white,
  base: P.steel,
  baseH: 2,
  decor: (p, glass) => {
    // (1–2,0–1) mirrors over the basins
    for (const mx of [19, 35]) {
      p.rect(mx - 1, 7, 12, 14, P.steel);
      p.rect(mx, 8, 10, 12, P.aqua);
      glass.rect(mx, 8, 10, 12, '#ffffff');
      p.line(mx + 2, 10, mx + 5, 13, P.white);
      p.set(mx + 7, 9, P.white);
    }
    // (4–6,0–1) three stall doors, pale blue, the green 『空き』 indicators, the thank-you note on the middle one
    for (let i = 0; i < 3; i++) {
      const dx = 66 + i * 16;
      p.rect(dx - 1, 5, 14, 27, P.concrete);
      box(p, dx, 6, 12, 26, P.aqua);
      p.rect(dx + 1, 7, 10, 24, P.aqua);
      p.vline(dx + 1, 7, 30, P.white);
      p.rect(dx + 8, 17, 3, 2, P.leafYoung);
      p.set(dx + 8, 17, P.leafLt);
    }
    notice(p, 84, 10, 9, 7, { paper: P.white, ink: P.steel, head: P.leafYoung, seed: 97, tape: true });
    // the paper-towel box by the mirrors
    box(p, 48, 12, 8, 9, P.white);
    p.rect(50, 19, 4, 3, P.paper);
  },
  town: [1, 3],
  bld: [1, 5, 1],
  skin: [P.concreteLt, P.concrete, P.steel],
  roof: 'slab',
  seed: 6111,
  lamps: [{ x: 64, y: 56, rx: 40, ry: 18, col: P.white, a: 0.16 }],
  spill: P.white,
  spillA: 0.12,
});

// (3,1) the vent fan: turning (stage 0), stopped (stage 1), turning slowly the other way (stage 2)
registerProp('in_wc_fan', () => {
  const frames = mkFrames(3, 14, 14, (p, k) => {
    box(p, 0, 0, 14, 14, P.concreteLt);
    p.rect(2, 2, 10, 10, P.charcoal);
    const pts = [
      [[6, 3], [7, 10], [3, 6], [10, 7]],
      [[3, 3], [10, 10], [3, 10], [10, 3]],
      [[8, 3], [5, 10], [3, 8], [10, 5]],
    ][k];
    for (const [x, y] of pts) {
      p.set(x, y, P.concrete);
      p.set(x + (x < 7 ? 1 : -1), y + (y < 7 ? 1 : -1), P.steel);
    }
    p.set(6, 6, P.white);
    p.set(7, 7, P.concrete);
    for (let j = 2; j < 12; j += 3) p.hline(2, 11, j, P.asphalt);
  });
  return {
    ox: 1,
    oy: -3,
    w: 14,
    h: 14,
    foot: 0,
    flat: true,
    img: (env: PropEnv) => (env.stage === 1 ? frames[1] : env.stage === 2 ? frames[2 - (Math.floor(env.t / 400) % 3)] : frames[Math.floor(env.t / 70) % 3]),
  } as PropArt;
});

// (1–2,2) the basin counter: two basins, taps, soap; the tap drips (a drop hangs in mid-air in stage 1)
registerProp('in_wc_sink', () => {
  const frames = mkFrames(4, 32, 20, (p, k) => {
    box(p, 0, 6, 32, 14, P.white);
    p.hline(1, 30, 7, P.glint);
    for (const bx of [8, 24]) {
      p.ellipse(bx, 10, 5, 2.5, P.concreteLt);
      p.ellipse(bx, 10.5, 4, 1.6, P.aqua);
      p.rect(bx - 1, 3, 2, 4, P.steel);
      p.set(bx - 1, 3, P.white);
      p.hline(bx - 1, bx + 2, 3, P.steel);
    }
    // the soap (green) between them
    p.rect(15, 5, 3, 2, P.leafYoung);
    p.set(15, 5, P.leafLt);
    // the drip from the left tap: k 0..2 falling, 3 = held mid-air
    const dy = k === 3 ? 7 : 7 + k;
    p.set(8, dy, P.aqua);
    if (k === 2) p.set(8, 10, P.white);
    p.hline(1, 30, 19, P.concrete);
    p.rect(3, 13, 26, 6, P.concreteLt);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 16, base: 16, contact: 0, shadow: 0 });
  a.img = (env: PropEnv) => (env.stage === 1 ? frames[3] : frames[Math.floor(env.t / 330) % 3]);
  return a;
});

// (1,4) the umbrella rack 『忘れ物は 交番へ』 (one slot empty in stage 2)
registerProp('in_wc_umbrella', () => {
  const frames = mkFrames(2, 16, 26, (p, k) => {
    box(p, 1, 14, 14, 12, P.steel);
    p.hline(2, 13, 15, P.concreteLt);
    for (let i = 3; i < 14; i += 4) p.vline(i, 16, 24, P.asphalt);
    // umbrellas: clear vinyl, green; a third one only before stage 2
    p.line(4, 2, 4, 15, P.charcoal);
    p.poly([[2, 4], [6, 4], [5, 15], [3, 15]], P.concreteLt);
    p.line(8, 3, 8, 15, P.charcoal);
    p.poly([[6, 5], [10, 5], [9, 15], [7, 15]], P.leaf);
    if (!k) {
      p.line(12, 1, 12, 15, P.charcoal);
      p.poly([[10, 3], [14, 3], [13, 15], [11, 15]], P.navy);
    }
    p.rect(4, 18, 8, 4, P.white);
    printLines(p, 5, 19, 6, 2, P.verm, 99, 1);
  }, (p) => finish(p, { soft: true }));
  const a = stand(frames[0], { cx: 8, base: 16, contact: 0, shadow: 0 });
  a.img = (env: PropEnv) => frames[env.stage === 2 ? 1 : 0];
  return a;
});

// (5,4) the cleaning locker and its card 『本日の 清掃 16:30 済』
registerProp('in_wc_locker', () =>
  prop(16, 32, (p) => {
    box(p, 1, 2, 14, 30, P.concrete);
    p.vline(8, 3, 30, P.steel);
    for (let j = 5; j < 10; j += 2) {
      p.hline(3, 6, j, P.steel);
      p.hline(10, 13, j, P.steel);
    }
    p.rect(3, 14, 4, 5, P.white);
    p.hline(4, 5, 15, P.leaf);
    printLines(p, 3, 17, 4, 1, P.steel, 101, 1);
    p.rect(6, 20, 1, 3, P.charcoal);
    p.rect(9, 20, 1, 3, P.charcoal);
    // a mop head peeking over the top
    p.rect(11, 0, 3, 3, P.paperGrid);
    p.vline(12, 0, 2, P.woodLt);
  }, noFoot),
);

void frameOn;
void lt;
void dk;
void screenPool;
void (null as unknown as Gfx);
