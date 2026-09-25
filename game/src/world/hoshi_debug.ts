// QA for the 星見台 field systems (02_ch2 7章 world: "デバッグ"): jump to the
// village and its Visual-QA screens (52 1.3), switch 星見台's stage, show the
// dark and the light's reach, force the lantern and its radius, fire the
// loudspeaker's call, turn the scarecrows, and a small test ground of our
// own (map_hoshi_qa) with every chapter-2 symbol behaviour, a dark half, a
// stay trigger, the fence gate and water for the mirrored sky — for trying
// the systems while the level team's maps are still being built.
//
//   __game.cmd.hoshi('arrive')      screen_hoshi_arrive on map_hoshimidai
//   __game.cmd.hstage(1)            stage h1 (and what it implies)
//   __game.cmd.darkView()           outline the dark tiles and the light's reach
//   __game.cmd.lanternR(60)         fix the lantern's radius (null: breathe again)
//   __game.cmd.hoshiQa(1)           the test ground at h1

import { registerDebug } from '../debug';
import { game } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { addItem, flag, hasItem, setFlag, state, type Dir } from '../game/state';
import { field, FieldScene } from './field';
import { registerWorldFx } from './fx';
import { callNow, callState, turnScarecrows } from './hoshi';
import { darkRectsOf, setLanternOverride, SHOW_MARGIN, SYM_MARGIN } from './lantern';
import { GRADES_H, type GradeHKey } from './lighting';
import { getMapDef, hasMap, isCh2Map, registerMap } from './maps';
import type { MapDef, MapObj, TileSpec } from './types';

// ---------------------------------------------------------------- the test ground (map_hoshi_qa)

/**
 * 30×18: the west half (x1–15) is the ordinary night — the boar's lane, the
 * sulking tomato, the stall and the ridge — and a hedge with the fence gate
 * `G` (y4–5) and two gaps (y7–8, y15–16) leads into the dark east half
 * (x17–28): the fence keeper's band, the scarecrow, テツヤ's furrow (y1).
 */
function qaRows(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < 18; y++) {
    let r = '';
    for (let x = 0; x < 30; x++) {
      let c = ',';
      if (y === 0 || y === 17 || x === 0 || x === 29) c = 'H';
      else if (x === 16) c = y === 4 || y === 5 ? 'G' : y === 7 || y === 8 || y >= 15 ? '"' : 'H';
      else if (x > 16) c = y <= 2 ? ':' : '"';
      else if (y === 10) c = 'a';
      else if (y === 7 || y === 8) c = ':';
      else if (y === 15) c = 'w';
      else if (x === 4 && y === 12) c = 'S';
      r += c;
    }
    rows.push(r);
  }
  return rows;
}
const QA_ROWS = qaRows();

const QA_LEGEND: Record<string, TileSpec> = {
  ',': { ground: 'grass' },
  ':': { ground: 'dirt' },
  '"': { ground: 'weeds', step: 'se_step_grass' },
  a: { ground: 'dirt' },
  H: { ground: 'grass', solid: true, tag: 'hedge' },
  G: { ground: 'dirt', solid: true, tag: 'egate' },
  S: { ground: 'dirt', solid: true, counter: true, tag: 'counter' },
  w: { ground: 'water', solid: true, tag: 'water' },
};

const S1 = { stage: '1+' };

