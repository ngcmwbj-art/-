// Title (30_level_art 11, 10_narrative 5.1 / 12.6, 40_audio 13.6).
//
//  - Boot: a dark screen, 『なにか ボタンを 押してください』 (the first input
//    unlocks the audio).
//  - 0.0–0.6 s: the sky and the silhouettes fade in, each layer sliding up
//    (farther = less); ヒグラシ fades in.
//  - 0.6 s: the logo is stamped (1.25 → 1.0 in 6 frames, 2px shake, eight
//    drops of 朱, a one-frame vermilion flash) with se_stamp_heavy and
//    bgm_title from its intro.
//  - 1.2 s: three masking tapes slide up (はじめる／つづきから／せってい).
//  - In the music's bar I3 the chime rings G4 A4 C5 E5; the sun's red-pen
//    swirl pulses on each note; when E5 is cut off, the clouds and the swirl
//    stop and the wires shiver once. The town stays stopped.
//  - After the ending: bgm_title_clear (all eight notes, nothing stops) and a
//    notebook card with the みました帳 counts.
//
// Chapter 2 (50_ch2_story 1.4, 52_ch2_level_art 12.4):
//  - Once chapter 1 has been finished on this device a fourth tape
//    「第2章から」 sits between つづきから and せってい; it asks first (and warns
//    when the slot holds a game in progress that would be overwritten).
//  - A slot in the middle of chapter 2: a little green sticky 「第2章」 is
//    stuck to the back of the つづきから tape, and on 星見台's slope the
//    tomato's light blinks where the village is.
//  - After chapter 2: the patch of sky over 星見台 is a morning glow with the
//    sun a 朱 point on the ridge, and the card has a page for each notebook
//    (① 夕鳴町, ② 星見台) before its thank-you page. The music doesn't change.

import type { Co } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { Particles } from '../engine/particles';
import { H, W } from '../engine/screen';
import { ease } from '../engine/tween';
import { audioReady, musicPosition, playAmbient, playBgm, sfx, stopAllAmbient, stopBgm } from '../audio';
import { registerScene } from '../boot';
import { digitsWidth, drawDigits } from './digits';
import { chapter1Cleared, clearRecord, clearRecordCh2, continueGame, msgPages, saveKind, startChapter2, startNewGame, type ClearRecord, type SaveKind } from './flow';
import { CH2_TITLE_CONFIRM, CH2_TITLE_CONFIRM_OPTIONS, CH2_TITLE_OVERWRITE } from '../data/text/hoshi_events';
import { runSettings } from './menu';
import { ask } from './dialog';
import { tomatoIcon8 } from './icons';
import { drawCircledNum } from './menu/book';
import { hanamaruFrame } from '../battle/art/stamps';
import {
  CLOUDS,
  cloudCanvas,
  drawCrow,
  drawGrass,
  drawHoshimiMarks,
  drawHoshimiNight,
  drawMallSign,
  drawSunSwirl,
  drawWater,
  drawWires,
  farCanvas,
  LOGO_CENTER,
  logoCanvas,
  midCanvas,
  nearCanvas,
  skyCanvas,
  SUN,
  sunCanvas,
  type Sky,
} from './title_art';
import { dottedLine, drawCursor, drawTape, drawWindow, rectA, textW, UI } from './window';
import { coverToFade, ditherOut } from './transition';

type MenuId = 'new' | 'continue' | 'ch2' | 'settings';
const LABELS: Record<MenuId, string> = { new: 'はじめる', continue: 'つづきから', ch2: '第2章から', settings: 'せってい' };
/** The tapes' column (30 11.4): right-aligned block ending at y206. */
const MENU_X = 284;
const MENU_BOTTOM = 206;
const MENU_STEP = 19;
/** How deep the dusk is over the town behind the boot screen (it lifts from here). */
const PRESS_SHADE = 0.72;
const LOGO_AT = 600;
const MENU_AT = 1200;
/** Fallback chime timing when the music clock isn't available (ms after boot input). */
const CHIME_AT = [6900, 7700, 8500, 9300];
const CUT_AT = 9600;

