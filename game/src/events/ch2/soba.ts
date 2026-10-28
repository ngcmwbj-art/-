// ちがう 花が、となりに（第2章。げむきか 10/28 の 案4、2026-10-28 依頼主の 採用。02_ch2_index）。
// 文は data/text/hoshi_soba.ts、新しい 地図は data/maps/hoshi_gakkyuen.ts（map_hoshi_gakkyuen「分校の そば畑」、16×10、
// 画面 1枚）、絵は art/props/soba_art.ts、みました帳の ページは ui/menu/book_soba.ts。
//
//   段階1〜2（トマトの 灯り）。段階0 は まつ先生の いつもの 会話〔h0_2〕の あと 1ページだけ（1回）、竹垣の 戸は 地の文。
//   クリア後の 夜と 段階3 は 足さない（戸は しばった まま）。グソっ君が いなくても 進む（グソっ君の 台詞は 抜く）。
//   ・まつ先生（段階1 は 集会所 ほか、段階2 は 山道の 入口）：いつもの 会話を 1回 聞いた あと、もう 1回 いつもの 会話に
//     なった ときに 続けて〔soba〕（flag_sb_told）。ほかの 寄り道の 用は 先に 出る（その 回は 出さない）。頭の 上に「！」。
//   ・校庭の 北西の すみ、分校の 西の 壁ぎわの 竹垣の 戸 (20,26)（(20,27) から 北向きに 調べる）→ 暗転で そば畑 (8,8)。
//     人が 絵の 中へ 歩いて 入る 形では ない（調べて 暗転）。〔soba〕を 聞く 前でも、段階1〜2 なら 開く（入ると 始まり）。
//   ・そば畑：そばを 調べると 大写し「そばの 花」SobaPanel（灯りの 輪の 中の 6つの 花。←→ で 選んで けってい で のぞく。
//     のぞいた 花は 右に 大きく：めしべと おしべの 長さを 形〈横から 見た 絵〉と 色の 棒と 字〈長・短〉で）。となりあう
//     2つを 続けて のぞくと 組：ちがう 形なら 札『長』『短』（flag_sb_fuda の ビット）、同じ 形なら「ふたごや」（札は 立たず、
//     失敗に しない。flag_sb_futago）。3組 そろうと flag_sb_hana。もどる で やめても、のぞいた 花と 立てた 札は 残る。
//   ・名札の 杭・当番表・道具小屋（かくし：7つの ふるい）・北の 杉。
//   ・まつ先生に 話す → 5 ちがう 花が、となりに → ごほうび（flag_sb_done、朱肉 +2、ページ）。〔soba〕を 聞いて いなければ
//     1 の 前半から。段階2 は 星座の 1行。かくし：稲の 花（flag_hn_done）・3組とも 1回で（flag_sb_futago 0）。
//   ・光：そば畑は ぜんぶ 暗がり（暗がりの 色を 1段 明るく）。トマトの 灯りの 輪の 中だけ 花が はっきり 浮かぶ。
//
// QA：__game.cmd.soba(step, stage, auto)、sbState()、sbText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { drawText, measure } from '../../engine/font';
import { makeCanvas } from '../../engine/pixel';
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
import { actorAnchor, addMarkSource } from '../../world/marks';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import type { Howto } from '../../ui/closeup';
import * as T from '../../data/text/hoshi_soba';
import { SB_UI } from '../../data/text/hoshi_soba';
import { GAKKYUEN, SB_TO_AT } from '../../data/maps/hoshi_gakkyuen';
import { SB_ANTHER, SB_FLOWER, SB_FLOWER_SH, SB_LEAF, SB_LEAF_DK, SB_STEM, SB_STEM_LT } from '../../art/props/soba_art';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { ch2Open, hStage, lanternOn } from './common';
import { DF } from './dome';

