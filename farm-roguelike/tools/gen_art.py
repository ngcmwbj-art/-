# 手描き水彩風のSVGイラストを生成する（共通の「にじみ」「インク線」フィルタ付き）
import sys, os, re
OUT = sys.argv[1]

DEFS = '''<defs>
  <!-- 線のゆらぎ：手描きらしく少し揺らす -->
  <filter id="ink" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="SEED" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <!-- 水彩のにじみ：ふちを揺らし、中に紙のムラを入れる -->
  <filter id="wash" x="-15%" y="-15%" width="130%" height="130%">
    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="SEED" result="n1"/>
    <feDisplacementMap in="SourceGraphic" in2="n1" scale="6" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="SEED" result="n2"/>
    <feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.35" result="grain"/>
    <feComposite in="d" in2="grain" operator="in" result="g"/>
    <feGaussianBlur in="d" stdDeviation="0.6" result="soft"/>
    <feMerge><feMergeNode in="soft"/><feMergeNode in="g"/></feMerge>
  </filter>
  <!-- 光の当たる側を明るく -->
  <radialGradient id="hl" cx="35%" cy="30%" r="70%">
    <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
</defs>'''

INK = 'fill="none" stroke="#4a3a2a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"'

def dedupe(body):
    # 同じ属性が重なったら後ろ（個別の指定）を優先する
    def fix(m):
        tag, attrs, end = m.group(1), m.group(2), m.group(3)
        d = {}
        for k, v in re.findall(r'([\w:-]+)="([^"]*)"', attrs):
            d[k] = v
        return '<' + tag + ''.join(f' {k}="{v}"' for k, v in d.items()) + end
    return re.sub(r'<(\w+)((?:\s+[\w:-]+="[^"]*")*)\s*(/?>)', fix, body)

def svg(name, body, seed):
    body = dedupe(body)
    s = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">\n<!-- {name}：手描き水彩風（自動生成） -->\n{DEFS.replace("SEED", str(seed))}\n{body}\n</svg>\n'
    open(os.path.join(OUT, name + '.svg'), 'w').write(s)

# ── カラス（敵） ─────────────────────────────
svg('crow', f'''
<g filter="url(#wash)">
  <path d="M30 92 L12 104 L20 88 Z" fill="#3c4253"/>
  <ellipse cx="58" cy="72" rx="30" ry="22" fill="#434a5e"/>
  <circle cx="84" cy="48" r="17" fill="#4a5268"/>
  <path d="M40 64 C52 54 74 58 82 74 C68 80 52 80 40 64Z" fill="#2f3546"/>
  <path d="M99 46 L114 52 L99 56 Z" fill="#c9a26b"/>
  <ellipse cx="58" cy="66" rx="24" ry="12" fill="#6b7a98" opacity=".35"/>
</g>
<ellipse cx="60" cy="68" rx="30" ry="22" fill="url(#hl)"/>
<g filter="url(#ink)">
  <path d="M30 92 L12 104 L20 88" {INK}/>
  <path d="M28 76 C30 58 48 50 66 52 C70 40 78 31 88 31 C100 32 104 42 100 52 C98 60 92 66 88 72 C84 88 68 96 50 94 C40 92 32 86 28 76Z" {INK}/>
  <path d="M40 64 C52 54 74 58 82 74" {INK}/>
  <path d="M99 46 L114 52 L99 56" {INK}/>
  <path d="M54 94 L52 106 M52 106 L46 108 M52 106 L56 109 M66 93 L66 105 M66 105 L61 108 M66 105 L71 107" {INK} stroke="#a5784a"/>
</g>
<circle cx="88" cy="45" r="4.8" fill="#fffbe9" stroke="#4a3a2a" stroke-width="1.6"/>
<circle cx="89" cy="45.5" r="2.4" fill="#2a2420"/>
<circle cx="89.8" cy="44.5" r=".8" fill="#fff"/>
''', 3)

# ── キャベツ（作物・実った） ───────────────────
svg('cabbage', f'''
<g filter="url(#wash)">
  <path d="M16 78 C10 56 26 40 44 46 C40 30 64 22 76 38 C92 30 112 48 100 70 C110 86 92 104 60 102 C30 104 12 94 16 78Z" fill="#8fb86a"/>
  <circle cx="60" cy="70" r="27" fill="#c6dd96"/>
  <path d="M38 72 C40 54 56 46 70 50 C82 54 86 70 80 82 C70 92 46 90 38 72Z" fill="#dcebb4"/>
</g>
<circle cx="60" cy="66" r="30" fill="url(#hl)"/>
<g filter="url(#ink)">
  <path d="M16 78 C10 56 26 40 44 46 C40 30 64 22 76 38 C92 30 112 48 100 70 C110 86 92 104 60 102 C30 104 12 94 16 78Z" {INK}/>
  <path d="M34 70 C34 52 50 42 66 44 C84 46 92 62 86 78 C80 92 56 96 42 86" {INK}/>
  <path d="M60 50 C54 60 56 74 62 84 M60 66 C66 62 72 62 78 64 M58 74 C52 72 46 72 42 74" {INK} stroke-width="1.8" stroke="#6f8a4a"/>
</g>
''', 7)

