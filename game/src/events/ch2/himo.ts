// 紐の 番（第2章。げむきか 10/20 の 案5「鍵は ポケットに」、2026-10-20 依頼主の 採用。02_ch2_index）。
// 文は data/text/hoshi_himo.ts、みました帳の ページは ui/menu/book_himo.ts。
//
//   h2（テツヤを 倒した あと flag_ch2_tetsuya_beaten から、ボスの 前まで）。h0〜h1 は 起きない。クリア後の 夜は 足さない
//   （テツヤが 畑を 動いている 夜なので。_pg なし）。
//   ・山道の 入口の 前の テツヤ（思いだした 姿 (45,2)、(45,3) から 北向き。restored_enemy_tetsuya）：1回目は 今の 文
//     （flag_hm_look）、2回目に〔kagi〕（ID は 案の まま。表示の 題は「紐の 番」）。
//   ・1 ぐるぐる → グソっ君が はさみを のばす → 2 まつ先生（山道の 入口の 横 (47,2)、(46,2) まで 寄る）の 大きな
//     「待って！」（Shout：大きな 字と ゆれ）→ 3 紐の 番 → 4 大写し「爪」TsumePanel：①止める レバー（けってい）、
//     爪が 止まるまで 待つ（止まる 前に けってい → 「止まるまで、見てて。」）②紐の 番（選ぶ：しゅんが 紐の 前に 立つ）
//     ③切る（←→ 切る 所、けってい 切る。つる 3本、巻き始めの はしは 大きな 丸の 中に 大きく 見せる。まん中から 切ると
//     切れはしが 残って もう 1回）→ 5 ぶどうの におい → 6 紐の 番が おれば（かくし：足あと・説明書）→ クズの 花
//     item_hoshi_tetsuya_kagi（ID は 案の まま）、朱肉 +2、みました帳②の すみ（flag_hm_done）。
//   ・集会所の 眠っている 3人（obj_hoshi_nappers）に 花を 置くと、タケじいの 寝言が 1回だけ『……ほどけたか……』
//     （flag_hm_makura。かくし：「……もう ひと畝……」を 聞いていれば グソっ君）。h3 で 花は 何も 言わずに 消える。
//   ・画面の 下の 帯に、いま 押す ボタンと 何を するかを 出す（大写しの 中）。
//
// QA：__game.cmd.himo(step, auto)、hmState()、hmText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { freeSpan } from '../../engine/safezones';
import { animate, ease } from '../../engine/tween';
import { flag, removeItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript, walk } from '../../world/api';
import { registerWorldFx } from '../../world/fx';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { drawTape, drawWindow, textW, UI } from '../../ui/window';
import * as T from '../../data/text/hoshi_himo';
import { HM_UI } from '../../data/text/hoshi_himo';
import { HOSHI_OBJ } from '../../data/text/hoshi_objects';
import { addMp, getKeyItem, giveKey } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { hStage, npc } from './common';

export const HF = {
  look: 'flag_hm_look',
  start: 'flag_hm_start',
  tomeru: 'flag_hm_tomeru',
  ban: 'flag_hm_ban',
  banNg: 'flag_hm_ban_ng',
  tsuru: 'flag_hm_tsuru',
  hashi: 'flag_hm_hashi',
  done: 'flag_hm_done',
  ashi: 'flag_hm_ashi',
  manual: 'flag_hm_manual',
  hitoune: 'flag_hm_hitoune',
  makura: 'flag_hm_makura',
  fumiAfter: 'flag_hm_fumi_after',
  // (what was seen before, for the hidden lines)
  seenAshi: 'flag_hm_seen_ashi',
  seenManual: 'flag_hm_seen_manual',
  seenUne: 'flag_hm_seen_une',
} as const;

const FUMI = 'npc_hoshi_fumi';
const HANA = 'item_hoshi_tetsuya_kagi';

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

/** h2、テツヤの あと、ボスの 前（クリア後の 夜は 足さない）。 */
export function hmOpen(): boolean {
  return !pgOn() && hStage() === 2 && flag('flag_ch2_tetsuya_beaten') > 0 && !flag('flag_ch2_boss_beaten');
}

function wrap(id: string, fn: (ctx: ScriptCtx, orig: () => Co) => Co): void {
  const prev = getScript(id);
  registerScript(id, function* (ctx): Co {
    const orig = function* (): Co {
      if (prev) yield* prev(ctx);
      else if (ctx.runDefault) yield* ctx.runDefault();
    };
    yield* fn(ctx, orig);
  });
}

