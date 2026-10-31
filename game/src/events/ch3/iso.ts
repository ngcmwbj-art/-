// 本日は、開館です（第3章の クリア後の 昼。げむきか 10/14 の 案3、2026-10-15 依頼主の 採用。05_postgame 2.3
// yr_c3_iso、03_ch3_index）。文は data/text/c3_iso.ts、地図は data/maps/c3_iso.ts、絵は art/props/c3_iso_art.ts、
// みました帳の ページは ui/menu/book_iso.ts。
//
//   ・券売所の ポコシャ（c3_poko_c4。クリア後、グソっ君と いっしょ）→ 1 開館の 準備中（flag_iso_start、
//     item_iso_nafuda）。旧水族館の 前の ハキコ → 2（flag_iso_hakiko）。
//   ・岬（map_c3_misaki）の 旧水族館の 前の 広場の 南の はし (25,16) の 石段 (25,17)：クリア後の 昼（11:00〜14:59）、グソっ君と、
//     その 日 まだ 満ちていない 間だけ 下りられる（door_c3_iso）。第3章の 段階1〜2 は ロープ『潮が 止まって います』。
//   ・岬の 磯 map_c3_iso：石・潮だまり・割れ目・乾いた 岩を 調べる → 大写し「石めくり」（IsoPanel）。
//     石は けってい で めくる → 見る → もう 1回で もどす（自分で もどした 石 flag_iso_ishi_<i> = 1、
//     もどさずに 離れると グソっ君が もどす = 2）。見た 子 flag_iso_seen_<id>。フナムシは 逃げる（flag_iso_funa_n）。
//     潮の めもり：昼の 時計と、大写しの 中に いた 時間で 上がる。満ちたら 石段の 上へ（flag_iso_mitsu_day）。
//   ・券売所：見た 子の 名札を 1枚ずつ（flag_iso_card_<id>、磯の 杭に 立つ）→ 6枚で 深海の 展示室の
//     いちばん 奥の 空の 水槽（flag_iso_oku）→ ちいさな 開館 → 順路（深海・磯）→ 入口で「本日は、開館です」
//     （flag_iso_kaikan：やり残しの 行 yr_c3_iso の 済んだ 印）。朱肉 ぜんぶ、ページ。
//   ・そのあと：入口の 貼り紙『本日 開館』、ハキコは 入口の ベンチ（iso_hakiko_bench）、ポコシャは「開館中」。
//     伝票・日誌・えさの 札は 今の まま 拾える（館の 中の 物は さわらない）。
//
// QA：__game.cmd.iso(step, auto)、isoState()、isoText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, removeItem, setFlag, state, type Dir } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { registerWorldFx } from '../../world/fx';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { pgAqOpen, pgBand, pgDay, pgMin, pgOn } from '../../world/postgame';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import { fillNames } from '../../data/text/c3_names';
import * as T from '../../data/text/c3_iso';
import { ISO_CARDS, ISO_UI } from '../../data/text/c3_iso';
import { ISO_H, ISO_ROWS, ISO_SPOTS, ISO_STONES, ISO_W } from '../../data/maps/c3_iso';
import { getKeyItem, giveKey } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { addToMap, say3 } from './common';
import { jumpMap } from './prologue';
import { HOWTO } from '../../data/text/howto';
import { closeupWide } from '../../ui/closeup_wide';

export const IF = {
  start: 'flag_iso_start',
  hakiko: 'flag_iso_hakiko',
  first: 'flag_iso_first',
  funa: 'flag_iso_funa_n',
  funa3: 'flag_iso_funa_3',
  miniTold: 'flag_iso_mini_told',
  cardFirst: 'flag_iso_card_first',
  oku: 'flag_iso_oku',
  kaikan: 'flag_iso_kaikan',
  scene: 'flag_iso_scene',
  mitsuDay: 'flag_iso_mitsu_day',
  tideDay: 'flag_iso_tide_day',
  tideS: 'flag_iso_tide_s',
  knModoshi: 'flag_iso_kn_modoshi',
  fuchi: 'flag_iso_fuchi',
} as const;

/** 石の 下（12）：空は ''。 */
export const ISO_STONE_IN = ['', 'hizara', '', '', '', 'isogani', '', '', 'iboni', '', '', ''];
const CARD_IDS = Object.keys(ISO_CARDS);
const MINI_IDS = ['agohaze', 'iboni', 'tamakibi'];
const seenF = (id: string) => `flag_iso_seen_${id}`;
const ishiF = (i: number) => `flag_iso_ishi_${i}`;
const cardF = (id: string) => `flag_iso_card_${id}`;

