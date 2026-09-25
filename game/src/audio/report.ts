// Offline QA for ears we don't have (brief item 8): render songs / SFX /
// voices / ambience into an OfflineAudioContext with the exact same graph and
// code as the game, then measure.
//
//   __game.cmd.audioReport()          → pass / fail summary + all numbers:
//       · every song over a full loop: loudness (BS.1770 LUFS) vs the 11.2
//         targets relative to bgm_battle (±3 dB), peaks, clipping, loop-seam
//         clicks; the home / shop songs also at stage 1 and 2
//       · every SE: peak vs its category target, and "not buried": the SE's
//         loudest 20 ms in some octave band must stand above the music's
//         average level in that band (UI / battle cues +6 dB, events +3 dB)
//       · voices vs their peak targets
//       · a stress mix at volume 10 / 10 (boss + heavy hits) must not clip
//       · mml bar lengths and the sealed chime answer (16.1)
//     and the in-context checks (a level "on target" alone proves nothing
//     about being heard where it plays):
//       · ambience over the music it plays under (4.2 pairs): a room's
//         character layers ≥ +3 dB over the song in some octave band, beds
//         ≥ 0 dB, the music still ≥ 4 LU in front, peaks under −16 dBFS
//       · kire layers: each step 1→2, 2→3 ≥ +1 LU or ≥ +3 dB at 4–8 kHz
//       · stereo width above 500 Hz: side 7–15 dB under mid, corr ≥ 0.4
//       · laptop speakers: ≤ 3 LU lost through a 180 Hz 24 dB/oct high-pass
//   __game.cmd.audioContext([...])    → those four (+ 'voicing': chord tops under the tune) alone
//   __game.cmd.audioMixSuggest()      → calibrates the mix.ts trims (ambience: by the context check)
//   __game.cmd.audioRender(id, secs)  → stats + spectrogram / piano-roll PNGs
//   __game.cmd.audioPerf()            → render speed of the densest songs (CPU budget, 15.3)
//
// Loudness is ITU-R BS.1770 (K-weighted, gated) so different songs compare the
// way ears do, not just by peaks.
//
// Development only: the commands register from registerReportCommands(),
// which audio/content.ts calls under import.meta.env.DEV — nothing here ships
// in `vite build`.

import { registerDebug } from '../debug';
import { createAmbient } from './ambience';
import { buildGraph, gainToDb, resetOfflineState, setNoteLog, volCurve, withGraph, type Graph } from './engine';
import { PART_TRIM, partRole, REF_PART, ROLE_TARGET, TARGET_OVERRIDE, BATTLE_PEAK_DB, BGM_TARGET, BGM_TRIM, mixState, seTargetDb, SE_NO_TRIM, SE_TRIM, AMB_TRIM, VOICE_TRIM, voiceTargetDb } from './mix';
import { sfxInfo, sfxTable, songTable, type SfxOpts } from './registry';
import { VOICE_SAMPLES, voiceCps } from './samples';
import { MUSIC_LOOKAHEAD, PARAM_DEFAULTS, SongPlayer, type Params, type SongDef } from './sequencer';
import { findSealedAnswer, mmlErrors } from './theory';
import { AMBIENCE_IDS } from './ambience';
import { blip, resetVoiceState, VOICES } from './voices';

const SR = 48000;

export interface Stats {
  peakDb: number;
  rmsDb: number;
  lufs: number;
  /** Loudest 400 ms block (LUFS). */
  momentaryMax: number;
  clips: number;
  seconds: number;
}

// ---------------------------------------------------------------------------
// rendering

interface RenderOut {
  buffer: AudioBuffer;
  notes: { t: number; dur: number; freq: number; vol: number; wave: string }[];
  /** Wall ms spent in the JS scheduler (the page thread's share). */
  scheduleMs: number;
}

interface RenderOpts {
  /** Measure at the master, before the compressor / limiter (11.2 targets). */
  bypass?: boolean;
  /** User volume sliders (0..10); default BGM 7, SE 8. */
  bgmVol?: number;
  seVol?: number;
}

/**
 * Render `seconds` offline with the game's own graph. `schedule` runs once at
 * t = 0; `pump(until)` (songs, ambience) is then called in 0.5 s chunks with
 * the same ~0.1 s look-ahead the live clock uses, the context suspended at
 * each boundary (MUSIC_LOOKAHEAD, like the live clock). Scheduling everything up front instead would keep every note
 * of the render connected from the first sample, which is both far slower to
 * render and nothing like the live graph (the CPU figures of audioPerf()).
 */
export async function render(
  seconds: number,
  schedule: (g: Graph) => void,
  o: RenderOpts = {},
  pump?: (until: number) => void,
): Promise<RenderOut> {
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * seconds), SR);
  const g = buildGraph(ctx, { bypassDynamics: o.bypass });
  // the same take every run: seeded randomness, noise read-heads from the start
  resetOfflineState();
  g.musicUser.gain.value = volCurve(o.bgmVol ?? 7);
  g.seUser.gain.value = volCurve(o.seVol ?? 8);
  const notes: RenderOut['notes'] = [];
  let scheduleMs = 0;
  const run = (fn: () => void) => {
    setNoteLog(notes);
    const t0 = performance.now();
    try {
      withGraph(g, fn);
    } finally {
      setNoteLog(null);
      scheduleMs += performance.now() - t0;
    }
  };
  run(() => {
    schedule(g);
    pump?.(Math.min(seconds, CHUNK + LOOKAHEAD));
  });
  if (pump) {
    const next = (t: number) => {
      if (t >= seconds) return;
      void ctx.suspend(t).then(() => {
        run(() => pump(Math.min(seconds, t + CHUNK + LOOKAHEAD)));
        next(t + CHUNK);
        void ctx.resume();
      });
    };
    next(CHUNK);
  }
  const buffer = await ctx.startRendering();
  return { buffer, notes, scheduleMs };
}

const CHUNK = 0.5;
const LOOKAHEAD = MUSIC_LOOKAHEAD;

function startSong(g: Graph, def: SongDef, at: number, params: Partial<Params> = {}, solo?: string[]): SongPlayer {
  return new SongPlayer(g, def, g.musicBus, { at, params: { stage: 0, kire: 0, boss_phase: 1, ...params }, solo });
}

export async function renderSong(
  id: string,
  seconds: number,
  opts: RenderOpts & { params?: Partial<Params>; paramAt?: [number, keyof Params, number][]; solo?: string[] } = {},
): Promise<RenderOut> {
  const def = songTable.get(id);
  if (!def) throw new Error(`unknown song ${id}`);
  let p: SongPlayer;
  const changes = [...(opts.paramAt ?? [])].sort((a, b) => a[0] - b[0]);
  return render(
    seconds,
    (g) => {
      p = startSong(g, def, 0.05, opts.params, opts.solo);
    },
    opts,
    (until) => {
      while (changes.length && changes[0][0] <= until) {
        const [at, name, v] = changes.shift()!;
        p.pump(at);
        p.setParam(name, v);
      }
      p.pump(until);
    },
  );
}

export async function renderSfx(id: string, opts: SfxOpts = {}, seconds = 2.5, withBgm?: string, ro: RenderOpts = {}): Promise<RenderOut> {
  const fn = sfxTable.get(id);
  if (!fn) throw new Error(`unknown sfx ${id}`);
  let p: SongPlayer | null = null;
  return render(
    seconds,
    (g) => {
      const def = withBgm ? songTable.get(withBgm) : undefined;
      if (def) p = startSong(g, def, 0);
      fn({ ...opts, at: 0.1 });
    },
    ro,
    (until) => p?.pump(until),
  );
}

