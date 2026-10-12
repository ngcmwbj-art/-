// 量子力学 × スピリチュアル：量子メモ（本当の物理とゲームでの扱い）、量子の祠、シュレディンガーの箱
import * as THREE from 'three';

// 初めて起きた量子現象のたびに出すカード。物理の説明は本物、言い伝えはゲームの中の世界観
export const MEMOS = {
  superposition: {
    title: '重ね合わせ',
    physics: '電子や光子などの量子は、観測されるまで「ここにいる」と「あそこにいる」が重なり合ったまま存在する。',
    game: '大ボスは紫に揺れる分身として現れる。どれも「本物かもしれない」状態。',
    lore: '形あるものは、見つめられるまで定まらぬ。',
  },
  observe: {
    title: '観測と波動関数の収縮',
    physics: '測定すると、重なっていた可能性はひとつの結果に定まる。これを「波動関数の収縮」と呼ぶ。',
    game: '観測した範囲に本物がいれば実体化して攻撃が効く。いなければ、その分身だけが消える。',
    lore: '見ることは、選ぶこと。',
  },
  decoherence: {
    title: 'デコヒーレンス',
    physics: '量子が空気や光など周りの環境と触れ合うと、重ね合わせはすぐに壊れる。だから身の回りの物は分身しない。',
    game: '放っておいた本物がキャベツに触れると、勝手に実体化して畑を荒らす。',
    lore: '世に触れたものは、ひとつの姿に還る。',
  },
  entangle: {
    title: '量子もつれ',
    physics: 'もつれた2つの粒子は、どれだけ離れていても測定結果が連動する。アインシュタインは「不気味な遠隔作用」と呼んだ。※実際には情報や力を送ることはできない。',
    game: '赤い糸で結ばれた雑魚は、片方を叩くともう片方も同じだけ傷つく（ここはゲームの演出）。',
    lore: '縁は、距離を越える。',
  },
  tunnel: {
    title: 'トンネル効果',
    physics: '粒子は、本来越えられない壁の向こうに、ある確率で「すり抜けて」現れる。太陽の核融合や半導体でも起きている。',
    game: 'テレポートと避雷針は、この確率の抜け道を使って物を移す。',
    lore: '閉ざされた道にも、通り抜ける隙間がある。',
  },
  uncertainty: {
    title: '不確定性原理',
    physics: '位置を正確に決めるほど、運動量（勢いの向きと大きさ）は不確かになる。ハイゼンベルクが示した、自然そのものの性質。',
    game: '結界で敵の位置を縛ると、解けた瞬間にどこへ飛ぶかわからない。畑から遠くへ弾き飛ばされることも。',
    lore: '縛れば、放たれる。',
  },
  zeno: {
    title: '量子ゼノン効果',
    physics: '同じ状態を何度も何度も観測し続けると、状態の変化が起こりにくくなる。「見つめる鍋は煮えない」の量子版。',
    game: '観測ライトに照らされ続けた敵は、動きが鈍くなる。',
    lore: '見守る眼差しは、嵐の歩みをとどめる。',
  },
  schrodinger: {
    title: 'シュレディンガーの猫',
    physics: '箱の中の猫は、開けるまで「生きている」と「死んでいる」が重なっている ― 重ね合わせの奇妙さを示した思考実験。',
    game: 'シュレディンガーの箱は、台風が過ぎて開けるまで中身が決まらない。半分の確率で黄金キャベツ。',
    lore: '箱を開けるまで、福も禍も同じ重さ。',
  },
  manyworlds: {
    title: '多世界解釈',
    physics: '観測のたびに世界が枝分かれし、起こりうる結果はすべて、どこかの世界で実現しているという考え方もある。',
    game: 'この世界線で畑が負けても、別の世界線のマサトはまだ戦っている。もう一度、選び直そう。',
    lore: '分かれた道の先にも、同じ空がある。',
  },
  shrine: {
    title: '量子の祠',
    physics: '量子力学では「観測する者」と「観測される世界」をきれいに切り分けられない。観測の意味は、今も物理学者のあいだで議論が続いている。',
    game: '準備タイムに祠の前で手を合わせると、その台風のあいだ御利益が宿る。※御利益はゲームの中だけのおまじない。',
    lore: '心を澄ませば、波は凪ぐ。',
  },
};