export class TitleScene implements Scene {
  private phase: 'press' | 'intro' | 'leaving' = 'press';
  private t = 0;
  private pressT = 0;
  private index = 0;
  private moveT = 999;
  private pickT = -1;
  /** What the save slot holds (read once, without loading it). */
  private readonly kind: SaveKind = saveKind();
  private readonly canLoad = this.kind !== 'none';
  private readonly clear2: ClearRecord | null = clearRecordCh2();
  /** Chapter 1's counts after its ending (an empty card if only chapter 2's record survived). */
  private readonly clear: ClearRecord | null = clearRecord() ?? (this.clear2 ? { fushigi: 0, aite: 0, tsukkomi: 0, tsukkomiTotal: 19 } : null);
  private readonly menu: MenuId[] = chapter1Cleared() ? ['new', 'continue', 'ch2', 'settings'] : ['new', 'continue', 'settings'];
  /** 「第2章から」 is asking (the tapes step back like under the settings sheet). */
  private asking = false;
  private stamped = false;
  private notes = 0;
  private noteT = -9999;
  private cut = false;
  private cutT = -9999;
  private swirl = 0;
  private cloudOff = 0;
  private ink = new Particles();
  private crowAt = 12000;
  private busy = false;
  /** 0..1: the title's tapes step back while the settings sheet is up. */
  private menuHide = 0;
  /** The boot screen was shown: the town fades up from its dim state, not from black. */
  private fromPress = false;
  private readonly sky: Sky = 'sunset';

  constructor(skipPress = false) {
    if (skipPress || audioReady()) this.phase = 'intro';
    else this.fromPress = true;
    // with a save, the cursor rests on つづきから: one stray 決定 must not
    // start a new game over it
    this.index = this.canLoad ? 1 : 0;
  }

  enter(): void {
    if (this.phase === 'intro') this.begin();
  }

  private begin(): void {
    this.phase = 'intro';
    this.t = 0;
    playAmbient('amb_higurashi', { fade: 2 });
  }

  update(dt: number): void {
    const input = game.input;
    this.ink.update(dt);
    if (this.phase === 'press') {
      this.pressT += dt;
      if (input.anyKeyThisFrame && this.pressT > 200) {
        sfx('se_confirm', { vol: 0.6 });
        this.begin();
      }
      return;
    }
    this.t += dt;
    this.moveT += dt;
    this.menuHide = Math.max(0, Math.min(1, this.menuHide + (this.busy || this.asking ? dt : -dt) / 140));
    // the logo is stamped
    if (!this.stamped && this.t >= LOGO_AT) {
      this.stamped = true;
      sfx('se_stamp_heavy');
      playBgm(this.clear ? 'bgm_title_clear' : 'bgm_title');
      game.shake(2, 100);
      game.flash('#E23B2E', 17, 0.1);
      this.ink.burst(LOGO_CENTER.x, LOGO_CENTER.y + 4, {
        count: 8,
        speed: [50, 150],
        life: [260, 520],
        colors: ['#E23B2E', '#B8241E', '#FF6A4D'],
        gravity: 260,
        drag: 2.5,
        shape: 'sq',
        size: [1, 2],
      });
    }
    this.trackChime();
    // crows (every ~20 s), sun swirl, clouds
    if (!this.frozen) {
      this.swirl += (dt / 20000) * Math.PI * 2;
      this.cloudOff += (dt / 1000) * 4;
    }
    if (this.t > this.crowAt + 9000) this.crowAt = this.t + 11000;
    if (this.phase === 'leaving' || this.busy) {
      if (this.pickT >= 0) this.pickT += dt;
      return;
    }
    if (this.t < MENU_AT + 200) {
      // any key during the intro: skip to the menu (the chime still plays)
      if (input.pressed('confirm') && this.t > LOGO_AT + 200) this.t = MENU_AT + 200;
      return;
    }
    if (input.repeat('down')) this.move(1);
    else if (input.repeat('up')) this.move(-1);
    if (input.pressed('confirm')) this.pick();
  }

