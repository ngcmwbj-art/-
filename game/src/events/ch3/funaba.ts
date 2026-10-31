// お昼の あとで、こする（第3章の クリア前、段階1〜2。げむきか 10/31 の 案1、2026-10-31 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_funaba.ts、新しい 地図は data/maps/c3_funaba.ts（船揚げ場）、絵は art/props/funaba_art.ts、
// みました帳の ページは ui/menu/book_funaba.ts。案から 変えた 所は 文の ファイルの 頭。
//
//   段階1（正午）、S06 の あと（flag_ch3_kids）から S12 の ナリオサメの 前まで：
//   ・空き地の 子ども npc_c3_kid_a (7,6)：いつもの〔c1〕・〔mizukiri〕（mizukiri.ts、2回目）の あと、もう 1回 話すと
//     〔funa〕（flag_fb_start）。〔c1〕の あと まだの あいだ、頭の 上に「！」（2回目は〔mizukiri〕が 先）。
//   ・入口：港の 倉庫の 東の 路地、岩の 切れ目 (52,21)。(52,21) の 岩を 坂の マス（路地と 同じ 石）に して、
//     札『船揚げ場』の 絵。始まって こすり おわるまで 坂の 上に「！」、路地に 入ると 1回 地の文。押すと 暗転で
//     map_c3_funaba (1,4)（door_c3_funaba。段階1〜2、S14 の トラックの 前まで。そのあとは 地の文で 入れない）。
//   ・船揚げ場：台車の わきの 紙 (20,8) → 箱 (24,6) の 軍手（item_fb_gunte）→ 船の 腹の わき y9 から 北を 向いて
//     調べると 大写し「船の 底」（FunaPanel）：←→ で へさき・まん中・とも・スクリュー、けってい で こする。
//     白い つぶ（フジツボ）は 2回、緑の ひも（海藻）は 1回。スクリューは さわらない（子どもの 1行）。
//     もどるで やめても こすった 所は 残る（flag_fb_n_<k>）。3つ すむと ホース（自動）→ 軍手を 箱へ もどす。
//   ・すんだ あと：落ちた 殻 (14,10) を 調べる → フジツボの なかま（1回）。
//   段階2（S13 の あと〜S14 の 前）：
//   ・こすって いれば、食堂かもめの 前の ゴロウ (31,16)：いつもの〔c2〕の あと、もう 1回 話すと〔ぬる〕（暗転で
//     船揚げ場）→ 朱肉 +2、みました帳③の すみ（flag_fb_done）。網小屋〔ami〕（amigoya.ts）とは、〔ぬる〕が 先、
//     すんだら〔ami〕。どちらも ゴロウの 頭の「！」は 1つ（amigoya.ts の しるしの まま。〔ぬる〕が あれば それが 先に 来る）。
//   ・こすって いなければ、船揚げ場で ゴロウが 1人で こすっている（ページは 出ない）。
//   かくし：S08 の 前の 食堂の ゴロウ（〔funa〕の あと 1回）、来た マサル（すんだ あとの 船揚げ場の 帰り、1回）。
//
// QA：__game.cmd.funaba(step, auto)、fbState()、fbText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { addItem, flag, removeItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript, walk } from '../../world/api';
import { getMapDef, registerMap } from '../../world/maps';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { registerWorldFx } from '../../world/fx';
import { SPEAKERS } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { actorAnchor, addMarkSource } from '../../world/marks';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import { pickRows, type Howto, type TouchPick } from '../../ui/closeup';
import { closeupWide } from '../../ui/closeup_wide';
import * as T from '../../data/text/c3_funaba';
import { FB_UI } from '../../data/text/c3_funaba';
import { fillNames } from '../../data/text/c3_names';
import { cg } from '../../data/maps/umizoi';
import { FB_FUNA, FB_TSUKU, FB_WAKI_Y, FUNABA } from '../../data/maps/c3_funaba';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { addToMap, c3Stage, inCh3, kitaComeIn, kitaGoOut, say3 } from './common';
import { agDoor } from './amigoya';

export const FBF = {
  start: 'flag_fb_start',
  /** 路地の 地の文（1回）。 */
  saka: 'flag_fb_saka',
  inn: 'flag_fb_in',
  kami: 'flag_fb_kami',
  rule: 'flag_fb_rule',
  kuchi: 'flag_fb_kuchi',
  /** 付いた 物の 形（落とした）。 */
  fuji: 'flag_fb_kata_fuji',
  mo: 'flag_fb_kata_mo',
  kosuri: 'flag_fb_kosuri',
  nakama: 'flag_fb_nakama',
  masaru: 'flag_fb_masaru',
  goroC1: 'flag_fb_goro_c1',
  hitori: 'flag_fb_hitori',
  /** 〔ぬる〕の あと、船揚げ場に いる あいだ（ゴロウと 子どもが いる。港へ 出たら 0）。 */
  scene: 'flag_fb_scene',
  nuru: 'flag_fb_nuru',
  done: 'flag_fb_done',
} as const;