export async function renderAmbient(id: string, seconds = 12, stage = 0, ro: RenderOpts = {}, ao: { vol?: number; lp?: number } = {}): Promise<RenderOut> {
  let inst: ReturnType<typeof createAmbient> = null;
  return render(
    seconds,
    (g) => {
      inst = createAmbient(g, id, { fade: 0.05, ...ao }, g.ambBus, 0.02, stage);
    },
    ro,
    (until) => inst?.impl.pump?.(until),
  );
}

/** A voice speaking its sample line at the dialog speed (40 chars/s). */
export async function renderVoice(id: string, text = VOICE_SAMPLES[id] ?? VOICE_SAMPLES.default, ro: RenderOpts = {}): Promise<RenderOut> {
  const cps = voiceCps(id);
  const chars = [...text];
  const seconds = chars.length / cps + 1.2;
  return render(
    seconds,
    () => {
      resetVoiceState();
      chars.forEach((ch, i) => blip(id, ch, 0.1 + i / cps));
      resetVoiceState();
    },
    ro,
  );
}

/** Length of the intro plus one loop (s), at the default params. */
export function songLength(def: SongDef, loops = 1): number {
  const p: Params = { ...PARAM_DEFAULTS, stage: def.fixedStage ?? 0 };
  let t = 0;
  const bars = [...def.intro, ...Array.from({ length: loops }, () => def.loop).flat()];
  // the boss loop list holds both phases; phase 1 plays the first 24 bars
  const list = def.id === 'bgm_boss' ? [...def.intro, ...def.loop.slice(0, 24)] : bars;
  for (const l of list) {
    const b = def.bars.get(l);
    if (!b) continue;
    const bpm = b.bpm ?? def.tempo?.(p, null as never) ?? def.bpm;
    t += (b.steps * 60) / bpm / 4;
  }
  return t;
}

// ---------------------------------------------------------------------------
// measurement

function kFilter(x: Float32Array): Float32Array {
  // BS.1770 pre-filter (48 kHz): high shelf + RLB high-pass
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const b = [1.53512485958697, -2.69169618940638, 1.19839281085285];
  const a = [-1.69065929318241, 0.73248077421585];
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
    y[i] = v;
  }
  x1 = x2 = y1 = y2 = 0;
  const a2 = [-1.99004745483398, 0.99007225036621];
  for (let i = 0; i < y.length; i++) {
    const xi = y[i];
    const v = xi - 2 * x1 + x2 - a2[0] * y1 - a2[1] * y2;
    x2 = x1; x1 = xi; y2 = y1; y1 = v;
    y[i] = v;
  }
  return y;
}

export function measure(buf: AudioBuffer, from = 0): Stats {
  const chans = [buf.getChannelData(0), buf.getChannelData(1)];
  const s0 = Math.floor(from * buf.sampleRate);
  let peak = 0;
  let sum = 0;
  let clips = 0;
  let n = 0;
  for (const d of chans)
    for (let i = s0; i < d.length; i++) {
      const a = Math.abs(d[i]);
      if (a > peak) peak = a;
      if (a >= 0.999) clips++;
      sum += d[i] * d[i];
      n++;
    }
  const kf = chans.map((d) => kFilter(d.subarray(s0)));
  const blk = Math.floor(0.4 * buf.sampleRate);
  const hop = Math.floor(0.1 * buf.sampleRate);
  const blocks: number[] = [];
  for (let i = 0; i + blk <= kf[0].length; i += hop) {
    let z = 0;
    for (const d of kf) {
      let e = 0;
      for (let j = i; j < i + blk; j++) e += d[j] * d[j];
      z += e / blk;
    }
    blocks.push(z);
  }
  const L = (z: number) => -0.691 + 10 * Math.log10(Math.max(1e-12, z));
  const abs = blocks.filter((z) => L(z) > -70);
  const meanAbs = abs.reduce((a, b) => a + b, 0) / Math.max(1, abs.length);
  const rel = abs.filter((z) => L(z) > L(meanAbs) - 10);
  const lufs = rel.length ? L(rel.reduce((a, b) => a + b, 0) / rel.length) : -99;
  const mMax = blocks.length ? L(Math.max(...blocks)) : -99;
  return {
    peakDb: round(gainToDb(peak)),
    rmsDb: round(gainToDb(Math.sqrt(sum / Math.max(1, n)))),
    lufs: round(lufs),
    momentaryMax: round(mMax),
    clips,
    seconds: round(buf.duration - from),
  };
}

const round = (x: number) => Math.round(x * 10) / 10;

/**
 * Clicks: isolated one- or two-sample spikes in the second difference (a hard
 * edge that no instrument here makes on purpose — band-limited oscillators,
 * enveloped noise). Returns the times (s) of the suspicious samples, merged
 * within 10 ms.
 */
export function clickScan(buf: AudioBuffer, from = 0): number[] {
  const sr = buf.sampleRate;
  const out: number[] = [];
  const w = Math.floor(0.002 * sr);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const x = buf.getChannelData(ch);
    const n = x.length;
    const d = new Float32Array(n);
    for (let i = 2; i < n; i++) d[i] = x[i] - 2 * x[i - 1] + x[i - 2];
    // running sum of squares for the neighbourhood energy
    const sq = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) sq[i + 1] = sq[i] + d[i] * d[i];
    for (let i = Math.max(2 + w, Math.floor(from * sr)); i < n - w; i++) {
      const a = Math.abs(d[i]);
      if (a < 0.02) continue;
      const e = sq[i + w + 1] - sq[i - w] - d[i] * d[i] - (d[i + 1] ?? 0) ** 2 - d[i - 1] ** 2;
      const rms = Math.sqrt(Math.max(0, e) / (2 * w - 2));
      if (a > 10 * rms) {
        const t = i / sr;
        if (!out.length || t - out[out.length - 1] > 0.01) out.push(Math.round(t * 1000) / 1000);
      }
    }
  }
  return out.sort((p, q) => p - q);
}

/** Octave bands used for the masking check. */
export const BANDS = [125, 250, 500, 1000, 2000, 4000, 8000];

/**
 * Level (dB) per octave band: 'max' = loudest 20 ms window (an SE's
 * attack), 'mean' = average energy (a song's bed).
 */
export function bandProfile(buf: AudioBuffer, mode: 'max' | 'mean', from = 0, to = Infinity): number[] {
  const sr = buf.sampleRate;
  const s0 = Math.floor(from * sr);
  const s1 = Math.min(buf.length, Math.floor(to * sr));
  const win = Math.floor(0.02 * sr);
  return BANDS.map((hz) => {
    const w0 = (2 * Math.PI * hz) / sr;
    const alpha = Math.sin(w0) / (2 * 1.414);
    const b0 = alpha, b2 = -alpha;
    const a0 = 1 + alpha, a1 = -2 * Math.cos(w0), a2 = 1 - alpha;
    const acc = new Float64Array(Math.ceil((s1 - s0) / win) + 1);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = s0; i < s1; i++) {
        const y = (b0 * d[i] + b2 * x2 - a1 * y1 - a2 * y2) / a0;
        x2 = x1; x1 = d[i]; y2 = y1; y1 = y;
        acc[Math.floor((i - s0) / win)] += y * y;
      }
    }
    let v = 0;
    if (mode === 'max') for (let k = 0; k < acc.length; k++) v = Math.max(v, acc[k] / (win * 2));
    else {
      for (let k = 0; k < acc.length; k++) v += acc[k] / (win * 2);
      v /= Math.max(1, acc.length);
    }
    return 10 * Math.log10(Math.max(1e-14, v));
  });
}

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const ar = re[i + j], ai = im[i + j];
        const br = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci;
        const bi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr;
        re[i + j] = ar + br; im[i + j] = ai + bi;
        re[i + j + len / 2] = ar - br; im[i + j + len / 2] = ai - bi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// pictures (so a human-less QA can still "look" at the sound)

