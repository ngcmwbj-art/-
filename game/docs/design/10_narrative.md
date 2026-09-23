# 10 シナリオ・テキスト『はなまる夕焼け』

> **担当**：シナリオ（scenario team）。実装先は `src/events/**`（イベントスクリプト）と `src/data/text/**`（テキストデータ）。
> **起点**：`00_concept.md`。★の項目はコンセプトどおり。数値は `20_systems_battle.md`、色とドット仕様は `30_level_art.md`、BGM/SE の正式IDは `40_audio.md` が正とする。
> **このファイルが正になるもの**：NPC（`npc_*`）、フラグ（`flag_*`）、イベント（`evt_*`）、調べる対象（`obj_*`）、ふしぎ（`fushigi_*`）の ID、全ゲーム内テキスト、演出台本。
> **ゲーム内テキストはすべて日本語。1メッセージ（1ページ）は3行まで、1行は全角21文字（336px）まで。改行位置はこのファイルの行のとおり。**

---

## 0. 目次

1. 表記ルール（テキスト仕様とこのファイルの書式）
2. トーン＆ボイスガイド
3. ID一覧（他チーム参照用）
4. 進行フロー（フラグ単位）と導線
5. 演出台本（オープニング〜エンディング）
6. NPC（配置・見た目・全台詞）
7. 調べられるオブジェクト
8. ふしぎ（12）
9. 戦闘テキスト
10. アイテムの説明文
11. 能力（ハンコ術・PR活動）の説明文
12. ショップ・ガチャ・セーブ・メニューのテキスト
13. 付録：みました帳の記録文、チェックリスト

---

## 1. 表記ルール

### 1.1 文字数と改行

| 項目 | ルール |
|---|---|
| 会話ウィンドウ | 1ページ3行。1行は **336px 以内**（全角16px、半角英数8px、半角スペース4px で数える。全角21文字ちょうどが上限） |
| 戦闘メッセージ帯 | 1ページ **2行まで**。1行は同じく336px以内 |
| ツッコミの書き文字 | 32px 表示なので **全角11文字以内**（スペース込み、1行） |
| フリップ（カネナリくん） | 会話ウィンドウに表示。2行以内を基本にする（ボードに書ける量の演技） |
| 改行 | このファイルのメッセージブロックの行＝表示の行。自動折り返しに頼らない |
| 名札 | マスキングテープの名札に入れる。**6文字以内**（「鶴見巡査」「郵便屋さん」など） |

### 1.2 表記

- **分かち書き**：文節の間に**半角スペース**を入れる（「コロッケ 4つ。ソースは 別。」）。句読点の直後にはスペースを入れない。
- **数字**：半角（「17:00」「3人」「500円」）。時刻はコロン区切りの半角。
- **三点リーダー**：「……」（2つ組）。1つだけの「…」は使わない。
- **感嘆・疑問**：全角「！」「？」。「！？」は1作品で5回まで。「!!」の連打はしない。
- **かぎかっこ**：NPC の台詞には「」を付けない（名札があるため）。台詞の中の引用、看板の文字、放送の文言は『』。
- **カタカナ発話**：機械（おじぎ自販機、エスカレーター、店内放送の合成音声）だけがカタカナで話す。
- **漢字**：小学5年生が読めることを目安にする。むずかしい語は開く（「おじぎ」「まもる」「おつり」）。ただし店名・地名・役職はそのまま（「鳩課」「巡査」「迷子センター」）。
- **（）**：カネナリくんのフリップでは「小さく書き添えた文字」を表す（「（引退しました）」）。地の文では使わない。

### 1.3 マークアップ（`ui/dialog.ts` 準拠）

| 記法 | 意味 | 使いどころ |
|---|---|---|
| `{w=300}` | 300ms 止める | 間。「……」の前後、オチの前。標準は 300。溜めは 600、決め台詞は 900 |
| `{spd=0.5}` | 文字送りを遅く | 放送の最後の一言、ボスの台詞、「……おいしい。」 |
| `{shake}…{/shake}` | 震える文字 | 動揺、鳴らない鐘、セミ |
| `{wave}…{/wave}` | 波打つ文字 | 歌、ピッチの揺れ（段階1のNPC）、放送のこだま |
| `{c=#E23B2E}…{/c}` | 朱色 | ハンコの名前、「みました」、キーワード |

