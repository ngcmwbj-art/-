// Indoor songs that follow the town's stage (40_audio 5.2 bgm_home, 5.5
// bgm_shop): the same 5.4 transforms as the town — half a step down with a
// wobble at stage 1; slower, with holes, echoes and reverse pads at stage 2.

import { bass, bed, comp, drums, melody, type BarCtx, type PartDef, type SongDef } from '../sequencer';
import { brushSwirl } from '../instruments';
import { chimeQuote, registerSong, score } from './common';
import { reversePads } from './town';

const st = (b: BarCtx) => (b.p.stage >= 3 ? 0 : b.p.stage);

// ---------------------------------------------------------------------------
// bgm_home — ミナトの家 (6/8, 付点4分 = 54)

export const HOME_MML = `
@song bgm_home part=melody ins=ins_fm_epiano meter=6/8
H1  Fmaj7          | C5:6 A4:2 G4:2 A4:2 |
H2  Dm9            | F5:6 E5:4 D5:2 |
H3  Bbmaj7         | D5:4 C5:2 A4:6 |
H4  C7sus4         | G4:6 -:2 F4:2 G4:2 |
H5  Am7            | A4:4 C5:2 E5:4 G5:2 |
H6  D7(9)          | F#5:6 E5:4 C5:2 |
H7  Gm9            | D5:4 Bb4:2 A4:4 F4:2 |
H8  C9sus4         | G4:12 |
H9  Bbmaj7         | F5:6 D5:2 C5:2 D5:2 |
H10 A7(b13)        | C#5:6 F5:6 |
H11 Dm7            | E5:4 D5:2 A4:4 F4:2 |
H12 Dbmaj7         | C5:6 Ab4:4 F4:2 |
H13 Gm7            | Bb4:4 D5:2 F5:4 G5:2 |
H14 C7             | E5:6 D5:2 C5:2 Bb4:2 |
H15 Fmaj7          | A4:12 |
H16 Gbmaj7         | Bb4:6 -:6 |
`;

export const HOME_CHORDS = `
Fmaj7 = F A C E
Dm9 = D F A C E
Bbmaj7 = Bb D F A
C7sus4 = C F G Bb
Am7 = A C E G
D7(9) = D F# A C E
Gm9 = G Bb D F A
C9sus4 = C F G Bb D
A7(b13) = A C# G F
Dm7 = D F A C
Dbmaj7 = Db F Ab C
Gm7 = G Bb D F
C7 = C E G Bb
Gbmaj7 = Gb Bb Db F
`;

const home = score(HOME_MML, HOME_CHORDS);

function homeDef(): SongDef {
  const late = (b: BarCtx) => b.num >= 9;
  const parts: PartDef[] = [
    melody({
      id: 'melody',
      ins: 'ins_fm_epiano',
      bars: home.part('melody'),
      o: { vol: 0.07, index: 1.5 },
      gate: 0.95,
      keep: (b, e) => !(st(b) === 2 && e.step >= 8 && e.step <= 11),
      fx: { delay: { steps: 3, fb: 0.45, send: 0 } },
    }),
    melody({
      id: 'double',
      ins: 'ins_lead_p12',
      bars: home.part('melody'),
      o: (b) => ({ vol: 0.035, lp: 2000, vib: st(b) >= 1 ? { rate: 5, depth: 16, delay: 0.2 } : undefined }),
      when: (b) => late(b),
      keep: (b, e) => !(st(b) === 2 && e.step >= 8 && e.step <= 11),
      gate: 0.9,
    }),
    comp({ id: 'chords', ins: 'ins_fm_epiano', rhythm: 'x.....x.....', notes: 'full', len: 6, o: { vol: 0.04, index: 1.2 }, fx: { tremolo: { rate: 4.5, depth: 0.12 }, autopan: { rate: 0.1, depth: 0.25 } } }),
    ...[reversePadsWhen((b) => st(b) === 2)],
    bass({ id: 'bass', ins: 'ins_fm_bass', pattern: (b) => (st(b) === 2 ? 'R:12' : 'R:6 5:6'), o: { index: 1.6, indexEnd: 0.5 } }),
    drums({
      id: 'drums',
      kit: {
        drm_shaker: (b) => (st(b) === 2 ? null : 'x.g.x.x.g.x.'),
        drm_kick_soft: (b) => (st(b) === 2 || late(b) ? 'x...........' : null),
        drm_rim: (b) => (st(b) === 2 || late(b) ? '......x.....' : null),
      },
      vel: { drm_shaker: 0.9 },
    }),
  ];
  return {
    id: 'bgm_home',
    title: 'ミナトの家',
    bpm: 81,
    bars: home.bars,
    intro: [],
    loop: ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10', 'H11', 'H12', 'H13', 'H14', 'H15', 'H16'],
    parts,
    gainDb: -4,
    reverb: { len: 0.9, decay: 4, level: 0.24 },
    stageAware: true,
    tempo: (p) => (p.stage === 2 ? 81 * 0.9 : 81),
    onBar: stageEcho('melody'),
  };
}

