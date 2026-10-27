// 穂は ほうき、茎は 柄（第2章。げむきか 10/27 の 案5、2026-10-27 依頼主の 採用。02_ch2_index）。
// 文は data/text/hoshi_hokihata.ts、絵は art/props/hokihata_art.ts、みました帳の ページは ui/menu/book_hokihata.ts。
// （events/ch2/houki.ts は 耕作放棄地の 台本。こちらは ほうき家の ホウキモロコシの 畑なので hokihata）
//
//   段階1〜2（トマトの 灯り）。段階0 は 区長に 話すと 1 の 最初の 5ページだけ（1回）。クリア後の 夜と 段階3 は 足さない。
//   グソっ君が いなくても 進む（グソっ君の 台詞は 抜く。4 の「お日さん 待ち」の やりとりは グソっ君が いる ときだけ）。
//   ・集会所の ハモ区長 (6,3)：いつもの 会話（〔h1_*〕〔h2_*〕）を 1回 聞いた あと、もう 1回 いつもの 会話に なった
//     ときに 続けて〔houki〕（flag_hb_start）。ほかの 寄り道の 区長の 用（色あわせ・皿・祭り）は 先に 出る。
//     区長の 頭の 上に 寄り道の しるし「！」（〔houki〕の 前と、束を かけた あと）。区長は 集会所を 出ない。
//   ・畑：案は「区長の 家の 北の 裏」だが、家の 北は 倉庫との あいだの 1マスの 道しか ない。西どなりの 路地は
//     ナス（akinasu）が 使っているので、東どなりの 路地（区長の 家と 民家3の あいだ）に 3株 obj_hb_kabu_0..2
//     (40,33)〜(40,35)（(39,y) から 東向き）。会議の 注文で 調べる 物を へらした（案の 株6・鎌の 箱 → 株3。
//     鎌は 1株目を 調べた とき 区長の 家の 軒下から 借りる 地の文。1つの 遊びは 3回まで）。
//   ・大写し「節」FushiPanel：↑↓で 切る 所（穂首の すぐ下・穂首の 1つ 下の 節・2つ 下の 節）→ けってい で 切る
//     →（1つ 下の 節なら）けってい で 葉を とる。すぐ下は 穂だけ（△、失敗に しない）、2つ 下は 切らずに もう 1回。
//     flag_hb_kabu_<k>：1 ちょうど（◎）・2 穂だけ（△）。3本 とったら わら縄で 束ねる（flag_hb_taba）。
//   ・分校の 軒下の 竹ざお obj_hb_sao (32,28)（(32,29) から 北向き）に かける（flag_hb_hung）。
//   ・段階1：束を かけた あと 集会所に 入ると 4 さかさに 立てる（flag_hb_sakasa。去年の ほうき (1,6) が さかさ）。
//     段階2 は 寄り合いが ないので 起きない（竹ざおの 束に グソっ君の 1行）。
//   ・区長に 話すと 5 → ごほうび（flag_hb_done、朱肉 +2、みました帳の ページ）。
//   ・かくし：さかさの ほうきを 調べる（flag_hb_sakasa_seen）。3本とも ちょうど（flag_hb_muko）。
//     「ふくじんづけと 耳の あいさつ」（flag_mimi_awase）の あと、竹ざおに かけると 犬が かぎに 来る（flag_hb_kushun）。
//
// QA：__game.cmd.hokihata(step, stage, auto)、hbState()、hbSel(n)、hbText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript, spawn, walk } from '../../world/api';
import { getMapDef, registerMap } from '../../world/maps';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { actorAnchor, addMarkSource } from '../../world/marks';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import type { Howto } from '../../ui/closeup';
import * as T from '../../data/text/hoshi_hokihata';
import { HB_UI } from '../../data/text/hoshi_hokihata';
import { HB_HO, HB_HO_DK, HB_HO_LT, HB_LEAF, HB_LEAF_LT, HB_NODE, HB_STEM, HB_STEM_DK } from '../../art/props/hokihata_art';
import { addMp, panBack, panTo, sendAway } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { hStage, lanternOn } from './common';

