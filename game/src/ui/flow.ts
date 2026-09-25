// Game flow owned by the UI: new game, continue, the chapter switch, back to
// the title, and the clear records shown on the title after an ending.
//
//   registerNewGameHook(() => { setFlag('flag_x', 1); })          // setup
//   registerNewGameHook(function* () { yield* evtSomething(); })   // runs as a field script
//
// The field at map_home_2f runs its own onEnter scripts (evt_opening). A new
// game starts on a black screen (game.fadeAlpha = 1); a hook / evt_opening
// fades in when it is ready — if nobody does, the flow fades in itself once
// the field's scripts are done.
//
// Chapter 2 (50_ch2_story 1.4, 02_ch2_index 6.1):
//
//   markClear()                  the end of chapter 1: the clear record and the
//                                「第1章クリアデータ」 in the save slot
//   yield* startChapter2(from)   'continue' (the slot holds the chapter 1 clear
//                                data) or 'title' (「第2章から」): pick the start
//                                state, chapter2Adjust(), flag_ch2_started, the
//                                start snapshot, then evt_ch2_prologue on black
//   chapter2LevelUps()           what chapter2Adjust() raised (the prologue's 通知表)
//   markClearCh2()               the end of chapter 2: its record and clear data
//   continueGame()               branches on what the slot holds

import type { Co } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { makeCanvas } from '../engine/pixel';
import { H, W } from '../engine/screen';
import { flag, loadGame, loadSnapshot, resetState, saveGame, saveSnapshot, setFlag, state } from '../game/state';
import { chapter2Adjust, newChapter2Party, newGameParty, syncProgressSkills, type LevelUpResult } from '../data/battle';
import { stopAllAmbient, stopBgm } from '../audio';
import { FieldScene } from '../world/field';
import { hasMap } from '../world/maps';
import { hasScript } from '../world/scripts';
import { syncSettingFlags } from './settings';
import { bookCounts, bookCountsCh2, tsukkomiTotal, tsukkomiTotalCh2 } from './menu/book';
import { caption, say } from './dialog';
import { uiHud } from './hud';
import { resetAutosave } from './autosave';
import { ditherIn, ditherLevel, ditherOut } from './transition';
import { playChapterDoor } from './chapter_door';
import { CH2_CONTINUE_CLEARED, PROLOGUE_CAPTION } from '../data/text/hoshi_events';

/**
 * The pages of a scenario msg block (10_narrative 1.4) that has one
 * speaker: the `@speaker` and `>` direction lines dropped, `/` between pages.
 */
export function msgPages(src: string): string[] {
  const pages: string[][] = [[]];
  for (const raw of src.split('\n')) {
    const l = raw.trimEnd();
    if (l.startsWith('@') || l.startsWith('>')) continue;
    if (l.trim() === '/') {
      pages.push([]);
      continue;
    }
    pages[pages.length - 1].push(l);
  }
  return pages.map((p) => p.join('\n').trim()).filter((p) => p.length > 0);
}

export type NewGameHook = () => Co | void;
const hooks: NewGameHook[] = [];

/** Called on 「はじめる」 after the state is reset and before the field fades in. */
export function registerNewGameHook(fn: NewGameHook): void {
  hooks.push(fn);
}

/** Fresh state: Minato Lv1 alone, 16:52, stage 0, nothing in the bag. */
export function resetForNewGame(): void {
  uiHud.reset();
  resetAutosave();
  resetState();
  newGameParty();
  setFlag('flag_stage', 0);
  setFlag('flag_clock', 0);
  syncSettingFlags();
}

/** 「はじめる」: reset, run the hooks, start the field in Minato's room. */
export function* startNewGame(): Co {
  resetForNewGame();
  game.fadeColor = '#0B0B14';
  game.fadeAlpha = 1;
  const cos: Co[] = [];
  for (const h of hooks) {
    const r = h();
    if (r) cos.push(r);
  }
  const f = new FieldScene('map_home_2f', 5, 3, 'up');
  game.replaceAll(f); // enter() runs the map's onEnter scripts (evt_opening)
  for (const co of cos) f.startScript(co);
  if (!hasScript('evt_opening') && !cos.length) {
    // nobody wrote an opening yet: the two lines on black, then the room
    yield 600;
    yield* caption(['8月31日。', '夏休み、最後の日。']);
    setFlag('flag_opening_done', 1);
    yield* game.fadeIn(1200);
    return;
  }
  // safety net: if the opening scripts end while the screen is still black, fade in
  yield () => game.fadeAlpha < 1 || game.scripts.tasks.length <= 1;
  if (game.fadeAlpha >= 1) yield* game.fadeIn(600);
}