- コンセプトの `{w}` は、このファイルでは `{w=300}` と書く。
- 1ページに `{w=…}` は3つまで。テンポ最優先。

### 1.4 このファイルのメッセージブロック書式

会話・調べる・イベントは ` ```msg ` ブロック、戦闘は ` ```battle ` ブロックで書く。

```text
@npc_mother            ← 話者。npc_* / narr（地の文・名札なし）/ sys（システム）/ flip（カネナリくんのフリップ）/ 名札を直接書く場合は @名札:voice
コロッケ 4つ。ソースは 別。   ← 表示される1行
別よ？
/                      ← ページ送り（次のメッセージ）
> 演出メモ（表示しない） ← カメラ、SE、モーションの指示
? べつ | いっしょ       ← 選択肢
[べつ]                  ← 選択肢の分岐（次の空行まで、または次の [..] まで）
```

- 戦闘の差し込み変数は `$actor` `$target` `$enemy` `$n` `$item` `$skill` `$move` `$stat`。`{…}` はマークアップ専用なので変数には使わない。
- 文字数チェックは変数を最長の値で置きかえて行う（`$actor`＝カネナリくん、`$enemy`/`$target`＝コーン・ボーカル、`$n`＝999、`$item`＝ちびたスタンプ台、`$skill`＝おかえりなさい、`$stat`＝すばやさ）。

### 1.5 話者の名札とボイスID

`say(text, { name, voice })` に渡す値。ボイスの音色は `40_audio.md`。（ ）内は音色の目安。

| 話者 | 名札 | voice | 音色の目安 |
|---|---|---|---|
| 地の文 | なし | `narr` | ごく小さい紙の擦れ（ほぼ無音） |
| システム（入手など） | なし | `sys` | なし（入手ジングルが鳴る） |
| 母 | 母 | `mother` | 中音の三角波 |
| 丸山（肉屋） | 丸山 | `maruyama` | 低いFM |
| おばあ | おばあ | `obaa` | かすれたノイズ混じり |
| まめ吉 | まめ吉 | `mamekichi` | 高めの矩形波、速い |
| 乾（ランドリー） | 乾 | `inui` | 柔らかい三角波、遅い |
| 鶴見巡査 | 鶴見巡査 | `tsurumi` | 歯切れのよい矩形波 |
| サエ | サエ | `sae` | 明るい矩形波25% |
| 女子高生 | 女子高生 | `jk` | 中高音、少し気だるい |
| 中学生 | 中学生 | `chugaku` | 低めの矩形波、語尾にリバーブ |
| 郵便屋さん | 郵便屋さん | `postman` | 中音、まるい |
| 日傘の人 | 日傘の人 | `madam` | 上品な三角波、ビブラート |
| 女の子（砂場） | 女の子 | `girl` | 高い三角波 |
| 男の子（ガチャ） | 男の子 | `kid` | 高い矩形波 |
| おじいさん | おじいさん | `ojii` | 低い三角波、ゆっくり |
| 水まきの人 | 水まきの人 | `mizumaki` | 中音、はずむ |
| 影の人 | 影の人 | `shadow` | ローパスで こもった中音 |
| ハト／ハト係長 | ハト／ハト係長 | `hato` | 短い高音 |
| コタロウ（柴犬） | コタロウ | `dog` | 短い低音のブリップ |
| ネコ | ネコ | `cat` | ごく短い高音 |
| カラス | カラス | `crow` | ノイズの短い「カ」 |
| テレビ | テレビ | `tv` | バンドパスの中音 |
| 防災無線・放送 | 防災無線 | `broadcast` | バンドパスのノイズ＋エコー |
| おじぎ自販機 | おじぎ自販機 | `vending` | 合成音声風の矩形波、音程が段々 |
| オムカエマチ | ？？？→オムカエマチ | `omukaemachi` | 低いパッド＋子どもの高音の二重 |
| カネナリくん（フリップ） | カネナリくん（フリップ）※名札は「カネナリくん」＋フリップのアイコン | `flip` | ペンでキュッ |
| カネナリくん（声） | カネナリくん | `kanenari_voice` | エンディングの1回だけ。柔らかい低めの声 |
| ミナト（心の声） | なし | なし | 戦闘の書き文字のみ。フィールドでは話さない |

---

