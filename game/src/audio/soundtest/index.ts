// Sound test (brief item 7, 40_audio 15.4): every BGM, SE, ambience, voice and
// cue sheet, playable from a summer-homework notebook on an evening desk.
//
// A development tool: 15.4 keeps it out of the product, so the scene and its
// debug commands are only registered in dev builds (import.meta.env.DEV) and
// the whole module tree-shakes out of `vite build`.
//
//   ?scene=soundtest            open it directly (dev server)
//   ↑↓ choose · Z play/stop · X stop all · ←→ page (tab) · C knobs (params)
//
// Two chapters, one notebook: ←→ pages through 第1章's five tabs and on into
// 第2章's (53_ch2_audio 14.5: 星見台's songs, SEs, beds, voices and cue sheets,
// with the knobs of chapter 2 — h_stage, bgm_hoshi_night's room, the boss's
// light / name tags / phase, Tetsuya's rest, the PA's valley and distance).
//
// The right-hand cards show what is sounding: its name and note, the id the
// code uses, the song's bar map, position and params (stage / kire / boss
// phase), the cue sheet as it fires, a live spectrum and level of the output.

import { registerScene } from '../../boot';
import { registerDebug } from '../../debug';
import { game, type Scene } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import { measure as textW, wrap } from '../../engine/font';
import { W } from '../../engine/screen';
import { AMBIENCE_IDS, activeAmbients } from '../ambience';
import { liveGraph, SPACES, type SpaceId } from '../engine';
import * as A from '../index';
import { currentJingle, currentPlayer, musicParams } from '../music';
import { sfxInfo, songTable } from '../registry';
import { VOICE_SAMPLES, voiceCps } from '../samples';
import { VOICES } from '../voices';
import { C, cardArt, deskArt, hankoArt, keyArt, pageArt, pencilArtV, pencilBar, stampArt, tabArt, tapeArt } from './art';
import { cancelCue, currentCue, CUES, startCue, type Cue } from './cues';
import { CH2_CUES, stopCueLoops } from './cues_ch2';
import { CH2_AMBIENCE_IDS } from '../ambience_ch2';
import { CH2_SE_GROUPS } from '../sfx_ch2';
import { f5, f5Width } from './font5';

// ---------------------------------------------------------------------------
// content lists

type TabId = 'bgm' | 'se' | 'amb' | 'voice' | 'cue';
type Chapter = 1 | 2;
interface Row {
  kind: 'item' | 'head';
  id: string;
  label: string;
  group?: string;
}
/**
 * The list line of a row: its name without the note (song titles are shown
 * whole — they are titles, and two of them differ only in the note).
 */
const rowName = (r: Row) => (r.kind === 'item' && !r.id.startsWith('bgm_') ? splitLabel(r.label).name : r.label);

/**
 * Labels are "name（note）": the list shows the name, the card shows the name
 * and, under it, the note (how the sound is made / where it plays).
 */
export function splitLabel(label: string): { name: string; note: string } {
  const m = /^(.+?)（([^（）]+)）$/.exec(label);
  return m ? { name: m[1], note: m[2] } : { name: label, note: '' };
}

/**
 * Break a card line into whole lines of at most `maxW` px (at most `max`
 * lines) where the words break. Candidates, best first: after ・ ： 、 → or
 * a space and before an opening bracket; after a particle that closes a word
 * (の が を に で へ と before katakana / kanji: 1本だけの｜蛍光灯, then after them);
 * where a katakana word meets other script (当たり｜ルーレット). The break
 * that needs the fewest lines wins, then the better kind, then the later
 * one; with no candidate, the engine's kinsoku wrap. Never a cut glyph.
 */
const lineCache = new Map<string, string[]>();
export function cardLines(text: string, maxW: number, max: number): string[] {
  if (max <= 0) return [];
  const key = `${maxW}|${max}|${text}`;
  let hit = lineCache.get(key);
  if (!hit) {
    hit = breakLines(text, maxW, max);
    lineCache.set(key, hit);
  }
  return hit;
}
function breakLines(text: string, maxW: number, max: number): string[] {
  if (textW(text) <= maxW) return [text];
  const chars = [...text];
  const hira = (c: string) => c >= 'ぁ' && c <= 'ゖ';
  const kata = (c: string) => (c >= 'ァ' && c <= 'ヺ') || c === 'ー';
  const closing = 'ー」）』、。！？…ッッャュョァィゥェォ';
  let best: { lines: string[]; tier: number; at: number } | null = null;
  for (let i = 1; i < chars.length; i++) {
    const head = chars.slice(0, i).join('').replace(/ +$/, '');
    if (textW(head) > maxW) break;
    const pp = chars[i - 2] ?? '';
    const prev = chars[i - 1];
    const cur = chars[i];
    if (closing.includes(cur)) continue;
    let tier = -1;
    if ('「（『'.includes(cur) || '・：、→ '.includes(prev)) tier = 0;
    // a particle before katakana / kanji surely ends a word (ふわっと｜上がる);
    // after kanji before kana it may be okurigana (上が｜る), so it ranks lower
    else if ('のがをにでへと'.includes(prev) && pp && !hira(cur)) tier = 1;
    else if ('のがをにでへと'.includes(prev) && pp && !hira(pp)) tier = 2;
    else if (kata(prev) !== kata(cur)) tier = 3;
    if (tier < 0) continue;
    const rest = cardLines(chars.slice(i).join('').replace(/^ +/, ''), maxW, 9);
    const lines = [head, ...rest];
    if (!best || lines.length < best.lines.length || (lines.length === best.lines.length && (tier < best.tier || (tier === best.tier && i > best.at))))
      best = { lines, tier, at: i };
  }
  // kinsoku may hang a closing mark 16 px past the width: leave it room
  const lines = best ? best.lines : wrap(text, maxW - 16);
  return lines.slice(0, max);
}

/** Line step of the card's title block (px). */
const TITLE_LH = 16;

const TABS: { id: TabId; label: string; color: string }[] = [
  { id: 'bgm', label: '曲', color: C.tape },
  { id: 'se', label: '効果音', color: C.margin },
  { id: 'amb', label: '環境音', color: C.green },
  { id: 'voice', label: '声', color: C.water },
  { id: 'cue', label: '演出', color: C.concrete },
];

const BGM_ORDER = [
  'bgm_title', 'bgm_title_clear', 'bgm_town_s0', 'bgm_town_s1', 'bgm_town_s2', 'bgm_home', 'bgm_shop', 'bgm_mall',
  'bgm_battle', 'bgm_midboss', 'bgm_boss', 'bgm_ending', 'bgm_night',
  'bgm_jingle_victory', 'bgm_jingle_levelup', 'bgm_jingle_item', 'bgm_jingle_join', 'bgm_jingle_gameover',
];

