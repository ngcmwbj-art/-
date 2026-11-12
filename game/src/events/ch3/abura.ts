// 毎晩の 油（第3章の クリア前、段階3。げむきか 10/19 の 案3、2026-10-19 依頼主の 採用。03_ch3_index 28）。
// 文は data/text/c3_abura.ts、みました帳の ページは ui/menu/book_abura.ts。S33 の 1ページは ending.ts（cut5Morning）。
// 地図は 今の まま（倉庫の 外の 廊下 map_c3_aq_rouka の 机 obj_c3_rouka_desk (1–2,5)）。
//
//   段階3、S23 の あと（flag_ch3_yakisoban）から S24 の 起動（trig_ch3_hp）まで。S24 の あとは 起きない。
//   ・机：ケースを 取りもどした あとの 1回目は 今の 文（flag_ab_desk）、2回目に〔abura〕（flag_ab_start）。
//     ヤキソバン（隊列の うしろ c3_yk_follow）だけ (3,4) に 出て 机を 向く。
//   ・大写し「ヘラ」HeraPanel × 2本：① ふく（←→ 交互に 3往復）② 1てき（けってい。2回 以上で べたべた）
//     ③ のばす（←→ 交互に 2往復 → 黒く 光る）。失敗は ない。でき：flag_ab_hon_1・_2（1 黒く 光った・2 べたべた）。
//   ・1本目の あと：廊下の 先の ヒロスケ・ポコシャが 1回ずつ（待っている）。2本目の あと：置物の ヘラ → ごほうび。
//   ・かくし：段階0 に 置物を 2回 調べた（flag_ab_statue2）→ グソっ君の 1行。2本とも べたべた → ヤキソバンの 1行。
//     第2章の 二百十日（flag_nihyaku_*）→ グソっ君の 1行。
//
// QA：__game.cmd.abura(step, auto)、abState()、abText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript, walk } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/c3_abura';
import { AB_UI } from '../../data/text/c3_abura';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { c3Stage, c3Town, inCh3, say3 } from './common';
import { anyFlag } from './talked';
import { HOWTO } from '../../data/text/howto';
import { skipIntro } from '../../ui/closeup';
import { widenInt } from '../../ui/closeup_wide';

export const AF = {
  desk: 'flag_ab_desk',
  start: 'flag_ab_start',
  hon1: 'flag_ab_hon_1',
  hon2: 'flag_ab_hon_2',
  done: 'flag_ab_done',
  statue2: 'flag_ab_statue2',
} as const;

const YK = 'c3_yk_follow';
const ROUKA = 'map_c3_aq_rouka';

