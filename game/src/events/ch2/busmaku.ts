// 幕の 中の 停留所（第2章。げむきか 10/23 の 案4、2026-10-23 依頼主の 採用。02_ch2_index）。
// 文は data/text/hoshi_busmaku.ts、みました帳の ページは ui/menu/book_busmaku.ts。
//
//   h0〜h2（ボスの 前。クリア後の 夜は 足さない）。転回場の 村営バス obj_hoshi_bus (35–38,41–42)。
//   ・1回目に 調べると 今の 文（flag_bm_look）。2回目に〔maku〕（グソっ君が いっしょの とき）。
//   ・乗り込み方（依頼主「よく 考えて 作って」、会議「バスの 戸から 入るのは めりこみと 同じ 形」）：
//     しゅんも グソっ君も バスの 絵の 中へ 歩いて 入らない。調べた 所で 暗転 → 運転席の うしろからの 大写し
//     MakuPanel（画面 ぜんぶ。外の 町は 見えない）→ 暗転で 同じ 所へ もどる（人は 1マスも 動かない）。
//     さんかど（バスの うしろ＝東の はし (39,41)。10-24 に 北 (36,40) から 移した）は バスの 前（西の 外 (34,41) など、空いて いる 所）へ 歩いて 来て、すんだら もどる。
//     バスの 四角（x35–38, y41–42）には だれも 入らない。運転手さんは 眠った まま（大写しの 中の 後ろ姿）。
//   ・大写し「幕」：→ を 押さえると 幕が 回る（はなすと 少し すべって 止まる）。1回目は 『星見台』、2回目は 『分校前』で
//     止まる（台本どおり。この 2回は → だけ）。そのあと ← で もどせる。ちょんと 押すと 1こま（ふちが 窓の 線に 合う）。
//     行きすぎても ちょん 1回で 直せる。すべって 止まった 所が 窓の 線に 近ければ ぴたりと 合う。『ユウナリ前』で おしまい。
//     もどる で やめられる（幕は その まま。もう一度 調べると 続き）。
//   ・済んだ あと：バスを 調べると 今の 文の あとに「幕は、『ユウナリ前』。」。
//   ・かくし：まつ先生（『分校前』を 見た あと 1回）、『あした』宛ての 手紙（flag_ch2_tegami）、体育館の 横断幕
//     （obj_hr_gym_banner を 調べた ことが ある）。
//
// QA：__game.cmd.busmaku(step, auto)、bmState()、bmText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag, state, type Dir } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript, walk } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { faceToward } from '../../world/interact';
import { looked } from '../../world/marks';
import { runMsg } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { drawTape, drawWindow, textW, UI } from '../../ui/window';
import * as T from '../../data/text/hoshi_busmaku';
import { BM_MAKU, BM_UI } from '../../data/text/hoshi_busmaku';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { hStage, npc, routeTiles } from './common';
import { HOWTO } from '../../data/text/howto';
import { closeupWide } from '../../ui/closeup_wide';

export const BF = {
  look: 'flag_bm_look',
  start: 'flag_bm_start',
  /** 進み：1 回送に なった・さんかどの 話、2 星見台、3 分校前（← が 使える）。 */
  step: 'flag_bm_step',
  /** 幕の 今の こま（0 回送 〜 4 貸切）+1。0 は ユウナリ前（はじめ）。 */
  pos: 'flag_bm_pos',
  rule: 'flag_bm_rule',
  /** 見た 行き先（ビット：1 回送・2 ユウナリ前・4 星見台・8 分校前・16 貸切）。 */
  seen: 'flag_bm_seen',
  kashi: 'flag_bm_kashi',
  done: 'flag_bm_done',
  fumi: 'flag_bm_fumi',
} as const;

