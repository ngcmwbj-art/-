// 背中から、1回で（第3章の クリア前、段階1。げむきか 10/24 の 案1、2026-10-24 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_nukegara.ts、絵は art/props/nukegara_art.ts、みました帳の ページは ui/menu/book_nukegara.ts。
// 新しい 地図・新しい 人は ない（空き地とその近くの 物に ぬけがらを 足す）。
//
//   段階1（正午）、S06 の あと（flag_ch3_kids）から S12 の ナリオサメの 前まで（S07〜S09 の どの 途中でも）。
//   ・空き地の 虫かごの 子 npc_c3_kid_b (9,4)：いつもの 会話の あと（flag_seen_npc_c3_kid_c1）、2回目に〔semi〕
//     （flag_ng_start）。〔mizukiri〕は (6,6) の npc_c3_kid_a なので ぶつからない。
//   ・ぬけがら 4つ（どの 順でも。ひろうと 大写し「手の ひら」TeNoHiraPanel。地図に 小さな 茶色い 点）：
//       obj_c3_semi_1 伏せた 船の 腹 (4,4)＝ツクツクボウシ、obj_c3_semi_2 タイヤの 山 (15,6)＝ニイニイゼミ（低い 所）、
//       obj_c3_semi_3 松の 幹 (18,3)＝アブラゼミ、④ サイレン塔の 掲示板 obj_c3_siren_board (26,3) の 脚＝ミンミンゼミ
//       （掲示板の 今の 文を 読んだ あと、もう 1回 調べると。物は 足さず 掲示板の 台本を 包む。「！」は addMarkSource）。
//     ひろった 物は flag_ng_got_<種>。はじめての 1回だけ グソっ君「背中、きれいに 割れとる。」（flag_ng_ware）。
//   ・2つ ひろった あと 1回：うしろ 半分（flag_ng_ushiro。グソっ君が いる とき。空き地〈x 20 まで〉に いる とき、
//     ほかは 次に 空き地の 子に 話した とき）。第1章の 公園の ぬけがら（flag_seen_look_obj_semi_shell）→ 1行（flag_ng_kouen）。
//   ・松の 根もとの 穴 obj_c3_semi_ana (17,4)：〔semi〕の あと 1回、夕方を 待つ 穴（flag_ng_ana）。
//   ・4つ そろえて 虫かごの 子 → 名人の 判定（大写しに 大きさの 順に 4つ、1つずつ 指さす）→ 朱肉 +2、
//     みました帳③の すみ（flag_ng_done）。
//   ・かくし：4つめの 前に みかんの 木（flag_ng_mikan）。判定の あと もう 1回 虫かごの 子（flag_ng_mitai）。
//   ・段階2（S13〜S14）：すんで いれば、防波堤の 子どもたちの そばで ツクツクボウシが 1匹 ふえる（amb_c3_semi の
//     'tsuku'）。子どもに 話すと 1回（flag_ng_c2）。S15 から 先と クリア後は 足さない。
//
// QA：__game.cmd.nukegara(step)、ngState()、ngText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { ambientEvent } from '../../world/audio';
import { fxAt, registerWorldFx } from '../../world/fx';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field, type FieldScene } from '../../world/field';
import { addMarkSource, objAnchor } from '../../world/marks';
import { pgOn } from '../../world/postgame';
import type { ExamineObj, MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/c3_nukegara';
import { NG_UI } from '../../data/text/c3_nukegara';
import { drawLoupe, drawSemi, drawSemiDot, SEMI_LOOK, SEMI_ORDER, type SemiKind } from '../../art/props/nukegara_art';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { addToMap, c3Stage, inCh3, say3 } from './common';

export const NF = {
  start: 'flag_ng_start',
  ware: 'flag_ng_ware',
  ushiro: 'flag_ng_ushiro',
  kouen: 'flag_ng_kouen',
  ana: 'flag_ng_ana',
  mikan: 'flag_ng_mikan',
  done: 'flag_ng_done',
  mitai: 'flag_ng_mitai',
  c2: 'flag_ng_c2',
} as const;

export const gotF = (k: SemiKind): string => `flag_ng_got_${k}`;

const UMIZOI = 'map_umizoi';
const KID = 'npc_c3_kid_b';
const BOARD = 'obj_c3_siren_board';

interface Shell {
  kind: SemiKind;
  id: string;
  /** 調べる マス。 */
  at: [number, number];
  /** 地図の 点：世界の x、その 物の 南の 面の 線 foot、地面からの 高さ h。 */
  dot: { x: number; foot: number; h: number };
}

/** 4つの 置き場所（④ は 掲示板の 脚：物は 掲示板の まま）。 */
export const SHELLS: Shell[] = [
  { kind: 'tsuku', id: 'obj_c3_semi_1', at: [4, 4], dot: { x: 4 * 16 + 10, foot: 5 * 16 - 3, h: 1 } },
  { kind: 'niinii', id: 'obj_c3_semi_2', at: [15, 6], dot: { x: 15 * 16 + 4, foot: 7 * 16 - 3, h: 2 } },
  { kind: 'abura', id: 'obj_c3_semi_3', at: [18, 3], dot: { x: 18 * 16 + 9, foot: 4 * 16 - 2, h: 12 } },
  { kind: 'minmin', id: 'obj_c3_semi_4', at: [26, 3], dot: { x: 26 * 16 + 16, foot: 4 * 16 - 2, h: 4 } },
];
const ANA: [number, number] = [17, 4];
/** みかん畑の 木（地図の prop_c3_mikan。たんかんは 自分の 物が ある）。 */
const MIKAN_X = [47, 50, 53, 59, 62];

function knWith(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** 寄り道が 開いている（段階1）：S06 の あと、ナリオサメの 前。 */
export function ngOpen(): boolean {
  return inCh3() && !pgOn() && c3Stage() === 1 && flag('flag_ch3_kids') > 0 && !flag('flag_ch3_nariosame_beaten');
}

/** 探している あいだ（〔semi〕の あと、判定の 前）。 */
function hunting(): boolean {
  return ngOpen() && flag(NF.start) > 0 && !flag(NF.done);
}

export function ngCount(): number {
  return SHELLS.filter((s) => flag(gotF(s.kind))).length;
}

/** 話す 人の いない 行を 抜く（グソっ君、地図に いない 子ども）。 */
function trim(text: string): string {
  const f = field();
  const drop = (who: string) => (who === 'npc_kanenari' && !knWith()) || (who.startsWith('npc_c3_kid') && !f?.actorById(who));
  return text
    .split(/\n(?=@)/)
    .filter((p) => !drop(p.split('\n')[0].slice(1).trim()))
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

// ================================================================ 地図の 物

const OBJ = (o: Record<string, unknown>): MapObj => ({ t: 'obj', ...o }) as unknown as MapObj;
addToMap(UMIZOI, [
  // the three shells on things (the fourth is on the notice board's leg: its own script is wrapped below)
  ...SHELLS.slice(0, 3).map((s) => OBJ({ id: s.id, x: s.at[0], y: s.at[1], face: 'up', script: 'obj_c3_semi', cond: { when: () => hunting() && !flag(gotF(s.kind)) } })),
  // the pine's roots: two small round holes, the soil beside them faintly raised
  OBJ({ id: 'obj_c3_semi_ana', x: ANA[0], y: ANA[1], flat: true, script: 'obj_c3_semi_ana', cond: { when: ngOpen } }),
  // the orchard's trees (stage 1; their usual words, and once a shell under a leaf while the hunt is on)
  ...MIKAN_X.flatMap((x) => [
    OBJ({ id: `obj_c3_semi_mikan_${x}`, x, y: 3, w: 2, h: 2, script: 'obj_c3_semi_mikan', cond: { stage: 1 } }),
    OBJ({ id: `obj_c3_semi_mikan_${x}_2`, x, y: 6, w: 2, h: 2, script: 'obj_c3_semi_mikan', cond: { stage: 1 } }),
  ]),
]);

// the notice board's leg: a 「！」 while its shell is there (the board itself is an ordinary thing with no glint)
addMarkSource((f) => {
  if (f.map.id !== UMIZOI || !hunting() || flag(gotF('minmin'))) return null;
  const o = f.map.objects.find((x) => x.id === BOARD) as ExamineObj | undefined;
  return o ? objAnchor(f, o) : null;
});

// ================================================================ 地図の ぬけがら（小さな 茶色い 点）と 穴

/** しゅん・グソっ君が 前に 立って いる（点は 体の うしろに 隠れる）。 */
function hidden(f: FieldScene, x: number, foot: number): boolean {
  const who = [f.player, f.follower].filter((a) => a && a.visible);
  return who.some((a) => Math.abs(a!.x - x) < 10 && a!.y >= foot && a!.y < foot + 22);
}

let c2T = 8000;

registerWorldFx({
  map: UMIZOI,
  anchored: true,
  update(f, dt) {
    // 12:01, near the children on the breakwater: one more ツクツクボウシ now and then
    if (!(inCh3() && c3Stage() === 2 && flag(NF.done))) return;
    const d = Math.hypot(f.player.x / 16 - 35, f.player.y / 16 - 32);
    if (d > 10) return;
    c2T -= dt;
    if (c2T > 0) return;
    c2T = 22000 + Math.random() * 14000;
    ambientEvent('amb_c3_semi', 'tsuku', Math.max(-0.6, Math.min(0.6, (35 * 16 - f.player.x) / -200)));
  },
  draw(f, g, cx, cy, layer) {
    if (layer !== 'ground' || !inCh3() || c3Stage() !== 1 || !flag('flag_ch3_kids')) return;
    for (const s of SHELLS) {
      if (flag(gotF(s.kind)) || flag(NF.done)) continue;
      if (hidden(f, s.dot.x, s.dot.foot)) continue;
      const [sx, sy] = fxAt(f, s.dot.x, s.dot.foot - s.dot.h, cx, cy, s.dot.foot);
      drawSemiDot(g, s.kind, Math.round(sx), Math.round(sy));
    }
    if (!ngOpen()) return;
    const p = f.player;
    if (p.tileX === ANA[0] && p.tileY === ANA[1]) return;
    const hole = (wx: number, wy: number, r: number) => {
      const [x, y] = fxAt(f, wx, wy, cx, cy);
      g.rect(Math.round(x) - r, Math.round(y), r * 2, 2, '#3A2A1A');
      g.rect(Math.round(x) - r + 1, Math.round(y) - 1, r * 2 - 2, 1, '#5A4430');
    };
    hole(ANA[0] * 16 + 5, ANA[1] * 16 + 9, 2);
    hole(ANA[0] * 16 + 10, ANA[1] * 16 + 12, 2);
    const [mx, my] = fxAt(f, ANA[0] * 16 + 11, ANA[1] * 16 + 6, cx, cy);
    g.rect(Math.round(mx) - 3, Math.round(my), 6, 1, '#B89A72');
    g.rect(Math.round(mx) - 2, Math.round(my) - 1, 4, 1, '#C8AE88');
  },
});

// ================================================================ 大写し「手の ひら」（しゅんの 手の 上の ぬけがら。真上からの 日ざし）

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** ルーペの 半径。 */
const LR = 22;
/** ルーペの 中心の x（右の はし）。 */
const LX = SX + CW - 30;
/** 判定の 4つの 並び（左の はし・あいだ・大きさ）。 */
const ROW_X = SX + 32;
const ROW_DX = 44;
const ROW_SC = 1.1;

export class TeNoHiraPanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  open = 0;
  /** のって いる ぬけがら（1つ、または 判定の 4つ）。 */
  kinds: SemiKind[];
  /** 判定で 指さして いる 物（-1 なし）。 */
  point = -1;

  constructor(kinds: SemiKind[]) {
    this.kinds = kinds;
  }

  update(dt: number): void {
    this.t += dt;
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
      g.clip(SX, oy, CW, CH, () => this.drawScene(g, oy));
      const tw = g.measure(NG_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, NG_UI.place, { seed: 41 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  /** 4つの 時の 並び（大きさの 順）、1つの 時は まん中。 */
  private places(): [number, number][] {
    if (this.kinds.length === 1) return [[SX + 120, SY + 58]];
    return this.kinds.map((_, i) => [ROW_X + i * ROW_DX, SY + 60]);
  }

  private drawScene(g: Gfx, oy: number): void {
    const off = oy - SY;
    // the noon ground far below (the open ground's grass, bleached), the palm from below
    g.rect(SX, oy, CW, CH, '#B8C890');
    for (let i = 0; i < 40; i++) g.rect(SX + ((i * 53) % CW), oy + ((i * 29) % CH), 3, 1, '#A4B87C');
    const palm = (x: number, y: number, rx: number, ry: number, c: string) => {
      for (let d = -ry; d <= ry; d++) {
        const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (d / (ry + 0.5)) ** 2)));
        g.rect(x - hw, y + d, hw * 2 + 1, 1, c);
      }
    };
    const one = this.kinds.length === 1;
    const pw = one ? 84 : 132;
    const pcx = one ? SX + 120 : SX + 117;
    const ptop = oy + 30;
    // the four fingers (rounded, their tips at the top edge), the thumb from the left, then the palm over their roots
    for (let i = 0; i < 4; i++) {
      const fx = Math.round(pcx - pw * 0.6 + i * pw * 0.4);
      palm(fx, ptop - 4, Math.round(pw * 0.16), 30, '#C88A62');
      palm(fx, ptop - 5, Math.round(pw * 0.16) - 1, 29, '#E8B890');
      g.rect(fx - 2, ptop - 30, 4, 2, '#F0C8A4');
    }
    palm(Math.round(pcx - pw - 4), oy + 84, 14, 24, '#C88A62');
    palm(Math.round(pcx - pw - 4), oy + 83, 13, 23, '#E0A880');
    palm(pcx, ptop + 46, pw + 1, 47, '#C88A62');
    palm(pcx, ptop + 46, pw, 46, '#E8B890');
    palm(pcx + 4, ptop + 50, pw - 16, 34, '#ECC09C');
    // the palm's lines
    g.line(pcx - pw + 22, ptop + 22, pcx + pw - 26, ptop + 16, '#D09A72');
    g.line(pcx - pw + 26, ptop + 48, pcx + 6, ptop + 34, '#D09A72');
    const sc = one ? 1.6 : ROW_SC;
    this.places().forEach(([x, y], i) => {
      const kind = this.kinds[i];
      const yy = y + off;
      const L = SEMI_LOOK[kind];
      // the shadow straight down (noon), then the shell
      palm(x, yy + Math.round((L.len * sc) / 2) - 1, Math.round(L.wid * sc * 0.45), 2, '#C8946C');
      if (this.point === i) {
        const ph = 0.5 + 0.5 * Math.sin(this.t / 260);
        g.alpha(0.5 + 0.4 * ph, () => {
          g.rect(x - 16, yy + Math.round((L.len * sc) / 2) + 4, 32, 2, '#C25A72');
        });
      }
      drawSemi(g, kind, x, yy, sc);
    });
    // the loupe: the antennae (アブラと ミンミンは ここで しか 分からない)。右の はしに 縦に、名前は 左
    const loupes = this.kinds.filter((k): k is 'abura' | 'minmin' => k === 'abura' || k === 'minmin');
    loupes.forEach((k, i) => {
      const ly = one ? oy + 56 : oy + 28 + i * 54;
      const on = one || this.point < 0 || this.kinds[this.point] === k;
      g.alpha(on ? 1 : 0.5, () => {
        drawLoupe(g, k, LX, ly, LR);
        const nm = NG_UI.short[k];
        const w = g.measure(nm);
        g.rect(LX - LR - 9 - w, ly - 8, w + 6, 15, '#2A2236');
        g.text(nm, LX - LR - 6 - w, ly - 7, { color: '#F4ECD8' });
      });
    });
    if (one && loupes.length) {
      const w = g.measure(NG_UI.loupe);
      g.rect(Math.round(LX - w / 2) - 3, oy + 12, w + 6, 15, '#2A2236');
      g.text(NG_UI.loupe, Math.round(LX - w / 2), oy + 13, { color: '#FFE7A3' });
    }
  }
}

function* openPanel(p: TeNoHiraPanel): Co {
  game.ui.push(p);
  se('se_examine', { vol: 0.4, pitch: 1.3 });
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: TeNoHiraPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

// ================================================================ 台本

/** 3 うしろ 半分（2つ ひろった あと、1回。グソっ君が いる とき）。 */
function* ushiro(): Co {
  if (flag(NF.ushiro) || ngCount() < 2 || !knWith()) return;
  setFlag(NF.ushiro, 1);
  yield* say(T.NG_USHIRO);
  if (flag('flag_seen_look_obj_semi_shell') && !flag(NF.kouen)) {
    setFlag(NF.kouen, 1);
    yield* say(T.NG_KOUEN);
  }
}

/** 空き地の 中（うしろ 半分は 子どもの 近くで）。 */
function nearKids(): boolean {
  const f = field();
  return !!f && f.map.id === UMIZOI && f.player.tileX <= 20 && f.player.tileY <= 9;
}

/** 2 ひろう（どの 物からでも）。 */
function* pick(kind: SemiKind): Co {
  se('se_examine');
  const pair = kind === 'abura' ? 'minmin' : kind === 'minmin' ? 'abura' : null;
  const second = pair !== null && flag(gotF(pair)) > 0;
  setFlag(gotF(kind), 1);
  const p = new TeNoHiraPanel([kind]);
  try {
    yield* openPanel(p);
    se('se_item', { vol: 0.35 });
    yield* say(T.NG_GOT[second ? `${kind}2` : kind]);
    yield* say3(T.ngCount(ngCount()));
    if (!flag(NF.ware) && knWith()) {
      setFlag(NF.ware, 1);
      yield* say(T.NG_WARE);
    }
  } finally {
    yield* closePanel(p);
  }
  if (nearKids()) yield* ushiro();
}

registerScript('obj_c3_semi', function* (ctx: ScriptCtx): Co {
  const s = SHELLS.find((x) => x.id === String(ctx.source));
  if (!s || !hunting() || flag(gotF(s.kind))) return;
  yield* pick(s.kind);
});

/** ④ 掲示板の 脚：今の 文を 読んだ あと、もう 1回 調べると。 */
wrap(BOARD, function* (_ctx, orig): Co {
  if (hunting() && !flag(gotF('minmin')) && flag('flag_seen_' + BOARD) > 0) {
    se('se_examine');
    yield* say3(T.NG_BOARD_LOOK);
    yield* pick('minmin');
    return;
  }
  yield* orig();
});

/** 4 夕方を 待つ 穴。 */
registerScript('obj_c3_semi_ana', function* (): Co {
  se('se_examine');
  if (flag(NF.start) && !flag(NF.ana)) {
    setFlag(NF.ana, 1);
    yield* say(T.NG_ANA);
    return;
  }
  yield* say3(T.NG_ANA_AGAIN);
});

/** みかんの 木（かくし：4つめの 前に 1回）。 */
registerScript('obj_c3_semi_mikan', function* (): Co {
  se('se_examine');
  if (hunting() && ngCount() < 4 && !flag(NF.mikan)) {
    setFlag(NF.mikan, 1);
    yield* say(T.NG_MIKAN);
    return;
  }
  yield* say3(T.NG_MIKAN_KI);
});

/** 5 名人の 判定。 */
function* hantei(): Co {
  const p = new TeNoHiraPanel(SEMI_ORDER.slice());
  try {
    yield* openPanel(p);
    yield* say(T.NG_HANTEI[0]);
    for (let i = 0; i < 4; i++) {
      p.point = i;
      se('se_examine', { vol: 0.3, pitch: 1.2 + i * 0.1 });
      yield* say(T.NG_HANTEI[i + 1]);
    }
    yield* say(T.NG_HANTEI_B);
  } finally {
    yield* closePanel(p);
  }
  setFlag(NF.done, 1);
  addMp(2);
  se('se_item');
  yield* say3(T.NG_REWARD);
}

/** 1 虫かごの 子の〔semi〕、探している あいだ、判定、すんだ あと。 */
wrap(KID, function* (_ctx, orig): Co {
  if (ngOpen() && onMap(UMIZOI)) {
    if (!flag(NF.start) && flag('flag_seen_npc_c3_kid_c1') > 0) {
      setFlag(NF.start, 1);
      yield* say(T.NG_A);
      return;
    }
    if (flag(NF.start) && !flag(NF.done)) {
      if (ngCount() >= 4) {
        yield* hantei();
        return;
      }
      yield* say3(T.ngLeft(4 - ngCount()));
      yield* ushiro();
      return;
    }
    if (flag(NF.done)) {
      if (!flag(NF.mitai) && knWith()) {
        setFlag(NF.mitai, 1);
        yield* say(T.NG_MITAI);
        return;
      }
      yield* say3(T.NG_DONE);
      return;
    }
  }
  yield* orig();
});

// the other two on the open ground: their usual words, then うしろ 半分 if it is waiting
for (const id of ['npc_c3_kid_a', 'npc_c3_kid_c', 'npc_c3_kid_b']) {
  wrap(id, function* (_ctx, orig): Co {
    yield* orig();
    if (ngOpen() && onMap(UMIZOI) && id !== KID) yield* ushiro();
    // 12:01: one more ツクツクボウシ by the children (once, after their words)
    if (inCh3() && c3Stage() === 2 && onMap(UMIZOI) && flag(NF.done) && !flag(NF.c2)) {
      setFlag(NF.c2, 1);
      ambientEvent('amb_c3_semi', 'tsuku', 0.3);
      c2T = 26000;
      yield 900;
      yield* say(T.NG_C2);
    }
  });
}

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.nukegara(step = 'kid')（第3章の 段階1、S06 の あと）
 *   'kid'     子どもの いつもの 会話の あと、虫かごの 子 (9,4) の 前 (9,5) 上向き（話すと〔semi〕）
 *   'fune'    〔semi〕の あと、伏せた 船の 腹の 前 (4,5) 上向き（①）
 *   'tire'    ① の あと、タイヤの 山の 前 (15,7) 上向き（② をひろうと うしろ 半分）
 *   'matsu'   ①② の あと、松の 幹の 前 (18,4) 上向き（③）
 *   'ana'     松の 根もとの 穴の 前 (17,5) 上向き
 *   'board'   ①②③ の あと、掲示板の 前 (26,4) 上向き（今の 文 → もう 1回 で ④）
 *   'mikan'   みかんの 木の 前 (47,5) 上向き（かくし）
 *   'hantei'  4つ そろえて、虫かごの 子の 前 (9,5) 上向き
 *   'stage2'  段階2、すんだ あと、防波堤の 子ども (35,32) の 前 (35,31) 下向き
 */
if (import.meta.env.DEV) {
  registerDebug('nukegara', (step = 'kid') => {
    const s2 = step === 'stage2';
    cmd().jump?.(s2 ? 'ch3:trap' : 'ch3:umizoi', true);
    for (const id of Object.values(NF)) setFlag(id, 0);
    for (const s of SHELLS) setFlag(gotF(s.kind), 0);
    setFlag('flag_ch3_stage', s2 ? 2 : 1);
    setFlag('flag_seen_npc_c3_kid_c1', 1);
    if (!flag('flag_ch3_bin_n')) setFlag('flag_ch3_bin_n', 1);
    const go = (x: number, y: number, d: string) => cmd().warp?.(UMIZOI, x, y, d);
    if (s2) {
      setFlag(NF.start, 1);
      for (const s of SHELLS) setFlag(gotF(s.kind), 1);
      setFlag(NF.done, 1);
      return go(35, 31, 'down');
    }
    if (step === 'kid') return go(9, 5, 'up');
    setFlag(NF.start, 1);
    if (step === 'fune') return go(4, 5, 'up');
    if (step === 'ana') return go(17, 5, 'up');
    if (step === 'mikan') return go(47, 5, 'up');
    setFlag(gotF('tsuku'), 1);
    setFlag(NF.ware, 1);
    if (step === 'tire') return go(15, 7, 'up');
    setFlag(gotF('niinii'), 1);
    setFlag(NF.ushiro, 1);
    if (step === 'matsu') return go(18, 4, 'up');
    setFlag(gotF('abura'), 1);
    if (step === 'board') return go(26, 4, 'up');
    setFlag(gotF('minmin'), 1);
    return go(9, 5, 'up');
  });

  registerDebug('ngState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(NF)) flags[k] = flag(id);
    for (const s of SHELLS) flags[s.kind] = flag(gotF(s.kind));
    const p = game.ui.widgets.find((w) => w instanceof TeNoHiraPanel) as TeNoHiraPanel | undefined;
    const f = field();
    return {
      flags,
      n: ngCount(),
      open: ngOpen(),
      hunting: hunting(),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      panel: p ? { kinds: p.kinds, point: p.point } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no 天丼; no clock time; the names without さん in the narration. */
export function ngTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', '光らんでも', 'ピッ！', 'あ、つい', 'おかわり、あるよ', 'もう 1杯', '具足', 'ほどよいなぁ', '暗くて しめった', '本日も、休館', 'ダンゴムシ ちゃうで', 'まだ'];
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
  walkT('ng', T.NG_TEXTS);
  // the panel: the four on the palm stay clear of the loupes' names (right of them), the loupes inside the panel
  const lastShell = ROW_X + 3 * ROW_DX + Math.ceil(SEMI_LOOK.minmin.wid * ROW_SC * 0.8);
  for (const k of ['abura', 'minmin']) {
    const left = LX - LR - 9 - measure(NG_UI.short[k]);
    if (lastShell > left) bad.push(`手の ひら: ぬけがら ${lastShell} > ${NG_UI.short[k]} ${left}`);
  }
  if (28 + 54 + LR > CH) bad.push('ルーペ: 下に はみ出す');
  if (SX + 120 + Math.ceil(SEMI_LOOK.abura.wid * 1.6 * 0.8) > LX - LR - 9 - measure(NG_UI.short.minmin)) bad.push('手の ひら: 1つの ときの ぬけがらが 名前に かかる');
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('ngText', () => ngTextCheck());
