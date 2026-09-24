// Field HUD (30_level_art 10.6, 10_narrative 12.5): the enamel clock plate
// (top right), the hanko icon that tells of a nearby 「ふしぎ」 (bottom
// left), the place name when a map / area is entered, and the sticky note
// for an item that was just picked up. Installed into the field through
// world/hud's setFieldHud(); the field's menu key (C/Tab and X) is also
// watched here, since the HUD is updated by the field every frame.

import type { Gfx } from '../engine/gfx';
import { game } from '../engine/game';
import { PixelCanvas } from '../engine/pixel';
import { ease } from '../engine/tween';
import { flag, state } from '../game/state';
import { isKeyItem, getItem } from '../data/battle';
import { sfx } from '../audio';
import { hud as worldHud, setFieldHud, type FieldHud } from '../world/hud';
import type { FieldScene } from '../world/field';
import { fushigiActive } from '../world/fushigi';
import { drawDigits } from './digits';
import { hudHanko, itemIcon24 } from './icons';
import { syncSettingFlags } from './settings';
import { blend, drawTape, rectA, textW, UI } from './window';
import { hash2 } from '../engine/rng';

// ---- clock -------------------------------------------------------------------------

export const CLOCK_TIMES = ['16:52', '16:55', '16:58', '17:00', '17:01'];

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
}

