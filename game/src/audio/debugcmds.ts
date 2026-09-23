// QA commands (window.__game.cmd.*) for the sound team's content.

import { registerDebug } from '../debug';
import { activeAmbients, AMBIENCE_IDS } from './ambience';
import { hasGraph, liveGraph } from './engine';
import * as api from './index';
import { musicDebugState } from './music';
import { sfxInfo, sfxTable, songTable } from './registry';
import { VOICES } from './voices';
import { CUES, startCue } from './soundtest/cues';

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
registerDebug('cue', ((id: string) => {
  api.unlockAudio();
  const cue = CUES.find((c) => c.id === id);
  if (!cue) return CUES.map((c) => c.id);
  startCue(cue, (voice, text) => {
    [...text].forEach((ch, i) => setTimeout(() => api.textBlip(voice, ch), i * 25));
    return text.length / 40;
  });
  return cue.label;
}) as never);
registerDebug('chime', ((notes: 4 | 8 = 4, cut = true) => {
  api.unlockAudio();
  return api.playChimeMotif({ notes, cut: notes === 4 && cut });
}) as never);
