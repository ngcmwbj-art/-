// 第2章『星見台のトマト』 — the scenario (50_ch2_story 10章): every event,
// the village's talk, the examinables, the save points and the QA beats.
// Imported by src/events/index.ts after chapter 1's scripts.
import './common';
import './calls';
import './fushigi';
import './objects';
import './npcs';
import './prologue';
import './train';
import './village';
import './house';
import './barn';
import './tsugao';
import './houki';
import './hill';
import './ending';
// 星見台の家々の中（02_ch2_index #61）
import './rooms2';
// 捕まえない自由研究（02_ch2_index #64）
import './mushi';
// マルととまたろう・沢の上「水の 元」（02_ch2_index #65）
import './sawa';
// ソワカの 色見本・脇芽は 朝に かく（げむきか 9/30 の2・4、02_ch2_index #73）
import './sawako_yk';
import './wakime';
// 上の 柵ぞいの 見回り（げむきか 10/11 の 案3〈厳選5案の 3〉、02_ch2_index #99）。電源の 箱・マサル・見回り帳を
// 包むが、ほかの 寄り道（堆肥・足あと帳・耳の あいさつ など）の マサルの 用を 先に 出すため、それらより 前に import する
import './sakuzoi';
// 堆肥の 中の 親戚（げむきか 10/10 の 案2、依頼主の 変更：カブトムシの 幼虫を 見つける。02_ch2_index #97）。
// マサル・ペロ・トマじいを 包むが、ほかの 寄り道の 用を 先に 出すため 店番より 前に import する
import './taihi';
// 分校の 鉄棒と『懸垂、1回』（げむきか 10/11 の 案5。第1章で 懸垂に 挑んだ 人だけ。02_ch2_index #100）。
// 鉄棒と まつ先生を 包むが、耳の あいさつ（mimi）など ほかの 寄り道の 用を 先に 出すため 店番より 前に import する
import './tetsubou';
// 無人販売所の 店番・ふくじんづけと 耳の あいさつ（げむきか 10/9 の 案3・5、02_ch2_index #94・#95）。
// ソワカ・マサル・トマじい・まつ先生・ぴょん夫人・ふくじんづけを 包むが、ほかの 寄り道の 用を 先に
// 出すため、それを 包む 駅ノート・二百十日・色紙・足あと帳より 前に import する
import './tenban';
import './mimi';
// 朝の ほうだけ 光る 星（村営天文台、げむきか 10/1 の3、02_ch2_index #77）
import './dome';
// 駅ノートの 前の ページ・二百十日の 前の 晩（げむきか 10/1 の4・5、02_ch2_index #78）。
// ふしぎ①と 4人の 台本を 包むので、fushigi・npcs の あとに import する
import './ekinote';
import './nihyaku';
// 70年の 色紙と 小さな 夏祭り（げむきか 10/5 の 改5、02_ch2_index #84）。7人と ぴょん夫人・区の
// 倉庫・校庭の 桜・第1章の 垂れ幕の 台本を 包むので、npcs・objects・rooms2・nihyaku の あとに import する
import './shikishi';
// 夜の 足あと帳（げむきか 10/6 の 案3、02_ch2_index #87）。マサル・ペロ・区長・トマじい・ソワカと
// 見回り帳・電柱の 張り紙・寝床・軍手の 箱を 包むので、shikishi の あとに import する
import './ashiato';
// 上へ 降る 雪（げむきか 10/15 の 案2、02_ch2_index #101）。ポコシャの 自転車・ポコシャ・まつ先生・旧商店の レジを
// 包む。ほかの 寄り道の 用は その 条件の 外で 先に 通すので、いちばん あとに import する（自分の 条件の 間だけ 先）
import './mushigomu';
// ええ 色の わけ（げむきか 10/16 やり直しの 案5、02_ch2_index #103）。ぴょん夫人（お茶の あと）・ハモ区長・区長の 家の
// 漬物の おけと 額の 写真を 包む。ほかの 寄り道の 用は 自分の 条件の 外で 先に 通すので、mushigomu の あとに import する
import './iro';
// 朝の 前の 色（げむきか 10/17 の 案5、02_ch2_index #104）。ソワカ・ソワカの 家の 絵と 札の 下書き・無人販売所を
// 包む。ほかの 寄り道の 用は 自分の 条件の 外で 先に 通すので、iro の あとに import する
import './asairo';
// 赤子 泣いても（げむきか 10/17 の 案4、02_ch2_index #105）。ペロ・ペロの 家の かまど・ヒロスケを 包む。
// ほかの 寄り道の 用は 自分の 条件の 外で 先に 通すので、asairo の あとに import する
import './hagama';
// ごはん 一粒、花 一つ（げむきか 10/18 の 案5、02_ch2_index #107）。トマじいを 包む。ほかの 寄り道の 用は
// 自分の 条件の 外で 先に 通すので、hagama の あとに import する
import './hana';
// 湯を わかしてから（げむきか 10/18 の 案4、02_ch2_index #106）。ぴょん夫人・集会所の 眠っている 2人・
// シゲじいと スギばあの 家の 目覚まし時計を 包む。ほかの 寄り道の 用は 自分の 条件の 外で 先に 通すので、hana の あとに import する
import './yuwaka';
// 2枚の うず（げむきか 10/19 の 案5、02_ch2_index #108）。転回場の ポコシャを 包む（上へ 降る 雪の はじまりは 先に 通す）。
// mushigomu の あとに import する
import './uzu';
// 前から 寝る（げむきか 10/20 の 案4、02_ch2_index）。マサル・堆肥舎を 包む（南4を 見た あとだけ 先に 出る）。
// 牛舎の 南4の 牛（地図の 物）を 差しかえるので、ほかの 寄り道の あとに import する
import './neru';
// 紐の 番（げむきか 10/20 の 案5「鍵は ポケットに」、02_ch2_index）。テツヤ（思いだした 姿）・まつ先生・眠っている 3人・
// 足あと・説明書を 包む（ほかの 寄り道の 用は 自分の 条件の 外で 先に 通すので、yuwaka・ashiato の あとに import する）
import './himo';
// はく 前に、ふる（げむきか 10/21 の 案4、02_ch2_index #111）。トマじいを 包む（ごはん 一粒、花 一つ の 用は 先に 通す）。
// hana の あとに import する
import './kutsu';
// 当たりは、かじって みんと（げむきか 10/22 の 案5、02_ch2_index）。ペロ（羽釜の 用は 先に 通す）・ハモ区長を 包む。
// hagama の あとに import する
import './shishito';
import './debug';
