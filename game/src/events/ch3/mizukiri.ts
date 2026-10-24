// 低う、平たく（第3章の クリア前、段階1。げむきか 10/22 の 案1、2026-10-22 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_mizukiri.ts、新しい 地図は data/maps/c3_koishi.ts（小石の 浜）、絵は art/props/mizukiri_art.ts、
// みました帳の ページは ui/menu/book_mizukiri.ts。
//
//   段階1（正午）、S06 の あと（flag_ch3_kids）から S12 の ナリオサメの 前まで。段階2（S13〜S14）も 浜には 入れる。
//   S15 から 先と クリア後は 足さない（石段も 出ない）。
//   ・空き地の 子ども npc_c3_kid_a (6,6)：いつもの 会話の あと（flag_seen_npc_c3_kid_c1）、2回目に〔mizukiri〕（flag_mz_start）。
//   ・灯台の 台座の テル (9,30)：〔hama〕（flag_mz_hama）→ テルは 小石の 浜の テルの 岩へ（S09 の 途中は 出さない・台座に いる）。
//   ・岸壁の 西の はしの 岩 (1,25)：石段（目印は 段の 上の 平たい 石の 石積み）→ map_c3_koishi (22,4)。
//   ・浜：平たい 石の 光る 点 3つ（KOISHI_SPOTS の どれか。ひろうと 次の 空いた 所へ）。持てるのは 3つ（flag_mz_hold）。
//     はじめて ひろった あと 1回、テルが 投げる（flag_mz_demo）：鏡の 海に 輪が 9つ、止まって 残る。子ども 3人が
//     走って くる（flag_mz_kids）。
//   ・波打ちぎわから 海を 調べる → 大写し「水切り」MizukiriPanel：決定を 押さえると 腰が 落ちる（目盛りは 大写しの
//     右の 列の 上＝画面の 上の 横。指で 隠れない）、はなすと 投げる。跳ねる 数は 石の 形（うすい・ふつう・ぶあつい）と
//     はなした 高さで 0〜9。跳ねた 所に 輪が 止まって 残る（浜を 出るまで。多すぎる ときは 古い 物から 消す：RING_MAX）。
//   ・しゅんの 1回目の あと 1回、グソっ君の 番（flag_mz_kn）。3回 投げた あと テルに 話す → 押し返して くれる（flag_mz_done）。
//   ・段階2：波が 寄せている（輪は 波で 沖へ 流れて 消える）。跳ねる 数は 少し 減る（いちばん 下の 帯でも 6まで）。
//   ・かくし：9回（flag_mz_nine）。グソっ君の 番の あと もう一度 グソっ君に 話す（flag_mz_naze）。段階2 の 灯台の テル
//     （flag_mz_c2）と 防波堤の ミナト（flag_mz_minato。ミナトの 台詞は 変えない、地の文 1行）。
//
// QA：__game.cmd.mizukiri(step, auto, band)、mzState()、mzText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { despawn, pose, registerScript, spawn, walk } from '../../world/api';
import { fxAt, registerWorldFx } from '../../world/fx';
import { getMapDef, registerMap } from '../../world/maps';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { SPEAKERS } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/c3_mizukiri';
import { MZ_UI } from '../../data/text/c3_mizukiri';
import { KOISHI, KOISHI_SPOTS } from '../../data/maps/c3_koishi';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { addToMap, c3Stage, inCh3, say3 } from './common';
import { teruInside } from '../../data/maps/umizoi';

export const MF = {
  start: 'flag_mz_start',
  hama: 'flag_mz_hama',
  inn: 'flag_mz_in',
  in2: 'flag_mz_in2',
  hold: 'flag_mz_hold',
  demo: 'flag_mz_demo',
  kids: 'flag_mz_kids',
  rule: 'flag_mz_rule',
  n: 'flag_mz_n',
  n1: 'flag_mz_n1',
  kn: 'flag_mz_kn',
  naze: 'flag_mz_naze',
  nine: 'flag_mz_nine',
  nami: 'flag_mz_nami',
  best: 'flag_mz_best',
  wa: 'flag_mz_wa',
  done: 'flag_mz_done',
  back: 'flag_mz_back',
  c2: 'flag_mz_c2',
  minato: 'flag_mz_minato',
} as const;

/** 光る 点 3つの 今の 所（KOISHI_SPOTS の 番号 + 1。0 は はじめの 所）。 */
const slotF = (k: number) => `flag_mz_slot_${k}`;
const UMIZOI = 'map_umizoi';
const TERU = 'npc_c3_toudai';
const KIDS = ['npc_c3_kid_a', 'npc_c3_kid_b', 'npc_c3_kid_c'];
/** 浜で 子どもが 見ている 所（東の はし。着く 石段 (22,4) の 道は あける）。 */
const KID_AT: [number, number][] = [
  [19, 3],
  [20, 2],
  [21, 3],
];
/** テルの 岩（すわる 所）。 */
const TERU_AT: [number, number] = [5, 4];
/** 残る 輪の 上限（スマホに 負担を かけない。古い 物から 消す）。 */
export const RING_MAX = 27;

SPEAKERS.c3_kodomotachi = { name: '子どもたち', voice: 'c3_kid' };