  /** Clouds and the swirl stop when the chime is cut (not after the ending). */
  private get frozen(): boolean {
    return this.cut && !this.clear;
  }

  private trackChime(): void {
    if (!this.stamped) return;
    const pos = musicPosition();
    let notes = this.notes;
    let cut = this.cut;
    if (pos && (pos.id === 'bgm_title' || pos.id === 'bgm_title_clear')) {
      if (pos.label === 'I3') notes = Math.max(notes, Math.min(4, Math.floor(pos.beat) + 1));
      else if (pos.label === 'I3b') notes = Math.max(notes, 4 + Math.min(4, Math.floor(pos.beat) + 1));
      else if (pos.label === 'I4' || (!pos.intro && notes > 0)) {
        notes = Math.max(notes, this.clear ? 8 : 4);
        if (!this.clear) cut = true;
      }
      if (!this.clear && pos.label === 'I3' && pos.beat >= 3 + (0.3 * pos.bpm) / 60) cut = true;
    } else if (!audioReady() || !pos) {
      const n = CHIME_AT.filter((a) => this.t >= a).length;
      notes = Math.max(notes, n);
      if (this.t >= CUT_AT && !this.clear) cut = true;
      if (this.clear && this.t >= CUT_AT) notes = 8;
    }
    if (notes > this.notes) {
      this.notes = notes;
      this.noteT = this.t;
    }
    if (cut && !this.cut) {
      this.cut = true;
      this.cutT = this.t;
    }
  }

  private move(d: number): void {
    const n = this.menu.length;
    let i = this.index;
    for (let k = 0; k < n; k++) {
      i = (i + d + n) % n;
      if (this.menu[i] !== 'continue' || this.canLoad) break;
    }
    if (i !== this.index) {
      this.index = i;
      this.moveT = 0;
      sfx('se_cursor');
    }
  }

  private pick(): void {
    const id = this.menu[this.index];
    if (id === 'continue' && !this.canLoad) {
      sfx('se_buzzer');
      return;
    }
    sfx('se_confirm');
    this.pickT = 0;
    if (id === 'settings') {
      this.busy = true;
      const self = this;
      game.scripts.run(
        (function* (): Co {
          yield 120;
          yield* runSettings();
          self.busy = false;
          self.pickT = -1;
        })(),
      );
      return;
    }
    if (id === 'ch2') {
      this.askChapter2();
      return;
    }
    this.leave(id);
  }

  /**
   * 「第2章から」 (50 1.4): the question, with a first page warning that the
   * slot's game in progress would be written over (chapter 1 or chapter 2
   * under way). やめる (or キャンセル) goes back to the tapes.
   */
  private askChapter2(): void {
    this.busy = true;
    this.asking = true;
    const self = this;
    const q = msgPages(CH2_TITLE_CONFIRM);
    const pages = this.kind === 'ch1' || this.kind === 'ch2' ? [...msgPages(CH2_TITLE_OVERWRITE), ...q] : q;
    game.scripts.run(
      (function* (): Co {
        yield 140;
        const i = yield* ask(pages, CH2_TITLE_CONFIRM_OPTIONS, { voice: 'sys', cancel: 1, index: 1 });
        self.asking = false;
        if (i === 0) {
          self.busy = false;
          self.leave('ch2');
          return;
        }
        yield 120;
        self.busy = false;
        self.pickT = -1;
      })(),
    );
  }

  /** Leave the title for a new game, the save, or chapter 2. */
  private leave(id: MenuId): void {
    this.phase = 'leaving';
    const self = this;
    game.scripts.run(
      (function* (): Co {
        stopBgm(1.0);
        stopAllAmbient(1.0);
        yield 160;
        yield* ditherOut(700, '#0B0B14');
        coverToFade();
        yield 250;
        if (id === 'new') yield* startNewGame();
        else if (id === 'ch2') yield* startChapter2('title');
        else {
          const ok = yield* continueGame();
          if (!ok) {
            self.phase = 'intro';
            yield* game.fadeIn(300);
          }
        }
      })(),
    );
  }

