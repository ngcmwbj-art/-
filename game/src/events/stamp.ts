// 『みました』 on a ふしぎ — the game's most used verb, pressed like a hanko
// and not just a decal (QA round 3). Installed as the world's stamp visual
// (setStampFx, with its own impact sound):
//
//   the camera pushes in (2×) on what is stamped; the wooden hanko comes down
//   from above the frame, squashes on impact (shake, 80 ms hitstop, the
//   ぺたん), vermilion ink flies; it lifts away and leaves a 『みました』 seal
//   written big enough to read; then the camera pulls back and the seal
//   settles on the thing itself (world size) and fades while the text goes on.
//
// The first stamp of the game (the tutorial on まめ吉) takes its time; later
// ones push in and out quicker.

import type { Co } from '../engine/co';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { animate, ease } from '../engine/tween';
import { sfx } from '../audio';
import { field, type FieldScene } from '../world/field';
import { registerWorldFx } from '../world/fx';
import { fushigiCount, setStampFx } from '../world/fushigi';
import { ovalStamp } from '../battle/art/stamps';
import { hankoCloseup } from '../battle/art/fxart';
import { zoomIn, zoomOut, type ZoomView } from './stage';
import { panBack, panTo } from './lib';
import { W } from '../engine/screen';

const INK = ['#E23B2E', '#FF6A4D', '#B8241E', '#E23B2E'];

// ---------------------------------------------------------------- the seal and the ink (world px)

interface Seal {
  x: number;
  y: number;
  t: number;
  /** Shown from this alpha (the close-up's big seal hands over to it). */
  a: number;
  /** How long it stays before it fades (ms). */
  hold: number;
}
interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
  c: string;
  s: number;
  /** Where it lands (world y). */
  floor: number;
}
const seals: Seal[] = [];
const drops: Drop[] = [];

/** The seal as it stays on the thing: 40×16 world px, a paper rim so it reads on any colour. */
function worldSeal(): HTMLCanvasElement {
  return ovalStamp('みました', 40, 16, 0.1, 7, true);
}
/** The same seal written out in the close-up: the 16 px font, 84×32 screen px (42×16 of the world at 2×). */
function bigSeal(): HTMLCanvasElement {
  return ovalStamp('みました', 84, 32, 0.08, 7, true);
}
/** Its ink alone (no paper), laid again a pixel over: pressed hard, the strokes read at a glance. */
function bigInk(): HTMLCanvasElement {
  return ovalStamp('みました', 84, 32, 0.08, 7, false);
}

registerWorldFx({
  map: '',
  update(_f, dt) {
    for (const s of seals) s.t += dt;
    for (let i = seals.length - 1; i >= 0; i--) if (seals[i].t > seals[i].hold + 450) seals.splice(i, 1);
    for (const d of drops) {
      d.t += dt;
      const k = dt / 1000;
      if (d.y < d.floor) {
        d.vy += 520 * k;
        d.x += d.vx * k;
        d.y = Math.min(d.floor, d.y + d.vy * k);
      }
    }
    for (let i = drops.length - 1; i >= 0; i--) if (drops[i].t > drops[i].life) drops.splice(i, 1);
  },
  draw(_f, g, cx, cy, layer) {
    // 'glow': after the night grading (the ink stays vermilion) and before
    // the close-up blows the frame up (so the ink is magnified with it)
    if (layer !== 'glow') return;
    const img = worldSeal();
    for (const s of seals) {
      const a = s.a * (s.t > s.hold ? Math.max(0, 1 - (s.t - s.hold) / 450) : 1);
      if (a <= 0.01) continue;
      g.img(img, Math.round(s.x - img.width / 2 - cx), Math.round(s.y - img.height / 2 - cy), a < 1 ? { alpha: a } : {});
    }
    for (const d of drops) {
      const a = d.t > d.life - 200 ? Math.max(0, (d.life - d.t) / 200) : 1;
      g.rect(Math.round(d.x - cx), Math.round(d.y - cy), d.s, d.s, d.c, a);
    }
  },
});

/** Vermilion ink flying off the face on impact (world px). */
function splash(x: number, y: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const sp = 34 + Math.random() * 60;
    drops.push({
      x: x + side * (10 + Math.random() * 10),
      y: y - 1 + Math.random() * 3,
      vx: side * sp,
      vy: -(60 + Math.random() * 80),
      t: 0,
      life: 560 + Math.random() * 260,
      c: INK[i % INK.length],
      s: i % 3 === 0 ? 2 : 1,
      floor: y + 6 + Math.random() * 8,
    });
  }
}

// ---------------------------------------------------------------- the hanko and the written seal (screen px)

class HankoDrop implements Widget {
  modal = false;
  done = false;
  /** How far above its resting place the hanko is (screen px). */
  lift = 200;
  squash = 0;
  alpha = 1;
  /** The written seal: alpha, and the frames of its white flash. */
  seal = 0;
  flash = 0;
  constructor(
    private f: FieldScene,
    private z: ZoomView,
    private wx: number,
    private wy: number,
  ) {}
  update(): void {
    if (this.flash > 0) this.flash--;
  }

