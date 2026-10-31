// 背中は 海の 色（第3章の クリア前、段階1。げむきか 10/31 の 案2、2026-10-31 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_mure.ts、地図の 絵は art/props/mure_art.ts、みました帳の ページは ui/menu/book_mure.ts。
// 新しい 地図・新しい 人は ない（防波堤の ふちと、海の 中 map_c3_umi の 港がわに 物を 足す）。
//
//   段階1（正午）、S09 で 貝の ブレスレットを 拾った あと（flag_ch3_moguri_bracelet）から S12 の ナリオサメの 前まで
//   （段階1 の あいだ。ナリオサメの あとは 段階2）。グソっ君が いっしょの とき。
//   ・防波堤の ツリノ npc_c3_tsuri (21,32)：頭の 上に「！」。話すと 今の〔c1_1〕・やっと、魚の 昼の 段階1 の 1回
//     （SK_C1、sakana.ts）が まだなら それを 先に、その まま〔mure〕（flag_mr_start）。
//   ・上から：防波堤の 港がわの ふち obj_mr_ue（海の (24–28,30)。(24–28,31) に 立って 北を 向いて 調べる）→
//     大写し「群れ」〔上から〕。暗い 青の 中に、うすい 点が かすかに。ツリノ「見えんので、ええ」（会議 10-31：こわれたと
//     思わせない 一言）→ グソっ君「下から 見て くるわ」（flag_mr_ue）。
//   ・下から・横から：港の 階段から 潜る（今の 潜り。グソっ君だけ）。上から 見た あと、港がわの 底に 止まった 小アジの
//     群れ 3つ obj_mr_mure_1〜3（(7,9) ずらっと・(14,5) 中・(17,11) ちょっと。落とし物 4つ・郵便受け・岩・いかりと
//     重ならない。平ら：通り抜けられる。調べないと 何も 起きない）。群れの 真下に 立って 調べる → 〔下から〕、
//     となりの マスから 向いて 調べる → 〔横から〕（はじめての〔横から〕で 1ぴきの 前に 回りこむ）。
//   ・大写し「群れ」MurePanel：会話の あと ←→ で 上から・下から・横からを 見くらべる。まだ 見て いない 見え方は
//     「どこに 立てば 見えるか」の 字（会議 10-31：横から 見るのに 立つ 所が 分かる ように）。けってい・もどる で 閉じる。
//   ・見え方が 3つ そろうと グソっ君「ツリノに 言いに 行こ」、ツリノに もう一度「！」→ 背中と 腹 → 朱肉 +2、
//     みました帳③の すみ（flag_mr_done）。
//   ・かくし：図鑑『みずべ』（flag_mizube_book／2）→ 背中と 腹の あと 地の文（flag_mr_zukan）／来た おぴぃ（防波堤 (19,32)）
//     → 〔mure〕の あと（flag_mr_opi）／〔下から〕3回 → グソっ君（flag_mr_kn3）。
//   ・段階2（12:01、S14 の 前まで。始めて いれば）：ふちを 調べると 1回「群れが 向きを 変えた」（flag_mr_s2）。
//     やっと、魚の 昼の 1ぴき目の 小アジで グソっ君の 1行（flag_mr_aji、sakana.ts）。S14 から 先と クリア後は 足さない。
//   ・大写しの「ひろい」（ui/closeup_wide.ts）は 使わない：←→ で 見くらべる だけで、時間や 幅の 当たりが ない。
//
// QA：__game.cmd.mure(step)、mrState()、mrText()、mrBookText()

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
import { actorAnchor, addMarkSource } from '../../world/marks';
import { pgOn } from '../../world/postgame';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import { pickRows, type Howto, type TouchPick } from '../../ui/closeup';
import * as T from '../../data/text/c3_mure';
import { MR_UI, VIEW_ORDER, type Size, type View } from '../../data/text/c3_mure';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { addToMap, c3Stage, inCh3, kita, say3 } from './common';

export const MF = {
  start: 'flag_mr_start',
  ue: 'flag_mr_ue',
  shita: 'flag_mr_shita',
  yoko: 'flag_mr_yoko',
  /** 〔下から〕を 見た 回数（かくし：3回）。 */
  shitaN: 'flag_mr_shita_n',
  all3: 'flag_mr_all3',
  done: 'flag_mr_done',
  opi: 'flag_mr_opi',
  zukan: 'flag_mr_zukan',
  kn3: 'flag_mr_kn3',
  s2: 'flag_mr_s2',
  aji: 'flag_mr_aji',
} as const;