  // ---- drawing -------------------------------------------------------------------------

  draw(g: Gfx): void {
    if (this.phase === 'press') {
      this.drawPress(g);
      return;
    }
    const t = this.t;
    const inK = Math.min(1, t / LOGO_AT);
    const e = ease.cubicOut(inK);
    this.drawTown(g, t, e);
    // after the boot screen the town is already there in the dusk and
    // brightens; otherwise it comes up out of the dark
    if (this.fromPress) g.rect(0, 0, W, H, UI.night, PRESS_SHADE * (1 - e));
    else g.rect(0, 0, W, H, UI.darkest, 1 - e);
    this.drawLogo(g);
    this.ink.draw(g);
    this.drawMenu(g);
    if (this.clear && t > MENU_AT) this.drawClearCard(g);
  }

  /**
   * The stopped sunset town: sky, clouds, sun, the far and mid silhouettes,
   * wires, water, the two on the bridge — every layer opaque (the fade is
   * a shade laid over the whole, so no layer shows through another), `e`
   * how far the layers have slid up into place.
   */
  private drawTown(g: Gfx, t: number, e: number): void {
    const slide = (px: number) => Math.round((1 - e) * px);
    g.clear(UI.darkest);
    g.img(skyCanvas(this.sky), 0, 0);
    // clouds drift right (4 px/s) and stop with the chime
    CLOUDS.forEach((c, i) => {
      const img = cloudCanvas(i, this.sky);
      const span = W + img.width;
      const x = ((c.x + this.cloudOff * (1 + i * 0.15)) % span) - img.width * 0.2;
      g.img(img, Math.round(x > W ? x - span : x), c.y + slide(1));
    });
    this.drawSun(g, slide(1));
    const dawn = !!this.clear2;
    g.translated(0, slide(2), () => drawHoshimiNight(g, t, false, dawn ? 'dawn' : 'night'));
    g.img(farCanvas(this.sky), 0, 104 + slide(2));
    // chapter 2's marks on 星見台's hill: the morning, the tomato's light in the village
    if (dawn || this.kind === 'ch2') g.translated(0, slide(2), () => drawHoshimiMarks(g, t, { dawn, lantern: this.kind === 'ch2' }));
    g.img(midCanvas(this.sky), 0, 110 + slide(3));
    // 「ユ」 of ユウナリ flickers
    const flick = Math.floor(t / 90) % 37 === 0 || Math.floor(t / 90) % 53 === 0;
    g.translated(0, slide(3), () => drawMallSign(g, !flick, this.sky));
    // wires: idle sway, a 1px shiver right after the chime is cut
    const shiver = this.cut && t - this.cutT < 500 ? (Math.floor((t - this.cutT) / 60) % 2 ? 1 : -1) * (1 - (t - this.cutT) / 500) : 0;
    const sway = this.frozen ? shiver : Math.sin(t / 1400) * 0.6 + shiver;
    g.translated(0, slide(5), () => drawWires(g, sway, this.sky));
    g.translated(0, slide(6), () => drawWater(g, t, this.sky, this.frozen ? this.cutT : null));
    g.img(nearCanvas(this.sky), 0, slide(6));
    // Kanenari's bell catches the light every 4 s
    if (t % 4000 < 160) g.px(166, 168 + slide(6), '#FFF6D8');
    // crows crossing the sky
    const ct = t - this.crowAt;
    if (ct > 0 && ct < 9000) {
      const x = -20 + ct * 0.048;
      drawCrow(g, x, 58 + Math.sin(ct / 700) * 3, Math.floor(ct / 180));
      drawCrow(g, x - 16, 64 + Math.sin(ct / 650 + 1) * 3, Math.floor(ct / 170) + 1);
    }
    drawGrass(g, t, this.frozen ? 0.4 : 1);
  }

