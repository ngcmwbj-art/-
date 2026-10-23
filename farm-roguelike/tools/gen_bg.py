# 背景（里山の風景）を描き込んだ1枚の SVG を生成する
# 使い方: python3 tools/gen_bg.py assets/img/bg/spring.svg [季節]
# 入道雲・青い山・木の茂み・茅葺きの家・畑・手前の草を、乱数で並べて描き込む
import sys, random, math

out = sys.argv[1]
season = sys.argv[2] if len(sys.argv) > 2 else 'summer'
R = random.Random(42)
W, H = 600, 1000
D = 90  # 地平線を下げる量（畑が操作パネルの後ろに隠れすぎないように）

# 季節ごとの色（空の上・空の地平・森の影・森・森の光・畑）
PAL = {
  'summer': dict(sky0='#1f6fbf', sky1='#5fa9e0', sky2='#d4ecf1', far='#7ea6c8', farS='#9dbcd6',
                 tree0='#24563a', tree1='#3f7f45', tree2='#6aa84f', tree3='#a6d06a',
                 field='#76b84a', fieldS='#5c9a3a', path='#d8c08c'),
  'spring': dict(sky0='#3f86c9', sky1='#8cc3e6', sky2='#f3e6ea', far='#8fb0cc', farS='#b2c8dc',
                 tree0='#2d5e40', tree1='#4f8f52', tree2='#86bf62', tree3='#c8e294',
                 field='#8cc65a', fieldS='#6aa646', path='#dcc79a'),
}[season]

o = []
o.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">')
o.append('<!-- 里山の背景（tools/gen_bg.py で生成） -->')
o.append(f'''<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{PAL['sky0']}"/><stop offset=".42" stop-color="{PAL['sky1']}"/><stop offset=".62" stop-color="{PAL['sky2']}"/>
  </linearGradient>
  <radialGradient id="sun" cx="85%" cy="8%" r="55%">
    <stop offset="0" stop-color="#fffbe0" stop-opacity=".9"/><stop offset="1" stop-color="#fffbe0" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="field" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{PAL['fieldS']}"/><stop offset=".35" stop-color="{PAL['field']}"/><stop offset="1" stop-color="{PAL['fieldS']}"/>
  </linearGradient>
  <!-- 絵の具のムラ（うっすら） -->
  <filter id="paint" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".012 .03" numOctaves="4" seed="4" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 .9  0 0 0 .22 -.04"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <filter id="soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.4"/></filter>
</defs>''')

# ── 空 ──
o.append(f'<rect width="{W}" height="{H}" fill="url(#sky)"/>')
o.append(f'<rect width="{W}" height="{H}" fill="url(#sun)"/>')

# ── 入道雲：影の玉を描いてから、左上にずらした光の玉を重ねる ──
CLOUD_ID = [0]
def cumulus(cx, base, width, height, n, scale=1.0):
    # 底を平らに切るためのクリップ
    CLOUD_ID[0] += 1
    cid = f'cb{CLOUD_ID[0]}'
    puffs = []
    for i in range(n):
        t = R.random()
        x = cx + (t - .5) * width * (1 - .25 * R.random())
        # 中央ほど高く（山型）
        top = base - height * max(.12, 1 - abs(t - .5) * 1.7) * (.6 + .4 * R.random())
        y = R.uniform(top, base)
        r = R.uniform(16, 34) * scale * (1.35 - (base - y) / height * .6)
        puffs.append((x, y, r))
    puffs.sort(key=lambda p: -p[1])  # 下の玉から
    g = [f'<clipPath id="{cid}"><rect x="0" y="0" width="{W}" height="{base}"/></clipPath>',
         f'<g clip-path="url(#{cid})" filter="url(#soft)">']
    # 影（青紫）→ 中間 → 光（白）。光は左上に寄せて、右下に影が残るように
    for x, y, r in puffs:
        g.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="#9aa9c8"/>')
    for x, y, r in puffs:
        g.append(f'<circle cx="{x-r*.14:.1f}" cy="{y-r*.2:.1f}" r="{r*.9:.1f}" fill="#d9dfec"/>')
    for x, y, r in puffs:
        g.append(f'<circle cx="{x-r*.26:.1f}" cy="{y-r*.36:.1f}" r="{r*.7:.1f}" fill="#fbfcff"/>')
    g.append('</g>')
    # 底のにじみ（地平線側に溶ける）
    g.append(f'<ellipse cx="{cx}" cy="{base}" rx="{width*.52:.0f}" ry="7" fill="#b7c3da" opacity=".7" filter="url(#soft)"/>')
    return '\n'.join(g)

