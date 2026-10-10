// 堆肥の 中の 親戚（第2章。2026-10-10 依頼主の採用と 変更：げむきか 10/10 の 案2 →「カブトムシの 幼虫を
// 見つける ミニゲーム」。02_ch2_index #97、50 10.32、52 7.13）。文は data/text/hoshi_taihi.ts、
// 絵は art/props/taihi_art.ts、みました帳の ページは ui/menu/book_taihi.ts。
//
//   段階1〜2、トマトの 灯り、グソっ君が いっしょ：
//   ・堆肥舎の 張り紙（obj_hr_taihi_harigami）：いつもの 文の あと グソっ君「マサルに 聞いてみよ」（flag_taihi_hari）。
//   ・マサル〔taihi〕（flag_taihi_ask。その 人の 物語が 先）：古い 山の 住人を 数えて こい。手で 掘れ。
//   ・古い 山（obj_hr_taihi_yama）→ 大写し「古い 山の 断面」（TaihiPanel 'dig'）：11×5 の 山の 断面。
//     十字で 灯りを 動かすと、灯りの 中だけ 表面の つぶつぶ（幼虫の ふん）が 見える（近くに いる 数ほど 多い）。
//     けってい で 手で 掘る。幼虫なら「1ぴき！」→ けってい で そっと もどす。上の 段は かわいて いない、
//     湯気の 所（芯）は 熱くて いない（掘ると「あつっ」、いちども 掘らなければ『ていねい』flag_taihi_teinei）。
//     6ぴき もどすと おわり（flag_taihi_found）。もどる ボタンで やめられる（その 回の 分は 数えない）。
//   ・マサル〔kodomo〕（flag_taihi_gen）：「……カブトムシの 子だ。」
//   ・フォーク（obj_hr_taihi_fork）→ 大写し「温度計の 山」（TaihiPanel 'kaeshi'）：4回 すくう。湯気が ふわっと
//     上がった 所で けってい。4回 そろうと『湯気 名人』（flag_taihi_yuge）。→ 朱肉 +2（flag_taihi_done）、
//     みました帳②の すみ『堆肥の 山の 住人』。
//   ・そのあと：ペロ・トマじい（1回ずつ。ページの まわる 絵）、2つの 名人で マサル（朱肉 +1）、古い 山を
//     調べると 地の文と グソっ君（1回）。段階0 は 古い 山で グソっ君「しゅんが 見えへんやろ」（1回）。
//
// この ファイルは ch2/index.ts で 店番（tenban）より 前に import する：あとから 包む ほかの 寄り道の 用
// （耳の あいさつの マサル〔mimi〕など）が 先に 出る。
//
// QA：__game.cmd.taihi(step, stage, auto)、taihiState()、taihiText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, hasItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/hoshi_taihi';
import { KAESHI_N, TAIHI_N } from '../../data/text/hoshi_taihi';
import { frass, larva } from '../../art/props/taihi_art';
import { kaneHead } from '../../art/props/mimi_art';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { HF } from '../hunting';
import { se } from './compat';
import { hStage, lanternOn } from './common';
import { WF } from './wakime';

export const TH = {
  /** 張り紙の あとの グソっ君（1回）。 */
  hari: 'flag_taihi_hari',
  /** マサル〔taihi〕。 */
  ask: 'flag_taihi_ask',
  /** 6ぴき 見つけて もどした。 */
  found: 'flag_taihi_found',
  /** 湯気の 所を いちども 掘らなかった。 */
  teinei: 'flag_taihi_teinei',
  /** マサル〔kodomo〕。 */
  gen: 'flag_taihi_gen',
  /** 切り返しが すんだ（朱肉 +2、ページ）。 */
  done: 'flag_taihi_done',
  /** 4回 そろった。 */
  yuge: 'flag_taihi_yuge',
  /** 2つの 名人：マサル（朱肉 +1）。 */
  meijin: 'flag_taihi_meijin',
  /** ペロ・トマじい（ページの まわる 絵）。 */
  pero: 'flag_taihi_pero',
  tome: 'flag_taihi_tome',
  /** 古い 山の グソっ君（できあがった あと 1回）・段階0 の 1行。 */
  afterKane: 'flag_taihi_after_kane',
  h0: 'flag_taihi_h0',
  /** 湯気の 所を 掘った ときの 地の文（1回）。 */
  hotSaid: 'flag_taihi_hot_said',
} as const;

function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower?.visible && state.party.some((m) => m.id === 'kanenari');
}

