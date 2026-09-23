// bgm_battle — 通常戦 (40_audio 5.7) and the shared "キレ" layers (7.2).
// Funky FM slap bass, a 25 % pulse lead that jumps like a boke, and a break
// (C) on ♭IImaj7 that waits for the tsukkomi.

import { DRM } from '../instruments';
import { arp, bass, comp, drums, hits, melody, pads, type BarCtx, type PartDef, type SongDef } from '../sequencer';
import { chimeQuote, registerSong, score } from './common';

export const BATTLE_MML = `
@song bgm_battle part=intro ins=ins_fm_slap meter=4/4
BI1 Dm             | D2:2 D3:1 -:1 D2:2 D3:2 A2:2 C3:2 D3:4 |

@song bgm_battle part=lead ins=ins_lead_p25 meter=4/4
BI2 Dm9            | -:12 A4:2 C5:2 |
A1  Dm9            | D5:3 F5:3 A5:2 G5:2 F5:2 E5:2 D5:2 |
A2  Dm9            | C5:2 D5:4 A4:6 -:4 |
A3  Bbmaj7         | D5:3 F5:3 A5:2 Bb5:4 A5:2 F5:2 |
A4  C6             | G5:3 E5:3 C5:2 E5:2 G5:2 A5:4 |
A5  Gm9            | Bb5:4 A5:2 G5:2 F5:3 D5:3 G5:2 |
A6  A7(b13)        | E5:3 F5:3 E5:2 C#5:4 A4:4 |
A7  Dm9            | D5:2 E5:2 F5:2 A5:2 C6:4 A5:4 |
A8  E7(#9)         | G5:4 G#5:4 D5:4 B4:4 |
B1  Bbmaj7         | F5:6 D5:2 F5:2 G5:2 A5:4 |
B2  C              | G5:6 E5:2 C5:4 E5:4 |
B3  Am7            | A5:3 G5:3 E5:2 C5:4 E5:4 |
B4  Dm7            | F5:6 E5:2 D5:8 |
B5  Gm7            | Bb5:3 A5:3 G5:2 D5:4 F5:4 |
B6  C7             | E5:3 G5:3 Bb5:2 C6:4 Bb5:4 |
B7  Fmaj7          | A5:6 G5:2 F5:4 E5:4 |
B8  A7sus4・A7     | D5:4 E5:4 C#5:4 E5:4 |

@song bgm_battle part=break ins=ins_fm_brass meter=4/4
C1  Ebmaj7(#11)    | G5:8 A5:8 |
C2  Dm9            | F5:8 E5:8 |
C3  Ebmaj7         | Bb5:6 G5:2 D5:8 |
C4  Dm9            | C5:8 -:8 |
C5  Bbmaj7         | D5:2 F5:2 A5:2 D6:2 C6:4 A5:4 |
C6  C#dim7         | Bb5:2 G5:2 E5:2 C#5:2 E5:4 G5:4 |
C7  Dm/A           | F5:4 A5:4 D6:4 F6:4 |
C8  A7alt          | Eb6:4 C#6:4 Bb5:4 G5:4 |
`;

export const BATTLE_CHORDS = `
Dm = D F A
Dm9 = D F A C E
Dm7 = D F A C
Bbmaj7 = Bb D F A
Gm7 = G Bb D F
C6 = C E G A
C7 = C E G Bb
Gm9 = G Bb D F A
Fmaj7 = F A C E
A7(b13) = A C# G F
A7sus4 = A D E G
A7 = A C# E G
E7(#9) = E G# B D G
Ebmaj7(#11) = Eb G Bb D A
Ebmaj7 = Eb G Bb D
C = C E G
C#dim7 = C# E G Bb
Am7 = A C E G
Dm/A = D F /A
A7alt = A C# G Bb Eb
`;

export const battle = score(BATTLE_MML, BATTLE_CHORDS);

// The town chime asked once in the break: in the bar the brass leaves empty,
// a bell climbs the question over Dm9 (11–5–♭7–9) and hangs on the 9th while
// the band waits for the tsukkomi.
const BATTLE_CHIME = chimeQuote(`
@song bgm_battle part=chime ins=ins_fm_vibes meter=4/4
C4  Dm9            | -:8 G5:2 A5:2 C6:2 E6:2 |
`);

export const BATTLE_LOOP = [
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8',
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8',
];

export const SLAP_A = "R:2 R':1 R:1 -:2 R:2 R':2 5:2 R:1 5:1 R':2";

/** Mark a part whose notes follow `kire` (re-scheduled when kire changes, 7.2). */
export const kireAware = (p: PartDef): PartDef => ({ ...p, kireAware: true });

