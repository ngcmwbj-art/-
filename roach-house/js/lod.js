// 第22回（ユーザーの注文「1・3やって」）：省エネのときだけ、細かい形をあらい形に、つやの計算を軽いものに切りかえる
// ・形：細かい形（hi）とあらい形（lo）の組を登録しておき、画面の中の物を見回って入れかえる
// ・つや：MeshPhysicalMaterial（ロウのようなツヤ・うぶ毛のつや）を、軽い MeshStandardMaterial にかえる
import * as THREE from 'three';

const LO_GEO = new Map();
const LO_MAT = new Map(); // 重いつや → 軽いつや
export function regLo(hi, lo) {
  if (!hi || !lo || hi === lo) return;
  if (hi.userData && hi.userData.stemOffset !== undefined && lo.userData.stemOffset === undefined) lo.userData.stemOffset = hi.userData.stemOffset;
  LO_GEO.set(hi, lo);
}
const COPY = ['color', 'map', 'normalMap', 'normalScale', 'roughness', 'metalness', 'roughnessMap', 'metalnessMap', 'emissive', 'emissiveMap', 'emissiveIntensity',
  'aoMap', 'alphaMap', 'vertexColors', 'transparent', 'opacity', 'side', 'depthWrite', 'depthTest', 'alphaTest', 'envMap', 'envMapIntensity', 'flatShading',
  'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'toneMapped', 'fog', 'wireframe'];
function loMat(m) {
  let lo = LO_MAT.get(m);
  if (lo) return lo;
  lo = new THREE.MeshStandardMaterial();
  for (const k of COPY) {
    const v = m[k];
    if (v === undefined) continue;
    if (v && v.isColor) lo[k].copy(v);
    else if (v && v.isVector2) lo[k].copy(v);
    else lo[k] = v;
  }
  // つやの強いもの（clearcoat）は、そのぶん少しだけなめらかに見せる
  if (m.clearcoat > 0.3) lo.roughness = Math.max(0.12, lo.roughness * 0.85);
  if (m.onBeforeCompile && m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) {
    lo.onBeforeCompile = m.onBeforeCompile;
    if (m.customProgramCacheKey) lo.customProgramCacheKey = m.customProgramCacheKey;
  }
  lo.name = (m.name || '') + '(軽)';
  lo.userData.hi = m;
  LO_MAT.set(m, lo);
  return lo;
}
// 色やツヤを毎回うつす（箱の色がくすむ・農場主の顔が赤くなる・背中がつやつやになる、などがそのまま見えるように）
export function syncLo() {
  for (const [hi, lo] of LO_MAT) {
    if (!lo.color.equals(hi.color)) lo.color.copy(hi.color);
    if (hi.emissive && !lo.emissive.equals(hi.emissive)) lo.emissive.copy(hi.emissive);
    lo.emissiveIntensity = hi.emissiveIntensity;
    lo.roughness = hi.clearcoat > 0.3 ? Math.max(0.12, hi.roughness * 0.85) : hi.roughness;
    lo.metalness = hi.metalness;
    lo.opacity = hi.opacity;
    if (lo.transparent !== hi.transparent) { lo.transparent = hi.transparent; lo.needsUpdate = true; }
    if (lo.map !== hi.map) { lo.map = hi.map; lo.needsUpdate = true; }
  }
}
function swapMat(m, on) {
  if (on) return m.isMeshPhysicalMaterial ? loMat(m) : m;
  return m.userData && m.userData.hi ? m.userData.hi : m;
}
export function setLowDetail(root, on) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    if (on) { const lo = LO_GEO.get(g); if (lo) { o.userData.hiGeo = g; o.geometry = lo; } }
    else if (o.userData.hiGeo) { o.geometry = o.userData.hiGeo; o.userData.hiGeo = null; }
    const m = o.material;
    if (Array.isArray(m)) o.material = m.map((x) => swapMat(x, on));
    else if (m) { const n = swapMat(m, on); if (n !== m) o.material = n; }
  });
}
