// 脇芽は 朝に かく（第2章・任意のミニゲーム。02_ch2_index #73、docs/ideas/2026-09-30.md の4、
// 50 3.8・9.4・9.9・10.23、52 7.6、53 8.16）。
//
//   〔wakime〕 ペロ (3,32) の 頼み（1回。段階1〜2、トマトの 灯りを 持ってから、〔h1_1〕か
//     〔h2_1〕を 聞いた つぎの 1回）→ 1号ハウス map_hoshi_house1 の 株（どの 列でも）を
//     調べると ミニゲーム → 3株で 脇芽 9つ →〔end〕→ ペロに 話すと〔wakime_done〕と
//     朱肉 +2 → 3号ハウスの 作業日誌に 1行。
//
//   画面：株1本を 縦1画面で（主枝に 葉が 左右交互に 6枚、脇芽 3つ、花房 2つ。
//     src/art/props/wakime_art.ts）。トマトの 提灯の 光の 輪（↑↓で 主枝ぞいに 動く。
//     はなすと いちばん 近い 芽の 高さへ 寄る）の 中だけ、色と 細部が 見える。外は 夜の
//     4色で、脇芽と 花房の 見分けは つかない。輪の 中で いちばん 近い 物を しゅんの 指が さす。
//   かき方：決定を 押しつづけると 指が つまみ、芽が 横に しなる。戦闘の たたく輪
//     （party.ts ringStrike と 同じ 照準と ちぢむ 輪、速さ timingSlow、se_ring）が 照準へ
//     ちぢむ。重なった ところで はなすと「ぽきっ」。早い：「……しなった だけ。」（芽は もどる）。
//     遅い（押しつづけて 輪が 過ぎる）：「切り口が、ぎざぎざ。」（芽は 皮ごと 取れる）。
//     言葉は 戦闘の ハンコと 同じ「長押し！」→「はなす！」（けっていの ボタンにも）。
//     花房を かくと「あっ。……花だった。」
//   2株目：グソっ君が（隊列に いれば）1回 手伝う → 誘引ひもを のぼって、足で 脇芽 3つと 花 1つ。
//   操作：決定（長押し）と ↑↓ だけ。タッチは けってい か 絵を 押しても けってい。
//   iPad の 全画面：札と 数の 列は markText（ボタンが よける）、言葉は brief（薄く なる）。
//   軽さ：株と 背景は 株ごとに 1回 焼く。毎フレーム 合成するのは 灯りの 円（約95px 四方）だけ。
//
// QA：__game.cmd.wakime()（下の registerDebug を 見る）、jump('ch2:wakime')、
//   wakimeState()、wakimeText()（wrapCheck にも 入る）、wakimeSheet()。

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { makeCanvas, PixelCanvas } from '../../engine/pixel';
import { W } from '../../engine/screen';
import { markText } from '../../engine/textzones';
import { touchControlsOn } from '../../engine/touch';
import { animate, ease } from '../../engine/tween';
import { measure } from '../../engine/font';
import { Cues, cueSize } from '../../battle/ui/cue';
import { cueLettering } from '../../battle/art/stamps';
import { C } from '../../battle/ui/note';
import { timingSlow } from '../../battle/tsukkomi';
import { sfx } from '../../audio';
import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { ringImage } from '../../world/lantern';
import { charSprite } from '../../art/chars/registry';
import { drawTape, textW, UI } from '../../ui/window';
import { keyGuide } from '../stage';
import {
  BEND_FRAMES,
  cutImg,
  gizaImg,
  handImg,
  lightMask,
  plantDef,
  plantImgs,
  SCN_H,
  stemX,
  targetImg,
  targetOrigin,
  wakimeSheet,
  type TargetDef,
} from '../../art/props/wakime_art';
import {
  WAKIME_AFTER,
  WAKIME_ASK,
  WAKIME_END,
  WAKIME_HANA,
  WAKIME_KANENARI_A,
  WAKIME_KANENARI_B,
  WAKIME_KANENARI_NARR,
  WAKIME_PAGES,
  WAKIME_REPORT,
  WAKIME_REWARD,
  WAKIME_START,
  WAKIME_WORD,
  wakimeNisshi,
} from '../../data/text/hoshi_wakime';
import { HOSHI_OBJ } from '../../data/text/hoshi_objects';
import { hStage, lanternOn, pickHText, say } from './common';

// ---------------------------------------------------------------- flags (50 11.8)

export const WF = {
  /** ペロに 頼まれた（〔wakime〕を 聞いた）。 */
  ask: 'flag_ch2_wakime_ask',
  /** 9つ かき終えた（〔end〕まで）。 */
  done: 'flag_ch2_wakime_done',
  /** ペロに 知らせた（〔wakime_done〕と 朱肉 +2。日誌の 1行が ふえる）。 */
  report: 'flag_ch2_wakime_report',
  /** グソっ君が かいた 花（0/1）。 */
  hanaKane: 'flag_ch2_wakime_hana',
  /** しゅんが かいて しまった 花の 数。 */
  hanaShun: 'flag_ch2_wakime_hana_shun',
  /** きれいに「ぽきっ」と かけた 数（しゅんの 分）。 */
  poki: 'flag_ch2_wakime_poki',
};

