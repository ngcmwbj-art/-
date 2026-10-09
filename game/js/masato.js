// 主人公マサト：金髪マッシュ・満面の笑み・黒T・斜め掛けストラップのギター
import * as THREE from 'three';
import { lerp } from './util.js';

const M = {
  skin: new THREE.MeshPhysicalMaterial({ color: '#d99a72', roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color('#ffb59a') }),
  hair: new THREE.MeshPhysicalMaterial({ color: '#cfa560', roughness: 0.42, sheen: 1, sheenColor: new THREE.Color('#fff0c0'), sheenRoughness: 0.35 }),
  hairDark: new THREE.MeshStandardMaterial({ color: '#8a6a3a', roughness: 0.6 }),
  shirt: new THREE.MeshStandardMaterial({ color: '#1c1c1f', roughness: 0.95 }),
  jeans: new THREE.MeshStandardMaterial({ color: '#2d3a52', roughness: 0.9 }),
  shoe: new THREE.MeshStandardMaterial({ color: '#3b2b20', roughness: 0.7 }),
  strap: new THREE.MeshStandardMaterial({ color: '#9b8462', roughness: 0.85 }),
  eye: new THREE.MeshStandardMaterial({ color: '#1d130e', roughness: 0.3 }),
  mouth: new THREE.MeshStandardMaterial({ color: '#4a1a18', roughness: 0.6 }),
  teeth: new THREE.MeshStandardMaterial({ color: '#f6f1e6', roughness: 0.3 }),
  cheek: new THREE.MeshStandardMaterial({ color: '#e08a78', roughness: 0.7, transparent: true, opacity: 0.55 }),
  guitar: new THREE.MeshPhysicalMaterial({ color: '#b51f2c', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 }),
  guard: new THREE.MeshStandardMaterial({ color: '#f1ede4', roughness: 0.4 }),
  neck: new THREE.MeshStandardMaterial({ color: '#6b4325', roughness: 0.6 }),
  metal: new THREE.MeshStandardMaterial({ color: '#d7d9dc', metalness: 1, roughness: 0.25 }),
  qglow: new THREE.MeshStandardMaterial({ color: '#8ff6ff', emissive: '#40e8ff', emissiveIntensity: 3 }),
};

function cap(r, len, mat, seg = 10) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, seg), mat);
  m.castShadow = true;
  return m;
}

