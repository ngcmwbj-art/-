// 明日の 朝の 氷（第3章の クリア前、段階2。げむきか 10/24 の 案2、2026-10-24 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_kori.ts、新しい 地図は data/maps/c3_kori.ts（氷の 蔵）、絵は art/props/kori_art.ts、
// みました帳の ページは ui/menu/book_kori.ts。調べ物（$SP/research/koori.md）に 合わせた 直しは 文の ファイルの 頭。
//
//   段階1（S07 の あと〜S12）：前ぶれ。荷さばき場の 製氷機 (39–40,19)（氷が 宙で 止まる。グソっ君「浮いとる」）→
//     市場の 中の ツグミに 話すと、いつもの 文の あと「サイレンが 鳴り終わったら」（1回）。蔵の 戸の 札『製氷中』。
//   段階2、S13 の あと（flag_ch3_got_gochisou）から S14 の 前まで（flag_ch3_truck_trap）：
//   ・市場の 口の ゲン (9,24)・ツグミ (12,24)：いつもの〔c2〕の あと、もう 1回 話すと〔kori〕（flag_kr_start）。
//     遊べる あいだ、ゲンの 頭の 上に「！」（addMarkSource）。始まった あとは 蔵の 戸の 上に「！」。
//   ・暗転で 蔵の 戸の 前 (45,24)（2人も そこへ）→ 135キロ → 戸の 暗転で map_c3_kori (7,8)。
//   ・蔵：息が 白い、グソっ君に 防寒着（よろいの 上に よろい）、機械の 決まり。
//   ・角氷 3本（1本ずつ）：積み場 (1–4,2) を 調べる → 鉤で 引いて 氷道の 口 (2,4)。分かれ道 A (4,4)・B (7,7) と
//     止め板 (8,4)・(9,7) を しゅんが 動かす → プッシャー (1,4) の レバー → ツグミの 合図（だんだん 大きく）→
//     角氷は 氷道を すべって、砕く 機械の 口 (14,4) まで つながって いれば 砕ける。行き止まり (7,6) か、
//     下りた 止め板の 前で 止まったら、ゲン「……もどすか。」で 口へ もどす（何度でも。失敗に しない）。
//     すべる 先に しゅん（グソっ君）が いたら ゲン「前に 立つな！」で 1歩 よける。
//     1本目 まっすぐ・2本目 ゲンが 分かれ道を 2つ 変える・3本目 分かれ道と 止め板 2つ（2か所 直す）。
//     苦手な 人の 逃げ道：蔵の ゲンに 2回 話すか、1回 止めて しまうと「わしが、道を 合わせるか？」。
//   ・3本 すんだら 暗転で 荷さばき場（砕いた 氷の 山）→ 明日の 朝 → 朱肉 +2、『かち割り』2つ、帳面③の すみ。
//   ・かくし：3本目を もどさず 手伝いなしで（ゲン「……ええ 手じゃ」）、来た マサル（荷さばき場へ）、
//     『かち割り』を 持って 食堂かもめの 前の ナミエ。
//   S15 から 先と クリア後は 足さない（蔵の 戸は 札『本日 休み』だけ）。
//
// QA：__game.cmd.kori(step)、krState()、krSolve()、krText()

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import { measure } from '../../engine/font';
import { animate, ease } from '../../engine/tween';
import { addItem, flag, setFlag, state, type Dir } from '../../game/state';
import { registerDebug } from '../../debug';
import { despawn, registerScript, spawn, walk } from '../../world/api';
import { fxAt, registerWorldFx } from '../../world/fx';
import { getMapDef, registerMap } from '../../world/maps';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field, type FieldScene } from '../../world/field';
import type { Actor } from '../../world/actor';
import { SPEAKERS } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { actorAnchor, addMarkSource } from '../../world/marks';
import type { MapObj } from '../../world/types';
import * as T from '../../data/text/c3_kori';
import { fillNames } from '../../data/text/c3_names';
import { KORI, KR_BUNKI, KR_GORYU, KR_HIKI, KR_ITA, KR_KUCHI, KR_RAIL, KR_SAIHYO } from '../../data/maps/c3_kori';
import { itaImg, kakuImg } from '../../art/props/kori_art';
import { addMp } from '../lib';
import { se } from '../ch2/compat';
import { addToMap, c3Stage, inCh3, kitaComeIn, kitaGoOut, say3 } from './common';

export const KRF = {
  pre: 'flag_kr_pre',
  tsugumi1: 'flag_kr_tsugumi1',
  c2: 'flag_kr_c2',
  start: 'flag_kr_start',
  /** 蔵の 戸の 前の 場面の あいだ（2人が 戸の 前に 立つ）。 */
  to: 'flag_kr_to',
  inn: 'flag_kr_in',
  coat: 'flag_kr_coat',
  /** 砕いた 本数（0〜3）。 */
  n: 'flag_kr_n',
  /** 角氷：0 ない、1 氷道の 口、2 どこかで 止まっている（bx・by）。 */
  blk: 'flag_kr_blk',
  bx: 'flag_kr_bx',
  by: 'flag_kr_by',
  sw0: 'flag_kr_sw_0',
  sw1: 'flag_kr_sw_1',
  ita0: 'flag_kr_ita_0',
  ita1: 'flag_kr_ita_1',
  /** プッシャーを 押した 回数（帳面）。 */
  push: 'flag_kr_push',
  /** その 本で 止めて しまった 回数・ゲンに ヒントを 聞いた・もどした・手伝って もらった。 */
  miss: 'flag_kr_miss',
  hint: 'flag_kr_hint',
  modo: 'flag_kr_modo',
  help: 'flag_kr_help',
  bunki1: 'flag_kr_bunki1',
  ita1st: 'flag_kr_ita1st',
  modoHint: 'flag_kr_modohint',
  hiku1: 'flag_kr_hiku1',
  aizuKn: 'flag_kr_aizu_kn',
  /** 荷さばき場の 場面の あいだ（2人が 製氷機の 前に 立つ）。 */
  asa: 'flag_kr_asa',
  done: 'flag_kr_done',
  eete: 'flag_kr_eete',
  masaru: 'flag_kr_masaru',
  namie: 'flag_kr_namie',
  after: 'flag_kr_after',
} as const;