## 2. トーン＆ボイスガイド

### 2.1 配合 ★

- **笑い7：切なさ3**。1つの会話で切なさを出すのは**最後の1ページだけ**。説明はしない。
- 不思議なことが起きても、**町の人は驚かない**。受け入れて、ずれた感想を言う。これがこの町の笑いの基本。
- 切なさは「来ない」「帰る」「待つ」「名前がない」「見てもらえない」という語だけで匂わせる。「さびしい」「かなしい」とは書かない（例外：乾の段階2の1回だけ）。
- 泣かせるのはエンディングの最後の30秒だけ。

### 2.2 使ってよいユーモアの型

| 型 | 中身 | 例 |
|---|---|---|
| 大まじめな勘違い | モノが別のモノだと思いこみ、本気でやりとげる | コーンが自分をメガホンだと思って歌う |
| 具体すぎる数字 | ぼんやりした話に、妙に細かい数字 | 「3年 待ってる」「3人 来ました」「17%」 |
| 正直すぎる表示 | 看板や表示が、言わなくていいことまで言う | 「からっぽ も 入っています」 |
| 一拍おくれ | 気づくのが一拍遅い、言い直す | 「まいど！ まいど！ まい……ど？」 |
| 夏休み最終日のあるある | 子どもの生活の実感 | 白紙の自由研究、「ソースは 別」 |
| お役所・職場ことば | 生き物やモノが事務的にしゃべる | ハト係長の「本件、持ち帰ります」 |
| 天丼（くり返し） | 同じネタを場所を変えて3回まで | 「3人」、「別よ？」、「17」 |

### 2.3 禁止事項

- **MOTHER/EarthBound 由来のもの**：敵名・地名・台詞のもじり、PSI／超能力という語、電話でのセーブや家族からの電話、野球帽とバット、赤い帽子、丸い顔の種族の話し方（語尾の独特なくり返し）、隕石、主人公の飼い犬、「◯◯のばしょ」系のメロディ集め、HPドラムの言及。
- **恐怖**：流血、死体の描写、ジャンプスケア、「呪い」「祟り」「死ね」などの語。セミの「死んだふり」は OK（ふりなので）。
- **下ネタ、容姿いじり、差別、説教**。ネットスラング（草、ワロタ、エモい、〜み、など）。
- **実在の固有名**：企業、商品、ブランド、芸能人、実在の地名（「夕鳴町」「星見台」は架空）。
- **メタ発言**：NPC がボタン名やゲームの仕組みを言わない。操作説明は UI のガイド表示（`sys` ではなく画面端の小ウィンドウ）で出す。例外は1つだけ：ツッコミ書き文字「HPを 吸うな！」。
- **ミナトのフィールドでの発話**。ミナトは選択肢（主語なし）とうなずき・首ふりだけ。

### 2.4 地の文（narr）の書き方

- 短く、淡々と、少しだけ意地悪に。語り手はミナトではなく「町を見ている だれか」。
- 感想ではなく**事実を1つ足してオチにする**（「……羽で。」「腕は ない。」）。
- 1回の調べるテキストは原則1ページ。オチがあるときだけ2ページ。

### 2.5 キャラクター別の口調

