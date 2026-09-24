// bgm_ending (5.10) and bgm_night (5.11). The ending is the only place where
// the chime finally answers itself: bar 2 sings D C A C and bar 3 lands on C.

import { arp, bass, drums, melody, pads, type BarCtx, type PartDef, type SongDef } from '../sequencer';
import { chimeHint, registerSong, score } from './common';
import { town } from './town';

export const ENDING_MML = `
@song bgm_ending part=melody ins=ins_musicbox meter=4/4
E1  Cadd9          | G4:4 A4:4 C5:4 E5:4 |
E2  Dm9・G9sus4    | D5:4 C5:4 A4:4 C5:4^ |
E3  Cmaj9          | C5:8 E5:4 G5:4 |
E4  Am7・D9        | A5:6 G5:2 E5:4 F#5:4 |
E5  Fmaj7          | G5:4 A5:4 C6:4 A5:4 |
E6  E7(b13)        | G#5:6 C6:2 B5:8 |
E7  Am7・Abmaj7    | C6:4 A5:4 G5:4 Eb5:4 |
E8  G7sus4・G7     | D5:8 F5:4 B4:4 |
E9  Abmaj7         | C6:8 G5:8 |
E10 Gm7・C7        | F5:4 D5:4 E5:8 |
E11 Fmaj7          | A5:6 G5:2 E5:8 |
E12 Fm6            | Ab5:8 F5:4 D5:4 |
E13 Em7            | G5:6 E5:2 D5:4 B4:4 |
E14 A7(b9)         | C#5:4 E5:4 G5:4 Bb5:4 |
E15 Dm7            | A5:8 F5:4 D5:4 |
E16 G7sus4・G7     | C5:8 B4:8 |
`;

export const ENDING_CHORDS = `
Dm9 = D F A C E
G9sus4 = G C D F A
Cmaj9 = C E G B D
D9 = D F# A C E
`;

const ending = score(ENDING_MML, ENDING_CHORDS, [town.chords]);
const late = (b: BarCtx) => b.num >= 9;

function endingDef(): SongDef {
  const parts: PartDef[] = [
    melody({ id: 'melody', ins: 'ins_musicbox', bars: ending.part('melody'), o: { vol: 0.1 } }),
    melody({
      id: 'flute',
      ins: 'ins_lead_sq50',
      bars: ending.part('melody'),
      o: { vol: 0.05, lp: 2200, vib: { rate: 4.5, depth: 12, delay: 0.25 } },
      when: (b) => !late(b),
      gate: 0.96,
    }),
    arp({
      id: 'epiano',
      ins: 'ins_fm_epiano',
      rate: 2,
      shape: ['R', '3', '5', '7', '5', '3'],
      rootLo: 55,
      o: { vol: 0.035, index: 1.2 },
      gate: 1.6,
      fx: { autopan: { rate: 0.12, depth: 0.3 } },
    }),
    pads({ id: 'pad', o: { vol: 0.03 }, fx: { lp: 1400, q: 0.8, lfo: { rate: 0.15, depth: 300 } } }),
    bass({ id: 'bass', ins: 'ins_fm_bass', pattern: (b) => (late(b) ? 'R:16' : 'R:8 5:8'), o: { index: 1.4, indexEnd: 0.4 } }),
    drums({ id: 'drums', kit: { drm_shaker: (b) => (b.num >= 5 ? 'x.g.x.g.x.g.x.g.' : null) }, vel: { drm_shaker: 0.5 } }),
  ];
  return {
    id: 'bgm_ending',
    title: 'エンディング（町）',
    bpm: 70,
    bars: ending.bars,
    intro: [],
    loop: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12', 'E13', 'E14', 'E15', 'E16'],
    parts,
    gainDb: -5,
    reverb: { len: 2.0, decay: 3.0, level: 0.3 },
  };
}

export const NIGHT_MML = `
@song bgm_night part=stars ins=ins_musicbox meter=4/4
N1  Fmaj7(#11)     | C6:8 B5:8 |
N2  Cmaj7/E        | G5:16 |
N3  Dm9            | E6:8 D6:8 |
N4  Bbmaj7(#11)    | E6:16 |
N5  Fmaj7(#11)     | A5:4 B5:4 C6:8 |
N6  Am7            | E5:16 |
N7  Gm9            | A5:8 F5:8 |
N8  C9sus4         | G5:8 D6:8 |
`;

export const NIGHT_CHORDS = `
Fmaj7(#11) = F A C E B
Cmaj7/E = C G B /E
Dm9 = D F A C E
Bbmaj7(#11) = Bb D F A E
Am7 = A C E G
Gm9 = G Bb D F A
C9sus4 = C F G Bb D
`;

const night = score(NIGHT_MML, NIGHT_CHORDS);

// Under N2's long G5, far back in the night's reverb, a bell remembers the
// first two notes of the chime — only G and A. The question was answered in
// bgm_ending; this is its echo, not a new question, and it leaves the bar's
// one-or-two-notes stillness (5.11) and N5's sequel teaser alone.
const NIGHT_CHIME = chimeHint(`
@song bgm_night part=chime ins=ins_fm_vibes meter=4/4
N2  Cmaj7/E        | -:8 G4:4 A4:4 |
`);

function nightDef(): SongDef {
  return {
    id: 'bgm_night',
    title: 'エンディング（夜）',
    bpm: 60,
    bars: night.bars,
    intro: [],
    loop: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8'],
    parts: [
      melody({ id: 'stars', ins: 'ins_musicbox', bars: night.part('stars'), o: { vol: 0.09, rev: 0.7 } }),
      melody({ id: 'chime', ins: 'ins_fm_vibes', bars: NIGHT_CHIME, o: { vol: 0.028, rev: 0.9 }, fx: { lp: 2600 } }),
      pads({ id: 'pad', o: { vol: 0.025, attack: 1.2, release: 2.0 }, fx: { lp: 900, q: 0.7 } }),
      bass({ id: 'sub', ins: 'ins_sub', pattern: 'R:16', o: { vol: 0.1 } }),
    ],
    gainDb: -8,
    reverb: { len: 3.2, decay: 2.4, level: 0.38 },
  };
}

export const ENDING_DEFS = [registerSong(endingDef()), registerSong(nightDef())];
