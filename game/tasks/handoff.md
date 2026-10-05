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

## 次の一手
- HD-2D の試作の感想と実機の速さ（`__game.cmd.hd2dStats()`）を依頼主に聞く。広げるなら：ほかの場所、部屋、物語の寄り（zoomIn）の 3D 版、建物のうしろの人の影絵、せっていの「表示」切りかえ。
- 通しテストの mall2f は、フードコートを歩き回る敵がテストの「上へ歩く」に入ると時間切れになることがある（ゲームの不具合ではない。テストを強くする余地あり）。
- docs/game/bugs.md の未修正の不具合。
