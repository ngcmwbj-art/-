// 灯台の 名のり（第3章の クリア後の 夜。げむきか 10/15 の 案3、2026-10-15 依頼主の 採用。05_postgame 2.3・3.5・14、
// 03_ch3_index）。文は data/text/c3_nanori.ts、みました帳の ページは ui/menu/book_nanori.ts。
//
//   クリア後の 夜（19:00〜4:59）だけ、防波堤の 石の ベンチ (42,31) に ミナト（nn_minato。すわって いる）。
//   ・ミナト → 1 ずれとる（flag_nn_zure）→ 灯室の テル → 2 ずれとらん（flag_nn_teru）→ ミナト → 3 予備の
//     ストップウォッチ（item_nn_stopwatch、flag_nn_sw）→ 大写し「夜の 海」（NightSeaPanel）。
//   ・光は 5つ（町の 作りもの）：テルの 灯台（赤・4秒に 1回）、沖の 島の 灯台（白・2回 光って 長く 休む。6秒）、
//     港の 口の ブイ（緑・1秒に 1回）、夜の 漁の 船（白・光りつづける）、星（またたく）。はかれる 光は 3回
//     はかると 名のり帳に 書く（flag_nn_m_<id> 回数、flag_nn_v_<id>_<n> は 0.1秒 単位、3回とも 0.1秒 以内で
//     flag_nn_hana_<id>）。はかれない 2つは「名のらない」（flag_nn_no_<id>）。
//   ・テルの 灯台を 3回 → 5 ずれて いたのは → 6 止めない 時計（テルが 下りて きて ベンチの 横 nn_teru）→
//     朱肉 +2、ページ（flag_nn_done、その 夜 flag_nn_night）。
//   ・そのあと：その 夜の ミナトは 寝ている。次の 夜から「4秒 0。ええ 名のりじゃ。」と はかる（何回でも）。
//     次の 朝の テル（1回、flag_nn_teru_asa）。夕方、はかり 始めた あとの テル。
//   ・かくし：夜の 港の 階段（28–29,27）で、グソっ君が 水に 手を 入れる → 夜光虫（flag_nn_yakou）。
//     めがねを 返した 人（flag_ch3_megane_back）は 1 の あとに ミナトの 1ページ。
//
// QA：__game.cmd.nn(step, auto)、nnState()、nnText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, removeItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { pgBand, pgDay, pgOn } from '../../world/postgame';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import { fillNames } from '../../data/text/c3_names';
import * as T from '../../data/text/c3_nanori';
import { fmtSec, LIGHTS, NN_UI, nnNightId as nightId, type Light } from '../../data/text/c3_nanori';
import { addMp, getKeyItem, giveKey } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { addToMap, say3 } from './common';
import { HOWTO } from '../../data/text/howto';
import { closeupWide } from '../../ui/closeup_wide';

export const NF = {
  zure: 'flag_nn_zure',
  teru: 'flag_nn_teru',
  sw: 'flag_nn_sw',
  done: 'flag_nn_done',
  night: 'flag_nn_night',
  scene: 'flag_nn_scene',
  teruAsa: 'flag_nn_teru_asa',
  yakou: 'flag_nn_yakou',
  megane: 'flag_nn_megane',
} as const;

const mFlag = (id: string) => `flag_nn_m_${id}`;
const vFlag = (id: string, n: number) => `flag_nn_v_${id}_${n}`;

function kanenariHere(): boolean {
  const f = field();
  return flag('flag_pg_kn') > 0 && !flag('flag_follower_hidden') && !!f?.follower?.visible;
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
  return yield* say3(t);
}

/** 夜か（クリア後）。 */
function night(): boolean {
  return pgOn() && pgBand() === 'yoru';
}