function magma(v: number): [number, number, number] {
  const stops: [number, number, number, number][] = [
    [0, 0, 0, 4], [0.25, 60, 15, 110], [0.5, 180, 55, 120], [0.75, 250, 140, 60], [1, 252, 250, 190],
  ];
  v = Math.max(0, Math.min(1, v));
  for (let i = 1; i < stops.length; i++)
    if (v <= stops[i][0]) {
      const [p0, r0, g0, b0] = stops[i - 1];
      const [p1, r1, g1, b1] = stops[i];
      const u = (v - p0) / (p1 - p0);
      return [r0 + (r1 - r0) * u, g0 + (g1 - g0) * u, b0 + (b1 - b0) * u];
    }
  return [252, 250, 190];
}

export function spectrogram(buf: AudioBuffer, w = 1200, h = 360): string {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h + 80;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#000';
  c.fillRect(0, 0, w, h + 80);
  const d0 = buf.getChannelData(0);
  const d1 = buf.getChannelData(1);
  const sr = buf.sampleRate;
  const N = 2048;
  const img = c.createImageData(w, h);
  const fLo = 30, fHi = 16000;
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let x = 0; x < w; x++) {
    const s = Math.floor((x / w) * (d0.length - N));
    for (let j = 0; j < N; j++) {
      re[j] = ((d0[s + j] + d1[s + j]) * 0.5) * (0.5 - 0.5 * Math.cos((2 * Math.PI * j) / N));
      im[j] = 0;
    }
    fft(re, im);
    for (let y = 0; y < h; y++) {
      const f = fLo * Math.pow(fHi / fLo, 1 - y / h);
      const k = Math.min(N / 2 - 1, Math.round((f * N) / sr));
      const m = Math.hypot(re[k], im[k]) / (N / 4);
      const db = 20 * Math.log10(m + 1e-9);
      const [r, g, b] = magma((db + 90) / 80);
      const i = (y * w + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  // waveform
  c.fillStyle = '#6fd3ff';
  for (let x = 0; x < w; x++) {
    const a = Math.floor((x / w) * d0.length);
    const b = Math.floor(((x + 1) / w) * d0.length);
    let mx = 0;
    for (let i = a; i < b; i++) mx = Math.max(mx, Math.abs(d0[i]), Math.abs(d1[i]));
    const hh = mx * 36;
    c.fillRect(x, h + 40 - hh, 1, Math.max(1, hh * 2));
  }
  c.fillStyle = '#ff5050';
  c.fillRect(0, h + 4, w, 1);
  c.fillRect(0, h + 76, w, 1);
  c.fillStyle = '#fff';
  c.font = '11px monospace';
  for (const f of [100, 250, 500, 1000, 2000, 4000, 8000]) {
    const y = h * (1 - Math.log(f / fLo) / Math.log(fHi / fLo));
    c.fillText(`${f}`, 2, y);
  }
  for (let s = 0; s < buf.duration; s += 1) {
    const x = (s / buf.duration) * w;
    c.fillRect(x, h, 1, 4);
  }
  return cv.toDataURL('image/png');
}

export function pianoRoll(notes: RenderOut['notes'], seconds: number, w = 1400, h = 420): string {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#101018';
  c.fillRect(0, 0, w, h);
  const mLo = 24, mHi = 108;
  const y = (f: number) => {
    const m = 69 + 12 * Math.log2(f / 440);
    return h - ((m - mLo) / (mHi - mLo)) * h;
  };
  c.strokeStyle = '#222233';
  for (let m = mLo; m <= mHi; m += 12) {
    const yy = h - ((m - mLo) / (mHi - mLo)) * h;
    c.beginPath();
    c.moveTo(0, yy);
    c.lineTo(w, yy);
    c.stroke();
    c.fillStyle = '#556';
    c.fillText(`C${m / 12 - 1}`, 2, yy - 2);
  }
  const col: Record<string, string> = {
    square: '#ffcc55', pulse25: '#ff9955', pulse12: '#ff6677', triangle: '#66ddff', sine: '#88ff99', sawtooth: '#cc88ff', noise: '#777',
  };
  for (const n of notes) {
    const x = (n.t / seconds) * w;
    const ww = Math.max(1, (n.dur / seconds) * w);
    c.globalAlpha = Math.min(1, 0.25 + n.vol * 6);
    c.fillStyle = col[n.wave] ?? '#fff';
    if (!n.freq) c.fillRect(x, h - 6, Math.max(1, ww), 5);
    else if (n.freq < 20000) c.fillRect(x, y(n.freq) - 1, ww, 3);
  }
  c.globalAlpha = 1;
  return cv.toDataURL('image/png');
}

// ---------------------------------------------------------------------------
// In-context checks. A level that is "on target" on its own says nothing
// about whether it is heard where it plays: these four look at sounds inside
// the mix and on the speakers people actually use.

/** Two cascaded 2nd-order high-passes (24 dB/oct), rendered offline. */
async function highpass(buf: AudioBuffer, hz: number): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, buf.length, buf.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  let node: AudioNode = src;
  for (let k = 0; k < 2; k++) {
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hz;
    f.Q.value = Math.SQRT1_2;
    node.connect(f);
    node = f;
  }
  node.connect(ctx.destination);
  src.start();
  return ctx.startRendering();
}

/**
 * 4.2: the music each ambience plays under, and what it has to carry there.
 * 'character' layers are what tells one room from another (the clock of
 * ひのや, the dryer, the fluorescent hum…): their loudest moments must stand
 * ≥ +3 dB over the music's average in some octave band. 'bed' layers (air,
 * insects, wind) only need to reach the music's level there (≥ 0 dB). In
 * every case the music stays in front overall (ambience ≥ 4 LU quieter).
 */
export const AMB_CONTEXT: { amb: string; song: string; stage: number; role: 'character' | 'bed'; vol?: number; lp?: number; where: string }[] = [
  { amb: 'amb_clock_tick', song: 'bgm_shop', stage: 0, role: 'character', where: 'ひのや' },
  { amb: 'amb_dryer', song: 'bgm_shop', stage: 0, role: 'character', where: 'コインランドリー' },
  { amb: 'amb_oil', song: 'bgm_shop', stage: 0, role: 'character', where: '肉のマルヤマ' },
  { amb: 'amb_koban', song: 'bgm_shop', stage: 0, role: 'character', where: '交番' },
  { amb: 'amb_fan', song: 'bgm_home', stage: 0, role: 'character', where: '家2F' },
  { amb: 'amb_higurashi', song: 'bgm_home', stage: 0, role: 'bed', vol: 0.4, lp: 2500, where: '家2F（窓ごし）' },
  { amb: 'amb_fridge', song: 'bgm_home', stage: 0, role: 'character', where: '家1F' },
  { amb: 'amb_tv', song: 'bgm_home', stage: 0, role: 'character', where: '家1F' },
  { amb: 'amb_fluorescent', song: 'bgm_mall', stage: 2, role: 'character', where: 'モール M1〜M4' },
  { amb: 'amb_kaitenyaki', song: 'bgm_mall', stage: 2, role: 'character', where: 'モール M2（近い）' },
  { amb: 'amb_mall_wind', song: 'bgm_mall', stage: 2, role: 'bed', where: 'モール M1' },
  { amb: 'amb_higurashi', song: 'bgm_town_s0', stage: 0, role: 'bed', where: '町・段階0' },
  { amb: 'amb_kawabe', song: 'bgm_town_s0', stage: 0, role: 'character', where: '用水路' },
  { amb: 'amb_arcade', song: 'bgm_town_s0', stage: 0, role: 'character', where: 'アーケード' },
  { amb: 'amb_wind', song: 'bgm_town_s0', stage: 0, role: 'bed', where: '公園・対岸' },
  { amb: 'amb_still', song: 'bgm_town_s1', stage: 1, role: 'bed', where: '町・段階1' },
  { amb: 'amb_s2_town', song: 'bgm_town_s2', stage: 2, role: 'bed', where: '町・段階2' },
  { amb: 'amb_train_far', song: 'bgm_town_s2', stage: 2, role: 'bed', where: '踏切の付近・段階2' },
  { amb: 'amb_night_insects', song: 'bgm_night', stage: 3, role: 'bed', where: 'エンディングの夜' },
];

export interface AmbRow { amb: string; song: string; role: string; where: string; margin: number; band: number; need: number; ambLufs: number; songLufs: number; under: number; peak: number; ok: boolean; bands: number[] }
/** Key of an AMB_CONTEXT row in the report (the window case of 家2F is its own row). */
const ambKey = (c: (typeof AMB_CONTEXT)[number]) => `${c.amb}${c.vol !== undefined ? '(' + c.where + ')' : ''}`;

export async function ambContext(o: { ids?: string[]; seconds?: number } = {}): Promise<Record<string, AmbRow>> {
  const secs = o.seconds ?? 30;
  const songs = new Map<string, { mean: number[]; lufs: number }>();
  const rows: Record<string, AmbRow> = {};
  for (const c of AMB_CONTEXT) {
    if (o.ids && !o.ids.includes(c.amb)) continue;
    const sk = `${c.song}@${c.stage}`;
    let sg = songs.get(sk);
    if (!sg) {
      const r = await renderSong(c.song, secs, { bypass: true, params: { stage: c.stage } });
      sg = { mean: bandProfile(r.buffer, 'mean', 1), lufs: measure(r.buffer, 1).lufs };
      songs.set(sk, sg);
    }
    const ra = await renderAmbient(c.amb, secs, c.stage, { bypass: true }, { vol: c.vol, lp: c.lp });
    const mx = bandProfile(ra.buffer, 'max', 1);
    const over = mx.map((v, i) => round(v - sg!.mean[i]));
    let bi = 0;
    over.forEach((v, i) => {
      if (v > over[bi]) bi = i;
    });
    const need = c.role === 'character' ? AMB_NEED.character : AMB_NEED.bed;
    const st = measure(ra.buffer, 1);
    const under = round(sg.lufs - st.lufs);
    rows[ambKey(c)] = {
      amb: c.amb, song: c.song, role: c.role, where: c.where, margin: over[bi], band: BANDS[bi], need, ambLufs: st.lufs, songLufs: sg.lufs, under, peak: st.peakDb,
      ok: over[bi] >= need && under >= AMB_UNDER_MIN && st.peakDb <= AMB_PEAK_MAX, bands: over,
    };
  }
  return rows;
}

/** Pass lines of the in-context ambience check (the calibration aims 2 dB above them). */
export const AMB_NEED = { character: 3, bed: 0 };
/** The music stays in front: an ambience is at least this many LU quieter than its song. */
export const AMB_UNDER_MIN = 4;
/** No ambience peaks above this (dBFS, at the master before dynamics, SE volume 8). */
export const AMB_PEAK_MAX = -16;

/** Mean power (dB) between lo and hi Hz (Hann-windowed 4096-point FFT frames). */
export function bandPower(buf: AudioBuffer, lo: number, hi: number, from = 0): number {
  const N = 4096;
  const sr = buf.sampleRate;
  const k0 = Math.ceil((lo * N) / sr), k1 = Math.floor((hi * N) / sr);
  const re = new Float64Array(N), im = new Float64Array(N);
  let acc = 0, frames = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let s = Math.floor(from * sr); s + N <= d.length; s += N) {
      for (let j = 0; j < N; j++) {
        re[j] = d[s + j] * (0.5 - 0.5 * Math.cos((2 * Math.PI * j) / N));
        im[j] = 0;
      }
      fft(re, im);
      for (let k = k0; k <= k1; k++) acc += re[k] * re[k] + im[k] * im[k];
      frames++;
    }
  }
  return 10 * Math.log10(Math.max(1e-20, acc / Math.max(1, frames)));
}