function knWith(): boolean {
  const f = field();
  return flag('flag_pg_kn') > 0 && !flag('flag_follower_hidden') && !!f?.follower?.visible;
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

/** 磯へ 下りられる：クリア後の 昼、その 日 まだ 満ちていない、グソっ君と いっしょ。 */
function isoOpen(): boolean {
  return pgOn() && pgBand() === 'hiru' && flag(IF.mitsuDay) !== pgDay();
}

/** 12の 石を 全部 自分で もどした。 */
export function isoSelfAll(): boolean {
  return ISO_STONES.every((_, i) => flag(ishiF(i)) === 1);
}

/** 潮の めもり 0〜1：昼の 時計と、大写しの 中に いた 時間（その 日の 分）。 */
function tideNow(extraS = 0): number {
  const clock = (pgMin() - 11 * 60) / (4 * 60);
  const panel = (flag(IF.tideDay) === pgDay() ? flag(IF.tideS) : 0) + extraS;
  return Math.max(0, Math.min(1, clock + panel / 300));
}

// ================================================================ 地図の 物

const NPC = (o: Record<string, unknown>): MapObj => ({ t: 'npc', ...o }) as unknown as MapObj;
const sc = (n: number) => (): boolean => flag(IF.scene) === n;

// (on the cape since 2026-10-20: map_c3_misaki, the old aquarium's front moved out of the town)
addToMap('map_c3_misaki', [
  // the steps down to the cape's shore (south end of the aquarium's plaza): the stones of the steps, always
  { t: 'prop', prop: 'prop_iso_dan', x: 25, y: 17 } as unknown as MapObj,
  { t: 'door', id: 'door_c3_iso', x: 25, y: 17, step: true, to: 'map_c3_iso', tx: 23, ty: 2, dir: 'down', se: 'se_step_stone', cond: { when: () => isoOpen() && knWith() } } as unknown as MapObj,
  { t: 'prop', prop: 'prop_iso_rope', x: 25, y: 17, solid: [0, 0, 1, 1], cond: { when: () => !pgOn() || pgBand() !== 'hiru' || flag(IF.mitsuDay) === pgDay() } } as unknown as MapObj,
  { t: 'obj', id: 'obj_iso_ishidan', x: 25, y: 17, face: 'down', script: 'obj_iso_ishidan', cond: { when: () => !(isoOpen() && knWith()) } } as unknown as MapObj,
  // after the opening: ポコシャ's paper on the glass door
  { t: 'prop', prop: 'prop_iso_harigami', x: 27, y: 10, cond: { flag: IF.kaikan } } as unknown as MapObj,
  { t: 'obj', id: 'obj_iso_harigami', x: 27, y: 10, face: 'up', script: 'obj_iso_harigami', cond: { flag: IF.kaikan } } as unknown as MapObj,
  // the last scene at the door (7): ハキコ and ポコシャ in front of the glass
  NPC({ id: 'iso_hakiko_front', sprite: 'npc_c3_uketsuke', x: 26, y: 12, dir: 'up', script: 'iso_hakiko_bench', cond: { when: sc(5) } }),
  NPC({ id: 'iso_poko_front', sprite: 'npc_pokosha', x: 28, y: 12, dir: 'left', script: 'iso_poko_quiet', cond: { when: sc(5) } }),
]);

addToMap('map_c3_aq_iriguchi', [
  // the first visitor at the glass door (6), then on the bench inside the door (after)
  NPC({ id: 'iso_hakiko_in', sprite: 'npc_c3_uketsuke', x: 8, y: 10, dir: 'up', script: 'iso_hakiko_bench', cond: { when: sc(2) } }),
  NPC({ id: 'iso_hakiko_bench', sprite: 'npc_c3_uketsuke', x: 3, y: 3, dir: 'down', pose: 'sit', off: [0, -3], noTurn: true, script: 'iso_hakiko_bench', cond: { when: () => flag(IF.kaikan) > 0 && !flag(IF.scene) && (!pgOn() || pgAqOpen()) } }),
]);

addToMap('map_c3_aq_shinkai', [
  // ポコシャ by the empty tank (5), ハキコ on the route (6)
  NPC({ id: 'iso_poko_oku', sprite: 'npc_pokosha', x: 13, y: 2, dir: 'left', script: 'iso_poko_quiet', cond: { when: sc(1) } }),
  NPC({ id: 'iso_hakiko_oku', sprite: 'npc_c3_uketsuke', x: 11, y: 2, dir: 'up', script: 'iso_hakiko_bench', cond: { when: sc(3) } }),
]);

addToMap('map_c3_iso', [NPC({ id: 'iso_hakiko_iso', sprite: 'npc_c3_uketsuke', x: 9, y: 5, dir: 'down', script: 'iso_hakiko_bench', cond: { when: sc(4) } })]);

// ================================================================ 大写し「石めくり」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 列（磯の 図が 1マス 6px なので、ほかの 大写しより 広い）。 */
const RX = SX + 188;
/** 磯の 図：1マス 6px。 */
const TS = 6;
const MX = SX + 2;
const MY = SY + Math.floor((CH - ISO_H * TS) / 2);

interface Target {
  kind: 'ishi' | 'spot';
  i: number;
  id: string;
  x: number;
  y: number;
}

const TARGETS: Target[] = [
  ...ISO_STONES.map(([x, y], i) => ({ kind: 'ishi' as const, i, id: `ishi_${i}`, x, y })),
  ...Object.entries(ISO_SPOTS).map(([id, [x, y]], i) => ({ kind: 'spot' as const, i, id, x, y })),
];

export class IsoPanel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  /** はじめの カード（改善会議 10-25 の1、ui/closeup.ts）。 */
  howto = HOWTO.iso;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  active = false;
  sel = 0;
  /** めくって いる 石（-1 なし）。 */
  flipped = -1;
  result: string | null = null;
  /** この 大写しに いた 時間（秒、潮の めもり）。 */
  spent = 0;
  base = 0;
  funaRun = 0;
  autoT = 0;
  autoStep = 0;
  private ePress = false;
  private eCancel = false;

  target(): Target {
    return TARGETS[this.sel];
  }
  tide(): number {
    return tideNow(this.spent);
  }
  clearInput(): void {
    this.ePress = false;
    this.eCancel = false;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.funaRun > 0) this.funaRun = Math.max(0, this.funaRun - dt);
    if (this.active) this.spent += dt / 1000 / closeupWide(); // ひろい：潮が 満ちる まで ×1.5（改善会議 10-28 の5）
    if (input.pressed('confirm')) this.ePress = true;
    if (input.pressed('cancel')) this.eCancel = true;
    if (this.result || !this.active) return;
    if (this.tide() >= 1) {
      this.result = 'mitsu';
      return;
    }
    if (this.auto) {
      this.tickAuto(dt);
      return;
    }
    if (this.eCancel) {
      this.eCancel = false;
      this.result = this.flipped >= 0 ? `leave:${this.flipped}` : 'cancel';
      return;
    }
    const dir = input.repeat('right') ? [1, 0] : input.repeat('left') ? [-1, 0] : input.repeat('down') ? [0, 1] : input.repeat('up') ? [0, -1] : null;
    if (dir) {
      const n = this.nearest(dir[0], dir[1]);
      if (n >= 0 && n !== this.sel) {
        if (this.flipped >= 0) {
          this.result = `leave:${this.flipped}`;
          this.sel = n;
          return;
        }
        this.sel = n;
        se('se_cursor', { vol: 0.35 });
      }
      return;
    }
    if (this.ePress) {
      this.ePress = false;
      this.press();
    }
  }

  /** QA：石を 1つずつ めくって 自分で もどし、見る 所も 1つずつ。 */
  private tickAuto(dt: number): void {
    this.autoT += dt;
    if (this.autoT < 450) return;
    this.autoT = 0;
    if (this.flipped >= 0) {
      this.press();
      return;
    }
    // next not yet done
    for (let k = 0; k < TARGETS.length; k++) {
      const tg = TARGETS[k];
      const doneT = tg.kind === 'ishi' ? flag(ishiF(tg.i)) > 0 : flag(seenF(tg.id)) > 0 && (tg.id !== 'funamushi' || flag(IF.funa) >= 3);
      if (!doneT) {
        this.sel = k;
        this.press();
        return;
      }
    }
    this.result = 'cancel';
  }

  private press(): void {
    const tg = this.target();
    if (tg.kind === 'ishi') {
      if (this.flipped === tg.i) {
        this.flipped = -1;
        if (flag(ishiF(tg.i)) !== 2) setFlag(ishiF(tg.i), 1);
        se('se_step_stone', { vol: 0.5, pitch: 0.8 });
        this.result = `back:${tg.i}`;
        return;
      }
      this.flipped = tg.i;
      se('se_step_stone', { vol: 0.6, pitch: 1.2 });
      this.result = `flip:${tg.i}`;
      return;
    }
    if (tg.id === 'funamushi') this.funaRun = 1200;
    se('se_h_splash', { vol: 0.25, pitch: 1.4 });
    this.result = `spot:${tg.id}`;
  }

  /** その 向きで いちばん 近い 的（-1 なし）。 */
  private nearest(dx: number, dy: number): number {
    const c = this.target();
    let best = -1;
    let bd = Infinity;
    TARGETS.forEach((t, i) => {
      const ex = t.x - c.x;
      const ey = t.y - c.y;
      const along = ex * dx + ey * dy;
      if (along <= 0) return;
      const side = Math.abs(ex * dy - ey * dx);
      const d = along + side * 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }

  draw(g: Gfx): void {
    if (this.open <= 0) return;
    const k = ease.cubicOut(Math.min(1, this.open));
    const a = Math.min(1, this.open * 1.4);
    const dy = Math.round((1 - k) * -10);
    markText(PX, PY, PW, PH);
    drawWindow(g, PX, PY + dy, PW, PH, UI, a, { curl: false });
    g.alpha(a, () => {
      g.clip(SX, SY + dy, CW, CH, () => {
        this.scene(g, dy);
        this.side(g, SY + dy);
      });
      const tw = g.measure(ISO_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, ISO_UI.place, { seed: 71 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  private scene(g: Gfx, dy: number): void {
    const oy = MY + dy;
    g.rect(SX, SY + dy, RX - SX - 4, CH, '#2A5A82');
    // the shore from above: the rock, the cliff, the pools, the sea; the tide covers the low rows
    const tide = this.tide();
    const seaTop = 10 - tide * 2.6;
    for (let y = 0; y < ISO_H; y++)
      for (let x = 0; x < ISO_W; x++) {
        const ch = ISO_ROWS[y][x];
        const px = MX + x * TS;
        const py = oy + y * TS;
        let col = '#8E8A80';
        if (ch === 'K') col = y <= 1 ? '#4E4A44' : '#6A665E';
        else if (ch === 'p') col = '#3A7AA0';
        else if (ch === '~') col = '#2A5A82';
        else if (ch === 'z') col = '#6A7A78';
        else if (ch === 'n') col = '#B8B4A8';
        else if (ch === 'P') col = '#9A5A38';
        if (ch !== '~' && ch !== 'K' && y + 1 > seaTop + 0.5) col = '#3A6E96';
        g.rect(px, py, TS, TS, col);
        if (ch === 'r' && (x * 7 + y * 3) % 5 === 0) g.rect(px + 2, py + 3, 2, 1, '#A8A498');
        if (ch === 'p') g.rect(px + 1, py + 2, 3, 1, '#7AB8D8');
      }
    // the waves' line (the tide's edge)
    const wy = oy + Math.round(seaTop * TS);
    for (let x = 0; x < ISO_W * TS; x += 6) g.rect(MX + x + (Math.floor(this.t / 300) % 2) * 2, wy, 4, 1, '#DDF2FF');
    // the creatures that stay put (seen in the pools / on the rocks)
    for (const [id, [x, y]] of Object.entries(ISO_SPOTS)) this.drawCreature(g, id, MX + x * TS + 3, oy + y * TS + 3, false);
    // the stones (a flipped one lies beside its place, its creature on the wet patch)
    ISO_STONES.forEach(([x, y], i) => {
      const cx = MX + x * TS + 3;
      const cy = oy + y * TS + 3;
      if (this.flipped === i) {
        g.rect(cx - 3, cy - 2, 7, 5, '#5A564E');
        g.circle(cx + 6, cy - 3, 3, '#6A665E');
        const inside = ISO_STONE_IN[i];
        if (inside) this.drawCreature(g, inside, cx, cy, true);
      } else {
        g.circle(cx, cy, 3, '#62605A');
        g.circle(cx - 1, cy - 1, 2, '#B8B4A8');
        if (flag(ishiF(i)) === 1) g.px(cx + 2, cy + 2, '#D9483A');
      }
    });
    // the cursor
    const tg = this.target();
    if (this.active || this.flipped >= 0) {
      const blink = Math.floor(this.t / 300) % 2 === 0;
      g.ring(MX + tg.x * TS + 3, oy + tg.y * TS + 3, 5, blink ? '#FFE7A3' : '#B89A6A');
    }
  }

  /** 小さな 生き物（7px の マスに）。big：めくった 石の 下（少し 大きく）。 */
  private drawCreature(g: Gfx, id: string, x: number, y: number, big: boolean): void {
    const s = big ? 1 : 0;
    switch (id) {
      case 'yoroi':
        g.circle(x, y, 2 + s, '#6A7A5A');
        for (const [dx, dy] of [[-2, -1], [2, 0], [0, 2], [-1, 2]]) g.px(x + dx, y + dy, '#C8C0B0');
        break;
      case 'yadokari':
        g.circle(x, y, 2, '#C8A070');
        g.px(x + 2, y + 1, '#D9483A');
        g.px(x + 3, y + 1, '#D9483A');
        break;
      case 'agohaze':
        g.rect(x - 2, y, 5, 1, '#5A5040');
        g.px(x - 2, y - 1, '#5A5040');
        break;
      case 'kamenote':
        for (let i = 0; i < 4; i++) g.rect(x - 2 + i, y - 1 - (i % 2), 1, 3, '#5A5E50');
        break;
      case 'funamushi':
        if (this.funaRun > 0) {
          const k = 1 - this.funaRun / 1200;
          for (let i = 0; i < 4; i++) g.rect(x - 4 + i * 3 - Math.round(k * 10), y - 2 + (i % 2) * 3, 2, 1, '#3A3430');
        } else if (Math.floor(this.t / 2000) % 2 === 0 || !flag(seenF('funamushi'))) for (let i = 0; i < 3; i++) g.rect(x - 3 + i * 3, y - 1 + (i % 2) * 2, 2, 1, '#3A3430');
        break;
      case 'tamakibi':
        for (const [dx, dy] of [[-2, 0], [1, -1], [2, 2]]) g.px(x + dx, y + dy, '#4A3A30');
        break;
      case 'hizara':
        g.rect(x - 3, y - 1, 7, 3, '#7A6A5A');
        for (let i = 0; i < 8; i++) if (i < 7) g.px(x - 3 + i, y - 1, '#A89878');
        break;
      case 'isogani':
        g.rect(x - 2, y - 1, 5, 3, '#4A5A6A');
        g.px(x - 3, y - 2, '#4A5A6A');
        g.px(x + 3, y - 2, '#4A5A6A');
        break;
      case 'iboni':
        g.circle(x, y, 2, '#8A7A6A');
        g.px(x, y - 2, '#C8B8A0');
        break;
    }
  }

  private side(g: Gfx, oy: number): void {
    g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
    // the tide gauge: a column of water rising, a wave on top
    const gx = SX + CW - 14;
    const gy = oy + 6;
    const gh = 60;
    g.text(ISO_UI.shio, gx - 4, gy + gh + 2, { color: UI.bg2 });
    g.rect(gx, gy, 10, gh, '#4A4458');
    const lv = Math.round(gh * this.tide());
    g.rect(gx, gy + gh - lv, 10, lv, '#3A7AA0');
    g.rect(gx, gy + gh - lv, 10, 1, '#DDF2FF');
    g.frame(gx - 1, gy - 1, 12, gh + 2, UI.bg2);
    // the stones turned over (○/12) and the cards seen
    const n = ISO_STONES.filter((_, i) => flag(ishiF(i)) > 0).length;
    g.text(`${ISO_UI.ishi} ${n}/12`, RX, oy + 6, { color: UI.bg2 });
    const seen = CARD_IDS.filter((id) => flag(seenF(id))).length;
    for (let i = 0; i < 6; i++) g.rect(RX + i * 12, oy + 28, 9, 12, i < seen ? '#F4EEDC' : '#4A4458');
    const keys = this.flipped >= 0 ? ISO_UI.keysBack : ISO_UI.keys;
    if (this.active) keys.forEach((l, i) => g.text(l, RX, oy + 50 + i * 16, { color: '#FFE7A3' }));
    markText(RX - 4, oy, SX + CW - RX + 4, CH);
  }
}

let qaAuto = false;

function* openPanel(p: IsoPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: IsoPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

/** (read through a function: the loop's `result = null` narrows the field for TS) */
function resultOf(p: IsoPanel): string {
  return String(p.result);
}

/** その 生き物を 見た（はじめての 文 か「また 会えた」）。 */
function* seeCreature(id: string): Co {
  const first = !flag(seenF(id));
  setFlag(seenF(id), 1);
  if (id === 'funamushi') {
    const n = flag(IF.funa) + 1;
    setFlag(IF.funa, n);
    yield* say(first ? T.ISO_FIND.funamushi : T.ISO_FUNA_AGAIN);
    if (n >= 3 && !flag(IF.funa3)) {
      setFlag(IF.funa3, 1);
      yield* say(T.ISO_FUNA_3);
    }
    return;
  }
  yield* say(first ? T.ISO_FIND[id] : T.ISO_AGAIN);
}

/** 大写し（その 的から）：満ちたら 'mitsu'。 */
function* isoPanel(startAt: number, rule: boolean): Co<'cancel' | 'mitsu'> {
  const p = new IsoPanel();
  p.auto = qaAuto;
  p.sel = Math.max(0, startAt);
  let out: 'cancel' | 'mitsu' = 'cancel';
  if (flag(IF.tideDay) !== pgDay()) {
    setFlag(IF.tideDay, pgDay());
    setFlag(IF.tideS, 0);
  }
  try {
    yield* openPanel(p);
    if (rule) yield* say(T.ISO_RULE);
    for (;;) {
      p.clearInput();
      p.result = null;
      p.active = true;
      while (!p.result) yield null;
      p.active = false;
      const r = resultOf(p);
      if (r === 'cancel') break;
      if (r === 'mitsu') {
        if (p.flipped >= 0) {
          setFlag(ishiF(p.flipped), 2);
          setFlag(IF.knModoshi, 1);
          p.flipped = -1;
        }
        out = 'mitsu';
        break;
      }
      if (r.startsWith('leave:')) {
        const i = Number(r.slice(6));
        p.flipped = -1;
        setFlag(ishiF(i), 2);
        setFlag(IF.knModoshi, 1);
        se('se_step_stone', { vol: 0.4, pitch: 0.8 });
        yield* say(knWith() ? T.ISO_KN_MODOSU : `@narr\n石を、もとに もどした。`);
        // the cancel that left it: out
        if (p.target().kind === 'ishi' && p.target().i === i) break;
        continue;
      }
      if (r.startsWith('flip:')) {
        const i = Number(r.slice(5));
        const inside = ISO_STONE_IN[i];
        if (inside) yield* seeCreature(inside);
        else yield* say(T.ISO_KARA[i % T.ISO_KARA.length]);
        continue;
      }
      if (r.startsWith('back:')) continue;
      if (r.startsWith('spot:')) yield* seeCreature(r.slice(5));
    }
  } finally {
    setFlag(IF.tideS, (flag(IF.tideDay) === pgDay() ? flag(IF.tideS) : 0) + Math.round(p.spent));
    yield* closePanel(p);
  }
  return out;
}

/** 満ちた：石段の 上へ。 */
let leaving = false;
function* upTheSteps(text: string): Co {
  if (leaving) return;
  leaving = true;
  try {
    setFlag(IF.mitsuDay, pgDay());
    yield* say(text);
    yield* game.fadeOut(400, '#0B0B14');
    jumpMap('map_c3_misaki', 25, 16, 'up');
    field()?.syncFollower(true);
    yield 300;
    yield* game.fadeIn(500);
  } finally {
    leaving = false;
  }
}

registerScript('obj_iso_t', function* (ctx: ScriptCtx): Co {
  const id = ctx.source;
  let start = 0;
  const m = /^obj_iso_ishi_(\d+)$/.exec(id);
  if (m) start = Number(m[1]);
  else {
    const k = id.replace(/^obj_iso_spot_/, '');
    const i = TARGETS.findIndex((t) => t.kind === 'spot' && t.id === k);
    if (i >= 0) start = i;
    else {
      // the other pools: the nearest target
      const f = field();
      const px = f?.player.tileX ?? 0;
      const py = f?.player.tileY ?? 0;
      let bd = Infinity;
      TARGETS.forEach((t, j) => {
        const d = Math.abs(t.x - px) + Math.abs(t.y - py);
        if (d < bd) {
          bd = d;
          start = j;
        }
      });
    }
  }
  se('se_examine');
  const first = !flag('flag_iso_rule');
  setFlag('flag_iso_rule', 1);
  const r = yield* isoPanel(start, first);
  if (r === 'mitsu') yield* upTheSteps(T.ISO_MITSU);
});

registerScript('obj_iso_kui', function* (): Co {
  se('se_examine');
  yield* say(T.ISO_KUI);
});
registerScript('obj_iso_shusui', function* (): Co {
  se('se_examine');
  yield* say(T.ISO_SHUSUI);
});
registerScript('obj_iso_nishi', function* (): Co {
  se('se_examine');
  yield* say(T.ISO_NISHI);
});
registerScript('evt_iso_first', function* (): Co {
  if (flag(IF.first)) return;
  setFlag(IF.first, 1);
  yield* say(T.ISO_FIRST);
});

// the tide comes in with the afternoon (the band turns): up the steps
registerWorldFx({
  map: 'map_c3_iso',
  update() {
    if (leaving || flag(IF.scene) || !pgOn()) return;
    if (pgBand() === 'hiru' && tideNow() < 1) return;
    if (game.ui.widgets.some((w) => !(w as { done?: boolean }).done && (w as { modal?: boolean }).modal)) return;
    game.scripts.run(upTheSteps(T.ISO_MITSU));
  },
});

registerScript('obj_iso_ishidan', function* (): Co {
  se('se_examine');
  if (!pgOn()) yield* say3(T.ISO_ROPE_NOON);
  else if (pgBand() === 'hiru' && flag(IF.mitsuDay) === pgDay()) yield* say(T.ISO_ROPE_ASHITA);
  else if (pgBand() !== 'hiru') yield* say(T.ISO_ROPE_MITSU);
  else yield* say3(T.ISO_NEED_KN);
});

registerScript('obj_iso_harigami', function* (): Co {
  se('se_examine');
  yield* say(T.ISO_HARIGAMI);
});

registerScript('iso_hakiko_bench', function* (): Co {
  yield* say(T.ISO_HAKIKO_BENCH);
});
registerScript('iso_poko_quiet', function* (): Co {
  yield* say3(`@npc_pokosha\n……はい。`);
});

// ================================================================ 券売所の ポコシャ

/** 見た 名札の 子を 1枚ずつ わたす。わたした 数。 */
function* handCards(): Co<number> {
  let n = 0;
  for (const id of CARD_IDS) {
    if (!flag(seenF(id)) || flag(cardF(id))) continue;
    se('se_pen_write');
    if (!flag(IF.cardFirst)) {
      setFlag(IF.cardFirst, 1);
      yield* say(T.ISO_CARD_FIRST);
    } else yield* say(T.ISO_CARD_NEXT);
    yield* say(T.isoCardText(id));
    setFlag(cardF(id), 1);
    n++;
  }
  if (n) yield* say(T.ISO_CARD_KUI);
  if (MINI_IDS.some((id) => flag(seenF(id))) && !flag(IF.miniTold)) {
    setFlag(IF.miniTold, 1);
    yield* say(T.ISO_NOT_CARD);
  }
  field()?.refreshPresence();
  return n;
}

function* fadeTo(map: string, x: number, y: number, d: Dir, scene: number): Co {
  yield* game.fadeOut(400, '#0B0B14');
  setFlag(IF.scene, scene);
  jumpMap(map, x, y, d);
  field()?.syncFollower(true);
  field()?.refreshPresence();
  yield 300;
  yield* game.fadeIn(500);
}

/** 5 いちばん 奥の 名札。 */
function* okuScene(): Co {
  // (the six blank cards are all written now)
  removeItem('item_iso_nafuda');
  yield* say(T.ISO_OKU_ASK);
  yield* fadeTo('map_c3_aq_shinkai', 12, 2, 'up', 1);
  yield* say(T.ISO_OKU);
  if (flag(IF.fuchi) && knWith()) yield* say(T.ISO_OKU_FUCHI);
  setFlag(IF.oku, 1);
  yield* say(T.ISO_OKU_AFTER);
  yield* fadeTo('map_c3_aq_iriguchi', 7, 9, 'left', 0);
}

/** 6〜7 ちいさな 開館 → 順路 → 本日は、開館です。 */
function* kaikanScene(): Co {
  setFlag(IF.scene, 2);
  field()?.refreshPresence();
  yield* say(T.ISO_KAIKAN);
  se('se_door_glass', { vol: 0.5 });
  yield* say(T.ISO_KAIKAN_2);
  if (state.money >= 400) {
    state.money -= 400;
    se('se_coin');
    yield* say3(T.ISO_PAY);
  } else yield* say(T.ISO_SHOTAI);
  if (knWith()) yield* say(T.ISO_KN_TICKET);
  se('se_dakoku', { vol: 0.5 });
  // the route: the floor's arrow, the far tank, the shore
  yield* say(T.ISO_JUNRO);
  yield* fadeTo('map_c3_aq_shinkai', 12, 3, 'up', 3);
  yield* say(T.ISO_JUNRO_OKU);
  yield* fadeTo('map_c3_iso', 10, 5, 'left', 4);
  yield* say(T.ISO_JUNRO_ISO);
  if (isoSelfAll()) yield* say(T.ISO_JUNRO_YANE);
  yield* fadeTo('map_c3_misaki', 27, 14, 'up', 5);
  se('se_c3_harigami', { vol: 0.6 });
  yield* say(T.ISO_HONJITSU);
  setFlag(IF.kaikan, 1);
  for (const m of state.party) m.mp = m.maxMp;
  se('se_item');
  yield* say3(T.ISO_REWARD);
  yield* game.fadeOut(300, '#0B0B14');
  setFlag(IF.scene, 0);
  field()?.refreshPresence();
  yield 200;
  yield* game.fadeIn(400);
}

wrap('c3_poko_c4', function* (_ctx, orig): Co {
  if (!pgOn()) {
    yield* orig();
    return;
  }
  if (flag(IF.kaikan)) {
    yield* say(T.ISO_POKO_AFTER);
    return;
  }
  if (!flag(IF.start)) {
    if (!knWith()) {
      yield* say(T.ISO_POKO_SOLO);
      return;
    }
    yield* say(T.ISO_START);
    setFlag(IF.start, 1);
    yield* getKeyItem('item_iso_nafuda', T.ISO_GET);
    yield* say(T.ISO_START_EGO);
    se('se_dakoku', { vol: 0.5 });
    return;
  }
  if (!flag(IF.oku)) {
    const n = yield* handCards();
    if (CARD_IDS.every((id) => flag(cardF(id)))) {
      yield* okuScene();
      return;
    }
    if (!n) yield* say(T.ISO_POKO_WAIT);
    return;
  }
  yield* kaikanScene();
});

/** 旧水族館の 前の ハキコ（クリア後、はじまった あと 1回）。 */
wrap('npc_c3_uketsuke', function* (_ctx, orig): Co {
  if (pgOn() && flag(IF.start) && !flag(IF.hakiko)) {
    setFlag(IF.hakiko, 1);
    yield* say(T.ISO_HAKIKO);
    return;
  }
  yield* orig();
});

/** 潜りの「なつかしい においや」を 見た（かくしの 条件）。 */
wrap('obj_c3_umi_fuchi', function* (_ctx, orig): Co {
  setFlag(IF.fuchi, 1);
  yield* orig();
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.iso(step = 'start', auto = false)（クリア後の 昼 11:30、グソっ君と）
 *   'start'   券売所の ポコシャの 前（1）
 *   'hakiko'  1 の あと、旧水族館の 前の ハキコの 前（2）
 *   'stairs'  石段の 上 (25,16)（岬。下へ 進むと 磯）
 *   'iso'     磯の 石の 前（大写し。auto：12の 石と 6つの 所を 順に）
 *   'cards'   6つ 見た あと、券売所の ポコシャの 前（4 → 5 いちばん 奥）
 *   'kaikan'  いちばん 奥の あと、券売所の ポコシャの 前（6・7）
 *   'after'   開館の あと、旧水族館の 前
 *   'noon'    第3章の 段階1（ロープ。クリアの 前の データでは ないので 見た目だけ）
 */
if (import.meta.env.DEV) {
  registerDebug('iso', (step = 'start', auto = false) => {
    if (!pgOn()) cmd().jump?.('ch3:clear', true);
    for (const id of Object.values(IF)) setFlag(id, 0);
    for (const id of [...CARD_IDS, ...MINI_IDS]) {
      setFlag(seenF(id), 0);
      setFlag(cardF(id), 0);
    }
    for (let i = 0; i < 12; i++) setFlag(ishiF(i), 0);
    setFlag('flag_iso_rule', 0);
    if (state.inventory.includes('item_iso_nafuda')) removeItem('item_iso_nafuda');
    qaAuto = !!auto;
    setFlag('flag_pg_kn', 1);
    setFlag('flag_follower_hidden', 0);
    setFlag('flag_pg_yarinokoshi', 1);
    cmd().pg?.('11:30', false);
    const booth = () => cmd().warp?.('map_c3_aq_iriguchi', 7, 9, 'left');
    if (step === 'start') return booth();
    setFlag(IF.start, 1);
    giveKey('item_iso_nafuda');
    if (step === 'hakiko') return cmd().warp?.('map_c3_misaki', 25, 14, 'up');
    if (step === 'stairs') return cmd().warp?.('map_c3_misaki', 25, 16, 'down');
    setFlag(IF.hakiko, 1);
    if (step === 'iso') return cmd().warp?.('map_c3_iso', 4, 4, 'up');
    for (const id of [...CARD_IDS, 'agohaze']) setFlag(seenF(id), 1);
    for (let i = 0; i < 12; i++) setFlag(ishiF(i), 1);
    setFlag(IF.first, 1);
    if (step === 'cards') return booth();
    for (const id of CARD_IDS) setFlag(cardF(id), 1);
    setFlag(IF.cardFirst, 1);
    setFlag(IF.miniTold, 1);
    setFlag(IF.oku, 1);
    if (step === 'kaikan') return booth();
    setFlag(IF.kaikan, 1);
    return cmd().warp?.('map_c3_misaki', 26, 14, 'up');
  });

  registerDebug('isoState', () => {
    const p = game.ui.widgets.find((w) => w instanceof IsoPanel) as IsoPanel | undefined;
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(IF)) flags[k] = flag(id);
    return {
      flags,
      seen: [...CARD_IDS, ...MINI_IDS].filter((id) => flag(seenF(id))),
      cards: CARD_IDS.filter((id) => flag(cardF(id))),
      stones: ISO_STONES.map((_, i) => flag(ishiF(i))),
      selfAll: isoSelfAll(),
      tide: Math.round(tideNow() * 100) / 100,
      open: isoOpen(),
      money: state.money,
      panel: p ? { sel: p.sel, flipped: p.flipped, result: p.result, tide: Math.round(p.tide() * 100) / 100 } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the panel's words in their room. */
export function isoTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const walkT = (name: string, v: unknown) => {
    if (typeof v === 'string') {
      if (!v.includes('\n') && !v.startsWith('@')) return;
      let lines: string[] = [];
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
          continue;
        }
        const plain = raw.replace(/\{[^}]*\}/g, '');
        if (measure(plain) > 336) bad.push(`${name}: ${measure(plain)}px: ${plain}`);
        if (plain.includes('平和')) bad.push(`${name}: 平和`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('iso', { ...T.ISO_TEXTS, ISO_ROPE_NOON: T.ISO_ROPE_NOON });
  const col = SX + CW - 16 - RX;
  for (const l of [...ISO_UI.keys, ...ISO_UI.keysBack]) if (measure(l) > col) bad.push(`keys: ${measure(l)}px > ${col}: ${l}`);
  if (MY < SY || MY + ISO_H * TS > SY + CH || MX + ISO_W * TS > RX - 4) bad.push('map: does not fit');
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('isoText', () => isoTextCheck());
