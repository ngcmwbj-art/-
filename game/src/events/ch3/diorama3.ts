// 荷台から 見た 村（第3章の クリア前、段階3。げむきか 10/29 の 案3、2026-10-29 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_diorama3.ts、模型の 上の 小さな 物は art/props/dm_art.ts（prop_c3_aq_diorama の over・glow）、
// みました帳の ページは ui/menu/book_diorama3.ts。新しい 地図・新しい 人・新しい 戸は ない（旧水族館の 戸は ふやさない）。
//
//   S17 の あと（flag_ch3_diorama_done）から S20 で ホールに 入るまで（flag_ch3_tsugao1）。クリア後と S20 から 先は 足さない
//   （S25 で 来た 人たちが ジオラマを 見る 場面の 文は 変えない）。
//   ・ジオラマの 部屋の 星見台の 模型 obj_c3_diorama_hoshi (14,4)：S17 の あと、模型の 上に「！」（addMarkSource）。
//     調べると 地の文と グソっ君（寝方 ちゃうで）→〔mokei〕flag_dm_start → 大写し「模型の 寄り」MokeiPanel。
//     始まった あとは、星見台・海ぞいの 町の 模型を 調べると 大写しへ（星見台は 牛から、海ぞいの 町は 灯台から）。
//   ・大写し：←→ で 4つの 所（牛・耕うん機・灯台・看板）、けってい。場面の 下の 帯に グソっ君の ヒント 1行
//     （何が おかしいかを 言い切らずに 目を 向けさせる。会議 10-29）。まちがいの 所は 大きく 描く（スマホ縦でも 見分ける）。
//       牛：うしろ足から 寝かけた 人形 → 前の ひざを 折った 形（flag_dm_ushi）
//       耕うん機：鍵を ぬく（flag_dm_kagi）→ 箱の 底の 紐の 部品を つける（flag_dm_himo）
//       灯台：豆電球の スイッチを 切る（flag_dm_toudai）
//       看板『かもめ』：まちがいで ない（見るだけ。flag_dm_kanban）
//     3つ 直すと 大写しを 閉じて、グソっ君「ヒロスケにも 見せたいな」（S19 の あとなら「言いそびれたな」と ページ）。
//     もどるで やめると、直した 所は 残る（もう一度 模型を 調べると 続きから。前置きは もとから ない：INTRO_SKIP 'already'）。
//   ・夕鳴町の 模型 obj_c3_diorama_yunari：始まった あと 1回、まちがいの ない 町（flag_dm_yunari）。
//   ・水槽の うらの ヒロスケ aqura_hiro（S19 の 前まで）：3つ 直した あと（flag_dm_report の 前）、頭の 上に「！」。
//     話すと〔荷台から 見た 村〕→ 朱肉 +2、みました帳③の すみ（flag_dm_done）。
//     焼き芋〔imo〕（imo.ts）と ぶつけない：直した あとの 1回目は こちらだけ（焼き芋は その 次の 回から。
//     同じ 回に 2つ 始めない）。焼き芋が 先に すんで いても、こちらは そのまま 始まる。
//   ・S19 の あと（ヒロスケは もう うらに いない）：直した あと グソっ君「……ヒロスケに、言いそびれたな。」（1回）で ページ。
//     S19 の 前に 直して、話さずに S19 を 越えた ときは、館の 部屋に 入った とき（ホールと えさの 部屋の ほか）に 同じ 1回。
//   ・かくし：紐の 番（flag_hm_done）→ 紐を つけた あと グソっ君（1回 flag_dm_hm）／灯台の 中へ 入って いる
//     （flag_ch3_toudai_open）→ 灯台の あと グソっ君（1回 flag_dm_teru）／牛を 直す 前に けっていを 押さずに 5秒 →
//     グソっ君が 模型の 横で 前から 寝て みせる → しゅんの ツッコミの 書き文字「でかい！」（1回 flag_dm_dekai）。
//
// QA：__game.cmd.diorama3(step, auto)、dmState()、dmText()

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
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { actorAnchor, addMarkSource, objAnchor } from '../../world/marks';
import { getMapDef } from '../../world/maps';
import { pgOn } from '../../world/postgame';
import type { ExamineObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import { pickRows, type Howto, type TouchPick } from '../../ui/closeup';
import { kakimoji } from '../../battle/art/stamps';
import * as T from '../../data/text/c3_diorama3';
import { DM_UI, FIX_SPOTS, SPOT_ORDER, type Spot } from '../../data/text/c3_diorama3';
import { addMp, grace } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { addToMap, inCh3, say3 } from './common';

export const DF = {
  start: 'flag_dm_start',
  ushi: 'flag_dm_ushi',
  kagi: 'flag_dm_kagi',
  himo: 'flag_dm_himo',
  toudai: 'flag_dm_toudai',
  kanban: 'flag_dm_kanban',
  yunari: 'flag_dm_yunari',
  report: 'flag_dm_report',
  sobire: 'flag_dm_sobire',
  hm: 'flag_dm_hm',
  teru: 'flag_dm_teru',
  dekai: 'flag_dm_dekai',
  done: 'flag_dm_done',
} as const;

const DIORAMA = 'map_c3_aq_diorama';
const URA = 'map_c3_aq_ura';
const HIRO = 'aqura_hiro';
/** 「言いそびれた」を 言える 部屋（館の 中。ホールは S20、えさの 部屋は S19 の 場面なので 入れない）。 */
const SOBIRE_MAPS = ['map_c3_aq_iriguchi', 'map_c3_aq_kairo', DIORAMA, 'map_c3_aq_shinkai', URA];

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

/** 遊べる 間：段階3、S17 の あと、S20 の 前（クリア後は 足さない）。 */
export function dmOpen(): boolean {
  return (
    inCh3() &&
    !pgOn() &&
    flag('flag_ch3_stage') === 3 &&
    flag('flag_ch3_aq_enter') > 0 &&
    flag('flag_ch3_diorama_done') > 0 &&
    !flag('flag_ch3_tsugao1') &&
    !flag('flag_ch3_clear')
  );
}

/** ヒロスケが 水槽の うらに いる 間（aq_ura.ts の hiroHere と 同じ：S19 の 決着の 前）。 */
function hiroHere(): boolean {
  return dmOpen() && !flag('flag_ch3_esa_done') && field()?.map.id === URA;
}

/** 直した（耕うん機は 紐を つけて 直した）。 */
export function dmFixed(s: Spot): boolean {
  if (s === 'kagi') return flag(DF.himo) > 0;
  if (s === 'kanban') return flag(DF.kanban) > 0;
  return flag(DF[s]) > 0;
}
export function dmFixedN(): number {
  return FIX_SPOTS.filter(dmFixed).length;
}
export function dmSeenN(): number {
  return (flag(DF.kanban) ? 1 : 0) + (flag(DF.yunari) ? 1 : 0);
}
const allFixed = (): boolean => dmFixedN() >= FIX_SPOTS.length;

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

// ================================================================ 見のがさない しるし

/** 星見台の 模型の 上（S17 の あと、始まる 前）。 */
addMarkSource((f) => {
  if (f.map.id !== DIORAMA || !dmOpen() || flag(DF.start) || flag(DF.done)) return null;
  const o = getMapDef(DIORAMA)?.objects.find((x) => x.t === 'obj' && x.id === 'obj_c3_diorama_hoshi') as ExamineObj | undefined;
  return o ? objAnchor(f, o) : null;
});

/** 水槽の うらの ヒロスケの 頭の 上（3つ 直した あと、話す 前）。 */
addMarkSource((f) => {
  if (f.map.id !== URA || !hiroHere() || !allFixed() || flag(DF.report) || flag(DF.done)) return null;
  const a = f.actorById(HIRO);
  return a && a.visible ? actorAnchor(a) : null;
});

// ================================================================ 大写し「模型の 寄り」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 列（数・所・キー）。 */
const RX = SX + 206;
const SW = RX - SX - 4;
/** 場面の 下の ヒントの 帯。 */
const HINT_H = 18;
/** 右の 列の 行。 */
const ROW0 = 2;
const ROW_SPOT = 16;
const ROW_STEP = 15;
const ROW_KEYS = 80;
/** 会話の あと、決定が きくまで（ms）。 */
const ARM_MS = 400;
/** かくし「でかい！」：牛の 所で 何も 押さずに（ms）。 */
const DEKAI_MS = 5000;

const COAT = '#2B2A30';
const COAT_LT = '#45434C';
const COAT_DK = '#1B1733';
const INK = '#3A3F48';

type Kagi = 'kagi' | 'nuita' | 'himo';

export class MokeiPanel implements Widget {
  modal = true;
  closeup = true;
  howto: Howto = T.DM_HOWTO;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  active = false;
  /** えらんで いる 所（SPOT_ORDER の 番号）。 */
  sel = 0;
  /** けっていで えらんだ 所（台本が 読む）。 */
  chosen: Spot | null = null;
  /** 「でかい！」の 合図（台本が 読む）。 */
  dekaiEvt = false;
  /** グソっ君が 模型の 横で 寝て みせる 絵（0〜1）と、書き文字の 残り（ms）。 */
  guso = 0;
  kaki = 0;
  /** 直す 絵の うごき（ms）。 */
  private anim = 0;
  private armT = 0;
  private idleT = 0;
  private wasActive = false;
  private autoT = 0;

  quittable(): boolean {
    return this.active;
  }

  /** 指で さわって 選ぶ（改善会議 2026-10-30 の1、ui/closeup.ts）：右の 名前の 行、左の 場面は 今の 所。 */
  touchPick: TouchPick = {
    spots: () =>
      this.active && !this.auto && this.open >= 1
        ? [
            ...pickRows(SPOT_ORDER.length, (i) => [RX - 2, SY + ROW_SPOT + i * ROW_STEP - 1, SX + CW - RX - 2, ROW_STEP - 1]),
            { i: this.sel, x: SX, y: SY, w: SW, h: CH - HINT_H },
          ]
        : null,
    cursor: () => this.sel,
    moveTo: (i) => {
      if (i === this.sel) return;
      this.sel = i;
      this.idleT = 0;
      se('se_cursor', { vol: 0.4 });
    },
  };

  spot(): Spot {
    return SPOT_ORDER[this.sel];
  }

  kick(): void {
    this.anim = 420;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    this.anim = Math.max(0, this.anim - dt);
    this.kaki = Math.max(0, this.kaki - dt);
    if (this.active !== this.wasActive) {
      this.wasActive = this.active;
      this.armT = 0;
      this.idleT = 0;
    }
    if (!this.active) return;
    this.armT += dt;
    const armed = this.armT > ARM_MS;
    let ok = false;
    let lr = 0;
    if (this.auto) {
      this.autoT += dt;
      if (this.autoT > 320) {
        this.autoT = 0;
        // (QA: the first one not done yet, the sign last)
        const want = Math.max(0, SPOT_ORDER.findIndex((s) => !dmFixed(s)));
        if (this.sel !== want) lr = want > this.sel ? 1 : -1;
        else ok = true;
      }
    } else {
      ok = armed && input.pressed('confirm');
      lr = (input.pressed('right') ? 1 : 0) - (input.pressed('left') ? 1 : 0);
    }
    if (lr || ok) this.idleT = 0;
    else this.idleT += dt;
    if (lr) {
      const n = Math.max(0, Math.min(SPOT_ORDER.length - 1, this.sel + lr));
      if (n !== this.sel) {
        this.sel = n;
        se('se_cursor', { vol: 0.4 });
      }
    }
    if (ok) {
      this.chosen = this.spot();
      se('se_examine', { vol: 0.4, pitch: 1.2 });
      return;
    }
    // かくし：牛の 所で、直す 前に 5秒 何も 押さない（グソっ君が いる とき、1回）
    if (this.spot() === 'ushi' && !flag(DF.ushi) && !flag(DF.dekai) && knWith() && this.idleT > DEKAI_MS) {
      this.idleT = 0;
      this.dekaiEvt = true;
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
        g.clip(SX, oy, SW, CH, () => this.drawScene(g, oy));
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        this.drawSide(g, oy);
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(DM_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, DM_UI.place, { seed: 103 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  /** 今の 所の けっていで する こと。 */
  act(): string {
    const s = this.spot();
    if (s === 'kagi') return flag(DF.himo) ? DM_UI.act.done : flag(DF.kagi) ? DM_UI.act.himo : DM_UI.act.kagi;
    if (s === 'kanban') return DM_UI.act.kanban;
    return dmFixed(s) ? DM_UI.act.done : DM_UI.act[s];
  }

  /** 場面の 下の 帯の 1行（直す 前は ヒント、直した あとは ひとこと）。 */
  hint(): string {
    const s = this.spot();
    if (s === 'kagi' && flag(DF.kagi) && !flag(DF.himo)) return DM_UI.hint.himo;
    if (dmFixed(s)) return DM_UI.ok1[s];
    return DM_UI.hint[s];
  }

  private drawScene(g: Gfx, oy: number): void {
    const s = this.spot();
    const cx = SX + Math.round(SW / 2);
    const gy = oy + CH - HINT_H - 10;
    // a little bounce when it is put right
    const lift = this.anim > 0 ? Math.round(Math.sin(((420 - this.anim) / 420) * Math.PI) * 3) : 0;
    if (s === 'ushi' || s === 'kagi') {
      // 星見台's model: the painted grass of the terrace, the barn's straw, the mountain road's dirt
      g.rect(SX, oy, SW, CH, '#4A7A42');
      for (let i = 0; i < 70; i++) g.rect(SX + ((i * 53) % SW), oy + ((i * 29) % (CH - HINT_H)), 2, 1, i % 3 ? '#3E6A38' : '#5A8A4A');
      g.rect(SX, gy - 2, SW, 8, s === 'ushi' ? '#C8B070' : '#A8946A');
      g.rect(SX, gy + 6, SW, 2, s === 'ushi' ? '#A89050' : '#8A7A54');
      if (s === 'ushi') {
        // the barn's back wall and its posts (a modeller's balsa)
        g.rect(SX, oy, SW, 22, '#7A5A4A');
        for (let x = SX + 10; x < SX + SW; x += 34) g.rect(x, oy, 4, 22, '#5A4236');
        g.rect(SX, oy + 22, SW, 2, '#4A3428');
        cow(g, cx - 18, gy - lift, flag(DF.ushi) ? 'mae' : 'ushiro');
        if (this.guso > 0) gusoLie(g, cx + 50, gy, this.guso);
      } else {
        // the mountain road going up behind
        for (let y = oy; y < gy - 2; y++) {
          const k = (y - oy) / (gy - 2 - oy);
          g.rect(SX + SW - 62 + Math.round(k * 6), y, 22 + Math.round(k * 30), 1, '#A8946A');
        }
        tiller(g, cx - 14, gy - lift, flag(DF.himo) ? 'himo' : flag(DF.kagi) ? 'nuita' : 'kagi');
      }
    } else {
      // 海ぞいの 町's model at noon: the pale sky, the still sea, the breakwater
      g.rect(SX, oy, SW, CH, '#9ACCE8');
      g.rect(SX, oy + 44, SW, CH - 44, '#3A7EA8');
      for (let i = 0; i < 6; i++) g.rect(SX + 8 + i * 34, oy + 52 + (i % 2) * 6, 14, 1, '#5A9EC8');
      if (s === 'toudai') {
        g.rect(SX, gy - 4, SW, CH, '#9AA0A8');
        g.rect(SX, gy - 4, SW, 2, '#B8BEC6');
        lighthouse(g, cx - 20, gy - 4, !flag(DF.toudai), this.t);
      } else {
        g.rect(SX, gy - 4, SW, CH, '#8E95A6');
        shopSign(g, cx - 10, gy - 4);
      }
    }
    // the model's name, top right (which table this is)
    const town = DM_UI.mokei[s];
    const w = measure(town);
    g.rect(SX + SW - w - 10, oy + 3, w + 6, 14, '#F4ECD8');
    g.text(town, SX + SW - w - 7, oy + 3, { color: INK });
    // the done mark on the scene (a shape: a ring, not a colour)
    if (dmFixed(s)) {
      const mx = SX + SW - 18;
      const my = oy + 30;
      g.ring(mx, my, 7, '#E84E3C');
      g.ring(mx, my, 6, '#E84E3C');
    }
    // グソっ君's hint: one line in the band at the bottom (what to look at, never the answer)
    const hy = oy + CH - HINT_H;
    g.rect(SX, hy, SW, HINT_H, '#1E1A2A', 0.88);
    if (knWith()) {
      // his little face (the shell's colour, two eyes)
      g.circle(SX + 9, hy + 9, 6, '#D49A5C');
      g.rect(SX + 4, hy + 5, 10, 2, '#EBBF86');
      g.px(SX + 7, hy + 9, '#2A2440');
      g.px(SX + 11, hy + 9, '#2A2440');
    }
    g.text(this.hint(), SX + 19, hy + 2, { color: '#FFE7A3' });
    // the lettering of しゅん's retort (かくし)
    if (this.kaki > 0) {
      const img = kakimoji(DM_UI.dekai, true, 11, 2);
      const a = Math.min(1, this.kaki / 300);
      g.alpha(a, () => g.img(img, SX + Math.round((SW - img.width) / 2), oy + 6));
    }
  }

  private drawSide(g: Gfx, oy: number): void {
    g.text(DM_UI.naoshita(dmFixedN()), RX, oy + ROW0, { color: dmFixedN() >= 3 ? '#FFE7A3' : '#F4ECD8' });
    SPOT_ORDER.forEach((s, i) => {
      const y = oy + ROW_SPOT + i * ROW_STEP;
      const on = i === this.sel;
      if (on) for (let r = 0; r < 4; r++) g.rect(RX + r, y + 3 + r, 1, 9 - r * 2, '#FFE7A3');
      g.text(DM_UI.namae[s], RX + 8, y, { color: on ? '#FFE7A3' : '#C8C0D8' });
      if (dmFixed(s)) {
        // a tick after its name (a shape)
        const kx = RX + 12 + measure(DM_UI.namae[s]);
        g.line(kx, y + 7, kx + 2, y + 10, '#F4ECD8');
        g.line(kx + 2, y + 10, kx + 7, y + 3, '#F4ECD8');
      }
    });
    if (!this.active) return;
    // (←→ is the howto card's and the triangle's: the column keeps the key and what it does)
    g.text(DM_UI.ok, RX, oy + ROW_KEYS, { color: '#8A84A0' });
    g.text(this.act(), RX + 8, oy + ROW_KEYS + 14, { color: '#FFE7A3' });
  }
}

// ---------------------------------------------------------------- 絵（大写しの 中。大きく：スマホ縦でも 形で 見分ける）

/**
 * 牛の 人形（横から、頭が 左。黒い 毛の 肥育の 牛、耳に 黄色い 耳標）。
 * ushiro：うしろ足から 寝かけた（まちがい。おしりが 下がり、前足は のびた まま）。
 * mae：前の ひざから 寝かけた（正しい。前足を 折って ひざを つき、うしろ足は 立った まま）。
 */
function cow(g: Gfx, cx: number, gy: number, pose: 'ushiro' | 'mae'): void {
  const rx = 26;
  const ry = 11;
  const cy0 = gy - 29;
  const tilt = pose === 'ushiro' ? 1 : -1;
  const yc = (dx: number) => cy0 + 6 + Math.round(tilt * 9 * (dx / rx));
  const hh = (dx: number) => Math.max(1, Math.round(ry * Math.pow(Math.max(0, 1 - (dx / rx) ** 2), 0.3)));
  // the shadow on the straw
  g.rect(cx - rx - 4, gy, rx * 2 + 10, 2, '#8A7040', 0.6);
  // the legs first (the body over their tops)
  const legs: [number, boolean][] = [
    [-19, true],
    [-12, true],
    [13, false],
    [20, false],
  ];
  for (const [dx, front] of legs) {
    const x = cx + dx;
    const yb = yc(dx) + hh(dx) - 2;
    const folded = pose === 'ushiro' ? !front : front;
    if (folded) {
      // folded: down to the knee on the ground, the lower leg tucked along it
      g.rect(x, yb, 5, Math.max(1, gy - 4 - yb), COAT);
      g.rect(front ? x : x - 7, gy - 5, 12, 5, COAT);
      g.rect(front ? x + 10 : x - 7, gy - 2, 2, 2, '#3A3F48');
    } else {
      g.rect(x, yb, 5, gy - yb, COAT);
      g.rect(x + 1, yb, 1, gy - yb - 3, COAT_LT);
      g.rect(x, gy - 3, 5, 3, '#3A3F48');
    }
  }
  // the body: a long barrel, lit along the back, darkest underneath
  for (let dx = -rx; dx <= rx; dx++) {
    const h = hh(dx);
    const y = yc(dx);
    g.rect(cx + dx, y - h, 1, h * 2, COAT);
    g.rect(cx + dx, y - h, 1, 2, COAT_LT);
    g.rect(cx + dx, y + h - 3, 1, 3, COAT_DK);
  }
  // the tail at the rear
  const ty = yc(rx) - 6;
  g.line(cx + rx + 1, ty, cx + rx + 3, ty + 14, COAT);
  g.rect(cx + rx + 2, ty + 14, 3, 4, COAT_DK);
  // the neck and head at the front (left)
  const ny = yc(-rx);
  const hx = cx - rx - 12;
  const hy = ny - 10 + (pose === 'mae' ? 2 : 0);
  g.rect(cx - rx - 4, ny - 8, 8, 14, COAT);
  g.rect(hx, hy, 13, 11, COAT);
  g.rect(hx, hy, 13, 2, COAT_LT);
  g.rect(hx - 3, hy + 5, 5, 6, '#3A3F48');
  g.px(hx - 2, hy + 7, '#9AA0A8');
  g.rect(hx + 4, hy + 3, 2, 2, '#0B0B14');
  // the ear with its yellow tag
  g.rect(hx + 10, hy - 3, 5, 3, COAT);
  g.rect(hx + 12, hy, 3, 3, '#FFD23F');
}

/**
 * 歩く 型の 耕うん機（横から、前が 左）：車輪、赤い エンジン、うしろへ のびる ハンドル。
 * kagi：エンジンの 横に 小さな 黄色い 鍵（まちがい）／nuita：鍵を ぬいて、箱の 底の 紐の 部品が 横に／
 * himo：エンジンの 横に リコイルの 丸い 箱と、白い 紐と 取っ手（正しい）。
 */
function tiller(g: Gfx, cx: number, gy: number, st: Kagi): void {
  g.rect(cx - 36, gy, 96, 2, '#6A5A3A', 0.6);
  // the wheel (lugs round it)
  const wx = cx - 10;
  const wy = gy - 14;
  g.circle(wx, wy, 14, '#2A2A30');
  g.circle(wx, wy, 8, '#5A5A62');
  g.circle(wx, wy, 3, '#8A8A90');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.rect(wx + Math.round(Math.cos(a) * 14) - 1, wy + Math.round(Math.sin(a) * 14) - 1, 3, 3, '#1A1A20');
  }
  // the gear column, the engine and its tank
  g.rect(wx - 4, gy - 38, 9, 18, '#8A8A90');
  g.rect(cx - 40, gy - 60, 42, 24, '#C8452E');
  g.rect(cx - 40, gy - 60, 42, 3, '#E86A4A');
  g.rect(cx - 40, gy - 39, 42, 3, '#8A2E22');
  g.rect(cx - 32, gy - 70, 26, 10, '#C8452E');
  g.rect(cx - 32, gy - 70, 26, 2, '#E86A4A');
  g.rect(cx - 22, gy - 74, 6, 4, '#3A3A40');
  // the handlebars going back and up to the right, the grips
  for (let k = 0; k < 3; k++) g.line(cx + 2, gy - 48 + k, cx + 46, gy - 68 + k, '#6A6A72');
  g.rect(cx + 42, gy - 72, 12, 5, '#2A2A30');
  if (st === 'kagi') {
    // a little key stuck in the engine's side (a big yellow head with its hole, the blade going in)
    g.rect(cx - 16, gy - 50, 10, 4, '#C8A030');
    g.circle(cx + 1, gy - 48, 8, '#F4D040');
    g.ring(cx + 1, gy - 48, 8, '#A88020');
    g.circle(cx + 1, gy - 48, 2, '#C8452E');
    g.ring(cx + 10, gy - 40, 5, '#B8B8C0');
  } else {
    // the recoil starter's round case on the engine's side
    g.circle(cx - 20, gy - 48, 9, '#4A4A52');
    g.ring(cx - 20, gy - 48, 9, '#2A2A30');
    g.circle(cx - 20, gy - 48, 3, '#8A8A90');
  }
  if (st === 'nuita') {
    // the key, out, on the ground; the cord part from the box's bottom beside it (a coil and its T-grip)
    g.circle(cx + 22, gy - 5, 5, '#F4D040');
    g.ring(cx + 22, gy - 5, 5, '#A88020');
    g.rect(cx + 27, gy - 6, 8, 3, '#C8A030');
    g.ring(cx + 46, gy - 6, 5, '#F4F1E8');
    g.ring(cx + 46, gy - 6, 3, '#F4F1E8');
    g.rect(cx + 38, gy - 16, 14, 4, '#2A2A30');
    g.line(cx + 45, gy - 12, cx + 46, gy - 11, '#F4F1E8');
  } else if (st === 'himo') {
    // the white cord out of the case and its T-grip (pulled to start: the old walking type has no key)
    for (const o of [0, 1]) g.line(cx - 29, gy - 48 + o, cx - 46, gy - 42 + o, '#F4F1E8');
    g.rect(cx - 50, gy - 49, 4, 14, '#2A2A30');
  }
}

/** 防波堤の 白い 灯台（昼の 模型）。on：豆電球が 光る（まちがい）／off：消えて いる（正しい）。 */
function lighthouse(g: Gfx, cx: number, gy: number, on: boolean, t: number): void {
  const top = gy - 46;
  for (let y = top; y < gy; y++) {
    const k = (y - top) / (gy - top);
    const hw = Math.round(6 + k * 5);
    g.rect(cx - hw, y, hw * 2, 1, '#F4F1E8');
    g.rect(cx + hw - 3, y, 3, 1, '#D8D2C4');
  }
  g.rect(cx - 3, gy - 12, 6, 12, '#6A7186');
  // the gallery, the lantern's glass and its red cap
  g.rect(cx - 10, top - 3, 20, 3, '#3A3F48');
  g.rect(cx - 6, top - 13, 12, 10, '#9AB8C8');
  g.frame(cx - 6, top - 13, 12, 10, '#3A3F48');
  for (let r = 0; r < 6; r++) g.rect(cx - 7 + r, top - 19 + r, 14 - r * 2 + 0, 1, '#A8452E');
  g.rect(cx - 1, top - 22, 2, 3, '#3A3F48');
  // the bulb
  if (on) {
    const a = 0.75 + 0.2 * Math.sin(t / 260);
    g.alpha(0.35 * a, () => g.circle(cx, top - 8, 18, '#FFF2A0'));
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      for (const o of [0, 1]) g.line(cx + o + Math.round(Math.cos(ang) * 10), top - 8 + Math.round(Math.sin(ang) * 10), cx + o + Math.round(Math.cos(ang) * 20), top - 8 + Math.round(Math.sin(ang) * 20), '#FFE27A');
    }
    g.circle(cx, top - 8, 5, '#FFF6C0');
  } else {
    g.circle(cx, top - 8, 4, '#7A7E86');
    g.rect(cx - 2, top - 10, 2, 1, '#B8BEC6');
  }
}

/** 食堂かもめの 看板『かもめ』（『か』が ある：模型は『か』が 落ちる 前の 町）と、赤い のれん。 */
function shopSign(g: Gfx, cx: number, gy: number): void {
  g.rect(cx - 60, gy - 70, 120, 70, '#E8E4D8');
  g.rect(cx - 60, gy - 70, 120, 4, '#A8452E');
  // the board
  g.rect(cx - 40, gy - 62, 80, 22, '#F8F4E8');
  g.frame(cx - 40, gy - 62, 80, 22, INK);
  const l = DM_UI.kanbanJi;
  const w = measure(l);
  g.text(l, cx - Math.round(w / 2), gy - 58, { color: INK });
  // the red noren under it, and the door's dark
  g.rect(cx - 26, gy - 34, 52, 34, '#2A2A34');
  g.rect(cx - 30, gy - 36, 60, 16, '#C8452E');
  for (let i = 1; i < 3; i++) g.rect(cx - 30 + i * 20, gy - 30, 1, 10, '#8A2E22');
  g.rect(cx - 6, gy - 32, 12, 2, '#F4F1E8');
}

/** グソっ君が 模型の 横で、前から 寝て みせる（かくし）。k：出てくる 具合 0〜1。 */
function gusoLie(g: Gfx, cx: number, gy: number, k: number): void {
  const off = Math.round((1 - k) * 60);
  const x = cx + off;
  const rx = 30;
  const ry = 13;
  const cy = gy - 15;
  for (let dx = -rx; dx <= rx; dx++) {
    // front (left) down like the cow, the back end up
    const y = cy + Math.round(-4 * (dx / rx)) + 2;
    const h = Math.max(1, Math.round(ry * Math.sqrt(Math.max(0, 1 - (dx / rx) ** 2))));
    g.rect(x + dx, y - h, 1, h * 2, '#D49A5C');
    g.rect(x + dx, y - h, 1, 2, '#EBBF86');
    g.rect(x + dx, y + h - 2, 1, 2, '#A8693A');
  }
  // the shell's bands
  for (let i = -3; i <= 3; i++) {
    const bx = x + i * 8;
    const y = cy + Math.round(-4 * (i * 8 / rx)) + 2;
    g.rect(bx, y - 10, 1, 18, '#A8693A');
  }
  // the eye and the feelers at the front
  g.rect(x - rx + 6, cy + 1, 3, 3, '#2A2440');
  g.px(x - rx + 6, cy + 1, '#FFF6D8');
  g.line(x - rx + 2, cy + 2, x - rx - 10, cy - 8, '#A8693A');
  g.line(x - rx + 3, cy + 4, x - rx - 12, cy - 2, '#A8693A');
}

function* openPanel(p: MokeiPanel): Co {
  game.ui.push(p);
  se('se_examine', { vol: 0.4, pitch: 0.9 });
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: MokeiPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;

// ================================================================ 台本

/** 1つの 所を けってい。 */
function* choose(p: MokeiPanel, s: Spot): Co {
  if (s === 'kanban') {
    const first = !flag(DF.kanban);
    setFlag(DF.kanban, 1);
    yield* say(first ? T.DM_KANBAN : T.DM_NAOSHITA.kanban);
    return;
  }
  if (dmFixed(s)) {
    yield* say3(T.DM_NAOSHITA[s]);
    return;
  }
  if (s === 'ushi') {
    setFlag(DF.ushi, 1);
    p.guso = 0;
    p.kick();
    se('se_cursor', { vol: 0.4, pitch: 0.7 });
    yield 450;
    yield* say3(T.DM_USHI);
  } else if (s === 'kagi') {
    if (!flag(DF.kagi)) {
      setFlag(DF.kagi, 1);
      p.kick();
      se('se_c3_aq_key', { vol: 0.35 });
      yield 450;
      yield* say3(T.DM_KAGI);
      return;
    }
    setFlag(DF.himo, 1);
    p.kick();
    se('se_cursor', { vol: 0.4, pitch: 0.9 });
    yield 450;
    yield* say(T.DM_HIMO);
    if (flag('flag_hm_done') && !flag(DF.hm) && knWith()) {
      setFlag(DF.hm, 1);
      yield* say3(T.DM_HIMO_HM);
    }
  } else if (s === 'toudai') {
    setFlag(DF.toudai, 1);
    p.kick();
    se('se_cursor', { vol: 0.35, pitch: 0.6 });
    yield 450;
    yield* say3(T.DM_TOUDAI);
    if (flag('flag_ch3_toudai_open') && !flag(DF.teru) && knWith()) {
      setFlag(DF.teru, 1);
      yield* say3(T.DM_TOUDAI_TERU);
    }
  }
}

/** かくし「でかい！」：グソっ君が 模型の 横で 前から 寝て みせる（1回）。 */
function* dekai(p: MokeiPanel): Co {
  setFlag(DF.dekai, 1);
  yield* animate(500, (x) => (p.guso = x), ease.cubicOut);
  p.guso = 1;
  yield 500;
  p.kaki = 1600;
  se('se_hit_pashi', { vol: 0.5 });
  yield 1600;
  yield* animate(400, (x) => (p.guso = 1 - x), ease.linear);
  p.guso = 0;
}

/** 2 大写し「模型の 寄り」（from：はじめに えらぶ 所）。3つ 直すと 閉じる。 */
function* mokei(from: Spot): Co {
  const p = new MokeiPanel();
  p.auto = qaAuto;
  p.sel = SPOT_ORDER.indexOf(dmFixed(from) ? (SPOT_ORDER.find((s) => !dmFixed(s)) ?? from) : from);
  try {
    yield* openPanel(p);
    while (!allFixed()) {
      p.chosen = null;
      p.dekaiEvt = false;
      p.active = true;
      while (!p.chosen && !p.dekaiEvt) yield null;
      p.active = false;
      if (p.dekaiEvt) {
        yield* dekai(p);
        continue;
      }
      yield 200;
      yield* choose(p, p.chosen!);
    }
    yield 400;
  } finally {
    yield* closePanel(p);
  }
  if (flag('flag_ch3_esa_done')) yield* sobire();
  else if (!flag(DF.report)) yield* say(knWith() ? T.DM_ZENBU : T.DM_ZENBU_SOLO);
}

/** 5 ごほうび。 */
function* reward(): Co {
  setFlag(DF.done, 1);
  addMp(2);
  se('se_item');
  yield* say3(T.DM_REWARD);
}

/** S19 の あと（ヒロスケは もう うらに いない）：グソっ君の 1行と ページ（1回）。 */
function* sobire(): Co {
  if (flag(DF.done) || flag(DF.report) || !allFixed()) return;
  setFlag(DF.sobire, 1);
  yield* say(T.DM_SOBIRE);
  yield* reward();
  grace();
}

/** 1〔mokei〕：星見台の 模型を、S17 の あと もう一度。 */
function* start(): Co {
  setFlag(DF.start, 1);
  se('se_examine');
  if (knWith()) {
    // (第2章の「前から 寝る」を 見て いなければ、2ページ目は「マサルが 言うとった」)
    yield* say3(flag('flag_nr_done') ? T.DM_A : `${T.DM_A.split('\n/\n')[0]}\n${T.DM_A_NR}`);
  } else yield* say3(T.DM_A_SOLO);
  yield* mokei('ushi');
}

/** 星見台・海ぞいの 町の 模型。 */
for (const [town, from] of [
  ['hoshi', 'ushi'],
  ['umi', 'toudai'],
] as const)
  wrap(`obj_c3_diorama_${town}`, function* (_ctx, orig): Co {
    if (!dmOpen() || flag(DF.done)) {
      yield* orig();
      return;
    }
    if (!flag(DF.start)) {
      if (town === 'hoshi') yield* start();
      else yield* orig();
      return;
    }
    if (allFixed()) {
      // (fixed, not yet told: the doll lights as before; after S19 グソっ君's line and the page)
      yield* orig();
      if (flag('flag_ch3_esa_done')) yield* sobire();
      return;
    }
    se('se_examine');
    yield* mokei(from);
  });

/** 3 まちがいの ない 町（夕鳴町の 模型。始まった あと 1回）。 */
wrap('obj_c3_diorama_yunari', function* (_ctx, orig): Co {
  if (!dmOpen() || !flag(DF.start) || flag(DF.yunari)) {
    yield* orig();
    return;
  }
  se('se_examine');
  setFlag(DF.yunari, 1);
  yield* say3(knWith() ? T.DM_YUNARI : T.DM_YUNARI_SOLO);
});

/** 4 荷台から 見た 村（水槽の うらの ヒロスケ）。 */
function* hiroDm(): Co {
  const f = field();
  const h = f?.actorById(HIRO);
  if (h) {
    h.data.scripted = true;
    h.dir = f!.player.x < h.x - 4 ? 'left' : 'down';
  }
  try {
    yield* say(T.DM_HIRO);
    // his back to them (the face not shown)
    if (h) h.dir = 'up';
    yield 500;
    yield* say3(T.DM_HIRO_B);
    setFlag(DF.report, 1);
    yield* reward();
  } finally {
    if (h) {
      h.dir = 'up';
      delete h.data.scripted;
    }
    grace();
  }
}

/** 直した あと、まだ 話して いない（この 回は こちらだけ。焼き芋は 次の 回から）。 */
const dmReport = (): boolean => hiroHere() && allFixed() && !flag(DF.report) && !flag(DF.done);

wrap(HIRO, function* (_ctx, orig): Co {
  if (dmReport()) {
    yield* hiroDm();
    return;
  }
  yield* orig();
});

wrap('obj_aqura_t', function* (ctx, orig): Co {
  if (ctx.source === 'obj_aqura_daisha' && dmReport()) {
    yield* hiroDm();
    return;
  }
  yield* orig();
});

/** S19 の 前に 直して、話さずに S19 を 越えた：館の 部屋に 入った とき 1回。 */
registerScript('evt_dm_sobire', function* (): Co {
  if (!dmOpen() || !flag('flag_ch3_esa_done') || !allFixed() || flag(DF.report) || flag(DF.done)) return;
  yield 500;
  yield* sobire();
});
for (const m of SOBIRE_MAPS) addToMap(m, [], ['evt_dm_sobire']);

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.diorama3(step = 'start', auto = false)（段階3、S17 の あと）
 *   'start'   ジオラマの 部屋、星見台の 模型の 前 (16,7) 上向き（「！」。調べると〔mokei〕→ 大写し）
 *   'umi'     始まった あと、海ぞいの 町の 模型の 前 (11,11) 上向き（大写しは 灯台から）
 *   'yunari'  始まった あと、夕鳴町の 模型の 前 (5,7) 上向き
 *   'hiro'    3つ 直した あと、水槽の うらの ヒロスケの 前 (21,3) 上向き（「！」）
 *   'hiroimo' 同じ、焼き芋の 1回目（flag_im_talk）を 済ませた あと（話すと こちらが 先、次に 焼き芋）
 *   'sobire'  S19 の あと、牛と 耕うん機を 直して、海ぞいの 町の 模型の 前（灯台を 直すと「言いそびれた」）
 *   'sobire2' S19 の 前に 3つ 直して 話さずに S19 を 越えた、回廊から ジオラマの 部屋へ 入る
 *   'kakushi' かくし 3つの 条件（紐の 番・灯台の 中・「でかい！」）で 星見台の 模型の 前
 *   'done'    すんだ あと、星見台の 模型の 前
 */
if (import.meta.env.DEV) {
  registerDebug('diorama3', (step = 'start', auto = false) => {
    cmd().aqura?.('hiro');
    for (const id of Object.values(DF)) setFlag(id, 0);
    qaAuto = !!auto;
    setFlag('flag_ch3_kairo_done', 1);
    setFlag('flag_c3_diorama_in', 1);
    setFlag('flag_ch3_mafiya', 1);
    setFlag('flag_ch3_diorama_done', 1);
    setFlag('flag_ch3_esa_done', 0);
    setFlag('flag_im_talk', 0);
    setFlag('flag_hm_done', step === 'kakushi' ? 1 : 0);
    setFlag('flag_ch3_toudai_open', step === 'kakushi' ? 1 : 0);
    setFlag('flag_nr_done', step === 'kakushi' ? 1 : 0);
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (step === 'start' || step === 'kakushi') return go(DIORAMA, 16, 7, 'up');
    setFlag(DF.start, 1);
    if (step === 'umi') return go(DIORAMA, 11, 11, 'up');
    if (step === 'yunari') return go(DIORAMA, 5, 7, 'up');
    setFlag(DF.ushi, 1);
    setFlag(DF.kagi, 1);
    setFlag(DF.himo, 1);
    if (step === 'sobire') {
      setFlag(DF.toudai, 0);
      setFlag('flag_ch3_esa_done', 1);
      return go(DIORAMA, 11, 11, 'up');
    }
    setFlag(DF.toudai, 1);
    if (step === 'sobire2') {
      setFlag('flag_ch3_esa_done', 1);
      return go('map_c3_aq_kairo', 37, 3, 'right');
    }
    if (step === 'hiroimo') setFlag('flag_im_talk', 1);
    if (step === 'hiro' || step === 'hiroimo') return go(URA, 21, 3, 'up');
    setFlag(DF.report, 1);
    setFlag(DF.done, 1);
    return go(DIORAMA, 16, 7, 'up');
  });

  registerDebug('dmState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(DF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof MokeiPanel) as MokeiPanel | undefined;
    const f = field();
    return {
      flags,
      open: dmOpen(),
      fixed: dmFixedN(),
      seen: dmSeenN(),
      im: { talk: flag('flag_im_talk'), start: flag('flag_im_start'), done: flag('flag_im_done') },
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      panel: p ? { spot: p.spot(), sel: p.sel, active: p.active, act: p.act(), hint: p.hint() } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no 天丼; the names without さん in the narration; the panel's labels fit. */
export function dmTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', '焼き芋 食うか', 'わはは', '暗くて しめった', 'おかわり', 'もう 1杯', '置いていか', 'いただきます', '%'];
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
        if (t.startsWith('@') || t === '/' || !t) {
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
  walkT('dm', T.DM_TEXTS);
  // the hint band: one line in the scene (after his face)
  for (const l of [...Object.values(DM_UI.hint), ...Object.values(DM_UI.ok1)]) if (19 + measure(l) > SW - 2) bad.push(`ヒント: ${19 + measure(l)}px > ${SW - 2}: ${l}`);
  // the right column
  const col = SX + CW - RX - 2;
  for (const l of [DM_UI.naoshita(3), DM_UI.ok]) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  for (const l of Object.values(DM_UI.act)) if (8 + measure(l) > col) bad.push(`右の 列: ${8 + measure(l)}px > ${col}: ${l}`);
  for (const l of Object.values(DM_UI.namae)) if (12 + measure(l) + 8 > col) bad.push(`右の 列: ${l}`);
  if (ROW_SPOT + ROW_STEP * SPOT_ORDER.length > ROW_KEYS) bad.push('右の 列: 所が キーに かかる');
  if (ROW_KEYS + 14 + 14 > CH) bad.push(`右の 列: 下 ${ROW_KEYS + 14 + 14} > ${CH}`);
  for (const l of Object.values(DM_UI.mokei)) if (measure(l) + 10 > SW / 2) bad.push(`模型の 札: ${l}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('dmText', () => dmTextCheck());
