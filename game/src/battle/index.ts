// Battle module entry: installs setBattleImpl(), registers the QA scenes
// (?scene=battle, ?scene=enemies) and the __game.cmd.* battle debug commands.

import type { Co } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { registerScene } from '../boot';
import { registerDebug } from '../debug';
import { addItem, setFlag, state } from '../game/state';
import {
  chapter2Adjust, EXP_TABLE, gainExp, getEnemy, joinKanenari, newChapter2Party, newGameParty, setMemberLevel, syncProgressSkills, type LevelUpResult,
} from '../data/battle';
import { setBattleImpl, startBattle, type BattleOpts, type BattleResult } from './api';
import { BattleScene } from './scene';
import { battleFlow, getGameOverHook, setGameOverHook, type GameOverHook } from './flow';
import { runGameOver } from './gameover';
import { restoreForRetry } from './results';
import { hasSave } from '../game/state';
import { BgGalleryScene, EnemyGalleryScene } from './gallery';
import { playHankoLearnField, playHankoLearnIn } from './learn';
import { playLevelUpField } from './results';
import { addKire } from './common';
import { syncBossFlags } from './boss';
import { yobiState, raiseTomatoNow, dimNow } from './boss_yobimodoshi';
import type { Judge, PartyCmd } from './model';
import { C, drawNote } from './ui/note';
import '../art/enemies/all';

export { setGameOverHook };
export type { GameOverHook };

let current: BattleScene | null = null;

/** The running battle (QA / other modules). */
export function currentBattle(): BattleScene | null {
  return current;
}

function* battleImpl(o: BattleOpts): Co<BattleResult> {
  const scene = new BattleScene(o);
  current = scene;
  game.push(scene);
  scene.run(
    (function* () {
      scene.result = yield* battleFlow(scene);
      scene.finished = true;
    })(),
  );
  yield () => scene.finished;
  let load = false;
  if (scene.needGameOver) {
    // evt_gameover (18.4): a registered hook (scenario/UI) or our own screen
    const hook = getGameOverHook();
    const choice = hook ? yield* hook(scene) : yield* runGameOver(scene.isBoss);
    if (choice === 'retry') restoreForRetry(scene);
    else load = true;
  }
  const i = game.scenes.indexOf(scene);
  if (i === game.scenes.length - 1) game.pop();
  else if (i >= 0) {
    game.scenes.splice(i, 1);
    (scene as Scene).exit?.();
  }
  current = null;
  if (scene.needGameOver) {
    // back to the field out of the dark
    game.fadeColor = '#0B0B14';
    game.fadeAlpha = 1;
    if (load && (yield* loadFromSave())) return scene.result ?? 'lose';
    game.scripts.run(game.fadeIn(500));
  }
  return scene.result ?? 'lose';
}

/** A dark stand-in while the save is loaded (nothing on it writes the state). */
class DarkScene implements Scene {
  transparent = false;
  update(): void {}
  draw(g: Gfx): void {
    g.clear('#0B0B14');
  }
}

/**
 * 「セーブから」: exactly the title's つづきから (UI's continueGame: load, HUD,
 * skills and settings, the field at the saved map / x / y / dir, the dither).
 * The field the battle started from is taken off first — it writes the
 * player's tile into `state` every frame, which would move the loaded party
 * to where the battle happened.
 */
function* loadFromSave(): Co<boolean> {
  if (!hasSave()) return false;
  const flow = (yield import('../ui/flow')) as typeof import('../ui/flow');
  const w = (yield import('../world')) as typeof import('../world');
  const here = { map: state.map, x: state.x, y: state.y, dir: state.dir };
  game.replaceAll(new DarkScene());
  const ok = (yield* flow.continueGame()) as boolean;
  if (ok) return true;
  // the file could not be read after all: carry on where the battle was
  game.replaceAll(new w.FieldScene(here.map || 'map_home_2f', here.x, here.y, here.dir));
  game.scripts.run(game.fadeIn(500));
  return true;
}

setBattleImpl(battleImpl);

/** 18.5: `yield* playHankoLearn('skill_hanamaru')` (field events or battle). */
export function* playHankoLearn(skillId: string): Co<void> {
  if (current && game.scenes.includes(current)) yield* playHankoLearnIn(current, skillId);
  else yield* playHankoLearnField(skillId);
}

/** 18.2: show the 通知表 for level-up results outside of battle. */
export function* playLevelUp(results: LevelUpResult[]): Co<void> {
  yield* playLevelUpField(results);
}

