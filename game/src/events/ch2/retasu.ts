// 寝とる うちに、とる（第2章。げむきか 10/26 の 案5、2026-10-26 依頼主の 採用。02_ch2_index）。
// 文は data/text/hoshi_retasu.ts、新しい 地図は data/maps/hoshi_ue_hata.ts（map_hoshi_ue_hata、16×10、画面 1枚）、
// 絵は art/props/retasu_art.ts、みました帳の ページは ui/menu/book_retasu.ts。
//
//   段階1〜2（トマトの 灯り）。段階0 は ペロに 話すと 1 の 最初の 1ページだけ（1回）、ネットの 戸は 地の文。
//   クリア後の 夜と 段階3 は 足さない（戸は しばった まま）。グソっ君が いなくても 進む（グソっ君の 台詞は 抜く）。
//   ・3号ハウスの 前の ペロ (3,32)：いつもの 会話（〔h1_*〕〔h2_*〕）を 1回 聞いた あと、もう 1回 いつもの 会話に なった
//     ときに 続けて〔retasu〕（flag_rt_start）。羽釜・脇芽・シシトウ・ハンチングの 用は 先に 出る（その 回は 出さない）。
//     ペロは 頭に ライトを つけて 先に 上がる（暗転。村の ペロは すむまで いない）。
//   ・ハウスの 裏の 獣よけの ネットの 戸 (6,19)（(6,20) から 北へ）→ 暗転で 上の 畑 (8,8)。人が 絵の 中へ 歩いて 入る
//     形では ない（ネットの 戸は 人の 背の 高さの ふつうの 戸）。
//   ・上の 畑：ペロ (7,5)。とる 3株 obj_rt_tama_0..2（きらり）→ 大写し「玉」TamaPanel：けっていで 上から 押す
//     （かたさが 3つの どれか）→「とる／とらない」→ かたければ ペロが 外の 葉を 2枚 残して 株もとを 切る（しゅんは
//     ささえる。刃物は ペロの 手だけ）→ けっていで 霧吹き（切り口を 洗う）。やわらかい 株は とらない（失敗に しない）。
//     flag_rt_tama_<k>：1 とった・2 見送った。見分けが 合わなかった 株が あれば flag_rt_miss。
//   ・2つ とったら 外の 葉の 1行、3株 見たら 4 寝とる うちに → ごほうび（flag_rt_done）。ペロは ハウスへ もどる。
//   ・かくし：マサルに『しゃきしゃきレタス』を 持って 話す（flag_rt_masaru）。すんだ あと ペロの 家の 水がめ
//     （flag_rt_kominka。案の「台所の 流し」は 家に 流しが ないので 水がめの 横）。3株とも 見分けが 合った
//     （flag_rt_iite）。段階2 の 上の 畑の かかし（flag_rt_kakashi）。
//   ・光：上の 畑は ぜんぶ 暗がりだが、暗がりの 色を ふつうより 1段 明るく（地図の darkCol）、ペロの ヘッドライトの
//     輪（ペロの 前の 地面）と 光の 筋の 先の 小さな 輪を 毎こま 動かす（darkLights）。せってい「明るさ」は
//     HD-2D の 夜の 持ち上げ（hd2d/view.ts darkLift）が そのまま 効く。
//
// QA：__game.cmd.retasu(step, stage, auto)、rtState()、rtText()

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
import { fxAt, registerWorldFx } from '../../world/fx';
import { getMapDef, registerMap } from '../../world/maps';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { actorAnchor } from '../../world/marks';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import type { Howto } from '../../ui/closeup';
import * as T from '../../data/text/hoshi_retasu';
import { RT_UI } from '../../data/text/hoshi_retasu';
import { RT_HEADLAMP, RT_HEADLAMP_SPOT, RT_PERO_AT, RT_TAMA, UE_HATA, type RtKind } from '../../data/maps/hoshi_ue_hata';
import { RT_HEAD, RT_HEAD_LT, RT_LEAF, RT_LEAF_DK, RT_LEAF_LT } from '../../art/props/retasu_art';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { hStage, lanternOn } from './common';

export const RF = {
  h0: 'flag_rt_h0',
  start: 'flag_rt_start',
  first: 'flag_rt_first',
  tama0: 'flag_rt_tama_0',
  tama1: 'flag_rt_tama_1',
  tama2: 'flag_rt_tama_2',
  miss: 'flag_rt_miss',
  sotoba: 'flag_rt_sotoba',
  done: 'flag_rt_done',
  iite: 'flag_rt_iite',
  kakashi: 'flag_rt_kakashi',
  peroAfter: 'flag_rt_pero_after',
  masaru: 'flag_rt_masaru',
  kominka: 'flag_rt_kominka',
} as const;

