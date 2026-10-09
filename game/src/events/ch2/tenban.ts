// 無人販売所の 店番（第2章。2026-10-09 依頼主の採用：げむきか 10/9 の 案3。02_ch2_index #94、50 10.30、
// 52 7.11）。文は data/text/hoshi_tenban.ts、絵は art/props/tenban_art.ts、みました帳の ページは
// ui/menu/book_tenban.ts、柱の 看板は art/props/hoshi_station.ts の prop_h_mujin。
//
//   段階1〜2（トマトの 灯り）、ムジン販売員を 倒して ソワカの〔h1_2〕（mujin_done）を 聞いた あと、
//   グソっ君が いっしょで ソワカに 話すと〔tenban〕：
//   ・店番 ぼしゅう → 席に つく（グソっ君は 台の 西 (20,37)、しゅんは 県道 (19,38)、ソワカは 西を 向く）。
//   ・画面の 上に 大写し（TenbanPanel）：左に じっと している グソっ君、まん中に ソワカの 下絵（4段）、
//     右に『うごいた n』『料金箱 n』と 下絵の 進み（●○）。会話の 窓は 下。あいだに 台と 県道が 見える。
//   ・お客 4人が 県道を 東から 歩いて 来て、台の 前 (22,38) で 1人ずつ。しゅんの 返事を 選ぶ。
//     ツッコむ → グソっ君が「ぶふっ」と 動く（flag_tenban_moves +1）。区長で うなずく → こっくり（+1）。
//     段階1 は トマじいの あと ふくじんづけが においを かぎに 来る。段階2 は 区長の とちゅうで 呼び声。
//   ・できあがり：大写しが 看板に なる（動いた 回数で 3通り。0回で かくしの はさみの サイン）。
//     売り上げ 100円 × 5。朱肉 +2（flag_tenban_done）。
//   ・かくし：第1章の お地蔵さんの ひとこと（flag_kanenari_flip_jizo）を 見た 人は はじめに 1行。
//   ・そのあと：看板（obj_hoshi_mujin）を 調べると その 絵の 文と、グソっ君（1回）。
//     段階2、ソワカの〔h2_1〕を 聞いた あとの 1回〔satoshi〕。
//
// この ファイルは ch2/index.ts で 色見本（sawako_yk）の あと、駅ノート・二百十日・色紙・足あと帳より 前に
// import する：その 寄り道の 用（あとから 包む ほう）が 先に 出て、ソワカの ふだんの 台詞の 前に これが 出る。
//
// QA：__game.cmd.tenban(step, stage)、tenbanState()、tenbanText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript, spawn } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { playCall } from '../../world/hoshi';
import type { Actor } from '../../world/actor';
import { openShop } from '../../ui/shop';
import { drawTape, drawWindow, UI } from '../../ui/window';
import { CALL_NAMES, callLine } from '../../data/text/hoshi_npcs';
import * as T from '../../data/text/hoshi_tenban';
import { TENBAN_GUESTS, tenbanRank, type TenbanGuest } from '../../data/text/hoshi_tenban';
import { tenbanSketch, SKETCH_H, SKETCH_W } from '../../art/props/tenban_art';
import { kanenariFront } from '../../art/enemies/kanenari';
import { addMp, F, panBack, panTo, sendAway, walkTo } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { hStage, lanternOn } from './common';
import { YK } from './sawako_yk';

export const TF = {
  /** できあがった（朱肉 +2、看板が かわる）。 */
  done: 'flag_tenban_done',
  /** グソっ君が 動いた 回数。 */
  moves: 'flag_tenban_moves',
  /** 0回で、はさみの サイン（かくし）。 */
  sign: 'flag_tenban_sign',
  /** 看板を 見た ときの グソっ君（1回）。 */
  kanbanKane: 'flag_tenban_kanban_kane',
  /** 段階2 の〔satoshi〕（1回）。 */
  satoshi: 'flag_tenban_satoshi',
} as const;

function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower?.visible && state.party.some((m) => m.id === 'kanenari');
}

