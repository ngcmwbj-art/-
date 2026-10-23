// 落とすけえ、甘うなる（第3章の クリア前、段階1。げむきか 10/23 の 案1、2026-10-23 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_mikan.ts、新しい 地図は data/maps/c3_mikan_ue.ts（みかん畑の 上の 段）、絵は art/props/mikan_ue_art.ts、
// みました帳の ページは ui/menu/book_mikan.ts。
//
//   段階1（正午）、S06 の あと（flag_ch3_kids：item_c3_map を もらう 場面）から S12 の ナリオサメの 前まで。
//   段階2（S13〜S14）も 上の 段には 入れる（2人が 来ている）。S15 から 先と クリア後は 石の 段の 札だけ（入れない）。
//   ・干物屋の ホシオ (17,14)・ホシミ (19,14)：いつもの 会話（〔c1〕、S08 の あとは その 台詞）の あと、もう 1回 話すと
//     〔mikan〕＋ 数が ちがう（flag_mk_start）。S08 の 品集めの 最中は 今の S08 の 台詞が 先。
//   ・みかん畑の いちばん 上の 作業道 (52,2) の 北 (52,1)：石の 段（町の 地図の 1マスを 石段に する。きらりと 白い
//     照り返しで 見つけやすく）。石の 段に 乗ると map_c3_mikan_ue (12,8)。
//   ・上の 段：物置 (1–3,1) で はさみと かご（flag_mk_hasami）。段ごとに 1本の 枝の 木（下 (7,7)・中 (16,4)・上 (8,1)。
//     きらり）→ 大写し「枝」EdaPanel：←→ で 実を 選んで けっていで 切る。落とす 実は 段ごとに 1つ（下 小さい・
//     中 傷・上 上向きの 大きい）。ちがう 実は 切らない（グソっ君の 1行。flag_mk_miss）。flag_mk_eda_0..2。
//   ・3本 すんだら 上の 段の ベンチ (11,1) → 大写し「上の 段から」MiharashiPanel：町の 屋根、市場の 大屋根、港、
//     防波堤の 赤い 灯台、鏡の 海、南の 水平線（flag_mk_bench。何度でも 見られる）。
//   ・店先へ もどって 2人に 話す → どっちも（目安は 20〜25枚、どっちも その 中）→ 朱肉 +2、青い みかん 2つ、
//     みました帳③の すみ（flag_mk_done）。
//   ・段階2：上の 段に 2人（麦わら帽子）。すんで いれば 1回「……ほどよう。」（flag_mk_c2）、いなければ 地の文。
//   ・かくし：しんごが 来ていれば、すんだ あと 上の 段に 上がって くる（flag_mk_shingo）。青い みかんを 持って S08 の
//     あとの ナミエ（flag_mk_namie）。まちがえずに 3本 → 2人の 声が そろう（flag_mk_soro）。
//
// QA：__game.cmd.mikan(step, auto)、mkState()、mkText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { addItem, flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { despawn, registerScript, spawn, walk } from '../../world/api';
import { fxAt, registerWorldFx } from '../../world/fx';
import { getMapDef, registerMap } from '../../world/maps';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { SPEAKERS } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { actorAnchor } from '../../world/marks';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/c3_mikan';
import { MK_UI } from '../../data/text/c3_mikan';
import { c3Name, fillNames } from '../../data/text/c3_names';
import { MIKAN_UE, MIKAN_UE_TREES } from '../../data/maps/c3_mikan_ue';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { addToMap, c3Stage, inCh3, kita, say3 } from './common';

export const MKF = {
  pre: 'flag_mk_pre',
  start: 'flag_mk_start',
  inn: 'flag_mk_in',
  hasami: 'flag_mk_hasami',
  kazoe: 'flag_mk_kazoe',
  rule: 'flag_mk_rule',
  eda0: 'flag_mk_eda_0',
  eda1: 'flag_mk_eda_1',
  eda2: 'flag_mk_eda_2',
  miss: 'flag_mk_miss',
  sanbon: 'flag_mk_sanbon',
  bench: 'flag_mk_bench',
  furuki: 'flag_mk_furuki',
  drum: 'flag_mk_drum',
  done: 'flag_mk_done',
  soro: 'flag_mk_soro',
  c2: 'flag_mk_c2',
  shingo: 'flag_mk_shingo',
  namie: 'flag_mk_namie',
} as const;

export const AO_MIKAN = 'item_c3_ao_mikan';
const UMIZOI = 'map_umizoi';
const OTTO = 'npc_c3_himono_otto';
const TSUMA = 'npc_c3_himono_tsuma';
const EDA_F = [MKF.eda0, MKF.eda1, MKF.eda2];
/** 枝の 木（下・中・上）：MIKAN_UE_TREES の 幹の 左の マス。 */
const EDA_AT: [number, number][] = [
  [7, 7],
  [16, 4],
  [8, 1],
];
/** 町の 地図の 石の 段（作業道 (52,2) の 北）。 */
const DAN: [number, number] = [52, 1];
/**
 * 段階2 の 2人：ホシオは 中の 段の 石の 段の 上 (11,4)、ホシミは 着いた 所の 前 (12,7)。石の 段の 列（11–12）の
 * ほかは 石垣の 絵に 隠れる（2D の 重なりの 点検）ので、ここに 立つ。上へは (11,5)→(12,5)→(12,4) で 通れる。
 */
