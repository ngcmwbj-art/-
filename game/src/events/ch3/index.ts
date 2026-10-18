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
