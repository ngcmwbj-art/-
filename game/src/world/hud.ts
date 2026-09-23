// Field HUD (30_level_art 10.6): the enamel clock plate (top right) and the
// hanko icon (bottom left) that shakes near an unstamped 「ふしぎ」.
// The UI team can replace it with setFieldHud().

import type { Gfx } from '../engine/gfx';
import { PixelCanvas } from '../engine/pixel';
import { flag } from '../game/state';
import { P } from '../art/tiles/palette';
import type { FieldScene } from './field';
import { fushigiActive } from './fushigi';
import * as snd from './audio';

export interface FieldHud {
  update(dt: number, f: FieldScene): void;
  draw(g: Gfx, f: FieldScene): void;
}

const DIGITS: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
};

export function drawDigits(g: Gfx, s: string, x: number, y: number, color: string): number {
  let cx = x;
  for (const ch of s) {
    if (ch === ':') {
      cx += 3;
      continue;
    }
    const rows = DIGITS[ch];
    if (!rows) {
      cx += 6;
      continue;
    }
    for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) if (rows[j][i] === '1') g.px(cx + i, y + j, color);
    cx += 6;
  }
  return cx - x;
}

const TIMES = ['16:52', '16:55', '16:58', '17:00', '17:01'];

let plate: HTMLCanvasElement | null = null;
function plateImg(): HTMLCanvasElement {
  if (plate) return plate;
  const p = new PixelCanvas(52, 18);
  p.rect(1, 0, 50, 18, P.ink);
  p.rect(0, 1, 52, 16, P.ink);
  p.rect(1, 1, 50, 16, P.white);
  p.hline(2, 49, 1, P.glint);
  p.hline(2, 49, 16, P.concrete);
  p.vline(50, 2, 16, P.concrete);
  p.set(3, 8, P.steel);
  p.set(48, 8, P.steel);
  p.set(3, 9, P.concrete);
  p.set(48, 9, P.concrete);
  plate = p.toCanvas();
  return plate;
}

let stampIcon: HTMLCanvasElement[] | null = null;
function hankoIcon(): HTMLCanvasElement[] {
  if (stampIcon) return stampIcon;
  stampIcon = [P.verm, P.vermLt].map((face) => {
    const p = new PixelCanvas(20, 22);
    // wooden handle (knob + neck)
    p.ellipse(10, 4, 4.5, 3.5, P.woodLt);
    p.rect(7, 5, 7, 8, P.woodLt);
    p.vline(7, 5, 12, P.goldPale);
    p.vline(13, 5, 12, P.brassOld);
    p.set(8, 2, P.goldPale);
    p.set(9, 2, P.goldPale);
    // collar
    p.rect(5, 13, 11, 2, P.wood);
    p.hline(5, 15, 13, P.brassOld);
    // vermilion stamp base
    p.rect(4, 15, 13, 5, face);
    p.hline(4, 16, 15, P.vermLt);
    p.hline(4, 16, 19, P.vermShade);
    p.vline(16, 15, 19, P.vermShade);
    p.outline(P.ink);
    return p.toCanvas();
  });
  return stampIcon;
}

let scrapImg: HTMLCanvasElement | null = null;
/** A torn scrap of the summer notebook under the hanko, so it reads as UI (10.1). */
function noteScrap(): HTMLCanvasElement {
  if (scrapImg) return scrapImg;
  const w = 28;
  const h = 28;
  const p = new PixelCanvas(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      // torn right & bottom edges (zigzag), cut top & left
      const tornR = w - 2 - ((y * 7) % 3);
      const tornB = h - 2 - ((x * 5) % 3);
      if (x > tornR || y > tornB) continue;
      let c: string = P.paper;
      if ((y - 3) % 6 === 0) c = P.aqua; // ruled lines
      if (x === 5) c = P.peach; // margin
      p.set(x, y, c);
    }
  // fold shadow and ink outline
  for (let y = 1; y < h; y++) {
    const tornR = w - 2 - ((y * 7) % 3);
    if (tornR + 1 < w) p.set(tornR + 1, y, P.ink);
  }
  for (let x = 1; x < w; x++) {
    const tornB = h - 2 - ((x * 5) % 3);
    if (tornB + 1 < h) p.set(x, tornB + 1, P.ink);
  }
  p.hline(0, w - 4, 0, P.paperGrid);
  p.vline(0, 0, h - 4, P.paperGrid);
  scrapImg = p.toCanvas();
  return scrapImg;
}

