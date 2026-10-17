# PR 動画（2026-10）の作り方の記録

2026-10-02 に作った PR 動画（完成版 44 秒、1920×1080・30fps・H.264＋AAC）の処理を、再現できるように残したもの。書き出した動画は video/05_export/（Git 管理外）に置く。

## 流れ
1. 開発サーバーを起動（127.0.0.1:5173。checks.md 参照）。
2. 場面の録画：`node rec.mjs scenes_<name>.json <作業dir>/clips [名前,...]`
   - ゲームを止めて（`__game.pause()`）1/30 秒ずつ進め（`__game.advance()`）、canvas を 384×216 の PNG 連番で保存する。
   - 場面の定義：scenes_main.json（戦闘・ノリツッコミ・夜明けなど）、scenes_re.json（第2章・エンディングの場面・釣り）、scenes_sub2.json（寄り道）、scenes_g3.json（ボタンなしのタイトル・寄り道の長め）、scenes_barn.json（牛舎）。
3. 音の書き出し：`node audio.mjs <作業dir>/audio '[{"name":"boss30","song":"bgm_boss","sec":30}, ...]'`
   - ゲームの音の仕組みをオフラインで鳴らして WAV にする（src/audio/report.ts の renderSong・render・renderSfx・renderAmbient）。使ったもの：bgm_boss、bgm_jingle_victory、時計塔のチャイム（4音・8音）、amb_higurashi、se_stamp_heavy。
4. 字幕の画像：`node caps.mjs <作業dir>`（Google Fonts から字幕に使う文字だけのフォントを取ってきて <作業dir>/font に置いておく。下の「素材」参照）
5. 組み立て：`python3 build3.py <作業dir> <出力.mp4>`（ffmpeg で 5 倍に拡大〔最近傍〕、場面をつなぎ、字幕を重ね、音を混ぜる。ボス曲の拍 140bpm に切り替えを合わせる）
6. 送る用に圧縮：`ffmpeg -i in.mp4 -c:v libx264 -preset slow -crf 19 -tune animation -pix_fmt yuv420p -c:a copy -movflags +faststart out.mp4`（30MB 未満にするため）

## 注意（そのままでは動かない所）
- rec.mjs・audio.mjs・caps.mjs は playwright を `/home/user/-/game/node_modules/playwright/index.mjs` の絶対パスで読んでいる。場所が変わったら直す。
- build3.py は `<作業dir>/ffmpeg` を呼ぶ（2026-10-02 は pip の imageio-ffmpeg に入っていた ffmpeg 7.0.2 を置いた）。PATH の ffmpeg を使うなら書きかえる。
- 作業dir（clips・audio・cap・font）は大きいので Git に入れない。
