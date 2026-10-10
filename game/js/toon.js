// BotW 風のトゥーン表現：段階的な陰影＋リムライト＋キャラの輪郭線
import * as THREE from 'three';

// 陰影の段階（影 → 中間 → 光）。少しだけ境目をなじませる
function makeGradient() {
  const v = [92, 92, 150, 222, 255, 255];
  const data = new Uint8Array(v.length * 4);
  v.forEach((x, i) => data.set([x, x, x, 255], i * 4));
  const t = new THREE.DataTexture(data, v.length, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}
const GRADIENT = makeGradient();
// 肌用：段差を細かくして柔らかく
const GRADIENT_SOFT = (() => {
  const v = [150, 170, 192, 214, 234, 248, 255, 255];
  const data = new Uint8Array(v.length * 4);
  v.forEach((x, i) => data.set([x, x, x, 255], i * 4));
  const tex = new THREE.DataTexture(data, v.length, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
  return tex;
})();

// 全トゥーン材質で共有するリムライト（逆光の縁取り）
export const RIM = { uRimColor: { value: new THREE.Color('#fff3d9') }, uRim: { value: 0.55 } };

const cache = new Map();

export function toToon(m) {
  if (!m || !(m.isMeshStandardMaterial)) return m;
  if (cache.has(m)) return cache.get(m);
  const t = new THREE.MeshToonMaterial({
    color: m.color, map: m.map, vertexColors: m.vertexColors, side: m.side,
    transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite,
    emissive: m.emissive, emissiveIntensity: m.emissiveIntensity,
    polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits,
    gradientMap: m.userData.soft ? GRADIENT_SOFT : GRADIENT,
  });
  // 光沢のある素材（ギター・金属）は縁を強めに
  const rimMul = m.metalness > 0.5 || m.clearcoat > 0 ? 1.4 : 1;
  const inner = m.onBeforeCompile && m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile ? m.onBeforeCompile : null;
  t.onBeforeCompile = (shader, r) => {
    if (inner) inner(shader, r);
    shader.uniforms.uRimColor = RIM.uRimColor;
    shader.uniforms.uRim = RIM.uRim;
    shader.uniforms.uRimMul = { value: rimMul };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor; uniform float uRim; uniform float uRimMul;')
      .replace('#include <opaque_fragment>', /* glsl */`
        {
          vec3 vd = normalize(vViewPosition);
          float fr = 1. - max(dot(normal, -vd), 0.);
          float rim = smoothstep(.62, .78, fr) * uRim * uRimMul;
          outgoingLight += uRimColor * rim * diffuseColor.rgb * 1.2;
        }
        #include <opaque_fragment>`);
  };
  t.customProgramCacheKey = () => 'toon|' + (inner ? inner.toString() : '');
  // 元の材質の発光強度を書き換える処理（窓の明かり・アンプの光など）をそのまま効かせる
  Object.defineProperty(t, 'emissiveIntensity', { get: () => m.emissiveIntensity, set: (v) => { m.emissiveIntensity = v; } });
  cache.set(m, t);
  return t;
}

export function toonify(root) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    if (Array.isArray(o.material)) o.material = o.material.map(toToon);
    else o.material = toToon(o.material);
  });
}

// 背面法線押し出しによる輪郭線（キャラクター用）
const outlineMat = new THREE.MeshBasicMaterial({ color: '#2a1d14', side: THREE.BackSide, fog: true });
outlineMat.onBeforeCompile = (s) => {
  s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = vec3( position ) + normal * 0.008;');
};
export function addOutline(root, minSize = 0.05) {
  const list = [];
  root.traverse((o) => {
    if (!o.isMesh || o.userData.isOutline || o.userData.noOutline) return;
    o.geometry.computeBoundingSphere();
    if (o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z) < minSize) return;
    list.push(o);
  });
  for (const o of list) {
    const ol = new THREE.Mesh(o.geometry, outlineMat);
    ol.userData.isOutline = true;
    o.add(ol);
  }
}
