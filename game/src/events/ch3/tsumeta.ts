// 穴は、だれかの ごちそうさま（第3章の クリア前、段階2。げむきか 10/28 の 案2、2026-10-28 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_tsumeta.ts、地図の 絵は art/props/tsumeta_art.ts、みました帳の ページは ui/menu/book_tsumeta.ts。
// 新しい 地図・新しい 人は ない（海水浴場に 物を 足す）。
//
//   段階2（12:01）、S13 の あと（flag_ch3_got_gochisou）から S14 の 前まで（flag_ch3_truck_trap が 立ったら 起きない。
//   S14 の 前の「やり残し ないか？」で 乗らない ほうを 選べば 来られる：今の 作り）。段階1 では 起きない（正午の あいだ、
//   子どもたちは 丘の 広場に いる。波に 見せる 城の 貝がらの かざりと まぎれない ように、段階1 の 貝がらは 置かない）。
//   ・監視台の 下の カイト npc_c3_kanshiin (57,28)：グソっ君が いる とき、頭の 上に「！」（addMarkSource。見のがし 対策）。
//     話すと いつもの〔c2〕（はじめの 1回）の あと、浮き輪の 子 npc_c3_kid_c が 港の 岸壁から 浜へ 走って きて〔ana〕
//     （flag_tm_start）。子どもの 歩きは 見える 所から（防波堤から だと 10秒 かかるので、岸壁 (44,25) から）。
//   ・貝がら 3つ obj_tm_kai_1〜3（監視台の まわり (55,28)・(59,29)・(56,30)。案の 5つ → 会議 10-28 で へらして 近くに）：
//     調べると 大写し「穴」の 寄り（TsumePanel 'look'）。穴の あいた 二枚貝 2つ・ふちの 欠けた 貝 1つ（flag_tm_kai_<n>）。
//     3つ 見ると その 場で カイトが「くらべて みよう」→ 大写し「穴」TsumePanel 'cards'：←→ で うたがわしい 者の カード
//     （はさみ・くちばし・波の 石）を えらぶと、右に「もし これなら」の 貝が 出る。決定で くらべる（flag_tm_card_<c>）。
//     形だけで 見くらべる（会議 10-28：色に たよらない。まんまるの 穴 ／ 穴の ない 殻 ／ 割れ ／ 欠け。見た カードには ×）。
//     もどるで やめると 台本は 止まる（見た カードは 残る。カイトに 話すと 続きから）。
//   ・3枚 見たら（flag_tm_kurabe）波打ちぎわの 丸い 巻貝の 殻 obj_tm_tsumeta (61,30) → ツメタガイ → 決めゼリフ →
//     子どもが あやまる → もどす（自動）→ 朱肉 +2、みました帳③の すみ（flag_tm_done）→ 子どもは 防波堤へ もどる。
//   ・かくし：砂の お茶わん obj_tm_chawan (62,30)（〔ana〕の あと。グソっ君が いる とき 1回 flag_tm_chawan）／
//     波に 見せる 城（flag_sr_done）を 済ませて いれば もどす ときに 子どもの 1行（flag_tm_shiro）／
//     カードを 見る 前に 巻貝を 調べると カイトの 1行（flag_tm_saki。進めなく しない）。
//   ・段階2 で 済んだ あと：巻貝は「中は、からっぽ」、貝がらは「もどしてある」。S14 から 先と クリア後は 足さない。
//   ・止まった 正午の 決まりと ぶつけない：12:01 の 浜（波が 動いて いる）だけ。旗を 下ろした カイトの 最後の 見回り。
//
// QA：__game.cmd.tsumeta(step, auto)、tmState()、tmText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
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
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import type { Howto } from '../../ui/closeup';
import * as T from '../../data/text/c3_tsumeta';
import { CARD_ORDER, TM_UI, type Card } from '../../data/text/c3_tsumeta';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { addToMap, c3Stage, inCh3, say3 } from './common';

export const TF = {
  heard: 'flag_tm_heard',
  start: 'flag_tm_start',
  kurabe: 'flag_tm_kurabe',
  saki: 'flag_tm_saki',
  chawan: 'flag_tm_chawan',
  shiro: 'flag_tm_shiro',
  done: 'flag_tm_done',
} as const;

/** 貝がら 3つ（1・2 穴の あいた 二枚貝、3 ふちの 欠けた 貝）。 */
type Kai = 1 | 2 | 3;
const KAI_ORDER: Kai[] = [1, 2, 3];
const KAI_KIND: Record<Kai, 'ana' | 'kake'> = { 1: 'ana', 2: 'ana', 3: 'kake' };
export const kaiF = (n: Kai): string => `flag_tm_kai_${n}`;
export const cardF = (c: Card): string => `flag_tm_card_${c}`;

const UMIZOI = 'map_umizoi';
const KAITO = 'npc_c3_kanshiin';
const KID = 'npc_c3_kid_c';

