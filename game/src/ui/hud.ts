// Field HUD (30_level_art 10.6, 10_narrative 12.5): the enamel clock plate
// (top right), the hanko icon that tells of a nearby 「ふしぎ」 (bottom
// left), the place name when a map / area is entered, and the sticky note
// for an item that was just picked up. Installed into the field through
// world/hud's setFieldHud(); the field's menu key (C/Tab and X) is also
// watched here, since the HUD is updated by the field every frame.

import type { Gfx } from '../engine/gfx';
import { game } from '../engine/game';
import { PixelCanvas } from '../engine/pixel';
import { H, W } from '../engine/screen';
import type { Co } from '../engine/co';
import { ease } from '../engine/tween';
import { flag, state } from '../game/state';
import { isKeyItem, getItem } from '../data/battle';
import { sfx } from '../audio';
import * as worldHudMod from '../world/hud';
import { hud as worldHud, setFieldHud, type FieldHud } from '../world/hud';
import type { FieldScene } from '../world/field';
import { fushigiActive } from '../world/fushigi';
import { getMapDef, isCh2Map } from '../world/maps';
import { drawChoreCard, hideChoreCard, updateChoreCard } from './chore_card';
import { clearCallBubbleUi, drawCallBubbleUi, showCallBubble as showCallBubbleImpl, updateCallBubbleUi, callBubbleShowing, type CallBubbleHandle } from './call_bubble';
import { drawDigits, drawNumerals, numeralsWidth } from './digits';
import { dialogTop } from './dialog';
import { hudHanko, itemIcon24 } from './icons';
import { syncSettingFlags } from './settings';
import { autosaveTick, setAutosaveClock } from './autosave';
import { blend, drawTape, rectA, textW, UI } from './window';
import { hash2 } from '../engine/rng';

// ---- clock -------------------------------------------------------------------------

export const CLOCK_TIMES = ['16:52', '16:55', '16:58', '17:00', '17:01'];
/** 星見台 (flag_ch2_clock): 0 = 4:59, stopped a minute before the morning chime; 1 = 5:00. */
export const CLOCK_TIMES_H = ['4:59', '5:00'];

let plateC: HTMLCanvasElement | null = null;
/** 白いほうろうの札 52×18: enamel, 1px ink frame, a screw on each side. */
function plateImg(): HTMLCanvasElement {
  if (plateC) return plateC;
  const p = new PixelCanvas(52, 18);
  const ink = UI.border;
  p.rect(1, 0, 50, 18, ink);
  p.rect(0, 1, 52, 16, ink);
  p.rect(1, 1, 50, 16, '#F4F1E8');
  // enamel: a bright top edge, a soft bottom and right edge (thickness)
  p.hline(2, 48, 1, '#FFFFFF');
  p.hline(1, 50, 16, '#C8C2B4');
  p.vline(50, 2, 16, '#C8C2B4');
  p.hline(2, 49, 15, '#E4DED0');
  // screws (#9AA0A8) with a glint
  for (const sx of [4, 47]) {
    p.set(sx, 8, '#9AA0A8');
    p.set(sx, 9, '#6B7186');
    p.set(sx - 1, 8, '#C8C2B4');
    p.set(sx, 7, '#E4DED0');
  }
  // a small chip in the enamel (lower left) showing the dark metal
  p.set(7, 14, '#9AA0A8');
  p.set(8, 14, '#6B7186');
  p.set(8, 13, '#C8C2B4');
  plateC = p.toCanvas();
  return plateC;
}

/** The HUD's hanko plate: 26×28, 4px from the bottom-left corner. */
const HANKO_PLATE = { x: 4, y: 216 - 4 - 28, w: 26, h: 28 };

let hankoPlateC: HTMLCanvasElement | null = null;
/** Enamel plate for the hanko icon, the same make as the clock plate. */
function hankoPlateImg(): HTMLCanvasElement {
  if (hankoPlateC) return hankoPlateC;
  const { w, h } = HANKO_PLATE;
  const p = new PixelCanvas(w, h);
  const ink = UI.border;
  p.rect(1, 0, w - 2, h, ink);
  p.rect(0, 1, w, h - 2, ink);
  p.rect(1, 1, w - 2, h - 2, '#F4F1E8');
  // enamel: bright top edge, thickness at the bottom and right
  p.hline(2, w - 4, 1, '#FFFFFF');
  p.hline(1, w - 2, h - 2, '#C8C2B4');
  p.vline(w - 2, 2, h - 2, '#C8C2B4');
  p.hline(2, w - 3, h - 3, '#E4DED0');
  // a worn, slightly darker ring where the hanko stands
  for (let x = 6; x <= w - 7; x++) p.set(x, h - 5, (x & 1) === 0 ? '#E0D8C6' : '#E8E1D0');
  // a screw at each top corner
  for (const sx of [3, w - 4]) {
    p.set(sx, 3, '#9AA0A8');
    p.set(sx, 4, '#6B7186');
    p.set(sx - 1, 3, '#C8C2B4');
  }
  hankoPlateC = p.toCanvas();
  return hankoPlateC;
}

