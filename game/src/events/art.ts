// Pictures that belong to the story scenes, drawn at their own resolution:
//  - photoClose(): the family photo of 写真館 for the ending close-up, 96×72
//    at 1× (the field photo is 32×24; this is the same photograph, seen up close)
//  - dinnerSet(): what is on the chabudai in the ending (croquettes, the
//    cabbage mountain, rice, the sauce)
//  - meishi(): ハト係長's business card, held out and lying on the ground

import { PixelCanvas, mix } from '../engine/pixel';
import { hash2 } from '../engine/rng';
import { P } from '../art/tiles/palette';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x: number, y: number) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

// ---------------------------------------------------------------- the family photograph (96×72)

interface Face {
  cx: number;
  top: number;
  w: number;
  h: number;
}

/** A round head of skin with light from the upper left. */
function head(p: PixelCanvas, f: Face): void {
  const rx = f.w / 2;
  const ry = f.h / 2;
  const cy = f.top + ry;
  for (let y = f.top; y < f.top + f.h; y++)
    for (let x = Math.floor(f.cx - rx); x < Math.ceil(f.cx + rx); x++) {
      const dx = (x + 0.5 - f.cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      // a slightly squarer jaw than an ellipse
      const d = dx * dx + Math.pow(Math.abs(dy), 2.4);
      if (d > 1) continue;
      const lit = -dx * 0.6 - dy * 0.5;
      p.set(x, y, lit > 0.35 ? P.skin1 : dx > 0.55 || dy > 0.72 ? P.skin3 : P.skin2);
    }
}

/** Closed, smiling eyes (a small arch) at (x, y) = left end. */
function happyEye(p: PixelCanvas, x: number, y: number): void {
  p.set(x, y + 1, P.ink);
  p.set(x + 1, y, P.ink);
  p.set(x + 2, y, P.ink);
  p.set(x + 3, y + 1, P.ink);
}

/** An open laughing mouth, w wide (≥ 3), top-left (x, y). */
function laugh(p: PixelCanvas, x: number, y: number, w: number): void {
  p.hline(x, x + w - 1, y, P.maroon);
  p.hline(x + 1, x + w - 2, y + 1, P.maroon);
  if (w >= 4) p.hline(x + 1, x + w - 2, y, P.white);
  if (w >= 5) p.set(x + Math.floor(w / 2), y + 1, P.red);
}

function cheeks(p: PixelCanvas, xl: number, xr: number, y: number): void {
  p.set(xl, y, P.peach);
  p.set(xr, y, P.peach);
}

/** Vertical cloth shading: lit left edge, shaded right third. */
function cloth(p: PixelCanvas, x: number, y: number, w: number, h: number, c: string, lit: string, shade: string): void {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) {
      const u = (xx - x) / Math.max(1, w - 1);
      p.set(xx, yy, u < 0.16 ? lit : u > 0.7 ? shade : c);
    }
}

let PHOTO: HTMLCanvasElement | null = null;

