// 湯を わかしてから（第2章。げむきか 10/18 の 案4、2026-10-18 依頼主の 採用。02_ch2_index #106）。
// 文は data/text/hoshi_yuwaka.ts、新しい 地図は data/maps/hoshi_ura_hata.ts（map_hoshi_ura_hata、16×10）、
// 絵は art/props/yuwaka_art.ts、みました帳の ページは ui/menu/book_yuwaka.ts。シゲじいと スギばあの 家
// （data/maps/hoshi_rooms2.ts の minka2）に 貼り紙と 東の 壁の 勝手口 (11,4)、集会所（hoshi_rooms.ts）に 大なべ。
//
//   ・1 貼り紙 obj_yw_harigami（茶だんすの 横、(3,2) から 左向き。h0〜）→ flag_yw_hari。目覚まし時計
//     obj_hr_mk2_tokei の 2回目に 1ページ（flag_yw_tokei）。段階0 の 勝手口は「暗うて、足もとが 見えへん」。
//   ・2 走る 係（集会所の ぴょん夫人、h1〜h2）→ 3 大なべ（flag_yw_nabe）。わく 前に 集会所を 出ると グソっ君が とめる
//     （trig_yw_leave）。少し 待つか 眠っている 2人に 話すと「わいたよ！」（flag_yw_waita・flag_yw_door）。
//     なべを かけている 間も お茶（休憩）は 使える。
//   ・4 朝どり（勝手口 → 裏の とうもろこし畑）：15株 obj_yw_kabu_<i>（大写し「ひげと 先」CornPanel）。とりごろ 4本の
//     うち 2本を「下へ 折る」で もぐ（flag_yw_kabu_<i>・flag_yw_moida）。早い 株・かじられ・物置も 数える（畑の 物 ○/4）。
//     2本 もいだら 帰り道の 歩数で『あまさ』◎○△（AmaBadge。寄り道で 下がる。0 には ならない）。
//   ・5 湯気・6 寝言の しりとり・7 ごほうび（ぴょん夫人に 話す）→ flag_yw_done（いちばん よかった あまさ flag_yw_best）。
//     無人販売所の ゆでとうもろこしの 上限 +1（ui/shop.ts）。
//   ・クリア後の 夜（段階は h1）：ぴょん夫人は クリア後の 会話が 包むので、yuwaka_pg.ts が その 上から 先に 呼ぶ。
//     畑は 歩けるが、もぐのは 1回きり。
//
// QA：__game.cmd.yuwaka(step, stage)、ywState()、ywText()

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
import { registerWorldFx } from '../../world/fx';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/hoshi_yuwaka';
import { YW_UI } from '../../data/text/hoshi_yuwaka';
import { URA_HATA, URA_KABU } from '../../data/maps/hoshi_ura_hata';
import { addMp, getKeyItem, giveKey, stepBack } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { hStage, lanternOn } from './common';

export const YF = {
  hari: 'flag_yw_hari',
  tokeiN: 'flag_yw_tokei_n',
  tokei: 'flag_yw_tokei',
  start: 'flag_yw_start',
  nabe: 'flag_yw_nabe',
  waita: 'flag_yw_waita',
  door: 'flag_yw_door',
  go: 'flag_yw_go',
  first: 'flag_yw_first',
  h2: 'flag_yw_h2',
  moida: 'flag_yw_moida',
  steps: 'flag_yw_steps',
  hayai: 'flag_yw_hayai',
  kajiri: 'flag_yw_kajiri',
  koya: 'flag_yw_koya',
  best: 'flag_yw_best',
  done: 'flag_yw_done',
  yoshieAfter: 'flag_yw_yoshie_after',
  shikishi: 'flag_yw_shikishi',
  nHayai: 'flag_yw_n_hayai',
  mujin: 'flag_yw_mujin',
} as const;

