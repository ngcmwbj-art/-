// カット6 of evt_ch3_ending（60_ch3_story 10.29、62 12.9・13.4、63 12.24）：画面いっぱいに
// 自由研究ノート「海ぞいの町 みました帳 ③」。表紙に題が書かれ、ハンコケースが開く
// （10の枠がすべて埋まっている）。ふたの内側に、小さな朱の「おわり」（se_stamp_heavy）。
// 2.0秒のあとフェードアウト。クリアの保存とタイトルは events/ch3/ending.ts が続ける。

import type { Co } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { makeCanvas } from '../engine/pixel';
import { Particles } from '../engine/particles';
import { hash2 } from '../engine/rng';
import { H, W } from '../engine/screen';
import { ease } from '../engine/tween';
import { sfx, stopAllAmbient, stopBgm } from '../audio';
import { petalSprites } from '../battle/art/stamps';
import { CASE_H, CASE_SLOTS, CASE_W, caseLid, drawCase } from './hankocase';
import { drawCircledNum } from './menu/book';
import { ctxText, rectA, textW, UI } from './window';
import { NOTE3_TITLE } from '../data/text/c3_story4';

const COVER = { x: 20, y: 6, w: 344, h: 204 };
const CASE_AT = { x: 150, y: 108 };
/** The lid, opened up behind the case: its inside faces us. */
const LID = { x: 150, y: 64, w: CASE_W, h: 42 };
const SEAL = { size: 40 };
const PRESS_MS = 170;
/** 海の青（62 12.10 のマステの色）。 */
const SEA = '#3A7EA8';
const SEA_DARK = '#2A5E80';

let sealC: HTMLCanvasElement | null = null;
/** The little 朱 「おわり」 (cut out of the ink like 「つづく」, smaller). */
function owariSeal(size: number): HTMLCanvasElement {
  if (sealC) return sealC;
  const [c, ctx] = makeCanvas(size, size);
  const r = size / 2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - r;
      const dy = y + 0.5 - r;
      const a = Math.atan2(dy, dx);
      const edge = r - 0.6 - 0.8 * hash2(Math.round(a * 8), 0, 5);
      const d = Math.hypot(dx, dy);
      if (d > edge) continue;
      ctx.fillStyle = d > edge - 1.2 ? UI.accentDark : UI.accent;
      ctx.fillRect(x, y, 1, 1);
    }
  const word = 'おわり';
  ctxText(ctx, word, Math.round(size / 2 - textW(word) / 2) - 1, Math.round(size / 2 - 9), UI.bg);
  sealC = c;
  return c;
}

class NotebookCh3Scene implements Scene {
  transparent = false;
  t = 0;
  written = 0;
  writeT = -1;
  caseT = -1;
  lidT = -1;
  stampT = -1;
  fade = 0;
  private penAcc = 0;
  private landed = false;
  private parts = new Particles();
  private petals = petalSprites();

  update(dt: number): void {
    this.t += dt;
    this.parts.update(dt);
    const n = [...NOTE3_TITLE].length;
    if (this.writeT >= 0) {
      this.writeT += dt;
      this.penAcc += dt;
      while (this.penAcc >= 110 && this.written < n) {
        this.penAcc -= 110;
        const ch = [...NOTE3_TITLE][this.written++];
        if (ch.trim()) sfx('se_pen_write');
      }
    }
    if (this.caseT >= 0) this.caseT += dt;
    if (this.lidT >= 0) this.lidT += dt;
    if (this.stampT >= 0) {
      this.stampT += dt;
      if (!this.landed && this.stampT >= PRESS_MS) {
        this.landed = true;
        sfx('se_stamp_heavy');
        game.hitstop(133);
        game.flash('#E23B2E', 90, 0.12);
        const [sx, sy] = this.sealAt();
        for (let i = 0; i < 6; i++)
          this.parts.burst(sx, sy, { count: 1, speed: [30, 80], life: [600, 1000], colors: ['#E23B2E'], gravity: 60, drag: 1.5, shape: 'img', img: this.petals[i % this.petals.length] });
      }
    }
  }

  get titleDone(): boolean {
    return this.written >= [...NOTE3_TITLE].length;
  }

  private sealAt(): [number, number] {
    return [LID.x + LID.w - 30, LID.y + LID.h / 2 + 1];
  }

  draw(g: Gfx): void {
    g.clear('#1B1420');
    for (let y = 0; y < H; y += 3) g.rect(0, y, W, 1, y % 6 ? '#221A28' : '#1E1724');
    g.alpha(0.18, () => g.circle(192, 100, 150, '#FFE7A3'));
    const k = Math.min(1, this.t / 500);
    const cy = COVER.y + Math.round((1 - ease.cubicOut(k)) * 8);
    g.alpha(k, () => this.drawCover(g, cy));
    if (this.caseT >= 0) this.drawCase(g);
    this.parts.draw(g);
    if (this.fade > 0) g.rect(0, 0, W, H, UI.darkest, this.fade);
  }

