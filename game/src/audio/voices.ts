// Dialog blips (40_audio 10). Each character has a waveform, a base note and
// a small scale; the pitch of every blip is chosen from the character code so
// a line always "sings" the same way. Kana vowels colour the tone with two
// band-passes (a hum, never words).

import { activeAmbients } from './ambience';
import { cur, dbToGain, hasGraph, midiHz, noteMidi, voice, type VoiceOpts, type Wave } from './engine';
import { currentId, duck, duckAmbience, musicParams } from './music';
import { sfxTable, type SfxOpts } from './registry';
import { setTextBlip } from './index';
import { trimOr1, voiceTrim } from './mix';
import { songTable } from './registry';
import { atTime } from './clock';

interface VoiceDef {
  label: string;
  wave: Wave | 'none';
  /** Second layer wave and its level. */
  wave2?: [Wave, number];
  base: string | number;
  scale: number[];
  /** Blip length (ms) and envelope. */
  len: number;
  A?: number;
  D?: number;
  S?: number;
  R?: number;
  every: number;
  v: number;
  formant?: boolean;
  child?: boolean;
  lp?: number;
  lpQ?: number;
  bp?: [number, number];
  vib?: [number, number];
  rev?: number;
  /** Each blip slides down (cents). */
  fall?: number;
  /** Each blip starts sharp and settles (cents, ms). */
  scoop?: [number, number];
  pa?: boolean;
  noise?: { bp: number; q: number; level: number };
  fixedSeq?: number[];
  /** Amplitude modulation on every blip: rate (Hz), depth, shape (an engine's grain). */
  am?: [number, number, OscillatorType?];
  /** Start every blip this many cents off and slide home (a rise at the attack). */
  scoopAll?: [number, number];
  /** 53 9.2: a page that starts with a name is called with the falling minor third (broadcast, yobimodoshi). */
  calls?: boolean;
}

