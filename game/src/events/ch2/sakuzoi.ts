// 上の 柵ぞいの 見回り（第2章。2026-10-13 依頼主の採用：げむきか 10/11 の 案3〈厳選5案の 3〉。
// 02_ch2_index #99、50 10.34、52 4.9）。文は data/text/hoshi_sakuzoi.ts、地図は data/maps/hoshi_sakuzoi.ts、
// 絵は art/props/sakuzoi_art.ts、みました帳の ページは ui/menu/book_sakuzoi.ts。
//
//   段階1〜2、トマトの 灯り、ゲートが 開いた あと、グソっ君が いっしょ：
//   ・電気柵の 電源の 箱 obj_hoshi_dengen：ふだんの 文の あと「ランプが 少し 暗い」（flag_saku_lamp）。
//   ・マサル〔saku〕（段階1は ランプを 見た あと 牛舎で、段階2は ゲートの 横で）→『柵の テスター』→
//     暗転 → 上の 柵ぞい（map_hoshi_sakuzoi）の 東の はし（flag_saku_start）。マサルが 1回 当てる（針は 黄）
//     → 区間の スイッチを 切る（flag_saku_off、針は 赤、箱の カチッが 止む）。
//   ・直す 所 6つ（obj_saku_<k>、flag_saku_f_<k>。灯りが 近いと 光る）。畦草の 1つ目で 言い合い（flag_saku_kenka）、
//     畦草は 大写し「畦」（SakuAzePanel）で 細い 葉の 草だけ 刈る（豆を 切ると flag_saku_mame +1。起こして もどす）。
//   ・森の 目：切って いる あいだ、自由に 動ける 時間で ゲージ（段階2は ゆっくり）。半分で シカの 目
//     （flag_saku_me_seen）、いっぱいで タヌキも → 上（森）を 向くと 帰る（flag_saku_me +1）。
//   ・6つ 直したら 東の はしの スイッチ（obj_saku_switch）→ 入れる → 西の はしで 測る → 針が 緑 →
//     評価 flag_saku_rank（1 良し・2 まあ 良し・3 もう 1回。森の 目と 豆の 数）→ 朱肉 +2（良しで +1）、
//     テスターを 返す、みました帳②の すみ（flag_saku_done）。
//   ・そのあと：見回り帳の 行、電源の 箱の 文、村の 杉の すきま (44,0) から 何度でも（段階1〜2）、番号札。
//
// この ファイルは ch2/index.ts で 堆肥（taihi）より 前に import する：あとから 包む ほかの 寄り道
// （足あと帳・耳の あいさつ・堆肥 など）の マサルの 用が 先に 出る。
//
// QA：__game.cmd.saku(step, stage, auto)、sakuState()、sakuzoiText()、jump('ch2:sakuzoi')

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { addItem, flag, hasItem, removeItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { ambientEvent } from '../../audio';
import { registerScript, walk } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field, type FieldScene } from '../../world/field';
import { fxAt, registerWorldFx } from '../../world/fx';
import { runMsg } from '../../world/msg';
import type { Actor } from '../../world/actor';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/hoshi_sakuzoi';
import { KANENARI_FLIPS_HOSHI } from '../../data/text/hoshi_npcs';
import { SAKU_SPOTS, type SakuSpot } from '../../data/text/hoshi_sakuzoi';
import { SAKU_POST_X, SAKU_SPOT_AT, SAKU_W } from '../../data/maps/hoshi_sakuzoi';
import { azeGrass, azeMame, azeStubble, moriMe } from '../../art/props/sakuzoi_art';
import { kaneHead } from '../../art/props/mimi_art';
import { addMp, F, getKeyItem } from '../lib';
import { forceBoxPos, keyGuide } from '../stage';
import { se } from './compat';
import { hStage, lanternOn, runCue } from './common';

const MAP = 'map_hoshi_sakuzoi';
const GEN = 'npc_saku_gen';
const TOME = 'npc_saku_tome';

export const SF = {
  /** 電源の 箱で「ランプが 暗い」を 見た。 */
  lamp: 'flag_saku_lamp',
  /** マサル〔saku〕：見回りが はじまった（テスターを 借りた）。 */
  start: 'flag_saku_start',
  /** 区間の スイッチを 切っている。 */
  off: 'flag_saku_off',
  /** 畦草の 1つ目：柵を はさんだ 言い合い。 */
  kenka: 'flag_saku_kenka',
  /** 森の 目が 一度でも 出た（半分）。 */
  meSeen: 'flag_saku_me_seen',
  /** 森の 目を 灯りで 帰した 回数。 */
  me: 'flag_saku_me',
  /** 段階2の 森の 目の グソっ君（1回）。 */
  meH2: 'flag_saku_me_h2',
  /** 豆を 切った 数（起こして もどした）。 */
  mame: 'flag_saku_mame',
  /** 大写し「畦」の きまりを 聞いた。 */
  azeRule: 'flag_saku_aze_rule',
  /** 評価：1 良し、2 まあ 良し、3 もう 1回。 */
  rank: 'flag_saku_rank',
  /** おわった（スイッチを 入れて、測って、テスターを 返した）。 */
  done: 'flag_saku_done',
} as const;

export const fixedFlag = (k: SakuSpot): string => `flag_saku_f_${k}`;
export const fixed = (k: SakuSpot): boolean => flag(fixedFlag(k)) > 0;
export const fixedCount = (): number => SAKU_SPOTS.filter(fixed).length;
export const sakuDone = (): boolean => flag(SF.done) > 0;
export type SakuRank = 'yoshi' | 'maa' | 'mou';
export function sakuRank(): SakuRank {
  const r = flag(SF.rank);
  return r === 1 ? 'yoshi' : r === 2 ? 'maa' : 'mou';
}