  /**
   * Boot (the first input unlocks the audio): the title's town waits in the
   * dusk, dim and still, the two on the bridge already there; the request
   * is written on a strip of masking tape stuck across the middle, and the
   * little hanko beside it bobs, waiting to be pressed.
   */
  private drawPress(g: Gfx): void {
    const k = ease.cubicOut(Math.min(1, this.pressT / 700));
    this.drawTown(g, 0, 0);
    g.rect(0, 0, W, H, UI.night, PRESS_SHADE);
    g.rect(0, 0, W, H, UI.darkest, 1 - k);
    const s = 'なにか ボタンを 押してください';
    const w = textW(s) + 28;
    const x = Math.round((W - w) / 2);
    const y = 104 + Math.round((1 - k) * 4);
    rectA(g, x + 2, y + 3, w - 2, 18, UI.night, 0.45 * k);
    drawTape(g, x, y, w, 20, '', { color: UI.tape, seed: 12, alpha: k });
    // the ink breathes slowly; it never quite goes out
    const blink = 0.86 + 0.14 * Math.cos(this.pressT / 520);
    g.text(s, Math.round(W / 2) + 2, y + 2, { color: UI.text, align: 'center', alpha: k * blink });
    drawCursor(g, x - 13, y + 2, this.pressT);
  }

  private drawSun(g: Gfx, dy: number): void {
    const img = sunCanvas();
    const pulse = Math.max(0, 1 - (this.t - this.noteT) / 450);
    g.translated(0, dy, () => {
      // each chime note: a ring of light swells round the sun
      if (pulse > 0) {
        const r = SUN.r + 3 + Math.round((1 - pulse) * 8);
        g.alpha(pulse * 0.6, () => g.ring(SUN.x, SUN.y, r, '#FFE7A3'));
      }
      g.img(img, SUN.x - img.width / 2, SUN.y - img.height / 2);
      drawSunSwirl(g, this.swirl, pulse);
    });
  }

  private drawLogo(g: Gfx): void {
    if (!this.stamped) return;
    const k = Math.min(1, (this.t - LOGO_AT) / 100); // 6 frames
    const s = 1.25 - 0.25 * ease.quadIn(k);
    const img = logoCanvas();
    const w = Math.round(img.width * s);
    const h = Math.round(img.height * s);
    const x = Math.round(LOGO_CENTER.x - w / 2);
    const y = Math.round(LOGO_CENTER.y - h / 2);
    g.ctx.drawImage(img, x, y, w, h);
    // SHUN'S TWILIGHT CHRONICLE in the 5×7 capitals, 2px apart
    if (k >= 1) {
      const a = Math.min(1, (this.t - LOGO_AT - 150) / 300);
      if (a > 0) g.alpha(a, () => drawDigits(g, "SHUN'S TWILIGHT CHRONICLE", LOGO_CENTER.x, LOGO_CENTER.y + 44, { color: UI.bg, outline: UI.border, align: 'center', spacing: 2 }));
    }
  }

  private drawMenu(g: Gfx): void {
    if (this.t < MENU_AT) return;
    // under the settings sheet the tapes are peeled away (they'd peek out past its edge)
    const shown = 1 - this.menuHide;
    if (shown <= 0) return;
    const n = this.menu.length;
    const top = MENU_BOTTOM - 18 - (n - 1) * MENU_STEP;
    this.menu.forEach((id, i) => {
      const k = Math.min(1, Math.max(0, (this.t - MENU_AT - i * 80) / 220)) * shown;
      if (k <= 0) return;
      const sel = i === this.index;
      const dim = id === 'continue' && !this.canLoad;
      const x = MENU_X;
      const y0 = top + i * MENU_STEP;
      const y = y0 + Math.round((1 - ease.backOut(k)) * 24) - (sel ? 1 : 0);
      const a = k * (dim ? 0.5 : 1);
      // a game in chapter 2: the sticky 「第2章」 stuck to the back of the tape, peeking out on the left
      const note = id === 'continue' && this.kind === 'ch2';
      if (note) drawChapterNote(g, x - NOTE_W + 5, y + 1, k, sel);
      drawTape(g, x, y, 88, 18, '', { color: sel ? UI.tapeOn : UI.tapeOff, seed: 40 + i, alpha: a });
      g.text(LABELS[id], x + 44, y + 1, { color: dim ? UI.textDim : UI.text, align: 'center', alpha: k });
      if (sel && k >= 1) drawCursor(g, (note ? x - NOTE_W + 5 : x) - 12, y, this.t, this.pickT >= 0 ? this.pickT : -1);
    });
  }

