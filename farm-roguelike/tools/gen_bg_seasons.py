# 季節の背景（秋の棚田・冬の雪の山里）を描き込んだ SVG を生成する — シリアスなタッチ
# 使い方: python3 tools/gen_bg_seasons.py assets/img/bg/autumn.svg autumn
#         python3 tools/gen_bg_seasons.py assets/img/bg/winter.svg winter
# 構図は forest.svg とそろえる（地面の線＝畑の上端が y≈735 / 1000）
import sys, random, math

out, season = sys.argv[1], sys.argv[2]
R = random.Random(11 if season == 'autumn' else 23)
W, H = 1600, 1000   # 横に広く描く（横長の画面では上下、縦長の画面では左右が切れる）
X = W / 600         # 元の 600 幅で決めた位置を広げる倍率
FY = 735

P = {
  'autumn': dict(sky=['#2a2234', '#6a3e3a', '#c46a3a', '#f0b25a'], sun=('#ffe2a0', '72%', '58%'),
                 cloud=('#4a3440', '#6a4448', '#f2a05a'),
                 ridges=['#8a6a6a', '#6e4e4e', '#553a38', '#3e2a28', '#2a1c1a'], mist='#f0c890',
                 tree=['#3a1a12', '#7a2e1a', '#b8481e', '#e0803a'], ground=['#8a6a2a', '#5e4418', '#2e2010'],
                 crop='#d8a83a', crop2='#b88a2a'),
  'winter': dict(sky=['#1e2834', '#3e4e5e', '#8a9aa6', '#c8d0d4'], sun=('#f0f4f6', '30%', '50%'),
                 cloud=('#5e6a76', '#7a8692', '#c8d2d8'),
                 ridges=['#a8b4bc', '#8a98a2', '#6e7c86', '#55626c', '#3e4a52'], mist='#e8eef0',
                 tree=['#1a2420', '#2a3a32', '#46564e', '#e8eef0'], ground=['#dfe6e8', '#c4ced2', '#9aa6ac'],
                 crop='#f4f8f8', crop2='#b8c4c8'),
}[season]

o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">',
     f'<!-- {season}：季節の背景（tools/gen_bg_seasons.py で生成） -->']
sky = P['sky']
o.append(f'''<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{sky[0]}"/><stop offset=".3" stop-color="{sky[1]}"/><stop offset=".55" stop-color="{sky[2]}"/><stop offset=".7" stop-color="{sky[3]}"/>
  </linearGradient>
  <radialGradient id="sun" cx="{P['sun'][1]}" cy="{P['sun'][2]}" r="50%">
    <stop offset="0" stop-color="{P['sun'][0]}" stop-opacity=".95"/><stop offset=".3" stop-color="{P['sun'][0]}" stop-opacity=".35"/><stop offset="1" stop-color="{P['sun'][0]}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{P['ground'][0]}"/><stop offset=".5" stop-color="{P['ground'][1]}"/><stop offset="1" stop-color="{P['ground'][2]}"/>
  </linearGradient>
  <filter id="mist" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="blur2"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="cloud" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3.5"/></filter>
  <filter id="paint" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".01 .025" numOctaves="4" seed="5" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 .1  0 0 0 0 .08  0 0 0 0 .05  0 0 0 .3 -.08"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
</defs>''')
o.append(f'<rect width="{W}" height="{H}" fill="url(#sky)"/>')
o.append(f'<rect width="{W}" height="{H}" fill="url(#sun)"/>')

# 層雲（下のふちが光る）
def stratus(cx, cy, w, h):
    g = [(cx + R.uniform(-w / 2, w / 2), cy + R.uniform(-h / 2, h / 2), R.uniform(w * .12, w * .28), R.uniform(h * .3, h * .6)) for _ in range(22)]
    s = '<g filter="url(#cloud)">'
    for x, y, rx, ry in g: s += f'<ellipse cx="{x:.0f}" cy="{y+ry*.35:.0f}" rx="{rx:.0f}" ry="{ry:.0f}" fill="{P["cloud"][2]}" opacity=".8"/>'
    for x, y, rx, ry in g: s += f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rx*.97:.0f}" ry="{ry*.9:.0f}" fill="{P["cloud"][1]}"/>'
    for x, y, rx, ry in g: s += f'<ellipse cx="{x-rx*.1:.0f}" cy="{y-ry*.3:.0f}" rx="{rx*.8:.0f}" ry="{ry*.5:.0f}" fill="{P["cloud"][0]}"/>'
    return s + '</g>'
o.append(stratus(400, 150, 800, 50)); o.append(stratus(1200, 250, 700, 40)); o.append(stratus(700, 370, 1000, 28))