function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower?.visible && state.party.some((m) => m.id === 'kanenari');
}

/** 段階1〜2、トマトの 灯りを 持っている あいだ。 */
function nightOn(): boolean {
  const s = hStage();
  return s >= 1 && s <= 2 && lanternOn();
}

/** はじめられる：夜、ゲートが 開いて、グソっ君が いる。 */
function canStart(): boolean {
  return nightOn() && flag('flag_ch2_gate_open') > 0 && kanenariHere() && !flag(SF.start);
}

/** 見回りの 最中（電気を 切って 回っている）。 */
function active(): boolean {
  return flag(SF.start) > 0 && !flag(SF.done);
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

/** マサルの 物語が 先（堆肥・足あと帳と 同じ 見方。段階2は せがれの 話が 先）。 */
function genStoryFirst(): boolean {
  if (!flag('flag_ch2_got_tomato')) return true;
  if (!flag('flag_ch2_met_gen') || !flag('flag_ch2_gate_open') || flag('flag_ch2_barn_work_on') > 0) return true;
  if (hStage() === 2 && !flag('flag_seen_npc_hoshi_gen_h2_1')) return true;
  return false;
}

// ================================================================ 画面の 左上の 札（区間の 図・テスターの 針・森の 目）

/** The tester's needle 0..1 (0 = rest on the left, red; ~0.45 yellow; ~0.9 green). */
const hud = {
  needle: 0,
  target: 0,
  /** 0..1: the dial blown up in the middle of the screen (the measuring). */
  big: 0,
  /** 森の 目の ゲージ 0..1。 */
  gauge: 0,
  t: 0,
  /** the fix that just happened (its mark pops). */
  popAt: '' as string,
  popT: 0,
};

/** 森の 目：0 なし、1 シカ（半分）、2 シカと タヌキ（いっぱい。灯りを 向けるまで）、3 帰っていく。 */
const eyes = { stage: 0, x: 0, a: 0, t: 0, upMs: 0, busy: false };

const ZONE_RED = 0.28;
const ZONE_YEL = 0.62;

function dialColor(v: number): string {
  return v < ZONE_RED ? '#E84E3C' : v < ZONE_YEL ? '#FFD23F' : '#5FA85A';
}

/** A dial on the paper: a half ring of three colours (red, yellow, green), the needle from its pin. */
function drawDial(g: Gfx, cx: number, cy: number, r: number, v: number): void {
  const th = Math.max(2, Math.round(r / 5));
  const steps = Math.max(24, r * 5);
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const ang = Math.PI - k * Math.PI;
    const col = dialColor(k);
    for (let d = r - th; d <= r; d++) g.px(cx + Math.cos(ang) * d, cy - Math.sin(ang) * d, col);
  }
  // the base line and the needle
  g.line(cx - r - 1, cy + 1, cx + r + 1, cy + 1, UI.pencil);
  const vv = Math.max(0, Math.min(1, v));
  const ang = Math.PI - vv * Math.PI;
  g.line(cx, cy, cx + Math.cos(ang) * (r - 1), cy - Math.sin(ang) * (r - 1), UI.text);
  g.rect(cx - 1, cy - 1, 3, 3, UI.text);
}

class SakuHud implements Widget {
  modal = false;
  done = false;
  update(dt: number): void {
    hud.t += dt;
    // the needle swings to its target with a little overshoot and a tremble
    const d = hud.target - hud.needle;
    hud.needle += d * Math.min(1, dt / 160);
    if (hud.popT > 0) hud.popT = Math.max(0, hud.popT - dt);
  }
  draw(g: Gfx): void {
    const f = field();
    if (!f || game.top !== f || f.map.id !== MAP || !flag(SF.start)) return;
    if (!active() && hud.big <= 0) return;
    const jitter = hud.target > 0.05 ? Math.sin(hud.t / 70) * 0.006 : 0;
    const v = hud.needle + jitter;
    // ---- the card: the section's diagram, the dial, the eyes
    // (below the loudspeaker's call bubble, which pops up at the top middle in every stage)
    const x = 6;
    const y = 38;
    const w = 196;
    const h = 36;
    markText(x, y - 4, w, h + 4);
    drawWindow(g, x, y, w, h, UI, 0.94, { curl: false });
    drawTape(g, x + 6, y - 5, measure(T.SAKU_HUD.title) + 12, 14, T.SAKU_HUD.title, { seed: 99 });
    // the diagram: west (8) on the left → east (1) on the right
    const dx0 = x + 8;
    const dx1 = x + 116;
    const dy = y + 22;
    const tx = (tile: number) => Math.round(dx0 + (tile / (SAKU_W - 1)) * (dx1 - dx0));
    g.line(dx0, dy - 2, dx1, dy - 2, UI.pencil);
    g.line(dx0, dy - 5, dx1, dy - 5, UI.pencil);
    for (const px of SAKU_POST_X) g.rect(tx(px), dy - 7, 1, 8, UI.text);
    for (const k of SAKU_SPOTS) {
      const sx = tx(SAKU_SPOT_AT[k] + 0.5);
      if (fixed(k)) {
        const pop = hud.popAt === k ? hud.popT / 500 : 0;
        g.ring(sx, dy + 6, 2 + Math.round(pop * 2), UI.accent);
      } else {
        const blink = Math.floor(hud.t / 400 + SAKU_SPOT_AT[k]) % 2 === 0;
        g.rect(sx - 1, dy + 5, 3, 3, blink ? UI.sunset : UI.pencil);
      }
    }
    // the dial (the tester)
    drawDial(g, x + 140, y + 27, 13, v);
    // the eyes' gauge: a pair of eyes and a bar
    const ex = x + 162;
    const ey = y + 12;
    const lit = hud.gauge >= 0.5;
    for (const ox of [0, 7]) {
      g.rect(ex + 6 + ox, ey, 4, 3, lit ? UI.sunset : UI.bg2);
      g.rect(ex + 7 + ox, ey + 1, 2, 1, UI.text);
    }
    g.frame(ex - 1, ey + 7, 28, 7, UI.pencil);
    const fill = Math.round(Math.min(1, hud.gauge) * 26);
    if (fill > 0) g.rect(ex, ey + 8, fill, 5, hud.gauge >= 1 ? UI.accent : hud.gauge >= 0.5 ? '#E8A53A' : '#5FA85A');
    // ---- the measuring: the dial blown up in the middle
    if (hud.big > 0) {
      const k = ease.cubicOut(hud.big);
      const bw = 132;
      const bh = 84;
      // (right of the middle: the people measuring stay in sight, in 2D and in HD-2D)
      const bx = 384 - bw - 22;
      const by = Math.round(46 + (1 - k) * -8);
      g.alpha(k, () => {
        drawWindow(g, bx, by, bw, bh, UI, 1, { curl: false });
        drawDial(g, bx + bw / 2, by + bh - 14, 50, v);
      });
      markText(bx, by, bw, bh);
    }
  }
}
let hudWidget: SakuHud | null = null;