/**
 * The kire layers (7.2, 6.5) must be heard: from kire 1 to 2 and from 2 to 3
 * the whole song gets ≥ +1 LU louder or its 4–8 kHz band ≥ +3 dB brighter.
 */
export async function kireSteps(o: { songs?: string[]; seconds?: number } = {}) {
  const out: Record<string, { levels: { kire: number; lufs: number; high: number }[]; steps: { from: number; to: number; dLufs: number; dHigh: number; ok: boolean }[] }> = {};
  for (const id of o.songs ?? ['bgm_battle', 'bgm_midboss', 'bgm_boss']) {
    const def = songTable.get(id);
    if (!def) continue;
    const levels: { kire: number; lufs: number; high: number }[] = [];
    for (const kire of [1, 2, 3]) {
      const r = await renderSong(id, o.seconds ?? 16, { params: { kire } });
      levels.push({ kire, lufs: measure(r.buffer, 1).lufs, high: round(bandPower(r.buffer, 4000, 8000, 1)) });
    }
    const steps = [0, 1].map((i) => {
      const a = levels[i], b = levels[i + 1];
      const dLufs = round(b.lufs - a.lufs), dHigh = round(b.high - a.high);
      return { from: a.kire, to: b.kire, dLufs, dHigh, ok: dLufs >= 1 || dHigh >= 3 };
    });
    out[id] = { levels, steps };
  }
  return out;
}

/** Side / mid (dB) and L/R correlation of a buffer. */
export function stereoStats(b: AudioBuffer): { sideDb: number; corr: number } {
  const l = b.getChannelData(0), r = b.getChannelData(1);
  let lr = 0, ll = 0, rr = 0, m = 0, sd = 0;
  for (let i = 0; i < l.length; i++) {
    lr += l[i] * r[i];
    ll += l[i] * l[i];
    rr += r[i] * r[i];
    const M = (l[i] + r[i]) / 2, S = (l[i] - r[i]) / 2;
    m += M * M;
    sd += S * S;
  }
  return { sideDb: round(10 * Math.log10(Math.max(1e-12, sd) / Math.max(1e-12, m))), corr: Math.round((1000 * lr) / Math.sqrt(ll * rr + 1e-20)) / 1000 };
}

