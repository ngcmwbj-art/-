// 海の 水で 寄せる（第3章の クリア前、段階1。げむきか 10/19 の 案1、2026-10-19 依頼主の 採用。03_ch3_index 28）。
// 文は data/text/c3_yose.ts、みました帳の ページは ui/menu/book_yose.ts、絵は art/props/yose_art.ts、
// 新しい 地図は data/maps/c3_umi_oki.ts（沖の ブイの 下）。S13 の 鉢の 差分は siren.ts（gochisouTown）。
//
//   段階1（正午）、くま吉（来る人。★1便目）が 来ていて、S09 で 潜れるように なって から（flag_ch3_kaisui_start）、
//   S12 の ナリオサメの 前まで。
//   ・くま吉（あぜ道市の 豆腐の 屋台 (27,3)、c3_kita_npc_mamekichi）：今の 到着の 台詞の あと（flag_yd_heard）、
//     2回目に〔yose〕→ 空きびん item_c3_akibin（flag_yd_start）。グソっ君が いない ときは 頼まない。
//   ・監視台の カイト：びんを 持っていて、くむ 前に 1回（flag_yd_kaito）。
//   ・海の 中 map_c3_umi の 海水浴場の 底の 南の はし (40,12)：ロープの 1ページ（びんを 持っている とき 1回、
//     flag_yd_rope）、(40,13) の 岩の すき間 door_c3_umi_oki → 沖の ブイの 下 map_c3_umi_oki (12,1)。
//   ・沖：入った とき 1回（flag_yd_in）。ブイの 鎖 (12,5) で びんに 水を くむ（flag_yd_kumu）。
//     沖の 物 4つ（鎖・海藻・魚の 群れ・南の はしの 段。flag_yd_oki_<k>）。段階2 は 群れが 散った あと（1行）。
//   ・屋台に もどる → 大写し「なべの 中」NabePanel：←→ で びんを 傾けて 海の 水を 入れる（けっていで 止める。
//     少ないと もう 1回、多いと しょっぱい 版）→ けっていで 木べらを 1回 大きく 回す（2回 以上で おぼろ）。
//     でき flag_yd_deki（1 寄せ・2 おぼろ・3 しょっぱい）→ しょうゆ、いらん → 寄せ豆腐 item_c3_yosedofu、
//     朱肉 +2、みました帳③の すみ（flag_yd_done）。びんは くま吉に 返す。
//   ・かくし：ペロが 来ている → トマトのせ（flag_yd_tomato）。祠の きつね（flag_kitsune_*）→ くま吉の 1行。
//   ・段階2（12:01）：すんで いなければ、くま吉に 話すと「……海が 動いたら、」でおしまい（flag_yd_end、びんは 返す）。
//     段階3 から 先は びんを 持ち歩かない。沖の 地図は 段階2 も 歩ける（S14 から 先は 行けない）。
//
// QA：__game.cmd.yose(step, auto)、ydState()、ydText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { addItem, flag, removeItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { registerWorldFx } from '../../world/fx';
import { fxAt } from '../../world/fx';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/c3_yose';
import { YD_UI } from '../../data/text/c3_yose';
import { UMI_OKI } from '../../data/maps/c3_umi_oki';
import { addMp, getKeyItem, giveKey } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { addToMap, c3Stage, inCh3, kita, say3 } from './common';
import { anyFlag } from './talked';
import { HOWTO } from '../../data/text/howto';

export const YF = {
  heard: 'flag_yd_heard',
  start: 'flag_yd_start',
  wait: 'flag_yd_wait',
  kaito: 'flag_yd_kaito',
  rope: 'flag_yd_rope',
  inn: 'flag_yd_in',
  in2: 'flag_yd_in2',
  kumu: 'flag_yd_kumu',
  deki: 'flag_yd_deki',
  tomato: 'flag_yd_tomato',
  kitsune: 'flag_yd_kitsune',
  done: 'flag_yd_done',
  after: 'flag_yd_after',
  end: 'flag_yd_end',
} as const;

