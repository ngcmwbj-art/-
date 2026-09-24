// QA: __game.cmd.jump('<beat>') puts the game in the state of a story beat —
// flags, party, levels, bag, money, map, position — and (for scripted beats)
// starts the beat's event. __game.cmd.jump() lists the beats.
//   __game.cmd.beat()          the current beat (from the flags)
//   __game.cmd.skipEvent()     fast-forwards dialog (holds confirm) — QA

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { flag, resetState, setFlag, state, type Dir } from '../game/state';
import { joinKanenari, newGameParty, setMemberLevel, syncProgressSkills } from '../data/battle';
import { registerDebug } from '../debug';
import { FieldScene, field } from '../world/field';
import { getScript } from '../world/scripts';
import { uiHud } from '../ui/hud';
import { stopAllAmbient, stopBgm } from '../audio';
import { startNewGame } from '../ui/api';
import { setFollowerVisible } from '../world/api';
import { ENDING_CUTS } from './ending';
import { keyGuide, resetStaging } from './stage';
import { GUIDE_MENU, GUIDE_MOVE } from '../data/text/events';
import { animFrame, charSprite, poseFrame, walkFrame } from '../art/chars';

type Step = () => void;

const set =
  (...ids: string[]): Step =>
  () => {
    for (const id of ids) setFlag(id, 1);
  };
const keys =
  (...ids: string[]): Step =>
  () => {
    for (const id of ids) if (!state.inventory.includes(id)) state.inventory.push(id);
  };
const level =
  (lv: number): Step =>
  () => {
    for (const m of state.party) setMemberLevel(m, lv);
  };
const taken =
  (...ids: string[]): Step =>
  () => {
    for (const id of ids) state.taken[id] = true;
  };

/** The story in order; each beat = everything before it has happened. */
const CHAIN: { beat: string; steps: Step[]; at: [string, number, number, Dir]; run?: string; desc: string }[] = [
  { beat: 'opening', steps: [], at: ['map_home_2f', 5, 3, 'up'], run: 'evt_opening', desc: '16:52 自室で目覚める' },
  { beat: 'errand', steps: [set('flag_opening_done')], at: ['map_home_1f', 11, 3, 'left'], desc: '1F、台所へ（evt_errand）' },
  {
    beat: 'town',
    steps: [
      set('flag_errand'),
      keys('item_gamaguchi', 'item_otsukai_memo'),
      () => {
        state.money = 500;
        setFlag('flag_clock', 1);
      },
    ],
    at: ['map_town', 4, 31, 'down'],
    desc: '家の前。肉屋へ',
  },
  { beat: 'maruyama', steps: [], at: ['map_town', 27, 23, 'up'], desc: '肉屋の前（初入店で evt_maruyama_first）' },
  { beat: 'hinoya', steps: [set('flag_met_maruyama'), () => setFlag('flag_clock', 2)], at: ['map_town', 32, 23, 'up'], desc: 'ひのやの前（evt_obaa_first）' },
  { beat: 'chime', steps: [set('flag_met_obaa')], at: ['map_town', 32, 22, 'down'], run: 'evt_chime_stop', desc: '★17:00 の瞬間 → ハト係長' },
  {
    beat: 'hato',
    steps: [
      set('flag_chime_stopped'),
      () => {
        setFlag('flag_stage', 1);
        setFlag('flag_clock', 3);
        setFlag('flag_bgm_hold', 1);
      },
    ],
    at: ['map_town', 32, 22, 'down'],
    run: 'evt_hato_block',
    desc: 'ハト係長（チュートリアル戦闘）',
  },
  {
    beat: 'hanko',
    steps: [set('flag_hato_beaten'), keys('item_hato_meishi'), level(2), taken('sym_town_01')],
    at: ['map_town', 32, 24, 'up'],
    run: 'evt_hanko_given',
    desc: 'ハンコケース（evt_hanko_given）',
  },
  {
    beat: 'mamekichi',
    steps: [set('flag_got_hanko'), keys('item_hanko_case', 'item_mimashita_cho'), () => setFlag('flag_bgm_hold', 0)],
    at: ['map_town', 36, 22, 'up'],
    desc: 'まめ吉に みました（fushigi_04 → 公園のヒント）',
  },
  { beat: 'alley', steps: [set('flag_fushigi_04', 'flag_fushigi_tutorial', 'flag_park_hint')], at: ['map_town', 19, 22, 'up'], desc: '路地（evt_alley_open）→ 公園' },
  { beat: 'kanenari', steps: [taken('trig:map_town:trig_alley_open')], at: ['map_town', 16, 13, 'up'], desc: '時計塔のカネナリくん（加入戦）' },
  {
    beat: 'broadcast',
    steps: [
      set('flag_met_kanenari', 'flag_kanenari_joined'),
      () => {
        joinKanenari();
      },
    ],
    at: ['map_town', 16, 13, 'up'],
    run: 'evt_maigo_broadcast',
    desc: '★迷子のお知らせ → 段階2',
  },
  {
    beat: 'stage2',
    steps: [set('flag_broadcast', 'flag_parking_open'), () => setFlag('flag_stage', 2)],
    at: ['map_town', 29, 10, 'right'],
    desc: '段階2の公園の東。駐車場へ',
  },
  { beat: 'ojigi', steps: [], at: ['map_town', 48, 12, 'up'], desc: 'モール入口（おじぎ自販機・中ボス）' },
  {
    beat: 'mall',
    steps: [set('flag_ojigi_beaten'), level(3), keys('item_oden_can'), () => (state.money += 120)],
    at: ['map_mall_hall', 10, 13, 'up'],
    run: 'evt_mall_enter',
    desc: 'モール M1（evt_mall_enter）',
  },
  { beat: 'kaitenyaki', steps: [set('flag_mall_entered')], at: ['map_mall_food', 9, 4, 'up'], desc: 'M2 回転焼き機（鍵とやりなおし）' },
  {
    beat: 'mall2f',
    steps: [set('flag_fushigi_12', 'flag_got_maigo_key', 'flag_mall_staffdoor'), keys('item_maigo_key'), () => setFlag('flag_yakiname', 2)],
    at: ['map_mall_2f', 2, 4, 'right'],
    desc: 'M4 2F通路（ソウジロウ・ベンチ・扉）',
  },
  { beat: 'door', steps: [taken('sym_mall_2f_01'), set('flag_soujirou_gate')], at: ['map_mall_2f', 19, 2, 'up'], desc: '迷子センターの扉' },
  { beat: 'boss', steps: [set('flag_maigo_door_open')], at: ['map_mall_maigo', 6, 9, 'up'], desc: '迷子センター（evt_boss_intro → ボス）' },
  {
    beat: 'ending',
    steps: [set('flag_boss_intro_seen'), level(4)],
    at: ['map_mall_maigo', 6, 6, 'up'],
    run: 'evt_ending',
    desc: '★エンディング',
  },
];

