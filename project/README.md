1. 準備: `sudo apt install ffmpeg fonts-noto-cjk open-jtalk open-jtalk-mecab-naist-jdic hts-voice-nitech-jp-atr503-m001` と `pip install pillow`（VOICEVOX ENGINE を起動しておけば自動でそちらを優先）。
2. 毎週 `scenes.json` の `scenes`（text / narration / theme）と `meta.output`（例 `short_002`）を書き換え、`python3 build.py` を実行。
3. `output/` に mp4・字幕 .srt・タイミング .timing.json ができる（BGMは `--bgm assets/xxx.mp3` で任意追加、既定はなし）。
