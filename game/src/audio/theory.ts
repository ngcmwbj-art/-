// Music data helpers: the `mml` notation of 40_audio 2.1 (pasted verbatim into
// the song files and parsed at load), chord tables, bass pattern tokens (2.2),
// and the pad / chord voicing rules (3.4).

import { noteMidi, pitchClass } from './engine';

// ---------------------------------------------------------------------------
// MML

export interface Ev {
  /** Start step inside the bar (16th notes). */
  step: number;
  /** Length in steps. */
  len: number;
  /** MIDI notes; empty = rest. */
  midis: number[];
  /** Tied into the next note (same pitch, no re-attack). */
  tie: boolean;
  /** Index of the note inside its bar (for "drop every 3rd note" style rules). */
  idx: number;
}

export interface MmlBar {
  label: string;
  chordStr: string;
  /** Chord names split on `・`. */
  chordNames: string[];
  meter: string | null;
  events: Ev[];
  steps: number;
}

export interface MmlBlock {
  song: string;
  part: string;
  ins: string;
  meter: string;
  bars: MmlBar[];
}

const METER_STEPS: Record<string, number> = {
  '4/4': 16, '2/4': 8, '3/4': 12, '5/4': 20, '6/8': 12, '7/8': 14,
};

export function meterSteps(m: string): number {
  return METER_STEPS[m] ?? 16;
}

export const mmlErrors: string[] = [];

/**
 * Parse one or more `@song ...` blocks (40_audio 2.1). Bar lengths are
 * checked against the meter (16.1); mistakes are collected in mmlErrors.
 */
export function parseMml(text: string): MmlBlock[] {
  const blocks: MmlBlock[] = [];
  let cur: MmlBlock | null = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('@song')) {
      const kv = Object.fromEntries(
        line
          .slice(5)
          .trim()
          .split(/\s+/)
          .slice(1)
          .map((s) => s.split('=') as [string, string]),
      );
      cur = { song: line.slice(5).trim().split(/\s+/)[0], part: kv.part ?? 'x', ins: kv.ins ?? '', meter: kv.meter ?? '4/4', bars: [] };
      blocks.push(cur);
      continue;
    }
    if (!cur) continue;
    const m = /^(\S+)\s+(.*?)\s*\|(.*)\|\s*$/.exec(line);
    if (!m) {
      mmlErrors.push(`${cur.song}/${cur.part}: cannot parse "${line}"`);
      continue;
    }
    const label = m[1];
    let chordStr = m[2].trim();
    let meter: string | null = null;
    const mm = /^\[(\d+\/\d+)\]\s*(.*)$/.exec(chordStr);
    if (mm) {
      meter = mm[1];
      chordStr = mm[2];
    }
    const events: Ev[] = [];
    let step = 0;
    let idx = 0;
    const tokens = m[3].trim().match(/\[[^\]]+\]:\d+\^?|\S+/g) ?? [];
    for (const tok of tokens) {
      const tm = /^(\[[^\]]+\]|[^:]+):(\d+)(\^?)$/.exec(tok);
      if (!tm) {
        mmlErrors.push(`${cur.song}/${cur.part}/${label}: bad token ${tok}`);
        continue;
      }
      const len = parseInt(tm[2], 10);
      let midis: number[] = [];
      if (tm[1] !== '-') {
        const names = tm[1].startsWith('[') ? tm[1].slice(1, -1).trim().split(/\s+/) : [tm[1]];
        midis = names.map(noteMidi);
        if (midis.some((x) => Number.isNaN(x))) mmlErrors.push(`${cur.song}/${cur.part}/${label}: bad note ${tok}`);
      }
      events.push({ step, len, midis, tie: tm[3] === '^', idx: midis.length ? idx++ : -1 });
      step += len;
    }
    const expect = cur.meter === 'free' && !meter ? step : meterSteps(meter ?? cur.meter);
    if (step !== expect) mmlErrors.push(`${cur.song}/${cur.part}/${label}: ${step} steps, expected ${expect}`);
    cur.bars.push({
      label,
      chordStr,
      chordNames: chordStr.startsWith('(') ? [] : chordStr.split('・').map((s) => s.trim()).filter(Boolean),
      meter,
      events,
      steps: expect,
    });
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Chords

export interface Chord {
  name: string;
  /** Root pitch class. */
  root: number;
  /** Bass pitch class (slash chord denominator, else root). */
  bass: number;
  /** Chord tones as pitch classes, in the order listed in the table (root first). */
  tones: number[];
}

/**
 * Chord table text, one per line: `Fmaj7(#11) = F A C E B`.
 * Slash chords list their bass after a slash: `G/F = /F G B D`.
 */
