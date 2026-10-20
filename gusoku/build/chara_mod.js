/* =====================================================================
   YURU-CHARA GUSOKU — a bipedal, headband-wearing giant isopod mascot.
   Same rig contract as the realistic model (root/body/joints/eyeMat/shellMat/...),
   so the molt, birth, dream and life systems drive it unchanged.
   ===================================================================== */
const GRAD=(()=>{const d=new Uint8Array([92,92,92,255,160,160,160,255,215,215,215,255]);const t=new THREE.DataTexture(d,3,1,THREE.RGBAFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t})();
function toon(col,o){const m=new THREE.MeshToonMaterial(Object.assign({color:col,gradientMap:GRAD},o||{}));addCaustics(m,.12);return m}
const OLC={};
function olMat(w){if(OLC[w])return OLC[w];const m=new THREE.MeshBasicMaterial({color:'#3f1e0b',side:THREE.BackSide});
  m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed+=normal*'+(w*1.7).toFixed(4)+';')};m.customProgramCacheKey=()=>'ol'+w;return OLC[w]=m}
function vc(g,c){if(!g.attributes.color){const n=g.attributes.position.count,a=new Float32Array(n*3).fill(c===undefined?1:c);g.setAttribute('color',new THREE.BufferAttribute(a,3))}return g}
function mk(geo,mat,parent,pos,rot,ol,opt){const m=new THREE.Mesh(geo,mat);if(pos)m.position.set(pos[0],pos[1],pos[2]);if(rot)m.rotation.set(rot[0],rot[1],rot[2]);
  m.castShadow=!(opt&&opt.noShadow);parent.add(m);if(ol){const o=new THREE.Mesh(geo,olMat(ol));o.userData.outline=true;o.raycast=()=>{};m.add(o)}if(opt&&opt.keep)m.userData.keep=true;return m}
const BC={y:.55,rx:.62,ry:.68,rz:.5};
function bellyGeo(){
  const g=new THREE.SphereGeometry(1,64,48),p=g.attributes.position,col=[],dark=new THREE.Color(.5,.33,.2),c=new THREE.Color();
  const lines=[.18,.29,.4,.51,.62,.73,.83];
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),t=(y+1)/2;
    let d=0;lines.forEach(l=>d+=Math.exp(-Math.pow((t-l)/.011,2)));d*=smooth(-.05,.4,z)*smooth(.02,.3,1-Math.abs(x));
    const k=1-.03*d;p.setXYZ(i,x*BC.rx*k,y*BC.ry,z*BC.rz*k+(z>0?.04*z*z:0));c.setRGB(1.04,1.02,1).lerp(dark,clamp(d,0,1)*.9);col.push(c.r,c.g,c.b)}
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeVertexNormals();return g}
function backPlateFn(y0,y1,flare){return (u,v)=>{
  const a=lerp(-2.15,2.15,u),y=lerp(y0,y1,v),t=clamp((y-BC.y)/BC.ry,-.97,.97),ring=Math.sqrt(1-t*t),f=1.075+flare*v*v;
  const x=Math.sin(a)*BC.rx*ring*f,z=-Math.cos(a)*BC.rz*ring*f+(Math.cos(a)<0?0:0);
  let sh=.9+.1*(1-v);sh*=1-.38*smooth(.9,1,v);sh*=1-.12*smooth(1.6,2.15,Math.abs(a));return [x,y,z,sh]}}
function tailFn(){return (u,v)=>{const a=lerp(-1.1,1.1,u),r=lerp(.04,.5,v);
  const x=Math.sin(a)*r*.82,y=-r*.62+Math.cos(a)*.035,z=-r*.72*(.75+.25*Math.cos(a));
  const rib=Math.pow(Math.abs(Math.sin(a*4.2)),36);let sh=.92-.35*rib*smooth(.15,.4,v);sh*=1-.35*smooth(.93,1,v);return [x,y,z,sh]}}
