// 土を 寄せるほど、白く なる（第2章。げむきか 10/30 の 案5、2026-10-30 依頼主の 採用。02_ch2_index）。
// 文は data/text/hoshi_negi.ts、新しい 地図は data/maps/hoshi_negi.ts（map_hoshi_negi「裏の ネギ畑」、16×10、画面 1枚）、
// 絵は art/props/negi_art.ts、みました帳の ページは ui/menu/book_negi.ts。
//
//   段階1〜2（トマトの 灯り、電気柵の ゲートが 開いた あと）。段階0 と クリア後の 夜・段階3 は 木戸の 地の文だけ（開かない）。
//   グソっ君が いなくても 進む（グソっ君の 台詞は 抜く。4 わいも 白う は とばす）。
//   ・マサル（段階1 は 牛舎の 給餌通路 (20,6)、段階2 は ゲートの 横 (50,19)）：いつもの 会話を 1回 聞いた あと、もう 1回
//     いつもの 会話に なった ときに 続けて〔negi〕（flag_nh_start）。牛舎の おてつだいの 間・ほかの 寄り道の 用は 先に 出る。
//     頭の 上に「！」。
//   ・マサルの 家の 庭の 東の はしの 木戸 (59,44)（(58,44) から 東向きに 調べる）→ 暗転で 畑 (1,5)。人が 絵の 中へ 歩いて
//     入る 形では ない（調べて 暗転）。今の 庭の 丸太の 柵（prop_h_edge_saku (59,44) len 2）は (59,45) の 1マスに して、
//     (59,44) を 木戸に する。マサルも 畑に いる（(1,4)。〔negi〕から すむまで）。
//   ・畑：1本目（見本。大写し「畝の 断面」を 見るだけ）→ 2本目（寄せる：けってい の たびに 土が 1段 上がる。分かれ目を
//     こえると マサルが 止めて 1段 もどす〈失敗に しない〉。「よし」で 終わり：白い ところの 上〜分かれ目の 下）→ 3本目
//     （去年の 札『ここは 私』。こてで 1段ずつ のける。分かれ目が 見えたら「よし」）→ 4 わいも 白う（グソっ君が 首まで）
//     → 5 白い ところ（物置の そばで マサル）→ ごほうび（flag_nh_done、朱肉 +2、ページ）。
//     土の 段は 畝ごとの flag（やめても 残り、続きから）。ひろい（closeupWide）：「よし」で よい 幅を 下へ 1段 広げる。
//   ・かくし：牛舎の おてつだい（flag_ch2_barn_work）で 堆肥の 山の マサル、堆肥の 中の 親戚（flag_taihi_done）で グソっ君と
//     マサル、2本目を 一度も こえずに「……母より、うまい。」、帰りに マサルの 家の 窓（寝息）。段階2 の すんだ あとの 畝。
//
// QA：__game.cmd.negi(step, stage, auto)、nhState()、nhText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { W as SCREEN_W } from '../../engine/screen';
import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript, walk, face } from '../../world/api';
import { getMapDef, registerMap } from '../../world/maps';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { actorAnchor, addMarkSource } from '../../world/marks';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import { pickRows, type Howto, type TouchPick } from '../../ui/closeup';
import { closeupWide } from '../../ui/closeup_wide';
import { kakimoji } from '../../battle/art/stamps';
import * as T from '../../data/text/hoshi_negi';
import { NH_UI } from '../../data/text/hoshi_negi';
import { NEGI, NH_GEN_AT, NH_IN_AT } from '../../data/maps/hoshi_negi';
import {
  NH_FORK, NH_LEAF, NH_LEAF_DK, NH_LEAF_LT, NH_MAX, NH_PALE, NH_SOIL, NH_SOIL_DK, NH_SOIL_LT, NH_WHITE, NH_WHITE_SH, nhLevelOf, nhLvFlag,
} from '../../art/props/negi_art';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { hStage, lanternOn } from './common';

export const NF = {
  /** 寄り道の 始まり（〔negi〕を 聞いた：木戸が 開く）。 */
  start: 'flag_nh_start',
  wait: 'flag_nh_wait',
  /** はじめて 畑に 入った（2 畑）。 */
  first: 'flag_nh_first',
  boushi: 'flag_nh_boushi',
  barn: 'flag_nh_barn',
  ko: 'flag_nh_ko',
  /** 1本目を 見た。 */
  ichi: 'flag_nh_ichi',
  niMae: 'flag_nh_ni_mae',
  /** 2本目を 寄せた。 */
  ni: 'flag_nh_ni',
  /** 2本目で 分かれ目を こえた 回数。 */
  koe: 'flag_nh_koe',
  umai: 'flag_nh_umai',
  sanMae: 'flag_nh_san_mae',
  /** 3本目を 直した。 */
  san: 'flag_nh_san',
  /** グソっ君の 絵（1 寝ころぶ・2 首まで）。 */
  uzumi: 'flag_nh_uzumi',
  waimo: 'flag_nh_waimo',
  done: 'flag_nh_done',
  genAfter: 'flag_nh_gen_after',
  h2: 'flag_nh_h2',
  neiki: 'flag_nh_neiki',
  lv0: 'flag_nh_lv_0',
  lv1: 'flag_nh_lv_1',
  lv2: 'flag_nh_lv_2',
} as const;