let glowC: HTMLCanvasElement | null = null;
/** Night: #FFE7A3 light bleeding out from behind the plate. */
function glowImg(): HTMLCanvasElement {
  if (glowC) return glowC;
  const p = new PixelCanvas(64, 30);
  for (let y = 0; y < 30; y++)
    for (let x = 0; x < 64; x++) {
      const dx = Math.max(0, Math.abs(x - 31.5) - 24);
      const dy = Math.max(0, Math.abs(y - 14.5) - 7);
      const d = Math.hypot(dx, dy);
      const v = 1 - d / 6;
      if (v > 0 && hash2(x, y, 3) < v * 0.85) p.set(x, y, v > 0.6 ? '#FFE7A3' : '#F6D98A');
    }
  glowC = p.toCanvas();
  return glowC;
}

export interface ClockView {
  time: string;
  prev: string;
  flipT: number;
  stage: number;
  t: number;
  /** Seconds-hand position 0..11. */
  sec: number;
  sink: number;
  /**
   * Chapter 2 (星見台, 52 13.1): the colon doesn't blink — it stays at this
   * opacity (1, or 0.5 for the 80 ms it almost blinks in h2). Undefined:
   * chapter 1's rules (blinks except in stages 1–2).
   */
  colon?: number;
  /** A change of time turns over like a flap (3 frames) instead of rolling digit by digit. */
  flap?: boolean;
  /** The night glow behind the plate (chapter 1's night). Default: stage ≥ 3. */
  glow?: boolean;
}

/** Advance of a character on the plate (5×7 digits 6px, the colon 4px). */
function plateAdv(ch: string): number {
  return ch === ':' ? 4 : 6;
}

/** Where the time starts so it sits in the middle of the plate ('16:52' at +12, '4:59' at +15). */
function plateTextX(x: number, s: string): number {
  let w = -1;
  for (const ch of s) w += plateAdv(ch);
  return x + Math.floor((52 - w) / 2);
}

/** The time written on the plate: digits and the colon (`colonA` its opacity, 0 = off). */
function drawPlateTime(g: Gfx, s: string, x: number, y: number, colonA: number): void {
  let cx = plateTextX(x, s);
  for (const ch of s) {
    if (ch === ':') {
      if (colonA >= 1) drawDigits(g, ':', cx, y, { color: UI.border });
      else if (colonA > 0) g.alpha(colonA, () => drawDigits(g, ':', cx, y, { color: UI.border }));
    } else drawDigits(g, ch, cx, y, { color: UI.border });
    cx += plateAdv(ch);
  }
}

/** Draw the clock plate at (x,y). Used by the field HUD, the menu and the title. */
export function drawClockPlate(g: Gfx, x: number, y: number, v: ClockView, alpha = 1): void {
  g.alpha(alpha, () => {
    if (v.glow ?? v.stage >= 3) g.img(glowImg(), x - 6, y - 6, { alpha: 0.55 + 0.1 * Math.sin(v.t / 700) });
    const yy = y + v.sink;
    g.img(plateImg(), x, yy);
    const colonA = v.colon ?? (v.stage === 1 || v.stage === 2 ? 1 : Math.floor(v.t / 500) % 2 === 0 ? 1 : 0);
    const ty = yy + 4;
    const cur = v.time;
    const prev = v.prev || cur;
    g.clip(x + 2, yy + 2, 48, 11, () => {
      if ((v.flap || prev.length !== cur.length) && prev !== cur && v.flipT < 51) {
        // the card turns over in 3 frames: the old time folds up, the edge
        // of the flap, the new time comes down (52 13.1)
        const f = Math.floor(v.flipT / 17);
        if (f === 0) g.clip(x + 2, yy + 2, 48, 5, () => drawPlateTime(g, prev, x, ty, colonA));
        else if (f === 2) g.clip(x + 2, yy + 8, 48, 5, () => drawPlateTime(g, cur, x, ty, colonA));
        g.rect(x + 4, yy + 7, 44, 1, '#9AA0A8');
        g.rect(x + 4, yy + (f === 1 ? 6 : f === 0 ? 8 : 6), 44, 1, '#C8C2B4');
        return;
      }
      const k = Math.min(1, v.flipT / 180);
      // digits roll over one by one when the time changes (flip clock)
      let cx = plateTextX(x, cur);
      for (let i = 0; i < cur.length; i++) {
        const ch = cur[i];
        if (ch === ':') {
          if (colonA >= 1) drawDigits(g, ':', cx, ty, { color: UI.border });
          else if (colonA > 0) g.alpha(colonA, () => drawDigits(g, ':', cx, ty, { color: UI.border }));
        } else if (k < 1 && prev[i] !== ch) {
          const e = ease.cubicOut(k);
          drawDigits(g, prev[i] ?? ' ', cx, ty - Math.round(e * 9), { color: UI.border });
          drawDigits(g, ch, cx, ty + 9 - Math.round(e * 9), { color: UI.border });
        } else drawDigits(g, ch, cx, ty, { color: UI.border });
        cx += plateAdv(ch);
      }
    });
    // the seconds: a row of 12 dots filling up (5 s each); the newest is 朱
    for (let i = 0; i < 12; i++) {
      const dx = x + 9 + i * 3;
      const lit = i < v.sec;
      const head = i === v.sec - 1;
      g.px(dx, yy + 13, head ? UI.accent : lit ? UI.border : '#D8D2C4');
    }
  });
}

// ---- place names ---------------------------------------------------------------------

