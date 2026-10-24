// 絵の きゅうりは、とり遅れない（第2章。げむきか 10/24 の 案5、2026-10-24 依頼主の 採用。02_ch2_index）。
// 文は data/text/hoshi_kyuri.ts、絵は art/props/kyuri_art.ts（きゅうりの 棚）、みました帳の ページは ui/menu/book_kyuri.ts。
// 札と くらべる・販売所の 台・ぴょん夫人は kyuri_late.ts（ほかの 寄り道が 包んだ あとの いちばん 外から）。
//
//   段階1〜2（トマトの 灯り）。段階0 は ソワカの 1 の 最初の 2ページと「暗くて、葉の かげが 見えないのよ。」だけ。
//   クリア後の 夜は 足さない。
//   ・ソワカ（無人販売所の 横の 丸いす (23,37)）：今の 会話の あと（flag_ky_heard）、もう 1回 話すと〔kyuri〕
//     （flag_ky_start）。店番（tenban.ts）や 朝の 前の 色（asairo.ts）の 用は 先に 出る（この ファイルは それらより
//     前に import する）。
//   ・きゅうりの 棚 obj_ky_tana（ソワカの 家の 西の 壁ぞい (20,34)–(20,35)。(19,34)・(19,35) から 東向き）：
//     大写し「葉の かげ」KyPanel（←→↑↓ 灯りを 1目ずつ 大きく 動かす、けってい 切る。灯りの 当たった 所だけ
//     実が 見える）。3本（flag_ky_got の ビット）：ちょうど (1,1)・大きめ (3,0)・とり遅れ (0,2)＝いちばん 奥の 低い 所。
//     何も ない 所は「大きな 葉」（失敗に しない）。かくし：1本目の 所で もう 1回 けってい → グソっ君（flag_ky_nido）。
//   ・3本 そろうと『とった きゅうり』（item_ky_sanbon）→ 札と くらべる（kyuri_late.ts）。
//
// 小さい 画面：灯りは 指で 動かさない（十字キーで 1目ずつ。指が 葉を かくさない）。灯りの 輪は 大きく、
// 目の 数は 4×3。音は 今 ある 音（はさみ se_kotei_snip、トゲ se_emote）。
//
// QA：__game.cmd.kyuri(step, stage, auto)、kyState()、kyText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { addItem, flag, removeItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { getMapDef, registerMap } from '../../world/maps';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/hoshi_kyuri';
import { KY_UI } from '../../data/text/hoshi_kyuri';
import { getKeyItem } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { hStage, lanternOn } from './common';

export const KF = {
  heard: 'flag_ky_heard',
  h0: 'flag_ky_h0',
  start: 'flag_ky_start',
  got: 'flag_ky_got',
  intro: 'flag_ky_intro',
  nido: 'flag_ky_nido',
  done: 'flag_ky_done',
  after: 'flag_ky_after',
  tenban: 'flag_ky_tenban',
  yoshie: 'flag_ky_yoshie',
} as const;

const VILLAGE = 'map_hoshimidai';
const SAWAKO = 'npc_hoshi_sawako';
export const KY_SANBON = 'item_ky_sanbon';
export const KY_TORE = 'item_ky_tore';
/** 棚（2つの 物。北が 奥）。 */
export const KY_TANA: [number, number][] = [
  [20, 34],
  [20, 35],
];