const QA_OBJECTS: MapObj[] = [
  // a stay trigger (the train's front: stand 1.5 s)
  { t: 'trig', id: 'trig_qa_stay', x: 2, y: 2, w: 2, h: 2, on: 'stay', stayMs: 1500, text: '@narr\n1.5秒 とどまった。' },
  // things in the dark: an examinable object, a small prop, a person
  { t: 'obj', id: 'obj_qa_dark_sign', x: 22, y: 12, text: '@narr\n暗がりの 立て札。\n灯りの 中でだけ 読める。' },
  { t: 'obj', id: 'obj_qa_kamado', x: 6, y: 13, text: '@narr\n灯りの 中でだけ 見える かまど。', litOnly: true },
  { t: 'prop', prop: 'obj_danball', x: 24, y: 8 },
  { t: 'prop', prop: 'obj_pots_1', x: 19, y: 13 },
  { t: 'npc', id: 'npc_qa_farmer', sprite: 'npc_hoshi_gen', x: 26, y: 13, dir: 'left', talk: { default: '@narr\n暗がりの 人。' } },
  // the symbols (51 11.2)
  { t: 'sym', id: 'sym_qa_boar', enemies: ['enemy_chototsu'], x: 6, y: 2, dir: 'down', move: 'boar', cond: S1 },
  { t: 'sym', id: 'sym_qa_sune', enemies: ['enemy_sune_tomato'], x: 11, y: 5, dir: 'up', move: 'sune', cond: S1 },
  { t: 'sym', id: 'sym_qa_mujin', enemies: ['enemy_mujin_hanbaiin'], x: 4, y: 12, dir: 'down', move: 'mujin', to: [4, 13], cond: S1 },
  { t: 'sym', id: 'sym_qa_kakashi', enemies: ['enemy_henoheno_kacho'], x: 8, y: 10, dir: 'down', move: 'kakashi', to: [12, 10], span: { x: 2, y: 10, w: 13, h: 1 }, cond: S1 },
  { t: 'sym', id: 'sym_qa_stand', enemies: ['enemy_henoheno_kacho'], x: 22, y: 6, dir: 'down', move: 'kakashi_stand', cond: S1 },
  { t: 'sym', id: 'sym_qa_fence', enemies: ['enemy_biribiri_ban'], x: 17, y: 3, dir: 'down', move: 'fence', to: [17, 15], span: { x: 17, y: 3, w: 2, h: 13 }, cond: S1 },
  { t: 'sym', id: 'sym_qa_tetsuya', enemies: ['enemy_tetsuya'], x: 19, y: 1, dir: 'right', move: 'tetsuya', to: [28, 1], cond: S1, script: 'evt_qa_tetsuya' },
];

const QA_MAP: MapDef = {
  id: 'map_hoshi_qa',
  name: '星見台（QA）',
  kind: 'outdoor',
  chapter: 2,
  stageFlag: 'flag_ch2_stage',
  rows: QA_ROWS,
  legend: QA_LEGEND,
  objects: QA_OBJECTS,
  camera: 'follow',
  outside: '#0B0B14',
  dark: [{ x: 17, y: 0, w: 13, h: 18 }],
  // a light standing in the dark until the tomato is picked (the house's vine), and starlight by the gap
  darkLights: [{ x: 25, y: 12, ox: 8, oy: 4, r: 80, amp: 3, k: 0.6, cond: { notFlag: ['flag_ch2_got_tomato', 'flag_ch2_tomato_picked'] } }],
  starlight: [{ x: 17, y: 16, r: 1.5 }],
  bgm: { 0: 'bgm_hoshi_night', 1: 'bgm_hoshi_night', 2: 'bgm_hoshi_night' },
  amb: { 0: ['amb_h_insects', 'amb_h_wind'], 1: ['amb_h_insects', 'amb_h_wind'], 2: ['amb_h_insects', 'amb_h_wind', 'amb_h_pa_hum'] },
  zones: [
    { id: 'area_hoshi_qa_light', name: 'QA 明るい所', x: 0, y: 0, w: 17, h: 18 },
    { id: 'area_hoshi_houki', name: '耕作放棄地', x: 17, y: 0, w: 13, h: 18, wind: 'susuki' },
  ],
};

function ensureQaMap(): void {
  if (!hasMap(QA_MAP.id)) registerMap(QA_MAP);
}

// ---------------------------------------------------------------- the village (levels team's map) and its QA screens

/** 52 1.3: the camera centre of each Visual-QA screen of map_hoshimidai. */
export const HOSHI_SCREENS: Record<string, [number, number]> = {
  screen_hoshi_arrive: [25, 41],
  screen_hoshi_bus: [38, 40],
  screen_hoshi_tsuji: [26, 31],
  screen_hoshi_school_e: [39, 28],
  screen_hoshi_west: [6, 30],
  screen_hoshi_kominka: [7, 42],
  screen_hoshi_tanada: [24, 10],
  screen_hoshi_barn: [52, 33],
  screen_hoshi_gate: [49, 21],
  screen_hoshi_houki: [47, 11],
  screen_hoshi_yamaguchi: [48, 5],
};