/** The ending's photograph: 父・母・姉・弟, the brother back in his school cap, everyone laughing. */
export function photoClose(): HTMLCanvasElement {
  if (PHOTO) return PHOTO;
  const W = 96;
  const H = 72;
  const FLOOR = 59;
  const p = new PixelCanvas(W, H);
  // studio backdrop: painted muslin, a soft light behind the family (dithered bands)
  const bands = [P.aqua, P.blue, mix(P.blue, P.navy, 0.5), P.navy];
  for (let y = 0; y < FLOOR; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.hypot((x - 50) / 58, (y - 24) / 38) + (hash2(x >> 2, y >> 2, 71) - 0.5) * 0.12;
      const v = Math.max(0, Math.min(2.999, (d - 0.3) * 3.4));
      const i = Math.floor(v);
      const c = v - i > bayer(x, y) ? bands[i + 1] : bands[i];
      p.set(x, y, c);
    }
  // the backdrop's folds: a few soft vertical streaks
  for (const fx of [9, 31, 70, 88])
    for (let y = 2; y < FLOOR; y++) if ((y + fx) % 3 !== 0) p.set(fx, y, mix(p.get(fx, y) ? rgbOf(p, fx, y) : P.blue, P.navy, 0.25));
  // floor: studio boards, lit in the middle
  for (let y = FLOOR; y < H; y++)
    for (let x = 0; x < W; x++) {
      const seam = (y - FLOOR) % 4 === 3 || (x + ((y - FLOOR) >> 2) * 23) % 31 === 0;
      const lit = Math.abs(x - 48) < 30 - (y - FLOOR) && hash2(x, y, 5) < 0.8;
      p.set(x, y, seam ? P.wood : lit ? P.goldPale : P.woodLt);
    }
  p.hline(0, W - 1, FLOOR, P.brass);
  // contact shadows under the four
  for (const [cx, rw] of [[16, 10], [37, 9], [59, 8], [78, 8]] as const)
    for (let x = cx - rw; x <= cx + rw; x++) {
      p.set(x, FLOOR + 3, P.wood);
      if (Math.abs(x - cx) < rw - 2) p.set(x, FLOOR + 2, P.brassOld);
    }

  const f = new PixelCanvas(W, H);
  const skinHand = (x: number, y: number) => {
    f.rect(x, y, 3, 3, P.skin2);
    f.set(x, y, P.skin1);
    f.set(x + 2, y + 2, P.skin3);
  };

  // ---- 父: navy suit, white shirt, red tie, glasses, short dark hair
  {
    const cx = 16;
    // legs and shoes
    cloth(f, cx - 6, 44, 5, 14, P.navy, mix(P.navy, P.blue, 0.35), mix(P.navy, P.ink, 0.45));
    cloth(f, cx + 1, 44, 5, 14, P.navy, mix(P.navy, P.blue, 0.35), mix(P.navy, P.ink, 0.45));
    f.rect(cx - 7, 58, 6, 2, P.charcoal);
    f.rect(cx + 1, 58, 6, 2, P.charcoal);
    f.hline(cx - 6, cx - 4, 58, P.asphalt);
    f.hline(cx + 2, cx + 4, 58, P.asphalt);
    // jacket
    cloth(f, cx - 8, 21, 17, 25, P.navy, mix(P.navy, P.blue, 0.4), mix(P.navy, P.ink, 0.45));
    f.set(cx - 8, 21, 'transparent');
    f.set(cx + 8, 21, 'transparent');
    // shirt V, tie, lapels
    for (let i = 0; i < 7; i++) f.hline(cx - Math.max(0, 3 - Math.floor(i / 2)), cx + Math.max(0, 3 - Math.floor(i / 2)), 21 + i, P.white);
    f.vline(cx, 22, 33, P.verm);
    f.set(cx, 22, P.vermShade);
    f.set(cx - 1, 33, P.verm);
    f.set(cx + 1, 33, P.vermShade);
    f.line(cx - 4, 21, cx - 1, 29, mix(P.navy, P.blue, 0.55));
    f.line(cx + 4, 21, cx + 1, 29, mix(P.navy, P.ink, 0.3));
    f.set(cx + 5, 30, P.gold); // a pen in the breast pocket
    f.set(cx + 5, 31, P.steel);
    // arms along the sides, hands
    cloth(f, cx - 10, 23, 3, 18, P.navy, mix(P.navy, P.blue, 0.35), P.navy);
    cloth(f, cx + 8, 23, 3, 18, mix(P.navy, P.ink, 0.35), P.navy, mix(P.navy, P.ink, 0.5));
    skinHand(cx - 10, 41);
    skinHand(cx + 8, 41);
    // neck and head
    f.rect(cx - 2, 18, 4, 3, P.skin3);
    head(f, { cx: cx + 0.5, top: 7, w: 13, h: 13 });
    // hair: short, side-parted
    for (let x = cx - 6; x <= cx + 6; x++) {
      const t = 7 + (Math.abs(x - cx) > 4 ? 1 : 0);
      const b = x < cx - 1 ? 10 : x < cx + 3 ? 9 : 11;
      for (let y = t; y <= b; y++) f.set(x, y, y === t && x > cx - 4 && x < cx + 2 ? P.asphalt : P.charcoal);
    }
    f.vline(cx - 6, 10, 13, P.charcoal);
    f.vline(cx + 6, 10, 12, P.charcoal);
    f.set(cx - 2, 8, P.steel);
    // glasses and laughing eyes
    f.strokeRect(cx - 5, 12, 5, 4, P.ink);
    f.strokeRect(cx + 1, 12, 5, 4, P.ink);
    f.set(cx, 13, P.ink);
    f.set(cx - 4, 13, P.white);
    f.set(cx + 2, 13, P.white);
    f.set(cx - 3, 14, P.ink);
    f.set(cx - 2, 14, P.ink);
    f.set(cx + 3, 14, P.ink);
    f.set(cx + 4, 14, P.ink);
    laugh(f, cx - 2, 17, 5);
    cheeks(f, cx - 5, cx + 6, 16);
  }

  // ---- 母: a plum dress with a white collar, a pearl, hair tied back
  {
    const cx = 37;
    // dress (flares a little) and legs
    for (let y = 21; y < 50; y++) {
      const half = 7 + Math.floor(Math.max(0, y - 34) / 5);
      for (let x = cx - half; x <= cx + half; x++) {
        const u = (x - (cx - half)) / (half * 2);
        f.set(x, y, u < 0.15 ? P.crimson : u > 0.7 ? mix(P.sunShade, P.ink, 0.35) : P.sunShade);
      }
    }
    for (let y = 26; y < 50; y += 6) for (let x = cx - 6; x <= cx + 6; x += 4) f.set(x + (y % 12 ? 2 : 0), y, P.peach); // a small print
    f.hline(cx - 9, cx + 9, 49, mix(P.sunShade, P.ink, 0.5));
    f.rect(cx - 4, 50, 3, 8, P.skin2);
    f.rect(cx + 2, 50, 3, 8, P.skin3);
    f.rect(cx - 5, 57, 4, 2, P.maroon);
    f.rect(cx + 2, 57, 4, 2, P.maroon);
    // collar and the pearl
    f.hline(cx - 3, cx + 3, 21, P.white);
    f.hline(cx - 2, cx + 2, 22, P.white);
    f.set(cx, 24, P.glint);
    f.set(cx + 1, 24, P.concrete);
    // arms: her near hand rests on the sister's shoulder
    cloth(f, cx - 9, 22, 3, 14, P.sunShade, P.crimson, P.sunShade);
    skinHand(cx - 9, 35);
    f.line(cx + 7, 23, cx + 12, 30, mix(P.sunShade, P.ink, 0.3));
    f.line(cx + 8, 23, cx + 13, 30, P.sunShade);
    f.line(cx + 8, 24, cx + 13, 31, mix(P.sunShade, P.ink, 0.3));
    f.line(cx + 12, 31, cx + 17, 31, P.skin2);
    f.line(cx + 12, 32, cx + 17, 32, P.skin3);
    // neck, head, hair (tied back, a side bang)
    f.rect(cx - 1, 18, 3, 3, P.skin3);
    head(f, { cx: cx + 0.5, top: 8, w: 12, h: 12 });
    for (let x = cx - 6; x <= cx + 6; x++) {
      const t = 8 + (Math.abs(x - cx) > 4 ? 1 : 0);
      const b = x < cx - 3 ? 15 : x < cx + 1 ? 10 : x < cx + 4 ? 11 : 16;
      for (let y = t; y <= b; y++) f.set(x, y, y === t + 1 && x > cx - 4 && x < cx + 1 ? P.brassOld : P.woodDark);
    }
    f.rect(cx + 5, 9, 3, 3, P.woodDark); // the bun behind
    f.set(cx + 6, 9, P.wood);
    f.line(cx - 3, 10, cx + 2, 11, P.wood);
    happyEye(f, cx - 4, 13);
    happyEye(f, cx + 1, 13);
    laugh(f, cx - 1, 17, 4);
    cheeks(f, cx - 4, cx + 5, 15);
  }

  // ---- 姉: sky-blue dress, red ribbon, holding her brother's hand
  {
    const cx = 59;
    for (let y = 35; y < 52; y++) {
      const half = 5 + Math.floor(Math.max(0, y - 42) / 3);
      for (let x = cx - half; x <= cx + half; x++) {
        const u = (x - (cx - half)) / (half * 2);
        f.set(x, y, u < 0.18 ? P.glint : u > 0.7 ? P.blue : P.aqua);
      }
    }
    f.hline(cx - 7, cx + 7, 51, P.blue);
    f.hline(cx - 2, cx + 2, 35, P.white);
    f.rect(cx - 3, 52, 2, 6, P.skin2);
    f.rect(cx + 2, 52, 2, 6, P.skin3);
    f.rect(cx - 4, 57, 3, 2, P.verm);
    f.rect(cx + 2, 57, 3, 2, P.verm);
    f.hline(cx - 4, cx - 3, 57, P.vermLt);
    // arms: the near one hangs, the other reaches to her brother
    cloth(f, cx - 7, 36, 2, 9, P.aqua, P.glint, P.aqua);
    skinHand(cx - 8, 44);
    f.line(cx + 5, 37, cx + 9, 45, P.blue);
    f.line(cx + 6, 37, cx + 10, 45, P.aqua);
    f.rect(cx + 10, 45, 3, 2, P.skin2);
    // head, hair with a ribbon
    f.rect(cx - 1, 33, 3, 2, P.skin3);
    head(f, { cx: cx + 0.5, top: 23, w: 11, h: 11 });
    for (let x = cx - 5; x <= cx + 5; x++) {
      const t = 23 + (Math.abs(x - cx) > 3 ? 1 : 0);
      const b = Math.abs(x - cx) >= 4 ? 34 : 26;
      for (let y = t; y <= b; y++) f.set(x, y, y === t + 1 && x < cx ? P.wood : P.woodDark);
    }
    f.rect(cx + 3, 22, 3, 3, P.verm);
    f.rect(cx + 6, 22, 2, 2, P.verm);
    f.set(cx + 5, 23, P.vermShade);
    f.set(cx + 3, 22, P.vermLt);
    happyEye(f, cx - 4, 28);
    happyEye(f, cx + 1, 28);
    laugh(f, cx - 1, 31, 3);
    cheeks(f, cx - 4, cx + 4, 30);
  }

  // ---- 弟: white shirt, navy shorts — and back in his yellow school cap
  {
    const cx = 78;
    cloth(f, cx - 5, 38, 11, 8, P.white, P.glint, P.concrete);
    f.hline(cx - 1, cx + 1, 38, P.concreteLt);
    f.set(cx + 2, 40, P.concrete); // a button
    f.set(cx + 2, 43, P.concrete);
    cloth(f, cx - 5, 46, 11, 5, P.navy, mix(P.navy, P.blue, 0.35), mix(P.navy, P.ink, 0.45));
    f.vline(cx, 48, 50, mix(P.navy, P.ink, 0.45));
    f.rect(cx - 4, 51, 3, 6, P.skin2);
    f.rect(cx + 2, 51, 3, 6, P.skin3);
    f.rect(cx - 5, 56, 4, 2, P.white);
    f.rect(cx + 2, 56, 4, 2, P.white);
    f.rect(cx - 5, 58, 4, 1, P.blue);
    f.rect(cx + 2, 58, 4, 1, P.blue);
    // arms: the near one takes his sister's hand, the other gives a peace sign
    f.rect(cx - 7, 39, 2, 5, P.white);
    f.rect(cx - 9, 44, 3, 2, P.skin2);
    f.rect(cx + 6, 34, 2, 6, P.white);
    f.set(cx + 6, 33, P.skin2);
    f.set(cx + 7, 33, P.skin2);
    f.vline(cx + 6, 30, 32, P.skin2);
    f.vline(cx + 8, 30, 32, P.skin1);
    f.set(cx + 8, 33, P.skin3);
    // head
    f.rect(cx - 1, 36, 3, 2, P.skin3);
    head(f, { cx: cx + 0.5, top: 26, w: 11, h: 11 });
    f.vline(cx - 5, 30, 32, P.woodDark);
    f.vline(cx + 5, 30, 31, P.woodDark);
    // the school cap: a yellow dome with a brim and a white badge
    for (let y = 21; y <= 28; y++) {
      const half = y < 23 ? 3 + (y - 21) : 6;
      for (let x = cx - half; x <= cx + half; x++) {
        const u = (x - (cx - half)) / (half * 2);
        f.set(x, y, u < 0.25 && y < 26 ? '#FFE680' : u > 0.72 ? '#C8A020' : '#F5D33B');
      }
    }
    f.hline(cx - 7, cx + 7, 29, '#C8A020');
    f.hline(cx - 6, cx + 6, 28, '#F5D33B');
    f.hline(cx - 5, cx + 5, 26, '#C8A020');
    f.rect(cx - 1, 23, 3, 2, P.white);
    f.set(cx, 23, P.verm);
    happyEye(f, cx - 4, 31);
    happyEye(f, cx + 1, 31);
    laugh(f, cx - 2, 34, 5);
    cheeks(f, cx - 4, cx + 5, 33);
  }
  // one colored outline around the four, then onto the backdrop
  f.outline(P.ink);
  p.blit(f, 0, 0);
  // the rim light of the studio lamp on the left edges
  for (let y = 5; y < FLOOR; y++)
    for (let x = 1; x < W; x++) {
      const here = f.alpha(x, y) > 0;
      const left = f.alpha(x - 1, y) > 0;
      if (here && !left) continue;
      if (here && f.alpha(x - 2, y) === 0 && rgbOf(f, x - 1, y) === P.ink && rgbOf(f, x, y) !== P.ink && x < 50 && (x + y) % 2 === 0) p.set(x, y, mix(rgbOf(f, x, y), P.glint, 0.35));
    }
  PHOTO = p.toCanvas();
  return PHOTO;
}

