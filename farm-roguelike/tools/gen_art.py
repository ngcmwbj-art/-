# キャラクター・カードの絵を「アニメ塗り」の SVG で生成する
# 使い方: python3 tools/gen_art.py assets/img/art
# 塗り方：くっきりした焦げ茶の線＋平らな色＋影1色（右下）＋小さな光
#   影は「同じ形を左上にずらして重ね、はみ出た右下を影色で残す」ことで自動で付く
import sys, os

OUT = sys.argv[1]
LINE = '#3a2c22'
N = [0]

def cel(d, base, shade, off=(-5, -6), hi=None, lw=2.4, extra='', tf=None):
    """1つの部品をアニメ塗りで描く。d はパス、base は地の色、shade は影の色"""
    N[0] += 1
    cid = f'c{N[0]}'
    s = f'<clipPath id="{cid}"><path d="{d}"/></clipPath>'
    s += f'<g clip-path="url(#{cid})"><path d="{d}" fill="{shade}"/>'
    s += f'<path d="{d}" fill="{base}" transform="translate({off[0]} {off[1]})"/>'
    if hi:
        s += hi
    s += extra + '</g>'
    s += f'<path d="{d}" fill="none" stroke="{LINE}" stroke-width="{lw}" stroke-linejoin="round"/>'
    if tf:
        s = f'<g transform="{tf}">{s}</g>'
    return s

def line(d, w=2.2, color=LINE):
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'

def eye(x, y, r=4.6):
    # 白目＋黒目＋光（ジブリの動物らしい丸い目）
    return (f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fffdf2" stroke="{LINE}" stroke-width="1.6"/>'
            f'<circle cx="{x+.6}" cy="{y+.5}" r="{r*.58:.1f}" fill="#1c1612"/>'
            f'<circle cx="{x+1.6}" cy="{y-.8}" r="{r*.22:.1f}" fill="#fff"/>')

def eye_s(x, y, r=2.6, iris='#1c1612'):
    # 写実寄りの小さな目：白目なし、光だけ（シリアスな獣の目）
    return (f'<circle cx="{x}" cy="{y}" r="{r+.8}" fill="{LINE}"/>'
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="{iris}"/>'
            f'<circle cx="{x+r*.35:.1f}" cy="{y-r*.35:.1f}" r="{r*.3:.1f}" fill="#f4ead0"/>')

def svg(name, body):
    s = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">\n'
         f'<!-- {name}：アニメ塗り（tools/gen_art.py で生成） -->\n'
         '<defs><filter id="mute"><feColorMatrix type="saturate" values=".72"/>'
         '<feComponentTransfer><feFuncR type="linear" slope=".93"/><feFuncG type="linear" slope=".93"/><feFuncB type="linear" slope=".9"/></feComponentTransfer></filter></defs>\n'
         f'<g filter="url(#mute)">{body}</g>\n</svg>\n')
    open(os.path.join(OUT, name + '.svg'), 'w').write(s)

# ── カラス：紺がかった黒、羽に青い光 ─────────────
svg('crow',
  cel('M30 90 L10 106 L16 100 L8 98 L26 84 Z', '#2c3242', '#1b1f2b', off=(-3, -3)) +
  cel('M28 76 C30 58 48 50 66 52 C70 40 78 31 88 31 C100 32 104 42 100 52 C98 60 92 66 88 72 C84 88 68 96 50 94 C40 92 32 86 28 76Z',
      '#363d52', '#20242f', off=(-6, -8),
      hi='<path d="M80 36 C86 33 94 34 97 40" stroke="#6f86b8" stroke-width="3" fill="none" stroke-linecap="round"/>') +
  cel('M38 66 C50 54 72 56 84 74 C70 84 50 82 38 66Z', '#2a3042', '#181c26', off=(-3, -4),
      hi='<path d="M46 64 C56 60 66 62 74 68" stroke="#5b70a0" stroke-width="2.4" fill="none" stroke-linecap="round"/>') +
  cel('M96 42 C104 42 112 46 117 52 C110 54 104 57 97 58 Z', '#2a2a2e', '#121214', off=(-2, -3), hi='<path d="M100 45 C106 46 110 48 113 51" stroke="#5a5c66" stroke-width="1.4" fill="none"/>') +
  line('M54 93 L52 106 M52 106 L46 109 M52 106 L57 109 M66 92 L66 105 M66 105 L61 108 M66 105 L71 108', 2.6, '#9a7046') +
  eye_s(88, 45, 2.8, '#2a1a10')
)

# ── キャベツ ─────────────────────────────
svg('cabbage',
  cel('M16 80 C8 58 24 40 44 46 C40 28 66 20 78 38 C96 30 114 50 102 70 C112 88 92 106 60 104 C28 106 10 96 16 80Z',
      '#6fae4c', '#4d8a36', off=(-6, -7)) +
  cel('M34 72 C32 52 50 42 66 44 C84 46 94 62 88 78 C82 94 56 98 42 88 C36 84 34 78 34 72Z',
      '#cfe7a0', '#a8cf7c', off=(-5, -6),
      hi='<ellipse cx="54" cy="56" rx="10" ry="6" fill="#eef8d2"/>') +
  line('M60 48 C54 60 56 74 62 86 M60 66 C66 62 74 62 80 64 M58 74 C52 72 46 72 40 74', 1.8, '#6f9a48') +
  line('M24 60 C30 66 32 74 30 82 M96 54 C92 62 92 70 96 78', 1.8, '#3f7a2c')
)

# ── 芽 ──────────────────────────────────
svg('sprout',
  cel('M18 98 C24 86 96 86 102 98 C96 106 24 106 18 98Z', '#8a6446', '#694a33', off=(-3, -4),
      hi='<ellipse cx="44" cy="92" rx="10" ry="2.4" fill="#a7805e"/>') +
  line('M60 92 C60 78 60 68 60 58', 4.2, '#4f8a35') +
  cel('M60 62 C46 64 26 56 22 38 C40 34 56 42 60 62Z', '#9fd06e', '#6fa84a', off=(-4, -5)) +
  cel('M60 58 C66 40 84 28 102 34 C100 54 80 62 60 58Z', '#8cc65e', '#5f9a3e', off=(-4, -5)) +
  line('M58 60 C46 54 36 48 28 42 M62 56 C74 48 86 42 96 38', 1.4, '#4f8a35')
)