const BUS = 'obj_hoshi_bus';
const SANKADO = 'npc_hoshi_busdriver';
const FUMI = 'npc_hoshi_fumi';
const VILLAGE = 'map_hoshimidai';
/** バスの 四角（だれも 入らない）。 */
const BUS_RECT = { x0: 35, y0: 41, x1: 38, y1: 42 };
/** さんかどが 立つ バスの 前（西の 外）と、その 次の 候補（空いて いる 最初の 所）。 */
const FRONT: [number, number][] = [
  [34, 41],
  [34, 42],
  [34, 40],
  [39, 42],
  [39, 41],
];

function kanenariHere(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function dropKn(text: string): string {
  if (kanenariHere()) return text;
  return text
    .split(/\n(?=@)/)
    .filter((p) => !p.startsWith('@npc_kanenari'))
    .join('\n');
}

function* say(text: string): Co<number> {
  const t = dropKn(text);
  if (!t.trim()) return -1;
  return yield* runMsg(t);
}

function wrap(id: string, fn: (ctx: ScriptCtx, orig: () => Co) => Co): void {
  const prev = getScript(id);
  registerScript(id, function* (ctx): Co {
    const orig = function* (): Co {
      if (prev) yield* prev(ctx);
      else if (ctx.runDefault) yield* ctx.runDefault();
    };
    yield* fn(ctx, orig);
  });
}

/** h0〜h2、ボスの 前（クリア後の 夜は 足さない）。 */
export function bmOpen(): boolean {
  const s = hStage();
  return s >= 0 && s <= 2 && !flag('flag_ch2_boss_beaten') && !pgOn() && flag('flag_ch2_arrived') > 0;
}

function seeMaku(i: number): void {
  setFlag(BF.seen, flag(BF.seen) | (1 << i));
}

export function bmSeenCount(): number {
  let n = 0;
  for (let i = 0; i < BM_MAKU.length; i++) if (flag(BF.seen) & (1 << i)) n++;
  return n;
}

// ================================================================ 大写し「幕」（運転席の うしろから。画面 ぜんぶ）

const PX = 24;
const PY = 6;
const PW = 336;
const PH = 132;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 行き先の 窓（大写しの 中）。 */
const WIN = { x: 78, y: 14, w: 168, h: 36 };
/** 1こまの 高さ（窓と 同じ）。 */
const FH = WIN.h;
/** 押さえて いる 間の 速さ・加速（こま/秒）、はなした あとの 減速。 */
const VMAX = 3.2;
const ACC = 7;
const DEC = 4;
/** ちょん（この ms より 短い 押し）。 */
const TAP_MS = 180;
/** すべって 止まった 所が これより 線に 近ければ ぴたりと 合う（こま）。 */
const SNAP = 0.25; // (0.2 → 0.25: 改善会議 10-24 の 2：少し ゆるく)
/** ハンドルの 軸（大写しの 中）。 */
const HUB: [number, number] = [270, 32];

export type MakuMode = 'show' | 'lock1' | 'lock2' | 'free';

export class MakuPanel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  /** はじめの カード（改善会議 10-25 の1、ui/closeup.ts）。 */
  howto = HOWTO.busmaku;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  mode: MakuMode = 'show';
  /** 幕の 位置（こま。0 回送 〜 4 貸切）。 */
  pos = 1;
  v = 0;
  /** 押さえて いる 向き（0 なし）。 */
  hold: -1 | 0 | 1 = 0;
  holdMs = 0;
  /** ちょん・台本の すべりの 行き先（null なし）。 */
  glide: number | null = null;
  /** 止まった（幕が 動いて いない）。 */
  stopped = true;
  /** グソっ君の 足（はじめの くるっ）。 */
  leg = 0;
  /** 運転手さんの「ぐう」。 */
  guu = 0;
  cancel = false;
  /** 『貸切』に はじめて 着いた（台本が 拾う）。 */
  hitEnd = false;
  words: { text: string; t: number; ms: number }[] = [];
  private wasDown: -1 | 0 | 1 = 0;
  private tick = 3;

  word(text: string, ms = 900): void {
    this.words.push({ text, t: 0, ms });
  }

  /** 窓の 線に 合って いる こま（合って いなければ -1）。 */
  aligned(): number {
    const r = Math.round(this.pos);
    return this.stopped && Math.abs(this.pos - r) < 0.001 ? r : -1;
  }

  private inputDir(input: Input): -1 | 0 | 1 {
    const fwd = input.down('right') || input.down('down');
    const back = input.down('left') || input.down('up');
    if (fwd && !back) return 1;
    if (back && !fwd) return this.mode === 'free' ? -1 : 0;
    return 0;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    this.words = this.words.filter((w) => (w.t += dt) < w.ms);
    const s = dt / 1000;
    const active = this.mode === 'lock1' || this.mode === 'lock2' || this.mode === 'free';
    // the planned stops of the first two turns (it slides past, as the scenario says)
    const cap = this.mode === 'lock1' ? 2 : this.mode === 'lock2' ? 3 : 4;
    let d: -1 | 0 | 1 = 0;
    if (active && !this.auto) {
      d = this.inputDir(input);
      if (this.stopped && this.glide === null && input.pressed('cancel')) this.cancel = true;
    } else if (active && this.auto) d = this.autoDir();
    if (d !== 0 && this.glide === null) {
      if (this.wasDown !== d) this.holdMs = 0;
      this.holdMs += dt;
      this.hold = d;
      if (this.holdMs >= TAP_MS) {
        this.v = Math.max(-VMAX, Math.min(VMAX, this.v + d * ACC * s));
        this.stopped = false;
      }
    } else if (this.wasDown !== 0 && d === 0 && this.glide === null) {
      // let go: a short press is one step; in the scripted turns it slides to the planned stop
      if (this.holdMs < TAP_MS) {
        const dir = this.wasDown;
        this.glide = this.mode === 'lock1' ? 2 : this.mode === 'lock2' ? 3 : Math.max(0, Math.min(4, dir > 0 ? Math.floor(this.pos + 0.001) + 1 : Math.ceil(this.pos - 0.001) - 1));
        se('se_examine', { vol: 0.25, pitch: 1.6 });
      } else if (this.mode !== 'free') this.glide = cap;
      this.hold = 0;
      this.holdMs = 0;
    }
    this.wasDown = d;
    if (d === 0) this.hold = 0;
    // moving
    if (this.glide !== null) {
      const g = this.glide;
      const dir = Math.sign(g - this.pos);
      const sp = Math.max(1.2, Math.min(VMAX, Math.abs(this.v) || 2.4));
      this.v = dir * sp;
      this.pos += this.v * s;
      if ((dir > 0 && this.pos >= g) || (dir < 0 && this.pos <= g) || dir === 0) this.arrive(g);
      else this.stopped = false;
    } else if (this.hold === 0 && this.v !== 0) {
      const sg = Math.sign(this.v);
      this.v -= sg * DEC * s;
      if (Math.sign(this.v) !== sg) this.v = 0;
      this.pos += this.v * s;
      if (this.v === 0) this.settle();
    } else if (this.hold !== 0) this.pos += this.v * s;
    // the roll's rattle (からから) while it turns
    if (Math.floor(this.pos * 3) !== this.tick) {
      this.tick = Math.floor(this.pos * 3);
      if (!this.stopped) se('se_tsuri_reel', { vol: 0.18, pitch: 1.2 });
    }
    // the ends of the roll (and the scripted caps)
    if (this.pos >= cap && this.v > 0) {
      this.pos = cap;
      if (this.mode === 'free' && cap === 4 && !this.hitEnd) this.hitEnd = true;
      if (this.hold === 0 || this.mode !== 'free') this.arrive(cap);
      else this.v = 0;
    }
    if (this.pos <= 0 && this.v < 0) {
      this.pos = 0;
      if (this.hold === 0) this.arrive(0);
      else this.v = 0;
    }
  }

  private arrive(i: number): void {
    this.pos = i;
    this.v = 0;
    this.glide = null;
    this.hold = 0;
    if (!this.stopped) {
      se('se_examine', { vol: 0.45, pitch: 0.7 });
      this.word(BM_UI.pitari, 700);
    }
    this.stopped = true;
    seeMaku(i);
    // (a tap onto the roll's end counts as going too far, too)
    if (i === 4 && this.mode === 'free') this.hitEnd = true;
  }

  /** すべって 止まった：線に 近ければ ぴたり、遠ければ ずれたまま。 */
  private settle(): void {
    const r = Math.round(this.pos);
    if (Math.abs(this.pos - r) < SNAP * closeupWide()) { // ひろい：0.25→0.375（改善会議 10-28 の5）
      this.glide = r;
      if (Math.abs(this.pos - r) < 0.001) this.arrive(r);
    } else {
      this.stopped = true;
      this.word(BM_UI.zure, 900);
    }
  }

  /** QA：押す 向き（台本の 2回は →、そのあと ちょんで ユウナリ前へ）。 */
  private autoT = 0;
  private autoDir(): -1 | 0 | 1 {
    if (!this.stopped || this.glide !== null) return 0;
    this.autoT++;
    if (this.mode === 'lock1' || this.mode === 'lock2') return this.autoT % 40 < 30 ? 1 : 0;
    if (Math.abs(this.pos - 1) < 0.001) return 0;
    // a tap at a time (down for 4 frames)
    return this.autoT % 30 < 4 ? (this.pos > 1 ? -1 : 1) : 0;
  }

  // ---------------------------------------------------------------- drawing

  draw(g: Gfx): void {
    if (this.open <= 0) return;
    // the dark round the close-up (the town outside is not seen: we are behind the driver's seat)
    g.rect(0, 0, 384, 216, '#0B0B14', Math.min(1, this.open * 1.5));
    const k = ease.cubicOut(Math.min(1, this.open));
    const a = Math.min(1, this.open * 1.4);
    const dy = Math.round((1 - k) * -10);
    markText(0, 0, 384, 216);
    drawWindow(g, PX, PY + dy, PW, PH, UI, a, { curl: false });
    g.alpha(a, () => {
      const oy = SY + dy;
      g.clip(SX, oy, CW, CH, () => this.drawScene(g, oy));
      const tw = g.measure(BM_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, BM_UI.place, { seed: 23 });
    });
  }

  private drawScene(g: Gfx, oy: number): void {
    const ox = SX;
    // the cab at night: the ceiling, the windshield (the turning circle's sky and the mountains), the dash
    g.rect(ox, oy, CW, CH, '#16141F');
    const wy0 = oy + 60;
    const wy1 = oy + 108;
    for (let y = wy0; y < wy1; y++) g.rect(ox + 20, y, CW - 40, 1, y < wy0 + 16 ? '#1A2140' : y < wy0 + 32 ? '#222C50' : '#2A3658');
    for (const [sx, sy] of [[44, 4], [90, 10], [132, 3], [180, 12], [226, 6], [262, 14], [300, 5]] as [number, number][]) {
      const tw = Math.floor(this.t / 700 + sx) % 3 === 0 ? 0.5 : 1;
      g.rect(ox + sx, wy0 + sy, 1, 1, '#F4F1E8', tw);
    }
    // the mountains' line and the hill
    for (let x = 20; x < CW - 20; x++) {
      const h = Math.round(10 + Math.sin(x / 23) * 5 + Math.sin(x / 9) * 2);
      g.rect(ox + x, wy1 - h, 1, h, '#101622');
    }
    g.frame(ox + 20, wy0, CW - 40, wy1 - wy0, '#2E2A3A');
    g.rect(ox + CW / 2 - 1, wy0, 2, wy1 - wy0, '#2E2A3A');
    g.rect(ox, wy1, CW, CH - (wy1 - oy), '#221F2C');
    g.rect(ox, wy1, CW, 1, '#3A3648');
    // the driver from behind: the seat back, his shoulders, the cap tipped forward over his face
    const dx = ox + 196;
    g.rect(dx - 4, oy + 84, 52, 40, '#2C2A36');
    g.rect(dx - 4, oy + 84, 52, 2, '#3E3B4C');
    g.rect(dx + 6, oy + 92, 32, 20, '#2A3050');
    g.rect(dx + 12, oy + 76, 20, 16, '#1A1820');
    g.rect(dx + 10, oy + 72, 24, 7, '#22284A');
    g.rect(dx + 30, oy + 70, 8, 3, '#22284A');
    if (this.guu > 0) g.text('ぐう', dx + 40, oy + 62 - Math.round(this.guu * 4), { color: '#C8C4D8', alpha: Math.min(1, this.guu * 2) });
    // the destination box above the windshield, the window in it and the roll behind it
    g.rect(ox + WIN.x - 14, oy + WIN.y - 8, WIN.w + 28, WIN.h + 16, '#2A2836');
    g.frame(ox + WIN.x - 14, oy + WIN.y - 8, WIN.w + 28, WIN.h + 16, '#4A4458');
    g.clip(ox + WIN.x, oy + WIN.y, WIN.w, WIN.h, () => {
      g.rect(ox + WIN.x, oy + WIN.y, WIN.w, WIN.h, '#1C1C22');
      for (let i = 0; i < BM_MAKU.length; i++) {
        const top = oy + WIN.y + Math.round((i - this.pos) * FH);
        if (top > oy + WIN.y + WIN.h || top + FH < oy + WIN.y) continue;
        // the film's edge between the stops (幕の ふち)
        g.rect(ox + WIN.x, top, WIN.w, 2, '#6A6878');
        const name = BM_MAKU[i];
        const color = i === 3 ? '#E8DCA8' : '#F4F1E8';
        const sc = 2;
        const w = textW(name) * sc;
        const ctx = g.ctx;
        ctx.save();
        ctx.translate(Math.round(ox + WIN.x + (WIN.w - w) / 2), top + 3);
        ctx.scale(sc, sc);
        g.text(name, 0, 0, { color });
        ctx.restore();
      }
      // the light through the film
      g.rect(ox + WIN.x, oy + WIN.y, WIN.w, 1, '#FFFFFF', 0.15);
    });
    // the window's lines (where the film's edge should sit): small marks on both sides, top and bottom
    for (const yy of [WIN.y, WIN.y + WIN.h - 1]) {
      g.rect(ox + WIN.x - 6, oy + yy, 5, 1, '#FFE7A3');
      g.rect(ox + WIN.x + WIN.w + 1, oy + yy, 5, 1, '#FFE7A3');
    }
    // the handle at the box's right end: an arm turning round with the roll
    const [hx, hy] = HUB;
    g.circle(ox + hx, oy + hy, 5, '#5A5868');
    const ang = this.pos * Math.PI * 1.5 - Math.PI / 2;
    const kx = Math.round(ox + hx + Math.cos(ang) * 10);
    const ky = Math.round(oy + hy + Math.sin(ang) * 10);
    g.line(ox + hx, oy + hy, kx, ky, '#B8B4C8');
    g.line(ox + hx + 1, oy + hy, kx + 1, ky, '#8A86A0');
    g.circle(kx, ky, 2, '#C8A06A');
    // whose hand is on it: グソっ君's leg at first, しゅん's hand while it is turned
    if (this.leg > 0) {
      const lx = Math.round(ox + CW - this.leg * (CW - hx - 4));
      for (let i = 0; i < 4; i++) g.rect(lx + i * 6, oy + hy - 2 + (i % 2), 6, 4, i % 2 ? '#8A7A6A' : '#A8988A');
      g.rect(lx - 2, oy + hy - 1, 3, 3, '#6A5A4A');
    } else if (this.hold !== 0 || this.glide !== null || !this.stopped) {
      g.rect(kx - 3, ky - 2, 7, 6, '#E8B890');
      g.rect(kx + 3, ky, 30, 5, '#3E8A4E');
    }
    for (const w of this.words) {
      const p = w.t / w.ms;
      const al = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
      g.text(w.text, ox + WIN.x + WIN.w / 2, Math.round(oy + WIN.y + WIN.h + 12 - p * 6), { color: UI.bg, outline: UI.border, align: 'center', alpha: al });
    }
    // the keys (bottom left, inside the close-up: never under the dialog box)
    if (this.mode !== 'show' && this.stopped && this.glide === null) {
      const rows = this.mode === 'free' ? BM_UI.keys : BM_UI.keysLock;
      const kw = Math.max(...rows.map((l) => textW(l))) + 10;
      g.rect(ox + 2, oy + CH - 20 - (rows.length - 1) * 16, kw, rows.length * 16 + 4, '#0B0B14', 0.78);
      rows.forEach((l, i) => g.text(l, ox + 6, oy + CH - 18 - (rows.length - 1 - i) * 16 + 2, { color: '#FFE7A3' }));
    }
  }
}

