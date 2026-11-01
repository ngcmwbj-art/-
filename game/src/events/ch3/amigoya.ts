// 破れたら、つくろう（第3章の クリア前、段階2。げむきか 10/25 の 案2、2026-10-25 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_amigoya.ts、新しい 地図は data/maps/c3_amigoya.ts（網小屋）、絵は art/props/amigoya_art.ts、
// 漁協の 木の 戸の 絵は art/props/c3_bld.ts、みました帳の ページは ui/menu/book_amigoya.ts。
// 案から 直した 所（網の 種類を 言い切らない・結ぶ 回数・言葉）は 文の ファイルの 頭。
//
//   段階1：前ぶれ。港通りの 西の はしの 漁協の 建物の 木の 戸 (5,15) を 調べると、札『網小屋』・網の におい・
//     グソっ君「網の 持ち主、お昼が 長いんや。」（1回）。
//   段階2、S13 の あと（flag_ch3_got_gochisou）から S14 の 前まで（flag_ch3_truck_trap）：
//   ・食堂かもめの 前の ゴロウ (31,16)：いつもの〔c2〕の あと、もう 1回 話すと〔ami〕（flag_ag_start）。
//     遊べる あいだ、ゴロウの 頭の 上に「！」（addMarkSource）。始まった あとは 漁協の 戸の 上に「！」。
//   ・ゴロウが 港通りを 西へ 歩き、しゅんと グソっ君が ついていく → 暗転で 漁協の 戸の 前 (5,16) →
//     戸の 暗転で map_c3_amigoya (7,8)（建物の 絵に 歩いて 入る 形では ない）。出たら 戸を 調べて また 入れる。
//   ・網小屋：梁から 下がる 網、ゴロウは 腰かけ (7,4)。破れ 3つ (4,2)・(8,2)・(12,2) を 左から 順に。
//     1つめの 前で 網針と 目板、穴の 形を ととのえる 話。破れごとに 大写し「網の 目」（AmiPanel）：
//     針が 上下に ゆれる → 目板に 重なった とき けってい（かける）→ ←→ で 糸を 回して 結ぶ（グソっ君が はさみで
//     押さえる）。1つの 破れで 2目、合わせて 6目。目板から はずれて 結ぶと、その 目だけ 大きく なり、ほどいて
//     やりなおし（失敗に しない）。もどる で やめても、結んだ 目は 残る（調べ直せば 続きから）。
//   ・3つ すんだら また 出る → 朱肉 +2、大事な もの『古い 網針』、帳面③の すみ → 暗転で 漁協の 戸の 前へ。
//   ・かくし：ツリノの 浮き釣り（やっと、魚の 昼）を 済ませている → 入って すぐ、グソっ君と ゴロウの 1行。
//     3つめで 目板を 1回も はずさなかった → ゴロウ「……器用じゃのう」。来た マサル → 戸の 前で 無口が 2人。
//   ・すんだ あと 段階2 の 戸：地の文「中で、網を たたむ 音。」。S15 から 先と クリア後は 札『網小屋』だけ。
//
// QA：__game.cmd.amigoya(step, auto)、agState()、agText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { addItem, flag, setFlag, state, type Dir } from '../../game/state';
import { registerDebug } from '../../debug';
import { despawn, registerScript, spawn, walk } from '../../world/api';
import { getMapDef, registerMap } from '../../world/maps';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field, type FieldScene } from '../../world/field';
import { SPEAKERS } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { actorAnchor, addMarkSource } from '../../world/marks';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import type { Howto } from '../../ui/closeup';
import * as T from '../../data/text/c3_amigoya';
import { AG_UI } from '../../data/text/c3_amigoya';
import { fillNames } from '../../data/text/c3_names';
import { AG_ANA, AG_KOSHI, AG_MADO, AMIGOYA } from '../../data/maps/c3_amigoya';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { addToMap, c3Stage, inCh3, kitaComeIn, kitaGoOut, say3 } from './common';