# ── 芽（作物・育ち中） ─────────────────────────
svg('sprout', f'''
<g filter="url(#wash)">
  <ellipse cx="60" cy="96" rx="40" ry="12" fill="#9b7656"/>
  <path d="M60 92 C60 76 60 66 60 58" stroke="#7fae5c" stroke-width="6" fill="none"/>
  <path d="M60 62 C46 64 26 56 22 38 C40 34 56 42 60 62Z" fill="#a8d07c"/>
  <path d="M60 58 C66 40 84 28 102 34 C100 54 80 62 60 58Z" fill="#94c46a"/>
</g>
<g filter="url(#ink)">
  <path d="M22 96 C34 88 86 88 98 96" {INK}/>
  <path d="M60 92 C60 76 60 66 60 58" {INK}/>
  <path d="M60 62 C46 64 26 56 22 38 C40 34 56 42 60 62Z" {INK}/>
  <path d="M60 58 C66 40 84 28 102 34 C100 54 80 62 60 58Z" {INK}/>
  <path d="M58 60 C46 54 36 48 28 42 M62 56 C74 48 86 42 96 38" {INK} stroke-width="1.6" stroke="#5f8a40"/>
</g>
''', 11)

# ── F1の子牛（畜産） ──────────────────────────
svg('calf', f'''
<g filter="url(#wash)">
  <rect x="22" y="48" width="60" height="34" rx="16" fill="#3f3632"/>
  <path d="M30 80 L28 102 M44 82 L44 102 M66 82 L66 102 M78 80 L80 102" stroke="#3a312d" stroke-width="7" stroke-linecap="round"/>
  <path d="M74 44 C80 32 104 32 108 48 C110 60 104 70 92 72 C82 72 74 60 74 44Z" fill="#463c37"/>
  <ellipse cx="100" cy="64" rx="9" ry="7" fill="#c9a08a"/>
  <ellipse cx="72" cy="38" rx="9" ry="5" fill="#4a3f3a" transform="rotate(-20 72 38)"/>
  <ellipse cx="50" cy="56" rx="22" ry="8" fill="#7a6a62" opacity=".45"/>
</g>
<rect x="22" y="46" width="62" height="36" rx="16" fill="url(#hl)"/>
<g filter="url(#ink)">
  <path d="M74 50 C64 46 40 44 30 50 C18 56 18 76 30 82 C42 86 62 86 76 80" {INK}/>
  <path d="M30 80 L28 102 M44 82 L44 102 M66 82 L66 102 M78 78 L80 102" {INK}/>
  <path d="M74 44 C80 32 104 32 108 48 C110 60 104 70 92 72 C82 72 74 60 74 44Z" {INK}/>
  <path d="M80 36 C74 30 64 32 64 38 C68 42 74 42 78 40" {INK}/>
  <path d="M22 58 C14 60 12 70 14 76" {INK}/>
  <ellipse cx="100" cy="64" rx="9" ry="7" {INK} stroke-width="2"/>
</g>
<circle cx="94" cy="49" r="3.6" fill="#fffbe9" stroke="#4a3a2a" stroke-width="1.4"/>
<circle cx="94.6" cy="49.6" r="1.9" fill="#1f1a18"/>
<circle cx="97" cy="64" r="1.2" fill="#4a3a2a"/><circle cx="103" cy="64" r="1.2" fill="#4a3a2a"/>
''', 5)

# ── 除草（鎌と草） ────────────────────────────
svg('weeding', f'''
<g filter="url(#wash)">
  <path d="M18 100 C22 78 26 64 34 56 C34 72 38 86 40 100 C44 80 50 66 58 60 C56 76 56 90 58 100Z" fill="#8cbf62"/>
  <path d="M58 30 C76 18 102 22 108 40 C92 30 76 32 64 40Z" fill="#c9d3da"/>
  <path d="M62 38 L40 92" stroke="#b7865a" stroke-width="9" stroke-linecap="round"/>
</g>
<g filter="url(#ink)">
  <path d="M18 100 C22 78 26 64 34 56 C34 72 38 86 40 100 C44 80 50 66 58 60 C56 76 56 90 58 100" {INK}/>
  <path d="M14 100 L66 100" {INK}/>
  <path d="M58 30 C76 18 102 22 108 40 C92 30 76 32 64 40Z" {INK}/>
  <path d="M66 34 L42 94 M58 34 L34 92" {INK} stroke-width="2.2"/>
</g>
''', 13)