export const HF = {
  h0: 'flag_hb_h0',
  start: 'flag_hb_start',
  kama: 'flag_hb_kama',
  taba: 'flag_hb_taba',
  hung: 'flag_hb_hung',
  kushun: 'flag_hb_kushun',
  h2: 'flag_hb_h2',
  sakasa: 'flag_hb_sakasa',
  sakasaSeen: 'flag_hb_sakasa_seen',
  done: 'flag_hb_done',
  muko: 'flag_hb_muko',
  after: 'flag_hb_after',
} as const;

const VILLAGE = 'map_hoshimidai';
const SCHOOL = 'map_hoshi_school';
const KUCHO = 'npc_hoshi_kucho';
/** 3株（区長の 家の 東の 路地。北から）。 */
export const HB_KABU_AT: [number, number][] = [
  [40, 33],
  [40, 34],
  [40, 35],
];
/** 分校の 軒下の 竹ざお。 */
export const HB_SAO_AT: [number, number] = [32, 28];
/** 集会所の 去年の ほうき（西の 壁ぎわ、お茶の 台の 下）。 */
export const HB_HOUKI_AT: [number, number] = [1, 6];
export const kabuF = (k: number): string => `flag_hb_kabu_${k}`;

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
export function hbOpen(): boolean {
  const s = hStage();
  return s >= 1 && s <= 2 && lanternOn() && !pgOn() && !flag('flag_ch2_boss_beaten');
}

/** 刈った 穂の 数（◎＋△）・ちょうどの 数。 */
export const hbCutN = (): number => [0, 1, 2].filter((k) => flag(kabuF(k)) > 0).length;
export const hbGoodN = (): number => [0, 1, 2].filter((k) => flag(kabuF(k)) === 1).length;

/** 株を 刈れる：〔houki〕の あと、束ねる 前。 */
const kabuOn = (k: number): boolean => flag(HF.start) > 0 && !flag(kabuF(k)) && hbOpen();
/** 束を 持って いて、まだ かけて いない。 */
const saoOn = (): boolean => flag(HF.taba) > 0 && !flag(HF.hung) && hbOpen();

/** 区長の いつもの 会話の 回数（今の 段階）。 */
const kuchoTalks = (): number => flag(`flag_seen_${KUCHO}_h${hStage()}`);

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
    def.objects.push(
      // three tall broomcorn plants in the alley east of the ほうき house (between it and 民家3; walked along x39)
      ...HB_KABU_AT.map(([x, y], i) => ({ t: 'prop', id: `prop_hb_kabu_${i}`, prop: 'prop_hb_kabu', x, y, opts: { i }, solid: [0, 0, 1, 1] }) as unknown as MapObj),
      // the plain plant (always), and the one to cut over it (a glint till looked at) while it can be cut
      ...HB_KABU_AT.map(([x, y], i) => ({ t: 'obj', id: `obj_hb_kabu_x_${i}`, x, y, face: 'right', script: 'obj_hb_kabu_x' }) as unknown as MapObj),
      ...HB_KABU_AT.map(([x, y], i) => ({ t: 'obj', id: `obj_hb_kabu_${i}`, x, y, face: 'right', priority: 1, script: 'obj_hb_kabu', cond: { when: () => kabuOn(i) } }) as unknown as MapObj),
      // the bamboo pole under the school's eaves (the nook east of the bicycle stand), and the bundle to hang on it
      { t: 'prop', id: 'prop_hb_sao', prop: 'prop_hb_sao', x: HB_SAO_AT[0], y: HB_SAO_AT[1], solid: [0, 0, 1, 1] } as unknown as MapObj,
      { t: 'obj', id: 'obj_hb_sao', x: HB_SAO_AT[0], y: HB_SAO_AT[1], face: 'up', script: 'obj_hb_sao' } as unknown as MapObj,
      { t: 'obj', id: 'obj_hb_sao_kake', x: HB_SAO_AT[0], y: HB_SAO_AT[1], face: 'up', priority: 1, script: 'obj_hb_sao', cond: { when: saoOn } } as unknown as MapObj,
    );
    registerMap(def);
  }
}