export const GUNTE = 'item_fb_gunte';
const UMIZOI = 'map_umizoi';
const GORO = 'npc_c3_jouren';
const MASARU = 'npc_hoshi_gen';
const KIDS = ['npc_c3_kid_a', 'npc_c3_kid_b', 'npc_c3_kid_c'];
/** 港の 坂（倉庫の 東の 路地の 岩の 切れ目）と、その 前。 */
export const SAKA: [number, number] = [52, 21];
const SAKA_MAE: [number, number] = [51, 21];
/** 船揚げ場の 子ども（船の 東、腹の わきの 列。船底の 前は あける）。 */
const KID_AT: [number, number][] = [
  [21, 9],
  [22, 9],
  [23, 9],
];
/** 船揚げ場の ゴロウ（まん中の 腹の 前）。 */
const GORO_AT: [number, number] = [14, 9];
/** 落ちた 殻（水ぎわ）。 */
const KARA_AT: [number, number] = [15, 10];

/** 区切りごとの 付いた 物（左から。fuji＝白い つぶ 2回、mo＝緑の ひも 1回）。 */
export const FB_KATA: ('fuji' | 'mo')[][] = [
  ['mo', 'fuji'],
  ['fuji', 'mo', 'fuji'],
  ['fuji', 'mo'],
];
const HP = { fuji: 2, mo: 1 } as const;
const nF = (k: number) => `flag_fb_n_${k}`;
const buF = (k: number) => `flag_fb_bu_${k}`;
/** 区切り k を こする 回数。 */
export const fbTotal = (k: number): number => FB_KATA[k].reduce((s, t) => s + HP[t], 0);

SPEAKERS.c3_kodomotachi ??= { name: '子どもたち', voice: 'c3_kid' };