# ── F1の子牛：黒毛、鼻先は肌色、つぶらな目 ──────────
svg('calf',
  line('M30 80 L28 103 M44 82 L44 103 M66 82 L66 103 M78 80 L80 103', 8, LINE) +
  line('M30 80 L28 101 M44 82 L44 101 M66 82 L66 101 M78 80 L80 101', 5, '#2e2724') +
  line('M27 103 L31 103 M42 103 L46 103 M64 103 L68 103 M78 103 L82 103', 3, '#8c7a6a') +
  cel('M76 50 C64 44 40 44 30 50 C18 56 18 76 30 82 C42 87 62 87 78 80 C84 72 84 58 76 50Z',
      '#3b3330', '#241e1c', off=(-6, -7),
      hi='<path d="M34 54 C44 50 58 50 68 52" stroke="#6a5c55" stroke-width="3" fill="none" stroke-linecap="round"/>') +
  line('M22 58 C14 60 12 70 14 77', 2.6) +
  cel('M64 38 C60 30 66 26 76 34 C74 40 68 41 64 38Z', '#3b3330', '#241e1c', off=(-2, -2)) +
  cel('M74 44 C78 30 104 30 108 46 C110 60 104 70 92 72 C82 72 74 60 74 44Z',
      '#423936', '#28211f', off=(-5, -6)) +
  cel('M92 62 C94 56 108 56 109 64 C108 71 94 72 92 66Z', '#d8ae96', '#b88c76', off=(-2, -2)) +
  '<circle cx="98" cy="64" r="1.3" fill="#5a3a2c"/><circle cx="104" cy="64" r="1.3" fill="#5a3a2c"/>' +
  eye_s(93, 48, 2.6)
)

# ── 除草：鎌と雑草 ─────────────────────────
svg('weeding',
  cel('M16 100 C20 78 26 62 34 54 C34 72 38 86 40 100 C44 80 50 66 58 58 C56 76 56 90 58 100Z',
      '#7cba52', '#4f8a35', off=(-3, -4)) +
  line('M12 100 L66 100', 2.6) +
  cel('M62 36 L68 38 L44 98 L38 96 Z', '#c48d58', '#94673d', off=(-2, -2)) +
  cel('M58 30 C76 16 104 20 110 40 C94 30 78 32 64 42Z', '#d9e2ea', '#9fb0c0', off=(-3, -4),
      hi='<path d="M70 26 C82 22 96 24 104 32" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>')
)

# ── 防鳥ネット ─────────────────────────────
svg('net',
  cel('M38 96 C38 84 50 80 52 92 C52 98 40 100 38 96Z', '#9fd06e', '#6fa84a') +
  cel('M66 96 C64 82 82 80 84 94 C82 100 68 100 66 96Z', '#ec8e6c', '#c2654a') +
  '<path d="M14 96 C14 50 106 50 106 96Z" fill="#cfe6f2" opacity=".55"/>' +
  line('M14 96 C14 50 106 50 106 96', 2.6) +
  line('M8 98 L112 98', 2.8) +
  line('M26 96 C30 70 44 60 60 58 M42 96 C44 76 52 64 60 58 M60 58 L60 96 M78 96 C76 76 68 64 60 58 M94 96 C90 70 76 60 60 58', 1.5, '#4f6f80') +
  line('M18 80 C46 72 74 72 102 80 M30 66 C50 62 70 62 90 66', 1.5, '#4f6f80')
)

# ── 収穫かご ─────────────────────────────
svg('basket',
  line('M30 62 C30 24 90 24 90 62', 7, LINE) + line('M30 62 C30 24 90 24 90 62', 4, '#c99a5e') +
  cel('M30 58 C30 44 54 42 56 56 Z', '#e86f56', '#bf4f3c') +
  cel('M52 56 C50 36 80 34 80 54 Z', '#9fd06e', '#6fa84a') +
  cel('M76 58 C76 44 96 44 96 58 Z', '#f2b84e', '#cf8f2a') +
  cel('M18 58 L102 58 L92 102 L28 102Z', '#dcaa68', '#b07e44', off=(-6, -6),
      extra=line('M22 72 L98 72 M25 86 L95 86', 1.8, '#8a5e30') + line('M40 58 L44 102 M60 58 L60 102 M80 58 L76 102', 1.8, '#8a5e30'))
)

# ── じょうろ ─────────────────────────────
svg('water',
  line('M34 52 C34 30 66 30 66 52', 6, LINE) + line('M34 52 C34 30 66 30 66 52', 3, '#7fb2d4') +
  cel('M68 60 L102 38 L108 46 L70 76Z', '#7fb2d4', '#5688ac', off=(-2, -3)) +
  cel('M28 50 L72 50 L76 94 L24 94Z', '#8fc0e0', '#5d8fb2', off=(-6, -5),
      hi='<path d="M34 58 L36 86" stroke="#d6ecf8" stroke-width="4" stroke-linecap="round"/>') +
  ''.join(f'<path d="M{x} {y} C{x-2} {y+6} {x-3} {y+8} {x} {y+10} C{x+3} {y+8} {x+2} {y+6} {x} {y}Z" fill="#a6d8f4" stroke="{LINE}" stroke-width="1.2"/>'
          for x, y in [(104, 54), (112, 60), (96, 66)])
)

