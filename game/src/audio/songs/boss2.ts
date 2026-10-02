// bgm_boss_yobimodoshi — ボス：ヨビモドシ (53_ch2_audio 5.3).
// The PA on the hill taking the roll all night. A1 climbs the broadcast's
// opening chime in D minor, A2 walks the closing chime down and stops on F5
// — the fourth note, D5, is never said (M4, sealed). Instead of a hi-hat, a
// finger taps the microphone. The lead's echo comes back off the far slope and
// loses a line each time a horn is broken. C remembers the old good-night
// broadcast on the branch school's pump organ. Phase 2 goes up a fourth to
// G minor; the final phase lets the music fall asleep under the insects.

import { DRM, INS } from '../instruments';
import { dbToGain, liveGraph } from '../engine';
import { bass, drums, hits, melody, pads, type BarCtx, type PartDef, type PartRt, type SongDef, type SongPlayer } from '../sequencer';
import { kireLayers } from './battle';
import { bar, registerSong, score } from './common';

export const BOSS2_MML = `
@song bgm_boss_yobimodoshi part=intro_chime ins=ins_fm_vibes meter=4/4
YI4 Dm(add9)       | D5:4 F5:4 A5:4 D6:4 |

@song bgm_boss_yobimodoshi part=lead ins=ins_lead_boss meter=4/4
A1  Dm9            | D5:4 F5:4 A5:4 D6:4 |
A2  Bbmaj7(#11)    | D6:4 A5:4 F5:8 |
A3  Gm9            | -:4 G5:2 A5:2 Bb5:4 A5:4 |
A4  A7sus4・A7     | G5:8 C#5:8 |
A5  Dm9            | D5:4 F5:4 A5:4 D6:2 E6:2 |
A6  Bbmaj9(#11)    | F6:8 E6:4 D6:4 |
A7  Ebmaj7(#11)    | D6:6 Bb5:2 G5:4 A5:4 |
A8  A7(b9)         | C#6:4 Bb5:4 G5:4 E5:4 |
B1  Gm9            | G5:4 Bb5:4 D6:8 |
B2  Dm7/F          | C6:4 A5:4 F5:8 |
B3  Em7(b5)        | G5:4 Bb5:4 E6:8 |
B4  A7             | C#6:4 A5:4 E5:8 |
B5  Bbmaj7         | F5:4 A5:4 D6:4 C6:4 |
B6  C7             | Bb5:4 G5:4 E5:4 C5:4 |
B7  Fmaj7          | A5:6 G5:2 F5:4 E5:4 |
B8  A7(#9)         | A5:4 C6:4 C#6:8 |

@song bgm_boss_yobimodoshi part=organ ins=ins_reed_organ meter=4/4
C1  Fmaj7          | A4:4 C5:4 F5:8 |
C2  Am7            | E5:4 D5:4 C5:8 |
C3  Bbmaj7         | D5:4 F5:4 Bb5:8 |
C4  C9sus4         | G5:8 F5:4 D5:4 |
C5  Fmaj7          | A5:4 C6:4 A5:4 F5:4 |
C6  Dm9            | E5:4 F5:4 D5:8 |
C7  Gm9/C          | F5:4 C5:4 A4:8 |
C8  A7sus4・A7     | -:8 C#5:4 E5:4 |

@song bgm_boss_yobimodoshi part=lantern ins=ins_lantern meter=4/4
A1  Dm9            | C5:4 D5:4 F5:4 A5:4 |
A2  Bbmaj7(#11)    | A5:12 G5:4 |
A3  Gm9            | F5:8 D5:4 A5:4 |
A4  A7sus4・A7     | E5:8 C#5:8 |
A5  Dm9            | C5:4 D5:4 F5:4 A5:4 |
A6  Bbmaj9(#11)    | C6:8 A5:8 |
A7  Ebmaj7(#11)    | G5:8 A5:8 |
A8  A7(b9)         | G5:4 E5:4 C#5:8 |
B1  Gm9            | D5:4 F5:4 A5:8 |
B2  Dm7/F          | A5:4 F5:4 D5:8 |
B3  Em7(b5)        | D5:4 E5:4 G5:8 |
B4  A7             | E5:8 C#5:4 E5:4 |
B5  Bbmaj7         | D5:4 F5:4 A5:8 |
B6  C7             | G5:4 E5:4 C5:8 |
B7  Fmaj7          | C5:4 D5:4 F5:4 A5:4 |
B8  A7(#9)         | G5:8 E5:8 |
C1  Fmaj7          | C5:4 E5:4 A5:8 |
C2  Am7            | G5:4 F5:4 E5:8 |
C3  Bbmaj7         | F5:4 A5:4 D6:8 |
C4  C9sus4         | Bb5:8 G5:4 F5:4 |
C5  Fmaj7          | C6:4 E6:4 C6:4 A5:4 |
C6  Dm9            | A5:6 G5:2 F5:8 |
C7  Gm9/C          | A5:4 F5:4 C5:8 |
C8  A7sus4・A7     | D5:8 E5:8 |
`;

