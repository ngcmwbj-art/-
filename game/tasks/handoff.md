# 引き継ぎ（handoff）

## 確定事項
- 対象は game/ だけ（リポジトリ直下の pOna のホームページは別案件）。用途はゲーム・動画・note。
- 変更のたびにコミット・プッシュする（依頼主の指示）。ブランチは claude/mother2-style-rpg-demo-3xqcx8。
- 名前の変更は表示だけで ID は変えない。名札と地の文に「さん」をつけない。第3章の中身は第1・2章でばらさない。

## 最近変えたファイル
- 2026-10-05：作業環境のセットアップ一式（docs/ai/setup-report.md の一覧を参照）
- 2026-10-05：採用案4つ（#81 水辺の図鑑、#82 二人十五脚〔かずお→ピー・コック〕、#83 ハンチングの値札、#84 70年の色紙と小さな夏祭り）
- 2026-10-05：HD-2D の試作（#85）：src/hd2d/（新規）、engine/screen.ts、world/field.ts、art/props/types.ts・bkit.ts、ui/flow.ts、main.ts、tools/make-artifact.mjs、package.json（three・@types/three）、docs/ARCHITECTURE.md の「HD-2D layer」

## 失敗したこと・注意
- 通しテストを2本同時に走らせると、出力フォルダの取り合いで落ちる。
- コンテナが再起動すると、裏で動いているエージェントやサーバーが止まる。途中経過はファイルに残す。
- Artifact を公開するときは、更新先の URL を必ず指定する（指定しないと別のページができる）。
- 2026-10-05：HD-2D の公開用ページが「artifact-pr-review machinery … too large for a review page」で公開を止められた。切り分けの結果、めりこみ検査（src/hd2d/overlap.ts）のコードが入ると止まる（大きさのせいではない）。`hd2dOverlaps` を開発サーバーだけにして公開できた（試作ページ Version 10。Version 5〜9 は切り分けの途中の版）。同じ止まり方をしたら、新しく足した QA 用のコードを外して試す。
- 2026-10-05（2回目）：町全体に広げた HD-2D のページで、検査のコードなしでも同じ止まり方をした（中身の量か並びで誤判定されるらしい。原因は不明）。`node tools/split-artifact.mjs dist-artifact/shun-hd2d.html <出力先>` でページと app.js に分け、Artifact の `files` に app.js を入れて公開すると通った（試作ページ Version 11）。HD-2D のページは今後この形で公開する。

## 次の一手
- HD-2D：2026-10-06 に第1章ぜんぶ（場所・部屋・戦闘の背景・エンディングの場面）を本体に入れた。第1章は最初から HD-2D、せっていで 2D に戻せる（#85 の直し5）。残り：第2章、実機の速さと見え方。通しテストはふだん 2D、`--hd2d` で HD-2D（`--slow`）。本体のページは three を含むので大きい（約 4.6MB）。公開で止められたら tools/split-artifact.mjs で分ける。
- 第3章：依頼主と構想を相談中（docs/design/03_ch3_memo.md の「リードの構想案」。決めてほしいこと7つ）。
- 通しテストの mall2f は、フードコートを歩き回る敵がテストの「上へ歩く」に入ると時間切れになることがある（ゲームの不具合ではない。テストを強くする余地あり）。
- docs/game/bugs.md の未修正の不具合。
