// bgm_boss_tsugao — ツガオ決戦 (63_ch3_audio 5.9), and bgm_c3_taikin — M7′,
// ツガオ's first clock-out in 40 years (5.9 part=taikin, 12.20).
//
// bgm_boss_tsugao: 120, 4/4. Stage 1 in D minor (X1–X8): M7 (D3 E♭3 D3 A2)
// carries the bass — the man who has run every morning for 40 years — under
// a boss lead. No menace: he only says 「まだ」. From the first 「よぶ」 (the
// `yobu` param, 0–27, 6.6) the song goes to D major at the next bar (X9) and
// loops X9–X16; the bass leaves M7 for a light slap.
//
// 「よぶ」's layer (5.9, 9.3): each person who draws a hanamaru on the black
// 回覧板 is announced with addVoiceLayer(voiceId) — from the next bar their own
// voice (wave, filter, base, vibrato, vowel 「あ」) holds a note of the chord,
// the chord tone nearest their voice, in half notes, moving as little as it
// can. Same voice twice counts once (まつ先生 and ふでの先生, しんご and 写真館の
// 主人). Up to 8 voices; the ninth on joins the voice of their own town. しゅん
// has no voice: the stamp's soft 「ぽん」 on the bar instead. The towns' little
// answers come with the first voice of each:
//   ① 夕鳴町  — X13's question (M1, A B D F♯ = G A C E's shape) on the music box
//   ② 星見台  — the tomato light (ins_lantern) as a pad over X9–X12
//   ③ 海ぞいの町 — the harmonica doubling X9–X12
//   ④ しゅん・グソっ君・ヤキソバン — M10 on the brass at the next X9 (once)
// No chime of any town (1.2), no prayer-like drone (1.7).
//
// The last moment (boss_phase 3, 「回覧板が うまった」): every part but the
// voices fades out in 1.0 s; the voices swell (2.0 s) into one chord — each
// on the note of D6/9 nearest their own — and hold it until the battle stops
// the song (stopBgm(3.0) after 「おつかれさま」).
//
// Never in it (16.1): the town chime's answer, 星見台's morning chime, M9′,
// M7′ (only bgm_c3_taikin has the fifth note).

import { midiHz } from '../engine';
import { DRM, INS } from '../instruments';
import { bass, drums, hits, melody, pads, voice, type BarCtx, type PartDef, type SongDef, type SongPlayer } from '../sequencer';
import { D69, nearestPc, voiceBaseMidi, voiceLayerTone, voiceTown } from '../voices';
import { kireLayers, teppanLayers } from './battle';
import { registerSong, score } from './common';

export const BOSS_TSUGAO_MML = `
@song bgm_boss_tsugao part=lead ins=ins_lead_boss meter=4/4
X1  Dm             | D5:4 F5:4 A5:4 G5:4 |
X2  Bbmaj7         | F5:8 E5:4 D5:4 |
X3  Gm7            | Bb4:4 D5:4 F5:4 E5:4 |
X4  A7             | C#5:12 -:4 |
X5  Dm             | A5:4 Bb5:4 A5:4 F5:4 |
X6  Bbmaj7         | D6:6 C6:2 Bb5:8 |
X7  Gm7            | G5:4 A5:4 Bb5:4 D6:4 |
X8  A7sus4         | E5:12 -:4 |
X9  D              | F#5:4 A5:4 B5:4 A5:4 |
X10 Bm7            | D6:8 B5:4 A5:4 |
X11 Gmaj7          | B5:6 A5:2 F#5:8 |
X12 A7sus4         | E5:12 -:4 |
X13 D              | A4:4 B4:4 D5:4 F#5:4 |
X14 Bm7            | E5:8 D5:4 B4:4 |
X15 Gmaj7          | E5:4 F#5:4 A5:4 B5:4 |
X16 A7             | E5:12 -:4 |

@song bgm_boss_tsugao part=bass ins=ins_fm_fretless meter=4/4
XI1 Dm             | D3:4 Eb3:4 D3:4 A2:4 |
XI2 A7sus4         | A2:16 |
XI3 Dm             | D3:4 Eb3:4 D3:4 A2:4 |
XI4 A7sus4         | A2:16 |
X1  Dm             | D3:4 Eb3:4 D3:4 A2:4 |
X2  Bbmaj7         | Bb2:8 F2:8 |
X3  Gm7            | G2:8 Bb2:8 |
X4  A7             | A2:8 C#3:4 E3:4 |
X5  Dm             | D3:4 Eb3:4 D3:4 A2:4 |
X6  Bbmaj7         | Bb2:8 D3:8 |
X7  Gm7            | G2:4 A2:4 Bb2:4 C3:4 |
X8  A7sus4         | A2:16 |

@song bgm_boss_tsugao part=mbox ins=ins_musicbox meter=4/4
X13 D              | A5:4 B5:4 D6:4 F#6:4 |

@song bgm_boss_tsugao part=yakisoban ins=ins_fm_brass meter=4/4
YB  D              | A4:2 A4:2 D5:2 E5:10 |
`;