function knWith(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** S09 の 途中（テルは 台座・灯台の 部屋で レンズの 用）。 */
function s09Mid(): boolean {
  return flag('flag_ch3_kaisui_start') > 0 && !flag('flag_ch3_umi_done');
}

/** 寄り道が 開いている（段階1）：S06 の あと、ナリオサメの 前。 */
export function mzOpen(): boolean {
  return inCh3() && !pgOn() && c3Stage() === 1 && flag('flag_ch3_kids') > 0 && !flag('flag_ch3_nariosame_beaten');
}

/** 浜へ 行ける：段階1〜2（S14 の トラックの あとは 行けない）。 */
export function mzDoor(): boolean {
  return inCh3() && !pgOn() && (c3Stage() === 1 || c3Stage() === 2) && flag('flag_ch3_kids') > 0 && !flag('flag_ch3_truck_trap');
}

/** テルが 浜の 岩に いる。 */
export function teruBeach(): boolean {
  return flag(MF.hama) > 0 && !flag(MF.back) && c3Stage() === 1 && inCh3() && !s09Mid();
}

/** 浜に 子どもが いる（テルが 投げた あと、段階1）。 */
function kidsBeach(): boolean {
  return flag(MF.kids) > 0 && c3Stage() === 1 && inCh3();
}

/** 話す 人の いない 行を 抜く（グソっ君。浜では テル・子どもも）。 */
function trim(text: string): string {
  const beach = onMap(KOISHI);
  const drop = (who: string) =>
    (who === 'npc_kanenari' && !knWith()) ||
    (beach && who === TERU && !teruBeach()) ||
    (beach && (who.startsWith('npc_c3_kid') || who === 'c3_kodomotachi') && !kidsBeach());
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

addToMap(UMIZOI, [
  // the stone steps cut in the rock at the quay's west end (and their marker), only while they lead somewhere
  { t: 'prop', prop: 'prop_mz_dan', x: 1, y: 25, opts: { side: 'umizoi' }, cond: { when: mzDoor } } as unknown as MapObj,
  { t: 'door', id: 'door_c3_koishi', x: 1, y: 25, to: KOISHI, tx: 22, ty: 4, dir: 'left', se: 'se_step_stone', cond: { when: mzDoor } } as unknown as MapObj,
]);

// テル on the plinth is away at the beach while it is on
{
  const def = getMapDef(UMIZOI);
  if (def) {
    for (const o of def.objects) {
      const n = o as { t: string; id?: string; x: number; y: number; cond?: Record<string, unknown> };
      if (n.t === 'npc' && n.id === TERU && n.x === 9 && n.y === 30) {
        const prev = n.cond ?? {};
        const when = prev.when as (() => boolean) | undefined;
        n.cond = { ...prev, when: () => (!when || when()) && !teruBeach() };
      }
    }
    registerMap(def);
  }
}

/** 光る 点が 今 ある 所の 番号（3つ）。 */
function slots(): number[] {
  return [0, 1, 2].map((k) => (flag(slotF(k)) ? flag(slotF(k)) - 1 : k));
}

const NPC = (o: Record<string, unknown>): MapObj => ({ t: 'npc', ...o }) as unknown as MapObj;
addToMap(KOISHI, [
  // the flat stones' glints (one prop and one examine per place; three are out at a time)
  // (their pictures, the flat stones and the glint, are drawn by the world fx below: they move when one is picked up)
  ...KOISHI_SPOTS.map(([x, y], i) => ({ t: 'obj', id: `obj_mz_ishi_${i}`, x, y, flat: true, script: 'obj_mz_ishi', cond: { when: () => slots().includes(i) } }) as unknown as MapObj),
  // round stones, the big one, the rails, テルの 岩
  { t: 'prop', prop: 'prop_mz_maru', x: 3, y: 6 } as unknown as MapObj,
  { t: 'obj', id: 'obj_mz_maru', x: 3, y: 6, flat: true, script: 'obj_mz_maru' } as unknown as MapObj,
  { t: 'prop', prop: 'prop_mz_maru', x: 14, y: 3 } as unknown as MapObj,
  { t: 'obj', id: 'obj_mz_maru_2', x: 14, y: 3, flat: true, script: 'obj_mz_maru' } as unknown as MapObj,
  { t: 'obj', id: 'obj_mz_ooki', x: 1, y: 3, script: 'obj_mz_ooki' } as unknown as MapObj,
  { t: 'obj', id: 'obj_mz_reiru', x: 16, y: 2, w: 2, h: 4, flat: true, script: 'obj_mz_reiru' } as unknown as MapObj,
  { t: 'obj', id: 'obj_mz_iwa', x: 4, y: 4, w: 2, script: 'obj_mz_iwa', cond: { when: () => !teruBeach() } } as unknown as MapObj,
  // the sea, from the water's edge
  { t: 'obj', id: 'obj_mz_umi', x: 0, y: 8, w: 24, face: 'down', script: 'obj_mz_umi' } as unknown as MapObj,
  // テル on her rock, the three children at the east end
  NPC({ id: 'mz_teru', sprite: TERU, x: TERU_AT[0], y: TERU_AT[1], dir: 'down', pose: 'sit', off: [0, -7], script: 'mz_teru', cond: { when: teruBeach } }),
  ...KIDS.map((id, i) => NPC({ id: `mz_kid_${i}`, sprite: id, x: KID_AT[i][0], y: KID_AT[i][1], dir: 'left', script: 'mz_kid', cond: { when: kidsBeach } })),
]);

// ================================================================ 鏡の 海に 止まる 輪（浜を 出るまで 残る）

interface Ring {
  x: number;
  y: number;
  /** 出た とき（ms、f.t）。 */
  t: number;
  /** 段階2：波で 流れて 消える。 */
  nami: boolean;
}
let rings: Ring[] = [];
/** この 浜で 残した 輪の 数（帳面の「きょうの 輪」）。 */
let visitRings = 0;
/** 跳ねて いる 石（なければ null）。 */
let skip: { x: number; y: number; n: number; t: number; dir: number; done: boolean; pochan: boolean } | null = null;
const SKIP_MS = 170;

function addRing(x: number, y: number, now: number): void {
  rings.push({ x, y, t: now, nami: c3Stage() >= 2 });
  while (rings.length > RING_MAX) rings.shift();
}

/** 跳ねる 点の 位置（k 番目）。 */
function skipAt(s: { x: number; y: number; dir: number }, k: number): [number, number] {
  // the first skips long, then shorter and shorter, the line bending a little
  let d = 0;
  for (let i = 0; i < k; i++) d += Math.max(5, 13 - i * 1.1);
  return [s.x + s.dir * (k * 1.6 + k * k * 0.35), s.y + 10 + d];
}

/** 石が 跳ねて いく（n 回。終わるまで 待つ）。 */
function* throwStone(x: number, y: number, n: number): Co {
  const f = field();
  if (!f) return;
  skip = { x, y, n, t: 0, dir: Math.random() < 0.5 ? -1 : 1, done: false, pochan: false };
  while (skip && !skip.done) yield null;
  skip = null;
}

registerWorldFx({
  map: KOISHI,
  anchored: true,
  update(f, dt) {
    if (skip && !skip.done) {
      const before = Math.floor(skip.t / SKIP_MS);
      skip.t += dt;
      const now = Math.floor(skip.t / SKIP_MS);
      for (let k = before + 1; k <= now; k++) {
        if (k <= skip.n) {
          const [x, y] = skipAt(skip, k - 1);
          addRing(x, y, f.t);
          if (c3Stage() < 2) visitRings++;
          se('se_tsuri_pochan', { vol: 0.18, pitch: 1.9 - k * 0.05 });
        } else if (!skip.pochan) {
          skip.pochan = true;
          se('se_tsuri_pochan', { vol: 0.35 });
        }
      }
      if (skip.t > (skip.n + 1.6) * SKIP_MS) skip.done = true;
    }
    // stage 2: the waves carry the rings out and they fade
    rings = rings.filter((r) => !r.nami || f.t - r.t < 2600);
  },
  draw(f, g, cx, cy, layer) {
    if (layer !== 'ground') return;
    // the flat stones' glints: a pale flat stone and the white point of the sun on it (no lamp)
    for (const i of slots()) {
      const [tx, ty] = KOISHI_SPOTS[i];
      const wx = tx * 16 + 8;
      const wy = ty * 16 + 10;
      const [sx, sy] = fxAt(f, wx, wy, cx, cy);
      const X = Math.round(sx);
      const Y = Math.round(sy);
      g.rect(X - 4, Y - 1, 9, 3, '#BDB6A6');
      g.rect(X - 3, Y - 1, 7, 1, '#E8E4D8');
      g.rect(X - 3, Y + 2, 7, 1, '#8E8C86');
      const ph = (f.t / 900 + i * 0.37) % 1;
      const a = 0.55 + 0.45 * Math.sin(ph * Math.PI * 2);
      g.rect(X - 1, Y - 3, 3, 1, '#FFFFFF', a);
      g.rect(X, Y - 4, 1, 3, '#FFFFFF', a);
      if (ph < 0.14) {
        g.rect(X - 5, Y - 3, 11, 1, '#FFFFFF', 0.6);
        g.rect(X, Y - 8, 1, 11, '#FFFFFF', 0.6);
      }
    }
    const ring = (x: number, y: number, r: number, color: string, a: number) => {
      let prev: [number, number] | null = null;
      for (let i = 0; i <= 16; i++) {
        const th = (i / 16) * Math.PI * 2;
        const p = fxAt(f, x + Math.cos(th) * r, y + Math.sin(th) * r, cx, cy);
        if (prev) g.alpha(a, () => g.line(Math.round(prev![0]), Math.round(prev![1]), Math.round(p[0]), Math.round(p[1]), color));
        prev = p;
      }
    };
    for (const r of rings) {
      const age = f.t - r.t;
      if (r.nami) {
        // carried out by the waves (south), widening and fading
        const u = Math.min(1, age / 2600);
        ring(r.x, r.y + u * 20, 3 + u * 9, '#E8F4FA', 0.9 * (1 - u));
        continue;
      }
      // the noon: a ring opens to its size in a moment, then stops where it is
      const grow = Math.min(1, age / 220);
      ring(r.x, r.y, 2 + grow * 4, '#F4FAFF', 0.85);
      ring(r.x, r.y, 1 + grow * 2, '#C8E4F4', 0.5);
    }
    if (skip && !skip.done) {
      const k = skip.t / SKIP_MS;
      const i = Math.min(skip.n, Math.floor(k));
      const u = k - Math.floor(k);
      const [x0, y0] = i === 0 ? [skip.x, skip.y] : skipAt(skip, i - 1);
      const [x1, y1] = skipAt(skip, Math.min(i, skip.n));
      const x = x0 + (x1 - x0) * u;
      const y = y0 + (y1 - y0) * u;
      const h = i < skip.n ? Math.sin(u * Math.PI) * (i === 0 ? 10 : 5) : 0;
      if (i <= skip.n) {
        const [sx, sy] = fxAt(f, x, y - h, cx, cy, y);
        g.rect(Math.round(sx) - 1, Math.round(sy), 3, 1, '#E8E4D8');
      }
    }
  },
});

// ================================================================ 大写し「水切り」（横から 見た しゅんの 腕と 鏡の 海、南の 水平線）

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const RX = SX + 214;
/** 腰の 目盛り（右の 列の 上＝画面の 上の 横。指で 隠れない）。 */
const GX = RX + 84;
const GY = 4;
const GH = 54;
const KEYS_Y = 62;
/** 腰が 1往復 する ms（押さえた まま だと 下まで 行って もどる）。 */
const KOSHI_MS = 1500;
/** はなした 高さ v（0 上〜1 下）の 帯。 */
const BAND = { best: 0.86, mid: 0.6, low: 0.3 };

export type Katachi = 'usui' | 'futsu' | 'buatsui';

/** 跳ねる 数：石の 形と はなした 高さ（段階2 は 少し 減って 6まで）。 */
export function mzCount(kata: Katachi, v: number, stage: number): number {
  const row = { usui: [9, 5, 3], futsu: [8, 5, 3], buatsui: [7, 4, 2] }[kata];
  let n = v >= BAND.best ? row[0] : v >= BAND.mid ? row[1] : v >= BAND.low ? row[2] : 0;
  if (stage >= 2) n = Math.min(6, Math.max(0, n - 2));
  return n;
}

export class MizukiriPanel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  /** QA：はなす 高さ（auto）。 */
  autoV = 0.92;
  active = false;
  kata: Katachi;
  /** 腰の 高さ（0 立つ 〜 1 いちばん 低い）。 */
  v = 0;
  holding = false;
  holdT = 0;
  /** はなした 高さ（null まだ）。 */
  released: number | null = null;
  cancel = false;
  /** 投げた あとの 石（大写しの 中で 跳ねる）。 */
  fly = -1;
  n = 0;
  private armT = 0;
  private wasActive = false;

  constructor(kata: Katachi) {
    this.kata = kata;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.fly >= 0) this.fly += dt;
    if (this.active !== this.wasActive) {
      this.wasActive = this.active;
      this.armT = 0;
      this.holding = false;
    }
    if (this.active) this.armT += dt;
    if (!this.active || this.released !== null || this.cancel) return;
    if (this.holding) {
      this.holdT += dt;
      const ph = (this.holdT / KOSHI_MS) % 1;
      this.v = ph < 0.5 ? ease.sineInOut(ph * 2) : ease.sineInOut(2 - ph * 2);
    } else this.v = Math.max(0, this.v - dt / 300);
    if (this.auto) {
      if (this.armT > 400 && !this.holding) {
        this.holding = true;
        this.holdT = 0;
      }
      if (this.holding && this.holdT < KOSHI_MS / 2 && this.v >= this.autoV) this.released = this.v;
      if (this.holding && this.autoV <= 0 && this.holdT > 80) this.released = this.v;
      return;
    }
    if (this.armT < 150) return;
    // a fresh press starts the crouch (the key that opened this must be let go first)
    if (!this.holding && input.pressed('confirm')) {
      this.holding = true;
      this.holdT = 0;
    } else if (this.holding && !input.down('confirm')) this.released = this.v;
    else if (!this.holding && input.pressed('cancel')) this.cancel = true;
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
        if (this.active && this.released === null) MZ_UI.keys.forEach((l, i) => g.text(l, RX, oy + KEYS_Y + i * 16, { color: '#FFE7A3' }));
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(MZ_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, MZ_UI.place, { seed: 99 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  private drawScene(g: Gfx, oy: number): void {
    const W = RX - SX - 4;
    const hz = oy + 40;
    const nami = c3Stage() >= 2;
    // the noon sky and, far off to the south, the horizon (seen only from this beach)
    for (let y = oy; y < hz; y++) g.rect(SX, y, W, 1, y < oy + 14 ? '#8EC0E0' : y < oy + 28 ? '#A8D0EA' : '#C8E2F2');
    g.rect(SX, hz, W, 1, '#6A9AC0');
    // the sea: a mirror of the sky at noon (the sky upside down), waves at 12:01
    for (let y = hz + 1; y < oy + CH; y++) {
      const d = y - hz;
      g.rect(SX, y, W, 1, d < 10 ? '#B8D8EC' : d < 26 ? '#9CC8E2' : '#7AB0D4');
      if (nami && (d + Math.round(this.t / 120)) % 9 === 0) for (let x = SX + ((d * 13) % 17); x < SX + W; x += 23) g.rect(x, y, 8, 1, '#E8F4FA');
    }
    if (!nami) for (let i = 0; i < 6; i++) g.rect(SX + 30 + i * 28, hz + 6 + (i % 3) * 9, 14, 1, '#D8ECF8');
    // the beach of round stones in front, the boy's arm from the left (lower the deeper the crouch)
    g.rect(SX, oy + CH - 16, W, 16, '#A8A49A');
    for (let x = SX + 2; x < SX + W; x += 6) g.circle(x, oy + CH - 12 + ((x * 7) % 5), 2, (x * 3) % 4 ? '#BDB6A6' : '#8E8C86');
    const sh = oy + 60 + Math.round(this.v * 30);
    const hand: [number, number] = [SX + 54, sh + 6 - Math.round(this.v * 8)];
    // しゅん from the side (his back to the left): the head, the green shirt, the legs bending with the crouch
    const by = sh - 4;
    g.rect(SX + 6, by - 20, 12, 10, '#E8B890');
    g.rect(SX + 6, by - 22, 13, 5, '#2A2A30');
    g.rect(SX + 4, by - 10, 16, 18, '#3E8A4E');
    g.rect(SX + 6, by + 8, 12, 6, '#2E4A7A');
    g.rect(SX + 6 - Math.round(this.v * 6), by + 14, 5, Math.round(16 - this.v * 8), '#E8B890');
    g.rect(SX + 14, by + 14, 5, Math.round(16 - this.v * 8), '#E8B890');
    if (this.fly < 0) {
      g.line(SX + 20, sh, hand[0], hand[1], '#C89068');
      g.line(SX + 20, sh + 1, hand[0], hand[1] + 1, '#C89068');
      g.line(SX + 20, sh + 2, hand[0] - 1, hand[1] + 2, '#A87048');
      // the stone between the thumb and the fingers, flat, held level
      const th = this.kata === 'usui' ? 1 : this.kata === 'futsu' ? 2 : 3;
      g.rect(hand[0] - 2, hand[1] - th, 9, th, '#BDB6A6');
      g.rect(hand[0] - 2, hand[1] - th, 9, 1, '#E8E4D8');
      g.circle(hand[0], hand[1] + 1, 2, '#C89068');
    } else {
      // thrown: the arm follows through; the stone skips off to the right, a ring at each touch
      g.line(SX + 20, sh, SX + 60, sh - 4, '#C89068');
      const touches = Math.min(this.n, Math.floor(this.fly / SKIP_MS));
      for (let i = 0; i < touches; i++) {
        const x = SX + 70 + i * 13;
        const y = hz + 18 - Math.round(i * 1.2);
        const r = nami ? 3 + Math.min(6, (this.fly - (i + 1) * SKIP_MS) / 120) : 4;
        g.alpha(nami ? Math.max(0, 1 - (this.fly - (i + 1) * SKIP_MS) / 900) : 0.9, () => {
          g.rect(Math.round(x - r), y, Math.round(r * 2), 1, '#F4FAFF');
          g.px(Math.round(x - r - 1), y - 1, '#F4FAFF');
          g.px(Math.round(x + r), y - 1, '#F4FAFF');
        });
      }
      if (this.fly / SKIP_MS < this.n + 1) {
        const k = this.fly / SKIP_MS;
        const i = Math.floor(k);
        const u = k - i;
        const x = SX + 58 + (i + u) * 13;
        const y = hz + 18 - i * 1.2 - Math.sin(u * Math.PI) * (i === 0 ? 14 : 6);
        if (i < this.n || u < 0.5) g.rect(Math.round(x), Math.round(y), 3, 1, '#E8E4D8');
      }
    }
  }

  private drawSide(g: Gfx, oy: number): void {
    g.text(MZ_UI.katachiLabel, RX, oy + 2, { color: '#8A84A0' });
    g.text(MZ_UI.katachi[this.kata], RX, oy + 16, { color: '#F4ECD8' });
    // the crouch gauge, at the top of the column: the boy's height from standing (top) to the lowest (foot), the best band
    const gx = GX;
    const gy = oy + GY;
    g.text(MZ_UI.koshi, GX - 16, oy + 40, { color: '#8A84A0' });
    g.rect(gx, gy, 12, GH, '#1A1626');
    g.rect(gx - 2, gy + Math.round(BAND.best * GH), 16, GH - Math.round(BAND.best * GH), '#3A6A8A');
    g.rect(gx, gy + Math.round(BAND.mid * GH), 12, 1, '#5A5468');
    g.rect(gx, gy + Math.round(BAND.low * GH), 12, 1, '#5A5468');
    const y = gy + Math.round(this.v * (GH - 3));
    g.rect(gx - 3, y, 18, 3, '#FFE7A3');
    g.frame(gx - 1, gy - 1, 14, GH + 2, '#8A84A0');
  }
}

function* openPanel(p: MizukiriPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: MizukiriPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;
let qaV = 0.92;

function pickKata(): Katachi {
  const r = Math.random();
  return r < 0.3 ? 'usui' : r < 0.75 ? 'futsu' : 'buatsui';
}

/** 5 水切り：跳ねた 数（やめたら -1）。 */
function* mizukiri(): Co<number> {
  const p = new MizukiriPanel(pickKata());
  p.auto = qaAuto;
  p.autoV = qaV;
  try {
    yield* openPanel(p);
    if (!flag(MF.rule)) {
      setFlag(MF.rule, 1);
      yield* say3(T.MZ_RULE);
    }
    p.active = true;
    while (p.released === null && !p.cancel) yield null;
    p.active = false;
    if (p.cancel) return -1;
    p.n = mzCount(p.kata, p.released ?? 0, c3Stage());
    se('se_examine', { vol: 0.4, pitch: 1.4 });
    p.fly = 0;
    while (p.fly < (p.n + 1.6) * SKIP_MS) yield null;
    yield 250;
    return p.n;
  } finally {
    yield* closePanel(p);
  }
}

// ================================================================ 台本

/** 1 子どもの〔mizukiri〕（2回目）。 */
wrap('npc_c3_kid_a', function* (_ctx, orig): Co {
  if (mzOpen() && onMap(UMIZOI) && flag('flag_seen_npc_c3_kid_c1') > 0 && !flag(MF.start)) {
    setFlag(MF.start, 1);
    yield* say(T.MZ_A);
    return;
  }
  yield* orig();
});

/** 2 テルの〔hama〕、段階2 の 1行。 */
wrap(TERU, function* (_ctx, orig): Co {
  if (mzOpen() && onMap(UMIZOI) && flag(MF.start) && !flag(MF.hama) && !s09Mid() && !teruInside()) {
    yield* say(T.MZ_HAMA);
    setFlag(MF.hama, 1);
    // she goes on ahead (west along the breakwater, to the quay's end)
    const f = field();
    if (f?.actorById(TERU)) {
      yield* walk(TERU, [[7, 30], [5, 30]], { speed: 2 });
      despawn(TERU);
    }
    return;
  }
  yield* orig();
  if (inCh3() && c3Stage() === 2 && onMap(UMIZOI) && flag(MF.n) > 0 && !flag(MF.c2)) {
    setFlag(MF.c2, 1);
    yield* say3(T.MZ_TERU_C2);
  }
});

/** S13 の 防波堤の ミナト（台詞は 変えない。テルの 話を 聞いていれば 地の文 1行）。 */
wrap('npc_c3_sirenban', function* (_ctx, orig): Co {
  yield* orig();
  if (inCh3() && c3Stage() === 2 && onMap(UMIZOI) && flag(MF.done) && !flag(MF.minato)) {
    setFlag(MF.minato, 1);
    yield* say3(T.MZ_MINATO);
  }
});

// 浜を 出たら：輪は 消える。すんで いれば テルは 灯台へ もどる
registerWorldFx({
  map: UMIZOI,
  update() {
    if (rings.length || visitRings) {
      rings = [];
      visitRings = 0;
    }
    if (flag(MF.done) && !flag(MF.back)) setFlag(MF.back, 1);
  },
});

registerScript('evt_mz_enter', function* (): Co {
  rings = [];
  visitRings = 0;
  skip = null;
  if (!inCh3()) return;
  yield 300;
  if (c3Stage() >= 2) {
    if (!flag(MF.in2)) {
      setFlag(MF.in2, 1);
      yield* say3(T.MZ_IN2);
      if (flag(MF.n) > 0) yield* say(T.MZ_IN2_WA);
    }
    return;
  }
  if (!flag(MF.inn)) {
    setFlag(MF.inn, 1);
    yield* say3(T.MZ_IN);
    if (teruBeach()) yield* say(T.MZ_IN_TERU);
  }
});

/** 平たい 石を ひろう（光る 点は 次の 空いた 所へ）。 */
registerScript('obj_mz_ishi', function* (ctx: ScriptCtx): Co {
  const i = Number(String(ctx.source).replace('obj_mz_ishi_', ''));
  se('se_examine');
  if (flag(MF.hold) >= 3) {
    yield* say3(T.MZ_FULL);
    return;
  }
  const now = slots();
  const k = now.indexOf(i);
  if (k < 0) return;
  let next = i;
  for (let s = 1; s <= KOISHI_SPOTS.length; s++) {
    const c = (i + s) % KOISHI_SPOTS.length;
    if (!now.includes(c)) {
      next = c;
      break;
    }
  }
  setFlag(slotF(k), next + 1);
  setFlag(MF.hold, flag(MF.hold) + 1);
  se('se_item', { vol: 0.4 });
  yield* say3(T.MZ_GOT);
  if (!flag(MF.demo) && teruBeach()) yield* teruNage();
});

/** 4 テルが 投げる（1回）：岩から 波打ちぎわへ、低く 投げる。子どもたちが 走って くる。 */
function* teruNage(): Co {
  setFlag(MF.demo, 1);
  const f = field();
  if (!f) return;
  yield* say(T.MZ_TERU_NAGE_A);
  const a = f.actorById('mz_teru');
  if (a) {
    pose('mz_teru', null);
    a.ox = 0;
    a.oy = 0;
    yield* walk('mz_teru', [[5, 5], [5, 7]], { speed: 1.6, face: 'down' });
    // she bends her knees, drops her hips, throws from the side, low
    a.oy = 3;
    yield 450;
    a.oy = 0;
  }
  yield* throwStone(5 * 16 + 8, 7 * 16 + 14, 9);
  // the children come running down the steps
  KIDS.forEach((id, i) => spawn(`mz_kid_run_${i}`, 22, 4, { sprite: id, dir: 'left', ghost: true }));
  for (let i = 0; i < 3; i++) {
    const id = `mz_kid_run_${i}`;
    game.scripts.run(walk(id, [KID_AT[i]], { speed: 3, face: 'left' }));
    yield 200;
  }
  yield 600;
  setFlag(MF.kids, 1);
  for (let i = 0; i < 3; i++) despawn(`mz_kid_run_${i}`);
  yield* say(T.MZ_TERU_NAGE);
  if (a) {
    yield* walk('mz_teru', [[5, 5], TERU_AT], { speed: 1.6 });
    a.dir = 'down';
    a.oy = -7;
    pose('mz_teru', 'sit');
  }
}

/** 海（波打ちぎわから）：石を 持っていれば 投げる。 */
registerScript('obj_mz_umi', function* (): Co {
  se('se_examine');
  const f = field();
  if (!inCh3() || !f || flag(MF.hold) <= 0 || f.player.tileY < 7) {
    yield* say3(c3Stage() >= 2 ? T.MZ_UMI2 : T.MZ_UMI);
    return;
  }
  const n = yield* mizukiri();
  if (n < 0) return;
  setFlag(MF.hold, flag(MF.hold) - 1);
  yield* throwStone(f.player.x, f.player.y + 6, n);
  yield* say3(T.mzTon(n));
  setFlag(MF.n, flag(MF.n) + 1);
  if (c3Stage() < 2 && teruBeach()) setFlag(MF.n1, flag(MF.n1) + 1);
  setFlag(MF.best, Math.max(flag(MF.best), n));
  if (c3Stage() < 2) setFlag(MF.wa, Math.max(flag(MF.wa), Math.min(visitRings, 99)));
  // the reactions
  const teru = teruBeach();
  if (n === 0) yield* say(T.MZ_KEKKA.zero);
  else if (n <= 5) yield* say(T.MZ_KEKKA.low);
  else if (n <= 8 || !teru) yield* say(teru ? T.MZ_KEKKA.high : T.MZ_KEKKA_HIGH_SOLO);
  if (n === 9 && teru && !flag(MF.nine)) {
    setFlag(MF.nine, 1);
    yield* say(T.MZ_KYU);
  }
  if (c3Stage() >= 2 && !flag(MF.nami)) {
    setFlag(MF.nami, 1);
    yield* say3(T.MZ_NAMI);
  }
  // 6 グソっ君の 番（しゅんの 1回目の あと、1回）
  if (!flag(MF.kn) && knWith() && c3Stage() < 2) {
    setFlag(MF.kn, 1);
    yield* say(T.MZ_KN_A);
    yield 200;
    se('se_tsuri_pochan', { vol: 0.5, pitch: 0.8 });
    yield 300;
    yield* say(T.MZ_KN_B);
  }
});

/** テル（浜の 岩）。 */
registerScript('mz_teru', function* (): Co {
  if (flag(MF.done)) {
    yield* say(T.MZ_TERU_DONE);
    return;
  }
  if (flag(MF.n1) >= 3) {
    yield* say(T.MZ_OSHI);
    setFlag(MF.done, 1);
    addMp(2);
    se('se_item');
    yield* say3(T.MZ_REWARD);
    return;
  }
  yield* say(flag(MF.demo) ? T.MZ_TERU_MADA : T.MZ_IN_TERU);
});

registerScript('mz_kid', function* (ctx: ScriptCtx): Co {
  const i = Number(String(ctx.source).replace('mz_kid_', ''));
  yield* say3(T.MZ_KIDS[KIDS[i]] ?? T.MZ_KIDS.npc_c3_kid_a);
});

registerScript('obj_mz_maru', function* (): Co {
  se('se_examine');
  yield* say3(T.MZ_MARU);
});
registerScript('obj_mz_ooki', function* (): Co {
  se('se_examine');
  yield* say3(T.MZ_OOKI);
});
registerScript('obj_mz_reiru', function* (): Co {
  se('se_examine');
  yield* say3(T.MZ_REIRU);
});
registerScript('obj_mz_iwa', function* (): Co {
  se('se_examine');
  yield* say3(T.MZ_IWA);
});

// かくし：グソっ君の 番の あと、もう一度 グソっ君に 話す（1回。テルが 浜に いる とき）
wrap(`kanenari_${KOISHI}`, function* (_ctx, orig): Co {
  if (flag(MF.kn) && !flag(MF.naze) && teruBeach() && knWith()) {
    setFlag(MF.naze, 1);
    yield* say(T.MZ_KN_NAZE);
    return;
  }
  yield* orig();
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.mizukiri(step = 'kid', auto = false, band = 0.92)（第3章の 段階1、S06 の あと）
 *   'kid'     子どもの いつもの 会話の あと、空き地の 子ども (6,6) の 前 (6,7) 上向き（話すと〔mizukiri〕）
 *   'teru'    〔mizukiri〕の あと、灯台の 台座の テルの 前 (10,30) 左向き（話すと〔hama〕）
 *   'dan'     〔hama〕の あと、岸壁の 西の はしの 石段の 前 (2,25) 左向き（左へ 歩くと 浜）
 *   'in'      浜の 東の 石段 (22,4)（入った ときの 1回）
 *   'ishi'    入った あと、光る 点 (8,6) の 前 (8,5) 下向き（ひろうと テルが 投げる）
 *   'nage'    テルが 投げた あと、石を 3つ 持って 波打ちぎわ (10,7) 下向き（海を 調べると 大写し。band：はなす 高さ 0〜1）
 *   'oshi'    3回 投げた あと、テルの 前 (5,5) 上向き
 *   'stage2'  段階2、石を 3つ 持って 浜の 波打ちぎわ (10,7) 下向き
 *   'teru2'   段階2、浜で 投げた あと、テル (10,30) の 前 (11,30) 左向き
 *   'minato'  段階2、すんだ あと、防波堤の ミナト (44,28) の 前 (45,28) 左向き
 */
if (import.meta.env.DEV) {
  registerDebug('mizukiri', (step = 'kid', auto = false, band = 0.92) => {
    const s2 = step === 'stage2' || step === 'teru2' || step === 'minato';
    cmd().jump?.(s2 ? 'ch3:trap' : 'ch3:umizoi', true);
    for (const id of Object.values(MF)) setFlag(id, 0);
    for (let k = 0; k < 3; k++) setFlag(slotF(k), 0);
    rings = [];
    visitRings = 0;
    skip = null;
    qaAuto = !!auto;
    qaV = Number(band);
    setFlag('flag_ch3_stage', s2 ? 2 : 1);
    setFlag('flag_seen_npc_c3_kid_c1', 1);
    // (the first run of ツガオ便 after S06 is the main line's: counted as come, so it does not cut in)
    if (!flag('flag_ch3_bin_n')) setFlag('flag_ch3_bin_n', 1);
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (s2) {
      setFlag(MF.start, 1);
      setFlag(MF.hama, 1);
      setFlag(MF.inn, 1);
      if (step === 'stage2') {
        setFlag(MF.hold, 3);
        return go(KOISHI, 10, 7, 'down');
      }
      setFlag(MF.n, 3);
      if (step === 'teru2') return go(UMIZOI, 11, 30, 'left');
      setFlag(MF.done, 1);
      setFlag(MF.back, 1);
      return go(UMIZOI, 45, 28, 'left');
    }
    if (step === 'kid') return go(UMIZOI, 6, 7, 'up');
    setFlag(MF.start, 1);
    if (step === 'teru') return go(UMIZOI, 10, 30, 'left');
    setFlag(MF.hama, 1);
    if (step === 'dan') return go(UMIZOI, 2, 25, 'left');
    if (step === 'in') return go(KOISHI, 22, 4, 'left');
    setFlag(MF.inn, 1);
    if (step === 'ishi') return go(KOISHI, 8, 5, 'down');
    setFlag(MF.demo, 1);
    setFlag(MF.kids, 1);
    setFlag(MF.hold, 3);
    if (step === 'nage') return go(KOISHI, 10, 7, 'down');
    setFlag(MF.hold, 0);
    setFlag(MF.n, 3);
    setFlag(MF.n1, 3);
    setFlag(MF.kn, 1);
    setFlag(MF.best, 7);
    setFlag(MF.wa, 12);
    return go(KOISHI, 5, 5, 'up');
  });

  registerDebug('mzState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(MF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof MizukiriPanel) as MizukiriPanel | undefined;
    const f = field();
    return {
      flags,
      slots: slots(),
      open: mzOpen(),
      door: mzDoor(),
      teruBeach: teruBeach(),
      rings: rings.length,
      visitRings,
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      panel: p ? { kata: p.kata, v: +p.v.toFixed(2), holding: p.holding, released: p.released, n: p.n, active: p.active } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no 天丼; no clock time; the names without さん in the narration. */
export function mzTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', '光らんでも', 'ピッ！', 'あ、つい', 'おかわり、あるよ', 'もう 1杯', '具足', 'ほどよいなぁ', '暗くて しめった', '本日も、休館'];
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
        if (/\d+:\d\d/.test(plain)) bad.push(`${name}: time: ${plain}`);
        if ((who === 'narr' || who === 'sys') && plain.includes('さん')) bad.push(`${name}: 地の文の さん: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('mz', T.MZ_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of MZ_UI.keys) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  for (const l of [MZ_UI.katachiLabel, ...Object.values(MZ_UI.katachi)]) if (measure(l) > GX - RX - 4) bad.push(`石の 形が 目盛りに かかる: ${l}`);
  if (KEYS_Y + MZ_UI.keys.length * 16 > CH) bad.push(`keys: bottom ${KEYS_Y + MZ_UI.keys.length * 16} > ${CH}`);
  if (GY + GH > KEYS_Y) bad.push('目盛りが 鍵に かかる');
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('mzText', () => mzTextCheck());
