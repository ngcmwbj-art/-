// QA commands (window.__game.cmd.*) for the sound team's content.
// Dev builds only: audio/content.ts calls registerAudioCommands() under
// import.meta.env.DEV, so none of this ships in `vite build` (40_audio 15.4).

import { registerDebug } from '../debug';
import { activeAmbients, AMBIENCE_IDS } from './ambience';
import { hasGraph, lateStats, liveGraph } from './engine';
import { clockStats } from './clock';
import * as api from './index';
import { currentPlayer, musicDebugState } from './music';
import { sfxInfo, sfxTable, songTable } from './registry';
import { VOICES } from './voices';

export function registerAudioCommands(): void {
  registerDebug('bgm', ((id: string, opts?: Parameters<typeof api.playBgm>[1]) => {
    api.unlockAudio();
    api.playBgm(id, opts);
    return api.currentBgmId();
  }) as never);
  registerDebug('stopBgm', ((fade = 0.5) => api.stopBgm(fade)) as never);
  registerDebug('sfx', ((id: string, opts?: api.SfxOpts) => {
    api.unlockAudio();
    api.sfx(id, opts);
  }) as never);
  registerDebug('amb', ((id: string, opts?: { vol?: number; fade?: number; lp?: number }) => {
    api.unlockAudio();
    api.playAmbient(id, opts);
    return activeAmbients();
  }) as never);
  registerDebug('stopAmb', ((id?: string, fade?: number) => api.stopAmbience(id, fade)) as never);
  registerDebug('musicParam', ((name: 'stage' | 'kire' | 'boss_phase' | 'muffle', v: number) => {
    api.setMusicParam(name, v);
    return musicDebugState();
  }) as never);
  registerDebug('blip', ((voiceId: string, text = 'こんにちは、ゆうなりちょうへようこそ。') => {
    api.unlockAudio();
    [...text].forEach((ch, i) => setTimeout(() => api.textBlip(voiceId, ch), i * 25));
  }) as never);
  registerDebug('audioState', (() => ({
    ready: hasGraph(),
    ctx: liveGraph()?.ctx.state ?? null,
    time: liveGraph()?.ctx.currentTime ?? 0,
    // live scheduling health: notes scheduled after their time (and dropped),
    // the clock's worst gap between ticks
    late: JSON.parse(JSON.stringify(lateStats)),
    clock: { ...clockStats },
    music: musicDebugState(),
    position: api.musicPosition(),
    ambience: activeAmbients(),
    counts: { bgm: songTable.size, sfx: sfxTable.size, amb: AMBIENCE_IDS.length, voices: Object.keys(VOICES).length },
  })) as never);
  registerDebug('audioIds', (() => ({
    bgm: [...songTable.keys()],
    sfx: [...sfxTable.keys()],
    amb: AMBIENCE_IDS,
    voices: Object.keys(VOICES),
    sfxLabels: Object.fromEntries(sfxInfo),
  })) as never);
  registerDebug('chime', ((notes: 4 | 8 = 4, cut = true) => {
    api.unlockAudio();
    return api.playChimeMotif({ notes, cut: notes === 4 && cut });
  }) as never);

  /**
   * Real-time check of the CPU budget (15.3) and scheduling (15.2): plays a
   * song in the live AudioContext for `seconds`, then reports what the browser
   * saw — output under-runs (AudioContext.playoutStats, where the browser has
   * it), late / dropped notes, the clock's worst tick gap, the voice cap. With
   * `stallMs`, the page thread is blocked that long once in the middle (a
   * stand-in for a long task such as a map load).
   */
  registerDebug('audioLive', (async (id = 'bgm_boss', params: Record<string, number> = { kire: 3 }, seconds = 20, stallMs = 0, solo?: string[]) => {
    api.unlockAudio();
    const g = liveGraph();
    if (!g) return null;
    const c = g.ctx as AudioContext & { playoutStats?: { fallbackFramesEvents: number; fallbackFramesDuration: number; totalFramesDuration: number; averageLatency: number } };
    api.stopBgm(0.05);
    await new Promise((r) => setTimeout(r, 300));
    api.playBgm(id);
    for (const [k, v] of Object.entries(params)) api.setMusicParam(k as never, v);
    const pl = currentPlayer();
    if (pl && solo) pl.solo = new Set(solo);
    const late0 = JSON.parse(JSON.stringify(lateStats));
    const ps0 = c.playoutStats ? { ev: c.playoutStats.fallbackFramesEvents, dur: c.playoutStats.fallbackFramesDuration, tot: c.playoutStats.totalFramesDuration } : null;
    clockStats.worstGapMs = 0;
    const t0 = performance.now();
    let maxVoices = 0;
    while (performance.now() - t0 < seconds * 1000) {
      await new Promise((r) => setTimeout(r, 100));
      maxVoices = Math.max(maxVoices, currentPlayer()?.soundingNow ?? 0);
      if (stallMs && performance.now() - t0 > (seconds * 1000) / 2 && stallMs > 0) {
        const s = performance.now();
        while (performance.now() - s < stallMs) {
          /* a long task */
        }
        stallMs = -stallMs;
      }
    }
    const ps = c.playoutStats;
    const p = currentPlayer();
    const out = {
      song: id,
      params,
      seconds,
      stallMs: Math.abs(stallMs),
      baseLatency: c.baseLatency,
      outputLatency: c.outputLatency,
      underruns: ps && ps0 ? { events: ps.fallbackFramesEvents - ps0.ev, ms: Math.round(ps.fallbackFramesDuration - ps0.dur), ofMs: Math.round(ps.totalFramesDuration - ps0.tot) } : 'playoutStats not available in this browser',
      late: { notes: lateStats.music.late - late0.music.late, dropped: lateStats.music.dropped - late0.music.dropped, worstMs: Math.round(lateStats.music.worst * 1000) },
      clock: { ...clockStats },
      maxVoices,
      capped: p?.capped ?? 0,
    };
    api.stopBgm(0.3);
    return out;
  }) as never);
}