  private screen(): [number, number] {
    const [x, y] = this.z.toScreen(this.f, this.wx, this.wy);
    return [Math.round(x), Math.round(y)];
  }

  draw(g: Gfx): void {
    if (field() !== this.f) return;
    const [sx, sy] = this.screen();
    // the seal, written out (under the hanko while it is still down)
    if (this.seal > 0) {
      const img = bigSeal();
      const x = sx - Math.floor(img.width / 2);
      const y = sy - Math.floor(img.height / 2);
      // pressed hard: the ink a pixel wider than the art's hairlines
      const o = this.seal < 1 ? { alpha: this.seal } : {};
      g.img(img, x, y, o);
      g.img(bigInk(), x + 1, y, o);
      // the first two frames: the paper flashes where the face came off
      if (this.flash > 0) g.img(img, x, y, { tint: '#FFFFFF', tintAmount: 1, alpha: 0.7 * this.seal });
    }
    if (this.alpha <= 0) return;
    // the hanko at 2× (its face as wide as the seal it leaves); the face's
    // lower edge (row 53 of the 48×58 art) rests on the seal's middle line
    const rest = sy + 12;
    const lift = Math.round(this.lift);
    // its shadow on the surface: small and faint while it is high up
    const k = Math.max(0, 1 - lift / 200);
    if (lift > 0) {
      const rw = Math.round(12 + 20 * k);
      g.alpha((0.15 + 0.3 * k) * this.alpha, () => {
        for (let yy = -3; yy <= 3; yy++) {
          const half = Math.round(rw * Math.sqrt(1 - (yy * yy) / 12.25));
          g.rect(sx - half, rest - 3 + yy, half * 2, 1, '#1B1733');
        }
      });
    }
    const img = hankoCloseup(this.squash);
    g.img(img, sx - 48, rest - 106 - lift, { scale: 2, alpha: this.alpha });
  }
}

// ---------------------------------------------------------------- the stamp

/**
 * Press 『みました』 on world point (x, y). `full`: the first time (a longer
 * push-in and a held look at the seal). Plays se_stamp on the impact frame.
 */
export function* stampAt(x: number, y: number, full: boolean): Co {
  const f = field();
  if (!f) {
    sfx('se_stamp');
    return;
  }
  // a close-up only magnifies the frame on screen: bring what is stamped
  // into the middle first when it sits near an edge (the clock tower at
  // the top of the park, a sign behind Minato)
  const sx = x - f.camX;
  const sy = y - f.camY;
  const pan = !f.camOverride && (sx < 72 || sx > W - 72 || sy < 64 || sy > 136);
  if (pan) yield* panTo(Math.floor(x / 16), Math.floor((y + 10) / 16), 320);
  // push in on it: what is stamped a little above the middle, clear of the window
  const z = yield* zoomIn(x, y + 10, full ? 340 : 190);
  if (full) yield 90;
  const h = new HankoDrop(f, z, x, y);
  game.ui.push(h);
  // down from above the frame (quadIn: it falls, it isn't lowered)
  yield* animate(full ? 170 : 130, (p) => (h.lift = 200 * (1 - p)), ease.quadIn);
  h.lift = 0;
  // ぺたん: the handle squashes for two frames, the frame jolts and holds
  h.squash = 3;
  h.seal = 1;
  h.flash = 2;
  sfx('se_stamp');
  game.shake(1, 120);
  game.hitstop(80);
  splash(x, y + 4, full ? 12 : 8);
  yield 34;
  h.squash = 1;
  yield 50;
  h.squash = 0;
  yield full ? 160 : 80;
  // it lifts away and shows the seal
  yield* animate(full ? 170 : 120, (p) => {
    h.lift = Math.round(90 * ease.quadOut(p));
    h.alpha = 1 - p;
  });
  // a look at it: 『みました』
  yield full ? 420 : 240;
  // the camera pulls back; the written seal hands over to the seal on the thing
  const s: Seal = { x, y, t: 0, a: 0, hold: full ? 1400 : 1000 };
  seals.push(s);
  game.scripts.run(
    animate(full ? 300 : 220, (p) => {
      h.seal = 1 - p;
      s.a = p;
    }),
  );
  yield* zoomOut(z, full ? 300 : 220);
  s.a = 1;
  h.done = true;
  if (pan) yield* panBack(300);
}

/** The world's stamp hook: the seal on the ふしぎ `id` (its spot, or over Minato). */
export function* stampFushigi(id: string): Co {
  const f = field();
  if (!f) {
    sfx('se_stamp');
    return;
  }
  const spot = f.fushigiSpots().find((s) => s.id === id);
  const x = spot?.x ?? f.player.x;
  const y = (spot?.y ?? f.player.y - 24) - 6;
  yield* stampAt(Math.round(x), Math.round(y), fushigiCount() === 0);
}

setStampFx(stampFushigi, { ownSound: true });

/** QA: drop what a jump left behind. */
export function resetStamp(): void {
  seals.length = 0;
  drops.length = 0;
}