export const KACHIWARI = 'item_c3_kachiwari';
const UMIZOI = 'map_umizoi';
const SERI = 'npc_c3_seri';
const DESHI = 'npc_c3_seri_deshi';
const MASARU = 'npc_hoshi_gen';
const SW_F = [KRF.sw0, KRF.sw1];
const ITA_F = [KRF.ita0, KRF.ita1];
/** 町の 蔵の 戸（港の 倉庫の 西の はし）と、その 前。 */
const TO: [number, number] = [45, 23];
/** 荷さばき場の 砕いた 氷の 山（製氷機の 南）。 */
const YAMA: [number, number] = [40, 20];

const DV: Record<string, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const OPP: Record<string, string> = { N: 'S', S: 'N', E: 'W', W: 'E' };

function knWith(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** グソっ君の いない 行を 抜く。 */
function trim(text: string): string {
  if (knWith()) return text;
  return text
    .split(/\n(?=@)/)
    .filter((p) => !p.startsWith('@npc_kanenari'))
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

/** 遊べる：段階2、S13 の あと、S14 の 前。 */
export function krOpen(): boolean {
  return inCh3() && !pgOn() && c3Stage() === 2 && flag('flag_ch3_got_gochisou') > 0 && !flag('flag_ch3_truck_trap');
}

/** 蔵に 入れる：始まって、すむ 前。 */
export function krDoor(): boolean {
  return krOpen() && flag(KRF.start) > 0 && !flag(KRF.done);
}

/** 市場の 口の 2人が 蔵へ 行っている（町の 地図では 見えない）。 */
function krAway(): boolean {
  return krOpen() && flag(KRF.start) > 0 && !flag(KRF.done);
}

// ================================================================ 町の 物

{
  const def = getMapDef(UMIZOI);
  if (def) {
    // the small iron door at the harbour store's west end: a door cell (the picture: art/props/c3_bld.ts)
    const r = def.rows[TO[1]];
    if (r && r[TO[0]] === 'W') {
      def.rows[TO[1]] = r.slice(0, TO[0]) + 'D' + r.slice(TO[0] + 1);
    }
    // ゲン and ツグミ at the auction floor's mouth are in the cold store meanwhile
    for (const o of def.objects) {
      if (o.t !== 'npc' || (o.id !== SERI && o.id !== DESHI)) continue;
      const c = (o.cond ?? {}) as Record<string, unknown>;
      if (c.stage !== 2) continue;
      const prevWhen = c.when as (() => boolean) | undefined;
      o.cond = { ...c, when: () => (!prevWhen || prevWhen()) && !krAway() } as MapObj['cond'];
    }
    registerMap(def);
  }
}

const NPC = (o: Record<string, unknown>): MapObj => ({ t: 'npc', ...o }) as unknown as MapObj;
addToMap(UMIZOI, [
  { t: 'door', id: 'door_c3_kori', x: TO[0], y: TO[1], to: KORI, tx: 7, ty: 8, dir: 'up', se: 'se_c3_aq_reizo', cond: { when: krDoor } } as unknown as MapObj,
  { t: 'obj', id: 'obj_kr_to', x: TO[0], y: TO[1], script: 'obj_kr_to', face: 'up', cond: { when: inCh3 } } as unknown as MapObj,
  { t: 'obj', id: 'obj_kr_seihyo', x: 39, y: 19, w: 2, script: 'obj_kr_seihyo', face: 'up', cond: { when: inCh3 } } as unknown as MapObj,
  // after the three: the crushed ice heaped under the ice machine (stage 2 only: by the next morning it is on the boats)
  { t: 'prop', prop: 'prop_kr_yama', x: YAMA[0], y: YAMA[1], solid: [0, 0, 1, 1], cond: { when: () => inCh3() && !pgOn() && c3Stage() === 2 && flag(KRF.done) > 0 } } as unknown as MapObj,
  { t: 'obj', id: 'obj_kr_yama', x: YAMA[0], y: YAMA[1], script: 'obj_kr_seihyo', cond: { when: () => inCh3() && !pgOn() && c3Stage() === 2 && flag(KRF.done) > 0 } } as unknown as MapObj,
  // the two in the scenes: at the cold store's door, and at the ice machine after
  NPC({ id: 'kr_gen_to', sprite: SERI, x: 44, y: 24, dir: 'right', script: 'kr_scene', cond: { when: () => flag(KRF.to) > 0 } }),
  NPC({ id: 'kr_tsugumi_to', sprite: DESHI, x: 46, y: 24, dir: 'left', script: 'kr_scene', cond: { when: () => flag(KRF.to) > 0 } }),
  NPC({ id: 'kr_gen_asa', sprite: SERI, x: 39, y: 21, dir: 'right', script: 'kr_scene', cond: { when: () => flag(KRF.asa) > 0 } }),
  NPC({ id: 'kr_tsugumi_asa', sprite: DESHI, x: 41, y: 21, dir: 'left', script: 'kr_scene', cond: { when: () => flag(KRF.asa) > 0 } }),
]);

// ================================================================ 蔵の 物

const inKura = () => inCh3() && flag(KRF.start) > 0 && !flag(KRF.done);
addToMap(KORI, [
  ...KR_BUNKI.map((b, k) => ({ t: 'prop', prop: 'prop_kr_bunki', x: b.x, y: b.y, opts: { k } }) as unknown as MapObj),
  ...KR_BUNKI.map((b, k) => ({ t: 'obj', id: `obj_kr_bunki_${k}`, x: b.x, y: b.y, flat: true, script: 'obj_kr_bunki' }) as unknown as MapObj),
  ...KR_ITA.map(([x, y], k) => ({ t: 'obj', id: `obj_kr_ita_${k}`, x, y, flat: true, script: 'obj_kr_ita' }) as unknown as MapObj),
  { t: 'obj', id: 'obj_kr_tsumiba', x: 1, y: 2, w: 4, script: 'obj_kr_tsumiba', face: 'up' } as unknown as MapObj,
  { t: 'obj', id: 'obj_kr_pusher', x: 1, y: 4, script: 'obj_kr_pusher' } as unknown as MapObj,
  { t: 'obj', id: 'obj_kr_saihyoki', x: 14, y: 3, h: 3, script: 'obj_kr_saihyoki' } as unknown as MapObj,
  { t: 'obj', id: 'obj_kr_ondokei', x: 10, y: 1, script: 'obj_kr_ondokei', face: 'up' } as unknown as MapObj,
  { t: 'obj', id: 'obj_kr_kakekugi', x: 12, y: 1, w: 2, script: 'obj_kr_kakekugi', face: 'up' } as unknown as MapObj,
  NPC({ id: 'kr_gen', sprite: SERI, x: 5, y: 8, dir: 'up', script: 'kr_gen', cond: { when: inKura } }),
  NPC({ id: 'kr_tsugumi', sprite: DESHI, x: 13, y: 6, dir: 'left', script: 'kr_tsugumi', cond: { when: inKura } }),
]);

// ================================================================ 見のがさない しるし

addMarkSource((f) => {
  if (f.map.id !== UMIZOI || !krOpen() || flag(KRF.start) || flag(KRF.to)) return null;
  const a = f.actorById(SERI);
  return a && a.visible ? actorAnchor(a) : null;
});
addMarkSource((f) => {
  if (f.map.id !== UMIZOI || !krDoor() || flag(KRF.to) || flag(KRF.asa)) return null;
  const foot = (TO[1] + 1) * 16;
  return { x: TO[0] * 16 + 8, y: foot - 28, foot };
});

// ================================================================ 氷道

interface Route {
  path: [number, number][];
  end: 'crush' | 'hashi' | 'ita';
}

/** 氷道の 口から、今の 分かれ道・止め板で 角氷が すべる 道。 */
export function route(): Route {
  let [x, y] = KR_KUCHI;
  let dir = 'E';
  const path: [number, number][] = [];
  for (let n = 0; n < 40; n++) {
    const [dx, dy] = DV[dir];
    const nx = x + dx;
    const ny = y + dy;
    if (nx === KR_SAIHYO[0] && ny === KR_SAIHYO[1]) return { path, end: 'crush' };
    const ends = KR_RAIL[`${nx},${ny}`];
    const from = OPP[dir];
    if (!ends || !ends.includes(from)) return { path, end: 'hashi' };
    const ita = KR_ITA.findIndex(([ix, iy]) => ix === nx && iy === ny);
    if (ita >= 0 && flag(ITA_F[ita])) return { path, end: 'ita' };
    x = nx;
    y = ny;
    path.push([x, y]);
    const b = KR_BUNKI.findIndex((s) => s.x === x && s.y === y);
    if (b >= 0) {
      const s = KR_BUNKI[b];
      dir = from === s.trunk ? s.to[flag(SW_F[b]) ? 1 : 0] : s.trunk;
    } else if (x === KR_GORYU.x && y === KR_GORYU.y) dir = KR_GORYU.trunk;
    else {
      const out = [...ends].filter((d) => d !== from);
      if (!out.length) return { path, end: 'hashi' };
      dir = out[0];
    }
  }
  return { path, end: 'hashi' };
}

/** 段ごとに ゲンが 置く 道（1本目 そのまま、2本目 分かれ道 2つ、3本目 分かれ道 2つと 止め板 2つ）。 */
function setRound(n: number): void {
  setFlag(KRF.sw0, n >= 1 ? 1 : 0);
  setFlag(KRF.sw1, n >= 1 ? 1 : 0);
  setFlag(KRF.ita0, n >= 2 ? 1 : 0);
  setFlag(KRF.ita1, n >= 2 ? 1 : 0);
  for (const f of [KRF.miss, KRF.hint, KRF.modo, KRF.help]) setFlag(f, 0);
}

/** 手伝い：口まで つながる 道（まっすぐ：分かれ道 A を 東、止め板 1 を 上げる）。 */
function awaseru(): void {
  setFlag(KRF.sw0, 0);
  setFlag(KRF.ita0, 0);
}

// ================================================================ 蔵の 中の 動く 物（角氷・止め板）

const KAKU = 'kr_kaku';

function makeKaku(f: FieldScene, x: number, y: number): Actor {
  const a = spawn(KAKU, x, y, { sprite: 'npc_cart', dir: 'down' });
  a.shadowH = 0;
  a.bw = 14;
  a.data.noSpace = true;
  a.drawFn = (g, sx, sy) => {
    const img = kakuImg();
    g.img(img, sx - 8, sy - 15, a.alpha < 1 ? { alpha: a.alpha } : {});
  };
  void f;
  return a;
}

/** 地図に 入った とき・ロードの あと：止め板と 角氷を 旗の とおりに 置く。 */
function ensure(f: FieldScene): void {
  if (f.map.id !== KORI || !inCh3()) return;
  KR_ITA.forEach(([x, y], i) => {
    const id = `kr_ita_${i}`;
    let a = f.actorById(id);
    if (!a) {
      a = spawn(id, x, y, { sprite: 'npc_cart', dir: 'down' });
      a.shadowH = 0;
      a.data.noSpace = true;
      a.drawFn = (g, sx, sy) => g.img(itaImg(!!flag(ITA_F[i])), sx - 8, sy - 16);
    }
    a.solid = !!flag(ITA_F[i]);
  });
  const b = f.actorById(KAKU);
  const want = flag(KRF.blk) > 0 && !flag(KRF.done);
  if (want && !b) {
    const [x, y] = flag(KRF.blk) === 1 ? KR_KUCHI : [flag(KRF.bx), flag(KRF.by)];
    makeKaku(f, x, y);
  } else if (!want && b && !b.data.moving) despawn(KAKU);
}

/** グソっ君の 防寒着と、白い 息（蔵の 中）。 */
registerWorldFx({
  map: KORI,
  anchored: true,
  update(f) {
    ensure(f);
  },
  draw(f, g, cx, cy, layer) {
    if (layer !== 'glow' || !inCh3()) return;
    const who: Actor[] = [f.player];
    if (f.follower?.visible) who.push(f.follower);
    who.forEach((a, i) => {
      const at = actorAnchor(a);
      if (a === f.follower && flag(KRF.coat)) {
        // the padded navy coat over his shoulders (on top of the shell)
        const [sx, sy] = fxAt(f, at.x, at.y + 16, cx, cy, at.foot);
        const X = Math.round(sx);
        const Y = Math.round(sy);
        g.rect(X - 7, Y, 15, 7, '#2F4A8A');
        g.rect(X - 7, Y, 15, 1, '#4A6AB0');
        g.rect(X - 1, Y + 1, 2, 6, '#1F3266');
        g.rect(X - 7, Y + 3, 15, 1, '#1F3266');
      }
      // the breath: a small white puff now and then, rising and fading
      const ph = ((f.t + i * 900) % 2600) / 2600;
      if (ph > 0.4) return;
      const u = ph / 0.4;
      const [bx, by] = fxAt(f, at.x + (a.dir === 'left' ? -5 : a.dir === 'right' ? 5 : 2), at.y + 10 - u * 6, cx, cy, at.foot);
      const al = 0.55 * (1 - u);
      g.rect(Math.round(bx), Math.round(by), 3, 2, '#FFFFFF', al);
      g.rect(Math.round(bx) + 1, Math.round(by) - 1, 2, 1, '#FFFFFF', al * 0.8);
    });
  },
});

/** 1マスずつ すべらせる（px/s）。 */
function* slide(a: Actor, path: [number, number][], speed: number): Co {
  a.data.moving = true;
  for (const [x, y] of path) {
    const x0 = a.x;
    const y0 = a.y;
    const x1 = x * 16 + 8;
    const y1 = y * 16 + 16;
    const d = Math.hypot(x1 - x0, y1 - y0);
    yield* animate(Math.max(40, (d / speed) * 1000), (u) => {
      a.x = x0 + (x1 - x0) * u;
      a.y = y0 + (y1 - y0) * u;
    }, ease.linear);
  }
  a.data.moving = false;
}

/** だれかが この マスたちに 立っていたら、1歩 よける（「前に 立つな！」）。 */
function* yokeru(tiles: [number, number][]): Co {
  const f = field();
  if (!f) return;
  const on = (x: number, y: number) => tiles.some(([tx, ty]) => tx === x && ty === y);
  const rail = (x: number, y: number) => !!KR_RAIL[`${x},${y}`];
  const free = (x: number, y: number) => {
    const row = f.map.def.rows[y];
    return !!row && row[x] === '.' && !on(x, y) && !rail(x, y);
  };
  const p = f.player;
  const pin = on(p.tileX, p.tileY);
  const fo = f.follower && f.follower.visible ? f.follower : null;
  const fin = !!fo && on(fo.tileX, fo.tileY);
  if (!pin && !fin) return;
  yield* say3(T.KR_MAE);
  const near = (x: number, y: number): [number, number] | null => {
    for (let r = 1; r <= 4; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) + Math.abs(dy) !== r) continue;
          if (free(x + dx, y + dy)) return [x + dx, y + dy];
        }
    return null;
  };
  if (pin) {
    const to = near(p.tileX, p.tileY);
    if (to) {
      // one step at a time along the axis (no diagonal through a block)
      const steps: [number, number][] = [];
      if (to[0] !== p.tileX) steps.push([to[0], p.tileY]);
      steps.push(to);
      const okSteps = steps.every(([x, y]) => (x === to[0] && y === to[1]) || !f.actorOnTile(x, y));
      if (okSteps) yield* walk('player', steps, { speed: 4 });
      else {
        p.x = to[0] * 16 + 8;
        p.y = to[1] * 16 + 16;
      }
    }
  }
  if (fo && on(fo.tileX, fo.tileY)) {
    const to = near(p.tileX, p.tileY);
    if (to) {
      fo.x = to[0] * 16 + 8;
      fo.y = to[1] * 16 + 16;
      f.trail = [];
    }
  }
  yield 150;
}