function applyUpTo(beat: string): (typeof CHAIN)[number] | null {
  const idx = CHAIN.findIndex((c) => c.beat === beat);
  if (idx < 0) return null;
  resetState();
  newGameParty();
  setFlag('flag_stage', 0);
  setFlag('flag_clock', 0);
  // QA: the battle tutorials' sticky notes are shown only in a real first run
  for (let i = 0; i <= idx; i++) for (const s of CHAIN[i].steps) s();
  if (flag('flag_kanenari_joined')) {
    joinKanenari();
    const mi = state.party.find((m) => m.id === 'minato');
    const k = state.party.find((m) => m.id === 'kanenari');
    if (mi && k) setMemberLevel(k, mi.level);
  }
  syncProgressSkills();
  for (const m of state.party) {
    m.hp = m.maxHp;
    m.mp = m.maxMp;
  }
  return CHAIN[idx];
}

const JUMP = (beat?: string, noRun = false): unknown => {
  if (!beat) return CHAIN.map((c) => `${c.beat}: ${c.desc}`);
  if (beat === 'opening' || beat === 'newgame') {
    game.scripts.clear();
    game.scripts.run(startNewGame());
    return 'new game';
  }
  const c = applyUpTo(beat);
  if (!c) return `unknown beat ${beat}; beats: ${CHAIN.map((x) => x.beat).join(' ')}`;
  game.scripts.clear();
  // widgets that paint through game.overlays (the 「ほぞん」 seal, captions)
  // take their overlay with them
  for (const w of game.ui.widgets) {
    const o = (w as { overlay?: unknown }).overlay;
    if (typeof o === 'function') {
      const i = game.overlays.indexOf(o as (typeof game.overlays)[number]);
      if (i >= 0) game.overlays.splice(i, 1);
    }
  }
  game.ui.widgets = [];
  resetStaging();
  game.fadeAlpha = 0;
  stopBgm(0.2);
  stopAllAmbient(0.2);
  uiHud.reset();
  const [map, x, y, dir] = c.at;
  const f = new FieldScene(map, x, y, dir);
  game.replaceAll(f);
  if (c.run && !noRun) {
    const fn = getScript(c.run);
    if (fn)
      f.startScript(
        (function* (): Co {
          yield 300;
          yield* fn({ source: 'jump', map, runDefault: function* () {} });
        })(),
      );
  }
  return `${beat}: ${c.desc}`;
};
registerDebug('jump', JUMP);