// ---- QA: party setup ---------------------------------------------------------------------

/**
 * 51 18.5 lvCh2: a chapter-2 party (newChapter2Party + chapter2Adjust) at
 * Lv `lv` (5–7): おつかれさま learned, the はなまるトマト in the bag, the
 * battle tutorials of chapter 1 done, on the 星見台 map (the night's light).
 */
export function setupCh2(lv = 5, o: { otsukare?: boolean; tut?: boolean } = {}): void {
  state.flags = {};
  newChapter2Party();
  chapter2Adjust();
  for (const m of state.party) {
    setMemberLevel(m, Math.max(1, Math.min(7, lv)));
    m.exp = Math.max(m.exp, EXP_TABLE[Math.min(8, Math.max(5, lv))] ?? 150);
  }
  if (o.otsukare !== false) setFlag('flag_ch2_got_otsukare', 1);
  setFlag('flag_ch2_got_tomato', 1);
  setFlag('flag_fushigi_ch2_06', 1);
  setFlag('flag_ch2_stage', 1);
  if (!o.tut) for (const f of ['flag_tut_tsukkomi', 'flag_tut_ring', 'flag_tut_hanko', 'flag_tut_kire']) setFlag(f, 1);
  for (const it of ['item_hanamaru_tomato', 'item_kairan_map', 'item_kyuri_zuke', 'item_kyuri_zuke', 'item_toumorokoshi', 'item_umeboshi', 'item_kairan_shuniku']) addItem(it);
  state.map = 'map_hoshimidai';
  syncProgressSkills();
  for (const m of state.party) {
    m.hp = m.maxHp;
    m.mp = m.maxMp;
  }
}

/** The chapter-2 battles by name (51 18.4). */
const CH2_BATTLES: Record<string, Partial<BattleOpts> & { enemies: string[] }> = {
  sune: { enemies: ['enemy_sune_tomato'], music: 'bgm_battle', background: 'bg_h_house', canLose: true },
  sune2: { enemies: ['enemy_sune_tomato', 'enemy_sune_tomato'] },
  kacho: { enemies: ['enemy_henoheno_kacho'] },
  biri: { enemies: ['enemy_biribiri_ban'] },
  cho: { enemies: ['enemy_chototsu'] },
  mujin: { enemies: ['enemy_mujin_hanbaiin'] },
  tetsuya: { enemies: ['enemy_tetsuya'], music: 'bgm_midboss', background: 'bg_h_tetsuya', canLose: true },
  yobi: { enemies: ['boss_yobimodoshi'], boss: true, music: 'bgm_boss_yobimodoshi', background: 'bg_h_boss', canLose: true },
};

function setupParty(p: URLSearchParams | Record<string, string | number | undefined>): void {
  const get = (k: string) => (p instanceof URLSearchParams ? p.get(k) : p[k] !== undefined ? String(p[k]) : null);
  if (get('ch2') === '1') {
    setupCh2(Number(get('lv') ?? '5'), { tut: get('tut') === '1' });
    return;
  }
  const lv = Math.max(1, Math.min(8, Number(get('lv') ?? '2')));
  const two = (get('party') ?? '2') !== '1';
  newGameParty();
  state.flags = {};
  const m = state.party[0];
  setMemberLevel(m, lv);
  if (lv >= 2 || get('hanko') === '1') setFlag('flag_got_hanko', 1);
  if (two) {
    setFlag('flag_kanenari_joined', 1);
    const k = joinKanenari();
    setMemberLevel(k, lv);
  }
  if (get('key') === '1' || get('boss') === '1') setFlag('flag_got_maigo_key', 1);
  if (get('wide') === '1') setFlag('flag_opt_tsukkomi_wide', 1);
  if (get('tut') !== '1') {
    for (const f of ['flag_tut_tsukkomi', 'flag_tut_ring', 'flag_tut_hanko', 'flag_tut_kire']) setFlag(f, 1);
  }
  state.inventory = ['item_ramune', 'item_ramune', 'item_kinakobou', 'item_fugashi', 'item_hakka_ame', 'item_stamp_pad', 'item_oden_can', 'item_shippu', 'item_hanko_case', 'item_mimashita_cho', 'item_otsukai_memo'];
  state.money = 500;
  syncProgressSkills();
}

// ---- QA scene: ?scene=battle&enemies=a,b&boss=1&lv=3&party=2 --------------------------------

