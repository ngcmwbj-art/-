// bgm_boss_madamada — ヒロスケ・ポコシャ戦 (63_ch3_audio 5.8), and
// bgm_jingle_yakisoban — ヤキソバン、出前に 参上 (5.7).
//
// bgm_boss_madamada: 138, B minor. 「親分を 起こさんで くれ」: the two are not
// villains, they stand in front to keep their boss asleep. Never frightening,
// never too hot. Stage 1 (ヒロスケ, boss_phase 1) marches on the snare — the
// planner's step; stage 2 (ポコシャ, boss_phase 2) trades it for fine rim
// sixteenths, ぴーちゃん on her rounds. The hotter ヤキソバン's teppan (teppan
// 0–3, 6.5), the more of it in the song (spitting sauce, the spatula), and at
// 3 ヒロスケ's march loosens (−4 dB).
//   · musicSting('yakisoban'): ヤキソバン chose an action — the next bar's tune
//     is M10 (A A D E) on the brass over a D bass, once.
//   · se_yakiimo (ヒロスケ's 「焼き芋 食うか？」): the next bar's tune goes to
//     the marimba (it warms everyone a little).
//   · kakaricho 3..0 (ポコシャ's stage: 係長's black balloons still up): the
//     song shrinks into itself — LP 900 Hz −6 dB, 1800 −4, 3600 −2, open —
//     and opens a step with every balloon a tsukkomi breaks.
//   · boss_phase 3 (決着: after muteMusic(0.43) and 「……自分は、悪く ない！」):
//     from the next bar the song turns to D major (P9 → P10 → PD on a soft
//     kick only); the battle stops it with stopBgm(2.0) two bars later.
//
// Never in it (16.1): the town chime's answer, 星見台's morning chime, M7.

import { dbToGain } from '../engine';
import { DRM, INS } from '../instruments';
import { songGainDb } from '../mix';
import { bass, drums, hits, melody, pads, type BarCtx, type PartDef, type SongDef, type SongPlayer } from '../sequencer';
import { kireLayers, teppanLayers } from './battle';
import { bar, registerSong, score } from './common';

export const MADAMADA_MML = `
@song bgm_boss_madamada part=lead ins=ins_lead_boss meter=4/4
P1  Bm             | F#5:4 B5:4 A5:4 F#5:4 |
P2  Gmaj7          | E5:8 D5:4 B4:4 |
P3  Em7            | A4:4 D5:4 F#5:4 A5:4 |
P4  F#7sus4        | B5:12 -:4 |
P5  Bm             | D6:4 C#6:4 B5:4 F#5:4 |
P6  Gmaj7          | G5:6 F#5:2 D5:8 |
P7  Em7            | E5:4 F#5:4 G5:4 A5:4 |
P8  F#7            | A#5:12 -:4 |
P9  Gmaj7          | B5:6 A5:2 F#5:8 |
P10 A              | E5:4 F#5:4 A5:8 |
P11 F#m7           | C#6:6 B5:2 A5:8 |
P12 Bm             | F#5:12 -:4 |
P13 Em7            | G5:4 A5:4 B5:4 D6:4 |
P14 A7             | C#6:8 A5:8 |
P15 Gmaj7          | F#5:4 E5:4 D5:4 B4:4 |
P16 F#7sus4        | C#5:12 -:4 |
PD  D              | A5:4 F#5:4 D5:8 |

@song bgm_boss_madamada part=yakisoban ins=ins_fm_brass meter=4/4
YB  D              | A4:2 A4:2 D5:2 E5:10 |
`;

export const MADAMADA_CHORDS = `
Bm = B D F#
Gmaj7 = G B D F#
Em7 = E G B D
F#7sus4 = F# B C# E
F#7 = F# A# C# E
A = A C# E
F#m7 = F# A C# E
A7 = A C# E G
D = D F# A
`;

export const madamada = score(MADAMADA_MML, MADAMADA_CHORDS);
madamada.bars.set('PI1', bar('PI1', 16, [[0, madamada.chords.get('Bm')!]]));
madamada.bars.set('PI2', bar('PI2', 16, [[0, madamada.chords.get('F#7sus4')!]]));

export const MADAMADA_LOOP = Array.from({ length: 16 }, (_, i) => `P${i + 1}`);
const BPM = 138;

const p2 = (b: BarCtx) => b.p.boss_phase === 2;
const fin = (b: BarCtx) => b.p.boss_phase >= 3;
const live = (b: BarCtx) => !b.inIntro;
const sting = (b: BarCtx) => b.data.sting === true;
const imo = (b: BarCtx) => b.data.imo === true;