const SCHOOL = 'map_hoshi_school';
const MINKA2 = 'map_hoshi_minka2';
const kabuF = (i: number) => `flag_yw_kabu_${i}`;
/** あまさ（1 ◎・2 ○・3 △）の 歩数の さかい。 */
const AMA_STEPS = [72, 110];

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

/** 寄り道が 開いている：段階1〜2、トマトの 灯り（クリア後の 夜も）。 */
function open(): boolean {
  const s = hStage();
  return s >= 1 && s <= 2 && lanternOn();
}

/** もいだ 2本を 持って 走っている。 */
export function ywCarrying(): boolean {
  return flag(YF.moida) >= 2 && !flag(YF.done);
}

/** あまさ（1 ◎・2 ○・3 △）。 */
export function ywAma(steps = flag(YF.steps)): 1 | 2 | 3 {
  return steps <= AMA_STEPS[0] ? 1 : steps <= AMA_STEPS[1] ? 2 : 3;
}

/** 畑の 物（2本・早い 株・かじられ・物置）。 */
export function ywHataN(): number {
  return [flag(YF.moida) >= 2, flag(YF.hayai) > 0, flag(YF.kajiri) > 0, flag(YF.koya) > 0].filter(Boolean).length;
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

// ================================================================ 大写し「ひげと 先」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;

type Kind = 'tori' | 'hayai' | 'kajiri';

export class CornPanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  open = 0;
  kind: Kind;
  /** 'pull'：上へ 引っぱって いる（びくとも しない）、'poki'：下へ 折った。 */
  act: '' | 'pull' | 'poki' = '';
  actT = 0;

  constructor(kind: Kind) {
    this.kind = kind;
  }

  update(dt: number, _input: Input): void {
    this.t += dt;
    if (this.act) this.actT += dt;
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
        // the dark field, the lantern's warm pool on the ear
        g.rect(SX, oy, CW, CH, '#12161E');
        for (let r = 84; r > 0; r -= 12) g.alpha(0.045, () => g.circle(SX + 164, oy + 56, r, '#F28A3A'));
        // the stalk going up through the picture, a leaf behind
        const sx = SX + 120;
        g.rect(sx, oy, 6, CH, '#4E7A32');
        g.rect(sx, oy, 2, CH, '#6A9A42');
        for (const y of [20, 74]) g.rect(sx - 1, oy + y, 8, 2, '#2E4A22');
        for (let i = 0; i < 90; i++) {
          const x = sx - 4 - i;
          const y = oy + 30 + Math.round(Math.sin(i / 30) * 10 + (i / 90) * (i / 90) * 40);
          g.rect(x, y, 1, 3, '#3E6A2A');
          g.px(x, y, '#5E8A3A');
        }
        // the ear, slanting out from the stalk (its foot low on the stalk, the tip up and to the right)
        const pull = this.act === 'pull' ? Math.round(Math.sin(this.actT / 40) * 1.5) : 0;
        const bend = this.act === 'poki' ? Math.min(1, this.actT / 200) : 0;
        const ex = sx + 8 + pull;
        const ey = oy + 70 + Math.round(bend * 10);
        const len = 96;
        // (a fat ear in its husk: the husk's long leaves as stripes along it, a little shank at its foot)
        for (let i = 0; i < len; i++) {
          const t = i / len;
          const full = this.kind === 'hayai' ? 10 : 13;
          const w = Math.max(2, Math.round(full * (t < 0.12 ? 0.55 + (t / 0.12) * 0.45 : t > 0.78 ? Math.max(0.25, (1 - t) / 0.22) : 1)));
          const x = ex + i;
          const y = ey - Math.round(i * (0.42 - bend * 0.35));
          for (let j = -w; j < w; j++) {
            const stripe = (((j + w) * 3 + Math.round(t * 7)) % 7) < 2;
            const c = j === -w ? '#A8D070' : j >= w - 2 ? '#3E6A2A' : stripe ? '#5E8E3A' : '#78A848';
            g.px(x, y + j, c);
          }
        }
        // the husk's loose leaf tips at the foot of the ear, the shank into the stalk
        g.rect(sx + 4, oy + 64, 6, 4, '#5E8A3A');
        g.line(ex + 2, ey - 12, ex + 26, ey - 22, '#A8D070');
        g.line(ex + 2, ey + 10, ex + 30, ey + 2, '#5E8E3A');
        // the tip: round and full (tori), pointed and soft (hayai), chewed open (kajiri)
        const tx = ex + len;
        const ty = ey - Math.round(len * (0.42 - bend * 0.35));
        if (this.kind === 'kajiri') {
          g.rect(tx - 16, ty - 8, 16, 14, '#F2D25A');
          for (let y = 0; y < 14; y += 3) for (let x = 0; x < 16; x += 3) g.px(tx - 16 + x + ((y / 3) % 2), ty - 8 + y, '#C8A838');
          g.line(tx - 18, ty - 9, tx - 6, ty - 10, '#D8D0A0');
          g.line(tx - 18, ty + 6, tx - 8, ty + 8, '#D8D0A0');
        } else if (this.kind === 'tori') {
          g.circle(tx - 4, ty, 6, '#6E9E42');
          g.circle(tx - 4, ty - 1, 4, '#86B052');
        } else {
          g.line(tx - 6, ty - 3, tx + 6, ty, '#6E9E42');
          g.line(tx - 6, ty + 3, tx + 6, ty, '#3E6A2A');
        }
        // the silk out of the tip: dry and brown (ripe), or fresh and pale green
        const silk = this.kind === 'hayai' ? ['#C8E098', '#A8C878'] : ['#8A5A32', '#A87848'];
        if (this.kind !== 'kajiri') {
          for (let s = 0; s < 9; s++) {
            const sway = this.kind === 'hayai' ? Math.round(Math.sin(this.t / 700 + s) * 1) : 0;
            g.line(tx + 2, ty - 1 + (s % 3), tx + 16 + s * 2 + sway, ty - 12 + s * 3, silk[s % 2]);
          }
        }
        if (this.act === 'poki' && this.actT < 500) g.text('ポキッ', tx - 50, ty - 34, { color: '#FFE7A3' });
      });
      const tw = g.measure(YW_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, YW_UI.place, { seed: 73 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }
}

