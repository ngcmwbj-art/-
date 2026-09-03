# CLAUDE.md

このファイルは Claude Code がこのリポジトリで作業するときの前提をまとめたものです。

## このリポジトリ

米粉の焼き菓子 pOna（Instagram [@komekopona](https://www.instagram.com/komekopona/)）の
ホームページ。**ビルド不要の静的サイト**で、フレームワーク・パッケージマネージャ・
テスト・リンタは一切入っていません。`package.json` も `node_modules` もありません。

```
index.html              1ページ完結（ナビゲーションなし）
assets/css/style.css    スタイル（全部ここ。1ファイル）
assets/js/main.js       スクロール記号の表示制御とアンカーの補正のみ
assets/img/hero-1〜5    ヒーローのスライドショーの写真
assets/img/doodle-*     フッターのハリネズミ（白抜き doodle-hedgehog.png ／茶色 -brown.png）
README.md               サイトの説明・掲載情報の出どころ・差し替え手順
```

セクション順： `ヒーロー → 地図 → 住所 → 営業日 → メニュー → リンク → Copyright`

## 確認のしかた

ビルドコマンドはありません。ブラウザで開くだけです。

```sh
python3 -m http.server 8000   # → http://localhost:8000
```

見た目を変えたら、**幅の広い画面と 760px 以下の両方**を確認してください
（`@media (max-width: 760px)` でヒーローの寄せ方とハリネズミの大きさが変わります）。

## デザインの決まりごと

[sundaybakeshop.jp](https://sundaybakeshop.jp/) の構成を参考にしています。
以下は意図してそうしている点なので、勝手に「改善」しないでください。

- **ナビゲーションバーを置かない。** 上から順に読ませて終わる1枚もの
- **極太ゴシック＋広い字間（`letter-spacing: .16em`）＋中央揃え**、文章は最小限
- フォントは Zen Kaku Gothic New（Google Fonts）の **500 / 700 / 900 だけ**。
  ウェイトを増やすなら `index.html` の `<link>` も直す
- 配色は `:root` のカスタムプロパティに集約。差し色 `--accent: #7d5231` は
  pOna のロゴの茶色。**ここを直接ハードコードしない**
- 依存を増やさない。CDN・npm パッケージ・ビルドツールは入れない
- JavaScript は最小限。**ヒーローのスライドショーは CSS アニメーションだけ**で
  動いていて、JS は関与していません

## アクセシビリティ（維持すること）

- 先頭のスキップリンク、`:focus-visible` のアウトライン
- `prefers-reduced-motion: reduce` でスライドショー・スクロール記号・
  スムーズスクロールが止まる。**アニメーションを足したらここにも追記する**
- 装飾画像は `alt=""` ＋ `aria-hidden="true"`、地図の `<iframe>` には `title`
- 外部リンクは `target="_blank" rel="noopener noreferrer"`

## ヒーローのスライドショーを触るとき

写真の枚数を変えるときは、**3か所を必ず揃えて**直してください。

1. `index.html` の `.hero-media` 内の `<img class="hero-slide">`
2. `style.css` の `.hero-slide:nth-child(n)` の `animation-delay`
3. `@keyframes slideshow` の割合と `.hero-slide` の `animation` の総時間

いまは 1枚 6秒 × 5枚 = 30秒。1枚あたり 20%、切り替えのクロスフェードが 3%（0.9秒）です。
枚数を N に変えるなら、総時間 `6N` 秒、`animation-delay` は `6(n-1)` 秒、
キーフレームの割合は `100/N` % を基準に振り直します。
1枚目だけ `fetchpriority="high"`、残りは `loading="lazy"` にしておくこと。

## 掲載情報を触るとき

住所・営業時間・価格・メニューは Instagram の投稿と店舗情報サイトから読み取ったものです。
**推測で書き足さないでください。** 出どころは README.md の表にまとめてあります。
情報を変更・追加したら、README.md のその表も一緒に更新します。

営業日は月ごとに変わるため、サイトには**曜日と時間だけ**を書き、実際の営業日は
Instagram で確認してもらう作りにしています。これは意図した設計です。

## Git

- 作業ブランチで進めて、コミットメッセージは日本語・変更内容が分かる形で
- 画像を差し替えるときは同じファイル名を使う（HTML/CSS を直さずに済みます）
