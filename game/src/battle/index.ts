// Battle module entry: installs setBattleImpl(), registers the QA scenes
// (?scene=battle, ?scene=enemies) and the __game.cmd.* battle debug commands.

import type { Co } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { registerScene } from '../boot';
import { registerDebug } from '../debug';
import { setFlag, state } from '../game/state';
import { gainExp, getEnemy, joinKanenari, newGameParty, setMemberLevel, syncProgressSkills, type LevelUpResult } from '../data/battle';
import { setBattleImpl, startBattle, type BattleOpts, type BattleResult } from './api';
import { BattleScene } from './scene';
import { battleFlow, getGameOverHook, setGameOverHook, type GameOverHook } from './flow';
import { runGameOver } from './gameover';
import { restoreForRetry } from './results';
import { loadGame } from '../game/state';
import { EnemyGalleryScene } from './gallery';
import { playHankoLearnField, playHankoLearnIn } from './learn';
import { playLevelUpField } from './results';
import { addKire } from './common';
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
    if (load && loadGame()) yield* reloadField();
    game.scripts.run(game.fadeIn(500));
  }
  return scene.result ?? 'lose';
}

/** 「セーブから」: rebuild the field scene at the saved position. */
function* reloadField(): Co {
  const w = (yield import('../world')) as typeof import('../world');
  game.replaceAll(new w.FieldScene(state.map, state.x, state.y, state.dir));
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

function setupParty(p: URLSearchParams | Record<string, string | number | undefined>): void {
  const get = (k: string) => (p instanceof URLSearchParams ? p.get(k) : p[k] !== undefined ? String(p[k]) : null);
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
    const enemies = (p.get('enemies') ?? p.get('enemy') ?? 'enemy_hato_kakaricho').split(',').filter((id) => getEnemy(id));
    const boss = p.get('boss') === '1' || enemies.includes('boss_omukaemachi');
    return {
      enemies: boss && !enemies.length ? ['boss_omukaemachi'] : enemies,
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
/** Automatic inputs for deterministic QA: tsuk = just|ok|fail|kabuse, ring = good|early|none, hold = kukkiri|futsuu|kasure */
registerDebug('bauto', (o: { tsuk?: string; ring?: string; hold?: Judge } | null) => {
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
    msg: (s.msg as unknown as { cur: { glyphs: { ch: string }[] } | null }).cur?.glyphs.map((g) => g.ch).join('') ?? '',
    interactive: s.msgInteractive,
  };
});
registerDebug('levelup', (lv = 2) => {
  if (!state.party.length) setupParty({ lv: lv - 1, party: 2 });
  const res: LevelUpResult[] = [];
  for (const m of state.party) {
    const need = [0, 0, 10, 40, 90, 150][lv] ?? 150;
    res.push(...gainExp(m, Math.max(0, need - m.exp)));
  }
  game.scripts.run(playLevelUp(res));
  return res.length;
});
registerDebug('hankolearn', (id = 'skill_hanamaru') => {
  game.scripts.run(playHankoLearn(id));
  return id;
});

export { current as _battle };
export type { PartyCmd };
