# 背景（深い山と森・霧）を描き込んだ1枚の SVG を生成する — シリアスなタッチ用
# 使い方: python3 tools/gen_bg_forest.py assets/img/bg/forest.svg
# 夕方の光・重なる山並み（稜線に針葉樹のぎざぎざ）・山あいの霧・手前の巨木・森を切り開いた畑
import sys, random, math

out = sys.argv[1]
R = random.Random(7)
W, H = 600, 1000

o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">',
     '<!-- 深い山と森の背景（tools/gen_bg_forest.py で生成） -->']
o.append('''<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#243443"/><stop offset=".3" stop-color="#4f6470"/>
    <stop offset=".5" stop-color="#b8a988"/><stop offset=".6" stop-color="#e9c98e"/>
  </linearGradient>
  <radialGradient id="sun" cx="72%" cy="52%" r="45%">
    <stop offset="0" stop-color="#fff0c4" stop-opacity=".95"/><stop offset=".35" stop-color="#f3d496" stop-opacity=".45"/><stop offset="1" stop-color="#f3d496" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3f5a34"/><stop offset=".5" stop-color="#2f4528"/><stop offset="1" stop-color="#1c2a19"/>
  </linearGradient>
  <linearGradient id="trunk" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#0e0b09"/><stop offset=".5" stop-color="#211913"/><stop offset=".78" stop-color="#3d3024"/><stop offset="1" stop-color="#17120e"/>
  </linearGradient>
  <filter id="mist" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="blur2"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="cloud" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3.5"/></filter>
  <!-- 絵の具のムラ -->
  <filter id="paint" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".01 .025" numOctaves="4" seed="9" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 .1  0 0 0 0 .08  0 0 0 0 .05  0 0 0 .35 -.08"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
</defs>''')

o.append(f'<rect width="{W}" height="{H}" fill="url(#sky)"/>')
o.append(f'<rect width="{W}" height="{H}" fill="url(#sun)"/>')

# ── 雲：横に長い層雲。上は暗く、下のふちが夕日で金色に光る ──
def stratus(cx, cy, w, h):
    g = []
    for i in range(22):
        x = cx + R.uniform(-w / 2, w / 2); y = cy + R.uniform(-h / 2, h / 2)
        rx = R.uniform(w * .12, w * .28); ry = R.uniform(h * .3, h * .6)
        g.append((x, y, rx, ry))
    s = '<g filter="url(#cloud)">'
    for x, y, rx, ry in g:  # 金色のふち（少し下にずらす）
        s += f'<ellipse cx="{x:.0f}" cy="{y+ry*.35:.0f}" rx="{rx:.0f}" ry="{ry:.0f}" fill="#f0c784" opacity=".85"/>'
    for x, y, rx, ry in g:  # 雲の体（暗い青灰）
        s += f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rx*.97:.0f}" ry="{ry*.9:.0f}" fill="#5d6c76"/>'
    for x, y, rx, ry in g:  # 上の暗い面
        s += f'<ellipse cx="{x-rx*.1:.0f}" cy="{y-ry*.3:.0f}" rx="{rx*.8:.0f}" ry="{ry*.5:.0f}" fill="#46535e"/>'
    return s + '</g>'
o.append(stratus(160, 150, 360, 50))
o.append(stratus(470, 260, 300, 40))
o.append(stratus(250, 360, 420, 30))

# ── 山並み：稜線に針葉樹のぎざぎざ。遠いほど空の色に溶ける ──
def ridge(base, amp, freq, color, seed, tree=6, treeH=9):
    rr = random.Random(seed)
    pts = []
    x = -10
    while x <= W + 10:
        y = base - (math.sin(x * freq + seed) * .6 + math.sin(x * freq * 2.3 + seed * 2) * .4) * amp
        if tree:
            pts.append((x, y))
            pts.append((x + tree / 2, y - treeH * rr.uniform(.6, 1.3)))  # 木のとがり
            x += tree
        else:
            pts.append((x, y)); x += 8
    d = f'M-10 {H} ' + ' '.join(f'L{x:.1f} {y:.1f}' for x, y in pts) + f' L{W+10} {H} Z'
    return f'<path d="{d}" fill="{color}"/>'

def mistband(y, h, op):
    return f'<rect x="-60" y="{y}" width="{W+120}" height="{h}" fill="#e8e2cf" opacity="{op}" filter="url(#mist)"/>'

o.append(ridge(500, 70, .008, '#8b9a9c', 1, tree=0))           # いちばん遠い峰（木なし）
o.append(mistband(520, 40, .55))
o.append(ridge(560, 50, .012, '#6a7d78', 2, tree=5, treeH=6))
o.append(mistband(585, 36, .5))
o.append(ridge(615, 40, .015, '#4a5f50', 3, tree=6, treeH=9))
o.append(mistband(640, 30, .4))
o.append(ridge(670, 30, .02, '#33473a', 4, tree=7, treeH=13))
o.append(mistband(690, 24, .3))
o.append(ridge(720, 20, .025, '#25352b', 5, tree=8, treeH=18))