function* openMaku(p: MakuPanel): Co {
  yield* game.fadeOut(260, '#0B0B14');
  // (the same panel opens again after the talk outside: a closed widget is dropped while done)
  p.done = false;
  game.ui.push(p);
  p.open = 1;
  forceBoxPos('bottom');
  yield* game.fadeIn(260);
}

function* closeMaku(p: MakuPanel): Co {
  yield* game.fadeOut(260, '#0B0B14');
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
  yield* game.fadeIn(300);
}

let qaAuto = false;

/** 幕が 止まるまで 待つ（やめたら false）。 */
function* waitStop(p: MakuPanel, want: (i: number) => boolean): Co<boolean> {
  for (;;) {
    if (p.cancel) return false;
    if (p.hitEnd && !flag(BF.kashi)) {
      setFlag(BF.kashi, 1);
      p.mode = 'show';
      yield* say(T.BM_KASHIKIRI);
      p.mode = 'free';
    }
    const i = p.aligned();
    if (i >= 0 && want(i)) return true;
    yield null;
  }
}

// ================================================================ さんかどが バスの 前へ

let sk: { x: number; y: number; dir: Dir; pose: string | null } | null = null;

function* sankadoCome(): Co {
  const f = field();
  const a = npc(SANKADO);
  if (!f || !a || sk) return;
  const busy = new Set<string>([`${f.player.tileX},${f.player.tileY}`]);
  if (f.follower?.visible) busy.add(`${f.follower.tileX},${f.follower.tileY}`);
  for (const o of f.actors) if (o !== a && o.visible) busy.add(`${o.tileX},${o.tileY}`);
  const to = FRONT.find(([x, y]) => !busy.has(`${x},${y}`));
  sk = { x: a.x, y: a.y, dir: a.dir, pose: a.pose };
  a.data.scripted = true;
  a.pose = null;
  a.tempPose = null;
  if (!to) {
    faceToward(a, f.player);
    return;
  }
  const route = routeTiles(a.tileX, a.tileY, to[0], to[1], [...busy].map((k) => k.split(',').map(Number) as [number, number]));
  if (route && !route.some(([x, y]) => x >= BUS_RECT.x0 && x <= BUS_RECT.x1 && y >= BUS_RECT.y0 && y <= BUS_RECT.y1)) yield* walk(SANKADO, route, { speed: 2.2 });
  faceToward(a, f.player);
}