export const VOICES: Record<string, VoiceDef> = {
  narr: { label: '地の文', wave: 'noise', base: 0, scale: [0], len: 12, A: 0, D: 10, S: 0, R: 4, every: 3, v: 0.012, bp: [3000, 1.5] },
  sys: { label: 'システム', wave: 'none', base: 0, scale: [0], len: 0, every: 99, v: 0 },
  mother: { label: '母', wave: 'triangle', base: 'A4', scale: [0, 2, 4, 7, 9], len: 40, A: 2, D: 30, S: 0.5, R: 15, every: 2, v: 0.07, formant: true },
  maruyama: { label: '丸山（肉屋）', wave: 'sine', base: 'D3', scale: [0, 3, 5, 7, 10], len: 45, every: 2, v: 0.09, lp: 1400 },
  obaa: { label: 'おばあ', wave: 'triangle', base: 'E4', scale: [0, 2, 5, 7], len: 50, every: 3, v: 0.06, formant: true, vib: [6, 25], noise: { bp: 2000, q: 1, level: 0.4 } },
  mamekichi: { label: 'まめ吉', wave: 'square', base: 'C5', scale: [0, 2, 4, 7, 9, 12], len: 22, every: 2, v: 0.05, formant: true },
  inui: { label: '乾', wave: 'triangle', base: 'G4', scale: [0, 2, 4], len: 55, A: 8, every: 3, v: 0.05, lp: 2000 },
  tsurumi: { label: '鶴見巡査', wave: 'square', base: 'A4', scale: [0, 5, 7, 12], len: 20, A: 0, D: 15, S: 0, R: 8, every: 2, v: 0.05 },
  sae: { label: 'サエ', wave: 'pulse25', base: 'D5', scale: [0, 2, 4, 7, 9], len: 26, every: 2, v: 0.05, formant: true, child: true },
  jk: { label: '女子高生', wave: 'triangle', wave2: ['square', 0.3], base: 'G4', scale: [0, 2, 4], len: 40, every: 3, v: 0.05, fall: -80 },
  chugaku: { label: '中学生', wave: 'square', base: 'A3', scale: [0, 3, 5, 7], len: 35, every: 2, v: 0.05, lp: 2400 },
  postman: { label: '郵便屋さん', wave: 'triangle', wave2: ['sine', 0.6], base: 'D4', scale: [0, 2, 4, 7, 9], len: 38, A: 5, every: 2, v: 0.06, lp: 1600 },
  madam: { label: '日傘の人', wave: 'triangle', base: 'C5', scale: [0, 4, 7, 9], len: 45, every: 3, v: 0.05, vib: [6, 35], rev: 0.2 },
  girl: { label: '女の子', wave: 'triangle', base: 'E5', scale: [0, 2, 4, 7, 9, 12], len: 28, every: 2, v: 0.05, formant: true, child: true },
  kid: { label: '男の子', wave: 'square', base: 'G5', scale: [0, 2, 4, 7], len: 20, every: 2, v: 0.045, formant: true, child: true },
  ojii: { label: 'おじいさん', wave: 'triangle', base: 'G3', scale: [0, 2, 5], len: 60, every: 3, v: 0.07, vib: [5, 20], formant: true },
  mizumaki: { label: '水まきの人', wave: 'pulse25', base: 'F4', scale: [0, 4, 7, 12], len: 30, every: 2, v: 0.05, scoop: [100, 20] },
  shadow: { label: '影の人', wave: 'square', base: 'A3', scale: [0, 2, 3, 7], len: 40, every: 2, v: 0.05, lp: 500, lpQ: 2, rev: 0.3 },
  hato: { label: 'ハト／ハト係長', wave: 'pulse12', base: 'E6', scale: [0, 2, 4], len: 14, every: 2, v: 0.035 },
  dog: { label: 'コタロウ', wave: 'square', base: 'A3', scale: [0, 0, 3], len: 30, every: 3, v: 0.05, lp: 900 },
  cat: { label: 'ネコ', wave: 'triangle', base: 'B5', scale: [0, 2], len: 12, every: 3, v: 0.03 },
  crow: { label: 'カラス', wave: 'sawtooth', base: 600, scale: [0], len: 40, every: 3, v: 0.04, bp: [1100, 3], noise: { bp: 1100, q: 3, level: 0.6 } },
  tv: { label: 'テレビ', wave: 'square', base: 'C5', scale: [0, 2, 4, 7], len: 24, every: 2, v: 0.04, bp: [1400, 2] },
  broadcast: { label: '防災無線', wave: 'sine', base: 'A4', scale: [0, 2, 4], len: 45, every: 2, v: 0.04, pa: true, noise: { bp: 1200, q: 4, level: 0.5 } },
  broadcast_child: { label: '放送の最後の1行', wave: 'triangle', base: 'A5', scale: [0, 2, 3, 7], len: 40, every: 3, v: 0.035, pa: true, formant: true, child: true },
  vending: { label: 'おじぎ自販機', wave: 'pulse12', base: 'A4', scale: [0], len: 60, every: 2, v: 0.04, formant: true, fixedSeq: [0, 0, -2, 0, 3, 0, -2, -2, -5, -5, -7] },
  omukaemachi: { label: 'オムカエマチ', wave: 'triangle', base: 'A5', scale: [0, 2, 3, 7], len: 40, every: 3, v: 0.035, formant: true, child: true, rev: 0.5 },
  flip: { label: 'カネナリくんのフリップ', wave: 'sawtooth', base: 2000, scale: [0, 1], len: 35, every: 3, v: 0.02, bp: [2400, 4], vib: [28, 60] },
  kanenari_voice: { label: 'カネナリくんの声', wave: 'triangle', wave2: ['sawtooth', 0.2], base: 'D3', scale: [0], len: 140, A: 20, R: 100, every: 1, v: 0.07, formant: true, rev: 0.35 },
  default: { label: '（指定なし）', wave: 'triangle', base: 'A4', scale: [0, 2, 4, 7, 9], len: 30, every: 2, v: 0.045, formant: true },
  // ---- chapter 2 (53_ch2_audio 9.1). The ids keep the first cast's names (50 3.2);
  // the five men of the village and さんかど never share base, wave, set and pace
  h_driver: { label: 'さんかど（郵便配達員）', wave: 'triangle', base: 'E4', scale: [0, 2, 4, 7], len: 34, A: 3, D: 20, S: 0.45, R: 10, every: 2, v: 0.055, lp: 2000, formant: true },
  h_kucho: { label: 'エー区長', wave: 'pulse25', base: 'G3', scale: [0, 2, 4, 5, 7], len: 42, every: 2, v: 0.06, lp: 2000, formant: true },
  h_yoshie: { label: 'エー夫人', wave: 'triangle', base: 'B4', scale: [0, 2, 4, 7], len: 28, every: 2, v: 0.055, formant: true },
  h_fumi: { label: 'まつ先生', wave: 'triangle', base: 'C4', scale: [0, 2, 4, 7, 9], len: 46, A: 4, every: 2, v: 0.055, vib: [5, 6], rev: 0.15, formant: true, noise: { bp: 2000, q: 1, level: 0.08 } },
  h_mitsu: { label: 'ペロリ', wave: 'triangle', base: 'A3', scale: [0, 3, 5, 7], len: 52, A: 6, every: 3, v: 0.06, lp: 1500, vib: [4, 8], formant: true, noise: { bp: 1200, q: 1, level: 0.12 } },
  h_gen: { label: 'マサルさん', wave: 'square', base: 'F3', scale: [0, 3, 5, 7], len: 26, A: 0, D: 20, S: 0, every: 3, v: 0.06, lp: 1600, formant: true },
  h_tome: { label: 'トマじい', wave: 'triangle', base: 'E3', scale: [0, 2, 5], len: 70, every: 3, v: 0.07, vib: [4.5, 18], formant: true },
  h_sawako: { label: 'ソワカさん', wave: 'triangle', base: 'E5', scale: [0, 2, 4, 7, 9, 12], len: 32, every: 2, v: 0.05, scoop: [80, 20], formant: true },
  h_train: { label: '運転士（車内放送）', wave: 'square', base: 'F4', scale: [0, 2, 4], len: 36, every: 2, v: 0.04, bp: [1300, 2], rev: 0.2 },
  h_tetsuya: { label: '耕うん機テツヤ', wave: 'pulse12', base: 'D4', scale: [0], len: 50, A: 1, every: 2, v: 0.045, fixedSeq: [0, 0, 2, 0], am: [15, 0.6, 'square'] },
  yobimodoshi: { label: 'ヨビモドシ', wave: 'sine', base: 'G4', scale: [0, 2, 3, 7], len: 50, every: 2, v: 0.045, pa: true, noise: { bp: 1200, q: 4, level: 0.5 }, calls: true },
  h_mujin: { label: 'ムジン販売員の札', wave: 'sawtooth', base: 1600, scale: [0, 1], len: 35, every: 3, v: 0.02, bp: [2000, 4], vib: [28, 60] },
  // ふくじんづけ (a papillon; the id is the first cast's dog): コタロウ's bark +5, a small dog's 「キャン」
  h_gon: { label: 'ふくじんづけ（パピヨン）', wave: 'square', base: 'D4', scale: [0, 0, 5], len: 22, every: 3, v: 0.045, lp: 1600 },
  // ツガオ (53 9.1; chapter 3 hears them again): the calm, heavy boss of まだまだ団 — and, the
  // same voice, the village's ツガオさん of ツガオ便 (the room adds its reverb .25: roomRev)
  tsugao: { label: 'ツガオ（ツガオ便／まだまだ団の団長）', wave: 'sawtooth', base: 'D3', scale: [0, 1, 5, 7], len: 50, A: 6, every: 3, v: 0.05, lp: 900, vib: [3, 5], formant: true },
  dakoku: { label: 'ダコク（タイムレコーダー）', wave: 'pulse12', base: 'C5', scale: [0], len: 25, every: 2, v: 0.035, fixedSeq: [0, 0, 7, 0] },
  // ツガオ便's two (53 9.1, 9.2): ヒロスケさん, 44, sociable, talks a lot and laughs (a beard in the way);
  // ポコシャさん, 40, a big man with a small shy voice; ぴーちゃん, a hen (no blips: one call a page)
  hirosuke: { label: 'ヒロスケさん（ツガオ便）', wave: 'triangle', base: 'B3', scale: [0, 2, 4, 7], len: 30, A: 2, every: 2, v: 0.06, lp: 2000, vib: [5, 8], formant: true, noise: { bp: 900, q: 1, level: 0.03 } },
  pokosha: { label: 'ポコシャさん（ツガオ便）', wave: 'sine', wave2: ['triangle', 0.25], base: 'D4', scale: [0, 2, 3], len: 32, A: 8, every: 3, v: 0.035, lp: 1400, formant: true },
  piichan: { label: 'ぴーちゃん（めんどり）', wave: 'none', base: 0, scale: [0], len: 0, every: 99, v: 0 },
  // the branch school's broadcast room: its own small speaker, not the hill's (ふしぎ10, 53 8.9)
  broadcast_room: { label: '放送室のスピーカー', wave: 'sine', base: 'A4', scale: [0, 2, 4], len: 45, every: 2, v: 0.04, lp: 800, noise: { bp: 900, q: 3, level: 0.4 }, rev: 0.15 },
};
// 星見台 calls the names on the same speaker as the town's broadcast (53 9.2)
VOICES.broadcast.calls = true;

