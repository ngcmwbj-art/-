// ロジックのテスト（画面なし）：node tests/sim.js
// - すべてのカードを、使える状況で実際に1回以上使う
// - 3タイプそれぞれ、ランダムに遊ぶボットで何十回も挑戦して、例外や無限ループがないか調べる
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');
global.window = global;
const root = path.join(__dirname, '..');
['data/config.js', 'data/crops.js', 'data/animals.js', 'data/cards.js', 'data/statuses.js', 'data/enemies.js', 'data/encounters.js', 'data/seasons.js', 'data/glossary.js', 'data/relics.js', 'data/farmers.js',
 'js/core/util.js', 'js/core/state.js', 'js/core/effects.js', 'js/battle.js', 'js/reward.js', 'js/market.js', 'js/map.js', 'js/score.js']
  .forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f }));

let failures = 0;
const noPhoto = [];
const fail = msg => { failures++; console.log('NG:', msg); };

// データの整合性：art・crop・animal・status の参照先があるか
const artNames = new Set(fs.readdirSync(path.join(root, 'assets/img/art')).map(f => f.replace('.svg', '')));
for (const [id, c] of Object.entries(FR.Cards)) {
  if (c.unplayable) continue;
  if (!artNames.has(c.art)) fail(`カード ${id} の絵 ${c.art} がない`);
  if (!fs.existsSync(path.join(root, 'assets/img/cards', id + '.jpg'))) noPhoto.push(c.name);
  if (!FR.CardTypes[c.type]) fail(`カード ${id} の種類 ${c.type} が不明`);
  if (c.needs && !FR.Battle.NEEDS[c.needs]) fail(`カード ${id} の条件 ${c.needs} が不明`);
  for (const e of [...c.effects, ...((c.upgrade && c.upgrade.effects) || [])]) {
    if (!FR.Effects.OPS[e.op]) fail(`カード ${id} の効果 ${e.op} が不明`);
    if (e.op === 'plant' && !FR.Crops[e.crop]) fail(`カード ${id} の作物 ${e.crop} がない`);
    if (e.op === 'addAnimal' && !FR.Animals[e.animal]) fail(`カード ${id} の家畜 ${e.animal} がない`);
    if (e.op === 'status' && !FR.Statuses[e.id]) fail(`カード ${id} の状態 ${e.id} がない`);
  }
}
for (const f of Object.values(FR.Farmers)) f.deck.forEach(id => FR.Cards[id] || fail(`初期デッキの ${id} がない`));

// ボット：使えるカードをランダムに使う（たまに何もせずターン終了）
function botBattle(run, rnd, played) {
  const b = FR.Battle.create(run);
  let guard = 0;
  while (!b.over) {
    if (++guard > 5000) { fail('戦闘が終わらない'); break; }
    // 収穫ボタン：押せるときは、たまに押す
    if (FR.Battle.canHarvestNow(b) && rnd() < 0.5) { FR.Battle.harvestButton(b); b.fx.length = 0; continue; }
    const playable = b.hand.filter(c => FR.Battle.canPlay(b, c).ok);
    if (playable.length && rnd() < 0.9) {
      const inst = playable[Math.floor(rnd() * playable.length)];
      const alive = FR.Battle.aliveEnemies(b);
      const target = alive[Math.floor(rnd() * alive.length)].uid;
      if (FR.Battle.needsTarget(b, inst) && FR.Battle.play(b, inst.uid)) fail('狙いなしで1体狙いのカードが使えてしまった: ' + inst.id);
      if (!FR.Battle.play(b, inst.uid, target)) fail('使えるはずのカードが使えない: ' + inst.id);
      played[inst.id + (inst.upgraded ? '+' : '')] = (played[inst.id + (inst.upgraded ? '+' : '')] || 0) + 1;
      if (b.hand.length > FR.Config.handMax) fail('手札が上限を超えた');
    } else {
      FR.Battle.endTurn(b);
    }
    // 状態の検査
    b.plots.forEach(p => { if (p && p.tree && (p.fruits < 0 || p.fruits > p.maxFruits)) fail('実の数がおかしい ' + JSON.stringify(p)); });
    b.barns.forEach(a => { if (a && (a.growth > a.stages || a.growth < 0)) fail('家畜の段がおかしい'); });
    if (b.energy < 0) fail('エネルギーがマイナス');
    if (b.run.hp < 0 || b.run.hp > b.run.maxHp) fail('健康度が範囲外');
    if (Number.isNaN(b.run.gold) || b.enemies.some(e => Number.isNaN(e.hp) || e.hp < 0)) fail('NaN か負の勢い');
    if (!b.over && !FR.Battle.aliveEnemies(b).length) fail('敵が全滅したのに戦闘が終わっていない');
    b.fx.length = 0;
  }
  return b;
}