/**
 * Stereo width (1.2 "ステレオの広がり"): above 500 Hz (where width is heard)
 * the side signal should sit 10–14 dB under the mid — wide, with the tune
 * still in the middle and mono-safe (L/R correlation ≥ 0.4).
 */
export async function widthCheck(o: { songs?: string[]; seconds?: number } = {}) {
  const out: Record<string, { sideDb: number; corr: number; ok: boolean }> = {};
  for (const id of o.songs ?? [...songTable.keys()].filter((k) => !/jingle/.test(k))) {
    const r = await renderSong(id, o.seconds ?? 20, {});
    const st = stereoStats(await highpass(r.buffer, 500));
    out[id] = { ...st, ok: st.sideDb >= -15 && st.sideDb <= -7 && st.corr >= 0.4 };
  }
  return out;
}

/**
 * Laptop speakers (16.2): through a 180 Hz 24 dB/oct high-pass, the heavy
 * blows and hits may lose at most 3 LU of their loudest moment, and songs at
 * most 3 LU overall.
 */
export const LAPTOP_SE = ['se_stamp_heavy', 'se_don', 'se_thud_low', 'se_ojigi_press', 'se_encounter', 'se_damage', 'se_crit', 'se_stamp', 'se_hit_pofu', 'se_hit_pashi', 'se_bishi'];
export async function laptopCheck(o: { sfx?: string[]; songs?: string[] } = {}) {
  const out: Record<string, { before: number; after: number; loss: number; ok: boolean }> = {};
  for (const id of o.sfx ?? LAPTOP_SE) {
    if (!sfxTable.has(id)) continue;
    const r = await renderSfx(id, {}, 2.5, undefined, { bypass: true });
    const a = measure(r.buffer), b = measure(await highpass(r.buffer, 180));
    const loss = round(a.momentaryMax - b.momentaryMax);
    out[id] = { before: a.momentaryMax, after: b.momentaryMax, loss, ok: loss <= 3 };
  }
  for (const id of o.songs ?? ['bgm_battle', 'bgm_boss', 'bgm_town_s0', 'bgm_title', 'bgm_night', 'bgm_home', 'bgm_shop']) {
    const r = await renderSong(id, 16, { bypass: true });
    const a = measure(r.buffer, 1), b = measure(await highpass(r.buffer, 180), 1);
    const loss = round(a.lufs - b.lufs);
    out[id] = { before: a.lufs, after: b.lufs, loss, ok: loss <= 3 };
  }
  return out;
}

/**
 * Voicing (3.4): the top note of every chord a comping / pad part plays must
 * sit under the melody sounding with it. Renders each chord part and the
 * melody parts solo and compares the note logs; returns, per part, how many
 * chords put their top voice on or above the tune (and the first few).
 */