  /**
   * After the ending (11.4, 10_narrative 12.6, 50_ch2_story 1.4): a scrap of
   * notebook in the bottom-left corner, clear of the two silhouettes on the
   * bridge. Its pages turn every few seconds: the みました帳 counts, then
   * 「ここまで 見てくれて、ありがとう。」. After chapter 2 there is a page for
   * each notebook — ① 夕鳴町 and ② 星見台 — and two little flags on the
   * card's top edge (① blue, ② green with the tomato) say whose counts are
   * showing. The teacher's little はなまる is pressed over the top-right corner.
   */
  private drawClearCard(g: Gfx): void {
    if (this.asking) return;
    const c = this.clear!;
    const c2 = this.clear2;
    const pages: (1 | 2 | 0)[] = c2 ? [1, 2, 0] : [1, 0];
    const lt = this.t - MENU_AT;
    const k = Math.min(1, lt / 300);
    const { x, w, h } = CLEAR_CARD;
    const y = CLEAR_CARD.y + Math.round((1 - ease.cubicOut(k)) * 10);
    // which page, and how far through the turn
    const cyc = Math.max(0, lt - 300);
    const pi = Math.floor(cyc / CLEAR_PAGE_MS) % pages.length;
    const page = pages[pi];
    const pt = cyc % CLEAR_PAGE_MS;
    const turnIn = Math.min(1, pt / 220);
    const turnOut = pt > CLEAR_PAGE_MS - 220 ? (pt - (CLEAR_PAGE_MS - 220)) / 220 : 0;
    const ca = k * (lt < 300 ? 1 : cyc < CLEAR_PAGE_MS ? 1 - turnOut : turnIn * (1 - turnOut));
    const dx = Math.round((1 - turnIn) * 4 * (cyc < CLEAR_PAGE_MS ? 0 : 1) - turnOut * 4);
    // the notebook flags stick up behind the card's top edge
    if (c2) this.drawCardFlags(g, x, y, k, page);
    drawWindow(g, x, y, w, h, UI, k, { curl: false });
    g.alpha(ca, () => {
      const lx = x + 7 + dx;
      const rx = x + w - 7 + dx;
      if (page === 0) {
        ['ここまで', '見てくれて、', 'ありがとう。'].forEach((l, i) => g.text(l, lx, y + 6 + i * 17, { color: UI.sys }));
        return;
      }
      const r = page === 1 ? c : c2!;
      const tot = page === 1 ? [12, 7, r.tsukkomiTotal || 19] : [10, 6, r.tsukkomiTotal || 17];
      const row = (label: string, v: string, ry: number) => {
        g.text(label, lx, ry, { color: UI.text });
        drawDigits(g, v, rx, ry + 5, { color: UI.accent, align: 'right' });
        dottedLine(g, lx + textW(label) + 3, ry + 11, rx - digitsWidth(v) - 4, UI.bg2, 2);
      };
      row('ふしぎ', `${r.fushigi}/${tot[0]}`, y + 6);
      row('あいて', `${r.aite}/${tot[1]}`, y + 23);
      row('ツッコミ', `${r.tsukkomi}/${tot[2]}`, y + 40);
    });
    // page dots at the bottom edge
    if (k >= 1) {
      const n = pages.length;
      for (let i = 0; i < n; i++) g.rect(Math.round(x + w / 2 - (n * 6 - 2) / 2) + i * 6, y + h - 5, 2, 2, i === pi ? UI.accent : UI.bg2);
    }
    // the はなまる, over the corner
    g.alpha(k, () => g.img(hanamaruFrame(24, 1, false, 2), x + w - 17, y - 9));
  }