const MAP_PLACE: Record<string, string> = {
  map_home_2f: '潮見家',
  map_home_1f: '潮見家',
  map_maruyama: '肉のマルヤマ',
  map_hinoya: '駄菓子 ひのや',
  map_laundry: 'コインランドリー ふわり',
  map_koban: '夕鳴銀座 交番',
  map_mall_hall: 'ユウナリ 正面ホール',
  map_mall_food: 'ユウナリ フードコート',
  map_mall_health: 'ユウナリ 健康器具コーナー',
  map_mall_2f: 'ユウナリ 2F通路',
  map_mall_maigo: 'ユウナリ 迷子センター',
};

/** Town areas (01_index 2.1); the narrowest area containing the tile wins. */
const AREAS: [string, number, number, number, number][] = [
  ['路地', 18, 15, 20, 20],
  ['踏切', 56, 19, 63, 27],
  ['川べり通り', 0, 32, 57, 35],
  ['用水路の 対岸', 0, 36, 57, 43],
  ['ひぐらし坂', 0, 16, 22, 34],
  ['夕鳴銀座', 23, 16, 57, 34],
  ['夕鳴公園', 0, 0, 31, 15],
  ['モール駐車場', 32, 0, 57, 15],
];

export function areaAt(tx: number, ty: number): string | null {
  let best: string | null = null;
  let bestA = Infinity;
  for (const [name, x0, y0, x1, y1] of AREAS) {
    if (tx < x0 || tx > x1 || ty < y0 || ty > y1) continue;
    const a = (x1 - x0 + 1) * (y1 - y0 + 1);
    if (a < bestA) {
      best = name;
      bestA = a;
    }
  }
  return best;
}

/** 星見台's maps (50_ch2_story 4.1): the name on a scene change. */
const HOSHI_PLACE: Record<string, string> = {
  map_hoshi_train: '夜の電車',
  map_hoshimidai: '星見台',
  map_hoshi_house: 'ペロリさんの 3号ハウス',
  map_hoshi_barn: '石黒牛舎',
  map_hoshi_school: '旧 星見台分校',
  map_hoshi_hill: '星見の丘',
};

/**
 * map_hoshimidai's areas (52 1.2, inclusive tile ranges). `pass`: a strip
 * you cross on the way somewhere (the 県道, the 用水路, the 沢, the fence) —
 * it doesn't raise a banner of its own, the last place stays.
 */
const HOSHI_AREAS: { id: string; name: string; rects: [number, number, number, number][]; pass?: boolean }[] = [
  { id: 'area_hoshi_station', name: '星見台駅', rects: [[14, 40, 45, 47]] },
  { id: 'area_hoshi_kendo', name: '県道', rects: [[0, 38, 46, 39]], pass: true },
  { id: 'area_hoshi_shuraku', name: '集落', rects: [[14, 22, 45, 37]] },
  { id: 'area_hoshi_west', name: '西の斜面', rects: [[0, 19, 12, 45]] },
  { id: 'area_hoshi_stream', name: '沢', rects: [[13, 0, 13, 39]], pass: true },
  { id: 'area_hoshi_tanada', name: '棚田', rects: [[14, 1, 35, 19]] },
  { id: 'area_hoshi_canal', name: '用水路', rects: [[13, 20, 59, 21]], pass: true },
  { id: 'area_hoshi_east', name: '東の台地', rects: [[46, 22, 59, 45]] },
  {
    id: 'area_hoshi_fence',
    name: '電気柵',
    rects: [
      [36, 18, 59, 19],
      [36, 1, 36, 18],
    ],
    pass: true,
  },
  { id: 'area_hoshi_houki', name: '耕作放棄地', rects: [[37, 3, 59, 17]] },
  { id: 'area_hoshi_yamaguchi', name: '山道の入口', rects: [[37, 0, 59, 2]] },
];

interface HoshiArea {
  id: string;
  name: string;
  pass: boolean;
}

/**
 * The area of map_hoshimidai at a tile: the map's own zones when it has
 * them (their `name` wins), else the table above. The narrowest wins.
 */
export function hoshiAreaAt(tx: number, ty: number): HoshiArea | null {
  const zones = getMapDef('map_hoshimidai')?.zones;
  let best: HoshiArea | null = null;
  let bestA = Infinity;
  const consider = (id: string, x0: number, y0: number, x1: number, y1: number, name?: string) => {
    if (tx < x0 || tx > x1 || ty < y0 || ty > y1) return;
    const a = (x1 - x0 + 1) * (y1 - y0 + 1);
    if (a >= bestA) return;
    const row = HOSHI_AREAS.find((r) => r.id === id);
    best = { id, name: name ?? row?.name ?? '星見台', pass: !!row?.pass };
    bestA = a;
  };
  if (zones?.length) for (const z of zones) consider(z.id, z.x, z.y, z.x + z.w - 1, z.y + z.h - 1, z.name);
  else for (const r of HOSHI_AREAS) for (const [x0, y0, x1, y1] of r.rects) consider(r.id, x0, y0, x1, y1);
  return best;
}

export function placeNameFor(mapId: string, tx: number, ty: number, fallback = ''): string {
  if (mapId === 'map_town') return areaAt(tx, ty) ?? '夕鳴町';
  if (mapId === 'map_hoshimidai') return hoshiAreaAt(tx, ty)?.name ?? '星見台';
  return MAP_PLACE[mapId] ?? HOSHI_PLACE[mapId] ?? fallback;
}