o.append(cumulus(300, 560 + D, 520, 460, 150))
o.append(cumulus(60, 500 + D, 170, 90, 26, .6))
o.append(cumulus(560, 330 + D, 110, 50, 16, .5))
# 小さなちぎれ雲
for x, y in [(120, 120), (430, 90), (250, 200)]:
    o.append(f'<ellipse cx="{x}" cy="{y}" rx="34" ry="7" fill="#fff" opacity=".75"/><ellipse cx="{x+20}" cy="{y-5}" rx="20" ry="6" fill="#fff" opacity=".85"/>')

# ── 遠い山（空気で青く） ──
def ridge(y0, amp, color, step=20, seed=0):
    rr = random.Random(seed)
    pts = [(0, H)]
    y = y0
    for x in range(0, W + step, step):
        y = y0 + math.sin(x / 90 + seed) * amp + rr.uniform(-amp * .4, amp * .4)
        pts.append((x, y))
    pts.append((W, H))
    return '<path d="M' + ' L'.join(f'{x:.0f} {y:.0f}' for x, y in pts) + f'Z" fill="{color}"/>'
o.append(ridge(560 + D, 22, PAL['farS'], seed=1))
o.append(ridge(585 + D, 16, PAL['far'], seed=2))

# ── 木の茂み：濃い影→中間→光→点の光、の4段で描く ──
def clump(x, y, size):
    g = []
    blobs = [(x + R.uniform(-size, size), y + R.uniform(-size * .6, size * .3), R.uniform(size * .45, size * .8)) for _ in range(7)]
    for bx, by, br in blobs:
        g.append(f'<circle cx="{bx:.1f}" cy="{by:.1f}" r="{br:.1f}" fill="{PAL["tree0"]}"/>')
    for bx, by, br in blobs:
        g.append(f'<circle cx="{bx-br*.15:.1f}" cy="{by-br*.2:.1f}" r="{br*.78:.1f}" fill="{PAL["tree1"]}"/>')
    for bx, by, br in blobs:
        if R.random() < .7:
            g.append(f'<circle cx="{bx-br*.3:.1f}" cy="{by-br*.38:.1f}" r="{br*.45:.1f}" fill="{PAL["tree2"]}"/>')
    for _ in range(5):
        bx, by, br = R.choice(blobs)
        g.append(f'<circle cx="{bx-br*.4+R.uniform(-3,3):.1f}" cy="{by-br*.55+R.uniform(-3,3):.1f}" r="{R.uniform(1.5,3.5):.1f}" fill="{PAL["tree3"]}"/>')
    return ''.join(g)

# 森の帯（奥→手前）
for row, (yy, sz) in enumerate([(615 + D, 16), (640 + D, 22)]):
    o.append(f'<rect x="0" y="{yy}" width="{W}" height="60" fill="{PAL["tree0"]}"/>')
    x = -20
    while x < W + 20:
        o.append(clump(x, yy + R.uniform(-6, 8), sz * R.uniform(.8, 1.3)))
        x += sz * R.uniform(1.2, 1.8)