{
  const def = getMapDef(SCHOOL);
  if (def) {
    def.objects.push(
      // last year's broom against the west wall, below the tea stand (upside down after 4)
      { t: 'prop', id: 'prop_hb_houki', prop: 'prop_hb_houki', x: HB_HOUKI_AT[0], y: HB_HOUKI_AT[1], solid: [0, 0, 1, 1] } as unknown as MapObj,
      { t: 'obj', id: 'obj_hb_houki', x: HB_HOUKI_AT[0], y: HB_HOUKI_AT[1], script: 'obj_hb_houki' } as unknown as MapObj,
      { t: 'obj', id: 'obj_hb_houki_sakasa', x: HB_HOUKI_AT[0], y: HB_HOUKI_AT[1], priority: 1, script: 'obj_hb_houki', cond: { when: () => flag(HF.sakasa) > 0 && !flag(HF.sakasaSeen) && !pgOn() } } as unknown as MapObj,
    );
    def.onEnter = [...(def.onEnter ?? []), 'evt_hb_school'];
    registerMap(def);
  }
}

// 区長の 頭の 上の「！」：〔houki〕が 出る 回（いつもの 会話を 1回 聞いた あと）と、束を かけた あと
addMarkSource((f) => {
  if (f.map.id !== SCHOOL || !hbOpen()) return null;
  const ready = !flag(HF.start) && kuchoTalks() >= 1;
  const fin = flag(HF.hung) > 0 && !flag(HF.done);
  if (!ready && !fin) return null;
  const a = f.actorById(KUCHO);
  return a && a.visible ? actorAnchor(a) : null;
});

// ================================================================ 大写し「節」

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
/** 切る 所（大写しの 中の 高さ、上から）：穂首の すぐ下・1つ 下の 節・2つ 下の 節。 */
const CUT_Y = [34, 60, 90];
const NECK_Y = 30;
const GROUND_Y = 106;

type Phase = 'idle' | 'erabu' | 'ha';

export class FushiPanel implements Widget {
  modal = true;
  /** 大写し（engine/touch.ts：絵の 外の タッチも けってい）。 */
  closeup = true;
  /** やり方の カード（ui/closeup.ts。はじめての 1回）。 */
  howto: Howto = HB_UI.howto;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  /** QA の 自動で えらぶ 所。 */
  autoSel = 1;
  phase: Phase = 'idle';
  /** どの 株（0〜2）と、何本目（0〜2）。 */
  k: number;
  n = 0;
  sel = 0;
  /** 切った 所（-1 まだ）・切った 動き（0..1）・葉を とる 動き（0..1）。 */
  cutAt = -1;
  cut = 0;
  cutting = false;
  strip = 0;
  stripping = false;
  hit = false;
  private autoT = 0;