interface Banner {
  text: string;
  t: number;
  dur: number;
  /** Where the tape is stuck: chosen once, clear of the party (placeBanner). */
  x: number;
  y: number;
}

type Rect = [number, number, number, number];

function overlaps(a: Rect, b: Rect): boolean {
  return a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
}

/** How long a place name waits for the bottom-left corner (a guide note there) before it is let go. */
const BANNER_WAIT_MAX = 5000;
/** The washi tape the place name is written on (paler than the orange name tags). */
const PLACE_TAPE = '#EFE4C8';

interface ItemCard {
  id: string;
  t: number;
  n: number;
}

// ---- the HUD ---------------------------------------------------------------------------

/** Item notes on screen at once (the rest queue up). */
const CARDS_MAX = 3;
/**
 * A picked-up item's note lands this long after the pick-up (the sound
 * first, then the note slaps down) — and an event that announces the item
 * itself has that long to wave the note off (skipItemCard / clearNotes)
 * before any of it is drawn.
 */
const CARD_SETTLE_MS = 90;
/** How long a skipItemCard() waits for its item to arrive. */
const SKIP_MS = 3000;

let menuOpener: (() => void) | null = null;
let menuEnabled = true;

/** Installed by the menu module. */
export function setMenuOpener(fn: () => void): void {
  menuOpener = fn;
}

/** Scripts can keep the field menu shut (cutscenes that hand control back briefly). */
export function setMenuEnabled(on: boolean): void {
  menuEnabled = on;
}

class UiHud implements FieldHud {
  private y = -26;
  private showT = 0;
  private t = 0;
  private lastClock = -1;
  private lastMap = '';
  override: string | null = null;
  private shown = '';
  private prevShown = '';
  private flipT = 999;
  private sinkT = 999;
  // seconds hand
  private sec = 0;
  private secAcc = 0;
  private backT = 0;
  private nextBack = 4000;
  // night clock
  private nightMs = 0;
  // fushigi hint
  private near: string | null = null;
  private lastSe = new Map<string, number>();
  // place names / item notes
  private banner: Banner | null = null;
  private lastPlace = '';
  private placeSeen = new Map<string, number>();
  private pendingPlace: string | null = null;
  private placeDelay = 0;
  private placeWait = 0;
  private cards: ItemCard[] = [];
  private cardQueue: ItemCard[] = [];
  private inv = new Map<string, number>();
  /** Pick-ups that make no note: id → how many, until when (game.time). */
  private skips = new Map<string, { n: number; until: number }>();
  private lastFrame = -10;
  private field: FieldScene | null = null;
  // chapter 2: on a 星見台 map, the colon that almost blinks (h2)
  private onHoshi = false;
  private colonDipAt = -1e9;
  private colonNext = 9000;

  show(ms = 4000): void {
    this.showT = Math.max(this.showT, ms);
  }

  /** `cut`: the plate shows the new time at once (a cut to another scene) instead of turning over. */
  setTime(s: string | null, cut = false): void {
    this.override = s;
    this.cutNext = cut;
    if (s) this.show();
  }

  private cutNext = false;

  /** Current clock text. */
  timeText(): string {
    if (this.override) return this.override;
    // 星見台 (50 1.2): stopped at 4:59; 5:00 when the morning comes
    if (this.onHoshi) return CLOCK_TIMES_H[Math.max(0, Math.min(1, flag('flag_ch2_clock')))];
    // back in 夕鳴町 during chapter 2 (the crossing, the bus stop): 19:30, a minute on after the night
    if (flag('flag_ch2_started') && !flag('flag_ch2_clear') && flag('flag_ch2_stage') < 3) return '19:30';
    if (flag('flag_ch2_started') && (flag('flag_ch2_clear') || flag('flag_ch2_stage') >= 3)) return '19:31';
    const c = Math.max(0, Math.min(4, flag('flag_clock')));
    if (c >= 4 || flag('flag_stage') >= 3) {
      // night: time moves on from 17:01
      const m = 1 + Math.floor(this.nightMs / 20000);
      return `17:${String(Math.min(59, m)).padStart(2, '0')}`;
    }
    return CLOCK_TIMES[c];
  }

  /** 星見台 is stopped (4:59, before the morning): the colon and the seconds don't move. */
  private hoshiStopped(): boolean {
    return this.onHoshi && !flag('flag_ch2_clock') && flag('flag_ch2_stage') <= 2 && !this.override;
  }

  clockView(): ClockView {
    const ch2 = this.onHoshi || !!flag('flag_ch2_started');
    const stopped = this.hoshiStopped();
    return {
      time: this.shown || this.timeText(),
      prev: this.prevShown,
      flipT: this.flipT,
      stage: ch2 ? (stopped ? 1 : 0) : flag('flag_stage'),
      t: this.t,
      sec: stopped ? 11 : this.backT > 0 ? Math.max(0, this.sec - 1) : this.sec,
      sink: this.sinkT < 120 ? 1 : 0,
      colon: stopped ? (this.t - this.colonDipAt < 80 ? 0.5 : 1) : undefined,
      flap: ch2,
      glow: ch2 ? false : undefined,
    };
  }