/** 係長's balloons left → song LP (Hz) and dB (6.8). */
const SHRINK: [number, number][] = [
  [20000, 0],
  [3600, -2],
  [1800, -4],
  [900, -6],
];

function applyShrink(sp: SongPlayer, n: number): void {
  const [lp, db] = SHRINK[Math.max(0, Math.min(3, Math.round(n)))];
  const t = sp.g.ctx.currentTime;
  sp.filter.frequency.setTargetAtTime(lp, t, 0.12);
  sp.out.gain.setTargetAtTime(dbToGain(songGainDb(sp.def.id, sp.def.gainDb) + db), t, 0.12);
}

function padLp(sp: SongPlayer, heat: number): void {
  const f = sp.partRt('pad')?.state.filter as BiquadFilterNode | undefined;
  f?.frequency.setTargetAtTime(heat >= 2 ? 2000 : 1400, sp.g.ctx.currentTime, 0.1);
}

function madamadaDef(): SongDef {
  const tune = madamada.part('lead');
  const parts: PartDef[] = [
    melody({ id: 'lead', ins: 'ins_lead_boss', bars: tune, o: { vol: 0.08 }, when: (b) => live(b) && !sting(b) && !imo(b), fx: { delay: { steps: 3, fb: 0.18, send: 0.12 } } }),
    // 「焼き芋 食うか？」: one bar of the tune on the marimba
    melody({ id: 'lead_imo', ins: 'ins_fm_marimba', bars: tune, o: { vol: 0.07, rev: 0.25 }, when: (b) => live(b) && imo(b) && !sting(b) }),
    // ヤキソバン's turn: M10 on the brass for one bar
    melody({ id: 'yb', ins: 'ins_fm_brass', bars: madamada.part('yakisoban'), alias: () => 'YB', o: { vol: 0.08 }, gate: 0.92, when: (b) => live(b) && sting(b) }),
    pads({ id: 'pad', o: { vol: 0.025 }, fx: { lp: 1400, q: 0.7 }, when: live }),
    bass({ id: 'bass', ins: 'ins_fm_bass', pattern: 'R:4 R:4 5:4 R:4', o: { vol: 0.15 }, when: (b) => live(b) && !sting(b) }),
    hits('bass_yb', [
      // under M10 the bass goes to D (one bar)
      { when: (b, s) => live(b) && sting(b) && s % 4 === 0, fn: (_b, t, rt, s) => INS.ins_fm_bass({ t, midi: s === 8 ? 45 : 38, dur: 0.38, vel: 1, dest: rt.input, det: rt.song.det, o: { vol: 0.15 } }) },
    ]),
    // stage 1: ヒロスケ's march (−4 dB at teppan 3: his hands loosen); stage 2: ぴーちゃん's rim sixteenths
    drums({ id: 'march', kit: { drm_snare_march: (b) => (!fin(b) && !p2(b) ? '....x.x.....x...' : null) } }),
    drums({ id: 'rim', kit: { drm_rim: (b) => (live(b) && p2(b) ? 'xxxxxxxxxxxxxxxx' : null) }, vel: { drm_rim: 0.4 } }),
    drums({
      id: 'drums',
      kit: {
        drm_kick: (b) => (!fin(b) ? 'x.......x.......' : null),
        drm_kick_soft: (b) => (fin(b) ? 'x.......x.......' : null),
      },
    }),
    ...kireLayers(),
    ...teppanLayers(),
  ];
  return {
    id: 'bgm_boss_madamada',
    title: 'ヒロスケ・ポコシャ戦',
    bpm: BPM,
    bars: madamada.bars,
    intro: ['PI1', 'PI2'],
    loop: [...MADAMADA_LOOP, 'PD'],
    parts,
    gainDb: 0,
    // the old aquarium's corridor (suizoku, a little of it in the battle room)
    reverb: { len: 1.6, decay: 3.0, level: 0.24, hp: 220 },
    battle: true,
    setup(sp) {
      applyShrink(sp, sp.params.kakaricho);
    },
    route(sp, next) {
      if (next.intro) return;
      const label = sp.def.loop[next.i];
      if (sp.params.boss_phase >= 3) {
        // 決着: P9 → P10 → PD, and PD holds until the battle stops the song
        const prev = sp.position.label;
        const want = prev === 'P9' ? 'P10' : prev === 'P10' || prev === 'PD' ? 'PD' : 'P9';
        return want === label ? undefined : { intro: false, i: sp.def.loop.indexOf(want) };
      }
      if (label === 'PD') return { intro: false, i: 0 };
      return undefined;
    },
    onBar(sp, b) {
      if (sp.state.sting) {
        b.data.sting = true;
        sp.state.sting = undefined;
      } else if (sp.state.imo) {
        b.data.imo = true;
        sp.state.imo = undefined;
      }
    },
    onSfx(sp, id) {
      if (id === 'se_yakiimo') sp.state.imo = true;
    },
    onParam(sp, name, value, old) {
      if (name === 'kakaricho') applyShrink(sp, value);
      if (name === 'teppan') {
        padLp(sp, value);
        sp.partGain('march', value >= 3 ? 0.63 : 1, 0.2);
      }
      if (name === 'boss_phase' && value >= 3 && old < 3) {
        sp.jumpNext('P9');
        applyShrink(sp, 0);
      }
    },
  };
}