export const AGF = {
  pre: 'flag_ag_pre',
  c2: 'flag_ag_c2',
  start: 'flag_ag_start',
  /** 漁協の 戸の 前の 場面の あいだ（ゴロウが 戸の 前に 立つ）。 */
  to: 'flag_ag_to',
  inn: 'flag_ag_in',
  tsurino: 'flag_ag_tsurino',
  /** 網針と 目板・穴を ととのえる 話（1つめの 前、1回）。 */
  dougu: 'flag_ag_dougu',
  /** 大写しの やり方（1回）・グソっ君の「押さえる 係」（1回）。 */
  rule: 'flag_ag_rule',
  osaeru: 'flag_ag_osaeru',
  ana0: 'flag_ag_ana_0',
  ana1: 'flag_ag_ana_1',
  ana2: 'flag_ag_ana_2',
  /** 破れごとの 結んだ 目（0〜2）。 */
  me0: 'flag_ag_me_0',
  me1: 'flag_ag_me_1',
  me2: 'flag_ag_me_2',
  /** 破れごとの 前の 話（2つめ 根、3つめ 骨）。 */
  hanashi1: 'flag_ag_hanashi_1',
  hanashi2: 'flag_ag_hanashi_2',
  /** 3つめで 目板から はずれた 回数。 */
  miss2: 'flag_ag_miss_2',
  kiyou: 'flag_ag_kiyou',
  /** 戸の 前の 場面の あいだ（すんだ あと、ゴロウと マサル）。 */
  soto: 'flag_ag_soto',
  done: 'flag_ag_done',
  masaru: 'flag_ag_masaru',
} as const;

export const AMIBARI = 'item_c3_amibari';
const UMIZOI = 'map_umizoi';
const GORO = 'npc_c3_jouren';
const MASARU = 'npc_hoshi_gen';
const ANA_F = [AGF.ana0, AGF.ana1, AGF.ana2];
const ME_F = [AGF.me0, AGF.me1, AGF.me2];
/** 1つの 破れで 結ぶ 目の 数（会議：12回は 長い → 合わせて 6）。 */
export const AG_ME_N = [2, 2, 2];
/** 町の 漁協の 木の 戸（港通りの 西の はし）と、その 前。 */
const TO: [number, number] = [5, 15];
const TO_MAE: [number, number] = [5, 16];
/** ゴロウの 置き場所（食堂かもめの 前、段階2）。 */
const GORO_AT: [number, number] = [31, 16];

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
export function agOpen(): boolean {
  return inCh3() && !pgOn() && c3Stage() === 2 && flag('flag_ch3_got_gochisou') > 0 && !flag('flag_ch3_truck_trap');
}

/** 網小屋に 入れる：始まって、すむ 前。 */
export function agDoor(): boolean {
  return agOpen() && flag(AGF.start) > 0 && !flag(AGF.done);
}

/** ゴロウが 網小屋に いる（町の 地図では 見えない）。 */
const agAway = agDoor;

// ================================================================ 町の 物

{
  const def = getMapDef(UMIZOI);
  if (def) {
    // the 漁協's wooden door (5,15): a door cell (the picture: art/props/c3_bld.ts)
    const r = def.rows[TO[1]];
    if (r && r[TO[0]] === 'W') def.rows[TO[1]] = r.slice(0, TO[0]) + 'D' + r.slice(TO[0] + 1);
    // ゴロウ in front of 食堂かもめ is in the 網小屋 meanwhile, and at the door in the scenes
    for (const o of def.objects) {
      if (o.t !== 'npc' || o.id !== GORO) continue;
      const c = (o.cond ?? {}) as Record<string, unknown>;
      if (c.stage !== 2) continue;
      const prevWhen = c.when as (() => boolean) | undefined;
      o.cond = { ...c, when: () => (!prevWhen || prevWhen()) && !agAway() && !flag(AGF.soto) } as MapObj['cond'];
    }
    registerMap(def);
  }
}

const NPC = (o: Record<string, unknown>): MapObj => ({ t: 'npc', ...o }) as unknown as MapObj;
addToMap(UMIZOI, [
  { t: 'door', id: 'door_c3_amigoya', x: TO[0], y: TO[1], to: AMIGOYA, tx: 7, ty: 8, dir: 'up', se: 'se_door', cond: { when: agDoor } } as unknown as MapObj,
  { t: 'obj', id: 'obj_ag_to', x: TO[0], y: TO[1], script: 'obj_ag_to', face: 'up', cond: { when: () => inCh3() || pgOn() } } as unknown as MapObj,
  // ゴロウ at the door: before going in, and after (with マサル)
  NPC({ id: 'ag_goro_to', sprite: GORO, x: 6, y: 16, dir: 'left', script: 'ag_scene', cond: { when: () => flag(AGF.to) > 0 || flag(AGF.soto) > 0 } }),
]);

// ================================================================ 網小屋の 物