const PLANTS = 3;
const BUDS = 9;
const FRAME = 1000 / 60;

// the timing ring (frames of the battle's ringStrike): it shows after LEAD, reaches the sight after LEAD + SHRINK
const LEAD = 6;
const SHRINK = 32;
const RING_R0 = 40;
const SIGHT_R = 10;

// the lantern's disc (52 8.5 breathes ±3px at 0.8 Hz; this close it is ±2)
const LIGHT_R = 46;
const LIGHT_MIN_Y = 26;
const LIGHT_MAX_Y = 196;
/** px per second while ↑ / ↓ is held. */
const LIGHT_SPEED = 120;
/** Something is under the finger when its middle is this near the light's height. */
const SEL_DY = 16;

type TState = 'on' | 'gone' | 'giza';
type Result = 'good' | 'early' | 'late';

interface Word {
  text: string;
  x: number;
  y: number;
  t: number;
  ms: number;
  /** 'poki': the big lettering (ぽきっ); 'cap': a caption in plain letters. */
  kind: 'poki' | 'cap';
  scale: number;
}

interface Fall {
  t: TargetDef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}

interface Mark {
  t: TargetDef;
  kind: 'cut' | 'giza';
}

/** The light's composite canvas (the disc and its rim), reused every frame. */
let lcCanvas: HTMLCanvasElement | null = null;
let lcCtx: CanvasRenderingContext2D | null = null;
function lc(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  if (!lcCanvas) [lcCanvas, lcCtx] = makeCanvas((LIGHT_R + 3) * 2 + 1, (LIGHT_R + 3) * 2 + 1);
  return [lcCanvas, lcCtx!];
}

const iconCache = new Map<string, HTMLCanvasElement>();
/** The row of nine at the top right: a taken shoot is a green sprout, one to go is its outline (8×10). */
function budIcon(done: boolean): HTMLCanvasElement {
  const key = done ? 'done' : 'todo';
  const hit = iconCache.get(key);
  if (hit) return hit;
  const p = new PixelCanvas(8, 10);
  if (done) {
    p.vline(3, 3, 9, '#8CC47A');
    p.rect(0, 1, 3, 3, '#9BCB6B');
    p.rect(4, 0, 3, 3, '#C9E08A');
    p.set(1, 2, '#C9E08A');
    p.set(5, 1, '#FFF6D8');
    p.outline('#1E3A2C');
  } else {
    // one still to go: the same sprout, a dim shape on the night
    p.vline(3, 3, 9, '#4A4670');
    p.rect(0, 1, 3, 3, '#4A4670');
    p.rect(4, 0, 3, 3, '#4A4670');
    p.outline('#26244A');
  }
  const c = p.toCanvas();
  iconCache.set(key, c);
  return c;
}

// ---------------------------------------------------------------- the panel (a full-screen widget)