  update(dt: number, f: FieldScene): void {
    this.t += dt;
    this.field = f;
    const frameGap = game.frame - this.lastFrame;
    this.lastFrame = game.frame;
    if (frameGap > 2) {
      // the field was covered (battle, menu, shop…): transient notes don't come back
      this.banner = null;
      this.cards = [];
      this.cardQueue = [];
    }
    syncSettingFlags();
    this.flipT += dt;
    this.sinkT += dt;
    this.onHoshi = isCh2Map(f.map.def);
    const st = flag('flag_stage');
    // h2: every 7–11 s the colon dips to half for 80 ms, as if it nearly blinked (52 13.1)
    if (this.hoshiStopped() && flag('flag_ch2_stage') === 2 && this.t >= this.colonNext) {
      this.colonDipAt = this.t;
      this.colonNext = this.t + 7000 + Math.random() * 4000;
    }
    // ---- clock
    if (st >= 3 || flag('flag_clock') >= 4) this.nightMs += dt;
    const c = flag('flag_clock') + flag('flag_ch2_clock') * 10;
    if (c !== this.lastClock || f.map.id !== this.lastMap) {
      if (this.lastClock >= 0 || this.lastMap) this.show();
      this.lastClock = c;
    }
    const tt = this.timeText();
    if (tt !== this.shown) {
      if (this.shown && !this.cutNext) {
        this.prevShown = this.shown;
        this.flipT = 0;
        this.sinkT = 0;
      } else {
        this.prevShown = tt;
        this.flipT = 999;
      }
      this.shown = tt;
      this.cutNext = false;
    }
    if (this.showT > 0) this.showT -= dt;
    // 星見台: the plate stays up while the village is stopped (the time that doesn't move is the point)
    const always = this.onHoshi ? this.hoshiStopped() : st >= 1 && st < 3 && !flag('flag_ch2_started');
    const hidden = !!flag('flag_hud_hidden');
    const want = (this.showT > 0 || always || !!this.override) && !hidden;
    const target = want ? 6 : -26;
    this.y += Math.sign(target - this.y) * Math.min(Math.abs(target - this.y), (dt / 300) * 32);
    // seconds hand: ticks in stage 0 and at night, stuck in stages 1–2;
    // in stage 2 it sometimes steps back one second
    if (st === 0 || st >= 3) {
      this.secAcc += dt;
      while (this.secAcc >= 1000) {
        this.secAcc -= 1000;
        this.sec = (this.sec + 1) % 13;
      }
    } else this.sec = 12; // stopped on the minute: the row is full
    if (st === 2) {
      this.nextBack -= dt;
      if (this.nextBack <= 0) {
        this.backT = 1000;
        this.nextBack = 3500 + Math.random() * 5000;
      }
    }
    if (this.backT > 0) this.backT -= dt;
    // ---- fushigi proximity (2 tiles)
    let near: string | null = null;
    if (flag('flag_got_hanko')) {
      for (const s of f.fushigiSpots()) {
        if (!fushigiActive(s.id)) continue;
        if (Math.hypot(f.player.x - s.x, f.player.y - 8 - s.y) <= 40) {
          near = s.id;
          break;
        }
      }
    }
    if (near && near !== this.near) {
      const last = this.lastSe.get(near) ?? -1e9;
      if (this.t - last > 6000) {
        sfx('se_fushigi');
        this.lastSe.set(near, this.t);
      }
    }
    this.near = near;
    // ---- the loudspeaker's call bubble, the おてつだい strip
    updateCallBubbleUi(dt);
    updateChoreCard(dt);
    // ---- place names (after the fade-in, not during the opening)
    let place = placeNameFor(f.map.id, f.player.tileX, f.player.tileY, f.map.def.name ?? '');
    if (f.map.id === 'map_hoshimidai') {
      // arriving in the village (off the train, first thing in a session): its name;
      // out of a building: the area; the strips you cross keep the last name
      const area = hoshiAreaAt(f.player.tileX, f.player.tileY);
      const arriving = f.map.id !== this.lastMap && (!this.lastMap || !this.lastMap.startsWith('map_hoshi') || this.lastMap === 'map_hoshi_train');
      if (arriving) place = '星見台';
      else if (!area || area.pass) place = f.map.id !== this.lastMap ? '星見台' : this.lastPlace;
    }
    if (f.map.id !== this.lastMap) {
      this.lastMap = f.map.id;
      this.pendingPlace = place;
      this.placeDelay = 250;
      this.placeWait = 0;
      this.lastPlace = place;
    } else if (place !== this.lastPlace) {
      this.lastPlace = place;
      this.pendingPlace = place;
      this.placeDelay = 350;
      this.placeWait = 0;
    }
    // the name waits while a cutscene or a conversation has the screen (a
    // close-up, a zoom, a warp inside a script): it appears once the player
    // can move again — and while a guide note has the bottom-left corner
    const free = f.controllable && !f.warping && game.fadeAlpha < 0.05;
    const corner = game.ui.widgets.some((w) => !w.modal && !w.done);
    if (this.pendingPlace) {
      if (free && !corner) this.placeDelay -= dt;
      else if (free) {
        this.placeWait += dt;
        // the moment has passed: don't bring an old name up late
        if (this.placeWait > BANNER_WAIT_MAX) this.pendingPlace = null;
      }
      if (this.pendingPlace && this.placeDelay <= 0) {
        const p = this.pendingPlace;
        this.pendingPlace = null;
        const seen = this.placeSeen.get(p) ?? -1e9;
        if (flag('flag_opening_done') && this.t - seen > 25000 && !flag('flag_hud_hidden')) {
          this.banner = this.placeBanner(p, 2600);
          this.placeSeen.set(p, this.t);
        }
      }
    }
    if (this.banner) {
      // a cutscene starting under it: the name bows out early
      if (game.scripts.busy && !f.controllable && this.banner.t < this.banner.dur - 300) this.banner.t = this.banner.dur - 300;
      this.banner.t += dt;
      if (this.banner.t > this.banner.dur) this.banner = null;
    }
    // ---- items picked up while walking around (not in battle, menu or shop)
    this.watchInventory(frameGap <= 2 && game.top === f);
    for (const cd of this.cards) cd.t += dt;
    this.cards = this.cards.filter((cd) => cd.t < 2800);
    // at most CARDS_MAX notes at once; the rest wait their turn
    while (this.cards.length < CARDS_MAX && this.cardQueue.length) {
      const cd = this.cardQueue.shift()!;
      cd.t = -this.cards.filter((c) => c.t < 100).length * 180;
      this.cards.push(cd);
    }
    // ---- the menu key
    if (menuEnabled && menuOpener && f.controllable && game.top === f && (game.input.pressed('menu') || game.input.pressed('cancel'))) {
      this.show(4000);
      menuOpener();
    }
    autosaveTick(dt, f);
  }

