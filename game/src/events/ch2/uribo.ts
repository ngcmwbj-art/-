// うり坊を 数える 小窓（夜の 足あと帳の 名場面、02_ch2_index #87、50 10.28、52 7.10）。
//
// 電気柵の ゲートの 内側から、トマトの 灯りを 低く して 北を 見る（夜振りの 小窓と 同じ 窓、
// 328×116、画面の 上。会話の 窓は 下）。耕作放棄地の クズの 間から 親の イノシシが 出てきて、
// うり坊 5ひきが 1ぴきずつ ついて、柵の 向こうを 右から 左へ 歩く。灯りの 右の はしを
// 横切る ところで 決定（Z ／ けってい）を 押すと 1ぴき 数える。灯りの 外は 黒い 影だけ。
//   ・はしに いない ときに 押しても 数は ふえない（小さな「？」）。見のがした うり坊は 数えない。
//   ・5ひき 数えられなかったら、親子は 右の クズの 口へ もどって、もう 1回 通る（何度でも）。
//   ・1回目で ぴったり（はしの 外で 押さずに 5ひき）なら『数え名人』。
//   ・段階2：とちゅうで 防災無線の 呼び声。親子は 止まって、うり坊が 耳を 立てる（絵だけ）。
//   ・数えおわると、親は 柵の 前で 鼻を 1回 鳴らして、山の ほうへ 向きを 変え、クズの 奥へ。
//   ・さいごに 見回り帳の『きょうの 客』の カード（しゅんの 字、マサルの『よし』）。
// だれも 倒されない：柵の 内側から 見るだけ。
//
// QA：__game.cmd.uriboState()（ashiato.ts の __game.cmd.ashiato('uribo', stage, auto) から 開く）

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { markText } from '../../engine/textzones';
import { touchControlsOn } from '../../engine/touch';
import { animate, ease } from '../../engine/tween';
import { registerDebug } from '../../debug';
import { field } from '../../world/field';
import { playCall } from '../../world/hoshi';
import { sfx } from '../../audio';
import { drawTape, drawWindow, UI } from '../../ui/window';
import { CALL_NAMES, callLine } from '../../data/text/hoshi_npcs';
import { URIBO_UI } from '../../data/text/hoshi_ashiato';
import {
  UB_GROUND_Y,
  UB_H,
  UB_LIGHT,
  UB_W,
  boarPix,
  fencePix,
  lowLantern,
  uriboBg,
  uriboImg,
} from '../../art/props/ashiato_art';

const PX = 24;
const PY = 4;
const PW = UB_W + 8;
const PH = UB_H + 8;
const SX = PX + 4;
const SY = PY + 4;
/** 灯りの 右の はし：うり坊は ここを 横切る ときに 数える。 */
const EDGE_X = UB_LIGHT.x + UB_LIGHT.rx;
/** 数えられる はんい（はしの 右 8px から 左 16px）。 */
const BAND: [number, number] = [EDGE_X - 16, EDGE_X + 8];
/** 歩く 速さ（px/s）、うり坊の 間（px）。 */
const SPEED = 25;
const GAP = 24;
/** クズの 口（右）と、親が 止まる ところ（灯りの 左の はし の 内側）。 */
const GAP_X = 300;
const STOP_X = UB_LIGHT.x - UB_LIGHT.rx - 6;

interface Walker {
  x: number;
  /** 0 = 地面、1 = クズの 奥（山の ほうへ 帰る とき、上へ 小さく）。 */
  back: number;
  face: -1 | 1;
  f: number;
  moving: boolean;
  /** この 回に 数えた。 */
  counted: boolean;
  /** 見えている（クズの 奥へ 消えたら 0）。 */
  alpha: number;
}

type Phase = 'hide' | 'wait' | 'walk' | 'back' | 'home' | 'card';