const FUTARI_AT: [number, number][] = [
  [11, 4],
  [12, 7],
];

SPEAKERS.c3_himono_futari = { name: `${c3Name(OTTO)}・${c3Name(TSUMA)}`, voice: 'c3_himono_otto' };

function knWith(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** S08 の 品集めの 最中（今の S08 の 台詞が 先）。 */
function s08Mid(): boolean {
  return flag('flag_ch3_shokudo_start') > 0 && !flag('flag_ch3_shokudo_done');
}

/** 寄り道が 開いている（段階1）：S06 の あと、ナリオサメの 前。 */
export function mkOpen(): boolean {
  return inCh3() && !pgOn() && c3Stage() === 1 && flag('flag_ch3_kids') > 0 && !flag('flag_ch3_nariosame_beaten');
}

/** 上の 段へ 行ける：段階1〜2（S14 の トラックの あとは 行けない）。 */
export function mkDoor(): boolean {
  return inCh3() && !pgOn() && (c3Stage() === 1 || c3Stage() === 2) && flag('flag_ch3_kids') > 0 && !flag('flag_ch3_truck_trap');
}

function cutN(): number {
  return EDA_F.filter((f) => flag(f) > 0).length;
}

/** 段階2 の 上の 段に 2人が いる。 */
function futariUe(): boolean {
  return inCh3() && !pgOn() && c3Stage() === 2;
}

/** 話す 人の いない 行を 抜く（グソっ君）。 */
function trim(text: string): string {
  const drop = (who: string) => who === 'npc_kanenari' && !knWith();
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

// ================================================================ 地図の 物

// 町：作業道の 奥の クロマツの あいだ (52,1) を 石の 段に する（HD-2D でも 松の 塊に 隠れない）
{
  const def = getMapDef(UMIZOI);
  if (def) {
    const r = def.rows[DAN[1]];
    if (r && r[DAN[0]] === 'H') {
      def.rows[DAN[1]] = r.slice(0, DAN[0]) + 'n' + r.slice(DAN[0] + 1);
      registerMap(def);
    }
  }
}

addToMap(UMIZOI, [
  { t: 'prop', prop: 'prop_mk_dan', x: DAN[0], y: DAN[1], opts: { side: 'umizoi' } } as unknown as MapObj,
  // the way up (pushing north from the steps), the things to examine there (a glint while it leads somewhere)
  // (stepping onto the steps goes up: the pines' edge row past them is the map's edge)
  { t: 'door', id: 'door_c3_mikan_ue', x: DAN[0], y: DAN[1], step: true, to: MIKAN_UE, tx: 12, ty: 8, dir: 'up', se: 'se_step_stone', cond: { when: mkDoor } } as unknown as MapObj,
  { t: 'obj', id: 'obj_mk_dan', x: DAN[0], y: DAN[1], flat: true, script: 'obj_mk_dan', face: 'up', cond: { when: mkDoor } } as unknown as MapObj,
  { t: 'obj', id: 'obj_mk_dan_yasumi', x: DAN[0], y: DAN[1], flat: true, script: 'obj_mk_dan_yasumi', face: 'up', cond: { when: () => !mkDoor() && (pgOn() || c3Stage() >= 3) } } as unknown as MapObj,
]);

const NPC = (o: Record<string, unknown>): MapObj => ({ t: 'npc', ...o }) as unknown as MapObj;
const isEda = (x: number, y: number) => EDA_AT.some(([ex, ey]) => ex === x && ey === y);
addToMap(MIKAN_UE, [
  { t: 'obj', id: 'obj_mk_monooki', x: 1, y: 1, w: 3, script: 'obj_mk_monooki', face: 'up', cond: { when: () => inCh3() } } as unknown as MapObj,
  { t: 'obj', id: 'obj_mk_furuki', x: 20, y: 1, w: 2, script: 'obj_mk_furuki', face: 'up', cond: { when: () => inCh3() } } as unknown as MapObj,
  { t: 'obj', id: 'obj_mk_bench', x: 11, y: 1, script: 'obj_mk_bench', face: 'up', cond: { when: () => inCh3() } } as unknown as MapObj,
  { t: 'obj', id: 'obj_mk_drum', x: 22, y: 8, script: 'obj_mk_drum', cond: { when: () => inCh3() } } as unknown as MapObj,
  // the three branches (one tree a terrace; a glint until looked at)
  ...EDA_AT.map(([x, y], k) => ({ t: 'obj', id: `obj_mk_eda_${k}`, x, y, w: 2, script: 'obj_mk_eda', face: 'up', cond: { when: () => flag(MKF.start) > 0 && c3Stage() === 1 } }) as unknown as MapObj),
  ...EDA_AT.map(([x, y], k) => ({ t: 'obj', id: `obj_mk_eda_x_${k}`, x, y, w: 2, script: 'obj_mk_ki', face: 'up', cond: { when: () => !(flag(MKF.start) > 0 && c3Stage() === 1) } }) as unknown as MapObj),
  ...MIKAN_UE_TREES.filter(({ x, y }) => !isEda(x, y)).map(({ x, y }, i) => ({ t: 'obj', id: `obj_mk_ki_${i}`, x, y, w: 2, script: 'obj_mk_ki' }) as unknown as MapObj),
  // 12:01: the two came up at last, straw hats on
  NPC({ id: 'mk_hoshio', sprite: OTTO, x: FUTARI_AT[0][0], y: FUTARI_AT[0][1], dir: 'down', script: 'mk_futari', cond: { when: futariUe } }),
  NPC({ id: 'mk_hoshimi', sprite: TSUMA, x: FUTARI_AT[1][0], y: FUTARI_AT[1][1], dir: 'down', script: 'mk_futari', cond: { when: futariUe } }),
]);

// the two's straw hats at 12:01 (over their heads), and the cut branches' fallen fruit under the trees
registerWorldFx({
  map: MIKAN_UE,
  anchored: true,
  draw(f, g, cx, cy, layer) {
    if (layer === 'ground') {
      // the thinned fruit lie under the trees where they were cut (green dots in the trees' round shade)
      EDA_AT.forEach(([x, y], k) => {
        if (!flag(EDA_F[k])) return;
        for (const [dx, dy] of [[10, 12], [19, 14], [24, 11]] as const) {
          const [sx, sy] = fxAt(f, x * 16 + dx, y * 16 + dy, cx, cy);
          g.rect(Math.round(sx), Math.round(sy), 2, 2, '#6AA04A');
          g.px(Math.round(sx), Math.round(sy), '#9BCB6B');
        }
      });
      return;
    }
    if (layer !== 'glow' || !futariUe()) return;
    for (const id of ['mk_hoshio', 'mk_hoshimi']) {
      const a = f.actorById(id);
      if (!a || !a.visible) continue;
      const at = actorAnchor(a);
      const [sx, sy] = fxAt(f, at.x, at.y + 6, cx, cy, at.foot);
      const X = Math.round(sx);
      const Y = Math.round(sy);
      g.rect(X - 7, Y + 2, 15, 2, '#B8904A');
      g.rect(X - 6, Y + 1, 13, 1, '#E8C890');
      g.rect(X - 3, Y - 2, 7, 3, '#E8C890');
      g.rect(X - 3, Y, 7, 1, '#C25A4A');
    }
  },
});

// ================================================================ 大写し「枝」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 列（段・かご・鍵）。 */
const RX = SX + 226;

export type Mi = 'futsu' | 'chiisai' | 'kizu' | 'ue';
/** 段ごとの 枝：実 5つ（左から）。落とすのは 1つ。 */
export const EDA_MI: Mi[][] = [
  ['futsu', 'futsu', 'futsu', 'chiisai', 'futsu'],
  ['futsu', 'kizu', 'futsu', 'futsu', 'futsu'],
  ['futsu', 'futsu', 'ue', 'futsu', 'futsu'],
];
const TARGET: Mi[] = ['chiisai', 'kizu', 'ue'];

export class EdaPanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  active = false;
  /** 選んでいる 実。 */
  sel = 0;
  /** けっていで 選んだ 実（null まだ）。 */
  picked: number | null = null;
  cancel = false;
  /** 切った 実（落ちる 途中 → 消える）。 */
  cut = -1;
  cutT = 0;
  private armT = 0;

  constructor(public k: number) {}

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.cut >= 0) this.cutT += dt;
    if (!this.active || this.picked !== null || this.cancel) {
      this.armT = 0;
      return;
    }
    this.armT += dt;
    if (this.auto) {
      const want = EDA_MI[this.k].indexOf(TARGET[this.k]);
      if (this.armT > 300) {
        if (this.sel !== want) {
          this.sel += this.sel < want ? 1 : -1;
          this.armT = 0;
        } else this.picked = this.sel;
      }
      return;
    }
    if (this.armT < 150) return;
    if (input.pressed('left')) {
      this.sel = (this.sel + 4) % 5;
      se('se_cursor', { vol: 0.5 });
    } else if (input.pressed('right')) {
      this.sel = (this.sel + 1) % 5;
      se('se_cursor', { vol: 0.5 });
    } else if (input.pressed('confirm')) this.picked = this.sel;
    else if (input.pressed('cancel')) this.cancel = true;
  }

  /** 枝の 上の 点（i 番目の 実の 付け根）。 */
  branchAt(i: number, oy: number): [number, number] {
    const x = SX + 28 + i * 42;
    return [x, oy + 24 + Math.round(i * 2.2)];
  }

  /** 実の 中心（下げ 実は 枝の 下、上向きの 実は 枝の 上）。 */
  miAt(i: number, oy: number): [number, number] {
    const [x, by] = this.branchAt(i, oy);
    const kind = EDA_MI[this.k][i];
    if (kind === 'ue') return [x, by - 12];
    return [x, by + (kind === 'chiisai' ? 16 : 22)];
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
        g.text(MK_UI.dan[this.k], RX, oy + 2, { color: '#F4ECD8' });
        g.text(MK_UI.kago(cutN()), RX, oy + 20, { color: '#8A84A0' });
        if (this.active && this.picked === null) MK_UI.keys.forEach((l, i) => g.text(l, RX, oy + 70 + i * 16, { color: '#FFE7A3' }));
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(MK_UI.eda) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, MK_UI.eda, { seed: 23 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  private drawScene(g: Gfx, oy: number): void {
    const W = RX - SX - 4;
    // the leafy shade inside the tree (dark), spots of the noon sky through it
    g.rect(SX, oy, W, CH, '#1E4A2A');
    for (let i = 0; i < 26; i++) {
      const x = SX + ((i * 47) % W);
      const y = oy + ((i * 29) % CH);
      g.circle(x, y, 9 + (i % 3) * 2, i % 4 ? '#2E6A3A' : '#24563A');
    }
    for (let i = 0; i < 7; i++) g.rect(SX + 12 + ((i * 61) % (W - 20)), oy + 4 + ((i * 17) % 14), 3, 2, '#A8D0EA');
    const mi = EDA_MI[this.k];
    // the leaves along the branch (a crowd of them: about 20 to 25 a fruit, not counted), behind it
    for (let i = 0; i < 60; i++) {
      const [bx, by] = this.branchAt(i % 5, oy);
      const lx = bx - 20 + ((i * 13) % 40);
      const ly = by - 14 + ((i * 7) % 12) + (i % 2 ? 0 : 10);
      g.rect(lx, ly, 8, 3, i % 3 ? '#4A8A4A' : '#3A7A3A');
      g.rect(lx + 1, ly, 6, 1, '#6AA06A');
      g.px(lx + 7, ly + 1, '#2E6A3A');
    }
    // the branch from the left, bending down a little to the right
    let prev: [number, number] = [SX - 2, oy + 20];
    for (let i = 0; i < 5; i++) {
      const p = this.branchAt(i, oy);
      for (let d = 0; d < 3; d++) g.line(prev[0], prev[1] + d, p[0] + 20, p[1] + 1 + d, d === 0 ? '#7A5A3A' : d === 1 ? '#5A3A2A' : '#3A2418');
      prev = [p[0] + 20, p[1] + 1];
    }
    // the five fruit (the one cut falls into the basket below)
    for (let i = 0; i < 5; i++) {
      const kind = mi[i];
      const [bx, by] = this.branchAt(i, oy);
      let [x, y] = this.miAt(i, oy);
      const r = kind === 'chiisai' ? 4 : kind === 'ue' ? 10 : 8;
      if (i === this.cut) {
        const u = this.cutT / 1000;
        y += Math.round(u * u * 260);
        x += Math.round(((SX + W / 2) - x) * Math.min(1, u * 1.6));
        if (y > oy + CH + 10) continue;
      } else if (kind === 'ue') g.rect(x - 1, y + r - 1, 3, by - (y + r) + 2, '#5A6A3A');
      else g.rect(x - 1, by + 2, 2, y - r - by - 1, '#5A6A3A');
      g.circle(x, y, r, '#6AA04A');
      g.circle(x + Math.round(r / 4), y + Math.round(r / 4), Math.round(r * 0.7), '#5A9040');
      g.circle(x - Math.round(r / 3), y - Math.round(r / 3), Math.max(1, Math.round(r / 3)), '#9BCB6B');
      // the calyx: on top of a hanging fruit, under one that faces up
      if (kind === 'ue') g.rect(x - 2, y - r, 4, 2, '#3A5A2A');
      else if (i !== this.cut) g.rect(x - 2, y - r, 4, 2, '#3A5A2A');
      if (kind === 'kizu') {
        g.line(x - 4, y - 2, x + 3, y + 4, '#8A5A3A');
        g.line(x - 3, y - 3, x + 4, y + 3, '#A8784A');
        g.line(x - 1, y - 3, x + 1, y + 1, '#8A5A3A');
      }
    }
    // the basket at the bottom, the fruit cut so far in it
    const kx = SX + W / 2 - 22;
    const ky = oy + CH - 12;
    g.rect(kx, ky, 44, 12, '#C8A06A');
    g.rect(kx, ky, 44, 1, '#E8C890');
    for (let x = kx + 3; x < kx + 44; x += 4) g.rect(x, ky + 2, 1, 9, '#A8804A');
    const inK = cutN() - (this.cut >= 0 && this.cutT < 900 ? 1 : 0);
    for (let i = 0; i < inK; i++) g.circle(kx + 10 + i * 12, ky - 1, 4, '#6AA04A');
    // the cursor: a pale ring round the chosen fruit and the shears' red grips over it
    if (this.active && this.picked === null && this.cut < 0) {
      const [x, y] = this.miAt(this.sel, oy);
      const blink = Math.floor(this.t / 300) % 2 === 0;
      const r = 12;
      g.frame(x - r, y - r, r * 2, r * 2, blink ? '#FFE7A3' : '#F4ECD8');
      g.line(x + r - 3, y - r - 7, x + 2, y - r + 3, '#E8ECF4');
      g.line(x + r + 3, y - r - 7, x + 4, y - r + 3, '#E8ECF4');
      g.rect(x + r - 5, y - r - 11, 4, 4, '#C25A4A');
      g.rect(x + r + 2, y - r - 11, 4, 4, '#C25A4A');
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

/** 4 枝（k 段目）：切ったら true。 */
function* eda(k: number): Co<boolean> {
  const p = new EdaPanel(k);
  p.auto = qaAuto;
  try {
    yield* openPanel(p);
    if (!flag(MKF.rule)) {
      setFlag(MKF.rule, 1);
      yield* say3(T.MK_RULE);
    }
    yield* say3(T.MK_EDA_HINT[k]);
    for (;;) {
      p.picked = null;
      p.active = true;
      while (p.picked === null && !p.cancel) yield null;
      p.active = false;
      if (p.cancel) return false;
      const i = Number(p.picked);
      if (EDA_MI[k][i] !== TARGET[k]) {
        setFlag(MKF.miss, 1);
        se('se_examine', { vol: 0.4 });
        if (knWith()) yield* say(T.MK_IIKAO);
        continue;
      }
      if (k === 2) yield* say(T.MK_ERASOU);
      se('se_kotei_snip', { vol: 0.7 });
      p.cut = i;
      p.cutT = 0;
      setFlag(EDA_F[k], 1);
      yield 650;
      yield* say3(T.MK_PACHIN);
      if (k === 2) yield* say3(T.MK_NOKOTTA);
      yield 150;
      return true;
    }
  } finally {
    yield* closePanel(p);
  }
}

// ================================================================ 大写し「上の 段から」（見晴らし）

export class MiharashiPanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  open = 0;

  update(dt: number): void {
    this.t += dt;
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
      g.clip(SX, oy, CW, CH, () => this.drawScene(g, oy));
      const tw = g.measure(MK_UI.miharashi) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, MK_UI.miharashi, { seed: 61 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  private drawScene(g: Gfx, oy: number): void {
    const W = CW;
    const nami = c3Stage() >= 2;
    const hz = oy + 30;
    // the noon sky, and far to the south the horizon (higher than from the beach: the sea is wide)
    for (let y = oy; y < hz; y++) g.rect(SX, y, W, 1, y < oy + 10 ? '#8EC0E0' : y < oy + 20 ? '#A8D0EA' : '#C8E2F2');
    g.rect(SX, hz, W, 1, '#6A9AC0');
    // the sea: the sky upside down at noon (a mirror), waves at 12:01
    for (let y = hz + 1; y < oy + 72; y++) {
      const d = y - hz;
      g.rect(SX, y, W, 1, d < 8 ? '#B8D8EC' : d < 22 ? '#9CC8E2' : '#7AB0D4');
      if (nami && (d + Math.round(this.t / 140)) % 7 === 0) for (let x = SX + ((d * 13) % 19); x < SX + W; x += 27) g.rect(x, y, 7, 1, '#E8F4FA');
    }
    if (!nami) for (let i = 0; i < 7; i++) g.rect(SX + 20 + i * 44, hz + 5 + (i % 3) * 7, 16, 1, '#D8ECF8');
    // the breakwater running west into the sea, the red lighthouse at its end, the harbour's water inside
    const bw = oy + 58;
    g.rect(SX + 16, bw, 170, 3, '#C8C2B4');
    g.rect(SX + 16, bw + 3, 170, 1, '#8E8C86');
    g.rect(SX + 22, bw - 18, 7, 18, '#E23B2E');
    g.rect(SX + 22, bw - 18, 7, 2, '#F4F1E8');
    g.rect(SX + 23, bw - 22, 5, 4, '#F4F1E8');
    g.rect(SX + 22, bw - 23, 7, 1, '#B8241E');
    // boats in the harbour (still)
    for (const [x, w] of [[96, 14], [132, 18], [168, 12]] as const) {
      g.rect(SX + x, bw + 7, w, 3, '#F4F1E8');
      g.rect(SX + x + 2, bw + 4, 3, 3, '#4A6AB0');
    }
    // the quay and the market's long roof (grey slate), the unloading shed
    g.rect(SX, oy + 72, W, 4, '#B8B4AA');
    g.rect(SX + 20, oy + 66, 92, 8, '#7A8090');
    g.rect(SX + 20, oy + 66, 92, 1, '#A8ACB4');
    for (let x = SX + 24; x < SX + 110; x += 8) g.rect(x, oy + 67, 1, 7, '#6B7186');
    // the gulls stopped in the air at noon (62 8.8)
    if (!nami) for (const [x, y] of [[150, 14], [232, 22], [280, 10]] as const) {
      g.rect(SX + x - 3, oy + y, 3, 1, '#F4F1E8');
      g.rect(SX + x + 1, oy + y, 3, 1, '#F4F1E8');
      g.px(SX + x, oy + y + 1, '#C8CCD4');
    }
    // the far row of the town's roofs (smaller, paler), then the near row below the hill
    for (let i = 0; i < 16; i++) {
      const x = SX + 118 + i * 14 + ((i * 5) % 4);
      if (x > SX + W - 10) break;
      g.rect(x, oy + 68 + (i % 2), 12, 6, i % 3 ? '#6A7488' : '#8A6A52');
      g.rect(x, oy + 68 + (i % 2), 12, 1, '#B8BCC4');
    }
    // the town's roofs below the hill (tiles: grey-blue, a few brown), their ridges
    for (let i = 0; i < 12; i++) {
      const x = SX + 4 + i * 27 + ((i * 7) % 5);
      const y = oy + 76 + ((i * 5) % 7);
      const c = i % 4 === 1 ? '#8A5A3A' : i % 3 ? '#4A5468' : '#5E6478';
      g.rect(x, y, 24, 10, c);
      g.rect(x, y, 24, 1, '#A8ACB4');
      g.rect(x + 2, y + 10, 20, 3, '#E8E4D8');
    }
    // the mikan trees of the terraces in front (dark round leaves), the green fruit
    for (let i = 0; i < 9; i++) {
      const x = SX + i * 40 + ((i * 11) % 9);
      const y = oy + CH - 8 + ((i * 3) % 5);
      g.circle(x, y, 14, '#2E6A3A');
      g.circle(x - 4, y - 5, 7, '#4A8A4A');
      g.rect(x + 3, y - 3, 2, 2, '#6AA04A');
    }
    // しゅん's back on the log bench (left of centre), looking at it
    const bx = SX + W / 2 - 40;
    const by = oy + CH - 22;
    g.rect(bx - 2, by + 14, 28, 4, '#B8885A');
    g.rect(bx + 2, by - 2, 12, 10, '#2A2A30');
    g.rect(bx, by + 7, 16, 9, '#3E8A4E');
    if (knWith()) {
      // グソっ君 beside him (the round grey back of his shell, the feelers)
      g.circle(bx + 30, by + 9, 7, '#8E95A6');
      g.rect(bx + 24, by + 9, 13, 1, '#5E6478');
      g.rect(bx + 24, by + 12, 13, 1, '#5E6478');
      g.line(bx + 27, by + 2, bx + 24, by - 3, '#5E6478');
      g.line(bx + 33, by + 2, bx + 36, by - 3, '#5E6478');
    }
  }
}

function* miharashi(text: string): Co {
  const p = new MiharashiPanel();
  try {
    yield* openPanel(p);
    yield 500;
    yield* say(text);
  } finally {
    yield* closePanel(p);
  }
}

// ================================================================ 台本

/** 1・2 店先の 2人（〔mikan〕・数が ちがう）、6 どっちも。 */
for (const id of [OTTO, TSUMA])
  wrap(id, function* (_ctx, orig): Co {
    if (!mkOpen() || !onMap(UMIZOI) || s08Mid()) {
      yield* orig();
      return;
    }
    if (!flag(MKF.start)) {
      // the usual words first (〔c1〕, or after S08 its line), then the next time 〔mikan〕
      if (!flag(MKF.pre) && !flag('flag_seen_npc_c3_himono_c1')) {
        setFlag(MKF.pre, 1);
        yield* orig();
        return;
      }
      setFlag(MKF.start, 1);
      yield* say(T.MK_A);
      yield* say(T.MK_KAZU);
      return;
    }
    if (flag(MKF.done)) {
      yield* orig();
      return;
    }
    if (cutN() < 3) {
      yield* say(T.MK_MADA);
      return;
    }
    yield* docchi();
  });

/** 6〜7 どっちも・ごほうび。 */
function* docchi(): Co {
  yield* say(T.MK_DOCCHI);
  if (!flag(MKF.miss) && !flag(MKF.soro)) {
    setFlag(MKF.soro, 1);
    yield* say3(T.MK_SOROU);
  }
  setFlag(MKF.done, 1);
  addMp(2);
  addItem(AO_MIKAN);
  addItem(AO_MIKAN);
  se('se_item');
  yield* say3(T.MK_REWARD);
}

/** 食堂かもめの ナミエ（青い みかんを 持って、S08 の あと 1回）。 */
wrap('npc_c3_shokudo', function* (_ctx, orig): Co {
  yield* orig();
  if (inCh3() && !pgOn() && c3Stage() <= 2 && flag('flag_ch3_shokudo_done') && state.inventory.includes(AO_MIKAN) && !flag(MKF.namie)) {
    setFlag(MKF.namie, 1);
    yield* say3(T.MK_NAMIE);
  }
});

registerScript('obj_mk_dan', function* (): Co {
  se('se_examine');
  yield* say3(T.MK_DAN);
});
registerScript('obj_mk_dan_yasumi', function* (): Co {
  se('se_examine');
  yield* say3(T.MK_DAN_YASUMI);
});

registerScript('evt_mk_enter', function* (): Co {
  if (!inCh3()) return;
  yield 300;
  if (c3Stage() >= 2) {
    if (!futariUe() || flag(MKF.c2)) return;
    if (flag(MKF.done)) {
      setFlag(MKF.c2, 1);
      yield* say(T.MK_C2_DONE);
    } else yield* say3(T.MK_C2_MADA);
    return;
  }
  if (!flag(MKF.inn)) {
    setFlag(MKF.inn, 1);
    yield* say3(T.MK_IN);
    if (flag(MKF.start)) yield* say(T.MK_IN_KN);
  }
  if (flag(MKF.done) && kita('npc_ojii') && !flag(MKF.shingo)) yield* shingo();
});

/** かくし：しんごが 下の 畑から 上がって くる（1回）。 */
function* shingo(): Co {
  setFlag(MKF.shingo, 1);
  const id = 'mk_shingo';
  spawn(id, 11, 9, { sprite: 'npc_ojii', dir: 'up', ghost: true });
  yield* walk(id, [[11, 8], [10, 8]], { speed: 1.4, face: 'right' });
  const f = field();
  if (f) f.player.dir = 'left';
  yield* say(T.MK_SHINGO);
  yield* walk(id, [[11, 8], [11, 9]], { speed: 1.4 });
  despawn(id);
}

registerScript('obj_mk_monooki', function* (): Co {
  se('se_examine');
  if (c3Stage() >= 2) {
    yield* say3(T.MK_MONOOKI_C2);
    return;
  }
  if (flag(MKF.start) && !flag(MKF.hasami) && mkOpen()) {
    setFlag(MKF.hasami, 1);
    se('se_item', { vol: 0.5 });
    yield* say3(T.MK_MONOOKI);
    return;
  }
  yield* say3(T.MK_MONOOKI_AGAIN);
});

registerScript('obj_mk_furuki', function* (): Co {
  se('se_examine');
  setFlag(MKF.furuki, 1);
  yield* say(T.MK_FURUKI);
});

registerScript('obj_mk_drum', function* (): Co {
  se('se_examine');
  setFlag(MKF.drum, 1);
  yield* say3(T.MK_DRUM);
});

registerScript('obj_mk_ki', function* (): Co {
  se('se_examine');
  yield* say3(T.MK_KI);
});

/** 4 枝（段ごとに 1本）。 */
registerScript('obj_mk_eda', function* (ctx: ScriptCtx): Co {
  const k = Number(String(ctx.source).replace('obj_mk_eda_', ''));
  se('se_examine');
  if (flag(EDA_F[k])) {
    yield* say3(T.MK_EDA_DONE);
    return;
  }
  if (!flag(MKF.hasami) || !mkOpen()) {
    yield* say3(flag(MKF.hasami) ? T.MK_KI : T.MK_KI_HASAMI);
    return;
  }
  if (!flag(MKF.kazoe) && knWith()) {
    setFlag(MKF.kazoe, 1);
    yield* say(T.MK_KAZOERU);
  }
  const ok = yield* eda(k);
  if (ok && cutN() >= 3 && !flag(MKF.sanbon)) {
    setFlag(MKF.sanbon, 1);
    yield* say(T.MK_SANBON);
  }
});

/** 5 見晴らし（ベンチ）。 */
registerScript('obj_mk_bench', function* (): Co {
  se('se_examine');
  if (c3Stage() >= 2) {
    yield* miharashi(T.MK_MIHARASHI_C2);
    return;
  }
  if (cutN() < 3) {
    yield* say3(T.MK_BENCH);
    return;
  }
  if (!flag(MKF.bench)) {
    setFlag(MKF.bench, 1);
    yield* miharashi(T.MK_MIHARASHI);
    return;
  }
  yield* miharashi(T.MK_MIHARASHI_AGAIN);
});

/** 段階2 の 上の 段の 2人。 */
registerScript('mk_futari', function* (): Co {
  yield* say(flag(MKF.done) ? T.MK_AFTER : T.MK_C2_AGAIN);
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.mikan(step = 'shop', auto = false)（第3章の 段階1、S06 の あと）
 *   'shop'    いつもの 会話の あと、干物屋の ホシオの 前 (17,16) 上向き（話すと〔mikan〕）
 *   'dan'     〔mikan〕の あと、みかん畑の 作業道の 奥 (52,2) 上向き（上へ 歩くと 上の 段）
 *   'in'      上の 段の 南の 石段の 上 (12,8)（入った ときの 1回）
 *   'monooki' 物置の 前 (2,2) 上向き（はさみと かご）
 *   'eda'     はさみの あと、下の 段の 枝の 前 (7,8) 上向き（auto：選んで 切るのを 自動で）
 *   'eda2'    2本 すんだ あと、上の 段の 枝の 前 (8,2) 上向き
 *   'bench'   3本 すんだ あと、ベンチの 前 (11,2) 上向き（見晴らし）
 *   'docchi'  3本 すんだ あと、干物屋の ホシオの 前 (17,16) 上向き
 *   'shingo'  すんだ あと、しんごが 来ていて、町の 作業道 (52,2) 上向き
 *   'namie'   すんだ あと、S08 の あと、食堂かもめの ナミエの 前
 *   'stage2'  段階2、すんだ あと、町の 作業道 (52,2) 上向き
 */
if (import.meta.env.DEV) {
  registerDebug('mikan', (step = 'shop', auto = false) => {
    const s2 = step === 'stage2';
    cmd().jump?.(s2 ? 'ch3:trap' : step === 'namie' ? 'ch3:kaisui' : 'ch3:umizoi', true);
    for (const id of Object.values(MKF)) setFlag(id, 0);
    qaAuto = !!auto;
    setFlag('flag_ch3_stage', s2 ? 2 : 1);
    setFlag('flag_seen_npc_c3_himono_c1', 1);
    if (!flag('flag_ch3_bin_n')) setFlag('flag_ch3_bin_n', 1);
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (step === 'shop') return go(UMIZOI, 17, 16, 'up');
    setFlag(MKF.start, 1);
    if (step === 'dan') return go(UMIZOI, 52, 2, 'up');
    if (step === 'in') return go(MIKAN_UE, 12, 8, 'up');
    setFlag(MKF.inn, 1);
    if (step === 'monooki') return go(MIKAN_UE, 2, 2, 'up');
    setFlag(MKF.hasami, 1);
    if (step === 'eda') return go(MIKAN_UE, 7, 8, 'up');
    setFlag(MKF.kazoe, 1);
    setFlag(MKF.rule, 1);
    setFlag(MKF.eda0, 1);
    setFlag(MKF.eda1, 1);
    if (step === 'eda2') return go(MIKAN_UE, 8, 2, 'up');
    setFlag(MKF.eda2, 1);
    setFlag(MKF.sanbon, 1);
    if (step === 'bench') return go(MIKAN_UE, 11, 2, 'up');
    if (step === 'docchi') return go(UMIZOI, 17, 16, 'up');
    setFlag(MKF.bench, 1);
    setFlag(MKF.done, 1);
    if (step === 'shingo') {
      setFlag('flag_ch3_kita_npc_ojii', 1);
      return go(UMIZOI, 52, 2, 'up');
    }
    if (step === 'namie') {
      addItem(AO_MIKAN);
      setFlag('flag_ch3_shokudo_done', 1);
      return go('map_c3_shokudo', 4, 5, 'up');
    }
    return go(UMIZOI, 52, 2, 'up');
  });

  registerDebug('mkState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(MKF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof EdaPanel) as EdaPanel | undefined;
    const f = field();
    return {
      flags,
      open: mkOpen(),
      door: mkDoor(),
      cut: cutN(),
      aoMikan: state.inventory.filter((i) => i === AO_MIKAN).length,
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      eda: p ? { k: p.k, sel: p.sel, active: p.active, picked: p.picked } : null,
      miharashi: game.ui.widgets.some((w) => w instanceof MiharashiPanel),
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px (names filled in); no 天丼; no clock time; no さん in the narration. */
export function mkTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', '干しすぎ', '干したりない', '落としすぎ', '落としたりん', 'ピッ！', 'あ、つい', 'おかわり、あるよ', 'もう 1杯', 'ほどよいなぁ', '暗くて しめった', '本日も、休館', 'いただきます'];
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
  walkT('mk', T.MK_TEXTS);
  for (const l of [...MK_UI.keys, ...MK_UI.dan, MK_UI.kago(3)]) if (measure(l) > SX + CW - RX - 2) bad.push(`右の 列: ${measure(l)}px: ${l}`);
  if (70 + MK_UI.keys.length * 16 > CH) bad.push('keys: bottom');
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('mkText', () => mkTextCheck());
