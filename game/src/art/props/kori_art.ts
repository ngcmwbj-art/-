// 明日の 朝の 氷（03_ch3_index、events/ch3/kori.ts）の 絵：氷の 蔵 map_c3_kori と、荷さばき場の 砕いた 氷の 山。
//
//   prop_kr_shell     蔵の 床と 北の 壁（1枚の 平らな 絵）。床は ふつうの コンクリート（霜で 白い）。鉄の 氷道
//                     （角氷 1本ぶんの 幅の みぞ、data/maps/c3_kori.ts KR_RAIL）。壁は 霜の ついた コンクリート、
//                     温度計 (10,1)、防寒着の かけくぎ (12–13,1)。
//   prop_kr_bunki     分かれ道の 板（床の 絵。opts.k = 0 A・1 B）：今 つながっている ほうの 鉄が 明るく、白い 矢印。
//   prop_kr_tsumiba   積み場 (1–4,2)：角氷を 高く 積んだ 山（まわりが すきとおって、まん中が 白い）。
//   prop_kr_pusher    プッシャー (1,4)：鉄の 箱、押す 板、レバー。
//   prop_kr_saihyoki  砕く 機械 (14,3–5)：鉄の 箱、氷道の はしに 開いた 口、上に モーター。
//   prop_kr_yama      荷さばき場の 砕いた 氷の 山（町 (40,20)。青い 箱から あふれる 白い 粒。すんだ あと 段階2 だけ）。
//   kakuImg()         角氷 1本（氷道を すべる 物。events/ch3/kori.ts の 人の 形の 絵）。itaImg()：止め板。

import { mix, PixelCanvas } from '../../engine/pixel';
import { h01, ihash, valueNoise } from '../tiles/noise';
import { getMapDef } from '../../world/maps';
import { blend, paintShell } from './ishell';
import { standProp } from './hoshi_kit';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';
import { KR_BUNKI, KR_RAIL } from '../../data/maps/c3_kori';

/** 角氷の 色：まわりは すきとおった 青み、まん中は 白い 芯。 */
const ICE_EDGE = '#BFE6F4';
const ICE_CLEAR = '#DDF2FA';
const ICE_CORE = '#FFFFFF';
const ICE_DK = '#8EC4DA';
const STEEL = '#8E95A6';
const STEEL_LT = '#B8BEC8';
const STEEL_DK = '#5E6478';
const BED = '#6B7186';

const DV: Record<string, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

/** 氷道 1マスの 鉄（ends の 方へ、中心から 端まで）。 */
function railTile(p: PixelCanvas, X: number, Y: number, ends: string, lit: string | null = null): void {
  const arm = (d: string, bright: boolean) => {
    const [dx, dy] = DV[d];
    // the bed (10 px wide) from the centre to the tile's edge, a guide rail on each side
    for (let t = 0; t <= 8; t++)
      for (let s = -5; s <= 4; s++) {
        const x = X + 8 + dx * t + (dy !== 0 ? s : 0) - (dx < 0 ? 1 : 0);
        const y = Y + 8 + dy * t + (dx !== 0 ? s : 0) - (dy < 0 ? 1 : 0);
        if (x < X || x > X + 15 || y < Y || y > Y + 15) continue;
        const edge = s === -5 || s === 4;
        p.set(x, y, edge ? (bright ? '#E8ECF0' : STEEL_LT) : bright ? '#9AA6B8' : (x + y) % 7 === 0 ? STEEL_DK : BED);
      }
  };
  for (const d of ends) arm(d, false);
  if (lit) arm(lit, true);
}