export const BOSS2_CHORDS = `
Dm(add9) = D F A E
Dm9 = D F A C E
Bbmaj7(#11) = Bb D F A E
Bbmaj9(#11) = Bb D F A C E
Gm9 = G Bb D F A
A7sus4 = A D E G
Ebmaj7(#11) = Eb G Bb D A
A7(b9) = A C# E G Bb
Dm7/F = D A C /F
Em7(b5) = E G Bb D
A7 = A C# E G
Bbmaj7 = Bb D F A
C7 = C E G Bb
Fmaj7 = F A C E
A7(#9) = A C# E G C
Am7 = A C E G
C9sus4 = C F G Bb D
Gm9/C = G Bb D F A /C
`;

const boss2 = score(BOSS2_MML, BOSS2_CHORDS);
const dmadd9 = boss2.chords.get('Dm(add9)')!;
for (const l of ['YI1', 'YI2', 'YI3']) boss2.bars.set(l, bar(l, 16, [[0, dmadd9]]));

const LOOP1 = [
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8',
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8',
];
// phase 2: the same material a fourth up, in G minor (chords +5; the tunes −7, 5.3)
const LOOP2 = LOOP1.map((l) => `${l[0]}${l[0]}${l.slice(1)}`);
for (let i = 0; i < LOOP1.length; i++) {
  const src = boss2.bars.get(LOOP1[i])!;
  boss2.bars.set(LOOP2[i], {
    ...src,
    label: LOOP2[i],
    chords: src.chords.map((c) => ({
      step: c.step,
      chord: { ...c.chord, root: (c.chord.root + 5) % 12, bass: (c.chord.bass + 5) % 12, tones: c.chord.tones.map((x) => (x + 5) % 12) },
    })),
  });
}

/** Phase-agnostic view: 'AA3' → section A. */
const sec = (b: BarCtx) => b.section[0];
const p2 = (b: BarCtx) => b.section.length === 2 && b.section !== 'YI';
const alias = (l: string) => (/^(AA|BB|CC)\d/.test(l) ? l.slice(1) : l);
const intro = (b: BarCtx) => b.section === 'YI';
const inAB = (b: BarCtx) => !intro(b) && (sec(b) === 'A' || sec(b) === 'B');
const inC = (b: BarCtx) => !intro(b) && sec(b) === 'C';
const dark = (b: BarCtx) => b.p.h_light === 0;

/** The lead's echo off the far slope: feedback per broken horn (0 → 4). */
const ECHO_FB = [0.4, 0.3, 0.2, 0.1, 0];
const ECHO_SEND = 0.3;

/** The PA band for the parts that come out of the speaker (5.3: bus_pa's band). */
const PA_FX = { hp: 380, lp: 3600 };

/** Tenko: the notes of the name-tag layer (fixed pitches, the PA's own). */
const TENKO_NOTES = [86, 81, 77]; // D6 A5 F5 — the fourth, D5, never comes

function tapeWobble(rt: PartRt): AudioNode {
  let n = rt.state.wobble as AudioNode | undefined;
  if (n) return n;
  // a part-only tape wobble for the old recording (0.4 Hz ±12 cents)
  const c = rt.input.context;
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.4;
  const g = c.createGain();
  g.gain.value = 12;
  lfo.connect(g);
  lfo.start();
  rt.song.state[`wobble_${rt.id}`] = lfo;
  n = g;
  rt.state.wobble = n;
  return n;
}