# ── かかし ──────────────────────────────
svg('scarecrow',
  line('M58 60 L58 112', 6, LINE) + line('M58 60 L58 112', 3.4, '#a57d50') +
  line('M14 60 L104 60', 6, LINE) + line('M14 60 L104 60', 3.4, '#a57d50') +
  line('M14 60 L6 66 M14 60 L8 53 M104 60 L112 66 M104 60 L110 53', 2.4, '#d8b04a') +
  cel('M36 54 L80 54 L76 94 L40 94Z', '#55697a', '#3b4a58', off=(-5, -5),
      extra=line('M48 70 L52 74 M64 64 L68 68 M58 82 L62 86', 1.6, '#e8d6a0')) +
  cel('M43 38 C43 28 73 28 73 38 C73 48 43 48 43 38Z', '#cdb88e', '#a08a62', off=(-3, -3)) +
  cel('M30 28 C40 22 76 22 86 28 C76 33 40 33 30 28Z', '#e7c35e', '#c19a36', off=(-2, -2)) +
  cel('M44 26 C44 10 72 10 72 26Z', '#f0d276', '#c9a644', off=(-3, -3),
      extra='<rect x="40" y="20" width="36" height="5" fill="#6e3a2c"/>') +
  line('M50 36 L55 39 M55 36 L50 39 M61 36 L66 39 M66 36 L61 39', 1.6) +
  line('M51 44 L65 44 M53 42.5 L53 45.5 M57 42.5 L57 45.5 M61 42.5 L61 45.5', 1.2)
)
# ── イノシシ：黒褐色の剛毛、反り返った牙、肩の盛り上がり ──────────
svg('boar',
  line('M34 84 L32 104 M48 88 L48 105 M74 88 L76 105 M88 84 L90 103', 8, LINE) +
  line('M34 84 L32 102 M48 88 L48 103 M74 88 L76 103 M88 84 L90 101', 5, '#2a211b') +
  line('M31 104 L35 104 M46 105 L50 105 M74 105 L78 105 M88 103 L92 103', 2.6, '#121010') +
  line('M16 64 C10 62 8 70 12 74', 2.4) +
  cel('M16 72 C12 52 30 32 58 30 C72 29 84 36 92 46 L106 58 C111 62 111 70 106 74 L96 78 C88 88 62 94 40 92 C26 90 18 84 16 72Z',
      '#3b2f27', '#1f1813', off=(-6, -8),
      hi='<path d="M30 44 C42 36 58 34 72 37" stroke="#6a5544" stroke-width="3" fill="none" stroke-linecap="round"/>') +
  # 背中のたてがみ（剛毛）
  '<path d="M26 46 L30 34 L34 42 L39 28 L43 38 L49 24 L53 35 L59 23 L62 34 L68 25 L70 37 L77 30 L77 41 L84 37 L82 46 Z" fill="#1a140f" stroke="' + LINE + '" stroke-width="1.6" stroke-linejoin="round"/>' +
  line('M34 60 L40 66 M46 56 L52 62 M58 58 L64 64 M40 74 L46 80 M54 72 L60 78', 1.4, '#17110d') +
  cel('M70 40 L76 28 L82 40Z', '#3b2f27', '#1f1813', off=(-1, -2)) +
  cel('M100 60 C106 58 114 62 114 68 C114 74 106 76 100 74Z', '#5c4638', '#3a2b22', off=(-2, -2)) +
  '<circle cx="109" cy="66" r="1.3" fill="#120c08"/><circle cx="109" cy="71" r="1.3" fill="#120c08"/>' +
  # 牙
  cel('M96 74 C102 80 110 76 112 66 C108 72 104 74 99 72Z', '#efe6cf', '#c2b494', off=(-1, -1), lw=1.8) +
  eye_s(88, 52, 2.4, '#7a2e14')
)
SOIL = cel('M18 100 C24 90 96 90 102 100 C96 107 24 107 18 100Z', '#5a4330', '#3d2d20', off=(-3, -4))

# ── 小松菜：まっすぐ立つさじ形の葉の束 ──────────────
LEAF = 'M60 98 C58 80 52 62 48 46 C44 30 56 22 62 32 C66 42 63 70 62 98Z'
svg('komatsuna', SOIL + ''.join(
  cel(LEAF, '#5f9a44', '#3d6e2c', off=(-3, -4), tf=f'rotate({a} 60 98)',
      extra=line('M61 96 C60 80 58 60 55 40', 1.4, '#2f5a22'))
  for a in (-34, 30, -14, 14, 0)))

# ── トマト：支柱・葉・赤い実 ─────────────────────
def tomato_fruit(x, y, r):
    return (cel(f'M{x-r} {y} C{x-r} {y-r*1.1} {x+r} {y-r*1.1} {x+r} {y} C{x+r} {y+r*1.1} {x-r} {y+r*1.1} {x-r} {y}Z', '#c8482e', '#8f2b1a', off=(-3, -3),
                hi=f'<ellipse cx="{x-r*.35:.1f}" cy="{y-r*.4:.1f}" rx="{r*.25:.1f}" ry="{r*.15:.1f}" fill="#f2b49a"/>') +
            f'<path d="M{x-5} {y-r+1} L{x} {y-r-3} L{x+5} {y-r+1} L{x} {y-r+3}Z" fill="#4f7a34" stroke="{LINE}" stroke-width="1.2"/>')
svg('tomato', SOIL +
  line('M74 100 L74 18', 5, LINE) + line('M74 100 L74 18', 3, '#9c7a52') +
  line('M60 100 C60 80 58 60 62 30', 3.4, '#3d6e2c') +
  cel('M60 50 C46 46 34 52 30 60 C42 62 52 58 60 50Z', '#5f9a44', '#3d6e2c', off=(-2, -3)) +
  cel('M62 38 C74 30 88 34 92 42 C80 46 70 44 62 38Z', '#5f9a44', '#3d6e2c', off=(-2, -3)) +
  cel('M60 72 C72 66 86 70 90 78 C78 82 68 80 60 72Z', '#5f9a44', '#3d6e2c', off=(-2, -3)) +
  tomato_fruit(46, 70, 10) + tomato_fruit(76, 56, 9) + tomato_fruit(62, 86, 9))

# ── マルチ：黒いフィルムをかけた畝と、穴から出る芽 ─────────
svg('mulch',
  cel('M8 100 C14 92 106 92 112 100 C106 108 14 108 8 100Z', '#5a4330', '#3d2d20', off=(-3, -4)) +
  cel('M12 98 C18 66 102 66 108 98Z', '#2c2c30', '#151518', off=(-5, -6),
      hi='<path d="M24 84 C40 72 70 70 92 78" stroke="#6a6c78" stroke-width="2.4" fill="none" stroke-linecap="round"/>') +
  ''.join(f'<ellipse cx="{x}" cy="{y}" rx="6" ry="3" fill="#5a4330" stroke="{LINE}" stroke-width="1.2"/>' +
          cel(f'M{x} {y} C{x-8} {y-4} {x-10} {y-12} {x-6} {y-14} C{x-2} {y-10} {x} {y-6} {x} {y}Z', '#7fae55', '#4f7a34', off=(-1, -2), lw=1.4) +
          cel(f'M{x} {y} C{x+8} {y-4} {x+10} {y-12} {x+6} {y-14} C{x+2} {y-10} {x} {y-6} {x} {y}Z', '#7fae55', '#4f7a34', off=(-1, -2), lw=1.4)
          for x, y in [(36, 82), (60, 76), (84, 82)]))

