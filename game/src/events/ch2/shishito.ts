// 当たりは、かじって みんと（第2章。げむきか 10/22 の 案5、2026-10-22 依頼主の 採用。02_ch2_index）。
// 文は data/text/hoshi_shishito.ts、絵は art/props/shishito_art.ts、みました帳の ページは ui/menu/book_shishito.ts。
//
//   段階1〜2（トマトの 灯り）。段階0 は ペロの 1 の 台詞だけ（畑が 暗い）。クリア後の 夜は 足さない。
//   ・3号ハウスの 前の ペロ (3,32)：今の 会話の あと（flag_ss_heard）、もう 1回 話すと〔shishito〕（flag_ss_start）。
//     ペロは 縁側の 七輪の 横 (7,44) へ 歩く（flag_ss_away の 間。すむと 3号ハウスの 前へ もどる）。
//   ・家の 前の 畑の シシトウの 株 2つ (11,43)・(12,43)（下から 上向きに 調べる）：1つ目で 3本、2つ目で 3本と
//     グソっ君の 1本（flag_ss_kabu_<i>）。
//   ・縁側の ペロ（か 七輪 (8,44)）→ 大写し「七輪」ShichirinPanel：串（けってい 2回）→ グソっ君が 残りの 1本を
//     そのまま 網に → 焼き色の 目盛りで 返す（2回）→ パンッ！ → くじ（←→ えらぶ・けってい 食べる）。
//     だれに 当たるかは 前の 回と ちがう 人（flag_ss_last）。当たった 人 flag_ss_hit_<who>。
//   ・ごほうび（1回目）：焼きシシトウ 2つ（item_ss_yaki）、朱肉 +2、みました帳②の すみ（flag_ss_done）、
//     寄り合いの 皿（item_ss_sara）。
//   ・2回目から：株に 小さい 実が 3本（flag_ss_new）→ ペロに 話すと「もう 1回、焼くかい」→ 縁側へ（暗転）、
//     穴あけと パンッは はぶく。
//   ・かくし：羽釜が すんでいる（flag_hg_done）→ かまどの 残り火（flag_ss_hagama）。皿を 集会所の ハモ区長へ
//     （flag_ss_kucho。区長は はずれ）。3人とも 当たった → ペロ「……みんな、当たりだね。」（flag_ss_minna）。
//   ・エンディング（h3）の カット2d：集会所の お茶の 台に 皿（皿を わたした あと。台詞は 足さない）。
//
// QA：__game.cmd.shishito(step, auto, who)、ssState()、ssText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { addItem, flag, removeItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { despawn, pose, registerScript, shake, walk } from '../../world/api';
import { getMapDef, registerMap } from '../../world/maps';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/hoshi_shishito';
import { SS_UI } from '../../data/text/hoshi_shishito';
import { addMp, F, getKeyItem } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { hStage, lanternOn } from './common';
import { HOWTO } from '../../data/text/howto';

export const SF = {
  heard: 'flag_ss_heard',
  h0: 'flag_ss_h0',
  start: 'flag_ss_start',
  away: 'flag_ss_away',
  done: 'flag_ss_done',
  n: 'flag_ss_n',
  last: 'flag_ss_last',
  newMi: 'flag_ss_new',
  hagama: 'flag_ss_hagama',
  iro: 'flag_ss_iro',
  after: 'flag_ss_after',
  kucho: 'flag_ss_kucho',
  minna: 'flag_ss_minna',
} as const;

export type SsWho = 'shun' | 'kn' | 'pero';
export const SS_WHO: SsWho[] = ['shun', 'kn', 'pero'];
export const hitF = (w: SsWho) => `flag_ss_hit_${w}`;
const kabuF = (i: number) => `flag_ss_kabu_${i}`;

const VILLAGE = 'map_hoshimidai';
const PERO = 'npc_hoshi_mitsu';
const YAKI = 'item_ss_yaki';
const SARA = 'item_ss_sara';
/** 株 2つ（畑の 東の はし。下の 段から 上向きに 調べる）・七輪・縁側の ペロ。 */
export const SS_KABU: [number, number][] = [
  [11, 43],
  [12, 43],
];
export const SS_SHICHIRIN: [number, number] = [8, 44];
export const SS_PERO_AT: [number, number] = [7, 44];