type Mure = 1 | 2 | 3;
const MURE_ORDER: Mure[] = [1, 2, 3];
/** 横から 見た 群れ。 */
export const mureF = (n: Mure): string => `flag_mr_mure_${n}`;
const VIEW_F: Record<View, string> = { ue: MF.ue, shita: MF.shita, yoko: MF.yoko };

const UMIZOI = 'map_umizoi';
const UMI = 'map_c3_umi';
const TSURI = 'npc_c3_tsuri';

/** 群れ 3つ（海の 中の 港がわ。今の 地図で 確かめた：岩・いかり・落とし物・郵便受け・藻と 重ならず、まわりが 空いて いる）。 */
const MURE: Record<Mure, { at: [number, number]; size: Size }> = {
  1: { at: [7, 9], size: 'oki' },
  2: { at: [14, 5], size: 'naka' },
  3: { at: [17, 11], size: 'chii' },
};

function knWith(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** 遊べる：段階1、S09 で ブレスレットを 拾った あと（段階1 の あいだ＝S12 の ナリオサメの 前）。 */
export function mrOpen(): boolean {
  return inCh3() && !pgOn() && c3Stage() === 1 && flag('flag_ch3_moguri_bracelet') > 0;
}

/** 段階2 の 1回（12:01、S14 の 前。始めて いれば）。 */
function s2Open(): boolean {
  return inCh3() && !pgOn() && c3Stage() === 2 && !flag('flag_ch3_truck_trap') && flag(MF.start) > 0 && !flag(MF.s2);
}

export function mrViewCount(): number {
  return VIEW_ORDER.filter((v) => flag(VIEW_F[v])).length;
}

export function mrMureCount(): number {
  return MURE_ORDER.filter((n) => flag(mureF(n))).length;
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

// ================================================================ 地図の 物

const OBJ = (o: Record<string, unknown>): MapObj => ({ t: 'obj', ...o }) as unknown as MapObj;
addToMap(UMIZOI, [
  // the harbour-side edge of the breakwater: the water (24–28,30), examined from the breakwater facing north
  OBJ({ id: 'obj_mr_ue', x: 24, y: 30, w: 5, h: 1, face: 'up', script: 'obj_mr_ue', cond: { when: () => (mrOpen() && flag(MF.start) > 0) || s2Open() } }),
]);
addToMap(UMI, [
  // the three schools of little 鯵, stopped as they swam (after the look from above)
  ...MURE_ORDER.map((n) =>
    OBJ({ id: `obj_mr_mure_${n}`, x: MURE[n].at[0], y: MURE[n].at[1], flat: true, prop: 'prop_mr_mure', opts: { size: MURE[n].size }, script: 'obj_mr_mure', cond: { when: () => mrOpen() && flag(MF.ue) > 0 } }),
  ),
]);

// ツリノの 頭の 上の「！」（〔mure〕を 言いだせる とき・見え方が 3つ そろった とき）
addMarkSource((f) => {
  if (f.map.id !== UMIZOI || !mrOpen() || !knWith() || flag(MF.done)) return null;
  if (flag(MF.start) && mrViewCount() < 3) return null;
  if (state.inventory.includes('item_c3_shikake')) return null;
  const a = f.actorById(TSURI);
  return a && a.visible ? actorAnchor(a) : null;
});

// ================================================================ 大写し「群れ」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 列（数・見え方の 札・キー）。 */
const RX = SX + 206;
const SW = RX - SX - 4;
const TAB_Y = 34;
const TAB_H = 14;
const KEYS_Y = 80;
const INK = '#2A2236';

/** 群れの 魚の 並び（scene の 中の 割合 0〜1）。大きさで 数が ちがう（数は 言わない）。 */
const LAYOUT: Record<Size, [number, number][]> = {
  oki: [[0.18, 0.3], [0.42, 0.24], [0.66, 0.3], [0.3, 0.48], [0.54, 0.46], [0.78, 0.5], [0.2, 0.66], [0.44, 0.68], [0.68, 0.7]],
  naka: [[0.3, 0.32], [0.56, 0.3], [0.42, 0.52], [0.68, 0.54], [0.28, 0.7]],
  chii: [[0.4, 0.42], [0.6, 0.56]],
};

export class MurePanel implements Widget {
  modal = true;
  closeup = true;
  howto: Howto = T.MR_HOWTO;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  /** 今 見せて いる 見え方。 */
  view: View;
  size: Size;
  /** 1ぴきの 前に 回りこんだ 寄り（はじめての〔横から〕の 会話の 間）。 */
  one = false;
  /** ←→ で 見くらべる あいだ（会話の あと）。 */
  active = false;
  /** けってい・もどる で 閉じた（台本が 読む）。 */
  closed = false;
  private armT = 0;
  private autoT = 0;

  constructor(view: View, size: Size) {
    this.view = view;
    this.size = size;
  }

  /** 指で さわって 選ぶ（改善会議 2026-10-30 の1、ui/closeup.ts）：右の 3つの 見え方の 札。 */
  touchPick: TouchPick = {
    spots: () => (!this.active || this.auto || this.open < 1 ? null : pickRows(3, (i) => [RX - 2, SY + TAB_Y + i * TAB_H - 1, SX + CW - RX, TAB_H])),
    cursor: () => VIEW_ORDER.indexOf(this.view),
    moveTo: (i) => this.go(i),
  };

  private go(i: number): void {
    const n = Math.max(0, Math.min(VIEW_ORDER.length - 1, i));
    if (VIEW_ORDER[n] === this.view) return;
    this.view = VIEW_ORDER[n];
    se('se_cursor', { vol: 0.4 });
  }

  /** もどる＝閉じる（見くらべは いつ やめても よい。台本は ふつうに 続く）。 */
  quittable(): boolean {
    return this.active;
  }

  quit(): boolean {
    this.closed = true;
    return true;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (!this.active) {
      this.armT = 0;
      return;
    }
    this.armT += dt;
    if (this.auto) {
      this.autoT += dt;
      if (this.autoT > 500) this.closed = true;
      return;
    }
    const lr = (input.pressed('right') ? 1 : 0) - (input.pressed('left') ? 1 : 0);
    if (lr) this.go(VIEW_ORDER.indexOf(this.view) + lr);
    if (this.armT > 400 && input.pressed('confirm')) {
      this.closed = true;
      se('se_cancel', { vol: 0.3 });
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
        g.clip(SX, oy, SW, CH, () => this.drawScene(g, oy));
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, INK);
        this.drawSide(g, oy);
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(MR_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, MR_UI.place, { seed: 31 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  private drawScene(g: Gfx, oy: number): void {
    if (!flag(VIEW_F[this.view])) {
      this.drawHint(g, oy);
      return;
    }
    if (this.view === 'ue') this.drawUe(g, oy);
    else if (this.view === 'shita') this.drawShita(g, oy);
    else if (this.one) this.drawOne(g, oy);
    else this.drawYoko(g, oy);
  }

  /** まだ 見て いない 見え方：どこに 立てば 見えるか。 */
  private drawHint(g: Gfx, oy: number): void {
    g.rect(SX, oy, SW, CH, '#1A2A3A');
    for (let i = 0; i < 40; i++) g.rect(SX + ((i * 53) % SW), oy + ((i * 29) % CH), 1, 1, '#24384C');
    const cx = SX + Math.round(SW / 2);
    g.text('？', cx - 6, oy + 22, { color: '#8AA0B8' });
    MR_UI.hint[this.view].forEach((l, i) => {
      const w = g.measure(l);
      g.text(l, cx - Math.round(w / 2), oy + 48 + i * 16, { color: '#F4ECD8' });
    });
  }

  /** 〔上から〕：鏡の 海の 下の、暗い 青。群れは 背中の 色で、目を こらすと 分かる くらい。 */
  private drawUe(g: Gfx, oy: number): void {
    for (let y = 0; y < CH; y += 4) {
      const k = y / CH;
      const c = k < 0.33 ? '#2A4A62' : k < 0.66 ? '#22405A' : '#1C3650';
      g.rect(SX, oy + y, SW, 4, c);
    }
    // the mirror: a few still streaks of the sky on the surface (no ripples at noon)
    g.alpha(0.18, () => {
      for (const [x, y, w] of [[16, 10, 60], [110, 22, 48], [40, 86, 70], [140, 70, 40]] as const) g.rect(SX + x, oy + y, w, 1, '#DCEAF2');
    });
    // their backs, a hair darker than the sea
    for (const [fx, fy] of LAYOUT.oki) {
      const x = SX + Math.round(fx * SW);
      const y = oy + Math.round(fy * CH);
      g.rect(x - 6, y, 12, 2, '#1A3044');
      g.rect(x - 4, y - 1, 7, 1, '#1A3044');
      g.rect(x + 6, y, 2, 1, '#1C3248');
    }
  }

  /** 〔下から〕：明るい 水面の 光。群れの 白っぽい 腹は、光に とける。 */
  private drawShita(g: Gfx, oy: number): void {
    for (let y = 0; y < CH; y += 4) {
      const k = y / CH;
      const c = k < 0.25 ? '#F4FAFC' : k < 0.5 ? '#E2F0F6' : k < 0.75 ? '#CCE4EE' : '#B4D6E4';
      g.rect(SX, oy + y, SW, 4, c);
    }
    const cx = SX + Math.round(SW / 2);
    // the sun's light through the still surface, its rays fanning down
    g.alpha(0.35, () => {
      for (let i = -4; i <= 4; i++) g.line(cx, oy, cx + i * 28, oy + CH, '#FFFFFF');
    });
    g.circle(cx, oy + 4, 14, '#FFFFFF');
    // the bellies, white against the light (only a faint edge)
    for (const [fx, fy] of LAYOUT.oki) {
      const x = SX + Math.round(fx * SW);
      const y = oy + Math.round(fy * CH);
      g.rect(x - 6, y, 12, 2, '#EEF6FA');
      g.rect(x - 6, y + 2, 12, 1, '#D8EAF2');
    }
  }

  /** 〔横から〕：同じ 深さ。銀色の 小アジが、同じ 向きで 止まって いる。 */
  private drawYoko(g: Gfx, oy: number): void {
    this.water(g, oy);
    for (const [fx, fy] of LAYOUT[this.size]) fishSide(g, SX + Math.round(fx * SW), oy + Math.round(fy * CH), 12);
  }

  /** 1ぴきの 前に 回りこんだ 寄り：背中は 青黒く、腹は 白っぽい 銀。 */
  private drawOne(g: Gfx, oy: number): void {
    this.water(g, oy);
    fishSide(g, SX + Math.round(SW / 2), oy + Math.round(CH / 2), 34);
  }

  private water(g: Gfx, oy: number): void {
    for (let y = 0; y < CH; y += 4) {
      const k = y / CH;
      const c = k < 0.33 ? '#4A86A4' : k < 0.66 ? '#3C7694' : '#306684';
      g.rect(SX, oy + y, SW, 4, c);
    }
    g.rect(SX, oy + CH - 8, SW, 8, '#8A8270');
    for (let i = 0; i < 30; i++) g.rect(SX + ((i * 37) % SW), oy + CH - 7 + (i % 6), 1, 1, '#A89E88');
  }

  private drawSide(g: Gfx, oy: number): void {
    g.text(MR_UI.mie(mrViewCount()), RX, oy + 2, { color: '#F4ECD8' });
    g.text(MR_UI.mure(mrMureCount()), RX, oy + 16, { color: '#F4ECD8' });
    VIEW_ORDER.forEach((v, i) => {
      const y = oy + TAB_Y + i * TAB_H;
      const on = v === this.view;
      const seen = flag(VIEW_F[v]) > 0;
      if (on) for (let r = 0; r < 4; r++) g.rect(RX + r, y + 3 + r, 1, 9 - r * 2, '#FFE7A3');
      g.text(MR_UI.view[v], RX + 8, y, { color: on ? '#FFE7A3' : seen ? '#F4ECD8' : '#8A84A0' });
      if (!seen) g.text('？', RX + 8 + g.measure(MR_UI.view[v]) + 2, y, { color: '#8A84A0' });
    });
    if (!this.active) return;
    MR_UI.keys.forEach((l, i) => g.text(l, RX, oy + KEYS_Y + i * 14, { color: i === 0 ? '#FFE7A3' : '#8A84A0' }));
  }
}

/** 横向きの 小アジ（頭が 左）。len は 体の 長さの 半分（px）。背は 青黒く、横は 銀、腹は 白っぽい 銀、尾は 二つに 分かれる。 */
function fishSide(g: Gfx, cx: number, cy: number, len: number): void {
  const h = Math.max(2, Math.round(len * 0.3));
  for (let x = -len; x <= len; x++) {
    const k = x / len;
    const hw = Math.max(1, Math.round(h * Math.sqrt(Math.max(0, 1 - k * k)) * (k > 0 ? 1 - k * 0.35 : 1)));
    for (let d = -hw; d <= hw; d++) {
      const c = d < -hw / 3 ? '#2E4A5A' : d <= hw / 3 ? '#C8D4DC' : '#F2F6F8';
      g.rect(cx + x, cy + d, 1, 1, c);
    }
  }
  // the forked tail
  const tx = cx + len;
  const tl = Math.max(2, Math.round(len * 0.35));
  for (let i = 0; i < tl; i++) {
    g.rect(tx + i, cy - 1 - Math.round(i * 0.8), 1, Math.max(1, Math.round(h * 0.5) - Math.round(i * 0.3)), '#5A7484');
    g.rect(tx + i, cy + 1 + Math.round(i * 0.5), 1, Math.max(1, Math.round(h * 0.4) - Math.round(i * 0.3)), '#9AACB8');
  }
  // the eye
  const ex = cx - len + Math.max(2, Math.round(len * 0.2));
  if (len >= 10) {
    const r = Math.max(1, Math.round(len * 0.07));
    g.circle(ex, cy - 1, r + 1, '#F2F6F8');
    g.circle(ex, cy - 1, r, '#1A2228');
  } else g.rect(ex, cy - 1, 1, 1, '#1A2228');
  // the line of hard scales (ぜいご) along the rear half of the side, on the big one
  if (len >= 20) for (let x = 0; x < len - 4; x += 3) g.rect(cx + x, cy - 1, 2, 1, '#8A9AA6');
}

function* openPanel(p: MurePanel): Co {
  game.ui.push(p);
  se('se_examine', { vol: 0.4, pitch: 0.9 });
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: MurePanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;

/** 大写しを 開いて、会話（talk）の あと ←→ で 見くらべ、閉じるまで。 */
function* look(view: View, size: Size, talk: (p: MurePanel) => Co): Co {
  const p = new MurePanel(view, size);
  p.auto = qaAuto;
  try {
    yield* openPanel(p);
    yield 250;
    yield* talk(p);
    p.active = true;
    while (!p.closed) yield null;
    p.active = false;
  } finally {
    yield* closePanel(p);
  }
}

/** 見え方が 3つ そろった（1回）。 */
function* all3(sayFn: (t: string) => Co<number>): Co {
  if (mrViewCount() < 3 || flag(MF.all3)) return;
  setFlag(MF.all3, 1);
  yield 200;
  yield* sayFn(T.MR_ALL3);
}

// ================================================================ 台本

/** 1〔mure〕。 */
function* intro(): Co {
  setFlag(MF.start, 1);
  yield* say(T.MR_A);
  if (kita('npc_tamotsu') && !flag(MF.opi)) {
    setFlag(MF.opi, 1);
    yield* say3(T.MR_OPI);
  }
  field()?.refreshPresence();
}

/** 4〜5 背中と 腹 → ごほうび。 */
function* senaka(): Co {
  yield* say(T.MR_SENAKA);
  if ((flag('flag_mizube_book') || flag('flag_mizube_book2')) && !flag(MF.zukan)) {
    setFlag(MF.zukan, 1);
    yield* say3(T.MR_ZUKAN);
  }
  setFlag(MF.done, 1);
  addMp(2);
  se('se_item');
  yield* say3(T.MR_REWARD);
}

wrap(TSURI, function* (_ctx, orig): Co {
  // (the cut line from S09 goes back first, as before)
  if (!onMap(UMIZOI) || state.inventory.includes('item_c3_shikake') || !mrOpen() || !knWith()) {
    yield* orig();
    return;
  }
  if (!flag(MF.start)) {
    // the usual talk first if it is still to come (〔c1_1〕, then the float's one line), then 〔mure〕 at once
    if (!flag('flag_seen_npc_c3_tsuri_c1_1') || !flag('flag_sk_c1')) {
      yield* orig();
      yield 200;
    }
    yield* intro();
    return;
  }
  if (flag(MF.done)) yield* say3(T.MR_AGAIN);
  else if (mrViewCount() >= 3) yield* senaka();
  else yield* say3(flag(MF.ue) ? T.MR_WAIT_SEA : T.MR_WAIT_UE);
});

// 2 上から（防波堤の ふち）。段階2 は 1回だけ 地の文。
registerScript('obj_mr_ue', function* (): Co {
  se('se_examine');
  if (s2Open()) {
    setFlag(MF.s2, 1);
    yield* say3(T.MR_S2);
    field()?.refreshPresence();
    return;
  }
  if (!mrOpen() || !flag(MF.start)) return;
  yield* say3(T.MR_UE_A);
  const first = !flag(MF.ue);
  setFlag(MF.ue, 1);
  yield* look('ue', 'oki', function* (): Co {
    if (first) yield* say(T.MR_UE_B);
    yield* all3(say);
  });
});

// 3 下から・横から（海の 中。グソっ君だけ：会話は say3 の まま）
registerScript('obj_mr_mure', function* (ctx: ScriptCtx): Co {
  const n = MURE_ORDER.find((m) => `obj_mr_mure_${m}` === String(ctx.source));
  const f = field();
  if (!n || !f || !mrOpen()) return;
  se('se_examine');
  const [mx, my] = MURE[n].at;
  const under = f.player.tileX === mx && f.player.tileY === my;
  const size = MURE[n].size;
  if (under) {
    const first = !flag(MF.shita);
    setFlag(MF.shita, 1);
    setFlag(MF.shitaN, flag(MF.shitaN) + 1);
    yield* look('shita', size, function* (): Co {
      yield* say3(first ? (flag(MF.yoko) ? T.MR_SHITA_1B : T.MR_SHITA_1) : T.MR_SHITA_AGAIN);
      if (flag(MF.shitaN) >= 3 && !flag(MF.kn3)) {
        setFlag(MF.kn3, 1);
        yield* say3(T.MR_SHITA_3);
      }
      yield* all3(say3);
    });
    return;
  }
  const first = !flag(MF.yoko);
  const fresh = !flag(mureF(n));
  setFlag(MF.yoko, 1);
  setFlag(mureF(n), 1);
  yield* look('yoko', size, function* (p): Co {
    if (first) {
      yield* say3(T.MR_YOKO_1);
      yield* say3(T.MR_SIZE[size]);
      p.one = true;
      se('se_cursor', { vol: 0.3, pitch: 0.8 });
      yield* say3(T.MR_MAE);
      p.one = false;
    } else if (fresh) yield* say3(T.MR_SIZE[size]);
    else yield* say3(T.MR_YOKO_AGAIN);
    yield* all3(say3);
  });
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.mure(step = 'start', auto = false, opi = false, zukan = false)（第3章の 段階1、S09 の あと）
 *   'c1'     ツリノと まだ 話して いない。ツリノの 前 (22,32) 左向き（「！」。話すと〔c1_1〕→〔mure〕）
 *   'start'  〔c1_1〕・浮きの 1行の あと。ツリノの 前 (22,32) 左向き（話すと すぐ〔mure〕）
 *   'far'    同じ、港の 階段の 上 (28,26)（遠くから「！」が 見えるか）
 *   'ue'     〔mure〕の あと、防波堤の ふち (26,31) 上向き（調べると〔上から〕）
 *   'stairs' 上から 見た あと、港の 階段の 前 (28,26) 下向き（下へ 押すと 潜る）
 *   'shita'  上から 見た あと、海の 中、群れ1 の 真下 (7,9)（調べると〔下から〕）
 *   'yoko'   上から 見た あと、海の 中、群れ1 の となり (6,9) 右向き（調べると〔横から〕）
 *   'yoko3'  上・下 見て、群れ1・2 を 横から 見た あと、群れ3 の となり (16,11) 右向き
 *   'back'   見え方 3/3。ツリノの 前 (22,32) 左向き（「！」。話すと 背中と 腹 → ごほうび）
 *   'done'   済んだ あと。ふちの 前 (26,31) 上向き
 *   's2'     段階2（S13 の あと）。ふちの 前 (26,31) 上向き（1回だけ 地の文）
 */
if (import.meta.env.DEV) {
  registerDebug('mure', (step = 'start', auto = false, opi = false, zukan = false) => {
    const s2 = step === 's2';
    cmd().jump?.(s2 ? 'ch3:trap' : 'ch3:itadaki', true);
    for (const id of Object.values(MF)) setFlag(id, 0);
    for (const n of MURE_ORDER) setFlag(mureF(n), 0);
    qaAuto = !!auto;
    setFlag('flag_ch3_stage', s2 ? 2 : 1);
    setFlag('flag_ch3_moguri_bracelet', 1);
    setFlag('flag_ch3_kita_npc_tamotsu', opi ? 1 : 0);
    if (zukan) setFlag('flag_mizube_book', 1);
    const go = (map: string, x: number, y: number, d: string) => {
      cmd().warp?.(map, x, y, d);
      field()?.refreshPresence();
    };
    if (step === 'c1') {
      setFlag('flag_seen_npc_c3_tsuri_c1_1', 0);
      setFlag('flag_seen_npc_c3_tsuri_c1', 0);
      setFlag('flag_sk_c1', 0);
      return go(UMIZOI, 22, 32, 'left');
    }
    setFlag('flag_seen_npc_c3_tsuri_c1_1', 1);
    setFlag('flag_seen_npc_c3_tsuri_c1', 1);
    setFlag('flag_sk_c1', 1);
    if (step === 'start') return go(UMIZOI, 22, 32, 'left');
    if (step === 'far') return go(UMIZOI, 28, 26, 'down');
    setFlag(MF.start, 1);
    if (s2) {
      setFlag(MF.ue, 1);
      return go(UMIZOI, 26, 31, 'up');
    }
    if (step === 'ue') return go(UMIZOI, 26, 31, 'up');
    setFlag(MF.ue, 1);
    if (step === 'stairs') return go(UMIZOI, 28, 26, 'down');
    if (step === 'shita') return go(UMI, 7, 9, 'down');
    if (step === 'yoko') return go(UMI, 6, 9, 'right');
    setFlag(MF.shita, 1);
    setFlag(MF.shitaN, 1);
    setFlag(MF.yoko, 1);
    setFlag(mureF(1), 1);
    setFlag(mureF(2), 1);
    if (step === 'yoko3') return go(UMI, 16, 11, 'right');
    setFlag(mureF(3), 1);
    setFlag(MF.all3, 1);
    if (step === 'back') return go(UMIZOI, 22, 32, 'left');
    setFlag(MF.done, 1);
    return go(UMIZOI, 26, 31, 'up');
  });

  registerDebug('mrState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(MF)) flags[k] = flag(id);
    for (const n of MURE_ORDER) flags[`mure_${n}`] = flag(mureF(n));
    const p = game.ui.widgets.find((w) => w instanceof MurePanel) as MurePanel | undefined;
    const f = field();
    return {
      flags,
      open: mrOpen(),
      views: mrViewCount(),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      panel: p ? { view: p.view, size: p.size, one: p.one, active: p.active } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no 天丼; no clock time; no さん in the narration. */
export function mrTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', '海の ぬしは', '気が 長い', 'ピッ！', 'あ、つい', 'おかわり、あるよ', 'もう 1杯', 'ほどよいなぁ', '暗くて しめった', '見つけて もらった', '見つけてもらった', '%'];
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
  walkT('mr', T.MR_TEXTS);
  // the right column: every label fits between RX and the panel's inner edge
  const col = SX + CW - RX - 2;
  const labels = [...MR_UI.keys, MR_UI.mie(3), MR_UI.mure(3)];
  for (const l of labels) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  for (const v of VIEW_ORDER) {
    if (8 + measure(MR_UI.view[v]) + 2 + measure('？') > col) bad.push(`札: ${MR_UI.view[v]}`);
    for (const l of MR_UI.hint[v]) if (measure(l) > SW - 8) bad.push(`ヒント: ${measure(l)}px > ${SW - 8}: ${l}`);
  }
  if (TAB_Y + 3 * TAB_H > KEYS_Y) bad.push('札が キーに かかる');
  if (KEYS_Y + MR_UI.keys.length * 14 > CH) bad.push(`keys: bottom ${KEYS_Y + MR_UI.keys.length * 14} > ${CH}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('mrText', () => mrTextCheck());
