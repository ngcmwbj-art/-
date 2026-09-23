// Offline QA for ears we don't have (brief item 8): render songs / SFX /
// voices / ambience into an OfflineAudioContext with the exact same graph and
// code as the game, then measure.
//
//   __game.cmd.audioReport()          → pass / fail summary + all numbers:
//       · every song over a full loop: loudness (BS.1770 LUFS) vs the 11.2
//         targets relative to bgm_battle (±3 dB), peaks, clipping
//       · every SE: peak vs its category target, and "not buried": the SE's
//         loudest 20 ms in some octave band must stand above the music's
//         average level in that band (UI / battle cues +6 dB, events +3 dB)
//       · voices and ambience vs their targets
//       · a stress mix at volume 10 / 10 (boss + heavy hits) must not clip
//       · mml bar lengths and the sealed chime answer (16.1)
//   __game.cmd.audioMixSuggest()      → calibrates the mix.ts trims
//   __game.cmd.audioRender(id, secs)  → stats + spectrogram / piano-roll PNGs
//
// Loudness is ITU-R BS.1770 (K-weighted, gated) so different songs compare the
// way ears do, not just by peaks.

import { registerDebug } from '../debug';
import { createAmbient } from './ambience';
import { buildGraph, gainToDb, setNoteLog, volCurve, withGraph, type Graph } from './engine';
import { PART_TRIM, partRole, REF_PART, ROLE_TARGET, TARGET_OVERRIDE, AMB_NO_TRIM, ambTargetDb, BATTLE_PEAK_DB, BGM_TARGET, BGM_TRIM, mixState, seTargetDb, SE_NO_TRIM, SE_TRIM, AMB_TRIM, VOICE_TRIM, voiceTargetDb } from './mix';
import { sfxInfo, sfxTable, songTable, type SfxOpts } from './registry';
import { VOICE_SAMPLES, voiceCps } from './samples';
import { SongPlayer, type Params, type SongDef } from './sequencer';
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
}

interface RenderOpts {
  /** Measure at the master, before the compressor / limiter (11.2 targets). */
  bypass?: boolean;
  /** User volume sliders (0..10); default BGM 7, SE 8. */
  bgmVol?: number;
  seVol?: number;
}

export async function render(seconds: number, schedule: (g: Graph) => void, o: RenderOpts = {}): Promise<RenderOut> {
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * seconds), SR);
  const g = buildGraph(ctx, { bypassDynamics: o.bypass });
  g.musicUser.gain.value = volCurve(o.bgmVol ?? 7);
  g.seUser.gain.value = volCurve(o.seVol ?? 8);
  const notes: RenderOut['notes'] = [];
  setNoteLog(notes);
  try {
    withGraph(g, () => schedule(g));
  } finally {
    setNoteLog(null);
  }
  const buffer = await ctx.startRendering();
  return { buffer, notes };
}

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
  return render(
    seconds,
    (g) => {
      const p = startSong(g, def, 0.05, opts.params, opts.solo);
      const changes = [...(opts.paramAt ?? [])].sort((a, b) => a[0] - b[0]);
      for (const [at, name, v] of changes) {
        p.pump(at);
        p.setParam(name, v);
      }
      p.pump(seconds);
    },
    opts,
  );
}

export async function renderSfx(id: string, opts: SfxOpts = {}, seconds = 2.5, withBgm?: string, ro: RenderOpts = {}): Promise<RenderOut> {
  const fn = sfxTable.get(id);
  if (!fn) throw new Error(`unknown sfx ${id}`);
  return render(
    seconds,
    (g) => {
      if (withBgm) {
        const def = songTable.get(withBgm);
        if (def) startSong(g, def, 0).pump(seconds);
      }
      fn({ ...opts, at: 0.1 });
    },
    ro,
  );
}

