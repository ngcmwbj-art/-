// bgm_boss — オムカエマチ (40_audio 5.9). The chime motif in A minor; the
// fourth note hangs unanswered. C is a children's recorder march with one
// leaking note. Phase 2 jumps to E minor; phase 3 drops to a lone pad that the
// Kanenari bell pulls back to C major.

import { DRM, INS } from '../instruments';
import { midiHz, voice } from '../engine';
import { arp, bass, drums, hits, melody, pads, type BarCtx, type PartDef, type SongDef, type SongPlayer } from '../sequencer';
import { hat8, kireLayers } from './battle';
import { bar, registerSong, score } from './common';

export const BOSS_MML = `
@song bgm_boss part=lead ins=ins_lead_boss meter=4/4
A1  Am(add9)       | G4:4 A4:4 C5:4 E5:4 |
A2  Fmaj7          | E5:12 -:4 |
A3  Dm9            | F5:4 E5:4 D5:4 C5:4 |
A4  E7sus4・E7     | A4:8 G#4:8 |
A5  Am             | G4:4 A4:4 C5:4 E5:2 G5:2 |
A6  Fmaj7(#11)     | B5:12 A5:4 |
A7  Bbmaj7         | A5:6 F5:2 D5:4 Bb4:4 |
A8  E7(b9)         | G#4:4 B4:4 D5:4 F5:4 |
B1  Dm9            | -:2 A4:2 C5:2 D5:2 E5:4 F5:4 |
B2  Am/C           | E5:6 D5:2 C5:4 A4:4 |
B3  Bm7(b5)        | D5:6 C5:2 B4:4 A4:4 |
B4  E7             | G#4:6 B4:2 E5:8 |
B5  Fmaj7          | C5:3 E5:3 A5:2 G5:4 E5:4 |
B6  G6             | D5:3 G5:3 B5:2 A5:4 E5:4 |
B7  Em7            | B5:4 G5:4 E5:4 D5:4 |
B8  E7(#9)         | D6:4 B5:4 G#5:4 G5:4 |

@song bgm_boss part=recorder ins=ins_recorder meter=4/4
C1  Fmaj7          | A4:4 A4:4 C5:4 A4:4 |
C2  Em7            | G4:4 G4:4 E4:8 |
C3  Dm7            | F4:4 A4:4 D5:4 C5:4 |
C4  Am             | A4:12 -:4 |
C5  Fmaj7          | A4:4 C5:4 E5:4 C5:4 |
C6  G              | D5:4 B4:4 B5:1 G4:3 D5:4 |
C7  Esus4          | A4:8 B4:8 |
C8  E7             | G#4:8 -:8 |
`;

export const BOSS_CHORDS = `
Am(add9) = A C E B
Fmaj7 = F A C E
Dm9 = D F A C E
E7sus4 = E A B D
E7 = E G# B D
Am = A C E
Fmaj7(#11) = F A C E B
Bbmaj7 = Bb D F A
E7(b9) = E G# B D F
Am/C = A E /C
Bm7(b5) = B D F A
G6 = G B D E
Em7 = E G B D
E7(#9) = E G# B D G
Dm7 = D F A C
G = G B D
Esus4 = E A B
`;

const boss = score(BOSS_MML, BOSS_CHORDS);
const amadd9 = boss.chords.get('Am(add9)')!;
for (const l of ['BO1', 'BO2', 'BO3', 'BO4']) boss.bars.set(l, bar(l, 16, [[0, amadd9]]));
// phase-2 copies of the loop (same material, +7 / −5 per 5.9)
const LOOP1 = [
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8',
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8',
];
const LOOP2 = LOOP1.map((l) => `${l[0]}${l[0]}${l.slice(1)}`); // AA1 … CC8
for (let i = 0; i < LOOP1.length; i++) {
  const src = boss.bars.get(LOOP1[i])!;
  boss.bars.set(LOOP2[i], {
    ...src,
    label: LOOP2[i],
    chords: src.chords.map((c) => ({
      step: c.step,
      chord: { ...c.chord, root: (c.chord.root + 7) % 12, bass: (c.chord.bass + 7) % 12, tones: c.chord.tones.map((x) => (x + 7) % 12) },
    })),
  });
}

