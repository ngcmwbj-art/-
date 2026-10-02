// 夕鳴小学校の 裏庭と 学級園（map_school, 28×14。30_level_art 3.15、10_narrative 7.23、02_ch2_index #72。
// 2026-09-30 依頼主の採用：げむきかの案3「8月31日の 水やり当番」）と、公園の北の 生け垣の 裏門
// （map_town (18,0)）。
//
//   bld_sch_kousha    校舎の 裏（28×3 タイル）。1F：5年2組の 教室の 窓（カーテン、すきまに 机に
//                     あげた いすの 脚）、通用口（ひさしと 灯り）、職員室（すりガラスに 明かりと
//                     先生の 影。段階1は プリントを 持ちあげた まま 止まる、段階2は 蛍光灯が
//                     またたき、影が プリントを そろえる）、室外機（段階1は 回りかけで 止まる、
//                     段階2は 逆に 回る）、更衣室の すりガラス。2F の 窓の 下の 端。時計（5時で
//                     止まる。段階2は 秒針が 戻る）。
//   prop_sch_gakuen   学級園の 竹の 四つ目垣（辺ごとに 1つ：n／s／w／e1／e2）。
//   prop_sch_buckets  バケツ稲 10個の 列（opts.row 0–2）。穂が 出て 先が 少し 垂れ、実が
//                     つまっていく ころ（8月31日）。穂には スズメよけの 台所の 水切りネット。
//                     名札。水が 張ってある。当番の 6つは 土が 見えかけている（flag_toban_mask の
//                     ビットで 水が もどる）。段階2は 穂が 北東へ かしぐ（影も 北東：map の shadowVec）。
//   prop_sch_toban    当番表（ホワイトボード、7月21日〜8月31日の ます、シール）と 種もみの 札。
//   prop_sch_teara    手洗い場（コンクリの 流し、蛇口4つ、みかんネットの 石けん）と じょうろ2つ。
//   prop_sch_hyakuyo  百葉箱（白い よろい戸、脚4本。扉は 北向き＝こちらからは 見えない）。
//   prop_sch_pool     金網の 中の プール（東の 端から 先へ つづく）。コースロープ、ビート板、札。
//   bld_sch_souko     体育倉庫（スチールの 引き戸、南京錠、玉入れの 赤い 玉）。
//   prop_sch_cones    三角コーンの 山（段階2は 2つ 足りない）。
//   prop_sch_chalk    犬走りの チョークの けんけんぱ（平ら。段階2は 最後の 丸が 北東へ ずれる）。
//   prop_sch_uramon_in / prop_sch_uramon  裏門（中から／公園から）。
// 赤とんぼ、じょうろの 水、持っている じょうろは world の fx（events/school.ts）で 描く。
// 重い フレームごとの 全画面合成は しない：絵は 段階ごと（と 水の ビットごと）に 1回 焼いて、
// 動くのは 数十の 点だけ。

