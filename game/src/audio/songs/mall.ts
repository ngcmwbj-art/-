// bgm_mall — 閉店したモール (40_audio 5.6). A crumbling elevator-music bossa
// through a speaker no one has listened to for a year: tape wow, drop-outs,
// a CD that skips a beat (the 7/8 bar), a stuck chord, and a tape that stretches.

import { INS } from '../instruments';
import { bass, comp, drums, hits, melody, type BarCtx, type PartDef, type SongDef, type SongPlayer } from '../sequencer';
import { chimeQuote, registerSong, score } from './common';

export const MALL_MML = `
@song bgm_mall part=lead ins=ins_lead_sq50 meter=4/4
A1  Dbmaj9         | F5:6 Eb5:2 C5:8 |
A2  Bbm9           | Db5:4 C5:4 Ab4:8 |
A3  Ebm9・Ab13     | Gb5:4 F5:4 F5:4 Eb5:4 |
A4  Dbmaj7・Bb7(b9) | C5:8 D5:4 B4:4 |
A5  Gbmaj7(#11)    | Bb4:4 Db5:4 F5:4 C6:4 |
A6  Fm7・Bbm7      | Ab5:6 Eb5:2 Db5:4 F5:4 |
A7  Ebm7           | Gb5:4 F5:2 Eb5:2 Db5:8 |
A8  Ab7sus4・Ab7   | Db5:8 C5:4 -:4 |
B1  Amaj7          | E5:6 C#5:2 G#4:8 |
B2  Gbmaj7         | F5:6 Db5:2 Bb4:8 |
B3  Fm7・Bb7(b9)   | Ab4:4 C5:4 D5:4 B4:4 |
B4  [7/8] Emaj7    | D#5:6 B4:4 G#4:4 |
B5  Ebm9           | F5:8 Gb5:4 Bb5:4 |
B6  Ab13           | F5:12 Eb5:4 |
B7  Dmaj7          | F#5:8 A5:4 C#6:4 |
B8  Ab7sus4・Ab7   | Db6:6 C6:2 Ab5:8 |
`;

export const MALL_CHORDS = `
Dbmaj9 = Db F Ab C Eb
Bbm9 = Bb Db F Ab C
Ebm9 = Eb Gb Bb Db F
Ab13 = Ab C Eb Gb F
Dbmaj7 = Db F Ab C
Gbmaj7(#11) = Gb Bb Db F C
Bbm7 = Bb Db F Ab
Ab7sus4 = Ab Db Eb Gb
Amaj7 = A C# E G#
Gbmaj7 = Gb Bb Db F
Fm7 = F Ab C Eb
Bb7(b9) = Bb D F Ab B
Emaj7 = E G# B D#
Dmaj7 = D F# A C#
Ebm7 = Eb Gb Bb Db
Ab7 = Ab C Eb Gb
`;

const mall = score(MALL_MML, MALL_CHORDS);

// B1, the drop to A major ("closed"): while the lead holds G#4, a chime from
// the far end of the empty hall climbs the town question in A (E–F#–A–C#).
const MALL_CHIME = chimeQuote(`
@song bgm_mall part=chime ins=ins_fm_vibes meter=4/4
B1  Amaj7          | -:8 E5:2 F#5:2 A5:2 C#6:2 |
`);
const A = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'];
const B = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'];
const A2 = A.map((l) => `A'${l.slice(1)}`);
A.forEach((l, i) => mall.bars.set(A2[i], { ...mall.bars.get(l)!, label: A2[i] }));

const worn = (b: BarCtx) => b.section === "A'";
const alias = (l: string) => l.replace("'", '');

/** Speaker contact failure: the song filter dives to 350 Hz for one beat. */
function dropout(sp: SongPlayer, t: number, beat: number): void {
  const f = sp.filter.frequency;
  f.cancelScheduledValues(t);
  f.setValueAtTime(20000, t);
  f.exponentialRampToValueAtTime(350, t + 0.02);
  f.setValueAtTime(350, t + beat);
  f.exponentialRampToValueAtTime(20000, t + beat + 0.03);
}