const OKI_KEYS = ['kusari', 'mo', 'mure', 'dan'] as const;
type OkiKey = (typeof OKI_KEYS)[number];
const okiF = (k: OkiKey) => `flag_yd_oki_${k}`;

const MAME = 'npc_mamekichi';
const BIN = 'item_c3_akibin';
const DOFU = 'item_c3_yosedofu';

function knWith(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** 寄り道が 開いている：段階1、くま吉が 来ている、S09 の 潜りの あと、ナリオサメの 前。 */
export function ydOpen(): boolean {
  return inCh3() && c3Stage() === 1 && kita(MAME) && flag('flag_ch3_kaisui_start') > 0 && !flag('flag_ch3_nariosame_beaten');
}

export function ydOkiN(): number {
  return OKI_KEYS.filter((k) => flag(okiF(k)) > 0).length;
}

function hasBin(): boolean {
  return state.inventory.includes(BIN);
}

function dropBin(): void {
  while (state.inventory.includes(BIN)) removeItem(BIN);
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

// ================================================================ 大写し「なべの 中」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const RX = SX + 206;
const NX = SX + 100;
const NY = 66;
/** 入れた 水：これより 少ないと 寄らない、これより 多いと しょっぱい（数は 台詞に 出さない）。 */
const MIN = 0.38;
const MAX = 0.82;

/** A filled ellipse in rows (Gfx has circles only). */
function ell(g: Gfx, cx: number, cy: number, rx: number, ry: number, color: string): void {
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry || 1))));
    g.rect(cx - w, cy + dy, w * 2 + 1, 1, color);
  }
}