/** Phase-agnostic view: 'AA3' → section A, bar 3. */
const sec = (b: BarCtx) => b.section[0];
const p2 = (b: BarCtx) => b.section.length === 2 && b.section !== 'BO';
const alias = (l: string) => (/^(AA|BB|CC)\d/.test(l) ? l.slice(1) : l);

function bossDef(): SongDef {
  const up = (b: BarCtx) => (p2(b) ? 7 : 0);
  const kireUp = (b: BarCtx) => (b.p.kire >= 3 ? 12 : 0);
  const inAB = (b: BarCtx) => b.section !== 'BO' && (sec(b) === 'A' || sec(b) === 'B');
  const inC = (b: BarCtx) => b.section !== 'BO' && sec(b) === 'C';
  let tickN = 0;
  const parts: PartDef[] = [
    melody({
      id: 'lead',
      ins: 'ins_lead_boss',
      bars: boss.part('lead'),
      alias,
      transpose: up,
      o: (b) => ({ vol: 0.085, wave: p2(b) ? 'pulse25' : 'square' }),
      gate: 0.95,
    }),
    melody({ id: 'lead_mbox', ins: 'ins_musicbox', bars: boss.part('lead'), alias, transpose: (b) => up(b) + 12, o: { vol: 0.05 } }),
    melody({
      id: 'recorder',
      ins: 'ins_recorder',
      bars: boss.part('recorder'),
      alias,
      transpose: up,
      o: { vol: 0.09 },
      gate: 0.88,
      // C6's B5:1 — "リコーダーの 音が 1つ もれた"
      noteOpts: (b, e) => (alias(b.label) === 'C6' && e.step === 8 ? { leak: true } : undefined),
    }),
    pads({ id: 'choir', ins: 'ins_choir', when: inAB, o: { vol: 0.045, child: true }, lo: 55, hi: 74 }),
    arp({ id: 'arp', ins: 'ins_fm_vibes', rate: 2, shape: ['R', '3', '5', '7', '8', '5', '3', '5'], rootLo: 57, o: { vol: 0.035 }, when: (b) => b.section !== 'BO' && sec(b) === 'B', fx: { pan: 0.25 } }),
    // intro: pad swell, sub, the A1 eighths, the "あー" choir
    pads({ id: 'pad_intro', when: (b) => b.section === 'BO', per: 'bar', o: (b) => ({ vol: 0.035, attack: b.label === 'BO1' ? 1.4 : 0.6 }), fx: { lp: 1500, q: 0.8, lfo: { rate: 0.15, depth: 300 } } }),
    hits('intro', [
      { when: (b, s) => b.section === 'BO' && b.num >= 2 && s === 0, fn: (b, t, rt) => INS.ins_sub({ t, midi: 33, dur: b.time(16) - t, vel: 1, dest: rt.input, det: rt.song.det }) },
      { when: (b, s) => b.section === 'BO' && b.num >= 3 && s % 2 === 0, fn: (b, t, rt) => INS.ins_fm_bass({ t, midi: 33, dur: b.stepDur * 1.6, vel: 1, dest: rt.input, det: rt.song.det }) },
      { when: (b, s) => b.label === 'BO3' && s === 0, fn: (b, t, rt) => DRM.drm_revcym({ t, vel: 1, len: b.time(32) - t, dest: rt.input, rev: rt.rev }) },
      { when: (b, s) => b.label === 'BO4' && (s === 0 || s === 8), fn: (_b, t, rt) => DRM.drm_kick({ t, vel: 1, dest: rt.input, rev: rt.rev }) },
      {
        when: (b, s) => b.label === 'BO4' && (s === 0 || s === 8),
        fn: (b, t, rt, a) => INS.ins_choir({ t, midi: a === 0 ? 69 : 67, dur: b.time(a + 8) - t, vel: 1, dest: rt.input, rev: rt.rev, det: rt.song.det, o: { child: true, vol: 0.06 } }),
      },
    ]),
    bass({
      id: 'bass',
      ins: 'ins_fm_bass',
      pattern: (b) => (inC(b) ? 'R:4 5:4 R:4 5:4' : "R:2 R:2 R':2 R:2 5:2 R:2 R':2 5:2"),
      when: (b) => b.section !== 'BO',
      // phase-2 bars carry chords already moved +7; bassMidi keeps the register (= −5)
      transpose: kireUp,
    }),
    drums({
      id: 'drums',
      kit: {
        drm_kick: (b) =>
          b.section === 'BO' ? null : inC(b) ? 'x.......x.......' : p2(b) ? 'x.....x.x.....x.' : sec(b) === 'A' ? 'x.......x.......' : 'x.....x...x.....',
        drm_snare_tight: (b) => (b.section === 'BO' || inC(b) ? null : p2(b) ? '....x.......x...' : sec(b) === 'A' ? '........x.......' : '....x.......x...'),
        drm_snare_march: (b) => (inC(b) ? 'X.g.x.g.X.g.x.gg' : null),
        drm_hat_c: (b) => (b.section === 'BO' || inC(b) ? null : p2(b) ? (b.p.kire >= 2 ? 'xgxgxgxgxgxgxg.g' : 'xgxgxgxgxgxgxgxg') : sec(b) === 'B' ? hat8(b) : null),
      },
      vel: { drm_kick: 1.05 },
    }),
    // the clock instead of a hi-hat: tick / tock (reversed in phase 2)
    hits('clock', [
      {
        when: (b, s) => s % 2 === 0 && (b.section === 'BO' || sec(b) === 'A'),
        fn: (b, t, rt) => {
          const odd = tickN++ % 2 === 0;
          const tick = p2(b) ? !odd : odd;
          (tick ? DRM.drm_tick : DRM.drm_tock)({ t, vel: 1, vol: 0.04, dest: rt.input, rev: rt.rev });
        },
      },
    ]),
    hits('fx', [
      { when: (b, s) => (alias(b.label) === 'C1' || b.label === 'AA1') && s === 0, fn: (_b, t, rt) => DRM.drm_crash({ t, vel: 1, dest: rt.input, rev: rt.rev }) },
      { when: (b, s) => alias(b.label) === 'C8' && s === 8, fn: (b, t, rt) => DRM.drm_revcym({ t, vel: 1, len: b.time(16) - t, dest: rt.input, rev: rt.rev }) },
      // phase 2: a reverse cymbal into every other bar
      { when: (b, s) => p2(b) && !inC(b) && b.num % 2 === 0 && s === 12, fn: (b, t, rt) => DRM.drm_revcym({ t, vel: 1, len: b.time(16) - t, dest: rt.input, rev: rt.rev }) },
    ]),
    ...kireLayers(),
  ];
  return {
    id: 'bgm_boss',
    title: 'ボス（オムカエマチ）',
    bpm: 140,
    bars: boss.bars,
    intro: ['BO1', 'BO2', 'BO3', 'BO4'],
    loop: [...LOOP1, ...LOOP2],
    parts,
    gainDb: 0,
    reverb: { len: 1.6, decay: 3.0, level: 0.26 },
    battle: true,
    route(sp, next) {
      // stay inside the current phase's 24 bars
      const phase2 = sp.params.boss_phase >= 2;
      if (next.intro) return;
      if (!phase2 && next.i >= 24) return { intro: false, i: next.i - 24 };
      if (phase2 && next.i < 24) return { intro: false, i: next.i + 24 };
      return undefined;
    },
    onParam(sp, name, value) {
      if (name === 'boss_phase' && value === 2) sp.jumpNext('AA1');
      if (name === 'boss_phase' && value >= 3) finalPhase(sp);
    },
    onSfx(sp, id) {
      if (id === 'se_bell_kanenari' && sp.state.drone) bellMorph(sp);
    },
  };
}