function* sankadoBack(): Co {
  const a = npc(SANKADO);
  const s = sk;
  sk = null;
  if (!a || !s) return;
  const tx = Math.floor(s.x / 16);
  const ty = Math.floor((s.y - 16) / 16);
  if (a.tileX !== tx || a.tileY !== ty) {
    const route = routeTiles(a.tileX, a.tileY, tx, ty);
    if (route) yield* walk(SANKADO, route, { speed: 2.2 });
  }
  a.x = s.x;
  a.y = s.y;
  a.dir = s.dir;
  a.pose = s.pose;
  delete a.data.scripted;
}

// ================================================================ 台本

/** 〔maku〕（続きからも）。 */
function* maku(): Co {
  const f = field();
  const resume = flag(BF.step) > 0;
  const p = new MakuPanel();
  p.auto = qaAuto;
  p.pos = flag(BF.pos) > 0 ? flag(BF.pos) - 1 : 1;
  let finished = false;
  try {
    if (!resume) {
      // 1 これ 何や（グソっ君は 外から 見て、大写しで 手を のばす）
      setFlag(BF.start, 1);
      if (f?.follower) faceToward(f.follower, f.player);
      yield* say(T.BM_A.split('\n/\n')[0]);
      yield* openMaku(p);
      seeMaku(1);
      yield* animate(500, (x) => (p.leg = x), ease.quadOut);
      yield* say('@npc_kanenari\n' + T.BM_A.split('\n/\n')[1]);
      se('se_tsuri_reel', { vol: 0.4 });
      yield* animate(700, (x) => (p.pos = 1 - x), ease.quadInOut);
      p.pos = 0;
      seeMaku(0);
      yield* animate(300, (x) => (p.leg = 1 - x), ease.linear);
      p.leg = 0;
      setFlag(BF.pos, 1);
      yield* say(T.BM_KAISOU);
      yield* closeMaku(p);
      // 2 乗せない バス（さんかどが バスの 前へ）
      yield* sankadoCome();
      yield* say(T.BM_B);
      setFlag(BF.step, 1);
    } else yield* sankadoCome();
    yield* openMaku(p);
    if (!flag(BF.rule)) {
      setFlag(BF.rule, 1);
      yield* runMsg(T.BM_RULE);
    }
    // 3 幕：1回目は 『星見台』まで すべる
    if (flag(BF.step) < 2) {
      p.mode = 'lock1';
      if (!(yield* waitStop(p, (i) => i === 2))) return;
      p.mode = 'show';
      setFlag(BF.pos, 3);
      setFlag(BF.step, 2);
      yield* say(T.BM_HOSHIMI);
    }
    // 2回目は 『分校前』
    if (flag(BF.step) < 3) {
      p.mode = 'lock2';
      if (!(yield* waitStop(p, (i) => i === 3))) return;
      p.mode = 'show';
      setFlag(BF.pos, 4);
      setFlag(BF.step, 3);
      // 4 分校前
      yield* say(T.BM_BUNKO);
      if (looked('obj_hr_gym_banner')) yield* say(T.BM_BANNER);
      yield* say(T.BM_MODOSU);
      yield* runMsg(T.BM_RULE2);
    }
    // 3回目から：ユウナリ前に ぴたり
    p.mode = 'free';
    if (!(yield* waitStop(p, (i) => i === 1))) return;
    p.mode = 'show';
    finished = true;
    // 5 宛先
    yield 300;
    se('se_examine', { vol: 0.2, pitch: 0.5 });
    yield* animate(500, (x) => (p.guu = x), ease.linear);
    yield* say(T.BM_PITARI);
  } finally {
    setFlag(BF.pos, Math.round(p.pos) + 1);
    if (game.ui.widgets.includes(p)) yield* closeMaku(p);
    if (finished) {
      yield* say(T.BM_ATESAKI);
      if (flag('flag_ch2_tegami')) yield* say(T.BM_TEGAMI);
      setFlag(BF.done, 1);
      setFlag(BF.pos, 2);
      addMp(2);
      se('se_item');
      yield* runMsg(T.BM_REWARD);
    }
    yield* sankadoBack();
  }
}