// 顔ぶれ：すべての敵がどこかの顔ぶれに出てくるか
const appear = new Set(FR.Encounters.flatMap(e => e.enemies));
FR.Seasons.forEach(se => { appear.add(se.boss); Object.values(se.bossBy || {}).forEach(id => appear.add(id)); });
FR.Seasons.forEach(se => [se.boss, ...Object.values(se.bossBy || {})].forEach(id => FR.Enemies[id] || fail('ボスの敵がない: ' + id)));
for (let si = 0; si < FR.Seasons.length; si++) if (!FR.Encounters.some(e => e.seasons.includes(si) && e.first)) fail('季節の1戦目に出る顔ぶれがない: ' + si);
Object.keys(FR.Enemies).forEach(id => appear.has(id) || fail('どの顔ぶれにも出ない敵: ' + id));
FR.Encounters.forEach(e => e.enemies.forEach(id => FR.Enemies[id] || fail('顔ぶれの敵がない: ' + id)));

const played = {};
const results = {};

// 少し考えて遊ぶボット：収穫できれば収穫、植えられれば植える、受ける被害が守りより多ければ守り、残りは攻撃
function smartBattle(run, rnd) {
  const b = FR.Battle.create(run);
  let guard = 0, perTurn = 0, turn = b.turn;
  while (!b.over && ++guard < 6000) {
    if (b.turn !== turn) { turn = b.turn; perTurn = 0; }
    if (FR.Battle.canHarvestNow(b)) { FR.Battle.harvestButton(b); b.fx.length = 0; continue; }
    const incoming = FR.Battle.aliveEnemies(b).reduce((t, e) => t + (e.intent && e.intent.damage ? e.intent.damage + e.strength : 0), 0);
    const ok = b.hand.filter(c => FR.Battle.canPlay(b, c).ok);
    const kind = c => { const v = FR.cardView(c); const ops = v.effects.map(e => e.op);
      if (['crop', 'livestock', 'growth', 'power'].includes(v.type) || ops.includes('energy')) return 0;
      if (ops.some(o => /^damage/.test(o))) return 2; return 1; };
    const pick = perTurn > 25 ? null : (ok.find(c => kind(c) === 0) || (incoming > b.block ? ok.find(c => kind(c) === 1) : null) || ok.find(c => kind(c) === 2) || ok[0]);
    if (!pick) { FR.Battle.endTurn(b); b.fx.length = 0; continue; }
    const alive = FR.Battle.aliveEnemies(b).sort((x, y) => x.hp - y.hp);
    FR.Battle.play(b, pick.uid, alive[0].uid);
    perTurn++;
    played[pick.id] = (played[pick.id] || 0) + 1;
    b.fx.length = 0;
  }
  if (guard >= 6000) fail('戦闘が終わらない（かしこいボット）');
  return b;
}

