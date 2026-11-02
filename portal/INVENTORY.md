# ゲームの棚卸し（2026-11-02）

リポジトリ `ngcmwbj-art/-` の全ブランチと、Claude の Artifact 一覧を調べた結果。
確かめられなかったことは推測で埋めず「未確認」と書いています。

## 調べた場所

| 場所 | 中身 | ゲーム |
|---|---|---|
| `claude/instagram-homepage-yxf44f`（このブランチ） | pOna ホームページ、`farm-puzzle/` | はたけパズル |
| `claude/kei-truck-runner-game-ngc2ni` | pOna、`keitora/`、`farm-roguelike/`。**GitHub Pages の公開元**（`farm-roguelike/CLAUDE.md` の記録） | ビバベジ便、防農作戦 |
| `claude/farming-roguelike-game-7r3v4g` | `farm-roguelike/`（開発版）、`farm-puzzle/`（古い版） | 防農作戦（開発版） |
| `claude/gusoku-game` | `gusoku/index.html`（リアル版）、`gusoku/yuru.html`（ゆる版） | グソク、グソっ君 |
| `claude/compassionate-ritchie-vctp47` | `game/` | がんばれマサトくん！ |
| `claude/mother2-style-rpg-demo-3xqcx8` | `game/`（TypeScript + Vite。ビルドが必要） | しゅんの夕暮れあぜ道戦記 |
| `claude/claude-rc-97hhsd` | pOna ホームページと CLAUDE.md | なし |
| `claude/obsidian-explanation-slides-xbt6og` | Obsidian の解説スライド | なし |

## 登録したゲーム（7本）

| タイトル | 遊び方（出どころ） | ジャンル | 起動方法 | 遊ぶ URL | 状態 |
|---|---|---|---|---|---|
| はたけパズル | ブロックを置いて列を消し、水と肥料で野菜を育てる（README） | パズル | 静的。`farm-puzzle/` をサーバーで開く（JSON を読むので file:// 不可） | Artifact | 公開中 |
| 追い返せ！ボクらの防農作戦！ | カードで畑・家畜を育て、害獣や災害から1年を守る（README） | ローグライク（デッキ構築） | 静的。`farm-roguelike/` | GitHub Pages | 公開中 |
| 爆走！つがおのビバベジ便！ | タップでジャンプ、トマトを落とさず走る（meta description・画面） | アクション（ランゲーム） | 静的。`keitora/` | GitHub Pages | 公開中 |
| グソク | 話しかけ・餌・水温でオオグソクムシを育てる（画面の説明文） | 育成 | `python3 gusoku/build/site.py <出力先>` で単体ページを作る | Artifact | 公開中 |
| グソっ君 | グソクのゆる版（画面の説明文） | 育成 | 同上（`yuru.html`） | Artifact | 公開中 |
| がんばれマサトくん！ | WASD・ギター・タワーで台風からキャベツを守る（README・タイトル画面） | タワーディフェンス | 静的（ES モジュール、three.js は CDN） | Artifact | 開発中（README に「プロトタイプ」） |
| しゅんの夕暮れあぜ道戦記 | ツッコミとハンコの戦闘で町を歩く RPG 体験版（README） | RPG | `npm ci && npm run build` → `dist/` | Artifact | 公開中 |

## 登録しなかったもの（判断が必要なら指示をください）

- **Artifact「しゅんの夕暮れあぜ道戦記」（2026-09-28 更新）と「第2章」**：同じゲームの古い公開ページと思われるため、新しい方（2026-11-01、ピン留め）だけ登録
- **Artifact「しゅんの夕暮れあぜ道戦記 HD-2D 試作」**：同じゲームの試作版。別の1本として載せるかは未確認
- **防農作戦の開発版（`claude/farming-roguelike-game-7r3v4g`）**：公開中の Pages 版を登録。プレビューも Pages 版から撮影
- ゲームではない Artifact（青色帳簿、牛舎ノート、pOna、Obsidian、モーニングブリーフ、絵コンテ、プライバシーポリシー）

## 未確認のこと

- **GitHub Pages の2本**：この作業環境からは github.io に接続できず、実際に開けるかは未確認（公開元ブランチにファイルがあることは確認済み）
- **Artifact の5本**：Artifact は作成時は非公開。ほかの人が開ける共有設定になっているかは未確認
- **マサトくんの状態**：README の「プロトタイプ」を根拠に「開発中」にしたが、作者の意図は未確認