# 雪（冬）：空に舞う雪
if season == 'winter':
    for _ in range(600):
        o.append(f'<circle cx="{R.uniform(0, W):.0f}" cy="{R.uniform(0, H):.0f}" r="{R.uniform(.6, 2.4):.1f}" fill="#f4f8fa" opacity="{R.uniform(.4, .9):.2f}"/>')
# 渡り鳥（秋）
if season == 'autumn':
    for x, y, s in [(960, 300, 1), (980, 290, .8), (998, 304, .9), (1020, 296, .7), (940, 312, .7)]:
        o.append(f'<path d="M{x-6*s:.0f} {y} q{3*s:.1f} -{4*s:.1f} {6*s:.1f} 0 q{3*s:.1f} -{4*s:.1f} {6*s:.1f} 0" stroke="#2a1a1a" stroke-width="1.4" fill="none"/>')

def ridge(base, amp, freq, color, seed, tree=6, treeH=9, snowcap=False):
    rr = random.Random(seed); pts = []; x = -10
    while x <= W + 10:
        y = base - (math.sin(x * freq + seed) * .6 + math.sin(x * freq * 2.3 + seed * 2) * .4) * amp
        if tree:
            pts.append((x, y)); pts.append((x + tree / 2, y - treeH * rr.uniform(.6, 1.3))); x += tree
        else:
            pts.append((x, y)); x += 8
    d = f'M-10 {H} ' + ' '.join(f'L{x:.1f} {y:.1f}' for x, y in pts) + f' L{W+10} {H} Z'
    s = f'<path d="{d}" fill="{color}"/>'
    if False:  # 稜線の雪の線（いまは使わない：電線のように見えるため）
        s += '<path d="M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + '" stroke="#f0f4f6" stroke-width="3" fill="none" opacity=".75"/>'
    return s
def mistband(y, h, op):
    return f'<rect x="-60" y="{y}" width="{W+120}" height="{h}" fill="{P["mist"]}" opacity="{op}" filter="url(#mist)"/>'

rg = P['ridges']; snow = season == 'winter'
o.append(ridge(500, 80, .007, rg[0], 1, tree=0, snowcap=snow)); o.append(mistband(520, 40, .5))
o.append(ridge(560, 50, .012, rg[1], 2, tree=5, treeH=6, snowcap=snow)); o.append(mistband(585, 36, .45))
o.append(ridge(615, 40, .015, rg[2], 3, tree=6, treeH=9, snowcap=snow)); o.append(mistband(640, 30, .35))
o.append(ridge(670, 30, .02, rg[3], 4, tree=7, treeH=13, snowcap=snow)); o.append(mistband(690, 24, .3))
o.append(ridge(715, 18, .025, rg[4], 5, tree=8, treeH=18, snowcap=snow))

# 遠くの集落（茅葺き屋根と、夕方は灯り・冬は煙）
def house(x, y, s):
    roof = '#5a3a22' if season == 'autumn' else '#eef2f4'
    wall = '#2a1e16' if season == 'autumn' else '#3a3a3a'
    h = f'<rect x="{x-9*s:.1f}" y="{y-6*s:.1f}" width="{18*s:.1f}" height="{8*s:.1f}" fill="{wall}"/>'
    h += f'<path d="M{x-14*s:.1f} {y-5*s:.1f} L{x-5*s:.1f} {y-17*s:.1f} L{x+5*s:.1f} {y-17*s:.1f} L{x+14*s:.1f} {y-5*s:.1f}Z" fill="{roof}"/>'
    h += f'<rect x="{x-2*s:.1f}" y="{y-4*s:.1f}" width="{3*s:.1f}" height="{3*s:.1f}" fill="#f0b050"/>'
    if season == 'winter':
        h += f'<path d="M{x+2*s:.1f} {y-17*s:.1f} C{x} {y-26*s:.1f} {x+8*s:.1f} {y-30*s:.1f} {x+4*s:.1f} {y-42*s:.1f}" stroke="#c8d0d4" stroke-width="{2.4*s:.1f}" fill="none" opacity=".6" filter="url(#blur2)"/>'
    return h
for x, y, s in [(330, 712, 1), (362, 716, .8), (1180, 706, .9), (1214, 712, 1.1), (760, 709, .7)]:
    o.append(house(x, y, s))