| キャラ | 一人称／呼び方 | 語尾・口癖 | 文の長さ | ひとこと |
|---|---|---|---|---|
| 母 | お母さん／ミナト | 「〜よ」「〜なさい」「〜わね」。要点をくり返す（「別よ？」） | 短い | 心配を指示の形でしか言わない |
| 丸山 | オレ／ボウズ | 「〜だ」「〜な」「〜ねえ」。油を人のように扱う | 中 | 職人。油の信念の代弁者 |
| おばあ | あたし／ミナト、あんた | 「〜だよ」「〜かい」「〜しておいで」。ときどき先生口調（「はい、よくできました」） | 中 | 元担任。見る人 |
| まめ吉 | おれ／なし | 文頭と文末に「まいど！」。べらんめえ気味「〜だい」 | 短い | 反射でしゃべる |
| 乾 | 僕／君 | 丁寧語の独り言。「〜です」「〜ですね」 | 中、間が多い | 待つ人。詩的な報告 |
| 鶴見巡査 | 本官／なし | 「〜であります！」。報告口調 | 中 | 真面目にずれる |
| サエ | わたし／ミナト | 「〜だから」「〜かも」。自己評価が高い | 短い | 観察の人。3人目 |
| 女子高生 | うち／なし | 「〜なの」「〜じゃん」「逆に」 | 短い | 淡々とこわがる |
| 中学生 | おれ／なし | 「……フッ」なし。言い切ってから自分で訂正する | 短い | 修行中 |
| 郵便屋さん | 僕／なし | 「〜なんだ」「〜かな」。困り顔 | 中 | 宛先を探す人 |
| 日傘の人 | わたし／ミナトくん | 「〜のよ」「〜かしら」 | 短い | 犬のことしか話さない |
| 女の子 | あたし／なし | ひらがな多め、「〜の」「〜かなあ」 | 短い | 工事中 |
| 男の子 | ぼく／なし | 子どもの理屈「〜だから 平気」 | 短い | 100円は強い |
| おじいさん | おれ／ボウズ | 「〜だよ」「〜な」。将棋の言葉 | 短い | 待つ人（孫） |
| 水まきの人 | わたし／ミナトくん | 「〜のよ」「〜なの」。水のことを生き物のように言う | 中 | 道案内役 |
| 影の人 | 僕／君 | 疲れた会社員の「〜でね」「〜だよ」 | 中 | 残業中 |
| ハト係長 | ワタクシ／お客さま | 「〜で ございます」「本件」。語頭に「クルッ。」 | 中 | 窓口の人 |
| おじぎ自販機 | なし | カタカナのみ。「アリガトウ ゴザイマシタ」 | 短い | 押してもらえなかった |
| オムカエマチ | ぼく、ぼくたち | ひらがな多め。問いかけ、「〜の？」「〜ちゃう」 | 短い | 待ちくたびれた子ども |
| カネナリくん（フリップ） | なし | 丁寧語「〜です」「〜ます」。補足は（ ）で小さく | 短い | しゃべれない。書く |

### 2.6 カネナリくんのフリップの文法

- 話者 `@flip`。表示の前にフリップを掲げるモーション（0.2秒）、ペンの「キュッ」を1回。
- 1枚目は PR 大使としての建前、2枚目の（ ）で本音、の順が基本。
- 自分が「中の人のいない着ぐるみ」であることを、**否定するほど怪しくなる**ように書く（「なかのひとなど いません」）。正体は明かさない。
- 声は出さない。エンディングの「……おいしい。」だけが例外（`kanenari_voice`）。

### 2.7 ミナトの心の声

- 戦闘のツッコミ書き文字とノリツッコミでしか出ない。短く、関西弁ではない標準語のツッコミ（「〜かよ！」「〜するな！」「〜だろ！」）。
- フィールドの選択肢は動作で書く（「うなずく」「首を ふる」「べつ」「いっしょ」「押す」「やめておく」）。

---

## 3. ID一覧（他チーム参照用）

> 表記：`id` — 表示名 — 備考。ここにない ID を作るときは、同じ接頭辞の規則で作り、最終報告で共有する。

### 3.1 マップ（map_*）

| id | 表示名 | 備考 |
|---|---|---|
| `map_town` | 夕鳴町 | 外マップ 64×40。段階 0/1/2/夜 で見た目が変わる |
| `map_home_2f` | ミナトの部屋 | 8×6。開始地点 |
| `map_home_1f` | 潮見家 1F | 12×8。台所に母 |
| `map_maruyama` | 肉のマルヤマ | 8×6 |
| `map_hinoya` | 駄菓子 ひのや | 8×7。ショップ |
| `map_laundry` | コインランドリー ふわり | 10×6 |
| `map_koban` | 夕鳴銀座 交番 | 7×6 |
| `map_mall_hall` | ユウナリ 正面ホール（M1） | 20×14 |
| `map_mall_food` | ユウナリ フードコート（M2） | 18×12 |
| `map_mall_health` | ユウナリ 健康器具コーナー（M3） | 14×12 |
| `map_mall_2f` | ユウナリ 2F通路（M4） | 20×8 |
| `map_mall_maigo` | ユウナリ 迷子センター（M5） | 12×10。ボス |

`map_town` 内の区域（テキストの配置と、イベント領域の名前に使う。接頭辞 `area_`）：

