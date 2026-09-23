// Jingles (40_audio 6): victory (+ its afterglow loop), the report card,
// key items, a new friend (with a bell that refuses to ring), and game over.

import { DRM, INS } from '../instruments';
import { sfxTable } from '../registry';
import { bass, drums, hits, melody, pads, type PartDef, type SongDef } from '../sequencer';
import { bar, registerSong, score } from './common';

const JINGLE_CHORDS = `
C = C E G
Cmaj7 = C E G B
Fmaj7 = F A C E
Em7 = E G B D
Fmaj7/G = F A C E /G
Fmaj9 = F A C E G
G6 = G B D E
D = D F# A
G = G B D
Dadd9 = D F# A E
F = F A C
Bb = Bb D F
F/C = F A /C
C7 = C E G Bb
Am7 = A C E G
Fmaj7(add9) = F A C E G
`;

// ---------------------------------------------------------------------------
// bgm_jingle_victory — 1.5 s, then the afterglow loop

const VICTORY_MML = `
@song bgm_jingle_victory part=lead ins=ins_lead_p25 meter=free
V1  C              | C5:1 E5:1 G5:1 A5:1 C6:2 G5:1 C6:8 |
@song bgm_jingle_victory part=brass ins=ins_fm_brass meter=free
V1  C              | [E4 G4 C5]:2 -:4 [F4 A4 D5]:1 [E4 G4 C5 E5]:8 |
@song bgm_jingle_victory part=bass ins=ins_fm_slap meter=free
V1  C              | C3:2 -:4 D3:1 C2:8 |
@song bgm_jingle_victory part=tail ins=ins_musicbox meter=4/4
T1  Cmaj7          | G5:8 E5:8 |
T2  Fmaj7          | A5:8 C6:8 |
T3  Em7            | B5:8 G5:8 |
T4  Fmaj7/G        | A5:12 -:4 |
`;

const victory = score(VICTORY_MML, JINGLE_CHORDS);
victory.bars.get('V1')!.bpm = 150;
victory.bars.set('GAP', bar('GAP', 1, [], 50)); // 0.3 s of air before the afterglow