wrap(BUS, function* (_ctx, orig): Co {
  if (!bmOpen() || field()?.map.id !== VILLAGE) {
    yield* orig();
    return;
  }
  if (flag(BF.done)) {
    yield* orig();
    yield* runMsg(T.BM_AFTER);
    return;
  }
  if (!flag(BF.look) || !kanenariHere()) {
    setFlag(BF.look, 1);
    yield* orig();
    return;
  }
  yield* maku();
});

// かくし：『分校前』を 見た あと、まつ先生に 話す（1回。いつもの 話の あと）
wrap(FUMI, function* (_ctx, orig): Co {
  yield* orig();
  if (bmOpen() && flag(BF.seen) & 8 && !flag(BF.fumi)) {
    setFlag(BF.fumi, 1);
    yield* runMsg(T.BM_FUMI);
  }
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.busmaku(step = 'door', auto = false, stage = 1)
 *   'door'   バスを 1回 調べた あと、戸の 前 (35,43) 上向き（調べると〔maku〕）
 *   'north'  同じ、バスの 北 (37,40) 下向き（さんかどの となり。北から 調べても 同じ）
 *   'west'   同じ、バスの 前（西）(34,41) 右向き（さんかどは 次の 空いた 所へ）
 *   'bunko'  『分校前』まで 見た あと（続きから。← で もどす）(35,43)
 *   'done'   済んだ あと (35,43)（調べると 今の 文 + 1行）
 *   'fumi'   『分校前』を 見た あと、まつ先生の 前（h0〜1 は 集会所、h2 は 山道の 入口）
 *   tegami / banner：かくしの 条件も 立てる（第4引数 'tb'）
 */
if (import.meta.env.DEV) {
  registerDebug('busmaku', (step = 'door', auto = false, stage = 1, extra = '') => {
    const st = Number(stage);
    cmd().jump?.(st >= 2 ? 'ch2:hill' : st === 1 ? 'ch2:barn' : 'ch2:yoriai', true);
    for (const id of Object.values(BF)) setFlag(id, 0);
    qaAuto = !!auto;
    setFlag('flag_ch2_stage', st);
    if (String(extra).includes('t')) setFlag('flag_ch2_tegami', 1);
    if (String(extra).includes('b')) setFlag('flag_seen_look_obj_hr_gym_banner', 1);
    const go = (x: number, y: number, d: string) => cmd().warp?.(VILLAGE, x, y, d);
    setFlag(BF.look, 1);
    if (step === 'north') return go(37, 40, 'down');
    if (step === 'west') return go(34, 41, 'right');
    if (step === 'door') return go(35, 43, 'up');
    setFlag(BF.start, 1);
    setFlag(BF.rule, 1);
    setFlag(BF.step, 3);
    setFlag(BF.pos, 4);
    setFlag(BF.seen, 1 | 2 | 4 | 8);
    if (step === 'bunko') return go(35, 43, 'up');
    if (step === 'fumi') return st >= 2 ? go(46, 2, 'right') : cmd().warp?.('map_hoshi_school', 9, 4, 'up');
    setFlag(BF.done, 1);
    setFlag(BF.pos, 2);
    return go(35, 43, 'up');
  });

  registerDebug('bmState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(BF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof MakuPanel) as MakuPanel | undefined;
    const f = field();
    const s = npc(SANKADO);
    return {
      flags,
      open: bmOpen(),
      seen: bmSeenCount(),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      kn: f?.follower ? [f.follower.tileX, f.follower.tileY] : null,
      sankado: s ? [s.tileX, s.tileY] : null,
      panel: p ? { mode: p.mode, pos: +p.pos.toFixed(3), v: +p.v.toFixed(2), stopped: p.stopped, aligned: p.aligned(), glide: p.glide } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no clock time, no まだ, no いただきます; no さん in the narration. */
export function bmTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', 'いただきます', '平和', '海ぞい', '水族館', 'ヤキソバン', 'まだまだ団', '1日2本', '12人', '3人', 'ほどよいなぁ', 'おはだっちょ'];
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
        if (/\d+:\d\d|\d+時/.test(plain)) bad.push(`${name}: time: ${plain}`);
        if ((who === 'narr' || who === 'sys') && plain.includes('さん')) bad.push(`${name}: 地の文の さん: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('bm', T.BM_TEXTS);
  for (const n of BM_MAKU) if (measure(n) * 2 > WIN.w - 8) bad.push(`幕の 字: ${n} ${measure(n) * 2}px > ${WIN.w - 8}`);
  for (const l of [...BM_UI.keys, ...BM_UI.keysLock]) if (measure(l) > CW - 12 - 52) bad.push(`鍵: ${l} ${measure(l)}px`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('bmText', () => bmTextCheck());
