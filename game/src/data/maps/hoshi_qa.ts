// QA for the chapter-2 maps (52_ch2_level_art 1.3 / 14章): jump straight to a
// Visual-QA screen of 星見台 at a given stage, with the story flags that stage
// implies, the camera fixed on the screen's centre and no enter-events.
//
//   __game.cmd.hoshi('arrive', 0)      // screen_hoshi_arrive in h0
//   __game.cmd.hoshi('barn_in', 1)     // inside the barn with the lantern
//   __game.cmd.hoshi('houki', 1, { tomato: false })   // the dark without the lantern
//   __game.cmd.hoshi()                 // the list of screens
//   __game.cmd.hoshiAt('map_hoshimidai', 48, 19, 1)   // any tile

import { registerDebug } from '../../debug';
import { game } from '../../engine/game';
import { addItem, hasItem, setFlag, state, type Dir } from '../../game/state';
import { field, FieldScene } from '../../world/field';

/** 52 1.3: [map, centre x, centre y, fixed camera] (the rooms that fit the screen are centred by the map). */
export const HOSHI_SCREENS: Record<string, [string, number, number, boolean]> = {
  arrive: ['map_hoshimidai', 25, 41, true],
  bus: ['map_hoshimidai', 38, 40, true],
  tsuji: ['map_hoshimidai', 26, 31, true],
  school_e: ['map_hoshimidai', 39, 28, true],
  west: ['map_hoshimidai', 6, 30, true],
  kominka: ['map_hoshimidai', 7, 42, true],
  tanada: ['map_hoshimidai', 24, 10, true],
  barn: ['map_hoshimidai', 52, 33, true],
  gate: ['map_hoshimidai', 49, 21, true],
  houki: ['map_hoshimidai', 47, 11, true],
  yamaguchi: ['map_hoshimidai', 48, 5, true],
  train: ['map_hoshi_train', 9, 3, false],
  house_in: ['map_hoshi_house', 4, 12, true],
  house_top: ['map_hoshi_house', 4, 5, true],
  barn_in: ['map_hoshi_barn', 11, 6, false],
  school_in: ['map_hoshi_school', 12, 6, true],
  hill_path: ['map_hoshi_hill', 11, 13, true],
  hill_top: ['map_hoshi_hill', 12, 4, true],
};

/** Where the player stands for a screen (a walkable tile near the centre). */
const STAND: Record<string, [number, number, Dir]> = {
  arrive: [25, 44, 'up'],
  bus: [38, 39, 'down'],
  tsuji: [26, 32, 'up'],
  school_e: [39, 29, 'up'],
  west: [6, 31, 'up'],
  kominka: [7, 44, 'up'],
  tanada: [20, 11, 'right'],
  barn: [52, 33, 'up'],
  gate: [48, 20, 'up'],
  houki: [48, 11, 'up'],
  yamaguchi: [48, 6, 'up'],
  train: [9, 3, 'right'],
  house_in: [4, 12, 'up'],
  house_top: [4, 5, 'up'],
  barn_in: [11, 6, 'right'],
  school_in: [11, 9, 'right'],
  hill_path: [11, 14, 'up'],
  hill_top: [12, 6, 'up'],
};

export interface HoshiQaOpts {
  /** Force the lantern on / off (default: on from h1). */
  tomato?: boolean;
  /** h1: the gate already opened (ゲンさん's events done). Default true for the fence / fields screens. */
  gate?: boolean;
}

/** Set the story flags a stage implies (02_ch2 4.5's beats, roughly). */
export function hoshiStageFlags(stage: number, o: HoshiQaOpts = {}): void {
  const f = (id: string, v = 1) => setFlag(id, v);
  f('flag_ch2_started');
  f('flag_ch2_prologue_done');
  f('flag_ch2_arrived');
  f('flag_stage', 3);
  f('flag_ch2_stage', Math.max(0, Math.min(3, stage)));
  f('flag_ch2_clock', stage >= 3 ? 1 : 0);
  const tomato = o.tomato ?? stage >= 1;
  const later = [
    'flag_ch2_yoriai', 'flag_ch2_met_mitsu', 'flag_ch2_sune_beaten', 'flag_ch2_got_tomato', 'flag_fushigi_ch2_06',
    'flag_ch2_house_exit', 'flag_ch2_met_gen', 'flag_ch2_got_otsukare', 'flag_ch2_gate_open', 'flag_ch2_houki_enter',
    'flag_ch2_tetsuya_beaten', 'flag_ch2_hill', 'flag_ch2_hill_top', 'flag_ch2_boss_beaten',
  ];
  for (const id of later) f(id, 0);
  if (stage >= 1 || tomato) for (const id of later.slice(0, 6)) f(id);
  if (!tomato) {
    f('flag_ch2_got_tomato', 0);
    f('flag_fushigi_ch2_06', 0);
  } else if (!hasItem('item_hanamaru_tomato')) addItem('item_hanamaru_tomato');
  if ((stage === 1 && o.gate !== false && (o.gate || stage >= 1)) || stage >= 2) for (const id of later.slice(6, 10)) f(id);
  if (stage === 1 && o.gate === false) for (const id of later.slice(6, 10)) f(id, 0);
  if (stage >= 2) {
    f('flag_ch2_tetsuya_beaten');
    state.taken['sym_hoshi_07'] = true;
  } else delete state.taken['sym_hoshi_07'];
  if (stage >= 3) for (const id of later.slice(11)) f(id);
}

function go(map: string, x: number, y: number, dir: Dir, cam: [number, number] | null, stage: number): FieldScene | null {
  let f = field();
  if (!f) {
    game.replaceAll(new FieldScene(map, x, y, dir));
    f = field();
  } else f.loadMap(map, x, y, dir);
  if (!f) return null;
  f.setStage(stage, 0);
  f.refreshPresence(true);
  f.syncFollower(true);
  f.applyAudio(false);
  if (cam) {
    f.camOverride = { x: cam[0] * 16 + 8, y: cam[1] * 16 + 8 };
  } else f.camOverride = null;
  f.snapCamera();
  return f;
}

registerDebug('hoshi', (screen?: string, stage = 0, o: HoshiQaOpts = {}) => {
  const id = (screen ?? '').replace(/^screen_hoshi_/, '');
  const s = HOSHI_SCREENS[id];
  if (!s) return Object.keys(HOSHI_SCREENS);
  hoshiStageFlags(stage, o);
  const st = STAND[id] ?? [s[1], s[2], 'down'];
  go(s[0], st[0], st[1], st[2], s[3] ? [s[1], s[2]] : null, stage);
  return `screen_hoshi_${id} h${stage}`;
});

registerDebug('hoshiAt', (map: string, x: number, y: number, stage = 0, o: HoshiQaOpts & { dir?: Dir } = {}) => {
  hoshiStageFlags(stage, o);
  go(map, x, y, o.dir ?? 'down', null, stage);
  return `${map} (${x},${y}) h${stage}`;
});
