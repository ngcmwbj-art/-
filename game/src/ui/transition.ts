// Screen transitions in the game's pixel language: an ordered (Bayer 4×4,
// 2px cells) dither that fills the screen with a colour, the same dissolve
// the battle uses for its ink. Drawn as an overlay above everything.
//
//   yield* ditherOut(600, '#0B0B14');   // cover
//   ...switch scenes...
//   yield* ditherIn(600);               // reveal

import type { Co } from '../engine/co';
import { FRAME_MS } from '../engine/co';
import { game } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { BAYER4, makeCanvas } from '../engine/pixel';
import { W, H } from '../engine/screen';

const patterns = new Map<string, CanvasPattern | null>();

function pattern(ctx: CanvasRenderingContext2D, level: number, color: string): CanvasPattern | null {
  const key = level + color;
  if (patterns.has(key)) return patterns.get(key)!;
  const [c, cx] = makeCanvas(8, 8);
  cx.fillStyle = color;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (BAYER4[j][i] < level) cx.fillRect(i * 2, j * 2, 2, 2);
  const p = ctx.createPattern(c, 'repeat');
  patterns.set(key, p);
  return p;
}

const state = { k: 0, color: '#1B1733', installed: false };

function draw(g: Gfx): void {
  if (state.k <= 0) return;
  const level = Math.round(state.k * 16);
  const ctx = g.ctx;
  if (level >= 16) {
    ctx.fillStyle = state.color;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const p = pattern(ctx, level, state.color);
  if (!p) return;
  ctx.fillStyle = p;
  ctx.fillRect(0, 0, W, H);
}

function install(): void {
  if (state.installed) return;
  state.installed = true;
  game.overlays.unshift(draw);
}

/** Current cover amount (0 = clear, 1 = covered). */
export function ditherLevel(): number {
  return state.k;
}

/** Cover the screen with `color` through the dither (ms). */
export function* ditherOut(ms = 500, color = '#1B1733'): Co {
  install();
  state.color = color;
  const k0 = state.k;
  for (let t = 0; t < ms; t += FRAME_MS) {
    state.k = k0 + (1 - k0) * (t / ms);
    yield null;
  }
  state.k = 1;
}

/** Reveal the screen again (ms). */
export function* ditherIn(ms = 500): Co {
  install();
  const k0 = state.k;
  for (let t = 0; t < ms; t += FRAME_MS) {
    state.k = k0 * (1 - t / ms);
    yield null;
  }
  state.k = 0;
}

/**
 * Hand a dither cover over to the engine's fade (game.fadeAlpha = 1 in the
 * same colour), e.g. before a script that fades in with game.fadeIn().
 */
export function coverToFade(): void {
  game.fadeColor = state.color;
  game.fadeAlpha = 1;
  state.k = 0;
}