export function kanenariHere(): boolean {
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

export function* say(text: string): Co<number> {
  const t = dropKn(text);
  if (!t.trim()) return -1;
  return yield* runMsg(t);
}

export function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** 寄り道が 開いている：段階1〜2、トマトの 灯り、クリアの 前。 */
export function kyOpen(): boolean {
  const s = hStage();
  return s >= 1 && s <= 2 && lanternOn() && !pgOn() && !flag('flag_ch2_boss_beaten');
}

export const kyGotN = (): number => [0, 1, 2].filter((i) => flag(KF.got) & (1 << i)).length;

export function wrap(id: string, fn: (ctx: ScriptCtx, orig: () => Co) => Co): void {
  const prev = getScript(id);
  registerScript(id, function* (ctx): Co {
    const orig = function* (): Co {
      if (prev) yield* prev(ctx);
      else yield* ctx.runDefault();
    };
    yield* fn(ctx, orig);
  });
}

// ================================================================ 地図の 物

{
  const def = getMapDef(VILLAGE);
  if (def) {
    def.objects.push(
      // the trellis along the west wall of ソワカ's house (the alley between the houses stays open on its west side)
      ...KY_TANA.map(([x, y], i) => ({ t: 'prop', prop: 'prop_ky_tana', x, y, opts: { i }, solid: [0, 0, 1, 1] }) as unknown as MapObj),
      ...KY_TANA.map(([x, y], i) => ({ t: 'obj', id: i ? `obj_ky_tana_${i}` : 'obj_ky_tana', x, y, face: 'right', script: 'obj_ky_tana' }) as unknown as MapObj),
    );
    registerMap(def);
  }
}

// ================================================================ 大写し「葉の かげ」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const RX = SX + 208;
const KEYS_Y = 74;
const COLS = 4;
const ROWS = 3;
/** 3本：その 目（列・行）。0 ちょうど・1 大きめ・2 とり遅れ（いちばん 奥の 低い 所）。 */
export const KY_AT: [number, number][] = [
  [1, 1],
  [3, 0],
  [0, 2],
];
const LIGHT_R = 24;

function cellXY(c: number, r: number, oy: number): [number, number] {
  return [SX + 28 + c * 50, oy + 26 + r * 30];
}

/** A filled ellipse, row by row. */
function oval(g: Gfx, cx: number, cy: number, rx: number, ry: number, col: string): void {
  for (let y = -ry; y <= ry; y++) {
    const h = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    if (h > 0) g.rect(cx - h, cy + y, h * 2, 1, col);
  }
}

/** きゅうり 1本（たて。x,y：へたの 位置）。k 0 まっすぐ・1 太くて くの字・2 腕くらい。 */
export function drawCuke(g: Gfx, x: number, y: number, k: number): void {
  const len = k === 0 ? 30 : k === 1 ? 32 : 38;
  const th = k === 0 ? 3 : k === 1 ? 4 : 7;
  const body = k === 2 ? '#7A8A34' : '#3E7A34';
  const lt = k === 2 ? '#A8B45A' : '#6AA04A';
  g.rect(x - 1, y - 3, 2, 3, '#5A7A2A');
  for (let j = 0; j < len; j++) {
    const bend = k === 1 ? Math.round(Math.max(0, j - len * 0.45) * 0.35) : 0;
    const w = j < 2 || j > len - 3 ? th - 1 : th;
    g.rect(x - w + bend, y + j, w * 2, 1, body);
    g.px(x - w + bend + 1, y + j, lt);
    // the spines (fresh ones prick)
    if (j % 4 === 1) {
      g.px(x - w + bend - 1, y + j, '#E8ECD8');
      g.px(x + w + bend, y + j + 1, '#E8ECD8');
    }
  }
}

export class KyPanel implements Widget {
  modal = true;
  done = false;
  /** 大写し（engine/touch.ts：絵の 外の タッチも けってい）。 */
  closeup = true;
  t = 0;
  open = 0;
  auto = false;
  active = false;
  c = 2;
  r = 0;
  /** 灯りの 位置（なめらかに 追う）。 */
  lx = 0;
  ly = 0;
  pick: 'ok' | 'cancel' | null = null;
  /** 切っている 所（ms 残り）。 */
  snip = 0;
  private armT = 0;
  private wasActive = false;
  private autoT = 0;

  constructor() {
    const [x, y] = cellXY(this.c, this.r, SY);
    this.lx = x;
    this.ly = y;
  }

  /** いま 灯りの 当たっている 目の 実（なければ -1。切った 実も -1）。 */
  here(): number {
    const k = KY_AT.findIndex(([c, r]) => c === this.c && r === this.r);
    if (k < 0 || flag(KF.got) & (1 << k)) return -1;
    return k;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.snip > 0) this.snip = Math.max(0, this.snip - dt);
    const [tx, ty] = cellXY(this.c, this.r, SY);
    const k = Math.min(1, dt / 90);
    this.lx += (tx - this.lx) * k;
    this.ly += (ty - this.ly) * k;
    if (this.active !== this.wasActive) {
      this.wasActive = this.active;
      this.armT = 0;
    }
    if (this.active) this.armT += dt;
    if (!this.active || this.pick || this.armT < 150) return;
    if (this.auto) {
      this.autoT += dt;
      if (this.autoT < 380) return;
      this.autoT = 0;
      const goal = KY_AT.findIndex((_, i) => !(flag(KF.got) & (1 << i)));
      if (goal < 0) return;
      const [gc, gr] = KY_AT[goal];
      if (gc !== this.c) this.step(gc > this.c ? 1 : -1, 0);
      else if (gr !== this.r) this.step(0, gr > this.r ? 1 : -1);
      else this.pick = 'ok';
      return;
    }
    const lr = (input.pressed('right') ? 1 : 0) - (input.pressed('left') ? 1 : 0);
    const ud = (input.pressed('down') ? 1 : 0) - (input.pressed('up') ? 1 : 0);
    if (lr || ud) this.step(lr, ud);
    if (input.pressed('confirm')) this.pick = 'ok';
    else if (input.pressed('cancel')) this.pick = 'cancel';
  }

  private step(dc: number, dr: number): void {
    const c = Math.max(0, Math.min(COLS - 1, this.c + dc));
    const r = Math.max(0, Math.min(ROWS - 1, this.r + dr));
    if (c === this.c && r === this.r) return;
    this.c = c;
    this.r = r;
    se('se_cursor', { vol: 0.3, pitch: 0.9 + r * 0.05 });
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
        g.clip(SX, oy, RX - SX - 4, CH, () => this.drawScene(g, oy, dy));
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        // the ones cut so far, small, and the count
        const n = kyGotN();
        g.text(KY_UI.count(n), RX, oy + 4, { color: n >= 3 ? '#FFE7A3' : '#F4ECD8' });
        for (let i = 0; i < 3; i++) if (flag(KF.got) & (1 << i)) drawCuke(g, RX + 46 + i * 20, oy + 8, i);
        if (this.active) KY_UI.keys.forEach((l, i) => g.text(l, RX, oy + KEYS_Y + i * 16, { color: '#FFE7A3' }));
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(KY_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, KY_UI.place, { seed: 73 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  private drawScene(g: Gfx, oy: number, dy: number): void {
    const W = RX - SX - 4;
    // the trellis at night: the house wall behind, the net, the vines
    g.rect(SX, oy, W, CH, '#161C1A');
    for (let x = SX + 6; x < SX + W; x += 12) g.line(x, oy, x, oy + CH, '#2A3230');
    for (let y = oy + 6; y < oy + CH; y += 12) g.line(SX, y, SX + W, y, '#2A3230');
    g.rect(SX + 2, oy, 3, CH, '#7A6A4A');
    g.rect(SX + W - 5, oy, 3, CH, '#7A6A4A');
    const lx = Math.round(this.lx);
    const ly = Math.round(this.ly + dy);
    // the big leaves, overlapping (lighter and thinner where the light is: the fruit shows through)
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const [x, y] = cellXY(c, r, oy);
        for (const [ox, oy2, rr] of [[-12, -8, 13], [10, -2, 12], [-4, 10, 11]] as const) {
          const cx = x + ox + ((r * 7 + c * 3) % 5) - 2;
          const cy = y + oy2;
          const d = Math.hypot(cx - lx, cy - ly);
          const lit = Math.max(0, 1 - d / (LIGHT_R + 10));
          const hasFruit = KY_AT.some(([fc, fr], i) => fc === c && fr === r && !(flag(KF.got) & (1 << i)));
          g.alpha(hasFruit ? 0.9 - lit * 0.6 : 0.95 - lit * 0.2, () => oval(g, cx, cy, rr, Math.round(rr * 0.8), lit > 0.3 ? '#4E8A3E' : '#24402A'));
          g.alpha(0.6, () => g.line(cx - rr + 3, cy, cx + rr - 3, cy, lit > 0.3 ? '#7AB05A' : '#304E34'));
        }
      }
    // the fruit in the leaves' shade: seen only in the light (it shows through the thinned leaves, glowing)
    KY_AT.forEach(([c, r], i) => {
      if (flag(KF.got) & (1 << i)) return;
      const [x, y] = cellXY(c, r, oy);
      const d = Math.hypot(x - lx, y - ly);
      if (d > LIGHT_R + 6) return;
      g.alpha(Math.max(0, 1 - d / (LIGHT_R + 6)) * 0.95, () => drawCuke(g, x, y - 14, i));
    });
    // a yellow flower or two
    for (const [x, y] of [[SX + 60, oy + 8], [SX + 150, oy + 76]] as const) {
      g.rect(x, y, 3, 3, '#F4D23A');
      g.px(x + 1, y + 1, '#D8A82A');
    }
    // the tomato's light: a big, soft ring (easy to follow on a small screen)
    for (let rr = LIGHT_R; rr > 0; rr -= 6) g.alpha(0.06, () => g.circle(lx, ly, rr, '#F28A3A'));
    if (this.active) g.ring(lx, ly, LIGHT_R + Math.round(Math.sin(this.t / 220)), '#FFE7A3');
    // the scissors going in
    if (this.snip > 0) {
      const u = Math.sin((1 - this.snip / 400) * Math.PI);
      g.line(lx + 12, ly - 22, lx + 2, ly - 14 + Math.round(u * 2), '#C8CCD4');
      g.line(lx + 16, ly - 18, lx + 2, ly - 14 - Math.round(u * 2), '#C8CCD4');
      g.rect(lx + 12, ly - 24, 6, 3, '#E23B2E');
    }
  }
}

function* openPanel(p: KyPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: KyPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;

/** 2 大写し「葉の かげ」。true：3本 そろった。 */
function* hanoKage(): Co<boolean> {
  const p = new KyPanel();
  p.auto = qaAuto;
  let all = false;
  try {
    yield* openPanel(p);
    if (!flag(KF.intro)) {
      setFlag(KF.intro, 1);
      yield* runMsg(T.KY_KAGE_START);
    }
    for (;;) {
      if (kyGotN() >= 3) {
        all = true;
        break;
      }
      p.pick = null;
      p.active = true;
      while (!p.pick) yield null;
      p.active = false;
      if (p.pick === 'cancel') break;
      const k = p.here();
      if (k < 0) {
        // the first one's place again, knowing: グソっ君 touches its spines a second time (once)
        const first = KY_AT[0];
        if (p.c === first[0] && p.r === first[1] && flag(KF.got) & 1 && !flag(KF.nido) && kanenariHere()) {
          setFlag(KF.nido, 1);
          se('se_emote', { vol: 0.5 });
          yield* say(T.KY_NIDO);
        } else yield* runMsg(T.KY_HA);
        continue;
      }
      if (k === 0) yield* runMsg(T.KY_ICHI_A);
      p.snip = 400;
      se('se_kotei_snip');
      yield 400;
      setFlag(KF.got, flag(KF.got) | (1 << k));
      se('se_item', { vol: 0.35 });
      yield* runMsg(T.kyKiru(kyGotN()));
      if (k === 0) {
        if (kanenariHere()) se('se_emote', { vol: 0.5 });
        yield* say(kanenariHere() ? T.KY_ICHI_B : T.KY_ICHI_SOLO);
      } else if (k === 1) yield* say(T.KY_NI);
      else yield* say(kanenariHere() ? T.KY_SAN : T.KY_SAN_SOLO);
    }
  } finally {
    yield* closePanel(p);
  }
  return all;
}

// ================================================================ 台本

/** きゅうりの 棚。 */
registerScript('obj_ky_tana', function* (): Co {
  se('se_examine');
  if (hStage() === 0 && !pgOn()) {
    yield* runMsg(T.KY_TANA_DARK);
    return;
  }
  if (kyGotN() >= 3 || flag(KF.done)) {
    yield* runMsg(T.KY_TANA_DONE);
    return;
  }
  if (!kyOpen() || !flag(KF.start)) {
    yield* runMsg(T.KY_TANA);
    return;
  }
  const all = yield* hanoKage();
  if (!all) {
    yield* say(T.KY_STOP);
    return;
  }
  yield* getKeyItem(KY_SANBON, T.KY_SOROTTA, false);
});

/** 1 ソワカの〔kyuri〕（した とき true）。 */
function* sawakoKyuri(): Co<boolean> {
  if (pgOn() || !onMap(VILLAGE)) return false;
  const s = hStage();
  if (s === 0) {
    if (!flag(KF.heard) || flag(KF.h0)) return false;
    setFlag(KF.h0, 1);
    yield* say(T.KY_H0);
    return true;
  }
  if (!kyOpen()) return false;
  if (flag(KF.done)) {
    if (!flag(KF.after)) {
      setFlag(KF.after, 1);
      yield* say(T.KY_AFTER);
      return true;
    }
    return false;
  }
  if (!flag(KF.start)) {
    if (flag(KF.heard) < 2) return false;
    setFlag(KF.start, 1);
    yield* say(T.KY_START);
    return true;
  }
  yield* say(state.inventory.includes(KY_SANBON) ? T.KY_FUDA_GO : T.KY_WAIT);
  return true;
}

wrap(SAWAKO, function* (_ctx, orig): Co {
  if (yield* sawakoKyuri()) return;
  yield* orig();
  // 1：段階0 で 聞いた、2：灯りの あと（段階1〜2）で 聞いた
  if (onMap(VILLAGE) && !pgOn() && hStage() <= 2) setFlag(KF.heard, Math.max(flag(KF.heard), kyOpen() ? 2 : 1));
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.kyuri(step = 'sawako', stage = 'h1', auto = false)（トマトの 灯り）
 *   'h0'      段階0、ソワカの 前 (23,38) 上向き（今の 会話の あと：1 の 2ページと「暗くて」）
 *   'sawako'  今の 会話を 聞いた あと、ソワカの 前（話すと〔kyuri〕）
 *   'tana'    〔kyuri〕の あと、棚の 前 (19,35) 東向き（大写し）
 *   'fuda'    3本 持って、無人販売所の 札の 前 (21,38) 上向き（札と くらべる → 4・5）
 *   'yoshie'  3本 持って、集会所の ぴょん夫人の 前 (3,5) 西向き（お茶の あとに かくしの 1行）
 *   'after'   すんだ あと、販売所の 台の 前
 */
if (import.meta.env.DEV) {
  registerDebug('kyuri', (step = 'sawako', stg = 'h1', auto = false) => {
    if (step === 'h0') cmd().jump?.('ch2:house', true);
    else if (stg === 'h2') cmd().jump?.('ch2:hill', true);
    else cmd().jump?.('ch2:houki', true);
    for (const id of Object.values(KF)) setFlag(id, 0);
    for (const it of [KY_SANBON, KY_TORE]) while (state.inventory.includes(it)) removeItem(it);
    qaAuto = !!auto;
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    setFlag(KF.heard, step === 'h0' ? 1 : 2);
    if (step === 'h0' || step === 'sawako') return go(VILLAGE, 23, 38, 'up');
    setFlag(KF.start, 1);
    if (step === 'tana') return go(VILLAGE, 19, 35, 'right');
    setFlag(KF.intro, 1);
    setFlag(KF.got, 7);
    addItem(KY_SANBON);
    if (step === 'fuda') return go(VILLAGE, 21, 38, 'up');
    if (step === 'yoshie') return go('map_hoshi_school', 3, 5, 'left');
    removeItem(KY_SANBON);
    setFlag(KF.done, 1);
    return go(VILLAGE, 21, 38, 'up');
  });

  // (the light put on a cell directly, for the pictures)
  registerDebug('kyAim', (c = 0, r = 0) => {
    const p = game.ui.widgets.find((w) => w instanceof KyPanel) as KyPanel | undefined;
    if (!p) return 'no panel';
    p.c = Number(c);
    p.r = Number(r);
    return [p.c, p.r];
  });

  registerDebug('kyState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(KF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof KyPanel) as KyPanel | undefined;
    const f = field();
    return {
      flags,
      got: kyGotN(),
      open: kyOpen(),
      items: state.inventory.filter((i) => i.startsWith('item_ky_')),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      panel: p ? { c: p.c, r: p.r, here: p.here(), active: p.active } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines; the panel's words in their room. */
export function kyTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足', '平和', '3人', '海', '水族館', 'いただきます', 'ほどよい', 'らっきょ', 'さすが 師匠', 'おかわり', '干しすぎ', 'ダンゴムシ'];
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
        if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || !t) {
          flush();
          if (t.startsWith('@')) who = t.slice(1);
          continue;
        }
        const plain = raw.replace(/\{[^}]*\}/g, '');
        if (measure(plain) > 336) bad.push(`${name}: ${measure(plain)}px: ${plain}`);
        for (const b of BANNED) if (plain.includes(b)) bad.push(`${name}: 「${b}」: ${plain}`);
        if (/\d+:\d\d/.test(plain) || /\d+時/.test(plain) || /\d+分/.test(plain)) bad.push(`${name}: time: ${plain}`);
        if ((who === 'narr' || who === 'sys') && plain.includes('さん')) bad.push(`${name}: 地の文の さん: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('ky', T.KY_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of KY_UI.keys) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  if (KEYS_Y + KY_UI.keys.length * 16 > CH) bad.push(`keys: bottom ${KEYS_Y + KY_UI.keys.length * 16} > ${CH}`);
  // the light reaches every cell, and its ring stays in the scene
  const [x0, y0] = cellXY(0, 0, SY);
  const [x1, y1] = cellXY(COLS - 1, ROWS - 1, SY);
  if (x0 - LIGHT_R < SX - 6 || x1 + LIGHT_R > RX + 2 || y0 - LIGHT_R < SY - 12 || y1 + LIGHT_R > SY + CH + 12) bad.push('灯りの 目が 場面から はみ出す');
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('kyText', () => kyTextCheck());
