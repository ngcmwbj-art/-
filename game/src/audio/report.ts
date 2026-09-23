// Offline QA for ears we don't have (brief item 8): render songs / SFX into
// an OfflineAudioContext with the exact same graph and code, then measure.
//
//   __game.cmd.audioReport()            → peaks, loudness (LUFS), clipping, BGM
//                                          level spread vs 40_audio 11.2 targets,
//                                          SE-over-BGM audibility margins
//   __game.cmd.audioRender(id, seconds)  → stats + spectrogram / piano-roll PNGs
//
// Loudness is ITU-R BS.1770 (K-weighted, gated) so different songs compare the
// way ears do, not just by peaks.

import { registerDebug } from '../debug';
import { createAmbient } from './ambience';
import { buildGraph, gainToDb, setNoteLog, volCurve, withGraph, type Graph } from './engine';
import { sfxTable, songTable, type SfxOpts } from './registry';
import { SongPlayer, type Params } from './sequencer';
import { findSealedAnswer, mmlErrors } from './theory';

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

async function render(seconds: number, schedule: (g: Graph) => void, bypassDynamics = false): Promise<RenderOut> {
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * seconds), SR);
  const g = buildGraph(ctx, { bypassDynamics });
  g.musicUser.gain.value = volCurve(7);
  g.seUser.gain.value = volCurve(8);
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

export async function renderSong(id: string, seconds: number, opts: { bypass?: boolean; params?: Partial<Params>; paramAt?: [number, keyof Params, number][]; solo?: string[] } = {}): Promise<RenderOut> {
  const def = songTable.get(id);
  if (!def) throw new Error(`unknown song ${id}`);
  return render(
    seconds,
    (g) => {
      const p = new SongPlayer(g, def, g.musicBus, { at: 0.05, params: { stage: 0, kire: 0, boss_phase: 1, ...opts.params }, solo: opts.solo });
      const changes = [...(opts.paramAt ?? [])].sort((a, b) => a[0] - b[0]);
      let t = 0.05;
      for (const [at, name, v] of changes) {
        p.pump(at);
        t = at;
        p.setParam(name, v);
      }
      void t;
      p.pump(seconds);
    },
    opts.bypass,
  );
}

export async function renderSfx(id: string, opts: SfxOpts = {}, seconds = 2.5, withBgm?: string): Promise<RenderOut> {
  const fn = sfxTable.get(id);
  if (!fn) throw new Error(`unknown sfx ${id}`);
  return render(seconds, (g) => {
    if (withBgm) {
      const def = songTable.get(withBgm);
      if (def) new SongPlayer(g, def, g.musicBus, { at: 0.0, params: { stage: 0, kire: 0, boss_phase: 1 } }).pump(seconds);
    }
    fn({ ...opts, at: 0.1 });
  });
}

export async function renderAmbient(id: string, seconds = 12, stage = 0): Promise<RenderOut> {
  return render(seconds, (g) => {
    const inst = createAmbient(g, id, { fade: 0.05 }, g.ambBus, 0.02, stage);
    inst?.impl.pump?.(seconds);
  });
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

/** Band level (dB) of a signal around `hz` (±~½ octave), windowed max or mean. */
function bandLevel(buf: AudioBuffer, hz: number, mode: 'max50' | 'mean', from = 0, to = Infinity): number {
  const sr = buf.sampleRate;
  const w0 = (2 * Math.PI * hz) / sr;
  const q = 1.4;
  const alpha = Math.sin(w0) / (2 * q);
  const b0 = alpha, b2 = -alpha;
  const a0 = 1 + alpha, a1 = -2 * Math.cos(w0), a2 = 1 - alpha;
  const out: number[] = [];
  const s0 = Math.floor(from * sr);
  const s1 = Math.min(buf.length, Math.floor(to * sr));
  const win = Math.floor(0.05 * sr);
  const acc: Float64Array = new Float64Array(Math.ceil((s1 - s0) / win) + 1);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = s0; i < s1; i++) {
      const y = (b0 * d[i] + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = d[i]; y2 = y1; y1 = y;
      acc[Math.floor((i - s0) / win)] += y * y;
    }
  }
  for (let k = 0; k < acc.length; k++) out.push(acc[k] / (win * 2));
  if (!out.length) return -120;
  const v = mode === 'max50' ? Math.max(...out) : out.reduce((a, b) => a + b, 0) / out.length;
  return 10 * Math.log10(Math.max(1e-14, v));
}