/** 積み場から 1本 引く。 */
function* hiku(): Co {
  const f = field();
  if (!f) return;
  const path: [number, number][] = [
    [KR_HIKI[0], KR_HIKI[1] + 1],
    KR_KUCHI,
  ];
  yield* yokeru(path);
  yield* say(knWith() ? T.KR_HIKU_KN : T.KR_HIKU_GEN);
  const a = makeKaku(f, KR_HIKI[0], KR_HIKI[1]);
  a.solid = false;
  a.data.moving = true;
  se('se_cart_rattle', { vol: 0.6, pitch: 0.6 });
  yield* slide(a, path, 22);
  a.solid = true;
  se('se_c3_nidai_gata', { vol: 0.5 });
  setFlag(KRF.blk, 1);
  if (!flag(KRF.hiku1) && knWith()) {
    setFlag(KRF.hiku1, 1);
    yield* say(T.KR_HIKU_KN_1);
  }
}

/** プッシャーで 押す。 */
function* osu(): Co {
  const f = field();
  const a = f?.actorById(KAKU);
  if (!f || !a || flag(KRF.blk) !== 1) return;
  if ((yield* say3(T.KR_PUSH_ASK)) !== 0) return;
  const r = route();
  yield* yokeru(r.path);
  const n = flag(KRF.n);
  yield* say3(T.KR_AIZU[Math.min(2, n)]);
  if (n >= 2 && !flag(KRF.aizuKn) && knWith()) {
    setFlag(KRF.aizuKn, 1);
    yield* say(T.KR_AIZU_KN);
  }
  yield* say(knWith() ? T.KR_LEVER_KN : T.KR_LEVER_GEN);
  setFlag(KRF.push, flag(KRF.push) + 1);
  se('se_c3_nidai_gata', { vol: 0.6 });
  se('se_cart_rattle', { vol: 0.8 });
  setFlag(KRF.blk, 0);
  yield* slide(a, r.path, 110);
  if (r.end === 'crush') {
    // into the mouth: half a tile on, shrinking away, the grinding
    const x0 = a.x;
    a.data.moving = true;
    se('se_c3_nidai_gata', { vol: 0.7, pitch: 0.8 });
    for (let k = 0; k < 6; k++) setTimeout(() => se('se_c3_kori', { vol: 0.9, pitch: 0.7 + (k % 3) * 0.1 }), k * 110);
    yield* animate(500, (u) => {
      a.x = x0 + 10 * u;
      a.alpha = 1 - u;
    }, ease.linear);
    despawn(KAKU);
    yield* say3(T.KR_GARI);
    const done = n + 1;
    setFlag(KRF.n, done);
    yield* say3(T.KR_KAZU[n]);
    yield* nextRound(done);
    return;
  }
  // stopped: at the end of the road, or before a gate that is down
  se('se_c3_nidai_gata', { vol: 0.6, pitch: 0.9 });
  const [bx, by] = r.path.length ? r.path[r.path.length - 1] : KR_KUCHI;
  setFlag(KRF.bx, bx);
  setFlag(KRF.by, by);
  setFlag(KRF.blk, r.path.length ? 2 : 1);
  setFlag(KRF.miss, flag(KRF.miss) + 1);
  yield* say3(r.end === 'ita' ? T.KR_TOMARU_ITA : T.KR_TOMARU_HASHI);
  yield* modosuAsk();
}

