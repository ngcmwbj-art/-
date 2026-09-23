// bgm_title / bgm_title_clear (40_audio 5.1). A frozen sunset panorama: pads
// and a worn music box, the town chime cut off at its fourth note, and a
// clock that ticks every 1.000 s regardless of the 76 BPM (and skips a beat).

import { PaChain } from '../engine';
import { chimeNote, DRM } from '../instruments';
import { bass, hits, melody, pads, type PartDef, type SongDef, type SongPlayer } from '../sequencer';
import { bar, registerSong, score } from './common';

export const TITLE_MML = `
@song bgm_title part=musicbox ins=ins_musicbox meter=4/4
I1  Fmaj7(#11)     | E6:4 C6:4 B5:8 |
I2  Cmaj7/G        | A5:4 G5:4 E5:8 |

@song bgm_title part=melody ins=ins_musicbox meter=4/4
L1  Fmaj7(#11)     | E5:8 G5:4 A5:4 |
L2  Em7            | B5:6 A5:2 G5:8 |
L3  Dm9            | F5:4 E5:4 D5:4 A4:4 |
L4  Cmaj7          | E5:4 D5:2 C5:2 G4:8 |
L5  Fmaj7          | A4:4 C5:4 E5:4 G5:4 |
L6  E7(b13)        | G#5:4 C6:4 B5:8 |
L7  Am9            | A5:6 G5:2 E5:4 C5:4 |
L8  Abmaj7(#11)    | D5:8 C5:4 Eb5:4 |
L9  Fmaj7          | E5:12 C5:4 |
L10 G/F            | D5:8 B4:4 G4:4 |
L11 Em7            | E5:4 G5:4 D6:4 B5:4 |
L12 A7(b9)         | C#6:6 Bb5:2 G5:8 |
L13 Dm9            | A5:4 F5:4 E5:4 D5:4 |
L14 Fm6            | Ab5:6 F5:2 D5:8 |
L15 Cmaj7/G        | E5:4 G5:4 C6:8 |
L16 G7sus4         | D6:4 C6:4 G5:8 |
`;

export const TITLE_CHORDS = `
Fmaj7(#11) = F A C E B
Fmaj7 = F A C E
Em7 = E G B D
G/F = G B D /F
Dm9 = D F A C E
A7(b9) = A C# E G Bb
Cmaj7 = C E G B
Fm6 = F Ab C D
E7(b13) = E G# D C
Cmaj7/G = C E B /G
Am9 = A C E G B
G7sus4 = G C D F
Abmaj7(#11) = Ab C Eb G D
`;

const title = score(TITLE_MML, TITLE_CHORDS);
const LOOP = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12', 'L13', 'L14', 'L15', 'L16'];
title.bars.set('I3', bar('I3', 16, []));
title.bars.set('I3b', bar('I3b', 16, []));
title.bars.set('I4', bar('I4', 8, []));

function pa(sp: SongPlayer): PaChain {
  let p = sp.state.pa as PaChain | undefined;
  if (!p) {
    p = new PaChain(sp.g.ctx, sp.mix);
    sp.state.pa = p;
  }
  return p;
}

const G4 = 67, A4 = 69, C5 = 72, E5 = 76, D5 = 74;

function titleDef(clear: boolean): SongDef {
  const parts: PartDef[] = [
    melody({ id: 'mbox', ins: 'ins_musicbox', bars: [...title.part('musicbox'), ...title.part('melody')], o: { vol: 0.09 } }),
    melody({
      id: 'flute',
      ins: 'ins_lead_sq50',
      bars: title.part('melody'),
      transpose: -12,
      o: { vol: 0.05, lp: 1800 },
      when: (b) => b.section === 'L' && b.num >= 9,
      gate: 0.94,
    }),
    pads({
      id: 'pad',
      when: (b) => b.section === 'L' || b.label === 'I1' || b.label === 'I2',
      o: (b) => ({
        vol: 0.035,
        attack: b.label === 'I1' ? 2.0 : b.label === 'L1' ? b.stepDur * 16 : 0.6,
        // I3: the pad vanishes on the downbeat (R 200 ms)
        release: b.label === 'I2' ? 0.2 : 1.2,
      }),
      fx: { lp: 1400, q: 0.8, lfo: { rate: 0.15, depth: 300 } },
    }),
    bass({ id: 'sub', ins: 'ins_sub', pattern: 'R:16', when: (b) => b.section === 'L', o: { vol: 0.1 } }),
    hits('chime', [
      {
        when: (b, s) => (b.label === 'I3' || b.label === 'I3b') && s % 4 === 0,
        fn: (b, t, rt, s) => {
          const p = pa(rt.song);
          const i = s / 4;
          if (b.label === 'I3') {
            const m = [G4, A4, C5, E5][i];
            const last = i === 3;
            chimeNote(t, m, p.input, p.detune, last && !clear ? 2.0 : b.stepDur * 3.8, 0.12);
            // the fourth note is cut 300 ms in, echoes and all
            if (last && !clear) p.cutNow(t + 0.3, 0.2);
          } else {
            const m = [D5, C5, A4, C5][i];
            chimeNote(t, m, p.input, p.detune, i === 3 ? 2.0 : b.stepDur * 3.8, 0.12);
          }
        },
      },
    ]),
  ];
  return {
    id: clear ? 'bgm_title_clear' : 'bgm_title',
    title: clear ? 'タイトル（クリア後）' : 'タイトル',
    bpm: 76,
    bars: title.bars,
    intro: clear ? ['I1', 'I2', 'I3', 'I3b'] : ['I1', 'I2', 'I3', 'I4'],
    loop: LOOP,
    parts,
    gainDb: -6,
    reverb: { len: 2.4, decay: 2.8, level: 0.34 },
    setup(sp) {
      pa(sp);
    },
    onStop(sp, at, fade) {
      (sp.state.pa as PaChain | undefined)?.detune.stop(at + fade + 3);
    },
    onBar(sp, b) {
      if (b.label === 'L1' && sp.state.clockAt === undefined) sp.state.clockAt = b.t0;
    },
    // the town clock: every 1.000 s, deaf to the tempo; every 4th tick is missing
    pumpFree(sp, until) {
      let t = sp.state.clockAt as number | undefined;
      if (t === undefined || sp.stopped) return;
      let n = (sp.state.clockN as number) ?? 0;
      while (t < until) {
        if (n % 4 !== 3) DRM.drm_tick({ t, vel: 1, vol: 0.02, dest: sp.mix, rev: sp.wet });
        t += 1.0;
        n++;
      }
      sp.state.clockAt = t;
      sp.state.clockN = n;
    },
  };
}

export const TITLE_DEFS = [registerSong(titleDef(false)), registerSong(titleDef(true))];