export class UriboPanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  open = 0;
  phase: Phase = 'hide';
  mother: Walker = { x: GAP_X, back: 0, face: -1, f: 0, moving: false, counted: false, alpha: 0 };
  kids: Walker[] = [];
  /** この 回に 数えた 数（しゅんの 数）。 */
  tally = 0;
  /** はしの 外で 押した（この 回）。 */
  stray = 0;
  words: { text: string; x: number; y: number; t: number; ms: number }[] = [];
  /** 段階2の 呼び声で 止まって いる（ms）。 */
  callOn = 0;
  callDone = false;
  ears = false;
  /** 親が 鼻を 鳴らす（ms）。 */
  snort = 0;
  turned = false;
  auto = false;
  /** カード：書いた 字の 数（0..1）と『よし』。 */
  card = { k: 0, yoshi: 0, gu: false };
  private eConfirm = false;

  constructor(readonly stage: number) {
    for (let i = 0; i < 5; i++) this.kids.push({ x: GAP_X + 52 + i * GAP, back: 0, face: -1, f: 0, moving: false, counted: false, alpha: 0 });
  }

  take(): boolean {
    const v = this.eConfirm;
    this.eConfirm = false;
    return v;
  }
  clearInput(): void {
    this.eConfirm = false;
  }

  /** Is x inside the lowered light (on the ground strip)? */
  inLight(x: number): boolean {
    return Math.abs(x - UB_LIGHT.x) < UB_LIGHT.rx;
  }

  /** The kid now in the counting band, not counted yet. */
  countable(): Walker | null {
    for (const k of this.kids) if (!k.counted && k.alpha > 0.5 && k.x >= BAND[0] && k.x <= BAND[1]) return k;
    return null;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (input.pressed('confirm')) this.eConfirm = true;
    this.words = this.words.filter((w) => (w.t += dt) < w.ms);
    if (this.snort > 0) this.snort -= dt;
    const s = dt / 1000;
    // h2: the loudspeaker calls once while they walk — they stop, the little ones' ears go up
    if (this.callOn > 0) {
      this.callOn -= dt;
      if (this.callOn <= 0) this.ears = false;
      return;
    }
    const all = [this.mother, ...this.kids];
    if (this.phase === 'walk') {
      // the mother leads; each little one keeps its gap behind the one before
      const m = this.mother;
      const v = SPEED * s;
      m.face = -1;
      m.moving = Math.abs(m.x - STOP_X) > 0.5;
      if (m.moving) m.x -= Math.min(v, m.x - STOP_X);
      this.kids.forEach((k, i) => {
        k.face = -1;
        // (never backwards: one that is closer than its gap waits for it to open)
        const want = m.x + 24 + i * GAP;
        k.moving = k.x - want > 0.5;
        if (k.moving) k.x -= Math.min(v * 1.05, k.x - want);
        k.alpha = Math.min(1, k.alpha + s * 3);
      });
      m.alpha = Math.min(1, m.alpha + s * 3);
      if (this.stage >= 2 && !this.callDone && this.kids[1].x < EDGE_X - 22) {
        // a little after the second one has crossed: the call
        this.callDone = true;
        this.callOn = 2800;
        this.ears = true;
        for (const w of all) w.moving = false;
        const name = CALL_NAMES[Math.floor(Math.random() * CALL_NAMES.length)];
        game.scripts.run(playCall(callLine(name), { stage: 2, indoor: true }));
      }
    } else if (this.phase === 'back') {
      // back to the kuzu's mouth at a trot, into the dark (they will come again)
      for (const w of all) {
        w.face = 1;
        w.moving = true;
        w.x += SPEED * 3 * s;
        w.alpha = Math.max(0, w.alpha - s * 0.9);
      }
    } else if (this.phase === 'home') {
      // up into the kuzu, one after another, towards the mountain
      const m = this.mother;
      m.back = Math.min(1, m.back + s * 0.45);
      m.alpha = Math.max(0, 1 - Math.max(0, m.back - 0.55) * 2.2);
      m.moving = m.back < 1;
      this.kids.forEach((k, i) => {
        const go = this.t - this.homeT > 500 + i * 380;
        if (!go) return;
        k.back = Math.min(1, k.back + s * 0.55);
        k.alpha = Math.max(0, 1 - Math.max(0, k.back - 0.5) * 2.2);
        k.moving = k.back < 1;
      });
    }
    for (const w of all) if (w.moving) w.f = Math.floor((this.t + w.x * 9) / 180) % 2;
    // the little ones' small steps on the earth
    if ((this.phase === 'walk' || this.phase === 'back') && Math.floor(this.t / 260) !== Math.floor((this.t - dt) / 260) && this.kids.some((k) => k.moving))
      sfx('se_h_soil', { vol: 0.08, pitch: 1.6 + Math.random() * 0.3 });
  }

  homeT = 0;

  word(text: string, x: number, y: number, ms = 800): void {
    this.words.push({ text, x, y, t: 0, ms });
  }

  /** Start a run (right → left): the first from where they stand, a second one from the kuzu's mouth again. */
  startRun(again: boolean): void {
    this.tally = 0;
    this.stray = 0;
    if (again) {
      this.mother.x = GAP_X;
      this.kids.forEach((k, i) => (k.x = GAP_X + 20 + i * 14));
    }
    for (const k of this.kids) k.counted = false;
    this.phase = 'walk';
  }

  /** The run is over: the mother stands at the light's left edge and every little one has come up behind her. */
  runOver(): boolean {
    if (this.phase !== 'walk' || this.callOn > 0) return false;
    const m = this.mother;
    if (Math.abs(m.x - STOP_X) > 0.5) return false;
    return this.kids.every((k, i) => k.x - (m.x + 24 + i * GAP) <= 0.5);
  }

  // ---------------------------------------------------------------- drawing

  draw(g: Gfx): void {
    if (this.open <= 0) return;
    const k = ease.cubicOut(Math.min(1, this.open));
    const a = Math.min(1, this.open * 1.4);
    const dy = Math.round((1 - k) * -10);
    const sy = SY + dy;
    markText(PX, PY, PW, PH);
    drawWindow(g, PX, PY + dy, PW, PH, UI, a, { curl: false });
    g.alpha(a, () => {
      g.clip(SX, sy, UB_W, UB_H, () => {
        if (this.phase === 'card') this.drawCard(g, SX, sy);
        else this.drawScene(g, SX, sy);
      });
      this.drawTail(g, PY + dy + PH);
      if (this.phase !== 'card') {
        const name = URIBO_UI.place;
        const tw = g.measure(name) + 16;
        drawTape(g, SX + 8, PY + dy - 5, tw, 16, name, { seed: 17 });
        markText(SX + 8, PY + dy - 5, tw, 16);
        if (this.phase === 'walk' || this.tally > 0) {
          const bt = `${this.tally}${URIBO_UI.count}`;
          const bw = g.measure(bt) + 14;
          drawTape(g, SX + UB_W - bw - 6, PY + dy - 5, bw, 16, bt, { seed: 18, color: '#F6D98A' });
          markText(SX + UB_W - bw - 6, PY + dy - 5, bw, 16);
        }
      }
    });
    for (const w of this.words) {
      const p = w.t / w.ms;
      const yy = Math.round(sy + w.y - p * 6);
      const al = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
      g.text(w.text, SX + w.x, yy, { color: UI.bg, outline: UI.border, align: 'center', alpha: al });
      markText(SX + w.x - 20, yy, 40, 16, true);
    }
  }

  private drawTail(g: Gfx, bottom: number): void {
    const f = field();
    const tx = f ? f.worldToScreen(f.player.x, f.player.y - 24)[0] : 200;
    const x = Math.max(PX + 12, Math.min(PX + PW - 12, tx));
    for (let i = 0; i < 5; i++) {
      g.rect(x - 4 + i, bottom - 1 + i, 9 - i * 2, 1, UI.border);
      if (i < 4) g.rect(x - 3 + i, bottom - 2 + i, 7 - i * 2, 1, UI.bg);
    }
  }

  private drawScene(g: Gfx, ox: number, oy: number): void {
    const st = Math.min(2, Math.max(1, this.stage));
    const dark = uriboBg(st, false);
    const lit = uriboBg(st, true);
    g.img(dark, ox, oy);
    const t = this.t;
    const L = UB_LIGHT;
    const ctx = g.ctx;
    // ---- the light, held low: the lit picture inside its ellipse, row by row
    const breathe = Math.sin(t / 220) * 1.5;
    const rx = L.rx + breathe;
    const ry = L.ry + breathe * 0.4;
    for (let d = -Math.ceil(ry); d <= Math.ceil(ry); d++) {
      const yy = L.y + d;
      if (yy < 0 || yy >= UB_H) continue;
      const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (d * d) / (ry * ry))));
      if (half <= 0) continue;
      const x0 = Math.max(0, L.x - half);
      const x1 = Math.min(UB_W, L.x + half);
      ctx.drawImage(lit, x0, yy, x1 - x0, 1, ox + x0, oy + yy, x1 - x0, 1);
    }
    // its edge (dithered warm), and the right edge where they are counted: a few brighter ticks on the ground
    for (let a = 0; a < 120; a++) {
      const th = (a / 120) * Math.PI * 2;
      const ex = Math.round(L.x + Math.cos(th) * rx);
      const ey = Math.round(L.y + Math.sin(th) * ry);
      if (ey < 0 || ey >= UB_H) continue;
      if (a % 2) g.px(ox + ex, oy + ey, '#F2894B');
    }
    if (this.phase === 'walk')
      for (let y = UB_GROUND_Y - 6; y < UB_GROUND_Y + 4; y += 3) g.px(ox + EDGE_X, oy + y, Math.floor(t / 300) % 2 ? '#FFE7A3' : '#F2B070');
    // ---- the boars (dark shapes out of the light, their colour and a warm rim in it)
    const draws: { w: Walker; mother: boolean; i: number }[] = [{ w: this.mother, mother: true, i: -1 }, ...this.kids.map((w, i) => ({ w, mother: false, i }))];
    for (const d of draws) this.drawWalker(g, ox, oy, d.w, d.mother);
    // the snort: two little puffs at the snout
    if (this.snort > 0) {
      const m = this.mother;
      const k = 1 - this.snort / 600;
      const nx = Math.round(m.x - 16 - k * 6);
      const ny = UB_GROUND_Y - 5 - Math.round(k * 3);
      g.alpha(1 - k, () => {
        g.rect(ox + nx, oy + ny, 2, 1, '#E8E4D8');
        g.rect(ox + nx - 2, oy + ny + 2, 2, 1, '#E8E4D8');
      });
    }
    // ---- the fence in front (its wires shine inside the light)
    g.img(fencePix(false), ox, oy);
    g.ctx.save();
    g.ctx.beginPath();
    g.ctx.ellipse(ox + L.x, oy + L.y, rx, ry + 10, 0, 0, Math.PI * 2);
    g.ctx.clip();
    g.img(fencePix(true), ox, oy);
    g.ctx.restore();
    // ---- the tomato itself, low in Minato's hand at the bottom, its light going up a little
    g.img(lowLantern(), ox + L.x - 6, oy + UB_H - 13);
    g.alpha(0.1, () => {
      for (let y = UB_H - 14; y > L.y; y--) {
        const w = Math.round(6 + (UB_H - 14 - y) * 2.2);
        g.rect(ox + L.x - w, oy + y, w * 2, 1, '#FFB070');
      }
    });
    // h2 while the loudspeaker calls: the horn far off at the top right
    if (this.callOn > 0) {
      const hx = UB_W - 26;
      g.rect(ox + hx, oy + 8, 4, 3, '#8E88B8');
      g.rect(ox + hx + 4, oy + 6, 2, 7, '#8E88B8');
      for (let i = 0; i < 3; i++) if (Math.floor(t / 180 + i) % 3 === 0) g.rect(ox + hx + 8 + i * 3, oy + 7 - i, 1, 5 + i * 2, '#FFE7A3');
    }
  }

  private drawWalker(g: Gfx, ox: number, oy: number, w: Walker, mother: boolean): void {
    if (w.alpha <= 0) return;
    const lit = this.inLight(w.x) && w.back < 0.4;
    // going home: up the slope into the kuzu (smaller steps up, half hidden by the leaves)
    const up = Math.round(w.back * 18);
    const img = mother ? boarPix(w.f, lit, this.turned) : uriboImg(lit, w.f, this.ears);
    const flip = w.face > 0 && !(mother && this.turned);
    const x = Math.round(w.x - img.width / 2);
    const y = UB_GROUND_Y - img.height - up + (mother ? 1 : 0);
    const al = w.alpha * (lit ? 1 : 0.85);
    g.img(img, ox + x, oy + y, { flipX: flip, alpha: al });
  }

  // ---------------------------------------------------------------- the card (見回り帳の『きょうの 客』)

  private drawCard(g: Gfx, ox: number, oy: number): void {
    g.rect(ox, oy, UB_W, UB_H, UI.bg);
    // the ruled page of the patrol book
    for (let y = 30; y < UB_H; y += 20) g.rect(ox + 6, oy + y, UB_W - 12, 1, UI.bg2);
    g.rect(ox + 30, oy, 1, UB_H, UI.margin, 0.45);
    g.text(`『${URIBO_UI.card.title}』`, ox + 40, oy + 8, { color: UI.text });
    // しゅんの 字（鉛筆）：書いた ぶんだけ
    const lines = this.cardLines();
    const total = lines.reduce((a, l) => a + l.length, 0);
    let left = Math.floor(total * this.card.k);
    lines.forEach((l, i) => {
      const s = l.slice(0, Math.max(0, Math.min(l.length, left)));
      left -= l.length;
      if (s) g.text(s, ox + 44, oy + 34 + i * 20, { color: UI.pencil });
    });
    // マサルの 太い 字『よし』
    if (this.card.yoshi > 0) {
      const k = Math.min(1, this.card.yoshi);
      const yx = ox + UB_W - 70;
      const yy = oy + 74;
      g.alpha(k, () => {
        for (const [dx, dyy] of [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ])
          g.text(`『${URIBO_UI.card.yoshi}』`, yx + dx, yy + dyy, { color: UI.text });
      });
      markText(yx, yy, 66, 18);
    }
  }

  cardLines(): string[] {
    return ['イ 1　うり坊 5　ハ 1　タ 1', `シ 1　ウ 1　犬 1${this.card.gu ? '　グ 1' : ''}`];
  }
}