class BattleTestScene implements Scene {
  private t = 0;
  private last: BattleResult | null = null;
  private running = false;

  private started = false;

  constructor(private params: URLSearchParams) {
    setupParty(params);
  }

  private opts(): BattleOpts {
    const p = this.params;
    // &boss=1 on its own means the boss (not the default ハト係長 in the boss layout)
    const fallback = p.get('boss') === '1' ? 'boss_omukaemachi' : 'enemy_hato_kakaricho';
    let enemies = (p.get('enemies') ?? p.get('enemy') ?? fallback).split(',').filter((id) => getEnemy(id));
    if (!enemies.length) enemies = [fallback];
    const boss = enemies.some((id) => !!getEnemy(id)?.boss) || (p.get('boss') === '1' && enemies.includes('boss_omukaemachi'));
    return {
      enemies,
      boss,
      initiative: (p.get('init') as BattleOpts['initiative']) ?? 'normal',
      background: p.get('bg') ?? undefined,
      music: p.get('music') ?? undefined,
      canLose: p.get('canLose') !== '0',
    };
  }

  private start(): void {
    this.running = true;
    const self = this;
    // like the field: battles run on the global script runner
    game.scripts.run(
      (function* () {
        self.last = yield* startBattle(self.opts());
        self.running = false;
        game.fadeAlpha = 0;
      })(),
    );
  }

  update(dt: number): void {
    this.t += dt;
    if (!this.started) {
      // start on the first frame (the scene must be on the stack first);
      // &hold=1 waits for __game.cmd.bgo() so QA can capture the transition
      if (this.params.get('hold') === '1' && !goRequested) return;
      this.started = true;
      this.start();
      return;
    }
    if (!this.running && game.input.pressed('confirm')) {
      setupParty(this.params);
      this.start();
    }
  }

  draw(g: Gfx): void {
    // a quiet "field" stand-in: dusk street silhouette
    g.clear('#3A2B5C');
    for (let i = 0; i < 12; i++) g.rect(0, 150 + i * 6, 384, 6, i % 2 ? '#2A2440' : '#322652');
    g.rect(0, 120, 384, 30, '#4A3A6E');
    for (let x = 0; x < 384; x += 48) g.rect(x + 10, 96, 30, 24, '#5B4A7A');
    if (!this.running) {
      drawNote(g, 96, 72, 192, 60);
      g.text('せんとうテスト', 192, 80, { color: C.ink, align: 'center' });
      g.text(this.last ? `けっか：${this.last}` : '', 192, 98, { color: C.shuDark, align: 'center' });
      g.text('決定で もう一度', 192, 114, { color: C.gray, align: 'center' });
    }
  }
}

let goRequested = false;
registerDebug('bgo', () => (goRequested = true));
registerScene('battle', (p) => new BattleTestScene(p));
registerScene('enemies', (p) => new EnemyGalleryScene(p));
registerScene('bgs', (p) => new BgGalleryScene(p));

// ---- QA commands ---------------------------------------------------------------------------