function* withCorn(p: CornPanel, fn: () => Co): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  try {
    yield* animate(200, (x) => (p.open = x), ease.linear);
    p.open = 1;
    forceBoxPos('bottom');
    yield* fn();
  } finally {
    yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
    p.done = true;
    game.ui.remove(p);
    forceBoxPos(null);
  }
}

// ================================================================ あまさの 札（2本 もいでから、とどけるまで）

export class AmaBadge implements Widget {
  modal = false;
  done = false;
  t = 0;
  last = 0;
  bump = 0;

  update(dt: number, _input: Input): void {
    this.t += dt;
    if (this.bump > 0) this.bump = Math.max(0, this.bump - dt);
    const a = ywAma();
    if (a !== this.last) {
      if (this.last) this.bump = 300;
      this.last = a;
    }
    if (!ywCarrying()) this.done = true;
  }

  draw(g: Gfx): void {
    const f = field();
    if (!f || game.top !== f || this.done) return;
    const label = `${YW_UI.ama} ${YW_UI.marks[ywAma() - 1]}`;
    const w = g.measure(label) + 18;
    const x = 8;
    const y = 24 - (this.bump > 0 ? 1 : 0);
    drawTape(g, x, y, w, 18, label, { seed: 74 });
    markText(x, y, w, 18);
  }
}

let badge: AmaBadge | null = null;
/** 湯気の 場面の 間（札は もう 出さない）。 */
let yugeOn = false;
function ensureBadge(): void {
  if (!ywCarrying() || yugeOn) return;
  if (badge && !badge.done && game.ui.widgets.includes(badge)) return;
  badge = game.ui.push(new AmaBadge());
}