export async function voicingCheck(o: { songs?: string[]; seconds?: number } = {}) {
  const midi = (f: number) => Math.round(69 + 12 * Math.log2(f / 440));
  const out: Record<string, { chords: number; above: number; examples: string[] }> = {};
  for (const id of o.songs ?? [...songTable.keys()].filter((k) => !/jingle|title/.test(k))) {
    const def = songTable.get(id);
    if (!def) continue;
    const secs = Math.min(o.seconds ?? 45, songLength(def) + 0.5);
    const mel: { t: number; e: number; m: number }[] = [];
    for (const p of def.parts)
      if (partRole(id, p.id) === 'melody')
        for (const n of (await renderSong(id, secs, { solo: [p.id] })).notes) if (n.freq > 20 && n.wave !== 'noise') mel.push({ t: n.t, e: n.t + Math.max(n.dur, 0.08), m: midi(n.freq) });
    if (!mel.length) continue;
    for (const p of def.parts) {
      const role = partRole(id, p.id);
      if (role !== 'chords' && role !== 'pads') continue;
      const notes = (await renderSong(id, secs, { solo: [p.id] })).notes.filter((n) => n.freq > 20);
      const byT = new Map<number, number[]>();
      for (const n of notes) {
        const k = Math.round(n.t * 1000);
        if (!byT.has(k)) byT.set(k, []);
        byT.get(k)!.push(midi(n.freq));
      }
      let chords = 0, above = 0;
      const ex: string[] = [];
      for (const [k, ms] of byT) {
        if (ms.length < 2) continue;
        const t = k / 1000;
        const dur = notes.find((n) => Math.round(n.t * 1000) === k)!.dur;
        const top = Math.max(...ms);
        const under = mel.filter((x) => x.t < t + Math.max(dur, 0.1) && x.e > t).map((x) => x.m);
        if (!under.length) continue;
        chords++;
        const low = Math.min(...under);
        if (top >= low) {
          above++;
          if (ex.length < 4) ex.push(`${t.toFixed(2)}s top ${top} ≥ tune ${low}`);
        }
      }
      if (chords) out[`${id}/${p.id}`] = { chords, above, examples: ex };
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// the report

/** Which music an SE must cut through, and by how much (dB, some octave band). */
export function seAudibility(id: string, group: string | undefined): { need: number; bgm: string } {
  const battle = /^戦闘|ハンコ/.test(group ?? '') || /^se_(chime_chord|stamp|thud|mimashita)/.test(id);
  const bgm = battle ? 'bgm_battle' : 'bgm_town_s0';
  // feet, the HP tick, the far train, a pen stroke: felt more than heard
  if (/^se_(step|stairs|hp_tick|pen_write|train_far|slider|count|star|glint|higurashi_call|furin|coo|sparrow)/.test(id)) return { need: 0, bgm };
  if (/^(UI|会話|戦闘|ハンコ)/.test(group ?? '')) return { need: 6, bgm };
  return { need: 3, bgm };
}

const log = (...a: unknown[]) => console.info('[audioReport]', ...a);

interface SongRow extends Stats {
  seconds: number;
  /** Times of suspected clicks (s). */
  clickAt?: number[];
  target: number;
  rel?: number;
  dev?: number;
  rawPeak?: number;
}

/** Indoor songs follow the town's stage (5.4): their stage-1 / 2 versions are measured as rows of their own. */
const STAGE_ROWS = ['bgm_home', 'bgm_shop'];

async function songRows(ids: string[], maxSeconds: number, raw: boolean, stageRows = false): Promise<Record<string, SongRow>> {
  const out: Record<string, SongRow> = {};
  const jobs: [string, string, Partial<Params>][] = ids.map((id) => [id, id, {}]);
  if (stageRows) for (const id of STAGE_ROWS) if (ids.includes(id)) for (const stage of [1, 2]) jobs.push([`${id}@stage${stage}`, id, { stage }]);
  for (const [key, id, params] of jobs) {
    const def = songTable.get(id);
    if (!def) continue;
    // one full pass (intro + loop); jingles: their length plus the tail
    // (the victory jingle is measured on its 1.5 s fanfare; the afterglow sits −6 dB under it by design)
    const secs = def.jingle ? (def.jingle === 'replace' ? 1.9 : songLength(def) + 1.5) : Math.min(maxSeconds, songLength(def) * (params.stage === 2 ? 1.12 : 1) + 0.5);
    const r = await renderSong(id, secs, { bypass: raw, params });
    out[key] = { ...measure(r.buffer, 0.1), seconds: round(secs), target: BGM_TARGET[id] ?? -3, clickAt: clickScan(r.buffer, 0.1).slice(0, 12) };
    log(key, out[key].lufs, 'LUFS');
  }
  return out;
}

function relate(rows: Record<string, SongRow>): number {
  const ref = rows.bgm_battle?.lufs;
  let maxDev = 0;
  if (ref === undefined) return 0;
  for (const [id, r] of Object.entries(rows)) {
    r.rel = round(r.lufs - ref);
    r.dev = round(r.rel - r.target);
    if (!/jingle/.test(id)) maxDev = Math.max(maxDev, Math.abs(r.dev));
  }
  return maxDev;
}

export async function audioReport(o: { maxSeconds?: number; songs?: string[]; sfx?: string[] | false; voices?: boolean; amb?: boolean; stress?: boolean; context?: boolean } = {}) {
  const t0 = performance.now();
  // ---- BGM (processed, as the player hears it)
  const ids = o.songs ?? [...songTable.keys()];
  const songs = await songRows(ids, o.maxSeconds ?? 75, false, true);
  const maxDev = relate(songs);
  const bgmOff = Object.entries(songs).filter(([id, r]) => !/jingle/.test(id) && Math.abs(r.dev ?? 0) > 3).map(([id, r]) => `${id} (${r.dev} dB)`);

  // ---- SE: category peak (raw) and audibility over the music (raw, octave bands)
  const sfx: Record<string, { peak: number; target: number; peakDev: number; margin?: number; band?: number; need?: number; ok?: boolean; clips: number }> = {};
  const bgBands = new Map<string, number[]>();
  if (o.sfx !== false) {
    const list = o.sfx ?? [...sfxInfo.keys()];
    for (const id of list) {
      if (SE_NO_TRIM.has(id)) continue;
      const group = sfxInfo.get(id)?.group;
      const r = await renderSfx(id, {}, 3, undefined, { bypass: true });
      const st = { ...measure(r.buffer), peakDb: await sePeak(id) };
      const target = seTargetDb(id, group);
      const row: (typeof sfx)[string] = { peak: st.peakDb, target, peakDev: round(st.peakDb - target), clips: st.clips };
      const a = seAudibility(id, group);
      let bg = bgBands.get(a.bgm);
      if (!bg && songTable.has(a.bgm)) {
        bg = bandProfile((await renderSong(a.bgm, 20, { bypass: true })).buffer, 'mean', 1);
        bgBands.set(a.bgm, bg);
      }
      if (bg) {
        const se = bandProfile(r.buffer, 'max');
        let best = -Infinity;
        let bi = 0;
        se.forEach((v, i) => {
          if (v - bg![i] > best) {
            best = v - bg![i];
            bi = i;
          }
        });
        row.margin = round(best);
        row.band = BANDS[bi];
        row.need = a.need;
        row.ok = best >= a.need;
      }
      sfx[id] = row;
    }
    log('sfx done');
  }
  const seBuried = Object.entries(sfx).filter(([, r]) => r.ok === false).map(([id, r]) => `${id} (${r.margin} dB < ${r.need})`);
  const seOffTarget = Object.entries(sfx).filter(([, r]) => Math.abs(r.peakDev) > 3).map(([id, r]) => `${id} (${r.peakDev > 0 ? '+' : ''}${r.peakDev})`);

  // ---- voices and ambience (raw peaks vs targets)
  const voices: Record<string, { peak: number; target: number; dev: number }> = {};
  if (o.voices !== false)
    for (const id of Object.keys(VOICES)) {
      if (id === 'sys') continue;
      const st = measure((await renderVoice(id, undefined, { bypass: true })).buffer);
      voices[id] = { peak: st.peakDb, target: voiceTargetDb(id), dev: round(st.peakDb - voiceTargetDb(id)) };
    }
  // ambience: heard where it plays (4.2 pairs), under its music, below the ceiling
  const amb = o.amb !== false ? await ambContext() : {};
  // (flip: its first character plays the whole se_flip squeak, which sits on the SE fader)
  const voiceOff = Object.entries(voices).filter(([id, r]) => id !== 'flip' && Math.abs(r.dev) > 3).map(([id, r]) => `${id} (${r.dev})`);
  const ambOff = Object.entries(amb)
    .filter(([, r]) => !r.ok)
    .map(([id, r]) => `${id} vs ${r.song}: ${r.margin} dB @${r.band} Hz (need ${r.need}), ${r.under} LU under the music, peak ${r.peak}`);
  // the other in-context checks
  const kire = o.context !== false ? await kireSteps() : {};
  const width = o.context !== false ? await widthCheck() : {};
  const laptop = o.context !== false ? await laptopCheck() : {};
  const kireFlat = Object.entries(kire).flatMap(([id, r]) => r.steps.filter((x) => !x.ok).map((x) => `${id} kire ${x.from}→${x.to}: ${x.dLufs} LU, 4–8 kHz ${x.dHigh} dB`));
  const narrow = Object.entries(width).filter(([, r]) => !r.ok).map(([id, r]) => `${id} (side ${r.sideDb} dB, corr ${r.corr})`);
  const thin = Object.entries(laptop).filter(([, r]) => !r.ok).map(([id, r]) => `${id} (−${r.loss} LU)`);

  // ---- stress: the loudest moment of the game at volume 10 / 10
  let stress: Stats | null = null;
  if (o.stress !== false) {
    const def = songTable.get('bgm_boss')!;
    let p: SongPlayer;
    const r = await render(
      12,
      (g) => {
        p = startSong(g, def, 0.05, { kire: 3 });
        const hit = (id: string, at: number, opts: SfxOpts = {}) => sfxTable.get(id)?.({ ...opts, at });
        for (let k = 0; k < 5; k++) {
          const t = 2 + k * 1.8;
          hit('se_stamp_heavy', t);
          hit('se_thud_low', t);
          hit('se_don', t + 0.4);
          hit('se_chime_chord', t + 0.4);
          hit('se_crit', t + 0.9);
          hit('se_bishi', t + 1.1, { vol: 1.3 });
        }
        hit('se_bell_kanenari', 11);
      },
      { bgmVol: 10, seVol: 10 },
      (until) => p.pump(until),
    );
    stress = measure(r.buffer);
  }

  const clipping = [...Object.entries(songs).filter(([, r]) => r.clips > 0).map(([id]) => id), ...(stress && stress.clips > 0 ? ['stress@10'] : [])];
  const clicks = Object.entries(songs).filter(([, r]) => r.clickAt?.length).map(([id, r]) => `${id} @ ${r.clickAt!.join(', ')}`);
  const sealed = sealedCheck();
  return {
    elapsedSec: round((performance.now() - t0) / 1000),
    summary: {
      mmlErrors: mmlErrors.length ? [...mmlErrors] : 'none',
      sealedAnswerLeaks: sealed.length ? sealed : 'none',
      clipping: clipping.length ? clipping : 'none',
      clicks: clicks.length ? clicks : 'none',
      stressPeakAtVolume10: stress?.peakDb ?? null,
      bgmMaxDeviationDb: maxDev,
      bgmWithin3dB: bgmOff.length ? bgmOff : 'all',
      seBuried: seBuried.length ? seBuried : 'none',
      seOffPeakTarget: seOffTarget.length ? seOffTarget : 'none',
      voicesOffTarget: voiceOff.length ? voiceOff : 'none',
      ambienceNotHeardInContext: ambOff.length ? ambOff : 'none',
      kireStepsNotHeard: kireFlat.length ? kireFlat : 'none',
      stereoWidthOff: narrow.length ? narrow : 'none',
      laptopSpeakerLoss: thin.length ? thin : 'none',
    },
    bgm: songs,
    sfx,
    voices,
    amb,
    kire,
    width,
    laptop,
    stress,
  };
}

/**
 * Calibrate the mix.ts trims: measure every sound with the trims bypassed and
 * return the tables that put each one on its target (paste into mix.ts).
 */
export async function audioMixSuggest(o: { songs?: boolean; sfx?: boolean; voices?: boolean; amb?: boolean; maxSeconds?: number } = {}) {
  const q = (x: number) => Math.round(x * 2) / 2;
  const clamp = (x: number) => Math.max(-18, Math.min(28, x));
  const out: { BGM_TRIM?: Record<string, number>; SE_TRIM?: Record<string, number>; VOICE_TRIM?: Record<string, number>; AMB_TRIM?: Record<string, number>; ambNotes?: string[] } = {};
  if (o.amb !== false) {
    // Ambience faders are set where the ambience is heard: each is raised
    // until every one of its 4.2 pairs clears its pass line by 2 dB (never
    // lowered: a bed that already carries stays as it is), as long as the
    // music stays ≥ 6 LU in front and the peak under the ceiling. Measured
    // with the current trims and songs as they will play.
    const rows = await ambContext();
    const lift = new Map<string, number>();
    const room = new Map<string, number>();
    for (const r of Object.values(rows)) {
      lift.set(r.amb, Math.max(lift.get(r.amb) ?? -Infinity, r.need + 2 - r.margin));
      room.set(r.amb, Math.min(room.get(r.amb) ?? Infinity, r.under - 6, AMB_PEAK_MAX - r.peak));
    }
    const t: Record<string, number> = {};
    const notes: string[] = [];
    for (const id of AMBIENCE_IDS) {
      const cur = AMB_TRIM[id] ?? 0;
      const want = Math.max(0, lift.get(id) ?? 0);
      const can = Math.max(0, room.get(id) ?? Infinity);
      if (want > can) notes.push(`${id}: needs +${round(want)} dB, room for +${round(can)} (reshape the recipe)`);
      t[id] = q(cur + Math.min(want, can));
    }
    out.AMB_TRIM = t;
    out.ambNotes = notes;
  }
  mixState.bypass = true;
  try {
    if (o.songs !== false) {
      // loudness from the raw renders: battle is anchored on its peak, the rest follow 11.2
      const rows = await songRows([...songTable.keys()], o.maxSeconds ?? 75, true);
      const b = rows.bgm_battle;
      const battleTrim = BATTLE_PEAK_DB - b.peakDb;
      const refLufs = b.lufs + battleTrim;
      const t: Record<string, number> = {};
      for (const [id, r] of Object.entries(rows)) t[id] = id === 'bgm_battle' ? q(battleTrim) : q(clamp(refLufs + (BGM_TARGET[id] ?? -3) - r.lufs));
      out.BGM_TRIM = t;
    }
    if (o.sfx !== false) {
      const t: Record<string, number> = {};
      for (const id of sfxInfo.keys()) {
        if (SE_NO_TRIM.has(id)) continue;
        const pk = await sePeak(id);
        if (pk < -120) continue;
        t[id] = q(Math.max(-18, Math.min(36, seTargetDb(id, sfxInfo.get(id)?.group) - pk)));
      }
      out.SE_TRIM = t;
    }
    if (o.voices !== false) {
      const t: Record<string, number> = {};
      for (const id of Object.keys(VOICES)) {
        if (id === 'sys') continue;
        const st = measure((await renderVoice(id, undefined, { bypass: true })).buffer);
        t[id] = q(clamp(voiceTargetDb(id) - st.peakDb));
      }
      out.VOICE_TRIM = t;
    }
    return out;
  } finally {
    mixState.bypass = false;
  }
}

/** An SE's raw peak: the median of three renders (per-call randomisation, 11.5). */
async function sePeak(id: string): Promise<number> {
  const p: number[] = [];
  for (let i = 0; i < 3; i++) p.push(measure((await renderSfx(id, {}, 3, undefined, { bypass: true })).buffer).peakDb);
  return p.sort((a, b) => a - b)[1];
}

/**
 * Balance inside songs: every part solo (BS.1770, gated) against the melody,
 * compared with the role targets of mix.ts. Returns the part table and the
 * PART_TRIM that levels it (current trim + the correction, ±8 dB max).
 */
export async function audioBalance(ids: string[] = [...songTable.keys()].filter((id) => !/jingle/.test(id)), seconds = 75) {
  const table: Record<string, Record<string, { lufs: number; role: string; rel?: number; want?: number | null }>> = {};
  const trims: Record<string, number> = { ...PART_TRIM };
  for (const id of ids) {
    const def = songTable.get(id);
    if (!def) continue;
    const secs = Math.min(seconds, songLength(def) + 0.5);
    const rows: Record<string, { lufs: number; role: string; rel?: number; want?: number | null }> = {};
    for (const p of def.parts) {
      const st = measure((await renderSong(id, secs, { solo: [p.id] })).buffer, 0.2);
      rows[p.id] = { lufs: st.lufs, role: partRole(id, p.id) };
    }
    const refRow = rows[REF_PART[id] ?? 'lead'] ?? Object.values(rows).find((r) => r.role === 'melody');
    const ref = refRow && refRow.lufs > -90 ? refRow.lufs : null;
    if (ref !== null)
      for (const [pid, r] of Object.entries(rows)) {
        if (r.lufs <= -90) continue;
        r.rel = round(r.lufs - ref);
        const key = `${id}/${pid}`;
        const want = TARGET_OVERRIDE[key] ?? ROLE_TARGET[r.role as keyof typeof ROLE_TARGET];
        r.want = want;
        if (want === null || want === undefined || r === refRow) continue;
        const delta = want - r.rel;
        if (Math.abs(delta) < 1) continue;
        const next = Math.round(((PART_TRIM[key] ?? 0) + delta) * 2) / 2;
        trims[key] = Math.max(-6, Math.min(6, next));
      }
    table[id] = rows;
    log('balance', id);
  }
  return { table, PART_TRIM: trims };
}

/** Current trims (for diffing against a new suggestion). */
export function currentTrims() {
  return { BGM_TRIM, SE_TRIM, VOICE_TRIM, AMB_TRIM };
}

/** The chime "answer" (−2, −3, +3) must not appear before the ending (1.3, 16.1). */
export function sealedCheck(): string[] {
  const leaks: string[] = [];
  for (const [id, def] of songTable) {
    if (id === 'bgm_ending' || id === 'bgm_title_clear') continue;
    for (const part of def.parts) {
      const seq = (part as unknown as { melodySeq?: () => number[] }).melodySeq?.();
      if (seq && findSealedAnswer(seq) >= 0) leaks.push(`${id}/${part.id}`);
    }
  }
  return leaks;
}

// ---------------------------------------------------------------------------

function bufToWavDataUrl(buf: AudioBuffer): string {
  const n = buf.length;
  const data = new DataView(new ArrayBuffer(44 + n * 4));
  const w = (o: number, s: string) => [...s].forEach((ch, i) => data.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF');
  data.setUint32(4, 36 + n * 4, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, 2, true);
  data.setUint32(24, buf.sampleRate, true);
  data.setUint32(28, buf.sampleRate * 4, true);
  data.setUint16(32, 4, true);
  data.setUint16(34, 16, true);
  w(36, 'data');
  data.setUint32(40, n * 4, true);
  const l = buf.getChannelData(0), r = buf.getChannelData(1);
  for (let i = 0; i < n; i++) {
    data.setInt16(44 + i * 4, Math.max(-1, Math.min(1, l[i])) * 32767, true);
    data.setInt16(46 + i * 4, Math.max(-1, Math.min(1, r[i])) * 32767, true);
  }
  let s = '';
  const u8 = new Uint8Array(data.buffer);
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return 'data:audio/wav;base64,' + btoa(s);
}

/**
 * CPU budget (40_audio 15.3: the boss fight, the densest song, should stay
 * near 5 % of a laptop core). Renders the heaviest songs offline, streamed in
 * 0.5 s chunks with the live look-ahead, best of two runs, and splits the
 * cost into
 *  · audioPct — rendering (the audio thread's work; this is the 15.3 figure),
 *  · schedulePct — the JS scheduler (the page thread's work),
 * each as % of one core of this machine, plus the most voices sounding at
 * once (the 40-voice cap of 11.5 holds it) and a machine reference (a bare
 * graph of 40 filtered saws) so figures from different machines compare.
 * `__game.cmd.audioLive()` measures the same songs in a real-time context.
 */
export async function audioPerf(o: { seconds?: number; songs?: [string, Partial<Params>][] } = {}) {
  const seconds = o.seconds ?? 20;
  const list = o.songs ?? [
    ['bgm_boss', { kire: 3 }],
    ['bgm_boss', { kire: 3, boss_phase: 2 }],
    ['bgm_battle', { kire: 3 }],
    ['bgm_midboss', { kire: 3 }],
    ['bgm_town_s2', {}],
    ['bgm_mall', {}],
  ];
  const ref = await (async () => {
    let best = 0;
    for (let k = 0; k < 3; k++) {
      const ctx = new OfflineAudioContext(2, SR * 10, SR);
      for (let i = 0; i < 40; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 110 + i * 7;
        const f = ctx.createBiquadFilter();
        const gn = ctx.createGain();
        gn.gain.value = 0.01;
        osc.connect(f);
        f.connect(gn);
        gn.connect(ctx.destination);
        osc.start();
      }
      const t = performance.now();
      await ctx.startRendering();
      best = Math.max(best, 10000 / (performance.now() - t));
    }
    return best;
  })();
  // the mix graph alone (buses, dynamics, idle reverbs): the floor under every song
  const idle = await (async () => {
    let best = Infinity;
    for (let k = 0; k < 2; k++) {
      const t = performance.now();
      await render(seconds, () => {}, {}, () => {});
      best = Math.min(best, performance.now() - t);
    }
    return best / seconds / 10;
  })();
  const rows: Record<string, { audioPct: number; schedulePct: number; realtimeX: number; notes: number; maxVoices: number }> = {};
  for (const [id, params] of list) {
    let best: { ms: number; sched: number; notes: RenderOut['notes'] } | null = null;
    for (let k = 0; k < 2; k++) {
      const t = performance.now();
      const r = await renderSong(id, seconds, { params });
      const ms = performance.now() - t;
      if (!best || ms < best.ms) best = { ms, sched: r.scheduleMs, notes: r.notes };
    }
    const ev: [number, number][] = [];
    for (const n of best!.notes) ev.push([n.t, 1], [n.t + n.dur + 0.1, -1]);
    ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let now = 0;
    let mx = 0;
    for (const [, d] of ev) mx = Math.max(mx, (now += d));
    rows[`${id}${Object.keys(params).length ? ' ' + JSON.stringify(params) : ''}`] = {
      audioPct: round((best!.ms - best!.sched) / seconds / 10),
      schedulePct: round(best!.sched / seconds / 10),
      realtimeX: round((seconds * 1000) / best!.ms),
      notes: best!.notes.length,
      maxVoices: mx,
    };
  }
  return {
    machineRefX: round(ref),
    graphIdlePct: round(idle),
    note: 'audioPct = % of one core of this machine for rendering (incl. the mix graph, graphIdlePct); schedulePct = the page thread; a laptop core that renders the reference graph N× faster scales both by machineRefX / N',
    songs: rows,
  };
}

/**
 * The QA commands on window.__game.cmd (audioReport, audioContext, audioRender, …).
 * Dev builds only: audio/content.ts calls this under import.meta.env.DEV, so
 * this whole module drops out of `vite build` (40_audio 15.4: QA tooling is
 * not part of the product).
 */
export function registerReportCommands(): void {
  registerDebug('audioReport', ((o?: Parameters<typeof audioReport>[0]) => audioReport(o)) as never);
  /** The in-context checks alone: audioContext(['amb','kire','width','laptop']). */
  registerDebug('audioContext', (async (what: string[] = ['amb', 'kire', 'width', 'laptop'], o: { ids?: string[]; songs?: string[]; sfx?: string[] } = {}) => ({
    amb: what.includes('amb') ? await ambContext({ ids: o.ids }) : undefined,
    kire: what.includes('kire') ? await kireSteps({ songs: o.songs }) : undefined,
    width: what.includes('width') ? await widthCheck({ songs: o.songs }) : undefined,
    laptop: what.includes('laptop') ? await laptopCheck({ sfx: o.sfx }) : undefined,
    voicing: what.includes('voicing') ? await voicingCheck({ songs: o.songs }) : undefined,
  })) as never);
  registerDebug('audioMixSuggest', ((o?: Parameters<typeof audioMixSuggest>[0]) => audioMixSuggest(o)) as never);
  registerDebug('audioTrims', (() => currentTrims()) as never);
  registerDebug('audioBalance', ((ids?: string[], seconds?: number) => audioBalance(ids, seconds)) as never);
  registerDebug('audioPerf', ((o?: Parameters<typeof audioPerf>[0]) => audioPerf(o)) as never);

  registerDebug('audioParts', (async (id: string, seconds = 20, params?: Partial<Params>) => {
    const def = songTable.get(id);
    if (!def) return null;
    const out: Record<string, number> = {};
    out.ALL = measure((await renderSong(id, seconds, { params })).buffer, 0.5).lufs;
    for (const p of def.parts) out[p.id] = measure((await renderSong(id, seconds, { params, solo: [p.id] })).buffer, 0.5).lufs;
    return out;
  }) as never);

  registerDebug('audioRender', (async (id: string, seconds = 16, opts: { params?: Partial<Params>; paramAt?: [number, keyof Params, number][]; wav?: boolean; kind?: 'song' | 'sfx' | 'amb' | 'voice'; stage?: number; sfxOpts?: SfxOpts; withBgm?: string; text?: string; bypass?: boolean } = {}) => {
    const ro = { bypass: opts.bypass };
    const r =
      opts.kind === 'sfx'
        ? await renderSfx(id, opts.sfxOpts ?? {}, seconds, opts.withBgm, ro)
        : opts.kind === 'amb'
          ? await renderAmbient(id, seconds, opts.stage ?? 0, ro)
          : opts.kind === 'voice'
            ? await renderVoice(id, opts.text, ro)
            : await renderSong(id, seconds, { ...ro, params: opts.params, paramAt: opts.paramAt });
    return {
      stats: measure(r.buffer, opts.kind ? 0 : 0.5),
      notes: r.notes.length,
      spectrogram: spectrogram(r.buffer),
      pianoRoll: pianoRoll(r.notes, r.buffer.duration),
      wav: opts.wav ? bufToWavDataUrl(r.buffer) : undefined,
    };
  }) as never);
}