| id | 区域 | 目安範囲（タイル） |
|---|---|---|
| `area_higurashi` | A ひぐらし坂 | x0–22, y16–40 |
| `area_ginza` | B 夕鳴銀座アーケード | x20–58, y18–34 |
| `area_park` | C 夕鳴公園 | x2–30, y0–16 |
| `area_parking` | D モール駐車場・モール前 | x32–60, y0–16 |
| `area_crossing` | 踏切 | x58–64, y20–30 |
| `area_alley` | 路地（A/B と C をつなぐ） | x16–22, y12–18 目安 |

### 3.2 NPC（npc_*）

詳細は6章。★は進行に必須。

| id | 名札 | 主な場所 | 出る段階 |
|---|---|---|---|
| `npc_mother` ★ | 母 | map_home_1f 台所 | 0,1,2,夜 |
| `npc_maruyama` ★ | 丸山 | map_maruyama | 0,1,2,夜 |
| `npc_obaa` ★ | おばあ | map_hinoya（段階1のイベントで店の前） | 0,1,2 |
| `npc_mamekichi` ★ | まめ吉 | area_ginza 豆腐屋の店頭 | 0,1,2 |
| `npc_inui` | 乾 | map_laundry | 0,1,2 |
| `npc_tsurumi` | 鶴見巡査 | map_koban | 0,1,2 |
| `npc_sae` | サエ | 段階0：area_ginza、段階1〜：area_park | 0,1,2 |
| `npc_jk` | 女子高生 | area_crossing | 0,1,2 |
| `npc_chugaku` | 中学生 | area_higurashi 空き地 | 0,1,2 |
| `npc_postman` | 郵便屋さん | area_ginza ポストの前 | 1,2 |
| `npc_madam` | 日傘の人 | area_higurashi 坂の途中 | 0,1,2 |
| `npc_kotaro` | コタロウ | npc_madam の横（柴犬） | 0,1,2 |
| `npc_sand_girl` | 女の子 | area_park 砂場 | 1,2 |
| `npc_gacha_boy` | 男の子 | area_ginza ひのや店先のガチャ台 | 0,1,2 |
| `npc_ojii` | おじいさん | area_higurashi 縁台 | 0,1,2 |
| `npc_mizumaki` | 水まきの人 | area_higurashi ミナトの家の東隣 | 0,1,2 |
| `npc_shadow_man` | 影の人 | area_park ベンチ | 2 |
| `npc_kanenari` ★ | カネナリくん | 段階1：area_park 時計塔のまわり。加入後は隊列 | 1,2,夜 |
| `npc_hato` | ハト | area_ginza ひのやの前（段階0のみ。段階1でハト係長になる） | 0 |
| `npc_cat_sauce` | ネコ | area_higurashi ブロック塀の上（茶トラ「ソース」） | 0,1,2 |
| `npc_cat_mike` | 三毛猫 | area_ginza 写真館のショーウィンドウの下 | 0,1,2 |
| `npc_crow` | カラス | area_park 入口の電柱の上 | 1,2 |
| `npc_cow_statue` | （なし） | area_ginza 肉屋の前の牛の置物（調べる扱い。17:00 に見上げる） | 0,1,2 |
| `npc_tv` | テレビ | map_home_1f（エンディングのみ話者として使う） | 夜 |
| `npc_broadcast` | 防災無線 | area_park スピーカー柱（話者のみ） | 1→2 |

### 3.3 敵・ボス

| id | 表示名 | 備考 |
|---|---|---|
| `enemy_hato_kakaricho` | ハト係長 | チュートリアル（イベント） |
| `enemy_semi_final` | セミファイナル | 任意 |
| `enemy_cone_vocal` | コーン・ボーカル | 任意（2体組） |
| `enemy_wasuregasa` | ワスレガサ | 任意 |
| `enemy_ojigi_jihanki` | おじぎ自販機 | 中ボス（必須） |
| `enemy_soujirou` | ソウジロウ | 1体必須、1体任意 |
| `enemy_momisugi` | モミスギ | 任意 |
| `enemy_kanenari` | カネナリくん | 加入イベント戦（ダメージを受けない特殊敵） |
| `boss_omukaemachi` | オムカエマチ | ボス |
| `boss_omukaemachi_cap` / `_umbrella` / `_bottle` / `_shoe` | 通学帽／傘／水筒／上履き | ボスの部位 |