const VILLAGE = 'map_hoshimidai';
const GEN = 'npc_hoshi_gen';
/** 村の 木戸（マサルの 家の 庭の 東の はし。(58,44) から 東向きに 調べる）。 */
export const NH_KIDO: [number, number] = [59, 44];

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

/** 寄り道が 開いている：段階1〜2、トマトの 灯り、ゲートが 開いた あと、クリアの 前。 */
export function nhOpen(): boolean {
  const s = hStage();
  return s >= 1 && s <= 2 && lanternOn() && !pgOn() && !flag('flag_ch2_boss_beaten') && flag('flag_ch2_gate_open') > 0;
}

/** その 人の 物語が 先（taihi.ts の genStoryFirst と 同じ 見方）。 */
function genStoryFirst(): boolean {
  if (!flag('flag_ch2_got_tomato')) return true;
  return !flag('flag_ch2_met_gen') || !flag('flag_ch2_gate_open') || flag('flag_ch2_barn_work_on') > 0;
}

/** 畝 r の 土の 段。 */
export const nhLevel = (r: number): number => nhLevelOf(r, flag(nhLvFlag(r)));
const setLevel = (r: number, lv: number): void => setFlag(nhLvFlag(r), Math.max(0, Math.min(NH_MAX, lv)) + 1);
/** 「よし」で よい 段の 下の はし（ひろい なら 1段 下まで）。上の はしは 分かれ目の 1段 下。 */
export const nhGoodLo = (): number => (closeupWide() > 1 ? 3 : 4);
export const nhGoodHi = (): number => NH_FORK - 1;
/** 寄せた 畝（2本目・3本目）・見た 畝（3本）。 */
export const nhYoseN = (): number => (flag(NF.ni) ? 1 : 0) + (flag(NF.san) ? 1 : 0);
export const nhMitaN = (): number => (flag(NF.ichi) ? 1 : 0) + nhYoseN();

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

/** すんだ あとも、その 回は 畑に マサルが 残る（入り直すと いない）。 */
let genStays = false;

// ================================================================ 地図の 物

{
  const def = getMapDef(VILLAGE);
  if (def) {
    // the log fence behind マサル's house (59,44–45): its north tile becomes the gate
    for (const o of def.objects as unknown as { t: string; prop?: string; x: number; y: number; opts?: Record<string, unknown> }[]) {
      if (o.t === 'prop' && o.prop === 'prop_h_edge_saku' && o.x === 59 && o.y === 44) {
        o.y = 45;
        o.opts = { ...(o.opts ?? {}), len: 1 };
      }
    }
    def.objects.push(
      { t: 'prop', prop: 'prop_nh_kido', x: NH_KIDO[0], y: NH_KIDO[1], opts: { side: 'out' } } as unknown as MapObj,
      { t: 'obj', id: 'obj_nh_kido', x: NH_KIDO[0], y: NH_KIDO[1], face: 'right', script: 'obj_nh_kido', solid: [0, 0, 1, 1] } as unknown as MapObj,
    );
    registerMap(def);
  }
}
{
  const def = getMapDef(NEGI);
  if (def) {
    def.objects.push({
      t: 'npc', id: 'nh_gen', sprite: GEN, x: NH_GEN_AT[0], y: NH_GEN_AT[1], dir: 'right', script: 'nh_gen',
      cond: { when: () => nhOpen() && flag(NF.start) > 0 && (!flag(NF.done) || genStays) },
    } as unknown as MapObj);
    registerMap(def);
  }
}

// ================================================================ 見のがさない しるし

const genTalks = (): number => flag(`flag_seen_${GEN}_h${hStage()}`);

addMarkSource((f) => {
  if (!nhOpen() || flag(NF.start) || f.map.id === NEGI) return null;
  if (genTalks() < 1 || genStoryFirst()) return null;
  const a = f.actorById(GEN);
  return a && a.visible ? actorAnchor(a) : null;
});
addMarkSource((f) => {
  if (f.map.id !== VILLAGE || !nhOpen() || !flag(NF.start) || flag(NF.first)) return null;
  const foot = (NH_KIDO[1] + 1) * 16;
  return { x: NH_KIDO[0] * 16 + 8, y: foot - 30, foot };
});