function mallDef(): SongDef {
  const parts: PartDef[] = [
    melody({
      id: 'lead',
      ins: 'ins_lead_sq50',
      bars: mall.part('lead'),
      alias,
      transpose: (b) => (worn(b) ? -12 : 0),
      o: { vol: 0.07, lp: 3000, vib: { rate: 4.5, depth: 8, delay: 0.25 } },
      gate: 0.92,
      // A': every third note is gone (counted straight through from A'1)
      keep: (b, _e, rt) => {
        if (!worn(b)) return true;
        if (b.label === "A'1" && rt.state.wornBar !== b.barNo) {
          rt.state.wornBar = b.barNo;
          rt.state.n = 0;
        }
        const n = ((rt.state.n as number) ?? 0) + 1;
        rt.state.n = n;
        return n % 3 !== 0;
      },
      fx: { delay: { steps: 3, fb: 0.25, send: 0.12 } },
    }),
    melody({ id: 'chime', ins: 'ins_fm_vibes', bars: MALL_CHIME, o: { vol: 0.04, rev: 0.7 }, fx: { pan: -0.35, lp: 3500 } }),
    comp({ id: 'epiano', ins: 'ins_fm_epiano', rhythm: 'x.....x...x.....', notes: 'full', len: 'next', o: { vol: 0.045 }, fx: { tremolo: { rate: 4.5, depth: 0.12 }, autopan: { rate: 0.15, depth: 0.25 } } }),
    bass({
      id: 'bass',
      ins: 'ins_fm_fretless',
      pattern: (b) => (b.def.steps === 14 ? 'R:6 5:8' : 'R:6 5:2 5:6 R:2'),
      o: { vol: 0.15 },
      gate: 0.97,
    }),
    drums({
      id: 'drums',
      kit: {
        drm_rim: 'x..x..x...x..x..',
        drm_kick_soft: (b) => (worn(b) ? null : 'x.....x.x.....x.'),
        drm_shaker: 'xgxgxgxgxgxgxgxg',
      },
      vel: { drm_kick_soft: 1.2 },
    }),
    hits('glitch', [
      // drop-outs on beat 3 of A8, B8, A'8
      {
        when: (b, s) => (b.label === 'A8' || b.label === 'B8' || b.label === "A'8") && s === 8,
        fn: (b, t, rt) => dropout(rt.song, t, b.stepDur * 4),
      },
      // A'8 beats 3–4: the tape stretches (−300 cents in 400 ms, −6 dB)…
      {
        when: (b, s) => b.label === "A'8" && s === 8,
        fn: (_b, t, rt) => {
          const sp = rt.song;
          const d = sp.det.offset;
          d.cancelScheduledValues(t);
          d.setValueAtTime(sp.baseDetune, t);
          d.linearRampToValueAtTime(sp.baseDetune - 300, t + 0.4);
          sp.mix.gain.setValueAtTime(1, t);
          sp.mix.gain.linearRampToValueAtTime(0.5, t + 0.4);
        },
      },
      // …and snaps back at the top of the loop
      {
        when: (b, s) => b.label === 'A1' && s === 0 && b.barNo > 0,
        fn: (_b, t, rt) => {
          const sp = rt.song;
          sp.det.offset.cancelScheduledValues(t);
          sp.det.offset.setValueAtTime(sp.baseDetune, t);
          sp.mix.gain.cancelScheduledValues(t);
          sp.mix.gain.setValueAtTime(1, t);
        },
      },
      // once every three loops, a random bar's beat 3 sticks: the chord ×3 in 16ths
      {
        when: (b, s) => s === 8 && b.song.state.snagBar === b.barNo,
        fn: (b, t, rt) => {
          const chord = b.chordAt(8);
          const pcs = [...new Set(chord.tones)].slice(-3);
          for (let k = 0; k < 3; k++)
            for (const pc of pcs) {
              const m = 60 + ((pc - 60) % 12 + 12) % 12;
              INS.ins_fm_epiano({ t: t + k * b.stepDur, midi: m, dur: b.stepDur * 0.8, vel: 1, dest: rt.input, rev: rt.rev, det: rt.song.det, o: { vol: 0.045 } });
            }
        },
      },
    ]),
  ];
  return {
    id: 'bgm_mall',
    title: 'モール（閉店）',
    bpm: 100,
    bars: mall.bars,
    intro: [],
    loop: [...A, ...B, ...A2],
    parts,
    gainDb: -4,
    reverb: { len: 2.2, decay: 2.6, level: 0.3 },
    setup(sp) {
      // permanent tape wow & flutter
      sp.setTape(0.5, 12, 6.5, 3, 0.01, sp.startTime);
    },
    onBar(sp, b) {
      if (b.label === 'A1' && b.loop % 3 === 1) {
        // pick the bar that will stick during this loop
        sp.state.snagBar = b.barNo + 1 + Math.floor(Math.random() * 22);
      }
    },
  };
}

export const MALL_DEF = registerSong(mallDef());