/** The steps home are counted on whatever map しゅん is on (a step = a new tile on the same map). */
let lastTile = '';
registerWorldFx({
  map: '',
  update(f) {
    if (!ywCarrying()) {
      lastTile = '';
      return;
    }
    ensureBadge();
    const key = `${f.map.id}:${f.player.tileX},${f.player.tileY}`;
    const sameMap = lastTile.startsWith(f.map.id + ':');
    if (lastTile && sameMap && key !== lastTile) setFlag(YF.steps, flag(YF.steps) + 1);
    lastTile = key;
  },
});

// ================================================================ 1 貼り紙・目覚まし時計・勝手口

registerScript('obj_yw_harigami', function* (): Co {
  se('se_examine');
  if (flag(YF.done)) {
    yield* say(T.YW_HARIGAMI_AFTER);
    return;
  }
  if (!flag(YF.hari)) {
    setFlag(YF.hari, 1);
    yield* say(T.YW_HARIGAMI);
    return;
  }
  yield* say(T.YW_HARIGAMI_AGAIN);
});

wrap('obj_hr_mk2_tokei', function* (_ctx, orig): Co {
  yield* orig();
  if (!flag(YF.hari) || flag(YF.tokei)) return;
  const n = flag(YF.tokeiN) + 1;
  setFlag(YF.tokeiN, n);
  if (n >= 2) {
    setFlag(YF.tokei, 1);
    yield* say(T.YW_TOKEI);
  }
});

registerScript('obj_yw_uraguchi', function* (): Co {
  se('se_examine');
  if (hStage() === 0 || !lanternOn()) {
    yield* say(T.YW_URA_DARK);
    return;
  }
  yield* say(T.YW_URA_SHUT);
  if (flag(YF.hari)) yield* say(T.YW_URA_SHUT_KN);
});

// ================================================================ 2〜3 走る 係・湯が わく（集会所の ぴょん夫人）

function* waita(): Co {
  if (flag(YF.waita) || !flag(YF.nabe)) return;
  setFlag(YF.waita, 1);
  setFlag(YF.door, 1);
  const y = field()?.actorById('npc_hoshi_yoshie');
  const f = field();
  if (y && f) y.dir = f.player.x < y.x ? 'left' : 'right';
  se('se_h_watercup', { vol: 0.5, pitch: 0.7 });
  yield 300;
  yield* say(T.YW_WAITA);
  if (y) y.dir = 'left';
}

/** ぴょん夫人の 用（した とき true）。クリア後の 夜は yuwaka_pg.ts が クリア後の 会話の 上から 呼ぶ。 */
export function* ywYoshie(orig: (() => Co) | null): Co<boolean> {
  if (!onMap(SCHOOL) || !open()) return false;
  if (ywCarrying()) {
    yield* yuge();
    return true;
  }
  if (flag(YF.done)) return false;
  if (flag(YF.hari) && !flag(YF.start)) {
    setFlag(YF.start, 1);
    yield* say(T.YW_YOSHIE_A);
    setFlag(YF.nabe, 1);
    se('se_h_watercup', { vol: 0.4, pitch: 0.6 });
    yield* say(T.YW_NABE);
    waitMs = 0;
    return true;
  }
  if (flag(YF.nabe) && !flag(YF.waita)) {
    // the tea (a rest) still works while the pot is on
    if (orig) yield* orig();
    yield* say(T.YW_NABE_WAIT);
    return true;
  }
  if (flag(YF.waita) && flag(YF.moida) < 2 && !flag(YF.go)) {
    setFlag(YF.go, 1);
    yield* say(T.YW_YOSHIE_GO);
    return true;
  }
  return false;
}

