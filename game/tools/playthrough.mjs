#!/usr/bin/env node
// 通しプレイの自動テスト (docs/briefs/events.md 5): title → new game → … → the
// ending → back to the title, in one continuous run of the story (no state
// jumps in between), driven by the keyboard (Z / X / arrows) plus a few debug
// commands for the long walks across town.
//
//   node tools/playthrough.mjs                        dev server at http://127.0.0.1:5173/
//   node tools/playthrough.mjs --base http://127.0.0.1:5188/
//   node tools/playthrough.mjs --out /tmp/claude-0/shots/playthrough
//   node tools/playthrough.mjs --from kanenari        start at a story beat (__game.cmd.jump)
//   node tools/playthrough.mjs --real hato,ojigi      battles fought with real command input
//                                                     (default: hato; the rest use __game.cmd.win()).
//                                                     The key bot answers every prompt with Z; in long
//                                                     fights it guards on the boss's third chime and
//                                                     heals someone under 45% (はなまる / ふうせん / the bag)
//   node tools/playthrough.mjs --fushigi-all          also stamp all 12 ふしぎ in the same run
//   node tools/playthrough.mjs --headed               watch it
//   node tools/playthrough.mjs --chapter 2            chapter 2『星見台のトマト』 (02_ch2_index 4.5): the title's
//                                                     「第2章から」 → the prologue → … → the ending → ツガオの部屋 →
//                                                     the title. --real sune,tetsuya,boss fights those with keys
//                                                     (default: all won with __game.cmd.win()); --fushigi-all
//                                                     stamps the ten ふしぎ ② before the boss; --from <beat> starts at
//                                                     a CHAIN2 beat (jump('ch2:<beat>'))
//
// Beats (each one's flag must be set before the next begins):
//   title  opening  errand  town  maruyama  hinoya  chime (★17:00 → ハト係長 → ハンコケース)
//   mamekichi (fushigi_04, 公園のヒント)  alley  kanenari (加入戦 → 迷子のお知らせ → 段階2)
//   ojigi  mall  kaitenyaki (鍵・やりなおし)  mall2f (ベンチでセーブ・ソウジロウ)  door  boss  ending
// Movement: across the town Minato walks with the arrow keys along a BFS path over the tiles
// (travel(): symbol battles on the way are fought, an NPC in the way is waited for; only a
// path that stays blocked is skipped with a teleport, and counted). Inside rooms and the mall
// short teleports put him next to what he examines. Doors, talking, examining, choices and
// dialog are key presses.
// Checks besides the story flags: reachability of the town per stage (a BFS over the solid
// tiles against the expected table: the alley closed in stage 0, the parking lot closed until
// stage 2), the dinner in ending cut 5 actually visible on the chabudai (a pixel diff), and
// with --fushigi-all 12/12 ふしぎ before the boss.
// Tempo: a page counter in the page tallies, per beat and outside battles, the dialog pages,
// choices and other modal screens the player has to press through (stdout + summary.counts).
// Screenshots: <out>/NN_<beat>_*.png. Result: stdout + <out>/summary.json. Exit code 1 on failure.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};
const BASE = opt('--base', 'http://127.0.0.1:5173/');
const OUT = opt('--out', '/tmp/claude-0/shots/playthrough');
const FROM = opt('--from', '');
const REAL = new Set(opt('--real', args.includes('--chapter') && opt('--chapter', '1') === '2' ? '' : 'hato').split(',').filter(Boolean));
const HEADED = args.includes('--headed');
const FUSHIGI_ALL = args.includes('--fushigi-all');
const CHAPTER = Number(opt('--chapter', '1'));
const checks = [];
const travelLog = { walked: 0, skipped: 0, battles: 0 };

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (/^\d\d_.*\.png$/.test(f) || f === 'summary.json') fs.rmSync(path.join(OUT, f));

const browser = await chromium.launch({
  headless: !HEADED,
  args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('willReadFrequently')) errors.push(`[console] ${m.text()}`);
});
let reloaded = false;

// ------------------------------------------------------------------ low level