// 1年を通して遊ぶ（分かれ道・市場・休憩所・ボス・季節の終わり）
function playYear(farmerId, seed, bot) {
  const rnd = FR.Util.rng(seed * 31);
  const run = FR.Run.create(farmerId, seed);
  for (let guard = 0; guard < 200; guard++) {
    if (!run.choices) run.choices = FR.Map.makeChoices(run);
    const ch = run.choices;
    if (FR.Map.isBossStep(run) && (ch.length !== 1 || ch[0].type !== 'boss')) fail('ボスの段に選択肢がボス以外');
    if (run.step === FR.Map.season(run).steps - 2 && !ch.some(c => c.type === 'rest')) fail('ボスの手前に休憩所がない');
    if (run.step === 0 && ch[0].type !== 'battle') fail('季節の1段目が戦いでない');
    let c = ch[Math.floor(rnd() * ch.length)];
    if (run.hp < run.maxHp * 0.5 && ch.some(x => x.type === 'rest')) c = ch.find(x => x.type === 'rest');
    run.node = c;
    if (c.type === 'battle' || c.type === 'boss') {
      const b = bot(run, rnd);
      if (!b.won) return run;
      if (c.type === 'boss' && !b.boss) fail('ボスの戦闘になっていない');
      run.nextBattle = null;
      const rw = FR.Reward.make(run);
      if (c.type === 'boss' && rw.cards.some(id => FR.Cards[id].rarity === 'common')) fail('ボスの報酬に「よく出る」カード');
      if (rw.cards.some(id => { const cc = FR.Cards[id]; return !(cc.pool.includes('common') || cc.pool.includes(farmerId)); })) fail('他のタイプのカードが報酬に出た');
      run.gold += rw.gold;
      FR.Run.addCard(run, rw.cards[Math.floor(rnd() * rw.cards.length)], false);
      run.battleIndex++;
      if (c.type === 'boss') {
        const res = FR.Map.endSeason(run);
        if (res.clear) { run.cleared = true; return run; }
        FR.Map.nextSeason(run);
        continue;
      }
    } else if (c.type === 'market') {
      run.market = FR.Market.make(run);
      const k = run.market.stock.findIndex(it => it.price <= run.gold);
      if (k >= 0) FR.Market.buy(run, k);
      run.market = null;
    } else if (c.type === 'rest') {
      if (run.hp < run.maxHp * 0.7) FR.Map.restHeal(run);
      else if (FR.Map.upgradable(run).length) FR.Map.upgrade(run, FR.Map.upgradable(run)[0].uid);
      else FR.Map.restExtra(run);
    }
    run.step++; run.choices = null;
  }
  fail('1年が終わらない');
  return run;
}

for (const farmerId of Object.keys(FR.Farmers)) {
  const rand = [], smart = [];
  for (let k = 0; k < 40; k++) {
    rand.push(playYear(farmerId, 1000 + k, (r, rnd) => botBattle(r, rnd, played)));
    smart.push(playYear(farmerId, 5000 + k, smartBattle));
  }
  const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
  results[farmerId] = {
    でたらめ_越えた季節: avg(rand.map(r => r.stats.seasonsCleared || 0)),
    かしこい_越えた季節: avg(smart.map(r => r.stats.seasonsCleared || 0)),
    かしこい_クリア率: Math.round(100 * smart.filter(r => r.cleared).length / smart.length) + '%'
  };
}