registerProp('prop_kr_shell', () => {
  const rows = getMapDef('map_c3_kori')?.rows ?? [];
  const sh = paintShell({
    rows,
    floor: (x, y) => {
      // plain concrete, cold grey-blue, frost white in patches and specks
      const n = valueNoise(x / 9, y / 7, 4101);
      let c = n > 0.64 ? '#C8D0D8' : n < 0.3 ? '#A8B0BC' : '#B8C0CA';
      if (valueNoise(x / 5, y / 5, 4103) > 0.72) c = mix(c, '#F4F8FA', 0.45);
      if (h01(x, y, 4105) > 0.97) c = '#F4F8FA';
      if (x % 32 === 0 || y % 32 === 0) c = mix(c, '#8E95A6', 0.4);
      return c;
    },
    wall: (x, y, fh) => {
      // frosted concrete; the frost thick near the floor
      if (y >= fh - 6) return y === fh - 6 ? '#E8F0F4' : '#9AA6B4';
      const n = valueNoise(x / 6, y / 5, 4107);
      let c = n > 0.7 ? '#C8D4DC' : '#B4C0CA';
      if (h01(x, y, 4109) < 0.08 + y / fh / 4) c = '#EEF4F8';
      return c;
    },
    trim: '#9AA6B4',
    base: '#7A8696',
    baseH: 3,
  });
  const p = sh.p;
  // the iron ice-road
  for (const [k, ends] of Object.entries(KR_RAIL)) {
    const [tx, ty] = k.split(',').map(Number);
    railTile(p, tx * 16, ty * 16, ends);
  }
  // the dead end's stop block (7,6), north end
  p.rect(7 * 16 + 3, 6 * 16 + 1, 10, 3, '#C8643A');
  p.hline(7 * 16 + 3, 7 * 16 + 12, 6 * 16 + 1, '#F2894B');
  // the thermometer on the north wall (10,1): a white plate, the red line low (about minus 10)
  const tx = 10 * 16 + 5;
  p.rect(tx, 8, 6, 20, '#F4F1E8');
  p.strokeRect(tx, 8, 6, 20, '#6B7186');
  for (let y = 10; y < 26; y += 3) p.set(tx + 1, y, '#3A3F48');
  p.vline(tx + 3, 18, 24, '#E23B2E');
  p.rect(tx + 2, 24, 3, 3, '#E23B2E');
  p.set(tx + 1, 14, '#2F4A8A');
  // the coat hooks (12–13,1): a board, four hooks, three padded coats (navy, orange, navy)
  const kx = 12 * 16 + 1;
  p.rect(kx, 6, 30, 3, '#8A6A48');
  for (let i = 0; i < 4; i++) p.rect(kx + 3 + i * 8, 9, 1, 2, '#3A3F48');
  for (const [i, col, dk] of [[0, '#2F4A8A', '#1F3266'], [1, '#E8743A', '#B8542A'], [2, '#2F4A8A', '#1F3266']] as const) {
    const cx = kx + 3 + i * 8;
    p.rect(cx - 3, 11, 7, 15, col);
    p.vline(cx, 12, 25, dk);
    for (let y = 14; y < 26; y += 4) p.hline(cx - 3, cx + 3, y, dk);
  }
  // frost along the walls' feet and a thin shadow under the north wall onto the floor (cold air)
  for (let x = 16; x < (sh.w - 1) * 16; x++) if (h01(x, 33, 4111) > 0.5) blend(p, x, 32, '#FFFFFF', 0.5);
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: sh.w * 16, h: sh.h * 16, foot: 0, flat: true, img: () => img, glass: sh.glass.toCanvas() } satisfies PropArt;
});

/** 分かれ道の 板（床）：opts.k の 分かれ道の 今の 行き先を 明るく、白い 矢印。flag_kr_sw_<k>。 */
registerProp('prop_kr_bunki', (opts) => {
  const k = Number(opts.k ?? 0);
  const b = KR_BUNKI[k];
  const ends = KR_RAIL[`${b.x},${b.y}`];
  const imgs = b.to.map((to) => {
    const p = new PixelCanvas(16, 16);
    railTile(p, 0, 0, ends, to);
    // the switch's tongue: a yellow arrow from the trunk's side across the tile towards where it goes now
    const [dx, dy] = DV[to];
    const A = ['..#....', '..##...', '######.', '#######', '######.', '..##...', '..#....'];
    for (let j = 0; j < 7; j++)
      for (let i = 0; i < 7; i++) {
        if (A[j][i] !== '#') continue;
        // the picture points east; turned for the other ways
        const u = i - 3;
        const v = j - 3;
        const [rx, ry] = dx === 1 ? [u, v] : dx === -1 ? [-u, v] : dy === 1 ? [-v, u] : [v, -u];
        p.set(8 + rx + dx * 2 - (dx < 0 ? 1 : 0), 8 + ry + dy * 2 - (dy < 0 ? 1 : 0), '#FFD23F');
      }
    // the lever's little red handle by the tile's corner
    p.rect(1, 1, 3, 3, '#E23B2E');
    p.set(1, 1, '#FF6A4D');
    return p.toCanvas();
  });
  return { ox: 0, oy: 0, w: 16, h: 16, foot: 0, flat: true, img: (env: PropEnv) => imgs[env.flag(`flag_kr_sw_${k}`) ? 1 : 0] } satisfies PropArt;
});

/** 角氷 1本（横に ねかせた 形、16×14）：まわりが すきとおって、まん中が 白い。 */
let kakuCache: HTMLCanvasElement | null = null;
export function kakuImg(): HTMLCanvasElement {
  if (kakuCache) return kakuCache;
  const p = new PixelCanvas(16, 14);
  // the top face (lighter), the front face
  p.rect(1, 1, 14, 4, ICE_CLEAR);
  p.hline(1, 14, 1, ICE_CORE);
  p.rect(1, 5, 14, 8, ICE_EDGE);
  // the white core through the middle of the front, soft at its ends
  p.rect(4, 7, 8, 4, ICE_CORE);
  p.hline(3, 12, 8, '#F4FAFF');
  p.hline(3, 12, 9, '#F4FAFF');
  p.set(5, 6, '#F4FAFF');
  // edges and a glint
  p.vline(1, 2, 12, ICE_DK);
  p.vline(14, 2, 12, ICE_DK);
  p.hline(1, 14, 12, ICE_DK);
  p.set(2, 2, '#FFFFFF');
  p.set(3, 2, '#FFFFFF');
  p.outline('#4A6A80');
  kakuCache = p.toCanvas();
  return kakuCache;
}