import type { Gfx } from '../../engine/gfx';
import { mix, PixelCanvas } from '../../engine/pixel';
import { ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { castRight, finish, lt, shadeRect } from './kit';
import { drainPipe, eaveShadow, facadeFoot, fillWall, glassPane, registerBuilding, wallMortar, type Bld } from './bkit';
import { flat, stand } from './pkit';
import { registerProp } from './registry';
import { printLines } from './text';
import type { PropArt, PropEnv } from './types';
import { FROG_BUCKET } from '../../data/text/school';

const pc = (w: number, h: number) => new PixelCanvas(w, h);

/** Colour of a set pixel as #rrggbb (or null when empty). */
function hexOf(p: PixelCanvas, x: number, y: number): string | null {
  if (!p.inside(x, y)) return null;
  const v = p.get(x, y);
  if (v >>> 24 === 0) return null;
  const r = v & 255;
  const g = (v >>> 8) & 255;
  const b = (v >>> 16) & 255;
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}

/** Blend `c` over what is already there (t = 0..1); on an empty pixel, just `c`. */
function blend(p: PixelCanvas, x: number, y: number, c: string, t: number): void {
  const h = hexOf(p, x, y);
  p.set(x, y, h ? mix(h, c, t) : c);
}

// ================================================================ shared state (events/school.ts)

/** What the events tell the art (one-frame values; the flags persist the rest). */
export const schRt = {
  /** A can is off its hook (the one Minato carries). */
  canTaken: false,
};

/** The six buckets of the duty (0-based 出席番号): しゅん's (7) and five more (none under the cherry). */
export const DRY_BUCKETS = [2, 7, 13, 16, 24, 28];
/** The bucket with the tree frog on its rim. */
const FROG = FROG_BUCKET;

// ================================================================ 校舎の 裏 bld_sch_kousha (0,0)

/**
 * The 48px of wall the map shows are the 1F (the rest of the building is above the screen):
 * the 2F balcony's slab along the top, tall aluminium windows with a transom, the wall's
 * foot. Canvas x ranges of the classroom windows (5年2組 is the west one), the staff room's.
 */
const CLASS_WIN: [number, number][] = [[18, 44], [50, 76], [82, 108], [116, 142], [146, 160]];
const STAFF_WIN: [number, number][] = [[258, 286], [290, 318]];
/** The transom's top, the main pane's top, the sill. */
const TR_Y = 9;
const WIN_Y = 16;
const WIN_H = 21;
/** The clock on the stairwell wall above the washing place (canvas centre). */
const CLOCK: [number, number] = [224, 16];

/** A curtain across a window: cream cloth with its folds; a gap shows the dark room. */
function curtain(p: PixelCanvas, x0: number, x1: number, y: number, h: number, seed: number, bulge: boolean): void {
  const g = x0 + 5 + (ihash(seed, 1, 8801) % Math.max(1, x1 - x0 - 10));
  for (let x = x0; x <= x1; x++) {
    if (x === g || x === g + 1) {
      // the gap: the room, a chair up on its desk (its legs in the air, the seat's edge)
      for (let j = 0; j < h; j++) p.set(x, y + j, j > h - 10 && j < h - 4 && ((x + j) & 1) ? P.ink : j === h - 11 ? P.asphalt : P.nightShade);
      continue;
    }
    const f = (x - x0) % 4;
    const c = f === 0 ? P.paperGrid : f === 3 ? P.woodLt : P.paper;
    for (let j = 0; j < h; j++) p.set(x, y + j, j === 0 ? P.woodLt : c);
    // stage 2: the hems billow out to the north-east (a lit roll along the bottom, to the right)
    if (bulge && x > x0 + (x1 - x0) / 2) {
      p.set(x, y + h - 1, P.white);
      p.set(x, y + h - 2, (x - x0) % 3 === 0 ? P.glint : P.paper);
    } else p.set(x, y + h - 1, f === 0 ? P.woodLt : P.paperGrid);
  }
}

/** A window's frame, its transom (dark glass with a glint of sky), its sill and shadow. */
function schoolWindow(b: Bld, x0: number, x1: number): void {
  const p = b.p;
  p.rect(x0 - 1, TR_Y - 1, x1 - x0 + 2, WIN_Y + WIN_H - TR_Y + 2, P.steel);
  p.hline(x0 - 1, x1, TR_Y - 1, P.concreteLt);
  p.vline(x0 - 1, TR_Y - 1, WIN_Y + WIN_H, P.concreteLt);
  glassPane(p, b.mask, x0, TR_Y, x1 - x0, WIN_Y - TR_Y - 1, { base: P.shadeDeep, glint: false });
  for (let x = x0 + 1; x < x1 - 1; x += 5) p.set(x, TR_Y + 1, P.sky);
  p.hline(x0, x1 - 1, WIN_Y - 1, P.steel);
  for (let x = x0 + 6; x < x1; x += 7) p.vline(x, TR_Y, WIN_Y - 2, P.steel);
  p.hline(x0 - 2, x1 + 1, WIN_Y + WIN_H + 1, P.white);
  p.hline(x0 - 2, x1 + 1, WIN_Y + WIN_H + 2, P.steel);
  castRight(p, x0 - 1, TR_Y - 1, x1 - x0 + 2, WIN_Y + WIN_H - TR_Y + 2, 2);
}

function kousha(b: Bld, s2: boolean): void {
  const p = b.p;
  const W = b.w;
  const bot = b.botY;
  // ---- the wall: pale cream mortar
  fillWall(p, 0, 0, W, bot, wallMortar(P.concreteLt, 3));
  // the 2F balcony's slab along the top (its lit front, its dark underside) and the shadow it throws
  for (let x = 0; x < W; x++) {
    p.set(x, 0, P.white);
    p.set(x, 1, P.concreteLt);
    p.set(x, 2, P.concrete);
    p.set(x, 3, x % 32 === 31 ? P.asphalt : P.steel);
    p.set(x, 4, P.asphalt);
  }
  eaveShadow(p, 0, 5, W, 2);
  // rain streaks down from the slab
  for (let x = 2; x < W; x++) if (ihash(x, 5, 8803) % 9 === 0) for (let j = 0; j < 3 + (x % 4); j++) shadeRect(p, x, 7 + j, 1, 1);
  // ---- 1F classroom windows (5年2組 and the room next to it): the curtains drawn
  CLASS_WIN.forEach(([x0, x1], i) => {
    schoolWindow(b, x0, x1);
    curtain(p, x0, x1 - 1, WIN_Y, WIN_H, i, s2);
    p.vline(Math.floor((x0 + x1) / 2), WIN_Y, WIN_Y + WIN_H - 1, P.steel);
  });
  // drain pipes
  drainPipe(p, 5, 5, bot - 2);
  drainPipe(p, 168, 5, bot - 2);
  drainPipe(p, 332, 5, bot - 2);
  drainPipe(p, 438, 5, bot - 2);
  // ---- 通用口 (11,2): a grey steel door, its small wired-glass window, a canopy and its lamp
  const dx = 179;
  p.rect(dx, 14, 12, bot - 17, P.steel);
  p.vline(dx, 14, bot - 4, P.concrete);
  p.vline(dx + 11, 14, bot - 4, P.asphalt);
  p.hline(dx, dx + 11, 14, P.concreteLt);
  glassPane(p, b.mask, dx + 3, 17, 6, 8, { base: P.shadeDeep, glint: true });
  for (let y = 18; y < 25; y += 2) p.hline(dx + 3, dx + 8, y, P.nightShade); // the wire in the glass
  p.rect(dx + 9, 29, 2, 3, P.concreteLt); // the handle
  p.set(dx + 9, 29, P.white);
  p.hline(dx + 1, dx + 10, 38, P.asphalt); // the kick plate
  // the canopy (a thin concrete slab) and its lamp
  p.rect(dx - 5, 8, 22, 3, P.concreteLt);
  p.hline(dx - 5, dx + 16, 8, P.white);
  p.hline(dx - 5, dx + 16, 10, P.steel);
  eaveShadow(p, dx - 4, 11, 20, 2);
  p.rect(dx + 4, 11, 4, 2, P.glint);
  // a step of concrete before it
  p.rect(dx - 2, bot - 4, 16, 3, P.concrete);
  p.hline(dx - 2, dx + 13, bot - 4, P.white);
  // ---- the stairwell: the clock (hands at 5:00), a small frosted window, the red 消火栓 box
  const [kx, ky] = CLOCK;
  p.circle(kx, ky, 7, P.ink);
  p.circle(kx, ky, 6, P.white);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.set(Math.round(kx + Math.sin(a) * 5), Math.round(ky - Math.cos(a) * 5), i % 3 ? P.concrete : P.asphalt);
  }
  p.line(kx, ky, kx, ky - 5, P.ink); // the minute hand at 12
  p.line(kx, ky, kx + 2, ky + 3, P.ink); // the hour hand at 5
  p.set(kx, ky, P.verm);
  p.set(kx - 3, ky - 4, P.glint);
  castRight(p, kx - 7, ky - 7, 15, 15, 2);
  glassPane(p, b.mask, 199, 12, 10, 16, { base: P.concreteLt, glint: false });
  p.strokeRect(198, 11, 12, 18, P.steel);
  for (let y = 14; y < 28; y += 3) p.hline(199, 208, y, P.white);
  // 消火栓
  p.rect(236, 25, 12, 13, P.verm);
  p.strokeRect(236, 25, 12, 13, P.vermShade);
  p.hline(237, 246, 26, P.vermLt);
  p.rect(239, 28, 6, 3, P.white);
  p.set(242, 33, P.gold); // its lamp
  castRight(p, 236, 25, 12, 13, 2);
  // ---- 職員室: frosted glass, lit from inside (the tubes are on)
  for (const [x0, x1] of STAFF_WIN) {
    schoolWindow(b, x0, x1);
    for (let x = x0; x < x1; x++)
      for (let y = WIN_Y; y < WIN_Y + WIN_H; y++) {
        const n = ihash(x, y, 8807) % 7;
        p.set(x, y, n === 0 ? P.concreteLt : y < WIN_Y + 3 ? P.glint : P.white);
      }
    p.vline(Math.floor((x0 + x1) / 2), WIN_Y, WIN_Y + WIN_H - 1, P.steel);
  }
  // the shelves of binders behind the east pane, soft through the frosting
  for (let x = 292; x < 317; x++) if (x % 3) p.set(x, WIN_Y + 13, P.concrete);
  for (let x = 293; x < 316; x += 2) p.set(x, WIN_Y + 12, x % 6 === 1 ? P.aqua : P.concreteLt);
  // ---- the outdoor unit (室外機) at the wall's foot (20,2), its pipes up the wall
  const ax = 321;
  p.vline(ax + 10, 12, 33, P.concreteLt);
  p.vline(ax + 11, 12, 33, P.concrete);
  p.hline(ax + 10, ax + 16, 12, P.concreteLt);
  p.rect(ax, 33, 15, 12, P.concreteLt);
  p.strokeRect(ax, 33, 15, 12, P.steel);
  p.hline(ax + 1, ax + 13, 34, P.white);
  p.circle(ax + 6, 39, 4, P.asphalt);
  p.circle(ax + 6, 39, 3, P.charcoal);
  for (let y = 35; y < 44; y += 2) p.hline(ax + 2, ax + 10, y, P.steel); // the grille over the fan
  p.rect(ax + 12, 36, 2, 7, P.concrete);
  castRight(p, ax, 33, 15, 12, 2);
  // ---- a small barred window (the science room's store) and the changing room's frosted panes
  schoolWindow(b, 344, 362);
  for (let x = 346; x < 362; x += 3) p.vline(x, WIN_Y, WIN_Y + WIN_H - 1, P.steel);
  for (const x0 of [386, 400]) {
    p.rect(x0, 12, 11, 10, P.white);
    for (let x = x0; x < x0 + 11; x++) if (ihash(x, 3, 8809) % 4 === 0) p.set(x, 13 + (x % 7), P.concreteLt);
    p.strokeRect(x0 - 1, 11, 13, 12, P.steel);
    p.hline(x0 - 1, x0 + 11, 23, P.white);
    castRight(p, x0 - 1, 11, 13, 12, 2);
  }
  // a blue plastic sign on the changing room wall (『更衣室』, too small to read) and its door
  p.rect(392, 27, 12, 4, P.navy);
  p.hline(394, 401, 28, P.aqua);
  p.rect(418, 14, 12, bot - 17, P.concrete);
  p.strokeRect(418, 14, 12, bot - 17, P.steel);
  p.rect(420, 17, 8, 7, P.white);
  // the foot of the whole wall
  facadeFoot(p, 0, bot, W, P.concrete);
}

