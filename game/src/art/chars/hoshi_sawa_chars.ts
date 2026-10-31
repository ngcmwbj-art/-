// 沢の上（map_hoshi_sawa、02 #65）のフィールドの絵：
//
//  enemy_sekitome           80×40  セキトメのシンボル。分校の子ども（もと・アスカ）が
//                                  沢に積んだプールのせき (14–17,11)。3段に積んだ丸い
//                                  石の、いちばん上の石が顔（小さな目2つ）で、赤い
//                                  水泳帽をかぶり、首から黄色い笛をさげている（監視員）。
//                                  石のすきまから水が細く漏れる（3コマ）。近づくと
//                                  'beckon'：笛を吹く「ピッ」（白い線が2本はじける）。
//                                  キャンバスのまん中がせきのまん中（シンボルは ox −8）。
//  restored_enemy_sekitome  ほどけたあとは、石は飛び石の列（props の
//                           prop_h_sawa_seki_ishi）なので、この絵は空。
//  npc_sawagani             10×7   沢ガニ。赤茶の甲羅、はさみ2つ。横歩き（2コマ）、
//                                  ときどきはさみを1回あげる。

import { PixelCanvas } from '../../engine/pixel';
import { ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import type { Dir } from '../../game/state';
import { buildSprite } from './rig';
import { registerChar, type CharSprite } from './registry';

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const INK = '#2A2440';

function outline(p: PixelCanvas): void {
  const W = p.w;
  const H = p.h;
  const on: boolean[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) on.push(p.alpha(x, y) > 0);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (on[y * W + x]) continue;
      const n = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < W && yy < H && on[yy * W + xx];
      if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) p.set(x, y, INK);
    }
}

/** One round stone (w×h at x, y), lit on the upper left; moss on a few. */
function stone(p: PixelCanvas, x: number, y: number, w: number, h: number, seed: number): void {
  const cx = x + w / 2;
  const cy = y + h / 2;
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) {
      const dx = (xx + 0.5 - cx) / (w / 2);
      const dy = (yy + 0.5 - cy) / (h / 2);
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      const lit = dx + dy * 1.2;
      let c: string = lit < -0.8 ? P.concreteLt : lit < 0 ? P.concrete : lit < 0.8 ? P.steel : P.asphalt;
      if (ihash(xx, yy, seed) % 13 === 0) c = P.steel;
      if (dy < -0.55 && seed % 3 === 0 && ihash(xx, 0, seed) % 3) c = P.leaf;
      p.set(xx, yy, c);
    }
}

type SekiPose = { leak: number; blink?: boolean; whistle?: number };

function sekiFrame(o: SekiPose): HTMLCanvasElement {
  const p = new PixelCanvas(80, 40);
  const X = 8; // the dam's left edge in the canvas (it is 64 wide)
  // bottom row: six stones, the middle row: five, the top: two and the head
  const bottom: [number, number][] = [[0, 12], [11, 11], [21, 12], [32, 11], [42, 12], [53, 11]];
  bottom.forEach(([sx, w], i) => stone(p, X + sx, 28, w, 10, 1401 + i));
  const middle: [number, number][] = [[4, 12], [15, 11], [26, 12], [37, 11], [47, 12]];
  middle.forEach(([sx, w], i) => stone(p, X + sx, 20, w, 10, 1411 + i));
  stone(p, X + 10, 13, 11, 9, 1421);
  stone(p, X + 42, 13, 11, 9, 1423);
  // the head: the biggest round stone in the middle of the top
  stone(p, X + 21, 7, 22, 16, 1425);
  // the red swim cap on its crown (a white stripe), the chin strap
  for (let yy = 4; yy < 12; yy++)
    for (let xx = X + 22; xx < X + 42; xx++) {
      const dx = (xx + 0.5 - (X + 32)) / 10;
      const dy = (yy + 0.5 - 11) / 7;
      if (dx * dx + dy * dy > 1 || yy > 11) continue;
      p.set(xx, yy, yy === 8 ? P.white : dx < -0.4 ? P.vermLt : dx > 0.5 ? P.vermShade : P.red);
    }
  // the eyes (small, dark, a glint of the lantern) — or shut in a blink
  for (const ex of [X + 27, X + 36]) {
    if (o.blink) p.hline(ex, ex + 1, 15, INK);
    else {
      p.rect(ex, 14, 2, 2, INK);
      p.set(ex, 14, '#F7C27A');
    }
  }
  // the yellow whistle hanging on its string under the "chin"
  p.line(X + 29, 18, X + 31, 21, P.white);
  p.line(X + 35, 18, X + 33, 21, P.white);
  p.rect(X + 31, 21, 3, 2, P.gold);
  p.set(X + 34, 21, P.brassOld);
  // water leaking through the gaps (3 frames), falling to the foot
  const gaps = [X + 11, X + 21, X + 32, X + 42, X + 53];
  gaps.forEach((gx, i) => {
    for (let yy = 26 + ((o.leak + i) % 3); yy < 39; yy += 3) p.set(gx, yy, (yy + i) % 2 ? P.white : P.aqua);
  });
  outline(p);
  // the whistle: two white strokes bursting from it (beckon)
  if (o.whistle) {
    const k = o.whistle;
    p.line(X + 35, 22, X + 38 + k, 20 - k, P.white);
    p.line(X + 35, 23, X + 39 + k, 24, P.white);
  }
  return p.toCanvas();
}

