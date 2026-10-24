// やっと、魚の 昼（第3章の クリア前、段階2。げむきか 10/23 の 案2、2026-10-23 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_sakana.ts、みました帳の ページは ui/menu/book_sakana.ts。
//
//   段階2（12:01）、S13 の あと（flag_ch3_got_gochisou）から S14 の 前まで（flag_ch3_truck_trap が 立ったら 起きない。
//   S14 の 前の「やり残し ないか？」で 乗らない ほうを 選べば 来られる：今の 作り）。S15 から 先と クリア後は 足さない。
//   ・防波堤の ツリノ (21,32)：段階2 で 話すと〔sakana〕（ツリノには 段階2 の いつもの 文が ないので、1回目から。
//     案の「いつもの〔c2〕の あと」は、段階1 の 文〈海の ぬし〉に もどって しまうため）。
//   ・見のがさないように（会議 10-23）：遊べる あいだ、ツリノの 頭の 上に「！」（world/marks.ts の しるしと 同じ。
//     せってい「しるし」で 消える）。S13 の あと 防波堤で 操作が もどると、すぐ 西に 見える。
//   ・子どもたち（段階2 の 防波堤 (33,32)・(35,32)・(38,32)）が 走って きて、ツリノの 東 (23–27,32) の 空いた マスに
//     並ぶ（しゅん・グソっ君の マスは よける。海がわの 列 y32 だけ。y31 は 通り道に あける）。済んだら もどる。
//   ・大写し「浮き」UkiPanel：第1章の 浮きの 釣り（seki_tsuri.ts）と 同じ 窓・同じ 棒浮き。海は 12:01 の 波。
//     待つ → ぴくっ（1〜2回。ここで 押すと「早い！」）→ 沈む（ここで けってい = 釣れた。遅れると「えさだけ」）。
//     しくじっても 何度でも（えさを 取られた 数 flag_sk_esa）。釣れた 回数 3 で おしまい：小アジ・クサフグ（ぷくっ）・針だけ。
//     もどる で やめられる（続きは もう一度 ツリノに 話す）。
//   ・ぬらして 返す：大写しの 中で 手を 海に つけて、魚を 波の 中へ。子どもが 数える。
//   ・かくし：来た おぴぃ（flag_ch3_kita_npc_tamotsu）、クサフグの あと グソっ君（flag_sk_kn_fugu）。
//     （案の「図鑑『みずべ』の 最後の ページ『うみ』に 絵を 足す」は、その ページが まだ 作られて いないので 見送り）
//   ・段階1：ツリノに 2回目に 話すと、地の文と グソっ君（flag_sk_c1。今の〔c1_1〕は 変えない。竿立ての 物は 防波堤の
//     通り道を ふさぐので 置かない）。
//
// QA：__game.cmd.sakana(step, auto)、skState()、skText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { PixelCanvas } from '../../engine/pixel';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript, walk } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import type { Actor } from '../../world/actor';
import { faceToward } from '../../world/interact';
import { actorAnchor, addMarkSource } from '../../world/marks';
import { pgOn } from '../../world/postgame';
import { drawTape, drawWindow, UI } from '../../ui/window';
import { floatImg } from '../../art/props/seki_tsuri_art';
import * as T from '../../data/text/c3_sakana';
import { SK_UI } from '../../data/text/c3_sakana';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { c3Stage, inCh3, kita, say3 } from './common';

export const SF = {
  start: 'flag_sk_start',
  rule: 'flag_sk_rule',
  /** 釣れた 回数（0〜3）。 */
  n: 'flag_sk_n',
  /** えさを 取られた 数（しくじり と 3回目の 針だけ）。 */
  esa: 'flag_sk_esa',
  aji: 'flag_sk_aji',
  fugu: 'flag_sk_fugu',
  done: 'flag_sk_done',
  c1: 'flag_sk_c1',
  opi: 'flag_sk_opi',
  knFugu: 'flag_sk_kn_fugu',
} as const;