// ---------------------------------------------------------------- the session (ashiato.ts runs the words between)

export function* openUribo(stage: number, auto = false): Co<UriboPanel> {
  const p = new UriboPanel(stage);
  p.auto = auto;
  game.ui.push(p);
  sfx('se_tsuri_open');
  yield* animate(200, (k) => (p.open = k), ease.linear);
  p.open = 1;
  p.clearInput();
  return p;
}

export function* closeUribo(p: UriboPanel): Co {
  if (p.done) return;
  yield* animate(180, (k) => (p.open = 1 - k), ease.linear);
  p.done = true;
  game.ui.remove(p);
}

/** The mother comes out of the kuzu's mouth ('mother'), then the five behind her ('kids'); the words are said over it. */
export function* emerge(p: UriboPanel, part: 'mother' | 'kids'): Co {
  p.phase = 'wait';
  if (part === 'mother') {
    sfx('se_h_soil', { vol: 0.25, pitch: 0.8 });
    yield* animate(1100, (k) => {
      p.mother.alpha = k;
      p.mother.x = GAP_X - k * 46;
      p.mother.moving = k < 1;
      p.mother.f = Math.floor(k * 7) % 2;
    });
    p.mother.moving = false;
    return;
  }
  // close behind her, out of the kuzu's mouth (the gap opens as they walk)
  p.kids.forEach((k, i) => {
    k.x = p.mother.x + 20 + i * 14;
  });
  sfx('se_h_soil', { vol: 0.12, pitch: 1.5 });
  yield* animate(700, (k) => {
    for (const kid of p.kids) kid.alpha = k;
  });
}

