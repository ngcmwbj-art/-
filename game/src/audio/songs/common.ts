// Shared helpers for the song files: parse the verbatim mml blocks, build
// bar maps, and small predicates used by many parts.

import { registerBgm } from '../index';
import { barsFrom, type BarCtx, type BarDef, type SongDef } from '../sequencer';
import { mmlErrors, parseChordTable, parseMml, transposeChord, type Chord, type MmlBar, type MmlBlock } from '../theory';

export interface Score {
  blocks: MmlBlock[];
  /** part name → bars */
  part(name: string): MmlBar[];
  chords: Map<string, Chord>;
  bars: Map<string, BarDef>;
}

/** Parse mml text + chord table into bar definitions (all parts share labels). */
export function score(mml: string, chordTable: string, extraTables: Map<string, Chord>[] = []): Score {
  const blocks = parseMml(mml);
  const chords = parseChordTable(chordTable);
  for (const t of extraTables) for (const [k, v] of t) if (!chords.has(k)) chords.set(k, v);
  const bars = new Map<string, BarDef>();
  for (const b of blocks) barsFrom(b.bars, chords, b.meter, bars, mmlErrors);
  return {
    blocks,
    chords,
    bars,
    part(name: string) {
      return blocks.filter((b) => b.part === name).flatMap((b) => b.bars);
    },
  };
}

/**
 * The town chime's "question" (G A C E: +2 +3 +4 semitones, 1.3) woven into a
 * song as a short bell figure. Written as an extra mml block with only the
 * bars where it sounds; the sealed "answer" check sees it like any melody.
 */
export function chimeQuote(mml: string): MmlBar[] {
  const bars = parseMml(mml).flatMap((b) => b.bars);
  for (const b of bars) {
    const seq = b.events.filter((e) => e.midis.length).map((e) => e.midis[0]);
    const iv = seq.slice(1).map((m, i) => m - seq[i]);
    if (iv.join() !== '2,3,4') mmlErrors.push(`chime quote ${b.label}: not the question shape (${iv.join()})`);
  }
  return bars;
}

/** A bar that has no melody of its own (drum-only intros etc.). */
export function bar(label: string, steps: number, chords: [number, Chord][], bpm?: number): BarDef {
  return { label, steps, chords: chords.map(([step, chord]) => ({ step, chord })), bpm };
}

/** Copy bars transposed by semitones (mid-boss = battle +2). */
export function transposedBars(src: Map<string, BarDef>, labels: string[], semis: number, out: Map<string, BarDef>): void {
  for (const l of labels) {
    const b = src.get(l);
    if (!b) continue;
    out.set(l, { ...b, chords: b.chords.map((c) => ({ step: c.step, chord: transposeChord(c.chord, semis) })) });
  }
}

export function registerSong(def: SongDef): SongDef {
  registerBgm(def.id, def);
  return def;
}

export const inSec = (...secs: string[]) => (b: BarCtx) => secs.includes(b.section);
export const range = (from: number, to: number) => (b: BarCtx) => b.num >= from && b.num <= to;

/** Drum pattern helper: same string for the listed sections, else null. */
export function per(map: Record<string, string | null>, fallback: string | null = null) {
  return (b: BarCtx): string | null => (b.section in map ? map[b.section] : fallback);
}
