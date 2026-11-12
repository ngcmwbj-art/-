// 配達の道しるべ (evt_ch2_delivery, 2026-10-08 依頼主「届ける場所が分かりづらい」, 02 #91):
// while the delivery runs, where the next parcel goes shows in the world —
//   - over the next stand (or ぴょん夫人, or the truck at the end) a little
//     yellow arrow bobs, the same yellow as the slips, and over it a strip of
//     tape with the name (「ハモ区長」), as the HUD's おとどけの札 says it;
//     the strip goes when Shun is next to it (the arrow stays);
//   - the next one in another room (ぴょん夫人 in the 集会所): over that
//     room's door;
//   - off the screen: a yellow arrow at the screen's edge, pointing the way.
// Anchored world fx (fxAt): in the HD-2D view at the 3D points they stand
// for. Hidden while an event holds the field (talks, the put_down).
//
//   setDeliGuide((f) => ({ map, x, foot, h, name }) | null);

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { W, H } from '../../engine/screen';
import { buttonZones } from '../../engine/safezones';
import { P } from '../../art/tiles/palette';
import { outline } from '../../art/props/kit';
import type { FieldScene } from '../../world/field';
import { fxAt, registerWorldFx } from '../../world/fx';
import { drawTape, textW, UI } from '../../ui/window';

/** Where the next parcel goes: world px of its foot (x, foot), the arrow's tip `h` px above it, the name on the strip. */
export interface DeliTarget {
  map: string;
  x: number;
  foot: number;
  h: number;
  name: string;
}

let source: ((f: FieldScene) => DeliTarget | null) | null = null;

/** The delivery tells where the next parcel goes (null: nothing to show). */
export function setDeliGuide(fn: ((f: FieldScene) => DeliTarget | null) | null): void {
  source = fn;
}

/** The target as seen from this map: itself, or the door of this map that leads to it (or outside). */
function onThisMap(f: FieldScene, t: DeliTarget): DeliTarget | null {
  if (t.map === f.map.id) return t;
  const doors = f.map.objects.filter((o) => o.t === 'door') as { t: 'door'; x: number; y: number; to: string }[];
  const d = doors.find((o) => o.to === t.map) ?? doors.find((o) => o.to === 'map_hoshimidai');
  if (!d) return null;
  return { map: f.map.id, x: d.x * 16 + 8, foot: d.y * 16 + 16, h: 22, name: t.name };
}

// ---------------------------------------------------------------- the pictures

let downImg: HTMLCanvasElement | null = null;
/** The arrow over the target (9×8, 11×10 inked): the slips' yellow, a pale top edge. */
function downArrow(): HTMLCanvasElement {
  if (downImg) return downImg;
  const p = new PixelCanvas(11, 10);
  const rows = ['  #####  ', '  #####  ', '  #####  ', '#########', ' ####### ', '  #####  ', '   ###   ', '    #    '];
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      if (ch !== '#') return;
      const lit = y === 0 || (y === 3 && (x < 2 || x > 6));
      p.set(x + 1, y + 1, lit ? P.goldPale : x >= 5 && y >= 3 ? P.brass : P.gold);
    }),
  );
  outline(p);
  downImg = p.toCanvas();
  return downImg;
}

const edgeImgs = new Map<number, HTMLCanvasElement>();
/** The arrow at the screen's edge, pointing along `step` (16 directions): a yellow wedge (13 px), inked. */
function edgeArrow(step: number): HTMLCanvasElement {
  let c = edgeImgs.get(step);
  if (c) return c;
  const a = (step / 16) * Math.PI * 2;
  const S = 15;
  const p = new PixelCanvas(S, S);
  const m = (S - 1) / 2;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  // the wedge: tip 6 px out along the direction, the base 4 px back, 5 px either side
  const tip = [m + ux * 6, m + uy * 6];
  const b1 = [m - ux * 4 - uy * 5, m - uy * 4 + ux * 5];
  const b2 = [m - ux * 4 + uy * 5, m - uy * 4 - ux * 5];
  const side = (px: number, py: number, A: number[], B: number[]) => (B[0] - A[0]) * (py - A[1]) - (B[1] - A[1]) * (px - A[0]);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const s1 = side(x, y, tip, b1);
      const s2 = side(x, y, b1, b2);
      const s3 = side(x, y, b2, tip);
      const inside = (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
      if (!inside) continue;
      // lit towards the top-left, the yellow of the slips
      const lit = (x - m) * -0.7 + (y - m) * -0.7;
      p.set(x, y, lit > 2.5 ? P.goldPale : lit < -2.5 ? P.brass : P.gold);
    }
  outline(p);
  c = p.toCanvas();
  edgeImgs.set(step, c);
  return c;
}

