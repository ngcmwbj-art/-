@AGENTS.md

# Claude Code 用の入口

共通の方針は上の AGENTS.md です。ここには Claude Code だけの道具を書きます。

- Skills（すべて依頼主が明示して始める）：`/project-work`、`/project-check`、`/game-dev`、`/video-produce`、`/note-write`（.claude/skills/）
- 確認役：サブエージェント `project-reviewer`（読むだけ。Read・Grep・Glob）。合格条件・差分・元資料を渡して点検させる。
- 用途別のルール：.claude/rules/（game・video・note。paths で対象を限定）
- Stop Hook：.claude/hooks/check_setup.py（このフォルダの AI 用設定ファイルだけを検査する）
- 長い背景や進捗はここに書かず、tasks/active.md・tasks/handoff.md・docs/ai/ に書く。
