// 大写しの 遊びの 共通の 部品（改善会議 2026-10-25 の 1・4）。Widget.closeup = true の パネル
// （engine/game.ts）は、何も 書き足さなくても ここで 次の 2つが つく。
//
// ① はじめの カード 1枚（やりかた）：パネルが 開いて、はじめて 自分に 入力が 来た とき 1回だけ。
//    セーブに 残る flag `howto_<id>` で 2回目からは 出さない。カードの 間は ゲームが 止まる
//    （UILayer.hold：時間も 進まない。タイミングの 遊びの 時計も 止まる）。けってい で はじめる、
//    もどる なら そのまま やめる。字は Widget.howto.line の 短い 1行 ＋「もどる＝やめる」。
//    キーは {Z} {X} {←→} {↑↓} {十字} と 書くと、キーボードは Z・X・矢印、タッチは けってい・もどる・
//    十字キー の 札で 出る（events/stage.ts の deviceKeys / keycap、操作の 案内と 同じ 札）。
//    絵（Widget.howto.pic）は 指・ボタン・矢印の 1組（PICS）を 使い回す。
// ② もどるで やめる：パネルが 自分に 入力が 来ている（会話が 上に ない）とき、もどる は いつも
//    「やめる」。画面の 右下に いつも 同じ 札「[X] やめる」（タッチ「[もどる] やめる」）。
//    やめると 短い「ぱふ」se_closeup_yame（失敗の 音では ない）。やめ方は 2つ：
//    ・Widget.quit() が true を 返す：パネルが 自分の やめ方で やめる（もとから ある「やめる」道）。
//    ・それ以外：パネルを 出した 台本（Task）に CloseupQuit を 投げる。台本の finally（パネルを
//      閉じる・ポーズを 戻す）は ふつうに 走り、その あとの ごほうび・失敗の 文は 走らない。
//      台本ごとに 戻す 物が あれば catch (e) { if (isCloseupQuit(e)) … } で。話しかけ直せば 最初から。
//    最後に 共通の 片づけ（addQuitTidy：カメラ・会話の 窓の 位置・ポーズ・操作の 案内 ほか）。
//    Widget.quittable() が false の あいだ（結果の カード ほか）は もどる は パネルの 物。
//
// 新しい 大写しを 作るとき（使い方は $SP/handoff/kaizenF_progress.md の 最初にも）：
//   closeup = true;
//   howto = { id: 'tokoroten', line: '{Z}を 押さえて、はなす', pic: 'hold' };
// （id は flag の 名前、line は 1行 15字くらい まで。__game.cmd.howtoCheck() で 幅を 見る）

import { Task, type Co } from '../engine/co';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import type { Input } from '../engine/input';
import { PixelCanvas } from '../engine/pixel';
import { H, W } from '../engine/screen';
import { markText } from '../engine/textzones';
import { buttonsTop } from '../engine/safezones';
import { ease } from '../engine/tween';
import { sfx } from '../audio';
import { flag, setFlag, state } from '../game/state';
import { registerDebug } from '../debug';
import { cinemaOff, clearKeyGuides, deviceKeys, forceBoxPos, keycap, type GuideKey } from '../events/stage';
import { setButtonHint } from '../engine/touch';
import { field } from '../world/field';
import { drawTape, drawWindow, textW, UI } from './window';
import { HOWTO } from '../data/text/howto';

export type HowtoPic = 'tap' | 'hold' | 'mash' | 'timing' | 'lr' | 'ud' | 'aim';
export interface Howto {
  /** flag howto_<id>（セーブに 残る：2回目からは 出さない）。 */
  id: string;
  /** 短い 1行。キーは {Z} {X} {←→} {↑↓} {十字}。 */
  line: string;
  /** 指・ボタン・矢印の 絵（なし = 字だけ の カード）。 */
  pic?: HowtoPic;
}

/** Thrown into a close-up game's script by もどる (quiet: an uncaught one just ends the task). */
export class CloseupQuit extends Error {
  readonly quiet = true;
  constructor() {
    super('closeup quit');
  }
}
export function isCloseupQuit(e: unknown): e is CloseupQuit {
  return e instanceof CloseupQuit;
}

export const howtoFlag = (id: string): string => `howto_${id}`;

// ---------------------------------------------------------------- state

const owner = new WeakMap<Widget, Task | null>();
const pushedAt = new WeakMap<Widget, number>();
const quitting = new WeakSet<Widget>();
/** Shown this session (a card already up once for this id, even before its flag: QA's skip). */
const shownNow = new Set<string>();
let qaSkip = false;
/** QA: the last quits (which widget class, how). */
const quitLog: { name: string; how: 'self' | 'raise' | 'none'; at: number }[] = [];
let tagK = 0;