// ================================================================ 「待って！」（大きな 字）

/** How long the big 「待って！」 stays (ms; QA's 'matte' holds it longer for the picture). */
let shoutMs = 1500;

class Shout implements Widget {
  modal = false;
  done = false;
  t = 0;
  update(dt: number): void {
    this.t += dt;
    if (this.t > shoutMs) this.done = true;
  }
  draw(g: Gfx): void {
    const a = this.t < 100 ? this.t / 100 : this.t > shoutMs - 300 ? Math.max(0, 1 - (this.t - shoutMs + 300) / 300) : 1;
    const sh = this.t < 500 ? Math.round(Math.sin(this.t / 25) * 3 * (1 - this.t / 500)) : 0;
    const s = 3;
    const w = textW(T.HM_MATTE) * s;
    const x = Math.round((384 - w) / 2) + sh;
    const y = 54;
    g.rect(0, y - 10, 384, 16 * s + 20, '#0B0B14', 0.35 * a);
    const ctx = g.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    g.text(T.HM_MATTE, 0, 0, { color: '#FFFFFF', outline: '#2A2440', alpha: a });
    ctx.restore();
    markText(0, y - 10, 384, 16 * s + 20);
  }
}

// ================================================================ 大写し「爪」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 切る 所：つる 3本 × はし・まん中。 */
type Cut = { v: number; at: 'hashi' | 'naka' | 'kire' };

function bandAt(g: Gfx, text: string): void {
  const w = textW(text) + 20;
  const h = 20;
  const y = 216 - h - 4;
  const span = freeSpan(y, y + h);
  const x = Math.max(span.x0 + 2, Math.min(span.x1 - w - 2, Math.round((384 - w) / 2)));
  markText(x, y, w, h, true);
  g.rect(x, y, w, h, '#1A1626', 0.88);
  g.rect(x, y, w, 1, '#FFE7A3', 0.6);
  g.text(text, x + 10, y + 4, { color: '#FFE7A3' });
}