/** 段階1〜2、トマトの 灯りを 持っている あいだ。 */
function nightOn(): boolean {
  const s = hStage();
  return s >= 1 && s <= 2 && lanternOn();
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

function* say(text: string): Co<number> {
  return yield* runMsg(text);
}

/** ソワカの 店番：いま はじめられる。 */
export function tenbanReady(): boolean {
  if (flag(TF.done) || !nightOn() || !kanenariHere()) return false;
  if (field()?.map.id !== 'map_hoshimidai') return false;
  // ムジン販売員を 倒して〔h1_2〕を 聞いた あと（台に 料金箱が もどって いる）。色見本の 話が 先
  if (!state.taken['sym_hoshi_02'] || !flag('flag_seen_npc_hoshi_sawako_mujin_done')) return false;
  if (flag(YK.kabe) > 0 && !flag(YK.yk)) return false;
  return true;
}

// ================================================================ 大写し

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 92;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 下絵（2倍）の 左上。 */
const EX = SX + 74;
const EY = SY + 2;
/** 右の 列。 */
const RX = EX + SKETCH_W * 2 + 10;

export class TenbanPanel implements Widget {
  modal = false;
  done = false;
  t = 0;
  open = 0;
  /** 下絵の 段（0..4）。 */
  step = 0;
  moves = 0;
  coins = 0;
  /** グソっ君：'still'、'bufu'（ふき出す）、'nod'（こっくり）、その 残り ms。 */
  kane: 'still' | 'bufu' | 'nod' = 'still';
  kaneT = 0;
  /** 筆が 動いて いる（ms）。 */
  brush = 0;
  /** できあがり：看板の 絵。 */
  final = false;
  rank: 0 | 1 | 2 = 0;
  sign = false;
  words: { text: string; x: number; y: number; t: number; ms: number; color?: string }[] = [];

  update(dt: number, _input: Input): void {
    this.t += dt;
    if (this.kaneT > 0) {
      this.kaneT -= dt;
      if (this.kaneT <= 0) this.kane = 'still';
    }
    if (this.brush > 0) this.brush -= dt;
    this.words = this.words.filter((w) => (w.t += dt) < w.ms);
  }

  word(text: string, x: number, y: number, ms = 900, color?: string): void {
    this.words.push({ text, x, y, t: 0, ms, color });
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
        if (this.final) this.drawKanban(g, dy);
        else this.drawModel(g, dy);
      });
      if (!this.final) {
        const name = T.TENBAN_UI.place;
        const tw = g.measure(name) + 16;
        drawTape(g, SX + 8, PY + dy - 5, tw, 16, name, { seed: 31 });
        markText(SX + 8, PY + dy - 5, tw, 16);
      }
    });
    for (const w of this.words) {
      const p = w.t / w.ms;
      const yy = Math.round(SY + w.y - p * 6);
      const al = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
      g.text(w.text, SX + w.x, yy, { color: w.color ?? UI.bg, outline: UI.border, align: 'center', alpha: al });
      markText(SX + w.x - 24, yy, 48, 16, true);
    }
  }

  /** The sitting: グソっ君 on the left, the sketch on the easel, the counts on the right. */
  private drawModel(g: Gfx, dy: number): void {
    const oy = SY + dy;
    // the back: the stand's dark wood and the night
    g.rect(SX, oy, CW, CH, '#3E3A5E');
    g.rect(SX, oy + CH - 14, 70, 14, '#5A4636');
    // グソっ君 on a stool, still (a shake when he laughs, a dip when he nods off)
    const img = kanenariFront(this.kane === 'bufu' ? 'flip' : 'idle', this.t);
    const shake = this.kane === 'bufu' ? (Math.floor(this.t / 50) % 2 ? 1 : -1) : 0;
    const nod = this.kane === 'nod' ? Math.round(Math.sin(Math.min(1, (900 - this.kaneT) / 900) * Math.PI) * 4) : 0;
    g.rect(SX + 16, oy + CH - 10, 40, 4, '#8A5A3A');
    g.img(img, SX + 8 + shake, oy + CH - img.height + 2 + nod);
    // the easel: a board on two legs, the sketch on it (2×)
    g.rect(EX - 3, EY - 2, SKETCH_W * 2 + 6, SKETCH_H * 2 + 4, '#8A5A3A');
    g.img(tenbanSketch(this.step, this.rank, false), EX, EY, { scale: 2 });
    // her brush while she paints: a little stroke moving over the paper
    if (this.brush > 0) {
      const bx = EX + 40 + Math.round(Math.sin(this.t / 70) * 18);
      const by = EY + 30 + Math.round(Math.cos(this.t / 90) * 10);
      g.line(bx, by, bx + 8, by - 10, '#8A5A3A');
      g.rect(bx - 1, by - 1, 3, 3, '#D49A5C');
    }
    // the right column: what to do, the moves, the money box, the sketch's steps
    let y = oy + 4;
    for (const l of T.TENBAN_UI.guide) {
      g.text(l, RX, y, { color: UI.bg });
      y += 15;
    }
    y += 3;
    g.text(T.TENBAN_UI.moved(this.moves), RX, y, { color: this.moves > 0 ? '#FFB070' : UI.bg });
    y += 16;
    g.text(T.TENBAN_UI.box(this.coins), RX, y, { color: UI.bg });
    y += 18;
    // the four steps of the sketch
    for (let i = 0; i < 4; i++) {
      const cx = RX + 4 + i * 12;
      if (i < this.step) g.rect(cx - 3, y + 2, 7, 7, '#D49A5C');
      else g.frame(cx - 3, y + 2, 7, 7, UI.bg2);
    }
    markText(RX, oy, SX + CW - RX, CH);
  }

  /** The finished board: 『どれでも 100円』, the picture, 『店番 グソっ君（人では ありません）』. */
  private drawKanban(g: Gfx, dy: number): void {
    const oy = SY + dy;
    g.rect(SX, oy, CW, CH, '#3E3A5E');
    // the board (wood edge, white paint): the picture (2×) on the left, the words on the right
    const bx = SX + 16;
    const bw = CW - 32;
    g.rect(bx, oy, bw, CH, '#8A5A3A');
    g.rect(bx + 3, oy + 2, bw - 6, CH - 4, '#F4ECD8');
    g.img(tenbanSketch(4, this.rank, this.sign), bx + 5, oy + 2, { scale: 2 });
    const tx = bx + 5 + SKETCH_W * 2 + 6;
    g.text(T.TENBAN_UI.kanban, tx, oy + 10, { color: '#D9483A' });
    g.text(T.TENBAN_UI.name, tx, oy + 36, { color: '#2A2440' });
    g.text(T.TENBAN_UI.note, tx, oy + 54, { color: '#2A2440' });
    markText(bx, oy, bw, CH);
  }
}