/** ゲン「……もどすか。」 */
function* modosuAsk(): Co {
  const f = field();
  const a = f?.actorById(KAKU);
  if (!f || !a || flag(KRF.blk) !== 2) return;
  if ((yield* say3(T.KR_MODOSU_ASK)) !== 0) {
    if (!flag(KRF.modoHint)) {
      setFlag(KRF.modoHint, 1);
      yield* say3(T.KR_MODOSU_HINT);
    }
    return;
  }
  setFlag(KRF.modo, flag(KRF.modo) + 1);
  // pulled back with the hook: it fades, and is at the road's mouth
  se('se_cart_rattle', { vol: 0.5, pitch: 0.6 });
  yield* animate(300, (u) => (a.alpha = 1 - u), ease.linear);
  if (f.player.tileX === KR_KUCHI[0] && f.player.tileY === KR_KUCHI[1]) yield* yokeru([KR_KUCHI]);
  a.x = KR_KUCHI[0] * 16 + 8;
  a.y = KR_KUCHI[1] * 16 + 16;
  yield* animate(300, (u) => (a.alpha = u), ease.linear);
  a.alpha = 1;
  setFlag(KRF.blk, 1);
  yield* say3(T.KR_MODOSU);
}

/** 1本 すむ ごとに。 */
function* nextRound(done: number): Co {
  if (done === 1) {
    yield* say3(T.KR_R1);
    se('se_h_gate_hook');
    setRound(1);
    yield 200;
    se('se_h_gate_hook');
    return;
  }
  if (done === 2) {
    yield* say3(T.KR_R2);
    se('se_h_gate_hook');
    setRound(2);
    yield 200;
    se('se_c3_aq_kachi');
    se('se_c3_nidai_gata', { vol: 0.4 });
    return;
  }
  // the third: without pulling it back and without help → ゲン's words (once)
  if (!flag(KRF.modo) && !flag(KRF.help) && !flag(KRF.miss) && !flag(KRF.eete)) {
    setFlag(KRF.eete, 1);
    yield* say3(T.KR_EETE);
  }
  yield* say3(T.KR_OWARI);
  yield* asa();
}