/** 寄り道が 開いている：段階3、ヤキソバンが 仲間、S24 の 前、廊下。 */
export function abOpen(): boolean {
  return inCh3() && c3Stage() === 3 && flag('flag_ch3_yakisoban') > 0 && !flag('flag_ch3_hp_beaten') && !flag('flag_ch3_yk_left') && field()?.map.id === ROUKA;
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

// ================================================================ 大写し「ヘラ」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const RX = SX + 206;

type Phase = 'fuku' | 'teki' | 'nobasu' | 'end';
/** ふく：←→ を 交互に この 回数（3往復）。のばす：2往復。 */
const FUKU_N = 6;
const NOBASU_N = 4;
/** 1てき 落として から、次の 段に 移るまで（ms）。この 間に もう 1回 押すと べたべた。 */
const TEKI_WAIT = 1100;

export class HeraPanel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  /** はじめの カード（改善会議 10-25 の1、ui/closeup.ts）。 */
  howto = HOWTO.abura;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  /** 'beta' を 試す（QA）。 */
  autoBeta = false;
  active = false;
  /** 今の ヘラ（0・1）。 */
  hon = 0;
  phase: Phase = 'fuku';
  fuku = 0;
  drops = 0;
  nobasu = 0;
  /** 2本の でき（null：まだ）。 */
  deki: ('kuro' | 'beta' | null)[] = [null, null];
  /** 布の 位置（-1〜1）。 */
  rag = 0;
  private lastDir = 0;
  private tekiT = 0;
  private dropAnim = 0;
  private autoT = 0;

  start(hon: number): void {
    this.hon = hon;
    this.phase = 'fuku';
    this.fuku = 0;
    this.drops = 0;
    this.nobasu = 0;
    this.lastDir = 0;
    this.tekiT = 0;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    this.dropAnim = Math.max(0, this.dropAnim - dt);
    this.rag *= Math.pow(0.1, dt / 1000);
    if (!this.active || this.phase === 'end') return;
    let l = false;
    let r = false;
    let ok = false;
    if (this.auto) {
      this.autoT += dt;
      const tick = Math.floor(this.autoT / 220) !== Math.floor((this.autoT - dt) / 220);
      if (tick) {
        const k = Math.floor(this.autoT / 220);
        if (this.phase === 'teki') ok = this.drops === 0 || (this.autoBeta && this.drops < 3);
        else if (k % 2) l = true;
        else r = true;
      }
    } else {
      l = input.pressed('left');
      r = input.pressed('right');
      ok = input.pressed('confirm');
    }
    const d = l ? -1 : r ? 1 : 0;
    if (this.phase === 'fuku' && d) {
      this.rag = d;
      if (d !== this.lastDir) {
        this.fuku++;
        se('se_c3_kosogeru', { vol: 0.25, pitch: 1.6 });
      }
      this.lastDir = d;
      if (this.fuku >= FUKU_N) {
        this.phase = 'teki';
        this.lastDir = 0;
      }
    } else if (this.phase === 'teki') {
      if (ok) {
        this.drops++;
        this.dropAnim = 400;
        this.tekiT = 0;
        se('se_h_yunomi_pour', { vol: 0.2, pitch: 1.6 });
      } else if (this.drops > 0) {
        this.tekiT += dt;
        if (this.tekiT >= TEKI_WAIT) this.phase = 'nobasu';
      }
    } else if (this.phase === 'nobasu' && d) {
      this.rag = d;
      if (d !== this.lastDir) {
        this.nobasu++;
        se('se_c3_kosogeru', { vol: 0.15, pitch: 2.2 });
      }
      this.lastDir = d;
      if (this.nobasu >= NOBASU_N) {
        // ひろい：2てき までは べたべたに ならない（ふつうは 1てき。改善会議 10-28 の5）
        this.deki[this.hon] = this.drops >= widenInt(2) ? 'beta' : 'kuro';
        this.phase = 'end';
      }
    }
  }

  /** 1本の ヘラ（cx：刃の まん中、y：刃の 上、k：0 墨〜1 ふけた、oil：0〜1 のびた 油、beta：べたべた）。 */
  private hera(g: Gfx, cx: number, y: number, soot: number, oil: number, beta: boolean, dim: boolean): void {
    // the wooden handle off to the right, the steel blade (a wide trapezoid) to the left
    g.rect(cx + 36, y + 14, 40, 8, dim ? '#5A4430' : '#8A6444');
    g.rect(cx + 36, y + 14, 40, 1, dim ? '#6A5440' : '#A8825A');
    g.rect(cx + 28, y + 16, 9, 4, '#6A6A72');
    for (let i = 0; i < 30; i++) {
      const h = 18 + Math.round(i * 0.4);
      const x = cx - 30 + i * 2;
      const top = y + 18 - Math.round(h / 2);
      // the steel's own grey, darkening with the oil to an iron black that shines
      const base = oil > 0 ? (oil >= 1 ? '#2A2A30' : '#4A4A52') : '#7A7A84';
      g.rect(x, top, 2, h, dim ? '#3A3A40' : base);
    }
    if (dim) return;
    // the soot: black blotches, fewer as it is wiped
    if (soot > 0)
      for (let k = 0; k < 22; k++) {
        if (k / 22 > soot) continue;
        const bx = cx - 28 + ((k * 37) % 56);
        const by = y + 10 + ((k * 23) % 16);
        g.rect(bx, by, 5 + (k % 3), 3 + (k % 2), '#101014');
      }
    // the oil's shine: a soft line along the blade once spread; too much: yellow drops and runs
    if (oil > 0) {
      const a = Math.min(1, oil);
      g.rect(cx - 28, y + 12, 56, 1, '#C8D0DC', 0.5 * a);
      g.rect(cx - 20, y + 15, 34, 1, '#E8F0F8', 0.35 * a);
    }
    if (beta) {
      for (const [ox, oy] of [[-18, 20], [-4, 24], [10, 21], [20, 25]] as const) {
        g.rect(cx + ox, y + oy, 2, 3, '#D8B858');
        g.px(cx + ox, y + oy, '#FFF0A0');
      }
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
        // the old desk's top (dusty wood) under the corridor's light
        g.rect(SX, oy, RX - SX - 4, CH, '#5A4636');
        for (let yy = 0; yy < CH; yy += 9) g.rect(SX, oy + yy, RX - SX - 4, 1, '#4A3828');
        g.alpha(0.12, () => g.rect(SX, oy, RX - SX - 4, 30, '#F4E8C8'));
        // the two spatulas: the one being done in front (lower), the other above it
        for (let h = 0; h < 2; h++) {
          const d = this.deki[h];
          const y = oy + (h === 0 ? 56 : 12);
          const cx = SX + 92;
          let soot = 1;
          let oil = 0;
          let beta = false;
          if (d) {
            soot = 0;
            oil = 1;
            beta = d === 'beta';
          } else if (h === this.hon) {
            soot = 1 - this.fuku / FUKU_N;
            oil = this.phase === 'nobasu' ? 0.3 + (0.7 * this.nobasu) / NOBASU_N : this.phase === 'teki' && this.drops ? 0.15 : 0;
            beta = this.drops >= widenInt(2) && this.phase === 'nobasu';
          }
          this.hera(g, cx, y, soot, oil, beta, false);
        }
        const cy = oy + (this.hon === 0 ? 56 : 12);
        // the rag (wiping, spreading) or the little oil can (the drop)
        if (this.phase === 'fuku' || this.phase === 'nobasu') {
          const rx = SX + 92 + Math.round(this.rag * 22);
          g.rect(rx - 10, cy + 8, 20, 14, '#E8E4D8');
          g.rect(rx - 10, cy + 8, 20, 1, '#FFFFFF');
          g.rect(rx - 8, cy + 20, 16, 2, '#B8B4A8');
          if (this.phase === 'fuku' && this.fuku) g.rect(rx - 6, cy + 14, 8, 4, '#3A3A3E');
        }
        if (this.phase === 'teki') {
          const bx = SX + 84;
          const by = cy - 8;
          g.rect(bx, by, 10, 12, '#6A7A5A');
          g.rect(bx + 3, by - 6, 4, 6, '#8A9A7A');
          g.rect(bx + 4, by - 9, 2, 3, '#C8C8C0');
          if (this.dropAnim > 0) {
            const fy = by + 14 + Math.round(((400 - this.dropAnim) / 400) * 16);
            g.rect(bx + 4, fy, 2, 3, '#E8C860');
          }
        }
        // the right column: which one, the steps, the keys
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        g.text(AB_UI.hon(this.hon), RX, oy + 4, { color: '#F4ECD8' });
        const ph = ['fuku', 'teki', 'nobasu'].indexOf(this.phase);
        AB_UI.steps.forEach((s, i) => g.text(s, RX, oy + 22 + i * 14, { color: i === ph ? '#FFE7A3' : i < ph || this.phase === 'end' ? '#8A84A0' : '#C8C0D8' }));
        if (this.active && this.phase !== 'end') g.text(AB_UI.keys[this.phase], RX, oy + 74, { color: '#FFE7A3' });
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(AB_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, AB_UI.place, { seed: 73 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }
}

function* openPanel(p: HeraPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: HeraPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;
let qaBeta = false;

/** 1本（でき）。 */
function* oneHera(p: HeraPanel, hon: number): Co<'kuro' | 'beta'> {
  p.start(hon);
  p.active = true;
  while (p.phase !== 'end') yield null;
  p.active = false;
  yield 400;
  const d = p.deki[hon] ?? 'kuro';
  if (d === 'beta') yield* say3(T.AB_BETA);
  yield* say3(T.AB_KURO);
  return d;
}

/** 1〜5。 */
function* abura(): Co {
  setFlag(AF.start, 1);
  const f = field();
  const yk = f?.actorById(YK);
  if (yk) {
    yk.data.scripted = true;
    if (f!.free(yk, 3 * 16 + 8, 4 * 16 + 16, true) || (yk.tileX === 3 && yk.tileY === 4)) {
      yield* walk(YK, [[yk.tileX, 4], [3, 4]], { speed: 2.4, face: 'left' });
    }
    yk.dir = 'left';
  }
  try {
    // もどるで やめた あと（改善会議 10-26 の 3）：「すぐ やる」なら 前置きと やり方を とばして 1本目から
    const skip = yield* skipIntro(HOWTO.abura.id);
    se('se_c3_spatula', { vol: 0.5 });
    if (!skip) yield* say3(T.AB_A);
    const p = new HeraPanel();
    p.auto = qaAuto;
    p.autoBeta = qaBeta;
    const deki: ('kuro' | 'beta')[] = [];
    try {
      yield* openPanel(p);
      if (!skip) yield* say3(T.AB_RULE);
      deki.push(yield* oneHera(p, 0));
      // 3 待っている（廊下の 先から）
      yield 300;
      yield* say3(T.AB_MATSU);
      yield* say3(T.AB_NIHONME);
      deki.push(yield* oneHera(p, 1));
      yield 300;
    } finally {
      yield* closePanel(p);
    }
    setFlag(AF.hon1, deki[0] === 'beta' ? 2 : 1);
    setFlag(AF.hon2, deki[1] === 'beta' ? 2 : 1);
    // 4 置物の ヘラ
    yield* say3(T.AB_OKIMONO_A);
    if (flag(AF.statue2)) yield* say3(T.AB_ASA);
    yield* say3(T.AB_OKIMONO_B);
    if (deki.every((d) => d === 'beta')) yield* say3(T.AB_BETA2);
    if (anyFlag('flag_nihyaku_*')) yield* say3(T.AB_KAMA);
    yield* say3(T.AB_SOURCE);
    // 5 ごほうび
    setFlag(AF.done, 1);
    addMp(2);
    se('se_item');
    yield* say3(T.AB_REWARD);
  } finally {
    if (yk) delete yk.data.scripted;
  }
}

wrap('obj_c3_rouka_desk', function* (_ctx, orig): Co {
  if (!abOpen()) {
    yield* orig();
    return;
  }
  if (flag(AF.done)) {
    se('se_examine');
    yield* say3(T.AB_DESK_AFTER);
    return;
  }
  if (!flag(AF.start) && flag(AF.desk) < 1) {
    setFlag(AF.desk, 1);
    yield* orig();
    return;
  }
  // (もどるで やめた あと〈改善会議 10-25 の4〉も：調べ直すと 最初から)
  yield* abura();
});

// 段階0（夕鳴町の 昼前）に 店の 前の 置物を 2回 調べた（かくしの 1行のため）
{
  const prev = getScript('npc_cow_statue');
  registerScript('npc_cow_statue', function* (ctx: ScriptCtx): Co {
    const before = c3Town() && flag('flag_seen_obj_c3_yakisoban_statue') > 0;
    if (prev) yield* prev(ctx);
    else yield* ctx.runDefault();
    if (before && c3Town()) setFlag(AF.statue2, 1);
  });
}

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.abura(step = 'desk', auto = false)（第3章の 段階3、S23 の あと、廊下）
 *   'desk0'  机の 1回目（今の 文）から、机の 前 (1,4) 下向き
 *   'desk'   1回目を 見た あと、机の 前（調べると〔abura〕）
 *   'beta'   auto で 2本とも べたべた、かくし 3つ（置物 2回・二百十日）も 立てて 机の 前
 *   'after'  すんだ あと、机の 前
 */
if (import.meta.env.DEV) {
  registerDebug('abura', (step = 'desk', auto = false) => {
    cmd().jump?.('ch3:hp', true);
    for (const id of Object.values(AF)) setFlag(id, 0);
    qaAuto = !!auto || step === 'beta';
    qaBeta = step === 'beta';
    const go = () => cmd().warp?.(ROUKA, 1, 4, 'down');
    if (step === 'desk0') return go();
    setFlag(AF.desk, 1);
    if (step === 'beta') {
      setFlag(AF.statue2, 1);
      setFlag('flag_nihyaku_tome', 1);
    }
    if (step === 'desk' || step === 'beta') return go();
    setFlag(AF.start, 1);
    setFlag(AF.hon1, 1);
    setFlag(AF.hon2, 1);
    setFlag(AF.done, 1);
    return go();
  });

  registerDebug('abState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(AF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof HeraPanel) as HeraPanel | undefined;
    const yk = field()?.actorById(YK);
    return { flags, open: abOpen(), yk: yk ? [yk.tileX, yk.tileY, yk.dir] : null, panel: p ? { hon: p.hon, phase: p.phase, fuku: p.fuku, drops: p.drops, nobasu: p.nobasu, deki: p.deki } : null };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no 天丼; no clock time; the names without さん in the narration. */
export function abTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', 'ピッ！', 'あ、つい', 'おかわり、あるよ', 'もう 1杯', '具足', '8月30日', 'さすが 師匠', '焼き芋 食うか'];
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
  walkT('ab', T.AB_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of [...AB_UI.steps, ...Object.values(AB_UI.keys), AB_UI.hon(1)]) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('abText', () => abTextCheck());