/** 止め板（鉄の 板、黄と 黒の しま）：down = 下りている（止まる）、up = 上がっている（寝かせた 形、低い）。 */
const itaCache = new Map<boolean, HTMLCanvasElement>();
export function itaImg(down: boolean): HTMLCanvasElement {
  const hit = itaCache.get(down);
  if (hit) return hit;
  const p = new PixelCanvas(16, 16);
  if (down) {
    // standing across the road: posts each side, the striped plate between
    p.rect(1, 2, 2, 14, STEEL_DK);
    p.rect(13, 2, 2, 14, STEEL_DK);
    p.rect(3, 6, 10, 8, '#FFD23F');
    for (let x = 3; x < 13; x += 4) p.rect(x, 6, 2, 8, '#3A3F48');
    p.hline(3, 12, 6, '#FFF6D8');
  } else {
    p.rect(1, 10, 2, 6, STEEL_DK);
    p.rect(13, 10, 2, 6, STEEL_DK);
    p.rect(3, 13, 10, 2, '#FFD23F');
    p.hline(3, 12, 13, '#FFF6D8');
  }
  p.outline('#2A2440');
  const c = p.toCanvas();
  itaCache.set(down, c);
  return c;
}

/** 積み場 (1–4,2)：角氷を 3段に 積んだ 山（北の 壁に 寄せて）。 */
registerProp('prop_kr_tsumiba', () =>
  standProp(64, 40, (p) => {
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 4; i++) {
        const x = 1 + i * 15 + (row % 2) * 3;
        const y = 28 - row * 12;
        if (x + 14 > 63) continue;
        p.rect(x, y, 14, 11, ICE_EDGE);
        p.rect(x, y, 14, 3, ICE_CLEAR);
        p.rect(x + 3, y + 5, 8, 3, ICE_CORE);
        p.vline(x, y, y + 10, ICE_DK);
        p.hline(x, x + 13, y + 10, ICE_DK);
        if (ihash(i, row, 4113) % 3 === 0) p.set(x + 2, y + 1, '#FFFFFF');
      }
    // frost on the top
    for (let x = 4; x < 60; x += 3) p.set(x, 4 + (x % 2), '#FFFFFF');
  }, { cx: 32, base: 16, shadow: 0 }),
);

/** プッシャー (1,4)：鉄の 箱、東へ 押す 板、上に レバー。 */
registerProp('prop_kr_pusher', () =>
  standProp(16, 28, (p) => {
    p.rect(1, 10, 13, 16, STEEL);
    p.hline(1, 13, 10, STEEL_LT);
    p.vline(13, 11, 25, STEEL_DK);
    p.rect(3, 13, 7, 4, '#3A3F48');
    p.set(4, 14, '#5CE1FF');
    // the push plate on the east face
    p.rect(13, 16, 3, 8, '#6B7186');
    p.vline(15, 16, 23, '#9AA0A8');
    // the lever (red knob)
    p.vline(6, 2, 10, '#3A3F48');
    p.rect(5, 0, 3, 3, '#E23B2E');
    p.set(5, 0, '#FF6A4D');
  }, { cx: 8, base: 16, shadow: 0 }),
);

/** 砕く 機械 (14,3–5)：背の 高い 鉄の 箱、西の 面に 口 (14,4)、上に モーター。 */
registerProp('prop_kr_saihyoki', () =>
  standProp(16, 60, (p) => {
    p.rect(0, 8, 16, 50, STEEL);
    p.vline(0, 8, 57, STEEL_LT);
    p.hline(0, 15, 8, STEEL_LT);
    p.vline(15, 9, 57, STEEL_DK);
    // the motor on top, its belt cover
    p.rect(3, 0, 10, 8, '#4A6A80');
    p.hline(3, 12, 0, '#6A8AA0');
    p.rect(5, 2, 6, 3, '#2F4A60');
    // the mouth at the ice-road's height (row 4): dark, teeth, a little ice dust
    p.rect(1, 26, 10, 12, '#1B1733');
    for (let y = 27; y < 37; y += 3) p.set(9, y, '#C8CCD4');
    p.hline(1, 10, 25, '#FFD23F');
    p.hline(1, 10, 38, '#FFD23F');
    for (let x = 2; x < 10; x += 2) p.set(x, 39, '#F4FAFF');
    // a warning plate
    p.rect(4, 44, 8, 5, '#FFD23F');
    p.hline(5, 10, 46, '#3A3F48');
  }, { cx: 8, base: 48, shadow: 0 }),
);

/** 荷さばき場の 砕いた 氷の 山（青い 箱から あふれる）。 */
registerProp('prop_kr_yama', () =>
  standProp(16, 14, (p) => {
    p.rect(1, 6, 14, 7, '#3A7EA8');
    p.hline(1, 14, 6, '#5AA0C8');
    p.ellipse(8, 5, 7, 4, '#E8F4FA');
    for (let i = 0; i < 18; i++) p.set(2 + ((i * 5) % 12), 2 + ((i * 3) % 6), i % 3 ? '#FFFFFF' : '#BFE6F4');
  }, { cx: 8, base: 15, shadow: 0 }),
);