/** Stage-2 echo on the lead part: open the delay send per bar. */
function stageEcho(partId: string) {
  return (sp: import('../sequencer').SongPlayer, b: BarCtx) => {
    const rt = sp.partRt(partId);
    if (rt?.delaySend) rt.delaySend.gain.setTargetAtTime(st(b) === 2 ? 0.42 : 0, b.t0, 0.05);
    const vib = st(b) >= 1 ? 2 : 1;
    sp.state.vibMul = vib;
  };
}

function reversePadsWhen(pred: (b: BarCtx) => boolean): PartDef {
  const p = reversePads(0.035);
  return { ...p, when: pred };
}

// ---------------------------------------------------------------------------
// bgm_shop — 屋内の店 (108, shuffle, last bar 2/4)

export const SHOP_MML = `
@song bgm_shop part=melody ins=ins_fm_marimba meter=4/4
S1  Gmaj7          | B4:2 D5:2 -:2 B4:2 D5:2 E5:2 D5:4 |
S2  Em7            | G4:2 B4:2 -:2 G4:2 B4:2 D5:2 B4:4 |
S3  Am7            | C5:2 E5:2 -:2 C5:2 E5:2 G5:2 E5:4 |
S4  D7             | F#5:4 E5:2 D5:2 C5:4 A4:4 |
S5  Bm7            | D5:2 F#5:2 -:2 D5:2 A5:4 F#5:4 |
S6  E7             | G#5:4 F#5:2 E5:2 D5:4 B4:4 |
S7  Am7            | C5:2 C5:2 E5:2 C5:2 A4:4 G4:4 |
S8  D7             | F#4:4 A4:4 C5:4 -:4 |
S9  Cmaj7          | E5:6 D5:2 E5:4 G5:4 |
S10 C#dim7         | G5:6 E5:2 C#5:4 Bb4:4 |
S11 Gmaj7/D        | B4:4 D5:4 F#5:4 A5:4 |
S12 E7(b9)         | G#5:6 F5:2 D5:4 B4:4 |
S13 Am7            | C5:4 E5:4 A5:4 G5:4 |
S14 D7             | F#5:2 G5:2 F#5:2 E5:2 D5:4 C5:4 |
S15 G6             | B4:4 D5:4 E5:4 D5:4 |
S16 [2/4] Ab7      | C5:2 Eb5:2 Gb5:4 |

@song bgm_shop part=bass ins=ins_tri_bass meter=4/4
S1  Gmaj7          | G2:4 B2:4 D3:4 E3:4 |
S2  Em7            | E2:4 G2:4 B2:4 D3:4 |
S3  Am7            | A2:4 C3:4 E3:4 G3:4 |
S4  D7             | D3:4 C3:4 A2:4 F#2:4 |
S5  Bm7            | B2:4 D3:4 F#3:4 A2:4 |
S6  E7             | E2:4 G#2:4 B2:4 D3:4 |
S7  Am7            | A2:4 E3:4 C3:4 A2:4 |
S8  D7             | D2:4 F#2:4 A2:4 C3:4 |
S9  Cmaj7          | C3:4 B2:4 A2:4 G2:4 |
S10 C#dim7         | C#3:4 E3:4 G3:4 E3:4 |
S11 Gmaj7/D        | D3:4 B2:4 A2:4 F#2:4 |
S12 E7(b9)         | E2:4 G#2:4 B2:4 D3:4 |
S13 Am7            | A2:4 G2:4 E2:4 C3:4 |
S14 D7             | D3:4 A2:4 F#2:4 D2:4 |
S15 G6             | G2:4 A2:4 B2:4 D3:4 |
S16 [2/4] Ab7      | Ab2:4 Eb3:4 |
`;