const AMB_LABEL: Record<string, string> = {
  amb_higurashi: 'ヒグラシ（段階0）',
  amb_still: '止まった町の耳鳴り',
  amb_s2_town: '忘却の町（段階2）',
  amb_train_far: '夜のほうの電車',
  amb_night_insects: '夜の虫',
  amb_fan: '扇風機（家2F）',
  amb_fridge: '冷蔵庫のうなり',
  amb_tv: 'テレビの声（家1F）',
  amb_clock_tick: '柱時計（ひのや）',
  amb_oil: '静かに待つ油',
  amb_dryer: '3番の乾燥機',
  amb_koban: '交番の無線',
  amb_fluorescent: '蛍光灯のうなり',
  amb_fluorescent_flicker: '1本だけの蛍光灯',
  amb_kaitenyaki: '回転焼き機',
  amb_mall_wind: '自動ドアの風',
  amb_kawabe: '用水路のせせらぎ',
  amb_arcade: 'アーケードのラジオ',
  amb_wind: '風と草',
  // chapter 2
  amb_h_insects: '8月末の山の虫（カンタン、エンマコオロギ、遠いスズムシ）',
  amb_h_kusa: 'クズのやぶの虫（クツワムシ、ウマオイ）',
  amb_h_tanada: '棚田の水口（ときどきアマガエル）',
  amb_h_mizu: '用水路と沢（山から来る速い水）',
  amb_h_wind: '夜風と葉ずれ（稲・ススキ・杉・丘の上）',
  amb_h_yama: '山の気配（遠いイノシシ。段階1〜2）',
  amb_h_hachi: '巣箱のマルハナバチ（3号ハウス）',
  amb_h_fence: '電気柵のパルス（1秒おきのカチッ）',
  amb_h_barn_out: '牛舎の外（壁ごしの換気扇と鼻息）',
  amb_h_barn: '牛舎の中（換気扇、反すう、給水器）',
  amb_h_house: '息をするハウス（ビニールの4秒の息）',
  amb_h_tomato: 'はなまるトマトの音（暗がりの道しるべ）',
  amb_h_school: '集会所の夜（やかん、いびき、寝言）',
  amb_h_boukatou: '防犯灯のうなり（はりきって点いている）',
  amb_h_tetsuya: '夜通しの耕うん機（空冷1気筒のドッドッ）',
  amb_h_train: '夜の電車の車内（レールの継ぎ目）',
  amb_h_pa_hum: '開いたままの回線（段階2の放送のうなり）',
  amb_h_dawn: '夜明けのヒグラシ（朝も鳴く）',
};

/** 第2章's songs: 星見台's three, and the two battle songs heard at night (53 5.5). */
const CH2_BGM: { id: string; label: string }[] = [
  { id: 'bgm_hoshi_night', label: '星見台の夜' },
  { id: 'bgm_boss_yobimodoshi', label: 'ボス（ヨビモドシ）' },
  { id: 'bgm_hoshi_morning', label: '星見台の朝' },
  { id: 'bgm_battle@night', label: '通常戦（星見台の夜）' },
  { id: 'bgm_midboss@night', label: '中ボス（テツヤ）' },
];
const CH2_SONG_IDS = new Set(['bgm_hoshi_night', 'bgm_boss_yobimodoshi', 'bgm_hoshi_morning']);
/** 第2章's voices (53 9.1) and the old ones it speaks with. */
const CH2_VOICE_RE = /^(h_|yobimodoshi$)/;
const CH2_VOICE_REUSED = ['broadcast', 'kanenari_voice'];
/** Sample lines for the reused voices when heard on the 第2章 page. */
const CH2_SAMPLES: Record<string, string> = {
  broadcast: '……おぴぴちゃん。',
  kanenari_voice: '……おはよう。',
};
const isCh2Se = (group: string) => CH2_SE_GROUPS.includes(group);

function rowsFor(tab: TabId, ch: Chapter): Row[] {
  const two = ch === 2;
  switch (tab) {
    case 'bgm': {
      if (two) return CH2_BGM.filter((r) => songTable.has(r.id.split('@')[0])).map((r) => ({ kind: 'item', id: r.id, label: r.label }));
      const ids = [...BGM_ORDER.filter((id) => songTable.has(id)), ...[...songTable.keys()].filter((id) => !BGM_ORDER.includes(id) && !CH2_SONG_IDS.has(id))];
      return ids.map((id) => ({ kind: 'item', id, label: songTable.get(id)!.title }));
    }
    case 'se': {
      const out: Row[] = [];
      let g = '';
      for (const [id, info] of sfxInfo) {
        if (isCh2Se(info.group) !== two) continue;
        if (info.group !== g) {
          g = info.group;
          // (the page already says 第2章)
          out.push({ kind: 'head', id: `#${g}`, label: g.replace(/^第2章：/, '') });
        }
        out.push({ kind: 'item', id, label: info.label, group: info.group });
      }
      return out;
    }
    case 'amb':
      return AMBIENCE_IDS.filter((id) => CH2_AMBIENCE_IDS.includes(id) === two).map((id) => ({ kind: 'item', id, label: AMB_LABEL[id] ?? id }));
    case 'voice': {
      const ids = Object.keys(VOICES).filter((id) => id !== 'sys' && CH2_VOICE_RE.test(id) === two);
      if (two) ids.push(...CH2_VOICE_REUSED.filter((id) => id in VOICES));
      return ids.map((id) => ({ kind: 'item', id, label: VOICES[id].label }));
    }
    case 'cue':
      return (two ? CH2_CUES : CUES).map((c) => ({ kind: 'item', id: c.id, label: c.label, group: c.ref }));
  }
}

/** Both chapters' pages in order: 第1章's five tabs, then 第2章's. */
const PAGES: { tab: TabId; ch: Chapter }[] = ([1, 2] as Chapter[]).flatMap((ch) => (['bgm', 'se', 'amb', 'voice', 'cue'] as TabId[]).map((tab) => ({ tab, ch })));
const ALL_CUES: Cue[] = [...CUES, ...CH2_CUES];

// ---------------------------------------------------------------------------
// params ("つまみ")

const SPACE_IDS = Object.keys(SPACES) as SpaceId[];
interface Knob {
  name: string;
  values: number;
  get(): number;
  set(v: number): void;
  show(v: number): string;
  /** How a knob with more than four values is drawn (default: a volume ruler). */
  style?: 'arrows' | 'ruler';
}
const KNOBS: Knob[] = [
  { name: 'STAGE', values: 4, get: () => musicParams().stage, set: (v) => A.setMusicParam('stage', v), show: String },
  { name: 'KIRE', values: 4, get: () => musicParams().kire, set: (v) => A.setMusicParam('kire', v), show: String },
  { name: 'BOSS', values: 3, get: () => musicParams().boss_phase - 1, set: (v) => A.setMusicParam('boss_phase', v + 1), show: (v) => String(v + 1) },
  { name: 'MUFFLE', values: 2, get: () => (musicParams().muffle > 0 ? 1 : 0), set: (v) => A.setMusicParam('muffle', v), show: (v) => (v ? 'ON' : 'OFF') },
  { name: 'SPACE', values: SPACE_IDS.length, get: () => Math.max(0, SPACE_IDS.indexOf(A.currentSpace())), set: (v) => A.setSpace(SPACE_IDS[v]), show: (v) => SPACE_IDS[v], style: 'arrows' },
  { name: 'BGM', values: 11, get: () => A.getVolume('bgm'), set: (v) => A.setVolume('bgm', v), show: String },
  { name: 'SE', values: 11, get: () => A.getVolume('se'), set: (v) => A.setVolume('se', v), show: String },
];