function knWith(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** 寄り道が 開いている（段階1）：S06 の あと、ナリオサメの 前。 */
export function fbOpen(): boolean {
  return inCh3() && !pgOn() && c3Stage() === 1 && flag('flag_ch3_kids') > 0 && !flag('flag_ch3_nariosame_beaten');
}

/** 船揚げ場へ 行ける：段階1〜2（S14 の トラックの あとは 行けない）。 */
export function fbDoor(): boolean {
  return inCh3() && !pgOn() && (c3Stage() === 1 || c3Stage() === 2) && flag('flag_ch3_kids') > 0 && !flag('flag_ch3_truck_trap');
}

/** 段階2 の 窓（S13 の あと、S14 の 前）。 */
function stage2Open(): boolean {
  return inCh3() && !pgOn() && c3Stage() === 2 && flag('flag_ch3_got_gochisou') > 0 && !flag('flag_ch3_truck_trap');
}

/** 〔ぬる〕が 待っている（こすって あって、網小屋の 中では ない）。 */
export function nuruReady(): boolean {
  return stage2Open() && flag(FBF.kosuri) > 0 && !flag(FBF.nuru) && !agDoor() && !flag('flag_ag_to') && !flag('flag_ag_soto');
}

/** 船揚げ場の 子ども：段階1 は 始まった あと、段階2 は〔ぬる〕の あいだ。 */
function kidsFunaba(): boolean {
  if (!inCh3()) return false;
  if (c3Stage() === 1) return flag(FBF.start) > 0;
  return c3Stage() === 2 && flag(FBF.scene) > 0;
}

/** 船揚げ場の ゴロウ：〔ぬる〕の あいだ、または こすって いない 段階2（1人で こする）。 */
function goroFunaba(): boolean {
  if (!inCh3() || c3Stage() !== 2) return false;
  if (flag(FBF.scene)) return true;
  return !flag(FBF.kosuri) && !agDoor() && !flag('flag_ag_to') && !flag('flag_ag_soto');
}

/** 話す 人の いない 行を 抜く（グソっ君。船揚げ場では 子どもも）。 */
function trim(text: string): string {
  const here = onMap(FUNABA);
  const drop = (who: string) => (who === 'npc_kanenari' && !knWith()) || (here && (who.startsWith('npc_c3_kid') || who === 'c3_kodomotachi') && !kidsFunaba());
  return text
    .split(/\n(?=@)/)
    .filter((p) => !drop(p.split('\n')[0].slice(1).trim()))
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

// ================================================================ 港の 坂

{
  const def = getMapDef(UMIZOI);
  if (def) {
    // the rock at the alley's east side (52,21) becomes the cut of the slope: the alley's stone, still solid
    // (a door is pushed; HD-2D draws no rock block there)
    def.legend['G'] = { ground: cg('c3_quay'), solid: true, tag: 'prop' };
    const r = def.rows[SAKA[1]];
    if (r && r[SAKA[0]] === 'K') def.rows[SAKA[1]] = r.slice(0, SAKA[0]) + 'G' + r.slice(SAKA[0] + 1);
    registerMap(def);
  }
}

addToMap(
  UMIZOI,
  [
    { t: 'prop', prop: 'prop_fb_saka_yuka', x: SAKA[0], y: SAKA[1] } as unknown as MapObj,
    { t: 'prop', prop: 'prop_fb_saka', x: SAKA[0], y: SAKA[1] } as unknown as MapObj,
    { t: 'door', id: 'door_c3_funaba', x: SAKA[0], y: SAKA[1], to: FUNABA, tx: FB_TSUKU[0], ty: FB_TSUKU[1], dir: 'right', se: 'se_step_stone', cond: { when: fbDoor } } as unknown as MapObj,
    { t: 'obj', id: 'obj_fb_saka', x: SAKA[0], y: SAKA[1], face: 'right', script: 'obj_fb_saka' } as unknown as MapObj,
    // the alley by the warehouse: once, when they come into it after 〔funa〕
    { t: 'trig', id: 'trig_fb_saka', x: 50, y: 19, w: 2, h: 4, script: 'trig_fb_saka', cond: { when: () => fbOpen() && flag(FBF.start) > 0 && !flag(FBF.saka) && !flag(FBF.inn) } } as unknown as MapObj,
  ],
  ['evt_fb_town'],
);

// ================================================================ 船揚げ場の 物・人

const NPC = (o: Record<string, unknown>): MapObj => ({ t: 'npc', ...o }) as unknown as MapObj;
const O = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj => ({ t: 'obj', id, x, y, script: id, ...extra }) as unknown as MapObj;
const karaOn = () => inCh3() && flag(FBF.kosuri) > 0 && !flag(FBF.nuru);
addToMap(FUNABA, [
  // the hull, from the ground beside it (y9), facing north
  O('obj_fb_funa', FB_FUNA.x, FB_FUNA.y + FB_FUNA.h - 1, { w: FB_FUNA.w, face: 'up' }),
  O('obj_fb_kami', 20, 8),
  O('obj_fb_toryo', 23, 4),
  O('obj_fb_hako', 24, 6),
  O('obj_fb_baketsu', 25, 8),
  O('obj_fb_koya', 2, 3, { w: 4, face: 'up' }),
  O('obj_fb_umi', 0, 11, { w: 28, face: 'down' }),
  { t: 'prop', prop: 'prop_fb_kara', x: KARA_AT[0], y: KARA_AT[1], cond: { when: karaOn } } as unknown as MapObj,
  O('obj_fb_kara', KARA_AT[0], KARA_AT[1], { flat: true, cond: { when: karaOn } }),
  ...KIDS.map((id, i) => NPC({ id: `fb_kid_${i}`, sprite: id, x: KID_AT[i][0], y: KID_AT[i][1], dir: 'left', script: 'fb_kid', cond: { when: kidsFunaba } })),
  NPC({ id: 'fb_goro', sprite: GORO, x: GORO_AT[0], y: GORO_AT[1], dir: 'up', noTurn: false, script: 'fb_goro', cond: { when: goroFunaba } }),
]);

// ================================================================ 見のがさない しるし

addMarkSource((f) => {
  if (f.map.id !== UMIZOI || !fbOpen() || flag(FBF.start) || !flag('flag_seen_npc_c3_kid_c1')) return null;
  const a = f.actorById(KIDS[0]);
  return a && a.visible ? actorAnchor(a) : null;
});
addMarkSource((f) => {
  if (f.map.id !== UMIZOI || !fbOpen() || !flag(FBF.start) || flag(FBF.kosuri)) return null;
  const foot = (SAKA[1] + 1) * 16;
  return { x: SAKA[0] * 16 + 8, y: foot - 30, foot };
});

// ================================================================ 大写し「船の 底」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 列。 */
const RX = SX + 214;
/** 絵の 幅。 */
const W = RX - SX - 4;
/** 区切りの はし（絵の 幅の 割合）：へさき・まん中・とも・スクリュー。 */
const BU = [0, 0.3, 0.6, 0.84, 1];
const WL = 22;
const KEEL = 86;

const SKY = '#A8BCC8';
const CON = '#BDB6A6';
const CON_DK = '#8E897C';
const HULL = '#F2EFE6';
const STRIPE = '#2F6A9A';
const RED = '#7E4A40';
const RED_DK = '#5E3830';
const FUJI = '#EDE8DA';
const FUJI_DK = '#9A9284';
const MO = '#4E8A4A';
const MO_LT = '#7AB060';

/** 区切り k の 付いた 物と 残りの 回数（こすった 回数 n から）。 */
export function fbThings(k: number, n = flag(nF(k))): { kind: 'fuji' | 'mo'; hp: number }[] {
  let left = n;
  return FB_KATA[k].map((kind) => {
    const used = Math.min(HP[kind], left);
    left -= used;
    return { kind, hp: HP[kind] - used };
  });
}

function keelAt(dx: number): number {
  const bow = W * 0.3;
  if (dx < bow) return Math.round(KEEL - ((bow - dx) / bow) ** 2 * 44);
  return KEEL;
}

interface Drop {
  x: number;
  y: number;
  t: number;
  kind: 'fuji' | 'mo';
}

export class FunaPanel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  /** はじめの カード（ui/closeup.ts）。 */
  howto: Howto = T.FB_HOWTO;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  sel: number;
  /** けってい した 区切り（null まだ）。 */
  hit: number | null = null;
  /** 入力を 待っている。 */
  waiting = false;
  drops: Drop[] = [];
  private armT = 0;

  /** 指で さわって 選ぶ（改善会議 2026-10-30 の1、ui/closeup.ts）。ひろい なら 上下に 少し 広く。 */
  touchPick: TouchPick = {
    spots: () =>
      this.waiting && !this.auto && this.open >= 1
        ? pickRows(4, (i) => {
            const pad = Math.round(6 * (closeupWide() - 1));
            const x0 = SX + Math.round(BU[i] * W);
            const x1 = SX + Math.round(BU[i + 1] * W);
            return [x0, SY + WL - 4 - pad, x1 - x0, KEEL - WL + 8 + pad * 2];
          })
        : null,
    cursor: () => this.sel,
    moveTo: (i) => {
      if (i === this.sel) return;
      this.sel = i;
      se('se_cursor', { vol: 0.4 });
    },
  };

  constructor(sel: number) {
    this.sel = sel;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    for (const d of this.drops) d.t += dt;
    this.drops = this.drops.filter((d) => d.t < 700);
    if (!this.waiting || this.hit !== null) {
      this.armT = 0;
      return;
    }
    this.armT += dt;
    if (this.auto) {
      if (this.armT < 200) return;
      const k = [0, 1, 2].find((i) => !flag(buF(i)));
      this.sel = k ?? 0;
      this.hit = this.sel;
      return;
    }
    if (this.armT < 120) return;
    if (input.pressed('left') && this.sel > 0) {
      this.sel--;
      se('se_cursor', { vol: 0.4 });
    } else if (input.pressed('right') && this.sel < 3) {
      this.sel++;
      se('se_cursor', { vol: 0.4 });
    } else if (input.pressed('confirm')) this.hit = this.sel;
  }

  /** 区切り k の i 番目の 物の 位置（絵の 中）。 */
  thingAt(k: number, i: number, oy: number): [number, number] {
    const x0 = BU[k] * W;
    const x1 = BU[k + 1] * W;
    const n = FB_KATA[k].length;
    const x = x0 + ((i + 0.5) * (x1 - x0)) / n;
    const bot = keelAt(x);
    const y = WL + 8 + ((bot - WL - 16) * (i % 2 ? 0.62 : 0.28));
    return [SX + Math.round(x), oy + Math.round(y)];
  }

  /** こすった とき：落ちる 物の 絵。 */
  drop(k: number, i: number, kind: 'fuji' | 'mo'): void {
    const [x, y] = this.thingAt(k, i, SY);
    this.drops.push({ x, y: y - SY, t: 0, kind });
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
        g.clip(SX, oy, W, CH, () => this.drawScene(g, oy));
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        g.text(FB_UI.parts[this.sel], RX, oy + 2, { color: '#F4ECD8' });
        const st = this.sel === 3 ? FB_UI.sawaranai : flag(buF(this.sel)) ? FB_UI.tsuru : FB_UI.nokori(fbThings(this.sel).filter((x) => x.hp > 0).length);
        g.text(st, RX, oy + 20, { color: '#8A84A0' });
        if (this.waiting) FB_UI.keys.forEach((l, i) => g.text(l, RX, oy + 56 + i * 16, { color: '#FFE7A3' }));
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(FB_UI.title) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, FB_UI.title, { seed: 53 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  private drawScene(g: Gfx, oy: number): void {
    // the air under the boat, the slipway's concrete at the foot
    g.rect(SX, oy, W, CH, SKY);
    g.rect(SX, oy + KEEL + 8, W, CH - KEEL - 8, CON);
    for (let x = SX; x < SX + W; x += 12) g.rect(x, oy + KEEL + 8, 1, CH - KEEL - 8, CON_DK);
    // the hull's side: white above the water line, the blue stripe, the old red bottom below
    for (let dx = 0; dx < W; dx++) {
      const bot = keelAt(dx);
      g.rect(SX + dx, oy, 1, WL - 4, HULL);
      g.rect(SX + dx, oy + WL - 4, 1, 3, STRIPE);
      g.rect(SX + dx, oy + WL, 1, bot - WL, RED);
      g.rect(SX + dx, oy + bot - 2, 1, 2, RED_DK);
    }
    // the cradle's beams under the keel
    for (const fx of [0.35, 0.78]) {
      const x = SX + Math.round(fx * W);
      g.rect(x - 8, oy + KEEL, 16, 8, '#8A6A48');
      g.rect(x - 8, oy + KEEL, 16, 1, '#B08A5E');
    }
    // the screw and the rudder (the stern section)
    const s0 = SX + Math.round(BU[3] * W);
    const sw = Math.round((BU[4] - BU[3]) * W);
    g.rect(s0 - 4, oy + 62, 14, 4, '#5E6478');
    g.rect(s0 + 9, oy + 50, 4, 28, '#B8A070');
    g.rect(s0 + 9, oy + 50, 1, 28, '#D8C090');
    g.rect(s0 + 6, oy + 62, 10, 4, '#B8A070');
    g.rect(s0 + sw - 10, oy + 30, 6, 52, '#8E95A6');
    g.rect(s0 + sw - 10, oy + 30, 1, 52, '#AEB4C0');
    // section lines (chalk)
    for (let i = 1; i < 4; i++) {
      const x = SX + Math.round(BU[i] * W);
      for (let y = oy + WL + 2; y < oy + KEEL - 2; y += 6) g.rect(x, y, 1, 3, '#E8D8C8');
    }
    // what grows on each section
    for (let k = 0; k < 3; k++) {
      const things = fbThings(k);
      things.forEach((th, i) => {
        if (th.hp <= 0) return;
        const [x, y] = this.thingAt(k, i, oy);
        if (th.kind === 'mo') {
          for (let j = 0; j < 14; j++) {
            const wv = Math.round(Math.sin(j / 2.5) * 1.5);
            g.rect(x + wv - 1, y + j - 4, 3, 1, j < 6 ? MO_LT : MO);
          }
          g.rect(x + 3, y - 2, 2, 8, MO);
        } else {
          g.rect(x - 6, y - 1, 13, 6, FUJI);
          g.rect(x - 4, y - 4, 9, 3, FUJI);
          g.rect(x - 6, y + 4, 13, 1, FUJI_DK);
          g.rect(x - 1, y - 4, 3, 2, '#6A6458');
          if (th.hp === 1) {
            // cracked: one more and it comes away
            g.rect(x - 4, y, 1, 3, FUJI_DK);
            g.rect(x - 3, y + 2, 4, 1, FUJI_DK);
            g.rect(x + 2, y - 1, 1, 3, FUJI_DK);
          }
          // a little one beside
          g.rect(x + 8, y + 6, 4, 3, FUJI);
          g.rect(x + 9, y + 5, 2, 1, FUJI);
        }
      });
      if (flag(buF(k))) {
        // scrubbed: a few shiny streaks
        const x0 = SX + Math.round(BU[k] * W);
        const x1 = SX + Math.round(BU[k + 1] * W);
        for (let x = x0 + 6; x < x1 - 4; x += 14) g.rect(x, oy + WL + 10 + ((x * 7) % 30), 6, 1, '#A87068');
      }
    }
    // the stern: hands off (pale)
    g.alpha(0.45, () => g.rect(s0, oy, sw, KEEL + 8, '#E8ECF0'));
    // falling bits
    for (const d of this.drops) {
      const u = d.t / 700;
      const y = oy + d.y + Math.round(u * u * 60);
      g.alpha(1 - u * 0.6, () => g.rect(d.x - 2, y, d.kind === 'mo' ? 3 : 5, d.kind === 'mo' ? 6 : 3, d.kind === 'mo' ? MO : FUJI));
    }
    // the cursor: corner brackets round the chosen section
    if (this.waiting || this.hit !== null) {
      const x0 = SX + Math.round(BU[this.sel] * W) + 2;
      const x1 = SX + Math.round(BU[this.sel + 1] * W) - 3;
      const y0 = oy + WL - 2;
      const y1 = oy + KEEL + 4;
      const c = Math.floor(this.t / 400) % 2 === 0 ? '#FFE7A3' : '#FFF6D8';
      for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]] as const) {
        g.rect(Math.min(x, x + sx * 5), y, 6, 2, c);
        g.rect(x, Math.min(y, y + sy * 5), 2, 6, c);
      }
    }
  }
}

