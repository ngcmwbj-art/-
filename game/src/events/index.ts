// Story events, NPC scripts and cutscenes (10_narrative 4–8). Imported last
// (modules.ts), so every registerScript here replaces the maps' fallbacks.
import './lib';
import './fx';
import './stamp';
import './home';
import './shops';
import './chime';
import './npcs';
import './town';
import './tsugao_ch1';
// 北の列の部屋としんごのたんかん（02 #58）
import './rooms_north';
import './park';
// 公園の鉄棒とワイスタ巡査の懸垂（02 #64）
import './kensui';
import './parking';
// バス停のマル（とまたろうの妻。02 #65）
import './maru';
// 対岸の おぴぃと ザリガニ釣り（02 #66）
import './tamotsu';
// 畦道の先の 分水（よねと とよぞう）と、祠の きつねの 常連（くま吉の 油揚げ）（02 #67）
import './aze';
// げむきか9/30の1・2（第1章）・5：ふろしきの マント、置物の ヘラ、減らない コーヒー（02 #71）。
// shops・npcs・rooms_north の スクリプトを 包むので、それらの あとに import する
import './cape_coffee';
import './mall';
import './mall_roof';
import './ending';
import './ch2';
// げむきか9/30の3：8月31日の 水やり当番（夕鳴小学校の 裏庭、02 #72）。npcs の さやと
// 第2章の トマじいの スクリプトを 包むので、ch2 の あとに import する
import './school';
// げむきか10/5の新5：ハンチングの 値札（踏切の くりこ、第2章の ペロの 壁の 帽子と ペロ。02 #83）。
// npcs の くりこと 第2章の ペロ（npcs・wakime・nihyaku が 包んだ もの）を 包むので、ch2 の あとに import する
import './hunting';
// げむきか10/5の新1：二人十五脚（なんばるわんの家の ピー・コック、坂の なんばるわん、夕鳴小学校の 校庭。02 #82）。
// npcs・cape_coffee の なんばるわんと コタロウを 包むので、それらの あとに import する
import './kotei';
// げむきか10/5の改1：水辺の 図鑑（夕鳴川の 堰の テナガエビ・『みずべ』・おぴぃの 由来、02 #81）。
// tamotsu の おぴぃと 対岸の 水口、home の 母、つりえさ屋の 呼びりんを 包むので、それらの あとに import する
import './mizube';
// げむきか10/6の案4：チクタク堂の ばらばら時計（時計店の ウィンドウと ゆう、6人、第2章の 駅ノートの 1行。02 #88）。
// kensui・cape_coffee・rooms_north・kotei・aze・npcs の 6人と くま吉・しんご・なんばるわん、ch2 の 駅ノートを 包むので、それらの あとに import する
import './tokei7';
import './debug';
