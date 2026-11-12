// 切ったら、また なる（第2章。げむきか 10/25 の 案5、2026-10-25 依頼主の 採用。02_ch2_index）。
// 文は data/text/hoshi_akinasu.ts、絵は art/props/akinasu_art.ts（ナスの 株）、みました帳の ページは ui/menu/book_akinasu.ts。
//
//   段階1〜2（トマトの 灯り）。段階0 は ぴょん夫人の 1 の 最初の 3ページと「暗くて、花が 見えんのよ。」だけ（1回）。
//   クリア後の 夜は 足さない。グソっ君が いなくても 進む（グソっ君の 台詞は 抜く）。
//   ・集会所の ぴょん夫人：お茶を 1回 飲んだ あと、次の お茶の あとに〔akinasu〕（flag_an_start）。「ええ 色の わけ」
//     （iro.ts）の 紫の ナスが まだ 出ていない ときと、色あわせの 続きを 待っている 間は 出さない（そちらが 先）。
//     きゅうりの かくしの 1行（kyuri_late）が 出た 回も 出さない。ほかの 寄り道の 用を 先に 通すので、ch2 の いちばん あとに import。
//   ・ナスの 株 obj_an_nasu_1〜3（区長の 家の 西の 路地 (33,33)・(33,34)・(33,35)。(32,y) から 東向き）：
//     大写し「ナスの 花」NasuPanel（↑ で 灯りを 1段ずつ 近づける。3段で 花の まん中が 見える。失敗は ない）。
//     1株目 めしべが 長い・2株目 短い（おしべに かくれる）・3株目 親指くらいの 実。めしべと おしべの 長さは 右の 列に
//     色の 棒（緑 めしべ・黄 おしべ）でも 出す。見た 花は flag_an_mi の ビット。
//   ・3株 見たら ぴょん夫人 → 3 めしべが しゃべる（じょうろと 肥やしを あずかる：flag_an_meshibe）→ 2株目の 根もと
//     （flag_an_water）→ ぴょん夫人 → 4 嫁に 食わすな（ハモ区長が 教卓の 横から 口を はさむ。歩かない）→ 5 → ごほうび。
//   ・かくし：3株目を 2回目に 見る → とげ（flag_an_toge）。1株目を のぞいた まま ↑ を 押しつづける → アリ（flag_an_ari）。
//     「ええ 色の わけ」（flag_ir_done）→ 5 の あとに 1行。
//
// QA：__game.cmd.akinasu(step, stage, auto)、anState()、anText()、anAim(step)

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
import { getMapDef, registerMap } from '../../world/maps';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import type { Howto } from '../../ui/closeup';
import * as T from '../../data/text/hoshi_akinasu';
import { AN_UI } from '../../data/text/hoshi_akinasu';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { hStage, lanternOn } from './common';

export const NF = {
  h0: 'flag_an_h0',
  start: 'flag_an_start',
  mi: 'flag_an_mi',
  meshibe: 'flag_an_meshibe',
  water: 'flag_an_water',
  done: 'flag_an_done',
  toge: 'flag_an_toge',
  ari: 'flag_an_ari',
  iro: 'flag_an_iro',
} as const;

const VILLAGE = 'map_hoshimidai';
const SCHOOL = 'map_hoshi_school';
/** 3株（西の 列。北から）。 */
export const AN_KABU_AT: [number, number][] = [
  [33, 33],
  [33, 34],
  [33, 35],
];

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

/** 寄り道が 開いている：段階1〜2、トマトの 灯り、クリアの 前。 */
export function anOpen(): boolean {
  const s = hStage();
  return s >= 1 && s <= 2 && lanternOn() && !pgOn() && !flag('flag_ch2_boss_beaten');
}

export const anMiN = (): number => [0, 1, 2].filter((i) => flag(NF.mi) & (1 << i)).length;

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

const kabuId = (i: number): string => `obj_an_nasu_${i + 1}`;

