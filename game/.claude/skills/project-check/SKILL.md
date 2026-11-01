---
name: project-check
description: 成果物と変更の差分を、docs/ai/checks.md の合格条件で検査し、証拠と未確認の事項を報告する。依頼主が /project-check で明示して始めるときだけ使う。
disable-model-invocation: true
argument-hint: "[検査する対象（省略時は未コミットの差分）]"
---

# project-check

対象：$ARGUMENTS（空なら、未コミットの変更と直前のコミット）

1. 対象を決める：`git status --short` と `git diff --stat`（必要なら直前のコミット）で、変わったファイルを一覧にする。
2. 用途を分ける：ゲーム（src/・tools/・public/）、動画（video/）、note（note/）、設定（AGENTS.md・CLAUDE.md・.claude/）。
3. docs/ai/checks.md から、その用途の合格条件と検査を選んで実行する。設定を変えたときは `python3 .claude/hooks/check_setup.py --report` も実行する。
4. 必要なら、サブエージェント project-reviewer に、合格条件・差分・元の資料・検査の結果を渡して、読むだけの点検を頼む。起動できなかったら、自分で観点を切り替えて見直し、「独立レビューは未実施」と書く。
5. 報告：合格条件ごとに「合格／不合格／未確認」と証拠（コマンドと結果の要点、ファイルと行）。依頼の範囲外の変更があれば挙げる。直すかどうかは依頼主に聞く（この手順では直さない）。
