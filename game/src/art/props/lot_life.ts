// Life on the closed mall's lot (QA round 3: in stage 0 the mall front and the
// parking lot stood stock-still — only a tree and Minato moved):
//   - prop_lot_nobori: a sale banner left standing since the mall closed
//     (last 31 August) in its water-filled base, faded and frayed, one tie
//     torn so the cloth hangs askew; it flaps in the evening wind (stage 0),
//     stops dead (stage 1), leans to the north-east (stage 2);
//   - sparrow frames (stand / peck / hop / two wing beats) and a drifting
//     shopping bag (three tumbling frames) for world/life.ts.

import { mix, PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { finish } from './kit';
import { stand } from './pkit';
import { registerProp } from './registry';
import { fontTextSmall } from './text';

const pc = (w: number, h: number) => new PixelCanvas(w, h);
// shades of the faded cloth colours (not palette entries, so kit's dk/lt don't know them)
const dk = (c: string) => mix(c, P.shade, 0.28);
const lt = (c: string) => mix(c, P.glint, 0.45);

// ---------------------------------------------------------------- のぼり

const LOT_BANNERS: Record<string, { bg: string; fg: string; text: string; band: string }> = {
  // sun-bleached vermilion on white
  sale: { bg: '#F1E6D6', fg: '#D9725E', text: '閉店セール', band: '#D9725E' },
  // the mall's own yellow, gone pale
  yuyake: { bg: '#F4DE9A', fg: '#B8603C', text: '夕やけ市', band: '#E8A04C' },
};

/** k: 0..3 flutter frames, 4 = stopped (stage 1), 5 = leaning north-east (stage 2). */
function lotNobori(kind: string, k: number): PixelCanvas {
  const b = LOT_BANNERS[kind] ?? LOT_BANNERS.sale;
  const H = 46;
  const p = pc(20, H);
  // the pole, a little bent at the top, and its crossbar
  p.vline(2, 1, H - 6, P.steel);
  p.vline(3, 3, H - 6, P.concrete);
  p.set(2, 0, P.glint);
  p.hline(2, 14, 2, P.steel);
  p.set(14, 3, P.charcoal);
  // water-filled base (注水台): a grey plastic box with its cap
  p.rect(0, H - 6, 7, 5, P.concrete);
  p.hline(0, 6, H - 6, P.concreteLt);
  p.rect(0, H - 3, 7, 2, P.steel);
  p.set(5, H - 5, P.charcoal);
  p.hline(1, 3, H - 1, P.asphalt);
  // the cloth: text down the middle, a coloured band at the head, frayed foot
  const CW = 11;
  const CH = 36;
  const cloth = pc(CW, CH);
  cloth.rect(0, 0, CW, CH, b.bg);
  cloth.rect(0, 0, CW, 3, b.band);
  cloth.vline(0, 0, CH - 1, lt(b.bg));
  cloth.vline(CW - 1, 0, CH - 1, dk(b.bg));
  let yy = 4;
  for (const ch of b.text) {
    if (yy > CH - 8) break;
    fontTextSmall(cloth, ch, 2, yy, b.fg, 1);
    yy += 7;
  }
  // weathering: sun-bleached streaks, a rust drip from the crossbar, the frayed hem
  for (let j = 5; j < CH; j += 9) cloth.hline(1, CW - 2, j, lt(b.bg));
  cloth.set(8, 3, P.brassOld);
  cloth.set(8, 4, P.brassOld);
  for (let i = 0; i < CW; i++) {
    const cut = (i * 7) % 4;
    for (let j = CH - cut; j < CH; j++) cloth.set(i, j, 0);
  }
  // the ties: loops on the pole side, the bottom one torn (the cloth swings free there)
  for (let j = 2; j < CH - 12; j += 7) cloth.set(0, j, P.white);
  for (let j = 0; j < CH; j++) {
    // the lower half flaps; stopped mid-flap in stage 1; bent north-east in stage 2
    const lower = Math.max(0, (j - 10) / (CH - 10));
    let wave = 0;
    let lift = 0;
    if (k <= 3) wave = Math.round(Math.sin(j / 4.2 + k * 1.57) * lower * 2.2 + lower * 1.2);
    else if (k === 4) wave = Math.round(Math.sin(j / 4.2 + 1.57) * lower * 2.2 + lower * 1.2);
    else {
      wave = Math.round(lower * 3);
      lift = -Math.round(lower * 3);
    }
    for (let i = 0; i < CW; i++) {
      const v = cloth.get(i, j);
      if (!(v >>> 24)) continue;
      p.set(4 + i + wave, 3 + j + lift, v);
    }
  }
  // the cloth's shading: the fold shadow down the flapping half
  for (let j = 16; j < 3 + CH; j++)
    for (let i = 0; i < 20; i++) {
      const v = p.get(i, j);
      if (!(v >>> 24) || i < 9) continue;
      if ((i + j + k) % 5 === 0) p.set(i, j, dk(b.bg));
    }
  finish(p, { soft: true });
  return p;
}

const NOBORI = new Map<string, HTMLCanvasElement[]>();
function frames(kind: string): HTMLCanvasElement[] {
  let f = NOBORI.get(kind);
  if (!f) {
    f = [0, 1, 2, 3, 4, 5].map((k) => lotNobori(kind, k).toCanvas());
    NOBORI.set(kind, f);
  }
  return f;
}

registerProp('prop_lot_nobori', (opts) => {
  const kind = String(opts.kind ?? 'sale');
  const f = frames(kind);
  const a = stand(f[0], { cx: 8, shadow: 40, contact: 7 });
  a.ox = 8 - 4;
  a.img = (env) => {
    if (env.stage === 1) return f[4];
    if (env.stage === 2) return f[5];
    // gusts: flapping faster, then lazily
    const gust = Math.sin(env.mt / 2300 + env.seed * 6) > 0.2;
    return f[Math.floor((env.mt + env.seed * 777) / (gust ? 130 : 240)) % 4];
  };
  a.shadowImg = () => f[0];
  return a;
});

// ---------------------------------------------------------------- sparrows

const SP_PAL: Record<string, string> = {
  h: '#8A5A3A', // chestnut cap
  k: P.ink, // eye, beak
  w: P.white, // cheek
  B: P.charcoal, // bib
  b: '#A8742A', // streaked back
  d: '#5A3A2A', // tail, wing tips
  l: '#E8D9B5', // pale belly
  f: '#8A5A3A', // feet
};

function bird(rows: string[]): HTMLCanvasElement {
  const p = pc(10, 8);
  p.art(rows, SP_PAL, 1, 1);
  finish(p, { soft: true, rim: false });
  return p.toCanvas();
}

function flip(c: HTMLCanvasElement): HTMLCanvasElement {
  const o = document.createElement('canvas');
  o.width = c.width;
  o.height = c.height;
  const x = o.getContext('2d')!;
  x.translate(c.width, 0);
  x.scale(-1, 1);
  x.drawImage(c, 0, 0);
  return o;
}

export type SparrowPose = 'stand' | 'peck' | 'hop' | 'flyA' | 'flyB';

let SPARROW: Record<SparrowPose, [HTMLCanvasElement, HTMLCanvasElement]> | null = null;
/** Sparrow frame facing right (flipped = left); 10×8, feet on the bottom row but one. */
export function sparrowFrame(pose: SparrowPose, left: boolean): HTMLCanvasElement {
  if (!SPARROW) {
    const mk = (rows: string[]): [HTMLCanvasElement, HTMLCanvasElement] => {
      const r = bird(rows);
      return [r, flip(r)];
    };
    SPARROW = {
      stand: mk(['....hh..', '...hhkk.', 'ddbbwwB.', '.dbblll.', '..llll..', '..f..f..']),
      peck: mk(['........', 'dd......', '.dbbbhh.', '..bblhwk', '...lll..', '..f.f...']),
      hop: mk(['....hh..', '...hhkk.', 'ddbbwwB.', '.dbblll.', '..llll..', '........']),
      flyA: mk(['.d....d.', '..b..b..', 'd.bbbhhk', '..llll..', '........', '........']),
      flyB: mk(['........', 'd.bbbhhk', '..blllb.', '.d....d.', '........', '........']),
    };
  }
  return SPARROW[pose][left ? 1 : 0];
}

// ---------------------------------------------------------------- the shopping bag

let BAG: HTMLCanvasElement[] | null = null;
/** A crumpled white carrier bag (the mall's bell printed on it), three tumbling frames, 12×11. */
export function bagFrames(): HTMLCanvasElement[] {
  if (BAG) return BAG;
  const mk = (k: number) => {
    const p = pc(12, 11);
    const W = P.white;
    const S = P.concreteLt;
    const D = P.concrete;
    if (k === 0) {
      // upright, puffed with wind, handles up
      p.rect(3, 3, 6, 6, W);
      p.hline(4, 7, 9, S);
      p.vline(8, 4, 8, D);
      p.set(3, 2, S);
      p.set(4, 1, W);
      p.set(7, 1, W);
      p.set(8, 2, S);
      p.set(5, 5, P.brass); // the bell
      p.set(6, 6, P.brassOld);
    } else if (k === 1) {
      // rolled on its side
      p.rect(2, 4, 8, 4, W);
      p.hline(2, 9, 7, S);
      p.vline(9, 4, 7, D);
      p.set(1, 5, W);
      p.set(0, 4, S);
      p.set(5, 5, P.brass);
      p.set(4, 6, D);
    } else {
      // upside down, crumpled flat, handles dragging
      p.rect(3, 5, 7, 4, W);
      p.hline(3, 9, 8, D);
      p.set(4, 4, S);
      p.set(8, 4, W);
      p.set(3, 9, S);
      p.set(9, 9, S);
      p.set(6, 6, P.brassOld);
      p.set(5, 7, S);
    }
    finish(p, { soft: true, rim: false });
    return p.toCanvas();
  };
  BAG = [mk(0), mk(1), mk(2)];
  return BAG;
}