  /** Bottom edge of the clock plate while it is out (0 when it is away). */
  clockBottom(): number {
    return this.y > -24 ? Math.round(this.y) + 24 : 0;
  }

  private watchInventory(live: boolean): void {
    const now = new Map<string, number>();
    for (const id of state.inventory) now.set(id, (now.get(id) ?? 0) + 1);
    for (const [id, sk] of this.skips) if (sk.until < game.time) this.skips.delete(id);
    for (const [id, n] of now) {
      let add = n - (this.inv.get(id) ?? 0);
      if (add <= 0) continue;
      // an event announcing the item itself asked for no note
      const sk = this.skips.get(id);
      if (sk) {
        const k = Math.min(sk.n, add);
        add -= k;
        sk.n -= k;
        if (sk.n <= 0) this.skips.delete(id);
      }
      if (live && add > 0) this.pushCard(id, add, CARD_SETTLE_MS);
    }
    this.inv = now;
  }

  /** The next `n` pick-ups of `id` make no note (the event's own message says it). */
  skipCard(id: string, n = 1): void {
    const sk = this.skips.get(id);
    this.skips.set(id, { n: (sk?.n ?? 0) + n, until: game.time + SKIP_MS });
    // it may already be up (given a frame before): take it back before it is drawn
    this.cards = this.cards.filter((c) => c.id !== id || c.t >= 0);
    this.cardQueue = this.cardQueue.filter((c) => c.id !== id);
  }

  pushCard(id: string, n = 1, delay = 0): void {
    if (!getItem(id)) return;
    const same = this.cards.find((c) => c.id === id && c.t < 1500) ?? this.cardQueue.find((c) => c.id === id);
    if (same) {
      same.n += n;
      same.t = Math.min(same.t, 200);
      return;
    }
    const cd = { id, t: 0, n };
    if (this.cards.length < CARDS_MAX) {
      cd.t = -delay - this.cards.filter((c) => c.t < 100).length * 180;
      this.cards.push(cd);
    } else this.cardQueue.push(cd);
  }

  /** Fresh start (new game / continue): forget everything seen so far. */
  reset(): void {
    this.y = -26;
    this.showT = 0;
    this.lastClock = -1;
    this.lastMap = '';
    this.override = null;
    this.shown = '';
    this.prevShown = '';
    this.nightMs = 0;
    this.near = null;
    this.banner = null;
    this.lastPlace = '';
    this.placeSeen.clear();
    this.pendingPlace = null;
    this.placeWait = 0;
    this.cards = [];
    this.cardQueue = [];
    this.inv.clear();
    this.skips.clear();
    this.lastFrame = -10;
    curtain.a = 0;
    clearCallBubbleUi();
    hideChoreCard(0);
  }

  /** Forget the place banner and item notes (a menu or shop covers the field). */
  clearNotes(): void {
    this.banner = null;
    this.cards = [];
    this.cardQueue = [];
  }

  showBanner(text: string, dur = 2600): void {
    this.banner = this.placeBanner(text, dur);
  }

  /**
   * Where the place name goes. Its home is the bottom-left corner beside the
   * hanko plate; if Minato or the one following him stands there (the name
   * comes up as you walk in — often through a door at the bottom of the
   * screen), it goes to the bottom-right corner, else to the top-left.
   * The party's boxes are grown a little, and further ahead of Minato in
   * the way he faces, since he keeps walking while the name is up.
   */
  private placeBanner(text: string, dur: number): Banner {
    const w = textW(text) + 18;
    const h = 18;
    const withHanko = flag('flag_got_hanko') && !flag('flag_hud_hidden');
    const by = HANKO_PLATE.y + Math.round((HANKO_PLATE.h - h) / 2);
    const spots: [number, number][] = [
      [withHanko ? HANKO_PLATE.x + HANKO_PLATE.w + 5 : 8, by],
      [W - 8 - w, by],
      [8, 8],
    ];
    const f = this.field;
    const party: Rect[] = [];
    if (f) {
      const lead = 20;
      for (const a of [f.player, f.follower]) {
        if (!a) continue;
        const [sx, sy, sc] = f.worldToScreen(a.x, a.y);
        let r: Rect = [sx - 8 * sc - 4, sy - 24 * sc - 4, 16 * sc + 8, 24 * sc + 8];
        if (a === f.player) {
          const d = lead * sc;
          if (a.dir === 'left') r = [r[0] - d, r[1], r[2] + d, r[3]];
          else if (a.dir === 'right') r = [r[0], r[1], r[2] + d, r[3]];
          else if (a.dir === 'up') r = [r[0], r[1] - d, r[2], r[3] + d];
          else r = [r[0], r[1], r[2], r[3] + d];
        }
        party.push(r);
      }
    }
    const spot = spots.find(([x, y]) => !party.some((r) => overlaps(r, [x, y - 1, w + 2, h + 3]))) ?? spots[0];
    return { text, t: 0, dur, x: spot[0], y: spot[1] };
  }

