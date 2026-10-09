// 「ダンゴムシ ちゃうで」の 報告書（02_ch2_index #93、10_narrative 6.28、30_level_art 10.8）：
// 交番で 巡査と うめる 欄の ミニ遊び 3つと、さやの 推理の 画面。どれも 画面の 上に 出る 窓（modal）。
//
//   ・SizeGame『大きさ』：身長計。上から バーが 下りて くる。グソっ君は そっと 背のびを して いく
//     （つま先 立ち、1秒に 8cm、30cm まで）。けっていで しゅんが「のびるな！」と ツッコむと びくっと
//     もどり、0.6秒 じっと して から また のびる。ツッコミは 3回まで。バーが 頭に ついた ときの 高さが
//     はかった 値。正しい 105cm から ±1 で 優、±6 で 良、それより 上は 可。
//   ・LegsGame『足の 数』：あおむけの グソっ君（腹の 側）。足は 7対（はさみの 手から 3本ゆびの 足まで）、
//     ときどき わしゃっと 動く（ぶれる）。口の 下の 2本と 扇の しっぽは 足では ない。7秒 見たら
//     数を えらぶ（0〜30）。
//   ・FoodGame『好物』：つくえに 豆腐・たんかん・コーヒー・ラムネ・焼きそば。えらんで いる 物を
//     グソっ君が 見る。焼きそばの とき だけ、よだれの しずくと 目の きらり（こっそりの 反応）、
//     コーヒーの ときは 少し のけぞる。けっていで さし出す。
//   ・SuiriGame『正体』：本当の 特徴を 3つ（9つから。のこりは 消した 証言から 作った もの）。
//
//   iPad 横（ボタンが 下の 角）でも かからない よう、窓は y 6〜146 の まん中に おく。説明の キーの
//   札は keyGuide（events/stage.ts）。

import { type Widget } from '../engine/game';
import { Gfx } from '../engine/gfx';
import { makeCanvas } from '../engine/pixel';
import type { Input } from '../engine/input';
import { W } from '../engine/screen';
import { ease } from '../engine/tween';
import { markText } from '../engine/textzones';
import { sfx } from '../audio';
import { charSprite } from '../art/chars/registry';
import { drawDigits } from './digits';
import { drawCursor, drawMarker, drawWindow, UI } from './window';
import {
  HK_FOOD_WORD,
  HK_FOODS,
  HK_LEGS_WORD,
  HK_SIZE_WORD,
  HK_SUIRI_WORD,
  SIZE_TRUE,
  type Feature,
} from '../data/text/hokokusho';

const PANEL_Y = 6;
const PANEL_H = 140;

abstract class Panel implements Widget {
  modal = true;
  done = false;
  protected t = 0;
  protected out = -1;
  constructor(
    protected w: number,
    protected h = PANEL_H,
  ) {}
  get x(): number {
    return Math.round((W - this.w) / 2);
  }
  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.out >= 0) {
      this.out += dt;
      if (this.out >= 160) this.done = true;
      return;
    }
    this.tick(dt, input);
  }
  protected finish(): void {
    if (this.out < 0) this.out = 0;
  }
  protected abstract tick(dt: number, input: Input): void;
  protected abstract body(g: Gfx, x: number, y: number): void;
  draw(g: Gfx): void {
    const k = Math.min(1, this.t / 200);
    const a = this.out >= 0 ? Math.max(0, 1 - this.out / 160) : ease.quadOut(k);
    if (a <= 0) return;
    const x = this.x;
    const y = PANEL_Y + Math.round((1 - ease.backOut(k)) * 8);
    markText(x, PANEL_Y, this.w, this.h);
    drawWindow(g, x, y, this.w, this.h, UI, a, { curl: false });
    if (a < 0.6) return;
    g.alpha(a, () => this.body(g, x, y));
  }
}