function ensureHud(on: boolean): void {
  if (on && (!hudWidget || !game.ui.widgets.includes(hudWidget))) {
    hudWidget = new SakuHud();
    game.ui.push(hudWidget);
  } else if (!on && hudWidget) {
    game.ui.remove(hudWidget);
    hudWidget = null;
  }
}

function* needleTo(v: number, ms = 700): Co {
  hud.target = v;
  const t0 = hud.t;
  while (hud.t - t0 < ms) yield null;
}

function* bigDial(on: boolean): Co {
  yield* animate(260, (x) => (hud.big = on ? x : 1 - x), ease.linear);
  hud.big = on ? 1 : 0;
}

// ================================================================ 1 ランプが 弱い・マサル〔saku〕

wrap('obj_hoshi_dengen', function* (_ctx, orig): Co {
  yield* orig();
  if (sakuDone()) {
    yield* say(T.SAKU_LAMP_AFTER);
    return;
  }
  if (flag(SF.start)) return;
  if (!canStart()) return;
  if (!flag(SF.lamp)) {
    setFlag(SF.lamp, 1);
    yield* say(T.SAKU_LAMP);
    return;
  }
  yield* say(T.SAKU_LAMP_AGAIN);
});

wrap('npc_hoshi_gen', function* (_ctx, orig): Co {
  if (canStart() && !genStoryFirst() && (flag(SF.lamp) || hStage() >= 2)) {
    yield* startScene();
    return;
  }
  yield* orig();
});

function* startScene(): Co {
  const h2 = hStage() >= 2;
  setFlag(SF.lamp, 1);
  yield* say(h2 ? T.SAKU_START_H2 : T.SAKU_START_H1);
  yield* say(T.SAKU_START);
  yield* getKeyItem('item_saku_tester', T.SAKU_TESTER_GET, false);
  yield* say(T.SAKU_TESTER_RULE);
  setFlag(SF.start, 1);
  hud.needle = 0;
  hud.target = 0;
  hud.gauge = 0;
  eyes.stage = 0;
  eyes.a = 0;
  const from = field()?.map.id;
  yield* F().warpCo(MAP, 26, 4, 'right', 'se_step_dirt', from);
  yield* outScene();
}

/** 東の はし：1回 当てて（黄）、スイッチを 切る（赤）。 */
function* outScene(): Co {
  const f = F();
  const g = f.actorById(GEN) ?? null;
  if (g) {
    g.data.scripted = true;
    g.dir = 'down';
  }
  f.player.dir = 'right';
  ensureHud(true);
  yield 300;
  yield* say(T.SAKU_OUT_MEASURE);
  se('se_cursor', { pitch: 0.7, vol: 0.5 });
  yield* bigDial(true);
  yield* needleTo(0.46, 900);
  yield* say(T.SAKU_OUT_LOW);
  yield* bigDial(false);
  if (g) g.dir = 'right';
  yield* runCue(T.SAKU_OUT_OFF, {
    *off() {
      se('se_lamp_click');
      setFlag(SF.off, 1);
      f.refreshPresence();
      yield 200;
      yield* needleTo(0, 600);
    },
  });
  if (g) {
    g.dir = 'left';
    delete g.data.scripted;
  }
  yield* say(T.SAKU_OUT_GUIDE);
}

// ================================================================ 3 直す 所

/** The tile x of a spot and the world point of its middle on the fence. */
function spotPoint(k: SakuSpot): [number, number] {
  return [(SAKU_SPOT_AT[k] + 1) * 16, 6 * 16 + 9];
}

