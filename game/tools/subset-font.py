#!/usr/bin/env python3
"""Subset DotGothic16 to the glyphs actually used by the game.

Scans every file under src/ for characters, adds printable ASCII, kana and
common punctuation, and writes public/fonts/game.woff2. Run via `npm run font`
(also runs automatically before `npm run build`).
"""
import pathlib, sys
from fontTools import subset
from fontTools.ttLib import TTFont

root = pathlib.Path(__file__).resolve().parent.parent
src = root / 'src'
chars = set()
for p in src.rglob('*'):
    if p.suffix in ('.ts', '.json', '.txt', '.md'):
        chars.update(p.read_text(encoding='utf-8'))
used = set(chars)
chars.update(chr(c) for c in range(0x20, 0x7f))
chars.update(chr(c) for c in range(0x3000, 0x3100))   # CJK punct, hiragana, katakana
chars.update(chr(c) for c in range(0xff01, 0xff5f))   # full-width ASCII
chars.update('…‥・〜ー―♪★☆●○◆◇■□▲△▼▽←→↑↓♥♡！？「」『』（）【】')
chars = {c for c in chars if ord(c) >= 0x20}

font_path = root / 'tools' / 'font' / 'DotGothic16-Regular.ttf'
out = root / 'public' / 'fonts' / 'game.woff2'
out.parent.mkdir(parents=True, exist_ok=True)
opts = subset.Options()
opts.flavor = 'woff2'
opts.layout_features = ['*']
opts.name_IDs = ['*']
opts.notdef_outline = True
font = TTFont(str(font_path), recalcTimestamp=False)  # same chars → same bytes
cmap = font.getBestCmap()
missing = sorted(c for c in used if ord(c) not in cmap and ord(c) > 0x7f and not c.isspace())
s = subset.Subsetter(options=opts)
s.populate(unicodes=[ord(c) for c in chars])
s.subset(font)
font.flavor = 'woff2'
font.save(str(out))
print(f'font subset: {len(chars)} chars -> {out.relative_to(root)} ({out.stat().st_size//1024} KB)')
if missing:
    print('WARNING: glyphs missing from DotGothic16:', ''.join(missing[:80]), file=sys.stderr)
