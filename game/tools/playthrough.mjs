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
//                                                     (default: hato; the rest use __game.cmd.win())
//   node tools/playthrough.mjs --headed               watch it
//
// Beats (each one's flag must be set before the next begins):
//   title  opening  errand  town  maruyama  hinoya  chime (★17:00 → ハト係長 → ハンコケース)
//   mamekichi (fushigi_04, 公園のヒント)  alley  kanenari (加入戦 → 迷子のお知らせ → 段階2)
//   ojigi  mall  kaitenyaki (鍵・やりなおし)  mall2f (ベンチでセーブ・ソウジロウ)  door  boss  ending
// Movement: teleports (__game.cmd.fieldRef) put Minato a few tiles before an event; the last
// steps, doors, talking, examining, choices and dialog are key presses.
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
const REAL = new Set(opt('--real', 'hato').split(',').filter(Boolean));
const HEADED = args.includes('--headed');

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

// ------------------------------------------------------------------ battles

/** A real battle: the command window and the timing rings answered with Z. */
async function battleByKeys(maxMs = 180000) {
  const t0 = Date.now();
  let lastShot = 0;
  let rounds = 0;
  let presses = 0;
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
    },
  },
  {
    name: 'maruyama',
    async run() {
      await place(27, 24, 'up');
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
      await place(32, 23, 'up');
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
      await place(36, 22, 'up');
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
      await place(19, 22, 'up');
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
      await place(16, 13, 'up');
      await sleep(700);
      await shot('park');
      await talkTo('npc_kanenari', { side: 'below' });
      await advance({ shotEvery: 3, label: 'ev', battles: REAL.has('kanenari') ? 'keys' : 'win', max: 240000 });
      await shot('stage2');
      await need(['flag_kanenari_joined', 'flag_broadcast', 'flag_parking_open'], 'kanenari → broadcast');
      if ((await flag('flag_stage')) !== 2) throw new Error('not stage 2 after the broadcast');
    },
  },
  {
    name: 'ojigi',
    async run() {
      await place(48, 12, 'up');
      await sleep(400);
      await shot('parking');
      await walk('up', (s) => !s.ctrl, 5000);
      await advance({ shotEvery: 3, label: 'ev', battles: REAL.has('ojigi') ? 'keys' : 'win', max: 240000 });
      await need(['flag_ojigi_beaten'], 'ojigi');
      await shot('after');
    },
  },
  {
    name: 'mall',
    async run() {
      await place(50, 7, 'up');
      await walk('up', (s) => s.map === 'map_mall_hall', 5000);
      await sleep(700);
      await shot('hall');
      await advance({ shotEvery: 3, label: 'ev' });
      await need(['flag_mall_entered'], 'mall');
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
      if (REAL.has('boss')) battleLog.push({ beat: 'boss', ...(await battleByKeys(600000)) });
      else {
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
    },
  },
];

// ------------------------------------------------------------------ run

const results = [];
let failed = false;

try {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game?.cmd?.jump, null, { timeout: 30000 });
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) reloaded = true;
  });
  let start = 0;
  if (FROM) {
    start = BEATS.findIndex((b) => b.name === FROM);
    if (start < 0) throw new Error(`--from: unknown beat ${FROM}; beats: ${BEATS.map((b) => b.name).join(' ')}`);
    await tap('KeyZ');
    await page.evaluate((b) => window.__game.cmd.jump(b === 'chime' ? 'chime' : b, true), FROM);
    await waitFor((s) => s.top === 'FieldScene', 8000, 'jump');
    await sleep(600);
  }
  for (let i = start; i < BEATS.length; i++) {
    const b = BEATS[i];
    beatNo = i;
    beatName = b.name;
    shotNo = 0;
    const t = Date.now();
    log(`beat ${b.name}`);
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

const summary = {
  base: BASE,
  ok: !failed && !errors.some((e) => e.startsWith('[pageerror]')),
  seconds: Math.round((Date.now() - T0) / 1000),
  realBattles: [...REAL],
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