for (const id of ['npc_hoshi_yoshie', 'evt_ch2_rest_yoriai'])
  wrap(id, function* (_ctx, orig): Co {
    if (yield* ywYoshie(orig)) return;
    const before = flag('flag_ch2_rest_count');
    yield* orig();
    // すんだ あと、お茶の あとに 1回
    if (flag(YF.done) && !flag(YF.yoshieAfter) && flag('flag_ch2_rest_count') > before && onMap(SCHOOL)) {
      setFlag(YF.yoshieAfter, 1);
      yield* say(T.YW_YOSHIE_AFTER);
    }
  });

/** 眠っている 2人に 話すと、湯が わく。 */
for (const id of ['obj_hoshi_nappers', 'obj_hoshi_nappers_1', 'obj_hoshi_nappers_2'])
  wrap(id, function* (_ctx, orig): Co {
    yield* orig();
    if (open() && flag(YF.nabe) && !flag(YF.waita)) yield* waita();
  });

/** 少し 待つと、湯が わく（集会所で 動ける 間の 時間）。 */
let waitMs = 0;
registerWorldFx({
  map: SCHOOL,
  update(f, dt) {
    if (!flag(YF.nabe) || flag(YF.waita) || !open()) return;
    if (!f.controllable || game.ui.modal) return;
    waitMs += dt;
    if (waitMs < 7000) return;
    waitMs = 0;
    f.startScript(waita());
  },
});

registerScript('trig_yw_leave', function* (): Co {
  if (!flag(YF.nabe) || flag(YF.waita) || !open()) return;
  yield* say(kanenariHere() ? T.YW_LEAVE_KN : T.YW_LEAVE_SOLO);
  stepBack();
});

// ================================================================ 4 朝どり（裏の とうもろこし畑）

registerScript('evt_yw_hata_enter', function* (): Co {
  yield 300;
  if (!flag(YF.first)) {
    setFlag(YF.first, 1);
    yield* say(T.YW_FIELD_FIRST);
  }
  if (hStage() === 2 && !flag(YF.h2) && kanenariHere()) {
    setFlag(YF.h2, 1);
    yield* say(T.YW_FIELD_H2);
  }
});

/** 畑の 物を 1つ 数える（はじめての とき）。 */
function* hataSeen(id: string): Co {
  if (flag(id)) return;
  setFlag(id, 1);
  se('se_item', { vol: 0.4 });
  yield* runMsg(T.ywHata(ywHataN()));
}

function* moguKabu(i: number, kind: Kind): Co {
  const p = new CornPanel(kind);
  let got = false;
  yield* withCorn(p, function* () {
    yield* say(kind === 'tori' ? T.YW_TORI : kind === 'hayai' ? T.YW_HAYAI : T.YW_KAJIRI);
    if (kind === 'kajiri') return;
    if (flag(YF.moida) >= 2 || flag(YF.done)) {
      if (kind === 'tori') yield* say(T.YW_ENOUGH);
      return;
    }
    const c = yield* say(T.YW_ASK);
    if (c !== 0) return;
    if (kind === 'hayai') {
      yield* say(kanenariHere() ? T.YW_HAYAI_KN : T.YW_HAYAI_SOLO);
      return;
    }
    for (;;) {
      const how = yield* say(T.YW_HOW);
      if (how === 0) break;
      p.act = 'pull';
      p.actT = 0;
      se('se_cursor', { vol: 0.3, pitch: 0.6 });
      yield 500;
      p.act = '';
      yield* say(T.YW_UE);
    }
    p.act = 'poki';
    p.actT = 0;
    se('se_examine', { vol: 0.8, pitch: 1.4 });
    yield 500;
    yield* say(T.YW_POKI);
    got = true;
  });
  if (kind === 'hayai') yield* hataSeen(YF.hayai);
  if (kind === 'kajiri') yield* hataSeen(YF.kajiri);
  if (!got) return;
  setFlag(kabuF(i), 1);
  const n = flag(YF.moida) + 1;
  setFlag(YF.moida, n);
  if (n < 2) {
    se('se_item', { vol: 0.5 });
    yield* runMsg(T.ywMoida(n));
    return;
  }
  // 2本：大事なもの、歩数の 数えが はじまる
  setFlag(YF.steps, 0);
  lastTile = '';
  yield* getKeyItem('item_yw_moigi', T.YW_GOT2, false);
  yield* hataSeen('flag_yw_two');
  yield* say(kanenariHere() ? T.YW_RUN_KN : T.YW_RUN_SOLO);
  ensureBadge();
}