/** 置き場所（今の 地図で 確かめた：監視台・ロープの 杭・パラソル・人と 重ならない。段階2 の 浜）。 */
const AT = {
  kai: { 1: [55, 28], 2: [59, 29], 3: [56, 30] } as Record<Kai, [number, number]>,
  tsumeta: [61, 30] as [number, number],
  chawan: [62, 30] as [number, number],
};
/** 子どもが 走り だす 所（港の 岸壁）と、カイトの そばの 空いた マス（前から 空いて いる 物）。 */
const KID_FROM: [number, number] = [44, 25];
const KID_SPOTS: [number, number][] = [
  [58, 28],
  [56, 28],
  [58, 29],
  [56, 29],
];

function knWith(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** 遊べる：段階2、S13 の あと、S14 の 前。 */
export function tmOpen(): boolean {
  return inCh3() && !pgOn() && c3Stage() === 2 && flag('flag_ch3_got_gochisou') > 0 && !flag('flag_ch3_truck_trap');
}

/** 調べて いる あいだ（〔ana〕の あと、済む 前）。 */
function looking(): boolean {
  return tmOpen() && flag(TF.start) > 0 && !flag(TF.done);
}

export function tmKaiCount(): number {
  return KAI_ORDER.filter((n) => flag(kaiF(n))).length;
}

export function tmCardCount(): number {
  return CARD_ORDER.filter((c) => flag(cardF(c))).length;
}

/** 話す 人の いない 行を 抜く（グソっ君）。 */
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

/** 地図の 物の flag：立てたら 出し入れを すぐ。 */
function setArt(id: string, v: number): void {
  setFlag(id, v);
  field()?.refreshPresence();
}

// ================================================================ 地図の 物

const OBJ = (o: Record<string, unknown>): MapObj => ({ t: 'obj', ...o }) as unknown as MapObj;
/** 浜に ある あいだ（段階2 の S13〜S14。済んだ あとも その あいだは 残る）。 */
const onBeach = (): boolean => tmOpen();
addToMap(UMIZOI, [
  // the three shells round the lifeguard chair, after 〔ana〕 (none of them alive: only the empty shells)
  ...KAI_ORDER.map((n) =>
    OBJ({ id: `obj_tm_kai_${n}`, x: AT.kai[n][0], y: AT.kai[n][1], flat: true, prop: 'prop_tm_kai', opts: { k: KAI_KIND[n] }, script: 'obj_tm_kai', cond: { when: () => onBeach() && flag(TF.start) > 0 } }),
  ),
  // the round moon-snail shell at the wet edge, and the bowl of sand beside it (after 〔ana〕)
  OBJ({ id: 'obj_tm_tsumeta', x: AT.tsumeta[0], y: AT.tsumeta[1], flat: true, prop: 'prop_tm_tsumeta', script: 'obj_tm_tsumeta', cond: { when: () => onBeach() && flag(TF.start) > 0 } }),
  OBJ({ id: 'obj_tm_chawan', x: AT.chawan[0], y: AT.chawan[1], flat: true, prop: 'prop_tm_chawan', script: 'obj_tm_chawan', cond: { when: () => onBeach() && flag(TF.start) > 0 } }),
]);

// カイトの 頭の 上の「！」（〔ana〕を 言いだせる とき。見のがし 対策：S13 の あと 浜に 来れば 見える）
addMarkSource((f) => {
  if (f.map.id !== UMIZOI || !tmOpen() || flag(TF.start) || !knWith()) return null;
  const a = f.actorById(KAITO);
  return a && a.visible ? actorAnchor(a) : null;
});

// ================================================================ 大写し「穴」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 列（数と キー）。 */
const RX = SX + 206;
const SW = RX - SX - 4;
/** cards：上の 2つの 貝（左：この 穴、右：もし これなら）・下の カードの 列。 */
/** 2つの 貝の 札（場所の テープ「穴」の 下）。 */
const LABEL_Y = 9;
const SHELL_Y = 43;
/** 2つの 貝の まん中の、左右の はしからの 距離。 */
const SHELL_X = 58;
const CARD_Y = 68;
const CARD_W = 56;
const CARD_H = 34;
const CARD_GAP = 10;
/** 会話の あと、決定が きくまで（ms）。 */
const ARM_MS = 400;

const SAND = '#D8C69C';
const SAND_DK = '#C8B488';
const SAND_LT = '#E8DABA';
const SHELL = '#F4F1E8';
const SHELL_DK = '#D8CFC0';
const RIB = '#C0B4A0';
const INK = '#4A3A2E';

export type Look = 'ana' | 'kake' | 'tsumeta' | 'chawan';
type Mode = 'look' | 'cards';
/** 「もし これなら」の 貝の 形。 */
type Mark = 'ana' | 'nashi' | 'ware' | 'kake';
const CARD_MARK: Record<Card, Mark> = { hasami: 'nashi', kuchibashi: 'ware', ishi: 'kake' };

export class TsumePanel implements Widget {
  modal = true;
  closeup = true;
  howto: Howto = T.TM_HOWTO;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  mode: Mode;
  look: Look;
  active = false;
  /** えらんで いる カード（0〜2）。 */
  sel = 0;
  /** 決定で くらべた カード（台本が 読む）。 */
  chosen: Card | null = null;
  private armT = 0;
  private wasActive = false;
  private autoT = 0;

  constructor(mode: Mode, look: Look = 'ana') {
    this.mode = mode;
    this.look = look;
    // the look at one shell is only a picture under the words (nothing to quit)
    if (mode === 'look') this.closeup = false;
  }

  /** もどるで やめられるのは、カードを えらんで いる あいだ（会話の あいだは パネルの 物）。 */
  quittable(): boolean {
    return this.mode === 'cards' && this.active;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.active !== this.wasActive) {
      this.wasActive = this.active;
      this.armT = 0;
    }
    if (!this.active || this.mode !== 'cards') return;
    this.armT += dt;
    const armed = this.armT > ARM_MS;
    let ok = false;
    let lr = 0;
    if (this.auto) {
      this.autoT += dt;
      if (this.autoT > 350) {
        this.autoT = 0;
        // (QA: the first card not yet compared)
        const want = Math.max(0, CARD_ORDER.findIndex((c) => !flag(cardF(c))));
        if (this.sel !== want) lr = want > this.sel ? 1 : -1;
        else ok = true;
      }
    } else {
      ok = armed && input.pressed('confirm');
      lr = (input.pressed('right') ? 1 : 0) - (input.pressed('left') ? 1 : 0);
    }
    if (lr) {
      const n = Math.max(0, Math.min(CARD_ORDER.length - 1, this.sel + lr));
      if (n !== this.sel) {
        this.sel = n;
        se('se_cursor', { vol: 0.4 });
      }
    }
    if (ok) {
      this.chosen = CARD_ORDER[this.sel];
      se('se_examine', { vol: 0.4, pitch: 1.2 });
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
        g.clip(SX, oy, SW, CH, () => (this.mode === 'look' ? this.drawLook(g, oy) : this.drawCards(g, oy)));
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        this.drawSide(g, oy);
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(TM_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, TM_UI.place, { seed: 28 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  /** 12:01 の ぬれた 砂（細かい 粒と、ときどき 寄せる 泡の 線）。 */
  private sand(g: Gfx, oy: number): void {
    g.rect(SX, oy, SW, CH, SAND);
    for (let i = 0; i < 80; i++) g.rect(SX + ((i * 47) % SW), oy + ((i * 31) % CH), 1, 1, i % 3 ? SAND_DK : SAND_LT);
    // the foam's lace drifting over the top edge (the waves move again: 4 s)
    const ph = (this.t % 4000) / 4000;
    const reach = 3 + Math.round(Math.sin(ph * Math.PI) * 5);
    g.alpha(0.4, () => g.rect(SX, oy, SW, reach, '#9AC8DC'));
    for (let x = SX; x < SX + SW; x += 2) g.rect(x, oy + reach + Math.round(Math.sin(x / 9 + this.t / 300)), 2, 1, '#F4F8F8');
  }

  // ---------------------------------------------------------------- look：1つを 大きく

  private drawLook(g: Gfx, oy: number): void {
    this.sand(g, oy);
    const cx = SX + Math.round(SW / 2);
    const cy = oy + 62;
    if (this.look === 'ana' || this.look === 'kake') bivalve(g, cx, cy, 38, 30, this.look);
    else if (this.look === 'tsumeta') snail(g, cx, cy, 30);
    else chawan(g, cx, cy + 6, 46);
  }

  // ---------------------------------------------------------------- cards：穴と くらべる

  private drawCards(g: Gfx, oy: number): void {
    this.sand(g, oy);
    const c = CARD_ORDER[this.sel];
    // the two shells: this hole (left), and what the selected one would leave (right)
    const lx = SX + SHELL_X;
    const rx = SX + SW - SHELL_X;
    const sy = oy + SHELL_Y;
    bivalve(g, lx, sy, 24, 19, 'ana');
    bivalve(g, rx, sy, 24, 19, CARD_MARK[c]);
    if (c === 'hasami') claw(g, rx + 26, sy, 1);
    // the labels over them, and the sign between (≠ once compared, ? before)
    for (const [x, l] of [
      [lx, TM_UI.hontou],
      [rx, TM_UI.moshi],
    ] as [number, string][]) {
      const w = g.measure(l);
      g.rect(x - Math.round(w / 2) - 3, oy + LABEL_Y, w + 6, 14, '#F4ECD8');
      g.text(l, x - Math.round(w / 2), oy + LABEL_Y, { color: INK });
    }
    const mx = SX + Math.round(SW / 2);
    if (flag(cardF(c))) {
      // not equal: two bars and a slash (a shape, not a colour)
      g.rect(mx - 6, sy - 4, 12, 2, INK);
      g.rect(mx - 6, sy + 2, 12, 2, INK);
      g.line(mx + 4, sy - 8, mx - 4, sy + 8, INK);
    } else {
      g.text('？', mx - 6, sy - 7, { color: INK });
    }
    // the three cards; the selected one lifted, a thick frame and a triangle under it
    const total = CARD_ORDER.length * CARD_W + (CARD_ORDER.length - 1) * CARD_GAP;
    const x0 = SX + Math.round((SW - total) / 2);
    CARD_ORDER.forEach((card, i) => {
      const on = i === this.sel;
      const x = x0 + i * (CARD_W + CARD_GAP);
      const y = oy + CARD_Y - (on ? 3 : 0);
      g.rect(x + 2, y + 2, CARD_W, CARD_H, '#9A8A68');
      g.rect(x, y, CARD_W, CARD_H, '#FBF6EA');
      g.frame(x, y, CARD_W, CARD_H, INK);
      if (on) g.frame(x + 1, y + 1, CARD_W - 2, CARD_H - 2, INK);
      const px = x + Math.round(CARD_W / 2);
      const py = y + Math.round(CARD_H / 2);
      if (card === 'hasami') claw(g, px, py, 1.4);
      else if (card === 'kuchibashi') beak(g, px, py);
      else stone(g, px, py);
      if (flag(cardF(card))) {
        // compared: a cross in its top-right corner (it doesn't match; a shape, not a colour)
        const kx = x + CARD_W - 12;
        const ky = y + 3;
        g.line(kx, ky, kx + 8, ky + 8, INK);
        g.line(kx + 1, ky, kx + 9, ky + 8, INK);
        g.line(kx + 8, ky, kx, ky + 8, INK);
        g.line(kx + 9, ky, kx + 1, ky + 8, INK);
      }
      if (on && this.active) {
        const ty = y + CARD_H + 3;
        for (let r = 0; r < 4; r++) g.rect(px - 3 + r, ty + r, 7 - r * 2, 1, INK);
      }
    });
  }

  private drawSide(g: Gfx, oy: number): void {
    const rows: [string, string][] = [];
    rows.push([TM_UI.kai(tmKaiCount()), '#F4ECD8']);
    if (this.mode === 'cards') {
      rows.push([TM_UI.card(tmCardCount()), '#F4ECD8']);
      rows.push([TM_UI.namae[CARD_ORDER[this.sel]], '#FFE7A3']);
    }
    rows.forEach(([l, c], i) => g.text(l, RX, oy + 2 + i * 15, { color: c }));
    if (this.mode !== 'cards' || !this.active) return;
    TM_UI.keys.forEach((l, i) => g.text(l, RX, oy + 64 + i * 15, { color: i === 0 ? '#8A84A0' : '#FFE7A3' }));
  }
}

// ---------------------------------------------------------------- 絵（大写しの 中）

/**
 * 白い 二枚貝（上に 蝶番、すじが 放射に）。mark：ana まんまるの 小さな 穴・nashi 穴の ない 殻・
 * ware 割れ（ぎざぎざの すじと、欠けた かけら）・kake ふちが 欠けた。
 */
function bivalve(g: Gfx, cx: number, cy: number, rx: number, ry: number, mark: Mark): void {
  const top = cy - ry;
  const half = (d: number) => {
    const k = d / ry;
    const w = rx * Math.sqrt(Math.max(0, 1 - k * k));
    // narrower towards the hinge
    return Math.round(d < 0 ? w * (1 + k * 0.45) : w);
  };
  // its shadow, then the shell
  for (let d = -ry; d <= ry; d++) {
    const hw = half(d);
    g.rect(cx - hw + 2, cy + d + 2, hw * 2, 1, '#B09C70');
  }
  for (let d = -ry; d <= ry; d++) {
    const hw = half(d);
    g.rect(cx - hw, cy + d, hw * 2, 1, d > ry * 0.6 ? SHELL_DK : SHELL);
  }
  // the ribs fanning out from the hinge, the growth lines across
  for (let i = -3; i <= 3; i++) g.line(cx, top + 2, cx + Math.round((i * rx) / 3.6), cy + ry - 2, RIB);
  for (const f of [0.25, 0.6]) {
    const d = Math.round(ry * f);
    const hw = half(d) - 2;
    g.rect(cx - hw, cy + d, hw * 2, 1, RIB);
  }
  g.rect(cx - 3, top, 6, 3, SHELL_DK);
  const hy = cy - Math.round(ry * 0.15);
  if (mark === 'ana') {
    // the one small round hole, clean-edged (the sand seen through it)
    const r = Math.max(2, Math.round(rx / 9));
    g.circle(cx, hy, r + 1, RIB);
    g.circle(cx, hy, r, '#6A5640');
    g.circle(cx - 1, hy - 1, Math.max(1, r - 2), SAND_DK);
  } else if (mark === 'ware') {
    // cracked: a jagged line from the hinge down, a piece broken out at the rim
    let x = cx;
    let y = top + 3;
    for (let i = 0; i < 6; i++) {
      const nx = x + (i % 2 ? -4 : 5);
      const ny = y + Math.round((ry * 2 - 6) / 6);
      g.line(x, y, nx, ny, INK);
      x = nx;
      y = ny;
    }
    const by = cy + ry - 1;
    for (let r = 0; r < 6; r++) g.rect(cx + 2 + r, by - 5 + r, 10 - r, 1, SAND);
    g.line(cx + 2, by - 6, cx + 12, by - 1, INK);
  } else if (mark === 'kake') {
    // chipped: a ragged notch bitten out of the rim (no hole)
    const nx = cx + Math.round(rx * 0.55);
    const ny = cy + Math.round(ry * 0.55);
    for (let r = -4; r <= 4; r++) g.rect(nx - 4 + Math.abs(r), ny + r, 12 - Math.abs(r), 1, SAND);
    for (let r = -4; r <= 4; r += 2) g.rect(nx - 5 + Math.abs(r), ny + r, 2, 1, RIB);
  }
}

/** 丸い 巻貝の 殻（ツメタガイ：低い 巻き、大きな 体層、つるっと した ひかり。中は からっぽ）。 */
function snail(g: Gfx, cx: number, cy: number, r: number): void {
  g.circle(cx + 3, cy + 3, r, '#B09C70');
  g.circle(cx, cy, r, '#B89A7A');
  g.circle(cx - 3, cy - 2, r - 5, '#CDB090');
  // the coil: two rings getting smaller towards the low spire
  g.ring(cx + 4, cy - 2, Math.round(r * 0.5), '#9A7C5E');
  g.ring(cx + 6, cy - 3, Math.round(r * 0.22), '#9A7C5E');
  g.circle(cx + 7, cy - 3, 2, '#8A6C50');
  // the empty opening at the bottom, dark
  for (let d = 0; d < 6; d++) g.rect(cx - 10 + d, cy + r - 9 + d, 22 - d * 2, 1, '#5A4636');
  // the shine (wet, smooth)
  g.rect(cx - 14, cy - 14, 6, 2, '#FFF6E8');
  g.rect(cx - 16, cy - 11, 3, 3, '#F4E4D0');
}

/** 砂の お茶わん（ふせた お茶わんの ような 砂の 輪。真ん中は へこむ）。 */
function chawan(g: Gfx, cx: number, cy: number, rx: number): void {
  const ry = Math.round(rx * 0.42);
  for (let d = -ry; d <= ry; d++) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (d / (ry + 0.5)) ** 2)));
    g.rect(cx - hw, cy + d, hw * 2, 1, d < 0 ? '#C8B488' : '#B8A47C');
  }
  const iy = Math.round(ry * 0.55);
  const ix = Math.round(rx * 0.55);
  for (let d = -iy; d <= iy; d++) {
    const hw = Math.round(ix * Math.sqrt(Math.max(0, 1 - (d / (iy + 0.5)) ** 2)));
    g.rect(cx - hw, cy + d - 2, hw * 2, 1, d < 0 ? '#A89468' : SAND);
  }
  // the grains set hard on its rim
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    g.rect(cx + Math.round(Math.cos(a) * (rx - 4)), cy + Math.round(Math.sin(a) * (ry - 2)), 1, 1, '#E8DABA');
  }
}