const tidies: (() => void)[] = [];
/** A tidy-up run after every quit (after the script has unwound): the camera, the window's place, poses… */
export function addQuitTidy(fn: () => void): void {
  tidies.push(fn);
}

/** May もどる quit this close-up now? */
function canQuit(w: Widget): boolean {
  return !w.done && !quitting.has(w) && (w.quittable?.() ?? true);
}

/** The card is still to come for this close-up (the tag waits for it). */
function cardPending(w: Widget): boolean {
  const h = w.howto;
  if (!h || qaSkip || shownNow.has(h.id) || flag(howtoFlag(h.id)) > 0) return false;
  return !(w as { auto?: boolean }).auto;
}

function cardDue(w: Widget): boolean {
  if (!cardPending(w)) return false;
  // after the window has opened (its own `open`, else a moment)
  const age = game.time - (pushedAt.get(w) ?? game.time);
  const open = (w as { open?: number }).open;
  if (typeof open === 'number') return (open >= 1 && age >= 200) || age >= 1200;
  return age >= 400;
}

/** Quit this close-up game (もどる). */
export function quitCloseup(w: Widget): void {
  if (!canQuit(w)) return;
  sfx('se_closeup_yame');
  const name = w.constructor?.name ?? '?';
  if (w.quit?.()) {
    quitLog.push({ name, how: 'self', at: game.time });
    return;
  }
  const t = owner.get(w);
  if (!t || t.done) {
    quitLog.push({ name, how: 'none', at: game.time });
    return;
  }
  quitting.add(w);
  quitLog.push({ name, how: 'raise', at: game.time });
  t.raise(new CloseupQuit());
  game.scripts.run(afterQuit(w, t));
}

function* afterQuit(w: Widget, t: Task): Co {
  // (the script unwinds on its next step: its finally blocks may still close the window)
  yield () => t.done;
  if (!w.done) w.done = true;
  for (const fn of tidies) {
    try {
      fn();
    } catch (e) {
      console.warn('closeup tidy', e);
    }
  }
  if (game.fadeAlpha > 0) yield* game.fadeIn(250);
}

game.ui.closeupHooks = {
  pushed(w) {
    owner.set(w, Task.current);
    pushedAt.set(w, game.time);
  },
  input(w: Widget, input: Input): boolean {
    if (quitting.has(w)) return true;
    if (cardDue(w)) {
      shownNow.add(w.howto!.id);
      HOWTO_SEEN.set(w.howto!.id, w.howto as Howto);
      game.ui.hold = new HowtoCard(w.howto as Howto, w);
      return true;
    }
    if (input.pressed('cancel') && canQuit(w)) {
      quitCloseup(w);
      return true;
    }
    return false;
  },
};

// the common tidy-up: the guides and the button's word, the window's place, the letterbox, the
// poses on Minato and the one with him, and the camera back on him
addQuitTidy(() => {
  clearKeyGuides();
  setButtonHint(null);
  forceBoxPos(null);
  cinemaOff();
  const f = field();
  if (!f) return;
  for (const a of [f.player, f.follower]) {
    if (!a) continue;
    a.tempPose = null;
    a.anim = null;
  }
  f.camOverride = null;
});

// ---------------------------------------------------------------- 「やめる」の 札（右下、どの 遊びでも 同じ）

/** The tag's box (screen px): the bottom right corner (above the touch buttons fixed there on a sideways iPad). */
export function quitTagRect(): [number, number, number, number] {
  const cap = keycap(backKey());
  const w = cap.width + 4 + textW(TAG_WORD) + 10;
  const h = cap.height + 2;
  const x = W - w - 3;
  const y = Math.min(H - h - 3, buttonsTop(x, x + w) - h - 3);
  return [x, y, w, h];
}
const TAG_WORD = 'やめる';
function backKey(): GuideKey {
  return deviceKeys(['X'])[0];
}

/** The top modal widget, if it is a close-up game. */
function topCloseup(): Widget | null {
  const ws = game.ui.widgets;
  for (let i = ws.length - 1; i >= 0; i--) if (ws[i].modal && !ws[i].done) return ws[i].closeup ? ws[i] : null;
  return null;
}

