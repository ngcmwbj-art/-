// 無人販売所の 店番（02_ch2_index #94、52 7.11）の 絵：
//   tenbanSketch(step, rank, sign)  ソワカの 下絵（56×40。大写しは 2倍、みました帳は 1倍）。
//     step 0 白い 紙／1 えんぴつの まるい 線／2 はちまき・目・耳の 板／3 黄土色を 置く／
//     4 できあがり（キバ・おなかの しま・はさみの 手・3本ゆびの 足・扇の しっぽ、となりに 小さく ソワカの 顔）。
//     rank 0 きりっと（置物 級）／1 腕が 2本ずつ（店番 級）／2 足と 腕が 何本にも（にぎやか 級）。
//     sign：0回の ときだけ、すみに はさみの サイン（『ソワカ』の 点の となり）。
//   kanbanTiny(rank)  無人販売所の 柱の 看板（7×8）：小さな 店番の 絵（prop_h_mujin が 段階1〜2 で 使う）。
// グソっ君は 新しい 見た目（30 9.2）：黄土色、白い はちまき、大きな 黒目、口の 下から 垂れる 2本、
// 耳の 板、はさみの 手、3本ゆびの 足、扇の しっぽ。

import { PixelCanvas } from '../../engine/pixel';

export const SKETCH_W = 56;
export const SKETCH_H = 40;

const PAPER = '#F4ECD8';
const PAPER_D = '#E2D6BA';
const PENCIL = '#8A8070';
const OCHRE = '#D49A5C';
const OCHRE_D = '#A8693A';
const OCHRE_L = '#EBBF86';
const INK = '#3A2B24';
const BAND = '#FBF8EE';
const EYE = '#1B1733';
const CHEEK = '#F08A7A';
const BERET = '#8A2E3A';
const SKIN = '#F0C8A0';
const VERM = '#D9483A';

const cache = new Map<string, HTMLCanvasElement>();

/** ソワカの 下絵（56×40）。 */
export function tenbanSketch(step: number, rank: 0 | 1 | 2 = 0, sign = false): HTMLCanvasElement {
  const key = `${step}:${rank}:${sign ? 1 : 0}`;
  let c = cache.get(key);
  if (c) return c;
  c = drawSketch(step, rank, sign).toCanvas();
  cache.set(key, c);
  return c;
}