function rgbOf(p: PixelCanvas, x: number, y: number): string {
  const v = p.get(x, y);
  const r = v & 255;
  const g = (v >> 8) & 255;
  const b = (v >> 16) & 255;
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// ---------------------------------------------------------------- the dinner on the chabudai

let DINNER: HTMLCanvasElement | null = null;

/** 26×14: the platter (cabbage mountain, three croquettes), two bowls of rice, the sauce. */
export function dinnerSet(): HTMLCanvasElement {
  if (DINNER) return DINNER;
  const p = new PixelCanvas(26, 14);
  // platter
  p.ellipse(11, 9, 8.5, 3.6, P.concrete);
  p.ellipse(11, 8.6, 7.6, 3, P.white);
  p.hline(5, 17, 12, P.steel);
  // cabbage mountain (shredded: stripes of three greens)
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 8; x++) {
      const dx = x - 3.5;
      if (dx * dx * 0.55 + (y - 6) * (y - 6) * 1.1 > 11) continue;
      p.set(12 + x, 2 + y, hash2(x, y, 4) < 0.35 ? P.leafLt : (x + y) % 3 === 0 ? P.leaf : P.leafYoung);
    }
  // three croquettes
  const kor = (cx: number, cy: number) => {
    p.ellipse(cx, cy, 3, 2, P.brassOld);
    p.ellipse(cx - 0.5, cy - 0.5, 2.3, 1.3, P.brass);
    p.set(cx - 1, cy - 1, P.goldPale);
    p.set(cx + 1, cy, P.wood);
    p.set(cx + 2, cy + 1, P.woodDark);
  };
  kor(7, 9);
  kor(11, 10);
  kor(9, 6);
  // two bowls of rice, left and right
  const bowl = (x: number, y: number) => {
    p.rect(x, y + 1, 4, 2, P.navy);
    p.hline(x, x + 3, y + 1, P.blue);
    p.hline(x, x + 3, y, P.white);
    p.set(x + 1, y - 1, P.white);
    p.set(x + 2, y - 1, P.concreteLt);
  };
  bowl(0, 10);
  bowl(21, 10);
  // the sauce bottle, at the back — ソースは 別
  p.rect(21, 1, 3, 6, P.woodDark);
  p.rect(21, 3, 3, 2, P.sun);
  p.set(22, 0, P.verm);
  p.set(21, 1, P.wood);
  p.outline(P.ink);
  DINNER = p.toCanvas();
  return DINNER;
}

// ---------------------------------------------------------------- ハト係長's business card

let CARD: HTMLCanvasElement[] | null = null;

/** [0] held up (6×5 with outline), [1] lying on the ground (a flatter 7×4). */
export function meishi(): HTMLCanvasElement[] {
  if (CARD) return CARD;
  const up = new PixelCanvas(8, 7);
  up.rect(1, 1, 6, 5, P.white);
  up.hline(1, 6, 1, P.glint);
  up.hline(2, 4, 3, P.navy);
  up.hline(2, 5, 4, P.steel);
  up.set(5, 2, P.verm);
  up.outline(P.ink);
  const flat = new PixelCanvas(9, 6);
  flat.rect(1, 1, 7, 4, P.white);
  flat.hline(1, 7, 4, P.concrete);
  flat.hline(2, 4, 2, P.navy);
  flat.set(6, 2, P.verm);
  flat.outline(P.ink);
  CARD = [up.toCanvas(), flat.toCanvas()];
  return CARD;
}