/**
 * The last frame on screen, held still while the save is brought in. It
 * stands in for whatever was running (the title, a field under the
 * game-over page…), so nothing underneath keeps updating the state.
 */
class StillScene implements Scene {
  transparent = false;
  private readonly img: HTMLCanvasElement | null;

  constructor() {
    const buf = game.screen?.buffer;
    if (!buf) {
      this.img = null;
      return;
    }
    const [c, ctx] = makeCanvas(W, H);
    ctx.drawImage(buf, 0, 0);
    this.img = c;
  }

  update(): void {}

  draw(g: Gfx): void {
    if (this.img) g.img(this.img, 0, 0);
    else g.clear('#0B0B14');
  }
}

/** A plain dark screen (messages that are said between scenes). */
class BlackScene implements Scene {
  transparent = false;
  update(): void {}
  draw(g: Gfx): void {
    g.clear('#0B0B14');
  }
}

/**
 * 「つづきから」 (the title, the game-over page): load the save and rebuild
 * the field where it was made. Everything left on the scene stack is taken
 * off in the same frame as the load — a field still under the game-over page
 * (a lost boss battle comes back to it) writes the player's tile into
 * `state` every frame and would move the loaded party to where the battle
 * was. The field is then built from the position read out of the save
 * before anything else ran.
 *
 * What the slot holds decides where it goes (50_ch2_story 1.4):
 *  - the chapter 1 clear data (flag_clear, no flag_ch2_started) → evt_ch2_prologue
 *  - the chapter 2 clear data → 「つづきは、また こんど。」 and back to the title
 *  - anything else → the field where it was saved
 */
export function* continueGame(): Co {
  if (!loadGame()) return false;
  const at = { map: state.map || 'map_home_2f', x: state.x, y: state.y, dir: state.dir };
  game.replaceAll(new StillScene());
  uiHud.reset();
  resetAutosave();
  syncProgressSkills();
  syncSettingFlags();
  if (flag('flag_ch2_clear')) {
    yield* chapter2ClearedPage();
    return true;
  }
  if (flag('flag_clear') && !flag('flag_ch2_started')) {
    yield* startChapter2('continue');
    return true;
  }
  // whatever covered the screen, the field comes out of a dither
  yield* ditherOut(ditherLevel() >= 1 || game.fadeAlpha >= 1 ? 1 : 350, '#0B0B14');
  game.fadeAlpha = 0;
  game.replaceAll(new FieldScene(at.map, at.x, at.y, at.dir));
  yield 150;
  yield* ditherIn(700);
  return true;
}

/**
 * 〔第2章クリアデータのつづきから〕 until chapter 3 is out: one page on black,
 * then the title again (50_ch2_story 1.4).
 */
function* chapter2ClearedPage(): Co {
  yield* ditherOut(ditherLevel() >= 1 || game.fadeAlpha >= 1 ? 1 : 350, '#0B0B14');
  game.replaceAll(new BlackScene());
  game.fadeAlpha = 0;
  yield* ditherIn(1);
  yield 500;
  yield* say(msgPages(CH2_CONTINUE_CLEARED), { voice: 'sys' });
  yield 200;
  yield* toTitle(600);
}

// ---- save slot, read without loading ------------------------------------------------------

export const SAVE_SLOT_KEY = 'yugure-rpg-save-v1';
/** The state right after chapter2Adjust(), kept apart from the slot (50 1.4). */
export const CH2_START_KEY = 'hanamaru-ch2-start-v1';
const CLEAR_KEY = 'hanamaru-clear-v1';
const CLEAR_CH2_KEY = 'hanamaru-clear-ch2-v1';

export interface SavePeek {
  flags: Record<string, number>;
  map: string;
  x: number;
  y: number;
  playTimeMs: number;
  party: { level: number }[];
}