export const BOSS_TSUGAO_CHORDS = `
Dm = D F A
Bbmaj7 = Bb D F A
Gm7 = G Bb D F
A7 = A C# E G
A7sus4 = A D E G
D = D F# A
Bm7 = B D F# A
Gmaj7 = G B D F#
`;

const bt = score(BOSS_TSUGAO_MML, BOSS_TSUGAO_CHORDS);

/** QA: the voices an offline render of the song starts with (the sound test and report). */
export const QA_LAYERS: string[] = ['obaa', 'mamekichi', 'h_mitsu', 'h_gen', 'c3_shokudo', 'c3_mago', 'shun', 'gusokkun', 'maruyama'];

const LOOP = Array.from({ length: 16 }, (_, i) => `X${i + 1}`);
const BPM = 120;

const live = (b: BarCtx) => !b.inIntro;
const major = (b: BarCtx) => b.p.yobu >= 1 && b.num >= 9;
const fin = (b: BarCtx) => b.p.boss_phase >= 3;
const sting = (b: BarCtx) => b.data.sting === true;
const towns = (b: BarCtx) => (b.song.state.towns as Set<number> | undefined) ?? new Set<number>();

/** Every part but the voices (they are what is left at the end). */
const NOT_VOICES = ['lead', 'lead_harm', 'mbox', 'lantern', 'yb', 'bass', 'bass_grit', 'bass_slap', 'bass_yb', 'sub', 'pad', 'drums', 'drums2', 'kire_hat', 'kire_clap', 'kire_arp', 'teppan'];

interface Layer {
  /** resolved voice id ('shun': the stamp) */
  id: string;
  town: number;
  /** how many people this voice stands for (the ninth on joins their town's) */
  n: number;
  base: number;
  last: number | null;
}

/** The voices of the layer from the names handed in (5.9: 8 at most, then merged by town). */
function layers(sp: SongPlayer): Layer[] {
  const asked = (sp.state.layers as string[] | undefined) ?? [];
  const have = (sp.state.layerSet as Layer[] | undefined) ?? [];
  const done = (sp.state.layerDone as number | undefined) ?? 0;
  if (done === asked.length) return have;
  const tw = (sp.state.towns as Set<number> | undefined) ?? new Set<number>();
  for (let i = done; i < asked.length; i++) {
    const raw = asked[i];
    const shun = raw === 'shun' || raw === 'npc_shun';
    const base = shun ? 74 : voiceBaseMidi(raw);
    const town = shun ? 4 : voiceTown(raw);
    if (!tw.has(town)) {
      tw.add(town);
      // ④: M10 at the next X9, once
      if (town === 4) sp.state.yb4 = 'wait';
    }
    if (base === null) continue;
    const id = shun ? 'shun' : raw;
    const same = have.find((l) => l.id === id || (l.base === base && l.town === town && l.id !== 'shun' && id !== 'shun'));
    if (same) continue;
    if (have.length >= 8) {
      const mate = have.find((l) => l.town === town) ?? have[have.length - 1];
      mate.n++;
      continue;
    }
    have.push({ id, town, n: 1, base, last: null });
  }
  sp.state.towns = tw;
  sp.state.layerSet = have;
  sp.state.layerDone = asked.length;
  return have;
}

