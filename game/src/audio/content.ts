// Sound team: every song, SFX recipe, voice and ambience registers here
// (side-effect imports, listed in sounds.ts). The QA tooling — debug commands,
// the offline report / renders and the sound test — is for development only
// (40_audio 15.4): it registers under import.meta.env.DEV, so `vite build`
// drops it.
import './sounds';
import { registerAudioCommands } from './debugcmds';
import { registerReportCommands } from './report';
import { registerCh2QaCommands } from './qa_ch2';
// the sound test registers its scene and commands under the same DEV gate
import './soundtest';

if (import.meta.env.DEV) {
  registerAudioCommands();
  registerReportCommands();
  registerCh2QaCommands();
}