/** グソっ君の 立ち絵（向き・おまけの 絵）。 */
function kn(dir: 'down' | 'left' | 'right' = 'down', extra?: string): HTMLCanvasElement {
  const s = charSprite('kanenari');
  if (extra) {
    const e = s.extraDir?.[extra]?.[dir] ?? s.extra?.[extra];
    if (e) return e;
  }
  return s.walk[dir][0];
}

/** 不透明な いちばん上の 行（頭の てっぺん）。 */
const topCache = new Map<HTMLCanvasElement, number>();
function opaqueTop(c: HTMLCanvasElement): number {
  const hit = topCache.get(c);
  if (hit !== undefined) return hit;
  let top = 0;
  try {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    outer: for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++)
        if (d[(y * c.width + x) * 4 + 3] > 0) {
          top = y;
          break outer;
        }
  } catch {
    top = 0;
  }
  topCache.set(c, top);
  return top;
}

// ================================================================ 『大きさ』

export class SizeGame extends Panel {
  /** はかった 値（cm）。バーが ついたら 決まる */
  result = 0;
  private bar = 0;
  /** 背のびの 高さ（cm） */
  private st = 0;
  private mode: 'rest' | 'creep' = 'rest';
  private wait = 900;
  private left = 3;
  private shockT = -1;
  private bubbleT = -1;
  private landed = -1;
  private readonly sc = 2;
  /** 1cm あたりの px（グソっ君の 立ち絵の 高さが 105cm） */
  private readonly ppc: number;
  private readonly topRow: number;
  private readonly fh: number;
  /** 1秒に 下りる px */
  private readonly speed = 11;
  private readonly creep = 8;
  private readonly maxSt = 30;

  constructor() {
    super(232);
    const fr = kn();
    this.topRow = opaqueTop(fr);
    this.fh = fr.height;
    this.ppc = ((this.fh - this.topRow) * this.sc) / SIZE_TRUE;
  }

  private get floorY(): number {
    return 124;
  }
  /** 頭の てっぺん（窓の 中の y） */
  private headY(): number {
    return this.floorY - (SIZE_TRUE + this.st) * this.ppc;
  }

  protected tick(dt: number, input: Input): void {
    if (this.landed >= 0) {
      this.landed += dt;
      if (this.landed > 1500) this.finish();
      return;
    }
    if (this.t < 500) return;
    const s = dt / 1000;
    this.bar += this.speed * s;
    if (this.shockT >= 0) this.shockT += dt;
    if (this.bubbleT >= 0) this.bubbleT += dt;
    if (this.mode === 'rest') {
      this.wait -= dt;
      if (this.wait <= 0) this.mode = 'creep';
    } else this.st = Math.min(this.maxSt, this.st + this.creep * s * (0.8 + 0.4 * Math.abs(Math.sin(this.t / 300))));
    if (input.pressed('confirm') && this.left > 0) {
      this.left--;
      this.st = 0;
      this.mode = 'rest';
      this.wait = 600;
      this.shockT = 0;
      this.bubbleT = 0;
      sfx('se_hit_pashi', { vol: 0.8 });
    }
    // the bar meets the head
    const barY = 30 + this.bar;
    if (barY >= this.headY()) {
      this.result = Math.round(SIZE_TRUE + this.st);
      this.landed = 0;
      sfx('se_stamp_light');
    }
  }

