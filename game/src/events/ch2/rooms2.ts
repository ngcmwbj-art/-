// The rooms of 星見台 that can now be entered (02_ch2_index #61): the one
// script they need (the 2号 greenhouse's door, shut behind you the first
// time), グソっ君's line once per room, and the QA commands
//   __game.cmd.r2('fumi', 2)   jump into a room (at its door) in a stage; r2() lists them
//   __game.cmd.r2Doors()       every door between the village and the rooms: target, arrival, a way back
//   __game.cmd.r2Finds(reset)  the finds and whether they were taken (reset = 1 clears them)
//   __game.cmd.r2Text()        the rooms' pages against 3 lines × 336 px (textcheck2 walks them too)

import type { Co } from '../../engine/co';
import { measure } from '../../engine/font';
import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { cellAt, loadMap } from '../../world/maps';
import { runMsg } from '../../world/msg';
import type { DoorObj } from '../../world/types';
import { ROOM2_MAPS, ROOM2_SPOTS, ROOM2_VILLAGE_DOORS, ROOMS2 } from '../../data/maps/hoshi_rooms2';
import { R2_AFTER, R2_FIND, R2_FLIPS, R2_MISC, R2_OBJ } from '../../data/text/hoshi_rooms2';
import { KANENARI_FLIPS_HOSHI } from '../../data/text/hoshi_npcs';
import { se } from './compat';

// グソっ君's lines of the rooms join the chapter's table (keys hoshi_r_<room>, npcs.ts hoshiPlaceKey)
Object.assign(KANENARI_FLIPS_HOSHI, R2_FLIPS);

/** 2号ハウス: 『ハチ 飼育中 あけたら しめて』 — the first time in, he shuts the door. */
registerScript('evt_hr_house2_shime', function* (): Co {
  if (flag('flag_ch2_house2_shime')) return;
  setFlag('flag_ch2_house2_shime', 1);
  yield 250;
  se('se_h_vinyl_door', { pitch: 0.9 });
  yield* runMsg(R2_MISC.house2_shime);
});

// ---------------------------------------------------------------- QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

registerDebug('r2', (key?: string, stage = 0) => {
  const s = key ? ROOM2_SPOTS[key] ?? ROOM2_SPOTS[String(key).replace(/^map_hoshi_/, '')] : undefined;
  if (!s) return Object.keys(ROOM2_SPOTS);
  return cmd().hoshiAt?.(s[0], s[1], s[2], stage, { dir: 'up' });
});

/** Every door between map_hoshimidai and the rooms: the target, a walkable arrival, a door cell, a way back. */
export function r2Doors(): { ok: number; problems: string[] } {
  const out: string[] = [];
  let ok = 0;
  const check = (from: string, d: DoorObj) => {
    const t = loadMap(d.to);
    const own = loadMap(from);
    if (!t || !own) {
      out.push(`${from} ${d.id}: map ${d.to} missing`);
      return;
    }
    let bad = false;
    const c = cellAt(t, d.tx, d.ty);
    const solidObj = t.objects.some((q) => {
      const s = (q as { solid?: [number, number, number, number] }).solid;
      return !!s && d.tx >= q.x + s[0] && d.tx < q.x + s[0] + s[2] && d.ty >= q.y + s[1] && d.ty < q.y + s[1] + s[3];
    });
    if (c.solid || solidObj) {
      out.push(`${from} ${d.id}: arrival ${d.to} (${d.tx},${d.ty}) is solid`);
      bad = true;
    }
    if (!t.objects.some((q) => q.t === 'door' && (q as DoorObj).to === from)) {
      out.push(`${from} ${d.id}: no door back from ${d.to}`);
      bad = true;
    }
    for (let i = 0; i < (d.w ?? 1); i++)
      if (!cellAt(own, d.x + i, d.y).door) {
        out.push(`${from} ${d.id}: (${d.x + i},${d.y}) is not a door cell`);
        bad = true;
      }
    // the tile one stands on to push into it
    const back = t.objects.find((q) => q.t === 'door' && (q as DoorObj).to === from) as DoorObj | undefined;
    if (back && from === 'map_hoshimidai') {
      const st = cellAt(own, back.tx, back.ty);
      if (st.solid) {
        out.push(`${d.id}: the tile in front (${back.tx},${back.ty}) is solid`);
        bad = true;
      }
    }
    if (!bad) ok++;
  };
  for (const d of ROOM2_VILLAGE_DOORS) check('map_hoshimidai', d);
  for (const id of ROOM2_MAPS) for (const o of loadMap(id)?.objects ?? []) if (o.t === 'door') check(id, o as DoorObj);
  return { ok, problems: out };
}
registerDebug('r2Doors', () => r2Doors());