function* openPanel(p: Widget & { open: number }): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: Widget & { open: number; done: boolean }): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;

/** 船の 腹の 前の 区切り（しゅんの 立つ 列 x から）。 */
function buAt(x: number): number {
  if (x <= 12) return 0;
  if (x <= 15) return 1;
  if (x <= 18) return 2;
  return 3;
}

/** 3 こする（大写し）。3つ すんだら true。もどる で やめると 台本は 止まる（こすった 所は 残る）。 */
function* kosuru(start: number): Co<boolean> {
  const p = new FunaPanel(start);
  p.auto = qaAuto;
  try {
    yield* openPanel(p);
    if (!flag(FBF.rule)) {
      setFlag(FBF.rule, 1);
      yield* say(T.FB_RULE);
    }
    while ([0, 1, 2].some((k) => !flag(buF(k)))) {
      p.hit = null;
      p.waiting = true;
      while (p.hit === null) yield null;
      p.waiting = false;
      const k: number = p.hit;
      if (k === 3) {
        se('se_examine', { vol: 0.4 });
        yield* say(kidsFunaba() ? T.FB_SCREW : T.FB_SCREW_SOLO);
        continue;
      }
      if (flag(buF(k))) {
        se('se_cursor', { vol: 0.3, pitch: 0.8 });
        continue;
      }
      const before = fbThings(k);
      const n = flag(nF(k));
      setFlag(nF(k), n + 1);
      const after = fbThings(k);
      const i = before.findIndex((th) => th.hp > 0);
      se('se_kotei_snip', { vol: 0.45, pitch: 0.7 + Math.random() * 0.2 });
      if (i >= 0 && after[i].hp <= 0) {
        p.drop(k, i, after[i].kind);
        setFlag(after[i].kind === 'fuji' ? FBF.fuji : FBF.mo, 1);
      }
      yield 180;
      // the first barnacle of the middle: its mouth is shut tight (once)
      if (k === 1 && n === 0 && !flag(FBF.kuchi)) {
        setFlag(FBF.kuchi, 1);
        yield* say3(T.FB_KUCHI);
        if (knWith()) yield* say(T.FB_KUCHI_KN);
      }
      if (after.every((th) => th.hp <= 0)) {
        setFlag(buF(k), 1);
        se('se_item', { vol: 0.35 });
        yield 250;
      }
    }
    yield 300;
    return true;
  } finally {
    p.waiting = false;
    yield* closePanel(p);
  }
}