const sleep = (ms) => page.waitForTimeout(ms);
const T0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1).padStart(6)}s]`, ...a);

const battleLog = [];
let beatNo = 0;
let beatName = 'boot';
let shotNo = 0;
const shots = [];
async function shot(label) {
  const name = `${String(beatNo).padStart(2, '0')}_${beatName}_${String(shotNo++).padStart(2, '0')}${label ? '_' + label : ''}.png`;
  await page.screenshot({ path: path.join(OUT, name) });
  shots.push(name);
  return name;
}

async function tap(key, hold = 60) {
  await page.keyboard.down(key);
  await sleep(hold);
  await page.keyboard.up(key);
  await sleep(30);
}

/** A snapshot of where the game is. */
function st() {
  return page
    .evaluate(() => {
      const G = window.__game;
      if (!G) return { top: 'none' };
      const g = G.game;
      const top = g.top?.constructor?.name ?? '';
      const f = G.cmd.fieldRef?.();
      const inField = top === 'FieldScene' && !!f;
      return {
        top,
        map: f?.map?.id ?? null,
        x: f ? f.player.tileX : -1,
        y: f ? f.player.tileY : -1,
        ctrl: inField && f.controllable && g.fadeAlpha < 0.05,
        battle: !!G.cmd.bstate?.(),
        modal: !!g.ui.modal,
      };
    })
    .catch(() => ({ top: 'none' }));
}

const flag = (id) => page.evaluate((i) => window.__game.cmd.flag(i), id);
const flags = (ids) => page.evaluate((l) => Object.fromEntries(l.map((i) => [i, window.__game.cmd.flag(i)])), ids);

async function waitFor(pred, timeout = 15000, label = 'condition') {
  const t0 = Date.now();
  for (;;) {
    const s = await st();
    if (await pred(s)) return s;
    if (Date.now() - t0 > timeout) throw new Error(`timeout waiting for ${label} (${JSON.stringify(s)})`);
    await sleep(120);
  }
}

/** Teleport on the current map (no reload, no enter scripts). */
function place(x, y, dir = 'down') {
  return page.evaluate(
    ([x, y, dir]) => {
      const f = window.__game.cmd.fieldRef();
      const p = f.player;
      p.path = [];
      p.moving = false;
      p.x = x * 16 + 8;
      p.y = y * 16 + 16;
      p.dir = dir;
      f.syncFollower(true);
      f.snapCamera();
    },
    [x, y, dir],
  );
}

/** Warp to another map (debug; runs its enter scripts). */
const warp = (map, x, y, dir) => page.evaluate(([m, x, y, d]) => window.__game.cmd.warp(m, x, y, d), [map, x, y, dir]);

const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

/** Hold a direction until `until(state)` holds (or the timeout). */
async function walk(dir, until, timeout = 6000) {
  const t0 = Date.now();
  await page.keyboard.down(KEY[dir]);
  try {
    for (;;) {
      await sleep(60);
      const s = await st();
      if (await until(s)) return s;
      if (Date.now() - t0 > timeout) throw new Error(`walk ${dir}: timeout (${JSON.stringify(s)})`);
    }
  } finally {
    await page.keyboard.up(KEY[dir]);
    await sleep(40);
  }
}

/** Walk to a tile with the arrow keys (greedy; the other axis when blocked). Stops if an event starts. */
async function walkTo(tx, ty, { vertFirst = true, timeout = 12000 } = {}) {
  const t0 = Date.now();
  let s = await st();
  let prefV = vertFirst;
  let stuck = 0;
  while (s.x !== tx || s.y !== ty) {
    if (!s.ctrl) return s;
    if (Date.now() - t0 > timeout) throw new Error(`walkTo(${tx},${ty}) timeout at (${s.x},${s.y})`);
    const dv = ty - s.y;
    const dh = tx - s.x;
    const useV = dv !== 0 && (prefV || dh === 0);
    const dir = useV ? (dv > 0 ? 'down' : 'up') : dh > 0 ? 'right' : 'left';
    const bx = s.x;
    const by = s.y;
    await page.keyboard.down(KEY[dir]);
    await sleep(140);
    await page.keyboard.up(KEY[dir]);
    await sleep(160);
    s = await st();
    if (s.x === bx && s.y === by) {
      prefV = !prefV;
      if (++stuck > 8) throw new Error(`walkTo(${tx},${ty}) blocked at (${s.x},${s.y})`);
    } else stuck = 0;
  }
  return s;
}

/** A tile path (BFS over the solid tiles, 4-way) from Minato to (tx, ty) on the current map. */
function tilePath(tx, ty, avoidActors = false) {
  return page.evaluate(
    ([tx, ty, avoid]) => {
      const f = window.__game.cmd.fieldRef();
      const W = f.map.w;
      const H = f.map.h;
      const sx = f.player.tileX;
      const sy = f.player.tileY;
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) return null;
      // with `avoid`, tiles where a solid character stands (and the one it walks to) count as walls
      const busy = new Set();
      if (avoid)
        for (const a of f.actors) {
          if (!a.solid || !a.visible || a === f.follower) continue;
          busy.add(a.tileY * W + a.tileX);
          const q0 = a.path?.[0];
          if (q0) busy.add(Math.floor((q0[1] - 1) / 16) * W + Math.floor(q0[0] / 16));
        }
      const prev = new Int32Array(W * H).fill(-1);
      prev[sy * W + sx] = sy * W + sx;
      const q = [sy * W + sx];
      while (q.length) {
        const c = q.shift();
        if (c === ty * W + tx) break;
        const x = c % W;
        const y = (c / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const n = ny * W + nx;
          if (prev[n] >= 0 || f.isSolidTile(nx, ny) || (busy.has(n) && n !== ty * W + tx)) continue;
          prev[n] = c;
          q.push(n);
        }
      }
      // a solid / closed-in target (a counter, an NPC's spot): the nearest tile that can be reached
      let end = ty * W + tx;
      if (prev[end] < 0) {
        let best = -1;
        let bd = 1e9;
        for (let i = 0; i < W * H; i++) {
          if (prev[i] < 0) continue;
          const d = Math.abs((i % W) - tx) + Math.abs(((i / W) | 0) - ty);
          if (d < bd) {
            bd = d;
            best = i;
          }
        }
        if (best < 0 || bd > 2) return null;
        end = best;
      }
      const out = [];
      for (let c = end; c !== sy * W + sx; c = prev[c]) out.push([c % W, (c / W) | 0]);
      return out.reverse();
    },
    [tx, ty, avoidActors],
  );
}

/** Hold a direction until `until`, or until the tile has not changed for 600 ms (someone in the way). */
async function holdRun(dir, until) {
  await page.keyboard.down(KEY[dir]);
  let s = await st();
  let tile = `${s.x},${s.y}`;
  let since = Date.now();
  try {
    for (;;) {
      await sleep(50);
      s = await st();
      if (await until(s)) return s;
      const t = `${s.x},${s.y}`;
      if (t !== tile) {
        tile = t;
        since = Date.now();
      } else if (Date.now() - since > 600) return s;
    }
  } finally {
    await page.keyboard.up(KEY[dir]);
    await sleep(40);
  }
}

/** Step onto the centre of the current tile with short taps (a run stops wherever the tile changed). */
async function alignTile() {
  for (let i = 0; i < 3; i++) {
    const o = await page.evaluate(() => {
      const p = window.__game.cmd.fieldRef().player;
      return { dx: p.tileX * 16 + 8 - p.x, dy: p.tileY * 16 + 16 - p.y };
    });
    const moves = [];
    if (Math.abs(o.dy) > 2) moves.push([o.dy > 0 ? 'down' : 'up', Math.abs(o.dy)]);
    if (Math.abs(o.dx) > 2) moves.push([o.dx > 0 ? 'right' : 'left', Math.abs(o.dx)]);
    if (!moves.length) return;
    for (const [dir, px] of moves) {
      await page.keyboard.down(KEY[dir]);
      await sleep(Math.max(30, Math.round((px / 72) * 1000) - 10));
      await page.keyboard.up(KEY[dir]);
      await sleep(40);
    }
  }
}

/**
 * Walk to (tx, ty) with the arrow keys (dash held) along the BFS path. Battles on the way
 * are won; an NPC in the way is waited for and walked round; a path that stays blocked is
 * skipped by one run with a teleport (counted in the summary).
 */
async function travel(tx, ty, { timeout = 90000 } = {}) {
  const t0 = Date.now();
  let stalls = 0;
  let lastTile = '';
  const map0 = (await st()).map;
  let avoidRuns = 0;
  let runs = 0;
  await page.keyboard.down('ShiftLeft');
  try {
    for (;;) {
      if (Date.now() - t0 > timeout) throw new Error(`travel(${tx},${ty}): timeout`);
      let s = await st();
      if (s.battle || s.top === 'BattleScene') {
        await page.keyboard.up('ShiftLeft');
        await battleWin();
        travelLog.battles++;
        await page.keyboard.down('ShiftLeft');
        continue;
      }
      if (!s.ctrl) {
        await advance({ label: 'onway' });
        continue;
      }
      if (s.map !== map0) throw new Error(`travel(${tx},${ty}): walked off ${map0} into ${s.map}`);
      if (s.x === tx && s.y === ty) return s;
      // someone in the way: go round them (and keep going round for a few runs, so the
      // detour is not undone by the next plain path)
      if (stalls >= 1) avoidRuns = 8;
      if (++runs > 70) {
        log(`  travel: no way through to (${tx},${ty}) after ${runs} runs; skipping there`);
        travelLog.skipped++;
        await place(tx, ty, 'down');
        return st();
      }
      const path = (avoidRuns > 0 && (await tilePath(tx, ty, true))) || (await tilePath(tx, ty));
      if (avoidRuns > 0) avoidRuns--;
      if (!path) throw new Error(`travel: (${tx},${ty}) is not reachable from (${s.x},${s.y}) on ${s.map}`);
      if (!path.length) return s;
      // the first straight run of the path
      const d = (a, b) => (b[0] > a[0] ? 'right' : b[0] < a[0] ? 'left' : b[1] > a[1] ? 'down' : 'up');
      const dir = d([s.x, s.y], path[0]);
      let n = 1;
      while (n < path.length && d(path[n - 1], path[n]) === dir) n++;
      const [ex, ey] = path[n - 1];
      const bx = s.x;
      const by = s.y;
      s = await holdRun(dir, (x) => !x.ctrl || x.battle || (x.x === ex && x.y === ey) || (dir === 'left' && x.x < ex) || (dir === 'right' && x.x > ex) || (dir === 'up' && x.y < ey) || (dir === 'down' && x.y > ey));
      const tile = `${s.x},${s.y}`;
      if (process.env.PT_DEBUG) log(`    run ${dir}×${n} (${bx},${by})→(${ex},${ey}) got (${s.x},${s.y}) ctrl=${s.ctrl}`);
      travelLog.walked += Math.abs(s.x - bx) + Math.abs(s.y - by);
      if (s.x === bx && s.y === by && tile === lastTile) {
        // squeezing past someone: line up with the tile first
        await page.keyboard.up('ShiftLeft');
        await alignTile();
        await page.keyboard.down('ShiftLeft');
        if (++stalls >= 4) {
          // something stands in the way for good: skip this run
          log(`  travel: blocked at (${s.x},${s.y}) heading ${dir}; skipping to (${ex},${ey})`);
          travelLog.skipped++;
          await place(ex, ey, dir);
          stalls = 0;
        } else await sleep(350);
      } else stalls = 0;
      lastTile = tile;
    }
  } finally {
    await page.keyboard.up('ShiftLeft');
  }
}

/** Which of the named tiles can Minato reach on foot from where he stands (BFS, solid tiles only)? */
function reachable(targets) {
  return page.evaluate((T) => {
    const f = window.__game.cmd.fieldRef();
    const W = f.map.w;
    const H = f.map.h;
    const seen = new Uint8Array(W * H);
    const q = [[f.player.tileX, f.player.tileY]];
    seen[f.player.tileY * W + f.player.tileX] = 1;
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || f.isSolidTile(nx, ny)) continue;
        seen[ny * W + nx] = 1;
        q.push([nx, ny]);
      }
    }
    const out = {};
    for (const [k, [x, y]] of Object.entries(T)) out[k] = !!seen[y * W + x];
    return out;
  }, targets);
}

/** Named places of the town for the reachability table. */
const PLACES = {
  home: [4, 31],
  maruyama: [27, 22],
  hinoya: [32, 22],
  laundry: [26, 32],
  alley: [19, 16],
  park: [16, 12],
  parkEast: [29, 10],
  parking: [40, 8],
  mallDoor: [50, 7],
};
/** Expected per stage (00_concept 3.4): the alley opens at 17:00, the chains fall with the broadcast. */
const REACH = {
  0: { home: true, maruyama: true, hinoya: true, laundry: true, alley: false, park: false, parkEast: false, parking: false, mallDoor: false },
  1: { home: true, maruyama: true, hinoya: true, laundry: true, alley: true, park: true, parkEast: true, parking: false, mallDoor: false },
  2: { home: true, maruyama: true, hinoya: true, laundry: true, alley: true, park: true, parkEast: true, parking: true, mallDoor: true },
};
async function assertReach(stage) {
  const got = await reachable(PLACES);
  const want = REACH[stage];
  const bad = Object.keys(want).filter((k) => got[k] !== want[k]);
  checks.push({ check: `reach stage ${stage}`, ok: !bad.length, got });
  log(`  reach (stage ${stage}): ${Object.entries(got).map(([k, v]) => `${k}${v ? '' : '✗'}`).join(' ')}`);
  if (bad.length) throw new Error(`reachability in stage ${stage}: ${bad.map((k) => `${k} ${got[k] ? 'open' : 'closed'} (want ${want[k] ? 'open' : 'closed'})`).join(', ')}`);
}

// ------------------------------------------------------------------ ふしぎ (--fushigi-all)

/** Stand next to a ふしぎ object of the current map (map data), face it and press Z; answer 押す. */
async function stampObject(fid) {
  if (await flag('flag_' + fid)) return;
  const r = await page.evaluate(async (fid) => {
    // the running map's own data (a dynamic import of the module could be a second,
    // empty copy after Vite's HMR has touched it)
    const f = window.__game.cmd.fieldRef();
    const o = (f.map.def.objects ?? []).find((x) => x.fushigi === fid && x.t === 'obj');
    if (!o) return 'none';
    const w = o.w ?? 1;
    const h = o.h ?? 1;
    const cands = [];
    for (let i = 0; i < w; i++) cands.push([o.x + i, o.y + h, 'up']);
    if (o.face !== 'up') {
      for (let j = 0; j < h; j++) cands.push([o.x - 1, o.y + j, 'right'], [o.x + w, o.y + j, 'left']);
      for (let i = 0; i < w; i++) cands.push([o.x + i, o.y - 1, 'down']);
    }
    const p = f.player;
    for (const [tx, ty, dir] of cands) {
      if (!f.free(p, tx * 16 + 8, ty * 16 + 16)) continue;
      p.path = [];
      p.moving = false;
      p.x = tx * 16 + 8;
      p.y = ty * 16 + 16;
      p.dir = dir;
      f.syncFollower(true);
      f.snapCamera();
      return [tx, ty, dir];
    }
    return 'enclosed';
  }, fid);
  if (typeof r === 'string') throw new Error(`${fid}: ${r}`);
  await sleep(200);
  await tap('KeyZ');
  await advance({ shotEvery: 3, label: fid.replace('fushigi_', 'f') });
  if (!(await flag('flag_' + fid))) throw new Error(`${fid} was not stamped`);
  log(`  ${fid} ✓`);
}

async function stampActor(fid, id, side = 'below') {
  if (await flag('flag_' + fid)) return;
  // walk up to where it is now, then face it
  const at = await page.evaluate((id) => {
    const a = window.__game.cmd.fieldRef().actors.find((x) => x.id === id);
    return a ? [a.tileX, a.tileY] : null;
  }, id);
  if (at) await travel(at[0], at[1] + 1);
  await talkTo(id, { side });
  await advance({ shotEvery: 3, label: fid.replace('fushigi_', 'f') });
  if (!(await flag('flag_' + fid))) throw new Error(`${fid} was not stamped`);
  log(`  ${fid} ✓`);
}

/** Leave a room by its door to `to` on foot: to the tile inside the door, then down through it. */
async function exitRoom(to = 'map_town') {
  const d = await page.evaluate(async (to) => {
    const f = window.__game.cmd.fieldRef();
    const o = (f.map.def.objects ?? []).find((x) => x.t === 'door' && x.to === to);
    return o ? [o.x, o.y] : null;
  }, to);
  if (!d) throw new Error(`exitRoom: no door to ${to}`);
  await travel(d[0], d[1] - 1);
  await walk('down', (s) => s.map === to, 5000);
  await waitFor((s) => s.ctrl, 5000, to);
}

const fushigiCount = () => page.evaluate(() => Array.from({ length: 12 }, (_, i) => window.__game.cmd.flag(`flag_fushigi_${String(i + 1).padStart(2, '0')}`)).filter(Boolean).length);

// ------------------------------------------------------------------ ending cut 5: the dinner must show

/** endcut(5): the dinner on the chabudai is drawn (not hidden by the table): a pixel diff with it hidden. */
async function dinnerCheck() {
  await page.evaluate(() => window.__game.cmd.endcut(5));
  await page.evaluate(() => window.__game.pause());
  try {
    let ready = false;
    for (let i = 0; i < 80 && !ready; i++) {
      ready = await page.evaluate(() => {
        window.__game.advance(50);
        const f = window.__game.cmd.fieldRef();
        return !!f && !!f.actorById('ending_dinner') && window.__game.game.fadeAlpha < 0.02 && !window.__game.game.ui.widgets.some((w) => w.constructor.name === 'TvCloseup');
      });
    }
    const r = await page.evaluate(() => {
      const g = window.__game.game;
      const f = window.__game.cmd.fieldRef();
      const a = f.actorById('ending_dinner');
      const tbl = f.props.find((p) => p.obj.id === 'obj_chabudai' || p.obj.prop === 'obj_chabudai');
      if (!a || !tbl) return { error: 'no dinner / no chabudai' };
      const grab = () => g.screen.ctx.getImageData(0, 0, 384, 216).data;
      a.visible = true;
      g.draw();
      const on = grab();
      a.visible = false;
      g.draw();
      const off = grab();
      a.visible = true;
      g.draw();
      let changed = 0;
      for (let i = 0; i < on.length; i += 4) if (on[i] !== off[i] || on[i + 1] !== off[i + 1] || on[i + 2] !== off[i + 2]) changed++;
      return { changed, foot: a.y + Math.max(0, a.oy), tableFoot: tbl.y + tbl.art.foot };
    });
    await shot('dinner_check');
    const ok = !r.error && r.changed >= 200 && r.foot > r.tableFoot;
    checks.push({ check: 'ending cut 5: dinner visible on the chabudai', ok, ...r });
    log(`  dinner check: ${JSON.stringify(r)} → ${ok ? 'ok' : 'FAIL'}`);
    if (!ok) throw new Error(`ending cut 5: the dinner is not visible (${JSON.stringify(r)})`);
  } finally {
    await page.evaluate(() => window.__game.resume());
  }
}

// ------------------------------------------------------------------ battles

/** A real battle: the command window and the timing rings answered with Z. */
async function battleByKeys(maxMs = 180000) {
  const t0 = Date.now();
  let lastShot = 0;
  let rounds = 0;
  let presses = 0;
  let guardedRound = -1;
  let healedRound = -1;
  await shot('battle_start');
  for (;;) {
    const s = await st();
    if (s.top === 'FieldScene' && !s.battle) break;
    if (Date.now() - t0 > maxMs) {
      log('  real battle took too long: finishing with __game.cmd.win()');
      await battleWin();
      return { real: false, presses, rounds };
    }
    const b = await page.evaluate(() => window.__game.cmd.bstate?.()).catch(() => null);
    if (b) rounds = Math.max(rounds, b.round ?? 0);
    // the boss: three chimes lit means the fourth (かえりの会, a party-wide
    // blow) comes this round — everyone guards, as the memo says
    if (b && b.input && (b.chime ?? 0) >= 3 && guardedRound !== b.round) {
      guardedRound = b.round;
      await page.evaluate((ids) => window.__game.cmd.bcmd(ids.map((who) => ({ who, cmd: 'guard' }))), b.party.map((u) => u.id));
      log(`  round ${b.round}: chime ${b.chime} → guard`);
    } else if (b && b.input && healedRound !== b.round) {
      // a long fight (the boss): someone under 45% drinks something from the bag
      // (はなまる from Minato while he has the ink, balloons from カネナリくん, else the bag)
      const plan = await page.evaluate(async () => {
        const { state } = await import('/src/game/state.ts');
        const HEAL = ['item_fugashi', 'item_shippu', 'item_ramune', 'item_kinakobou'];
        const alive = state.party.filter((m) => m.hp > 0);
        const low = alive.find((m) => m.hp < m.maxHp * 0.45);
        if (!low) return null;
        const mi = alive.find((m) => m.id === 'minato');
        const item = HEAL.find((i) => state.inventory.includes(i));
        const cmds = [];
        if (mi && mi.mp >= 5) cmds.push({ who: 'minato', cmd: 'hanko', skill: 'skill_hanamaru', target: low.id });
        else if (item) cmds.push({ who: low.id, cmd: 'item', item, target: low.id });
        if (alive.some((m) => m.id === 'kanenari') && !cmds.some((c) => c.who === 'kanenari')) cmds.push({ who: 'kanenari', cmd: 'pr', skill: 'skill_fuusen' });
        if (mi && !cmds.some((c) => c.who === 'minato')) cmds.push({ who: 'minato', cmd: 'attack' });
        if (!cmds.length) return null;
        window.__game.cmd.bcmd(cmds);
        return `${low.id} ${low.hp}/${low.maxHp} → ${cmds.map((c) => c.skill ?? c.item ?? c.cmd).join(' + ')}`;
      });
      if (plan) {
        healedRound = b.round;
        log(`  round ${b.round}: ${plan}`);
      }
    }
    if (Date.now() - lastShot > 3500) {
      lastShot = Date.now();
      await shot(`battle_r${rounds}`);
    }
    await tap('KeyZ', 50);
    presses++;
    await sleep(170);
  }
  return { real: true, presses, rounds, ms: Date.now() - t0 };
}

/** Shortened battle: guard for everyone, then __game.cmd.win(). */
async function battleWin(maxMs = 60000) {
  const t0 = Date.now();
  let won = false;
  for (;;) {
    const s = await st();
    const b = await page.evaluate(() => window.__game.cmd.bstate?.()).catch(() => null);
    if (b && !won) {
      await sleep(400);
      await shot('battle');
      await page.evaluate(() => {
        const c = window.__game.cmd;
        c.bcmd([
          { who: 'minato', cmd: 'guard' },
          { who: 'kanenari', cmd: 'guard' },
        ]);
        c.win();
      });
      won = true;
    }
    if (won && !b && s.top === 'FieldScene') break;
    if (Date.now() - t0 > maxMs) throw new Error('battleWin: timeout');
    await tap('KeyZ', 40);
    await sleep(260);
  }
}

// ------------------------------------------------------------------ the page counter

/**
 * Counts what the player has to press through, per beat, outside battles:
 * dialog pages (each one a Z), choices, and other modal widgets (the hanko
 * case, the learn card …). Installed in the page as a rAF loop.
 */
async function installCounter() {
  await page.evaluate(() => {
    const G = window.__game;
    if (window.__pages) return;
    const c = (window.__pages = { beat: 'boot', by: {} });
    let lastReq = null;
    let lastPage = -1;
    let lastChoice = null;
    const seen = new WeakSet();
    const bump = (k) => {
      const b = (c.by[c.beat] ??= { pages: 0, choices: 0, other: {} });
      if (k === 'pages' || k === 'choices') b[k]++;
      else b.other[k] = (b.other[k] ?? 0) + 1;
    };
    const tick = () => {
      try {
        const topS = G.game.top;
        const top = topS?.constructor?.name ?? '';
        if (topS && !seen.has(topS) && !['FieldScene', 'BattleScene', 'TitleScene'].includes(top)) {
          seen.add(topS);
          bump(top);
        }
        if (top !== 'BattleScene') {
          for (const w of G.game.ui.widgets) {
            const n = w.constructor.name;
            if (n === 'DialogBox') {
              if (w.cur && (w.cur !== lastReq || w.page !== lastPage)) {
                lastReq = w.cur;
                lastPage = w.page;
                if (w.cur.o?.auto === undefined) bump('pages');
              }
            } else if (n === 'ChoiceBox') {
              if (!w.done && w !== lastChoice) {
                lastChoice = w;
                bump('choices');
              }
            } else if (w.modal && !w.done && !seen.has(w)) {
              seen.add(w);
              bump(n);
            }
          }
        }
      } catch {}
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
const setCountBeat = (b) => page.evaluate((b) => window.__pages && (window.__pages.beat = b), b).catch(() => {});
const readCounts = () => page.evaluate(() => window.__pages?.by ?? {}).catch(() => ({}));

// ------------------------------------------------------------------ dialog

/**
 * Press Z until the field is controllable again (dialog, choices — the first option —,
 * guides, level ups, the hanko case…). Shops are left with X. Battles: `battles`
 * decides ('win' → battleWin, 'keys' → battleByKeys, 'stop' → return).
 */
async function advance({ max = 60000, gap = 260, shotEvery = 0, label = 'ev', battles = 'win', stopAt = null } = {}) {
  const t0 = Date.now();
  let calm = 0;
  let k = 0;
  const out = { presses: 0, battles: [] };
  for (;;) {
    if (reloaded) throw new Error('the page reloaded (HMR) during the run');
    const s = await st();
    if (stopAt && (await stopAt(s))) return out;
    if (s.top === 'TitleScene') return out;
    if (s.battle || s.top === 'BattleScene') {
      if (battles === 'stop') return out;
      const b = battles === 'keys' ? await battleByKeys() : (await battleWin(), { real: false });
      out.battles.push(b);
      battleLog.push({ beat: beatName, ...b });
      continue;
    }
    if (s.ctrl) {
      if (++calm >= 3) return out;
      await sleep(150);
      continue;
    }
    calm = 0;
    if (Date.now() - t0 > max) throw new Error(`advance: still busy after ${max} ms (${JSON.stringify(s)})`);
    if (shotEvery && k % shotEvery === 0) await shot(`${label}${String(k).padStart(3, '0')}`);
    k++;
    if (s.top === 'ShopScene') await tap('KeyX');
    else if (s.top === 'NightSkyScene' || s.top === 'NotebookScene') await sleep(400);
    else await tap('KeyZ');
    out.presses++;
    await sleep(gap);
  }
}

// ------------------------------------------------------------------ the beats

const need = async (ids, what) => {
  const v = await flags(ids);
  const missing = ids.filter((i) => !v[i]);
  if (missing.length) throw new Error(`${what}: flags not set: ${missing.join(', ')}`);
};

/**
 * Talk to an actor: stand next to it (the preferred side first, then the others; two tiles
 * away across a shop counter), face it and press Z. Retries while it walks around.
 */
async function talkTo(id, { side = 'below', tries = 8, key = 'KeyZ' } = {}) {
  for (let i = 0; i < tries; i++) {
    const r = await page.evaluate(
      ([id, side]) => {
        const f = window.__game.cmd.fieldRef();
        const a = f.actors.find((x) => x.id === id);
        if (!a) return 'missing';
        // a wandering one (the stray carts) waits where it is while Minato walks up
        if (a.data?.cart) a.data.wait = 4000;
        const sides = { below: [0, 1, 'up'], above: [0, -1, 'down'], left: [-1, 0, 'right'], right: [1, 0, 'left'] };
        const order = [side, ...Object.keys(sides).filter((k) => k !== side)];
        const p = f.player;
        for (const reach of [1, 2]) {
          for (const k of order) {
            const [dx, dy, dir] = sides[k];
            const tx = a.tileX + dx * reach;
            const ty = a.tileY + dy * reach;
            if (!f.free(p, tx * 16 + 8, ty * 16 + 16, true)) continue;
            p.path = [];
            p.moving = false;
            p.x = tx * 16 + 8;
            p.y = ty * 16 + 16;
            p.dir = dir;
            f.syncFollower(true);
            f.snapCamera();
            return [tx, ty, dir];
          }
        }
        return 'enclosed';
      },
      [id, side],
    );
    if (r === 'missing') throw new Error(`talkTo: no actor ${id} on this map`);
    if (r === 'enclosed') throw new Error(`talkTo: no free tile next to ${id}`);
    await sleep(120);
    await tap(key);
    await sleep(300);
    const s = await st();
    if (!s.ctrl) return s;
  }
  throw new Error(`talkTo(${id}): nothing started`);
}

const BEATS = [
  {
    name: 'title',
    async run() {
      await page.waitForFunction(() => window.__game?.game?.top?.constructor?.name === 'TitleScene', null, { timeout: 30000 });
      await sleep(600);
      await shot('press');
      await tap('KeyZ');
      await sleep(2600);
      await shot('menu');
      // 「はじめる」 (the first tape)
      await tap('KeyZ');
      await waitFor((s) => s.top === 'FieldScene' && s.map === 'map_home_2f', 20000, 'the new game');
    },
  },
  {
    name: 'opening',
    async run() {
      await sleep(900);
      await shot('dark');
      await sleep(2600);
      await shot('room');
      await advance({ shotEvery: 3, label: 'call' });
      await shot('free');
      await need(['flag_opening_done'], 'opening');
    },
  },
  {
    name: 'errand',
    async run() {
      // down the stairs with the arrow keys
      let s = await st();
      if (s.map === 'map_home_2f') {
        await walkTo(8, 5, { vertFirst: true }).catch(() => place(7, 5, 'right'));
        await walk('right', (x) => x.map === 'map_home_1f', 4000);
        await waitFor((x) => x.ctrl || x.modal, 8000, '1F');
      }
      await shot('1f');
      // into the kitchen: trig_errand
      await walkTo(5, 3, { vertFirst: true });
      await advance({ shotEvery: 3, label: 'mom' });
      await need(['flag_errand'], 'errand');
      await shot('after');
      // out of the front door
      await walkTo(5, 7, { vertFirst: true });
      await walkTo(2, 7, { vertFirst: false });
      await walk('down', (x) => x.map === 'map_town', 4000);
    },
  },
  {
    name: 'town',
    async run() {
      await waitFor((s) => s.map === 'map_town' && s.ctrl, 8000, 'the town');
      await sleep(600);
      await shot('home_front');
      await need(['flag_errand', 'flag_opening_done'], 'town');
      if ((await flag('flag_clock')) < 1) throw new Error('the clock did not move on after the errand');
      await assertReach(0);
    },
  },
  {
    name: 'maruyama',
    async run() {
      // on foot from the house down ひぐらし坂 into the ginza
      await travel(27, 23);
      await sleep(300);
      await shot('ginza');
      await walk('up', (s) => s.map === 'map_maruyama', 5000);
      await sleep(900);
      await shot('in');
      await advance({ shotEvery: 3, label: 'talk' });
      await need(['flag_met_maruyama'], 'maruyama');
      await walk('down', (s) => s.map === 'map_town', 4000);
      await waitFor((s) => s.ctrl, 5000, 'outside');
    },
  },
  {
    name: 'hinoya',
    async run() {
      await travel(32, 23);
      await walk('up', (s) => s.map === 'map_hinoya', 5000);
      await sleep(900);
      await shot('in');
      await advance({ shotEvery: 3, label: 'talk' });
      await need(['flag_met_obaa'], 'hinoya');
    },
  },
  {
    name: 'chime',
    async run() {
      let s = await st();
      if (s.map !== 'map_hinoya') {
        await warp('map_hinoya', 4, 6, 'down');
        await waitFor((x) => x.ctrl, 5000, 'hinoya');
      }
      await walk('down', (x) => x.map === 'map_town', 4000);
      await waitFor((x) => x.ctrl, 5000, 'outside');
      // the first step out: ★17:00
      await walk('down', (x) => !x.ctrl, 3000).catch(() => {});
      for (let i = 0; i < 12; i++) {
        await shot(`t${i}`);
        await sleep(450);
      }
      // dialog, then ハト係長 — fought for real with Z
      const r = await advance({ shotEvery: 4, label: 'ev', battles: REAL.has('hato') ? 'keys' : 'win', max: 240000 });
      log('  hato battle:', JSON.stringify(r.battles));
      if (REAL.has('hato') && !r.battles.some((b) => b.real)) throw new Error('ハト係長 was not fought with key input');
      await shot('after');
      await need(['flag_chime_stopped', 'flag_hato_beaten', 'flag_got_hanko'], '17:00 → hato → hanko');
    },
  },
  {
    name: 'mamekichi',
    async run() {
      await travel(36, 22);
      await sleep(400);
      await shot('before');
      await talkTo('npc_mamekichi', { side: 'below' });
      await advance({ shotEvery: 2, label: 'stamp' });
      await need(['flag_fushigi_04', 'flag_park_hint'], 'mamekichi → park hint');
    },
  },
  {
    name: 'alley',
    async run() {
      await assertReach(1);
      await travel(19, 22);
      await sleep(300);
      await walk('up', (s) => s.y <= 19, 5000);
      await sleep(600);
      await shot('float');
      await walk('up', (s) => s.y <= 15, 5000);
      await shot('park_gate');
    },
  },
  {
    name: 'kanenari',
    async run() {
      await travel(16, 13);
      await sleep(700);
      await shot('park');
      await talkTo('npc_kanenari', { side: 'below' });
      await advance({ shotEvery: 3, label: 'ev', battles: REAL.has('kanenari') ? 'keys' : 'win', max: 240000 });
      await shot('stage2');
      await need(['flag_kanenari_joined', 'flag_broadcast', 'flag_parking_open'], 'kanenari → broadcast');
      if ((await flag('flag_stage')) !== 2) throw new Error('not stage 2 after the broadcast');
      await assertReach(2);
    },
  },
  {
    name: 'fushigi',
    async run() {
      if (!FUSHIGI_ALL) return;
      // stage 2: every ふしぎ of the town is active. On foot between them.
      await stampActor('fushigi_07', 'npc_sand_girl', 'below');
      await travel(15, 9);
      await stampObject('fushigi_08');
      await stampActor('fushigi_02', 'npc_cat_sauce', 'below');
      await travel(17, 28);
      await stampObject('fushigi_01');
      await travel(6, 22);
      await stampObject('fushigi_03');
      // the laundry and the police box
      await travel(26, 33);
      await walk('up', (s) => s.map === 'map_laundry', 5000);
      await waitFor((s) => s.ctrl, 5000, 'laundry');
      await stampObject('fushigi_05');
      await exitRoom('map_town');
      await travel(51, 33);
      await walk('up', (s) => s.map === 'map_koban', 5000);
      await waitFor((s) => s.ctrl, 5000, 'koban');
      await stampObject('fushigi_06');
      await exitRoom('map_town');
      // the stray carts in the parking lot
      await travel(44, 11);
      const cart = await page.evaluate(() => window.__game.cmd.fieldRef().actors.find((a) => a.id.startsWith('cart_'))?.id ?? null);
      if (cart) await stampActor('fushigi_09', cart, 'below');
      const n = await fushigiCount();
      log(`  ふしぎ ${n}/12 after the town`);
      await shot('town_done');
    },
  },
  {
    name: 'ojigi',
    async run() {
      await travel(48, 12);
      await sleep(400);
      await shot('parking');
      // a ワスレガサ may catch Minato on the way (a symbol battle first): then walk up again
      for (let i = 0; i < 4 && !(await flag('flag_ojigi_beaten')); i++) {
        if (i) {
          log('  (a symbol battle on the way: once more up to the door)');
          await travel(48, 12);
        }
        await walk('up', (s) => !s.ctrl, 5000);
        await advance({ shotEvery: 3, label: 'ev', battles: REAL.has('ojigi') ? 'keys' : 'win', max: 240000 });
      }
      await need(['flag_ojigi_beaten'], 'ojigi');
      await shot('after');
    },
  },
  {
    name: 'mall',
    async run() {
      await travel(50, 8);
      await walk('up', (s) => s.map === 'map_mall_hall', 5000);
      await sleep(700);
      await shot('hall');
      await advance({ shotEvery: 3, label: 'ev' });
      await need(['flag_mall_entered'], 'mall');
      if (FUSHIGI_ALL) await stampObject('fushigi_10');
    },
  },
  {
    name: 'kaitenyaki',
    async run() {
      await place(1, 7, 'left');
      await walk('left', (s) => s.map === 'map_mall_food', 4000);
      await waitFor((s) => s.ctrl, 5000, 'food court');
      await place(9, 4, 'up');
      await sleep(400);
      await shot('food');
      await tap('KeyZ');
      await advance({ shotEvery: 2, label: 'ev' });
      await need(['flag_fushigi_12', 'flag_got_maigo_key'], 'kaitenyaki');
    },
  },
  {
    name: 'mall2f',
    async run() {
      // the STAFF door → 健康器具 → the escalator
      await place(17, 3, 'up');
      await walk('up', (s) => s.map === 'map_mall_health', 4000);
      await advance({ label: 'staff' });
      if (FUSHIGI_ALL) await stampObject('fushigi_11');
      await place(7, 3, 'up');
      await walk('up', (s) => s.map === 'map_mall_2f', 4000);
      await waitFor((s) => s.ctrl, 5000, '2F');
      await sleep(500);
      await shot('2f');
      // the rest bench: HP back, save
      await place(10, 6, 'up');
      await tap('KeyZ');
      await advance({ shotEvery: 2, label: 'bench' });
      if (!(await flag('flag_saved'))) throw new Error('bench: not saved');
      // ソウジロウ blocks the corridor
      if (!(await flag('flag_soujirou_gate'))) {
        await talkTo('sym_mall_2f_01', { side: 'left', key: 'KeyZ' }).catch(() => {});
        await advance({ label: 'soujirou', battles: REAL.has('soujirou') ? 'keys' : 'win', max: 120000 });
      }
    },
  },
  {
    name: 'door',
    async run() {
      await place(19, 2, 'up');
      await sleep(300);
      await tap('KeyZ');
      await advance({ shotEvery: 2, label: 'door' });
      await need(['flag_maigo_door_open'], 'the door');
      if (FUSHIGI_ALL) {
        const n = await fushigiCount();
        checks.push({ check: 'ふしぎ 12/12 before the boss', ok: n === 12, n });
        if (n !== 12) throw new Error(`--fushigi-all: only ${n}/12 ふしぎ stamped`);
      }
      await walk('up', (s) => s.map === 'map_mall_maigo', 4000);
    },
  },
  {
    name: 'boss',
    async run() {
      await waitFor((s) => s.map === 'map_mall_maigo' && s.ctrl, 6000, 'maigo center');
      await sleep(500);
      await shot('room');
      await walk('up', (s) => !s.ctrl, 5000);
      await advance({ shotEvery: 2, label: 'rise', battles: 'stop' });
      await shot('battle');
      if (REAL.has('boss')) {
        // fought with keys; a lost fight (game over → 「戦う前から やりなおす」) is tried again
        for (let i = 0; i < 3; i++) {
          battleLog.push({ beat: 'boss', try: i + 1, ...(await battleByKeys(600000)) });
          if (await flag('flag_boss_beaten')) break;
          log('  the boss won: 「戦う前から やりなおす」, once more');
          await waitFor((s) => s.ctrl && s.map === 'map_mall_maigo', 20000, 'back at the door');
          await walk('up', (s) => !s.ctrl, 5000);
          await advance({ label: 'retry', battles: 'stop' });
        }
      } else {
        await battleWin(90000);
        battleLog.push({ beat: 'boss', real: false });
      }
      await need(['flag_boss_beaten'], 'boss');
    },
  },
  {
    name: 'ending',
    async run() {
      let lastTop = '';
      let lastMap = '';
      let lastShot = 0;
      const t0 = Date.now();
      for (;;) {
        const s = await st();
        if (s.top === 'TitleScene') break;
        if (Date.now() - t0 > 360000) throw new Error('the ending did not reach the title');
        if (s.top !== lastTop || s.map !== lastMap || Date.now() - lastShot > 1600) {
          lastTop = s.top;
          lastMap = s.map;
          lastShot = Date.now();
          await shot(s.top === 'FieldScene' ? (s.map ?? '').replace('map_', '') : s.top.replace('Scene', '').toLowerCase());
        }
        if (s.top === 'NightSkyScene' || s.top === 'NotebookScene') await sleep(300);
        else if (s.modal) await tap('KeyZ');
        else await sleep(200);
        await sleep(220);
      }
      await sleep(4500);
      await shot('title_clear');
      const rec = await page.evaluate(() => Object.keys(localStorage).filter((k) => /clear/i.test(k)).map((k) => [k, localStorage.getItem(k)]));
      log('  clear record:', JSON.stringify(rec));
      if (!rec.length) throw new Error('no clear record in localStorage');
      // after the clear: ending cut 5 once more, and the dinner must be on the table
      await dinnerCheck();
    },
  },
];


// ------------------------------------------------------------------ chapter 2 (--chapter 2, 02_ch2_index 4.5)

/** Named places of 星見台 for the reachability checks (52 3章). */
const PLACES2 = { station: [25, 44], school: [26, 28], house: [2, 31], barnDoor: [51, 32], gateNorth: [48, 17], houki: [48, 10] };
const REACH2 = {
  0: { station: true, school: true, house: true, barnDoor: true, gateNorth: false, houki: false },
  1: { station: true, school: true, house: true, barnDoor: true, gateNorth: true, houki: true },
};
async function assertReach2(label, stage) {
  const got = await reachable(PLACES2);
  const want = REACH2[stage];
  const bad = Object.keys(want).filter((k) => got[k] !== want[k]);
  checks.push({ check: `reach 星見台 ${label}`, ok: !bad.length, got });
  log(`  reach (${label}): ${Object.entries(got).map(([k, v]) => `${k}${v ? '' : '✗'}`).join(' ')}`);
  if (bad.length) throw new Error(`reachability (${label}): ${bad.map((k) => `${k} ${got[k] ? 'open' : 'closed'} (want ${want[k] ? 'open' : 'closed'})`).join(', ')}`);
}

/** Enemy symbols standing on the map now (visible or not). */
const symCount = () => page.evaluate(() => window.__game.cmd.fieldRef().actors.filter((a) => a.kind === 'sym').length);

/** A chapter-2 story battle: keys with --real <name>, else won. */
async function ch2Battle(name, maxMs = 300000) {
  if (REAL.has(name)) {
    for (let i = 0; i < 3; i++) {
      const b = await battleByKeys(maxMs);
      battleLog.push({ beat: beatName, try: i + 1, ...b });
      const s = await waitFor((x) => x.top === 'FieldScene' || x.top === 'TitleScene' || x.modal, 30000, 'after the battle');
      if (s.top !== 'FieldScene' || !(await page.evaluate(() => !!window.__game.cmd.bstate?.()))) return;
    }
    return;
  }
  await battleWin(120000);
  battleLog.push({ beat: beatName, real: false });
}

/** Walk into a door cell (pushing `dir` from the tile before it) until the map changes. */
async function enterDoor(x, y, dir, to) {
  await travel(x, y);
  await walk(dir, (s) => s.map === to || !s.ctrl, 5000);
  await waitFor((s) => s.map === to, 8000, `into ${to}`);
}

/** The ten ふしぎ ② (--fushigi-all): each map in turn, stamped from beside the object. */
async function stampAllCh2() {
  const plan = [
    ['map_hoshimidai', 25, 40, ['fushigi_ch2_01', 'fushigi_ch2_02', 'fushigi_ch2_03', 'fushigi_ch2_04', 'fushigi_ch2_05']],
    ['map_hoshi_house', 4, 16, ['fushigi_ch2_07']],
    ['map_hoshi_barn', 2, 10, ['fushigi_ch2_08']],
    ['map_hoshi_school', 5, 10, ['fushigi_ch2_09', 'fushigi_ch2_10']],
  ];
  for (const [map, x, y, ids] of plan) {
    await warp(map, x, y, 'up');
    await sleep(600);
    await advance({ label: 'warp' });
    for (const id of ids) await stampObject(id);
  }
  const n = await page.evaluate(() => Array.from({ length: 10 }, (_, i) => window.__game.cmd.flag(`flag_fushigi_ch2_${String(i + 1).padStart(2, '0')}`)).filter(Boolean).length);
  checks.push({ check: 'fushigi ② 10/10 before the boss', ok: n === 10, n });
  log(`  ふしぎ② ${n}/10`);
  if (n !== 10) throw new Error(`ふしぎ②: ${n}/10`);
}

const BEATS2 = [
  {
    name: 'title',
    async run() {
      await page.waitForFunction(() => window.__game?.game?.top?.constructor?.name === 'TitleScene', null, { timeout: 30000 });
      await sleep(600);
      await tap('KeyZ');
      await sleep(2600);
      await shot('menu');
      // はじめる／つづきから／第2章から／せってい: with no save つづきから is greyed out
      // and the cursor steps over it — one step down is 第2章から
      await tap('ArrowDown');
      await sleep(250);
      await tap('KeyZ');
      await sleep(900);
      await shot('ask');
      // the question defaults to やめる: up to はじめる
      await tap('ArrowUp');
      await sleep(200);
      await tap('KeyZ');
      await waitFor((s) => s.top === 'FieldScene' && s.map === 'map_town', 20000, 'chapter 2 from the title');
    },
  },
  {
    name: 'ch2',
    async run() {
      await need(['flag_ch2_started'], 'ch2 start');
      await sleep(2500);
      await shot('caption');
      await sleep(4500);
      await shot('door');
      await advance({ shotEvery: 3, label: 'crossing', max: 120000 });
      await need(['flag_ch2_prologue_done'], 'prologue');
      const s = await st();
      if (s.map !== 'map_hoshi_train') throw new Error(`the prologue ended on ${s.map}`);
      await shot('train');
    },
  },
  {
    name: 'train',
    async run() {
      // to the front of the car and stay 1.5 s (trig_ch2_train_front, on: 'stay')
      await travel(14, 3);
      await sleep(1900);
      await advance({ shotEvery: 3, label: 'arrive', max: 60000 });
      await need(['flag_ch2_arrived'], 'arrive');
      const v = await flags(['flag_ch2_stage', 'flag_ch2_clock']);
      const syms = await symCount();
      const ok = v.flag_ch2_stage === 0 && v.flag_ch2_clock === 0 && syms === 0;
      checks.push({ check: 'arrive: stage 0, 4:59, no enemy symbols', ok, ...v, syms });
      if (!ok) throw new Error(`arrive: ${JSON.stringify({ ...v, syms })}`);
      await assertReach2('h0', 0);
      await shot('platform');
    },
  },
  {
    name: 'yoriai',
    async run() {
      await enterDoor(26, 28, 'up', 'map_hoshi_school');
      await advance({ shotEvery: 3, label: 'yoriai', max: 120000 });
      await need(['flag_ch2_yoriai'], 'yoriai');
      // the dark corridor without the lantern: pushed back at x10
      await travel(9, 9);
      await walk('right', (s) => !s.ctrl, 3000).catch(() => {});
      await advance({ label: 'dark' });
      const s = await st();
      const ok = s.x <= 9;
      checks.push({ check: 'school corridor dark block before the tomato', ok, x: s.x });
      if (!ok) throw new Error(`dark block: at x${s.x}`);
      await exitRoom('map_hoshimidai');
    },
  },
  {
    name: 'mitsu',
    async run() {
      await travel(4, 34);
      await walk('up', (s) => !s.ctrl, 4000);
      await advance({ shotEvery: 3, label: 'mitsu' });
      await need(['flag_ch2_met_mitsu'], 'mitsu');
    },
  },
  {
    name: 'house',
    async run() {
      await enterDoor(2, 31, 'up', 'map_hoshi_house');
      await advance({ label: 'enter' });
      await travel(4, 12);
      await walk('up', (s) => !s.ctrl, 4000);
      await advance({ shotEvery: 2, label: 'sune', battles: 'stop' });
      await ch2Battle('sune');
      await advance({ label: 'after' });
      await need(['flag_ch2_sune_beaten'], 'sune');
    },
  },
  {
    name: 'tomato',
    async run() {
      await travel(4, 2);
      await page.evaluate(() => (window.__game.cmd.fieldRef().player.dir = 'right'));
      await tap('KeyZ');
      await advance({ shotEvery: 3, label: 'tomato', max: 90000 });
      await need(['flag_fushigi_ch2_06', 'flag_ch2_got_tomato'], 'tomato');
      const v = await flags(['flag_ch2_stage']);
      const pair = await page.evaluate(() => !!window.__game.cmd.fieldRef().actorById('sym_hoshi_house_01'));
      const ok = v.flag_ch2_stage === 1 && pair;
      checks.push({ check: 'tomato: stage 1, the pair of sulking tomatoes', ok, stage: v.flag_ch2_stage, pair });
      if (!ok) throw new Error(`tomato: ${JSON.stringify({ ...v, pair })}`);
      await shot('lantern');
      await exitRoom('map_hoshimidai');
      await advance({ label: 'exit' });
    },
  },
  {
    name: 'gen',
    async run() {
      await travel(44, 38);
      await walk('right', (s) => !s.ctrl, 5000);
      await advance({ shotEvery: 3, label: 'gen' });
      await need(['flag_ch2_met_gen'], 'gen');
    },
  },
  {
    name: 'barn',
    async run() {
      await enterDoor(51, 32, 'up', 'map_hoshi_barn');
      await advance({ shotEvery: 4, label: 'barn', max: 180000 });
      await need(['flag_ch2_got_otsukare', 'flag_ch2_gate_open'], 'barn → otsukare → gate');
      await assertReach2('h1 after the gate', 1);
    },
  },
  {
    name: 'tetsuya',
    async run() {
      await travel(48, 9);
      await walk('up', (s) => !s.ctrl, 5000);
      await advance({ shotEvery: 3, label: 'tetsuya', battles: 'stop' });
      await ch2Battle('tetsuya');
      await advance({ shotEvery: 3, label: 'yobigoe', max: 120000 });
      await need(['flag_ch2_tetsuya_beaten'], 'tetsuya');
      const v = await flags(['flag_ch2_stage']);
      checks.push({ check: 'yobigoe: stage 2', ok: v.flag_ch2_stage === 2, stage: v.flag_ch2_stage });
      if (v.flag_ch2_stage !== 2) throw new Error(`yobigoe: stage ${v.flag_ch2_stage}`);
    },
  },
  {
    name: 'hill',
    async run() {
      if (FUSHIGI_ALL) await stampAllCh2();
      if ((await st()).map !== 'map_hoshimidai') await warp('map_hoshimidai', 48, 3, 'up');
      await enterDoor(48, 1, 'up', 'map_hoshi_hill');
      await advance({ label: 'hill' });
      await travel(15, 6);
      await advance({ label: 'top' });
      await shot('plaza');
    },
  },
  {
    name: 'boss',
    async run() {
      await walk('up', (s) => !s.ctrl, 5000);
      await advance({ shotEvery: 2, label: 'intro', battles: 'stop' });
      await ch2Battle('boss', 600000);
      await need(['flag_ch2_boss_beaten'], 'boss');
    },
  },
  {
    name: 'ending',
    async run() {
      let lastTop = '';
      let lastMap = '';
      let lastShot = 0;
      const t0 = Date.now();
      for (;;) {
        const s = await st();
        if (s.top === 'TitleScene') break;
        if (Date.now() - t0 > 420000) throw new Error('the ending did not reach the title');
        if (s.top !== lastTop || s.map !== lastMap || Date.now() - lastShot > 2000) {
          lastTop = s.top;
          lastMap = s.map;
          lastShot = Date.now();
          await shot(s.top === 'FieldScene' ? (s.map ?? '').replace('map_', '') : s.top.replace('Scene', '').toLowerCase());
        }
        if (s.modal) await tap('KeyZ');
        await sleep(300);
      }
      await sleep(4500);
      await shot('title_clear');
      const rec = await page.evaluate(() => localStorage.getItem('hanamaru-clear-ch2-v1'));
      const v = await flags(['flag_ch2_clear', 'flag_ch2_omake']);
      log('  chapter 2 clear record:', rec, JSON.stringify(v));
      const ok = !!rec && v.flag_ch2_clear === 1;
      checks.push({ check: 'chapter 2 clear record and flag_ch2_clear', ok, rec, ...v });
      if (!ok) throw new Error('no chapter 2 clear record');
    },
  },
];

// ------------------------------------------------------------------ run

const results = [];
let failed = false;

const LIST = CHAPTER === 2 ? BEATS2 : BEATS;
if (CHAPTER === 2) {
  // a player who has seen chapter 1's ending: the title shows 「第2章から」
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('hanamaru-clear-v1', JSON.stringify({ fushigi: 8, aite: 7, tsukkomi: 12, tsukkomiTotal: 19 }));
    } catch {}
  });
}

try {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game?.cmd?.jump, null, { timeout: 30000 });
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) reloaded = true;
  });
  await installCounter();
  let start = 0;
  if (FROM) {
    start = LIST.findIndex((b) => b.name === FROM);
    if (start < 0) throw new Error(`--from: unknown beat ${FROM}; beats: ${LIST.map((b) => b.name).join(' ')}`);
    await tap('KeyZ');
    // test beats that are not story beats of jump(): the town's ふしぎ round starts in stage 2
    const JUMP_AS = CHAPTER === 2 ? { ch2: 'ch2:ch2', train: 'ch2:train', yoriai: 'ch2:arrive', mitsu: 'ch2:mitsu', house: 'ch2:house', tomato: 'ch2:tomato', gen: 'ch2:gen', barn: 'ch2:barn', tetsuya: 'ch2:houki', hill: 'ch2:hill', boss: 'ch2:boss', ending: 'ch2:ch2ending' } : { fushigi: 'stage2' };
    await page.evaluate(([b, run]) => window.__game.cmd.jump(b, !run), [JUMP_AS[FROM] ?? FROM, CHAPTER === 2 && (FROM === 'ch2' || FROM === 'ending')]);
    await waitFor((s) => s.top === 'FieldScene', 8000, 'jump');
    await sleep(600);
  }
  for (let i = start; i < LIST.length; i++) {
    const b = LIST[i];
    beatNo = i;
    beatName = b.name;
    shotNo = 0;
    const t = Date.now();
    log(`beat ${b.name}`);
    await setCountBeat(b.name);
    try {
      await b.run();
      results.push({ beat: b.name, ok: true, ms: Date.now() - t });
    } catch (e) {
      failed = true;
      await shot('FAIL').catch(() => {});
      results.push({ beat: b.name, ok: false, ms: Date.now() - t, error: String(e.message ?? e) });
      log(`  FAILED: ${e.message ?? e}`);
      break;
    }
  }
} catch (e) {
  failed = true;
  results.push({ beat: 'setup', ok: false, error: String(e.message ?? e) });
}

const counts = await readCounts();
{
  let tp = 0;
  let tc = 0;
  let to = 0;
  const rows = Object.entries(counts).map(([b, v]) => {
    const o = Object.values(v.other).reduce((a, n) => a + n, 0);
    tp += v.pages;
    tc += v.choices;
    to += o;
    return `  ${b.padEnd(11)} pages ${String(v.pages).padStart(3)}  choices ${String(v.choices).padStart(2)}  other ${o} ${Object.keys(v.other).length ? JSON.stringify(v.other) : ''}`;
  });
  console.log(['pages to press through (outside battles):', ...rows, `  total       pages ${tp}  choices ${tc}  other ${to}  → presses ≈ ${tp + tc + to}`].join('\n'));
}

const summary = {
  base: BASE,
  chapter: CHAPTER,
  counts,
  ok: !failed && !errors.some((e) => e.startsWith('[pageerror]')),
  seconds: Math.round((Date.now() - T0) / 1000),
  realBattles: [...REAL],
  fushigiAll: FUSHIGI_ALL,
  travel: travelLog,
  checks,
  battles: battleLog,
  results,
  errors,
  shots: shots.length,
  out: OUT,
};
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ ...summary, files: shots }, null, 2));
console.log(JSON.stringify(summary, null, 2));
await browser.close();
process.exit(summary.ok ? 0 : 1);
