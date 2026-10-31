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
import './cut_village_lit';
import './debugcmds';
// 大写しの 遊びの はじめの カード・もどるで やめる（改善会議 10-25 の 1・4）
import './closeup';

installHud();
