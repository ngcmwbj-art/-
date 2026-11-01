// つるっと、終われる（第3章の クリア前、段階1。げむきか 10/25 の 案1、2026-10-25 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_tokoro.ts、みました帳の ページは ui/menu/book_tokoro.ts、絵は art/props/tokoro_art.ts。
//
//   段階1（正午）、②食堂かもめの 決着の あと（flag_ch3_shokudo_done）から S12 の ナリオサメの 前まで。おばあは ★（1便目で
//   必ず 来る）ので、ほかの 条件は ない。
//   ・おばあ（あぜ道市の『ひのや 出張所』(22,3)、c3_kita_npc_obaa）：いつもの 会話と ショップの あと（flag_tk_heard）、
//     もう1回 話すと〔tokoro〕（flag_tk_start）。グソっ君が いない ときは 言いださない。頭の 上に「！」（world/marks.ts）。
//   ・港の 乾物屋 obj_c3_kanbutsuya (33–37,23)：今の 文の あと、天草の 袋 → 大事なもの item_c3_tengusa（flag_tk_got）。
//     代金は 箱へ（80円。足りない ときは おばあの つけ：flag_tk_tsuke）。かくし：もらった あと、札を もう1回（flag_tk_fuda2）。
//   ・食堂かもめ（map_c3_shokudo）の ナミエ (4,3)：天草を 持って 話すと 煮る。おばあが 戸から 入って 台の 内 (6,3) に 立つ
//     （その あいだだけ。kitaComeIn）。カウンターの 西の はし (1,4) に カセットコンロと 小さな 鍋（台の 内に 人が 立つと 透けるので、だれも 立たない 西の はし）（湯気は 暗転なしで 少しずつ 減る）、カウンター
//     (5,4) に 流し箱（汁 → 固まる）。
//   ・大写し「天突き」TentsukiPanel：←→ で 筒を まっすぐに 立てる → けっていを 押さえて 突く（はなすと 止まる。押さえて
//     いる あいだ ←→ は きかない：会議 10-25「押さえる」と「傾ける」を 同時に しない）。曲がった まま 突くと「ぷつん」と
//     短い（しくじりに しない）。3杯。3杯目は ゴロウの 前 (3,4) に（小鉢の 絵 flag_tk_goro）。もどる で やめると、残りは
//     ナミエが 突く（flag_tk_yameta）。
//   ・食べ方：しゅんが 1つ 選ぶ（flag_tk_kata 1 酢じょうゆ・2 からし・3 黒蜜）。グソっ君は 酢じょうゆと 黒蜜。
//   ・ごほうび：ところてん item_c3_tokoroten 2つ、朱肉 +2、みました帳③の すみ（flag_tk_done）。流し箱は ふせて 置く。
//   ・段階1 で 済んだ あと：流し箱を 調べると 1行。おばあに 1回（flag_tk_after）。
//   ・段階2（S13〜S14）：済んで いれば、店の 前の ナミエの〔c2〕の あと 1回（flag_tk_c2）。煮る 前なら、おばあに
//     話すと 天草を 返して おしまい（flag_tk_end）。段階3 から 先は 天草を 持ち歩かない。
//   ・かくし：くま吉に ところてんを 見せる（flag_tk_kuma。寄せ豆腐を 済ませて いれば 別の 1行）。3杯とも まっすぐ
//     長く（flag_tk_meijin）。
//
// QA：__game.cmd.tokoro(step, auto)、tkState()、tkText()

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
import { registerWorldFx } from '../../world/fx';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { actorAnchor, addMarkSource } from '../../world/marks';
import { pgOn } from '../../world/postgame';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import type { Howto } from '../../ui/closeup';
import * as T from '../../data/text/c3_tokoro';
import { TK_UI } from '../../data/text/c3_tokoro';
import { tkFx } from '../../art/props/tokoro_art';
import { addMp, getKeyItem } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { addToMap, c3Stage, inCh3, kita, kitaComeIn, kitaGoOut, say3 } from './common';

