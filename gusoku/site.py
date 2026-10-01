"""Build standalone pages for GitHub Pages: python3 gusoku/site.py <out_dir>"""
import sys,os
here=os.path.dirname(os.path.abspath(__file__));out=sys.argv[1];os.makedirs(out,exist_ok=True)
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
<meta name="apple-mobile-web-app-title" content="グソク">
<style>html,body{background:#02080d}</style>
'''
for src,dst in (('index.html','real.html'),('yuru.html','yuru.html')):
    s=open(os.path.join(here,src),encoding='utf-8').read()
    i=s.index('<canvas id="gl"')
    open(os.path.join(out,dst),'w',encoding='utf-8').write(HEAD+s[:i]+'</head>\n<body>\n'+s[i:]+'\n</body>\n</html>\n')