# ── 種袋 ─────────────────────────────────
svg('seeds',
  cel('M32 42 L80 42 L86 100 L26 100Z', '#cdb68a', '#a08a62', off=(-5, -5)) +
  cel('M32 42 L80 42 L76 30 L36 30Z', '#b9a274', '#8f7a52', off=(-2, -2)) +
  '<rect x="40" y="56" width="32" height="32" fill="#efe6cf" stroke="' + LINE + '" stroke-width="1.6"/>' +
  f'<text x="56" y="80" font-size="22" font-family="serif" font-weight="700" text-anchor="middle" fill="{LINE}">種</text>' +
  ''.join(f'<ellipse cx="{x}" cy="{y}" rx="3.2" ry="2.2" fill="#7a5a36" stroke="{LINE}" stroke-width="1" transform="rotate({r} {x} {y})"/>'
          for x, y, r in [(92, 102, 20), (100, 98, -30), (96, 92, 50), (106, 104, 0), (88, 96, -10)]))

# ── 肥料の袋 ────────────────────────────────
svg('fertilizer',
  cel('M30 46 C26 36 38 30 46 38 L70 38 C78 30 90 36 86 46 L94 102 L22 102Z', '#c2ad84', '#94805c', off=(-6, -6)) +
  line('M44 40 C52 34 64 34 72 40', 2.4) +
  '<rect x="38" y="58" width="40" height="32" fill="#e7dcc0" stroke="' + LINE + '" stroke-width="1.6"/>' +
  f'<text x="58" y="82" font-size="22" font-family="serif" font-weight="700" text-anchor="middle" fill="#6e2a1c">肥</text>')

# ── 堆肥づくり：湯気の立つ堆肥の山とフォーク ─────────────
svg('compost',
  line('M88 102 L100 34', 4.6, LINE) + line('M88 102 L100 34', 2.6, '#9c7a52') +
  line('M94 36 L98 22 M100 34 L104 22 M106 36 L110 24 M94 36 L106 36', 2, '#6a6e74') +
  cel('M10 102 C20 64 42 48 58 48 C76 48 94 66 102 102Z', '#5a4330', '#3a2a1c', off=(-6, -7),
      extra=''.join(f'<path d="M{x} {y} l6 -2" stroke="#8a6a3a" stroke-width="2" stroke-linecap="round"/>' for x, y in [(30, 84), (46, 70), (62, 78), (52, 92), (76, 88), (40, 96)])) +
  line('M44 40 C38 32 48 26 42 16 M60 38 C54 28 66 22 60 12 M76 42 C70 34 80 28 74 18', 2.2, '#b9b4a8'))

# ── 果樹（柿の木） ─────────────────────────────
svg('fruittree', SOIL +
  cel('M54 100 C56 84 56 70 52 58 L66 58 C62 70 62 84 66 100Z', '#5a4330', '#3a2a1c', off=(-2, -2)) +
  cel('M18 52 C14 30 36 14 60 16 C86 14 106 32 100 54 C98 70 78 74 60 70 C40 74 20 68 18 52Z', '#4f6b3a', '#334a26', off=(-6, -7)) +
  ''.join(cel(f'M{x-6} {y} C{x-6} {y-7} {x+6} {y-7} {x+6} {y} C{x+6} {y+6} {x-6} {y+6} {x-6} {y}Z', '#d9822e', '#a45a1a', off=(-2, -2), lw=1.6)
          for x, y in [(36, 42), (58, 32), (80, 46), (48, 58), (72, 60), (88, 30)]))

# ════════ ここから：カード拡張（野菜・畜産・柑橘）の絵 ════════
def leafset(angles, d, base, shade, cx=60, cy=98, vein=True):
    return ''.join(cel(d, base, shade, off=(-3, -4), tf=f'rotate({a} {cx} {cy})',
                       extra=line('M61 96 C60 80 58 60 55 40', 1.4, '#2f5a22') if vein else '') for a in angles)

# ── 大根 ──
svg('daikon', SOIL +
  leafset((-40, -20, 20, 40), 'M60 70 C56 56 46 40 44 26 C42 14 56 10 60 22 C64 34 63 52 62 70Z', '#5f9a44', '#3d6e2c', cy=70, vein=False) +
  cel('M46 66 C44 86 54 112 60 116 C66 112 76 86 74 66 C68 62 52 62 46 66Z', '#ecebe2', '#c4c1b2', off=(-4, -3),
      hi='<path d="M52 72 C51 86 55 100 58 108" stroke="#fff" stroke-width="2.4" fill="none"/>') +
  cel('M46 66 C52 62 68 62 74 66 C70 72 50 72 46 66Z', '#a8c88a', '#7fa868', off=(-1, -1), lw=1.6))

# ── ナス ──
def eggplant(x, y, rot):
    return (cel('M0 0 C-10 10 -12 34 -2 42 C8 48 14 34 10 14 C8 6 4 0 0 0Z', '#4a2f5a', '#2a1a36', off=(-3, -3),
                hi='<path d="M-4 12 C-7 22 -6 32 -2 38" stroke="#8a6aa0" stroke-width="2.4" fill="none"/>', tf=f'translate({x} {y}) rotate({rot})') +
            cel('M-7 2 L0 -6 L7 2 L4 6 L0 2 L-4 6 Z', '#3f5f30', '#2a4220', off=(-1, -1), lw=1.4, tf=f'translate({x} {y}) rotate({rot})'))
svg('eggplant', SOIL +
  line('M60 100 C60 80 58 50 62 22', 3.4, '#3d5a2c') +
  cel('M60 40 C44 34 30 40 26 50 C40 52 52 48 60 40Z', '#4f7a3a', '#33522a', off=(-2, -3)) +
  cel('M62 30 C76 22 92 26 96 36 C82 40 70 38 62 30Z', '#4f7a3a', '#33522a', off=(-2, -3)) +
  eggplant(46, 52, 10) + eggplant(76, 46, -12))