/**
 * Every examinable of every room can be reached from where one arrives: a
 * walk over the free tiles, then for each thing a free neighbour from which
 * one faces it the way it asks (flat things: the tile itself).
 */
export function r2Reach(): { ok: number; problems: string[] } {
  const out: string[] = [];
  let ok = 0;
  const D: [string, number, number][] = [['up', 0, 1], ['down', 0, -1], ['left', 1, 0], ['right', -1, 0]];
  for (const id of ROOM2_MAPS) {
    const m = loadMap(id);
    if (!m) continue;
    const solidAt = (x: number, y: number) =>
      cellAt(m, x, y).solid ||
      m.objects.some((q) => {
        const s = (q as { solid?: [number, number, number, number] }).solid;
        return !!s && x >= q.x + s[0] && x < q.x + s[0] + s[2] && y >= q.y + s[1] && y < q.y + s[1] + s[3];
      });
    const back = m.objects.find((q) => q.t === 'door') as DoorObj;
    const seen = new Set<string>();
    const q: [number, number][] = [[back.x, back.y - 1]];
    seen.add(`${back.x},${back.y - 1}`);
    while (q.length) {
      const [x, y] = q.shift()!;
      for (const [, dx, dy] of D) {
        const nx = x + dx;
        const ny = y + dy;
        const k = `${nx},${ny}`;
        if (seen.has(k) || nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || solidAt(nx, ny)) continue;
        seen.add(k);
        q.push([nx, ny]);
      }
    }
    for (const o of m.objects) {
      if (o.t !== 'obj') continue;
      const e = o as { id: string; x: number; y: number; w?: number; h?: number; face?: string; flat?: boolean };
      let good = false;
      for (let ix = 0; ix < (e.w ?? 1) && !good; ix++)
        for (let iy = 0; iy < (e.h ?? 1) && !good; iy++) {
          const tx = e.x + ix;
          const ty = e.y + iy;
          if (e.flat && seen.has(`${tx},${ty}`)) good = true;
          for (const [dir, dx, dy] of D) if ((!e.face || e.face === dir) && seen.has(`${tx + dx},${ty + dy}`)) good = true;
        }
      if (good) ok++;
      else out.push(`${id} ${e.id} (${e.x},${e.y}) can't be reached`);
    }
  }
  return { ok, problems: out };
}
registerDebug('r2Reach', () => r2Reach());

registerDebug('r2Finds', (reset = 0) => {
  const rows: string[] = [];
  for (const id of Object.keys(R2_FIND)) {
    const f = 'flag_ch2_find_' + id.replace(/^obj_hr_/, '');
    if (reset) setFlag(f, 0);
    rows.push(`${id}: ${flag(f) ? 'taken' : '-'}`);
  }
  if (reset) setFlag('flag_ch2_house2_shime', 0);
  rows.push(`money ${state.money}`, `inventory ${state.inventory.join(',')}`);
  return rows;
});

/** Width of a line as the dialog lays it out (markup dropped). */
function lineWidth(line: string): number {
  return measure(line.replace(/\{[^}]*\}/g, ''));
}

/** Every page of the rooms: ≤ 3 lines, ≤ 336 px. */
export function r2TextCheck(): { total: number; bad: string[] } {
  const bad: string[] = [];
  let total = 0;
  const pages = (src: string): string[][] => {
    const out: string[][] = [];
    let cur: string[] = [];
    const flush = () => {
      if (cur.length) out.push(cur);
      cur = [];
    };
    for (const raw of src.split('\n')) {
      const t = raw.trim();
      if (!t) continue;
      if (t.startsWith('@') || t === '/') {
        flush();
        continue;
      }
      cur.push(raw.replace(/\s+$/, ''));
    }
    flush();
    return out;
  };
  const walk = (name: string, v: unknown) => {
    if (typeof v === 'string') {
      for (const pg of pages(v)) {
        total++;
        if (pg.length > 3) bad.push(`${name}: ${pg.length} lines: ${pg.join('／')}`);
        for (const l of pg) if (lineWidth(l) > 336) bad.push(`${name}: ${lineWidth(l)}px: ${l}`);
      }
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(`${name}.${k}`, x);
  };
  walk('rooms2', ROOMS2_TEXTS);
  return { total, bad };
}
registerDebug('r2Text', () => r2TextCheck());

/** Every page of the rooms (textcheck2 walks these too). */
export const ROOMS2_TEXTS = { obj: R2_OBJ, find: R2_FIND, after: R2_AFTER, flip: R2_FLIPS, misc: R2_MISC };

void ROOMS2;