/** The teacher's shadow on the frosted glass: [x, y, w, h, alpha] rects (canvas px). */
function teacher(env: PropEnv): [number, number, number, number, number][] {
  const s = env.stage;
  const sx = 264;
  const sy = WIN_Y;
  // stage 0 writes at the desk (a slow nod); 1 holds a print up, stopped; 2 squares a stack
  const nod = s === 0 ? Math.floor(env.mt / 1400) % 2 : 0;
  const out: [number, number, number, number, number][] = [
    [sx + 7, sy + 3 + nod, 6, 6, 0.9],
    [sx + 6, sy + 4 + nod, 8, 4, 0.45],
    [sx + 2, sy + 10, 16, WIN_H - 10, 0.9],
    [sx + 1, sy + 11, 18, WIN_H - 11, 0.4],
  ];
  if (s === 1) {
    // the arm up, a sheet of paper held to the light
    out.push([sx + 17, sy + 5, 2, 6, 0.9], [sx + 15, sy + 1, 7, 5, 0.55]);
  } else if (s === 2) {
    // both hands tapping a stack of prints on the desk
    const k = Math.floor(env.t / 240) % 6;
    const d = k === 1 ? -2 : k === 2 ? -1 : 0;
    out.push([sx + 4, sy + 12 + d, 12, 4, 0.7], [sx + 3, sy + 14 + d, 2, 3, 0.9], [sx + 15, sy + 14 + d, 2, 3, 0.9]);
  }
  return out;
}

registerBuilding({
  id: 'bld_sch_kousha',
  W: 28,
  R: 0,
  F: 3,
  band: 0,
  paint(b) {
    kousha(b, false);
  },
  stage(b, s) {
    if (s !== 2) return null;
    void b;
    // stage 2: the curtains' hems billow to the north-east
    return (p) => CLASS_WIN.forEach(([x0, x1], i) => curtain(p, x0, x1 - 1, WIN_Y, WIN_H, i, true));
  },
  over(g, x, y, env) {
    // the teacher's shadow on the staff room's glass
    for (const [rx, ry, rw, rh, a] of teacher(env)) g.rect(x + rx, y + ry, rw, rh, P.steel, a * 0.8);
    // the unit's fan: spinning (0), stopped mid-turn (1), slowly backwards (2)
    const fx = x + 327;
    const fy = y + 39;
    const s = env.stage;
    const ang = s === 1 ? 0.6 : s === 2 ? -env.t / 900 : env.mt / 90;
    for (let k = 0; k < 3; k++) {
      const a = ang + (k * Math.PI * 2) / 3;
      g.px(Math.round(fx + Math.cos(a) * 2), Math.round(fy + Math.sin(a) * 2), P.steel);
      g.px(Math.round(fx + Math.cos(a) * 1), Math.round(fy + Math.sin(a) * 1), P.concrete);
    }
    // the clock's second hand: stopped at 12 in stage 1; in stage 2 it goes back
    const a = s === 2 ? -(((env.t / 1000) % 60) / 60) * Math.PI * 2 : s === 1 ? 0 : ((env.mt / 1000) % 60) / 60 * Math.PI * 2;
    g.line(x + CLOCK[0], y + CLOCK[1], Math.round(x + CLOCK[0] + Math.sin(a) * 5), Math.round(y + CLOCK[1] - Math.cos(a) * 5), P.verm);
  },
  glow(g, x, y, env) {
    // the tubes behind the frosted glass: always on (a pale light); stage 2 they flicker
    let a = 0.3 + 0.2 * env.grade.night;
    if (env.stage === 2) {
      const k = Math.floor(env.t / 70);
      const h = ihash(k, 3, 8811) % 23;
      if (h === 0 || h === 1) a *= 0.15;
      else if (h === 2) a *= 0.55;
    }
    for (const [x0, x1] of STAFF_WIN) {
      g.rect(x + x0, y + WIN_Y, x1 - x0, 3, P.glint, Math.min(1, a * 1.3));
      g.rect(x + x0, y + WIN_Y + 3, x1 - x0, WIN_H - 3, P.white, a);
    }
    // the teacher stands between the light and the glass: no light where the shadow is
    for (const [rx, ry, rw, rh, al] of teacher(env)) if (al > 0.5) g.rect(x + rx, y + ry, rw, rh, '#000000', 1);
    // the canopy lamp over the back door (on at dusk)
    g.rect(x + 183, y + 11, 4, 2, P.glint, 0.4 + 0.4 * env.grade.night);
  },
});

// ================================================================ 学級園の 竹垣 prop_sch_gakuen

const BAMBOO = { hi: P.goldPale, mid: P.woodLt, lo: P.brassOld, node: P.wood };
const FENCE_H = 13;

/** An east–west run of 四つ目垣 along one row (canvas: w × (FENCE_H + 3), base at the bottom). */
function fenceRun(w: number, seed: number): PixelCanvas {
  const h = FENCE_H + 3;
  const p = pc(w, h);
  const base = h - 1;
  // the rails (胴縁): three bamboo poles along the run
  for (const ry of [base - 3, base - 7, base - 11]) {
    for (let x = 0; x < w; x++) {
      const node = (x + seed * 5 + ry) % 11 === 0;
      p.set(x, ry, node ? BAMBOO.node : BAMBOO.hi);
      p.set(x, ry + 1, node ? BAMBOO.node : BAMBOO.lo);
    }
  }
  // the uprights (立子) every 8px, cut just above the top rail, tied with black palm rope
  for (let x = 3; x < w - 1; x += 8) {
    const top = base - FENCE_H + (ihash(x, seed, 8821) % 2);
    for (let y = top; y <= base; y++) {
      p.set(x, y, BAMBOO.mid);
      p.set(x + 1, y, BAMBOO.lo);
    }
    p.set(x, top, BAMBOO.hi);
    p.set(x + 1, top, BAMBOO.hi);
    for (const ry of [base - 3, base - 7, base - 11]) {
      p.set(x, ry, P.ink);
      p.set(x + 1, ry + 1, P.ink);
    }
  }
  // grass at the foot
  for (let x = 0; x < w; x += 2) {
    const hh = ihash(x, seed, 8823);
    if (hh % 3) continue;
    const g = 1 + (hh >>> 4) % 3;
    for (let k = 0; k < g; k++) p.set(x + (k & 1), base - k, k === g - 1 ? P.leafYoung : P.leaf);
  }
  return p;
}

/** A north–south run seen from above: the rails end-on as a band, uprights as short posts. */
function fenceSide(h: number, seed: number): PixelCanvas {
  const p = pc(6, h + FENCE_H);
  for (let y = 0; y < h + FENCE_H; y++) {
    const yy = y - FENCE_H + 3;
    p.set(2, y, BAMBOO.hi);
    p.set(3, y, BAMBOO.mid);
    p.set(4, y, BAMBOO.lo);
    if ((yy + seed * 3) % 13 === 0) p.set(3, y, BAMBOO.node);
  }
  for (let y = FENCE_H + 1; y < h + FENCE_H; y += 8) {
    for (let k = 0; k < FENCE_H - 3; k++) {
      p.set(2, y - k, BAMBOO.mid);
      p.set(3, y - k, BAMBOO.lo);
    }
    p.set(2, y - FENCE_H + 3, BAMBOO.hi);
    p.set(3, y - FENCE_H + 3, BAMBOO.hi);
    p.set(1, y - 4, P.ink);
    p.set(4, y - 4, P.ink);
  }
  return p;
}

registerProp('prop_sch_gakuen', (opts) => {
  const side = String(opts.side ?? 'n');
  if (side === 'n' || side === 's') {
    // 12 tiles long (x1–12); the fence stands 4px up from the tile's bottom
    const run = fenceRun(12 * 16, side === 'n' ? 1 : 2);
    finish(run, { soft: true, rimEvery: 4 });
    return stand(run.toCanvas(), { cx: 96, base: 13, shadow: 12, contact: 0 });
  }
  // west (x1, y5–9), east (x12, y6–7 / y9)
  const len = side === 'w' ? 5 : side === 'e1' ? 2 : 1;
  const col = fenceSide(len * 16, side === 'w' ? 3 : 4);
  const img = col.toCanvas();
  const a: PropArt = { ox: 5, oy: len * 16 - img.height, w: img.width, h: img.height, foot: len * 16 - 2, img: () => img, shadow: 10 };
  return a;
});

// ================================================================ バケツ稲 prop_sch_buckets

/** Bucket colours by 出席番号 (the families brought their own). */
const BUCKET_COLS: [string, string, string][] = [
  [P.blue, P.navy, P.aqua],
  [P.charcoal, P.ink, P.asphalt],
  [P.verm, P.vermShade, P.vermLt],
  [P.leaf, P.leafShade, P.leafYoung],
  [P.charcoal, P.ink, P.asphalt],
  [P.gold, P.brass, P.goldPale],
  [P.concreteLt, P.steel, P.white],
];

