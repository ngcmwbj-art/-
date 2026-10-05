// ヒキヅナの フィールドの 絵（二人十五脚 02 #82、30_level_art 3.17）：運動会の 綱が 地面を 這う
// （波うつ 4コマ。はしを 少し 起こして 進む 向きを 見る。まん中に 赤と 白の 布、はしは 白い テープと 目）。
// restored_enemy_hikizuna：はなまるで 直したあと、倉庫の 前で とぐろを 巻いて まるまっている。

import { PixelCanvas } from '../../engine/pixel';
import type { Dir } from '../../game/state';
import { coilImage } from '../enemies/hikizuna';
import { registerChar, type CharSprite } from './registry';

const HEMP = ['#3A2618', '#5A3A2A', '#8A5A3A', '#A8742A', '#C8A06A', '#E8C890'];
const OUT = '#2A2440';

/** One crawling frame facing right (32×16): the rope's body a travelling wave, the end raised. */
function crawl(k: number): HTMLCanvasElement {
  const p = new PixelCanvas(32, 16);
  const ph = (k / 4) * Math.PI * 2;
  const pts: [number, number][] = [];
  for (let x = 2; x <= 24; x += 0.25) pts.push([x, 11 + 2.2 * Math.sin(x * 0.42 - ph)]);
  // the raised end
  for (let i = 1; i <= 16; i++) pts.push([24 + i * 0.25, 11 + 2.2 * Math.sin(24 * 0.42 - ph) - i * 0.28]);
  pts.forEach(([x, y], i) => {
    for (let dy = -2; dy <= 2; dy++) {
      const X = Math.round(x);
      const Y = Math.round(y + dy);
      const groove = (Math.round(x * 2 + dy) % 4 + 4) % 4 === 0;
      let c = HEMP[dy < 0 ? 5 : dy === 0 ? 4 : dy === 1 ? 3 : 2];
      if (groove) c = HEMP[Math.max(1, HEMP.indexOf(c) - 2)];
      // the centre cloth, the whipped end
      if (x > 12 && x < 14.2) c = Math.abs(x - 13.1) < 0.4 ? '#F4F1E8' : dy < 0 ? '#FF6A4D' : '#E23B2E';
      if (i > pts.length - 10) c = dy < 0 ? '#FFFFFF' : '#E8E4D8';
      p.set(X, Y, c);
    }
  });
  // the eyes on the end
  const [ex, ey] = pts[pts.length - 5];
  p.set(Math.round(ex) - 1, Math.round(ey) - 1, OUT);
  p.set(Math.round(ex) + 1, Math.round(ey) - 1, OUT);
  // the frayed tassel
  const [tx, ty] = pts[pts.length - 1];
  for (const [dx, dy] of [[1, -1], [2, 0], [1, 1], [2, -2]]) p.set(Math.round(tx) + dx, Math.round(ty) + dy, HEMP[5]);
  p.outline(OUT);
  return p.toCanvas();
}

function flipped(c: HTMLCanvasElement): HTMLCanvasElement {
  const o = document.createElement('canvas');
  o.width = c.width;
  o.height = c.height;
  const g = o.getContext('2d')!;
  g.translate(c.width, 0);
  g.scale(-1, 1);
  g.drawImage(c, 0, 0);
  return o;
}

registerChar('enemy_hikizuna', (): CharSprite => {
  const right = [0, 1, 2, 3].map(crawl);
  const left = right.map(flipped);
  const walk: Record<Dir, HTMLCanvasElement[]> = { right, up: right, left, down: left };
  return { id: 'enemy_hikizuna', w: 32, h: 16, walk, idle: { right: [right[0], right[0], right[1]], up: [right[0], right[0], right[1]], left: [left[0], left[0], left[1]], down: [left[0], left[0], left[1]] }, walkFrameMs: 140, idleFrameMs: 300, shadow: 18 };
});

registerChar('restored_enemy_hikizuna', (): CharSprite => {
  const c = coilImage();
  const f = { down: [c], up: [c], left: [c], right: [c] } as Record<Dir, HTMLCanvasElement[]>;
  return { id: 'restored_enemy_hikizuna', w: c.width, h: c.height, walk: f, idle: f, shadow: 16 };
});