/** カニの はさみ（2本ゆび：上の 動く ゆびと 下の 動かない ゆび。右へ 口を 開ける）。s は 大きさ。 */
function claw(g: Gfx, cx: number, cy: number, s: number): void {
  const c = '#C85A3A';
  const dk = '#8A3A26';
  const u = (n: number) => Math.max(1, Math.round(n * s));
  // the palm: a rounded block, the joint at its back
  g.rect(cx - u(10), cy - u(4), u(9), u(9), c);
  g.rect(cx - u(9), cy - u(5), u(7), 1, c);
  g.rect(cx - u(9), cy + u(5), u(7), 1, dk);
  g.rect(cx - u(13), cy - u(2), u(3), u(5), dk);
  // the upper (moving) finger: out and up, its tip hooked down; the lower (fixed) one straight out, its tip
  // turned up — the mouth open between them (a V lying on its side)
  const len = u(10);
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const th = Math.max(1, Math.round(u(3) * (1 - t * 0.6)));
    g.rect(cx - u(2) + i, cy - u(4) - Math.round(t * u(4)), 1, th, c);
    g.rect(cx - u(2) + i, cy + u(1), 1, th, c);
  }
  g.rect(cx - u(2) + len - 1, cy - u(8) + 1, u(2), u(2), dk);
  g.rect(cx - u(2) + len - 1, cy, u(2), u(1), dk);
  // little teeth on the inner edges
  for (let i = 1; i < 4; i++) {
    g.rect(cx + i * u(2), cy - u(4) - Math.round((i * u(2) + u(2)) / len * u(4)) + u(2), 1, 1, dk);
    g.rect(cx + i * u(2), cy + u(1) - 1, 1, 1, dk);
  }
}