// ---------------------------------------------------------------- drawing

/** The screen's free room for the edge arrow: off the HUD's strip (top left), the clock and the corner buttons. */
function keepClear(x: number, y: number): [number, number] {
  if (x < 160 && y < 66) {
    // under the おとどけ strip (or beside it, pointing up)
    if (y < 40) x = Math.max(x, 166);
    else y = 66;
  }
  if (x > W - 70 && y < 34) y = 34;
  if (x < 40 && y > H - 40) x = 40;
  const z = buttonZones();
  if (z)
    for (const pt of z.parts)
      if (x > pt.x - 8 && x < pt.x + pt.w + 8 && y > pt.y - 8) y = Math.min(y, pt.y - 10);
  return [x, y];
}

function draw(f: FieldScene, g: Gfx, cx: number, cy: number): void {
  if (!source || !f.controllable) return;
  const t0 = source(f);
  const t = t0 && onThisMap(f, t0);
  if (!t) return;
  const bob = Math.round((Math.sin(f.t / 170) + 1) * 1.2);
  const [sx, sy] = fxAt(f, t.x, t.foot - t.h, cx, cy, t.foot);
  // the room view (a zoomed room) shows part of the frame: no edge arrows there
  const zoomed = f.viewScale > 1;
  const M = 10;
  const onScreen = zoomed || (sx > M && sx < W - M && sy > 20 && sy < H - 6);
  if (onScreen) {
    const img = downArrow();
    g.img(img, Math.round(sx - img.width / 2), Math.round(sy - img.height - bob));
    // the name, unless he is next to it
    const near = Math.hypot(f.player.x - t.x, f.player.y - t.foot) < 40;
    if (!near && t.name) {
      const tw = textW(t.name) + 10;
      const lx = Math.round(Math.max(2, Math.min(W - tw - 2, sx - tw / 2)));
      const ly = Math.round(sy - img.height - 2 - 18);
      // (not under the HUD's strip or the clock: the strip says the name there already)
      const hidden = ly < 2 || (lx < 170 && ly < 62) || (lx + tw > W - 76 && ly < 30);
      if (!hidden) drawTape(g, lx, ly, tw, 17, t.name, { color: UI.tape, seed: 31 });
    }
    return;
  }
  // off the screen: an arrow at the edge, from the middle of the screen towards it
  const [px, py] = fxAt(f, f.player.x, f.player.y - 12, cx, cy, f.player.y);
  const dx = sx - px;
  const dy = sy - py;
  const a = Math.atan2(dy, dx);
  const k = Math.min(dx ? (dx > 0 ? W - 14 - px : px - 14) / Math.abs(dx) : 1e9, dy ? (dy > 0 ? H - 14 - py : py - 32) / Math.abs(dy) : 1e9);
  let ex = px + dx * Math.max(0, k);
  let ey = py + dy * Math.max(0, k);
  [ex, ey] = keepClear(ex, ey);
  const step = ((Math.round((a / (Math.PI * 2)) * 16) % 16) + 16) % 16;
  const img = edgeArrow(step);
  const out = bob * 0.8;
  g.img(img, Math.round(ex - img.width / 2 + Math.cos(a) * out), Math.round(ey - img.height / 2 + Math.sin(a) * out));
}

registerWorldFx({
  map: '',
  anchored: true,
  draw(f, g, cx, cy, layer) {
    // over the night's grade (the 2D) — lit, as the HUD is
    if (layer === 'glow') draw(f, g, cx, cy);
  },
});