// 祠の御利益
export const BLESSINGS = [
  { id: 'hado', name: '波動上昇', text: 'ギターの音波の威力が 1.3 倍に' },
  { id: 'kekkai', name: '結界のご加護', text: 'キャベツが受ける被害が 3 割減る' },
  { id: 'senrigan', name: '千里眼', text: '大ボスが最初から正体を現す' },
  { id: 'en', name: '縁の道', text: 'テレポートと結界の待ち時間が半分に' },
];

const toonize = (m) => m; // toonify はシーン追加後にまとめてかける

// 量子の祠：朱色の鳥居・小さな祠・注連縄と紙垂
export function buildShrine() {
  const g = new THREE.Group();
  const red = toonize(new THREE.MeshStandardMaterial({ color: '#d2402a', roughness: 0.6 }));
  const black = toonize(new THREE.MeshStandardMaterial({ color: '#1e1c1a', roughness: 0.6 }));
  const wood = toonize(new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: 0.8 }));
  const roof = toonize(new THREE.MeshStandardMaterial({ color: '#3d4a3a', roughness: 0.6 }));
  const rope = toonize(new THREE.MeshStandardMaterial({ color: '#d8c38a', roughness: 0.9 }));
  const paper = toonize(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, side: THREE.DoubleSide }));
  const stone = toonize(new THREE.MeshStandardMaterial({ color: '#9a978f', roughness: 0.9 }));
  const glow = new THREE.MeshStandardMaterial({ color: '#c9b8ff', emissive: '#a98bff', emissiveIntensity: 2 });
  // 鳥居
  const torii = new THREE.Group(); torii.position.z = 6;
  for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 4.6, 14), red); p.position.set(sx * 1.8, 2.3, 0); torii.add(p);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 14), black); b.position.set(sx * 1.8, 0.15, 0); torii.add(b);
  }
  const kasagi = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.32, 0.5), black); kasagi.position.y = 4.75; torii.add(kasagi);
  const shimaki = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.24, 0.42), red); shimaki.position.y = 4.5; torii.add(shimaki);
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.22, 0.25), red); nuki.position.y = 3.7; torii.add(nuki);
  g.add(torii);
  // 祠
  const hokora = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.8), stone); base.position.y = 0.25; hokora.add(base);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.1), wood); body.position.y = 1.2; hokora.add(body);
  const r = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.8, 3), roof); r.rotation.z = Math.PI / 2; r.rotation.y = Math.PI / 2; r.scale.set(0.6, 1, 1); r.position.y = 2.2; hokora.add(r);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), glow); orb.position.set(0, 1.25, 0.58); hokora.add(orb);
  // 注連縄と紙垂
  const sh = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.07, 6, 24, Math.PI), rope); sh.rotation.z = Math.PI; sh.position.set(0, 1.85, 0.58); hokora.add(sh);
  for (const x of [-0.45, 0, 0.45]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.4), paper); s.position.set(x, 1.45, 0.62); hokora.add(s);
  }
  g.add(hokora);
  // 石灯籠
  for (const sx of [-1, 1]) {
    const l = new THREE.Group(); l.position.set(sx * 2.6, 0, 3);
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.2, 8), stone); a.position.y = 0.6; l.add(a);
    const fire = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), new THREE.MeshStandardMaterial({ color: '#ffe0a0', emissive: '#ffb050', emissiveIntensity: 1.5 })); fire.position.y = 1.4; l.add(fire);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.4, 6), stone); cap.position.y = 1.85; l.add(cap);
    g.add(l);
  }
  // 参拝の輪
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.8, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#c9b8ff', transparent: true, opacity: 0.6, depthWrite: false, fog: false }));
  ring.position.set(0, 0.3, 3.2); g.add(ring);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData = { ring, orb, prayPoint: new THREE.Vector3(0, 0, 3.2) };
  return g;
}

// シュレディンガーの箱：木箱に「?」
export function buildBox() {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#9a7246'; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = '#5a3f22'; x.lineWidth = 8; x.strokeRect(4, 4, 120, 120);
  x.font = 'bold 84px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#2a1a0c'; x.fillText('?', 64, 70);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
  box.position.y = 0.8; g.add(box);
  // 猫の耳（重ね合わせの気配）
  const ghost = new THREE.MeshStandardMaterial({ color: '#c9b8ff', emissive: '#8a6aff', emissiveIntensity: 1.2, transparent: true, opacity: 0.55 });
  const ghosts = [];
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 4), ghost); e.position.set(sx * 0.35, 1.8, 0); g.add(e); ghosts.push(e); }
  g.userData = { box, ghosts };
  return g;
}
