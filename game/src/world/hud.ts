// Field HUD (30_level_art 10.6): the enamel clock plate (top right) and the
// hanko icon (bottom left) that shakes near an unstamped 「ふしぎ」.
// The UI team can replace it with setFieldHud().

import type { Gfx } from '../engine/gfx';
import { drawText, measure } from '../engine/font';
import { PixelCanvas } from '../engine/pixel';
import { ease } from '../engine/tween';
import { flag } from '../game/state';
import * as audio from '../audio';
import { P } from '../art/tiles/palette';
import type { FieldScene } from './field';
import { fushigiActive } from './fushigi';
import { isCh2Map } from './maps';
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

// ---------------------------------------------------------------- chapter 2: the clock (02_ch2 6.2, 52 13.1)

/** 星見台's clock by flag_ch2_clock: 0 = 4:59 (stopped), 1 = 5:00 (the ending). */
export const CLOCK_TIMES_H = ['4:59', '5:00'];

export interface ClockModel {
  /** Text on the plate ('4:59', '19:30'...). */
  text: string;
  /** The colon blinks every 0.5 s (夕鳴町, and 星見台 once it is 5:00). */
  blink: boolean;
  /** Colon opacity when it doesn't blink (h2: dips to 0.5 for 80 ms every 7–11 s). */
  colonAlpha: number;
  /** The plate stays up (星見台, stopped at 4:59). */
  always: boolean;
  /** The seconds row is stopped (full). */
  stopped: boolean;
}

let clockOverride: string | null = null;
let dipAt = -1e9;
let dipNext = 9000;

/**
 * h2 (52 13.1): every 7–11 s the stopped clock's colon dips to 50% for
 * 80 ms, as if it nearly blinked. One clock for everything that shows it:
 * the HUD plate and the school's wall clock (whose hand trembles with it).
 * `t` is the field's clock (ms, only ever growing).
 */
export function colonDip(t: number): boolean {
  if (flag('flag_ch2_stage') !== 2 || flag('flag_ch2_clock')) return false;
  if (t < dipAt) dipAt = -1e9;
  if (t >= dipNext || dipNext - t > 12000) {
    if (t >= dipNext) dipAt = t;
    dipNext = t + 7000 + Math.random() * 4000;
  }
  return t - dipAt < 80;
}

/** Clock text override (19:30 / 19:31 / 6:10 / 6:12, 50 1.4): kept here and passed on to the HUD. */
export function setClockOverride(s: string | null): void {
  clockOverride = s;
}
export function clockOverrideText(): string | null {
  return clockOverride;
}

/**
 * The clock as chapter 2 wants it, or null where chapter 1's clock applies.
 * On 星見台 maps: 4:59 (flag_ch2_clock 0) / 5:00 (1), the colon doesn't
 * blink while the village is stopped (h2: it sometimes almost does), the
 * plate stays up. Anywhere while an override time is set in chapter 2
 * (the crossing at 19:30, the bus stop at 19:31): that time.
 */
export function ch2Clock(f: FieldScene | null, t: number): ClockModel | null {
  const onH = !!f && isCh2Map(f.map.def);
  if (!onH && !(clockOverride && flag('flag_ch2_started'))) return null;
  const st = flag('flag_ch2_stage');
  const stopped = onH && st <= 2 && !flag('flag_ch2_clock');
  const text = clockOverride ?? CLOCK_TIMES_H[Math.max(0, Math.min(1, flag('flag_ch2_clock')))];
  const colonAlpha = stopped && st === 2 && colonDip(t) ? 0.5 : 1;
  return { text, blink: !stopped, colonAlpha, always: stopped, stopped };
}

// ---------------------------------------------------------------- chapter 2: place names (50 4.1)

export const HOSHI_MAP_NAMES: Record<string, string> = {
  map_hoshi_train: '夜の電車',
  map_hoshimidai: '星見台',
  map_hoshi_house: 'ペロリさんの 3号ハウス',
  map_hoshi_barn: '石黒牛舎',
  map_hoshi_school: '旧 星見台分校',
  map_hoshi_hill: '星見の丘',
};
export const HOSHI_AREA_NAMES: Record<string, string> = {
  area_hoshi_station: '駅と駅前',
  area_hoshi_kendo: '県道',
  area_hoshi_shuraku: '集落',
  area_hoshi_west: '西の斜面',
  area_hoshi_stream: '沢',
  area_hoshi_tanada: '棚田',
  area_hoshi_canal: '用水路',
  area_hoshi_east: '東の台地',
  area_hoshi_fence: '電気柵',
  area_hoshi_houki: '耕作放棄地',
  area_hoshi_yamaguchi: '山道の入口',
};

/** Place name of a 星見台 map (the banner on a scene change), or null for other maps. */
export function hoshiPlaceName(mapId: string, fallback = ''): string | null {
  return HOSHI_MAP_NAMES[mapId] ?? (mapId.startsWith('map_hoshi') ? fallback || null : null);
}