export class WakimePanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  /** The plant shown (0..2), and the one sliding out (−1: none). */
  n = 0;
  from = -1;
  /** px: where the plant n is drawn (the one sliding out is one screen to the left). */
  slide = 0;
  /** Per plant, per target: still on, taken clean, torn. */
  st: TState[][] = [];
  marks: Mark[][] = [];
  // the light
  ly = 150;
  lightK = 0;
  canMove = false;
  moving = false;
  /** QA auto: where the light is heading. */
  goalY: number | null = null;
  sel: TargetDef | null = null;
  // the finger
  hx = 0;
  hy = 0;
  handA = 0;
  pinch = false;
  // the shoot being bent (bend 0..1), and the one springing back
  bendT: TargetDef | null = null;
  bend = 0;
  spring: { t: TargetDef; b0: number; age: number } | null = null;
  // the timing ring at the finger
  ring = { on: false, r: RING_R0, a: 0, good: false, gray: false, fade: -1 };
  cues = new Cues();
  words: Word[] = [];
  falls: Fall[] = [];
  /** グソっ君 climbing the string (2株目): his middle's y, or null. */
  kane: { y: number } | null = null;
  // the count
  cut = 0;
  poki = 0;
  hanaShun = 0;
  hanaKane = 0;
  /** Cuts tried (the first is slower, like the first hanko). */
  tries = 0;
  /** QA: the cuts play themselves (always a clean ぽきっ). */
  auto = false;
  /** The end: the finger stays up where it is, green to the tips (〔end〕). */
  endHand = false;
  // input (captured by update, taken by the script)
  private eConfirm = false;
  hold = false;
  private up = false;
  private down = false;

  constructor() {
    for (let n = 0; n < PLANTS; n++) {
      this.st.push(plantDef(n).targets.map(() => 'on'));
      this.marks.push([]);
    }
  }

  get def() {
    return plantDef(this.n);
  }

  /** Shoots still on the plant shown. */
  budsLeft(): number {
    return this.def.targets.filter((t) => t.kind === 'me' && this.st[this.n][t.i] === 'on').length;
  }

  take(): boolean {
    const v = this.eConfirm;
    this.eConfirm = false;
    return v;
  }
  clearInput(): void {
    this.eConfirm = false;
  }

  /** The lantern's radius now (breathing). */
  radius(): number {
    return LIGHT_R + Math.round(2 * Math.sin(this.t * 0.0008 * Math.PI * 2));
  }

  lightX(): number {
    return stemX(this.ly, this.def.seed) + Math.round(this.slide);
  }

  /** Where the finger takes a target (its bent middle for a shoot, the stalk for a truss). */
  grabAt(t: TargetDef, b = 0): [number, number] {
    if (t.kind === 'hana') {
      const a = t.side * b * 0.5;
      const dx = t.side * 9;
      return [t.bx + Math.round(dx * Math.cos(a)), t.by + Math.round(Math.abs(dx) * Math.sin(Math.abs(a)))];
    }
    const a = t.side * b * 0.7;
    const dx = t.cx - t.bx;
    const dy = t.cy - t.by;
    return [t.bx + Math.round(dx * Math.cos(a) - dy * Math.sin(a)), t.by + Math.round(dx * Math.sin(a) + dy * Math.cos(a))];
  }

  bendOf(t: TargetDef): number {
    if (this.bendT === t) return this.bend;
    if (this.spring && this.spring.t === t) {
      const s = this.spring;
      const k = Math.min(1, s.age / 360);
      return Math.max(0, s.b0 * (1 - ease.cubicOut(k)) + s.b0 * 0.3 * Math.sin(k * Math.PI * 3) * (1 - k));
    }
    return 0;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (input.pressed('confirm')) this.eConfirm = true;
    this.hold = input.down('confirm');
    this.up = input.down('up');
    this.down = input.down('down');
    this.cues.update(dt);
    this.words = this.words.filter((w) => (w.t += dt) < w.ms);
    for (const f of this.falls) {
      f.age += dt;
      f.vy += (520 * dt) / 1000;
      f.x += (f.vx * dt) / 1000;
      f.y += (f.vy * dt) / 1000;
    }
    this.falls = this.falls.filter((f) => f.age < 900 && f.y < SCN_H + 40);
    if (this.spring) {
      this.spring.age += dt;
      if (this.spring.age > 360) this.spring = null;
    }
    if (this.ring.fade >= 0) {
      this.ring.fade += dt;
      this.ring.a = Math.max(0, 1 - this.ring.fade / 220);
      if (this.ring.fade > 220) {
        this.ring.on = false;
        this.ring.fade = -1;
      }
    }
    // the light
    if (this.canMove) {
      let v = (this.down ? 1 : 0) - (this.up ? 1 : 0);
      if (this.auto && this.goalY !== null) v = Math.abs(this.goalY - this.ly) < 1.5 ? 0 : Math.sign(this.goalY - this.ly);
      this.moving = v !== 0;
      if (v) this.ly = Math.max(LIGHT_MIN_Y, Math.min(LIGHT_MAX_Y, this.ly + (v * LIGHT_SPEED * dt) / 1000));
      // what is under the finger: the nearest by height (the one held stays unless another is clearly nearer)
      let best: TargetDef | null = null;
      let bd = SEL_DY + 1;
      for (const t of this.def.targets) {
        if (this.st[this.n][t.i] !== 'on') continue;
        const d = Math.abs(t.cy - this.ly) - (t === this.sel ? 3 : 0);
        if (d < bd) {
          bd = d;
          best = t;
        }
      }
      this.sel = best;
      // let go of ↑↓: the light settles on the height of what it found
      if (!this.moving && this.sel) this.ly += (this.sel.cy - this.ly) * Math.min(1, dt / 90);
    } else if (this.kane) {
      this.ly = Math.max(LIGHT_MIN_Y, Math.min(LIGHT_MAX_Y, this.kane.y - 6));
    }
    // the finger follows what it points at
    const t = this.bendT ?? (this.canMove ? this.sel : null);
    if (this.endHand) this.handA = Math.min(1, this.handA + dt / 200);
    else if (t) {
      const [gx, gy] = this.grabAt(t, this.bendOf(t));
      const x = gx + Math.round(this.slide);
      if (this.handA <= 0) {
        this.hx = x;
        this.hy = gy;
      }
      this.hx += (x - this.hx) * Math.min(1, dt / 60);
      this.hy += (gy - this.hy) * Math.min(1, dt / 60);
      this.handA = Math.min(1, this.handA + dt / 120);
    } else this.handA = Math.max(0, this.handA - dt / 120);
  }

  // ---------------------------------------------------------------- drawing

  draw(g: Gfx): void {
    const ox = Math.round(this.slide);
    // the plants: dark (the lantern shows the one in front)
    if (this.from >= 0) this.drawDark(g, this.from, ox - W);
    this.drawDark(g, this.n, ox);
    for (const f of this.falls) this.drawFall(g, f, ox, false);
    if (this.lightK > 0) this.drawLight(g, ox);
    // グソっ君 on the string
    if (this.kane) this.drawKane(g, ox);
    // the finger and the ring
    if (this.handA > 0) {
      const side = (this.bendT ?? this.sel)?.side ?? 1;
      const img = handImg(this.pinch ? 'pinch' : 'point', side, this.cut / BUDS);
      const x = side > 0 ? this.hx + 2 : this.hx - 2 - (img.width - 1);
      g.img(img, x, this.hy - 5, { alpha: this.handA });
    }
    if (this.ring.on && this.bendT) this.drawRing(g);
    this.drawHud(g);
    this.drawWords(g);
    this.cues.draw(g, this.t);
  }

  private drawDark(g: Gfx, n: number, ox: number): void {
    if (ox <= -W || ox >= W) return;
    g.img(plantImgs(n).dark, ox, 0);
    const d = plantDef(n);
    for (const t of d.targets) {
      if (this.st[n][t.i] !== 'on') continue;
      const f = n === this.n ? Math.round(this.bendOf(t) * (BEND_FRAMES - 1)) : 0;
      const [x, y] = targetOrigin(t);
      g.img(targetImg(t, f, false), x + ox, y);
    }
  }

  private drawFall(g: Gfx, f: Fall, ox: number, lit: boolean, into?: CanvasRenderingContext2D, dx = 0, dy = 0): void {
    const [x, y] = targetOrigin(f.t);
    const img = targetImg(f.t, BEND_FRAMES - 1, lit);
    const a = f.age < 450 ? 1 : Math.max(0, 1 - (f.age - 450) / 450);
    if (into) {
      into.globalAlpha = a;
      into.drawImage(img, Math.round(x + f.x + ox - dx), Math.round(y + f.y - dy));
      into.globalAlpha = 1;
    } else g.img(img, x + f.x + ox, y + f.y, { alpha: a });
  }

  /** The lantern: the lit plant inside a dithered disc, and its warmth over it. */
  private drawLight(g: Gfx, ox: number): void {
    const r = this.radius();
    const S = r * 2 + 1;
    const cx = this.lightX();
    const cy = Math.round(this.ly);
    const x0 = cx - r;
    const y0 = cy - r;
    const [c, ctx] = lc();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(plantImgs(this.n).lit, ox - x0, -y0);
    const d = this.def;
    for (const t of d.targets) {
      const s = this.st[this.n][t.i];
      const [x, y] = targetOrigin(t);
      if (s === 'on') ctx.drawImage(targetImg(t, Math.round(this.bendOf(t) * (BEND_FRAMES - 1)), true), x + ox - x0, y - y0);
    }
    for (const m of this.marks[this.n]) {
      if (m.kind === 'cut') {
        const im = cutImg();
        ctx.drawImage(im, m.t.bx + m.t.side + ox - x0 - 2, m.t.by - y0 - 2);
      } else {
        const im = gizaImg(m.t.side);
        ctx.drawImage(im, m.t.side > 0 ? m.t.bx + ox - x0 - 3 : m.t.bx + ox - x0 - (im.width - 4), m.t.by - y0 - 3);
      }
    }
    for (const f of this.falls) this.drawFall(g, f, ox, true, ctx, x0, y0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(lightMask(r), 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    g.img(c, x0, y0, { sw: S, sh: S, alpha: this.lightK });
    g.img(ringImage(r, 'room'), x0, y0, { alpha: this.lightK });
  }

  private drawKane(g: Gfx, ox: number): void {
    const k = this.kane!;
    const spr = charSprite('kanenari');
    const frames = spr.walk.up;
    const img = frames[Math.floor(this.t / 70) % frames.length];
    const s = 2;
    const x = stemX(k.y, this.def.seed) + ox - Math.round((img.width * s) / 2);
    g.img(img, x, Math.round(k.y - (img.height * s) / 2), { scale: s });
  }

  /** The battle's たたく ring (party.ts ringStrike): the vermilion sight at the finger, the white ring closing on it. */
  private drawRing(g: Gfx): void {
    const x = Math.round(this.hx);
    const y = Math.round(this.hy);
    const st = this.ring;
    g.alpha(st.a, () => {
      const sc = st.good ? C.gold : C.shu;
      g.ring(x, y, SIGHT_R, sc);
      g.rect(x - 1, y - 14, 2, 3, sc);
      g.rect(x - 1, y + 12, 2, 3, sc);
      g.rect(x - 14, y - 1, 3, 2, sc);
      g.rect(x + 12, y - 1, 3, 2, sc);
      if (st.good) {
        g.ring(x, y, SIGHT_R - 1, '#FFF6D8');
        g.ring(x, y, SIGHT_R + 1, C.gold);
      }
      if (st.fade < 0) {
        const r = Math.round(st.r);
        const col = st.gray ? '#9AA0A8' : C.white;
        g.ring(x, y, r + 2, C.ink);
        g.ring(x, y, r + 1, col);
        g.ring(x, y, r, col);
      }
    });
  }

  private drawHud(g: Gfx): void {
    const text = WAKIME_WORD.kabu(this.n + 1);
    const tw = textW(text) + 16;
    const tx = W - tw - 8;
    const ty = 6;
    drawTape(g, tx, ty, tw, 16, text, { seed: 4 });
    markText(tx, ty, tw, 16);
    const iw = 8;
    const gap = 2;
    const rowW = BUDS * iw + (BUDS - 1) * gap;
    const x0 = W - 8 - rowW;
    const y0 = 26;
    for (let i = 0; i < BUDS; i++) g.img(budIcon(i < this.cut), x0 + i * (iw + gap), y0);
    markText(x0, y0, rowW, 10);
  }

  private drawWords(g: Gfx): void {
    for (const w of this.words) {
      const p = w.t / w.ms;
      const al = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
      const rise = Math.round(ease.cubicOut(Math.min(1, p * 1.6)) * 8);
      if (w.kind === 'poki') {
        const img = cueLettering(w.text, 'go', w.scale);
        const k = w.t < 110 ? 1.3 - 0.3 * ease.quadOut(w.t / 110) : 1;
        const ww = Math.round(img.width * k);
        const hh = Math.round(img.height * k);
        const x = Math.round(w.x - ww / 2);
        const y = Math.round(w.y - rise - hh / 2);
        markText(w.x - img.width * 0.65, w.y - rise - img.height * 0.65, img.width * 1.3, img.height * 1.3, true);
        g.alpha(al, () => g.ctx.drawImage(img, x, y, ww, hh));
      } else {
        const tw = measure(w.text);
        const x = Math.max(8 + tw / 2, Math.min(W - 8 - tw / 2, w.x));
        const y = Math.round(w.y - rise);
        g.text(w.text, Math.round(x), y, { color: UI.cream, outline: UI.border, align: 'center', alpha: al });
        markText(x - tw / 2 - 2, y - 1, tw + 4, 18, true);
      }
    }
  }

  // ---------------------------------------------------------------- small actions

  word(text: string, x: number, y: number, kind: Word['kind'], ms = 900, scale = 2): void {
    this.words.push({ text, x, y, t: 0, ms, kind, scale });
  }

  /** A target comes off: it falls away (a little out, then down) and leaves its mark. */
  takeOff(t: TargetDef, how: 'cut' | 'giza' | 'gone'): void {
    this.st[this.n][t.i] = how === 'giza' ? 'giza' : 'gone';
    if (how !== 'gone') this.marks[this.n].push({ t, kind: how });
    this.falls.push({ t, x: 0, y: 0, vx: t.side * (30 + Math.random() * 20), vy: -40, age: 0 });
  }

  /** The words beside the finger: 「長押し！」 before and while holding, 「はなす！」 in the ring's window. */
  holdCue(phase: 'wait' | 'hold' | 'zone'): void {
    const text = phase === 'zone' ? WAKIME_WORD.release : WAKIME_WORD.hold;
    const { w, h } = cueSize(text, 1);
    const t = this.bendT ?? this.sel;
    const side = t?.side ?? 1;
    let x = Math.round(this.hx) + side * 24;
    let align: 'left' | 'right' = side > 0 ? 'left' : 'right';
    if (align === 'left' && x + w > W - 4) {
      x = Math.round(this.hx) - 24;
      align = 'right';
    } else if (align === 'right' && x - w < 4) {
      x = Math.round(this.hx) + 24;
      align = 'left';
    }
    this.cues.set('hold', text, {
      x,
      y: Math.round(this.hy - h / 2),
      align,
      tone: phase === 'zone' ? 'go' : 'hold',
      mode: phase === 'wait' ? 'beat' : phase === 'zone' ? 'flash' : 'still',
      scale: 1,
      button: phase === 'zone' ? 'はなす！' : '長押し',
    });
  }
}

// ---------------------------------------------------------------- one cut

/**
 * Hold on the finger's target: the shoot bends, the ring closes on the sight.
 * Let go in the window: good (ぽきっ). Before it: early (it only bent). Held
 * past it: late (it tears off). (party.ts ringStrike's frames and windows,
 * held like holdStamp; the first cut runs slower, like the first hanko.)
 */
function* cutOnce(p: WakimePanel, t: TargetDef): Co<Result> {
  const slow = timingSlow() / (p.tries === 0 ? 0.7 : 1);
  const win = flag('flag_opt_tsukkomi_wide') ? 5 : 3;
  const hitF = LEAD + SHRINK;
  p.tries++;
  p.bendT = t;
  p.bend = 0;
  p.pinch = true;
  p.ring = { on: false, r: RING_R0, a: 0, good: false, gray: false, fade: -1 };
  sfx('se_wakime_bend');
  let f = 0;
  let sub = 0;
  let lastF = -1;
  let result: Result = 'late';
  for (;;) {
    const fresh = f !== lastF;
    lastF = f;
    if (fresh && f === LEAD) sfx('se_ring', { dur: Math.round(SHRINK * FRAME * slow) });
    const ff = f + sub;
    p.bend = Math.min(1, ff / hitF);
    if (f >= LEAD) {
      p.ring.on = true;
      p.ring.a = Math.min(1, (ff - LEAD + 1) / 4);
      p.ring.r = f >= hitF ? SIGHT_R : RING_R0 - (RING_R0 - SIGHT_R) * Math.min(1, (ff - LEAD) / SHRINK);
    }
    p.holdCue(f >= hitF - win ? 'zone' : 'hold');
    const held = p.auto ? f < hitF : p.hold;
    if (!held) {
      result = f < hitF - win ? 'early' : 'good';
      break;
    }
    if (f > hitF + win) {
      result = 'late';
      break;
    }
    yield null;
    sub += 1 / slow;
    if (sub >= 1) {
      sub -= 1;
      f++;
    }
  }
  p.cues.drop('hold', result === 'good' ? 'go' : 'off');
  p.ring.good = result === 'good';
  p.ring.gray = result === 'early';
  p.ring.fade = 0;
  return result;
}

/** What follows a cut: ぽきっ / しなった だけ / ぎざぎざ, or the flower. */
function* afterCut(p: WakimePanel, t: TargetDef, r: Result): Co {
  const b = p.bend;
  const [gx, gy] = p.grabAt(t, b);
  const x = gx + Math.round(p.slide);
  p.bendT = null;
  p.bend = 0;
  p.pinch = false;
  if (r === 'early') {
    p.spring = { t, b0: b, age: 0 };
    sfx('se_wakime_shinari');
    p.word(WAKIME_WORD.early, x, gy - 26, 'cap', 1300);
    yield 200;
    return;
  }
  if (t.kind === 'hana') {
    p.takeOff(t, 'gone');
    p.hanaShun++;
    sfx('se_wakime_hana');
    yield 420;
    yield* runMsg(WAKIME_HANA);
    p.clearInput();
    return;
  }
  p.cut++;
  if (r === 'good') {
    p.poki++;
    p.takeOff(t, 'cut');
    sfx('se_wakime_poki');
    p.word(WAKIME_WORD.poki, x, gy - 20, 'poki', 800);
    yield 260;
  } else {
    p.takeOff(t, 'giza');
    sfx('se_wakime_giza');
    p.word(WAKIME_WORD.late, x, gy - 26, 'cap', 1400);
    yield 420;
  }
}

// ---------------------------------------------------------------- one plant

function* playPlant(p: WakimePanel): Co {
  yield* animate(200, (k) => (p.lightK = k));
  p.canMove = true;
  while (p.budsLeft() > 0) {
    // wait for a fresh press with something under the finger
    p.clearInput();
    let settle = 0;
    for (;;) {
      if (p.auto) {
        const next = p.def.targets.find((t) => t.kind === 'me' && p.st[p.n][t.i] === 'on');
        p.goalY = next ? next.cy : null;
        if (next && p.sel === next && Math.abs(p.ly - next.cy) < 2) {
          settle += FRAME;
          if (settle > 300) break;
        } else settle = 0;
      } else {
        if (p.sel && !p.moving) p.holdCue('wait');
        else p.cues.drop('hold');
        if (p.take() && p.sel) break;
      }
      yield null;
    }
    const t = p.sel!;
    p.canMove = false;
    const r = yield* cutOnce(p, t);
    yield* afterCut(p, t, r);
    p.canMove = true;
  }
  p.cues.drop('hold');
  p.canMove = false;
  yield 380;
}

/** To the next plant in the row: the light goes out, the row slides left, the light comes back at the foot. */
function* nextPlant(p: WakimePanel, n: number): Co {
  p.canMove = false;
  p.sel = null;
  yield* animate(160, (k) => (p.lightK = 1 - k));
  sfx('se_wakime_open');
  p.from = p.n;
  p.n = n;
  p.slide = W;
  yield* animate(560, (k) => (p.slide = Math.round(W * (1 - ease.cubicInOut(k)))));
  p.slide = 0;
  p.from = -1;
  p.falls = [];
  p.ly = 150;
}

/** 2株目, once: グソっ君 climbs the string and his many small legs take everything in reach. */
function* kanenariHelps(p: WakimePanel): Co {
  yield* animate(200, (k) => (p.lightK = k));
  yield* runMsg(WAKIME_KANENARI_A);
  const d = p.def;
  const buds = d.targets.filter((t) => t.kind === 'me' && p.st[p.n][t.i] === 'on');
  const hana = d.targets.find((t) => t.kind === 'hana' && t.truss === 'fruit') ?? d.targets.find((t) => t.kind === 'hana');
  const hits = [...buds, ...(hana ? [hana] : [])].sort((a, b) => b.cy - a.cy);
  sfx('se_wakime_legs');
  const y0 = SCN_H + 30;
  const y1 = 14;
  p.kane = { y: y0 };
  const ms = 1500;
  let i = 0;
  for (let t = 0; t <= ms; t += FRAME) {
    p.kane.y = y0 + (y1 - y0) * (t / ms);
    while (i < hits.length && p.kane.y - 12 <= hits[i].cy) {
      const h = hits[i++];
      const [gx, gy] = p.grabAt(h);
      if (h.kind === 'hana') {
        p.takeOff(h, 'gone');
        p.hanaKane++;
        sfx('se_wakime_hana');
      } else {
        p.takeOff(h, 'cut');
        p.cut++;
        sfx('se_wakime_poki', { pitch: 1.1 + i * 0.05 });
        p.word(WAKIME_WORD.poki, gx, gy - 16, 'poki', 600, 1);
      }
    }
    yield null;
  }
  // and down again, out of sight; the light comes back to the middle of the plant
  yield* animate(300, (k) => (p.kane!.y = y1 + (y0 + 40 - y1) * k * k));
  p.kane = null;
  const ly0 = p.ly;
  yield* animate(400, (k) => (p.ly = ly0 + (110 - ly0) * ease.cubicOut(k)));
  yield 200;
  yield* runMsg(WAKIME_KANENARI_NARR);
  yield* runMsg(WAKIME_KANENARI_B);
  p.clearInput();
}

function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower?.visible && state.party.some((m) => m.id === 'kanenari');
}

