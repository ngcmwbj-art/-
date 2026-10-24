# 合格条件と検査（checks）

「実行した／していない」を必ず分けて報告する。ここにあるコマンドは、このリポジトリに実在するものだけ。

## 共通（作業環境の設定）
- `python3 .claude/hooks/check_setup.py --report`：AGENTS.md・CLAUDE.md・.claude/ の設定ファイルの構文、必須ファイル、@import の行き先・重複・循環、Skills とサブエージェントの形式を検査する（Stop Hook と同じ中身）。

## ゲーム
合格条件：型エラー 0、通しテストのビートがすべて ok で errors 0、文のはみ出し違反 0、依頼された端末幅で見た目が崩れない。
1. 開発サーバー：`npm run dev`（http://127.0.0.1:5173/）。QA では HMR を止めて起動することが多い：`NO_HMR=1 npx vite --host 127.0.0.1 --port 5173`
2. 型チェック：`npx tsc --noEmit`
3. 通しテスト（サーバー起動中。2本を同時に走らせない）：
   - `node tools/playthrough.mjs`（第1章）
   - `node tools/playthrough.mjs --chapter 2`（第2章）
   - `node tools/playthrough.mjs --chapter 2 --side barnwork,delivery,sawa`（寄り道。ほかに ekinote・nihyaku・dome・wakime・sawako・gate・talk）
4. 文の検査（ブラウザのコンソール、またはスクリプトから）：`__game.cmd.textcheck2()`、`__game.cmd.wrapCheck()`
5. 画面写真：`node tools/shot.mjs --out <dir> --scale 3 --inline '[{"eval":"__game.cmd.warp(...)"},{"shot":"a.png"}]'`
6. 公開用の1枚 HTML：`npm run artifact:ch2` → `dist-artifact/shun-ch2.html`。ビルドで public/fonts/game.woff2 が変わることがある（変わったら一緒にコミット）。
- 手動確認：iPad 実機（依頼主）での見え方、音が最初の操作のあとに鳴ること。

## 動画
合格条件：docs/video/specs.md の解像度・フレームレート・尺に合う、音が割れない、台本と字幕が一致、素材の出所が video/03_assets/sources.md にある。
- ffprobe で確認：`ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate -show_entries format=duration -of compact <file>`（ffmpeg・ffprobe はこの環境の PATH に未導入。docs/video/specs.md 参照）
- 手動確認：通して見る、字幕の誤字、最後の画面。

## note
合格条件：docs/note/style.md の型に合う、事実・数字・引用に出所がある、誇張がない、タイトル案3つとハッシュタグ案がある。
- 手動確認：声に出して読んで引っかかる所がないか。
