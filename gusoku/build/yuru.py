# Builds gusoku/yuru.html (グソっ君) from gusoku/index.html: python3 gusoku/build/yuru.py
import os
SP=os.path.dirname(os.path.abspath(__file__))+'/'
G=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s=open(G+'/index.html',encoding='utf-8').read()
CH=open(SP+'chara_mod.js').read()
R=[
# ---- page identity & look
('<title>グソク</title>','<title>ゆるグソク</title>'),
('family=Shippori+Mincho+B1:wght@500;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap',
 'family=Zen+Maru+Gothic:wght@500;700;900&family=IBM+Plex+Mono:wght@400;500&display=swap'),
('  --glow:#8fd3ff;','  --glow:#ffd27a;'),
('  --f-display:"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif;','  --f-display:"Zen Maru Gothic","Hiragino Maru Gothic ProN","Hiragino Sans",system-ui,sans-serif;'),
('  --f-body:"Zen Kaku Gothic New","Hiragino Sans","Noto Sans JP",system-ui,sans-serif;','  --f-body:"Zen Maru Gothic","Hiragino Maru Gothic ProN","Hiragino Sans",system-ui,sans-serif;'),
('/* cinematic */','/* yuru: rounder, warmer panels */\n.bubble,.gauges,.talk input,.sheet,.pop,#alert{border-radius:14px}\nbutton{border-radius:999px}\n.line{font-weight:700}\n.brand h1,.t-name{font-weight:900}\n.line.narr{font-style:normal}\n/* cinematic */'),
('      <p>母の腹の下で生まれた小さな命を、成体まで育てる。話しかけ、餌をやり、水を守る。心を開くかどうかは、あなた次第。</p>',
 '      <p>ハチマキがトレードマークの、ちょっとマイペースな深海の住人。お母さんのお腹のポケットから生まれた小さなグソクを、話しかけて、ごはんをあげて、大きく育てよう。</p>'),
# ---- warmer, brighter tank
('      let r=78+a*22+b*12,g=74+a*19+b*10,bl=68+a*14+b*9;','      let r=118+a*22+b*12,g=104+a*18+b*10,bl=86+a*13+b*9;'),
("const hemi=new THREE.HemisphereLight('#2a5c7c','#07090b',.25);","const hemi=new THREE.HemisphereLight('#9fd2ff','#a8805a',.25);"),
("  white:{lamp:2.6,col:'#cfe8ff',hemi:.25,rim:.6,fog:'#02111b',dens:.058,","  white:{lamp:1.7,col:'#fff1dc',hemi:.5,rim:.4,fog:'#123f56',dens:.04,"),
("const lightNow={lamp:2.6,hemi:.25,rim:.6,dens:.058,","const lightNow={lamp:1.7,hemi:.5,rim:.4,dens:.04,"),
("  renderer.toneMappingExposure=.95+lightNow.dark*.15;","  renderer.toneMappingExposure=1.0+lightNow.dark*.15;"),
# ---- camera / reach for a standing character
("f.y+=(.35+C.swim*.2)*C.size;","f.y+=((ISO.focusH||.35)+C.swim*.2)*C.size;"),
("    const stopAt=C.state==='approach'?1.45*sz+.12:.3;","    const stopAt=C.state==='approach'?(ISO.reach||1.45)*sz+.18:.3;"),
# ---- molt: own-joint ownership, keep face/headband, land shells on the floor, chara distances & lines
("""    const out=[],I=ISO,skip=new Set([I.coreMat,I.calcMat]);
    idx.forEach(i=>{const next=I.joints[i+1];const walk=o=>{if(o===next)return;if(o.isMesh&&!skip.has(o.material))out.push(o);o.children.forEach(walk)};walk(I.joints[i])});
    return out;""","""    const out=[],I=ISO,skip=new Set([I.coreMat,I.calcMat]),want=new Set(idx);
    const walk=(o,owner)=>{const j=I.joints.indexOf(o);if(j>=0)owner=j;if(o.isMesh&&!o.userData.keep&&!o.userData.outline&&!skip.has(o.material)&&want.has(owner))out.push(o);o.children.forEach(c=>walk(c,owner))};
    walk(I.body,-1);return out;"""),
("    const ctr=new V3();g.children.forEach(c=>ctr.add(c.position));ctr.divideScalar(Math.max(1,g.children.length));",
 "    const ctr=new V3();g.children.forEach(c=>ctr.add(c.position));ctr.divideScalar(Math.max(1,g.children.length));const box=new THREE.Box3().setFromObject(g);"),
("const ex={g,mats:[shellEx,limbEx,eyeEx],left:1,center:ctr,prog:0,dir:null};","const ex={g,mats:[shellEx,limbEx,eyeEx],left:1,center:ctr,prog:0,dir:null,minY:box.min.y};"),
("  settle(ex,dt){ex.g.position.y=damp(ex.g.position.y,-.3*C.size,1.5,dt);ex.g.rotation.z=damp(ex.g.rotation.z,.04,1,dt)},",
 "  settle(ex,dt){const c=ex.center.clone().add(ex.g.position);ex.g.position.y=damp(ex.g.position.y,heightAt(c.x,c.z)+.01-ex.minY,1.5,dt)},"),
("this.slide(this.cur,dt,this.cur.dir,2.5*C.size)","this.slide(this.cur,dt,this.cur.dir,(ISO.shedBack||2.5)*C.size)"),
("this.slide(this.cur,dt,this.cur.dir,2.1*C.size)","this.slide(this.cur,dt,this.cur.dir,(ISO.shedFront||2.1)*C.size)"),
("    say('（脱皮の前ぶれ。餌を食べなくなり、腹側の胸節に白いカルシウムの塊がたまっていく。古い殻から回収したカルシウムを、新しい殻のために蓄えているのだ）',{narr:true});",
 "    say('（脱皮の前ぶれ。ごはんを食べなくなって、おなかに白いカルシウムのつぶつぶが出てきた。新しい殻の材料を、こっそりためているのだ）',{narr:true});"),
("'（第4胸節と第5胸節のあいだで、古い殻が横に割れた。後ろ半分から、少しずつ脱ぎはじめる）'","'（背中の殻に、ピシッとすじが入った。うしろ半分から、もぞもぞ脱ぎはじめる）'"),
("'（後ろ半分が脱げた。前は古い殻、後ろは水を吸ってふくらんだ柔らかい新しい殻——いまは二色の体だ）'","'（うしろ半分が脱げた！ 前は古い殻、うしろはつやつやの新しい殻。いまは二色のグソクだ）'"),
("'（今度は前半分。頭の殻が割れ、眼の表面や触角、口の部品まで、古い殻ごと脱ぎ捨てていく）'","'（こんどは前半分。頭の殻も、うでの殻も、すっぽり脱げていく。ハチマキだけは、ちゃんと残っている）'"),
("'（脱皮完了。新しい殻はまだ柔らかく、白っぽい。水を吸って一回り大きくなった。硬くなるまで数日かかる）'","'（脱皮完了！ ひとまわり大きくなった。新しい殻はまだやわらかくて白っぽい。かたくなるまで、そっとしておこう）'"),
# ---- parasites land on the back plates
("    for(let i=0;i<6;i++){const seg=ISO.segs[1+Math.floor(rnd()*12)];const m=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),mat);m.scale.set(1,.6,1.4);\n      m.position.set((rnd()-.5)*seg.sp.hw0*1.2,seg.sp.hw0*seg.sp.hf*.85+.02,-seg.sp.len*(.2+rnd()*.6));seg.j.add(m);this.specks.push(m)}},",
 "    for(let i=0;i<6;i++){const sp=ISO.speck();const m=new THREE.Mesh(new THREE.SphereGeometry(.04,8,6),mat);m.scale.set(1,1.3,.6);m.position.copy(sp.pos);sp.parent.add(m);this.specks.push(m)}},"),
# ---- birth: mother faces the viewer, pouch on her tummy
("this.MP=Object.assign(newPose(),{pos:new V3(-.2,0,-1.0),yaw:Math.PI/2,size:1.1});","this.MP=Object.assign(newPose(),{pos:new V3(-.2,0,-1.0),yaw:0,size:1.1});this.yaw0=0;"),
("    if(t>22&&t<24.5){MP.yaw=lerp(Math.PI/2,-Math.PI/2+.25,smooth(22,24.5,t));","    if(t>22&&t<24.5){MP.yaw=lerp(this.yaw0,this.yaw0+Math.PI-.25,smooth(22,24.5,t));"),
("    const K=[[0,[5,3,7],[-.2,.5,-1]],[5.5,[2.4,1.1,3.6],[-.2,.45,-1]],[10.5,[.9,.13,2.6],[-.3,.36,-.95]],[13.6,[.35,.12,1.5],[-.35,.24,-.85]],[16,[.35,.12,1.5],[-.35,.2,-.85]]];",
 "    const K=[[0,[3.6,2.6,6.4],[-.2,1.5,-1]],[5.5,[1.5,1.5,3.3],[-.2,1.3,-.8]],[10.5,[.75,1.0,2.1],[-.22,.95,-.5]],[13.6,[.35,.75,1.45],[-.3,.75,-.45]],[16,[.35,.6,1.45],[-.3,.5,-.35]]];"),
("'母親の腹の下には「育房」という袋がある。卵はそこで、何か月も抱かれて育つ。'","'お母さんのおなかには「育房」というポケットがある。卵はそこで、何か月もだいじに抱かれて育つ。'"),
("'殻を破った小さな命が、母の脚のあいだから這い出していく。'","'殻をやぶった小さなグソクが、ポケットからころんと転がり出た。'"),
# ---- yuru speech: ボク／キミ／〜グソ, wave on greetings
("  if(!q.narr){const vd=speak(txt,q.emo);","  if(!q.narr){if(/^(こんにち|おはよ|やあ|ハロー|……キタ|……戻ったか|……早いな|……オハヨ|バイバイ|またね)/.test(txt)){C.wave=2.6;C.waveDur=2.6}const vd=speak(txt,q.emo);"),
("function say(text,opt){opt=opt||{};queue.push({text,","function say(text,opt){opt=opt||{};if(!opt.narr)text=yuru(text);queue.push({text,"),
("    ev('talk');shape(.2,.6);","    ev('talk');shape(.2,.6);if(/こんにち|おはよ|こんばん|やあ|ハロー|はじめまして|バイバイ|またね|おやすみ/.test(text)){C.wave=2.6;C.waveDur=2.6}"),
("  started=true;\n  $('title').classList.add('gone');setTimeout(()=>$('title').hidden=true,1300);","  started=true;C.wave=2.6;C.waveDur=2.6;\n  $('title').classList.add('gone');setTimeout(()=>$('title').hidden=true,1300);"),
("往年の育成ゲーム『シーマン』のように、ぶっきらぼうで皮肉屋、でも飼い主のことを少しずつ覚えて心を開いていく生き物です。",
 "見た目は、頭に白いハチマキを巻いて二本足で立つ、まるっこいゆるキャラ。一人称は「ボク」、相手は「キミ」か名前で呼び、語尾にときどき「グソ」がつく。ほんわかマイペースで、深海育ちらしくちょっとだけ毒舌。でも飼い主のことを少しずつ覚えて心を開いていく。※下の段階ルールに「ワシ」「オマエ」とあっても、一人称は「ボク」、二人称は「キミ」にすること。"),
# ---- a slightly higher, rounder voice
("    const f0base=235*Math.pow(60/235,gw);","    const f0base=270*Math.pow(105/270,gw);"),
("scale=1.34*Math.pow(.76/1.34,this.gw||0),","scale=1.38*Math.pow(.95/1.38,this.gw||0),"),
("function shellTint(){const k=[1.18,1.06,.98,.94][S.stage]||1;ISO.shellMat.color.setRGB(k,k*.985,k*.96);ISO.coreMat.color.setRGB(k,k,k)}",
 "function shellTint(){const k=[1.14,1.06,1,.97][S.stage]||1;ISO.shellMat.color.copy(ISO.shellBase).multiplyScalar(k);ISO.limbMat.color.copy(ISO.limbBase).multiplyScalar(k)}"),
("function shellTintFor(I,k){I.shellMat.color.setRGB(k*.96,k*.94,k*.9)}","function shellTintFor(I,k){I.shellMat.color.copy(I.shellBase).multiplyScalar(k*.94)}"),
("const tk0=[1.18,1.06,.98,.94][S.stage]||1,dk=tk0*lerp(1,.88,k);I.shellMat.color.setRGB(dk,dk*.985,dk*.96);","const tk0=[1.14,1.06,1,.97][S.stage]||1;I.shellMat.color.copy(I.shellBase).multiplyScalar(tk0*lerp(1,.85,k));"),
("const v=lerp(1.55,tk,k);I.newShellMat.color.setRGB(v,v*lerp(.916,.985,k),v*lerp(.877,.96,k));I.newShellMat.roughness=lerp(.2,.36,k);I.newLimbMat.color.copy(new THREE.Color('#f2e6dc').lerp(new THREE.Color('#a88f7c'),k));",
 "I.newShellMat.color.copy(new THREE.Color('#e0a573')).lerp(I.shellBase.clone().multiplyScalar(tk),k);I.newLimbMat.color.copy(new THREE.Color('#dba077')).lerp(I.limbBase,k);"),
("ISO.newShellMat.color.setRGB(1.55,1.42,1.36);ISO.newShellMat.roughness=.2;ISO.newLimbMat.color.set('#f2e6dc');","ISO.newShellMat.color.set('#e0a573');ISO.newLimbMat.color.set('#dba077');"),

("shellEx.color.setRGB(1.06,1.03,1.0);","shellEx.color.copy(I.shellBase).multiplyScalar(1.35);"),
("  return lines.slice(0,4).join(st===0?'':'\\n');","  return lines.slice(0,4).map(l=>/^（/.test(l)?l:yuru(l)).join(st===0?'':'\\n');"),
("日記のルール：本文だけを書く。","一人称は「ボク」、二人称は「キミ」、語尾にときどき「グソ」。日記のルール：本文だけを書く。"),
("shellEx.roughness=.5;shellEx.clearcoat=.3;","if(!I.chara){shellEx.roughness=.5;shellEx.clearcoat=.3}"),
("I.shellMat.roughness=lerp(.36,.6,k);I.shellMat.clearcoat=lerp(.85,.3,k);","if(!I.chara){I.shellMat.roughness=lerp(.36,.6,k);I.shellMat.clearcoat=lerp(.85,.3,k)}"),
("I.shellMat.roughness=.36;I.shellMat.clearcoat=.85;","if(!I.chara){I.shellMat.roughness=.36;I.shellMat.clearcoat=.85}"),
("（誕生。体長およそ22ミリ。脚はまだ6対しかない。これを「マンカ」と呼ぶ）","（誕生！ 体長およそ22ミリ。まだハチマキもない、生まれたてのグソク。この時期を「マンカ」と呼ぶ）"),
("'（最初の脱皮で、7対目の脚が生えそろった。もうマンカではない。「幼体」だ）'","'（はじめての脱皮をおえて、ハチマキをきゅっと締めた！ もうマンカではない。「幼体」だ）'"),
("    S.pokes++;C.curlT=.9;C.startle=1;","    S.pokes++;C.curlT=0;C.startle=2.4;"),
("    S.pokes++;C.curlT=0;C.startle=2.4;","    S.pokes++;C.curlT=S.molts<4?.9:0;C.startle=S.molts<4?1:2.4;"),
("  C.size=damp(C.size,C.sizeT,.35,dt);","  C.crawlT=S.molts<4?1:0;C.crawl=damp(C.crawl===undefined?C.crawlT:C.crawl,C.crawlT,.7,dt);C.size=damp(C.size,C.sizeT,.35,dt);"),
("ISO.root.visible=false;ISO.contact.visible=false;C.size=C.sizeT=.1;","ISO.root.visible=false;ISO.contact.visible=false;C.crawl=1;C.size=C.sizeT=.1;"),
("    else if(m===4){say('（「亜成体」になった。言葉がはっきりしてきた）',{narr:true});","    else if(m===4){say('（「亜成体」になった！ そして——ゆっくり体を起こして、はじめて二本の足で立ち上がった！）',{narr:true});C.wave=3;C.waveDur=3;"),
("  C.pos.set(.4,0,.2);C.size=C.sizeT=sizeOf(S.molts);shellTint();","  C.pos.set(.4,0,.2);C.size=C.sizeT=sizeOf(S.molts);C.crawl=S.molts<4?1:0;shellTint();"),
("const VARIANT='real',SKEY='gusoku.save2',GKEY='gusoku.graves';",
  "const VARIANT='yuru',SKEY='gusoku.yuru.save2',GKEY='gusoku.yuru.graves';\n// the Claude-hosted yuru page used the shared keys: carry them over (not on the shared GitHub Pages origin)\ntry{if(!localStorage.getItem(SKEY)&&localStorage.getItem('gusoku.save2')&&!/github\\.io$/.test(location.hostname)){localStorage.setItem(SKEY,localStorage.getItem('gusoku.save2'));const g=localStorage.getItem('gusoku.graves');if(g)localStorage.setItem(GKEY,g)}}catch(e){}"),
]
for x,y in R:
    if x not in s and '育成ゲーム『シーマン』' in x: continue  # AI prompt text, unused
    assert x in s,('MISSING',x[:90])
    s=s.replace(x,y)
m=s.index('/* =====================================================================\n   FOOD')
s=s[:m]+CH+'\n'+s[m:]
# the character of this version is called 「グソっ君」 (but the species stays オオグソクムシ)
import re as _re
s=s.replace('ゆるグソク','グソっ君')
s=_re.sub(r'\|グソク(?=[/|)])','|グソク|グソっ君|グソっくん',s)
s=s.replace('(グソク|ぐそく)','(グソク|ぐそく|グソっ君|グソっくん)')
s=_re.sub(r'(?<![オ|])グソク(?![ムシ|])','グソっ君',s)
open(G+'/yuru.html','w',encoding='utf-8').write(s);print('ok',len(s))