# ── 手前の地面 ──
o.append(f'<rect x="0" y="{FY}" width="{W}" height="{H-FY}" fill="url(#ground)"/>')
if season == 'autumn':
    # 棚田：等高線のような畦が何段も重なり、稲穂が実る。はざ掛け
    for k in range(9):
        y = FY + 8 + k * k * 3.2 + k * 6
        amp = 4 + k * 1.5
        d = f'M-10 {y:.0f} ' + ' '.join(f'Q{x+30} {y - amp * math.sin(x / 70 + k):.0f} {x+60} {y:.0f}' for x in range(-10, W + 60, 60))
        o.append(f'<path d="{d}" stroke="#4a3010" stroke-width="{1.4 + k * .35:.1f}" fill="none" opacity=".75"/>')
        o.append(f'<path d="{d}" stroke="#f0c060" stroke-width="{.6 + k * .1:.1f}" fill="none" opacity=".35" transform="translate(0 -2)"/>')
    for _ in range(700):
        y = R.uniform(FY + 4, H); t = (y - FY) / (H - FY); x = R.uniform(-20, W + 20); h = 2 + t * 12; sw = .6 + t * 1.2
        c = R.choice([P["crop"], P["crop2"], "#e8bc4a"])
        # 稲の株：根元から3本、穂先が垂れる
        o.append(f'<path d="M{x:.0f} {y:.0f} q-{h*.2:.1f} -{h*.7:.1f} -{h*.45:.1f} -{h:.1f} M{x:.0f} {y:.0f} q0 -{h*.8:.1f} {h*.15:.1f} -{h*1.1:.1f} q{h*.2:.1f} 0 {h*.35:.1f} {h*.3:.1f} M{x:.0f} {y:.0f} q{h*.2:.1f} -{h*.6:.1f} {h*.5:.1f} -{h*.85:.1f}" stroke="{c}" stroke-width="{sw:.1f}" fill="none" stroke-linecap="round"/>')
    # はざ掛け（刈った稲を干す棚）
    for x0, y0, w0 in [(240, 770, 140), (1150, 790, 160)]:
        o.append(f'<g><path d="M{x0} {y0} L{x0} {y0-34} M{x0+w0} {y0} L{x0+w0} {y0-34} M{x0+w0/2} {y0} L{x0+w0/2} {y0-34}" stroke="#3a2410" stroke-width="3"/>'
                 f'<rect x="{x0-4}" y="{y0-34}" width="{w0+8}" height="16" fill="#b8862a"/>'
                 + ''.join(f'<path d="M{x0+i*8} {y0-18} l2 10" stroke="#8a6420" stroke-width="1.4"/>' for i in range(int(w0 / 8) + 1)) + '</g>')
else:
    # 雪の畑：うねの雪だまりと、雪から出る枯れ草・杭
    for k in range(8):
        y = FY + 10 + k * k * 3.4 + k * 6
        d = f'M-10 {y:.0f} ' + ' '.join(f'Q{x+40} {y - (5 + k * 2) * math.sin(x / 90 + k):.0f} {x+80} {y:.0f}' for x in range(-10, W + 80, 80))
        o.append(f'<path d="{d}" stroke="#a8b6bc" stroke-width="{1.2 + k * .4:.1f}" fill="none" opacity=".7"/>')
        o.append(f'<path d="{d}" stroke="#ffffff" stroke-width="{1 + k * .3:.1f}" fill="none" opacity=".7" transform="translate(0 -3)"/>')
    for _ in range(140):
        y = R.uniform(FY + 6, H); t = (y - FY) / (H - FY); x = R.uniform(-20, W + 20); h = 3 + t * 12; sw = .6 + t
        c = R.choice(["#6a5a40", "#8a7650", "#4a4030"])
        # 雪から出た枯れ草の株
        o.append(f'<path d="M{x:.0f} {y:.0f} l-{h*.35:.1f} -{h:.1f} M{x:.0f} {y:.0f} l{h*.05:.1f} -{h*1.15:.1f} M{x:.0f} {y:.0f} l{h*.4:.1f} -{h*.9:.1f}" stroke="{c}" stroke-width="{sw:.1f}" stroke-linecap="round"/>')
        o.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{h*.5:.1f}" ry="{h*.12:.1f}" fill="#f6fafa"/>')
    for x0, y0 in [(280, 790), (330, 796), (1180, 800), (1230, 806)]:
        o.append(f'<path d="M{x0} {y0} L{x0} {y0-28}" stroke="#3a2c20" stroke-width="3"/><ellipse cx="{x0}" cy="{y0-29}" rx="4" ry="2" fill="#f4f8f8"/>')
    o.append('<path d="M280 768 C300 772 315 774 330 770 M1180 776 C1200 780 1215 782 1230 780" stroke="#2a2a2a" stroke-width="1" fill="none"/>')