function buildGuitar() {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  // ダブルカッタウェイ風のボディ
  s.moveTo(0, -0.24);
  s.bezierCurveTo(0.22, -0.24, 0.26, -0.05, 0.17, 0.04);
  s.bezierCurveTo(0.24, 0.12, 0.2, 0.26, 0.12, 0.27);
  s.bezierCurveTo(0.08, 0.2, 0.05, 0.15, 0.0, 0.15);
  s.bezierCurveTo(-0.05, 0.15, -0.08, 0.22, -0.11, 0.3);
  s.bezierCurveTo(-0.2, 0.28, -0.24, 0.12, -0.17, 0.04);
  s.bezierCurveTo(-0.26, -0.05, -0.22, -0.24, 0, -0.24);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 24 }), M.guitar);
  body.position.z = -0.03;
  g.add(body);
  const guard = new THREE.Mesh(new THREE.CircleGeometry(0.09, 20), M.guard);
  guard.position.set(0.06, -0.05, 0.03); guard.scale.set(1.2, 0.8, 1);
  g.add(guard);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, 0.025), M.neck);
  neck.position.y = 0.45; g.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.16, 0.022), M.shirt);
  head.position.y = 0.83; head.rotation.z = 0.08; g.add(head);
  for (let i = 0; i < 2; i++) {
    const pu = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.015), M.shirt);
    pu.position.set(0, -0.02 + i * 0.09, 0.035); g.add(pu);
  }
  const strings = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.98, 0.004), M.metal);
  strings.position.set(0, 0.3, 0.036); g.add(strings);
  // 量子ピックアップ（発光）
  const q = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 8, 24), M.qglow);
  q.position.set(-0.11, -0.12, 0.035); g.add(q);
  g.userData.q = q;
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function createMasato() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const hips = new THREE.Group();
  hips.position.y = 0.95;
  body.add(hips);

  // 胴体（がっしり体型）
  const torso = new THREE.Group();
  hips.add(torso);
  const chest = cap(0.27, 0.36, M.shirt, 14);
  chest.scale.set(1.18, 1, 0.82);
  chest.position.y = 0.33;
  torso.add(chest);
  const belly = cap(0.25, 0.1, M.shirt, 14);
  belly.scale.set(1.12, 1, 0.9);
  belly.position.set(0, 0.12, 0.02);
  torso.add(belly);
  const pelvis = cap(0.22, 0.08, M.jeans, 12);
  pelvis.scale.set(1.15, 1, 0.85);
  pelvis.position.y = -0.03;
  torso.add(pelvis);

  // 斜め掛けストラップ（左肩→右腰）
  const strapF = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.82, 0.015), M.strap);
  strapF.position.set(0.0, 0.33, 0.25); strapF.rotation.z = 0.72; strapF.rotation.x = -0.12;
  const strapB = strapF.clone();
  strapB.position.z = -0.235; strapB.rotation.x = 0.12;
  const strapTop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.5), M.strap);
  strapTop.position.set(-0.2, 0.63, 0);
  torso.add(strapF, strapB, strapTop);

  // 首と頭
  const neck = cap(0.08, 0.06, M.skin);
  neck.position.y = 0.66;
  torso.add(neck);
  const head = new THREE.Group();
  head.position.y = 0.83;
  torso.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 24), M.skin);
  skull.scale.set(1.0, 1.07, 1.02);
  skull.castShadow = true;
  head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), M.skin);
  jaw.position.set(0, -0.07, 0.025); jaw.scale.set(1.08, 0.8, 1);
  head.add(jaw);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), M.skin);
    ear.position.set(sx * 0.17, -0.01, 0); ear.scale.set(0.5, 1, 0.8);
    head.add(ear);
  }

  // 金髪マッシュ：頭頂を覆うキャップ＋前髪の束
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.192, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.56), M.hair);
  hairCap.scale.set(1.04, 1.1, 1.07);
  hairCap.rotation.x = -0.28;
  hairCap.position.y = 0.012;
  hairCap.castShadow = true;
  head.add(hairCap);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.35), M.hairDark);
  crown.position.y = 0.07; crown.scale.set(1.1, 1.0, 1.1);
  head.add(crown);
  // 前髪：丸みのある束を重ねてマッシュの重めバングに
  for (let i = 0; i < 17; i++) {
    const a = (i / 16 - 0.5) * 2.4;
    const len = 0.05 + Math.abs(Math.sin(i * 2.3)) * 0.015 - Math.abs(a) * 0.008;
    const strand = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, len, 3, 8), M.hair);
    strand.scale.set(1.5, 1, 0.55);
    strand.rotation.order = 'YXZ';
    strand.rotation.y = a;
    strand.rotation.x = 0.22;
    strand.position.set(Math.sin(a) * 0.188, 0.062 - len * 0.3, Math.cos(a) * 0.183);
    head.add(strand);
  }
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), M.hair);
    side.position.set(sx * 0.17, 0.0, -0.02); side.scale.set(0.45, 1.1, 1.2);
    head.add(side);
  }

  // 顔：にっこり目・眉・大きな笑顔
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0065, 6, 14, Math.PI), M.eye);
    eye.position.set(sx * 0.062, 0.005, 0.163);
    eye.rotation.x = -0.15;
    head.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.009, 0.01), M.hairDark);
    brow.position.set(sx * 0.064, 0.05, 0.168); brow.rotation.z = -sx * 0.12;
    head.add(brow);
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), M.cheek);
    cheek.position.set(sx * 0.095, -0.045, 0.14); cheek.scale.set(1, 0.6, 0.4);
    head.add(cheek);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), M.skin);
  nose.position.set(0, -0.022, 0.178); nose.scale.set(1.15, 0.9, 1);
  head.add(nose);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.062, 24, Math.PI, Math.PI), M.mouth);
  mouth.position.set(0, -0.068, 0.168); mouth.rotation.x = -0.2; mouth.scale.set(1, 0.75, 1);
  head.add(mouth);
  const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.018, 0.01), M.teeth);
  teeth.position.set(0, -0.076, 0.172); teeth.rotation.x = -0.2;
  head.add(teeth);

  // 腕
  function arm(side) {
    const sh = new THREE.Group();
    sh.position.set(side * 0.34, 0.52, 0);
    torso.add(sh);
    const sleeve = cap(0.105, 0.12, M.shirt);
    sleeve.position.y = -0.08;
    sh.add(sleeve);
    const upper = cap(0.075, 0.2, M.skin);
    upper.position.y = -0.16;
    sh.add(upper);
    const el = new THREE.Group();
    el.position.y = -0.3;
    sh.add(el);
    const fore = cap(0.065, 0.2, M.skin);
    fore.position.y = -0.13;
    el.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), M.skin);
    hand.position.y = -0.3; hand.scale.set(0.9, 1.1, 0.7);
    hand.castShadow = true;
    el.add(hand);
    return { sh, el };
  }
  const armL = arm(1), armR = arm(-1);

  // 脚
  function leg(side) {
    const hp = new THREE.Group();
    hp.position.set(side * 0.13, -0.05, 0);
    hips.add(hp);
    const thigh = cap(0.1, 0.28, M.jeans);
    thigh.position.y = -0.2;
    hp.add(thigh);
    const kn = new THREE.Group();
    kn.position.y = -0.42;
    hp.add(kn);
    const shin = cap(0.085, 0.28, M.jeans);
    shin.position.y = -0.2;
    kn.add(shin);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.27), M.shoe);
    shoe.position.set(0, -0.43, 0.05);
    shoe.castShadow = true;
    kn.add(shoe);
    return { hp, kn };
  }
  const legL = leg(1), legR = leg(-1);

  const guitar = buildGuitar();
  guitar.position.set(-0.04, 0.12, 0.3);
  guitar.rotation.set(0.05, 0, -1.05);
  torso.add(guitar);

  root.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });

  let walk = 0, strum = 0, strumSide = 1, solo = 0;
  return {
    root, guitar, head,
    strum() { strum = 1; strumSide *= -1; },
    // speedN: 0..1（歩き→走り）, air: 空中か
    update(dt, t, speedN, air, soloOn, stunned) {
      walk += dt * (4 + speedN * 7) * (speedN > 0.02 ? 1 : 0);
      strum = Math.max(0, strum - dt * 4.5);
      solo = lerp(solo, soloOn ? 1 : 0, 1 - Math.exp(-8 * dt));
      const sw = Math.sin(walk) * (0.25 + speedN * 0.55) * Math.min(1, speedN * 4);
      const breathe = Math.sin(t * 2.2) * 0.012;

      body.position.y = Math.abs(Math.cos(walk)) * 0.06 * Math.min(1, speedN * 3) + breathe;
      torso.rotation.x = speedN * 0.18 + (stunned ? Math.sin(t * 20) * 0.1 : 0);
      torso.rotation.y = Math.sin(walk) * 0.08 * speedN;
      head.rotation.y = -torso.rotation.y;
      head.rotation.x = -torso.rotation.x * 0.5 + (soloOn ? -0.35 : 0) + strum * 0.1;

      legL.hp.rotation.x = air ? -0.7 : sw;
      legR.hp.rotation.x = air ? -0.3 : -sw;
      legL.kn.rotation.x = air ? 1.1 : Math.max(0, -Math.sin(walk + 1.2)) * (0.3 + speedN * 0.8);
      legR.kn.rotation.x = air ? 0.6 : Math.max(0, Math.sin(walk + 1.2)) * (0.3 + speedN * 0.8);

      // 左手はネック、右手はストローク
      const play = Math.max(strum, solo, 0.35);
      armL.sh.rotation.set(lerp(-sw, -1.0, play), 0, lerp(0.08, 0.55, play));
      armL.el.rotation.set(lerp(-0.3, -1.3, play), 0, 0);
      const stroke = strum * Math.sin(strum * Math.PI) * strumSide + (soloOn ? Math.sin(t * 40) * 0.25 : 0);
      armR.sh.rotation.set(lerp(sw, -0.5, play) + stroke * 0.5, 0, lerp(-0.08, -0.25, play));
      armR.el.rotation.set(lerp(-0.3, -1.25, play) + stroke * 0.4, 0, 0);

      guitar.rotation.z = -1.05 + strum * 0.06;
      guitar.userData.q.material.emissiveIntensity = 2 + strum * 10 + solo * 12;
    },
  };
}