// ================================================================ 大写し「畝の 断面」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 列。 */
const RX = SX + 200;
/** 1段の 高さ（px）。 */
const STEP = 6;
const KEYS_Y = 96;

type Mode = 'look' | 'yose' | 'noke';

export class NegiPanel implements Widget {
  modal = true;
  closeup = true;
  howto: Howto = NH_UI.howto;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  /** QA：auto の 押す 順（0 = 寄せる・のける、1 = よし）。 */
  plan: number[] = [];
  phase: 'idle' | 'pick' = 'idle';
  cur = 0;
  picked = -1;
  hit = false;
  /** 絵の 土の 段（動く）。 */
  shown: number;
  /** 土を 動かした とき（0..1 土の くずれ）。 */
  puff = 0;
  private autoT = 0;
  /** 指で さわって 選ぶ（改善会議 2026-10-30 の 1、ui/closeup.ts）：右の 列の ボタン。 */
  touchPick: TouchPick = {
    spots: () => (this.phase === 'pick' && this.open >= 1 ? pickRows(this.labels().length, (i) => this.button(i, SY)) : null),
    cursor: () => this.cur,
    moveTo: (i) => {
      if (i === this.cur) return;
      this.cur = i;
      se('se_cursor', { vol: 0.3 });
    },
  };

  labels(): string[] {
    return this.mode === 'look' ? [NH_UI.modoru] : [this.mode === 'yose' ? NH_UI.yoseru : NH_UI.nokeru, NH_UI.yoshi];
  }

  /** ボタン i の 四角（画面の px）。 */
  button(i: number, oy: number): [number, number, number, number] {
    let bx = RX;
    const ls = this.labels();
    for (let k = 0; k < i; k++) bx += measure(ls[k]) + 10 + 6;
    return [bx, oy + KEYS_Y - 2, measure(ls[i]) + 10, 15];
  }

