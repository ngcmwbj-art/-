// 目が、暗さに なれるまで（第3章の クリア前、段階3。げむきか 10-31 の 案5、2026-10-31 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_kurayami.ts、説明板の 絵は art/props/me_art.ts、目の 光と しゅんの まわりの 輪は world/c3dark.ts
// （c3Eyes）、みました帳の ページは ui/menu/book_kurayami.ts。新しい 地図・人・戸は ない（旧水族館の 戸は ふやさない）。
// 大写しは 使わない（その場で 板の 字が 浮かぶ）。
//
//   S18 の あと（flag_ch3_shinkai_done）から S20 で ホールに 入るまで（flag_ch3_tsugao1）。S18 の 間（グソっ君が 先を
//   歩く 場面）と クリア後は 足さない（クリア後は 明かりが つくので、板を 調べると 地の文 1行だけ）。
//   ・深海の 展示室の ケースの 前の 面に 説明板 3枚 obj_me_ita_1〜3（(14,6)・(6,8)・(20,15)。3枚目は 低い 所）。
//     読んで いない 板の 上に「！」（addMarkSource）。
//   1〔me〕まぶしい：えさの 部屋の 戸・ジオラマの 部屋の カーテンから 入りなおすと すぐ。入りなおさなくても、板を
//     調べるか、板の 前に 立つと 始まる（見落とされない。kurayami の 指示）→ flag_me_start、flag_me_on
//     （グソっ君の 目の 光が 消え、S18 の 先導〈aq.ts〉を 止めて うしろに つく。しゅんの まわりに 青白い うすい 輪が
//     だんだん 広がる＝目が なれる。真っ暗に しない）。
//   2 歩くと グソっ君の 吹き出し（段差 ないか？ ほか 3回まで。flag_me_walk）。板の 前に 立つと 板の 字の 札
//     （MePlate）：いちばん 先に「……じっと 待つと、読めそう。」、0.25 秒で うすい 字、1.4 秒で 中、2.6 秒で こい 字、
//     3.2 秒で 読めた（evt_me_read_N）。メニューや 会話の 間は 止まるだけ（字は もどらない。会議 10-31）。
//     はなれても 浮かんだ ところから 続く。
//   3 3枚（どの 順でも）：2枚目の あと グソっ君「わいも、目、大きい ほうやで」、3枚目の あと「待っとったら、…」。
//   4 部屋の 出口の 戸の 前（(1,2) か (21,16)）に 歩いて 来ると グソっ君の 決めゼリフ → 目を 開ける（flag_me_on 0）
//   5 ごほうび：朱肉 +2、みました帳③の すみ（flag_me_done）。
//   部屋を 出ると flag_me_on は 0（目を 開ける）。入りなおすと「また、目 つむっとくわ」から 続き。
//   かくし（どれも 1回）：第2章の 天文台で すばるまで 見た（flag_kanbo_n 3）→ 2枚目の あと（flag_me_dome）／
//     回廊の 伝票で 丸い 字を 読んだ（flag_c3_ji_marui）→ 3枚目の あと（flag_me_ji）／部屋を 出ずに 3枚 続けて
//     読んだ → 3枚目の あと「ええ 先頭や」（flag_me_sentou）／飼育日誌 6枚（flag_ch3_nisshi_n 6）→ 4 の あと（flag_me_nisshi）。
//
// QA：__game.cmd.kurayami(step)、meState()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import { H, W } from '../../engine/screen';
import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { field, type FieldScene } from '../../world/field';
import { registerWorldFx } from '../../world/fx';
import { addMarkSource, objAnchor } from '../../world/marks';
import { getMapDef } from '../../world/maps';
import { pgOn } from '../../world/postgame';
import { c3Eyes } from '../../world/c3dark';
import type { ExamineObj, MapObj } from '../../world/types';
import { showBubble } from '../../ui/bubble';
import { textW } from '../../ui/window';
import * as T from '../../data/text/c3_kurayami';
import '../../art/props/me_art';
import { addMp, dirTo, grace } from '../lib';
import { se } from '../ch2/compat';
import { addToMap, inCh3, say3 } from './common';

export const MF = {
  start: 'flag_me_start',
  on: 'flag_me_on',
  walk: 'flag_me_walk',
  dome: 'flag_me_dome',
  ji: 'flag_me_ji',
  sentou: 'flag_me_sentou',
  nisshi: 'flag_me_nisshi',
  done: 'flag_me_done',
} as const;
export const itaFlag = (i: number): string => `flag_me_ita_${i + 1}`;