// ================================================================ 台本

/** 1 子どもの〔funa〕（〔c1〕・〔mizukiri〕の あと）。 */
wrap(KIDS[0], function* (_ctx, orig): Co {
  if (fbOpen() && onMap(UMIZOI) && flag('flag_seen_npc_c3_kid_c1') > 0 && flag('flag_mz_start') > 0 && !flag(FBF.start)) {
    setFlag(FBF.start, 1);
    yield* say(T.FB_A);
    return;
  }
  yield* orig();
});

/** 路地に 入った（1回）。 */
registerScript('trig_fb_saka', function* (): Co {
  if (!fbOpen() || !flag(FBF.start) || flag(FBF.saka) || flag(FBF.inn)) return;
  setFlag(FBF.saka, 1);
  yield* say3(T.FB_SAKA_MIRU);
});

/** 港の 坂（調べる。開いて いれば 暗転で 下りる）。 */
registerScript('obj_fb_saka', function* (): Co {
  const f = field();
  if (!f) return;
  if (fbDoor()) {
    yield* f.warpCo(FUNABA, FB_TSUKU[0], FB_TSUKU[1], 'right', 'se_step_stone', UMIZOI);
    return;
  }
  se('se_examine');
  if (inCh3() && !pgOn() && flag('flag_ch3_truck_trap') && c3Stage() === 2) {
    yield* say3(T.FB_SAKA_JIKAN);
    return;
  }
  yield* say3(T.FB_SAKA_FUDA);
});