const ALIAS: Record<string, string> = {
  mom: 'mother', haha: 'mother', kanenari: 'flip', old: 'obaa', narration: 'narr', narrator: 'narr', system: 'sys',
  sand_girl: 'girl', gacha_boy: 'kid', shadow_man: 'shadow', kotaro: 'dog', minato: 'none', omu: 'omukaemachi',
  // chapter 2: @npc_hoshi_* speak with their h_* voice (53 9.1)
  hoshi_mitsu: 'h_mitsu', hoshi_gen: 'h_gen', hoshi_fumi: 'h_fumi', hoshi_kucho: 'h_kucho', hoshi_yoshie: 'h_yoshie',
  hoshi_tome: 'h_tome', hoshi_sawako: 'h_sawako', hoshi_busdriver: 'h_driver', hoshi_driver: 'h_driver',
  hoshi_traindriver: 'h_train', hoshi_gon: 'h_gon', hoshi_speaker: 'broadcast', hoshi_mujin: 'h_mujin',
  tetsuya: 'h_tetsuya', boss_yobimodoshi: 'yobimodoshi', mujin: 'h_mujin', gon: 'h_gon',
};

// ---------------------------------------------------------------------------
// text helpers

const SILENT = new Set([...' 　、。，．,.…‥―ー－-「」『』（）()！？!?・〜~ゃゅょっぁぃぅぇぉゎァィゥェォャュョッヮ♪★☆◆◇■□○●“”"\'：:；;／/＿_']);

const VOWEL_OF: Record<string, string> = {};
{
  const rows: [string, string][] = [
    ['a', 'あかさたなはまやらわがざだばぱアカサタナハマヤラワガザダバパ'],
    ['i', 'いきしちにひみりぎじぢびぴイキシチニヒミリギジヂビピ'],
    ['u', 'うくすつぬふむゆるぐずづぶぷウクスツヌフムユルグズヅブプヴ'],
    ['e', 'えけせてねへめれげぜでべぺエケセテネヘメレゲゼデベペ'],
    ['o', 'おこそとのほもよろをごぞどぼぽオコソトノホモヨロヲゴゾドボポ'],
    ['n', 'んン'],
  ];
  for (const [v, chars] of rows) for (const ch of chars) VOWEL_OF[ch] = v;
}
const FORMANT: Record<string, [number, number]> = { a: [800, 1250], i: [300, 2300], u: [330, 1400], e: [480, 1900], o: [500, 850] };

function vowelOf(ch: string): string {
  const v = VOWEL_OF[ch];
  if (v) return v;
  const code = ch.codePointAt(0) ?? 0;
  return 'aiueo'[code % 5];
}

function hashCh(ch: string): number {
  let h = ch.codePointAt(0) ?? 0;
  h = Math.imul(h ^ (h >>> 7), 0x5bd1e995);
  h ^= h >>> 13;
  return h >>> 0;
}

// ---------------------------------------------------------------------------

interface State {
  last: number;
  lastSemi: number;
  repeat: number;
  seqI: number;
  lastMidi: number;
  lastT: number;
  /** The last three pitches (semitones from the base), for the sealed-answer guard. */
  hist: number[];
  /** The next voiced character opens a line (a pause, or after 。). */
  lineStart?: boolean;
  /** This line calls a name (53 9.2): blips counted from its start. */
  nameLine?: boolean;
  nameI?: number;
  /** The last character given, voiced or not (ちゃん / くん / さん). */
  prevCh?: string;
  /** マサルさん's tsukkomi page (53 9.2). */
  tsukkomi?: boolean;
  /** How far into まつ先生's 「おはだっちょ」 the page is (0 = not). */
  oha?: number;
  /** ふくじんづけ is asleep for the rest of the page (「……ぷすー。」). */
  asleep?: boolean;
  /** ツガオ's 「つがおちゃん 寝る〜♪」 page: an octave up, bright and bouncing. */
  chan?: boolean;
  /** ダコクの「ガチャン」: the rest of the word is the machine, not a blip. */
  gachan?: number;
  /** The last character of any kind (voiced or not): a page starts after 0.8 s of none. */
  lastAny?: number;
  /** The page opened with 「……」 (ポコシャさん hesitates before his first word). */
  headDots?: boolean;
  /** No voiced character of this page has sounded yet. */
  firstVoiced?: boolean;
  /** The next voiced character opens a line (a page, or after 。！？…). */
  lineHead?: boolean;
  /** ツガオ in the village: the first page after a long sleep (one eye open). */
  wake?: boolean;
  /** ヒロスケさん: 1 after the ど of 「ども」. */
  domo?: number;
  /** ヒロスケさん laughing (「わはは」「はっはっは」): the next step of 0 +4 +7, 0 = not. */
  laugh?: number;
  /** ヒロスケさん's 「焼き芋 食うか？」 line. */
  imo?: boolean;
  /** ポコシャさん's 「さすが 師匠」: how far into it (0 = not), and how it comes out. */
  sasuga?: number;
  sasugaForm?: 'loud' | 'quiet';
  /** ポコシャさん after blurting it out: 1 = the next page is small, 2 = this page is. */
  shy?: number;
  /** ポコシャさん stammered 「こ、こ」: the character that repeats (it always sounds). */
  stam?: string;
  /** ポコシャさん's hesitation: no blip of his sounds before this (ctx time). */
  quietUntil?: number;
  /** ぴーちゃん's one call of the page, decided by its letters (53 9.1). */
  hen?: Hen;
}

interface Hen {
  kind: 'koko' | 'koke' | 'kuu' | null;
  first: string;
  q: boolean;
  said: boolean;
  t: number;
}
const st: Record<string, State> = {};
let kanenariSeq = 0;
/** Which of Kanenari's two words is being said (the character after お decides: 53 9.3). */
let kanenariWord: 'oishii' | 'ohayou' = 'oishii';
let paSwellCheck: { t: number } | null = null;