/** bgm_hoshi_night's rooms (53 5.2). */
const ROOMS = ['outdoor', 'house', 'barn', 'school', 'hill'];
let room = 0;
/** 第2章's knobs (53 14.5). */
const KNOBS_CH2: Knob[] = [
  { name: 'HSTAGE', values: 5, get: () => musicParams().h_stage + 1, set: (v) => A.setMusicParam('h_stage', v - 1), show: (v) => String(v - 1), style: 'arrows' },
  {
    name: 'ROOM',
    values: ROOMS.length,
    get: () => room,
    set: (v) => {
      room = v;
      if (A.currentBgmId() === 'bgm_hoshi_night') A.playBgm('bgm_hoshi_night', { variant: ROOMS[v] });
    },
    show: (v) => ROOMS[v],
    style: 'arrows',
  },
  { name: 'LIGHT', values: 2, get: () => musicParams().h_light, set: (v) => A.setMusicParam('h_light', v), show: (v) => (v ? 'ON' : 'OFF') },
  { name: 'TENKO', values: 5, get: () => musicParams().tenko, set: (v) => A.setMusicParam('tenko', v), show: String, style: 'arrows' },
  { name: 'REST', values: 2, get: () => musicParams().h_rest, set: (v) => A.setMusicParam('h_rest', v), show: (v) => (v ? 'ON' : 'OFF') },
  { name: 'BOSS', values: 3, get: () => musicParams().boss_phase - 1, set: (v) => A.setMusicParam('boss_phase', v + 1), show: (v) => String(v + 1) },
  { name: 'PA', values: 2, get: () => (A.getPaState().mode === 'yama' ? 1 : 0), set: (v) => A.setPaMode(v ? 'yama' : 'town'), show: (v) => (v ? 'YAMA' : 'TOWN') },
  { name: 'DIST', values: 11, get: () => Math.round(A.getPaState().d * 10), set: (v) => A.setPaDistance(v / 10, A.getPaState().indoor), show: (v) => (v / 10).toFixed(1), style: 'ruler' },
];
const knobsOf = (ch: Chapter) => (ch === 2 ? KNOBS_CH2 : KNOBS);
/** Knob rows are 9 px apart; eight of them (第2章) fit at 8. */
const knobStep = (ch: Chapter) => (knobsOf(ch).length > 7 ? 8 : 9);

/** The room each song is heard in (11.4), so the reverb matches the game. */
const SONG_SPACE: Record<string, SpaceId> = {
  bgm_title: 'outdoor', bgm_title_clear: 'outdoor', bgm_town_s0: 'outdoor', bgm_town_s1: 'outdoor', bgm_town_s2: 'outdoor',
  bgm_home: 'room', bgm_shop: 'room', bgm_mall: 'hall', bgm_battle: 'battle', bgm_midboss: 'battle', bgm_boss: 'maigo',
  bgm_ending: 'outdoor', bgm_night: 'night',
  // chapter 2 (53 3.4)
  bgm_hoshi_night: 'yama', bgm_hoshi_morning: 'yama', bgm_boss_yobimodoshi: 'battle',
};

/** SEs that take an option: each press plays the next variant. */
const SE_VARIANTS: Record<string, { opts: A.SfxOpts; tag: string }[]> = {
  se_chime_note: ['G4', 'A4', 'C5', 'E5'].map((n) => ({ opts: { note: n, hold: n === 'E5' ? 0.9 : 0.45 }, tag: n })),
  se_kire_up: [1, 2, 3].map((l) => ({ opts: { level: l }, tag: `LEVEL ${l}` })),
  se_hanamaru: (['kukkiri', 'futsu', 'kasure'] as const).map((g) => ({ opts: { grade: g }, tag: g })),
  se_mimashita: (['kukkiri', 'futsu', 'kasure'] as const).map((g) => ({ opts: { grade: g }, tag: g })),
  se_rewind: (['kukkiri', 'futsu', 'kasure'] as const).map((g) => ({ opts: { grade: g }, tag: g })),
  se_ring: [480, 800, 300].map((d) => ({ opts: { dur: d }, tag: `DUR ${d}MS` })),
  se_stamp_light: [0, 4, 7, 12].map((st) => ({ opts: { pitch: Math.pow(2, st / 12) }, tag: `PITCH +${st}` })),
  se_hanko_charge: [0, 0.3, 0.6].map((a) => ({ opts: { pitch: 1 + a }, tag: `AMOUNT ${Math.round((a / 0.6) * 100)}%` })),
  // chapter 2 (53 13: level, note, grade)
  se_h_boar: [0, 1, 2].map((l) => ({ opts: { level: l }, tag: ['LEVEL 0 CHARGE', 'LEVEL 1 RUSH', 'LEVEL 2 HOME'][l] })),
  se_h_tiller: [0, 1, 2, 3, 4, 5].map((l) => ({ opts: { level: l }, tag: `LEVEL ${l}` })),
  se_h_ressha: [0, 1].map((l) => ({ opts: { level: l }, tag: l ? 'GOTON' : 'GATAN' })),
  se_h_tenko: ['D6', 'A5', 'F5'].map((n) => ({ opts: { note: n }, tag: n })),
  se_h_tomato_glow: [{ opts: {}, tag: 'FUTSU' }, { opts: { grade: 'kukkiri' as const }, tag: 'KUKKIRI 2.0S' }],
  se_h_otsukare: (['kukkiri', 'futsu', 'kasure'] as const).map((g) => ({ opts: { grade: g }, tag: g })),
  se_h_howl: [1, 0.89, 0.84, 0.75].map((p, i) => ({ opts: { pitch: p }, tag: ['EAST', 'WEST', 'SOUTH', 'NORTH'][i] })),
  se_pa_chime_end: [{ opts: {}, tag: '' }, { opts: { pitch: 0.5, vol: 0.8 }, tag: 'FINAL 0.5' }],
  se_h_ibiki: [1, 1.35].map((p) => ({ opts: { pitch: p }, tag: p === 1 ? 'SHIGE 1.0' : 'SUGI 1.35' })),
  se_h_acha: [0.8, 1.15].map((p) => ({ opts: { pitch: p }, tag: p === 0.8 ? 'SHIGE 0.8' : 'SUGI 1.15' })),
};

/** SE rows that are loops in the game: Z starts the loop, Z again stops it. */
const SE_LOOPS = new Set(['se_h_crossing_bell', 'se_h_train_idle', 'se_h_bus_idle']);

// ---------------------------------------------------------------------------
// layout