  protected body(g: Gfx, x: number, y: number): void {
    g.text(HK_SIZE_WORD.title, x + 10, y + 6, { color: UI.text });
    // ツッコミ ●●●
    const lw = g.measure(HK_SIZE_WORD.left);
    g.text(HK_SIZE_WORD.left, x + this.w - 44 - lw, y + 6, { color: UI.pencil });
    for (let i = 0; i < 3; i++) {
      const cx = x + this.w - 36 + i * 10;
      if (i < this.left) g.circle(cx, y + 14, 3, UI.accent);
      else g.ring(cx, y + 14, 3, UI.textDim);
    }
    const fy = y + this.floorY;
    // 床と 身長計の 柱（目盛り 10cm ごと）
    const poleX = x + 70;
    g.rect(x + 40, fy, 150, 4, '#C8A06A');
    g.rect(x + 40, fy + 4, 150, 1, '#8A5A3A');
    g.rect(poleX, y + 10, 4, fy - y - 10, '#E8E4D8');
    g.rect(poleX + 4, y + 10, 1, fy - y - 10, '#8A90A0');
    for (let cm = 0; cm <= 150; cm += 10) {
      const ty = Math.round(fy - cm * this.ppc);
      if (ty < y + 12) break;
      g.rect(poleX - (cm % 50 === 0 ? 5 : 3), ty, cm % 50 === 0 ? 5 : 3, 1, UI.pencil);
      if (cm === 100) drawDigits(g, '100', poleX - 22, ty - 3, { color: UI.pencil });
    }
    // グソっ君（つま先 立ちの ぶん 浮く。足の 下に 細い つま先）
    const fr = this.shockT >= 0 && this.shockT < 350 ? kn('down', 'shock') : kn();
    const lift = Math.round(this.st * this.ppc);
    const gx = poleX + 30;
    const gy = Math.round(fy - this.fh * this.sc - lift);
    if (lift > 0) {
      g.rect(gx + Math.round(fr.width * this.sc * 0.32), gy + fr.height * this.sc - 2, 2, lift + 2, '#A8693A');
      g.rect(gx + Math.round(fr.width * this.sc * 0.62), gy + fr.height * this.sc - 2, 2, lift + 2, '#A8693A');
    }
    g.img(fr, gx, gy + (this.shockT >= 0 && this.shockT < 120 ? 2 : 0), { scale: this.sc });
    // バー（柱から 右へ）
    const by = Math.round(y + 30 + Math.min(this.bar, this.headY() - 30));
    g.rect(poleX - 2, by - 1, 64, 3, '#5A5F6E');
    g.rect(poleX - 2, by - 1, 64, 1, '#C8CCD4');
    // しゅんの ツッコミ
    if (this.bubbleT >= 0 && this.bubbleT < 600) {
      const bw = g.measure(HK_SIZE_WORD.tsukkomi) + 10;
      const bx = x + this.w - bw - 12;
      const byy = y + 34 - Math.round(Math.min(1, this.bubbleT / 80) * 4);
      g.rect(bx, byy, bw, 20, UI.white);
      g.frame(bx, byy, bw, 20, UI.border);
      g.text(HK_SIZE_WORD.tsukkomi, bx + 5, byy + 2, { color: UI.accent });
    }
    // はかった 値
    if (this.landed >= 0) {
      const s = String(this.result);
      const tx = x + this.w - 64;
      drawDigits(g, s, tx, y + 70, { color: UI.accent, scale: 3, align: 'right' });
      g.text('cm', tx + 4, y + 76, { color: UI.accent });
    }
  }
}

// ================================================================ 『足の 数』

export class LegsGame extends Panel {
  /** えらんだ 数（-1 は まだ） */
  result = -1;
  private phase: 'look' | 'ask' = 'look';
  private num: number;
  private readonly lookMs = 7000;
  private moveT = 999;

  constructor(start = 10) {
    super(240);
    this.num = start;
  }

  protected tick(dt: number, input: Input): void {
    this.moveT += dt;
    if (this.phase === 'look') {
      if (this.t > this.lookMs) {
        this.phase = 'ask';
        sfx('se_page');
      }
      return;
    }
    if (input.repeat('up') || input.repeat('right')) this.step(1);
    else if (input.repeat('down') || input.repeat('left')) this.step(-1);
    else if (input.pressed('confirm')) {
      sfx('se_confirm');
      this.result = this.num;
      this.finish();
    }
  }

  private step(d: number): void {
    const n = Math.max(0, Math.min(30, this.num + d));
    if (n !== this.num) {
      this.num = n;
      this.moveT = 0;
      sfx('se_cursor');
    }
  }

  /** わしゃっ：1.4秒ごとに 0.45秒 */
  private washa(): number {
    const ph = (this.t % 1400) / 1400;
    return ph > 0.68 ? 1 : 0;
  }