// ---- final phase: every part fades, one pad holds Am(add9) -------------------

interface Drone {
  voices: { osc: OscillatorNode[]; }[];
  gain: GainNode;
}

function finalPhase(sp: SongPlayer): void {
  if (sp.state.drone) return;
  const c = sp.g.ctx;
  const t = c.currentTime;
  for (const rt of sp.parts) sp.partGain(rt.id, 0, 1.5, t);
  setTimeout(() => (sp.halted = true), 1700);
  const out = c.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(1, t + 1.5);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1250;
  lp.Q.value = 0.9;
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.08;
  const lg = c.createGain();
  lg.gain.value = 350;
  lfo.connect(lg);
  lg.connect(lp.frequency);
  lfo.start(t);
  lp.connect(out);
  out.connect(sp.mix);
  const send = c.createGain();
  send.gain.value = 0.5;
  out.connect(send);
  send.connect(sp.wet);
  const notes = [45, 52, 59, 60]; // A2 E3 B3 C4
  const voices = notes.map((m, i) => {
    const osc: OscillatorNode[] = [];
    for (const [det, pan, type, mul, lvl] of [
      [-12, -0.4, 'sawtooth', 1, 1],
      [0, 0, 'sawtooth', 1, 1],
      [12, 0.4, 'sawtooth', 1, 1],
      [0, 0, 'square', 0.5, 0.3],
    ] as [number, number, OscillatorType, number, number][]) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = midiHz(m) * mul;
      o.detune.value = det;
      const g = c.createGain();
      g.gain.value = 0.035 * 0.42 * lvl;
      const p = c.createStereoPanner();
      p.pan.value = pan;
      o.connect(g);
      g.connect(p);
      p.connect(lp);
      o.start(t + i * 0.05);
      osc.push(o);
    }
    return { osc };
  });
  sp.state.drone = { voices, gain: out } as Drone;
  sp.def.onStop = undefined;
  const origStop = sp.stop.bind(sp);
  sp.stop = (fade = 0.5, at = c.currentTime) => {
    origStop(fade, at);
    const end = Math.max(at, c.currentTime) + fade + 0.1;
    for (const v of voices) for (const o of v.osc) o.stop(end);
    lfo.stop(end);
  };
  void voice;
}