// ================================================================ the sitting

/** Where everyone stands for it (tiles). */
const AT = {
  kane: [20, 37] as [number, number],
  player: [19, 38] as [number, number],
  guest: [22, 38] as [number, number],
  from: [35, 38] as [number, number],
};

const GUEST_SPRITE: Record<TenbanGuest, string> = {
  yoshie: 'npc_hoshi_yoshie',
  tome: 'npc_hoshi_tome',
  kucho: 'npc_hoshi_kucho',
  sankado: 'npc_hoshi_busdriver',
};

let qaFast = false;

function* bufu(panel: TenbanPanel): Co {
  panel.kane = 'bufu';
  panel.kaneT = 900;
  panel.moves++;
  panel.word('ぶふっ', 32, 16, 900, '#FFE7A3');
  se('se_cursor', { pitch: 1.6, vol: 0.6 });
  const k = F().follower;
  k?.hop?.(2, 160);
  yield 300;
}

function* nod(panel: TenbanPanel): Co {
  panel.kane = 'nod';
  panel.kaneT = 900;
  panel.moves++;
  panel.word('こっくり', 32, 20, 1000, '#FFE7A3');
  yield 500;
}

function* pay(panel: TenbanPanel, g: TenbanGuest): Co {
  const n = g === 'yoshie' ? 2 : 1;
  for (let i = 0; i < n; i++) {
    se('se_h_coin_box', { vol: 0.8 });
    panel.coins++;
    panel.word('+100', RX - SX + 60, 36, 800, '#FFE7A3');
    yield 260;
  }
  yield* say(T.TENBAN_PAY[g]);
}

