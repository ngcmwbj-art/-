// The audio-only QA page (dev server: /src/audio/qa/index.html). It loads the
// sound modules and their QA commands without the rest of the game, so the
// offline renders of report.ts keep working while other modules are being
// edited. Not part of the build (index.html is the only entry).
import '../sounds';
import { installDebug } from '../../debug';
import { registerAudioCommands } from '../debugcmds';
import { registerReportCommands } from '../report';
import { registerCh2QaCommands } from '../qa_ch2';

installDebug();
registerAudioCommands();
registerReportCommands();
registerCh2QaCommands();
(window as unknown as { __audioQaReady: boolean }).__audioQaReady = true;