// 敵：すべての行動を、作物・木・家畜がある状態で1回ずつ実行する
const INTENTS = ['attack', 'steal', 'trample', 'blight', 'debuff', 'addCard', 'infect', 'heal', 'buff'];
for (const [id, def] of Object.entries(FR.Enemies)) {
  const ok = def.art.startsWith('enemy:') ? fs.existsSync(path.join(root, 'assets/img/enemies', def.art.slice(6) + '.png')) : artNames.has(def.art);
  if (!ok) fail(`敵 ${id} の絵 ${def.art} がない`);
  for (const [mk, m] of Object.entries(def.moves)) {
    if (!INTENTS.includes(m.intent)) fail(`敵 ${id} の行動 ${mk} の種類 ${m.intent} が不明`);
    if (m.intent === 'debuff' && !FR.Statuses[m.status]) fail(`敵 ${id} の状態 ${m.status} がない`);
    if (m.intent === 'addCard' && !FR.Cards[m.card]) fail(`敵 ${id} のカード ${m.card} がない`);
    for (const farmerId of Object.keys(FR.Farmers)) {
      const run = FR.Run.create(farmerId, 11);
      const b = FR.Battle.create(run);
      b.block = 0;   // 石垣の守りで攻撃が全部防がれると、効いたか分からないので外す
      b.enemies = [{ uid: 1, id, def, name: def.name, hp: 30, maxHp: 50, strength: 0, dead: false, turnsLeft: def.turns || null, moveIndex: 0, intent: Object.assign({ key: mk }, m) }];
      if (b.plots.length) b.plots[0] = { crop: 'komatsuna', growth: 1, stages: 2 };
      if (b.plots.length > 1) b.plots[1] = { crop: 'unshu', tree: true, growth: 2, stages: 2, fruits: 2, maxFruits: 3 };
      if (b.barns.length) b.barns[0] = { animal: 'calf', growth: 2, stages: 3, care: 2 };
      const label = FR.Battle.intentLabel(b, b.enemies[0]);
      if (!label || label.value === undefined) fail(`敵 ${id} の ${mk} の予告が作れない`);
      const before = JSON.stringify([run.hp, b.plots, b.barns, b.statuses, b.discard.length, b.enemies[0].hp, b.enemies[0].strength]);
      try { FR.Battle.enemyAct(b); } catch (err) { fail(`敵 ${id} の ${mk} で例外: ${err.message}`); continue; }
      const after = JSON.stringify([run.hp, b.plots, b.barns, b.statuses, b.discard.length, b.enemies[0].hp, b.enemies[0].strength]);
      if (before === after) fail(`敵 ${id} の ${mk}（${farmerId}）で何も起きない`);
    }
  }
}
// 天候はターン数がたつと過ぎ去って勝ちになる
{
  const run = FR.Run.create('vegetable', 5);
  const b = FR.Battle.create(run);
  const def = FR.Enemies.frost;
  b.enemies = [{ uid: 1, id: 'frost', def, name: def.name, hp: 999, maxHp: 999, strength: 0, dead: false, turnsLeft: def.turns, moveIndex: 0, intent: null }];
  FR.Battle.chooseIntents(b);
  run.hp = 999; run.maxHp = 999;
  for (let t = 0; t < def.turns && !b.over; t++) FR.Battle.endTurn(b);
  if (!b.won) fail('天候が過ぎ去っても勝ちにならない');
}
// 病斑は使えず、報酬にも出ない
{
  const run = FR.Run.create('vegetable', 5);
  const b = FR.Battle.create(run);
  if (FR.Battle.canPlay(b, { uid: 1, id: 'lesion' }).ok) fail('病斑が使えてしまう');
  for (let k = 0; k < 50; k++) { run.battleIndex = k; if (FR.Reward.make(run).cards.includes('lesion')) fail('病斑が報酬に出た'); }
}

// 1枚ずつ：使える状況を作って直接使い、期待どおり状態が変わるか
for (const [id, c] of Object.entries(FR.Cards)) {
  if (c.unplayable) continue;
  for (const upgraded of [false, true]) {
    const farmerId = c.pool.includes('common') || !c.pool.length ? 'livestock' : c.pool[0];
    const run = FR.Run.create(farmerId, 7);
    const b = FR.Battle.create(run);
    b.enemies.forEach(e => { e.hp = e.maxHp = 999; });
    // 畑：実った野菜・実のなった木・空き / 畜舎：出荷できる家畜・空き
    b.plots = [{ crop: 'komatsuna', growth: 2, stages: 2 }, { crop: 'unshu', tree: true, growth: 2, stages: 2, fruits: 1, maxFruits: 3 },
               { crop: 'yuzu', tree: true, growth: 0, stages: 3, fruits: 0, maxFruits: 3 }, null];
    b.barns = [{ animal: 'calf', growth: 3, stages: 3, care: 4 }, { animal: 'piglet', growth: 0, stages: 2, care: 0 }, null];
    b.discard.push({ uid: 900, id: 'sowKomatsuna', upgraded: false });
    b.energy = 10;
    const inst = { uid: 999, id, upgraded };
    b.hand.push(inst);
    run.hp = run.maxHp - 20;
    // 使ったカード自身が手札から減る分とエネルギーの支払いは除いて比べる
    const ehp = () => b.enemies.reduce((t, e) => t + e.hp, 0);
    const snap = JSON.stringify([ehp(), b.block, b.hand.length - 1, b.plots, b.barns, b.statuses, run.hp, run.gold, b.energy - FR.cardView(inst).cost]);
    const ok = FR.Battle.play(b, 999, b.enemies[0].uid);
    if (!ok) { fail(`${id}${upgraded ? '+' : ''} が使えない: ${FR.Battle.canPlay(b, inst).reason}`); continue; }
    played[id] = (played[id] || 0) + 1;
    const after = JSON.stringify([ehp(), b.block, b.hand.length, b.plots, b.barns, b.statuses, run.hp, run.gold, b.energy]);
    if (after === snap) fail(`${id}${upgraded ? '+' : ''} を使っても何も変わらない`);
  }
}

