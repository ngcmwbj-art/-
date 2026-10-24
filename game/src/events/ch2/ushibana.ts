// 鼻が しゃべる（第2章。げむきか 10/24 の 案4、2026-10-24 依頼主の 採用。02_ch2_index）。
// 文は data/text/hoshi_ushibana.ts、みました帳の ページは ui/menu/book_ushibana.ts。牛舎 map_hoshi_barn の 3房。
//
//   h1〜h2（ゲートが 開いて 牛舎に 入れる 間。トマトの 灯り。クリア後の 夜は 足さない：「前から 寝る」と 同じ）。
//   ・マサル（h1 は 給餌通路の 東の 端、h2 は ゲートの 横）：今の〔h1_1〕〔h1_2〕（h2 は〔h2_1〕〔h2_2〕）の あと、
//     もう 1回 話すと〔hana〕（flag_ub_start）。h2 は マサルが 牛舎に もどる（給餌通路の (20,6)。すむまで）。
//     h0（牛舎の 前、灯りが ない）は 今の 会話の あと 1回、最初の 台詞と「灯りが ないと、鼻は 見えん。」（flag_ub_h0）。
//   ・3房（南4〈前から 寝る〉と 北5〈出荷の 話の「この 房」〉と 北3〈ふしぎ08〉と 南5〈暗い 房〉は よけた）：
//     北1 (5–7,5) 上向き＝ぬれた 鼻、南2 (8–10,7) 下向き＝舌、北4 (14–16,5) 上向き＝エサの 粉。
//     飼槽を 調べると 大写し「牛の 顔」UbPanel（↑↓ 目・鼻・口、けってい 照らす）。どれを 選んでも、その 牛の
//     いちばん 見せたい 所が 最後に 出る（flag_ub_pen の ビット、見た 所 flag_ub_part の ビット）。
//   ・3房 すむと そのまま 3 わいの 鼻 → 4 しゃべる → 5 ごほうび（朱肉 +2、flag_ub_done）。
//   ・すんだ あと：見た 所が 3つ そろうまで、3房の 飼槽で もう一度 見られる（文は 1行目だけ）。北1 の 飼槽は
//     今の 文の あとに「鼻の あとが、飼槽の ふちに ついている。」。マサルに もう一度（1回）。
//   ・かくし：おてつだい（flag_ch2_barn_work）→ 4 の あと マサル「エサ、水、床。……鼻。」（flag_ub_work）。
//     耳の あいさつ（flag_mimi_awase）→ すんだ あと 牛舎から 出ると ふくじんづけ（flag_ub_fuku）。
//     前から 寝る（flag_nr_done）→ 1 で「南4は、寝とる。起こすな。」。
//   ・なめる 音は 鳴らさない（絵だけ）。「モー」も 鳴らさない。
//
// この ファイルは ch2/index.ts で sakuzoi より 前に import する（マサルの ほかの 寄り道の 用が 先に 出る）。
//
// QA：__game.cmd.ushibana(step, stage, auto)、ubState()、ubText()

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
import * as T from '../../data/text/hoshi_ushibana';
import { UB_UI } from '../../data/text/hoshi_ushibana';
import { addMp, sendAway } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { hStage, lanternOn, npc } from './common';
import { choresOn } from './barn';

export const UF = {
  h0: 'flag_ub_h0',
  heard0: 'flag_ub_heard0',
  start: 'flag_ub_start',
  pen: 'flag_ub_pen',
  part: 'flag_ub_part',
  intro: 'flag_ub_intro',
  done: 'flag_ub_done',
  after: 'flag_ub_after',
  work: 'flag_ub_work',
  fuku: 'flag_ub_fuku',
  neru: 'flag_ub_neru',
} as const;

const BARN = 'map_hoshi_barn';
const VILLAGE = 'map_hoshimidai';
const GEN = 'npc_hoshi_gen';