  protected body(g: Gfx, x: number, y: number): void {
    g.text(HK_LEGS_WORD.title, x + 10, y + 6, { color: UI.text });
    if (this.phase === 'look') {
      g.text(HK_LEGS_WORD.look, x + this.w - 12 - g.measure(HK_LEGS_WORD.look), y + 6, { color: UI.pencil });
      const k = Math.max(0, 1 - this.t / this.lookMs);
      g.rect(x + 10, y + 24, Math.round((this.w - 20) * k), 2, UI.accent);
    }
    this.drawBelly(g, x + Math.round(this.w / 2), y + 78, this.phase === 'look' ? 1 : 0.35);
    if (this.phase === 'ask') {
      const cy = y + 100;
      const q = HK_LEGS_WORD.ask;
      const cx = x + Math.round(this.w / 2);
      g.rect(x + 12, cy - 4, this.w - 24, 32, UI.cream);
      g.text(q, x + 22, cy + 4, { color: UI.text });
      const nx = cx + 40;
      const bump = this.moveT < 80 ? 1 : 0;
      drawDigits(g, String(this.num), nx + 16, cy + 2 - bump, { color: UI.accent, scale: 2, align: 'center' });
      g.text(HK_LEGS_WORD.unit, nx + 34, cy + 4, { color: UI.text });
      // ▲▼
      for (let i = 0; i < 3; i++) {
        g.rect(nx + 16 - i, cy - 3 + i, i * 2 + 1, 1, UI.pencil);
        g.rect(nx + 16 - i, cy + 26 - i, i * 2 + 1, 1, UI.pencil);
      }
    }
  }

  /** あおむけの グソっ君（腹の 側）。足 7対、口の 下の 2本、扇の しっぽ。 */
  private drawBelly(g: Gfx, cx: number, cy: number, a: number): void {
    const body = '#D49A5C';
    const shade = '#A8693A';
    const belly = '#F0CB98';
    const ink = '#5A3A2A';
    const ws = this.washa();
    g.alpha(a, () => {
      // 扇の しっぽ（下）
      for (let i = -2; i <= 2; i++) {
        const tx = cx + i * 7;
        g.rect(tx - 3, cy + 32, 6, 10 - Math.abs(i) * 2, shade);
        g.rect(tx - 2, cy + 33, 4, 8 - Math.abs(i) * 2, body);
      }
      // 足 7対（はさみの 手 → 小さい 足 5対 → 3本ゆびの 足）
      for (let i = 0; i < 7; i++) {
        const ly = cy - 18 + i * 7;
        for (const side of [-1, 1]) {
          const ax = cx + side * (30 - Math.abs(i - 3) * 1.5);
          const ph = this.t / 160 + i * 0.9 + (side > 0 ? 1.7 : 0);
          const jig = ws ? Math.sin(this.t / 30 + i * 2 + side) * 3 : Math.sin(ph) * 0.8;
          const len = i === 0 ? 14 : i === 6 ? 13 : 10;
          const ex = Math.round(ax + side * len);
          const ey = Math.round(ly + (i - 3) * 1.5 + jig);
          const mx = Math.round(ax + side * len * 0.55);
          const my = Math.round(ly - 3 + jig * 0.5);
          if (ws) {
            // ぶれ（もう 1本 うすく）
            g.alpha(0.35, () => {
              g.line(Math.round(ax), ly, mx, my - 3, shade);
              g.line(mx, my - 3, ex, ey - 4, shade);
            });
          }
          g.line(Math.round(ax), ly, mx, my, ink);
          g.line(mx, my, ex, ey, ink);
          g.line(Math.round(ax), ly + 1, mx, my + 1, shade);
          if (i === 0) {
            // はさみ
            g.rect(ex - 1, ey - 3, 3, 3, body);
            g.px(ex + side * 2, ey - 3, ink);
            g.px(ex + side * 2, ey, ink);
          } else if (i === 6) {
            // 3本ゆび
            for (const d of [-1, 0, 1]) g.px(ex + side, ey + d * 2, ink);
          }
        }
      }
      // 腹（だ円と 節）
      for (let yy = -26; yy <= 30; yy++) {
        const half = Math.round(Math.sqrt(Math.max(0, 1 - (yy / 30) ** 2)) * 30);
        if (half <= 0) continue;
        g.rect(cx - half, cy + yy, half * 2, 1, Math.abs(yy) % 7 === 3 ? shade : yy < -12 ? body : belly);
        g.px(cx - half, cy + yy, ink);
        g.px(cx + half - 1, cy + yy, ink);
      }
      // 頭（上）：大きな 黒目、白い はちまき
      g.rect(cx - 18, cy - 32, 36, 12, body);
      g.rect(cx - 18, cy - 34, 36, 3, '#F4F1E8');
      g.circle(cx - 9, cy - 25, 4, '#1B1733');
      g.circle(cx + 9, cy - 25, 4, '#1B1733');
      g.px(cx - 10, cy - 27, '#FFFFFF');
      g.px(cx + 8, cy - 27, '#FFFFFF');
      // 口の 下から 垂れる 2本（足では ない）
      g.line(cx - 3, cy - 20, cx - 6, cy - 4, ink);
      g.line(cx + 3, cy - 20, cx + 6, cy - 4, ink);
      g.line(cx - 4, cy - 20, cx - 7, cy - 5, '#FFFFFF');
      g.line(cx + 4, cy - 20, cx + 7, cy - 5, '#FFFFFF');
    });
  }
}