export async function renderAmbient(id: string, seconds = 12, stage = 0, ro: RenderOpts = {}): Promise<RenderOut> {
  return render(
    seconds,
    (g) => {
      const inst = createAmbient(g, id, { fade: 0.05 }, g.ambBus, 0.02, stage);
      inst?.impl.pump?.(seconds);
    },
    ro,
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
  const p: Params = { stage: def.fixedStage ?? 0, kire: 0, boss_phase: 1 };
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

async function songRows(ids: string[], maxSeconds: number, raw: boolean): Promise<Record<string, SongRow>> {
  const out: Record<string, SongRow> = {};
  for (const id of ids) {
    const def = songTable.get(id);
    if (!def) continue;
    // one full pass (intro + loop); jingles: their length plus the tail
    // (the victory jingle is measured on its 1.5 s fanfare; the afterglow sits −6 dB under it by design)
    const secs = def.jingle ? (def.jingle === 'replace' ? 1.9 : songLength(def) + 1.5) : Math.min(maxSeconds, songLength(def) + 0.5);
    const r = await renderSong(id, secs, { bypass: raw });
    out[id] = { ...measure(r.buffer, 0.1), seconds: round(secs), target: BGM_TARGET[id] ?? -3, clickAt: clickScan(r.buffer, 0.1).slice(0, 12) };
    log(id, out[id].lufs, 'LUFS');
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

export async function audioReport(o: { maxSeconds?: number; songs?: string[]; sfx?: string[] | false; voices?: boolean; amb?: boolean; stress?: boolean } = {}) {
  const t0 = performance.now();
  // ---- BGM (processed, as the player hears it)
  const ids = o.songs ?? [...songTable.keys()];
  const songs = await songRows(ids, o.maxSeconds ?? 75, false);
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
  const amb: Record<string, { peak: number; lufs: number; target: number; dev: number }> = {};
  if (o.amb !== false)
    for (const id of AMBIENCE_IDS) {
      const st = measure((await renderAmbient(id, 30, 0, { bypass: true })).buffer, 1);
      amb[id] = { peak: st.peakDb, lufs: st.lufs, target: ambTargetDb(id), dev: round(st.peakDb - ambTargetDb(id)) };
    }
  // (flip: its first character plays the whole se_flip squeak, which sits on the SE fader)
  const voiceOff = Object.entries(voices).filter(([id, r]) => id !== 'flip' && Math.abs(r.dev) > 3).map(([id, r]) => `${id} (${r.dev})`);
  const ambOff = Object.entries(amb).filter(([, r]) => Math.abs(r.dev) > 3).map(([id, r]) => `${id} (${r.dev})`);

  // ---- stress: the loudest moment of the game at volume 10 / 10
  let stress: Stats | null = null;
  if (o.stress !== false) {
    const def = songTable.get('bgm_boss')!;
    const r = await render(
      12,
      (g) => {
        const p = startSong(g, def, 0.05, { kire: 3 });
        p.pump(12);
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
      ambienceOffTarget: ambOff.length ? ambOff : 'none',
    },
    bgm: songs,
    sfx,
    voices,
    amb,
    stress,
  };
}

/**
 * Calibrate the mix.ts trims: measure every sound with the trims bypassed and
 * return the tables that put each one on its target (paste into mix.ts).
 */
export async function audioMixSuggest(o: { songs?: boolean; sfx?: boolean; voices?: boolean; amb?: boolean; maxSeconds?: number } = {}) {
  mixState.bypass = true;
  const q = (x: number) => Math.round(x * 2) / 2;
  const clamp = (x: number) => Math.max(-18, Math.min(28, x));
  try {
    const out: { BGM_TRIM?: Record<string, number>; SE_TRIM?: Record<string, number>; VOICE_TRIM?: Record<string, number>; AMB_TRIM?: Record<string, number> } = {};
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
    if (o.amb !== false) {
      const t: Record<string, number> = {};
      for (const id of AMBIENCE_IDS) {
        if (AMB_NO_TRIM.has(id)) continue;
        const st = measure((await renderAmbient(id, 30, 0, { bypass: true })).buffer, 1);
        t[id] = q(Math.max(-18, Math.min(40, ambTargetDb(id) - st.peakDb)));
      }
      out.AMB_TRIM = t;
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

registerDebug('audioReport', ((o?: Parameters<typeof audioReport>[0]) => audioReport(o)) as never);
registerDebug('audioMixSuggest', ((o?: Parameters<typeof audioMixSuggest>[0]) => audioMixSuggest(o)) as never);
registerDebug('audioTrims', (() => currentTrims()) as never);
registerDebug('audioBalance', ((ids?: string[], seconds?: number) => audioBalance(ids, seconds)) as never);
/** Loudness of each part alone (mix balance QA). */
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