/** Each held voice's level: .012, all of them .08 at most (10.1). */
function layerVol(count: number, n: number): number {
  const each = Math.min(0.012, 0.08 / Math.max(1, count));
  return each * Math.min(1.4, 1 + (n - 1) * 0.1);
}

/** しゅん's 「ぽん」: the stamp's soft head, a little sine drop and the paper. */
function pon(t: number, dest: AudioNode, v: number): void {
  voice({ at: t, dest, wave: 'sine', freq: 520, freqEnd: 400, glide: 0.06, dur: 0.05, attack: 0.002, decay: 0.08, sustain: 0, release: 0.06, vol: v * 1.6 });
  voice({ at: t, dest, wave: 'noise', freq: 1000, dur: 0.02, attack: 0.001, decay: 0.03, sustain: 0, release: 0.02, vol: v * 0.5, filter: { type: 'bandpass', freq: 1800, q: 1 } });
}

/** The chord tone nearest the voice's last note (or its own note), kept within a fifth of it. */
function layerNote(l: Layer, pcs: number[]): number {
  const want = l.last ?? l.base;
  let m = nearestPc(want, pcs);
  if (Math.abs(m - l.base) > 7) m = nearestPc(l.base, pcs);
  return m;
}

/** The last moment: everyone's note of D6/9 (5.9), swelling over 2 s and held. */
function finalChord(sp: SongPlayer): void {
  const rt = sp.partRt('voices');
  if (!rt || sp.state.finalDone) return;
  sp.state.finalDone = true;
  const ls = layers(sp);
  const t = sp.g.ctx.currentTime + 0.05;
  // from the lowest up, a few ms apart
  [...ls]
    .sort((a, b) => a.base - b.base)
    .forEach((l, k) => {
      const at = t + k * 0.03;
      if (l.id === 'shun') {
        pon(at, rt.input, 0.012);
        return;
      }
      voiceLayerTone(l.id, { t: at, midi: nearestPc(l.base, D69), dur: 40, dest: rt.input, rev: rt.rev, vol: layerVol(ls.length, l.n) * 1.5, attack: 2.0, release: 3.0, det: sp.det });
    });
}