/** ソワカの 筆：下絵が 1段 すすむ。 */
function* paint(panel: TenbanPanel): Co {
  panel.brush = qaFast ? 200 : 900;
  for (let i = 0; i < 3; i++) {
    se('se_pen_write', { pitch: 0.8 + i * 0.05, vol: 0.7 });
    yield qaFast ? 60 : 240;
  }
  panel.step = Math.min(4, panel.step + 1);
  se('se_page', { pitch: 1.2, vol: 0.5 });
  yield 200;
}

function* guestWalk(id: string, sprite: string): Co<Actor> {
  const a = spawn(id, AT.from[0], AT.from[1], { sprite, dir: 'left', ghost: true });
  a.data.scripted = true;
  yield* walkTo(id, AT.guest[0], AT.guest[1], { face: 'left', speed: qaFast ? 12 : 4.5 });
  a.dir = 'left';
  return a;
}

function guestLeave(a: Actor): void {
  sendAway(a, [[AT.from[0] + 2, AT.guest[1]]], 4, 200, true);
}

function* guest(panel: TenbanPanel, g: TenbanGuest, s: number): Co {
  const a = yield* guestWalk(`tenban_${g}`, GUEST_SPRITE[g]);
  if (g === 'kucho' && s >= 2) {
    // 段階2：式辞の とちゅうで 呼び声。区長は 山を 見る（返事は なし）
    yield* say(T.TENBAN_COME.kucho.split('\n/\n')[0]);
    const name = CALL_NAMES[Math.floor(Math.random() * CALL_NAMES.length)];
    a.dir = 'up';
    yield* playCall(callLine(name), { stage: 2 });
    yield* say(T.TENBAN_KUCHO_H2);
    a.dir = 'left';
    yield* say(T.TENBAN_KUCHO_H2_AFTER);
  } else {
    const r = yield* say(`${T.TENBAN_COME[g]}\n${T.TENBAN_CHOICE}`);
    if (r === 0) {
      yield* say(T.TENBAN_TSUKKOMI[g]);
      yield* bufu(panel);
      yield* say(T.TENBAN_BUFU);
      yield* say(T.TENBAN_AFTER_TSUKKOMI[g]);
    } else if (r === 1) {
      if (g === 'kucho') {
        const txt = T.TENBAN_UNAZUKU.kucho;
        const cut = txt.lastIndexOf('@narr');
        yield* say(txt.slice(0, cut));
        yield* nod(panel);
        yield* say(txt.slice(cut));
      } else yield* say(T.TENBAN_UNAZUKU[g]);
    } else yield* say(T.TENBAN_HAKO[g]);
    if (g === 'sankado') {
      yield* say(T.TENBAN_HANKO);
    }
  }
  yield* pay(panel, g);
  guestLeave(a);
}

/** 段階1：トマじいの あと、ふくじんづけが においを かぎに 来る（選ぶ 所 なし）。 */
function* dogVisit(): Co {
  const id = 'tenban_dog';
  const a = spawn(id, AT.from[0], AT.from[1], { sprite: 'npc_hoshi_gon', dir: 'left', ghost: true });
  a.data.scripted = true;
  yield* walkTo(id, 21, 38, { face: 'up', speed: qaFast ? 12 : 6 });
  a.dir = 'up';
  yield 400;
  a.playAnim?.('wag', true);
  yield* say(T.TENBAN_DOG);
  a.anim = null;
  sendAway(a, [[21, 38], [AT.from[0] + 2, 38]], 6, 100, true);
}

