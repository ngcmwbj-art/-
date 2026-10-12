// bgm_suizokukan — 旧水族館 (63_ch3_audio 5.5). 80, A Dorian (an F♯ borrowed
// here and there). The closed aquarium: huge tanks with nothing behind the
// glass, straight corridors, forty years of delivery slips on the walls.
// Lonely, never frightening. The vibraphone (light wobbling through water)
// and a pad carry it; the only beat is a far-off clock. Each room has its own
// form, the rooms where the three of まだまだ団 tell their 「まだ」 one by one.
//
// variant → h_room (6.4; the design calls it c3_room): 0 'iriguchi' (the
// entrance, 「本日 休館」), 1 'kairo' (the corridor of slips: the old wall
// clock on 2 and 4), 2 'diorama' (the vibes become a music box an octave up,
// no pad; the three towns' clocks are amb_c3_aq_diorama's), 3 'shinkai' (the
// deep-sea room: the tune rests — only a dark pad and the sub, so グソっ君's
// voice leads; the song does not stop, the tune comes back on leaving),
// 4 'esa' (the feeding room: the music box loops Q9–Q12 only), 5 'rouka'
// (the corridor outside the store room: a soft kick). Moving between rooms
// the song carries on and the form changes over 0.8 s (4.2).
//
// Never in it (16.1): the town chime's answer, 星見台's morning chime, M7.

import { dbToGain } from '../engine';
import { songGainDb } from '../mix';
import { bass, drums, melody, pads, type BarCtx, type PartDef, type SongDef, type SongPlayer } from '../sequencer';
import { registerSong, score } from './common';

export const SUIZOKUKAN_MML = `
@song bgm_suizokukan part=vibes ins=ins_fm_vibes meter=4/4
Q1  Am9            | E5:8 C5:4 D5:4 |
Q2  Fmaj7          | E5:12 -:4 |
Q3  Dm9            | F5:4 E5:4 D5:4 A4:4 |
Q4  E7sus4         | B4:12 -:4 |
Q5  Am9            | E5:4 G5:4 A5:8 |
Q6  Fmaj7(#11)     | B5:8 A5:4 E5:4 |
Q7  Dm9            | F5:6 E5:2 C5:8 |
Q8  E7sus4         | D5:8 B4:8 |
Q9  Cmaj7          | G5:8 E5:8 |
Q10 Bm7b5          | D5:8 F5:8 |
Q11 Am9            | E5:6 D5:2 C5:8 |
Q12 Fmaj7          | A4:12 -:4 |
Q13 Dm9            | D5:4 E5:4 F5:4 A5:4 |
Q14 G13            | G5:8 E5:8 |
Q15 Fmaj7          | E5:4 C5:4 A4:8 |
Q16 E7sus4         | B4:12 -:4 |
`;

export const SUIZOKUKAN_CHORDS = `
Am9 = A C E G B
Fmaj7 = F A C E
Dm9 = D F A C E
E7sus4 = E A B D
Fmaj7(#11) = F A C E B
Cmaj7 = C E G B
Bm7b5 = B D F A
G13 = G B D F E
`;

export const suizokukan = score(SUIZOKUKAN_MML, SUIZOKUKAN_CHORDS);

export const SUIZOKUKAN_LOOP = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10', 'Q11', 'Q12', 'Q13', 'Q14', 'Q15', 'Q16'];

/** variant → h_room (63 6.4: 0 iriguchi … 5 rouka). */
export const SUIZOKUKAN_ROOMS: Record<string, number> = { iriguchi: 0, kairo: 1, diorama: 2, shinkai: 3, esa: 4, rouka: 5 };