/** Spectral centroid of the loudest 100 ms (for choosing the masking band). */
function centroid(buf: AudioBuffer): number {
  const d = buf.getChannelData(0);
  const sr = buf.sampleRate;
  const N = 4096;
  let best = 0, bestE = -1;
  for (let i = 0; i + N < d.length; i += 1024) {
    let e = 0;
    for (let j = i; j < i + N; j += 4) e += d[j] * d[j];
    if (e > bestE) {
      bestE = e;
      best = i;
    }
  }
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let j = 0; j < N; j++) re[j] = (d[best + j] ?? 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * j) / N));
  fft(re, im);
  let num = 0, den = 0;
  for (let k = 1; k < N / 2; k++) {
    const m = Math.hypot(re[k], im[k]);
    const f = (k * sr) / N;
    num += f * m;
    den += m;
  }
  return den ? num / den : 1000;
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

/** 11.2: level vs bgm_battle (dB). */
export const BGM_TARGET: Record<string, number> = {
  bgm_battle: 0, bgm_midboss: 0, bgm_boss: 0,
  bgm_town_s0: -3, bgm_town_s1: -3, bgm_town_s2: -3,
  bgm_home: -4, bgm_shop: -4, bgm_mall: -4,
  bgm_title: -6, bgm_title_clear: -6, bgm_ending: -5, bgm_night: -8,
  bgm_jingle_victory: -1, bgm_jingle_levelup: -1, bgm_jingle_item: -2, bgm_jingle_join: -1, bgm_jingle_gameover: -6,
};

/** SFX that must stand out over the music (min margin dB in their band). */
function seCategory(id: string): { min: number; bgm: string } | null {
  const battle = /^se_(hit|crit|bishi|kiran|damage|don|stamp|thud|swing|ring|warn|kabuse|whiff|zero|ko|shrink|poton|defeat|kire|status|buff|flee|part|hanamaru|rewind|balloon|bow|nori|mimashita|peke|hanko|encounter|enemy|initiative|ambush|meishi|semi_buzz|semi_miin|cone|siren|umbrella_open|drip|hug|ojigi|roulette|atari|hazure|vending|vacuum|bump|momi|remote|glove|bottle|uwabaki|heal|chime_chord)/.test(id);
  if (/^se_step|^se_higurashi|^se_star$|^se_hp_tick|^se_slider|^se_pen_write|^se_train_far/.test(id)) return { min: 0, bgm: 'bgm_town_s0' };
  if (/^se_(cursor|confirm|cancel|buzzer|menu|page|save|shop|coin|count|item|emote|examine|fushigi|symbol|flip|clock)/.test(id)) return { min: 6, bgm: battle ? 'bgm_battle' : 'bgm_town_s0' };
  if (battle) return { min: 6, bgm: 'bgm_battle' };
  return { min: 3, bgm: 'bgm_town_s0' };
}