function victoryDef(): SongDef {
  const tailParts = ['tail', 'tail_pad', 'tail_sub'];
  const parts: PartDef[] = [
    melody({ id: 'lead', ins: 'ins_lead_p25', bars: victory.part('lead'), o: { vol: 0.09 }, gate: 0.92 }),
    melody({ id: 'brass', ins: 'ins_fm_brass', bars: victory.part('brass'), o: { vol: 0.06 }, gate: 0.9 }),
    melody({ id: 'bass', ins: 'ins_fm_slap', bars: victory.part('bass'), gate: 0.9 }),
    drums({
      id: 'drums',
      kit: {
        drm_snare_tight: (b) => (b.label === 'V1' ? '.gxxXX.........' : null),
        drm_kick: (b) => (b.label === 'V1' ? '.......X.......' : null),
        drm_crash: (b) => (b.label === 'V1' ? '.......X.......' : null),
      },
    }),
    hits('fx', [
      // the "みました" stamp is part of the jingle (6.2)
      { when: (b, s) => b.label === 'V1' && s === 0, fn: (_b, t, rt) => sfxTable.get('se_stamp_heavy')?.({ at: t, vol: 0.8, dest: rt.input } as never) },
      // step 7: a music-box sparkle C6 E6 G6, 20 ms apart
      {
        when: (b, s) => b.label === 'V1' && s === 7,
        fn: (_b, t, rt) =>
          [84, 88, 91].forEach((m, i) =>
            INS.ins_musicbox({ t: t + i * 0.02, midi: m, dur: 0.1, vel: 1, dest: rt.input, rev: rt.rev, o: { vol: 0.07, vib: i === 0 ? { rate: 6, depth: 15, delay: 0.2 } : undefined } }),
          ),
      },
    ]),
    melody({ id: 'tail', ins: 'ins_musicbox', bars: victory.part('tail'), o: { vol: 0.09 } }),
    pads({ id: 'tail_pad', when: (b) => b.section === 'T', o: { vol: 0.025 }, fx: { lp: 1400, q: 0.8 } }),
    bass({ id: 'tail_sub', ins: 'ins_sub', pattern: 'R:16', when: (b) => b.section === 'T', o: { vol: 0.1 } }),
  ];
  return {
    id: 'bgm_jingle_victory',
    title: '勝利',
    bpm: 76,
    bars: victory.bars,
    intro: ['V1', 'GAP'],
    loop: ['T1', 'T2', 'T3', 'T4'],
    parts,
    gainDb: -1,
    reverb: { len: 1.6, decay: 3, level: 0.28 },
    jingle: 'replace',
    setup(sp) {
      for (const id of tailParts) sp.partGain(id, 0, 0.001, sp.startTime);
    },
    onBar(sp, b) {
      if (b.label === 'T1' && !sp.state.tailOn) {
        sp.state.tailOn = true;
        for (const id of tailParts) {
          const rt = sp.partRt(id)!;
          rt.input.gain.setValueAtTime(0, b.t0);
          rt.input.gain.linearRampToValueAtTime(0.5, b.t0 + 1.0);
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// bgm_jingle_levelup — the report card (2.04 s on the stamp grid)

const LEVELUP_MML = `
@song bgm_jingle_levelup part=lead ins=ins_fm_marimba meter=free
LV1 Fmaj9・G6・C   | G5:1 G5:1 A5:1 C6:2 A5:1 C6:2 E6:1 D6:1 C6:1 D6:1 E6:5 |
@song bgm_jingle_levelup part=brass ins=ins_fm_brass meter=free
LV1 Fmaj9・G6・C   | [F4 A4 C5 E5]:8 [G4 B4 D5 E5]:4 [C5 E5 G5]:5 |
@song bgm_jingle_levelup part=bass ins=ins_fm_bass meter=free
LV1 Fmaj9・G6・C   | F2:8 G2:4 C2:5 |
`;
const levelup = score(LEVELUP_MML, JINGLE_CHORDS);
for (const b of levelup.bars.values()) b.bpm = 125;

function levelupDef(): SongDef {
  return {
    id: 'bgm_jingle_levelup',
    title: 'レベルアップ（通知表）',
    bpm: 125,
    bars: levelup.bars,
    intro: ['LV1'],
    loop: [],
    parts: [
      melody({ id: 'lead', ins: 'ins_fm_marimba', bars: levelup.part('lead'), o: { vol: 0.11 } }),
      melody({ id: 'lead2', ins: 'ins_lead_sq50', bars: levelup.part('lead'), o: { vol: 0.05 }, gate: 0.8 }),
      melody({ id: 'brass', ins: 'ins_fm_brass', bars: levelup.part('brass'), o: { vol: 0.05 }, gate: 0.94 }),
      melody({ id: 'bass', ins: 'ins_fm_bass', bars: levelup.part('bass'), gate: 0.94 }),
      drums({
        id: 'drums',
        kit: {
          drm_tom_low: 'X...x.......X....',
          drm_woodblock: '........xxxx.....',
          drm_crash: '............X....',
          drm_triangle: '............X....',
        },
        vel: { drm_crash: 0.5 },
      }),
    ],
    gainDb: -1,
    reverb: { len: 1.2, decay: 3, level: 0.25 },
    jingle: 'pause',
  };
}

// ---------------------------------------------------------------------------
// bgm_jingle_item — a key item (the hanko case pops open)

const ITEM_MML = `
@song bgm_jingle_item part=lead ins=ins_musicbox meter=free
IT1 D・G・Dadd9    | A4:1 D5:1 F#5:1 A5:1 G5:2 B5:2 A5:6 |
@song bgm_jingle_item part=chord ins=ins_fm_vibes meter=free
IT1 D・G・Dadd9    | [D4 F#4 A4]:4 [D4 G4 B4]:4 [D4 F#4 A4 E5]:6 |
@song bgm_jingle_item part=bass ins=ins_fm_bass meter=free
IT1 D・G・Dadd9    | D3:4 G2:4 D2:6 |
`;
const item = score(ITEM_MML, JINGLE_CHORDS);
for (const b of item.bars.values()) b.bpm = 132;

function itemDef(): SongDef {
  return {
    id: 'bgm_jingle_item',
    title: '大事なものの入手',
    bpm: 132,
    bars: item.bars,
    intro: ['IT1'],
    loop: [],
    parts: [
      melody({ id: 'lead', ins: 'ins_musicbox', bars: item.part('lead'), o: { vol: 0.1 } }),
      melody({ id: 'lead2', ins: 'ins_lead_p25', bars: item.part('lead'), o: { vol: 0.04 }, gate: 0.85 }),
      melody({ id: 'chord', ins: 'ins_fm_vibes', bars: item.part('chord'), o: { vol: 0.05 } }),
      melody({ id: 'bass', ins: 'ins_fm_bass', bars: item.part('bass'), gate: 0.9 }),
      drums({ id: 'drums', kit: { drm_woodblock: 'x.............', drm_triangle: '........x.....' } }),
      hits('sparkle', [
        {
          when: (b, s) => s === 8,
          fn: (_b, t, rt) => [86, 90, 93].forEach((m, i) => INS.ins_musicbox({ t: t + i * 0.03, midi: m, dur: 0.1, vel: 1, dest: rt.input, rev: rt.rev, o: { vol: 0.06 } })),
        },
      ]),
    ],
    gainDb: -2,
    reverb: { len: 1.4, decay: 3, level: 0.3 },
    jingle: 'pause',
  };
}

// ---------------------------------------------------------------------------
// bgm_jingle_join — a new friend (the bell goes "コッ" instead of "ゴーン")

const JOIN_MML = `
@song bgm_jingle_join part=lead ins=ins_fm_brass meter=free
J1  F・Bb・F/C・C7 | C5:2 F5:2 A5:2 C6:4 A5:1 C6:1 D6:2 C6:2 Bb5:2 G5:2 |
@song bgm_jingle_join part=chord ins=ins_fm_brass meter=free
J1  F・Bb・F/C・C7 | [F4 A4 C5]:6 [F4 Bb4 D5]:6 [F4 A4 C5]:4 [E4 G4 Bb4]:4 |
@song bgm_jingle_join part=bass ins=ins_fm_slap meter=free
J1  F・Bb・F/C・C7 | F2:6 Bb1:6 C2:4 C2:2 C3:2 |
`;
const join = score(JOIN_MML, JINGLE_CHORDS);
for (const b of join.bars.values()) b.bpm = 100;
join.bars.set('J2', bar('J2', 2, [], 100)); // the dud + 0.3 s of nothing
join.bars.set('J3', bar('J3', 4, [], 100)); // a soft Fadd9

function joinDef(): SongDef {
  return {
    id: 'bgm_jingle_join',
    title: '仲間になった',
    bpm: 100,
    bars: join.bars,
    intro: ['J1', 'J2', 'J3'],
    loop: [],
    parts: [
      melody({ id: 'lead', ins: 'ins_fm_brass', bars: join.part('lead'), o: { vol: 0.08 }, gate: 0.9 }),
      melody({ id: 'lead2', ins: 'ins_lead_p25', bars: join.part('lead'), o: { vol: 0.04 }, gate: 0.8 }),
      melody({ id: 'chord', ins: 'ins_fm_brass', bars: join.part('chord'), o: { vol: 0.045 }, gate: 0.9 }),
      melody({ id: 'bass', ins: 'ins_fm_slap', bars: join.part('bass'), gate: 0.88 }),
      drums({
        id: 'drums',
        kit: {
          drm_snare_march: (b) => (b.label === 'J1' ? 'X.x.x.x.X.x.x.x.XxXx' : null),
          drm_kick: (b) => (b.label === 'J1' ? 'x.......x.......x...' : null),
        },
      }),
      hits('end', [
        { when: (b, s) => b.label === 'J2' && s === 0, fn: (_b, t, rt) => sfxTable.get('se_bell_dud')?.({ at: t, vol: 1.2, dest: rt.input } as never) },
        {
          when: (b, s) => b.label === 'J3' && s === 0,
          fn: (_b, t, rt) =>
            [53, 60, 67, 69].forEach((m) => INS.ins_pad({ t, midi: m, dur: 0.15, vel: 1, dest: rt.input, rev: rt.rev, o: { vol: 0.03, attack: 0.15, release: 0.5 } })),
        },
      ]),
    ],
    gainDb: -1,
    reverb: { len: 1.4, decay: 3, level: 0.25 },
    jingle: 'pause',
  };
}

// ---------------------------------------------------------------------------
// bgm_jingle_gameover — "きょうは ここまで" (unresolved: G over F)

const GAMEOVER_MML = `
@song bgm_jingle_gameover part=melody ins=ins_musicbox meter=4/4
G1  Am7            | E5:4 D5:4 C5:4 A4:4 |
G2  Fmaj7(add9)    | G4:16 |
`;
const gameover = score(GAMEOVER_MML, JINGLE_CHORDS);

function gameoverDef(): SongDef {
  return {
    id: 'bgm_jingle_gameover',
    title: 'きょうは ここまで',
    bpm: 84,
    bars: gameover.bars,
    intro: ['G1', 'G2'],
    loop: [],
    parts: [
      melody({ id: 'melody', ins: 'ins_musicbox', bars: gameover.part('melody'), o: { vol: 0.1 } }),
      pads({ id: 'pad', o: { vol: 0.03, release: 2.4 }, fx: { lp: 1300, q: 0.8 } }),
      bass({ id: 'sub', ins: 'ins_sub', pattern: 'R:16', o: { vol: 0.1 } }),
    ],
    gainDb: -6,
    reverb: { len: 2.2, decay: 2.8, level: 0.34 },
    jingle: 'gameover',
  };
}

export const JINGLE_DEFS = [victoryDef(), levelupDef(), itemDef(), joinDef(), gameoverDef()].map(registerSong);
void DRM;