export const TF = {
  heard: 'flag_tk_heard',
  start: 'flag_tk_start',
  wait: 'flag_tk_wait',
  wait2: 'flag_tk_wait2',
  got: 'flag_tk_got',
  tsuke: 'flag_tk_tsuke',
  fuda2: 'flag_tk_fuda2',
  nabe: 'flag_tk_nabe',
  bako: 'flag_tk_bako',
  n: 'flag_tk_n',
  long: 'flag_tk_long',
  yameta: 'flag_tk_yameta',
  goro: 'flag_tk_goro',
  meijin: 'flag_tk_meijin',
  kata: 'flag_tk_kata',
  done: 'flag_tk_done',
  after: 'flag_tk_after',
  c2: 'flag_tk_c2',
  end: 'flag_tk_end',
  kuma: 'flag_tk_kuma',
} as const;

const OBAA = 'npc_obaa';
const NAMIE = 'npc_c3_shokudo';
const SHOKUDO = 'map_c3_shokudo';
const TENGUSA = 'item_c3_tengusa';
const TOKOROTEN = 'item_c3_tokoroten';

function knWith(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** 寄り道が 開いている：段階1、おばあが 来ている、②の 決着の あと、ナリオサメの 前。 */
export function tkOpen(): boolean {
  return inCh3() && !pgOn() && c3Stage() === 1 && kita(OBAA) && flag('flag_ch3_shokudo_done') > 0 && !flag('flag_ch3_nariosame_beaten');
}

/** 台所の 絵の flag（鍋・流し箱・小鉢）：立てたら 出し入れを すぐ（HD-2D の 部屋は cond で 出す）。 */
function setArt(id: string, v: number): void {
  setFlag(id, v);
  field()?.refreshPresence();
}

function hasTengusa(): boolean {
  return state.inventory.includes(TENGUSA);
}

function dropTengusa(): void {
  while (state.inventory.includes(TENGUSA)) removeItem(TENGUSA);
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

// ================================================================ 大写し「天突き」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const RX = SX + 206;
/** 筒の 下の はし（網）の 所。 */
const NX = SX + 100;
const BY = 56;
/** 筒の 長さ・幅（px）。 */
const TUBE_L = 34;
const TUBE_W = 22;
/** これより まっすぐなら 長く 出る（数は 台詞に 出さない）。 */
const STRAIGHT = 0.16;
/** 押さえつづけて 突き終わる ms。 */
const PUSH_MS = 1800;
/** ←→ で 傾きが 1 動く ms。 */
const TILT_MS = 1100;
/** 会話の あと、けっていで 突きはじめられるまで（ms）。 */
const ARM_MS = 450;

export type Tsuki = 'long' | 'short';

export class TentsukiPanel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  /** はじめの カード（改善会議 10-25 の1、ui/closeup.ts）。 */
  howto: Howto = T.TK_HOWTO;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  /** QA：曲がった まま 突く 杯（0 始まりの 番号）。 */
  autoCrooked: number[] = [];
  active = false;
  phase: 'tilt' | 'push' | 'end' = 'tilt';
  cup = 0;
  /** 筒の 傾き（-1 左 〜 1 右）。 */
  tilt = 0;
  /** 突いた ぐあい（0〜1）。 */
  push = 0;
  holding = false;
  cancel = false;
  /** 突き終わった 杯の でき。 */
  results: Tsuki[] = [];
  private armT = 0;
  private wasActive = false;
  private autoT = 0;
  private tickT = 0;

  /** 次の 杯：筒は 少し 傾いた ところから。 */
  next(cup: number): void {
    this.cup = cup;
    this.phase = 'tilt';
    this.push = 0;
    this.holding = false;
    const s = cup % 2 ? -1 : 1;
    this.tilt = s * (0.45 + Math.random() * 0.35);
    this.autoT = 0;
  }

  /**
   * もどる で やめられるのは 筒を 立てて いる あいだだけ（会話の あいだ・突いて いる あいだは パネルの 物）。
   * やめると 残りの 杯は ナミエが 突く（台本は 先へ 進む：天草は もう 鍋の 中）。
   */
  quittable(): boolean {
    return this.active && this.phase === 'tilt' && !this.cancel;
  }

  quit(): boolean {
    this.cancel = true;
    return true;
  }

  straight(): boolean {
    return Math.abs(this.tilt) <= STRAIGHT;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.active !== this.wasActive) {
      this.wasActive = this.active;
      this.armT = 0;
      this.holding = false;
    }
    if (!this.active || this.phase === 'end' || this.cancel) return;
    this.armT += dt;
    let lr = 0;
    let down = false;
    let fresh = false;
    if (this.auto) {
      this.autoT += dt;
      const goal = this.autoCrooked.includes(this.cup) ? 0.5 * Math.sign(this.tilt || 1) : 0;
      if (this.phase === 'tilt') {
        if (Math.abs(this.tilt - goal) > 0.04) lr = this.tilt > goal ? -1 : 1;
        else fresh = this.autoT > 300;
      } else down = true;
    } else {
      lr = (input.down('right') ? 1 : 0) - (input.down('left') ? 1 : 0);
      down = input.down('confirm');
      // a fresh press starts the push (the key that closed the last line must be let go first; a little
      // while after the line, so a press mashed through the talk doesn't start a crooked push)
      fresh = this.armT > ARM_MS && input.pressed('confirm');
      // (もどる: ui/closeup.ts が quit() を 呼ぶ)
    }
    if (this.phase === 'tilt') {
      // one thing at a time: the arrows stand the tube up, then a press starts the push (no tilting while pressing)
      this.tilt = Math.max(-1, Math.min(1, this.tilt + (lr * dt) / TILT_MS));
      if (fresh) {
        this.phase = 'push';
        this.holding = true;
        se('se_c3_otama', { vol: 0.25, pitch: 0.8 });
      }
      return;
    }
    // push: held, the plunger goes down; let go, it stops where it is
    this.holding = down;
    if (!down) return;
    this.push = Math.min(1, this.push + dt / PUSH_MS);
    this.tickT += dt;
    if (this.tickT > 260) {
      this.tickT = 0;
      se('se_h_uzu_suru', { vol: 0.16, pitch: this.straight() ? 1.3 : 1.0 });
    }
    if (this.push >= 1) {
      this.phase = 'end';
      this.holding = false;
      this.results.push(this.straight() ? 'long' : 'short');
      se(this.straight() ? 'se_h_uzu_suru' : 'se_poton', { vol: 0.35, pitch: this.straight() ? 0.8 : 1.4 });
    }
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
      const tw = g.measure(TK_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, TK_UI.place, { seed: 61 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  private drawScene(g: Gfx, oy: number): void {
    const W = RX - SX - 4;
    // the kitchen wall's white tiles behind, the counter's wood in front
    g.rect(SX, oy, W, CH, '#E2DED2');
    for (let y = oy + 8; y < oy + CH; y += 10) g.rect(SX, y, W, 1, '#CFCABC');
    for (let x = SX + 6; x < SX + W; x += 12) g.rect(x, oy, 1, CH, '#D6D1C4');
    const cy = oy + 92;
    g.rect(SX, cy, W, CH - (cy - oy), '#C8A06A');
    g.rect(SX, cy, W, 2, '#E8C890');
    g.rect(SX, cy + 8, W, CH, '#8A5A3A');
    // the 流し箱 on the left, half cut away (the block that went into the tube)
    g.rect(SX + 14, cy - 8, 40, 8, '#A8B0B8');
    g.rect(SX + 16, cy - 7, 22, 5, '#D8DCC8');
    g.rect(SX + 16, cy - 7, 22, 1, '#ECEEE0');
    g.rect(SX + 14, cy - 1, 40, 1, '#7A828C');
    // the small bowl under the tube, and what has come out so far
    const bx = NX;
    const bt = cy - 12;
    g.rect(bx - 18, bt, 36, 2, '#4A5A8A');
    g.rect(bx - 17, bt + 2, 34, 4, '#5A6A9A');
    g.rect(bx - 14, bt + 6, 28, 4, '#4A5A8A');
    g.rect(bx - 8, bt + 10, 16, 2, '#3A4A7A');
    const out = this.phase === 'tilt' ? 0 : this.push;
    const long = this.straight();
    if (out > 0.15) {
      const h = Math.round((out - 0.15) * 9);
      for (let i = 0; i < 9; i++) {
        const x = bx - 13 + i * 3;
        const hh = Math.max(0, h - Math.abs(i - 4));
        if (!hh) continue;
        g.rect(x, bt - hh + 1, long ? 2 : 2, hh, long ? '#E8ECDC' : '#D8DECC');
        if (!long) for (let y = bt - hh + 2; y < bt + 1; y += 3) g.rect(x, y, 2, 1, '#B8C2A8');
      }
    }
    // the tube (wooden, square), leaning by its tilt round the net at its foot
    const ang = this.tilt * 0.5;
    const s = Math.sin(ang);
    const c = Math.cos(ang);
    const fx = NX;
    const fy = oy + BY;
    const at = (d: number): [number, number] => [fx + s * d, fy - c * d];
    // the strands from the net down to the bowl (long and in one piece when straight, in bits when leaning)
    if (out > 0.02) {
      const len = Math.max(0, bt - fy - 1);
      for (let i = 0; i < 6; i++) {
        const x0 = fx - 7 + i * 3 + Math.round(s * 2);
        if (long) {
          const wob = Math.round(Math.sin(this.t / 160 + i) * 1);
          for (let y = 0; y < len; y++) g.rect(x0 + (y > len / 2 ? wob : 0), fy + 1 + y, 1, 1, i % 2 ? '#E8ECDC' : '#F0F2E6');
        } else {
          const seg = 4;
          const off = Math.round((this.t / 40 + i * 5) % len);
          g.rect(x0, fy + 1, 1, seg, '#E0E6D2');
          if (this.holding) g.rect(x0 + (i % 2), fy + 1 + off, 1, seg, '#D8DECC');
        }
      }
    }
    for (let d = 0; d <= TUBE_L; d++) {
      const [x, y] = at(d);
      const xx = Math.round(x - TUBE_W / 2);
      const yy = Math.round(y);
      g.rect(xx, yy, TUBE_W, 1, d % 9 === 0 ? '#9A7448' : '#B8925A');
      g.rect(xx, yy, 2, 1, '#8A6444');
      g.rect(xx + TUBE_W - 2, yy, 2, 1, '#D8B07A');
    }
    // the net at the foot, the block of ところてん seen through the top, the plunger going down
    {
      const [x, y] = at(0);
      g.rect(Math.round(x - TUBE_W / 2), Math.round(y), TUBE_W, 2, '#6A707A');
      for (let i = 1; i < TUBE_W; i += 3) g.px(Math.round(x - TUBE_W / 2 + i), Math.round(y + 1), '#C8CDD4');
    }
    const pd = TUBE_L - 4 - this.push * (TUBE_L - 8);
    const [px, py] = at(pd);
    g.rect(Math.round(px - TUBE_W / 2 + 2), Math.round(py), TUBE_W - 4, 3, '#7A5A3A');
    // the rod and its handle, up out of the tube
    const [hx, hy] = at(pd + 18);
    g.line(Math.round(px), Math.round(py), Math.round(hx), Math.round(hy), '#8A6444');
    g.line(Math.round(px) + 1, Math.round(py), Math.round(hx) + 1, Math.round(hy), '#A8825A');
    g.rect(Math.round(hx - 9), Math.round(hy - 2), 18, 4, '#9A7448');
    g.rect(Math.round(hx - 9), Math.round(hy - 2), 18, 1, '#C8A06A');
    // しゅん's hand on the handle while pressing (from the right)
    if (this.holding) {
      g.rect(Math.round(hx - 6), Math.round(hy - 6), 12, 5, '#E8B890');
      g.rect(Math.round(hx + 6), Math.round(hy - 5), 14, 4, '#3E8A4E');
    }
    // the plumb line: a faint upright through the net, so "straight" can be seen
    if (this.phase === 'tilt') for (let y = oy + 6; y < fy - 2; y += 4) g.px(fx, y, '#9A9488');
  }

  private drawSide(g: Gfx, oy: number): void {
    g.text(TK_UI.katamuki, RX, oy + 2, { color: '#8A84A0' });
    // the lean gauge across the top of the column (no numbers): the straight band in the middle
    const gw = 86;
    const gx = RX;
    const gy = oy + 20;
    g.rect(gx, gy, gw, 6, '#1A1626');
    const mid = gx + gw / 2;
    const band = Math.round(STRAIGHT * (gw / 2));
    g.rect(Math.round(mid - band), gy - 1, band * 2, 8, '#3A6A8A');
    const mx = Math.round(mid + this.tilt * (gw / 2 - 2));
    g.rect(mx - 1, gy - 2, 3, 10, this.straight() ? '#FFE7A3' : '#F2894B');
    g.frame(gx - 1, gy - 1, gw + 2, 8, '#8A84A0');
    g.text(TK_UI.hai(Math.min(3, this.results.length + (this.phase === 'end' ? 0 : 1))), RX, oy + 34, { color: '#F4ECD8' });
    if (this.active && this.phase !== 'end') {
      const keys = this.phase === 'tilt' ? TK_UI.keysTilt : TK_UI.keysPush;
      keys.forEach((l, i) => g.text(l, RX, oy + 62 + i * 16, { color: '#FFE7A3' }));
    }
  }
}

function* openPanel(p: TentsukiPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: TentsukiPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;
let qaCrooked: number[] = [];
/** QA：ナミエに 話すと 天突きから（'tsuki'）。 */
let qaTsuki = false;

/** 5 天突き：突いた 杯の でき（やめたら 残りは 入らない）。 */
function* tentsuki(): Co<{ res: Tsuki[]; yameta: boolean }> {
  const p = new TentsukiPanel();
  p.auto = qaAuto;
  p.autoCrooked = qaCrooked;
  let yameta = false;
  try {
    yield* openPanel(p);
    yield* say3(T.TK_RULE);
    let firstLong = true;
    let firstShort = true;
    for (let cup = 0; cup < 3; cup++) {
      p.next(cup);
      p.active = true;
      while (p.phase !== 'end' && !p.cancel) yield null;
      p.active = false;
      if (p.cancel) {
        yameta = true;
        break;
      }
      yield 500;
      const r = p.results[p.results.length - 1];
      if (r === 'long') {
        yield* say3(firstLong ? T.TK_NAGAI_1 : T.TK_NAGAI);
        firstLong = false;
      } else {
        yield* say3(firstShort ? T.TK_MIJIKAI_1 : T.TK_MIJIKAI);
        firstShort = false;
      }
    }
  } finally {
    yield* closePanel(p);
  }
  return { res: p.results.slice(), yameta };
}

// ================================================================ 台本

/** 1 海の 町に 来たら（〔tokoro〕）。 */
function* tokoroStart(): Co {
  setFlag(TF.start, 1);
  yield* say3(T.TK_A);
}

/** 2 白い 海の 草（乾物屋。今の 文の あと）。 */
function* kanbutsu(): Co {
  yield* say3(T.TK_KANBUTSU);
  if (state.money >= T.TK_PRICE) {
    state.money -= T.TK_PRICE;
    se('se_coin');
    yield* say3(T.TK_PAY);
  } else {
    setFlag(TF.tsuke, 1);
    yield* say3(T.TK_PAY_TSUKE);
  }
  setFlag(TF.got, 1);
  yield* getKeyItem(TENGUSA, T.TK_GET, false);
}

/**
 * おばあが 入って くる 道（戸 → 台の 内 (6,3)）。しゅんか グソっ君が そこに いれば、空いている 東の マスで 止まる
 * （(7,3)・(8,3)・(8,4)。人の 上に 重ならない）。
 */
function obaaPath(): [number, number][] {
  const f = field();
  const taken = new Set<string>();
  for (const a of [f?.player, f?.follower]) if (a && a.visible) taken.add(`${a.tileX},${a.tileY}`);
  const to = ([[6, 3], [7, 3], [8, 3], [8, 4]] as [number, number][]).find(([x, y]) => !taken.has(`${x},${y}`)) ?? [8, 4];
  const path: [number, number][] = [[7, 7], [7, 6], [7, 5]];
  if (to[0] === 8) path.push([8, 5], [8, 4]);
  else path.push([7, 4]);
  if (to[1] === 3) path.push([to[0] === 8 ? 8 : 7, 3]);
  if (to[0] === 6) path.push([6, 3]);
  return path;
}

/** 3〜8（食堂かもめの 台所）。 */
function* tokoroCook(): Co {
  if (qaTsuki) {
    // (QA: 天突きから。おばあは 台の 内に、流し箱は 固まった ところ)
    qaTsuki = false;
    yield* kitaComeIn(OBAA, SHOKUDO, obaaPath().slice(-1), 'left');
    dropTengusa();
    setArt(TF.nabe, 2);
    setArt(TF.bako, 2);
    yield* tokoroTsuki();
    return;
  }
  yield* say3(T.TK_NAMIE_A);
  // 3 おばあが 店の 中へ（煮る あいだだけ）
  yield* kitaComeIn(OBAA, SHOKUDO, obaaPath(), 'left');
  dropTengusa();
  tkFx.steam = 1;
  tkFx.level = 1;
  setArt(TF.nabe, 1);
  se('se_c3_nabe', { vol: 0.5 });
  yield* say3(T.TK_ARAU);
  yield* say3(T.TK_NIRU);
  // (暗転なし：湯気が 少しずつ 減って、鍋の 中が 半分ほどに)
  yield* animate(2600, (x) => {
    tkFx.steam = 1 - 0.75 * x;
    tkFx.level = 1 - 0.5 * x;
  }, ease.linear);
  yield* say3(T.TK_NITA);
  setArt(TF.nabe, 2);
  setArt(TF.bako, 1);
  se('se_drip', { vol: 0.4 });
  yield* say3(T.TK_KOSU);
  // 4 冷めると、固まる
  yield* say3(T.TK_HIYASU);
  yield 900;
  setArt(TF.bako, 2);
  se('se_poton', { vol: 0.3, pitch: 0.7 });
  yield* say3(T.TK_KATAMARU);
  yield* tokoroTsuki();
}

/** 5〜8（天突きから 先）。 */
function* tokoroTsuki(): Co {
  // 5 天突き
  const r = yield* tentsuki();
  setFlag(TF.n, r.res.length);
  setFlag(TF.long, r.res.filter((x) => x === 'long').length);
  if (r.yameta) {
    setFlag(TF.yameta, 1);
    yield* say3(T.TK_YAMERU);
  }
  setArt(TF.goro, 1);
  se('se_c3_teishoku', { vol: 0.4 });
  yield* say3(T.TK_GORO);
  if (r.res.length === 3 && r.res.every((x) => x === 'long') && !flag(TF.meijin)) {
    setFlag(TF.meijin, 1);
    yield* say3(T.TK_MEIJIN);
  }
  // 6 黒蜜？
  const i = yield* say3(T.TK_TABEKATA);
  const k = Math.max(0, Math.min(2, i));
  setFlag(TF.kata, k + 1);
  yield* say3(T.TK_ERABU[k]);
  yield* say3(T.TK_KN_TABERU);
  // 7 最後の 小鉢
  yield* say3(T.TK_SAIGO);
  // 8 ごほうび（流し箱は 洗って ふせる）
  setArt(TF.nabe, 0);
  setArt(TF.bako, 3);
  addItem(TOKOROTEN);
  addItem(TOKOROTEN);
  addMp(2);
  setFlag(TF.done, 1);
  se('se_item');
  yield* say3(T.TK_REWARD);
  kitaGoOut(OBAA);
}

// ---------------------------------------------------------------- おばあ（あぜ道市の 出張所）

wrap(`c3_kita_${OBAA}`, function* (_ctx, orig): Co {
  // 段階2（12:01）：煮る 前に 海が 動いた（天草は おばあへ）
  if (inCh3() && !pgOn() && c3Stage() === 2 && flag(TF.start) && !flag(TF.done) && !flag(TF.end)) {
    setFlag(TF.end, 1);
    dropTengusa();
    yield* say3(T.TK_END);
    return;
  }
  if (!tkOpen()) {
    yield* orig();
    if (inCh3() && c3Stage() === 1) setFlag(TF.heard, 1);
    return;
  }
  if (!flag(TF.start)) {
    if (!flag(TF.heard) || !knWith()) {
      yield* orig();
      setFlag(TF.heard, 1);
      return;
    }
    yield* tokoroStart();
    return;
  }
  if (!flag(TF.done)) {
    if (!hasTengusa() && !flag(TF.wait)) {
      setFlag(TF.wait, 1);
      yield* say3(T.TK_WAIT);
      return;
    }
    if (hasTengusa() && !flag(TF.wait2)) {
      setFlag(TF.wait2, 1);
      yield* say3(T.TK_WAIT2);
      return;
    }
    yield* orig();
    return;
  }
  if (!flag(TF.after)) {
    setFlag(TF.after, 1);
    yield* say3(T.TK_AFTER);
    return;
  }
  yield* orig();
});

// 見のがさない しるし（〔tokoro〕を 言いだせる とき、おばあの 頭の 上）
addMarkSource((f) => {
  if (f.map.id !== 'map_c3_ichiba' || !tkOpen() || !flag(TF.heard) || flag(TF.start) || !knWith()) return null;
  const a = f.actorById(OBAA);
  return a && a.visible ? actorAnchor(a) : null;
});

// ---------------------------------------------------------------- 港の 乾物屋（今の 文の あと）

wrap('obj_c3_kanbutsuya', function* (_ctx, orig): Co {
  yield* orig();
  if (!inCh3() || pgOn()) return;
  if (tkOpen() && flag(TF.start) && !flag(TF.got)) {
    yield* kanbutsu();
    return;
  }
  if (flag(TF.got) && !flag(TF.fuda2) && c3Stage() <= 2) {
    setFlag(TF.fuda2, 1);
    yield* say3(T.TK_FUDA2);
  }
});

// ---------------------------------------------------------------- 食堂かもめ（ナミエ・流し箱・鍋）

wrap(NAMIE, function* (_ctx, orig): Co {
  if (tkOpen() && onMap(SHOKUDO) && hasTengusa() && !flag(TF.done)) {
    yield* tokoroCook();
    return;
  }
  yield* orig();
  if (inCh3() && !pgOn() && c3Stage() === 2 && flag(TF.done) && !flag(TF.c2)) {
    setFlag(TF.c2, 1);
    yield* say3(T.TK_C2);
  }
});

const S1 = (f: string) => ({ stage: 1, flag: f, when: () => inCh3() && !pgOn() });
addToMap(SHOKUDO, [
  { t: 'prop', prop: 'prop_tk_nabe', x: 1, y: 4, cond: S1(TF.nabe) } as unknown as MapObj,
  { t: 'prop', prop: 'prop_tk_bako', x: 5, y: 4, cond: S1(TF.bako) } as unknown as MapObj,
  { t: 'prop', prop: 'prop_tk_kobachi', x: 3, y: 4, cond: S1(TF.goro) } as unknown as MapObj,
  // 済んだ あと、ふせた 流し箱（カウンターの 越しに）
  { t: 'obj', id: 'obj_tk_bako', x: 5, y: 4, face: 'up', script: 'obj_tk_bako', cond: { stage: 1, flag: TF.done } } as unknown as MapObj,
]);
registerScript('obj_tk_bako', function* (): Co {
  se('se_examine');
  yield* say3(T.TK_BAKO);
});

// ---------------------------------------------------------------- くま吉（ところてんを 見せる。1回）

wrap('c3_kita_npc_mamekichi', function* (_ctx, orig): Co {
  if (inCh3() && !pgOn() && state.inventory.includes(TOKOROTEN) && !flag(TF.kuma)) {
    setFlag(TF.kuma, 1);
    yield* say3(flag('flag_yd_done') ? T.TK_KUMA_YOSE : T.TK_KUMA);
    return;
  }
  yield* orig();
});

// 段階3 から 先は 天草を 持ち歩かない（段階2 の 1行は おばあに 話した とき）
registerWorldFx({
  map: '',
  update() {
    if (flag('flag_ch3_stage') >= 3 && state.inventory.includes(TENGUSA)) dropTengusa();
  },
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.tokoro(step = 'obaa', auto = false)（第3章の 段階1、②の 決着の あと、おばあが 来た）
 *   'obaa'     いつもの 会話の あと、おばあの 前 (22,4) 上向き（話すと〔tokoro〕）
 *   'kanbutsu' 〔tokoro〕の あと、乾物屋の 前 (35,24) 上向き（調べると 天草）
 *   'namie'    天草を 持って、食堂かもめの 台所の ナミエの 右 (5,3) 左向き（話すと 煮る → 天突き）。
 *              'mix' は auto の 版で 2杯目を 曲げて 突く。'tsuki' は 話すと 天突きから（前の 会話を とばす）
 *   'done'     済んだ あと、食堂かもめの 流し箱の 前 (5,5) 上向き
 *   'c2'       済んだ あと 段階2、店の 前の ナミエ（umizoi）
 *   'end'      天草を 持った まま 段階2、おばあの 前
 *   'kuma'     ところてんを 持って、くま吉の 前 (27,4) 上向き
 */
if (import.meta.env.DEV) {
  registerDebug('tokoro', (step = 'obaa', auto = false) => {
    cmd().jump?.('ch3:kaisui', true);
    for (const id of Object.values(TF)) setFlag(id, 0);
    qaAuto = !!auto || step === 'mix';
    qaCrooked = step === 'mix' ? [1] : [];
    qaTsuki = step === 'tsuki';
    dropTengusa();
    while (state.inventory.includes(TOKOROTEN)) removeItem(TOKOROTEN);
    setFlag('flag_ch3_stage', 1);
    setFlag('flag_ch3_shokudo_done', 1);
    for (const id of [OBAA, 'npc_mamekichi']) {
      if (!kita(id)) {
        setFlag(`flag_ch3_kita_${id}`, 1);
        setFlag('flag_ch3_kita_n', flag('flag_ch3_kita_n') + 1);
      }
    }
    setFlag(TF.heard, 1);
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (step === 'obaa') return go('map_c3_ichiba', 22, 4, 'up');
    setFlag(TF.start, 1);
    if (step === 'kanbutsu') return go('map_umizoi', 35, 24, 'up');
    setFlag(TF.got, 1);
    if (step === 'end') {
      addItem(TENGUSA);
      setFlag('flag_ch3_stage', 2);
      return go('map_c3_ichiba', 22, 4, 'up');
    }
    if (step === 'namie' || step === 'mix' || step === 'tsuki') {
      addItem(TENGUSA);
      return go(SHOKUDO, 5, 3, 'left');
    }
    setFlag(TF.done, 1);
    setArt(TF.bako, 3);
    setArt(TF.goro, 1);
    setFlag(TF.n, 3);
    setFlag(TF.long, 2);
    setFlag(TF.kata, 3);
    if (step === 'kuma') {
      addItem(TOKOROTEN);
      return go('map_c3_ichiba', 27, 4, 'up');
    }
    if (step === 'c2') {
      setFlag('flag_ch3_stage', 2);
      return go('map_umizoi', 29, 17, 'up');
    }
    return go(SHOKUDO, 5, 5, 'up');
  });

  /** QA：台所の 絵だけ 出す（鍋・流し箱・小鉢。今の 地図で すぐ）。 */
  registerDebug('tkArt', (nabe = 1, bako = 2, goro = 1) => {
    setArt(TF.nabe, Number(nabe));
    setArt(TF.bako, Number(bako));
    setArt(TF.goro, Number(goro));
    return [flag(TF.nabe), flag(TF.bako), flag(TF.goro)];
  });

  registerDebug('tkState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(TF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof TentsukiPanel) as TentsukiPanel | undefined;
    const f = field();
    return {
      flags,
      open: tkOpen(),
      tengusa: hasTengusa(),
      tokoroten: state.inventory.filter((i) => i === TOKOROTEN).length,
      money: state.money,
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY, f.player.spriteId] : null,
      panel: p ? { phase: p.phase, cup: p.cup, tilt: +p.tilt.toFixed(2), push: +p.push.toFixed(2), results: p.results } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no 天丼; no clock time; the names without さん in the narration. */
export function tkTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', 'ピッ！', 'おかわり、あるよ', 'もう 1杯', '干しすぎ', '干したりない', 'ほどよいなぁ', '暗くて しめった'];
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
        const plain = raw.replace(/\{name:npc_c3_jouren\}/g, 'ゴロウ').replace(/\{name:npc_c3_shokudo\}/g, 'ナミエ').replace(/\{[^}]*\}/g, '');
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
  walkT('tk', T.TK_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of [...TK_UI.keysTilt, ...TK_UI.keysPush, TK_UI.katamuki, TK_UI.hai(3)]) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('tkText', () => tkTextCheck());