const PAGE_X = 8;
const PAGE_Y = 20;
const PAGE_W = 226;
const PAGE_H = 176;
const PX = PAGE_X + 6; // paper left edge
const LIST_Y = 44;
const ROW_H = 18;
const ROWS = 8;
const TEXT_X = PX + 26;
const CARD_X = 246;
const CARD_W = 130;
const NOW_Y = 12;
const NOW_H = 96;
const KNOB_Y = 116;
const KNOB_H = 80;
const CX = CARD_X + 6;
const CW = CARD_W - 12;

const SPEC_COLORS = [C.water, C.water, C.green, C.green, C.green, C.tape, C.tape, C.tape, C.sun, C.sun, C.margin, C.margin, C.shu, C.shu];

class SoundTestScene implements Scene {
  /** The page: 第1章's five tabs (0–4), then 第2章's (5–9). */
  private page = 0;
  private sel: number[] = PAGES.map(() => 0);
  private top: number[] = PAGES.map(() => 0);
  private rows: Row[][] = PAGES.map((pg) => rowsFor(pg.tab, pg.ch));
  /** Loops started from an SE row (they run until Z again or X). */
  private seLoops = new Map<string, A.LoopHandle>();
  private focus: 'list' | 'knobs' = 'list';
  private knob = 0;
  private t = 0;
  private press = 0;
  /** Last thing auditioned in each tab (the card shows it). */
  private last: { tab: TabId; id: string; tag?: string } | null = null;
  private variantI: Record<string, number> = {};
  private typing: { voice: string; chars: string[]; shown: number; acc: number; cps: number; hold: number } | null = null;
  private analyser: AnalyserNode | null = null;
  private freq = new Uint8Array(512);
  private wave = new Float32Array(1024);
  private bars = new Float32Array(20);
  private level = -60;
  private peakHold = -60;
  private peakT = 0;
  /** An SE row keeps a fading ink stamp for a moment after it plays. */
  private seFlash: { id: string; t: number } | null = null;

  enter(): void {
    A.unlockAudio();
    this.attachAnalyser();
  }

  exit(): void {
    this.detachAnalyser();
    cancelCue();
    stopCueLoops();
    for (const h of this.seLoops.values()) h.stop(0.3);
    this.seLoops.clear();
  }

  private attachAnalyser(): void {
    const g = liveGraph();
    if (!g || this.analyser) return;
    const an = g.ctx.createAnalyser();
    an.fftSize = 1024;
    an.smoothingTimeConstant = 0.72;
    an.minDecibels = -92;
    an.maxDecibels = -22;
    g.limiter.connect(an);
    this.analyser = an;
    this.freq = new Uint8Array(an.frequencyBinCount);
    this.wave = new Float32Array(an.fftSize);
  }

  private detachAnalyser(): void {
    const g = liveGraph();
    if (g && this.analyser)
      try {
        g.limiter.disconnect(this.analyser);
      } catch {
        /* gone */
      }
    this.analyser = null;
  }

  // ---- input -------------------------------------------------------------

  update(dt: number): void {
    this.t += dt;
    this.press = Math.max(0, this.press - dt);
    if (!this.analyser) this.attachAnalyser();
    const inp = game.input;
    if (inp.pressed('menu')) {
      this.focus = this.focus === 'list' ? 'knobs' : 'list';
      A.sfx('se_page', { vol: 0.6 });
    }
    if (this.focus === 'list') this.updateList(inp);
    else this.updateKnobs(inp);
    if (inp.pressed('cancel')) this.stopAll();
    this.updateTyping(dt);
    this.updateMeters(dt);
  }

  /** The tab (0–4) of the page. */
  private get tab(): number {
    return this.page % TABS.length;
  }
  private get chapter(): Chapter {
    return PAGES[this.page].ch;
  }

  private updateList(inp: typeof game.input): void {
    if (inp.repeat('left') || inp.repeat('right')) {
      const was = this.chapter;
      this.page = (this.page + (inp.repeat('left') ? PAGES.length - 1 : 1)) % PAGES.length;
      // turning into the other chapter: a heavier page, and its knobs
      A.sfx('se_page', { vol: this.chapter !== was ? 1 : 0.7, pitch: this.chapter !== was ? 0.85 : 1 });
      if (this.chapter !== was) this.knob = 0;
    }
    const pg = this.page;
    const rows = this.rows[pg];
    const dir = inp.repeat('up') ? -1 : inp.repeat('down') ? 1 : 0;
    if (dir) {
      let i = this.sel[pg];
      do i = (i + dir + rows.length) % rows.length;
      while (rows[i].kind === 'head');
      this.sel[pg] = i;
      A.sfx('se_cursor', { vol: 0.6 });
    }
    // keep the selection in view (headers above it too)
    const s = this.sel[pg];
    if (s < this.top[pg] + 1) this.top[pg] = Math.max(0, s - 1);
    if (s > this.top[pg] + ROWS - 1) this.top[pg] = s - ROWS + 1;
    if (rows[this.sel[pg]]?.kind === 'head') this.sel[pg]++;
    if (inp.pressed('confirm')) this.activate(rows[this.sel[pg]]);
  }

  private updateKnobs(inp: typeof game.input): void {
    const knobs = knobsOf(this.chapter);
    if (inp.repeat('up')) this.knob = (this.knob + knobs.length - 1) % knobs.length;
    if (inp.repeat('down')) this.knob = (this.knob + 1) % knobs.length;
    if (inp.repeat('up') || inp.repeat('down')) A.sfx('se_cursor', { vol: 0.6 });
    const d = inp.repeat('left') ? -1 : inp.repeat('right') ? 1 : 0;
    if (d) {
      const k = knobs[this.knob];
      const v = Math.max(0, Math.min(k.values - 1, k.get() + d));
      if (v !== k.get()) {
        k.set(v);
        A.sfx(k.name === 'SE' ? 'se_confirm' : 'se_slider');
      }
    }
    if (inp.pressed('confirm')) this.focus = 'list';
  }

