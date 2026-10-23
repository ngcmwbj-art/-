"""Build standalone pages for GitHub Pages: python3 gusoku/site.py <out_dir>"""
import sys,os,shutil
here=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));out=sys.argv[1];os.makedirs(out,exist_ok=True)
HEAD='''<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content">
<meta name="theme-color" content="#02080d">
<meta name="color-scheme" content="dark">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="{title}">
<link rel="apple-touch-icon" href="{icon}.png">
<link rel="icon" type="image/png" href="{icon}-512.png">
<style>html,body{background:#02080d}</style>
'''
b=os.path.join(here,'build')
for k in ('real','yuru'):
    shutil.copy(os.path.join(b,'icon_%s.png'%k),os.path.join(out,'icon-%s.png'%k))
    shutil.copy(os.path.join(b,'icon_%s_512.png'%k),os.path.join(out,'icon-%s-512.png'%k))
for src,dst,k,title in (('index.html','real.html','real','グソク'),('yuru.html','yuru.html','yuru','グソっ君')):
    s=open(os.path.join(here,src),encoding='utf-8').read()
    i=s.index('<canvas id="gl"')
    open(os.path.join(out,dst),'w',encoding='utf-8').write(HEAD.replace('{title}',title).replace('{icon}','icon-'+k)+s[:i]+'</head>\n<body>\n'+s[i:]+'\n</body>\n</html>\n')