function drawSketch(step: number, rank: 0 | 1 | 2, sign: boolean): PixelCanvas {
  const p = new PixelCanvas(SKETCH_W, SKETCH_H);
  // the paper (the board's white, a little grain)
  p.rect(0, 0, SKETCH_W, SKETCH_H, PAPER);
  for (let y = 0; y < SKETCH_H; y++) for (let x = 0; x < SKETCH_W; x++) if ((x * 7 + y * 13) % 29 === 0) p.set(x, y, PAPER_D);
  p.strokeRect(0, 0, SKETCH_W, SKETCH_H, PAPER_D);
  if (step <= 0) return p;
  const cx = 22;
  const hy = 15;
  const by = 27;
  const done = step >= 4;
  const col = step >= 3;
  // ---- extra arms and legs (drawn first, behind him): the moves
  if (done && rank >= 1) {
    const ghost = rank === 1 ? OCHRE_L : OCHRE;
    const arms: [number, number, number, number][] =
      rank === 1
        ? [[cx - 9, by - 2, cx - 14, by - 6], [cx + 9, by - 2, cx + 14, by - 6]]
        : [[cx - 9, by - 2, cx - 16, by - 8], [cx + 9, by - 2, cx + 16, by - 8], [cx - 9, by, cx - 17, by - 2], [cx + 9, by, cx + 17, by - 2], [cx - 8, by + 3, cx - 16, by + 4], [cx + 8, by + 3, cx + 16, by + 4]];
    for (const [x0, y0, x1, y1] of arms) {
      p.line(x0, y0, x1, y1, ghost);
      p.line(x0, y0 + 1, x1, y1 + 1, OCHRE_D);
      // a pincer at the end
      p.set(x1 - 1, y1 - 1, OCHRE_D);
      p.set(x1 + 1, y1 - 1, OCHRE_D);
    }
    if (rank === 2)
      for (let i = 0; i < 7; i++) {
        const x = cx - 9 + i * 3;
        p.line(x, by + 7, x - 1 + (i % 3), SKETCH_H - 3, OCHRE_D);
      }
  }
  // ---- the body (sat, round) and the head
  const body = (fill: string, edge: string) => {
    p.ellipse(cx, by, 9, 7, fill);
    p.ring(cx, by, 9, 7, edge);
  };
  const head = (fill: string, edge: string) => {
    p.ellipse(cx, hy, 8, 6.5, fill);
    p.ring(cx, hy, 8, 6.5, edge);
  };
  // the ear plates beside the head
  const ears = (fill: string, edge: string) => {
    for (const s of [-1, 1]) {
      // a small rounded plate at each side of the head, level with the eyes
      const x = s < 0 ? cx - 10 : cx + 8;
      p.rect(x, hy + 1, 3, 3, fill);
      p.set(s < 0 ? x : x + 2, hy + 1, edge);
      p.set(s < 0 ? x : x + 2, hy + 3, edge);
    }
  };
  if (col) {
    // the fan tail behind him
    if (done) for (let i = -2; i <= 2; i++) p.line(cx + 7, by + 4, cx + 12 + i, by + 9 - Math.abs(i), i % 2 ? OCHRE_D : OCHRE);
    body(OCHRE, OCHRE_D);
    // light on the upper left
    for (let x = cx - 6; x <= cx - 2; x++) p.set(x, by - 5, OCHRE_L);
    // the striped tummy
    if (done) {
      p.ellipse(cx, by + 1, 5, 5, OCHRE_L);
      for (const y of [by - 1, by + 2, by + 4]) p.hline(cx - 4, cx + 4, y, OCHRE);
    }
    ears(OCHRE_D, INK);
    head(OCHRE, OCHRE_D);
    for (let x = cx - 5; x <= cx - 1; x++) p.set(x, hy - 5, OCHRE_L);
  } else {
    body(PAPER, PENCIL);
    if (step >= 2) ears(PAPER, PENCIL);
    head(PAPER, PENCIL);
  }
  if (step >= 2) {
    // the headband: left white (the paper kept)
    for (let x = cx - 8; x <= cx + 8; x++) {
      const y = hy - 3 + Math.round((cx - x) * 0.07);
      p.set(x, y, col ? BAND : PAPER);
      p.set(x, y + 1, col ? BAND : PAPER);
      if (!col) {
        p.set(x, y - 1, PENCIL);
        p.set(x, y + 2, PENCIL);
      }
    }
    if (col) p.set(cx + 9, hy - 3, BAND);
    // the eyes: big and round, a glint each
    for (const ex of [cx - 3, cx + 3]) {
      p.rect(ex - 1, hy, 3, 3, col ? EYE : PENCIL);
      p.set(ex, hy - 1, col ? EYE : PENCIL);
      if (col) p.set(ex, hy, '#FFFFFF');
    }
  }
  if (done) {
    // the two long ones hanging from under the nose
    p.line(cx - 1, hy + 4, cx - 2, hy + 10, OCHRE_L);
    p.line(cx + 1, hy + 4, cx + 2, hy + 10, OCHRE_L);
    p.set(cx - 2, hy + 11, INK);
    p.set(cx + 2, hy + 11, INK);
    // cheeks
    p.set(cx - 6, hy + 3, CHEEK);
    p.set(cx + 6, hy + 3, CHEEK);
    // pincer hands resting on the knees (rank 0: neat), feet with 3 toes
    for (const s of [-1, 1]) {
      const hx = cx + s * 9;
      p.line(hx, by - 1, hx + s, by + 3, OCHRE_D);
      p.set(hx + s * 2, by + 3, INK);
      p.set(hx, by + 4, INK);
      const fx = cx + s * 5;
      for (let t = -1; t <= 1; t++) p.set(fx + t, by + 7, INK);
      p.hline(fx - 1, fx + 1, by + 6, OCHRE_D);
    }
    // ソワカ, small, beside him: the burgundy beret and a smile
    const sx = 47;
    const sy = 27;
    p.ellipse(sx, sy, 3, 3, SKIN);
    p.ring(sx, sy, 3, 3, PENCIL);
    p.hline(sx - 3, sx + 3, sy - 3, BERET);
    p.hline(sx - 2, sx + 2, sy - 4, BERET);
    p.set(sx + 2, sy - 5, BERET);
    p.set(sx - 1, sy, INK);
    p.set(sx + 1, sy, INK);
    p.hline(sx - 1, sx + 1, sy + 2, VERM);
    // her signature (two dots, as on the old board) at the bottom right
    p.set(SKETCH_W - 6, SKETCH_H - 4, '#3A6EA8');
    p.set(SKETCH_W - 5, SKETCH_H - 4, '#4F9A4A');
    if (sign) {
      // and beside it a pincer: two little prongs
      const x = SKETCH_W - 11;
      const y = SKETCH_H - 6;
      p.set(x, y, VERM);
      p.set(x + 2, y, VERM);
      p.set(x, y + 1, VERM);
      p.set(x + 2, y + 1, VERM);
      p.hline(x, x + 2, y + 2, VERM);
      p.set(x + 1, y + 3, VERM);
    }
  }
  return p;
}

const tinyCache = new Map<number, PixelCanvas>();

/** 柱の 看板の 店番（7×8 の 板の 中身。板は prop が 描く）。 */
export function kanbanTiny(rank: 0 | 1 | 2): PixelCanvas {
  let p = tinyCache.get(rank);
  if (p) return p;
  p = new PixelCanvas(7, 8);
  p.rect(0, 0, 7, 8, PAPER);
  // head with the white band, body
  p.hline(2, 4, 1, OCHRE);
  p.hline(1, 5, 2, BAND);
  p.hline(1, 5, 3, OCHRE);
  p.set(2, 3, EYE);
  p.set(4, 3, EYE);
  p.hline(1, 5, 4, OCHRE_D);
  p.hline(1, 5, 5, OCHRE);
  p.hline(2, 4, 6, OCHRE);
  if (rank >= 1) {
    p.set(0, 4, OCHRE_D);
    p.set(6, 4, OCHRE_D);
  }
  if (rank >= 2) {
    p.set(0, 6, OCHRE_D);
    p.set(6, 6, OCHRE_D);
    p.set(1, 7, OCHRE_D);
    p.set(3, 7, OCHRE_D);
    p.set(5, 7, OCHRE_D);
  }
  tinyCache.set(rank, p);
  return p;
}