/** What is in the save slot, without touching the running state (null: empty). */
export function peekSave(): SavePeek | null {
  try {
    const raw = localStorage.getItem(SAVE_SLOT_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<SavePeek>;
    return { flags: s.flags ?? {}, map: s.map ?? '', x: s.x ?? 0, y: s.y ?? 0, playTimeMs: s.playTimeMs ?? 0, party: s.party ?? [] };
  } catch {
    return null;
  }
}

/**
 * The slot at a glance:
 *   'none' empty · 'ch1' chapter 1 in progress · 'ch1clear' the chapter 1
 *   clear data · 'ch2' chapter 2 in progress · 'ch2clear' the chapter 2 clear data
 */
export type SaveKind = 'none' | 'ch1' | 'ch1clear' | 'ch2' | 'ch2clear';

export function saveKind(p: SavePeek | null = peekSave()): SaveKind {
  if (!p) return 'none';
  const f = p.flags;
  if (f.flag_ch2_clear) return 'ch2clear';
  if (f.flag_ch2_started) return 'ch2';
  if (f.flag_clear) return 'ch1clear';
  return 'ch1';
}

function hasKey(key: string): boolean {
  try {
    return !!localStorage.getItem(key);
  } catch {
    return false;
  }
}

/** Chapter 1 has been finished on this device (the record, or the slot says so). */
export function chapter1Cleared(): boolean {
  if (hasKey(CLEAR_KEY)) return true;
  const p = peekSave();
  return !!p?.flags.flag_clear;
}

// ---- clear records (title after an ending) ------------------------------------------------

export interface ClearRecord {
  fushigi: number;
  aite: number;
  tsukkomi: number;
  tsukkomiTotal: number;
}

/**
 * Remember the finished run (called when the ending's 「つづく」 has been
 * stamped), and write the 「第1章クリアデータ」 into the save slot
 * (50_ch2_story 1.4): the crossing at map_town (56,22) facing east, night,
 * the croquettes eaten, everyone rested.
 */
export function markClear(): ClearRecord {
  setFlag('flag_clear', 1);
  const c = bookCounts();
  const rec: ClearRecord = { fushigi: c.fushigi, aite: c.aite, tsukkomi: c.tsukkomi, tsukkomiTotal: tsukkomiTotal() };
  try {
    localStorage.setItem(CLEAR_KEY, JSON.stringify(rec));
  } catch {
    /* ignore */
  }
  writeChapter1ClearData();
  return rec;
}

/** The save slot at the end of chapter 1 (the start of chapter 2's 「つづきから」). */
function writeChapter1ClearData(): void {
  if (flag('flag_ch2_started')) return;
  setFlag('flag_clear', 1);
  setFlag('flag_stage', 3);
  setFlag('flag_clock', 4);
  setFlag('flag_hud_hidden', 0);
  state.map = 'map_town';
  state.x = 56;
  state.y = 22;
  state.dir = 'right';
  state.inventory = state.inventory.filter((id) => id !== 'item_korokke');
  restAll();
  saveGame();
}

function restAll(): void {
  for (const m of state.party) {
    m.hp = m.maxHp;
    m.mp = m.maxMp;
    m.status = {};
  }
}

function readRecord(key: string): ClearRecord | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as ClearRecord;
  } catch {
    /* ignore */
  }
  return null;
}

/** Chapter 1's counts for the title card (the stored record first). */
export function clearRecord(): ClearRecord | null {
  const rec = readRecord(CLEAR_KEY);
  if (rec) return rec;
  if (flag('flag_clear')) {
    const c = bookCounts();
    return { fushigi: c.fushigi, aite: c.aite, tsukkomi: c.tsukkomi, tsukkomiTotal: tsukkomiTotal() };
  }
  return null;
}

/** Chapter 2's counts (みました帳 ②), once it has been finished. */
export function clearRecordCh2(): ClearRecord | null {
  return readRecord(CLEAR_CH2_KEY);
}

/**
 * The end of chapter 2 (evt_ch2_ending, after 「つづく」): flag_ch2_clear,
 * the ② counts under their own key, and the clear data in the slot — Minato's
 * room (map_home_2f (5,3) facing up, 19:40), the one tomato kept for
 * tomorrow (50_ch2_story 1.4 / 7.1).
 */
export function markClearCh2(): ClearRecord {
  setFlag('flag_ch2_clear', 1);
  const c = bookCountsCh2();
  const rec: ClearRecord = { fushigi: c.fushigi, aite: c.aite, tsukkomi: c.tsukkomi, tsukkomiTotal: tsukkomiTotalCh2() };
  try {
    localStorage.setItem(CLEAR_CH2_KEY, JSON.stringify(rec));
  } catch {
    /* ignore */
  }
  setFlag('flag_hud_hidden', 0);
  state.map = 'map_home_2f';
  state.x = 5;
  state.y = 3;
  state.dir = 'up';
  // the hanamaru tomato went up into the sky; of the four, one is left
  state.inventory = state.inventory.filter((id) => id !== 'item_hanamaru_tomato' && id !== 'item_tomato_omiyage');
  state.inventory.push('item_tomato_omiyage');
  restAll();
  saveGame();
  return rec;
}

// ---- chapter 2: the start ------------------------------------------------------------------