{
  const def = getMapDef(VILLAGE);
  if (def) {
    def.objects.push(
      // three eggplants in the alley west of the ほうき house, along the house (the alley's west side stays open to walk;
      // the 防火灯's pole at (32,37) stands tall in front of that side, so the plants are on the other)
      ...AN_KABU_AT.map(([x, y], i) => ({ t: 'prop', id: `prop_an_nasu_${i + 1}`, prop: 'prop_an_nasu', x, y, opts: { i }, solid: [0, 0, 1, 1] }) as unknown as MapObj),
      ...AN_KABU_AT.map(([x, y], i) => ({ t: 'obj', id: kabuId(i), x, y, face: 'right', script: 'obj_an_nasu' }) as unknown as MapObj),
    );
    registerMap(def);
  }
}

// ================================================================ 大写し「ナスの 花」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const RX = SX + 204;
const KEYS_Y = 94;
/** 灯りの 段（0 遠い 〜 3 花の すぐ 下）。 */
const NEAR = 3;
/** かくしの アリ：のぞいた まま ↑ を 押しつづける 長さ（ms）。 */
const ARI_MS = 1200;

type Phase = 'idle' | 'near' | 'look';

export class NasuPanel implements Widget {
  modal = true;
  /** 大写し（engine/touch.ts：絵の 外の タッチも けってい）。 */
  closeup = true;
  /** やり方の カード（ui/closeup.ts。はじめての 1回）。 */
  howto: Howto = AN_UI.howto;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  /** QA：auto の とき、1株目で ↑ を 押しつづける（アリ）。 */
  autoAri = false;
  phase: Phase = 'idle';
  /** 何株目（0〜2）。 */
  kabu = 0;
  /** 灯りの 段と、絵の 灯り（なめらかに 追う）。 */
  step = 0;
  lit = 0;
  /** 花の まん中が 見えた。 */
  revealed = false;
  /** かくしの 絵：へたの とげ・花の うらの アリ。 */
  toge = false;
  ari = false;
  /** look の 間に ↑ を 押しつづけた 長さ。 */
  holdUp = 0;
  hit = false;
  private autoT = 0;