/** Drawn over the widgets each frame (game.overlays): the tag while もどる would quit. */
function drawTag(g: Gfx): void {
  const w = game.ui.hold ? null : topCloseup();
  const on = !!w && canQuit(w) && !cardPending(w);
  tagK = on ? Math.min(1, tagK + 0.12) : Math.max(0, tagK - 0.2);
  if (tagK <= 0) return;
  const [x, y, tw, th] = quitTagRect();
  const a = ease.sineOut(tagK);
  markText(x, y, tw, th);
  g.alpha(a * 0.92, () => {
    g.rect(x + 1, y + 1, tw, th, UI.borderDark, 0.5);
    g.rect(x, y, tw, th, UI.bg);
    g.frame(x, y, tw, th, UI.border);
    const cap = keycap(backKey());
    g.img(cap, x + 2, y + 1 + (game.input.rawDown('cancel') ? 1 : 0));
    g.text(TAG_WORD, x + cap.width + 6, y + 2, { color: UI.pencil });
  });
}
game.overlays.push(drawTag);

// ---------------------------------------------------------------- 絵（指・ボタン・矢印、1組だけ）

let fingerImg: HTMLCanvasElement | null = null;
/** The finger (pointing down, the tip at the bottom-left column 3), 12×14, built once. */
function finger(): HTMLCanvasElement {
  if (fingerImg) return fingerImg;
  const rows = [
    '..########..',
    '.#cccccccc#.',
    '.#cccccccc#.',
    '.##########.',
    '#ssssssssss#',
    '#sssshshshs#',
    '#sssshshshs#',
    '.#sssd#####.',
    '.#sssd#.....',
    '.#sssd#.....',
    '.#sssd#.....',
    '.#sssd#.....',
    '.#ssdd#.....',
    '..####......',
  ];
  const p = new PixelCanvas(12, 14);
  const pal: Record<string, string> = { '#': UI.border, c: UI.cream, s: '#F2C9A0', d: '#D9A57A', h: '#B98560' };
  rows.forEach((r, y) => [...r].forEach((ch, x) => pal[ch] && p.set(x, y, pal[ch])));
  fingerImg = p.toCanvas();
  return fingerImg;
}

/** A key drawn 2× (the same keycaps as the guides: Z / けってい …), pressed = sunk 2 px and a little darker. */
function bigKey(g: Gfx, k: GuideKey, cx: number, top: number, pressed: boolean, lit = false): [number, number] {
  const cap = keycap(k);
  const w = cap.width * 2;
  const x = Math.round(cx - w / 2);
  g.img(cap, x, top + (pressed ? 2 : 0), { scale: 2 });
  if (pressed) g.rect(x + 2, top + 4, w - 4, cap.height * 2 - 10, UI.border, 0.12);
  if (lit) g.frame(x - 2, top - 2, w + 4, cap.height * 2 + 4, UI.accent);
  return [x, w];
}

/** Little lines round a press (a tap: 3 strokes; strong: 5). */
function burst(g: Gfx, cx: number, cy: number, k: number, n = 3): void {
  if (k <= 0) return;
  const r0 = 6 + Math.round(k * 4);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.55;
    const x = Math.round(cx + Math.cos(a) * r0);
    const y = Math.round(cy + Math.sin(a) * r0);
    g.rect(x, y, 2, 2, UI.accent, 1 - k * 0.6);
  }
}

/**
 * One of the shared pictures in a box (x, y, w, h), animated by t (ms).
 * The parts: the finger, the けってい key (the device's own name), arrows.
 */