function* fixScene(k: SakuSpot): Co {
  const f = F();
  const p = f.player;
  p.dir = 'down';
  const g = f.actorById(GEN) ?? null;
  if (g) {
    g.data.scripted = true;
    g.path = [];
    g.moving = false;
    g.dir = g.x < p.x ? 'right' : 'left';
  }
  const [wx, wy] = spotPoint(k);
  try {
    if (k === 'kuzu1' || k === 'kuzu2') {
      yield* runCue(k === 'kuzu1' ? T.SAKU_KUZU1 : T.SAKU_KUZU2, {
        *cut() {
          se('se_kotei_snip');
          yield 220;
          se('se_kotei_snip', { pitch: 1.15 });
          setFlag(fixedFlag(k), 1);
          f.refreshPresence();
          yield 300;
        },
      });
    } else if (k === 'eda') {
      yield* runCue(T.SAKU_EDA, {
        *carry() {
          se('se_step_dirt', { pitch: 0.8 });
          setFlag(fixedFlag(k), 1);
          f.refreshPresence();
          game.shake(1, 200);
          yield 450;
        },
      });
    } else if (k === 'tsuchi') {
      yield* runCue(T.SAKU_TSUCHI, {
        *fill() {
          for (let i = 0; i < 4; i++) {
            se('se_h_soil', { pitch: 0.9 + i * 0.08, vol: 0.7 });
            yield 180;
          }
          setFlag(fixedFlag(k), 1);
          f.refreshPresence();
          yield 250;
        },
      });
    } else {
      yield* azeScene(k, wx);
      if (!fixed(k)) return;
    }
    if (!fixed(k)) {
      setFlag(fixedFlag(k), 1);
      f.refreshPresence();
    }
    hud.popAt = k;
    hud.popT = 500;
    se('se_pen_write', { pitch: 1.2, vol: 0.5 });
    void wy;
    if (fixedCount() >= SAKU_SPOTS.length) {
      yield 250;
      yield* say(T.SAKU_ALL);
    }
  } finally {
    if (g) delete g.data.scripted;
  }
}

registerScript('obj_saku_spot', function* (ctx): Co {
  const k = ctx.source.replace(/^obj_saku_/, '') as SakuSpot;
  if (!SAKU_SPOTS.includes(k) || fixed(k) || !active()) return;
  se('se_examine');
  yield* fixScene(k);
});

// ---------------------------------------------------------------- 畦草（トマじいと、大写し「畦」）

function* tomeTo(x: number): Co {
  const t = F().actorById(TOME);
  if (!t) return;
  t.data.scripted = true;
  if (Math.abs(t.x - (x * 16 + 8)) > 4) yield* walk(TOME, [[x, 7]], { speed: 2.2, face: 'up' });
  t.dir = 'up';
}

function* azeScene(k: SakuSpot, wx: number): Co {
  const tx = Math.round(wx / 16);
  if (!flag(SF.kenka)) {
    yield* runCue(T.SAKU_AZE1, {
      *tome() {
        yield* tomeTo(tx + 1);
      },
    });
    setFlag(SF.kenka, 1);
  } else {
    yield* tomeTo(tx + 1);
    yield* say(T.SAKU_AZE2);
  }
  const ok = yield* azeGame(k === 'aze1' ? 0 : 1);
  if (!ok) return;
  setFlag(fixedFlag(k), 1);
  F().refreshPresence();
  yield* say(T.SAKU_AZE_DONE);
}

/** The ridge's two layouts: g = grass (to cut), m = bean (to leave). */
const AZE_ROWS = ['gmggmgmg', 'mgmggmgg'];
const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const SLOT_W = 26;
const ROW_X = SX + 8;
const GROUND_Y = SY + CH - 14;
const WIRE_Y = GROUND_Y - 50;
const RX = ROW_X + SLOT_W * 8 + 6;

let qaAuto = false;