/** 2 船揚げ場（入る たび）。 */
registerScript('evt_fb_enter', function* (): Co {
  const f = field();
  if (!f || !inCh3() || flag(FBF.scene)) return;
  if (c3Stage() === 1 && flag(FBF.start) && !flag(FBF.inn)) {
    setFlag(FBF.inn, 1);
    // down the slope's foot a few steps, till the boat is in sight
    const path: [number, number][] = [];
    for (let x = f.player.tileX + 1; x <= 8; x++) path.push([x, f.player.tileY]);
    if (path.length) yield* walk('player', path, { speed: 2.6, face: 'right' });
    yield 300;
    yield* say(T.FB_IN);
    return;
  }
  if (c3Stage() === 2 && goroFunaba() && !flag(FBF.hitori)) {
    setFlag(FBF.hitori, 1);
    yield 300;
    yield* say3(T.FB_HITORI);
  }
});

/** 港へ もどった：〔ぬる〕の 場面は おしまい。すんだ あとの 帰りに マサル（1回）。 */
registerScript('evt_fb_town', function* (): Co {
  const f = field();
  if (!f || !inCh3()) return;
  if (flag(FBF.scene)) setFlag(FBF.scene, 0);
  if (f.cameFrom !== FUNABA || c3Stage() !== 1 || !flag(FBF.kosuri) || flag(FBF.masaru)) return;
  yield 200;
  if (yield* kitaComeIn(MASARU, UMIZOI, [[50, 18], [50, 19], [50, 20], [50, 21]], 'right')) {
    setFlag(FBF.masaru, 1);
    yield* say3(T.FB_MASARU);
    if (knWith()) yield* say(T.FB_MASARU_KN);
    kitaGoOut(MASARU);
  }
});

// (also when the town is reached some other way: the scene never stays on)
registerWorldFx({
  map: UMIZOI,
  update() {
    if (flag(FBF.scene)) setFlag(FBF.scene, 0);
  },
});

registerScript('obj_fb_kami', function* (): Co {
  se('se_examine');
  yield* say3(T.FB_KAMI);
  if (c3Stage() === 1 && flag(FBF.start) && !flag(FBF.kosuri) && kidsFunaba()) {
    setFlag(FBF.kami, 1);
    yield* say(T.FB_KAMI_KIDS);
  }
});

registerScript('obj_fb_hako', function* (): Co {
  se('se_examine');
  if (fbOpen() && flag(FBF.start) && !flag(FBF.kosuri) && !state.inventory.includes(GUNTE)) {
    addItem(GUNTE);
    se('se_item');
    yield* say3(T.FB_GUNTE);
    return;
  }
  yield* say3(T.FB_HAKO);
});