/** The level team's 星見台 maps register from src/data/maps/index.ts; QA may load the village before that. */
async function ensureVillage(): Promise<boolean> {
  if (hasMap('map_hoshimidai')) return true;
  try {
    await import('../data/maps/hoshi_village');
  } catch (e) {
    console.warn('[hoshi_debug] map_hoshimidai could not be loaded', e);
  }
  return hasMap('map_hoshimidai');
}

/** The flags a 星見台 stage implies when QA jumps straight into it (02_ch2 4.5). */
function applyHStageDefaults(n: number): void {
  setFlag('flag_ch2_started', 1);
  setFlag('flag_stage', 3);
  setFlag('flag_clock', 4);
  setFlag('flag_got_hanko', 1);
  setFlag('flag_kanenari_joined', 1);
  setFlag('flag_ch2_prologue_done', 1);
  setFlag('flag_ch2_arrived', 1);
  if (n >= 1) {
    setFlag('flag_ch2_yoriai', 1);
    setFlag('flag_ch2_met_mitsu', 1);
    setFlag('flag_ch2_sune_beaten', 1);
    setFlag('flag_ch2_tomato_picked', 1);
    setFlag('flag_ch2_got_tomato', 1);
    setFlag('flag_fushigi_ch2_06', 1);
    if (!hasItem('item_hanamaru_tomato')) addItem('item_hanamaru_tomato');
  }
  if (n >= 2) {
    setFlag('flag_ch2_met_gen', 1);
    setFlag('flag_ch2_got_otsukare', 1);
    setFlag('flag_ch2_gate_open', 1);
    setFlag('flag_ch2_houki_enter', 1);
    setFlag('flag_ch2_tetsuya_beaten', 1);
    state.taken['sym_hoshi_07'] = true;
  }
  if (n >= 3) {
    setFlag('flag_ch2_hill', 1);
    setFlag('flag_ch2_boss_beaten', 1);
  }
}

function goto(map: string, x: number, y: number, dir: Dir = 'down'): FieldScene | null {
  let f = field();
  if (f && game.scenes.includes(f)) {
    f.loadMap(map, x, y, dir);
    f.runEnterScripts();
  } else {
    game.replaceAll(new FieldScene(map, x, y, dir));
    f = field();
  }
  return f;
}

registerDebug('hoshi', async (screen?: string, stage?: number) => {
  if (!(await ensureVillage())) return 'map_hoshimidai is not there yet';
  if (stage !== undefined) {
    applyHStageDefaults(stage);
    setFlag('flag_ch2_stage', stage);
  } else if (!flag('flag_ch2_arrived')) applyHStageDefaults(flag('flag_ch2_stage'));
  const id = screen ? (screen.startsWith('screen_') ? screen : 'screen_hoshi_' + screen) : 'screen_hoshi_arrive';
  const c = HOSHI_SCREENS[id];
  if (!c) return Object.keys(HOSHI_SCREENS);
  const f = goto('map_hoshimidai', c[0], c[1] + 1, 'down');
  if (!f) return 'no field';
  f.syncFollower(true);
  f.camOverride = { x: c[0] * 16 + 8, y: c[1] * 16 + 8 };
  f.camX = Math.max(0, Math.min(f.map.w * 16 - 384, c[0] * 16 + 8 - 192));
  f.camY = Math.max(0, Math.min(f.map.h * 16 - 216, c[1] * 16 + 8 - 108));
  return `${id} at h${flag('flag_ch2_stage')}`;
});

registerDebug('hoshiQa', (stage?: number, x?: number, y?: number) => {
  ensureQaMap();
  const n = stage ?? 1;
  applyHStageDefaults(n);
  setFlag('flag_ch2_stage', n);
  const f = goto('map_hoshi_qa', x ?? 8, y ?? 8, 'right');
  f?.syncFollower(true);
  return `map_hoshi_qa at h${n}`;
});

registerDebug('hstage', (n: number, ms?: number) => {
  applyHStageDefaults(n);
  const f = field();
  if (f && isCh2Map(f.map.def)) {
    f.setStage(n, ms ?? 0);
    f.refreshPresence();
    f.syncFollower(true);
    f.applyAudio(false);
  } else setFlag('flag_ch2_stage', n);
  return `flag_ch2_stage ${n}`;
});

registerDebug('hgrade', (key: GradeHKey, ms?: number) => {
  if (!(key in GRADES_H)) return Object.keys(GRADES_H);
  field()?.setGradeH(key, ms ?? 0);
  return key;
});