/** 3房：飼槽の タイル（左の はし）、幅、向き。kind 0 ぬれた 鼻・1 舌・2 エサの 粉。 */
export const UB_PENS: { x: number; y: number; face: 'up' | 'down'; kind: 0 | 1 | 2 }[] = [
  { x: 5, y: 5, face: 'up', kind: 0 },
  { x: 8, y: 7, face: 'down', kind: 1 },
  { x: 14, y: 5, face: 'up', kind: 2 },
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

const bits = (b: number) => [0, 1, 2].filter((i) => b & (1 << i)).length;
export const ubPenN = (): number => bits(flag(UF.pen));
export const ubPartN = (): number => bits(flag(UF.part));

/** 寄り道が 開いている：h1〜h2、ゲートが 開いた あと、トマトの 灯り（クリア後の 夜は 足さない）。 */
export function ubOpen(): boolean {
  const s = hStage();
  return !pgOn() && s >= 1 && s <= 2 && flag('flag_ch2_gate_open') > 0 && !flag('flag_ch2_boss_beaten') && lanternOn();
}

/** 前から 寝る（neru.ts）で マサルが 牛舎に いる 間（あちらの 人が 立つので、こちらは 出さない）。 */
function nrGenInBarn(): boolean {
  return hStage() === 2 && flag('flag_nr_start') > 0 && !flag('flag_nr_done');
}

/** 前から 寝るの とちゅう（あちらの マサルの 用が 先）。 */
function nrBusy(): boolean {
  return flag('flag_nr_kiritsu') > 0 && !flag('flag_nr_done');
}

/** マサルが 牛舎で 待っている（h2 の〔hana〕の あと、すむまで）。 */
function genInBarn(): boolean {
  return ubOpen() && hStage() === 2 && flag(UF.start) > 0 && !flag(UF.done) && !nrGenInBarn();
}

/** 飼槽で 大写しが 開く：すむ 前、または すんだ あと 見た 所が そろうまで。 */
function penActive(): boolean {
  if (!ubOpen() || !flag(UF.start) || choresOn()) return false;
  return !flag(UF.done) || ubPartN() < 3;
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
{
  const def = getMapDef(BARN);
  if (def) {
    def.objects.push(
      // the three troughs, examined from the feed aisle (over the trough's own examine while it is on)
      ...UB_PENS.map((p, i) => ({ t: 'obj', id: `obj_ub_bou_${i}`, x: p.x, y: p.y, w: 3, face: p.face, priority: 2, script: 'obj_ub_bou', cond: { when: penActive } }) as unknown as MapObj),
      // h2: マサル back in the barn from the gate until it is done
      NPC({ id: 'ub_gen', sprite: GEN, x: 20, y: 6, dir: 'left', pose: 'lean', script: GEN, cond: { when: genInBarn } }),
    );
    registerMap(def);
  }
}
{
  const def = getMapDef(VILLAGE);
  if (def) {
    // マサル at the gate (h2) stays in the barn while the noses are being seen
    for (const o of def.objects) {
      const n = o as { t: string; id?: string; x: number; y: number; cond?: Record<string, unknown> };
      if (n.t === 'npc' && n.id === GEN && n.x === 50 && n.y === 19) {
        const prev = n.cond ?? {};
        const when = prev.when as (() => boolean) | undefined;
        n.cond = { ...prev, when: () => (!when || when()) && !genInBarn() };
      }
    }
    // back out of the barn: ふくじんづけ (the world puts one on (51,32) itself; the map's enter hook looks)
    def.onEnter = [...(def.onEnter ?? []), 'evt_ub_fuku'];
    registerMap(def);
  }
}

// ================================================================ 大写し「牛の 顔」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const RX = SX + 208;
const KEYS_Y = 74;
/** 上から 目・鼻・口。 */
type Part = 0 | 1 | 2;

/** A filled ellipse, row by row. */
function oval(g: Gfx, cx: number, cy: number, rx: number, ry: number, col: string): void {
  for (let y = -ry; y <= ry; y++) {
    const h = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    if (h > 0) g.rect(cx - h, cy + y, h * 2, 1, col);
  }
}

export class UbPanel implements Widget {
  modal = true;
  done = false;
  /** 大写し（engine/touch.ts：絵の 外の タッチも けってい）。 */
  closeup = true;
  t = 0;
  open = 0;
  auto = false;
  active = false;
  kind: 0 | 1 | 2;
  pen: number;
  sel: Part = 1;
  pick: 'ok' | 'cancel' | null = null;
  /** 灯りの 当たっている 所（なめらかに 動く）。 */
  lx = 0;
  ly = 0;
  aim: Part = 1;
  /** いちばん 見せたい 所が 出ている（舌・ひかり・なめる）。 */
  show = false;
  /** 舌の 動き（ms。0 から 1回）。-1 で ない。 */
  tongue = -1;
  /** 舌が くり返す（南2）。 */
  tongueLoop = false;
  /** エサの 粉（1 → なめると 0）。 */
  powder = 0;
  autoPick: Part = 1;
  private armT = 0;
  private wasActive = false;
  private autoT = 0;

  constructor(pen: number) {
    this.pen = pen;
    this.kind = UB_PENS[pen].kind;
    this.powder = this.kind === 2 && !flag(UF.done) ? 1 : 0;
    const [x, y] = this.partAt(1);
    this.lx = x;
    this.ly = y;
  }

  /** 顔の まん中（場面の 中）。 */
  private cx(): number {
    return SX + Math.round((RX - SX - 4) / 2);
  }

  /** その 所の 位置（画面の px。oy は 開いた あとの 位置で 計算）。 */
  partAt(p: Part): [number, number] {
    const cx = this.cx();
    const oy = SY;
    if (p === 0) return [cx - 26, oy + 36];
    if (p === 1) return [cx, oy + 78];
    return [cx, oy + 94];
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    const [tx, ty] = this.partAt(this.aim);
    const k = Math.min(1, dt / 120);
    this.lx += (tx - this.lx) * k;
    this.ly += (ty - this.ly) * k;
    if (this.tongue >= 0) {
      this.tongue += dt;
      if (this.tongue > 1500) this.tongue = this.tongueLoop ? -900 : -1;
    } else if (this.tongue < -1) this.tongue = Math.min(0, this.tongue + dt);
    if (this.active !== this.wasActive) {
      this.wasActive = this.active;
      this.armT = 0;
    }
    if (this.active) this.armT += dt;
    if (!this.active || this.pick || this.armT < 150) return;
    if (this.auto) {
      this.autoT += dt;
      if (this.autoT < 450) return;
      this.autoT = 0;
      if (this.sel !== this.autoPick) this.move(this.autoPick > this.sel ? 1 : -1);
      else this.pick = 'ok';
      return;
    }
    const ud = (input.pressed('down') ? 1 : 0) - (input.pressed('up') ? 1 : 0);
    if (ud) this.move(ud);
    if (input.pressed('confirm')) this.pick = 'ok';
    else if (input.pressed('cancel')) this.pick = 'cancel';
  }

  private move(d: number): void {
    const n = Math.max(0, Math.min(2, this.sel + d)) as Part;
    if (n === this.sel) return;
    this.sel = n;
    this.aim = n;
    se('se_cursor', { vol: 0.3 });
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
        g.clip(SX, oy, RX - SX - 4, CH, () => this.drawFace(g, oy, dy));
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        g.text(UB_UI.pens[this.pen], RX, oy + 4, { color: '#8A84A0' });
        UB_UI.parts.forEach((p, i) => {
          const cur = i === this.sel;
          g.text(`${cur && this.active ? '▶' : '　'}${p}`, RX, oy + 22 + i * 16, { color: cur ? '#FFE7A3' : '#F4ECD8' });
        });
        if (this.active) UB_UI.keys.forEach((l, i) => g.text(l, RX, oy + KEYS_Y + i * 16, { color: '#FFE7A3' }));
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(UB_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, UB_UI.place, { seed: 61 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  private drawFace(g: Gfx, oy: number, dy: number): void {
    const W = RX - SX - 4;
    const cx = this.cx();
    // the pen at night beyond the rail: the barn's tubes behind, the sawdust dim
    // (the tubes are on all night: the pen behind it is plain to see, the black head stands out against it)
    g.rect(SX, oy, W, CH, '#5A6070');
    g.rect(SX, oy, W, 6, '#C8D0DA');
    g.rect(SX, oy + 6, W, 1, '#8A929E');
    for (let x = SX + 10; x < SX + W; x += 36) g.rect(x, oy + 7, 2, 44, '#6A7180');
    g.rect(SX, oy + 50, W, CH - 50, '#9A8C70');
    for (let i = 0; i < 70; i++) g.px(SX + ((i * 47) % W), oy + 52 + ((i * 13) % 48), i % 2 ? '#B4A684' : '#857858');
    const BLACK = '#1E1C22';
    const DARK = '#141218';
    // the ears (out to the sides), a yellow ear tag in each
    for (const s of [-1, 1]) {
      oval(g, cx + s * 48, oy + 30, 15, 6, BLACK);
      oval(g, cx + s * 50, oy + 30, 9, 3, '#3A2E36');
      g.rect(cx + s * 50 - 3, oy + 32, 6, 7, '#E8C43A');
      g.rect(cx + s * 50 - 3, oy + 32, 6, 1, '#F8E07A');
    }
    // the head: a broad flat forehead (no horns: the steers are dehorned), narrowing to the muzzle
    for (let y = 0; y <= 84; y++) {
      const t = y / 84;
      // round at the poll, widest at the eyes, narrowing down the face, the muzzle flaring a little, round at the chin
      const half = Math.round(
        t < 0.1 ? 26 + Math.sqrt(t / 0.1) * 7 : t < 0.34 ? 33 + ((t - 0.1) / 0.24) * 2 : t < 0.78 ? 35 - ((t - 0.34) / 0.44) * 13 : 22 + Math.sin(((t - 0.78) / 0.22) * Math.PI * 0.6) * 4 - Math.max(0, t - 0.93) * 90,
      );
      g.rect(cx - half - 1, oy + 12 + y, 1, 1, '#4A4652');
      g.rect(cx + half, oy + 12 + y, 1, 1, '#4A4652');
      g.rect(cx - half, oy + 12 + y, half * 2, 1, BLACK);
    }
    // the poll's curly hair, a lighter sheen down the forehead
    for (let i = 0; i < 12; i++) g.px(cx - 14 + ((i * 7) % 28), oy + 14 + (i % 3) * 2, '#34303A');
    g.alpha(0.5, () => g.rect(cx - 6, oy + 20, 12, 30, '#2A2830'));
    // 北4's one with a little white on its face (52 4.3 'face')
    if (this.kind === 2) {
      // an uneven white star on the forehead
      oval(g, cx + 2, oy + 28, 6, 5, '#E6E2D8');
      oval(g, cx - 2, oy + 31, 4, 3, '#E6E2D8');
      g.rect(cx + 1, oy + 33, 2, 4, '#E6E2D8');
      g.px(cx + 7, oy + 26, '#E6E2D8');
    }
    // the eyes on the sides of the head
    const eyeLit = this.aim === 0 ? 1 : 0.3;
    for (const s of [-1, 1]) {
      oval(g, cx + s * 26, oy + 36, 6, 4, DARK);
      g.rect(cx + s * 26 - 6, oy + 33, 12, 1, '#2E2A34');
      g.alpha(eyeLit, () => {
        g.rect(cx + s * 26 - 2 + s, oy + 34, 2, 2, '#FFF4D8');
        g.px(cx + s * 26 + 2, oy + 37, '#F28A3A');
      });
    }
    // the muzzle (the wet nose pad), its two nostrils, the mouth and the chin under it
    const my = oy + 78;
    oval(g, cx, my, 25, 11, '#34303A');
    g.rect(cx - 1, my - 10, 2, 20, '#2C2830');
    for (const s of [-1, 1]) {
      oval(g, cx + s * 12, my + 1, 5, 4, DARK);
      g.px(cx + s * 12 - s * 3, my - 2, '#4A4652');
    }
    // the wet shine: every healthy nose is damp; brighter under the light, brightest on 北1's
    const nearNose = this.aim === 1 ? 1 : 0.35;
    const shine = (this.kind === 0 && this.show ? 1 : 0.5) * nearNose;
    const tw = (Math.sin(this.t / 260) + 1) / 2;
    g.alpha(shine, () => {
      for (const [x, y] of [[-18, -6], [-15, -7], [-6, -8], [5, -7], [16, -6], [19, -4], [-20, 2], [20, 3], [-3, 6], [8, 7]] as const) g.px(cx + x, my + y, '#E8F0FF');
      g.rect(cx - 9, my - 8, 4, 1, '#F4F8FF');
      g.rect(cx + 6, my - 8, 3, 1, '#F4F8FF');
      g.alpha(0.4 + tw * 0.6, () => {
        g.rect(cx - 17, my - 5, 2, 1, '#FFFFFF');
        g.rect(cx + 15, my - 4, 2, 1, '#FFFFFF');
      });
    });
    // the feed meal on 北4's nose until it is licked off
    if (this.powder > 0)
      g.alpha(this.powder, () => {
        for (let i = 0; i < 26; i++) g.px(cx - 20 + ((i * 11) % 40), my - 6 + ((i * 7) % 12), i % 3 ? '#C8A86A' : '#E0C890');
      });
    // the mouth: slow chewing (the cud on 北1 and 南2; 北4 eats); the jaw moves side to side
    const chew = Math.round(Math.sin(this.t / (this.kind === 2 ? 180 : 420)) * 2);
    g.rect(cx - 18 + chew, oy + 91, 36, 1, DARK);
    g.rect(cx - 16 + chew, oy + 92, 32, 4, BLACK);
    g.rect(cx - 12 + chew, oy + 96, 24, 2, BLACK);
    // the tongue: out of the mouth, up and into a nostril, back (no sound for it)
    if (this.tongue >= 0) {
      const u = this.tongue / 1500;
      const reach = Math.sin(Math.min(1, u) * Math.PI);
      const n = Math.round(reach * 14);
      for (let i = 0; i <= n; i++) {
        const v = i / 14;
        // from the mouth's left corner, curling up to the left nostril
        const x = cx - 6 - Math.round(Math.sin(v * Math.PI * 0.8) * 10) - Math.round(v * 2);
        const y = oy + 92 - Math.round(v * 13);
        oval(g, x, y, 3, 2, i === n ? '#E08A94' : '#C86A78');
      }
    }
    // the rail in front (they are seen over it) and the trough's edge
    g.rect(SX, oy + 100, W, 3, '#8A909A');
    g.rect(SX, oy + 100, W, 1, '#B8BEC8');
    g.rect(SX, oy + 106, W, 6, '#6A6A70');
    // the tomato's light where it is aimed (soft: not too close — it dazzles them)
    const lx = Math.round(this.lx);
    const ly = Math.round(this.ly + dy);
    for (let r = 30; r > 0; r -= 6) g.alpha(0.05, () => g.circle(lx, ly, r, '#F28A3A'));
    g.alpha(0.12, () => g.circle(lx, ly, 8, '#FFD9A0'));
    if (this.active) g.ring(lx, ly, 18 + Math.round(Math.sin(this.t / 200)), '#FFE7A3');
  }
}

function* openPanel(p: UbPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: UbPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;
let qaPart: Part = 1;

/** 2 大写し「牛の 顔」。true：見た（やめたら false）。again：すんだ あとの もう一度。 */
function* kao(pen: number, again: boolean): Co<boolean> {
  const p = new UbPanel(pen);
  p.auto = qaAuto;
  p.autoPick = qaPart;
  try {
    yield* openPanel(p);
    if (!flag(UF.intro)) {
      setFlag(UF.intro, 1);
      yield* runMsg(T.UB_KAO_START);
    }
    p.pick = null;
    p.active = true;
    while (!p.pick) yield null;
    p.active = false;
    if (p.pick === 'cancel') return false;
    const part = p.sel;
    se('se_examine', { vol: 0.4 });
    setFlag(UF.part, flag(UF.part) | (1 << part));
    yield 300;
    if (part === 0) yield* runMsg(T.UB_ME);
    else if (part === 2 && p.kind === 0) yield* runMsg(T.UB_KUCHI);
    else if (part === 2 && p.kind === 2) yield* runMsg(T.UB_KUCHI_KUU);
    // then what this one has to show: the light goes to the nose
    p.aim = 1;
    yield 400;
    p.show = true;
    if (p.kind === 1) {
      p.tongue = 0;
      p.tongueLoop = true;
      yield 700;
    }
    if (again) {
      if (p.kind === 2) {
        p.tongue = 0;
        yield 900;
      }
      yield* runMsg(T.UB_AGAIN[p.kind]);
      return true;
    }
    if (p.kind === 0) yield* say(T.UB_NURE);
    else if (p.kind === 1) yield* say(T.UB_SHITA);
    else {
      yield* say(T.UB_KONA_A);
      // it finishes, and licks the meal off
      p.tongue = 0;
      yield 500;
      yield* animate(500, (x) => (p.powder = 1 - x), ease.linear);
      p.powder = 0;
      yield 400;
      yield* say(T.UB_KONA_B);
    }
    setFlag(UF.pen, flag(UF.pen) | (1 << pen));
    return true;
  } finally {
    yield* closePanel(p);
  }
}

// ================================================================ 台本

/** 3〜5：わいの 鼻、しゃべる、ごほうび。 */
function* finale(): Co {
  yield 300;
  if (kanenariHere()) yield* say(T.UB_WAI);
  yield* say(T.UB_SHABERU);
  if (flag('flag_ch2_barn_work') && !flag(UF.work)) {
    setFlag(UF.work, 1);
    yield* runMsg(T.UB_WORK);
  }
  setFlag(UF.done, 1);
  addMp(2);
  se('se_item');
  yield* runMsg(T.UB_REWARD);
}

/** 3房の 飼槽。 */
registerScript('obj_ub_bou', function* (ctx: ScriptCtx): Co {
  se('se_examine');
  const i = Number(ctx.source.replace('obj_ub_bou_', '')) || 0;
  const again = flag(UF.done) > 0;
  if (!again && flag(UF.pen) & (1 << i)) {
    yield* runMsg(T.UB_MITA);
    return;
  }
  const ok = yield* kao(i, again);
  if (!ok) {
    yield* runMsg(T.UB_STOP);
    return;
  }
  if (!again && ubPenN() >= 3) yield* finale();
});

/** 北1 の 飼槽（今の 文）：すんだ あと、鼻の あと。 */
wrap('obj_hoshi_cow', function* (ctx, orig): Co {
  yield* orig();
  if (ctx.source === 'obj_hoshi_cow' && flag(UF.done) && onMap(BARN)) yield* runMsg(T.UB_SHISOU);
});

/** 今の 会話を 聞いた あと（h1：〔h1_1〕〔h1_2〕、h2：〔h2_1〕〔h2_2〕）。 */
function heardNow(): boolean {
  const s = hStage();
  if (s === 1) return flag('flag_seen_npc_hoshi_gen_h1') >= 2;
  if (s === 2) return flag('flag_seen_npc_hoshi_gen_h2') >= 2;
  return false;
}

/** マサル（h0 牛舎の 前・h1 牛舎・h2 ゲートの 横／牛舎）。した とき true。 */
function* genHana(): Co<boolean> {
  if (pgOn()) return false;
  const s = hStage();
  if (s === 0) {
    if (!flag(UF.heard0) || flag(UF.h0) || !onMap(VILLAGE)) return false;
    setFlag(UF.h0, 1);
    yield* runMsg(T.UB_H0);
    return true;
  }
  if (!ubOpen() || choresOn() || nrBusy()) return false;
  if (flag(UF.done)) {
    if (!flag(UF.after) && onMap(BARN)) {
      setFlag(UF.after, 1);
      yield* runMsg(T.UB_GEN_AFTER);
      return true;
    }
    return false;
  }
  if (!flag(UF.start)) {
    if (!heardNow()) return false;
    setFlag(UF.start, 1);
    yield* say(T.UB_START);
    if (flag('flag_nr_done') && !flag(UF.neru)) {
      setFlag(UF.neru, 1);
      yield* runMsg(T.UB_START_NERU);
    }
    if (s === 2 && onMap(VILLAGE)) {
      yield* runMsg(T.UB_START_H2);
      // he goes back down to the barn (from now on at the east end of its feed aisle, until it is done)
      const g = npc(GEN);
      if (g) sendAway(g, [[49, 19], [49, 20], [49, 21]], 2.5, 150, true);
    }
    return true;
  }
  yield* runMsg(T.UB_GEN_WAIT);
  return true;
}

wrap(GEN, function* (_ctx, orig): Co {
  if (yield* genHana()) return;
  yield* orig();
  if (hStage() === 0 && onMap(VILLAGE) && !pgOn()) setFlag(UF.heard0, 1);
});

/** かくし：すんだ あと、耳の あいさつが すんでいれば、牛舎から 出た ところで ふくじんづけ（1回）。 */
registerScript('evt_ub_fuku', function* (): Co {
  const f = field();
  if (!f || f.map.id !== VILLAGE) return;
  if (!flag(UF.done) || flag(UF.fuku) || !flag('flag_mimi_awase') || !ubOpen() || !kanenariHere()) return;
  if (f.player.tileX !== 51 || f.player.tileY !== 32) return;
  setFlag(UF.fuku, 1);
  yield 300;
  yield* say(T.UB_FUKU);
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.ushibana(step = 'gen', stage = 'h1', auto = false, part = 1)（ゲートが 開いた あと）
 *   'h0'      段階0、牛舎の 前の マサルの 前 (51,33) 上向き（今の 会話を 聞いた あと）
 *   'gen'     今の 会話を 聞いた あと、マサルの 前（h1 牛舎 (19,6) 右向き／h2 ゲートの 横 (49,19) 右向き）
 *   'n1' 's2' 'n4'  〔hana〕の あと、その 房の 飼槽の 前（北1 (6,6) 上向き・南2 (9,6) 下向き・北4 (15,6) 上向き）
 *   'last'    2房 見た あと、北4 の 前（見ると 3〜5）
 *   'after'   すんだ あと、北1 の 前（見た 所 1つ：もう一度 見られる）
 *   'fuku'    すんだ あと（耳の あいさつ 済み）、牛舎の 中の 戸の 前 (2,10) 下向き（出ると ふくじんづけ）
 */
if (import.meta.env.DEV) {
  registerDebug('ushibana', (step = 'gen', stg = 'h1', auto = false, part = 1) => {
    if (step === 'h0') cmd().jump?.('ch2:house', true);
    else if (stg === 'h2') cmd().jump?.('ch2:hill', true);
    else cmd().jump?.('ch2:houki', true);
    for (const id of Object.values(UF)) setFlag(id, 0);
    qaAuto = !!auto;
    qaPart = Math.max(0, Math.min(2, Number(part))) as Part;
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (step === 'h0') {
      setFlag(UF.heard0, 1);
      return go(VILLAGE, 51, 33, 'up');
    }
    setFlag('flag_ch2_gate_open', 1);
    setFlag('flag_ch2_gate_wait', 0);
    const h2 = hStage() === 2;
    if (h2) setFlag('flag_seen_npc_hoshi_gen_h2', Math.max(2, flag('flag_seen_npc_hoshi_gen_h2')));
    else setFlag('flag_seen_npc_hoshi_gen_h1', Math.max(2, flag('flag_seen_npc_hoshi_gen_h1')));
    if (step === 'gen') return h2 ? go(VILLAGE, 49, 19, 'right') : go(BARN, 19, 6, 'right');
    setFlag(UF.start, 1);
    setFlag(UF.intro, 1);
    if (step === 'n1') return go(BARN, 6, 6, 'up');
    if (step === 's2') return go(BARN, 9, 6, 'down');
    if (step === 'n4') return go(BARN, 15, 6, 'up');
    setFlag(UF.pen, 0b011);
    setFlag(UF.part, 0b010);
    if (step === 'last') return go(BARN, 15, 6, 'up');
    setFlag(UF.pen, 0b111);
    setFlag(UF.done, 1);
    setFlag(UF.after, 1);
    if (step === 'fuku') {
      setFlag('flag_mimi_awase', 1);
      return go(BARN, 2, 10, 'down');
    }
    return go(BARN, 6, 6, 'up');
  });

  registerDebug('ubState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(UF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof UbPanel) as UbPanel | undefined;
    const f = field();
    return {
      flags,
      pens: ubPenN(),
      parts: ubPartN(),
      open: ubOpen(),
      stage: hStage(),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      panel: p ? { pen: p.pen, kind: p.kind, sel: p.sel, active: p.active, show: p.show } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no clock time; none of chapter 2's banned words; the names without さん in the narration. */
export function ubTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', 'まだ', 'いただきます', '3人', '12人', '1日2本', '海', '水族館', 'らっきょ', '具足', 'ほどよいなぁ', '出荷'];
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
        if (/\d+:\d\d/.test(plain) || /\d+時/.test(plain)) bad.push(`${name}: time: ${plain}`);
        if ((who === 'narr' || who === 'sys') && plain.includes('さん')) bad.push(`${name}: 地の文の さん: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('ub', T.UB_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of [...UB_UI.keys, ...UB_UI.pens, ...UB_UI.parts.map((p) => '▶' + p)]) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  if (KEYS_Y + UB_UI.keys.length * 16 > CH) bad.push(`keys: bottom ${KEYS_Y + UB_UI.keys.length * 16} > ${CH}`);
  if (22 + 3 * 16 > KEYS_Y) bad.push('所の 一覧が 鍵に かかる');
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('ubText', () => ubTextCheck());
