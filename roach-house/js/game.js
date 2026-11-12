// ゲームの中身（ゴキブリ・仲間・農場主・わな・殺虫剤）
import * as THREE from 'three';
import {
  BOUNDS, ROWS, TABLES, TABLE_TOP, CRATE, CRATE_SPOTS, DOOR, PATROL_POINTS, INITIAL_TRAPS,
  PLAYER_START, FARMER_START, rowAt, tableAt, truckSlot,
  SURFACES, PLANT_FRUITS, dropPlantFruit, resetPlantFruits, WIND_LANES, SAFE_SPOTS, TROUGH_TOP,
} from './world.js';
import {
  makeRoach, animateRoach, makeFarmer, makeCrate, setCrateRot, animateFlies, makeTrap, makeEgg,
  makeCloud, makeRing, makeCone, disposeObject, makeBait, makeFogger, VEG_COLORS, makeCat, makeInspector,
  makeBento, makeGlove, makeBox, makeRadio, makeBoots, makeHat, makeDrain, makeXmasTree, makeKadomatsu, makeKagamiMochi, makeBeetle,
  makeSheet, makeSpider, makeExterminator, addReturnStamp, makeGoldCrate, setRoachGloss, makeRat,
} from './models.js';
import { paprikaMaterial, PAPRIKA_COLORS } from './paprika.js';
import { seededRand } from './features.js';
import { Grid } from './pathfind.js';
import { clamp, lerp, dampAngle, angleDiff, smooth, rand, randRange, pick, rectDist, inRect, setSeed } from './util.js';

// 6つのステージ（だんだん難しくなる）
export const STAGES = [
  { key: 's1', no: 1, label: 'ステージ1', name: 'はじめての夜明け', desc: '農場主はのんびり屋。まずはかじって、隠れて、慣れよう', haz: ['trap'], target: 6, baits: 0, fSpeed: 0.85, susp: 0.7, patrol: [9, 13], patrolP: 0.8, loadT: 8, traps: 2, hatch: 8, sprayDmg: 20, fumAt: 0.5,
    tip: 'まずはコンテナを1箱かじってみよう。見つかったらさいばい槽の下へ' },
  { key: 's2', no: 2, label: 'ステージ2', name: 'ホイホイ増量中', desc: 'ホイホイ・粘着シート', haz: ['trap', 'sheet'], target: 7, baits: 0, fSpeed: 0.92, susp: 0.85, patrol: [7, 10], patrolP: 0.7, loadT: 7, traps: 3, hatch: 9, sprayDmg: 23, fumAt: 0.5,
    tip: 'ホイホイ（黄色い家）が多い。地図の×印を見て、通り道を選ぼう' },
  { key: 's3', no: 3, label: 'ステージ3', name: '毒エサの日', desc: 'ホイホイ・毒エサ・JAの検品', haz: ['trap', 'bait', 'inspect'], target: 7, baits: 1, fSpeed: 0.95, susp: 0.86, patrol: [5, 8], patrolP: 0.6, loadT: 9, traps: 3, hatch: 10, sprayDmg: 17, fumAt: 0.5, inspect: true,
    tip: '黒い丸い容器は毒エサ。JAの検品員が来たら、近づかずに待とう' },
  { key: 's4', no: 4, label: 'ステージ4', name: '怒りっぽい農場主', desc: 'ネコ・クモ', haz: ['cat', 'spider'], target: 7, baits: 1, fSpeed: 0.97, susp: 0.88, patrol: [5, 8], patrolP: 0.6, loadT: 11, traps: 3, hatch: 10, sprayDmg: 21, fumAt: 0.5, inspect: true, cat: true,
    tip: '鈴の音はネコ。ネコは台やさいばい槽の上には来ない' },
  { key: 's5', no: 5, label: 'ステージ5', name: '出荷の大一番', desc: 'ホイホイ・毒エサ・駆除業者。8箱をダメにしろ', haz: ['trap', 'bait', 'exterm'], target: 8, baits: 2, fSpeed: 0.98, susp: 0.9, patrol: [5, 7], patrolP: 0.65, loadT: 13, traps: 3, hatch: 11, sprayDmg: 22, fumAt: 0.5, inspect: true, cat: true,
    tip: '仲間をたくさん増やして、「まかせた」で一気に攻めよう' },
  { key: 's6', no: 6, label: 'ステージ6', name: '夜なべの選果場', desc: '真っ暗。ネコ・クモ・ホイホイ', haz: ['cat', 'spider', 'trap'], target: 8, baits: 2, fSpeed: 0.97, susp: 0.95, patrol: [4, 7], patrolP: 0.55, loadT: 11, traps: 4, hatch: 11, sprayDmg: 23, fumAt: 0.5, inspect: false, cat: true, night: true,
    tip: '暗いので光の外なら見つかりにくい。懐中電灯の光の輪に入るな' },
];
// ステージに出るわな・敵（ステージごとに3種類まで。殺虫剤・叩き・けむり玉は農場主の技なので数えない）
export const HAZ_NAMES = { trap: 'ホイホイ', bait: '毒エサ', sheet: '粘着シート', spider: 'クモ', inspect: 'JAの検品', cat: 'ネコ', exterm: '駆除業者' };
export const DIFFS = Object.fromEntries(STAGES.map((st) => [st.key, st]));
// 以前の呼び名（テスト用）
DIFFS.easy = STAGES[0];
DIFFS.normal = STAGES[2];
DIFFS.hard = STAGES[4];

// 仲間の数に上限はない（栄養がたまるたびに卵を産める）
export const MAX_NYMPHS = Infinity;
const EAT_REACH = 0.42;
const ATTACK_RANGE = 3.6;
const ATTACK_CD = 22;
const MODES = { search: 'まかせた', decoy: 'おとり', follow: 'ついてこい' };
// がっつきゲージの「ちょうどいい帯」
export const NICE_LO = 55, NICE_HI = 85;
const TROUGH0 = TABLES.length; // SURFACES のうち、この番号から先がさいばい槽
const BAIT_SPOTS = [{ x: 5.6, z: -9.6 }, { x: -19.6, z: 4.6 }, { x: 18.6, z: 3.2 }];
// いたずらの小物と、段ボール箱の場所
const BENTO_SPOT = { x: 19.8, z: -6.2 };
const GLOVE_SPOT = { x: 8.2, z: 11.8, h: 0.6 };
// 農場主の替えの長靴（出入り口のそば）と、ステージ3からのラジオの置き場所
const BOOT_SPOT = { x: 19.2, z: 12.7 };
const RADIO_SPOT = { x: 8.0, z: 2.6 };
const BOX_SPOTS = [{ x: 6.2, z: -1.6, h: 0.3 }, { x: -20.0, z: -6.0, h: 1.2 }];
// 排水溝：2組。入ると相方の排水溝から出る
const DRAIN_SPOTS = [{ x: -20.2, z: -12.8, to: 1 }, { x: 20.0, z: -12.6, to: 0 }, { x: -1.0, z: 12.9, to: 3 }, { x: 7.0, z: 7.6, to: 2 }];
const DRAIN_TIME = 1.4;
// カブトムシ：卵を10個産むごとに1回来る
const BEETLE_EVERY = 10;
export const PRANKS = [
  { id: 'bento', text: '農場主のお弁当をかじる', short: 'お弁当' },
  { id: 'glove', text: '落ちている軍手にもぐりこむ', short: '軍手' },
  { id: 'playdead', text: '死んだふりで農場主に見のがしてもらう', short: '死んだふり' },
  { id: 'boot', text: '長靴に入って農場主をおどろかす', short: '長靴' },
];
const PLAYDEAD_USES = 3;
// 第17回：仲間の名前（入力なしで自動でつく）
const MATE_NAMES = ['タロウ', 'ハナコ', 'ジロウ', 'モモ', 'ゴン', 'チビ', 'サブ', 'ミイ', 'ケン', 'ポチ', 'トメ', 'ヨネ', 'ハチ', 'キク', 'テツ', 'ウメ'];
const _v3 = new THREE.Vector3();
const _red = new THREE.Color(0xd8442e);
// 実の熟し具合：熟した実（赤・黄・橙）は栄養たっぷり、色づきかけは中くらい、緑は少し
const RIPE = { [PAPRIKA_COLORS.red]: 1, [PAPRIKA_COLORS.yellow]: 1, [PAPRIKA_COLORS.orange]: 1, [PAPRIKA_COLORS.turning]: 0.5, [PAPRIKA_COLORS.green]: 0.22 };
const ripeOf = (f) => RIPE[f.hex] ?? 0.5;
// 1つのコンテナを同時にかじれる仲間の数（おたすけ中は多め）
const EATERS_MAX = 4, EATERS_MAX_ASSIST = 6;
// 仲間がこの数をこえると「注意報」「大発生」
const ALERT_N = 15, OUTBREAK_N = 25;
// 株の見回り：短い間にこれだけ実を落とすと、農場主が株を見に来る
const PLANT_CHECK_N = 3, PLANT_CHECK_N_ASSIST = 5;
const SPRAY_WAIT = 60;
const SPIDER_BASE = 0.22; // クモの巣の下のはしの高さ（巣のまん中は さいばい槽のふちより少し下） // 殺虫剤をまいた株の実は、しばらく食べられない（本物の「収穫まで待つ日数」）
// おたすけ：農場主を少しのんびりに
export function assistDiff(D) {
  return { ...D, fSpeed: D.fSpeed * 0.88, susp: D.susp * 0.78, loadT: D.loadT * 1.3, sprayDmg: D.sprayDmg * 0.85, assist: true };
}

// 隠れ場所（畝の下・台の下）
const HIDE_SPOTS = [];
for (const r of ROWS) for (let x = r.x0 + 1; x < r.x1; x += 2.5) HIDE_SPOTS.push({ x, z: r.z });
for (const t of TABLES) for (const dx of [-3.4, -1, 1.4, 3.6]) HIDE_SPOTS.push({ x: t.x + dx, z: t.z });

export class Game {
  constructor({ scene, sfx, ui }) {
    this.scene = scene;
    this.sfx = sfx;
    this.ui = ui;
    this.grid = new Grid();
    this.root = null;
    this.state = 'title';
    this.clock = 0;
    this.shake = 0;
    this.camYaw = Math.PI / 2;
    this.snapRequests = [];
    this.soundPings = [];
    this.highlights = [];
    this.baits = [];
    this.fallers = [];
    this.fog = null;
    this.fogLevel = 0;
    this.safeRings = [];
    this.tutorial = null;
    this.niceT = 0;
    this.niceCombo = 0;
  }

  // ---------------- 開始 ----------------
  // opts：{ tutorial, wing, layoutSeed }
  start(diffKey, seed, opts = {}) {
    if (seed !== undefined) setSeed(seed);
    if (this.root) {
      if (this.farmerModel) { this.farmerModel.root.removeFromParent(); this.farmerCone.removeFromParent(); }
      this.scene.remove(this.root);
      disposeObject(this.root);
    }
    this.root = new THREE.Group();
    this.scene.add(this.root);
    const D0 = DIFFS[diffKey] || DIFFS.normal;
    const D = (this.diff = opts.assist ? assistDiff(D0) : D0);
    this.elapsed = 0;
    this.shipLimit = CRATE_SPOTS.length - D.target + 1; // これだけ出荷されたら負け
    this.mode = 'follow';
    this.state = 'play';
    this.result = null;
    this.stats = {
      ruined: 0, shipped: 0, born: 0, lost: 0, attacks: 0, deaths: 0, eggs: 0, chased: 0, ate: 0,
      ruinedColor: [0, 0, 0], stuck: 0, escapes: 0, nice: 0, fruits: 0, winds: 0, baits: 0, smokeSurvived: 0, seen: [],
      phones: 0, byPlayer: 0, byNymph: 0, byOther: 0, ripeFruits: 0, maxNymphs: 0,
    };
    this.baits = [];
    this.fallers = [];
    this.dusts = [];
    this.slowT = 0; this.lastOneDone = false; this.buddy = null;
    this.fog = null;
    this.fogLevel = 0;
    this.fumigated = false;
    this.safeRings = [];
    this.highlights = [];
    this.snapRequests = [];
    this.soundPings = [];
    this.minHp = 100;
    this.niceT = 0;
    this.niceCombo = 0;
    this.cat = null;
    this.inspector = null;
    this.inspectDone = false;
    this.safeLine = null;
    this.lastDeathCause = null;
    this.pranks = { bento: false, glove: false, playdead: false, boot: false };
    this.radioT = -99; this.radioLast = null;
    this.plantHits = [];
    this.alertLv = 0;
    for (const f of PLANT_FRUITS) if (f.sprayed) { f.sprayed = 0; f.mesh.setColorAt(f.idx, new THREE.Color(f.hex)); f.mesh.instanceColor.needsUpdate = true; }
    this.night = !!D.night;
    this.wing = opts.wing || 'normal';
    this.tour = !!opts.tour;
    // かんたんモード：わな・敵なし（農場主と箱だけ）
    this.easyMode = !!opts.easy && !this.tour;
    this.calm = !!opts.tutorial || this.tour;
    this.tutorial = opts.tutorial ? { step: 0, t: 0, sx: PLAYER_START.x, sz: PLAYER_START.z, yaw: Math.PI / 2, hideT: 0 } : null;
    resetPlantFruits();
    // 日替わりの配置：コンテナの色と最初のわなの場所
    const lr = seededRand(opts.layoutSeed || 12345);
    this.layoutRand = lr;
    this.ruined = 0;
    this.shipped = 0;
    this.truckN = 0; // トラックの荷台の何番目に積むか
    this.roaches = [];
    this.eggs = [];
    this.clouds = [];
    this.traps = [];
    this.flash = [];
    this.nutrition = 0;
    this.attackCD = 6;
    this.shake = 0;
    this.events = [];

    this.crates = CRATE_SPOTS.map((s, i) => {
      const colorIdx = Math.floor(lr() * VEG_COLORS.length);
      const m = makeCrate(i, colorIdx);
      const c = {
        i, colorIdx, x: s.x, z: s.z, table: s.table, baseY: s.table >= 0 ? TABLE_TOP : 0,
        hp: 100, rotten: false, shipped: false, carried: false, discovered: false, model: m, lastBite: -9, rect: null,
      };
      m.group.userData.isCrate = true;
      this.placeCrate(c);
      this.root.add(m.group);
      return c;
    });
    // 第20回：まれに「金のパプリカ」の箱（ダメにすると星が1つ）
    this.goldCrate = null;
    if (!this.tour && !opts.tutorial && !opts.noGold && (opts.gold || rand() < 0.3)) {
      const gc = this.crates[Math.floor(rand() * this.crates.length)];
      gc.gold = true; makeGoldCrate(gc.model); this.goldCrate = gc;
    }
    const trapList = [...INITIAL_TRAPS].sort(() => lr() - 0.5);
    trapList.slice(0, this.has('trap') ? D.traps : 0).forEach((t) => this.addTrap(t.x, t.z, t.r));
    BAIT_SPOTS.slice(0, this.has('bait') ? Math.max(1, D.baits) : 0).forEach((b) => this.addBait(b.x, b.z));
    // いたずらの小物と段ボール箱
    this.bento = { ...BENTO_SPOT, model: makeBento(), eaten: 0, done: false };
    this.bento.model.position.set(BENTO_SPOT.x, 0, BENTO_SPOT.z);
    this.bento.model.rotation.y = 0.4;
    this.glove = { ...GLOVE_SPOT, model: makeGlove(), done: false };
    this.glove.model.position.set(GLOVE_SPOT.x, 0, GLOVE_SPOT.z);
    this.glove.model.rotation.y = GLOVE_SPOT.h;
    this.root.add(this.bento.model, this.glove.model);
    // 第21回：ステージ3だけ、一度だけ短い停電（10秒暗くなり、農場主が止まる）
    this.blackout = (D.key === 's3' && !this.tour && !opts.tutorial && !this.easyMode) || opts.blackout ? { at: opts.blackoutAt != null ? opts.blackoutAt : randRange(100, 220), t: 0, done: false } : null;
    this.blackoutK = 0;
    // 第21回：味方のネズミ（ときどき走りぬけて、農場主の気をそらす）
    if (this.rat && this.rat.model && this.rat.model.parent) this.rat.model.parent.remove(this.rat.model);
    this.rat = (!this.tour && !opts.tutorial) ? { next: opts.ratAt != null ? opts.ratAt : randRange(70, 130), run: null, model: null } : null;
    this.boots = { ...BOOT_SPOT, model: makeBoots() };
    this.boots.model.position.set(BOOT_SPOT.x, 0, BOOT_SPOT.z);
    this.boots.model.rotation.y = -2.4;
    this.root.add(this.boots.model);
    // ラジオ：ステージ3からは作業場の床に置いてある。かじると止まり、農場主が直しに来る（直すと番組が変わる）
    this.radioObj = null;
    if ((D.no || 1) >= 3 && !opts.tutorial) {
      const m = makeRadio();
      m.position.set(RADIO_SPOT.x, 0, RADIO_SPOT.z);
      m.rotation.y = -0.6;
      this.root.add(m);
      this.radioObj = { ...RADIO_SPOT, model: m, on: true, bite: 0, cd: 0, fixT: 0 };
    }
    this.drains = DRAIN_SPOTS.map((d) => {
      const m = makeDrain();
      m.position.set(d.x, 0, d.z);
      this.root.add(m);
      return { ...d, model: m };
    });
    // 季節のかざり（12月はクリスマス、正月は門松と鏡もち）
    this.season = opts.season || null;
    if (this.season === 'xmas') {
      const t = makeXmasTree(); t.position.set(20.6, 0, 5.2); this.root.add(t);
    } else if (this.season === 'newyear') {
      for (const z of [8.4, 13.3]) { const k = makeKadomatsu(); k.position.set(20.9, 0, z); this.root.add(k); }
      const km = makeKagamiMochi(1.2); km.position.set(17.1, TABLE_TOP, 6.8); this.root.add(km);
    }
    this.beetle = null;
    this.beetleDue = BEETLE_EVERY;
    // 株の上の黄色い粘着シート（ステージ2〜）と天敵のクモ（ステージ3〜）。場所は日替わり
    const spotOnTrough = (avoid) => {
      for (let k = 0; k < 40; k++) {
        const row = ROWS[Math.floor(lr() * ROWS.length)];
        const x = row.minX + 1.5 + lr() * (row.maxX - row.minX - 3);
        if (Math.hypot(x - PLAYER_START.x, row.z - PLAYER_START.z) < 4) continue;
        if (avoid.some((o) => Math.abs(o.x - x) < 2.5 && Math.abs(o.z - row.z) < 1)) continue;
        return { x, z: row.z };
      }
      return { x: -6, z: ROWS[0].z };
    };
    const used = [];
    this.sheets = [];
    if (!this.tour) {
      const ns = this.has('sheet') ? 3 : 0;
      for (let i = 0; i < ns; i++) {
        const sp = spotOnTrough(used); used.push(sp);
        const m = makeSheet(); m.position.set(sp.x, TROUGH_TOP + 0.07, sp.z); m.rotation.y = (lr() - 0.5) * 0.4;
        this.root.add(m);
        this.sheets.push({ x: sp.x, z: sp.z, sheet: true, model: m });
      }
    }
    this.spiders = [];
    if (this.has('spider') && !this.tour) {
      for (let i = 0; i < 2; i++) {
        const sp = spotOnTrough(used); used.push(sp);
        // 巣はさいばい槽のふち（通路がわ）に縦に張る
        const side = lr() < 0.5 ? -1 : 1;
        // 巣はさいばい槽の横の壁（葉の下）に張る。通路からよく見える
        const sz = sp.z + side * 0.64;
        const m = makeSpider(); m.root.position.set(sp.x, SPIDER_BASE, sz);
        this.root.add(m.root);
        this.spiders.push({ x: sp.x, z: sz, m, st: 'wait', t: 0, cd: 0, target: null });
      }
    }
    this.exterm = null;
    this.extermDone = false;
    this.boxes = BOX_SPOTS.map((b) => {
      const m = makeBox();
      m.position.set(b.x, 0, b.z);
      m.rotation.y = b.h;
      this.root.add(m);
      return { x: b.x, z: b.z, h: b.h, model: m, rider: null };
    });

    this.pattern = opts.pattern || 'none';
    this.player = this.spawnRoach(PLAYER_START.x, PLAYER_START.z, false, 0, -1, this.wing, this.pattern);
    this.player.isPlayer = true;
    this.player.h = Math.PI / 2;
    this.player.deadUses = PLAYDEAD_USES;
    this.hat = opts.hat || 'none';
    this.wearHat(this.player);
    // 親分ゴキブリ：卵を合計50個産むと、毎回大きな親分が仲間に来る（かじる力が強く、箱がゆれる）
    if (opts.boss && !opts.tutorial) {
      const b = this.spawnRoach(PLAYER_START.x + 0.9, PLAYER_START.z + 0.5, true, 0, -1, 'normal', 'none');
      b.boss = true; b.hp = b.maxHp = 90;
      b.model.root.scale.setScalar(1.3);
      this.seen('boss');
    }
    this.camYaw = Math.PI / 2;
    // 第16回：白い床でも見失わないよう、足もとの輪を太く濃く（自分の1匹だけ）
    this.marker = makeRing(0xffd400, 0.26, 0.42, 1);
    this.root.add(this.marker);

    if (!this.farmerModel) { this.farmerModel = makeFarmer(); this.farmerCone = makeCone(1, 0.78); }
    const fm = this.farmerModel, cone = this.farmerCone;
    for (const ch of [...fm.root.children]) if (ch.userData.isCrate) fm.root.remove(ch);
    fm.root.visible = true;
    this.root.add(fm.root);
    this.root.add(cone);
    this.farmer = {
      x: FARMER_START.x, z: FARMER_START.z, h: -Math.PI / 2, model: fm, cone,
      state: 'WORK', phase: 'idle', timer: 5, path: [], pi: 0, repath: 0, carry: null, crate: null,
      susp: 0, anger: 0, lastSeen: null, suspect: null, target: null, lostT: 0,
      sprayCD: 2, whackCD: 0, act: null, trapQueue: [], speech: '', speechT: 0,
      walkPhase: 0, stepAcc: 0, moveSpeed: 0, baseH: 0, lookT: 0, inv: null, coneRange: 10,
      glanceT: 3, glanceDir: 1, glanceDur: 0, lookOff: 0, view: -Math.PI / 2,
    };
    // 夜：農場主の懐中電灯（右手の先から前を照らす）
    if (!this.flashlight) {
      this.flashlight = new THREE.SpotLight(0xfff1c8, 0, 18, 0.42, 0.45, 1.2);
      this.flashlight.position.set(0.9, 4.0, 0.8);
      this.flashlight.target.position.set(0, 0, 9);
      fm.root.add(this.flashlight, this.flashlight.target);
    }
    this.flashlight.intensity = this.night ? 140 : 0;
    this.flashlight.visible = this.night;
    if (this.has('cat') || this.tour) this.spawnCat();
    // 見学モード：検品員とカブトムシも置いておく（動かない）
    this.showcase = [];
    if (this.tour) {
      const I = makeInspector();
      I.root.position.set(18.6, 0, 1.6); I.root.rotation.y = -Math.PI / 2;
      this.root.add(I.root);
      const B = makeBeetle();
      B.root.position.set(13 + 1.1, TABLE_TOP + 0.02, -1 + 0.9); B.root.rotation.y = 0.6; B.root.scale.setScalar(1.6);
      this.root.add(B.root);
      this.showcase.push({ key: 'inspector', obj: I.root, h: 4.6, d: 5.5 }, { key: 'beetle', obj: B.root, h: TABLE_TOP + 0.3, d: 1.6 });
    }
    if (this.tutorial) { this.farmer.timer = 1e9; this.say('（農場主はまだラジオを聞いている）'); }
    else this.say('さて、今日も出荷するか。手間かけさせんなよ');
  }