  update(dt: number, input: Input): void {
    this.t += dt;
    this.lit += (this.step - this.lit) * Math.min(1, dt / 120);
    if (this.phase === 'idle') return;
    let up = false;
    let dn = false;
    let upHeld = false;
    let ok = false;
    if (this.auto) {
      this.autoT += dt;
      const tick = Math.floor(this.autoT / 320) !== Math.floor((this.autoT - dt) / 320);
      if (this.phase === 'near' && tick) up = true;
      if (this.phase === 'look') {
        if (this.autoAri && this.kabu === 0 && !flag(NF.ari)) upHeld = true;
        else if (tick) ok = true;
      }
    } else {
      up = input.pressed('up');
      dn = input.pressed('down');
      upHeld = input.down('up');
      ok = input.pressed('confirm');
    }
    if (this.phase === 'near') {
      if (up && this.step < NEAR) {
        this.step++;
        se('se_cursor', { vol: 0.3, pitch: 0.9 + this.step * 0.08 });
      } else if (dn && this.step > 0) {
        this.step--;
        se('se_cursor', { vol: 0.25, pitch: 0.85 });
      }
    } else if (this.phase === 'look') {
      this.holdUp = upHeld ? this.holdUp + dt : 0;
      if (ok) this.hit = true;
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
        g.clip(SX, oy, RX - SX - 4, CH, () => this.drawScene(g, oy));
        this.drawSide(g, oy);
      });
      const tw = g.measure(AN_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, AN_UI.place, { seed: 83 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  /** 花の まん中（おしべの 円すいの 上の 端）。 */
  private center(oy: number): [number, number] {
    return [SX + 100, oy + 34];
  }

  private drawScene(g: Gfx, oy: number): void {
    const W = RX - SX - 4;
    const L = Math.max(0, Math.min(1, this.lit / NEAR));
    // the alley at night
    g.rect(SX, oy, W, CH, '#12161E');
    // the leaves round the flower (eggplant leaves: big, wavy, purple veins)
    for (const [lx, ly, rx, ry] of [[SX + 26, oy + 30, 26, 16], [SX + 176, oy + 26, 26, 15], [SX + 34, oy + 92, 30, 16], [SX + 172, oy + 90, 28, 16], [SX + 100, oy + 4, 30, 10]] as const) {
      for (let y = -ry; y <= ry; y++) {
        const h = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))) + Math.sin(y / 2) * 2);
        if (h > 0) g.rect(lx - h, ly + y, h * 2, 1, y < 0 ? '#2E4E2A' : '#24402A');
      }
      g.line(lx - rx + 4, ly, lx + rx - 4, ly, '#5A3462');
    }
    const [cx, cy] = this.center(oy);
    // the tomato's light coming up from below: its warm glow behind the flower (not over its colours)
    const ly2 = oy + CH - 5;
    for (let r = 30 + Math.round(L * 40); r > 0; r -= 8) g.alpha(0.04 + 0.03 * L, () => g.circle(cx, ly2 - 10 - Math.round(L * 20), r, '#F28A3A'));
    // the stalk the flower hangs from (from the branch above)
    g.rect(cx - 1, oy, 3, Math.max(1, cy - oy - 20), '#4A3050');
    if (this.kabu === 2) this.drawFruit(g, cx, cy);
    else this.drawFlower(g, cx, cy, L);
    // the dark: the light reaches more as it comes up
    g.alpha(0.78 * (1 - L), () => g.rect(SX, oy, W, CH, '#06080C'));
    // the lantern itself
    g.circle(cx, ly2, 6, '#E23B2E');
    g.rect(cx - 2, ly2 - 4, 3, 2, '#FF8A6A');
    g.rect(cx - 1, ly2 - 8, 2, 3, '#4E7A34');
  }

  /** 下を 向いて 咲く 紫の 花（下から のぞく。大きく）。kabu 0：長い めしべ、1：短い めしべ。 */
  private drawFlower(g: Gfx, cx: number, cy: number, L: number): void {
    // the calyx (green, a few spines) where the stalk meets the flower
    g.rect(cx - 9, cy - 22, 19, 7, '#4E7A34');
    for (const x of [-8, -3, 2, 7]) g.rect(cx + x, cy - 24, 1, 2, '#C8D8B0');
    // the purple petals: a bell opening downward, its five points flaring out
    for (let y = 0; y < 30; y++) {
      const h = 9 + Math.round(y * 1.2);
      g.rect(cx - h, cy - 15 + y, h * 2 + 1, 1, y < 5 ? '#7A52A8' : '#9A6AC8');
    }
    for (let k = 0; k < 5; k++) {
      const px = cx - 40 + k * 18;
      g.rect(px, cy + 15, 10, 4, '#A878D4');
      g.rect(px + 3, cy + 19, 4, 3, '#B488DC');
    }
    for (let k = -2; k <= 2; k++) g.line(cx, cy - 14, cx + k * 15, cy + 16, '#7A4AA8');
    // the inside, seen in the light: the yellow stamens in a cone, the pistil down its middle
    const a = Math.max(0, (L - 0.4) / 0.6);
    if (a <= 0) return;
    g.alpha(a, () => {
      // the throat (pale) behind
      g.rect(cx - 12, cy - 6, 25, 20, '#E0CCEC');
      // the stamens: five yellow anthers standing close round the middle, a cone down to its tip (cy + 22)
      for (let y = 0; y < 28; y++) {
        const h = Math.max(1, 9 - Math.floor(y / 3.5));
        g.rect(cx - h, cy - 6 + y, h * 2 + 1, 1, y % 5 === 4 ? '#C89A18' : '#F4C820');
      }
      for (let k = -2; k <= 2; k++) g.line(cx + k * 3, cy - 5, cx + k, cy + 20, '#C89A18');
      // the pistil (bright green, its tip pale): long: well out past the stamens' tip; short: hidden inside them
      if (this.kabu === 0) {
        const tip = cy + 40;
        g.rect(cx - 1, cy + 20, 3, tip - cy - 20, '#9AD850');
        g.rect(cx - 2, cy + 20, 1, tip - cy - 20, '#5A8A2A');
        g.rect(cx - 4, tip, 9, 5, '#E8FF9A');
        g.frame(cx - 5, tip - 1, 11, 7, '#5A8A2A');
      } else {
        // only a glimpse of its tip between the anthers, well short of the cone's end
        g.rect(cx - 1, cy + 2, 3, 6, '#9AD850', 0.9);
        g.rect(cx - 2, cy + 8, 5, 3, '#E8FF9A', 0.9);
      }
      // the ant on the petals' underside (once)
      if (this.ari) {
        const ax = cx + 26 + Math.round(Math.sin(this.t / 300) * 2);
        const ay = cy + 8;
        g.rect(ax, ay, 3, 3, '#14100C');
        g.rect(ax + 3, ay, 3, 2, '#14100C');
        g.rect(ax + 6, ay - 1, 3, 3, '#14100C');
        for (const lx of [1, 3, 5]) g.px(ax + lx, ay + 3, '#2A2018');
      }
    });
  }

  /** 3株目：花の あとの 親指くらいの ナス（へたに とげ。大きく）。 */
  private drawFruit(g: Gfx, cx: number, cy: number): void {
    // the calyx (green), its spines bright when looked at closely
    g.rect(cx - 10, cy - 22, 21, 8, '#4E7A34');
    g.rect(cx - 13, cy - 15, 5, 4, '#4E7A34');
    g.rect(cx + 9, cy - 15, 5, 4, '#4E7A34');
    const spine = this.toge ? '#FFFFFF' : '#B8C8A0';
    for (const [x, y] of [[-8, -24], [-3, -25], [3, -25], [8, -24], [-12, -17], [12, -17], [-5, -19], [5, -19]] as const) {
      g.rect(cx + x, cy + y, 1, this.toge ? 3 : 2, spine);
    }
    // the little fruit: glossy dark purple, a thumb's size
    for (let y = 0; y < 38; y++) {
      const h = Math.round(10 * Math.sqrt(Math.max(0, 1 - ((y - 19) * (y - 19)) / 361)) + 1);
      g.rect(cx - h, cy - 14 + y, h * 2 + 1, 1, y < 4 ? '#4A2A5A' : '#3A1E4A');
    }
    g.rect(cx - 5, cy - 8, 3, 18, '#8A6AA8');
    // the dried flower left at its tip
    g.rect(cx - 3, cy + 24, 7, 4, '#7A6A5A');
    g.rect(cx - 1, cy + 28, 3, 2, '#5A4A3A');
  }

  private drawSide(g: Gfx, oy: number): void {
    const x = RX - 4;
    const w = SX + CW - RX + 4;
    g.rect(x, oy, w, CH, '#2A2236');
    g.text(AN_UI.kabu(this.kabu), RX, oy + 4, { color: '#F4ECD8' });
    // the light's steps (a little ladder of dots, filled as it comes up)
    for (let i = 0; i < NEAR; i++) g.rect(RX + 54 + i * 10, oy + 10, 6, 6, i < this.step ? '#F28A3A' : '#4A4258');
    if (this.revealed) {
      if (this.kabu === 2) {
        g.text(AN_UI.mi, RX, oy + 28, { color: '#C8C0D8' });
        g.rect(RX + 28, oy + 30, 8, 14, '#3A1E4A');
        g.rect(RX + 27, oy + 28, 10, 3, '#4E7A34');
      } else {
        // the lengths side by side, in their own colours: the stamens (yellow) and the pistil (green)
        const BX = RX + 54;
        const oshibe = 30;
        const meshibe = this.kabu === 0 ? 46 : 16;
        g.text(AN_UI.oshibe, RX, oy + 26, { color: '#F4C820' });
        g.rect(BX, oy + 32, oshibe, 6, '#F4C820');
        g.text(AN_UI.meshibe, RX, oy + 46, { color: '#B8E870' });
        g.rect(BX, oy + 52, meshibe, 6, '#B8E870');
        g.rect(BX + oshibe, oy + 30, 1, 30, '#8A84A0');
        const word = this.kabu === 0 ? AN_UI.nagai : AN_UI.mijikai;
        g.text(word, RX, oy + 66, { color: this.kabu === 0 ? '#B8E870' : '#F07060' });
      }
    }
    const key = this.phase === 'near' ? AN_UI.keys.near : this.phase === 'look' ? AN_UI.keys.look : '';
    if (key) g.text(key, RX, oy + KEYS_Y, { color: '#FFE7A3' });
    markText(x, oy, w, CH);
  }
}