パーティの `Member.id`：`minato`、`kanenari`（顔グラの `registerPortrait` と同じ）。

### 3.4 アイテム（item_*）

| id | 表示名 | 種別 |
|---|---|---|
| `item_ramune` | ラムネ | 回復 |
| `item_kinakobou` | きなこぼう | 回復 |
| `item_fugashi` | ふがし | 回復 |
| `item_hakka_ame` | ハッカあめ | 状態回復 |
| `item_stamp_pad` | ちびたスタンプ台 | 朱肉回復 |
| `item_oden_can` | 八月のおでん缶 | 全体回復（非売品） |
| `item_otsukai_memo` | おつかいメモ | 大事なもの（目的メモを兼ねる。10.3） |
| `item_gamaguchi` | がま口 | 大事なもの |
| `item_hanko_case` | ハンコケース | 大事なもの |
| `item_mimashita_cho` | みました帳 | 大事なもの（メニューの「みました帳」を開く） |
| `item_maigo_key` | 迷子センターの鍵 | 大事なもの |
| `item_hato_meishi` | ハトの名刺 | 大事なもの |
| `item_korokke` | 揚げたてコロッケ | 大事なもの（エンディング） |

### 3.5 能力（skill_*）

| id | 表示名 | 使い手 |
|---|---|---|
| `skill_tataku` | たたく | ミナト（Lv4で2段） |
| `skill_mimashita` | みました | ミナト（ハンコ） |
| `skill_peke` | ペケ | ミナト（ハンコ） |
| `skill_hanamaru` | はなまる | ミナト（ハンコ） |
| `skill_yarinaoshi` | やりなおし | ミナト（ハンコ） |
| `skill_okaerinasai` | おかえりなさい | ミナト（ハンコ・ボス最終局面専用） |
| `skill_oyasuminasai` | おやすみなさい | 空き枠の輪郭のみ（使えない。エンディングで見える） |
| `skill_tackle` | もこもこタックル | カネナリくん |
| `skill_fuusen` | ふうせんくばり | カネナリくん |
| `skill_goaisatsu` | ごあいさつ | カネナリくん（Lv3） |
| `skill_kane` | かねを鳴らす | カネナリくん |
| `skill_noritsukkomi` | ノリツッコミ | 2人（キレ満タン） |

敵の技（9章でテキストを定義。効果は `20_systems_battle.md`）：

| 敵 | 技 id |
|---|---|
| ハト係長 | `skill_hato_meishi` 名刺交換／`skill_hato_kaigi` 首ふり会議／`skill_hato_teiji` 定時退社 |
| セミファイナル | `skill_semi_shindafuri` 死んだふり／`skill_semi_final` セミファイナル（3連）／`skill_semi_miin` ミーン（最終回） |
| コーン・ボーカル | `skill_cone_nessho` 熱唱／`skill_cone_tsukodome` 通行止め／`skill_cone_konkon` コーン・コン |
| ワスレガサ | `skill_kasa_dakitsuki` 持ち主さがし／`skill_kasa_hiraku` 晴れてるのにひらく／`skill_kasa_shizuku` しずく |
| おじぎ自販機 | `skill_ojigi_charge` 90度おじぎ（溜め）／`skill_ojigi_press` 90度おじぎ（発動）／`skill_ojigi_otsuri` おつりの雨／`skill_ojigi_roulette` 当たりルーレット／`skill_ojigi_arigatou` アリガトウゴザイマシタ |
| ソウジロウ | `skill_souji_teinei` ていねいに掃除／`skill_souji_dansa` 段差チャレンジ／`skill_souji_juden` 充電に帰る |
| モミスギ | `skill_momi_momi` もみもみ／`skill_momi_kyou` 強モード／`skill_momi_otameshi` お試し10分 |
| カネナリくん（イベント） | `skill_kn_fuusen` ふうせんを配る／`skill_kn_goaisatsu` ごあいさつ／`skill_kn_pose` PRポーズ |
| オムカエマチ | `skill_omu_tebukuro` 片手袋のて／`skill_omu_madakonai` まだ来ない／`skill_omu_oshirase` 迷子のお知らせ／`skill_omu_chime` 五時のチャイム／`skill_omu_suitou` 水筒（回復）／`skill_omu_kaerinokai` かえりの会（通学帽）／`skill_omu_uwabaki` 上履きキック／`skill_omu_kasa` 傘（まもり）／`skill_omu_yoiko` よいこは おうちへ かえりましょう |