registerChar('enemy_sekitome', (): CharSprite => {
  const idle = [0, 1, 2].map((k) => sekiFrame({ leak: k }));
  const blink = sekiFrame({ leak: 0, blink: true });
  const loop = [...idle, ...idle, ...idle, blink, ...idle];
  const beckon = [sekiFrame({ leak: 0, whistle: 1 }), sekiFrame({ leak: 1, whistle: 2 }), idle[2], idle[0], sekiFrame({ leak: 1, whistle: 1 }), idle[2], idle[0], idle[1]];
  const walk = {} as Record<Dir, HTMLCanvasElement[]>;
  const idleD = {} as Record<Dir, HTMLCanvasElement[]>;
  for (const d of DIRS) {
    walk[d] = idle;
    idleD[d] = loop;
  }
  return {
    id: 'enemy_sekitome',
    w: 80,
    h: 40,
    walk,
    idle: idleD,
    idleFrameMs: 180,
    walkFrameMs: 180,
    extra: { beckon: beckon[0] },
    anims: { beckon: { frames: beckon, ms: 160, loop: true } },
    shadow: 0,
  };
});

registerChar('restored_enemy_sekitome', () =>
  buildSprite({ id: 'restored_enemy_sekitome', w: 16, h: 8, mats: {}, draw: () => {}, walkFrames: 1, idle: [{}], shadow: 0 }),
);

// ---- 沢ガニ ------------------------------------------------------------------------------

function crab(step: number, claw: boolean): HTMLCanvasElement {
  const p = new PixelCanvas(12, 9);
  const shell = '#C8643A';
  const lit = '#E8905A';
  const dark = '#8A3A2A';
  // legs (4 a side), alternating
  for (let i = 0; i < 3; i++) {
    const up = (i + step) % 2;
    p.set(1, 5 + i - up, dark);
    p.set(0, 6 + i - up, dark);
    p.set(10, 5 + i - up, dark);
    p.set(11, 6 + i - up, dark);
  }
  // the shell
  p.rect(2, 4, 8, 4, shell);
  p.hline(3, 8, 3, shell);
  p.hline(3, 7, 4, lit);
  p.hline(2, 9, 7, dark);
  // eyes on stalks
  p.set(4, 2, INK);
  p.set(7, 2, INK);
  // the claws (one raised in a greeting now and then)
  p.rect(1, claw ? 1 : 3, 2, 2, shell);
  p.set(1, claw ? 1 : 3, lit);
  p.rect(9, 3, 2, 2, shell);
  outline(p);
  return p.toCanvas();
}

registerChar('npc_sawagani', (): CharSprite => {
  const w0 = crab(0, false);
  const w1 = crab(1, false);
  const up = crab(0, true);
  const walk = {} as Record<Dir, HTMLCanvasElement[]>;
  const idle = {} as Record<Dir, HTMLCanvasElement[]>;
  for (const d of DIRS) {
    walk[d] = [w0, w1];
    idle[d] = [w0, w0, w0, w0, w0, w0, up, up, w0, w0, w0, w0];
  }
  return { id: 'npc_sawagani', w: 12, h: 9, walk, idle, walkFrameMs: 120, idleFrameMs: 250, shadow: 0 };
});
