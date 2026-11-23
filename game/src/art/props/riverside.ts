// Along the river (QA round 3: the south band — road, guardrail, cherries,
// canal, reeds, paddies — ran three screens with nothing to break it):
//   - prop_river_steps: concrete steps down the canal's revetment through a
//     gap in the guardrail (a chain across it), and on the bottom landing
//     someone's fishing things — a folding stool, a bucket, a rod laid out
//     over the water, its float bobbing on the current (a nibble now and
//     then). Stage 1 the float stands still on the flowing water; stage 2
//     the line is drawn off to the north-east.
//   - prop_jetty: a plank jetty through a gap in the far bank's reeds and a
//     flat-bottomed boat (田舟) tied to it, rocking a little.
// Both are flat (the decal layer, over the water): nobody can stand south of them.

import { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { flat } from './pkit';
import { registerProp } from './registry';
import type { PropEnv } from './types';

const pc = (w: number, h: number) => new PixelCanvas(w, h);

// ---------------------------------------------------------------- steps

/** Local frame: x from world tile x*16 − 6, y from the tile row's top (the guardrail row). */
const SX = -6;
const STEPS = (() => {
  const p = pc(34, 46);
  const C = P.concrete;
  const CL = P.concreteLt;
  const CD = P.steel;
  // the top landing behind the guardrail line
  p.rect(4, 8, 18, 8, C);
  p.hline(4, 21, 8, CL);
  for (let x = 5; x < 21; x += 5) p.vline(x, 9, 15, CD); // slab joints
  p.set(9, 12, P.leaf);
  p.set(10, 12, P.leafYoung);
  // four steps down the revetment: a lit tread, a shaded riser
  for (let i = 0; i < 4; i++) {
    const y = 16 + i * 3;
    p.hline(4, 21, y, CL);
    p.hline(4, 21, y + 1, i < 2 ? C : '#B4AEA2');
    p.hline(4, 21, y + 2, i < 2 ? CD : P.asphalt);
    // wear in the middle of the tread, moss at the ends
    p.set(12, y, P.white);
    p.set(13, y, P.white);
    // a crack, a chipped nosing
    if (i === 1) p.set(17, y + 1, CD);
    if (i === 2) p.set(7, y, C);
    if (i >= 2) {
      p.set(5, y + 2, P.leafShade);
      p.set(20, y + 1, P.leafDeep);
    }
  }
  // the bottom landing, wet towards the water, a green line of weed at the waterline
  p.rect(4, 28, 18, 5, C);
  p.hline(4, 21, 28, CL);
  p.hline(4, 21, 31, '#7C8394');
  p.hline(4, 21, 32, '#5E6477');
  for (let x = 4; x <= 21; x += 2) p.set(x, 33, (x >> 1) % 3 ? P.leafShade : P.leafDeep);
  // the side walls: lit west, shaded east
  p.vline(3, 8, 33, P.white);
  p.vline(2, 9, 33, CL);
  p.vline(22, 8, 33, CD);
  p.vline(23, 9, 33, P.asphalt);
  p.set(3, 8, P.glint);
  // a folding stool on the landing: a blue canvas seat on crossed legs
  p.hline(6, 10, 26, P.blue);
  p.hline(6, 10, 27, P.navy);
  p.line(6, 28, 10, 31, P.charcoal);
  p.line(10, 28, 6, 31, P.steel);
  // a plastic bucket (the kind for bait), water inside
  p.rect(15, 26, 5, 6, P.aqua);
  p.vline(15, 26, 31, '#A8E4F2');
  p.vline(19, 27, 31, P.blue);
  p.hline(15, 19, 26, P.glint);
  p.hline(16, 18, 27, P.navy);
  p.set(17, 25, P.charcoal); // handle
  p.set(16, 24, P.charcoal);
  p.set(18, 24, P.charcoal);
  // shadows of the two on the landing (the sun from the west)
  p.hline(11, 12, 31, '#6A7082');
  p.hline(20, 21, 31, '#6A7082');
  // the rod: from the stool out over the water to the south-east, a reel near the butt
  p.line(9, 27, 31, 37, P.charcoal);
  p.line(10, 27, 31, 36, P.steel);
  p.set(12, 29, P.concreteLt);
  p.set(12, 30, P.steel);
  p.set(31, 36, P.glint);
  // the chain across the gap, sagging between the guardrail's end posts
  for (let x = 1; x <= 25; x++) {
    const t = (x - 1) / 24;
    const y = 3 + Math.round(Math.sin(t * Math.PI) * 3);
    p.set(x, y, x % 2 ? P.steel : P.charcoal);
  }
  return p.toCanvas();
})();

function stepsOver(g: import('../../engine/gfx').Gfx, x: number, y: number, env: PropEnv): void {
  const ox = x + SX;
  const t = env.t;
  const still = env.stage === 1;
  // the float at the end of the line: bobbing on the current, a nibble every ~13s
  let fx = ox + 31;
  let fy = y + 42;
  let dip = 0;
  if (env.stage === 2) {
    // the line drawn off towards the mall
    fx += 3;
    fy -= 2;
  } else if (!still) {
    const cyc = (t + env.seed * 5000) % 13000;
    if (cyc < 700) dip = cyc < 200 || (cyc > 400 && cyc < 600) ? 2 : 0;
    fy += Math.round(Math.sin(t / 620) * 0.8) + dip;
  }
  // the line from the rod tip down to it
  g.rect(ox + 31, y + 37, 1, Math.max(1, fy - (y + 37)), P.glint, 0.35);
  // the float: red cap, white body; its ring on the water
  if (dip < 2) {
    g.rect(fx, fy - 2, 1, 1, P.red);
    g.rect(fx, fy - 1, 1, 1, P.white);
  } else g.rect(fx, fy - 1, 1, 1, P.red);
  g.rect(fx - 1, fy, 3, 1, P.glint, 0.45);
  if (!still && env.stage !== 2) {
    const r = ((t + env.seed * 5000) % 13000) / 1300;
    if (r < 1.2) {
      const rad = 1 + Math.round(r * 4);
      g.rect(fx - rad, fy + 1, 1, 1, P.glint, 0.5 * (1 - r / 1.2));
      g.rect(fx + rad, fy + 1, 1, 1, P.glint, 0.5 * (1 - r / 1.2));
    }
  }
  // water lapping at the bottom landing
  const k = still ? 0 : Math.floor(t / 450) % 3;
  for (let i = 0; i < 4; i++) g.rect(ox + 5 + i * 4 + k, y + 34, 2, 1, P.glint, 0.5);
}

registerProp('prop_river_steps', () => flat(STEPS, SX, 0, { over: stepsOver }));

// ---------------------------------------------------------------- jetty & boat

/** Local frame: x from the tile's x*16 − 2, y from the tile row's top − 4 (row 37: the canal's far half). */
const JX = -2;
const JY = -4;
const JETTY = (() => {
  const p = pc(24, 36);
  // posts (杭) standing out of the water on both sides of the boards
  for (const x of [5, 18]) {
    for (const y0 of [6, 16]) {
      p.vline(x, y0, y0 + 5, P.woodDark);
      p.set(x, y0, P.woodLt);
      p.set(x, y0 + 5, P.ink);
    }
  }
  // the boards: running out from the bank over the water, lit edges, dark gaps
  for (let y = 7; y < 34; y += 3) {
    const short = (y * 7) % 5 === 0 ? 1 : 0;
    p.hline(6 + short, 17, y, P.woodLt);
    p.hline(6, 17 - short, y + 1, P.wood);
    p.set(6, y + 2, P.woodDark);
    p.set(17, y + 2, P.woodDark);
    if ((y >> 1) % 3 === 0) p.set(11, y + 1, P.woodDark); // a nail head
  }
  // the end board a little lower, green with weed where it's wet
  p.hline(6, 17, 34, P.woodDark);
  p.hline(7, 16, 35, P.leafShade);
  // moss on the posts at the waterline
  p.set(5, 11, P.leafShade);
  p.set(18, 11, P.leafDeep);
  return p.toCanvas();
})();

/** The boat seen from above, bow to the east: 36×12 — a light gunwale round a dark hollow. */
const BOAT = (() => {
  const p = pc(36, 12);
  const edge = (x: number): [number, number] => {
    // the stern is square, the bow narrows to a point and sweeps up
    const bow = x > 25 ? x - 25 : 0;
    return [1 + Math.ceil(bow * 0.45), 10 - Math.ceil(bow * 0.45)];
  };
  for (let x = 1; x < 35; x++) {
    const [top, bot] = edge(x);
    if (top > bot) continue;
    for (let y = top; y <= bot; y++) {
      const rim = y === top || y === bot || x === 1 || edge(x + 1)[0] > y || edge(x + 1)[1] < y;
      const inner = y === top + 1 || y === bot - 1 || x === 2;
      // the gunwale lit on the north / west, the hollow dark, ribs across the floor
      let c: string = P.woodDark;
      if (rim) c = y === bot ? P.ink : P.woodLt;
      else if (inner) c = y === bot - 1 ? P.woodDark : P.wood;
      else c = x % 5 === 0 ? P.wood : '#4A2F24';
      p.set(x, y, c);
    }
  }
  // the thwart (seat) board and a coil of rope in the stern, a pole along the floor
  p.vline(12, 2, 9, P.woodLt);
  p.vline(13, 2, 9, P.wood);
  p.set(5, 5, P.paperGrid);
  p.set(6, 5, P.woodLt);
  p.set(5, 6, P.woodLt);
  p.set(6, 6, P.paperGrid);
  p.hline(16, 27, 7, P.brassOld);
  p.hline(16, 26, 6, P.woodLt);
  // a bailer and a bit of water in the bottom catching the sky
  p.set(20, 4, P.aqua);
  p.set(21, 4, P.glint);
  return p.toCanvas();
})();

function jettyOver(g: import('../../engine/gfx').Gfx, x: number, y: number, env: PropEnv): void {
  const ox = x + JX;
  const oy = y + JY;
  const t = env.t;
  const still = env.stage === 1;
  const bob = still ? 0 : Math.round(Math.sin(t / 900 + env.seed * 4) * 0.8);
  const bx = ox + 20;
  const by = oy + 6 + bob;
  // the boat's reflection-dark underside and a glint line where it meets the water
  g.rect(bx + 2, by + 11, 30, 1, P.nightShade, 0.35);
  g.img(BOAT, bx, by);
  const k = still ? 0 : Math.floor(t / 500) % 3;
  for (let i = 0; i < 5; i++) g.rect(bx + 3 + i * 6 + k, by + 12, 2, 1, P.glint, 0.45);
  // the rope from the bow ring to the nearer post
  g.rect(ox + 18, oy + 7, 3, 1, P.paperGrid);
  g.rect(bx, by + 3, 1, 1, P.paperGrid);
  // ripples round the posts
  const r = still ? 0 : Math.floor(t / 700) % 2;
  g.rect(ox + 4 - r, oy + 12, 3 + r * 2, 1, P.glint, 0.4);
  g.rect(ox + 17 - r, oy + 22, 3 + r * 2, 1, P.glint, 0.4);
}

registerProp('prop_jetty', () => flat(JETTY, JX, JY, { over: jettyOver }));