/** 名場面の 夜（ミナトが 寝ている、テルが ベンチの 横）。 */
function sceneNight(): boolean {
  return night() && flag(NF.done) > 0 && flag(NF.night) === nightId();
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

const NPC = (o: Record<string, unknown>): MapObj => ({ t: 'npc', ...o }) as unknown as MapObj;

addToMap('map_umizoi', [
  // ミナト：夜の 石の ベンチ（すわる）。昼の 防波堤の 根もとの ミナトは 表（pg_schedule.ts）の 人
  NPC({ id: 'nn_minato', sprite: 'npc_c3_sirenban', x: 42, y: 31, dir: 'down', pose: 'sit', off: [0, -4], noTurn: true, script: 'nn_minato', cond: { when: night } }),
  // 名場面の 夜：テルが ベンチの 横（海側）
  NPC({ id: 'nn_teru', sprite: 'npc_c3_toudai', x: 41, y: 32, dir: 'right', script: 'nn_teru', cond: { when: () => sceneNight() || (night() && flag(NF.scene) > 0 && !flag(NF.done)) } }),
  // 夜光虫：港の 階段（昼の 潜りの 口と 同じ 所。夜だけ）
  { t: 'trig', id: 'trig_nn_yakou', x: 28, y: 27, w: 2, h: 1, on: 'bump', script: 'trig_nn_yakou', cond: { when: night } } as unknown as MapObj,
]);

// ================================================================ 大写し「夜の 海」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const RX = SX + 218;
const HORIZON = 46;

/** その 光が 今 光っているか（t：大写しの 時計 ms）。 */
function litAt(L: Light, t: number): boolean {
  if (L.period === null) return true;
  const k = (((t + L.phase) % L.period) + L.period) % L.period;
  return L.on.some(([a, b]) => k >= a && k < b);
}

export class NightSeaPanel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  /** はじめの カード（改善会議 10-25 の1、ui/closeup.ts）。 */
  howto = HOWTO.nanori;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  active = false;
  sel = 0;
  /** はかっている 間：始めた 時刻。 */
  t0: number | null = null;
  /** 今の ストップウォッチの 表示（ms）。 */
  shown = 0;
  result: string | null = null;
  words: { text: string; x: number; y: number; t: number; ms: number; color?: string }[] = [];
  private ePress = false;
  private eCancel = false;
  private prevLit = false;
  private autoN = 0;

  light(): Light {
    return LIGHTS[this.sel];
  }
  word(text: string, x: number, y: number, ms = 900, color?: string): void {
    this.words.push({ text, x, y, t: 0, ms, color });
  }
  clearInput(): void {
    this.ePress = false;
    this.eCancel = false;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    this.words = this.words.filter((w) => (w.t += dt) < w.ms);
    if (input.pressed('confirm')) this.ePress = true;
    if (input.pressed('cancel')) this.eCancel = true;
    if (this.t0 !== null) this.shown = this.t - this.t0;
    if (this.result || !this.active) return;
    if (this.eCancel) {
      this.eCancel = false;
      this.result = 'cancel';
      return;
    }
    const L = this.light();
    const lit = litAt(L, this.t);
    const onset = lit && !this.prevLit;
    this.prevLit = lit;
    if (this.t0 === null && !this.auto) {
      if (input.repeat('right')) this.move(1);
      else if (input.repeat('left')) this.move(-1);
    }
    let press = this.ePress;
    this.ePress = false;
    if (this.auto) {
      // QA：はかれる 光は 光った 瞬間に 押す。名のらない 光も 1回ずつ 選ぶ
      press = L.period === null ? this.t % 900 < dt : onset;
      if (L.period !== null && flag(mFlag(L.id)) >= 3 && this.t0 === null) {
        this.autoNext();
        return;
      }
    }
    if (!press) return;
    if (L.period === null) {
      this.result = `noname:${L.id}`;
      return;
    }
    if (this.t0 === null) {
      this.t0 = this.t;
      this.shown = 0;
      se('se_clock_tick', { vol: 0.5, pitch: 1.3 });
      return;
    }
    const sec = (this.t - this.t0) / 1000;
    this.t0 = null;
    this.shown = sec * 1000;
    se('se_clock_tick', { vol: 0.5, pitch: 1.0 });
    const tenths = Math.round(sec * 10);
    const err = Math.abs(sec - L.period / 1000);
    const tol = L.tol * closeupWide(); // ひろい：ずれて よい 秒 ×1.5（改善会議 10-28 の5）
    this.word(fmtSec(tenths), L.x, L.y - 14, 1200, err <= tol ? '#FFE7A3' : '#FF8A7A');
    if (err > tol) {
      this.result = 'miss';
      return;
    }
    const n = flag(mFlag(L.id));
    if (n >= 3) return;
    setFlag(vFlag(L.id, n), tenths);
    setFlag(mFlag(L.id), n + 1);
    if (n + 1 >= 3) {
      const ok = [0, 1, 2].every((i) => Math.abs(flag(vFlag(L.id, i)) - L.period! / 100) <= 1);
      if (ok) setFlag(`flag_nn_hana_${L.id}`, 1);
      this.result = `write:${L.id}`;
    }
  }

  private move(d: number): void {
    this.sel = (this.sel + d + LIGHTS.length) % LIGHTS.length;
    this.prevLit = litAt(this.light(), this.t);
    se('se_cursor', { vol: 0.4 });
  }

  private autoNext(): void {
    this.autoN++;
    // teru last: the others first
    const order = ['oki', 'buoy', 'gyosen', 'hoshi', 'teru'];
    for (const id of order) {
      const i = LIGHTS.findIndex((l) => l.id === id);
      const L = LIGHTS[i];
      const need = L.period === null ? !flag(`flag_nn_no_${id}`) : flag(mFlag(id)) < 3;
      if (need) {
        this.sel = i;
        this.prevLit = litAt(L, this.t);
        return;
      }
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
      g.clip(SX, SY + dy, CW, CH, () => {
        this.scene(g, SY + dy);
        this.side(g, SY + dy);
      });
      const tw = g.measure(NN_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, NN_UI.place, { seed: 67 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
    for (const w of this.words) {
      const p = w.t / w.ms;
      const yy = Math.round(SY + w.y - p * 6);
      const al = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
      g.text(w.text, SX + w.x, yy, { color: w.color ?? UI.bg, outline: UI.border, align: 'center', alpha: al });
      markText(SX + w.x - 32, yy, 64, 16, true);
    }
  }

  private scene(g: Gfx, oy: number): void {
    const w = RX - SX - 4;
    // the night sky, the sea, the horizon
    g.rect(SX, oy, w, HORIZON, '#0E1430');
    g.rect(SX, oy + HORIZON - 14, w, 14, '#141C3C');
    g.rect(SX, oy + HORIZON, w, CH - HORIZON, '#0A1428');
    g.rect(SX, oy + HORIZON, w, 1, '#2A3A68');
    // stars
    for (let i = 0; i < 22; i++) {
      const x = SX + 4 + ((i * 47) % (w - 8));
      const y = oy + 3 + ((i * 29) % (HORIZON - 12));
      const tw = (Math.sin(this.t / 400 + i * 1.7) + 1) / 2;
      g.rect(x, y, 1, 1, tw > 0.3 ? '#C8D0F0' : '#4A5480');
    }
    // the sea's glints
    for (let i = 0; i < 14; i++) {
      const x = SX + 6 + ((i * 37 + Math.floor(this.t / 500) * 5) % (w - 12));
      const y = oy + HORIZON + 6 + ((i * 13) % (CH - HORIZON - 12));
      g.rect(x, y, 3, 1, '#1E2C54');
    }
    // the near breakwater's edge at the bottom, the lighthouse on the left (its tower in silhouette)
    g.rect(SX, oy + CH - 8, w, 8, '#1A1E2A');
    g.rect(SX, oy + CH - 8, w, 1, '#3A4058');
    const L0 = LIGHTS[0];
    g.rect(SX + L0.x - 5, oy + L0.y + 2, 10, CH - L0.y - 10, '#1E2234');
    g.rect(SX + L0.x - 6, oy + L0.y - 2, 12, 4, '#2A3048');
    // the island far off
    g.rect(SX + 124, oy + HORIZON - 4, 30, 4, '#0A0E1E');
    g.rect(SX + 132, oy + HORIZON - 7, 14, 3, '#0A0E1E');
    // the fishing boat's hull
    g.rect(SX + 176, oy + 58, 14, 3, '#121828');
    // the lights
    LIGHTS.forEach((L, i) => {
      const x = SX + L.x;
      const y = oy + L.y;
      let on = litAt(L, this.t);
      let r = 2;
      if (L.id === 'hoshi') {
        on = (Math.sin(this.t / 260) + 1) / 2 > 0.25;
        r = 1;
      }
      if (L.id === 'gyosen') r = 2;
      if (on) {
        g.alpha(0.25, () => g.circle(x, y, r + 5, L.color));
        g.circle(x, y, r, L.color);
        if (L.id === 'teru') g.alpha(0.12, () => g.rect(x - 60, y - 1, 120, 3, L.color));
      } else g.circle(x, y, 1, '#2A3050');
      // its reflection on the sea
      if (on && L.id !== 'hoshi' && y > oy + HORIZON - 12) for (let k = 0; k < 3; k++) g.rect(x - 1, oy + HORIZON + 4 + k * 5 + (y - oy - HORIZON > 0 ? y - oy - HORIZON : 0), 3, 1, L.color);
      if (i === this.sel && this.active) {
        const blink = Math.floor(this.t / 300) % 2 === 0;
        g.ring(x, y, 7, blink ? '#FFE7A3' : '#B89A6A');
      }
    });
  }

  private side(g: Gfx, oy: number): void {
    g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
    const L = this.light();
    g.text(fillNames(NN_UI.names[L.id]), RX, oy + 2, { color: UI.bg2 });
    // the stopwatch
    const sx = RX + 6;
    const sy = oy + 20;
    g.circle(sx + 40, sy + 18, 18, '#C8CCD8');
    g.circle(sx + 40, sy + 18, 15, '#F4F0E0');
    g.rect(sx + 37, sy - 3, 6, 4, '#A8ACB4');
    const tn = this.t0 !== null ? Math.floor(this.shown / 100) : Math.round(this.shown / 100);
    const txt = `${Math.floor(tn / 10)}.${tn % 10}`;
    g.text(txt, sx + 40, sy + 10, { color: this.t0 !== null ? '#C8402E' : '#3A3040', align: 'center' });
    // the three measures of this light (or 名のらない)
    const y = oy + 60;
    if (L.period === null) {
      if (flag(`flag_nn_no_${L.id}`)) g.text(NN_UI.nanoranai, RX, y, { color: '#FFE7A3' });
    } else {
      const n = flag(mFlag(L.id));
      for (let i = 0; i < 3; i++) {
        const xx = RX + i * 34;
        g.rect(xx, y + 2, 30, 12, i < n ? '#F4EEDC' : '#4A4458');
        const v = flag(vFlag(L.id, i));
        if (i < n) g.text(`${Math.floor(v / 10)}.${v % 10}`, xx + 15, y, { color: '#3A3040', align: 'center' });
      }
    }
    if (this.active) NN_UI.keys.forEach((l, i) => g.text(l, RX, oy + 76 + i * 16, { color: '#FFE7A3' }));
    markText(RX - 4, oy, SX + CW - RX + 4, CH);
  }
}

let qaAuto = false;

/** (read through a function: the loop's `result = null` narrows the field for TS) */
function resultOf(p: NightSeaPanel): string | null {
  return p.result;
}

function* openPanel(p: NightSeaPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: NightSeaPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

/** 大写し：やめるか、テルの 灯台が はじめて 書けたら 'teru'。 */
function* measureSea(withRule: boolean): Co<'cancel' | 'teru'> {
  const p = new NightSeaPanel();
  p.auto = qaAuto;
  let out: 'cancel' | 'teru' = 'cancel';
  try {
    yield* openPanel(p);
    if (withRule) yield* say(T.NN_RULE);
    for (;;) {
      p.clearInput();
      p.result = null;
      p.active = true;
      while (!p.result) yield null;
      p.active = false;
      const r = String(resultOf(p));
      if (r === 'cancel') break;
      if (r === 'miss') {
        yield* say(kanenariHere() ? T.NN_MISS : T.NN_MISS_SOLO);
        continue;
      }
      if (r.startsWith('noname:')) {
        const id = r.slice(7);
        const first = !flag(`flag_nn_no_${id}`);
        setFlag(`flag_nn_no_${id}`, 1);
        if (first) yield* say((kanenariHere() ? T.NN_NONAME : T.NN_NONAME_SOLO)[id]);
        else yield* say3(`@narr\n${NN_UI.nanoranai}。`);
        if (qaAuto) p.sel = (p.sel + 1) % LIGHTS.length;
        continue;
      }
      if (r.startsWith('write:')) {
        const id = r.slice(6);
        se('se_pen_write');
        yield* say(T.NN_WRITE);
        if (T.NN_KN[id]) yield* say(T.NN_KN[id]);
        if (id === 'teru' && !flag(NF.done)) {
          out = 'teru';
          break;
        }
      }
    }
  } finally {
    yield* closePanel(p);
  }
  return out;
}

/** 5〜6：ずれて いたのは → 止めない 時計 → ごほうび。 */
function* finale(): Co {
  const v = [0, 1, 2].map((i) => fmtSec(flag(vFlag('teru', i))));
  yield* say(T.nnKazu(v[0], v[1], v[2]));
  yield* say(T.NN_TERU_DOWN);
  yield* game.fadeOut(400, '#05060E');
  setFlag(NF.scene, 1);
  field()?.refreshPresence();
  se('se_door_small', { vol: 0.5 });
  yield 500;
  yield* game.fadeIn(500);
  const i = yield* say(T.NN_TOMENAI);
  if (i === 0) yield* say(T.NN_TOMERU_KN);
  yield* say(T.NN_TOMENAI_2);
  se('se_c3_lens_beam', { vol: 0.4 });
  setFlag(NF.done, 1);
  setFlag(NF.night, nightId());
  yield* say(T.NN_SIREN_KN);
  addMp(2);
  se('se_item');
  yield* say3(T.NN_REWARD);
}

registerScript('nn_minato', function* (): Co {
  if (!night()) return;
  if (flag(NF.done)) {
    if (sceneNight()) {
      yield* say(T.NN_NERU);
      return;
    }
    yield* say(T.NN_AFTER);
    if ((yield* say(T.NN_ASK)) === 0) yield* measureSea(false);
    return;
  }
  if (!flag(NF.zure)) {
    setFlag(NF.zure, 1);
    yield* say(T.NN_ZURE);
    if (flag('flag_ch3_megane_back') && !flag(NF.megane)) {
      setFlag(NF.megane, 1);
      yield* say(T.NN_MEGANE);
    }
    return;
  }
  if (!flag(NF.teru)) {
    yield* say(T.NN_ZURE_AGAIN);
    return;
  }
  let rule = false;
  if (!flag(NF.sw)) {
    yield* say(T.NN_YOBI);
    setFlag(NF.sw, 1);
    yield* getKeyItem('item_nn_stopwatch', fillNames(T.NN_GET));
    yield* say(T.NN_YOBI_2);
    rule = true;
  } else if ((yield* say(T.NN_ASK)) !== 0) return;
  const r = yield* measureSea(rule);
  if (r === 'teru' || (flag(mFlag('teru')) >= 3 && !flag(NF.done))) yield* finale();
});

registerScript('nn_teru', function* (): Co {
  yield* say3(`@npc_c3_toudai\n今夜は、わたしが\n数えとくけえ。`);
});

/** 灯台の テル（灯室・防波堤）。 */
wrap('npc_c3_toudai', function* (_ctx, orig): Co {
  if (pgOn()) {
    const b = pgBand();
    if (b === 'yoru' && flag(NF.zure) && !flag(NF.teru)) {
      setFlag(NF.teru, 1);
      yield* say(T.NN_TERU);
      return;
    }
    if (b === 'yoru' && flag(NF.teru) && !flag(NF.done)) {
      yield* say(T.NN_TERU_AGAIN);
      return;
    }
    if (b === 'yu' && flag(NF.sw) && !flag(NF.done)) {
      yield* say(T.NN_TERU_YU);
      return;
    }
    if (b === 'asa' && flag(NF.done) && !flag(NF.teruAsa) && pgDay() > flag(NF.night)) {
      setFlag(NF.teruAsa, 1);
      yield* say(T.NN_TERU_ASA);
      return;
    }
  }
  yield* orig();
});

/** 夜光虫（港の 階段。グソっ君と、下を 向いて）。 */
registerScript('trig_nn_yakou', function* (): Co {
  const f = field();
  if (!f || !night() || f.player.dir !== 'down' || !kanenariHere()) return;
  if (flag(NF.yakou)) {
    yield* say(T.NN_YAKOU_AGAIN);
    return;
  }
  if ((yield* say(T.NN_YAKOU_ASK)) !== 0) return;
  setFlag(NF.yakou, 1);
  se('se_h_splash', { vol: 0.4, pitch: 1.4 });
  yield* say(T.NN_YAKOU);
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.nn(step = 'zure', auto = false)（クリア後の 夜 21:00。クリアデータから）
 *   'zure'    ベンチの ミナトの 前（1）
 *   'teru'    1 の あと、灯室の テルの 前（2）
 *   'yobi'    2 の あと、ミナトの 前（3 → 大写し。auto：自動で はかる）
 *   'measure' ストップウォッチの あと（大写しから）
 *   'after'   すんだ 次の 夜、ミナトの 前
 *   'asa'     すんだ 次の 朝、防波堤の テルの 前
 *   'yakou'   港の 階段の 上（下を 向いて 進むと 夜光虫）
 * グソっ君は 合流させる（'solo'：合流 なしで 'zure'）。
 */
if (import.meta.env.DEV) {
  registerDebug('nn', (step = 'zure', auto = false) => {
    if (!pgOn()) cmd().jump?.('ch3:clear', true);
    for (const id of Object.values(NF)) setFlag(id, 0);
    for (const L of LIGHTS) {
      setFlag(mFlag(L.id), 0);
      setFlag(`flag_nn_no_${L.id}`, 0);
      setFlag(`flag_nn_hana_${L.id}`, 0);
      for (let i = 0; i < 3; i++) setFlag(vFlag(L.id, i), 0);
    }
    if (state.inventory.includes('item_nn_stopwatch')) removeItem('item_nn_stopwatch');
    qaAuto = !!auto;
    const kn = step !== 'solo';
    setFlag('flag_pg_kn', kn ? 1 : 0);
    setFlag('flag_follower_hidden', kn ? 0 : 1);
    setFlag('flag_pg_yarinokoshi', 1);
    cmd().pg?.(step === 'asa' ? '7:00' : '21:00', false);
    const bench = () => cmd().warp?.('map_umizoi', 42, 32, 'up');
    if (step === 'zure' || step === 'solo') return bench();
    if (step === 'yakou') return cmd().warp?.('map_umizoi', 28, 26, 'down');
    setFlag(NF.zure, 1);
    if (step === 'teru') return cmd().warp?.('map_c3_toudai', 5, 4, 'right');
    setFlag(NF.teru, 1);
    if (step === 'yobi') return bench();
    setFlag(NF.sw, 1);
    giveKey('item_nn_stopwatch');
    if (step === 'measure') return bench();
    setFlag(NF.done, 1);
    setFlag(NF.night, nightId() - 1);
    for (let i = 0; i < 3; i++) setFlag(vFlag('teru', i), 40);
    setFlag(mFlag('teru'), 3);
    setFlag('flag_nn_hana_teru', 1);
    if (step === 'asa') {
      setFlag(NF.night, pgDay() - 1);
      return cmd().warp?.('map_umizoi', 10, 31, 'up');
    }
    return bench();
  });

  registerDebug('nnState', () => {
    const p = game.ui.widgets.find((w) => w instanceof NightSeaPanel) as NightSeaPanel | undefined;
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(NF)) flags[k] = flag(id);
    for (const L of LIGHTS) flags[`m_${L.id}`] = L.period === null ? flag(`flag_nn_no_${L.id}`) : flag(mFlag(L.id));
    return { flags, night: nightId(), band: pgBand(), panel: p ? { sel: p.sel, measuring: p.t0 !== null, result: p.result } : null };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the panel's words in their room. */
export function nnTextCheck(): { pages: number; bad: string[] } {
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
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('nn', T.NN_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of NN_UI.keys) if (measure(l) > col) bad.push(`keys: ${measure(l)}px > ${col}: ${l}`);
  for (const n of Object.values(NN_UI.names)) if (measure(fillNames(n)) > col) bad.push(`name: ${measure(fillNames(n))}px: ${n}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('nnText', () => nnTextCheck());