  draw(g: Gfx, f: FieldScene): void {
    // a curtain over the world with the HUD still showing (evt_ch2_ending: 「暗転のまま、時計だけ」)
    if (curtain.a > 0) g.rect(0, 0, W, H, curtain.color, Math.min(1, curtain.a));
    // the loudspeaker's call (fx_h_call_bubble): ours, or the world's own if it raised one
    if (callBubbleShowing()) drawCallBubbleUi(g, f);
    else {
      const wb = (worldHudMod as unknown as Record<string, unknown>).drawCallBubble;
      if (typeof wb === 'function') (wb as (g: Gfx, f: FieldScene) => void)(g, f);
    }
    // the おてつだい strip (evt_ch2_barn_work)
    drawChoreCard(g);
    // clock plate
    const y = Math.round(this.y);
    if (y > -24) drawClockPlate(g, 324, y, this.clockView());
    // hanko icon (bottom left)
    if (flag('flag_got_hanko') && !flag('flag_hud_hidden')) this.drawHanko(g);
    // place name (bottom left, beside the hanko)
    if (this.banner) this.drawBanner(g, this.banner);
    // the notes stay clear of a conversation: under a window at the top, and
    // above the name tag of one at the bottom (3 notes end at y128 < 138)
    let cardY = 8;
    const top = dialogTop();
    if (top !== null && top < 100) cardY = top + 64 + 8;
    let slot = 0;
    for (const cd of this.cards) {
      if (cd.t < 0) continue;
      this.drawCard(g, cd, cardY + slot * 34);
      slot++;
    }
  }

  private drawHanko(g: Gfx): void {
    const near = !!this.near;
    const shake = near ? (Math.floor(this.t / (1000 / 12)) % 2 ? 1 : -1) : 0;
    const bright = near && Math.floor(this.t / 166) % 2 === 1;
    // a small enamel plate like the clock's, 4px in from the corner, so the
    // icon reads as part of the screen and not as a post on the ground
    const px = HANKO_PLATE.x;
    const py = HANKO_PLATE.y;
    g.alpha(0.4, () => g.rect(px + 2, py + 2, HANKO_PLATE.w, HANKO_PLATE.h, UI.night));
    g.img(hankoPlateImg(), px, py, { alpha: 0.94 });
    const x = px + 3 + shake;
    const y = py + 2;
    // resting: the hanko is a little faded (α60%, 10.6); near a ふしぎ it wakes up
    g.img(hudHanko(bright), x, y, { alpha: near ? 1 : 0.6 });
    if (near) {
      // a drop of ink falls from the face and splats on the plate
      const p = (this.t % 900) / 900;
      const fy = y + 21;
      if (p < 0.5) g.px(x + 10, fy + Math.floor(ease.quadIn(p / 0.5) * 2), UI.accent);
      else if (p < 0.85) {
        g.px(x + 9, fy + 2, UI.accent);
        g.px(x + 11, fy + 2, UI.accent);
        g.px(x + 10, fy + 2, UI.accentDark);
      }
    }
  }

  /**
   * The place name, written in ink on a strip of washi tape stuck down in
   * the bottom-left corner beside the hanko plate — below the signboards on
   * the back walls of the rooms, and out of the way of the clock and the
   * item notes. The tape is pulled off the roll left to right (0.22 s) and
   * lifts away at the end.
   */
  private drawBanner(g: Gfx, b: Banner): void {
    const h = 18;
    const w = textW(b.text) + 18;
    const x = b.x;
    const inK = ease.cubicOut(Math.min(1, b.t / 220));
    const outK = b.t > b.dur - 300 ? Math.min(1, (b.t - (b.dur - 300)) / 300) : 0;
    const y = b.y - Math.round(ease.quadIn(outK) * 3);
    const a = 1 - outK;
    const shown = Math.round((w + 2) * inK);
    if (shown <= 0 || a <= 0) return;
    const seed = 3 + ([...b.text].length % 5);
    g.clip(x, y - 1, shown, h + 3, () => {
      // a soft shadow under the strip so it reads over the busiest ground
      rectA(g, x + 2, y + h, w - 4, 1, UI.night, 0.35 * a);
      rectA(g, x + 3, y + 2, w - 3, h - 2, UI.night, 0.18 * a);
      drawTape(g, x, y, w, h, '', { color: PLACE_TAPE, seed, alpha: a });
      g.text(b.text, x + 9, y + 1, { color: UI.text, alpha: a });
    });
  }