export class TsumePanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  /** QA：いちど まん中から 切る。 */
  autoNaka = false;
  /** QA：止まる 前に いちど けってい。 */
  autoHaste = false;
  active = false;
  phase: 'tomeru' | 'matsu' | 'ban' | 'kiru' = 'tomeru';
  /** 爪の 回り（角度）と 速さ（0〜1）。 */
  ang = 0;
  speed = 0.5;
  /** つるの ようす：0 巻いている・1 切れはしが 残る・2 取れた。 */
  vines = [0, 0, 0];
  cur = 0;
  pick: 'ok' | 'cancel' | null = null;
  private autoT = 0;
  private wasActive = false;
  private armT = 0;
  private hasted = false;
  private naka = false;

  targets(): Cut[] {
    const out: Cut[] = [];
    this.vines.forEach((s, v) => {
      if (s === 0) out.push({ v, at: 'hashi' }, { v, at: 'naka' });
      else if (s === 1) out.push({ v, at: 'kire' });
    });
    return out;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.phase === 'matsu') this.speed = Math.max(0, this.speed - dt / 2600);
    this.ang += (this.speed * dt) / 220;
    // (the key that closed the last window must not also pick here: a moment's grace after it opens)
    if (this.active !== this.wasActive) {
      this.wasActive = this.active;
      this.armT = 0;
    }
    if (this.active) this.armT += dt;
    if (!this.active || this.pick || this.armT < 150) return;
    let lr = 0;
    let ok = false;
    if (this.auto) {
      this.autoT += dt;
      if (this.autoT < 450) return;
      this.autoT = 0;
      if (this.phase === 'tomeru') ok = true;
      else if (this.phase === 'matsu') ok = this.speed <= 0 || (this.autoHaste && !this.hasted && (this.hasted = true));
      else if (this.phase === 'kiru') {
        const ts = this.targets();
        const want = ts.findIndex((c) => c.at === (this.autoNaka && !this.naka && c.at !== 'kire' ? 'naka' : c.at === 'kire' ? 'kire' : 'hashi'));
        const goal = want < 0 ? 0 : want;
        if (this.cur !== goal) lr = goal > this.cur ? 1 : -1;
        else {
          ok = true;
          if (ts[goal]?.at === 'naka') this.naka = true;
        }
      }
    } else {
      lr = (input.pressed('right') ? 1 : 0) - (input.pressed('left') ? 1 : 0);
      ok = input.pressed('confirm');
      if (input.pressed('cancel')) {
        this.pick = 'cancel';
        return;
      }
    }
    if (this.phase === 'kiru' && lr) {
      const n = this.targets().length;
      this.cur = (this.cur + lr + n) % n;
      se('se_cursor', { vol: 0.3 });
    }
    if (ok) this.pick = 'ok';
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
        // the night field behind, the tomato's warm light on the rotor
        g.rect(SX, oy, CW, CH, '#141820');
        for (let r = 70; r > 0; r -= 12) g.alpha(0.05, () => g.circle(SX + 110, oy + 60, r, '#F28A3A'));
        // the rotor seen from the side: the shaft, the curved tines turning round it, the dirt on them
        const cx = SX + 110;
        const cy = oy + 62;
        g.rect(cx - 96, cy - 3, 192, 6, '#5A5E66');
        g.rect(cx - 96, cy - 3, 192, 1, '#8A8E96');
        for (let i = 0; i < 6; i++) {
          const th = this.ang + (i * Math.PI) / 3;
          const bx = cx - 70 + i * 28;
          const ex = bx + Math.round(Math.cos(th) * 22);
          const ey = cy + Math.round(Math.sin(th) * 30);
          const mx = bx + Math.round(Math.cos(th + 0.5) * 14);
          const my = cy + Math.round(Math.sin(th + 0.5) * 18);
          for (const o of [0, 1]) {
            g.line(bx + o, cy, mx + o, my, '#7A8088');
            g.line(mx + o, my, ex + o, ey, '#9AA0A8');
          }
          g.px(ex, ey, '#5A4A3A');
        }
        // the three runners of kuzu wound round the shaft (thick, hairy green-brown), their winding's start end
        const vx = [cx - 62, cx - 6, cx + 50];
        const ts = this.targets();
        const sel = this.phase === 'kiru' && this.active ? ts[this.cur] : null;
        this.vines.forEach((s, v) => {
          const x0 = vx[v];
          if (s === 2) return;
          if (s === 0) {
            for (let w = 0; w < 5; w++) {
              const x = x0 + w * 6;
              g.rect(x, cy - 9, 3, 18, '#5A6A2A');
              g.rect(x + 1, cy - 9, 1, 18, '#7A8A3A');
              g.line(x, cy - 9, x + 6, cy + 9, '#4A5A22');
            }
            // the start end sticking out (the leaf, the little hairs)
            g.line(x0 - 2, cy - 8, x0 - 14, cy - 24, '#5A6A2A');
            g.line(x0 - 1, cy - 8, x0 - 13, cy - 24, '#7A8A3A');
            g.rect(x0 - 18, cy - 30, 7, 6, '#4E7A32');
            // and the runner going off to the field with its purple flowers
            g.line(x0 + 30, cy + 8, x0 + 44, cy + 34, '#5A6A2A');
            for (let f = 0; f < 4; f++) g.rect(x0 + 40 + (f % 2) * 3, cy + 26 + f * 3, 3, 3, f % 2 ? '#9A5AB0' : '#B878C8');
          } else {
            // a short piece left in the gap of the tines
            g.rect(x0 + 8, cy - 6, 6, 12, '#5A6A2A');
            g.line(x0 + 8, cy - 6, x0 + 14, cy + 6, '#4A5A22');
          }
          if (sel && sel.v === v) {
            const px = sel.at === 'hashi' ? x0 - 12 : sel.at === 'naka' ? x0 + 14 : x0 + 11;
            const py = sel.at === 'hashi' ? cy - 22 : cy;
            g.ring(px, py, 7, '#FFE7A3');
            for (let k = 0; k < 4; k++) g.rect(px - 3 + k, py - 18 + k, 7 - k * 2, 1, '#FFE7A3');
          }
        });
        // the big round lens on the right: the start end of the runner, close (so its end can be told)
        if (this.phase === 'kiru') {
          const lx = SX + CW - 52;
          const ly = oy + 50;
          g.circle(lx, ly, 42, '#2A2440');
          g.circle(lx, ly, 40, '#1E2A1E');
          // (the start end is always shown big here; its label when it is the one pointed at)
          const big = !sel || sel.at === 'hashi';
          // the runner wound on the shaft, and (on the start end) its tip and a three-lobed leaf
          g.rect(lx - 40, ly + 6, 80, 8, '#5A5E66');
          for (let w = 0; w < 6; w++) g.line(lx - 30 + w * 12, ly - 4, lx - 22 + w * 12, ly + 22, '#6A7A32');
          if (big) {
            g.line(lx - 24, ly - 4, lx - 6, ly - 28, '#7A8A3A');
            g.line(lx - 23, ly - 4, lx - 5, ly - 28, '#5A6A2A');
            g.circle(lx - 2, ly - 31, 5, '#4E7A32');
            g.circle(lx + 6, ly - 27, 4, '#5E8A3A');
            g.circle(lx - 9, ly - 26, 4, '#5E8A3A');
            if (sel) g.text(HM_UI.hashi, lx + 8, ly - 12, { color: '#FFE7A3' });
          } else if (sel) g.text(sel.at === 'kire' ? '……' : HM_UI.naka, lx - 14, ly - 20, { color: '#F4ECD8' });
          g.ring(lx, ly, 40, '#9AA0A8');
        }
      });
      const tw = g.measure(HM_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, HM_UI.place, { seed: 81 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
    if (this.active && this.open >= 1) bandAt(g, this.phase === 'tomeru' ? HM_UI.bandTomeru : this.phase === 'matsu' ? HM_UI.bandMatsu : HM_UI.bandKiru);
  }
}

