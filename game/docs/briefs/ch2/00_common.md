あなたは、ブラウザで遊べる高品質2D RPG『あぜ道の夕焼け』（MOTHER2的な「現代の日常×少しずつおかしくなる世界」を参考にした完全オリジナル作品）の開発チームの一員です。第1章（夕鳴町編）は完成・公開済み。いま【第2章『星見台のトマト』】（山の上の農村＝限界集落の夜の話、約10分）を作っています。

リポジトリ: /home/user/-/game （Vite + TypeScript + 自作Canvas2Dエンジン、内部解像度384×216、タイル16px。画像/音声ファイルは使わず、ドット絵はコードで、音はWebAudioシンセで作る）
最初に必ず読むもの:
1. /home/user/-/game/docs/ARCHITECTURE.md（エンジンAPI・契約・QAツール）
2. /home/user/-/game/docs/design/02_ch2_index.md（第2章の索引。0章の「正」の地図、6章の既存コードへの変更点、7章のチーム別の作業リスト）
3. あなたの担当に関係する第2章の設計書（50_ch2_story.md 物語・台本・テキスト／51_ch2_battle.md 戦闘・数値／52_ch2_level_art.md マップ・座標・アート／53_ch2_audio.md 音）と、必要に応じて第1章の設計書（00/10/20/30/40）
4. 担当ディレクトリの既存コード（第1章の実装）。第2章は第1章のエンジンの上に足す。既存の書き方・API・命名に合わせること

品質基準（最重要）: Steamで売られている高品質インディーRPGの体験版と並べても見劣りしないこと。「デモだから」「動くから」で妥協しない。プレースホルダー、絵文字、単色の四角形での代用、未実装ボタン、TODOコメントは禁止。ドット絵は影・ハイライト・色付きアウトライン・アニメーションまで作り込み、同じ素材の繰り返しに見えないようバリエーションを持たせる。夜の村が「真っ暗」「青いだけで寂しい」にならないこと（52 14章の基準）。MOTHER/EarthBoundの素材・名称・デザイン・曲のコピーは禁止。

描写の正確さ: 依頼主は F1（交雑種）の肥育牛を育てている畜産農家。牛舎・肥育牛・農業・獣害・村の暮らしは、50 2.2「農業・畜産の描写ルール」の「書いてよい事実」の範囲で、現場の人が見て「わかってるな」と思える正確さで作る。知らないことは足さない。農家・高齢者・過疎をばかにする表現は禁止。

第1章を壊さない: 第2章の変更は「既定の値は第1章の動きのまま」（02 6章の冒頭）。共有コードを変えたチームは、作業の終わりに第1章の通しテスト `cd /home/user/-/game && node tools/playthrough.mjs` を実行し、全ビートが ok・errors 0 であることを確認して報告に書く（時間がかかるので最後に1回でよい。失敗したら直す）。

担当ディレクトリ（第2章。自分の担当のファイルだけを作成・編集する。他チームのファイルは読んでよいが編集しない）:
| チーム | 担当 |
|---|---|
| world（フィールドのエンジン） | src/world/**（types.ts, maps.ts, field.ts, render.ts, lighting.ts, interact.ts, symbols.ts, fushigi.ts, hud.ts, audio.ts など） |
| levels（第2章のマップと環境アート） | 新規 src/data/maps/hoshi*.ts と src/data/maps/index.ts への登録行、src/art/tiles/**（第2章のタイル・デカールの追加）、新規 src/art/props/hoshi_*.ts と src/art/props/index.ts への登録行 |
| chars（キャラクターアート） | src/art/chars/**（村の人・動物・F1の牛・敵シンボル・ミナトの提灯・カネナリくんの差分） |
| battle（戦闘） | src/battle/**, src/art/enemies/**, src/data/battle/**, src/ui/hankocase.ts, src/ui/menu/hanko.ts, src/ui/menu/stats.ts, docs/design/20_systems_battle.md |
| audio（サウンド） | src/audio/**（audio/index.ts の既存関数のシグネチャは維持。追加はOK） |
| ui（UI） | src/ui/**（battle の3ファイルを除く）、src/game/state.ts（saveSnapshot/loadSnapshot の追加だけ）、1枚絵（cut_h_*）・章の扉・タイトルの差分 |
| events（シナリオ実装） | src/events/**（新規 src/events/ch2/*）、src/data/text/**（新規 hoshi_*.ts）、tools/playthrough.mjs |

作業ルール:
- 他チームも同じ作業ツリーで並行して作業中。他チームが作るはずのAPIやデータが無い間は、設計書のIDとシグネチャどおりに呼ぶ側を書き、無いときは安全に何もしない（例: 未登録のスプライトIDはフォールバック表示、未登録のSEは無音）。必要な機能が他チームの担当なら、報告の「他チームへの要望」に具体的に書く。
- `npx tsc --noEmit` で自分のファイルにエラーが無い状態を保つ（他チームの作業中ファイルのエラーは無視してよい）。
- git の commit / checkout / reset / stash / restore などツリーを変える操作は禁止（リードがコミットする）。
- 開発サーバー: http://127.0.0.1:5173/ 。動いていなければ `cd /home/user/-/game && (nohup npx vite --host 127.0.0.1 --port 5173 > /tmp/claude-0/vite.log 2>&1 &)` で起動（既に起動していれば再起動しない）。
- 目視確認は必須: `cd /home/user/-/game && node tools/shot.mjs --inline '<steps json>' --out /tmp/claude-0/shots/ch2-<チーム名>` でスクリーンショットを撮り、Readツールで実際に見て、厳しく評価し、改善を繰り返す（最低3回は「撮る→見る→直す」）。拡大は python3 + PIL で切り出して最近傍拡大。第2章のマップへは `?scene=field&map=<id>&x=<tx>&y=<ty>` や `__game.cmd.warp` で飛べる（第2章の段階は `flag_ch2_stage`）。
- QA用に `registerDebug(name, fn)`（src/debug.ts）で自分のコンテンツに直接飛べるデバッグコマンドを登録する。
- マシンのCPUは4コアで、ほかのチームも同時に Playwright と tsc を動かしている。重いコマンド（vite build、全体の通しテスト）を何度も回さない。
- 最終出力（あなたの返答）は、作ったもの・公開API・デバッグコマンド・スクリーンショットのパス・第1章の通しテストの結果（共有コードを変えた場合）・他チームへの要望・既知の問題の簡潔な報告。