registerScript('obj_fb_toryo', function* (): Co {
  se('se_examine');
  yield* say3(flag(FBF.nuru) ? T.FB_TORYO_AKI : T.FB_TORYO);
});
registerScript('obj_fb_baketsu', function* (): Co {
  se('se_examine');
  yield* say3(T.FB_BAKETSU);
});
registerScript('obj_fb_koya', function* (): Co {
  se('se_examine');
  yield* say3(T.FB_KOYA);
});
registerScript('obj_fb_umi', function* (): Co {
  se('se_examine');
  yield* say3(c3Stage() >= 2 ? T.FB_REIRU : `${T.FB_REIRU}\n/\n${T.FB_REIRU_TOMARI.replace(/^@narr\n/, '')}`);
});

/** 3 船の 腹（北を 向いて 調べる）。 */
registerScript('obj_fb_funa', function* (): Co {
  const f = field();
  if (!f) return;
  se('se_examine');
  if (flag(FBF.nuru)) {
    yield* say3(T.FB_FUNA_AKA);
    return;
  }
  if (flag(FBF.kosuri)) {
    yield* say3(c3Stage() >= 2 ? T.FB_FUNA_MADA : T.FB_TSURUTTO);
    return;
  }
  if (!fbOpen() || !flag(FBF.start)) {
    yield* say3(T.FB_FUNA_MAE);
    return;
  }
  if (!state.inventory.includes(GUNTE)) {
    yield* say(kidsFunaba() ? T.FB_SUDE : T.FB_SUDE_SOLO);
    return;
  }
  if (!(yield* kosuru(buAt(f.player.tileX)))) return;
  // the hose (automatic), the gloves back in the box
  setFlag(FBF.kosuri, 1);
  se('se_h_splash', { vol: 0.5 });
  yield* say3(T.FB_HOSE);
  removeItem(GUNTE);
  yield* say(kidsFunaba() ? T.FB_HOSE_KIDS : T.FB_HOSE_SOLO);
  f.refreshPresence();
});

/** 4 落ちた 殻（すんだ あと）。 */
registerScript('obj_fb_kara', function* (): Co {
  se('se_examine');
  yield* say3(T.FB_KARA);
  if (!flag(FBF.nakama) && c3Stage() === 1 && kidsFunaba()) {
    setFlag(FBF.nakama, 1);
    yield* say(T.FB_NAKAMA);
  }
});

registerScript('fb_kid', function* (): Co {
  if (flag(FBF.kosuri)) yield* say3(T.FB_KID.ato);
  else if (state.inventory.includes(GUNTE)) yield* say3(T.FB_KID.naka);
  else yield* say3(T.FB_KID.mae);
});

registerScript('fb_goro', function* (): Co {
  yield* say3(flag(FBF.scene) ? T.FB_NURU_GORO : T.FB_HITORI_GORO);
});

/** 食堂の ゴロウ：段階1 の かくし、段階2 の〔ぬる〕。 */
wrap(GORO, function* (_ctx, orig): Co {
  if (inCh3() && !pgOn() && c3Stage() === 1 && flag(FBF.start) && !flag('flag_ch3_shokudo_done') && !flag(FBF.goroC1)) {
    yield* orig();
    setFlag(FBF.goroC1, 1);
    yield* say3(T.FB_GORO_C1);
    if (knWith()) yield* say(T.FB_GORO_C1_KN);
    return;
  }
  if (nuruReady() && onMap(UMIZOI)) {
    // his usual 〔c2〕 first (amigoya.ts marks it), then 〔ぬる〕; 〔ami〕 after it
    if (!flag('flag_ag_c2')) {
      yield* orig();
      return;
    }
    yield* nuruScene();
    return;
  }
  yield* orig();
});

/** 5〔ぬる〕：食堂の 前 → 暗転で 船揚げ場 → ゴロウが 塗る → ごほうび。 */
function* nuruScene(): Co {
  const f = field();
  if (!f) return;
  yield* say3(T.FB_NURU_A);
  setFlag(FBF.scene, 1);
  yield* f.warpCo(FUNABA, GORO_AT[0] + 2, GORO_AT[1], 'up', undefined, UMIZOI);
  f.refreshPresence();
  yield 400;
  yield* say3(T.FB_NURU);
  yield* say(T.FB_NURU_UCHIRA);
  if (knWith()) yield* say(T.FB_NURU_TO);
  yield* say3(T.FB_NURU_B);
  yield* say(T.FB_NURU_C);
  // the first coat goes on
  yield* game.fadeOut(400, '#1B1733');
  setFlag(FBF.nuru, 1);
  f.refreshPresence();
  yield 300;
  yield* game.fadeIn(400);
  setFlag(FBF.done, 1);
  addMp(2);
  se('se_item');
  yield* say3(T.FB_REWARD);
}

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.funaba(step = 'kid', auto = false, nojump = false)（auto：大写しを 自動で こする。nojump：章の 読み直しを しない）
 *   'kid'    段階1、〔c1〕〔mizukiri〕の あと、空き地の 子どもの 前 (7,7) 上向き（話すと〔funa〕）
 *   'saka'   始まった あと、倉庫の 東の 路地の 坂の 前 (51,21) 右向き
 *   'in'     船揚げ場の 坂の 下 (1,4)（入った ときの 1回）
 *   'gunte'  紙・軍手の あと、まん中の 腹の 前 (14,9) 上向き
 *   'kosuri' こすった あと、落ちた 殻の 上 (15,10)
 *   'nuru'   段階2、こすった あと、食堂かもめの 前の ゴロウの 前 (31,17) 上向き（〔c2〕済み。話すと〔ぬる〕）
 *   'hitori' 段階2、こすって いない、船揚げ場 (1,4)
 */