function* openPanel(p: TsumePanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: TsumePanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;
let qaNaka = false;
let qaHaste = false;

function* waitPick(p: TsumePanel): Co<'ok' | 'cancel'> {
  p.pick = null;
  p.active = true;
  while (!p.pick) yield null;
  p.active = false;
  return p.pick;
}

/** 4 止めて、待って、番を して、切る。true：つる 3本 取れた。 */
function* tsume(): Co<boolean> {
  const p = new TsumePanel();
  p.auto = qaAuto;
  p.autoNaka = qaNaka;
  p.autoHaste = qaHaste;
  let all = false;
  try {
    yield* openPanel(p);
    // ① the stop lever (if stopped already, from where it was left)
    if (!flag(HF.tomeru)) {
      yield* runMsg(T.HM_RULE_TOMERU);
      if ((yield* waitPick(p)) === 'cancel') return false;
      se('se_h_tiller', { vol: 0.5, level: 5 });
      p.phase = 'matsu';
      yield* runMsg(T.HM_SHIN);
      for (;;) {
        if ((yield* waitPick(p)) === 'cancel') return false;
        if (p.speed > 0) {
          yield* runMsg(T.HM_MADA_MAWARU);
          continue;
        }
        break;
      }
      setFlag(HF.tomeru, 1);
      yield* runMsg(T.HM_TOMATTA);
    } else p.speed = 0;
    // ② who keeps the cord
    p.phase = 'ban';
    while (!flag(HF.ban)) {
      const r = qaAuto ? (flag(HF.banNg) ? 0 : qaNaka ? 1 : 0) : yield* runMsg(T.HM_BAN_ASK);
      if (qaAuto) yield* runMsg(T.HM_BAN_ASK.split('\n?')[0]);
      if (r === 1) {
        setFlag(HF.banNg, 1);
        yield* runMsg(T.HM_BAN_NG);
        continue;
      }
      if (r !== 0) return false;
      setFlag(HF.ban, 1);
      se('se_item', { vol: 0.5 });
      yield* runMsg(T.HM_BAN_OK);
    }
    // ③ cut
    p.phase = 'kiru';
    const left = flag(HF.tsuru);
    p.vines = [0, 1, 2].map((v) => (left & (1 << v) ? 2 : 0));
    yield* say(T.HM_KIRU_RULE);
    while (p.vines.some((s) => s !== 2)) {
      p.cur = Math.min(p.cur, p.targets().length - 1);
      if ((yield* waitPick(p)) === 'cancel') return false;
      const c = p.targets()[p.cur];
      if (!c) continue;
      se('se_kotei_snip', { vol: 0.5 });
      if (c.at === 'naka') {
        p.vines[c.v] = 1;
        yield* runMsg(T.HM_NOKOTTA);
        continue;
      }
      if (c.at === 'hashi') {
        setFlag(HF.hashi, flag(HF.hashi) + 1);
        yield* runMsg(T.HM_SURU);
      }
      p.vines[c.v] = 2;
      setFlag(HF.tsuru, flag(HF.tsuru) | (1 << c.v));
      se('se_item', { vol: 0.4 });
      yield* runMsg(T.hmTsuru(p.vines.filter((s) => s === 2).length));
      p.cur = 0;
    }
    all = true;
    yield 300;
    yield* runMsg(T.HM_TETSU);
  } finally {
    yield* closePanel(p);
  }
  return all;
}

// ================================================================ 台本

/** まつ先生が 1歩 寄る（山道の 入口の 横 (47,2) → (46,2)）。 */
function* fumiNear(): Co {
  const a = npc(FUMI);
  if (!a || a.tileX !== 47) return;
  a.data.scripted = true;
  yield* walk(FUMI, [[46, 2]], { speed: 3, face: 'down' });
}

function* fumiBack(): Co {
  const a = npc(FUMI);
  if (!a || a.tileX === 47) return;
  yield* walk(FUMI, [[47, 2]], { speed: 2, face: 'down' });
  a.data.scripted = false;
}

function* kagi(): Co {
  if (!flag(HF.start)) {
    // 1 ぐるぐる → 2 待って！ → 3 紐の 番（ここは 1回きり）
    se('se_h_tiller', { vol: 0.4, level: 0 });
    yield* say(T.HM_GURU);
    if (kanenariHere()) yield* runMsg(T.HM_HASAMI);
    yield 200;
    game.ui.push(new Shout());
    game.shake(3, 400);
    yield shoutMs - 200;
    yield* fumiNear();
    yield* say(T.HM_MATTE_A);
    yield* say(T.HM_MATTE_B);
    yield* say(T.HM_BAN);
    setFlag(HF.start, 1);
  } else yield* fumiNear();
  const ok = yield* tsume();
  if (!ok) {
    yield* runMsg(T.HM_STOP);
    return;
  }
  // 5 ぶどうの におい → 6 紐の 番が おれば
  yield* say(T.HM_BUDOU);
  yield* runMsg(T.HM_KIME);
  if (flag(HF.seenAshi) && !flag(HF.ashi) && kanenariHere()) {
    setFlag(HF.ashi, 1);
    yield* say(T.HM_ASHI);
  }
  if (flag(HF.seenManual) && !flag(HF.manual) && kanenariHere()) {
    setFlag(HF.manual, 1);
    yield* say(T.HM_MANUAL);
  }
  yield* runMsg(T.HM_HANA);
  yield* getKeyItem(HANA, T.HM_GET_HANA, false);
  setFlag(HF.done, 1);
  addMp(2);
  se('se_item');
  yield* runMsg(T.HM_REWARD);
  yield* fumiBack();
}

/** 山道の 入口の 前の テツヤ（思いだした 姿）。 */
/** 今の 文（この 台本が ある と、interact.ts は 文の 表を 見ないので ここで 出す）。 */
function* tetsuyaText(): Co {
  const t = HOSHI_OBJ.restored_enemy_tetsuya;
  yield* runMsg(typeof t === 'string' ? t : T.HM_AFTER);
}

wrap('restored_enemy_tetsuya', function* (_ctx, orig): Co {
  void orig;
  if (flag(HF.done)) {
    yield* runMsg(T.HM_AFTER);
    return;
  }
  if (!hmOpen()) {
    yield* tetsuyaText();
    return;
  }
  if (!flag(HF.look)) {
    setFlag(HF.look, 1);
    yield* tetsuyaText();
    return;
  }
  yield* kagi();
});

/** まつ先生（すんだ あと 1回）。 */
wrap(FUMI, function* (_ctx, orig): Co {
  if (hmOpen() && flag(HF.done) && !flag(HF.fumiAfter) && field()?.map.id === 'map_hoshimidai') {
    setFlag(HF.fumiAfter, 1);
    yield* runMsg(T.HM_FUMI_AFTER);
    return;
  }
  yield* orig();
});

// ---- 集会所：タケじいの 枕もとに 花（1回）。「……もう ひと畝……」を 聞いたかも ここで 覚える

for (const id of ['obj_hoshi_nappers', 'obj_hoshi_nappers_1', 'obj_hoshi_nappers_2'])
  wrap(id, function* (_ctx, orig): Co {
    if (flag(HF.done) && !flag(HF.makura) && state.inventory.includes(HANA) && hStage() <= 2) {
      setFlag(HF.makura, 1);
      se('se_examine');
      while (state.inventory.includes(HANA)) removeItem(HANA);
      yield* runMsg(T.HM_MAKURA);
      if (flag(HF.seenUne) && !flag(HF.hitoune) && kanenariHere()) {
        setFlag(HF.hitoune, 1);
        yield* say(T.HM_HITOUNE);
      }
      return;
    }
    // the stage's own text at h0–h1 has タケじい's 『……もう ひと畝……』 (every third look: objects.ts)
    if (hStage() <= 1 && flag('flag_ch2_negoto') % 3 === 0) setFlag(HF.seenUne, 1);
    yield* orig();
  });

wrap('obj_hoshi_footprints', function* (_ctx, orig): Co {
  setFlag(HF.seenAshi, 1);
  yield* orig();
});
wrap('obj_hr_mk3_manual', function* (_ctx, orig): Co {
  setFlag(HF.seenManual, 1);
  yield* orig();
});

// the flower is put down quietly once the morning has come (h3), if it was never taken to the pillow
registerWorldFx({
  map: '',
  update() {
    if (hStage() >= 3 && state.inventory.includes(HANA)) removeItem(HANA);
  },
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.himo(step = 'tetsuya', auto = false)（h2、テツヤの あと）
 *   'tetsuya'  テツヤ（思いだした 姿）の 前 (45,3) 上向き（1回目は 今の 文、2回目に〔kagi〕）
 *   'kagi'     1回目を 見た あと（調べると〔kagi〕）。'naka' は auto で ちがう 答えと まん中も 試す、'haste' は 止まる 前に 押す
 *   'tsume'    3 の あと（大写しから）
 *   'makura'   すんだ あと、集会所の 眠っている 3人の 前（花を 置く）
 *   'after'    すんだ あと、テツヤの 前
 */
if (import.meta.env.DEV) {
  registerDebug('himo', (step = 'tetsuya', auto = false) => {
    cmd().jump?.('ch2:hill', true);
    for (const id of Object.values(HF)) setFlag(id, 0);
    while (state.inventory.includes(HANA)) removeItem(HANA);
    qaAuto = !!auto || step === 'naka' || step === 'haste';
    qaNaka = step === 'naka';
    qaHaste = step === 'haste';
    shoutMs = step === 'matte' ? 8000 : 1500;
    setFlag('flag_ch2_tetsuya_beaten', 1);
    setFlag('flag_hm_seen_ashi', 1);
    setFlag('flag_hm_seen_manual', 1);
    setFlag('flag_hm_seen_une', 1);
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (step === 'tetsuya') return go('map_hoshimidai', 45, 3, 'up');
    setFlag(HF.look, 1);
    if (step === 'kagi' || step === 'matte' || step === 'naka' || step === 'haste') return go('map_hoshimidai', 45, 3, 'up');
    setFlag(HF.start, 1);
    if (step === 'tsume') return go('map_hoshimidai', 45, 3, 'up');
    setFlag(HF.tomeru, 1);
    setFlag(HF.ban, 1);
    setFlag(HF.tsuru, 7);
    setFlag(HF.hashi, 3);
    setFlag(HF.done, 1);
    giveKey(HANA);
    if (step === 'makura') return go('map_hoshi_school', 6, 8, 'up');
    return go('map_hoshimidai', 45, 3, 'up');
  });

  registerDebug('hmState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(HF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof TsumePanel) as TsumePanel | undefined;
    const f = field();
    return {
      flags,
      open: hmOpen(),
      hana: state.inventory.includes(HANA),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      panel: p ? { phase: p.phase, speed: +p.speed.toFixed(2), vines: p.vines.join(','), cur: p.cur } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no clock time; none of chapter 2's banned words; no key; the names without さん in the narration. */
export function hmTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', 'まだ', 'いただきます', '3人', '12人', '1日2本', '海', '水族館', '鍵', 'ポケット', '具足', 'ほどよいなぁ'];
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
  walkT('hm', T.HM_TEXTS);
  for (const b of [HM_UI.bandTomeru, HM_UI.bandMatsu, HM_UI.bandKiru]) if (measure(b) + 20 > 384 - 16) bad.push(`帯: ${measure(b)}px: ${b}`);
  if (measure(T.HM_MATTE) * 3 > 384 - 32) bad.push('待って！: wide');
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('hmText', () => hmTextCheck());