// すべてのカードが使われたか（強化前）
const unused = Object.keys(FR.Cards).filter(id => !played[id] && !FR.Cards[id].unplayable && !FR.Cards[id].retired);
// 収穫ボタン：実ったものだけを取り、エネルギーは使わない
{
  const run = FR.Run.create('livestock', 3);
  const b = FR.Battle.create(run);
  b.plots = [{ crop: 'komatsuna', growth: 2, stages: 2 }, { crop: 'tomato', growth: 1, stages: 3 }];
  b.barns = [{ animal: 'calf', growth: 3, stages: 3, care: 8 }, { animal: 'piglet', growth: 1, stages: 2, care: 0 }];
  const e0 = b.energy, g0 = run.gold;
  if (!FR.Battle.harvestButton(b)) fail('収穫ボタンが押せない');
  if (b.energy !== e0) fail('収穫ボタンでエネルギーが減った');
  if (b.plots[0] || !b.plots[1] || b.barns[0] || !b.barns[1]) fail('収穫ボタンで取るものが違う');
  if (run.gold <= g0) fail('収穫ボタンで銭が増えない');
  if (FR.Battle.harvestButton(b)) fail('取るものがないのに収穫ボタンが押せた');
}
// 言葉の説明
for (const id of Object.keys(FR.Cards)) { try { FR.Glossary.forCard(FR.cardView({ id, uid: 0 })); } catch (e) { fail('言葉の説明で例外 ' + id); } }
if (!FR.Glossary.forCard(FR.cardView({ id: 'pickling', uid: 0 })).some(([w]) => w === '廃棄')) fail('漬物づくりに「廃棄」の説明がない');
// 休憩所：回復・強化・次の戦闘の状態
{
  const run = FR.Run.create('livestock', 9);
  run.hp = 10; const got = FR.Map.restHeal(run); if (got !== FR.Map.restHealAmount(run)) fail('休憩所の回復量が違う');
  const u = FR.Map.upgradable(run)[0]; if (!FR.Map.upgrade(run, u.uid) || !run.deck.find(c => c.uid === u.uid).upgraded) fail('強化できない');
  if (FR.Map.upgrade(run, u.uid)) fail('2回強化できた');
  FR.Map.restExtra(run); const b = FR.Battle.create(run); if (!b.statuses.immune) fail('畜舎の消毒が次の戦闘に効かない');
}
// 保存の形 1 → 2
{
  global.localStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; } };
  vm.runInThisContext(fs.readFileSync(path.join(root, 'js/save.js'), 'utf8'));
  const old = FR.Run.create('vegetable', 3); old.version = 1; old.battleIndex = 7; old.phase = 'battle';
  delete old.season; delete old.step;
  localStorage.setItem(FR.Config.saveKey, JSON.stringify({ run: old, meta: { best: 10 } }));
  const d = FR.Save.load();
  if (!d.run || d.run.version !== 2 || d.run.season !== 0 || d.run.step !== 4 || d.run.phase !== 'map') fail('古い保存が直らない ' + JSON.stringify(d.run && [d.run.version, d.run.season, d.run.step, d.run.phase]));
}