const UMIZOI = 'map_umizoi';
const TSURI = 'npc_c3_tsuri';
const KIDS = ['npc_c3_kid_a', 'npc_c3_kid_b', 'npc_c3_kid_c'];
/** 子どもが 見に 来る マス（ツリノの 東、海がわの 列。前から 空いた 所を 3つ）。 */
const KID_SPOTS: [number, number][] = [
  [23, 32],
  [24, 32],
  [25, 32],
  [26, 32],
  [27, 32],
  [28, 32],
];

function knWith(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** グソっ君の いない 行を 抜く。 */
function trim(text: string): string {
  if (knWith()) return text;
  return text
    .split(/\n(?=@)/)
    .filter((p) => !p.startsWith('@npc_kanenari'))
    .join('\n');
}

function* say(text: string): Co<number> {
  const t = trim(text);
  if (!t.trim()) return -1;
  return yield* say3(t);
}

function wrap(id: string, fn: (ctx: ScriptCtx, orig: () => Co) => Co): void {
  const prev = getScript(id);
  registerScript(id, function* (ctx): Co {
    const orig = function* (): Co {
      if (prev) yield* prev(ctx);
      else yield* ctx.runDefault();
    };
    yield* fn(ctx, orig);
  });
}

/** 遊べる：段階2、S13 の あと、S14 の 前。 */
export function skOpen(): boolean {
  return inCh3() && !pgOn() && c3Stage() === 2 && flag('flag_ch3_got_gochisou') > 0 && !flag('flag_ch3_truck_trap');
}

// ================================================================ 見のがさない しるし（ツリノの 頭の 上）

addMarkSource((f) => {
  if (f.map.id !== UMIZOI || !skOpen() || flag(SF.done)) return null;
  const a = f.actorById(TSURI);
  return a && a.visible ? actorAnchor(a) : null;
});

// ================================================================ 魚の 絵

const fishCache = new Map<string, HTMLCanvasElement>();

/** 小アジ（横向き、頭が 左。口に 糸）：18×8。背は 青みどり、腹は 銀、ぜいごの 線、二つに 分かれた 尾。 */
function ajiImg(): HTMLCanvasElement {
  const hit = fishCache.get('aji');
  if (hit) return hit;
  const p = PixelCanvas.fromArt(
    [
      '.....bbbbbbb......',
      '...bbbbbbbbbbb..tt',
      '.bbewbbbbbbbbbbtt.',
      'mwwwllllllllllltt.',
      '.wwwwwwwwwwwwwwtt.',
      '..wwwwwwwwwwwww.tt',
      '....wwwwwwwww.....',
      '..................',
    ],
    { b: '#5E8A94', e: '#1B1733', w: '#E8F2F8', l: '#9AB0BE', t: '#7A98A4', m: '#C89068' },
  );
  p.outline('#1B1733');
  const c = p.toCanvas();
  fishCache.set('aji', c);
  return c;
}

/** クサフグ：ふつう（11×7）と、ふくらんだ（13×11）。背は 茶の まだら、腹は 白。 */
function fuguImg(puff: boolean): HTMLCanvasElement {
  const key = puff ? 'fugu1' : 'fugu0';
  const hit = fishCache.get(key);
  if (hit) return hit;
  const rows = puff
    ? [
        '....ggggg....',
        '..gggdggggg..',
        '.ggdggggdgg.t',
        'gsggggdggggtt',
        'gggdgggggggtt',
        'wwwwwwwwwwwwt',
        'wwwwwwwwwwww.',
        '.wwwwwwwwww..',
        '.wwwwwwwwww..',
        '..wwwwwwww...',
        '....wwww.....',
      ]
    : ['...gggggg..', '.ggdggdggg.', 'gsgggggggtt', 'ggggdggggtt', 'wwwwwwwwwwt', '.wwwwwwww..', '...wwww....'];
  const p = PixelCanvas.fromArt(rows, { g: '#8A7A4A', d: '#4E4630', s: '#1B1733', w: '#F4F1E8', t: '#B8A86A' });
  p.outline('#1B1733');
  const c = p.toCanvas();
  fishCache.set(key, c);
  return c;
}

/** 針だけ（えさの ない）：4×6。 */
function hariImg(): HTMLCanvasElement {
  const hit = fishCache.get('hari');
  if (hit) return hit;
  const p = PixelCanvas.fromArt(['.x..', '.x..', '.x..', 'x.x.', 'x.x.', '.x..'], { x: '#C8CCD4' });
  const c = p.toCanvas();
  fishCache.set('hari', c);
  return c;
}

// ================================================================ 大写し「浮き」（横から 見た 12:01 の 海と、ツリノの 棒浮き）

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const RX = SX + 214;
const KEYS_Y = 44;
/** 海の 面（大写しの 上から）。 */
const WY = 50;
/** 浮きの 立つ 所（大写しの 左から）。 */
const FX = 128;
/** 竿の 先（左上）。 */
const TIP: [number, number] = [14, 6];

export type UkiCatch = 'aji' | 'fugu' | 'hari';
export type UkiOutcome = 'hit' | 'early' | 'late' | 'quit';

export class UkiPanel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  phase: 'idle' | 'cast' | 'wait' | 'piku' | 'sink' | 'up' | 'release' = 'idle';
  /** 浮きの 沈み（px。ぴくっ 3、沈む 18）。 */
  dip = 0;
  floatOn = false;
  /** 投げる ときの 浮き（0..1 で 飛んで くる）。 */
  castK = 1;
  rings: { x: number; t: number }[] = [];
  splash: { x: number; t: number }[] = [];
  words: { text: string; t: number; ms: number }[] = [];
  /** 釣れた 物（上がって いる 間）。 */
  caught: UkiCatch | null = null;
  /** フグの ふくらみ（0..1）。 */
  puff = 0;
  /** 返す：手の 下がり（0..1）、魚が 泳いで いく（ms、-1 なし）。 */
  hand = 0;
  swim = -1;
  /** 下を 通る 魚の 影（待つ 間）。 */
  shadowX = 40;
  count = 0;
  private eConfirm = false;
  private eCancel = false;

  take(k: 'confirm' | 'cancel'): boolean {
    const v = k === 'confirm' ? this.eConfirm : this.eCancel;
    if (k === 'confirm') this.eConfirm = false;
    else this.eCancel = false;
    return v;
  }
  clearInput(): void {
    this.eConfirm = this.eCancel = false;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (input.pressed('confirm')) this.eConfirm = true;
    if (input.pressed('cancel')) this.eCancel = true;
    this.rings = this.rings.filter((r) => (r.t += dt) < 700);
    this.splash = this.splash.filter((r) => (r.t += dt) < 500);
    this.words = this.words.filter((w) => (w.t += dt) < w.ms);
    if (this.swim >= 0) this.swim += dt;
    if (this.phase === 'wait' || this.phase === 'piku') this.shadowX = FX - 30 + Math.sin(this.t / 1300) * 26;
  }

  word(text: string, ms = 900): void {
    this.words.push({ text, t: 0, ms });
  }

  /** 波の 高さ（x の 所、px）。 */
  private wave(x: number): number {
    return Math.sin(this.t / 420 + x / 19) * 1.6 + Math.sin(this.t / 260 + x / 7) * 0.6;
  }

  draw(g: Gfx): void {
    if (this.open <= 0) return;
    const k = ease.cubicOut(Math.min(1, this.open));
    const a = Math.min(1, this.open * 1.4);
    const dy = Math.round((1 - k) * -10);
    markText(PX, PY, PW, PH);
    drawWindow(g, PX, PY + dy, PW, PH, UI, a, { curl: false });
    g.alpha(a, () => {
      const oy = SY + dy;
      g.clip(SX, oy, CW, CH, () => {
        g.clip(SX, oy, RX - SX - 4, CH, () => this.drawScene(g, oy));
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        this.drawSide(g, oy);
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(SK_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, SK_UI.place, { seed: 41 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  private drawScene(g: Gfx, oy: number): void {
    const W = RX - SX - 4;
    const hz = oy + 22;
    const wy = oy + WY;
    // the noon sky (12:01), the horizon far off, the sea with its waves come back
    for (let y = oy; y < hz; y++) g.rect(SX, y, W, 1, y < oy + 8 ? '#8EC0E0' : y < oy + 16 ? '#A8D0EA' : '#C8E2F2');
    g.rect(SX, hz, W, 1, '#6A9AC0');
    for (let y = hz + 1; y < oy + CH; y++) {
      const d = y - hz;
      g.rect(SX, y, W, 1, d < 12 ? '#9CC8E2' : d < 26 ? '#7AB0D4' : d < 50 ? '#5E96C0' : '#4A7EAA');
    }
    // the swell: bright crests running in toward the breakwater (left)
    for (let row = 0; row < 6; row++) {
      const y = hz + 4 + row * 5 + (row > 3 ? (row - 3) * 4 : 0);
      if (y > wy - 3) continue;
      const sp = 0.012 + row * 0.004;
      for (let x0 = ((-this.t * sp + row * 37) % 40) - 40; x0 < W; x0 += 40) g.rect(SX + Math.round(x0), y, 8 + row, 1, '#E8F4FA', 0.7);
    }
    // the surface line where the float stands (moving with the waves)
    for (let x = 0; x < W; x += 2) g.rect(SX + x, wy + Math.round(this.wave(x)), 2, 1, '#D8ECF8', 0.8);
    // a fish's shadow under the float while waiting
    if (this.phase === 'wait' || this.phase === 'piku' || this.phase === 'sink') g.alpha(0.35, () => g.rect(SX + Math.round(this.shadowX), wy + 26, 14, 4, '#2A4A6A'));
    // the breakwater's edge at the bottom left (the concrete, a tetrapod's arm)
    g.rect(SX, oy + CH - 10, 52, 10, '#B8B8B0');
    g.rect(SX, oy + CH - 10, 52, 1, '#D8D8D0');
    g.rect(SX + 52, oy + CH - 7, 10, 7, '#9A9A92');
    // the rod's tip and the line
    const fy = wy + Math.round(this.wave(FX)) + this.dip;
    let lx = SX + FX;
    let ly = fy - 22;
    if (this.caught) {
      lx = SX + FX - 20;
      ly = oy + 26;
    }
    if (this.floatOn && this.castK < 1) {
      lx = SX + TIP[0] + (FX - TIP[0]) * this.castK;
      ly = oy + TIP[1] + (fy - 22 - oy - TIP[1]) * this.castK - Math.sin(this.castK * Math.PI) * 14;
    }
    g.rect(SX, oy + TIP[1] - 1, TIP[0] + 1, 2, '#6A4A2A');
    if (this.floatOn || this.caught) g.line(SX + TIP[0], oy + TIP[1], Math.round(lx), Math.round(ly), '#F4F1E8');
    // the float (2×): the lower part under the water is drawn through it
    if (this.floatOn && !this.caught) {
      const img = floatImg(false);
      const fx = Math.round(lx - 4);
      const top = Math.round(ly);
      g.img(img, fx, top, { scale: 2 });
      if (this.castK >= 1) {
        const cut = fy - 10;
        g.rect(fx - 1, cut, 10, top + 24 - cut + 1, '#5E96C0', 0.72);
      }
    }
    for (const r of this.rings) {
      const k = r.t / 700;
      const rr = Math.round(3 + k * 12);
      g.rect(SX + r.x - rr, wy + 1, 3, 1, '#F4FAFF', 0.8 * (1 - k));
      g.rect(SX + r.x + rr - 2, wy + 1, 3, 1, '#F4FAFF', 0.8 * (1 - k));
    }
    for (const s of this.splash) {
      const k = s.t / 500;
      for (let i = -2; i <= 2; i++) g.rect(SX + s.x + i * 3, wy - Math.round(Math.sin(k * Math.PI) * (6 - Math.abs(i) * 2)), 1, 2, '#F4FAFF', 1 - k);
    }
    // what came up, hanging on the line (2×)
    if (this.caught) {
      const img = this.caught === 'aji' ? ajiImg() : this.caught === 'fugu' ? fuguImg(this.puff > 0.5) : hariImg();
      const sway = Math.round(Math.sin(this.t / 300) * 2);
      const hy = ly + Math.round(this.hand * (wy - ly - 4));
      if (this.hand <= 0.98) g.img(img, Math.round(lx - img.width) + sway, hy, { scale: 2 });
      // しゅん's hand, wet from the sea, comes down from above to hold it
      if (this.phase === 'release') {
        const hx = Math.round(lx - 6);
        const by = Math.round(oy + 4 + this.hand * (wy - oy - 10));
        g.rect(hx, oy, 10, by - oy, '#3E8A4E');
        g.rect(hx - 1, by, 12, 8, '#E8B890');
        g.rect(hx + 1, by + 7, 8, 2, '#C89068');
        if (this.hand > 0.2) for (let i = 0; i < 3; i++) g.rect(hx + 2 + i * 3, by + 9 + ((Math.floor(this.t / 120) + i) % 4), 1, 1, '#D8ECF8');
      }
    }
    // the fish going back: a dark shape slipping off under the waves
    if (this.swim >= 0 && this.swim < 1200) {
      const k = this.swim / 1200;
      g.alpha(0.6 * (1 - k), () => g.rect(Math.round(SX + FX - 20 + k * 70), wy + 8 + Math.round(k * 16), 12, 3, '#2A4A6A'));
    }
    for (const w of this.words) {
      const p = w.t / w.ms;
      const al = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
      g.text(w.text, SX + FX + 2, Math.round(wy - 44 - p * 6), { color: UI.bg, outline: UI.border, align: 'center', alpha: al });
    }
  }

  private drawSide(g: Gfx, oy: number): void {
    g.text(SK_UI.caught, RX, oy + 4, { color: '#8A84A0' });
    g.text(SK_UI.count(this.count), RX, oy + 20, { color: '#F4ECD8' });
    // three little marks: the fish let go (and the bare hook)
    for (let i = 0; i < 3; i++) g.rect(RX + 56 + i * 12, oy + 24, 8, 4, i < this.count ? '#FFE7A3' : '#4A4458');
    if (this.phase === 'wait' || this.phase === 'piku' || this.phase === 'sink' || this.phase === 'cast')
      SK_UI.keys.forEach((l, i) => g.text(l, RX, oy + KEYS_Y + i * 16, { color: i === 3 ? '#8A84A0' : '#FFE7A3' }));
  }
}

function* openUki(p: UkiPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closeUki(p: UkiPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

/** Wait `ms`; true if confirm was pressed in it (QA auto never presses here). */
function* waitPress(p: UkiPanel, ms: number): Co<boolean> {
  for (let t = 0; t < ms; t += 16.7) {
    if (!p.auto && p.take('confirm')) return true;
    yield null;
  }
  return false;
}

/** 1回 投げて 待つ（釣れた・早い・遅い・やめる）。 */
function* uki(p: UkiPanel): Co<UkiOutcome> {
  p.caught = null;
  p.puff = 0;
  p.hand = 0;
  p.dip = 0;
  p.floatOn = true;
  p.phase = 'cast';
  se('se_tsuri_cast');
  yield* animate(420, (k) => (p.castK = k), ease.quadOut);
  p.castK = 1;
  p.rings.push({ x: FX, t: 0 });
  se('se_tsuri_pochan', { vol: 0.5 });
  p.clearInput();
  p.phase = 'wait';
  // waiting: a press now is too early; もどる stops here
  const waitMs = 1400 + Math.random() * 1800;
  for (let t = 0; t < waitMs; t += 16.7) {
    if (p.take('cancel')) {
      p.floatOn = false;
      p.phase = 'idle';
      return 'quit';
    }
    if (!p.auto && p.take('confirm')) return 'early';
    yield null;
  }
  // ぴくっ（1〜2回）
  p.phase = 'piku';
  const n = 1 + (Math.random() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    p.dip = 3;
    p.rings.push({ x: FX, t: 0 });
    se('se_tsuri_tsun', { vol: 0.5 });
    p.word(SK_UI.pikun, 600);
    if (yield* waitPress(p, 260)) return 'early';
    p.dip = 0;
    if (yield* waitPress(p, 480 + Math.random() * 420)) return 'early';
  }
  // 沈む：the float goes under; this is the moment (a generous second)
  p.phase = 'sink';
  se('se_tsuri_gui', { vol: 0.5 });
  const SINK = 1100;
  for (let t = 0; t < SINK; t += 16.7) {
    p.dip = Math.min(20, 4 + (t / 180) * 16);
    if (p.auto ? t > 260 : p.take('confirm')) return 'hit';
    yield null;
  }
  return 'late';
}

/** 釣れた 物を 上げる。 */
function* agaru(p: UkiPanel, what: UkiCatch): Co {
  p.phase = 'up';
  se('se_tsuri_agari', { vol: 0.6 });
  p.splash.push({ x: FX, t: 0 });
  p.caught = what;
  p.dip = 0;
  yield 500;
  if (what === 'fugu') {
    yield 300;
    se('se_tsuri_snag', { vol: 0.4, pitch: 1.6 });
    yield* animate(350, (k) => (p.puff = k), ease.quadOut);
    p.puff = 1;
  }
}

/** ぬらした 手で 持って、波の 中へ。 */
function* kaesu(p: UkiPanel): Co {
  p.phase = 'release';
  yield* animate(500, (k) => (p.hand = k * 0.9), ease.quadInOut);
  se('se_tsuri_pochan', { vol: 0.3, pitch: 1.3 });
  p.splash.push({ x: FX - 14, t: 0 });
  yield 250;
  yield* animate(260, (k) => (p.hand = 0.9 + k * 0.1), ease.linear);
  p.hand = 1;
  se('se_tsuri_release');
  p.swim = 0;
  p.caught = null;
  p.floatOn = false;
  yield 700;
  p.phase = 'idle';
  p.hand = 0;
}

let qaAuto = false;

/** 3 大写し：3回 釣れるまで。やめたら false。 */
function* fishing(): Co<boolean> {
  const p = new UkiPanel();
  p.auto = qaAuto;
  p.count = flag(SF.n);
  try {
    yield* openUki(p);
    if (!flag(SF.rule)) {
      setFlag(SF.rule, 1);
      yield* say3(T.SK_RULE);
    }
    while (flag(SF.n) < 3) {
      const r = yield* uki(p);
      if (r === 'quit') return false;
      if (r !== 'hit') {
        // えさだけ 取られた：浮きが 上がって、すぐ もう 1回
        setFlag(SF.esa, flag(SF.esa) + 1);
        p.word(r === 'early' ? SK_UI.early : SK_UI.late, 1000);
        se('se_tsuri_hayai', { vol: 0.5 });
        p.dip = 0;
        p.phase = 'idle';
        yield 1000;
        continue;
      }
      const k = flag(SF.n);
      const what: UkiCatch = k === 0 ? 'aji' : k === 1 ? 'fugu' : 'hari';
      yield* agaru(p, what);
      setFlag(SF.n, k + 1);
      p.count = k + 1;
      if (what === 'aji') {
        setFlag(SF.aji, 1);
        yield* say(T.SK_AJI);
      } else if (what === 'fugu') {
        setFlag(SF.fugu, 1);
        yield* say(T.SK_FUGU);
      } else {
        setFlag(SF.esa, flag(SF.esa) + 1);
        yield* say(T.SK_HARI);
        p.caught = null;
        p.floatOn = false;
        p.phase = 'idle';
        break;
      }
      // 4 ぬらして 返す
      yield* say3(T.SK_NURASU);
      yield* kaesu(p);
      yield* say3(T.SK_SUI);
      yield* say3(T.SK_KAZOE[k]);
      if (k === 0 && kita('npc_tamotsu') && !flag(SF.opi)) {
        setFlag(SF.opi, 1);
        yield* say3(T.SK_OPI_B);
      }
    }
    return true;
  } finally {
    yield* closeUki(p);
  }
}

// ================================================================ 子どもたちが 見に 来る

/** 走って 来た 子ども（もとの 所に もどすため）。 */
let came: { a: Actor; x: number; y: number; dir: Actor['dir'] }[] = [];

function kidSpots(): [number, number][] {
  const f = field();
  if (!f) return [];
  const busy = new Set<string>();
  for (const a of [f.player, f.follower, ...f.actors]) if (a && a.visible && !KIDS.includes(a.id)) busy.add(`${a.tileX},${a.tileY}`);
  return KID_SPOTS.filter(([x, y]) => !busy.has(`${x},${y}`)).slice(0, 3);
}

function* kidsCome(): Co {
  const f = field();
  if (!f || came.length) return;
  const spots = kidSpots();
  const runs: Co[] = [];
  KIDS.forEach((id, i) => {
    const a = f.actorById(id);
    const to = spots[i];
    if (!a || !to) return;
    came.push({ a, x: a.x, y: a.y, dir: a.dir });
    a.data.scripted = true;
    // up onto the walkway (y31), along it, then down into their place by the sea
    runs.push(walk(id, [[a.tileX, 31], [to[0], 31], to], { speed: 3, face: 'up' }));
  });
  for (const r of runs) game.scripts.run(r);
}

function kidsBack(): void {
  for (const c of came) {
    const a = c.a;
    if (!field()?.actors.includes(a)) continue;
    game.scripts.run(
      (function* (): Co {
        yield* walk(a.id, [[a.tileX, 31], [Math.floor(c.x / 16), 31], [Math.floor(c.x / 16), Math.floor((c.y - 16) / 16)]], { speed: 2.4 });
        a.x = c.x;
        a.y = c.y;
        a.dir = c.dir;
        delete a.data.scripted;
      })(),
    );
  }
  came = [];
}

// ================================================================ 台本

/** 〔sakana〕：resume は 大写しを 途中で やめた あとの 続き。 */
function* sakana(resume: boolean): Co {
  const f = field();
  const t = f?.actorById(TSURI);
  if (f && t) faceToward(f.player, t);
  game.scripts.run(kidsCome());
  try {
    if (!resume) {
      setFlag(SF.start, 1);
      se('se_tsuri_tsun', { vol: 0.4 });
      yield* say3(T.SK_NAMI);
      if (kita('npc_tamotsu')) yield* say3(T.SK_OPI_A);
      yield* say(T.SK_PIKU);
      yield* say3(T.SK_SANKAI);
      if (knWith()) {
        // ツリノが えさを つけながら、グソっ君の 足を じっと 見る
        const kn = f?.follower;
        if (t && kn) faceToward(t, kn);
        yield 700;
        yield* say(T.SK_ASHI);
        if (t) t.dir = 'down';
      } else yield* say3(T.SK_ESA_SOLO);
    } else yield* say3(T.SK_TSUZUKI);
    const ok = yield* fishing();
    if (!ok) {
      yield* say3(T.SK_YAME);
      return;
    }
    // 5 魚の 昼
    yield* say(T.SK_HIRU);
    setFlag(SF.done, 1);
    addMp(2);
    se('se_item');
    yield* say3(T.SK_REWARD);
  } finally {
    kidsBack();
  }
}

wrap(TSURI, function* (_ctx, orig): Co {
  // (the cut line from S09 goes back first, as before)
  if (!onMap(UMIZOI) || state.inventory.includes('item_c3_shikake')) {
    yield* orig();
    return;
  }
  if (skOpen()) {
    if (flag(SF.done)) yield* say3(T.SK_AGAIN);
    else yield* sakana(flag(SF.start) > 0);
    return;
  }
  // 段階1：2回目に 話すと 浮きの 1行（1回）
  if (inCh3() && !pgOn() && c3Stage() === 1 && flag('flag_seen_npc_c3_tsuri_c1_1') > 0 && !flag(SF.c1)) {
    setFlag(SF.c1, 1);
    yield* say(T.SK_C1);
    return;
  }
  yield* orig();
});

// かくし：クサフグの あと、グソっ君に もう一度 話す（1回。段階2 の 防波堤）
wrap(`kanenari_${UMIZOI}`, function* (_ctx, orig): Co {
  if (skOpen() && flag(SF.fugu) && !flag(SF.knFugu) && knWith()) {
    setFlag(SF.knFugu, 1);
    yield* say(T.SK_KN_FUGU);
    return;
  }
  yield* orig();
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.sakana(step = 'start', auto = false)
 *   'start'  段階2、S13 の あと。ツリノ (21,32) の 東 (22,32) 左向き（話すと〔sakana〕。頭に「！」）
 *   'far'    同じ、S13 の あと 操作が もどる 所 (30,32)（遠くから「！」が 見えるか）
 *   'fugu'   1回目（アジ）の あと。ツリノの 前 (22,32)（話すと 続き → フグから）
 *   'done'   済んだ あと（ツリノ「また 食うた」、グソっ君の かくし）
 *   'c1'     段階1、ツリノと 1回 話した あと (22,32)（もう 1回で 地の文）
 *   opi = true で おぴぃが 来ている
 */
if (import.meta.env.DEV) {
  registerDebug('sakana', (step = 'start', auto = false, opi = false) => {
    const s1 = step === 'c1';
    cmd().jump?.(s1 ? 'ch3:umizoi' : 'ch3:trap', true);
    for (const id of Object.values(SF)) setFlag(id, 0);
    qaAuto = !!auto;
    setFlag('flag_ch3_stage', s1 ? 1 : 2);
    setFlag('flag_ch3_kita_npc_tamotsu', opi ? 1 : 0);
    if (!flag('flag_ch3_bin_n')) setFlag('flag_ch3_bin_n', 1);
    const go = (x: number, y: number, d: string) => cmd().warp?.(UMIZOI, x, y, d);
    if (s1) {
      setFlag('flag_seen_npc_c3_tsuri_c1_1', 1);
      setFlag('flag_seen_npc_c3_tsuri_c1', 1);
      return go(22, 32, 'left');
    }
    if (step === 'far') return go(30, 32, 'down');
    if (step === 'start') return go(22, 32, 'left');
    setFlag(SF.start, 1);
    setFlag(SF.rule, 1);
    setFlag(SF.n, 1);
    setFlag(SF.aji, 1);
    setFlag(SF.esa, 2);
    if (step === 'fugu') return go(22, 32, 'left');
    setFlag(SF.n, 3);
    setFlag(SF.fugu, 1);
    setFlag(SF.done, 1);
    return go(22, 32, 'left');
  });

  registerDebug('skState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(SF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof UkiPanel) as UkiPanel | undefined;
    const f = field();
    return {
      flags,
      open: skOpen(),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      kids: KIDS.map((id) => {
        const a = f?.actorById(id);
        return a ? [a.tileX, a.tileY] : null;
      }),
      panel: p ? { phase: p.phase, dip: p.dip, caught: p.caught, count: p.count } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no 天丼; no clock time; no さん in the narration. */
export function skTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', '海の ぬしは', '気が 長い', 'ピッ！', 'あ、つい', 'おかわり、あるよ', 'もう 1杯', 'ほどよいなぁ', '暗くて しめった', '本日も、休館', '干しすぎ', '毒'];
  const walkT = (name: string, v: unknown) => {
    if (typeof v === 'string') {
      if (!v.includes('\n') && !v.startsWith('@')) return;
      let lines: string[] = [];
      let who = '';
      const flush = () => {
        if (!lines.length) return;
        pages++;
        if (lines.length > 3) bad.push(`${name}: ${lines.length} lines`);
        lines = [];
      };
      for (const raw of v.split('\n')) {
        const t = raw.trim();
        if (t.startsWith('@') || t === '/' || !t) {
          flush();
          if (t.startsWith('@')) who = t.slice(1);
          continue;
        }
        const plain = raw.replace(/\{[^}]*\}/g, '');
        if (measure(plain) > 336) bad.push(`${name}: ${measure(plain)}px: ${plain}`);
        for (const b of BANNED) if (plain.includes(b)) bad.push(`${name}: 「${b}」: ${plain}`);
        if (/\d+:\d\d/.test(plain)) bad.push(`${name}: time: ${plain}`);
        if ((who === 'narr' || who === 'sys') && plain.includes('さん')) bad.push(`${name}: 地の文の さん: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('sk', T.SK_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of [...SK_UI.keys, SK_UI.caught]) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  if (measure(SK_UI.count(3)) + 4 > 56) bad.push('数が 印に かかる');
  if (KEYS_Y + SK_UI.keys.length * 16 > CH) bad.push(`keys: bottom ${KEYS_Y + SK_UI.keys.length * 16} > ${CH}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('skText', () => skTextCheck());