registerScript('obj_yw_kabu', function* (ctx: ScriptCtx): Co {
  const i = Number(String(ctx.source).replace(/^obj_yw_kabu_/, '')) - 1;
  const kabu = URA_KABU[i];
  se('se_examine');
  if (!kabu) return;
  if (flag(kabuF(i))) {
    yield* say(T.YW_MOIDA_ATO);
    return;
  }
  if (!open() || !flag(YF.waita) || flag(YF.done)) {
    yield* say(T.YW_KABU_PLAIN);
    return;
  }
  yield* say(T.YW_KABU_A);
  yield* moguKabu(i, kabu[2]);
});

registerScript('obj_yw_koya', function* (): Co {
  se('se_examine');
  yield* say(T.YW_KOYA);
  if (open() && flag(YF.waita) && !flag(YF.done)) yield* hataSeen(YF.koya);
});

registerScript('obj_yw_net', function* (): Co {
  se('se_examine');
  yield* say(T.YW_NET);
});

// ================================================================ 5〜7 湯気・寝言の しりとり・ごほうび

function* yuge(): Co {
  const ama = ywAma();
  const kn = kanenariHere();
  removeItem('item_yw_moigi');
  yugeOn = true;
  if (badge) badge.done = true;
  se('se_h_watercup', { vol: 0.5, pitch: 0.8 });
  yield* say(T.YW_YUGE);
  const key = (['a', 'b', 'c'] as const)[ama - 1];
  yield* say(kn ? T.YW_AMA[key] : T.YW_AMA_SOLO[key]);
  // 6 the corn by the pillows: the sleep-talk しりとり from 『とうもろこし』
  yield* game.fadeOut(300, '#0B0B14');
  yield 200;
  yield* game.fadeIn(300);
  yield* say(T.YW_MAKURA);
  if (ama === 1) yield* say(T.YW_HAYAKATTA);
  yield* say(T.YW_SHIRITORI);
  if (flag('flag_ch2_negoto_n') && kn && !flag(YF.nHayai)) {
    setFlag(YF.nHayai, 1);
    yield* say(T.YW_N_HAYAI);
  }
  // 7 ごほうび
  yield* say(T.YW_REWARD_A);
  if (addItem('item_toumorokoshi')) {
    se('se_item');
    yield* runMsg(T.YW_GOT_CORN);
  } else yield* say(T.YW_BAG_FULL);
  if (flag('flag_shikishi_done') && !flag(YF.shikishi)) {
    setFlag(YF.shikishi, 1);
    yield* say(T.YW_SHIKISHI);
  }
  const best = flag(YF.best);
  if (!best || ama < best) setFlag(YF.best, ama);
  setFlag(YF.done, 1);
  setFlag(YF.nabe, 0);
  yugeOn = false;
  addMp(2);
  se('se_item');
  yield* runMsg(T.YW_REWARD);
}

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.yuwaka(step = 'hari', stage = 'h1')（'h1' トマトの 灯り・'h2' よびごえ・'h0' 灯りの 前）
 *   'hari'    シゲじいと スギばあの 家、貼り紙の 前 (3,2) 左向き
 *   'tokei'   貼り紙を 読んだ あと、目覚まし時計の 前 (8,3) 上向き
 *   'yoshie'  貼り紙を 読んだ あと、集会所の ぴょん夫人の 前 (3,5) 左向き（話すと 2〜3）
 *   'nabe'    なべを かけた あと、集会所の 出口の 手前 (5,9) 下向き（出ようと すると とめられる）
 *   'ura'     わいた あと、家の 勝手口の 前 (10,4) 右向き
 *   'hata'    わいた あと、裏の 畑の 西の はし (1,5)
 *   'tori'    わいた あと、とりごろの 株 (6,2) の 前 (6,3) 上向き
 *   'run'     2本 もいだ あと、畑の 西の はし（歩数 0）
 *   'back'    2本 もいで 歩数 40、集会所の ぴょん夫人の 前（話すと 5〜7）
 *   'after'   すんだ あと、無人販売所の ソワカの 前 (23,38) 上向き
 */