/**
 * One bucket with its rice at canvas (cx, base): the bucket 11×9 (ink on its south and east
 * edges), a clump of thin blades fanning out of the water to ~19px above the rim, and on
 * top the ears (穂) — 8月31日：穂が 出て、先が 少し 垂れ、実が つまっていく ころ — bowing
 * over to both sides, yellow-green, their tips pale gold. Over the ears the kitchen strainer
 * net (台所の 水切りネット、スズメよけ): a loose white mesh, the grains showing through,
 * gathered round the stems with a twist tie. `dry`: the water has gone down and the mud
 * shows (the outer blades a little limp). `sway` −1/0/1 bends the ears, `ne` bows them all
 * north-east (stage 2).
 */
function bucket(p: PixelCanvas, idx: number, cx: number, base: number, dry: boolean, sway: number, ne: boolean): void {
  const [bc, bd, bl] = BUCKET_COLS[ihash(idx, 1, 8831) % BUCKET_COLS.length];
  const top = base - 9;
  const hv = ihash(idx, 2, 8833);
  // ---- the rice first (the bucket's rim and front are drawn over its foot)
  const stemTop = top - 13 - (hv % 3);
  const lean = ne ? 1 : sway;
  const blades = dry ? [P.leafDeep, P.leaf, P.leafYoung, P.goldPale] : [P.leafShade, P.leafDeep, P.leaf, P.leafYoung];
  // nine blades, back (dark) to front (light): angle off the vertical, length
  const B: [number, number][] = [[-0.9, 13], [0.95, 12], [-0.55, 17], [0.6, 16], [-0.25, 19], [0.3, 18], [0.05, 15], [-0.75, 11], [0.8, 10]];
  B.forEach(([a0, l0], k) => {
    const a = a0 + ((ihash(idx, k, 8835) % 5) - 2) * 0.05;
    const len = l0 - (ihash(idx, k + 20, 8837) % 3) - (dry && Math.abs(a0) > 0.5 ? 2 : 0);
    const col = blades[Math.min(3, Math.floor(k / 2.3))];
    for (let j = 0; j <= len; j++) {
      const t = j / len;
      // up and out, the tip bending over and down (more on a dry bucket)
      const x = cx + Math.sin(a) * j * 0.62 + Math.sign(a) * t * t * (dry ? 3 : 2) + (t > 0.5 ? lean * (t - 0.5) * 2 : 0);
      const y = top - 2 - Math.cos(a) * j + t * t * t * (dry ? 5 : 3);
      p.set(Math.round(x), Math.round(y), j < 2 ? P.leafShade : t > 0.85 && dry ? P.goldPale : col);
    }
  });
  // ---- the ears: four panicles bowing over from the tops of the stems
  const EARS: [number, number][] = [[-1, -1], [0, 1], [1, 1], [0, -1]];
  const earCols = [P.leafLt, P.leafLt, P.goldPale, P.goldPale, P.goldPale, dry ? P.brass : P.leafLt];
  const tips: [number, number][] = [];
  EARS.forEach(([ox, d0], e) => {
    const dir = ne ? 1 : d0;
    let x = cx + ox;
    let y = stemTop - (e === 3 ? 1 : 0);
    p.set(x, y + 1, P.leaf); // the neck
    for (let j = 0; j < 7; j++) {
      // up, over, and down: the arch of a ripening panicle
      if (j === 1 || j === 2 || j === 4) x += dir;
      if (j === 0) y -= 1;
      if (j >= 3) y += 1;
      if (j === 6 && e % 2 === 0) x += dir;
      p.set(x, y, earCols[Math.min(j, earCols.length - 1)]);
      // the grains stand off the arch here and there
      if ((j === 2 || j === 4) && (e + j + idx) % 2 === 0) p.set(x, y - 1, j === 2 ? P.leafLt : P.goldPale);
    }
    tips.push([x, y]);
  });
  // ---- the strainer net round the ears: a loose white mesh, only its outline and a few
  // threads opaque enough to see; the grains show through
  const xs = [cx - 5, cx + 5];
  const ny0 = stemTop - 5;
  const ny1 = stemTop + 5;
  for (let y = ny0; y <= ny1; y++)
    for (let x = xs[0]; x <= xs[1]; x++) {
      const dxn = (x + 0.5 - (cx + (ne ? 1 : 0) + 0.5)) / 5.2;
      const dyn = (y + 0.5 - (ny0 + 4.5)) / 5.4;
      const d = dxn * dxn + dyn * dyn;
      if (d > 1) continue;
      if (d > 0.72) {
        if ((x + y) % 2 === 0) blend(p, x, y, P.white, 0.55);
      } else if ((x + 2 * y) % 5 === 0) blend(p, x, y, P.white, 0.25);
    }
  // its gathered neck and the twist tie (a colour per family)
  const tie = [P.verm, P.blue, P.gold, P.leafYoung][hv % 4];
  p.set(cx - 1, ny1 + 1, P.white);
  p.set(cx + 1, ny1 + 1, P.concreteLt);
  p.set(cx, ny1 + 2, tie);
  p.set(cx - 3, ny0 + 2, P.glint);
  // ---- the bucket: body tapered 11 → 9 px, lit left, shaded right
  for (let j = 0; j < 9; j++) {
    const half = 5 - Math.floor(j / 5);
    for (let i = -half; i <= half; i++) {
      let c = i <= -half + 1 ? bl : i >= half - 1 ? bd : bc;
      if (j === 8) c = bd;
      p.set(cx + i, top + j, c);
    }
    // ink on the east edge and under it
    p.set(cx + half + 1, top + j, P.ink);
  }
  p.hline(cx - 4, cx + 5, top + 9, P.ink);
  // the handle's two lugs and the rim
  p.set(cx - 6, top + 1, bd);
  p.set(cx + 6, top + 1, bd);
  p.hline(cx - 5, cx + 5, top, bl);
  // the mouth (seen from above): water with the evening sky in it, or the drying mud
  for (let i = -4; i <= 4; i++) {
    const c = dry ? (Math.abs(i) === 4 ? P.woodDark : (i + idx) % 3 === 0 ? P.brassOld : P.woodLt) : Math.abs(i) === 4 ? P.navy : i < -1 ? P.sky : P.aqua;
    if (Math.abs(i) > 1) p.set(cx + i, top - 1, c);
    if (Math.abs(i) < 4 && Math.abs(i) > 1) p.set(cx + i, top - 2, dry ? P.woodLt : i < 0 ? P.glint : P.blue);
  }
  if (dry) {
    // cracks in the drying mud
    p.set(cx - 3, top - 1, P.woodDark);
    p.set(cx + 3, top - 2, P.woodDark);
  }
  // the name tag taped on the front (white, a scribble of a name; さや's: a small sunset)
  p.rect(cx - 3, top + 3, 6, 3, P.white);
  p.hline(cx - 3, cx + 2, top + 5, P.concreteLt);
  if (idx === 9) {
    p.set(cx - 1, top + 3, P.sun);
    p.set(cx, top + 3, P.sun);
    p.hline(cx - 2, cx + 1, top + 4, P.verm);
  } else p.hline(cx - 2, cx + ((idx % 3) - 1), top + 4, P.asphalt);
  void tips;
}

/** The frog (アマガエル) on the rim of bucket 23 (the colour of the rice). */
function frog(p: PixelCanvas, cx: number, base: number, ne: boolean): void {
  const y = base - 10;
  const x = cx + 3;
  p.set(x, y, P.leafYoung);
  p.set(x + 1, y, P.leaf);
  p.set(x + 2, y, P.leafYoung);
  p.set(x + 1, y - 1, P.leafYoung);
  p.set(ne ? x + 2 : x, y - 1, P.ink); // the eye on the side it faces
  p.set(x + 1, y + 1, P.leafDeep);
}

const BUCKET_W = 160;
const BUCKET_H = 40;
const BASE_Y = BUCKET_H - 2;