function bossTsugaoDef(): SongDef {
  const lead = bt.part('lead');
  const voices = hits(
    'voices',
    [
      {
        when: (b, s) => (s === 0 || s === 8) && !fin(b) && b.p.yobu >= 1,
        fn: (b, t, rt, a) => {
          const sp = b.song;
          const ls = layers(sp);
          const pcs = b.chordAt(a).tones;
          const end = b.time(a + 8) - t;
          for (const l of ls) {
            if (l.id === 'shun') {
              if (a === 0) pon(t, rt.input, 0.012);
              continue;
            }
            const first = l.last === null;
            const m = layerNote(l, pcs);
            l.last = m;
            voiceLayerTone(l.id, { t, midi: m, dur: end, dest: rt.input, rev: rt.rev, vol: layerVol(ls.length, l.n), attack: first ? 0.2 : 0.1, release: 0.6, det: sp.det });
          }
        },
      },
    ],
    1,
  );
  const parts: PartDef[] = [
    melody({ id: 'lead', ins: 'ins_lead_boss', bars: lead, o: { vol: 0.08 }, when: (b) => live(b) && !sting(b), fx: { delay: { steps: 3, fb: 0.18, send: 0.12 } } }),
    // ③ 海ぞいの町: the harbour harmonica on the first phrase of D major
    melody({ id: 'lead_harm', ins: 'ins_harmonica', bars: lead, o: { vol: 0.05, rev: 0.2 }, gate: 0.95, when: (b) => major(b) && b.num <= 12 && towns(b).has(3) && !sting(b) }),
    // ① 夕鳴町: the town's question, an octave up on the music box (the answer stays sealed)
    melody({ id: 'mbox', ins: 'ins_musicbox', bars: bt.part('mbox'), o: { vol: 0.04 }, when: (b) => major(b) && towns(b).has(1) }),
    // ② 星見台: the tomato light singing over X9–X12
    pads({ id: 'lantern', ins: 'ins_lantern', count: 3, lo: 62, hi: 79, o: { vol: 0.018 }, when: (b) => major(b) && b.num <= 12 && towns(b).has(2) }),
    // ヤキソバン's turn (musicSting) and ④: M10 on the brass for one bar
    melody({ id: 'yb', ins: 'ins_fm_brass', bars: bt.part('yakisoban'), alias: () => 'YB', o: { vol: 0.08 }, gate: 0.92, when: (b) => live(b) && sting(b) }),
    // ---- stage 1: M7 in the bass, the fretless and its grit (heard on a phone: bgm_tsugao)
    melody({ id: 'bass', ins: 'ins_fm_fretless', bars: bt.part('bass'), o: { vol: 0.11, index: 1.8, lp: 2200 }, gate: 1, when: (b) => !major(b) && !sting(b) }),
    melody({ id: 'bass_grit', ins: 'ins_fm_fretless', bars: bt.part('bass'), o: { vol: 0.04, index: 3.2, lp: 2600, drive: 3 }, gate: 1, fx: { hp: 250, lp: 2200, air: -6 }, when: (b) => !major(b) && !sting(b) }),
    hits('sub', [
      { when: (b, s) => s === 0 && !major(b) && (b.label === 'X1' || b.label === 'X5' || b.label === 'XI1' || b.label === 'XI3'), fn: (b, t, rt) => INS.ins_sub({ t, midi: 38, dur: b.time(b.steps) - t, vel: 1, dest: rt.input, det: rt.song.det, o: { vol: 0.03 } }) },
    ]),
    // ---- 「よぶ」から: the steps lighten
    bass({ id: 'bass_slap', ins: 'ins_fm_slap', pattern: "R:4 5:4 R':4 5:4", o: { vol: 0.13 }, when: (b) => major(b) && !sting(b) }),
    hits('bass_yb', [
      { when: (b, s) => sting(b) && s % 4 === 0, fn: (_b, t, rt, s) => INS.ins_fm_bass({ t, midi: s === 8 ? 45 : 38, dur: 0.38, vel: 1, dest: rt.input, det: rt.song.det, o: { vol: 0.14 } }) },
    ]),
    pads({ id: 'pad', o: { vol: 0.024 }, fx: { lp: 1500, q: 0.7 }, when: live }),
    // stage 1: the boots of a man who never stopped (kick, a tight snare on 2 and 4)
    drums({
      id: 'drums',
      kit: {
        drm_kick: (b) => (!major(b) ? (b.inIntro ? 'x.......x.......' : 'x.......x.x.....') : null),
        drm_snare_tight: (b) => (!major(b) && live(b) ? '....x.......x...' : null),
        drm_hat_c: (b) => (!major(b) && live(b) ? '..x...x...x...x.' : null),
      },
      vel: { drm_hat_c: 0.5 },
    }),
    // D major: people arriving — soft kick, brushes, a shaker
    drums({
      id: 'drums2',
      kit: {
        drm_kick_soft: (b) => (major(b) ? 'x.......x.......' : null),
        drm_snare_brush: (b) => (major(b) ? '....x.......x...' : null),
        drm_shaker: (b) => (major(b) ? 'x.x.x.x.x.x.x.x.' : null),
      },
      vel: { drm_shaker: 0.45 },
    }),
    ...kireLayers(),
    ...teppanLayers(),
    voices,
  ];
  return {
    id: 'bgm_boss_tsugao',
    title: 'ツガオ決戦',
    bpm: BPM,
    bars: bt.bars,
    intro: ['XI1', 'XI2', 'XI3', 'XI4'],
    loop: LOOP,
    parts,
    gainDb: 0,
    // 大水槽のホール (suizoku, wide)
    reverb: { len: 1.8, decay: 3.0, level: 0.26, hp: 200 },
    battle: true,
    setup(sp) {
      // (the offline QA renders hear a crowd set by QA_LAYERS)
      sp.state.layers = sp.g.offline ? [...QA_LAYERS] : [];
    },
    route(sp, next) {
      if (next.intro) return;
      const label = sp.def.loop[next.i];
      const n = parseInt(label.slice(1), 10);
      // stage 1 loops X1–X8; from the first 「よぶ」, X9–X16
      if (sp.params.yobu >= 1 && n <= 8) return { intro: false, i: 8 };
      if (sp.params.yobu < 1 && n >= 9) return { intro: false, i: 0 };
      return undefined;
    },
    onBar(sp, b) {
      // the crowd (and which towns came) is known before the bar's parts are asked
      if (b.p.yobu >= 1) layers(sp);
      if (sp.state.sting) {
        b.data.sting = true;
        sp.state.sting = undefined;
      } else if (sp.state.yb4 === 'wait' && b.label === 'X9') {
        b.data.sting = true;
        sp.state.yb4 = 'done';
      }
    },
    onParam(sp, name, value, old) {
      if (name === 'boss_phase' && value >= 3 && old < 3) {
        for (const id of NOT_VOICES) sp.partGain(id, 0, 1.0);
        finalChord(sp);
      }
    },
  };
}