export function* tenbanScene(): Co {
  const s = hStage();
  let f = F();
  yield* say(T.TENBAN_START);
  if (flag('flag_kanenari_flip_jizo')) yield* say(T.TENBAN_JIZO);
  // 席に つく
  yield* game.fadeOut(300, '#0B0B14');
  f = F();
  const p = f.player;
  p.x = AT.player[0] * 16 + 8;
  p.y = AT.player[1] * 16 + 16;
  p.dir = 'right';
  const k = f.follower;
  if (k) {
    k.data.scripted = true;
    k.x = AT.kane[0] * 16 + 8;
    k.y = AT.kane[1] * 16 + 16;
    k.dir = 'down';
  }
  const sw = f.actorById('npc_hoshi_sawako');
  if (sw) {
    sw.data.scripted = true;
    sw.dir = 'left';
  }
  // the stand and the road between the close-up (top) and the window (bottom). The HD-2D's tilted
  // camera (f.projected() answers only there) shows them a little lower down for the same centre.
  const hd = !!f.projected(p.x, p.y);
  yield* panTo(21, hd ? 36.25 : 36.6, 20);
  yield* game.fadeIn(300);
  const panel = new TenbanPanel();
  try {
    game.ui.push(panel);
    se('se_tsuri_open');
    yield* animate(200, (x) => (panel.open = x), ease.linear);
    panel.open = 1;
    forceBoxPos('bottom');
    yield* say(T.TENBAN_RULE);
    for (const [i, g] of TENBAN_GUESTS.entries()) {
      yield* guest(panel, g, s);
      if (g === 'tome' && s === 1) yield* dogVisit();
      yield* paint(panel);
      if (i < T.TENBAN_SKETCH.length) yield* say(T.TENBAN_SKETCH[i]);
    }
    // できあがり
    panel.rank = tenbanRank(panel.moves);
    panel.sign = panel.moves === 0;
    yield 300;
    se('se_page');
    panel.final = true;
    yield* say(T.TENBAN_DONE);
    yield* say(T.TENBAN_RESULT[panel.rank]);
    if (panel.sign) yield* say(T.TENBAN_SIGN);
    yield* say(T.TENBAN_URIAGE);
    setFlag(TF.moves, panel.moves);
    if (panel.sign) setFlag(TF.sign, 1);
    setFlag(TF.done, 1);
  } finally {
    yield* animate(180, (x) => (panel.open = 1 - x), ease.linear);
    panel.done = true;
    game.ui.remove(panel);
    forceBoxPos(null);
    for (const id of ['tenban_yoshie', 'tenban_tome', 'tenban_kucho', 'tenban_sankado', 'tenban_dog']) {
      const a = f.actorById(id);
      if (a && !a.path.length) f.removeActor(a);
    }
    if (k) delete k.data.scripted;
    if (sw) {
      delete sw.data.scripted;
      sw.dir = 'down';
    }
  }
  yield* panBack(500);
  addMp(2);
  se('se_item');
  yield* say(T.TENBAN_REWARD);
}

// ================================================================ the people and the board

wrap('npc_hoshi_sawako', function* (_ctx, orig): Co {
  if (tenbanReady()) {
    yield* tenbanScene();
    return;
  }
  // 段階2、〔h2_1〕（サトシくん）を 聞いた あと、1回
  if (flag(TF.done) && !flag(TF.satoshi) && hStage() === 2 && flag('flag_seen_npc_hoshi_sawako_h2_1') && kanenariHere()) {
    setFlag(TF.satoshi, 1);
    yield* say(T.TENBAN_SATOSHI);
    yield* openShop('shop_hoshi_mujin');
    return;
  }
  yield* orig();
});

/**
 * 看板（段階1〜2、できあがった あと）：いつもの 文の あとに その 絵の 文と、グソっ君（1回）。
 * 台の 上には 料金箱（思いだした姿 restored_enemy_mujin_hanbaiin）が いて、調べると そちらが 出るので 両方を 包む。
 */