### 3.6 フラグ（flag_*）

`state.flags` に数値で入れる。0 = 未、1 = 済（特記以外）。

**町の状態**

| id | 値 | 意味 |
|---|---|---|
| `flag_stage` | 0/1/2/3 | 0 ふつう、1 停止、2 忘却、3 夜（エンディング）。モール内は 2 のまま（屋内の見た目はマップ側で持つ） |
| `flag_clock` | 0〜4 | HUD時計。0＝16:52、1＝16:55、2＝16:58、3＝17:00（停止）、4＝17:01（夜） |
| `flag_ginza_timer` | ミリ秒 | 段階0で area_ginza の屋外にいた累計時間。150000 で 17:00 を保険で起こす |

**本筋（この順に立つ）**

| id | 立つ場所 | 立てるイベント | 効果・解放 |
|---|---|---|---|
| `flag_opening_done` | map_home_2f | evt_opening | 操作開始 |
| `flag_errand` | map_home_1f | evt_errand | 500円、おつかいメモ、がま口。clock=1 |
| `flag_met_maruyama` | map_maruyama | evt_maruyama_first | 最初に訪れた店なら clock=2 |
| `flag_met_obaa` | map_hinoya | evt_obaa_first | 最初に訪れた店なら clock=2。ショップ解放 |
| `flag_chime_stopped` | area_ginza | evt_chime_stop | stage=1、clock=3。路地のコーンが消える |
| `flag_hato_beaten` | area_ginza | evt_hato_block の戦闘勝利 | ハトの名刺 |
| `flag_got_hanko` | area_ginza | evt_hanko_given | ハンコケース、みました、ペケ。ふしぎが押せる |
| `flag_fushigi_tutorial` | area_ginza | fushigi_04 を押す | おばあの「よくできました」 |
| `flag_park_hint` | area_ginza | evt_obaa_park_hint | 以後おばあは店内に戻る |
| `flag_met_kanenari` | area_park | evt_kanenari_meet | 戦闘開始 |
| `flag_kanenari_joined` | area_park | evt_kanenari_join | 仲間、はなまる |
| `flag_broadcast` | area_park | evt_maigo_broadcast | stage=2。影が北東を向く |
| `flag_parking_open` | area_parking | evt_maigo_broadcast | 駐車場のチェーンが外れる |
| `flag_ojigi_beaten` | area_parking | evt_ojigi 勝利 | 自動ドアが通れる、八月のおでん缶 |
| `flag_mall_entered` | map_mall_hall | evt_mall_enter | ― |
| `flag_got_maigo_key` | map_mall_food | evt_kaitenyaki（fushigi_12） | 迷子センターの鍵、やりなおし |
| `flag_soujirou_gate` | map_mall_2f | 必須ソウジロウ撃破 | 迷子センターの扉まで行ける |
| `flag_maigo_door_open` | map_mall_2f | evt_maigo_door | M5へ |
| `flag_boss_beaten` | map_mall_maigo | evt_boss_final | stage=3、clock=4 |
| `flag_clear` | ― | evt_ending の終わり | タイトルに達成数を表示 |

**サブ・記録**

| id | 意味 |
|---|---|
| `flag_fushigi_01` 〜 `flag_fushigi_12` | ふしぎに「みました」を押した |
| `flag_book_<enemy_id>` | みました帳「あいて」に登録（撃破で1）。例：`flag_book_enemy_semi_final` |
| `flag_tsukkomi_<enemy_id>_<n>` | そのツッコミ台詞を見た（n=1〜3）。みました帳「ツッコミ」 |
| `flag_seen_<npc_id>_<key>` | 2回目差分用。key は6章の各台詞見出し（例：`flag_seen_npc_mother_s1`） |
| `flag_mom_rest` | 母の麦茶で回復した回数（上限なし。記録のみ） |
| `flag_read_poster_sauce` | 電柱の迷い猫ポスター（obj_poster_lostcat）を読んだ。ネコの台詞が変わる |
| `flag_meishi_ground` | 段階0の落ちている名刺を調べた |
| `flag_gacha_count` | ガチャを回した回数 |
| `flag_bought` | ひのやで1回以上買った |
| `flag_sauce_choice` | エンディング：1＝べつ、2＝いっしょ |
| `flag_tsuke` | エンディングでツケにした |
| `flag_kanenari_flip_<place>` | 場所ごとのフリップを見た（place は6.15の key） |
| `flag_boss_phase` | ボス戦中：1/2/3（最終局面）。戦闘後にリセット |
| `flag_lost_count` | 全滅した回数（台詞の差分に使う） |
| `flag_saved` | 1回以上セーブした |

