// UI module entry (imported from modules.ts): settings, the field HUD, the
// field menu, title / game over scenes, shop & save UIs and debug commands.
import './settings';
import { installHud } from './hud';
import './menu';
import './title';
import './shop';
import './save';
import './gameover';
import './ending';
import './debugcmds';

installHud();