// 採卵鶏：格付けなし・まとめて出荷では残る・1羽ずつなら廃鶏で出荷できる・卵を数える
{
  const run = FR.Run.create('livestock', 4);
  const b = FR.Battle.create(run);
  run.hp = run.maxHp = 9999;
  b.barns = [{ animal: 'chick', growth: 2, stages: 2, care: 9 }, { animal: 'calf', growth: 3, stages: 3, care: 0 }, null];
  if (!FR.Battle.gradeOf(9, 0, 'chick').none) fail('鶏に格付けがついた');
  if (FR.Battle.shipValue(b, b.barns[0]) !== FR.Animals.chick.gold) fail('鶏の出荷の銭が手入れで変わった');
  if (FR.Battle.gradeOf(4, 0, 'piglet').label !== '中') fail('豚の格付けの表が違う');
  FR.Battle.harvestButton(b);
  if (!b.barns[0] || b.barns[1]) fail('まとめて出荷で鶏が出荷された、または牛が残った');
  FR.Battle.endTurn(b);
  if ((b.barns[0].eggs || 0) !== 1) fail('卵の数が数えられていない');
  if (!FR.Battle.harvestOne(b, 'barn', 0) || b.barns[0]) fail('鶏を1羽だけ出荷できない');
}
// 市場：買う・売る・最低枚数
for (const farmerId of Object.keys(FR.Farmers)) {
  const run = FR.Run.create(farmerId, 21);
  run.market = FR.Market.make(run);
  const m2 = FR.Market.make(run);
  if (JSON.stringify(run.market) !== JSON.stringify(m2)) fail('市場の品ぞろえが毎回変わる');
  if (run.market.stock.length !== FR.Market.STOCK) fail('品数が ' + run.market.stock.length);
  run.market.stock.forEach(it => { const c = FR.Cards[it.id]; if (!(c.pool.includes('common') || c.pool.includes(farmerId)) || c.retired) fail('市場に出ないはずのカード ' + it.id); });
  run.gold = 0; if (FR.Market.buy(run, 0)) fail('銭がないのに買えた');
  run.gold = 999; const n0 = run.deck.length;
  if (!FR.Market.buy(run, 0) || run.deck.length !== n0 + 1 || run.gold !== 999 - run.market.stock[0].price) fail('買えない／銭の計算が違う');
  if (FR.Market.buy(run, 0)) fail('同じ品を2回買えた');
  while (FR.Market.canSell(run)) { const g = run.gold; const got = FR.Market.sell(run, run.deck[0].uid); if (!got || run.gold !== g + got) fail('売れない'); }
  if (run.deck.length !== FR.Market.MIN_DECK) fail('デッキが最低枚数より減った');
  if (FR.Market.sell(run, run.deck[0].uid)) fail('最低枚数なのに売れた');
}

// エネルギーの状態：次のターン・毎ターン
{
  const run = FR.Run.create('vegetable', 3);
  const b = FR.Battle.create(run);
  run.hp = run.maxHp = 9999;
  b.statuses.nextEnergy = 2; b.statuses.energyUp = 1;
  FR.Battle.endTurn(b);
  if (b.energy !== FR.Config.energy + 3) fail('次のターンのエネルギーが ' + b.energy);
  FR.Battle.endTurn(b);
  if (b.energy !== FR.Config.energy + 1) fail('2ターン目のエネルギーが ' + b.energy);
}
if (unused.length) fail('一度も使われなかったカード: ' + unused.join(', '));
console.log('ボットの成績（1年を通して）', results);
console.log('使われたカード', Object.keys(played).length, '種（強化後を含む）');
if (noPhoto.length) console.log('いただいた絵がまだないカード（道具の絵で表示）:', noPhoto.join('、'));
// 農家ごとの固有スキル（レリック）が実際に効くか
{
  const node = { type: 'battle', enc: 'crow' };
  const make = id => { const run = FR.Run.create(id, 3); run.node = node; return FR.Battle.create(run); };
  const c = make('citrus');
  if (c.block !== 6) fail(`石垣：1ターン目の守りが ${c.block}（6のはず）`);
  // 小松菜そのものの守りの分を引いて、竹かごの分だけを見る
  const harvestBlock = withRelic => { const b = make('vegetable'); if (!withRelic) b.run.relics = []; b.block = 0;
    b.plots[0] = { crop: 'komatsuna', growth: 2, stages: 2 }; FR.Battle.harvestPlot(b, 0, false); return b.block; };
  const vd = harvestBlock(true) - harvestBlock(false);
  if (vd !== 3) fail(`竹かご：収穫で守り +${vd}（3のはず）`);
  const l = make('livestock');
  l.barns[0] = { animal: 'calf', growth: 9, stages: 1, care: 0 };
  const lb = l.block; FR.Battle.shipBarn(l, 0, 0);
  if (l.block - lb !== 6) fail(`カウベル：出荷で守り +${l.block - lb}（6のはず）`);
}

console.log(failures ? `失敗 ${failures} 件` : 'すべて OK');
process.exit(failures ? 1 : 0);