/** QA: forget the per-voice spacing state (offline renders start at t = 0). */
export function resetVoiceState(): void {
  // (an offline render ends here: a character still held is said)
  flushHeld();
  for (const k of Object.keys(st)) delete st[k];
  kanenariSeq = 0;
  kanenariWord = 'oishii';
}

export function resolveVoice(voiceId: string): string {
  return resolve(voiceId);
}

function resolve(id: string): string {
  let v = id.startsWith('npc_') ? id.slice(4) : id;
  v = ALIAS[v] ?? v;
  return v;
}

function isBattle(): boolean {
  const id = currentId();
  return !!id && !!songTable.get(id)?.battle;
}

/**
 * A character held back until the next one decides how it sounds (53 9.2:
 * エー区長's 「えー」, ペロリ's 「なぁ」). It is let go 60 ms later at most.
 */
type HoldKind = 'ee' | 'naa' | 'tsu' | 'ga' | 'wa' | 'ha' | 'ka' | 'word';
type BlipMode = 'plain' | 'ee' | 'naa' | 'chan' | 'gachan' | 'laugh' | 'imo' | 'stam' | 'sasuga';
let held: { id: string; ch: string; t: number; kind: HoldKind; allowed: boolean } | null = null;

/** What the character after a held one makes of it (null: it is said as it is). */
function heldBecomes(kind: HoldKind, heldCh: string, next: string): BlipMode | null {
  switch (kind) {
    case 'ee':
      return next === 'ー' ? 'ee' : null;
    case 'naa':
      return next === 'ぁ' ? 'naa' : null;
    case 'tsu':
      return next === 'が' ? 'chan' : null;
    case 'ga':
      return next === 'チ' ? 'gachan' : null;
    // ヒロスケさん's 「わはは」 / 「はっはっは」
    case 'wa':
      return next === 'は' ? 'laugh' : null;
    case 'ha':
      return next === 'っ' ? 'laugh' : null;
    // 「……焼き芋 食うか？」: the last か bounces up
    case 'ka':
      return next === '？' || next === '?' ? 'imo' : null;
    // ポコシャさん: a word's first letter — 「こ、こんばんは」 or 「さすが 師匠」
    case 'word':
      return next === '、' ? 'stam' : heldCh === 'さ' && next === 'す' ? 'sasuga' : null;
  }
}

/** One dialog character. `at` (ctx time) is only for offline renders (QA). */
export function blip(voiceId: string, ch: string, at?: number): void {
  if (!hasGraph()) return;
  const id = resolve(voiceId);
  if (id === 'none' || id === 'sys') return;
  const now = at ?? cur().ctx.currentTime;
  if (held) {
    const h = held;
    held = null;
    const becomes = h.id === id ? heldBecomes(h.kind, h.ch, ch) : null;
    if (becomes) blipAt(h.id, h.ch, h.t, becomes);
    else if (h.allowed) blipAt(h.id, h.ch, h.t, 'plain');
  }
  blipAt(id, ch, now);
}

/** Let a held character go (the line ended on it), and a hen's call still waiting. */
function flushHeld(): void {
  if (held) {
    const h = held;
    held = null;
    if (h.allowed) blipAt(h.id, h.ch, h.t, 'plain');
  }
  const hen = st.piichan?.hen;
  if (hen && !hen.said) sayHen(hen, hen.t + 0.12);
}

/**
 * ツガオの部屋 (cut 7): its reverb for ツガオ, the whisper behind the frosted
 * door for ポコシャさん and ぴーちゃん (53 9.1, 9.2). In the village the same
 * voices are dry — the place's own space (yama) is their room.
 */
function inTsugaoRoom(): boolean {
  return currentId() === 'bgm_tsugao' || activeAmbients().includes('amb_tsugao_room');
}

const LINE_END = '。！？!?\n';
/** Characters after which a word begins (ポコシャさん's stammer and 「さすが」). */
const WORD_EDGE = '…‥、。！？!? 　\n';

/**
 * ぴーちゃん (53 9.1, 9.2): no blips — one call at the head of the page, the
 * one its letters say (「ココッ」「コケッ」「クゥ」); a 「？」 lifts its last sound
 * +3. Heard when the line tells which (at its 。？！, or 0.15 s in).
 */
function henChar(s: State, ch: string, now: number, pageStart: boolean): void {
  if (pageStart || !s.hen) {
    if (s.hen && !s.hen.said) sayHen(s.hen, now);
    s.hen = { kind: null, first: '', q: false, said: false, t: now };
  }
  const h = s.hen;
  if (h.said) return;
  if (ch === 'ク' || ch === 'く') h.kind = 'kuu';
  else if (ch === 'コ' || ch === 'こ') {
    if (h.first) h.kind ??= 'koko';
    h.first = 'コ';
  } else if ((ch === 'ケ' || ch === 'け') && h.first) h.kind = 'koke';
  if (ch === '？' || ch === '?') h.q = true;
  if (LINE_END.includes(ch)) {
    sayHen(h, now);
    return;
  }
  if (!cur().offline && (h.first || h.kind)) {
    atTime(now + 0.15, () => {
      if (!h.said) sayHen(h, Math.max(now + 0.15, cur().ctx.currentTime));
    });
  }
}
function sayHen(h: Hen, at: number): void {
  if (h.said) return;
  h.said = true;
  const kind = h.kind ?? (h.first ? 'koko' : null);
  if (!kind) return;
  const g = cur();
  const room = inTsugaoRoom();
  const o: SfxOpts & { dest: AudioNode; rev: number } = { at, vol: room ? 0.6 : 1, note: h.q ? 'q' : undefined, dest: g.voiceBus, rev: room ? 0.3 : 0.08 };
  sfxTable.get(`se_piichan_${kind}`)?.(o);
  if (!g.offline && !isBattle()) duck(dbToGain(-2), 0.15, 0.35, 0.4);
}