function drawPic(g: Gfx, pic: HowtoPic, x: number, y: number, w: number, h: number, t: number): void {
  const ok = deviceKeys(['Z'])[0];
  const cx = Math.round(x + w / 2);
  const fing = finger();
  const keyTop = y + h - 40;
  // where the finger is over the key (its tip at (tipX, tipY))
  const fingerAt = (tipX: number, down: number) => g.img(fing, tipX - 6, keyTop - 26 + down, { scale: 2 });
  const press = (kx: number, down: boolean, lit = false) => {
    bigKey(g, ok, kx, keyTop, down, lit);
    fingerAt(kx, down ? 4 : -2);
  };
  if (pic === 'tap') {
    const c = t % 1100;
    const down = c < 160;
    press(cx, down);
    burst(g, cx, keyTop - 2, down ? c / 160 : 0);
  } else if (pic === 'mash') {
    const c = t % 1500;
    const down = c < 1100 && c % 180 < 90;
    press(cx, down);
    if (c < 1100) burst(g, cx, keyTop - 2, (c % 180) / 180, 5);
  } else if (pic === 'hold') {
    // press … hold (the gauge fills) … let go (an arrow up)
    const c = t % 2600;
    const down = c >= 200 && c < 1700;
    press(cx, down, down);
    const gx = cx + 30;
    const gh = 34;
    g.frame(gx, keyTop - 2, 6, gh, UI.border);
    const fill = down ? Math.round(((c - 200) / 1500) * (gh - 2)) : c >= 1700 ? gh - 2 : 0;
    if (fill > 0) g.rect(gx + 1, keyTop - 2 + gh - 1 - fill, 4, fill, c >= 1700 ? '#FFD23F' : UI.accent);
    if (c >= 1700 && c < 2300) {
      const k = (c - 1700) / 600;
      const ay = Math.round(keyTop - 34 - k * 6);
      for (let i = 0; i < 4; i++) g.rect(cx - 16 - i, ay + i, 1 + i * 2, 1, UI.accent);
      g.rect(cx - 17, ay + 4, 3, 5, UI.accent);
    }
  } else if (pic === 'timing') {
    // a mark running along a bar; pressed while it is in the red
    const bw = Math.min(w - 20, 96);
    const bx = Math.round(cx - bw / 2);
    const by = y + 2;
    g.rect(bx, by, bw, 7, UI.cream);
    g.rect(bx + Math.round(bw * 0.62), by, Math.round(bw * 0.16), 7, UI.accent, 0.8);
    g.frame(bx - 1, by - 1, bw + 2, 9, UI.border);
    const c = t % 1800;
    const k = Math.min(1, c / 1300);
    const mx = bx + Math.round(k * (bw - 3));
    g.rect(mx, by - 3, 3, 13, UI.border);
    const hit = c >= 1000 && c < 1180;
    press(cx, hit);
    burst(g, cx, keyTop - 2, hit ? (c - 1000) / 180 : 0, 5);
  } else if (pic === 'lr' || pic === 'ud' || pic === 'aim') {
    // the arrows (lit in turn), then the けってい key pressed
    const arrows: GuideKey[] = pic === 'ud' ? ['up', 'down'] : ['left', 'right'];
    const keys = deviceKeys(arrows);
    const c = t % 2400;
    const ax = cx - 34;
    if (keys.length === 1) bigKey(g, keys[0], ax, keyTop, c < 1500 && c % 500 < 250);
    else {
      const cap = keycap(keys[0]);
      const gap = cap.width * 2 + 4;
      bigKey(g, keys[0], ax - gap / 2, keyTop, c < 1500 && c % 1000 < 400);
      bigKey(g, keys[1], ax + gap / 2, keyTop, c < 1500 && c % 1000 >= 500 && c % 1000 < 900);
    }
    const down = c >= 1700 && c < 1880;
    press(cx + 34, down);
    burst(g, cx + 34, keyTop - 2, down ? (c - 1700) / 180 : 0);
  }
}

// ---------------------------------------------------------------- the line, with its keys

interface Bit {
  text?: string;
  key?: GuideKey;
}
const TOKEN: Record<string, GuideKey[]> = {
  Z: ['Z'],
  X: ['X'],
  '←→': ['left', 'right'],
  '↑↓': ['up', 'down'],
  十字: ['up', 'down', 'left', 'right'],
  '→': ['right'],
  '←': ['left'],
  '↑': ['up'],
  '↓': ['down'],
};
function bits(line: string): Bit[] {
  const out: Bit[] = [];
  for (const part of line.split(/(\{[^}]+\})/)) {
    if (!part) continue;
    const m = part.match(/^\{(.+)\}$/);
    if (m && TOKEN[m[1]]) for (const k of deviceKeys(TOKEN[m[1]])) out.push({ key: k });
    else out.push({ text: part });
  }
  return out;
}
function bitsW(bs: Bit[]): number {
  return bs.reduce((a, b) => a + (b.key ? keycap(b.key).width + 2 : textW(b.text!)), 0);
}
function drawBits(g: Gfx, bs: Bit[], cx: number, y: number, color: string): void {
  let x = Math.round(cx - bitsW(bs) / 2);
  for (const b of bs) {
    if (b.key) {
      const cap = keycap(b.key);
      g.img(cap, x + 1, y - 2);
      x += cap.width + 2;
    } else {
      g.text(b.text!, x, y, { color });
      x += textW(b.text!);
    }
  }
}

// ---------------------------------------------------------------- the card

const CARD_W = 292;
const PIC_H = 66;
const TITLE = 'やりかた';
const YAME = '{X}＝やめる';
const HAJIME = '{Z}で はじめる';