  private activate(row: Row | undefined): void {
    if (!row || row.kind !== 'item') return;
    A.unlockAudio();
    this.attachAnalyser();
    this.press = 140;
    const tab = TABS[this.tab].id;
    switch (tab) {
      case 'bgm': {
        // 第2章: the battle songs at night are the same songs with h_stage ≥ 0 (53 5.5)
        const [id, form] = row.id.split('@');
        const ch2 = this.chapter === 2;
        if (A.currentBgmId() === id && !/jingle/.test(id) && (!ch2 || (form === 'night') === (musicParams().h_stage >= 0))) A.stopBgm(0.5);
        else {
          if (ch2) {
            // 星見台: the valley's PA, and a stage the songs can hear (−1 is "away")
            A.setPaMode('yama');
            if (musicParams().h_stage < 0) A.setMusicParam('h_stage', id === 'bgm_hoshi_morning' ? 2 : 0);
          } else if (!CH2_SONG_IDS.has(id)) {
            // 第1章's page plays 第1章's songs as the town hears them
            A.setMusicParam('h_stage', -1);
            A.setPaMode('town');
          }
          const space = SONG_SPACE[id];
          if (space) A.setSpace(id === 'bgm_hoshi_night' && ROOMS[room] !== 'outdoor' && ROOMS[room] !== 'hill' ? (ROOMS[room] === 'barn' ? 'barn' : 'room') : space);
          if (A.currentBgmId() === id) A.stopBgm(0.05);
          A.playBgm(id, { fade: 0.2, variant: id === 'bgm_hoshi_night' ? ROOMS[room] : undefined, resume: false });
        }
        this.last = { tab, id: row.id };
        break;
      }
      case 'se': {
        if (SE_LOOPS.has(row.id)) {
          const h = this.seLoops.get(row.id);
          if (h) {
            h.stop(row.id === 'se_h_crossing_bell' ? 0 : 0.3);
            this.seLoops.delete(row.id);
            this.last = { tab, id: row.id, tag: 'STOP' };
          } else {
            this.seLoops.set(row.id, A.sfxLoop(row.id));
            this.last = { tab, id: row.id, tag: 'LOOP' };
          }
          this.seFlash = { id: row.id, t: this.t };
          break;
        }
        const vs = SE_VARIANTS[row.id];
        let tag: string | undefined;
        if (vs) {
          const i = (this.variantI[row.id] ?? -1) + 1;
          this.variantI[row.id] = i % vs.length;
          A.sfx(row.id, vs[i % vs.length].opts);
          tag = vs[i % vs.length].tag;
        } else A.sfx(row.id);
        this.last = { tab, id: row.id, tag };
        this.seFlash = { id: row.id, t: this.t };
        break;
      }
      case 'amb':
        if (activeAmbients().includes(row.id)) A.stopAmbient(row.id, 0.5);
        else {
          // 星見台's beds are heard in 星見台's valley (the open line hears the PA's distance)
          if (row.id.startsWith('amb_h_')) {
            A.setPaMode('yama');
            if (musicParams().h_stage < 0) A.setMusicParam('h_stage', row.id === 'amb_h_pa_hum' ? 2 : row.id === 'amb_h_yama' ? 1 : 0);
            if (row.id === 'amb_h_barn') A.setSpace('barn');
            else if (/^amb_h_(train|house|school|tomato|hachi)$/.test(row.id)) A.setSpace('room');
            else A.setSpace('yama');
          }
          A.playAmbient(row.id, { fade: 0.4 });
        }
        this.last = { tab, id: row.id };
        break;
      case 'voice':
        // 第2章's voices speak in 星見台 (the calls through the valley's speaker); 第1章's in the town
        A.setPaMode(this.chapter === 2 ? 'yama' : 'town');
        this.say(row.id, (this.chapter === 2 ? CH2_SAMPLES[row.id] : undefined) ?? VOICE_SAMPLES[row.id] ?? VOICE_SAMPLES.default);
        this.last = { tab, id: row.id };
        break;
      case 'cue': {
        const cue = ALL_CUES.find((c) => c.id === row.id);
        if (cue) startCue(cue, (v, text) => this.say(v, text));
        this.last = { tab, id: row.id };
        break;
      }
    }
  }

  private stopAll(): void {
    cancelCue();
    stopCueLoops();
    for (const h of this.seLoops.values()) h.stop(0.3);
    this.seLoops.clear();
    A.stopBgm(0.5);
    A.stopAllAmbient(0.5);
    A.setMusicParam('kire', 0);
    A.setMusicParam('boss_phase', 1);
    for (const k of ['h_light', 'tenko', 'h_rest'] as const) A.setMusicParam(k, 0);
    this.typing = null;
  }

  /** Type a line with its voice at the dialog speed. Returns its length (s). */
  private say(voice: string, text: string): number {
    const cps = voiceCps(voice);
    this.typing = { voice, chars: [...text], shown: 0, acc: 0, cps, hold: 1800 };
    return text.length / cps;
  }

  private updateTyping(dt: number): void {
    const ty = this.typing;
    if (!ty) return;
    if (ty.shown < ty.chars.length) {
      ty.acc += (dt / 1000) * ty.cps;
      while (ty.acc >= 1 && ty.shown < ty.chars.length) {
        ty.acc -= 1;
        A.textBlip(ty.voice, ty.chars[ty.shown]);
        ty.shown++;
      }
    } else {
      ty.hold -= dt;
      if (ty.hold <= 0) this.typing = null;
    }
  }

  private updateMeters(dt: number): void {
    const an = this.analyser;
    if (!an) return;
    an.getByteFrequencyData(this.freq);
    an.getFloatTimeDomainData(this.wave);
    const sr = an.context.sampleRate;
    const n = this.bars.length;
    for (let i = 0; i < n; i++) {
      const f0 = 60 * Math.pow(12000 / 60, i / n);
      const f1 = 60 * Math.pow(12000 / 60, (i + 1) / n);
      const b0 = Math.max(1, Math.floor((f0 / sr) * an.fftSize));
      const b1 = Math.max(b0 + 1, Math.ceil((f1 / sr) * an.fftSize));
      let m = 0;
      for (let b = b0; b < b1 && b < this.freq.length; b++) m = Math.max(m, this.freq[b]);
      const v = m / 255;
      this.bars[i] = v > this.bars[i] ? v : Math.max(v, this.bars[i] - dt / 600);
    }
    let pk = 0;
    for (const x of this.wave) pk = Math.max(pk, Math.abs(x));
    const db = 20 * Math.log10(pk + 1e-6);
    this.level = db > this.level ? db : Math.max(db, this.level - dt / 25);
    if (db >= this.peakHold || this.t - this.peakT > 1500) {
      this.peakHold = db;
      this.peakT = this.t;
    }
  }

  // ---- drawing -------------------------------------------------------------

  draw(g: Gfx): void {
    g.img(deskArt(W, 216), 0, 0);
    // tabs behind the page, then the page, then the active tab in front
    TABS.forEach((t, i) => {
      if (i !== this.tab) this.drawTab(g, i, false);
    });
    g.img(pageArt(PAGE_W, PAGE_H), PAGE_X, PAGE_Y);
    this.drawTab(g, this.tab, true);
    this.drawList(g);
    this.drawNowCard(g);
    this.drawKnobCard(g);
    g.img(pencilArtV(), 236, 118);
    this.drawHints(g);
  }

  private tabX(i: number): number {
    let x = PX + 6;
    for (let k = 0; k < i; k++) x += textW(TABS[k].label) + 10 + 3;
    return x;
  }

  private drawTab(g: Gfx, i: number, active: boolean): void {
    const t = TABS[i];
    const w = textW(t.label) + 10;
    const x = this.tabX(i);
    const y = active ? 1 : 4;
    const h = PAGE_Y - y + (active ? 2 : 1);
    g.img(tabArt(w, h, t.color, active), x, y);
    g.text(t.label, x + 5, y + 1, { color: active ? C.ink : C.sys });
  }

