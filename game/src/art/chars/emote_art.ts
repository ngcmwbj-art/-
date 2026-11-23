// Emote art. Paper balloons (#FBF3DC, #2A2440 outline — the "summer
// homework notebook" look) that pop in with a squash & overshoot, then the
// glyph animates in. sweat / anger / zzz float free (no balloon).
// Every frame of an emote shares one canvas size; anchor = bottom-center.

import { PixelCanvas } from '../../engine/pixel';
import { registerEmote, type EmoteKind } from './emote_registry';

const W = 17;
const H = 17;
const PAPER = '#FBF3DC';
const PAPER_HI = '#FFF6D8';
const PAPER_SH = '#E8D9B5';
const OL = '#2A2440';
const RED = '#E23B2E';
const RED_D = '#B8241E';
const RED_L = '#FF6A4D';
const INK = '#2F4A8A';

type Glyph = string[];

const G: Record<string, Glyph> = {
  exclaim: ['.##.', '.##.', '.##.', '.##.', '.##.', '....', '.##.'],
  question: ['.###.', '##.##', '...##', '..##.', '..#..', '.....', '..#..'],
  note: ['...##.', '...#.#', '...#..', '...#..', '.###..', '####..', '.##...'],
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  hana: ['..###..', '.#...#.', '#..#..#', '#.#.#.#', '#..##.#', '.#...#.', '..###..'],
};

function stamp(p: PixelCanvas, g: Glyph, x: number, y: number, c: string, hi?: string) {
  for (let j = 0; j < g.length; j++)
    for (let i = 0; i < g[j].length; i++)
      if (g[j][i] === '#') p.set(x + i, y + j, hi && i === 0 ? hi : c);
}

/** Balloon body scaled by s (1 = full); returns the glyph origin offset. */
function balloon(p: PixelCanvas, s: number, squash = 0): { cx: number; cy: number } {
  const rx = 7.5 * s + squash * 0.6;
  const ry = 6 * s - squash * 0.6;
  const cx = W / 2;
  const cy = H - 4 - ry;
  p.ellipse(cx, cy, rx, ry, PAPER);
  // tail
  if (s > 0.5) p.poly([[cx - 2, cy + ry - 1.5], [cx + 1.5, cy + ry - 1.5], [cx - 1, H - 1.5]], PAPER);
  // shading: highlight top-left, shade bottom-right
  const tmp = p.clone();
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (tmp.alpha(x, y) === 0) continue;
      const r = tmp.alpha(x + 1, y) === 0 || tmp.alpha(x, y + 1) === 0;
      const l = tmp.alpha(x - 1, y) === 0 || tmp.alpha(x, y - 1) === 0;
      if (r) p.set(x, y, PAPER_SH);
      else if (l && x < cx && y < cy) p.set(x, y, PAPER_HI);
    }
  p.outline(OL);
  return { cx: Math.round(cx), cy: Math.round(cy) };
}

function frame(draw: (p: PixelCanvas) => void): HTMLCanvasElement {
  const p = new PixelCanvas(W, H);
  draw(p);
  return p.toCanvas();
}

/** Standard pop: tiny → 70% → overshoot (squashed) → settle, glyph fades in. */
function popFrames(glyph: (p: PixelCanvas, c: { cx: number; cy: number }, i: number) => void, extra = 0): HTMLCanvasElement[] {
  const scales = [0.3, 0.7, 1.12, 0.96, 1, 1];
  const squash = [0, 0, 1, 0, 0, 0];
  const out: HTMLCanvasElement[] = [];
  for (let i = 0; i < scales.length + extra; i++) {
    const k = Math.min(i, scales.length - 1);
    out.push(
      frame((p) => {
        const c = balloon(p, scales[k], squash[k]);
        if (k >= 2) glyph(p, c, i - 2);
      }),
    );
  }
  return out;
}

function glyphAt(g: Glyph, c: { cx: number; cy: number }, dy = 0) {
  const w = g[0].length;
  return { x: c.cx - Math.ceil(w / 2), y: c.cy - Math.floor(g.length / 2) - 1 + dy };
}

// ---- balloons ---------------------------------------------------------------

registerEmote('exclaim', () =>
  popFrames((p, c, i) => {
    // the "!" jumps in: up 2px, then settles
    const dy = [-2, -1, 0, 0][Math.min(i, 3)];
    const o = glyphAt(G.exclaim, c, dy);
    stamp(p, G.exclaim, o.x, o.y, RED, RED_L);
    p.set(o.x + 2, o.y + 1, RED_D);
    p.set(o.x + 2, o.y + 3, RED_D);
  }, 2),
);

