// 波に 見せる 城（第3章の クリア前、段階1。げむきか 10/27 の 案1、2026-10-27 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_shiro.ts、地図の 絵は art/props/shiro_art.ts、みました帳の ページは ui/menu/book_shiro.ts。
// 新しい 地図・新しい 人は ない（海水浴場に 物を 足す）。
//
//   段階1（正午）、③海水浴場の 決着の あと（flag_ch3_umi_done：浜の 波だけ 寄せている。world/c3sea.ts）から S12 の
//   ナリオサメの 前まで。③の 前は 浜の 海が 鏡の まま なので 起きない。
//   ・波打ちぎわの ウミ npc_c3_mago (60,30)：③の あとの いつもの 会話（C2_TALK）の あと（flag_sr_heard）、グソっ君が
//     いれば もう1回 話すと〔shiro〕（flag_sr_start）。頭の 上に「！」（addMarkSource）。
//   ・バケツ obj_sr_bucket (62,23)：海の 家の 前、浮き輪の 山の よこ。持つ（flag_sr_bucket。持って いる あいだは 地図に 出ない）。
//   ・大写し「砂」その1 SunaPanel('press')：3つの 所で 砂を すくって、決定で 手で 押す（flag_sr_saw_<kind>）。
//       上の 乾いた 砂 obj_sr_suna (60,26)・渚の 波の 中（obj_c3_umi_kagami を 包む。y31 の どこでも）・
//       波打ちぎわの しめった 砂（城の 所 obj_sr_shiro (62,30)）。すくった 砂は flag_sr_suna（1 乾いた・2 水びたし・3 しめった）。
//   ・大写し「砂」その2 SunaPanel('build')：城の 所で、↑↓ で「押しかためる／ひっくり返す」を えらんで 決定 → 決定で
//     持ち上げる。1つずつ（会議 10-27：同時押しに しない）。3段（flag_sr_dan）。押しかためずに 返すと ずるっ
//     （flag_sr_miss）。乾いた・水びたしの 砂で 作ると ざざっ（山に なる。もう1回）。
//   ・かざり 3つ（〔shiro〕の あと、どの 順でも。flag_sr_got_<k>）：監視台の 足もと (56,28) の 貝がら・ロープの 杭の
//     よこ (54,30) の 小石・パラソルの 下 (65,28) の 流木の 小枝。3段の あと 1つずつ のせる（0個でも 先へ。flag_sr_deco）。
//   ・波に 見せる（同じ 大写しで、寄せる 波 2つ。波の 音は 今の 浜の 音 amb_c3_umi の 'shiro'：とける 音は 弱く 波に まぜる）
//     → 城の 下が とける（flag_sr_toke 1）→ まるい 小山（2）→ 朱肉 +2、みました帳③の すみ（flag_sr_done）。
//   ・済んだ あと：城の あとを 調べると 1行（段階1）。段階2（S13〜S14）：ウミの〔c2〕の あと 1ページ（flag_sr_c2）、
//     城の あとは 平らな 砂（地図の 物は 段階1 だけ）。S14 から 先と クリア後は 足さない。
//   ・かくし：城の あとで カイト（flag_sr_kaito）、水切り（flag_mz_done）を 済ませて いれば 小石で 1行（flag_sr_mz）、
//     3段とも 1回で（flag_sr_jii）。
//   ・もどる：大写しを やめると 台本は 止まる（積んだ 段は 残る。城の 所を 調べ直すと 続きから）。
//
// QA：__game.cmd.shiro(step, auto)、srState()、srText()

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
import { ambientEvent } from '../../world/audio';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { actorAnchor, addMarkSource } from '../../world/marks';
import { pgOn } from '../../world/postgame';
import type { MapObj } from '../../world/types';
import { charSprite, poseFrame } from '../../art/chars/registry';
import { drawTape, drawWindow, UI } from '../../ui/window';
import type { Howto } from '../../ui/closeup';
import * as T from '../../data/text/c3_shiro';
import { KAZARI_ORDER, SR_UI, type Kazari } from '../../data/text/c3_shiro';
import { SR_SAND } from '../../art/props/shiro_art';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { addToMap, c3Stage, inCh3, say3 } from './common';

export const SF = {
  heard: 'flag_sr_heard',
  start: 'flag_sr_start',
  bucket: 'flag_sr_bucket',
  suna: 'flag_sr_suna',
  dan: 'flag_sr_dan',
  miss: 'flag_sr_miss',
  deco: 'flag_sr_deco',
  toke: 'flag_sr_toke',
  done: 'flag_sr_done',
  kaito: 'flag_sr_kaito',
  mz: 'flag_sr_mz',
  jii: 'flag_sr_jii',
  c2: 'flag_sr_c2',
} as const;

export type Suna = 'kawaki' | 'doro' | 'shittori';
const SUNA_ORDER: Suna[] = ['kawaki', 'doro', 'shittori'];
export const sawF = (k: Suna): string => `flag_sr_saw_${k}`;
export const gotF = (k: Kazari): string => `flag_sr_got_${k}`;

const UMIZOI = 'map_umizoi';
const UMI = 'npc_c3_mago';
const KAITO = 'npc_c3_kanshiin';
const KAGAMI = 'obj_c3_umi_kagami';

/** 置き場所（今の 地図で 確かめた：人・物・通り道と 重ならない）。 */
const AT = {
  shiro: [62, 30] as [number, number],
  bucket: [62, 23] as [number, number],
  suna: [60, 26] as [number, number],
  kaigara: [56, 28] as [number, number],
  koishi: [54, 30] as [number, number],
  eda: [65, 28] as [number, number],
};