export class NabePanel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  /** はじめの カード（改善会議 10-25 の1、ui/closeup.ts）。 */
  howto = HOWTO.yose;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  /** おぼろ（2回 以上 回す）を 試す（QA）。 */
  autoOboro = false;
  /** しょっぱい（入れすぎ）を 試す（QA）。 */
  autoShoppai = false;
  active = false;
  phase: 'pour' | 'mawasu' | 'end' = 'pour';
  /** びんの 傾き（0〜1）。 */
  tilt = 0;
  /** 入れた 海の 水（0〜1.2）。 */
  mizu = 0;
  /** 止めた（けってい）。 */
  stopped = false;
  /** 回した 回数。 */
  stirs = 0;
  /** 回して いる（ms 残り）。 */
  stirT = 0;
  /** 最後に 回してから（ms）。 */
  since = 0;
  /** 寄って いく 白い 雲（0〜1）。 */
  cloud = 0;
  private autoT = 0;

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.phase !== 'pour') this.tilt = Math.max(0, this.tilt - dt / 400);
    if (this.stirT > 0) this.stirT = Math.max(0, this.stirT - dt);
    if (this.stirs > 0) this.cloud = Math.min(1, this.cloud + dt / 1600);
    if (!this.active) return;
    let up = 0;
    let ok = false;
    if (this.auto) {
      this.autoT += dt;
      if (this.phase === 'pour') {
        const goal = this.autoShoppai ? 0.95 : 0.6;
        if (this.mizu < goal) up = 1;
        else ok = Math.floor(this.autoT / 200) !== Math.floor((this.autoT - dt) / 200);
      } else if (this.phase === 'mawasu') {
        const tick = Math.floor(this.autoT / 700) !== Math.floor((this.autoT - dt) / 700);
        ok = tick && (this.stirs === 0 || (this.autoOboro && this.stirs < 3));
      }
    } else {
      up = (input.down('right') ? 1 : 0) - (input.down('left') ? 1 : 0);
      ok = input.pressed('confirm');
    }
    if (this.phase === 'pour') {
      this.tilt = Math.max(0, Math.min(1, this.tilt + (up * dt) / 500));
      if (this.tilt > 0.35) {
        this.mizu = Math.min(1.2, this.mizu + ((this.tilt - 0.35) * dt) / 2200);
        if (Math.floor(this.t / 240) !== Math.floor((this.t - dt) / 240)) se('se_h_yunomi_pour', { vol: 0.18, pitch: 1.2 });
      }
      if (ok) this.stopped = true;
    } else if (this.phase === 'mawasu') {
      this.since += dt;
      if (ok && this.stirT <= 0) {
        this.stirs++;
        this.stirT = 800;
        this.since = 0;
        se('se_c3_kosogeru', { vol: 0.2, pitch: 0.7 });
      }
      if (this.stirs > 0 && this.stirT <= 0 && this.since > 1500) this.phase = 'end';
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
        // the stall in the noon light: the awning's shade, the pot over the burner
        g.rect(SX, oy, RX - SX - 4, CH, '#7A6248');
        for (let yy = 14; yy < CH; yy += 8) g.rect(SX, oy + yy, RX - SX - 4, 1, '#6A5440');
        g.rect(SX, oy, RX - SX - 4, 10, '#3A5A8A');
        for (let x = SX; x < RX - 4; x += 16) g.rect(x, oy, 8, 10, '#F4F1E8');
        const cx = NX;
        const cy = oy + NY;
        // the burner's flame under the pot (くま吉's job), held low
        for (let i = 0; i < 7; i++) {
          const fh = 4 + Math.round(Math.abs(Math.sin(this.t / 120 + i)) * 3);
          g.rect(cx - 30 + i * 10, cy + 32 - fh, 3, fh, i % 2 ? '#F2894B' : '#4A8AE0');
        }
        g.rect(cx - 40, cy + 32, 80, 4, '#3A3F48');
        // the pot (seen from a little above): its rim, the soy milk inside
        ell(g, cx, cy + 4, 58, 26, '#6A6E78');
        ell(g, cx, cy, 56, 22, '#9AA0A8');
        ell(g, cx, cy + 1, 50, 18, '#F2EAD0');
        // the milk greys a little with the sea water
        if (this.mizu > 0) g.alpha(Math.min(0.25, this.mizu * 0.2), () => ell(g, cx, cy + 1, 50, 18, '#9AB8C8'));
        // the curds: white clouds gathering (one stir), or small crumbs (stirred again and again)
        if (this.stirs > 0) {
          const n = this.stirs >= 2 ? 26 : 7;
          for (let i = 0; i < n; i++) {
            const th = i * 2.4 + (this.stirs >= 2 ? 0 : this.t / 4000);
            const rr = (this.stirs >= 2 ? 40 : 34) * (1 - 0.55 * this.cloud) * (0.4 + ((i * 37) % 60) / 100);
            const x = Math.round(cx + Math.cos(th) * rr);
            const y = Math.round(cy + 1 + Math.sin(th) * rr * 0.36);
            const s = this.stirs >= 2 ? 2 : Math.round(4 + 6 * this.cloud);
            ell(g, x, y, s, Math.max(1, Math.round(s * 0.55)), '#FFFFFF');
            if (s > 3) ell(g, x - 1, y - 1, s - 2, Math.max(1, Math.round(s * 0.3)), '#FFFDF4');
          }
        }
        // the wooden spatula going round once
        if (this.phase !== 'pour') {
          const th = this.stirT > 0 ? (1 - this.stirT / 800) * Math.PI * 2 : 0;
          const bx = Math.round(cx + Math.cos(th) * 30);
          const by = Math.round(cy + 1 + Math.sin(th) * 10);
          g.line(bx, by, bx + 20, by - 44, '#A8825A');
          g.line(bx + 1, by, bx + 21, by - 44, '#8A6444');
          ell(g, bx, by, 5, 2, '#C8A06A');
        }
        // the bottle tipping in from the upper right, its thin stream
        if (this.phase === 'pour') {
          const bx = cx + 40;
          const by = oy + 14;
          const ang = this.tilt * 1.1;
          for (let i = 0; i < 26; i++) {
            const x = Math.round(bx + Math.cos(Math.PI - ang) * i);
            const y = Math.round(by + Math.sin(ang) * i * 0.6);
            const w = i < 6 ? 3 : 8;
            g.rect(x, y - Math.floor(w / 2), 1, w, i < 6 ? '#6A8A98' : i % 5 === 0 ? '#E8FAFF' : '#9ACCE0');
            g.px(x, y - Math.floor(w / 2), '#4A6A78');
            g.px(x, y + Math.ceil(w / 2) - 1, '#4A6A78');
          }
          if (this.tilt > 0.35) {
            const mx = Math.round(bx - Math.cos(ang) * 26);
            const my = Math.round(by + Math.sin(ang) * 16);
            for (let y = my; y < cy; y += 2) g.px(mx + ((y >> 1) % 2), y, '#7FD1E8');
          }
        }
        // the right column: the sea water's gauge (no numbers), the keys
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        g.text(YD_UI.mizu, RX, oy + 4, { color: '#F4ECD8' });
        const gw = 80;
        g.rect(RX, oy + 24, gw, 6, '#1A1626');
        g.rect(RX + Math.round((MIN / 1.2) * gw), oy + 22, Math.round(((MAX - MIN) / 1.2) * gw), 1, '#6A8A6A');
        g.rect(RX + 1, oy + 25, Math.round((Math.min(1.2, this.mizu) / 1.2) * (gw - 2)), 4, '#4AA8E0');
        const keys = this.phase === 'pour' ? YD_UI.keysPour : this.phase === 'mawasu' ? YD_UI.keysMawasu : [];
        if (this.active) keys.forEach((l, i) => g.text(l, RX, oy + 64 + i * 16, { color: '#FFE7A3' }));
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(YD_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, YD_UI.place, { seed: 74 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }
}

function* openPanel(p: NabePanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: NabePanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;
let qaOboro = false;
let qaShoppai = false;

/** 4 ひと回し：でき（1 寄せ・2 おぼろ・3 しょっぱい）と しょっぱいか。 */
function* nabe(): Co<{ deki: number; salty: boolean }> {
  const p = new NabePanel();
  p.auto = qaAuto;
  p.autoOboro = qaOboro;
  p.autoShoppai = qaShoppai;
  let salty = false;
  try {
    yield* openPanel(p);
    yield* say3(T.YD_RULE);
    for (;;) {
      p.stopped = false;
      p.active = true;
      while (!p.stopped) yield null;
      p.active = false;
      if (p.mizu < MIN) {
        yield* say3(T.YD_SUKUNAI);
        continue;
      }
      if (p.mizu > MAX) {
        salty = true;
        yield* say3(T.YD_OOI);
      }
      break;
    }
    p.phase = 'mawasu';
    yield* say3(T.YD_MAWASU_RULE);
    p.active = true;
    while ((p.phase as string) !== 'end') yield null;
    p.active = false;
    yield 500;
    if (p.stirs >= 2) yield* say3(T.YD_OBORO);
    else yield* say3(T.YD_YOSE);
  } finally {
    yield* closePanel(p);
  }
  return { deki: p.stirs >= 2 ? 2 : salty ? 3 : 1, salty };
}

// ================================================================ 台本

/** 1 にがり、忘れた。 */
function* yoseStart(): Co {
  setFlag(YF.start, 1);
  yield* say3(T.YD_A);
  yield* getKeyItem(BIN, T.YD_GET_BIN, false);
}

/** 4〜6（くんだ びんを 持って 屋台に もどる）。 */
function* yoseNabe(): Co {
  yield* say3(T.YD_BACK);
  const r = yield* nabe();
  setFlag(YF.deki, r.deki);
  // 5 しょうゆ、いらん
  yield* say3(r.salty ? T.YD_AJI_SHOPPAI : T.YD_AJI);
  yield* say3(T.YD_SHOYU);
  if (kita('npc_hoshi_mitsu') && !flag(YF.tomato)) {
    setFlag(YF.tomato, 1);
    yield* say3(T.YD_PERO);
  }
  if (anyFlag('flag_kitsune_*') && !flag(YF.kitsune)) {
    setFlag(YF.kitsune, 1);
    yield* say3(T.YD_KITSUNE);
  }
  // 6 ごほうび（びんは くま吉に 返す）
  dropBin();
  addItem(DOFU);
  setFlag(YF.done, 1);
  addMp(2);
  se('se_item');
  yield* say3(T.YD_REWARD);
}

/** S08 の 定食の 豆腐が まだ（今の 台本の ほうが 先）。 */
function dishFirst(): boolean {
  return flag('flag_ch3_shokudo_start') > 0 && !flag('flag_ch3_shokudo_done') && !flag('flag_ch3_teishoku_tofu');
}

wrap(`c3_kita_${MAME}`, function* (_ctx, orig): Co {
  // 段階2（12:01）：くんで 寄せる 前に 海が 動いた
  if (inCh3() && c3Stage() === 2 && flag(YF.start) && !flag(YF.done) && !flag(YF.end)) {
    setFlag(YF.end, 1);
    dropBin();
    yield* say3(T.YD_END);
    return;
  }
  if (!ydOpen() || dishFirst()) {
    yield* orig();
    if (inCh3() && c3Stage() === 1) setFlag(YF.heard, 1);
    return;
  }
  if (!flag(YF.start)) {
    if (!flag(YF.heard)) {
      yield* orig();
      setFlag(YF.heard, 1);
      return;
    }
    if (!knWith()) {
      yield* say3(T.YD_NO_KN);
      return;
    }
    yield* yoseStart();
    return;
  }
  if (!flag(YF.done)) {
    if (flag(YF.kumu) && hasBin()) {
      yield* yoseNabe();
      return;
    }
    if (!flag(YF.wait)) {
      setFlag(YF.wait, 1);
      yield* say3(T.YD_WAIT);
      return;
    }
    yield* orig();
    return;
  }
  if (!flag(YF.after)) {
    setFlag(YF.after, 1);
    yield* say3(T.YD_AFTER);
    return;
  }
  yield* orig();
});

/** 2 監視台の カイト（陸。びんを 持っていて、くむ 前に 1回）。 */
wrap('npc_c3_kanshiin', function* (_ctx, orig): Co {
  if (ydOpen() && onMap('map_umizoi') && hasBin() && !flag(YF.kumu) && !flag(YF.kaito)) {
    setFlag(YF.kaito, 1);
    yield* say3(T.YD_KAITO);
    return;
  }
  yield* orig();
});

// 海の 中：南の はしの 岩の すき間（段階1〜2、S14 の 前）
const okiCond = { stage: '1-2', notFlag: 'flag_ch3_truck_trap', when: inCh3 };
addToMap('map_c3_umi', [
  { t: 'prop', prop: 'prop_yd_sukima', x: 40, y: 12 } as unknown as MapObj,
  { t: 'door', id: 'door_c3_umi_oki', x: 40, y: 13, to: UMI_OKI, tx: 12, ty: 1, dir: 'down', se: 'se_c3_step_uw', cond: okiCond } as unknown as MapObj,
  { t: 'trig', id: 'trig_yd_rope', x: 40, y: 12, w: 1, h: 1, script: 'trig_yd_rope' } as unknown as MapObj,
]);
// S13（siren.ts gochisouTown）：ござの 上、くま吉の 前の 寄せ豆腐の 鉢（その 場面の あいだだけ）
addToMap('map_umizoi', [{ t: 'prop', prop: 'prop_yd_hachi', x: 28, y: 32, cond: { flag: 'flag_yd_s13' } } as unknown as MapObj]);
registerScript('trig_yd_rope', function* (): Co {
  if (!inCh3() || !hasBin() || flag(YF.kumu) || flag(YF.rope)) return;
  setFlag(YF.rope, 1);
  yield* say3(T.YD_ROPE);
});

// 沖の ブイの 下：調べる 物
addToMap(
  UMI_OKI,
  [
    { t: 'obj', id: 'obj_yd_oki_kusari', x: 12, y: 5, script: 'obj_yd_oki_kusari' },
    { t: 'obj', id: 'obj_yd_oki_mo_1', x: 5, y: 3, w: 2, flat: true, script: 'obj_yd_oki_mo' },
    { t: 'obj', id: 'obj_yd_oki_mo_2', x: 18, y: 7, w: 2, flat: true, script: 'obj_yd_oki_mo' },
    { t: 'obj', id: 'obj_yd_oki_mure', x: 15, y: 3, w: 3, flat: true, script: 'obj_yd_oki_mure' },
    { t: 'obj', id: 'obj_yd_oki_dan', x: 1, y: 11, w: 22, face: 'down', script: 'obj_yd_oki_dan' },
  ] as unknown as MapObj[],
);

function* okiFind(k: OkiKey, first: string, again: string): Co {
  se('se_examine');
  if (flag(okiF(k))) {
    yield* say3(again);
    return;
  }
  setFlag(okiF(k), 1);
  yield* say3(first);
  se('se_item', { vol: 0.4 });
  yield* say3(T.ydOki(ydOkiN()));
}

registerScript('obj_yd_oki_kusari', function* (): Co {
  if (hasBin() && !flag(YF.kumu) && inCh3() && c3Stage() === 1) {
    se('se_c3_moguri_get');
    setFlag(YF.kumu, 1);
    yield* say3(T.YD_KUMU);
    if (!flag(okiF('kusari'))) {
      setFlag(okiF('kusari'), 1);
      yield* say3(T.ydOki(ydOkiN()));
    }
    return;
  }
  yield* okiFind('kusari', T.YD_KUSARI, T.YD_KUSARI);
});
registerScript('obj_yd_oki_mo', function* (): Co {
  yield* okiFind('mo', c3Stage() >= 2 ? T.YD_MO2 : T.YD_MO, c3Stage() >= 2 ? T.YD_MO2 : T.YD_MO);
});
registerScript('obj_yd_oki_mure', function* (): Co {
  yield* okiFind('mure', c3Stage() >= 2 ? T.YD_MURE2 : T.YD_MURE, c3Stage() >= 2 ? T.YD_MURE2 : T.YD_MURE);
});
registerScript('obj_yd_oki_dan', function* (): Co {
  yield* okiFind('dan', T.YD_DAN, T.YD_DAN2);
});

registerScript('evt_yd_oki_enter', function* (): Co {
  if (!inCh3()) return;
  yield 300;
  if (!flag(YF.inn)) {
    setFlag(YF.inn, 1);
    yield* say3(T.YD_OKI_IN);
  }
  if (c3Stage() >= 2 && !flag(YF.in2)) {
    setFlag(YF.in2, 1);
    yield* say3(T.YD_OKI_IN2);
  }
});

// 段階3 から 先は びんを 持ち歩かない（段階2 の 1行は くま吉に 話した とき）
registerWorldFx({
  map: '',
  update() {
    if (flag('flag_ch3_stage') >= 3 && state.inventory.includes(BIN)) dropBin();
  },
});

// ---------------------------------------------------------------- 沖の 水の 層（map_c3_umi の 水より 少し 青が 濃い）

let bubbles: { x: number; y: number; z: number; t: number }[] = [];
let bubbleNext = 0;
registerWorldFx({
  map: UMI_OKI,
  anchored: true,
  update(f, dt) {
    const moving = flag('flag_ch3_stage') >= 2;
    bubbleNext -= dt;
    if (bubbleNext <= 0) {
      bubbleNext = 700 + Math.random() * 600;
      bubbles.push({ x: f.player.x + (Math.random() * 4 - 2), y: f.player.y, z: 20, t: 0 });
    }
    for (const b of bubbles) {
      b.t += dt;
      b.z += dt * (moving ? 0.03 : 0.018);
      b.x += Math.sin(b.t / 200) * 0.05;
    }
    bubbles = bubbles.filter((b) => b.t < 1800);
  },
  draw(f, g, cx, cy, layer) {
    if (layer === 'top') {
      for (const b of bubbles) {
        const [x, y] = fxAt(f, b.x, b.y - b.z, cx, cy, b.y);
        g.ring(Math.round(x), Math.round(y), 1, '#E8FAFF');
      }
      return;
    }
    if (layer !== 'glow') return;
    g.rect(0, 0, 384, 216, '#144E86', 0.22);
    for (let k = 0; k < 8; k++) g.rect(0, 110 + k * 13, 384, 13, '#0A2242', 0.03 * k);
    for (let k = 0; k < 4; k++) g.rect(0, k * 6, 384, 6, '#BDE4F4', 0.09 - k * 0.02);
    const t = flag('flag_ch3_stage') >= 2 ? f.t / 1000 : 0;
    g.composite('lighter', () => {
      for (let i = 0; i < 5; i++) {
        const base = ((i * 97 - cx * 0.3) % 460) - 40 + Math.sin(t * 0.6 + i) * 8;
        for (let y = 0; y < 216; y += 2) g.rect(Math.round(base + y * 0.35), y, 10 + (i % 3) * 4, 2, '#7AB8E0', 0.05 * (1 - y / 240));
      }
    });
  },
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.yose(step = 'kuma', auto = false)（第3章の 段階1、S09 の 潜りの あと、くま吉が 来た）
 *   'kuma'    到着の 台詞を 聞いた あと、くま吉の 前 (27,4) 上向き（話すと〔yose〕）
 *   'kaito'   びんを 持って、カイトの 前 (57,28) 上向き
 *   'umi'     びんを 持って、海の 中の 南の はしの 手前 (40,11) 下向き（グソっ君だけ。下へ 歩くと ロープ → 沖）
 *   'oki'     びんを 持って、沖の ブイの 鎖の 前 (12,4) 下向き
 *   'nabe'    くんだ あと、くま吉の 前（話すと なべ）。'oboro'・'shoppai' は auto の 版
 *   'end'     びんを 持った まま 段階2、くま吉の 前
 *   'oki2'    段階2、沖の 入口 (12,1)
 */
if (import.meta.env.DEV) {
  registerDebug('yose', (step = 'kuma', auto = false) => {
    cmd().jump?.('ch3:moguri', true);
    for (const id of Object.values(YF)) setFlag(id, 0);
    for (const k of OKI_KEYS) setFlag(okiF(k), 0);
    qaAuto = !!auto || step === 'oboro' || step === 'shoppai';
    qaOboro = step === 'oboro';
    qaShoppai = step === 'shoppai';
    dropBin();
    setFlag('flag_ch3_stage', 1);
    setFlag('flag_ch3_kaisui_start', 1);
    if (!kita(MAME)) {
      setFlag(`flag_ch3_kita_${MAME}`, 1);
      setFlag('flag_ch3_kita_n', flag('flag_ch3_kita_n') + 1);
    }
    setFlag(YF.heard, 1);
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (step === 'kuma') return go('map_c3_ichiba', 27, 4, 'up');
    setFlag(YF.start, 1);
    giveKey(BIN);
    if (step === 'kaito') return go('map_umizoi', 57, 28, 'up');
    if (step === 'umi') return go('map_c3_umi', 40, 11, 'down');
    if (step === 'oki') return go(UMI_OKI, 12, 4, 'down');
    if (step === 'end') {
      setFlag('flag_ch3_stage', 2);
      return go('map_c3_ichiba', 27, 4, 'up');
    }
    if (step === 'oki2') {
      setFlag('flag_ch3_stage', 2);
      return go(UMI_OKI, 12, 1, 'down');
    }
    setFlag(YF.kumu, 1);
    setFlag(YF.wait, 1);
    return go('map_c3_ichiba', 27, 4, 'up');
  });

  registerDebug('ydState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(YF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof NabePanel) as NabePanel | undefined;
    const f = field();
    return {
      flags,
      oki: ydOkiN(),
      open: ydOpen(),
      bin: hasBin(),
      dofu: state.inventory.filter((i) => i === DOFU).length,
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY, f.player.spriteId] : null,
      panel: p ? { phase: p.phase, mizu: +p.mizu.toFixed(2), stirs: p.stirs } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no 天丼; no clock time; the names without さん in the narration. */
export function ydTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', 'ピッ！', 'あ、つい', 'おかわり、あるよ', 'もう 1杯', '具足', 'ほどよいなぁ', 'なつかしい におい'];
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
  walkT('yd', T.YD_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of [...YD_UI.keysPour, ...YD_UI.keysMawasu, YD_UI.mizu]) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('ydText', () => ydTextCheck());
