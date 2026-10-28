// 第3章『海ぞいの町の いただきます』 — the scenario (60_ch3_story 10章). 第1期：序〜海ぞいの町に
// 着くまで（S00〜S06）、海ぞいの町の人の段階1のいつもの台詞、調べる物、話しかけた記録。
// Imported by src/events/index.ts after every chapter-1/2 module (it wraps a few of theirs
// for 夕鳴町's stage 0: 母, テレビ, ランドセル, おばあ, 置物).
import './common';
import './talked';
import './prologue';
import './hirumae'; // fix1014 F3: 段階0（昼前）の夕鳴町の人と話す
import './umizoi';
// 第2期（S07〜S14）
import './azemichi';
import './ichiba';
import './shokudo';
import './kaisui';
import './siren';
// 第3期（S15〜S24：旧水族館）
import './aq';
import './souko';
// 水槽の うら（げむきか 10/17 の 案3）：入口の 売店の あとの 戸から 裏方の 通路へ（S15〜S19）
import './aq_ura';
// 下の 紙の 字（げむきか 10/18 の 案3）：入口の 券売所の つづりを 売店の えんぴつで こする（S15〜S19）、S19 の 最後に 1ページ
import './shita';
// 真昼の 顔（げむきか 10/18 の 案1）：段階1、写真館の 主人（来る人）の カメラと トロ箱の ふたで、カイト・テル・ウミを 撮る。
// 主人・トロ箱・3人の 台本を 包むので、azemichi・kaisui の あとに import する（S31 の 1ページは ending.ts）
import './mahiru';
// 毎晩の 油（げむきか 10/19 の 案3）：段階3、S23 の あと 廊下の 机で ヘラの 手入れ（S24 の 前まで。S33 の 1ページは ending.ts）
import './abura';
// 海の 水で 寄せる（げむきか 10/19 の 案1）：段階1、くま吉の 屋台 → 海の 中の 南の はし → 沖の ブイの 下（新しい 地図）。
// くま吉・カイトの 台本を 包むので、azemichi・kaisui・mahiru の あとに import する（S13 の 鉢は siren.ts）
import './yose';
// 掃除は 上から（げむきか 10/20 の 案3）：段階3、入口の 西の 壁の 戸 → 旧水族館の 屋上（新しい 地図）。
// （クリア後の ハキコに ボールを 返すのは okujou_pg.ts）
import './okujou';
// 低う、平たく（げむきか 10/22 の 案1）：段階1、空き地の 子ども → 灯台の テル → 港の 西の はしの 石段 → 小石の 浜
// （新しい 地図）。子ども・テル・ミナトの 台本を 包むので、siren・kaisui・mahiru の あとに import する
import './mizukiri';
// やっと、魚の 昼（げむきか 10/23 の 案2）：段階2、S13 の あと 防波堤の ツリノ → 大写し「浮き」。ツリノ・子ども・
// グソっ君（防波堤）の 台本を 包むので、kaisui・mizukiri の あとに import する
import './sakana';
// 落とすけえ、甘うなる（げむきか 10/23 の 案1）：段階1、干物屋の 2人 → みかん畑の 作業道の 奥の 石の 段 → 上の 段
// （新しい 地図）。干物屋の 2人・ナミエの 台本を 包むので、shokudo の あとに import する
import './mikan';
// 背中から、1回で（げむきか 10/24 の 案1）：段階1、空き地の 虫かごの 子 → ぬけがら 4つ → 名人の 判定。子ども 3人・
// 掲示板の 台本を 包むので、siren・mizukiri・sakana の あとに import する
import './nukegara';
// 明日の 朝の 氷（げむきか 10/24 の 案2）：段階2、市場の 口の ゲン・ツグミ → 港の 倉庫の 西の 戸 → 氷の 蔵（新しい
// 地図）。ゲン・ツグミ・ナミエの 台本を 包むので、ichiba・shokudo・mikan の あとに import する
import './kori';
// 破れたら、つくろう（げむきか 10/25 の 案2）：段階2、S13 の あと 食堂かもめの 前の ゴロウ → 漁協の 戸 → 網小屋
// （S14 の 前まで）。shokudo の ゴロウを 包むので、shokudo の あとに import する
import './amigoya';
// つるっと、終われる（げむきか 10/25 の 案1）：段階1、②の あと あぜ道市の おばあ → 港の 乾物屋の 天草 → 食堂かもめの 台所で
// 煮る → 大写し「天突き」。おばあ・くま吉・乾物屋・ナミエの 台本を 包むので、azemichi・umizoi・yose・shokudo・mikan・kori の あとに import する
import './tokoro';
// 急かすと、甘うならん（げむきか 10/25 の 案3）：段階3、S17 の あと 水槽の うらの ヒロスケ → 大写し「焼き芋の 窓」
// （S19 の 前まで。S21 の 1ページは souko.ts）。aq_ura の ヒロスケ・台車を 包むので、aq_ura の あとに import する
import './imo';
// 終わりの 音は、下がる（げむきか 10-26 の 案3）：段階3、入口の 北の 壁の 戸 → 放送室（新しい 地図。S20 の 前まで）。
// aq の 入口の スピーカー・深海の 展示室の 放送（S18）を 包むので、aq の あとに import する（S25 の 放送は minna.ts から 呼ぶ）
import './housou';
// 波に 見せる 城（げむきか 10-27 の 案1）：段階1、③の あと 波打ちぎわの ウミ → バケツ・砂 3つ → 大写し「砂」で 3段 →
// かざり → 波に 見せる（S12 の 前まで）。ウミ・カイト・渚（kaisui・umizoi）の 台本を 包むので、kaisui・mahiru・yose の あとに import する
import './shiro';
// 穴は、だれかの ごちそうさま（げむきか 10-28 の 案2）：段階2、S13 の あと 監視台の 下の カイト → 貝がら 3つ → 大写し「穴」で
// うたがわしい 者の カード 3枚 → 波打ちぎわの ツメタガイの 殻（S14 の 前まで）。カイトの 台本を 包むので、shiro の あとに import する
import './tsumeta';
// 目で、いちばん 長く（げむきか 10-27 の 案3）：段階3、回廊の 南の 壁の 戸 → ふれあいの 磯（新しい 地図。S16 の あと S20 の 前まで）。
// 回廊に 戸と 入る ときの 台本を 足すので、aq の あとに import する
import './fureai';
// 第4期（S25〜S34：みんなが来る・決戦・エンディング・クリア後）
import './cuts';
import '../../ui/cut_c3'; // W: the stills (cut_c3_shuuka・cut_c3_photo・cut_c3_kioku)
import './minna';
import './ending';
import './after';
import { wrapFushigiObjects } from './fushigi';
import './debug';
// (last: みました帳 ③ goes on top of every scenario script of its things)
wrapFushigiObjects();