/** Name of the area (area_hoshi_*) at a tile of map_hoshimidai: the narrowest zone holding it. */
export function hoshiAreaName(f: FieldScene, tx: number, ty: number): string | null {
  let best: { id: string; name?: string } | null = null;
  let bestA = Infinity;
  for (const z of f.map.def.zones ?? []) {
    if (tx < z.x || ty < z.y || tx >= z.x + z.w || ty >= z.y + z.h) continue;
    if (z.w * z.h < bestA) {
      best = z;
      bestA = z.w * z.h;
    }
  }
  if (!best) return null;
  return best.name ?? HOSHI_AREA_NAMES[best.id] ?? null;
}

// ---------------------------------------------------------------- chapter 2: the call bubble (fx_h_call_bubble, 52 13.1)

interface CallBubble {
  text: string;
  chars: string[];
  shown: number;
  t: number;
  typeT: number;
  /** Time the last character appeared (the 2.4 s hold starts at the pop). */
  doneAt: number;
  at: 'top' | 'speaker';
  show: boolean;
  handle: { done: boolean; gone: boolean };
}

let bubbleNow: CallBubble | null = null;
const CHAR_MS = 85;
const POP_MS = 120;
const HOLD_MS = 2400;
const FADE_MS = 300;

/**
 * Show a call of the loudspeaker in the bubble at the top of the screen
 * (or over the speaker's horns on the hill, `at: 'speaker'`), typed in the
 * voice of the loudspeaker. `show: false` = the voice only (indoors).
 * The handle says when the line is out (`done`) and the bubble has gone.
 */
export function callBubble(text: string, o: { at?: 'top' | 'speaker'; show?: boolean } = {}): { done: boolean; gone: boolean } {
  if (bubbleNow) bubbleNow.handle.done = bubbleNow.handle.gone = true;
  const handle = { done: false, gone: false };
  bubbleNow = { text, chars: [...text], shown: 0, t: 0, typeT: 0, doneAt: -1, at: o.at ?? 'top', show: o.show ?? true, handle };
  return handle;
}

export function clearCallBubble(): void {
  if (bubbleNow) bubbleNow.handle.done = bubbleNow.handle.gone = true;
  bubbleNow = null;
}

/** Advance the bubble (typing and its blips); called by the field every frame. */
export function updateCallBubble(dt: number): void {
  const b = bubbleNow;
  if (!b) return;
  b.t += dt;
  if (b.t >= POP_MS && b.shown < b.chars.length) {
    b.typeT += dt;
    while (b.typeT >= 0 && b.shown < b.chars.length) {
      const ch = b.chars[b.shown++];
      // the ellipsis is drawn out; a comma is a breath
      const wait = ch === '…' ? CHAR_MS * 1.6 : ch === '、' ? CHAR_MS * 3 : CHAR_MS;
      b.typeT -= wait;
      if (ch !== '…' && ch !== '、' && ch !== '。' && ch !== ' ') audio.textBlip('broadcast', ch);
    }
    if (b.shown >= b.chars.length) {
      b.doneAt = b.t;
      b.handle.done = true;
    }
  }
  const end = Math.max(POP_MS + HOLD_MS, b.doneAt + 700);
  if (b.doneAt >= 0 && b.t >= end + FADE_MS) {
    b.handle.gone = true;
    bubbleNow = null;
  }
}

let speakerIcon: HTMLCanvasElement | null = null;
/** A small loudspeaker horn (7×7, #C8CDD4). */
function hornIcon(): HTMLCanvasElement {
  if (speakerIcon) return speakerIcon;
  const p = new PixelCanvas(7, 7);
  const rows = ['....##.', '..##.#.', '##...#.', '##...#.', '##...#.', '..##.#.', '....##.'];
  const fill = ['.......', '....#..', '..###..', '..###..', '..###..', '....#..', '.......'];
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 7; x++) {
      if (rows[y][x] === '#') p.set(x, y, x < 2 ? '#9AA0A8' : '#C8CDD4');
      else if (fill[y][x] === '#') p.set(x, y, '#E4E7EB');
    }
  p.set(6, 2, '#C8CDD4');
  p.set(6, 4, '#C8CDD4');
  speakerIcon = p.toCanvas();
  return speakerIcon;
}

const BUBBLE_BG = '#FBF3DC';
const BUBBLE_EDGE = '#2A2440';