class SakuAzePanel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  done = false;
  t = 0;
  open = 0;
  cur = 0;
  row: string;
  cut: boolean[];
  /** the bean that was cut and is being stood back up (slot, ms). */
  raise = -1;
  raiseT = 0;
  auto = false;
  talking = false;
  mood: 'normal' | 'happy' | 'sad' = 'normal';
  moodT = 0;
  words: { text: string; x: number; t: number; ms: number; color: string }[] = [];
  private ePress = false;
  private eCancel = false;
  constructor(public layout: number) {
    this.row = AZE_ROWS[layout];
    this.cut = this.row.split('').map(() => false);
    this.cur = this.row.indexOf('g');
  }
  left(): number {
    let n = 0;
    for (let i = 0; i < this.row.length; i++) if (this.row[i] === 'g' && !this.cut[i]) n++;
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
  word(text: string, slot: number, color: string, ms = 800): void {
    this.words.push({ text, x: ROW_X + slot * SLOT_W + SLOT_W / 2 - SX, t: 0, ms, color });
  }
  update(dt: number, input: Input): void {
    this.t += dt;
    this.words = this.words.filter((w) => (w.t += dt) < w.ms);
    if (this.moodT > 0) {
      this.moodT -= dt;
      if (this.moodT <= 0) this.mood = 'normal';
    }
    if (this.raiseT > 0) {
      this.raiseT = Math.max(0, this.raiseT - dt);
      if (this.raiseT <= 0) this.raise = -1;
    }
    if (this.talking || this.auto) return;
    if (input.pressed('confirm')) this.ePress = true;
    if (input.pressed('cancel')) this.eCancel = true;
    if (input.repeat('left')) this.move(-1);
    else if (input.repeat('right')) this.move(1);
  }
  move(d: number): void {
    const n = Math.max(0, Math.min(this.row.length - 1, this.cur + d));
    if (n === this.cur) return;
    this.cur = n;
    se('se_cursor', { pitch: 0.8, vol: 0.25 });
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
        // the night over the ridge, the paddy's rice heads beyond it (south), the ridge's earth
        g.rect(SX, SY + dy, CW, CH, '#1E2430');
        g.rect(SX, GROUND_Y + dy, CW, CH, '#4A3426');
        g.rect(SX, GROUND_Y + dy, CW, 2, '#6E5440');
        // the fence's lower wire (off: no tick) and a post
        g.rect(ROW_X - 6, WIRE_Y + dy - 8, 2, GROUND_Y - WIRE_Y + 8, '#E8E4D8');
        g.line(SX, WIRE_Y + dy, ROW_X + SLOT_W * 8, WIRE_Y + dy, '#C8C2B4');
        g.line(SX, WIRE_Y + dy - 18, ROW_X + SLOT_W * 8, WIRE_Y + dy - 18, '#C8C2B4');
        // the lantern's pool round the cursor
        const lx = ROW_X + this.cur * SLOT_W + SLOT_W / 2;
        g.alpha(0.16, () => g.circle(lx, GROUND_Y + dy - 20, 34, '#FFB070'));
        for (let i = 0; i < this.row.length; i++) {
          const x = ROW_X + i * SLOT_W;
          const lit = Math.abs(i - this.cur) <= 1;
          let img: HTMLCanvasElement;
          let ix: number;
          let iy: number;
          if (this.row[i] === 'm') {
            img = azeMame(60 + i);
            ix = x + Math.round((SLOT_W - 18) / 2);
            const lift = this.raise === i ? Math.round((this.raiseT / 600) * 8) : 0;
            iy = GROUND_Y + dy - 31 + lift;
            g.img(img, ix, iy, { scale: 2, alpha: lit ? 1 : 0.55 });
          } else if (this.cut[i]) {
            img = azeStubble(i);
            ix = x + Math.round((SLOT_W - 28) / 2);
            iy = GROUND_Y + dy - 11;
            g.img(img, ix, iy, { scale: 2, alpha: lit ? 1 : 0.55 });
          } else {
            img = azeGrass(i + this.layout * 3, lit);
            ix = x;
            iy = GROUND_Y + dy - 51;
            g.img(img, ix, iy, { scale: 2 });
          }
        }
        // the cursor
        const cx = ROW_X + this.cur * SLOT_W;
        const blink = Math.floor(this.t / 300) % 2 === 0;
        g.frame(cx, GROUND_Y + dy - 54, SLOT_W, 58, blink ? '#FFE7A3' : '#F2894B');
        this.drawSide(g, dy);
      });
      const tw = measure(T.SAKU_AZE_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, T.SAKU_AZE_UI.place, { seed: 61 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
    for (const w of this.words) {
      const p = w.t / w.ms;
      const yy = Math.round(WIRE_Y - 14 - p * 6);
      const al = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
      g.text(w.text, SX + w.x, yy, { color: w.color, outline: UI.border, align: 'center', alpha: al });
      markText(SX + w.x - 32, yy, 64, 16, true);
    }
  }
  private drawSide(g: Gfx, dy: number): void {
    const oy = SY + dy;
    g.img(kaneHead('side', this.mood), RX, oy + 2);
    const left = this.left();
    g.text(T.SAKU_AZE_UI.left(left), RX, oy + 44, { color: left ? UI.bg : '#FFB070' });
    g.text(T.SAKU_AZE_UI.keys[0], RX, oy + 64, { color: '#FFE7A3' });
    g.text(T.SAKU_AZE_UI.keys[1], RX, oy + 82, { color: '#FFE7A3' });
    markText(RX, oy, SX + CW - RX, CH);
  }
}

function* talkOver(p: SakuAzePanel, text: string): Co {
  p.talking = true;
  yield* say(text);
  p.talking = false;
  p.clearInput();
}

/** 大写し「畦」：草を ぜんぶ 刈ったら true、やめたら false。 */
function* azeGame(layout: number): Co<boolean> {
  const p = new SakuAzePanel(layout);
  p.auto = qaAuto;
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
  let ok = false;
  try {
    if (!flag(SF.azeRule)) {
      setFlag(SF.azeRule, 1);
      yield* talkOver(p, T.SAKU_AZE_RULE);
    }
    p.clearInput();
    let autoAt = p.t + 300;
    while (p.left() > 0) {
      let go = false;
      if (p.auto) {
        if (p.t >= autoAt) {
          autoAt = p.t + 160;
          const next = p.row.split('').findIndex((c, i) => c === 'g' && !p.cut[i]);
          if (p.cur !== next) p.move(Math.sign(next - p.cur));
          else go = true;
        }
      } else {
        if (p.cancelled()) break;
        go = p.take();
      }
      if (go) {
        const i = p.cur;
        if (p.row[i] === 'm') {
          // a bean: snipped — トマじい; グソっ君 stands it back up (it stays a bean)
          se('se_kotei_snip', { pitch: 0.9 });
          p.word(T.SAKU_AZE_UI.mame, i, '#F2894B', 900);
          p.mood = 'sad';
          p.moodT = 1200;
          setFlag(SF.mame, flag(SF.mame) + 1);
          yield 350;
          yield* talkOver(p, T.SAKU_AZE_MAME);
          p.raise = i;
          p.raiseT = 600;
          se('se_h_soil', { vol: 0.5 });
        } else if (!p.cut[i]) {
          se('se_kotei_snip');
          p.cut[i] = true;
          p.word(T.SAKU_AZE_UI.cut, i, '#FFE7A3', 700);
          p.mood = 'happy';
          p.moodT = 700;
        }
      }
      yield null;
    }
    ok = p.left() === 0;
    if (ok) yield 500;
  } finally {
    yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
    p.done = true;
    game.ui.remove(p);
    forceBoxPos(null);
  }
  return ok;
}

// ================================================================ 4 森の 目

function eyesOn(f: FieldScene): boolean {
  return f.map.id === MAP && active() && flag(SF.off) > 0 && fixedCount() <= SAKU_SPOTS.length;
}

/** Where the eyes come out: in the scrub (row 3), a few tiles ahead of しゅん. */
function placeEyes(f: FieldScene): void {
  const p = f.player;
  const ahead = p.dir === 'left' ? -1 : 1;
  eyes.x = Math.max(24, Math.min(SAKU_W * 16 - 40, p.x + ahead * 56));
}

