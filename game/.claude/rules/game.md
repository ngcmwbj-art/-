---
paths:
  - "src/**"
  - "tools/**"
  - "public/**"
  - "index.html"
  - "vite.config.ts"
---

# ゲームのソースを触るとき

- 既存の実装のやり方に合わせる（docs/ARCHITECTURE.md、近くのファイルの書き方・名前の付け方・コメントの量）。
- PC・iPad・スマホで動くことを前提にする：タッチ操作、画面サイズの変更、縦横の回転、音の自動再生の制限（最初の操作まで鳴らない）。iPad 横ではボタンが下の角に固定され、中身がよける（src/engine/safezones.ts）。
- 外部の CDN や新しいライブラリ・画像・音声ファイルは、承認なしに足さない（絵はコード、音は WebAudio）。
- 画面に出る文は日本語で、1ページ3行まで。文を足したら `__game.cmd.textcheck2()`・`wrapCheck()` で確かめる。
- 表示名を変えても ID は変えない。
- 直したら型チェックと関係する通しテストを回す（docs/ai/checks.md）。