# ── 手前左右の木（秋：紅葉したもみじ、冬：雪をかぶった杉）──
def maple(x, y, r, flip):
    s = f'<path d="M{x} {H} C{x+flip*6} {y+120} {x+flip*20} {y+40} {x+flip*30} {y}" stroke="#1e120c" stroke-width="16" fill="none"/>'
    s += f'<path d="M{x+flip*24} {y+60} C{x+flip*60} {y+40} {x+flip*90} {y+30} {x+flip*130} {y+10}" stroke="#1e120c" stroke-width="7" fill="none"/>'
    for _ in range(60):
        cx = x + flip * R.uniform(-10, r * 1.6); cy = y + R.uniform(-r * .8, r * .5)
        rr = R.uniform(8, 20)
        s += f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{rr:.0f}" fill="{R.choice(P["tree"][:3])}" opacity=".95"/>'
    for _ in range(40):
        cx = x + flip * R.uniform(-10, r * 1.6); cy = y + R.uniform(-r * .8, r * .3)
        s += f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{R.uniform(2,5):.0f}" fill="{P["tree"][3]}"/>'
    # 舞い落ちる葉
    for _ in range(40):
        lx = R.uniform(0, W); ly = R.uniform(y, H)
        s += f'<ellipse cx="{lx:.0f}" cy="{ly:.0f}" rx="3" ry="1.6" fill="{R.choice(P["tree"][1:])}" transform="rotate({R.uniform(0,180):.0f} {lx:.0f} {ly:.0f})" opacity=".9"/>'
    return s
def snowcedar(x, w, flip):
    s = f'<path d="M{x-w/2} {H} L{x-w*.2} 0 L{x+w*.2} 0 L{x+w/2} {H}Z" fill="#14100c"/>'
    s += f'<path d="M{x-w*.3+flip*w*.2} 0 L{x-w*.25+flip*w*.2} {H}" stroke="#2a2420" stroke-width="{w*.12:.0f}"/>'
    for k in range(7):
        yy = 40 + k * 90; ww = 70 + k * 14
        s += f'<path d="M{x-ww} {yy+40} L{x} {yy} L{x+ww} {yy+40} Z" fill="{P["tree"][1]}"/>'
        s += f'<path d="M{x-ww} {yy+40} C{x-ww*.5} {yy+22} {x+ww*.5} {yy+22} {x+ww} {yy+40} L{x+ww*.8} {yy+30} L{x} {yy+6} L{x-ww*.8} {yy+30}Z" fill="#eef4f6"/>'
    return s
if season == 'autumn':
    # 手前の木は置かず、舞い落ちるもみじの葉だけ（木の絵は画面の端で不自然に切れるため）
    for _ in range(70):
        lx = R.uniform(0, W); ly = R.uniform(0, H); r0 = R.uniform(2.5, 5)
        o.append(f'<ellipse cx="{lx:.0f}" cy="{ly:.0f}" rx="{r0:.1f}" ry="{r0*.55:.1f}" fill="{R.choice(P["tree"][1:])}" transform="rotate({R.uniform(0,180):.0f} {lx:.0f} {ly:.0f})" opacity=".9"/>')
else:
    o.append(snowcedar(30, 40, 1)); o.append(snowcedar(W - 30, 46, -1))
    # 手前の雪だまり
    o.append(f'<path d="M-10 {H} C120 {H-50} 260 {H-30} 420 {H-10} L-10 {H}Z" fill="#f4f8f8"/>')
    o.append(f'<path d="M1100 {H} C1260 {H-40} 1440 {H-60} 1610 {H-30} L1610 {H}Z" fill="#eef4f6"/>')

# 手前の草のシルエット
for _ in range(120):
    x = R.uniform(-10, W + 10); h = R.uniform(18, 60); lean = R.uniform(-16, 16)
    c = R.choice(['#2a1a0c', '#3a2410', '#4a3214']) if season == 'autumn' else R.choice(['#3a3428', '#4a4232', '#2e2a20'])
    o.append(f'<path d="M{x-3:.0f} {H} Q{x+lean*.4:.0f} {H-h*.6:.0f} {x+lean:.0f} {H-h:.0f} Q{x+lean*.3+3:.0f} {H-h*.5:.0f} {x+4:.0f} {H}Z" fill="{c}"/>')

# 光の筋
for x1, w1, op in [(1180, 60, .10), (1060, 40, .07), (1320, 80, .06)]:
    o.append(f'<path d="M{x1} 0 L{x1+w1} 0 L{x1-420+w1*2} {H} L{x1-420} {H}Z" fill="{P["sun"][0]}" opacity="{op}" filter="url(#blur2)"/>')
o.append(f'<rect width="{W}" height="{H}" fill="#000" filter="url(#paint)"/>')
o.append('</svg>')
open(out, 'w').write('\n'.join(o))
print('ok', out)