function* eyesHalf(): Co {
  eyes.busy = true;
  try {
    const first = !flag(SF.meSeen);
    setFlag(SF.meSeen, 1);
    se('se_glint', { pitch: 0.7, vol: 0.4 });
    yield 300;
    if (hStage() >= 2 && !flag(SF.meH2)) {
      setFlag(SF.meH2, 1);
      yield* say(T.SAKU_ME_HALF_H2);
    } else yield* say(first ? T.SAKU_ME_HALF : T.SAKU_ME_HALF_AGAIN);
  } finally {
    eyes.busy = false;
  }
}

function* eyesFull(): Co {
  eyes.busy = true;
  try {
    se('se_glint', { pitch: 0.6, vol: 0.5 });
    yield 300;
    yield* say(T.SAKU_ME_FULL);
    keyGuide([[['up'], T.SAKU_ME_GUIDE]], 5000);
  } finally {
    eyes.busy = false;
  }
}

function* eyesBack(): Co {
  eyes.busy = true;
  try {
    eyes.stage = 3;
    eyes.t = 0;
    setFlag(SF.me, flag(SF.me) + 1);
    yield 600;
    yield* say(T.SAKU_ME_BACK);
    hud.gauge = 0;
    eyes.stage = 0;
    eyes.a = 0;
  } finally {
    eyes.busy = false;
  }
}

// ================================================================ the map's running parts

let pulseAt = 0;

registerWorldFx({
  map: MAP,
  anchored: true,
  update(f, dt) {
    ensureHud(!!flag(SF.start) && (active() || hud.big > 0));
    // the energiser's click about once a second while the section is on (53: amb_h_fence)
    if (!flag(SF.off) && f.t > pulseAt) {
      pulseAt = f.t + 1000;
      const pan = Math.max(-0.7, Math.min(0.7, ((SAKU_W * 16 - (f.camX + 192)) / 192) * 0.6));
      ambientEvent('amb_h_fence', 'pulse', pan);
    }
    if (!active()) return;
    // マサル follows the light at a little distance (on the other row of the path)
    const g = f.actorById(GEN);
    if (g && !g.data.scripted && f.controllable) followGen(f, g);
    // the eyes' gauge: only while しゅん can walk and the section is off
    if (eyes.stage === 3) {
      eyes.t += dt;
      eyes.a = Math.max(0, 1 - eyes.t / 800);
      return;
    }
    if (eyes.stage > 0) eyes.a = Math.min(1, eyes.a + dt / 600);
    if (!eyesOn(f) || !f.controllable || eyes.busy) return;
    if (eyes.stage < 2) {
      hud.gauge = Math.min(1, hud.gauge + dt / (hStage() >= 2 ? 130000 : 80000));
      if (eyes.stage === 0 && hud.gauge >= 0.5) {
        eyes.stage = 1;
        eyes.a = 0;
        placeEyes(f);
        f.startScript(eyesHalf());
      } else if (eyes.stage === 1 && hud.gauge >= 1) {
        eyes.stage = 2;
        f.startScript(eyesFull());
      }
      return;
    }
    // stage 2: the light turned to the wood (しゅん facing up) for a moment sends them back
    if (f.player.dir === 'up') eyes.upMs += dt;
    else eyes.upMs = 0;
    if (eyes.upMs > 350) {
      eyes.upMs = 0;
      f.startScript(eyesBack());
    }
  },
  draw(f, g, cx, cy, layer) {
    if (layer !== 'glow' || !active()) return;
    // the spots still to fix glint when the light comes near
    const p = f.player;
    for (const k of SAKU_SPOTS) {
      if (fixed(k)) continue;
      const [wx, wy] = spotPoint(k);
      const d = Math.hypot(wx - p.x, wy - p.y);
      if (d > 64) continue;
      const tw = (Math.sin(f.t / 220 + SAKU_SPOT_AT[k]) + 1) / 2;
      const al = Math.min(1, (64 - d) / 24) * (0.45 + tw * 0.55);
      const [sx, sy] = fxAt(f, wx, wy - 2, cx, cy, 6 * 16 + 12);
      g.alpha(al, () => {
        g.rect(sx - 1, sy - 4, 2, 9, '#FFF6D8');
        g.rect(sx - 4, sy - 1, 9, 2, '#FFF6D8');
        g.rect(sx - 1, sy - 1, 2, 2, '#FFFFFF');
      });
    }
    // the eyes in the scrub
    if (eyes.stage > 0 && eyes.a > 0) {
      const blink = Math.floor((f.t + 900) / 2600) % 3 === 0 && (f.t % 2600) < 140;
      const rise = eyes.stage === 3 ? Math.round((eyes.t / 800) * 6) : 0;
      const faces: ['shika' | 'tanu', number, number][] = [['shika', eyes.x, 3 * 16 + 4 - rise]];
      if (eyes.stage >= 2) faces.push(['tanu', eyes.x + (eyes.x > SAKU_W * 8 ? -34 : 34), 3 * 16 + 12 - rise]);
      for (const [kind, wx, wy] of faces) {
        const [sx, sy] = fxAt(f, wx, wy, cx, cy, 3 * 16 + 16);
        // the stage-2 eyes look away up the mountain: only the face, turned (no shine)
        const away = hStage() >= 2 && eyes.stage === 1;
        g.alpha(eyes.a * (away ? 0.75 : 0.95), () => g.img(moriMe(kind, blink || away), Math.round(sx - 12), Math.round(sy - 20)));
      }
    }
  },
});