const inKoya = () => inCh3() && flag(AGF.start) > 0 && !flag(AGF.done);
const O = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj => ({ t: 'obj', id, x, y, script: id, ...extra }) as unknown as MapObj;
addToMap(AMIGOYA, [
  ...AG_ANA.map(([x], k) => ({ t: 'prop', prop: 'prop_ag_ana', x, y: 0, opts: { k } }) as unknown as MapObj),
  ...AG_ANA.map(([x, y], k) => ({ t: 'obj', id: `obj_ag_ana_${k}`, x, y, script: 'obj_ag_ana', face: 'up' }) as unknown as MapObj),
  // the rest of the hung nets (not the holes, not the window)
  ...[2, 3, 5, 6, 7, 9, 10, 11, 13].map((x) => ({ t: 'obj', id: `obj_ag_ami_${x}`, x, y: 2, script: 'obj_ag_ami', face: 'up' }) as unknown as MapObj),
  O('obj_ag_mado', AG_MADO[0], 2, { face: 'up' }),
  O('obj_ag_yama', 1, 5, { w: 3, h: 2 }),
  O('obj_ag_dougu', 8, 4, { w: 2 }),
  O('obj_ag_hako', 13, 5, { w: 2, h: 2 }),
  O('obj_ag_nagagutsu', 9, 8),
  NPC({ id: 'ag_goro', sprite: GORO, x: AG_KOSHI[0], y: AG_KOSHI[1], dir: 'down', pose: 'sit', off: [0, 1], script: 'ag_goro', cond: { when: inKoya } }),
]);

// ================================================================ 見のがさない しるし

addMarkSource((f) => {
  if (f.map.id !== UMIZOI || !agOpen() || flag(AGF.start) || flag(AGF.to)) return null;
  const a = f.actorById(GORO);
  return a && a.visible ? actorAnchor(a) : null;
});
addMarkSource((f) => {
  if (f.map.id !== UMIZOI || !agDoor() || flag(AGF.to) || flag(AGF.soto)) return null;
  const foot = (TO[1] + 1) * 16;
  return { x: TO[0] * 16 + 8, y: foot - 28, foot };
});

// ================================================================ 大写し「網の 目」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 列（破れ・目の 数・鍵）。 */
const RX = SX + 226;
/** 大写しの 網の 目の 半分の 対角（px）。 */
const HALF = 12;
/** 針の ゆれ：1往復（ms）、目板に 重なる 幅（ゆれの 中の 割合）。 */
const SWING_MS = 1700;
const BAND = 0.3;

const BG = '#4A3628';
const BG_DK = '#3A2A20';
const ITO = '#7A9A7E';
const ITO_DK = '#5A7A62';
const ITO_NEW = '#C8F0B8';
const GAUGE = '#D8B880';
const HARI = '#D8B878';

type Phase = 'idle' | 'kake' | 'mawasu' | 'musubu' | 'ookii';