// ================================================================ 台本

/** 1・2 市場の 口の 2人（〔kori〕）。 */
for (const who of [SERI, DESHI])
  wrap(who, function* (_ctx, orig): Co {
    // 段階1 の 前ぶれ：製氷機を 見た あと、市場の 中の ツグミ（1回）
    if (who === DESHI && inCh3() && !pgOn() && c3Stage() === 1 && onMap('map_c3_ichiba') && flag('flag_ch3_ichiba_done') && flag(KRF.pre) && !flag(KRF.tsugumi1)) {
      yield* orig();
      setFlag(KRF.tsugumi1, 1);
      yield* say3(T.KR_TSUGUMI_C1);
      return;
    }
    if (!krOpen() || !onMap(UMIZOI)) {
      yield* orig();
      return;
    }
    if (flag(KRF.done)) {
      if (who === DESHI && !flag(KRF.after)) {
        setFlag(KRF.after, 1);
        yield* say3(T.KR_AFTER);
        return;
      }
      yield* orig();
      return;
    }
    if (!flag(KRF.start)) {
      if (!flag(KRF.c2)) {
        setFlag(KRF.c2, 1);
        yield* orig();
        return;
      }
      yield* startScene();
      return;
    }
    yield* orig();
  });

function placePlayer(f: FieldScene, x: number, y: number, dir: Dir): void {
  f.player.x = x * 16 + 8;
  f.player.y = y * 16 + 16;
  f.player.dir = dir;
  f.syncFollower(true);
  f.snapCamera();
}