  private drawList(g: Gfx): void {
    const ctx = g.ctx;
    const tabI = this.page;
    const tab = TABS[this.tab];
    const rows = this.rows[tabI];
    const items = rows.filter((r) => r.kind === 'item');
    const selRow = rows[this.sel[tabI]];
    // header: the chapter on a strip of masking tape, the section title with a
    // vermilion pencil underline, and the count
    const ch = this.chapter;
    const chLabel = `${ch}章`;
    const tapeW = textW(chLabel) + 6;
    g.img(tapeArt(tapeW, 17, ch === 2 ? C.water : C.tape), PX + 1, 23);
    g.text(chLabel, PX + 4, 23, { color: C.ink });
    const titles = { bgm: ch === 2 ? '星見台の曲' : '曲と ジングル', se: '効果音', amb: '環境音（ループ）', voice: '文字送りの声', cue: '演出（キュー）' };
    const title = titles[tab.id];
    const tx = PX + tapeW + 5;
    g.text(title, tx, 23, { color: C.ink });
    const tw = textW(title);
    for (let x = 0; x < tw + 4; x++) g.px(tx - 1 + x, 40 + (x % 7 === 3 ? 1 : 0), C.shu);
    const idx = items.indexOf(selRow) + 1;
    f5(ctx, `${idx}/${items.length}`, PX + PAGE_W - 8, 27, C.sys, { align: 'right' });

    const top = this.top[tabI];
    const playing = new Set<string>();
    const cur = A.currentBgmId();
    if (cur) playing.add(cur);
    const jg = currentJingle();
    if (jg) playing.add(jg.def.id);
    for (const a of activeAmbients()) playing.add(a);
    const cue = currentCue();
    if (cue && !cue.done) playing.add(cue.cue.id);
    if (this.typing) playing.add(this.typing.voice);

    g.clip(PX + 1, LIST_Y - 1, PAGE_W - 2, ROWS * ROW_H + 2, () => {
      for (let k = 0; k < ROWS; k++) {
        const r = rows[top + k];
        if (!r) break;
        const y = LIST_Y + k * ROW_H;
        if (r.kind === 'head') {
          // a group heading: small caption and a dotted rule
          g.text(r.label, TEXT_X, y + 1, { color: C.sys });
          const x0 = TEXT_X + textW(r.label) + 6;
          for (let x = x0; x < PX + PAGE_W - 10; x += 3) g.px(x, y + 10, C.shadow);
          continue;
        }
        const sel = top + k === this.sel[tabI];
        let label = rowName(r);
        const maxW = PX + PAGE_W - 22 - TEXT_X;
        if (textW(label) > maxW) {
          while (textW(label + '…') > maxW && label.length) label = label.slice(0, -1);
          label += '…';
        }
        if (sel) {
          // highlighter stroke with uneven ends
          const w = textW(label) + 6;
          const hx = TEXT_X - 3;
          g.alpha(this.focus === 'list' ? 0.75 : 0.4, () => {
            g.rect(hx + 1, y + 2, w - 2, 15, C.marker);
            g.rect(hx, y + 3, 1, 12, C.marker);
            g.rect(hx + w - 1, y + 4, 1, 12, C.marker);
          });
        }
        g.text(label, TEXT_X, y + 1, { color: C.ink });
        if (playing.has(r.id) || this.seLoops.has(r.id) || (r.id.endsWith('@night') && cur === r.id.split('@')[0] && musicParams().h_stage >= 0)) {
          const kind = tab.id === 'amb' ? 'wave' : tab.id === 'cue' ? 'check' : 'note';
          g.img(stampArt(kind), PX + PAGE_W - 22, y + 3, { alpha: 0.9 });
        } else if (this.seFlash && this.seFlash.id === r.id && tab.id === 'se') {
          const a = 1 - (this.t - this.seFlash.t) / 900;
          if (a > 0) g.img(stampArt('note'), PX + PAGE_W - 22, y + 3, { alpha: Math.min(0.9, a) });
        }
        if (sel) {
          const bob = this.focus === 'list' ? Math.round(Math.sin(this.t / 180) * 0.6) : 0;
          const img = hankoArt(this.press > 0);
          g.img(img, PX + 11, y + 3 + bob, { alpha: this.focus === 'list' ? 1 : 0.55 });
        }
      }
    });
    // scroll bar: a dotted pencil track with a solid thumb along the right edge
    if (rows.length > ROWS) {
      const sx = PX + PAGE_W - 5;
      const th = ROWS * ROW_H - 4;
      for (let y = 0; y < th; y += 2) g.px(sx, LIST_Y + 2 + y, C.shadow);
      const tl = Math.max(8, Math.round((ROWS / rows.length) * th));
      const ty = LIST_Y + 2 + Math.round((top / (rows.length - ROWS)) * (th - tl));
      g.rect(sx - 1, ty, 3, tl, C.ink);
      g.rect(sx, ty + 1, 1, tl - 2, C.shadow);
    }
  }

  private drawCardFrame(g: Gfx, y: number, h: number, title: string): void {
    g.img(cardArt(CARD_W, h), CARD_X, y);
    const tw = textW(title) + 16;
    g.img(tapeArt(tw, 17), CARD_X + Math.round((CARD_W - tw) / 2), y - 9);
    g.text(title, CARD_X + Math.round((CARD_W - tw) / 2) + 8, y - 9, { color: C.ink });
  }