function knWith(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** 寄り道が 開いている（段階1）：③の あと、ナリオサメの 前。 */
export function srOpen(): boolean {
  return inCh3() && !pgOn() && c3Stage() === 1 && flag('flag_ch3_umi_done') > 0 && !flag('flag_ch3_nariosame_beaten');
}

/** 作っている あいだ（〔shiro〕の あと、済む 前）。 */
function making(): boolean {
  return srOpen() && flag(SF.start) > 0 && !flag(SF.done);
}

export function srSawCount(): number {
  return SUNA_ORDER.filter((k) => flag(sawF(k))).length;
}

export function srGotCount(): number {
  return KAZARI_ORDER.filter((k) => flag(gotF(k))).length;
}

/** 話す 人の いない 行を 抜く（グソっ君）。 */
function trim(text: string): string {
  return text
    .split(/\n(?=@)/)
    .filter((p) => !(p.split('\n')[0].slice(1).trim() === 'npc_kanenari' && !knWith()))
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

/** 地図の 絵の flag：立てたら 出し入れを すぐ。 */
function setArt(id: string, v: number): void {
  setFlag(id, v);
  field()?.refreshPresence();
}

// ================================================================ 地図の 物

const OBJ = (o: Record<string, unknown>): MapObj => ({ t: 'obj', ...o }) as unknown as MapObj;
const stage1Umi = (): boolean => inCh3() && !pgOn() && c3Stage() === 1 && flag('flag_ch3_umi_done') > 0;
addToMap(UMIZOI, [
  // the bucket in front of the beach hut, beside the heap of rubber rings (not while しゅん carries it)
  OBJ({ id: 'obj_sr_bucket', x: AT.bucket[0], y: AT.bucket[1], prop: 'prop_sr_bucket', face: 'up', script: 'obj_sr_bucket', cond: { when: () => stage1Umi() && (!flag(SF.bucket) || flag(SF.done) > 0) } }),
  // the castle's place at the wet edge, east of ウミ (stage 1 only: at 12:01 it is flat sand again)
  OBJ({ id: 'obj_sr_shiro', x: AT.shiro[0], y: AT.shiro[1], prop: 'prop_sr_shiro', script: 'obj_sr_shiro', cond: { when: () => stage1Umi() && flag(SF.start) > 0 } }),
  // the dry sand up the beach (a little heap to scoop)
  OBJ({ id: 'obj_sr_suna', x: AT.suna[0], y: AT.suna[1], flat: true, prop: 'prop_sr_suna', script: 'obj_sr_suna', cond: { when: making } }),
  // the three things on the beach for the castle (none of them alive)
  ...KAZARI_ORDER.map((k) =>
    OBJ({ id: `obj_sr_${k}`, x: AT[k][0], y: AT[k][1], flat: true, prop: 'prop_sr_kazari', opts: { k }, script: 'obj_sr_kazari', cond: { when: () => making() && !flag(gotF(k)) } }),
  ),
]);

// ウミの 頭の 上の「！」（〔shiro〕を 言いだせる とき）
addMarkSource((f) => {
  if (f.map.id !== UMIZOI || !srOpen() || !flag(SF.heard) || flag(SF.start) || !knWith()) return null;
  const a = f.actorById(UMI);
  return a && a.visible ? actorAnchor(a) : null;
});

// ================================================================ 大写し「砂」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 列（数と キー）。 */
const RX = SX + 206;
const SW = RX - SX - 4;
/** 城の まん中・土台の 線（大写しの 中、上から）。 */
const CX = SX + 92;
const BASE = 96;
/** 浜の 海の さかい（大写しの 中、上から）。 */
const SHORE = 44;
/** 会話の あと、決定が きくまで（ms）。 */
const ARM_MS = 400;
/** 段の 形（下の 半幅・高さ。上ほど 小さい：2段目から バケツの 半分）。 */
const TIERS: [number, number][] = [
  [26, 20],
  [18, 13],
  [11, 9],
];

type Mode = 'press' | 'build' | 'wave';
type Phase = 'ready' | 'pressing' | 'pressed' | 'menu' | 'pack' | 'flip' | 'lift' | 'rise' | 'result';

export class SunaPanel implements Widget {
  modal = true;
  closeup = true;
  howto: Howto;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  /** QA：押しかためずに 返す 段（0 始まり）。 */
  autoNoPack: number[] = [];
  mode: Mode;
  /** すくった 砂（press）・作る 砂（build）。 */
  kind: Suna;
  active = false;
  phase: Phase = 'ready';
  /** 押した ぐあい（0〜1）。 */
  push = 0;
  /** build：今の 段（0〜2）と、もう 立っている 段の 数。 */
  tier = 0;
  built = 0;
  /** 押しかためた 回数（今の 段）。 */
  packs = 0;
  /** ↑↓ の えらび（0 押しかためる・1 ひっくり返す）。 */
  sel = 0;
  /** 返す・持ち上げる 動き（0〜1）。 */
  anim = 0;
  /** 今の 段の でき（result）。 */
  ok = false;
  /** 崩れた 形を 見せる（ずるっ・ざざっ）。 */
  slump: '' | 'zuru' | 'zaza' = '';
  /** のせた かざり。 */
  placed: Kazari[] = [];
  /** wave：寄せる 波（0〜1）・とけ方（0〜2）・グソっ君（ばんざい）。 */
  wave = 0;
  melt = 0;
  kn = false;
  private armT = 0;
  private wasActive = false;
  private autoT = 0;

  constructor(mode: Mode, kind: Suna = 'shittori') {
    this.mode = mode;
    this.kind = kind;
    this.howto = mode === 'press' ? T.SR_HOWTO_SUNA : T.SR_HOWTO_SHIRO;
    if (mode === 'wave') this.closeup = false;
  }

  /** もどるで やめられるのは、自分で 動かして いる あいだ（会話・動き・波の あいだは パネルの 物）。 */
  quittable(): boolean {
    return this.active && (this.phase === 'ready' || this.phase === 'menu' || this.phase === 'lift');
  }

  /** build：次の 段（バケツに しめった 砂を 詰めた ところから）。 */
  startTier(i: number): void {
    this.tier = i;
    this.packs = 0;
    this.sel = 0;
    this.anim = 0;
    this.slump = '';
    this.phase = 'menu';
    this.autoT = 0;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.active !== this.wasActive) {
      this.wasActive = this.active;
      this.armT = 0;
    }
    if (!this.active) return;
    this.armT += dt;
    const armed = this.armT > ARM_MS;
    let ok = false;
    let ud = 0;
    if (this.auto) {
      this.autoT += dt;
      if (this.autoT > 350) {
        this.autoT = 0;
        if (this.phase === 'menu') {
          const want = this.autoNoPack.includes(this.tier) || this.packs > 0 ? 1 : 0;
          if (this.sel !== want) ud = want > this.sel ? 1 : -1;
          else ok = true;
        } else ok = true;
      }
    } else {
      ok = armed && input.pressed('confirm');
      ud = (input.pressed('down') ? 1 : 0) - (input.pressed('up') ? 1 : 0);
    }
    switch (this.phase) {
      case 'ready':
        if (ok) {
          this.phase = 'pressing';
          this.push = 0;
          se(this.kind === 'doro' ? 'se_step_wet' : 'se_step_sand', { vol: 0.5, pitch: 0.8 });
        }
        return;
      case 'pressing':
        this.push = Math.min(1, this.push + dt / 520);
        if (this.push >= 1) this.phase = 'pressed';
        return;
      case 'menu':
        if (ud) {
          this.sel = Math.max(0, Math.min(1, this.sel + ud));
          se('se_cursor', { vol: 0.4 });
        }
        if (!ok) return;
        if (this.sel === 0) {
          this.phase = 'pack';
          this.anim = 0;
          this.packs++;
          se('se_step_sand', { vol: 0.55, pitch: 0.7 });
        } else {
          this.phase = 'flip';
          this.anim = 0;
          se('se_step_sand', { vol: 0.4, pitch: 1.2 });
        }
        return;
      case 'pack':
        this.anim = Math.min(1, this.anim + dt / 280);
        if (this.anim >= 1) {
          this.phase = 'menu';
          this.anim = 0;
          // packed once: the cursor moves on to the next thing (one thing at a time)
          this.sel = 1;
        }
        return;
      case 'flip':
        this.anim = Math.min(1, this.anim + dt / 520);
        if (this.anim >= 1) {
          this.phase = 'lift';
          this.anim = 0;
          this.armT = 0;
        }
        return;
      case 'lift':
        if (ok) {
          this.phase = 'rise';
          this.anim = 0;
          this.ok = this.kind === 'shittori' && this.packs > 0;
          this.slump = this.kind !== 'shittori' ? 'zaza' : this.packs > 0 ? '' : 'zuru';
          se(this.ok ? 'se_poton' : 'se_step_sand', { vol: 0.4, pitch: this.ok ? 0.7 : 0.6 });
        }
        return;
      case 'rise':
        this.anim = Math.min(1, this.anim + dt / 560);
        if (this.anim >= 1) {
          this.phase = 'result';
          if (this.ok) this.built = this.tier + 1;
        }
        return;
      default:
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
        g.clip(SX, oy, SW, CH, () => (this.mode === 'press' ? this.drawPress(g, oy) : this.drawBeach(g, oy)));
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        this.drawSide(g, oy);
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(SR_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, SR_UI.place, { seed: 27 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  // ---------------------------------------------------------------- その1：手で 押す（真上から）

  private drawPress(g: Gfx, oy: number): void {
    const S = SR_SAND;
    const kind = this.kind;
    const base = kind === 'kawaki' ? S.lt : kind === 'doro' ? S.wet : S.wetLt;
    g.rect(SX, oy, SW, CH, base);
    // the grains (dry: many pale; wet: few, the water's sheen moving over them)
    for (let i = 0; i < 70; i++) {
      const x = SX + ((i * 47) % SW);
      const y = oy + ((i * 31) % CH);
      g.rect(x, y, 1, 1, kind === 'kawaki' ? (i % 3 ? S.sand : '#FFF6E0') : i % 2 ? S.wetDk : S.wet);
    }
    if (kind === 'doro') {
      // a thin sheet of water over it, the foam's lace drifting (the beach's waves, 4 s)
      const ph = (this.t % 4000) / 4000;
      g.alpha(0.35, () => g.rect(SX, oy, SW, CH, '#9AC8DC'));
      for (let i = 0; i < 5; i++) {
        const y = oy + 10 + i * 22 + Math.round(Math.sin(ph * Math.PI * 2 + i) * 3);
        for (let x = SX + ((i * 13) % 9); x < SX + SW; x += 7) g.rect(x, y + ((x >> 3) % 2), 4, 1, '#E8F2F4');
      }
    }
    if (kind === 'shittori') {
      // the darker damp line where the waves stop
      for (let x = SX; x < SX + SW; x += 3) g.rect(x, oy + 6 + ((x >> 2) % 2), 2, 1, S.wet);
    }
    const hx = SX + 100;
    const hy = oy + 58;
    const p = this.phase === 'ready' ? 0 : this.push;
    const after = this.phase === 'pressed' ? Math.min(1, (this.t % 100000) / 1) : 0;
    // what the hand left (once it is pressed in)
    if (p > 0.55) this.drawMark(g, hx, hy, (p - 0.55) / 0.45, after);
    // the hand: hovering (its shadow beside it), pressing in, then lifted off to the top
    const lift = this.phase === 'pressed' ? 1 : 0;
    if (!lift) {
      const down = Math.min(1, p * 1.8);
      const off = Math.round((1 - down) * 6);
      if (off > 0) g.alpha(0.25, () => this.hand(g, hx + 3, hy + 4, '#6A5A3A', '#6A5A3A'));
      this.hand(g, hx - off, hy - off * 2, '#E8B890', '#C88A62');
    }
  }

  /** 押した あと（乾いた：こぼれて 埋まる、水びたし：横へ 流れる、しめった：指の 形が 残る）。 */
  private drawMark(g: Gfx, x: number, y: number, k: number, _after: number): void {
    const S = SR_SAND;
    const dent = (c: string) => {
      g.rect(x - 16, y - 2, 32, 22, c);
      for (let i = 0; i < 4; i++) g.rect(x - 15 + i * 8, y - 26 + Math.abs(i - 1.5) * 3, 6, 22, c);
      g.rect(x - 26, y + 4, 9, 6, c);
    };
    if (this.kind === 'shittori') {
      dent(S.wetDk);
      // the clean edges of the print
      g.rect(x - 16, y + 20, 32, 1, '#8A7A54');
      return;
    }
    if (this.kind === 'kawaki') {
      // the print fills back in at once; grains trickle where the fingers were
      g.alpha(Math.max(0, 0.6 - k * 0.6), () => dent(S.dk));
      for (let i = 0; i < 14; i++) {
        const gx = x - 16 + ((i * 7) % 32);
        const gy = y - 20 + ((this.t / 30 + i * 9) % 40);
        g.rect(gx, Math.round(gy), 1, 1, S.dk);
      }
      return;
    }
    // doro: the sand runs out sideways in a flat spreading blot
    const r = 12 + Math.round(k * 26);
    for (let d = -6; d <= 6; d++) {
      const hw = Math.round(r * Math.sqrt(1 - (d / 6.5) ** 2));
      g.rect(x - hw, y + 8 + d * 2, hw * 2, 2, d % 2 ? S.wetDk : '#A89468');
    }
  }

  /** 手（真上から：手のひら・4本の 指・親指）。 */
  private hand(g: Gfx, x: number, y: number, c: string, rim: string): void {
    const palm = (cx: number, cy: number, rx: number, ry: number, col: string) => {
      for (let d = -ry; d <= ry; d++) {
        const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (d / (ry + 0.5)) ** 2)));
        g.rect(cx - hw, cy + d, hw * 2 + 1, 1, col);
      }
    };
    for (let i = 0; i < 4; i++) {
      const fx = x - 12 + i * 8;
      const top = y - 26 + Math.abs(i - 1.5) * 3;
      g.rect(fx - 1, top - 1, 8, 24, rim);
      g.rect(fx, top, 6, 22, c);
    }
    palm(x - 22, y + 7, 5, 4, rim);
    palm(x - 22, y + 7, 4, 3, c);
    palm(x, y + 8, 17, 13, rim);
    palm(x, y + 8, 16, 12, c);
    // the sleeve of the T-shirt at the bottom edge
    g.rect(x - 14, y + 20, 28, 30, rim === '#6A5A3A' ? rim : '#3E8A4E');
  }

  // ---------------------------------------------------------------- その2・波：浜の 横から（海は 奥、城は 手前）

  private drawBeach(g: Gfx, oy: number): void {
    const S = SR_SAND;
    // the noon sky, the sea's band (its crests and glints), the beach
    g.rect(SX, oy, SW, 22, '#CFE6F2');
    g.rect(SX, oy + 22, SW, SHORE - 22, '#5AA0C8');
    for (let i = 0; i < 12; i++) {
      const x = SX + ((i * 37 + Math.floor(this.t / 120)) % SW);
      const y = oy + 25 + ((i * 7) % (SHORE - 26));
      g.rect(x, y, 6, 1, '#A8D4F0');
    }
    g.rect(SX, oy + SHORE, SW, CH - SHORE, S.wetLt);
    for (let i = 0; i < 40; i++) g.rect(SX + ((i * 53) % SW), oy + SHORE + 4 + ((i * 29) % (CH - SHORE - 4)), 2, 1, i % 2 ? S.wet : S.lt);
    // the beach's own waves (4 s: the foam running up and back), and the one that comes to the castle
    const ph = (this.t % 4000) / 4000;
    const run = 4 + Math.round(Math.sin(ph * Math.PI) * 6);
    const reach = Math.max(run, Math.round(this.wave * (BASE + 6 - SHORE)));
    this.foam(g, oy + SHORE, reach);
    // グソっ君 between the sea and the castle, his back to us, both claws up (ばんざい)
    const ky = oy + BASE - 22;
    if (this.kn) {
      const s = charSprite('kanenari');
      const img = poseFrame(s, 'zipper', 'up');
      const kx = CX + 44;
      g.img(img, Math.round(kx - img.width), Math.round(ky - img.height * 2), { scale: 2 });
      // the wave runs between his legs: the foam over his feet
      if (reach > ky - oy - SHORE - 4) g.alpha(0.75, () => g.rect(Math.round(kx - img.width) + 4, ky - 5, img.width * 2 - 8, 5, '#E8F2F4'));
    }
    this.drawCastle(g, oy);
    if (this.mode === 'build') this.drawBucket(g, oy);
  }

  /** 寄せる 波（海の さかいから reach px 手前まで。白い 泡の ふち）。 */
  private foam(g: Gfx, y0: number, reach: number): void {
    if (reach <= 0) return;
    g.alpha(0.55, () => g.rect(SX, y0, SW, reach, '#9AC8DC'));
    for (let x = SX; x < SX + SW; x += 2) {
      const w = Math.round(Math.sin(x / 9 + this.t / 300) * 2);
      g.rect(x, y0 + reach + w - 1, 2, 2, '#F4F8F8');
    }
  }

  private drawCastle(g: Gfx, oy: number): void {
    const S = SR_SAND;
    const by = oy + BASE;
    const n = this.built;
    if (this.melt >= 2) {
      // the round low mound, the twig still standing
      for (let d = -8; d <= 0; d++) {
        const hw = Math.round(30 * Math.sqrt(1 - (d / 8.5) ** 2));
        g.rect(CX - hw, by + d, hw * 2, 1, d === -8 ? S.wetLt : S.wet);
      }
      g.rect(CX - 30, by, 60, 2, S.wetDk);
      if (this.placed.includes('eda')) this.flag(g, CX, by - 8);
      return;
    }
    // the shadow straight down (noon): only a thin line round the foot
    if (n > 0) g.rect(CX - TIERS[0][0] - 1, by, TIERS[0][0] * 2 + 2, 2, S.wetDk);
    let y = by;
    for (let i = 0; i < n; i++) {
      const [hw, h] = TIERS[i];
      for (let r = 0; r < h; r++) {
        const w = hw - Math.floor((r * 4) / h);
        g.rect(CX - w, y - r - 1, w * 2, 1, r === h - 1 ? S.wetLt : r % 5 === 0 ? S.wetDk : S.wet);
      }
      // the bucket's rings pressed into its side
      g.rect(CX - hw + 2, y - Math.round(h * 0.6), hw * 2 - 4, 1, S.wetDk);
      if (i === 0 && this.melt >= 1) {
        // the foot eaten away: notches, soaked darker
        g.rect(CX - hw, y - 4, hw * 2, 4, '#A89468');
        for (let x = CX - hw; x < CX + hw; x += 6) g.rect(x, y - 3, 3, 3, S.wetLt);
      }
      y -= h;
    }
    // the decorations: the shell window, the pebble gate, the twig flag on top
    if (this.placed.includes('kaigara') && n >= 2) {
      const wy = by - TIERS[0][1] - 7;
      g.rect(CX - 3, wy, 6, 4, '#F4F1E8');
      g.rect(CX - 2, wy + 1, 1, 2, '#D8CFC0');
      g.rect(CX + 1, wy + 1, 1, 2, '#D8CFC0');
    }
    if (this.placed.includes('koishi') && n >= 1) {
      g.rect(CX - 4, by - 6, 8, 5, '#8A8A90');
      g.rect(CX - 3, by - 6, 6, 1, '#B0B0B8');
    }
    if (this.placed.includes('eda') && n >= 3) this.flag(g, CX, y);
    // what came out of the bucket when it went wrong
    if (this.phase === 'rise' || this.phase === 'result') {
      if (this.slump === 'zuru') {
        const [hw, h] = TIERS[this.tier];
        const ty = by - TIERS.slice(0, this.tier).reduce((s, t) => s + t[1], 0);
        const k = this.anim;
        for (let r = 0; r < h; r++) {
          const w = hw - Math.floor((r * 4) / h) + (r > h / 2 ? Math.round(k * 3) : 0);
          if (r > h - 4 && k > 0.5) continue;
          g.rect(CX - w, ty - r - 1, w * 2, 1, S.wet);
        }
        // the corner that fell off, at the foot
        if (k > 0.5) g.rect(CX + hw - 2, ty - 3, 6, 3, S.wetLt);
      } else if (this.slump === 'zaza') {
        const ty = by - TIERS.slice(0, this.tier).reduce((s, t) => s + t[1], 0);
        const col = this.kind === 'kawaki' ? S.lt : '#A89468';
        for (let d = -6; d <= 0; d++) {
          const hw = Math.round((20 + this.anim * 6) * Math.sqrt(1 - (d / 6.5) ** 2));
          g.rect(CX - hw, ty + d - 1, hw * 2, 1, col);
        }
      }
    }
  }

  /** 流木の 小枝の 旗。 */
  private flag(g: Gfx, x: number, y: number): void {
    g.rect(x, y - 16, 2, 16, '#8A6444');
    g.rect(x + 2, y - 16, 3, 2, '#A8825A');
    g.rect(x + 2, y - 12, 2, 1, '#8A6444');
  }

  /** 赤い バケツ（詰めて、押して、返して、持ち上げる）。 */
  private drawBucket(g: Gfx, oy: number): void {
    const S = SR_SAND;
    if (this.phase === 'result' || (this.phase === 'rise' && this.anim > 0.95) || this.phase === 'ready') return;
    const [hw, h] = TIERS[Math.min(2, this.tier)];
    const half = this.tier > 0;
    const topY = oy + BASE - TIERS.slice(0, this.tier).reduce((s, t) => s + t[1], 0);
    const bucket = (x: number, y: number, up: boolean, fill: number) => {
      // up: open end at the top (sand inside); else upside down on the castle
      const bw = hw + 2;
      for (let r = 0; r < h + 2; r++) {
        const w = up ? bw - Math.floor(((h + 1 - r) * 4) / (h + 2)) : bw - Math.floor((r * 4) / (h + 2));
        g.rect(x - w, y - r - 1, w * 2, 1, r % 6 === 2 ? '#B8362C' : '#D8483A');
      }
      if (up) {
        const sy = y - (h + 2);
        const sandTop = sy + Math.round((1 - fill) * (h * 0.5)) + (this.packs > 0 ? 2 : 0);
        g.rect(x - bw + 2, sandTop, bw * 2 - 4, 2, this.packs > 0 ? S.wetDk : S.wet);
        g.rect(x - bw, sy - 1, bw * 2, 1, '#E8685A');
      }
    };
    if (this.phase === 'menu' || this.phase === 'pack') {
      // the full bucket beside the castle; packing: the hand pats the sand down
      const bx = CX - 64;
      const by = oy + BASE;
      bucket(bx, by, true, half ? 0.5 : 1);
      if (this.phase === 'pack') {
        const d = Math.round(Math.sin(this.anim * Math.PI) * 6);
        g.rect(bx - 8, by - h - 14 + d, 16, 7, '#E8B890');
        g.rect(bx - 8, by - h - 14 + d, 16, 1, '#C88A62');
      }
      return;
    }
    if (this.phase === 'flip') {
      // over to the castle and turned over
      const k = ease.cubicInOut(this.anim);
      const bx = Math.round(CX - 64 + 64 * k);
      const by = Math.round(oy + BASE - Math.sin(k * Math.PI) * 18 - (oy + BASE - topY) * k);
      bucket(bx, by, k < 0.5, 1);
      return;
    }
    // lift / rise: upside down on the castle, then up off it
    const up = this.phase === 'rise' ? Math.round(ease.cubicOut(this.anim) * 40) : 0;
    g.alpha(this.phase === 'rise' ? 1 - this.anim * 0.6 : 1, () => bucket(CX, topY - up, false, 1));
  }

  private drawSide(g: Gfx, oy: number): void {
    const rows: [string, string][] = [];
    if (this.mode === 'press') rows.push([SR_UI.namae[this.kind], '#FFE7A3']);
    rows.push([SR_UI.suna(srSawCount()), '#F4ECD8']);
    if (this.mode !== 'press') {
      rows.push([SR_UI.dan(this.built), '#F4ECD8']);
      rows.push([SR_UI.kazari(srGotCount()), '#F4ECD8']);
    }
    rows.forEach(([l, c], i) => g.text(l, RX, oy + 2 + i * 15, { color: c }));
    if (!this.active) return;
    const ky = oy + 64;
    if (this.phase === 'ready') SR_UI.keysPress.forEach((l, i) => g.text(l, RX, ky + i * 15, { color: '#FFE7A3' }));
    if (this.phase === 'menu') {
      SR_UI.menu.forEach((l, i) => {
        const on = this.sel === i;
        if (on) g.rect(RX - 2, ky + i * 16 - 1, SX + CW - RX, 15, '#4A3A5A');
        g.text((on ? '▶' : '　') + l, RX, ky + i * 16, { color: on ? '#FFE7A3' : '#8A84A0' });
      });
      SR_UI.keysMenu.forEach((l, i) => g.text(l, RX, ky + 34 + i * 15, { color: '#8A84A0' }));
    }
    if (this.phase === 'lift') SR_UI.keysLift.forEach((l, i) => g.text(l, RX, ky + i * 15, { color: '#FFE7A3' }));
  }
}

function* openPanel(p: SunaPanel): Co {
  game.ui.push(p);
  se('se_examine', { vol: 0.4, pitch: 0.9 });
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: SunaPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;
let qaNoPack: number[] = [];

/** 波の 音（今の 浜の 音 amb_c3_umi に 1つ 寄せる。とける 音は 弱く その 中に）。 */
function waveSound(): void {
  const f = field();
  const pan = f ? Math.max(-0.6, Math.min(0.6, (AT.shiro[0] * 16 + 8 - f.player.x) / 200)) : 0;
  ambientEvent('amb_c3_umi', 'shiro', pan);
}

// ================================================================ 台本

/** 2 すくって、手で 押す（その1）。しめった 砂は そのまま 城へ（true）。 */
function* scoop(kind: Suna): Co<boolean> {
  const p = new SunaPanel('press', kind);
  p.auto = qaAuto;
  try {
    yield* openPanel(p);
    p.active = true;
    while (p.phase !== 'pressed') yield null;
    p.active = false;
    setFlag(sawF(kind), 1);
    yield 300;
    yield* say(T.SR_SUNA[kind]);
    setFlag(SF.suna, SUNA_ORDER.indexOf(kind) + 1);
    if (kind !== 'shittori') yield* say3(T.SR_SUKUU);
  } finally {
    yield* closePanel(p);
  }
  return kind === 'shittori';
}

/** 3〜5 城（その2）→ かざり → 波に 見せる。 */
function* build(): Co {
  const kind = SUNA_ORDER[Math.max(0, flag(SF.suna) - 1)];
  const p = new SunaPanel('build', kind);
  p.auto = qaAuto;
  p.autoNoPack = qaNoPack;
  p.built = flag(SF.dan);
  let finished = false;
  try {
    yield* openPanel(p);
    while (p.built < 3) {
      p.startTier(p.built);
      p.active = true;
      while (p.phase !== 'result') yield null;
      p.active = false;
      yield 250;
      if (p.slump === 'zaza') {
        yield* say3(T.SR_ZAZA);
        setFlag(SF.suna, 0);
        return;
      }
      if (!p.ok) {
        setFlag(SF.miss, flag(SF.miss) + 1);
        yield* say(T.SR_ZURU);
        continue;
      }
      setArt(SF.dan, p.built);
      if (p.built === 1) {
        yield* say(T.SR_TATTA);
        yield* say3(T.SR_TEPPEN);
      } else yield* say3(p.built === 2 ? T.SR_DAN2 : T.SR_DAN3);
    }
    p.phase = 'result';
    if (!flag(SF.miss) && !flag(SF.jii)) {
      setFlag(SF.jii, 1);
      yield* say3(T.SR_JII);
    }
    // 4 かざり（集めた 物を 1つずつ）
    const got = KAZARI_ORDER.filter((k) => flag(gotF(k)));
    if (got.length) yield* say3(T.SR_KAZARI_A);
    for (const k of got) {
      p.placed.push(k);
      se('se_examine', { vol: 0.35, pitch: 1.3 });
      yield 250;
      if (k === 'koishi' && flag('flag_mz_done') && !flag(SF.mz) && knWith()) {
        setFlag(SF.mz, 1);
        yield* say(T.SR_KOISHI_MZ);
      } else yield* say(T.SR_KAZARI[k]);
    }
    setArt(SF.deco, 1);
    // 5 波に 見せる
    p.mode = 'wave';
    p.closeup = false;
    p.kn = knWith();
    yield 300;
    yield* say(T.SR_NAMI_A);
    waveSound();
    yield* animate(1500, (x) => (p.wave = x), ease.cubicOut);
    p.melt = 1;
    setArt(SF.toke, 1);
    yield* animate(1200, (x) => (p.wave = 1 - x), ease.cubicInOut);
    yield* say(T.SR_NAMI_B);
    yield* say(T.SR_NAMI_C);
    waveSound();
    yield* animate(1500, (x) => (p.wave = x), ease.cubicOut);
    p.melt = 2;
    setArt(SF.toke, 2);
    yield* animate(1200, (x) => (p.wave = 1 - x), ease.cubicInOut);
    yield* say3(flag(gotF('eda')) ? T.SR_NAMI_D_EDA : T.SR_NAMI_D);
    finished = true;
  } finally {
    yield* closePanel(p);
  }
  if (!finished) return;
  // 6 ごほうび（バケツは 海の 家の 前へ もどす）
  setArt(SF.done, 1);
  setFlag(SF.suna, 0);
  addMp(2);
  se('se_item');
  yield* say3(T.SR_REWARD);
}

/** 1 波打ちぎわの ウミ（〔shiro〕、作っている あいだ）。段階2 は〔c2〕の あと 1ページ。 */
wrap(UMI, function* (_ctx, orig): Co {
  if (srOpen() && onMap(UMIZOI)) {
    if (!flag(SF.start)) {
      if (!flag(SF.heard) || !knWith()) {
        yield* orig();
        setFlag(SF.heard, 1);
        return;
      }
      setFlag(SF.start, 1);
      field()?.refreshPresence();
      yield* say(T.SR_A);
      return;
    }
    if (!flag(SF.done)) {
      yield* say3(flag(SF.bucket) ? T.SR_WAIT2 : T.SR_WAIT);
      return;
    }
  }
  yield* orig();
  if (inCh3() && !pgOn() && c3Stage() === 2 && !flag('flag_ch3_truck_trap') && onMap(UMIZOI) && flag(SF.done) && !flag(SF.c2)) {
    setFlag(SF.c2, 1);
    yield* say3(T.SR_C2);
  }
});

registerScript('obj_sr_bucket', function* (): Co {
  se('se_examine');
  if (making() && !flag(SF.bucket)) {
    setArt(SF.bucket, 1);
    se('se_item', { vol: 0.35 });
    yield* say3(T.SR_BUCKET);
    return;
  }
  yield* say3(T.SR_BUCKET_LOOK);
});

registerScript('obj_sr_suna', function* (): Co {
  se('se_examine');
  if (making() && flag(SF.bucket)) {
    yield* scoop('kawaki');
    return;
  }
  yield* say3(T.SR_KAWAKI_LOOK);
});

/** 渚の 波の 中（今の 文の かわりに、バケツを 持って 作っている あいだ）。 */
wrap(KAGAMI, function* (_ctx, orig): Co {
  if (making() && flag(SF.bucket) && onMap(UMIZOI)) {
    se('se_examine');
    yield* scoop('doro');
    return;
  }
  yield* orig();
});

registerScript('obj_sr_kazari', function* (ctx: ScriptCtx): Co {
  const k = KAZARI_ORDER.find((x) => `obj_sr_${x}` === String(ctx.source));
  if (!k || !making() || flag(gotF(k))) return;
  se('se_examine');
  setArt(gotF(k), 1);
  se('se_item', { vol: 0.35 });
  yield* say3(T.SR_HIROU[k]);
});

/** 城の 所（しめった 砂 → 3段 → かざり → 波）、済んだ あとは 城の あと。 */
registerScript('obj_sr_shiro', function* (): Co {
  se('se_examine');
  if (flag(SF.done)) {
    yield* say3(flag(gotF('eda')) ? T.SR_ATO : T.SR_ATO_NAKI);
    return;
  }
  if (!making()) return;
  if (!flag(SF.bucket)) {
    yield* say3(T.SR_WAIT);
    return;
  }
  // (the bucket holds the dry or the soaked sand: the castle is tried with it — ざざっ)
  if (flag(SF.suna) === 0) {
    const ok = yield* scoop('shittori');
    if (!ok) return;
  }
  yield* build();
});

/** かくし：城の あとで カイト（監視台の 上。グソっ君が いる とき 1回）。 */
wrap(KAITO, function* (_ctx, orig): Co {
  if (srOpen() && onMap(UMIZOI) && flag(SF.done) && !flag(SF.kaito) && knWith()) {
    setFlag(SF.kaito, 1);
    yield* say3(T.SR_KAITO);
    return;
  }
  yield* orig();
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.shiro(step = 'umi', auto = false)（第3章の 段階1、③の あと）
 *   'umi'      ③の あとの いつもの 会話の あと、ウミの 前 (60,29) 下向き（話すと〔shiro〕）
 *   'bucket'   〔shiro〕の あと、バケツの 前 (62,24) 上向き
 *   'kaigara'・'koishi'・'eda'  かざりの 上 （(56,29) 上・(54,29) 下・(65,29) 上向き）
 *   'kawaki'   バケツを 持って、乾いた 砂の 前 (60,27) 上向き
 *   'doro'     バケツを 持って、波打ちぎわ (63,30) 下向き（渚の 波の 中）
 *   'shiro'    バケツを 持って、かざり 3つ、城の 所の 前 (62,29) 下向き（しめった 砂 → 3段 → かざり → 波）。
 *              'zuru' は auto の 版で 2段目を 押しかためずに 返す。'zaza' は 乾いた 砂を すくった あと
 *   'done'     済んだ あと、城の あとの 前 (62,29) 下向き
 *   'kaito'    済んだ あと、監視台の カイトの 前 (57,28) 上向き
 *   'c2'       済んだ あと 段階2、防波堤の ウミ (34,32) の 前 (34,31) 下向き
 */
if (import.meta.env.DEV) {
  registerDebug('shiro', (step = 'umi', auto = false) => {
    const s2 = step === 'c2';
    cmd().jump?.(s2 ? 'ch3:trap' : 'ch3:itadaki', true);
    for (const id of Object.values(SF)) setFlag(id, 0);
    for (const k of SUNA_ORDER) setFlag(sawF(k), 0);
    for (const k of KAZARI_ORDER) setFlag(gotF(k), 0);
    qaAuto = !!auto || step === 'zuru';
    qaNoPack = step === 'zuru' ? [1] : [];
    setFlag('flag_ch3_stage', s2 ? 2 : 1);
    setFlag('flag_ch3_umi_done', 1);
    setFlag(SF.heard, 1);
    const go = (x: number, y: number, d: string) => {
      cmd().warp?.(UMIZOI, x, y, d);
      field()?.refreshPresence();
    };
    if (step === 'umi') return go(60, 29, 'down');
    setFlag(SF.start, 1);
    if (step === 'bucket') return go(62, 24, 'up');
    if (step === 'kaigara') return go(56, 29, 'up');
    if (step === 'koishi') return go(54, 29, 'down');
    if (step === 'eda') return go(65, 29, 'up');
    setFlag(SF.bucket, 1);
    if (step === 'kawaki') return go(60, 27, 'up');
    if (step === 'doro') return go(63, 30, 'down');
    for (const k of KAZARI_ORDER) setFlag(gotF(k), 1);
    if (step === 'zaza') {
      setFlag(sawF('kawaki'), 1);
      setFlag(SF.suna, 1);
    }
    if (step === 'shiro' || step === 'zuru' || step === 'zaza') return go(62, 29, 'down');
    setFlag(sawF('shittori'), 1);
    setFlag(SF.dan, 3);
    setFlag(SF.deco, 1);
    setFlag(SF.toke, 2);
    setFlag(SF.done, 1);
    if (step === 'kaito') return go(57, 28, 'up');
    if (s2) return go(34, 31, 'down');
    return go(62, 29, 'down');
  });

  registerDebug('srState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(SF)) flags[k] = flag(id);
    for (const k of SUNA_ORDER) flags[`saw_${k}`] = flag(sawF(k));
    for (const k of KAZARI_ORDER) flags[`got_${k}`] = flag(gotF(k));
    const p = game.ui.widgets.find((w) => w instanceof SunaPanel) as SunaPanel | undefined;
    const f = field();
    return {
      flags,
      open: srOpen(),
      making: making(),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      panel: p ? { mode: p.mode, kind: p.kind, phase: p.phase, tier: p.tier, built: p.built, packs: p.packs, sel: p.sel, placed: p.placed, melt: p.melt } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no 天丼; no clock time; the names without さん in the narration. */
export function srTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', 'ピッ！', 'あ、つい', '最後って、こわくない', 'おかわり、あるよ', 'もう 1杯', 'ほどよいなぁ', '暗くて しめった', 'まだ', '%', '１％', '1%'];
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
  walkT('sr', T.SR_TEXTS);
  // the right column: every label fits between RX and the panel's inner edge
  const col = SX + CW - RX - 2;
  const labels = [...SR_UI.keysPress, ...SR_UI.keysLift, ...SR_UI.keysMenu, ...SR_UI.menu.map((l) => '▶' + l), SR_UI.suna(3), SR_UI.dan(3), SR_UI.kazari(3), ...Object.values(SR_UI.namae)];
  for (const l of labels) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  // the castle and the bucket stay inside the scene
  if (CX - TIERS[0][0] - 64 + 64 < SX || CX - 64 - TIERS[0][0] - 2 < SX) bad.push('バケツ: 左に はみ出す');
  if (BASE + 2 > CH) bad.push('城: 下に はみ出す');
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('srText', () => srTextCheck());