/** マサル behind the light: a tile and a half back, on the other row of the path. */
function followGen(f: FieldScene, g: Actor): void {
  const p = f.player;
  const back = p.dir === 'left' ? 1 : p.dir === 'right' ? -1 : g.x > p.x ? 1 : -1;
  const row = p.tileY === 4 ? 5 : 4;
  const tx = Math.max(8, Math.min(SAKU_W * 16 - 24, p.x + back * 30));
  const ty = row * 16 + 16;
  const dx = tx - g.x;
  const dy = ty - g.y;
  const far = Math.hypot(dx, dy);
  if (far > 20) {
    g.pathSpeed = (far > 60 ? 5 : 3.6) * 16;
    g.path = [[tx, ty]];
  } else if (!g.path.length) {
    g.dir = p.x > g.x + 6 ? 'right' : p.x < g.x - 6 ? 'left' : 'up';
  }
}

// ================================================================ 5 入れる

registerScript('obj_saku_switch', function* (): Co {
  se('se_examine');
  if (sakuDone()) {
    yield* say(T.SAKU_SWITCH_AFTER);
    return;
  }
  if (!active()) return;
  if (fixedCount() < SAKU_SPOTS.length) {
    const g = F().actorById(GEN);
    if (g) g.dir = 'right';
    yield* say(T.SAKU_SWITCH_WAIT);
    return;
  }
  yield* finalScene();
});

function* finalScene(): Co {
  const f = F();
  const g = f.actorById(GEN) ?? null;
  const t = f.actorById(TOME) ?? null;
  for (const a of [g, t]) if (a) a.data.scripted = true;
  if (g) {
    g.path = [];
    g.dir = 'right';
  }
  yield* runCue(T.SAKU_ON, {
    *on() {
      se('se_lamp_click');
      setFlag(SF.off, 0);
      f.refreshPresence();
      yield 350;
      ambientEvent('amb_h_fence', 'pulse', 0.4);
      yield 1000;
      ambientEvent('amb_h_fence', 'pulse', 0.4);
      yield 300;
    },
  });
  // to the west end: everyone along the path (a cut)
  yield* game.fadeOut(400, '#0B0B14');
  const p = f.player;
  p.moving = false;
  p.path = [];
  p.x = 2 * 16 + 8;
  p.y = 5 * 16 + 16;
  p.dir = 'down';
  f.syncFollower(true);
  if (g) {
    g.x = 1 * 16 + 8;
    g.y = 5 * 16 + 16;
    g.dir = 'down';
  }
  if (t) {
    t.x = 2 * 16 + 8;
    t.y = 7 * 16 + 16;
    t.dir = 'up';
  }
  f.snapCamera();
  yield* game.fadeIn(400);
  yield 250;
  yield* runCue(T.SAKU_MEASURE, {
    *needle() {
      se('se_cursor', { pitch: 0.7, vol: 0.5 });
      yield* bigDial(true);
      yield 200;
      yield* needleTo(0.92, 1100);
      se('se_kiran');
      yield 500;
    },
  });
  yield* bigDial(false);
  const mame = flag(SF.mame);
  yield* say(mame === 0 ? T.SAKU_TOME_GOOD : T.SAKU_TOME_SO);
  yield* say(T.SAKU_NOD);
  if (!flag(SF.meSeen)) yield* say(T.SAKU_SECRET_ME);
  if (mame === 0) yield* say(T.SAKU_SECRET_MAME);
  // the grade: the eyes sent back and the beans snipped
  const miss = flag(SF.me) + mame;
  const rank: SakuRank = miss === 0 ? 'yoshi' : miss <= 2 ? 'maa' : 'mou';
  setFlag(SF.rank, rank === 'yoshi' ? 1 : rank === 'maa' ? 2 : 3);
  se('se_stamp');
  yield* say(T.SAKU_RANK[rank]);
  removeItem('item_saku_tester');
  yield* say(T.SAKU_RETURN);
  addMp(2);
  se('se_item');
  yield* say(T.SAKU_REWARD);
  if (rank === 'yoshi') {
    addMp(1);
    se('se_item');
    yield* say(T.SAKU_REWARD_YOSHI);
  }
  se('se_pen_write', { pitch: 1.1 });
  yield* say(T.SAKU_PAGE);
  // マサル to the barn, トマじい to his water inlet
  yield* game.fadeOut(400, '#0B0B14');
  setFlag(SF.done, 1);
  hud.big = 0;
  hud.gauge = 0;
  eyes.stage = 0;
  ensureHud(false);
  for (const a of [g, t]) if (a && f.actors.includes(a)) f.removeActor(a);
  f.refreshPresence();
  yield* game.fadeIn(400);
  yield* say(T.SAKU_LEAVE);
}

// ================================================================ 人と 物（見回りの あいだ）

registerScript(GEN, function* (): Co {
  const g = F().actorById(GEN);
  if (g) g.dir = F().player.x < g.x ? 'left' : 'right';
  const left = SAKU_SPOTS.length - fixedCount();
  yield* say(left > 0 ? T.SAKU_GEN_TALK.left(left) : T.SAKU_GEN_TALK.all);
});

registerScript(TOME, function* (): Co {
  yield* say(flag(SF.kenka) ? T.SAKU_TOME_TALK.during : T.SAKU_TOME_TALK.before);
});

registerScript('obj_saku_fuda', function* (ctx): Co {
  se('se_examine');
  const n = Number(ctx.source.replace(/^obj_saku_fuda_/, '')) || 1;
  yield* say(T.SAKU_FUDA_TEXT(n));
});

registerScript('obj_saku_sen', function* (): Co {
  se('se_examine');
  yield* say(active() && flag(SF.off) ? T.SAKU_SEN.off : T.SAKU_SEN.on);
});

