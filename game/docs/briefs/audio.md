【あなたの担当: サウンド（音楽シーケンサ、全BGM、全SE、文字送りボイス、環境音）】
担当ディレクトリ: src/audio/**（audio/index.ts の既存関数のシグネチャは維持。関数の追加はOK）
主な参照: docs/design/40_audio.md（最重要）, docs/design/00_concept.md（13章 サウンド、3.4 段階システムの音、6.5 キレ段階のBGMレイヤー、6.8 SE）, 20_systems_battle.md（演出タイムラインのSE）, 01_index.md

実装するもの:
1. 音楽シーケンサ（Web Audio の先読みスケジューリング。setInterval 25ms + 先読み0.1s 程度）。パターン/トラック記述は人が読める形式（ノート名＋長さの文字列等）。ループ、テンポ、スウィング、パートごとの音色と音量、フェードイン/アウト、曲間のクロスフェード
2. 音色：矩形波（デューティ可変）、三角波、ノイズドラム（キック・スネア・ハット）、FMベース、デチューンしたノコギリのパッド、ビブラート、フィルタエンベロープ、リバーブ送り。チップ音源的でありつつ現代的な厚みと空間
3. 全BGM（40_audio.mdのリスト全部）。核になる動機「夕鳴町の五時チャイム」（オリジナル、4音目で止まる）を各曲に織り込む。段階1のピッチ半音下げ＋揺れ、段階2のテンポ−10%・逆再生風パッド・放送のこだま、屋内の崩れた版を実現するAPI（例: playBgm('bgm_town', {variant:'stage1'}) や setMusicParam('detune', …)）。戦闘のキレ段階レイヤー（キレ2でハイハット追加、キレ3でベース1オクターブ上）を setMusicParam('kire', n) 等で。追加した関数は audio/index.ts から export
4. 全SE（40_audio.mdと00_concept.md 6.8の表のSE全部。ID命名は se_*）。registerSfx で登録。パンやピッチ変化の引数に対応
5. 文字送りのボイスブリップ（13.4節、キャラごとに声色）。setTextBlip で登録。voiceId はNPC IDや 'minato','kanenari','mom','obaa' など設計書の指定に合わせる
6. 環境音（ヒグラシ、虫の声、蛍光灯のハム、風）：playAmbience(id)/stopAmbience() を追加
7. サウンドテスト用シーン registerScene('soundtest', …)：全BGM/SEを一覧から再生できる（ノート風UI）
8. 検証：人間の耳が無いので、OfflineAudioContext で各曲を数十秒レンダリングしてピーク/RMSを計測し、クリップしない・曲間の音量差が±3dB以内・SEがBGMに埋もれない、を数値で確認するスクリプトを tools/ ではなく src/audio 内のデバッグコマンドとして用意し（__game.cmd.audioReport()）、Playwrightで実行して結果を確認すること。音楽理論的に（コード進行、声部の動き、メロディの輪郭、リズムの面白さ）も自己レビューすること。MOTHER2等既存曲の旋律の引用・模倣は禁止