  constructor(k: number) {
    this.k = k;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.cutting) this.cut = Math.min(1, this.cut + dt / 360);
    if (this.stripping) this.strip = Math.min(1, this.strip + dt / 420);
    if (this.phase === 'idle') return;
    let up = false;
    let dn = false;
    let ok = false;
    if (this.auto) {
      this.autoT += dt;
      const tick = Math.floor(this.autoT / 300) !== Math.floor((this.autoT - dt) / 300);
      if (tick) {
        if (this.phase === 'erabu' && this.sel < this.autoSel) dn = true;
        else if (this.phase === 'erabu' && this.sel > this.autoSel) up = true;
        else ok = true;
      }
    } else {
      up = input.pressed('up');
      dn = input.pressed('down');
      ok = input.pressed('confirm');
    }
    if (this.phase === 'erabu') {
      if (up && this.sel > 0) {
        this.sel--;
        se('se_cursor', { vol: 0.3, pitch: 1.1 - this.sel * 0.08 });
      } else if (dn && this.sel < CUT_Y.length - 1) {
        this.sel++;
        se('se_cursor', { vol: 0.3, pitch: 1.1 - this.sel * 0.08 });
      }
    }
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
      const tw = g.measure(HB_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, HB_UI.place, { seed: 27 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  private drawScene(g: Gfx, oy: number): void {
    const W = RX - SX - 4;
    // the night, the lantern's warm pool round the plant
    g.rect(SX, oy, W, CH, '#26324A');
    const cx = SX + 104;
    for (let r = 84; r > 0; r -= 12) g.alpha(0.07, () => g.circle(cx, oy + 58, r, '#FFD8A8'));
    // the ground, the neighbours' stalks dark at the sides
    g.rect(SX, oy + GROUND_Y, W, CH - GROUND_Y, '#3A2A20');
    g.rect(SX, oy + GROUND_Y, W, 1, '#5A4030');
    for (const nx of [SX + 18, SX + 30, W + SX - 22]) {
      g.rect(nx, oy + 10, 2, GROUND_Y - 10, '#2E3E28');
      g.alpha(0.6, () => g.line(nx + 1, oy + 10, nx + 10, oy + 26, '#5A3428'));
    }
    const cutY = this.cutAt >= 0 ? CUT_Y[this.cutAt] : -1;
    const lift = cutY >= 0 ? Math.round(ease.cubicOut(this.cut) * 9) : 0;
    /** 切った 所より 上は 持ち上がる。 */
    const Y = (y: number) => oy + (cutY >= 0 && y < cutY ? y - lift : y);
    // the stalk (two pieces once cut)
    const stem = (y0: number, y1: number) => {
      g.rect(cx - 2, Y(y0), 2, y1 - y0, HB_STEM);
      g.rect(cx, Y(y0), 2, y1 - y0, HB_STEM_DK);
    };
    if (cutY >= 0) {
      stem(NECK_Y, cutY);
      stem(cutY, GROUND_Y);
      // the two cut faces, pale
      g.rect(cx - 2, Y(cutY - 1), 4, 1, '#E8E0B0');
      g.rect(cx - 2, oy + cutY, 4, 1, '#E8E0B0');
    } else stem(NECK_Y, GROUND_Y);
    // the nodes: the one at the head's neck, and the two below (darker rings)
    for (const ny of [NECK_Y + 2, CUT_Y[1], CUT_Y[2]]) g.rect(cx - 3, Y(ny) - 1, 6, 2, HB_NODE);
    // the low leaf (stays on the plant)
    this.leaf(g, cx - 2, oy + GROUND_Y - 4, -1, 34, 6, 1);
    // the leaf of the second node: its sheath up the stem, its blade out to the right
    g.rect(cx - 3, Y(74), 6, CUT_Y[2] - 74, HB_LEAF);
    this.leaf(g, cx + 2, Y(74), 1, 50, 18, 1);
    // the flag leaf from the first node: its sheath up the neck, its blade out to the left (stripped off after the cut)
    const sa = this.cutAt === 1 ? 1 - this.strip : 1;
    const sd = this.cutAt === 1 ? Math.round(this.strip * 14) : 0;
    if (sa > 0) {
      g.alpha(sa, () => {
        g.rect(cx - 3, Y(44) + sd, 6, CUT_Y[1] - 44, HB_LEAF);
        g.rect(cx - 3, Y(44) + sd, 1, CUT_Y[1] - 44, HB_LEAF_LT);
        this.leaf(g, cx - 2, Y(44) + sd, -1, 46, 16, 1);
      });
    }
    // the head: a heavy spray of reddish-brown strands from the neck, up and over, drooping to the right
    const hx = cx;
    const hy = Y(NECK_Y);
    for (let s = -5; s <= 5; s++) {
      let px = hx;
      let py = hy;
      for (let t = 1; t <= 14; t++) {
        const u = t / 14;
        const x = hx + Math.round(s * 2.2 * u + 30 * u * u);
        const y = hy - Math.round(22 * u) + Math.round(34 * u * u * u) + Math.abs(s);
        g.line(px, py, x, y, (s + t) % 3 === 0 ? HB_HO_LT : (s + t) % 3 === 1 ? HB_HO : HB_HO_DK);
        px = x;
        py = y;
      }
      // the seeds at the tip
      g.rect(px - 1, py, 2, 2, HB_HO_DK);
    }
    // the names, small, on the left (the 穂, the 穂首, the 節)
    g.text(HB_UI.ho, cx + 44, Y(4), { color: '#F4D8B0' });
    g.text(HB_UI.hokubi, cx - 44, Y(CUT_Y[0] - 8), { color: '#D8E0C8' });
    g.text(HB_UI.fushi, cx - 24, Y(CUT_Y[1]) - 7, { color: '#D8E0C8' });
    g.text(HB_UI.fushi, cx - 24, Y(CUT_Y[2]) - 7, { color: '#D8E0C8' });
    // the sickle where it would cut (small: the blade only a short curve), the guide across the stalk
    if (this.cutAt < 0 && (this.phase === 'erabu' || this.cutting)) {
      const sy = oy + CUT_Y[this.sel];
      const bob = this.phase === 'erabu' ? Math.round(Math.sin(this.t / 220)) : 0;
      for (let x = cx - 8; x <= cx + 8; x += 3) g.px(x, sy, '#FFE7A3');
      const kx = cx + 6 + bob;
      g.rect(kx + 12, sy - 1, 14, 3, '#8A6A40');
      g.rect(kx + 12, sy - 1, 14, 1, '#AA8A58');
      for (let i = 0; i < 10; i++) g.px(kx + 12 - i, sy - Math.round(Math.sin((i / 10) * Math.PI) * 4), '#D8D8E0');
      for (let i = 0; i < 9; i++) g.px(kx + 12 - i, sy + 1 - Math.round(Math.sin((i / 10) * Math.PI) * 3), '#A8A8B8');
    }
  }

  /** 1枚の 葉：もとから 外へ 弧を 描いて たれる（dir -1 左・1 右）。 */
  private leaf(g: Gfx, x: number, y: number, dir: number, len: number, drop: number, w: number): void {
    let px = x;
    let py = y;
    for (let t = 1; t <= 12; t++) {
      const u = t / 12;
      const nx = x + dir * Math.round(len * u);
      const ny = y - Math.round(8 * u) + Math.round((drop + 8) * u * u);
      g.line(px, py, nx, ny, t < 6 ? HB_LEAF_LT : HB_LEAF);
      g.line(px, py + w, nx, ny + w, HB_LEAF);
      px = nx;
      py = ny;
    }
  }

  private drawSide(g: Gfx, oy: number): void {
    const x = RX - 4;
    const w = SX + CW - RX + 4;
    g.rect(x, oy, w, CH, '#2A3236');
    g.text(HB_UI.kabu(this.n), RX, oy + 4, { color: '#F4ECD8' });
    // the ones cut so far: ◎ the right node, △ the head only
    const marks: number[] = [0, 1, 2].map((k) => flag(kabuF(k)));
    g.text(T.HB_BOOK.marksOnly(marks), RX, oy + 24, { color: '#C8D8C0' });
    const keys = this.phase === 'erabu' ? [HB_UI.keys.erabu, HB_UI.keys.kiru] : this.phase === 'ha' ? [HB_UI.keys.ha, HB_UI.keys.ha2] : [];
    keys.forEach((l, i) => g.text(l, RX, oy + KEYS_Y - (keys.length - 1 - i) * 16, { color: '#FFE7A3' }));
    markText(x, oy, w, CH);
  }
}

function* openPanel(p: FushiPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: FushiPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

function* waitHit(p: FushiPanel, phase: Phase): Co {
  p.hit = false;
  p.phase = phase;
  while (!p.hit) yield null;
  p.phase = 'idle';
}

let qaAuto = false;
/** QA：自動で えらぶ 所（0 すぐ下・1 ちょうど・2 長い）。 */
let qaSel = 1;

/** 2 大写し「節」（k つ目の 株）。切ったら flag を 立てる（やめたら 何も 立てない）。 */
function* fushi(k: number): Co {
  const p = new FushiPanel(k);
  p.auto = qaAuto;
  p.autoSel = qaSel;
  p.n = hbCutN();
  let res = 0;
  try {
    yield* openPanel(p);
    for (;;) {
      yield* waitHit(p, 'erabu');
      const at = p.sel;
      if (at === 2) {
        // too low: not cut, once more (no failure)
        yield* say(T.HB_NAGA);
        if (qaAuto) p.autoSel = 1;
        continue;
      }
      p.cutAt = at;
      p.cutting = true;
      // the light 「しゃく」
      se('se_kotei_snip', { vol: 0.35, pitch: 1.35 });
      yield 380;
      if (at === 0) {
        yield* say(T.HB_MIJIKA);
        res = 2;
      } else {
        yield* say(T.HB_CHOUDO);
        // strip the leaf down off it
        yield* waitHit(p, 'ha');
        p.stripping = true;
        se('se_page', { vol: 0.35, pitch: 0.8 });
        yield 440;
        yield* say(T.HB_HA);
        res = 1;
      }
      break;
    }
  } finally {
    yield* closePanel(p);
  }
  setFlag(kabuF(k), res);
  field()?.refreshPresence?.();
  se('se_item', { vol: 0.4 });
  yield* runMsg(T.hbCount(hbCutN()));
  if (hbCutN() >= 3 && !flag(HF.taba)) {
    setFlag(HF.taba, 1);
    se('se_hug', { vol: 0.35, pitch: 0.9 });
    yield* say(T.HB_TABA);
    field()?.refreshPresence?.();
  }
}

// ================================================================ 台本

registerScript('obj_hb_kabu', function* (ctx: ScriptCtx): Co {
  const k = Math.max(0, Number(String(ctx.source).replace(/^obj_hb_kabu_/, '')));
  se('se_examine');
  if (!kabuOn(k)) return;
  if (!flag(HF.kama)) {
    setFlag(HF.kama, 1);
    yield* say(T.HB_KAMA);
  }
  yield* fushi(k);
});

registerScript('obj_hb_kabu_x', function* (ctx: ScriptCtx): Co {
  const k = Math.max(0, Number(String(ctx.source).replace(/^obj_hb_kabu_x_/, '')));
  se('se_examine');
  if (flag(kabuF(k))) {
    yield* say(T.HB_KARITA);
    return;
  }
  yield* say(hStage() === 0 || !lanternOn() ? T.HB_KABU_DARK : T.HB_KABU);
});

registerScript('obj_hb_sao', function* (): Co {
  se('se_examine');
  if (saoOn()) {
    // 3 hang the bundle
    setFlag(HF.hung, 1);
    se('se_step_wood', { vol: 0.4, pitch: 1.2 });
    field()?.refreshPresence?.();
    yield* say(T.HB_KAKERU);
    if (flag('flag_mimi_awase') && !flag(HF.kushun)) yield* kushun();
    return;
  }
  if (flag(HF.hung)) {
    if (hStage() === 2 && hbOpen() && kanenariHere() && !flag(HF.h2)) {
      setFlag(HF.h2, 1);
      yield* say(T.HB_SAO_H2);
      return;
    }
    yield* say(T.HB_SAO_AFTER);
    return;
  }
  yield* say(T.HB_SAO);
});

/** かくし：ふくじんづけが 束の においを かぎに 来て、くしゃみ（1回）。 */
function* kushun(): Co {
  setFlag(HF.kushun, 1);
  const id = 'hb_dog';
  const a = spawn(id, 33, 31, { sprite: 'npc_hoshi_gon', dir: 'up', ghost: true });
  a.data.scripted = true;
  try {
    yield* walk(id, [[33, 30], [33, 29]], { speed: 6, face: 'left' });
    a.dir = 'left';
    yield 300;
    yield* say(T.HB_KUSHUN);
  } finally {
    if (field()?.actorById(id)) sendAway(a, [[33, 30], [33, 32], [36, 32]], 6, 100, true);
  }
}

registerScript('obj_hb_houki', function* (): Co {
  se('se_examine');
  if (flag(HF.sakasa)) {
    if (!flag(HF.sakasaSeen) && !pgOn()) {
      setFlag(HF.sakasaSeen, 1);
      yield* say(T.HB_HOUKI_SAKASA);
      return;
    }
    yield* say(T.HB_HOUKI_SAKASA2);
    return;
  }
  yield* say(T.HB_HOUKI);
});

/** 4 さかさに 立てる（段階1、束を かけた あと 集会所に 入ると。1回）。 */
registerScript('evt_hb_school', function* (): Co {
  const f = field();
  if (!f || !hbOpen() || hStage() !== 1 || !flag(HF.hung) || flag(HF.sakasa) || flag(HF.done)) return;
  // (just in from the door: not after まつ先生 called him over for the key)
  if (f.player.tileY < 9) return;
  const kucho = f.actorById(KUCHO);
  const yoshie = f.actorById('npc_hoshi_yoshie');
  if (!kucho || !yoshie) return;
  for (const a of [kucho, yoshie]) a.data.scripted = true;
  try {
    yield 300;
    yield* panTo(4, 5, 600);
    if (kanenariHere()) {
      yoshie.dir = 'right';
      yield* say(T.HB_OHISAN);
    }
    kucho.dir = 'down';
    yield 200;
    yield* say(T.HB_SHIKIJI);
    // ぴょん夫人 turns the broom upside down, quietly
    yoshie.dir = 'down';
    yield 300;
    se('se_step_wood', { vol: 0.3, pitch: 1.4 });
    setFlag(HF.sakasa, 1);
    yield 400;
    yield* say(T.HB_SAKASA);
    yield 300;
    yield* say(T.HB_KOKOMADE);
    yoshie.dir = 'left';
    yield* panBack(500);
  } finally {
    for (const a of [kucho, yoshie]) delete a.data.scripted;
    if (!flag(HF.sakasa)) setFlag(HF.sakasa, 1);
  }
});

/** 5 穂は ほうき → ごほうび。 */
function* finale(): Co {
  yield* say(T.HB_HOWA);
  if (hbGoodN() >= 3 && !flag(HF.muko)) {
    setFlag(HF.muko, 1);
    yield* say(T.HB_MUKO);
  }
  setFlag(HF.done, 1);
  addMp(2);
  se('se_item');
  yield* runMsg(T.HB_REWARD);
}

/** 〔houki〕（集会所の ハモ区長）。 */
function* start(): Co {
  const lit = flag(HF.h0) > 0;
  setFlag(HF.start, 1);
  yield* say(lit ? T.HB_START_LIT : T.HB_START);
}

wrap(KUCHO, function* (_ctx, orig): Co {
  const school = onMap(SCHOOL);
  if (school && hbOpen()) {
    if (flag(HF.hung) && !flag(HF.done)) {
      yield* finale();
      return;
    }
    if (flag(HF.done) && !flag(HF.after)) {
      setFlag(HF.after, 1);
      yield* say(T.HB_AFTER);
      return;
    }
  }
  const before = kuchoTalks();
  yield* orig();
  if (!school || pgOn() || flag('flag_ch2_boss_beaten')) return;
  const talked = kuchoTalks() > before;
  // 段階0：最初の 5ページだけ（1回。寄り合いの あとの いつもの 会話の あと）
  if (hStage() === 0) {
    if (flag('flag_ch2_yoriai') && talked && before >= 1 && !flag(HF.h0)) {
      setFlag(HF.h0, 1);
      yield* say(T.HB_H0);
    }
    return;
  }
  if (!hbOpen()) return;
  if (flag(HF.start)) {
    // 刈りに 行く 前・刈って いる 間（いつもの 会話の あとに 1つ）
    if (talked && !flag(HF.hung)) yield* say(T.HB_WAIT);
    return;
  }
  // the second ordinary talk at this stage (another errand's turn did not count up the talks)
  if (before >= 1 && talked) yield* start();
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.hokihata(step = 'kucho', stage = 'h1', auto = false)（'h1' トマトの 灯り・'h2' よびごえ・'h0' 灯りの 前）
 *   'h0'      段階0、寄り合いの あと 区長と 1回 話した、区長の 前 (6,4) 上向き（話すと 最初の 5ページ）
 *   'kucho'   いつもの 会話を 1回 聞いた あと、区長の 前 (6,4) 上向き（話すと〔houki〕）
 *   'kabu'    〔houki〕の あと、1株目の 前 (39,33) 右向き（大写し）
 *   'kabu3'   2本 刈った あと、3株目の 前 (39,35) 右向き
 *   'sao'     3本 束ねた あと、竹ざおの 前 (32,29) 上向き
 *   'school'  かけた あと、分校の 戸の 前 (26,28) 上向き（入ると 4。段階1）
 *   'fin'     4 の あと、区長の 前 (6,4) 上向き（話すと 5）
 *   'houki'   4 の あと、去年の ほうきの 前 (2,6) 左向き
 *   'done'    すんだ あと、竹ざおの 前
 */
if (import.meta.env.DEV) {
  registerDebug('hokihata', (step = 'kucho', stg = 'h1', auto = false) => {
    const want = stg === 'h0' || step === 'h0' ? 0 : stg === 'h2' ? 2 : 1;
    const inCh2 = (field()?.map.id ?? '').startsWith('map_hoshi');
    if (!inCh2 || hStage() !== want || flag('flag_ch2_boss_beaten')) cmd().jump?.(want === 0 ? 'ch2:house' : want === 2 ? 'ch2:hill' : 'ch2:houki', true);
    for (const id of Object.values(HF)) setFlag(id, 0);
    for (const k of [0, 1, 2]) setFlag(kabuF(k), 0);
    qaAuto = !!auto;
    qaSel = 1;
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    const s = flag('flag_ch2_stage');
    setFlag('flag_ch2_yoriai', 1);
    setFlag(`flag_seen_${KUCHO}_h${s}`, Math.max(1, flag(`flag_seen_${KUCHO}_h${s}`)));
    if (step === 'h0' || step === 'kucho') return go(SCHOOL, 6, 4, 'up');
    setFlag(HF.start, 1);
    if (step === 'kabu') return go(VILLAGE, 39, 33, 'right');
    setFlag(HF.kama, 1);
    setFlag(kabuF(0), 1);
    setFlag(kabuF(1), 1);
    if (step === 'kabu3') return go(VILLAGE, 39, 35, 'right');
    setFlag(kabuF(2), 1);
    setFlag(HF.taba, 1);
    if (step === 'sao') return go(VILLAGE, 32, 29, 'up');
    setFlag(HF.hung, 1);
    if (step === 'school') return go(VILLAGE, 26, 28, 'up');
    setFlag(HF.sakasa, 1);
    if (step === 'fin') return go(SCHOOL, 6, 4, 'up');
    if (step === 'houki') return go(SCHOOL, 2, 6, 'left');
    setFlag(HF.done, 1);
    return go(VILLAGE, 32, 29, 'up');
  });

  registerDebug('hbSel', (v: unknown = 1) => (qaSel = Number(v)));

  registerDebug('hbState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(HF)) flags[k] = flag(id);
    for (const k of [0, 1, 2]) flags[`kabu${k}`] = flag(kabuF(k));
    const p = game.ui.widgets.find((w) => w instanceof FushiPanel) as FushiPanel | undefined;
    const f = field();
    return {
      flags,
      open: hbOpen(),
      cut: hbCutN(),
      good: hbGoodN(),
      talks: kuchoTalks(),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      panel: p ? { k: p.k, sel: p.sel, phase: p.phase, cutAt: p.cutAt } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines; the panel's words in their room. */
export function hbTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足', '平和', '3人', '海', '水族館', 'いただきます', 'ほどよい', 'しゃべらん', 'おかわり', '焼き芋 食うか', 'ダンゴムシ', 'ツガオ', 'お集まり いただき'];
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
        if ((who === 'narr' || who === 'sys') && plain.includes('さん') && !plain.includes('お日さん')) bad.push(`${name}: 地の文の さん: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('hb', T.HB_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of Object.values(HB_UI.keys)) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  if (measure(HB_UI.kabu(2)) > col) bad.push('右の 列: 何本目 が はみ出す');
  if (measure(T.HB_BOOK.marksOnly([1, 2, 0])) > col) bad.push('右の 列: ◎△ が はみ出す');
  if (KEYS_Y + 14 > CH) bad.push(`keys: bottom ${KEYS_Y + 14} > ${CH}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('hbText', () => hbTextCheck());

