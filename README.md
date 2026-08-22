# 米粉の焼き菓子 pOna — ホームページ

Instagram [@komekopona](https://www.instagram.com/komekopona/)（米粉の焼き菓子 pOna）の
ホームページです。[Sunday Bake Shop](https://sundaybakeshop.jp/) の「静かで余白のある
焼き菓子屋のサイト」という佇まいを参考に、余白・明朝体・生成りの色でまとめています。

## 構成

```
index.html              1ページ完結（アンカーで各セクションへ）
assets/css/style.css    スタイル
assets/js/main.js       ヘッダー／メニュー／スクロール表示
assets/img/             写真を入れる場所（現在は空）
```

セクションは 上から `Hero → About → Items → Shop → Access → Instagram → Footer`。

## 見かた

ビルド不要の静的サイトです。`index.html` をブラウザで開くだけで確認できます。
ローカルサーバーで見る場合:

```sh
python3 -m http.server 8000
# → http://localhost:8000
```

GitHub Pages に置く場合は、リポジトリの Settings → Pages で
このブランチの `/`（root）を公開先に指定してください。

## 掲載情報について

この環境から instagram.com / sundaybakeshop.jp へ直接アクセスできなかったため、
店舗情報は公開されている店舗情報サイト（食べログ・autoreserve 等）の記載を
もとにしています。**公開前に必ずご本人の情報とつき合わせて確認してください。**

| 項目 | 現在の記載 |
| --- | --- |
| 店名 | 米粉の焼き菓子 pOna |
| 住所 | 〒370-3503 群馬県北群馬郡榛東村新井 3349-2 |
| 営業日 | 水・土 |
| 営業時間 | 10:30 – 17:00（L.O. 16:30） |
| 定休日 | 日・月・火・木・金 |
| 支払い | 現金 / PayPay |
| 開店 | 2024年5月4日 |

### 差し替えが必要なところ

- **Items セクション**（`index.html` の `<!-- ── ITEMS ── -->`）
  クッキー・マフィン・シフォン・スコーン・タルト・詰め合わせは**構成見本**です。
  実際のラインナップと説明文に書き換えてください。
- **About の本文** — 「母がつくり、娘と叔母が売る」という紹介を軸に書いています。
  ご本人の言葉に置き換えるのがいちばんです。
- **Access の交通案内** — IC・駅からの所要時間は目安です。実測値に直してください。
- **地図** — 現在は SVG のイラスト地図です。Google マップの埋め込み `<iframe>` に
  差し替えられるよう、`.access-map` の中にコメントを入れてあります。

## 写真を入れる

写真がまだないため、お菓子はすべて SVG のイラストで描いています。
写真に差し替える場合は `assets/img/` に置いて、各 `.item-art` の `<svg>` を
`<img src="assets/img/cookie.jpg" alt="米粉のクッキー" loading="lazy">` に
置き換えてください。CSS はそのまま使えます（`.item-art img` も幅100%で収まります）。

ヒーローの丸いイラストも同じ要領で、円形にトリミングした写真に差し替えられます。

## つくりの方針

- **フォント** — 見出しは Zen Old Mincho、欧文は Cormorant Garamond、
  本文は Zen Kaku Gothic New（すべて Google Fonts）
- **配色** — 生成り `#faf6ef` を地に、焼き色 `#8a6a4f` と葉の緑 `#93a383` を差し色に
- **アクセシビリティ** — スキップリンク、`aria-expanded` 付きのメニュー、
  キーボードフォーカス表示、`prefers-reduced-motion` 対応
- **依存なし** — フレームワーク・ビルドツールは使っていません
