// Every song, SFX recipe, ambience and voice of the game (side-effect
// imports). audio/content.ts loads these for the game; the audio-only QA page
// (audio/qa, dev server only) loads them without the rest of the game.
import './songs/title';
import './songs/indoor';
import './songs/town';
import './songs/mall';
import './songs/battle';
import './songs/midboss';
import './songs/boss';
import './songs/ending';
import './songs/jingles';
// chapter 2 (53_ch2_audio)
import './songs/hoshi_night';
import './songs/boss2';
import './songs/hoshi_morning';
import './songs/tsugao';
import './sfx';
import './sfx_ch2';
import './ambience_ch2';
import './voices';