# ── ホウレンソウ ──
svg('spinach', SOIL + leafset((-60, -30, 30, 60, -10, 12), 'M60 98 C54 86 42 72 40 60 C38 46 54 44 60 56 C64 66 63 84 62 98Z', '#3f7a34', '#2a5a22'))

# ── ビニールハウス ──
svg('greenhouse',
  cel('M6 104 L114 104 L114 110 L6 110Z', '#5a4330', '#3d2d20', off=(-1, -1)) +
  ''.join(cel(f'M{x} 104 C{x-2} 92 {x+10} 92 {x+8} 104Z', '#5f9a44', '#3d6e2c', off=(-1, -2), lw=1.4) for x in (24, 44, 64, 84)) +
  '<path d="M12 104 C12 40 108 40 108 104Z" fill="#d9e6e6" opacity=".55"/>' +
  '<path d="M30 60 C44 50 60 48 74 50" stroke="#fff" stroke-width="3" fill="none" opacity=".8" stroke-linecap="round"/>' +
  line('M12 104 C12 40 108 40 108 104', 2.8) + line('M36 104 C36 56 84 56 84 104 M60 46 L60 104', 1.6, '#6a7476'))

# ── 噴霧器（農薬散布） ──
svg('sprayer',
  cel('M30 40 C30 32 62 32 62 40 L62 96 C62 102 30 102 30 96Z', '#c9cbc4', '#9a9c94', off=(-5, -4),
      hi='<rect x="36" y="44" width="5" height="44" rx="2" fill="#f2f2ec"/>') +
  cel('M40 30 L52 30 L52 36 L40 36Z', '#5a5e64', '#3a3d42', off=(-1, -1)) +
  line('M58 90 C76 96 82 78 84 58 L100 34', 3, LINE) + line('M58 90 C76 96 82 78 84 58 L100 34', 1.6, '#7a8088') +
  ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#b9cfd6" opacity=".9"/>' for x, y, r in [(106, 26, 2.4), (110, 32, 2), (104, 18, 1.8), (112, 22, 1.6), (100, 22, 1.4)]))

# ── トラクター（管理機・トラクター） ──
svg('tractor',
  cel('M30 50 L66 50 L72 76 L96 76 L98 92 L26 92Z', '#8e3a2a', '#5e2218', off=(-5, -5),
      hi='<path d="M34 56 L62 56" stroke="#c46a50" stroke-width="3"/>') +
  cel('M44 30 L64 30 L66 50 L42 50Z', '#c9d6dc', '#9aaab2', off=(-2, -2)) +
  line('M76 76 L78 52', 3.4, LINE) +
  cel('M18 92 C18 72 50 72 50 92 C50 112 18 112 18 92Z', '#2c2a28', '#161514', off=(-3, -3), extra='<circle cx="34" cy="92" r="6" fill="#8a8a84"/>') +
  cel('M82 98 C82 88 100 88 100 98 C100 108 82 108 82 98Z', '#2c2a28', '#161514', off=(-2, -2), extra='<circle cx="91" cy="98" r="3.5" fill="#8a8a84"/>'))

# ── 子豚 ──
svg('piglet',
  line('M38 84 L37 102 M50 86 L50 102 M70 86 L70 102 M80 84 L81 101', 6.5, LINE) +
  line('M38 84 L37 100 M50 86 L50 100 M70 86 L70 100 M80 84 L81 99', 4, '#c08a80') +
  line('M24 62 C16 58 16 68 22 68 C26 68 24 62 20 64', 2) +
  cel('M28 70 C26 52 44 44 62 44 C80 44 92 54 92 68 C92 82 78 90 60 90 C42 90 30 84 28 70Z', '#d9a49a', '#b07a70', off=(-5, -6)) +
  cel('M70 46 L76 34 L84 48Z', '#d9a49a', '#b07a70', off=(-1, -2)) +
  cel('M90 60 C96 58 104 62 104 68 C104 74 96 76 90 74Z', '#e6b4aa', '#c08a80', off=(-2, -2)) +
  '<circle cx="97" cy="65" r="1.3" fill="#5a2a22"/><circle cx="97" cy="70" r="1.3" fill="#5a2a22"/>' + eye_s(80, 58, 2.2))

# ── ひよこ・鶏 ──
svg('chick',
  line('M54 92 L52 104 M66 92 L68 104', 2.4, '#c9862e') +
  cel('M36 74 C36 56 52 48 64 52 C68 40 86 40 88 54 C90 64 84 70 80 72 C82 90 70 96 58 96 C44 96 36 88 36 74Z', '#e8c24a', '#c49a2a', off=(-5, -5)) +
  cel('M88 56 L98 60 L88 64Z', '#d9862e', '#a85e1a', off=(-1, -1), lw=1.6) + eye_s(80, 54, 2.2))
svg('hen',
  line('M52 90 L50 106 M66 90 L68 106', 2.6, '#c9862e') +
  cel('M24 60 C20 46 30 40 38 52 C44 44 60 46 66 54 C70 40 90 36 92 54 C94 64 88 70 84 74 C84 92 66 98 50 96 C34 94 24 82 24 60Z', '#e9e2d0', '#bdb49c', off=(-5, -6),
      extra=line('M40 64 C48 72 58 74 66 70', 1.6, '#a49a80')) +
  cel('M76 40 C76 32 82 30 84 36 C86 30 92 32 90 40Z', '#b23a2a', '#7e2218', off=(-1, -1), lw=1.6) +
  cel('M92 52 L102 56 L92 60Z', '#d9a22e', '#a8761a', off=(-1, -1), lw=1.6) +
  cel('M88 60 C92 64 92 70 88 70 C86 66 86 62 88 60Z', '#b23a2a', '#7e2218', off=(-1, -1), lw=1.4) + eye_s(84, 50, 2.2))

# ── 飼料バケツ ──
svg('feed',
  cel('M24 50 L96 50 L88 104 L32 104Z', '#7d858c', '#555c62', off=(-6, -5),
      hi='<path d="M32 60 L38 98" stroke="#a8b0b6" stroke-width="4" stroke-linecap="round"/>') +
  cel('M24 50 C30 38 90 38 96 50 C90 56 30 56 24 50Z', '#c9a86a', '#a08548', off=(-2, -2),
      extra=''.join(f'<ellipse cx="{x}" cy="{y}" rx="3" ry="1.8" fill="#8a6a3a"/>' for x, y in [(40, 46), (56, 44), (70, 47), (84, 46), (62, 50)])) +
  line('M24 50 C20 20 100 20 96 50', 2.6, '#4a4f54'))

# ── ワクチン（注射器） ──
svg('vaccine', '<g transform="rotate(-35 60 60)">' +
  cel('M30 50 L86 50 L86 70 L30 70Z', '#e6ece9', '#b9c2be', off=(-3, -3),
      extra='<rect x="50" y="52" width="36" height="16" fill="#8fbcc6"/>' + line('M40 50 L40 56 M50 50 L50 58 M60 50 L60 56 M70 50 L70 58 M80 50 L80 56', 1.2)) +
  cel('M14 54 L30 54 L30 66 L14 66Z', '#5a5e64', '#3a3d42', off=(-1, -1)) + line('M8 52 L8 68', 3) +
  cel('M86 56 L94 56 L94 64 L86 64Z', '#5a5e64', '#3a3d42', off=(-1, -1)) + line('M94 60 L114 60', 1.8) + '</g>')

# ── 柵 ──
svg('fence',
  ''.join(cel(f'M{x} 104 L{x} 40 L{x+6} 34 L{x+12} 40 L{x+12} 104Z', '#8a6a46', '#5e462c', off=(-2, -2)) for x in (14, 54, 94)) +
  cel('M10 52 L112 48 L112 58 L10 62Z', '#9c7a52', '#6e5434', off=(-2, -2)) +
  cel('M10 78 L112 74 L112 84 L10 88Z', '#9c7a52', '#6e5434', off=(-2, -2)) +
  line('M6 106 L114 106', 2.4, '#3d5a2c'))

# ── 猟犬 ──
svg('dog',
  line('M38 82 L36 104 M50 84 L50 104 M72 84 L74 104 M82 80 L84 102', 6, LINE) +
  line('M38 82 L36 102 M50 84 L50 102 M72 84 L74 102 M82 80 L84 100', 3.6, '#a8692e') +
  cel('M26 62 C18 50 22 40 30 44 C30 52 32 58 34 62Z', '#b9773e', '#8a5228', off=(-1, -2)) +
  cel('M30 66 C30 54 50 52 66 54 C78 56 88 60 88 72 C88 84 72 88 56 88 C40 88 30 80 30 66Z', '#b9773e', '#8a5228', off=(-5, -6),
      extra='<path d="M70 70 C76 78 84 80 88 76 L88 86 L70 86Z" fill="#efe6d4"/>') +
  cel('M78 52 C80 38 98 36 104 46 L114 54 C116 58 112 62 106 62 C100 66 86 66 80 60Z', '#c08040', '#8a5228', off=(-3, -4),
      extra='<path d="M100 58 C104 62 112 62 114 56 L114 64 L100 64Z" fill="#efe6d4"/>') +
  cel('M84 44 L86 28 L96 40Z', '#b9773e', '#8a5228', off=(-1, -2)) +
  '<circle cx="114" cy="55" r="2" fill="#1c1612"/>' + eye_s(96, 48, 2.2))

# ── 軽トラ ──
svg('truck',
  cel('M10 60 L66 60 L66 90 L10 90Z', '#d8d6cc', '#a8a69c', off=(-4, -4), extra=line('M14 66 L62 66', 1.4, '#8a887e')) +
  cel('M66 40 L96 40 L110 64 L110 90 L66 90Z', '#e2e0d6', '#b0aea4', off=(-5, -5)) +
  cel('M72 46 L94 46 L104 62 L72 62Z', '#8fb0bf', '#5f8090', off=(-2, -2)) +
  ''.join(cel(f'M{x-11} 92 C{x-11} 78 {x+11} 78 {x+11} 92 C{x+11} 106 {x-11} 106 {x-11} 92Z', '#2c2a28', '#161514', off=(-2, -2),
              extra=f'<circle cx="{x}" cy="92" r="4" fill="#8a8a84"/>') for x in (28, 88)) +
  ''.join(cel(f'M{x-9} 60 C{x-9} 48 {x+9} 48 {x+9} 60Z', c, s, off=(-2, -2), lw=1.6) for x, c, s in [(24, '#d9822e', '#a45a1a'), (42, '#c9a86a', '#a08548'), (58, '#5f9a44', '#3d6e2c')]))

# ── 乾草ロール ──
svg('hay',
  cel('M14 100 C14 60 34 40 60 40 L96 40 C112 40 112 100 96 100Z', '#d8b85a', '#b0903a', off=(-4, -5)) +
  cel('M70 70 C70 48 108 48 108 70 C108 92 70 92 70 70Z', '#e2c46a', '#b8983e', off=(-2, -2),
      extra=line('M89 70 C89 64 96 64 96 70 C96 78 84 78 84 70 C84 58 100 58 100 70 C100 84 78 84 78 70', 1.4, '#8a6a2a')) +
  line('M20 60 L70 60 M16 80 L70 80', 1.4, '#9a7a32'))

# ── 柑橘の苗木と木 ──
svg('sapling', SOIL +
  line('M74 100 L74 34', 4, LINE) + line('M74 100 L74 34', 2.4, '#9c7a52') +
  line('M60 100 C60 84 60 70 60 58', 4.2, '#5a4330') +
  cel('M40 56 C38 40 52 30 62 34 C74 30 86 42 80 56 C76 66 48 68 40 56Z', '#4f7a3a', '#33522a', off=(-3, -4)))

def citrus_tree(name, fc, fs, r, fruits):
    return svg(name, SOIL +
      cel('M52 100 C54 84 54 72 50 60 L68 60 C64 72 64 84 68 100Z', '#5a4330', '#3a2a1c', off=(-2, -2)) +
      cel('M14 54 C10 30 34 12 60 14 C88 12 110 32 104 56 C102 74 80 78 60 74 C38 78 16 72 14 54Z', '#3f6a34', '#284a22', off=(-6, -7),
          hi='<ellipse cx="40" cy="30" rx="14" ry="7" fill="#5a8a46"/>') +
      ''.join(cel(f'M{x-r} {y} C{x-r} {y-r*1.15} {x+r} {y-r*1.15} {x+r} {y} C{x+r} {y+r} {x-r} {y+r} {x-r} {y}Z', fc, fs, off=(-2, -2), lw=1.6,
                  hi=f'<circle cx="{x-r*.35:.1f}" cy="{y-r*.4:.1f}" r="{r*.22:.1f}" fill="#fff" opacity=".5"/>') for x, y in fruits))
FR4 = [(34, 44), (58, 30), (82, 46), (48, 60), (74, 62), (92, 30)]
citrus_tree('mikantree', '#e0802a', '#a8561a', 6.5, FR4)
citrus_tree('lemontree', '#e8cf4a', '#b8a028', 6, FR4[:5])
citrus_tree('yuzutree', '#d6c24a', '#a89a2a', 5.5, FR4)
citrus_tree('dekopontree', '#e8902e', '#b0601a', 9, [(36, 46), (66, 34), (84, 56), (52, 62)])

# ── 剪定ばさみ ──
svg('shears',
  cel('M60 60 L96 20 L104 28 L66 66Z', '#c9d2d8', '#8f9aa2', off=(-2, -2)) +
  cel('M60 60 L100 34 L104 42 L64 66Z', '#b0bac2', '#7f8a92', off=(-2, -2)) +
  cel('M58 62 C44 72 30 88 22 102 C18 108 28 110 32 104 C40 92 52 78 64 68Z', '#a8442f', '#7e2a1c', off=(-2, -2)) +
  cel('M62 64 C56 80 52 96 52 108 C52 114 62 114 62 106 C62 94 66 80 70 70Z', '#a8442f', '#7e2a1c', off=(-2, -2)) +
  '<circle cx="62" cy="64" r="4" fill="#5a5e64" stroke="' + LINE + '" stroke-width="1.6"/>')

# ── ロケット花火 ──
svg('firework',
  line('M40 108 L64 50', 2.6, '#8a6a46') +
  cel('M58 50 L72 56 L86 22 L72 16Z', '#a8442f', '#7e2a1c', off=(-2, -2), extra=line('M64 40 L78 46 M68 30 L82 36', 1.4, '#e8c27a')) +
  cel('M72 16 L86 22 L84 10Z', '#e8c27a', '#b8923a', off=(-1, -1), lw=1.6) +
  ''.join(f'<path d="M{96} {20} L{96+dx} {20+dy}" stroke="#f0c86a" stroke-width="2.2" stroke-linecap="round"/>' for dx, dy in [(12, -6), (14, 4), (6, 14), (4, -14), (-4, -12), (16, -2)]) +
  ''.join(f'<circle cx="{x}" cy="{y}" r="1.6" fill="#f0c86a"/>' for x, y in [(112, 10), (114, 28), (104, 38)]))

# ── みかん箱 ──
svg('mikanbox',
  ''.join(cel(f'M{x-9} 52 C{x-9} 40 {x+9} 40 {x+9} 52 C{x+9} 60 {x-9} 60 {x-9} 52Z', '#e0802a', '#a8561a', off=(-2, -2), lw=1.6) for x in (34, 52, 70, 88)) +
  ''.join(cel(f'M{x-9} 46 C{x-9} 34 {x+9} 34 {x+9} 46 C{x+9} 54 {x-9} 54 {x-9} 46Z', '#e8902e', '#b0601a', off=(-2, -2), lw=1.6) for x in (43, 61, 79)) +
  cel('M16 56 L104 56 L98 104 L22 104Z', '#b48a5a', '#86643c', off=(-5, -5),
      extra=line('M18 72 L102 72 M20 88 L100 88', 1.6, '#6e5034')) +
  f'<text x="60" y="84" font-size="15" font-family="serif" font-weight="700" text-anchor="middle" fill="#4a2a14">みかん</text>')

# ── 防霜ファン ──
svg('fan',
  line('M60 110 L60 40', 5, LINE) + line('M60 110 L60 40', 3, '#7d858c') +
  cel('M50 30 L74 30 L74 46 L50 46Z', '#7d858c', '#555c62', off=(-2, -2)) +
  cel('M74 38 C90 20 104 18 108 24 C102 34 90 40 74 38Z', '#c9cbc4', '#9a9c94', off=(-2, -2)) +
  cel('M74 38 C92 46 102 58 98 64 C88 60 78 52 74 38Z', '#c9cbc4', '#9a9c94', off=(-2, -2)) +
  line('M30 70 C40 66 50 70 58 66 M24 84 C36 80 48 84 58 80', 1.8, '#b9cfd6'))

# ── 瓶（マーマレード） ──
svg('jar',
  cel('M34 44 L86 44 L90 100 C90 106 30 106 30 100Z', '#d9e2e2', '#a8b4b4', off=(-4, -4),
      extra='<path d="M34 62 L86 62 L89 100 C89 104 31 104 31 100Z" fill="#d9822e" opacity=".9"/>' +
            '<path d="M38 66 L40 96" stroke="#fff" stroke-width="3" opacity=".6"/>') +
  cel('M30 30 L90 30 L90 44 L30 44Z', '#a8442f', '#7e2a1c', off=(-2, -2),
      extra=line('M30 37 L90 37', 1.2, '#5e1a10')))

# ── 石垣 ──
STONES = [(10, 74, 28, 30), (40, 76, 30, 28), (72, 74, 38, 30), (20, 44, 34, 28), (56, 46, 30, 26), (88, 44, 24, 28), (36, 18, 30, 24), (68, 18, 32, 24)]
svg('stonewall', ''.join(
  cel(f'M{x+4} {y} L{x+w-4} {y} C{x+w} {y} {x+w} {y+4} {x+w} {y+8} L{x+w} {y+h-6} C{x+w} {y+h} {x+w-4} {y+h} {x+w-8} {y+h} L{x+6} {y+h} C{x} {y+h} {x} {y+h-4} {x} {y+h-8} L{x} {y+6} C{x} {y+2} {x+2} {y} {x+4} {y}Z',
      '#9a9a8e', '#6e6e64', off=(-3, -3), extra=f'<ellipse cx="{x+w*.35}" cy="{y+h*.3}" rx="{w*.15}" ry="2" fill="#5f7a3a" opacity=".7"/>') for x, y, w, h in STONES))

# ── カウベル ──
svg('cowbell',
  line('M40 20 C40 6 80 6 80 20', 4, '#6e3a22') +
  cel('M42 26 L78 26 L92 92 L28 92Z', '#b8923a', '#86641e', off=(-5, -5),
      hi='<path d="M48 34 L40 84" stroke="#e8c87a" stroke-width="3" stroke-linecap="round"/>') +
  cel('M52 92 C52 104 68 104 68 92Z', '#5a5e64', '#3a3d42', off=(-1, -1)))

# ════════ 農家（戦闘で左に立つ主人公）════════
# 右を向いて立つ。菅笠・野良着・脚絆。タイプごとに道具と色が違う
def svg_tall(name, body):
    s = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 170" width="120" height="170">\n'
         f'<!-- {name}：アニメ塗り（tools/gen_art.py で生成） -->\n'
         '<defs><filter id="mute"><feColorMatrix type="saturate" values=".78"/></filter></defs>\n'
         f'<g filter="url(#mute)">{body}</g>\n</svg>\n')
    open(os.path.join(OUT, name + '.svg'), 'w').write(s)