// ================================================================ 『好物』

const FOOD_ART: Record<string, (g: Gfx, x: number, y: number) => void> = {
  豆腐: (g, x, y) => {
    g.rect(x, y + 10, 20, 4, '#5A8AC8');
    g.rect(x + 3, y + 3, 14, 8, '#FFFFFF');
    g.rect(x + 3, y + 10, 14, 1, '#C8CCD4');
    g.rect(x + 16, y + 3, 1, 8, '#E2DCCB');
  },
  たんかん: (g, x, y) => {
    g.circle(x + 10, y + 8, 6, '#F2994A');
    g.px(x + 7, y + 5, '#FFC07A');
    g.px(x + 8, y + 4, '#FFC07A');
    g.rect(x + 10, y + 1, 1, 2, '#2F6A2A');
    g.rect(x + 11, y + 1, 3, 2, '#4E9A3A');
  },
  コーヒー: (g, x, y) => {
    g.rect(x + 4, y + 6, 11, 9, '#FFFFFF');
    g.rect(x + 5, y + 6, 9, 2, '#5A341C');
    g.rect(x + 15, y + 8, 2, 4, '#FFFFFF');
    g.rect(x + 2, y + 15, 16, 1, '#C8CCD4');
    g.px(x + 7, y + 2, '#C8C2B4');
    g.px(x + 8, y + 1, '#C8C2B4');
    g.px(x + 11, y + 3, '#C8C2B4');
    g.px(x + 12, y + 2, '#C8C2B4');
  },
  ラムネ: (g, x, y) => {
    g.rect(x + 7, y, 6, 3, '#4A8AC8');
    g.rect(x + 6, y + 3, 8, 13, '#9AD8E8');
    g.rect(x + 7, y + 7, 6, 2, '#6AB8D8');
    g.circle(x + 10, y + 5, 1, '#E8F6FA');
    g.rect(x + 7, y + 4, 1, 10, '#E8F6FA');
  },
  焼きそば: (g, x, y) => {
    g.rect(x, y + 6, 20, 10, '#E8E4D8');
    g.rect(x + 1, y + 6, 18, 6, '#B8742A');
    for (let i = 0; i < 6; i++) g.px(x + 2 + i * 3, y + 7 + (i % 2), '#7A4A1E');
    g.px(x + 5, y + 8, '#E8662A');
    g.px(x + 12, y + 9, '#E8662A');
    g.rect(x + 1, y + 5, 18, 1, '#C8C2B4');
    // 青のりは 別（小袋）
    g.rect(x + 15, y + 1, 5, 4, '#4E9A3A');
    g.rect(x + 15, y + 1, 5, 1, '#8AC86A');
  },
};

