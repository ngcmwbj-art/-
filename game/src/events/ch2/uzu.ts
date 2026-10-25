// 2枚の うず（第2章。げむきか 10/19 の 案5、2026-10-19 依頼主の 採用。02_ch2_index #108）。
// 文は data/text/hoshi_uzu.ts、みました帳の ページは ui/menu/book_uzu.ts、石と 線香の 絵は art/props/uzu_art.ts、
// 置き場所は data/maps/hoshi_village.ts（運転席の 窓の 下の 平らな 石 (41,43)。(40,43) から 東を 向いて 調べる）。
//
//   段階0〜2（転回場は 駅前の 明かり。灯りが なくても 遊べる）。野菜の 配達の あいだと、頼まれる 前（段階1 の
//   トマトの あと、まだ 運んで いない 間）は 起きない。グソっ君が いなくても 進む（1回目も しゅんが やる）。
//   ・ポコシャ（荷台の うしろ (45,42)）：今の 会話を 1回 聞いた あと（flag_uz_heard）、もう 1回 話すと〔uzu〕。
//     上へ 降る 雪（mushigomu.ts）の はじまりと すんだ あとの 1行は 先に 通す。
//   ・大写し「2枚の うず」UzPanel：←→ で まん中を ねじる（ゆるむ）、けっていを 長押しで すきまが 広がる。
//     けっていを 連打すると「ぽきっ」。グソっ君の 1回目は どうやっても 外側の はしで 折れる（演出）。
//     2回目は しゅん：するっと（flag_uz_how 1）か 2本（flag_uz_how 2）。どちらでも 進む。
//   ・ヒロスケが マッチ → 置き場所を 選ぶ（運転席・荷台は「車の 中には 置かん！」で もう 1回）→ 窓の 下の 石
//     （flag_uz_oku：石の 上に 線香と 煙）→ ツガオの 寝言 → ポコシャの ひとこと → 朱肉 +2（flag_uz_done）。
//   ・かくし：1回で するっと → ポコシャ「……さすが……」（1回）。上へ 降る 雪（flag_mg_done）→ ポコシャの 1行。
//     野菜の 配達（flag_ch2_delivery）→ ヒロスケの 1行。
//   ・クリア後の 夜は 起きない（ツガオは 起きて 軽トラの 横 (41,43) に 立つ：寝言の 場面に ならない。石も 出さない）。
//
// QA：__game.cmd.uzu(step, auto)、uzState()、uzText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/hoshi_uzu';
import { UZ_UI } from '../../data/text/hoshi_uzu';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { ch2Open, hStage } from './common';
import { deliveryOn, deliveryOpen } from './tsugao';
import { mgPokosha } from './mushigomu';
import { HOWTO } from '../../data/text/howto';

export const UF = {
  heard: 'flag_uz_heard',
  start: 'flag_uz_start',
  rule: 'flag_uz_rule',
  /** 1 するっと・2 2本。 */
  how: 'flag_uz_how',
  oku: 'flag_uz_oku',
  done: 'flag_uz_done',
  sasuga: 'flag_uz_sasuga',
  mg: 'flag_uz_mg',
  deli: 'flag_uz_deli',
  pokoAfter: 'flag_uz_poko_after',
} as const;

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