/** Draw the call bubble (after the world, before the HUD). */
export function drawCallBubble(g: Gfx, f: FieldScene): void {
  const b = bubbleNow;
  if (!b || !b.show) return;
  const tw = measure(b.text);
  const w = tw + 10 + 10;
  const h = 18;
  let tipX = 192;
  let tipY = 14 - 4;
  let tailUp = true;
  if (b.at === 'speaker') {
    // over the horns of the loudspeaker pole (15–16, 2): tail down to it
    const [sx, sy] = f.worldToScreen(16 * 16, 2 * 16 - 26);
    tipX = sx;
    tipY = sy;
    tailUp = false;
  }
  const k = Math.min(1, b.t / POP_MS);
  const end = Math.max(POP_MS + HOLD_MS, b.doneAt >= 0 ? b.doneAt + 700 : Infinity);
  const alpha = b.t > end ? Math.max(0, 1 - (b.t - end) / FADE_MS) : 1;
  const s = 1.2 - 0.2 * ease.cubicOut(k);
  const x = Math.round(tipX - w / 2);
  const y = tailUp ? tipY + 4 : tipY - 4 - h;
  const ctx = g.ctx;
  ctx.save();
  ctx.globalAlpha = alpha * Math.min(1, k * 2);
  // pop: scale round the tail tip
  ctx.translate(tipX, tipY);
  ctx.scale(s, s);
  ctx.translate(-tipX, -tipY);
  const r = (xx: number, yy: number, ww: number, hh: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(xx, yy, ww, hh);
  };
  // soft offset shadow, frame with cut corners, paper
  r(x + 2, y + 2, w - 1, h - 1, 'rgba(11,11,20,0.35)');
  r(x + 1, y, w - 2, h, BUBBLE_EDGE);
  r(x, y + 1, w, h - 2, BUBBLE_EDGE);
  r(x + 1, y + 1, w - 2, h - 2, BUBBLE_BG);
  r(x + 1, y + 1, w - 2, 1, '#FFFBEE');
  // tail: towards the mountain (up), or down to the horns
  const tx = Math.round(tipX) - 2;
  if (tailUp) {
    r(tx, y, 5, 1, BUBBLE_BG);
    r(tx - 1, y, 1, 1, BUBBLE_EDGE);
    r(tx + 5, y, 1, 1, BUBBLE_EDGE);
    r(tx + 1, y - 1, 3, 1, BUBBLE_BG);
    r(tx, y - 1, 1, 1, BUBBLE_EDGE);
    r(tx + 4, y - 1, 1, 1, BUBBLE_EDGE);
    r(tx + 2, y - 2, 1, 1, BUBBLE_BG);
    r(tx + 1, y - 2, 1, 1, BUBBLE_EDGE);
    r(tx + 3, y - 2, 1, 1, BUBBLE_EDGE);
    r(tx + 2, y - 3, 1, 1, BUBBLE_EDGE);
  } else {
    const by = y + h - 1;
    r(tx, by, 5, 1, BUBBLE_BG);
    r(tx - 1, by, 1, 1, BUBBLE_EDGE);
    r(tx + 5, by, 1, 1, BUBBLE_EDGE);
    r(tx + 1, by + 1, 3, 1, BUBBLE_BG);
    r(tx, by + 1, 1, 1, BUBBLE_EDGE);
    r(tx + 4, by + 1, 1, 1, BUBBLE_EDGE);
    r(tx + 2, by + 2, 1, 1, BUBBLE_BG);
    r(tx + 1, by + 2, 1, 1, BUBBLE_EDGE);
    r(tx + 3, by + 2, 1, 1, BUBBLE_EDGE);
    r(tx + 2, by + 3, 1, 1, BUBBLE_EDGE);
  }
  ctx.drawImage(hornIcon(), x + 4, y + 6);
  drawText(ctx, b.chars.slice(0, b.shown).join(''), x + 14, y + 1, { color: '#2A2440' });
  ctx.restore();
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
    const h = ch2Clock(f, f.t);
    const always = h ? h.always : flag('flag_stage') >= 1 && flag('flag_stage') < 3;
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
    // the loudspeaker's call (a replacing HUD draws it itself, see drawCallBubble)
    drawCallBubble(g, f);
    const st = flag('flag_stage');
    const y = Math.round(this.y);
    if (y > -20 && f.map.def.kind !== 'indoor' || y > -20) {
      const x = 324;
      if (st >= 3) g.rect(x - 3, y - 3, 58, 24, P.horizon, 0.18);
      g.img(plateImg(), x, y);
      const h = ch2Clock(f, f.t);
      const time = h ? h.text : this.override ?? TIMES[Math.max(0, Math.min(4, flag('flag_clock')))];
      const colonOn = h ? !h.blink || Math.floor(f.t / 500) % 2 === 0 : st >= 1 && st < 3 ? true : Math.floor(f.t / 500) % 2 === 0;
      const [hh, mm] = time.split(':');
      const tx = x + 10 + (hh.length < 2 ? 3 : 0);
      drawDigits(g, hh, tx, y + 5, P.ink);
      if (colonOn) {
        const ca = h ? h.colonAlpha : 1;
        g.alpha(ca, () => {
          g.px(tx + (hh.length < 2 ? 7 : 13), y + 7, P.ink);
          g.px(tx + (hh.length < 2 ? 7 : 13), y + 10, P.ink);
        });
      }
      drawDigits(g, mm, tx + (hh.length < 2 ? 11 : 17), y + 5, P.ink);
      // seconds dots under the plate
      const stoppedRow = h ? h.stopped : st >= 1 && st < 3;
      const secs = stoppedRow ? 12 - (this.back > 0 ? 1 : 0) : Math.floor((f.t / 1000) % 13);
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
