# はたけパズル（試作版 MVP）

ブロックを置いて列を消すと、畑で使う「水」と「肥料」がたまるパズルゲームです。
野菜を育てて収穫すると図鑑に登録され、旬や育て方のコツが読めます。
HTML / CSS / JavaScript だけで動きます（外部ライブラリなし・課金や広告なし）。

## あそび方

1. **パズル**：下の3つのブロックを盤面へドラッグ。縦か横の一列がそろうと消えて、💧水と🍂肥料がもらえます
2. **はたけ**：種まき → 水やり → 追肥 → （パズルで列を消して育つのを待つ）→ 収穫。収穫すると🪙コインが入り、区画を増やせます
3. **図鑑**：収穫した野菜の旬と育て方のコツが読めます

今の季節の旬の野菜をぜんぶ収穫すると、次の季節に進みます。旬の野菜は1.5倍の値段で売れます。

- 水と肥料には上限があります（上のバーのゲージ）。もうすぐいっぱいになると「はたけ」へ誘います
- 初めて開いたときは遊び方を3枚で案内します。右上の「？」からいつでも見直せます
- 右上の 🔇/🔊 で効果音を切りかえます（最初はオフ）。振動は「？」の中で切りかえます（iPhone は振動しません）
- 置き間違えたら「↩ 一手もどす」で1プレイに1回だけ取り消せます（ゲームオーバー画面からも可）

## 起動のしかた

JSON ファイルを読み込むため、`index.html` を直接ダブルクリックでは開けません。
このフォルダでかんたんなサーバーを起動してください。

```sh
cd farm-puzzle
python3 -m http.server 8000
```

- PC：ブラウザで http://localhost:8000/
- iPad・スマホ：PC と同じ Wi-Fi につなぎ、`http://<PCのIPアドレス>:8000/`
  （GitHub Pages などに置けば、URL を開くだけで遊べます）

## ファイル構成

```
farm-puzzle/
├─ index.html          画面の骨組み（パズル・はたけ・図鑑の3画面とタブ）
├─ css/style.css       見た目（色は先頭の :root でまとめて変更できます）
├─ data/
│  ├─ vegetables.json  野菜・季節・ゲームバランスのデータ
│  └─ messages.json    画面に出る文言
└─ js/
   ├─ util.js          共通の小道具（文言・ダイアログ・野菜の絵・お知らせ）
   ├─ storage.js       localStorage への保存（古い形のデータは直して引きつぐ）
   ├─ sound.js         効果音（その場で音を作る）と振動
   ├─ guide.js         初回ガイド
   ├─ puzzle.js        パズル（盤面・ドラッグ・列消し・ゲームオーバー）
   ├─ farm.js          畑（資源・栽培ステップ・収穫・区画追加・季節）
   ├─ zukan.js         図鑑
   └─ main.js          起動処理と、各部分のつなぎ役
```

### 処理の流れ

```
main.js が JSON を読み込む
  → 保存データを読み込む（storage.js）
  → 図鑑・畑・パズルを準備
パズルで列を消す → Farm.gainFromLines() で水・肥料が増える
ゲームオーバー   → Farm.advanceSeason() で季節が進む
畑で収穫         → コイン獲得・図鑑に登録（初めてならお知らせ）
変化があるたびに → localStorage に保存・上のバーを更新
```

## データの直し方

### 野菜を追加・修正する（`data/vegetables.json`）

```json
{
  "id": "tomato",              // 英数字の ID（保存データで使うので後から変えない）
  "name": "トマト",
  "icon": "🍅",                // 絵文字 / "mark:キ:#cfe8b0"（色の丸に1文字）/ "css:daikon"（CSSの絵）/ "img:img/tomato.png"（画像）
  "water": 6,                  // 水やりに必要な水
  "fertilizer": 4,             // 追肥に必要な肥料
  "grow": 6,                   // 追肥してから実るまでに消す列の数（なければ rules.growLines）
  "price": 24,                 // 収穫したときのコイン
  "seasons": ["summer"],       // 旬の季節（spring / summer / autumn / winter）
  "seasonText": "夏（6〜8月ごろ）",  // 図鑑に出る旬の説明
  "tips": ["…", "…"],          // 図鑑のミニ知識（1〜2行）
  "steps": { "sow": "…", "water": "…", "fertilize": "…", "harvest": "…" }  // 作業ごとのコツ
}
```

### ゲームバランス（`data/vegetables.json` の `rules`）

| 項目 | 意味 |
|---|---|
| `waterPerLine` / `fertilizerPerLine` | 1列消したときにもらえる水・肥料 |
| `waterPerMark` / `fertilizerPerMark` | 💧・🍂 のマークを1つ消したときのおまけ（マークの出やすさは `js/puzzle.js` の `RULES.markChance`） |
| `multiLineBonus` | 同時に消した列が1本増えるごとの上乗せ（0.5 = +50%） |
| `comboBonus` | コンボが1つ続くごとの上乗せ |
| `seasonBonus` | 旬の野菜を収穫したときのコイン倍率 |
| `waterMax` / `fertilizerMax` | 水・肥料の上限 |
| `nearFullRate` | この割合をこえたら「もうすぐいっぱい」と知らせる（0.8 = 8割） |
| `growLines` / `firstGrowLines` | 野菜に `grow` がないときの実るまでの列数／いちばん最初の1回だけの列数 |
| `startPlots` / `plotPrices` | 最初の区画数と、区画を増やす値段（並べた数だけ増やせる） |

ブロックの形や出やすさは `js/puzzle.js` の `SHAPES`、得点や引き直しの回数（やさしさ）は `RULES` で変えられます。

野菜は35種類。各季節に旬の野菜が10種類ずつあります（2つの季節が旬の野菜もあります）。

### 文言（`data/messages.json`）

画面に出る文章はすべてここにあります。`{score}` のような部分には数字などが入ります。

## 改善会議

`docs/kaizen/` に毎回の会議の記録があります（手順は リポジトリの `.claude/skills/kaizen-kaigi/SKILL.md`）。

## 保存データを消したいとき

ブラウザの開発者ツールのコンソールで次を実行してください。

```js
localStorage.removeItem('hatake-puzzle-save'); location.reload();
```