export const RT_ITEM = 'item_rt_retasu';
const VILLAGE = 'map_hoshimidai';
const KOMINKA = 'map_hoshi_kominka';
const PERO = 'npc_hoshi_mitsu';
/** 村の ネットの 戸（ハウスの 裏、(6,20) から 北へ）。 */
export const RT_TO: [number, number] = [6, 19];
const tamaF = (k: number) => `flag_rt_tama_${k}`;

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
export function rtOpen(): boolean {
  const s = hStage();
  return s >= 1 && s <= 2 && lanternOn() && !pgOn() && !flag('flag_ch2_boss_beaten');
}

/** ペロが 上の 畑に いる（〔retasu〕から すむまで）。 */
export function rtAway(): boolean {
  return flag(RF.start) > 0 && !flag(RF.done) && rtOpen();
}

/** ネットの 戸が 開く：〔retasu〕の あと、段階1〜2（すんだ あとも 見送った 株を 見に 入れる）。 */
export function rtDoor(): boolean {
  return flag(RF.start) > 0 && rtOpen();
}

/** とった 玉・見送った 玉・見た 玉の 数。 */
export const rtTakenN = (): number => [0, 1, 2].filter((k) => flag(tamaF(k)) === 1).length;
export const rtLeftN = (): number => [0, 1, 2].filter((k) => flag(tamaF(k)) === 2).length;
export const rtSeenN = (): number => [0, 1, 2].filter((k) => flag(tamaF(k)) > 0).length;

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

{
  const def = getMapDef(VILLAGE);
  if (def) {
    // ペロ at 3号ハウス is up in the lettuce field from 〔retasu〕 till it is done
    for (const o of def.objects) {
      const n = o as { t: string; id?: string; x: number; y: number; cond?: Record<string, unknown> };
      if (n.t === 'npc' && n.id === PERO && n.x === 3 && n.y === 32) {
        const prev = n.cond ?? {};
        const when = prev.when as (() => boolean) | undefined;
        n.cond = { ...prev, when: () => (!when || when()) && !rtAway() };
      }
    }
    def.objects.push(
      // the net's door behind the greenhouses (over the fence's net: a pipe frame, the rope loop)
      { t: 'prop', prop: 'prop_rt_to', x: RT_TO[0], y: RT_TO[1], opts: { side: 'out' } } as unknown as MapObj,
      { t: 'door', id: 'door_hoshi_ue_hata', x: RT_TO[0], y: RT_TO[1], to: UE_HATA, tx: 8, ty: 8, dir: 'up', se: 'se_door', cond: { when: rtDoor } } as unknown as MapObj,
      { t: 'obj', id: 'obj_rt_to', x: RT_TO[0], y: RT_TO[1], face: 'up', script: 'obj_rt_to', cond: { when: () => !rtDoor() } } as unknown as MapObj,
    );
    registerMap(def);
  }
}

{
  const def = getMapDef(UE_HATA);
  if (def) {
    const here = () => rtAway();
    def.objects.push(
      // ペロ among the rows, his head lamp on
      { t: 'npc', id: 'rt_pero', sprite: PERO, x: RT_PERO_AT[0], y: RT_PERO_AT[1], dir: 'down', script: 'rt_pero', cond: { when: () => here() && !flag('flag_hunting_on') } } as unknown as MapObj,
      { t: 'npc', id: 'rt_pero', sprite: 'npc_hoshi_mitsu_hunting', x: RT_PERO_AT[0], y: RT_PERO_AT[1], dir: 'down', script: 'rt_pero', cond: { when: () => here() && flag('flag_hunting_on') > 0 } } as unknown as MapObj,
      // the three heads to press (a glint till looked at), and the same tiles once looked at
      ...RT_TAMA.map(([x, y], k) => ({ t: 'obj', id: `obj_rt_tama_${k}`, x, y, script: 'obj_rt_tama', cond: { when: () => rtAway() && !flag(tamaF(k)) } }) as unknown as MapObj),
      ...RT_TAMA.map(([x, y], k) => ({ t: 'obj', id: `obj_rt_tama_x_${k}`, x, y, script: 'obj_rt_tama_x', cond: { when: () => !(rtAway() && !flag(tamaF(k))) } }) as unknown as MapObj),
    );
    registerMap(def);
  }
}

