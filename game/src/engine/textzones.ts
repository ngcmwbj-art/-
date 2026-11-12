// Where the text is on screen right now, so the touch controls that float
// over the picture (an iPad held sideways, full screen) can keep off it
// (2026-09-28, the client: 「キーと文字がかぶるのは避けたい」 — the D-pad sat
// on the dialog window).
//
// The drawing code marks each text box as it draws it — markText(x, y, w, h)
// in game px, at the box's resting place (not a slide-in animation, so the
// controls don't chase it frame by frame) — or says the whole screen is a
// text screen (the menu, a shop): markTextScreen(). Words that only flash up
// for a moment that needs no D-pad (the battle's 「長押し！」「いま！」
// 「ツッコめ！」, the みました card, a caption) are marked `brief`: the
// controls don't move for them (not in the middle of a timing), the ones in
// their way just fade out until they go. Only what is drawn in a
// frame counts, so a box that closes simply stops being marked. At the end
// of every drawn frame commitTextZones() (a game overlay, see main.ts) keeps
// that frame's marks; uiBands() reads them, and onTextZones() listeners hear
// about it only when they changed.

import { H } from './screen';

export interface TextRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface UIBands {
  /** Where the lowest text band starts (game px, the top of a box in the lower half), or null. */
  bottom: number | null;
  /** Where the highest text band ends (game px, the bottom of a box in the upper half), or null. */
  top: number | null;
  /** The whole screen is a text screen (the menu, a shop, the save book): QA only. */
  full: boolean;
  /** Every text box of the frame (game px). */
  rects: readonly TextRect[];
  /** Brief words of the frame (game px): controls fade out of their way instead of moving. */
  brief: readonly TextRect[];
}

// this frame's marks (flat x, y, w, h, brief) and the last committed frame's
let acc: number[] = [];
let accFull = false;
let pub: number[] = [];
let pubFull = false;
let bands: UIBands = { bottom: null, top: null, full: false, rects: [], brief: [] };
const listeners: (() => void)[] = [];

/** A text box drawn this frame (game px; its resting place). `brief`: words up only for a moment. */
export function markText(x: number, y: number, w: number, h: number, brief = false): void {
  if (w <= 0 || h <= 0) return;
  acc.push(Math.round(x), Math.round(y), Math.round(w), Math.round(h), brief ? 1 : 0);
}

/**
 * This frame the whole screen is text (the menu, a shop). (Since 2026-10-01
 * the touch controls stay fixed over it as everywhere; its pages lay their
 * text out round them, safezones.ts.)
 */
export function markTextScreen(): void {
  accFull = true;
}

/** End of a drawn frame: keep its marks (listeners hear only of a change). */
export function commitTextZones(): void {
  let same = accFull === pubFull && acc.length === pub.length;
  for (let i = 0; same && i < acc.length; i++) same = acc[i] === pub[i];
  if (same) {
    acc.length = 0;
    accFull = false;
    return;
  }
  const prev = pub;
  pub = acc;
  pubFull = accFull;
  acc = prev;
  acc.length = 0;
  accFull = false;
  const rects: TextRect[] = [];
  const brief: TextRect[] = [];
  let bottom: number | null = null;
  let top: number | null = null;
  for (let i = 0; i < pub.length; i += 5) {
    const r = { x: pub[i], y: pub[i + 1], w: pub[i + 2], h: pub[i + 3] };
    if (pub[i + 4]) {
      brief.push(r);
      continue;
    }
    rects.push(r);
    if (r.y + r.h / 2 >= H / 2) bottom = bottom === null ? r.y : Math.min(bottom, r.y);
    else top = top === null ? r.y + r.h : Math.max(top, r.y + r.h);
  }
  bands = { bottom, top, full: pubFull, rects, brief };
  for (const fn of listeners) fn();
}

/** The text on screen in the last drawn frame. */
export function uiBands(): UIBands {
  return bands;
}

/** Hear when the text on screen changed (called at the end of that frame's draw). */
export function onTextZones(fn: () => void): void {
  listeners.push(fn);
}