export function parseChordTable(text: string): Map<string, Chord> {
  const out = new Map<string, Chord>();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || !line.includes('=')) continue;
    const [name, rhs] = line.split('=').map((s) => s.trim());
    let bassName: string | null = null;
    const parts = rhs.split(/\s+/).filter(Boolean);
    const tones: number[] = [];
    for (const p of parts) {
      if (p.startsWith('/')) bassName = p.slice(1);
      else tones.push(pitchClass(p));
    }
    const rootName = /^([A-G][#b]?)/.exec(name)?.[1] ?? 'C';
    const root = pitchClass(rootName);
    out.set(name, { name, root, bass: bassName ? pitchClass(bassName) : root, tones });
  }
  return out;
}

export function transposeChord(c: Chord, semis: number): Chord {
  const tp = (x: number) => (((x + semis) % 12) + 12) % 12;
  return { name: c.name, root: tp(c.root), bass: tp(c.bass), tones: c.tones.map(tp) };
}

function has(c: Chord, interval: number): boolean {
  return c.tones.includes((c.root + interval) % 12);
}

/** Interval (semitones above root) of the chord's third. */
export function thirdOf(c: Chord): number {
  if (has(c, 4)) return 4;
  if (has(c, 3)) return 3;
  if (has(c, 5)) return 5; // sus4
  if (has(c, 2)) return 2;
  return 4;
}

/** Interval of the chord's fifth (2.2: perfect, else b5, else #5 / b13). */
export function fifthOf(c: Chord): number {
  if (has(c, 7)) return 7;
  if (has(c, 6) && !has(c, 5) && has(c, 3)) return 6; // dim / m7b5
  if (has(c, 8)) return 8;
  return 7;
}

/**
 * Bass token → MIDI. R sits in A1..G#2 (33..44); R' an octave higher; 5 and 3
 * are the nearest chord fifth / third above R. Slash chords use the bass note
 * for R but the chord's own fifth (2.2).
 */
export function bassMidi(c: Chord, tok: string): number {
  const r = 33 + ((c.bass - 9 + 12) % 12);
  switch (tok) {
    case 'R':
      return r;
    case "R'":
      return r + 12;
    case '5': {
      const pc = (c.root + fifthOf(c)) % 12;
      let m = 33 + ((pc - 9 + 12) % 12);
      while (m <= r) m += 12;
      return m;
    }
    case '3': {
      const pc = (c.root + thirdOf(c)) % 12;
      let m = 33 + ((pc - 9 + 12) % 12);
      while (m <= r) m += 12;
      return m;
    }
    default:
      return r;
  }
}

/** Pick the (up to) `count` pitch classes a pad / comp should voice (3.4). */
export function voicePcs(c: Chord, count: number, omitRoot: boolean): number[] {
  const iv = (pc: number) => (pc - c.root + 12) % 12;
  let pcs = [...new Set(c.tones)];
  // keep colour: 7ths, 9ths, 11ths, 13ths first, then 3rd, then 5th, then root
  const prio = (pc: number) => {
    const i = iv(pc);
    if (i === 0) return omitRoot ? 9 : 5;
    if (i === 7) return 6;
    if (i === 3 || i === 4) return 1;
    return 0; // tensions & 7ths
  };
  pcs.sort((a, b) => prio(a) - prio(b));
  if (pcs.length > count) pcs = pcs.slice(0, count);
  // Short chords are filled up to `count` notes. A slash chord's bass (D7/F#:
  // the third, which the table leaves to the bass) comes first, so the upper
  // voices keep the chord's colour instead of an octave of the root; then the
  // root, the fifth, the third (triads double the root as usual).
  const fills: number[] = [];
  if (c.bass !== c.root && !c.tones.includes(c.bass)) fills.push(c.bass);
  fills.push(c.root);
  const fifth = (c.root + fifthOf(c)) % 12;
  if (c.tones.includes(fifth)) fills.push(fifth);
  const third = (c.root + thirdOf(c)) % 12;
  if (c.tones.includes(third)) fills.push(third);
  let k = 0;
  while (pcs.length < count && fills.length) {
    const next = fills.find((f) => !pcs.includes(f)) ?? fills[k++ % fills.length];
    pcs.push(next);
    if (pcs.length > 6) break;
  }
  return pcs;
}

/**
 * A voice-led chord whose top note stays at or below `ceil` (the melody's
 * lowest note over the chord, minus a gap): the accompaniment never rings
 * above or on the tune (3.4). Where the melody dips low, the voicing may
 * drop a few semitones under `lo` or thin to three notes; if nothing fits,
 * the plain voicing in [lo, hi] is used.
 */
export function voiceUnder(pcs: number[], prev: number[] | null, lo: number, hi: number, ceil: number): number[] {
  const top = Math.min(hi, ceil);
  if (top >= hi) return voiceLead(pcs, prev, lo, hi);
  const ok = (v: number[], l: number) => v.length > 0 && v.every((m, i) => m >= l && m <= top && (i === 0 || m > v[i - 1]));
  for (let n = pcs.length; n >= Math.min(3, pcs.length); n--) {
    const p = pcs.slice(0, n);
    for (const l of [lo, lo - 3, lo - 5]) {
      if (top - l < 5) continue;
      const v = voiceLead(p, prev, l, top);
      if (ok(v, l)) return v;
    }
  }
  return voiceLead(pcs, prev, lo, hi);
}