function blipAt(id: string, ch: string, now: number, mode?: BlipMode): void {
  const def = VOICES[id] ?? VOICES.default;
  const g = cur();
  const s = (st[id] ??= { last: -1, lastSemi: 99, repeat: 0, seqI: 0, lastMidi: 60, lastT: 0, hist: [], lineStart: true });
  const prevCh = s.prevCh;
  s.prevCh = ch;
  // a page, counting every character (the dots too): 0.8 s of nothing before it
  const pageStart = mode === undefined && (s.lastAny === undefined || now - s.lastAny > 0.8);
  if (mode === undefined) s.lastAny = now;
  if (pageStart) {
    s.headDots = ch === '…' || ch === '‥';
    s.firstVoiced = true;
    s.lineHead = true;
    s.laugh = 0;
    s.imo = false;
    s.sasuga = 0;
    s.stam = undefined;
    s.quietUntil = undefined;
    // ポコシャさん: the page after his outburst is small; the one after that, his usual
    s.shy = s.shy === 1 ? 2 : 0;
  }
  if (id === 'piichan') {
    henChar(s, ch, now, pageStart);
    return;
  }
  // a page: the first character after a pause (0.8 s, 53 9.2)
  const pageHead = now - s.lastT > 0.8 || s.lastT === 0;
  if (pageHead && mode === undefined) {
    s.tsukkomi = false;
    s.oha = 0;
    s.asleep = false;
    s.chan = false;
    s.domo = 0;
    // ツガオさん in the village wakes for his first page after a long sleep (53 9.2)
    if (id === 'tsugao') s.wake = (s.lastT === 0 || now - s.lastT > 20) && !inTsugaoRoom();
  }
  if (mode === 'chan') s.chan = true;
  // ダコクの「ガチャン」: the machine punches the card where the word stands (53 9.2)
  if (mode === 'gachan') {
    s.gachan = 2;
    s.lastT = now;
    sfxTable.get('se_dakoku')?.({ at: now });
    return;
  }
  if (id === 'dakoku' && s.gachan && (ch === 'チ' || ch === 'ャ' || ch === 'ン')) {
    if (ch === 'ン') s.gachan = 0;
    return;
  }
  // a name line (53 9.2) ends with its sentence; a pause opens a new line.
  // Only 星見台's speaker calls names (夕鳴町's broadcast is chapter 1's, unchanged)
  const calls = !!def.calls && (id === 'yobimodoshi' || g.pa.mode === 'yama');
  if (calls) {
    if (now - s.lastT > 0.6) s.lineStart = true;
    if (ch === '。' || ch === '」' || ch === '？' || ch === '?' || ch === '\n') {
      s.lineStart = true;
      s.nameLine = false;
    }
    // 「……」 at the head of a line: a name is being called
    if (s.lineStart && (ch === '…' || ch === '‥')) {
      s.lineStart = false;
      s.nameLine = true;
      s.nameI = 0;
    }
  }
  // ふくじんづけ asleep, 「……ぷすー。」: no blips, one breath through the nose
  if (id === 'h_gon') {
    if (ch === '。') s.asleep = false;
    else if (s.asleep) return;
    else if (ch === 'ぷ') {
      s.asleep = true;
      s.lastT = now;
      voice({ at: now + 0.005, dest: g.voiceBus, wave: 'noise', dur: 0.09, attack: 0.015, decay: 0.05, sustain: 0.5, release: 0.04, vol: 0.006 * trimOr1(voiceTrim(id)), filter: { type: 'bandpass', freq: 1200, q: 1.4 } });
      return;
    }
  }

  // lines and words for ツガオ便's two (53 9.2): a laugh, a 「焼き芋」 line and
  // 「さすが 師匠」 end with their sentence
  let blurted = false;
  if (mode === undefined && (id === 'hirosuke' || id === 'pokosha')) {
    if (LINE_END.includes(ch) || ch === '…' || ch === '‥') s.lineHead = true;
    if (ch !== 'は' && ch !== 'っ' && ch !== 'ッ') s.laugh = 0;
    if (LINE_END.includes(ch)) s.imo = false;
    if (LINE_END.includes(ch) || ch === '、') {
      blurted = !!s.sasuga && s.sasugaForm === 'loud';
      // 「さすが 師匠！」 out loud: the next page comes out small (照れて)
      if (blurted && (ch === '！' || ch === '!')) s.shy = 1;
      s.sasuga = 0;
    }
  }
  // sentence endings: a little rise for "？", a push for "！"
  if (ch === '？' || ch === '?' || ch === '！' || ch === '!') {
    if (now - s.lastT < 0.5 && def.wave !== 'none' && id !== 'narr') {
      const q = ch === '？' || ch === '?';
      play(def, id, s.lastMidi, now + 0.01, q ? 5 : 2, q ? 1 : 1.2 * (s.tsukkomi ? 1.25 : 1) * (blurted ? 1.8 : 1), 'a', true, roomRev(id));
    }
    return;
  }
  if (ch === '。' && id === 'chugaku' && now - s.lastT < 0.5) {
    // 語尾にリバーブ: the last blip rings once more, wet
    play(def, id, s.lastMidi, now + 0.01, 0, 0.6, 'a', false, 0.6);
    return;
  }
  if (SILENT.has(ch) || !ch.trim()) return;
  // 53 9.2: a line that starts with a name (after the "……", or a katakana
  // name when the caller leaves the dots out) is called, not said: the first
  // blip on the voice's note, then 0 / −3 in turn (the falling minor third of
  // 「オ・ピ・ピー」); the last ん of ちゃん / くん / さん always sounds, low and
  // long. The sealed answer cannot come out of it.
  if (calls && s.lineStart) {
    s.lineStart = false;
    s.nameLine = isKatakana(ch);
    s.nameI = 0;
  }
  const honorific = !!s.nameLine && ch === 'ん' && !!prevCh && 'ゃくさ'.includes(prevCh);
  // マサルさん's tsukkomi (53 9.2): a page that opens with 「誰が」 comes out fast and loud
  if (id === 'h_gen' && pageHead && ch === '誰') s.tsukkomi = true;
  // まつ先生's 「おはだっちょ」: the four blips climb the major arpeggio 0 +4 +7 +12
  let oha = -1;
  if (id === 'h_fumi') {
    const step = s.oha ?? 0;
    if (pageHead && ch === 'お') oha = 0;
    else if (step > 0 && ch === 'はだち'[step - 1]) oha = step;
    s.oha = oha >= 0 && oha < 3 ? oha + 1 : 0;
  }
  // ヒロスケさん (53 9.2): 「ども」 opens bright (+4 +7); a 「焼き芋」 line bounces at its end
  let forced = false;
  let domo = -1;
  if (id === 'hirosuke') {
    if (pageHead && mode === undefined && ch === 'ど') domo = 0;
    else if (s.domo === 1 && ch === 'も') domo = 1;
    s.domo = domo === 0 ? 1 : 0;
    if (s.lineHead && mode === undefined) s.imo = ch === '焼';
  }
  // ポコシャさん (53 9.2): 「さすが 師匠」 — out loud (a page's first word, or said
  // after a pause in the middle of one), murmured (a page that opens 「……」),
  // whispered behind the door in ツガオの部屋
  if (id === 'pokosha') {
    if (mode === 'sasuga') {
      s.sasuga = 1;
      s.sasugaForm = !inTsugaoRoom() && !(s.firstVoiced && s.headDots) ? 'loud' : 'quiet';
    } else if (s.sasuga && mode === undefined) s.sasuga++;
    if (s.stam === ch && mode === undefined) forced = true;
  }
  const loud = id === 'pokosha' && !!s.sasuga && s.sasugaForm === 'loud';
  if (loud || domo >= 0 || mode === 'laugh' || mode === 'imo' || mode === 'stam' || (id === 'hirosuke' && s.laugh)) forced = true;
  const lineHead = !!s.lineHead;
  s.lineHead = false;
  // spacing: the voice's interval in characters at 40 chars/s (ツガオさん waking: 4)
  const every = s.tsukkomi || s.chan || loud ? 1 : s.wake ? 4 : def.every;
  const minGap = every * 0.025 * 0.9;
  const allowed = now - s.last >= minGap;
  // エー区長's 「えー」 and ペロリ's 「なぁ」: the next character decides
  // (and ツガオ's 「つがおちゃん」, ダコク's 「ガチャン」, ヒロスケさん's laugh and
  // 「……か？」, ポコシャさん's first letters: a stammer or 「さすが」)
  const holdKind: HoldKind | null =
    id === 'h_kucho' && pageHead && ch === 'え'
      ? 'ee'
      : id === 'h_mitsu' && ch === 'な'
        ? 'naa'
        : id === 'tsugao' && !s.chan && ch === 'つ'
          ? 'tsu'
          : id === 'dakoku' && ch === 'ガ'
            ? 'ga'
            : id === 'hirosuke' && !s.laugh && ch === 'わ'
              ? 'wa'
              : id === 'hirosuke' && !s.laugh && ch === 'は'
                ? 'ha'
                : id === 'hirosuke' && s.imo && ch === 'か'
                  ? 'ka'
                  : id === 'pokosha' && !s.sasuga && !forced && (lineHead || prevCh === undefined || WORD_EDGE.includes(prevCh))
                    ? 'word'
                    : null;
  if (mode === undefined && holdKind) {
    held = { id, ch, t: now, kind: holdKind, allowed };
    s.prevCh = prevCh;
    if (!g.offline) {
      const mine = held;
      atTime(now + 0.06, () => {
        if (held === mine) flushHeld();
      });
    }
    return;
  }
  if (!allowed && !honorific && !forced && oha < 0 && mode !== 'ee' && mode !== 'naa' && mode !== 'chan') return;
  // a new page of the flip (and the sign's cardboard): the whole marker squeak
  if ((id === 'flip' || id === 'h_mujin') && now - s.last > 0.8) {
    s.last = now;
    s.lastT = now;
    sfxTable.get('se_flip')?.({ vol: 0.9, at: now, pitch: id === 'h_mujin' ? 1.2 : 1 });
    return;
  }
  s.last = now;
  if (s.stam === ch && mode === undefined) s.stam = undefined;
  // ポコシャさん hesitates (53 9.2): a page that opens 「……」 or with a stammer
  // waits 150 ms before its first blip; the words after it keep their spacing
  // and come out that much later, in order (quietUntil below) — a murmured
  // 「……さすが 師匠。」 is late, not swallowed
  let delay = 0;
  if (id === 'pokosha' && s.firstVoiced && (s.headDots || mode === 'stam')) delay = 0.15;
  const headOfPage = !!s.firstVoiced;
  s.firstVoiced = false;

  let semi: number;
  let volK = s.tsukkomi ? 1.25 : 1;
  let longMs = 0;
  let glide = 0;
  let lpOverride: number | undefined;
  if (s.wake && id === 'tsugao' && !s.chan) volK *= 0.85;
  if (id === 'pokosha') {
    if (inTsugaoRoom()) {
      // 「……さすが 師匠。」 from the dark behind the frosted door
      volK *= 0.5;
      lpOverride = 1200;
    } else if (s.sasuga && s.sasugaForm === 'quiet') {
      volK *= 0.6;
      lpOverride = 1000;
    } else if (loud) volK *= 1.8;
    if (s.shy === 2) volK *= 0.8;
    if (mode === 'stam') {
      volK *= 0.7;
      s.stam = ch;
    }
  }
  if (loud) {
    // さ す が 師 匠: 0 +4 +7 +9 (+9 held): the admiring voice rises
    const i = (s.sasuga ?? 1) - 1;
    semi = [0, 4, 7, 9, 9][Math.min(4, i)];
    if (i >= 4) longMs = 110;
  } else if (domo >= 0) {
    semi = domo === 0 ? 4 : 7;
  } else if (mode === 'laugh' || (id === 'hirosuke' && s.laugh)) {
    // 「わはは」: short blips on 0 +4 +7 over and over (a laugh, not words)
    const k = mode === 'laugh' ? 0 : s.laugh ?? 0;
    semi = [0, 4, 7][k % 3];
    s.laugh = k + 1;
    longMs = 50;
  } else if (mode === 'imo') {
    // 「……焼き芋 食うか？」: the か jumps +5 and holds 140 ms (the ？ still lifts it)
    semi = 5;
    longMs = 140;
  } else if (mode === 'ee') {
    // 「えー」: one long blip, sinking 30 cents
    semi = def.scale[0];
    longMs = 280;
    glide = -0.3;
  } else if (mode === 'naa') {
    // 「なぁ」: the な stretches to 160 ms and sighs down two semitones over 200 ms
    semi = def.scale[hashCh(ch) % def.scale.length];
    longMs = 160;
    glide = -2;
  } else if (oha >= 0) {
    semi = [0, 4, 7, 12][oha];
    if (oha === 3) longMs = 120;
    if (currentId() === 'bgm_hoshi_morning') volK = 0.9;
  } else if (s.nameLine) {
    const i = s.nameI ?? 0;
    s.nameI = i + 1;
    semi = honorific ? -3 : i === 0 ? 0 : i % 2 === 1 ? 0 : -3;
    if (honorific) longMs = 120;
  } else if (def.fixedSeq) {
    semi = def.fixedSeq[s.seqI++ % def.fixedSeq.length];
  } else if (id === 'kanenari_voice') {
    // the character after お tells the two words apart (53 9.3):
    // "……おいしい。": お 0, い +3, し +3, い −2 (long, falling)
    // "……おはよう。": お 0, は +5, よ +5 (a little softer), う +5 → +3 (long:
    // it settles on F, the morning song's tonic)
    if (ch === 'お') kanenariWord = 'oishii';
    else if (kanenariSeq === 1) kanenariWord = ch === 'は' ? 'ohayou' : 'oishii';
    if (kanenariWord === 'ohayou') {
      semi = ch === 'お' ? 0 : 5;
      if (ch === 'よ') volK = 0.85;
      if (ch === 'う') longMs = 320;
    } else {
      const map: Record<string, number> = { お: 0, い: kanenariSeq >= 2 ? -2 : 3, し: 3 };
      semi = map[ch] ?? 0;
      if (ch === 'い' && kanenariSeq >= 3) longMs = 300;
    }
    if (longMs) glide = -2;
    kanenariSeq = ch === 'お' ? 1 : kanenariSeq + 1;
  } else {
    // マサルさん's tsukkomi uses only the top two notes of his set (5 7)
    const scale = s.tsukkomi ? def.scale.slice(-2) : def.scale;
    semi = scale[hashCh(ch) % scale.length];
    if (semi === s.lastSemi) {
      s.repeat++;
      if (s.repeat >= 2) {
        semi = scale[(scale.indexOf(semi) + 1) % scale.length];
        s.repeat = 0;
      }
    } else s.repeat = 0;
    // the chime's sealed answer (−2, −3, +3 in any key, 1.3) must not slip out
    // of a chatty line either: step aside to the next note of the voice's set
    const h = s.hist;
    if (h.length >= 3 && h[1] - h[0] === -2 && h[2] - h[1] === -3 && semi - h[2] === 3) {
      const i = scale.indexOf(semi);
      semi = scale[(i + 1) % scale.length];
      if (semi - h[2] === 3) semi = scale[(i + 2) % scale.length];
    }
  }
  s.hist.push(semi);
  if (s.hist.length > 3) s.hist.shift();
  s.lastSemi = semi;
  const baseMidi = typeof def.base === 'number' ? 69 + 12 * Math.log2(def.base / 440) : noteMidi(def.base);
  const midi = baseMidi + semi + (s.chan ? 12 : 0);
  s.lastMidi = midi;
  s.lastT = now;
  if (s.chan) {
    // 「つがおちゃん 寝る〜♪」: an octave up, a triangle, a little bounce at every
    // blip — and 「る」 turns 0 → +5 → 0 over 240 ms. The drop from the calm low
    // voice is the joke (53 9.2)
    const bright: VoiceDef = { ...def, wave: 'triangle', lp: 2600, scoop: [80, 20], vib: undefined };
    if (ch === 'る') [0, 5, 0].forEach((k, i) => play(bright, id, midi + k, now + 0.005 + i * 0.08, 0, volK, 'u', false, roomRev(id), 90));
    else play(bright, id, midi, now + 0.005, 0, volK, vowelOf(ch), false, roomRev(id));
  } else {
    let d = def;
    // ヒロスケさん's pages open with a bounce (+60 cents → 0 in 15 ms)
    if (id === 'hirosuke' && headOfPage) d = { ...d, scoop: [60, 15] };
    if (lpOverride) d = { ...d, lp: lpOverride };
    let at = now + 0.005 + delay;
    if (id === 'pokosha') {
      // after his hesitation the words keep their order (a stammer right behind it waits too)
      if (!delay && s.quietUntil !== undefined && at < s.quietUntil) at = s.quietUntil;
      s.quietUntil = delay || at === s.quietUntil ? at + 0.05 : s.quietUntil;
    }
    play(d, id, midi, at, 0, volK, mode === 'ee' ? 'e' : vowelOf(ch), false, roomRev(id), longMs, glide);
  }
  if (id === 'yobimodoshi') openLineHum(now);
  if (g.offline) return;
  if (id === 'kanenari_voice') {
    // the night song leans back (−4 dB) under the four hums
    duck(dbToGain(-4), 0.15, 0.6, 0.6);
  } else if (def.pa && g.pa.mode === 'yama') {
    // 星見台 (53 10.3): the calls come from far up the valley (−4 / −2 dB);
    // close under the horns (the hill, the boss) they take more room (−6 / −4)
    const d = g.pa.distance;
    const near = (d.override ?? d.d) < 0.3 && !d.indoor;
    if (near) {
      duck(dbToGain(-6), 0.3, 0.5, 0.8);
      duckAmbience(dbToGain(-4), 0.3, 0.5, 0.8);
    } else {
      duck(dbToGain(-4), 0.2, 0.5, 0.6);
      duckAmbience(dbToGain(-2), 0.2, 0.5, 0.6);
    }
  } else if (def.pa) {
    duck(dbToGain(-9), 0.3, 0.5, 0.8);
    duckAmbience(dbToGain(-6), 0.3, 0.5, 0.8);
    if (id === 'broadcast_child') schedulePaSwell();
  } else if (!isBattle() && id !== 'narr') {
    // field dialog: music −2 dB while text is running (11.3)
    duck(dbToGain(-2), 0.15, 0.35, 0.4);
  }
}