// ================================================================ ヘッドライト（光の 輪と 筋）

const DIR_V: Record<string, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

function placeLight(l: typeof RT_HEADLAMP, px: number, py: number): void {
  l.x = Math.floor(px / 16);
  l.y = Math.floor(py / 16);
  l.ox = Math.round(px - l.x * 16);
  l.oy = Math.round(py - l.y * 16);
}

registerWorldFx({
  map: UE_HATA,
  anchored: true,
  update(f) {
    const a = f.actorById('rt_pero');
    if (!a || !a.visible) {
      placeLight(RT_HEADLAMP, -200, -200);
      placeLight(RT_HEADLAMP_SPOT, -200, -200);
      return;
    }
    const [vx, vy] = DIR_V[a.dir] ?? [0, 1];
    // the pool where the lamp looks (a step in front of him), and the beam's far end a little farther
    placeLight(RT_HEADLAMP, a.x + vx * 18, a.y - 4 + vy * 18);
    placeLight(RT_HEADLAMP_SPOT, a.x + vx * 40, a.y - 4 + vy * 36);
  },
  draw(f, g, cx, cy, layer) {
    if (layer !== 'glow') return;
    const a = f.actorById('rt_pero');
    if (!a || !a.visible) return;
    const at = actorAnchor(a);
    const [vx, vy] = DIR_V[a.dir] ?? [0, 1];
    // the lamp on his forehead
    const [hx, hy] = fxAt(f, at.x + vx * 2, at.y + 9, cx, cy, at.foot);
    const X = Math.round(hx);
    const Y = Math.round(hy);
    // the beam: a thin wedge of light from the lamp to the ground in front (seen from his back: hidden behind him)
    if (a.dir !== 'up') {
      const [ex, ey] = fxAt(f, a.x + vx * 40, a.y - 4 + vy * 36, cx, cy);
      for (let k = -3; k <= 3; k++) {
        const sx = vy ? k * 2 : 0;
        const sy = vx ? k * 2 : 0;
        g.alpha(0.1 - Math.abs(k) * 0.02, () => g.line(X, Y, Math.round(ex + sx * 3), Math.round(ey + sy * 3), '#FFF2C0'));
      }
    }
    g.rect(X - 2, Y - 1, 4, 3, '#3A3F48');
    g.rect(X - 1, Y, 2, 1, '#FFF6D8');
    g.alpha(0.45, () => g.circle(X, Y, 3, '#FFE7A3'));
  },
});

// ================================================================ 大写し「玉」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const RX = SX + 222;
const KEYS_Y = 94;

type Phase = 'idle' | 'osu' | 'arau';

/** 楕円を 横の 帯で（大写しの 中だけ）。 */
function ell(g: Gfx, cx: number, cy: number, rx: number, ry: number, c: string): void {
  for (let y = -ry; y <= ry; y++) {
    const h = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    if (h > 0) g.rect(cx - h, cy + y, h * 2, 1, c);
  }
}

export class TamaPanel implements Widget {
  modal = true;
  /** 大写し（engine/touch.ts：絵の 外の タッチも けってい）。 */
  closeup = true;
  /** やり方の カード（ui/closeup.ts。はじめての 1回）。 */
  howto: Howto = RT_UI.howto;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  phase: Phase = 'idle';
  kind: RtKind;
  /** どの 株（0〜2）と、見る 順の 何つ目（0〜2）。 */
  k: number;
  n = 0;
  /** 押した（0..1 手が 下りる）・かたさを 見せる・切った（0..1 玉が 持ち上がる）・汁・霧（0..1）・洗った。 */
  press = 0;
  pressing = false;
  shown = false;
  cut = 0;
  cutting = false;
  sap = false;
  mist = 0;
  misting = false;
  washed = false;
  hit = false;
  private autoT = 0;