/** 段階1〜2、トマトの 灯りを 持っている あいだ。 */
function nightOn(): boolean {
  const s = hStage();
  return s >= 1 && s <= 2 && lanternOn();
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

function* say(text: string): Co<number> {
  return yield* runMsg(text);
}

/** その 人の 物語が 先（mimi.ts の storyFirst と 同じ 見方）。 */
function genStoryFirst(): boolean {
  if (!flag('flag_ch2_got_tomato')) return true;
  return !flag('flag_ch2_met_gen') || !flag('flag_ch2_gate_open') || flag('flag_ch2_barn_work_on') > 0;
}
function tomeStoryFirst(): boolean {
  if (state.taken['sym_hoshi_03'] && state.taken['sym_hoshi_06'] && !flag('flag_seen_npc_hoshi_tome_kacho_done')) return true;
  if (flag('flag_ch2_sawa_wait')) return true;
  if (hasItem('item_namae_ishi') && !flag('flag_ch2_sawa_ishi')) return true;
  if (!flag('flag_ch2_maru_told') && (flag('flag_maru_dengon') || flag('flag_met_maru')) && (flag('flag_seen_npc_hoshi_tome_h0_2') || hStage() >= 1)) return true;
  return flag('flag_ch2_got_otsukare') > 0 && !flag('flag_ch2_sawa_open');
}
function peroStoryFirst(): boolean {
  if (!flag('flag_ch2_house_exit')) return true;
  // 脇芽（wakime.ts）の 頼みと 報告、ハンチング（hunting.ts）の 用が 先
  const heard = flag('flag_seen_npc_hoshi_mitsu_h1_1') || flag('flag_seen_npc_hoshi_mitsu_h2_1');
  if (flag(WF.done) && !flag(WF.report)) return true;
  if (!flag(WF.ask) && heard) return true;
  if (flag(HF.got) && !flag(HF.on)) return true;
  if (flag(HF.boushi) && !flag(HF.ask)) return true;
  if (flag(HF.ask) && !flag(HF.got) && !flag(HF.hint)) return true;
  return false;
}

// ================================================================ 大写し

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 山の 断面：11×5 の マス（1マス 18×15）。 */
const COLS = 11;
const ROWS = 5;
const CEL_W = 18;
const CEL_H = 15;
const HX = SX + 6;
const HY = SY + 16;
const HEAP_W = COLS * CEL_W;
const HEAP_H = ROWS * CEL_H;
/** 山の 輪郭（だ円の 上半分。中心は 床の 少し 下）。 */
const MOUND = { cx: HEAP_W / 2, cy: HEAP_H + 2, rx: 100, ry: 76 };
/** 右の 列。 */
const RX = HX + HEAP_W + 8;

type Cell = 'out' | 'dry' | 'soil' | 'hot';

/** 山の 形：マスの まん中が 輪郭の 中。上の 段は かわいた 皮、下の まん中は 湯気の 芯。 */
function cellKind(c: number, r: number): Cell {
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return 'out';
  const x = (c * CEL_W + CEL_W / 2 - MOUND.cx) / MOUND.rx;
  const y = (r * CEL_H + CEL_H / 2 - MOUND.cy) / MOUND.ry;
  if (x * x + y * y > 1) return 'out';
  if (r === 0) return 'dry';
  if ((r === 3 && c === 5) || (r === 4 && c >= 4 && c <= 6)) return 'hot';
  return 'soil';
}

/** The mound's top edge at heap-local x (px from the heap's top). */
function moundTop(x: number): number {
  const d = (x - MOUND.cx) / MOUND.rx;
  if (Math.abs(d) >= 1) return HEAP_H;
  return Math.max(0, MOUND.cy - MOUND.ry * Math.sqrt(1 - d * d));
}

type DigPhase = 'aim' | 'dig' | 'back' | 'talk' | 'done';
type KaeshiPhase = 'wait' | 'scoop' | 'done';

export class TaihiPanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  open = 0;
  mode: 'dig' | 'kaeshi';
  // ---- dig
  phase: DigPhase = 'talk';
  cx = 5;
  cy = 1;
  larvae = new Set<number>();
  dug = new Set<number>();
  /** もどした 所。 */
  back = new Set<number>();
  found = 0;
  digs = 0;
  hot = 0;
  /** いま 手の 上の 1ぴき（マスの 番号）と、もどす 動き（ms）。 */
  holding = -1;
  digT = 0;
  backT = 0;
  // ---- kaeshi
  kPhase: KaeshiPhase = 'wait';
  scoops: boolean[] = [];
  scoopT = 0;
  /** 湯気の 波（0..1 の 位相）。 */
  steam = 0;
  burst = 0;
  auto = false;
  mood: 'normal' | 'happy' | 'sad' = 'normal';
  moodT = 0;
  words: { text: string; x: number; y: number; t: number; ms: number; color?: string }[] = [];
  private ePress = false;
  private eCancel = false;

  constructor(mode: 'dig' | 'kaeshi') {
    this.mode = mode;
    if (mode === 'dig') this.placeLarvae();
  }

  static idx(c: number, r: number): number {
    return r * COLS + c;
  }

  placeLarvae(): void {
    const spots: number[] = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (cellKind(c, r) === 'soil') spots.push(TaihiPanel.idx(c, r));
    this.larvae.clear();
    while (this.larvae.size < TAIHI_N) {
      const i = spots[Math.floor(Math.random() * spots.length)];
      // not three in a row of neighbours: each one still has its own trail of frass to follow
      const c = i % COLS;
      const r = Math.floor(i / COLS);
      let near = 0;
      for (const j of this.larvae) if (Math.abs((j % COLS) - c) <= 1 && Math.abs(Math.floor(j / COLS) - r) <= 1) near++;
      if (near >= 2) continue;
      this.larvae.add(i);
    }
  }

  /** 表面の つぶつぶ：まわり 3×3 に いる 数（もどした 子も 数える）。 */
  frassAt(c: number, r: number): number {
    if (cellKind(c, r) === 'hot' || cellKind(c, r) === 'out') return 0;
    let n = 0;
    for (const j of this.larvae) if (Math.abs((j % COLS) - c) <= 1 && Math.abs(Math.floor(j / COLS) - r) <= 1) n++;
    return n;
  }

  take(): boolean {
    const v = this.ePress;
    this.ePress = false;
    return v;
  }
  cancelled(): boolean {
    const v = this.eCancel;
    this.eCancel = false;
    return v;
  }
  clearInput(): void {
    this.ePress = false;
    this.eCancel = false;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    this.words = this.words.filter((w) => (w.t += dt) < w.ms);
    if (this.moodT > 0) {
      this.moodT -= dt;
      if (this.moodT <= 0) this.mood = 'normal';
    }
    if (input.pressed('confirm')) this.ePress = true;
    if (input.pressed('cancel')) this.eCancel = true;
    if (this.digT > 0) this.digT = Math.max(0, this.digT - dt);
    if (this.backT > 0) this.backT = Math.max(0, this.backT - dt);
    if (this.mode === 'dig' && this.phase === 'aim' && !this.auto) {
      let dx = 0;
      let dy = 0;
      if (input.repeat('left')) dx = -1;
      else if (input.repeat('right')) dx = 1;
      else if (input.repeat('up')) dy = -1;
      else if (input.repeat('down')) dy = 1;
      if (dx || dy) this.move(dx, dy);
    }
    if (this.mode === 'kaeshi') {
      this.steam = (this.steam + dt / STEAM_MS) % 1;
      if (this.scoopT > 0) this.scoopT = Math.max(0, this.scoopT - dt);
      if (this.burst > 0) this.burst = Math.max(0, this.burst - dt);
    }
  }

  /** 灯りを 1マス 動かす（山の 外へは 出ない。外なら その 向きの 次の 中の マスへ）。 */
  move(dx: number, dy: number): void {
    let c = this.cx + dx;
    let r = this.cy + dy;
    if (r < 0 || r >= ROWS) return;
    if (dy) {
      // up / down: keep the column if it is in that row, else the nearest one that is
      let best = -1;
      for (let j = 0; j < COLS; j++) if (cellKind(j, r) !== 'out' && (best < 0 || Math.abs(j - c) < Math.abs(best - c))) best = j;
      c = best;
    }
    if (c < 0 || c >= COLS || cellKind(c, r) === 'out') return;
    this.cx = c;
    this.cy = r;
    se('se_cursor', { pitch: 0.8, vol: 0.25 });
  }

  word(text: string, x: number, y: number, ms = 800, color?: string): void {
    this.words.push({ text, x, y, t: 0, ms, color });
  }

  setMood(m: 'happy' | 'sad', ms = 900): void {
    this.mood = m;
    this.moodT = ms;
  }

  draw(g: Gfx): void {
    if (this.open <= 0) return;
    const k = ease.cubicOut(Math.min(1, this.open));
    const a = Math.min(1, this.open * 1.4);
    const dy = Math.round((1 - k) * -10);
    markText(PX, PY, PW, PH);
    drawWindow(g, PX, PY + dy, PW, PH, UI, a, { curl: false });
    g.alpha(a, () => {
      g.clip(SX, SY + dy, CW, CH, () => {
        g.rect(SX, SY + dy, CW, CH, '#2A2236');
        if (this.mode === 'dig') this.drawDig(g, dy);
        else this.drawKaeshi(g, dy);
        this.drawSide(g, dy);
      });
      const name = this.mode === 'dig' ? T.TAIHI_UI.place : T.TAIHI_UI.placeKaeshi;
      const tw = g.measure(name) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, name, { seed: 53 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
    for (const w of this.words) {
      const p = w.t / w.ms;
      const yy = Math.round(SY + w.y - p * 6);
      const al = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
      g.text(w.text, SX + w.x, yy, { color: w.color ?? UI.bg, outline: UI.border, align: 'center', alpha: al });
      markText(SX + w.x - 32, yy, 64, 16, true);
    }
  }

  /** The heap cut open: dry crust on top, dark settled compost, the steaming core at the bottom middle. */
  private drawDig(g: Gfx, dy: number): void {
    const oy = HY + dy;
    // the barn floor under the heap
    g.rect(SX, oy + HEAP_H, CW, CH, '#3A3040');
    g.rect(HX - 4, oy + HEAP_H, HEAP_W + 8, 2, '#5A4636');
    const lit = (c: number, r: number) => this.phase !== 'done' && this.phase !== 'talk' && Math.abs(c - this.cx) <= 1 && Math.abs(r - this.cy) <= 1;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const kind = cellKind(c, r);
        if (kind === 'out') continue;
        const x = HX + c * CEL_W;
        const y = oy + r * CEL_H;
        const i = TaihiPanel.idx(c, r);
        const on = lit(c, r);
        // in the lantern's light the compost shows its colour (and the frass on it)
        const base = kind === 'dry' ? (on ? '#B0926A' : '#7A6046') : kind === 'hot' ? (on ? '#A4553A' : '#7A3A26') : on ? (r <= 1 ? '#8A6A4E' : '#7A5A40') : r <= 1 ? '#4E3828' : '#423024';
        g.rect(x, y, CEL_W, CEL_H, base);
        // a little texture: sawdust flecks
        if ((c * 7 + r * 3) % 3 === 0) g.rect(x + 3 + ((c + r) % 4) * 3, y + 4 + ((c * 5) % 3) * 2, 2, 1, kind === 'dry' ? '#C8AC84' : on ? '#A88A64' : '#5A4434');
        if (kind === 'hot') {
          // the core: a warm glow
          const s = Math.sin(this.t / 300 + c) * 0.5 + 0.5;
          g.rect(x + 2, y + 2, CEL_W - 4, CEL_H - 4, '#C8603A', 0.3 + s * 0.3);
        }
        if (this.dug.has(i)) {
          // an open hole
          g.rect(x + 3, y + 3, CEL_W - 6, CEL_H - 5, '#1E1620');
          if (this.back.has(i)) {
            // put back: a soft mound and a pale dot (the one asleep under it)
            g.rect(x + 3, y + 6, CEL_W - 6, CEL_H - 8, on ? '#7A5A40' : '#4E3828');
            g.rect(x + 8, y + 8, 2, 2, '#F4EEDC');
          }
        }
        // the frass on the face, only where the light is (and by an open hole)
        if ((on || this.dug.has(i)) && kind !== 'hot') {
          const n = this.frassAt(c, r);
          if (n > 0) g.img(frass(n, i), x, y + 1);
        }
      }
    // cut the steps off along the mound's round top (the panel's back colour over the corners)
    for (let x = 0; x < HEAP_W; x += 2) {
      const top = Math.round(moundTop(x + 1));
      if (top > 0) g.rect(HX + x, oy, 2, top, '#2A2236');
    }
    // steam over the core
    for (let j = 0; j < 3; j++) {
      const p = (this.t / 1400 + j / 3) % 1;
      const sx = HX + 5 * CEL_W + 8 + Math.round(Math.sin(p * 6 + j) * 6);
      const sy = oy + 3 * CEL_H - p * 34;
      g.rect(sx, Math.round(sy), 3, 2, '#E8E4F0', (1 - p) * 0.55);
    }
    // the lantern's glow and the cursor
    if (this.phase === 'aim' || this.phase === 'dig') {
      const x = HX + this.cx * CEL_W;
      const y = oy + this.cy * CEL_H;
      g.alpha(0.12, () => g.circle(x + CEL_W / 2, y + CEL_H / 2, 30, '#FFB070'));
      const blink = Math.floor(this.t / 300) % 2 === 0;
      g.frame(x - 1, y - 1, CEL_W + 2, CEL_H + 2, blink ? '#FFE7A3' : '#F2894B');
      if (this.phase === 'dig') {
        // a hand scooping (an ochre dot and a crumb going up)
        const p = 1 - this.digT / DIG_MS;
        g.rect(x + 5 + Math.round(p * 6), y + 5 - Math.round(p * 6), 3, 3, '#D49A5C');
        g.rect(x + 10 - Math.round(p * 4), y + 7 - Math.round(p * 8), 2, 2, '#6E5440');
      }
    }
    // the one in hand: up over its hole, 2×, wiggling; going back down while backT runs
    if (this.holding >= 0) {
      const c = this.holding % COLS;
      const r = Math.floor(this.holding / COLS);
      // (kept inside the heap's width: not over the right column)
      const x = Math.max(HX, Math.min(HX + HEAP_W - 32, HX + c * CEL_W + CEL_W / 2 - 16));
      const lift = this.backT > 0 ? Math.round((this.backT / BACK_MS) * 22) : 22;
      const y = oy + r * CEL_H - lift + 2;
      const img = larva(Math.floor(this.t / 260));
      g.alpha(this.backT > 0 ? Math.min(1, this.backT / 200) : 1, () => g.img(img, x, y, { scale: 2 }));
    }
    // the legend under the heap: frass = near, steam = hot
    const ly = oy + HEAP_H + 4;
    g.rect(HX, ly + 2, 16, 12, '#8A6A4E');
    g.img(frass(2, 3), HX - 1, ly + 1);
    g.text(T.TAIHI_UI.legend[0], HX + 20, ly, { color: UI.bg });
    const lx = HX + 20 + measure(T.TAIHI_UI.legend[0]) + 12;
    g.rect(lx + 2, ly + 9, 3, 2, '#E8E4F0');
    g.rect(lx + 5, ly + 5, 3, 2, '#E8E4F0');
    g.rect(lx + 3, ly + 1, 3, 2, '#E8E4F0');
    g.text(T.TAIHI_UI.legend[1], lx + 12, ly, { color: UI.bg });
  }

  /** The thermometer heap: a fork, the steam rising and falling; four scoops. */
  private drawKaeshi(g: Gfx, dy: number): void {
    const oy = SY + dy;
    const base = oy + CH - 18;
    g.rect(SX, base, CW, CH, '#3A3040');
    g.rect(SX, base, CW, 2, '#5A4636');
    const done = this.scoops.length;
    // a heap as a half ellipse, drawn in 2px strips: the crust, the dark body, the hot heart
    const heap = (cx: number, rx: number, ry: number, col: string) => {
      for (let x = -rx; x < rx; x += 2) {
        const d = (x + 1) / rx;
        const h = Math.round(ry * Math.sqrt(Math.max(0, 1 - d * d)));
        if (h > 0) g.rect(cx + x, base - h, 2, h, col);
      }
    };
    const hx = HX + 70;
    const rx = 66 - done * 6;
    const ry = 58 - done * 6;
    heap(hx, rx, ry, '#6E5440');
    heap(hx, rx - 3, ry - 3, '#4A3426');
    const glow = 0.55 + Math.sin(this.t / 260) * 0.15;
    g.alpha(glow, () => heap(hx, Math.round(rx * 0.55), Math.round(ry * 0.55), '#A8502E'));
    g.alpha(glow * 0.8, () => heap(hx, Math.round(rx * 0.3), Math.round(ry * 0.3), '#E07A3A'));
    // the turned pile on the right, a little bigger each scoop
    if (done) {
      heap(HX + 168, 10 + done * 6, 6 + done * 5, '#6E5440');
      heap(HX + 168, 8 + done * 6, 4 + done * 5, '#5A4030');
    }
    // the thermometer stuck in the heap
    const tx = hx + 18;
    g.rect(tx, base - ry - 12, 2, 40, '#C8C8D0');
    g.circle(tx + 1, base - ry - 13, 3, '#E8E4F0');
    g.rect(tx, base - ry - 2, 2, 6, '#D9483A');
    // the steam: a column over the heap that swells at the top of each wave (when to scoop)
    const s = steamAt(this.steam);
    const puff = Math.max(s, this.burst / 600);
    for (let j = 0; j < 9; j++) {
      const p = (this.t / 1000 + j / 9) % 1;
      const sx = hx - 16 + j * 4 + Math.round(Math.sin(p * 5 + j) * (3 + puff * 8));
      const sy = base - ry + 2 - p * (14 + puff * 30);
      const w = 2 + Math.round(puff * 4);
      g.rect(sx, Math.round(sy), w, 2, '#F0ECF6', (1 - p) * (0.3 + puff * 0.65));
    }
    if (s > 0.6) g.text('ふわっ', hx + 54, base - ry - 18 + Math.round((1 - s) * 8), { color: '#FFE7A3', align: 'center', outline: UI.border });
    // the fork: raised while scooping, a clod on its tines
    const up = this.scoopT > 0 ? Math.sin((1 - this.scoopT / SCOOP_MS) * Math.PI) : 0;
    const fx = hx + rx - 18 + Math.round(up * 36);
    const fy = base - 22 - Math.round(up * 26);
    g.line(fx + 2, fy - 2, fx + 30, fy - 30, '#8A5A3A');
    g.line(fx + 3, fy - 2, fx + 31, fy - 30, '#6A4228');
    g.rect(fx - 4, fy - 2, 10, 2, '#C8C8D0');
    for (let i = 0; i < 4; i++) g.rect(fx - 4 + i * 3, fy, 1, 8, '#C8C8D0');
    if (up > 0) g.circle(fx + 1, fy + 5, 5, '#4A3426');
  }

  /** The right column: グソっ君's head, the count, what to press. */
  private drawSide(g: Gfx, dy: number): void {
    const oy = SY + dy;
    g.img(kaneHead('side', this.mood), RX, oy + 2);
    const tx = RX + 44;
    if (this.mode === 'dig') {
      const [a, b] = T.TAIHI_UI.found(this.found).split(' ');
      g.text(a, tx, oy + 4, { color: UI.bg });
      g.text(b, tx, oy + 20, { color: this.found >= TAIHI_N ? '#FFB070' : UI.bg });
      // the six: filled when put back
      for (let i = 0; i < TAIHI_N; i++) {
        const x = RX + i * 13;
        if (i < this.found) g.img(larva(0), x, oy + 44);
        else g.frame(x + 2, oy + 46, 10, 7, UI.bg2);
      }
      g.text(T.TAIHI_UI.left(TAIHI_N - this.found), RX, oy + 58, { color: UI.bg });
      const keys = this.phase === 'back' ? ['けってい', T.TAIHI_UI.back.replace('けってい ', '')] : T.TAIHI_UI.keys;
      g.text(keys[0], RX, oy + 78, { color: '#FFE7A3' });
      g.text(keys[1], RX, oy + 94, { color: '#FFE7A3' });
    } else {
      const [a, b] = T.TAIHI_UI.kaeshi(this.scoops.length).split(' ');
      g.text(a, tx, oy + 4, { color: UI.bg });
      g.text(b, tx, oy + 20, { color: UI.bg });
      for (let i = 0; i < KAESHI_N; i++) {
        const x = RX + 4 + i * 14;
        const v = this.scoops[i];
        if (v === undefined) g.frame(x, oy + 46, 9, 9, UI.bg2);
        else g.rect(x, oy + 46, 9, 9, v ? '#FFB070' : '#8A8070');
      }
      g.text(T.TAIHI_UI.kaeshiKeys[0], RX, oy + 78, { color: '#FFE7A3' });
      g.text(T.TAIHI_UI.kaeshiKeys[1], RX, oy + 94, { color: '#FFE7A3' });
    }
    markText(RX, oy, SX + CW - RX, CH);
  }
}

const DIG_MS = 320;
const BACK_MS = 520;
const STEAM_MS = 1300;
const SCOOP_MS = 420;

/** The steam's swell over one wave (0..1): it puffs up near the middle of the wave. */
function steamAt(ph: number): number {
  const d = Math.abs(ph - 0.5);
  return d < 0.2 ? 1 - d / 0.2 : 0;
}
/** そろった：the swell's top third. */
const GOOD = 0.14;

// ================================================================ 古い 山（さがす）

let qaAuto = false;

function* openPanel(p: TaihiPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: TaihiPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

/** QA：灯りを 次の 1ぴきへ（1マスずつ）。着いたら true。 */
function autoStep(p: TaihiPanel): boolean {
  const left = [...p.larvae].filter((i) => !p.dug.has(i));
  if (!left.length) return true;
  const i = left[0];
  const c = i % COLS;
  const r = Math.floor(i / COLS);
  if (p.cy !== r) p.move(0, Math.sign(r - p.cy));
  else if (p.cx !== c) p.move(Math.sign(c - p.cx), 0);
  return p.cx === c && p.cy === r;
}

/** Talk over the open panel (the window below; the panel stays). */
function* talk(p: TaihiPanel, text: string): Co {
  const was = p.phase;
  p.phase = 'talk';
  yield* say(text);
  p.phase = was;
  p.clearInput();
}

function* digOne(p: TaihiPanel): Co<'found' | 'none'> {
  const i = TaihiPanel.idx(p.cx, p.cy);
  const kind = cellKind(p.cx, p.cy);
  const wx = (p.cx + 0.5) * CEL_W + (HX - SX);
  const wy = p.cy * CEL_H + (HY - SY) - 4;
  if (p.dug.has(i)) {
    p.word(T.TAIHI_UI.dugAlready, wx, wy, 600, UI.bg2);
    return 'none';
  }
  p.phase = 'dig';
  p.digT = DIG_MS;
  se('se_step_stone', { pitch: 0.7, vol: 0.5 });
  yield DIG_MS;
  p.dug.add(i);
  p.digs++;
  p.phase = 'aim';
  if (kind === 'hot') {
    p.hot++;
    p.setMood('sad');
    p.word(T.TAIHI_UI.hot, wx, wy, 900, '#F2894B');
    se('se_cursor', { pitch: 0.6, vol: 0.5 });
    if (!flag(TH.hotSaid)) {
      setFlag(TH.hotSaid, 1);
      yield 300;
      yield* talk(p, T.TAIHI_HOT);
    }
    return 'none';
  }
  if (kind === 'dry') {
    p.word(T.TAIHI_UI.dry, wx, wy, 800, UI.bg2);
    return 'none';
  }
  if (!p.larvae.has(i)) {
    p.word(T.TAIHI_UI.none, wx, wy, 700, UI.bg2);
    return 'none';
  }
  // one of them: up in the hand, then put back with a press
  p.holding = i;
  p.phase = 'back';
  p.setMood('happy', 1400);
  p.word(T.TAIHI_UI.one, wx, wy - 18, 1000, '#FFE7A3');
  se('se_pen_write', { pitch: 1.5, vol: 0.5 });
  const nth = p.found + 1;
  yield 400;
  if (nth === 1) {
    yield* talk(p, T.TAIHI_FIRST);
    if (flag('flag_seen_obj_mushikago')) yield* talk(p, T.TAIHI_FIRST_GENJIRO);
    yield* talk(p, T.TAIHI_FIRST_AISATSU);
  } else if (nth === 2) yield* talk(p, T.TAIHI_SECOND);
  else if (nth === 4) yield* talk(p, T.TAIHI_FOURTH);
  p.phase = 'back';
  p.clearInput();
  let autoAt = p.t + 500;
  while (!p.take() && !(p.auto && p.t >= autoAt)) yield null;
  // put back, gently
  p.backT = BACK_MS;
  se('se_page', { pitch: 0.7, vol: 0.4 });
  yield BACK_MS;
  p.back.add(i);
  p.holding = -1;
  p.found++;
  p.phase = 'aim';
  if (nth === 1) yield* talk(p, T.TAIHI_FIRST_BACK);
  autoAt = p.t + 300;
  return 'found';
}

/** 古い 山を さがす。ぜんぶ もどせば true、やめたら false。 */
export function* digScene(): Co<boolean> {
  yield* say(T.TAIHI_GAME_START);
  const p = new TaihiPanel('dig');
  p.auto = qaAuto;
  let ok = false;
  try {
    yield* openPanel(p);
    yield* talk(p, T.TAIHI_RULE);
    p.phase = 'aim';
    p.clearInput();
    let autoAt = p.t + 300;
    while (p.found < TAIHI_N) {
      if (p.cancelled()) break;
      if (p.auto && p.t >= autoAt) {
        autoAt = p.t + 120;
        if (autoStep(p)) yield* digOne(p);
        yield null;
        continue;
      }
      if (p.take() && p.phase === 'aim') yield* digOne(p);
      yield null;
    }
    ok = p.found >= TAIHI_N;
    if (ok) {
      p.phase = 'done';
      yield 500;
    }
  } finally {
    yield* closePanel(p);
  }
  if (!ok) return false;
  setFlag(TH.found, 1);
  yield* say(T.TAIHI_ALL);
  if (p.hot === 0) {
    setFlag(TH.teinei, 1);
    yield* say(T.TAIHI_TEINEI);
  }
  return true;
}

// ================================================================ 温度計の 山（切り返し）

export function* kaeshiScene(): Co {
  yield* say(T.KAESHI_START);
  const p = new TaihiPanel('kaeshi');
  p.auto = qaAuto;
  try {
    yield* openPanel(p);
    yield* say(T.KAESHI_RULE);
    p.clearInput();
    while (p.scoops.length < KAESHI_N) {
      const pressed = p.take() || (p.auto && Math.abs(p.steam - 0.5) < 0.03);
      if (pressed && p.scoopT <= 0) {
        const d = p.steam - 0.5;
        const good = Math.abs(d) <= GOOD;
        p.scoops.push(good);
        p.scoopT = SCOOP_MS;
        p.burst = good ? 600 : 200;
        const wx = HX - SX + 140;
        if (good) {
          p.setMood('happy');
          p.word(T.TAIHI_UI.good, wx, 62, 800, '#FFE7A3');
          se('se_step_stone', { pitch: 0.9, vol: 0.6 });
        } else {
          p.word(d < 0 ? T.TAIHI_UI.early : T.TAIHI_UI.late, wx, 62, 800, UI.bg2);
          se('se_step_stone', { pitch: 0.6, vol: 0.5 });
        }
        yield SCOOP_MS;
        p.clearInput();
      }
      yield null;
    }
    p.kPhase = 'done';
    p.burst = 1200;
    yield 700;
  } finally {
    yield* closePanel(p);
  }
  const yuge = p.scoops.every((x) => x);
  yield* say(hStage() >= 2 ? T.KAESHI_DONE.h2 : T.KAESHI_DONE.h1);
  yield* say(T.KAESHI_KANE);
  if (yuge) {
    setFlag(TH.yuge, 1);
    yield* say(T.KAESHI_YUGE);
  }
  setFlag(TH.done, 1);
  addMp(2);
  se('se_item');
  yield* say(T.TAIHI_REWARD);
}

// ================================================================ the room and the people

wrap('obj_hr_taihi_harigami', function* (_ctx, orig): Co {
  yield* orig();
  if (!flag(TH.hari) && nightOn() && kanenariHere()) {
    setFlag(TH.hari, 1);
    yield* say(T.TAIHI_HARIGAMI);
  }
});

wrap('obj_hr_taihi_yama', function* (_ctx, orig): Co {
  const kane = kanenariHere();
  if (flag(TH.ask) && !flag(TH.found) && nightOn() && kane) {
    yield* digScene();
    return;
  }
  yield* orig();
  if (flag(TH.found) && hStage() <= 2) {
    yield* say(T.TAIHI_AFTER);
    if (!flag(TH.afterKane) && kane) {
      setFlag(TH.afterKane, 1);
      yield* say(T.TAIHI_AFTER_KANE);
    }
    return;
  }
  if (hStage() === 0 && kane && !lanternOn() && !flag(TH.h0)) {
    setFlag(TH.h0, 1);
    yield* say(T.TAIHI_H0);
  }
});

wrap('obj_hr_taihi_fork', function* (_ctx, orig): Co {
  if (flag(TH.gen) && !flag(TH.done) && nightOn() && kanenariHere()) {
    yield* kaeshiScene();
    return;
  }
  yield* orig();
});

wrap('npc_hoshi_gen', function* (_ctx, orig): Co {
  const ok = nightOn() && kanenariHere() && !genStoryFirst();
  if (ok && flag(TH.hari) && !flag(TH.ask)) {
    setFlag(TH.ask, 1);
    yield* say(T.TAIHI_ASK);
    return;
  }
  if (ok && flag(TH.found) && !flag(TH.gen)) {
    setFlag(TH.gen, 1);
    yield* say(T.TAIHI_GEN);
    return;
  }
  if (ok && flag(TH.done) && flag(TH.teinei) && flag(TH.yuge) && !flag(TH.meijin)) {
    setFlag(TH.meijin, 1);
    yield* say(T.TAIHI_GEN_MEIJIN);
    addMp(1);
    se('se_item');
    yield* say(T.TAIHI_MEIJIN_REWARD);
    return;
  }
  yield* orig();
});

wrap('npc_hoshi_mitsu', function* (_ctx, orig): Co {
  if (flag(TH.done) && !flag(TH.pero) && nightOn() && kanenariHere() && !peroStoryFirst()) {
    setFlag(TH.pero, 1);
    yield* say(T.TAIHI_PERO);
    se('se_pen_write', { pitch: 1.1 });
    return;
  }
  yield* orig();
});

wrap('npc_hoshi_tome', function* (_ctx, orig): Co {
  if (flag(TH.done) && !flag(TH.tome) && nightOn() && kanenariHere() && !tomeStoryFirst()) {
    setFlag(TH.tome, 1);
    yield* say(T.TAIHI_TOME);
    se('se_pen_write', { pitch: 1.1 });
    return;
  }
  yield* orig();
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.taihi(step = 'hari', stage = 1, auto = false)
 *   'hari'    堆肥舎の 張り紙の 前 (5,2) 北向き（調べると グソっ君）
 *   'ask'     張り紙の あと、マサルの となり（〔taihi〕）
 *   'dig'     〔taihi〕の あと、古い 山の 前 (3,4) 北向き（調べると 大写し。auto：自動で 掘る）
 *   'gen'     見つけた あと、マサルの となり（〔kodomo〕）
 *   'kaeshi'  〔kodomo〕の あと、フォークの 前 (4,3) 北向き（調べると 切り返し。auto：自動）
 *   'meijin'  2つの 名人で できあがった あと、マサルの となり
 *   'pero' 'tome'  できあがった あと、その 人の となり
 *   'after'   ぜんぶ した あと、古い 山の 前（ページは みました帳②の すみ）
 *   'h0'      段階0、古い 山の 前
 */
if (import.meta.env.DEV) {
  registerDebug('taihi', (step = 'hari', st = 1, auto = false) => {
    const sn = step === 'h0' ? 0 : Number(st);
    if (sn <= 0) cmd().jump?.('ch2:mitsu', true);
    else cmd().jump?.('ch2:houki', true);
    if (sn >= 2) {
      for (const id of ['flag_ch2_tetsuya_beaten', 'flag_ch2_houki_enter', 'flag_ch2_keitora_here']) setFlag(id, 1);
      state.taken['sym_hoshi_07'] = true;
      setFlag('flag_ch2_stage', 2);
    }
    for (const id of Object.values(TH)) setFlag(id, 0);
    qaAuto = !!auto;
    const room = (x: number, y: number) => cmd().warp?.('map_hoshi_taihisha', x, y, 'up');
    const gen = () => (sn >= 2 ? cmd().warp?.('map_hoshimidai', 49, 19, 'right') : cmd().warp?.('map_hoshi_barn', 19, 6, 'right'));
    if (step === 'hari') return room(5, 2);
    if (step === 'h0') return room(3, 4);
    setFlag(TH.hari, 1);
    if (step === 'ask') return gen();
    setFlag(TH.ask, 1);
    if (step === 'dig') return room(3, 4);
    setFlag(TH.found, 1);
    setFlag(TH.teinei, 1);
    if (step === 'gen') return gen();
    setFlag(TH.gen, 1);
    if (step === 'kaeshi') return room(4, 3);
    setFlag(TH.done, 1);
    setFlag(TH.yuge, 1);
    if (step === 'meijin') return gen();
    setFlag(TH.meijin, 1);
    if (step === 'pero') return cmd().warp?.('map_hoshimidai', 4, 32, 'left');
    if (step === 'tome') {
      // 沢の 頼み（トマじいの 物語）は すんだ ことに
      setFlag('flag_ch2_sawa_open', 1);
      return cmd().warp?.('map_hoshimidai', 20, 11, 'right');
    }
    setFlag(TH.pero, 1);
    setFlag(TH.tome, 1);
    return room(3, 4);
  });

  registerDebug('taihiState', () => {
    const p = game.ui.widgets.find((w) => w instanceof TaihiPanel) as TaihiPanel | undefined;
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(TH)) flags[k] = flag(id);
    return {
      flags,
      panel: p
        ? { mode: p.mode, phase: p.phase, cursor: [p.cx, p.cy], found: p.found, digs: p.digs, hot: p.hot, larvae: [...p.larvae], scoops: p.scoops, steam: Math.round(p.steam * 100) / 100 }
        : null,
    };
  });

  /** QA：大写しの 灯りを 動かす（dx, dy）か、マスへ（c, r, true）。 */
  registerDebug('taihiAim', (a = 0, b = 0, abs = false) => {
    const p = game.ui.widgets.find((w) => w instanceof TaihiPanel) as TaihiPanel | undefined;
    if (!p) return null;
    if (abs) {
      p.cx = Number(a);
      p.cy = Number(b);
    } else p.move(Number(a), Number(b));
    return [p.cx, p.cy];
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines; the close-up's words in their room. */
export function taihiTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足様', '平和', '17', '3人', 'らっきょ', 'ほどよい', 'ダンゴムシ', 'ワラジムシ', 'ミミズ', 'ハサミムシ', '等脚'];
  const walkT = (name: string, v: unknown) => {
    if (typeof v === 'string') {
      if (!v.includes('\n') && !v.startsWith('@')) return;
      let lines: string[] = [];
      const flush = () => {
        if (!lines.length) return;
        pages++;
        if (lines.length > 3) bad.push(`${name}: ${lines.length} lines`);
        lines = [];
      };
      for (const raw of v.split('\n')) {
        const t = raw.trim();
        if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || !t) {
          flush();
          continue;
        }
        const plain = raw.replace(/\{[^}]*\}/g, '');
        if (measure(plain) > 336) bad.push(`${name}: ${measure(plain)}px: ${plain}`);
        for (const b of BANNED) if (plain.includes(b)) bad.push(`${name}: 「${b}」: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('taihi', T.TAIHI_TEXTS);
  // the right column (from RX to the panel's edge) and the head's side (from RX + 44)
  const col = SX + CW - RX - 2;
  const side = SX + CW - (RX + 44) - 2;
  for (const l of [...T.TAIHI_UI.found(TAIHI_N).split(' '), ...T.TAIHI_UI.kaeshi(KAESHI_N).split(' ')]) if (measure(l) > side) bad.push(`ui: ${measure(l)}px > ${side}: ${l}`);
  for (const l of [T.TAIHI_UI.left(TAIHI_N), T.TAIHI_UI.left(0), ...T.TAIHI_UI.keys, T.TAIHI_UI.back.replace('けってい ', ''), ...T.TAIHI_UI.kaeshiKeys])
    if (measure(l) > col) bad.push(`ui: ${measure(l)}px > ${col}: ${l}`);
  // the legend under the heap
  const legend = 20 + measure(T.TAIHI_UI.legend[0]) + 10 + 12 + measure(T.TAIHI_UI.legend[1]);
  if (legend > RX - HX - 4) bad.push(`legend: ${legend}px > ${RX - HX - 4}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('taihiText', () => taihiTextCheck());