registerProp('prop_sch_buckets', (opts) => {
  const row = Number(opts.row ?? 0);
  const cache = new Map<string, HTMLCanvasElement>();
  const render = (mask: number, sway: number, ne: boolean): HTMLCanvasElement => {
    const p = pc(BUCKET_W, BUCKET_H);
    for (let c = 0; c < 10; c++) {
      const idx = row * 10 + c;
      const dry = DRY_BUCKETS.includes(idx) && !(mask & (1 << DRY_BUCKETS.indexOf(idx)));
      bucket(p, idx, c * 16 + 8, BASE_Y, dry, (c + row) % 2 ? sway : -sway, ne);
      if (idx === FROG) frog(p, c * 16 + 8, BASE_Y, ne);
    }
    return p.toCanvas();
  };
  const pick = (env: PropEnv): HTMLCanvasElement => {
    const mask = env.flag('flag_toban_mask') | 0;
    const s = env.stage;
    // the evening wind sways the ears (0), time stops them (1), stage 2 bows them north-east
    const sway = s === 1 ? 0 : s === 2 ? 0 : Math.floor((env.mt + row * 700) / 1300) % 2 ? 1 : 0;
    const key = `${mask}|${sway}|${s === 2 ? 1 : 0}`;
    let img = cache.get(key);
    if (!img) {
      img = render(mask, sway, s === 2);
      cache.set(key, img);
    }
    return img;
  };
  const first = render(0, 0, false);
  const a: PropArt = {
    ox: 0,
    oy: 16 - BUCKET_H,
    w: BUCKET_W,
    h: BUCKET_H,
    foot: 14,
    img: pick,
    shadow: 22,
    shadowImg: pick,
    contact: 0,
  };
  void first;
  return a;
});

// ================================================================ 当番表と 種もみの 札 prop_sch_toban (7,4)

registerProp('prop_sch_toban', () => {
  const W = 34;
  const H = 30;
  const mk = (sealed: boolean): HTMLCanvasElement => {
    const p = pc(W, H);
    // ---- the seed tag (7,4): a small plank on a wire, 『種もみ：星見台の 田中 様』
    p.line(4, 8, 7, 5, P.steel);
    p.line(11, 5, 13, 8, P.steel);
    p.rect(2, 8, 13, 8, P.woodLt);
    p.strokeRect(2, 8, 13, 8, P.wood);
    p.hline(3, 13, 9, P.goldPale);
    printLines(p, 4, 11, 9, 2, P.woodDark, 71, 2);
    castRight(p, 2, 8, 13, 8, 1);
    // ---- the duty board (8,4): a small whiteboard wired to the fence
    const bx = 17;
    const by = 1;
    const bw = 17;
    const bh = 20;
    p.rect(bx, by, bw, bh, P.white);
    p.strokeRect(bx, by, bw, bh, P.steel);
    p.hline(bx + 1, bx + bw - 2, by + 1, P.glint);
    // the title line (blue marker)
    p.hline(bx + 2, bx + 12, by + 3, P.navy);
    p.hline(bx + 2, bx + 7, by + 4, P.navy);
    // the grid: 7月21日 … 8月31日 (42 days: 6 rows of 7), a sticker in each; the last one white
    const stick = [P.verm, P.gold, P.blue, P.leaf, P.crimson, P.sun, P.aqua];
    for (let d = 0; d < 42; d++) {
      const gx = bx + 2 + (d % 7) * 2;
      const gy = by + 6 + Math.floor(d / 7) * 2;
      const last = d === 41;
      if (last && !sealed) {
        p.set(gx, gy, P.concreteLt);
        continue;
      }
      p.set(gx, gy, last ? P.gold : stick[ihash(d, 1, 8841) % stick.length]);
    }
    // the last square's sticker, when it is on: a little はなまる-gold flower with a red heart
    if (sealed) {
      const gx = bx + 2 + 6 * 2;
      const gy = by + 6 + 5 * 2;
      p.set(gx, gy, P.verm);
      p.set(gx - 1, gy, P.gold);
      p.set(gx, gy - 1, P.gold);
    }
    // the teacher's red line along the bottom (『穂が 出たら、水を 切らさない こと』)
    p.hline(bx + 2, bx + 13, by + 18, P.verm);
    // the wire ties onto the fence rail, a marker on a string
    p.set(bx + 1, by + bh, P.steel);
    p.set(bx + bw - 2, by + bh, P.steel);
    p.vline(bx + bw, by + 4, by + 12, P.charcoal);
    p.rect(bx + bw - 1, by + 12, 2, 5, P.navy);
    castRight(p, bx, by, bw, bh, 2);
    finish(p, { soft: true, rimEvery: 4 });
    return p.toCanvas();
  };
  const imgs = [mk(false), mk(true)];
  const a = stand(imgs[0], { cx: 16, base: 13, shadow: 0, contact: 0, foot: 13 });
  a.ox = -1;
  a.img = (env) => imgs[env.flag('flag_toban_seal') ? 1 : 0];
  return a;
});

// ================================================================ 手洗い場と じょうろ prop_sch_teara (13,4)

/** A watering can (じょうろ) hung upside down, 8×9 (canvas at x, y). */
function canHung(p: PixelCanvas, x: number, y: number, body: string, shade: string): void {
  // upside down: the rose at the bottom, the handle's arc at the top
  p.rect(x + 1, y + 1, 6, 6, body);
  p.vline(x + 6, y + 1, y + 6, shade);
  p.hline(x + 1, x + 6, y + 1, lt(body));
  p.line(x + 1, y, x + 5, y, shade); // the handle
  p.set(x, y + 1, shade);
  // the spout going down-left, the rose
  p.line(x, y + 6, x - 2, y + 8, shade);
  p.rect(x - 3, y + 8, 2, 2, lt(body));
}

registerProp('prop_sch_teara', () => {
  const W = 48;
  const H = 30;
  const mk = (cans: number): HTMLCanvasElement => {
    const p = pc(W, H);
    const base = H - 3;
    // the back pipe on its short wall, four taps along it
    p.rect(1, base - 20, W - 2, 6, P.concrete);
    p.hline(1, W - 2, base - 20, P.white);
    p.hline(1, W - 2, base - 15, P.steel);
    p.hline(1, W - 2, base - 19, P.steel);
    p.hline(1, W - 2, base - 18, P.concreteLt);
    for (let k = 0; k < 4; k++) {
      const tx = 9 + k * 10;
      p.rect(tx, base - 17, 3, 3, P.steel);
      p.set(tx, base - 17, P.white);
      p.vline(tx + 1, base - 14, base - 12, P.asphalt);
      p.hline(tx - 1, tx + 3, base - 18, P.concreteLt); // the tap's handle
    }
    // the orange mesh bag with its lemon soap, hanging from the second tap
    p.rect(20, base - 13, 3, 4, P.sun);
    p.set(21, base - 12, P.gold);
    p.set(20, base - 11, P.sunDeep);
    // the basin: a long concrete trough, its inside wet and dark, the lip lit
    p.rect(1, base - 12, W - 2, 12, P.concrete);
    p.hline(1, W - 2, base - 12, P.white);
    p.rect(3, base - 11, W - 6, 4, P.steel);
    for (let x = 3; x < W - 3; x++) {
      p.set(x, base - 11, (x & 3) === 0 ? P.aqua : P.asphalt);
      if (ihash(x, 1, 8851) % 5 === 0) p.set(x, base - 9, P.leafShade); // a little moss where it stays wet
    }
    p.hline(1, W - 2, base - 7, P.concreteLt);
    for (let y = base - 6; y < base; y++) {
      p.set(1, y, P.concreteLt);
      p.set(W - 2, y, P.steel);
    }
    // the drain: a grate at the trough's foot
    p.rect(W - 12, base - 1, 6, 2, P.charcoal);
    for (let x = W - 12; x < W - 6; x += 2) p.set(x, base - 1, P.steel);
    // the watering cans, hung upside down on hooks at the west end (the green one goes first)
    const hook = (x: number) => {
      p.set(x, base - 21, P.steel);
      p.set(x, base - 22, P.asphalt);
    };
    hook(3);
    hook(12);
    if (cans >= 2) canHung(p, 3, base - 21, P.leaf, P.leafShade);
    canHung(p, 12 - 1, base - 21, P.blue, P.navy);
    castRight(p, 1, base - 20, W - 2, 20, 2);
    finish(p, { soft: true, rimEvery: 4 });
    return p.toCanvas();
  };
  const imgs = [mk(1), mk(2)];
  const a = stand(imgs[1], { cx: 24, base: 16, shadow: 16, contact: 40 });
  // the green can is off its hook from the first filling until the sticker is on the board
  a.img = (env) => imgs[schRt.canTaken || (env.flag('flag_toban_took') > 0 && !env.flag('flag_toban_seal')) ? 0 : 1];
  a.shadowImg = () => imgs[1];
  // a drip from the fourth tap: falls (0), hangs in the air (1), drifts north-east as it falls (2)
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const tx = x + a.ox + 9 + 3 * 10 + 1;
    const ty = y + a.oy + (H - 3) - 12;
    if (env.stage === 1) {
      g.px(tx, ty + 3, P.aqua);
      return;
    }
    const k = (env.t / 900) % 1;
    const dy = Math.round(k * k * 6);
    const dx = env.stage === 2 ? Math.round(k * 3) : 0;
    if (k < 0.2) g.px(tx, ty, P.aqua);
    else g.px(tx + dx, ty + dy, P.glint);
  };
  return a;
});