SKIN, SKIN_S = '#d4a982', '#a97e5c'

def farmer(name, cloth, cloth_s, scarf, back='', tool='', front_tool=''):
    body = '<ellipse cx="60" cy="163" rx="30" ry="5" fill="#000" opacity=".3"/>'
    body += back
    # 脚（奥・手前）。脚絆は白っぽく巻く
    body += cel('M48 108 L44 150 L54 151 L58 110Z', '#3a3a40', '#26262c', off=(-2, -2))
    body += cel('M62 108 L66 150 L76 151 L72 108Z', '#45454c', '#2c2c32', off=(-2, -2),
                extra=line('M65 128 L74 127 M65 134 L75 133 M66 140 L75 139', 1.3, '#b9b4a4'))
    body += cel('M42 150 L56 150 L58 157 L40 157Z', '#8a6a46', '#5e462c', off=(-1, -1), lw=1.8)
    body += cel('M64 150 L78 150 L82 157 L62 157Z', '#8a6a46', '#5e462c', off=(-1, -1), lw=1.8)
    # 奥の腕
    body += cel('M44 62 C36 74 36 88 40 98 L47 96 C44 86 46 74 50 66Z', cloth_s, '#1c2030', off=(-1, -1))
    # 胴（野良着）と帯
    body += cel('M42 56 C34 72 34 96 38 112 L80 112 C84 96 84 72 76 56 C66 50 52 50 42 56Z', cloth, cloth_s, off=(-6, -4),
                extra=line('M58 56 L66 84', 1.6, '#1c2030') + '<rect x="36" y="90" width="48" height="8" fill="#6e4a2c"/>' + line('M36 98 L84 98', 1.2, LINE))
    # 首の手ぬぐい
    body += cel('M48 52 C54 56 66 56 72 52 L72 58 C66 62 54 62 48 58Z', scarf, '#8a8478', off=(-1, -1), lw=1.6)
    # 頭（横顔）
    body += cel('M50 40 C50 28 72 26 74 38 C76 44 74 50 70 54 C64 58 54 56 50 50Z', SKIN, SKIN_S, off=(-3, -2))
    body += f'<circle cx="68" cy="42" r="1.8" fill="{LINE}"/>' + line('M66 38 L71 37', 1.4) + line('M69 50 L73 49', 1.2, '#7a5a40')
    # 菅笠（円すい形の笠）
    body += cel('M24 36 L60 12 L96 34 C80 40 40 42 24 36Z', '#c9a86a', '#9c8048', off=(-3, -3),
                extra=line('M60 14 L40 38 M60 14 L52 40 M60 14 L68 40 M60 14 L80 38', 1.1, '#8a6e3a'))
    body += line('M54 40 L56 52 M66 40 L66 52', 1, '#5a4636')
    body += tool
    # 手前の腕（道具を持つ）
    body += cel('M70 62 C80 70 86 78 90 86 L84 90 C80 82 74 76 66 70Z', cloth, cloth_s, off=(-2, -2))
    body += cel('M84 84 C88 82 94 84 94 90 C92 94 86 94 84 90Z', SKIN, SKIN_S, off=(-1, -1), lw=1.8)
    body += front_tool
    svg_tall(name, body)