# ── 防鳥ネット ───────────────────────────────
svg('net', f'''
<g filter="url(#wash)">
  <path d="M14 96 C14 50 106 50 106 96Z" fill="#cfe4ee"/>
  <circle cx="44" cy="88" r="10" fill="#a9d07a"/><circle cx="76" cy="88" r="10" fill="#e39a7a"/>
</g>
<g filter="url(#ink)">
  <path d="M14 96 C14 50 106 50 106 96" {INK}/>
  <path d="M10 98 L110 98" {INK}/>
  <path d="M26 96 C30 70 44 60 60 58 M42 96 C44 76 52 64 60 58 M60 58 L60 96 M78 96 C76 76 68 64 60 58 M94 96 C90 70 76 60 60 58" {INK} stroke-width="1.6" stroke="#5a7a8a"/>
  <path d="M18 80 C46 72 74 72 102 80 M30 66 C50 62 70 62 90 66" {INK} stroke-width="1.6" stroke="#5a7a8a"/>
</g>
''', 17)

# ── 収穫（かご） ─────────────────────────────
svg('basket', f'''
<g filter="url(#wash)">
  <circle cx="44" cy="54" r="14" fill="#e3876a"/><circle cx="66" cy="48" r="15" fill="#a9d07a"/><ellipse cx="84" cy="56" rx="12" ry="10" fill="#f0b45a"/>
  <path d="M20 60 L100 60 L90 100 L30 100Z" fill="#d9a86a"/>
</g>
<path d="M20 60 L100 60 L90 100 L30 100Z" fill="url(#hl)"/>
<g filter="url(#ink)">
  <path d="M20 60 L100 60 L90 100 L30 100Z" {INK}/>
  <path d="M24 72 L96 72 M27 86 L93 86" {INK} stroke-width="1.8" stroke="#8a6440"/>
  <path d="M40 60 L44 100 M60 60 L60 100 M80 60 L76 100" {INK} stroke-width="1.8" stroke="#8a6440"/>
  <path d="M30 60 C30 26 90 26 90 60" {INK}/>
  <path d="M66 33 C68 28 72 26 76 27" {INK} stroke-width="2"/>
</g>
''', 19)

# ── 水やり（じょうろ） ─────────────────────────
svg('water', f'''
<g filter="url(#wash)">
  <path d="M30 50 L70 50 L74 92 L26 92Z" fill="#8fbcd6"/>
  <path d="M70 62 L102 40 L106 46 L72 76Z" fill="#7aa8c4"/>
  <path d="M100 56 C98 62 96 64 96 66 C96 69 100 69 100 66Z M108 62 C106 68 104 70 104 72 C104 75 108 75 108 72Z M94 72 C92 78 90 80 90 82 C90 85 94 85 94 82Z" fill="#a8d4ef"/>
</g>
<path d="M30 50 L70 50 L74 92 L26 92Z" fill="url(#hl)"/>
<g filter="url(#ink)">
  <path d="M30 50 L70 50 L74 92 L26 92Z" {INK}/>
  <path d="M70 62 L102 40 M72 76 L106 46 M100 38 L108 48" {INK}/>
  <path d="M34 50 C34 30 66 30 66 50" {INK}/>
  <path d="M26 92 L74 92" {INK}/>
</g>
''', 23)

# ── かかし ──────────────────────────────────
svg('scarecrow', f'''
<g filter="url(#wash)">
  <path d="M58 40 L58 110" stroke="#9b7a52" stroke-width="6"/>
  <path d="M18 60 L102 60" stroke="#9b7a52" stroke-width="6"/>
  <path d="M38 56 L82 56 L76 92 L44 92Z" fill="#7aa7c8"/>
  <circle cx="58" cy="38" r="15" fill="#f1e2bf"/>
  <ellipse cx="58" cy="26" rx="28" ry="6" fill="#e2c46c"/>
  <path d="M44 26 C44 10 72 10 72 26Z" fill="#e8cf7c"/>
  <path d="M18 60 L10 66 M18 60 L12 54 M102 60 L110 66 M102 60 L108 54" stroke="#d8b858" stroke-width="3"/>
</g>
<g filter="url(#ink)">
  <path d="M38 56 L82 56 L76 92 L44 92Z" {INK}/>
  <path d="M18 60 L38 60 M82 60 L102 60 M58 92 L58 110" {INK}/>
  <circle cx="58" cy="38" r="15" {INK}/>
  <ellipse cx="58" cy="26" rx="28" ry="6" {INK}/>
  <path d="M44 26 C44 10 72 10 72 26" {INK}/>
  <path d="M51 44 C55 48 61 48 65 44" {INK} stroke-width="1.8"/>
</g>
<g><circle cx="52.5" cy="37" r="2" fill="#4a3a2a"/><circle cx="63.5" cy="37" r="2" fill="#4a3a2a"/><circle cx="48" cy="42" r="2.6" fill="#e9a08a" opacity=".6"/><circle cx="68" cy="42" r="2.6" fill="#e9a08a" opacity=".6"/>
  <path d="M50 70 L54 74 M66 66 L70 70 M60 80 L64 84" {INK} stroke-width="1.6" stroke="#4a6a88"/>
</g>
''', 29)
print('ok')