if (import.meta.env.DEV) {
  registerDebug('funaba', (step = 'kid', auto = false, nojump = false) => {
    qaAuto = !!auto;
    const s2 = step === 'nuru' || step === 'hitori';
    // (nojump: the chapter is already loaded — the QA driver jumps once and waits for its scene)
    if (!nojump) cmd().jump?.(s2 ? 'ch3:trap' : 'ch3:umizoi', true);
    for (const id of Object.values(FBF)) setFlag(id, 0);
    for (let k = 0; k < 3; k++) {
      setFlag(nF(k), 0);
      setFlag(buF(k), 0);
    }
    removeItem(GUNTE);
    setFlag('flag_ch3_stage', s2 ? 2 : 1);
    if (s2) setFlag('flag_ch3_got_gochisou', 1);
    const go = (m: string, x: number, y: number, d: string) => {
      setTimeout(() => cmd().warp?.(m, x, y, d), 700);
      return cmd().warp?.(m, x, y, d);
    };
    setFlag('flag_seen_npc_c3_kid_c1', 1);
    setFlag('flag_mz_start', 1);
    if (step === 'kid') return go(UMIZOI, 7, 7, 'up');
    if (step === 'hitori') return go(FUNABA, FB_TSUKU[0], FB_TSUKU[1], 'right');
    setFlag(FBF.start, 1);
    if (step === 'saka') return go(UMIZOI, SAKA_MAE[0], SAKA_MAE[1], 'right');
    if (step === 'in') return go(FUNABA, FB_TSUKU[0], FB_TSUKU[1], 'right');
    setFlag(FBF.inn, 1);
    setFlag(FBF.saka, 1);
    setFlag(FBF.kami, 1);
    if (step === 'gunte') {
      addItem(GUNTE);
      return go(FUNABA, 14, FB_WAKI_Y, 'up');
    }
    for (let k = 0; k < 3; k++) {
      setFlag(nF(k), fbTotal(k));
      setFlag(buF(k), 1);
    }
    setFlag(FBF.rule, 1);
    setFlag(FBF.kuchi, 1);
    setFlag(FBF.fuji, 1);
    setFlag(FBF.mo, 1);
    setFlag(FBF.kosuri, 1);
    if (step === 'kosuri') return go(FUNABA, KARA_AT[0], KARA_AT[1], 'up');
    setFlag('flag_ag_c2', 1);
    return go(UMIZOI, 31, 17, 'up');
  });

  registerDebug('fbState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(FBF)) flags[k] = flag(id);
    const f = field();
    const p = game.ui.widgets.find((w) => w instanceof FunaPanel) as FunaPanel | undefined;
    return {
      flags,
      n: [0, 1, 2].map((k) => `${flag(nF(k))}/${fbTotal(k)}${flag(buF(k)) ? '✓' : ''}`),
      open: fbOpen(),
      door: fbDoor(),
      nuruReady: nuruReady(),
      panel: p ? { sel: p.sel, waiting: p.waiting, hit: p.hit } : null,
      gunte: state.inventory.includes(GUNTE),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px (names filled in); no 天丼; no clock time; no さん in the narration. */
export function fbTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', 'おかわり、あるよ', 'もう 1杯', '暗くて しめった', 'ダンゴムシ ちゃう', '焼き芋 食うか', '干しすぎ', '干したりない'];
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
      for (const raw of fillNames(v).split('\n')) {
        const t = raw.trim();
        if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || !t) {
          flush();
          if (t.startsWith('@')) {
            who = t.slice(1);
            if (!SPEAKERS[who] && who !== 'narr' && who !== 'sys') bad.push(`${name}: speaker ${who}`);
          }
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
  walkT('fb', T.FB_TEXTS);
  // the close-up's right column: each line fits (RX .. the window's right edge)
  const room = SX + CW - RX - 2;
  for (const l of [...FB_UI.parts, FB_UI.nokori(3), FB_UI.tsuru, FB_UI.sawaranai, ...FB_UI.keys]) if (measure(l) > room) bad.push(`ui: ${l}: ${measure(l)}px > ${room}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('fbText', () => fbTextCheck());