/** The furthest beat the flags have reached (QA). */
registerDebug('beat', () => {
  const order: [string, string][] = [
    ['flag_boss_beaten', 'ending'],
    ['flag_maigo_door_open', 'boss'],
    ['flag_got_maigo_key', 'mall2f'],
    ['flag_mall_entered', 'kaitenyaki'],
    ['flag_ojigi_beaten', 'mall'],
    ['flag_broadcast', 'stage2'],
    ['flag_kanenari_joined', 'broadcast'],
    ['flag_park_hint', 'alley'],
    ['flag_got_hanko', 'mamekichi'],
    ['flag_hato_beaten', 'hanko'],
    ['flag_chime_stopped', 'hato'],
    ['flag_met_obaa', 'chime'],
    ['flag_errand', 'town'],
    ['flag_opening_done', 'errand'],
  ];
  for (const [f, b] of order) if (flag(f)) return { beat: b, stage: flag('flag_stage'), map: field()?.map.id };
  return { beat: 'opening' };
});

/** Story flags at a glance (QA). */
registerDebug('story', () => {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(state.flags)) if (!k.startsWith('flag_seen_') && !k.startsWith('flag_tsukkomi_')) out[k] = v;
  return out;
});

/** QA: a PNG data URL of character frames: 'id:pose:dir' / 'id:anim@ms:dir', comma separated. */
registerDebug('sprites', (spec: string) => {
  const imgs: HTMLCanvasElement[] = [];
  for (const it of spec.split(',')) {
    const [id, pose, dir0] = it.split(':');
    const dir = (dir0 || 'down') as Dir;
    const s = charSprite(id);
    if (pose.includes('@')) {
      const [an, t] = pose.split('@');
      imgs.push(animFrame(s, an, Number(t), dir));
    } else if (pose === 'walk') imgs.push(walkFrame(s, dir, 0, false));
    else imgs.push(poseFrame(s, pose, dir));
  }
  const w = imgs.reduce((a, c) => a + c.width + 4, 4);
  const h = Math.max(...imgs.map((c) => c.height)) + 8;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#6B7186';
  ctx.fillRect(0, 0, w, h);
  let x = 4;
  for (const c of imgs) {
    ctx.drawImage(c, x, 4 + (h - 8 - c.height));
    x += c.width + 4;
  }
  return cv.toDataURL();
});

/** QA: run any registered script as a field script (e.g. run('evt_kanenari_meet')). */
registerDebug('run', (id: string) => {
  const f = field();
  const fn = getScript(id);
  if (!f || !fn) return `no field / no script ${id}`;
  f.startScript(fn({ source: 'debug', map: f.map.id, runDefault: function* () {} }));
  return id;
});

/** QA: jump('ending') state, then play only ending cut n (1–6). */
registerDebug('endcut', (n: number) => {
  JUMP('ending', true);
  const f = field();
  const cut = ENDING_CUTS[n];
  if (!f || !cut) return 'no cut';
  setFlag('flag_boss_beaten', 1);
  setFlag('flag_stage', 3);
  setFlag('flag_bgm_hold', 1);
  if (n > 1) {
    setFlag('flag_hud_hidden', 1);
    f.setStage(3, 0);
    setFlag('flag_clock', 4);
  }
  if (n >= 3 && !state.inventory.includes('item_korokke')) state.inventory.push('item_korokke');
  // cut 5 continues cut 4's room
  if (n === 5) {
    setFollowerVisible(false);
    f.loadMap('map_home_1f', 2, 5, 'up');
  }
  f.startScript(cut());
  return `cut ${n}`;
});

/** QA: the keycap control guides ('move' — the opening; 'menu' — after the park hint). */
registerDebug('keyguide', (which = 'move') => {
  if (which === 'menu') keyGuide(GUIDE_MENU, 5000, 38);
  else keyGuide(GUIDE_MOVE, 4500);
  return which;
});