  constructor(kind: RtKind, k: number) {
    this.kind = kind;
    this.k = k;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.pressing) this.press = Math.min(1, this.press + dt / 260);
    else this.press = Math.max(0, this.press - dt / 400);
    if (this.cutting) this.cut = Math.min(1, this.cut + dt / 500);
    if (this.misting) this.mist = Math.min(1, this.mist + dt / 450);
    if (this.phase === 'idle') return;
    let ok = false;
    if (this.auto) {
      this.autoT += dt;
      ok = Math.floor(this.autoT / 400) !== Math.floor((this.autoT - dt) / 400);
    } else ok = input.pressed('confirm');
    if (ok) this.hit = true;
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
      const tw = g.measure(RT_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, RT_UI.place, { seed: 91 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  private drawScene(g: Gfx, oy: number): void {
    const W = RX - SX - 4;
    // the blue before dawn (not black: 2026-10-26 会議), the head lamp's white pool on the head
    g.rect(SX, oy, W, CH, '#26324A');
    const cx = SX + 96;
    const gy = oy + 92;
    for (let r = 78; r > 0; r -= 10) g.alpha(0.07, () => g.circle(cx + 6, gy - 30, r, '#FFF2C0'));
    // the beam coming down from the top right (his lamp)
    for (let i = 0; i < 6; i++) g.alpha(0.06, () => g.line(SX + W - 10 - i * 3, oy, cx + 10 + i * 4, gy - 40, '#FFF6D8'));
    // the tilled ground, the rows
    g.rect(SX, gy, W, CH - (gy - oy), '#4A3426');
    for (let x = SX; x < SX + W; x += 7) g.px(x, gy + 6 + ((x / 7) % 3), '#6A4A34');
    g.rect(SX, gy, W, 1, '#6A4A34');
    // the neighbours in the dark at the sides
    for (const nx of [SX + 14, SX + W - 14]) {
      ell(g, nx, gy - 2, 16, 4, '#2E5A34');
      ell(g, nx, gy - 12, 10, 9, '#5A8A4A');
    }
    const size = this.kind === 'yawa' ? 24 : this.kind === 'kosugi' ? 32 : 28;
    const lift = Math.round(ease.cubicOut(this.cut) * 14);
    // the outer leaves spread on the ground (the root leaves stay in the ground when it is cut)
    ell(g, cx - 34, gy - 3, 26, 6, RT_LEAF_DK);
    ell(g, cx + 34, gy - 3, 26, 6, RT_LEAF_DK);
    ell(g, cx, gy - 4, 40, 5, RT_LEAF);
    for (let x = -40; x <= 40; x += 6) g.px(cx + x, gy - 8 + ((x / 6) & 1), '#FFFFFF');
    // the stem's cut (lifted: the cut face, its white beads till it is washed)
    if (this.cut > 0) {
      ell(g, cx, gy - 4 - lift, 7, 2, '#E8F0D0');
      g.rect(cx - 5, gy - 4 - lift, 10, 2, '#C8DCA0');
      ell(g, cx, gy - 4, 6, 2, '#D8E8B0');
      if (this.sap && !this.washed) {
        for (const [bx, by] of [[-4, 0], [-1, 1], [2, 0], [4, 1], [0, 2], [-2, 3]] as const) g.rect(cx + bx, gy - 3 - lift + by, 2, 2, '#FFFFFF');
        g.rect(cx - 1, gy - 1 - lift, 2, 3, '#F4F4EC');
      }
    }
    // the head (squashed a little while pressed: the soft one most)
    const give = this.kind === 'yawa' ? 0.2 : this.kind === 'kata' ? 0.05 : 0;
    const ry = Math.round(size * 0.86 * (1 - give * this.press));
    const hy = gy - 6 - ry - lift;
    ell(g, cx, hy, size, ry, RT_HEAD);
    ell(g, cx - 4, hy - 4, size - 8, ry - 7, RT_HEAD_LT);
    // its wrapper leaves' veins
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < ry * 2 - 4; i++) {
        const y = hy - ry + 3 + i;
        const x = cx + s * Math.round(size * 0.55 * Math.sin((i / (ry * 2)) * Math.PI));
        g.px(x, y, RT_LEAF);
      }
    }
    g.line(cx, hy - ry + 2, cx, hy + ry - 4, '#9AC860');
    // the two outer leaves kept on it (the client's way: two left on)
    ell(g, cx - size + 4, hy + 6, 9, ry - 6, RT_LEAF);
    ell(g, cx + size - 4, hy + 6, 9, ry - 6, RT_LEAF);
    g.line(cx - size + 4, hy - ry + 10, cx - size + 6, hy + ry - 2, RT_LEAF_LT);
    g.line(cx + size - 4, hy - ry + 10, cx + size - 6, hy + ry - 2, RT_LEAF_LT);
    // dew on the leaves' edges, white in the lamp
    for (const [dx, ddy] of [[-size + 2, -2], [size - 3, 0], [-6, -ry + 1], [8, -ry + 2]] as const) g.rect(cx + dx, hy + ddy, 2, 1, '#FFFFFF');
    // しゅん's hand coming down on top
    if (this.press > 0 || this.phase === 'osu') {
      const hd = Math.round(ease.cubicOut(this.press) * 18);
      const top = hy - ry - 22 + hd;
      g.rect(cx - 11, top - 30, 22, 30, '#E8D8C0');
      g.rect(cx - 13, top, 26, 9, '#F2C8A0');
      g.rect(cx - 13, top + 8, 26, 1, '#C89A78');
      for (const fx of [-9, -3, 3, 9]) g.px(cx + fx, top + 4, '#C89A78');
      if (this.press >= 1 && this.shown) {
        const word = this.kind === 'yawa' ? 'ふかっ' : this.kind === 'kata' ? 'ぎゅっ' : 'かちっ';
        g.text(word, cx + 22, top - 4, { color: '#FFE7A3' });
      }
    }
    // ペロの hand at the foot, a small knife (only his)
    if (this.cutting && this.cut < 1) {
      const kx = cx + 38 - Math.round(this.cut * 26);
      g.rect(kx + 8, gy - 12, 26, 8, '#5A6A8A');
      g.rect(kx, gy - 12, 10, 7, '#D8A878');
      g.rect(kx - 8, gy - 9, 8, 2, '#C8C8D0');
      if (this.cut > 0.5) g.text('ざくっ', cx + 30, gy - 34, { color: '#FFE7A3' });
    }
    // the sprayer from the left, its fine mist on the cut
    if (this.phase === 'arau' || this.misting) {
      const bx = SX + 18;
      const by = gy - 30 - lift;
      g.rect(bx, by, 12, 18, '#F4F1E8');
      g.rect(bx + 2, by - 6, 8, 6, '#4E9A3A');
      g.rect(bx + 10, by - 5, 6, 2, '#4E9A3A');
      if (this.misting) {
        const n = Math.round(this.mist * 24);
        for (let i = 0; i < n; i++) {
          const u = i / 24;
          const mx = bx + 18 + Math.round(u * (cx - bx - 26));
          const my = by - 4 + Math.round(u * 22 + Math.sin(i * 1.7) * 4);
          g.alpha(0.8 - u * 0.4, () => g.px(mx, my, '#E8F4FF'));
        }
        if (this.mist > 0.3 && this.mist < 0.9) g.text('しゅっ', bx + 6, by - 20, { color: '#FFE7A3' });
      }
    }
  }