let qaAuto = false;
let qaFrom = 0;

/** The whole minigame, from the plant's page to the green fingers. */
export function* wakimeSession(): Co {
  const p = new WakimePanel();
  p.auto = qaAuto;
  const start = Math.max(0, Math.min(PLANTS - 1, qaFrom));
  // QA: start from a later plant (the ones before it done)
  for (let n = 0; n < start; n++) {
    for (const t of plantDef(n).targets) if (t.kind === 'me') p.st[n][t.i] = 'gone';
    p.cut += 3;
  }
  p.n = start;
  p.ly = 150;
  yield* game.fadeOut(260);
  game.ui.push(p);
  sfx('se_wakime_open');
  yield* game.fadeIn(260);
  try {
    if (!p.auto && !flag(WF.poki) && !flag(WF.done))
      keyGuide(
        [
          [['up', 'down'], WAKIME_WORD.move],
          [[touchControlsOn() ? 'けってい' : 'Z'], WAKIME_WORD.kaku],
        ],
        5200,
        8,
      );
    for (let n = start; n < PLANTS; n++) {
      if (n > start) yield* nextPlant(p, n);
      if (n === 1 && kanenariHere()) yield* kanenariHelps(p);
      yield* playPlant(p);
    }
    yield 300;
    // the fingers, green to the tips, up in the light where the last one came off
    p.hx = p.lightX() + 30;
    p.hy = Math.round(p.ly) + 6;
    p.endHand = true;
    yield 500;
    yield* runMsg(WAKIME_END);
    setFlag(WF.done, 1);
    setFlag(WF.poki, p.poki);
    setFlag(WF.hanaKane, p.hanaKane);
    setFlag(WF.hanaShun, p.hanaShun);
    yield* game.fadeOut(260);
    p.cues.clear();
    p.done = true;
    game.ui.remove(p);
    yield* game.fadeIn(260);
  } finally {
    // (a jump in QA may cut the scene: the screen must not stay)
    if (!p.done) {
      p.cues.clear();
      p.done = true;
      game.ui.remove(p);
    }
  }
}