export const SF = {
  h0: 'flag_sb_h0',
  /** 寄り道の 始まり（〔soba〕を 聞いた か、聞かずに そば畑に 入った）。 */
  start: 'flag_sb_start',
  /** 〔soba〕を 聞いた。 */
  told: 'flag_sb_told',
  wait: 'flag_sb_wait',
  /** はじめて そば畑に 入った（2 白い 花）。 */
  first: 'flag_sb_first',
  /** のぞいた 花（6つの ビット）。 */
  mi: 'flag_sb_mi',
  /** 立てた 札（3組の ビット）。 */
  fuda: 'flag_sb_fuda',
  /** 同じ 形を 組に した 回数。 */
  futago: 'flag_sb_futago',
  /** 3組 そろった。 */
  hana: 'flag_sb_hana',
  nafuda: 'flag_sb_nafuda',
  koya: 'flag_sb_koya',
  done: 'flag_sb_done',
  ine: 'flag_sb_ine',
  iite: 'flag_sb_iite',
  after: 'flag_sb_after',
} as const;

const VILLAGE = 'map_hoshimidai';
const FUMI = 'npc_hoshi_fumi';
/** 村の 竹垣の 戸（校庭の 北西の すみ、分校の 西の 壁ぎわ。(20,27) から 北向きに 調べる）。 */
export const SB_TO: [number, number] = [20, 26];
/** 6つの 花の 形（長 短 短 長 長 短：ちがう 形の となりは (0,1)・(2,3)・(4,5) だけ）。 */
export const SB_KINDS: ('naga' | 'mijika')[] = ['naga', 'mijika', 'mijika', 'naga', 'naga', 'mijika'];

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
export function sbOpen(): boolean {
  const s = hStage();
  return s >= 1 && s <= 2 && lanternOn() && !pgOn() && !flag('flag_ch2_boss_beaten');
}

const bits = (v: number): number => {
  let n = 0;
  for (let k = 0; k < 6; k++) if (v & (1 << k)) n++;
  return n;
};
export const sbMiN = (): number => bits(flag(SF.mi));
export const sbFudaN = (): number => bits(flag(SF.fuda) & 7);

/** その 人の 物語が 先（tetsubou.ts・mushigomu.ts の fumiStoryFirst と 同じ 見方）。 */
function fumiStoryFirst(): boolean {
  if (!flag('flag_ch2_yoriai')) return true;
  if (flag('flag_ch2_sawa_seki') && !flag('flag_seen_npc_hoshi_fumi_sawa')) return true;
  const s = hStage();
  const dome = lanternOn() && s >= 1 && s <= 2 && ch2Open();
  if (dome && (!flag(DF.key) || (flag(DF.n) >= 3 && !flag(DF.report)) || (flag(DF.report) > 0 && !flag(DF.after)))) return true;
  return false;
}

/** ほかの 寄り道で まつ先生が 集会所の 外に 出ている 間（鉄棒・自転車）は 前に 出ない。 */
const fumiBusy = (): boolean => flag('flag_tetsu_away') > 0 || flag('flag_mg_school') > 0;

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
      // the bamboo gate against the school's west wall (the 校庭's north-west corner); examined: the fade, into the field
      { t: 'prop', prop: 'prop_sb_to', x: SB_TO[0], y: SB_TO[1], opts: { side: 'out' } } as unknown as MapObj,
      { t: 'obj', id: 'obj_sb_to', x: SB_TO[0], y: SB_TO[1], face: 'up', script: 'obj_sb_to', solid: [0, 0, 1, 1] } as unknown as MapObj,
    );
    registerMap(def);
  }
}

// ================================================================ 見のがさない しるし

addMarkSource((f) => {
  if (!sbOpen() || flag(SF.start) || f.map.id === GAKKYUEN) return null;
  if (flag(`flag_seen_${FUMI}_h${hStage()}`) < 1 || fumiStoryFirst() || fumiBusy()) return null;
  const a = f.actorById(FUMI);
  return a && a.visible ? actorAnchor(a) : null;
});
addMarkSource((f) => {
  if (f.map.id !== VILLAGE || !sbOpen() || !flag(SF.told) || flag(SF.first)) return null;
  const foot = (SB_TO[1] + 1) * 16;
  return { x: SB_TO[0] * 16 + 8, y: foot - 30, foot };
});

