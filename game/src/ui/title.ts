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

import type { Co } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { Particles } from '../engine/particles';
import { W } from '../engine/screen';
import { ease } from '../engine/tween';
import { hasSave } from '../game/state';
import { audioReady, musicPosition, playAmbient, playBgm, sfx, stopAllAmbient, stopBgm } from '../audio';
import { registerScene } from '../boot';
import { digitsWidth, drawDigits } from './digits';
import { clearRecord, continueGame, startNewGame, type ClearRecord } from './flow';
import { runSettings } from './menu';
import { hanamaruFrame } from '../battle/art/stamps';
import {
  CLOUDS,
  cloudCanvas,
  drawCrow,
  drawGrass,
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
import { dottedLine, drawCursor, drawTape, drawWindow, textW, UI } from './window';
import { coverToFade, ditherOut } from './transition';

const MENU = ['はじめる', 'つづきから', 'せってい'];
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
  private readonly canLoad = hasSave();
  private readonly clear: ClearRecord | null = clearRecord();
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
  private readonly sky: Sky = 'sunset';

  constructor(skipPress = false) {
    if (skipPress || audioReady()) this.phase = 'intro';
    if (!this.canLoad) this.index = 0;
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
    let i = this.index;
    for (let k = 0; k < MENU.length; k++) {
      i = (i + d + MENU.length) % MENU.length;
      if (i !== 1 || this.canLoad) break;
    }
    if (i !== this.index) {
      this.index = i;
      this.moveT = 0;
      sfx('se_cursor');
    }
  }

  private pick(): void {
    const i = this.index;
    if (i === 1 && !this.canLoad) {
      sfx('se_buzzer');
      return;
    }
    sfx('se_confirm');
    this.pickT = 0;
    if (i === 2) {
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
        if (i === 0) yield* startNewGame();
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
    const slide = (px: number) => Math.round((1 - e) * px);
    g.clear(UI.darkest);
    g.alpha(e, () => {
      g.img(skyCanvas(this.sky), 0, 0);
      // clouds drift right (4 px/s) and stop with the chime
      CLOUDS.forEach((c, i) => {
        const img = cloudCanvas(i, this.sky);
        const span = W + img.width;
        const x = ((c.x + this.cloudOff * (1 + i * 0.15)) % span) - img.width * 0.2;
        g.img(img, Math.round(x > W ? x - span : x), c.y + slide(1));
      });
      this.drawSun(g, slide(1));
      g.translated(0, slide(2), () => drawHoshimiNight(g, t, false));
      g.img(farCanvas(this.sky), 0, 104 + slide(2));
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
    });
    this.drawLogo(g);
    this.ink.draw(g);
    this.drawMenu(g);
    if (this.clear && t > MENU_AT) this.drawClearCard(g);
  }

  private drawPress(g: Gfx): void {
    g.clear(UI.darkest);
    const a = 0.55 + 0.45 * Math.sin(this.pressT / 500);
    const s = 'なにか ボタンを 押してください';
    g.text(s, Math.round(W / 2), 98, { color: '#C8C2B4', align: 'center', alpha: Math.min(1, this.pressT / 400) * a });
    // a tiny hanko waiting to be pressed
    drawCursor(g, Math.round(W / 2 - textW(s) / 2) - 14, 98, this.pressT);
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
    // HANAMARU SUNSET in the 5×7 capitals, 2px apart
    if (k >= 1) {
      const a = Math.min(1, (this.t - LOGO_AT - 150) / 300);
      if (a > 0) g.alpha(a, () => drawDigits(g, 'HANAMARU SUNSET', LOGO_CENTER.x, LOGO_CENTER.y + 37, { color: UI.bg, outline: UI.border, align: 'center', spacing: 2 }));
    }
  }

  private drawMenu(g: Gfx): void {
    if (this.t < MENU_AT) return;
    MENU.forEach((label, i) => {
      const k = Math.min(1, Math.max(0, (this.t - MENU_AT - i * 80) / 220));
      if (k <= 0) return;
      const sel = i === this.index;
      const dim = i === 1 && !this.canLoad;
      const x = 284;
      const y0 = 150 + i * 19;
      const y = y0 + Math.round((1 - ease.backOut(k)) * 24) - (sel ? 1 : 0);
      const a = k * (dim ? 0.5 : 1);
      drawTape(g, x, y, 88, 18, '', { color: sel ? UI.tapeOn : UI.tapeOff, seed: 40 + i, alpha: a });
      g.text(label, x + 44, y + 1, { color: dim ? UI.textDim : UI.text, align: 'center', alpha: k });
      if (sel && k >= 1) drawCursor(g, x - 12, y, this.t, this.pickT >= 0 ? this.pickT : -1);
    });
  }

  /**
   * After the ending (11.4, 10_narrative 12.6): a scrap of notebook in the
   * bottom-left corner, clear of the two silhouettes on the bridge. It has
   * two pages, as the message has: the みました帳 counts, then
   * 「ここまで 見てくれて、ありがとう。」; they turn every few seconds.
   * The teacher's little はなまる is pressed over the top-right corner.
   */
  private drawClearCard(g: Gfx): void {
    const c = this.clear!;
    const lt = this.t - MENU_AT;
    const k = Math.min(1, lt / 300);
    const { x, w, h } = CLEAR_CARD;
    const y = CLEAR_CARD.y + Math.round((1 - ease.cubicOut(k)) * 10);
    drawWindow(g, x, y, w, h, UI, k, { curl: false });
    // which page, and how far through the turn
    const cyc = Math.max(0, lt - 300);
    const page = Math.floor(cyc / CLEAR_PAGE_MS) % 2;
    const pt = cyc % CLEAR_PAGE_MS;
    const turnIn = Math.min(1, pt / 220);
    const turnOut = pt > CLEAR_PAGE_MS - 220 ? (pt - (CLEAR_PAGE_MS - 220)) / 220 : 0;
    const ca = k * (lt < 300 ? 1 : cyc < CLEAR_PAGE_MS ? 1 - turnOut : turnIn * (1 - turnOut));
    const dx = Math.round((1 - turnIn) * 4 * (cyc < CLEAR_PAGE_MS ? 0 : 1) - turnOut * 4);
    g.alpha(ca, () => {
      const lx = x + 7 + dx;
      const rx = x + w - 7 + dx;
      if (page === 0) {
        const row = (label: string, v: string, ry: number) => {
          g.text(label, lx, ry, { color: UI.text });
          drawDigits(g, v, rx, ry + 5, { color: UI.accent, align: 'right' });
          dottedLine(g, lx + textW(label) + 3, ry + 11, rx - digitsWidth(v) - 4, UI.bg2, 2);
        };
        row('ふしぎ', `${c.fushigi}/12`, y + 6);
        row('あいて', `${c.aite}/7`, y + 23);
        row('ツッコミ', `${c.tsukkomi}/${c.tsukkomiTotal || 19}`, y + 40);
      } else {
        ['ここまで', '見てくれて、', 'ありがとう。'].forEach((l, i) => g.text(l, lx, y + 6 + i * 17, { color: UI.sys }));
      }
    });
    // page dots at the bottom edge
    if (k >= 1)
      for (let i = 0; i < 2; i++) g.rect(x + w / 2 - 4 + i * 6, y + h - 5, 2, 2, i === page ? UI.accent : UI.bg2);
    // the はなまる, over the corner
    g.alpha(k, () => g.img(hanamaruFrame(24, 1, false, 2), x + w - 17, y - 9));
  }
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