/** 1 氷が 落ちる → 2 蔵の 戸の 前 → 蔵へ。 */
function* startScene(): Co {
  const f = field();
  if (!f) return;
  se('se_cart_rattle', { vol: 0.5, pitch: 0.8 });
  se('se_c3_kori', { vol: 0.7 });
  yield* say(T.KR_A);
  yield* game.fadeOut(300, '#1B1733');
  setFlag(KRF.start, 1);
  setFlag(KRF.to, 1);
  placePlayer(f, TO[0], TO[1] + 1, 'up');
  f.refreshPresence();
  yield 120;
  yield* game.fadeIn(300);
  yield* say(T.KR_TO);
  se('se_c3_aq_kachi');
  yield* f.warpCo(KORI, 7, 8, 'up', 'se_c3_aq_reizo', UMIZOI);
  setFlag(KRF.to, 0);
}

registerScript('kr_scene', function* (): Co {});

/** 3 氷の 蔵（入って すぐ、1回）。 */
registerScript('evt_kr_enter', function* (): Co {
  const f = field();
  if (!f || !inCh3()) return;
  setFlag(KRF.to, 0);
  ensure(f);
  if (!inKura() || flag(KRF.inn)) return;
  setFlag(KRF.inn, 1);
  yield 300;
  yield* say3(T.KR_IN);
  if (knWith()) {
    yield* say(T.KR_IN_KN);
    setFlag(KRF.coat, 1);
  }
  yield* say3(T.KR_RULE);
  yield* say(knWith() ? T.KR_RULE_KN : T.KR_RULE_SOLO);
});

registerScript('obj_kr_tsumiba', function* (): Co {
  se('se_examine');
  if (!inKura() || flag(KRF.n) >= 3) {
    yield* say3(T.KR_TSUMIBA);
    return;
  }
  if (flag(KRF.blk) > 0) {
    yield* say3(T.KR_HIKU_ARU);
    return;
  }
  if (!flag(KRF.hiku1)) yield* say3(T.KR_TSUMIBA);
  yield* hiku();
});

registerScript('obj_kr_pusher', function* (): Co {
  se('se_examine');
  if (!inKura() || flag(KRF.blk) !== 1) {
    yield* say3(T.KR_PUSHER);
    if (inKura() && flag(KRF.blk) === 2) yield* modosuAsk();
    return;
  }
  yield* osu();
});

/** 角氷そのもの（口に あれば 押す、止まって いれば もどす）。 */
registerScript(KAKU, function* (): Co {
  if (!inKura()) return;
  if (flag(KRF.blk) === 2) {
    yield* modosuAsk();
    return;
  }
  yield* say3(T.KR_TSUMIBA);
  yield* osu();
});

/** 分かれ道（しゅんが 動かす）。 */
registerScript('obj_kr_bunki', function* (ctx: ScriptCtx): Co {
  const k = Number(String(ctx.source).replace('obj_kr_bunki_', ''));
  if (!inKura()) return;
  if (!flag(KRF.bunki1)) {
    setFlag(KRF.bunki1, 1);
    yield* say3(T.KR_BUNKI_1);
  }
  setFlag(SW_F[k], flag(SW_F[k]) ? 0 : 1);
  se('se_h_gate_hook');
  yield 120;
});