# 野菜農家：藍の野良着、鍬
farmer('farmer_vegetable', '#3f4a62', '#2a3246', '#e6e0d0',
  tool=line('M100 30 L88 132', 5, LINE) + line('M100 30 L88 132', 3, '#a07a4a') +
       cel('M80 128 L100 132 L98 144 L78 140Z', '#7d858c', '#555c62', off=(-1, -1), lw=1.8))
# 畜産農家：茶の野良着、牛追い棒と縄
farmer('farmer_livestock', '#5a4632', '#3c2e20', '#c9b48a',
  back=line('M30 70 C20 90 26 110 36 118', 3, '#8a6a3a') + line('M30 70 C24 84 26 100 32 110', 1.4, '#b8964e'),
  tool=line('M106 18 L84 150', 4.4, LINE) + line('M106 18 L84 150', 2.6, '#8a6a46'))
# 柑橘農家：苔色の野良着、背負い籠、剪定ばさみ
farmer('farmer_citrus', '#4a5a3a', '#323e26', '#e6e0d0',
  back=cel('M18 54 L44 52 L42 104 L22 106Z', '#b48a5a', '#86643c', off=(-3, -3),
           extra=line('M20 66 L44 64 M20 78 L44 76 M21 90 L43 88', 1.4, '#6e5034') +
           ''.join(f'<circle cx="{x}" cy="{y}" r="5" fill="#e0802a" stroke="{LINE}" stroke-width="1.2"/>' for x, y in [(26, 52), (36, 50)])),
  front_tool=cel('M92 86 L110 74 L112 78 L94 92Z', '#c9d2d8', '#8f9aa2', off=(-1, -1), lw=1.6) +
             cel('M92 88 L108 84 L108 88 L94 92Z', '#a8442f', '#7e2a1c', off=(-1, -1), lw=1.4))
print('ok')