// ================================================================ 大写し「そばの 花」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 列（のぞいた 花の 寄り）。 */
const RX = SX + 186;
const KEYS_Y = 98;
/** 6つの 花の x（灯りの 輪の 中）。 */
const FX = (i: number): number => SX + 22 + i * 28;

type Phase = 'idle' | 'pick';

/** 大きな 1字（札の 長・短。2倍で）。 */
const bigCache = new Map<string, HTMLCanvasElement>();
function bigChar(ch: string, color: string): HTMLCanvasElement {
  const key = `${ch}|${color}`;
  let c = bigCache.get(key);
  if (!c) {
    const [cv, ctx] = makeCanvas(16, 16);
    drawText(ctx, ch, 2, 1, { color });
    c = cv;
    bigCache.set(key, c);
  }
  return c;
}

export class SobaPanel implements Widget {
  modal = true;
  /** 大写し（engine/touch.ts：絵の 外の タッチも けってい）。 */
  closeup = true;
  /** やり方の カード（ui/closeup.ts。はじめての 1回）。 */
  howto: Howto = SB_UI.howto;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  /** QA：auto の 選ぶ 順。 */
  plan: number[] = [];
  phase: Phase = 'idle';
  cur = 0;
  /** 組の 1つ目に のぞいた 花。 */
  sel: number | null = null;
  /** 右に 大きく 見せる 花。 */
  zoom: number | null = null;
  /** 札が 立った とき（0..1 札が 立ちあがる）。 */
  pop = 0;
  popK = -1;
  picked = -1;
  hit = false;
  private autoT = 0;

  free(i: number): boolean {
    return i >= 0 && i < 6 && !(flag(SF.fuda) & (1 << (i >> 1)) && SB_KINDS[i] !== SB_KINDS[i ^ 1]);
  }