/** The kire layers (7.2), shared by bgm_battle / bgm_midboss / bgm_boss. */
export function kireLayers(o: { bassBoost?: never; arpLo?: number; transpose?: (b: BarCtx) => number } = {}): PartDef[] {
  return [
    drums({
      id: 'kire_hat',
      kit: {
        drm_hat_c: (b) => (b.p.kire >= 2 ? '.x.x.x.x.x.x.x.x' : null),
        drm_hat_o: (b) => (b.p.kire >= 2 ? '..............x.' : null),
      },
      vel: { drm_hat_c: 0.6, drm_hat_o: 0.75 },
      fx: { pan: -0.15 },
    }),
    drums({ id: 'kire_clap', kit: { drm_clap: (b) => (b.p.kire >= 3 ? '....x.......x...' : null) } }),
    arp({
      id: 'kire_arp',
      ins: 'ins_lead_p12',
      rate: 1,
      shape: ['R', '3', '5', '8'],
      rootLo: o.arpLo ?? 67,
      o: { vol: 0.035 },
      gate: 0.7,
      transpose: o.transpose,
      when: (b) => b.p.kire >= 3,
      fx: { pan: 0.3, lp: 6000 },
    }),
  ].map(kireAware);
}

/** Main hat pattern with the kire-2 open hat on step 14. */
export const hat8 = (b: BarCtx) => (b.p.kire >= 2 ? 'x.x.x.x.x.x.x...' : 'x.x.x.x.x.x.x.x.');

function battleDef(): SongDef {
  const AB = (b: BarCtx) => b.section === 'A' || b.section === 'B' || b.label === 'BI2';
  const kireUp = (b: BarCtx) => (b.p.kire >= 3 ? 12 : 0);
  const parts: PartDef[] = [
    melody({ id: 'lead', ins: 'ins_lead_p25', bars: battle.part('lead'), o: { vol: 0.09 }, fx: { delay: { steps: 3, fb: 0.22, send: 0.18 } } }),
    melody({ id: 'break', ins: 'ins_fm_brass', bars: battle.part('break'), o: { vol: 0.08 }, gate: 0.94 }),
    melody({ id: 'chime', ins: 'ins_fm_vibes', bars: BATTLE_CHIME, o: { vol: 0.06, rev: 0.4 }, fx: { pan: 0.25 } }),
    // stabs: the hanko rhythm in the intro, then A / B
    comp({
      id: 'stab',
      ins: 'ins_fm_brass',
      rhythm: (b) => (b.label === 'BI2' ? 'x..x..x...x.x.x.' : b.section === 'A' ? 'x..x..x...x.....' : b.section === 'B' ? '..x...x...x...x.' : null),
      notes: 'top3',
      len: (_i) => 2,
      gate: 0.6,
      o: { vol: 0.05 },
      fx: { pan: -0.2 },
    }),
    pads({ id: 'pad', when: (b) => b.section === 'C', o: { vol: 0.03 }, fx: { lp: 1600, q: 0.8, lfo: { rate: 0.15, depth: 300 } } }),
    kireAware(melody({ id: 'bass_intro', ins: 'ins_fm_slap', bars: battle.part('intro'), gate: 0.85, transpose: kireUp })),
    kireAware(bass({
      id: 'bass',
      ins: 'ins_fm_slap',
      pattern: (b) => (b.section === 'C' ? "R:6 R:2 -:4 5:2 R':2" : SLAP_A),
      when: (b) => b.label !== 'BI1',
      transpose: kireUp,
    })),
    kireAware(drums({
      id: 'drums',
      kit: {
        drm_kick: (b) => (b.label === 'BI1' ? 'x.......x.......' : AB(b) ? 'x.....x...x..x..' : 'x.........x.....'),
        drm_snare_tight: (b) =>
          b.label === 'BI1' ? '....g.g.x.x.xxXX' : b.label === 'C8' ? '....g.g.x.xxxxXX' : AB(b) ? '....x..g....x..g' : '........x.......',
        drm_hat_c: (b) => (b.label === 'BI1' ? null : AB(b) ? hat8(b) : 'x...x...x...x...'),
      },
      vel: { drm_kick: 1.1 },
    })),
    hits('fx', [{ when: (b, s) => b.label === 'C1' && s === 0, fn: (_b, t, rt) => DRM.drm_crash({ t, vel: 1, dest: rt.input, rev: rt.rev }) }]),
    ...kireLayers(),
  ];
  return {
    id: 'bgm_battle',
    title: '通常戦',
    bpm: 152,
    bars: battle.bars,
    intro: ['BI1', 'BI2'],
    loop: BATTLE_LOOP,
    parts,
    gainDb: 0,
    reverb: { len: 1.1, decay: 3.4, level: 0.22 },
    battle: true,
  };
}

export const BATTLE_DEF = registerSong(battleDef());