// ================================================================ 百葉箱 prop_sch_hyakuyo (17,7)

registerProp('prop_sch_hyakuyo', () => {
  const W = 20;
  const H = 34;
  const p = pc(W, H);
  const base = H - 2;
  // four legs (white paint worn at the feet), a cross brace
  for (const lx of [4, 14]) {
    p.vline(lx, base - 13, base, P.concreteLt);
    p.vline(lx + 1, base - 13, base, P.steel);
    p.set(lx, base, P.concrete);
  }
  p.line(5, base - 3, 14, base - 9, P.concrete);
  // the box: louvred on every side (よろい戸) — slats slanting down and out
  const bx = 2;
  const by = base - 25;
  const bw = 16;
  const bh = 12;
  for (let y = by; y < by + bh; y++)
    for (let x = bx; x < bx + bw; x++) {
      const slat = (y - by) % 3;
      let c: string = slat === 0 ? P.white : slat === 1 ? P.concreteLt : P.steel;
      if (x === bx) c = P.white;
      if (x >= bx + bw - 2) c = slat === 0 ? P.concreteLt : P.steel;
      p.set(x, y, c);
    }
  p.strokeRect(bx, by, bw, bh, P.concrete);
  p.vline(bx + 8, by + 1, by + bh - 2, P.concrete); // the frame between the two louvred panels
  // the double roof: a gap between (the air goes through), both white, the upper one wider
  p.rect(bx - 1, by - 3, bw + 2, 2, P.white);
  p.hline(bx - 1, bx + bw, by - 1, P.steel);
  p.rect(bx - 2, by - 7, bw + 4, 3, P.white);
  p.hline(bx - 2, bx + bw + 1, by - 7, P.glint);
  p.hline(bx - 2, bx + bw + 1, by - 5, P.concrete);
  p.vline(bx + 3, by - 4, by - 3, P.steel);
  p.vline(bx + bw - 4, by - 4, by - 3, P.steel);
  // the bottom: a slatted floor, dark under it
  p.hline(bx, bx + bw - 1, by + bh, P.asphalt);
  castRight(p, bx, by, bw, bh, 2);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 8, base: 16, shadow: 30, contact: 14 });
});

// ================================================================ プール prop_sch_pool (20,4)

/** Canvas of the mesh and the pool: tiles x20–27, y4–9, plus the posts' height above. */
const PW = 128;
const PH = 108;
/** Canvas row of world y = 64 (the top of tile row 4). */
const POY = 12;
/** The water (canvas): x from the west coping to the canvas' east edge; its top and bottom. */
const WX0 = 22;
const WY0 = POY + 22;
const WY1 = POY + 74;

function meshRun(p: PixelCanvas, x0: number, x1: number, y: number, hgt = 14): void {
  const top = y - hgt;
  for (let x = x0; x <= x1; x++) {
    for (let yy = top + 2; yy < y; yy++) {
      const d1 = (((x + yy) % 4) + 4) % 4 === 0;
      const d2 = (((x - yy) % 4) + 4) % 4 === 0;
      if (d1 || d2) p.set(x, yy, d1 && d2 ? P.concreteLt : P.steel);
    }
    p.set(x, top, P.white);
    p.set(x, top + 1, P.steel);
  }
  for (let x = x0; x <= x1; x += 16) {
    p.vline(x, top - 1, y, P.concreteLt);
    p.vline(x + 1, top - 1, y, P.asphalt);
  }
  // weeds creeping up the mesh
  for (let x = x0; x <= x1; x += 3) {
    const h = ihash(x, y, 8861);
    if (h % 3) continue;
    const g = 2 + (h >>> 3) % 3;
    for (let k = 0; k < g; k++) p.set(x + (k % 2), y - 1 - k, k === g - 1 ? P.leafYoung : P.leaf);
  }
}

function meshSide(p: PixelCanvas, x: number, y0: number, y1: number, hgt = 14): void {
  for (let y = y0 - hgt; y <= y1; y++) p.set(x, y, (y & 1) === 0 ? P.steel : P.concreteLt);
  p.vline(x + 1, y0 - hgt + 1, y1, P.asphalt);
  for (let y = y0; y <= y1; y += 16) {
    p.vline(x, y - hgt - 1, y, P.concreteLt);
    p.vline(x + 1, y - hgt - 1, y, P.asphalt);
    p.set(x, y - hgt - 1, P.white);
  }
}

function poolBase(): PixelCanvas {
  const p = pc(PW, PH);
  // ---- the deck (pale concrete tiles) inside the mesh
  for (let y = POY + 6; y < PH - 12; y++)
    for (let x = 4; x < PW; x++) {
      const joint = x % 8 === 0 || (y - POY) % 8 === 0;
      p.set(x, y, joint ? P.concrete : ihash(x >> 3, y >> 3, 8863) % 5 === 0 ? P.white : P.concreteLt);
    }
  // ---- the basin: its coping (white), the far inner wall (above the water), the water
  for (let x = WX0 - 2; x < PW; x++) {
    p.set(x, WY0 - 3, P.white);
    p.set(x, WY0 - 2, P.concreteLt);
    p.set(x, WY1 + 1, P.white);
    p.set(x, WY1 + 2, P.concrete);
  }
  for (let y = WY0 - 3; y <= WY1 + 2; y++) {
    p.set(WX0 - 2, y, P.white);
    p.set(WX0 - 1, y, P.concrete);
  }
  // the far wall's inner face, a band of blue tile
  for (let x = WX0; x < PW; x++) {
    p.set(x, WY0 - 1, P.navy);
    p.set(x, WY0, (x & 3) === 0 ? P.blue : P.navy);
  }
  // the water: bright near the top (the sky), deeper below; lane lines on the bottom
  for (let y = WY0 + 1; y <= WY1; y++)
    for (let x = WX0; x < PW; x++) {
      const k = (y - WY0) / (WY1 - WY0);
      let c: string = k < 0.18 ? P.aqua : k < 0.7 ? P.blue : P.navy;
      if (((y - WY0 - 6) % 13 === 0 || (y - WY0 - 7) % 13 === 0) && x > WX0 + 6) c = k < 0.18 ? P.blue : P.navy; // lane lines
      if (ihash(x, y, 8867) % 71 === 0 && k < 0.5) c = P.glint;
      p.set(x, y, c);
    }
  // lane ropes: red and white floats across, two of them
  for (const ly of [WY0 + 17, WY0 + 35]) {
    for (let x = WX0; x < PW; x++) {
      const f = Math.floor((x - WX0) / 2) % 4;
      p.set(x, ly, f === 0 ? P.verm : f === 2 ? P.white : P.concreteLt);
      if (f === 0 || f === 2) p.set(x, ly + 1, f === 0 ? P.vermShade : P.steel);
    }
  }
  // the ladder at the west end
  for (const lx of [WX0 + 1, WX0 + 5]) p.vline(lx, WY0 - 5, WY0 + 6, P.steel);
  for (let y = WY0; y < WY0 + 7; y += 3) p.hline(WX0 + 1, WX0 + 5, y, P.concreteLt);
  // a starting block (No. 1) at the west edge
  p.rect(WX0 - 1, WY0 + 8, 5, 6, P.white);
  p.hline(WX0 - 1, WX0 + 3, WY0 + 13, P.steel);
  p.set(WX0 + 1, WY0 + 10, P.navy);
  // ---- the mesh: north run (row 4), the west side (x20), the south run (row 9)
  meshRun(p, 2, PW - 1, POY + 10);
  meshSide(p, 2, POY + 10, PH - 6);
  meshRun(p, 2, PW - 1, PH - 6);
  // ---- the signs on the south mesh: 『プール開放は 8月24日で おわりました』 and 『防火用水』
  const sy = PH - 17;
  p.rect(20, sy, 16, 8, P.white);
  p.strokeRect(20, sy, 16, 8, P.steel);
  p.hline(22, 33, sy + 2, P.navy);
  p.hline(22, 30, sy + 4, P.asphalt);
  p.hline(22, 27, sy + 6, P.verm);
  castRight(p, 20, sy, 16, 8, 1);
  p.rect(39, sy + 1, 10, 6, P.verm);
  p.strokeRect(39, sy + 1, 10, 6, P.vermShade);
  p.hline(41, 46, sy + 3, P.white);
  p.hline(41, 45, sy + 5, P.white);
  finish(p, { outline: false, rimEvery: 5 });
  return p;
}