function shieldGeo(){ // cephalic shield over the crown: front edge forms the brow above the eyes
  const fn=(u,v)=>{const a=u*TAU,edge=lerp(1.08,2.05,(1-Math.cos(a))/2),th=v*edge;
    const x=Math.sin(th)*Math.sin(a)*.665,y=Math.cos(th)*.52,z=Math.sin(th)*Math.cos(a)*.56;let sh=1-.35*smooth(.9,1,v);return [x,y,z,sh]};
  return gridSolid(72,14,fn,.028,[0,0])}
function buildIsopod(opt){
  opt=opt||{};
  const TAN='#a9581f',shellMat=toon(TAN,{vertexColors:true,side:THREE.DoubleSide}),limbMat=toon('#a5561f'),coreMat=toon('#3a1c12');
  const eyeMat=new THREE.MeshPhysicalMaterial({color:'#160d0b',roughness:.08,clearcoat:1,clearcoatRoughness:.04,emissive:new THREE.Color('#ffffff'),emissiveIntensity:0});
  const white=new THREE.MeshBasicMaterial({color:'#ffffff'}),blushMat=new THREE.MeshBasicMaterial({color:'#ff7f72',transparent:true,opacity:.85,depthWrite:false});
  const bandMat=toon('#f6ecda',{side:THREE.DoubleSide}),lineMat=new THREE.MeshBasicMaterial({color:'#5a3216'}),clawMat=toon('#8e4718');
  const I={shellBase:new THREE.Color(TAN),limbBase:new THREE.Color('#a5561f'),root:new THREE.Group(),body:new THREE.Group(),joints:[],segs:[],legs:[],ant:[],mouth:[],eyes:[],shellMat,coreMat,limbMat,eyeMat,pleopods:[],oost:[],eggs:[],
    chara:true,focusH:1.25,reach:.8,shedBack:1.5,shedFront:1.3,blink:0,nextBlink:2+rnd()*3};
  I.root.add(I.body);
  const hips=new THREE.Group();hips.position.y=.6;I.body.add(hips);I.hips=hips;
  const torso=new THREE.Group();hips.add(torso);I.torso=torso;
  // belly (front, segmented)
  mk(bellyGeo(),shellMat,torso,[0,BC.y,0],null,.02);
  // back: overlapping tergite bands + leaf-like side flaps
  const back=new THREE.Group();torso.add(back);
  for(let i=0;i<7;i++){const y0=1.22-i*.19,y1=y0-.27;
    mk(gridSolid(48,8,backPlateFn(y0,y1,.07),.03,[rnd(),rnd()]),shellMat,back,null,null,.016);
    [-1,1].forEach(s=>{const fp=backPlateFn(y0,y1,.07)(s>0?1:0,.55);const lf=vc(new THREE.SphereGeometry(1,20,14).scale(.04,.17,.115));
      mk(lf,shellMat,back,[fp[0]*1.04,fp[1]-.04,fp[2]+.02],[.25,s*-.35,s*.32],.014)})}
  // tail fan (pleotelson)
  const tail=new THREE.Group();tail.position.set(0,.16,-.4);torso.add(tail);
  mk(gridSolid(40,10,tailFn(),.035,[0,0]),shellMat,tail,null,[-.35,0,0],.018);
  // tummy calcium spots (premolt)
  I.calcMat=toon('#fbf8f0',{transparent:true,opacity:0});I.calc=[];
  [[-.17,.32],[.15,.36],[-.05,.22],[.2,.2],[-.24,.45],[.06,.46]].forEach(([x,y])=>{const m=mk(new THREE.SphereGeometry(1,14,10).scale(.05,.035,.02),I.calcMat,torso,[x,y,BC.rz+.05-.08*Math.abs(x)],null,0,{noShadow:true});m.visible=false;I.calc.push(m)});
  // arms
  const arms=[];
  [-1,1].forEach(s=>{
    const sh=new THREE.Group();sh.position.set(s*.56,.98,.08);torso.add(sh);
    mk(vc(new THREE.SphereGeometry(.1,16,12)),shellMat,sh,[0,0,0],null,.014);
    const up=vc(new THREE.CapsuleGeometry(.082,.16,6,14));up.translate(0,-.15,0);mk(up,limbMat,sh,null,null,.014);
    const el=new THREE.Group();el.position.y=-.31;sh.add(el);
    mk(new THREE.TorusGeometry(.08,.018,8,20).rotateX(Math.PI/2),limbMat,el,null,null,.01);
    const fo=new THREE.CapsuleGeometry(.078,.14,6,14);fo.translate(0,-.14,0);mk(fo,limbMat,el,null,null,.014);
    const wr=new THREE.Group();wr.position.y=-.29;el.add(wr);
    mk(new THREE.SphereGeometry(1,16,12).scale(.095,.075,.075),limbMat,wr,[0,-.03,0],null,.012);
    const fingers=[-1,1].map(f=>{const fg=new THREE.Group();fg.position.set(f*.045,-.07,0);wr.add(fg);
      const cg=new THREE.ConeGeometry(.036,.17,12);cg.translate(0,-.085,0);const c=mk(cg,clawMat,fg,null,null,.011);
      const tip=new THREE.ConeGeometry(.02,.07,10);tip.translate(0,-.035,0);mk(tip,clawMat,c,[0,-.15,0],[0,0,-f*.7],.009);return {g:fg,f}});
    arms.push({s,sh,el,wr,fingers});
  });
  I.arms=arms;
  // legs
  const legs=[];
  [-1,1].forEach(s=>{
    const hp=new THREE.Group();hp.position.set(s*.25,.02,.02);hips.add(hp);
    const th=new THREE.CapsuleGeometry(.11,.1,6,14);th.translate(0,-.12,0);mk(th,limbMat,hp,null,null,.015);
    const kn=new THREE.Group();kn.position.y=-.27;hp.add(kn);
    mk(new THREE.TorusGeometry(.1,.02,8,20).rotateX(Math.PI/2),limbMat,kn,null,null,.01);
    const sn=new THREE.CapsuleGeometry(.1,.08,6,14);sn.translate(0,-.1,0);mk(sn,limbMat,kn,null,null,.015);
    const an=new THREE.Group();an.position.y=-.25;kn.add(an);
    mk(new THREE.SphereGeometry(1,18,12).scale(.13,.06,.16),limbMat,an,[0,-.02,.04],null,.013);
    [-1,0,1].forEach(t=>{const tg=new THREE.ConeGeometry(.034,.11,10);tg.rotateX(Math.PI/2);tg.translate(0,0,.055);mk(tg,clawMat,an,[t*.065,-.035,.17],[0,t*.25,0],.009)});
    const tip=new THREE.Object3D();tip.position.y=-.06;an.add(tip);
    legs.push({s,hp,kn,an,tip,down:false});
  });
  I.legs2=legs;
  I.minis=[];
  [.32,.56,.8].forEach((y,k)=>[-1,1].forEach(s=>{
    const g=new THREE.Group();g.position.set(s*.44,y,.3-.06*k);torso.add(g);
    const up=new THREE.CapsuleGeometry(.045,.1,5,10);up.translate(0,-.1,0);mk(up,limbMat,g,null,null,.01);
    const kn=new THREE.Group();kn.position.y=-.2;g.add(kn);
    const lo=new THREE.CapsuleGeometry(.04,.08,5,10);lo.translate(0,-.09,0);mk(lo,limbMat,kn,null,null,.01);
    const cl=new THREE.ConeGeometry(.03,.08,10);cl.translate(0,-.04,0);mk(cl,clawMat,kn,[0,-.17,0],null,.008);
    g.traverse(o=>o.userData.keep=true);g.scale.setScalar(.001);I.minis.push({g,kn,s,k})}));
  // head
  const head=new THREE.Group();head.position.set(0,1.27,.04);torso.add(head);I.head=head;
  mk(vc(new THREE.SphereGeometry(1,48,36).scale(.64,.5,.54)),shellMat,head,null,null,.022);
  mk(shieldGeo(),shellMat,head,[0,.005,0],null,.016);
  [-1,1].forEach(s=>{const e=vc(new THREE.SphereGeometry(1,20,14).scale(.07,.22,.17));mk(e,shellMat,head,[s*.6,-.13,.02],[0,0,s*.55],.016)}); // side lobes
  mk(vc(new THREE.SphereGeometry(1,20,12).scale(.15,.06,.07)),shellMat,head,[0,-.13,.48],null,.012); // clypeus
  [-1,1].forEach(s=>{
    const e=mk(new THREE.SphereGeometry(.135,32,24),eyeMat,head,[s*.24,.0,.43],null,.016,{keep:true});e.scale.set(1,1.05,.8);I.eyes.push(e);
    mk(new THREE.SphereGeometry(.036,14,10),white,e,[-.035,.05,.11],null,0,{keep:true,noShadow:true});
    mk(new THREE.SphereGeometry(.016,10,8),white,e,[.04,-.03,.115],null,0,{keep:true,noShadow:true});
    const bx=s*.36,by=-.12,bz=.54*Math.sqrt(Math.max(0,1-Math.pow(.36/.64,2)-Math.pow(.12/.5,2)));const nrm=new V3(bx/(.64*.64),by/(.5*.5),bz/(.54*.54)).normalize();const b=mk(new THREE.CircleGeometry(1,24).scale(.08,.05,1),blushMat,head,[bx+nrm.x*.012,by+nrm.y*.012,bz+nrm.z*.012],null,0,{keep:true,noShadow:true});b.lookAt(b.position.clone().add(nrm));b.renderOrder=2;
  });
  const mc=new THREE.CatmullRomCurve3([new V3(-.11,-.19,.5),new V3(-.05,-.22,.522),new V3(0,-.195,.53),new V3(.05,-.22,.522),new V3(.11,-.19,.5)]);
  mk(new THREE.TubeGeometry(mc,24,.012,6),lineMat,head,null,null,0,{keep:true,noShadow:true});
  // mouth: opens between the two tusks, below the wavy upper lip — dark red cavity with a pink tongue
  const mo=new THREE.Group();mo.position.set(0,-.25,.46);head.add(mo);mo.scale.set(1,.02,1);I.mouthOpen=mo;
  const cav=mk(new THREE.SphereGeometry(1,28,18).scale(.13,.135,.04),new THREE.MeshBasicMaterial({color:'#6e1712'}),mo,[0,-.11,0],null,.014,{keep:true,noShadow:true});
  mk(new THREE.SphereGeometry(1,24,14).scale(.09,.05,.022),new THREE.MeshBasicMaterial({color:'#e86d74'}),mo,[0,-.19,.02],null,0,{keep:true,noShadow:true});
  mk(new THREE.SphereGeometry(1,20,10,0,TAU,0,Math.PI/2).scale(.125,.03,.035),new THREE.MeshBasicMaterial({color:'#4a0f0b'}),mo,[0,-.015,.008],[Math.PI,0,0],0,{keep:true,noShadow:true});
  // cold-sweat drops for the shocked face
  const dropMat=new THREE.MeshBasicMaterial({color:'#cdeeff',transparent:true,opacity:.95});
  I.sweat=[[.05,.3,.46,.2],[.47,.12,.33,-.5],[-.42,.2,.38,.6]].map(([x,y,z,r])=>{const g=new THREE.Group();g.position.set(x,y,z);g.rotation.z=r;head.add(g);
    mk(new THREE.SphereGeometry(.03,14,10),dropMat,g,[0,0,0],null,.006,{keep:true,noShadow:true});const cn=new THREE.ConeGeometry(.026,.06,14);cn.translate(0,.035,0);mk(cn,dropMat,g,null,null,.006,{keep:true,noShadow:true});g.visible=false;return g});
  // tusk-like antennae hanging from under the face
  [-1,1].forEach(s=>{const root=new THREE.Group();root.position.set(s*.135,-.235,.425);root.rotation.set(-.55,0,s*.16);head.add(root);
    const chain=[root];let par=root;const L=[.13,.12,.11,.09],R=[.07,.06,.048,.034];
    L.forEach((l,i)=>{const g=new THREE.CylinderGeometry(R[i]*.9,R[i],l,14);g.translate(0,-l/2,0);mk(g,shellMat===null?limbMat:limbMat,par,null,null,.012);
      const nx=new THREE.Group();nx.position.y=-l;nx.rotation.x=.2;par.add(nx);chain.push(nx);par=nx});
    const tc=new THREE.ConeGeometry(.03,.1,14);tc.translate(0,-.04,0);mk(tc,limbMat,par,null,null,.01);
    I.ant.push({root,chain,s});});
  // angry brows — appear as the dark side takes over
  I.brows=[-1,1].map(s=>{const g=new THREE.CapsuleGeometry(.022,.13,4,10);g.rotateZ(Math.PI/2);const b=mk(g,new THREE.MeshBasicMaterial({color:'#2a120a'}),head,[s*.23,.17,.475],[-.15,0,s*.42],0,{keep:true,noShadow:true});b.visible=false;return b});
  // headband (hachimaki) with a knot and two tails at the back
  I.bandMat=bandMat;
  const band=new THREE.Group();band.position.set(0,.21,-.01);band.rotation.set(-.2,0,.05);head.add(band);I.band=band;
  const bg=new THREE.CylinderGeometry(1,1,.14,64,2,true),bp=bg.attributes.position;
  for(let i=0;i<bp.count;i++){const x=bp.getX(i),z=bp.getZ(i),a=Math.atan2(x,z);const r=1+Math.sin(a*9)*.008;bp.setXYZ(i,x*.665*r,bp.getY(i)*(1+Math.sin(a*5)*.06),z*.575*r)}bg.computeVertexNormals();
  mk(bg,bandMat,band,null,null,.014,{keep:true});
  mk(new THREE.SphereGeometry(1,16,12).scale(.07,.06,.05),bandMat,band,[0,0,-.58],null,.012,{keep:true});
  I.ribbons=[-1,1].map(s=>{const g=new THREE.Group();g.position.set(s*.03,-.01,-.6);band.add(g);const pg=new THREE.PlaneGeometry(.075,.26,1,6);pg.translate(0,-.13,0);
    const pp=pg.attributes.position;for(let i=0;i<pp.count;i++)pp.setZ(i,-Math.pow(-pp.getY(i),1.6)*.25);pg.computeVertexNormals();mk(pg,bandMat,g,null,[0,0,s*.3],.01,{keep:true});return g});
  // joints in the order the molt system expects: 0..4 anterior, 5..13 posterior
  const empty=()=>{const g=new THREE.Group();torso.add(g);return g};
  I.joints=[head,torso,arms[0].sh,arms[1].sh,empty(),back,tail,legs[0].hp,legs[1].hp,empty(),empty(),empty(),empty(),empty()];
  I.speck=()=>{const a=(rnd()-.5)*2.4,y=.25+rnd()*.85,t=clamp((y-BC.y)/BC.ry,-.97,.97),ring=Math.sqrt(1-t*t);return {parent:back,pos:new V3(Math.sin(a)*BC.rx*ring*1.13,y,-Math.cos(a)*BC.rz*ring*1.13)}};
  // brood pouch for the mother: an apron over the lower tummy holding big yolky eggs
  if(opt.female){
    const eggMat=new THREE.MeshPhysicalMaterial({color:'#ffd98a',roughness:.15,clearcoat:1,transparent:true,opacity:.85,emissive:new THREE.Color('#7a5414'),emissiveIntensity:.35});
    const dot=new THREE.MeshBasicMaterial({color:'#1a0e0a'});
    [[-.2,.36],[-.07,.33],[.06,.34],[.19,.37],[-.13,.22],[0,.2],[.13,.22]].forEach(([x,y])=>{const e=new THREE.Group();e.position.set(x,y,BC.rz+.11-.12*Math.abs(x));torso.add(e);
      mk(new THREE.SphereGeometry(.075,20,14),eggMat,e,null,null,.008);[-1,1].forEach(d=>mk(new THREE.SphereGeometry(.012,8,6),dot,e,[d*.022,.015,.065],null,0,{noShadow:true}));
      I.eggs.push({e,seg:3,x})});
    const pg=new THREE.Group();pg.position.set(0,.47,BC.rz+.06);torso.add(pg);
    const ap=gridSolid(24,8,(u,v)=>{const a=lerp(-.8,.8,u),y=-v*.36;return [Math.sin(a)*.42,y,Math.cos(a)*.18-.16+v*.05,.95-.2*smooth(.9,1,v)]},.02,[0,0]);
    const apron=mk(ap,toon('#e9b57a',{vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.92}),pg,null,null,.012);
    I.oost.push({g:pg,s:1,apron:true});
  }
  arms.forEach(A=>A.sh.traverse(o=>o.userData.keep=true));legs.forEach(L=>L.hp.traverse(o=>o.userData.keep=true));
  I.body.traverse(o=>{if(o.isMesh)o.userData.isopod=true});
  const cs=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.5),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uA:{value:.55}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 vUv;uniform float uA;void main(){vec2 p=(vUv-.5)*2.;float d=length(p);gl_FragColor=vec4(0.,0.,0.,smoothstep(1.,.15,d)*uA);}'}));
  cs.rotation.x=-Math.PI/2;cs.renderOrder=1;scene.add(cs);I.contact=cs;CONTACTS.push(cs);
  I.newShellMat=shellMat.clone();addCaustics(I.newShellMat,.12);I.newShellMat.color.set('#e0a573');
  I.newLimbMat=limbMat.clone();addCaustics(I.newLimbMat,.12);I.newLimbMat.color.set('#dba077');
  scene.add(I.root);
  return I;
}
function newPose(){return {crawl:0,peri:0,periA:0,pos:new V3(),yaw:0,walk:0,gait:0,turn:0,curl:0,lift:0,swim:0,eat:0,talk:0,startle:0,rear:0,pouch:0,legs7:true,size:1,yOverride:null,wave:0}}
function poseIsopod(I,P,dt,time){
  const sc=P.size;I.root.scale.setScalar(sc);
  const gy=heightAt(P.pos.x,P.pos.z);
  const swimY=(1.6+Math.sin(time*.7)*.25)*Math.max(sc,.5);
  I.root.position.set(P.pos.x,P.yOverride!==null&&P.yOverride!==undefined?P.yOverride:lerp(gy,gy+swimY,smooth(0,1,P.swim)),P.pos.z);
  I.root.rotation.y=P.yaw;
  const g=P.gait,ph=P.walk*.55,st=Math.sin(ph),fl=P.flip||0,sl=P.sleep||0,sw=P.swim,cu=P.curl,mol=(P.peri||0)+(P.periA||0);
  // body: waddle, bob, lie down when weak, swim belly-down
  I.body.position.y=Math.abs(Math.cos(ph))*.07*g+Math.sin(time*1.7)*.008-cu*.3-sl*.12+fl*.42+sw*.3;
  I.body.rotation.x=-fl*1.5+sw*1.35+P.eat*.08;
  I.body.rotation.z=st*.08*g-P.turn*.07+Math.sin(time*11)*.04*mol;
  I.body.position.z=-fl*.3;
  // legs
  I.legs2.forEach(L=>{const s=L.s,k=s>0?st:-st,kick=Math.sin(time*7+s*1.6);
    L.hp.rotation.x=-k*.55*g-cu*1.25-sl*1.05-sw*(.2+kick*.45)+fl*Math.sin(time*2.2+s)*.4;
    L.kn.rotation.x=Math.max(0,k)*.75*g+cu*2.0+sl*1.7+sw*(.4+kick*.3)+fl*(.6+Math.sin(time*2.6+s)*.3);
    L.an.rotation.x=-L.kn.rotation.x*.45+L.hp.rotation.x*-.3;
    L.hp.rotation.z=-s*(.04+cu*.15+sl*.25);
    const down=k<-.9&&g>.25;if(down&&!L.down&&rnd()<.6*sc){const w=new V3();L.tip.getWorldPosition(w);w.y=heightAt(w.x,w.z);puff(w,1)}L.down=down;});
  // torso
  I.torso.rotation.x=-P.lift*.06+P.eat*.32+cu*.45+P.rear*.12+Math.sin(time*1.7)*.012;
  I.torso.rotation.y=-st*.1*g;
  I.joints[6].rotation.y=Math.sin(time*1.3)*.12+st*.15*g;I.joints[6].rotation.x=-sw*.6+Math.sin(time*8)*.15*sw;
  // arms: swing, wave, cover face when curled, bring food to mouth, paddle when swimming
  P.wave=Math.max(0,(P.wave||0)-dt);
  const wdur=P.waveDur||2.6,shk=smooth(.15,.6,Math.min(1,P.startle));
  I.arms.forEach(A=>{const s=A.s,k=s>0?-st:st,wv=s<0?smooth(0,.35,P.wave)*smooth(0,.35,wdur-P.wave):0;
    const pad=Math.sin(time*6+s*1.8);
    A.sh.rotation.x=k*.5*g-cu*1.9-P.eat*1.25-P.rear*.6-sw*(1.4+pad*.8)+fl*Math.sin(time*2+s)*.5+Math.sin(time*1.4+s)*.04-wv*.3;
    A.sh.rotation.z=s*(.32+sl*.15+P.rear*.5+wv*2.3)+(P.talk>0?Math.sin(time*4+s)*.06:0);
    A.sh.rotation.x-=shk*2.35;A.sh.rotation.z+=s*shk*.55;
    A.el.rotation.x=-.18-cu*1.3-P.eat*1.6-wv*.2-sw*.3-shk*1.75;
    A.el.rotation.z=s*wv*-.6;
    A.wr.rotation.z=wv*Math.sin(time*10)*.55;
    const open=.18+(P.talk>0?Math.abs(Math.sin(time*7+s))*.35:0)+(P.eat?Math.abs(Math.sin(time*9))*.4:0)+Math.min(1,P.startle)*.4;
    A.fingers.forEach(F=>F.g.rotation.z=F.f*open);
  });
  // head
  const H=I.head;H.rotation.x=-smooth(.15,.6,Math.min(1,P.startle))*.22-P.lift*.16+P.eat*.25+cu*.6+sl*.4+P.rear*.45+Math.sin(time*1.1)*.03;
  H.rotation.z=Math.sin(time*.7)*.05+(P.talk>0?Math.sin(time*5.5)*.06:0)+sl*.18;
  H.position.y=1.27+Math.sin(time*1.7+.5)*.008;
  // eyes: blink, close when asleep or curled, widen when startled
  I.nextBlink-=dt;if(I.nextBlink<0){I.blink=.14;I.nextBlink=2.2+rnd()*4}I.blink=Math.max(0,I.blink-dt);
  const close=Math.max(I.blink>0?1:0,sl,smooth(.5,.9,cu));const ey=lerp(1.05,.08,close)*(1+Math.min(1,P.startle)*.15);
  I.eyes.forEach(e=>{e.scale.y=ey;e.scale.x=1+Math.min(1,P.startle)*.12});
  const shock=smooth(.15,.6,Math.min(1,P.startle));
  const mOpen=Math.max(P.talk>0?.25+Math.abs(Math.sin(time*13))*.75:0,P.eat?Math.abs(Math.sin(time*9))*.7:0,shock*1.15,.02);
  I.mouthOpen.scale.set(1+shock*.15,mOpen,1);
  I.sweat.forEach((d,i)=>{d.visible=shock>.05;d.position.y+=0;d.scale.setScalar(.6+shock*.5+Math.sin(time*8+i)*.04)});
  I.ant.forEach((a,ai)=>{a.root.rotation.x=-.55+Math.sin(time*1.3+ai)*.07+(P.talk>0?Math.sin(time*6+ai)*.1:0)-P.eat*.3+sl*.25;
    a.chain.forEach((c,i)=>{if(i)c.rotation.x=.2+Math.sin(time*1.6-i*.5+ai)*.05})});
  if(I.band){I.band.visible=P.legs7!==false;I.ribbons.forEach((r,i)=>{r.rotation.x=.2+Math.sin(time*2.4+i)*.18+sw*.6+g*.25;r.rotation.y=Math.sin(time*1.7+i*2)*.15})}
  I.oost.forEach(o=>{o.g.rotation.x=P.pouch*1.25});
  I.eyeMat.emissiveIntensity=(1-U.lamp.value)*.06*(1-close);
  const cr=P.crawl||0;
  if(cr>.001){
    const cph=P.walk*.9,cst=Math.sin(cph);
    I.torso.rotation.x=lerp(I.torso.rotation.x,1.42+cu*.5+P.eat*.08+Math.sin(time*1.7)*.01,cr);I.torso.rotation.y=lerp(I.torso.rotation.y,-cst*.06*g,cr);
    H.rotation.x=lerp(H.rotation.x,-1.33+P.eat*.4+cu*.6+sl*.3-P.lift*.25+Math.sin(time*1.1)*.04,cr);
    I.body.position.y=lerp(I.body.position.y,Math.abs(Math.cos(cph))*.02*g+Math.sin(time*1.7)*.005-cu*.12,cr);
    I.body.rotation.z=lerp(I.body.rotation.z,cst*.03*g-P.turn*.04,cr);
    I.arms.forEach(A=>{const s=A.s,k=s>0?-cst:cst,lift=Math.max(0,k);
      A.sh.rotation.x=lerp(A.sh.rotation.x,-1.45+k*.42*g-cu*.6,cr);A.sh.rotation.z=lerp(A.sh.rotation.z,s*(.42+cu*.3),cr);
      A.el.rotation.x=lerp(A.el.rotation.x,.25+lift*.5*g+cu*1.2,cr);A.el.rotation.z=lerp(A.el.rotation.z,0,cr);A.wr.rotation.z=lerp(A.wr.rotation.z,0,cr)});
    I.legs2.forEach(L=>{const s=L.s,k=s>0?cst:-cst;
      L.hp.rotation.x=lerp(L.hp.rotation.x,-k*.45*g-.15-cu*.9,cr);L.kn.rotation.x=lerp(L.kn.rotation.x,.3+Math.max(0,k)*.5*g+cu*1.4,cr);L.an.rotation.x=lerp(L.an.rotation.x,-.1,cr)});
    I.joints[6].rotation.x=lerp(I.joints[6].rotation.x,-.75,cr);
  }
  I.minis.forEach(m=>{const v=Math.max(.001,smooth(.15,.85,cr));m.g.scale.setScalar(v);m.g.visible=v>.01;
    const p2=P.walk*.9*2+m.k*1.1+(m.s>0?Math.PI:0),sw2=Math.sin(p2);
    m.g.rotation.x=-1.45+sw2*.42*P.gait-cu*.5;m.g.rotation.z=m.s*.5;m.kn.rotation.x=.45+Math.max(0,-sw2)*.5*P.gait+cu*1.2});
  I.focusH=lerp(1.25,.62,cr);
  I.contact.position.set(P.pos.x,gy+.02,P.pos.z);I.contact.rotation.z=P.yaw;I.contact.scale.set(sc,sc*(1+cr*.7),sc);
  I.contact.material.uniforms.uA.value=.55*(1-smooth(0,.7,P.swim))*(.5+.5*U.lamp.value)*(P.yOverride!==null&&P.yOverride!==undefined?.3:1);
}
function yuru(t){
  if(!t||/^（/.test(t))return t;
  t=t.replace(/ワタクシ/g,'ボク').replace(/ワシ/g,'ボク').replace(/オマエ/g,'あなた');
  if(S&&S.stage>=1&&!/グソ[。！？…]*$/.test(t)&&Math.random()<.7)t=t.replace(/([^。！？…、])([。！？]?)$/,(m,a,b)=>a+'グソ'+(b||'。'));
  return t;
}