function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** 寄り道が 開いている：第2章の 夜（段階0〜2）、転回場、配達の 外。クリア後の 夜は 起きない。 */
export function uzOpen(): boolean {
  const s = hStage();
  return s >= 0 && s <= 2 && ch2Open() && !pgOn() && onMap('map_hoshimidai') && !deliveryOn() && !deliveryOpen() && !flag('flag_mg_school');
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

// ================================================================ 大写し「2枚の うず」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const RX = SX + 206;
/** うずの まん中（窓の 中）。 */
const CX = SX + 104;
const CY = 58;
/** 2枚目が わかれて 動く 長さ（px）。 */
const SEP_PX = 54;

export type UzResult = 'suru' | 'nihon';

export class UzPanel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  /** はじめの カード（改善会議 10-25 の1、ui/closeup.ts）。 */
  howto = HOWTO.uzu;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  /** 'nihon' を 試す（QA）。 */
  autoMash = false;
  active = false;
  result: UzResult | null = null;
  /** 'kn' グソっ君（はさみ。外側の はしで 折れる）・'shun' しゅん。 */
  who: 'kn' | 'shun';
  /** グソっ君の はさみで つまむ（絵）。 */
  claw = false;
  /** ゆるみ（0〜1。←→ で ふえ、長押しで 使う）。 */
  loose = 0;
  /** すきま（0〜1。1 で わかれる）。 */
  sep = 0;
  /** ねじりの 見た目（-1〜1）。 */
  twist = 0;
  /** 折れた 所：null・'soto'（外側の はし）・'naka'（まん中で 2本）。 */
  ore: 'soto' | 'naka' | null = null;
  private lastDir = 0;
  private taps: number[] = [];
  private autoT = 0;

  constructor(who: 'kn' | 'shun') {
    this.who = who;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    this.twist *= Math.pow(0.02, dt / 1000);
    if (!this.active || this.result) return;
    let l = false;
    let r = false;
    let press = false;
    let hold = false;
    if (this.auto) {
      this.autoT += dt;
      const ph = Math.floor(this.autoT / 260);
      if (this.autoMash) {
        press = Math.floor(this.autoT / 90) !== Math.floor((this.autoT - dt) / 90);
      } else if (this.loose < 0.15) {
        if (ph !== Math.floor((this.autoT - dt) / 260)) (ph % 2 ? (l = true) : (r = true));
      } else hold = true;
    } else {
      l = input.pressed('left');
      r = input.pressed('right');
      press = input.pressed('confirm');
      hold = input.down('confirm');
    }
    if (l || r) {
      const d = l ? -1 : 1;
      this.loose = Math.min(1, this.loose + (d !== this.lastDir ? 0.34 : 0.12));
      this.lastDir = d;
      this.twist = d;
      se('se_h_uzu_twist', { vol: 0.35, pitch: d > 0 ? 1.05 : 0.95 });
    }
    if (press) {
      this.taps.push(this.t);
      this.taps = this.taps.filter((x) => this.t - x < 900);
      if (this.taps.length >= 4) {
        this.snap(this.who === 'kn' ? 'soto' : 'naka');
        return;
      }
    }
    if (hold && this.loose > 0) {
      const k = dt / 1000;
      this.sep = Math.min(1, this.sep + k * 0.42);
      this.loose = Math.max(0, this.loose - k * 0.9);
      if (Math.floor(this.t / 300) !== Math.floor((this.t - dt) / 300)) se('se_h_uzu_twist', { vol: 0.18, pitch: 1.3 });
    }
    // グソっ君の はさみ：すきまが 少し 開いた ところで、外側の はしが 折れる
    if (this.who === 'kn' && this.sep >= 0.38) {
      this.snap('soto');
      return;
    }
    if (this.sep >= 1) {
      this.result = 'suru';
      se('se_h_uzu_suru', { vol: 0.6 });
    }
  }

  private snap(where: 'soto' | 'naka'): void {
    this.ore = where;
    this.result = 'nihon';
    se('se_h_uzu_pokit', { vol: 0.7 });
  }

  /** 1枚の うず巻き（rot：回し、dx：ずれ、cut：折れて とれた 所の はじめ〈0〜1〉）。 */
  private coil(g: Gfx, ox: number, oy: number, rot: number, cut: number | null, drop: [number, number]): void {
    const turns = 3.3;
    const n = 220;
    const R = 42;
    let prev: [number, number] | null = null;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const th = rot + k * turns * Math.PI * 2;
      const r = 5 + k * R;
      let x = ox + Math.cos(th) * r;
      let y = oy + Math.sin(th) * r * 0.62;
      const off = cut !== null && k >= cut;
      if (off) {
        x += drop[0];
        y += drop[1];
      }
      const pt: [number, number] = [Math.round(x), Math.round(y)];
      if (prev && !(cut !== null && Math.abs(k - cut) < 1 / n)) {
        g.line(prev[0], prev[1] + 1, pt[0], pt[1] + 1, '#1E3A22');
        g.line(prev[0], prev[1], pt[0], pt[1], '#3E7A3A');
      }
      if (i % 7 === 0) g.px(pt[0], pt[1] - 1, '#6AA25A');
      prev = pt;
    }
    // the stub at the middle (the hole for the stand) and the outer end
    g.rect(ox - 2, oy - 1, 4, 3, '#2E5A2A');
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
        // the night by the truck, the station's light from the west
        g.rect(SX, oy, RX - SX - 4, CH, '#1A1A26');
        for (let r = 90; r > 0; r -= 10) g.alpha(0.035, () => g.circle(SX + 20, oy + 20, r, '#F2D8A0'));
        // the newspaper they lay on (a pale square under the coils)
        g.rect(SX + 30, oy + CH - 30, 150, 26, '#5A564C');
        g.rect(SX + 30, oy + CH - 30, 150, 1, '#7A766A');
        const cx = CX;
        const cy = oy + CY;
        const tw = Math.round(this.twist * 2);
        const sx = Math.round(this.sep * SEP_PX);
        const sy = Math.round(this.sep * 6);
        // the under coil stays; the top one comes away to the right
        const underCut = this.ore === 'naka' ? 0.55 : null;
        this.coil(g, cx, cy, 0, underCut, [10, 8]);
        const topCut = this.ore === 'soto' ? 0.86 : null;
        this.coil(g, cx + sx + tw, cy - sy, Math.PI + this.twist * 0.08, topCut, [14, 10]);
        // the fingers at the middle (しゅん) or the claw (グソっ君)
        const hx = cx + sx + tw;
        const hy = cy - sy;
        if (this.claw) {
          g.rect(hx - 7, hy - 12, 5, 9, '#B85A3A');
          g.rect(hx + 2, hy - 12, 5, 9, '#B85A3A');
          g.rect(hx - 6, hy - 12, 3, 1, '#E08A6A');
          g.rect(hx + 3, hy - 12, 3, 1, '#E08A6A');
          g.rect(hx - 4, hy - 20, 8, 8, '#9A4A30');
        } else {
          g.rect(hx - 6, hy - 10, 4, 8, '#F2C8A0');
          g.rect(hx + 2, hy - 10, 4, 8, '#F2C8A0');
          g.rect(hx - 6, hy - 10, 1, 8, '#C89A7A');
          g.rect(hx - 5, hy - 18, 10, 8, '#E8B890');
        }
        // the snap: a few crumbs where it broke
        if (this.ore) {
          const bx = this.ore === 'soto' ? cx + sx + 40 : cx + 18;
          const by = this.ore === 'soto' ? cy - sy + 12 : cy + 20;
          for (const [ex, ey] of [[0, 0], [3, 2], [-2, 3], [5, -1]] as const) g.px(bx + ex, by + ey, '#6AA25A');
        }
        // the right column: whose hand, the keys, the gap
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        g.text(this.claw ? UZ_UI.kn : UZ_UI.shun, RX, oy + 4, { color: '#F4ECD8' });
        if (this.active) UZ_UI.keys.forEach((l, i) => g.text(l, RX, oy + 64 + i * 16, { color: '#FFE7A3' }));
        // the gap's gauge and the looseness under it
        g.rect(RX, oy + 26, 80, 6, '#1A1626');
        g.rect(RX + 1, oy + 27, Math.round(78 * this.sep), 4, '#6AA25A');
        g.rect(RX, oy + 38, 80, 4, '#1A1626');
        g.rect(RX + 1, oy + 39, Math.round(78 * this.loose), 2, '#E8C878');
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(UZ_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, UZ_UI.place, { seed: 72 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }
}

function* openPanel(p: UzPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: UzPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;
let qaMash = false;

/** 1回 はずす（結果）。 */
function* tryOnce(who: 'kn' | 'shun', rule: boolean): Co<UzResult> {
  const p = new UzPanel(who);
  p.claw = who === 'kn' && kanenariHere();
  p.auto = qaAuto;
  p.autoMash = qaMash && who === 'shun';
  try {
    yield* openPanel(p);
    if (rule && !flag(UF.rule)) {
      setFlag(UF.rule, 1);
      yield* say(T.UZ_RULE);
    }
    if (who === 'shun' && kanenariHere()) yield* say(T.UZ_SHUN);
    p.active = true;
    while (!p.result) yield null;
    p.active = false;
    yield 600;
    const r = p.result;
    if (who === 'kn') yield* say(kanenariHere() ? T.UZ_KN_ORE : T.UZ_SOLO_ORE);
    else yield* say(r === 'suru' ? T.UZ_SURU : T.UZ_NIHON);
    return r;
  } finally {
    yield* closePanel(p);
  }
}

// ================================================================ 台本

/** 1〜6。 */
function* uzu(): Co {
  setFlag(UF.start, 1);
  se('se_h_ka', { vol: 0.5 });
  yield* say(T.UZ_A);
  const kn = kanenariHere();
  if (!kn) yield* say(T.UZ_A_SOLO);
  // 2 1回目（グソっ君。いなければ しゅん）は 外側の はしで 折れる、2回目は しゅん
  yield* tryOnce('kn', true);
  const r = yield* tryOnce('shun', false);
  setFlag(UF.how, r === 'suru' ? 1 : 2);
  // かくし：1回で するっと（1回目は グソっ君なので、しゅんの はじめての 1回）
  if (r === 'suru' && kn && !flag(UF.sasuga)) {
    setFlag(UF.sasuga, 1);
    yield* say(T.UZ_SASUGA);
  }
  // 3 折れても 燃える
  yield* say(kn ? T.UZ_MOERU : T.UZ_MOERU_SOLO);
  se('se_h_match', { vol: 0.6 });
  yield 500;
  yield* say(T.UZ_MATCH);
  // 4 置き場所
  for (;;) {
    const i = yield* say(T.UZ_OKU);
    if (i === 2) break;
    yield* say(T.UZ_OKU_NG);
  }
  se('se_h_deli_put', { vol: 0.4 });
  setFlag(UF.oku, 1);
  field()?.refreshPresence();
  yield 400;
  yield* say(T.UZ_OKU_ISHI);
  // 5 割れたのも
  yield 300;
  yield* say(kn ? T.UZ_NEGOTO : T.UZ_NEGOTO_SOLO);
  yield* say(T.UZ_WARETA);
  if (flag('flag_mg_done') && !flag(UF.mg)) {
    setFlag(UF.mg, 1);
    yield* say(T.UZ_MG);
  }
  if (flag('flag_ch2_delivery') && !flag(UF.deli)) {
    setFlag(UF.deli, 1);
    yield* say(T.UZ_DELI);
  }
  // 6 ごほうび
  setFlag(UF.done, 1);
  addMp(2);
  se('se_item');
  yield* runMsg(T.UZ_REWARD);
}

/** ポコシャの 用（した とき true）。 */
export function* uzPokosha(): Co<boolean> {
  if (!uzOpen()) return false;
  if (!flag(UF.start)) {
    if (!flag(UF.heard) || !flag('flag_seen_npc_pokosha_h0_1')) return false;
    yield* uzu();
    return true;
  }
  if (flag(UF.done) && !flag(UF.pokoAfter)) {
    setFlag(UF.pokoAfter, 1);
    yield* say(T.UZ_POKO_AFTER);
    return true;
  }
  return false;
}

wrap('npc_pokosha', function* (_ctx, orig): Co {
  if (!uzOpen()) {
    yield* orig();
    return;
  }
  // 上へ 降る 雪の はじまり（ぺしゃんこ）と すんだ あとの 1行は 先に（とちゅうの「待って います」は うずの あと）
  const mgBusy = flag('flag_mg_start') > 0 && !flag('flag_mg_done');
  if (!mgBusy && (yield* mgPokosha())) return;
  if (yield* uzPokosha()) return;
  yield* orig();
  if (uzOpen() && flag('flag_seen_npc_pokosha_h0_1')) setFlag(UF.heard, 1);
});

/** 窓の 下の 石。 */
registerScript('obj_hoshi_tsugao_ishi', function* (): Co {
  se('se_examine');
  yield* runMsg(flag(UF.oku) ? T.UZ_ISHI_AFTER : T.UZ_ISHI_BEFORE);
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.uzu(step = 'poko', auto = false, stage = 'h0')（'h0'・'h1'（トマトの 灯り、配達の あと）・'h2'）
 *   'poko'   今の 会話を 聞いた あと、ポコシャの 前 (44,42) 右向き（話すと〔uzu〕）
 *   'first'  まだ 何も 聞いていない、ポコシャの 前（1回目は 今の 会話、2回目で〔uzu〕）
 *   'ishi'   すんだ あと、窓の 下の 石の 前 (40,43) 右向き
 *   'mash'   auto で しゅんの 回は 連打（2本）
 */
if (import.meta.env.DEV) {
  registerDebug('uzu', (step = 'poko', auto = false, stg = 'h0') => {
    if (stg === 'h2') cmd().jump?.('ch2:hill', true);
    else if (stg === 'h1') cmd().jump?.('ch2:houki', true);
    else cmd().jump?.('ch2:', true);
    for (const id of Object.values(UF)) setFlag(id, 0);
    qaAuto = !!auto || step === 'mash';
    qaMash = step === 'mash';
    if (stg === 'h1') setFlag('flag_ch2_delivery', 1);
    setFlag('flag_seen_npc_pokosha_h0_1', 1);
    // 上へ 降る 雪は すんだ ことに（ポコシャの 1行も 聞いた）：うずの かくしの 1行が 出る
    setFlag('flag_mg_start', 1);
    setFlag('flag_mg_done', 1);
    setFlag('flag_mg_poko_after', 1);
    const go = (x: number, y: number, d: string) => cmd().warp?.('map_hoshimidai', x, y, d);
    if (step === 'first') return go(44, 42, 'right');
    setFlag(UF.heard, 1);
    if (step === 'poko' || step === 'mash') return go(44, 42, 'right');
    setFlag(UF.start, 1);
    setFlag(UF.how, 1);
    setFlag(UF.oku, 1);
    setFlag(UF.done, 1);
    return go(40, 43, 'right');
  });

  registerDebug('uzState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(UF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof UzPanel) as UzPanel | undefined;
    return { flags, open: uzOpen(), stage: hStage(), panel: p ? { who: p.who, sep: +p.sep.toFixed(2), loose: +p.loose.toFixed(2), ore: p.ore, result: p.result } : null };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines; the names without さん in the narration. */
export function uzTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足様', '平和', '17', '3人', '海ぞい', '水族館', 'いただきます', 'さすが 師匠', '焼き芋 食うか', '寝る〜'];
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
          if (t.startsWith('?') && measure(t.slice(1)) > 336) bad.push(`${name}: choice ${measure(t.slice(1))}px`);
          continue;
        }
        const plain = raw.replace(/\{[^}]*\}/g, '');
        if (measure(plain) > 336) bad.push(`${name}: ${measure(plain)}px: ${plain}`);
        for (const b of BANNED) if (plain.includes(b)) bad.push(`${name}: 「${b}」: ${plain}`);
        if (/\d+:\d\d/.test(plain) || /\d+時/.test(plain)) bad.push(`${name}: time: ${plain}`);
        if ((who === 'narr' || who === 'sys') && plain.includes('さん')) bad.push(`${name}: 地の文の さん: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('uz', T.UZ_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of [...UZ_UI.keys, UZ_UI.kn, UZ_UI.shun]) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('uzText', () => uzTextCheck());
