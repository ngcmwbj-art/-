// World/field module entry: registers the field scene, map data, prop art,
// msg-command hooks and the world debug commands.
//
//   ?scene=field&map=map_town&x=12&y=30&stage=1&dir=up

import { registerScene, sceneNames } from '../boot';
import { registerDebug } from '../debug';
import { game } from '../engine/game';
import { flag, saveGame, setFlag, state, type Dir } from '../game/state';
import { getItem, joinKanenari, newGameParty } from '../data/battle';
import '../data/maps';
import '../art/props';
import './places';
import { FieldScene, field } from './field';
import { hasMap, mapIds } from './maps';
import { setMsgHooks } from './msg';
import { setItemNameResolver } from './interact';
import { hasScript } from './scripts';
import { setStampFx } from './fushigi';
import { stampFx } from './stamp';
import * as snd from './audio';
import { runMsg } from './msg';
import type { Co } from '../engine/co';
import { checkOcclusion } from './occlusion';

export { FieldScene, field } from './field';

setItemNameResolver((id) => getItem(id)?.name ?? id);
setStampFx(stampFx);

function ensureParty(): void {
  if (!state.party.length) newGameParty();
  if (flag('flag_kanenari_joined') && !state.party.some((m) => m.id === 'kanenari')) joinKanenari();
}

setMsgHooks({
  command(name, args): Co | void {
    switch (name) {
      case 'heal':
        for (const m of state.party) m.hp = m.maxHp;
        snd.se('se_heal');
        setFlag('flag_mom_rest', flag('flag_mom_rest') + 1);
        return;
      case 'fullheal':
        for (const m of state.party) {
          m.hp = m.maxHp;
          m.mp = m.maxMp;
        }
        snd.se('se_heal');
        return;
      case 'mp': {
        const mi = state.party.find((m) => m.id === 'minato');
        if (mi) mi.mp = Math.min(mi.maxMp, mi.mp + Number(args[0] ?? 2));
        return;
      }
      case 'money':
        state.money += Number(args[0] ?? 0);
        snd.se('se_coin');
        return;
      case 'se':
        snd.se(args[0], args[1] ? { pitch: Number(args[1]) } : undefined);
        return;
      case 'save': {
        const ok = saveGame();
        setFlag('flag_saved', 1);
        snd.se(ok ? 'se_save' : 'se_buzzer');
        return;
      }
      case 'gacha':
        return gachaCo();
      case 'script': {
        const f = field();
        if (f && hasScript(args[0])) f.runScriptId(args[0], 'msg');
        return;
      }
    }
  },
});

/** ひのやの店先のガチャ (10_narrative 12.2). */
function* gachaCo(): Co {
  const i = yield* runMsg(`@sys
回す？（100円）
? 回す | やめておく`);
  if (i !== 0) return;
  if (state.money < 100) {
    yield* runMsg(`@narr
100円玉が ない。`);
    return;
  }
  const bag = state.inventory.filter((id) => !(getItem(id) as { key?: boolean } | undefined)?.key).length;
  if (bag >= 14) {
    yield* runMsg(`@narr
もちものが いっぱいだ。{w=300}
回すのは、やめておこう。`);
    return;
  }
  state.money -= 100;
  snd.se('se_gacha');
  yield 700;
  yield* runMsg(`@narr
ガチャッ……ころん。`);
  state.inventory.push('item_capsule');
  snd.se('se_item');
  yield* runMsg(`@sys
ガチャの カプセルを 手に入れた！`);
  setFlag('flag_gacha_count', flag('flag_gacha_count') + 1);
  if (flag('flag_gacha_count') === 3)
    yield* runMsg(`@narr
カプセルが、夕日に すけて
きれいだ。`);
}

function makeField(p: URLSearchParams): FieldScene {
  ensureParty();
  const stage = p.get('stage');
  if (stage !== null) setFlag('flag_stage', Number(stage));
  if (!state.money && !flag('flag_errand') && p.get('map')) state.money = 500;
  let map = p.get('map') ?? (state.map && hasMap(state.map) ? state.map : 'map_home_2f');
  if (!hasMap(map)) map = 'map_home_2f';
  const x = Number(p.get('x') ?? (p.get('map') ? NaN : state.map === map ? state.x : NaN));
  const y = Number(p.get('y') ?? (p.get('map') ? NaN : state.map === map ? state.y : NaN));
  const start = DEFAULT_START[map] ?? [5, 3, 'up'];
  const dir = (p.get('dir') as Dir | null) ?? (Number.isFinite(x) ? state.dir : start[2]);
  applyStageDefaults(Number(flag('flag_stage')));
  return new FieldScene(map, Number.isFinite(x) ? x : start[0], Number.isFinite(y) ? y : start[1], dir);
}

