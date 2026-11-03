// 今日の注文・図鑑・称号・着せかえ（記録はその人のブラウザの中だけに保存）

// 日付（その端末の時刻）
export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function todayLabel(d = new Date()) {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
// 日付から決まる数（同じ日は同じ注文・同じ配置になる）
export function dailySeed(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function seededRand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 今日の注文（出荷の決まりごとにちなんだお題）
// check(s, res)：s はゲーム中の記録、res は結果（勝ち負け）
export const ORDERS = [
  { id: 'red3', text: '赤のコンテナを3箱ダメにしろ（赤の値が上がる日）', check: (s) => s.ruinedColor[0] >= 3 },
  { id: 'yellow3', text: '黄色のコンテナを3箱ダメにしろ', check: (s) => s.ruinedColor[1] >= 3 },
  { id: 'orange2', text: '橙のコンテナを2箱ダメにしろ', check: (s) => s.ruinedColor[2] >= 2 },
  { id: 'ship3', text: '出荷を3箱以内におさえて勝て', check: (s, r) => r.win && s.shipped <= 3 },
  { id: 'noTrap', text: 'ホイホイに一度もかからずに勝て', check: (s, r) => r.win && s.stuck === 0 },
  { id: 'eggs3', text: '卵を3個産め', check: (s) => s.eggs >= 3 },
  { id: 'panic2', text: '農場主を2回パニックにしろ', check: (s) => s.attacks >= 2 },
  { id: 'fruit3', text: '株になっている実を3個落とせ', check: (s) => s.fruits >= 3 },
  { id: 'wind2', text: '風に乗って2回飛べ', check: (s) => s.winds >= 2 },
  { id: 'nice8', text: '「ナイス！」を8回出せ', check: (s) => s.nice >= 8 },
  { id: 'unseen', text: '一度も追いかけられずに勝て', check: (s, r) => r.win && s.chased === 0 },
  { id: 'family', text: '仲間を6匹以上生き残らせて勝て', check: (s, r) => r.win && r.alive >= 6 },
];
export function todaysOrders(key) {
  const r = seededRand(dailySeed(key) ^ 0x5a17);
  const list = [...ORDERS];
  const out = [];
  while (out.length < 2) out.push(list.splice(Math.floor(r() * list.length), 1)[0]);
  return out;
}

// 図鑑（出会ったもの）
export const ENCYCLOPEDIA = [
  { id: 'farmer', name: '農場主', text: 'パーマ頭に軍手、腰にラジオ。ラジオの音と長靴の足音で、どこにいるか分かる。怒ると本気になる。' },
  { id: 'trap', name: 'ホイホイ', text: '粘着わな。くっついたら食べるボタンを連打。捕まった仲間は近くで押すと助けられる。' },
  { id: 'spray', name: '殺虫スプレー', text: '黄色い輪が予告。霧はしばらく残る。' },
  { id: 'bait', name: '毒エサ', text: '黒い丸い容器。食べると栄養が満タンになるが、毒が回って体力が減り続ける。仲間は近づかない。' },
  { id: 'fogger', name: '燻煙剤', text: '農場主が本気で怒ると、ハウスを煙でいっぱいにする。出入り口か換気口へ逃げろ。卵だけは煙に強い。' },
  { id: 'wind', name: '循環扇の風', text: '入口の渦で「風に乗る」と、通路の先まで一気に飛べる。' },
  { id: 'fruit', name: '株の実', text: '栽培槽に登るとかじれる。落ちるとドスンと音がする。栄養はたっぷり。' },
  { id: 'egg', name: '卵（卵しょう）', text: '中に仲間が入っている。隠れた場所に産めば見つかりにくい。' },
];

// 称号
export const TITLES = [
  { id: 'first', name: 'はじめてのかじり', desc: 'コンテナを1箱ダメにする', check: (r) => r.ruined >= 1 },
  { id: 'win1', name: '出荷妨害の初仕事', desc: '1回勝つ', check: (r) => r.wins >= 1 },
  { id: 'ruin30', name: 'コンテナ荒らし', desc: '合計30箱ダメにする', check: (r) => r.ruined >= 30 },
  { id: 'eggs20', name: '大家族', desc: '合計20個の卵を産む', check: (r) => r.eggs >= 20 },
  { id: 'panic10', name: '顔面ダイバー', desc: '農場主を合計10回パニックにする', check: (r) => r.attacks >= 10 },
  { id: 'escape5', name: '脱出名人', desc: 'ホイホイから合計5回ぬけ出す', check: (r) => r.escapes >= 5 },
  { id: 'nice50', name: 'ナイス職人', desc: '「ナイス！」を合計50回', check: (r) => r.nice >= 50 },
  { id: 'wind10', name: '風使い', desc: '風に乗って合計10回飛ぶ', check: (r) => r.winds >= 10 },
  { id: 'fruit10', name: '実落とし', desc: '株の実を合計10個落とす', check: (r) => r.fruits >= 10 },
  { id: 'bait3', name: '毒にも負けない', desc: '毒エサを合計3回食べる', check: (r) => r.baits >= 3 },
  { id: 'smoke', name: '煙をくぐりぬけた者', desc: '燻煙剤から生きのびる', check: (r) => r.smoke >= 1 },
  { id: 'order10', name: '注文の達人', desc: '今日の注文を合計10個こなす', check: (r) => r.orders >= 10 },
  { id: 'allwin', name: '全ステージ制覇', desc: '6つのステージをすべてクリアする', check: (r) => r.cleared >= 6 },
  { id: 'stars', name: '星あつめ名人', desc: '星を合計12個あつめる', check: (r) => Object.values(r.stars || {}).reduce((a, b) => a + b, 0) >= 12 },
  { id: 'stage3', name: '一人前のゴキブリ', desc: 'ステージ3をクリアする', check: (r) => r.cleared >= 3 },
];

// 羽の色の解放条件
export const WING_UNLOCK = {
  normal: { desc: '最初から', check: () => true },
  black: { desc: '合計10箱ダメにする', check: (r) => r.ruined >= 10 },
  gold: { desc: '3回勝つ', check: (r) => r.wins >= 3 },
  paprika: { desc: '株の実を合計5個落とす', check: (r) => r.fruits >= 5 },
  leaf: { desc: '今日の注文を合計3個こなす', check: (r) => r.orders >= 3 },
};

export function emptyRecords() {
  return {
    games: 0, wins: 0, ruined: 0, eggs: 0, attacks: 0, escapes: 0, nice: 0, winds: 0, fruits: 0, baits: 0, smoke: 0,
    orders: 0, cleared: 0, stars: {}, bests: {}, titles: [], seen: [], ordersDone: {}, wing: 'normal',
  };
}
export function normalizeRecords(r) {
  const base = emptyRecords();
  if (!r || typeof r !== 'object') return base;
  const out = { ...base, ...r };
  // 以前の「やさしい・ふつう・むずかしい」の記録を、クリアしたステージに読みかえる
  if (!r.cleared && (r.winEasy || r.winNormal || r.winHard)) out.cleared = r.winHard ? 5 : r.winNormal ? 3 : 1;
  delete out.winEasy; delete out.winNormal; delete out.winHard;
  for (const k of ['titles', 'seen']) if (!Array.isArray(out[k])) out[k] = [];
  if (!out.ordersDone || typeof out.ordersDone !== 'object') out.ordersDone = {};
  if (!out.stars || typeof out.stars !== 'object') out.stars = {};
  if (!out.bests || typeof out.bests !== 'object') out.bests = {};
  return out;
}

// 1ゲームの結果を記録に足す。新しく取った称号・羽の色を返す
export function applyResult(rec, res, stats, orders, dayKey) {
  const r = normalizeRecords(rec);
  const before = { titles: new Set(r.titles), wings: unlockedWings(r) };
  r.games++;
  if (res.win) {
    r.wins++;
    const no = parseInt(String(res.diff).replace('s', ''), 10);
    if (no > (r.cleared || 0)) { r.cleared = no; r.newStage = no + 1; }
  }
  r.ruined += stats.ruined; r.eggs += stats.eggs; r.attacks += stats.attacks; r.escapes += stats.escapes;
  r.nice += stats.nice; r.winds += stats.winds; r.fruits += stats.fruits; r.baits += stats.baits; r.smoke += stats.smokeSurvived;
  for (const id of stats.seen || []) if (!r.seen.includes(id)) r.seen.push(id);
  // 今日の注文（同じ日の同じ注文は1回だけ数える）
  const done = r.ordersDone[dayKey] || [];
  const cleared = [];
  for (const o of orders) {
    if (o.check(stats, res)) {
      cleared.push(o.id);
      if (!done.includes(o.id)) { done.push(o.id); r.orders++; }
    }
  }
  r.ordersDone[dayKey] = done;
  // 古い日付の記録は30日分だけ残す
  const keys = Object.keys(r.ordersDone).sort();
  while (keys.length > 30) delete r.ordersDone[keys.shift()];
  for (const t of TITLES) if (!r.titles.includes(t.id) && t.check(r)) r.titles.push(t.id);
  const newTitles = TITLES.filter((t) => r.titles.includes(t.id) && !before.titles.has(t.id));
  const newWings = unlockedWings(r).filter((k) => !before.wings.includes(k));
  // 星と自己ベスト
  const got = starsOf(res, stats);
  const key = String(res.diff);
  const prevStars = r.stars[key] || 0;
  if (got.count > prevStars) r.stars[key] = got.count;
  const pb = r.bests[key] || {};
  const newBest = {};
  if (res.win) {
    if (!pb.time || res.elapsed < pb.time) { pb.time = Math.round(res.elapsed); newBest.time = true; }
    if (pb.shipped === undefined || stats.shipped < pb.shipped) { pb.shipped = stats.shipped; newBest.shipped = true; }
    r.bests[key] = pb;
  }
  const unlockedStage = r.newStage && r.newStage <= 6 ? r.newStage : 0;
  delete r.newStage;
  return { rec: r, newTitles, newWings, cleared, unlockedStage, stars: got, newBest };
}
export function unlockedWings(r) {
  return Object.keys(WING_UNLOCK).filter((k) => WING_UNLOCK[k].check(r));
}

// ステージの星3つ：★1 クリア／★2 出荷を3箱以内で勝つ／★3 見つかったのが2回以内で、やられずに勝つ
export const STAR_RULES = [
  { text: 'クリアする', check: (res) => res.win },
  { text: '出荷を3箱以内におさえて勝つ', check: (res, s) => res.win && s.shipped <= 3 },
  { text: '見つかったのが2回以内で、一度もやられずに勝つ', check: (res, s) => res.win && s.chased <= 2 && s.deaths === 0 },
];
export function starsOf(res, stats) {
  const each = STAR_RULES.map((r) => !!r.check(res, stats));
  return { each, count: each.filter(Boolean).length };
}