  constructor(
    public r: number,
    public mode: Mode,
  ) {
    this.shown = nhLevel(r);
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    const lv = nhLevel(this.r);
    this.shown += (lv - this.shown) * Math.min(1, dt / 90);
    if (Math.abs(lv - this.shown) < 0.02) this.shown = lv;
    if (this.puff > 0) this.puff = Math.max(0, this.puff - dt / 420);
    if (this.phase !== 'pick') return;
    const n = this.mode === 'look' ? 1 : 2;
    if (this.auto) {
      this.autoT += dt;
      if (Math.floor(this.autoT / 300) === Math.floor((this.autoT - dt) / 300)) return;
      const want = this.plan[0] ?? 1;
      if (this.cur !== want && n > 1) {
        this.cur = want;
        se('se_cursor', { vol: 0.3 });
      } else {
        this.plan.shift();
        this.picked = this.cur;
        this.hit = true;
      }
      return;
    }
    if (n > 1 && input.pressed('left') && this.cur > 0) {
      this.cur--;
      se('se_cursor', { vol: 0.3 });
    } else if (n > 1 && input.pressed('right') && this.cur < n - 1) {
      this.cur++;
      se('se_cursor', { vol: 0.3 });
    } else if (input.pressed('confirm')) {
      this.picked = this.cur;
      this.hit = true;
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
        this.drawSide(g, oy);
      });
      const tw = g.measure(NH_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, NH_UI.place, { seed: 103 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  /** 横から 見た ネギ 1本（根・白い 葉鞘・分かれ目・緑の 葉）と、寄せた 土の 線、左に 段の 目もり。 */
  private drawScene(g: Gfx, oy: number): void {
    const W = RX - SX - 4;
    // the dawn sky (blue, a little light at the bottom), the dark field beyond
    g.rect(SX, oy, W, CH, '#26304E');
    g.rect(SX, oy + 44, W, 30, '#2E3A5A');
    const base = oy + 96;
    const cx = SX + 128;
    const soil = (lv: number) => base - lv * STEP;
    const forkY = soil(NH_FORK);
    const lvNow = this.shown;
    const soilY = Math.round(soil(lvNow));
    // the ground under the ridge (and roots in it)
    g.rect(SX, base, W, CH - (base - oy), NH_SOIL_DK);
    for (const [dx, len] of [[-6, 10], [-2, 13], [3, 12], [7, 9]] as const) g.line(cx + 1, base, cx + 1 + dx, base + len, '#D8CCB0');
    // the leaves from the fork, fanning up (the green part)
    const leaves: [number, number][] = [[-36, -34], [-16, -44], [6, -48], [24, -40], [38, -26]];
    for (const [dx, dh] of leaves) {
      g.line(cx + 1, forkY, cx + 1 + dx, forkY + dh, dx < 0 ? NH_LEAF_DK : NH_LEAF);
      g.line(cx + 2, forkY, cx + 2 + dx, forkY + dh, NH_LEAF);
      g.px(cx + 1 + dx, forkY + dh, NH_LEAF_LT);
    }
    // the ridge of soil drawn up to it (a mound cut across: its top line bright)
    const half = 40 + Math.round(lvNow * 4);
    for (let x = -half; x <= half; x++) {
      const t = Math.abs(x) / half;
      const y = Math.round(soilY + (base - soilY) * t * t);
      g.rect(cx + 1 + x, y, 1, base - y, NH_SOIL);
      g.px(cx + 1 + x, y, NH_SOIL_LT);
    }
    // the sheath over the cut (it is a cross-section): white where the soil hides it, pale green where the light reaches
    for (let y = forkY; y < base; y++) {
      const under = y >= soilY;
      g.rect(cx - 3, y, 8, 1, under ? NH_WHITE : NH_PALE);
      g.px(cx + 4, y, under ? NH_WHITE_SH : NH_LEAF);
    }
    g.rect(cx - 4, soilY, 10, 1, NH_SOIL_LT);
    // crumbs when soil moved
    if (this.puff > 0) {
      g.alpha(this.puff, () => {
        for (let k = 0; k < 8; k++) g.rect(cx - 30 + k * 8, soilY - 4 - Math.round((1 - this.puff) * 6) - (k % 3) * 2, 2, 2, NH_SOIL_LT);
      });
    }
    // the fork's line (a dashed line across; red once the soil is over it), its word at the left over the line
    const forkBuried = lvNow >= NH_FORK - 0.01;
    for (let x = SX + 22; x < SX + W - 2; x += 6) g.rect(x, forkY, 3, 1, forkBuried ? '#F06A5A' : '#FFE7A3');
    g.text(NH_UI.wakareme, SX + 22, forkY - 15, { color: forkBuried ? '#F8A090' : '#FFE7A3' });
    // the white part's word (at the left, under the soil line) once there is a white part
    if (lvNow >= 1 && !forkBuried) g.text(NH_UI.shiroi, SX + 22, Math.min(base - 14, soilY + 2), { color: '#F4F1E4' });
    // the scale at the left: a tick a level, the good band in green, the soil level as a big arrow
    const rx = SX + 8;
    g.rect(rx, soil(NH_MAX), 2, base - soil(NH_MAX), '#8A84A0');
    for (let lv = 0; lv <= NH_MAX; lv++) g.rect(rx - 3, soil(lv), 8, 1, '#8A84A0');
    if (this.mode !== 'look') {
      const lo = soil(nhGoodHi());
      const hi = soil(nhGoodLo());
      g.alpha(0.55, () => g.rect(rx + 3, lo, 6, hi - lo + 1, '#7CC06A'));
    }
    g.rect(rx + 2, soilY - 1, 12, 3, '#F4ECD8');
    g.rect(rx + 12, soilY - 3, 2, 7, '#F4ECD8');
  }

  /** 右の 列：畝の 番号、土・分かれ目の 説明、ボタン 2つ（寄せる／のける・よし）。 */
  private drawSide(g: Gfx, oy: number): void {
    const x = RX - 4;
    const w = SX + CW - RX + 4;
    g.rect(x, oy, w, CH, '#262238');
    g.text(NH_UI.une(this.r + 1), RX, oy + 3, { color: '#F4ECD8' });
    // a little legend: the soil line (bar) and the fork (dashed)
    g.rect(RX, oy + 26, 14, 3, '#F4ECD8');
    g.text(NH_UI.tsuchi, RX + 18, oy + 20, { color: '#F4ECD8' });
    for (let k = 0; k < 3; k++) g.rect(RX + k * 5, oy + 44, 3, 1, '#FFE7A3');
    g.text(NH_UI.wakareme, RX + 18, oy + 37, { color: '#FFE7A3' });
    if (this.mode !== 'look') {
      g.alpha(0.55, () => g.rect(RX + 4, oy + 54, 6, 10, '#7CC06A'));
      g.text(NH_UI.koko, RX + 18, oy + 52, { color: '#B8E870' });
    }
    // the buttons
    this.labels().forEach((l, i) => {
      const [bx, by, bw, bh] = this.button(i, oy);
      const on = this.phase === 'pick' && i === this.cur;
      g.rect(bx, by, bw, bh, on ? '#FFE7A3' : '#3A3450');
      g.frame(bx, by, bw, bh, on ? '#FFF6D8' : '#8A84A0');
      g.text(l, bx + 5, by + 1, { color: on ? '#2A2440' : '#C8C0D8' });
    });
    markText(x, oy, w, CH);
  }
}

function* openPanel(p: NegiPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: NegiPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

function* waitPick(p: NegiPanel): Co<number> {
  p.hit = false;
  p.phase = 'pick';
  while (!p.hit) yield null;
  p.phase = 'idle';
  return p.picked;
}

let qaAuto = false;
/** QA：auto の とき 2本目で 1回 分かれ目を こえる。 */
let qaMiss = false;

/** 1本目：見るだけ（見本）。 */
function* lookGame(): Co {
  const p = new NegiPanel(0, 'look');
  p.auto = qaAuto;
  p.plan = [0];
  try {
    yield* openPanel(p);
    yield 250;
    yield* say(flag(NF.ichi) ? T.NH_ICHI_AGAIN : T.NH_ICHI);
    setFlag(NF.ichi, 1);
    yield* waitPick(p);
  } finally {
    yield* closePanel(p);
  }
}

/** 2本目（寄せる）・3本目（のける）。土の 段は その場で flag に（やめても 残る）。 */
function* yoseGame(r: 1 | 2): Co {
  const mode: Mode = r === 1 ? 'yose' : 'noke';
  const p = new NegiPanel(r, mode);
  p.auto = qaAuto;
  if (qaAuto) {
    const lv = nhLevel(r);
    if (r === 1) p.plan = qaMiss ? [...Array(NH_FORK - lv).fill(0), 0, 1] : [1, ...Array(NH_FORK - 1 - lv).fill(0), 1];
    else p.plan = [1, ...Array(Math.max(0, lv - (NH_FORK - 1))).fill(0), 1];
  }
  try {
    yield* openPanel(p);
    for (;;) {
      const c = yield* waitPick(p);
      const lv = nhLevel(r);
      if (c === 0) {
        p.puff = 1;
        se('se_h_soil', { vol: 0.6 });
        if (r === 1) {
          setLevel(r, lv + 1);
          if (lv + 1 >= NH_FORK) {
            yield 260;
            const n = flag(NF.koe);
            setFlag(NF.koe, n + 1);
            yield* say(n === 0 ? T.NH_KOETA : T.NH_KOETA_2);
            setLevel(r, NH_FORK - 1);
            p.puff = 1;
            se('se_h_soil', { vol: 0.4 });
          }
        } else {
          setLevel(r, lv - 1);
          if (lv - 1 < nhGoodLo()) {
            yield 260;
            yield* say(T.NH_NOKESUGI);
            setLevel(r, nhGoodLo());
            p.puff = 1;
            se('se_h_soil', { vol: 0.4 });
          }
        }
        yield 160;
        continue;
      }
      // よし
      if (r === 1 && lv < nhGoodLo()) {
        yield* say(T.NH_HAYAI);
        p.cur = 0;
        continue;
      }
      if (r === 2 && lv >= NH_FORK) {
        yield* say(T.NH_UMATTA);
        p.cur = 0;
        continue;
      }
      break;
    }
    se('se_item', { vol: 0.4 });
    yield 300;
  } finally {
    yield* closePanel(p);
  }
}

// ================================================================ 書き文字（しゅんの ツッコミ）

class Kaki implements Widget {
  modal = false;
  done = false;
  t = 0;
  update(dt: number): void {
    this.t += dt;
    if (this.t > 1400) this.done = true;
  }
  draw(g: Gfx): void {
    const img = kakimoji(T.NH_DOKO, true, 13, 2);
    const a = Math.min(1, this.t / 120, (1400 - this.t) / 250);
    const s = this.t < 140 ? 0.6 + (this.t / 140) * 0.4 : 1;
    g.alpha(Math.max(0, a), () => g.img(img, Math.round(SCREEN_W / 2 - (img.width * s) / 2), 44, { scale: s }));
  }
}

// ================================================================ 台本

/** 村の 木戸（調べる。〔negi〕の あとは 暗転で 畑へ）。 */
registerScript('obj_nh_kido', function* (): Co {
  const f = field();
  if (!f) return;
  se('se_examine');
  if (pgOn() || flag('flag_ch2_boss_beaten') || hStage() >= 3) {
    yield* say(T.NH_TO_PG);
    return;
  }
  if (!nhOpen()) {
    yield* say(T.NH_TO_H0);
    return;
  }
  if (!flag(NF.start)) {
    yield* say(T.NH_TO_SHUT);
    return;
  }
  yield* say(flag(NF.done) ? T.NH_TO_AFTER : T.NH_TO_OPEN);
  yield* f.warpCo(NEGI, NH_IN_AT[0], NH_IN_AT[1], 'right', 'se_door', VILLAGE);
});

/** 畑の 木戸（中から 調べる：庭へ）。 */
registerScript('obj_nh_kido_in', function* (): Co {
  const f = field();
  if (!f) return;
  yield* f.warpCo(VILLAGE, NH_KIDO[0] - 1, NH_KIDO[1], 'left', 'se_door', NEGI);
});

/** 2 畑（入ると すぐ。1回）。 */
registerScript('evt_nh_enter', function* (): Co {
  genStays = false;
  field()?.refreshPresence?.();
  if (!nhOpen() || !flag(NF.start) || flag(NF.first)) return;
  yield 300;
  setFlag(NF.first, 1);
  face('nh_gen', 'player');
  yield* say(T.NH_ENTER);
});

/** 畑の マサル（順番の 声かけ）。 */
registerScript('nh_gen', function* (): Co {
  face('nh_gen', 'player');
  if (flag(NF.done)) {
    if (!flag(NF.genAfter)) {
      setFlag(NF.genAfter, 1);
      yield* say(T.NH_GEN_AFTER);
    } else yield* say(T.NH_GEN_AFTER2);
    return;
  }
  if (!flag(NF.ichi)) yield* say(T.NH_GEN_ICHI);
  else if (!flag(NF.ni)) yield* say(T.NH_GEN_NI);
  else if (!flag(NF.san)) yield* say(T.NH_GEN_SAN);
  else yield* say(T.NH_GEN_ATO);
});

/** すんだ あとの 畝（段階2 は 1回 地の文）。 */
function* uneAfter(): Co {
  if (hStage() === 2 && flag(NF.done) && !flag(NF.h2)) {
    setFlag(NF.h2, 1);
    yield* say(T.NH_UNE_H2);
    return;
  }
  yield* say(T.NH_UNE_AFTER);
}

const genInField = (): boolean => !!field()?.actorById('nh_gen')?.visible;

registerScript('obj_nh_une_0', function* (): Co {
  se('se_examine');
  if (flag(NF.done) || !genInField()) {
    yield* uneAfter();
    return;
  }
  yield* lookGame();
});

registerScript('obj_nh_une_1', function* (): Co {
  se('se_examine');
  if (flag(NF.ni) || !genInField()) {
    yield* uneAfter();
    return;
  }
  if (!flag(NF.ichi)) {
    yield* say(T.NH_SAKI);
    return;
  }
  if (!flag(NF.niMae)) {
    setFlag(NF.niMae, 1);
    yield* say(T.NH_NI_MAE);
  }
  yield* yoseGame(1);
  setFlag(NF.ni, 1);
  yield* say(T.NH_NI_OK);
  if (!flag(NF.koe) && !flag(NF.umai)) {
    setFlag(NF.umai, 1);
    yield* say(T.NH_UMAI);
  }
});

registerScript('obj_nh_une_2', function* (): Co {
  se('se_examine');
  if (flag(NF.san) || !genInField()) {
    if (flag(NF.san) && !flag(NF.done) && genInField()) {
      yield* finale();
      return;
    }
    yield* uneAfter();
    return;
  }
  if (!flag(NF.ichi)) {
    yield* say(T.NH_SAKI);
    return;
  }
  if (!flag(NF.ni)) {
    yield* say(T.NH_GEN_NI);
    return;
  }
  if (!flag(NF.sanMae)) {
    setFlag(NF.sanMae, 1);
    yield* say(T.NH_SAN_MAE);
  }
  yield* yoseGame(2);
  setFlag(NF.san, 1);
  yield* say(T.NH_SAN_OK);
  yield* finale();
});

/** 4 わいも 白う（グソっ君が いる とき、1回）→ 5 白い ところ → ごほうび。 */
function* finale(): Co {
  const f = field();
  if (!f) return;
  // しゅん to the row's east end on his path (row 5 or 7), マサル behind him (the shed is by row 7)
  if (f.player.tileY === 6) yield* walk('player', [[f.player.tileX, 7]], { speed: 3 });
  const y = f.player.tileY <= 5 ? 5 : 7;
  if (f.player.tileX !== 11 || f.player.tileY !== y) yield* walk('player', [[11, y]], { speed: 3 });
  face('player', 'right');
  const g = f.actorById('nh_gen');
  if (g?.visible && (g.tileX !== 9 || g.tileY !== y)) {
    yield* walk('nh_gen', [[NH_GEN_AT[0], y], [9, y]], { speed: 2.6 });
    face('nh_gen', 'right');
  }
  if (kanenariHere() && !flag(NF.waimo)) {
    const fo = f.follower;
    yield* say(T.NH_WAIMO);
    if (fo) fo.visible = false;
    // (1 lying, 2 up to the neck; +2 on row 7's end)
    const k = y === 7 ? 2 : 0;
    setFlag(NF.uzumi, 1 + k);
    se('se_h_soil', { vol: 0.5 });
    yield 300;
    yield* say(T.NH_NEKORO);
    for (let n = 0; n < 3; n++) {
      se('se_h_soil', { vol: 0.6 });
      yield 260;
    }
    setFlag(NF.uzumi, 2 + k);
    yield 300;
    yield* say(T.NH_KUBI);
    yield* say(T.NH_WAKAREME);
    se('se_hit_pashi', { vol: 0.5 });
    game.ui.push(new Kaki());
    yield 1300;
    face('nh_gen', 'right');
    yield* say(T.NH_GEN_KUCHI);
    setFlag(NF.uzumi, 0);
    if (fo) fo.visible = true;
    se('se_h_soil', { vol: 0.4 });
    yield* say(T.NH_DERU);
    setFlag(NF.waimo, 1);
  }
  // 5 白い ところ
  face('player', 'left');
  face('nh_gen', 'player');
  yield 300;
  yield* say(T.NH_SHIROI);
  genStays = true;
  setFlag(NF.done, 1);
  addMp(2);
  se('se_item');
  yield* runMsg(T.NH_REWARD);
}

registerScript('obj_nh_taihi', function* (): Co {
  se('se_examine');
  yield* say(T.NH_TAIHI);
  if (!genInField()) return;
  if (flag('flag_ch2_barn_work') && !flag(NF.barn)) {
    setFlag(NF.barn, 1);
    yield* say(T.NH_TAIHI_BARN);
    return;
  }
  if (flag('flag_taihi_done') && !flag(NF.ko) && kanenariHere()) {
    setFlag(NF.ko, 1);
    yield* say(T.NH_TAIHI_KO);
  }
});

registerScript('obj_nh_boushi', function* (): Co {
  se('se_examine');
  yield* say(T.NH_BOUSHI);
  if (!flag(NF.boushi) && genInField()) {
    setFlag(NF.boushi, 1);
    yield* say(T.NH_BOUSHI_GEN);
  }
});

registerScript('obj_nh_dougu', function* (): Co {
  se('se_examine');
  yield* say(T.NH_DOUGU);
});
registerScript('obj_nh_kame', function* (): Co {
  se('se_examine');
  yield* say(T.NH_KAME);
});
registerScript('obj_nh_monooki', function* (): Co {
  se('se_examine');
  yield* say(T.NH_MONOOKI);
});
registerScript('obj_nh_sugi', function* (): Co {
  se('se_examine');
  yield* say(T.NH_SUGI);
});
registerScript('obj_nh_ishigaki', function* (): Co {
  se('se_examine');
  yield* say(T.NH_ISHIGAKI);
});

/** 〔negi〕。 */
function* start(): Co {
  setFlag(NF.start, 1);
  yield* say(T.NH_START);
}

wrap(GEN, function* (_ctx, orig): Co {
  const ready = nhOpen() && !genStoryFirst();
  if (ready && flag(NF.start) && !flag(NF.first) && !flag(NF.wait)) {
    setFlag(NF.wait, 1);
    yield* say(T.NH_WAIT);
    return;
  }
  const before = genTalks();
  yield* orig();
  if (!nhOpen() || flag(NF.start) || genStoryFirst()) return;
  // the second ordinary talk at this stage (another errand's turn did not count up the talks)
  if (before >= 1 && genTalks() > before) yield* start();
});

/** かくし：すんだ あと、マサルの 家の 窓（1回）。 */
wrap('obj_hoshi_gen_house', function* (_ctx, orig): Co {
  yield* orig();
  if (!flag(NF.done) || flag(NF.neiki) || field()?.map.id !== VILLAGE) return;
  setFlag(NF.neiki, 1);
  yield* say(T.NH_NEIKI);
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/** マサルの 立ち位置（段階）。 */
function genFront(): [string, number, number, string] {
  if (hStage() === 2) return [VILLAGE, 49, 19, 'right'];
  return ['map_hoshi_barn', 19, 6, 'right'];
}

/**
 * QA: __game.cmd.negi(step = 'gen', stage = 'h1', auto = false, miss = false)（'h1' トマトの 灯り・'h2' よびごえ・'h0' 灯りの 前）
 *   'h0'      段階0、村の 木戸の 前 (58,44) 右向き（地の文だけ）
 *   'gen'     いつもの 会話を 1回 聞いた あと、マサルの 前（話すと〔negi〕）
 *   'kido'    〔negi〕の あと、村の 木戸の 前 (58,44) 右向き（調べると 畑）
 *   'hata'    〔negi〕の あと、畑の 入口 (1,5) 右向き（入った ときの 会話は まだ）
 *   'ichi'    入った あと、1本目の 前 (5,3) 上向き
 *   'ni'      1本目を 見た あと、2本目の 前 (5,3) 下向き
 *   'san'     2本目を 寄せた あと、3本目の 前 (5,5) 下向き
 *   'taihi'   入った あと、堆肥の 山の 前 (13,2) 右向き
 *   'boushi'  入った あと、麦わら帽子の 杭の 前 (2,7) 下向き
 *   'done'    すんだ あと、村の 木戸の 前
 *   'window'  すんだ あと、マサルの 家の 窓の 前 (56,44) 上向き
 *   miss：auto の とき 2本目で 1回 分かれ目を こえる
 */
if (import.meta.env.DEV) {
  registerDebug('negi', (step = 'gen', stg = 'h1', auto = false, miss = false) => {
    const want = stg === 'h0' || step === 'h0' ? 0 : stg === 'h2' ? 2 : 1;
    const inCh2 = (field()?.map.id ?? '').startsWith('map_hoshi');
    if (!inCh2 || hStage() !== want || flag('flag_ch2_boss_beaten')) cmd().jump?.(want === 0 ? 'ch2:house' : want === 2 ? 'ch2:hill' : 'ch2:houki', true);
    for (const id of Object.values(NF)) setFlag(id, 0);
    genStays = false;
    qaAuto = !!auto;
    qaMiss = !!miss;
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (step === 'h0') return go(VILLAGE, NH_KIDO[0] - 1, NH_KIDO[1], 'right');
    const s = flag('flag_ch2_stage');
    setFlag(`flag_seen_${GEN}_h${s}`, Math.max(1, flag(`flag_seen_${GEN}_h${s}`)));
    if (s === 1) setFlag(`flag_seen_${GEN}_h1_1`, 1);
    if (step === 'gen') return go(...genFront());
    setFlag(NF.start, 1);
    if (step === 'kido') return go(VILLAGE, NH_KIDO[0] - 1, NH_KIDO[1], 'right');
    if (step === 'hata') return go(NEGI, NH_IN_AT[0], NH_IN_AT[1], 'right');
    setFlag(NF.first, 1);
    if (step === 'ichi') return go(NEGI, 5, 3, 'up');
    if (step === 'taihi') return go(NEGI, 13, 2, 'right');
    if (step === 'boushi') return go(NEGI, 2, 7, 'down');
    setFlag(NF.ichi, 1);
    if (step === 'ni') return go(NEGI, 5, 3, 'down');
    setFlag(NF.niMae, 1);
    setFlag(NF.ni, 1);
    setLevel(1, 5);
    if (step === 'san') return go(NEGI, 5, 5, 'down');
    setFlag(NF.sanMae, 1);
    setFlag(NF.san, 1);
    setLevel(2, 5);
    setFlag(NF.waimo, 1);
    setFlag(NF.done, 1);
    if (step === 'window') return go(VILLAGE, 56, 44, 'up');
    return go(VILLAGE, NH_KIDO[0] - 1, NH_KIDO[1], 'right');
  });

  registerDebug('nhAuto', (v: unknown = true, miss: unknown = false) => {
    qaAuto = !!v;
    qaMiss = !!miss;
    return qaAuto;
  });

  registerDebug('nhState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(NF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof NegiPanel) as NegiPanel | undefined;
    const f = field();
    return {
      flags,
      open: nhOpen(),
      lv: [0, 1, 2].map(nhLevel),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      gen: f?.actorById('nh_gen')?.visible ?? null,
      panel: p ? { r: p.r, mode: p.mode, cur: p.cur, phase: p.phase } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines; the panel's words in their room. */
export function nhTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足', '平和', '海', '水族館', 'いただきます', 'しゃべらん', 'らっきょ', 'おかわり', '焼き芋 食うか', 'ダンゴムシ', 'ツガオ', 'おはだっちょ', '湯気'];
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
  walkT('nh', T.NH_TEXTS);
  const col = SX + CW - RX;
  const btn = measure(NH_UI.yoseru) + 10 + 6 + measure(NH_UI.yoshi) + 10;
  const btn2 = measure(NH_UI.nokeru) + 10 + 6 + measure(NH_UI.yoshi) + 10;
  if (Math.max(btn, btn2) > col) bad.push(`ボタン: ${Math.max(btn, btn2)}px > ${col}`);
  for (const l of [NH_UI.tsuchi, NH_UI.wakareme, NH_UI.koko]) if (18 + measure(l) > col) bad.push(`右の 列: ${l}`);
  if (KEYS_Y + 14 > CH) bad.push(`keys: bottom ${KEYS_Y + 14} > ${CH}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('nhText', () => nhTextCheck());