function* toggleIta(k: number): Co {
  if (!inKura()) return;
  if (!flag(KRF.ita1st)) {
    setFlag(KRF.ita1st, 1);
    yield* say3(T.KR_TOMEITA_1);
  }
  setFlag(ITA_F[k], flag(ITA_F[k]) ? 0 : 1);
  const a = field()?.actorById(`kr_ita_${k}`);
  if (a) a.solid = !!flag(ITA_F[k]);
  se('se_c3_aq_kachi');
  se('se_c3_nidai_gata', { vol: 0.35, pitch: 1.2 });
  yield 120;
}
registerScript('obj_kr_ita', function* (ctx: ScriptCtx): Co {
  yield* toggleIta(Number(String(ctx.source).replace('obj_kr_ita_', '')));
});
for (const k of [0, 1])
  registerScript(`kr_ita_${k}`, function* (): Co {
    yield* toggleIta(k);
  });

registerScript('obj_kr_saihyoki', function* (): Co {
  se('se_examine');
  yield* say3(T.KR_SAIHYOKI);
});
registerScript('obj_kr_ondokei', function* (): Co {
  se('se_examine');
  yield* say3(T.KR_ONDOKEI);
  if (knWith()) yield* say(T.KR_ONDOKEI_KN);
});
registerScript('obj_kr_kakekugi', function* (): Co {
  se('se_examine');
  yield* say3(T.KR_KAKEKUGI);
});

/** 蔵の ゲン：止まって いれば もどす。ヒント、2回目からは 手伝い（逃げ道）。 */
registerScript('kr_gen', function* (): Co {
  if (!inKura()) return;
  const n = Math.min(2, flag(KRF.n));
  if (flag(KRF.blk) === 2) {
    yield* modosuAsk();
    if (flag(KRF.blk) === 2 || n === 0) return;
  }
  if (n >= 1 && (flag(KRF.hint) || flag(KRF.miss))) {
    if ((yield* say3(T.KR_GEN_TASUKE)) === 0) {
      setFlag(KRF.help, 1);
      awaseru();
      se('se_h_gate_hook');
      se('se_c3_aq_kachi');
      yield* say3(T.KR_GEN_AWASETA);
    } else yield* say3(T.KR_GEN_JIBUN);
    return;
  }
  setFlag(KRF.hint, 1);
  yield* say3(T.KR_GEN_HINT[n]);
});

registerScript('kr_tsugumi', function* (): Co {
  yield* say3(T.KR_TSUGUMI);
});

/** 町の 蔵の 戸（調べる。開いて いれば 暗転で 入る）。 */
registerScript('obj_kr_to', function* (): Co {
  const f = field();
  if (!f) return;
  if (krDoor()) {
    yield* f.warpCo(KORI, 7, 8, 'up', 'se_c3_aq_reizo', UMIZOI);
    return;
  }
  se('se_examine');
  if (!pgOn() && c3Stage() === 1) {
    yield* say3(T.KR_DOOR_C1);
    return;
  }
  if (krOpen() && flag(KRF.done)) {
    yield* say3(T.KR_DOOR_DONE);
    return;
  }
  if (krOpen()) {
    yield* say3(T.KR_DOOR_LOCK);
    return;
  }
  yield* say3(T.KR_DOOR_YASUMI);
});

/** 荷さばき場の 製氷機（段階1 の 前ぶれ、段階2）。 */
registerScript('obj_kr_seihyo', function* (): Co {
  se('se_examine');
  if (!pgOn() && c3Stage() === 1) {
    yield* say3(T.KR_SEIHYO_C1);
    if (knWith()) yield* say(T.KR_SEIHYO_C1_KN);
    setFlag(KRF.pre, 1);
    return;
  }
  yield* say3(!pgOn() && c3Stage() === 2 && flag(KRF.done) ? T.KR_SEIHYO_DONE : T.KR_SEIHYO_C2);
});

/** 5 明日の 朝（荷さばき場）→ ごほうび。 */
function* asa(): Co {
  const f = field();
  if (!f) return;
  setFlag(KRF.done, 1);
  setFlag(KRF.asa, 1);
  yield* f.warpCo(UMIZOI, YAMA[0], YAMA[1] + 1, 'up', 'se_c3_aq_reizo', KORI);
  yield 200;
  yield* say(T.KR_ASA);
  addMp(2);
  addItem(KACHIWARI);
  addItem(KACHIWARI);
  se('se_item');
  yield* say3(T.KR_REWARD);
  if (!flag(KRF.masaru) && (yield* kitaComeIn(MASARU, UMIZOI, [[39, 24], [39, 23], [38, 23], [38, 22]], 'right'))) {
    setFlag(KRF.masaru, 1);
    yield* say3(T.KR_MASARU);
    kitaGoOut(MASARU);
  }
  yield 300;
  yield* game.fadeOut(300, '#1B1733');
  setFlag(KRF.asa, 0);
  f.refreshPresence();
  yield 100;
  yield* game.fadeIn(300);
}