export const MADAMADA_DEF = registerSong(madamadaDef());

// ---------------------------------------------------------------------------
// bgm_jingle_yakisoban — ヤキソバン、出前に 参上 (63 5.7). 120, D major, once.
// Sauce spitting on the iron plate first (a bar of drm_jyu sixteenths,
// growing), two clangs of the spatula, then M10 (A A D E) on the brass and a
// D6/9 chord left ringing for the name: 「ヤキソバン、出前に 参上。」. A hero's
// entrance, and a little comic — a delivery man announcing himself.

const YAKISOBAN_MML = `
@song bgm_jingle_yakisoban part=brass ins=ins_fm_brass meter=4/4
Y1  D              | A4:2 A4:2 D5:2 E5:10 |
Y2  G/D            | -:4 F#5:4 A5:8 |
`;

const YAKISOBAN_CHORDS = `
D = D F# A
G/D = G B D /D
D6/9 = D F# A B E
`;

const yk = score(YAKISOBAN_MML, YAKISOBAN_CHORDS);
yk.bars.set('YR', bar('YR', 16, [[0, yk.chords.get('D')!]]));
yk.bars.set('YT', bar('YT', 12, [[0, yk.chords.get('D6/9')!]]));

function yakisobanDef(): SongDef {
  const parts: PartDef[] = [
    // the sauce on the plate: sixteenths, growing through the bar
    hits('jyu', [
      { when: (b) => b.label === 'YR', fn: (_b, t, rt, s) => DRM.drm_jyu({ t, vel: 0.25 + (s / 15) * 0.85, dest: rt.input, rev: rt.rev, pan: s % 2 ? 0.3 : -0.2 }) },
    ]),
    // 「カン、カン」
    hits('hera', [{ when: (b, s) => b.label === 'YR' && (s === 12 || s === 14), fn: (_b, t, rt) => DRM.drm_hera({ t, vel: 1, dest: rt.input, rev: rt.rev, pan: 0.2 }) }]),
    melody({ id: 'brass', ins: 'ins_fm_brass', bars: yk.part('brass'), o: { vol: 0.09 }, gate: 0.94 }),
    hits('slap', [
      { when: (b, s) => (b.label === 'Y1' && s === 0) || (b.label === 'Y2' && s === 8), fn: (_b, t, rt) => INS.ins_fm_slap({ t, midi: 38, dur: 0.4, vel: 1, dest: rt.input, det: rt.song.det }) },
      { when: (b, s) => b.label === 'YT' && s === 0, fn: (_b, t, rt) => INS.ins_fm_slap({ t, midi: 38, dur: 1.2, vel: 0.8, dest: rt.input, det: rt.song.det }) },
    ]),
    hits('crash', [{ when: (b, s) => b.label === 'Y2' && s === 8, fn: (_b, t, rt) => DRM.drm_crash({ t, vel: 1, dest: rt.input, rev: rt.rev }) }]),
    // the D6/9 left ringing under the name
    hits('tail', [
      {
        when: (b, s) => b.label === 'YT' && s === 0,
        fn: (_b, t, rt) => [62, 66, 69, 71, 76].forEach((m, i) => INS.ins_fm_brass({ t: t + i * 0.012, midi: m, dur: 1.3, vel: 0.8, dest: rt.input, rev: rt.rev, det: rt.song.det, o: { vol: 0.045 } })),
      },
    ]),
    pads({ id: 'pad', when: (b: BarCtx) => b.label === 'Y2' || b.label === 'YT', o: { vol: 0.03 }, fx: { lp: 2200, q: 0.7 } }),
  ];
  return {
    id: 'bgm_jingle_yakisoban',
    title: 'ヤキソバン、出前に参上',
    bpm: 120,
    bars: yk.bars,
    intro: ['YR', 'Y1', 'Y2', 'YT'],
    loop: [],
    parts,
    gainDb: 1,
    reverb: { len: 1.4, decay: 3.0, level: 0.24, hp: 220 },
  };
}

export const YAKISOBAN_DEF = registerSong(yakisobanDef());