function knWith(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function dropKn(text: string): string {
  if (knWith()) return text;
  return text
    .split(/\n(?=@)/)
    .filter((p) => !p.startsWith('@npc_kanenari'))
    .join('\n');
}

function* say(text: string): Co<number> {
  const t = dropKn(text);
  if (!t.trim()) return 0;
  return yield* runMsg(t);
}

function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** 寄り道が 開いている：段階1〜2、トマトの 灯り、クリアの 前。 */
export function ssOpen(): boolean {
  const s = hStage();
  return s >= 1 && s <= 2 && lanternOn() && !pgOn();
}

/** 手に ある 実（株を 2つ とった、または 2回目の 新しい 実を とった）。 */
function haveMi(): boolean {
  if (flag(SF.done)) return flag(SF.newMi) === 2;
  return SS_KABU.every((_, i) => flag(kabuF(i)) > 0);
}

export function ssHitN(): number {
  return SS_WHO.filter((w) => flag(hitF(w)) > 0).length;
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

const awayNow = (): boolean => flag(SF.away) > 0 && ssOpen();
{
  const def = getMapDef(VILLAGE);
  if (def) {
    // ペロ at 3号ハウス stays away (at the 縁側's 七輪) while the shishito are being grilled
    for (const o of def.objects) {
      const n = o as { t: string; id?: string; x: number; y: number; cond?: Record<string, unknown> };
      if (n.t === 'npc' && n.id === PERO && n.x === 3 && n.y === 32) {
        const prev = n.cond ?? {};
        const when = prev.when as (() => boolean) | undefined;
        n.cond = { ...prev, when: () => (!when || when()) && !awayNow() };
      }
    }
    def.objects.push(
      // the two plants at the field's east end (drawn over the field's own row of aubergines and shishito)
      ...SS_KABU.map(([x, y], i) => ({ t: 'prop', prop: 'prop_ss_kabu', x, y, opts: { i } }) as unknown as MapObj),
      ...SS_KABU.map(([x, y], i) => ({ t: 'obj', id: `obj_ss_kabu_${i}`, x, y, face: 'up', priority: 2, script: 'obj_ss_kabu' }) as unknown as MapObj),
      // the 七輪 by the 縁側, and ペロ beside it while the grilling is on
      { t: 'prop', prop: 'prop_ss_shichirin', x: SS_SHICHIRIN[0], y: SS_SHICHIRIN[1], solid: [0, 0, 1, 1] } as unknown as MapObj,
      { t: 'obj', id: 'obj_ss_shichirin', x: SS_SHICHIRIN[0], y: SS_SHICHIRIN[1], script: 'obj_ss_shichirin' } as unknown as MapObj,
      { t: 'npc', id: 'ss_pero', sprite: PERO, x: SS_PERO_AT[0], y: SS_PERO_AT[1], dir: 'right', script: 'ss_pero', cond: { when: awayNow } } as unknown as MapObj,
    );
    registerMap(def);
  }
}

// 集会所の お茶の 台の 皿（わたした あと。エンディングの カット2d にも ある）
{
  const def = getMapDef('map_hoshi_school');
  if (def) {
    def.objects.push({ t: 'prop', prop: 'prop_ss_sara', x: 1, y: 4, cond: { flag: SF.kucho } } as unknown as MapObj);
    registerMap(def);
  }
}

// ================================================================ 大写し「七輪」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const RX = SX + 208;
/** 焼き色の 目盛り（右の 列の 上。指で 隠れない）。 */
const GX = RX + 70;
const GY = 6;
const GH = 52;
const KEYS_Y = 74;
/** 焼き色 0〜1 が 1 まで 行く ms。よい 色は この 間。 */
const COOK_MS = 2600;
const YOI: [number, number] = [0.56, 0.8];

type Phase = 'kushi' | 'yaku' | 'pan' | 'kuji';

/** シシトウ 1本（横向き。x,y：左の はし、len 長さ。heat 0〜1 で 焼き色）。 */
function drawShishito(g: Gfx, x: number, y: number, len: number, heat: number, burst = 0): void {
  const green = heat < 0.35 ? '#4E9A3A' : heat < 0.7 ? '#5A8A34' : heat < 0.9 ? '#4E6A2A' : '#3A4220';
  const lt = heat < 0.5 ? '#86C860' : '#7AA048';
  const dk = '#2E5A22';
  if (burst > 0) {
    // split open, a puff of steam
    for (let i = 0; i < len; i += 2) g.rect(x + i, y + 2 + Math.round(Math.sin(i) * burst * 2), 2, 3, green);
    for (let k = 0; k < 6; k++) g.px(x + len / 2 + Math.round(Math.cos(k) * (6 + burst * 10)), y - 2 + Math.round(Math.sin(k * 2) * burst * 6), '#F4F1E8');
    return;
  }
  // a long, slightly bent pod: the stalk on the left, the tip on the right
  for (let i = 0; i < len; i++) {
    const t = i / len;
    // a plump pod, blunt at the tip, a little wavy (shishito are wrinkled)
    const h = t < 0.1 ? 5 + Math.round(t * 30) : t > 0.82 ? Math.max(3, Math.round(8 - ((t - 0.82) / 0.18) * 5)) : 8 + (Math.floor(i / 5) % 2);
    const bend = Math.round(Math.sin(t * Math.PI) * 2);
    g.rect(x + i, y + 4 - Math.floor(h / 2) + bend, 1, h, green);
    g.px(x + i, y + 4 - Math.floor(h / 2) + bend, lt);
    g.px(x + i, y + 4 + Math.ceil(h / 2) - 1 + bend, dk);
    if (i % 7 === 3 && t > 0.15 && t < 0.8) g.px(x + i, y + 4 + bend, dk);
  }
  g.rect(x - 4, y + 2, 5, 2, '#6A8A3A');
  g.rect(x - 6, y + 1, 2, 2, '#8A9A4A');
  // the char marks of the net
  if (heat > 0.45) for (let i = 4; i < len - 2; i += 6) g.rect(x + i, y + 2 + Math.round(Math.sin((i / len) * Math.PI) * 2), 2, 5, heat > 0.85 ? '#1A1A12' : '#3A3A1C');
}

export class ShichirinPanel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  /** はじめの カード（改善会議 10-25 の1、ui/closeup.ts）。 */
  howto = HOWTO.shishito;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  active = false;
  phase: Phase = 'kushi';
  /** 1回目（6本 ＋ グソっ君の 1本）か、2回目から（3本）。 */
  first: boolean;
  /** 串を さした 数（0〜2）と、さしている 動き（ms 残り）。 */
  kushi = 0;
  kushiT = 0;
  /** グソっ君が 網に のせた 1本（1回目）。 */
  loose = false;
  /** 焼き色（0〜1）と、返した 数。 */
  heat = 0;
  flips = 0;
  /** 面ごとの 焼き色。 */
  sides: number[] = [0, 0];
  burst = 0;
  /** くじ：えらんでいる 1本。 */
  sel = 0;
  /** 押した 結果（台本が 読む）。 */
  result: 'press' | 'cancel' | null = null;
  private armT = 0;
  private wasActive = false;
  private autoT = 0;
  autoPick = 1;

  constructor(first: boolean) {
    this.first = first;
    if (!first) {
      this.kushi = 1;
      this.phase = 'yaku';
    }
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.kushiT > 0) this.kushiT = Math.max(0, this.kushiT - dt);
    if (this.burst > 0 && this.burst < 1) this.burst = Math.min(1, this.burst + dt / 500);
    if (this.active !== this.wasActive) {
      this.wasActive = this.active;
      this.armT = 0;
    }
    if (this.active) this.armT += dt;
    if (this.active && this.phase === 'yaku' && !this.result) {
      this.heat = Math.min(1, this.heat + dt / COOK_MS);
      // (left too long: it turns itself — burnt)
      if (this.heat >= 1) this.result = 'press';
    }
    if (!this.active || this.result || this.armT < 150) return;
    if (this.auto) {
      this.autoT += dt;
      if (this.phase === 'kuji') {
        if (this.autoT > 500 && this.sel !== this.autoPick) {
          this.autoT = 0;
          this.sel += this.autoPick > this.sel ? 1 : -1;
          se('se_cursor', { vol: 0.3 });
        } else if (this.autoT > 700) this.result = 'press';
      } else if (this.phase === 'yaku') {
        if (this.heat >= (YOI[0] + YOI[1]) / 2) this.result = 'press';
      } else if (this.autoT > 700) this.result = 'press';
      return;
    }
    if (this.phase === 'kuji') {
      const mv = input.pressed('left') ? -1 : input.pressed('right') ? 1 : 0;
      if (mv) {
        const n = Math.max(0, Math.min(2, this.sel + mv));
        if (n !== this.sel) {
          this.sel = n;
          se('se_cursor', { vol: 0.3 });
        }
      }
    }
    if (input.pressed('confirm')) this.result = 'press';
    else if (input.pressed('cancel') && this.phase !== 'kuji' && this.phase !== 'pan') this.result = 'cancel';
  }

  keys(): string[] {
    if (this.phase === 'kushi') return SS_UI.keysKushi;
    if (this.phase === 'yaku') return SS_UI.keysYaku;
    if (this.phase === 'kuji') return SS_UI.keysKuji;
    return [];
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
        if (this.active) this.keys().forEach((l, i) => g.text(l, RX, oy + KEYS_Y + i * 16, { color: '#FFE7A3' }));
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(SS_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, SS_UI.place, { seed: 88 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  private drawScene(g: Gfx, oy: number): void {
    const W = RX - SX - 4;
    // the night: the 縁側's boards, the lantern-light from the house
    g.rect(SX, oy, W, CH, '#1E1A2A');
    g.rect(SX, oy + CH - 30, W, 30, '#3A2E26');
    for (let x = SX; x < SX + W; x += 22) g.rect(x, oy + CH - 30, 1, 30, '#2A2018');
    g.rect(SX, oy + CH - 31, W, 1, '#5A4636');
    const cx = SX + Math.round(W / 2);
    if (this.phase === 'kushi') {
      // the cutting board and the pods on it, big (two rows of three; グソっ君's one at the side)
      g.rect(SX + 12, oy + 18, W - 24, 76, '#B08A5A');
      g.rect(SX + 12, oy + 18, W - 24, 2, '#D0AA76');
      g.rect(SX + 12, oy + 92, W - 24, 2, '#7A5A3A');
      for (let r = 0; r < 2; r++) {
        const y = oy + 32 + r * 30;
        for (let i = 0; i < 3; i++) drawShishito(g, SX + 34 + i * 48, y, 38, 0);
        const done = r < this.kushi || (r === this.kushi && this.kushiT > 0);
        if (done) {
          const u = r === this.kushi && this.kushiT > 0 ? 1 - this.kushiT / 500 : 1;
          const x1 = SX + 22 + Math.round((W - 40) * u);
          g.rect(SX + 22, y + 4, x1 - SX - 22, 1, '#E8D8A8');
          g.rect(SX + 22, y + 5, x1 - SX - 22, 1, '#A8946A');
        }
      }
      if (!this.loose) drawShishito(g, SX + W - 46, oy + 82, 26, 0);
      return;
    }
    if (this.phase === 'kuji') {
      // on the 縁側's boards, the plate: three grilled ones, big; the one being chosen lifted, a small arrow
      g.rect(cx - 84, oy + 40, 168, 34, '#E8E4D8');
      g.rect(cx - 84, oy + 72, 168, 2, '#B8B2A0');
      for (let i = 0; i < 3; i++) {
        const lift = i === this.sel && this.active ? -4 : 0;
        drawShishito(g, cx - 70 + i * 52, oy + 52 + lift, 40, 0.62);
        if (i === this.sel && this.active) {
          const ax = cx - 50 + i * 52;
          for (let k2 = 0; k2 < 4; k2++) g.rect(ax - 3 + k2, oy + 30 + k2, 7 - k2 * 2, 1, '#FFE7A3');
        }
      }
      return;
    }
    // the 七輪 from the side, a little above: the clay body, the net laid flat on its mouth, the coals' glow under it
    const top = oy + 58;
    for (let y = top; y < oy + CH - 6; y++) {
      const half = Math.round(64 - (y - top) * 0.3);
      g.rect(cx - half, y, half * 2, 1, (y - top) % 9 === 0 ? '#9A6A42' : '#B8834E');
    }
    g.rect(cx - 30, oy + CH - 26, 60, 12, '#5A3A22');
    // the mouth seen from above (a flat oval), the coals inside
    const my = top - 14;
    for (let y = -14; y <= 0; y++) {
      const w = Math.round(68 * Math.sqrt(Math.max(0, 1 - ((y + 7) * (y + 7)) / 64)));
      g.rect(cx - w, top + y, w * 2, 1, y < -12 || y > -2 ? '#D09A62' : '#3A2018');
    }
    for (let i = 0; i < 16; i++) g.px(cx - 56 + i * 7 + Math.round(Math.sin(this.t / 200 + i) * 2), my + 6 + (i % 3) * 2, i % 3 ? '#FF6A2A' : '#FFE7A3');
    g.alpha(0.35, () => g.rect(cx - 56, my + 2, 112, 10, '#E8482A'));
    // the net (lines across, foreshortened)
    g.alpha(0.75, () => {
      for (let x = cx - 64; x <= cx + 64; x += 8) g.line(x, my - 2, Math.round(cx + (x - cx) * 1.08), top - 1, '#9A9A94');
      for (let y = my - 2; y <= top - 1; y += 4) g.rect(cx - 66, y, 133, 1, '#9A9A94');
    });
    // on the net: the skewered ones (one or two skewers), グソっ君's loose one
    const side = this.sides[this.flips % 2] ?? 0;
    const heatShown = Math.max(this.heat, side);
    const rows = this.first ? 2 : 1;
    for (let r = 0; r < rows; r++) {
      const y = my - 8 + r * 7;
      g.rect(cx - 72, y + 4, 144, 1, '#E8D8A8');
      for (let i = 0; i < 3; i++) drawShishito(g, cx - 58 + i * 40, y, 34, heatShown);
    }
    if (this.loose) drawShishito(g, cx + 10, my + 6, 30, heatShown, this.burst);
    // smoke
    for (let i = 0; i < 4; i++) {
      const sx = cx - 30 + i * 20 + Math.round(Math.sin(this.t / 300 + i) * 4);
      const sy = oy + 6 + ((this.t / 30 + i * 13) % 30);
      g.alpha(0.25, () => g.circle(Math.round(sx), Math.round(sy), 3, '#C8C4D0'));
    }
    if (this.phase === 'pan' && this.burst > 0) g.text('パンッ！', cx - 24 + Math.round(Math.sin(this.t / 30)), oy + 4, { color: '#FFE7A3', outline: '#1E1612' });
  }

  private drawSide(g: Gfx, oy: number): void {
    // the three steps
    SS_UI.dan.forEach((d, i) => {
      const cur = (this.phase === 'kushi' && i === 0) || ((this.phase === 'yaku' || this.phase === 'pan') && i === 1) || (this.phase === 'kuji' && i === 2);
      g.text(d, RX, oy + 4 + i * 16, { color: cur ? '#FFE7A3' : '#8A84A0' });
    });
    // the 焼き色 gauge, up at the top of the column (never under a finger): green at the foot, browner up, the good band
    if (this.phase === 'yaku' || this.phase === 'pan') {
      const gx = GX;
      const gy = oy + GY;
      g.text(SS_UI.iro, gx - 6, gy - 2, { color: '#F4ECD8' });
      const by = gy + 14;
      g.rect(gx, by, 12, GH, '#1A1626');
      const bandTop = by + GH - Math.round(YOI[1] * GH);
      const bandH = Math.round((YOI[1] - YOI[0]) * GH);
      g.rect(gx - 2, bandTop, 16, bandH, '#6A5A2A');
      const h = Math.round(this.heat * GH);
      for (let y = 0; y < h; y++) {
        const t = y / GH;
        g.rect(gx + 2, by + GH - 1 - y, 8, 1, t < 0.4 ? '#5A9A3A' : t < YOI[0] ? '#8A8A3A' : t < YOI[1] ? '#C88A3A' : '#5A3A22');
      }
      g.frame(gx - 1, by - 1, 14, GH + 2, '#8A84A0');
    }
  }
}

function* openPanel(p: ShichirinPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: ShichirinPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

/** Wait for a press in the panel (false: the player backed out). */
function* press(p: ShichirinPanel): Co<boolean> {
  p.result = null;
  p.active = true;
  while (!p.result) yield null;
  p.active = false;
  return p.result === 'press';
}

let qaAuto = false;
let qaWho: SsWho | null = null;

/** 前の 回と ちがう 人（1回目は 3人から）。 */
function pickWho(): SsWho {
  if (qaWho) return qaWho;
  const last = SS_WHO[flag(SF.last) - 1];
  const pool = SS_WHO.filter((w) => w !== last);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 3 七輪 → 4 くじ。当たった 人（やめたら null）。 */
function* shichirin(first: boolean): Co<SsWho | null> {
  const p = new ShichirinPanel(first);
  p.auto = qaAuto;
  let who: SsWho | null = null;
  try {
    yield* openPanel(p);
    if (first) {
      yield* say(T.SS_ANA);
      yield* say(T.SS_KUSHI_RULE);
      while (p.kushi < 2) {
        if (!(yield* press(p))) return null;
        se('se_examine', { vol: 0.5 });
        p.kushiT = 500;
        yield 500;
        p.kushi++;
      }
      yield 300;
      p.loose = true;
      se('se_examine', { vol: 0.3, pitch: 1.3 });
      yield* say(T.SS_NOSE);
    }
    p.phase = 'yaku';
    if (first) yield* say(T.SS_KAESU_RULE);
    se('se_c3_teppan', { vol: 0.25 });
    for (let k = 0; k < 2; k++) {
      p.heat = 0;
      if (!(yield* press(p))) return null;
      const h = p.heat;
      p.sides[k] = h;
      p.flips++;
      se('se_examine', { vol: 0.4, pitch: 0.8 });
      const iro = h < YOI[0] ? 'nama' : h <= YOI[1] ? 'yoi' : 'koge';
      if (iro === 'yoi' && !flag(SF.iro)) {
        setFlag(SF.iro, 1);
        yield* say(T.SS_IRO.yoi);
      } else if (iro !== 'yoi' && first) yield* say(T.SS_IRO[iro]);
      p.heat = 0;
    }
    if (first) {
      p.phase = 'pan';
      yield 400;
      p.burst = 0.01;
      se('se_c3_hajiku', { vol: 0.6 });
      shake(1, 160);
      yield 600;
      yield* say(T.SS_PAN);
    }
    p.phase = 'kuji';
    yield* say(first ? T.SS_ATARI_A : T.SS_ATARI_AGAIN);
    if (first) yield* say(T.SS_KUJI_RULE);
    p.sel = 1;
    who = pickWho();
    p.autoPick = who === 'shun' ? 0 : 1;
    yield* press(p);
    se('se_examine', { vol: 0.4 });
    yield 300;
  } finally {
    yield* closePanel(p);
  }
  return who;
}

/** 4 当たった 人の 場面、5・6。 */
function* atari(who: SsWho, first: boolean): Co {
  if (who === 'shun') {
    se('se_c3_hajiku', { vol: 0.25, pitch: 1.6 });
    shake(1, 200);
  }
  yield* say(T.SS_HIT[who]);
  const fresh = !flag(hitF(who));
  setFlag(hitF(who), 1);
  setFlag(SF.last, SS_WHO.indexOf(who) + 1);
  setFlag(SF.n, flag(SF.n) + 1);
  if (first) {
    yield* say(T.SS_KIME);
    for (let i = 0; i < 2; i++) addItem(YAKI);
    setFlag(SF.done, 1);
    addMp(2);
    se('se_item');
    yield* runMsg(T.SS_REWARD);
    yield* getKeyItem(SARA, T.SS_GET_SARA, false);
    return;
  }
  if (fresh) {
    se('se_page');
    yield* runMsg(T.SS_PAGE_ADD);
  }
  if (ssHitN() >= 3 && !flag(SF.minna)) {
    setFlag(SF.minna, 1);
    yield* say(T.SS_MINNA);
  }
}

/** 縁側の ペロ、または 七輪：実が そろっていれば 焼く。 */
function* engawa(): Co {
  if (!haveMi()) {
    yield* say(T.SS_WAIT);
    return;
  }
  if (!knWith()) {
    yield* say(T.SS_NO_KN);
    return;
  }
  const first = !flag(SF.done);
  if (first && flag('flag_hg_done') && !flag(SF.hagama)) {
    setFlag(SF.hagama, 1);
    yield* say(T.SS_HAGAMA);
  }
  const who = yield* shichirin(first);
  if (!who) return;
  if (!first) setFlag(SF.newMi, 0);
  yield* atari(who, first);
  // he takes the plate out to the 3号 house again
  yield* backHome();
}

/** ペロが 縁側から 3号ハウスへ もどる。 */
function* backHome(): Co {
  const f = field();
  if (f?.actorById('ss_pero')) {
    yield* walk('ss_pero', [[7, 45], [4, 45]], { speed: 2.4 });
    despawn('ss_pero');
  }
  setFlag(SF.away, 0);
}

registerScript('ss_pero', function* (): Co {
  yield* engawa();
});

registerScript('obj_ss_shichirin', function* (): Co {
  se('se_examine');
  if (awayNow()) {
    yield* engawa();
    return;
  }
  yield* say(T.SS_SHICHIRIN);
});

/** 株：とる（1回目は 2つで 6本と グソっ君の 1本、2回目からは 小さい 実 3本）。 */
registerScript('obj_ss_kabu', function* (ctx: ScriptCtx): Co {
  se('se_examine');
  const i = ctx.source === 'obj_ss_kabu_1' ? 1 : 0;
  if (hStage() === 0 && !pgOn()) {
    yield* say(T.SS_KABU_DARK);
    return;
  }
  if (!ssOpen() || !flag(SF.start)) {
    yield* say(T.SS_KABU);
    return;
  }
  if (!flag(SF.done)) {
    if (flag(kabuF(i))) {
      yield* say(T.SS_KABU_DONE);
      return;
    }
    setFlag(kabuF(i), 1);
    yield* say(flag(kabuF(1 - i)) > 0 ? T.SS_TORU_2 : T.SS_TORU);
    se('se_item', { vol: 0.4 });
    yield* say(T.SS_GOT);
    return;
  }
  // 2回目から：新しい 小さい 実（どちらの 株でも）
  if (flag(SF.newMi) === 2) {
    yield* say(T.SS_KABU_DONE);
    return;
  }
  yield* say(T.SS_KABU_NEW);
  setFlag(SF.newMi, 2);
  se('se_item', { vol: 0.4 });
  yield* say(T.SS_GOT);
});

/** 2回目から：ペロに 話して、縁側へ（暗転）。 */
function* again(): Co<boolean> {
  const i = yield* say(T.SS_AGAIN_ASK);
  if (i !== 0) {
    yield* say(T.SS_AGAIN_NO);
    return true;
  }
  const f = F();
  yield* game.fadeOut(400, '#0B0B14');
  setFlag(SF.away, 1);
  f.loadMap(VILLAGE, SS_SHICHIRIN[0], SS_SHICHIRIN[1] + 1, 'up');
  f.syncFollower(true);
  f.snapCamera();
  yield* game.fadeIn(400);
  yield 200;
  yield* engawa();
  if (flag(SF.away)) yield* backHome();
  return true;
}

/** 1 ペロの〔shishito〕（した とき true）。 */
function* peroShishito(): Co<boolean> {
  if (pgOn() || !onMap(VILLAGE)) return false;
  const s = hStage();
  if (s === 0) {
    // 段階0：今の 会話の あと、もう 1回 で 1 の 台詞だけ（1回）
    if (flag(SF.heard) < 1 || flag(SF.h0)) return false;
    setFlag(SF.h0, 1);
    yield* say(T.SS_A_H0);
    return true;
  }
  if (!ssOpen()) return false;
  if (!flag(SF.start)) {
    // (the lantern's own lines first: heard once in h1 or later)
    if (flag(SF.heard) < 2) return false;
    if (!knWith()) {
      yield* say(T.SS_NO_KN);
      return true;
    }
    yield* say(flag(SF.h0) ? T.SS_A_LIT : T.SS_A);
    setFlag(SF.start, 1);
    // he gets up and goes round to the 縁側 (the 七輪)
    const f = F();
    const a = f.actorById(PERO);
    if (a) {
      pose(PERO, null);
      a.ox = 0;
      a.oy = 0;
      yield* walk(PERO, [[3, 33], [3, 37]], { speed: 2.4 });
    }
    setFlag(SF.away, 1);
    despawn(PERO);
    return true;
  }
  if (flag(SF.done) && !flag(SF.after)) {
    setFlag(SF.after, 1);
    yield* say(T.SS_AFTER);
    return true;
  }
  if (flag(SF.done) && flag(SF.newMi) === 2) return yield* again();
  return false;
}

wrap(PERO, function* (_ctx, orig): Co {
  if (yield* peroShishito()) return;
  yield* orig();
  // 1：段階0 で 聞いた、2：灯りの あと（段階1〜2）で 聞いた
  if (onMap(VILLAGE) && !pgOn() && hStage() <= 2) setFlag(SF.heard, Math.max(flag(SF.heard), hStage() >= 1 ? 2 : 1));
});

/** かくし：寄り合いの 皿を 集会所の ハモ区長へ（1回）。 */
wrap('npc_hoshi_kucho', function* (_ctx, orig): Co {
  if (onMap('map_hoshi_school') && state.inventory.includes(SARA) && !flag(SF.kucho)) {
    removeItem(SARA);
    setFlag(SF.kucho, 1);
    se('se_examine');
    yield* say(T.SS_KUCHO);
    return;
  }
  yield* orig();
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.shishito(step = 'pero', auto = false, who = null)（段階1、トマトの 灯り）
 *   'pero'    今の 会話を 聞いた あと、3号ハウスの 前の ペロの 前 (4,32) 西向き（話すと〔shishito〕）
 *   'h0'      段階0、ペロの 前（今の 会話の あと：1 の 台詞だけ）
 *   'kabu'    〔shishito〕の あと、株の 前 (11,44) 上向き
 *   'engawa'  株を 2つ とった あと、縁側の ペロの 前 (7,45) 上向き（話すと 大写し）。who で 当たる 人
 *   'again'   すんだ あと、新しい 実を とって、3号ハウスの 前の ペロの 前（もう 1回）
 *   'kucho'   皿を 持って、集会所の 区長の 前 (6,4) 上向き
 */
if (import.meta.env.DEV) {
  registerDebug('shishito', (step = 'pero', auto = false, who: SsWho | null = null) => {
    if (step === 'h0') cmd().jump?.('ch2:house', true);
    else cmd().jump?.('ch2:houki', true);
    for (const id of Object.values(SF)) setFlag(id, 0);
    for (const w of SS_WHO) setFlag(hitF(w), 0);
    SS_KABU.forEach((_, i) => setFlag(kabuF(i), 0));
    for (const it of [YAKI, SARA]) while (state.inventory.includes(it)) removeItem(it);
    qaAuto = !!auto;
    qaWho = who;
    setFlag(SF.heard, step === 'h0' ? 1 : 2);
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (step === 'h0' || step === 'pero') return go(VILLAGE, 4, 32, 'left');
    setFlag(SF.start, 1);
    setFlag(SF.away, 1);
    if (step === 'kabu') return go(VILLAGE, 11, 44, 'up');
    SS_KABU.forEach((_, i) => setFlag(kabuF(i), 1));
    if (step === 'engawa') return go(VILLAGE, SS_PERO_AT[0], SS_PERO_AT[1] + 1, 'up');
    setFlag(SF.away, 0);
    setFlag(SF.done, 1);
    setFlag(SF.after, 1);
    setFlag(SF.iro, 1);
    setFlag(hitF('kn'), 1);
    setFlag(SF.last, 2);
    if (step === 'again') {
      setFlag(SF.newMi, 2);
      return go(VILLAGE, 4, 32, 'left');
    }
    addItem(SARA);
    return go('map_hoshi_school', 6, 4, 'up');
  });

  registerDebug('ssState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(SF)) flags[k] = flag(id);
    for (const w of SS_WHO) flags[`hit_${w}`] = flag(hitF(w));
    SS_KABU.forEach((_, i) => (flags[`kabu_${i}`] = flag(kabuF(i))));
    const p = game.ui.widgets.find((w) => w instanceof ShichirinPanel) as ShichirinPanel | undefined;
    const f = field();
    return {
      flags,
      open: ssOpen(),
      items: state.inventory.filter((i) => i.startsWith('item_ss_')),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      panel: p ? { phase: p.phase, kushi: p.kushi, heat: +p.heat.toFixed(2), flips: p.flips, sel: p.sel, active: p.active } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines; the panel's words in their room. */
export function ssTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足', '平和', '17', '3人', '海ぞい', '水族館', 'いただきます', 'ほどよい', '焼き芋 食うか', 'ロシアン', '10本', 'そうかも しれん', 'らっきょ', 'さすが 師匠', 'おかわり', '干しすぎ', 'ダンゴムシ'];
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
  walkT('ss', T.SS_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of [...SS_UI.keysKushi, ...SS_UI.keysYaku, ...SS_UI.keysKuji, ...SS_UI.dan]) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  if (measure(SS_UI.dan.reduce((a, b) => (measure(a) > measure(b) ? a : b))) > GX - RX - 8) bad.push('右の 列: 段の 名前が 目盛りに かかる');
  if (KEYS_Y + 2 * 16 > CH) bad.push(`keys: bottom ${KEYS_Y + 2 * 16} > ${CH}`);
  if (GY + 14 + GH > KEYS_Y) bad.push('目盛りが 鍵に かかる');
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('ssText', () => ssTextCheck());