// ---------------------------------------------------------------- the light

let showDark = false;
registerDebug('darkView', (on?: boolean) => {
  showDark = on ?? !showDark;
  return `dark view ${showDark}`;
});

registerDebug('lanternR', (r?: number | null) => {
  const f = field();
  if (!f) return 'no field';
  f.light.forceR = r === undefined || r === null ? null : Math.round(r);
  return f.light.forceR ?? 'breathing';
});

registerDebug('lantern', (on?: boolean | null) => {
  setLanternOverride(on === undefined ? null : on);
  return on ?? 'by flags';
});

registerDebug('lanternOn', (ms?: number) => {
  field()?.light.lightUp(ms ?? 800);
  return 'fx_h_lantern_on';
});

registerDebug('lightInfo', () => {
  const f = field();
  if (!f) return 'no field';
  const L = f.light;
  return {
    hasDark: L.hasDark,
    lantern: L.lantern,
    waiting: L.waiting,
    sources: L.sources.map((s) => `${s.kind}@${s.x},${s.y} r${s.r} k${s.k}`),
    darkRects: darkRectsOf(f.map),
    shown: f.actors.filter((a) => L.actorInDark(a)).map((a) => `${a.id}:${L.actorAlpha(a).toFixed(2)}`),
  };
});

registerDebug('syms', () => {
  const f = field();
  if (!f) return 'no field';
  return f.actors
    .filter((a) => a.kind === 'sym')
    .map((a) => {
      const st = a.data.sym as { kind: string; mode: string; lit?: boolean };
      return `${a.id} ${st.kind}/${st.mode} (${(a.x / 16).toFixed(1)},${((a.y - 16) / 16).toFixed(1)}) ${a.dir}${st.lit === false ? ' unseen' : ''}`;
    });
});

// ---------------------------------------------------------------- calls, scarecrows

registerDebug('hcall', () => {
  const f = field();
  if (!f) return 'no field';
  callNow(f);
  return callState();
});
registerDebug('hcalls', () => callState());
registerDebug('kakashiTurn', (to?: 'hill' | 'field') => {
  const f = field();
  if (f) turnScarecrows(f, to ?? 'hill');
  return to ?? 'hill';
});

// ---------------------------------------------------------------- the dark view overlay

registerWorldFx({
  map: '',
  draw(f, g: Gfx, cx, cy, layer) {
    if (!showDark || layer !== 'top' || !isCh2Map(f.map.def)) return;
    const ctx = g.ctx;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // the dark tiles: a dotted cyan edge round each rect
    ctx.fillStyle = '#5CE1FF';
    for (const r of darkRectsOf(f.map)) {
      const x0 = r.x * 16 - cx;
      const y0 = r.y * 16 - cy;
      const w = r.w * 16;
      const h = r.h * 16;
      for (let i = 0; i < w; i += 3) {
        ctx.fillRect(x0 + i, y0, 1, 1);
        ctx.fillRect(x0 + i, y0 + h - 1, 1, 1);
      }
      for (let i = 0; i < h; i += 3) {
        ctx.fillRect(x0, y0 + i, 1, 1);
        ctx.fillRect(x0 + w - 1, y0 + i, 1, 1);
      }
    }
    // the light's reach: R (the rings), R − 6 (things), R + 8 (symbols)
    for (const s of f.light.sources) {
      if (s.kind === 'star') continue;
      const rings: [number, string][] = [
        [s.r, '#FFE7A3'],
        [s.r + SHOW_MARGIN, '#9BCB6B'],
        [s.r + SYM_MARGIN, '#E84E3C'],
      ];
      for (const [r, col] of rings) {
        ctx.fillStyle = col;
        const n = Math.max(24, Math.round(r * 0.8));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          ctx.fillRect(Math.round(s.x - cx + Math.cos(a) * r), Math.round(s.y - cy + Math.sin(a) * r), 1, 1);
        }
      }
    }
    // each dark actor's visibility
    ctx.fillStyle = '#FFF6D8';
    for (const a of f.actors) {
      if (!f.light.actorInDark(a)) continue;
      const al = f.light.actorAlpha(a);
      ctx.fillRect(Math.round(a.x - cx - 6), Math.round(a.y - cy + 2), Math.round(12 * al), 1);
    }
    ctx.restore();
  },
});

void getMapDef;
