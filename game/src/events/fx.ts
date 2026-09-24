// Small presentation pieces of the story events that are not map data:
//  - sparkle(x, y): a 4-point glint in world pixels (the fryer's oil, the bell)
//  - playCaseGift(): evt_hanko_given's case that opens in the middle of the
//    screen with みました and ペケ in it (10_narrative 5.8)
//  - puff(x, y): a little dust ring (ハト → ハト係長, the ojigi hop)

import type { Co } from '../engine/co';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { PixelCanvas } from '../engine/pixel';
import { W, H } from '../engine/screen';
import { animate, ease } from '../engine/tween';
import { registerWorldFx } from '../world/fx';
import { caseLid, drawCase, CASE_H, CASE_W } from '../ui/hankocase';
import { runMsg } from '../world/msg';
import { sfx } from '../audio';

// ---------------------------------------------------------------- world glints & puffs

interface Spark {
  x: number;
  y: number;
  t: number;
  kind: 'glint' | 'puff' | 'ring';
  color: string;
  dur: number;
}
const sparks: Spark[] = [];

let GLINT: HTMLCanvasElement[] | null = null;
function glintFrames(): HTMLCanvasElement[] {
  if (GLINT) return GLINT;
  GLINT = [1, 2, 3, 2, 1].map((r) => {
    const p = new PixelCanvas(9, 9);
    for (let i = -r; i <= r; i++) {
      p.set(4 + i, 4, i === 0 ? '#FFFFFF' : '#FFF6D8');
      p.set(4, 4 + i, i === 0 ? '#FFFFFF' : '#FFF6D8');
    }
    if (r >= 2) {
      p.set(3, 3, '#FFE7A3');
      p.set(5, 5, '#FFE7A3');
      p.set(5, 3, '#FFE7A3');
      p.set(3, 5, '#FFE7A3');
    }
    return p.toCanvas();
  });
  return GLINT;
}

registerWorldFx({
  map: '',
  update(_f, dt) {
    for (const s of sparks) s.t += dt;
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].t > sparks[i].dur) sparks.splice(i, 1);
  },
  draw(_f, g, cx, cy, layer) {
    if (layer !== 'glow' || !sparks.length) return;
    for (const s of sparks) {
      const k = s.t / s.dur;
      const x = Math.round(s.x - cx);
      const y = Math.round(s.y - cy);
      if (s.kind === 'glint') {
        const fr = glintFrames();
        const img = fr[Math.min(fr.length - 1, Math.floor(k * fr.length))];
        g.img(img, x - 4, y - 4);
      } else if (s.kind === 'puff') {
        // eight dust motes spreading on the ground
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const r = 3 + ease.cubicOut(k) * 9;
          g.alpha(1 - k, () => g.rect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.45), 2, 1, s.color));
        }
      } else {
        const r = Math.round(2 + ease.cubicOut(k) * 12);
        g.alpha((1 - k) * 0.9, () => g.ring(x, y, r, s.color));
      }
    }
  },
});

/** A white 4-point glint at world pixel (x, y). */
export function sparkle(x: number, y: number, dur = 420): void {
  sparks.push({ x, y, t: 0, kind: 'glint', color: '#FFFFFF', dur });
}

/** A ring of dust at the feet (world px). */
export function puff(x: number, y: number, color = '#E8D9B5'): void {
  sparks.push({ x, y, t: 0, kind: 'puff', color, dur: 380 });
}

/** A widening light ring (world px). */
export function ring(x: number, y: number, color = '#FFE7A3', dur = 500): void {
  sparks.push({ x, y, t: 0, kind: 'ring', color, dur });
}

// ---------------------------------------------------------------- 5.8 the hanko case, handed over

class CaseGift implements Widget {
  modal = false;
  done = false;
  t = 0;
  dim = 0;
  rise = 0;
  open = false;
  lidLift = 0;
  closing = 0;
  appear = [0, 0];
  orbit = -1;

  update(dt: number): void {
    this.t += dt;
    if (this.orbit >= 0) this.orbit += dt;
  }

  draw(g: Gfx): void {
    if (this.dim > 0) g.rect(0, 0, W, H, '#0B0B14', this.dim);
    const x = Math.round(W / 2 - CASE_W / 2);
    const y0 = 26;
    const y = Math.round(y0 + (1 - ease.backOut(this.rise)) * 120 + ease.quadIn(this.closing) * 150);
    if (this.rise <= 0) return;
    if (!this.open) {
      g.img(caseLid(), x, y);
      return;
    }
    drawCase(g, x, y, {
      owned: (id) => id === 'skill_mimashita' || id === 'skill_peke',
      clear: false,
      t: this.t,
      appear: (i) => (i < 2 ? this.appear[i] : 1),
    });
    // the lid lifted away behind the case
    if (this.lidLift < 1) g.alpha(1 - this.lidLift, () => g.img(caseLid(), x, y - Math.round(this.lidLift * 26)));
    // a vermilion light runs once around the frame
    if (this.orbit >= 0 && this.orbit < 700) {
      const per = 2 * (CASE_W + CASE_H);
      for (let k = 0; k < 6; k++) {
        const d = ((this.orbit / 700) * per - k * 3 + per) % per;
        let px: number;
        let py: number;
        if (d < CASE_W) [px, py] = [x + d, y];
        else if (d < CASE_W + CASE_H) [px, py] = [x + CASE_W - 1, y + d - CASE_W];
        else if (d < 2 * CASE_W + CASE_H) [px, py] = [x + CASE_W - 1 - (d - CASE_W - CASE_H), y + CASE_H - 1];
        else [px, py] = [x, y + CASE_H - 1 - (d - 2 * CASE_W - CASE_H)];
        g.rect(Math.round(px) - 1, Math.round(py) - 1, 2, 2, k === 0 ? '#FF6A4D' : '#E23B2E', 1 - k / 6);
      }
    }
  }
}

/**
 * 「ハンコケースのアイコンが画面中央でパカッと開く」: the case rises, the lid
 * opens, みました and ペケ settle into their slots, the @sys pages run with the
 * case open, then it closes and drops away.
 */
export function* playCaseGift(text: string): Co {
  const w = new CaseGift();
  game.ui.push(w);
  yield* animate(200, (p) => {
    w.dim = p * 0.5;
    w.rise = p;
  });
  yield 250;
  sfx('se_paper_open', { pitch: 0.7 });
  w.open = true;
  yield* animate(180, (p) => (w.lidLift = p), ease.quadOut);
  w.orbit = 0;
  yield 500;
  for (let i = 0; i < 2; i++) {
    sfx('se_hanko_learn', { vol: 0.8, pitch: i ? 1.12 : 1 });
    yield* animate(260, (p) => (w.appear[i] = p), ease.quadOut);
    yield 120;
  }
  yield* runMsg(text);
  w.open = false;
  sfx('se_paper_open', { pitch: 0.55, vol: 0.6 });
  yield 90;
  yield* animate(220, (p) => {
    w.closing = p;
    w.dim = 0.5 * (1 - p);
  });
  w.done = true;
}