const foodCache = new Map<string, HTMLCanvasElement>();
/** The food's picture (20×16), built once; drawn at 2×. */
function foodImg(f: string): HTMLCanvasElement {
  let c = foodCache.get(f);
  if (!c) {
    const [cv, ctx] = makeCanvas(20, 17);
    FOOD_ART[f](new Gfx(ctx, 20, 17), 0, 0);
    foodCache.set(f, (c = cv));
  }
  return c;
}

export class FoodGame extends Panel {
  result = -1;
  private sel = 0;
  private moveT = 999;
  constructor(private tried: number[] = []) {
    super(272);
    while (this.tried.includes(this.sel) && this.sel < HK_FOODS.length - 1) this.sel++;
  }

  protected tick(dt: number, input: Input): void {
    this.moveT += dt;
    if (this.t < 250) return;
    const n = HK_FOODS.length;
    if (input.repeat('right')) this.move(1, n);
    else if (input.repeat('left')) this.move(-1, n);
    else if (input.pressed('confirm')) {
      if (this.tried.includes(this.sel)) {
        sfx('se_buzzer');
        return;
      }
      sfx('se_confirm');
      this.result = this.sel;
      this.finish();
    }
  }

  private move(d: number, n: number): void {
    this.sel = (this.sel + d + n) % n;
    this.moveT = 0;
    sfx('se_cursor');
  }

  protected body(g: Gfx, x: number, y: number): void {
    g.text(HK_FOOD_WORD.title, x + 10, y + 6, { color: UI.text });
    const cx = x + Math.round(this.w / 2);
    // グソっ君（つくえの むこう。えらんで いる 物を 見る）
    const food = HK_FOODS[this.sel];
    const dir = this.sel <= 1 ? 'left' : this.sel >= 3 ? 'right' : 'down';
    const fr = kn(dir);
    const back = food === 'コーヒー' && this.moveT > 300 ? 2 : 0;
    const hop = food === '焼きそば' && this.moveT > 250 && Math.floor(this.t / 700) % 3 === 0 ? -1 : 0;
    const gx = cx - fr.width;
    const gy = y + 66 - fr.height * 2 + back + hop;
    g.img(fr, gx, gy, { scale: 2 });
    if (food === '焼きそば' && this.moveT > 250) {
      // よだれの しずくと 目の きらり（こっそり）
      const ph = (this.t % 900) / 900;
      const mx = gx + fr.width + (dir === 'right' ? 6 : dir === 'left' ? -6 : 0);
      g.px(mx, gy + Math.round(fr.height * 1.25) + Math.round(ph * 4), '#9AD8E8');
      if (ph < 0.25) {
        const ex = gx + fr.width + (dir === 'right' ? 8 : 4);
        g.px(ex, gy + 10, '#FFE7A3');
        g.px(ex - 1, gy + 11, '#FFE7A3');
        g.px(ex + 1, gy + 11, '#FFE7A3');
        g.px(ex, gy + 12, '#FFE7A3');
      }
    }
    if (food === 'コーヒー' && this.moveT > 300) g.px(gx + 2 * fr.width + 2, gy + 8 + Math.round(((this.t % 800) / 800) * 3), '#9AD8E8');
    // つくえ
    const dy = y + 66;
    g.rect(x + 14, dy, this.w - 28, 36, '#8A90A0');
    g.rect(x + 14, dy, this.w - 28, 2, '#C8CCD4');
    g.rect(x + 14, dy + 36, this.w - 28, 2, '#5A5F6E');
    // 食べ物 5つ
    const slot = Math.floor((this.w - 40) / HK_FOODS.length);
    HK_FOODS.forEach((f, i) => {
      const fx = x + 20 + i * slot + Math.round((slot - 40) / 2);
      const fy = dy - 6;
      const tried = this.tried.includes(i);
      const lift = i === this.sel && !tried ? -2 : 0;
      g.img(foodImg(f), fx, fy + lift, { scale: 2, alpha: tried ? 0.35 : 1 });
      if (tried) {
        g.line(fx + 6, fy + 6, fx + 33, fy + 30, UI.accent);
        g.line(fx + 33, fy + 6, fx + 6, fy + 30, UI.accent);
      }
      if (i === this.sel) drawCursor(g, fx + 15, fy - 14, this.t);
    });
    // 名前
    const name = food;
    const nw = g.measure(name);
    drawMarker(g, cx - Math.round(nw / 2) - 3, y + 112, nw + 6, 15, Math.min(1, this.moveT / 70));
    g.text(name, cx - Math.round(nw / 2), y + 111, { color: this.tried.includes(this.sel) ? UI.textDim : UI.text });
  }
}