  private drawSide(g: Gfx, oy: number): void {
    const x = RX - 4;
    const w = SX + CW - RX + 4;
    g.rect(x, oy, w, CH, '#2A3236');
    g.text(RT_UI.kabu(this.n), RX, oy + 4, { color: '#F4ECD8' });
    // the three hardnesses (the one felt lit once pressed)
    g.text(RT_UI.kata, RX, oy + 24, { color: '#C8D8C0' });
    const at = this.kind === 'yawa' ? 0 : this.kind === 'kata' ? 1 : 2;
    RT_UI.levels.forEach((l, i) => {
      const on = this.shown && i === at;
      const ly = oy + 42 + i * 15;
      g.rect(RX, ly + 2, 7, 7, on ? '#B8E870' : '#4A5458');
      g.text(l, RX + 12, ly, { color: on ? '#F4ECD8' : '#8A9490' });
    });
    const key = this.phase === 'osu' ? RT_UI.keys.osu : this.phase === 'arau' ? RT_UI.keys.arau : '';
    if (key) g.text(key, RX, oy + KEYS_Y, { color: '#FFE7A3' });
    markText(x, oy, w, CH);
  }
}

function* openPanel(p: TamaPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: TamaPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

function* waitHit(p: TamaPanel, phase: Phase): Co {
  p.hit = false;
  p.phase = phase;
  while (!p.hit) yield null;
  p.phase = 'idle';
}

let qaAuto = false;
/** QA：「とる／とらない」を 自動で（0 とる・1 とらない。null：ふつうに 選ぶ）。 */
let qaPick: number | null = null;

/** 3 大写し「玉」（k つ目）。とった・見送った ときは flag を 立てる（やめたら 何も 立てない）。 */
function* tama(k: number): Co {
  const kind = RT_TAMA[k][2];
  const p = new TamaPanel(kind, k);
  p.auto = qaAuto;
  p.n = rtSeenN();
  const first = rtTakenN() === 0;
  let ok = false;
  try {
    yield* openPanel(p);
    // ① press it from the top
    yield* waitHit(p, 'osu');
    p.pressing = true;
    se('se_hug', { vol: 0.4, pitch: kind === 'yawa' ? 0.8 : kind === 'kata' ? 1.1 : 1.5 });
    yield 320;
    p.shown = true;
    yield 200;
    yield* say(T.RT_OSU[kind]);
    p.pressing = false;
    const c = qaPick ?? (yield* say(T.RT_ASK));
    const take = c === 0;
    ok = kind === 'yawa' ? !take : take;
    yield* say(T.RT_KIME[`${kind}_${ok ? 'ok' : 'ng'}` as keyof typeof T.RT_KIME]);
    if (kind === 'yawa') {
      yield* say(T.RT_HITOBAN);
    } else {
      // ② ペロ cuts it at the foot, two outer leaves left on (しゅん holds it)
      p.cutting = true;
      se('se_kotei_snip');
      yield 560;
      p.cutting = false;
      p.sap = true;
      yield* say(T.RT_KIRU);
      yield* say(first ? T.RT_SHIRU_FIRST : T.RT_SHIRU);
      // ③ wash the cut with the sprayer
      yield* waitHit(p, 'arau');
      p.misting = true;
      se('se_h_yunomi_pour', { vol: 0.3, pitch: 1.6 });
      yield 460;
      p.washed = true;
      yield 200;
      yield* say(first ? T.RT_ARAU_FIRST : T.RT_ARAU);
      if (kind === 'kosugi') yield* say(T.RT_OKURE);
    }
  } finally {
    yield* closePanel(p);
  }
  setFlag(tamaF(k), kind === 'yawa' ? 2 : 1);
  if (!ok) setFlag(RF.miss, 1);
  field()?.refreshPresence?.();
  se('se_item', { vol: 0.4 });
  yield* runMsg(T.rtCount(rtSeenN()));
  if (rtTakenN() >= 2 && !flag(RF.sotoba)) {
    setFlag(RF.sotoba, 1);
    yield* say(T.RT_SOTOBA);
  }
  if (rtSeenN() >= 3) yield* finale();
}

// ================================================================ 台本

registerScript('obj_rt_tama', function* (ctx: ScriptCtx): Co {
  const k = Math.max(0, Number(String(ctx.source).replace(/^obj_rt_tama_/, '')));
  se('se_examine');
  if (!rtAway() || flag(tamaF(k))) return;
  yield* tama(k);
});

registerScript('obj_rt_tama_x', function* (ctx: ScriptCtx): Co {
  const k = Math.max(0, Number(String(ctx.source).replace(/^obj_rt_tama_x_/, '')));
  se('se_examine');
  const v = flag(tamaF(k));
  yield* say(v === 1 ? T.RT_TOTTA : v === 2 ? T.RT_MIOKURI : T.RT_HOKA);
});

registerScript('obj_rt_hoka', function* (): Co {
  se('se_examine');
  yield* say(T.RT_HOKA);
});

registerScript('obj_rt_kontena', function* (): Co {
  se('se_examine');
  yield* say(rtTakenN() > 0 ? T.RT_KONTENA : T.RT_KONTENA_EMPTY);
});

registerScript('obj_rt_kiri', function* (): Co {
  se('se_examine');
  yield* say(T.RT_KIRI);
});

registerScript('obj_rt_kusa', function* (): Co {
  se('se_examine');
  yield* say(T.RT_KUSA);
});

registerScript('obj_rt_net', function* (): Co {
  se('se_examine');
  yield* say(T.RT_NET);
});

registerScript('obj_rt_kakashi', function* (): Co {
  se('se_examine');
  if (hStage() === 2 && kanenariHere() && !flag(RF.kakashi)) {
    setFlag(RF.kakashi, 1);
    yield* say(T.RT_KAKASHI_H2);
    return;
  }
  yield* say(T.RT_KAKASHI);
});

/** 村の ネットの 戸（開かない とき）。 */
registerScript('obj_rt_to', function* (): Co {
  se('se_examine');
  if (hStage() === 0 || !lanternOn()) {
    yield* say(T.RT_TO_DARK);
    return;
  }
  yield* say(flag(RF.done) ? T.RT_TO_AFTER : T.RT_TO_SHUT);
});

/** 2 上の 畑（入ると すぐ。1回）。 */
registerScript('evt_rt_hata_enter', function* (): Co {
  if (!rtAway() || flag(RF.first)) return;
  yield 300;
  setFlag(RF.first, 1);
  yield* say(T.RT_HATA_FIRST);
});

/** 畑の ペロ。 */
registerScript('rt_pero', function* (): Co {
  if (rtSeenN() >= 3 && !flag(RF.done)) {
    yield* finale();
    return;
  }
  yield* say(T.RT_PERO_WAIT);
});

/** 4 寝とる うちに（コンテナの 前）→ ごほうび。 */
function* finale(): Co {
  const a = field()?.actorById('rt_pero');
  const f = field();
  if (a && f) {
    a.data.scripted = true;
    a.dir = Math.abs(f.player.x - a.x) > Math.abs(f.player.y - a.y) ? (f.player.x < a.x ? 'left' : 'right') : f.player.y < a.y ? 'up' : 'down';
  }
  try {
    yield* say(T.RT_NETORU);
    if (!flag(RF.miss) && !flag(RF.iite)) {
      setFlag(RF.iite, 1);
      yield* say(T.RT_IITE);
    }
    yield* say(T.RT_WATASU);
    if (addItem(RT_ITEM)) {
      se('se_item');
      yield* runMsg(T.RT_GOT);
    } else yield* say(T.RT_BAG_FULL);
    setFlag(RF.done, 1);
    addMp(2);
    se('se_item');
    yield* runMsg(T.RT_REWARD);
  } finally {
    if (a) delete a.data.scripted;
  }
  // he takes the crate down to his greenhouse
  yield* game.fadeOut(400, '#0B0B14');
  field()?.refreshPresence?.();
  yield 200;
  yield* game.fadeIn(400);
}

/** 〔retasu〕（3号ハウスの 前の ペロ）。 */
function* start(): Co {
  setFlag(RF.start, 1);
  yield* say(T.RT_START);
  se('se_cursor', { vol: 0.4, pitch: 1.6 });
  yield* say(T.RT_LAMP);
  // he goes up first (the village's ペロ is up in the field till it is done)
  yield* game.fadeOut(400, '#0B0B14');
  field()?.refreshPresence?.();
  yield 300;
  yield* game.fadeIn(400);
}

/** ペロの いつもの 会話の 回数（今の 段階）。 */
const peroTalks = (): number => flag(`flag_seen_${PERO}_h${hStage()}`);

wrap(PERO, function* (_ctx, orig): Co {
  const before = peroTalks();
  const village = onMap(VILLAGE);
  if (village && flag(RF.done) && !flag(RF.peroAfter) && rtOpen()) {
    setFlag(RF.peroAfter, 1);
    yield* say(T.RT_PERO_AFTER);
    return;
  }
  yield* orig();
  if (!village || pgOn()) return;
  // 段階0：最初の 1ページだけ（1回）
  if (hStage() === 0) {
    if (flag('flag_ch2_met_mitsu') && !flag(RF.h0) && !flag('flag_ch2_boss_beaten')) {
      setFlag(RF.h0, 1);
      yield* say(T.RT_H0);
    }
    return;
  }
  if (!rtOpen() || flag(RF.start)) return;
  // the second ordinary talk at this stage (another errand's turn did not count up the talks)
  if (before >= 1 && peroTalks() > before) yield* start();
});

/** かくし：マサルに『しゃきしゃきレタス』を 持って 話す（1回）。 */
wrap('npc_hoshi_gen', function* (_ctx, orig): Co {
  yield* orig();
  if (!flag(RF.done) || flag(RF.masaru) || !kanenariHere() || pgOn()) return;
  if (!state.inventory.includes(RT_ITEM)) return;
  setFlag(RF.masaru, 1);
  yield* say(T.RT_MASARU);
});

/** かくし：すんだ あと、ペロの 家の 水がめ（1回）。 */
wrap('obj_hr_kominka_mizugame', function* (_ctx, orig): Co {
  yield* orig();
  if (!onMap(KOMINKA) || !flag(RF.done) || flag(RF.kominka)) return;
  setFlag(RF.kominka, 1);
  yield* say(T.RT_KOMINKA);
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.retasu(step = 'pero', stage = 'h1', auto = false)（'h1' トマトの 灯り・'h2' よびごえ・'h0' 灯りの 前）
 *   'h0'      段階0、ペロの 前 (4,32) 左向き（話すと 最初の 1ページ）
 *   'pero'    いつもの 会話を 1回 聞いた あと、ペロの 前 (4,32) 左向き（話すと 〔retasu〕）
 *   'to'      〔retasu〕の あと、村の ネットの 戸の 前 (6,20) 上向き（北へ 押すと 上の 畑）
 *   'hata'    〔retasu〕の あと、上の 畑の 入口 (8,8) 上向き（入った ときの 会話は まだ）
 *   'tama'    1つ目の 前 (5,5) 上向き（大写し）
 *   'yawa'    2つ とった あと、やわらかい 株の 前 (9,3) 上向き（見送ると 4 → ごほうび）
 *   'kakashi' 段階2、かかしの 横 (3,8) 左向き
 *   'done'    すんだ あと、ペロの 前（村）
 *   'masaru'  すんだ あと、レタスを 持って、マサルの 前（牛舎の 前の 段階2 の 立ち位置 (49,19) 右向き）
 */
if (import.meta.env.DEV) {
  registerDebug('retasu', (step = 'pero', stg = 'h1', auto = false) => {
    if (stg === 'h0' || step === 'h0') cmd().jump?.('ch2:house', true);
    else if (stg === 'h2' || step === 'kakashi' || step === 'masaru') cmd().jump?.('ch2:hill', true);
    else cmd().jump?.('ch2:houki', true);
    for (const id of Object.values(RF)) setFlag(id, 0);
    while (state.inventory.includes(RT_ITEM)) removeItem(RT_ITEM);
    qaAuto = !!auto;
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    const s = step === 'h0' ? 0 : flag('flag_ch2_stage');
    setFlag(`flag_seen_${PERO}_h${s}`, Math.max(1, flag(`flag_seen_${PERO}_h${s}`)));
    if (step === 'h0' || step === 'pero') return go(VILLAGE, 4, 32, 'left');
    setFlag(RF.start, 1);
    if (step === 'to') return go(VILLAGE, 6, 20, 'up');
    if (step === 'hata') return go(UE_HATA, 8, 8, 'up');
    setFlag(RF.first, 1);
    if (step === 'tama') return go(UE_HATA, 5, 5, 'up');
    if (step === 'kakashi') return go(UE_HATA, 3, 8, 'left');
    setFlag(tamaF(0), 1);
    setFlag(tamaF(2), 1);
    setFlag(RF.sotoba, 1);
    if (step === 'yawa') return go(UE_HATA, 9, 3, 'up');
    setFlag(tamaF(1), 2);
    setFlag(RF.done, 1);
    if (step === 'masaru') {
      addItem(RT_ITEM);
      return go(VILLAGE, 49, 19, 'right');
    }
    return go(VILLAGE, 4, 32, 'left');
  });

  registerDebug('rtPick', (v: unknown = null) => (qaPick = v === null ? null : Number(v)));

  registerDebug('rtState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(RF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof TamaPanel) as TamaPanel | undefined;
    const f = field();
    return {
      flags,
      open: rtOpen(),
      away: rtAway(),
      taken: rtTakenN(),
      left: rtLeftN(),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      lamp: [RT_HEADLAMP.x, RT_HEADLAMP.y],
      items: state.inventory.filter((i) => i === RT_ITEM),
      panel: p ? { k: p.k, kind: p.kind, phase: p.phase } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines; the panel's words in their room. */
export function rtTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足', '平和', '3人', '海', '水族館', 'いただきます', 'ほどよい', 'しゃべらん', 'おかわり', '焼き芋 食うか', 'ダンゴムシ', 'ツガオ'];
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
        if (/\d+:\d\d/.test(plain) || /\d+時/.test(plain) || /\d+分/.test(plain)) bad.push(`${name}: time: ${plain}`);
        if ((who === 'narr' || who === 'sys') && plain.includes('さん')) bad.push(`${name}: 地の文の さん: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('rt', T.RT_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of Object.values(RT_UI.keys)) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  for (const l of RT_UI.levels) if (12 + measure(l) > col) bad.push(`右の 列: ${l} が はみ出す`);
  if (measure(RT_UI.kabu(2)) > col) bad.push('右の 列: 何つ目 が はみ出す');
  if (KEYS_Y + 14 > CH) bad.push(`keys: bottom ${KEYS_Y + 14} > ${CH}`);
  for (const d of RT_ITEM_DESC_CHECK()) bad.push(d);
  return { pages, bad };
}
function RT_ITEM_DESC_CHECK(): string[] {
  return T.RT_ITEM_DESC.filter((l) => measure(l) > 336).map((l) => `説明: ${l}`);
}
if (import.meta.env.DEV) registerDebug('rtText', () => rtTextCheck());
