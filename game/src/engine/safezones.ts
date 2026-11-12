// Where the touch buttons sit over the picture, so the drawing code can keep
// its text off them (2026-09-30, the client on an iPad held sideways:
// 「コメントがある時ボタンが上にいくの嫌だから、コメントの幅を縮めてボタンは
// 移動させない仕組みにして」「戦闘中も…ボタンが上に行ったりしないで下に固定して」).
//
// Only an iPad held sideways plays full screen with the controls floating
// over the picture (engine/touch.ts). There the controls are fixed in the
// bottom corners — the D-pad with メニュー above it on the left, けってい /
// もどる with ダッシュ above them on the right — and never move for text:
// the dialog window, the battle's panels, the fishing window… are laid out
// around them instead. touch.ts publishes where they are (game px, the air
// round each control included) with setButtonZones(); everywhere else
// (phones, an upright tablet, a PC, and while a text screen such as the
// menu shrinks the picture and stands the controls beside it)
// buttonZones() is null and every screen looks exactly as before.
//
//   const z = buttonZones();              // null: nothing floats over the picture
//   const { x0, x1 } = freeSpan(148, 212); // the free run of x for a box at y148–212

import { W } from './screen';

export interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ButtonZones {
  /**
   * Every control's box and what it must keep clear (its ink shadow, the
   * room kept for けってい's word tag, and a few px of air), in game px.
   */
  parts: readonly Zone[];
  /** The bounding box of the left cluster (D-pad, メニュー). */
  left: Zone;
  /** The bounding box of the right cluster (けってい, もどる, ダッシュ). */
  right: Zone;
}

let cur: ButtonZones | null = null;
let key = '';
let ver = 0;

/** Where the fixed touch buttons are (game px), or null when nothing floats over the picture. */
export function buttonZones(): ButtonZones | null {
  return cur;
}

/** Bumped each time the zones change (a rotation, a text screen opening or closing). */
export function buttonZonesVersion(): number {
  return ver;
}

/** touch.ts: the buttons' spots in game px (null: none over the picture). */
export function setButtonZones(z: ButtonZones | null): void {
  const k = z ? z.parts.map((p) => `${p.x},${p.y},${p.w},${p.h}`).join(' ') : '';
  if (k === key) return;
  key = k;
  cur = z;
  ver++;
}

/**
 * The free run of x (within x0..x1) for a box spanning y0..y1: right of
 * every left-hand control and left of every right-hand one that reaches
 * into those rows. Without zones: x0..x1 as given.
 */
export function freeSpan(y0: number, y1: number, x0 = 0, x1 = W): { x0: number; x1: number } {
  if (!cur) return { x0, x1 };
  let a = x0;
  let b = x1;
  for (const p of cur.parts) {
    if (p.y >= y1 || p.y + p.h <= y0) continue;
    if (p.x + p.w / 2 < W / 2) a = Math.max(a, Math.ceil(p.x + p.w));
    else b = Math.min(b, Math.floor(p.x));
  }
  return { x0: a, x1: b };
}

/** Does a box (game px) meet a control? False without zones. */
export function hitsButtons(x: number, y: number, w: number, h: number): boolean {
  if (!cur) return false;
  return cur.parts.some((p) => x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + h > p.y);
}

/**
 * The highest top edge of the controls under the columns x0..x1 (a box
 * resting there must end above it); `bottom` (default 216) when none.
 */
export function buttonsTop(x0: number, x1: number, bottom = 216): number {
  if (!cur) return bottom;
  let top = bottom;
  for (const p of cur.parts) if (p.x < x1 && p.x + p.w > x0) top = Math.min(top, Math.floor(p.y));
  return top;
}
