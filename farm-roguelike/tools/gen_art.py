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
print('ok')
