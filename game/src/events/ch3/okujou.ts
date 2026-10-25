// 掃除は 上から（第3章の クリア前、段階3。げむきか 10/20 の 案3、2026-10-20 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_okujou.ts、地図は data/maps/c3_aq_okujou.ts（旧水族館の 屋上、20×10）、
// 絵は art/props/okujou_art.ts、みました帳の ページは ui/menu/book_okujou.ts。
//
//   S15 の あと（flag_ch3_aq_enter）から S20 で ホールに 入るまで（flag_ch3_tsugao1）。クリア後と S20 から 先は
//   戸は 閉まった まま（「水槽の うら」・「下の 紙の 字」と 同じ 窓）。寄らなくても 本筋は 進む。
//   ・入口と 券売所の 西の 壁 (0,4) の 鉄の 戸 obj_oj_to を 調べる（1回）→ 戸が 開く（flag_oj_to）。戸の まわりに
//     赤い ふちの 札と、すき間から 床に 落ちる 外の 光（見つけやすく。開いている 間だけ 光る）。
//   ・屋上に 出た とき 1回：カモメが 飛んで きて、屋上の 上に 入った ところで 止まる（flag_oj_in）。
//   ・屋上の 物 5つ（カモメ・給水塔・天窓・室外機・2つの 排水口。flag_oj_mono_<k>）。
//   ・南西の 排水口 (2,8)：黒い 輪（flag_oj_wa）→ 南の 手すり (8–12,9) から のぞくと ハキコ（flag_oj_talk）→
//     南西の 排水口で 大写し「排水口」HaisuiPanel：上の 物から 1つずつ（↑↓ 選ぶ・けってい 取る。flag_oj_n に 取った 数。
//     とちゅうで やめても 続きから）→ 網（flag_oj_ami）→ ボール（選ぶ。flag_oj_ball 1 落とした・2 持っている）→
//     2人で、やっと → 朱肉 +2、みました帳③の すみ（flag_oj_done）。
//   ・どこで やめても 再開に 困らない：屋上は 戸 1つで 入口の (1,4) に もどる。手順は フラグで 続きから。
//   ・かくし：「水槽の うら」が すんでいる（flag_aqura_done）→ 入った とき グソっ君（flag_oj_ura）。
//     「下の 紙の 字」で つづりを こすった（flag_sh_tsuzuri）→ 終わりに ハキコ（flag_oj_tsuzuri）。
//     ボールを 持っていた → クリア後、旧水族館の 前の ハキコに わたす（flag_oj_ball = 3）。
//
// QA：__game.cmd.okujou(step, auto)、ojState()、ojText()

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
import { fxAt, registerWorldFx } from '../../world/fx';
import type { ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { pgOn } from '../../world/postgame';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/c3_okujou';
import { OJ_UI } from '../../data/text/c3_okujou';
import { OKUJOU } from '../../data/maps/c3_aq_okujou';
import { addMp, getKeyItem, giveKey } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { addToMap, inCh3, say3 } from './common';
import { HOWTO } from '../../data/text/howto';

export const OF = {
  to: 'flag_oj_to',
  inn: 'flag_oj_in',
  ura: 'flag_oj_ura',
  wa: 'flag_oj_wa',
  talk: 'flag_oj_talk',
  rule: 'flag_oj_rule',
  n: 'flag_oj_n',
  ami: 'flag_oj_ami',
  ball: 'flag_oj_ball',
  tsuzuri: 'flag_oj_tsuzuri',
  done: 'flag_oj_done',
} as const;

const MONO = ['kamome', 'tank', 'tenmado', 'shitsugaiki', 'haisui'] as const;
type Mono = (typeof MONO)[number];
const monoF = (k: Mono) => `flag_oj_mono_${k}`;
/** 排水口は 2つとも 見て 1つ（南西 sw・南東 se）。 */
const HF = { sw: 'flag_oj_h_sw', se: 'flag_oj_h_se' } as const;

/** 上から 順に。いちばん 下の 網は 外さない。 */
export const LAYERS = ['hane', 'matsuba', 'ball', 'suna'] as const;

const IRIGUCHI = 'map_c3_aq_iriguchi';
const BALL = 'item_c3_ball';

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
  if (!t.trim()) return -1;
  return yield* say3(t);
}