let lastLevelUps: LevelUpResult[] = [];

/** Level-ups made by chapter2Adjust() at the last start (for the prologue's 「なつやすみの つうちひょう」). */
export function chapter2LevelUps(): LevelUpResult[] {
  return lastLevelUps;
}

/** The key items every chapter 2 party has (50 1.5). */
const CH2_KEY_ITEMS = ['item_gamaguchi', 'item_hanko_case', 'item_mimashita_cho', 'item_hato_meishi'];

/**
 * 「第2章から（標準）」 (50 1.5, 51 3.2 D): newChapter2Party() — both at Lv5
 * (150), the bag, 300円, chapter 1's story flags — on a fresh state.
 */
function standardChapter2Start(): void {
  resetState();
  newChapter2Party();
  for (const id of CH2_KEY_ITEMS) if (!state.inventory.includes(id)) state.inventory.push(id);
  syncProgressSkills();
  restAll();
}

/**
 * chapter2Adjust() (51 3.1): at least 150 exp, the level recomputed (cap 7),
 * everyone rested, the croquettes gone.
 */
function adjustForChapter2(): LevelUpResult[] {
  setFlag('flag_ch2_started', 1);
  const out = chapter2Adjust();
  state.inventory = state.inventory.filter((id) => id !== 'item_korokke');
  restAll();
  return out;
}

/**
 * Start chapter 2 (02_ch2_index 6.1). `from`:
 *  - 'continue': the slot's chapter 1 clear data has just been loaded
 *  - 'title': 「第2章から」 — the start snapshot, else the slot's chapter 1
 *    clear data, else the standard start
 * Then chapter2Adjust(), flag_ch2_started / _stage / _clock, the snapshot,
 * and evt_ch2_prologue from black. The prologue runs as a field script on
 * map_town at the crossing (56,22) facing east, with the screen still black
 * (game.fadeAlpha = 1): it shows the two lines, the chapter door
 * (playChapterDoor) and fades the crossing in itself.
 */
export function* startChapter2(from: 'continue' | 'title'): Co {
  uiHud.reset();
  resetAutosave();
  let fromSnapshot = false;
  if (from === 'title') {
    if (loadSnapshot(CH2_START_KEY) && flag('flag_ch2_started') && state.party.length) fromSnapshot = true;
    else if (!(loadGame() && flag('flag_clear') && !flag('flag_ch2_started'))) standardChapter2Start();
  }
  lastLevelUps = [];
  if (!fromSnapshot) {
    lastLevelUps = adjustForChapter2();
    setFlag('flag_ch2_started', 1);
    setFlag('flag_ch2_stage', 0);
    setFlag('flag_ch2_clock', 0);
    setFlag('flag_hud_hidden', 0);
    saveSnapshot(CH2_START_KEY);
  }
  if (from === 'title') setFlag('flag_ch2_from_title', 1);
  syncProgressSkills();
  syncSettingFlags();
  stopBgm(0.4);
  stopAllAmbient(0.4);
  // everything from here starts on black
  if (ditherLevel() > 0 || game.fadeAlpha < 1) yield* ditherOut(ditherLevel() >= 1 || game.fadeAlpha >= 1 ? 1 : 350, '#0B0B14');
  game.fadeColor = '#0B0B14';
  game.fadeAlpha = 1;
  yield* ditherIn(1);
  state.map = 'map_town';
  state.x = 56;
  state.y = 22;
  state.dir = 'right';
  const f = new FieldScene('map_town', 56, 22, 'right');
  game.replaceAll(f);
  if (hasScript('evt_ch2_prologue')) {
    f.runScriptId('evt_ch2_prologue', 'chapter2');
    return;
  }
  // no prologue written yet: the two lines on black (the crossing's night song held back),
  // the chapter door, and on to the train
  stopBgm(0.2);
  yield 600;
  yield* caption(PROLOGUE_CAPTION);
  yield* playChapterDoor();
  setFlag('flag_ch2_prologue_done', 1);
  if (hasMap('map_hoshi_train')) game.replaceAll(new FieldScene('map_hoshi_train', 2, 3, 'right'));
  yield* game.fadeIn(800);
}

/** Leave whatever is running and go back to the title. */
export function* toTitle(fadeMs = 800): Co {
  stopBgm(fadeMs / 1000);
  stopAllAmbient(fadeMs / 1000);
  yield* ditherOut(fadeMs, '#0B0B14');
  game.fadeAlpha = 0;
  const { TitleScene } = (yield import('./title')) as typeof import('./title');
  game.replaceAll(new TitleScene(true));
  yield* ditherIn(500);
}