# ── 茅葺きの家 ──
hx, hy = 430, 664 + D
o.append(f'''<g>
  <rect x="{hx-34}" y="{hy-8}" width="68" height="30" fill="#efe7d4"/>
  <rect x="{hx-34}" y="{hy+8}" width="68" height="14" fill="#cdbd9c"/>
  <rect x="{hx-10}" y="{hy-2}" width="20" height="24" fill="#5a4636"/>
  <path d="M{hx-50} {hy-6} L{hx-18} {hy-46} L{hx+18} {hy-46} L{hx+50} {hy-6} Z" fill="#b8955a"/>
  <path d="M{hx-50} {hy-6} L{hx-18} {hy-46} L{hx} {hy-46} L{hx-24} {hy-6} Z" fill="#cfae6c"/>
  <path d="M{hx-18} {hy-46} L{hx+18} {hy-46} L{hx+14} {hy-52} L{hx-14} {hy-52} Z" fill="#6e5636"/>
  <path d="M{hx-50} {hy-6} L{hx+50} {hy-6}" stroke="#7a6038" stroke-width="3"/>
  <path d="M{hx-44} {hy-14} L{hx+44} {hy-14} M{hx-36} {hy-24} L{hx+36} {hy-24} M{hx-28} {hy-34} L{hx+28} {hy-34}" stroke="#8f7442" stroke-width="1.2" opacity=".7"/>
</g>''')
# 家の手前の茂み
for x in (378, 395, 470, 488):
    o.append(clump(x, 684 + D, 12))

# ── 畑：遠近のついた畝 ──
FY = 690 + D
o.append(f'<rect x="0" y="{FY}" width="{W}" height="{H-FY}" fill="url(#field)"/>')
vx = 300  # 消失点
for i in range(-14, 15):
    x2 = vx + i * 70
    o.append(f'<path d="M{vx + i*8} {FY} L{x2} {H}" stroke="{PAL["fieldS"]}" stroke-width="{2 + abs(i)*.2:.1f}" opacity=".55"/>')
# 畝の上の作物の点々
for _ in range(260):
    y = R.uniform(FY + 10, H)
    t = (y - FY) / (H - FY)
    x = R.uniform(-50, W + 50)
    r = .8 + t * 3.2
    o.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{r*1.4:.1f}" ry="{r:.1f}" fill="{PAL["tree2"]}" opacity=".9"/>')
# あぜ道
o.append(f'<path d="M272 {FY} C290 {FY+50} 220 {FY+120} 170 {H} L250 {H} C290 {FY+120} 320 {FY+50} 288 {FY} Z" fill="{PAL["path"]}"/>')
o.append(f'<path d="M280 {FY+8} C296 {FY+60} 240 {FY+130} 208 {H}" stroke="#bfa774" stroke-width="2" fill="none" opacity=".7"/>')
# 木の杭と電柱（里山らしさ）
o.append(f'<g stroke="#5a4636" stroke-width="3"><path d="M520 {650+D} L520 {720+D}"/><path d="M506 {660+D} L534 {660+D}"/></g>')
o.append(f'<path d="M520 {662+D} C560 {670+D} 600 {666+D} 640 {660+D}" stroke="#3d3a38" stroke-width="1" fill="none"/>')

# ── 手前の草（暗め・大きめ） ──
for _ in range(90):
    x = R.uniform(-10, W + 10)
    h = R.uniform(20, 60)
    lean = R.uniform(-20, 20)
    c = R.choice([PAL['tree0'], PAL['tree1'], PAL['fieldS']])
    o.append(f'<path d="M{x-4:.0f} {H} Q{x+lean*.4:.0f} {H-h*.6:.0f} {x+lean:.0f} {H-h:.0f} Q{x+lean*.3+3:.0f} {H-h*.5:.0f} {x+5:.0f} {H}Z" fill="{c}"/>')

# 絵の具のムラ・光の筋
o.append(f'<rect width="{W}" height="{H}" fill="#fff" filter="url(#paint)"/>')
o.append(f'<path d="M600 0 L380 0 L120 1000 L330 1000Z" fill="#fff8d8" opacity=".08"/>')
o.append('</svg>')
open(out, 'w').write('\n'.join(o))
print('ok', out)