/** Each room: dB on the song, and the parts' levels (missing = 0). */
const ROOM: { db: number; parts: Record<string, number> }[] = [
  /* iriguchi */ { db: -4, parts: { vibes: 1, pad: 1, sub: 1 } },
  /* kairo    */ { db: -3, parts: { vibes: 1, pad: 1, sub: 1, tick: 1 } },
  /* diorama  */ { db: -5, parts: { box: 1, sub: 0.6 } },
  /* shinkai  */ { db: -12, parts: { deep: 1, sub: 1 } },
  /* esa      */ { db: -6, parts: { box: 1, pad: 0.7, sub: 0.8 } },
  /* rouka    */ { db: -4, parts: { vibes: 1, pad: 1, sub: 1, kick: 1 } },
];

const roomOf = (p: { h_room: number }) => ROOM[p.h_room] ?? ROOM[0];

function applyRoom(sp: SongPlayer, ramp: number, p = sp.params): void {
  const r = roomOf(p);
  const t = sp.g.ctx.currentTime;
  const tc = Math.max(0.005, ramp) / 3;
  sp.out.gain.setTargetAtTime(dbToGain(songGainDb(sp.def.id, sp.def.gainDb) + r.db), t, tc);
  for (const rt of sp.parts) sp.partGain(rt.id, r.parts[rt.id] ?? 0, Math.max(0.005, ramp), t);
}

const ESA_FROM = SUIZOKUKAN_LOOP.indexOf('Q9');
const ESA_TO = SUIZOKUKAN_LOOP.indexOf('Q12');

function suizokukanDef(): SongDef {
  const tune = suizokukan.part('vibes');
  const parts: PartDef[] = [
    // the vibraphone: light moving through water that is no longer there
    melody({ id: 'vibes', ins: 'ins_fm_vibes', bars: tune, o: { vol: 0.06, rev: 0.35 }, gate: 0.95 }),
    // the diorama and the feeding room: a music box, an octave up
    melody({ id: 'box', ins: 'ins_musicbox', bars: tune, transpose: 12, o: { vol: 0.05, rev: 0.3 } }),
    pads({ id: 'pad', o: { vol: 0.025 }, fx: { lp: 1200, q: 0.7, lfo: { rate: 0.08, depth: 200 } } }),
    // the deep-sea room: only a dark pad (LP 600 Hz)
    pads({ id: 'deep', o: { vol: 0.02 }, fx: { lp: 600, q: 0.6 }, lo: 48, hi: 64 }),
    bass({ id: 'sub', ins: 'ins_sub', pattern: 'R:16', o: (b: BarCtx) => ({ vol: b.p.h_room === 3 ? 0.05 : 0.07 }), transpose: (b: BarCtx) => (b.p.h_room === 3 ? -12 : 0) }),
    // the corridor's old wall clock, on 2 and 4
    drums({ id: 'tick', kit: { drm_tick: () => '....x.......x...' }, vel: { drm_tick: 0.3 }, fx: { hp: 300 } }),
    // the long corridor underground
    drums({ id: 'kick', kit: { drm_kick_soft: () => 'x.......x.......' }, vel: { drm_kick_soft: 0.5 } }),
  ];
  return {
    id: 'bgm_suizokukan',
    title: '旧水族館',
    bpm: 80,
    bars: suizokukan.bars,
    intro: [],
    loop: SUIZOKUKAN_LOOP,
    parts,
    gainDb: -8,
    // the closed building (suizoku): concrete and glass, long
    reverb: { len: 2.8, decay: 2.6, level: 0.3, hp: 220 },
    variants: SUIZOKUKAN_ROOMS,
    setup(sp) {
      applyRoom(sp, 0);
    },
    route(sp, next) {
      // the feeding room: Q9–Q12 over and over
      if (sp.params.h_room !== 4 || next.intro) return;
      if (next.i < ESA_FROM || next.i > ESA_TO) return { intro: false, i: ESA_FROM };
      return undefined;
    },
    onParam(sp, name, value) {
      // a little slower than 星見台's rooms: a big building (0.8 s)
      if (name === 'h_room') applyRoom(sp, 0.8, { ...sp.params, h_room: value });
    },
  };
}

export const SUIZOKUKAN_DEF = registerSong(suizokukanDef());
