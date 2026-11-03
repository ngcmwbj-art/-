#!/usr/bin/env python3
"""scenes.json から YouTube Shorts（1080x1920 / 30fps / H.264+AAC）を生成する。

使い方:
    python3 build.py                       # scenes.json -> output/short_001.mp4
    python3 build.py -s week45.json -o output/short_002.mp4
    python3 build.py --tts openjtalk       # TTSエンジンを固定（既定: auto）
    python3 build.py --bgm assets/bgm.mp3  # BGMを後から重ねる（既定: なし）

TTSは auto のとき、VOICEVOX ENGINE (http://127.0.0.1:50021) が動いていればそれを使い、
無ければ Open JTalk（open_jtalk コマンド）にフォールバックする。
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
W, H, FPS = 1080, 1920, 30
SR = 48000  # 中間音声のサンプルレート（mono / 16bit）

# ---------------------------------------------------------------- テーマ
THEMES = {
    "dark":   {"bg": "#0f172a", "bg2": "#1e293b", "fg": "#ffffff", "accent": "#f43f5e"},
    "red":    {"bg": "#7f1d1d", "bg2": "#b91c1c", "fg": "#ffffff", "accent": "#fde047"},
    "blue":   {"bg": "#0c4a6e", "bg2": "#0369a1", "fg": "#ffffff", "accent": "#facc15"},
    "green":  {"bg": "#064e3b", "bg2": "#047857", "fg": "#ffffff", "accent": "#fde047"},
    "purple": {"bg": "#3b0764", "bg2": "#6d28d9", "fg": "#ffffff", "accent": "#5eead4"},
    "light":  {"bg": "#f8fafc", "bg2": "#e2e8f0", "fg": "#0f172a", "accent": "#e11d48"},
}

FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJKjp-Bold.otf",
    "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
    "C:/Windows/Fonts/YuGothB.ttc",
    "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf",
]
NOTO_JP_INDEX = 0  # NotoSansCJK-*.ttc の 0 番が JP


def die(msg: str) -> None:
    print(f"[ERROR] {msg}", file=sys.stderr)
    sys.exit(1)


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        die(f"コマンド失敗: {' '.join(cmd[:6])} ...\n{r.stderr[-2000:]}")
    return r


def find_font(path: str | None) -> str:
    for p in ([path] if path else []) + FONT_CANDIDATES:
        if p and Path(p).exists():
            return p
    out = subprocess.run(["fc-list", ":lang=ja", "file"], capture_output=True, text=True).stdout
    files = [l.split(":")[0] for l in out.splitlines() if l.strip()]
    if files:
        return files[0]
    die("日本語フォントが見つかりません。fonts-noto-cjk を入れるか meta.font で指定してください。")


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    if path.endswith(".ttc"):
        return ImageFont.truetype(path, size, index=NOTO_JP_INDEX)
    return ImageFont.truetype(path, size)


# ---------------------------------------------------------------- テキスト処理
NO_HEAD = set("、。，．！？!?）」』】ぁぃぅぇぉっゃゅょァィゥェォッャュョー%％")


def split_narration(text: str, max_chars: int) -> list[str]:
    """ナレーションを字幕チャンクに分割（句読点で切り、長すぎる/短すぎる塊を調整）。"""
    parts = [p for p in re.split(r"(?<=[。！？!?])", text) if p.strip()]
    chunks: list[str] = []
    for sent in parts:
        if len(sent) <= max_chars:
            chunks.append(sent)
            continue
        # 読点で区切って max_chars 以内に詰める
        pieces = [p for p in re.split(r"(?<=[、，])", sent) if p]
        cur = ""
        for p in pieces:
            if cur and len(cur) + len(p) > max_chars:
                chunks.append(cur)
                cur = p
            else:
                cur += p
        if cur:
            chunks.append(cur)
    # 読点が無く長すぎる塊は助詞の切れ目で割る（Open JTalkは息継ぎ無しの長文を極端に遅く読むため）
    def split_long(c: str) -> list[str]:
        if len(c) <= max_chars:
            return [c]
        mid, best = len(c) / 2, None
        for i in range(2, len(c) - 2):
            if c[i - 1] in "でがはをにとも" and not re.match(r"[ぁ-ん、。ー]", c[i]):
                if best is None or abs(i - mid) < abs(best - mid):
                    best = i
        if best is None:
            return [c]
        return split_long(c[:best]) + split_long(c[best:])
    chunks = [x for c in chunks for x in split_long(c)]
    # 極端に短い塊（4文字以下）は直前に結合
    merged: list[str] = []
    for c in chunks:
        if merged and len(c.strip("。、！？")) <= 4 and len(merged[-1]) + len(c) <= max_chars * 1.4:
            merged[-1] += c
        else:
            merged.append(c)
    return [c.strip() for c in merged]


def wrap_balanced(text: str, font, max_w: int, max_lines: int) -> list[str] | None:
    """明示改行(\\n)があればそれを使う。無ければ幅に収まるよう2行までバランスよく折る。"""
    if "\n" in text:
        lines = text.split("\n")
        return lines if len(lines) <= max_lines else None
    if font.getlength(text) <= max_w:
        return [text]
    if max_lines < 2:
        return None
    n = len(text)
    best, best_score = None, 1e9
    for i in range(1, n):
        a, b = text[:i], text[i:]
        if b[0] in NO_HEAD:
            continue
        wa, wb = font.getlength(a), font.getlength(b)
        if max(wa, wb) > max_w:
            continue
        score = abs(wa - wb)
        pa, nb = a[-1], b[0]
        kind = lambda ch: ("kanji" if re.match(r"[一-龯々]", ch) else "hira" if re.match(r"[ぁ-ん]", ch)
                           else "kata" if re.match(r"[ァ-ヶー]", ch) else "alnum" if re.match(r"[A-Za-z0-9%％.]", ch)
                           else "other")
        ka, kb = kind(pa), kind(nb)
        if pa in "、，。 　" or nb in " 　":
            score -= W * 0.4                    # 読点・空白の位置が最優先
        elif pa in "はがをにでとのもへ" and kb != "hira":
            score -= W * 0.15                   # 助詞の後ろ
        if ka == kb and ka in ("kata", "alnum"):
            score += W * 0.6                    # カタカナ語・英数字の途中
        if ka == "kanji" and kb in ("hira", "kanji"):
            score += W * 0.3                    # 送り仮名・熟語の途中
        if ka == "hira" and kb == "hira" and pa not in "はがをにでとのもへ":
            score += W * 0.2
        if score < best_score:
            best, best_score = [a.rstrip(), b.lstrip()], score
    return best


def fit_text(text: str, font_path: str, max_w: int, max_lines: int, start: int, min_size: int,
             one_line_min: int | None = None):
    # 短い文は、多少小さくしてでもまず1行に収める（不自然な改行を避ける）
    if one_line_min and "\n" not in text:
        for size in range(start, one_line_min - 1, -4):
            f = load_font(font_path, size)
            if f.getlength(text) <= max_w:
                return f, [text]
    for size in range(start, min_size - 1, -4):
        f = load_font(font_path, size)
        lines = wrap_balanced(text, f, max_w, max_lines)
        if lines and all(f.getlength(l) <= max_w for l in lines):
            return f, lines
    die(f"テキストが{max_lines}行に収まりません: 「{text}」（短くするか \\n で改行位置を指定してください）")


def hex2rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def resolve_theme(scene: dict) -> dict:
    t = dict(THEMES.get(scene.get("theme", "dark"), THEMES["dark"]))
    if "bg" in scene:
        t["bg"] = scene["bg"]
        t["bg2"] = scene.get("bg2", scene["bg"])
    for k in ("fg", "accent"):
        if k in scene:
            t[k] = scene[k]
    return t


# ---------------------------------------------------------------- 画像生成
def render_frame(scene: dict, subtitle: str, meta: dict, font_path: str, idx: int, total: int,
                 progress: float) -> Image.Image:
    th = resolve_theme(scene)
    bg, bg2 = hex2rgb(th["bg"]), hex2rgb(th["bg2"])
    fg, accent = hex2rgb(th["fg"]), hex2rgb(th["accent"])

    # 縦グラデーション背景
    grad = Image.new("RGB", (1, H))
    for y in range(H):
        t = y / (H - 1)
        grad.putpixel((0, y), tuple(int(bg[i] + (bg2[i] - bg[i]) * t) for i in range(3)))
    img = grad.resize((W, H))
    d = ImageDraw.Draw(img)

    margin = 80
    # 上部ラベル（チャンネル名など）
    label = meta.get("label", "")
    if label:
        lf = load_font(font_path, 48)
        lw = lf.getlength(label)
        x0, y0 = (W - lw) / 2 - 36, 230
        d.rounded_rectangle([x0, y0, x0 + lw + 72, y0 + 88], radius=44, fill=accent)
        d.text((W / 2, y0 + 44), label, font=lf, fill=bg if sum(accent) > 380 else fg, anchor="mm")

    # 画面テキスト（大きく、2行以内）
    main = scene["text"]
    f, lines = fit_text(main, font_path, W - margin * 2, 2, meta.get("title_size", 150), 72,
                        one_line_min=meta.get("title_one_line_min", 100))
    lh = int(f.size * 1.3)
    cy = 760
    y = cy - lh * len(lines) / 2 + lh / 2
    for line in lines:
        d.text((W / 2, y), line, font=f, fill=fg, anchor="mm",
               stroke_width=max(2, f.size // 30), stroke_fill=bg)
        y += lh
    # アクセントの下線
    uy = cy + lh * len(lines) / 2 + 30
    d.rounded_rectangle([W / 2 - 120, uy, W / 2 + 120, uy + 14], radius=7, fill=accent)

    # 字幕（ナレーション同期・焼き込み）。Shortsの下部UIを避け y=1250〜1560 に置く
    if subtitle:
        sf, slines = fit_text(subtitle, font_path, W - margin * 2 - 60, 2, meta.get("subtitle_size", 64), 40)
        slh = int(sf.size * 1.35)
        box_h = slh * len(slines) + 60
        by = 1400 - box_h / 2
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.rounded_rectangle([margin - 10, by, W - margin + 10, by + box_h], radius=28, fill=(0, 0, 0, 170))
        img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
        d = ImageDraw.Draw(img)
        yy = by + 30 + slh / 2
        for sl in slines:
            d.text((W / 2, yy), sl, font=sf, fill=(255, 255, 255), anchor="mm",
                   stroke_width=3, stroke_fill=(0, 0, 0))
            yy += slh

    # 進捗バー（シーン位置）
    bar_y = 1700
    d.rounded_rectangle([margin, bar_y, W - margin, bar_y + 12], radius=6, fill=tuple(min(255, c + 40) for c in bg))
    d.rounded_rectangle([margin, bar_y, margin + (W - margin * 2) * progress, bar_y + 12], radius=6, fill=accent)
    pf = load_font(font_path, 36)
    d.text((W - margin, bar_y + 50), f"{idx}/{total}", font=pf, fill=fg, anchor="rm")
    return img


# ---------------------------------------------------------------- TTS
class VoicevoxTTS:
    name = "voicevox"

    def __init__(self, url: str, speaker: int, speed: float):
        self.url, self.speaker, self.speed = url.rstrip("/"), speaker, speed

    @staticmethod
    def available(url: str) -> bool:
        try:
            with urllib.request.urlopen(url.rstrip("/") + "/version", timeout=2) as r:
                return r.status == 200
        except Exception:
            return False

    def synth(self, text: str, out_wav: Path) -> None:
        q = urllib.parse.urlencode({"text": text, "speaker": self.speaker})
        req = urllib.request.Request(f"{self.url}/audio_query?{q}", method="POST")
        with urllib.request.urlopen(req, timeout=60) as r:
            query = json.loads(r.read())
        query["speedScale"] = self.speed
        query["prePhonemeLength"] = 0.05
        query["postPhonemeLength"] = 0.05
        req = urllib.request.Request(
            f"{self.url}/synthesis?speaker={self.speaker}", data=json.dumps(query).encode(),
            headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=120) as r:
            out_wav.write_bytes(r.read())


class OpenJTalkTTS:
    name = "openjtalk"
    DIC = ["/var/lib/mecab/dic/open-jtalk/naist-jdic", "/usr/local/share/open_jtalk/dic"]
    VOICE = ["/usr/share/hts-voice/nitech-jp-atr503-m001/nitech_jp_atr503_m001.htsvoice"]

    def __init__(self, speed: float, voice: str | None = None):
        self.speed = speed
        self.dic = next((p for p in self.DIC if Path(p).exists()), None)
        self.voice = voice if voice and Path(voice).exists() else next((p for p in self.VOICE if Path(p).exists()), None)
        if not (self.dic and self.voice):
            die("Open JTalk の辞書または音声ファイルが見つかりません。")

    @staticmethod
    def available() -> bool:
        return shutil.which("open_jtalk") is not None

    def synth(self, text: str, out_wav: Path) -> None:
        txt = out_wav.with_suffix(".txt")
        txt.write_text(text, encoding="utf-8")
        run(["open_jtalk", "-x", self.dic, "-m", self.voice, "-r", str(self.speed), "-ow", str(out_wav), str(txt)])


def make_tts(kind: str, meta: dict):
    vv_url = meta.get("voicevox_url", "http://127.0.0.1:50021")
    speed = float(meta.get("speed", 1.0))
    if kind in ("auto", "voicevox") and VoicevoxTTS.available(vv_url):
        return VoicevoxTTS(vv_url, int(meta.get("voicevox_speaker", 3)), speed)
    if kind == "voicevox":
        die(f"VOICEVOX ENGINE に接続できません（{vv_url}）。起動するか --tts openjtalk を指定してください。")
    if OpenJTalkTTS.available():
        return OpenJTalkTTS(speed, meta.get("openjtalk_voice"))
    die("TTSがありません。VOICEVOX ENGINE を起動するか、open-jtalk を入れてください（README参照）。")


# ---------------------------------------------------------------- 音声ユーティリティ
def to_pcm(src: Path, dst: Path) -> None:
    run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-ac", "1", "-ar", str(SR), "-sample_fmt", "s16", str(dst)])


def read_pcm(p: Path) -> bytes:
    with wave.open(str(p)) as w:
        return w.readframes(w.getnframes())


def trim_silence(pcm: bytes, thresh: int = 300, keep: float = 0.04) -> bytes:
    """TTS出力の前後の無音を削り、間の長さを設定値で揃えられるようにする。"""
    import array
    a = array.array("h", pcm)
    n = len(a)
    s = next((i for i in range(n) if abs(a[i]) > thresh), 0)
    e = next((i for i in range(n - 1, -1, -1) if abs(a[i]) > thresh), n - 1)
    k = int(SR * keep)
    s, e = max(0, s - k), min(n, e + k)
    return a[s:e].tobytes()


def silence(sec: float) -> bytes:
    return b"\x00\x00" * int(round(SR * sec))


def write_wav(p: Path, pcm: bytes) -> None:
    with wave.open(str(p), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm)


def apply_readings(text: str, readings: dict) -> str:
    for k in sorted(readings, key=len, reverse=True):
        text = text.replace(k, readings[k])
    return text


def fmt_srt(t: float) -> str:
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"


# ---------------------------------------------------------------- メイン
def build(args) -> None:
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            die(f"{tool} が見つかりません。")
    spec = json.loads(Path(args.scenes).read_text(encoding="utf-8"))
    meta, scenes = spec.get("meta", {}), spec["scenes"]
    font_path = find_font(meta.get("font"))
    tts = make_tts(args.tts, meta)
    out = Path(args.out or ROOT / "output" / f"{meta.get('output', 'short_001')}.mp4")
    out.parent.mkdir(parents=True, exist_ok=True)

    gap = float(meta.get("chunk_gap", 0.25))         # 字幕チャンク間の間
    lead = float(meta.get("scene_lead", 0.3))        # シーン頭の間
    tail = float(meta.get("scene_tail", 0.6))        # シーン終わりの間
    min_total = float(meta.get("min_duration", 45))  # 足りなければ各シーン末尾に均等に足す
    max_total = float(meta.get("max_duration", 60))
    readings = meta.get("readings", {})
    max_sub = int(meta.get("subtitle_max_chars", 22))

    print(f"[info] font={font_path}\n[info] tts={tts.name}")
    work = Path(tempfile.mkdtemp(prefix="shorts_", dir=args.workdir))

    # 1) 音声合成（字幕チャンク単位で合成 → 字幕と音声の境界が一致する）
    plan = []
    for si, sc in enumerate(scenes):
        chunks = split_narration(sc["narration"], max_sub)
        cdata = []
        for ci, ch in enumerate(chunks):
            raw = work / f"s{si:02}_{ci:02}_raw.wav"
            pcmf = work / f"s{si:02}_{ci:02}.wav"
            tts.synth(apply_readings(ch, {**readings, **sc.get("readings", {})}), raw)
            to_pcm(raw, pcmf)
            pcm = trim_silence(read_pcm(pcmf))
            sec = len(pcm) / 2 / SR
            if sec / max(1, len(ch)) > 0.32:
                print(f"[WARN] 「{ch}」の読み上げが遅すぎます（{sec:.1f}s）。読点「、」を入れてください。")
            cdata.append({"text": ch, "pcm": pcm})
        plan.append({"scene": sc, "chunks": cdata})
        print(f"[tts] scene {sc['id']}: {len(chunks)} chunks")

    # 2) 尺の調整（最小尺に届かなければ各シーン末尾の間を均等に伸ばす）
    def scene_len(p, extra=0.0):
        speech = sum(len(c["pcm"]) / 2 / SR for c in p["chunks"])
        return lead + speech + gap * (len(p["chunks"]) - 1) + tail + extra
    raw_total = sum(scene_len(p) for p in plan)
    extra = max(0.0, (min_total + 0.5 - raw_total) / len(plan))
    if extra:
        print(f"[info] 音声のみの尺 {raw_total:.1f}s < {min_total}s のため各シーン末尾に {extra:.2f}s の間を追加")

    # 3) シーンごとにセグメント（映像 + PCM音声、フレーム境界で長さ一致）を作る
    timeline, srt, seg_files = [], [], []
    t_global = 0.0
    frame_cursor = 0
    total_scenes = len(plan)
    for si, p in enumerate(plan):
        sc = p["scene"]
        events = []  # (subtitle, pcm)
        pcm = silence(lead)
        events.append(("", len(pcm)))
        for ci, c in enumerate(p["chunks"]):
            start = len(pcm)
            pcm += c["pcm"]
            if ci < len(p["chunks"]) - 1:
                pcm += silence(gap)
            events.append((c["text"], len(pcm) - start))
        hold = silence(tail + extra)
        pcm += hold
        # 最後の字幕は余韻の間も表示したまま
        last_t, last_n = events[-1]
        events[-1] = (last_t, last_n + len(hold))

        # 音声サンプル境界 → フレーム境界（累積で丸めてズレが溜まらないようにする）
        scene_start_frame = frame_cursor
        sample_cursor = 0
        concat_lines = []
        for ei, (sub, nbytes) in enumerate(events):
            s0 = sample_cursor
            sample_cursor += nbytes // 2
            f_end = scene_start_frame + round(sample_cursor / SR * FPS)
            nframes = f_end - frame_cursor
            if nframes <= 0:
                continue
            png = work / f"s{si:02}_e{ei:02}.png"
            progress = (si + (sample_cursor / (len(pcm) / 2))) / total_scenes
            render_frame(sc, sub, meta, font_path, si + 1, total_scenes, progress).save(png)
            concat_lines.append(f"file '{png}'\nduration {nframes / FPS:.6f}")
            if sub:
                ts, te = frame_cursor / FPS, f_end / FPS
                srt.append((ts, te, sub))
                timeline.append({"scene": sc["id"], "text": sub, "start": round(ts, 3), "end": round(te, 3),
                                 "speech_start": round(t_global + s0 / SR, 3)})
            frame_cursor = f_end
        concat_lines.append(f"file '{png}'")  # concat demuxer の末尾仕様
        scene_frames = frame_cursor - scene_start_frame
        # 音声をフレーム長ぴったりにパディング/切り詰め
        need = round(scene_frames / FPS * SR) * 2
        pcm = (pcm + b"\x00" * need)[:need]
        wav = work / f"scene{si:02}.wav"
        write_wav(wav, pcm)
        lst = work / f"scene{si:02}.txt"
        lst.write_text("\n".join(concat_lines) + "\n", encoding="utf-8")
        seg = work / f"scene{si:02}.mkv"
        run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-i", str(wav),
             "-vf", f"fps={FPS},format=yuv420p", "-frames:v", str(scene_frames),
             "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", str(FPS),
             "-c:a", "pcm_s16le", "-shortest", str(seg)])
        seg_files.append(seg)
        t_global = frame_cursor / FPS
        print(f"[seg] scene {sc['id']}: {scene_frames / FPS:.2f}s")

    total = frame_cursor / FPS
    if total > max_total:
        print(f"[WARN] 尺 {total:.1f}s が上限 {max_total}s を超えています。台本を短くするか speed を上げてください。")

    # 4) 連結 → AAC エンコード（+ 任意のBGM）
    lst = work / "all.txt"
    lst.write_text("".join(f"file '{s}'\n" for s in seg_files), encoding="utf-8")
    bgm = args.bgm or meta.get("bgm")
    LOUD = f"loudnorm=I={meta.get('loudness', -14)}:TP=-1.5:LRA=11,aresample={SR}"  # YouTube向け音量
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst)]
    if bgm:
        bgm_path = Path(bgm) if Path(bgm).is_absolute() else ROOT / bgm
        if not bgm_path.exists():
            die(f"BGMファイルがありません: {bgm_path}")
        vol = float(args.bgm_volume if args.bgm_volume is not None else meta.get("bgm_volume", 0.12))
        cmd += ["-stream_loop", "-1", "-i", str(bgm_path), "-filter_complex",
                f"[1:a]aresample={SR},volume={vol},afade=t=out:st={max(0, total - 1.5):.3f}:d=1.5[b];"
                f"[0:a]{LOUD}[v];[v][b]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]",
                "-map", "0:v", "-map", "[a]"]
        print(f"[info] BGM: {bgm_path} (volume {vol})")
    else:
        cmd += ["-af", LOUD]
    cmd += ["-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", str(SR),
            "-t", f"{total:.3f}", "-movflags", "+faststart", str(out)]
    run(cmd)

    # 字幕ファイルとタイミングログ（アップロード用・検証用）
    out.with_suffix(".srt").write_text(
        "".join(f"{i}\n{fmt_srt(a)} --> {fmt_srt(b)}\n{t}\n\n" for i, (a, b, t) in enumerate(srt, 1)),
        encoding="utf-8")
    out.with_suffix(".timing.json").write_text(
        json.dumps({"duration": total, "tts": tts.name, "cues": timeline}, ensure_ascii=False, indent=2),
        encoding="utf-8")
    if not args.keep:
        shutil.rmtree(work, ignore_errors=True)
    else:
        print(f"[info] 作業ファイル: {work}")
    print(f"[done] {out}  ({total:.2f}s)")


def main():
    ap = argparse.ArgumentParser(description="scenes.json から YouTube Shorts を生成")
    ap.add_argument("-s", "--scenes", default=str(ROOT / "scenes.json"))
    ap.add_argument("-o", "--out", help="出力mp4（既定: output/<meta.output>.mp4）")
    ap.add_argument("--tts", choices=["auto", "voicevox", "openjtalk"], default="auto")
    ap.add_argument("--bgm", help="BGMファイル（既定: なし）")
    ap.add_argument("--bgm-volume", type=float)
    ap.add_argument("--keep", action="store_true", help="作業ファイルを残す")
    ap.add_argument("--workdir", default=None)
    build(ap.parse_args())


if __name__ == "__main__":
    main()