function boss2Def(): SongDef {
  const up = (b: BarCtx) => (p2(b) ? -7 : 0);
  const kireUp = (b: BarCtx) => (b.p.kire >= 3 ? 12 : 0);
  const parts: PartDef[] = [
    // ---- the roll call (A, B): its echo comes back off the far slope
    melody({
      id: 'lead',
      ins: 'ins_lead_boss',
      bars: boss2.part('lead'),
      alias,
      transpose: up,
      o: (b) => ({ vol: 0.085, wave: p2(b) ? 'pulse25' : 'square' }),
      gate: 0.95,
      when: (b) => dark(b),
      aware: ['h_light'],
      fx: { delay: { steps: 6, fb: 0.4, send: ECHO_SEND, bp: [800, 2400] } },
    }),
    // phase 2: a music box an octave over the lead (the shine the lower register lost)
    melody({
      id: 'lead_mbox',
      ins: 'ins_musicbox',
      bars: boss2.part('lead'),
      alias,
      transpose: (b) => up(b) + 12,
      o: { vol: 0.045 },
      when: (b) => p2(b) && dark(b) && b.p.kire < 3,
      aware: ['h_light', 'kire'],
    }),
    // ---- C: the old good-night broadcast, on the pump organ, through an old speaker
    melody({
      id: 'organ',
      ins: 'ins_reed_organ',
      bars: boss2.part('organ'),
      alias,
      transpose: up,
      o: { vol: 0.06, rev: 0.3 },
      gate: 0.96,
      det2: tapeWobble,
      fx: { hp: 350, lp: 2800 },
    }),
    pads({
      id: 'organ_chords',
      ins: 'ins_reed_organ',
      o: { vol: 0.025, rev: 0.3 },
      count: 4,
      lo: 53,
      hi: 70,
      when: inC,
      det2: tapeWobble,
      fx: { hp: 350, lp: 2800 },
    }),
    // ---- the tomato's song (only while the light is held up): the town's question again
    melody({
      id: 'lantern',
      ins: 'ins_lantern',
      bars: boss2.part('lantern'),
      alias,
      transpose: up,
      o: { vol: 0.08 },
      gate: 0.94,
      when: (b) => b.p.h_light === 1 && !intro(b),
      aware: ['h_light'],
      fx: { tremolo: { rate: 0.8, depth: 0.1 } },
    }),
    // ---- the name tags (tenko): the closing chime's notes, fixed in the PA's key
    hits(
      'tenko',
      [
        {
          when: (b, s) => {
            const n = b.p.tenko;
            if (n <= 0 || n >= 4 || intro(b)) return false;
            const half = b.p.boss_phase >= 2;
            const k = half ? s % 8 : s;
            return (half ? [0, 2, 4] : [0, 4, 8]).slice(0, n).includes(k);
          },
          fn: (b, t, rt, a) => {
            const half = b.p.boss_phase >= 2;
            const k = half ? (a % 8) / 2 : a / 4;
            const m = TENKO_NOTES[Math.min(2, Math.round(k))];
            INS.ins_fm_vibes({ t, midi: m, dur: half ? b.stepDur * 2 : b.stepDur * 4, vel: 1, dest: rt.input, rev: rt.rev, o: { vol: 0.035, rev: 0.3 } });
          },
        },
      ],
      1,
      { fx: { ...PA_FX, delay: { steps: 3, fb: 0.3, send: 0.35 } }, aware: ['tenko'] },
    ),
    // ---- pad (A, B): opens up when the light is held up
    pads({ id: 'pad', o: { vol: 0.03 }, when: inAB, fx: { lp: 1200, q: 0.7 } }),
    // ---- intro: "あー、あー、マイクのテスト"
    pads({ id: 'pad_intro', when: (b) => b.label === 'YI2' || b.label === 'YI3' || b.label === 'YI4', per: 'bar', o: (b) => ({ vol: 0.035, attack: b.label === 'YI2' ? 1.5 : 0.6 }), fx: { lp: 1400, q: 0.8 } }),
    melody({ id: 'intro_chime', ins: 'ins_fm_vibes', bars: boss2.part('intro_chime'), o: { vol: 0.07, rev: 0.25 }, fx: { ...PA_FX, delay: { steps: 3, fb: 0.3, send: 0.35 } } }),
    hits('intro', [
      { when: (b, s) => b.label === 'YI3' && s % 2 === 0, fn: (b, t, rt) => INS.ins_fm_bass({ t, midi: 38, dur: b.stepDur * 1.6, vel: 1, dest: rt.input, det: rt.song.det }) },
      { when: (b, s) => b.label === 'YI4' && s % 2 === 0, fn: (b, t, rt) => INS.ins_fm_bass({ t, midi: 38, dur: b.stepDur * 1.6, vel: 1, dest: rt.input, det: rt.song.det }) },
      { when: (b, s) => b.label === 'YI3' && s === 0, fn: (b, t, rt) => DRM.drm_revcym({ t, vel: 1, len: b.time(32) - t, dest: rt.input, rev: rt.rev }) },
      { when: (b, s) => b.label === 'YI4' && (s === 0 || s === 8), fn: (_b, t, rt) => DRM.drm_kick({ t, vel: 1, dest: rt.input, rev: rt.rev }) },
    ]),
    // ---- bass
    {
      ...bass({
        id: 'bass',
        ins: 'ins_fm_bass',
        pattern: (b) => (inC(b) ? 'R:8 5:8' : "R:4 R':2 R:2 5:4 R':2 5:2"),
        when: (b) => !intro(b),
        transpose: kireUp,
      }),
      kireAware: true,
    },
    // ---- drums: the microphone taps are the roll call's clock
    {
      ...drums({
        id: 'drums',
        kit: {
          drm_kick: (b) => (intro(b) ? null : inC(b) ? 'x...............' : p2(b) ? 'x.....x.x.....x.' : sec(b) === 'A' ? 'x.......x.......' : 'x.....x...x.....'),
          drm_snare_tight: (b) => (intro(b) || inC(b) ? null : '....x.......x...'),
          drm_snare_brush: (b) => (inC(b) ? '........x.......' : null),
        },
        vel: { drm_kick: 1.05 },
      }),
      kireAware: true,
    },
    hits(
      'mic',
      [
        {
          when: (b, s) => {
            if (!dark(b)) return false;
            if (b.label === 'YI1' || b.label === 'YI2') return s % 4 === 0;
            if (intro(b)) return false;
            if (inC(b)) return s % 4 === 0;
            return p2(b) ? true : s % 2 === 0;
          },
          fn: (b, t, rt, a) => {
            // phase 2: every 16th — the name tags flow twice as fast (x on the beat, g off it)
            const off = p2(b) && !inC(b) && a % 2 === 1;
            DRM.drm_mic_tap({ t, vel: off ? 0.35 : 0.7, dest: rt.input, rev: rt.rev });
          },
        },
      ],
      1,
      { fx: { hp: 400, lp: 3600 }, aware: ['h_light'] },
    ),
    hits('fx', [
      { when: (b, s) => (b.label === 'A1' || b.label === 'C1' || b.label === 'CC1' || b.label === 'AA1') && s === 0, fn: (_b, t, rt) => DRM.drm_crash({ t, vel: 1, dest: rt.input, rev: rt.rev }) },
      // C8: two reverse beats back into the roll call
      { when: (b, s) => alias(b.label) === 'C8' && (s === 8 || s === 12), fn: (b, t, rt, a) => DRM.drm_revcym({ t, vel: 1, len: b.time(a + 4) - t, dest: rt.input, rev: rt.rev }) },
      // phase 2: a reverse cymbal into every other bar
      { when: (b, s) => p2(b) && !inC(b) && b.num % 2 === 0 && s === 12, fn: (b, t, rt) => DRM.drm_revcym({ t, vel: 1, len: b.time(16) - t, dest: rt.input, rev: rt.rev }) },
    ]),
    // the kire layers of the other fights; the 16th off-beats are the microphone here
    ...kireLayers({ hat: 'mic' }),
  ];
  return {
    id: 'bgm_boss_yobimodoshi',
    title: 'ボス（ヨビモドシ）',
    bpm: 132,
    bars: boss2.bars,
    intro: ['YI1', 'YI2', 'YI3', 'YI4'],
    loop: [...LOOP1, ...LOOP2],
    parts,
    gainDb: 0,
    reverb: { len: 1.8, decay: 3.0, level: 0.26 },
    battle: true,
    setup(sp) {
      sp.state.broken = 0;
      applyLight(sp, sp.params.h_light, 0);
    },
    route(sp, next) {
      // stay inside the current phase's 24 bars
      const phase2 = sp.params.boss_phase >= 2;
      if (next.intro) return;
      if (!phase2 && next.i >= 24) return { intro: false, i: next.i - 24 };
      if (phase2 && next.i < 24) return { intro: false, i: next.i + 24 };
      return undefined;
    },
    onBar(sp, b) {
      // back in the dark: the roll call and its echo return with the bar (6.2)
      if (b.p.h_light === 0 && sp.state.lit) {
        sp.state.lit = false;
        sp.partGain('lead', 1, 0.02, b.t0);
        sp.partGain('lead_mbox', 1, 0.02, b.t0);
        // the lantern (faded out when the light dropped) rests from here on: ready for the next time
        sp.partGain('lantern', 1, 0.02, b.t0);
        echo(sp, b.t0, 0.05);
      }
    },
    onParam(sp, name, value, old) {
      if (name === 'boss_phase' && value === 2 && old < 2) sp.jumpNext('AA1');
      if (name === 'boss_phase' && value >= 3) sleep(sp);
      if (name === 'h_light') applyLight(sp, value, value > old ? 0.3 : 0.4);
    },
    onSfx(sp, id) {
      if (id !== 'se_part_break') return;
      sp.state.broken = Math.min(4, ((sp.state.broken as number) ?? 0) + 1);
      echo(sp, sp.g.ctx.currentTime, 0.3);
    },
    onStop(sp, at, fade) {
      for (const [k, v] of Object.entries(sp.state)) if (k.startsWith('wobble_')) (v as OscillatorNode).stop(at + fade + 0.5);
    },
  };
}