registerDebug('battle', (enemies: string[] = ['enemy_hato_kakaricho'], o: Partial<BattleOpts> & { lv?: number; party?: number } = {}) => {
  if (o.lv || o.party) setupParty({ lv: o.lv, party: o.party });
  if (!state.party.length) setupParty({});
  game.scripts.run(
    (function* () {
      yield* startBattle({ enemies, ...o });
    })(),
  );
  return 'started';
});
registerDebug('bsetup', (lv = 3, party = 2) => {
  setupParty({ lv, party });
  return state.party.map((m) => `${m.name} Lv${m.level}`);
});
registerDebug('kire', (n = 3) => {
  if (!current) return 'no battle';
  current.kire = 0;
  addKire(current, n);
  return current.kire;
});
/** Defeat every enemy; `drop` makes every drop roll succeed. */
registerDebug('win', (drop = false) => {
  if (!current) return 'no battle';
  if (drop) current.memo.forceDrop = 1;
  for (const e of current.enemies) {
    e.hp = 0;
    e.dead = true;
    e.visible = false;
  }
  current.memo.kanenariWin = current.enemies.some((e) => e.id === 'enemy_kanenari') ? 1 : 0;
  return 'ok';
});
registerDebug('lose', () => {
  if (!current) return 'no battle';
  for (const u of current.party) u.m.hp = 0;
  return 'ok';
});
registerDebug('ehp', (hp: number, i = 0) => {
  const e = current?.enemies[i];
  if (!e) return 'no enemy';
  e.hp = Math.max(1, hp);
  return e.hp;
});
registerDebug('php', (hp: number, id = 'minato') => {
  const u = current?.party.find((p) => p.id === id) ?? null;
  const m = u?.m ?? state.party.find((p) => p.id === id);
  if (!m) return 'no member';
  m.hp = Math.max(0, Math.min(m.maxHp, hp));
  if (u) u.hpShown = u.hpTrail = m.hp;
  return m.hp;
});
/** Hold / release a virtual button (works while paused + advance). */
registerDebug('key', (name: string, on = true) => {
  game.input.setVirtual(name as never, !!on);
  return on;
});
/** Automatic inputs for deterministic QA: tsuk = just|ok|fail|kabuse, ring = good|early|none, hold = kukkiri|futsuu|kasure, crit = every strike is a 100てん */
registerDebug('bauto', (o: { tsuk?: string; ring?: string; hold?: Judge; crit?: boolean } | null) => {
  if (!current) return 'no battle';
  current.auto = o ?? {};
  return current.auto;
});
/** Queue commands for the next input phase: [{who:'minato', cmd:'attack'|'hanko'|'pr'|'item'|'guard'|'flee'|'nori', skill?, item?, target?:number|string}] */
registerDebug('bcmd', (list: { who: string; cmd: string; skill?: string; item?: string; target?: number | string; part?: string }[]) => {
  if (!current) return 'no battle';
  current.cmdQueue = list;
  return list.length;
});
/** Force the next enemy action(s): skill ids in order. */
registerDebug('bforce', (skills: string[]) => {
  if (!current) return 'no battle';
  current.forceEnemy = [...skills];
  return skills;
});
registerDebug('bfirst', (on = true) => {
  if (!current) return 'no battle';
  current.qaPartyFirst = on;
  return on;
});
/** QA: light a boss part as if 迷子のお知らせ had called it ('bottle' | 'cap' | 'shoe' | 'umbrella'). */
registerDebug('bglow', (key = 'bottle') => {
  const s = current;
  const e = s?.enemies.find((x) => x.def.boss);
  if (!s || !e) return 'no boss';
  const p = s.bossParts.find((x) => x.id === 'boss_omukaemachi_' + key);
  if (!p) return 'no part';
  p.glow = true;
  (p as typeof p & { glowRound?: number }).glowRound = s.round;
  e.params['glowAt_' + key] = s.t;
  syncBossFlags(s, e);
  return key;
});
/** QA: show the battle's own fallback game-over screen (used when no hook is installed). */
registerDebug('bgameover', (boss = false) => {
  game.scripts.run(runGameOver(!!boss));
  return 'ok';
});
/** QA: the next ノリツッコミ plays boke n (1 sing / 2 flag / 3 flip); 0 = random. */
registerDebug('bnori', (n = 1) => {
  if (!current) return 'no battle';
  current.memo.noriForce = n;
  return n;
});
/** QA: the running BattleScene itself (for frame-exact probes in page evals). */
registerDebug('bscene', () => current);
registerDebug('bstate', () => {
  const s = current;
  if (!s) return null;
  return {
    round: s.round,
    kire: s.kire,
    busy: s.msg.busy,
    input: !!s.cmd,
    enemies: s.enemies.map((e) => ({ id: e.id, hp: e.hp, pose: e.pose, dead: e.dead, status: e.status })),
    party: s.party.map((u) => ({ id: u.id, hp: u.m.hp, mp: u.m.mp, status: u.m.status })),
    chime: s.bossChime.lit,
    memo: s.memo,
    msg: s.msg.text,
    interactive: s.msgInteractive,
  };
});
registerDebug('levelup', (lv = 2) => {
  // Lv6–7 are chapter 2's (the cap is 7 there): a chapter-2 party one below
  if (lv >= 6) setupCh2(lv - 1);
  else if (!state.party.length) setupParty({ lv: lv - 1, party: 2 });
  const res: LevelUpResult[] = [];
  for (const m of state.party) {
    const need = EXP_TABLE[lv] ?? 150;
    res.push(...gainExp(m, Math.max(0, need - m.exp)));
  }
  game.scripts.run(playLevelUp(res));
  return res.length;
});
registerDebug('hankolearn', (id = 'skill_hanamaru') => {
  game.scripts.run(playHankoLearn(id));
  return id;
});