  private step(d: number): void {
    for (let n = 1; n < 6; n++) {
      const j = this.cur + d * n;
      if (j < 0 || j > 5) return;
      if (this.free(j)) {
        this.cur = j;
        se('se_cursor', { vol: 0.3 });
        return;
      }
    }
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.popK >= 0) this.pop = Math.min(1, this.pop + dt / 300);
    if (this.phase !== 'pick') return;
    if (this.auto) {
      this.autoT += dt;
      if (Math.floor(this.autoT / 260) === Math.floor((this.autoT - dt) / 260)) return;
      const want = this.plan[0] ?? [0, 1, 2, 3, 4, 5].find((i) => this.free(i)) ?? 0;
      if (this.cur !== want) this.step(want > this.cur ? 1 : -1);
      else {
        this.plan.shift();
        this.picked = this.cur;
        this.hit = true;
      }
      return;
    }
    if (input.pressed('left')) this.step(-1);
    else if (input.pressed('right')) this.step(1);
    else if (input.pressed('confirm')) {
      this.picked = this.cur;
      this.hit = true;
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
      const tw = g.measure(SB_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, SB_UI.place, { seed: 97 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  private drawScene(g: Gfx, oy: number): void {
    const W = RX - SX - 4;
    // the night field (blue-black, not black: the iPad outdoors), the tomato's warm pool in the middle
    g.rect(SX, oy, W, CH, '#1E2440');
    const gy = oy + 92;
    const cx = SX + W / 2;
    for (let r = 96; r > 0; r -= 12) g.alpha(0.07, () => g.circle(cx, gy - 34, r, '#F2A060'));
    g.alpha(0.18, () => g.circle(cx, gy - 34, 58, '#FFE6C0'));
    // the ground and the rows
    g.rect(SX, gy, W, CH - (gy - oy), '#3A2A2A');
    g.rect(SX, gy, W, 1, '#5A4034');
    for (let x = SX; x < SX + W; x += 6) g.px(x, gy + 5 + ((x / 6) % 3), '#5A4034');
    const fuda = flag(SF.fuda);
    const mi = flag(SF.mi);
    for (let i = 0; i < 6; i++) {
      const x = FX(i);
      const top = oy + 34 + ((i * 7) % 3) * 3;
      // the reddish stem, two heart leaves
      g.rect(x, top + 6, 2, gy - top - 6, SB_STEM);
      g.px(x, top + 10, SB_STEM_LT);
      for (const [lx, ly, s] of [[x - 6, gy - 22, -1], [x + 4, gy - 34, 1]] as const) {
        g.rect(lx, ly, 6, 3, SB_LEAF);
        g.rect(lx + 1, ly - 1, 4, 1, SB_LEAF);
        g.rect(lx + (s < 0 ? 4 : 0), ly + 3, 2, 1, SB_LEAF_DK);
      }
      // the flower head: a cluster of small white five-petal flowers
      for (const [fx, fy] of [[-5, 2], [4, 1], [0, -3], [-2, 5], [5, 6]] as const) {
        const px = x + fx;
        const py = top + fy;
        g.rect(px - 2, py - 1, 5, 3, SB_FLOWER_SH);
        g.rect(px - 1, py - 2, 3, 5, SB_FLOWER_SH);
        g.rect(px - 1, py - 1, 3, 3, SB_FLOWER);
        g.px(px, py, SB_ANTHER);
      }
      // once looked at: its letter under it (長 / 短 in its own colour, by shape too: a tall / a low mark)
      const kind = SB_KINDS[i];
      if (mi & (1 << i)) {
        const col = kind === 'naga' ? '#B8E870' : '#F0A060';
        g.text(kind === 'naga' ? SB_UI.naga : SB_UI.mijika, x - 5, gy + 3, { color: col });
      }
      // a tag stood for its pair
      const pk = i >> 1;
      if (fuda & (1 << pk) && SB_KINDS[i] !== SB_KINDS[i ^ 1]) {
        const rise = pk === this.popK ? ease.backOut(this.pop) : 1;
        const ty = Math.round(gy - 24 * rise);
        g.rect(x + 6, ty + 10, 1, gy - ty - 10, '#C8A06A');
        g.rect(x + 1, ty - 4, 12, 14, '#FBF3DC');
        g.frame(x + 1, ty - 4, 12, 14, '#8A5A3A');
        g.text(kind === 'naga' ? SB_UI.naga : SB_UI.mijika, x + 1, ty - 3, { color: '#2A2440' });
      }
    }
    // the chosen first of a pair (a ring), the cursor (a little arrow over it)
    if (this.sel !== null) g.ring(FX(this.sel) + 1, oy + 38, 12, '#FFE7A3');
    if (this.phase === 'pick') {
      const x = FX(this.cur) + 1;
      const b = Math.round(Math.sin(this.t / 160) * 1.5);
      g.rect(x - 3, oy + 14 + b, 7, 2, '#FFE7A3');
      g.rect(x - 2, oy + 16 + b, 5, 2, '#FFE7A3');
      g.rect(x - 1, oy + 18 + b, 3, 2, '#FFE7A3');
    }
    // the tomato itself, held low at the right (clear of the letters under the flowers)
    const tx = SX + W - 10;
    g.circle(tx, oy + CH - 8, 5, '#E23B2E');
    g.rect(tx - 1, oy + CH - 14, 2, 3, '#4E7A34');
  }

  /** 右の 列：のぞいた 花を 横から 大きく（めしべ 緑・おしべ 黄と 桃の 葯）、長さの 棒、札の 字。 */
  private drawSide(g: Gfx, oy: number): void {
    const x = RX - 4;
    const w = SX + CW - RX + 4;
    g.rect(x, oy, w, CH, '#262238');
    g.text(SB_UI.fuda(sbFudaN()), RX, oy + 3, { color: '#F4ECD8' });
    const i = this.zoom;
    const seen = i !== null && flag(SF.mi) & (1 << i);
    if (i === null || !seen) {
      g.text(SB_UI.hatena, RX + 40, oy + 40, { color: '#8A84A0' });
    } else {
      const naga = SB_KINDS[i] === 'naga';
      // the flower from the side, big: the white petals' cup, eight stamens, three styles from the middle
      const fx = RX + 34;
      const base = oy + 82;
      g.rect(fx - 24, base, 48, 6, SB_FLOWER_SH);
      g.rect(fx - 28, base - 4, 10, 6, SB_FLOWER);
      g.rect(fx + 18, base - 4, 10, 6, SB_FLOWER);
      g.rect(fx - 18, base - 2, 36, 4, SB_FLOWER);
      g.rect(fx - 4, base - 8, 9, 8, '#9AC860');
      const oshi = naga ? 26 : 46;
      const meshi = naga ? 50 : 20;
      for (const sx of [-16, -10, -4, 4, 10, 16]) {
        g.rect(fx + sx, base - oshi, 1, oshi - 2, '#F4E8A0');
        g.rect(fx + sx - 1, base - oshi - 3, 3, 4, SB_ANTHER);
      }
      for (const sx of [-3, 0, 3]) {
        g.rect(fx + sx, base - meshi, 2, meshi - 6, '#B8E870');
        g.rect(fx + sx - 1, base - meshi - 3, 4, 4, '#E8FFB0');
      }
      // the lengths side by side as bars (yellow the stamens, green the pistil)
      const bx = RX + 70;
      g.text(SB_UI.oshibe, bx, oy + 18, { color: '#F4C820' });
      g.rect(bx, oy + 33, naga ? 22 : 40, 5, '#F4C820');
      g.text(SB_UI.meshibe, bx, oy + 40, { color: '#B8E870' });
      g.rect(bx, oy + 55, naga ? 44 : 16, 5, '#B8E870');
      // the tag: the letter big (長 / 短), and the word
      const col = naga ? '#B8E870' : '#F0A060';
      g.rect(bx + 2, oy + 64, 24, 26, '#FBF3DC');
      g.frame(bx + 2, oy + 64, 24, 26, '#8A5A3A');
      g.img(bigChar(naga ? SB_UI.naga : SB_UI.mijika, '#2A2440'), bx + 1, oy + 63, { scale: 2 });
      g.rect(bx + 2, oy + 88, 24, 2, col);
    }
    const key = this.phase === 'pick' ? (this.sel !== null ? SB_UI.keys.pair : SB_UI.keys.look) : '';
    if (key) g.text(key, RX, oy + KEYS_Y, { color: '#FFE7A3' });
    markText(x, oy, w, CH);
  }
}

function* openPanel(p: SobaPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: SobaPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

function* waitPick(p: SobaPanel): Co<number> {
  p.hit = false;
  p.phase = 'pick';
  while (!p.hit) yield null;
  p.phase = 'idle';
  return p.picked;
}

let qaAuto = false;
/** QA：auto の とき、はじめに 同じ 形の 組を 1回 作る。 */
let qaTwin = false;

/** 3 大写し「そばの 花」。のぞいた 花・立てた 札は その場で flag に（やめても 残る）。 */
function* hanaGame(): Co {
  const p = new SobaPanel();
  p.auto = qaAuto;
  p.plan = qaTwin ? [1, 2, 0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5];
  p.cur = [0, 1, 2, 3, 4, 5].find((i) => p.free(i)) ?? 0;
  try {
    yield* openPanel(p);
    while (sbFudaN() < 3) {
      const i = yield* waitPick(p);
      p.zoom = i;
      if (!(flag(SF.mi) & (1 << i))) {
        setFlag(SF.mi, flag(SF.mi) | (1 << i));
        se('se_examine', { vol: 0.5 });
        yield 250;
        yield* say(SB_KINDS[i] === 'naga' ? T.SB_NAGA : T.SB_MIJIKA);
      }
      const s = p.sel;
      // the first of a pair (or a fresh start when the next one is not beside it; the same one again keeps it)
      if (s === null || s === i || Math.abs(s - i) !== 1) {
        p.sel = i;
        continue;
      }
      p.sel = null;
      const a = Math.min(s, i);
      if (SB_KINDS[a] === SB_KINDS[a + 1]) {
        const n = flag(SF.futago);
        setFlag(SF.futago, n + 1);
        se('se_cancel', { vol: 0.3 });
        yield* say(n === 0 ? T.SB_FUTAGO : T.SB_FUTAGO_2);
        continue;
      }
      const k = a >> 1;
      const firstPair = sbFudaN() === 0;
      setFlag(SF.fuda, flag(SF.fuda) | (1 << k));
      p.popK = k;
      p.pop = 0;
      se('se_item', { vol: 0.4 });
      yield 320;
      yield* say(firstPair ? T.SB_KUMI_FIRST : T.SB_KUMI);
      yield* runMsg(T.sbCount(sbFudaN()));
      p.cur = [0, 1, 2, 3, 4, 5].find((j) => p.free(j)) ?? p.cur;
    }
    yield 300;
  } finally {
    yield* closePanel(p);
  }
  setFlag(SF.hana, 1);
  field()?.refreshPresence?.();
  yield* say(T.SB_SOROTTA);
}

// ================================================================ 台本

/** 村の 竹垣の 戸（調べる。開いて いれば 暗転で そば畑へ）。 */
registerScript('obj_sb_to', function* (): Co {
  const f = field();
  if (!f) return;
  se('se_examine');
  if (!sbOpen()) {
    yield* say(hStage() === 0 || !lanternOn() ? T.SB_TO_DARK : T.SB_TO_SHUT);
    return;
  }
  if (flag(SF.done)) yield* say(T.SB_TO_AFTER);
  yield* f.warpCo(GAKKYUEN, SB_TO_AT[0], SB_TO_AT[1] - 1, 'up', 'se_door', VILLAGE);
});

/** そば畑の 南の 戸（中から 調べる：村へ）。 */
registerScript('obj_sb_to_in', function* (): Co {
  const f = field();
  if (!f) return;
  yield* f.warpCo(VILLAGE, SB_TO[0], SB_TO[1] + 1, 'down', 'se_door', GAKKYUEN);
});

/** 2 白い 花（入ると すぐ。1回）。 */
registerScript('evt_sb_enter', function* (): Co {
  if (!sbOpen() || flag(SF.first)) return;
  yield 300;
  setFlag(SF.start, 1);
  setFlag(SF.first, 1);
  yield* say(T.SB_ENTER);
});

registerScript('obj_sb_soba', function* (): Co {
  se('se_examine');
  if (!sbOpen() || !lanternOn()) {
    yield* say(T.SB_SOBA_DARK);
    return;
  }
  if (flag(SF.hana)) {
    yield* say(T.SB_SOBA_AFTER);
    return;
  }
  if (!flag(SF.first)) {
    setFlag(SF.start, 1);
    setFlag(SF.first, 1);
  }
  yield* hanaGame();
});

registerScript('obj_sb_kui', function* (): Co {
  se('se_examine');
  yield* say(T.SB_NAFUDA);
  if (!flag(SF.nafuda) && kanenariHere()) {
    setFlag(SF.nafuda, 1);
    yield* say(T.SB_NAFUDA_KN);
  }
});

registerScript('obj_sb_touban', function* (): Co {
  se('se_examine');
  yield* say(T.SB_TOUBAN);
});

/** 道具小屋（かくし：1回目は グソっ君の 1行）。 */
registerScript('obj_sb_koya', function* (): Co {
  se('se_examine');
  yield* say(T.SB_KOYA);
  if (!flag(SF.koya) && kanenariHere()) {
    setFlag(SF.koya, 1);
    yield* say(T.SB_KOYA_KN);
  }
});

registerScript('obj_sb_sugi', function* (): Co {
  se('se_examine');
  yield* say(T.SB_SUGI);
});

/** 5 ちがう 花が、となりに → ごほうび。 */
function* houkoku(): Co {
  if (!flag(SF.told)) yield* say(T.SB_MAE);
  yield* say(T.SB_HOUKOKU);
  if (kanenariHere()) yield* say(T.SB_YORU);
  if (hStage() === 2) yield* say(T.SB_SEIZA);
  if (flag('flag_hn_done') && !flag(SF.ine)) {
    setFlag(SF.ine, 1);
    yield* say(T.SB_INE);
  }
  if (!flag(SF.futago) && !flag(SF.iite)) {
    setFlag(SF.iite, 1);
    yield* say(T.SB_IITE);
  }
  setFlag(SF.done, 1);
  addMp(2);
  se('se_item');
  yield* runMsg(T.SB_REWARD);
}

/** 〔soba〕。 */
function* start(): Co {
  setFlag(SF.start, 1);
  setFlag(SF.told, 1);
  yield* say(T.SB_START);
}

/** まつ先生の いつもの 会話の 回数（今の 段階）。 */
const fumiTalks = (): number => flag(`flag_seen_${FUMI}_h${hStage()}`);

wrap(FUMI, function* (_ctx, orig): Co {
  const ready = sbOpen() && !fumiStoryFirst() && !fumiBusy();
  if (ready && flag(SF.hana) && !flag(SF.done)) {
    yield* houkoku();
    return;
  }
  if (ready && flag(SF.done) && !flag(SF.after)) {
    setFlag(SF.after, 1);
    yield* say(T.SB_FUMI_AFTER);
    return;
  }
  if (ready && flag(SF.told) && !flag(SF.first) && !flag(SF.wait)) {
    setFlag(SF.wait, 1);
    yield* say(T.SB_WAIT);
    return;
  }
  const before = fumiTalks();
  yield* orig();
  if (pgOn() || !ch2Open() || flag('flag_ch2_boss_beaten')) return;
  // 段階0：いつもの 会話〔h0_2〕の あとに 1ページだけ（1回）
  if (hStage() === 0) {
    if (flag(`flag_seen_${FUMI}_h0_2`) && !flag(SF.h0)) {
      setFlag(SF.h0, 1);
      yield* say(T.SB_H0);
    }
    return;
  }
  if (!sbOpen() || flag(SF.start) || fumiBusy()) return;
  // the second ordinary talk at this stage (another errand's turn did not count up the talks)
  if (before >= 1 && fumiTalks() > before) yield* start();
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/** まつ先生の 立ち位置（段階）。 */
function fumiFront(): [string, number, number, string] {
  if (hStage() === 2) return [VILLAGE, 47, 3, 'up'];
  return ['map_hoshi_school', 9, 4, 'up'];
}

/**
 * QA: __game.cmd.soba(step = 'fumi', stage = 'h1', auto = false, twin = false)（'h1' トマトの 灯り・'h2' よびごえ・'h0' 灯りの 前）
 *   'h0'      段階0、まつ先生の 前（〔h0_2〕の あとに 1ページ）
 *   'fumi'    いつもの 会話を 1回 聞いた あと、まつ先生の 前（話すと〔soba〕）
 *   'to'      〔soba〕の あと、村の 竹垣の 戸の 前 (20,27) 上向き（調べると そば畑）
 *   'hata'    〔soba〕の あと、そば畑の 入口 (8,8) 上向き（入った ときの 会話は まだ）
 *   'hana'    入った あと、畝の 通路 (7,4) 上向き（調べると 大写し）
 *   'koya'    入った あと、道具小屋の 前 (3,8) 左向き
 *   'kui'     入った あと、名札の 杭の 前 (12,8) 右向き
 *   'houkoku' 3組 そろった あと、まつ先生の 前
 *   'done'    すんだ あと、村の 竹垣の 戸の 前
 *   twin：auto の とき、はじめに 同じ 形の 組を 1回 作る
 */
if (import.meta.env.DEV) {
  registerDebug('soba', (step = 'fumi', stg = 'h1', auto = false, twin = false) => {
    const want = stg === 'h0' || step === 'h0' ? 0 : stg === 'h2' ? 2 : 1;
    const inCh2 = (field()?.map.id ?? '').startsWith('map_hoshi');
    if (!inCh2 || hStage() !== want || flag('flag_ch2_boss_beaten')) cmd().jump?.(want === 0 ? 'ch2:house' : want === 2 ? 'ch2:hill' : 'ch2:houki', true);
    for (const id of Object.values(SF)) setFlag(id, 0);
    qaAuto = !!auto;
    qaTwin = !!twin;
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    const s = flag('flag_ch2_stage');
    if (step === 'h0') {
      setFlag(`flag_seen_${FUMI}_h0_2`, 0);
      setFlag(`flag_seen_${FUMI}_h0`, 0);
      return go(...fumiFront());
    }
    setFlag(`flag_seen_${FUMI}_h${s}`, Math.max(1, flag(`flag_seen_${FUMI}_h${s}`)));
    if (s === 1) setFlag(`flag_seen_${FUMI}_h1_1`, 1);
    setFlag('flag_ch2_marine_snow', 1);
    // (the observatory's key and its reminder come first at her: given, for the QA)
    setFlag(DF.key, 1);
    setFlag(DF.wait, 1);
    if (step === 'fumi') return go(...fumiFront());
    setFlag(SF.start, 1);
    setFlag(SF.told, 1);
    if (step === 'to') return go(VILLAGE, SB_TO[0], SB_TO[1] + 1, 'up');
    if (step === 'hata') return go(GAKKYUEN, 8, 8, 'up');
    setFlag(SF.first, 1);
    if (step === 'hana') return go(GAKKYUEN, 7, 4, 'up');
    if (step === 'koya') return go(GAKKYUEN, 3, 8, 'left');
    if (step === 'kui') return go(GAKKYUEN, 12, 8, 'right');
    setFlag(SF.mi, 63);
    setFlag(SF.fuda, 7);
    setFlag(SF.hana, 1);
    if (step === 'houkoku') return go(...fumiFront());
    setFlag(SF.done, 1);
    return go(VILLAGE, SB_TO[0], SB_TO[1] + 1, 'up');
  });

  registerDebug('sbAuto', (v: unknown = true, twin: unknown = false) => {
    qaAuto = !!v;
    qaTwin = !!twin;
    return qaAuto;
  });

  registerDebug('sbState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(SF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof SobaPanel) as SobaPanel | undefined;
    const f = field();
    return {
      flags,
      open: sbOpen(),
      mi: sbMiN(),
      fuda: sbFudaN(),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      panel: p ? { cur: p.cur, sel: p.sel, zoom: p.zoom, phase: p.phase } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines; the panel's words in their room. */
export function sbTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足', '平和', '3人', '海', '水族館', 'いただきます', 'ほどよい', 'しゃべらん', 'おかわり', '焼き芋 食うか', 'ダンゴムシ', 'ツガオ', '学級園', 'おはだっちょ', 'もと', 'アスカ'];
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
  walkT('sb', T.SB_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of Object.values(SB_UI.keys)) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  if (measure(SB_UI.fuda(3)) > col) bad.push('右の 列: 札 が はみ出す');
  if (RX + 70 + Math.max(measure(SB_UI.oshibe), measure(SB_UI.meshibe), 44) > SX + CW) bad.push('右の 列: 棒 が はみ出す');
  if (KEYS_Y + 14 > CH) bad.push(`keys: bottom ${KEYS_Y + 14} > ${CH}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('sbText', () => sbTextCheck());