export const BOSS_TSUGAO_DEF = registerSong(bossTsugaoDef());

// ---------------------------------------------------------------------------
// bgm_c3_taikin — M7′ (63 1.3, 5.9 part=taikin, 12.20). エゴ's 「ガチャン。」 —
// the first 「退勤」 in 40 years — and 0.6 s later M7 is said once more and
// goes on, at last, to its fifth note: D3 E♭3 D3 A2 → D2. The home note every
// A2 of bgm_tsugao and bgm_tsugao_hall was waiting for. On the sub (with a
// soft grit an octave up so a phone hears the line), once, no loop. The event
// cuts its tail at 「……ほいじゃ、つがおちゃん 寝る〜♪」 (stopBgm(1.5)).
// Only here does M7 go on to the fifth note (16.1: the sealed check).

const TAIKIN_MML = `
@song bgm_c3_taikin part=taikin ins=ins_sub meter=4/4
Z1  Dm             | D3:4 Eb3:4 D3:4 A2:4 |
Z2  D              | D2:16 |
`;

const tk = score(TAIKIN_MML, BOSS_TSUGAO_CHORDS);

function taikinDef(): SongDef {
  const line = tk.part('taikin');
  const parts: PartDef[] = [
    melody({ id: 'taikin', ins: 'ins_sub', bars: line, o: { vol: 0.07 }, gate: 1 }),
    melody({ id: 'taikin_grit', ins: 'ins_fm_fretless', bars: line, transpose: 12, o: { vol: 0.035, index: 1.4, lp: 1800 }, gate: 1, fx: { hp: 200, lp: 2000 } }),
    // the long D under Z2: a breath of pad, D major at last (no third in M7 — the pad gives it)
    hits('rest', [
      {
        when: (b, s) => b.label === 'Z2' && s === 0,
        fn: (b, t, rt) => [50, 54, 57].forEach((m) => INS.ins_pad({ t, midi: m, dur: b.time(16) - t + 1.2, vel: 1, dest: rt.input, rev: rt.rev, det: rt.song.det, o: { vol: 0.012 } })),
      },
    ]),
  ];
  return {
    id: 'bgm_c3_taikin',
    title: 'ツガオの退勤（M7′）',
    bpm: 96,
    bars: tk.bars,
    intro: ['Z1', 'Z2'],
    loop: [],
    parts,
    gainDb: -2,
    reverb: { len: 2.2, decay: 3.0, level: 0.3, hp: 180 },
  };
}

export const TAIKIN_DEF = registerSong(taikinDef());

/** QA: the hz of a voice's layer note (sound test). */
export function layerHz(voiceId: string): number | null {
  const m = voiceBaseMidi(voiceId);
  return m === null ? null : midiHz(nearestPc(m, D69));
}
