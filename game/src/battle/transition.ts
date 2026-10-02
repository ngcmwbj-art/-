// Encounter transition (16.1): a vermilion "！" seal slaps down, ink bleeds
// to fill the screen, then the battle background dissolves out of the ink
// with a 4×4 Bayer dither. And the return: ink shrinks to the centre.

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { BAYER4, makeCanvas } from '../engine/pixel';
import { valueNoise } from '../engine/rng';
import { ease } from '../engine/tween';
import type { BattleScene } from './scene';
import { roundSeal } from './art/stamps';

const INK = [0xe2, 0x3b, 0x2e];
const INK_D = [0xb8, 0x24, 0x1e];

let buf: HTMLCanvasElement | null = null;
let bctx: CanvasRenderingContext2D | null = null;
let img: ImageData | null = null;

/**
 * Draw an ink blob of radius R around (cx, cy) with a noisy rim.
 * `dissolve` 0..1 knocks pixels out with ordered dither (reveals below).
 * `invert` draws the ink *outside* the blob instead.
 */
function drawInk(g: Gfx, cx: number, cy: number, R: number, dissolve: number, seed: number, invert = false): void {
  if (!buf) {
    [buf, bctx] = makeCanvas(384, 216);
    img = bctx.createImageData(384, 216);
  }
  const d = img!.data;
  const th = dissolve * 16;
  for (let y = 0; y < 216; y++) {
    const row = BAYER4[y & 3];
    for (let x = 0; x < 384; x++) {
      const i = (y * 384 + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      let r = R;
      if (R > 0 && R < 600) {
        const a = Math.atan2(dy, dx);
        r = R * (1 + 0.12 * (valueNoise(a * 3 + 10, seed, 5) * 2 - 1));
      }
      let inside = dist <= r;
      if (invert) inside = !inside;
      if (!inside || row[x & 3] < th) {
        d[i + 3] = 0;
        continue;
      }
      // darker toward the rim
      const edge = invert ? 0 : Math.min(1, dist / Math.max(1, r));
      const c = edge > 0.82 ? INK_D : INK;
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
      d[i + 3] = 255;
    }
  }
  bctx!.putImageData(img!, 0, 0);
  g.ctx.drawImage(buf!, 0, 0);
}

function* frames(ms: number, fn: (t: number, p: number) => void): Co {
  let t = 0;
  fn(0, 0);
  while (t < ms) {
    yield null;
    t += 1000 / 60;
    fn(Math.min(t, ms), Math.min(1, t / ms));
  }
}

/** In-transition. Leaves the scene opaque with the battle background showing. */
export function* transitionIn(s: BattleScene, boss: boolean): Co {
  const seal = roundSeal('！', 48);
  const st = { t: 0, ink: 0, dissolve: 0, sealScale: 2, sealAlpha: 1, phase: 0 };
  s.transparent = true;
  s.transitionDraw = (g) => {
    if (st.phase >= 1) drawInk(g, 192, 108, st.ink, st.dissolve, 7);
    if (st.sealAlpha > 0) {
      const w = seal.width * st.sealScale;
      // a paper rim and a soft drop so the seal stays readable on the ink
      g.alpha(st.sealAlpha, () => {
        const r = Math.round(w / 2);
        g.circle(193, 110, r + 2, '#5B1A14');
        g.circle(192, 108, r + 2, '#FBF3DC');
        g.ctx.drawImage(seal, Math.round(192 - w / 2), Math.round(108 - w / 2), Math.round(w), Math.round(w));
      });
    }
  };
  // (the boss's E5 is rung by evt_boss_intro before the battle starts — 13.1)
  // 0–100ms: the field freezes; the seal drops 2.0 → 1.0 (easeInQuad)
  yield* frames(100, (_t, p) => (st.sealScale = 2 - ease.quadIn(p)));
  s.sfx('se_encounter');
  game.shake(2, 100);
  // the boss holds the seal 200ms longer (900ms total)
  if (boss) yield 200;
  // 100–350ms: ink bleeds out to fill the screen
  st.phase = 1;
  yield* frames(250, (_t, p) => (st.ink = 24 + (260 - 24) * ease.quadOut(p)));
  st.ink = 700;
  // 350–500ms: battle background dissolves out of the ink
  s.transparent = false;
  s.hideAll = false;
  yield* frames(150, (_t, p) => {
    st.dissolve = p;
    st.sealAlpha = 1 - p;
  });
  s.transitionDraw = null;
}

/** Screen position of the player on the field below the battle (duck-typed). */
function fieldFocus(s: BattleScene): [number, number] {
  const i = game.scenes.indexOf(s);
  const below = game.scenes[i - 1] as unknown as { player?: { x: number; y: number }; camX?: number; camY?: number } | undefined;
  if (below?.player && typeof below.camX === 'number' && typeof below.camY === 'number') {
    const x = Math.round(below.player.x - below.camX);
    const y = Math.round(below.player.y - 12 - below.camY);
    if (x >= 0 && x < 384 && y >= 0 && y < 216) return [x, y];
  }
  return [192, 108];
}

/**
 * Out-transition (450ms, or 300ms when fleeing): the battle floods with ink,
 * the ink shrinks from the screen edges toward the player on the field, and
 * the field dithers back in. Scene becomes transparent.
 */
export function* transitionOut(s: BattleScene, fast = false): Co {
  const k = fast ? 300 / 450 : 1;
  const [fx, fy] = fieldFocus(s);
  const st = { R: 0, dissolve: 1, invert: false, phase: 0 };
  s.transitionDraw = (g) => {
    if (st.phase === 0) drawInk(g, 192, 108, 700, st.dissolve, 3);
    else drawInk(g, fx, fy, st.R, st.dissolve, 3);
  };
  // flood the battle with ink (dither in)
  yield* frames(60 * k, (_t, p) => (st.dissolve = 1 - p));
  st.dissolve = 0;
  // field shows around a shrinking blob of ink
  s.transparent = true;
  s.hideAll = true;
  st.phase = 1;
  const R0 = Math.hypot(Math.max(fx, 384 - fx), Math.max(fy, 216 - fy)) + 20;
  yield* frames(270 * k, (_t, p) => (st.R = R0 * (1 - ease.quadIn(p)) + 10 * p));
  // the last blob dithers away
  yield* frames(120 * k, (_t, p) => (st.dissolve = p));
  s.transitionDraw = null;
}