// ================================================================ 『正体』：本当の 特徴を 3つ

export class SuiriGame extends Panel {
  result: string[] = [];
  private sel = 0;
  private picked = new Set<string>();
  private moveT = 999;
  private readonly colW = 154;

  constructor(private feats: Feature[]) {
    super(336);
  }

  /** 0..8 特徴、9 = これで きめる */
  private get n(): number {
    return this.feats.length + 1;
  }

  protected tick(dt: number, input: Input): void {
    this.moveT += dt;
    if (this.t < 250) return;
    const n = this.n;
    let s = this.sel;
    if (input.repeat('down')) s = Math.min(n - 1, s + 2);
    else if (input.repeat('up')) s = Math.max(0, s - 2);
    else if (input.repeat('right')) s = Math.min(n - 1, s + 1);
    else if (input.repeat('left')) s = Math.max(0, s - 1);
    if (s !== this.sel) {
      this.sel = s;
      this.moveT = 0;
      sfx('se_cursor');
      return;
    }
    if (!input.pressed('confirm')) return;
    if (this.sel === this.feats.length) {
      if (this.picked.size !== 3) {
        sfx('se_buzzer');
        return;
      }
      sfx('se_confirm');
      this.result = [...this.picked];
      this.finish();
      return;
    }
    const id = this.feats[this.sel].id;
    if (this.picked.has(id)) {
      this.picked.delete(id);
      sfx('se_cancel');
    } else if (this.picked.size < 3) {
      this.picked.add(id);
      sfx('se_stamp_light');
    } else sfx('se_buzzer');
  }

  protected body(g: Gfx, x: number, y: number): void {
    g.text(HK_SUIRI_WORD.title, x + 12, y + 6, { color: UI.text });
    drawDigits(g, `${this.picked.size}/3`, x + this.w - 14, y + 11, { color: this.picked.size === 3 ? UI.accent : UI.pencil, align: 'right' });
    for (let i = 0; i < this.n; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = x + 14 + col * (this.colW + 6);
      const cy = y + 26 + row * 21;
      const sel = i === this.sel;
      if (i === this.feats.length) {
        const label = HK_SUIRI_WORD.done;
        const ok = this.picked.size === 3;
        g.rect(cx, cy, this.colW, 19, ok ? UI.tapeOn : UI.tapeOff);
        g.text(label, cx + 26, cy + 1, { color: ok ? UI.text : UI.textDim });
        if (sel) drawCursor(g, cx - 4, cy + 1, this.t);
        continue;
      }
      const f = this.feats[i];
      const on = this.picked.has(f.id);
      if (sel) drawMarker(g, cx + 22, cy + 1, this.colW - 24, 16, Math.min(1, this.moveT / 70));
      g.text(f.label, cx + 26, cy + 1, { color: UI.text });
      // えらんだ 物に 朱の まる
      if (on) {
        g.ring(cx + 15, cy + 9, 6, UI.accent);
        g.ring(cx + 15, cy + 9, 5, UI.accent);
      } else g.ring(cx + 15, cy + 9, 5, UI.bg2);
      if (sel) drawCursor(g, cx - 4, cy + 1, this.t);
    }
  }
}