class DefaultHud implements FieldHud {
  private y = -24;
  private showT = 0;
  private lastClock = -1;
  private lastMap = '';
  private fushigiNear: string | null = null;
  private lastSe = new Map<string, number>();
  private t = 0;
  private back = 0;
  override: string | null = null;

  show(ms = 4000): void {
    this.showT = ms;
  }

  update(dt: number, f: FieldScene): void {
    this.t += dt;
    const c = flag('flag_clock');
    if (c !== this.lastClock || f.map.id !== this.lastMap) {
      if (this.lastClock >= 0 || this.lastMap) this.show();
      this.lastClock = c;
      this.lastMap = f.map.id;
    }
    if (this.showT > 0) this.showT -= dt;
    const always = flag('flag_stage') >= 1 && flag('flag_stage') < 3;
    const want = (this.showT > 0 || always || this.override) && !flag('flag_hud_hidden') ? 4 : -24;
    this.y += Math.sign(want - this.y) * Math.min(Math.abs(want - this.y), dt / 12);
    // fushigi proximity
    let near: string | null = null;
    if (flag('flag_got_hanko')) {
      for (const s of f.fushigiSpots()) {
        if (!fushigiActive(s.id)) continue;
        const d = Math.hypot(f.player.x - s.x, f.player.y - 8 - s.y);
        if (d <= 40) {
          near = s.id;
          break;
        }
      }
    }
    if (near && near !== this.fushigiNear) {
      const last = this.lastSe.get(near) ?? -1e9;
      if (this.t - last > 6000) {
        snd.se('se_fushigi');
        this.lastSe.set(near, this.t);
      }
    }
    this.fushigiNear = near;
    // stage 2: the seconds dots sometimes step back
    if (flag('flag_stage') === 2 && Math.random() < dt / 5000) this.back = 400;
    if (this.back > 0) this.back -= dt;
  }

  draw(g: Gfx, f: FieldScene): void {
    const st = flag('flag_stage');
    const y = Math.round(this.y);
    if (y > -20 && f.map.def.kind !== 'indoor' || y > -20) {
      const x = 324;
      if (st >= 3) g.rect(x - 3, y - 3, 58, 24, P.horizon, 0.18);
      g.img(plateImg(), x, y);
      const time = this.override ?? TIMES[Math.max(0, Math.min(4, flag('flag_clock')))];
      const colonOn = st >= 1 && st < 3 ? true : Math.floor(f.t / 500) % 2 === 0;
      const [hh, mm] = time.split(':');
      const tx = x + 10;
      drawDigits(g, hh, tx, y + 5, P.ink);
      if (colonOn) {
        g.px(tx + 13, y + 7, P.ink);
        g.px(tx + 13, y + 10, P.ink);
      }
      drawDigits(g, mm, tx + 17, y + 5, P.ink);
      // seconds dots under the plate
      const secs = st >= 1 && st < 3 ? 12 - (this.back > 0 ? 1 : 0) : Math.floor((f.t / 1000) % 13);
      for (let i = 0; i < 12; i++) g.px(x + 8 + i * 3, y + 19, i < secs ? P.ink : P.concrete);
    }
    if (flag('flag_got_hanko') && !flag('flag_hud_hidden')) {
      const icons = hankoIcon();
      const near = !!this.fushigiNear;
      const shake = near ? (Math.floor(this.t / (1000 / 12)) % 2 ? 1 : -1) : 0;
      const img = near && Math.floor(this.t / 160) % 2 ? icons[1] : icons[0];
      // UI, not a street prop: on a notebook scrap, α60% until a fushigi is near
      const a = near ? 1 : 0.6;
      g.img(noteScrap(), 4, 187, { alpha: a * 0.9 });
      g.img(img, 8 + shake, 190, { alpha: a });
      if (near) {
        const dropT = (this.t % 900) / 900;
        g.px(18, 212 + Math.floor(dropT * 3), P.verm);
      }
    }
  }
}

const defaultHud = new DefaultHud();
let impl: FieldHud = defaultHud;

export const hud: FieldHud & { show(ms?: number): void; setTime(s: string | null): void } = {
  update: (dt, f) => impl.update(dt, f),
  draw: (g, f) => impl.draw(g, f),
  show: (ms = 4000) => defaultHud.show(ms),
  setTime: (s) => {
    defaultHud.override = s;
    if (s) defaultHud.show();
  },
};

/** UI team hook: replace the field HUD. */
export function setFieldHud(h: FieldHud): void {
  impl = h;
}