  private drawNowCard(g: Gfx): void {
    const ctx = g.ctx;
    this.drawCardFrame(g, NOW_Y, NOW_H, 'いま');
    const cue = currentCue();
    const p = currentPlayer();
    const jg = currentJingle();
    const last = this.last;
    const tab = TABS[this.tab].id;
    // what to describe: a running cue > typing voice > the last SE / loop > the song
    type Mode = 'cue' | 'voice' | 'se' | 'amb' | 'song' | 'idle';
    let mode: Mode = 'idle';
    let label = 'しずか';
    let id = '';
    let tag = '';
    if (cue && (tab === 'cue' || !p)) {
      mode = 'cue';
      label = cue.cue.label;
    } else if (this.typing && tab === 'voice') {
      mode = 'voice';
      label = VOICES[this.typing.voice]?.label ?? this.typing.voice;
      id = this.typing.voice;
      tag = `${this.typing.cps}/S`;
    } else if (last && last.tab === 'se' && tab === 'se') {
      mode = 'se';
      label = sfxInfo.get(last.id)?.label ?? last.id;
      id = last.id;
      tag = last.tag ?? '';
    } else if (last && last.tab === 'amb' && tab === 'amb') {
      mode = 'amb';
      label = AMB_LABEL[last.id] ?? last.id;
      id = last.id;
      const on = activeAmbients();
      tag = on.includes(last.id) ? 'LOOP' : 'OFF';
    } else if (jg || p) {
      mode = 'song';
      const d = (jg ?? p)!.def;
      label = d.title;
      id = d.id;
    }

    // title block: the name in ink, its note (the label's closing （…）) in
    // pencil under it. Whole lines only, broken where the words break — no
    // glyph is ever cut by the card edge.
    // (the name always whole; the note only if it fits whole under it)
    const { name, note } = splitLabel(label);
    const maxLines = mode === 'song' ? 2 : mode === 'cue' ? 3 : 4;
    const nameLines = cardLines(name, CW, maxLines);
    const noteAll = note ? cardLines(note, CW, 9) : [];
    const noteLines = noteAll.length <= Math.min(2, maxLines - nameLines.length) ? noteAll : [];
    let y = NOW_Y + 8;
    for (const l of nameLines) {
      g.text(l, CX, y, { color: C.ink });
      y += TITLE_LH;
    }
    for (const l of noteLines) {
      g.text(l, CX, y, { color: C.shadow });
      y += TITLE_LH;
    }
    y += 2;

    // the id (what the code calls it) in pencil capitals, and a short tag
    const idLine = (): void => {
      if (!id) return;
      const shown = f5Width(id) <= CW ? id : id.replace(/^(se|amb|bgm)_/, '');
      f5(ctx, shown, CX, y, C.sys);
      if (tag && f5Width(shown) + 6 + f5Width(tag) <= CW) f5(ctx, tag, CX + CW, y, C.shu, { align: 'right' });
      else if (tag) {
        y += 9;
        f5(ctx, tag, CX, y, C.shu);
      }
      y += 10;
    };
    const specTop = (h: number) => NOW_Y + NOW_H - 6 - h;
    const fits = (need: number) => y + need <= specTop(20) - 2;
    let specH = 20;
    switch (mode) {
      case 'cue': {
        const lines = Math.max(1, Math.min(4, Math.floor((specTop(8) - 2 - y) / 9)));
        if (!fits(lines * 9)) specH = 8;
        this.drawCueSteps(g, y, lines);
        break;
      }
      case 'voice':
        if (!fits(10 + 32)) specH = 8;
        idLine();
        this.drawTyping(g, y);
        break;
      case 'song':
        if (!fits(10 + 24)) specH = 8;
        idLine();
        this.drawBarMap(g, y + 1);
        break;
      case 'se':
      case 'amb':
        idLine();
        if (!fits(0)) specH = 8;
        break;
      case 'idle':
        f5(ctx, 'Z PLAY   X STOP', CX, y, C.dim);
        break;
    }
    this.drawSpectrum(g, specTop(specH), specH);
  }