export const SHOP_CHORDS = `
Gmaj7 = G B D F#
Em7 = E G B D
Am7 = A C E G
D7 = D F# A C
Bm7 = B D F# A
E7 = E G# B D
Cmaj7 = C E G B
C#dim7 = C# E G Bb
Gmaj7/D = G B F# /D
E7(b9) = E G# B D F
G6 = G B D E
Ab7 = Ab C Eb Gb
`;

const shop = score(SHOP_MML, SHOP_CHORDS);

// S8 rests on beat 4 (the half cadence): the bell over the shop door rings the
// town question, fitted to D7 (A–B–D–F#: 5–13–R–3), then the tune goes on.
const SHOP_CHIME = chimeQuote(`
@song bgm_shop part=chime ins=ins_fm_vibes meter=4/4
S8  D7             | -:12 A5:1 B5:1 D6:1 F#6:1 |
`);

function shopDef(): SongDef {
  const late = (b: BarCtx) => b.num >= 9;
  const last = (b: BarCtx) => b.label === 'S16';
  const hole = (b: BarCtx, step: number) => st(b) === 2 && step >= 8 && step <= 11;
  const parts: PartDef[] = [
    melody({ id: 'melody', ins: 'ins_fm_marimba', bars: shop.part('melody'), o: { vol: 0.1 }, keep: (b, e) => !hole(b, e.step), fx: { delay: { steps: 3, fb: 0.45, send: 0 } } }),
    // the shopkeeper humming an octave below
    melody({
      id: 'hum',
      ins: 'ins_lead_p25',
      bars: shop.part('melody'),
      transpose: -12,
      o: (b) => ({ vol: 0.045, lp: 2500, vibMul: st(b) >= 1 ? 2 : 1 }),
      when: late,
      gate: 0.9,
      keep: (b, e) => !hole(b, e.step),
    }),
    melody({ id: 'chime', ins: 'ins_fm_vibes', bars: SHOP_CHIME, o: { vol: 0.036, rev: 0.35 }, fx: { pan: 0.3 } }),
    comp({
      id: 'vibes',
      ins: 'ins_fm_vibes',
      rhythm: (b) => (last(b) ? 'x.......' : 'x.....x.........'),
      notes: 'top3',
      len: (i) => (i === 0 ? 3 : 2),
      o: { vol: 0.04 },
      fx: { tremolo: { rate: 5.5, depth: 0.25 }, pan: -0.2 },
    }),
    reversePadsWhen((b) => st(b) === 2),
    // walking bass; 段階2 walks at half the pace (beats 1 and 3)
    melody({ id: 'bass', ins: 'ins_tri_bass', bars: shop.part('bass'), gate: 0.88, o: { vol: 0.2 }, keep: (b, e) => st(b) !== 2 || e.step % 8 === 0 }),
    drums({
      id: 'drums',
      kit: {
        drm_ride: (b) => (st(b) === 2 ? null : last(b) ? 'x...x.x.' : 'x...x.x.x...x.x.'),
        drm_snare_brush: (b) => (st(b) === 2 ? null : last(b) ? '....x...' : '....x.......x...'),
        drm_kick_soft: (b) => (last(b) ? 'x.......' : 'x.......x.......'),
        drm_rim: (b) => (st(b) === 2 ? (last(b) ? '....x...' : '............x...') : null),
      },
      vel: { drm_kick_soft: 0.6 },
    }),
    bed('swirl', (t, dest) => brushSwirl(t, dest, 0.008)),
  ];
  return {
    id: 'bgm_shop',
    title: '屋内の店',
    bpm: 108,
    swing: { kind: '8', amount: 0.64 },
    bars: shop.bars,
    intro: [],
    loop: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14', 'S15', 'S16'],
    parts,
    gainDb: -4,
    reverb: { len: 0.8, decay: 4.2, level: 0.22 },
    stageAware: true,
    tempo: (p) => (p.stage === 2 ? 108 * 0.9 : 108),
    onBar(sp, b) {
      stageEcho('melody')(sp, b);
      // 段階2: a radio far away
      sp.filter.frequency.setTargetAtTime(st(b) === 2 ? 2200 : 20000, b.t0, 0.2);
      const sw = sp.partRt('swirl');
      if (sw) sw.input.gain.setTargetAtTime(st(b) === 2 ? 0 : sw.base, b.t0, 0.2);
    },
  };
}

export const INDOOR_DEFS = [registerSong(homeDef()), registerSong(shopDef())];