const DEFAULT_START: Record<string, [number, number, Dir]> = {
  map_home_2f: [5, 3, 'up'],
  map_home_1f: [2, 7, 'up'],
  map_town: [4, 32, 'down'],
};

/** When jumping straight into a stage for QA, set the flags that stage implies. */
function applyStageDefaults(s: number): void {
  if (s >= 1) {
    setFlag('flag_errand', 1);
    setFlag('flag_opening_done', 1);
    setFlag('flag_chime_stopped', 1);
    if (!flag('flag_clock') || flag('flag_clock') < 3) setFlag('flag_clock', 3);
  }
  if (s >= 2) {
    setFlag('flag_got_hanko', 1);
    setFlag('flag_hato_beaten', 1);
    state.taken['sym_town_01'] = true;
    setFlag('flag_kanenari_joined', 1);
    setFlag('flag_broadcast', 1);
    setFlag('flag_parking_open', 1);
    setFlag('flag_park_hint', 1);
    ensureParty();
  }
  if (s >= 3) setFlag('flag_clock', 4);
}

registerScene('field', (p) => makeField(p));
// Until the UI team registers the title screen, booting without ?scene= starts the field.
if (!sceneNames().includes('title')) registerScene('title', (p) => makeField(p));

// ---------------------------------------------------------------- debug commands

/** Is a character standing on tile (tx, ty) hidden behind something drawn in front of it? */
function hiddenAt(f: FieldScene, tx: number, ty: number): boolean {
  const x0 = tx * 16 + 2;
  const x1 = tx * 16 + 14;
  const y0 = ty * 16 - 8;
  const y1 = ty * 16 + 16;
  for (const p of f.props) {
    const a = p.art;
    if (!p.present || a.flat) continue;
    if (p.y + a.foot <= ty * 16 + 16) continue;
    if (p.x + a.ox < x1 && p.x + a.ox + a.w > x0 && p.y + a.oy < y1 && p.y + a.oy + a.h > y0) return true;
  }
  for (const s of f.structures) {
    if (s.foot <= ty * 16 + 16) continue;
    const sx = s.tx * 16 + s.art.ox;
    const sy = s.ty * 16 + s.art.oy;
    if (sx < x1 && sx + s.art.img.width > x0 && sy < y1 && sy + s.art.img.height > y0) return true;
  }
  return false;
}

/** Nearest tile (spiral search) where the player's feet box is free and nothing stands in front of them. */
function nearestFree(f: FieldScene, x: number, y: number): [number, number] {
  let fallback: [number, number] | null = null;
  for (let r = 0; r < 8; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = x + dx;
        const ty = y + dy;
        if (!f.free(f.player, tx * 16 + 8, ty * 16 + 16)) continue;
        if (!hiddenAt(f, tx, ty)) return [tx, ty];
        fallback ??= [tx, ty];
      }
  return fallback ?? [x, y];
}