/** 屋上へ 行ける 間：段階3、S15 の あと、S20 の 前（クリア後は 閉まった まま）。 */
export function ojOpen(): boolean {
  return inCh3() && !pgOn() && flag('flag_ch3_stage') === 3 && flag('flag_ch3_aq_enter') > 0 && !flag('flag_ch3_tsugao1') && !flag('flag_ch3_clear');
}

export function ojMonoN(): number {
  return MONO.filter((k) => flag(monoF(k)) > 0).length;
}

// ================================================================ 地図の 物

const openDoor = () => ojOpen() && flag(OF.to) > 0;
addToMap(IRIGUCHI, [
  // the iron door in the west wall (0,4): its plate, ajar while it can be gone through; the noon's light on the floor
  { t: 'prop', prop: 'prop_oj_to', x: 0, y: 4, opts: { open: 1 }, cond: { when: ojOpen } } as unknown as MapObj,
  { t: 'prop', prop: 'prop_oj_to', x: 0, y: 4, opts: { open: 0 }, cond: { when: () => !ojOpen() } } as unknown as MapObj,
  { t: 'prop', prop: 'prop_oj_to_hikari', x: 1, y: 4, cond: { when: ojOpen } } as unknown as MapObj,
  { t: 'door', id: 'door_c3_aq_okujou', x: 0, y: 4, to: OKUJOU, tx: 1, ty: 2, dir: 'down', se: 'se_door_heavy', cond: { when: openDoor } } as unknown as MapObj,
  { t: 'obj', id: 'obj_oj_to', x: 0, y: 4, face: 'left', script: 'obj_oj_to' } as unknown as MapObj,
]);

addToMap(OKUJOU, [
  // the gull stopped in the air over (12,6): examined from beside it (it is over the roof, not on it)
  { t: 'obj', id: 'obj_oj_kamome', x: 12, y: 6, flat: true, script: 'obj_oj_mono' },
  { t: 'obj', id: 'obj_oj_tank', x: 16, y: 1, w: 2, h: 2, script: 'obj_oj_mono' },
  { t: 'obj', id: 'obj_oj_tenmado', x: 7, y: 3, w: 5, h: 3, script: 'obj_oj_mono' },
  { t: 'obj', id: 'obj_oj_shitsugaiki', x: 3, y: 6, script: 'obj_oj_mono' },
  { t: 'obj', id: 'obj_oj_haisui_sw', x: 2, y: 8, flat: true, script: 'obj_oj_haisui_sw' },
  { t: 'obj', id: 'obj_oj_haisui_se', x: 17, y: 8, flat: true, script: 'obj_oj_haisui_se' },
  { t: 'obj', id: 'obj_oj_tesuri', x: 1, y: 9, w: 18, face: 'down', script: 'obj_oj_tesuri' },
] as unknown as MapObj[]);

// ================================================================ 大写し「排水口」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const RX = SX + 206;
/** 1つ 取るのに かかる（ms）。 */
const TAKE_MS = 520;
const SLIP_MS = 700;