function* kanbanAfter(): Co {
  const s = hStage();
  if (!flag(TF.done) || s < 1 || s > 2) return;
  yield* say(T.TENBAN_KANBAN[tenbanRank(flag(TF.moves))]);
  if (flag(TF.sign)) yield* say(T.TENBAN_SIGN);
  if (!flag(TF.kanbanKane) && kanenariHere()) {
    setFlag(TF.kanbanKane, 1);
    yield* say(T.TENBAN_KANBAN_KANE);
  }
}
for (const id of ['obj_hoshi_mujin', 'restored_enemy_mujin_hanbaiin'])
  wrap(id, function* (_ctx, orig): Co {
    yield* orig();
    yield* kanbanAfter();
  });

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.tenban(step = 'start', stage = 1, moves = 0)
 *   'start'  ムジン販売員の あと、ソワカの 前 (23,38) 北向き（話すと〔tenban〕）
 *   'fast'   同じで、お客が 速く 歩く
 *   'done'   できあがった あと（moves の 絵）、看板の 前 (21,38) 北向き（調べると その 絵の 文）
 *   'satoshi' 段階2、できあがって〔h2_1〕を 聞いた あと、ソワカの 前
 */
if (import.meta.env.DEV) {
  registerDebug('tenban', (step = 'start', st = 1, mv = 0) => {
    const s2 = Number(st) >= 2;
    cmd().jump?.('ch2:houki', true);
    if (s2) {
      for (const id of ['flag_ch2_tetsuya_beaten', 'flag_ch2_houki_enter', 'flag_ch2_keitora_here']) setFlag(id, 1);
      state.taken['sym_hoshi_07'] = true;
      setFlag('flag_ch2_stage', 2);
    }
    state.taken['sym_hoshi_02'] = true;
    setFlag('flag_book_enemy_mujin_hanbaiin', 1);
    setFlag('flag_seen_npc_hoshi_sawako_mujin_done', 1);
    for (const id of Object.values(TF)) setFlag(id, 0);
    qaFast = step === 'fast';
    if (step === 'start' || step === 'fast') return cmd().warp?.('map_hoshimidai', 23, 38, 'up');
    setFlag(TF.done, 1);
    setFlag(TF.moves, Number(mv));
    if (Number(mv) === 0) setFlag(TF.sign, 1);
    if (step === 'satoshi') {
      setFlag('flag_seen_npc_hoshi_sawako_h2_1', 1);
      return cmd().warp?.('map_hoshimidai', 23, 38, 'up');
    }
    return cmd().warp?.('map_hoshimidai', 21, 38, 'up');
  });

  registerDebug('tenbanState', () => {
    const p = game.ui.widgets.find((w) => w instanceof TenbanPanel) as TenbanPanel | undefined;
    return {
      ready: tenbanReady(),
      done: flag(TF.done),
      moves: flag(TF.moves),
      sign: flag(TF.sign),
      panel: p ? { step: p.step, moves: p.moves, coins: p.coins, final: p.final, rank: p.rank } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines. */
export function tenbanTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足様', '平和', '17', '3人', 'らっきょ', 'ほどよい'];
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
      for (const raw of v.split('\n')) {
        const t = raw.trim();
        if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || !t) {
          flush();
          continue;
        }
        const plain = raw.replace(/\{[^}]*\}/g, '');
        if (measure(plain) > 336) bad.push(`${name}: ${measure(plain)}px: ${plain}`);
        for (const b of BANNED) if (plain.includes(b)) bad.push(`${name}: 「${b}」: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('tenban', T.TENBAN_TEXTS);
  // the close-up's words: the right column (guide, counts) within its width, the board's lines on the board
  const col = SX + CW - RX - 2;
  for (const l of [...T.TENBAN_UI.guide, T.TENBAN_UI.moved(9), T.TENBAN_UI.box(9)]) if (measure(l) > col) bad.push(`ui: ${measure(l)}px > ${col}: ${l}`);
  const room = CW - 32 - 5 - SKETCH_W * 2 - 6 - 4;
  for (const l of [T.TENBAN_UI.kanban, T.TENBAN_UI.name, T.TENBAN_UI.note]) if (measure(l) > room) bad.push(`kanban: ${measure(l)}px > ${room}: ${l}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('tenbanText', () => tenbanTextCheck());