registerDebug('warp', (map: string, x: number, y: number, dir?: Dir) => {
  const f = field();
  if (!hasMap(map)) return `unknown map ${map}; maps: ${mapIds().join(', ')}`;
  if (f) {
    f.loadMap(map, x, y, dir ?? 'down');
    f.runEnterScripts();
  } else game.replaceAll(new FieldScene(map, x, y, dir ?? 'down'));
  return `warped to ${map} (${x},${y})`;
});
registerDebug('stage', (n: number, ms?: number) => {
  applyStageDefaults(n);
  const f = field();
  if (f) {
    f.setStage(n, ms ?? 0);
    f.syncFollower(true);
    f.applyAudio(false);
  } else setFlag('flag_stage', n);
  return `stage ${n}`;
});
registerDebug('noclip', (on?: boolean) => {
  const f = field();
  if (f) f.noclip = on ?? !f.noclip;
  return `noclip ${f?.noclip}`;
});
registerDebug('collision', (on?: boolean) => {
  const f = field();
  if (f) f.showCollision = on ?? !f.showCollision;
  return `collision ${f?.showCollision}`;
});
registerDebug('where', () => {
  const f = field();
  if (!f) return 'field not active';
  return { map: f.map.id, x: f.player.tileX, y: f.player.tileY, px: Math.round(f.player.x), py: Math.round(f.player.y), dir: f.player.dir, stage: flag('flag_stage') };
});
registerDebug('flag', (id: string, v?: number) => {
  if (v !== undefined) setFlag(id, v);
  return flag(id);
});
registerDebug('join', () => {
  setFlag('flag_kanenari_joined', 1);
  ensureParty();
  field()?.syncFollower(true);
  return 'kanenari joined';
});
registerDebug('cam', (x: number, y: number) => {
  const f = field();
  if (!f) return;
  f.camOverride = { x: x * 16 + 8, y: y * 16 + 8 };
  f.camX = Math.max(0, Math.min(f.map.w * 16 - 384, x * 16 + 8 - 192));
  f.camY = Math.max(0, Math.min(f.map.h * 16 - 216, y * 16 + 8 - 108));
  return 'camera fixed; cam(null) not supported — use camFree()';
});
registerDebug('camFree', () => {
  const f = field();
  if (f) f.camOverride = null;
});
/** Jump to one of the 11 Visual-QA screens (30_level_art 1.3). */
registerDebug('screen', (id: string) => {
  const S: Record<string, [number, number]> = {
    screen_home_front: [12, 30],
    screen_slope_top: [12, 19],
    screen_ginza_w: [35, 22],
    screen_ginza_e: [52, 23],
    screen_kawabe_w: [36, 33],
    screen_kawabe_e: [52, 33],
    screen_taigan: [12, 38],
    screen_park_w: [10, 7],
    screen_park_e: [20, 7],
    screen_parking_w: [40, 9],
    screen_mall_front: [51, 6],
  };
  const c = S[id] ?? S['screen_' + id];
  if (!c) return Object.keys(S);
  let f = field();
  if (!f) {
    game.replaceAll(new FieldScene('map_town', c[0], c[1], 'down'));
    f = field();
  }
  if (!f) return;
  if (f.map.id !== 'map_town') f.loadMap('map_town', c[0], c[1], 'down');
  // stand on the nearest walkable tile (the camera still centres on the screen)
  const [px, py] = nearestFree(f, c[0], c[1]);
  f.player.x = px * 16 + 8;
  f.player.y = py * 16 + 16;
  f.player.dir = 'down';
  f.syncFollower(true);
  f.camOverride = { x: c[0] * 16 + 8, y: c[1] * 16 + 8 };
  f.camX = Math.max(0, Math.min(f.map.w * 16 - 384, c[0] * 16 + 8 - 192));
  f.camY = Math.max(0, Math.min(f.map.h * 16 - 216, c[1] * 16 + 8 - 108));
  return id;
});
/** List the props, structures and actors whose art overlaps tile (x, y) (QA). */
registerDebug('probe', (x: number, y: number) => {
  const f = field();
  if (!f) return 'field not active';
  const x0 = x * 16;
  const y0 = y * 16;
  const hit = (ax: number, ay: number, w: number, h: number) => ax < x0 + 16 && ax + w > x0 && ay < y0 + 16 && ay + h > y0;
  const out: string[] = [];
  for (const p of f.props) {
    const a = p.art;
    if (!p.present || !hit(p.x + a.ox, p.y + a.oy, a.w, a.h)) continue;
    const id = p.obj.t === 'prop' ? p.obj.prop : p.obj.prop ?? p.obj.id;
    out.push(`${id}@${p.x / 16},${p.y / 16} foot=${p.y + a.foot}${a.flat ? ' flat' : ''}${a.xray !== undefined ? ' xray' : ''}${a.fg ? ' fg' : ''}`);
  }
  for (const s of f.structures) {
    const sx = s.tx * 16 + s.art.ox;
    const sy = s.ty * 16 + s.art.oy;
    if (hit(sx, sy, s.art.img.width, s.art.img.height)) out.push(`struct@${s.tx},${s.ty} foot=${s.foot}`);
  }
  for (const a of [...f.actors, f.player]) if (hit(a.x - 8, a.y - 24, 16, 24)) out.push(`actor ${a.id} foot=${Math.round(a.y)}`);
  return out;
});
/** NPCs / symbols over half hidden by props, walls or canopies on the current map and stage (QA). */
registerDebug('occlusion', (limit?: number) => {
  const f = field();
  if (!f) return 'field not active';
  return checkOcclusion(f, limit ?? 0.5);
});
/** The live FieldScene (QA scripting from the page console). */
registerDebug('fieldRef', () => field());