export class HaisuiPanel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  /** はじめの カード（改善会議 10-25 の1、ui/closeup.ts）。 */
  howto = HOWTO.okujou;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  /** QA：いちど 下の 物を 引いてみる。 */
  autoWrong = false;
  active = false;
  /** 取った 数（0〜4）。 */
  n: number;
  /** 選んでいる 段（0 羽 〜 3 砂、4 網）。 */
  cur: number;
  /** 取っている（ms 残り）。 */
  taking = 0;
  /** 上の 物が すべっている（ms 残り）。 */
  slip = 0;
  /** 選んだ 結果（台本が 読む）。 */
  pick: { kind: 'take' | 'slip' | 'ami' | 'cancel'; layer: number } | null = null;
  private autoT = 0;
  private wasActive = false;
  private armT = 0;

  constructor(n: number) {
    this.n = n;
    this.cur = Math.min(n, 4);
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.taking > 0) this.taking = Math.max(0, this.taking - dt);
    if (this.slip > 0) this.slip = Math.max(0, this.slip - dt);
    // (the key that closed the last window must not also pick here: a moment's grace after it opens)
    if (this.active !== this.wasActive) {
      this.wasActive = this.active;
      this.armT = 0;
    }
    if (this.active) this.armT += dt;
    if (!this.active || this.pick || this.armT < 150) return;
    let move = 0;
    let ok = false;
    if (this.auto) {
      this.autoT += dt;
      if (this.autoT > 600) {
        this.autoT = 0;
        const goal = this.autoWrong && this.n === 0 ? 2 : this.n;
        if (this.cur !== goal) move = goal > this.cur ? 1 : -1;
        else ok = true;
      }
    } else {
      if (input.pressed('down')) move = 1;
      if (input.pressed('up')) move = -1;
      ok = input.pressed('confirm');
      if (input.pressed('cancel')) {
        this.pick = { kind: 'cancel', layer: this.cur };
        return;
      }
    }
    if (move) {
      const next = Math.max(this.n, Math.min(4, this.cur + move));
      if (next !== this.cur) {
        this.cur = next;
        se('se_cursor', { vol: 0.3 });
      }
    }
    if (ok) {
      if (this.cur === 4) this.pick = { kind: this.n >= 4 ? 'take' : 'slip', layer: 4 };
      else if (this.cur === this.n) this.pick = { kind: 'take', layer: this.cur };
      else this.pick = { kind: 'slip', layer: this.cur };
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
        // the roof's concrete in the noon sun, the drain's square well seen from above, a little tilted
        g.rect(SX, oy, RX - SX - 4, CH, '#C4C0B4');
        for (let yy = 0; yy < CH; yy += 6) for (let xx = (yy * 7) % 11; xx < RX - SX - 4; xx += 11) g.px(SX + xx, oy + yy, '#B4B0A4');
        // the black rings on the concrete round it
        for (let r = 0; r < 3; r++) {
          const rx = 76 + r * 14;
          const ry = 44 + r * 6;
          for (let t = 0; t < 360; t += 3) {
            const th = (t * Math.PI) / 180;
            g.px(Math.round(SX + 100 + Math.cos(th) * rx), Math.round(oy + 58 + Math.sin(th) * ry), '#6A6A64');
          }
        }
        const wx = SX + 46;
        const wy = oy + 10;
        const ww = 108;
        const wh = 92;
        g.rect(wx - 4, wy - 4, ww + 8, wh + 8, '#7A766C');
        g.rect(wx, wy, ww, wh, '#3A3A38');
        // the net at the very bottom (always there; it is never taken off)
        g.rect(wx + 6, wy + 6, ww - 12, wh - 12, '#2A2A28');
        for (let x = wx + 8; x < wx + ww - 8; x += 6) g.rect(x, wy + 6, 2, wh - 12, '#8A8A84');
        for (let y = wy + 10; y < wy + wh - 8; y += 8) g.rect(wx + 6, y, ww - 12, 1, '#7A7A74');
        // what is heaped on it, bottom up: sand, the ball, the pine needles, the feather
        const cx = wx + ww / 2;
        const cy = wy + wh / 2;
        const gone = (i: number) => i < this.n || (this.taking > 0 && i === this.n);
        const lift = (i: number) => (this.taking > 0 && i === this.n ? (1 - this.taking / TAKE_MS) * 40 : 0);
        const slipX = (i: number) => (this.slip > 0 && i === this.n ? Math.sin((1 - this.slip / SLIP_MS) * Math.PI) * 14 : 0);
        const draw = (i: number, fn: (ox: number, oy2: number, al: number) => void) => {
          if (i < this.n) return;
          const al = gone(i) ? Math.max(0, this.taking / TAKE_MS) : 1;
          g.alpha(al, () => fn(slipX(i), -lift(i), al));
        };
        // sand
        draw(3, (ox, o) => {
          for (let y = -30; y <= 30; y += 2)
            for (let x = -44; x <= 44; x += 2) {
              if ((x * x) / (44 * 44) + (y * y) / (30 * 30) > 1) continue;
              g.rect(cx + x + ox, cy + y + o, 2, 2, (x * 3 + y * 5) % 7 === 0 ? '#C8B890' : (x + y) % 6 === 0 ? '#9A8A62' : '#B0A076');
            }
        });
        // the child's rubber ball (a little soft)
        draw(2, (ox, o) => {
          for (let r = 13; r > 0; r--) g.circle(cx + 14 + ox, cy + 6 + o, r, r > 10 ? '#B8402E' : r > 4 ? '#D8503A' : '#F08A6A');
          g.rect(cx + 6 + ox, cy + 2 + o, 16, 1, '#F4F1E8', 0.6);
        });
        // the town's black-pine needles in a clump
        draw(1, (ox, o) => {
          for (let i = 0; i < 26; i++) {
            const x0 = cx - 34 + ((i * 13) % 52) + ox;
            const y0 = cy - 18 + ((i * 7) % 26) + o;
            g.line(x0, y0, x0 + 12 - (i % 3) * 6, y0 + 6 + (i % 4), i % 2 ? '#4A6A3A' : '#6A7A44');
          }
        });
        // the gull's feather on top
        draw(0, (ox, o) => {
          g.line(cx - 30 + ox, cy - 10 + o, cx + 26 + ox, cy - 28 + o, '#C8CDD4');
          for (let i = 0; i < 26; i++) {
            const x = cx - 26 + i * 2 + ox;
            const y = Math.round(cy - 11 - i * 0.64) + o;
            g.line(x, y, x - 3, y - 6 + (i % 2), '#F4F1E8');
            g.line(x, y, x + 2, y + 5, '#E8ECEE');
          }
        });
        // the right column: the layers top to bottom, the cursor, the keys
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        const names = [...LAYERS, 'ami'] as string[];
        names.forEach((key, i) => {
          const y = oy + 4 + i * 14;
          const taken = i < this.n && i < 4;
          const col = taken ? '#5A5468' : i === this.cur && this.active ? '#FFE7A3' : '#F4ECD8';
          if (i === this.cur && this.active) for (let k = 0; k < 4; k++) g.rect(RX - 1 + k, y + 3 + k, 1, 8 - k * 2, '#FFE7A3');
          g.text(OJ_UI.names[key], RX + 10, y, { color: col });
          if (taken) g.rect(RX + 10, y + 7, g.measure(OJ_UI.names[key]), 1, '#5A5468');
        });
        if (this.active) OJ_UI.keys.forEach((l, i) => g.text(l, RX, oy + 76 + i * 16, { color: '#FFE7A3' }));
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(OJ_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, OJ_UI.place, { seed: 77 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }
}

function* openPanel(p: HaisuiPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: HaisuiPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;
let qaWrong = false;

/** 5 上から 1つずつ。true：網まで 来た（false：とちゅうで やめた）。 */
function* haisui(): Co<boolean> {
  const p = new HaisuiPanel(flag(OF.n));
  p.auto = qaAuto;
  p.autoWrong = qaWrong;
  let finished = false;
  try {
    yield* openPanel(p);
    if (!flag(OF.rule)) {
      setFlag(OF.rule, 1);
      yield* say3(T.OJ_RULE);
    }
    while (p.n < 4) {
      p.pick = null;
      p.active = true;
      while (!p.pick) yield null;
      p.active = false;
      const pick = p.pick as { kind: string; layer: number };
      if (pick.kind === 'cancel') break;
      if (pick.kind === 'slip') {
        // the one on top slides toward the hole: from the top again
        p.slip = SLIP_MS;
        se('se_c3_kosogeru', { vol: 0.25, pitch: 1.3 });
        yield SLIP_MS;
        yield* say(T.OJ_KUZURE[LAYERS[p.n]] ?? T.OJ_KUZURE.hane);
        p.cur = p.n;
        continue;
      }
      // take the top one
      const key = LAYERS[p.n];
      p.taking = TAKE_MS;
      se(key === 'suna' ? 'se_c3_kosogeru' : 'se_examine', { vol: 0.4 });
      yield TAKE_MS;
      p.n++;
      setFlag(OF.n, p.n);
      p.cur = Math.min(p.n, 4);
      yield* say(knWith() || key !== 'suna' ? T.OJ_TORU[key] : '@narr\n砂を、手で すくった。');
    }
    if (p.n >= 4) {
      p.cur = 4;
      yield 300;
      setFlag(OF.ami, 1);
      se('se_item', { vol: 0.4 });
      yield* say3(T.OJ_AMI);
      finished = true;
    }
  } finally {
    yield* closePanel(p);
  }
  return finished;
}

// ================================================================ 台本

function* monoFind(k: Mono): Co {
  if (flag(monoF(k))) return;
  setFlag(monoF(k), 1);
  se('se_item', { vol: 0.4 });
  yield* say3(T.ojMono(ojMonoN()));
}

/** 入口の 西の 戸。 */
registerScript('obj_oj_to', function* (): Co {
  se('se_examine');
  if (!ojOpen()) {
    yield* say3(T.OJ_TO_SHUT);
    return;
  }
  if (!flag(OF.to)) {
    setFlag(OF.to, 1);
    se('se_door_heavy', { vol: 0.4 });
    yield* say(T.OJ_TO_FIRST);
    return;
  }
  yield* say3(T.OJ_TO_AGAIN);
});

// ---- 止まる カモメ（屋上に 出た とき 1回）：南の 手すりの 外から 飛んで きて、屋上の 上で 止まる

/** 飛んでくる カモメ（ms。0 は いない）。 */
let flyT = 0;
const FLY_MS = 1600;
/** Where the stopped gull's picture is (art/props/okujou_art.ts prop_oj_kamome at (12,6), h 30): its foot line, its height. */
const KAMOME_AT: [number, number] = [12 * 16 + 8, 6 * 16 + 15];
const KAMOME_H = 37;

registerScript('evt_oj_enter', function* (): Co {
  if (!inCh3() || flag(OF.inn)) return;
  yield 400;
  setFlag(OF.inn, 1);
  // the narration first; the gull flies in while the window is up, and stops
  flyT = 1;
  yield* say3(T.OJ_IN.split('\n/\n')[0]);
  while (flyT > 0 && flyT < FLY_MS) yield null;
  flyT = 0;
  yield* say(`@narr\n${T.OJ_IN.slice(T.OJ_IN.indexOf('\n/\n') + 3)}`);
  if (flag('flag_aqura_done') && !flag(OF.ura) && knWith()) {
    setFlag(OF.ura, 1);
    yield* say(T.OJ_IN_URA);
  }
});

registerWorldFx({
  map: OKUJOU,
  anchored: true,
  update(_f, dt) {
    if (flyT > 0 && flyT < FLY_MS) flyT = Math.min(FLY_MS, flyT + dt);
  },
  draw(f, g, cx, cy, layer) {
    if (layer !== 'top' || flyT <= 0 || flyT >= FLY_MS) return;
    // from over the south rail's far side (the town), in a slow glide, then stopped dead
    const u = ease.cubicOut(flyT / FLY_MS);
    const x = KAMOME_AT[0] + 90 * (1 - u);
    const y = KAMOME_AT[1] + 70 * (1 - u);
    const h = KAMOME_H + 16 * (1 - u);
    const [sx, sy] = fxAt(f, x, y - h, cx, cy, y);
    const flap = Math.sin(flyT / 90) * 4 * (1 - u);
    const X = Math.round(sx);
    const Y = Math.round(sy);
    for (const [dy, c] of [[0, '#3A3F48'], [1, '#9AA0A8'], [2, '#F4F1E8']] as const) {
      g.line(X - 14, Y - Math.round(flap) + dy, X, Y + 4 + dy, c);
      g.line(X, Y + 4 + dy, X + 14, Y - Math.round(flap) + dy, c);
    }
    g.rect(X - 2, Y + 4, 5, 5, '#FFFFFF');
    g.px(X, Y + 9, '#FFD23F');
  },
});
// (the stopped gull's picture shows once it has flown in: the prop reads flag_oj_in)

/** 屋上の 物（カモメ・給水塔・天窓・室外機）。 */
registerScript('obj_oj_mono', function* (ctx: ScriptCtx): Co {
  const id = ctx.source;
  se('se_examine');
  if (id === 'obj_oj_kamome') {
    if (!flag(OF.inn)) return;
    yield* say(T.OJ_KAMOME);
    yield* monoFind('kamome');
  } else if (id === 'obj_oj_tank') {
    yield* say3(T.OJ_TANK);
    yield* monoFind('tank');
  } else if (id === 'obj_oj_tenmado') {
    yield* say3(T.OJ_TENMADO);
    yield* monoFind('tenmado');
  } else if (id === 'obj_oj_shitsugaiki') {
    yield* say(T.OJ_SHITSUGAIKI);
    yield* monoFind('shitsugaiki');
  }
});

function* haisuiSeen(k: 'sw' | 'se'): Co {
  setFlag(HF[k], 1);
  if (flag(HF.sw) && flag(HF.se)) yield* monoFind('haisui');
}

/** 南東の 排水口（くらべる）。 */
registerScript('obj_oj_haisui_se', function* (): Co {
  se('se_examine');
  yield* say3(T.OJ_SE);
  yield* haisuiSeen('se');
});

/** 南西の 排水口：黒い 輪 → （ハキコの あと）上から 1つずつ → ボール → 2人で。 */
registerScript('obj_oj_haisui_sw', function* (): Co {
  se('se_examine');
  if (flag(OF.done) || !ojOpen()) {
    yield* say3(flag(OF.ami) ? T.OJ_WA_DONE : T.OJ_WA_AGAIN.split('\n@')[0]);
    yield* haisuiSeen('sw');
    return;
  }
  if (!flag(OF.wa)) {
    setFlag(OF.wa, 1);
    yield* say(T.OJ_WA);
    yield* haisuiSeen('sw');
    return;
  }
  if (!flag(OF.talk)) {
    yield* say(T.OJ_WA_AGAIN);
    return;
  }
  if (!flag(OF.ami)) {
    const ok = yield* haisui();
    if (!ok) {
      yield* say(T.OJ_STOP);
      return;
    }
  }
  yield* finish();
});

/** 6〜8（網まで 来た あと）。とちゅうで やめても、次に 排水口を 調べると ここから。 */
function* finish(): Co {
  if (!flag(OF.ball)) {
    const r = yield* say(T.OJ_BALL_A);
    if (r === 1) {
      setFlag(OF.ball, 2);
      yield* say3(T.OJ_BALL_KEEP);
      yield* getKeyItem(BALL, T.OJ_GET_BALL, false);
    } else {
      setFlag(OF.ball, 1);
      se('se_c3_kosogeru', { vol: 0.3, pitch: 1.6 });
      yield* say(T.OJ_BALL_DROP);
    }
  }
  yield* say(knWith() ? T.OJ_FUTARI : T.OJ_FUTARI_SOLO);
  if (flag('flag_sh_tsuzuri') && !flag(OF.tsuzuri)) {
    setFlag(OF.tsuzuri, 1);
    yield* say3(T.OJ_TSUZURI);
  }
  setFlag(OF.done, 1);
  addMp(2);
  se('se_item');
  yield* say3(T.OJ_REWARD);
}

/** 南の 手すり：まん中 (8–12) から のぞくと ハキコ、ほかは 景色。 */
registerScript('obj_oj_tesuri', function* (): Co {
  se('se_examine');
  const f = field();
  const x = f?.player.tileX ?? 10;
  if (x < 8 || x > 12 || !ojOpen()) {
    yield* say3(T.OJ_TESURI);
    return;
  }
  if (flag(OF.done)) {
    yield* say3(T.OJ_TALK_DONE);
    return;
  }
  if (!flag(OF.wa)) {
    yield* say3(T.OJ_SHITA_BEFORE);
    return;
  }
  if (flag(OF.talk)) {
    yield* say3(flag(OF.ami) ? T.OJ_TALK_DONE : T.OJ_TALK_AGAIN);
    return;
  }
  yield* say(T.OJ_TALK_A);
  yield* say(knWith() ? T.OJ_TALK_B : T.OJ_TALK_SOLO);
  setFlag(OF.talk, 1);
});

// ---- クリア後：ボールを 持っていた 人だけ、旧水族館の 前の ハキコに わたす（1回。包むのは okujou_pg.ts）

/** クリア後の ハキコ：ボールを 返す（返したら true）。 */
export function* ojPgBall(): Co<boolean> {
  if (!pgOn() || flag(OF.ball) !== 2 || !state.inventory.includes(BALL)) return false;
  setFlag(OF.ball, 3);
  while (state.inventory.includes(BALL)) removeItem(BALL);
  yield* say3(T.OJ_PG_BALL);
  return true;
}

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.okujou(step = 'to', auto = false)（段階3、S15 の あと、S20 の 前）
 *   'to'      入口の 西の 戸の 前 (1,4) 左向き（調べると 開く。そのまま 左へ 歩くと 屋上）
 *   'in'      戸が 開いた あと、屋上の 入口 (1,2)（入った ときの カモメ）
 *   'wa'      カモメの あと、南西の 排水口の 前 (3,8) 左向き
 *   'tesuri'  黒い 輪の あと、手すりの 前 (10,8) 下向き（ハキコ）
 *   'haisui'  ハキコの あと、南西の 排水口の 前（大写し）。'wrong' は auto で いちど 下の 物を 引く
 *   'half'    2つ 取った ところで やめた あと（続きから）
 *   'ball'    網まで 来た あと（ボールから）
 *   'pg'      クリア後、ボールを 持って 旧水族館の 前（岬）の ハキコの 前
 */
if (import.meta.env.DEV) {
  registerDebug('okujou', (step = 'to', auto = false) => {
    if (step === 'pg') {
      // (as iso.ts's QA: after the clear, the noon 11:30, グソっ君 along)
      if (!pgOn()) cmd().jump?.('ch3:clear', true);
      setFlag('flag_pg_kn', 1);
      setFlag('flag_follower_hidden', 0);
      cmd().pg?.('11:30', false);
      setFlag(OF.ball, 2);
      giveKey(BALL);
      return cmd().warp?.('map_c3_misaki', 25, 14, 'up');
    }
    cmd().jump?.('ch3:kairo', true);
    for (const id of Object.values(OF)) setFlag(id, 0);
    for (const k of MONO) setFlag(monoF(k), 0);
    for (const id of Object.values(HF)) setFlag(id, 0);
    while (state.inventory.includes(BALL)) removeItem(BALL);
    qaAuto = !!auto || step === 'wrong';
    qaWrong = step === 'wrong';
    flyT = 0;
    setFlag('flag_ch3_stage', 3);
    setFlag('flag_ch3_aq_enter', 1);
    setFlag('flag_ch3_tsugao1', 0);
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (step === 'to') return go(IRIGUCHI, 1, 4, 'left');
    setFlag(OF.to, 1);
    if (step === 'in') return go(OKUJOU, 1, 2, 'down');
    setFlag(OF.inn, 1);
    if (step === 'wa') return go(OKUJOU, 3, 8, 'left');
    setFlag(OF.wa, 1);
    setFlag(HF.sw, 1);
    if (step === 'tesuri') return go(OKUJOU, 10, 8, 'down');
    setFlag(OF.talk, 1);
    setFlag(OF.rule, 1);
    if (step === 'haisui' || step === 'wrong') {
      setFlag(OF.rule, 0);
      return go(OKUJOU, 3, 8, 'left');
    }
    if (step === 'half') {
      setFlag(OF.n, 2);
      return go(OKUJOU, 3, 8, 'left');
    }
    setFlag(OF.n, 4);
    setFlag(OF.ami, 1);
    return go(OKUJOU, 3, 8, 'left');
  });

  registerDebug('ojState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(OF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof HaisuiPanel) as HaisuiPanel | undefined;
    const f = field();
    return {
      flags,
      mono: ojMonoN(),
      open: ojOpen(),
      ball: state.inventory.includes(BALL),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      panel: p ? { n: p.n, cur: p.cur, active: p.active } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no 天丼 but ハキコ's; no clock time; no S19 words; the names without さん in the narration. */
export function ojTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', '飼育係', '係長', '1つだけ', 'えさ', '日誌', 'ポコシャ', '具足', 'ほどよいなぁ', 'ピッ！', 'おかわり、あるよ'];
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
  walkT('oj', T.OJ_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of [...OJ_UI.keys, ...Object.values(OJ_UI.names).map((n) => `　${n}`)]) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  if (4 + 5 * 14 > 76) bad.push('右の 列: 名前が 鍵に かかる');
  if (76 + OJ_UI.keys.length * 16 > CH) bad.push('keys: too low');
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('ojText', () => ojTextCheck());
