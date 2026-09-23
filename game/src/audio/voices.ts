// Dialog blips (40_audio 10). Each character has a waveform, a base note and
// a small scale; the pitch of every blip is chosen from the character code so
// a line always "sings" the same way. Kana vowels colour the tone with two
// band-passes (a hum, never words).

import { cur, dbToGain, hasGraph, midiHz, noteMidi, voice, type VoiceOpts, type Wave } from './engine';
import { currentId, duck, duckAmbience, musicParams } from './music';
import { sfxTable } from './registry';
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
};

const ALIAS: Record<string, string> = {
  mom: 'mother', haha: 'mother', kanenari: 'flip', old: 'obaa', narration: 'narr', narrator: 'narr', system: 'sys',
  sand_girl: 'girl', gacha_boy: 'kid', shadow_man: 'shadow', kotaro: 'dog', minato: 'none', omu: 'omukaemachi',
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
}
const st: Record<string, State> = {};
let kanenariSeq = 0;
let paSwellCheck: { t: number } | null = null;

/** QA: forget the per-voice spacing state (offline renders start at t = 0). */
export function resetVoiceState(): void {
  for (const k of Object.keys(st)) delete st[k];
  kanenariSeq = 0;
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

/** One dialog character. `at` (ctx time) is only for offline renders (QA). */
export function blip(voiceId: string, ch: string, at?: number): void {
  if (!hasGraph()) return;
  const id = resolve(voiceId);
  if (id === 'none' || id === 'sys') return;
  const def = VOICES[id] ?? VOICES.default;
  const g = cur();
  const now = at ?? g.ctx.currentTime;
  const s = (st[id] ??= { last: -1, lastSemi: 99, repeat: 0, seqI: 0, lastMidi: 60, lastT: 0, hist: [] });

  // sentence endings: a little rise for "？", a push for "！"
  if (ch === '？' || ch === '?' || ch === '！' || ch === '!') {
    if (now - s.lastT < 0.5 && def.wave !== 'none' && id !== 'narr') {
      const q = ch === '？' || ch === '?';
      play(def, id, s.lastMidi, now + 0.01, q ? 5 : 2, q ? 1 : 1.2, 'a', true);
    }
    return;
  }
  if (ch === '。' && id === 'chugaku' && now - s.lastT < 0.5) {
    // 語尾にリバーブ: the last blip rings once more, wet
    play(def, id, s.lastMidi, now + 0.01, 0, 0.6, 'a', false, 0.6);
    return;
  }
  if (SILENT.has(ch) || !ch.trim()) return;
  // spacing: the voice's interval in characters at 40 chars/s
  const minGap = def.every * 0.025 * 0.9;
  if (now - s.last < minGap) return;
  // a new page of the flip: the whole marker squeak
  if (id === 'flip' && now - s.last > 0.8) {
    s.last = now;
    s.lastT = now;
    sfxTable.get('se_flip')?.({ vol: 0.9, at: now });
    return;
  }
  s.last = now;

  let semi: number;
  if (def.fixedSeq) {
    semi = def.fixedSeq[s.seqI++ % def.fixedSeq.length];
  } else if (id === 'kanenari_voice') {
    // "……おいしい。": お 0, い +3, し +3, い −2 (long, falling)
    const map: Record<string, number> = { お: 0, い: kanenariSeq >= 2 ? -2 : 3, し: 3 };
    semi = map[ch] ?? 0;
    kanenariSeq = ch === 'お' ? 1 : kanenariSeq + 1;
  } else {
    semi = def.scale[hashCh(ch) % def.scale.length];
    if (semi === s.lastSemi) {
      s.repeat++;
      if (s.repeat >= 2) {
        semi = def.scale[(def.scale.indexOf(semi) + 1) % def.scale.length];
        s.repeat = 0;
      }
    } else s.repeat = 0;
    // the chime's sealed answer (−2, −3, +3 in any key, 1.3) must not slip out
    // of a chatty line either: step aside to the next note of the voice's set
    const h = s.hist;
    if (h.length >= 3 && h[1] - h[0] === -2 && h[2] - h[1] === -3 && semi - h[2] === 3) {
      const i = def.scale.indexOf(semi);
      semi = def.scale[(i + 1) % def.scale.length];
      if (semi - h[2] === 3) semi = def.scale[(i + 2) % def.scale.length];
    }
  }
  s.hist.push(semi);
  if (s.hist.length > 3) s.hist.shift();
  s.lastSemi = semi;
  const baseMidi = typeof def.base === 'number' ? 69 + 12 * Math.log2(def.base / 440) : noteMidi(def.base);
  const midi = baseMidi + semi;
  s.lastMidi = midi;
  s.lastT = now;
  const long = id === 'kanenari_voice' && ch === 'い' && kanenariSeq >= 4;
  play(def, id, midi, now + 0.005, 0, 1, vowelOf(ch), false, undefined, long);
  if (g.offline) return;
  if (id === 'kanenari_voice') {
    // the night song leans back (−4 dB) under the four hums
    duck(dbToGain(-4), 0.15, 0.6, 0.6);
  } else if (def.pa) {
    duck(dbToGain(-9), 0.3, 0.5, 0.8);
    duckAmbience(dbToGain(-6), 0.3, 0.5, 0.8);
    if (id === 'broadcast_child') schedulePaSwell();
  } else if (!isBattle() && id !== 'narr') {
    // field dialog: music −2 dB while text is running (11.3)
    duck(dbToGain(-2), 0.15, 0.35, 0.4);
  }
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

function play(def: VoiceDef, id: string, midi: number, t: number, bend: number, volK: number, vowel: string, isTail: boolean, revOverride?: number, long = false): void {
  if (def.wave === 'none') return;
  const g = cur();
  const dest = def.pa ? g.pa.input : g.voiceBus;
  if (def.pa) g.pa.open(t);
  const dur = (long ? 300 : def.len) / 1000;
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
    base.freqEnd = f * Math.pow(2, -2 / 12);
    base.glide = 0.3;
  }
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
  voice({ ...base, wave: def.wave });
  if (def.wave2) voice({ ...base, wave: def.wave2[0], vol: (base.vol ?? 0) * def.wave2[1], formant: undefined });
  if (def.noise) voice({ ...base, wave: 'noise', freq: 1000, freqEnd: undefined, vol: (base.vol ?? 0) * def.noise.level, filter: { type: 'bandpass', freq: def.noise.bp, q: def.noise.q }, formant: undefined, fm: undefined });
  if (id === 'kanenari_voice' && vowel === 'i' && kanenariSeq === 3) {
    // the "sh" of し
    voice({ at: t, dest, wave: 'noise', freq: 1000, dur: 0.06, attack: 0.01, decay: 0.04, sustain: 0.5, release: 0.02, vol: 0.02 * trimOr1(voiceTrim(id)), filter: { type: 'bandpass', freq: 3500, q: 1.5 } });
  }
}

setTextBlip(blip);