registerProp('prop_sch_pool', () => {
  const img = poolBase().toCanvas();
  const a: PropArt = {
    ox: 0,
    oy: -POY,
    w: PW,
    h: PH,
    foot: 6 * 16 - 4,
    img: () => img,
    contact: 0,
  };
  // the water's small life: glints running across (0), a ripple pattern stopped (1),
  // the ripples crowding into the north-east corner (2); the kickboard (ビート板)
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    const X = x + a.ox;
    const Y = y + a.oy;
    const s = env.stage;
    const t = s === 1 ? 5200 : env.mt;
    for (let k = 0; k < 10; k++) {
      const h = ihash(k, 5, 8871);
      let px = WX0 + 4 + (h % (PW - WX0 - 8));
      let py = WY0 + 3 + ((h >>> 8) % (WY1 - WY0 - 6));
      const ph = (t / (900 + (h % 500)) + k * 0.37) % 1;
      if (s === 2) {
        // drifting to the north-east corner and piling up there
        px = Math.min(PW - 3, px + Math.round(ph * 30));
        py = Math.max(WY0 + 2, py - Math.round(ph * 18));
      } else px += Math.round(Math.sin(ph * Math.PI * 2) * 2);
      const len = 2 + (h >>> 16) % 3;
      if (s !== 1 && ph > 0.8) continue;
      g.rect(X + px, Y + py, len, 1, ph < 0.4 ? P.glint : P.aqua, 0.8);
    }
    // the kickboard: south-west corner (0/1), north-east corner bobbing (2)
    const bob = s === 2 ? Math.round(Math.sin(env.t / 400)) : s === 0 ? Math.round(Math.sin(env.mt / 700) * 0.6) : 0;
    const kx = s === 2 ? PW - 14 : WX0 + 8;
    const ky = s === 2 ? WY0 + 3 : WY1 - 9;
    g.rect(X + kx, Y + ky + bob, 9, 5, P.gold);
    g.rect(X + kx, Y + ky + bob, 9, 1, P.goldPale);
    g.rect(X + kx + 8, Y + ky + bob + 1, 1, 4, P.brass);
    g.rect(X + kx + 1, Y + ky + bob + 5, 8, 1, P.navy, 0.6);
  };
  return a;
});

// ================================================================ 体育倉庫 bld_sch_souko (23,10)

registerBuilding({
  id: 'bld_sch_souko',
  W: 4,
  R: 0,
  F: 2,
  top: 12,
  band: 8,
  paint(b) {
    const p = b.p;
    const W = b.w;
    const fy = b.faceY;
    const bot = b.botY;
    // the roof: a shallow steel lid seen from above, its lip
    for (let y = 0; y < fy; y++)
      for (let x = 0; x < W; x++) {
        const rib = x % 5;
        let c: string = rib === 0 ? P.concreteLt : rib === 4 ? P.steel : P.concrete;
        if (y === fy - 1) c = P.asphalt;
        if (y === 0) c = P.white;
        if (ihash(x, y, 8881) % 23 === 0) c = P.brassOld; // rust spots
        p.set(x, y, c);
      }
    // leaves caught on the roof
    for (let k = 0; k < 5; k++) {
      const h = ihash(k, 2, 8883);
      p.set(3 + (h % (W - 6)), 2 + ((h >>> 5) % (fy - 4)), k % 2 ? P.leafDeep : P.brassOld);
    }
    // the walls: pale green steel panels with ribs
    for (let y = fy; y < bot - 2; y++)
      for (let x = 0; x < W; x++) {
        const rib = x % 4;
        let c: string = rib === 0 ? P.leafLt : rib === 3 ? P.leaf : P.leafYoung;
        if (x > W - 5) c = rib === 0 ? P.leafYoung : P.leaf;
        p.set(x, y, c);
      }
    eaveShadow(p, 0, fy, W, 2);
    // two steel sliding doors, a padlock on the hasp between them
    const dx0 = 8;
    const dx1 = W - 8;
    const mid = Math.floor((dx0 + dx1) / 2);
    p.rect(dx0, fy + 4, dx1 - dx0, bot - fy - 6, P.concrete);
    for (let x = dx0; x < dx1; x += 3) p.vline(x, fy + 4, bot - 3, P.concreteLt);
    p.strokeRect(dx0, fy + 4, dx1 - dx0, bot - fy - 6, P.steel);
    p.vline(mid, fy + 4, bot - 3, P.asphalt);
    p.rect(mid - 1, fy + 13, 3, 3, P.brass);
    p.set(mid - 1, fy + 13, P.goldPale);
    p.set(mid, fy + 12, P.steel);
    // the gap at the doors' foot: a red 玉入れ ball squeezed half out
    p.set(mid + 3, bot - 4, P.verm);
    p.set(mid + 4, bot - 4, P.vermLt);
    p.set(mid + 3, bot - 3, P.vermShade);
    p.set(mid + 4, bot - 3, P.verm);
    // the plate (『体育倉庫』, too small to read) and a hand-written 『使ったら もどす』
    p.rect(dx0 + 2, fy + 6, 12, 4, P.white);
    p.hline(dx0 + 3, dx0 + 12, fy + 7, P.navy);
    p.hline(dx0 + 3, dx0 + 9, fy + 8, P.navy);
    p.rect(dx1 - 12, fy + 6, 9, 5, P.paper);
    p.hline(dx1 - 11, dx1 - 5, fy + 7, P.verm);
    p.hline(dx1 - 11, dx1 - 7, fy + 9, P.verm);
    facadeFoot(p, 0, bot, W, P.concrete);
    castRight(p, 0, fy, W, bot - fy - 1, 0);
  },
});

// ================================================================ 三角コーン prop_sch_cones (22,11)

/** A stack of `n` cones (each 12×14, stacked 3px apart), red-orange with white bands. */
function coneStack(n: number): HTMLCanvasElement {
  const p = pc(16, 16 + (n - 1) * 3 + 2);
  const base = p.h - 2;
  for (let k = n - 1; k >= 0; k--) {
    const b = base - k * 3;
    // the square foot plate
    if (k === 0) {
      p.rect(1, b - 2, 14, 3, P.vermShade);
      p.hline(1, 14, b - 2, P.verm);
    }
    for (let j = 0; j < 12; j++) {
      const y = b - 2 - j;
      const half = Math.max(1, Math.round(5 - j * 0.38));
      for (let i = -half; i <= half; i++) {
        let c: string = i <= -half + 1 ? P.vermLt : i >= half ? P.vermShade : P.verm;
        if (j >= 5 && j <= 7) c = i <= -half + 1 ? P.glint : i >= half ? P.concrete : P.white; // the reflective band
        p.set(8 + i, y, c);
      }
    }
  }
  finish(p, { soft: true });
  return p.toCanvas();
}