/** The Kanenari bell pulls the pad back home: F(#11) → Cadd9, −6 dB (5.9). */
function bellMorph(sp: SongPlayer): void {
  const d = sp.state.drone as Drone;
  if (!d || sp.state.morphed) return;
  sp.state.morphed = true;
  const t = sp.g.ctx.currentTime;
  const mid = [41, 48, 52, 59]; // F2 C3 E3 B3
  const end = [48, 55, 62, 64]; // C3 G3 D4 E4
  d.voices.forEach((v, i) => {
    for (const o of v.osc) {
      const mul = o.type === 'square' ? 0.5 : 1;
      o.frequency.cancelScheduledValues(t);
      o.frequency.setValueAtTime(o.frequency.value, t);
      o.frequency.exponentialRampToValueAtTime(midiHz(mid[i]) * mul, t + 1.8);
      o.frequency.setValueAtTime(midiHz(mid[i]) * mul, t + 2.0);
      o.frequency.exponentialRampToValueAtTime(midiHz(end[i]) * mul, t + 4.0);
    }
  });
  d.gain.gain.cancelScheduledValues(t);
  d.gain.gain.setValueAtTime(d.gain.gain.value, t);
  d.gain.gain.linearRampToValueAtTime(0.5, t + 4.0);
}

export const BOSS_DEF = registerSong(bossDef());