export async function audioReport(o: { seconds?: number; songs?: string[]; sfx?: string[] | false } = {}) {
  const seconds = o.seconds ?? 24;
  const t0 = performance.now();
  const songs: Record<string, Stats & { raw?: Stats; target: number; rel?: number; dev?: number }> = {};
  const ids = o.songs ?? [...songTable.keys()];
  for (const id of ids) {
    const def = songTable.get(id)!;
    const secs = def.jingle && def.jingle !== 'replace' ? 8 : seconds;
    const r = await renderSong(id, secs);
    const raw = await renderSong(id, secs, { bypass: true });
    songs[id] = { ...measure(r.buffer, 0.5), raw: measure(raw.buffer, 0.5), target: BGM_TARGET[id] ?? -3 };
  }
  const ref = songs.bgm_battle?.lufs;
  let maxDev = 0;
  if (ref !== undefined)
    for (const [id, s] of Object.entries(songs)) {
      s.rel = round(s.lufs - ref);
      s.dev = round(s.rel - s.target);
      if (!/jingle/.test(id)) maxDev = Math.max(maxDev, Math.abs(s.dev));
    }
  const loopIds = Object.keys(songs).filter((id) => /battle|midboss|boss$|town|home|shop|mall/.test(id));
  const loopLufs = loopIds.map((id) => songs[id].lufs);
  const spread = loopLufs.length ? round(Math.max(...loopLufs) - Math.min(...loopLufs)) : 0;

  const sfx: Record<string, Stats & { band: number; margin?: number; need?: number; ok?: boolean }> = {};
  const bgmCache = new Map<string, AudioBuffer>();
  if (o.sfx !== false) {
    const list = o.sfx ?? [...sfxTable.keys()];
    for (const id of list) {
      let r: RenderOut;
      try {
        r = await renderSfx(id, {}, 2.5);
      } catch (e) {
        continue;
      }
      const st = measure(r.buffer);
      const hz = Math.max(120, Math.min(8000, centroid(r.buffer)));
      const cat = seCategory(id);
      const entry: (typeof sfx)[string] = { ...st, band: Math.round(hz) };
      if (cat) {
        let bg = bgmCache.get(cat.bgm);
        if (!bg && songTable.has(cat.bgm)) {
          bg = (await renderSong(cat.bgm, 12)).buffer;
          bgmCache.set(cat.bgm, bg);
        }
        if (bg) {
          const seL = bandLevel(r.buffer, hz, 'max50');
          const bgL = bandLevel(bg, hz, 'mean', 1);
          entry.margin = round(seL - bgL);
          entry.need = cat.min;
          entry.ok = entry.margin >= cat.min;
        }
      }
      sfx[id] = entry;
    }
  }
  const failsSe = Object.entries(sfx).filter(([, s]) => s.ok === false).map(([id, s]) => `${id} (${s.margin} dB < ${s.need})`);
  const clipping = [...Object.entries(songs), ...Object.entries(sfx)].filter(([, s]) => s.clips > 0 || s.peakDb > -0.3).map(([id]) => id);
  const sealed = sealedCheck();
  return {
    renderedSeconds: seconds,
    elapsedSec: round((performance.now() - t0) / 1000),
    mmlErrors: [...mmlErrors],
    sealedAnswerLeaks: sealed,
    bgm: songs,
    bgmMaxDeviationFromTargetDb: maxDev,
    loopingBgmSpreadDb: spread,
    sfx,
    summary: {
      clipping: clipping.length ? clipping : 'none',
      bgmWithinTarget3dB: maxDev <= 3,
      seBuried: failsSe.length ? failsSe : 'none',
    },
  };
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
/** Loudness of each part alone (mix balance QA). */
registerDebug('audioParts', (async (id: string, seconds = 20, params?: Partial<Params>) => {
  const def = songTable.get(id);
  if (!def) return null;
  const out: Record<string, number> = {};
  out.ALL = measure((await renderSong(id, seconds, { params })).buffer, 0.5).lufs;
  for (const p of def.parts) out[p.id] = measure((await renderSong(id, seconds, { params, solo: [p.id] })).buffer, 0.5).lufs;
  return out;
}) as never);

registerDebug('audioRender', (async (id: string, seconds = 16, opts: { params?: Partial<Params>; paramAt?: [number, keyof Params, number][]; wav?: boolean; kind?: 'song' | 'sfx' | 'amb'; stage?: number; sfxOpts?: SfxOpts; withBgm?: string } = {}) => {
  const r =
    opts.kind === 'sfx'
      ? await renderSfx(id, opts.sfxOpts ?? {}, seconds, opts.withBgm)
      : opts.kind === 'amb'
        ? await renderAmbient(id, seconds, opts.stage ?? 0)
        : await renderSong(id, seconds, { params: opts.params, paramAt: opts.paramAt });
  return {
    stats: measure(r.buffer, opts.kind ? 0 : 0.5),
    notes: r.notes.length,
    spectrogram: spectrogram(r.buffer),
    pianoRoll: pianoRoll(r.notes, seconds),
    wav: opts.wav ? bufToWavDataUrl(r.buffer) : undefined,
  };
}) as never);
