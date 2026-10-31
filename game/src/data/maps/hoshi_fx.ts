// 星見台's small light effects that follow something moving (52 3.10 / 8.6).
//
// テツヤ's headlight at 6:00 (h1): its fan sweeps the tilled strip at y4,
// eight tiles north of the electric fence's gate (48,19) — above the top of
// the screen seen from the gate. What that light reaches down the farm lane
// shows from there: the wet ruts (x48–49, y7–17) and the fence wires by the
// gate catch it in 1px glints, stronger the nearer the tiller is to the
// lane, running along as it goes and flickering with the engine.

import { flag } from '../../game/state';
import { registerWorldFx } from '../../world/fx';

const LANE_X = 48 * 16 + 16;
/** Glints on the lane's ruts (world px): the two rut lines 12px apart, the wet spots. */
const RUTS: [number, number][] = [
  [LANE_X - 6, 7 * 16 + 5],
  [LANE_X + 6, 8 * 16 + 11],
  [LANE_X - 5, 10 * 16 + 2],
  [LANE_X + 6, 11 * 16 + 9],
  [LANE_X - 6, 13 * 16 + 4],
  [LANE_X + 5, 14 * 16 + 12],
  [LANE_X - 6, 16 * 16 + 3],
  [LANE_X + 6, 17 * 16 + 6],
];
/** The fence's two wires by the gate (world y) and their spans either side of it (52 7.1: 3px and 6px over the ground). */
const WIRE_Y = [18 * 16 + 16 - 3, 18 * 16 + 16 - 6];

registerWorldFx({
  map: 'map_hoshimidai',
  draw(f, g, cx, cy, layer) {
    if (layer !== 'glow') return;
    if (flag('flag_ch2_stage') !== 1 || flag('flag_ch2_tetsuya_beaten')) return;
    const a = f.actors.find((x) => x.id === 'sym_hoshi_07');
    if (!a || !a.visible) return;
    // how much of the light gets down the lane: the tiller's distance from it
    const dx = a.x - LANE_X;
    const near = Math.max(0, 1 - Math.abs(dx) / 150);
    if (near <= 0.02) return;
    const t = f.t;
    const engine = 0.75 + 0.25 * Math.sin(t * 0.021) * Math.sin(t * 0.0137);
    // the glow of its lamp over the rise at the top of the lane: a faint warm
    // haze that slides east and west with it
    for (let k = 0; k < 10; k++) {
      const y = 5 * 16 + k * 6;
      const w = 34 + k * 5;
      const hx = a.x - w / 2 + (LANE_X - a.x) * (k / 14);
      g.rect(Math.round(hx - cx), Math.round(y - cy), Math.round(w), 6, '#FFE7A3', near * engine * 0.07 * (1 - k / 10));
    }
    RUTS.forEach(([x, y], i) => {
      // farther down the lane, fainter; each wet spot catches it at its own moment
      const far = 1 - ((y - 7 * 16) / (12 * 16)) * 0.5;
      const tw = 0.5 + 0.5 * Math.sin(t * 0.004 + i * 1.7 + dx * 0.05);
      const al = Math.min(1, near * far * engine * (0.45 + 0.7 * tw));
      if (al < 0.05) return;
      const X = Math.round(x - cx);
      const Y = Math.round(y - cy);
      g.rect(X - 1, Y, 4, 1, '#F6D98A', al * 0.35);
      g.rect(X, Y, 2, 1, '#FFF6D8', al);
      if (tw > 0.7) g.rect(X, Y - 1, 1, 1, '#FFF6D8', al * 0.7);
    });
    // the wires by the gate: a short bright dash that slides along with the tiller
    for (const wy of WIRE_Y)
      for (const side of [-1, 1]) {
        const span0 = side < 0 ? 44 * 16 : 50 * 16;
        const u = ((dx / 150) * 0.5 + 0.5) * 64;
        const x = span0 + Math.round(Math.max(0, Math.min(60, u)));
        const al = near * engine * 0.85;
        g.rect(Math.round(x - cx) - 2, Math.round(wy - cy), 7, 1, '#FFE7A3', al * 0.35);
        g.rect(Math.round(x - cx), Math.round(wy - cy), 3, 1, '#FFF6D8', al);
      }
  },
});