// ---- chapter 2 (51 18.5) --------------------------------------------------------------------

/** QA: true once per new command-input phase (a round's first command window). */
let readyRound = -1;
registerDebug('bready', () => {
  const s = current;
  if (!s || !s.cmd || s.round === readyRound) return false;
  readyRound = s.round;
  return s.round;
});

/**
 * `lvCh2(n)` (51 18.5): flag_ch2_started on and both at Lv n (5–7), the
 * story as it is (the events' QA registers the same command). Without a
 * chapter-2 party yet it makes one (newChapter2Party + chapter2Adjust).
 */
registerDebug('lvCh2', (n = 6) => {
  const lv = Math.max(5, Math.min(7, Number(n)));
  if (state.party.length < 2) {
    newChapter2Party();
    chapter2Adjust();
  }
  setFlag('flag_ch2_started', 1);
  for (const m of state.party) {
    setMemberLevel(m, lv);
    m.exp = EXP_TABLE[lv] ?? 150;
  }
  syncProgressSkills();
  return state.party.map((m) => `${m.id} Lv${m.level}`);
});
/** `ch2party(n, otsukare)`: a fresh chapter-2 QA party at Lv n — おつかれさま, the tomato, the new items, on 星見台. */
registerDebug('ch2party', (n = 5, otsukare = true) => {
  setupCh2(n, { otsukare: !!otsukare });
  return state.party.map((m) => `${m.name} Lv${m.level} exp${m.exp}`);
});
/**
 * `ch2battle(name, lv)`: straight into a chapter-2 battle — sune / sune2 /
 * kacho / biri / cho / mujin / tetsuya / yobi. `lv` 0 keeps the party.
 */
registerDebug('ch2battle', (name = 'sune', lv = 5, o: Partial<BattleOpts> = {}) => {
  const b = CH2_BATTLES[name];
  if (!b) return `unknown: ${Object.keys(CH2_BATTLES).join(' ')}`;
  if (lv) setupCh2(lv);
  // the first スネトマト is fought before the tomato is picked (its glow is behind it)
  if (name === 'sune') {
    setFlag('flag_ch2_got_tomato', 0);
    setFlag('flag_ch2_stage', 0);
  }
  game.scripts.run(
    (function* () {
      yield* startBattle({ ...b, ...o });
    })(),
  );
  return 'started ' + name;
});
/** `bossLight()`: during ヨビモドシ, light it up (the tomato held up at once) / put it out. */
registerDebug('bossLight', () => {
  const s = current;
  if (!s || s.bossKind !== 'yobimodoshi') return 'no yobimodoshi';
  if (yobiState(s).light) dimNow(s);
  else raiseTomatoNow(s, 'minato');
  return yobiState(s).light ? 'light' : 'dark';
});
/** `tenko(n)`: set ヨビモドシ's lit name tags to n (0–4). */
registerDebug('tenko', (n = 3) => {
  const s = current;
  if (!s || s.bossKind !== 'yobimodoshi') return 'no yobimodoshi';
  s.bossChime.lit = Math.max(0, Math.min(4, n));
  s.setMusicParam('tenko', s.bossChime.lit);
  return s.bossChime.lit;
});
/** `restTest()`: every enemy gets two rests (おつかれさま's 休憩中). */
registerDebug('restTest', () => {
  const s = current;
  if (!s) return 'no battle';
  for (const e of s.aliveEnemies) {
    e.status.kyuukei = 2;
    e.status.kyuukeiSkipped = 0;
    if (e.status.tetsuya) {
      e.status.tetsuya = false;
      e.stages.def.lv = 0;
    }
    e.setPose('rest');
    e.params.tapeAt_kyuukei = s.t;
  }
  return s.aliveEnemies.map((e) => e.id);
});
/** `bkon(1|-1|0)`: the next かねを鳴らす (Lv6+) rings 「コン」 / never / by chance. */
registerDebug('bkon', (n = 1) => {
  if (!current) return 'no battle';
  current.memo.forceKon = n;
  return n;
});
/** `bphase(n)`: ヨビモドシ's HP to its phase-2 threshold (2) or the finale (3). */
registerDebug('bphase', (n = 2) => {
  const e = current?.enemies.find((x) => x.def.boss);
  if (!current || !e) return 'no boss';
  e.hp = n >= 3 ? 80 : 215;
  return e.hp;
});

export { current as _battle };
export type { PartyCmd };