  private drawBarMap(g: Gfx, y: number): void {
    const ctx = g.ctx;
    const p = currentPlayer();
    if (!p) return;
    const def = p.def;
    let loop = def.loop;
    let off = 0;
    // the boss lists hold both phases: show the one playing
    if ((def.id === 'bgm_boss' || def.id === 'bgm_boss_yobimodoshi') && loop.length === 48) {
      off = p.params.boss_phase >= 2 ? 24 : 0;
      loop = loop.slice(off, off + 24);
    }
    const bar = p.currentBar;
    const pos = p.position;
    const n = loop.length;
    if (!n) return;
    const cell = Math.max(3, Math.min(6, Math.floor(CW / n)));
    const x0 = CX;
    // colour by phrase: a new section letter (or every 8 bars of one) = next pencil
    const pencils = [C.water, C.green, C.tape, C.margin];
    const groups: string[] = [];
    const groupOf = (l: string) => {
      const m = /^([A-Za-z']+)(\d+)$/.exec(l);
      const key = m ? `${m[1]}${Math.floor((parseInt(m[2], 10) - 1) / 8)}` : l;
      if (!groups.includes(key)) groups.push(key);
      return groups.indexOf(key);
    };
    for (let i = 0; i < n; i++) {
      const on = !pos.intro && bar && pos.loopIndex - off === i;
      const x = x0 + i * cell;
      const col = pencils[groupOf(loop[i]) % pencils.length];
      g.rect(x, y, cell - 1, 6, on ? C.shu : col);
      if (on) g.rect(x, y - 1, cell - 1, 1, C.shuDark);
    }
    // bar on the left, the loop counter right-aligned in its own room
    if (bar) {
      const loopTxt = `LOOP ${p.loopCount + 1}`;
      let left = `${pos.intro ? 'INTRO ' : ''}BAR ${bar.label}`;
      if (f5Width(left) + 6 + f5Width(loopTxt) > CW) left = `${pos.intro ? 'IN ' : ''}BAR ${bar.label}`;
      f5(ctx, left, CX, y + 9, C.ink);
      f5(ctx, loopTxt, CX + CW, y + 9, C.ink, { align: 'right' });
    }
    const pr = p.params;
    const jg = currentJingle();
    const bpm = Math.round((jg ?? p).currentBar?.bpm ?? (jg ?? p).def.bpm);
    let parts = [pr.stage ? `STAGE ${pr.stage}` : '', def.battle ? `KIRE ${pr.kire}` : '', def.id === 'bgm_boss' ? `PH ${pr.boss_phase}` : ''].filter(Boolean).join(' ');
    // 第2章 (53 6): 星見台's stage and room, the boss's phase / light / name tags, Tetsuya's rest
    if (def.id === 'bgm_hoshi_night') parts = `H${pr.h_stage} ${ROOMS[pr.h_room] ?? ''}`;
    else if (def.id === 'bgm_hoshi_morning') parts = pr.h_stage >= 3 ? 'H3 MORNING' : `H${pr.h_stage} DAWN`;
    else if (def.id === 'bgm_boss_yobimodoshi') parts = `P${pr.boss_phase} L${pr.h_light} T${pr.tenko}`;
    else if (def.battle && pr.h_stage >= 0) parts = `NIGHT K${pr.kire}${def.id === 'bgm_midboss' ? ` R${pr.h_rest}` : ''}`;
    f5(ctx, `${bpm} BPM`, CX, y + 18, C.sys);
    if (parts) f5(ctx, parts, CX + CW, y + 18, C.shu, { align: 'right' });
  }

  private drawCueSteps(g: Gfx, y: number, maxLines = 4): void {
    const ctx = g.ctx;
    const r = currentCue();
    if (!r) return;
    const vis = r.steps.map((s, i) => ({ s, i })).filter(({ s }) => s.text);
    const firedN = vis.filter(({ i }) => r.fired[i]).length;
    // the step that just fired, then what comes next: each step's text
    // word-wraps at 14 columns, three lines in all
    const COLS = 14;
    const wrapCue = (text: string): string[] => {
      const out: string[] = [];
      let line = '';
      for (const w of text.split(' ')) {
        const next = line ? `${line} ${w}` : w;
        if (next.length <= COLS) line = next;
        else {
          if (line) out.push(line);
          line = w.length > COLS ? w.slice(0, COLS) : w;
        }
      }
      if (line) out.push(line);
      return out;
    };
    // four lines: the step that just fired is always shown whole (up to
    // three lines), then as much of what comes next as fits whole
    const MAX = maxLines;
    let k = 0;
    for (let v = Math.max(0, firedN - 1); v < vis.length && k < MAX; v++) {
      const { s, i } = vis[v];
      const done = r.fired[i];
      const lines = wrapCue(s.text).slice(0, Math.min(3, MAX));
      if (k > 0 && k + lines.length > MAX) break;
      lines.forEach((line, li) => {
        const yy = y + k * 9;
        if (li === 0) f5(ctx, (s.t < 10 ? s.t.toFixed(2) : s.t.toFixed(1)).padStart(4, ' '), CX, yy, done ? C.shu : C.dim);
        f5(ctx, line, CX + 30, yy, done ? C.ink : C.dim);
        k++;
      });
    }
  }

  private drawTyping(g: Gfx, y: number): void {
    const ty = this.typing;
    if (!ty) return;
    const text = ty.chars.slice(0, ty.shown).join('');
    const lines = wrap(ty.chars.join(''), CW);
    // which line is the typing on? show it and the one before
    let used = 0;
    const spans = lines.map((l) => {
      const a = used;
      used += [...l].length;
      return [a, used] as [number, number];
    });
    let cur = spans.findIndex(([, b]) => ty.shown <= b);
    if (cur < 0) cur = lines.length - 1;
    const first = Math.max(0, cur - 1);
    const chars = [...text];
    for (let k = 0; k < 2 && first + k < lines.length; k++) {
      const [a, b] = spans[first + k];
      g.text(chars.slice(a, b).join(''), CX, y - 3 + k * 16, { color: C.ink });
    }
  }

  private drawSpectrum(g: Gfx, y: number, h = 20): void {
    const n = this.bars.length;
    const bw = 5;
    const gap = 1;
    // pencil baseline
    for (let x = CX; x < CX + n * (bw + gap); x++) g.px(x, y + h, x % 5 === 0 ? C.shadow : C.ink);
    for (let i = 0; i < n; i++) {
      const v = Math.max(0, Math.min(1, this.bars[i]));
      const bh = Math.round(v * h);
      if (bh > 0) g.img(pencilBar(bh, SPEC_COLORS[Math.floor((i / n) * SPEC_COLORS.length)]), CX + i * (bw + gap), y + h - bh);
    }
    // level: a ruler with a hanko-red fill and a peak tick
    const lx = CX;
    const lw = n * (bw + gap) - 1;
    const ly = y + h + 3;
    const u = (db: number) => Math.max(0, Math.min(1, (db + 48) / 48));
    g.rect(lx, ly, Math.round(u(this.level) * lw), 2, C.shu);
    for (let k = 0; k <= 8; k++) g.px(lx + Math.round((k / 8) * lw), ly + 2, C.ink);
    g.px(lx + Math.round(u(this.peakHold) * lw), ly - 1, C.shuDark);
  }

  private drawKnobCard(g: Gfx): void {
    const ctx = g.ctx;
    this.drawCardFrame(g, KNOB_Y, KNOB_H, this.chapter === 2 ? 'つまみ（2章）' : 'つまみ');
    const step = knobStep(this.chapter);
    const y0 = KNOB_Y + (step < 9 ? 9 : 10);
    knobsOf(this.chapter).forEach((k, i) => {
      const y = y0 + i * step;
      const sel = this.focus === 'knobs' && this.knob === i;
      if (sel)
        g.alpha(0.75, () => {
          g.rect(CX - 2, y - 1, CW + 2, step, C.marker);
        });
      f5(ctx, k.name, CX + 5, y, C.ink);
      if (sel) f5(ctx, '→', CX - 3, y, C.shu);
      const v = k.get();
      const vx = CX + 46;
      if (k.values <= 4) {
        let x = vx;
        for (let j = 0; j < k.values; j++) {
          const on = j === v;
          const s = k.show(j);
          if (j) x += Math.max(17, k.show(j - 1).length * 6 + 9);
          if (on) {
            g.rect(x - 2, y - 1, 5 * s.length + s.length + 3, 9, C.shu);
            f5(ctx, s, x, y, C.paper);
          } else f5(ctx, s, x, y, C.dim);
        }
      } else if (k.style === 'arrows') {
        // the arrows stay put; the value is centred between them
        const inner = 6 * 7 + 3;
        f5(ctx, '←', vx, y, v > 0 ? C.shadow : C.dim);
        f5(ctx, k.show(v), vx + 7 + Math.round(inner / 2), y, C.ink, { align: 'center' });
        f5(ctx, '→', vx + 9 + inner, y, v < k.values - 1 ? C.shadow : C.dim);
      } else {
        // volume ruler
        const w = 50;
        for (let j = 0; j <= 10; j++) g.px(vx + j * 5, y + (j % 5 === 0 ? 5 : 6), C.ink);
        g.rect(vx, y + 7, w + 1, 1, C.ink);
        g.rect(vx, y + 2, Math.round((v / (k.values - 1)) * w), 3, C.shu);
        f5(ctx, k.show(v), vx + w + 6, y, C.ink);
      }
    });
  }

  private drawHints(g: Gfx): void {
    const hints: [string[], string][] = [
      [['↑', '↓'], 'えらぶ'],
      [['Z'], this.focus === 'knobs' ? 'もどる' : 'ならす'],
      [['X'], 'とめる'],
      [['←', '→'], this.focus === 'knobs' ? 'かえる' : 'ページ'],
      [['C'], 'つまみ'],
    ];
    let x = 9;
    const y = 199;
    for (const [keys, word] of hints) {
      for (const k of keys) {
        const img = keyArt(k);
        g.img(img, x, y + 3);
        x += img.width + 1;
      }
      x += 2;
      g.text(word, x, y, { color: C.paper, shadow: C.ink });
      x += textW(word) + 9;
    }
  }
}

if (import.meta.env.DEV) {
  registerScene('soundtest', () => new SoundTestScene());
  registerDebug('soundtest', (() => {
    game.replaceAll(new SoundTestScene());
  }) as never);
  // play one cue sheet from the console (the sound test's 演出 page, headless)
  registerDebug('cue', ((id: string) => {
    A.unlockAudio();
    const cue = CUES.find((c) => c.id === id);
    if (!cue) return CUES.map((c) => c.id);
    startCue(cue, (voice, text) => {
      [...text].forEach((ch, i) => setTimeout(() => A.textBlip(voice, ch), i * 25));
      return text.length / 40;
    });
    return cue.label;
  }) as never);
  // every list line must fit whole (no "…") and be told apart from the others
  const maxW = PX + PAGE_W - 22 - TEXT_X;
  for (const pg of PAGES) {
    const seen = new Set<string>();
    for (const r of rowsFor(pg.tab, pg.ch)) {
      if (r.kind !== 'item') continue;
      const n = rowName(r);
      if (textW(n) > maxW) console.warn(`[soundtest] label too wide: ${r.label}`);
      if (seen.has(n)) console.warn(`[soundtest] two rows read "${n}" in ${pg.tab} (${pg.ch}章)`);
      seen.add(n);
    }
  }
}