/** The lead's echo: fewer lines per broken horn, none while the slope is lit. */
function echo(sp: SongPlayer, at: number, ramp: number): void {
  const rt = sp.partRt('lead');
  if (!rt?.delaySend) return;
  const broken = (sp.state.broken as number) ?? 0;
  const fb = ECHO_FB[Math.min(4, broken)];
  const lit = sp.params.h_light === 1 || !!sp.state.lit;
  const tc = Math.max(0.005, ramp) / 3;
  (rt.state.delayFb as GainNode | undefined)?.gain.setTargetAtTime(fb, at, tc);
  (rt.state.delayFb2 as GainNode | undefined)?.gain.setTargetAtTime(fb, at, tc);
  rt.delaySend.gain.setTargetAtTime(lit || broken >= 4 ? 0 : ECHO_SEND, at, tc);
}

/**
 * h_light (6.2, the 5.3 table). Up: the roll call falls silent in 0.3 s, the
 * lantern sings from the next beat, the microphone stops, the pad opens,
 * the lit slope gives no echo. Down: the lantern fades in 0.4 s; the roll
 * call and the taps return with the next bar (onBar).
 */
function applyLight(sp: SongPlayer, v: number, ramp: number): void {
  const t = sp.g.ctx.currentTime;
  const pad = sp.partRt('pad')?.state.filter as BiquadFilterNode | undefined;
  pad?.frequency.setTargetAtTime(v ? 2200 : 1200, t, 0.25);
  if (v) {
    sp.state.lit = true;
    sp.partGain('lead', 0, Math.max(0.01, ramp), t);
    sp.partGain('lead_mbox', 0, Math.max(0.01, ramp), t);
    sp.partGain('lantern', 1, 0.02, t);
    echo(sp, t, 0.1);
  } else {
    // the lantern goes out in 0.4 s; the rest waits for the bar (onBar)
    sp.partGain('lantern', 0, Math.max(0.01, ramp), t);
  }
}

/**
 * The final phase (5.3): every part fades in 1.0 s — the pad too; the music
 * falls asleep — and the ambience the battle had lowered comes back to 0 dB
 * in the same second: only the night insects are left.
 */
function sleep(sp: SongPlayer): void {
  if (sp.state.asleep) return;
  sp.state.asleep = true;
  const t = sp.g.ctx.currentTime;
  for (const rt of sp.parts) sp.partGain(rt.id, 0, 1.0, t);
  sp.haltAt = t + 1.1;
  const g = liveGraph();
  if (g && g === sp.g) {
    const p = g.ambDuck.gain;
    p.cancelScheduledValues(t);
    p.setValueAtTime(p.value, t);
    p.linearRampToValueAtTime(dbToGain(0), t + 1.0);
  }
}

export const BOSS2_DEF = registerSong(boss2Def());