export class AmiPanel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  /** はじめの カード（ui/closeup.ts、改善会議 10-25 の1）。 */
  howto: Howto = T.AG_HOWTO;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  phase: Phase = 'idle';
  /** けってい（かける）の 結果：null まだ、true 目板に 重なった、false はずれた。 */
  hit: boolean | null = null;
  /** ←→ を 押した。 */
  turned = false;
  cancel = false;
  /** 結ぶ 絵の 時計（ms）。 */
  animT = 0;
  /** 針の ゆれの 時計（ms：kake の 間だけ 進む）。 */
  swingT = 0;
  private armT = 0;

  constructor(public k: number) {}

  /** もどる（ui/closeup.ts）：自分の やめ方で やめる（結んだ 目は 残る）。 */
  quit(): boolean {
    this.cancel = true;
    return true;
  }

  get meN(): number {
    return AG_ME_N[this.k];
  }

  /** 今の 針の 先の ゆれ（-1 上 〜 1 下）。 */
  swing(): number {
    return Math.sin((this.swingT / SWING_MS) * Math.PI * 2);
  }

  /** 針が 目板に 重なっている。 */
  onGauge(): boolean {
    return Math.abs(this.swing()) < BAND;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.phase === 'kake') this.swingT += dt;
    if (this.phase === 'musubu' || this.phase === 'ookii') this.animT += dt;
    const waiting = (this.phase === 'kake' && this.hit === null) || (this.phase === 'mawasu' && !this.turned);
    if (!waiting || this.cancel) {
      this.armT = 0;
      return;
    }
    this.armT += dt;
    if (this.auto) {
      if (this.armT < 250) return;
      if (this.phase === 'kake' && this.onGauge()) this.hit = true;
      else if (this.phase === 'mawasu') this.turned = true;
      return;
    }
    if (this.armT < 150) return;
    if (this.phase === 'kake' && input.pressed('confirm')) this.hit = this.onGauge();
    else if (this.phase === 'mawasu' && (input.pressed('left') || input.pressed('right'))) this.turned = true;
    else if (input.pressed('cancel')) this.cancel = true;
  }

  /** i 番目の 目（作る 目の 列）の 中心。 */
  meAt(i: number, oy: number): [number, number] {
    const W = RX - SX - 4;
    const n = this.meN;
    const x0 = SX + Math.round(W / 2) - n * HALF;
    return [x0 + HALF + i * HALF * 2, oy + 46];
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
        g.text(AG_UI.hole[this.k], RX, oy + 2, { color: '#F4ECD8' });
        g.text(AG_UI.me(flag(ME_F[this.k]), this.meN), RX, oy + 20, { color: '#8A84A0' });
        const keys = this.phase === 'kake' && this.hit === null ? AG_UI.keysKake : this.phase === 'mawasu' && !this.turned ? AG_UI.keysMawasu : null;
        if (keys) keys.forEach((l, i) => g.text(l, RX, oy + 70 + i * 16, { color: '#FFE7A3' }));
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(AG_UI.title) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, AG_UI.title, { seed: 41 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  /** 菱形の 目 1つ（中心と 半分の 対角）。 */
  private diamond(g: Gfx, cx: number, cy: number, h: number, col: string): void {
    g.line(cx - h, cy, cx, cy - h, col);
    g.line(cx, cy - h, cx + h, cy, col);
    g.line(cx + h, cy, cx, cy + h, col);
    g.line(cx, cy + h, cx - h, cy, col);
  }

  private drawScene(g: Gfx, oy: number): void {
    const W = RX - SX - 4;
    g.rect(SX, oy, W, CH, BG);
    for (let x = SX; x < SX + W; x += 14) g.rect(x, oy, 1, CH, BG_DK);
    // the old net all round: diamonds of the same size (lines slanting both ways)
    const D = HALF * 2;
    const [c0x, c0y] = this.meAt(0, oy);
    for (let c = -CH - D * 2; c < W + CH + D; c += D) {
      const bx = SX + c + ((c0x - SX) % D) + HALF;
      g.line(bx, oy - 2 + ((c0y - oy) % D), bx + CH + 4, oy + CH + 2 + ((c0y - oy) % D), ITO);
      g.line(bx, oy - 2 + ((c0y - oy) % D), bx - CH - 4, oy + CH + 2 + ((c0y - oy) % D), ITO);
    }
    // the hole: where the meshes are to be made (one row), the rim's broken ends
    const n = this.meN;
    const hx0 = c0x - HALF - 2;
    const hx1 = c0x + (n - 1) * D + HALF + 2;
    g.rect(hx0, c0y - HALF - 2, hx1 - hx0, HALF * 2 + 4, BG);
    for (let x = hx0; x < hx1; x += 14) g.rect(x, c0y - HALF - 2, 1, HALF * 2 + 4, BG_DK);
    for (let i = 0; i <= n; i++) {
      const x = c0x - HALF + i * D;
      g.line(x - 3, c0y - HALF - 4, x - 1, c0y - HALF + 1, ITO_DK);
      g.line(x + 3, c0y + HALF + 4, x + 1, c0y + HALF - 1, ITO_DK);
    }
    if (this.k === 1) {
      // the long tear (caught on the rocks of the bottom): a slit running up from the hole
      const tx = c0x + HALF - 3;
      g.rect(tx, oy, 6, c0y - HALF - 2 - oy, BG);
      g.line(tx - 2, oy + 10, tx, oy + 14, ITO_DK);
      g.line(tx + 8, oy + 22, tx + 6, oy + 26, ITO_DK);
    }
    if (this.k === 2) {
      // the fish bones caught at the rim
      const bx = hx1 + 8;
      const by = c0y - 6;
      g.rect(bx, by, 14, 1, '#F4F1E8');
      for (let r = 2; r < 14; r += 3) {
        g.rect(bx + r, by - 3, 1, 3, '#E8E4D8');
        g.rect(bx + r, by + 1, 1, 3, '#E8E4D8');
      }
    }
    // the meshes made so far (new twine), the knots bright
    const made = flag(ME_F[this.k]);
    for (let i = 0; i < Math.min(n, made); i++) {
      const [x, y] = this.meAt(i, oy);
      this.diamond(g, x, y, HALF, ITO_NEW);
      g.rect(x - 1, y + HALF - 1, 3, 3, '#E8F6D8');
    }
    const cur = Math.min(n - 1, made);
    const [mx, my] = this.meAt(cur, oy);
    // the gauge (目板): a flat board under the mesh being made
    const gy = my + HALF - 2;
    const lit = this.phase === 'kake' && this.hit === null && this.onGauge();
    g.rect(hx0 - 10, gy, hx1 - hx0 + 20, 6, lit ? '#F4DCA8' : GAUGE);
    g.rect(hx0 - 10, gy, hx1 - hx0 + 20, 1, '#FFF0C8');
    g.rect(hx0 - 10, gy + 5, hx1 - hx0 + 20, 1, '#A8884A');
    if (this.phase === 'ookii') {
      // a knot tied off the gauge: that one mesh comes out big (then it is untied)
      const u = Math.min(1, this.animT / 300);
      this.diamond(g, mx, my + 4, HALF + Math.round(6 * u), '#E8A06A');
    }
    if (this.phase === 'musubu') {
      // the twine goes round (a loop round the knot), then the mesh shows
      const u = Math.min(1, this.animT / 500);
      for (let s = 0; s < 14; s++) {
        const th = (s / 14) * Math.PI * 2 * u;
        g.rect(Math.round(mx + Math.cos(th) * 5) - 1, Math.round(my + HALF - Math.sin(th) * 5) - 1, 2, 2, ITO_NEW);
      }
      if (u >= 1) this.diamond(g, mx, my, HALF, ITO_NEW);
    }
    // the needle (網針): a flat bamboo shuttle, swinging up and down by the mesh being made
    if (this.phase === 'kake' || this.phase === 'mawasu' || this.phase === 'idle') {
      const sw = this.phase === 'kake' ? this.swing() : 0;
      const tipY = Math.round(gy + 3 + sw * 22);
      const nx = mx + HALF - 2;
      g.rect(nx - 2, tipY - 26, 5, 24, HARI);
      g.rect(nx - 2, tipY - 26, 1, 24, '#F0DCA8');
      g.rect(nx - 1, tipY - 2, 3, 2, HARI);
      g.rect(nx, tipY, 1, 1, '#8A6A3A');
      // the twine wound on it, and from it to the knot
      g.rect(nx - 2, tipY - 18, 5, 6, ITO_NEW);
      g.line(nx, tipY - 12, mx, my - HALF, ITO_NEW);
    }
    // グソっ君's claw pressing the knot (each knot: the picture only)
    if (knWith() && (this.phase === 'mawasu' || this.phase === 'musubu')) {
      const cx = mx - 9;
      const cy = my + HALF + 1;
      g.rect(cx - 6, cy - 2, 6, 5, '#C25A4A');
      g.rect(cx - 6, cy - 2, 6, 1, '#E07A5A');
      g.rect(cx, cy - 3, 3, 2, '#C25A4A');
      g.rect(cx, cy + 2, 3, 2, '#C25A4A');
    }
    // the ← → prompt round the knot while turning the twine
    if (this.phase === 'mawasu' && !this.turned && Math.floor(this.t / 300) % 2 === 0) {
      g.text('←', mx - HALF - 14, my - 6, { color: '#FFE7A3' });
      g.text('→', mx + HALF + 4, my - 6, { color: '#FFE7A3' });
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

/** 4 破れ k を つくろう：すんだら true（もどる で やめたら false。結んだ 目は 残る）。 */
function* tsukurou(k: number): Co<boolean> {
  const p = new AmiPanel(k);
  p.auto = qaAuto;
  try {
    yield* openPanel(p);
    if (!flag(AGF.rule)) {
      setFlag(AGF.rule, 1);
      yield* say3(T.AG_RULE);
    }
    while (flag(ME_F[k]) < AG_ME_N[k]) {
      // かける：針を 目板に
      p.phase = 'kake';
      p.hit = null;
      p.swingT = k === 0 ? 0 : SWING_MS / 4;
      while (p.hit === null && !p.cancel) yield null;
      if (p.cancel) return false;
      if (!p.hit) {
        // tied off the gauge: that mesh comes out big → untie it, back one step (not a failure)
        if (k === 2) setFlag(AGF.miss2, flag(AGF.miss2) + 1);
        p.phase = 'ookii';
        p.animT = 0;
        se('se_examine', { vol: 0.4 });
        yield 350;
        yield* say3(T.AG_OOKII);
        continue;
      }
      se('se_cursor', { vol: 0.6 });
      // 回す：糸を 回して 結ぶ（グソっ君が 押さえる）
      p.phase = 'mawasu';
      p.turned = false;
      if (k === 0 && !flag(AGF.osaeru) && knWith()) {
        setFlag(AGF.osaeru, 1);
        yield* say(T.AG_OSAERU);
      }
      while (!p.turned && !p.cancel) yield null;
      if (p.cancel) return false;
      p.phase = 'musubu';
      p.animT = 0;
      se('se_zipper', { vol: 0.35, pitch: 1.4 });
      yield 520;
      se('se_pen_write', { vol: 0.5 });
      setFlag(ME_F[k], flag(ME_F[k]) + 1);
      p.phase = 'idle';
      yield 200;
    }
    setFlag(ANA_F[k], 1);
    se('se_item', { vol: 0.5 });
    yield 250;
    return true;
  } finally {
    yield* closePanel(p);
  }
}

// ================================================================ 台本

/** 1 食堂かもめの 前の ゴロウ（〔ami〕）。 */
wrap(GORO, function* (_ctx, orig): Co {
  if (!agOpen() || !onMap(UMIZOI) || flag(AGF.done) || flag(AGF.start)) {
    yield* orig();
    return;
  }
  if (!flag(AGF.c2)) {
    setFlag(AGF.c2, 1);
    yield* orig();
    return;
  }
  yield* startScene();
});

function placePlayer(f: FieldScene, x: number, y: number, dir: Dir): void {
  f.player.x = x * 16 + 8;
  f.player.y = y * 16 + 16;
  f.player.dir = dir;
  f.syncFollower(true);
  f.snapCamera();
}

/** ゴロウが 港通りを 西へ 歩く（しゅんが ついていく）：絵だけの 歩く 人を 出して、本物は 隠す。 */
function* arukiScene(f: FieldScene): Co {
  const home = f.actorById(GORO);
  const sx = home ? home.tileX : GORO_AT[0];
  const sy = home ? home.tileY : GORO_AT[1];
  if (home) home.visible = false;
  const w = spawn('ag_goro_walk', sx, sy, { sprite: GORO, dir: 'down', ghost: true });
  w.data.scripted = true;
  const path: [number, number][] = [[sx, sy + 1]];
  for (let x = sx - 1; x >= sx - 5; x--) path.push([x, sy + 1]);
  // out of his way: if しゅん stands on his road, one step south first
  const p = f.player;
  if (path.some(([x, y]) => x === p.tileX && y === p.tileY)) yield* walk('player', [[p.tileX, p.tileY + 1]], { speed: 4 });
  let goroDone = false;
  game.scripts.run(
    (function* (): Co {
      yield* walk('ag_goro_walk', path, { speed: 2.6, face: 'left' });
      goroDone = true;
    })(),
  );
  yield 500;
  const py = f.player.tileY;
  const follow: [number, number][] = [];
  for (let x = f.player.tileX - 1; x >= sx - 3; x--) follow.push([x, py]);
  if (follow.length) yield* walk('player', follow, { speed: 2.6, face: 'left' });
  yield () => goroDone;
  yield 200;
  yield* game.fadeOut(300, '#1B1733');
  despawn('ag_goro_walk');
  if (home) {
    home.x = GORO_AT[0] * 16 + 8;
    home.y = GORO_AT[1] * 16 + 16;
    home.dir = 'down';
    home.visible = true;
  }
}

/** 1 明日、船を 出す → 港通りを 西へ → 漁協の 戸の 前 → 網小屋へ。 */
function* startScene(): Co {
  const f = field();
  if (!f) return;
  yield* say3(knWith() ? T.AG_A : T.AG_A_SOLO);
  yield* arukiScene(f);
  setFlag(AGF.start, 1);
  setFlag(AGF.to, 1);
  placePlayer(f, TO_MAE[0], TO_MAE[1], 'up');
  f.refreshPresence();
  yield 120;
  yield* game.fadeIn(300);
  yield* say3(T.AG_TO);
  yield* f.warpCo(AMIGOYA, 7, 8, 'up', 'se_door', UMIZOI);
  setFlag(AGF.to, 0);
}

registerScript('ag_scene', function* (): Co {});

/** 2 網小屋（入って すぐ、1回）。 */
registerScript('evt_ag_enter', function* (): Co {
  const f = field();
  if (!f || !inCh3()) return;
  setFlag(AGF.to, 0);
  if (!inKoya() || flag(AGF.inn)) return;
  setFlag(AGF.inn, 1);
  yield 300;
  yield* say3(T.AG_IN);
  if (knWith()) yield* say(T.AG_IN_KN);
  if (flag('flag_sk_done') && knWith() && !flag(AGF.tsurino)) {
    setFlag(AGF.tsurino, 1);
    yield* say(T.AG_TSURINO);
  }
});

/** 次に つくろう 破れ（左から）。 */
function nextAna(): number {
  return ANA_F.findIndex((f) => !flag(f));
}

/** 破れ（北の 壁の 網）。 */
registerScript('obj_ag_ana', function* (ctx: ScriptCtx): Co {
  const k = Number(String(ctx.source).replace('obj_ag_ana_', ''));
  se('se_examine');
  if (!inKoya()) {
    yield* say3(T.AG_AMI);
    return;
  }
  if (flag(ANA_F[k])) {
    yield* say3(T.AG_SUNDA);
    return;
  }
  if (k !== nextAna()) {
    yield* say3(T.AG_JUNBAN);
    return;
  }
  // 3 切って、ととのえる（1つめの 前、1回）
  if (!flag(AGF.dougu)) {
    setFlag(AGF.dougu, 1);
    yield* say3(T.AG_DOUGU);
    if (knWith()) yield* say(T.AG_DOUGU_KN);
    yield* say3(T.AG_KIRU);
    if (knWith()) yield* say(T.AG_KIRU_KN);
    yield* say3(T.AG_KIRU_2);
  }
  if (k === 1 && !flag(AGF.hanashi1)) {
    setFlag(AGF.hanashi1, 1);
    yield* say(knWith() ? T.AG_NE : T.AG_NE_SOLO);
  }
  if (k === 2 && !flag(AGF.hanashi2)) {
    setFlag(AGF.hanashi2, 1);
    yield* say(knWith() ? T.AG_HONE : T.AG_HONE_SOLO);
  }
  if (!flag(ME_F[k])) {
    se('se_kotei_snip', { vol: 0.6 });
    yield* say3(T.AG_CHOKI);
  }
  if (!(yield* tsukurou(k))) return;
  yield* say3(T.AG_TSUKUROTTA[k]);
  if (k === 2 && !flag(AGF.miss2) && !flag(AGF.kiyou) && knWith()) {
    setFlag(AGF.kiyou, 1);
    yield* say3(T.AG_KIYOU);
  }
  if (nextAna() < 0) yield* deru();
});

/** 5 また 出る → ごほうび → 漁協の 戸の 前。 */
function* deru(): Co {
  const f = field();
  if (!f) return;
  yield 300;
  yield* say3(T.AG_DERU);
  if (knWith()) yield* say(T.AG_DERU_KN);
  yield* say3(T.AG_MOTTOKE);
  setFlag(AGF.done, 1);
  addMp(2);
  if (!state.inventory.includes(AMIBARI)) addItem(AMIBARI);
  se('se_item');
  yield* say3(T.AG_REWARD);
  // out to the door: ゴロウ comes out too (and マサル, if he came)
  setFlag(AGF.soto, 1);
  yield* f.warpCo(UMIZOI, TO_MAE[0], TO_MAE[1], 'down', 'se_door', AMIGOYA);
  yield 200;
  if (!flag(AGF.masaru) && (yield* kitaComeIn(MASARU, UMIZOI, [[10, 17], [9, 17], [8, 17], [7, 17], [6, 17]], 'up'))) {
    setFlag(AGF.masaru, 1);
    yield* say3(T.AG_MASARU);
    kitaGoOut(MASARU);
    yield 400;
  }
  yield 300;
  yield* game.fadeOut(300, '#1B1733');
  setFlag(AGF.soto, 0);
  f.refreshPresence();
  yield 100;
  yield* game.fadeIn(300);
}

/** 網小屋の ゴロウ。 */
registerScript('ag_goro', function* (): Co {
  if (!inKoya()) return;
  yield* say3(ANA_F.some((f) => flag(f)) || flag(AGF.dougu) ? T.AG_GORO_NAKA : T.AG_GORO_MAE);
});

registerScript('obj_ag_ami', function* (): Co {
  se('se_examine');
  yield* say3(T.AG_AMI);
});
registerScript('obj_ag_mado', function* (): Co {
  se('se_examine');
  yield* say3(T.AG_MADO);
});
registerScript('obj_ag_yama', function* (): Co {
  se('se_examine');
  yield* say3(T.AG_YAMA);
});
registerScript('obj_ag_dougu', function* (): Co {
  se('se_examine');
  yield* say3(T.AG_DOUGUBAKO);
});
registerScript('obj_ag_hako', function* (): Co {
  se('se_examine');
  yield* say3(T.AG_HAKO);
});
registerScript('obj_ag_nagagutsu', function* (): Co {
  se('se_examine');
  yield* say3(T.AG_NAGAGUTSU);
});

/** 町の 漁協の 木の 戸（調べる。開いて いれば 暗転で 入る）。 */
registerScript('obj_ag_to', function* (): Co {
  const f = field();
  if (!f) return;
  if (agDoor()) {
    yield* f.warpCo(AMIGOYA, 7, 8, 'up', 'se_door', UMIZOI);
    return;
  }
  se('se_examine');
  if (inCh3() && !pgOn() && c3Stage() === 1 && !flag(AGF.pre)) {
    setFlag(AGF.pre, 1);
    yield* say3(T.AG_DOOR_C1);
    if (knWith()) yield* say(T.AG_DOOR_C1_KN);
    return;
  }
  if (agOpen() && flag(AGF.done)) {
    yield* say3(T.AG_DOOR_DONE);
    return;
  }
  yield* say3(T.AG_DOOR_FUDA);
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.amigoya(step = 'start', auto = false)（auto：大写しを 自動で 結ぶ）
 *   'c1'     段階1、漁協の 戸の 前 (5,16) 上向き（前ぶれ）
 *   'start'  段階2、〔c2〕の あと、食堂かもめの 前の ゴロウの 前 (31,17) 上向き（話すと〔ami〕）
 *   'in'     始まった あと、網小屋の 南の 戸の 上 (7,8)（入った ときの 1回）
 *   'a0'     入った あと、1つめの 破れの 前 (4,3) 上向き
 *   'a1'     1つめ すんだ あと、2つめの 前 (8,3)
 *   'a2'     2つ すんだ あと、3つめの 前 (12,3)
 *   'done'   すんだ あと、段階2 の 漁協の 戸の 前 (5,16) 上向き
 */
if (import.meta.env.DEV) {
  registerDebug('amigoya', (step = 'start', auto = false) => {
    qaAuto = !!auto;
    const s1 = step === 'c1';
    cmd().jump?.(s1 ? 'ch3:umizoi' : 'ch3:trap', true);
    for (const id of Object.values(AGF)) setFlag(id, 0);
    setFlag('flag_ch3_stage', s1 ? 1 : 2);
    if (!s1) setFlag('flag_ch3_got_gochisou', 1);
    // (the jump may land a beat later: warp again after it)
    const go = (m: string, x: number, y: number, d: string) => {
      setTimeout(() => cmd().warp?.(m, x, y, d), 700);
      return cmd().warp?.(m, x, y, d);
    };
    if (s1) return go(UMIZOI, TO_MAE[0], TO_MAE[1], 'up');
    setFlag(AGF.c2, 1);
    if (step === 'start') return go(UMIZOI, GORO_AT[0], GORO_AT[1] + 1, 'up');
    setFlag(AGF.start, 1);
    if (step === 'in') return go(AMIGOYA, 7, 8, 'up');
    setFlag(AGF.inn, 1);
    if (step === 'done') {
      for (let k = 0; k < 3; k++) {
        setFlag(ANA_F[k], 1);
        setFlag(ME_F[k], AG_ME_N[k]);
      }
      setFlag(AGF.dougu, 1);
      setFlag(AGF.done, 1);
      addItem(AMIBARI);
      return go(UMIZOI, TO_MAE[0], TO_MAE[1], 'up');
    }
    const n = step === 'a1' ? 1 : step === 'a2' ? 2 : 0;
    if (n > 0) {
      setFlag(AGF.dougu, 1);
      setFlag(AGF.rule, 1);
      setFlag(AGF.osaeru, 1);
    }
    for (let k = 0; k < n; k++) {
      setFlag(ANA_F[k], 1);
      setFlag(ME_F[k], AG_ME_N[k]);
    }
    return go(AMIGOYA, AG_ANA[n][0], 3, 'up');
  });

  registerDebug('agState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(AGF)) flags[k] = flag(id);
    const f = field();
    const p = game.ui.widgets.find((w) => w instanceof AmiPanel) as AmiPanel | undefined;
    return {
      flags,
      open: agOpen(),
      door: agDoor(),
      next: nextAna(),
      panel: p ? { k: p.k, phase: p.phase, hit: p.hit, onGauge: p.onGauge() } : null,
      amibari: state.inventory.includes(AMIBARI),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px (names filled in); no 天丼; no clock time; no さん in the narration. */
export function agTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', '刺し網', '本目', 'おかわり、あるよ', 'もう 1杯', '暗くて しめった', 'いただきます', '牛は、しゃべらん', '焼き芋 食うか', 'ささらん'];
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
  walkT('ag', T.AG_TEXTS);
  // the close-up's right column: each line fits (RX .. the window's right edge)
  const room = SX + CW - RX - 2;
  for (const l of [...AG_UI.hole, AG_UI.me(2, 2), ...AG_UI.keysKake, ...AG_UI.keysMawasu]) if (measure(l) > room) bad.push(`ui: ${l}: ${measure(l)}px > ${room}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('agText', () => agTextCheck());