  private drawCard(g: Gfx, c: ItemCard, y0: number): void {
    if (c.t < 0) return;
    const it = getItem(c.id);
    if (!it) return;
    // 付箋のカード: sticks on in 0.1 s (1.2 → 1.0), peels off at the end
    const count = c.n > 1 ? `×${c.n}` : '';
    const name = it.name;
    const w = textW(name) + (count ? numeralsWidth(count) + 6 : 0) + 42;
    const h = 30;
    const stick = Math.min(1, c.t / 100);
    const peel = c.t > 2500 ? (c.t - 2500) / 300 : 0;
    const x = 8;
    const y = y0 - Math.round(peel * 10);
    const a = 1 - peel;
    const s = 1.2 - 0.2 * ease.cubicOut(stick);
    const cw = Math.round(w * s);
    const ch = Math.round(h * s);
    const cx = x + Math.round((w - cw) / 2);
    const cy = y + Math.round((h - ch) / 2);
    g.alpha(a, () => {
      rectA(g, cx + 2, cy + 2, cw, ch, UI.shadow, 0.45 * (0.4 + 0.6 * stick));
      g.rect(cx, cy, cw, ch, '#D9A441');
      g.rect(cx + 1, cy + 1, cw - 2, ch - 2, UI.tape);
      g.rect(cx + 1, cy + 1, cw - 2, 1, '#FBD9A0');
      // the curled bottom-right corner of the sticky note
      g.rect(cx + cw - 4, cy + ch - 4, 3, 3, '#E9B866');
      g.px(cx + cw - 1, cy + ch - 1, blend(UI.tape, UI.shadow, 0.3));
      // the icon and the name are on the note from the first frame (it is
      // the paper that settles, not what is written on it)
      g.img(itemIcon24(c.id), x + 4, y + 3);
      const tw = g.text(name, x + 32, y + 7, { color: UI.text });
      if (count) drawNumerals(g, count, x + 32 + tw + 5, y + 7, { color: UI.accentDark });
    });
  }

  get fieldRef(): FieldScene | null {
    return this.field;
  }
}

export const uiHud = new UiHud();

/** Show the clock plate for a while (events, menu). */
export function showClock(ms = 4000): void {
  uiHud.show(ms);
}

/** Show a place-name banner now. */
export function showPlaceName(text: string, ms = 2600): void {
  uiHud.showBanner(text, ms);
}

/** Pop the item sticky note (e.g. for things handed over outside the field). */
export function notifyItem(id: string, n = 1): void {
  uiHud.pushCard(id, n);
}

/**
 * The next pick-up of `id` makes no sticky note: call it before giving an
 * item that the event announces itself (a 大事なもの with its @sys line).
 *   skipItemCard('item_hanko_case'); giveKey('item_hanko_case');
 */
export function skipItemCard(id: string, n = 1): void {
  uiHud.skipCard(id, n);
}

export function isInventoryKey(id: string): boolean {
  return isKeyItem(id);
}

/**
 * The loudspeaker's call over 星見台 (fx_h_call_bubble, 52 13.1): the bubble
 * at the top of the screen (over the pole's horns on the hill's plaza).
 * The caller plays the voice; pass `voice` to have the bubble type with
 * its blips. Nothing is shown indoors.
 */
export function showCallBubble(text: string, o: { cps?: number; voice?: string; at?: 'auto' | 'top' | 'speaker'; hold?: number } = {}): CallBubbleHandle {
  return showCallBubbleImpl(text, o);
}

export { playCallBubble, clearCallBubbleUi as clearCallBubble } from './call_bubble';
export { showChoreCard, setChoreCount, choreCount, completeChoreCard, hideChoreCard, choreCardShowing, type ChoreItem } from './chore_card';

const curtain = { a: 0, color: '#0B0B14' };

/**
 * Darken the field under the HUD (0..1): the world goes black but the clock
 * plate, the call bubble and the notes stay — e.g. evt_ch2_ending's first
 * cut, where only 「4:59」 is seen in the dark. `ms` fades to it.
 */
export function* fieldCurtain(a: number, ms = 0, color = '#0B0B14'): Co {
  curtain.color = color;
  const a0 = curtain.a;
  for (let t = 0; t < ms; t += 16.7) {
    curtain.a = a0 + (a - a0) * (t / ms);
    yield null;
  }
  curtain.a = a;
}

/** Set the field's curtain at once (see fieldCurtain). */
export function setFieldCurtain(a: number, color = '#0B0B14'): void {
  curtain.a = a;
  curtain.color = color;
}

/**
 * 19:30 / 19:31 / 6:10 / 6:12 on the plate (null: back to the map's own
 * time). It turns over (3 frames); `{ cut: true }` shows it at once, for a
 * cut to another scene (50 10.16 カット3 「6:10」).
 */
export function setClockText(s: string | null, o: { cut?: boolean } = {}): void {
  uiHud.setTime(s, !!o.cut);
}

/** Install the UI HUD into the field and route world/hud's show()/setTime() to it. */
export function installHud(): void {
  setFieldHud(uiHud);
  setAutosaveClock(() => uiHud.clockBottom());
  worldHud.show = (ms = 4000) => uiHud.show(ms);
  worldHud.setTime = (s) => uiHud.setTime(s);
}