function* openPanel(p: NasuPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: NasuPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;
let qaAri = false;

/** 2 大写し「ナスの 花」（k 株目）。 */
function* nasuHana(k: number): Co {
  const p = new NasuPanel();
  p.kabu = k;
  p.auto = qaAuto;
  p.autoAri = qaAri;
  const seen = !!(flag(NF.mi) & (1 << k));
  let all = false;
  try {
    yield* openPanel(p);
    if (!seen) {
      p.phase = 'near';
      while (p.step < NEAR) yield null;
      p.phase = 'idle';
      yield 300;
      p.revealed = true;
      se('se_item', { vol: 0.3 });
      yield 300;
      if (kanenariHere()) se('se_emote', { vol: 0.4 });
      yield* say(T.AN_HANA[k]);
      setFlag(NF.mi, flag(NF.mi) | (1 << k));
      yield* runMsg(T.anCount(anMiN()));
      all = anMiN() >= 3;
    } else {
      p.step = NEAR;
      p.lit = NEAR;
      p.revealed = true;
      // かくし：3株目の 小さな ナスを 2回目に 見る（1回）
      if (k === 2 && !flag(NF.toge)) {
        setFlag(NF.toge, 1);
        p.toge = true;
        yield 400;
        se('se_emote', { vol: 0.4 });
        yield* say(T.AN_TOGE);
      }
    }
    // のぞいた まま：けってい で おわる（1株目は ↑ を 押しつづけると アリ。1回）
    p.hit = false;
    p.phase = 'look';
    while (!p.hit) {
      yield null;
      if (k === 0 && !flag(NF.ari) && p.holdUp >= ARI_MS) {
        setFlag(NF.ari, 1);
        p.phase = 'idle';
        p.ari = true;
        yield 300;
        yield* say(T.AN_ARI);
        p.holdUp = 0;
        p.hit = false;
        p.phase = 'look';
      }
    }
    p.phase = 'idle';
  } finally {
    yield* closePanel(p);
  }
  if (all && !flag(NF.meshibe)) yield* say(T.AN_SOROTTA);
}

// ================================================================ 台本

/** ナスの 株（3つ）。 */
registerScript('obj_an_nasu', function* (ctx: ScriptCtx): Co {
  se('se_examine');
  const k = Math.max(0, AN_KABU_AT.findIndex((_, i) => kabuId(i) === ctx.source));
  if (hStage() === 0 && !pgOn()) {
    yield* runMsg(T.AN_KABU_DARK);
    return;
  }
  if (flag(NF.done)) {
    yield* runMsg(k === 1 ? T.AN_NE_WET : T.AN_KABU_AFTER);
    return;
  }
  if (!anOpen() || !flag(NF.start)) {
    yield* runMsg(T.AN_KABU);
    return;
  }
  const seen = !!(flag(NF.mi) & (1 << k));
  if (k === 1 && seen) {
    // the second one's foot: dry, then watered once (with the can from ぴょん夫人)
    if (flag(NF.meshibe) && !flag(NF.water)) {
      se('se_h_yunomi_pour', { vol: 0.4, pitch: 0.7 });
      setFlag(NF.water, 1);
      field()?.refreshPresence?.();
      yield* runMsg(T.AN_MIZU);
      return;
    }
    yield* runMsg(flag(NF.water) ? T.AN_NE_WET : T.AN_NE_DRY);
    return;
  }
  yield* nasuHana(k);
});

/** 4 嫁に 食わすな → 5 また なる → 6 ごほうび。 */
function* finale(): Co {
  const f = field();
  const kucho = f?.actorById('npc_hoshi_kucho');
  if (kucho) {
    kucho.data.scripted = true;
    kucho.dir = 'left';
  }
  try {
    yield* say(T.AN_YOME);
  } finally {
    if (kucho) {
      kucho.dir = 'down';
      delete kucho.data.scripted;
    }
  }
  yield* say(T.AN_MATA);
  if (flag('flag_ir_done') && !flag(NF.iro)) {
    setFlag(NF.iro, 1);
    yield* say(T.AN_IRO);
  }
  setFlag(NF.done, 1);
  addMp(2);
  se('se_item');
  yield* runMsg(T.AN_REWARD);
}

/** ぴょん夫人の、お茶の 前の 用（花を 見た あとの 続き。した とき true）。 */
function* yoshieFirst(): Co<boolean> {
  if (!onMap(SCHOOL) || !anOpen() || !flag(NF.start) || flag(NF.done)) return false;
  if (flag(NF.water)) {
    yield* finale();
    return true;
  }
  if (anMiN() >= 3 && !flag(NF.meshibe)) {
    // 3 めしべが しゃべる（じょうろと 肥やしを あずかる）
    se('se_examine', { vol: 0.4 });
    yield* say(T.AN_MESHIBE);
    setFlag(NF.meshibe, 1);
    return true;
  }
  return false;
}

/** ぴょん夫人の、お茶の あとの 用。 */
function* yoshieAfter(before: { rest: number; irNasu: number; ky: number }): Co {
  if (!onMap(SCHOOL) || pgOn() || flag('flag_ch2_boss_beaten')) return;
  if (flag('flag_ch2_rest_count') <= before.rest || before.rest < 1) return;
  if (flag(NF.start)) {
    if (flag(NF.done) || !anOpen()) return;
    yield* say(flag(NF.meshibe) ? T.AN_MESHIBE_WAIT : T.AN_WAIT);
    return;
  }
  // 「ええ 色の わけ」が 先（紫の ナスが 出る 前・その 回・色あわせの 続きを 待つ 間）、きゅうりの 1行が 出た 回は 出さない
  if (!before.irNasu || flag('flag_ir_nasu') !== before.irNasu) return;
  if (flag('flag_ir_ikan') && !flag('flag_ir_awase')) return;
  if (flag('flag_ky_yoshie') !== before.ky) return;
  if (hStage() === 0) {
    if (flag(NF.h0)) return;
    setFlag(NF.h0, 1);
    yield* say(T.AN_H0);
    return;
  }
  if (!anOpen()) return;
  setFlag(NF.start, 1);
  yield* say(flag(NF.h0) ? T.AN_START_LIT : T.AN_START);
}

for (const id of ['npc_hoshi_yoshie', 'evt_ch2_rest_yoriai'])
  wrap(id, function* (_ctx, orig): Co {
    if (yield* yoshieFirst()) return;
    const before = { rest: flag('flag_ch2_rest_count'), irNasu: flag('flag_ir_nasu'), ky: flag('flag_ky_yoshie') };
    yield* orig();
    yield* yoshieAfter(before);
  });

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.akinasu(step = 'yoshie', stage = 'h1', auto = false)
 *   'h0'      段階0、お茶を 1回 飲んだ あと、ぴょん夫人の 前 (3,5) 西向き（話すと 3ページと「暗くて」）
 *   'yoshie'  段階1、お茶を 1回 飲んだ あと（紫の ナスも すんだ）、ぴょん夫人の 前（話すと〔akinasu〕）
 *   'kabu'    〔akinasu〕の あと、1株目の 前 (32,33) 東向き（大写し）
 *   'ari'     auto で 1株目の アリまで（かくし）
 *   'meshibe' 3株 見た あと、ぴょん夫人の 前（3 めしべが しゃべる）
 *   'mizu'    じょうろを 持って、2株目の 前 (32,34) 東向き
 *   'kucho'   水を やった あと、ぴょん夫人の 前（4・5、かくしの「ええ 色」も）
 *   'after'   すんだ あと、2株目の 前
 */
if (import.meta.env.DEV) {
  registerDebug('akinasu', (step = 'yoshie', stg = 'h1', auto = false) => {
    if (step === 'h0') cmd().jump?.('ch2:house', true);
    else if (stg === 'h2') cmd().jump?.('ch2:hill', true);
    else cmd().jump?.('ch2:houki', true);
    for (const id of Object.values(NF)) setFlag(id, 0);
    qaAuto = !!auto || step === 'ari';
    qaAri = step === 'ari';
    setFlag('flag_ch2_rest_count', Math.max(1, flag('flag_ch2_rest_count')));
    setFlag('flag_ir_nasu', 1);
    setFlag('flag_ir_ikan', 0);
    setFlag('flag_ir_done', step === 'kucho' ? 1 : 0);
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (step === 'h0' || step === 'yoshie') return go(SCHOOL, 3, 5, 'left');
    setFlag(NF.start, 1);
    if (step === 'kabu' || step === 'ari') return go(VILLAGE, 32, 33, 'right');
    setFlag(NF.mi, 7);
    if (step === 'meshibe') return go(SCHOOL, 3, 5, 'left');
    setFlag(NF.meshibe, 1);
    if (step === 'mizu') return go(VILLAGE, 32, 34, 'right');
    setFlag(NF.water, 1);
    if (step === 'kucho') return go(SCHOOL, 3, 5, 'left');
    setFlag(NF.done, 1);
    return go(VILLAGE, 32, 34, 'right');
  });

  registerDebug('anAim', (s = NEAR) => {
    const p = game.ui.widgets.find((w) => w instanceof NasuPanel) as NasuPanel | undefined;
    if (!p) return 'no panel';
    p.step = Math.max(0, Math.min(NEAR, Number(s)));
    return p.step;
  });

  registerDebug('anState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(NF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof NasuPanel) as NasuPanel | undefined;
    const f = field();
    return {
      flags,
      mi: anMiN(),
      open: anOpen(),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      panel: p ? { kabu: p.kabu, step: p.step, phase: p.phase, revealed: p.revealed } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines; the panel's words in their room. */
export function anTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足', '平和', '3人', '海', '水族館', 'いただきます', 'ほどよい', 'らっきょ', 'さすが 師匠', 'おかわり', '焼き芋 食うか', 'ダンゴムシ', '帰って こい'];
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
  walkT('an', T.AN_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of Object.values(AN_UI.keys)) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  if (measure(AN_UI.kabu(2)) + 6 > 54) bad.push('右の 列: 株の 名が 灯りの 段に かかる');
  if (54 + 46 > col) bad.push('右の 列: めしべの 棒が はみ出す');
  for (const l of [AN_UI.oshibe, AN_UI.meshibe]) if (measure(l) + 4 > 54) bad.push(`右の 列: ${l} が 棒に かかる`);
  if (KEYS_Y + 14 > CH) bad.push(`keys: bottom ${KEYS_Y + 14} > ${CH}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('anText', () => anTextCheck());
