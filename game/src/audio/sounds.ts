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
// 捕まえない自由研究の虫の声（02_ch2_index #64）
import './sfx_mushi';
// ザリガニ釣り（02_ch2_index #66）
import './sfx_tsuri';
// 水辺の 図鑑：夜振り（02_ch2_index #81）
import './sfx_mizube';
// 脇芽は 朝に かく（02_ch2_index #73）
import './sfx_wakime';
import './sfx_dome';
// 70年の 色紙と 小さな 夏祭り（02_ch2_index #84）
import './sfx_matsuri';
// 二人十五脚・ハンチングの 値札（02_ch2_index #82・#83）
import './sfx_kotei';
import './ambience_ch2';
import './voices';
