// せってい (30_level_art 10.7, 10_narrative 12.4, 40_audio 11.6): おんがく and
// こうかおん are wooden rulers with a little hanko for a knob (0–10); 文字の
// はやさ and ツッコミ判定 are rows of masking tape. The controls lie across
// the open notebook, over the fold, like things put down on it.

import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { makeCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { charWidth } from '../../engine/font';
import { sfx, setVolume } from '../../audio';
import { saveSettings, settings, SPEED_LABELS, syncSettingFlags, textSpeedMul, WIDE_LABELS } from '../settings';
import { drawDigits } from '../digits';
import { cursorImg, dottedLine, drawCursor, drawMarker, drawTape, textW, UI } from '../window';
import { drawHeader, LP, SP } from './notebook';
import type { MenuCtx, MenuPage } from './types';

const LABELS = ['おんがく', 'こうかおん', '文字の はやさ', 'ツッコミ判定'];
const ROW_Y = SP.y + 32;
const ROW_H = 28;
const CX = SP.x + 124;
const RULER_W = 176;

let rulerC: HTMLCanvasElement | null = null;
/** A wooden 20 cm ruler with centimetre and half-centimetre ticks. */
function ruler(): HTMLCanvasElement {
  if (rulerC) return rulerC;
  const w = RULER_W;
  const h = 12;
  const [c, ctx] = makeCanvas(w + 2, h + 2);
  const r = (x: number, y: number, ww: number, hh: number, col: string, a = 1) => {
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, ww, hh);
    ctx.globalAlpha = 1;
  };
  r(2, 2, w, h, UI.night, 0.35);
  r(0, 0, w, h, UI.border);
  r(1, 1, w - 2, h - 2, '#E8C890');
  for (let x = 1; x < w - 1; x++)
    for (let y = 1; y < h - 1; y++) {
      const n = hash2(x >> 2, y, 11);
      if (n < 0.18) r(x, y, 1, 1, '#DDBA7E');
    }
  r(1, 1, w - 2, 1, '#F6DDA8');
  r(1, h - 2, w - 2, 1, '#C8A06A');
  // ticks: 11 marks for 0..10, half marks between
  for (let i = 0; i <= 20; i++) {
    const x = 8 + Math.round(((w - 16) * i) / 20);
    r(x, 1, 1, i % 2 === 0 ? 5 : 3, UI.border);
  }
  rulerC = c;
  return c;
}

function rulerX(v: number): number {
  return CX + 8 + Math.round(((RULER_W - 16) * v) / 10);
}

export class SettingsPage implements MenuPage {
  private row = 0;
  private moveT = 999;
  private knobT = 999;
  private sampleT = 0;

  enter(): boolean {
    return true;
  }

  update(_m: MenuCtx, dt: number, input: Input): boolean {
    this.moveT += dt;
    this.knobT += dt;
    this.sampleT += dt;
    if (input.repeat('down')) this.go(1);
    else if (input.repeat('up')) this.go(-1);
    const d = input.repeat('right') ? 1 : input.repeat('left') ? -1 : 0;
    if (d) this.change(d, false);
    if (input.pressed('confirm')) this.change(1, true);
    if (input.pressed('cancel')) {
      sfx('se_cancel');
      return false;
    }
    return true;
  }

  private go(d: number): void {
    this.row = (this.row + d + LABELS.length) % LABELS.length;
    this.moveT = 0;
    this.sampleT = 0;
    sfx('se_cursor');
  }

  private change(d: number, wrap: boolean): void {
    if (this.row <= 1) {
      if (wrap) return;
      const key = this.row === 0 ? 'bgm' : 'se';
      const v = Math.max(0, Math.min(10, settings[key] + d));
      if (v === settings[key]) {
        sfx('se_buzzer', { vol: 0.5 });
        return;
      }
      settings[key] = v;
      setVolume(key, v);
      this.knobT = 0;
      if (key === 'se') sfx('se_confirm');
      else sfx('se_slider', { pitch: 0.8 + (v / 10) * 0.45 });
    } else if (this.row === 2) {
      let v = settings.speed + d;
      if (wrap) v = (v + 3) % 3;
      if (v < 0 || v > 2) return;
      settings.speed = v as 0 | 1 | 2;
      this.sampleT = 0;
      this.knobT = 0;
      sfx('se_stamp_light');
    } else {
      const v = wrap ? !settings.wide : d > 0;
      if (v === settings.wide && !wrap) return;
      settings.wide = v;
      syncSettingFlags();
      this.knobT = 0;
      sfx('se_stamp_light');
    }
    saveSettings();
  }