registerProp('prop_sch_cones', () => {
  const full = coneStack(4);
  const short = coneStack(2);
  const a = stand(full, { cx: 8, base: 16, shadow: 18, contact: 12 });
  a.img = (env) => (env.stage === 2 ? short : full);
  a.shadowImg = a.img;
  return a;
});

// ================================================================ 古タイヤ prop_sch_tires (15–17,11)

/** Three tyres half buried upright (タイヤとび), paint worn to the rubber; rain in their hollows. */
function tires(lean: boolean): HTMLCanvasElement {
  const p = pc(48, 16);
  const base = 13;
  const cols: [string, string, string][] = [
    [P.red, P.vermShade, P.vermLt],
    [P.gold, P.brass, P.goldPale],
    [P.blue, P.navy, P.aqua],
  ];
  cols.forEach(([c, d, l], k) => {
    const cx = 8 + k * 16;
    // the arch: outer half-ellipse 7×8, the hole 3×4
    for (let y = base - 8; y <= base; y++)
      for (let x = cx - 7; x <= cx + 7; x++) {
        const o = ((x + 0.5 - cx) / 7.2) ** 2 + ((y + 0.5 - base) / 8.4) ** 2;
        const i = ((x + 0.5 - cx) / 3.4) ** 2 + ((y + 0.5 - base) / 4.6) ** 2;
        if (o > 1) continue;
        if (i <= 1) {
          // the hollow: dark, with rain water at its bottom (tilted north-east in stage 2)
          const wl = base - 1 - (lean ? Math.round((x - cx + 3) / 3) : 0);
          p.set(x, y, y >= wl ? (y === wl ? P.aqua : P.navy) : P.ink);
          continue;
        }
        // the tread: lit on the left, the paint worn off to black here and there
        const worn = ihash(x, y + k * 16, 8901) % 5 === 0;
        let col = x < cx - 2 ? l : x > cx + 3 ? d : c;
        if (worn) col = P.charcoal;
        if (o > 0.82) col = x < cx ? c : P.ink;
        p.set(x, y, col);
      }
    // the ground round its foot
    p.hline(cx - 8, cx + 8, base + 1, P.woodDark);
  });
  finish(p, { soft: true, rimEvery: 4 });
  return p.toCanvas();
}

registerProp('prop_sch_tires', () => {
  const imgs = [tires(false), tires(true)];
  const a = stand(imgs[0], { cx: 24, base: 16, shadow: 8, contact: 40 });
  a.img = (env) => imgs[env.stage === 2 ? 1 : 0];
  a.shadowImg = () => imgs[0];
  return a;
});

// ================================================================ チョークの けんけんぱ prop_sch_chalk (21,3)

function chalk(ne: boolean): HTMLCanvasElement {
  const p = pc(48, 16);
  // けん・けん・ぱ・けん・ぱ … toward the building's corner (east)
  const rings: [number, number][] = [[4, 8], [11, 8], [18, 5], [18, 11], [25, 8], [32, 5], [32, 11], [40, 8]];
  rings.forEach(([x, y], i) => {
    const last = i === rings.length - 1;
    const cx = x + (ne && last ? 2 : 0);
    const cy = y - (ne && last ? 2 : 0);
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      if (ihash(i, a, 8891) % 7 === 0) continue; // chalk skips on the rough concrete
      p.set(Math.round(cx + Math.cos(ang) * 3), Math.round(cy + Math.sin(ang) * 2.4), a % 3 ? P.white : P.concreteLt);
    }
  });
  // a stub of yellow chalk left by the last circle
  p.set(45, 12, P.gold);
  p.set(46, 12, P.goldPale);
  return p.toCanvas();
}

registerProp('prop_sch_chalk', () => {
  const imgs = [chalk(false), chalk(true)];
  const a = flat(imgs[0]);
  a.img = (env) => imgs[env.stage === 2 ? 1 : 0];
  return a;
});

// ================================================================ 裏門 prop_sch_uramon_in (14,13) / prop_sch_uramon (town (18,0))

/** Two concrete gate posts at a 1-tile gap and the iron lattice gate (open = swung aside). */
function gatePosts(p: PixelCanvas, base: number, hgt: number, open: boolean, plate: boolean): void {
  for (const px of [0, 13]) {
    p.rect(px, base - hgt, 3, hgt, P.concrete);
    p.vline(px, base - hgt, base, P.concreteLt);
    p.vline(px + 2, base - hgt, base, P.steel);
    p.hline(px, px + 2, base - hgt, P.white);
  }
  if (plate) {
    // 『夕鳴小学校』 on the west post, a slim white plate
    p.rect(0, base - hgt + 2, 3, 7, P.white);
    for (let y = base - hgt + 3; y < base - hgt + 8; y += 2) p.set(1, y, P.ink);
  }
  const gy = base - Math.min(hgt - 3, 10);
  if (open) {
    // the leaf swung back against the east post: seen edge-on, a narrow lattice
    for (let y = gy; y < base; y++) {
      p.set(10, y, P.charcoal);
      p.set(11, y, (y & 1) ? P.asphalt : P.charcoal);
      p.set(12, y, P.ink);
    }
    p.hline(9, 12, gy, P.steel);
    p.hline(9, 12, base - 2, P.steel);
  } else {
    // closed: the lattice across the gap, the latch
    for (let x = 3; x < 13; x++) {
      p.set(x, gy, P.steel);
      p.set(x, base - 2, P.asphalt);
    }
    for (let x = 4; x < 13; x += 2) p.vline(x, gy, base - 2, P.charcoal);
    p.rect(11, gy + 3, 2, 2, P.steel);
  }
}

registerProp('prop_sch_uramon_in', () => {
  const W = 16;
  const H = 20;
  const p = pc(W, H);
  // the park's grass beyond, then the posts and the open leaf
  gatePosts(p, H - 3, 16, true, false);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 8, base: 16, shadow: 12, contact: 0 });
});

registerProp('prop_sch_uramon', () => {
  // in the park's north hedge: the camera stops at y 0, so everything fits in the tile's 16px
  const W = 16;
  const H = 16;
  const mk = (open: boolean): HTMLCanvasElement => {
    const p = pc(W, H);
    // the school's bare earth through the gap
    for (let y = 0; y < H - 2; y++) for (let x = 3; x < 13; x++) p.set(x, y, ihash(x, y, 8897) % 6 === 0 ? P.woodLt : P.brassOld);
    gatePosts(p, H - 1, 14, open, true);
    // the sign on the leaf: 『夏休みの 水やり当番は 5時まで』 (white, a line of blue and red)
    const sx = open ? 5 : 5;
    p.rect(sx, 5, 6, 4, P.white);
    p.hline(sx + 1, sx + 4, 6, P.navy);
    p.hline(sx + 1, sx + 3, 7, P.verm);
    p.strokeRect(sx, 5, 6, 4, P.steel);
    return p.toCanvas();
  };
  const imgs = [mk(false), mk(true)];
  const a = stand(imgs[1], { cx: 8, base: 16, shadow: 0, contact: 0 });
  a.img = (env) => imgs[env.stage === 1 || env.stage === 2 ? 1 : 0];
  return a;
});

// ================================================================ the watering can in Minato's hand (events/school.ts)

let canImgs: HTMLCanvasElement[] | null = null;

/** The carried can, 9×7: [facing right, facing left]; the water glints at the rose. */
export function carriedCan(): HTMLCanvasElement[] {
  if (canImgs) return canImgs;
  const mk = (flip: boolean) => {
    const p = pc(10, 8);
    p.rect(2, 2, 5, 5, P.leaf);
    p.vline(6, 2, 6, P.leafShade);
    p.hline(2, 6, 2, P.leafYoung);
    p.line(2, 1, 5, 0, P.leafShade); // the handle over the top
    p.set(6, 1, P.leafShade);
    p.line(7, 5, 8, 3, P.leafDeep); // the spout
    p.rect(8, 2, 2, 2, P.leafYoung); // the rose
    p.set(3, 3, P.aqua); // water showing at the filler
    finish(p, { soft: true, rim: false });
    return (flip ? p.flipped() : p).toCanvas();
  };
  canImgs = [mk(false), mk(true)];
  return canImgs;
}