/** The reverb ツガオの部屋 gives a voice (53 9.1, 9.2); undefined = the voice's own. */
function roomRev(id: string): number | undefined {
  if (id !== 'tsugao' && id !== 'pokosha') return undefined;
  return inTsugaoRoom() ? (id === 'tsugao' ? 0.25 : 0.3) : undefined;
}

/** After the last line of the broadcast, the PA echo answers three times (13.2). */
function schedulePaSwell(): void {
  const g = cur();
  const t = g.ctx.currentTime;
  paSwellCheck = { t };
  atTime(t + 0.45, () => {
    if (!paSwellCheck || paSwellCheck.t !== t) return;
    paSwellCheck = null;
    g.pa.swell(0.6, 2.0);
  });
}

/** Katakana (a name called on the speaker: シュンスケ, アスカ…). */
function isKatakana(ch: string): boolean {
  return (ch >= 'ァ' && ch <= 'ヺ') || ch === 'ヴ';
}

/**
 * ヨビモドシ's open line (53 9.2): a low hum (55 + 110 Hz, and the buzz of
 * its harmonics that a small speaker carries) runs into the PA while it
 * speaks, and fades 0.6 s after the last blip, over 0.4 s.
 */
const hums = new WeakMap<BaseAudioContext, { oscs: OscillatorNode[]; gain: GainNode; until: number }>();
function openLineHum(t: number): void {
  const g = cur();
  const c = g.ctx;
  let h = hums.get(c);
  if (!h || h.until < t + 0.02) {
    const gain = c.createGain();
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 0.12);
    const oscs: OscillatorNode[] = [];
    for (const [f, v, type] of [
      [55, 0.006, 'sine'],
      [110, 0.006, 'sine'],
      [110, 0.0022, 'sawtooth'],
    ] as [number, number, OscillatorType][]) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const k = c.createGain();
      k.gain.value = v * trimOr1(voiceTrim('yobimodoshi'));
      let tail: AudioNode = k;
      if (type === 'sawtooth') {
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 900;
        k.connect(lp);
        tail = lp;
      }
      o.connect(k);
      tail.connect(gain);
      o.start(t);
      oscs.push(o);
    }
    gain.connect(g.pa.input);
    h = { oscs, gain, until: t };
    hums.set(c, h);
    oscs[0].onended = () => gain.disconnect();
  } else {
    const p = h.gain.gain;
    p.cancelScheduledValues(t);
    p.setValueAtTime(1, t);
  }
  const fadeAt = t + 0.6;
  h.gain.gain.setValueAtTime(1, fadeAt);
  h.gain.gain.linearRampToValueAtTime(0, fadeAt + 0.4);
  h.until = fadeAt + 0.4;
  for (const o of h.oscs) o.stop(h.until + 0.05);
  g.pa.wake(h.until + 1);
}