/** カモメの 頭と くちばし（横から。くちばしは 先の とがった 三角）。 */
function beak(g: Gfx, cx: number, cy: number): void {
  g.circle(cx + 6, cy - 2, 8, '#F4F4F0');
  g.ring(cx + 6, cy - 2, 8, '#8A8A90');
  g.circle(cx + 4, cy - 4, 1, INK);
  for (let i = 0; i < 14; i++) g.rect(cx - 2 - i, cy - 2 + Math.round(i * 0.2), 1, Math.max(1, 4 - Math.round(i * 0.25)), '#E8B83A');
  g.rect(cx - 13, cy + 1, 2, 1, '#C84A3A');
}

/** 波の 石（まるい 灰色の 石と、ぬれた ひかり）。 */
function stone(g: Gfx, cx: number, cy: number): void {
  for (let d = -9; d <= 9; d++) {
    const hw = Math.round(15 * Math.sqrt(Math.max(0, 1 - (d / 9.5) ** 2)));
    g.rect(cx - hw, cy + d, hw * 2, 1, d > 4 ? '#6A6A72' : '#8A8A90');
  }
  g.rect(cx - 8, cy - 6, 7, 2, '#B0B0B8');
}

function* openPanel(p: TsumePanel): Co {
  game.ui.push(p);
  se('se_examine', { vol: 0.4, pitch: 0.9 });
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: TsumePanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;

// ================================================================ 浮き輪の 子（港の 岸壁から 浜へ）

/** 走って 来た 子ども（もとの 所に もどすため）。 */
let came: { a: Actor; x: number; y: number; dir: Actor['dir'] } | null = null;

function kidSpot(): [number, number] | null {
  const f = field();
  if (!f) return null;
  const busy = new Set<string>();
  for (const a of [f.player, f.follower, ...f.actors]) if (a && a.visible && a.id !== KID) busy.add(`${a.tileX},${a.tileY}`);
  return KID_SPOTS.find(([x, y]) => !busy.has(`${x},${y}`)) ?? null;
}

/** 子どもが カイトの そばに いる（前に 来た まま）。 */
function kidNear(): boolean {
  const a = field()?.actorById(KID);
  return !!a && a.visible && a.tileX >= 55 && a.tileX <= 60 && a.tileY >= 27 && a.tileY <= 30;
}

/** 港の 岸壁から 走って きて、カイトの ほうを 向く（着くまで 待つ。長くても 4秒）。 */
function* kidCome(): Co {
  const f = field();
  const a = f?.actorById(KID);
  if (!f || !a || kidNear()) return;
  const to = kidSpot();
  if (!to) return;
  // (a map reload since: the remembered one is gone, this is the child at her own place again)
  if (!came || !f.actors.includes(came.a)) came = { a, x: a.x, y: a.y, dir: a.dir };
  a.data.scripted = true;
  a.x = KID_FROM[0] * 16 + 8;
  a.y = KID_FROM[1] * 16 + 16;
  let arrived = false;
  game.scripts.run(
    (function* (): Co {
      yield* walk(KID, [[to[0], KID_FROM[1]], to], { speed: 5 });
      arrived = true;
    })(),
  );
  for (let t = 0; !arrived && t < 4000; t += 100) yield 100;
  const k = f.actorById(KAITO);
  if (k) faceToward(a, k);
}

/**
 * 防波堤の もとの 所へ（岸壁を 通って、走って もどる）。台本に しない（しゅんを 止めない：actor の path だけ。
 * 着いた 所が もとの マス。向きは 次に 地図に 入った とき もとに もどる）。
 */
function kidBack(): void {
  const c = came;
  came = null;
  if (!c || !field()?.actors.includes(c.a)) return;
  const a = c.a;
  const px = (x: number, y: number): [number, number] => [x * 16 + 8, y * 16 + 16];
  a.pathSpeed = 4 * 16;
  a.path.push(px(a.tileX, KID_FROM[1]), px(KID_FROM[0], KID_FROM[1]), [KID_FROM[0] * 16 + 8, c.y], [c.x, c.y]);
}

// ================================================================ 台本

/** 1〔ana〕：子どもが 走って くる。 */
function* intro(): Co {
  const f = field();
  const k = f?.actorById(KAITO);
  setFlag(TF.start, 1);
  yield* kidCome();
  if (f && k) faceToward(k, f.actorById(KID) ?? f.player);
  yield* say(T.TM_A);
  if (f && k) faceToward(k, f.player);
  field()?.refreshPresence();
}

/** 2 貝がらを 1つ 見る（大写しの 寄り）。3つ 見たら その 場で くらべる。 */
function* lookKai(n: Kai): Co {
  const kind = KAI_KIND[n];
  const holed = KAI_ORDER.filter((m) => KAI_KIND[m] === 'ana' && flag(kaiF(m))).length;
  const p = new TsumePanel('look', kind);
  try {
    yield* openPanel(p);
    setFlag(kaiF(n), 1);
    yield 250;
    yield* say(kind === 'kake' ? T.TM_KAI.kake : holed === 0 ? T.TM_KAI.ana1 : T.TM_KAI.ana2);
  } finally {
    yield* closePanel(p);
  }
  if (tmKaiCount() >= 3 && !flag(TF.kurabe)) yield* kurabe(true);
}

/** 3 うたがわしい 者（大写し）。first は 3つ目の 貝がらの すぐ あと（カイトの 1行から）。 */
function* kurabe(first: boolean): Co {
  if (first || !tmCardCount()) yield* say3(T.TM_KURABE);
  const p = new TsumePanel('cards');
  p.auto = qaAuto;
  p.sel = Math.max(0, CARD_ORDER.findIndex((c) => !flag(cardF(c))));
  try {
    yield* openPanel(p);
    while (tmCardCount() < CARD_ORDER.length) {
      p.chosen = null;
      p.active = true;
      while (!p.chosen) yield null;
      p.active = false;
      const c: Card = p.chosen;
      const again = flag(cardF(c)) > 0;
      setFlag(cardF(c), 1);
      yield 250;
      if (!again) yield* say(T.TM_CARD[c]);
    }
    yield 300;
  } finally {
    yield* closePanel(p);
  }
  setFlag(TF.kurabe, 1);
  yield* say3(T.TM_SHITA);
}

/** 4〜6 砂の 中の 犯人 → もどす → ごほうび。 */
function* hannin(): Co {
  const p = new TsumePanel('look', 'tsumeta');
  game.scripts.run(kidCome());
  try {
    yield* openPanel(p);
    yield 250;
    // (the child's line is near the end: by then she has come)
    yield* say(T.TM_TSUMETA);
  } finally {
    yield* closePanel(p);
  }
  if (flag('flag_sr_done') && !flag(TF.shiro)) {
    setFlag(TF.shiro, 1);
    yield* say3(T.TM_SHIRO);
  }
  se('se_examine', { vol: 0.35, pitch: 1.3 });
  yield* say3(T.TM_MODOSU);
  setArt(TF.done, 1);
  addMp(2);
  se('se_item');
  yield* say3(T.TM_REWARD);
  kidBack();
}

/** 1 監視台の 下の カイト（段階2）。 */
wrap(KAITO, function* (_ctx, orig): Co {
  if (tmOpen() && onMap(UMIZOI) && !flag(TF.done)) {
    if (!flag(TF.start)) {
      if (!knWith()) {
        yield* orig();
        return;
      }
      // the usual 〔c2〕 the first time, then the child comes running at once (the 「！」 promised something)
      if (!flag(TF.heard)) {
        yield* orig();
        setFlag(TF.heard, 1);
        yield 200;
      }
      yield* intro();
      return;
    }
    if (tmKaiCount() < 3) yield* say3(T.TM_WAIT);
    else if (!flag(TF.kurabe)) yield* kurabe(false);
    else yield* say3(T.TM_WAIT2);
    return;
  }
  yield* orig();
});

registerScript('obj_tm_kai', function* (ctx: ScriptCtx): Co {
  const n = KAI_ORDER.find((m) => `obj_tm_kai_${m}` === String(ctx.source));
  if (!n) return;
  se('se_examine');
  if (flag(TF.done)) {
    yield* say3(KAI_KIND[n] === 'kake' ? T.TM_KAKE_ATO : T.TM_KAI_ATO);
    return;
  }
  if (!looking()) {
    yield* say3(KAI_KIND[n] === 'kake' ? T.TM_KAI.kake.split('\n@')[0] : T.TM_KAI.ana1);
    return;
  }
  if (flag(kaiF(n)) && tmKaiCount() < 3) {
    yield* say3(T.TM_KAI_MITA);
    return;
  }
  if (flag(kaiF(n))) {
    // (all three seen: the comparing again from here, like talking to カイト)
    if (!flag(TF.kurabe)) yield* kurabe(false);
    else yield* say3(T.TM_WAIT2);
    return;
  }
  yield* lookKai(n);
});

registerScript('obj_tm_tsumeta', function* (): Co {
  se('se_examine');
  if (flag(TF.done)) {
    yield* say3(T.TM_TSUMETA_ATO);
    return;
  }
  if (!looking()) return;
  if (!flag(TF.kurabe)) {
    if (!flag(TF.saki)) {
      setFlag(TF.saki, 1);
      yield* say3(T.TM_TSUMETA_LOOK);
      yield* say3(T.TM_SAKI);
    } else yield* say3(T.TM_TSUMETA_LOOK);
    return;
  }
  yield* hannin();
});

registerScript('obj_tm_chawan', function* (): Co {
  se('se_examine');
  if (!flag(TF.chawan) && tmOpen() && knWith()) {
    setFlag(TF.chawan, 1);
    const p = new TsumePanel('look', 'chawan');
    try {
      yield* openPanel(p);
      yield 250;
      yield* say(T.TM_CHAWAN);
    } finally {
      yield* closePanel(p);
    }
    return;
  }
  yield* say3(T.TM_CHAWAN_ATO);
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.tsumeta(step = 'start', auto = false)（第3章の 段階2、S13 の あと）
 *   'start'    監視台の 下の カイト (57,28) の 前 (57,29) 上向き（「！」。話すと〔c2〕→ 子どもが 走って くる〔ana〕）
 *   'far'      同じ、浜の 入り口 (53,24)（遠くから「！」が 見えるか）
 *   'kai1'・'kai2'・'kai3'  〔ana〕の あと、貝がらの 所（(55,28)・(59,29) に 立つ、(56,30) の 上 (56,29) 下向き）
 *   'kurabe'   貝がら 2つ 見た あと、3つ目 (56,30) の 前 (56,29) 下向き（見ると その 場で くらべる）
 *   'tsumeta'  カードの あと、巻貝の 前 (61,29) 下向き（→ 決めゼリフ → もどす → ごほうび）
 *   'saki'     〔ana〕の あと 何も 見ずに、巻貝の 前 (61,29) 下向き（かくしの 1行）
 *   'chawan'   〔ana〕の あと、砂の お茶わんの 前 (62,29) 下向き（かくし）
 *   'done'     済んだ あと、巻貝の 前 (61,29) 下向き
 *   sr = true で 波に 見せる 城を 済ませて いる（もどす ときの かくし）
 */
if (import.meta.env.DEV) {
  registerDebug('tsumeta', (step = 'start', auto = false, sr = false) => {
    cmd().jump?.('ch3:trap', true);
    for (const id of Object.values(TF)) setFlag(id, 0);
    for (const n of KAI_ORDER) setFlag(kaiF(n), 0);
    for (const c of CARD_ORDER) setFlag(cardF(c), 0);
    qaAuto = !!auto;
    setFlag('flag_ch3_stage', 2);
    setFlag('flag_sr_done', sr ? 1 : 0);
    const go = (x: number, y: number, d: string) => {
      cmd().warp?.(UMIZOI, x, y, d);
      field()?.refreshPresence();
    };
    if (step === 'start') return go(57, 29, 'up');
    if (step === 'far') return go(53, 24, 'down');
    setFlag(TF.heard, 1);
    setFlag(TF.start, 1);
    if (step === 'kai1') return go(55, 28, 'down');
    if (step === 'kai2') return go(59, 29, 'down');
    if (step === 'kai3') return go(56, 29, 'down');
    if (step === 'saki') return go(61, 29, 'down');
    if (step === 'chawan') return go(62, 29, 'down');
    setFlag(kaiF(1), 1);
    setFlag(kaiF(2), 1);
    if (step === 'kurabe') return go(56, 29, 'down');
    setFlag(kaiF(3), 1);
    for (const c of CARD_ORDER) setFlag(cardF(c), 1);
    setFlag(TF.kurabe, 1);
    if (step === 'tsumeta') return go(61, 29, 'down');
    setFlag(TF.done, 1);
    return go(61, 29, 'down');
  });

  registerDebug('tmState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(TF)) flags[k] = flag(id);
    for (const n of KAI_ORDER) flags[`kai_${n}`] = flag(kaiF(n));
    for (const c of CARD_ORDER) flags[`card_${c}`] = flag(cardF(c));
    const p = game.ui.widgets.find((w) => w instanceof TsumePanel) as TsumePanel | undefined;
    const f = field();
    const kid = f?.actorById(KID);
    return {
      flags,
      open: tmOpen(),
      looking: looking(),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      kid: kid ? [kid.tileX, kid.tileY] : null,
      panel: p ? { mode: p.mode, look: p.look, sel: p.sel, active: p.active } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no 天丼; no clock time; no さん in the narration. */
export function tmTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', 'ピッ！', 'あ、つい', 'おかわり、あるよ', 'もう 1杯', 'ほどよいなぁ', '暗くて しめった', '干しすぎ', 'ダンゴムシ', 'てっぺん', '悪い 貝', '%'];
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
  walkT('tm', T.TM_TEXTS);
  // the right column: every label fits between RX and the panel's inner edge
  const col = SX + CW - RX - 2;
  const labels = [...TM_UI.keys, TM_UI.kai(3), TM_UI.card(3), ...Object.values(TM_UI.namae)];
  for (const l of labels) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  // the two labels over the shells keep apart, the cards stay inside the scene
  if (measure(TM_UI.hontou) / 2 + measure(TM_UI.moshi) / 2 + 12 > SW - SHELL_X * 2) bad.push('札: 重なる');
  for (const l of [TM_UI.hontou, TM_UI.moshi]) if (SHELL_X - measure(l) / 2 - 3 < 0) bad.push(`札: はみ出す ${measure(l)}px: ${l}`);
  const total = CARD_ORDER.length * CARD_W + (CARD_ORDER.length - 1) * CARD_GAP;
  if (total > SW - 8) bad.push(`カード: 幅 ${total} > ${SW - 8}`);
  if (CARD_Y + CARD_H + 8 > CH) bad.push(`カード: 下 ${CARD_Y + CARD_H + 8} > ${CH}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('tmText', () => tmTextCheck());
