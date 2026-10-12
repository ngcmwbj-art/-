// 第3章の 敵の フィールドの 絵（61 15.1・60 6.1）：
//
//  enemy_nefuda           16×24  ネフダマヨイの シンボル。手書きの 木の 値札が 3枚 重なって 立ち、
//                                割り箸の 足で 歩く（2コマ）。'flip'：止まるたびに 札を 1枚 裏返す。
//                                いちばん上の 札に 墨の 点々（『ひゃく……』）と 点の 目。
//                                右下に 黒い 判「まだ」。光は 真上の 正午。
//  restored_enemy_nefuda  16×12  トロ箱に 刺さった 値札『100円』（思いだした 姿）。

import { PixelCanvas } from '../../engine/pixel';
import type { Dir } from '../../game/state';
import { registerChar, type CharSprite } from './registry';

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const INK = '#2A2440';
const WOOD = '#D8B878';
const WOOD_HI = '#F2D8A0';
const WOOD_DK = '#A88848';

function tag(p: PixelCanvas, x: number, y: number, w: number, h: number, back = false): void {
  p.rect(x, y, w, h, back ? '#B89858' : WOOD);
  p.hline(x, x + w - 1, y, back ? WOOD : WOOD_HI);
  p.hline(x, x + w - 1, y + h - 1, WOOD_DK);
}

function nefudaFrame(o: { step: number; flip?: boolean; blink?: boolean }): HTMLCanvasElement {
  const p = new PixelCanvas(16, 24);
  // chopstick legs (alternating a pixel)
  const a = o.step % 2;
  p.vline(5, 18 - a, 22 - a, '#E8D8B0');
  p.vline(10, 18 - (1 - a), 22 - (1 - a), '#E8D8B0');
  p.set(4, 22 - a, '#E8D8B0');
  p.set(11, 22 - (1 - a), '#B8A880');
  // the three tags: bottom (left), middle (right), top
  tag(p, 2, 13, 10, 6, !!o.flip);
  tag(p, 5, 8, 10, 6);
  tag(p, 3, 2, 10, 7);
  // skewer arms
  p.line(4, 11, 1, 14, '#8A7A4A');
  p.line(14, 11, 15, 14, '#8A7A4A');
  // eyes and the ink of 『ひゃく……』
  if (o.blink) p.hline(5, 9, 4, INK);
  else {
    p.set(5, 4, INK);
    p.set(9, 4, INK);
  }
  p.hline(5, 7, 6, INK);
  p.set(9, 6, INK);
  p.set(11, 6, INK);
  // the black 「まだ」 on the bottom tag
  p.rect(8, 15, 3, 3, '#0B0B14');
  p.set(9, 16, '#C8C2B4');
  p.outline(INK);
  return p.toCanvas();
}

registerChar('enemy_nefuda', (): CharSprite => {
  const walkF = [0, 1].map((step) => nefudaFrame({ step }));
  const blink = nefudaFrame({ step: 0, blink: true });
  const flip = nefudaFrame({ step: 0, flip: true });
  const walk = {} as Record<Dir, HTMLCanvasElement[]>;
  const idle = {} as Record<Dir, HTMLCanvasElement[]>;
  for (const d of DIRS) {
    walk[d] = walkF;
    idle[d] = [walkF[0], walkF[0], walkF[0], blink, walkF[0], flip];
  }
  return {
    id: 'enemy_nefuda',
    w: 16,
    h: 24,
    walk,
    idle,
    idleFrameMs: 260,
    walkFrameMs: 160,
    extra: { flip },
    anims: { flip: { frames: [flip, walkF[0]], ms: 220, loop: false } },
    shadow: 8,
  };
});

registerChar('restored_enemy_nefuda', (): CharSprite => {
  const p = new PixelCanvas(16, 12);
  p.rect(0, 6, 16, 6, '#F4F6F8');
  p.hline(0, 15, 6, '#FFFFFF');
  p.hline(0, 15, 11, '#C8CDD4');
  for (let x = 1; x < 15; x += 2) p.set(x, 5, '#DFF4FA');
  p.rect(5, 0, 6, 6, WOOD);
  p.hline(5, 10, 0, WOOD_HI);
  p.hline(6, 9, 2, INK);
  p.hline(6, 9, 4, INK);
  p.outline(INK);
  const c = p.toCanvas();
  const walk = {} as Record<Dir, HTMLCanvasElement[]>;
  for (const d of DIRS) walk[d] = [c];
  return { id: 'restored_enemy_nefuda', w: 16, h: 12, walk, idle: walk, shadow: 0 };
});