function play(def: VoiceDef, id: string, midi: number, t: number, bend: number, volK: number, vowel: string, isTail: boolean, revOverride?: number, longMs = 0, glideSemis = 0): void {
  if (def.wave === 'none') return;
  const g = cur();
  const dest = def.pa ? g.pa.input : g.voiceBus;
  if (def.pa) g.pa.open(t);
  const long = longMs > 0;
  const dur = (long ? longMs : def.len) / 1000;
  const k = def.child ? 1.2 : 1;
  const [f1, f2] = FORMANT[vowel] ?? FORMANT.a;
  const f = def.wave === 'noise' ? 1000 : midiHz(midi);
  const dogDown = id === 'dog' && musicParams().stage >= 1 && musicParams().stage < 3 ? -100 : 0;
  const base: VoiceOpts = {
    at: t,
    dest,
    freq: f,
    dur: Math.max(0.008, dur - (def.R ?? 15) / 1000),
    attack: (def.A ?? 2) / 1000,
    decay: (def.D ?? Math.max(10, def.len * 0.5)) / 1000,
    sustain: def.S ?? 0.55,
    release: (def.R ?? 15) / 1000,
    vol: def.v * volK * trimOr1(voiceTrim(id)),
    detune: dogDown,
    reverb: revOverride ?? def.rev,
  };
  if (bend) {
    base.freqEnd = f * Math.pow(2, bend / 12);
    base.glide = 0.06;
    base.dur = 0.07;
  }
  if (long) {
    // a long blip: Kanenari's words settle two semitones down (い −2 → …,
    // う +5 → +3), 「なぁ」 sighs two down over 200 ms, 「えー」 sinks 30 cents;
    // a called name's last ん simply rings
    if (glideSemis) {
      base.freqEnd = f * Math.pow(2, glideSemis / 12);
      base.glide = id === 'h_mitsu' ? 0.2 : id === 'kanenari_voice' ? 0.3 : dur * 0.94;
    }
    base.dur = Math.max(0.02, dur - (def.R ?? 15) / 1000);
  }
  if (def.am) base.am = { rate: def.am[0], depth: def.am[1], shape: def.am[2] };
  if (def.fall) {
    base.freqEnd = f * Math.pow(2, def.fall / 1200);
    base.glide = dur;
  }
  if (def.scoop) {
    base.scoop = def.scoop[0];
    base.scoopTime = def.scoop[1] / 1000;
  }
  if (def.vib) base.vibrato = { rate: def.vib[0], depth: def.vib[1] };
  if (def.lp) base.filter = { type: 'lowpass', freq: def.lp, q: def.lpQ ?? 0.7 };
  if (def.bp) base.filter = { type: 'bandpass', freq: def.bp[0], q: def.bp[1] };
  if (def.formant && !isTail) base.formant = { f1: f1 * k, f2: f2 * k, q1: 5, q2: 7, mix: 0.4, lp: vowel === 'n' ? 450 : undefined };
  if (id === 'maruyama') base.fm = { ratio: 1, index: 2.5, indexEnd: 0.8, indexTime: 40 };

  if (id === 'omukaemachi' || id === 'broadcast_child') {
    // two layers at once: a low breath pad + a child's high note 15 ms later
    voice({ at: t, dest, wave: 'sawtooth', freq: 110, dur: 0.08, attack: 0.06, decay: 0.05, sustain: 0.7, release: 0.15, vol: 0.04 * volK * trimOr1(voiceTrim(id)), filter: { type: 'lowpass', freq: 600 }, reverb: 0.5 });
    voice({ ...base, at: t + 0.015, wave: 'triangle', reverb: 0.5 });
    return;
  }
  if (def.wave === 'noise') {
    voice({ ...base, wave: 'noise' });
    return;
  }
  if (id === 'dakoku') {
    // the time recorder's little "カチ" at the head of every blip
    voice({ at: t, dest, wave: 'triangle', freq: 2400, dur: 0.003, attack: 0.0005, decay: 0.006, sustain: 0, release: 0.004, vol: base.vol ?? 0 });
  }
  voice({ ...base, wave: def.wave });
  if (def.wave2) voice({ ...base, wave: def.wave2[0], vol: (base.vol ?? 0) * def.wave2[1], formant: undefined });
  if (def.noise) voice({ ...base, wave: 'noise', freq: 1000, freqEnd: undefined, vol: (base.vol ?? 0) * def.noise.level, filter: { type: 'bandpass', freq: def.noise.bp, q: def.noise.q }, formant: undefined, fm: undefined });
  if (id === 'kanenari_voice' && vowel === 'i' && kanenariSeq === 3) {
    // the "sh" of し
    voice({ at: t, dest, wave: 'noise', freq: 1000, dur: 0.06, attack: 0.01, decay: 0.04, sustain: 0.5, release: 0.02, vol: 0.02 * trimOr1(voiceTrim(id)), filter: { type: 'bandpass', freq: 3500, q: 1.5 } });
  }
}

setTextBlip(blip);