# ── 森を切り開いた畑（手前） ──
FY = 735
o.append(f'<rect x="0" y="{FY}" width="{W}" height="{H-FY}" fill="url(#ground)"/>')
for i in range(-10, 11):  # 畝
    o.append(f'<path d="M{300 + i*10} {FY} L{300 + i*80} {H}" stroke="#24361f" stroke-width="{1.5+abs(i)*.25:.1f}" opacity=".6"/>')
for _ in range(220):  # 作物の葉・草
    y = R.uniform(FY + 6, H); t = (y - FY) / (H - FY); x = R.uniform(-30, W + 30); r = .8 + t * 3
    c = R.choice(['#5b7b3f', '#4d6b36', '#6f8f4a'])
    o.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{r*1.5:.1f}" ry="{r:.1f}" fill="{c}"/>')
# 夕日の当たる側をうっすら金色に
o.append(f'<rect x="0" y="{FY}" width="{W}" height="{H-FY}" fill="#f0c784" opacity=".08"/>')

# ── 手前の巨木（左右で画面を囲む）：幹・苔・垂れる枝 ──
def bigtree(x, w, lean):
    # 根元は広がり、上へ行くほど細くなる杉の巨木
    s = (f'<path d="M{x-w*1.1} {H} C{x-w*.55} {H-40} {x-w*.45+lean*.2} {H-140} {x-w*.4+lean*.3} 600 '
         f'C{x-w*.35+lean*.6} 400 {x-w*.3+lean} 200 {x-w*.26+lean} -10 L{x+w*.26+lean} -10 '
         f'C{x+w*.3+lean} 200 {x+w*.35+lean*.6} 400 {x+w*.4+lean*.3} 600 '
         f'C{x+w*.45+lean*.2} {H-140} {x+w*.55} {H-40} {x+w*1.1} {H} Z" fill="url(#trunk)"/>')
    # 樹皮のすじ（縦に長く）
    for k in range(7):
        ox = (k - 3) * w / 9
        s += f'<path d="M{x+ox*1.6} {H} C{x+ox+lean*.3} 600 {x+ox*.75+lean} 300 {x+ox*.6+lean} -10" stroke="#060504" stroke-width="1.4" fill="none" opacity=".6"/>'
    # 苔：幹の光の当たる側に、縦長のかすれ
    for _ in range(26):
        yy = R.uniform(380, H - 20); f = (H - yy) / H
        cx = x + lean * f + w * R.uniform(.05, .3)
        s += f'<path d="M{cx:.0f} {yy:.0f} q{R.uniform(-2,2):.1f} {R.uniform(10,30):.0f} {R.uniform(-1,1):.1f} {R.uniform(20,50):.0f}" stroke="{R.choice(["#3f5a2b","#4e6b33","#2f4422"])}" stroke-width="{R.uniform(2,5):.1f}" stroke-linecap="round" opacity=".75"/>'
    return s
o.append(bigtree(16, 64, 6))
o.append(bigtree(590, 76, -8))

# 上から垂れる杉の枝葉：垂れ下がる線にそって、暗い葉のかたまりを重ねる
def bough(x0, y0, dirx, length, droop):
    s = ''
    n = int(length / 7)
    for i in range(n):
        t = i / n
        x = x0 + dirx * length * t
        y = y0 + droop * t * t
        for _ in range(5):
            rx = R.uniform(14, 26) * (1 - t * .45); ry = rx * R.uniform(.35, .55)
            s += f'<ellipse cx="{x+R.uniform(-10,10):.0f}" cy="{y+R.uniform(0,26)*(1-t*.3):.0f}" rx="{rx:.0f}" ry="{ry:.0f}" fill="{R.choice(["#0f1711","#152018","#1b281d"])}" transform="rotate({R.uniform(-25,25):.0f} {x:.0f} {y:.0f})"/>'
        if R.random() < .5:  # 光の当たる葉先
            s += f'<ellipse cx="{x+R.uniform(-3,3):.0f}" cy="{y-2:.0f}" rx="5" ry="1.8" fill="#4d5e36" opacity=".8"/>'
    return s
o.append(bough(20, 10, 1, 230, 60))
o.append(bough(10, 120, 1, 140, 40))
o.append(bough(585, 30, -1, 250, 70))
o.append(bough(590, 160, -1, 130, 40))

# 手前の草のシルエット
for _ in range(70):
    x = R.uniform(-10, W + 10); h = R.uniform(20, 70); lean = R.uniform(-18, 18)
    o.append(f'<path d="M{x-4:.0f} {H} Q{x+lean*.4:.0f} {H-h*.6:.0f} {x+lean:.0f} {H-h:.0f} Q{x+lean*.3+3:.0f} {H-h*.5:.0f} {x+5:.0f} {H}Z" fill="{R.choice(["#141f12","#1c2a19","#22331d"])}"/>')

# 光の筋（右上から霧を抜けて差しこむ）
for x1, w1, op in [(470, 40, .10), (400, 26, .08), (540, 60, .07)]:
    o.append(f'<path d="M{x1} 0 L{x1+w1} 0 L{x1-260+w1*2} {H} L{x1-260} {H}Z" fill="#fff1c8" opacity="{op}" filter="url(#blur2)"/>')
o.append(f'<rect width="{W}" height="{H}" fill="#000" filter="url(#paint)"/>')
o.append('</svg>')
open(out, 'w').write('\n'.join(o))
print('ok', out)