registerEmote('question', () =>
  popFrames((p, c, i) => {
    const o = glyphAt(G.question, c, i < 1 ? -1 : 0);
    const tilt = i === 1 ? 1 : 0;
    stamp(p, G.question, o.x + tilt, o.y, INK, '#4A6AAE');
  }, 3),
);

function dots(n: number, p: PixelCanvas, c: { cx: number; cy: number }, bounce = -1) {
  for (let k = 0; k < n; k++) {
    const x = c.cx - 5 + k * 4;
    const y = c.cy + (bounce === k ? -1 : 0);
    p.rect(x, y, 2, 2, OL);
  }
}

registerEmote(
  'dots',
  () => {
    const out = popFrames(() => {}, 0);
    for (let n = 1; n <= 3; n++) for (let r = 0; r < 3; r++) out.push(frame((p) => dots(n, p, balloon(p, 1))));
    return out;
  },
  () => [0, 1, 2, -1].map((b) => frame((p) => dots(3, p, balloon(p, 1), b))),
);

registerEmote(
  'note',
  () =>
    popFrames((p, c, i) => {
      const o = glyphAt(G.note, c, i === 0 ? -1 : 0);
      stamp(p, G.note, o.x, o.y, INK, '#4A6AAE');
    }, 2),
  () =>
    [0, -1, 0, 1].map((dy, i) =>
      frame((p) => {
        const c = balloon(p, 1);
        const o = glyphAt(G.note, c, dy);
        stamp(p, G.note, o.x + (i === 3 ? 1 : 0), o.y, INK, '#4A6AAE');
      }),
    ),
);

registerEmote(
  'heart',
  () =>
    popFrames((p, c, i) => {
      const big = i === 0;
      const o = glyphAt(G.heart, c, big ? -1 : 0);
      stamp(p, G.heart, o.x, o.y, '#E0567A', '#F07A9A');
      p.set(o.x + 1, o.y + 1, '#FFF6D8');
    }, 2),
  () =>
    [0, 1, 0, 0].map((beat) =>
      frame((p) => {
        const c = balloon(p, 1);
        const o = glyphAt(G.heart, c, 0);
        stamp(p, G.heart, o.x, o.y, beat ? '#F07A9A' : '#E0567A', '#F07A9A');
        if (beat) {
          p.set(o.x - 1, o.y + 1, '#E0567A');
          p.set(o.x + 7, o.y + 1, '#E0567A');
        }
        p.set(o.x + 1, o.y + 1, '#FFF6D8');
      }),
    ),
);

// light: a small vermilion hanamaru that lights up (idea / praise)
function hanamaru(p: PixelCanvas, c: { cx: number; cy: number }, turn: number) {
  const o = glyphAt(G.hana, c, 0);
  stamp(p, G.hana, o.x, o.y, RED, RED_L);
  // petals around (rotating by turn)
  const pet: [number, number][] = [[3, -1], [7, 3], [3, 7], [-1, 3], [6, 0], [6, 6], [0, 6], [0, 0]];
  for (let k = 0; k < 8; k++) if ((k + turn) % 2 === 0) p.set(o.x + pet[k][0], o.y + pet[k][1], RED_L);
}

registerEmote(
  'light',
  () => {
    const out = popFrames((p, c, i) => {
      // the swirl is "drawn": reveal progressively
      const o = glyphAt(G.hana, c, 0);
      const g = G.hana.map((row, j) => (j <= i * 2 + 1 ? row : '.'.repeat(row.length)));
      stamp(p, g, o.x, o.y, RED, RED_L);
    }, 3);
    out.push(frame((p) => hanamaru(p, balloon(p, 1), 0)));
    // sparkle burst
    out.push(
      frame((p) => {
        const c = balloon(p, 1);
        hanamaru(p, c, 1);
        p.set(c.cx - 7, c.cy - 5, '#FFE7A3');
        p.set(c.cx + 6, c.cy - 6, '#FFE7A3');
      }),
    );
    return out;
  },
  () => [0, 1].map((t) => frame((p) => hanamaru(p, balloon(p, 1), t))),
);

// ---- free-floating ------------------------------------------------------------

function drop(p: PixelCanvas, x: number, y: number, s = 1) {
  const c = '#9FD8F0';
  if (s < 1) {
    p.rect(x + 1, y + 1, 2, 2, c);
    p.outline(OL);
    return;
  }
  const rows = ['.#..', '.#..', '###.', '####', '####', '.##.'];
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < 4; i++) if (rows[j][i] === '#') p.set(x + i, y + j, c);
  p.set(x + 1, y + 3, '#E8F8FF');
  p.set(x + 3, y + 4, '#6FB4D8');
  p.set(x + 2, y + 5, '#6FB4D8');
  p.outline(OL);
}