  /**
   * ① ② flags (16×12, like the みました帳's) tucked behind the card's top
   * edge; the one whose counts are showing stands 3 px taller. ② carries
   * the tomato (8×8).
   */
  private drawCardFlags(g: Gfx, x: number, y: number, a: number, page: 0 | 1 | 2): void {
    g.alpha(a, () => {
      ([1, 2] as const).forEach((n, i) => {
        const on = page === n;
        const fx = x + 8 + i * 24;
        const fy = y - 9 - (on ? 3 : 0);
        const col = n === 1 ? (on ? '#7FD1E8' : '#B8DDE6') : on ? '#9BCB6B' : '#C3D9AE';
        rectA(g, fx + 1, fy + 2, n === 2 ? 26 : 16, 12, UI.night, 0.3);
        const fw = n === 2 ? 26 : 16;
        g.rect(fx, fy, fw, 13, UI.border);
        g.rect(fx + 1, fy + 1, fw - 2, 12, col);
        g.rect(fx + 1, fy + 1, fw - 2, 1, '#FFFFFF');
        drawCircledNum(g, n, fx + 3, fy + 2, on ? UI.text : UI.pencil);
        if (n === 2) g.img(tomatoIcon8(), fx + 14, fy + 3);
      });
    });
  }
}

/**
 * The little sticky 「第2章」 on the つづきから tape (pale green, like ②'s
 * flag): its glue end is tucked under the tape's left end, the free corner
 * at the bottom left curls up a little, and it throws a soft shadow.
 */
const NOTE_W = 50;
function drawChapterNote(g: Gfx, x: number, y: number, a: number, sel: boolean): void {
  const w = NOTE_W;
  const h = 16;
  const paper = sel ? '#CDEBA8' : '#BFE095';
  const deep = sel ? '#B2DA86' : '#A6CF78';
  const edge = '#6F9F4E';
  g.alpha(a, () => {
    rectA(g, x + 2, y + 2, w - 2, h, UI.night, 0.32);
    // the paper; the bottom-left corner (3 rows) is folded back, so those rows start further in
    g.rect(x, y, w, h - 3, paper);
    for (let r = 0; r < 3; r++) g.rect(x + r + 1, y + h - 3 + r, w - r - 1, 1, r === 2 ? edge : deep);
    g.rect(x, y, 1, h - 3, edge);
    g.rect(x + 1, y, w - 1, 1, '#E4F4CF');
    g.rect(x + 1, y + h - 5, w - 1, 2, deep);
    // the fold: the back of the paper, a little triangle lying on the front
    g.px(x, y + h - 3, edge);
    g.px(x + 1, y + h - 4, '#DDEFC6');
    g.px(x + 2, y + h - 4, '#DDEFC6');
    g.px(x + 2, y + h - 5, '#DDEFC6');
    g.px(x + 3, y + h - 4, edge);
    g.px(x + 1, y + h - 3, edge);
    g.text('第2章', x + 6, y - 1, { color: UI.text });
  });
}

/** The post-ending card: bottom-left, left of the silhouettes on the bridge (x ≥ 118). */
const CLEAR_CARD = { x: 4, y: 146, w: 112, h: 62 };
const CLEAR_PAGE_MS = 4500;

registerScene('title', (p) => new TitleScene(p.get('skip') === '1'));

/** Go straight to the title (debug / after the ending). */
export function showTitle(): void {
  game.fadeAlpha = 0;
  game.replaceAll(new TitleScene(true));
}