class HowtoCard implements Widget {
  modal = true;
  done = false;
  private t = 0;
  private out = -1;
  private next: 'play' | 'quit' = 'play';
  constructor(
    readonly howto: Howto,
    readonly game_: Widget | null,
  ) {
    sfx('se_howto');
  }
  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.out >= 0) {
      this.out += dt;
      if (this.out >= 160) {
        this.done = true;
        setFlag(howtoFlag(this.howto.id));
        if (this.next === 'quit' && this.game_) quitCloseup(this.game_);
      }
      return;
    }
    // (a press held from the last page doesn't close it at once)
    if (this.t < 350) return;
    if (input.rawPressed('confirm')) {
      sfx('se_confirm');
      this.out = 0;
    } else if (input.rawPressed('cancel')) {
      this.next = 'quit';
      this.out = 0;
    }
  }
  draw(g: Gfx): void {
    const inK = ease.cubicOut(Math.min(1, this.t / 180));
    const k = this.out >= 0 ? inK * (1 - Math.min(1, this.out / 160)) : inK;
    const pic = this.howto.pic;
    const h = (pic ? PIC_H + 8 : 0) + 84;
    const x = Math.round((W - CARD_W) / 2);
    const y = Math.round((H - h) / 2) + Math.round((1 - k) * 8);
    g.rect(0, 0, W, H, '#0B0B14', 0.45 * k);
    markText(x, y, CARD_W, h);
    drawWindow(g, x, y, CARD_W, h, UI, k, { curl: false });
    g.alpha(k, () => {
      const tw = textW(TITLE) + 16;
      drawTape(g, x + 10, y - 6, tw, 16, TITLE, { seed: 7 });
      let yy = y + 14;
      if (pic) {
        g.rect(x + 12, yy, CARD_W - 24, PIC_H, UI.cream);
        g.clip(x + 12, yy, CARD_W - 24, PIC_H, () => drawPic(g, pic, x + 12, yy + 4, CARD_W - 24, PIC_H - 6, this.t));
        yy += PIC_H + 8;
      }
      drawBits(g, bits(this.howto.line), W / 2, yy + 2, UI.text);
      drawBits(g, bits(YAME), W / 2, yy + 26, UI.pencil);
      // 「けってい で はじめる」 blinks bottom right
      if (Math.floor(this.t / 500) % 2 === 0 || this.t < 350) {
        const bs = bits(HAJIME);
        const bw = bitsW(bs);
        drawBits(g, bs, x + CARD_W - 12 - bw / 2, yy + 50, UI.accent);
      }
    });
  }
}

// ---------------------------------------------------------------- QA

/** QA: show a card now (its widget: the top close-up, if any). */
function showCard(h: Howto): void {
  game.ui.hold = new HowtoCard(h, topCloseup());
}

registerDebug('howtoSkip', (on?: unknown) => {
  qaSkip = on === undefined ? true : !!on;
  return qaSkip;
});
registerDebug('howtoReset', () => {
  shownNow.clear();
  for (const k of Object.keys(state.flags)) if (k.startsWith('howto_')) setFlag(k, 0);
  return true;
});
registerDebug('howtoShow', (line?: unknown, pic?: unknown) => {
  showCard({ id: 'qa', line: String(line ?? '{Z}を 押さえて、はなす'), pic: (pic as HowtoPic) ?? 'hold' });
  return true;
});
/** QA: every close-up's line width (widest bits ≤ the card's inside). */
registerDebug('howtoCheck', () => {
  const max = CARD_W - 28;
  const out: { id: string; w: number; ok: boolean }[] = [];
  for (const h of [...Object.values(HOWTO), ...HOWTO_SEEN.values()]) {
    const w = bitsW(bits(h.line));
    out.push({ id: h.id, w, ok: w <= max });
  }
  return { max, bad: out.filter((o) => !o.ok), n: out.length, all: out };
});
registerDebug('closeupInfo', () => {
  const w = topCloseup();
  return {
    top: w ? w.constructor?.name : null,
    howto: w?.howto ?? null,
    card: !!game.ui.hold,
    canQuit: w ? canQuit(w) : false,
    tag: tagK,
    quits: quitLog.slice(-5),
  };
});
registerDebug('closeupFlags', () => ({ ...state.flags }));
registerDebug('closeupQuit', () => {
  const w = topCloseup();
  if (w) quitCloseup(w);
  return !!w;
});

/** The cards seen this session (howtoCheck looks at these too: a new close-up's own line). */
const HOWTO_SEEN = new Map<string, Howto>();