const ROOM = 'map_c3_aq_shinkai';
/** 板（ケースの 前の 面）と、その 前の 床。 */
const BOARDS: { at: [number, number]; front: [number, number] }[] = [
  { at: [14, 6], front: [14, 7] },
  { at: [6, 8], front: [6, 9] },
  { at: [20, 15], front: [20, 16] },
];
/** 部屋の 出口の 戸の 前。 */
const EXITS = ['1,2', '21,16'];
/** 浮かぶ 時間（ms）：うすい・中・こい、読めた。 */
const STEP_MS = [250, 1400, 2600];
const FULL_MS = 3200;
/** 吹き出しを 出す 歩数（入って から）。 */
const WALK_AT = [5, 14, 26];

/** 遊べる 間：段階3、S18 の あと、S20 の 前（クリア後は 足さない）。 */
export function meOpen(): boolean {
  return (
    inCh3() &&
    !pgOn() &&
    flag('flag_ch3_stage') === 3 &&
    flag('flag_ch3_shinkai_done') > 0 &&
    !flag('flag_ch3_tsugao1') &&
    !flag('flag_ch3_clear')
  );
}

function knWith(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function* say(text: string): Co {
  if (knWith()) {
    yield* say3(text);
    return;
  }
  const t = text
    .split(/\n(?=@)/)
    .filter((p) => !p.startsWith('@npc_kanenari'))
    .join('\n');
  if (t.trim()) yield* say3(t);
}

export function meReadN(): number {
  return BOARDS.filter((_, i) => flag(itaFlag(i)) > 0).length;
}

/** この 部屋に いる 間の ようす（セーブしない：はなれても 浮かんだ ところから 続く）。 */
const st = {
  prog: [0, 0, 0],
  steps: 0,
  lastXY: '',
  /** この 回（部屋に 入って から）に 読んだ 板の 数。 */
  visit: 0,
  busy: false,
};

function frontOf(f: FieldScene): number {
  const p = f.player;
  return BOARDS.findIndex((b) => b.front[0] === p.tileX && b.front[1] === p.tileY);
}

/** 浮かび方 0..1（3だんかい。だんの 間は 0.3 秒で なめらかに）。 */
export function inkOf(ms: number): number {
  const lv = [0, 0.22, 0.5, 1];
  let k = 0;
  for (let s = 0; s < 3; s++) if (ms >= STEP_MS[s]) k = s + 1;
  if (k === 0) return 0;
  const t = Math.min(1, (ms - STEP_MS[k - 1]) / 300);
  return lv[k - 1] + (lv[k] - lv[k - 1]) * t;
}

// ================================================================ 板の 字の 札

/** 札の 上の はし（しゅんが 画面の 下に いる ときは 上へ、ほかは 会話の 窓の 所へ。しゅんに かぶせない）。 */
const PLATE_TOP = 30;
const PLATE_BOTTOM_GAP = 8;

class MePlate implements Widget {
  modal = false;
  done = false;
  board = -1;
  vis = 0;
  private shown = -1;
  private top = false;
  update(dt: number): void {
    const want = this.board >= 0;
    if (want && this.shown !== this.board) {
      this.shown = this.board;
      // where しゅん stands on the screen (HD-2D: projected), once per board
      const f = field();
      if (f) {
        const p = f.player;
        const at = f.projected(p.x, p.y - 12, p.y);
        const sy = at ? at[1] : p.y - 12 - f.camY;
        this.top = sy > H * 0.55;
      }
    }
    this.vis = Math.max(0, Math.min(1, this.vis + (want ? dt / 200 : -dt / 160)));
    if (!want && this.vis <= 0) this.done = true;
  }
  draw(g: Gfx): void {
    const f = field();
    if (!f || game.top !== f || this.shown < 0 || this.vis <= 0) return;
    const i = this.shown;
    // the board's first page (3 lines at most): the rest comes in the talk after
    const lines = T.ME_ITA[i][0];
    const ms = st.prog[i];
    const ink = inkOf(ms);
    const lw = Math.max(textW(T.ME_MATSU_LINE), ...lines.map((l) => textW(l)));
    const w = lw + 24;
    const h = 22 + lines.length * 16 + 10;
    const x = Math.round((W - w) / 2);
    const y = this.top ? PLATE_TOP : H - h - PLATE_BOTTOM_GAP;
    g.alpha(this.vis, () => {
      // the old board: a dim slate, its edge a little lighter
      g.rect(x, y, w, h, '#0E141E', 0.88);
      g.frame(x, y, w, h, '#4A5A72');
      // first, the line that says to wait (the first thing seen, 会議 10-31)
      const cap = ms >= FULL_MS - 200 ? T.ME_YOMETA_LINE : T.ME_MATSU_LINE;
      g.alpha(Math.min(1, ms / 200 + 0.4), () => g.text(cap, x + 12, y + 3, { color: '#9FB2CC' }));
      g.rect(x + 8, y + 20, w - 16, 1, '#2E3A4C');
      // the board's words, coming up: faint → middle → dark
      if (ink > 0)
        g.alpha(ink, () => {
          lines.forEach((l, k) => g.text(l, x + 12, y + 23 + k * 16, { color: '#E6ECF4' }));
        });
      // three dots: how far the eyes are along (fills as you wait)
      for (let s = 0; s < 3; s++) {
        const on = ms >= STEP_MS[s];
        g.rect(x + w - 10 - (2 - s) * 6, y + h - 6, 3, 3, on ? '#C8D6EA' : '#2E3A4C');
      }
    });
  }
}

let plate: MePlate | null = null;

function setPlate(i: number): void {
  if (i < 0) {
    if (plate) plate.board = -1;
    return;
  }
  if (!plate || plate.done || !game.ui.widgets.includes(plate)) plate = game.ui.push(new MePlate());
  plate.board = i;
}

// ================================================================ 部屋の 中の 動き

registerWorldFx({
  map: '',
  update(f: FieldScene, dt: number) {
    if (f.map.id !== ROOM) {
      if (flag(MF.on)) setFlag(MF.on, 0);
      c3Eyes.shut = false;
      c3Eyes.adapt = 0;
      st.lastXY = '';
      st.visit = 0;
      st.steps = 0;
      setPlate(-1);
      return;
    }
    const open = meOpen();
    const on = open && flag(MF.on) > 0;
    c3Eyes.shut = on;
    const p = f.player;
    const xy = `${p.tileX},${p.tileY}`;
    const moved = st.lastXY !== '' && xy !== st.lastXY;
    if (!st.lastXY) st.lastXY = xy;
    if (!f.controllable) {
      setPlate(-1);
      return;
    }
    st.busy = false;
    if (moved) st.lastXY = xy;
    const i = frontOf(f);
    if (!on) {
      setPlate(-1);
      // not started (or put away): standing in front of a board starts it
      if (open && !flag(MF.done) && moved && i >= 0) {
        st.busy = true;
        f.runScriptId('evt_me_start', ROOM);
      }
      return;
    }
    c3Eyes.adapt = Math.min(1, c3Eyes.adapt + dt / 15000);
    // his words from behind, as しゅん walks (3 at most)
    if (moved) {
      st.steps++;
      const n = flag(MF.walk);
      if (n < WALK_AT.length && st.steps >= WALK_AT[n] && knWith()) {
        setFlag(MF.walk, n + 1);
        showBubble('kanenari', T.ME_WALK[n], 1800);
      }
    }
    // in front of a board not read yet: wait, and the words come up
    if (i >= 0 && !flag(itaFlag(i))) {
      setPlate(i);
      st.prog[i] = Math.min(FULL_MS, st.prog[i] + dt);
      if (st.prog[i] >= FULL_MS) {
        st.busy = true;
        f.runScriptId(`evt_me_read_${i + 1}`, ROOM);
      }
      return;
    }
    setPlate(-1);
    // all three read: at the door out
    if (meReadN() >= 3 && !flag(MF.done) && moved && EXITS.includes(xy)) {
      st.busy = true;
      f.runScriptId('evt_me_exit', ROOM);
    }
  },
});

// ================================================================ 1 まぶしい

function* start(): Co {
  if (!meOpen() || flag(MF.done) || flag(MF.on)) return;
  const first = !flag(MF.start);
  setFlag(MF.start, 1);
  st.visit = 0;
  const f = field()!;
  const kn = f.actorById('kanenari');
  if (first && kn && knWith()) {
    // he turns to しゅん: his eyes' light on しゅん's face
    kn.dir = dirTo(kn.tileX, kn.tileY, f.player.tileX, f.player.tileY);
    f.player.dir = dirTo(f.player.tileX, f.player.tileY, kn.tileX, kn.tileY);
  }
  if (!knWith()) {
    yield* say3(T.ME_A_SOLO);
    setFlag(MF.on, 1);
    return;
  }
  if (first) {
    const pages = T.ME_A.split('\n@narr\n目の 光が、消えた。');
    yield* say3(pages[0]);
    // (his eyes shut: the light goes out before the last narration)
    setFlag(MF.on, 1);
    se('se_examine', { vol: 0.4 });
    yield 300;
    yield* say3(`@narr\n目の 光が、消えた。${pages[1]}`);
  } else {
    yield* say3(T.ME_A_AGAIN);
    setFlag(MF.on, 1);
  }
  grace();
}

registerScript('evt_me_start', function* (): Co {
  yield* start();
});

/** 入りなおした とき（えさの 部屋の 戸・ジオラマの 部屋の カーテンから）。 */
registerScript('evt_me_enter', function* (): Co {
  const f = field();
  if (!f || !meOpen() || flag(MF.done) || flag(MF.on)) return;
  const from = f.cameFrom;
  if (from !== 'map_c3_aq_esa' && from !== 'map_c3_aq_diorama') return;
  yield 400;
  yield* start();
});
addToMap(ROOM, [], ['evt_me_enter']);

// ================================================================ 2・3 説明板

for (let i = 0; i < 3; i++) {
  registerScript(`evt_me_read_${i + 1}`, function* (): Co {
    if (flag(itaFlag(i)) || !flag(MF.on)) return;
    setFlag(itaFlag(i), 1);
    setPlate(-1);
    se('se_examine', { vol: 0.5 });
    if (i === 2) yield* say3(T.ME_ITA3_PRE);
    yield* say3(T.meAgain(i));
    if (i === 1) {
      yield* say(T.ME_ITA2_KN);
      if (flag('flag_kanbo_n') >= 3 && !flag(MF.dome) && knWith()) {
        setFlag(MF.dome, 1);
        yield* say(T.ME_DOME);
      }
    }
    if (i === 2 && flag('flag_c3_ji_marui') && !flag(MF.ji) && knWith()) {
      setFlag(MF.ji, 1);
      yield* say(T.ME_ITA3_JI);
    }
    st.visit++;
    const n = meReadN();
    se('se_item', { vol: 0.4 });
    yield* say3(T.meGot(n));
    if (n >= 3) {
      yield* say(T.ME_ZENBU);
      if (st.visit >= 3 && !flag(MF.sentou) && knWith()) {
        setFlag(MF.sentou, 1);
        yield* say(T.ME_SENTOU);
      }
    }
    grace();
  });

  registerScript(`obj_me_ita_${i + 1}`, function* (): Co {
    se('se_examine');
    if (pgOn() || flag('flag_ch3_clear')) {
      yield* say3(flag(MF.done) ? T.ME_PG_DONE : T.ME_PG);
      return;
    }
    if (flag(itaFlag(i)) || flag(MF.done)) {
      yield* say3(T.meAgain(i));
      return;
    }
    if (!meOpen()) {
      yield* say3(T.ME_KURAI);
      return;
    }
    if (!flag(MF.on)) {
      yield* start();
      return;
    }
    yield* say3(T.ME_MADA);
  });
}

addToMap(ROOM, [
  ...BOARDS.map(({ at: [x, y] }, i) => ({ t: 'prop', prop: 'prop_me_ita', x, y, opts: { v: i } }) as unknown as MapObj),
  ...BOARDS.map(({ at: [x, y] }, i) => ({ t: 'obj', id: `obj_me_ita_${i + 1}`, x, y }) as unknown as MapObj),
]);

// ================================================================ 4・5 うしろを 歩く、ごほうび

registerScript('evt_me_exit', function* (): Co {
  if (!flag(MF.on) || flag(MF.done) || meReadN() < 3) return;
  const f = field()!;
  const kn = f.actorById('kanenari');
  if (kn && knWith()) {
    f.player.dir = dirTo(f.player.tileX, f.player.tileY, kn.tileX, kn.tileY);
    yield 200;
  }
  yield* say(T.ME_EXIT);
  setFlag(MF.on, 0);
  yield 400;
  yield* say3(knWith() ? T.ME_EXIT_B : T.ME_EXIT_B.replace(/^@narr\n.*\n/, '@narr\n'));
  if (flag('flag_ch3_nisshi_n') >= 6 && !flag(MF.nisshi)) {
    setFlag(MF.nisshi, 1);
    yield* say3(T.ME_NISSHI);
  }
  setFlag(MF.done, 1);
  addMp(2);
  se('se_item');
  yield* say3(T.ME_REWARD);
  grace();
});

// ================================================================ 見のがさない しるし

for (let i = 0; i < 3; i++)
  addMarkSource((f) => {
    if (f.map.id !== ROOM || !meOpen() || flag(MF.done) || flag(itaFlag(i))) return null;
    const o = getMapDef(ROOM)?.objects.find((x) => x.t === 'obj' && x.id === `obj_me_ita_${i + 1}`) as ExamineObj | undefined;
    return o ? objAnchor(f, o) : null;
  });

// ================================================================ QA

/**
 * QA: __game.cmd.kurayami(step = 'enter')（段階3、S18 の あと。jump('ch3:esa') の 状態から）
 *   'enter'  えさの 部屋の 戸から 入りなおす（〔me〕が すぐ）
 *   'curtain' ジオラマの 部屋の カーテンから 入りなおす
 *   'board'  S18 の すぐ あと、入りなおさずに 1枚目の 板の 前 (14,8) 上向き（1歩 上で 始まる）
 *   'ita1'〜'ita3' 始まった あと、その 板の 前（待つと 読める）
 *   'exit'   3枚 読んだ あと、出口の 戸の 1歩 手前 (2,2)
 *   'kakushi' かくしの 条件を ぜんぶ 立てて 'enter'
 */
if (import.meta.env.DEV) {
  registerDebug('kurayami', async (step = 'enter') => {
    // (loaded late: ch3/debug imports the scenario modules whose order index.ts keeps)
    const { jumpCh3 } = await import('./debug');
    jumpCh3('esa', true);
    for (const id of Object.values(MF)) setFlag(id, 0);
    for (let i = 0; i < 3; i++) setFlag(itaFlag(i), 0);
    st.prog = [0, 0, 0];
    st.visit = 0;
    st.steps = 0;
    const kakushi = step === 'kakushi';
    setFlag('flag_kanbo_n', kakushi ? 3 : 0);
    setFlag('flag_c3_ji_marui', kakushi ? 1 : 0);
    setFlag('flag_ch3_nisshi_n', kakushi ? 6 : 0);
    // (the jump's own field: let it settle a frame)
    await new Promise((r) => setTimeout(r, 50));
    const f = field()!;
    // (the esa room's own scene, started by the jump, would go on into the deep-sea room: stop it
    // before its talk — a cancelled task runs no finally, so give back its lock)
    game.scripts.clear();
    for (let k = 0; k < 4; k++) f.unlock();
    const go = (x: number, y: number, d: 'up' | 'down' | 'left' | 'right', from?: string) =>
      f.startScript(f.warpCo(ROOM, x, y, d, undefined, from));
    if (step === 'enter' || kakushi) return go(1, 2, 'right', 'map_c3_aq_esa');
    if (step === 'curtain') return go(21, 16, 'up', 'map_c3_aq_diorama');
    if (step === 'board') return go(14, 8, 'up');
    setFlag(MF.start, 1);
    setFlag(MF.on, 1);
    if (step === 'ita1') return go(14, 8, 'up');
    if (step === 'ita2') return go(5, 9, 'right');
    if (step === 'ita3') return go(19, 16, 'right');
    for (let i = 0; i < 3; i++) setFlag(itaFlag(i), 1);
    return go(2, 2, 'left');
  });

  registerDebug('meState', () => {
    const f = field();
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(MF)) flags[k] = flag(id);
    return {
      flags,
      read: [0, 1, 2].map((i) => flag(itaFlag(i))),
      open: meOpen(),
      prog: [...st.prog],
      eyes: { ...c3Eyes },
      plate: plate && !plate.done ? { board: plate.board, vis: plate.vis } : null,
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      kn: (() => {
        const kn = f?.actorById('kanenari');
        return kn ? [kn.tileX, kn.tileY, kn.dir, !!kn.data.guide] : null;
      })(),
      controllable: f?.controllable,
    };
  });
}