  /** The cover of ③: sea-blue cloth, a darker binding, a paper label with the title written in. */
  private drawCover(g: Gfx, y: number): void {
    const { x, w, h } = COVER;
    rectA(g, x + 4, y + 4, w, h, '#0B0B14', 0.5);
    g.rect(x, y, w, h, SEA);
    g.rect(x, y, 14, h, SEA_DARK);
    for (let i = 0; i < h; i += 4) g.rect(x + 3, y + i + 1, 8, 1, '#24506E');
    // the cloth's weave
    for (let yy = 2; yy < h; yy += 6) for (let xx = 18; xx < w; xx += 9) g.px(x + xx + (yy % 12 ? 0 : 4), y + yy, '#4A8EB8');
    // the label
    const lx = x + 60;
    const ly = y + 12;
    const lw = 250;
    const lh = 48;
    rectA(g, lx + 2, ly + 2, lw, lh, '#0B0B14', 0.3);
    g.rect(lx, ly, lw, lh, '#F4F1E8');
    g.rect(lx, ly, lw, 1, '#FFFFFF');
    g.rect(lx, ly + lh - 1, lw, 1, '#D8D0B8');
    const chars = [...NOTE3_TITLE].slice(0, this.written).join('');
    const full = textW(NOTE3_TITLE);
    g.text(chars, lx + Math.round(lw / 2 - full / 2), ly + 10, { color: UI.text });
    // the class and the name
    g.text('5年2組　小林 しゅん', lx + 12, ly + 28, { color: UI.pencil });
    drawCircledNum(g, 3, lx + lw - 18, ly + 31, SEA);
    // a small lighthouse sticker (62 12.10)
    const sx = x + w - 34;
    const sy = y + h - 40;
    g.rect(sx + 3, sy, 6, 3, '#E23B2E');
    g.rect(sx + 2, sy + 3, 8, 16, '#F4F1E8');
    g.rect(sx + 2, sy + 7, 8, 3, '#E23B2E');
    g.rect(sx + 2, sy + 13, 8, 3, '#E23B2E');
    g.rect(sx, sy + 19, 12, 2, '#5A6A8A');
  }

  private drawCase(g: Gfx): void {
    const ck = Math.min(1, this.caseT / 220);
    const cx = CASE_AT.x;
    const cy = CASE_AT.y + Math.round((1 - ease.backOut(ck)) * 60);
    if (this.lidT < 34) {
      rectA(g, cx + 4, cy + 4, CASE_W, CASE_H, '#0B0B14', 0.5);
      g.img(caseLid(), cx, cy);
      return;
    }
    // the lid's inside, opened up behind the case
    const lk = Math.min(1, (this.lidT - 34) / 200);
    const lh = Math.round(LID.h * lk);
    if (lh > 0) {
      rectA(g, LID.x + 3, LID.y + LID.h - lh + 3, LID.w, lh, '#0B0B14', 0.4);
      g.rect(LID.x, LID.y + LID.h - lh, LID.w, lh, '#7A2A2A');
      g.rect(LID.x + 3, LID.y + LID.h - lh + 3, LID.w - 6, Math.max(0, lh - 6), '#9A3A3A');
    }
    // every one of the ten is pressed (a slot not filled yet shows its own imprint all the same)
    const appear = (i: number) => Math.min(1, (this.lidT - 34 - i * 40) / 200);
    drawCase(g, cx, cy, { owned: (id) => CASE_SLOTS.includes(id), clear: true, t: this.t, appear });
    if (this.stampT >= 0) {
      const [sx, sy] = this.sealAt();
      const seal = owariSeal(SEAL.size);
      const t = this.stampT;
      if (t < PRESS_MS) {
        const k = ease.quadIn(t / PRESS_MS);
        g.alpha(0.12 + 0.3 * k, () => g.circle(sx + 2, sy + 2, Math.round(SEAL.size * (0.5 - 0.15 * k)), '#1B1420'));
      } else {
        const lt = t - PRESS_MS;
        const s = lt < 85 ? 1.25 - 0.25 * ease.quadOut(lt / 85) : 1;
        const w = Math.round(seal.width * s);
        g.ctx.drawImage(seal, Math.round(sx - w / 2), Math.round(sy - w / 2), w, w);
      }
    }
  }
}

/** カット6：the notebook ③, the case (10 of 10), 「おわり」, the fade-out. */
export function* playEndingNotebookCh3(): Co {
  const sc = new NotebookCh3Scene();
  game.fadeColor = '#0B0B14';
  if (game.fadeAlpha < 1) yield* game.fadeOut(400, '#0B0B14');
  game.push(sc);
  yield* game.fadeIn(500);
  yield 600;
  sc.writeT = 0;
  sfx('se_page');
  yield () => sc.titleDone;
  yield 600;
  sc.caseT = 0;
  sfx('se_paper_bag', { vol: 0.6 });
  yield 400;
  sc.lidT = 0;
  sfx('se_paper_open', { pitch: 0.7 });
  yield 1300;
  // (E16's G4 held, the triangle's tail 2.0 s: 63 12.24)
  yield 1200;
  sc.stampT = 0;
  yield 2000;
  stopBgm(1.5);
  stopAllAmbient(1.0);
  for (let t = 0; t < 1500; t += 16.7) {
    sc.fade = t / 1500;
    yield null;
  }
  sc.fade = 1;
  if (game.top === sc) game.pop();
  game.fadeAlpha = 1;
}