/** 食堂かもめの ナミエ（かち割りを 持って、段階2、1回）。 */
wrap('npc_c3_shokudo', function* (_ctx, orig): Co {
  yield* orig();
  if (inCh3() && !pgOn() && c3Stage() === 2 && state.inventory.includes(KACHIWARI) && !flag(KRF.namie)) {
    setFlag(KRF.namie, 1);
    yield* say3(T.KR_NAMIE);
  }
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/** 今の 本の 正しい 道に 合わせる（QA）。 */
function solve(): void {
  awaseru();
  setFlag(KRF.sw1, 0);
  setFlag(KRF.ita1, 0);
}

/**
 * QA: __game.cmd.kori(step = 'start')
 *   'c1'     段階1、荷さばき場の 製氷機の 前 (40,20) 上向き（前ぶれ）
 *   'c1to'   段階1、蔵の 戸の 前 (45,24) 上向き（札『製氷中』）
 *   'start'  段階2、〔c2〕の あと、市場の 口の ゲンの 前 (9,25) 上向き（話すと〔kori〕）
 *   'in'     始まった あと、蔵の 南の 戸の 上 (7,8)（入った ときの 1回）
 *   'r0'     決まりの あと、積み場の 前 (3,3) 上向き（1本目）
 *   'r1'     1本 すんだ あと（2本目。分かれ道 2つ 変わっている）、積み場の 前
 *   'r2'     2本 すんだ あと（3本目。止め板も）、積み場の 前
 *   'push'   'r2' で 角氷を 口に 出して、プッシャーの 前 (1,3) 下向き
 *   'done'   すんだ あと、段階2 の 荷さばき場 (40,21) 上向き
 *   'namie'  すんだ あと、かち割りを 持って 食堂かもめの ナミエの 前
 */
if (import.meta.env.DEV) {
  registerDebug('kori', (step = 'start') => {
    const s1 = step === 'c1' || step === 'c1to';
    cmd().jump?.(s1 ? 'ch3:umizoi' : 'ch3:trap', true);
    for (const id of Object.values(KRF)) setFlag(id, 0);
    setFlag('flag_ch3_stage', s1 ? 1 : 2);
    if (!s1) setFlag('flag_ch3_got_gochisou', 1);
    if (!flag('flag_ch3_bin_n')) setFlag('flag_ch3_bin_n', 1);
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (step === 'c1') return go(UMIZOI, 40, 20, 'up');
    if (step === 'c1to') return go(UMIZOI, 45, 24, 'up');
    setFlag(KRF.c2, 1);
    if (step === 'start') return go(UMIZOI, 9, 25, 'up');
    setFlag(KRF.start, 1);
    if (step === 'in') return go(KORI, 7, 8, 'up');
    setFlag(KRF.inn, 1);
    setFlag(KRF.coat, 1);
    setFlag(KRF.hiku1, 1);
    const n = step === 'r1' ? 1 : step === 'r2' || step === 'push' ? 2 : 0;
    if (step === 'done' || step === 'namie') {
      setFlag(KRF.n, 3);
      setFlag(KRF.done, 1);
      setFlag(KRF.push, 4);
      if (step === 'namie') {
        addItem(KACHIWARI);
        return go(UMIZOI, 29, 17, 'up');
      }
      return go(UMIZOI, 40, 21, 'up');
    }
    setFlag(KRF.n, n);
    setRound(n);
    setFlag(KRF.push, n);
    if (step === 'push') {
      setFlag(KRF.blk, 1);
      return go(KORI, 1, 3, 'down');
    }
    return go(KORI, 3, 3, 'up');
  });

  registerDebug('krState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(KRF)) flags[k] = flag(id);
    const f = field();
    const a = f?.actorById(KAKU);
    return {
      flags,
      open: krOpen(),
      door: krDoor(),
      route: route(),
      kaku: a ? [a.tileX, a.tileY] : null,
      kachiwari: state.inventory.filter((i) => i === KACHIWARI).length,
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
    };
  });
  registerDebug('krSolve', () => {
    solve();
    return route();
  });
}

/** Every page: at most 3 lines, each at most 336 px (names filled in); no 天丼; no clock time; no さん in the narration. */
export function krTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', 'はい、ひゃくえん', '……まだ、わたしには', '氷の 床', 'ピッ！', 'あ、つい', 'おかわり、あるよ', 'もう 1杯', 'ほどよいなぁ', '暗くて しめった', '本日も、休館', 'いただきます'];
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
      for (const raw of fillNames(v).split('\n')) {
        const t = raw.trim();
        if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || !t) {
          flush();
          if (t.startsWith('@')) {
            who = t.slice(1);
            if (!SPEAKERS[who] && who !== 'narr' && who !== 'sys') bad.push(`${name}: speaker ${who}`);
          }
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
  walkT('kr', T.KR_TEXTS);
  // the three rounds can be solved (QA: each round's own setting, then the help's)
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('krText', () => krTextCheck());

/** 3つの 段の 置き方で、手伝いの 道が 口まで つながる か（tsc では 分からない 所の 点検）。 */
export function krRouteCheck(): string[] {
  const bad: string[] = [];
  const ids = Object.values(KRF);
  const keep = ids.map((id) => flag(id));
  for (let n = 0; n < 3; n++) {
    setRound(n);
    const r0 = route();
    if (n === 0 && r0.end !== 'crush') bad.push('1本目: まっすぐで 口へ 行かない');
    if (n > 0 && r0.end === 'crush') bad.push(`${n + 1}本目: 置いた まま 口へ 行く`);
    awaseru();
    if (route().end !== 'crush') bad.push(`${n + 1}本目: 手伝いで 口へ 行かない`);
  }
  ids.forEach((id, i) => setFlag(id, keep[i]));
  return bad;
}
if (import.meta.env.DEV) registerDebug('krRoute', () => krRouteCheck());