/** Draw the clock plate at (x,y). Used by the field HUD, the menu and the title. */
export function drawClockPlate(g: Gfx, x: number, y: number, v: ClockView, alpha = 1): void {
  g.alpha(alpha, () => {
    if (v.stage >= 3) g.img(glowImg(), x - 6, y - 6, { alpha: 0.55 + 0.1 * Math.sin(v.t / 700) });
    const yy = y + v.sink;
    g.img(plateImg(), x, yy);
    const colonOn = v.stage === 1 || v.stage === 2 ? true : Math.floor(v.t / 500) % 2 === 0;
    const tx = x + 12;
    const ty = yy + 4;
    const k = Math.min(1, v.flipT / 180);
    const cur = v.time;
    const prev = v.prev || cur;
    // digits roll over one by one when the time changes (flip clock)
    g.clip(x + 2, yy + 2, 48, 11, () => {
      let cx = tx;
      for (let i = 0; i < cur.length; i++) {
        const ch = cur[i];
        const adv = ch === ':' ? 4 : 6;
        if (ch === ':') {
          if (colonOn) drawDigits(g, ':', cx, ty, { color: UI.border });
        } else if (k < 1 && prev[i] !== ch) {
          const e = ease.cubicOut(k);
          drawDigits(g, prev[i] ?? ' ', cx, ty - Math.round(e * 9), { color: UI.border });
          drawDigits(g, ch, cx, ty + 9 - Math.round(e * 9), { color: UI.border });
        } else drawDigits(g, ch, cx, ty, { color: UI.border });
        cx += adv;
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

export function placeNameFor(mapId: string, tx: number, ty: number, fallback = ''): string {
  if (mapId === 'map_town') return areaAt(tx, ty) ?? '夕鳴町';
  return MAP_PLACE[mapId] ?? fallback;
}

interface Banner {
  text: string;
  t: number;
  dur: number;
}

interface ItemCard {
  id: string;
  t: number;
  n: number;
}

// ---- the HUD ---------------------------------------------------------------------------

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
  private cards: ItemCard[] = [];
  private inv = new Map<string, number>();
  private lastFrame = -10;
  private field: FieldScene | null = null;

  show(ms = 4000): void {
    this.showT = Math.max(this.showT, ms);
  }

  setTime(s: string | null): void {
    this.override = s;
    if (s) this.show();
  }

  /** Current clock text. */
  timeText(): string {
    if (this.override) return this.override;
    const c = Math.max(0, Math.min(4, flag('flag_clock')));
    if (c >= 4 || flag('flag_stage') >= 3) {
      // night: time moves on from 17:01
      const m = 1 + Math.floor(this.nightMs / 20000);
      return `17:${String(Math.min(59, m)).padStart(2, '0')}`;
    }
    return CLOCK_TIMES[c];
  }

  clockView(): ClockView {
    return {
      time: this.shown || this.timeText(),
      prev: this.prevShown,
      flipT: this.flipT,
      stage: flag('flag_stage'),
      t: this.t,
      sec: this.backT > 0 ? Math.max(0, this.sec - 1) : this.sec,
      sink: this.sinkT < 120 ? 1 : 0,
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
    }
    syncSettingFlags();
    this.flipT += dt;
    this.sinkT += dt;
    const st = flag('flag_stage');
    // ---- clock
    if (st >= 3 || flag('flag_clock') >= 4) this.nightMs += dt;
    const c = flag('flag_clock');
    if (c !== this.lastClock || f.map.id !== this.lastMap) {
      if (this.lastClock >= 0 || this.lastMap) this.show();
      this.lastClock = c;
    }
    const tt = this.timeText();
    if (tt !== this.shown) {
      if (this.shown) {
        this.prevShown = this.shown;
        this.flipT = 0;
        this.sinkT = 0;
      }
      this.shown = tt;
    }
    if (this.showT > 0) this.showT -= dt;
    const always = st >= 1 && st < 3;
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
    // ---- place names (after the fade-in, not during the opening)
    const place = placeNameFor(f.map.id, f.player.tileX, f.player.tileY, f.map.def.name ?? '');
    if (f.map.id !== this.lastMap) {
      this.lastMap = f.map.id;
      this.pendingPlace = place;
      this.placeDelay = 250;
      this.lastPlace = place;
    } else if (place !== this.lastPlace) {
      this.lastPlace = place;
      this.pendingPlace = place;
      this.placeDelay = 350;
    }
    if (this.pendingPlace) {
      if (game.fadeAlpha < 0.05 && !f.warping) this.placeDelay -= dt;
      if (this.placeDelay <= 0) {
        const p = this.pendingPlace;
        this.pendingPlace = null;
        const seen = this.placeSeen.get(p) ?? -1e9;
        if (flag('flag_opening_done') && this.t - seen > 25000 && !flag('flag_hud_hidden')) {
          this.banner = { text: p, t: 0, dur: 2600 };
          this.placeSeen.set(p, this.t);
        }
      }
    }
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > this.banner.dur) this.banner = null;
    }
    // ---- items picked up while walking around (not in battle, menu or shop)
    this.watchInventory(frameGap <= 2 && game.top === f);
    for (const cd of this.cards) cd.t += dt;
    this.cards = this.cards.filter((cd) => cd.t < 2800);
    // ---- the menu key
    if (menuEnabled && menuOpener && f.controllable && game.top === f && (game.input.pressed('menu') || game.input.pressed('cancel'))) {
      this.show(4000);
      menuOpener();
    }
  }

  private watchInventory(live: boolean): void {
    const now = new Map<string, number>();
    for (const id of state.inventory) now.set(id, (now.get(id) ?? 0) + 1);
    if (live) {
      for (const [id, n] of now) {
        const before = this.inv.get(id) ?? 0;
        if (n > before) this.pushCard(id, n - before);
      }
    }
    this.inv = now;
  }

  pushCard(id: string, n = 1): void {
    if (!getItem(id)) return;
    const same = this.cards.find((c) => c.id === id && c.t < 1500);
    if (same) {
      same.n += n;
      same.t = Math.min(same.t, 200);
      return;
    }
    this.cards.push({ id, t: -this.cards.length * 180, n });
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
    this.cards = [];
    this.inv.clear();
    this.lastFrame = -10;
  }

  /** Forget the place banner and item notes (a menu or shop covers the field). */
  clearNotes(): void {
    this.banner = null;
    this.cards = [];
  }

  showBanner(text: string, dur = 2600): void {
    this.banner = { text, t: 0, dur };
  }

  draw(g: Gfx, f: FieldScene): void {
    void f;
    // clock plate
    const y = Math.round(this.y);
    if (y > -24) drawClockPlate(g, 324, y, this.clockView());
    // hanko icon (bottom left)
    if (flag('flag_got_hanko') && !flag('flag_hud_hidden')) this.drawHanko(g);
    // place name banner (top left)
    let cardY = 8;
    if (this.banner) {
      this.drawBanner(g, this.banner);
      cardY = 30;
    }
    for (let i = 0; i < this.cards.length; i++) this.drawCard(g, this.cards[i], cardY + i * 34);
  }

  private drawHanko(g: Gfx): void {
    const near = !!this.near;
    const shake = near ? (Math.floor(this.t / (1000 / 12)) % 2 ? 1 : -1) : 0;
    const bright = near && Math.floor(this.t / 166) % 2 === 1;
    const a = near ? 1 : 0.6;
    const x = 8 + shake;
    const y = 190;
    // soft contact shadow so it reads on any ground
    g.alpha(a * 0.35, () => {
      g.rect(x + 3, y + 21, 15, 1, UI.border);
      g.rect(x + 5, y + 22, 11, 1, UI.border);
    });
    g.img(hudHanko(bright), x, y, { alpha: a });
    if (near) {
      // a drop of ink falls from the face and splats
      const p = (this.t % 900) / 900;
      if (p < 0.6) g.px(x + 10, y + 22 + Math.floor(ease.quadIn(p / 0.6) * 5), UI.accent);
      else if (p < 0.85) {
        g.px(x + 9, y + 26, UI.accent);
        g.px(x + 11, y + 26, UI.accent);
      }
    }
  }

  private drawBanner(g: Gfx, b: Banner): void {
    // floating text: #FBF3DC with a 1px ink outline (10.3), sliding in from the
    // left, underlined by a quick stroke that draws itself under the name
    const inK = Math.min(1, b.t / 220);
    const outK = b.t > b.dur - 350 ? (b.t - (b.dur - 350)) / 350 : 0;
    const a = inK * (1 - outK);
    const x = 12 - Math.round((1 - ease.cubicOut(inK)) * 8);
    const y = 8;
    const w = textW(b.text);
    g.text(b.text, x, y, { color: UI.bg, outline: UI.border, alpha: a });
    const k = Math.min(1, Math.max(0, (b.t - 120) / 260));
    const lw = Math.round((w + 6) * ease.cubicOut(k));
    if (lw > 0)
      g.alpha(a, () => {
        g.rect(x - 2, y + 18, lw + 2, 4, UI.border);
        g.rect(x - 1, y + 19, lw, 2, UI.bg);
        g.rect(x - 1, y + 19, Math.min(lw, 5), 2, UI.accent);
      });
  }

  private drawCard(g: Gfx, c: ItemCard, y0: number): void {
    if (c.t < 0) return;
    const it = getItem(c.id);
    if (!it) return;
    // 付箋のカード: sticks on in 0.1 s (1.2 → 1.0), peels off at the end
    const name = it.name + (c.n > 1 ? ` ×${c.n}` : '');
    const w = textW(name) + 42;
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
      rectA(g, cx + 2, cy + 2, cw, ch, UI.shadow, 0.45);
      g.rect(cx, cy, cw, ch, '#D9A441');
      g.rect(cx + 1, cy + 1, cw - 2, ch - 2, UI.tape);
      g.rect(cx + 1, cy + 1, cw - 2, 1, '#FBD9A0');
      // the curled bottom-right corner of the sticky note
      g.rect(cx + cw - 4, cy + ch - 4, 3, 3, '#E9B866');
      g.px(cx + cw - 1, cy + ch - 1, blend(UI.tape, UI.shadow, 0.3));
      if (stick >= 1) {
        g.img(itemIcon24(c.id), cx + 4, cy + 3);
        g.text(name, cx + 32, cy + 7, { color: UI.text });
      }
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

export function isInventoryKey(id: string): boolean {
  return isKeyItem(id);
}

/** Install the UI HUD into the field and route world/hud's show()/setTime() to it. */
export function installHud(): void {
  setFieldHud(uiHud);
  worldHud.show = (ms = 4000) => uiHud.show(ms);
  worldHud.setTime = (s) => uiHud.setTime(s);
}

