// Sound team: every song, SFX recipe, voice and ambience registers here
// (side-effect imports). The QA tooling — debug commands, the offline
// report / renders and the sound test — is for development only (40_audio
// 15.4): it registers under import.meta.env.DEV, so `vite build` drops it.
import './songs/title';
import './songs/indoor';
import './songs/town';
import './songs/mall';
import './songs/battle';
import './songs/midboss';
import './songs/boss';
import './songs/ending';
import './songs/jingles';
import './sfx';
import './voices';
import { registerAudioCommands } from './debugcmds';
import { registerReportCommands } from './report';
// the sound test registers its scene and commands under the same DEV gate
import './soundtest';

if (import.meta.env.DEV) {
  registerAudioCommands();
  registerReportCommands();
}