### 3.7 イベント（evt_*）

| id | 場所 | 起動 | 内容（5章） |
|---|---|---|---|
| `evt_title` | タイトル | 起動時 | ロゴのハンコ、チャイム4音 |
| `evt_opening` | map_home_2f | はじめる | 目覚め、母の声 |
| `evt_errand` | map_home_1f | 台所に近づく | おつかい |
| `evt_maruyama_first` | map_maruyama | 初入店 | 揚げたては5時 |
| `evt_obaa_first` | map_hinoya | 初入店 | 白紙の顔、ショップ |
| `evt_chime_stop` ★ | area_ginza | 両店訪問後に屋外へ／保険150秒 | 17:00の瞬間 |
| `evt_hato_block` | area_ginza | evt_chime_stop の直後 | ハト係長 |
| `evt_hanko_given` | area_ginza | ハト係長戦の勝利後 | ハンコケース |
| `evt_obaa_park_hint` | area_ginza | fushigi_04 を押す／押さずに銀座を離れる | 公園へ |
| `evt_alley_open` | area_alley | 段階1で路地に入る（1回） | コーンがいない |
| `evt_kanenari_meet` | area_park | カネナリくんに話しかける | 加入戦へ |
| `evt_kanenari_join` | area_park | 加入戦の勝利 | 仲間、はなまる |
| `evt_maigo_broadcast` ★ | area_park | evt_kanenari_join の直後 | 段階2へ |
| `evt_ojigi` | area_parking | モール入口に近づく | 中ボス |
| `evt_mall_enter` | map_mall_hall | 初入場 | 閉店して1年 |
| `evt_kaitenyaki` | map_mall_food | fushigi_12 を押す | 鍵、やりなおし |
| `evt_maigo_door` | map_mall_2f | 扉を調べる | 施錠／開錠 |
| `evt_boss_intro` | map_mall_maigo | 入室 | オムカエマチ |
| `evt_boss_phase2` | 戦闘中 | HP50%以下 | 第2段階 |
| `evt_boss_final` ★ | 戦闘中 | HP20%以下 | 鐘が鳴る、おかえりなさい |
| `evt_ending` ★ | 各所 | ボス後 | エンディング |
| `evt_gameover` | ― | 全滅 | きょうは ここまで |
| `evt_save_jizo` / `evt_save_bench` | area_higurashi／map_mall_2f | 調べる | セーブ（ベンチは全回復も） |
| `evt_mom_rest` | map_home_1f | 段階1以降に母と話す | 麦茶でHP全回復 |

### 3.8 BGM・SE の参照名（正式IDは 40_audio.md）

このファイルの台本で使う参照名。`40_audio.md` で ID が違う場合は、あちらに合わせて読みかえる。

- BGM：`bgm_title` `bgm_town_s0` `bgm_town_s1` `bgm_town_s2` `bgm_mall` `bgm_battle` `bgm_midboss` `bgm_boss` `bgm_ending` `bgm_night`（エンディング後半）
- ジングル：`bgm_jingle_victory` `bgm_jingle_levelup` `bgm_jingle_item`（大事なもの入手） `bgm_jingle_join`（仲間）
- SE：`se_chime_note`（チャイム1音、音程指定） `se_chime_cut`（4音目で途切れる） `se_stamp` `se_stamp_heavy` `se_flip`（フリップのペン） `se_pa_chime`（放送の前の4音） `se_chain` `se_shadow_swing` `se_bell_kanenari`（鐘が鳴る） `se_bell_dud`（鳴らない「コッ」） `se_crow` `se_door` `se_shop_bell` `se_fry` `se_shutter` `se_crossing_up` `se_train_pass` `se_pen_write` `se_clock_flip` `se_emote` `se_heal` `se_item` `se_coin` `se_gacha` `se_fushigi`（ふしぎの知らせ）