/**
 * One run along the fence. Confirm while a little one crosses the light's right edge counts it.
 * Returns how many were counted and whether the press was ever off the edge.
 */
export function* run(p: UriboPanel, again: boolean): Co<{ n: number; clean: boolean }> {
  p.startRun(again);
  p.clearInput();
  let autoNext = 0;
  for (;;) {
    let press = p.take();
    if (p.auto) {
      const c = p.countable();
      press = !!c && c.x <= EDGE_X - 2 && p.t > autoNext;
      if (press) autoNext = p.t + 200;
    }
    if (press) {
      const c = p.countable();
      if (c) {
        c.counted = true;
        p.tally++;
        p.word(String(p.tally), c.x, UB_GROUND_Y - 24, 900);
        sfx('se_pen_write', { pitch: 1.2 + p.tally * 0.04, vol: 0.8 });
      } else {
        p.stray++;
        p.word('？', EDGE_X, UB_GROUND_Y - 24, 600);
        sfx('se_cursor', { pitch: 0.8, vol: 0.5 });
      }
    }
    if (p.runOver()) break;
    yield null;
  }
  yield 400;
  return { n: p.tally, clean: p.stray === 0 };
}

/** Back to the kuzu's mouth (they will pass again). */
export function* goBack(p: UriboPanel): Co {
  p.phase = 'back';
  yield 1500;
  for (const w of [p.mother, ...p.kids]) {
    w.alpha = 0;
    w.moving = false;
  }
  p.phase = 'wait';
  yield 500;
}