/** Stepped on an end of the path: a step back in. */
function* stepBackIn(): Co {
  const f = F();
  const p = f.player;
  const west = p.tileX <= 0;
  p.moving = false;
  p.path = [];
  yield* walk('player', [[west ? 1 : SAKU_W - 2, 4]], { speed: 4, face: west ? 'right' : 'left' });
}

registerScript('evt_saku_door_wait', function* (): Co {
  if (!active()) return;
  const g = F().actorById(GEN);
  if (g) g.dir = F().player.x < g.x ? 'left' : 'right';
  yield* say(T.SAKU_DOOR_WAIT);
  yield* stepBackIn();
});

registerScript('evt_saku_door_shut', function* (): Co {
  yield* say(T.SAKU_DOOR_SHUT);
  yield* stepBackIn();
});

// ================================================================ 6 そのあと

// グソっ君の 場所の ひとこと（上の 柵ぞいで 1回。npcs.ts の hoshiPlaceKey）
Object.assign(KANENARI_FLIPS_HOSHI, { hoshi_sakuzoi: T.SAKU_FLIP });

/** 見回り帳（牛舎）：おわった あと、下の 欄の 1行。 */
wrap('obj_hoshi_mimawari', function* (_ctx, orig): Co {
  yield* orig();
  if (sakuDone()) yield* say(T.SAKU_CHO[sakuRank()]);
});

/** A load in the middle of the round: the gauge starts again, the section is still off. */
registerWorldFx({
  map: '',
  update(f) {
    if (f.map.id !== MAP && hudWidget) ensureHud(false);
  },
});

// ================================================================ QA

/** 文の 決まり（3行 × 336px、第2章の 言葉）。 */
export function sakuzoiTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', '具足様', '平和', '17', '3人', 'らっきょ'];
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
        for (const b of BANNED) if (plain.includes(b) && !(b === '17' && /\d17|17\d/.test(plain))) bad.push(`${name}: 「${b}」: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('saku', T.SAKU_TEXTS);
  // the close-up's words (right column: 336 − the row)
  const colW = SX + CW - RX;
  for (const t of [T.SAKU_AZE_UI.left(5), ...T.SAKU_AZE_UI.keys]) if (measure(t) > colW) bad.push(`aze ui: ${t}: ${measure(t)}px > ${colW}`);
  return { pages, bad };
}

if (import.meta.env.DEV) {
  registerDebug('sakuzoiText', () => sakuzoiTextCheck());
  registerDebug('sakuState', () => ({
    stage: hStage(),
    lamp: flag(SF.lamp),
    start: flag(SF.start),
    off: flag(SF.off),
    fixed: Object.fromEntries(SAKU_SPOTS.map((k) => [k, flag(fixedFlag(k))])),
    kenka: flag(SF.kenka),
    me: flag(SF.me),
    meSeen: flag(SF.meSeen),
    mame: flag(SF.mame),
    rank: flag(SF.rank),
    done: flag(SF.done),
    tester: hasItem('item_saku_tester'),
    gauge: hud.gauge,
    eyes: eyes.stage,
    big: hud.big,
  }));
  /**
   * QA：上の 柵ぞいの 見回りを 段階ごとに。
   *   'ready'  ゲートの 先、電源の 箱の 前（段階 stage、灯り、グソっ君）
   *   'in'     柵ぞいの 東の はし（切った あと）
   *   'fixed'  6つ 直した あと、スイッチの 前
   *   'done'   おわった あと（柵ぞいの 東の はし。村へ 出られる）
   *   'eyes'   森の 目の ゲージを n（0..1）に
   * auto：大写し「畦」を ひとりで 刈る（QA）。
   */
  registerDebug('saku', (step = 'ready', stage = 1, auto = false) => {
    qaAuto = !!auto;
    const cmd = (window as unknown as { __game: { cmd: Record<string, (...a: unknown[]) => unknown> } }).__game.cmd;
    const base = () => {
      setFlag('flag_ch2_stage', Number(stage));
      for (const k of ['flag_ch2_got_tomato', 'flag_ch2_met_gen', 'flag_ch2_gate_open', 'flag_ch2_got_otsukare', 'flag_ch2_house_exit']) setFlag(k, 1);
    };
    const reset = () => {
      for (const v of Object.values(SF)) setFlag(v, 0);
      for (const k of SAKU_SPOTS) setFlag(fixedFlag(k), 0);
      removeItem('item_saku_tester');
      hud.gauge = 0;
      hud.needle = 0;
      hud.target = 0;
      eyes.stage = 0;
    };
    if (step === 'eyes') {
      hud.gauge = Math.max(0, Math.min(0.999, Number(stage)));
      return 'gauge ' + hud.gauge;
    }
    if (step === 'ready') {
      base();
      reset();
      cmd.warp?.('map_hoshimidai', 47, 20, 'up');
      return 'ready: examine the power unit (47,19), then talk to マサル';
    }
    base();
    reset();
    setFlag(SF.lamp, 1);
    setFlag(SF.start, 1);
    setFlag(SF.off, 1);
    if (!hasItem('item_saku_tester')) addItem('item_saku_tester');
    if (step === 'fixed' || step === 'done') for (const k of SAKU_SPOTS) setFlag(fixedFlag(k), 1);
    if (step === 'fixed') setFlag(SF.kenka, 1);
    if (step === 'done') {
      setFlag(SF.off, 0);
      setFlag(SF.rank, 1);
      setFlag(SF.done, 1);
      removeItem('item_saku_tester');
    }
    cmd.warp?.(MAP, step === 'fixed' ? 28 : 26, step === 'fixed' ? 5 : 4, step === 'fixed' ? 'right' : 'left');
    return step;
  });
}