if (import.meta.env.DEV) {
  registerDebug('yuwaka', (step = 'hari', stg = 'h1') => {
    if (stg === 'h0') cmd().jump?.('ch2:', true);
    else if (stg === 'h2') cmd().jump?.('ch2:hill', true);
    else cmd().jump?.('ch2:houki', true);
    for (const id of Object.values(YF)) setFlag(id, 0);
    setFlag('flag_yw_two', 0);
    URA_KABU.forEach((_, i) => setFlag(kabuF(i), 0));
    while (state.inventory.includes('item_yw_moigi')) removeItem('item_yw_moigi');
    waitMs = 0;
    // (the observatory's key from まつ先生 fires on coming into the school with the lantern: had already)
    setFlag('flag_dome_key', 1);
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (step === 'hari') return go(MINKA2, 3, 2, 'left');
    setFlag(YF.hari, 1);
    if (step === 'tokei') return go(MINKA2, 8, 3, 'up');
    if (step === 'yoshie') return go(SCHOOL, 3, 5, 'left');
    setFlag(YF.start, 1);
    setFlag(YF.nabe, 1);
    if (step === 'nabe') return go(SCHOOL, 5, 9, 'down');
    setFlag(YF.waita, 1);
    setFlag(YF.door, 1);
    if (step === 'ura') return go(MINKA2, 10, 4, 'right');
    if (step === 'hata') return go(URA_HATA, 1, 5, 'right');
    setFlag(YF.first, 1);
    if (step === 'tori') return go(URA_HATA, 6, 3, 'up');
    setFlag(kabuF(1), 1);
    setFlag(kabuF(8), 1);
    setFlag(YF.moida, 2);
    setFlag('flag_yw_two', 1);
    giveKey('item_yw_moigi');
    setFlag(YF.steps, step === 'back' ? 40 : 0);
    if (step === 'run') return go(URA_HATA, 1, 5, 'right');
    if (step === 'back') return go(SCHOOL, 3, 5, 'left');
    removeItem('item_yw_moigi');
    setFlag(YF.done, 1);
    setFlag(YF.best, 1);
    setFlag(YF.nabe, 0);
    return go('map_hoshimidai', 23, 38, 'up');
  });

  registerDebug('ywState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(YF)) flags[k] = flag(id);
    return {
      flags,
      ama: ywAma(),
      hata: ywHataN(),
      picked: URA_KABU.map((_, i) => flag(kabuF(i))).join(''),
      items: state.inventory.filter((i) => i === 'item_yw_moigi' || i === 'item_toumorokoshi'),
      badge: !!badge && !badge.done && game.ui.widgets.includes(badge),
      map: field()?.map.id,
      panel: !!game.ui.widgets.find((w) => w instanceof CornPanel),
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines; the names without さん in the narration. */
export function ywTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足様', '平和', '17', '3人', '海ぞい', '水族館', 'いただきます'];
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
        if (/\d+:\d\d/.test(plain) || /\d+時/.test(plain)) bad.push(`${name}: time: ${plain}`);
        if ((who === 'narr' || who === 'sys') && /さん/.test(plain)) bad.push(`${name}: 地の文の さん: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('yw', T.YW_TEXTS);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('ywText', () => ywTextCheck());
