// QA for the chapter-2 maps (52_ch2_level_art 1.3 / 14章): jump straight to a
// Visual-QA screen of 星見台 at a given stage, with the story flags that stage
// implies, the camera fixed on the screen's centre and no enter-events.
//
//   __game.cmd.hoshi('arrive', 0)      // screen_hoshi_arrive in h0
//   __game.cmd.hoshi('barn_in', 1)     // inside the barn with the lantern
//   __game.cmd.hoshi('houki', 1, { tomato: false })   // the dark without the lantern
//   __game.cmd.hoshi()                 // the list of screens
//   __game.cmd.hoshiAt('map_hoshimidai', 48, 19, 1)   // any tile
//   __game.cmd.hoshi('barn_in', 1, { chores: true })   // 牛舎のおてつだい: the nine spots waiting
//   __game.cmd.hprops(['prop_h_bus', ['prop_h_cow', { pose: 'front' }]], { zoom: 3 })   // the props alone

import { getProp, hasProp } from '../../art/props/registry';
import type { PropEnv } from '../../art/props/types';
import { registerDebug } from '../../debug';
import { game, type Scene } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import { H, W } from '../../engine/screen';
import { addItem, hasItem, setFlag, state, type Dir } from '../../game/state';
import { field, FieldScene } from '../../world/field';

/** 52 1.3: [map, centre x, centre y, camera held on the centre]. */
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
  // the rooms and the hill: the map's own camera (a room narrower than the
  // screen is centred by it, the hill's plaza has its camLock)
  train: ['map_hoshi_train', 9, 3, false],
  house_in: ['map_hoshi_house', 4, 12, false],
  house_top: ['map_hoshi_house', 4, 5, false],
  barn_in: ['map_hoshi_barn', 11, 6, false],
  school_in: ['map_hoshi_school', 12, 6, false],
  hill_path: ['map_hoshi_hill', 11, 13, false],
  hill_top: ['map_hoshi_hill', 12, 4, false],
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
  /** h1: the gate already opened (マサルさん's events done). Default true for the fence / fields screens. */
  gate?: boolean;
  /** h1 in the barn: the chores running (evt_ch2_barn_work), none of the nine spots done yet. */
  chores?: boolean;
}

const CHORE_SPOTS = ['esa_01', 'esa_02', 'esa_03', 'esa_04', 'esa_05', 'esa_06', 'cup_01', 'cup_02', 'cup_03'].map((s) => 'flag_spot_h_' + s);

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
  f('flag_ch2_barn_work', 0);
  f('flag_ch2_barn_work_on', o.chores && stage === 1 ? 1 : 0);
  for (const id of CHORE_SPOTS) f(id, 0);
}

function go(map: string, x: number, y: number, dir: Dir, cam: [number, number] | null, stage: number): FieldScene | null {
  let f = field();
  if (!f) {
    game.replaceAll(new FieldScene(map, x, y, dir));
    f = field();
  } else f.loadMap(map, x, y, dir);
  if (!f) return null;
  f.setStage(stage, 0);
  // the morning (h3): straight to pal_h3c (the stage change itself starts at the dawn's h3a)
  if (stage >= 3) (f as unknown as { setGradeH?: (k: string, ms: number) => void }).setGradeH?.('h3c', 0);
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
  // on the hill: its enter-event and the plaza's first-arrival flip already seen
  if (id.startsWith('hill') && stage < 3) {
    setFlag('flag_ch2_hill', 1);
    if (id === 'hill_top') setFlag('flag_ch2_hill_top', 1);
  }
  const st = STAND[id] ?? [s[1], s[2], 'down'];
  go(s[0], st[0], st[1], st[2], s[3] ? [s[1], s[2]] : null, stage);
  return `screen_hoshi_${id} h${stage}`;
});

registerDebug('hoshiAt', (map: string, x: number, y: number, stage = 0, o: HoshiQaOpts & { dir?: Dir } = {}) => {
  hoshiStageFlags(stage, o);
  go(map, x, y, o.dir ?? 'down', null, stage);
  return `${map} (${x},${y}) h${stage}`;
});

// ---------------------------------------------------------------- the props themselves

/**
 * __game.cmd.hprops([['prop_h_bus', {view: 'back'}], 'prop_h_fumidai'], {zoom: 2, flags: {...}, t: 0})
 * lays the given chapter-2 props out on a plain ground (daylight colours, no
 * grade) to look at them one by one; any key to return to the field.
 */
class PropSheet implements Scene {
  private t = 0;
  constructor(
    private list: [string, Record<string, unknown>][],
    private zoom: number,
    private flags: Record<string, number>,
    private t0: number,
  ) {}
  update(dt: number): void {
    this.t += dt * 1000;
  }
  draw(g: Gfx): void {
    g.rect(0, 0, W, H, '#6E7A5E');
    const env = {
      t: this.t0 + this.t,
      stage: 0,
      grade: 'day',
      motion: 1,
      mt: this.t0 + this.t,
      flag: (id: string) => this.flags[id] ?? 0,
      seed: 1,
      near: 999,
      px: 0,
      py: 0,
    } as unknown as PropEnv;
    let x = 4;
    let y = 4;
    let rowH = 0;
    const z = this.zoom;
    for (const [id, o] of this.list) {
      const a = getProp(id, o);
      const img = a?.img(env);
      if (!img) {
        g.text(id + '?', x, y, { color: '#FFD23F' });
        x += 80;
        continue;
      }
      if (x + img.width * z > W) {
        x = 4;
        y += rowH + 4;
        rowH = 0;
      }
      g.img(img, x, y, { scale: z });
      x += img.width * z + 4;
      rowH = Math.max(rowH, img.height * z);
    }
  }
}

registerDebug('hprops', (list: (string | [string, Record<string, unknown>])[] = [], o: { zoom?: number; flags?: Record<string, number>; t?: number } = {}) => {
  const l = list.map((e) => (typeof e === 'string' ? ([e, {}] as [string, Record<string, unknown>]) : e));
  game.replaceAll(new PropSheet(l, o.zoom ?? 1, o.flags ?? {}, o.t ?? 0));
  return l.map(([id]) => `${id}${hasProp(id) ? '' : ' (missing)'}`);
});
