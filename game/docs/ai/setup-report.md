# 作業環境セットアップの報告（2026-10-05）

依頼：「Claude Code 作業環境セットアップ指示（ゲーム開発・動画制作・note作成 特化版）」。依頼主の決定：対象は game/ だけ（リポジトリ直下の pOna のホームページは別案件なので触らない）、用途はゲーム＋動画＋note、変更はいつもどおりコミット・プッシュする。

## 1. 確認した環境
| 項目 | 結果 |
|---|---|
| 作業ディレクトリ | /home/user/-（リポジトリ直下。game/ と pOna の2案件）→ 対象は /home/user/-/game |
| OS・シェル | Linux 6.18、bash |
| Claude Code | 2.1.289 |
| Git | 2.43.0。作業前の未コミット変更なし |
| 既存の指示書・設定 | game/ に CLAUDE.md・AGENTS.md・CLAUDE.local.md・.claude/ は無かった。リポジトリ直下にも無い |
| ゲーム | package.json（vite 8・typescript 5.9・playwright 1.56.1）、自作の Canvas2D（外部のゲームライブラリなし）、`npm run dev`／`build`／`typecheck`／`artifact`、QA は tools/playthrough.mjs・tools/shot.mjs |
| 動画 | ffmpeg・ffprobe は PATH に未導入（2026-10-02 は pip の imageio-ffmpeg 7.0.2 を一時的に使用）。Python 3.11、Node 22。素材フォルダは無かった |
| note | 原稿・下書き・文体見本・画像フォルダは無かった |
| サンドボックス | bubblewrap・socat が未導入（Linux で必要） |

公式資料（2026-10-05 に取得）：memory・settings・permissions・hooks・skills・sub-agents・sandboxing の各ページで、@import（相対パス・4段まで）、AGENTS.md の読まれ方、.claude/rules の paths、Read/Edit の deny の書き方、Stop Hook の入力（stop_hook_active）と出力（decision: block・reason）、timeout、Skills と サブエージェントの frontmatter を確かめた。

## 2. 作成・変更したファイル（すべて game/ の中）
- 新規：AGENTS.md（60行）、CLAUDE.md（`@AGENTS.md` ＋ Claude 用の入口）
- 新規：docs/ai/context.md・checks.md・setup-report.md、tasks/active.md・handoff.md
- 新規：docs/game/design.md（設計書の入口）・devices.md・bugs.md
- 新規：video/（01_plan〜06_publish、03_assets の images・audio・bgm・voice と sources.md、04_edit/pr_2026-10/ に PR 動画の録画・音・字幕・組み立てのスクリプトと場面の定義）、docs/video/specs.md
- 新規：note/（drafts・images・published）、docs/note/style.md
- 新規：.claude/rules/game.md・video.md・note.md（すべて paths で対象を限定）
- 新規：.claude/skills/project-work・project-check・game-dev・video-produce・note-write（すべて `disable-model-invocation: true`、allowed-tools なし）
- 新規：.claude/agents/project-reviewer.md（tools は Read・Grep・Glob だけ）
- 新規：.claude/settings.json（秘密ファイルの Read/Edit の deny、Stop Hook）、.claude/hooks/check_setup.py
- 変更：.gitignore（既存の4行はそのまま、下に追記）

## 3. 実行した検査と結果
| 検査 | 結果 |
|---|---|
| `python3 .claude/hooks/check_setup.py --report` | 問題なし（AGENTS.md 60 行） |
| Hook の単体テスト（仮のコピーで実施） | 正常：出力なし・終了 0 ／ 異常（settings.json 破損）：decision: block と理由 ／ stop_hook_active: true：止めない ／ stdin が閉じない：約 2.0 秒で終わる ／ 壊れた JSON の stdin：{} として検査 ／ Hook の二重登録・@import の循環：検出 ／ 正常時の実行時間 約 0.03 秒 |
| Hook の登録の再実行 | Stop は 1 件のまま（増えない） |
| `npx tsc --noEmit` | エラー 0（ゲームのコードは変えていない） |
| `git ls-files -ci --exclude-standard` | 追跡中で ignore に当たるファイルは無し |
| 独立レビュー（project-reviewer） | 未実施：このセッションはリポジトリ直下で始まっているため、game/.claude/agents が読みこまれない。主担当が観点を切り替えて読み直した |
| 設定の読みこみ（/memory・/context・/hooks・/agents・/permissions） | 未確認：画面の操作が要る。下の「確認のしかた」 |

## 4. 採用した構成と、未適用・未確認の項目
- **大事な前提**：.claude/settings.json（deny と Stop Hook）と project-reviewer は、Claude Code を **game/ で起動したとき** に読まれる（`cd game && claude`）。リポジトリ直下で始めたセッション（いまの claude.ai のクラウドのセッションなど）では、CLAUDE.md・.claude/rules・.claude/skills は game/ のファイルにさわったときに読まれるが、settings.json とサブエージェントは読まれない。直下にも置くかどうかは、pOna の案件にかかわるので依頼主に確認する。
- deny は Claude の Read/Edit の道具にだけ効く。Bash からの読み取りまでは防げない（防ぐにはサンドボックスが要る）。.gitignore や CLAUDE.md では読み取りは防げない。
- サンドボックス：未適用。Linux では bubblewrap と socat が要る（このコンテナには無い）。ローカルの PC で使うなら、入れたあと Claude Code で `/sandbox` を実行して有効にする。
- MCP（YouTube・note などへの投稿系）：追加していない。用途・必要な権限・送る先・送るデータが決まってから提案する。
- ffmpeg・ffprobe：入れていない（パッケージの追加は承認が要る）。動画の作業のときに相談する。
- 動画の公開先と縦型ショートの仕様、note の読者と有料部分：未確定（docs/video/specs.md・docs/note/style.md に「要確認」）。
- 既存の過剰な権限：プロジェクトの設定には無かった。ユーザー設定（~/.claude/settings.json）は空で、変えていない。

## 5. 確認のしかた（新しいセッションで）
1. `cd game` してから Claude Code を起動する。
2. `/memory`：CLAUDE.md と、読みこまれた AGENTS.md が出るか。
3. `/hooks`：Stop に check_setup.py が1件あるか。
4. `/agents`：project-reviewer があるか。
5. `/permissions`：deny に Read(**/.env) などがあるか。
6. `/` を打って、project-work などの5つの Skill が出るか。

## 6. 今回だけの復元手順
- まとめて戻す：`git revert d566e0c`（履歴は書きかえない）。
- .gitignore だけ戻す：`cp game/.ai-backup/2026-10-05/.gitignore game/.gitignore`（.ai-backup は Git の管理外）。
- 新規ファイルは上の2の一覧のとおり。ほかの既存ファイルは変えていない。