/** The mother at the fence: one snort, she turns to the mountain, and they go up into the kuzu. */
export function* snortHome(p: UriboPanel): Co {
  p.snort = 600;
  sfx('se_h_boar', { level: 0, vol: 0.7 });
  yield 700;
  p.turned = true;
  yield 400;
  p.homeT = p.t;
  p.phase = 'home';
  sfx('se_h_boar', { level: 2, vol: 0.4 });
}

export function* waitHome(p: UriboPanel): Co {
  yield* waitUntil(() => p.mother.alpha <= 0 && p.kids.every((k) => k.alpha <= 0), 8000);
}

/** The card: the list written in (pencil), then マサル's 『よし』. */
export function* card(p: UriboPanel, gu: boolean, part: 'list' | 'yoshi'): Co {
  if (part === 'list') {
    p.card.gu = gu;
    p.phase = 'card';
    sfx('se_page');
    const n = p.cardLines().join('').length;
    for (let i = 0; i <= n; i++) {
      p.card.k = i / n;
      if (i % 3 === 0) sfx('se_pen_write', { pitch: 1 + (i % 2) * 0.08, vol: 0.6 });
      yield 45;
    }
    p.card.k = 1;
    return;
  }
  sfx('se_pen_write', { pitch: 0.7 });
  yield* animate(260, (k) => (p.card.yoshi = k));
  p.card.yoshi = 1;
}

function* waitUntil(cond: () => boolean, max: number): Co {
  let t = 0;
  while (!cond() && t < max) {
    t += 16.7;
    yield null;
  }
}

export function uriboGuideRows(): [string[], string][] {
  const ok = touchControlsOn() ? 'けってい' : 'Z';
  return [[[ok], URIBO_UI.hint]];
}

if (import.meta.env.DEV) {
  registerDebug('uriboState', () => {
    const p = game.ui.widgets.find((w) => w instanceof UriboPanel) as UriboPanel | undefined;
    if (!p) return null;
    return {
      phase: p.phase,
      tally: p.tally,
      stray: p.stray,
      mother: Math.round(p.mother.x),
      kids: p.kids.map((k) => `${Math.round(k.x)}${k.counted ? '*' : ''}`),
      band: BAND,
      call: p.callOn > 0,
    };
  });
}