  draw(g: Gfx, m: MenuCtx): void {
    drawHeader(g, 'せってい', LP.x, SP.y + 6, '#C8C2B4', 1, 13);
    LABELS.forEach((label, i) => {
      const y = ROW_Y + i * ROW_H;
      const sel = m.focus && i === this.row;
      if (sel) drawMarker(g, LP.x - 2, y + 1, textW(label) + 4, 15, Math.min(1, this.moveT / 70));
      g.text(label, LP.x, y, { color: UI.text });
      if (sel) drawCursor(g, SP.x + 1, y, m.t);
      if (i <= 1) this.drawRuler(g, y, i === 0 ? settings.bgm : settings.se, sel, m.t);
      else if (i === 2) this.drawTapes(g, y, SPEED_LABELS, settings.speed, sel);
      else this.drawTapes(g, y, WIDE_LABELS, settings.wide ? 1 : 0, sel);
    });
    // the note at the bottom of the spread
    const ny = SP.y + 150;
    dottedLine(g, LP.x, ny - 5, SP.x + SP.w - 16, UI.pencil, 3);
    const row = m.focus ? this.row : -1;
    if (row === 2) this.drawSample(g, ny);
    else if (row === 3) {
      g.text('ふつう：いつもの 間。', LP.x, ny, { color: settings.wide ? UI.textDim : UI.pencil });
      g.text('ひろい：受付が 2倍。', LP.x, ny + 17, { color: settings.wide ? UI.pencil : UI.textDim });
    } else if (row === 0 || row === 1) g.text('0 に すると、音が 消える。', LP.x, ny, { color: UI.pencil });
    else g.text('せっていは すぐに 保存される。', LP.x, ny, { color: UI.pencil });
  }

  private drawRuler(g: Gfx, y: number, v: number, sel: boolean, t: number): void {
    g.img(ruler(), CX, y + 3);
    // filled part: a pencil shading line under the ruler up to the value
    const kx = rulerX(v);
    for (let x = CX + 8; x <= kx; x++) g.px(x, y + 16, UI.accent);
    // the knob: a little hanko standing on the ruler, pressed when moved
    const pressed = this.knobT < 90 && sel;
    g.img(cursorImg(pressed), kx - 4, y - 5 + (pressed ? 0 : sel ? Math.floor(t / 250) % 2 : 0));
    drawDigits(g, String(v), CX + RULER_W + 12, y + 5, { color: v === 0 ? UI.textDim : UI.text, align: 'right' });
  }

  private drawTapes(g: Gfx, y: number, labels: string[], v: number, sel: boolean): void {
    let x = CX;
    labels.forEach((l, i) => {
      const w = textW(l) + 10;
      const on = i === v;
      const lift = on ? 1 : 0;
      drawTape(g, x, y - lift, w, 18, l, { color: on ? '#F7C27A' : '#E8D9B5', seed: 30 + i + labels.length, ink: on ? UI.text : UI.textDim });
      if (on) {
        // a tiny 朱 check stamp on the chosen tape
        const pressed = this.knobT < 90 && sel;
        g.rect(x + w - 6, y + 1 - lift + (pressed ? 1 : 0), 4, 4, UI.accent);
        g.px(x + w - 6, y + 1 - lift, UI.accentLight);
      }
      x += w + 6;
    });
  }

  private drawSample(g: Gfx, y: number): void {
    const text = 'こんな 速さで 文字が 出る。';
    const cps = 40 * textSpeedMul();
    const n = Math.min([...text].length, Math.floor((this.sampleT / 1000) * cps));
    if (this.sampleT > 1000 * ([...text].length / cps) + 1400) this.sampleT = 0;
    let x = LP.x;
    [...text].slice(0, n).forEach((ch) => {
      g.text(ch, x, y, { color: UI.pencil });
      x += charWidth(ch);
    });
  }
}