/**
 * Voice-led voicing: choose octaves for `pcs` inside [lo, hi] that minimise
 * total movement from `prev` (common tones stay), else sit near `center`.
 */
export function voiceLead(pcs: number[], prev: number[] | null, lo = 55, hi = 76, center = 65): number[] {
  const opts: number[][] = pcs.map((pc) => {
    const o: number[] = [];
    for (let m = lo; m <= hi; m++) if (((m % 12) + 12) % 12 === pc) o.push(m);
    return o.length ? o : [lo + ((pc - lo) % 12 + 12) % 12];
  });
  let best: number[] = [];
  let bestCost = Infinity;
  const pick: number[] = [];
  const rec = (i: number) => {
    if (i === opts.length) {
      const s = [...pick].sort((a, b) => a - b);
      // distinct notes only (a doubled pc must sit in another octave)
      for (let j = 1; j < s.length; j++) if (s[j] === s[j - 1]) return;
      let cost = 0;
      if (prev && prev.length) {
        const p = [...prev].sort((a, b) => a - b);
        for (let j = 0; j < s.length; j++) cost += Math.abs(s[j] - p[Math.min(j, p.length - 1)]);
      } else {
        const mean = s.reduce((a, b) => a + b, 0) / s.length;
        cost = Math.abs(mean - center) * 2 + (s[s.length - 1] - s[0]) * 0.5;
      }
      // prefer spacing without clusters of two semitones at the bottom
      if (s.length > 1 && s[1] - s[0] <= 2 && s[0] < 60) cost += 3;
      // a doubled note does not belong on top (an octave of the root reads thin)
      if (s.length > 2 && s.slice(0, -1).some((x) => x % 12 === s[s.length - 1] % 12)) cost += 4;
      if (cost < bestCost) {
        bestCost = cost;
        best = s;
      }
      return;
    }
    for (const m of opts[i]) {
      pick.push(m);
      rec(i + 1);
      pick.pop();
    }
  };
  rec(0);
  if (!best.length) best = pcs.map((pc, i) => lo + ((pc - lo) % 12 + 12) % 12 + (i > 2 ? 12 : 0)).sort((a, b) => a - b);
  return best;
}

// ---------------------------------------------------------------------------
// Pattern strings

/** Bass pattern tokens `R:6 5:2 R':4 -:2` → [{tok, step, len}] */
export function parseBassPattern(p: string): { tok: string; step: number; len: number }[] {
  const out: { tok: string; step: number; len: number }[] = [];
  let step = 0;
  for (const t of p.trim().split(/\s+/)) {
    const [tok, l] = t.split(':');
    const len = parseInt(l, 10);
    out.push({ tok, step, len });
    step += len;
  }
  return out;
}

/** Drum pattern chars → velocity (X 1.0, x 0.7, g 0.35). */
export function drumVel(ch: string | undefined): number {
  switch (ch) {
    case 'X':
      return 1;
    case 'x':
      return 0.7;
    case 'g':
      return 0.35;
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// The sealed chime answer (1.3): intervals −2, −3, +3 in any key.

export function findSealedAnswer(seq: number[]): number {
  for (let i = 0; i + 3 < seq.length; i++) {
    if (seq[i + 1] - seq[i] === -2 && seq[i + 2] - seq[i + 1] === -3 && seq[i + 3] - seq[i + 2] === 3) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Chapter 2's sealed shapes (53_ch2_audio 1.3, 16.1), in any key.

/** 星見台の朝のチャイム (M6: A F D C D F): only bgm_hoshi_morning and the 5:00 chime may sound it. */
export const MORNING_CHIME_SHAPE = [-4, -3, -2, 2, 3];
/**
 * The closing chime's fourth note (M4): D6 A5 F♯5 D5 (major −5 −3 −4) or its
 * minor D6 A5 F5 D5 (−5 −4 −3). Only the final phase's se_pa_chime_end says it.
 */
export const CLOSING_FOURTH_SHAPES = [
  [-5, -3, -4],
  [-5, -4, -3],
];

/**
 * M7, ツガオの動機 (53 1.3, 5.7): D3 E♭3 D3 A2 (+1 −1 −5). Only bgm_tsugao's bass
 * says it (T1, T5); the village — ツガオ便, the delivery's marimba — never does.
 */
export const TSUGAO_SHAPE = [1, -1, -5];

/** First index where `seq`'s successive intervals are `shape`, or −1. */
export function findShape(seq: number[], shape: number[]): number {
  for (let i = 0; i + shape.length < seq.length; i++) {
    let ok = true;
    for (let k = 0; k < shape.length && ok; k++) ok = seq[i + k + 1] - seq[i + k] === shape[k];
    if (ok) return i;
  }
  return -1;
}
