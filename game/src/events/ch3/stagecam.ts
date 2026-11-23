// 第3章の 場面の カメラ（2026-10-20 エンディングの 作り直し：S25 最後の集荷、S29 砂浜の 昼ごはん、S30 回想）。
// panTo（events/lib.ts）は マスの 中心へ だけ 寄るので、ここは 世界の px で：
//   camAt(px, py)         いま すぐ そこを 画面の まん中に（場面の 最初）
//   panPx(px, py, ms)     ゆっくり そこへ（ease-in-out）
//   camRelease()          カメラを フィールドに 返す（主人公 または camFollow を 追う）
// 2D は 地図の はしで 止める（フィールドと 同じ）。HD-2D は 止めない（view.ts が camX/camY を そのまま 追う）。

import type { Co } from '../../engine/co';
import { H, W } from '../../engine/screen';
import { animate, ease } from '../../engine/tween';
import type { FieldScene } from '../../world/field';
import { fxElsewhere } from '../../world/fx';
import { F } from '../lib';

function clampCam(f: FieldScene, px: number, py: number): [number, number] {
  // (HD-2D: the 3D picture goes on past the map's edges, the camera is free — field.ts altFreeCam)
  if (fxElsewhere(f)) return [px - W / 2, py - H / 2];
  const mw = f.map.w * 16;
  const mh = f.map.h * 16;
  const x = mw <= W ? (mw - W) / 2 : Math.max(0, Math.min(mw - W, px - W / 2));
  const y = mh <= H ? (mh - H) / 2 : Math.max(0, Math.min(mh - H, py - H / 2));
  return [x, y];
}

/** World px (px, py) in the middle of the screen now. */
export function camAt(px: number, py: number): void {
  const f = F();
  const [x, y] = clampCam(f, px, py);
  f.camOverride = { x: x + W / 2, y: y + H / 2 };
  f.camX = x;
  f.camY = y;
}

/** Ease the middle of the screen to world px (px, py) over ms. */
export function* panPx(px: number, py: number, ms = 1200): Co {
  const f = F();
  const x0 = f.camX;
  const y0 = f.camY;
  const [x1, y1] = clampCam(f, px, py);
  f.camOverride = { x: x1 + W / 2, y: y1 + H / 2 };
  yield* animate(
    ms,
    (p) => {
      f.camX = x0 + (x1 - x0) * p;
      f.camY = y0 + (y1 - y0) * p;
    },
    ease.sineInOut,
  );
}

/** The camera back to the field (it follows the player, or f.camFollow). */
export function camRelease(): void {
  const f = F();
  f.camOverride = null;
}