registerEmote(
  'sweat',
  () => [
    frame((p) => drop(p, 11, 6, 0)),
    frame((p) => drop(p, 11, 4)),
    frame((p) => drop(p, 11, 5)),
    frame((p) => drop(p, 11, 6)),
    frame((p) => drop(p, 11, 7)),
  ],
  () => [7, 8, 9, 10, 6].map((y) => frame((p) => drop(p, 11, y))),
);

/**
 * Anger mark (the "vein" cross): four curved strokes, each bending toward
 * the empty centre — not four L corners pointing out (that read as a red
 * square frame at 1x). s = 1 small, 2 normal, 3 throb.
 */
const ANGER: Record<number, Glyph> = {
  1: ['..#.#..', '.#...#.', '#.....#', '.......', '#.....#', '.#...#.', '..#.#..'],
  2: ['...#.#...', '...#.#...', '..#...#..', '##.....##', '.........', '##.....##', '..#...#..', '...#.#...', '...#.#...'],
  3: [
    '....#.#....',
    '....#.#....',
    '....#.#....',
    '...#...#...',
    '###.....###',
    '...........',
    '###.....###',
    '...#...#...',
    '....#.#....',
    '....#.#....',
    '....#.#....',
  ],
};

function anger(p: PixelCanvas, cx: number, cy: number, s: number) {
  const g = ANGER[Math.max(1, Math.min(3, s))];
  const h = g.length >> 1;
  for (let j = 0; j < g.length; j++)
    for (let i = 0; i < g[j].length; i++) {
      if (g[j][i] !== '#') continue;
      // lit on the upper-left strokes, deep on the lower-right
      const c = i < h && j < h ? RED_L : i > h && j > h ? RED_D : RED;
      p.set(cx - h + i, cy - h + j, c);
    }
  p.outline(OL);
}

registerEmote(
  'anger',
  () => [1, 2, 3, 2, 2].map((s) => frame((p) => anger(p, 10, 7, s))),
  () => [2, 3, 2, 2].map((s) => frame((p) => anger(p, 10, 7, s))),
);

function zzz(p: PixelCanvas, t: number) {
  // three Z's drifting up and to the right, growing
  // (the smallest is still 4×4 with its diagonal: a 3×3 z read as an "I")
  const zs: [number, number, number][] = [
    [8, 12, 4],
    [10, 7, 4],
    [11, 2, 5],
  ];
  zs.forEach(([x, y, w], k) => {
    if (k > t) return;
    const yy = y - (t > 2 ? (t - 2) % 2 : 0);
    for (let i = 0; i < w; i++) p.set(x + i, yy, INK);
    for (let i = 0; i < w; i++) p.set(x + i, yy + w - 1, INK);
    for (let i = 1; i < w - 1; i++) p.set(x + w - 1 - i, yy + i, INK);
  });
  p.outline(PAPER);
}

registerEmote(
  'zzz',
  () => [0, 0, 1, 1, 2, 2].map((t) => frame((p) => zzz(p, t))),
  () => [3, 3, 4, 4].map((t) => frame((p) => zzz(p, t))),
);

/** 照れ: three slanted blush strokes (///) that stroke in one by one, then quiver. */
function shy(p: PixelCanvas, n: number, wob: number) {
  for (let k = 0; k < n; k++) {
    const x = 3 + k * 4 + (wob && k === 1 ? 1 : 0);
    const y = 8 - (wob && k !== 1 ? 1 : 0);
    for (let i = 0; i < 4; i++) {
      p.set(x + 3 - i, y + i, i === 0 ? RED_L : RED);
      p.set(x + 4 - i, y + i, i === 3 ? RED_D : RED);
    }
  }
  p.outline(OL);
  // a tiny sparkle of embarrassment
  if (n === 3) p.set(1, 5 + wob, '#FFE7A3');
}

registerEmote(
  'shy',
  () => [1, 2, 3, 3].map((n, i) => frame((p) => shy(p, n, i === 3 ? 1 : 0))),
  () => [0, 1, 0, 0].map((w) => frame((p) => shy(p, 3, w))),
);

// Keep the registry aware of every kind even if a build tree-shakes nothing.
export const EMOTE_ART: EmoteKind[] = ['exclaim', 'question', 'dots', 'note', 'sweat', 'anger', 'heart', 'zzz', 'light', 'shy'];