  // 帽子をかぶせる（自分のゴキブリだけ）
  // 第15回：相棒（その回の最初の仲間）には帽子。帽子を持っていなければ麦わら帽子
  makeBuddy(r) {
    if (!r || this.buddy || r.isPlayer) return;
    this.buddy = r; r.buddy = true;
    const h = makeHat(this.hat !== 'none' ? this.hat : 'straw');
    h.position.set(0, 0.13, 0.24); h.rotation.x = -0.2; h.scale.setScalar(1.3);
    r.model.body.add(h); r.model.hat = h;
  }
  // 第15回：連れてきた仲間には小さな星（見た目だけ。強さは変えない）
  markVeteran(r) {
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 0.035 : 0.08; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (i) sh.lineTo(x, y); else sh.moveTo(x, y); }
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: 0xffd400, side: THREE.DoubleSide, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, 0.2, -0.05);
    m.userData.ownMaterial = true; m.userData.ownGeometry = true;
    r.model.body.add(m); r.vet = true;
  }
  wearHat(r) {
    if (!r || this.hat === 'none' || r.model.hat) return;
    const h = makeHat(this.hat);
    h.position.set(0, 0.13, 0.24);
    h.rotation.x = -0.2;
    const s = (r.nymph ? 0.8 : 1) * 1.5; // スマホでも見える大きさに
    h.scale.setScalar(s);
    r.model.body.add(h);
    r.model.hat = h;
  }

  addBait(x, z) {
    const m = makeBait();
    m.position.set(x, 0, z);
    this.root.add(m);
    const b = { x, z, model: m, alive: true };
    this.baits.push(b);
    return b;
  }

  // このステージに出るわな・敵か（見学モードは全部）
  has(k) { return this.tour || (!this.easyMode && (!this.diff.haz || this.diff.haz.includes(k))); }
  seen(id) { if (!this.stats.seen.includes(id)) this.stats.seen.push(id); }

  // 名場面の写真を頼む（main.js が描いた直後に撮る）
  snap(type, text, replace = false) {
    const have = this.highlights.find((h) => h.type === type);
    if (have && !replace) return;
    this.snapRequests.push({ type, text, t: this.elapsed });
  }

  placeCrate(c) {
    c.rect = { minX: c.x - CRATE.w / 2, maxX: c.x + CRATE.w / 2, minZ: c.z - CRATE.d / 2, maxZ: c.z + CRATE.d / 2 };
    c.model.group.position.set(c.x, c.baseY, c.z);
    c.model.group.rotation.set(0, 0, 0);
  }

  spawnRoach(x, z, nymph, y = 0, surface = -1, wing = 'normal', pattern = 'none') {
    const m = makeRoach(nymph, wing, pattern);
    if (nymph) m.root.scale.setScalar(0.62);
    this.root.add(m.root);
    const r = {
      kind: 'roach', id: this.roaches.length, nymph, isPlayer: false, x, y, z, h: rand() * Math.PI * 2,
      hp: nymph ? 30 : 100, maxHp: nymph ? 30 : 100, alive: true, surface, st: 'move',
      phase: rand() * 6, greed: 0, eatingCrate: null, moving: false, dashing: false, climb: null, fly: null,
      vy: 0, trap: null, struggle: 0, stuckT: 0, trapImmune: 0, hurtT: 0, deadT: 0, grow: 0,
      ai: { target: null, retarget: 0, hideT: 0, jitterT: 0, jx: 0, jz: 0, lastX: x, lastZ: z, stallT: 0, slot: rand() },
      model: m, crunchT: 0, poison: 0, glide: null, eatingFruit: null, eatingBait: null, baitT: 0,
    };
    if (nymph) { r.name = MATE_NAMES[this.roaches.length % MATE_NAMES.length]; r.bitten = 0; }
    this.roaches.push(r);
    return r;
  }

  addTrap(x, z, rot = rand() * Math.PI) {
    const m = makeTrap();
    m.position.set(x, 0, z);
    m.rotation.y = rot;
    this.root.add(m);
    const t = { x, z, model: m };
    this.traps.push(t);
    return t;
  }

  // ラジオの実況（字は画面の端に小さく。続けて同じ話はしない）
  radio(text, force = false) {
    if (!this.ui || !this.ui.radio || this.calm) return;
    if (!force && this.clock - (this.radioT || -99) < 14) return;
    if (text === this.radioLast) return;
    this.radioT = this.clock; this.radioLast = text;
    this.ui.radio(text);
  }

  // voice=true の大事なセリフ（見つけた・勝ち負け・口癖）だけ声でも読む。ほかは字だけ
  say(text, voice = false) {
    this.farmer.speech = text;
    this.farmer.speechT = 2.6;
    if (voice && !this.tour && this.ui.speak) this.ui.speak(text);
  }
  toast(text, kind = '') { this.ui.toast(text, kind); }

  get nymphs() { return this.roaches.filter((r) => r.alive && !r.isPlayer); }
  surfY(r) { return r.surface >= 0 ? SURFACES[r.surface].top : 0; }
  onTrough(r) { return r.surface >= TROUGH0; }

  // ---------------- 毎フレーム ----------------
  update(dt, inp) {
    // 最後の1匹のドキドキ：時間の進みだけをゆっくりに（描く回数は変えない）
    if (this.slowT > 0) { this.slowT -= dt; dt *= 0.35; }
    this.clock += dt;
    this.shake = Math.max(0, this.shake - dt * 2.5);
    if (this.state !== 'play') {
      if (this.root) this.animateAll(dt);
      return;
    }
    this.elapsed += dt;
    this.attackCD = Math.max(0, this.attackCD - dt);
    this.niceT = Math.max(0, this.niceT - dt);
    if (this.tutorial) this.updateTutorial(dt);

    // 指示は2つだけ：1＝ついてこい、2＝まかせた（自分で食べる。自分が追われたら半分がおとりになる）
    if (inp.consume('cmd1')) this.setMode('follow');
    if (inp.consume('cmd2') || inp.consume('cmd3')) this.setMode('search');

    for (const r of this.roaches) {
      if (!r.alive) continue;
      if (r.isPlayer) this.updatePlayer(r, dt, inp);
      else this.updateNymph(r, dt);
      this.updateRoachCommon(r, dt);
    }
    this.updateEggs(dt);
    this.updateFarmer(dt);
    this.updateClouds(dt);
    this.updateTraps(dt);
    this.updateCrates(dt);
    this.updateFallers(dt);
    this.updateFog(dt);
    this.updateCat(dt);
    this.updateInspector(dt);
    this.updateSafeLine();
    this.updateBeetle(dt);
    this.updateAlert(dt);
    this.updateSheets();
    this.updateSpiders(dt);
    this.updateExterm(dt);
    this.updatePhone(dt);
    this.updateRadioObj(dt);
    this.updateBoots();
    this.updateBlackout(dt);
    this.updateRat(dt);
    this.updateDust(dt);
    const p = this.player;
    if (p && p.alive && p.hp < this.minHp - 8 && p.hp < 45) {
      this.minHp = p.hp;
      this.snap('close', `体力が残り ${Math.max(1, Math.round(p.hp))} まで追いつめられた`, true);
    }
    this.animateAll(dt);
    this.checkEnd();
  }

  setMode(m) {
    if (this.mode === m) return;
    this.mode = m;
    for (const r of this.nymphs) { r.ai.target = null; r.ai.retarget = 0; }
    this.sfx.click();
    const n = this.nymphs.length;
    const msg = { search: 'まかせた！', decoy: 'おとり！', follow: 'ついてこい！' }[m];
    this.toast(msg, 'info');
  }

  // ---------------- 自分のゴキブリ ----------------
  updatePlayer(p, dt, inp) {
    { // 第20回：長く生き残るほど背中がつやつやに（1分から5分で最大。見た目だけ）
      const P0 = this.player;
      if (P0 && P0.alive) {
        P0.life = (P0.life || 0) + dt;
        const k = Math.round(clamp((P0.life - 60) / 240, 0, 1) * 10) / 10;
        if (k !== P0.glossK) { P0.glossK = k; setRoachGloss(P0.model, k); }
      }
    }
    p.moving = false; p.dashing = false;
    const wasEating = p.eatingCrate || p.eatingFruit;
    const prevGreed = p.greed;
    p.eatingCrate = null;
    p.eatingFruit = null;
    const wasBait = p.eatingBait;
    p.eatingBait = null;
    if (p.poison > 0) {
      p.poison = Math.max(0, p.poison - dt);
      this.damage(p, 2.2 * dt, 'poison');
      if (!p.alive) return;
    }
    if (p.st === 'stuck') {
      if (inp.consume('action')) { p.struggle += this.diff.assist ? 25 : 15; this.sfx.click(); } // 第20回：おたすけのときは連打が少なくてすむ
      p.struggle = Math.max(0, p.struggle - 9 * dt);
      this.damage(p, 3 * dt, 'trap');
      if (!p.alive) return;
      if (p.struggle >= 100) { this.freeFromTrap(p); this.stats.escapes++; }
      p.greed = Math.max(0, p.greed - 60 * dt);
      return;
    }
    if (p.st === 'drain') {
      // 排水溝の中を通って、相方の排水溝から出る
      p.drain.t += dt;
      if (p.drain.t >= DRAIN_TIME) {
        const to = p.drain.to;
        p.st = 'move'; p.drain = null;
        p.x = to.x + (to.x > 0 ? -0.8 : 0.8); p.z = to.z + (to.z > 0 ? -0.6 : 0.6); p.y = 0; p.surface = -1;
        p.model.root.visible = true;
        p.trapImmune = 1;
        this.collide(p);
        this.stats.drains = (this.stats.drains || 0) + 1;
        this.toast('排水溝を抜けた！', 'good');
      }
      p.greed = Math.max(0, p.greed - 60 * dt);
      return;
    }
    if (p.st !== 'move') { p.greed = Math.max(0, p.greed - 60 * dt); return; }

    // 死んだふり・軍手の中：じっとしている
    const deadPress = inp.consume('dead');
    const mvIn = Math.hypot(inp.mx, inp.mz);
    // 収穫かごの中：かごといっしょに動く。動いたりかじったりすると、かごがゆれる
    if (p.stow) {
      const c = p.stow;
      if (c.rotten || c.shipped) { this.leaveStow(p); }
      else {
        c.model.group.getWorldPosition(_v3);
        p.x = _v3.x; p.z = _v3.z; p.y = Math.max(0, _v3.y); p.moving = false;
        // かごの中：食べるボタンで出る（死んだふりボタンは使わない）
        if (inp.consume('action')) { this.leaveStow(p); return; }
        const chew = false;
        if (chew || mvIn > 0.4) {
          c.wiggle = 0.35;
          const f = this.farmer;
          if (c.carried) {
            // 運ばれている間にゆれると、農場主が気づく
            f.stowSus = (f.stowSus || 0) + dt * (chew ? 1.1 : 0.8);
            if (f.stowSus > 1.3) this.stowFound(p, c);
          } else this.noise(c, 2.5, 6 * dt);
        }
        p.greed = Math.max(0, p.greed - 60 * dt);
        return;
      }
    }

    if (p.playDead > 0) {
      p.playDead -= dt; p.playDeadT += dt;
      if (p.playDead <= 0 || deadPress || (p.playDeadT > 0.5 && mvIn > 0.35) || inp.consume('action')) { p.playDead = 0; p.fooled = 0; }
      p.greed = Math.max(0, p.greed - 60 * dt);
      return;
    }
    if (p.inGlove) {
      p.gloveT += dt;
      if (inp.consume('action') || deadPress || (p.gloveT > 0.6 && mvIn > 0.35)) this.leaveHiding(p);
      else { p.greed = Math.max(0, p.greed - 60 * dt); return; }
    }
    if (deadPress && this.startPlayDead(p)) return;

    // カメラ基準の移動
    const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw);
    let dx = fx * inp.mz - fz * inp.mx;
    let dz = fz * inp.mz + fx * inp.mx;
    const mag = Math.hypot(dx, dz);

    const crate = p.box ? null : this.crateInReach(p);
    const fruit = crate || p.box ? null : this.fruitInReach(p);
    const bait = crate || fruit || p.box ? null : this.baitInReach(p);
    const lane = crate || fruit || bait || p.box ? null : this.windLaneAt(p);
    const bento = crate || fruit || bait || p.box ? null : this.nearBento(p);
    const radioN = crate || fruit || bait || p.box || bento ? null : this.nearRadio(p);
    const actionPressed = inp.consume('action');
    // スペース1つで「その場でいちばん大事なこと」：農場主の足もとなら突撃
    if (actionPressed && !p.box && this.canAttackNow()) { this.tryAttack(p); return; }
    // 農場主が取りに来る箱：食べるボタンで「もぐる」
    if (actionPressed && !p.box) { const sc = this.stowTarget(p); if (sc) { this.startStow(p, sc); return; } }

    // 捕まった仲間を助ける
    let rescued = false;
    if (actionPressed) {
      const victim = this.roaches.find((r) => r.alive && r !== p && r.st === 'stuck' && Math.hypot(r.x - p.x, r.z - p.z) < 1.3);
      if (victim) {
        this.freeFromTrap(victim);
        this.toast('仲間をホイホイから助け出した！', 'good');
        rescued = true;
      }
    }

    const food = crate || fruit;
    if (inp.actionHeld && food && mag < 0.15) {
      // 食べる：長押しするほど早く食べられるが、がっつきすぎると音が出る
      if (crate) p.eatingCrate = crate; else p.eatingFruit = fruit;
      p.greed += 34 * dt;
      const rate = 3.5 + 12.5 * (p.greed / 100);
      if (crate) this.bite(crate, rate * dt, p); else this.biteFruit(fruit, rate * dt);
      this.addNutrition(rate * dt * (crate ? 0.6 : 0.3 * ripeOf(fruit)));
      p.hp = Math.min(p.maxHp, p.hp + rate * 0.3 * dt);
      p.h = dampAngle(p.h, Math.atan2(food.x - p.x, food.z - p.z), 6, dt);
      p.crunchT -= dt;
      if (p.crunchT <= 0) { this.sfx.crunch(0.08 + p.greed / 100 * 0.3); p.crunchT = 0.24 - p.greed / 100 * 0.12; }
      this.noise(p, p.greed > 65 ? 6 : 3.5, (p.greed > 65 ? 14 : 6) * dt);
      if (p.greed >= 100) {
        p.greed = 55;
        this.sfx.crunchLoud();
        this.noise(p, 16, 75);
        this.shake = Math.max(this.shake, 0.35);
        this.toast('バリッ！ 音が出た！', 'bad');
        this.niceCombo = 0;
      }
      if (!wasEating) this.events.push('eat');
    } else {
      // ちょうどいい帯で離したら「ナイス！」：少し多く食べられる
      if (wasEating && prevGreed >= NICE_LO && prevGreed <= NICE_HI) {
        const target = wasEating;
        if (target.kind === 'fruit') this.biteFruit(target, 6); else if (!target.rotten && !target.carried && !target.shipped) this.bite(target, 7, p);
        this.addNutrition(6);
        this.stats.nice++;
        this.niceT = 0.9;
        // ナイスの連続：3回目から、おまけの栄養
        this.niceCombo = (this.niceCombo || 0) + 1;
        // おまけは連続3〜5回目の3回まで（上手な人だけが楽をしすぎないように）
        if (this.niceCombo >= 3) this.stats.niceCombo = Math.max(this.stats.niceCombo || 0, this.niceCombo);
        if (this.niceCombo >= 3 && this.niceCombo <= 5) this.addNutrition(8);
        this.sfx.nice(this.niceCombo); // 続くほど高い音（チャイムはやめた）
        this.events.push('nice');
      } else if (wasEating) this.niceCombo = 0;
      p.greed = Math.max(0, p.greed - 55 * dt);
      // 毒エサ：長押しで食べる（栄養は満タン、でも毒が回る）
      if (inp.actionHeld && bait && mag < 0.15) {
        p.eatingBait = bait;
        p.baitT = (wasBait === bait ? p.baitT : 0) + dt;
        if (p.baitT >= 1.2) this.eatBait(p, bait);
      }
      // 農場主のお弁当：長押しでかじる（いたずら）
      if (inp.actionHeld && bento && mag < 0.15) {
        p.eatingBento = true;
        p.h = dampAngle(p.h, Math.atan2(bento.x - p.x, bento.z - p.z), 6, dt);
        bento.eaten += dt;
        this.addNutrition(9 * dt);
        p.crunchT -= dt;
        if (p.crunchT <= 0) { this.sfx.crunch(0.12); p.crunchT = 0.22; }
        this.noise(p, 3.5, 5 * dt);
        if (bento.eaten >= 2) {
          bento.done = true;
          for (const fo of bento.model.userData.food) fo.scale.setScalar(0.35);
          this.prankDone('bento');
          this.say('あっ！ おれの弁当！ 卵焼きが…ちくしょう！');
        }
      } else p.eatingBento = false;
      // ラジオ：長押しでかじると止まる
      if (inp.actionHeld && radioN && mag < 0.15) {
        const R = radioN;
        p.h = dampAngle(p.h, Math.atan2(R.x - p.x, R.z - p.z), 6, dt);
        R.bite += dt;
        p.crunchT -= dt;
        if (p.crunchT <= 0) { this.sfx.crunch(0.1); p.crunchT = 0.22; }
        this.noise(p, 3, 4 * dt);
        if (R.bite >= 1.4) this.breakRadio(R);
      }
      const prop = actionPressed && !food && !rescued && !bait && !bento && !radioN ? this.propAt(p) : null;
      if (p.box && actionPressed) {
        this.leaveHiding(p);
        this.toast('段ボールから出た', 'info');
      } else if (prop) {
        this.useProp(p, prop);
      } else if (actionPressed && !food && !rescued && !bait && !bento && !radioN) {
        if (lane) this.startGlide(p, lane);
        else {
          const c = this.canClimb(p);
          if (c) this.startClimb(p, c);
          else if (this.nutrition >= 100) this.tryLayEgg(p); // まわりに何もなければ産卵
        }
      }
    }

    if (!p.eatingCrate && !p.eatingFruit && !p.eatingBait && mag > 0.05) {
      const dash = inp.dash && !p.box;
      const soft = dash && inp.autoDash && !(inp.keys && (inp.keys.has('ShiftLeft') || inp.keys.has('ShiftRight')));
      const spd = (dash ? (soft ? 3.7 : 4.6) : 2.7) * Math.min(1, mag + 0.2) * (p.grow > 0 ? 0.9 : 1) * (p.box ? 0.45 : 1);
      this.moveRoach(p, dx / mag, dz / mag, spd, dt);
      p.dashing = dash;
      if (dash && p.surface < 0) this.noise(p, soft ? 3.4 : 4.5, (soft ? 8 : 12) * dt);
    }

    if (p.box) {
      // 段ボールはゴキブリといっしょに動く
      const B = p.box;
      if (p.y > 0.3 || p.st !== 'move') this.leaveHiding(p);
      else { B.x = p.x; B.z = p.z; B.h = dampAngle(B.h, p.h, 4, dt); B.model.position.set(B.x, 0, B.z); B.model.rotation.y = B.h; }
    }
    if (inp.consume('egg')) { if (p.box) this.toast('段ボールの中では産めない', 'warn'); else this.tryLayEgg(p); }
    if (inp.consume('attack')) { if (p.box) this.leaveHiding(p); this.tryAttack(p); }
  }

  // ---------------- 収穫かごにもぐる（出荷されるかごに入って、出荷を台無しにする） ----------------
  // かごにもぐれるのは、農場主が取りに来る箱だけ（食べるボタンが「もぐる」に変わる）
  stowTarget(p) {
    if (p.st !== 'move' || p.playDead > 0) return null;
    const c = this.crateInReach(p);
    const f = this.farmer;
    if (!c || c.rotten || c.shipped || c.carried || c.stowed) return null;
    return f && f.crate === c && (f.phase === 'toCrate' || f.phase === 'pack') ? c : null;
  }
  startStow(p, c) {
    p.stow = c; c.stowed = p;
    p.model.root.visible = false;
    p.eatingCrate = null;
    this.farmer.stowSus = 0;
    this.sfx.click();
    this.toast('かごにもぐった！ じっと待て', 'good');
    this.seen('stow');
    this.events.push('stow');
  }
  leaveStow(p, x, z) {
    const c = p.stow;
    if (!c) return;
    p.stow = null; c.stowed = null;
    p.model.root.visible = true;
    if (x !== undefined) { p.x = x; p.z = z; }
    else { p.x = c.x + (c.z >= 0 ? 0.1 : -0.1); p.z = c.z + (p.z >= c.z ? 0.7 : -0.7); }
    if (c.carried || c.shipped) { p.y = 0; p.surface = -1; }
    p.trapImmune = 1;
    this.collide(p);
  }
  // 運ばれている途中でゆらして見つかった
  stowFound(p, c) {
    const f = this.farmer;
    f.stowSus = 0;
    this.say('ん？ 箱が動いた…うわっ！ 中にゴキブリが！');
    this.dropCarry('かごを放り出した！');
    this.leaveStow(p, f.x + Math.sin(f.h) * 1.6, f.z + Math.cos(f.h) * 1.6);
    this.startChase(p);
  }
  // 出荷のときに中にいた：出荷先で虫入り → その箱はダメに
  stowShipped(p, c) {
    const f = this.farmer;
    f.carry = null;
    c.carried = false; c.stowed = null;
    c.table = -1; c.baseY = 0;
    c.x = DOOR.x - 1.4; c.z = DOOR.z - 1.2;
    this.root.attach(c.model.group);
    this.placeCrate(c);
    this.ruinCrate(c, p);
    p.stow = null;
    p.model.root.visible = true;
    p.x = DOOR.x - 1.2; p.z = DOOR.z + 0.6; p.y = 0; p.surface = -1; p.trapImmune = 1.5;
    this.collide(p);
    // ごほうび：同じ便（荷台に積んだばかりの箱）も虫入りで返品。最大2箱
    const load = this.crates.filter((x) => x.shipped && !x.rotten).sort((a, b) => (b.shipNo || 0) - (a.shipNo || 0)).slice(0, 2);
    for (const x of load) { this.shipped--; this.stats.shipped = this.shipped; this.ruinCrate(x, p); addReturnStamp(x.model); }
    addReturnStamp(c.model);
    f.catHold = 6;
    this.stats.stowaway = (this.stats.stowaway || 0) + 1;
    this.say(load.length ? 'うわぁっ！ 荷台の箱にもゴキブリが！ ぜんぶ返品だ…！' : 'うわぁっ！ 積んだ箱からゴキブリが！ こんなの出荷できるか！');
    this.toast(load.length ? `出荷ジャック成功！ 荷台の${load.length}箱も虫入り！` : '出荷ジャック成功！', 'good');
    if (this.ruined >= this.diff.target) this.checkEnd && this.checkEnd();
    this.radio('ラジオ「出荷の箱にゴキブリが入っていたとの情報です」', true);
    this.snap('stowaway', '出荷されるかごにもぐりこんで、出荷を台無しに！');
    this.sfx.scream();
    this.events.push('stowaway');
  }

  // ---------------- 第21回：停電とネズミ ----------------
  updateBlackout(dt) {
    const B = this.blackout;
    if (!B || B.done) { this.blackoutK = Math.max(0, this.blackoutK - dt * 2); return; }
    const f = this.farmer;
    if (B.t > 0) {
      B.t -= dt;
      this.blackoutK = Math.min(1, this.blackoutK + dt * 4);
      if (B.t <= 0) { B.done = true; this.say('…おっ、電気がついた'); this.sfx.click && this.sfx.click(); }
      return;
    }
    B.at -= dt;
    if (B.at <= 0 && f && f.state === 'WORK' && !f.carry && !f.hidden) {
      B.t = 10;
      f.act = null;
      this.say('うわっ、停電か！？ なんも見えん…', true);
      this.sfx.thud && this.sfx.thud();
      this.events.push('blackout');
      this.stats.blackout = 1;
    }
  }
  updateRat(dt) {
    const R = this.rat, f = this.farmer;
    if (!R || !f) return;
    if (!R.run) {
      R.next -= dt;
      if (R.next > 0 || f.state !== 'WORK' || f.carry || f.hidden || f.catHold > 0) return;
      // 農場主のそばを横切るように、ハウスの端から端へ走る
      const side = rand() < 0.5 ? -1 : 1;
      const sz = clamp(f.z + side * 7, BOUNDS.minZ + 1, BOUNDS.maxZ - 1), ez = clamp(f.z - side * 7, BOUNDS.minZ + 1, BOUNDS.maxZ - 1);
      const x = clamp(f.x + randRange(-1.2, 1.2), BOUNDS.minX + 2, BOUNDS.maxX - 2);
      if (!R.model) R.model = makeRat();
      this.root.add(R.model);
      R.run = { x, z: sz, ez, dir: Math.sign(ez - sz) || 1, seen: false, t: 0 };
      R.model.position.set(x, 0, sz);
      R.model.rotation.y = R.run.dir > 0 ? 0 : Math.PI;
      this.events.push('rat');
      return;
    }
    const U = R.run;
    U.t += dt;
    U.z += U.dir * 5.5 * dt;
    R.model.position.set(U.x + Math.sin(U.t * 5) * 0.15, Math.abs(Math.sin(U.t * 22)) * 0.05, U.z);
    if (R.model.userData.tail) R.model.userData.tail.rotation.z = Math.sin(U.t * 18) * 0.4;
    const d = Math.hypot(U.x - f.x, U.z - f.z);
    if (!U.seen && d < 3.5 && f.state !== 'CHASE' && f.state !== 'PANIC' && f.state !== 'FUMIGATE') {
      U.seen = true;
      f.catHold = 3.5; f.act = null;
      f.h = Math.atan2(U.x - f.x, U.z - f.z);
      f.susp = Math.max(0, f.susp - 30);
      this.say(pick(['うわっ、ネズミ！', 'こらっ、ネズミめ！', 'ネズミまで出やがった…']), true);
      this.sfx.huh && this.sfx.huh();
      this.stats.rats = (this.stats.rats || 0) + 1;
    }
    if ((U.dir > 0 && U.z >= U.ez) || (U.dir < 0 && U.z <= U.ez) || U.t > 6) {
      if (R.model.parent) R.model.parent.remove(R.model);
      R.run = null; R.next = randRange(110, 190);
    }
  }

  // ---------------- 隠れる・いたずら ----------------
  nearRadio(p) {
    const R = this.radioObj;
    return R && R.on && R.cd <= 0 && p.y < 0.3 && p.surface < 0 && Math.hypot(R.x - p.x, R.z - p.z) < 0.9 ? R : null;
  }
  breakRadio(R) {
    R.on = false; R.bite = 0; R.fixWait = 1.5;
    this.sfx.radioOff && this.sfx.radioOff();
    this.stats.radioBites = (this.stats.radioBites || 0) + 1;
    this.toast('ラジオが止まった！', 'good');
    this.events.push('radiooff');
  }
  // 農場主が直しにくる。直すと番組が変わる
  updateRadioObj(dt) {
    const R = this.radioObj;
    if (!R) return;
    R.cd = Math.max(0, R.cd - dt);
    if (!R.on) R.model.rotation.z = 0;
    const f = this.farmer;
    if (R.fixing && f.phase !== 'radio') { R.fixing = false; R.fixWait = 1; }
    if (R.on || R.fixing) return;
    R.fixWait -= dt;
    if (R.fixWait > 0 || f.state !== 'WORK' || f.carry || f.act || f.hidden) return;
    if (['toCrate', 'pack', 'toDoor', 'loading', 'placing'].includes(f.phase)) return;
    R.fixing = true;
    f.phase = 'radio'; f.timer = 5;
    this.pathTo(R.x + 1.2, R.z + 0.6);
    this.say(pick(['ん？ ラジオが止まった', 'おい、ラジオどうした']));
  }

  // 長靴の中にいると、農場主がそばに来たとき「うわっ！」
  updateBoots() {
    const p = this.player, f = this.farmer, B = this.boots;
    if (!p || !B || !p.inBoot || !f || f.hidden || f.state === 'CHASE' || f.state === 'PANIC' || f.state === 'FUMIGATE') return;
    if (Math.hypot(f.x - B.x, f.z - B.z) > 2.7) return;
    this.leaveHiding(p);
    p.x = B.x - 0.9; p.z = B.z - 0.5; p.trapImmune = 1.5;
    this.collide(p);
    if (f.carry) this.dropCarry('長靴にびっくり！ 箱を落とした！');
    f.catHold = 4;
    this.say('うわっ！ 長靴の中から！？');
    this.sfx.scream();
    this.shake = Math.max(this.shake, 0.4);
    this.stats.bootScares = (this.stats.bootScares || 0) + 1;
    this.prankDone('boot');
    this.snap('prank', '長靴から飛び出して、農場主をおどろかせた！');
  }

  nearBento(p) {
    const b = this.bento;
    return b && !b.done && p.y < 0.3 && Math.hypot(b.x - p.x, b.z - p.z) < 0.8 ? b : null;
  }
  propAt(p) {
    if (p.y > 0.3 || p.surface >= 0) return null;
    const G = this.glove;
    if (G && Math.hypot(G.x - p.x, G.z - p.z) < 0.8) return { kind: 'glove', o: G };
    const BT = this.boots;
    if (BT && Math.hypot(BT.x - p.x, BT.z - p.z) < 0.85) return { kind: 'boots', o: BT };
    const B = this.boxes && this.boxes.find((b) => !b.rider && Math.hypot(b.x - p.x, b.z - p.z) < 0.95);
    if (B) return { kind: 'box', o: B };
    const D = this.drains && this.drains.find((d) => Math.hypot(d.x - p.x, d.z - p.z) < 0.75);
    if (D) return { kind: 'drain', o: D };
    const T = this.traps.find((t) => !t.carry && !t.revenge && !t.fumigate && Math.hypot(t.x - p.x, t.z - p.z) < 1.15);
    if (T) return { kind: 'trap', o: T };
    return null;
  }
  helpersFor(p) {
    return this.nymphs.filter((r) => r.st === 'move' && r.y < 0.3 && Math.hypot(r.x - p.x, r.z - p.z) < 4.5)
      .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)).slice(0, 2);
  }
  useProp(p, pr) {
    if (pr.kind === 'glove') {
      p.inGlove = true; p.gloveT = 0; p.moving = false;
      p.x = pr.o.x; p.z = pr.o.z;
      p.model.root.visible = false;
      this.sfx.click();
      this.toast('軍手にもぐった！', 'good');
      this.prankDone('glove');
    } else if (pr.kind === 'boots') {
      // 長靴の中：見つからない。農場主がそばに来ると「うわっ！」
      p.inGlove = true; p.inBoot = true; p.gloveT = 0; p.moving = false;
      p.x = pr.o.x; p.z = pr.o.z;
      p.model.root.visible = false;
      this.sfx.click();
      this.toast('長靴に入った！', 'good');
      this.events.push('bootin');
    } else if (pr.kind === 'box') {
      p.box = pr.o; pr.o.rider = p;
      this.stats.boxes = (this.stats.boxes || 0) + 1;
      p.x = pr.o.x; p.z = pr.o.z;
      this.sfx.click();
      this.toast('段ボールをかぶった！', 'good');
      this.events.push('box');
    } else if (pr.kind === 'drain') {
      const to = this.drains[pr.o.to];
      p.st = 'drain'; p.drain = { to, t: 0 }; p.moving = false;
      p.x = pr.o.x; p.z = pr.o.z;
      p.model.root.visible = false;
      this.sfx.thud(0.25);
      this.events.push('drain');
    } else if (pr.kind === 'trap') this.startCarryTrap(p, pr.o);
  }
  leaveHiding(r) {
    if (!r) return;
    if (r.box) { r.box.rider = null; r.box = null; }
    if (r.inGlove) { r.inGlove = false; r.inBoot = false; r.model.root.visible = true; }
    if (r.stow) this.leaveStow(r);
    r.playDead = 0;
  }
  startPlayDead(p) {
    if (p.box || p.inGlove || p.st !== 'move') return false;
    if ((p.deadUses || 0) <= 0) { this.toast('死んだふりはもう使えない', 'warn'); return false; }
    p.deadUses--;
    this.stats.playdeads = (this.stats.playdeads || 0) + 1;
    p.playDead = 4; p.playDeadT = 0; p.fooled = 0; p.moving = false;
    p.eatingCrate = null; p.eatingFruit = null;
    this.sfx.click();
    const f = this.farmer;
    const chasing = f.state === 'CHASE' && f.target === p;
    // 第18回：赤い字のお知らせを1つ減らす（見られているときはボタンの赤で分かる）
    if (!chasing) this.toast(`死んだふり！ あと${p.deadUses}`, 'info');
    this.events.push('playdead');
    return true;
  }
  prankDone(id) {
    if (!this.pranks || this.pranks[id]) return;
    this.pranks[id] = true;
    const pr = PRANKS.find((x) => x.id === id);
    this.toast(`いたずら成功！「${pr.text}」`, 'good');
    this.sfx.nice();
    this.snap('prank', `いたずら成功：${pr.text}`);
    this.events.push('prank');
  }
  // 仲間2匹とホイホイを運び、農場主の通り道にしかける
  startCarryTrap(p, t) {
    const hs = this.helpersFor(p);
    if (hs.length < 2) { this.toast('仲間が2匹いると運べる', 'warn'); return; }
    const f = this.farmer;
    let target = { x: 18.4, z: 8.6 }, bd = 1e9;
    for (let k = f.pi; k < f.path.length; k++) {
      const q = f.path[k];
      if (Math.hypot(q.x - f.x, q.z - f.z) < 3) continue;
      const d = Math.hypot(q.x - t.x, q.z - t.z);
      if (d < bd && d < 14) { bd = d; target = { x: q.x, z: q.z }; }
    }
    t.carry = { tx: target.x, tz: target.z, helpers: hs };
    for (const r of hs) r.st = 'carry';
    this.sfx.click();
    this.toast('ホイホイを運ぶぞ！', 'good');
    this.events.push('carry');
  }

  // 株の実：さいばい槽の上から届く高さのもの
  fruitInReach(r) {
    if (!this.onTrough(r)) return null;
    let best = null, bd = 0.6;
    for (const f of PLANT_FRUITS) {
      if (!f.alive || f.sprayed > this.clock) continue;
      const dy = f.y - r.y;
      if (dy < -0.4 || dy > 1.0) continue;
      const d = Math.hypot(f.x - r.x, f.z - r.z);
      if (d < bd) { bd = d; best = f; }
    }
    if (best) best.kind = 'fruit';
    return best;
  }

  biteFruit(f, amt) {
    if (!f.alive) return;
    f.hp -= amt;
    this.stats.ate += amt * 0.3;
    if (f.hp <= 0) this.dropFruit(f);
  }

  // 実が落ちる：栄養たっぷり、でも床に落ちてドスンと音がする
  dropFruit(f) {
    dropPlantFruit(f);
    for (const r of this.roaches) if (r.eatingFruit === f) r.eatingFruit = null;
    const mat = paprikaMaterial(f.hex);
    const m = new THREE.Mesh(f.geo, mat);
    m.userData.ownMaterial = true;
    m.scale.setScalar(f.s);
    m.position.set(f.x, f.y, f.z);
    m.castShadow = true;
    this.root.add(m);
    this.fallers.push({ m, vy: 0, x: f.x, y: f.y, z: f.z, fromY: f.y, landed: false, t: 0, spin: (rand() - 0.5) * 6 });
    // 熟した実ほど栄養たっぷり。緑の実は少しだけ
    const rp = ripeOf(f);
    this.addNutrition(30 * rp);
    if (this.player) this.player.hp = Math.min(this.player.maxHp, this.player.hp + 15 * rp);
    this.stats.fruits++;
    if (rp >= 1) this.stats.ripeFruits++;
    this.seen('fruit');
    this.toast(rp >= 1 ? '熟した実！ 栄養たっぷり' : rp >= 0.5 ? '実を落とした' : '緑の実…栄養は少し', rp >= 1 ? 'good' : 'info');
    // 株の見回り：食べられた場所を覚えておく
    this.plantHits.push({ x: f.x, z: f.z, t: this.clock });
    this.events.push('fruit');
  }

  updateFallers(dt) {
    const keep = [];
    for (const f of this.fallers) {
      f.t += dt;
      if (!f.landed) {
        f.vy -= 20 * dt;
        f.y += f.vy * dt;
        f.m.rotation.x += f.spin * dt;
        if (f.y <= 0.2) {
          f.y = 0.2; f.landed = true;
          const dp = this.player ? Math.hypot(this.player.x - f.x, this.player.z - f.z) : 99;
          this.sfx.thud();
          if (dp < 8) this.shake = Math.max(this.shake, 0.3);
          // 落ちた音：農場主は落ちた床だけでなく、実がなっていた株の上も見る
          // 株に薬をまいたあとは、実の落ちる音に慣れて出荷を優先する
          const wary = this.farmer && this.farmer.plantWary > this.clock;
          this.noise({ x: f.x, y: f.fromY > 1 ? TROUGH_TOP : 0, z: f.z }, 11, wary ? 10 : 55);
        }
        f.m.position.set(f.x, f.y, f.z);
      }
      if (f.t > 9) { this.root.remove(f.m); disposeObject(f.m); } else keep.push(f);
    }
    this.fallers = keep;
  }

  baitInReach(r) {
    if (r.surface >= 0) return null;
    for (const b of this.baits) if (b.alive && Math.hypot(b.x - r.x, b.z - r.z) < 0.62) return b;
    return null;
  }

  eatBait(p, b) {
    b.alive = false;
    this.root.remove(b.model);
    p.eatingBait = null;
    p.baitT = 0;
    this.nutrition = 100;
    p.poison = 18;
    this.stats.baits++;
    this.seen('bait');
    this.sfx.poison();
    this.toast('毒エサ！ 栄養満タン、でも体力が減る…', 'warn');
    this.events.push('bait');
  }

  // 風の道の入口（渦）にいるか
  windLaneAt(r) {
    if (r.surface >= 0 || r.y > 0.1 || r.nymph) return null;
    for (const L of WIND_LANES) if (Math.hypot(L.x0 - r.x, L.z - r.z) < 0.9) return L;
    return null;
  }

  startGlide(p, L) {
    p.st = 'glide';
    p.glide = { t: 0, sx: p.x, sz: p.z, L, dur: 2.4 + (L.x1 - L.x0) * 0.02 };
    p.h = Math.PI / 2;
    this.stats.winds++;
    this.seen('wind');
    this.sfx.wind();
    this.events.push('wind');
  }

  crateInReach(r) {
    let best = null, bd = EAT_REACH;
    const y = this.surfY(r);
    for (const c of this.crates) {
      if (c.rotten || c.shipped || c.carried) continue;
      if (Math.abs(c.baseY - y) > 0.3) continue;
      const d = rectDist(r.x, r.z, c.rect);
      if (d <= bd) { bd = d; best = c; }
    }
    return best;
  }

  bite(c, amt, who) {
    if (c.rotten) return;
    if (who && !who.isPlayer) who.bitten = (who.bitten || 0) + amt; // 仲間ごとのかじった量
    c.hp -= amt;
    c.lastBite = this.clock;
    this.stats.ate += amt;
    if (c.hp <= 0) this.ruinCrate(c, who);
  }

  ruinCrate(c, who) {
    if (who && who.isPlayer) this.stats.byPlayer++;
    else if (who) this.stats.byNymph++;
    else this.stats.byOther++;
    c.hp = 0;
    c.rotten = true;
    c.model.flies.visible = true;
    setCrateRot(c.model, 1);
    this.ruined++;
    this.stats.ruined = this.ruined;
    this.stats.ruinedColor[c.colorIdx || 0]++;
    if (this.ruined >= this.diff.target) this.snap('last', '最後のコンテナをかじりつくした！');
    else if (this.ruined === this.diff.target - 1 && this.state === 'play' && !this.tutorial) this.say('もう限界だ…あと1箱でもやられたら…', true);
    this.sfx.ruin();
    if (c.gold && !this.stats.gold) { this.stats.gold = 1; this.toast('金のパプリカ！ 星が1つふえる', 'good'); this.sfx.nice && this.sfx.nice(4); }
    this.toast(`1箱ダメにした！ ${this.ruined}/${this.diff.target}`, 'good');
    this.events.push('ruin');
    for (const r of this.roaches) if (r.eatingCrate === c) r.eatingCrate = null;
  }

  // 栄養：仲間（と卵）が多いほどたまりにくい（大家族ほど食べ物が要る）。数に上限はない
  colonyFactor() {
    const n = this.nymphs.length + this.eggs.filter((e) => e.alive).length * 3;
    return 1 / (1 + n / (this.diff.assist ? 16 : 10));
  }
  addNutrition(v) {
    this.nutrition = Math.min(100, this.nutrition + v * this.colonyFactor());
  }

  tryLayEgg(p) {
    if (this.nutrition < 100) { this.toast('栄養が足りない', 'info'); return; }
    const pending = this.eggs.filter((e) => e.alive).length * 3;
    if (this.nymphs.length + pending >= MAX_NYMPHS) return;
    if (p.st !== 'move') return;
    this.nutrition = 0;
    const m = makeEgg();
    let bx = p.x - Math.sin(p.h) * 0.35, bz = p.z - Math.cos(p.h) * 0.35;
    if (p.surface >= 0) {
      const T = SURFACES[p.surface];
      bx = clamp(bx, T.minX + 0.2, T.maxX - 0.2);
      bz = clamp(bz, T.minZ + 0.2, T.maxZ - 0.2);
    }
    const e = { kind: 'egg', x: bx, y: this.surfY(p), z: bz, surface: p.surface, t: 0, alive: true, model: m, sprayT: 0 };
    m.position.set(e.x, e.y, e.z);
    m.rotation.y = p.h;
    this.root.add(m);
    this.eggs.push(e);
    this.stats.eggs++;
    this.sfx.lay();
    const hid = this.hideFactor(e) < 0.5;
    this.toast(hid ? '卵を産んだ！' : '卵を産んだ！（目立つ場所…）', hid ? 'good' : 'info');
    this.events.push('egg');
  }

  tryAttack(p) {
    const f = this.farmer;
    if (p.st !== 'move') return;
    if (this.attackCD > 0) { this.toast(`突撃まで ${Math.ceil(this.attackCD)}秒`, 'info'); return; }
    if (f.state === 'PANIC') return;
    const d = Math.hypot(f.x - p.x, f.z - p.z);
    if (d > ATTACK_RANGE) { this.toast('足もとまで近づこう', 'info'); return; }
    p.st = 'fly';
    p.fly = { phase: 0, t: 0, sx: p.x, sy: p.y, sz: p.z };
    p.surface = -1;
    this.attackCD = ATTACK_CD;
    this.stats.attacks++;
    this.sfx.whoosh();
  }

  // ---------------- 仲間（幼虫）の動き ----------------
  updateNymph(r, dt) {
    r.moving = false; r.dashing = false;
    r.eatingCrate = null;
    if (r.st === 'stuck') {
      r.stuckT += dt;
      if (r.stuckT > 7) this.kill(r, 'trap');
      return;
    }
    if (r.st !== 'move') return;
    const f = this.farmer;
    const ai = r.ai;
    let tx = null, tz = null, spd = 2.4, eatTarget = null;

    // 叩きつぶし・殺虫剤の予告からは逃げる
    let danger = null;
    if (f.act && !f.act.done) {
      const d = Math.hypot(f.act.x - r.x, f.act.z - r.z);
      if (d < f.act.radius + 0.5 && Math.abs(f.act.y - r.y) < 1) danger = f.act;
    }
    for (const c of this.clouds) {
      if (Math.hypot(c.x - r.x, c.z - r.z) < c.r + 0.3 && Math.abs(c.y - r.y) < 1.5) danger = c;
    }

    const autoDecoy = this.mode === 'search' && f.state === 'CHASE' && f.target === this.player && ai.slot < 0.5 && Math.hypot(f.x - r.x, f.z - r.z) < 14;
    if (this.fog || (f.state === 'FUMIGATE')) {
      // けむり玉：いちばん近い逃げ場へ
      const sp = this.nearestSafe(r);
      tx = sp.x; tz = sp.z; spd = 3.9;
      if (Math.hypot(sp.x - r.x, sp.z - r.z) < sp.r * 0.6) tx = null;
    } else if (danger) {
      const dx = r.x - danger.x, dz = r.z - danger.z, d = Math.hypot(dx, dz) || 1;
      tx = r.x + (dx / d) * 2; tz = r.z + (dz / d) * 2; spd = 3.8;
    } else if (f.state === 'CHASE' && f.target === r && this.mode !== 'decoy') {
      // 追われたら隠れ場所へ
      if (!ai.hide || ai.retarget <= 0) { ai.hide = this.pickHideSpot(r); ai.retarget = 3; }
      tx = ai.hide.x; tz = ai.hide.z; spd = 3.8;
    } else if (this.mode === 'search' && !autoDecoy) {
      ai.retarget -= dt;
      const t = ai.target;
      if (!t || t.rotten || t.shipped || t.carried || ai.retarget <= 0) {
        ai.target = this.pickCrateFor(r);
        ai.retarget = 6;
      }
      const c = ai.target;
      if (c) {
        if (this.crateInReach(r) === c) {
          eatTarget = c;
        } else if (c.table >= 0 && r.surface !== c.table && r.surface < 0) {
          const T = TABLES[c.table];
          const side = r.z < T.z ? T.minZ - 0.25 : T.maxZ + 0.25;
          tx = c.x + 0.0; tz = side;
          if (Math.hypot(tx - r.x, tz - r.z) < 0.5) {
            const cl = this.canClimb(r);
            if (cl) { this.startClimb(r, cl); return; }
          }
        } else {
          const T = c.table >= 0 ? TABLES[c.table] : null;
          tx = c.x; tz = T ? (r.z < c.z ? c.z - 0.75 : c.z + 0.75) : (r.z < c.z ? c.z - 0.7 : c.z + 0.7);
        }
      } else {
        tx = this.player.x; tz = this.player.z;
      }
    } else if (this.mode === 'decoy' || autoDecoy) {
      // 農場主の前をうろちょろして気を引く（「まかせた」のときは、自分が追われると半分がおとりに）
      const a = this.clock * 0.9 + ai.slot * 6.28;
      const ahead = 3.2 + Math.sin(this.clock * 0.7 + ai.slot * 10) * 1.2;
      tx = f.x + Math.sin(f.h) * ahead + Math.cos(a) * 1.8;
      tz = f.z + Math.cos(f.h) * ahead + Math.sin(a) * 1.8;
      spd = 3.1;
    } else {
      // 集合：自分の後ろについていく
      const p = this.player;
      const k = ai.slot * 6.28;
      const back = 0.6 + (ai.slot * 0.6);
      tx = p.x - Math.sin(p.h + Math.sin(k) * 0.9) * back;
      tz = p.z - Math.cos(p.h + Math.sin(k) * 0.9) * back;
      if (p.surface >= 0 && r.surface < 0) {
        const T = SURFACES[p.surface];
        tz = r.z < T.z ? T.minZ - 0.25 : T.maxZ + 0.25;
        tx = clamp(p.x, T.minX + 0.4, T.maxX - 0.4);
        if (Math.hypot(tx - r.x, tz - r.z) < 0.5) {
          const cl = this.canClimb(r);
          if (cl) { this.startClimb(r, cl); return; }
        }
      }
      const d = Math.hypot(tx - r.x, tz - r.z);
      // 第18回：遠くの仲間は速く走ってきて、はぐれない
      spd = d > 8 ? 5.4 : d > 3 ? 4.0 : 2.6;
      if (d < 0.25) { tx = null; }
    }

    if (eatTarget) {
      r.eatingCrate = eatTarget;
      r.h = dampAngle(r.h, Math.atan2(eatTarget.x - r.x, eatTarget.z - r.z), 6, dt);
      // 仲間は、リーダー（自分）から遠いほど働きがにぶる
      const dl = this.player ? Math.hypot(this.player.x - r.x, this.player.z - r.z) : 0;
      const lead = clamp(1.2 - dl / 18, 0.35, 1);
      this.bite(eatTarget, 1.5 * dt * lead * (r.boss ? 3 : 1), r);
      if (r.boss && eatTarget.model && !eatTarget.carried) eatTarget.model.group.rotation.z = Math.sin(this.clock * 30) * 0.03;
      this.noise(r, 2.5, 4 * dt);
      r.crunchT -= dt;
      if (r.crunchT <= 0) {
        r.crunchT = 0.4 + rand() * 0.3;
        const dp = Math.hypot(this.player.x - r.x, this.player.z - r.z);
        if (dp < 8) this.sfx.crunch(0.05 * (1 - dp / 8));
      }
      return;
    }
    if (tx === null) return;

    let dx = tx - r.x, dz = tz - r.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.08) return;
    dx /= d; dz /= d;
    // わなと毒エサを避ける
    for (const t of [...this.traps, ...this.baits.filter((b) => b.alive)]) {
      const ex = r.x - t.x, ez = r.z - t.z, ed = Math.hypot(ex, ez);
      if (ed < 1.5 && ed > 0.001) { const w = (1.5 - ed) * 2.2; dx += (ex / ed) * w; dz += (ez / ed) * w; }
    }
    // 仲間どうし少し離れる
    for (const o of this.roaches) {
      if (o === r || !o.alive) continue;
      const ex = r.x - o.x, ez = r.z - o.z, ed = Math.hypot(ex, ez);
      if (ed < 0.35 && ed > 0.001) { dx += (ex / ed) * 0.8; dz += (ez / ed) * 0.8; }
    }
    // 引っかかったら少しずらす
    ai.jitterT -= dt;
    if (ai.jitterT > 0) { dx += ai.jx; dz += ai.jz; }
    const m = Math.hypot(dx, dz) || 1;
    this.moveRoach(r, dx / m, dz / m, Math.min(spd, d / dt), dt);
    r.dashing = spd > 3.5;
    ai.stallT += dt;
    if (ai.stallT > 1.2) {
      const moved = Math.hypot(r.x - ai.lastX, r.z - ai.lastZ);
      if (moved < 0.3 && d > 0.6) { ai.jitterT = 0.8; const a = rand() * 6.28; ai.jx = Math.cos(a) * 1.5; ai.jz = Math.sin(a) * 1.5; }
      ai.lastX = r.x; ai.lastZ = r.z; ai.stallT = 0;
    }
  }

  pickCrateFor(r) {
    let best = null, bs = Infinity;
    for (const c of this.crates) {
      if (c.rotten || c.shipped || c.carried) continue;
      const users = this.roaches.filter((o) => o.alive && o !== r && !o.isPlayer && o.ai.target === c).length;
      if (users >= (this.diff.assist ? EATERS_MAX_ASSIST : EATERS_MAX)) continue; // 1つの箱をかじれるのは4匹まで
      const df = Math.hypot(c.x - this.farmer.x, c.z - this.farmer.z);
      const s = Math.hypot(c.x - r.x, c.z - r.z) + users * 6 + (df < 5 ? 8 : 0) + (100 - c.hp) * -0.05;
      if (s < bs) { bs = s; best = c; }
    }
    return best;
  }

  nearestSafe(r) {
    let best = SAFE_SPOTS[0], bd = Infinity;
    for (const s of SAFE_SPOTS) { const d = Math.hypot(s.x - r.x, s.z - r.z); if (d < bd) { bd = d; best = s; } }
    return best;
  }

  pickHideSpot(r) {
    const f = this.farmer;
    let best = HIDE_SPOTS[0], bs = Infinity;
    for (const s of HIDE_SPOTS) {
      const s1 = Math.hypot(s.x - r.x, s.z - r.z) - 0.7 * Math.hypot(s.x - f.x, s.z - f.z);
      if (s1 < bs) { bs = s1; best = s; }
    }
    return { x: best.x + randRange(-0.5, 0.5), z: best.z + randRange(-0.3, 0.3) };
  }

  // ---------------- 共通の動き ----------------
  moveRoach(r, dx, dz, spd, dt) {
    r.h = dampAngle(r.h, Math.atan2(dx, dz), 12, dt);
    r.x += dx * spd * dt;
    r.z += dz * spd * dt;
    r.phase += spd * dt * (r.nymph ? 26 : 18);
    r.moving = true;
    this.collide(r);
    if (r.surface >= 0 && !inRect(r.x, r.z, SURFACES[r.surface], 0.02)) {
      r.surface = -1;
      r.st = 'fall';
      r.vy = 0;
    }
  }

  collide(r) {
    r.x = clamp(r.x, BOUNDS.minX, BOUNDS.maxX);
    r.z = clamp(r.z, BOUNDS.minZ, BOUNDS.maxZ);
    const y = r.st === 'fall' ? 0 : this.surfY(r);
    const pad = r.nymph ? 0.09 : 0.13;
    for (const c of this.crates) {
      if (c.shipped || c.carried) continue;
      if (Math.abs(c.baseY - y) > 0.3) continue;
      const R = c.rect;
      if (r.x > R.minX - pad && r.x < R.maxX + pad && r.z > R.minZ - pad && r.z < R.maxZ + pad) {
        const pl = r.x - (R.minX - pad), pr = (R.maxX + pad) - r.x, pb = r.z - (R.minZ - pad), pf = (R.maxZ + pad) - r.z;
        const m = Math.min(pl, pr, pb, pf);
        if (m === pl) r.x = R.minX - pad; else if (m === pr) r.x = R.maxX + pad;
        else if (m === pb) r.z = R.minZ - pad; else r.z = R.maxZ + pad;
      }
    }
    r.x = clamp(r.x, BOUNDS.minX, BOUNDS.maxX);
    r.z = clamp(r.z, BOUNDS.minZ, BOUNDS.maxZ);
  }

  canClimb(r) {
    if (r.surface !== -1 || r.st !== 'move') return null;
    for (let i = 0; i < SURFACES.length; i++) {
      const T = SURFACES[i];
      const d = rectDist(r.x, r.z, T);
      let px = clamp(r.x, T.minX, T.maxX), pz = clamp(r.z, T.minZ, T.maxZ);
      if (d === 0) {
        const e = [r.x - T.minX, T.maxX - r.x, r.z - T.minZ, T.maxZ - r.z];
        const m = Math.min(...e);
        if (m > 0.75) continue;
        if (m === e[0]) px = T.minX; else if (m === e[1]) px = T.maxX; else if (m === e[2]) pz = T.minZ; else pz = T.maxZ;
      } else if (d > 0.65) continue;
      return {
        table: i,
        tx: clamp(px, T.minX + 0.35, T.maxX - 0.35),
        tz: clamp(pz, T.minZ + 0.32, T.maxZ - 0.32),
      };
    }
    return null;
  }

  startClimb(r, c) {
    r.st = 'climb';
    r.climb = { t: 0, sx: r.x, sz: r.z, sy: r.y, tx: c.tx, tz: c.tz, table: c.table };
    r.h = Math.atan2(c.tx - r.x, c.tz - r.z);
    if (r.isPlayer) this.events.push('climb');
  }

  updateRoachCommon(r, dt) {
    r.trapImmune = Math.max(0, r.trapImmune - dt);
    r.hurtT = Math.max(0, r.hurtT - dt);
    if (r.grow > 0) {
      r.grow = Math.max(0, r.grow - dt);
      r.model.root.scale.setScalar(lerp(1, 0.62, r.grow));
    }
    if (r.st === 'climb') {
      const c = r.climb;
      c.t += dt / 0.8;
      const t = Math.min(1, c.t);
      const e = smooth(t);
      r.x = lerp(c.sx, c.tx, e);
      r.z = lerp(c.sz, c.tz, e);
      r.y = lerp(c.sy, SURFACES[c.table].top, smooth(t * 1.35));
      r.phase += dt * 20;
      r.moving = true;
      if (c.t >= 1) {
        r.st = 'move';
        r.surface = c.table;
        r.y = SURFACES[c.table].top;
        r.climb = null;
        this.collide(r);
      }
    } else if (r.st === 'fall') {
      r.vy -= 22 * dt;
      r.y += r.vy * dt;
      if (r.y <= 0) {
        r.y = 0; r.vy = 0; r.st = 'move'; r.surface = -1;
        this.collide(r);
        // 第18回：自分の1匹だけ「ポテッ」と小さな土ぼこり
        if (r.isPlayer) { this.sfx.plop && this.sfx.plop(); this.addDust(r.x, r.z); }
      }
    } else if (r.st === 'fly') {
      this.updateFly(r, dt);
    } else if (r.st === 'glide') {
      const G = r.glide;
      G.t += dt;
      const k = Math.min(1, G.t / G.dur);
      const e = smooth(k);
      r.x = lerp(G.sx, G.L.x1, e);
      r.z = lerp(G.sz, G.L.z, Math.min(1, k * 3));
      r.y = Math.sin(Math.PI * k) * 3.2;
      r.h = Math.PI / 2;
      r.phase += dt * 30;
      if (k >= 1) {
        r.st = 'move'; r.y = 0; r.surface = -1; r.glide = null; r.trapImmune = 0.6;
        this.collide(r);
      }
    } else if (r.st === 'move') {
      r.y = this.surfY(r);
    }
  }

  updateFly(r, dt) {
    const f = this.farmer, F = r.fly;
    F.t += dt;
    const face = { x: f.x + Math.sin(f.h) * 0.6, y: 5.0, z: f.z + Math.cos(f.h) * 0.6 };
    r.phase += dt * 30;
    if (F.phase === 0) {
      const t = Math.min(1, F.t / 0.5);
      r.x = lerp(F.sx, face.x, t);
      r.z = lerp(F.sz, face.z, t);
      r.y = lerp(F.sy, face.y, t) + Math.sin(Math.PI * t) * 1.2;
      r.h = Math.atan2(face.x - F.sx, face.z - F.sz);
      if (t >= 1) { F.phase = 1; F.t = 0; this.farmerPanic(); }
    } else if (F.phase === 1) {
      r.x = face.x + Math.sin(this.clock * 40) * 0.06;
      r.y = face.y + Math.cos(this.clock * 33) * 0.06;
      r.z = face.z;
      r.h = f.h + Math.PI;
      if (F.t > 0.8) {
        F.phase = 2; F.t = 0;
        F.sx = r.x; F.sy = r.y; F.sz = r.z;
        let best = null;
        for (let k = 0; k < 16; k++) {
          const a = rand() * Math.PI * 2, d = 3 + rand() * 1.5;
          const x = clamp(f.x + Math.cos(a) * d, BOUNDS.minX + 0.3, BOUNDS.maxX - 0.3);
          const z = clamp(f.z + Math.sin(a) * d, BOUNDS.minZ + 0.3, BOUNDS.maxZ - 0.3);
          if (this.crates.some((c) => !c.shipped && !c.carried && c.baseY === 0 && rectDist(x, z, c.rect) < 0.3)) continue;
          if (this.traps.some((t) => Math.hypot(t.x - x, t.z - z) < 0.9)) continue;
          best = { x, z };
          // 隠れ場所に近い所を優先
          if (this.hideFactor({ x, y: 0, z }) < 0.5) break;
        }
        F.lx = best ? best.x : clamp(f.x + 3, BOUNDS.minX, BOUNDS.maxX);
        F.lz = best ? best.z : f.z;
        this.sfx.whoosh();
      }
    } else {
      const t = Math.min(1, F.t / 0.55);
      r.x = lerp(F.sx, F.lx, t);
      r.z = lerp(F.sz, F.lz, t);
      r.y = lerp(F.sy, 0, t) + Math.sin(Math.PI * t) * 0.8;
      r.h = Math.atan2(F.lx - F.sx, F.lz - F.sz);
      if (t >= 1) {
        r.st = 'move'; r.y = 0; r.surface = -1; r.fly = null; r.trapImmune = 0.6;
        this.collide(r);
      }
    }
  }

  freeFromTrap(r) {
    const t = r.trap;
    r.st = 'move';
    r.trap = null;
    r.struggle = 0;
    r.stuckT = 0;
    r.trapImmune = 1.6;
    if (t && t.sheet) {
      // 粘着シートからは、さいばい槽の上を横にぬける
      r.x = t.x + (r.x >= t.x ? 0.7 : -0.7);
      this.collide(r);
    } else if (t) {
      let dx = r.x - t.x, dz = r.z - t.z;
      let d = Math.hypot(dx, dz);
      if (d < 0.01) { dx = Math.sin(r.h); dz = Math.cos(r.h); d = 1; }
      r.x = t.x + (dx / d) * 0.95;
      r.z = t.z + (dz / d) * 0.95;
      this.collide(r);
    }
    if (r.isPlayer) this.toast('ホイホイからぬけ出した！', 'good');
    this.sfx.whoosh();
  }

  damage(r, amt, cause) {
    if (!r.alive || amt <= 0 || this.tour) return;
    r.hp -= amt;
    if (r.isPlayer) {
      if (r.hurtT <= 0 && amt > 0.2) { this.sfx.hurt(); r.hurtT = 0.4; }
      this.ui.hurt(Math.min(1, amt / 20));
    }
    if (r.hp <= 0) this.kill(r, cause);
  }

  kill(r, cause) {
    if (!r.alive) return;
    // 第16回：最後の仲間がやられて自分1匹になったら、一瞬だけゆっくりに（1回のプレイで1回）
    if (!r.isPlayer && !this.lastOneDone && this.nymphs.length === 1 && this.state === 'play' && !this.tutorial) {
      this.lastOneDone = true; this.slowT = 0.7;
      this.sfx.thud && this.sfx.thud(); this.events.push('lastone');
    }
    r.alive = false;
    r.hp = 0;
    r.deadT = 0;
    r.st = 'dead';
    r.eatingCrate = null;
    if (r.trap) r.trap = null;
    r.model.body.rotation.z = Math.PI;
    r.model.body.position.y = 0.17;
    const cname = { spray: '殺虫剤', whack: '叩きつぶし', trap: 'ホイホイ・粘着シート', smoke: 'けむり', cat: 'ネコ', spider: 'クモ', poison: '毒エサ' }[cause] || '';
    if (!r.isPlayer) {
      this.stats.lost++;
      const dp = Math.hypot(this.player.x - r.x, this.player.z - r.z);
      if (dp < 12) this.toast(`仲間がやられた…（${cname}）`, 'bad');
      return;
    }
    this.sfx.die();
    this.stats.deaths++;
    this.lastDeathCause = cause;
    this.events.push(`killed:${cause}`); // 第20回：何にやられたかを絵で一瞬
    // 仲間がいれば意識を移す
    let next = null, bd = Infinity;
    for (const o of this.roaches) {
      if (!o.alive || o === r) continue;
      const d = Math.hypot(o.x - r.x, o.z - r.z) + (o.st === 'stuck' ? 50 : 0);
      if (d < bd) { bd = d; next = o; }
    }
    if (!next) {
      const egg = this.eggs.find((e) => e.alive);
      if (egg) { this.hatch(egg); next = this.nymphs[0] || null; }
    }
    r.isPlayer = false;
    if (next) {
      next.isPlayer = true;
      next.nymph = false;
      next.maxHp = 70;
      next.hp = 70;
      next.grow = 1;
      next.ai.target = null;
      next.deadUses = r.deadUses || 0;
      if (next.st === 'carry') next.st = 'move';
      this.leaveHiding(r);
      this.player = next;
      this.wearHat(next);
      this.toast(`やられた…（${cname}）仲間に乗りかえ！`, 'bad');
      this.events.push('transfer');
    } else {
      this.endGame(false, 'dead');
    }
  }

  // ---------------- 卵 ----------------
  updateEggs(dt) {
    for (const e of this.eggs) {
      if (!e.alive) continue;
      e.t += dt;
      const k = e.t / this.diff.hatch;
      e.model.scale.setScalar(1 + Math.sin(this.clock * 8) * 0.04 * k);
      if (e.t >= this.diff.hatch) this.hatch(e);
    }
  }

  hatch(e) {
    if (!e.alive) return;
    e.alive = false;
    this.root.remove(e.model);
    const n = 3;
    for (let i = 0; i < n; i++) {
      const a = (i / 3) * Math.PI * 2;
      let x = e.x + Math.cos(a) * 0.3, z = e.z + Math.sin(a) * 0.3;
      if (e.surface >= 0) {
        const T = SURFACES[e.surface];
        x = clamp(x, T.minX + 0.12, T.maxX - 0.12);
        z = clamp(z, T.minZ + 0.12, T.maxZ - 0.12);
      }
      const r = this.spawnRoach(x, z, true, e.y, e.surface);
      this.collide(r);
      this.stats.born++;
    }
    this.sfx.hatch();
    if (!this.buddy) this.makeBuddy(this.nymphs[this.nymphs.length - 1]);
    this.toast(`仲間が ${n} 匹ふえた！`, 'good');
    this.events.push('hatch');
  }

  // 着地の土ぼこり：小さな茶色の輪が広がって消える
  addDust(x, z) {
    const m = makeRing(0xb08a5a, 0.08, 0.2, 0.6);
    m.position.set(x, 0.03, z);
    this.root.add(m);
    (this.dusts || (this.dusts = [])).push({ m, t: 0 });
  }
  updateDust(dt) {
    if (!this.dusts || !this.dusts.length) return;
    for (const d of this.dusts) {
      d.t += dt;
      d.m.scale.setScalar(1 + d.t * 6);
      d.m.material.opacity = Math.max(0, 0.6 * (1 - d.t / 0.45));
    }
    for (const d of this.dusts.filter((x) => x.t > 0.45)) { this.root.remove(d.m); disposeObject(d.m); }
    this.dusts = this.dusts.filter((x) => x.t <= 0.45);
  }

  // 田んぼ道のおみやげ：自分のそばに仲間が来る
  giveSouvenir(n, kind = 'gift') {
    const p = this.player;
    if (!p || !(n > 0)) return;
    for (let i = 0; i < n; i++) {
      const a = (i / Math.max(1, n)) * Math.PI * 2 + 0.6;
      const r = this.spawnRoach(p.x + Math.cos(a) * 0.5, p.z + Math.sin(a) * 0.5, true, p.surface >= 0 ? p.y : 0, p.surface);
      this.collide(r);
      if (kind === 'carry') { this.markVeteran(r); this.makeBuddy(r); }
    }
    this.sfx.hatch();
    this.toast(kind === 'carry' ? `仲間 ${n}匹がついてきた！` : `おみやげ！ 仲間 +${n}`, 'good');
    this.events.push('souvenir');
  }

  // ---------------- 農場主 ----------------
  farmerSpeed(kind) {
    const f = this.farmer;
    const base = { work: 2.3, inv: 2.7, chase: 3.45, carry: 2.0 }[kind];
    return base * this.diff.fSpeed * (1 + 0.07 * f.anger);
  }

  pathTo(x, z) {
    const f = this.farmer;
    f.path = this.grid.find(f.x, f.z, x, z);
    f.pi = 0;
  }

  // 道に沿って歩く。着いたら true
  walk(dt, speed) {
    const f = this.farmer;
    if (f.pi >= f.path.length) { f.moveSpeed = 0; return true; }
    const p = f.path[f.pi];
    const dx = p.x - f.x, dz = p.z - f.z, d = Math.hypot(dx, dz);
    if (d < 0.2) { f.pi++; return f.pi >= f.path.length; }
    const step = Math.min(d, speed * dt);
    f.x += (dx / d) * step;
    f.z += (dz / d) * step;
    f.h = dampAngle(f.h, Math.atan2(dx, dz), 7, dt);
    f.moveSpeed = speed;
    f.stepAcc += step;
    if (f.stepAcc > 1.7) {
      f.stepAcc = 0;
      const dp = Math.hypot(this.player.x - f.x, this.player.z - f.z);
      const v = Math.max(0, 1 - dp / 26);
      // 作業場（x>4）はコンクリで「コツ」、畝のある所は土で「ザッ」
      const hard = f.x > 4;
      this.sfx.boot(v * v * 0.8, this.panOf(f.x, f.z), hard);
      if (v > 0.15) this.soundPings.push({ x: f.x, z: f.z, v: Math.min(1, v * 1.2), kind: 'step', hard });
      if (dp < 5) this.shake = Math.max(this.shake, (1 - dp / 5) * 0.25);
    }
    return false;
  }

  hideFactor(t) {
    if (t.surface >= TROUGH0 && t.y > 1) return 0.45; // さいばい槽の上：葉にまぎれる
    if (t.y < 0.4) {
      if (tableAt(t.x, t.z, -0.1) >= 0) return 0.13;
      if (rowAt(t.x, t.z)) return 0.22;
      return 1;
    }
    return 1.1;
  }

  visibility(t) {
    if (t.kind === 'egg') return t.alive ? this.hideFactor(t) * 0.75 : 0;
    if (!t.alive || t.st === 'fly' || t.st === 'glide' || t.st === 'dead') return 0;
    if (t.inGlove) return 0.02;
    if (t.stow) return t.stow.wiggle > 0 ? 0.25 : 0.01;
    if (t.st === 'drain') return 0;
    let v = this.hideFactor(t);
    if (t.box) v = Math.min(v, t.moving ? 0.5 : 0.1);
    v *= t.moving ? (t.dashing ? 1.5 : 1) : 0.4;
    // 死んだふり：「！」（追いかけられている）とき以外はほとんど目に入らない
    if (t.playDead > 0) { const f = this.farmer; if (!(f && f.state === 'CHASE' && f.target === t)) v *= 0.12; }
    if (t.eatingCrate) v *= t.isPlayer ? 1 + t.greed / 100 * 0.9 : 1.3;
    if (t.st === 'stuck') v = Math.max(v, 1.0);
    if (t.st === 'climb') v = Math.max(v, 0.9);
    if (t.nymph) v *= 0.8;
    return v;
  }

  // 株の列（葉の壁）が間にあると見えない
  plantsBetween(ax, az, bx, bz) {
    const ra = rowAt(ax, az, 0.3), rb = rowAt(bx, bz, 0.3);
    const d = Math.hypot(bx - ax, bz - az);
    const n = Math.ceil(d / 0.4);
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const r = rowAt(ax + (bx - ax) * t, az + (bz - az) * t, -0.2);
      if (r && r !== ra && r !== rb) return true;
    }
    return false;
  }

  sight(t) {
    const f = this.farmer;
    const dx = t.x - f.x, dz = t.z - f.z, d = Math.hypot(dx, dz);
    const range = f.coneRange;
    if (d > range) return 0;
    if (t.y < 4.5 && this.plantsBetween(f.x, f.z, t.x, t.z)) return 0;
    const dot = d > 0.01 ? (dx * Math.sin(f.view) + dz * Math.cos(f.view)) / d : 1;
    if (this.night) {
      // 夜は懐中電灯の光の中だけよく見える。すぐ近くはうっすら
      if (d <= 1.8 && dot > -0.3) return this.visibility(t) * 0.45;
      if (dot < 0.9) return 0;
      return this.visibility(t) * (1 - (d / range) * 0.5) * 1.1;
    }
    if (d > 2.2 && dot < 0.71) return 0;
    if (d <= 2.2 && dot < -0.3) return 0;
    return this.visibility(t) * (1 - (d / range) * 0.65);
  }

  noise(src, radius, amount) {
    const f = this.farmer;
    if (!f || f.state === 'PANIC') return;
    const d = Math.hypot(src.x - f.x, src.z - f.z);
    if (d > radius) return;
    f.susp = Math.min(100, f.susp + amount * (1 - (d / radius) * 0.5) * this.diff.susp);
    f.lastSeen = { x: src.x, y: src.y, z: src.z };
    f.suspect = src;
  }

  // 音の左右：画面の右にあれば +、左にあれば -
  panOf(x, z) {
    const p = this.player;
    if (!p) return 0;
    const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz) || 1;
    return ((dx / d) * -Math.cos(this.camYaw) + (dz / d) * Math.sin(this.camYaw)) * 0.9;
  }

  updateFarmer(dt) {
    const f = this.farmer;
    f.speechT -= dt;
    // 第18回：仲間がとても多いと、農場主が後ずさりする（字は出さず、動きと声だけ）
    f.backCD = Math.max(0, (f.backCD || 0) - dt);
    if (f.backT > 0) {
      f.backT -= dt;
      f.x = clamp(f.x + f.backDX * 1.6 * dt, BOUNDS.minX + 1, BOUNDS.maxX - 1);
      f.z = clamp(f.z + f.backDZ * 1.6 * dt, BOUNDS.minZ + 1, BOUNDS.maxZ - 1);
      f.moveSpeed = 1.6;
    } else if (!f.backCD && !f.hidden && !f.carry && (f.state === 'WORK' || f.state === 'INVESTIGATE') && this.nymphs.length >= 15) {
      const near = this.nymphs.filter((r) => r.y < 0.3 && Math.hypot(r.x - f.x, r.z - f.z) < 3);
      if (near.length >= 6) {
        let cx = 0, cz = 0;
        for (const r of near) { cx += r.x; cz += r.z; }
        cx /= near.length; cz /= near.length;
        const d = Math.hypot(f.x - cx, f.z - cz) || 1;
        f.backDX = (f.x - cx) / d; f.backDZ = (f.z - cz) / d;
        f.backT = 0.9; f.backCD = 20;
        f.h = Math.atan2(cx - f.x, cz - f.z);
        this.sfx.huhDown ? this.sfx.huhDown() : this.sfx.huh();
        this.stats.backoffs = (this.stats.backoffs || 0) + 1;
      }
    }
    f.sprayCD = Math.max(0, f.sprayCD - dt);
    f.whackCD = Math.max(0, f.whackCD - dt);
    f.coneRange = this.night ? 13 : 10 + f.anger * 1.2;
    // 電話中：立ち止まって話しこむ。足もとしか見ていない（気づきにくい）
    if (f.phone && f.state === 'WORK') {
      f.moveSpeed = 0;
      f.view = f.h;
      if (!this.calm) { const s0 = f.susp; this.sense(dt); f.susp = s0 + (f.susp - s0) * 0.25; }
      if (f.state === 'WORK') return;
    }
    // 第21回：停電の間は、農場主は立ち止まって何も見えない
    if (this.blackout && this.blackout.t > 0 && f.state !== 'PANIC' && f.state !== 'FUMIGATE') {
      f.moveSpeed = 0; f.view = f.h;
      f.susp = Math.max(0, f.susp - 12 * dt);
      return;
    }
    // ネコが足にじゃれている間は動けない
    if (f.catHold > 0 && f.state !== 'PANIC' && f.state !== 'FUMIGATE') {
      f.catHold -= dt;
      f.moveSpeed = 0;
      f.view = f.h;
      return;
    }
    f.moveSpeed = 0;
    // 歩きながら時々よそ見をする（視界が横にふれる）
    f.glanceT -= dt;
    if (f.glanceT <= 0) { f.glanceT = randRange(2.5, 5.5); f.glanceDir = rand() < 0.5 ? -1 : 1; f.glanceDur = 1.3; }
    f.glanceDur -= dt;
    const glancing = f.glanceDur > 0 && (f.state === 'WORK' || f.state === 'INVESTIGATE') && !f.act;
    f.lookOff += ((glancing ? f.glanceDir * 0.95 : 0) - f.lookOff) * (1 - Math.exp(-6 * dt));
    f.view = f.h + f.lookOff;
    if (f.state !== 'PANIC' && f.state !== 'FUMIGATE' && !this.calm) this.sense(dt);
    if (this.calm) { f.moveSpeed = 0; f.h = f.baseH + Math.sin(this.clock * 0.6) * 0.5; return; }

    if (f.act) { this.updateAct(dt); return; }
    switch (f.state) {
      case 'FUMIGATE': this.farmerFumigate(dt); break;
      case 'WORK': this.farmerWork(dt); break;
      case 'INVESTIGATE': this.farmerInvestigate(dt); break;
      case 'CHASE': this.farmerChase(dt); break;
      case 'PANIC':
        f.timer -= dt;
        if (f.timer <= 0) {
          if ((f.panicCount || 0) >= 3) {
            f.state = 'WORK'; f.phase = 'choose'; f.susp = 0; f.focusT = 10;
            this.say(pick(['もう慣れたぞ！ そんな手が何度も効くか！', 'いいかげんにしろ！ 出荷が先だ！']));
          } else {
            this.startInvestigate(this.player, true);
            f.susp = 70;
            this.say('くそったれ…どこ行きやがった！');
          }
        }
        break;
      default: f.state = 'WORK'; f.phase = 'choose';
    }
  }

  sense(dt) {
    const f = this.farmer;
    let best = null, bs = 0;
    for (const r of this.roaches) {
      if (!r.alive) continue;
      const s = this.sight(r);
      if (s > bs) { bs = s; best = r; }
    }
    for (const e of this.eggs) {
      if (!e.alive) continue;
      const s = this.sight(e);
      if (s > bs) { bs = s; best = e; }
    }
    // 出荷に集中しているあいだは気づきにくい
    f.focusT = Math.max(0, (f.focusT || 0) - dt);
    // 仲間が増えるほど農場主の警戒が上がる（おたすけ中はゆるめ）
    const nN = this.nymphs.length;
    const crowd = 1 + Math.min(0.8, Math.max(0, nN - 10) * 0.025) * (this.diff.assist ? 0.5 : 1);
    const mul = this.diff.susp * (1 + 0.3 * f.anger) * (f.focusT > 0 ? 0.35 : 1) * crowd;
    if (best && bs > 0.04) {
      // 第21回：「？」から「！」までは少しゆっくり（にげる間をつくる）
      const late = f.susp >= 40 ? 0.7 : 1;
      f.susp = Math.min(100, f.susp + 58 * bs * mul * late * dt);
      if (f.state !== 'CHASE') {
        f.lastSeen = { x: best.x, y: best.y, z: best.z };
        f.suspect = best;
        if (f.state === 'INVESTIGATE' && f.inv) { f.inv.x = best.x; f.inv.y = best.y; f.inv.z = best.z; f.inv.dirty = true; }
      }
    } else if (f.state !== 'CHASE') {
      f.susp = Math.max(0, f.susp - 9 * dt);
    }
    // 死んだふりを目の前で見のがした（いたずら）
    const P = this.player;
    if (P && P.alive && P.playDead > 0 && !this.pranks.playdead && (f.state === 'WORK' || f.state === 'INVESTIGATE')) {
      const dx = P.x - f.x, dz = P.z - f.z, d = Math.hypot(dx, dz);
      if (d < 6.5 && d > 0.01 && (dx * Math.sin(f.view) + dz * Math.cos(f.view)) / d > 0.7 && !this.plantsBetween(f.x, f.z, P.x, P.z)) {
        P.fooled = (P.fooled || 0) + dt;
        if (P.fooled > 1.2) { this.prankDone('playdead'); this.say('…なんだ、死んでやがる。おどかしやがって'); }
      }
    }
    if (f.state === 'WORK' && f.susp >= 40 && f.lastSeen) {
      this.startInvestigate(f.lastSeen, false);
      this.say(pick(['ん？ 今なんか動いたな？', 'おい…誰かいんのか？', 'なんだ今の音は！']));
      this.sfx.huh();
    }
    if ((f.state === 'WORK' || f.state === 'INVESTIGATE') && f.susp >= 100 && f.suspect) {
      this.startChase(f.suspect);
    }
    // ダメになったコンテナに気づく
    for (const c of this.crates) {
      if (!c.rotten || c.discovered) continue;
      const t = { x: c.x, y: c.baseY, z: c.z };
      const dx = t.x - f.x, dz = t.z - f.z, d = Math.hypot(dx, dz);
      if (d > 9) continue;
      const dot = (dx * Math.sin(f.view) + dz * Math.cos(f.view)) / (d || 1);
      if (dot < 0.5 && d > 2.5) continue;
      c.discovered = true;
      f.anger = Math.min(3, f.anger + 1);
      this.say(pick(['ふざけんな！ 売り物にならねえじゃねえか！', '食い荒らしやがって…ぶっ殺す！', 'ゴキブリの分際で！']));
      this.queueTrapNear(c.x, c.z);
      if (f.state === 'WORK') { f.phase = 'shock'; f.timer = 1.6; f.path = []; }
      this.radio(f.anger >= 3 ? 'ラジオ「農場主さん、カンカンです。ホイホイが増える見こみ」' : `ラジオ「農場主さんの怒り、${f.anger}段階目。ホイホイにご注意を」`, true);
    }
  }

  queueTrapNear(x, z) {
    const f = this.farmer;
    if (!this.has('trap')) return;
    if (this.traps.length + f.trapQueue.length >= 9) return;
    for (let k = 0; k < 24; k++) {
      const a = rand() * Math.PI * 2, d = 1.2 + rand() * 1.6;
      const tx = x + Math.cos(a) * d, tz = z + Math.sin(a) * d;
      if (tx < BOUNDS.minX + 0.8 || tx > BOUNDS.maxX - 0.8 || tz < BOUNDS.minZ + 0.8 || tz > BOUNDS.maxZ - 0.8) continue;
      if (this.crates.some((c) => !c.shipped && c.baseY === 0 && rectDist(tx, tz, c.rect) < 0.8)) continue;
      if (this.traps.some((t) => Math.hypot(t.x - tx, t.z - tz) < 1.6)) continue;
      if (f.trapQueue.some((t) => Math.hypot(t.x - tx, t.z - tz) < 1.6)) continue;
      if (Math.hypot(tx - DOOR.x, tz - DOOR.z) < 2) continue;
      // ステージ3からは3回に1回は毒エサ（ステージ5は2回に1回）
      const every = this.diff.no >= 5 ? 2 : 3;
      const n = this.traps.length + this.baits.length + f.trapQueue.length;
      const kind = this.diff.no >= 3 && n % every === every - 1 ? 'bait' : 'trap';
      f.trapQueue.push({ x: tx, z: tz, kind });
      return;
    }
  }

  startInvestigate(p, spray) {
    const f = this.farmer;
    f.state = 'INVESTIGATE';
    f.inv = { x: p.x, y: p.y || 0, z: p.z, look: 0, spray };
    f.target = null;
    this.pathTo(p.x, p.z);
  }

  startChase(t) {
    const f = this.farmer;
    if (f.state !== 'CHASE') {
      this.stats.chased++;
      this.sfx.alert();
      if (t.kind === 'egg') this.say('卵まで産みやがって！ つぶしてやる！');
      else this.say(pick(['出やがったな、このゴキブリが！', '待てコラァ！', 'そこか！ 逃がすかよ！']), true);
      if (t === this.player) {
        this.events.push('spotted');
        this.radio(pick(['ラジオ「ただいまハウスにゴキブリ注意報が出ています」', 'ラジオ「ゴキブリ、農場主に見つかった模様です」', 'ラジオ「農場主さん、全力で追いかけています」']));
      }
    }
    if (f.carry) this.dropCarry('箱を置いた！ チャンス！');
    f.state = 'CHASE';
    f.target = t;
    f.susp = 100;
    f.lostT = 0;
    f.chaseT = 0;
    f.repath = 0;
    f.lastSeen = { x: t.x, y: t.y, z: t.z };
  }

  farmerPanic() {
    const f = this.farmer;
    this.dropCarry();
    if (f.act && f.act.marker) { this.root.remove(f.act.marker); disposeObject(f.act.marker); }
    f.act = null;
    f.state = 'PANIC';
    // 何度も飛びつかれると慣れてくる（パニックが短くなる）
    f.panicCount = (f.panicCount || 0) + 1;
    f.timer = Math.max(1.8, 5.5 - (f.panicCount - 1) * 1.0);
    f.target = null;
    f.susp = 0;
    f.anger = Math.min(3, f.anger + 1);
    f.path = [];
    this.say('うわぁぁっ！ 顔に！！ ふざけんなっ！');
    this.snap('panic', '農場主の顔に飛びついた！');
    this.sfx.scream();
    this.shake = 0.6;
    this.events.push('panic');
  }

  dropCarry(msg = '箱を落とした！ チャンス！') {
    const f = this.farmer;
    const c = f.carry;
    if (!c) return;
    f.carry = null;
    c.carried = false;
    c.table = -1;
    c.baseY = 0;
    const okAt = (x, z) => x > BOUNDS.minX + 1 && x < BOUNDS.maxX - 1 && z > BOUNDS.minZ + 0.8 && z < BOUNDS.maxZ - 0.8 &&
      !rowAt(x, z, 0.8) && tableAt(x, z, 0.9) < 0 &&
      !this.traps.some((t) => Math.hypot(t.x - x, t.z - z) < 1.4) &&
      !this.crates.some((o) => o !== c && !o.shipped && !o.carried && o.baseY === 0 && Math.abs(o.x - x) < CRATE.w + 0.1 && Math.abs(o.z - z) < CRATE.d + 0.1);
    let x = f.x + Math.sin(f.h) * 1.2, z = f.z + Math.cos(f.h) * 1.2;
    let found = okAt(x, z);
    for (let k = 0; k < 60 && !found; k++) {
      const a = rand() * 6.28, d = 1.2 + k * 0.12;
      x = f.x + Math.cos(a) * d;
      z = f.z + Math.sin(a) * d;
      found = okAt(x, z);
    }
    if (!found) { const p = this.grid.nearestFree(f.x, f.z); x = p.x; z = p.z; }
    x = clamp(x, BOUNDS.minX + 1, BOUNDS.maxX - 1);
    z = clamp(z, BOUNDS.minZ + 0.8, BOUNDS.maxZ - 0.8);
    c.x = x; c.z = z;
    this.root.attach(c.model.group);
    this.placeCrate(c);
    this.toast(msg, 'good');
  }

  farmerWork(dt) {
    const f = this.farmer;
    switch (f.phase) {
      case 'idle':
      case 'shock':
        f.timer -= dt;
        if (f.phase === 'idle') f.h = f.baseH + Math.sin(this.clock * 1.1) * 0.9;
        if (f.timer <= 0) f.phase = 'choose';
        break;
      case 'choose': {
        f.baseH = f.h;
        if (!this.fumigated && !this.easyMode && f.anger >= 3 && this.ruined >= Math.ceil(this.diff.target * (this.diff.fumAt || 0.5)) && !f.carry) {
          this.startFumigation();
          break;
        }
        if (f.trapQueue.length) {
          const t = f.trapQueue[0];
          f.phase = 'trap';
          this.pathTo(t.x, t.z);
          break;
        }
        if (f.carry) { f.phase = 'toDoor'; this.pathTo(DOOR.x, DOOR.z); break; }
        const c = this.pickWorkCrate();
        if (c) { f.crate = c; f.phase = 'toCrate'; this.pathTo(c.x, c.z); }
        else this.startPatrol();
        break;
      }
      case 'toCrate': {
        const c = f.crate;
        if (!c || c.rotten || c.shipped || c.carried) { f.phase = 'choose'; break; }
        const d = Math.hypot(c.x - f.x, c.z - f.z);
        if (d < 2.9) { f.phase = 'pack'; f.timer = 1.6; f.path = []; break; }
        if (this.walk(dt, this.farmerSpeed('work'))) {
          if (d < 3.6) { f.phase = 'pack'; f.timer = 1.6; }
          else { c.skipUntil = this.clock + 15; f.phase = 'choose'; }
        }
        break;
      }
      case 'pack': {
        const c = f.crate;
        if (!c || c.rotten || c.shipped || c.carried) { f.phase = 'choose'; break; }
        f.h = dampAngle(f.h, Math.atan2(c.x - f.x, c.z - f.z), 6, dt);
        f.timer -= dt;
        if (f.timer <= 0) {
          f.carry = c;
          c.carried = true;
          if (!c.stowed) this.events.push('carrystart');
          for (const r of this.roaches) if (r.eatingCrate === c) r.eatingCrate = null;
          f.model.root.attach(c.model.group);
          c.model.group.position.set(0, 2.85, 1.15);
          c.model.group.rotation.set(0, 0, 0);
          f.phase = 'toDoor';
          this.pathTo(DOOR.x, DOOR.z);
          if (c.hp < 85) {
            this.say('かじられてんじゃねえか…ナメやがって');
            this.queueTrapNear(c.x, c.z);
          }
        }
        break;
      }
      case 'toDoor':
        if (!f.carry) { f.phase = 'choose'; break; }
        if (this.walk(dt, this.farmerSpeed('carry'))) {
          const c = f.carry;
          if (c.stowed && c.stowed.alive && c.stowed.stow === c) { this.stowShipped(c.stowed, c); f.phase = 'choose'; break; }
          f.carry = null;
          c.carried = false;
          c.shipped = true;
          this.root.attach(c.model.group);
          const s = truckSlot(this.truckN++);
          c.shipNo = this.truckN;
          c.model.group.position.set(s.x, s.y, s.z);
          c.model.group.rotation.set(0, 0, 0);
          c.x = s.x; c.z = s.z;
          this.shipped++;
          this.stats.shipped = this.shipped;
          const leftN = this.shipLeft();
          if (leftN <= 2 && leftN > 0) this.radio(`ラジオ「本日の出荷、あと${leftN}箱で終わりの見こみです」`, true);
          this.sfx.ship();
          this.say(pick(['よし、一箱出荷だ', 'まず一箱。邪魔すんなよ', 'よいしょっと…次だ次']));
          this.toast(`出荷された…（あと${this.shipLeft()}）`, 'warn');
          this.events.push('ship');
          // トラックに積みこんで、ひもをかける
          f.phase = 'loading'; f.timer = this.diff.loadT; f.baseH = f.h;
        }
        break;
      case 'loading':
        f.timer -= dt;
        f.h = dampAngle(f.h, Math.PI / 2, 4, dt);
        if (f.timer <= 0) {
          if (rand() < this.diff.patrolP + this.alertLv * 0.12) this.startPatrol();
          else { f.phase = 'idle'; f.timer = 1.2; f.baseH = f.h; }
        }
        break;
      case 'patrol':
        if (this.walk(dt, this.farmerSpeed('work'))) {
          f.phase = 'tend';
          f.timer = randRange(this.diff.patrol[0], this.diff.patrol[1]);
          f.baseH = f.h;
        }
        break;
      case 'radio': {
        // ラジオを直す：そばまで行って5秒ほどいじる → 番組が変わる
        const R = this.radioObj;
        if (!R) { f.phase = 'choose'; break; }
        const d = Math.hypot(R.x - f.x, R.z - f.z);
        if (d > 2.2 && !this.walk(dt, this.farmerSpeed('work'))) break;
        f.path = [];
        f.h = dampAngle(f.h, Math.atan2(R.x - f.x, R.z - f.z), 6, dt);
        f.timer -= dt;
        R.model.rotation.z = Math.sin(this.clock * 9) * 0.06;
        if (f.timer <= 0) {
          R.on = true; R.fixing = false; R.cd = 25; R.model.rotation.z = 0;
          this.sfx.radioNext && this.sfx.radioNext();
          this.say(pick(['よし、直った。…あれ、番組が変わった', 'お、つながった。演歌か…まあいい']));
          f.phase = 'choose';
        }
        break;
      }
      case 'tend':
        f.timer -= dt;
        f.h = f.baseH + Math.sin(this.clock * 0.9) * 1.1;
        if (f.timer <= 0) f.phase = 'choose';
        break;
      case 'trap': {
        const t = f.trapQueue[0];
        if (!t) { f.phase = 'choose'; break; }
        const d = Math.hypot(t.x - f.x, t.z - f.z);
        if (d < 2.2 || this.walk(dt, this.farmerSpeed('work'))) {
          f.phase = 'placing'; f.timer = 1.3; f.path = [];
        }
        break;
      }
      case 'placing': {
        const t = f.trapQueue[0];
        if (t) f.h = dampAngle(f.h, Math.atan2(t.x - f.x, t.z - f.z), 6, dt);
        f.timer -= dt;
        if (f.timer <= 0) {
          f.trapQueue.shift();
          if (t) {
            if (t.kind === 'bait') { this.addBait(t.x, t.z); this.say('毒エサだ。食ったら最後だぞ'); }
            else { this.addTrap(t.x, t.z); this.say('ホイホイ置いとくぞ。覚えとけよ'); }
          }
          f.phase = 'choose';
        }
        break;
      }
      default: f.phase = 'choose';
    }
  }

  startPatrol() {
    const f = this.farmer;
    const p = pick(PATROL_POINTS);
    f.phase = 'patrol';
    this.pathTo(p.x, p.z);
  }

  pickWorkCrate() {
    const f = this.farmer;
    let best = null, bd = Infinity;
    for (const c of this.crates) {
      if (c.rotten || c.shipped || c.carried || (c.skipUntil || 0) > this.clock) continue;
      const d = Math.hypot(c.x - f.x, c.z - f.z) + (c.table < 0 ? 4 : 0);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  farmerInvestigate(dt) {
    const f = this.farmer, I = f.inv;
    if (!I) { f.state = 'WORK'; f.phase = 'choose'; return; }
    if (I.dirty) {
      f.repath -= dt;
      if (f.repath <= 0) { I.dirty = false; I.look = 0; f.repath = 0.6; this.pathTo(I.x, I.z); }
    }
    if (I.look <= 0) {
      const d = Math.hypot(I.x - f.x, I.z - f.z);
      if (d < 2.2 || this.walk(dt, this.farmerSpeed('inv'))) {
        I.look = 0.001;
        f.baseH = d > 0.3 ? Math.atan2(I.x - f.x, I.z - f.z) : f.h;
        f.path = [];
      }
      return;
    }
    I.look += dt;
    f.h = f.baseH + Math.sin(I.look * 1.6) * 1.0;
    if (I.plant && I.look > 0.8 && !I.plantSprayed) {
      // さいばい槽の上を見上げて、株に薬をまく
      I.plantSprayed = true;
      this.startAct('spray', I.plant.x, I.plant.y, I.plant.z);
      this.sprayPlants(I.plant.x, I.plant.z);
      this.say('株にも薬まいとくか。…これでしばらく収穫できねえな');
      f.plantWary = this.clock + 40;
      f.focusT = Math.max(f.focusT || 0, 12);
      return;
    }
    if (I.look > 3) {
      if (I.spray && !I.plant && f.anger >= 1 && f.sprayCD <= 0) {
        this.startAct('spray', I.x, I.y, I.z);
        this.say('念のため、まいとくぞ。くたばれ');
      } else if (rand() < 0.5) this.say('…チッ、気のせいか');
      f.state = 'WORK';
      f.phase = 'choose';
      f.susp = Math.min(f.susp, 30);
      f.inv = null;
    }
  }

  farmerChase(dt) {
    // 追いかけっこは長くは続けない。出荷が先だ
    this.farmer.chaseT = (this.farmer.chaseT || 0) + dt;
    if (this.farmer.chaseT > 18 && !this.farmer.act) {
      const f0 = this.farmer;
      f0.state = 'WORK'; f0.phase = 'choose'; f0.target = null; f0.susp = 0; f0.focusT = 14;
      this.say(pick(['チッ、キリがねえ。出荷が先だ', 'くそっ、相手してる暇はねえ！', '覚えてろよ…今は出荷だ']));
      return;
    }
    const f = this.farmer, t = f.target;
    if (!t || !t.alive) {
      f.state = 'INVESTIGATE';
      f.inv = { x: f.lastSeen ? f.lastSeen.x : f.x, y: f.lastSeen ? f.lastSeen.y || 0 : 0, z: f.lastSeen ? f.lastSeen.z : f.z, look: 0.001, spray: false };
      f.baseH = f.h;
      f.susp = 50;
      if (t && t.kind !== 'egg') this.say('やったか…？');
      return;
    }
    const dx = t.x - f.x, dz = t.z - f.z, d = Math.hypot(dx, dz);
    const seen = d < 16 && (d < 1.3 || (this.visibility(t) * (1 - (d / 16) * 0.5) > 0.14 && !this.plantsBetween(f.x, f.z, t.x, t.z)));
    if (seen) { f.lostT = 0; f.lastSeen = { x: t.x, y: t.y, z: t.z }; }
    else {
      f.lostT += dt;
      if (f.lostT > 3.2) {
        this.say(pick(['チッ、どこ行きやがった', '隠れやがったな…出てこい！', 'くそ、見失った']));
        this.startInvestigate(f.lastSeen, true);
        f.susp = 60;
        return;
      }
    }
    if (!f.lastSeen) f.lastSeen = { x: t.x, y: t.y, z: t.z };
    const L = f.lastSeen;
    const ld = Math.hypot(L.x - f.x, L.z - f.z);
    const underTable = t.y < 0.4 && tableAt(t.x, t.z, 0.1) >= 0;
    if (seen && d < 2.1 && f.whackCD <= 0 && !underTable) { this.startAct('whack', t.x, t.y, t.z); return; }
    if (seen && (t.kind === 'roach' || underTable) && d < 5.6 && (d > 1.2 || underTable) && f.sprayCD <= 0) { this.startAct('spray', t.x, t.y, t.z); return; }
    if (ld > 1.6) {
      f.repath -= dt;
      if (f.repath <= 0) { this.pathTo(L.x, L.z); f.repath = 0.5; }
      this.walk(dt, this.farmerSpeed('chase'));
    } else {
      f.h = dampAngle(f.h, Math.atan2(L.x - f.x, L.z - f.z), 8, dt);
    }
  }

  startAct(type, x, y, z) {
    const f = this.farmer;
    const spray = type === 'spray';
    const radius = spray ? 1.7 : 0.95;
    // 第18回：縦画面でも見えるよう、輪を太くし、中もうすく塗る
    const marker = makeRing(spray ? 0xffc21a : 0xff3b30, radius * 0.7, radius, 0.8);
    const fill = makeRing(spray ? 0xffe066 : 0xff6b5e, 0.001, radius * 0.7, 0.22);
    fill.material.opacity = 0.22;
    marker.add(fill);
    marker.position.set(x, y + 0.04, z);
    this.root.add(marker);
    f.act = { type, t: 0, x, y, z, wind: spray ? 0.65 : 0.8, radius, marker, done: false };
    f.path = [];
    if (spray) { this.sfx.hissStart(); this.seen('spray'); if (rand() < 0.5) this.say(pick(['くらえ！', '死ねっ！'])); }
  }

  updateAct(dt) {
    const f = this.farmer, A = f.act;
    A.t += dt;
    f.h = dampAngle(f.h, Math.atan2(A.x - f.x, A.z - f.z), 10, dt);
    const k = Math.min(1, A.t / A.wind);
    A.marker.material.opacity = 0.35 + 0.5 * Math.abs(Math.sin(A.t * 14));
    A.marker.scale.setScalar(0.6 + 0.4 * k);
    if (!A.done && A.t >= A.wind) {
      A.done = true;
      if (A.type === 'spray') {
        this.spawnCloud(A.x, A.y, A.z);
        f.sprayCD = Math.max(1.6, 3.8 - 0.6 * f.anger);
        this.sfx.hiss();
      } else {
        this.impact(A);
        f.whackCD = 1.3;
      }
      this.root.remove(A.marker);
      disposeObject(A.marker);
    }
    if (A.t >= A.wind + 0.45) f.act = null;
  }

  impact(A) {
    this.sfx.thump();
    const dp = Math.hypot(this.player.x - A.x, this.player.z - A.z);
    this.shake = Math.max(this.shake, Math.max(0, 1 - dp / 8) * 0.8);
    for (const r of this.roaches) {
      if (!r.alive || r.st === 'fly') continue;
      if (Math.hypot(r.x - A.x, r.z - A.z) <= A.radius && Math.abs(r.y - A.y) < 0.7) {
        this.damage(r, r.isPlayer ? 75 : 999, 'whack');
      }
    }
    for (const e of this.eggs) {
      if (e.alive && Math.hypot(e.x - A.x, e.z - A.z) <= A.radius + 0.1 && Math.abs(e.y - A.y) < 0.7) {
        e.alive = false;
        this.root.remove(e.model);
        this.toast('卵がつぶされた…', 'bad');
      }
    }
  }

  // ---------------- 殺虫剤の霧 ----------------
  spawnCloud(x, y, z) {
    const m = makeCloud();
    m.group.position.set(x, y, z);
    this.root.add(m.group);
    this.clouds.push({ x, y, z, t: 0, life: 4.5, r: 1.7, model: m });
  }

  updateClouds(dt) {
    for (const c of this.clouds) {
      c.t += dt;
      const grow = Math.min(1, c.t / 0.35);
      const fade = c.t > c.life - 1 ? Math.max(0, c.life - c.t) : 1;
      c.model.mat.opacity = 0.28 * fade;
      for (const p of c.model.puffs) {
        const o = p.userData.off;
        p.position.set(o.x * grow * 1.6, o.y + c.t * 0.12, o.z * grow * 1.6);
        p.scale.setScalar(p.userData.s * (0.5 + grow) * (1 + c.t * 0.05));
      }
      if (c.t < c.life - 0.5) {
        for (const r of this.roaches) {
          if (!r.alive || r.st === 'fly') continue;
          if (Math.hypot(r.x - c.x, r.z - c.z) <= c.r && Math.abs(r.y - c.y) < 1.5) {
            this.damage(r, this.diff.sprayDmg * dt * (r.nymph ? 1.3 : 1), 'spray');
          }
        }
        for (const e of this.eggs) {
          if (!e.alive || Math.hypot(e.x - c.x, e.z - c.z) > c.r || Math.abs(e.y - c.y) > 1.5) continue;
          e.sprayT += dt;
          if (e.sprayT > 1.5) {
            e.alive = false;
            this.root.remove(e.model);
            this.toast('卵が殺虫剤でやられた…', 'bad');
          }
        }
      }
    }
    const keep = [];
    for (const c of this.clouds) {
      if (c.t >= c.life) { this.root.remove(c.model.group); disposeObject(c.model.group); }
      else keep.push(c);
    }
    this.clouds = keep;
  }

  // ---------------- わな ----------------
  updateTraps(dt = 0) {
    // 仲間が運ぶホイホイ／しかけたホイホイ
    for (const t of [...this.traps]) {
      if (t.carry) {
        const C = t.carry;
        C.helpers = C.helpers.filter((r) => r.alive && r.st === 'carry');
        if (!C.helpers.length) { t.carry = null; continue; }
        const dx = C.tx - t.x, dz = C.tz - t.z, d = Math.hypot(dx, dz);
        const step = Math.min(d, 1.1 * dt);
        if (d > 0.05) { t.x += (dx / d) * step; t.z += (dz / d) * step; }
        t.model.position.set(t.x, 0, t.z);
        const hd = Math.atan2(dx, dz);
        C.helpers.forEach((r, i) => {
          const a = hd + (i ? 1 : -1) * 1.9;
          r.x = t.x + Math.sin(a) * 0.62; r.z = t.z + Math.cos(a) * 0.62; r.y = 0; r.surface = -1;
          r.h = hd; r.moving = true; r.phase += dt * 14;
        });
        if (d < 0.1) {
          t.carry = null; t.revenge = true;
          for (const r of C.helpers) { r.st = 'move'; r.trapImmune = 2.5; r.ai.target = null; }
          this.toast('ホイホイをしかけた！', 'good');
        }
      } else if (t.revenge) {
        const f = this.farmer;
        t.model.scale.setScalar(1 + Math.sin(this.clock * 6) * 0.05);
        if (f.state !== 'FUMIGATE' && f.state !== 'PANIC' && !f.hidden && Math.hypot(f.x - t.x, f.z - t.z) < 0.6) {
          f.catHold = 5; f.bootStuck = 5; f.act = null;
          if (f.carry) this.dropCarry('箱を落とした！');
          this.traps.splice(this.traps.indexOf(t), 1);
          this.root.remove(t.model); disposeObject(t.model);
          this.stats.revenge = (this.stats.revenge || 0) + 1;
          this.say('うわっ！ 長靴がホイホイにくっついた！ 誰だこんな所に置いたのは！');
          this.radio('ラジオ「ハウスで長靴ホイホイ事件が発生しました」', true);
          this.toast('仕返し成功！', 'good');
          this.sfx.stuck();
          this.snap('revenge', '農場主の長靴がホイホイにくっついた！');
          this.events.push('revenge');
        }
      }
    }
    for (const r of this.roaches) {
      if (!r.alive || r.st !== 'move' || r.y > 0.1 || r.trapImmune > 0) continue;
      for (const t of this.traps) {
        if (Math.hypot(r.x - t.x, r.z - t.z) < 0.5) {
          r.st = 'stuck';
          r.trap = t;
          r.struggle = 0;
          r.stuckT = 0;
          r.eatingCrate = null;
          if (r.isPlayer) {
            this.sfx.stuck();
            this.stats.stuck++;
            this.seen('trap');
            this.toast('ホイホイだ！ 連打で脱出！', 'bad');
            this.events.push('stuck');
          }
          break;
        }
      }
    }
  }

  updateCrates(dt = 0) {
    for (const c of this.crates) {
      if (c.wiggle > 0) {
        c.wiggle = Math.max(0, c.wiggle - dt);
        c.model.group.rotation.z = Math.sin(this.clock * 40) * 0.05 * (c.wiggle / 0.35);
      } else if (c.model.group.rotation.z && !c.fall) c.model.group.rotation.z = 0;
    }
    for (const c of this.crates) {
      if (c.rotten || c.shipped) continue;
      setCrateRot(c.model, Math.min(0.85, 1 - c.hp / 100));
    }
  }

  // ---------------- 見た目の更新 ----------------
  animateAll(dt) {
    const t = this.clock;
    for (const r of this.roaches) {
      const m = r.model;
      if (!r.alive) {
        r.deadT += dt;
        if (r.deadT > 4 && m.root.parent) m.root.parent.remove(m.root);
        continue;
      }
      m.root.position.set(r.x, r.y, r.z);
      m.root.rotation.y = r.h;
      const mv = r.st === 'stuck' ? 0.6 : r.moving ? 1 : 0;
      const ph = r.st === 'stuck' ? t * 30 : r.phase;
      // 遠くの仲間は脚と触角を描かない（数が多くても重くならないように）
      if (!r.isPlayer) {
        // 第17回：省エネ中は、もっと近くから簡単な形にする
        const far = this.player && Math.hypot(r.x - this.player.x, r.z - this.player.z) > (this.eco ? 6 : 9);
        if (m.farLod !== far) {
          m.farLod = far;
          for (const L of m.legs) L.g.visible = !far;
          for (const A of m.antennae) A.g.visible = !far;
          for (const P of m.palps) P.visible = !far;
        }
        if (far) continue;
      } else if (m.farLod) {
        m.farLod = false;
        for (const L of m.legs) L.g.visible = true;
        for (const A of m.antennae) A.g.visible = true;
        for (const P of m.palps) P.visible = true;
      }
      animateRoach(m, ph, mv, t + r.id, !!(r.eatingCrate || r.eatingFruit));
      // 第21回：仲間が10匹をこえると、止まっている仲間がときどき順番に体をゆらす「ウェーブ」（見た目だけ）
      if (!r.isPlayer && r.nymph && this.nymphs.length >= 10 && !r.moving && r.st === 'move' && !r.eatingCrate) {
        const wi = this.nymphs.indexOf(r);
        const d = (t % 9) - wi * 0.09;
        if (d > 0 && d < 0.45) { const k = Math.sin((d / 0.45) * Math.PI); m.body.position.y += k * 0.1; m.body.rotation.x = -k * 0.5; }
      }
      if (r.st === 'climb') {
        const c = r.climb;
        m.body.rotation.x = -1.25 * Math.sin(Math.PI * Math.min(1, c.t));
      }
      if (r.st === 'fall') m.body.rotation.x = 0.4;
      const air = r.st === 'fly' || r.st === 'glide';
      m.wings.visible = air;
      m.shadow.visible = !air && r.st !== 'fall';
      if (air) {
        m.wings.children.forEach((w) => { w.rotation.z = w.userData.s * (0.5 + Math.sin(t * 60) * 0.5); });
        m.body.rotation.x = r.st === 'fly' && r.fly && r.fly.phase === 1 ? -1.4 : -0.3;
      }
      if (r.playDead > 0) {
        // 死んだふり：裏返って、ときどき脚がピクッ
        if (Math.sin(t * 3.1 + r.id) > 0.92) animateRoach(m, t * 40, 0.4, t + r.id, false);
        m.body.rotation.z = Math.PI;
        m.body.position.y = 0.14;
        m.body.rotation.x = 0;
      }
      if (r.playDead > 0) { /* 上で済み */ }
      else if (r.st === 'stuck') m.body.rotation.z = Math.sin(t * 25) * 0.12;
      else if (r.poison > 0) m.body.rotation.z = Math.sin(t * 9) * 0.08;
      else m.body.rotation.z = 0;
      // 段ボールの中：体は箱の下に隠れる
      m.shadow.visible = m.shadow.visible && !r.box;
    }
    if (this.player && this.marker) {
      const p = this.player;
      this.marker.visible = p.alive;
      this.marker.position.set(p.x, (p.st === 'fly' || p.st === 'glide' ? 0 : p.y) + 0.03, p.z);
      this.marker.scale.setScalar(1 + Math.sin(t * 4) * 0.06);
    }
    for (const c of this.crates) animateFlies(c.model, t + c.i);
    if (this.farmer) this.animFarmer(dt);
  }

  animFarmer(dt) {
    const f = this.farmer, m = f.model, t = this.clock;
    m.root.position.set(f.x, 0, f.z);
    m.root.rotation.y = f.h;
    f.walkPhase += f.moveSpeed * dt * 2.1;
    const sw = f.moveSpeed > 0.1 ? Math.sin(f.walkPhase) * 0.55 : 0;
    const [L, R] = m.legs;
    L.rotation.x = sw; R.rotation.x = -sw;
    const [aL, aR] = m.arms;
    aL.arm.rotation.set(-sw * 0.6, 0, -0.12);
    aR.arm.rotation.set(sw * 0.6, 0, 0.12);
    aL.fore.rotation.x = -0.25; aR.fore.rotation.x = -0.25;
    m.headG.rotation.set(0, f.lookOff, 0);
    m.root.position.y = f.moveSpeed > 0.1 ? Math.abs(Math.sin(f.walkPhase)) * 0.08 : 0;
    if (f.carry) {
      aL.arm.rotation.set(-1.25, 0, -0.25); aR.arm.rotation.set(-1.25, 0, 0.25);
      aL.fore.rotation.x = -0.35; aR.fore.rotation.x = -0.35;
    }
    if (f.state === 'WORK' && (f.phase === 'pack' || f.phase === 'placing')) {
      aL.arm.rotation.x = -0.9; aR.arm.rotation.x = -0.9;
      m.headG.rotation.x = 0.35;
    }
    if (f.state === 'WORK' && f.phase === 'tend') {
      aL.arm.rotation.x = -0.7 + Math.sin(t * 3) * 0.2;
      m.headG.rotation.x = 0.2;
    }
    const A = f.act;
    if (A) {
      const k = Math.min(1, A.t / A.wind);
      if (A.type === 'spray') {
        aR.arm.rotation.set(-1.45, 0, 0.1);
        aR.fore.rotation.x = -0.2;
        m.headG.rotation.x = 0.3;
      } else if (A.y > 1) {
        aR.arm.rotation.set(A.done ? -0.7 : lerp(-0.5, -2.8, k), 0, 0.15);
        m.headG.rotation.x = 0.35;
      } else {
        R.rotation.x = A.done ? 0 : lerp(0, -1.2, k);
        m.headG.rotation.x = 0.45;
      }
    }
    if (f.state === 'PANIC') {
      aL.arm.rotation.set(Math.sin(t * 19) * 0.8 - 1.5, 0, -1.4 - Math.sin(t * 23) * 0.6);
      aR.arm.rotation.set(Math.cos(t * 21) * 0.8 - 1.5, 0, 1.4 + Math.sin(t * 17) * 0.6);
      m.headG.rotation.y = Math.sin(t * 26) * 0.45;
      m.root.position.y = Math.abs(Math.sin(t * 12)) * 0.25;
      f.h += Math.sin(t * 3) * dt * 2;
    }
    const angry = f.state === 'CHASE' || f.anger >= 2;
    for (const e of m.eyes) {
      e.brow.rotation.z = angry ? -e.s * 0.4 : f.state === 'PANIC' ? e.s * 0.4 : 0;
      e.e.scale.y = f.state === 'PANIC' ? 0.12 : 0.08;
    }
    m.mouth.scale.set(f.state === 'PANIC' ? 0.8 : 1, f.state === 'PANIC' || f.state === 'CHASE' ? 3 : 1, 1);
    // 顔：怒るほど赤く、汗をかき、パニックでは目が回る
    if (m.skin) {
      const heat = Math.min(1, f.anger / 3 * 0.75 + (f.state === 'CHASE' ? 0.3 : 0) + (f.state === 'PANIC' ? 0.4 : 0));
      f.heat = (f.heat || 0) + (heat - (f.heat || 0)) * Math.min(1, dt * 2);
      m.skin.color.copy(m.skin0).lerp(_red, f.heat * 0.55);
      const sweating = f.anger >= 2 || f.state === 'CHASE' || f.state === 'PANIC';
      m.sweat.forEach((d, i) => {
        d.visible = sweating;
        if (sweating) { const ph = (t * 0.8 + i * 0.37) % 1; d.position.y = d.userData.y0 - ph * 0.35; d.scale.y = 0.055 * (1 - ph * 0.4); }
      });
      const dz = f.state === 'PANIC';
      for (const D of m.dizzy) { D.visible = dz; if (dz) D.rotation.z = t * 9; }
      for (const e of m.eyes) e.e.visible = !dz;
    }
    // ホイホイに長靴がくっついている：足を引っぱる
    if (f.bootStuck > 0) {
      f.bootStuck -= dt;
      m.legs[0].rotation.x = -0.25 + Math.sin(t * 13) * 0.22;
      m.root.rotation.z = Math.sin(t * 13) * 0.03;
    } else if (m.root.rotation.z) m.root.rotation.z = 0;
    // 視界の扇形
    const c = f.cone;
    c.visible = f.state !== 'PANIC' && !this.night && !f.hidden;
    c.position.set(f.x, 0.04, f.z);
    c.rotation.y = f.h + f.lookOff;
    c.scale.setScalar(f.coneRange);
    const col = f.state === 'CHASE' ? 0xff3b30 : f.state === 'INVESTIGATE' || f.susp > 35 ? 0xffc83c : 0xffffff;
    c.material.color.setHex(col);
    c.material.opacity = f.state === 'CHASE' ? 0.16 : 0.1 + f.susp / 100 * 0.08;
  }

  // ---------------- けむり玉（農場主が本気で怒ったとき1回だけ） ----------------
  startFumigation() {
    const f = this.farmer;
    this.fumigated = true;
    f.state = 'FUMIGATE';
    f.fum = { phase: 'toCenter', t: 0, x: -7, z: -2.5 };
    f.path = [];
    this.pathTo(f.fum.x, f.fum.z);
    this.dropCarry('箱を置いた');
    this.say('もう許さん！ けむり玉たいて、全部いぶし出してやる！');
    this.radio('ラジオ「けむり玉警報です。出入り口と換気口へ避難してください」', true);
    this.sfx.siren();
    this.seen('fogger');
    this.toast('けむり玉！ 緑の輪へにげろ！', 'bad');
    this.events.push('fumigate');
    for (const sp of SAFE_SPOTS) {
      const ring = makeRing(0x6dff7a, sp.r * 0.8, sp.r, 0.75);
      ring.position.set(sp.x, 0.05, sp.z);
      this.root.add(ring);
      this.safeRings.push(ring);
    }
  }

  farmerFumigate(dt) {
    const f = this.farmer, F = f.fum;
    F.t += dt;
    if (F.phase === 'toCenter') {
      if (this.walk(dt, this.farmerSpeed('chase')) || Math.hypot(F.x - f.x, F.z - f.z) < 1.2) { F.phase = 'placing'; F.t = 0; f.path = []; }
    } else if (F.phase === 'placing') {
      if (F.t > 1.4) {
        const can = makeFogger();
        can.position.set(f.x + Math.sin(f.h) * 1.2, 0, f.z + Math.cos(f.h) * 1.2);
        this.root.add(can);
        this.fog = { x: can.position.x, z: can.position.z, r: 0, t: 0, can, puffs: [], cleared: false, eggMsg: false };
        this.sfx.fogger();
        this.say('閉めきって30分だ。くたばれ、ゴキブリども');
        F.phase = 'leave';
        this.pathTo(DOOR.x, DOOR.z);
      }
    } else if (F.phase === 'leave') {
      if (this.walk(dt, this.farmerSpeed('chase'))) { F.phase = 'outside'; f.x = DOOR.x; f.z = DOOR.z; f.hidden = true; f.model.root.visible = false; }
    } else if (F.phase === 'outside') {
      f.moveSpeed = 0;
      if (this.fog && this.fog.cleared) {
        f.hidden = false;
        f.model.root.visible = true;
        f.state = 'WORK'; f.phase = 'choose'; f.anger = 2; f.susp = 0;
        const alive = this.player && this.player.alive;
        this.say(alive ? 'よし、全滅だろ…なんだと！？ まだいやがる！' : 'ふう、これで全滅だな');
        if (alive) { this.stats.smokeSurvived = 1; this.snap('smoke', 'けむり玉の煙から逃げきった！'); }
      }
    }
  }

  updateFog(dt) {
    const F = this.fog;
    if (!F || F.cleared) return;
    F.t += dt;
    // 第18回：煙は熱のいちばんの原因だったので、数を減らし（大きくして同じ広さを覆う）、早めに晴らす
    const GROW = 24, FADE = 4;
    const growing = F.t < GROW;
    F.r = Math.min(34, F.t * 1.25); // 広がる速さは前と同じ
    const cap = this.eco ? 14 : 24;
    if (growing && F.puffs.length < cap && rand() < dt * 3) {
      const m = makeCloud();
      const a = rand() * Math.PI * 2, d = rand() * F.r;
      m.group.position.set(clamp(F.x + Math.cos(a) * d, -21, 21), 0, clamp(F.z + Math.sin(a) * d, -13, 13));
      m.group.scale.setScalar(3.4 + rand() * 1.8);
      m.mat.color.setHex(0xdcdcd4);
      // かたまりの形は最初に1回だけ決める（毎回動かさない）
      for (const pf of m.puffs) { const o = pf.userData.off; pf.position.set(o.x * 1.6, o.y, o.z * 1.6); pf.scale.setScalar(pf.userData.s * 1.4); }
      this.root.add(m.group);
      F.puffs.push({ m, t: 0 });
    }
    const fade = F.t > GROW ? Math.max(0, 1 - (F.t - GROW) / FADE) : Math.min(1, F.t / 3);
    for (const p of F.puffs) {
      p.t += dt;
      p.m.mat.opacity = 0.26 * fade;
      p.m.group.position.y = Math.sin(p.t * 0.5) * 0.2;
    }
    this.fogLevel = fade;
    // 煙の中は体力が減る（逃げ場の輪の中は平気）
    if (growing) {
      for (const r of this.roaches) {
        if (!r.alive || r.st === 'fly' || r.st === 'glide') continue;
        if (Math.hypot(r.x - F.x, r.z - F.z) > F.r) continue;
        if (SAFE_SPOTS.some((sp) => Math.hypot(sp.x - r.x, sp.z - r.z) < sp.r)) continue;
        this.damage(r, 5.5 * dt * (r.nymph ? 1.3 : 1), 'smoke');
      }
      if (!F.eggMsg && this.eggs.some((e) => e.alive && Math.hypot(e.x - F.x, e.z - F.z) < F.r)) {
        F.eggMsg = true;
        this.toast('卵は無事だ', 'info');
      }
    }
    if (F.t > GROW + FADE) {
      F.cleared = true;
      this.fogLevel = 0;
      for (const p of F.puffs) { this.root.remove(p.m.group); disposeObject(p.m.group); }
      F.puffs = [];
      for (const ring of this.safeRings) { this.root.remove(ring); disposeObject(ring); }
      this.safeRings = [];
      this.toast('煙が晴れた！', 'good');
    }
  }

  // ---------------- ハウスのネコ（ステージ4以降） ----------------
  spawnCat() {
    const m = makeCat();
    this.root.add(m.root);
    this.cat = { x: -19.5, z: -12.5, h: 0, m, st: 'wander', t: 0, tx: -10, tz: -12.5, target: null, cd: 3, bellT: 0, phase: 0, speed: 0, pounce: null, marker: null, bored: 0, pesterT: 20 + rand() * 15 };
  }

  updateCat(dt) {
    const C = this.cat;
    if (!C) return;
    const f = this.farmer, m = C.m;
    m.root.visible = !this.fog || this.fog.cleared;
    if (!m.root.visible || (this.calm && !this.tour)) { m.root.position.set(C.x, 0, C.z); return; }
    C.t += dt; C.cd = Math.max(0, C.cd - dt); C.pesterT -= dt;
    let tx = C.tx, tz = C.tz, spd = 1.6;
    if (C.st === 'wander') {
      if (Math.hypot(C.tx - C.x, C.tz - C.z) < 0.6 || C.t > 9) {
        C.tx = randRange(-20, 20); C.tz = randRange(-12.5, 12.5); C.t = 0;
      }
      // 獲物（床の上のゴキブリ）をさがす
      if (C.cd <= 0 && !this.tour) {
        let best = null, bd = 5;
        for (const r of this.roaches) {
          if (!r.alive || r.y > 0.3 || r.st === 'fly' || r.st === 'glide' || r.inGlove || r.box || r.stow || r.playDead > 0 || r.st === 'drain') continue;
          const d = Math.hypot(r.x - C.x, r.z - C.z);
          const ang = Math.abs(angleDiff(C.h, Math.atan2(r.x - C.x, r.z - C.z)));
          if (d < bd && ang < 0.9 && (this.hideFactor(r) > 0.5 || r.moving) && (r.isPlayer || rand() < 0.5)) { bd = d; best = r; }
        }
        if (best) { C.st = 'stalk'; C.target = best; C.t = 0; this.sfx.meow(); if (best.isPlayer) { this.toast('ネコだ！ 高い所へ！', 'bad'); this.radio('ラジオ「ハウスのミケちゃん、狩りの時間のようです」'); } }
      }
      // ときどき農場主の足にじゃれる
      if (C.pesterT <= 0 && f.state === 'WORK' && !f.hidden) { C.st = 'pester'; C.t = 0; C.pesterT = 25 + rand() * 20; }
    } else if (C.st === 'stalk') {
      const r = C.target;
      if (!r || !r.alive || r.y > 0.3 || C.t > 6) { C.st = 'wander'; C.cd = 6; C.target = null; }
      else {
        tx = r.x; tz = r.z; spd = 2.3;
        if (Math.hypot(r.x - C.x, r.z - C.z) < 1.7) {
          C.st = 'pounce'; C.t = 0;
          C.pounce = { x: r.x, z: r.z, sx: C.x, sz: C.z };
          C.marker = makeRing(0xff3b30, 0.45, 0.6, 0.75);
          C.marker.position.set(r.x, 0.04, r.z);
          this.root.add(C.marker);
          this.sfx.hiss2();
        }
      }
    } else if (C.st === 'pounce') {
      const P = C.pounce;
      spd = 0;
      tx = null;
      C.h = dampAngle(C.h, Math.atan2(P.x - C.x, P.z - C.z), 10, dt);
      if (C.t > 0.55 && !P.done) {
        // とびかかる
        const k = Math.min(1, (C.t - 0.55) / 0.25);
        C.x = lerp(P.sx, P.x, k); C.z = lerp(P.sz, P.z, k);
        if (k >= 1) {
          P.done = true;
          for (const r of this.roaches) {
            if (!r.alive || r.y > 0.3 || r.st === 'fly' || r.st === 'glide') continue;
            if (Math.hypot(r.x - P.x, r.z - P.z) < 0.5) {
              // 自分には大けが（でも一撃ではやられない）。仲間はひとたまりもない。物音で農場主も気づく
              if (r.isPlayer) { this.damage(r, Math.min(30, Math.max(0, r.hp - 8)), 'cat'); this.noise(r, 9, 35); this.toast('ネコにはたかれた！', 'bad'); }
              else this.damage(r, 999, 'cat');
            }
          }
          this.sfx.thump();
        }
      }
      if (C.t > 1.1) {
        if (C.marker) { this.root.remove(C.marker); disposeObject(C.marker); C.marker = null; }
        C.st = 'wander'; C.cd = 10; C.target = null; C.t = 0;
      }
    } else if (C.st === 'pester') {
      tx = f.x + Math.sin(C.t * 2) * 0.9; tz = f.z + Math.cos(C.t * 2) * 0.9; spd = 2.4;
      if (Math.hypot(f.x - C.x, f.z - C.z) < 1.4 && !C.hit) {
        C.hit = true;
        f.catHold = 4;
        this.stats.catPest = (this.stats.catPest || 0) + 1;
        this.say(pick(['こら、ミケ！ 足にじゃれるな！', 'うおっ、ミケ！ 今いそがしいんだよ！']));
        this.sfx.meow();
      }
      if (C.t > 7) { C.st = 'wander'; C.hit = false; C.t = 0; }
    }
    if (tx !== null) {
      const dx = tx - C.x, dz = tz - C.z, d = Math.hypot(dx, dz);
      if (d > 0.05) {
        const st = Math.min(d, spd * dt);
        C.x = clamp(C.x + (dx / d) * st, BOUNDS.minX, BOUNDS.maxX);
        C.z = clamp(C.z + (dz / d) * st, BOUNDS.minZ, BOUNDS.maxZ);
        C.h = dampAngle(C.h, Math.atan2(dx, dz), 6, dt);
        C.speed = spd;
      } else C.speed = 0;
    } else C.speed = 0;
    // 見た目：歩き・しのび足・とびかかり・しっぽ・まばたき・耳
    C.phase += C.speed * dt * 3.2;
    m.root.position.set(C.x, 0, C.z);
    m.root.rotation.y = C.h;
    const walking = C.speed > 0.1;
    const crouch = C.st === 'stalk' ? 1 : (C.st === 'pounce' && C.t < 0.55 ? 1.4 : 0);
    C.crouch = (C.crouch || 0) + (crouch - (C.crouch || 0)) * Math.min(1, dt * 6);
    const cr = C.crouch;
    // 足の順番：左後ろ→左前→右後ろ→右前
    const offs = [0.5, 1.5, 0, 1];
    m.legs.forEach((L, i) => {
      const ph = C.phase + offs[i] * Math.PI;
      const sw = walking ? Math.sin(ph) * (0.45 - cr * 0.15) : 0;
      const lift = walking ? Math.max(0, Math.cos(ph)) : 0;
      const hind = L.userData.hind;
      const c1 = Math.min(1, cr);
      L.rotation.x = sw + (hind ? -0.25 - c1 * 0.6 : 0.1 + c1 * 0.65);
      L.userData.knee.rotation.x = hind ? 0.55 + c1 * 1.05 + lift * 0.4 : -0.15 - c1 * 1.35 - lift * 0.5;
      L.userData.paw.rotation.x = -(L.rotation.x + L.userData.knee.rotation.x);
    });
    const bob = walking ? Math.abs(Math.sin(C.phase)) * 0.015 : Math.sin(this.clock * 1.6) * 0.004;
    m.body.position.y = -Math.min(1, cr) * 0.17 + bob;
    m.body.rotation.x = C.st === 'pounce' && C.t >= 0.55 && C.t < 0.8 ? -0.25 : cr * 0.04;
    m.body.rotation.z = C.st === 'pounce' && C.t < 0.55 ? Math.sin(this.clock * 30) * 0.02 : 0; // おしりふりふり
    // 頭：獲物をじっと見る・ふだんはきょろきょろ
    let look = Math.sin(this.clock * 0.7) * 0.35;
    if (C.target && (C.st === 'stalk' || C.st === 'pounce')) look = clamp(angleDiff(C.h, Math.atan2(C.target.x - C.x, C.target.z - C.z)), -0.8, 0.8);
    m.neck.rotation.y += (look - m.neck.rotation.y) * Math.min(1, dt * 5);
    m.neck.rotation.x = cr * 0.25 + (walking ? Math.sin(C.phase * 2) * 0.03 : 0);
    // しっぽ：ふだんはゆらゆら、ねらうときは先だけピクピク
    const tw = C.st === 'stalk' ? 0.15 : 0.35;
    m.tail.rotation.x = -0.9 + cr * 0.75;
    m.tailSegs.forEach((S, k) => {
      S.rotation.z = Math.sin(this.clock * 2.2 - k * 0.55) * tw * (0.3 + k * 0.12);
      S.rotation.x = (C.st === 'stalk' ? -0.02 : 0.1) + (k > 5 && C.st === 'stalk' ? Math.sin(this.clock * 14) * 0.25 : 0);
    });
    // まばたき
    C.blinkT = (C.blinkT ?? 2) - dt;
    if (C.blinkT < 0) C.blinkT = 2 + rand() * 4;
    const closed = C.blinkT < 0.12 ? 1 : 0;
    for (const lid of m.lids) lid.rotation.x = -1.45 + closed * 1.2;
    // 耳：ときどきピクッ、ねらうときは前へ
    m.ears.forEach((E, i) => { E.rotation.x = -0.15 - cr * 0.25 + (Math.sin(this.clock * 0.9 + i * 2) > 0.97 ? 0.3 : 0); });
    // 鈴は歩くとゆれる
    m.bell.rotation.x = walking ? Math.sin(C.phase * 2) * 0.35 : 0;
    // 鈴の音（動くと鳴る）
    C.bellT -= dt;
    if (C.speed > 0.3 && C.bellT <= 0 && this.player) {
      C.bellT = 0.55;
      const dp = Math.hypot(C.x - this.player.x, C.z - this.player.z);
      this.sfx.bell(Math.max(0, 1 - dp / 16) * 0.6, this.panOf(C.x, C.z));
      if (dp < 6) this.sfx.duck(0.8); // 近くの鈴のときは、ほかの音を少し小さく
      if (dp < 16) this.soundPings.push({ x: C.x, z: C.z, v: Math.max(0.3, 1 - dp / 16), kind: 'bell' });
      this.events.push('bell');
    }
  }

  // ---------------- 仲間の数で警戒・株の見回り ----------------
  updateAlert(dt) {
    if (this.calm) return;
    const n = this.nymphs.length;
    if (n > this.stats.maxNymphs) this.stats.maxNymphs = n;
    const lv = n >= OUTBREAK_N ? 2 : n >= ALERT_N ? 1 : 0;
    if (lv > this.alertLv) {
      if (lv === 1) this.radio('ラジオ「ハウスにゴキブリ注意報。農場主さん、見回りが増えそうです」', true);
      else { this.radio('ラジオ「ゴキブリ大発生警報！ 農場主さんが本気になります」', true); this.say('なんだこの数は…！ 大発生じゃねえか！'); }
    }
    this.alertLv = lv;
    const f = this.farmer;
    // 大発生でけむり玉が早く来る
    if (lv === 2 && n >= OUTBREAK_N + 5 && !this.fumigated && f.anger >= 2 && f.state === 'WORK' && !f.carry && !this.diff.assist) this.startFumigation();
    // 株の見回り：短い間に何個も実を落とすと、農場主がさいばい槽の上を見に来る
    this.plantHits = this.plantHits.filter((h) => this.clock - h.t < 45);
    const need = this.diff.assist ? PLANT_CHECK_N_ASSIST : PLANT_CHECK_N;
    if (!f.plantCheck && this.plantHits.length >= need && (f.state === 'WORK' || f.state === 'INVESTIGATE') && !f.hidden) {
      const h = this.plantHits[this.plantHits.length - 1];
      f.plantCheck = { x: h.x, z: h.z, t: 3 };
      this.plantHits = [];
      this.say(pick(['ん？ さっきから実が落ちる音が…株がやられてんのか？', 'おい、株の実がかじられてるぞ…見回るか']));
      this.radio('ラジオ「株の実が食べられているとの情報。株の見回りにご注意」');
    }
    if (f.plantCheck) {
      const P = f.plantCheck;
      P.t -= dt;
      if (P.t <= 0 && (f.state === 'WORK' || f.state === 'INVESTIGATE') && !f.act) {
        const row = rowAt(P.x, P.z, 0.6) || ROWS.reduce((a, r) => (Math.abs(r.z - P.z) < Math.abs(a.z - P.z) ? r : a), ROWS[0]);
        const sz = row.z + (f.z < row.z ? -(row.hw + 0.45) : row.hw + 0.45);
        this.startInvestigate({ x: clamp(P.x, row.minX + 0.3, row.maxX - 0.3), y: 0, z: sz }, true);
        f.inv.plant = { x: P.x, y: TROUGH_TOP, z: row.z };
        f.susp = Math.max(f.susp, 45);
        f.plantCheck = null;
      } else if (P.t < -20) f.plantCheck = null;
    }
  }
  // ---------------- 粘着シート：さいばい槽の上で触るとくっつく ----------------
  updateSheets() {
    for (const r of this.roaches) {
      if (!r.alive || r.st !== 'move' || r.trapImmune > 0 || r.surface < TROUGH0 || r.y < 1) continue;
      for (const s of this.sheets) {
        if (Math.abs(r.x - s.x) < 0.42 && Math.abs(r.z - s.z) < 0.3) {
          r.st = 'stuck'; r.trap = s; r.struggle = 0; r.stuckT = 0; r.eatingFruit = null;
          if (r.isPlayer) {
            this.sfx.stuck();
            this.stats.stuck++;
            this.seen('sheet');
            this.toast('シートにくっついた！ 連打！', 'bad');
            this.events.push('stuck');
          }
          break;
        }
      }
    }
  }

  // ---------------- 天敵のクモ：さいばい槽の上の巣で待ちぶせ ----------------
  updateSpiders(dt) {
    for (const S of this.spiders) {
      S.cd = Math.max(0, S.cd - dt);
      const m = S.m, wy = m.webY;
      m.glow.material.opacity = 0.16 + Math.sin(this.clock * 2 + S.x) * 0.06;
      m.legs.forEach((L, i) => { L.rotation.x = Math.sin(this.clock * (S.st === 'wait' ? 1.5 : 14) + i) * (S.st === 'wait' ? 0.05 : 0.3); });
      if (S.st === 'wait') {
        // 巣のまん中で待つ
        m.body.position.set(0, wy, 0.02);
        m.body.rotation.set(-Math.PI / 2, 0, 0);
        m.thread.visible = false;
        if (S.cd > 0) continue;
        const prey = this.roaches.find((r) => r.alive && r.st === 'move' && r.surface >= TROUGH0 && !(r.playDead > 0) && Math.hypot(r.x - S.x, r.z - S.z) < 1.5);
        if (prey) {
          S.st = 'aim'; S.t = 0; S.target = prey; S.tx = prey.x; S.tz = prey.z;
          S.ring = makeRing(0xff3b30, 0.38, 0.5, 0.75);
          S.ring.position.set(prey.x, TROUGH_TOP + 0.06, prey.z);
          this.root.add(S.ring);
          if (prey.isPlayer) { this.seen('spider'); this.toast('クモだ！ にげろ！', 'bad'); }
        }
      } else if (S.st === 'aim') {
        // 糸をつたって、さいばい槽の上へおりてくる
        S.t += dt;
        const k = Math.min(1, S.t / 0.7);
        // 壁の巣から、さいばい槽のふちへよじのぼる
        const topY = TROUGH_TOP - SPIDER_BASE + 0.02;
        m.body.position.set(0, wy + (topY - wy) * k, -Math.sign(S.z - (S.target ? S.target.z : S.z)) * 0.4 * k);
        m.body.rotation.set(-Math.PI / 2 * (1 - k), Math.atan2(S.tx - S.x, S.tz - S.z), 0);
        m.thread.visible = false;
        if (S.t > 0.9) {
          // とびかかる
          const k2 = Math.min(1, (S.t - 0.9) / 0.18);
          const topY2 = TROUGH_TOP - SPIDER_BASE + 0.02;
          m.body.position.set((S.tx - S.x) * k2, topY2, (S.tz - S.z) * k2);
          if (k2 >= 1) {
            for (const r of this.roaches) {
              if (!r.alive || r.surface < TROUGH0 || r.playDead > 0) continue;
              if (Math.hypot(r.x - S.tx, r.z - S.tz) < 0.45) this.damage(r, r.isPlayer ? 35 : 999, 'spider');
            }
            this.sfx.hiss2 && this.sfx.hiss2();
            if (S.ring) { this.root.remove(S.ring); disposeObject(S.ring); S.ring = null; }
            S.st = 'back'; S.t = 0;
          }
        }
      } else if (S.st === 'back') {
        S.t += dt;
        const k = Math.min(1, S.t / 1.4);
        const topY3 = TROUGH_TOP - SPIDER_BASE + 0.02;
        m.body.position.set((S.tx - S.x) * (1 - k), topY3 + (wy - topY3) * k, 0.02 * k);
        m.body.rotation.set(-Math.PI / 2 * k, 0, 0);
        if (k >= 1) { S.st = 'wait'; S.cd = 6; }
      }
    }
  }

  // ---------------- 害虫駆除の業者（ステージ5〜、仲間が大発生すると1回来る） ----------------
  updateExterm(dt) {
    if (this.calm || this.extermDone || !this.has('exterm')) return;
    if (!this.exterm) {
      if (this.alertLv < 2) return;
      this.extermDone = false;
      // さいばい槽の上に仲間（と自分）が多い列を2つ選ぶ
      const score = ROWS.map((row) => ({ row, n: this.roaches.filter((r) => r.alive && r.surface >= TROUGH0 && Math.abs(r.z - row.z) < 1).length }));
      score.sort((a, b) => b.n - a.n);
      const rows = score.slice(0, 2).map((s) => s.row);
      this.exterm = { st: 'warn', t: 0, rows, wp: [], wi: 0, sprayT: 0, x: DOOR.x, z: DOOR.z, h: -Math.PI / 2, phase: 0 };
      this.toast('駆除業者が来る！ 台の下へ！', 'warn');
      this.radio('ラジオ「ゴキブリ大発生につき、駆除業者さんが到着しました」', true);
      this.say('もう手に負えねえ…業者さん呼んだからな！');
      this.sfx.siren();
      this.seen('exterm');
      return;
    }
    const E = this.exterm;
    E.t += dt;
    if (E.st === 'warn') {
      if (E.t < 8) return;
      E.m = makeExterminator();
      this.root.add(E.m.root);
      // 選んだ列の横を、端から端まで歩く
      for (const row of E.rows) {
        const sz = row.z + row.hw + 0.5;
        E.wp.push({ x: row.maxX - 0.5, z: sz, spray: false }, { x: row.minX + 0.5, z: sz, spray: true, row });
      }
      E.wp.push({ x: DOOR.x, z: DOOR.z, spray: false });
      E.st = 'walk'; E.path = this.grid.find(E.x, E.z, E.wp[0].x, E.wp[0].z); E.pi = 0;
      return;
    }
    if (E.st === 'walk') {
      const p = E.path[E.pi];
      const W = E.wp[E.wi];
      let moving = false;
      if (!p) {
        E.wi++;
        if (E.wi >= E.wp.length) {
          this.root.remove(E.m.root); disposeObject(E.m.root);
          this.exterm = { st: 'gone' }; this.extermDone = true;
          this.toast('駆除業者が帰っていった', 'info');
          return;
        }
        E.path = this.grid.find(E.x, E.z, E.wp[E.wi].x, E.wp[E.wi].z); E.pi = 0;
      } else {
        const dx = p.x - E.x, dz = p.z - E.z, d = Math.hypot(dx, dz);
        if (d < 0.2) E.pi++;
        else { const st = Math.min(d, (W && W.spray ? 1.7 : 2.8) * dt); E.x += (dx / d) * st; E.z += (dz / d) * st; E.h = dampAngle(E.h, Math.atan2(dx, dz), 6, dt); moving = true; }
      }
      // 列の横を歩くあいだ、さいばい槽の上に薬をまく
      if (W && W.spray && moving) {
        E.sprayT -= dt;
        if (E.sprayT <= 0) {
          E.sprayT = 1.3;
          this.spawnCloud(E.x, TROUGH_TOP, W.row.z);
          this.sprayPlants(E.x, W.row.z);
          this.sfx.hiss();
        }
      }
      E.phase += moving ? dt * 4.5 : 0;
      const sw = moving ? Math.sin(E.phase) * 0.5 : 0;
      E.m.legs[0].rotation.x = sw; E.m.legs[1].rotation.x = -sw;
      E.m.root.position.set(E.x, 0, E.z);
      E.m.root.rotation.y = E.h;
    }
  }

  // ---------------- JAから電話：農場主が立ち止まって話しこむ ----------------
  updatePhone(dt) {
    const f = this.farmer;
    if (this.calm || !f) return;
    if (f.phoneNext === undefined) f.phoneNext = randRange(50, 90);
    if (!f.phone) {
      f.phoneNext -= dt;
      if (f.phoneNext <= 0 && f.state === 'WORK' && !f.act && !f.catHold && !f.hidden) {
        f.phone = { t: 0, dur: randRange(7, 10) };
        this.stats.phones = (this.stats.phones || 0) + 1;
        f.phoneNext = randRange(70, 120);
        if (!this.phoneMesh) {
          const g = new THREE.Group();
          const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.62, 0.05), new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: 0.3, metalness: 0.4 }));
          const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.54), new THREE.MeshBasicMaterial({ color: 0x9fe0ff }));
          scr.position.z = 0.027;
          g.add(body, scr);
          this.phoneMesh = g;
        }
        this.phoneMesh.position.set(0.5, 4.55, 0.25);
        this.phoneMesh.rotation.set(0, -0.6, 0.1);
        f.model.root.add(this.phoneMesh);
        this.sfx.phone && this.sfx.phone();
        this.say(pick(['おっ、電話だ。…はい、もしもし。あ、JAさん？', 'ちょっと待て、電話だ…はいはい、JAさん、いつもどうも']));
        this.radio('ラジオ「農場主さん、ただいまJAさんと電話中のもようです」');
        this.events.push('phone');
      }
      return;
    }
    const P = f.phone;
    P.t += dt;
    if (P.t > 1.5 && P.t - dt <= 1.5) this.say(pick(['ええ、ええ…今年のパプリカは色づきがよくて…', 'はい、出荷の箱ですね…ええ、今日の分は…', 'いやあ、虫がね、ちょっと…ハハハ']));
    if (P.t >= P.dur || f.state !== 'WORK' || f.act) {
      if (this.phoneMesh) f.model.root.remove(this.phoneMesh);
      if (P.t >= P.dur) this.say('…はい、どうも。失礼しまーす。…さて、どこまでやったっけな');
      f.phone = null;
    }
  }

  // 殺虫剤をまいた株の実は、しばらく食べられない（白っぽく見える）
  sprayPlants(x, z) {
    const white = new THREE.Color(0xe8ecef);
    let n = 0;
    for (const fr of PLANT_FRUITS) {
      if (!fr.alive || Math.hypot(fr.x - x, fr.z - z) > 2.4) continue;
      fr.sprayed = this.clock + SPRAY_WAIT;
      fr.mesh.setColorAt(fr.idx, new THREE.Color(fr.hex).lerp(white, 0.55));
      fr.mesh.instanceColor.needsUpdate = true;
      n++;
    }
    return n;
  }

  // ---------------- 助っ人のカブトムシ（卵10個ごとに1回） ----------------
  updateBeetle(dt) {
    if (!this.beetle) {
      if (this.stats.eggs < this.beetleDue || this.calm) return;
      this.beetleDue += BEETLE_EVERY;
      const targets = this.crates.filter((c) => c.table >= 0 && !c.rotten && !c.shipped && !c.carried);
      if (!targets.length) return;
      const c = pick(targets);
      const m = makeBeetle();
      this.root.add(m.root);
      this.beetle = { m, c, st: 'fly', t: 0, sx: 27, sy: 4.5, sz: 3, x: 27, y: 4.5, z: 3 };
      this.stats.beetles = (this.stats.beetles || 0) + 1;
      this.toast('助っ人のカブトムシ！', 'good');
      this.radio('ラジオ「ハウスに大きなカブトムシが入ったとの情報です」', true);
      this.sfx.wind && this.sfx.wind();
      return;
    }
    const B = this.beetle, m = B.m, c = B.c;
    B.t += dt;
    const T = TABLES[c.table >= 0 ? c.table : 0];
    const side = c.z >= T.z ? 1 : -1;
    if (B.st === 'fly') {
      // 台の上のコンテナの、奥側へ着地
      const k = Math.min(1, B.t / 3);
      const tx = c.x, tz = c.z - side * 0.55, ty = TABLE_TOP + 0.02;
      B.x = lerp(B.sx, tx, smooth(k)); B.z = lerp(B.sz, tz, smooth(k));
      B.y = lerp(B.sy, ty, smooth(k)) + Math.sin(k * Math.PI) * 1.2;
      m.root.rotation.y = Math.atan2(tx - B.sx, tz - B.sz) * (1 - k) + (side > 0 ? 0 : Math.PI) * k;
      m.wings.visible = true;
      m.elytra.forEach((e, i) => { e.rotation.z = (i ? -1 : 1) * 0.6; });
      m.wings.children.forEach((w) => { w.rotation.z = w.userData.s * Math.sin(this.clock * 70) * 0.5; });
      if (c.rotten || c.shipped || c.carried || c.table < 0) { B.st = 'leave'; B.t = 0; B.sx = B.x; B.sy = B.y; B.sz = B.z; }
      else if (k >= 1) { B.st = 'push'; B.t = 0; m.wings.visible = false; m.elytra.forEach((e) => { e.rotation.z = 0; }); this.sfx.thud(); }
    } else if (B.st === 'push') {
      // 角で押して、台から突き落とす
      const k = Math.min(1, B.t / 1.4);
      m.body.rotation.x = Math.sin(this.clock * 18) * 0.08;
      m.legs.forEach((L, i) => { L.rotation.y = Math.sin(this.clock * 16 + i) * 0.35; });
      const pushZ = c.z0 === undefined ? (c.z0 = c.z) : c.z0;
      c.model.group.position.z = pushZ + side * k * 0.9;
      B.z = c.model.group.position.z - side * 0.55;
      if (k >= 1) {
        c.table = -1; c.baseY = 0;
        c.z = T.z + side * (T.d / 2 + 0.75);
        c.fall = { t: 0, y0: TABLE_TOP };
        delete c.z0;
        B.st = 'leave'; B.t = 0; B.sx = B.x; B.sy = B.y; B.sz = B.z;
      }
    } else if (B.st === 'leave') {
      const k = Math.min(1, B.t / 2.5);
      m.wings.visible = true;
      m.elytra.forEach((e, i) => { e.rotation.z = (i ? -1 : 1) * 0.6; });
      m.wings.children.forEach((w) => { w.rotation.z = w.userData.s * Math.sin(this.clock * 70) * 0.5; });
      B.x = lerp(B.sx, 27, k); B.y = B.sy + k * 4; B.z = lerp(B.sz, 3, k);
      if (k >= 1) { this.root.remove(m.root); disposeObject(m.root); this.beetle = null; }
    }
    m.root.position.set(B.x, B.y, B.z);
    // 落ちていくコンテナ
    if (c.fall) {
      c.fall.t += dt;
      const k = Math.min(1, c.fall.t / 0.45);
      c.model.group.position.set(c.x, lerp(c.fall.y0, 0, k * k), c.z);
      c.model.group.rotation.x = side * k * 0.6;
      if (k >= 1) {
        c.fall = null;
        this.placeCrate(c);
        this.sfx.thud();
        this.shake = Math.max(this.shake, 0.3);
        this.noise(c, 9, 25);
        c.hp -= 45;
        if (c.hp <= 0) this.ruinCrate(c);
        this.toast('カブトムシが箱を落とした！', 'good');
        this.snap('beetle', '助っ人のカブトムシがコンテナを突き落とした！');
      }
    }
  }

  // ---------------- JAの検品（ステージ3〜5で1回） ----------------
  updateInspector(dt) {
    if (!this.has('inspect') || this.inspectDone || this.calm) return;
    const I = this.inspector;
    if (!I) {
      if ((this.shipped >= 3 || this.elapsed > 160) && (!this.fog || this.fog.cleared) && this.farmer.state !== 'FUMIGATE') {
        this.inspector = { st: 'coming', t: 0 };
        this.toast('JAの検品員が来る！', 'warn');
        this.sfx.chime();
        this.say('おっ、JAさんが来るな。ちゃんとしとかねえと');
        this.events.push('inspect');
      }
      return;
    }
    I.t += dt;
    if (I.st === 'coming') {
      if (I.t < 10) return;
      const m = makeInspector();
      this.root.add(m.root);
      Object.assign(I, { st: 'walk', m, x: DOOR.x, z: DOOR.z, h: -Math.PI / 2, stops: [[13, 8.7], [13, 3.4], [13, -4.4], [13, -10.6], [DOOR.x, DOOR.z]], si: 0, path: [], pi: 0, wait: 0, phase: 0, spotted: false, speech: 'JAです、検品にまいりました', speechT: 3 });
      I.path = this.grid.find(I.x, I.z, I.stops[0][0], I.stops[0][1]);
      return;
    }
    I.speechT -= dt;
    let moving = false;
    if (I.st === 'walk') {
      const p = I.path[I.pi];
      if (!p) {
        I.st = 'look'; I.wait = 4.5; I.baseH = I.h;
      } else {
        const dx = p.x - I.x, dz = p.z - I.z, d = Math.hypot(dx, dz);
        if (d < 0.2) I.pi++;
        else { const st = Math.min(d, 2.2 * dt); I.x += dx / d * st; I.z += dz / d * st; I.h = dampAngle(I.h, Math.atan2(dx, dz), 6, dt); moving = true; }
      }
    } else if (I.st === 'look') {
      I.wait -= dt;
      I.h = I.baseH + Math.sin(I.t * 1.4) * 1.3;
      if (I.wait <= 0) {
        I.si++;
        if (I.si >= I.stops.length) {
          this.root.remove(I.m.root); disposeObject(I.m.root);
          this.inspector = null; this.inspectDone = true;
          this.toast('JAの検品が終わった', 'info');
          return;
        }
        if (I.si === I.stops.length - 1) { I.speech = 'はい、問題…なさそうですね'; I.speechT = 2.5; }
        I.st = 'walk'; I.pi = 0;
        I.path = this.grid.find(I.x, I.z, I.stops[I.si][0], I.stops[I.si][1]);
      }
    }
    // 見る：見つかると農場主を呼ぶ
    if (!I.spotted) {
      for (const r of this.roaches) {
        if (!r.alive || r.st === 'fly' || r.st === 'glide') continue;
        const dx = r.x - I.x, dz = r.z - I.z, d = Math.hypot(dx, dz);
        if (d > 6) continue;
        const dot = (dx * Math.sin(I.h) + dz * Math.cos(I.h)) / (d || 1);
        if (dot < 0.6) continue;
        if (this.visibility(r) * (1 - d / 9) > 0.25) {
          I.spotted = true;
          this.stats.inspectSpotted = 1;
          I.speech = 'ちょっと！ ゴキブリいますよ！'; I.speechT = 3;
          this.farmer.anger = Math.min(3, this.farmer.anger + 1);
          if (this.farmer.state !== 'FUMIGATE' && this.farmer.state !== 'PANIC') this.startChase(r);
          this.say('なにっ！？ JAさんの前でかよ！');
          this.toast('検品員に見つかった！', 'bad');
          break;
        }
      }
    }
    I.phase += moving ? dt * 4.5 : 0;
    const sw = moving ? Math.sin(I.phase) * 0.5 : 0;
    I.m.legs[0].rotation.x = sw; I.m.legs[1].rotation.x = -sw;
    I.m.root.position.set(I.x, 0, I.z);
    I.m.root.rotation.y = I.h;
  }

  // ---------------- けむり玉のとき、いちばん近い逃げ場への緑の線 ----------------
  updateSafeLine() {
    const on = this.safeRings.length > 0 && this.player && this.player.alive;
    if (!on) {
      if (this.safeLine) { this.root.remove(this.safeLine); disposeObject(this.safeLine); this.safeLine = null; }
      return;
    }
    const p = this.player, sp = this.nearestSafe(p);
    if (!this.safeLine) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const mat = new THREE.LineDashedMaterial({ color: 0x6dff7a, dashSize: 0.5, gapSize: 0.3, depthTest: false, transparent: true, toneMapped: false });
      this.safeLine = new THREE.Line(geo, mat);
      this.safeLine.renderOrder = 20;
      this.safeLine.frustumCulled = false;
      this.safeLine.userData.ownMaterial = true;
      this.safeLine.userData.ownGeometry = true;
      this.root.add(this.safeLine);
    }
    const pos = this.safeLine.geometry.attributes.position;
    pos.setXYZ(0, p.x, p.y + 0.3, p.z);
    pos.setXYZ(1, sp.x, 0.3, sp.z);
    pos.needsUpdate = true;
    this.safeLine.computeLineDistances();
    this.safeLine.material.opacity = 0.6 + 0.4 * Math.sin(this.clock * 6);
  }

  // ---------------- 練習（はじめての人だけ） ----------------
  updateTutorial(dt) {
    const T = this.tutorial, p = this.player;
    if (!T || !p) return;
    T.t += dt;
    const next = () => { T.step++; T.t = 0; this.sfx.nice(); };
    switch (T.step) {
      case 0: if (Math.hypot(p.x - T.sx, p.z - T.sz) > 2.5) next(); break;
      case 1: if (Math.abs(angleDiff(this.camYaw, T.yaw)) > 0.7 || T.t > 6) next(); break; // カメラは歩くとついてくるので、6秒たてば次へ
      case 2: if (this.stats.ate >= 12) next(); break;
      case 3: if (this.stats.nice >= 1 || T.t > 25) next(); break;
      case 4:
        if (p.y < 0.4 && rowAt(p.x, p.z, 0)) T.hideT += dt; else T.hideT = 0;
        if (T.hideT > 1.2) next();
        break;
      default: this.endTutorial(true);
    }
  }

  endTutorial(done) {
    if (!this.tutorial) return;
    this.tutorial = null;
    this.calm = false;
    this.farmer.timer = 3;
    this.farmer.phase = 'idle';
    this.say('さて、出荷するか。……ん？ なんか気配がするな');
    this.toast(done ? '練習おわり！ 本番だ' : '本番だ', 'good');
    this.events.push('tutorialDone');
  }

  tutorialText(touch) {
    const T = this.tutorial;
    if (!T) return null;
    const L = [
      touch ? '1/5　左下で歩く' : '1/5　矢印キーで歩く',
      touch ? '2/5　右側をなぞって見回す' : '2/5　歩くとカメラがついてくる',
      touch ? '3/5　矢印の箱で「食べる」長押し' : '3/5　矢印の箱でSpace長押し',
      '4/5　緑の帯で離すと「ナイス！」',
      '5/5　白いさいばい槽の下にかくれる',
    ];
    return L[Math.min(T.step, L.length - 1)];
  }

  // 画面に出す案内の矢印の行き先
  guideTarget() {
    const T = this.tutorial, p = this.player;
    if (!T || !p) return null;
    if (T.step === 2 || T.step === 3) {
      let best = null, bd = Infinity;
      for (const c of this.crates) {
        if (c.rotten || c.shipped || c.carried || c.table >= 0) continue;
        const d = Math.hypot(c.x - p.x, c.z - p.z);
        if (d < bd) { bd = d; best = c; }
      }
      return best ? { x: best.x, y: 1.2, z: best.z } : null;
    }
    if (T.step === 4) {
      const r = ROWS.reduce((a, b) => (Math.abs(b.z - p.z) < Math.abs(a.z - p.z) ? b : a));
      return { x: clamp(p.x, r.minX + 1, r.maxX - 1), y: 1.0, z: r.z };
    }
    return null;
  }

  // ---------------- 勝ち負け ----------------
  // 時間制限はなし。目標の箱数をダメにしたら勝ち、出荷されすぎたら負け
  checkEnd() {
    if (this.state !== 'play' || this.tutorial || this.tour) return;
    if (this.ruined >= this.diff.target) { this.endGame(true, 'ruined'); return; }
    const avail = this.crates.filter((c) => !c.rotten && !c.shipped).length;
    if (this.ruined + avail < this.diff.target) this.endGame(false, 'shipped');
  }

  shipLeft() { return Math.max(0, this.shipLimit - this.shipped); }

  endGame(win, reason) {
    if (this.state !== 'play') return;
    this.state = 'over';
    const alive = this.nymphs.length;
    const fast = Math.max(0, 420 - this.elapsed) * 3;
    const score = Math.round(this.ruined * 1000 + this.shipLeft() * 200 + alive * 150 - this.stats.deaths * 200 + (win ? fast : 0));
    let rank = 'D';
    if (win) rank = this.stats.shipped <= 2 ? 'S' : this.stats.shipped <= 4 ? 'A' : 'B';
    else if (this.ruined >= Math.ceil(this.diff.target / 2)) rank = 'C';
    this.result = {
      win, reason, score: Math.max(0, score), rank, alive, elapsed: this.elapsed, diff: this.diff.key, easy: this.easyMode,
      stats: { ...this.stats, ruinedColor: [...this.stats.ruinedColor], seen: [...this.stats.seen] },
      bestMate: (() => { const b = this.roaches.filter((r) => !r.isPlayer && r.name && (r.bitten || 0) > 2).sort((a, c) => c.bitten - a.bitten)[0]; return b ? b.name : null; })(),
      bestMateBit: (() => { const b = this.roaches.filter((r) => !r.isPlayer && r.name && (r.bitten || 0) > 2).sort((a, c) => c.bitten - a.bitten)[0]; return b ? Math.round(b.bitten) : 0; })(),
      grumble: this.grumble(win, reason),
      diary: this.diary(win, reason),
      advice: this.advice(win, reason),
      highlights: this.highlights,
      pranks: PRANKS.filter((x) => this.pranks[x.id]).map((x) => x.id),
      assist: !!this.diff.assist,
      season: this.season,
    };
    if (win) { this.sfx.win(); this.say('もう限界だ…', true); }
    else { this.sfx.lose(); this.say('今日もおれの勝ちだな', true); } // 負けたときの口癖（やさしい言い方で）
    this.ui.gameOver(this.result);
  }

  // 負けたときの「次はこうしてみよう」（記録された理由だけを使う）
  advice(win, reason) {
    const s = this.stats;
    if (win) {
      if (s.shipped > 3) return '星をねらうなら：運んでいる農場主に突撃';
      if (s.chased > 2) return '星をねらうなら：さいばい槽の下を通ろう';
      return '';
    }
    if (reason === 'dead') {
      return {
        spray: '黄色い輪が出たら横へにげる',
        whack: '赤い輪の外へ。台の下なら安全',
        trap: 'ホイホイは連打で脱出',
        poison: '毒エサは体力が多いときだけ',
        smoke: 'けむりは緑の輪へ',
        cat: 'ネコは高い所に来ない',
        spider: '光る巣に近づかない',
      }[this.lastDeathCause] || '見つかったら台の下でじっと';
    }
    if (s.attacks === 0) return '運んでいる農場主に「突撃」';
    if (s.born < 3) return '産卵して仲間をふやそう';
    return '「まかせた」で何箱も同時にかじろう';
  }

  // 農場主の日記：今日の出来事を3行（記録された出来事だけを使う）
  diary(win, reason) {
    const s = this.stats, L = [];
    const add = (cond, text) => { if (cond && L.length < 3) L.push(text); };
    add(s.stowaway > 0, `出荷した箱からゴキブリが出てきた。${s.stowaway > 1 ? `しかも${s.stowaway}回も。` : ''}JAさんに平謝りだ。`);
    add(s.bootScares > 0, '替えの長靴をはこうとしたら、中からゴキブリが。腰がぬけた。');
    add(this.pranks && this.pranks.bento, '昼に食べようと思ってた弁当を、ゴキブリにかじられた。卵焼きが…。');
    add(s.radioBites > 0, `ラジオが${s.radioBites > 1 ? `${s.radioBites}回も` : ''}止まった。直したら番組が変わってた。`);
    add(s.revenge > 0, '自分で置いたホイホイに長靴がくっついた。誰が動かしたんだ。');
    add(s.inspectSpotted, 'JAの検品の人の前でゴキブリが出た。恥ずかしくて顔から火が出た。');
    add(this.pranks && this.pranks.playdead, '死んでると思ったゴキブリが、あとで歩いてた。だまされた。');
    add(s.beetles > 0, 'でかいカブトムシが箱を台から落としていった。なんでだ。');
    add(s.smokeSurvived, 'けむり玉をたいたのに、まだ生きてるやつがいた。しぶとい。');
    add(s.phones > 0, `JAさんから電話。${s.phones > 1 ? `${s.phones}回も。` : ''}長話してる間に、なんか増えてた気がする。`);
    add(s.catPest > 0, 'ミケが足にじゃれてきて仕事にならん。かわいいけど。');
    add(s.attacks >= 2, `ゴキブリに顔に${s.attacks}回も飛びつかれた。夢に出そうだ。`);
    add(s.fruits >= 5, `株になってる実を${s.fruits}個も落とされた。まだ育ててたのに。`);
    add(s.chased >= 8, `今日は${s.chased}回もゴキブリを追いかけた。足がパンパンだ。`);
    add(s.maxNymphs >= 15, `ゴキブリが${s.maxNymphs}匹くらいいた。もう大発生だ。`);
    add(true, win ? `ダメにされた箱は${s.ruined}箱。出荷は${s.shipped}箱しかできなかった。` : `出荷は${s.shipped}箱。ゴキブリには${s.ruined}箱やられた。`);
    const last = win ? 'もう限界だ…。' : '今日もおれの勝ちだな。';
    add(true, last);
    // 日記のしめくくりは、勝ち負けどちらも口癖で
    if (L[L.length - 1] !== last) { L.length = Math.min(L.length, 2); L.push(last); }
    return L;
  }

  // 結果画面の農場主のぼやき（強めの口調）
  grumble(win, reason) {
    const s = this.stats, L = [];
    if (win) {
      // ゴキブリが勝ったときの口癖は「もう限界だ…」
      L.push(pick([
        'もう限界だ…。今日の出荷どうしてくれんだ…',
        'もう限界だ…。一年かけて育てたパプリカだぞ…',
        'もう限界だ…。また単価下がったってのに、この上ゴキブリかよ…',
      ]));
    } else if (reason === 'dead') {
      // 負けたときの口癖は「今日もおれの勝ちだな」
      L.push(pick(['今日もおれの勝ちだな。またおいで、とは言わんぞ', '今日もおれの勝ちだな。ハウスはおれが守る']));
    } else {
      L.push(pick(['今日もおれの勝ちだな。全部出荷できたぞ', '今日もおれの勝ちだな。よし、出荷完了だ']));
    }
    if (s.attacks >= 1) L.push('顔に飛んでくるとか反則だろうが！ 心臓止まるかと思ったぞ！');
    if (s.fruits >= 1) L.push('株になってるやつまで落としやがって…あれはまだ育ててたんだぞ！');
    if (this.traps.length >= 6) L.push('ホイホイ代だってタダじゃねえんだぞ、ちくしょう！');
    if (s.baits >= 1) L.push('毒エサ食っといてまだ動いてんのか…しぶとすぎんだろ！');
    if (s.smokeSurvived) L.push('けむり玉までたいたのに生き残りやがった…どうなってんだ！');
    return L.slice(0, 3);
  }

  // カメラ用の情報
  camInfo() {
    const p = this.player;
    if (!p) return null;
    const under = p.y < 0.4 && p.st !== 'fly' && p.st !== 'glide';
    return {
      x: p.x, y: p.y, z: p.z,
      underTable: under && tableAt(p.x, p.z, 0.6) >= 0,
      underRow: under && !!rowAt(p.x, p.z, 0.5),
      onTrough: this.onTrough(p) && p.st === 'move',
      flying: p.st === 'fly' || p.st === 'glide',
    };
  }

  // 画面の文字表示用
  context() {
    const p = this.player;
    if (!p || !p.alive || this.state !== 'play') return null;
    if (p.st === 'stuck') return { key: 'action', text: '連打で脱出！', urgent: true, struggle: p.struggle };
    if (p.st !== 'move') return null;
    if (p.playDead > 0) return { key: 'action', text: '起きる' };
    if (p.stow) return { key: 'action', text: p.stow.carried ? 'じっと！' : 'かごから出る', first: 'stowIn' };
    if (p.inGlove) return { key: 'action', text: p.inBoot ? '長靴から出る' : '軍手から出る' };
    if (p.box) return { key: 'action', text: '段ボールから出る' };
    const stuckMate = this.roaches.find((r) => r.alive && r !== p && r.st === 'stuck' && Math.hypot(r.x - p.x, r.z - p.z) < 1.3);
    if (stuckMate) return { key: 'action', text: '仲間を助ける' };
    // PCをシンプルに：農場主の足もとならスペースで「突撃」
    if (this.canAttackNow()) return { key: 'action', text: '突撃', attack: true };
    const c = this.crateInReach(p);
    if (c) return this.stowTarget(p) ? { key: 'action', text: 'もぐる', crate: c, stow: true, first: 'stow' } : { key: 'action', text: '長押しで食べる', hold: true, crate: c };
    const f = this.fruitInReach(p);
    if (f) return { key: 'action', text: '長押しで実を食べる', hold: true, fruit: f };
    const b = this.baitInReach(p);
    if (b) return { key: 'action', text: '長押しで毒エサ', hold: true, bait: b, warn: true };
    if (this.nearBento(p)) return { key: 'action', text: '長押しでお弁当をかじる', hold: true, first: 'bento' };
    const pr = this.propAt(p);
    if (pr && pr.kind === 'glove') return { key: 'action', text: '軍手にもぐる', first: 'glove' };
    if (pr && pr.kind === 'boots') return { key: 'action', text: '長靴に入る', first: 'boots' };
    if (this.nearRadio(p)) return { key: 'action', text: '長押しでラジオをかじる', hold: true, first: 'radio' };
    if (pr && pr.kind === 'box') return { key: 'action', text: '段ボールにもぐる', first: 'box' };
    if (pr && pr.kind === 'drain') return { key: 'action', text: '排水溝に入る', first: 'drain' };
    if (pr && pr.kind === 'trap') return this.helpersFor(p).length >= 2 ? { key: 'action', text: 'ホイホイを運ぶ', first: 'trap' } : { key: 'action', text: 'ホイホイ（仲間2匹で運ぶ）', warn: true, first: 'trap' };
    if (this.onTrough(p)) {
      if ((this.sheets || []).some((s) => Math.abs(s.x - p.x) < 1.7 && Math.abs(s.z - p.z) < 0.6)) return { key: 'action', text: 'シート注意！', warn: true, first: 'sheet' };
      if ((this.spiders || []).some((s) => Math.hypot(s.x - p.x, s.z - p.z) < 2.4)) return { key: 'action', text: 'クモ注意！', warn: true, first: 'spider' };
    }
    if (this.windLaneAt(p)) return { key: 'action', text: '風に乗る' };
    if (this.canClimb(p)) return { key: 'action', text: '登る' };
    // PCをシンプルに：栄養が満タンで、まわりに何もなければスペースで「産卵」
    if (this.nutrition >= 100) return { key: 'action', text: '産卵', egg: true };
    return null;
  }

  canAttackNow() {
    const p = this.player, f = this.farmer;
    if (!p || p.st !== 'move' || this.attackCD > 0 || f.state === 'PANIC') return false;
    return Math.hypot(f.x - p.x, f.z - p.z) <= ATTACK_RANGE;
  }

  modeLabel() { return MODES[this.mode]; }

  // テスト・確認用（NaN などの異常を見つける）
  sanity() {
    const bad = [];
    const num = (v, n) => { if (!Number.isFinite(v)) bad.push(n); };
    for (const r of this.roaches) { num(r.x, 'r.x'); num(r.y, 'r.y'); num(r.z, 'r.z'); num(r.h, 'r.h'); num(r.hp, 'r.hp'); }
    const f = this.farmer;
    if (f) { num(f.x, 'f.x'); num(f.z, 'f.z'); num(f.h, 'f.h'); num(f.susp, 'f.susp'); }
    for (const c of this.crates) num(c.hp, 'c.hp');
    if (f && !f.hidden && (f.x < -22 || f.x > 22 || f.z < -14 || f.z > 14)) bad.push('farmer out of house');
    for (const r of this.roaches) if (r.alive && (r.x < -22 || r.x > 22 || r.z < -14 || r.z > 14)) bad.push('roach out');
    return bad;
  }
}

export { angleDiff };