// ---------------------------------------------------------------- the plants of 1号ハウス

function* plantScript(ctx: { runDefault(): Co }): Co {
  if (flag(WF.done)) {
    sfx('se_examine');
    yield* runMsg(WAKIME_AFTER);
    return;
  }
  if (!flag(WF.ask)) {
    yield* ctx.runDefault();
    return;
  }
  sfx('se_examine');
  yield* runMsg(WAKIME_START);
  yield* wakimeSession();
}
for (const id of ['obj_hr_h1_aotomato', 'obj_hr_h1_aotomato_1', 'obj_hr_h1_aotomato_2', 'obj_hr_h1_aotomato_3']) registerScript(id, plantScript);

// ---------------------------------------------------------------- ペロ (npcs.ts asks here first)

/**
 * ペロ's side of it, before his stage lines: 〔wakime〕 (once, stage 1–2 with
 * the lantern, the talk after 〔h1_1〕 or 〔h2_1〕), then after the nine
 * 〔wakime_done〕 and 朱肉 +2. True when one was said.
 */
export function* wakimeAtMitsu(): Co<boolean> {
  if (flag(WF.done) && !flag(WF.report)) {
    setFlag(WF.report, 1);
    yield* say(WAKIME_REPORT);
    const m = state.party.find((x) => x.id === 'minato');
    if (m) m.mp = Math.min(m.maxMp, m.mp + 2);
    sfx('se_item');
    yield* say(WAKIME_REWARD);
    return true;
  }
  const s = hStage();
  const heard = flag('flag_seen_npc_hoshi_mitsu_h1_1') || flag('flag_seen_npc_hoshi_mitsu_h2_1');
  if (!flag(WF.ask) && s >= 1 && s <= 2 && lanternOn() && heard) {
    setFlag(WF.ask, 1);
    yield* say(WAKIME_ASK);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------- 3号ハウスの 作業日誌

/** After ペロ was told: the diary's usual page, then its new last line (one block). */
registerScript('obj_hoshi_nisshi', function* (ctx): Co {
  const own = pickHText(HOSHI_OBJ.obj_hoshi_nisshi as string | Record<string, string> | undefined);
  if (!flag(WF.report) || !own) {
    yield* ctx.runDefault();
    return;
  }
  sfx('se_examine');
  setFlag('flag_seen_obj_hoshi_nisshi', 1);
  yield* runMsg(own + '\n/\n' + wakimeNisshi(flag(WF.hanaKane), flag(WF.hanaShun)).replace(/^@narr\n/, ''));
});

// ---------------------------------------------------------------- QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.wakime(step = 'play', o)
 *   'ask'     in front of ペロ (4,32), 〔h1_1〕 heard: the next talk is 〔wakime〕
 *   'play'    (default) in 1号ハウス beside the row (2,5), asked; the minigame starts.
 *             o.auto: it plays itself (clean ぽきっ each time); o.plant: start at plant 0–2
 *   'house'   in 1号ハウス beside the row, asked (examine the plant to start)
 *   'report'  the nine done: in front of ペロ (the next talk is 〔wakime_done〕)
 *   'nisshi'  told: in 3号ハウス at the diary (6,16) facing right. o.kane / o.shun: the flowers
 *   'reset'   the flags back to nothing
 */
registerDebug('wakime', (step = 'play', o: { auto?: boolean; plant?: number; kane?: number; shun?: number } = {}) => {
  const all = Object.values(WF);
  if (step === 'reset') {
    for (const f of all) setFlag(f, 0);
    return 'wakime: reset';
  }
  cmd().jump?.('ch2:gen', true);
  setFlag('flag_seen_npc_hoshi_mitsu_h1_1', 1);
  setFlag('flag_seen_npc_hoshi_mitsu_h1', 1);
  if (step === 'ask') {
    cmd().warp?.('map_hoshimidai', 4, 32, 'left');
    return 'wakime: talk to ペロ (Z)';
  }
  setFlag(WF.ask, 1);
  if (step === 'play' || step === 'house') {
    cmd().warp?.('map_hoshi_house1', 2, 5, 'right');
    if (step === 'house') return 'wakime: examine the plant (Z)';
    qaAuto = !!o.auto;
    qaFrom = o.plant ?? 0;
    field()?.startScript(
      (function* (): Co {
        yield 400;
        try {
          yield* wakimeSession();
        } finally {
          qaAuto = false;
          qaFrom = 0;
        }
      })(),
    );
    return `wakime: playing${o.auto ? ' (auto)' : ''}`;
  }
  setFlag(WF.done, 1);
  setFlag(WF.poki, 6);
  setFlag(WF.hanaKane, o.kane ?? 1);
  setFlag(WF.hanaShun, o.shun ?? 0);
  if (step === 'report') {
    cmd().warp?.('map_hoshimidai', 4, 32, 'left');
    return 'wakime: talk to ペロ (Z)';
  }
  setFlag(WF.report, 1);
  cmd().warp?.('map_hoshi_house', 6, 16, 'right');
  return 'wakime: examine the diary (Z)';
});

/** QA (tools/playthrough.mjs --side wakime): the next minigames play themselves (until wakimeAuto(false)). */
registerDebug('wakimeAuto', (on = true) => {
  qaAuto = !!on;
  return `wakime auto ${qaAuto}`;
});

/** QA: the minigame's state now (null when it is not up). */
registerDebug('wakimeState', () => {
  const p = game.ui.widgets.find((w) => w instanceof WakimePanel) as WakimePanel | undefined;
  if (!p) return null;
  return {
    plant: p.n,
    cut: p.cut,
    poki: p.poki,
    hanaShun: p.hanaShun,
    hanaKane: p.hanaKane,
    ly: Math.round(p.ly),
    sel: p.sel ? { i: p.sel.i, kind: p.sel.kind, cy: p.sel.cy } : null,
    bending: !!p.bendT,
    ring: p.ring.on ? Math.round(p.ring.r) : null,
    cues: p.cues.peek(),
    left: p.budsLeft(),
    kane: !!p.kane,
  };
});

/** QA: the targets of plant n (their kind and height), to aim with ↑↓ in a test. */
registerDebug('wakimeTargets', (n = 0) => plantDef(n).targets.map((t) => ({ i: t.i, kind: t.kind, side: t.side, cx: t.cx, cy: t.cy })));

/** QA: the shoots, the trusses, the finger and the marks (3×) as a PNG data URL. */
registerDebug('wakimeSheet', (scale = 3) => wakimeSheet(scale).toDataURL());

/**
 * QA (wrapCheck asks it too): the pages (3 lines × 336 px) and the words on
 * the screen (the tape, the captions: one line inside the screen's margins).
 */
export function wakimeTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const lineW = (l: string) => measure(l.replace(/\{[^}]*\}/g, ''));
  for (const [name, src] of Object.entries(WAKIME_PAGES)) {
    let lines: string[] = [];
    const flush = () => {
      if (!lines.length) return;
      pages++;
      if (lines.length > 3) bad.push(`${name}: ${lines.length} lines`);
      for (const l of lines) if (lineW(l) > 336) bad.push(`${name}: ${lineW(l)}px: ${l}`);
      lines = [];
    };
    for (const raw of src.split('\n')) {
      const t = raw.trim();
      if (t.startsWith('@') || t === '/') {
        flush();
        continue;
      }
      if (t) lines.push(raw);
    }
    flush();
  }
  const words: [string, string, number][] = [
    ['poki', WAKIME_WORD.poki, 200],
    ['early', WAKIME_WORD.early, 240],
    ['late', WAKIME_WORD.late, 240],
    ['hold', WAKIME_WORD.hold, 120],
    ['release', WAKIME_WORD.release, 120],
    ['kabu', WAKIME_WORD.kabu(3), 90],
    ['move', WAKIME_WORD.move, 200],
    ['kaku', WAKIME_WORD.kaku, 200],
  ];
  for (const [name, text, max] of words) {
    pages++;
    const w = textW(text);
    if (w > max || text.includes('\n')) bad.push(`word ${name}: ${w}px > ${max}: ${text}`);
  }
  return { pages, bad };
}
registerDebug('wakimeText', () => wakimeTextCheck());

